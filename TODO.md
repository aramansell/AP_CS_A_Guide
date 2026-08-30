# Curriculum Build Log — 2026-08-29/30

Status: COMPLETE. All verification checks pass (scripts/verify_site.py).

## 2026-08-31: Lab forms — student answers, Canvas loop, site polish

Second big branch feature: the discovery activities became fillable forms.

- **Lab forms**: a build-time transform (src/lib/formify.ts, run from
  LessonLayout) auto-injects an answer box after every reflection question
  in bug hunts / tinker challenges / socratic checkpoints - 760 boxes
  across 139 lessons, zero content edits. Deterministic ids
  (lesson:blockN:qN) travel inside each student's downloaded JSON, so keys
  and grades stay stable across rebuilds.
- **Student flow**: answers autosave to localStorage as they type (shared
  across lessons); each lesson ends with a student-name field + a
  "Download answers (.json)" button producing one self-describing file
  (format apcsa-lab-answers/1) for a Canvas file-upload assignment.
- **Dashboard "My work" panel**: one-file backup of progress + all answers,
  restorable on another machine (covers lab machines that get wiped).
- **Teacher loop** (teachers/canvas.html, linked from README, excluded from
  student search): Canvas assignment -> Download Submissions -> 
  npm run grade -- folder -> terminal summary + grades.csv (paste/import
  into the gradebook) + per-student feedback files to return via
  SpeedGrader. Completeness grading for all questions; exact-match grading
  against optional keys in src/data/answerKeys.ts (seeded for 1.1c, 1.7c,
  1.8b, 2.5a); latest attempt kept when a student submits twice.
  npm run dump-questions lists every id + prompt for authoring keys.
- **Site polish**: favicon, meta/og tags, skip-to-content link, aria-current
  nav, focus-visible outlines, print stylesheets for both themes,
  sitemap.xml (built post-build, 312 pages), robots.txt.
- Astro upgraded 5.18 -> 7.2.9 first (no config changes needed; verified
  all 13 checks + dev-server smoke tests).

## 2026-08-30: Migrated to Astro (branch `astro`)

The hand-maintained 310-page static HTML site is now an Astro project:

- All 307 content pages migrated 1:1 into `src/pages/**.astro` (bodies kept
  verbatim, round-trip validated). Head/nav/breadcrumbs now come from two
  layouts (`src/layouts/`) instead of being duplicated in every file.
- The 6-script Python generator pipeline retired; `src/data/curriculum.ts`
  is the single source of truth and the dashboard, pacing calendar, coverage
  matrix, PACING.md, and lesson prev/next chain all derive from it at build
  time (`npm run build`). Old toolchain kept in `legacy/`.
- `npm run verify` (port of verify_site.py) runs on every CI deploy and
  enforces URL parity with the old site (legacy/site-manifest.json).
- New: per-student lesson progress tracking (localStorage + dashboard bars),
  full-text site search (Pagefind, /search.html), a 404 page, and a GitHub
  Actions deploy workflow (requires the one-time Pages source switch to
  "GitHub Actions" - see README).
- URLs are unchanged: build format `preserve` keeps /lessons/1.1a.html and
  /docs/unit-01/index.html exactly as before.

## What was built (this session)

### Structural repairs
- 447 broken internal links repaired (dead targets repointed via linkfix_map.json)
- 41 lesson-nav label/href mismatches fixed
- Dead Demos nav tab replaced with the Exam hub tab on all 310 pages
- All 10 unit indexes: dead reference/*.md promises replaced with real
  docs/reference/unit-NN-quickref.html links
- docs/unit-03/number-pattern.html orphan linked from the Teacher Projects table
- Tag balance verified across the site (pre/div/table all clean)

### New curriculum content (13 new lessons, 15 new docs pages)
Written for the Fall 2025 CED topics the old site did not cover:
- 1.8a/1.8b casting, compound assignment, overflow (CED 1.5, 1.6)
- 2.8a/2.8b/2.8c APIs, comments, method signatures (CED 1.7, 1.8, 1.9)
- 2.9a split() and data lines (CED 1.15 completion)
- 4.7a informal run-time analysis (CED 2.12)
- 5.6a design from a spec (CED 3.1, 3.2, FRQ 2 training)
- 6.6a/6.6b data ethics + datasets (CED 4.1, 4.2)
- 7.6a/7.6b reading files, save games (CED 4.6)
- 8.6a dungeon maps from files (CED 4.6 + 4.11-4.13 integration)
- 10.6a recursive binary search (CED 4.17 completion)
- Docs: casting, compound-assignment, api-and-libraries,
  documentation-comments, method-signatures, string-split, run-time-analysis,
  design-from-spec, data-ethics, datasets, reading-files, searching-sorting,
  2d-algorithms, maps-from-files, recursive-search, merge-sort,
  trees-and-traversal, plus 10 quick-reference pages in docs/reference/

### Data files (data/)
monsters.txt, items.txt, dungeon1.txt, dungeon2.txt, telemetry.csv

### Exam hub (exam/, 9 pages)
index, java-quick-reference (verbatim CED appendix), mc-strategy,
mock-exam, frq/index + 4 FRQ pages (methods-and-control, class-design,
data-analysis, two-d-array), each with 2 RPG-themed practice questions,
solutions, and rubrics.

### Pacing system
- scripts/curriculum_data.py: single source of truth (83 A-days,
  83 sequence entries, 53/53 CED topics covered, exam May 12 2027 12:00 PM)
- pace.html: every A-day mapped to its work, with notes
- PACING.md: same data in markdown
- docs/coverage.html: CED topic coverage matrix + weighting check
- Dashboard rewritten: 4 phase tabs + Sprint + Season 2, all 185 lessons

### Season 2 (post-exam)
Unit 9 (inheritance), 10.5, 8.5 repositioned as post-exam material with
banners; nav chain rewired (8.4c -> 8.6a -> 10.1, 10.6a -> 9.1a etc.)

## Regeneration
- python3 scripts/curriculum_data.py   (sanity check)
- python3 scripts/gen_quickrefs.py     (reference pages)
- python3 scripts/update_unit_indexes.py
- python3 scripts/rewire_nav.py        (lesson chain)
- python3 scripts/gen_dashboard.py     (index.html, pace.html, PACING.md)
- python3 scripts/gen_coverage.py      (docs/coverage.html)
- python3 scripts/verify_site.py       (must print ALL CHECKS PASS)

## Known intentional decisions
- 8.5/10.5 lessons teach after the exam (Season 2); their nav chain order
  reflects the teaching order, not numeric order.
- Round B FRQ solutions are not posted (used for the mock, discussed in the
  May 4 workshop).
- Snow days are not modeled; pace.html notes say to shift into flex slots.
- Calendar basis: PPS 2026-27 district calendar (updated 2026-03-31) +
  IBW A/B schedule; alternation assumed A on Aug 31. If the school publishes
  a different A/B pattern, update A_DAYS in curriculum_data.py and re-run
  the generator scripts.
- linkcheck_stage1.json / linkfix_map.json are build artifacts, safe to
  delete or keep as the repair record.