# Install Revision Banner (teacher quick-start)

Revision Banner adds a strip across the top of Google Docs/Sheets/Slides that shows a
document's revision history at a glance: edits, active time, sessions, contributors,
paste flags, and a process score. It runs entirely on your machine — nothing is sent
to any server, and there is no account to create.

## Install (one time, ~1 minute)

1. Get the folder: download and **unzip** `revision-banner-v1.1.0.zip`.
   ⚠️ Keep the unzipped folder somewhere permanent (Documents — **not** Downloads, and
   don't delete it later: Chrome runs the extension from that folder).
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (toggle, top right).
4. Click **Load unpacked** (top left) and pick the unzipped folder.
5. You're done — the toolbar now shows the indigo bar-chart icon.

**Normal Chrome warning:** with Developer-mode extensions installed, Chrome may show a
"Disable developer mode extensions" bubble when it starts. That's expected — choose to
keep the extension. You can also dismiss the warning each time; it doesn't disable it.

## First use

1. Open any Google Doc (one shared with you is fine — view access is enough).
2. After a few seconds the banner appears at the top and automatically imports the
   document's version history. If it shows a pulsing **"Import full history ⟳"** chip,
   click the ⟳ button once (or open File → Version history yourself for a few seconds).
3. Read the banner. Click any stat (or press **Alt+D**) for the full report:
   sessions, contributors, daily chart, paste flags, data sources, and CSV export.
   **Click the writing-process score** for the deep breakdown: factor-by-factor points,
   typed-vs-pasted share, and suspicious-edit signals (evidence included).
   The version history pane closes by itself once an import settles — the screen returns
   to just the banner (reopen it any time with Ctrl/Cmd+Alt+Shift+H; disable the
   auto-close in Settings if you prefer it to stay open).
4. Click the **toolbar icon** for your class dashboard — every doc you've opened is
   listed there, with a CSV export for the whole set.

### Optional: AI read of the writing process

Want a second opinion on the signals? Settings (⚙) → **AI analysis**: the defaults are already
filled in — `https://ollama.com/v1` with model `glm-5.3-flash:cloud` — so all you add is your API
key and flip the switch. Any other OpenAI-compatible endpoint works too (api.openai.com, OpenRouter,
or a local model; paste a base or a full `/chat/completions` URL). An "Explain with AI" button then
appears in the score breakdown. It sends only timing/size metadata and the local signals — never
document text — and only when you click it.

## Shortcuts

- **Alt+R** — collapse/expand the banner
- **Alt+D** — open/close the details report
- **Alt+Shift+R** — hide/show the banner entirely

## Troubleshooting

- **No banner on a Doc?** Reload the page — extensions only attach to newly loaded
  pages. **After installing or updating the extension, reload every Google Doc tab
  that was already open.**
- **Numbers say "live only"?** The document's history hasn't been imported yet —
  click ⟳ in the banner, or open File → Version history for a few seconds.
- **Want to see why an import did or didn't work?** Press Alt+D → scroll to **Data
  sources** → the **Last import** row shows how many tiles were read, how many had
  editor names, and — if it failed — the exact reason (e.g. "no entry point found —
  view-only doc or a changed Google UI").
- **Only one contributor shown?** v1.0.1 fixed the main cause: version-history
  imports used to merge whole date groups into one entry, keeping only the first
  avatar. After updating, open the doc and press ⟳ once (or open File → Version
  history for a few seconds) so it re-imports with each editor counted. If the
  Last import row still says "with editor names: 0", open the doc's version
  history manually for a few seconds and reopen Details.
- **View-only docs:** Google does not always offer version history to viewers. Docs
  shared by students via Google Classroom give you edit rights and work fully; for
  mere viewer access, history may be unavailable — ask for edit rights or use the
  Drive API tier.
- **Banner overlaps the toolbar?** Go to Settings (⚙ in the banner) → Page layout → Overlay.
- **A Google control (the last-edit / comments / Meet / Share / avatar pill) covers the
  banner?** The extension should push it below the banner automatically. If it still
  overlaps, open Details (click the score) → **Copy layout diagnostics** → paste the report
  when reporting the issue — it identifies the exact element so the fix can be targeted.
- **A tab ever shows Chrome's "Try reloading" crash page?** Fixed in recent builds
  (imports are now time-budgeted and gentler on huge histories). Reload the tab and
  reopen version history; imports run a few tiles at a time now.
- **Updating to a new version:** unzip the new file over the same folder, then open
  `chrome://extensions` and click the ↻ (reload) icon on the Revision Banner card —
  then reload your open Doc tabs.

Settings live in the banner's ⚙ button (banner height, thresholds, what to track,
and a class-wide dashboard in the toolbar popup). The process score is a conversation
starter, not proof of misconduct — see the README for how each number is computed.

## Student mode — turning in a "process summary" with your project

If your class asks for it, submit a summary of your writing process alongside the work:

1. Install this extension **before you start working** (same steps as above), and do the
   work in the Google Doc on that machine.
2. When you finish: open the doc, press **Alt+D**, and click **Export submission (HTML)**.
3. Attach the downloaded \`-revision-summary.html\` file when you turn in the project.

The file is generated on your machine and shows your edits, sessions and paste flags.
Your teacher can verify it against the document's own version history. Honest heads-up:
the summary is a record of your process, not a proof of anything — doing the work in the
doc over time is what shows up in Google's version history.
