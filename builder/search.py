"""The text of the PDFs, page by page, for the search field of the index page (dist/search.json).

Extracted with pdftotext (poppler), optional like the previews: without it there is no
search.json and the page searches the documents' names only.
"""

import subprocess
import unicodedata

from .config import PDFTOTEXT

def pages(p):
    """Text of each page of a PDF (a list of strings), or None without pdftotext.

    Cached next to the PDF (01.pdf -> 01.pdf.txt, pages separated by form feeds), remade only when
    the PDF is newer, like the previews. Ligatures (ﬁ) become plain letters (NFKC).
    """
    txt = p.with_name(f"{p.name}.txt")
    if not (txt.exists() and txt.stat().st_mtime >= p.stat().st_mtime):
        if not PDFTOTEXT:
            return None
        out = subprocess.run([PDFTOTEXT, "-enc", "UTF-8", str(p), "-"], capture_output=True).stdout
        txt.write_text(out.decode("utf-8", errors="replace"), encoding="utf-8")
    text = unicodedata.normalize("NFKC", txt.read_text(encoding="utf-8"))
    # pdftotext ends every page with a form feed, the last one too: nothing after it
    return [page.strip() for page in text.split("\f")[:-1]]
