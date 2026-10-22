"""The text of the PDFs, page by page, for the search field of the index page (dist/search.json).

Extracted with pdftotext (poppler), optional like the previews: without it there is no
search.json and the page searches the documents' names only.
"""

import json
import re
import subprocess
import unicodedata

from .config import DIST, PDFTOTEXT
from .log import ok

def pages(p):
    """Text of each page of a PDF (a list of strings), or None without pdftotext.

    Cached next to the PDF (01.pdf -> 01.pdf.txt, pages separated by form feeds), remade only when
    the PDF is newer, like the previews. Ligatures (ﬁ) become plain letters (NFKC), words cut at
    the end of a line are joined again, every run of spaces and line breaks becomes one space, so
    a phrase typed in the search field is found across lines, and the dot leaders of a table of
    contents (". . . . 22") become one "…".
    """
    txt = p.with_name(f"{p.name}.txt")
    if not (txt.exists() and txt.stat().st_mtime >= p.stat().st_mtime):
        if not PDFTOTEXT:
            return None
        out = subprocess.run([PDFTOTEXT, "-enc", "UTF-8", str(p), "-"], capture_output=True).stdout
        txt.write_text(out.decode("utf-8", errors="replace"), encoding="utf-8")
    text = unicodedata.normalize("NFKC", txt.read_text(encoding="utf-8"))
    text = re.sub(r"(\w)-\n(?=[a-zà-ÿ])", r"\1", text)  # secu-\nrity -> security
    # pdftotext ends every page with a form feed, the last one too: nothing after it
    return [re.sub(r"(?: ?\.){4,}", " …", re.sub(r"\s+", " ", page)).strip() for page in text.split("\f")[:-1]]

def write_search(texts):
    """dist/search.json: {"<subject>/<path>.pdf": [text of page 1, page 2...]}, the link of each
    document on the page as its key. Fetched by site/js/search.js the first time someone searches.
    """
    texts = {href: t for href, t in texts.items() if t}
    if not texts:
        return
    (DIST / "search.json").write_text(json.dumps(texts, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    size = (DIST / "search.json").stat().st_size
    ok(f"dist/search.json ({len(texts)} documents, {sum(map(len, texts.values()))} pages, {size / 1e3:.0f} kB)")
