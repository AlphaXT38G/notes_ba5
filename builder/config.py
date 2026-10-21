"""Paths, subjects and the constants shared by the build."""

import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # the repository
DIST = ROOT / "dist"                            # build output, published by GitHub Pages
SITE = ROOT / "site"                            # the index page: template, CSS and JS

# Subjects, in display order: {"id", "name", "exam", optional "weeks" and "color"}
CONFIG = json.loads((ROOT / "subjects.json").read_text(encoding="utf-8"))
ALL_SUBJECTS = [s["id"] for s in CONFIG]

# ── Index page ───────────────────────────────────────────────────────────────
KINDS = {"course.pdf": "Course notes", "cheatsheet.pdf": "Cheat sheet"}
ORDER = list(KINDS)  # course first, then cheatsheet, then anything else
NEW_DAYS = 4         # documents changed more recently get a "New" badge
SEMESTER_WEEKS = 14  # length of the progress bar, override with "weeks" in subjects.json
PREVIEW_PX = 240     # longest side of the first-page previews, in pixels (shown smaller, for sharpness)
PDFTOPPM = shutil.which("pdftoppm")    # makes the previews; optional
PDFTOTEXT = shutil.which("pdftotext")  # finds where the content of course notes starts; optional
# One accent per subject (in subjects.json order), override with "color" in subjects.json
PALETTE = ["#3b6fd8", "#d9622b", "#2f9e6b", "#b4459a", "#c99a1c", "#7a55d1", "#1f9bb0", "#d04452"]
WEEK = re.compile(r"(?:week_?)?(\d+)(.*)", re.I)  # weekly notes: week/01.pdf, week/3b.pdf (the old week01 name still works)

def weekly(p):
    """Match of WEEK on a PDF or .tex if it is a weekly note, else None.

    Group 1 is the week number, group 2 a suffix ("b"). Only files in a week/ folder count, so
    exercises/01.pdf and an archive like notes/week01.pdf stay plain documents.
    """
    return WEEK.fullmatch(p.stem) if p.parent.name == "week" else None
