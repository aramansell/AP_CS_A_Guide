/*
 * Revision Banner — MV3 service worker.
 *
 * Deliberately small: the heavy lifting lives in the content script so the
 * extension keeps working even if the service worker is asleep. This worker:
 *  - seeds default settings and the file index on install
 *  - keeps an action-icon badge with the number of tracked files
 *  - relays the Alt+Shift+R "toggle banner" command to the active tab
 *  - performs the optional, user-configured Drive API revision sync
 *    (experimental tier; see README for setup)
 */
'use strict';

const DEFAULTS = {
  bannerPct: 13,                 // height as % of viewport (clamped 8..15)
  bannerDefaultCollapsed: false,
  darkMode: 'auto',              // auto | light | dark
  pushMode: 'auto',              // auto | overlay
  idleMinutes: 2,                // inactivity gap that pauses the active clock
  sessionGapMinutes: 30,          // gap that splits work sessions
  pasteThresholdChars: 200,       // bulk-insertion flag threshold
  keepDays: 120,                  // live session retention (older go to rollup)
  autoSync: 'smart',              // smart | off | always (auto history import)
  autoSyncEveryMinutes: 20,       // min gap between auto import attempts
  autoCloseHistoryPane: true,    // close the history pane after a watch-mode import
  driveApiAuto: false,            // experimental Drive API tier
  showScore: true,
  debug: false,
  apps: { docs: true, sheets: true, slides: true, forms: true, drawings: true, drive: true },
  ai: { enabled: false, url: 'https://ollama.com/v1', key: '', model: 'glm-5.3-flash:cloud' }
};
const KEY_SETTINGS = 'settings';
const KEY_META = 'meta';

async function getSettings() {
  try {
    const o = await chrome.storage.local.get(KEY_SETTINGS);
    const s = { ...DEFAULTS, ...((o && o[KEY_SETTINGS]) || {}) };
    s.ai = { ...DEFAULTS.ai, ...(((o && o[KEY_SETTINGS]) && o[KEY_SETTINGS].ai) || {}) };
    return s;
  } catch (e) {
    return { ...DEFAULTS, ai: { ...DEFAULTS.ai } };
  }
}

async function updateBadge() {
  try {
    const o = await chrome.storage.local.get(KEY_META);
    const meta = o && o[KEY_META];
    const n = meta && Array.isArray(meta.index) ? meta.index.length : 0;
    await chrome.action.setBadgeText({ text: n ? String(n) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#4f46e5' });
  } catch (e) { /* ignore */ }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const s = await getSettings();
    await chrome.storage.local.set({ [KEY_SETTINGS]: s });
    const m = await chrome.storage.local.get(KEY_META);
    if (!m[KEY_META]) await chrome.storage.local.set({ [KEY_META]: { index: [] } });
    if (details && details.reason === 'install') {
      chrome.runtime.openOptionsPage().catch(() => {});
    }
  } catch (e) { /* ignore */ }
  updateBadge();
});

chrome.runtime.onStartup.addListener(() => { updateBadge(); });

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') updateBadge();
});

// ---- message routing ----------------------------------------------------

chrome.runtime.onMessage.addListener((msgRaw, sender, sendResponse) => {
  (async () => {
    const msg = msgRaw || {};
    try {
      switch (msg.type) {
        case 'heartbeat': {
          const rec = msg.record || {};
          const o = await chrome.storage.local.get(KEY_META);
          const meta = o[KEY_META] || { index: [] };
          if (rec.id && !meta.index.includes(rec.id)) {
            meta.index.unshift(rec.id);
            if (meta.index.length > 400) meta.index.length = 400;
            await chrome.storage.local.set({ [KEY_META]: meta });
          }
          sendResponse({ ok: true });
          break;
        }
        case 'clear-file': {
          const id = String(msg.id || '');
          if (id) {
            await chrome.storage.local.remove('files:' + id);
            const o = await chrome.storage.local.get(KEY_META);
            const meta = o[KEY_META] || { index: [] };
            if (Array.isArray(meta.index)) {
              meta.index = meta.index.filter((x) => x !== id);
              await chrome.storage.local.set({ [KEY_META]: meta });
            }
          }
          sendResponse({ ok: true });
          break;
        }
        case 'drive-status': sendResponse(await driveStatus()); break;
        case 'drive-sync': sendResponse(await driveSync(msg.fileId)); break;
        case 'ai-analyze': sendResponse(await aiAnalyze(msg.payload)); break;
        default: sendResponse({ ok: false, error: 'unknown message type' });
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message || e) });
    }
  })();
  return true; // keep channel open for async sendResponse
});

chrome.commands && chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-banner') return;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].id != null) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-banner' }).catch(() => {});
    }
  } catch (e) { /* ignore */ }
});

// ---- optional Drive API tier (experimental) ------------------------------
// The teacher configures their own OAuth client in the options page; tokens
// are stored locally in chrome.storage.local. See README for setup.

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function driveStatus() {
  try {
    const o = await chrome.storage.local.get('driveAuth');
    const a = o.driveAuth || {};
    return {
      ok: true,
      configured: !!a.client_id,
      hasRefresh: !!a.refresh_token,
      expires: a.expiry || 0,
      error: a.lastError || null
    };
  } catch (e) {
    return { ok: false, configured: false, hasRefresh: false, error: String(e) };
  }
}

async function ensureToken() {
  const o = await chrome.storage.local.get('driveAuth');
  const a = o.driveAuth;
  if (!a || !a.client_id || !a.refresh_token) throw new Error('Drive API is not configured');
  if (a.access_token && a.expiry > Date.now() + 30000) return a.access_token;
  const body = new URLSearchParams({
    client_id: a.client_id,
    client_secret: a.client_secret || '',
    refresh_token: a.refresh_token,
    grant_type: 'refresh_token'
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    a.lastError = 'Token refresh failed: ' + res.status;
    await chrome.storage.local.set({ driveAuth: a });
    throw new Error(a.lastError);
  }
  const j = await res.json();
  a.access_token = j.access_token;
  a.expiry = Date.now() + ((j.expires_in || 3600) * 1000) - 60000;
  a.lastError = null;
  await chrome.storage.local.set({ driveAuth: a });
  return a.access_token;
}

async function driveSync(fileId) {
  try {
    if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) throw new Error('bad fileId');
    const tok = await ensureToken();
    const versions = [];
    let pageToken = null;
    for (let page = 0; page < 5; page++) {
      let url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) +
        '/revisions?fields=revisions(id,lastModifyingUser(displayName,emailAddress),modifiedTime,size),nextPageToken&pageSize=200';
      if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } });
      if (res.status === 401) {
        // force refresh once and retry this page
        const o = await chrome.storage.local.get('driveAuth');
        const a = o.driveAuth;
        if (a) { a.access_token = null; a.expiry = 0; await chrome.storage.local.set({ driveAuth: a }); }
        throw new Error('Drive API authorization expired — press "Sync now" again');
      }
      if (!res.ok) throw new Error('Drive API error: ' + res.status);
      const j = await res.json();
      for (const r of (j.revisions || [])) {
        const ts = r.modifiedTime ? Date.parse(r.modifiedTime) : null;
        if (!ts || Number.isNaN(ts)) continue;
        versions.push({
          ts,
          editor: (r.lastModifyingUser && (r.lastModifyingUser.displayName || r.lastModifyingUser.emailAddress)) || null,
          size: r.size != null ? Number(r.size) : null,
          src: 'drive'
        });
      }
      pageToken = j.nextPageToken || null;
      if (!pageToken) break;
    }
    versions.sort((a, b) => a.ts - b.ts);
    return { ok: true, versions };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

// ---- optional AI tier (user-configured endpoint + key) ---------------------
//
// The user brings their own OpenAI-compatible endpoint (Options → AI analysis).
// The payload is writing-process METADATA only — timestamps, sizes, counts and
// locally-computed signals. Document text is never included. This runs in the
// service worker so the endpoint host permission is honored (granted on demand
// when the user enables the feature in Options).

const AI_SYSTEM_PROMPT = [
  'You analyze writing-process metadata for educators using the Revision Banner browser extension.',
  'You will receive JSON describing timing, sessions, paste sizes and locally-computed signals for ONE document. The document\'s text is never included.',
  'Rules:',
  '1. Ground every statement in the specific numbers given and quote them.',
  '2. Never conclude that a student cheated or that text is AI-generated. Describe the patterns and say what would confirm or rule out each concern.',
  '3. Offer at least one innocent explanation for every concern (offline drafting, dictation, pasting their own earlier work, teacher-provided template, tight deadline).',
  '4. Answer in under 200 words with these sections, exactly one per line:',
  '"Overall read:", "Notable patterns:", "Worth asking about:", "Innocent explanations:".',
  '5. Plain text only — no markdown, no bullet characters.'
].join(' ');

// Normalize the user's endpoint setting to a full chat-completions URL.
// Accepts either a base (…/v1 — the default is Ollama's https://ollama.com/v1)
// or a full …/chat/completions path, with or without trailing slashes.
function aiEndpointFromUrl(url) {
  let u = String(url || '').trim();
  if (!u) return '';
  u = u.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(u)) return u;
  if (/\/completions$/i.test(u)) return u;
  return u + '/chat/completions';
}

async function aiAnalyze(payload) {
  try {
    const s = await getSettings();
    const ai = s.ai || {};
    if (!ai.enabled || !ai.url || !ai.key) {
      return { ok: false, error: 'AI analysis is not configured — enable it in Options with your API key.' };
    }
    const endpoint = aiEndpointFromUrl(ai.url);
    if (!endpoint) {
      return { ok: false, error: 'The AI endpoint URL is empty — set it in Options.' };
    }
    const body = {
      model: ai.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: typeof payload === 'string' ? payload : JSON.stringify(payload || {}) }
      ],
      temperature: 0.3,
      max_tokens: 600
    };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ai.key },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      let hint = '';
      try {
        const j = JSON.parse(t);
        hint = (j && j.error && (j.error.message || j.error.code)) ? ' — ' + (j.error.message || j.error.code) : '';
      } catch (e) { hint = t ? ' — ' + t.slice(0, 160) : ''; }
      return { ok: false, error: 'API error ' + res.status + hint };
    }
    const j = await res.json();
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) return { ok: false, error: 'Unexpected response shape from the endpoint (missing choices[0].message.content).' };
    return { ok: true, text: String(text).trim(), model: (j && j.model) || ai.model || '' };
  } catch (e) {
    const m = String(e && e.message || e);
    return { ok: false, error: /abort/i.test(m) ? 'Timed out after 30 s — try a smaller model or check the endpoint URL.' : m };
  }
}
