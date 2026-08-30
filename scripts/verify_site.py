#!/usr/bin/env python3
"""Full site verification. Run from repo root: python3 scripts/verify_site.py

Checks:
  1. Zero broken internal links (href + src) across all HTML files.
  2. Zero broken same-page anchors.
  3. Lesson nav chain: prev/next bidirectionally consistent, covers all files.
  4. Dashboard lists every lesson file; every dashboard link resolves.
  5. Every unit index's links resolve; quickref links resolve.
  6. CED coverage: all 53 topics appear in the coverage matrix with lessons.
  7. No page still references demos.html or reference/*.md.
Exit code 1 if anything fails.
"""
import os, re, sys, urllib.parse, collections
from html.parser import HTMLParser
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from curriculum_data import SEQUENCE, CED_TOPICS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

fail = []

class LP(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if value is None: continue
            if name == "id":
                self.ids.add(value)
            if tag in ("a","link","area") and name == "href":
                self.links.append(value)
            elif tag in ("img","script","source","iframe","embed") and name == "src":
                self.links.append(value)

pages = {}
for dirpath, dirnames, filenames in os.walk("."):
    dirnames[:] = [d for d in dirnames if d not in (".git",)]
    for f in filenames:
        if f.endswith((".html", ".htm")):
            rel = os.path.relpath(os.path.join(dirpath, f), ".")
            text = open(rel, encoding="utf-8", errors="replace").read()
            p = LP(); p.feed(text)
            pages[rel] = (p.links, p.ids, text)

print(f"scanned {len(pages)} HTML pages")

# ---- 1+2: links and anchors
broken_links = []
broken_anchors = []
for fp, (links, ids, text) in pages.items():
    fdir = os.path.dirname(fp)
    for raw in links:
        raw = raw.strip()
        if not raw or raw.startswith(("mailto:","tel:","data:","javascript:")):
            continue
        if raw.startswith("#"):
            if raw[1:] and raw[1:] not in ids:
                broken_anchors.append((fp, raw))
            continue
        if raw.startswith(("http://","https://")):
            continue
        path_part, _, frag = raw.partition("#")
        path_part = path_part.split("?")[0]
        if not path_part:
            continue
        norm = os.path.normpath(os.path.join(fdir, urllib.parse.unquote(path_part)))
        if not os.path.exists(norm):
            broken_links.append((fp, raw, norm))
        elif frag and norm.endswith(".html"):
            norm_rel = os.path.relpath(norm, ".")
            if norm_rel in pages and frag not in pages[norm_rel][1]:
                broken_anchors.append((fp, raw))

if broken_links:
    print(f"FAIL: {len(broken_links)} broken links")
    for fp, raw, norm in broken_links[:30]:
        print(f"   {fp}: {raw} -> {norm}")
    fail.append("broken links")
else:
    print("PASS: zero broken internal links")

if broken_anchors:
    print(f"FAIL: {len(broken_anchors)} broken anchors")
    for fp, raw in broken_anchors[:20]:
        print(f"   {fp}: {raw}")
    fail.append("broken anchors")
else:
    print("PASS: zero broken anchors")

# ---- 3: nav chain
lesson_dir = "lessons"
lesson_files = sorted(f[:-5] for f in os.listdir(lesson_dir) if f.endswith(".html"))
chain = []
for e in SEQUENCE:
    for lid in e["lessons"]:
        if lid not in chain:
            chain.append(lid)
if sorted(chain) != lesson_files:
    missing = set(lesson_files) - set(chain)
    extra = set(chain) - set(lesson_files)
    print(f"FAIL: chain/files mismatch. missing={missing} extra={extra}")
    fail.append("chain coverage")
else:
    print(f"PASS: nav chain covers all {len(lesson_files)} lessons")

bad_nav = []
for i, lid in enumerate(chain):
    text = open(f"{lesson_dir}/{lid}.html", encoding="utf-8").read()
    m = re.search(r'<div class="lesson-nav">(.*?)</div>', text, re.S)
    if not m:
        bad_nav.append((lid, "no lesson-nav block"))
        continue
    hrefs = re.findall(r'href="([\d.]+[abc])\.html"', m.group(1))
    want_prev = chain[i-1] if i > 0 else None
    want_next = chain[i+1] if i < len(chain)-1 else None
    got = hrefs[:]
    if want_prev and (not got or got[0] != want_prev):
        bad_nav.append((lid, f"prev should be {want_prev}, got {got[:1]}"))
    if want_next and (not got or got[-1] != want_next):
        bad_nav.append((lid, f"next should be {want_next}, got {got[-1:]}"))
    if not want_prev and got and got[0] == chain[0] and lid != chain[1]:
        bad_nav.append((lid, "has prev but should not"))
if bad_nav:
    print(f"FAIL: {len(bad_nav)} nav problems")
    for lid, why in bad_nav[:20]:
        print(f"   {lid}: {why}")
    fail.append("nav chain")
else:
    print("PASS: nav chain bidirectionally correct")

# ---- 4: dashboard completeness
idx = open("index.html", encoding="utf-8").read()
dash = set(re.findall(r'lessons/([\d.]+[abc])\.html', idx))
if dash != set(lesson_files):
    print("FAIL: dashboard missing:", set(lesson_files) - dash)
    fail.append("dashboard completeness")
else:
    print(f"PASS: dashboard lists all {len(dash)} lessons")

# ---- 5: quickrefs
qr_bad = []
for u in range(1, 11):
    idxp = f"docs/unit-{u:02d}/index.html"
    text = open(idxp, encoding="utf-8").read()
    if f"reference/unit-{u:02d}-quickref.html" not in text:
        qr_bad.append(idxp)
    if "reference/" in text.replace(f"reference/unit-{u:02d}-quickref.html", ""):
        qr_bad.append(f"{idxp} still has dead .md ref")
if qr_bad:
    print("FAIL quickrefs:", qr_bad); fail.append("quickrefs")
else:
    print("PASS: all 10 unit indexes link their quickref")

# ---- 6: coverage matrix
cov = open("docs/coverage.html", encoding="utf-8").read()
missing_topics = [t for t in CED_TOPICS if f"<strong>{t}</strong>" not in cov]
if missing_topics:
    print("FAIL: coverage matrix missing topics:", missing_topics)
    fail.append("coverage matrix")
else:
    print(f"PASS: coverage matrix lists all {len(CED_TOPICS)} CED topics")

# ---- 7: no demos.html / dead .md refs anywhere
demos_refs = [fp for fp, (l, i, t) in pages.items() if "demos.html" in t]
md_refs = [fp for fp, (l, i, t) in pages.items()
           if re.search(r'reference/\w+\.md', t)]
if demos_refs:
    print("FAIL: demos.html still referenced in:", demos_refs[:10]); fail.append("demos refs")
else:
    print("PASS: no demos.html references")
if md_refs:
    print("FAIL: dead .md quickref refs in:", md_refs[:10]); fail.append("md refs")
else:
    print("PASS: no dead .md quickref references")

# ---- 8: exam hub integrity
exam_pages = ["exam/index.html", "exam/java-quick-reference.html",
              "exam/mc-strategy.html", "exam/mock-exam.html",
              "exam/frq/index.html", "exam/frq/methods-and-control.html",
              "exam/frq/class-design.html", "exam/frq/data-analysis.html",
              "exam/frq/two-d-array.html"]
missing_exam = [p for p in exam_pages if not os.path.exists(p)]
if missing_exam:
    print("FAIL: exam pages missing:", missing_exam); fail.append("exam hub")
else:
    print(f"PASS: exam hub complete ({len(exam_pages)} pages)")

# ---- summary
print()
if fail:
    print("RESULT: FAIL —", ", ".join(fail))
    sys.exit(1)
print("RESULT: ALL CHECKS PASS")
print(f"Pages: {len(pages)} | Lessons: {len(lesson_files)} | CED topics: {len(CED_TOPICS)}")
e = [x for x in SEQUENCE if x['d'] == '2027-05-12'][0]
print(f"Exam day entry: {e['title']}")