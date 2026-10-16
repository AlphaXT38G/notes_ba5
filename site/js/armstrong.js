// ── Armstrong code (easter egg: the jazz bar at any time) ─────────────────────────────────────
// Typing a r m s t r o n g (outside the search field), like the Konami code, opens the jazz bar
// ("evening" screen) at any time of the day or the year, for the rest of the visit. It runs after
// the Christmas override (this file is loaded after christmas.js) so it wins over Christmas, and
// before the metal and epic ones, so the shows still take over.
const ARMSTRONG = [..."armstrong"];
let armstrongPos = 0,  // how many letters of the word have been typed so far
    jazzEgg = false;   // the code was typed: the jazz bar stays open
OVERRIDES.push(phase => {
  if (!jazzEgg) return phase;
  return SCREENS[phase]?.className === "night" ? phase : "evening";  // keeps "closing" when the clock says so
});
document.addEventListener("keydown", e => {
  if (e.target.matches("input")) return;  // typing in the search field never triggers it
  const k = e.key.toLowerCase();
  armstrongPos = k === ARMSTRONG[armstrongPos] ? armstrongPos + 1 : (k === ARMSTRONG[0] ? 1 : 0);
  if (armstrongPos !== ARMSTRONG.length) return;
  armstrongPos = 0;
  jazzEgg = true;
  applyScreen();
});
