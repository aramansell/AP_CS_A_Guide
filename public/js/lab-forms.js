/**
 * Lab forms & One-Shot Check Gate — client side. No dependencies.
 *
 * - Restores/saves every .lab-answer textarea to localStorage, keyed by
 *   the stable question id (apcsa-lab-answers).
 * - Student name is shared across lessons (apcsa-lab-student).
 * - Validates Guided Design boxes (or accepts a Teacher PIN) to unlock
 *   the day's *Check.java file stored as an XOR-obfuscated payload in #check-gate.
 * - "Download answers" writes a self-describing JSON file the teacher
 *   collects via a Canvas file-upload assignment and grades with
 *   scripts/grade-submissions.mjs. See /teachers/canvas.html.
 */
(function () {
  'use strict';

  var AKEY = 'apcsa-lab-answers';
  var NKEY = 'apcsa-lab-student';
  var GKEY = 'apcsa-gate-unlocked';

  var bar = document.querySelector('.lab-bar');
  var gateEl = document.getElementById('check-gate');
  if (!bar && !gateEl) return;

  var lesson = (bar && bar.dataset.lesson) || (gateEl && gateEl.dataset.lesson) || '';
  var lessonTitle = (bar && bar.dataset.lessonTitle) || '';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('textarea.lab-answer'));
  var countEl = document.getElementById('lab-count');
  var nameEl = document.getElementById('lab-student');
  var dlBtn = document.getElementById('lab-download');

  function readJson(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (e) { return {}; }
  }
  function writeJson(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* private mode */ }
  }
  function saveTimerStart(fn) {
    clearTimeout(saveTimerStart._t);
    saveTimerStart._t = setTimeout(fn, 250);
  }
  function updateCount() {
    if (!countEl) return;
    var n = 0;
    boxes.forEach(function (t) { if (t.value.trim()) n++; });
    countEl.textContent = n + '/' + boxes.length + ' answered';
    countEl.classList.toggle('some', n > 0);
  }

  var saved = readJson(AKEY);
  boxes.forEach(function (t) {
    if (saved[t.dataset.q]) t.value = saved[t.dataset.q];
    t.addEventListener('input', function () {
      t.classList.remove('needs-work');
      saveTimerStart(function () {
        var a = readJson(AKEY);
        a[t.dataset.q] = t.value;
        writeJson(AKEY, a);
        updateCount();
      });
    });
  });

  if (nameEl) {
    nameEl.value = localStorage.getItem(NKEY) || '';
    nameEl.addEventListener('input', function () {
      try { localStorage.setItem(NKEY, nameEl.value); } catch (e) {}
    });
  }

  updateCount();

  // ---- Check Gate Logic ----
  if (gateEl) {
    var verifyBtn = document.getElementById('gate-verify-btn');
    var pinInput = document.getElementById('gate-pin-input');
    var pinBtn = document.getElementById('gate-pin-btn');
    var feedbackEl = document.getElementById('gate-feedback');
    var unlockedEl = document.getElementById('gate-unlocked');
    var gateDlBtn = document.getElementById('gate-download-btn');

    var gateLesson = gateEl.dataset.lesson || lesson;
    var checkFile = gateEl.dataset.checkFile || 'Check.java';
    var payloadB64 = gateEl.dataset.payload || '';
    var keysB64 = gateEl.dataset.keys || '';
    var pinHashes = [];
    try { pinHashes = JSON.parse(gateEl.dataset.pinHashes || '[]'); } catch (e) { pinHashes = []; }

    function fnv1a(str) {
      var h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return (h >>> 0).toString(16);
    }

    function decodeBase64Bytes(b64) {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }

    function decodeDesignKeys() {
      if (!keysB64) return {};
      try {
        var bytes = decodeBase64Bytes(keysB64);
        var json = typeof TextDecoder !== 'undefined'
          ? new TextDecoder().decode(bytes)
          : String.fromCharCode.apply(null, bytes);
        return JSON.parse(json);
      } catch (e) {
        return {};
      }
    }

    function decodeCheckBytes() {
      var xored = decodeBase64Bytes(payloadB64);
      var key = 'apcsa-gate-' + gateLesson;
      var out = new Uint8Array(xored.length);
      for (var i = 0; i < xored.length; i++) {
        out[i] = xored[i] ^ key.charCodeAt(i % key.length);
      }
      return out;
    }

    function triggerCheckDownload() {
      if (!payloadB64) return;
      var bytes = decodeCheckBytes();
      var blob = new Blob([bytes], { type: 'text/x-java-source;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = checkFile;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }

    function norm(s) {
      return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function entryOk(entry, answer) {
      var a = norm(answer);
      if (entry.indexOf('re:') === 0) {
        try { return new RegExp(entry.slice(3), 'i').test(a); }
        catch (e) { return false; }
      }
      return a.indexOf(norm(entry)) !== -1;
    }

    function keyPasses(key, answer) {
      if (!key || !Array.isArray(key.accept) || !key.accept.length) return true;
      var results = key.accept.map(function (entry) { return entryOk(entry, answer); });
      return key.all ? results.every(Boolean) : results.some(Boolean);
    }

    function showFeedback(html, isError) {
      if (!feedbackEl) return;
      feedbackEl.innerHTML = html;
      feedbackEl.classList.toggle('error', !!isError);
      feedbackEl.hidden = false;
    }

    function clearFeedback() {
      if (!feedbackEl) return;
      feedbackEl.hidden = true;
      feedbackEl.innerHTML = '';
      feedbackEl.classList.remove('error');
    }

    function escapeHtml(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function setUnlocked(via, autoDownload) {
      var state = readJson(GKEY);
      if (!state[gateLesson]) {
        state[gateLesson] = { via: via, at: new Date().toISOString() };
        writeJson(GKEY, state);
      }
      gateEl.classList.add('is-unlocked');
      if (unlockedEl) unlockedEl.hidden = false;
      if (autoDownload) triggerCheckDownload();
    }

    var unlockedMap = readJson(GKEY);
    if (unlockedMap[gateLesson]) {
      setUnlocked(unlockedMap[gateLesson].via || 'saved', false);
    }

    if (verifyBtn) {
      verifyBtn.addEventListener('click', function () {
        clearFeedback();
        boxes.forEach(function (t) { t.classList.remove('needs-work'); });

        var designKeys = decodeDesignKeys();
        var minRequired = Math.max(1, Math.ceil(boxes.length * 0.75));
        var validCount = 0;
        var incomplete = [];
        var missed = [];

        boxes.forEach(function (t, idx) {
          var qid = t.dataset.q;
          var key = designKeys[qid];
          var trimmed = t.value.trim();
          if (trimmed.length < 8) {
            t.classList.add('needs-work');
            incomplete.push({ num: idx + 1, el: t, q: t.dataset.question || '' });
          } else if (key && !keyPasses(key, t.value)) {
            t.classList.add('needs-work');
            missed.push({
              num: idx + 1,
              el: t,
              q: t.dataset.question || '',
              note: key.note || 'Re-read the prompt and check your design reasoning.'
            });
          } else {
            validCount++;
          }
        });

        if (validCount >= minRequired) {
          boxes.forEach(function (t) { t.classList.remove('needs-work'); });
          setUnlocked('design-check', true);
          showFeedback(
            '<strong>Design verified (' + validCount + '/' + boxes.length +
            ' boxes completed — meets the 75% threshold)!</strong> ' + escapeHtml(checkFile) +
            ' has been unlocked and downloaded. Run it below and aim for a one-shot pass!',
            false
          );
          return;
        }

        var items = [];
        missed.slice(0, 5).forEach(function (m) {
          var snip = m.q.slice(0, 65) + (m.q.length > 65 ? '…' : '');
          items.push(
            '<li><strong>Question ' + m.num + ' (needs refinement)</strong> (' +
            escapeHtml(snip) + '): ' + escapeHtml(m.note) + '</li>'
          );
        });
        var remSlots = Math.max(0, 5 - items.length);
        incomplete.slice(0, remSlots).forEach(function (it) {
          var snip = it.q.slice(0, 75) + (it.q.length > 75 ? '…' : '');
          items.push(
            '<li><strong>Question ' + it.num + ' (unanswered):</strong> ' +
            escapeHtml(snip) + '</li>'
          );
        });
        var remaining = (missed.length + incomplete.length) - items.length;
        var extra = remaining > 0
          ? '<li><em>…and ' + remaining + ' more box(es) you can complete or refine.</em></li>'
          : '';

        showFeedback(
          '<strong>You have completed ' + validCount + ' of ' + boxes.length +
          ' design boxes</strong> (need at least <strong>' + minRequired +
          '</strong> — 75% — to unlock <code>' + escapeHtml(checkFile) +
          '</code>):<ul>' + items.join('') + extra + '</ul>',
          false
        );
        var targetBox = missed.length ? missed[0].el : incomplete[0].el;
        if (targetBox) {
          targetBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetBox.focus();
        }
      });
    }

    function tryPinUnlock() {
      clearFeedback();
      var val = pinInput ? pinInput.value.trim().toUpperCase() : '';
      if (!val) {
        showFeedback('<strong>Enter a Teacher PIN</strong> or use "Verify My Design" above.', true);
        return;
      }
      if (pinHashes.indexOf(fnv1a(val)) !== -1) {
        setUnlocked('teacher-pin', true);
        showFeedback(
          '<strong>Unlocked with Teacher PIN!</strong> ' + escapeHtml(checkFile) +
          ' has downloaded — run it below.',
          false
        );
      } else {
        showFeedback(
          '<strong>Incorrect Teacher PIN.</strong> Double-check the PIN with your teacher or complete the Guided Design boxes above.',
          true
        );
      }
    }

    if (pinBtn) pinBtn.addEventListener('click', tryPinUnlock);
    if (pinInput) {
      pinInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          tryPinUnlock();
        }
      });
    }
    if (gateDlBtn) gateDlBtn.addEventListener('click', triggerCheckDownload);
  }

  // ---- JSON Export ----
  if (dlBtn) dlBtn.addEventListener('click', function () {
    var student = (nameEl && nameEl.value.trim()) || '';
    var answers = boxes.map(function (t) {
      return {
        id: t.dataset.q,
        block: t.dataset.block,
        question: t.dataset.question || '',
        answer: t.value.trim()
      };
    });
    var gateState = readJson(GKEY);
    var payload = {
      format: 'apcsa-lab-answers/1',
      student: student,
      lesson: lesson,
      lessonTitle: lessonTitle,
      downloadedAt: new Date().toISOString(),
      gateUnlocked: gateState[lesson] || null,
      answers: answers
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    var safe = (student || 'student').replace(/[^A-Za-z0-9._-]+/g, '_');
    var safeLesson = lesson.replace(/[^A-Za-z0-9._-]+/g, '_');
    a.href = URL.createObjectURL(blob);
    a.download = 'APCSA_' + safeLesson + '_' + safe + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    dlBtn.textContent = 'Downloaded — check your files';
    setTimeout(function () { dlBtn.textContent = 'Download answers (.json)'; }, 2500);
  });
})();
