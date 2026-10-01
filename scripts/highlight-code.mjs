#!/usr/bin/env node
/**
 * Syntax colouring for the built site — VS Code's own grammar, VS Code's own theme.
 *
 * The lessons are authored as raw HTML inside a template literal, so there is no
 * Markdown fence for Astro's Shiki integration to catch: the code is already
 * rendered markup by the time the page exists. The colouring therefore happens
 * here, as a step over `dist/` — `npm run build` runs this between `astro build`
 * and Pagefind, so the served page and the search index hold the same bytes.
 * (Dev mode does not run it; `npm run build` is the truth, and `dist/` is not
 * tracked here, so nothing is left out of step.)
 *
 * Why Shiki: it is VS Code's TextMate grammar driving VS Code's Dark+ theme, so
 * "stylize the code the way VS Code does" is not an impression of the editor, it
 * is the editor's tokenizer and the editor's palette. It is already on disk as
 * Astro's own dependency, so this imports it directly rather than adding a
 * second copy to package.json.
 *
 * The palette does NOT live here. Each token colour becomes a class (`tk-kw`,
 * `tk-ty`, …) and the nine hexes are written once, in public/style.css and
 * public/docs/style.css (the docs subtree carries its own stylesheet). This file
 * holds the mapping from hex to class name, which is a duplicate of those lists
 * — so `npm run verify` check 11 fails if the copies ever disagree, and fails again
 * if any colour reaches the page that the palette cannot name. A colour inlined
 * as `style="color:#…"` is how a future grammar update would try to arrive
 * unnoticed, and check 11 is what stops it.
 *
 * WHICH LANGUAGE, WHEN NOTHING SAYS. Principles colours a block only when it
 * declares `class="lang-cs"`. This course is the other case: all 900-odd blocks
 * are bare `<pre><code>`, and 185 files of Java do not want a hand-typed tag on
 * every one. So the default here is Java — the language of the course — and a
 * block is left alone when it is plainly not code:
 *
 *   - a block that is nothing but program output (`<span class="output">` and
 *     no code around it) stays muted, because it is the terminal, not the file;
 *   - a block with no `;`, no braces, no comment and no Java keyword is not code
 *     either — the merge-sort trace, the ASCII dungeon, the character sheet, the
 *     `iron sword,3,50,uncommon` CSV row. Colouring those as Java scatters
 *     green numbers through a picture;
 *   - a block whose first line is a shell command (`javac Dice.java …`, `java
 *     DiceCheck`, or a `$ ` prompt) is coloured as shell.
 *
 * A declared `class="lang-…"` still wins if one is ever added by hand.
 *
 * Inline markup inside a block (`<span class="output">`, `<em>`) is not code and
 * must not be tokenized: each is swapped for a marker before the grammar sees the
 * text and swapped back after, verbatim. This is also what makes a multi-line
 * `<span class="output">…</span>` survive — the marker is one token to Shiki, and
 * the span's own newlines come back inside the restored HTML.
 *
 *   node scripts/highlight-code.mjs            # colour dist/, report what it did
 *   HL_VERBOSE=1 node scripts/highlight-code.mjs   # …and name every block left plain
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';

const ROOT = path.resolve('dist');
const THEME = 'dark-plus'; // what current VS Code ships; not the old Dark+
const VERBOSE = !!process.env.HL_VERBOSE;

// hex -> class. Mirrors the `--tk-*` block in public/style.css and
// public/docs/style.css (verified there by check 11).
const PALETTE = {
  '#569CD6': 'tk-kw', // keyword: public, class, private, static, var
  '#C586C0': 'tk-ct', // control flow: using, if, for, return, foreach
  '#4EC9B0': 'tk-ty', // type: MonoBehaviour, Rigidbody2D, UnityEngine
  '#DCDCAA': 'tk-fn', // function: Start, GetComponent, Debug.Log
  '#9CDCFE': 'tk-va', // variable, field, parameter
  '#CE9178': 'tk-st', // string
  '#B5CEA8': 'tk-nu', // number
  '#6A9955': 'tk-cm', // comment
  '#D7BA7D': 'tk-es', // escape: \n, \t, \" inside a string — Java escapes are common here
};
const DEFAULT = '#D4D4D4'; // plain text: the page's own colour, no span

// Dark+ red, the grammar's `invalid.illegal`. It fires on `npm … -- 1.1c` where
// the shell grammar reads `1c` as a malformed number — the command is fine, the
// tokenizer is not. Emitting it would paint a working command red, so it is
// dropped to plain rather than added to the palette. Nothing is lost visually:
// the text is still there, in the page's own colour.
const IGNORE = new Set(['#F44747']);

// Language ids a block may declare, or that the detector may choose.
const LANGS = { java: 'java', cs: 'csharp', csharp: 'csharp', sh: 'bash', bash: 'bash', json: 'json', yaml: 'yaml' };
const LABELS = { java: 'Java', csharp: 'C#', bash: 'Shell', json: 'JSON', yaml: 'YAML' };

// --- "is this actually code?" ------------------------------------------------
// Lowercase Java keywords only: the course's data blocks say `Class: rogue` and
// `INT: 10` in caps, and a case-insensitive match would colour the character sheet.
const JAVA_WORD = /\b(?:public|private|protected|static|final|void|class|interface|enum|extends|implements|new|return|if|else|for|while|do|switch|case|default|break|continue|import|package|int|double|boolean|char|long|short|float|byte|String|System|true|false|null|this)\b/;
// Operators are the second signal, for expression-only blocks that carry no
// statement and no keyword: the De Morgan quickref is `!(a && b) == !a || !b`.
// Every one of these is unambiguous — none appears in the course's prose or
// program output, which is what keeps `You rolled a 12 + 5 = 17. HIT!` plain.
const JAVA_OP = /&&|\|\||==|!=|<=|>=|\+\+|--|\+=|-=|\*=|\/=|%=/;
const codeish = (t) => /[;{}]|\/\/|\/\*/.test(t) || JAVA_WORD.test(t) || JAVA_OP.test(t);

// First line of a shell transcript. `java` is here, not `javac` only, because the
// run step (`java DiceCheck`) is its own block.
const SHELL_CMD = /^\s*(?:javac|java|cd|ls|git|npm|npx|node|python3?|pip3?|mkdir|rm|mv|cp|cat|echo|grep|chmod|export|curl|make|junit)\s/;
const PROMPT = /^\s*\$\s/;

// A nested inline element (<span class="output">, <em>) is swapped for a marker
// while the grammar reads the block, and swapped back verbatim afterwards.
//
// The marker has to survive tokenizing *whole*: an exotic character does not.
// A plain identifier cannot be split by any C-family grammar — it is one token
// in every position a blank can appear — so it is the only safe carrier.
const MARK = 'zzhlmarkerzz';
const MARK_RE = /zzhlmarkerzz(\d+)zz/g;

const unesc = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&'); // &amp; last: it is the escape of an escape
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // & first, for the same reason

const attrs = (s) => Object.fromEntries([...s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map((m) => [m[1], m[2] ?? '']));

// --- token output -----------------------------------------------------------
// A token becomes a span, except the default-coloured ones (punctuation, which
// is most tokens by count) — wrapping those would double the page for no change
// in what the eye sees. Italic is a modifier, not a colour: Shiki uses it for a
// couple of constructs and dropping it would be a silent difference from VS Code.
const unmapped = new Set();
let colored = 0;
function wrap(content, token) {
  if (content === '') return '';
  if (!token.color || token.color === DEFAULT || IGNORE.has(token.color)) return esc(content);
  let cls = PALETTE[token.color];
  if (!cls) {
    // Not in the palette: colour it anyway so the page is never wrong-by-omission,
    // but inline, which check 11 then reports. Failing loudly beats a silent hole.
    unmapped.add(token.color);
    const style = ` style="color:${token.color}"`;
    return '<span' + style + '>' + esc(content) + '</span>';
  }
  if (token.fontStyle) cls += ' tk-it';
  colored++;
  return `<span class="${cls}">${esc(content)}</span>`;
}

// --- inline HTML protection -------------------------------------------------
// Elements that may appear inside a block and must reach the page untouched.
const INLINE = new Set(['span', 'em', 'strong', 'b', 'i', 'a', 'code', 'br']);

/** Index of the `</name>` matching a `<name …>` that opened at `from`, or -1.
 *  Depth-aware: a same-named element nested inside is skipped over rather than
 *  mistaken for the close. (Principles' spanEnd, generalised past `<span>`.) */
function elementEnd(html, name, from) {
  const close = '</' + name + '>';
  const open = '<' + name;
  let depth = 1, i = from;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) return -1;
    if (html.slice(lt, lt + close.length).toLowerCase() === close) {
      if (--depth === 0) return lt;
      i = lt + close.length;
    } else if (html.slice(lt, lt + open.length).toLowerCase() === open &&
               /[\s>]/.test(html[lt + open.length] || '')) {
      depth++; i = lt + open.length;
    } else i = lt + 1;
  }
  return -1;
}

/** Replace every inline element in the block with its marker; return the code
 *  text Shiki will read, and collect the original markup in `gaps`. */
function protect(html, gaps) {
  let out = '', i = 0;
  for (;;) {
    const lt = html.indexOf('<', i);
    if (lt < 0) { out += html.slice(i); break; }
    const m = /^<([a-zA-Z][\w-]*)/.exec(html.slice(lt));
    const name = m && m[1].toLowerCase();
    if (!m || !INLINE.has(name)) { out += html.slice(i, lt + 1); i = lt + 1; continue; }

    const gt = html.indexOf('>', lt);
    let stop;
    if (gt < 0) { out += html.slice(i, lt + 1); i = lt + 1; continue; }
    if (html[gt - 1] === '/') stop = gt + 1;            // self-closing: the tag is the element
    else {
      const end = elementEnd(html, name, gt + 1);
      stop = end < 0 ? gt + 1 : html.indexOf('>', end) + 1; // unclosed: protect the tag alone
    }
    gaps.push(html.slice(lt, stop));
    out += html.slice(i, lt) + MARK + (gaps.length - 1) + 'zz';
    i = stop;
  }
  return out;
}

/** Emit one token's text, putting any markers it holds back as raw HTML. */
function render(content, token, gaps, tally) {
  if (!content.includes(MARK)) return wrap(content, token);
  let out = '', last = 0;
  for (const m of content.matchAll(MARK_RE)) {
    out += wrap(content.slice(last, m.index), token);
    out += gaps[+m[1]];
    tally.restored++;
    last = m.index + m[0].length;
  }
  return out + wrap(content.slice(last), token);
}

// --- block shapes -----------------------------------------------------------
const tagless = (s) => s.replace(/<[^>]*>/g, '');
const firstLine = (s) => (s.split('\n').find((l) => l.trim() !== '') || '');
const bare = (s) => s.replace(/^\s*<code[^>]*>/, '').replace(/<\/code>\s*$/, '');

/** Decide a block's language, or null to leave it plain. */
function classify(inner, declared) {
  if (declared) return LANGS[declared.toLowerCase()] || null;
  const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  // A block that is nothing but program output is the terminal, not the file —
  // it stays muted even when the text it echoes happens to look like code. Only
  // what sits OUTSIDE the `<span class="output">` wrappers can make it code.
  const outside = decode(tagless(inner.replace(/<span[^>]*class="output"[^>]*>[\s\S]*?<\/span>/g, '')));
  if (outside.trim() === '') return null;
  // What the whole block says once its inline markup is gone.
  const text = decode(tagless(inner));
  if (text.trim() === '') return null;            // nothing but markup — not ours
  const first = firstLine(text);
  if (codeish(text)) return 'java';               // unambiguous: real code
  if (PROMPT.test(first)) return 'bash';          // `$ javac …`
  if (SHELL_CMD.test(first)) return 'bash';       // a bare command transcript
  return null;                                    // trace, map, CSV, sheet, output
}

async function main() {
  const hl = await createHighlighter({ themes: [THEME], langs: Object.values(LANGS) });
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.html')) files.push(p);
    }
  })(ROOT);

  const tally = { restored: 0 };
  let coloured = 0, named = 0, skipped = 0, plain = 0, shell = 0;
  const leftAlone = [];

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    let out = '', last = 0, touched = false;

    for (const m of html.matchAll(/<pre(?=[\s>])([^>]*)>([\s\S]*?)<\/pre>/g)) {
      const [whole, tagAttrs, body] = m;
      const a = attrs(tagAttrs);
      const code = body.match(/^(\s*)<code([^>]*)>([\s\S]*?)<\/code>(\s*)$/);
      const inner = code ? code[3] : body;
      const codeAttrs = code ? code[2] : '';

      const declared = ((a.class || '') + ' ' + codeAttrs).match(/\blang-([\w#]+)/);
      const lang = classify(inner, declared && declared[1]);
      if (!lang) {
        if (declared) skipped++;
        else {
          plain++;
          if (VERBOSE) leftAlone.push(`  ${path.relative(ROOT, file)}: ${firstLine(tagless(inner)).trim().slice(0, 70)}`);
        }
        continue;
      }
      if (inner.includes('class="tk-')) continue; // already coloured: this ran twice
      named++;

      // The block is tokenized as ONE document, not line by line: a string or a
      // comment spanning several lines only colours correctly if the grammar saw
      // the whole of it, which is also how the editor reads the file.
      const gaps = [];
      const source = protect(unesc(inner), gaps);
      const { tokens } = hl.codeToTokens(source, { lang, theme: THEME });

      // Shiki hands back one array per line and no newline characters at all —
      // the join is what keeps the block a block. (Forgetting it collapses every
      // listing to a single line, which looks like nothing at all in a diff.)
      const rebuilt = tokens
        .map((line) => line.map((t) => render(t.content, t, gaps, tally)).join(''))
        .join('\n');

      // The newline count is the one thing colouring must not change, and it is
      // counted directly rather than via stripped-text line counts: Astro emits
      // the code's own `<` RAW (`room <= 5;` arrives as `&lt;` only because this
      // script escapes it afterwards), so a `/<[^>]*>/` strip would swallow
      // `<= 5; room++) { … >=` and report a line loss that never happened.
      // Markup never adds or removes a newline, so the raw counts must match.
      const newlines = (s) => (s.match(/\n/g) || []).length;
      if (newlines(rebuilt) !== newlines(inner)) {
        console.error(`  LINE COUNT CHANGED in ${file}: ${newlines(inner)} -> ${newlines(rebuilt)} newlines — fix before building again`);
        process.exitCode = 1;
      }

      // A marker that reaches the page is a blank that was never put back: the
      // block would show a string of nonsense where a `<span>` used to be.
      if (rebuilt.includes(MARK)) {
        console.error(`  MARKER LEAK in ${file}: an inline element was not restored — fix before building again`);
        process.exitCode = 1;
      }

      const hasColour = rebuilt.includes('class="tk-');
      const badge = hasColour && !a['data-lang'] ? ` data-lang="${LABELS[lang] || lang}"` : '';
      const labelled = tagAttrs + badge;
      const body2 = code ? code[1] + '<code' + codeAttrs + '>' + rebuilt + '</code>' + code[4] : rebuilt;
      out += html.slice(last, m.index) + '<pre' + (labelled ? labelled : '') + '>' + body2 + '</pre>';
      last = m.index + whole.length;
      if (hasColour) coloured++;
      if (lang === 'bash') shell++;
      touched = true;
    }
    if (touched) fs.writeFileSync(file, out + html.slice(last));
  }

  console.log(`highlight: ${coloured} block${coloured === 1 ? '' : 's'} coloured over ${files.length} pages` +
    ` (${named} classified, ${shell} shell)` +
    (tally.restored ? `, ${tally.restored} inline spans put back` : ''));
  console.log(`  ${plain} blocks left plain (not code: output, traces, maps, data)` +
    (skipped ? `, ${skipped} declared a language Shiki does not know` : ''));
  if (VERBOSE && leftAlone.length) console.log(leftAlone.join('\n'));
  if (unmapped.size) {
    console.log(`  UNMAPPED COLOURS: ${[...unmapped].join(', ')} — inlined; add them to the palette in public/style.css`);
    process.exitCode = 1;
  }
}

main();
