/**
 * Build-time transform: turns the reflection questions inside a lesson's
 * discovery blocks (bug hunts, tinker challenges, socratic checkpoints)
 * into a fillable lab form.
 *
 * Every question paragraph / list item gets a textarea with a stable,
 * deterministic id (`1.1c:tk1:q2` = lesson 1.1c, first tinker block,
 * second question). The question text rides along in a data attribute so
 * the downloaded JSON is self-describing for the teacher, and the grader
 * can match answers against src/data/answerKeys.ts by id.
 *
 * Design split: Discovery Labs produce .java files (students submit those
 * as code); these boxes capture the predict/explain/reflect answers that
 * surround the code. See docs on /teachers/canvas.html.
 */

export interface FormifyResult {
  html: string;
  questionCount: number;
}

/** Short codes for question ids, stable across rebuilds. */
const SHORT: Record<string, string> = { 'bug-hunt': 'bh', tinker: 'tk', socratic: 'sc' };

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&#8212;': '—',
  '&ndash;': '–',
  '&#8211;': '–',
  '&times;': '×',
  '&#215;': '×',
  '&middot;': '·',
  '&#8226;': '•',
  '&#8203;': '',
  '&#8658;': '⇒',
  '&rarr;': '→',
  '&#8594;': '→',
  '&#10003;': '✓',
  '&#10007;': '✗',
};

/** Strip markup + decode the entities the lesson bodies actually use. */
function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#?\w+;/g, (e) => ENTITY_MAP[e] ?? e)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape for a double-quoted HTML attribute. */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Should this text get an answer box?
 * Yes when it asks a question; no when it is a bare instruction that ends
 * with a period or a colon ("Create RemoveExperiment.java:").
 */
function isQuestion(text: string): boolean {
  if (!text || text.length < 12) return false;
  if (text.includes('?')) return true;
  return !/[.:]$/.test(text);
}

function field(qid: string, block: string, question: string): string {
  const q = escapeAttr(question.slice(0, 400));
  return (
    '<label class="lab-field" data-pagefind-ignore>' +
    '<span class="lab-field-label">Your answer</span>' +
    '<textarea class="lab-answer" rows="2" data-q="' + qid + '" data-block="' + block +
    '" data-question="' + q + '" placeholder="write your answer, then keep going"></textarea>' +
    '</label>'
  );
}

/**
 * Inject answer boxes into every bug-hunt / tinker / socratic block of a
 * lesson body. Pure string transform — safe to run on the verbatim
 * migrated HTML (blocks contain no nested divs; verified site-wide).
 */
export function formify(body: string, lessonId: string): FormifyResult {
  const counters: Record<string, number> = {};
  let questionCount = 0;

  const html = body.replace(
    /(<div class="(bug-hunt|tinker|socratic)">)([\s\S]*?)(<\/div>)/g,
    (_m, open: string, cls: string, inner: string, close: string) => {
      counters[cls] = (counters[cls] ?? 0) + 1;
      const blockId = lessonId + ':' + SHORT[cls] + counters[cls];
      let qn = 0;
      const next = () => blockId + ':q' + ++qn;

      let out = inner;

      // Ordered-list questions (socratic checkpoints, tinker steps).
      // (\s[^>]*)? requires whitespace or nothing after the tag name, so
      // <pre> can never match as <p re> and swallow code blocks.
      out = out.replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/g, (m, at: string, li: string) => {
        const text = plainText(li);
        if (!isQuestion(text)) return m;
        return '<li' + (at ?? '') + '>' + li + field(next(), cls, text) + '</li>';
      });

      // Standalone question paragraphs (code in <pre> is never touched).
      out = out.replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/g, (m, at: string, p: string) => {
        const text = plainText(p);
        if (!isQuestion(text)) return m;
        return m + field(next(), cls, text);
      });

      questionCount += qn;
      return open + out + close;
    },
  );

  return { html, questionCount };
}
