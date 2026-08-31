/*
 * Revision Banner — Verify page (teacher side).
 * Loads a student's exported submission HTML, checks its HMAC signature, then
 * cross-references its claims against the version history the teacher's own
 * install scraped from Google for the same document.
 */
'use strict';

const SUBMISSION_KEY = 'rb-v1-7f3c9d2e5a1b4089cafe6d2b9e1173a5';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function pad2(n) { return (n < 10 ? '0' + n : '' + n); }
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
function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch (e) { return '—'; }
}
function dayKey(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function dayLabel(k) {
  if (k == null) return '—';
  return Math.floor(k / 10000) + '-' + pad2(Math.floor((k % 10000) / 100)) + '-' + pad2(k % 100);
}

async function hmacSign(text) {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(SUBMISSION_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return null;
  }
}

const el = (id) => document.getElementById(id);

function setStatus(msg, tone) {
  const s = el('status');
  s.textContent = msg;
  if (tone) s.setAttribute('data-tone', tone); else s.removeAttribute('data-tone');
  s.removeAttribute('hidden');
}

async function hmacVerify(text, sig) {
  const expect = await hmacSign(text);
  return !!expect && !!sig && expect === sig;
}

async function handleFile(file) {
  try {
    if (!file) return;
    setStatus('Reading ' + file.name + '…');
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const island = doc.querySelector('script#revbanner-data');
    const sigEl = doc.querySelector('meta[name="revbanner-signature"]');
    if (!island || !sigEl) {
      setStatus('This file is not a Revision Banner submission (missing the embedded data island).', 'bad');
      return;
    }
    const payloadStr = island.textContent.trim().split('<\\/').join('</');
    const sig = sigEl.getAttribute('content') || '';
    setStatus('Checking signature…');
    const sigOk = await hmacVerify(payloadStr, sig);
    let payload = null;
    try { payload = JSON.parse(payloadStr); } catch (e) { payload = null; }
    if (!payload || payload.kind !== 'revbanner-submission') {
      setStatus('Corrupted or unknown payload — the file could not be parsed as a Revision Banner submission.', 'bad');
      return;
    }
    renderReport(payload, sigOk);
    await crossCheck(payload);
    setStatus(sigOk
      ? '✓ Signature valid — the file is intact as exported by Revision Banner.'
      : '✗ SIGNATURE INVALID — this file was modified after export, or was not produced by Revision Banner.',
      sigOk ? 'good' : 'bad');
  } catch (e) {
    setStatus('Failed to read the file: ' + (e && e.message ? e.message : e), 'bad');
  }
}

function renderReport(payload, sigOk) {
  const box = el('report');
  const d = payload.doc || {};
  const st = payload.stats || {};
  const rec = payload.record || {};
  const live = (rec.live && Array.isArray(rec.live.sessions)) ? rec.live.sessions.filter(Boolean) : [];
  const versions = (rec.hist && Array.isArray(rec.hist.versions)) ? rec.hist.versions : [];
  const ops = (rec.hist && Array.isArray(rec.hist.ops)) ? rec.hist.ops : [];
  const card = (lab, val) => '<div class="card"><div class="num">' + esc(val) + '</div><div class="lab">' + esc(lab) + '</div></div>';

  let html = '';
  if (!sigOk) {
    html += '<div class="verdict bad"><h3>⚠ Signature mismatch</h3>The numbers below come from a file that was modified after export. Treat them as claims, not evidence, and weigh Google\u2019s version history (below) instead.</div>';
  }
  html += '<h2>Document</h2><dl>' +
    '<dt>Title</dt><dd>' + esc(d.title || '—') + '</dd>' +
    '<dt>Google file ID</dt><dd>' + esc(d.id || '—') + '</dd>' +
    '<dt>URL</dt><dd>' + esc(d.url || '—') + '</dd>' +
    '<dt>Author account (as detected on their machine)</dt><dd>' + esc(d.account || 'not detected') + '</dd>' +
    '<dt>Exported</dt><dd>' + esc(fmtDate(payload.exportedAt)) + '</dd>' +
    '</dl>';
  html += '<h2>Claimed summary</h2><div class="grid">' +
    card('Edits', fmtNum(st.edits ? st.edits.value : 0)) +
    card('Active time', fmtDur(st.activeMs)) +
    card('Sessions', String(st.sessions != null ? st.sessions : '—')) +
    card('Contributors', String(st.contributorsCount != null ? st.contributorsCount : '—')) +
    card('Bulk inserts', String(Array.isArray(st.bulk) ? st.bulk.length : 0)) +
    card('First activity', st.earliest ? fmtDate(st.earliest) : '—') +
    card('Latest activity', st.latest ? fmtDate(st.latest) : '—') +
    card('Active days', String(st.activeDays != null ? st.activeDays : '—')) +
    card('Process score', st.score != null ? st.score + '/100' : '—') +
    '</div>';
  html += '<p class="muted">Edits source claimed: ' + esc(st.edits ? st.edits.label : '—') +
    ' · Active source claimed: ' + esc(st.activeLabel || '—') +
    ' · live sessions: ' + live.length + ' · version entries: ' + versions.length + ' · network ops: ' + ops.length + '</p>';

  const parts = Array.isArray(st.scoreParts) ? st.scoreParts : [];
  if (parts.length) {
    html += '<h2>Score breakdown (as claimed)</h2>' + parts.map((p) =>
      '<div class="brow"><span>' + esc(p.label) + '</span><span class="bar2"><span style="width:' +
      Math.round(p.q * 100) + '%"></span></span><span class="bdet">' + Math.round(p.q * 100) + '% — ' + esc(p.detail) + '</span></div>'
    ).join('');
  }

  const sessHtml = live.slice(-60).reverse().map((s) => {
    const bulkN = (s.pastes || []).filter((p) => (p.chars || 0) >= 200).length;
    return '<tr><td>' + esc(fmtDate(s.start)) + '</td><td>' + fmtDur(s.activeMs) + '</td><td>' +
      (s.edits || 0) + '</td><td>' + (s.keys || 0) + '</td><td>' + (s.addChars || 0) + ' / ' + (s.delChars || 0) +
      '</td><td>' + (bulkN || '·') + '</td></tr>';
  }).join('');
  if (sessHtml) {
    html += '<h2>Claimed work sessions</h2><div class="tw"><table>' +
      '<tr><th>Started</th><th>Active</th><th>Edits</th><th>Keys</th><th>Chars +/−</th><th>Bulk</th></tr>' + sessHtml + '</table></div>';
  }

  const bulk = Array.isArray(st.bulk) ? st.bulk : [];
  if (bulk.length) {
    html += '<h2>Claimed bulk insertions</h2><div class="tw"><table><tr><th>When</th><th>Chars</th><th>Source</th></tr>' +
      bulk.slice().reverse().map((b) => '<tr><td>' + esc(fmtDate(b.t)) + '</td><td>' + (b.chars || 0) + '</td><td>' + esc(b.via || 'dom') + '</td></tr>').join('') +
      '</table></div>';
  }

  box.innerHTML = html;
  box.removeAttribute('hidden');
}

async function crossCheck(payload) {
  const box = el('crosscheck');
  box.innerHTML = '<h2>Cross-check against Google version history</h2>';
  box.removeAttribute('hidden');
  const d = payload.doc || {};
  if (!d.id) {
    box.innerHTML += '<p class="muted">The file has no document ID.</p>';
    return;
  }
  let mine = null;
  try {
    const o = await chrome.storage.local.get('files:' + d.id);
    mine = o['files:' + d.id];
  } catch (e) { mine = null; }

  const wire = (openUrl) => {
    const b1 = el('ccOpen');
    if (b1 && openUrl) b1.addEventListener('click', () => chrome.tabs.create({ url: openUrl }));
    const b2 = el('ccRe');
    if (b2) b2.addEventListener('click', () => crossCheck(payload));
  };

  if (!mine) {
    box.innerHTML += '<p class="muted">You haven\u2019t opened this document with Revision Banner on this machine yet, so there is nothing to compare against.</p>' +
      '<p>Open the document (let the banner import its version history — click ⟳ in the banner if it asks), then come back and press Re-check.</p>' +
      '<button class="btn" id="ccOpen">Open the document</button> <button class="btn" id="ccRe">Re-check</button>';
    wire(d.url);
    return;
  }

  const tV = (mine.hist && Array.isArray(mine.hist.versions)) ? mine.hist.versions : [];
  const sV = (payload.record && payload.record.hist && Array.isArray(payload.record.hist.versions)) ? payload.record.hist.versions : [];
  const sLive = (payload.record && payload.record.live && Array.isArray(payload.record.live.sessions)) ? payload.record.live.sessions : [];
  const sLiveEdits = sLive.reduce((n, s) => n + (s.edits || 0), 0);

  const tDays = new Set(tV.map((v) => dayKey(v.ts)).filter(Boolean));
  const sVDays = new Set(sV.map((v) => dayKey(v.ts)).filter(Boolean));
  const sLiveDays = new Set(sLive.map((s) => dayKey(s.start)).filter(Boolean));

  // Server-side view agreement: student's imported history vs teacher's imported history
  const sOnly = [...sVDays].filter((k) => !tDays.has(k));
  const tOnly = [...tDays].filter((k) => !sVDays.has(k));

  let verdict, tone, detail;
  if (!sLiveDays.size) {
    tone = 'warn';
    verdict = 'No live-tracked sessions in the file';
    detail = 'The extension on the author\u2019s machine recorded no writing sessions — it was probably installed after the work was done (or only used to view the doc). Verification relies on the version-history comparison below.';
  } else {
    const missing = [...sLiveDays].filter((k) => !tDays.has(k) && !sVDays.has(k));
    if (!missing.length) {
      tone = 'good';
      verdict = 'Consistent with version history';
      detail = 'Every day the summary claims live writing also appears in Google\u2019s version history for this document.';
    } else if (tV.length >= sV.length && tV.length > 0) {
      tone = 'warn';
      verdict = 'Claimed activity with no trace in version history';
      detail = 'The summary claims writing on these dates, which appear in neither your import of the version history nor the one embedded in the file: ' +
        missing.slice(0, 8).map(dayLabel).join(', ') + (missing.length > 8 ? ' …' : '') +
        '. This can happen if the version-history import on this side is incomplete — open the document, scroll its version history, and Re-check — or if the summary was produced elsewhere.';
    } else {
      tone = 'warn';
      verdict = 'Comparison inconclusive';
      detail = 'Your version-history import (' + tV.length + ' entries) has fewer entries than the one embedded in the file (' + sV.length +
        '), so it is probably incomplete. Open the document, scroll its version history to the end, then Re-check.';
    }
  }

  let html = '<div class="verdict ' + tone + '"><h3>' + (tone === 'good' ? '✓ ' : '⚠ ') + esc(verdict) + '</h3>' + detail + '</div>';

  html += '<h2>Numbers side by side</h2><div class="tw"><table>' +
    '<tr><th></th><th>Student summary claims</th><th>Your import of this doc</th></tr>' +
    '<tr><td>Live edit bursts</td><td>' + fmtNum(sLiveEdits) + '</td><td>' + fmtNum((mine.live && Array.isArray(mine.live.sessions)) ? mine.live.sessions.reduce((n, s) => n + (s.edits || 0), 0) : 0) + ' (your own activity)</td></tr>' +
    '<tr><td>Version-history entries</td><td>' + fmtNum(sV.length) + '</td><td>' + fmtNum(tV.length) + '</td></tr>' +
    '<tr><td>Active days (live)</td><td>' + sLiveDays.size + '</td><td>—</td></tr>' +
    '<tr><td>Version-history days</td><td>' + sVDays.size + '</td><td>' + tDays.size + '</td></tr>' +
    '</table></div>';

  if (sVDays.size && tDays.size) {
    const overlap = [...sVDays].filter((k) => tDays.has(k)).length;
    html += '<p class="muted">Version-history overlap: ' + overlap + ' of ' + sVDays.size + ' days in the file also appear in your import' +
      (sOnly.length ? '; only-in-file: ' + sOnly.slice(0, 6).map(dayLabel).join(', ') : '') +
      (tOnly.length ? '; only-in-your-import: ' + tOnly.slice(0, 6).map(dayLabel).join(', ') : '') +
      '. Both imports come from the same Google servers, so large disagreements usually mean one side is incomplete — scroll the document\u2019s version history and Re-check.</p>';
  }
  if (sLiveEdits > 0 && tV.length > 0) {
    const tVersionEdits = tV.reduce((n, v) => n + (v.edits || 0), 0);
    if (tVersionEdits > 0 && sLiveEdits > tVersionEdits * 50) {
      html += '<p class="muted">Note: the summary claims ' + fmtNum(sLiveEdits) + ' edit bursts, far above the ' + fmtNum(tVersionEdits) +
        ' edit entries Google\u2019s history records — possible typing simulator or aggregated data; ask the student to walk you through their draft.</p>';
    }
  }

  html += '<div style="margin-top:10px">' +
    (d.url ? '<button class="btn" id="ccOpen">Open the document</button> ' : '') +
    '<button class="btn" id="ccRe">Re-check</button></div>';

  box.innerHTML = html;
  wire(d.url);
}

// ---- wiring ----
el('btnPick').addEventListener('click', () => el('file').click());
el('file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) handleFile(f);
  e.target.value = '';
});
const drop = el('drop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('drag');
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) handleFile(f);
});
