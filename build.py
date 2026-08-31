#!/usr/bin/env python3
"""
Compile all LaTeX files in subject folders and copy PDFs to _overview/.
Usage:

# Tout compiler
python build.py

# Un seul sujet
python build.py algo

# Plusieurs sujets
python build.py algo iml

"""

import subprocess
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).parent
OVERVIEW = ROOT / "_overview"
EXCLUDE = {"_overview", "_shared", ".claude", ".git"}

# Discover subject folders (any dir at root level not in EXCLUDE)
ALL_SUBJECTS = sorted(
    d.name for d in ROOT.iterdir()
    if d.is_dir() and d.name not in EXCLUDE
)

subjects = sys.argv[1:] if len(sys.argv) > 1 else ALL_SUBJECTS

# ── ANSI colours ────────────────────────────────────────────────────────────
GREEN  = "\033[32m"
RED    = "\033[31m"
YELLOW = "\033[33m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):  print(f"  {GREEN}✔{RESET}  {msg}")
def err(msg): print(f"  {RED}✘{RESET}  {msg}")
def info(msg):print(f"  {YELLOW}→{RESET}  {msg}")

# ── Main ─────────────────────────────────────────────────────────────────────
results = {}   # subject/file -> "ok" | "error" | "skipped"

for subject in subjects:
    subject_dir = ROOT / subject
    if not subject_dir.is_dir():
        print(f"\n{BOLD}{subject}{RESET}: folder not found, skipping.")
        continue

    tex_files = sorted(subject_dir.glob("*.tex"))
    if not tex_files:
        print(f"\n{BOLD}{subject}{RESET}: no .tex files found, skipping.")
        continue

    print(f"\n{BOLD}{subject}{RESET}")

    out_dir = OVERVIEW / subject
    out_dir.mkdir(parents=True, exist_ok=True)

    for tex in tex_files:
        label = f"{subject}/{tex.name}"
        info(f"Compiling {tex.name} …")

        cmd = [
            "latexmk",
            "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-cd",          # change to file's directory
            str(tex),
        ]

        proc = subprocess.run(cmd, capture_output=True, text=True)

        pdf = tex.with_suffix(".pdf")
        if proc.returncode == 0 and pdf.exists():
            dest = out_dir / pdf.name
            shutil.copy2(pdf, dest)
            ok(f"{tex.name}  →  _overview/{subject}/{pdf.name}")
            results[label] = "ok"
        else:
            err(f"{tex.name} failed (exit {proc.returncode})")
            # Print last 20 lines of log for quick diagnosis
            log = tex.with_suffix(".log")
            if log.exists():
                lines = log.read_text(errors="replace").splitlines()
                for line in lines[-20:]:
                    print(f"       {line}")
            results[label] = "error"

# ── Summary ──────────────────────────────────────────────────────────────────
print(f"\n{'─'*50}")
ok_count  = sum(1 for v in results.values() if v == "ok")
err_count = sum(1 for v in results.values() if v == "error")
print(f"  {GREEN}{ok_count} succeeded{RESET}  |  {RED}{err_count} failed{RESET}")
if err_count:
    sys.exit(1)
