# Curriculum Audit — TODO

Saved from audit on 2026-05-19. File issues in priority order.

## HIGH — Broken Quick Reference links (all units)
Every unit index page links to `reference/PrimitiveTypesQuickRef.md` (or similar).
The `reference/` directory does not exist. All 10 links are dead.
**Fix:** Create the files OR remove the links from all unit indexes.

## HIGH — Unit 9 has no teacher walkthroughs
All units have a "Teacher Projects" section with standalone demos except Unit 9.
Students are asked to refactor Player.java + Monster.java into a GameCharacter hierarchy
without a scaffolded demo first. Unit 5 (the other writing-classes unit) has Card and
BankAccount as teacher demos.
**Fix:** Add at least one teacher walkthrough (e.g., Animal → Dog/Cat or Shape → Circle/Rectangle).

## MEDIUM — Unit 3 orphan page
`docs/unit-03/number-pattern.html` exists but is not listed on the Unit 3 index page
in the Teacher Projects table. Students browsing the index would never find it.
**Fix:** Add number-pattern.html to the Unit 3 index Teacher Projects table.

## MEDIUM — Unit 10 double-lists concept pages as teacher projects
`unit-10/index.html` lists recursion-basics.html, recursive-search.html, and
recursive-fibonacci.html under BOTH the Concepts table AND the Teacher Projects table.
No other unit does this.
**Fix:** Either remove the Teacher Projects table (with a callout like Unit 4's),
or create separate demo pages.

## LOW — Walkthrough title inconsistency (Unit 5 vs rest)
Units 1-4 and 6-8 use "Full Walkthrough" in page titles. Unit 5 uses just "Walkthrough."
(e.g., "Bank Account — Walkthrough" vs "Slot Machine — Full Walkthrough").
**Fix:** Normalize to one convention.

## LOW — Unit 7 RPG guide count
Unit 7 (ArrayList) has only 1 RPG guide (DynamicInventory.java). Neighboring Unit 6
has 2, Unit 10 has 3. Not necessarily broken, but noticeably thinner.
**Consider:** Adding a second guide (party roster, spellbook, etc.).

## STRENGTHS (for context)
- Unit index template is rock-solid across all 10 units
- RPG Thread sections are excellent connective tissue
- Bug Hunt (41 files) and Tinker Challenge (44 files) are broadly distributed
- "How This Connects to Your RPG" appears in 16 teacher walkthroughs
- Student RPG Guides are consistently formatted
- CSS system (callout, warn, lab, bug-hunt) is used uniformly
