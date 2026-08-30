#!/usr/bin/env python3
"""
One-time mechanical repair for the AP CS A curriculum site (2026-08-30).

Fixes, in order:
  1. Lesson-nav label/href mismatches (label must equal the linked lesson id).
  2. The dead `Demos` nav tab -> new `Exam` tab (exam/ hub).
  3. Every broken internal link recorded in linkcheck_stage1.json,
     repointed via the verified map below.

Run:  python3 scripts/fix_links.py     (from the repo root)
Idempotent: safe to run more than once.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# ---------------------------------------------------------------- fix map
# resolved dead target -> resolved replacement (None = page will be created)
REPOINT = {
  # old unpadded dirs, same file
  'docs/unit-2/scanner.html': 'docs/unit-02/scanner.html',
  'docs/unit-5/constructors.html': 'docs/unit-05/constructors.html',
  'docs/unit-9/overriding.html': 'docs/unit-09/overriding.html',
  'docs/unit-9/polymorphism.html': 'docs/unit-09/polymorphism.html',
  # old unpadded dirs, renamed page
  'docs/unit-1/math.html': 'docs/unit-02/math-class.html',
  'docs/unit-1/output.html': 'docs/unit-01/printing.html',
  'docs/unit-2/math.html': 'docs/unit-02/math-class.html',
  'docs/unit-2/objects.html': 'docs/unit-02/objects-and-classes.html',
  'docs/unit-2/strings.html': 'docs/unit-02/string.html',
  'docs/unit-3/booleans.html': 'docs/unit-03/boolean-logic.html',
  'docs/unit-3/comparing.html': 'docs/unit-03/comparing-objects.html',
  'docs/unit-3/logic.html': 'docs/unit-03/boolean-logic.html',
  'docs/unit-4/iteration.html': 'docs/unit-04/while-loops.html',
  'docs/unit-5/accessors.html': 'docs/unit-05/accessors-mutators.html',
  'docs/unit-5/classes.html': 'docs/unit-05/class-design.html',
  'docs/unit-6/algorithms.html': 'docs/unit-06/array-algorithms.html',
  'docs/unit-6/arrays.html': 'docs/unit-06/array-basics.html',
  'docs/unit-6/traversal.html': 'docs/unit-06/array-traversal.html',
  'docs/unit-7/arraylist.html': 'docs/unit-07/arraylist-basics.html',
  'docs/unit-8/2d-arrays.html': 'docs/unit-08/2d-array-basics.html',
  'docs/unit-9/abstract.html': 'docs/unit-09/abstract-classes.html',
  'docs/unit-9/inheritance.html': 'docs/unit-09/extends-and-super.html',
  'docs/unit-9/interfaces.html': 'docs/unit-09/object-interfaces-casting.html',
  # padded dir, page never written -> nearest real page
  'docs/unit-02/objects-classes.html': 'docs/unit-02/objects-and-classes.html',
  'docs/unit-03/boolean-expressions.html': 'docs/unit-03/boolean-logic.html',
  'docs/unit-03/combat-engine.html': 'docs/unit-03/combat-system.html',
  'docs/unit-05/classes-intro.html': 'docs/unit-05/class-anatomy.html',
  'docs/unit-05/mutator-methods.html': 'docs/unit-05/accessors-mutators.html',
  'docs/unit-05/string-class.html': 'docs/unit-02/string.html',
  'docs/unit-06/arrays-intro.html': 'docs/unit-06/array-basics.html',
  'docs/unit-06/arrays.html': 'docs/unit-06/array-basics.html',
  'docs/unit-07/arraylist.html': 'docs/unit-07/arraylist-basics.html',
  'docs/unit-07/arraylist-vs-arrays.html': 'docs/unit-07/arraylist-basics.html',
  'docs/unit-08/2d-arrays.html': 'docs/unit-08/2d-array-basics.html',
  'docs/unit-08/2d-traversal.html': 'docs/unit-08/2d-array-traversal.html',
  'docs/unit-08/traversal-patterns.html': 'docs/unit-08/2d-array-traversal.html',
  'docs/unit-08/dungeon-map-builder.html': 'docs/unit-08/dungeon-map.html',
  'docs/unit-09/downcasting.html': 'docs/unit-09/object-interfaces-casting.html',
  'docs/unit-09/inheritance-basics.html': 'docs/unit-09/extends-and-super.html',
  'docs/unit-09/inheritance.html': 'docs/unit-09/extends-and-super.html',
  'docs/unit-09/object-superclass.html': 'docs/unit-09/object-interfaces-casting.html',
  'docs/unit-09/comparison-interfaces.html': 'docs/unit-09/object-interfaces-casting.html',
  'docs/unit-09/combat-system.html': 'docs/unit-09/character-hierarchy.html',
  'docs/unit-10/recursion.html': 'docs/unit-10/recursion-basics.html',
  'docs/unit-10/recursive-traversal.html': 'docs/unit-10/recursive-search.html',
  'docs/unit-10/recursive-dungeon.html': 'docs/unit-10/backtracking.html',
}
CREATE_LATER = {
  'docs/unit-07/searching-sorting.html',
  'docs/unit-08/2d-algorithms.html',
  'docs/unit-10/merge-sort.html',
  'docs/unit-10/trees-and-traversal.html',
}

with open('linkcheck_stage1.json') as f:
    SCAN = json.load(f)

def relpath(target, frm):
    """Relative href from an html file to a repo-root target path."""
    t = os.path.split(target)
    base = os.path.split(frm)
    prefix = os.path.relpath(t[0], base[0]).replace(os.sep, '/')
    if prefix == '.':
        return t[1]
    return prefix + '/' + t[1]

changed_files = 0
total_edits = 0

# ---------------------------------------------------------------- pass 1+2+3
for rec in SCAN['internal_broken']:
    fp, raw, resolved = rec['file'], rec['link'], rec['resolved']
    if resolved == 'demos.html':
        continue
    if resolved in CREATE_LATER:
        continue  # pages get created in this same build
    if resolved not in REPOINT:
        print(f"!! no map entry for {resolved} (from {fp})")
        continue
    new_resolved = REPOINT[resolved]
    new_raw = relpath(new_resolved, fp)
    if new_raw == raw:
        continue
    path = os.path.join(ROOT, fp)
    with open(path, encoding='utf-8') as fh:
        text = fh.read()
    needle = f'href="{raw}"'
    if needle not in text:
        print(f"!! needle missing in {fp}: {needle}")
        continue
    before = text
    text = text.replace(needle, f'href="{new_raw}"')
    if text != before:
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(text)
        total_edits += 1

# ---------------------------------------------------------------- nav labels
lesson_dir = os.path.join(ROOT, 'lessons')
nav_fixes = 0
pat = re.compile(r'(<a href=")((?:\d+\.\d+[abc]))(\.html">)(\s*&#9664;\s*|\s*◀\s*)?(\d+\.\d+[abc][^<]*?)(\s*&#9654;|\s*▶\s*)?(</a>)')
for fn in sorted(os.listdir(lesson_dir)):
    if not fn.endswith('.html'):
        continue
    p = os.path.join(lesson_dir, fn)
    with open(p, encoding='utf-8') as fh:
        text = fh.read()
    # only inside the lesson-nav block
    def fix(m):
        global nav_fixes
        href_id, label = m.group(2), m.group(5).strip()
        if label != href_id:
            nav_fixes += 1
            left, right = m.group(4) or '', m.group(6) or ''
            return m.group(1) + href_id + m.group(3) + left + href_id + right + m.group(7)
        return m.group(0)
    # restrict to the lesson-nav div
    mblock = re.search(r'<div class="lesson-nav">(.*?)</div>', text, re.S)
    if not mblock:
        continue
    block = mblock.group(1)
    newblock = pat.sub(fix, block)
    if newblock != block:
        text = text.replace(block, newblock)
        with open(p, 'w', encoding='utf-8') as fh:
            fh.write(text)
        changed_files += 1

# ---------------------------------------------------------------- Demos -> Exam
demo_fixes = 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in ('.git',)]
    for fn in filenames:
        if not fn.endswith('.html'):
            continue
        p = os.path.join(dirpath, fn)
        with open(p, encoding='utf-8') as fh:
            text = fh.read()
        before = text
        for pref in ('', '../', '../../'):
            text = text.replace(f'<a href="{pref}demos.html">Demos</a>',
                                f'<a href="{pref}exam/index.html">Exam</a>')
        if text != before:
            demo_fixes += 1
            with open(p, 'w', encoding='utf-8') as fh:
                fh.write(text)
            changed_files += 1

print(f"repoint edits applied: {total_edits}")
print(f"nav label fixes: {nav_fixes}")
print(f"files with Demos->Exam swap: {demo_fixes}")
print("done")