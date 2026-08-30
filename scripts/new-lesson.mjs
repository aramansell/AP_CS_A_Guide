#!/usr/bin/env node
/**
 * Scaffold a new lesson page + its dashboard metadata.
 *
 *   npm run new-lesson -- 11.1a "Fancy New Topic"
 *   npm run new-lesson -- 11.1b "Follow-up Lab" basic-app
 *
 * Creates src/pages/lessons/<id>.astro and appends the entry to
 * src/data/lessons.ts (title + activity badge for the dashboard).
 *
 * It then reminds you to add the id to a day's lessons list in
 * src/data/curriculum.ts SEQUENCE - that single edit wires the lesson into
 * the prev/next chain, the dashboard, the pacing calendar, and PACING.md
 * on the next build.
 */
import fs from 'node:fs';

const [id, ...rest] = process.argv.slice(2);
const badgeClasses = ['discovery', 'basic-app', 'expand-app', 'rpg', 'assessment', 'hybrid'];
const title = rest.filter((a) => !badgeClasses.includes(a)).join(' ');
const badgeClass = rest.find((a) => badgeClasses.includes(a)) ?? 'discovery';
const badgeLabels = {
  discovery: 'Discovery Lab', 'basic-app': 'Basic Application', 'expand-app': 'Expand Application',
  rpg: 'RPG Build', assessment: 'Assessment', hybrid: 'Season 2',
};

if (!id || !title) {
  console.error('usage: npm run new-lesson -- <id> "<title>" [badge-class]');
  console.error('   id like 11.1a; badge one of: discovery, basic-app, expand-app, rpg, assessment, hybrid');
  process.exit(1);
}
if (!/^\d+\.\d+[abc]$/.test(id)) {
  console.error(`bad lesson id "${id}" - expected like 4.2a`);
  process.exit(1);
}

const page = `src/pages/lessons/${id}.astro`;
if (fs.existsSync(page)) {
  console.error(`${page} already exists`);
  process.exit(1);
}

const group = id.slice(0, -1);
const esc = (s) => s.replace(/&/g, '&amp;');
const BT = '`'; // backtick, kept out of nested template literals
const pageSrc = [
  '---',
  "import Lesson from '../../layouts/LessonLayout.astro';",
  '',
  'const body = ' + BT + '<h1>' + id + ' \u2014 ' + esc(title) + '</h1>',
  '',
  '<div class="activity ' + badgeClass + '">',
  '    <div class="activity-header">',
  '        <span class="activity-label">' + badgeLabels[badgeClass] + '</span>',
  '        <span class="activity-time">~15 min</span>',
  '    </div>',
  '',
  '    <p>TODO: write the lesson.</p>',
  '</div>',
  '',
  '<div class="resources">',
  '    <h3>Reference Docs</h3>',
  '    <ul>',
  '        <li>TODO: link the docs pages for this lesson.</li>',
  '    </ul>',
  '</div>' + BT + ';',
  '---',
  '<Lesson id="' + id + '" title="' + id + ' ' + esc(title) + ' \u2014 AP CS A" root=".." css="../style.css">',
  '  <Fragment set:html={body} />',
  '</Lesson>',
  '',
].join('\n');
fs.writeFileSync(page, pageSrc);
console.log(`created ${page}`);

// dashboard metadata
const dataPath = 'src/data/lessons.ts';
let data = fs.readFileSync(dataPath, 'utf8');
if (data.includes(`'${id}':`)) {
  console.log(`${id} already in lessons.ts`);
} else {
  const entry = `  '${id}': { title: ${JSON.stringify(title)}, badgeClass: '${badgeClass}', badgeLabel: '${badgeLabels[badgeClass]}', group: '${group}' },\n`;
  data = data.replace(/\n\};\n$/, (m) => '\n' + entry + '};\n');
  fs.writeFileSync(dataPath, data);
  console.log(`added ${id} to ${dataPath}`);
}

const cur = fs.readFileSync('src/data/curriculum.ts', 'utf8');
if (!cur.includes(`'${id}'`)) {
  console.log(`\nREMEMBER: add "${id}" to a day's lessons list in src/data/curriculum.ts`);
  console.log('(SEQUENCE). Until you do, the build will fail with a clear error -');
  console.log(' the lesson chain, dashboard, pace calendar, and coverage matrix');
  console.log(' all derive from that file.');
}
