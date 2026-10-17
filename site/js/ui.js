// Theme toggle: flip between light and dark, starting from what is shown now.
// With no saved choice, the page follows the system (prefers-color-scheme); the button
// then sets data-theme on <html>, which overrides it (see the colour tokens in CSS).
const root = document.documentElement, themeBtn = document.getElementById("theme");
const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const paintBtn = () => { themeBtn.textContent = isDark() ? "☀" : "☾"; themeBtn.title = isDark() ? "Light mode" : "Dark mode"; };
themeBtn.addEventListener("click", () => {
  root.dataset.theme = isDark() ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  paintBtn();
});
paintBtn();


// Names / Previews switch: sets data-view on <html> (the CSS does the rest) and remembers it
const viewBtns = document.querySelectorAll(".view button");
const setView = v => {
  root.dataset.view = v;
  viewBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v));
  try { localStorage.setItem("view", v); } catch (e) {}
};
viewBtns.forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
viewBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.view === (root.dataset.view || "names")));

// Search: keep subjects and documents whose text matches, open the sections holding a match.
// Every word typed must appear (in any order, case-insensitive). If the subject itself matches
// (name or code), the whole card stays as usual; otherwise only the matching documents are kept.
// An empty field shows everything again and closes the sections.
const q = document.getElementById("search");
q.addEventListener("input", () => {
  const words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hit = el => words.every(w => el.textContent.toLowerCase().includes(w));
  let shown = 0;  // number of subjects still visible, to show the no-result message
  document.querySelectorAll("main section").forEach(sec => {
    const whole = !words.length || hit(sec.querySelector("h2")) || hit(sec.querySelector(".code"));
    let any = whole;
    sec.querySelectorAll(".links a").forEach(a => {
      const ok = whole || hit(a);
      a.parentNode.hidden = !ok;
      any = any || ok;  // not ||=: too new for some Android browsers (Chromium before 85)
    });
    // A collapsible section is hidden when nothing in it matches, and opened while it holds a
    // match found by document name (folder headings are hidden then, they would be misleading)
    sec.querySelectorAll("details").forEach(d => {
      const inside = [...d.querySelectorAll(".links a")].some(a => !a.parentNode.hidden);
      d.parentNode.hidden = !inside;
      d.querySelectorAll(".group").forEach(g => g.hidden = !whole && !!words.length);
      d.open = words.length > 0 && inside && !whole;
    });
    sec.hidden = !any;
    shown += any;
  });
  document.getElementById("empty").hidden = shown > 0;
});
