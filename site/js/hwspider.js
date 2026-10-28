// ── Halloween spider and its web ──────────────────────────────────────────────────────────────
// A big cobweb filling the top left corner of the Halloween screens (halloween.js), and its
// spider, on a canvas of their own (#hwweb, above the page, click-through):
//   - the web is a fan stretched between the top and the left edges of the window: radial
//     threads from a hub out to the edges, a spiral of capture thread from one radial to the
//     next, a few broken strands hanging loose, dew drops catching the light (the moon's at night);
//   - it is a mesh of points held by threads (Verlet integration): it sags a little under its
//     own weight and the spider's, a breeze makes it breathe now and then, the pointer passing
//     through pushes it, and it quivers when the spider runs;
//   - the spider: a big hairy one, a red hourglass on its abdomen, eight jointed legs, eyes
//     glinting red, waiting on the hub. A click on it sends it running up its thread into the
//     corner (legs scurrying, the web shaking), and it comes back to the hub a few seconds later.
//     Poked three times, it gets angry and spits its web in our face (hwwebshot.js).
// The simulation and the drawing only run while something moves: once the web is still, the loop
// sleeps until the next breeze or until the pointer comes near. Reduced motion: drawn once, still.
const hwWeb = document.createElement("canvas"), hwWebCtx = hwWeb.getContext("2d");
hwWeb.id = "hwweb";
const HW_RADIALS = 10, HW_RINGS = 11;
let hwWebPts = [], hwWebLinks = [], hwWebW = 0, hwWebH = 0, hwWebRaf = null, hwWebLast = 0, hwWebNap = null, hwWebT = 0;
let hwSpiderAt = 0, hwSpiderGoal = 0, hwSpiderBack = null;  // the spider's place along its path (0: hub, 1: the corner)
let hwWebPointer = null;
// A point of the web: where it is, where it was (its speed, in Verlet), pinned or free
const hwWebPoint = (x, y, pinned) => ({ x, y, px: x, py: y, pinned });
// The web, built for the canvas' size: the hub, the radials' points ring by ring, their anchors on
// the edges, then the threads: along each radial, and around (the spiral) between radials
const hwWebBuild = () => {
  const W = hwWebW, H = hwWebH, hub = hwWebPoint(W * .4, H * .36, false), rnd = seeded(66);
  hwWebPts = [hub];
  hwWebLinks = [];
  const link = (a, b, k = 1) => hwWebLinks.push([a, b, Math.hypot(a.x - b.x, a.y - b.y) * k]);
  const radials = [];
  for (let i = 0; i < HW_RADIALS; i++) {
    // anchors: along the top edge from the right to the corner, then down the left edge
    const u = i / (HW_RADIALS - 1), ax = u < .55 ? W * (1 - u / .55) * .98 : 0, ay = u < .55 ? 0 : H * (u - .55) / .45 * .98;
    const anchor = hwWebPoint(ax + (ax ? 0 : 0), ay, true), pts = [];
    for (let k = 1; k <= HW_RINGS; k++) {
      const t = k / (HW_RINGS + 1) * (.92 + rnd() * .08);
      const p = hwWebPoint(hub.x + (anchor.x - hub.x) * t, hub.y + (anchor.y - hub.y) * t, false);
      pts.push(p);
      hwWebPts.push(p);
    }
    hwWebPts.push(anchor);
    link(hub, pts[0], .97);
    for (let k = 1; k < pts.length; k++) link(pts[k - 1], pts[k], .97);
    link(pts[pts.length - 1], anchor, .97);
    radials.push(pts);
  }
  for (let i = 0; i + 1 < radials.length; i++) {
    for (let k = 0; k < HW_RINGS; k++) if (!(i === 3 && k > 6 && k < 9) && !(i === 7 && k === 4)) link(radials[i][k], radials[i + 1][k], 1.02);
  }
  hwWeb.radials = radials;
  // the spider's path: from the hub along the radial into the corner
  hwWeb.path = [hub, ...radials[5]];
};
