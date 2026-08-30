#!/usr/bin/env python3
"""Update every docs/unit-NN/index.html:
  1. Replace the dead `reference/XxxQuickRef.md` promise with a real link
     to docs/reference/unit-NN-quickref.html.
  2. Add the unit's new pages to the Concepts table (idempotent).
Run from repo root after gen_quickrefs.py.
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# new concept pages to add per unit: (filename, link text, description)
NEW_PAGES = {
  "unit-01": [
    ("casting.html", "Casting &amp; Integer Division",
     "int/int truncation, (int) casts, widening vs narrowing, the cast-order trap. New CED 1.5."),
    ("compound-assignment.html", "Compound Assignment &amp; Range",
     "+ -= *= /= %=, ++ and --, Integer.MIN/MAX_VALUE, overflow wraparound. New CED 1.5/1.6."),
  ],
  "unit-02": [
    ("api-and-libraries.html", "APIs &amp; Libraries",
     "Libraries, APIs, packages, imports, static vs instance buttons, reading javadoc. New CED 1.7."),
    ("documentation-comments.html", "Documentation with Comments",
     "Line, block, javadoc. @param and @return. Writing the contract. New CED 1.8."),
    ("method-signatures.html", "Method Signatures",
     "Anatomy, decoding, overloading, contract violations. New CED 1.9."),
    ("string-split.html", "split() &amp; Data Lines",
     "One line to many pieces. Delimiters, empty fields, the loader pattern. New CED 1.15."),
  ],
  "unit-04": [
    ("run-time-analysis.html", "Run-Time Analysis",
     "Linear vs quadratic, step counting, log n, pricing the classics. New CED 2.12."),
  ],
  "unit-05": [
    ("design-from-spec.html", "Design From a Spec",
     "The spec-to-class loop: read, plan, implement, acceptance-test, review. New CED 3.1/3.2."),
  ],
  "unit-06": [
    ("data-ethics.html", "Data Ethics &amp; Privacy",
     "Anonymization, re-identification, consent, dark patterns, the three questions. New CED 4.1."),
    ("datasets.html", "Working with Data Sets",
     "CSV, cleaning with guard clauses, the four aggregation patterns. New CED 4.2."),
  ],
  "unit-07": [
    ("reading-files.html", "Reading Files: File + Scanner",
     "hasNext/nextLine loop, all JQR methods, the exception story, loaders. New CED 4.6."),
    ("searching-sorting.html", "Searching &amp; Sorting",
     "Linear and binary search, the sorted precondition, trace tables, sort trade-offs. CED 4.14/4.15."),
  ],
  "unit-08": [
    ("2d-algorithms.html", "2D Array Algorithms",
     "The catalog: walks, row/column sums, max-and-where, neighbors, boxes. CED 4.13."),
    ("maps-from-files.html", "Dungeon Maps From Files",
     "The two-pass loader, toCharArray, jagged rows, movement on a loaded grid. CED 4.6 + 4.11."),
  ],
  "unit-10": [
    ("merge-sort.html", "Merge Sort",
     "Divide, sort halves, merge. The recursion tree, n log n, stability. CED 4.17."),
    ("recursive-search.html", "Recursive Search &amp; Merge Sort",
     "Recursive binary search, the three sins, trace tables, timing. CED 4.17."),
    ("trees-and-traversal.html", "Trees &amp; Recursive Traversal",
     "Beyond the exam: binary trees, the three walks, dialog trees. Season 2 material."),
  ],
}

# quick-ref label per unit
QUICKREF_LINE = {
  "unit-01": ("Primitive Types", "data types, operators, casting, Math.random() patterns"),
  "unit-02": ("Using Objects", "String methods, Scanner, Math class, wrapper conversions, split"),
  "unit-03": ("Boolean &amp; if", "relational operators, logic tables, if/else-if syntax, De Morgan"),
  "unit-04": ("Iteration", "while/for syntax, loop patterns, trace tables, run-time analysis"),
  "unit-05": ("Writing Classes", "class structure, constructors, static vs instance, this"),
  "unit-06": ("Arrays", "declaration, traversal patterns, algorithm templates, aggregation"),
  "unit-07": ("ArrayList", "methods, traversal, searching and sorting, file loading"),
  "unit-08": ("2D Arrays", "syntax, row/column conventions, neighbors, bounded boxes"),
  "unit-09": ("Inheritance", "extends, super, @Override, abstract, polymorphism"),
  "unit-10": ("Recursion", "base cases, call stack, binary search, merge sort"),
}

ROW = """    <tr>
        <td><a href="{fn}">{txt}</a></td>
        <td>{desc}</td>
    </tr>
"""

for udir, pages in NEW_PAGES.items():
    path = os.path.join("docs", udir, "index.html")
    with open(path, encoding="utf-8") as f:
        text = f.read()

    # 1. Quick-ref promise -> real link
    m = re.search(r'<li><strong>Quick Reference:</strong> <code>reference/[^<]+</code>[^<]*</li>', text)
    if m:
        label, contents = QUICKREF_LINE[udir]
        newli = (f'<li><strong>Quick Reference:</strong> '
                 f'<a href="../reference/{udir}-quickref.html">{label} Quick Ref</a> '
                 f'&mdash; {contents}</li>')
        text = text.replace(m.group(0), newli)

    # 2. Append new rows to the Concepts table (before the table's close, after last row)
    # find the Concepts table: from <h2>Concepts</h2> to the next </table>
    cm = re.search(r'(<h2>Concepts</h2>\s*<table>)(.*?)(</table>)', text, re.S)
    if cm:
        body = cm.group(2)
        add = ""
        for fn, txt, desc in pages:
            if f'href="{fn}"' not in body:
                add += ROW.format(fn=fn, txt=txt, desc=desc)
        if add:
            text = text[:cm.end(2)] + add + text[cm.end(2):]

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print("updated", path)

print("done")