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
// Where the spider is, along its path (between two points of the web)
const hwSpiderPos = () => {
  const path = hwWeb.path, f = hwSpiderAt * (path.length - 1), i = Math.min(path.length - 2, Math.floor(f)), t = f - i;
  return [path[i].x + (path[i + 1].x - path[i].x) * t, path[i].y + (path[i + 1].y - path[i].y) * t, i];
};

// One step of the simulation: gravity, the breeze, the pointer, the spider's weight, then the
// threads pulled back to their length a few times over
const hwWebStep = dt => {
  const gust = Math.sin(hwWebT * .7) * Math.sin(hwWebT * 1.9) * 6;
  const [sx, sy, si] = hwSpiderPos();
  for (const p of hwWebPts) {
    if (p.pinned) continue;
    const vx = (p.x - p.px) * .96, vy = (p.y - p.py) * .96;
    p.px = p.x; p.py = p.y;
    p.x += vx + gust * dt * dt * 20;
    p.y += vy + 30 * dt * dt;
    if (hwWebPointer) {
      const dx = p.x - hwWebPointer.x, dy = p.y - hwWebPointer.y, d = Math.hypot(dx, dy);
      if (d < 36) { p.x += hwWebPointer.vx * .25 * (1 - d / 36); p.y += hwWebPointer.vy * .25 * (1 - d / 36); }
    }
  }
  const under = hwWeb.path[si];
  if (!under.pinned) under.y += 90 * dt * dt;  // the spider's weight
  for (let n = 0; n < 4; n++) {
    for (const [a, b, len] of hwWebLinks) {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      if (d <= len) continue;  // a thread pulls, it never pushes
      const f = (d - len) / d * .5;
      if (!a.pinned) { a.x += dx * f; a.y += dy * f; }
      if (!b.pinned) { b.x -= dx * f; b.y -= dy * f; }
    }
  }
  if (hwWebPointer) hwWebPointer.vx = hwWebPointer.vy = 0;
  return hwWebPts.reduce((e, p) => e + Math.abs(p.x - p.px) + Math.abs(p.y - p.py), 0);
};

// The spider at (x, y), facing the hub (angle a), its legs moving while it runs (walk: phase)
const hwDrawSpider = (g, x, y, a, walk, night, rear = 0) => {
  g.save();
  g.translate(x + (Math.random() - .5) * 3 * rear, y + (Math.random() - .5) * 3 * rear);  // angry: shaking
  g.rotate(a);
  g.scale(1.6 + .35 * rear, 1.6 + .35 * rear);  // a big one, puffed up when angry
  g.strokeStyle = "#140a10";
  g.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const swing = Math.sin(walk + k * 1.6 + (side > 0 ? Math.PI : 0)) * .25, base = (-.9 + k * .55 + swing) * side;
      const kx = Math.cos(base) * 15, ky = Math.sin(base) * 15 - 3, fx = Math.cos(base + side * .5) * 28, fy = Math.sin(base + side * .5) * 28 + 6;
      g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(kx, ky - 6); g.lineTo(fx, fy); g.stroke();
    }
  }
  // abdomen with its hourglass, then the head with its eyes
  g.fillStyle = "#1c1016";
  g.beginPath(); g.ellipse(-14, 0, 13, 10.5, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2c1a24";
  g.beginPath(); g.ellipse(-16, -3, 6, 4, 0, 0, Math.PI * 2); g.fill();  // its sheen
  g.fillStyle = "#c01020";
  g.beginPath(); g.moveTo(-20, -4); g.lineTo(-14, 0); g.lineTo(-20, 4); g.lineTo(-8, 4); g.lineTo(-14, 0); g.lineTo(-8, -4); g.fill();
  g.fillStyle = "#1c1016";
  g.beginPath(); g.ellipse(2, 0, 7, 6, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = night ? "#ff3a2a" : "#a01818";
  for (const [ex, ey] of [[7, -2.4], [7, 2.4], [5, -4], [5, 4]]) { g.beginPath(); g.arc(ex, ey, 1.2, 0, Math.PI * 2); g.fill(); }
  g.restore();
};
const hwWebDraw = () => {
  const g = hwWebCtx, night = hwNight();
  g.clearRect(0, 0, hwWebW, hwWebH);
  g.strokeStyle = night ? "rgba(225,225,245,.5)" : "rgba(235,220,200,.38)";
  g.lineWidth = .9;
  g.beginPath();
  for (const [a, b] of hwWebLinks) { g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
  g.stroke();
  // broken strands hanging loose where the spiral is torn, and dew drops
  g.beginPath();
  const r = hwWeb.radials;
  g.moveTo(r[3][7].x, r[3][7].y); g.quadraticCurveTo(r[3][7].x + 6, r[3][7].y + 20, r[3][7].x + 2, r[3][7].y + 34);
  g.moveTo(r[4][8].x, r[4][8].y); g.quadraticCurveTo(r[4][8].x - 4, r[4][8].y + 14, r[4][8].x - 10, r[4][8].y + 22);
  g.stroke();
  g.fillStyle = night ? "rgba(220,230,255,.85)" : "rgba(255,230,190,.7)";
  for (let i = 0; i < r.length; i += 2) for (let k = 2; k < HW_RINGS; k += 3) { const p = r[i][k]; g.beginPath(); g.arc(p.x, p.y + 1, 1.3, 0, Math.PI * 2); g.fill(); }
  const [sx, sy] = hwSpiderPos(), hub = hwWebPts[0];
  const a = hwSpiderAt > .02 ? Math.atan2(hub.y - sy, hub.x - sx) + Math.PI : Math.PI / 2;
  hwDrawSpider(g, sx, sy, a, hwSpiderAt !== hwSpiderGoal || hwSpiderRear ? hwWebT * 30 : 0, night, hwSpiderRear);
};
const hwWebFrame = now => {
  hwWebRaf = null;
  const dt = Math.min(.033, (now - (hwWebLast || now)) / 1000) || .016;
  hwWebLast = now;
  hwWebT += dt;
  if (hwSpiderAt !== hwSpiderGoal) {  // running along its thread
    const step = dt * (hwSpiderGoal > hwSpiderAt || hwSpiderMad ? 1.6 : .5);
    hwSpiderAt = Math.abs(hwSpiderGoal - hwSpiderAt) < step ? hwSpiderGoal : hwSpiderAt + Math.sign(hwSpiderGoal - hwSpiderAt) * step;
    const p = hwWeb.path[Math.round(hwSpiderAt * (hwWeb.path.length - 1))];
    if (!p.pinned) p.x += (Math.random() - .5) * 1.5;  // its steps shake the web
  }
  const energy = hwWebStep(dt);
  hwWebDraw();
  if (energy > .4 || hwSpiderAt !== hwSpiderGoal || hwWebPointer || hwSpiderRear) hwWebRaf = requestAnimationFrame(hwWebFrame);
  else hwWebNap = setTimeout(hwWebWake, 3000 + Math.random() * 5000);  // still: until the next breeze
};
