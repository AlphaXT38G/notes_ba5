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
