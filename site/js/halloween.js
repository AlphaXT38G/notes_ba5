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
