# Revision Banner for Google Docs — Teacher View

A Chrome extension (Manifest V3) that adds a slim, always-visible **banner across the top of
Google Docs, Sheets and Slides** (plus compact mode on Drive file previews) showing revision-history
signals at a glance: **edits, active time, work sessions, contributors, bulk paste flags** and a
**writing-process score**. Built for teachers who want the revisionhistory.com-style view of a
document's history without sending anything anywhere — all data lives on this machine.

The banner defaults to **13% of the viewport height** (adjustable 8–15%, hard-capped at 15% and at
160 px on very tall screens), spans the full width, and pushes the page content down so nothing is
covered. It collapses to a thin strip (**Alt+R**) or hides entirely (**Alt+Shift+R**).

---

## Install

**Sharing with other teachers?** Hand them [INSTALL.md](INSTALL.md) (one-page quick-start)
and [PRIVACY.md](PRIVACY.md) (for school admins / store submission).

1. Open `chrome://extensions` in Chrome/Edge/Brave (Chromium 111+).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `chrome_extension` folder.
4. Open any Google Doc — the banner appears at the top. The toolbar icon's popup is your
   class dashboard.

No accounts, no keys, no network calls by default. (There is one *optional* experimental tier
that talks to the Google Drive API with your own credentials — see below.)

## 30-second teacher workflow

1. Open a student's Google Doc (view access is enough).
2. Wait a few seconds — the banner usually imports Google's own version history automatically
   ("Smart" mode). If the chip says **Import full history ⟳**, click the ⟳ button once, or press
   Ctrl+Alt+Shift+H (Windows/Linux) / ⌘+Option+Shift+H (Mac) to open version history — the banner
   scrapes it and closes it again.
3. Read the banner: edits, active time, sessions, contributors, bulk inserts, first/latest activity,
   30-day sparkline, and the process score. Click the banner (or Alt+D) for the full report:
   per-session table, per-contributor counts, edits-per-day chart, paste list, data-source
   breakdown, and CSV/JSON export.

---

## What each metric means

| Metric | Meaning | Source |
|---|---|---|
| **Edits** | Number of editing events. Best available source is used and labeled: detailed ops > version entries > live bursts. | all tiers |
| **Active** | Live-tracked interaction time **on this machine** (idles after the cutoff) — starts at install, exact. When no live data exists — e.g. viewing a student's doc — the value shown is an **estimate** from version-history timestamps: work sessions cluster from Google's save checkpoints, and each session contributes its span (5-minute floor). Labeled either way in the details panel. | live / history |
| **Sessions** | Clusters of activity; a pause longer than the session gap (default 30 min) starts a new session. | all tiers |
| **Contributors** | Distinct editor names seen in the document's version history — one entry per version-tile timestamp, each editor kept separately (plus the local account only when this machine recorded its edits; merely opening a doc does not count). | panel / drive |
| **Bulk inserts** | Single additions ≥ threshold chars (default 200) — the classic copy/paste (or AI-dump) signature. | live + ops |
| **First activity** | Earliest edit in the merged history — approximates when work really began. | all tiers |
| **Process score** | 0–100 heuristic: paste ratio (35%), work sessions (25%), spread over days (20%), burst pattern (20%). Missing components are excluded, not guessed. **Click the score** (banner or details) for the full breakdown: each factor's points and evidence, typed-vs-pasted share, word count, and the suspicious-edit signals. | all tiers |
| **Suspicious-edit signals** | Local, evidence-backed flags computed from timing and paste patterns: pasted share, fully-formed multi-paragraph insertions, single-session dominance, one/two-sitting completion, overnight editing, silence-then-dump, delete-then-paste replacement, low revision density, last-minute rush, implausible typing speed — and the positive "consistent drafting" signal. Each flag carries concrete numbers and times. See the score breakdown (click the score). | live / history |

> **Fairness note:** the process score is a conversation starter, not proof. A student who pastes
> their own long-prepared essay scores low on process; a student drafting in another tool scores
> low too. Read the score breakdown (click it) before drawing conclusions.

## Optional AI tier — bring your own key

The score breakdown can include an **"Explain with AI"** button (Settings → *AI analysis*): configure
any OpenAI-compatible endpoint — base or full URL — plus your API key. **Defaults:** `https://ollama.com/v1`
(Ollama's cloud API; the extension appends `/chat/completions` automatically) with model
`glm-5.3-flash:cloud`; api.openai.com, OpenRouter and local models work the same way. When you click
the button, the extension sends **only writing-process metadata**
(timings, sizes, counts, and the locally computed signals) to *your* endpoint. **Document text is
never sent**, nothing is sent until you click, and the host permission for the endpoint is requested
only when you enable the feature. The AI is instructed to ground its read in the numbers, raise
innocent explanations, and never to declare that a student cheated. Its reply is stored with the
document (locally) and appears in the breakdown and in exported submissions.

## How the data is gathered (four independent tiers)

The extension is built so that **no single point of failure empties the banner**, and every number
shows its provenance:

1. **Live tracking** (always available) — keystroke bursts, paste events, visible/idle-aware
   active time, and DOM text deltas (with heuristics that ignore layout reflows and remote-only
   edits). Persisted per file in `chrome.storage.local`, with retention + daily rollups.
2. **Version-history pane scraping** (no API keys) — Google's own "Version history" panel is
   detected and scraped whenever it opens; the banner can also open it itself (synthetic keyboard
   shortcut, then menu automation, then a friendly instruction as the last resort) and auto-scrolls
   the pane to load older versions. Timestamps, editor names and per-version edit counts are parsed
   with layered date-format parsers.
3. **Network op capture** (experimental) — a MAIN-world script (runs before the page) observes the
   collaborative-editing traffic Docs performs on load and history views, and defensively extracts
   timestamp sequences. Google can change this format at any time, so it is labeled experimental
   and simply contributes nothing when it can't parse.
4. **Drive API metadata sync** (optional, off by default) — revision metadata (who, when, sizes)
   straight from `drive/v3/files/{id}/revisions` using **your own** OAuth client configured in
   Settings. See the setup steps below.

## Robustness design

- **Offset engine with escalation ladder.** Pushing a Google app down is the risky part, so it is
  done by measurement, not assumptions: body margin + height push → if the header didn't move,
  transforms on `#docs-chrome`/`#docs-editor` → if still overlapping, whole-body transform →
  if still bad, **overlay mode** (banner overlays the top edge; page untouched). Drive previews,
  Forms and Drawings default to overlay. Print always hides the banner and restores layout.
- **Watchdog** re-mounts the banner if the host app removes it, re-checks offsets, and refreshes
  theme (auto light/dark follows the page's own background).
- **Layout safety net for Google's own floating controls:** Docs pins some header controls
  (last-edit · comments · Meet · Share · avatar) to the top of the viewport; the extension
  detects such fixed strips and translates them just below the banner so the banner's score
  and buttons stay clickable. Detection is structural, not tied to Google's internal ids.
- **Defensive everything:** every DOM query, listener, scraper and parser is guarded; failures
  log to a debug buffer (visible in Details when *debug* is on) instead of breaking the banner.
- **Two-tab safety:** per-file records merge on write (sessions union by id, versions union by
  key), so two open tabs can't corrupt data.
- **Honest provenance:** the banner never presents a guess as a fact — each headline number carries
  a chip naming its source, and the Details panel shows all tiers side by side.

## Parity with revisionhistory.com-style tools

Revision History (revisionhistory.com) popularized the teacher-side writing-process view. Here is
where this extension stands against its headline features:

| Their feature | Here |
|---|---|
| Summary bar (editing time, sessions, word/char counts) | ✓ banner cards + details overview, incl. approximate word count |
| % typed vs pasted | ✓ banner card + score breakdown (honest share math; pastes count once) |
| Detect copy/paste (when, how big) | ✓ paste list with timestamps, sizes, words/paragraphs per block |
| Unusual writing patterns (large sudden additions, speeds, minimal revision) | ✓ local signals engine: 10 suspicious-edit flags + 1 positive signal, each with evidence |
| Editing history (edits over time) | ✓ edits, sessions, daily chart, history-derived sessions |
| Replay document creation | ✗ not built — no document snapshots are stored (privacy trade-off); the daily chart + session tables cover the timeline |
| Multi-contributor per document | ✓ contributors with per-person version/edit counts |
| Cloud account / per-doc quota | ✗ not applicable — everything stays local, no accounts, no limits |
| Process score | ✓ with full click-through breakdown, factor points and AI (optional) |

The extension's stance matches theirs: **not an AI detector** — patterns for conversations, never
presented as proof.

## Settings (rightmost ⚙ on the banner)

- **General:** banner height (8–15%), start collapsed, theme, push vs overlay layout, show score.
- **Tracking:** idle cutoff, session gap, bulk-insert threshold, retention days.
- **History import:** automatic import mode (smart / always / off), attempt spacing, and
  *close the history pane after it imports* (on by default — the pane closes itself once the
  import settles, so the screen returns to just the banner; reopen it any time to browse).
- **AI analysis (optional):** your own OpenAI-compatible endpoint, model and key — see the section above.
- **Where the banner appears:** toggle Docs / Sheets / Slides / Forms / Drawings / Drive.
- **Data:** export everything (JSON), import a previous export, clear all data, storage usage.
- **Experimental:** Drive API connection (below).

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt+R` | Collapse / expand the banner |
| `Alt+D` | Open / close the details report |
| `Alt+Shift+R` | Cycle hide → collapsed → expanded (works via the toolbar command even when the banner is hidden) |
| `Ctrl+Alt+Shift+H` | Google Docs' own "See version history" — opening it anywhere triggers an automatic import |

## Popup dashboard (toolbar icon)

Lists every tracked document with quick stats, score pills, search, one-click open, per-file
"forget", a **class-wide CSV export**, and **Verify a submission…** (below). The badge shows
how many documents are tracked.

## Student mode — attach a process summary to the work

If students install the extension on the machine where they work, they can turn in a
process summary with the project:

1. Student installs the extension the same way (see INSTALL.md) — ideally **before**
   starting the project, so live tracking covers the whole work window.
2. They do the work in the doc as usual. Their install also imports Google's version
   history, like the teacher's does.
3. When turning in: open the doc → **Alt+D** → **Export submission (HTML)** → attach the
   generated \`-revision-summary.html\` file.
4. The teacher opens **toolbar popup → "Verify a submission…"** and drops the file in.
   The Verify page checks the signature and cross-references the claims against the
   version history the teacher's own install scraped from Google for that same doc:
   - days claimed as live-writing that appear nowhere in the version history are flagged,
   - the student's embedded version-history import is compared with yours (both come
     from Google's servers, so they should agree),
   - wildly inflated edit counts are noted.

### Threat model — what the signature does and does not prove

- The HMAC signature proves the file is intact as exported (any hand-edit breaks it).
- It does **not** prove honesty: browser storage can be edited before export, typing
  simulators exist, and the key is public in this open-source repo. A technical student
  can defeat it — treat the file as an attestation, not evidence.
- The genuinely hard-to-forge part is the **cross-check against Google's version
  history**, which students cannot edit or delete. That is what the Verify page automates.
- Mismatches are questions to ask, not verdicts (imports can be incomplete — the page
  says so and lets you re-check after opening the doc's history).

## Optional: Drive API tier (experimental)

For revision metadata (editor + timestamp per saved revision) even before the extension was
installed:

1. In the Google Cloud Console create a project and **enable the Google Drive API**.
2. Create an **OAuth Client ID** (type *Web application* or *Desktop app*).
3. Add an authorized redirect URI of the form
   `https://<YOUR-EXTENSION-ID>.chromiumapp.org/` — find the exact value in
   Settings → Experimental (the page prints it for you).
4. Paste the Client ID (and secret, if your client has one) into Settings → Experimental and press
   **Connect Google account**. The flow is PKCE + offline access; tokens are stored only in this
   browser's local storage and never synced.

This tier is entirely optional — tiers 1–3 need no configuration at all.

## Privacy

- Zero analytics, zero telemetry, zero external servers.
- Everything (stats, settings, tokens) is stored in `chrome.storage.local` on this machine.
- The only network requests the extension itself makes are to Google (your own Drive API client,
  only if you configure it). The MAIN-world script only observes traffic the page already makes.
- "Forget this file" and "Clear all data" delete local stats only — never the documents.

## Known limitations

- The version-pane scraper depends on Google's markup; class names and formats can change. It is
  written to survive renames (multiple selectors, aria-labels, date-pattern parsing) and to fail
  soft — worst case the banner relies on live tracking + manual import, clearly labeled.
- Version entries are save checkpoints, not keystrokes; "edits" from that tier is a lower bound
  (per-version edit counts are used when Google exposes them).
- Sheets/Slides use JS-measured layouts; if you ever notice the bottom edge clipped in push mode,
  switch those apps to Overlay mode in Settings (banner then never moves the page).
- The network-ops tier is experimental by nature — Google's internal payloads are unversioned.
- Live tracking counts only this browser: it sees a student's process only if it is installed on
  the machine where the work happens. For student-owned work, rely on the history tiers
  (viewing a shared doc is enough).
- The score ignores what it can't see; treat low scores as questions to ask, not answers.

## Files

| Path | Purpose |
|---|---|
| `manifest.json` | MV3 manifest; content scripts on docs/drive URL patterns |
| `background.js` | Service worker: defaults, badge, command relay, Drive API sync |
| `content/banner.js` | Everything the teacher sees: banner UI, live tracker, history manager, stats, offset engine |
| `content/main-world.js` | Pre-page network observer (experimental tier 3) |
| `content/page-offset.css` | Var-driven page-push rules (escalation levels live here) |
| `popup/` | Class dashboard (also links to the Verify page) |
| `verify/` | Teacher-side submission verifier: signature check + version-history cross-check |
| `options/` | Settings, data import/export, Drive API OAuth |
| `icons/` | Generated icons (`node tools/gen_icons.mjs` to regenerate) |
| `tools/dev-test.html` | Local page that runs the banner outside Google Docs (with a chrome.* mock) |

## Local development

- Syntax check everything: `node --check content/banner.js content/main-world.js background.js popup/popup.js options/options.js`
- Run the headless logic tests (real banner.js in a sandboxed VM — date parsing, stats merge,
  rollups, session merge, network parsing): `node tools/logic-test.mjs`
- Try the banner without Google: open `tools/dev-test.html` in a browser tab (it mocks `chrome.storage` and enables a synthetic document context).
- Regenerate icons after any icon tweak: `node tools/gen_icons.mjs`.

Inspired by the "revision history" banner extension popularized by revisionhistory.com — this is an
independent, privacy-first implementation. MIT licensed; see LICENSE.
