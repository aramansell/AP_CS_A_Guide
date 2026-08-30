#!/usr/bin/env python3
"""Generate docs/coverage.html: the CED topic coverage matrix.

Maps every one of the 53 required CED (Fall 2025) topics to the lesson day,
lesson files, and docs pages that teach it. Run from repo root.
"""
import os, re, sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from curriculum_data import SEQUENCE, CED_TOPICS, PHASES

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# topic -> first teaching entry
first = {}
for e in SEQUENCE:
    for t in e["ced"]:
        if t not in first:
            first[t] = e

UNIT_OF = lambda t: int(t.split(".")[0])

rows = []
for t in sorted(CED_TOPICS, key=lambda x: (int(x.split(".")[0]), float(x.split(".")[1]))):
    e = first[t]
    d = date.fromisoformat(e["d"]).strftime("%b %-d")
    lessons = ", ".join(e["lessons"]) if e["lessons"] else "&mdash;"
    phase = e["phase"]
    new = ' <span class="badge discovery">NEW CONTENT</span>' if e.get("new") else ""
    unit = f"CED Unit {UNIT_OF(t)}"
    rows.append(f'''    <tr>
        <td><strong>{t}</strong></td>
        <td>{CED_TOPICS[t]}</td>
        <td>{unit}</td>
        <td>{d}{new}</td>
        <td>{lessons}</td>
    </tr>''')

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CED Coverage Matrix — AP CS A</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<nav class="top-nav">
    <a href="../index.html">Dashboard</a>
    <a href="index.html" class="active">Docs</a>
    <a href="../projects.html">Projects</a>
    <a href="../exam/index.html">Exam</a>
</nav>

<div class="page">

<h1>CED Coverage Matrix</h1>

<p>
    Every required topic of the AP Computer Science A Course and Exam
    Description (effective Fall 2025), mapped to when we teach it and with
    what. {len(CED_TOPICS)} of {len(CED_TOPICS)} topics covered. The last
    required topic lands April 26, sixteen days before the exam.
</p>

<p>
    "NEW CONTENT" marks topics that did not exist in the pre-2025 course:
    file reading, datasets, ethics, casting as a topic, and the rest. The
    lessons carrying that badge were written for this framework.
</p>

<table>
    <tr><th>Topic</th><th>Title</th><th>CED unit</th><th>Taught</th><th>Lessons</th></tr>
{chr(10).join(rows)}
</table>

<h2>Weighting Check</h2>

<p>Where the exam's points come from, and how much calendar each gets:</p>

<table>
    <tr><th>CED Unit</th><th>Exam weight</th><th>Our phase</th><th>Calendar span</th><th>A-days</th></tr>
    <tr><td>1: Using Objects and Methods</td><td>15-25%</td><td>Phase 1</td><td>Aug 31 - Oct 22</td><td>18</td></tr>
    <tr><td>2: Selection and Iteration</td><td>25-35%</td><td>Phase 2</td><td>Oct 26 - Dec 22</td><td>15</td></tr>
    <tr><td>3: Class Creation</td><td>10-18%</td><td>Phase 3</td><td>Jan 5 - Jan 29</td><td>9</td></tr>
    <tr><td>4: Data Collections</td><td>30-40%</td><td>Phase 4</td><td>Feb 2 - Apr 26</td><td>24</td></tr>
    <tr><td>(sprint: mock + clinics)</td><td>&mdash;</td><td>Sprint</td><td>Apr 28 - May 10</td><td>4</td></tr>
</table>

<p>
    The proportions track the weightings: the heaviest unit (Data Collections,
    30-40%) gets the most days (24) and the latest calendar position, which
    also means it is freshest at exam time. The sprint re-touches everything
    in weight order.
</p>

</div><!-- .page -->
</body>
</html>
'''
with open("docs/coverage.html", "w", encoding="utf-8") as f:
    f.write(html)
print("wrote docs/coverage.html")

# link it from the docs index
p = "docs/index.html"
text = open(p, encoding="utf-8").read()
if "coverage.html" not in text:
    ins = '''    <div class="unit-card">
        <a href="coverage.html">
            <div class="num">Map</div>
            <h3>CED Coverage Matrix</h3>
            <div class="desc">Every required topic, when we teach it, with what</div>
        </a>
    </div>

'''
    m = re.search(r'<div class="unit-grid">\s*\n', text)
    if m:
        text = text[:m.end()] + ins + text[m.end():]
        open(p, "w", encoding="utf-8").write(text)
        print("linked coverage matrix from docs index")
    else:
        print("!! unit-grid not found in docs/index.html")