/**
 * Build integration: post-build artifacts (PACING.md at the repo root,
 * sitemap.xml in dist/), regenerated on every
 * `npm run build`, from the same curriculum data that renders the site —
 * the port of the PACING.md half of scripts/gen_dashboard.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { AstroIntegration } from 'astro';
import {
  SEQUENCE, KIND_LABEL, CED_TOPICS, coveredTopics,
  EXAM_DATE, EXAM_TIME, longDate, mdDate,
} from '../data/curriculum';

export function writePacingMd(opts: { site: string; base: string }): AstroIntegration {
  const { site, base } = opts;
  return {
    name: 'pacing-md',
    hooks: {
      'astro:build:done': ({ logger, dir }) => {
        const lines: string[] = [
          '# AP CS A Pacing, 2026-27 (IBW, A days)',
          '',
          `Exam: **${longDate(EXAM_DATE)}**, ${EXAM_TIME}. ` +
            'Source of truth: src/data/curriculum.ts. ' +
            'Regenerated automatically by `npm run build` (src/integrations/pacing-md.ts).',
          '',
          '| Date | Type | Group | Title | CED |',
          '|---|---|---|---|---|',
        ];
        for (const e of SEQUENCE) {
          const ced = e.ced.join(' ');
          const note = e.note ? ` \u2014 ${e.note}` : '';
          lines.push(`| ${mdDate(e.d)} | ${KIND_LABEL[e.kind]} | ${e.group} | ${e.title}${note} | ${ced} |`);
        }
        const covered = coveredTopics();
        const total = Object.keys(CED_TOPICS).length;
        if (covered.size === total) {
          lines.push('', `Coverage: ${covered.size}/${total} CED topics. All covered.`);
        } else {
          const missing = Object.keys(CED_TOPICS).filter((t) => !covered.has(t)).sort().join(', ');
          lines.push('', `Coverage: MISSING ${missing}`);
        }
        // dir is the build output dir (dist/) as a file URL; PACING.md lives
        // at the repo root, one level up from it.
        const outDir = new URL('..', dir).pathname;
        fs.writeFileSync(path.join(outDir, 'PACING.md'), lines.join('\n') + '\n');
        logger.info('PACING.md regenerated');

        // ---- sitemap.xml from the built pages ----
        const distDir = new URL('.', dir).pathname;
        const urls: string[] = [];
        (function walk(d: string) {
          for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (e.name.endsWith('.html') && e.name !== '404.html') {
              const rel = path.relative(distDir, p).split(path.sep).join('/');
              urls.push(site + base + '/' + rel);
            }
          }
        })(distDir);
        urls.sort();
        const xml =
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls.map((u) => '  <url><loc>' + u + '</loc></url>').join('\n') +
          '\n</urlset>\n';
        fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml);
        logger.info('sitemap.xml written (' + urls.length + ' pages)');
      },
    },
  };
}
