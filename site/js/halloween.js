// ── Halloween (screens "halloween" and "halloween-night", body.halloween) ─────────────────────
// From October 25 to November 1 the usual looks are replaced by Halloween (css/halloween.css),
// all day and all night: the same scene, darker at night. By day there is no sky, only a dark
// orange haze over Dracula's castle; at night the sky is a deep purple with stars and the full
// moon, the castle's windows are lit and lightning strikes now and then. Typing "boo" brings it at
// any time of the year. The metal show at 1:00, the epic finale and the other easter eggs still
// take over, as over Christmas.
//
// The screen is made of parts, each in its own file, registered here with hwPart():
//   hwscene.js     the scene behind the page: sky, moon, the castle (hwcastle.js), hills,
//                  graveyard, dead tree, mist
//   hwsecrets.js   the castle's windows (a knight, a saxophonist) and gargoyles, the firefly jar
//   hwcandles.js   the melting candles on the search bar, their wax run over it and Previews
//   hwcritters.js  the bats (and the bat hunt) and the autumn leaves, on the effects canvas
//   hwpumpkins.js  the pumpkin pile: carve them, light them, all lit and the castle answers
//   hwspider.js    the big spider and its web in the top left corner (hwwebshot.js: its spit)
//   hwwolf.js      the werewolf walking the far hill, howling at the moon at night
//   hwwitch.js     the witch on her broom crossing the sky
//   hwghosts.js    the ghosts (bodies of mist in 3D, hwghostgl.js): a lady, a monk, a shrouded one
//   hwscream.js    the rare zombie screamer
//   hwmusic.js     the music, played by the pumpkin cocotte (hwcocotte.js)
// The parts share two layers: #hwscene behind the page (click-through, like Christmas' #xscene)
// and #hwfront above it, whose children opt into clicks (pointer-events); the candles stand on
// the page itself, on the search bar.
const isHwDate = (d = new Date()) => d.getMonth() === 9 && d.getDate() >= 25 || d.getMonth() === 10 && d.getDate() === 1;
const isHwDaytime = () => { const t = clockSeconds(); return t >= 7 * 3600 && t < 18 * 3600; };
const hwSubtitle = () => {
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  if (m === 9 && day < 31) return `${31 - day} nights until Halloween. Revise before the dark comes.`;
  if (m === 9) return "Happy Halloween! The notes do not bite. Mostly.";
  if (m === 10 && day === 1) return "All Saints' Day. The ghosts are revising too.";
  return "Something wicked this way comes. Revise anyway.";
};
SCREENS.halloween = { className: "halloween", subtitle: hwSubtitle, transition: "halloween" };
SCREENS["halloween-night"] = { className: "halloween", subtitle: hwSubtitle, transition: "halloween" };

// Halloween replaces the day, the calm night and the jazz bar, as Christmas does (the two periods
// never meet). This file is loaded after christmas.js and before armstrong.js and calm.js, so the
// yeti code (Christmas) and the shows still win, and the armstrong and peace codes too.
// Easter egg: typing b o o brings Halloween at any time of the year, day or night by the clock,
// over Christmas too; outside the period, typed again on Halloween it goes back to the normal
// screen. It drops the eggs whose overrides come after this one (armstrong, peace: their files are
// loaded later, as these lines run on a key press), and the yeti egg; yeti typed after it wins
// (hwEggYeti, as the armstrong code does).
let hwEgg = false, hwEggYeti = 0;
OVERRIDES.push(phase => {
  if (hwEgg && yetiTyped !== hwEggYeti) hwEgg = false;
  const replaced = isNormal(phase) || screenClass(phase) === "night" || hwEgg && screenClass(phase) === "christmas";
  if (!replaced || !(hwEgg || (!forced || forcedDismissed) && isHwDate())) return phase;
  return isHwDaytime() ? "halloween" : "halloween-night";
});
onCode("boo", () => {
  leaveShows();  // typed during a show, it ends it first (epic.js)
  const onHw = document.body.classList.contains("halloween");
  if (onHw && isHwDate()) return;  // it is Halloween anyway
  hwEgg = !onHw;
  hwEggYeti = yetiTyped;
  jazzEgg = peaceEgg = xmasEgg = xmasJazz = false;
  if (onHw && forced && forced.startsWith("halloween")) forcedDismissed = true;
  applyScreen();
});

// The two layers, and the parts of the screen. A part is { on(), off(), night(isNight) }, all
// optional: on / off when the screen comes and goes, night when it turns from day to night
// (and once right after on).
const hwBack = document.createElement("div"), hwFront = document.createElement("div");
hwBack.id = "hwscene";
hwFront.id = "hwfront";
hwBack.setAttribute("aria-hidden", "true");
const HW_PARTS = [];
const hwPart = part => HW_PARTS.push(part);
const hwNight = () => document.body.dataset.phase === "halloween-night";
const hwStill = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
