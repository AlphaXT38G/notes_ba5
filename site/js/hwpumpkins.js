// ── Halloween pumpkin pile (a little game) ────────────────────────────────────────────────────
// A big heap of pumpkins piled on top of one another in the bottom right corner, four rows of
// them, spilling out of the window at the bottom and on the right: orange ones, deep red ones, a
// white one, a dark green one, of three shapes (flat, round, tall), tilted every way, the front
// ones hiding the back ones. Each
// is drawn in volume: ribbed lobes shaded round (light from the top left, the far lobes darker),
// the grooves between them, a twisted stem, a leaf and a curling tendril.
// The game, one click at a time on each pumpkin:
//   1. it is carved: a face appears, cut stroke by stroke (three faces, in turn);
//   2. it is lit: a match flares inside, the face glows yellow and flickers, a warm light falls
//      around it, and the count of lit pumpkins is said;
//   3. lit, it laughs: it shakes and says so.
// When all of them are lit (the first time in the visit), the castle answers: its windows blaze,
// a swarm of bats bursts from it (hwBatBurst, hwcritters.js) and the subtitle says so a moment.
// The lobes of each shape: [centre x, half width], the middle one first
const HW_SHAPES = [
  [[60, 26], [34, 28], [86, 28], [16, 20], [104, 20]],
  [[60, 22], [40, 24], [80, 24], [24, 18], [96, 18]],
  [[60, 24], [36, 27], [84, 27], [18, 21], [102, 21]],
];
// The skins: near lobes and far lobes, each from light to shade
const HW_SKINS = {
  orange: [["#ffb04a", "#ee6f14", "#8a2e06"], ["#e88a30", "#c2520e", "#5e1e04"]],
  deep: [["#ff8a3a", "#d4440e", "#6a1404"], ["#c85a20", "#a2360a", "#4a1002"]],
  white: [["#fffaf0", "#e6d9c4", "#8f7f6c"], ["#e8e0d0", "#c4b49c", "#62564a"]],
  green: [["#9ab878", "#4f7040", "#1e2e16"], ["#6a8a52", "#3a5a2a", "#14200e"]],
};
// The pile, from the top (drawn first, behind) to the bottom row (in front): right and bottom of
// each box (rem, negative: out of the window), width (rem), shape, skin, tilt (degrees), stem lean.
// Each row sits deep in the hollows of the one below, the lower pumpkins hiding half of them.
const HW_PUMPKINS = [
  [7.6, 13.4, 6.6, 1, "orange", 8, -6],
  [3, 9.6, 8, 2, "deep", -10, 6], [10.4, 9.2, 7.4, 0, "white", 7, -4],
  [-1.6, 4.6, 9.4, 0, "orange", 12, -8], [5.8, 4.4, 9.8, 2, "orange", -4, 4], [13.6, 4, 8.4, 1, "green", -12, 8],
  [19.6, -2, 8, 2, "deep", 9, -6], [-3.6, -2.6, 10.6, 2, "orange", -8, 2], [4, -3, 11.4, 0, "orange", 5, -10],
  [12.2, -3.2, 10.4, 1, "deep", -6, 6],
].map(([r, b, w, shape, skin, tilt, stem], i) => ({ r, b, w, lobes: HW_SHAPES[shape], skin: HW_SKINS[skin], tilt, stem, face: i % 3 }));
// The faces: eyes, nose and mouth to cut, in the pumpkin's 120 x 100 box
const HW_FACES = [
  "M36,44L48,32L54,48ZM84,44L72,32L66,48ZM56,56L60,50L64,56ZM30,64Q60,90 90,64L82,70L76,64L70,72L64,66L56,72L50,66L44,72L38,64Z",
  "M38,46a8,8 0 1 1 16,0a8,8 0 1 1-16,0ZM66,46a8,8 0 1 1 16,0a8,8 0 1 1-16,0ZM36,66H84L78,78H42Z",
  "M34,40L52,46L36,52ZM86,40L68,46L84,52ZM57,58H63L60,52ZM30,62Q46,76 60,66Q74,76 90,62Q78,86 60,80Q42,86 30,62Z",
];
const hwPumpkinSvg = ({ lobes, face, stem, skin }, i) => {
  const id = `hwp${i}`;
  const lobe = ([x, rx], k) => `<ellipse cx="${x}" cy="62" rx="${rx}" ry="${k ? 33 : 36}" fill="url(#${id}${k > 2 ? "f" : "l"})"/>`;
  const groove = ([x, rx]) => x === 60 ? "" : `<path class="groove" d="M${x + (x < 60 ? rx * .55 : -rx * .55)},31Q${x < 60 ? x + rx * .3 : x - rx * .3},62 ${x + (x < 60 ? rx * .55 : -rx * .55)},94"/>`;
  return `<svg viewBox="0 0 120 108" aria-hidden="true"><defs>` +
    `<radialGradient id="${id}l" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${skin[0][0]}"/><stop offset=".55" stop-color="${skin[0][1]}"/><stop offset="1" stop-color="${skin[0][2]}"/></radialGradient>` +
    `<radialGradient id="${id}f" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${skin[1][0]}"/><stop offset=".6" stop-color="${skin[1][1]}"/><stop offset="1" stop-color="${skin[1][2]}"/></radialGradient>` +
    `<radialGradient id="${id}g" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#fff6c0"/><stop offset=".5" stop-color="#ffc23a"/><stop offset="1" stop-color="#e2600c"/></radialGradient>` +
    `<linearGradient id="${id}s" x2="1"><stop offset="0" stop-color="#6f8a32"/><stop offset="1" stop-color="#2f4214"/></linearGradient></defs>` +
    `<ellipse class="pool" cx="60" cy="98" rx="62" ry="10"/><ellipse cx="60" cy="96" rx="48" ry="6" fill="rgba(0,0,0,.45)"/>` +
    [3, 4, 1, 2, 0].map(k => lobe(lobes[k], k)).join("") + lobes.map(groove).join("") +
    `<path d="M58,28C${58 + stem / 2},18 ${56 + stem},12 ${62 + stem},4L${68 + stem},7C${62 + stem},14 ${64 + stem / 2},20 64,28Z" fill="url(#${id}s)"/>` +
    `<path class="leaf" d="M64,28C76,14 96,16 100,26C90,24 84,30 72,30Z"/><path class="tendril" d="M64,30C40,22 30,34 40,38S44,26 34,24"/>` +
    `<path class="face" d="${HW_FACES[face]}"/><path class="face-lit" d="${HW_FACES[face]}" fill="url(#${id}g)"/>` +
    `<path class="shine" d="M40,40Q44,32 52,30"/></svg>`;
};
const hwPatch = document.createElement("div");
hwPatch.id = "hwpatch";
