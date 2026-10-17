// ── Armstrong code (easter egg: the jazz bar at any time) ─────────────────────────────────────
// Typing a r m s t r o n g (outside the search field), like the Konami code, opens the jazz bar
// ("evening" screen) at any time of the day or the year, for the rest of the visit. It runs after
// the Christmas override (this file is loaded after christmas.js) so it wins over Christmas, and
// before the metal and epic ones, so the shows still take over (the metal show at 01:00 too: only
// the day, the calm night and Christmas are replaced).
// Typed again in the jazz bar, it goes back to the normal screen of that moment: what the clock
// gives without any easter egg nor forced screen. So it drops the jazz egg, the yeti egg, the
// Christmas sax and a forced ?night=..., and shows the day (or the calm night after the metal
// show), the jazz bar at bar time (it then stays), or Christmas during the Christmas period. Typing yeti in the bar (Christmas egg)
// closes it too, so that Christmas actually shows up (jazzEggXmas).
const ARMSTRONG = [..."armstrong"];
let armstrongPos = 0,     // how many letters of the word have been typed so far
    jazzEgg = false,      // the code was typed: the jazz bar stays open
    jazzEggXmas = false;  // the Christmas egg (xmasEgg) when it was typed
const inBar = phase => SCREENS[phase]?.className === "night";
OVERRIDES.push(phase => {
  if (jazzEgg && xmasEgg !== jazzEggXmas) jazzEgg = false;  // yeti typed since: Christmas wins
  // Only the normal screens (the day, the calm night) and Christmas are replaced: a show on the
  // clock (metal at 01:00) still wins
  if (!jazzEgg || !isNormal(phase) && !inBar(phase) && SCREENS[phase]?.className !== "christmas") return phase;
  // Keeps "closing" when the clock says so, even if Christmas had replaced it before this override
  const clock = scheduledPhase();
  return inBar(phase) ? phase : inBar(clock) ? clock : "evening";
});
// Leaving the bar: drop the easter eggs that kept it open or that would replace it (the yeti
// egg's Christmas), so the screen goes back to what the clock gives
const backToClock = () => {
  jazzEgg = xmasEgg = xmasJazz = false;
  if (forced) forcedDismissed = true;  // also leaves a forced ?night=... (the bar, Christmas...)
};
const armstrong = () => {
  if (!inBar(document.body.dataset.phase)) {
    jazzEgg = true;
    jazzEggXmas = xmasEgg;
  } else {
    backToClock();  // at bar time the clock gives the bar: it stays, but the eggs are gone
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
