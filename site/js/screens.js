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
// ?screen=0 forces the day, ?screen=<name> a screen, ?screen=1 the first scheduled screen
// (?night=..., its old name, still works for links shared before).
const SCREENS = {}, SCHEDULE = [], OVERRIDES = [], everySecond = [];
const sub = document.querySelector(".sub"), daySub = sub.textContent;
const forced = (q => q.get("screen") || q.get("night"))(new URLSearchParams(location.search));
let forcedDismissed = false;  // set by an easter egg leaving the screen: the forced screen is left
const clockSeconds = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
// skippedSlot: a clock slot left by an easter egg (skipSlot, e.g. armstrong typed during the metal
// show of 01:00): the clock gives the day instead until that slot ends, so the egg's screen shows
let skippedSlot = null;
const currentSlot = () => {
  const t = clockSeconds();
  for (const slot of SCHEDULE) {
    const [from, to] = slot;
    if (from <= to ? t >= from && t < to : t >= from || t < to) return slot;
  }
  return null;
};
const skipSlot = () => { skippedSlot = currentSlot(); };
const scheduledPhase = () => {
  if (forced === "0") return null;
  if (forced in SCREENS && !forcedDismissed) return forced;
  const slot = currentSlot();
  if (slot !== skippedSlot) skippedSlot = null;  // that slot is over: the clock decides again
  else if (slot) return null;
  if (slot) return slot[2];
  return forced === "1" && SCHEDULE.length ? SCHEDULE[0][2] : null;
};
// The usual look of the moment: the day (no screen) or a "normal" screen
const isNormal = phase => phase === null || !!(SCREENS[phase] && SCREENS[phase].normal);
// The <body> class of a screen (null for the day or an unknown name)
const screenClass = phase => SCREENS[phase] ? SCREENS[phase].className : null;
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

// Screen music: the mp3 files of site/audio/ (copied to dist/audio/ by the build), each played by
// an <audio> that is never shown nor put in the page. Browsers only allow sound after a user
// gesture, but they let a muted track autoplay: the screens start it muted when the page has had
// no gesture yet, and unmute it on the first click or key press. The long tracks (jazz, epic,
// night) only download what is played: the browser streams them by ranges.
//   screenTrack(file, { loop, muted, start })   a new track, playing. start: seconds into it, or a
//                                               function of the track's duration giving them
//   preloadTrack(file, { loop })                a new track, loading but paused: it starts at once
//                                               when played (a show that is about to begin)
//   dropTrack(track)                            stops it for good and lets the download go
//   screenGesture()                             whether the page has had a click or key press yet
const screenGesture = () => navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
const preloadTrack = (file, { loop = true } = {}) => {
  const track = new Audio(`audio/${file}`);
  track.loop = loop;
  track.preload = "auto";
  return track;
};
const screenTrack = (file, { loop = true, muted = false, start = 0 } = {}) => {
  const track = preloadTrack(file, { loop });
  track.muted = muted;
  if (start) track.addEventListener("loadedmetadata", () => {
    const at = typeof start === "function" ? start(track.duration) : start;
    if (isFinite(at)) track.currentTime = at;
  }, { once: true });
  track.play().catch(() => {});  // refused (sound blocked by the browser): silent, its button can try again
  return track;
};
const dropTrack = track => {
  if (!track) return;
  track.pause();
  track.removeAttribute("src");
  track.load();
};
// The space bar plays / pauses the music of every screen: each player puts its play / pause
// button in musicButtons (musicButtons.push(button)), and the key clicks the first one in the
// page, so it does exactly what a click does (turn a muted track's sound on, pause, play). Not in
// the search field, where a space is a space; on a focused button too (which space would click
// otherwise): the music wins, and the page does not scroll.
const musicButtons = [];
let musicKeyDown = false;
document.addEventListener("keydown", e => {
  if (e.key !== " " || e.ctrlKey || e.altKey || e.metaKey || e.target.matches("input, textarea, select, [contenteditable]")) return;
  const button = musicButtons.find(b => b.isConnected);
  if (!button) return;
  e.preventDefault();
  if (!e.repeat) button.click();
  musicKeyDown = true;
});
// the space's keyup would click a focused button: kept for the music
document.addEventListener("keyup", e => {
  if (e.key === " " && musicKeyDown) { e.preventDefault(); musicKeyDown = false; }
});
