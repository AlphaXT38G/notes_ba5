"""What the build knows about the notes repository it runs on, loaded once by load().

The engine is generic: everything specific to a set of notes (title, subjects, kinds of
documents, repository link...) comes from the *content repository*, the directory passed to
`--root` (the current directory by default):

    subjects.json   the subjects: id, name, exam, optional weeks / week_pdfs / color
    site.json       optional settings of the site, merged over DEFAULTS below

The engine's own files (the page in site/, the LaTeX styles in shared/) are found next to this
package, wherever it is installed.
"""

import json
import re
import shutil
from pathlib import Path

ENGINE = Path(__file__).resolve().parent  # the package: site/ and shared/ ship inside it
SITE = ENGINE / "site"                           # the index page: template, CSS, JS, images, audio
SHARED = ENGINE / "shared"                       # course.sty and cheatsheet.sty

# Settings of the site; a content repository overrides any of them in its site.json
DEFAULTS = {
    "title": "Notes",                  # <title> and heading of the index page
    "short": "Notes",                  # short name, lettered on the metal show's amp
    "subtitle": "Course notes, weekly notes and cheat sheets",
    "repo": "",                        # "owner/name" on GitHub: the link in the PDFs' footer, if any
    # Documents named like this get this label; also their order on a card
    "kinds": {"course.pdf": "Course notes", "cheatsheet.pdf": "Cheat sheet"},
    "new_days": 4,                     # documents changed more recently get a "New" badge
    "semester_weeks": 14,              # length of the progress bar, override with "weeks" per subject
    "preview_px": 240,                 # longest side of the first-page previews (shown smaller, for sharpness)
    # One accent per subject (in subjects.json order), override with "color" per subject
    "palette": ["#3b6fd8", "#d9622b", "#2f9e6b", "#b4459a", "#c99a1c", "#7a55d1", "#1f9bb0", "#d04452"],
    "week_folders": ["week", "notes"], # folders whose PDFs are weekly notes
}

WEEK = re.compile(r"(?:week_?)?(\d+)(.*)", re.I)  # weekly notes: 01.pdf, 3b.pdf, week01.pdf

class Project:
    """The content repository: paths, subjects and settings."""

    def __init__(self, root):
        self.root = Path(root).resolve()
        self.dist = self.root / "dist"  # build output, published by GitHub Pages
        subjects = self.root / "subjects.json"
        if not subjects.is_file():
            raise SystemExit(f"{subjects} not found: run the build from a notes repository, or pass --root")
        self.subjects = json.loads(subjects.read_text(encoding="utf-8"))
        self.all_subjects = [s["id"] for s in self.subjects]
        settings = dict(DEFAULTS)
        site_json = self.root / "site.json"
        if site_json.is_file():
            unknown = set(custom := json.loads(site_json.read_text(encoding="utf-8"))) - set(DEFAULTS)
            if unknown:
                raise SystemExit(f"{site_json}: unknown setting(s) {', '.join(sorted(unknown))}")
            settings.update(custom)
        self.settings = settings
        self.kinds = settings["kinds"]
        self.order = list(self.kinds)  # course first, then cheatsheet, then anything else
        self.pdftoppm = shutil.which("pdftoppm")    # makes the previews; optional
        self.pdftotext = shutil.which("pdftotext")  # text of the PDFs: the search, where course notes start; optional

    def weekly(self, p):
        """Match of WEEK on a PDF or .tex if it is a weekly note, else None.

        Group 1 is the week number, group 2 a suffix ("b"). Only files in a week/ folder (the weeks
        built from course chapters) or a notes/ folder (standalone weekly notes, notes/week01.pdf)
        count, so exercises/01.pdf stays a plain document.
        """
        return WEEK.fullmatch(p.stem) if p.parent.name in self.settings["week_folders"] else None

P = None  # the Project of this run, set by load()

def load(root=None):
    """Load the content repository at root (the current directory by default) into P."""
    global P
    P = Project(root or Path.cwd())
    return P
