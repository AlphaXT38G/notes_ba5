#!/usr/bin/env python3
"""
Compile all LaTeX files in subject folders, copy PDFs to dist/ and
generate dist/index.html (an overview of every built PDF).
Subjects (name, exam rules) are declared in subjects.json.

Every standalone .tex of a subject is compiled, subfolders included (e.g. week/week01.tex),
and PDFs without a .tex next to them (e.g. cheatsheets/*.pdf) are copied as is.
On Windows, run it with PYTHONIOENCODING=utf-8 so the console can print the ✔ / → symbols.
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

# ── Weekly notes written as chapters ─────────────────────────────────────────
# Most subjects have one standalone document per week (week/week01.tex). swent is the
# exception: its weeks are chapters \input by course.tex (weeks/week1a.tex, week1b.tex, ...),
# several parts per week. Each week is then also built as its own PDF from a small generated
# document (<subject>/_weekNN.tex, git-ignored) with the course preamble and that week's parts.
WEEK_PART = re.compile(r"week_?(\d+)[a-z]?", re.I)  # week1a, week1b, week3, ...

def course_weeks(subject_dir):
    """Weekly chapters of course.tex: {week number: [inputs, in course order]} ({} if none)."""
    course = subject_dir / "course.tex"
    if not course.exists():
        return {}
    weeks = {}
    for inp in re.findall(r"\\input\{([^}]+)\}", course.read_text(encoding="utf-8", errors="replace")):
        m = WEEK_PART.fullmatch(Path(inp).name)
        if m:
            weeks.setdefault(int(m[1]), []).append(inp)
    return weeks

def week_documents(subject_dir):
    """Write one _weekNN.tex per week of course_weeks() and return their paths.

    Same preamble as course.tex, then that week's chapters. The chapter counter starts where
    it is in the full course, so "Week2 : Part A" stays chapter 3 like in course.pdf.
    """
    parts = course_weeks(subject_dir)
    if not parts:
        return []
    preamble = (subject_dir / "course.tex").read_text(encoding="utf-8").split("\\begin{document}")[0]
    docs, before = [], 0
    for n, inputs in sorted(parts.items()):
        doc = subject_dir / f"_week{n:02d}.tex"
        text = (preamble + "\\begin{document}\n\\raggedbottom\n"
                + f"\\setcounter{{chapter}}{{{before}}}\n"
                + "".join(f"\\input{{{i}}}\n" for i in inputs) + "\\end{document}\n")
        if not doc.exists() or doc.read_text(encoding="utf-8") != text:  # keep latexmk's cache valid
            doc.write_text(text, encoding="utf-8")
        docs.append(doc)
        before += len(inputs)
    return docs

# ── Main ─────────────────────────────────────────────────────────────────────
results = {}   # subject/file -> "ok" | "error" | "skipped"

for subject in subjects:
    subject_dir = ROOT / subject
    if not subject_dir.is_dir():
        print(f"\n{BOLD}{subject}{RESET}: folder not found, skipping.")
        continue

    # Standalone documents only (files pulled in with \input have no \documentclass),
    # plus the generated per-week documents (_weekNN.tex, see week_documents)
    week_docs = week_documents(subject_dir)
    tex_files = sorted(
        t for t in subject_dir.rglob("*.tex")
        if not t.name.startswith("_") and "\\documentclass" in t.read_text(encoding="utf-8", errors="replace")
    ) + week_docs
    # PDFs that are not produced by a .tex here (e.g. downloaded sheets)
    extra_pdfs = sorted(p for p in subject_dir.rglob("*.pdf") if p.with_suffix(".tex") not in tex_files)
    if not tex_files and not extra_pdfs:
        print(f"\n{BOLD}{subject}{RESET}: no documents found, skipping.")
        continue

    print(f"\n{BOLD}{subject}{RESET}")

    out_dir = DIST / subject
    out_dir.mkdir(parents=True, exist_ok=True)

    # Copy them as is, keeping their subfolder (cheatsheets/x.pdf -> dist/<subject>/cheatsheets/x.pdf)
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
            # Mirror the source layout: week/week01.tex -> dist/<subject>/week/week01.pdf;
            # generated weeks go to the same place: _week01.tex -> dist/<subject>/week/week01.pdf
            dest = out_dir / ("week/" + tex.stem[1:] + ".pdf" if tex in week_docs else rel.with_suffix(".pdf"))
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
# dist/index.html is one self-contained page (inline CSS + JS, no external files).
# Each subject is a card: course notes first, then two collapsible sections,
# "weekly notes" (weekNN files, with a progress bar) and "more documents".
# The page also has a search field, a light/dark toggle, a flame mode and two
# easter eggs (a random surprise banner and a Konami code animation).

KINDS = {"course.pdf": "Course notes", "cheatsheet.pdf": "Cheat sheet"}
ORDER = list(KINDS)  # course first, then cheatsheet, then anything else
NEW_DAYS = 7         # documents changed more recently get a "New" badge
SEMESTER_WEEKS = 14  # length of the progress bar, override with "weeks" in subjects.json
PREVIEW_PX = 240     # longest side of the first-page previews, in pixels (shown smaller, for sharpness)
PDFTOPPM = shutil.which("pdftoppm")    # makes the previews; optional
PDFTOTEXT = shutil.which("pdftotext")  # finds where the content of course notes starts; optional
# One accent per subject (in subjects.json order), override with "color" in subjects.json
PALETTE = ["#3b6fd8", "#d9622b", "#2f9e6b", "#b4459a", "#c99a1c", "#7a55d1", "#1f9bb0", "#d04452"]
WEEK = re.compile(r"week_?(\d+)(.*)", re.I)  # weekly notes: week01.pdf, week_3.pdf, ...

# The page itself lives in site/: template.html (the HTML skeleton, with {{placeholders}}),
# css/style.css and js/*.js. They are inlined into dist/index.html, which stays one file.
SITE = ROOT / "site"

def site_file(rel):
    """Text of a file of site/, on its own lines when inlined into the page."""
    return "\n" + (SITE / rel).read_text(encoding="utf-8")

def label(p, root):
    """Display name of a PDF: "Course notes", "Week 03", or the file name with spaces."""
    if p.relative_to(root).as_posix() in KINDS:
        return KINDS[p.relative_to(root).as_posix()]
    m = WEEK.fullmatch(p.stem)
    if m:
        return f"Week {m[1]}{m[2]}"
    return p.stem.replace("_", " ")

def sources(subject, p, root):
    """Files a built PDF comes from: its .tex and the files it inputs, or the PDF itself.

    p is the PDF in dist/<subject>/, root is dist/<subject>/. The inputs are found with a
    simple regex on \\input{...} / \\include{...} (one level, enough for swent/course.tex).
    A week built from chapters of course.tex (swent) comes from those chapters.
    """
    src = ROOT / subject / p.relative_to(root)
    tex = src.with_suffix(".tex")
    if not tex.exists():
        m = WEEK.fullmatch(p.stem)
        parts = course_weeks(ROOT / subject).get(int(m[1]), []) if m else []
        return [(ROOT / subject / i).with_suffix(".tex") for i in parts] or [src]
    inputs = re.findall(r"\\(?:input|include)\{([^}]+)\}", tex.read_text(encoding="utf-8", errors="replace"))
    return [tex] + [(tex.parent / i).with_suffix(".tex") for i in inputs]

def updated(subject, p, root):
    """Date of the last commit touching the sources (file mtime if never committed).

    Build time would be useless here: on CI every file is fresh, so every PDF would look new.
    This needs the full git history, hence fetch-depth: 0 in the Pages workflow.
    """
    files = [f for f in sources(subject, p, root) if f.exists()]
    out = subprocess.run(
        ["git", "log", "-1", "--format=%ct", "--", *map(str, files)],
        cwd=ROOT, capture_output=True, text=True,
    ).stdout.strip()
    return datetime.fromtimestamp(int(out)) if out else datetime.fromtimestamp(p.stat().st_mtime)

def is_new(when):
    """True for documents changed less than NEW_DAYS ago (they get the "New" badge)."""
    return (datetime.now() - when).days < NEW_DAYS

def link(subject, p, root, when, shot=None):
    """One <li> line: document name (+ "New" badge) on the left, size and date on the right.

    It also carries the first-page thumbnail (or a "PDF" placeholder), only shown in the
    Previews view; the size and date are repeated in the tooltip for that view.
    Documents open in a new tab, so the index stays open next to them.
    """
    rel = p.relative_to(root).as_posix()
    badge = '<span class="new">New</span>' if is_new(when) else ""
    meta = f"{p.stat().st_size / 1e6:.1f} MB · {when:%d %b %Y}"
    thumb = (
        f'<img class="thumb" src="{subject}/{html.escape(shot.relative_to(root).as_posix())}" alt="" loading="lazy">'
        if shot else '<span class="thumb none">PDF</span>'
    )
    return (
        f'<li><a href="{subject}/{html.escape(rel)}" target="_blank" rel="noopener" title="{meta}">{thumb}<span>{html.escape(label(p, root))}{badge}</span>'
        f'<small>{meta}</small></a></li>'
    )

def fold(subject, pdfs, root, when, shots, noun, grouped=True, extra=""):
    """Collapsible list of PDFs, with folder headings when grouped.

    The summary reads "<n> <noun>(s)", e.g. "4 weekly notes", followed by a "<k> new" badge
    when it hides new documents, and by `extra` (HTML, used for the progress bar).
    Returns "" when there is nothing to list, so the section is simply left out.
    """
    if not pdfs:
        return ""
    items, group = [], None
    for p in pdfs:
        folder = p.relative_to(root).parent.as_posix()
        if grouped and folder != "." and folder != group:
            items.append(f'<li class="group">{html.escape(folder)}</li>')
        group = folder
        items.append(link(subject, p, root, when[p], shots[p]))
    n = len(pdfs)
    # The list is folded, so say on the summary when something new is inside
    fresh = sum(is_new(when[p]) for p in pdfs)
    badge = f'<span class="new">{fresh} new</span>' if fresh else ""
    return (
        f'<li class="fold"><details><summary>{n} {noun}{"s" if n > 1 else ""}{badge}{extra}</summary>'
        f'<ul class="links">{"".join(items)}</ul></details></li>'
    )

def progress(weeks, subject):
    """Bar showing the latest weekly note against the length of the semester.

    Progress is the highest week number published (week04 -> 4/14), not the number of files,
    so a missing week does not shift the bar. Capped at 100%.
    """
    if not weeks:
        return ""
    total = subject.get("weeks", SEMESTER_WEEKS)
    last = max(int(WEEK.fullmatch(p.stem)[1]) for p in weeks)
    pct = min(100, round(100 * last / total))
    return (
        f'<span class="progress" title="Week {last} of {total}">'
        f'<span class="bar"><span style="width:{pct}%"></span></span>{last}/{total}</span>'
    )

TOC_TITLES = {"contents", "table of contents", "table des matières", "sommaire"}
# A table of contents line ends with a page number, often after dot leaders: "1.2 Policy . . . 5"
TOC_LINE = re.compile(r"\s\d+\s*$")

def content_page(p):
    """First page after the table of contents of a course PDF (1 if there is none).

    Reads the text of the first pages with pdftotext (poppler): the TOC starts on the page whose
    heading is "Contents" (or a French equivalent) and goes on while most lines end with a page
    number. The page right after it is the first page of actual content.
    """
    if not PDFTOTEXT:
        return 1
    out = subprocess.run(
        [PDFTOTEXT, "-f", "1", "-l", "12", "-enc", "UTF-8", str(p), "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    ).stdout
    pages = [[l.strip() for l in page.splitlines() if l.strip()] for page in out.split("\f")]
    start = next((i for i, lines in enumerate(pages) if any(l.lower() in TOC_TITLES for l in lines[:3])), None)
    if start is None:
        return 1
    end = start + 1
    while end < len(pages) and pages[end] and sum(bool(TOC_LINE.search(l)) for l in pages[end]) > len(pages[end]) / 2:
        end += 1
    return end + 1 if end < len(pages) and pages[end] else 1

def preview(p):
    """Small PNG of a page of a PDF (week01.pdf -> week01.pdf.p1.png), or None.

    The first page, except for course notes, where the title page and the table of contents
    say nothing: their preview shows the first page of content instead (see content_page).
    Made with pdftoppm (poppler), only when missing or older than the PDF. Without pdftoppm,
    or if the PDF cannot be read, there is simply no preview and the page shows the name only.
    """
    page = content_page(p) if p.name == "course.pdf" else 1
    png = p.with_name(f"{p.name}.p{page}.png")  # page in the name, so a new page means a new preview
    if png.exists() and png.stat().st_mtime >= p.stat().st_mtime:
        return png
    if not PDFTOPPM:
        return None
    subprocess.run(
        [PDFTOPPM, "-f", str(page), "-l", str(page), "-png", "-singlefile", "-scale-to", str(PREVIEW_PX),
         str(p), str(png.with_suffix(""))],  # pdftoppm adds the .png itself
        capture_output=True,
    )
    return png if png.exists() else None

def natural(p):
    """Sort key that orders numbers by value: week2 before week10, 1.6 before 2.4."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.as_posix())]

def build_index():
    """Write dist/index.html from whatever PDFs are in dist/ (subjects without any are hidden)."""
    cards = []
    for i, s in enumerate(CONFIG):
        root = DIST / s["id"]
        pdfs = list(root.rglob("*.pdf")) if root.is_dir() else []
        if not pdfs:
            continue
        when = {p: updated(s["id"], p, root) for p in pdfs}  # one git call per PDF, done once
        shots = {p: preview(p) for p in pdfs}               # first-page previews (None if unavailable)
        # Course notes stay visible on the card, everything else goes in the collapsible sections
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
        # Weekly notes are recognised by their name (weekNN), wherever they are stored
        weeks = [p for p in rest if WEEK.fullmatch(p.stem)]
        others = [p for p in rest if p not in weeks]
        links = "".join(link(s["id"], p, root, when[p], shots[p]) for p in main)
        links += fold(s["id"], weeks, root, when, shots, "weekly note", grouped=False, extra=progress(weeks, s))
        links += fold(s["id"], others, root, when, shots, "more document")
        exam = f'<p class="exam">Exam: {html.escape(s["exam"])}</p>' if s.get("exam") else ""
        # --c = accent colour of the card, from subjects.json or the palette (in file order);
        # order = position among the cards, used when the two columns collapse into one (CSS .grid)
        cards.append(
            f'<section style="--c:{s.get("color", PALETTE[i % len(PALETTE)])};order:{len(cards)}"><span class="code">{s["id"]}</span>'
            f'<h2>{html.escape(s["name"])}</h2>{exam}<ul class="links">{links}</ul></section>'
        )
    page = (SITE / "template.html").read_text(encoding="utf-8").rstrip("\n")
    for key, value in {
        "head_js": site_file("js/head.js"),      # runs in <head>: saved theme / view before the first paint
        "css": site_file("css/style.css"),
        "cards_left": "".join(cards[0::2]),
        "cards_right": "".join(cards[1::2]),
        "generated": f"{datetime.now():%Y-%m-%d %H:%M}",
        "js": site_file("js/app.js"),            # runs at the end of <body>, once every element exists
    }.items():
        page = page.replace("{{" + key + "}}", value)
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
