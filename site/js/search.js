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

// The pages where the terms are: null unless every term is somewhere in the document; best: the
// first three of them.
const searchPages = (pages, ts) => {
  const seen = ts.map(() => false), hits = [];
  let total = 0;
  pages.forEach((page, i) => {
    const at = ts.map(t => searchTermAt(t, page));
    const n = at.reduce((sum, a) => sum + a.length, 0);
    at.forEach((a, k) => { if (a.length) seen[k] = true; });
    if (n) { total += n; hits.push({ i, at }); }
  });
  if (!seen.every(Boolean)) return null;
  return { total, pages: hits.length, best: hits.slice(0, 3) };
};

// One extract: about a line of text around the first match of the page, a link to that page.
// Built as nodes, never as HTML: the text comes from the PDFs.
const searchExtract = (page, hit, href) => {
  const first = hit.at.filter(a => a.length).map(a => a[0]).sort((x, y) => x - y)[0];
  const text = page.text;
  let from = Math.max(0, first - 60), to = Math.min(text.length, first + 110);
  const link = document.createElement("a");
  link.className = "hit";
  link.href = `${href}#page=${hit.i + 1}`;
  link.target = "_blank";
  link.rel = "noopener";
  const pageNo = document.createElement("b");
  pageNo.textContent = `p. ${hit.i + 1}`;
  link.append(pageNo, text.slice(from, to));
  return link;
};

