// ── Screens ────────────────────────────────────────────────────────────────────────────────────
// A screen is a special look the whole page takes for a while: the jazz bar, the metal show, the
// epic finale, the calm night, Christmas... This file is the engine; each screen registers itself
// from its own file (jazz.js, metal.js, epic.js, calm.js, christmas.js), so adding one never
// means touching this code:
//
//   SCREENS[name] = { className, subtitle, transition, normal }
//     className   class put on <body> while the screen runs. Several screens can share one (the
//                 jazz bar's "evening" and "closing" are both "night"). When it turns on or off, a
//                 CustomEvent of that name is sent on document, with detail = true / false.
//     subtitle    replaces the usual subtitle: a string, a function returning one, or null
//     transition  view transition used to enter the screen ([data-vt=...] in CSS)
//     normal      true for a screen that is just the usual look of its hours, like the day
//                 (the calm night): what replaces the day (Christmas, the armstrong code)
//                 replaces it too
//   SCHEDULE.push([from, to, name])   a clock slot, in seconds since midnight (to < from wraps
//                                     past midnight). Slots must not overlap.
//   OVERRIDES.push(phase => phase)    something that changes the screen whatever the clock says
//                                     (easter eggs, the epic finale). Applied in order to the
//                                     scheduled screen; returns it unchanged when not concerned.
//   everySecond.push(fn)              runs every second, with the clock check (start.js)
//
// The current screen's name is body[data-phase] (none during the day), and a "phase" event is
// sent on every change, with detail = the new name or null.
// ?night=0 forces the day, ?night=<name> a screen, ?night=1 the first scheduled screen.
const SCREENS = {}, SCHEDULE = [], OVERRIDES = [], everySecond = [];
const sub = document.querySelector(".sub"), daySub = sub.textContent;
const forced = new URLSearchParams(location.search).get("night");
let forcedDismissed = false;  // set by a "back to normal" button: the forced screen is left
const clockSeconds = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
const scheduledPhase = () => {
  if (forced === "0") return null;
  if (forced in SCREENS && !forcedDismissed) return forced;
  const t = clockSeconds();
  for (const [from, to, name] of SCHEDULE) {
    if (from <= to ? t >= from && t < to : t >= from || t < to) return name;
  }
  return forced === "1" && SCHEDULE.length ? SCHEDULE[0][2] : null;
};
// The usual look of the moment: the day (no screen) or a "normal" screen
// (no ?. nor ?? in this file: the engine must run on older browsers, Chromium before 80)
const isNormal = phase => phase === null || !!(SCREENS[phase] && SCREENS[phase].normal);
const phaseNow = () => OVERRIDES.reduce((phase, override) => override(phase), scheduledPhase());

// Switching screens. Changing style is animated with the View Transitions API: the browser
// snapshots the page before and after the change and animates between the two (CSS
// ::view-transition-*, picked by html[data-vt] = the transition of the screen we enter, or "day").
// Not on the first load, not with reduced motion, and browsers without the API switch instantly.
let screenShown = false, styleSwitch = null;  // styleSwitch: the view transition in progress, if any
const applyScreen = () => {
  const phase = phaseNow(), screen = SCREENS[phase] || null;
  if (phase === (document.body.dataset.phase || null)) { screenShown = true; return; }
  const classes = [...new Set(Object.values(SCREENS).map(s => s.className))];
  const swap = () => {
    const body = document.body;
    if (phase) body.dataset.phase = phase; else delete body.dataset.phase;
    const subtitle = !screen ? null : typeof screen.subtitle === "function" ? screen.subtitle() : screen.subtitle;
    sub.textContent = subtitle || daySub;
    // Flames on top of a screen are too many moving elements (the page lags): every screen turns
    // the flame mode off (its CSS may hide the button, the jazz bar keeps it only for clicks)
    if (screen && body.classList.contains("fire")) setFire(false);
    // Classes that end are turned off first, then those that start are turned on, so a screen's
    // extras are gone before the next one's arrive (e.g. the metal song stops before the epic one)
    for (const turningOn of [false, true]) {
      for (const cls of classes) {
        const on = !!screen && screen.className === cls;
        if (on === turningOn && on !== body.classList.contains(cls)) {
          body.classList.toggle(cls, on);
          document.dispatchEvent(new CustomEvent(cls, { detail: on }));
        }
      }
    }
    document.dispatchEvent(new CustomEvent("phase", { detail: phase }));
  };
  const animate = screenShown && document.startViewTransition && !document.hidden
    && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  screenShown = true;
  if (styleSwitch) styleSwitch.skipTransition();  // a previous change still animating ends at once
  if (!animate) { delete root.dataset.vt; return swap(); }
  root.dataset.vt = screen ? screen.transition : "day";
  const t = styleSwitch = document.startViewTransition(swap);
  const done = () => { if (styleSwitch === t) { styleSwitch = null; delete root.dataset.vt; } };
  t.ready.catch(() => {});  // skipped by the browser (e.g. tab hidden meanwhile): the change still applies
  t.finished.then(done, done);
  setTimeout(done, 2500);  // never leave data-vt behind
};
