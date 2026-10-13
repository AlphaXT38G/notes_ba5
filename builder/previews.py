"""First-page thumbnails of the PDFs, made with poppler (pdftoppm / pdftotext), both optional."""

import re
import subprocess

from .config import PDFTOPPM, PDFTOTEXT, PREVIEW_PX

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
