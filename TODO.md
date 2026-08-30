# Curriculum Build Log — 2026-08-29/30

Status: COMPLETE. All verification checks pass (scripts/verify_site.py).

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