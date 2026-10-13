"""dist/index.html: one card per subject, built from the PDFs in dist/ and the files of site/.

The page is assembled from site/template.html, whose {{placeholders}} receive the cards, the
CSS (site/css/) and the JavaScript (site/js/), all inlined so the page stays a single file.
"""

import html
import re
import subprocess
from datetime import datetime

from .config import CONFIG, DIST, KINDS, NEW_DAYS, ORDER, PALETTE, ROOT, SEMESTER_WEEKS, SITE, WEEK
from .latex import course_weeks
from .log import ok
from .previews import preview

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
