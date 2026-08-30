/**
 * Answer keys for auto-graded lab questions.
 *
 * Keys are optional: every question is completeness-graded (answered or
 * not) without one. Add a key for questions with an objective answer and
 * scripts/grade-submissions.mjs will score them too.
 *
 * Find question ids with:  npm run dump-questions
 *
 * accept  - list of accepted answers. Each entry is matched against the
 *           student's answer (lowercased, whitespace collapsed):
 *             - a plain string  -> correct if the answer CONTAINS it
 *             - 're:PATTERN'    -> correct if the regex matches
 * all     - true = every entry must match; default = any entry matches
 * note    - shown to the teacher in the feedback file
 */
export interface AnswerKey {
  accept: string[];
  all?: boolean;
  note?: string;
}

export const ANSWER_KEYS: Record<string, Record<string, AnswerKey>> = {
  '1.1c': {
    '1.1c:tk1:q1': {
      accept: ['integer division', 'truncat', 'chop', 'cut off', 'cut the decimal', 'drops the decimal', 're:rounds?\\s+down', 'no decimal'],
      note: 'int / int chops the decimal — integer division',
    },
    '1.1c:sc1:q1': {
      accept: ['cast', '10.0', 'double'],
      note: 'make an operand a double: 10.0 / 3 or (double) 10 / 3',
    },
    '1.1c:bh1:q1': {
      accept: ['91', 'integer division', 'truncat', 'chop'],
      note: '274/3 = 91.33… but int/int truncates to 91.0',
    },
    '1.1c:tk3:q2': {
      accept: ['3.5'],
      all: false,
      note: 'both print 3.5 — either operand being double is enough',
    },
  },
  '1.7c': {
    '1.7c:sc1:q2': {
      accept: ['re:\\b0\\b', 'zero'],
      note: '(int) cast binds first: 0 * sides = 0, every time',
    },
  },
  '1.8b': {
    '1.8b:tk3:q1': {
      accept: ['2147483647'],
      note: 'MAX_VALUE+1 wraps to MIN_VALUE — the odometer',
    },
    '1.8b:sc1:q2': {
      accept: ['re:5.*6'],
      note: 'x++ uses the old value (y=5); ++x increments first (y=6)',
    },
  },
  '2.5a': {
    '2.5a:sc1:q2': {
      accept: ['static'],
    },
    '2.5a:tk1:q1': {
      accept: ['chop', 'truncat', 'cut', 'drops the', 're:rounds?\\s+down'],
      note: 'casting to int truncates — no rounding',
    },
    '2.5a:tk2:q1': {
      accept: ['min'],
      note: 'Math.min(20, strength)',
    },
    '2.5a:tk2:q2': {
      accept: ['max'],
      note: 'Math.max(0, hp)',
    },
  },
};
