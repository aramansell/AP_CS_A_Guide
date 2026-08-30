#!/usr/bin/env node
/**
 * grade-submissions — grade lab answer files the teacher collects.
 *
 * Workflow (see /teachers/canvas.html):
 *   1. Canvas assignment -> Download Submissions (zip) -> unzip it
 *   2. node scripts/grade-submissions.mjs path/to/unzipped -o grades.csv
 *   3. Paste the scores into the Canvas gradebook (or return the
 *      feedback/*.txt files via SpeedGrader).
 *
 * Scoring:
 *   - every question: answered or blank (completeness)
 *   - questions with a key in src/data/answerKeys.ts: also correct/incorrect
 *   - multiple attempts by the same student for the same lesson: the latest
 *     downloadedAt wins
 *
 * Options:
 *   -o FILE   write CSV to FILE (default grades.csv)
 *   --feedback DIR   write per-student feedback files (default: feedback/)
 *   --min-chars N    answers shorter than N chars count as blank (default 2)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ANSWER_KEYS } from '../src/data/answerKeys.ts';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('-'));
const outCsv = flagValue('-o') ?? 'grades.csv';
const feedbackDir = flagValue('--feedback') ?? 'feedback';
const minChars = Number(flagValue('--min-chars') ?? 2);

function flagValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

const input = pos[0];
if (!input) {
  console.error('usage: node scripts/grade-submissions.mjs <folder-or-file> [-o grades.csv] [--feedback dir]');
  process.exit(1);
}

// ---------- collect submission files ----------
const files = [];
(function walk(p) {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) fs.readdirSync(p).forEach((c) => walk(path.join(p, c)));
  else files.push(p);
})(input);

const submissions = [];
let skipped = 0;
for (const f of files) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    skipped++; // Canvas zip can include non-JSON cruft
    continue;
  }
  if (data && data.format === 'apcsa-lab-answers/1' && Array.isArray(data.answers)) {
    submissions.push({ file: f, data });
  } else {
    skipped++;
  }
}

if (!submissions.length) {
  console.error('No lab answer files found in: ' + input);
  console.error('(' + files.length + ' files scanned, ' + skipped + ' skipped — is this the unzipped submissions folder?)');
  process.exit(1);
}

// latest attempt per (student, lesson)
const best = new Map();
for (const s of submissions) {
  const key = (s.data.student || '(no name)') + '|' + (s.data.lesson || '');
  const prev = best.get(key);
  if (!prev || String(s.data.downloadedAt || '') >= String(prev.data.downloadedAt || '')) best.set(key, s);
}

// ---------- matching ----------
function norm(s) {
  return String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function entryOk(entry, answer) {
  const a = norm(answer);
  if (entry.startsWith('re:')) {
    try { return new RegExp(entry.slice(3), 'i').test(a); } catch { return false; }
  }
  return a.includes(norm(entry));
}
function gradeAnswer(qid, lesson, answer) {
  const key = (ANSWER_KEYS[lesson] || {})[qid];
  if (!key) return { keyed: false, correct: null };
  const results = key.accept.map((e) => entryOk(e, answer));
  const correct = key.all ? results.every(Boolean) : results.some(Boolean);
  return { keyed: true, correct, note: key.note ?? '' };
}

// ---------- grade + report ----------
fs.mkdirSync(feedbackDir, { recursive: true });
const rows = [];
for (const s of best.values()) {
  const d = s.data;
  const lessonKeys = ANSWER_KEYS[d.lesson] || {};
  let answered = 0;
  let correct = 0;
  let keyedTotal = 0;
  const lines = [];
  lines.push('AP CS A lab answers — ' + d.lesson + ' ' + (d.lessonTitle || ''));
  lines.push('Student: ' + (d.student || '(name missing!)'));
  lines.push('Downloaded: ' + d.downloadedAt);
  lines.push('');
  for (const a of d.answers) {
    const text = String(a.answer ?? '').trim();
    const isAnswered = text.length >= minChars;
    if (isAnswered) answered++;
    const g = gradeAnswer(a.id, d.lesson, text);
    if (g.keyed) {
      keyedTotal++;
      if (g.correct && isAnswered) correct++;
    }
    const mark = !g.keyed ? (isAnswered ? '[answered]' : '[blank]') : g.correct && isAnswered ? '[correct]' : '[missed]';
    lines.push(mark + ' ' + a.id);
    lines.push('  Q: ' + String(a.question || '').slice(0, 160));
    lines.push('  A: ' + (text ? text.slice(0, 300) : '(blank)'));
    if (g.keyed && !g.correct && g.note) lines.push('  expected: ' + g.note);
    lines.push('');
  }
  const total = d.answers.length;
  const aPct = total ? Math.round((100 * answered) / total) : 0;
  const oPct = keyedTotal ? Math.round((100 * correct) / keyedTotal) : null;
  rows.push({
    student: d.student || '(no name)',
    lesson: d.lesson,
    answered,
    total,
    aPct,
    correct,
    keyedTotal,
    oPct,
  });
  const safe = (d.student || 'noname').replace(/[^A-Za-z0-9._-]+/g, '_');
  fs.writeFileSync(path.join(feedbackDir, safe + '_' + String(d.lesson).replace(/[^A-Za-z0-9._-]+/g, '_') + '.txt'), lines.join('\n') + '\n');
}

rows.sort((a, b) => (a.lesson + a.student).localeCompare(b.lesson + b.student));

const csv = [
  'student,lesson,answered,total,answered_pct,objective_correct,objective_total,objective_pct',
  ...rows.map((r) =>
    [r.student, r.lesson, r.answered, r.total, r.aPct, r.correct, r.keyedTotal, r.oPct ?? ''].join(',')
  ),
].join('\n');
fs.writeFileSync(outCsv, csv + '\n');

console.log('Graded ' + rows.length + ' submissions (' + submissions.length + ' files, latest attempt kept, ' + skipped + ' non-submission files skipped).');
console.log('');
for (const r of rows) {
  const obj = r.keyedTotal ? ' | objective ' + r.correct + '/' + r.keyedTotal + ' (' + r.oPct + '%)' : '';
  console.log('  ' + r.lesson + '  ' + r.student.padEnd(22) + ' answered ' + r.answered + '/' + r.total + ' (' + r.aPct + '%)' + obj);
}
console.log('');
console.log('CSV: ' + outCsv);
console.log('Feedback files: ' + feedbackDir + '/');
