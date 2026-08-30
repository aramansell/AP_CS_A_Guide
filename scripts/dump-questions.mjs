#!/usr/bin/env node
/**
 * dump-questions — teacher helper.
 *
 * After a build, prints every auto-generated lab question with its stable
 * id, grouped by lesson. Use it to author answer keys in
 * src/data/answerKeys.ts (objective questions) — copy an id, add the
 * accepted answers.
 *
 *   npm run dump-questions              # all lessons
 *   npm run dump-questions -- 1.1c      # one lesson
 *   npm run dump-questions -- 1.1 1.8   # whole unit groups
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.join(process.cwd(), 'dist', 'lessons');
const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const filters = args.map((a) => a.replace(/\.$/, ''));

// filter "1.1" matches 1.1, 1.1a, 1.1b — but not 1.10 (word boundary).
function matchesFilter(lessonId, flt) {
  if (lessonId === flt) return true;
  return lessonId.startsWith(flt) && /^[a-z](\.|$)/.test(lessonId.slice(flt.length));
}

if (!fs.existsSync(DIST)) {
  console.error('dist/lessons not found — run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(DIST).filter((f) => f.endsWith('.html')).sort();
let totalQ = 0;
let lessonsWithQ = 0;
const bank = {};

for (const f of files) {
  const lessonId = f.replace(/\.html$/, '');
  if (filters.length && !filters.some((flt) => matchesFilter(lessonId, flt))) continue;
  const html = fs.readFileSync(path.join(DIST, f), 'utf8');
  const fields = [...html.matchAll(/<textarea class="lab-answer"[^>]*data-q="([^"]+)"[^>]*data-block="([^"]+)"[^>]*data-question="([^"]*)"[^>]*>/g)];
  if (!fields.length) continue;
  lessonsWithQ++;
  totalQ += fields.length;
  bank[lessonId] = fields.map((m) => ({
    id: m[1],
    block: m[2],
    question: m[3].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
  }));
}

for (const [lesson, qs] of Object.entries(bank)) {
  console.log('');
  console.log(lesson + '  (' + qs.length + ' questions)');
  for (const q of qs) {
    console.log('  ' + q.id + '  [' + q.block + ']  ' + q.question.slice(0, 90) + (q.question.length > 90 ? '…' : ''));
  }
}

console.log(
  '' + totalQ + ' questions across ' + lessonsWithQ + ' lessons' +
  (filters.length ? ' (filtered)' : '') + '.'
);
