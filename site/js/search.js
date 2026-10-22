// ── Search inside the documents ───────────────────────────────────────────────────────────────
// The build writes search.json, the text of every PDF page by page (builder/search.py). It is
// fetched the first time the search field is used, so a visit without a search never downloads
// it; without it (no pdftotext at build time, offline) the field searches the names only (ui.js).
