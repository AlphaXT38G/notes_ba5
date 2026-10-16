// ── Armstrong code (easter egg: the jazz bar at any time) ─────────────────────────────────────
// Typing a r m s t r o n g (outside the search field), like the Konami code, opens the jazz bar
// ("evening" screen) at any time of the day or the year, for the rest of the visit. It runs after
// the Christmas override (this file is loaded after christmas.js) so it wins over Christmas, and
// before the metal and epic ones, so the shows still take over.
// Typed again in the jazz bar, it goes back to the normal screen, but only if the normal screen at
// that moment is not the jazz bar itself (at 22:00 the bar stays: it is where we should be).
// "Normal" means what the clock gives without any easter egg nor forced screen: the bar opened
// from the Christmas sax or by ?night=evening is left the same way. Typing yeti in the bar
// (Christmas egg) closes it too, so that Christmas actually shows up (jazzEggXmas).
const ARMSTRONG = [..."armstrong"];
let armstrongPos = 0,     // how many letters of the word have been typed so far
    jazzEgg = false,      // the code was typed: the jazz bar stays open
    jazzEggXmas = false;  // the Christmas egg (xmasEgg) when it was typed
OVERRIDES.push(phase => {
  if (jazzEgg && xmasEgg !== jazzEggXmas) jazzEgg = false;  // yeti typed since: Christmas wins
  if (!jazzEgg) return phase;
  return SCREENS[phase]?.className === "night" ? phase : "evening";  // keeps "closing" when the clock says so
});
const inBar = phase => SCREENS[phase]?.className === "night";
// The screen we would have without the jazz egg, the sax and a forced screen. Running the
// overrides only to look is harmless: they only forget easter eggs that are over anyway.
const normalPhase = () => {
  const saved = [jazzEgg, xmasJazz, forcedDismissed];
  jazzEgg = xmasJazz = false;
  forcedDismissed = true;
  const phase = phaseNow();
  [jazzEgg, xmasJazz, forcedDismissed] = saved;
  return phase;
};
const armstrong = () => {
  if (!inBar(document.body.dataset.phase)) {
    jazzEgg = true;
    jazzEggXmas = xmasEgg;
  } else {
    if (inBar(normalPhase())) return;  // the bar is the normal screen now: stay
    jazzEgg = xmasJazz = false;
    if (inBar(forced)) forcedDismissed = true;  // also leaves a ?night=evening / closing
  }
  applyScreen();
};
document.addEventListener("keydown", e => {
  if (e.target.matches("input")) return;  // typing in the search field never triggers it
  const k = e.key.toLowerCase();
  armstrongPos = k === ARMSTRONG[armstrongPos] ? armstrongPos + 1 : (k === ARMSTRONG[0] ? 1 : 0);
  if (armstrongPos !== ARMSTRONG.length) return;
  armstrongPos = 0;
  armstrong();
});
