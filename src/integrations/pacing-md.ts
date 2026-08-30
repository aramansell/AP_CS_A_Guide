/**
 * Build integration: regenerates PACING.md at the repo root on every
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

export function writePacingMd(): AstroIntegration {
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
      },
    },
  };
}
