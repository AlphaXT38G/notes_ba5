#!/usr/bin/env python3
"""
Compile all LaTeX files in subject folders, copy PDFs to dist/ and
generate dist/index.html (an overview of every built PDF).
Subjects (name, exam rules) are declared in subjects.json.
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

import html
import json
import subprocess
import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"
CONFIG = json.loads((ROOT / "subjects.json").read_text(encoding="utf-8"))

ALL_SUBJECTS = [s["id"] for s in CONFIG]

args = sys.argv[1:]
index_only = "--index-only" in args
subjects = [a for a in args if not a.startswith("--")] or ALL_SUBJECTS
if index_only:
    subjects = []

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

    out_dir = DIST / subject
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
            ok(f"{tex.name}  →  dist/{subject}/{pdf.name}")
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


# ── Index page ───────────────────────────────────────────────────────────────
KINDS = {"course.pdf": "Course notes", "cheatsheet.pdf": "Cheat sheet"}

def build_index():
    cards = []
    for s in CONFIG:
        pdfs = sorted((DIST / s["id"]).glob("*.pdf"))
        links = "".join(
            f'<a href="{s["id"]}/{p.name}">{KINDS.get(p.name, p.stem)}'
            f'<small>{datetime.fromtimestamp(p.stat().st_mtime):%d %b %H:%M}</small></a>'
            for p in pdfs
        ) or '<span class="none">not built yet</span>'
        exam = f'<p class="exam">Exam: {html.escape(s["exam"])}</p>' if s.get("exam") else ""
        cards.append(
            f'<section><h2>{html.escape(s["name"])}<code>{s["id"]}</code></h2>{exam}'
            f'<div class="links">{links}</div></section>'
        )
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notes BA5</title>
<style>
:root{{--bg:#fafafa;--fg:#1a1a1a;--card:#fff;--line:#ddd;--acc:#2457c5;--mut:#777}}
@media(prefers-color-scheme:dark){{:root{{--bg:#16181c;--fg:#e8e8e8;--card:#1f2228;--line:#333;--acc:#7aa2ff;--mut:#999}}}}
body{{font:16px/1.5 system-ui,sans-serif;background:var(--bg);color:var(--fg);max-width:860px;margin:0 auto;padding:2rem 1rem}}
h1{{margin-top:0}} section{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1rem 1.25rem;margin:1rem 0}}
h2{{font-size:1.1rem;margin:0 0 .5rem;display:flex;justify-content:space-between;gap:1rem}}
code{{color:var(--mut);font-size:.8rem;font-weight:400}} .exam{{margin:.25rem 0;color:var(--mut)}}
.links{{display:flex;gap:.75rem;flex-wrap:wrap}} .links a{{border:1px solid var(--line);border-radius:6px;padding:.4rem .8rem;color:var(--acc);text-decoration:none;display:flex;flex-direction:column}}
.links a:hover{{border-color:var(--acc)}} small{{color:var(--mut);font-size:.7rem}} .none{{color:var(--mut)}}
</style></head><body>
<h1>Notes BA5</h1>
{"".join(cards)}
<p class="none">Generated {datetime.now():%Y-%m-%d %H:%M} by build.py</p>
</body></html>"""
    DIST.mkdir(exist_ok=True)
    (DIST / "index.html").write_text(page, encoding="utf-8")
    ok("dist/index.html")

build_index()

# ── Summary ──────────────────────────────────────────────────────────────────
print(f"\n{'─'*50}")
ok_count  = sum(1 for v in results.values() if v == "ok")
err_count = sum(1 for v in results.values() if v == "error")
print(f"  {GREEN}{ok_count} succeeded{RESET}  |  {RED}{err_count} failed{RESET}")
if err_count:
    sys.exit(1)
