"""The text of the PDFs, page by page, for the search field of the index page (dist/search.json).

Extracted with pdftotext (poppler), optional like the previews: without it there is no
search.json and the page searches the documents' names only.
"""

import subprocess

from .config import PDFTOTEXT

def pages(p):
    """Text of each page of a PDF (a list of strings), or None without pdftotext."""
    if not PDFTOTEXT:
        return None
    out = subprocess.run([PDFTOTEXT, "-enc", "UTF-8", str(p), "-"], capture_output=True).stdout
    text = out.decode("utf-8", errors="replace")
    return [page.strip() for page in text.split("\f")]
