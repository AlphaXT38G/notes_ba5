// ── Armstrong code (easter egg: the jazz bar at any time) ─────────────────────────────────────
// Typing a r m s t r o n g (outside the search field, or in it then Enter: onCode, ui.js) opens
// the jazz bar ("evening" screen) at any time of the day or the year, for the rest of the visit,
// over every screen. It runs after the Christmas and Halloween overrides (this file is loaded
// after christmas.js and halloween.js) so it wins over them, and before the metal and epic ones,
// so the shows that come later still take over (the metal show at 01:00 too: only the day, the
// calm night, Christmas and Halloween are replaced); typed during a show, it ends it first
// (leaveShows, epic.js).
// Typed again in the jazz bar, it goes back to the normal screen of that moment: what the clock
// gives without any easter egg nor forced screen. So it drops the jazz egg, the yeti and boo eggs,
// the Christmas sax and a forced ?screen=..., and shows the day (or the calm night after the metal
// show), the jazz bar at bar time (it then stays), or Christmas during the Christmas period.
// Typing yeti in the bar (Christmas egg) closes it too, so that Christmas actually shows up, even
// when the bar was opened over Christmas (jazzEggYeti).
let jazzEgg = false,    // the code was typed: the jazz bar stays open
    jazzEggYeti = 0;    // how many times yeti had been typed then (yetiTyped, christmas.js)
const inBar = phase => screenClass(phase) === "night";
OVERRIDES.push(phase => {
  if (jazzEgg && yetiTyped !== jazzEggYeti) jazzEgg = false;  // yeti typed since: Christmas wins
  // Only the normal screens (the day, the calm night) and Christmas are replaced: a show on the
  // clock (metal at 01:00) still wins
  if (!jazzEgg || !isNormal(phase) && !inBar(phase) && screenClass(phase) !== "christmas") return phase;
  // Keeps "closing" when the clock says so, even if Christmas had replaced it before this override
  const clock = scheduledPhase();
  return inBar(phase) ? phase : inBar(clock) ? clock : "evening";
});
// Leaving the bar: drop the easter eggs that kept it open or that would replace it (the yeti
// egg's Christmas), so the screen goes back to what the clock gives
const backToClock = () => {
  jazzEgg = xmasEgg = xmasJazz = false;
  if (forced) forcedDismissed = true;  // also leaves a forced ?screen=... (the bar, Christmas...)
};
const armstrong = () => {
  if (!inBar(document.body.dataset.phase)) {
    leaveShows();
    jazzEgg = true;
    jazzEggYeti = yetiTyped;
  } else {
    backToClock();  // at bar time the clock gives the bar: it stays, but the eggs are gone
  }
  applyScreen();
};
onCode("armstrong", armstrong);
