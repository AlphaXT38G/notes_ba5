// ── Search inside the documents ───────────────────────────────────────────────────────────────
// The build writes search.json, the text of every PDF page by page (builder/search.py). It is
// fetched the first time the search field is used, so a visit without a search never downloads
// it; without it (no pdftotext at build time, offline) the field searches the names only (ui.js).
// Once it is there, searchInside (ui.js) keeps a document whose text holds every word typed, and
// shows under it how many times they appear and extracts of its three best pages, each a link to
// that page (#page=N, which the browsers' PDF viewers follow).
// How a word is matched:
//   - from the start of a word of the text: "sec" finds "security", not "insecure";
//   - accents do not count ("modele" finds "modèle");
//   - case does not count, unless the word typed has a capital (smart case): "MAC" finds the
//     acronym MAC, "mac" finds "machine" too.
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
    searchInside = searchFind;
    if (q.value.trim()) runSearch();  // what is already typed is searched again, inside this time
  }).catch(() => {});
};
q.addEventListener("focus", searchFetch);
q.addEventListener("input", searchFetch);

// The query as terms: { cased, len, re }, re matching from the start of a word ((^|non-letter)
// before it, since older Safari has no lookbehind). Parsed once per query, not once per document.
let searchTermsFor = null, searchTerms = [];
const searchTermsOf = query => {
  if (query === searchTermsFor) return searchTerms;
  searchTermsFor = query;
  const found = query.match(/\S+/g) || [];
  searchTerms = found.map(t => {
    const fold = searchFold(t), cased = fold !== searchLower(fold);
    const text = (cased ? fold : searchLower(fold)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { cased, len: fold.length, re: new RegExp("(^|[^A-Za-z0-9])" + text, "g") };
  });
  return searchTerms;
};
// Where a term is in a page: the start of each match (after the character before the word)
const searchTermAt = (t, page) => {
  const hay = t.cased ? page.fold : page.low, at = [];
  t.re.lastIndex = 0;
  for (let m; (m = t.re.exec(hay));) at.push(m.index + m[1].length);
  return at;
};

// The pages where the terms are: null unless every term is somewhere in the document. best: the
// three best pages (those holding every term, then those with the most matches), in page order.
const searchPages = (pages, ts) => {
  const seen = ts.map(() => false), hits = [];
  let total = 0;
  pages.forEach((page, i) => {
    const at = ts.map(t => searchTermAt(t, page));
    const n = at.reduce((sum, a) => sum + a.length, 0);
    at.forEach((a, k) => { if (a.length) seen[k] = true; });
    if (n) { total += n; hits.push({ i, n, at, all: at.every(a => a.length) }); }
  });
  if (!seen.every(Boolean)) return null;
  const byPage = (x, y) => x.i - y.i;
  const best = hits.slice().sort((x, y) => (y.all - x.all) || (y.n - x.n) || byPage(x, y)).slice(0, 3);
  return { total, pages: hits.length, best: best.sort(byPage) };
};

// One extract: about a line of text around the first match of the page, cut at spaces, with
// every match in it marked. Built as nodes, never as HTML: the text comes from the PDFs.
const searchExtract = (page, hit, ts, href) => {
  const first = hit.at.filter(a => a.length).map(a => a[0]).sort((x, y) => x - y)[0];
  const text = page.text;
  let from = Math.max(0, first - 60), to = Math.min(text.length, first + 110);
  const space = text.indexOf(" ", from);
  if (from > 0 && space >= 0 && space < first) from = space + 1;
  if (to < text.length) to = text.lastIndexOf(" ", to) > first ? text.lastIndexOf(" ", to) : to;
  // the marked spans: every match of every term inside the extract (overlaps merged)
  const spans = [];
  hit.at.forEach((a, k) => a.forEach(s => {
    if (s >= from && s < to) spans.push([s, Math.min(to, s + ts[k].len)]);
  }));
  spans.sort((x, y) => x[0] - y[0]);
  const link = document.createElement("a");
  link.className = "hit";
  link.href = `${href}#page=${hit.i + 1}`;
  link.target = "_blank";
  link.rel = "noopener";
  const pageNo = document.createElement("b");
  pageNo.textContent = `p. ${hit.i + 1}`;
  link.append(pageNo, from > 0 ? "…" : "");
  let at = from;
  spans.forEach(([s, e]) => {
    if (e <= at) return;
    s = Math.max(s, at);
    link.append(text.slice(at, s));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(s, e);
    link.append(mark);
    at = e;
  });
  link.append(text.slice(at, to), to < text.length ? "…" : "");
  return link;
};

// searchInside (ui.js): whether the text of a document matches the query; its extracts shown
// under it (li.found), or removed for an empty query or no match. Rebuilt only when the query
// changes.
const searchFind = (a, query) => {
  const li = a.parentNode, href = a.getAttribute("href"), pages = searchDocs[href];
  let box = li.querySelector(".hits");
  if (box && box.dataset.q === query) return true;
  if (box) box.remove();
  const ts = query && pages ? searchTermsOf(query) : [];
  const found = ts.length ? searchPages(pages, ts) : null;
  li.classList.toggle("found", !!found);
  if (!found) return false;
  box = document.createElement("div");
  box.className = "hits";
  box.dataset.q = query;
  const count = document.createElement("small");
  count.textContent = `${found.total} match${found.total > 1 ? "es" : ""}`
    + (found.pages > 1 ? ` on ${found.pages} pages` : "");
  box.append(count);
  found.best.forEach(hit => box.append(searchExtract(pages[hit.i], hit, ts, href)));
  li.append(box);
  return true;
};
