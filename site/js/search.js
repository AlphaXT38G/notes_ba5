// ── Search inside the documents ───────────────────────────────────────────────────────────────
// The build writes search.json, the text of every PDF page by page (builder/search.py). It is
// fetched the first time the search field is used, so a visit without a search never downloads
// it; without it (no pdftotext at build time, offline) the field searches the names only (ui.js).
let searchDocs = null,     // link href -> its pages: [{ text, fold, low }] (fold: no accents, low: lowercase too)
    searchRequest = null;  // the request for search.json, made once
// Accents removed one character at a time, so that a position in the folded text is the same
// position in the original one (the extract shows the original)
const searchFold = s => s.replace(/[^\x00-\x7f]/g, c => {
  const base = c.normalize("NFD").charAt(0);
  return base.charCodeAt(0) < 128 ? base : c;
});
// Lowercase, keeping the length too (a few letters, like the Turkish İ, would grow)
const searchLower = s => {
  const low = s.toLowerCase();
  return low.length === s.length ? low : s.replace(/[A-Z]/g, c => c.toLowerCase());
};
const searchFetch = () => {
  if (searchRequest || !window.fetch) return;
  searchRequest = fetch("search.json").then(r => r.ok ? r.json() : null).then(data => {
    if (!data) return;
    searchDocs = {};
    Object.keys(data).forEach(href => {
      searchDocs[href] = data[href].map(text => {
        const fold = searchFold(text);
        return { text, fold, low: searchLower(fold) };
      });
    });
  }).catch(() => {});
};
q.addEventListener("focus", searchFetch);
q.addEventListener("input", searchFetch);

// The query as terms: { len, re }. Parsed once per query, not once per document.
let searchTermsFor = null, searchTerms = [];
const searchTermsOf = query => {
  if (query === searchTermsFor) return searchTerms;
  searchTermsFor = query;
  const found = query.match(/\S+/g) || [];
  searchTerms = found.map(t => {
    const fold = searchLower(searchFold(t));
    const text = fold.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { len: fold.length, re: new RegExp(text, "g") };
  });
  return searchTerms;
};
// Where a term is in a page: the start of each match
const searchTermAt = (t, page) => {
  const hay = page.low, at = [];
  t.re.lastIndex = 0;
  for (let m; (m = t.re.exec(hay));) at.push(m.index);
  return at;
};

