#!/usr/bin/env node
/**
 * One-time migration: converts the old hand-maintained HTML pages into
 * Astro source pages under src/pages/.
 *
 * For every page it:
 *   - extracts the <title> and stylesheet href from the old <head>
 *   - extracts the content inside <div class="page"> (div-balance scan)
 *   - lifts the breadcrumb <nav> block out of the body (the layout renders it)
 *   - for lessons, strips the <div class="lesson-nav"> block (the layout
 *     rebuilds it from src/data/curriculum.ts LESSON_CHAIN at build time)
 *   - writes src/pages/<same path>.astro with the body in a template literal,
 *     round-trip-validated so no escaping bug can silently corrupt content
 *   - records the old URL in legacy/site-manifest.json for the parity check
 *
 * It also generates src/data/lessons.ts (lesson titles + activity badges)
 * from the old files + legacy/badge_map.json, replacing the title-scraping
 * that gen_dashboard.py used to do.
 *
 * Excluded (rebuilt as data-driven Astro pages, not migrated):
 *   index.html, pace.html, docs/coverage.html
 *
 * Usage: node scripts/migrate-to-astro.mjs     (run from the repo root)
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------------------------------------------------------------------------
// Collect source pages
// ---------------------------------------------------------------------------
const walk = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = dir + '/' + entry.name;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (entry.name.endsWith('.html')) out.push(rel);
  }
  return out;
};

const EXCLUDE = new Set(['index.html', 'pace.html', 'docs/coverage.html']);
const sources = [
  ...walk('lessons'),
  ...walk('docs'),
  ...walk('exam'),
  'projects.html',
].filter((p) => !EXCLUDE.has(p)).sort();

console.log(`migrating ${sources.length} pages`);

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------
function extractPage(html, file) {
  const OPEN = '<div class="page">';
  const openIdx = html.indexOf(OPEN);
  if (openIdx === -1) throw new Error(`${file}: no <div class="page">`);
  let pos = openIdx + OPEN.length;
  const tagRe = /<\/?div\b[^>]*>/g;
  tagRe.lastIndex = pos;
  let depth = 1;
  let m;
  while ((m = tagRe.exec(html))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) {
      const content = html.slice(pos, m.index);
      const rest = html.slice(m.index + m[0].length);
      if (!/^\s*(?:<!--[\s\S]*?-->)?\s*<\/body>\s*<\/html>\s*$/.test(rest)) {
        throw new Error(`${file}: unexpected trailing content after .page close: ${JSON.stringify(rest.slice(0, 80))}`);
      }
      return content;
    }
  }
  throw new Error(`${file}: unbalanced <div> nesting inside .page`);
}

const titleOf = (html, file) => {
  const m = html.match(/<title>([\s\S]*?)<\/title>/);
  if (!m) throw new Error(`${file}: no <title>`);
  return m[1];
};

const cssOf = (html, file) => {
  const m = html.match(/<link rel="stylesheet" href="([^"]+)">/);
  if (!m) throw new Error(`${file}: no stylesheet link`);
  return m[1];
};

/** Strip the leading lesson-nav block (layout regenerates it from data). */
const stripLessonNav = (body) => {
  const m = body.match(/^\s*<div class="lesson-nav">[\s\S]*?<\/div>\s*/);
  if (!m) throw new Error('lesson page has no lesson-nav block at the top of .page');
  return body.slice(m[0].length);
};

/** Lift the breadcrumb nav block (if any) out of the body. */
const splitBreadcrumb = (body) => {
  const m = body.match(/^\s*<nav>([\s\S]*?)<\/nav>\s*/);
  if (!m) return { crumbs: null, rest: body };
  return { crumbs: '<nav>' + m[1] + '</nav>', rest: body.slice(m[0].length) };
};

/** Escape a string into a JS template literal body, with round-trip proof. */
const toLiteral = (s, file, what) => {
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
  // Prove the escape is reversible before trusting it.
  const round = new Function('return `' + escaped + '`')();
  if (round !== s) throw new Error(`${file}: ${what} template-literal round-trip failed`);
  return escaped;
};

const attr = (s) => s.replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Per-directory layout parameters (all relative links, base-path safe)
// ---------------------------------------------------------------------------
function layoutParamsFor(src) {
  if (src === 'projects.html') {
    return { active: 'projects', root: '', docsHome: 'docs/index.html' };
  }
  if (src.startsWith('lessons/')) {
    return { active: 'dashboard', root: '..', docsHome: '../docs/index.html', lesson: true };
  }
  if (src.startsWith('exam/frq/')) {
    return { active: 'exam', root: '../..', docsHome: '../../docs/index.html' };
  }
  if (src.startsWith('exam/')) {
    return { active: 'exam', root: '..', docsHome: '../docs/index.html' };
  }
  if (src === 'docs/index.html') {
    return { active: 'docs', root: '..', docsHome: 'index.html' };
  }
  if (src.startsWith('docs/reference/') || src.startsWith('docs/unit-')) {
    return { active: 'docs', root: '../..', docsHome: '../index.html' };
  }
  throw new Error(`unknown page location: ${src}`);
}

// ---------------------------------------------------------------------------
// Migrate
// ---------------------------------------------------------------------------
const lessonTitles = {}; // id -> display title (dashboard format)
let migrated = 0;
const manifest = [...sources];

for (const src of sources) {
  const html = read(src);
  const title = titleOf(html, src);
  const css = cssOf(html, src);
  const params = layoutParamsFor(src);

  let body = extractPage(html, src);
  if (params.lesson) body = stripLessonNav(body);
  const { crumbs, rest } = splitBreadcrumb(body);
  body = rest.trim();
  if (!/^<h1/.test(body)) throw new Error(`${src}: body does not start with <h1> after nav strips`);

  const outRel = src.replace(/\.html$/, '.astro'); // e.g. lessons/1.1a.astro
  const outDir = path.dirname(outRel);              // e.g. lessons
  const depth = outDir === '.' ? 0 : outDir.split('/').length;
  const importPrefix = '../'.repeat(depth + 1);     // to reach src/layouts from src/pages/...

  const bodyLit = toLiteral(body, src, 'body');

  if (params.lesson) {
    const id = path.basename(src, '.html');
    if (!/^\d+\.\d+[abc]$/.test(id)) throw new Error(`${src}: unexpected lesson id`);

    // Dashboard display title - exact port of gen_dashboard.py's extraction.
    let t = title.split('\u2014')[0].trim();
    t = t.replace(/^\d+\.\d+[abc]\s+/, '').replace(/&amp;/g, '&');
    lessonTitles[id] = t;

    const front = '---\n' +
      `// Migrated from ${src} - the body below is the original page content.\n` +
      '// The head, top nav, and the prev/next chain now come from\n' +
      '// src/layouts/LessonLayout.astro and src/data/curriculum.ts.\n' +
      `import Lesson from '${importPrefix}layouts/LessonLayout.astro';\n\n` +
      'const body = `' + bodyLit + '`;\n' +
      '---\n' +
      `<Lesson id="${id}" title="${attr(title)}" root="${params.root}" css="${css}">\n` +
      '  <Fragment set:html={body} />\n' +
      '</Lesson>\n';
    fs.mkdirSync(path.join(ROOT, 'src/pages', outDir), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'src/pages', outRel), front);
  } else {
    const crumbsLit = crumbs ? toLiteral(crumbs, src, 'crumbs') : null;
    const crumbsDecl = crumbsLit ? 'const crumbs = `' + crumbsLit + '`;\n' : '';
    const crumbsUse = crumbsLit ? '  {crumbs && <Fragment slot="breadcrumb" set:html={crumbs} />}\n' : '';
    const front = '---\n' +
      `// Migrated from ${src} - the body below is the original page content.\n` +
      '// The head and top nav now come from src/layouts/BaseLayout.astro.\n' +
      `import Base from '${importPrefix}layouts/BaseLayout.astro';\n\n` +
      crumbsDecl +
      'const body = `' + bodyLit + '`;\n' +
      '---\n' +
      `<Base title="${attr(title)}" active="${params.active}" root="${params.root}" docsHome="${params.docsHome}" css="${css}">\n` +
      crumbsUse +
      '  <Fragment set:html={body} />\n' +
      '</Base>\n';
    fs.mkdirSync(path.join(ROOT, 'src/pages', outDir), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'src/pages', outRel), front);
  }
  migrated++;
}

// ---------------------------------------------------------------------------
// src/data/lessons.ts - titles + badges (replaces badge_map.json scraping)
// ---------------------------------------------------------------------------
const badges = JSON.parse(read('legacy/badge_map.json'));
const ids = Object.keys(lessonTitles).sort((a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || a.localeCompare(b);
});
const missingBadge = ids.filter((id) => !badges[id]);
if (missingBadge.length) throw new Error(`lessons missing from badge_map.json: ${missingBadge}`);

const lessonsTs = '/**\n' +
  ' * Per-lesson metadata, generated by scripts/migrate-to-astro.mjs from the\n' +
  ' * original lesson files and legacy/badge_map.json.\n' +
  ' *\n' +
  ' *   title      - display title for the dashboard ("Hello World & Compile")\n' +
  ' *   badgeClass - activity type CSS class (discovery | basic-app | expand-app | rpg | assessment | hybrid)\n' +
  ' *   badgeLabel - activity type label shown on the dashboard\n' +
  ' *   group      - the "Unit.Lesson" group number ("1.1")\n' +
  ' */\n' +
  'export interface LessonMeta {\n' +
  '  title: string;\n' +
  '  badgeClass: string;\n' +
  '  badgeLabel: string;\n' +
  '  group: string;\n' +
  '}\n\n' +
  'export const LESSONS: Record<string, LessonMeta> = {\n' +
  ids.map((id) => {
    const [cls, label] = badges[id];
    const group = id.slice(0, id.length - 1); // "4.2a" -> "4.2"
    return `  '${id}': { title: ${JSON.stringify(lessonTitles[id])}, badgeClass: '${cls}', badgeLabel: '${label}', group: '${group}' },`;
  }).join('\n') + '\n' +
  '};\n';
fs.writeFileSync(path.join(ROOT, 'src/data/lessons.ts'), lessonsTs);

// ---------------------------------------------------------------------------
// URL manifest for the post-build parity check (old URLs must all still exist)
// ---------------------------------------------------------------------------
manifest.push('style.css', 'docs/style.css',
  'data/monsters.txt', 'data/items.txt', 'data/dungeon1.txt', 'data/dungeon2.txt', 'data/telemetry.csv');
fs.mkdirSync(path.join(ROOT, 'legacy'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'legacy/site-manifest.json'),
  JSON.stringify(manifest.sort(), null, 2) + '\n');

console.log(`migrated ${migrated} pages -> src/pages/`);
console.log(`wrote src/data/lessons.ts (${ids.length} lessons)`);
console.log('wrote legacy/site-manifest.json');
console.log('NOTE: index.html, pace.html, docs/coverage.html are NOT migrated;');
console.log('      they are rebuilt as data-driven pages (src/pages/index.astro,');
console.log('      src/pages/pace.astro, src/pages/docs/coverage.astro).');
