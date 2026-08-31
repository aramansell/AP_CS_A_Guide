/*
 * Revision Banner — MAIN-world network observer.
 *
 * Runs in the page's own JS context (world: "MAIN") at document_start so it
 * can observe the collaborative-editing traffic Google Docs performs when it
 * loads a document and when the version-history pane is opened. Captured
 * payloads are forwarded to the isolated-world content script
 * (content/banner.js) via window.postMessage.
 *
 * This script must NEVER throw and NEVER change observable behaviour of the
 * page beyond the patches below. Everything is wrapped defensively.
 */
(function () {
  'use strict';
  if (window.__revBannerMainInstalled) return;
  try { window.__revBannerMainInstalled = true; } catch (e) { return; }

  // Docs spawns many same-origin utility iframes (comments, sandbox frames…).
  // Document traffic flows through the top frame; patching fetch/XHR in every
  // iframe multiplied memory pressure and was implicated in renderer OOM
  // crashes, so capture only in the top frame.
  try {
    if (window.top !== window) return;
  } catch (e) { /* cross-origin top access — stay installed */ }

  var MAX_CAPTURE_BYTES = 6 * 1024 * 1024; // don't blow up memory
  // Only look at payloads that plausibly carry revision/ops data.
  var INTERESTING = /(\/bind\?|\/bind&|fetchrevision|\/revisions|revision|revs=true|gsessionid)/i;

  function post(payload) {
    try {
      window.postMessage({ source: 'revbanner-net', payload: payload }, window.location.origin || '*');
    } catch (e) { /* ignore */ }
  }

  function looksInteresting(url) {
    try { return typeof url === 'string' && INTERESTING.test(url); } catch (e) { return false; }
  }

  // ---- XMLHttpRequest -------------------------------------------------
  try {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__revBannerUrl = (arguments.length > 1) ? String(arguments[1]) : String(url);
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      var xhr = this;
      try {
        if (looksInteresting(xhr.__revBannerUrl)) {
          xhr.addEventListener('load', function () {
            try {
              var rt = xhr.responseType;
              if (rt !== '' && rt !== 'text') return;
              var text = xhr.responseText;
              if (!text || text.length === 0 || text.length > MAX_CAPTURE_BYTES) return;
              post({ kind: 'xhr', url: xhr.__revBannerUrl, text: text.slice(0, MAX_CAPTURE_BYTES) });
            } catch (e) { /* ignore */ }
          }, { passive: true });
        }
      } catch (e) { /* ignore */ }
      return origSend.apply(this, arguments);
    };
  } catch (e) { /* ignore */ }

  // ---- fetch ------------------------------------------------------------
  try {
    if (typeof window.fetch === 'function' && !window.__revBannerFetchPatched) {
      window.__revBannerFetchPatched = true;
      var origFetch = window.fetch;
      window.fetch = function (input, init) {
        var p = origFetch.apply(this, arguments);
        try {
          var url = '';
          if (typeof input === 'string') url = input;
          else if (input && typeof input.url === 'string') url = input.url;
          else if (input && input.toString) { try { url = String(input); } catch (e2) { url = ''; } }
          if (looksInteresting(url)) {
            p.then(function (res) {
              try {
                if (!res || !res.clone) return;
                var c = res.clone();
                c.text().then(function (text) {
                  if (!text || text.length === 0 || text.length > MAX_CAPTURE_BYTES) return;
                  post({ kind: 'fetch', url: url, text: text.slice(0, MAX_CAPTURE_BYTES) });
                }).catch(function () { /* ignore */ });
              } catch (e) { /* ignore */ }
            }).catch(function () { /* ignore */ });
          }
        } catch (e) { /* ignore */ }
        return p;
      };
    }
  } catch (e) { /* ignore */ }
})();
