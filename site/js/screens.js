// Night: from 21:30 the page turns into a jazz bar (body.night in CSS), then plays one metal song.
// The night goes through phases (body[data-phase] in CSS):
//   evening  21:30    - 0:45     jazz bar, warm light
//   closing   0:45    - 1:00     the bar closes, the subtitle changes (see below)
//   metal     1:00:00 - 1:01:51  hard rock / metal takeover for one song (body.metal, see below)
//   epic      after a metal takeover, only if "More epicness ?" was clicked (body.epic, see below)
// After that the page is back to its usual day look.
// Checked every second (the metal phase is short and must start right on time).
// ?night=0 / 1 / evening / closing / metal in the URL forces a phase (handy to try it any time).
const sub = document.querySelector(".sub"), daySub = sub.textContent;
const NIGHT_SUBS = {  // null = keep the usual subtitle
  evening: null,
  closing: "Last call was a while ago.",
  metal: "1:00 AM. Time to headbang. 🤘",
  epic: "Behold… more epicness.",
};
const NIGHT = new Set(["evening", "closing"]);  // the jazz bar phases (body.night)
const METAL_SECONDS = 111;  // the song plays from 1:50 to its end, 1 min 51 s later
const forced = new URLSearchParams(location.search).get("night");
// Easter egg: spamming the flame button (see below) starts the metal takeover at any time of
// day, for one song; metalEggAt is when it started (0 = not running)
let metalEggAt = 0;
// Epic finale: 10 s before a metal takeover ends, a "More epicness ?" button shows up (see the
// epic code below). Clicked, it queues the epic phase (body.epic), which takes over right when
// the metal ends and lasts until the "Back to normal" button is clicked (epicAt = when it started,
// 0 = not running). ?night=epic forces it, until that button is clicked (epicLeft).
let epicQueued = false, epicAt = 0, epicLeft = false;
const clockSeconds = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
const metalLeft = () => {  // seconds before the current metal takeover ends (Infinity when forced)
  if (metalEggAt) return METAL_SECONDS - (Date.now() - metalEggAt) / 1000;
  if (forced === "metal") return Infinity;
  return 3600 + METAL_SECONDS - clockSeconds();
};
const phaseNow = () => {
  if ((forced === "epic" && !epicLeft) || epicAt) return "epic";
  const phase = basePhase();
  if (epicQueued && phase !== "metal") {  // the metal just ended: the epic finale takes over
    epicQueued = false;
    if (document.body.dataset.phase === "metal") { epicAt = Date.now(); return "epic"; }
  }
  return phase;
};
const basePhase = () => {
  if (metalEggAt && Date.now() - metalEggAt < METAL_SECONDS * 1000) return "metal";
  metalEggAt = 0;
  if (forced === "0") return null;
  if (forced in NIGHT_SUBS && forced !== "epic") return forced;  // a left epic falls back to the clock
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (t >= 21 * 3600 + 30 * 60 || t < 45 * 60) return "evening";
  if (t < 3600) return "closing";
  if (t < 3600 + METAL_SECONDS) return "metal";
  return forced === "1" ? "evening" : null;  // ?night=1 during the day: start of the night
};
// Changing style is animated with the View Transitions API: the browser snapshots the page before
// and after the change and animates between the two (CSS ::view-transition-*, picked by
// html[data-vt]): a slow warm fade into the jazz bar, a hard slam into the metal show, a soft fade
// back to the day. Not on the first load, not with reduced motion, and browsers without the API
// just switch instantly.
let nightShown = false;
const applyNight = () => {
  const phase = phaseNow();
  if (phase === (document.body.dataset.phase || null)) { nightShown = true; return; }
  const night = NIGHT.has(phase), metal = phase === "metal", epic = phase === "epic";
  const swap = () => {
    if (phase) document.body.dataset.phase = phase; else delete document.body.dataset.phase;
    sub.textContent = (metalEggAt && phase === "metal" ? "You lit too many fires. Time to headbang. 🤘"
      : phase && NIGHT_SUBS[phase]) || daySub;
    // Flames on top of the jazz bar or the shows are too many moving elements (the page lags):
    // they turn the flame mode off (the shows hide its button, the bar keeps it only for clicks)
    if ((night || metal || epic) && document.body.classList.contains("fire")) setFire(false);
    if (night !== document.body.classList.contains("night")) {
      document.body.classList.toggle("night", night);
      document.dispatchEvent(new CustomEvent("night", { detail: night }));  // for the night extras below
    }
    if (metal !== document.body.classList.contains("metal")) {
      document.body.classList.toggle("metal", metal);
      document.dispatchEvent(new CustomEvent("metal", { detail: metal }));  // for the metal extras below
    }
    if (epic !== document.body.classList.contains("epic")) {
      document.body.classList.toggle("epic", epic);
      document.dispatchEvent(new CustomEvent("epic", { detail: epic }));  // for the epic extras below
    }
    document.dispatchEvent(new CustomEvent("phase", { detail: phase }));
  };
  const animate = nightShown && document.startViewTransition && !document.hidden
    && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  nightShown = true;
  styleSwitch?.skipTransition();  // a previous change still animating ends at once
  if (!animate) { delete root.dataset.vt; return swap(); }
  root.dataset.vt = metal ? "metal" : epic ? "epic" : night ? "night" : "day";
  const t = styleSwitch = document.startViewTransition(swap);
  const done = () => { if (styleSwitch === t) { styleSwitch = null; delete root.dataset.vt; } };
  t.ready.catch(() => {});  // skipped by the browser (e.g. tab hidden meanwhile): the change still applies
  t.finished.then(done, done);
  setTimeout(done, 2500);  // never leave data-vt behind
};
let styleSwitch = null;  // the view transition in progress, if any
