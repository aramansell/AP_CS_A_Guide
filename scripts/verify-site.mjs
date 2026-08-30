#!/usr/bin/env node
/**
 * Full site verification against the built output (dist/).
 * The port of scripts/verify_site.py (now in legacy/) — plus a URL parity
 * check guaranteeing every URL the old static site served still exists.
 *
 * Checks:
 *   1. Zero broken internal links (href + src) across all built HTML files.
 *   2. Zero broken same-page and cross-page anchors.
 *   3. Lesson nav chain: prev/next bidirectionally consistent with the
 *      LESSON_CHAIN derived from src/data/curriculum.ts, covers all lessons.
 *   4. Dashboard lists every lesson; every dashboard link resolves.
 *   5. Every unit index links its quickref; no dead reference/*.md refs.
 *   6. CED coverage: all 53 topics appear in the coverage matrix with lessons.
 *   7. No page references demos.html.
 *   8. Exam hub complete (9 pages).
 *   9. URL parity: every URL in legacy/site-manifest.json exists in dist/.
 *  10. Search index (pagefind) present; PACING.md regenerated.
 *
 * Usage: npm run verify        (from the repo root, after npm run build)
 * Exit code 1 if anything fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { LESSON_CHAIN, CED_TOPICS } from '../src/data/curriculum.ts';
import { LESSONS } from '../src/data/lessons.ts';

const ROOT = path.resolve(process.cwd());
const DIST = path.join(ROOT, 'dist');
const fail = [];
const ok = (label) => console.log(`PASS: ${label}`);
const bad = (label, items, show = 20) => {
  console.log(`FAIL: ${label} (${items.length})`);
  for (const it of items.slice(0, show)) console.log('   ' + it);
  fail.push(label);
};

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Scan pages
// ---------------------------------------------------------------------------
const walk = (dir) => {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.html?$/.test(e.name)) out.push(p);
  }
  return out;
};
const pageFiles = walk(DIST);
const pages = new Map(); // dist-relative path -> { links, ids, text }
for (const abs of pageFiles) {
  const rel = path.relative(DIST, abs).split(path.sep).join('/');
  const text = fs.readFileSync(abs, 'utf8');
  // Strip script blocks first: bundled JS contains href="..." inside template
  // literals that are not real page links.
  const htmlOnly = text.replace(/<script\b[\s\S]*?<\/script>/g, '');
  const links = [...htmlOnly.matchAll(/\b(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
  const ids = new Set([...htmlOnly.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  pages.set(rel, { links, ids, text });
}
console.log(`scanned ${pages.size} HTML pages in dist/`);

// ---------------------------------------------------------------------------
// 1 + 2: links and anchors
// ---------------------------------------------------------------------------
const brokenLinks = [];
const brokenAnchors = [];
for (const [rel, { links, ids }] of pages) {
  const dir = path.posix.dirname(rel === '.' ? '' : rel);
  for (const raw of links) {
    if (!raw || /^(mailto:|tel:|data:|javascript:)/.test(raw)) continue;
    if (raw.startsWith('#')) {
      if (raw.length > 1 && !ids.has(raw.slice(1))) brokenAnchors.push(`${rel}: ${raw}`);
      continue;
    }
    if (/^https?:/.test(raw)) continue;
    const [pathPart, frag = ''] = raw.split('#');
    const noQuery = pathPart.split('?')[0];
    if (!noQuery) continue;
    let decoded;
    try { decoded = decodeURIComponent(noQuery); } catch { decoded = noQuery; }
    let target;
    if (decoded.startsWith('/')) {
      // Site-absolute URL (used by 404.html): strip the configured base path
      // and resolve against the dist root.
      const BASE = '/AP_CS_A_Guide';
      const stripped = decoded === BASE || decoded.startsWith(BASE + '/') ? decoded.slice(BASE.length) : decoded;
      target = path.posix.normalize(stripped.replace(/^\//, ''));
    } else {
      target = path.posix.normalize(path.posix.join(dir === '.' ? '' : dir, decoded));
    }
    if (!fs.existsSync(path.join(DIST, target))) {
      brokenLinks.push(`${rel}: ${raw} -> ${target}`);
    } else if (frag && target.endsWith('.html')) {
      const tp = pages.get(target);
      if (tp && !tp.ids.has(frag)) brokenAnchors.push(`${rel}: ${raw} (anchor not on target)`);
    }
  }
}
brokenLinks.length ? bad('broken internal links', brokenLinks) : ok('zero broken internal links');
brokenAnchors.length ? bad('broken anchors', brokenAnchors) : ok('zero broken anchors');

// ---------------------------------------------------------------------------
// 3: nav chain (against the single source of truth)
// ---------------------------------------------------------------------------
const lessonFiles = [...pages.keys()].filter((p) => p.startsWith('lessons/') && p.endsWith('.html'))
  .map((p) => p.slice('lessons/'.length, -'.html'.length)).sort();
if (JSON.stringify(lessonFiles) !== JSON.stringify([...LESSON_CHAIN].sort())) {
  const missing = LESSON_CHAIN.filter((l) => !lessonFiles.includes(l));
  const extra = lessonFiles.filter((l) => !LESSON_CHAIN.includes(l));
  bad('lesson files vs LESSON_CHAIN', [
    `chain: ${LESSON_CHAIN.length}, files: ${lessonFiles.length}`,
    `not on disk: ${missing.join(', ') || 'none'}`,
    `not in chain: ${extra.join(', ') || 'none'}`,
  ]);
} else {
  ok(`nav chain covers all ${lessonFiles.length} lessons`);
}

const badNav = [];
LESSON_CHAIN.forEach((lid, i) => {
  const wantPrev = i > 0 ? LESSON_CHAIN[i - 1] : null;
  const wantNext = i < LESSON_CHAIN.length - 1 ? LESSON_CHAIN[i + 1] : null;
  const text = pages.get(`lessons/${lid}.html`)?.text;
  if (!text) { badNav.push(`${lid}: no built page`); return; }
  const m = text.match(/<div class="lesson-nav"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) { badNav.push(`${lid}: no lesson-nav block`); return; }
  const hrefs = [...m[1].matchAll(/href="([\d.]+[abc])\.html"/g)].map((x) => x[1]);
  if (wantPrev && hrefs[0] !== wantPrev) badNav.push(`${lid}: prev should be ${wantPrev}, got ${hrefs[0] ?? 'none'}`);
  if (wantNext && hrefs[hrefs.length - 1] !== wantNext) badNav.push(`${lid}: next should be ${wantNext}, got ${hrefs[hrefs.length - 1] ?? 'none'}`);
  if (!wantPrev && hrefs.length === 2) badNav.push(`${lid}: first lesson has a prev link`);
});
badNav.length ? bad('nav chain wiring', badNav) : ok('nav chain bidirectionally correct');

// ---------------------------------------------------------------------------
// 4: dashboard completeness
// ---------------------------------------------------------------------------
const idx = pages.get('index.html');
const dash = idx ? [...idx.text.matchAll(/lessons\/([\d.]+[abc])\.html/g)].map((m) => m[1]) : [];
const dashSet = new Set(dash);
const notListed = LESSON_CHAIN.filter((l) => !dashSet.has(l));
if (!idx || notListed.length) {
  bad('dashboard completeness', notListed.length ? [`missing: ${notListed.join(', ')}`] : ['no dist/index.html']);
} else {
  ok(`dashboard lists all ${dashSet.size} lessons`);
}
const lessonsKnown = new Set(Object.keys(LESSONS));
const unknownMeta = LESSON_CHAIN.filter((l) => !lessonsKnown.has(l));
unknownMeta.length ? bad('lessons.ts metadata', unknownMeta) : ok(`lessons.ts has metadata for all ${lessonsKnown.size} lessons`);

// ---------------------------------------------------------------------------
// 5: quickrefs
// ---------------------------------------------------------------------------
const qrBad = [];
for (let u = 1; u <= 10; u++) {
  const nn = String(u).padStart(2, '0');
  const idxp = `docs/unit-${nn}/index.html`;
  const text = pages.get(idxp)?.text;
  if (!text) { qrBad.push(`${idxp}: missing`); continue; }
  if (!text.includes(`reference/unit-${nn}-quickref.html`)) qrBad.push(`${idxp}: no quickref link`);
  if (/reference\/\w+\.md/.test(text)) qrBad.push(`${idxp}: dead .md ref`);
  if (!pages.has(`docs/reference/unit-${nn}-quickref.html`)) qrBad.push(`docs/reference/unit-${nn}-quickref.html: missing`);
}
qrBad.length ? bad('quickrefs', qrBad) : ok('all 10 unit indexes link their quickref');

// ---------------------------------------------------------------------------
// 6: coverage matrix
// ---------------------------------------------------------------------------
const cov = pages.get('docs/coverage.html')?.text ?? '';
const missingTopics = Object.keys(CED_TOPICS).filter((t) => !cov.includes(`<strong>${t}</strong>`));
missingTopics.length ? bad('coverage matrix', missingTopics) : ok(`coverage matrix lists all ${Object.keys(CED_TOPICS).length} CED topics`);

// ---------------------------------------------------------------------------
// 7: no demos.html references
// ---------------------------------------------------------------------------
const demosRefs = [...pages.keys()].filter((p) => pages.get(p).text.includes('demos.html'));
demosRefs.length ? bad('demos.html refs', demosRefs) : ok('no demos.html references');

// ---------------------------------------------------------------------------
// 8: exam hub integrity
// ---------------------------------------------------------------------------
const examPages = ['exam/index.html', 'exam/java-quick-reference.html', 'exam/mc-strategy.html',
  'exam/mock-exam.html', 'exam/frq/index.html', 'exam/frq/methods-and-control.html',
  'exam/frq/class-design.html', 'exam/frq/data-analysis.html', 'exam/frq/two-d-array.html'];
const missingExam = examPages.filter((p) => !pages.has(p));
missingExam.length ? bad('exam hub', missingExam) : ok(`exam hub complete (${examPages.length} pages)`);

// ---------------------------------------------------------------------------
// 9: URL parity with the pre-migration site
// ---------------------------------------------------------------------------
const manifestPath = path.join(ROOT, 'legacy', 'site-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.log('SKIP: legacy/site-manifest.json not found (URL parity check)');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const missingUrls = manifest.filter((u) => !fs.existsSync(path.join(DIST, u)));
  missingUrls.length
    ? bad('URL parity with old site', missingUrls)
    : ok(`all ${manifest.length} pre-migration URLs still served`);
}

// ---------------------------------------------------------------------------
// 10: search index + PACING.md
// ---------------------------------------------------------------------------
fs.existsSync(path.join(DIST, 'pagefind', 'pagefind.js'))
  ? ok('pagefind search index present')
  : bad('pagefind search index', ['dist/pagefind/pagefind.js missing — is pagefind in the build script?']);

const pacing = fs.readFileSync(path.join(ROOT, 'PACING.md'), 'utf8');
pacing.startsWith('# AP CS A Pacing, 2026-27') && pacing.includes('src/data/curriculum.ts')
  ? ok('PACING.md regenerated from curriculum data')
  : bad('PACING.md', ['not regenerated — run npm run build']);

// ---------------------------------------------------------------------------
console.log();
if (fail.length) {
  console.log('RESULT: FAIL — ' + fail.join(', '));
  process.exit(1);
}
console.log('RESULT: ALL CHECKS PASS');
console.log(`Pages: ${pages.size} | Lessons: ${lessonFiles.length} | CED topics: ${Object.keys(CED_TOPICS).length}`);
