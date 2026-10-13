#!/usr/bin/env python3
"""
Compile all LaTeX files in subject folders, copy PDFs to dist/ and
generate dist/index.html (an overview of every built PDF).
Subjects (name, exam rules) are declared in subjects.json.

Every standalone .tex of a subject is compiled, subfolders included (e.g. week/week01.tex),
and PDFs without a .tex next to them (e.g. cheatsheets/*.pdf) are copied as is.
On Windows, run it with PYTHONIOENCODING=utf-8 so the console can print the ✔ / → symbols.
The work itself is done by the builder/ package; the index page lives in site/ (see AGENTS.md).
Usage:

# Tout compiler
python build.py

# Un seul sujet
python build.py algo

# Plusieurs sujets
python build.py algo iml

# Regenerer seulement dist/index.html (sans compiler)
python build.py --index-only

"""

import sys

from builder.config import ALL_SUBJECTS
from builder.latex import build_subject
from builder.log import GREEN, RED, RESET
from builder.page import build_index

args = sys.argv[1:]
index_only = "--index-only" in args
subjects = [a for a in args if not a.startswith("--")] or ALL_SUBJECTS
if index_only:
    subjects = []

results = {}   # subject/file -> "ok" | "error"
for subject in subjects:
    build_subject(subject, results)

build_index()

# ── Summary ──────────────────────────────────────────────────────────────────
print(f"\n{'─'*50}")
ok_count  = sum(1 for v in results.values() if v == "ok")
err_count = sum(1 for v in results.values() if v == "error")
print(f"  {GREEN}{ok_count} succeeded{RESET}  |  {RED}{err_count} failed{RESET}")
if err_count:
    sys.exit(1)
