# Privacy Policy — Revision Banner for Google Docs (Teacher View)

_Last updated: 2025_

## Summary

Revision Banner stores every piece of data **locally in the user's browser**
(`chrome.storage.local`). It has no accounts, no analytics, no telemetry, no third-party
services, and no backend of any kind. Nothing about you, your students, or the documents
you view is transmitted anywhere by this extension.

## What is stored, and where

- Per-document statistics (edit counts, session timestamps, contributor names as shown
  by Google's own version history, paste flags, active-time totals) — local browser
  storage only.
- Your settings — local browser storage only.
- If you (optionally) connect the experimental Drive API tier: your OAuth client ID,
  and access/refresh tokens for that connection — local browser storage only, never
  synced. You can remove them at any time via Settings → Disconnect.

## What the extension does on the web

- It runs on pages under `docs.google.com` and `drive.google.com` only.
- It reads the document's own version-history panel and its locally rendered DOM to
  compute statistics. It observes network traffic the page already performs; it does not
  originate requests.
- The **only** network requests the extension itself makes are to Google's APIs, and
  only if you personally configure the optional Drive API tier in Settings. If you do
  not configure it, the extension makes zero network requests.
- Data never leaves the machine: exports (CSV/JSON) are generated in-memory and saved by
  you, to a file you choose, on your computer.

## Student-data considerations

Because all processing and storage are local, no student work or metadata is disclosed
to the developer or any third party. When reviewing a document shared with you, the
extension only surfaces information that Google's own "Version history" feature already
shows any viewer of that document. Deleting a document's stats from the extension
("Forget this file" / "Clear all data") removes them permanently from this machine.

## Permissions and why

- `storage` / `unlimitedStorage` — saving your settings and per-document stats locally.
- `identity` — the optional Drive API connection you configure yourself.
- `tabs` — relaying the "toggle banner" keyboard command to the current tab.
- Host permissions on `googleapis.com` — only used by the optional Drive API tier.
- Content scripts on `docs.google.com` / `drive.google.com` — the banner itself.

## Contact

This is an open-source, self-hosted tool. See the repository README for source code,
limitations, and the honest explanation of how every displayed number is computed.
