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
import re
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

    # Standalone documents only (files pulled in with \input have no \documentclass)
    tex_files = sorted(
        t for t in subject_dir.rglob("*.tex")
        if "\\documentclass" in t.read_text(encoding="utf-8", errors="replace")
    )
    # PDFs that are not produced by a .tex here (e.g. downloaded sheets)
    extra_pdfs = sorted(p for p in subject_dir.rglob("*.pdf") if p.with_suffix(".tex") not in tex_files)
    if not tex_files and not extra_pdfs:
        print(f"\n{BOLD}{subject}{RESET}: no documents found, skipping.")
        continue

    print(f"\n{BOLD}{subject}{RESET}")

    out_dir = DIST / subject
    out_dir.mkdir(parents=True, exist_ok=True)

    for pdf in extra_pdfs:
        rel = pdf.relative_to(subject_dir)
        (out_dir / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(pdf, out_dir / rel)
        ok(f"{rel.as_posix()}  →  dist/{subject}/{rel.as_posix()}")

    for tex in tex_files:
        rel = tex.relative_to(subject_dir)
        label = f"{subject}/{rel.as_posix()}"
        info(f"Compiling {rel.as_posix()} …")

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
            dest = out_dir / rel.with_suffix(".pdf")
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(pdf, dest)
            ok(f"{rel.as_posix()}  →  dist/{subject}/{dest.relative_to(out_dir).as_posix()}")
            results[label] = "ok"
        else:
            err(f"{rel.as_posix()} failed (exit {proc.returncode})")
            # Print the first error (and some context) for quick diagnosis
            log = tex.with_suffix(".log")
            if log.exists():
                lines = log.read_text(errors="replace").splitlines()
                start = next((i for i, l in enumerate(lines) if l.startswith("!")), max(len(lines) - 20, 0))
                for line in lines[start:start + 12]:
                    print(f"       {line}")
            results[label] = "error"


# ── Index page ───────────────────────────────────────────────────────────────
KINDS = {"course.pdf": "Course notes", "cheatsheet.pdf": "Cheat sheet"}
ORDER = list(KINDS)  # course first, then cheatsheet, then anything else
NEW_DAYS = 7         # documents changed more recently get a "New" badge
SEMESTER_WEEKS = 14  # length of the progress bar, override with "weeks" in subjects.json
# One accent per subject (in subjects.json order), override with "color" in subjects.json
PALETTE = ["#3b6fd8", "#d9622b", "#2f9e6b", "#b4459a", "#c99a1c", "#7a55d1", "#1f9bb0", "#d04452"]
WEEK = re.compile(r"week_?(\d+)(.*)", re.I)  # weekly notes: week01.pdf, week_3.pdf, ...

CSS = """
:root{--bg:#f5f6f8;--fg:#15171a;--card:#fff;--line:#e2e5ea;--acc:#2457c5;--acc-bg:#eaf0fd;--mut:#6b7280;--new:#1d7a46;--new-bg:#dcf3e5}
@media(prefers-color-scheme:dark){:root{--bg:#121417;--fg:#e9eaec;--card:#1b1e23;--line:#2c3037;--acc:#8ab0ff;--acc-bg:#232b3d;--mut:#8b93a1;--new:#7ee0a5;--new-bg:#1d3a2a}}
*{box-sizing:border-box}
body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg);margin:0}
.wrap{max-width:960px;margin:0 auto;padding:2.5rem 1rem 3rem}
header{margin-bottom:1.75rem}
h1{font-size:1.9rem;margin:0;letter-spacing:-.02em}
.sub{color:var(--mut);margin:.25rem 0 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:2rem 2.5rem;align-items:start}
section{border-left:4px solid var(--c);padding-left:1rem}
.code{font:600 .7rem ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--c)}
h2{font-size:1.1rem;line-height:1.3;margin:.1rem 0 .15rem}
.exam{margin:0 0 .4rem;font-size:.85rem;color:var(--mut)}
.links{list-style:none;margin:.5rem 0 0;padding:0;border-top:1px solid var(--line)}
.links a{display:flex;justify-content:space-between;gap:1rem;padding:.55rem 0;border-bottom:1px solid var(--line);color:var(--acc);text-decoration:none;font-weight:600}
.links a:hover,.links a:focus-visible{background:var(--acc-bg)}
.links small{color:var(--mut);font-size:.78rem;font-weight:400;align-self:center;white-space:nowrap}
details summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:.4rem;padding:.55rem 0;border-bottom:1px solid var(--line);color:var(--mut);font-size:.9rem;font-weight:600}
details summary::-webkit-details-marker{display:none}
details summary::before{content:"";width:.45rem;height:.45rem;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(-45deg);transition:transform .15s}
details[open] summary::before{transform:rotate(45deg)}
details summary:hover,details summary:focus-visible{color:var(--fg)}
details .links{margin:0;border-top:0;padding-left:1rem}
.new{display:inline-block;margin-left:.5rem;padding:.05rem .45rem;border-radius:999px;background:var(--new-bg);color:var(--new);font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;vertical-align:.1em}
.progress{margin-left:auto;display:flex;align-items:center;gap:.5rem;font-size:.75rem;font-weight:600;color:var(--mut);white-space:nowrap}
.bar{width:6rem;height:.4rem;border-radius:999px;background:var(--line);overflow:hidden}
.bar span{display:block;height:100%;border-radius:inherit;background:var(--c)}
.group{font:600 .7rem ui-monospace,monospace;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);padding:.6rem 0 .1rem;border-bottom:1px solid var(--line)}
footer{margin-top:2rem;color:var(--mut);font-size:.8rem}
"""

def label(p, root):
    if p.relative_to(root).as_posix() in KINDS:
        return KINDS[p.relative_to(root).as_posix()]
    m = WEEK.fullmatch(p.stem)
    if m:
        return f"Week {m[1]}{m[2]}"
    return p.stem.replace("_", " ")

def sources(subject, p, root):
    """Files a built PDF comes from: its .tex and the files it inputs, or the PDF itself."""
    src = ROOT / subject / p.relative_to(root)
    tex = src.with_suffix(".tex")
    if not tex.exists():
        return [src]
    inputs = re.findall(r"\\(?:input|include)\{([^}]+)\}", tex.read_text(encoding="utf-8", errors="replace"))
    return [tex] + [(tex.parent / i).with_suffix(".tex") for i in inputs]

def updated(subject, p, root):
    """Date of the last commit touching the sources (file mtime if never committed)."""
    files = [f for f in sources(subject, p, root) if f.exists()]
    out = subprocess.run(
        ["git", "log", "-1", "--format=%ct", "--", *map(str, files)],
        cwd=ROOT, capture_output=True, text=True,
    ).stdout.strip()
    return datetime.fromtimestamp(int(out)) if out else datetime.fromtimestamp(p.stat().st_mtime)

def is_new(when):
    return (datetime.now() - when).days < NEW_DAYS

def link(subject, p, root, when):
    rel = p.relative_to(root).as_posix()
    badge = '<span class="new">New</span>' if is_new(when) else ""
    return (
        f'<li><a href="{subject}/{html.escape(rel)}"><span>{html.escape(label(p, root))}{badge}</span>'
        f'<small>{p.stat().st_size / 1e6:.1f} MB · {when:%d %b %Y}</small></a></li>'
    )

def fold(subject, pdfs, root, when, noun, grouped=True, extra=""):
    """Collapsible list of PDFs, with folder headings when grouped."""
    if not pdfs:
        return ""
    items, group = [], None
    for p in pdfs:
        folder = p.relative_to(root).parent.as_posix()
        if grouped and folder != "." and folder != group:
            items.append(f'<li class="group">{html.escape(folder)}</li>')
        group = folder
        items.append(link(subject, p, root, when[p]))
    n = len(pdfs)
    # The list is folded, so say on the summary when something new is inside
    fresh = sum(is_new(when[p]) for p in pdfs)
    badge = f'<span class="new">{fresh} new</span>' if fresh else ""
    return (
        f'<li><details><summary>{n} {noun}{"s" if n > 1 else ""}{badge}{extra}</summary>'
        f'<ul class="links">{"".join(items)}</ul></details></li>'
    )

def progress(weeks, subject):
    """Bar showing the latest weekly note against the length of the semester."""
    if not weeks:
        return ""
    total = subject.get("weeks", SEMESTER_WEEKS)
    last = max(int(WEEK.fullmatch(p.stem)[1]) for p in weeks)
    pct = min(100, round(100 * last / total))
    return (
        f'<span class="progress" title="Week {last} of {total}">'
        f'<span class="bar"><span style="width:{pct}%"></span></span>{last}/{total}</span>'
    )

def natural(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.as_posix())]

def build_index():
    cards = []
    for i, s in enumerate(CONFIG):
        root = DIST / s["id"]
        pdfs = list(root.rglob("*.pdf")) if root.is_dir() else []
        if not pdfs:
            continue
        when = {p: updated(s["id"], p, root) for p in pdfs}
        course = root / "course.pdf"
        main = [course] if course in pdfs else []
        rest = sorted(
            (p for p in pdfs if p not in main),
            key=lambda p: (
                len(p.relative_to(root).parts) > 1,          # top-level files first
                ORDER.index(p.name) if p.parent == root and p.name in ORDER else len(ORDER),
                natural(p.relative_to(root)),
            ),
        )
        weeks = [p for p in rest if WEEK.fullmatch(p.stem)]
        others = [p for p in rest if p not in weeks]
        links = "".join(link(s["id"], p, root, when[p]) for p in main)
        links += fold(s["id"], weeks, root, when, "weekly note", grouped=False, extra=progress(weeks, s))
        links += fold(s["id"], others, root, when, "more document")
        exam = f'<p class="exam">Exam: {html.escape(s["exam"])}</p>' if s.get("exam") else ""
        cards.append(
            f'<section style="--c:{s.get("color", PALETTE[i % len(PALETTE)])}"><span class="code">{s["id"]}</span>'
            f'<h2>{html.escape(s["name"])}</h2>{exam}<ul class="links">{links}</ul></section>'
        )
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Notes BA5</title>
<style>{CSS}</style></head><body><div class="wrap">
<header><h1>Notes BA5</h1><p class="sub">EPFL IN, autumn semester: course notes, weekly notes and cheat sheets</p></header>
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
