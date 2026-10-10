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
ORDER = list(KINDS)  # course first, then cheatsheet, then anything else

CSS = """
:root{--bg:#f5f6f8;--fg:#15171a;--card:#fff;--line:#e2e5ea;--acc:#2457c5;--acc-bg:#eaf0fd;--mut:#6b7280}
@media(prefers-color-scheme:dark){:root{--bg:#121417;--fg:#e9eaec;--card:#1b1e23;--line:#2c3037;--acc:#8ab0ff;--acc-bg:#232b3d;--mut:#8b93a1}}
*{box-sizing:border-box}
body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg);margin:0}
.wrap{max-width:960px;margin:0 auto;padding:2.5rem 1rem 3rem}
header{margin-bottom:1.75rem}
h1{font-size:1.9rem;margin:0;letter-spacing:-.02em}
.sub{color:var(--mut);margin:.25rem 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:1rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:1.1rem 1.25rem;display:flex;flex-direction:column;gap:.75rem}
.code{align-self:flex-start;font:600 .7rem ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--acc);background:var(--acc-bg);padding:.15rem .5rem;border-radius:999px}
h2{font-size:1.08rem;line-height:1.3;margin:0}
.exam{margin:0;font-size:.85rem;color:var(--mut)}
.links{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:auto}
.links a{flex:1 1 150px;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:8px;padding:.55rem .8rem;color:var(--fg);text-decoration:none;transition:border-color .15s,background .15s}
.links a:hover,.links a:focus-visible{border-color:var(--acc);background:var(--acc-bg)}
.links b{font-weight:600;color:var(--acc)}
.links small{color:var(--mut);font-size:.75rem}
.none{color:var(--mut);font-size:.9rem;font-style:italic}
footer{margin-top:2rem;color:var(--mut);font-size:.8rem}
"""

def build_index():
    cards = []
    for s in CONFIG:
        pdfs = sorted(
            (DIST / s["id"]).glob("*.pdf"),
            key=lambda p: (ORDER.index(p.name) if p.name in ORDER else len(ORDER), p.name),
        )
        links = "".join(
            f'<a href="{s["id"]}/{p.name}"><b>{KINDS.get(p.name, p.stem)}</b>'
            f'<small>{p.stat().st_size / 1e6:.1f} MB · {datetime.fromtimestamp(p.stat().st_mtime):%d %b %Y}</small></a>'
            for p in pdfs
        ) or '<span class="none">Not built yet</span>'
        exam = f'<p class="exam">Exam: {html.escape(s["exam"])}</p>' if s.get("exam") else ""
        cards.append(
            f'<section class="card"><span class="code">{s["id"]}</span>'
            f'<h2>{html.escape(s["name"])}</h2>{exam}<div class="links">{links}</div></section>'
        )
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notes BA5</title>
<style>{CSS}</style></head><body><div class="wrap">
<header><h1>Notes BA5</h1><p class="sub">EPFL IN, autumn semester: course notes and cheat sheets</p></header>
<main class="grid">{"".join(cards)}</main>
<footer>Generated {datetime.now():%Y-%m-%d %H:%M} by build.py</footer>
</div></body></html>"""
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
