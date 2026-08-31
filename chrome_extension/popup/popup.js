/*
 * Revision Banner — popup dashboard.
 * Lists every document this browser has tracked, with quick stats and a
 * class-wide CSV export. Reads directly from chrome.storage.local.
 */
'use strict';

const APP_ICONS = { docs: '📄', sheets: '📊', slides: '📽️', forms: '📝', drawings: '✏️', drive: '📁' };

const DEFAULTS = {
  pasteThresholdChars: 200, sessionGapMinutes: 30, idleMinutes: 2, keepDays: 120
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function fmtNum(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 10000) return (Math.round(n / 100) / 10) + 'k';
  return String(Math.round(n));
}

function fmtDur(ms) {
  if (!ms || ms < 0 || isNaN(ms)) return '0m';
  const m = Math.round(ms / 60000);
  if (m < 1) return '<1m';
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return (m % 60 ? h + 'h ' + (m % 60) + 'm' : h + 'h');
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}

function fmtRel(ts) {
  if (!ts) return '—';
  const dt = Date.now() - ts;
  if (dt < 60000) return 'just now';
  if (dt < 3600000) return Math.floor(dt / 60000) + 'm ago';
  if (dt < 86400000) return Math.floor(dt / 3600000) + 'h ago';
  if (dt < 7 * 86400000) return Math.floor(dt / 86400000) + 'd ago';
  try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  catch (e) { return '—'; }
}

async function getSettings() {
  try {
    const o = await chrome.storage.local.get('settings');
    return Object.assign({}, DEFAULTS, (o && o.settings) || {});
  } catch (e) { return { ...DEFAULTS }; }
}

function computeFileStats(rec, cfg) {
  // Lightweight version of the content script's stats merge.
  try {
    const live = (rec.live && Array.isArray(rec.live.sessions)) ? rec.live.sessions.filter(Boolean) : [];
    const roll = (rec.live && rec.live.rollup) || {};
    const versions = (rec.hist && Array.isArray(rec.hist.versions)) ? rec.hist.versions : [];
    const ops = (rec.hist && Array.isArray(rec.hist.ops)) ? rec.hist.ops : [];
    const liveEdits = live.reduce((n, s) => n + (s.edits || 0), 0) + (roll.edits || 0);
    const versionEdits = versions.reduce((n, v) => n + (v.edits || 0), 0);
    const edits = Math.max(ops.length, versionEdits || versions.length, liveEdits);
    const liveActiveMs = live.reduce((n, s) => n + (s.activeMs || 0), 0) + (roll.activeMs || 0);

    const gapMs = (cfg.sessionGapMinutes || 30) * 60000;
    const markSet = new Set();
    for (const v of versions) markSet.add(Math.round(v.ts / 60000));
    for (const o of ops) markSet.add(Math.round(o.ts / 60000));
    for (const s of live) {
      if (s.start) markSet.add(Math.round(s.start / 60000));
      if (s.end) markSet.add(Math.round(s.end / 60000));
    }
    const marks = Array.from(markSet).map((m) => m * 60000).sort((a, b) => a - b);
    let clusters = 0;
    if (marks.length) {
      clusters = 1;
      for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] > gapMs) clusters++;
    }
    const sessions = Math.max(clusters, live.length + (roll.sessions || 0));

    // History-derived active estimate (teacher view): cluster version/ops marks only,
    // span + 5-minute floor per cluster; take the max with live-tracked time so docs
    // viewed from another account still show an estimated work duration.
    const hSet = new Set();
    for (const v of versions) hSet.add(Math.round(v.ts / 60000));
    for (const o of ops) hSet.add(Math.round(o.ts / 60000));
    const hMarks = Array.from(hSet).map((m) => m * 60000).sort((a, b) => a - b);
    let hActive = 0;
    {
      let cs = null, ce = 0;
      for (const m of hMarks) {
        if (cs == null) { cs = m; ce = m; }
        else if (m - ce <= gapMs) { ce = m; }
        else { hActive += Math.max(ce - cs, 300000); cs = m; ce = m; }
      }
      if (cs != null) hActive += Math.max(ce - cs, 300000);
    }
    const activeMs = Math.max(liveActiveMs, hActive);

    const contrib = new Set();
    for (const v of versions) if (v.editor) contrib.add(v.editor);
    if (rec.account) contrib.add(rec.account);
    if (!contrib.size && liveEdits > 0) contrib.add('You');

    let bulk = 0, bulkChars = 0, addChars = 0;
    for (const s of live) {
      addChars += s.addChars || 0;
      for (const p of (s.pastes || [])) {
        if ((p.chars || 0) >= (cfg.pasteThresholdChars || 200)) { bulk++; bulkChars += p.chars || 0; }
      }
    }
    addChars += roll.addChars || 0;
    bulk += roll.bulkCount || 0;
    bulkChars += roll.bulkChars || 0;

    // Score (same shape as the banner's heuristic)
    const parts = [];
    const addPart = (q, w) => { if (q != null && !isNaN(q)) parts.push({ q: Math.max(0, Math.min(1, q)), w }); };
    if (addChars + bulkChars > 0) {
      const r = bulkChars / Math.max(1, addChars + bulkChars);
      addPart(r <= 0.05 ? 1 : (r >= 0.6 ? 0 : 1 - (r - 0.05) / 0.55), 0.35);
    }
    if (edits > 0) addPart(Math.min(1, sessions / 6), 0.25);
    if (edits > 0) {
      const rate = bulk / Math.max(1, edits);
      addPart(bulk === 0 ? 1 : (rate < 0.02 ? 1 : 1 - (rate - 0.02) / 0.1), 0.2);
    }
    let score = null;
    if (parts.length) {
      const wsum = parts.reduce((n, p) => n + p.w, 0);
      score = Math.round(100 * parts.reduce((n, p) => n + p.q * p.w, 0) / wsum);
    }
    const tsList = [];
    if (versions.length) { tsList.push(versions[0].ts); tsList.push(versions[versions.length - 1].ts); }
    if (live.length) tsList.push(live[0].start);
    return { edits, activeMs, sessions, contributors: contrib.size, bulk, score, first: tsList.length ? Math.min.apply(null, tsList) : null, history: versions.length > 0 || ops.length > 0 };
  } catch (e) {
    return { edits: 0, activeMs: 0, sessions: 0, contributors: 0, bulk: 0, score: null, first: null };
  }
}

let allRows = [];
let currentFilter = '';

async function loadAll() {
  try {
    const cfg = await getSettings();
    const metaObj = await chrome.storage.local.get('meta');
    const meta = (metaObj && metaObj.meta) || { index: [] };
    const ids = Array.isArray(meta.index) ? meta.index : [];
    const keys = ids.map((id) => 'files:' + id);
    const data = keys.length ? await chrome.storage.local.get(keys) : {};
    const rows = [];
    for (const id of ids) {
      const rec = data['files:' + id];
      if (!rec || !rec.id) continue;
      const st = computeFileStats(rec, cfg);
      rows.push({ rec, st });
    }
    rows.sort((a, b) => (b.rec.lastSeen || 0) - (a.rec.lastSeen || 0));
    allRows = rows;
    render();
  } catch (e) {
    console.warn('[RevisionBanner popup] load failed', e);
  }
}

function render() {
  const list = document.getElementById('list');
  const totals = document.getElementById('totals');
  const q = (currentFilter || '').toLowerCase();
  const rows = allRows.filter((r) => {
    if (!q) return true;
    const hay = ((r.rec.title || '') + ' ' + (r.rec.account || '')).toLowerCase();
    return hay.includes(q);
  });

  const totEdits = allRows.reduce((n, r) => n + (r.st.edits || 0), 0);
  const totActive = allRows.reduce((n, r) => n + (r.st.activeMs || 0), 0);
  totals.innerHTML =
    '<span class="pill"><b>' + allRows.length + '</b> docs</span>' +
    '<span class="pill"><b>' + fmtNum(totEdits) + '</b> total edits</span>' +
    '<span class="pill"><b>' + fmtDur(totActive) + '</b> active time</span>' +
    '<span class="pill">retention ' + (allRows.length ? 'per-file' : '—') + '</span>';

  if (!rows.length) {
    list.innerHTML = '<p class="empty">' + (allRows.length
      ? 'No documents match the filter.'
      : 'No tracked documents yet.<br />Open any Google Doc, Sheet or Slide — it appears here automatically.') + '</p>';
    return;
  }

  list.innerHTML = rows.map((r, i) => {
    const rec = r.rec, st = r.st;
    const scoreCls = st.score == null ? '' : (st.score >= 80 ? 'good' : st.score >= 55 ? 'warn' : 'bad');
    const scoreHtml = st.score != null ? '<span class="score ' + scoreCls + '" title="Writing-process score (heuristic)">' + st.score + '</span>' : '';
    const sub = fmtNum(st.edits) + ' edits · ' + fmtDur(st.activeMs) + ' active · ' + st.sessions + ' sessions' +
      (st.bulk ? ' · <span style="color:var(--warn)">' + st.bulk + ' bulk</span>' : '') +
      ' · ' + (st.history ? '<span style="color:var(--good)" title="Revision history imported for this doc">history ✓</span>'
        : '<span style="color:var(--warn)" title="No imported history yet — open the doc once so the banner can import it">live only</span>');
    return '<div class="row" data-i="' + i + '" data-url="' + esc(rec.url || '') + '" title="' + esc(rec.title || '') + '">' +
      '<span class="ico">' + (APP_ICONS[rec.app] || '📄') + '</span>' +
      '<span class="mid"><span class="t">' + esc(rec.title || 'Untitled') + '</span>' +
      '<span class="s">' + sub + ' · last seen ' + fmtRel(rec.lastSeen) + '</span></span>' +
      '<span class="stats">' + scoreHtml + '</span>' +
      '<button class="x" data-del="' + esc(rec.id) + '" title="Forget this file">✕</button>' +
      '</div>';
  }).join('');
}

document.getElementById('list').addEventListener('click', async (e) => {
  const del = e.target && e.target.getAttribute ? e.target.getAttribute('data-del') : null;
  if (del) {
    e.stopPropagation();
    if (confirm('Forget all locally stored stats for this document?')) {
      await chrome.runtime.sendMessage({ type: 'clear-file', id: del }).catch(() => {});
      loadAll();
    }
    return;
  }
  const row = e.target.closest ? e.target.closest('.row') : null;
  if (row && row.getAttribute('data-url')) {
    chrome.tabs.create({ url: row.getAttribute('data-url') });
  }
});

document.getElementById('q').addEventListener('input', (e) => {
  currentFilter = e.target.value || '';
  render();
});

document.getElementById('btnRefresh').addEventListener('click', () => loadAll());

document.getElementById('btnOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
});

document.getElementById('btnVerify').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('verify/verify.html') });
});

document.getElementById('btnExport').addEventListener('click', async () => {
  try {
    const cfg = await getSettings();
    const rows = [['file_id', 'app', 'title', 'edits', 'active_minutes', 'sessions', 'contributors', 'bulk_inserts', 'score', 'last_seen', 'url']];
    for (const r of allRows) {
      const rec = r.rec, st = r.st;
      rows.push([
        rec.id, rec.app, rec.title, st.edits, Math.round((st.activeMs || 0) / 60000),
        st.sessions, st.contributors, st.bulk, st.score == null ? '' : st.score,
        rec.lastSeen ? new Date(rec.lastSeen).toISOString() : '', rec.url || ''
      ]);
    }
    const csv = rows.map((r2) => r2.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revision-banner-class-summary.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (e) {
    console.warn('export failed', e);
  }
});

loadAll();
