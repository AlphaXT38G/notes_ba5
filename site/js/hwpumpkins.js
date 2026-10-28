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
