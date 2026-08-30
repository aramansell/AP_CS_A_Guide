#!/usr/bin/env python3
"""Generate the dashboard (index.html), pace.html, and PACING.md from
curriculum_data.py. Run from repo root.

The dashboard keeps the existing look (unit tabs, lesson lists, badges) but
reorganizes around the course phases and adds every lesson, including the
new ones and the Season 2 material.
"""
import os, re, sys, json
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from curriculum_data import A_DAYS, SEQUENCE, PHASES, EXAM_DATE, EXAM_TIME, DAY_NOTES, CED_TOPICS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

badge_map = json.load(open("scripts/badge_map.json"))

# lesson titles from the lesson files themselves
titles = {}
for fn in os.listdir("lessons"):
    if fn.endswith(".html"):
        lid = fn[:-5]
        t = re.search(r"<title>([^<]+)</title>", open(f"lessons/{fn}", encoding="utf-8").read())
        raw = t.group(1) if t else lid
        raw = raw.split("—")[0].strip()
        # strip a leading lesson id like "1.1a " if present
        raw = re.sub(r"^\d+\.\d+[abc]\s+", "", raw)
        raw = raw.replace("&amp;", "&")
        titles[lid] = raw

def esc(s):
    return s.replace("&", "&amp;")

def lesson_li(lid):
    cls, lbl = badge_map[lid]
    grp = lid.rsplit(".", 1)[0]
    return (f'    <li>\n'
            f'        <span class="lesson-num">{grp}</span>\n'
            f'        <span class="lesson-title"><a href="lessons/{lid}.html">{lid} {esc(titles[lid])}</a></span>\n'
            f'        <span class="badge {cls}">{lbl}</span>\n'
            f'    </li>')

# group lessons by phase
phase_lessons = {p: [] for p in range(1, 7)}
seen = set()
for e in SEQUENCE:
    for lid in e["lessons"]:
        if lid not in seen:
            seen.add(lid)
            phase_lessons[e["phase"]].append(lid)

TAB = {1: "Phase 1", 2: "Phase 2", 3: "Phase 3", 4: "Phase 4", 5: "Sprint", 6: "Season 2"}

unit_sections = []
for p in range(1, 7):
    d = PHASES[p]
    display = "none" if p > 1 else "block"
    lis = "\n".join(lesson_li(l) for l in phase_lessons[p])
    meta = f'{d["ced"]} &middot; {d["weight"]}' if d["ced"] else d["weight"]
    unit_sections.append(f'''<!-- ================================================================ -->
<!-- {d["name"].upper()} -->
<!-- ================================================================ -->
<div id="phase-{p}" class="unit-section" style="display:{display};">
<h2>{d["name"]}</h2>
<p>{meta} &middot; {d["span"]} &middot; {d["old"]}</p>

<ul class="lesson-list">
{lis}
</ul>
</div>''')

def tab_link(p):
    active = ' class="active"' if p == 1 else ""
    return f'    <a href="#phase-{p}"{active}>{TAB[p]}</a>'

tabs = "\n".join(tab_link(p) for p in range(1, 7))

dashboard = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard — AP CS A</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<nav class="top-nav">
    <a href="index.html" class="active">Dashboard</a>
    <a href="docs/index.html">Docs</a>
    <a href="projects.html">Projects</a>
    <a href="exam/index.html">Exam</a>
</nav>

<div class="page">

<h1>Dashboard</h1>

<p>
    Pick your phase below. The course runs September to the AP exam on
    <strong>May 12, 2027</strong>, then Season 2 after it. Lessons are
    numbered <strong>Unit.Lesson</strong> with activities <strong>a, b, c</strong>.
    The four phases are the four CED units: finish them all and you have
    covered 100% of the exam's required content.
</p>

<p>
    <strong>Plan by day, not by guess:</strong> the
    <a href="pace.html">Pacing Calendar</a> maps every single A-day of the
    year to its lesson. Check it when you miss a day, or to see what is coming.
</p>

<div class="unit-selector" id="unit-nav">
{tabs}
</div>

{chr(10).join(unit_sections)}

</div><!-- .page -->

<script>
// Simple unit tab switcher — no framework needed.
document.querySelectorAll('#unit-nav a').forEach(link => {{
    link.addEventListener('click', e => {{
        e.preventDefault();
        document.querySelectorAll('#unit-nav a').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.unit-section').forEach(s => s.style.display = 'none');
        link.classList.add('active');
        const target = document.querySelector(link.getAttribute('href'));
        if (target) target.style.display = 'block';
    }});
}});
if (window.location.hash) {{
    const match = document.querySelector(`#unit-nav a[href="${{window.location.hash}}"]`);
    if (match) match.click();
}}
</script>

</body>
</html>
'''
with open("index.html", "w", encoding="utf-8") as f:
    f.write(dashboard)
print("wrote index.html:", len(dashboard), "bytes")

# ------------------------------------------------------------------ pace.html
KIND_LABEL = {
    "launch": "Launch", "lesson": "Lesson", "test": "Test", "frq": "FRQ Day",
    "mock": "Mock Exam", "clinic": "Clinic", "eve": "Exam Eve", "exam": "EXAM",
    "season2": "Season 2", "capstone": "Capstone",
}
rows = []
last_phase = None
for e in SEQUENCE:
    d = date.fromisoformat(e["d"])
    pretty = d.strftime("%a %b %-d, %Y") if os.name != "nt" else d.strftime("%a %b %d, %Y")
    ced = ", ".join(e["ced"]) if e["ced"] else "&nbsp;"
    new = ' <span class="badge discovery" style="margin-left:.5rem">NEW</span>' if e.get("new") else ""
    note = f'<br><span class="day-note">{e["note"]}</span>' if e.get("note") else ""
    calnote = DAY_NOTES.get(e["d"], "")
    if calnote and not note:
        note = f'<br><span class="day-note">{calnote}</span>'
    elif calnote:
        note = f'<br><span class="day-note">{calnote}</span>' + note
    rows.append(f'''    <tr class="kind-{e["kind"]}">
        <td>{pretty}</td>
        <td>{KIND_LABEL[e["kind"]]}</td>
        <td>{e["group"]}</td>
        <td>{e["title"]}{new}{note}</td>
        <td class="ced">{ced}</td>
    </tr>''')

pace = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pacing Calendar 2026-27 — AP CS A</title>
<link rel="stylesheet" href="style.css">
<style>
.pace-table td {{ font-size: 13px; padding: 0.45rem 0.6rem; }}
.pace-table .ced {{ color: var(--muted); font-size: 12px; }}
.day-note {{ color: var(--muted); font-size: 12px; }}
tr.kind-exam td {{ background: rgba(224,85,85,0.10); font-weight: 600; }}
tr.kind-test td, tr.kind-mock td {{ background: rgba(232,184,75,0.07); }}
tr.kind-frq td {{ background: rgba(92,175,255,0.07); }}
tr.kind-clinic td {{ background: rgba(185,142,255,0.07); }}
tr.kind-season2 td, tr.kind-capstone td {{ background: rgba(240,160,96,0.07); }}
.phase-head td {{ background: #2a2a2a; color: var(--accent); font-weight: 700;
  border-top: 2px solid var(--border); }}
</style>
</head>
<body>

<nav class="top-nav">
    <a href="index.html" class="active">Dashboard</a>
    <a href="docs/index.html">Docs</a>
    <a href="projects.html">Projects</a>
    <a href="exam/index.html">Exam</a>
</nav>

<div class="page">

<h1>Pacing Calendar, 2026-27</h1>

<p>
    Every A-day of the school year, mapped to its work. Built from the PPS
    district calendar (breaks, planning days, holidays) and our A/B
    alternation. The class meets on A days only; this calendar is the contract
    between the syllabus and the clock.
</p>

<p>
    <strong>The shape:</strong> four phases (the four CED units), a two-week
    sprint, the <strong>exam on {EXAM_DATE.strftime('%B %-d, %Y')} at {EXAM_TIME}</strong>,
    then Season 2: inheritance and the engine room, post-exam, for the love
    of the game. All 53 required CED topics are covered by April 26. The last
    two weeks are pure sharpening.
</p>

<table class="pace-table">
    <tr><th>Date</th><th>Type</th><th>Unit</th><th>What we do</th><th>CED topics</th></tr>
{chr(10).join(rows)}
</table>

<p style="margin-top:2rem; color:var(--muted); font-size:13px;">
    Calendar sources: PPS 2026-27 district calendar (updated March 2026),
    IBW A/B bell schedule, College Board 2027 exam schedule. Snow days are
    not modeled; if one lands on an A day, that lesson shifts and the
    low-priority flex slots (marked in the notes) absorb it.
</p>

</div><!-- .page -->
</body>
</html>
'''
with open("pace.html", "w", encoding="utf-8") as f:
    f.write(pace)
print("wrote pace.html:", len(pace), "bytes")

# ------------------------------------------------------------------ PACING.md
md = ["# AP CS A Pacing, 2026-27 (IBW, A days)",
      "",
      f"Exam: **{EXAM_DATE.strftime('%A, %B %d, %Y')}**, {EXAM_TIME}. "
      "Source of truth: scripts/curriculum_data.py. "
      "Regenerate pages with scripts/gen_dashboard.py.",
      "",
      "| Date | Type | Group | Title | CED |",
      "|---|---|---|---|---|",
      ]
for e in SEQUENCE:
    d = date.fromisoformat(e["d"]).strftime("%Y-%m-%d (%a)")
    ced = " ".join(e["ced"])
    note = f" — {e['note']}" if e.get("note") else ""
    md.append(f"| {d} | {KIND_LABEL[e['kind']]} | {e['group']} | {e['title']}{note} | {ced} |")

covered = set()
for e in SEQUENCE:
    covered.update(e["ced"])
md += ["", f"Coverage: {len(covered)}/{len(CED_TOPICS)} CED topics. All covered." if len(covered) == len(CED_TOPICS) else f"Coverage: MISSING {sorted(set(CED_TOPICS)-covered)}"]
with open("PACING.md", "w", encoding="utf-8") as f:
    f.write("\n".join(md) + "\n")
print("wrote PACING.md")