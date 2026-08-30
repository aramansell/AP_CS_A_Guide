/**
 * Lab forms — client side. No dependencies.
 *
 * - Restores/saves every .lab-answer textarea to localStorage, keyed by
 *   the stable question id (apcsa-lab-answers).
 * - Student name is shared across lessons (apcsa-lab-student).
 * - "Download answers" writes a self-describing JSON file the teacher
 *   collects via a Canvas file-upload assignment and grades with
 *   scripts/grade-submissions.mjs. See /teachers/canvas.html.
 */
(function () {
  'use strict';

  var AKEY = 'apcsa-lab-answers';
  var NKEY = 'apcsa-lab-student';

  var bar = document.querySelector('.lab-bar');
  if (!bar) return;

  var lesson = bar.dataset.lesson || '';
  var lessonTitle = bar.dataset.lessonTitle || '';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('textarea.lab-answer'));
  var countEl = document.getElementById('lab-count');
  var nameEl = document.getElementById('lab-student');
  var dlBtn = document.getElementById('lab-download');

  function readAnswers() {
    try { return JSON.parse(localStorage.getItem(AKEY) || '{}'); }
    catch (e) { return {}; }
  }
  function writeAnswers(data) {
    try { localStorage.setItem(AKEY, JSON.stringify(data)); } catch (e) { /* private mode */ }
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

  var saved = readAnswers();
  boxes.forEach(function (t) {
    if (saved[t.dataset.q]) t.value = saved[t.dataset.q];
    t.addEventListener('input', function () {
      saveTimerStart(function () {
        var a = readAnswers();
        a[t.dataset.q] = t.value;
        writeAnswers(a);
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
    var payload = {
      format: 'apcsa-lab-answers/1',
      student: student,
      lesson: lesson,
      lessonTitle: lessonTitle,
      downloadedAt: new Date().toISOString(),
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
