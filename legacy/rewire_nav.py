#!/usr/bin/env python3
"""Rewire lesson-nav prev/next links to match the teaching sequence, and
insert new lessons into the chain.

The canonical order comes from scripts/curriculum_data.py SEQUENCE (phase
order, then within-day order). Special handling:
  - Phase 1: old 1.1-1.7, then NEW 1.8, then 2.1..2.7, NEW 2.8, NEW 2.9,
    then phase 2 begins (3.1...).
    BUT the natural numbered order is 1.1..1.8, 2.1..2.9: same thing.
  - 4.6 then NEW 4.7, then 5.1...
  - 5.5 then NEW 5.6, then 6.1...
  - 6.5 then NEW 6.6, then 7.1...
  - 7.5 then NEW 7.6, then 8.1...
  - 8.4 then 8.6 (file maps after the RPG build) then FRQ/10.1...
    Wait: pacing has 8.4 (Mar 26), 8.6 (Mar 30), E4 FRQ (Apr 1), then 10.1.
    But numeric order suggests 8.5 after 8.4. 8.5 is Season 2 (pixels).
    So the pre-exam chain runs 8.4c -> 8.6a -> 10.1a.
  - 10.4 then NEW 10.6 (Apr 26), then Season 2: 9.1..9.6, 10.5, 8.5.
  - Season 2 order: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.5a-c, 8.5a-c, then end.

Also: sets empty nav spans (no prev/next) for new lessons, adds Season 2
banners to 9.x / 10.5 / 8.5 lessons, and normalizes every nav block.
Idempotent. Run from repo root.
"""
import os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from curriculum_data import SEQUENCE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSONS = os.path.join(ROOT, "lessons")

# ---- canonical chain ----------------------------------------------------
chain = []
for e in SEQUENCE:
    for lid in e["lessons"]:
        if lid not in chain:
            chain.append(lid)
# sanity: all lesson files are in the chain
on_disk = sorted(f[:-5] for f in os.listdir(LESSONS) if f.endswith(".html"))
missing = [l for l in on_disk if l not in chain]
extra = [l for l in chain if l not in on_disk]
print("chain length:", len(chain), "| files:", len(on_disk))
if missing:
    print("!! files not in sequence:", missing)
if extra:
    print("!! chain entries with no file:", extra)
assert not missing and not extra, "chain mismatch"

SEASON2_LESSONS = {l for e in SEQUENCE if e.get("kind") in ("season2",)
                   for l in e["lessons"]}
print("season 2 lessons:", sorted(SEASON2_LESSONS))

S2_BANNER = '''<div class="callout warn">
    <strong>Season 2: beyond the exam.</strong> This topic is no longer tested
    (the 2025 CED removed inheritance from the exam). We build it after May 12
    because it makes the RPG engine dramatically better, and because you are
    ready for it. Pure craft, zero test anxiety.
</div>

'''

def nav_block(prev_id, this_id, next_id):
    p = f'<a href="{prev_id}.html">&#9664; {prev_id}</a>' if prev_id else "<span></span>"
    n = f'<a href="{next_id}.html">{next_id} &#9654;</a>' if next_id else "<span></span>"
    return (f'<div class="lesson-nav">\n    {p}\n'
            f'    <span class="lesson-id">{this_id}</span>\n    {n}\n</div>')

changed = 0
for i, lid in enumerate(chain):
    prev_id = chain[i - 1] if i > 0 else None
    next_id = chain[i + 1] if i < len(chain) - 1 else None
    path = os.path.join(LESSONS, lid + ".html")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    before = text

    # normalize the nav block
    newnav = nav_block(prev_id, lid, next_id)
    m = re.search(r'<div class="lesson-nav">.*?</div>', text, re.S)
    if m:
        text = text[:m.start()] + newnav + text[m.end():]
    else:
        # insert after the top-nav close
        ins = text.find("</nav>") + len("</nav>")
        text = text[:ins] + "\n\n<div class=\"page\">\n\n" + newnav + "\n"
        # this branch should not happen; all lessons have nav blocks

    # season 2 banner (after h1, before first activity div)
    if lid in SEASON2_LESSONS and "Season 2: beyond the exam" not in text:
        h1 = re.search(r"<h1>[^<]*</h1>", text)
        if h1:
            text = text[:h1.end()] + "\n\n" + S2_BANNER + text[h1.end():]

    if text != before:
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        changed += 1

print(f"rewired nav in {changed} files")

# ---- dashboard badge data will be regenerated separately ----------------
print("OK")