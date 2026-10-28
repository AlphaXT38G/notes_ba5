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
