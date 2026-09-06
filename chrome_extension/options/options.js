/*
 * Revision Banner — options page.
 * Settings are saved to chrome.storage.local the moment they change; open
 * documents pick them up on next load. Also hosts the optional Drive API
 * OAuth flow (PKCE) and data import/export.
 */
'use strict';

const DEFAULTS = {
  bannerPct: 13,
  bannerDefaultCollapsed: false,
  darkMode: 'auto',
  pushMode: 'auto',
  idleMinutes: 2,
  sessionGapMinutes: 30,
  pasteThresholdChars: 200,
  keepDays: 120,
  autoSync: 'smart',
  autoSyncEveryMinutes: 20,
  autoCloseHistoryPane: true,
  driveApiAuto: false,
  showScore: true,
  debug: false,
  apps: { docs: true, sheets: true, slides: true, forms: true, drawings: true, drive: true },
  ai: { enabled: false, url: 'https://ollama.com/v1', key: '', model: 'glm-5.3-flash:cloud' }
};

let settings = { ...DEFAULTS, apps: { ...DEFAULTS.apps } };
let saveTimer = 0;

function flash(msg) {
  const el = document.getElementById('saveStatus');
  el.textContent = msg;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { el.textContent = ''; }, 2500);
}

async function loadSettings() {
  try {
    const o = await chrome.storage.local.get('settings');
    const s = (o && o.settings) || {};
    settings = {
      ...DEFAULTS, ...s,
      apps: { ...DEFAULTS.apps, ...((s && s.apps) || {}) },
      ai: { ...DEFAULTS.ai, ...((s && s.ai) || {}) }
    };
  } catch (e) {
    settings = { ...DEFAULTS, apps: { ...DEFAULTS.apps }, ai: { ...DEFAULTS.ai } };
  }
  bindUI();
}

async function persist() {
  try {
    await chrome.storage.local.set({ settings });
    flash('Saved ✓');
  } catch (e) {
    flash('Save failed: ' + e);
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 350);
}

function bindUI() {
  const g = (id) => document.getElementById(id);
  g('bannerPct').value = settings.bannerPct;
  g('bannerPctOut').textContent = settings.bannerPct + '%';
  g('bannerDefaultCollapsed').checked = !!settings.bannerDefaultCollapsed;
  g('darkMode').value = settings.darkMode;
  g('pushMode').value = settings.pushMode;
  g('showScore').checked = settings.showScore !== false;
  g('debug').checked = !!settings.debug;
  g('idleMinutes').value = settings.idleMinutes;
  g('sessionGapMinutes').value = settings.sessionGapMinutes;
  g('pasteThresholdChars').value = settings.pasteThresholdChars;
  g('keepDays').value = settings.keepDays;
  g('autoSync').value = settings.autoSync;
  g('autoSyncEveryMinutes').value = settings.autoSyncEveryMinutes;
  g('autoCloseHistoryPane').checked = !!settings.autoCloseHistoryPane;
  g('driveApiAuto').checked = !!settings.driveApiAuto;
  g('aiEnabled').checked = !!settings.ai.enabled;
  g('aiUrl').value = settings.ai.url || DEFAULTS.ai.url;
  g('aiModel').value = settings.ai.model || DEFAULTS.ai.model;
  g('aiKey').value = settings.ai.key || '';
  for (const cb of document.querySelectorAll('#apps input[data-app]')) {
    cb.checked = settings.apps[cb.getAttribute('data-app')] !== false;
  }
  updateStorageNote();
  updateDriveUI();
  updateAiStatus();
}

function wire() {
  const g = (id) => document.getElementById(id);

  g('bannerPct').addEventListener('input', (e) => {
    settings.bannerPct = Math.max(8, Math.min(15, parseInt(e.target.value, 10) || 13));
    g('bannerPctOut').textContent = settings.bannerPct + '%';
    scheduleSave();
  });
  const bindCheck = (id, key) => g(id).addEventListener('change', (e) => {
    settings[key] = e.target.checked; scheduleSave();
  });
  const bindSelect = (id, key) => g(id).addEventListener('change', (e) => {
    settings[key] = e.target.value; scheduleSave();
  });
  const bindNum = (id, key, lo, hi) => g(id).addEventListener('change', (e) => {
    const v = parseInt(e.target.value, 10);
    settings[key] = Math.max(lo, Math.min(hi, isNaN(v) ? DEFAULTS[key] : v));
    e.target.value = settings[key];
    scheduleSave();
  });

  bindCheck('bannerDefaultCollapsed', 'bannerDefaultCollapsed');
  bindCheck('showScore', 'showScore');
  bindCheck('debug', 'debug');
  bindCheck('driveApiAuto', 'driveApiAuto');
  bindCheck('autoCloseHistoryPane', 'autoCloseHistoryPane');
  bindSelect('darkMode', 'darkMode');
  bindSelect('pushMode', 'pushMode');
  bindSelect('autoSync', 'autoSync');
  bindNum('idleMinutes', 'idleMinutes', 1, 10);
  bindNum('sessionGapMinutes', 'sessionGapMinutes', 10, 120);
  bindNum('pasteThresholdChars', 'pasteThresholdChars', 50, 2000);
  bindNum('keepDays', 'keepDays', 30, 365);
  bindNum('autoSyncEveryMinutes', 'autoSyncEveryMinutes', 5, 720);

  for (const cb of document.querySelectorAll('#apps input[data-app]')) {
    cb.addEventListener('change', () => {
      const key = cb.getAttribute('data-app');
      settings.apps[key] = cb.checked;
      scheduleSave();
    });
  }

  g('btnExportJson').addEventListener('click', exportAll);
  g('fileImport').addEventListener('change', importJson);
  g('btnClearAll').addEventListener('click', clearAll);
  g('btnDriveConnect').addEventListener('click', driveConnect);
  g('btnDriveRevoke').addEventListener('click', driveRevoke);

  // AI tier (opt-in, user's own endpoint + key)
  g('aiEnabled').addEventListener('change', async (e) => {
    settings.ai.enabled = e.target.checked;
    scheduleSave();
    await ensureAiPermission();
    updateAiStatus();
  });
  g('aiUrl').addEventListener('change', async (e) => {
    let v = e.target.value.trim();
    if (!v) v = DEFAULTS.ai.url;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    settings.ai.url = v;
    e.target.value = v;
    scheduleSave();
    await ensureAiPermission();
    updateAiStatus();
  });
  g('aiModel').addEventListener('change', (e) => {
    settings.ai.model = e.target.value.trim() || DEFAULTS.ai.model;
    e.target.value = settings.ai.model;
    scheduleSave();
  });
  g('aiKey').addEventListener('change', () => {
    settings.ai.key = g('aiKey').value.trim();
    scheduleSave();
    updateAiStatus();
  });
}

// The AI call goes to a user-chosen host, so MV3 needs a host permission for
// it — requested on demand (user gesture) only when the tier is enabled.
async function ensureAiPermission() {
  try {
    const statusEl = document.getElementById('aiStatus');
    if (!settings.ai.enabled || !settings.ai.url) return false;
    let origin;
    try { origin = new URL(settings.ai.url).origin + '/*'; }
    catch (e) { statusEl.textContent = 'That endpoint URL is not valid — fix it before enabling.'; return false; }
    if (await chrome.permissions.contains({ origins: [origin] })) return true;
    const granted = await chrome.permissions.request({ origins: [origin] });
    if (!granted) {
      statusEl.textContent = 'Network permission denied — the extension needs access to ' + origin +
        ' to call your AI endpoint. Toggle the enable switch again to retry.';
    }
    return granted;
  } catch (e) {
    try { document.getElementById('aiStatus').textContent = 'Could not request permission: ' + e; } catch (err) { /* ignore */ }
    return false;
  }
}

// Same normalization as the service worker: base URL → full chat endpoint.
function aiEndpoint(url) {
  let u = String(url || '').trim();
  if (!u) return '';
  u = u.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(u)) return u;
  if (/\/completions$/i.test(u)) return u;
  return u + '/chat/completions';
}

async function updateAiStatus() {
  try {
    const el = document.getElementById('aiStatus');
    if (!settings.ai.enabled) {
      el.textContent = 'Disabled — nothing is ever sent to any AI endpoint.';
      return;
    }
    if (!settings.ai.key) {
      el.textContent = 'Enabled, but no API key yet — add one to use “Explain with AI”.';
      return;
    }
    let origin = '';
    try { origin = new URL(settings.ai.url).origin; } catch (e) { origin = ''; }
    let perm = false;
    if (origin) {
      try { perm = await chrome.permissions.contains({ origins: [origin + '/*'] }); } catch (e) { perm = false; }
    }
    el.textContent = (perm ? 'Ready ✓ ' : '⚠ Missing network permission for ' + origin + ' — re-save the endpoint URL to grant it. ') +
      'Calls go only to ' + aiEndpoint(settings.ai.url) + ' (model: ' + (settings.ai.model || 'default') +
      '), only when you click “Explain with AI”, and carry metadata only — never document text.';
  } catch (e) { /* ignore */ }
}

async function updateStorageNote() {
  try {
    const est = await navigator.storage.estimate();
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all);
    const files = keys.filter((k) => k.startsWith('files:')).length;
    document.getElementById('storageNote').textContent =
      'Tracking ' + files + ' document' + (files === 1 ? '' : 's') + ' · using about ' +
      (est && est.usage ? Math.round(est.usage / 1024) + ' KB' : 'a small amount') +
      ' of local storage. Live sessions older than the retention window are aggregated into totals.';
  } catch (e) {
    document.getElementById('storageNote').textContent = '';
  }
}

async function exportAll() {
  try {
    const all = await chrome.storage.local.get(null);
    const clean = { ...all };
    if (clean.driveAuth) {
      delete clean.driveAuth.access_token;
      delete clean.driveAuth.refresh_token;
    }
    // Never export the AI API key (or drive secret, belt and braces).
    if (clean.driveAuth) delete clean.driveAuth.client_secret;
    if (clean.settings && clean.settings.ai) {
      clean.settings = { ...clean.settings, ai: { ...clean.settings.ai, key: '' } };
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revision-banner-data-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    flash('Exported ✓');
  } catch (e) {
    flash('Export failed: ' + e);
  }
}

async function importJson(e) {
  const f = e.target && e.target.files && e.target.files[0];
  if (!f) return;
  try {
    const text = await f.text();
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw new Error('not an object');
    const keys = Object.keys(data).filter((k) => k.startsWith('files:') || k === 'meta');
    const patch = {};
    for (const k of keys) patch[k] = data[k];
    if (patch.meta && Array.isArray(patch.meta.index)) {
      const existing = await chrome.storage.local.get('meta');
      const prev = (existing && existing.meta && Array.isArray(existing.meta.index)) ? existing.meta.index : [];
      const merged = Array.from(new Set(prev.concat(patch.meta.index))).slice(0, 400);
      patch.meta = { index: merged };
    }
    await chrome.storage.local.set(patch);
    flash('Imported ' + keys.length + ' keys ✓');
    updateStorageNote();
  } catch (err) {
    flash('Import failed: ' + err);
  }
  e.target.value = '';
}

async function clearAll() {
  if (!confirm('Delete ALL Revision Banner data (tracked stats for every document)?\nThis cannot be undone.')) return;
  if (!confirm('Really delete everything? Settings will also reset.')) return;
  try {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ settings: { ...DEFAULTS }, meta: { index: [] } });
    loadSettings();
    flash('All data cleared');
  } catch (e) {
    flash('Clear failed: ' + e);
  }
}

// ---- Drive API (experimental) --------------------------------------------

function b64url(bytes) {
  let s = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function driveConnect() {
  const statusEl = document.getElementById('driveStatus');
  const clientId = document.getElementById('driveClientId').value.trim();
  const clientSecret = document.getElementById('driveClientSecret').value.trim();
  statusEl.textContent = 'Starting Google sign-in…';
  try {
    if (!clientId) throw new Error('Client ID required.');
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const verifier = b64url(raw);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = b64url(digest);
    const redirect = chrome.identity.getRedirectURL();
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      redirect_uri: redirect,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: challenge,
      code_challenge_method: 'S256'
    }).toString();
    const respUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
    if (!respUrl) throw new Error('Authorization window closed.');
    const code = new URL(respUrl).searchParams.get('code');
    if (!code) throw new Error('No authorization code in response (did you add ' + redirect + ' as an authorized redirect URI?).');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect,
        grant_type: 'authorization_code',
        code_verifier: verifier
      })
    });
    const j = await tokenRes.json();
    if (!tokenRes.ok || !j.refresh_token) {
      throw new Error('Token exchange failed: ' + (j.error_description || j.error || tokenRes.status));
    }
    await chrome.storage.local.set({
      driveAuth: {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: j.refresh_token,
        access_token: j.access_token || null,
        expiry: Date.now() + ((j.expires_in || 3600) * 1000) - 60000,
        lastError: null
      }
    });
    statusEl.textContent = 'Connected ✓ — the banner can now sync revision metadata via the Drive API.';
    updateDriveUI();
  } catch (e) {
    statusEl.textContent = 'Connect failed: ' + (e && e.message ? e.message : e);
  }
}

async function driveRevoke() {
  try {
    await chrome.storage.local.remove('driveAuth');
    document.getElementById('driveStatus').textContent = 'Disconnected.';
    updateDriveUI();
  } catch (e) { /* ignore */ }
}

async function updateDriveUI() {
  try {
    const o = await chrome.storage.local.get('driveAuth');
    const a = o.driveAuth;
    const el = document.getElementById('driveStatus');
    if (a && a.client_id) {
      document.getElementById('driveClientId').value = a.client_id;
      document.getElementById('driveClientSecret').value = a.client_secret || '';
      if (a.refresh_token) {
        el.textContent = 'Connected ✓ (account authorized, token stored locally). Redirect URI for your OAuth client: ' +
          chrome.identity.getRedirectURL();
      } else {
        el.textContent = 'Client saved but not yet authorized. Redirect URI for your OAuth client: ' + chrome.identity.getRedirectURL();
      }
    } else {
      el.textContent = 'Not configured. When you add a Client ID, the redirect URI to allow is: ' + chrome.identity.getRedirectURL();
    }
  } catch (e) { /* ignore */ }
}

loadSettings().then(wire);
