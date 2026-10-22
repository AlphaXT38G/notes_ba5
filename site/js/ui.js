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

// Easter egg codes (yeti, armstrong, peace, kamelot, normal): onCode(word, fn) runs fn when the
// word is typed anywhere but the search field, letter by letter like the Konami code, or typed in
// the search field and sent, which is how phones (no keyboard outside a field) reach them. The
// field is then emptied, all the cards come back and the phone's keyboard closes. Sent means the
// form's submit (Enter, or a phone keyboard's search key), not a keydown of Enter: that key often
// sends no "Enter" while a word is being composed (key "Unidentified", keyCode 229). Autocorrect
// and autocapitalize are off in the field, or the keyboard would turn kamelot into Camelot.
// Either way it runs inside a key press, a user gesture: the screens' music can play with sound.
const CODES = {};
const onCode = (word, fn) => {
  CODES[word] = fn;
  let pos = 0;  // how many letters of the word have been typed so far
  document.addEventListener("keydown", e => {
    if (e.target.matches("input")) return;  // typing in the search field is a search
    const k = e.key.toLowerCase();
    pos = k === word[pos] ? pos + 1 : (k === word[0] ? 1 : 0);
    if (pos === word.length) { pos = 0; fn(); }
  });
};
q.form.addEventListener("submit", e => {
  e.preventDefault();  // never reloads the page: the search is already live
  const fn = CODES[q.value.trim().toLowerCase()];
  if (!fn) return;
  q.value = "";
  q.dispatchEvent(new Event("input"));
  q.blur();
  fn();
});
