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
  'hmacSign, buildSubmissionHtml, parseTileText }); main().catch('
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
