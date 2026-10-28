// ── Halloween scene (behind the page) ─────────────────────────────────────────────────────────
// The backdrop of the Halloween screens (halloween.js), in #hwscene, behind the courses:
//   - at night only: a deep purple sky, a field of stars (a few twinkle) and the full moon (the
//     moon of christmas.js, warmed up by CSS) rising behind the castle;
//   - Dracula's castle on its crag, on the right (HW_CASTLE, hwcastle.js): its windows are dark
//     by day and lit at night (some flicker like candles);
//   - far ridges, then the graveyard hills in front: tombstones of several shapes, crosses, an
//     obelisk, an iron fence, grass tufts; a dead tree on the left;
//   - two bands of mist drifting slowly at the bottom (CSS, transform only).
// All of it is SVG built once from code (seeded random, christmas.js, so it looks the same on
// every visit), in a 1600 x 700 box covering the window from the bottom (the castle drawn bigger,
// then scaled down on its crag). Nothing in it is animated but the flickering windows, the
// vampire passing behind one, the shutters and a few stars.
const HW_W = 1600, HW_H = 700;
// The outline of a hill: y at x, from a few waves (so tombstones can stand on it)
const hwHill = (base, waves) => x => base + waves.reduce((y, [a, f, p]) => y + a * Math.sin(x * f + p), 0);
const HW_FAR = hwHill(470, [[22, .004, 1], [12, .011, 3]]);
const HW_LEFT = hwHill(612, [[26, .0045, 2.2], [8, .017, .4]]);
const HW_RIGHT = hwHill(640, [[18, .005, 4.1], [7, .02, 1.3]]);
const hwOutline = (f, x0, x1, step = 16) => {
  let d = `M${x0},${HW_H}`;
  for (let x = x0; x <= x1; x += step) d += `L${x},${f1(f(x))}`;
  return `${d}L${x1},${HW_H}Z`;
};

