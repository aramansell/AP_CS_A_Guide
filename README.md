# AP CS A Guide — IBW course site

Static curriculum site for the IBW AP Computer Science A course (2026-27):
185 lessons, ~100 documentation pages, an exam hub, a day-by-day pacing
calendar, and a CED coverage matrix. Built with [Astro](https://astro.build)
and deployed on GitHub Pages.

## The one-time GitHub Pages switch

This repo used to deploy as raw HTML committed to the root of `main`.
It now builds with GitHub Actions. To switch (once):

1. GitHub repo **Settings → Pages → Build and deployment → Source**
   → select **GitHub Actions** (not "Deploy from a branch").
2. Merge the `astro` branch into `main` and push.
3. The `Deploy to GitHub Pages` workflow builds, verifies, and publishes.

Every old URL keeps working - `npm run verify` enforces this against
`legacy/site-manifest.json` on every deploy.

## Daily workflow

```bash
npm install        # once
npm run dev        # local dev server with hot reload
npm run build      # build dist/ + search index + regenerate PACING.md
npm run verify     # full site verification against dist/ (must ALL PASS)
npm run preview    # serve the built dist/ locally
```

Node 23.6+ required (24 in CI). No Python anymore - the whole toolchain is
Node/JavaScript.

## Where things live

| Path | What it is |
|---|---|
| `src/data/curriculum.ts` | **Single source of truth**: A-day calendar, day-by-day SEQUENCE, phases, all 53 CED topics. Dashboard, pacing calendar, coverage matrix, PACING.md, and every lesson's prev/next chain render from it at build time. |
| `src/data/lessons.ts` | Per-lesson metadata (titles + activity badges) for the dashboard. |
| `src/layouts/BaseLayout.astro` | The shared page shell: `<head>`, top nav, `.page` wrapper. The nav is written **once** here - before the migration it was duplicated in 310 HTML files. |
| `src/layouts/LessonLayout.astro` | Lesson pages: prev/next chain computed from `LESSON_CHAIN`, plus the per-student "I finished this lesson" progress toggle. |
| `src/pages/**` | Every page. Migrated pages are thin: frontmatter + the original body HTML in a `set:html` template literal. The body is plain HTML - edit it directly. |
| `src/pages/index.astro` | Dashboard - data-driven, plus phase progress bars (localStorage). |
| `src/pages/pace.astro`, `src/pages/docs/coverage.astro` | Pacing calendar + CED coverage matrix, data-driven. |
| `src/pages/search.astro` | Site search (Pagefind index, built during `npm run build`). |
| `src/integrations/pacing-md.ts` | Regenerates `PACING.md` at every build. |
| `public/` | Static assets served as-is: `style.css`, `docs/style.css`, `data/*.txt` (the lesson datasets). |
| `scripts/` | `verify-site.mjs` (verification), `migrate-to-astro.mjs` (the one-time migration, kept for provenance), `new-lesson.mjs` (scaffold). |
| `legacy/` | The retired Python toolchain and repair artifacts. Nothing in the build reads it. |

## Common tasks

### Edit a page
Open its file under `src/pages/` - the body is plain HTML. Nav, head, and
breadcrumbs come from the layout automatically. `npm run dev` hot-reloads.

### Add a lesson
```bash
npm run new-lesson -- 11.1a "Fancy New Topic"
```
Then add `"11.1a"` to the right day's `lessons` list in
`src/data/curriculum.ts`. That one edit wires it into the prev/next chain,
dashboard, pacing calendar, and PACING.md. If you forget, the build fails
with an error telling you exactly that.

### Change the schedule / CED mapping
Edit `src/data/curriculum.ts` (`A_DAYS`, `SEQUENCE`, `DAY_NOTES`). Build -
pace.html, the dashboard, coverage.html, and PACING.md all regenerate.

### Change the site chrome (nav, head, styling)
`src/layouts/BaseLayout.astro` once - every page updates. Site-wide styles:
`public/style.css` (root/lesson/exam pages) and `public/docs/style.css`
(docs pages), served at their original URLs.

### Deploy
Push to `main`. CI builds, runs `npm run verify`, and publishes `dist/`.

## Guarantees

`npm run verify` checks, on every build/CI run:

- zero broken internal links and anchors across all 300+ pages
- the lesson prev/next chain matches the curriculum data, bidirectionally
- the dashboard lists all 185 lessons
- every unit index links its quick reference
- the coverage matrix lists all 53 CED topics
- the exam hub is complete
- **every URL the pre-migration site served still resolves** (URL parity)

## Features added by the migration

- **Lesson progress tracking** - students mark lessons complete on the lesson
  page (localStorage); the dashboard shows per-phase progress bars.
- **Site search** (`/search.html`) - full-text Pagefind index of every page,
  built at deploy time. Also linked from the top nav.
- **404 page** - GitHub Pages serves it for any missing URL.
- URLs, content, and look are unchanged otherwise - the migration script
  (`scripts/migrate-to-astro.mjs`) round-trip-validated every page body.
