/*
 * Revision Banner — content script (isolated world).
 *
 * Injects a slim dashboard banner across the top of Google Docs / Sheets /
 * Slides (plus Drive file previews) and shows revision-history signals at a
 * glance: edits, active time, work sessions, contributors, bulk paste flags
 * and a writing-process score.
 *
 * Data is gathered through four independent, layered sources so the banner
 * degrades gracefully and never lies about where a number came from:
 *   1. Live tracking   — keystrokes, pastes, active/idle time, DOM text deltas
 *                        (this browser, persisted per file in local storage)
 *   2. Version pane    — scrapes Google's own "Version history" panel; auto
 *                        import attempts a keyboard/menu shortcut, passive
 *                        import happens whenever the pane is opened
 *   3. Network ops     — MAIN-world script (content/main-world.js) forwards
 *                        collaborative-editing payloads; we defensively parse
 *                        timestamp sequences out of them (experimental)
 *   4. Drive API       — optional OAuth metadata sync configured in Options
 *
 * Robustness rules for this file: every external action is guarded, no
 * assumption about Google's DOM is load-bearing (the offset engine measures
 * and escalates), and every failure falls back to a simpler mode.
 */
'use strict';

(function () {
  if (window.__revBannerInit) return;
  try { window.__revBannerInit = true; } catch (e) { return; }

  /* =====================================================================
   * 1. Tiny utilities
   * ===================================================================== */

  const $ = (sel, root) => {
    try { return (root || document).querySelector(sel); } catch (e) { return null; }
  };
  const $$ = (sel, root) => {
    try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; }
  };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const nowMs = () => Date.now();
  const pad2 = (n) => (n < 10 ? '0' + n : '' + n);

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function fmtNum(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 100000) return Math.round(n / 1000) + 'k';
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
    const d = Math.floor(h / 24);
    return d + 'd ' + (h % 24) + 'h';
  }

  function fmtRel(ts, base) {
    if (!ts) return '—';
    const dt = (base || nowMs()) - ts;
    if (dt < 45000) return 'just now';
    if (dt < 3600000) return Math.floor(dt / 60000) + 'm ago';
    if (dt < 86400000) return Math.floor(dt / 3600000) + 'h ago';
    if (dt < 7 * 86400000) return Math.floor(dt / 86400000) + 'd ago';
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return '—'; }
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } catch (e) { return '—'; }
  }

  function isoDate(ts) {
    try {
      const d = new Date(ts);
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    } catch (e) { return ''; }
  }

  function debounce(fn, ms) {
    let t = 0;
    return function () {
      clearTimeout(t);
      const args = arguments;
      t = setTimeout(() => { try { fn.apply(null, args); } catch (e) { /* ignore */ } }, ms);
    };
  }

  const debugLog = [];
  function log(msg) {
    try {
      debugLog.push({ t: nowMs(), msg: String(msg).slice(0, 300) });
      if (debugLog.length > 200) debugLog.shift();
    } catch (e) { /* ignore */ }
  }

  /* =====================================================================
   * 2. Safe chrome wrappers (with in-memory fallback for local dev pages)
   * ===================================================================== */

  const memStore = {};

  const store = {
    async getRaw(keys) {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          return await chrome.storage.local.get(keys);
        }
      } catch (e) { /* fall through */ }
      const out = {};
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) if (k in memStore) out[k] = memStore[k];
      return out;
    },
    async get(key, def) {
      const o = await store.getRaw([key]);
      return (key in o) ? o[key] : def;
    },
    async set(obj) {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set(obj);
          return true;
        }
      } catch (e) { /* fall through */ }
      for (const k of Object.keys(obj)) memStore[k] = obj[k];
      return true;
    },
    async remove(keys) {
      try {
        if (chrome && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.remove(keys);
          return true;
        }
      } catch (e) { /* fall through */ }
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) delete memStore[k];
      return true;
    }
  };

  function bgMsg(payload) {
    try {
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        const p = chrome.runtime.sendMessage(payload);
        if (p && typeof p.then === 'function') return p.catch(() => null);
      }
    } catch (e) { /* ignore */ }
    return Promise.resolve(null);
  }

  function openOptions() {
    try {
      if (chrome && chrome.runtime && chrome.runtime.getURL) {
        window.open(chrome.runtime.getURL('options/options.html'), '_blank');
        return;
      }
    } catch (e) { /* ignore */ }
  }

  /* =====================================================================
   * 3. Settings
   * ===================================================================== */

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

  async function loadSettings() {
    const o = await store.get('settings', {});
    const s = Object.assign({}, DEFAULTS, o || {});
    s.apps = Object.assign({}, DEFAULTS.apps, (o && o.apps) || {});
    s.ai = Object.assign({}, DEFAULTS.ai, (o && o.ai) || {});
    return s;
  }

  /* =====================================================================
   * 4. Page context detection
   * ===================================================================== */

  const APP_LABELS = {
    docs: 'Google Docs', sheets: 'Google Sheets', slides: 'Google Slides',
    forms: 'Google Forms', drawings: 'Google Drawings', drive: 'Google Drive'
  };
  const APP_ICONS = {
    docs: '📄', sheets: '📊', slides: '📽️', forms: '📝', drawings: '✏️', drive: '📁'
  };

  function cleanTitle(t) {
    let s = String(t || '').trim();
    s = s.replace(/\s*-\s*Google (Docs|Sheets|Slides|Forms|Drawings|Drive)\s*$/i, '');
    return s || 'Untitled';
  }

  function detectContext() {
    // Local development page (tools/dev-test.html) uses a synthetic context.
    if (window.__REVBANNER_DEV__) {
      return {
        app: 'docs',
        fileId: 'dev-test-doc',
        title: cleanTitle(document.title) || 'Dev test document',
        url: location.href,
        dev: true
      };
    }
    if (!/^(docs|drive)\.google\.com$/.test(location.hostname || '')) return null;
    const path = location.pathname || '';
    let m = path.match(/^\/(?:u\/\d+\/)?(document|spreadsheets|presentation|forms|drawings)\/d\/([a-zA-Z0-9_-]{10,})/);
    let app = null, fileId = null;
    if (m) {
      app = ({ document: 'docs', spreadsheets: 'sheets', presentation: 'slides', forms: 'forms', drawings: 'drawings' })[m[1]];
      fileId = m[2];
    } else {
      m = path.match(/^\/(?:u\/\d+\/)?file\/d\/([a-zA-Z0-9_-]{10,})/);
      if (m) { app = 'drive'; fileId = m[1]; }
    }
    if (!app || !fileId) return null;
    return {
      app,
      fileId,
      title: cleanTitle(document.title),
      url: location.origin + location.pathname,
      dev: false
    };
  }

  function scrapeAccountLabel() {
    try {
      const el = document.querySelector('[role="button"][aria-label*="Google Account" i]') ||
        document.querySelector('img[alt*="Google Account" i]');
      const s = el ? (el.getAttribute('aria-label') || el.getAttribute('alt') || '') : '';
      if (!s) return null;
      let mm = s.match(/Google Account[^:()]*:?\s*(.+?)\s*\(([^)]+@[^)]+)\)/i);
      if (mm) return mm[1].trim();
      mm = s.match(/\(([^)]+@[^)]+)\)/);
      if (mm) return mm[1].trim();
      return s.length < 60 ? s.trim() : null;
    } catch (e) { return null; }
  }

  /* =====================================================================
   * 5. Per-file record storage (merge-on-write, prune + rollup)
   * ===================================================================== */

  const SESSION_CAP = 600;
  const VERSION_CAP = 3000;
  const OPS_CAP = 8000;

  async function loadRecord(ctx) {
    const key = 'files:' + ctx.fileId;
    const o = await store.getRaw([key]);
    const prev = o ? o[key] : null;
    const t = nowMs();
    const rec = prev ? Object.assign({}, prev) : {
      id: ctx.fileId, app: ctx.app, title: ctx.title, url: ctx.url,
      account: null, firstSeen: t, lastSeen: t,
      live: { sessions: [], rollup: {} },
      hist: { versions: [], ops: [], opsRollup: 0, versionsRollup: 0, source: null, fetchedAt: 0, lastAutoTry: 0 },
      ui: {}
    };
    rec.id = ctx.fileId;
    rec.app = ctx.app;
    rec.live = rec.live && typeof rec.live === 'object' ? rec.live : { sessions: [], rollup: {} };
    if (!Array.isArray(rec.live.sessions)) rec.live.sessions = [];
    if (!rec.live.rollup || typeof rec.live.rollup !== 'object') rec.live.rollup = {};
    rec.hist = rec.hist && typeof rec.hist === 'object' ? rec.hist : {};
    if (!Array.isArray(rec.hist.versions)) rec.hist.versions = [];
    if (!Array.isArray(rec.hist.ops)) rec.hist.ops = [];
    rec.hist.opsRollup = rec.hist.opsRollup || 0;
    rec.hist.versionsRollup = rec.hist.versionsRollup || 0;
    rec.hist.lastAutoTry = rec.hist.lastAutoTry || 0;
    rec.title = ctx.title || rec.title;
    rec.url = ctx.url || rec.url;
    rec.ui = rec.ui && typeof rec.ui === 'object' ? rec.ui : {};
    rec.lastSeen = t;
    return rec;
  }

  function mergeSession(a, b) {
    // Same logical session from two tabs: keep per-field maxima, union pastes.
    const out = (b && b.end >= (a ? a.end : 0)) ? Object.assign({}, b) : Object.assign({}, a || {});
    if (a && b) {
      out.keys = Math.max(a.keys || 0, b.keys || 0);
      out.edits = Math.max(a.edits || 0, b.edits || 0);
      out.activeMs = Math.max(a.activeMs || 0, b.activeMs || 0);
      out.addChars = Math.max(a.addChars || 0, b.addChars || 0);
      out.delChars = Math.max(a.delChars || 0, b.delChars || 0);
      const seen = new Set();
      out.pastes = [];
      for (const p of [].concat(a.pastes || [], b.pastes || [])) {
        const k = p && p.t;
        if (k == null || seen.has(k)) continue;
        seen.add(k); out.pastes.push(p);
      }
      out.pastes.sort((x, y) => x.t - y.t);
    }
    return out;
  }

  function pruneAndRollup(rec, keepDays) {
    try {
      const cutoff = nowMs() - Math.max(1, keepDays) * 86400000;
      const keep = [], gone = [];
      for (const s of rec.live.sessions) {
        if (s && s.end != null && s.end < cutoff) gone.push(s); else if (s) keep.push(s);
      }
      if (!gone.length) return;
      const r = rec.live.rollup;
      for (const s of gone) {
        r.edits = (r.edits || 0) + (s.edits || 0);
        r.keys = (r.keys || 0) + (s.keys || 0);
        r.activeMs = (r.activeMs || 0) + (s.activeMs || 0);
        r.addChars = (r.addChars || 0) + (s.addChars || 0);
        r.delChars = (r.delChars || 0) + (s.delChars || 0);
        r.sessions = (r.sessions || 0) + 1;
        for (const p of (s.pastes || [])) {
          if (p && (p.chars || 0) >= DEFAULTS.pasteThresholdChars) {
            r.bulkCount = (r.bulkCount || 0) + 1;
            r.bulkChars = (r.bulkChars || 0) + (p.chars || 0);
          }
        }
        if (s.start && (!r.firstTs || s.start < r.firstTs)) r.firstTs = s.start;
      }
      rec.live.sessions = keep;
      log('rolled up ' + gone.length + ' old sessions');
    } catch (e) { log('prune error: ' + e); }
  }

  async function saveRecord(rec, cfg) {
    try {
      pruneAndRollup(rec, cfg ? cfg.keepDays : DEFAULTS.keepDays);
      const key = 'files:' + rec.id;
      const fresh = await store.getRaw([key]);
      const prev = fresh ? fresh[key] : null;
      let out = rec;
      if (prev) {
        out = Object.assign({}, prev, rec); // current in-memory fields win
        const smap = new Map();
        const pl = (prev.live && Array.isArray(prev.live.sessions)) ? prev.live.sessions : [];
        const cl = (rec.live && Array.isArray(rec.live.sessions)) ? rec.live.sessions : [];
        for (const s of pl.concat(cl)) {
          if (!s || !s.id) continue;
          const ex = smap.get(s.id);
          smap.set(s.id, ex ? mergeSession(ex, s) : s);
        }
        const sess = Array.from(smap.values()).sort((a, b) => (a.start || 0) - (b.start || 0));
        rec.hist.versionsRollup = Math.max(prev.hist && prev.hist.versionsRollup || 0, rec.hist.versionsRollup || 0);
        rec.hist.opsRollup = Math.max(prev.hist && prev.hist.opsRollup || 0, rec.hist.opsRollup || 0);
        out.live = Object.assign({}, rec.live, {
          sessions: sess.slice(-SESSION_CAP),
          rollup: Object.assign({}, (prev.live && prev.live.rollup) || {}, rec.live.rollup || {})
        });
        const vmap = new Map();
        const pv = (prev.hist && Array.isArray(prev.hist.versions)) ? prev.hist.versions : [];
        for (const v of pv.concat(rec.hist.versions || [])) {
          if (!v || !v.ts) continue;
          vmap.set(v.ts + '|' + (v.editor || '') + '|' + (v.src || ''), v);
        }
        out.hist = Object.assign({}, rec.hist, {
          versions: Array.from(vmap.values()).sort((a, b) => a.ts - b.ts).slice(-VERSION_CAP),
          ops: rec.hist.ops,
          opsRollup: rec.hist.opsRollup,
          versionsRollup: rec.hist.versionsRollup,
          source: rec.hist.source || (prev.hist && prev.hist.source) || null,
          fetchedAt: Math.max(rec.hist.fetchedAt || 0, (prev.hist && prev.hist.fetchedAt) || 0),
          lastAutoTry: Math.max(rec.hist.lastAutoTry || 0, (prev.hist && prev.hist.lastAutoTry) || 0)
        });
      } else {
        out.live = Object.assign({}, rec.live, { sessions: rec.live.sessions.slice(-SESSION_CAP) });
        out.hist = Object.assign({}, rec.hist, {
          versions: rec.hist.versions.slice(-VERSION_CAP),
          ops: rec.hist.ops.slice(-OPS_CAP)
        });
      }
      // ops merge (ts-keyed)
      if (prev && prev.hist && Array.isArray(prev.hist.ops) && prev.hist.ops.length) {
        const omap = new Map();
        for (const o of prev.hist.ops.concat(out.hist.ops || [])) {
          if (!o || !o.ts) continue;
          omap.set(o.ts, o);
        }
        const sorted = Array.from(omap.values()).sort((a, b) => a.ts - b.ts);
        const drop = sorted.length - OPS_CAP;
        if (drop > 0) {
          out.hist.opsRollup = (out.hist.opsRollup || 0) + drop;
          out.hist.ops = sorted.slice(drop);
        } else {
          out.hist.ops = sorted;
        }
      } else {
        out.hist.ops = (out.hist.ops || []).slice(-OPS_CAP);
      }
      out.lastSeen = nowMs();
      const ok = await store.set({ [key]: out });
      if (!ok) throw new Error('storage write failed');
      bgMsg({ type: 'heartbeat', record: { id: out.id, title: out.title, url: out.url, app: out.app } });
      return out;
    } catch (e) {
      log('saveRecord error: ' + e);
      return rec;
    }
  }

  /* =====================================================================
   * 6. Timestamp parsing for the version-history pane
   * ===================================================================== */

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  function parseWhen(text, base) {
    if (!text) return null;
    const s = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
    if (!s || s.length > 60) return null;
    const now = base || nowMs();
    const d = new Date(now);
    let m;
    if ((m = s.match(/(\d+)\s*(minutes?|hours?|days?|weeks?|months?)\s+ago/))) {
      const units = { minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
      const u = units[m[2].replace(/s$/, '')] || 86400000;
      const v = now - parseInt(m[1], 10) * u;
      return isNaN(v) ? null : v;
    }
    const setTime = (dd, hm) => {
      if (!hm) return dd.getTime();
      let h = parseInt(hm[1], 10) % 12;
      if (/p/.test(hm[3] || '')) h += 12;
      dd.setHours(h, parseInt(hm[2], 10), 0, 0);
      return dd.getTime();
    };
    if ((m = s.match(/^today[ ,]*(?:(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?))?/))) {
      d.setHours(0, 0, 0, 0);
      return setTime(d, m[1] != null ? m : null);
    }
    if ((m = s.match(/^yesterday[ ,]*(?:(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?))?/))) {
      d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0);
      return setTime(d, m[1] != null ? m : null);
    }
    if ((m = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?(?:[ ,]+(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?))?/))) {
      const mo = MONTHS[m[1]];
      const day = parseInt(m[2], 10);
      let year = m[3] ? parseInt(m[3], 10) : d.getFullYear();
      if (!m[3] && (mo > d.getMonth() || (mo === d.getMonth() && day > d.getDate()))) year -= 1;
      const out = new Date(year, mo, day, 0, 0, 0, 0);
      if (m[4] != null) {
        let h = parseInt(m[4], 10) % 12;
        if (/p/.test(m[6] || '')) h += 12;
        out.setHours(h, parseInt(m[5], 10), 0, 0);
      }
      const t = out.getTime();
      return isNaN(t) ? null : t;
    }
    if ((m = s.match(/^(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/))) {
      return setTime(d, m);
    }
    const t = Date.parse(s);
    return isNaN(t) ? null : t;
  }

  /* Rich, local-only measurements of a pasted block. The text itself is
   * NEVER stored — only these counts, which power the "structured paste"
   * signal (final-quality text arriving in one block) and the AI payload. */
  function pasteStatsFromText(text) {
    try {
      const s = String(text || '');
      if (!s) return null;
      const words = (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length;
      const paras = Math.max(0, s.split(/\n\s*\n/).filter((p) => p.trim()).length);
      const bullets = (s.match(/(?:^|\n)\s*(?:[-*•·]|\d+[.)])\s+\S/g) || []).length;
      const links = (s.match(/https?:\/\/\S+/gi) || []).length;
      const sentences = (s.match(/[^\n.!?…]+[.!?…]+/g) || []).length;
      const avgSentLen = sentences ? Math.round(words / sentences) : 0;
      const smartQuotes = (s.match(/[“”‘’]/g) || []).length;
      const emDashes = (s.match(/[—–]/g) || []).length;
      return { words, paras, bullets, links, sentences, avgSentLen, smartQuotes, emDashes };
    } catch (e) { return null; }
  }

  /* =====================================================================
   * 7. Live tracking (keystrokes, pastes, active time, DOM text deltas)
   * ===================================================================== */

  class LiveTracker {
    constructor(cfg, rec, onDirty) {
      this.cfg = cfg;
      this.rec = rec;
      this.onDirty = onDirty || function () {};
      this.idleMs = Math.max(0.5, cfg.idleMinutes) * 60000;
      this.gapMs = Math.max(5, cfg.sessionGapMinutes) * 60000;
      this.burstGapMs = 2000;
      this.paused = false;
      this.lastActivity = 0;
      this.lastLocalInput = 0;   // last keystroke/paste on this machine
      this.lastEditTs = 0;
      this.domWin = { added: 0, removed: 0 };
      this.domWinCount = 0;
      this.session = this.adoptOrNew();

      try {
        document.addEventListener('keydown', (e) => this.onKeydown(e), { capture: true, passive: true });
        document.addEventListener('compositionend', () => this.onComposition(), { capture: true, passive: true });
        document.addEventListener('paste', (e) => this.onPaste(e), { capture: true, passive: true });
        document.addEventListener('pointerdown', () => this.activity(), { capture: true, passive: true });
        document.addEventListener('wheel', () => this.activity(), { capture: true, passive: true });
        window.addEventListener('blur', () => this.flush());
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') this.flush();
          else this.activity();
        });
        window.addEventListener('pagehide', () => this.flush());
      } catch (e) { log('listener attach error: ' + e); }

      this.attachDomObserver(0);

      this.tickId = setInterval(() => this.tick(), 1000);
      this.domProcId = setInterval(() => this.processDomWindow(), 800);
      this.flushId = setInterval(() => this.flush(), 20000);

      // Heartbeat-ish: keep rec.title fresh.
      this.titleId = setInterval(() => this.maybeTitle(), 15000);
    }

    maybeTitle() {
      try {
        const t = cleanTitle(document.title);
        if (t && t !== this.rec.title && t !== 'Loading') {
          this.rec.title = t;
          this.onDirty();
        }
      } catch (e) { /* ignore */ }
    }

    attachDomObserver(attempt) {
      try {
        const sel = ['#docs-editor', '#waffle-grid-container', '.kix-appview-editor', '.docs-editor-scrollcontainer'];
        let root = null;
        for (const s of sel) { const el = $(s); if (el) { root = el; break; } }
        if (!root) root = document.body;
        this.domObserver = new MutationObserver((muts) => this.onDomMutations(muts));
        this.domObserver.observe(root, {
          subtree: true, childList: true, characterData: true, characterDataOldValue: true
        });
      } catch (e) {
        log('dom observer attach failed: ' + e);
        if (attempt < 30) setTimeout(() => this.attachDomObserver(attempt + 1), 2000);
      }
    }

    adoptOrNew() {
      try {
        const sessions = this.rec.live.sessions || [];
        const last = sessions[sessions.length - 1];
        const t = nowMs();
        if (last && last.end && t - last.end <= this.gapMs) return last;
        return {
          id: this.rec.id + ':' + t + ':' + Math.random().toString(36).slice(2, 6),
          start: t, end: t, activeMs: 0, keys: 0, edits: 0, addChars: 0, delChars: 0, pastes: []
        };
      } catch (e) {
        return { id: 's', start: nowMs(), end: nowMs(), activeMs: 0, keys: 0, edits: 0, addChars: 0, delChars: 0, pastes: [] };
      }
    }

    activity() {
      const t = nowMs();
      this.lastActivity = t;
      try {
        if (t - this.session.end > this.gapMs) {
          this.flush(); // close the stale session
          this.session = this.adoptOrNew();
        }
        this.session.end = t;
      } catch (e) { /* ignore */ }
    }

    editEvent() {
      if (this.paused) return;
      const t = nowMs();
      if (t - this.lastEditTs > this.burstGapMs) {
        this.session.edits = (this.session.edits || 0) + 1;
        this.onDirty();
      }
      this.lastEditTs = t;
    }

    onKeydown(e) {
      try {
        if (!e || e.isTrusted === false) return;
        const k = e.key;
        if (!k) return;
        const texty = k.length === 1 || k === 'Backspace' || k === 'Delete' || k === 'Enter';
        if (!texty) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        this.activity();
        this.lastLocalInput = nowMs();
        if (this.paused) return;
        this.session.keys = (this.session.keys || 0) + 1;
        this.editEvent();
      } catch (err) { /* ignore */ }
    }

    onComposition() {
      try {
        this.activity();
        this.lastLocalInput = nowMs();
        this.editEvent();
      } catch (e) { /* ignore */ }
    }

    onPaste(e) {
      try {
        this.activity();
        this.lastLocalInput = nowMs();
        if (this.paused) return;
        let chars = 0, txt = '';
        try {
          const d = e && e.clipboardData;
          txt = d && d.getData ? d.getData('text/plain') : '';
          if (txt) chars = txt.length;
        } catch (err) { chars = 0; txt = ''; }
        if (chars >= 40) {
          if (!Array.isArray(this.session.pastes)) this.session.pastes = [];
          if (this.session.pastes.length < 300) {
            // Rich LOCAL stats about the pasted block (words, paragraphs,
            // sentence length…). The text itself is never stored.
            this.session.pastes.push({ t: nowMs(), chars, via: 'paste', stats: pasteStatsFromText(txt) });
            this.onDirty();
          }
        }
        this.editEvent();
      } catch (err) { /* ignore */ }
    }

    onDomMutations(muts) {
      try {
        const win = this.domWin;
        for (const mu of muts) {
          if (mu.type === 'characterData') {
            const nv = mu.target && mu.target.nodeValue ? mu.target.nodeValue.length : 0;
            const ov = mu.oldValue ? mu.oldValue.length : 0;
            if (nv >= ov) win.added += nv - ov; else win.removed += ov - nv;
          } else if (mu.type === 'childList') {
            for (const n of mu.addedNodes) {
              const len = n && n.nodeType === 3 ? (n.nodeValue || '').length : (n && n.textContent ? Math.min(n.textContent.length, 100000) : 0);
              win.added += len;
            }
            for (const n of mu.removedNodes) {
              const len = n && n.nodeType === 3 ? (n.nodeValue || '').length : (n && n.textContent ? Math.min(n.textContent.length, 100000) : 0);
              win.removed += len;
            }
          }
        }
      } catch (e) { /* ignore */ }
    }

    processDomWindow() {
      try {
        const win = this.domWin;
        this.domWin = { added: 0, removed: 0 };
        if (this.paused) return;
        if (!this.lastLocalInput || nowMs() - this.lastLocalInput > 30000) return; // remote-only edits: not ours
        const total = win.added + win.removed;
        if (total === 0) return;
        if (win.added > 0 && win.removed > 0) {
          const diff = Math.abs(win.added - win.removed);
          if (diff <= Math.max(40, win.added * 0.12)) return; // node moves / re-layout, not writing
        }
        this.session.addChars = (this.session.addChars || 0) + Math.min(win.added, 200000);
        this.session.delChars = (this.session.delChars || 0) + Math.min(win.removed, 200000);
        if (win.added >= this.cfg.pasteThresholdChars && win.added > 3 * Math.max(1, win.removed)) {
          if (!Array.isArray(this.session.pastes)) this.session.pastes = [];
          if (this.session.pastes.length < 300) {
            this.session.pastes.push({ t: nowMs(), chars: win.added, via: 'dom' });
          }
        }
        this.activity();
        this.editEvent();
      } catch (e) { /* ignore */ }
    }

    tick() {
      try {
        if (this.paused) return;
        if (document.visibilityState !== 'visible') return;
        const t = nowMs();
        if (!this.lastActivity || t - this.lastActivity > this.idleMs) return;
        this.session.activeMs = (this.session.activeMs || 0) + 1000;
        if (this.session.activeMs % 20000 < 1000) this.onDirty();
      } catch (e) { /* ignore */ }
    }

    setPaused(p) {
      if (this.paused === !!p) return;
      this.paused = !!p;
      if (p) this.domWin = { added: 0, removed: 0 };
      log('live tracking ' + (p ? 'paused (version pane open)' : 'resumed'));
    }

    async flush() {
      try {
        if (!this.session || !this.session.id) return;
        const s = this.session;
        const meaningful = (s.keys || 0) > 0 || (s.edits || 0) > 0 || (s.activeMs || 0) > 20000 || (s.addChars || 0) > 0;
        if (!meaningful) return;
        const arr = this.rec.live.sessions;
        const i = arr.findIndex((x) => x && x.id === s.id);
        if (i >= 0) arr[i] = s; else arr.push(s);
        if (arr.length > SESSION_CAP) arr.splice(0, arr.length - SESSION_CAP);
        if (this.onSave) this.onSave();
      } catch (e) { log('flush error: ' + e); }
    }
  }

  // Save-chip / version-history-button detector. Pure so the typo that broke
  // it once (a `/s+/g` regex that stripped the letter "s" out of "All changes
  // saved in Drive" — the automation's main entry point could never match)
  // is unit-tested forever.
  const SAVE_CHIP_RE = /all changes saved|saved in drive|saved to drive|see version history|version history/i;

  function isSaveChipText(v) {
    const s = String(v || '').replace(/\s+/g, ' ').trim();
    if (!s || s.length > 80) return false;
    return SAVE_CHIP_RE.test(s);
  }

  /* =====================================================================
   * 8. Version-history pane: discovery, scraping, automation
   * ===================================================================== */

  const PANEL_SELECTORS = [
    '#docs-revisions-sidebar',
    '.docs-revisions-sidebar',
    '#docs-revisions',
    '.docs-revisions',
    'div[aria-label*="version history" i]',
    'div[role="complementary"][class*="revision" i]',
    'div[class*="revisions" i][role="complementary"]'
  ];

  function visibleEnough(el) {
    try {
      const r = el.getBoundingClientRect();
      return r.width > 120 && r.height > 140;
    } catch (e) { return false; }
  }

  function textOf(el, cap) {
    // Layout-free text read (never innerText, which forces reflow per call).
    let out = '';
    try {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let n, steps = 0;
      while ((n = walk.nextNode()) && steps++ < 500) {
        out += n.nodeValue || '';
        if (out.length > (cap || 300)) break;
      }
    } catch (e) { return ''; }
    return out.replace(/\s+/g, ' ').trim();
  }

  const DATE_CTX_RE = /(today|yesterday|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?|\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\s+ago)/i;

  // Parse one version tile's combined text. Bare clock times WITHOUT any date
  // context yield ts null (Google groups tiles under date headers, so a
  // time-only tile must never be stamped "today" — the caller supplies the
  // current date header when combining).
  function parseTileText(text) {
    const s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s || s.length > 340) return null;
    let ts = null;
    if (parseWhen(s) != null && DATE_CTX_RE.test(s)) {
      ts = parseWhen(s);
    } else {
      // Long tile: probe around the first date-ish token (time often trails).
      const m = s.match(/((?:today|yesterday)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\s+ago|\d{1,2}:\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i);
      if (m) {
        const probe = s.slice(m.index, m.index + m[0].length + 24);
        if (DATE_CTX_RE.test(probe)) ts = parseWhen(probe);
      }
    }
    let editor = null, edits = null;
    let mm;
    if ((mm = s.match(/([A-Za-z][\w.'\u2019\-]*(?:\s+[A-Za-z][\w.'\u2019\-]*){0,3})\s+made\s+(\d+)\s+edits?/))) {
      editor = mm[1].trim(); edits = parseInt(mm[2], 10);
    } else if ((mm = s.match(/edited\s+by\s+([A-Za-z][\w.'\u2019\-]*(?:\s+[A-Za-z][\w.'\u2019\-]*){0,3})/i))) {
      editor = mm[1].trim();
    }
    if (edits == null && (mm = s.match(/(\d+)\s+edits?\b/i))) edits = parseInt(mm[1], 10);
    if (editor) {
      editor = editor.replace(/^(you|yourself)$/i, 'You');
      if (editor.length > 60) editor = null;
    }
    return { ts, editor, edits, raw: s.slice(0, 80) };
  }

  // Pure date header (never a bare clock time and never "N … ago" — those are
  // real entry timestamps, not headers).
  const DATE_HEADER_RE = /\b(today|yesterday|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b/i;

  // Candidate editor names must not be dates, clock times or UI chrome.
  function looksLikeDateText(s) {
    return /\d/.test(s) || /\d{1,2}:\d{2}/.test(s) ||
      /^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i.test(s) ||
      /^(?:today|yesterday)$/i.test(s);
  }

  // Walk up from a date/time text node to the enclosing version-entry tile.
  // v2: the old "largest ancestor with ≤320 chars of text" heuristic merged
  // an entire date group into ONE tile whenever its combined text was short,
  // collapsing every contributor in the group into the first avatar and
  // emitting a single version for many distinct entries (the "shows only 1
  // contributor" bug). A tile must now stay pure: it may never contain a
  // second timestamped entry. We prefer the smallest ancestor that holds the
  // entry's avatar image, respect semantic roles, and stop at the first
  // ancestor that contains another timestamp.
  function tileForMatch(node, panel, countMap) {
    try {
      let p = node.parentElement, tile = p;
      for (let d = 0; d < 14 && p && p !== panel; d++) {
        const role = p.getAttribute ? (p.getAttribute('role') || '') : '';
        const cnt = countMap.get(p) || 0;
        if ((role === 'listitem' || role === 'option' || role === 'row') && cnt <= 3) return p;
        if (cnt > 3) break;                      // would swallow several entries
        let hasImg = false;
        try { hasImg = !!p.querySelector('img'); } catch (e) { hasImg = false; }
        if (hasImg && cnt === 1) return p;       // avatar lives here → the entry
        if (cnt > 1) break;                      // purity: never merge siblings
        if (textOf(p, 360).length > 340) break;  // huge container → stay low
        tile = p;                                // pure and short → extend
        p = p.parentElement;
      }
      if (tile === panel) tile = node.parentElement;
      return (tile && tile !== panel) ? tile : (node.parentElement || null);
    } catch (e) { return node.parentElement || null; }
  }

  // Avatar alt text → editor name. Google decorates avatars in several formats
  // ("Alice Smith", "Profile picture of Alice Smith", "Avatar image for …");
  // strip the decoration and reject chrome-y values.
  function avatarNameIn(tile) {
    try {
      for (const img of tile.querySelectorAll('img[alt]')) {
        let a = (img.getAttribute('alt') || '').trim();
        if (!a || a.length > 80) continue;
        const m = a.match(/^(?:profile\s+(?:picture|photo|image)|avatar(?:\s+image)?|image|photo|picture)\s+(?:of|for)\s+(.+)$/i);
        if (m) a = m[1].trim();
        if (!a) continue;
        if (/^(?:image|photo|avatar|icon|profile|picture|alt|logo)$/i.test(a)) continue;
        if (/\.(?:png|jpe?g|gif|svg|webp)\b/i.test(a)) continue;
        if (looksLikeDateText(a)) continue;
        if (a.length > 60) continue;
        if (/^(you|yourself)$/i.test(a)) a = 'You';
        return a;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // aria-labels on the tile or its children → editor name.
  function ariaNameIn(tile) {
    try {
      const cands = [];
      if (tile.getAttribute && tile.getAttribute('aria-label')) cands.push(tile);
      for (const el of tile.querySelectorAll('[aria-label]')) cands.push(el);
      for (const el of cands) {
        const a = el.getAttribute('aria-label') || '';
        const am = a.match(/(?:edited\s+by|avatar(?:\s+image)?(?:\s+of|\s+for)?|profile\s+(?:picture|photo|image)\s+of|image\s+of|picture\s+of)\s+(.+)/i);
        if (!am || !am[1]) continue;
        let n = am[1].trim().replace(/\s*\d{1,2}:\d{2}.*$/, '').trim();
        if (!n || n.length > 60) continue;
        if (looksLikeDateText(n)) continue;
        if (/^(you|yourself)$/i.test(n)) n = 'You';
        return n;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // Last resort: the tile's own text with times/dates/UI phrases stripped —
  // whatever short name-like span remains is the editor shown in panes that
  // render "Name" + "time" without usable avatar alt text.
  const TILE_NAME_STOP = new Set(('today yesterday version versions unnamed edited made restore revert ' +
    'name show see open close delete image photo picture avatar profile icon document file ' +
    'slide sheet form drive docs all this that the and anonymous guest user').split(' '));

  function bareNameFromText(text) {
    try {
      let s = String(text || '')
        .replace(/\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?/gi, ' ')
        .replace(/\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\s+ago/gi, ' ')
        .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?/gi, ' ')
        .replace(/\b(?:today|yesterday)\b/gi, ' ')
        .replace(/\b(?:restore\s+this\s+version|name\s+this\s+version|see\s+(?:all\s+)?(?:newer\s+)?changes?|show\s+(?:newer\s+)?changes?|made\s+\d+\s+edits?|\d+\s+edits?|unnamed\s+version|more\s+edits?)\b/gi, ' ')
        .replace(/[^\p{L}\p{N}\s'\u2019.\-]/gu, ' ')
        .replace(/\s+/g, ' ').trim();
      if (!s || s.length > 60 || /\d/.test(s)) return null;
      const words = s.split(' ');
      if (!words.length || words.length > 5) return null;
      const first = words[0].replace(/[.'\u2019-]+$/, '').toLowerCase();
      const last = words[words.length - 1].replace(/[.'\u2019-]+$/, '').toLowerCase();
      if (TILE_NAME_STOP.has(first) || TILE_NAME_STOP.has(last)) return null;
      if (/^(you|yourself)$/i.test(s)) return 'You';
      return s;
    } catch (e) { return null; }
  }

  // Pure aggregation step (no DOM — unit-tested in tools/logic-test.mjs):
  // turn scraped per-entry groups into one version entry per timestamp.
  // Date-only fragments are headers, never versions. A part without its own
  // date inherits the date header that was in effect when its group was
  // first seen (not the last header in the pane). The "made N edits" count
  // attaches to the group's first timestamp only, so a multi-timestamp entry
  // is not double counted.
  function assemblePanelVersions(groups) {
    const out = [];
    for (const g of groups) {
      try {
        if (!g || !Array.isArray(g.parts) || !g.parts.length) continue;
        const editor = g.editor || null;
        let first = true;
        for (const part of g.parts) {
          const s = String(part || '').trim();
          if (!s) continue;
          const isTimed = /\d{1,2}:\d{2}/.test(s) ||
            /\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\s+ago/i.test(s);
          if (!isTimed) continue; // date header (or label row) — not a version
          let ts = null;
          if (DATE_CTX_RE.test(s)) ts = parseWhen(s);
          if (ts == null && g.date) ts = parseWhen(g.date + ', ' + s);
          if (ts == null || isNaN(ts)) continue;
          out.push({
            ts: ts,
            editor: editor,
            edits: first ? (g.edits != null ? g.edits : null) : null,
            src: 'panel',
            raw: s.slice(0, 80)
          });
          first = false;
        }
      } catch (e) { /* per-group guard */ }
    }
    out.sort((a, b) => a.ts - b.ts);
    return out;
  }

  function scrapeVersionPanel(panel) {
    try {
      const t0 = nowMs();
      const whenRe = /\b(today|yesterday|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)|\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\s+ago)\b/i;
      // Pass 1 — every timestamp-ish text node, in document order.
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT, null);
      const matches = [];
      let node, budget = 4000;
      while ((node = walker.nextNode()) && budget-- > 0) {
        if (matches.length >= 600) break;
        if ((matches.length & 31) === 0 && nowMs() - t0 > 250) break;
        const own = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (!own || own.length > 40 || !whenRe.test(own)) continue;
        matches.push({ node: node, own: own });
      }
      // Pass 2 — how many matches live under each ancestor (purity counts).
      const countMap = new Map();
      for (const m of matches) {
        let p = m.node.parentElement;
        for (let d = 0; d < 16 && p && p !== panel; d++) {
          countMap.set(p, (countMap.get(p) || 0) + 1);
          p = p.parentElement;
        }
      }
      // Pass 3 — one group per entry tile, remembering the date header that
      // was in effect at first sight.
      const groups = [];
      const byEl = new Map();
      let curDate = '';
      for (const m of matches) {
        if (DATE_HEADER_RE.test(m.own) && !/\d{1,2}:\d{2}/.test(m.own)) curDate = m.own;
        const el = tileForMatch(m.node, panel, countMap);
        if (!el || el === panel) continue;
        let g = byEl.get(el);
        if (!g) { g = { el: el, parts: [], date: curDate }; byEl.set(el, g); groups.push(g); }
        g.parts.push(m.own);
      }
      // Pass 4 — resolve each tile's editor from its own full text, avatar
      // and aria-labels. (The old code only ever parsed the time fragments,
      // so the "X made N edits" name patterns could never fire on the real
      // pane — names depended entirely on img[alt] luck.)
      for (const g of groups) {
        if (nowMs() - t0 > 600) break;
        const full = textOf(g.el, 400);
        const parsed = parseTileText(full.slice(0, 340));
        g.edits = parsed ? parsed.edits : null;
        g.editor = parsed ? parsed.editor : null;
        if (!g.editor) g.editor = avatarNameIn(g.el);
        if (!g.editor) g.editor = ariaNameIn(g.el);
        if (!g.editor) g.editor = bareNameFromText(full);
      }
      const out = assemblePanelVersions(groups);
      // Keep the most recent 400 if a huge pane overflowed.
      return out.length > 400 ? out.slice(out.length - 400) : out;
    } catch (e) {
      log('scrape error: ' + e);
      return [];
    }
  }

  class HistoryManager {
    constructor(cfg, rec, tracker, ui, onDirty, onSave) {
      this.cfg = cfg;
      this.rec = rec;
      this.tracker = tracker;
      this.ui = ui;
      this.onDirty = onDirty || function () {};
      this.onSave = onSave || function () {};
      this.lastPanel = null;
      this.panelSeenAt = 0;
      this.watchedPanel = null;
      this.watchBody();
      window.addEventListener('message', (e) => this.onNetMessage(e));
      this.driveConfigured = false;
      this.checkDriveStatus();
    }

    async checkDriveStatus() {
      const r = await bgMsg({ type: 'drive-status' });
      if (r && r.ok && r.configured && r.hasRefresh) {
        this.driveConfigured = true;
        this.onDirty();
      }
    }

    findPanel() {
      for (const sel of PANEL_SELECTORS) {
        const els = $$(sel);
        for (const el of els) {
          if (visibleEnough(el)) return el;
        }
      }
      // aria-label fallback scan (cheap, bounded)
      try {
        for (const el of $$('div[role="complementary"]')) {
          const a = (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('aria-roledescription') || '');
          if (/version|revision/i.test(a) && visibleEnough(el)) return el;
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    watchBody() {
      const check = debounce(() => {
        try {
          if (document.hidden) return;   // never poke Docs in a background tab
          const panel = this.findPanel();
          if (panel && panel !== this.lastPanel) {
            this.lastPanel = panel;
            this.panelSeenAt = nowMs();
            this.tracker.setPaused(true);
            if (this.rec.hist.fetchedAt === 0 || nowMs() - this.rec.hist.fetchedAt > 600000) {
              this.ui.toast('Importing version history…', 2500);
            }
            this.watchPanel(panel);
            setTimeout(async () => { this.maybeAutoClosePane(await this.scrapePanel()); }, 1000);
          } else if (!panel && this.lastPanel) {
            this.lastPanel = null;
            this.tracker.setPaused(false);
            this.stopWatchPanel();
          }
        } catch (e) { log('panel watcher error: ' + e); }
      }, 600);
      try {
        const mo = new MutationObserver(() => check());
        mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
      } catch (e) { log('body observer error: ' + e); }
      // periodic re-check (cheap) for late-mounting panes
      setInterval(() => { if (!document.hidden) check(); }, 5000);
    }

    watchPanel(panel) {
      try {
        this.stopWatchPanel();
        this.panelScrapes = 0;
        this._paneSeenN = 0;
        clearTimeout(this._paneCloseTimer);
        const rescrape = debounce(() => {
          if (this.panelScrapes > 45) return;   // hard cap: never thrash the renderer
          this.panelScrapes++;
          (async () => { this.maybeAutoClosePane(await this.scrapePanel()); })();
        }, 2200);
        this.panelObserver = new MutationObserver(() => rescrape());
        this.panelObserver.observe(panel, { childList: true, subtree: true, characterData: true });
        // Lazy-load older versions by scrolling the pane — gently (a big panel
        // rendering full-speed has killed tabs before: keep steps small and slow).
        let scrolls = 0;
        this.panelScrollId = setInterval(() => {
          try {
            if (scrolls >= 14 || this.lastPanel !== panel || document.hidden) {
              clearInterval(this.panelScrollId);
              this.panelScrollId = null;
              return;
            }
            scrolls++;
            const scroller = this.findScroller(panel);
            if (scroller && scroller.scrollHeight > scroller.scrollTop + scroller.clientHeight) {
              scroller.scrollTop = Math.min(scroller.scrollHeight, scroller.scrollTop + scroller.clientHeight - 60);
            } else {
              clearInterval(this.panelScrollId);
              this.panelScrollId = null;
            }
          } catch (e) {
            clearInterval(this.panelScrollId);
            this.panelScrollId = null;
          }
        }, 1200);
      } catch (e) { log('panel observe error: ' + e); }
    }

    findScroller(panel) {
      try {
        if (panel.scrollHeight > panel.clientHeight + 40) return panel;
        for (const el of panel.querySelectorAll('*')) {
          if (el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 100) return el;
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    stopWatchPanel() {
      try { if (this.panelObserver) { this.panelObserver.disconnect(); this.panelObserver = null; } } catch (e) { /* ignore */ }
      try { if (this.panelScrollId) { clearInterval(this.panelScrollId); this.panelScrollId = null; } } catch (e) { /* ignore */ }
    }

    async scrapePanel() {
      try {
        const panel = this.findPanel();
        if (!panel) return 0;
        const versions = scrapeVersionPanel(panel);
        if (!versions.length) return 0;
        const named = versions.filter((v) => v.editor).length;
        const editors = new Set(versions.map((v) => v.editor).filter(Boolean)).size;
        this.mergeVersions(versions, 'panel');
        this.rec.hist.source = this.rec.hist.source || 'panel';
        this.rec.hist.fetchedAt = nowMs();
        this.rec.hist.importStatus = {
          at: nowMs(), ok: true, tiles: versions.length, named: named,
          editors: editors, via: this.lastPanel === panel ? 'watch' : 'manual'
        };
        this.onDirty();
        this.onSave();
        log('scraped ' + versions.length + ' version tiles (' + named + ' with names)');
        return versions.length;
      } catch (e) {
        log('scrapePanel error: ' + e);
        return 0;
      }
    }

    mergeVersions(versions, src) {
      try {
        const map = new Map();
        for (const v of this.rec.hist.versions) {
          map.set(v.ts + '|' + (v.editor || '') + '|' + (v.src || ''), v);
        }
        for (const v of versions) {
          if (!v || !v.ts) continue;
          map.set(v.ts + '|' + (v.editor || '') + '|' + (v.src || src), {
            ts: v.ts,
            editor: v.editor || null,
            edits: v.edits || null,
            size: v.size || null,
            src: v.src || src
          });
        }
        const sorted = Array.from(map.values()).sort((a, b) => a.ts - b.ts);
        const drop = sorted.length - VERSION_CAP;
        if (drop > 0) {
          this.rec.hist.versionsRollup = (this.rec.hist.versionsRollup || 0) + drop;
          sorted.splice(0, drop);
        }
        this.rec.hist.versions = sorted;
      } catch (e) { log('mergeVersions error: ' + e); }
    }

    /* ---- automation -------------------------------------------------- */

    async autoImport(auto) {
      try {
        this.rec.hist.lastAutoTry = nowMs();
        if (document.hidden) {
          // Never automate a hidden tab — Docs ignores clicks there and menus
          // misbehave. Smart imports retry once the tab becomes visible.
          if (auto) {
            document.addEventListener('visibilitychange', () => {
              if (!document.hidden) this.autoImport(auto);
            }, { once: true });
          }
          return false;
        }
        if (this.findPanel()) {
          const n = await this.scrapePanel();
          if (n) { this.ui.toast('Imported ' + n + ' version entries ✓', 3000); return true; }
        }
        const viaSave = await this.trySaveChip();
        if (viaSave) return await this.finishAutoImport(viaSave, auto);
        const viaMenu = await this.tryMenu();
        if (viaMenu) return await this.finishAutoImport(viaMenu, auto);
        const viaKey = await this.tryKeyboardShortcut();
        if (viaKey) return await this.finishAutoImport(viaKey, auto);
        // No pane entry point worked. If the Drive API tier is configured,
        // fall back to it automatically — no user action needed at all.
        if (this.driveConfigured && await this.driveSync(true)) return true;
        // Dismiss anything our attempts may have opened (stray File menu,
        // hover popups, half-opened dialogs).
        try {
          const esc = { key: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
          document.dispatchEvent(new KeyboardEvent('keydown', esc));
          document.dispatchEvent(new KeyboardEvent('keyup', esc));
        } catch (e) { /* ignore */ }
        this.rec.hist.importStatus = {
          at: nowMs(), ok: false,
          reason: this.driveConfigured
            ? 'no pane entry point found and the Drive API sync failed (see Options → Drive API for the last error)'
            : 'no entry point found — view-only doc or a changed Google UI'
        };
        if (!auto) {
          this.ui.toast(this.driveConfigured
            ? 'Could not open version history, and the Drive API sync failed too — check Options → Drive API (the last error is shown there), or open File → Version history once and I will import it automatically.'
            : 'Could not open version history automatically. Open File → Version history once (or click “All changes saved in Drive”, top-left) — I will import it automatically. View-only docs may not offer it.', 10000);
        } else {
          this.ui.toast('Tip: open File → Version history once and I will import the full timeline.', 6000);
        }
        this.onDirty();
        this.onSave();
        return false;
      } catch (e) {
        log('autoImport error: ' + e);
        return false;
      }
    }

    clickLikeUser(el) {
      // Synthetic events are untrusted, but Google menus and title-bar chips
      // respond to a realistic pointer sequence far more reliably than a
      // bare .click().
      try {
        const r = { bubbles: true, cancelable: true, view: window };
        if (typeof PointerEvent === 'function') el.dispatchEvent(new PointerEvent('pointerdown', r));
        el.dispatchEvent(new MouseEvent('mousedown', r));
        if (typeof PointerEvent === 'function') el.dispatchEvent(new PointerEvent('pointerup', r));
        el.dispatchEvent(new MouseEvent('mouseup', r));
      } catch (e) { /* ignore */ }
      try { el.click(); } catch (e) { /* ignore */ }
    }

    async trySaveChip() {
      // Edit mode: Docs shows “All changes saved in Drive” in the title bar,
      // which opens the version-history pane directly, and the top chrome
      // carries a “Version history” control with the same effect. Try both.
      try {
        const root = $('#docs-chrome') || $('#docs-header') || document.body;
        if (!root) return null;
        const cands = [];
        const seen = new Set();
        const add = (el) => { if (el && !seen.has(el)) { seen.add(el); cands.push(el); } };
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let n, steps = 0;
        while ((n = walk.nextNode()) && steps++ < 6000) {
          if (isSaveChipText(n.nodeValue)) add(n.parentElement);
        }
        for (const el of $$('[aria-label]', root)) {
          if (isSaveChipText(el.getAttribute('aria-label'))) add(el);
        }
        if (!cands.length) return null;
        for (const cand of cands.slice(0, 2)) {
          let target = cand;
          for (let i = 0; i < 4 && target; i++) {
            this.clickLikeUser(target);
            await new Promise((r) => setTimeout(r, 1100));
            const p = this.findPanel();
            if (p) return p;
            target = target.parentElement;
          }
        }
        return null;
      } catch (e) {
        log('save chip click failed: ' + e);
        return null;
      }
    }

    async finishAutoImport(panelFound, auto) {
      try {
        let n = 0;
        for (let i = 0; i < 8 && n === 0; i++) {
          n = await this.scrapePanel();
          if (!n) await new Promise((r) => setTimeout(r, 700));
        }
        if (n) {
          const named = (this.rec.hist.importStatus && this.rec.hist.importStatus.named) || 0;
          this.ui.toast(named
            ? 'Imported ' + n + ' version entries ✓'
            : 'Imported ' + n + ' version entries — editor names not recognized; contributors may undercount', 4500);
        } else {
          this.rec.hist.importStatus = { at: nowMs(), ok: false, reason: 'panel opened but no version tiles recognized' };
          this.ui.toast('Version history opened, but no entries recognized yet — they may still be loading.', 5000);
        }
        await this.closePanel();
        this.onDirty();
        this.onSave();
        return true;
      } catch (e) {
        log('finishAutoImport error: ' + e);
        return false;
      }
    }

    tryKeyboardShortcut() {
      return new Promise((resolve) => {
        try {
          const isMac = /Mac/i.test(navigator.platform || navigator.userAgent || '');
          const opts = {
            key: 'h', code: 'KeyH', keyCode: 72, which: 72,
            ctrlKey: !isMac, metaKey: isMac, altKey: true, shiftKey: true,
            bubbles: true, cancelable: true
          };
          document.dispatchEvent(new KeyboardEvent('keydown', opts));
          document.dispatchEvent(new KeyboardEvent('keyup', opts));
        } catch (e) { log('key dispatch failed: ' + e); }
        setTimeout(() => resolve(this.findPanel()), 1600);
      });
    }

    tryMenu() {
      return new Promise((resolve) => {
        (async () => {
          try {
            const fileMenu = $('#docs-file-menu') ||
              $$('div[aria-label="File"], div[aria-label*="File" i]').find((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && r.top < 400;
              });
            if (!fileMenu) return resolve(null);
            this.clickLikeUser(fileMenu);
            await new Promise((r) => setTimeout(r, 500));
            const items = () => $$('[role="menuitem"], [class*="menuitem"]');
            const itemText = (el) => ((el.getAttribute && el.getAttribute('aria-label')) || el.textContent || '');
            // Some layouts expose the pane item directly in the File menu.
            let item = items().find((el) => /see version history|see revision history/i.test(itemText(el)));
            if (item) {
              this.clickLikeUser(item);
              await new Promise((r) => setTimeout(r, 1800));
              return resolve(this.findPanel());
            }
            // Standard layout: File → Version history → See version history.
            item = items().find((el) => /version history|revision history/i.test(itemText(el)));
            if (item) {
              this.clickLikeUser(item);
              try {
                item.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              } catch (e) { /* ignore */ }
              await new Promise((r) => setTimeout(r, 500));
              const sub = items().find((el) => /see version history|see revision history/i.test(itemText(el)));
              if (sub) {
                this.clickLikeUser(sub);
                await new Promise((r) => setTimeout(r, 1800));
                return resolve(this.findPanel());
              }
            }
            resolve(null);
          } catch (e) {
            log('menu automation error: ' + e);
            resolve(null);
          }
        })();
      });
    }

    async closePanel() {
      try {
        const esc = { key: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
        document.dispatchEvent(new KeyboardEvent('keydown', esc));
        document.dispatchEvent(new KeyboardEvent('keyup', esc));
        await new Promise((r) => setTimeout(r, 300));
        let panel = this.findPanel();
        if (!panel) return true;
        const btn = $$('[aria-label*="Close" i]', panel)[0] ||
          $$('button, [role="button"]', panel).find((el) => /close|dismiss/i.test(el.getAttribute('aria-label') || ''));
        if (btn) {
          btn.click();
          await new Promise((r) => setTimeout(r, 300));
          panel = this.findPanel();
          if (!panel) return true;
        }
        this.ui.toast('You can close the version history pane with Esc.', 5000);
        return false;
      } catch (e) {
        log('closePanel error: ' + e);
        return false;
      }
    }

    /* Auto-close the history pane once the import has settled, so the screen
     * returns to just the banner (setting: autoCloseHistoryPane). The timer
     * restarts on every scrape that finds NEW entries — lazy-loading older
     * versions keeps the pane open until it quiets down — and never races the
     * automation flow, which closes the pane itself. */
    maybeAutoClosePane(n) {
      try {
        if (!this.cfg.autoCloseHistoryPane) return;
        if (!(n > 0) || !(n > (this._paneSeenN || 0))) return;
        // automation opened this pane (recent attempt) — it closes it itself
        if (nowMs() - (this.rec.hist.lastAutoTry || 0) < 20000) return;
        this._paneSeenN = n;
        clearTimeout(this._paneCloseTimer);
        this._paneCloseTimer = setTimeout(async () => {
          try {
            if (!this.findPanel()) return;
            const closed = await this.closePanel();
            if (closed) {
              const isMac = /Mac/i.test(navigator.platform || navigator.userAgent || '');
              this.ui.toast('History pane closed after import ✓ — reopen any time with ' +
                (isMac ? '⌘' : 'Ctrl') + '+Alt+Shift+H to browse.', 4200);
            }
          } catch (e) { /* ignore */ }
        }, 5000);
      } catch (e) { log('auto-close pane error: ' + e); }
    }

    /* ---- Drive API (optional tier) ------------------------------------ */

    async driveSync(silent) {
      const r = await bgMsg({ type: 'drive-sync', fileId: this.rec.id });
      if (r && r.ok && Array.isArray(r.versions)) {
        this.mergeVersions(r.versions.map((v) => Object.assign({}, v, { src: 'drive' })), 'drive');
        this.rec.hist.fetchedAt = nowMs();
        this.onDirty();
        this.onSave();
        this.ui.toast('Drive API: merged ' + r.versions.length + ' revisions ✓', 4000);
        return true;
      }
      // silent: called as the autoImport fallback — the import toast
      // covers the failure; no need for two toasts.
      if (!silent) this.ui.toast('Drive API sync failed: ' + ((r && r.error) || 'not configured'), 5000);
      return false;
    }

    /* ---- MAIN-world network captures (experimental tier) --------------- */

    onNetMessage(e) {
      try {
        const d = e && e.data;
        if (!d || d.source !== 'revbanner-net' || !d.payload) return;
        const payload = d.payload;
        if (!payload || typeof payload.text !== 'string') return;
        const ops = parseNetworkHistory(payload.text);
        if (!ops) return;
        const omap = new Map();
        for (const o of this.rec.hist.ops) omap.set(o.ts, o);
        for (const o of ops) omap.set(o.ts, { ts: o.ts });
        const sorted = Array.from(omap.values()).sort((a, b) => a.ts - b.ts);
        const drop = sorted.length - OPS_CAP;
        if (drop > 0) {
          this.rec.hist.opsRollup = (this.rec.hist.opsRollup || 0) + drop;
          sorted.splice(0, drop);
        }
        this.rec.hist.ops = sorted;
        this.rec.hist.netAt = nowMs();
        log('net capture parsed: +' + ops.length + ' op timestamps (total ' + sorted.length + ')');
        this.onDirty();
      } catch (err) { log('net message error: ' + err); }
    }
  }

  function parseNetworkHistory(text) {
    try {
      let s = String(text || '').trim();
      if (!s) return null;
      let first = Infinity;
      const ib = s.indexOf('['), io = s.indexOf('{');
      if (ib >= 0) first = Math.min(first, ib);
      if (io >= 0) first = Math.min(first, io);
      if (first === Infinity || first > 0) {
        if (first === Infinity) return null;
        s = s.slice(first);
      }
      let data;
      try { data = JSON.parse(s); } catch (e) { return null; }
      const tsOut = [];
      const seen = new Set();
      const LO = 1100000000000; // ~2005 in ms
      const HI = nowMs() + 400 * 86400000;
      let budget = 150000;
      const walk = (node, depth) => {
        if (budget <= 0 || depth > 12) return;
        if (Array.isArray(node)) {
          if (node.length > 0 && typeof node[0] === 'number') {
            const v = node[0];
            if (v >= LO && v < HI) push(v);
            else if (v >= LO / 1000 && v < HI / 1000) push(v * 1000);
          }
          for (let i = 0; i < node.length && budget > 0; i++) { budget--; walk(node[i], depth + 1); }
        } else if (node && typeof node === 'object') {
          for (const k of Object.keys(node)) {
            if (budget <= 0) return;
            budget--;
            const v = node[k];
            if (typeof v === 'number') {
              if (v >= LO && v < HI) push(v);
              else if (v >= LO / 1000 && v < HI / 1000) push(v * 1000);
            } else if (v && typeof v === 'object') {
              walk(v, depth + 1);
            }
          }
        }
        function push(x) {
          const p = Math.round(x / 1000); // 1s bucket dedupe
          if (seen.has(p)) return;
          seen.add(p);
          tsOut.push({ ts: p * 1000 });
        }
      };
      walk(data, 0);
      if (tsOut.length < 3) return null;
      tsOut.sort((a, b) => a.ts - b.ts);
      return tsOut.slice(0, OPS_CAP);
    } catch (e) {
      return null;
    }
  }

  /* =====================================================================
   * 9. Stats: merge every source into at-a-glance numbers
   * ===================================================================== */

  function ymdKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function computeStats(rec, cfg) {
    const stats = {
      edits: { value: 0, source: 'none', label: 'no data yet' },
      activeMs: 0, sessions: 0, contributors: [], contributorsCount: 0,
      pastes: [], bulk: [], bulkChars: 0,
      earliest: null, latest: null, daily: new Map(), activeDays: 0,
      score: { value: null, parts: [] },
      provenance: { live: null, panel: null, net: null, drive: null },
      liveOnly: false, empty: true,
      liveSession: null
    };
    try {
      const t = nowMs();
      const live = (rec.live && Array.isArray(rec.live.sessions)) ? rec.live.sessions.filter(Boolean) : [];
      const roll = (rec.live && rec.live.rollup) || {};
      const versions = (rec.hist && Array.isArray(rec.hist.versions)) ? rec.hist.versions.slice().filter((v) => v && v.ts) : [];
      const ops = (rec.hist && Array.isArray(rec.hist.ops)) ? rec.hist.ops.slice().filter((o) => o && o.ts) : [];
      versions.sort((a, b) => a.ts - b.ts);
      ops.sort((a, b) => a.ts - b.ts);

      const liveEdits = live.reduce((n, s) => n + (s.edits || 0), 0) + (roll.edits || 0);
      const liveKeys = live.reduce((n, s) => n + (s.keys || 0), 0) + (roll.keys || 0);
      const activeMs = live.reduce((n, s) => n + (s.activeMs || 0), 0) + (roll.activeMs || 0);
      stats.activeMs = activeMs;
      const addChars = live.reduce((n, s) => n + (s.addChars || 0), 0) + (roll.addChars || 0);
      const delChars = live.reduce((n, s) => n + (s.delChars || 0), 0) + (roll.delChars || 0);

      const pastes = [];
      for (const s of live) for (const p of (s.pastes || [])) pastes.push(p);
      pastes.sort((a, b) => a.t - b.t);
      stats.pastes = pastes.slice(-400);
      const thresh = cfg.pasteThresholdChars || DEFAULTS.pasteThresholdChars;
      stats.bulk = pastes.filter((p) => (p.chars || 0) >= thresh).slice(-200);
      stats.bulkChars = stats.bulk.reduce((n, p) => n + (p.chars || 0), 0) + (roll.bulkChars || 0);

      // Typed vs pasted: a paste keeps lastLocalInput fresh, so its DOM delta
      // is already counted inside addChars — the pasted share is therefore
      // bulkChars / addChars, clamped (never (addChars+bulkChars), which
      // double-counts and understates pasting).
      stats.pastedShare = addChars > 0 ? clamp(stats.bulkChars / Math.max(1, addChars), 0, 1) : null;
      stats.words = rec.words || null;

      const versionEdits = versions.reduce((n, v) => n + (v.edits || 0), 0);
      const netOps = ops.length + (rec.hist && rec.hist.opsRollup || 0);

      // ---- edits headline number, with honest provenance
      let value, source, label;
      if (netOps >= 6) {
        value = netOps; source = 'net'; label = 'detailed ops (experimental)';
      } else if (versions.length) {
        value = Math.max(versionEdits, versions.length + (rec.hist.versionsRollup || 0), liveEdits);
        source = 'panel';
        label = (liveEdits > 0 && liveEdits === value) ? 'live bursts (highest available)'
          : (versionEdits > versions.length ? 'versions + edit counts' : 'versions (≈ edits)');
      } else if (liveEdits > 0) {
        value = liveEdits; source = 'live'; label = 'live tracking (since install)';
      } else {
        value = 0; source = 'none'; label = 'no data yet';
      }
      stats.edits = { value, source, label };

      // ---- sessions: cluster all activity marks
      const gapMs = Math.max(5, cfg.sessionGapMinutes) * 60000;
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
      const liveSessionsCount = live.length + (roll.sessions || 0);
      stats.sessions = Math.max(clusters, liveSessionsCount);

      // ---- history-derived work sessions + ESTIMATED active time
      // Google checkpoints a doc roughly every few minutes of editing (and once
      // more when work stops), so clustering version/network timestamps yields
      // the doc's work sessions, and each cluster span approximates its active
      // time. This is what makes the Active card meaningful when VIEWING
      // another account's doc (teacher view), where live tracking sees nothing.
      // It is an estimate: span with a 5-minute floor per session — a
      // lower-bound approximation, not a keystroke measurement. Live tracking
      // stays the exact source when it exists.
      const hMarkSet = new Set();
      for (const v of versions) hMarkSet.add(Math.round(v.ts / 60000));
      for (const o of ops) hMarkSet.add(Math.round(o.ts / 60000));
      const hMarks = Array.from(hMarkSet).map((m) => m * 60000).sort((a, b) => a - b);
      const histSess = [];
      let hCur = null;
      for (const m of hMarks) {
        if (hCur && m - hCur.end <= gapMs) { hCur.end = m; hCur.n++; }
        else { if (hCur) histSess.push(hCur); hCur = { start: m, end: m, n: 1 }; }
      }
      if (hCur) histSess.push(hCur);
      const histActiveMs = histSess.reduce((n, c) => n + Math.max(c.end - c.start, 5 * 60000), 0);
      stats.histSessions = histSess;
      stats.histActiveMs = histActiveMs;
      if (histActiveMs > activeMs) {
        stats.activeMs = histActiveMs;
        stats.activeSource = 'history';
        stats.activeLabel = 'estimated from version timestamps';
      } else {
        stats.activeSource = activeMs > 0 ? 'live' : 'none';
        stats.activeLabel = activeMs > 0 ? 'live tracking (since install)' : 'no active-time data';
      }

      // ---- contributors
      const contrib = new Map();
      for (const v of versions) {
        if (!v.editor) continue;
        const c = contrib.get(v.editor) || { name: v.editor, versions: 0, edits: 0 };
        c.versions++;
        c.edits += v.edits || 0;
        contrib.set(v.editor, c);
      }
      const me = rec.account || 'You';
      // Only count the local viewer when this machine actually recorded their
      // edits. Counting `rec.account` unconditionally made anyone who merely
      // OPENED the doc (teacher view) a "contributor", which masked the
      // missing version-history names behind a constant "1".
      if (liveEdits > 0) {
        const c = contrib.get(me) || { name: me, versions: 0, edits: 0 };
        c.edits += liveEdits;
        contrib.set(me, c);
      }
      stats.contributors = Array.from(contrib.values()).sort((a, b) => (b.versions + b.edits) - (a.versions + a.edits));
      stats.contributorsCount = stats.contributors.length;

      // ---- daily edit counts (avoid double counting same day across sources)
      const liveDaily = new Map(), vDaily = new Map(), oDaily = new Map();
      for (const s of live) {
        if (!s.start) continue;
        const k = ymdKey(s.start);
        liveDaily.set(k, Math.max(liveDaily.get(k) || 0, s.edits || 0));
      }
      for (const v of versions) {
        const k = ymdKey(v.ts);
        vDaily.set(k, (vDaily.get(k) || 0) + (v.edits || 1));
      }
      for (const o of ops) {
        const k = ymdKey(o.ts);
        oDaily.set(k, (oDaily.get(k) || 0) + 1);
      }
      const dayKeys = new Set([].concat(Array.from(liveDaily.keys()), Array.from(vDaily.keys()), Array.from(oDaily.keys())));
      for (const k of dayKeys) {
        stats.daily.set(k, Math.max(liveDaily.get(k) || 0, vDaily.get(k) || 0, oDaily.get(k) || 0));
      }
      stats.activeDays = 0;
      for (const v of stats.daily.values()) if (v > 0) stats.activeDays++;

      // ---- earliest / latest
      const candidates = [versions[0] && versions[0].ts, ops[0] && ops[0].ts, live[0] && live[0].start, roll.firstTs]
        .filter((x) => x > 0);
      stats.earliest = candidates.length ? Math.min.apply(null, candidates) : null;
      const latestC = [versions[versions.length - 1] && versions[versions.length - 1].ts,
        ops[ops.length - 1] && ops[ops.length - 1].ts, live[live.length - 1] && live[live.length - 1].end]
        .filter((x) => x > 0);
      stats.latest = latestC.length ? Math.max.apply(null, latestC) : null;

      // ---- provenance chips
      stats.provenance.live = {
        since: rec.firstSeen, sessions: liveSessionsCount, edits: liveEdits,
        activeMs, keys: liveKeys, addChars, delChars,
        aggregatedSessions: roll.sessions || 0
      };
      const panelVersions = versions.filter((v) => v.src === 'panel');
      if (panelVersions.length) {
        stats.provenance.panel = {
          count: panelVersions.length,
          versionEdits: panelVersions.reduce((n, v) => n + (v.edits || 0), 0),
          fetchedAt: rec.hist.fetchedAt || rec.hist.netAt || 0
        };
      }
      const driveVersions = versions.filter((v) => v.src === 'drive');
      if (driveVersions.length) {
        stats.provenance.drive = { count: driveVersions.length, fetchedAt: rec.hist.fetchedAt || 0 };
      }
      if (netOps > 0) stats.provenance.net = { count: netOps };

      stats.liveOnly = !panelVersions.length && !driveVersions.length && !netOps;
      stats.empty = stats.edits.value === 0 && live.length === 0 && versions.length === 0;

      // ---- writing-process score (heuristic, transparent)
      const parts = [];
      const addPart = (label, q, weight, detail) => {
        if (q == null || isNaN(q)) return;
        parts.push({ label, q: clamp(q, 0, 1), weight, detail });
      };
      if (addChars + stats.bulkChars > 0) {
        const r = clamp(stats.bulkChars / Math.max(1, addChars), 0, 1);
        const q = r <= 0.05 ? 1 : (r >= 0.6 ? 0 : 1 - (r - 0.05) / 0.55);
        addPart('Paste ratio', q, 0.35, Math.round(r * 100) + '% of added text came from bulk inserts');
      }
      if (value > 0) {
        addPart('Work sessions', Math.min(1, stats.sessions / 6), 0.25, stats.sessions + ' session' + (stats.sessions === 1 ? '' : 's') + ' detected');
      }
      if (value > 0 || stats.activeDays > 0) {
        addPart('Spread over days', Math.min(1, stats.activeDays / 5), 0.2, stats.activeDays + ' active day' + (stats.activeDays === 1 ? '' : 's'));
      }
      if (value > 0) {
        const bulkCount = stats.bulk.length + (roll.bulkCount || 0);
        const rate = bulkCount / Math.max(1, value);
        const q = bulkCount === 0 ? 1 : (rate < 0.02 ? 1 : clamp(1 - (rate - 0.02) / 0.1, 0, 1));
        addPart('Burst pattern', q, 0.2, bulkCount + ' bulk insertion' + (bulkCount === 1 ? '' : 's') + ' vs ' + value + ' edits');
      }
      stats.score.parts = parts;
      if (parts.length) {
        const wsum = parts.reduce((n, p) => n + p.weight, 0);
        stats.score.value = Math.round(100 * parts.reduce((n, p) => n + p.q * p.weight, 0) / wsum);
      }
      return stats;
    } catch (e) {
      log('computeStats error: ' + e);
      return stats;
    }
  }

  /* =====================================================================
   * 9b. Insight engine — evidence-backed "suspicious edit" signals.
   * Pure (no DOM): every signal carries concrete numbers a teacher can verify
   * against the raw tables in the same details panel. Works from live
   * sessions when present, from imported-history sessions otherwise, so
   * teacher-view of a student doc still gets session-based signals.
   * ===================================================================== */

  const SEV_ORDER = { high: 0, warn: 1, note: 2, good: 3, info: 4 };

  function computeInsights(stats, rec, cfg) {
    const out = [];
    try {
      if (!stats || !rec) return out;
      const live = (rec.live && Array.isArray(rec.live.sessions)) ? rec.live.sessions.filter(Boolean) : [];
      const roll = (rec.live && rec.live.rollup) || {};
      const bulk = (stats.bulk || []).slice();
      const addChars = live.reduce((n, s) => n + (s.addChars || 0), 0) + (roll.addChars || 0);
      const liveEdits = live.reduce((n, s) => n + (s.edits || 0), 0) + (roll.edits || 0);
      const thresh = (cfg && cfg.pasteThresholdChars) || DEFAULTS.pasteThresholdChars;
      const hasLive = live.length > 0 && (addChars > 0 || liveEdits > 0);
      const hist = stats.histSessions || [];
      const sess = hasLive
        ? live
        : hist.map((c) => ({ start: c.start, end: c.end, activeMs: Math.max(c.end - c.start, 300000), edits: c.n || 0, addChars: 0, delChars: 0, pastes: [] }));
      const totalActive = sess.reduce((n, s) => n + (s.activeMs || 0), 0);
      const totalAdd = sess.reduce((n, s) => n + (s.addChars || 0), 0);
      const totalN = sess.reduce((n, s) => n + (s.edits || 0), 0);

      // 1) Pasted share of everything typed into this document (this browser).
      if (stats.pastedShare != null && addChars > 400) {
        const pct = Math.round(stats.pastedShare * 100);
        if (pct >= 10) {
          const top = bulk.slice().sort((a, b) => (b.chars || 0) - (a.chars || 0)).slice(0, 3);
          out.push({
            id: 'pasted-share',
            title: pct >= 60 ? 'Most of the text arrived by paste' : pct >= 25 ? 'A large share of the text arrived by paste' : 'Some pasted content',
            severity: pct >= 60 ? 'high' : (pct >= 25 ? 'warn' : 'note'),
            summary: pct + '% of the ' + fmtNum(addChars) + ' characters added in this browser came from ' +
              bulk.length + ' bulk insertion' + (bulk.length === 1 ? '' : 's') + ' of ' + thresh + '+ characters.',
            evidence: top.map((p) => fmtDate(p.t) + ' — ' + fmtNum(p.chars) + ' chars' +
              (p.stats ? ' · ' + fmtNum(p.stats.words) + ' words · ' + p.stats.paras + ' paragraph' + (p.stats.paras === 1 ? '' : 's') : ''))
          });
        }
      }

      // 2) Structured paste: final-quality formatting arrived in one block.
      for (const p of bulk) {
        const st = p && p.stats;
        if (!st || !st.words || st.words < 80) continue;
        if ((st.paras >= 3 || st.bullets >= 4) &&
            (st.avgSentLen >= 18 || st.bullets >= 4 || st.links >= 2 || st.smartQuotes >= 3)) {
          out.push({
            id: 'structured-paste',
            title: 'Fully-formed text landed in one block',
            severity: 'warn',
            summary: 'One insertion brought ' + fmtNum(st.words) + ' words across ' + st.paras + ' paragraph' + (st.paras === 1 ? '' : 's') +
              (st.bullets ? ', ' + st.bullets + ' list item' + (st.bullets === 1 ? '' : 's') : '') +
              ' (average sentence: ' + st.avgSentLen + ' words). Multi-paragraph, polished structure usually emerges from typing across many edits — not from one insertion.',
            evidence: [fmtDate(p.t) + ' — ' + fmtNum(p.chars) + ' chars' +
              (st.links ? ' · ' + st.links + ' link' + (st.links === 1 ? '' : 's') : '') +
              (st.smartQuotes ? ' · ' + st.smartQuotes + ' typographic quote marks' : '') +
              (st.emDashes ? ' · ' + st.emDashes + ' em/en dashes' : '')]
          });
          break;
        }
      }

      // 3) Single-session dominance.
      const domVal = hasLive ? totalAdd : totalN;
      if (domVal > 0 && sess.length >= 2 && (hasLive ? totalAdd >= 800 : totalN >= 10)) {
        let topS = null, topV = 0;
        for (const s of sess) {
          const v = hasLive ? (s.addChars || 0) : (s.edits || 0);
          if (v > topV) { topV = v; topS = s; }
        }
        const share = topV / domVal;
        if (share >= 0.6) {
          out.push({
            id: 'session-dominance',
            title: Math.round(share * 100) + '% of the document came from one session',
            severity: share >= 0.8 ? 'warn' : 'note',
            summary: 'One working session (' + fmtDate(topS.start) + ', ' + fmtDur(topS.activeMs) + ' active) produced ' +
              (hasLive ? fmtNum(topV) + ' of ' + fmtNum(domVal) + ' characters' : topV + ' of ' + domVal + ' checkpoints') +
              '. The other ' + (sess.length - 1) + ' session' + (sess.length === 2 ? '' : 's') + ' contributed the rest.',
            evidence: []
          });
        }
      }

      // 4) Compressed timeline: everything in one or two short sittings.
      if (sess.length >= 1 && sess.length <= 2 && totalActive >= 10 * 60000 && totalActive <= 4 * 3600000 &&
          (hasLive ? totalAdd >= 1000 : totalN >= 8)) {
        out.push({
          id: 'compressed-timeline',
          title: 'The whole document was made in ' + (sess.length === 1 ? 'one sitting' : 'two sittings'),
          severity: totalActive < 90 * 60000 ? 'warn' : 'note',
          summary: 'Only ' + sess.length + ' session' + (sess.length === 1 ? '' : 's') + ' (' + fmtDur(totalActive) +
            ' active total, ' + (stats.activeDays || 1) + ' active day' + (stats.activeDays === 1 ? '' : 's') +
            ') produced the entire document. Original essays usually accumulate across more sessions.',
          evidence: sess.map((s) => fmtDate(s.start) + ' — ' + fmtDur(s.activeMs) + ' active')
        });
      }

      // 5) Overnight editing.
      const night = sess.filter((s) => { const h = new Date(s.start).getHours(); return h < 5 && (s.activeMs || 0) > 5 * 60000; });
      if (night.length) {
        out.push({
          id: 'overnight',
          title: 'Editing in the small hours',
          severity: 'note',
          summary: night.length + ' session' + (night.length === 1 ? '' : 's') + ' started between midnight and 5 a.m. — unusual hours for classwork, sometimes fully legitimate.',
          evidence: night.map((s) => fmtDate(s.start) + ' — ' + fmtDur(s.activeMs) + ' active')
        });
      }

      // 6) Silence, then a dump (live data only — needs insertion sizes).
      if (hasLive && sess.length >= 2) {
        const sorted = sess.slice().sort((a, b) => (a.start || 0) - (b.start || 0));
        for (let i = 1; i < sorted.length; i++) {
          const gap = (sorted[i].start || 0) - (sorted[i - 1].end || sorted[i - 1].start || 0);
          const added = sorted[i].addChars || 0;
          if (gap >= 48 * 3600000 && added >= thresh) {
            out.push({
              id: 'silence-then-dump',
              title: 'Long silence, then a single large insertion',
              severity: 'warn',
              summary: 'After a ' + Math.round(gap / 86400000) + '-day gap with no recorded work, ' + fmtNum(added) +
                ' characters appeared in one session (' + fmtDate(sorted[i].start) + '). Text that shows up all at once after silence often came from another source.',
              evidence: ['Gap: ' + fmtDate(sorted[i - 1].end || sorted[i - 1].start) + ' → ' + fmtDate(sorted[i].start) +
                ' · insertion: ' + fmtNum(added) + ' chars']
            });
            break;
          }
        }
      }

      // 7) Rewrite by replacement.
      const replaceSess = live.filter((s) => (s.delChars || 0) >= 300 &&
        (s.pastes || []).some((p) => (p.chars || 0) >= thresh));
      if (replaceSess.length) {
        out.push({
          id: 'rewrite-replacement',
          title: 'Large deletions paired with large pastes',
          severity: replaceSess.length >= 2 ? 'warn' : 'note',
          summary: replaceSess.length + ' session' + (replaceSess.length === 1 ? '' : 's') +
            ' deleted hundreds of characters and then inserted a large block — a pattern that looks more like replacing text with an external draft than revising it.',
          evidence: replaceSess.slice(-3).map((s) => fmtDate(s.start) + ' — −' + fmtNum(s.delChars) + ' chars deleted, ' +
            fmtNum(Math.max.apply(null, (s.pastes || []).map((p) => p.chars || 0))) + ' chars pasted')
        });
      }

      // 8) Low revision density: text arrived with almost no micro-edits.
      if (hasLive && addChars >= 1500 && liveEdits > 0 && liveEdits < addChars / 400) {
        out.push({
          id: 'low-revision-density',
          title: 'Very few edits for the amount of text',
          severity: 'warn',
          summary: fmtNum(addChars) + ' characters were added with only ' + liveEdits + ' edit burst' + (liveEdits === 1 ? '' : 's') +
            ' (≈1 edit per ' + fmtNum(Math.round(addChars / Math.max(1, liveEdits))) +
            ' chars). Typed text normally generates many small edits; fully-formed text does not.',
          evidence: []
        });
      }

      // 9) Deadline rush: nearly everything landed at the very end.
      if (sess.length >= 2) {
        const sorted = sess.slice().sort((a, b) => ((a.end || a.start || 0) - (b.end || b.start || 0)));
        const last = sorted[sorted.length - 1];
        const prev = sorted[sorted.length - 2];
        const now = nowMs();
        const lastV = hasLive ? (last.addChars || 0) : (last.edits || 0);
        const totalV = hasLive ? totalAdd : totalN;
        const gap = (last.start || 0) - (prev.end || prev.start || 0);
        if (now - (last.end || last.start || 0) < 24 * 3600000 && gap >= 3 * 86400000 &&
            totalV > 0 && lastV >= Math.max(500, 0.25 * totalV)) {
          out.push({
            id: 'deadline-rush',
            title: 'Most of the document landed at the last minute',
            severity: 'warn',
            summary: 'After a ' + Math.round(gap / 86400000) + '-day silence, ' +
              (hasLive ? fmtNum(lastV) + ' of ' + fmtNum(totalV) + ' characters' : lastV + ' of ' + totalV + ' checkpoints') +
              ' (' + Math.round(100 * lastV / totalV) + '%) arrived in the final session — ' + fmtDate(last.start) +
              ' — less than a day before the document was last opened.',
            evidence: []
          });
        }
      }

      // 10) Improbable sustained typing speed (live data only).
      for (const s of live) {
        const mins = (s.activeMs || 0) / 60000;
        const cpm = mins >= 3 ? (s.addChars || 0) / mins : 0;
        if (cpm >= 300 && (s.addChars || 0) >= 800) {
          const explained = (s.pastes || []).some((p) => (p.chars || 0) >= thresh);
          out.push({
            id: 'speed-burst',
            title: 'Text appeared faster than plausible typing',
            severity: explained ? 'note' : 'warn',
            summary: 'The session on ' + fmtDate(s.start) + ' averaged ≈' + Math.round(cpm) +
              ' characters per active minute over ' + fmtDur(s.activeMs) + '. Sustained human typing is roughly 40–120 chars/min; ≈' +
              Math.round(cpm) + ' suggests the text was pasted or inserted pre-composed' +
              (explained ? ' — and a paste in this session accounts for it.' : ' — with no paste recorded in this browser for it.'),
            evidence: []
          });
          break;
        }
      }

      // 11) Good spread — the honest-process signal deserves showing too.
      if ((stats.activeDays || 0) >= 5 && bulk.length === 0 && (hasLive ? liveEdits >= 30 : totalN >= 30)) {
        out.push({
          id: 'good-spread',
          title: 'Consistent, sustained drafting',
          severity: 'good',
          summary: (stats.activeDays) + ' active days, ' + sess.length + ' sessions, ' + fmtNum(liveEdits || totalN) +
            ' edits and no bulk insertions of ' + thresh + '+ chars — the pattern typical of original writing over time.',
          evidence: []
        });
      }

      out.sort((a, b) => (SEV_ORDER[a.severity] || 9) - (SEV_ORDER[b.severity] || 9));
    } catch (e) {
      log('computeInsights error: ' + e);
    }
    return out;
  }

  // Compact, text-free payload for the optional AI tier. Built from the
  // merged stats and the local signals; nothing here contains document text.
  function buildAiPayload(stats, insights, rec) {
    try {
      const bulk = (stats.bulk || []).slice(-8).map((p) => ({
        when: new Date(p.t).toISOString(),
        chars: p.chars || 0,
        words: p.stats ? p.stats.words : null,
        paragraphs: p.stats ? p.stats.paras : null,
        listItems: p.stats ? p.stats.bullets : null,
        avgSentenceWords: p.stats ? p.stats.avgSentLen : null
      }));
      return {
        kind: 'revbanner-process-metadata',
        note: 'Metadata only — document text is never included.',
        doc: { app: rec.app || null, title: rec.title || null },
        score: stats.score.value != null ? stats.score.value : null,
        scoreFactors: (stats.score.parts || []).map((p) => ({
          label: p.label, qualityPct: Math.round(p.q * 100), weight: p.weight, evidence: p.detail
        })),
        edits: { value: stats.edits ? stats.edits.value : 0, source: stats.edits ? stats.edits.label : null },
        activeMs: stats.activeMs || 0,
        activeSource: stats.activeLabel || null,
        sessions: stats.sessions || 0,
        activeDays: stats.activeDays || 0,
        contributors: stats.contributorsCount || 0,
        approxWords: stats.words || null,
        pastedSharePct: stats.pastedShare != null ? Math.round(stats.pastedShare * 100) : null,
        bulkInsertions: bulk,
        dailyEdits: Array.from(stats.daily && stats.daily.entries ? stats.daily.entries() : []).slice(-30),
        signals: (insights || []).map((s) => ({ id: s.id, severity: s.severity, summary: s.summary }))
      };
    } catch (e) {
      log('buildAiPayload error: ' + e);
      return { kind: 'revbanner-process-metadata', error: 'payload build failed' };
    }
  }

  /* =====================================================================
   * 10. Page offset engine — measure, escalate, fall back to overlay
   * ===================================================================== */

  class OffsetEngine {
    constructor(app, cfg, ui) {
      this.app = app;
      this.ui = ui;
      this.forcedOverlay = (cfg.pushMode === 'overlay') ||
        app === 'drive' || app === 'forms' || app === 'drawings';
      this.mode = this.forcedOverlay ? 'overlay' : 'push';
      this.level = 0;
      this.H = 0;
      this.checkTimer = 0;
      try { window.addEventListener('resize', () => this.scheduleCheck(250)); } catch (e) { /* ignore */ }
    }

    setHeight(px) {
      this.H = px;
      try { document.documentElement.style.setProperty('--revbanner-h', px + 'px'); } catch (e) { /* ignore */ }
      try {
        document.body.setAttribute('data-revbanner-mode', this.mode);
      } catch (e) { /* ignore */ }
      this.scheduleCheck(160);
    }

    setMode(mode, reason) {
      if (this.mode === mode) return;
      this.mode = mode;
      this.level = 0;
      try {
        document.body.removeAttribute('data-revbanner-fix');
        document.body.setAttribute('data-revbanner-mode', mode);
      } catch (e) { /* ignore */ }
      if (mode === 'overlay' && this.ui) {
        // switch the banner itself to its compact overlay layout (cards hidden)
        try { this.ui.setOverlayMode(true); } catch (e) { /* ignore */ }
        if (reason) this.ui.toast('Overlay mode: ' + reason, 7000);
      }
      this.scheduleCheck(150);
    }

    scheduleCheck(ms) {
      try { clearTimeout(this.checkTimer); } catch (e) { /* ignore */ }
      this.checkTimer = setTimeout(() => this.check(), ms || 300);
    }

    check() {
      try {
        if (!document.body || !this.H || this.mode !== 'push') return;
        const chromeEl = $('#docs-chrome') || $('#docs-header');
        const editorEl = $('#docs-editor');
        if (!chromeEl && !editorEl) {
          this.setMode('overlay', 'unrecognized page layout, banner overlays the top edge');
          return;
        }
        const probe = chromeEl || editorEl;
        const top = probe.getBoundingClientRect().top;
        if (top >= this.H - 8) {
          if (this.level !== 0) {
            this.level = 0;
            document.body.removeAttribute('data-revbanner-fix');
          }
          return;
        }
        this.escalate();
      } catch (e) { log('offset check error: ' + e); }
    }

    escalate() {
      if (this.level === 0) {
        this.level = 1;
        try { document.body.setAttribute('data-revbanner-fix', '1'); } catch (e) { /* ignore */ }
        log('offset: escalation level 1 (transform containers)');
        this.scheduleCheck(500);
      } else if (this.level === 1) {
        this.level = 2;
        try { document.body.setAttribute('data-revbanner-fix', '2'); } catch (e) { /* ignore */ }
        log('offset: escalation level 2 (transform body)');
        this.scheduleCheck(500);
      } else {
        this.setMode('overlay', 'could not shift this page safely (Alt+Shift+R hides the banner)');
      }
    }
  }

  /* =====================================================================
   * 10b. Fixed Google chrome — keep the banner's controls clickable.
   * Google pins some header controls to the viewport (the control strip
   * with last-edit / comments / Meet / Share / avatar). Because those are
   * position:fixed they stay at the very top of the screen — on top of the
   * banner, covering the score and buttons. We tag such elements with a
   * class; a page-level style sheet translates them below the banner via
   * the --revbanner-h variable. Detection is structural (fixed, pinned to
   * the top edge, right-anchored, pill-sized) so it survives Google
   * renaming their internal ids.
   * ===================================================================== */

  function installFixedShift() {
    try {
      const style = document.createElement('style');
      style.id = 'revbanner-fixed-shift';
      // The separate `translate` property composes with Google's own
      // `transform` instead of fighting it.
      style.textContent = '.rb-fshift { translate: 0 var(--revbanner-h, 0px) !important; }';
      (document.head || document.documentElement).appendChild(style);

      const tagged = new Set();

      const bannerH = () => {
        const v = parseFloat(document.documentElement.style.getPropertyValue('--revbanner-h'));
        return v > 0 ? v : 0;
      };

      const isOurs = (el) => {
        try {
          return !el || el.id === 'revbanner-root' ||
            !!(el.closest && el.closest('#revbanner-root'));
        } catch (e) { return true; }
      };

      const hostRect = () => {
        try {
          const host = document.getElementById('revbanner-root');
          return host ? host.getBoundingClientRect() : null;
        } catch (e) { return null; }
      };

      // Outermost FIXED-position ancestor of `el` that occupies the banner
      // band — that is the strip to translate. Fixed-only keeps content-
      // anchored things (comment bubbles, absolute overlays) untouched.
      const fixedTarget = (el, h) => {
        try {
          let cur = el, target = null;
          let guard = 0;
          while (cur && cur !== document.body && cur !== document.documentElement && guard++ < 40) {
            const cs = getComputedStyle(cur);
            const r = cur.getBoundingClientRect();
            if (cs.position === 'fixed' && r.height > 0 && r.height <= 220 &&
                r.top < h - 4 && r.width <= (window.innerWidth || 0) + 40) {
              target = cur;   // keep the outermost one found
            }
            cur = cur.parentElement || (cur.parentNode && cur.parentNode.host) || null;
          }
          return target;
        } catch (e) { return null; }
      };

      // What actually paints over the banner right now? elementFromPoint
      // returns the topmost element at each point — this finds the pill even
      // when it hides inside Google's shadow DOM or inside a fixed parent bar
      // (both of which a plain selector sweep can miss).
      const hitScan = (h) => {
        const found = [];
        try {
          const br = hostRect();
          if (!br || br.width < 40 || br.height < 12) return found;
          const xs = [10, 46, 90, 150, 230, 330].map((d) => br.right - d).filter((x) => x > 0);
          const ys = [6, br.height / 2, br.height - 6];
          const seen = new Set();
          for (const x of xs) {
            for (const y of ys) {
              let el = null;
              try { el = document.elementFromPoint(x, y); } catch (e) { el = null; }
              let guard = 0;
              while (el && el.shadowRoot && guard++ < 5) {
                try { el = el.shadowRoot.elementFromPoint(x, y); } catch (e) { break; }
              }
              if (!el || isOurs(el)) continue;
              const t = fixedTarget(el, h);
              if (!t || isOurs(t) || seen.has(t)) continue;
              seen.add(t);
              found.push(t);
            }
          }
        } catch (e) { log('fixed-shift hit scan error: ' + e); }
        return found;
      };

      // Structural sweep: fixed pills that are directly document-visible.
      const qualifies = (el, h) => {
        try {
          if (!el || !el.classList || isOurs(el)) return false;
          const r = el.getBoundingClientRect();
          if (r.top < -40 || r.top > 40) return false;             // pinned to the top edge
          if (r.width < 120 || r.width > 960 || r.height < 24 || r.height > 170) return false;
          if (r.right < (window.innerWidth || 0) * 0.45) return false; // right-anchored cluster
          if (r.top >= h - 4) return false;                        // already below the banner
          const cs = getComputedStyle(el);
          if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return false;
          if (el.closest('[role="dialog"],[role="menu"],[role="tooltip"],[role="listbox"]')) return false;
          return true;
        } catch (e) { return false; }
      };

      const scan = () => {
        try {
          const h = bannerH();
          const candidates = new Set();
          if (h > 24) {
            for (const el of hitScan(h)) candidates.add(el);
            for (const el of $$('div, span, button')) {
              if (!tagged.has(el) && !candidates.has(el) && qualifies(el, h)) candidates.add(el);
            }
          }
          // translate only the outermost candidate — nested ones move along
          const outer = [];
          for (const el of candidates) {
            let inside = false;
            for (const other of candidates) {
              if (other !== el && other.contains && other.contains(el)) { inside = true; break; }
            }
            if (!inside) outer.push(el);
          }
          // apply after measuring — class writes between reads force reflows
          for (const el of Array.from(tagged)) {
            if (outer.indexOf(el) < 0) { el.classList.remove('rb-fshift'); tagged.delete(el); }
          }
          for (const el of outer) {
            if (!tagged.has(el)) { el.classList.add('rb-fshift'); tagged.add(el); }
          }
        } catch (e) { log('fixed-shift scan error: ' + e); }
      };

      const kick = debounce(scan, 350);
      try {
        window.addEventListener('resize', kick, { passive: true });
        // scroll does not bubble, but capture sees every scroller in the page
        document.addEventListener('scroll', kick, { capture: true, passive: true });
        setInterval(() => { if (!document.hidden) scan(); }, 4000);
      } catch (e) { /* ignore */ }
      scan();
      return { scan, kick };
    } catch (e) {
      log('fixed-shift install error: ' + e);
      return { scan: () => {}, kick: () => {} };
    }
  }

  /* Layout diagnostics — a readable report of everything that visually
   * occupies the banner's area. Used by the "Copy layout diagnostics"
   * button when a Google control still covers the banner: the report tells
   * us exactly which element it is (id/class chain, position, z-index), so
   * the shift logic can be targeted without guessing. */
  function collectOverlapDiagnostics() {
    const lines = [];
    try {
      const host = document.getElementById('revbanner-root');
      const br = host ? host.getBoundingClientRect() : null;
      if (!br) return 'No banner element found on this page.';
      const ident = (el) => {
        try {
          const parts = [];
          let n = el, hops = 0;
          while (n && n.nodeType === 1 && hops++ < 6) {
            let s = (n.tagName || '?').toLowerCase();
            if (n.id) s += '#' + n.id;
            else if (typeof n.className === 'string' && n.className) {
              s += '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.');
            }
            parts.push(s);
            n = n.parentElement || (n.parentNode && n.parentNode.host) || null;
          }
          return parts.join(' < ');
        } catch (e) { return '?'; }
      };
      const desc = (el) => {
        try {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return ident(el) + ' | pos=' + cs.position + ' top=' + cs.top + ' right=' + cs.right +
            ' z=' + cs.zIndex + ' transform=' + cs.transform + ' translate=' + cs.translate +
            ' | rect=' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' +
            Math.round(r.width) + 'x' + Math.round(r.height);
        } catch (e) { return ident(el) + ' | (styles unavailable)'; }
      };

      lines.push('revbanner layout diagnostics — ' + new Date().toISOString());
      lines.push('viewport ' + Math.round(window.innerWidth) + 'x' + Math.round(window.innerHeight) +
        ' · banner rect x=' + Math.round(br.left) + ' y=' + Math.round(br.top) +
        ' w=' + Math.round(br.width) + ' h=' + Math.round(br.height));

      // 1) document-tree elements that intersect the banner (right 45%)
      let count = 0;
      lines.push('--- elements intersecting the banner band ---');
      for (const el of document.querySelectorAll('div,span,button,g,svg')) {
        if (count >= 25) break;
        try {
          if (isOurEl(el)) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) continue;
          if (r.bottom <= br.top + 2 || r.top >= br.bottom - 2) continue;
          if (r.right <= br.left + br.width * 0.55) continue;
          if (r.width * r.height > 500000) continue;   // page-size containers
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          count++;
          lines.push('[' + count + '] ' + desc(el));
        } catch (e) { /* ignore */ }
      }
      if (!count) lines.push('(none found in the document tree)');

      // 2) topmost element at sample points (pierces open shadow roots)
      lines.push('--- hit tests: topmost element at each point ---');
      const y = br.top + Math.min(24, br.height / 2);
      for (const d of [12, 60, 120, 200, 300, 380]) {
        const x = br.right - d;
        try {
          let el = document.elementFromPoint(x, y);
          let guard = 0;
          while (el && el.shadowRoot && guard++ < 5) el = el.shadowRoot.elementFromPoint(x, y);
          lines.push('(' + Math.round(x) + ',' + Math.round(y) + ') → ' + (el ? desc(el) : 'null'));
        } catch (e) {
          lines.push('(' + Math.round(x) + ',' + Math.round(y) + ') → error ' + e);
        }
      }
      lines.push('--- end of report (paste the whole thing) ---');
      return lines.join('\n');
    } catch (e) {
      return lines.join('\n') + '\nerror: ' + e;
    }
  }

  function isOurEl(el) {
    try {
      return !el || el.id === 'revbanner-root' || !!(el.closest && el.closest('#revbanner-root'));
    } catch (e) { return true; }
  }

  /* =====================================================================
   * 11. Banner UI (shadow DOM)
   * ===================================================================== */

  const BANNER_CSS = `
.rb, .rb * { box-sizing: border-box; }
:host {
  --bg: #f7f9fd; --bg2: #edf1fb; --fg: #0f172a; --muted: #64748b;
  --card: #ffffff; --border: #d9e1f0; --accent: #4f46e5; --chipbg: #e6ebf7;
  --good: #16a34a; --warn: #d97706; --bad: #dc2626;
}
.rb {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: var(--fg);
  background: linear-gradient(180deg, var(--bg), var(--bg2));
  border-bottom: 1px solid var(--border);
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.14);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  font-size: 13px;
  line-height: 1.25;
  user-select: none;
  -webkit-user-select: none;
}
:host([data-theme="dark"]) {
  --bg: #0b1220; --bg2: #101a2e; --fg: #e2e8f0; --muted: #94a3b8;
  --card: #131f36; --border: #1e293b; --accent: #818cf8; --chipbg: #1c2a44;
}
:host([data-theme="dark"]) .rb { box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5); }
.rb-main { flex: 1; display: flex; align-items: center; gap: 12px; padding: 8px 14px; min-width: 0; }
.rb-left { display: flex; flex-direction: column; justify-content: center; gap: 2px; min-width: 200px; max-width: 30%; flex: 0 1 auto; }
.rb-app { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent); }
.rb-title { font-size: 1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: default; }
.rb-sub { font-size: 0.68rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rb-chips { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 3px; max-width: 360px; }
.rb-chip { font-size: 0.6rem; padding: 2px 8px; border-radius: 999px; background: var(--chipbg); color: var(--muted); white-space: nowrap; border: 0; font: inherit; }
.rb-chip[data-tone="good"] { background: rgba(22, 163, 74, 0.15); color: var(--good); }
.rb-chip[data-tone="warn"] { background: rgba(217, 119, 6, 0.16); color: var(--warn); }
.rb-chip[data-tone="bad"] { background: rgba(220, 38, 38, 0.14); color: var(--bad); }
.rb-chip[data-tone="accent"] { background: rgba(79, 70, 229, 0.14); color: var(--accent); }
.rb-chip[data-tone="attention"] { background: rgba(79, 70, 229, 0.16); color: var(--accent); cursor: pointer; animation: rb-pulse 1.8s infinite; }
@keyframes rb-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.45); }
  55% { box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.08); }
}
.rb-cards { display: flex; gap: 8px; flex: 1 1 auto; justify-content: center; align-items: stretch; min-width: 0; overflow: hidden; }
.rb-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-width: 74px; padding: 6px 10px; border-radius: 10px; background: var(--card); border: 1px solid var(--border); cursor: pointer; color: inherit; font: inherit; transition: box-shadow 0.15s ease; }
.rb-card:hover { box-shadow: inset 0 0 0 2px var(--accent); }
.rb-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.rb-num { font-size: 1.16rem; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 1.05; white-space: nowrap; }
.rb-lab { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.055em; color: var(--muted); white-space: nowrap; }
.rb-right { display: flex; align-items: center; gap: 9px; flex: 0 0 auto; }
.rb-spark { width: 150px; height: 54px; border-radius: 9px; background: var(--card); border: 1px solid var(--border); }
.rb-score { width: 54px; height: 54px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; font-size: 1.05rem; cursor: pointer; border: 2.5px solid var(--muted); color: var(--muted); background: var(--card); font-variant-numeric: tabular-nums; line-height: 1; }
.rb-score small { font-size: 0.48rem; font-weight: 700; letter-spacing: 0.04em; color: var(--muted); margin-top: 1px; }
.rb-btns { display: flex; gap: 4px; }
.rb-btn { width: 29px; height: 29px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: var(--muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0; font: inherit; }
.rb-btn:hover { background: var(--card); color: var(--fg); border-color: var(--border); }
.rb-btn:focus-visible { outline: 2px solid var(--accent); }
.rb-btn svg { width: 15px; height: 15px; pointer-events: none; }
.rb-strip { display: none; align-items: center; gap: 10px; height: 100%; width: 100%; padding: 0 14px; }
.rb-strip-title { font-weight: 700; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 32%; }
.rb-strip-stats { font-size: 0.68rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rb-score-sm { width: auto; height: auto; border-radius: 999px; padding: 2px 8px; font-size: 0.68rem; border: 1.5px solid var(--muted); }
.rb-flex { flex: 1; }
.rb[data-collapsed="true"] .rb-main { display: none; }
.rb[data-collapsed="true"] .rb-strip { display: flex; }
.rb[data-mode="overlay"] .rb-cards { display: none; }
.rb[data-mode="overlay"] .rb-left { max-width: 45%; }
.rb[data-mode="overlay"] .rb-spark { display: none; }
/* Details panel */
.rb-details { position: fixed; top: var(--revbanner-h, 0px); left: 0; right: 0; max-height: 64vh; overflow: auto; background: var(--card); border: 1px solid var(--border); border-top: none; box-shadow: 0 14px 34px rgba(2, 6, 23, 0.28); padding: 14px 18px 18px; z-index: 702; color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12.5px; user-select: text; -webkit-user-select: text; }
.rb-details h3 { margin: 18px 0 6px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
.rb-details h3:first-of-type { margin-top: 6px; }
.rb-d-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.rb-d-head b { font-size: 0.95rem; }
.rb-d-sub { color: var(--muted); font-size: 0.7rem; }
.rb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin: 10px 0; }
.rb-grid .rb-card { min-height: 56px; cursor: default; }
/* Overview card labels wrap inside their card (sub-texts are long); the
 * banner strip cards keep nowrap for tidy short labels. */
.rb-grid .rb-card .rb-lab { white-space: normal; line-height: 1.4; text-align: center; word-break: break-word; }
.rb-grid .rb-card .rb-lab-sub { text-transform: none; letter-spacing: 0; }
.rb-grid .rb-card:hover { box-shadow: none; }
.rb-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; }
.rb-table th { text-align: left; color: var(--muted); font-weight: 700; padding: 4px 6px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--card); }
.rb-table td { padding: 3px 6px; border-bottom: 1px solid var(--border); white-space: nowrap; font-variant-numeric: tabular-nums; }
.rb-table-wrap { max-height: 220px; overflow: auto; border: 1px solid var(--border); border-radius: 8px; }
.rb-bar-row { display: grid; grid-template-columns: 120px 1fr 130px; align-items: center; gap: 8px; font-size: 0.72rem; margin: 5px 0; }
.rb-bar { height: 8px; border-radius: 4px; background: var(--chipbg); overflow: hidden; }
.rb-bar > span { display: block; height: 100%; border-radius: 4px; background: var(--accent); }
.rb-bar-detail { color: var(--muted); font-size: 0.64rem; text-align: right; }
.rb-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 4px; }
.rb-btn2 { font: inherit; font-size: 0.7rem; font-weight: 600; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--chipbg); color: var(--fg); cursor: pointer; }
.rb-btn2:hover { border-color: var(--accent); color: var(--accent); }
.rb-btn2[data-tone="danger"] { border-color: rgba(220, 38, 38, 0.5); color: var(--bad); }
.rb-legal { margin-top: 10px; font-size: 0.64rem; color: var(--muted); }
.rb-prov { font-size: 0.7rem; }
.rb-prov-row { display: flex; gap: 8px; align-items: baseline; margin: 3px 0; }
.rb-prov-row b { color: var(--accent); min-width: 105px; display: inline-block; }
.rb-muted { color: var(--muted); }
.rb-canvas { width: 100%; height: 90px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); }
/* Suspicious-edit signals */
.rb-signal { display: flex; gap: 8px; margin: 9px 0; align-items: flex-start; font-size: 0.7rem; }
.rb-signal-dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 5px; flex: 0 0 auto; background: var(--muted); }
.rb-signal-dot[data-sev="high"] { background: var(--bad); box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15); }
.rb-signal-dot[data-sev="warn"] { background: var(--warn); box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.15); }
.rb-signal-dot[data-sev="note"] { background: var(--accent); }
.rb-signal-dot[data-sev="good"] { background: var(--good); }
.rb-signal-body { flex: 1; min-width: 0; }
.rb-signal-title { font-weight: 700; }
.rb-ev { margin: 3px 0 0; padding-left: 18px; }
.rb-ev li { color: var(--muted); font-size: 0.64rem; margin: 1px 0; }
.rb-table td.rb-td-wrap { white-space: normal; }
/* AI analysis block */
.rb-ai { border: 1px solid var(--border); border-left: 3px solid var(--accent); background: var(--chipbg); border-radius: 8px; padding: 9px 11px; margin: 10px 0; font-size: 0.7rem; line-height: 1.5; white-space: pre-wrap; }
.rb-ai b { color: var(--accent); }
/* Toast */
.rb-toast { position: fixed; top: calc(var(--revbanner-h, 0px) + 8px); right: 14px; max-width: 420px; background: #0f172a; color: #f8fafc; font-size: 0.7rem; padding: 8px 12px; border-radius: 10px; box-shadow: 0 8px 22px rgba(2, 6, 23, 0.4); z-index: 703; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; opacity: 0.97; }
/* Responsive */
@media (max-width: 1450px) { .rb-card[data-i="earliest"] { display: none; } }
@media (max-width: 1280px) { .rb-card[data-i="bulk"] { display: none; } }
@media (max-width: 1120px) { .rb-spark { display: none; } }
@media (max-width: 980px) { .rb-card[data-i="contrib"] { display: none; } .rb-chips { max-width: 220px; } }
@media (max-width: 760px) { .rb-left { min-width: 120px; } .rb-title { font-size: 0.85rem; } .rb-score { display: none; } }
`;

  const ICONS = {
    sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    details: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M4.1 7.5l2.6 1.5M17.3 15l2.6 1.5M4.1 16.5l2.6-1.5M17.3 9l2.6-1.5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  const BANNER_HTML = `
<div class="rb" data-collapsed="false" data-theme="light">
  <div class="rb-strip">
    <span data-f="app-mini"></span>
    <span class="rb-strip-title" data-f="s-title">…</span>
    <span class="rb-strip-stats"><b data-f="s-edits">—</b> edits · <b data-f="s-active">—</b> active · <b data-f="s-sessions">—</b> sessions · <b data-f="s-people">—</b> people</span>
    <span class="rb-score rb-score-sm" data-f="s-score" data-go="score" title="Writing-process score — click for the full breakdown">—</span>
    <span class="rb-flex"></span>
    <span class="rb-btns">
      <button class="rb-btn" data-act="expand" title="Expand banner (Alt+R)">${ICONS.expand}</button>
    </span>
  </div>
  <div class="rb-main">
    <div class="rb-left">
      <div class="rb-app" data-f="app"></div>
      <div class="rb-title" data-f="title"></div>
      <div class="rb-sub"><span data-f="people">—</span> <span class="rb-dot">·</span> last edit <span data-f="last">—</span></div>
      <div class="rb-chips" data-f="chips"></div>
    </div>
    <div class="rb-cards">
      <button class="rb-card" data-go="sessions" title="Edits — best available source shown"><span class="rb-num" data-f="edits">—</span><span class="rb-lab">Edits</span></button>
      <button class="rb-card" data-go="sessions" title="Active working time: live-tracked on this machine, or estimated from version-history timestamps when viewing another account's doc"><span class="rb-num" data-f="active">—</span><span class="rb-lab">Active</span></button>
      <button class="rb-card" data-go="sessions" title="Work sessions (gaps longer than the session gap split sessions)"><span class="rb-num" data-f="sessions">—</span><span class="rb-lab">Sessions</span></button>
      <button class="rb-card" data-i="contrib" data-go="contributors" title="Distinct editors seen in this document's history"><span class="rb-num" data-f="contrib">—</span><span class="rb-lab">Contributors</span></button>
      <button class="rb-card" data-i="bulk" data-go="pastes" title="Bulk text insertions at or above the paste threshold"><span class="rb-num" data-f="bulk">—</span><span class="rb-lab">Bulk inserts</span></button>
      <button class="rb-card" data-i="earliest" data-go="timeline" title="Earliest known activity"><span class="rb-num" data-f="earliest">—</span><span class="rb-lab">First activity</span></button>
    </div>
    <div class="rb-right">
      <canvas class="rb-spark" data-f="spark" title="Edits per day (merged sources)"></canvas>
      <div class="rb-score" data-f="score" data-go="score" title="Writing-process score — click for the full breakdown">—</div>
      <div class="rb-btns">
        <button class="rb-btn" data-act="sync" title="Import version history now">${ICONS.sync}</button>
        <button class="rb-btn" data-act="details" title="Full details (Alt+D)">${ICONS.details}</button>
        <button class="rb-btn" data-act="collapse" title="Collapse banner (Alt+R)">${ICONS.collapse}</button>
        <button class="rb-btn" data-act="gear" title="Settings">\${ICONS.gear}</button>
      </div>
    </div>
  </div>
</div>
`;

  class BannerUI {
    constructor(ctx, cfg) {
      this.ctx = ctx;
      this.cfg = cfg;
      this.collapsed = false;
      this.hidden = false;
      this.overlay = false;
      this.detailsOpen = false;
      this.toastTimer = 0;
      this.onHeightChange = null;
      this.onAct = null;

      this.host = document.createElement('div');
      this.host.id = 'revbanner-root';
      document.body.appendChild(this.host);
      this.root = this.host.attachShadow({ mode: 'open' });
      this.build();
      this.wire();
    }

    build() {
      let styled = false;
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(BANNER_CSS);
        this.root.adoptedStyleSheets = [sheet];
        styled = true;
      } catch (e) { styled = false; }
      if (!styled) {
        const st = document.createElement('style');
        st.textContent = BANNER_CSS;
        this.root.appendChild(st);
      }
      const wrap = document.createElement('div');
      wrap.innerHTML = BANNER_HTML.replace(/\$\{ICONS\.expand\}/g, ICONS.expand)
        .replace(/\$\{ICONS\.collapse\}/g, ICONS.collapse)
        .replace(/\$\{ICONS\.details\}/g, ICONS.details)
        .replace(/\$\{ICONS\.sync\}/g, ICONS.sync)
        .replace(/\$\{ICONS\.gear\}/g, ICONS.gear)
        .replace(/\$\{ICONS\.close\}/g, ICONS.close);
      this.root.appendChild(wrap);
      this.wrap = wrap;
      this.el = wrap.querySelector('.rb');
      this.strip = wrap.querySelector('.rb-strip');
      this.details = document.createElement('div');
      this.details.className = 'rb-details';
      this.details.setAttribute('hidden', '');
      this.root.appendChild(this.details);
      this.toastEl = document.createElement('div');
      this.toastEl.className = 'rb-toast';
      this.toastEl.setAttribute('hidden', '');
      this.root.appendChild(this.toastEl);
      this.refs = {};
      for (const el of this.root.querySelectorAll('[data-f]')) this.refs[el.getAttribute('data-f')] = el;
    }

    wire() {
      this.root.addEventListener('click', (e) => {
        let t = e.target;
        while (t && t !== this.root) {
          if (t.matches && t.matches('[data-act]')) {
            const act = t.getAttribute('data-act');
            if (this.onAct) this.onAct(act, e);
            return;
          }
          if (t.matches && t.matches('[data-go]')) {
            const go = t.getAttribute('data-go');
            this.openDetails(go);
            return;
          }
          if (t.matches && t.matches('[data-chip-act]')) {
            if (this.onAct) this.onAct(t.getAttribute('data-chip-act'), e);
            return;
          }
          t = t.parentElement;
        }
      });
    }

    setTheme(dark) {
      const v = dark ? 'dark' : 'light';
      try { this.host.setAttribute('data-theme', v); } catch (e) { /* ignore */ }
      try { this.el.setAttribute('data-theme', v); } catch (e) { /* ignore */ }
      try { this.details.setAttribute('data-theme', v); } catch (e) { /* ignore */ }
    }

    setOverlayMode(ov) {
      this.overlay = !!ov;
      try { this.el.setAttribute('data-mode', this.overlay ? 'overlay' : 'push'); } catch (e) { /* ignore */ }
      this.emitHeight();
    }

    setCollapsed(c) {
      this.collapsed = !!c;
      try { this.el.setAttribute('data-collapsed', this.collapsed ? 'true' : 'false'); } catch (e) { /* ignore */ }
      this.emitHeight();
    }

    setHidden(h) {
      this.hidden = !!h;
      this.host.style.display = h ? 'none' : '';
      this.emitHeight();
    }

    cycleVisibility() {
      if (this.hidden) { this.setHidden(false); this.setCollapsed(false); }
      else if (this.collapsed) this.setCollapsed(false);
      else this.setCollapsed(true);
    }

    emitHeight() {
      if (!this.onHeightChange) return;
      const pct = clamp(this.cfg.bannerPct || 13, 8, 15);
      const vh = window.innerHeight || 900;
      let h = Math.round(vh * pct / 100);
      h = clamp(h, 56, 160);
      if (this.hidden) h = 0;
      else if (this.collapsed) h = 34;
      else if (this.overlay) h = Math.min(h, 56);
      this.onHeightChange(h);
    }

    render(stats, rec, tracker) {
      try {
        const r = this.refs;
        if (!stats) return;
        const appLabel = APP_LABELS[this.ctx.app] || 'Document';
        r['app'].textContent = appLabel;
        if (r['app-mini']) r['app-mini'].textContent = (APP_ICONS[this.ctx.app] || '📄') + ' ' + appLabel;
        r['title'].textContent = rec.title || this.ctx.title || 'Untitled';
        r['title'].setAttribute('title', rec.title || '');
        if (r['s-title']) r['s-title'].textContent = (APP_ICONS[this.ctx.app] || '📄') + ' ' + (rec.title || 'Untitled');
        r['last'].textContent = fmtRel(stats.latest);
        if (r['s-last']) r['s-last'].textContent = fmtRel(stats.latest);

        const editsTxt = fmtNum(stats.edits.value);
        r['edits'].textContent = editsTxt;
        if (r['s-edits']) r['s-edits'].textContent = editsTxt;
        r['edits'].setAttribute('title', 'Edits source: ' + stats.edits.label);
        const activeTxt = fmtDur(stats.activeMs);
        r['active'].textContent = activeTxt;
        if (r['s-active']) r['s-active'].textContent = activeTxt;
        const sessTxt = fmtNum(stats.sessions);
        r['sessions'].textContent = sessTxt;
        if (r['s-sessions']) r['s-sessions'].textContent = sessTxt;
        const pplTxt = stats.contributorsCount ? String(stats.contributorsCount) : '—';
        r['contrib'].textContent = pplTxt;
        if (r['s-people']) r['s-people'].textContent = pplTxt;
        r['bulk'].textContent = String(stats.bulk.length);
        r['bulk'].setAttribute('title', stats.bulk.length
          ? ('Largest: ' + Math.max.apply(null, stats.bulk.map((b) => b.chars || 0)) + ' chars · threshold ' + this.cfg.pasteThresholdChars)
          : ('No insertions ≥ ' + this.cfg.pasteThresholdChars + ' chars recorded'));
        r['earliest'].textContent = stats.earliest ? fmtRel(stats.earliest) : '—';
        r['earliest'].setAttribute('title', stats.earliest ? fmtDate(stats.earliest) : 'No history yet');

        // Score
        const showScore = this.cfg.showScore !== false;
        const sc = showScore && stats.score.value != null ? String(stats.score.value) : '—';
        const tone = stats.score.value == null ? 'var(--muted)' :
          (stats.score.value >= 80 ? 'var(--good)' : stats.score.value >= 55 ? 'var(--warn)' : 'var(--bad)');
        for (const key of ['score', 's-score']) {
          const el = r[key];
          if (!el) continue;
          el.textContent = sc;
          el.style.setProperty('--muted', tone);
          el.style.color = tone;
          el.style.borderColor = tone;
          const parts = (stats.score.parts || []).map((p) => p.label + ': ' + Math.round(p.q * 100) + '%').join(' · ');
          el.setAttribute('title', 'Writing-process score — heuristic, not proof. ' + (parts || 'Not enough data yet.'));
        }

        // Sub-line people
        const names = stats.contributors.slice(0, 4).map((c) => c.name);
        let people = names.length ? names.join(', ') : '—';
        if (stats.contributorsCount > 4) people += ' +' + (stats.contributorsCount - 4);
        r['people'].textContent = people;

        // Chips
        const chips = [];
        if (stats.empty) {
          chips.push('<span class="rb-chip" data-tone="attention" data-chip-act="sync">No data yet — click to import history</span>');
        } else if (stats.liveOnly) {
          chips.push('<span class="rb-chip" data-tone="accent">Live tracking (this browser, since install)</span>');
        } else {
          chips.push('<span class="rb-chip" data-tone="accent">' + esc(stats.edits.label) + '</span>');
        }
        if (stats.provenance.panel) {
          chips.push('<span class="rb-chip" data-tone="good">✓ ' + stats.provenance.panel.count + ' versions imported</span>');
        } else if (stats.provenance.net) {
          chips.push('<span class="rb-chip" data-tone="good">✓ ops timeline captured</span>');
        } else if (!stats.liveOnly) {
          chips.push('<span class="rb-chip" data-tone="attention" data-chip-act="sync">Import full history ⟳</span>');
        }
        // Suspicious-edit flag at a glance: significant pasted share.
        if (stats.pastedShare != null && stats.pastedShare >= 0.25) {
          chips.push('<span class="rb-chip" data-tone="' + (stats.pastedShare >= 0.6 ? 'bad' : 'warn') +
            '" data-go="signals" title="Click for the suspicious-edit signals">⚠ ' +
            Math.round(stats.pastedShare * 100) + '% of added text pasted</span>');
        }
        if (tracker && tracker.session) {
          const s = tracker.session;
          const live = tracker.lastActivity && (nowMs() - tracker.lastActivity) < tracker.idleMs &&
            document.visibilityState === 'visible';
          const activeNow = live && (s.activeMs || 0) > 0;
          if (activeNow) {
            chips.push('<span class="rb-chip" data-tone="good">● recording — ' + fmtDur(s.activeMs) + ' this session</span>');
          } else if (s.activeMs > 0) {
            chips.push('<span class="rb-chip">live: ' + fmtDur(s.activeMs) + ' this session</span>');
          }
        }
        if (this.cfg.debug) {
          chips.push('<span class="rb-chip" data-tone="warn">debug: ' + debugLog.length + ' log lines</span>');
        }
        this.refs['chips'].innerHTML = chips.join('');

        this.drawSpark(stats);
      } catch (e) {
        log('render error: ' + e);
      }
    }

    drawSpark(stats) {
      try {
        const cv = this.refs['spark'];
        if (!cv || !cv.offsetParent && cv.clientWidth === 0) {
          // hidden by responsive CSS — skip
        }
        if (!cv) return;
        const rect = cv.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return;
        const dpr = window.devicePixelRatio || 1;
        if (cv.width !== Math.round(rect.width * dpr) || cv.height !== Math.round(rect.height * dpr)) {
          cv.width = Math.round(rect.width * dpr);
          cv.height = Math.round(rect.height * dpr);
        }
        const ctx2 = cv.getContext('2d');
        if (!ctx2) return;
        const W = cv.width, H = cv.height;
        ctx2.clearRect(0, 0, W, H);
        const dark = this.el.getAttribute('data-theme') === 'dark';
        const accent = dark ? '#818cf8' : '#4f46e5';
        const muted = dark ? '#334155' : '#dbe3f0';
        const days = 30;
        const counts = new Array(days).fill(0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < days; i++) {
          const d = new Date(today.getTime() - (days - 1 - i) * 86400000);
          const k = ymdKey(d.getTime());
          counts[i] = stats.daily.get(k) || 0;
        }
        const max = Math.max(1, Math.max.apply(null, counts));
        const bw = W / days;
        for (let i = 0; i < days; i++) {
          const h = counts[i] / max * (H - 6);
          ctx2.fillStyle = i === days - 1 ? accent : (counts[i] ? accent : muted);
          ctx2.globalAlpha = counts[i] ? (i === days - 1 ? 1 : 0.85) : 0.5;
          const x = i * bw + 1;
          const y = H - 2 - h;
          ctx2.fillRect(x, y, Math.max(1, bw - 2), Math.max(h, counts[i] ? 2 : 1));
        }
        ctx2.globalAlpha = 1;
      } catch (e) { /* ignore */ }
    }

    toast(msg, ms) {
      try {
        this.toastEl.textContent = msg;
        this.toastEl.removeAttribute('hidden');
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
          try { this.toastEl.setAttribute('hidden', ''); } catch (e) { /* ignore */ }
        }, ms || 4000);
      } catch (e) { /* ignore */ }
    }

    openDetails(go) {
      this.detailsOpen = true;
      this.details.removeAttribute('hidden');
      if (go && this.onDetailsGo) {
        // scroll after render
        setTimeout(() => {
          try {
            const target = this.details.querySelector('#rb-sec-' + go);
            if (target) target.scrollIntoView({ block: 'start' });
          } catch (e) { /* ignore */ }
        }, 30);
      }
    }

    closeDetails() {
      this.detailsOpen = false;
      this.details.setAttribute('hidden', '');
    }

    renderDetails(stats, rec, tracker, history) {
      try {
        const p = stats.provenance;
        const appLabel = APP_LABELS[rec.app] || rec.app;
        let html = '';
        html += '<div class="rb-d-head"><b>' + esc(rec.title) + '</b>' +
          '<span class="rb-d-sub">' + esc(appLabel) + ' · ' + esc(rec.id) + '</span><span class="rb-flex"></span>' +
          '<button class="rb-btn" data-act="close-details" title="Close details">' + ICONS.close + '</button></div>';

        // Overview grid
        html += '<div class="rb-grid">' +
          card('Edits', fmtNum(stats.edits.value), stats.edits.label) +
          card('Active time', fmtDur(stats.activeMs), stats.activeLabel || 'live tracking (since install)') +
          card('Sessions', fmtNum(stats.sessions), 'gap > ' + this.cfg.sessionGapMinutes + ' min splits') +
          card('Contributors', String(stats.contributorsCount || '—')) +
          card('Bulk inserts', String(stats.bulk.length), '≥ ' + this.cfg.pasteThresholdChars + ' chars at once') +
          card('Typed vs pasted', stats.pastedShare != null
            ? Math.round((1 - stats.pastedShare) * 100) + '% / ' + Math.round(stats.pastedShare * 100) + '%'
            : '—', 'typed / pasted share') +
          card('Words (now)', stats.words ? fmtNum(stats.words) : '—', stats.words && stats.sessions
            ? '≈ ' + fmtNum(Math.round(stats.words / Math.max(1, stats.sessions))) + ' per session' : 'document total') +
          card('First activity', stats.earliest ? fmtDate(stats.earliest) : '—') +
          card('Latest activity', stats.latest ? fmtDate(stats.latest) : '—') +
          card('Active days', String(stats.activeDays)) +
          '</div>';

        function card(lab, val, sub) {
          return '<div class="rb-card"><span class="rb-num">' + esc(val) + '</span><span class="rb-lab">' + esc(lab) + '</span>' +
            (sub ? '<span class="rb-lab rb-lab-sub">' + esc(sub) + '</span>' : '') + '</div>';
        }

        // Score — full breakdown of what contributed to it
        html += '<section id="rb-sec-score"><h3>Writing-process score</h3>';
        if (stats.score.value == null) {
          html += '<p class="rb-prov rb-muted">Not enough data yet. The score appears once there is history (imported or tracked).</p>';
        } else {
          html += '<div class="rb-prov-row"><b>Score</b> <span>' + stats.score.value + '/100 — ' +
            (stats.score.value >= 80 ? 'consistent with sustained original writing' :
              stats.score.value >= 55 ? 'mixed signals — worth a conversation' : 'low process: little writing over time, big insertions, or both') +
            '</span></div>';
          const wsum = stats.score.parts.reduce((n, x) => n + x.weight, 0) || 1;
          html += '<p class="rb-prov rb-muted">How the score adds up — each factor contributes its quality × weight as points:</p>';
          html += '<div class="rb-table-wrap"><table class="rb-table">' +
            '<tr><th>Factor</th><th>Weight</th><th>Quality</th><th>Gives</th><th>Evidence</th></tr>';
          for (const part of stats.score.parts) {
            html += '<tr><td><b>' + esc(part.label) + '</b></td><td>' + Math.round(part.weight * 100) + '%</td><td>' +
              Math.round(part.q * 100) + '%</td><td><b>+' + Math.round(part.q * part.weight / wsum * 100) +
              '</b></td><td class="rb-td-wrap">' + esc(part.detail) + '</td></tr>';
          }
          html += '</table></div>';
          html += '<div class="rb-prov-row"><b>Typed vs pasted</b> <span>' +
            (stats.pastedShare == null ? 'no typed-text data recorded in this browser'
              : Math.round((1 - stats.pastedShare) * 100) + '% typed · ' + Math.round(stats.pastedShare * 100) +
                '% arrived in bulk insertions (of ' + fmtNum(stats.bulkChars) + ' pasted chars)') +
            '</span></div>';
          if (stats.words) {
            html += '<div class="rb-prov-row"><b>Document size</b> <span>≈' + fmtNum(stats.words) + ' words now · ' +
              fmtNum(stats.bulkChars) + ' chars known to have arrived by paste</span></div>';
          }
          html += '<p class="rb-prov rb-muted">Scores weight paste ratio 35%, sessions 25%, spread over days 20%, burst pattern 20%. Higher = more editing over time with fewer bulk insertions.</p>';
        }
        html += '</section>';

        // Suspicious-edit signals — the insight engine, evidence included
        const insights = computeInsights(stats, rec, this.cfg);
        html += '<section id="rb-sec-signals"><h3>Suspicious-edit signals</h3>';
        if (!insights.length) {
          html += '<p class="rb-prov rb-muted">' + (stats.empty
            ? 'No data yet — signals appear once there is history or live tracking.'
            : 'Nothing unusual flagged by the local heuristics — timing, sessions and paste patterns all look ordinary.') + '</p>';
        } else {
          html += '<p class="rb-prov rb-muted">Computed locally from timing, sizes and paste patterns. Paste-related signals only see this browser\'s live tracking; session signals merge live and imported history.</p>';
          for (const s of insights) {
            html += '<div class="rb-signal"><span class="rb-signal-dot" data-sev="' + esc(s.severity) + '"></span>' +
              '<span class="rb-signal-body"><span class="rb-signal-title">' + esc(s.title) + '</span> — ' +
              esc(s.summary) +
              (s.evidence && s.evidence.length
                ? '<ul class="rb-ev">' + s.evidence.map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>'
                : '') +
              '</span></div>';
          }
        }
        // Optional AI analysis (user-configured endpoint; metadata only)
        if (rec.ai && rec.ai.text) {
          html += '<div class="rb-ai"><b>AI read of this process</b> <span class="rb-muted">· ' +
            esc(rec.ai.model || 'model') + ' · ' + esc(fmtRel(rec.ai.at)) + '</span>' + esc(rec.ai.text) + '</div>';
        }
        if (this.cfg.ai && this.cfg.ai.enabled && this.cfg.ai.key) {
          html += '<div class="rb-actions" style="margin-top:8px">' +
            '<button class="rb-btn2" data-act="ai-analyze" title="Sends the numbers and signals above (never document text) to your configured AI endpoint">' +
            (rec.ai ? 'Re-run AI analysis' : 'Explain with AI') + '</button>' +
            (rec.ai ? '' : '<span class="rb-muted" style="font-size:0.64rem">optional — uses your own API key from Settings</span>') +
            '</div>';
        }
        html += '<p class="rb-legal">Signals describe patterns, not intent. A student can paste their own earlier draft, write offline, use dictation, or paste a teacher-provided template. Use these as conversation starters — never as proof of misconduct.</p>';
        html += '</section>';

        // Sessions
        html += '<section id="rb-sec-sessions"><h3>Sessions (most recent first)</h3>';
        const live = (rec.live && Array.isArray(rec.live.sessions)) ? rec.live.sessions.slice().reverse() : [];
        if (live.length) {
          html += '<div class="rb-table-wrap"><table class="rb-table"><tr><th>Started</th><th>Active</th><th>Edits</th><th>Keys</th><th>Chars +/−</th><th>Bulk</th></tr>';
          for (const s of live.slice(0, 60)) {
            const bulkN = (s.pastes || []).filter((x) => (x.chars || 0) >= this.cfg.pasteThresholdChars).length;
            html += '<tr><td>' + esc(fmtDate(s.start)) + '</td><td>' + fmtDur(s.activeMs) + '</td><td>' +
              (s.edits || 0) + '</td><td>' + (s.keys || 0) + '</td><td>' + (s.addChars || 0) + ' / ' + (s.delChars || 0) +
              '</td><td>' + (bulkN || '·') + '</td></tr>';
          }
          html += '</table></div>';
        } else {
          html += '<p class="rb-prov rb-muted">No live sessions recorded in this browser yet (viewing-only visits record activity through imported history instead).</p>';
        }
        if (stats.histSessions && stats.histSessions.length) {
          html += '<h4 style="margin:14px 0 6px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:650">History-derived sessions — estimated from version timestamps</h4>' +
            '<div class="rb-table-wrap"><table class="rb-table"><tr><th>Started</th><th>Span</th><th>Checkpoints</th><th>≈ Active</th></tr>';
          for (const c of stats.histSessions.slice(-60).reverse()) {
            html += '<tr><td>' + esc(fmtDate(c.start)) + '</td><td>' + fmtDur(c.end - c.start) +
              '</td><td>' + c.n + '</td><td>' + fmtDur(Math.max(c.end - c.start, 5 * 60000)) + '</td></tr>';
          }
          html += '</table></div>';
          html += '<p class="rb-prov rb-muted">Spans come from Google save checkpoints (roughly one per few minutes of editing; one more when work stops). A 5-minute floor is applied per session — this is an estimate of work time, not a keystroke measurement.</p>';
        }
        if (p.live && p.live.aggregatedSessions) {
          html += '<p class="rb-prov rb-muted">+' + p.live.aggregatedSessions + ' older sessions aggregated (older than retention).</p>';
        }
        html += '</section>';

        // Contributors
        html += '<section id="rb-sec-contributors"><h3>Contributors</h3>';
        if (stats.contributors.length) {
          html += '<div class="rb-table-wrap"><table class="rb-table"><tr><th>Name</th><th>Version entries</th><th>Edit entries</th></tr>';
          for (const c of stats.contributors.slice(0, 50)) {
            html += '<tr><td>' + esc(c.name) + '</td><td>' + (c.versions || 0) + '</td><td>' + (c.edits || 0) + '</td></tr>';
          }
          html += '</table></div>';
        } else {
          html += '<p class="rb-prov rb-muted">No contributor names available yet — import version history to see editors.</p>';
        }
        html += '</section>';

        // Timeline
        html += '<section id="rb-sec-timeline"><h3>Edits per day</h3><canvas class="rb-canvas" data-f="dailycanvas"></canvas>' +
          '<p class="rb-prov rb-muted">Merged across sources; per-day value takes the highest single source to avoid double counting.</p></section>';

        // Bulk inserts
        html += '<section id="rb-sec-pastes"><h3>Bulk insertions (copy/paste flags)</h3>';
        if (stats.bulk.length) {
          html += '<div class="rb-table-wrap"><table class="rb-table"><tr><th>When</th><th>Chars</th><th>Source</th></tr>';
          for (const b of stats.bulk.slice().reverse()) {
            html += '<tr><td>' + esc(fmtDate(b.t)) + '</td><td>' + (b.chars || 0) + '</td><td>' + esc(b.via || 'dom') + '</td></tr>';
          }
          html += '</table></div>';
        } else {
          html += '<p class="rb-prov rb-muted">None recorded. Bulk insertions are single additions ≥ ' + this.cfg.pasteThresholdChars + ' characters.</p>';
        }
        html += '</section>';

        // Data sources
        html += '<section id="rb-sec-data"><h3>Data sources</h3><div class="rb-prov">';
        if (p.live) {
          html += '<div class="rb-prov-row"><b>Live tracking</b><span>since ' + esc(fmtDate(p.live.since)) + ' · ' +
            p.live.sessions + ' sessions · ' + p.live.edits + ' edits · ' + fmtDur(p.live.activeMs) + ' active · ' +
            p.live.addChars + ' chars added (this browser only)</span></div>';
        }
        if (p.panel) {
          html += '<div class="rb-prov-row"><b>Version history</b><span>' + p.panel.count + ' versions' +
            (p.panel.versionEdits ? ' · ' + p.panel.versionEdits + ' edit entries' : '') +
            ' · imported ' + esc(fmtRel(p.panel.fetchedAt)) + '</span></div>';
        }
        const imp = rec.hist.importStatus;
        if (imp) {
          if (imp.ok) {
            html += '<div class="rb-prov-row"><b>Last import</b><span class="rb-muted">' + esc(fmtRel(imp.at)) +
              ' · ' + imp.tiles + ' tiles read · ' + imp.named + ' with editor names · ' +
              imp.editors + ' distinct editors · via ' + esc(imp.via || '?') + '</span></div>';
          } else {
            html += '<div class="rb-prov-row"><b>Last import attempt</b><span style="color:var(--warn)">' +
              esc(fmtRel(imp.at)) + ' — ' + esc(imp.reason || 'failed') + '</span></div>';
          }
        } else if (!p.panel) {
          html += '<div class="rb-prov-row"><b>Version history</b><span class="rb-muted">not imported yet — press ⟳ in the banner or open File → Version history once</span></div>';
        }
        if (p.net) {
          html += '<div class="rb-prov-row"><b>Network ops</b><span>' + p.net.count + ' op timestamps parsed (experimental — format may change)</span></div>';
        }
        if (p.drive) {
          html += '<div class="rb-prov-row"><b>Drive API</b><span>' + p.drive.count + ' revisions · ' + esc(fmtRel(p.drive.fetchedAt)) + '</span></div>';
        }
        html += '</div>';

        // Actions
        html += '<div class="rb-actions">' +
          '<button class="rb-btn2" data-act="copy-summary">Copy summary</button>' +
          '<button class="rb-btn2" data-act="export-submission" title="Generate a signed HTML summary to submit with the work">Export submission (HTML)</button>' +
          '<button class="rb-btn2" data-act="export-csv">Export CSV</button>' +
          '<button class="rb-btn2" data-act="export-json">Export JSON</button>' +
          '<button class="rb-btn2" data-act="sync">Import history now</button>' +
          (history && history.driveConfigured ? '<button class="rb-btn2" data-act="drive-sync">Sync Drive API</button>' : '') +
          '<button class="rb-btn2" data-act="diag-overlap" title="Copies a report of everything that visually overlaps the banner — useful when a Google control covers it">Copy layout diagnostics</button>' +
          '<button class="rb-btn2" data-tone="danger" data-act="forget">Forget this file</button>' +
          '</div>';

        html += '<p class="rb-legal">The process score is a heuristic conversation starter based on edit spread, session count and paste ratios — it is <b>not</b> proof of misconduct or AI use. All data is stored locally in this browser.</p>';

        if (this.cfg.debug && debugLog.length) {
          html += '<section><h3>Debug log</h3><div class="rb-table-wrap"><table class="rb-table">' +
            debugLog.slice(-40).map((l) => '<tr><td>' + esc(fmtDate(l.t)) + '</td><td>' + esc(l.msg) + '</td></tr>').join('') +
            '</table></div></section>';
        }

        this.details.innerHTML = html;
        this.drawDailyChart();
      } catch (e) {
        log('renderDetails error: ' + e);
      }
    }

    drawDailyChart() {
      try {
        const cv = this.details.querySelector('[data-f="dailycanvas"]');
        if (!cv) return;
        const parent = cv.parentElement;
        const w0 = parent ? parent.getBoundingClientRect().width - 2 : 600;
        const dpr = window.devicePixelRatio || 1;
        cv.width = Math.round(w0 * dpr);
        cv.height = Math.round(90 * dpr);
        cv.style.width = w0 + 'px';
        const ctx2 = cv.getContext('2d');
        if (!ctx2) return;
        const dark = this.el.getAttribute('data-theme') === 'dark';
        // uses last stats drawn — stored on instance
        const stats = this.lastStats;
        if (!stats) return;
        const entries = Array.from(stats.daily.entries ? stats.daily.entries() : []);
        if (!entries.length) return;
        entries.sort((a, b) => a[0] - b[0]);
        const maxBars = 160;
        const days = Math.min(entries.length, maxBars);
        const daily = this.lastStats.daily;
        let keys = entries.map((e) => e[0]);
        if (keys.length > maxBars) keys = keys.slice(keys.length - maxBars);
        const first = keys[0], lastKey = keys[keys.length - 1];
        const totalDays = Math.max(1, Math.round((ymdKeyToTs(lastKey) - ymdKeyToTs(first)) / 86400000) + 1);
        const bucketDays = Math.max(1, Math.ceil(totalDays / maxBars));
        const buckets = new Map();
        for (const [k, v] of entries) {
          const ts = ymdKeyToTs(k);
          const b = Math.floor(ts / (bucketDays * 86400000));
          buckets.set(b, (buckets.get(b) || 0) + v);
        }
        const bl = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
        const max = Math.max(1, Math.max.apply(null, bl.map((x) => x[1])));
        const W = cv.width, H = cv.height;
        ctx2.clearRect(0, 0, W, H);
        const accent = dark ? '#818cf8' : '#4f46e5';
        const muted = dark ? '#1e293b' : '#e2e8f0';
        const bw = W / bl.length;
        for (let i = 0; i < bl.length; i++) {
          const h = bl[i][1] / max * (H - 8);
          ctx2.fillStyle = bl[i][1] ? accent : muted;
          ctx2.fillRect(i * bw + 1, H - 2 - h, Math.max(1, bw - 2), Math.max(h, bl[i][1] ? 2 : 1));
        }
        function ymdKeyToTs(k) {
          const y = Math.floor(k / 10000), mo = Math.floor((k % 10000) / 100) - 1, d = k % 100;
          return new Date(y, mo, d).getTime();
        }
      } catch (e) { log('daily chart error: ' + e); }
    }

    setLastStats(stats) { this.lastStats = stats; }
  }

  function downloadText(name, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { URL.revokeObjectURL(url); a.remove(); } catch (e) { /* ignore */ }
      }, 4000);
    } catch (e) {
      log('download error: ' + e);
    }
  }

  /* =====================================================================
   * 11b. Student submission export (signed HTML)
   *
   * Students can attach a "process summary" to their submission. The file
   * is a self-contained HTML report that embeds a signed JSON payload:
   *   - HMAC over the exact payload string (stops casual hand-edits)
   *   - the payload includes the student's live-tracking record AND the
   *     version history their install scraped from Google
   * The teacher's Verify page (verify/verify.html) checks the signature and
   * cross-checks the claims against Google's own version history — see the
   * README threat model for what this does and does not guarantee.
   * ===================================================================== */

  const SUBMISSION_KEY = 'rb-v1-7f3c9d2e5a1b4089cafe6d2b9e1173a5';

  async function hmacSign(text) {
    try {
      if (typeof crypto === 'undefined' || typeof TextEncoder === 'undefined' || !crypto.subtle) return null;
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey('raw', enc.encode(SUBMISSION_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
      return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      log('hmac sign failed: ' + e);
      return null;
    }
  }

  function buildSubmissionHtml(payload, payloadStr, sig) {
    const d = payload.doc || {};
    const st = payload.stats || {};
    const rec = payload.record || {};
    const live = (rec.live && Array.isArray(rec.live.sessions)) ? rec.live.sessions.filter(Boolean) : [];
    const versions = (rec.hist && Array.isArray(rec.hist.versions)) ? rec.hist.versions : [];
    const ops = (rec.hist && Array.isArray(rec.hist.ops)) ? rec.hist.ops : [];
    const roll = (rec.live && rec.live.rollup) || {};
    const daily = Array.isArray(st.daily) ? st.daily.slice().sort((a, b) => a[0] - b[0]) : [];
    const maxDay = daily.reduce((m, e) => Math.max(m, e[1] || 0), 1);
    // Escape "</" inside the embedded JSON so it can never terminate the island.
    const embedStr = String(payloadStr).replace(/<\//g, '<\\/');

    const ymdLabel = (k) => {
      const y = Math.floor(k / 10000), mo = Math.floor((k % 10000) / 100) - 1, dd = k % 100;
      return y + '-' + pad2(mo + 1) + '-' + pad2(dd);
    };
    const dailyHtml = daily.slice(-90).map((e) => {
      const h = Math.max(2, Math.round((e[1] || 0) / maxDay * 100));
      return '<div class="bar" title="' + ymdLabel(e[0]) + ': ' + (e[1] || 0) + ' edits"><span style="height:' + h + '%"></span></div>';
    }).join('');

    const sessHtml = live.slice(-60).reverse().map((s) => {
      const bulkN = (s.pastes || []).filter((p) => (p.chars || 0) >= 200).length;
      return '<tr><td>' + esc(fmtDate(s.start)) + '</td><td>' + fmtDur(s.activeMs) + '</td><td>' +
        (s.edits || 0) + '</td><td>' + (s.keys || 0) + '</td><td>' + (s.addChars || 0) + ' / ' + (s.delChars || 0) +
        '</td><td>' + (bulkN || '·') + '</td></tr>';
    }).join('');

    const bulk = Array.isArray(st.bulk) ? st.bulk : [];
    const bulkHtml = bulk.length ? bulk.slice().reverse().map((b) =>
      '<tr><td>' + esc(fmtDate(b.t)) + '</td><td>' + (b.chars || 0) + '</td><td>' + esc(b.via || 'dom') + '</td></tr>'
    ).join('') : '<p class="muted">None recorded.</p>';

    const contrib = Array.isArray(st.contributors) ? st.contributors : [];
    const contribHtml = contrib.length ? contrib.slice(0, 30).map((c) =>
      '<tr><td>' + esc(c.name) + '</td><td>' + (c.versions || 0) + '</td><td>' + (c.edits || 0) + '</td></tr>'
    ).join('') : '<p class="muted">No contributor names available.</p>';

    const parts = Array.isArray(st.scoreParts) ? st.scoreParts : [];
    const partsHtml = parts.length ? parts.map((p) =>
      '<div class="brow"><span>' + esc(p.label) + '</span><span class="bar2"><span style="width:' +
      Math.round(p.q * 100) + '%"></span></span><span class="bdet">' + Math.round(p.q * 100) + '% — ' + esc(p.detail) + '</span></div>'
    ).join('') : '<p class="muted">Not enough data for a score.</p>';

    const signals = Array.isArray(st.signals) ? st.signals : [];
    const sevLabel = { high: '⚠ High', warn: '⚠ Notable', note: '· Noted', good: '✓ Good', info: '· Info' };
    const signalsHtml = signals.length
      ? signals.map((s) => '<div class="sig"><span class="sigsev" data-s="' + esc(s.severity) + '">' +
          esc(sevLabel[s.severity] || s.severity) + '</span><span><b>' + esc(s.title) + '</b> — ' + esc(s.summary) +
          (Array.isArray(s.evidence) && s.evidence.length
            ? '<div class="muted" style="margin-top:2px">' + s.evidence.map((e) => esc(e)).join(' · ') + '</div>' : '') +
          '</span></div>').join('') +
        '<p class="muted">Signals describe patterns, not intent — use them as conversation starters, never as proof of misconduct.</p>'
      : '<p class="muted">No unusual patterns were flagged by the local heuristics.</p>';

    const aiRun = rec.ai && rec.ai.text ? rec.ai : null;
    const aiHtml = aiRun
      ? '<section><h2>AI read of this process</h2>' +
        '<p class="muted">' + esc(aiRun.model || 'model') + ' · analyzed ' + esc(new Date(aiRun.at).toISOString()) +
        ' — an interpretation of the metadata below the fold, not new evidence.</p>' +
        '<p style="white-space:pre-wrap">' + esc(aiRun.text) + '</p></section>'
      : '';

    const card = (lab, val) => '<div class="card"><div class="num">' + esc(val) + '</div><div class="lab">' + esc(lab) + '</div></div>';

    return '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8" />' +
      '<title>Revision summary — ' + esc(d.title || 'Document') + '</title>' +
      '<meta name="revbanner-signature" content="' + esc(sig) + '" />' +
      '<style>' +
      ':root{--bg:#f7f9fd;--fg:#0f172a;--muted:#64748b;--card:#fff;--border:#d9e1f0;--accent:#4f46e5;--good:#16a34a;--warn:#d97706;--bad:#dc2626}' +
      '@media (prefers-color-scheme: dark){:root{--bg:#0b1220;--fg:#e2e8f0;--muted:#94a3b8;--card:#131f36;--border:#1e293b;--accent:#818cf8}}' +
      '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.wrap{max-width:860px;margin:0 auto;padding:28px 22px 60px}h1{font-size:22px;margin:0 0 2px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:26px 0 8px}' +
      '.sub{color:var(--muted);font-size:12.5px;margin:0}header{border-bottom:1px solid var(--border);padding-bottom:14px}' +
      '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:10px;margin-top:14px}' +
      '.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center}' +
      '.num{font-size:20px;font-weight:750;font-variant-numeric:tabular-nums}.lab{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-top:2px}' +
      'table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}th{text-align:left;color:var(--muted);border-bottom:1px solid var(--border);padding:5px 6px}td{border-bottom:1px solid var(--border);padding:4px 6px;white-space:nowrap}' +
      '.tw{max-height:230px;overflow:auto;border:1px solid var(--border);border-radius:10px;background:var(--card)}' +
      '.chart{display:flex;align-items:flex-end;gap:2px;height:90px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:8px}' +
      '.bar{flex:1;display:flex;align-items:flex-end;height:100%}.bar span{display:block;width:100%;border-radius:2px 2px 0 0;background:var(--accent);opacity:.85}' +
      '.brow{display:grid;grid-template-columns:130px 1fr 220px;gap:10px;align-items:center;font-size:12px;margin:6px 0}' +
      '.bar2{height:8px;border-radius:4px;background:var(--card);border:1px solid var(--border);overflow:hidden}.bar2 span{display:block;height:100%;background:var(--accent)}' +
      '.bdet{color:var(--muted);font-size:10.5px;text-align:right}.muted{color:var(--muted);font-size:12px}' +
      '.sig{display:flex;gap:8px;margin:8px 0;font-size:12.5px;align-items:flex-start}' +
      '.sigsev{flex:0 0 auto;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-radius:999px;padding:2px 8px;margin-top:1px;background:var(--card);border:1px solid var(--border);color:var(--muted)}' +
      '.sigsev[data-s="high"]{color:var(--bad);border-color:var(--bad)}.sigsev[data-s="warn"]{color:var(--warn);border-color:var(--warn)}' +
      '.sigsev[data-s="good"]{color:var(--good);border-color:var(--good)}.sigsev[data-s="note"]{color:var(--accent);border-color:var(--accent)}' +
      'dl{display:grid;grid-template-columns:150px 1fr;gap:4px 12px;font-size:13px;margin:0}dt{color:var(--muted)}dd{margin:0;word-break:break-all}' +
      'footer{margin-top:34px;border-top:1px solid var(--border);padding-top:12px;font-size:11.5px;color:var(--muted)}' +
      '</style></head><body><main class="wrap">' +
      '<header><h1>Revision Banner — writing-process summary</h1>' +
      '<p class="sub">Generated locally on the author\u2019s machine · exported ' + esc(fmtDate(payload.exportedAt)) +
      ' · extension v' + esc(payload.extVersion || '') + '</p></header>' +
      '<section><h2>Document</h2><dl>' +
      '<dt>Title</dt><dd>' + esc(d.title || '—') + '</dd>' +
      '<dt>Google file ID</dt><dd>' + esc(d.id || '—') + '</dd>' +
      '<dt>URL</dt><dd>' + esc(d.url || '—') + '</dd>' +
      '<dt>Author account (detected)</dt><dd>' + esc(d.account || 'not detected') + '</dd>' +
      '</dl></section>' +
      '<section><h2>At a glance</h2><div class="grid">' +
      card('Edits', fmtNum(st.edits ? st.edits.value : 0) + '') +
      card('Active time', fmtDur(st.activeMs)) +
      card('Sessions', String(st.sessions != null ? st.sessions : '—')) +
      card('Contributors', String(st.contributorsCount != null ? st.contributorsCount : '—')) +
      card('Bulk inserts', String(Array.isArray(st.bulk) ? st.bulk.length : 0)) +
      card('First activity', st.earliest ? fmtDate(st.earliest) : '—') +
      card('Latest activity', st.latest ? fmtDate(st.latest) : '—') +
      card('Active days', String(st.activeDays != null ? st.activeDays : '—')) +
      card('Process score', st.score != null ? st.score + '/100' : '—') +
      '</div><p class="muted">Edits source: ' + esc(st.edits ? st.edits.label : '—') + ' (live tracking covers this machine only; version history comes from Google). Active source: ' + esc(st.activeLabel || 'live tracking (since install)') + '.</p></section>' +
      '<section><h2>Writing-process score breakdown</h2>' + partsHtml +
      '<p class="muted">Heuristic based on paste ratio, sessions and spread — a conversation starter, not proof of anything.</p></section>' +
      '<section><h2>Suspicious-edit signals</h2>' + signalsHtml + '</section>' + aiHtml +
      '<section><h2>Work sessions</h2>' +
      (sessHtml ? '<div class="tw"><table><tr><th>Started</th><th>Active</th><th>Edits</th><th>Keys</th><th>Chars +/−</th><th>Bulk</th></tr>' + sessHtml + '</table></div>'
        : '<p class="muted">No live sessions recorded on this machine (extension may have been installed after the work was done).</p>') +
      (roll.sessions ? '<p class="muted">+' + roll.sessions + ' older sessions aggregated beyond the retention window.</p>' : '') +
      '</section>' +
      '<section><h2>Bulk insertions (paste flags)</h2>' +
      (bulk.length ? '<div class="tw"><table><tr><th>When</th><th>Chars</th><th>Source</th></tr>' + bulkHtml + '</table></div>' : bulkHtml) +
      '</section>' +
      '<section><h2>Contributors</h2>' +
      (contrib.length ? '<div class="tw"><table><tr><th>Name</th><th>Version entries</th><th>Edit entries</th></tr>' + contribHtml + '</table></div>' : contribHtml) +
      '</section>' +
      '<section><h2>Edits per day</h2><div class="chart">' + (dailyHtml || '<p class="muted">No activity data.</p>') + '</div></section>' +
      '<section><h2>Data sources</h2><p class="muted">Live sessions: ' + live.length + ' · version-history entries: ' + versions.length +
      ' · network op timestamps: ' + ops.length + ' · data collected entirely on the author\u2019s machine.</p></section>' +
      '<footer>To verify: open Revision Banner\u2019s toolbar popup → \u201cVerify a student submission\u2026\u201d and load this file. The file carries a ' +
      'tamper-evident signature; the real check is cross-referencing its claims against Google\u2019s own version history, which the Verify page does automatically.</footer>' +
      '</main>' +
      '<script type="application/json" id="revbanner-data">' + embedStr + '</scr' + 'ipt>' +
      '</body></html>';
  }

  /* =====================================================================
   * 12. Boot
   * ===================================================================== */

  async function main() {
    const cfg = await loadSettings();
    const ctx = detectContext();
    if (!ctx) return;
    if (cfg.apps && cfg.apps[ctx.app] === false) return;

    const rec = await loadRecord(ctx);
    const state = { dirty: true };
    const markDirty = () => { state.dirty = true; };

    const ui = new BannerUI(ctx, cfg);
    const engine = new OffsetEngine(ctx.app, cfg, ui);
    ui.setOverlayMode(engine.mode === 'overlay');

    const tracker = new LiveTracker(cfg, rec, markDirty);
    const saveNow = () => { saveRecord(rec, cfg); };
    tracker.onSave = saveNow;

    const history = new HistoryManager(cfg, rec, tracker, ui, markDirty, saveNow);

    // Approximate current word count (Docs) — powers the words-per-session
    // context and the AI payload. One cheap pass every 30s.
    if (ctx.app === 'docs') {
      setInterval(() => {
        try {
          if (document.hidden) return;
          const ed = $('#docs-editor');
          if (!ed) return;
          const txt = ed.textContent || '';
          if (!txt) return;
          const n = (txt.match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []).length;
          if (n && Math.abs(n - (rec.words || 0)) >= 5) { rec.words = n; markDirty(); }
        } catch (e) { /* ignore */ }
      }, 30000);
    }

    // UI actions
    ui.onAct = async (act) => {
      try {
        switch (act) {
          case 'sync': await history.autoImport(false); break;
          case 'drive-sync': await history.driveSync(); break;
          case 'ai-analyze': await aiAnalyze(); break;
          case 'diag-overlap': {
            const text = collectOverlapDiagnostics();
            (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject())
              .then(() => ui.toast('Layout diagnostics copied — paste it into the chat with support ✓', 4000))
              .catch(() => {
                try {
                  const ta = document.createElement('textarea');
                  ta.value = text;
                  ta.style.position = 'fixed';
                  ta.style.opacity = '0';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  ta.remove();
                  ui.toast('Layout diagnostics copied ✓', 3000);
                } catch (e) { ui.toast('Copy failed — open Details and select the report manually.', 4000); }
              });
            break;
          }
          case 'details': if (ui.detailsOpen) ui.closeDetails(); else ui.openDetails(); state.dirty = true; break;
          case 'close-details': ui.closeDetails(); break;
          case 'collapse': ui.setCollapsed(true); break;
          case 'expand': ui.setCollapsed(false); break;
          case 'gear': openOptions(); break;
          case 'copy-summary': copySummary(); break;
          case 'export-submission': await exportSubmission(); break;
          case 'export-csv': exportCsv(); break;
          case 'export-json': exportJson(); break;
          case 'forget': forgetFile(); break;
          default: break;
        }
      } catch (e) { log('action error ' + act + ': ' + e); }
    };

    function currentStats() {
      const s = computeStats(rec, cfg);
      ui.setLastStats(s);
      return s;
    }

    // Optional AI tier: sends ONLY process metadata (times, sizes, counts,
    // signals — never document text) to the user-configured endpoint.
    async function aiAnalyze() {
      try {
        if (!cfg.ai || !cfg.ai.enabled || !cfg.ai.key) {
          ui.toast('AI analysis is off — enable it in Settings (⚙) with your own API key.', 4500);
          return;
        }
        ui.toast('Asking the AI to read this writing process…', 4500);
        const s = currentStats();
        const insights = computeInsights(s, rec, cfg);
        const payload = buildAiPayload(s, insights, rec);
        const r = await bgMsg({ type: 'ai-analyze', payload });
        if (r && r.ok && r.text) {
          rec.ai = { at: nowMs(), model: r.model || cfg.ai.model || '', text: r.text };
          markDirty();
          saveNow();
          ui.toast('AI analysis ready — see "Suspicious-edit signals" ✓', 3500);
        } else {
          ui.toast('AI analysis failed: ' + ((r && r.error) || 'unknown error'), 6500);
        }
      } catch (e) {
        log('ai analyze error: ' + e);
        ui.toast('AI analysis failed: ' + e, 5000);
      }
    }

    function copySummary() {
      const s = currentStats();
      const lines = [
        'Revision summary — "' + (rec.title || 'Untitled') + '"',
        'Edits: ' + fmtNum(s.edits.value) + ' (' + s.edits.label + ')',
        'Active time: ' + fmtDur(s.activeMs) + ' · Sessions: ' + s.sessions + ' · Contributors: ' + s.contributorsCount,
        'Bulk insertions: ' + s.bulk.length + (s.bulk.length ? ' (largest ' + Math.max.apply(null, s.bulk.map((b) => b.chars || 0)) + ' chars)' : ''),
        'First activity: ' + (s.earliest ? fmtDate(s.earliest) : '—') + ' · Latest: ' + (s.latest ? fmtDate(s.latest) : '—'),
        'Process score: ' + (s.score.value != null ? s.score.value + '/100' : 'n/a') + ' (heuristic — not proof of anything)',
        'Data: local browser storage via Revision Banner.'
      ];
      const text = lines.join('\n');
      (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => ui.toast('Summary copied to clipboard ✓', 3000))
        .catch(() => {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            ui.toast('Summary copied ✓', 2500);
          } catch (e) { ui.toast('Copy failed — select the summary from Details instead.', 4000); }
        });
    }

    function exportCsv() {
      const s = currentStats();
      const rows = [['kind', 'timestamp_iso', 'editor', 'detail']];
      for (const v of rec.hist.versions) rows.push(['version', new Date(v.ts).toISOString(), v.editor || '', (v.edits ? v.edits + ' edits' : '')]);
      for (const o of rec.hist.ops) rows.push(['op', new Date(o.ts).toISOString(), '', '']);
      for (const sess of rec.live.sessions) {
        rows.push(['session-start', new Date(sess.start).toISOString(), rec.account || 'You', 'active=' + fmtDur(sess.activeMs) + ';edits=' + (sess.edits || 0)]);
        if (sess.end) rows.push(['session-end', new Date(sess.end).toISOString(), rec.account || 'You', 'chars+' + (sess.addChars || 0) + '/-' + (sess.delChars || 0)]);
      }
      for (const p of s.pastes) rows.push(['paste', new Date(p.t).toISOString(), rec.account || 'You', p.chars + ' chars (' + (p.via || 'dom') + ')']);
      rows.push(['summary', new Date().toISOString(), '', 'edits=' + s.edits.value + ';active=' + fmtDur(s.activeMs) + ';sessions=' + s.sessions + ';score=' + (s.score.value != null ? s.score.value : 'n/a')]);
      const csv = rows.map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
      downloadText(safeName(rec.title) + '-revision-history.csv', csv, 'text/csv');
      ui.toast('CSV exported ✓', 2500);
    }

    function exportJson() {
      const s = currentStats();
      downloadText(safeName(rec.title) + '-revision-data.json',
        JSON.stringify({ exportedAt: new Date().toISOString(), record: rec, stats: { edits: s.edits, sessions: s.sessions, activeMs: s.activeMs, contributors: s.contributors, score: s.score } }, null, 2),
        'application/json');
      ui.toast('JSON exported ✓', 2500);
    }

    async function exportSubmission() {
      try {
        const s = currentStats();
        const payload = {
          v: 1,
          kind: 'revbanner-submission',
          exportedAt: nowMs(),
          extVersion: '1.1.0',
          doc: { id: rec.id, app: rec.app, title: rec.title, url: rec.url, account: rec.account || null },
          record: JSON.parse(JSON.stringify(rec)),
          stats: {
            edits: { value: s.edits.value, source: s.edits.source, label: s.edits.label },
            activeMs: s.activeMs, activeLabel: s.activeLabel || '', histActiveMs: s.histActiveMs || 0, sessions: s.sessions,
            contributors: s.contributors, contributorsCount: s.contributorsCount,
            bulk: s.bulk, bulkChars: s.bulkChars, pastedShare: s.pastedShare != null ? Math.round(s.pastedShare * 100) / 100 : null,
            words: s.words || null,
            earliest: s.earliest, latest: s.latest, activeDays: s.activeDays,
            daily: Array.from(s.daily.entries ? s.daily.entries() : []),
            score: s.score.value, scoreParts: s.score.parts,
            signals: computeInsights(s, rec, cfg)
          }
        };
        const payloadStr = JSON.stringify(payload);
        const sig = await hmacSign(payloadStr);
        if (!sig) { ui.toast('Could not sign the export (WebCrypto unavailable in this context).', 5000); return; }
        const html = buildSubmissionHtml(payload, payloadStr, sig);
        downloadText(safeName(rec.title) + '-revision-summary.html', html, 'text/html');
        ui.toast('Submission summary exported — attach that file when turning in the project ✓', 6000);
      } catch (e) {
        log('exportSubmission error: ' + e);
        ui.toast('Export failed: ' + e, 5000);
      }
    }

    async function forgetFile() {
      const ok = confirm('Forget all Revision Banner data for this document?\n\nThis only clears the stats stored on this machine — the document itself is untouched.');
      if (!ok) return;
      state.forgotten = true;
      await store.remove('files:' + rec.id);
      await bgMsg({ type: 'clear-file', id: rec.id });
      ui.toast('This file was forgotten. Reload the page to start fresh.', 5000);
      ui.closeDetails();
    }

    function safeName(t) {
      return String(t || 'document').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'document';
    }

    // Wire height changes to offset engine + fixed-chrome shift
    const fixedShift = installFixedShift();
    ui.onHeightChange = (h) => {
      engine.setHeight(h);
      fixedShift.kick();
      rec.ui = rec.ui || {};
      rec.ui.collapsed = ui.collapsed;
      rec.ui.hidden = ui.hidden;
      markDirty();
    };
    ui.onDetailsGo = () => {};

    // Initial UI state from record / settings
    if (rec.ui && rec.ui.collapsed) ui.setCollapsed(true);
    else if (cfg.bannerDefaultCollapsed) ui.setCollapsed(true);
    if (rec.ui && rec.ui.hidden) ui.setHidden(true);
    ui.emitHeight();

    // Render loop
    setInterval(() => {
      try {
        if (!state.dirty && !ui.detailsOpen) return;
        const stats = currentStats();
        ui.render(stats, rec, tracker);
        if (ui.detailsOpen) ui.renderDetails(stats, rec, tracker, history);
        state.dirty = false;
      } catch (e) { log('render loop error: ' + e); }
    }, 1200);

    // Refresh relative times + theme re-check periodically
    setInterval(() => { state.dirty = true; }, 30000);

    // Theme detection: sample the page background (Google apps follow their own theme)
    const applyTheme = () => {
      try {
        if (cfg.darkMode === 'dark') return ui.setTheme(true);
        if (cfg.darkMode === 'light') return ui.setTheme(false);
        let dark = false;
        try {
          const bg = getComputedStyle(document.body).backgroundColor || '';
          const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (m) {
            const lum = (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
            dark = lum < 0.35;
          }
        } catch (e) { /* ignore */ }
        if (!dark) {
          try { dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { /* ignore */ }
        }
        ui.setTheme(dark);
      } catch (e) { /* ignore */ }
    };
    applyTheme();
    setInterval(applyTheme, 5000);

    // Account label
    const grabAccount = () => {
      const a = scrapeAccountLabel();
      if (a && a !== rec.account) { rec.account = a; state.dirty = true; }
    };
    grabAccount();
    setInterval(grabAccount, 30000);

    // Watchdog: keep the banner mounted and offsets sane
    setInterval(() => {
      try {
        if (!ui.host.isConnected) document.body.appendChild(ui.host);
        if (!state.forgotten) engine.scheduleCheck(0);
      } catch (e) { /* ignore */ }
    }, 5000);

    // Title changes
    try {
      const titleEl = document.querySelector('title');
      if (titleEl) {
        new MutationObserver(() => {
          const t = cleanTitle(document.title);
          if (t && t !== rec.title) { rec.title = t; state.dirty = true; }
        }).observe(titleEl, { childList: true, characterData: true, subtree: true });
      }
    } catch (e) { /* ignore */ }

    // Runtime messages (Alt+Shift+R command from the background worker)
    try {
      chrome.runtime.onMessage.addListener((m) => {
        try {
          if (m && m.type === 'toggle-banner') ui.cycleVisibility();
        } catch (e) { /* ignore */ }
        return false;
      });
    } catch (e) { /* ignore */ }

    // Page keyboard shortcuts (documented in README)
    document.addEventListener('keydown', (e) => {
      try {
        if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const k = (e.key || '').toLowerCase();
        if (k === 'r') { ui.cycleVisibility(); e.preventDefault(); }
        else if (k === 'd') { if (ui.detailsOpen) ui.closeDetails(); else ui.openDetails(); e.preventDefault(); }
      } catch (err) { /* ignore */ }
    }, { capture: true });

    // Smart auto-import scheduling
    setTimeout(() => {
      try {
        if (state.forgotten || cfg.autoSync === 'off') return;
        const lastTry = rec.hist.lastAutoTry || 0;
        const minGap = Math.max(5, cfg.autoSyncEveryMinutes) * 60000;
        if (nowMs() - lastTry < minGap) return;
        if (history.findPanel()) return; // pane already open — watcher imports it
        if (cfg.autoSync === 'smart' && (tracker.session.keys || 0) > 0) return; // don't disturb active typing
        history.autoImport(true);
      } catch (e) { log('auto import schedule error: ' + e); }
    }, cfg.autoSync === 'always' ? 4000 : 12000);

    // Optional Drive API auto-sync (only if configured)
    if (cfg.driveApiAuto) {
      setTimeout(() => {
        try {
          if (history.driveConfigured && (nowMs() - (rec.hist.fetchedAt || 0)) > 86400000) {
            history.driveSync();
          }
        } catch (e) { /* ignore */ }
      }, 8000);
    }

    // Flush on unload
    window.addEventListener('beforeunload', () => { try { tracker.flush(); } catch (e) { /* ignore */ } });

    state.dirty = true;
    log('Revision Banner mounted on ' + ctx.app + ' file ' + ctx.fileId);
  }

  main().catch((e) => {
    try { console.warn('[RevisionBanner] boot failed:', e); } catch (err) { /* ignore */ }
  });
})();
