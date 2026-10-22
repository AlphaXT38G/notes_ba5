// ── Normal code (easter egg: back to the day, whatever is on) ─────────────────────────────────
// Typing n o r m a l (outside the search field, or in it then Enter: onCode, ui.js) brings the
// page back to its base look, the day, at any time and over any screen: the jazz bar, Christmas,
// the calm night, and the shows too (the metal show and the epic finale stop at once). It drops
// every other easter egg (armstrong, yeti, peace, the sax, the jar, the flame clicks or the guitar's
// metal show, a queued epic finale) and a forced ?screen=..., then keeps the day for the rest of
// the visit, even when the clock brings a screen (the bar at 21:30, the metal show at 01:00).
// This override is the last one, so it would win over every egg: it gives way when one of them
// is typed or clicked after it (jazzEgg, peaceEgg, metalEggAt, epicAt are set again; yetiTyped
// changes).
// Typed again on that day, it goes back to the normal screen of that moment, by the clock.
let dayEgg = false,  // the code was typed: the day stays
    dayEggYeti = 0;  // how many times yeti had been typed then (yetiTyped, christmas.js)
OVERRIDES.push(phase => {
  if (dayEgg && (jazzEgg || peaceEgg || metalEggAt || epicAt || yetiTyped !== dayEggYeti)) dayEgg = false;
  return dayEgg ? null : phase;
});
const startDay = () => {
  jazzEgg = xmasEgg = xmasJazz = peaceEgg = xmasPeace = epicQueued = false;
  metalEggAt = epicAt = 0;
  if (forced) forcedDismissed = true;
  dayEgg = true;
  dayEggYeti = yetiTyped;
  applyScreen();
};
onCode("normal", () => {
  if (dayEgg) { dayEgg = false; applyScreen(); }  // typed again: the clock decides
  else startDay();
});
