/*
 * Logic tests for content/banner.js — run WITHOUT a browser.
 *
 * Loads the real banner.js in a sandboxed VM (window stub, no DOM), injects a
 * hook before main() to capture the internal pure functions, and runs
 * assertion suites against them. This tests the shipped source itself —
 * not a copy.
 *
 * Run:  node tools/logic-test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const bannerPath = join(here, '..', 'content', 'banner.js');
const src = readFileSync(bannerPath, 'utf8');

// ---- inject the test hook in place of the boot call -----------------------
const ANCHOR = 'main().catch(';
if (!src.includes(ANCHOR)) throw new Error('injection anchor not found in banner.js');
const hooked = src.replace(
  ANCHOR,
  'globalThis.__RB_TEST__ && globalThis.__RB_TEST__({ parseWhen, computeStats, pruneAndRollup, ' +
  'mergeSession, parseNetworkHistory, fmtDur, fmtNum, fmtRel, ymdKey, clamp, DEFAULTS, MONTHS, ' +
  'hmacSign, buildSubmissionHtml, parseTileText, assemblePanelVersions, bareNameFromText, ' +
  'looksLikeDateText, isSaveChipText, pasteStatsFromText, computeInsights, buildAiPayload }); main().catch('
);

const captured = {};
const sandbox = {
  window: {},
  console: { log() {}, warn() {}, error() {} },
  setTimeout, clearTimeout, setInterval, clearInterval,
  crypto: globalThis.crypto,
  TextEncoder: globalThis.TextEncoder,
  __RB_TEST__: (refs) => Object.assign(captured, refs)
};
vm.createContext(sandbox);

// ---- also load background.js (for the AI endpoint normalizer) -------------
// Top level only registers listeners, so a chrome stub with no-op addListener
// methods is enough to evaluate it.
const bgSrc = readFileSync(join(here, '..', 'background.js'), 'utf8');
const bgSandbox = {
  URL, AbortController,
  console: { log() {}, warn() {}, error() {} },
  setTimeout, clearTimeout,
  fetch: async () => { throw new Error('no fetch in tests'); },
  chrome: {
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
      onMessage: { addListener() {} },
      openOptionsPage: async () => {}
    },
    storage: {
      onChanged: { addListener() {} },
      local: { get: async () => ({}), set: async () => {}, remove: async () => {} }
    },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} }
  }
};
vm.createContext(bgSandbox);
vm.runInContext(bgSrc, bgSandbox, { filename: 'background.js' });
vm.runInContext(hooked, sandbox, { filename: 'content/banner.js' });

if (!captured.parseWhen) throw new Error('hook did not fire — banner.js failed to define functions');

const F = captured;
const BASE = new Date(2025, 5, 15, 14, 0, 0).getTime(); // June 15 2025, 14:00 local
const DAY = 86400000;
let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? ' — ' + detail : '')); }
}
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  ok(name, a === e, 'got ' + a + ' want ' + e);
}

// =========================== parseWhen ====================================
eq('today+time', F.parseWhen('Today, 1:24 PM', BASE), new Date(2025, 5, 15, 13, 24).getTime());
eq('today bare', F.parseWhen('Today', BASE), new Date(2025, 5, 15, 0, 0).getTime());
eq('yesterday', F.parseWhen('Yesterday, 9:05 AM', BASE), new Date(2025, 5, 14, 9, 5).getTime());
eq('month day rolls back a year', F.parseWhen('December 3', BASE), new Date(2024, 11, 3, 0, 0).getTime());
eq('full date', F.parseWhen('Dec 3, 2024', BASE), new Date(2024, 11, 3).getTime());
eq('full date with time', F.parseWhen('March 10, 2025, 2:30 PM', BASE), new Date(2025, 2, 10, 14, 30).getTime());
eq('days ago', F.parseWhen('3 days ago', BASE), BASE - 3 * DAY);
eq('minutes ago', F.parseWhen('5 minutes ago', BASE), BASE - 5 * 60000);
eq('bare time', F.parseWhen('1:24 PM', BASE), new Date(2025, 5, 15, 13, 24).getTime());
eq('junk → null', F.parseWhen('hello world', BASE), null);
eq('empty → null', F.parseWhen('', BASE), null);
eq('ordinal day future rolls back', F.parseWhen('June 21st', BASE), new Date(2024, 5, 21).getTime());
eq('ordinal day past stays this year', F.parseWhen('June 1st', BASE), new Date(2025, 5, 1).getTime());

// =========================== computeStats =================================
const CFG = { ...F.DEFAULTS, sessionGapMinutes: 30, pasteThresholdChars: 200 };

const recA = {
  id: 'x', app: 'docs', title: 'T', account: 'You',
  firstSeen: BASE - DAY, lastSeen: BASE,
  live: {
    sessions: [{
      id: 's1', start: BASE, end: BASE + 600000, activeMs: 600000, keys: 100,
      edits: 8, addChars: 500, delChars: 10, pastes: [{ t: BASE + 1000, chars: 250 }]
    }],
    rollup: {}
  },
  hist: {
    versions: [
      { ts: BASE - 3600000, editor: 'Alice', edits: 3, src: 'panel' },
      { ts: BASE + 3600000, editor: 'Alice', edits: null, src: 'panel' }
    ],
    ops: [], opsRollup: 0, versionsRollup: 0, source: 'panel', fetchedAt: BASE, lastAutoTry: 0
  }
};
const sA = F.computeStats(recA, CFG);
eq('A edits headline (live beats versions)', sA.edits.value, 8);
eq('A edits source label', sA.edits.source, 'panel');
eq('A sessions cluster', sA.sessions, 3);
eq('A contributors', sA.contributorsCount, 2);
eq('A bulk pastes', sA.bulk.length, 1);
eq('A earliest', sA.earliest, BASE - 3600000);
eq('A latest', sA.latest, BASE + 3600000);
eq('A daily no double count', sA.daily.get(F.ymdKey(BASE)), 8);
eq('A active days', sA.activeDays, 1);
eq('A not empty', sA.empty, false);
eq('A not liveOnly', sA.liveOnly, false);
ok('A score computed', sA.score.value != null && sA.score.value >= 0 && sA.score.value <= 100,
  'score=' + sA.score.value);
eq('A score parts', sA.score.parts.length, 4);
eq('A panel provenance', sA.provenance.panel && sA.provenance.panel.count, 2);

// ops precedence + clustering across days
const ops = [];
for (let i = 0; i < 4; i++) ops.push({ ts: BASE - 2 * DAY + i * 600000 });
for (let i = 0; i < 3; i++) ops.push({ ts: BASE - DAY + i * 600000 });
for (let i = 0; i < 3; i++) ops.push({ ts: BASE + i * 600000 });
const recB = {
  id: 'y', app: 'docs', title: 'B', account: null, firstSeen: BASE, lastSeen: BASE,
  live: { sessions: [], rollup: {} },
  hist: { versions: [], ops, opsRollup: 0, versionsRollup: 0, source: null, fetchedAt: BASE, lastAutoTry: 0 }
};
const sB = F.computeStats(recB, CFG);
eq('B ops precedence', sB.edits.value, 10);
eq('B source is net', sB.edits.source, 'net');
eq('B sessions by day clusters', sB.sessions, 3);
eq('B active days', sB.activeDays, 3);
eq('B liveOnly false', sB.liveOnly, false);

// rollup inclusion
const recC = {
  id: 'z', app: 'docs', title: 'C', account: 'You', firstSeen: BASE - 10 * DAY, lastSeen: BASE,
  live: {
    sessions: [],
    rollup: { edits: 50, activeMs: 3600000, keys: 400, addChars: 1000, delChars: 0, bulkCount: 2, bulkChars: 500, sessions: 5, firstTs: BASE - 10 * DAY }
  },
  hist: { versions: [], ops: [], opsRollup: 0, versionsRollup: 0, source: null, fetchedAt: 0, lastAutoTry: 0 }
};
const sC = F.computeStats(recC, CFG);
eq('C rollup edits', sC.edits.value, 50);
eq('C rollup active', sC.activeMs, 3600000);
eq('C rollup sessions', sC.sessions, 5);
eq('C earliest from rollup', sC.earliest, BASE - 10 * DAY);

// empty record
const recD = { id: 'e', app: 'docs', title: 'D', account: null, firstSeen: BASE, lastSeen: BASE, live: { sessions: [], rollup: {} }, hist: { versions: [], ops: [], opsRollup: 0, versionsRollup: 0, source: null, fetchedAt: 0, lastAutoTry: 0 } };
const sD = F.computeStats(recD, CFG);
eq('D empty', sD.empty, true);
eq('D edits zero', sD.edits.value, 0);
eq('D score null', sD.score.value, null);

// =========================== pruneAndRollup ================================
const now = Date.now();
const recP = {
  live: {
    sessions: [
      { id: 'old', start: now - 40 * DAY, end: now - 40 * DAY, edits: 10, keys: 50, activeMs: 60000, addChars: 100, delChars: 5, pastes: [{ t: now - 40 * DAY, chars: 300 }] },
      { id: 'recent', start: now - DAY, end: now - DAY, edits: 2, keys: 5, activeMs: 1000, addChars: 10, delChars: 0, pastes: [] }
    ],
    rollup: {}
  }
};
F.pruneAndRollup(recP, 30);
eq('P keeps recent only', recP.live.sessions.length, 1);
eq('P keeps the recent id', recP.live.sessions[0].id, 'recent');
eq('P rollup edits', recP.live.rollup.edits, 10);
eq('P rollup sessions', recP.live.rollup.sessions, 1);
eq('P rollup bulkCount', recP.live.rollup.bulkCount, 1);
eq('P rollup bulkChars', recP.live.rollup.bulkChars, 300);
eq('P rollup firstTs', recP.live.rollup.firstTs, now - 40 * DAY);

// =========================== mergeSession ==================================
const mA = { id: 's', start: 0, end: 100, keys: 5, edits: 3, activeMs: 60, addChars: 10, delChars: 1, pastes: [{ t: 1, chars: 50 }] };
const mB = { id: 's', start: 0, end: 200, keys: 9, edits: 2, activeMs: 30, addChars: 20, delChars: 0, pastes: [{ t: 1, chars: 50 }, { t: 2, chars: 60 }] };
const mM = F.mergeSession(mA, mB);
eq('M end (later wins)', mM.end, 200);
eq('M keys max', mM.keys, 9);
eq('M edits max', mM.edits, 3);
eq('M activeMs max', mM.activeMs, 60);
eq('M addChars max', mM.addChars, 20);
eq('M pastes union', mM.pastes.length, 2);

// =========================== parseNetworkHistory ===========================
const n1 = F.parseNetworkHistory('[[1100000000000,1],[1100000005000,1],[1100000010000,1],[1100000015000,1]]');
ok('N1 parses 4 ops', Array.isArray(n1) && n1.length === 4, 'got ' + (n1 && n1.length));
eq('N1 first ts', n1 && n1[0].ts, 1100000000000);
const n2 = F.parseNetworkHistory('[[1130000000,"a"],[1130000001,"a"],[1130000002,"a"]]');
ok('N2 parses seconds as ms', Array.isArray(n2) && n2.length === 3 && Math.abs(n2[0].ts - 1130000000000) < 1000,
  'got ' + (n2 && n2[0] && n2[0].ts));
eq('N3 junk → null', F.parseNetworkHistory('this is not json at all'), null);
eq('N4 no timestamps → null', F.parseNetworkHistory('[[1,2],[3,4],[5,6]]'), null);
eq('N5 empty → null', F.parseNetworkHistory(''), null);
const n6 = F.parseNetworkHistory(')]}\'\n[[1100000000000],[1100000005000],[1100000010000],[1100000015000]]');
ok('N6 strips XSS-guard prefix', Array.isArray(n6) && n6.length === 4, 'got ' + (n6 && n6.length));

// =========================== fmt helpers ===================================
eq('fmtDur zero', F.fmtDur(0), '0m');
eq('fmtDur 1m', F.fmtDur(65000), '1m');
eq('fmtDur 1h', F.fmtDur(3600000), '1h');
eq('fmtDur 1h30m', F.fmtDur(5400000), '1h 30m');
eq('fmtDur 1d1h', F.fmtDur(90061000), '1d 1h');
eq('fmtNum plain', F.fmtNum(999), '999');
eq('fmtNum 10k', F.fmtNum(10000), '10k');
eq('fmtNum 123k', F.fmtNum(123456), '123k');

// ===================== history-derived active estimate ======================
// Teacher-view scenario: versions exist, no live sessions. Active time and the
// sessions table must come from clustered version timestamps, honestly labeled.
const hv = (ts, editor, edits) => ({ ts, editor: editor || 'student@x.com', edits: edits || 0 });
const recH1 = { id: 'docH1', firstSeen: 1000, live: { sessions: [], rollup: {} },
  hist: { versions: [hv(BASE), hv(BASE + 4 * 60000), hv(BASE + 9 * 60000), hv(BASE + 6 * 3600000)], ops: [] } };
const stH1 = F.computeStats(recH1, { sessionGapMinutes: 30 });
eq('HIST sessions clustered from version marks', stH1.sessions, 2);
eq('HIST histSessions stored', stH1.histSessions.length, 2);
eq('HIST active = spans + 5m floor', stH1.activeMs, 14 * 60000);
ok('HIST active source labeled as history', stH1.activeSource === 'history', stH1.activeSource);
ok('HIST active label says estimated', /estimat/i.test(stH1.activeLabel || ''), stH1.activeLabel);

// A single checkpoint still counts as a (short) session — floored at 5 minutes.
const recH2 = { id: 'docH2', firstSeen: 1000, live: { sessions: [], rollup: {} }, hist: { versions: [hv(BASE)], ops: [] } };
const stH2 = F.computeStats(recH2, { sessionGapMinutes: 30 });
eq('HIST single version gives one session', stH2.histSessions.length, 1);
eq('HIST single version floors at 5m', stH2.activeMs, 5 * 60000);

// Live tracking is exact and must win when it is the larger (real) measurement.
const recH3 = { id: 'docH3', firstSeen: 1000,
  live: { sessions: [{ id: 's', start: BASE, end: BASE + 3600000, activeMs: 120 * 60000, keys: 500, edits: 40, addChars: 2000, delChars: 100, pastes: [] }], rollup: {} },
  hist: { versions: [hv(BASE), hv(BASE + 5 * 60000)], ops: [] } };
const stH3 = F.computeStats(recH3, { sessionGapMinutes: 30 });
eq('HIST live active wins when larger', stH3.activeMs, 120 * 60000);
ok('HIST live source labeled', stH3.activeSource === 'live', stH3.activeSource);

// =========================== version-tile parsing ===========================
// parseTileText is the pure heart of the panel scraper: given one tile's
// combined text it extracts ts / editor / edits, and must NEVER stamp a
// time-only tile as "today" (Google groups tiles under date headers).
const pt = (s) => F.parseTileText(s);
const pt1 = pt('alice smith made 42 edits june 15, 2:34 pm');
ok('TILE parses name-made-N-edits', pt1 && pt1.editor === 'alice smith' && pt1.edits === 42, JSON.stringify(pt1));
ok('TILE date+time ts parses', pt1 && pt1.ts != null && Math.abs(pt1.ts - (new Date(pt1.ts).setHours(14, 34))) < 1, JSON.stringify(pt1 && pt1.ts));
const pt2 = pt('edited by bob jones, june 15');
ok('TILE edited-by name', pt2 && pt2.editor === 'bob jones', JSON.stringify(pt2));
const pt3 = pt('2:34 pm');
ok('TILE bare time never stamps today', pt3 && pt3.ts == null, JSON.stringify(pt3));
const pt4 = pt('june 15, 2:34 pm, bob made 3 edits');
ok('TILE header+tile combine', pt4 && pt4.ts != null && pt4.editor === 'bob' && pt4.edits === 3, JSON.stringify(pt4));
const pt5 = pt('yesterday, 10:04 am 7 edits');
ok('TILE yesterday with edits count', pt5 && pt5.ts != null && pt5.edits === 7, JSON.stringify(pt5));
const pt6 = pt('bob bobberton made 100 edits to this document on june 15, 2:34 pm');
ok('TILE long text probes late date', pt6 && pt6.ts != null && pt6.editor === 'bob bobberton' && pt6.edits === 100, JSON.stringify(pt6));
const pt7 = pt('you made 5 edits, today, 9:00 am');
ok('TILE you normalizes and combines', pt7 && pt7.editor === 'You' && pt7.ts != null, JSON.stringify(pt7));
const pt8 = pt('');
ok('TILE empty is null', pt8 == null, JSON.stringify(pt8));
const pt9 = pt('7 edits');
ok('TILE edits-only has no ts', pt9 && pt9.ts == null && pt9.edits === 7, JSON.stringify(pt9));

// =========================== panel aggregation ==============================
// Regression: the scraper used to merge every entry of a date group into ONE
// tile and emit ONE version for it, so a doc edited by Alice, Bob and Carol
// showed "1 contributor" (the first avatar). assemblePanelVersions is the
// pure aggregation step: it must emit one entry per timestamp, keep every
// editor distinct, skip pure date headers, and stamp each entry with the
// date header in effect at first sight (not the last one seen).
const AGG = F.assemblePanelVersions;
const mkGroup = (parts, date, editor, edits) =>
  ({ parts, date: date || '', editor: editor || null, edits: edits != null ? edits : null });

const agg1 = AGG([
  mkGroup(['September 1'], 'September 1'),                    // date header
  mkGroup(['2:45 pm'], 'September 1', 'Alice Smith', 3),
  mkGroup(['3:02 pm'], 'September 1', 'Bob Jones'),
  mkGroup(['4:10 pm', '4:55 pm'], 'September 1', 'Carol Chen', 6) // 2 timestamps, 1 entry
]);
eq('AGG one entry per timestamp', agg1.length, 4);
eq('AGG header skipped', agg1.filter(a => a.editor == null).length, 0);
ok('AGG every editor present',
  ['Alice Smith', 'Bob Jones', 'Carol Chen'].every(n => agg1.some(a => a.editor === n)),
  JSON.stringify(agg1.map(a => a.editor)));
ok('AGG distinct timestamps', new Set(agg1.map(a => a.ts)).size === 4, JSON.stringify(agg1.map(a => a.ts)));
eq('AGG edits attach to first part only', agg1.filter(a => a.editor === 'Carol Chen' && a.edits === 6).length, 1);
eq('AGG second part has no edit count', agg1.filter(a => a.editor === 'Carol Chen')[1].edits, null);
ok('AGG sorted by ts', agg1.every((a, i) => i === 0 || agg1[i - 1].ts <= a.ts));
ok('AGG all panel source', agg1.every(a => a.src === 'panel'));

// per-group date header, not the last one seen in the pane (the old code
// stamped every tile with the LAST header, merging days)
const agg2 = AGG([
  mkGroup(['Today'], 'Today'),
  mkGroup(['9:00 am'], 'Today', 'Alice'),
  mkGroup(['Yesterday'], 'Yesterday'),
  mkGroup(['8:15 am'], 'Yesterday', 'Bob')
]);
eq('AGG two days two entries', agg2.length, 2);
const expToday = new Date(); expToday.setHours(9, 0, 0, 0);
const expYest = new Date(); expYest.setDate(expYest.getDate() - 1); expYest.setHours(8, 15, 0, 0);
// output is sorted by ts: yesterday first. With the old stale-header bug both
// entries would inherit "Yesterday" and Alice's stamp below would fail.
eq('AGG Bob stamped with its own header (yesterday)', agg2[0].ts, expYest.getTime());
eq('AGG Alice stamped with its own header (today)', agg2[1].ts, expToday.getTime());
ok('AGG editors kept across days', agg2[0].editor === 'Bob' && agg2[1].editor === 'Alice');

// clock fragment with no date anywhere must not be stamped
eq('AGG no date context → no entry', AGG([mkGroup(['2:45 pm'], '', 'Alice')]).length, 0);
// relative stamps carry their own date
const agg3 = AGG([mkGroup(['5 minutes ago'], '', 'Alice'), mkGroup(['2 days ago'], '', 'Bob')]);
eq('AGG relative parts emit', agg3.length, 2);
// malformed groups are skipped, not thrown
eq('AGG junk group tolerated', AGG([null, { parts: 'nope' }, mkGroup([], 'x', 'y')]).length, 0);
// date-only fragments never emit, even with an editor resolved on the tile
eq('AGG date-only never a version', AGG([mkGroup(['Today'], 'Today', 'Alice')]).length, 0);

// bare-name extraction (the no-avatar fallback)
eq('BARE name+time', F.bareNameFromText('Alice Smith 2:45 pm'), 'Alice Smith');
eq('BARE you normalizes', F.bareNameFromText('You 2:45 pm'), 'You');
eq('BARE made-edits form', F.bareNameFromText('Alice Smith made 3 edits 2:45 pm'), 'Alice Smith');
eq('BARE restore rejected', F.bareNameFromText('Restore this version 2:45 pm'), null);
eq('BARE date rejected', F.bareNameFromText('September 1'), null);
eq('BARE today rejected', F.bareNameFromText('Today'), null);
eq('BARE edits phrase rejected', F.bareNameFromText('made 3 edits'), null);
eq('BARE unnamed rejected', F.bareNameFromText('Unnamed version'), null);
eq('BARE empty rejected', F.bareNameFromText(''), null);
ok('DATELIKE clock text rejected', F.looksLikeDateText('2:45 pm'));
ok('DATELIKE month rejected', F.looksLikeDateText('September'));
ok('DATELIKE real name accepted', !F.looksLikeDateText('Alice Smith'));

// ===================== contributor counting (viewer gate) ===================
// A teacher who merely OPENS a doc must not be counted as a contributor; the
// old code added `rec.account` unconditionally and masked every missing name
// behind a constant "1".
const recT = {
  id: 'docT', app: 'docs', title: 'T', account: 'Teacher Teach',
  firstSeen: BASE, lastSeen: BASE,
  live: { sessions: [], rollup: {} },
  hist: {
    versions: [
      { ts: BASE - 3600000, editor: 'Alice', src: 'panel' },
      { ts: BASE - 1800000, editor: 'Bob', src: 'panel' }
    ],
    ops: [], opsRollup: 0, versionsRollup: 0, source: 'panel', fetchedAt: BASE, lastAutoTry: 0
  }
};
const stT = F.computeStats(recT, CFG);
eq('TEACH viewer not counted', stT.contributorsCount, 2);
eq('TEACH names only', stT.contributors.map(c => c.name).sort().join(','), 'Alice,Bob');

// A local editor with recorded live edits IS counted alongside named peers.
const recS = {
  id: 'docS', app: 'docs', title: 'S', account: 'Alice',
  firstSeen: BASE, lastSeen: BASE,
  live: { sessions: [{ id: 's1', start: BASE, end: BASE + 60000, activeMs: 60000, keys: 10, edits: 2, addChars: 40, delChars: 0, pastes: [] }], rollup: {} },
  hist: { versions: [{ ts: BASE - 3600000, editor: 'Bob', src: 'panel' }], ops: [], opsRollup: 0, versionsRollup: 0, source: 'panel', fetchedAt: BASE, lastAutoTry: 0 }
};
const stS = F.computeStats(recS, CFG);
eq('STUDENT local work counted', stS.contributorsCount, 2);
ok('STUDENT both names', stS.contributors.some(c => c.name === 'Alice') && stS.contributors.some(c => c.name === 'Bob'));

// =========================== submission export =============================
// Exercises the signed-student-submission path end to end: build → escape → extract →
// unescape → verify signature. Includes an adversarial title containing </script>.
const subPayload = {
  v: 1, kind: 'revbanner-submission', exportedAt: BASE, extVersion: '1.0.0',
  doc: { id: 'docid123456', app: 'docs', title: 'My </script> "essay"', url: 'https://docs.google.com/document/d/docid123456/edit', account: 'student@example.com' },
  record: {
    id: 'docid123456',
    live: { sessions: [{ id: 's1', start: BASE, end: BASE + 600000, activeMs: 600000, keys: 100, edits: 8, addChars: 500, delChars: 10, pastes: [{ t: BASE, chars: 250 }] }], rollup: {} },
    hist: { versions: [], ops: [] }
  },
  stats: {
    edits: { value: 8, source: 'live', label: 'live tracking (since install)' },
    activeMs: 600000, sessions: 1,
    contributors: [{ name: 'student@example.com', versions: 0, edits: 8 }],
    contributorsCount: 1, bulk: [{ t: BASE, chars: 250, via: 'paste' }], bulkChars: 250,
    earliest: BASE, latest: BASE + 600000, activeDays: 1, daily: [[20250615, 8]],
    score: 42, scoreParts: [{ label: 'Paste ratio', q: 0.5, weight: 0.35, detail: '33% pasted' }]
  }
};
const subStr = JSON.stringify(subPayload);
const sigA = await F.hmacSign(subStr);
const sigB = await F.hmacSign(subStr);
const sigC = await F.hmacSign(subStr + 'x');
ok('SUB signature deterministic', !!sigA && sigA === sigB, 'sigA=' + sigA + ' sigB=' + sigB);
ok('SUB signature input-sensitive', !sigC || sigC !== sigA);
const subHtml = F.buildSubmissionHtml(subPayload, subStr, 'DEADBEEF42');
ok('SUB html embeds signature', subHtml.indexOf('DEADBEEF42') >= 0);
ok('SUB html renders title', subHtml.indexOf('essay') >= 0);
ok('SUB island present', subHtml.indexOf('id="revbanner-data"') >= 0);
// Extract the island exactly the way verify/verify.js does
const openTag = '<script type="application/json" id="revbanner-data">';
const i0 = subHtml.indexOf(openTag);
const i1 = subHtml.indexOf('</scr' + 'ipt>', i0);
ok('SUB island bounds found', i0 >= 0 && i1 > i0, 'i0=' + i0 + ' i1=' + i1);
const extracted = subHtml.slice(i0 + openTag.length, i1).trim().split('<\\/').join('</');
eq('SUB round trip is exact', extracted, subStr);
const verifySig = await F.hmacSign(extracted);
eq('SUB signature verifies after round trip', verifySig, sigA);
// Tampering must break the signature
const tampered = subStr.replace('student@example.com', 'someone-else@example.com');
const tamperedSig = await F.hmacSign(tampered);
ok('SUB tampered payload fails verification', tamperedSig !== sigA);

// ===================== save-chip detection (typo regression) ================
// trySaveChip's scanner used /s+/g (missing backslash), which stripped the
// letter "s" from "All changes saved in Drive" — the automatic import's MAIN
// entry point could never match, so users were told to open version history
// by hand. isSaveChipText is the pure detector; it must match the real chip
// texts exactly as Google renders them.
ok('CHIP matches Docs save text', F.isSaveChipText('All changes saved in Drive'));
ok('CHIP matches with stray whitespace', F.isSaveChipText('  All changes saved in Drive  '));
ok('CHIP matches "Saved in Drive" variant', F.isSaveChipText('Saved in Drive'));
ok('CHIP matches toolbar aria-label', F.isSaveChipText('See version history'));
ok('CHIP matches plain version-history button', F.isSaveChipText('Version history'));
ok('CHIP rejects doc title', !F.isSaveChipText('Untitled document'));
ok('CHIP rejects saving state', !F.isSaveChipText('Saving…'));
ok('CHIP rejects long text', !F.isSaveChipText('All changes saved in Drive plus a very long trailing sentence of no interest to anyone at all'));
// the exact string the old /s+/g regex produced — must NOT be treated as a chip
ok('CHIP rejects s-stripped text the old bug produced', !F.isSaveChipText('All change aved in Drive'));

// ===================== paste stats & insight engine =========================
// Paste blocks now carry rich local stats (words, paragraphs, sentence
// length…) — the text itself is never stored. These power the "structured
// paste" signal and the typed-vs-pasted share.
const ps1 = F.pasteStatsFromText('Intro paragraph one.\n\nSecond para here. It has more!\n\n- one\n- two\n- three\n\nSee https://example.com/x for more info.');
ok('PS paragraphs counted', ps1 && ps1.paras === 4, JSON.stringify(ps1));
ok('PS bullets counted', ps1 && ps1.bullets === 3, JSON.stringify(ps1));
ok('PS links counted', ps1 && ps1.links === 1, JSON.stringify(ps1));
ok('PS words counted', ps1 && ps1.words > 10, JSON.stringify(ps1));
ok('PS sentence average computed', ps1 && ps1.avgSentLen > 0, JSON.stringify(ps1));
eq('PS empty is null', F.pasteStatsFromText(''), null);
eq('PS null-safe', F.pasteStatsFromText(null), null);

// typed-vs-pasted share + insight scenarios (computeStats first so the
// engine sees the same merged view the details panel shows)
const NOWT = Date.now();
const mkSess = (start, mins, edits, add, del, pastes) => ({
  id: 's' + start + '-' + edits, start, end: start + mins * 60000, activeMs: mins * 60000,
  keys: (edits || 1) * 10, edits: edits || 0, addChars: add || 0, delChars: del || 0, pastes: pastes || []
});
const mkRec = (sessions, extra) => Object.assign({
  id: 'ins', app: 'docs', title: 'T', account: null,
  firstSeen: NOWT - 7 * 86400000, lastSeen: NOWT,
  live: { sessions, rollup: {} },
  hist: { versions: [], ops: [], opsRollup: 0, versionsRollup: 0, source: null, fetchedAt: 0, lastAutoTry: 0 }
}, extra || {});

// honest process: 6 days of steady typing, no pastes
const honestSessions = [];
for (let d = 6; d >= 1; d--) honestSessions.push(mkSess(NOWT - d * 86400000, 25, 12, 420, 30));
const stH = F.computeStats(mkRec(honestSessions), CFG);
const insH = F.computeInsights(stH, mkRec(honestSessions), CFG);
ok('INS honest → good-spread', insH.some(s => s.id === 'good-spread'), JSON.stringify(insH.map(s => s.id)));
ok('INS honest → no paste flags', !insH.some(s => ['pasted-share', 'structured-paste', 'silence-then-dump',
  'rewrite-replacement', 'low-revision-density', 'speed-burst', 'deadline-rush'].includes(s.id)), JSON.stringify(insH.map(s => s.id)));
ok('INS honest → pastedShare null-ish', stH.pastedShare === 0, JSON.stringify(stH.pastedShare));

// paste-heavy: 75% of text pasted, structured, compressed into one sitting.
// Note the paste's chars are inside addChars — a real paste's DOM delta is
// counted as additions, so typed 1000 + pasted 3000 = 4000 total.
const bigPaste = { t: NOWT - 3600000, chars: 3000, via: 'paste',
  stats: { words: 600, paras: 6, bullets: 0, links: 1, sentences: 30, avgSentLen: 20, smartQuotes: 6, emDashes: 3 } };
const recPaste = mkRec([mkSess(NOWT - 7200000, 40, 9, 4000, 50, [bigPaste])]);
const stP = F.computeStats(recPaste, CFG);
ok('INS typed-vs-pasted share honest math', stP.pastedShare != null && Math.abs(stP.pastedShare - 0.75) < 0.01,
  'share=' + (stP.pastedShare && stP.pastedShare.toFixed(2)));
const insP = F.computeInsights(stP, recPaste, CFG);
ok('INS pasted-share flagged high', insP.some(s => s.id === 'pasted-share' && s.severity === 'high'), JSON.stringify(insP.map(s => s.id + ':' + s.severity)));
ok('INS pasted-share carries evidence', insP.some(s => s.id === 'pasted-share' && Array.isArray(s.evidence) && s.evidence.length > 0), '');
ok('INS structured-paste flagged', insP.some(s => s.id === 'structured-paste'), JSON.stringify(insP.map(s => s.id)));
ok('INS low-revision-density flagged', insP.some(s => s.id === 'low-revision-density'), JSON.stringify(insP.map(s => s.id)));
ok('INS compressed-timeline flagged', insP.some(s => s.id === 'compressed-timeline'), JSON.stringify(insP.map(s => s.id)));
ok('INS one-session paste doc is NOT dominance', !insP.some(s => s.id === 'session-dominance'), JSON.stringify(insP.map(s => s.id)));

// dominance + silence-then-dump + deadline rush: tiny old session 4 days ago,
// huge one that just ended
const recDom = mkRec([
  mkSess(NOWT - 4 * 86400000 - 3600000, 20, 8, 400, 10),
  mkSess(NOWT - 5400000, 90, 10, 4000, 100, [])
]);
const stD = F.computeStats(recDom, CFG);
const insD = F.computeInsights(stD, recDom, CFG);
ok('INS dominance flagged', insD.some(s => s.id === 'session-dominance'), JSON.stringify(insD.map(s => s.id)));
ok('INS silence-then-dump flagged', insD.some(s => s.id === 'silence-then-dump'), JSON.stringify(insD.map(s => s.id)));
ok('INS deadline-rush flagged', insD.some(s => s.id === 'deadline-rush'), JSON.stringify(insD.map(s => s.id)));

// overnight editing
const nightStart = (() => { const d = new Date(); d.setHours(2, 30, 0, 0); if (d.getTime() > NOWT) d.setDate(d.getDate() - 1); return d.getTime(); })();
const recNight = mkRec([mkSess(nightStart, 15, 5, 300, 0)]);
const insN = F.computeInsights(F.computeStats(recNight, CFG), recNight, CFG);
ok('INS overnight flagged', insN.some(s => s.id === 'overnight'), JSON.stringify(insN.map(s => s.id)));

// rewrite-by-replacement: big delete + big paste in one session
const recRw = mkRec([mkSess(NOWT - 7200000, 30, 10, 900, 500,
  [{ t: NOWT - 7000000, chars: 600, via: 'paste' }])]);
const insRw = F.computeInsights(F.computeStats(recRw, CFG), recRw, CFG);
ok('INS rewrite-replacement flagged', insRw.some(s => s.id === 'rewrite-replacement'), JSON.stringify(insRw.map(s => s.id)));

// history-only (teacher view): signals from imported sessions, no live data
const recHist = mkRec([], {
  live: { sessions: [], rollup: {} },
  hist: { versions: [], ops: [], opsRollup: 0, versionsRollup: 0, source: 'panel', fetchedAt: NOWT, lastAutoTry: 0,
    importStatus: { ok: true, at: NOWT, tiles: 2, named: 2, editors: 2, via: 'watch' } }
});
const stHistOnly = F.computeStats(recHist, CFG);
stHistOnly.histSessions = [
  { start: NOWT - 2 * 3600000, end: NOWT - 3600000, n: 6 },
  { start: NOWT - 1800000, end: NOWT - 1500000, n: 2 }
];
const insHistOnly = F.computeInsights(stHistOnly, recHist, CFG);
ok('INS history-only compressed flagged', insHistOnly.some(s => s.id === 'compressed-timeline'), JSON.stringify(insHistOnly.map(s => s.id)));
ok('INS history-only never emits live-only flags', !insHistOnly.some(s => ['pasted-share', 'structured-paste',
  'silence-then-dump', 'rewrite-replacement', 'low-revision-density', 'speed-burst'].includes(s.id)), JSON.stringify(insHistOnly.map(s => s.id)));

// AI payload: signals included, document text never present
const aiP = F.buildAiPayload(stP, insP, recPaste);
ok('AI payload has kind', aiP.kind === 'revbanner-process-metadata', JSON.stringify(aiP.kind));
ok('AI payload has signals', Array.isArray(aiP.signals) && aiP.signals.length > 0, JSON.stringify(aiP.signals && aiP.signals.length));
ok('AI payload has pasted share', aiP.pastedSharePct === 75, JSON.stringify(aiP.pastedSharePct));
ok('AI payload has score factors', aiP.scoreFactors && aiP.scoreFactors.length === 4, JSON.stringify(aiP.scoreFactors && aiP.scoreFactors.length));
ok('AI payload never contains document text', !('text' in (aiP.doc || {})) && JSON.stringify(aiP).indexOf('quick brown') < 0, '');
ok('AI payload bulk carries paste stats', aiP.bulkInsertions.length === 1 && aiP.bulkInsertions[0].words === 600, JSON.stringify(aiP.bulkInsertions));

// AI defaults + endpoint normalization (background.js is loaded in the vm above).
// NOTE: `const` bindings live in the context's global *lexical* environment —
// they are not properties of the sandbox object — so read them back by
// evaluating inside the context.
const bgDefaultAi = vm.runInContext('DEFAULTS.ai', bgSandbox);
const bgAiEndpoint = vm.runInContext('aiEndpointFromUrl', bgSandbox);
eq('AI default endpoint (banner)', F.DEFAULTS.ai.url, 'https://ollama.com/v1');
eq('AI default model (banner)', F.DEFAULTS.ai.model, 'glm-5.3-flash:cloud');
eq('AI default endpoint (background)', bgDefaultAi.url, 'https://ollama.com/v1');
eq('AI default model (background)', bgDefaultAi.model, 'glm-5.3-flash:cloud');
eq('AI endpoint: /v1 base gets chat path', bgAiEndpoint('https://ollama.com/v1'),
  'https://ollama.com/v1/chat/completions');
eq('AI endpoint: trailing slash tolerated', bgAiEndpoint('https://ollama.com/v1/'),
  'https://ollama.com/v1/chat/completions');
eq('AI endpoint: full chat URL untouched', bgAiEndpoint('https://api.openai.com/v1/chat/completions'),
  'https://api.openai.com/v1/chat/completions');
eq('AI endpoint: local ollama base works', bgAiEndpoint('http://localhost:11434/v1'),
  'http://localhost:11434/v1/chat/completions');
eq('AI endpoint: empty is empty', bgAiEndpoint(''), '');
eq('AI endpoint: null-safe', bgAiEndpoint(null), '');
// permission origin derivation matches the host that actually gets fetched
const aiOrigin = new URL(bgAiEndpoint(F.DEFAULTS.ai.url)).origin + '/*';
eq('AI endpoint: permission origin matches fetch host', aiOrigin, 'https://ollama.com/*');

// pane auto-close + fixed-chrome shift (defaults + source-level wiring)
ok('DEFAULTS autoCloseHistoryPane on (banner)', F.DEFAULTS.autoCloseHistoryPane === true, JSON.stringify(F.DEFAULTS.autoCloseHistoryPane));
ok('DEFAULTS autoCloseHistoryPane on (background)', vm.runInContext('DEFAULTS.autoCloseHistoryPane', bgSandbox) === true, '');
ok('fixed-shift CSS + installer in source', src.includes('.rb-fshift') && src.includes('installFixedShift()'), '');
ok('fixed-shift uses translate property', src.includes('translate: 0 var(--revbanner-h, 0px)'), '');
ok('fixed-shift hit-tests what paints over the banner', src.includes('elementFromPoint') && src.includes('hitScan'), '');
ok('fixed-shift walks to outermost fixed ancestor', src.includes('fixedTarget'), '');
ok('diagnostics button + collector wired', src.includes('data-act="diag-overlap"') && src.includes('collectOverlapDiagnostics()'), '');
ok('pane auto-close wired into watcher scrapes', src.includes('maybeAutoClosePane(await this.scrapePanel())'), '');
ok('pane auto-close respects the automation gate', src.includes('lastAutoTry || 0) < 20000'), '');

// =========================== summary =======================================
console.log('');
console.log('logic tests: ' + pass + ' passed, ' + fail + ' failed');
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
} else {
  console.log('ALL GREEN ✓');
}
