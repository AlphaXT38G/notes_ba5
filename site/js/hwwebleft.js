// ── Halloween: the webs the spider's spit leaves behind ──────────────────────────────────────
// Once the spider's web in our face has thinned away (hwwebshot.js), two of the webs it left stay
// on the window: the fan in the top right corner and the strands sagging across the middle. They
// stay until the page is reloaded (or Halloween ends, or the spider spits again: new ones), on a
// canvas of their own over the page that lets every click through (pointer-events: none).
// They can be cut: pressed and dragged across (a finger on a phone), a strand snaps where it is
// crossed, its two halves swinging down from where they hang and fading; the fan tears off its
// corner and falls. A thin snap is heard.
// The canvas is drawn only when something changes: when they come, when one is cut (a frame loop
// for as long as the halves fall), on a resize (their shape scaled to the new window).
const hwLeftCv = document.createElement("canvas");
hwLeftCv.className = "hwwebleft";
const hwLeftG = hwLeftCv.getContext("2d");
let hwLeft = null, hwLeftRaf = 0, hwLeftAt = null;
const HW_LEFT_FALL = 1600;  // ms a cut strand or the torn fan takes to fall and fade

// A point of a strand (a quadratic curve) at t, and the strand split there (de Casteljau)
const hwQuadAt = (s, t) => [
  (1 - t) * (1 - t) * s.x0 + 2 * (1 - t) * t * s.cx + t * t * s.x1,
  (1 - t) * (1 - t) * s.y0 + 2 * (1 - t) * t * s.cy + t * t * s.y1,
];
const hwQuadSplit = (s, t) => {
  const q0 = [s.x0 + (s.cx - s.x0) * t, s.y0 + (s.cy - s.y0) * t], q1 = [s.cx + (s.x1 - s.cx) * t, s.cy + (s.y1 - s.cy) * t], m = hwQuadAt(s, t);
  return [[[s.x0, s.y0], q0, m], [[s.x1, s.y1], q1, m]];  // each half from its anchor to the cut
};

// They come: the strands, with a few dew drops each, and the top right fan, fading in under the
// web still on our face
const hwWebsLeave = shape => {
  const rnd = seeded(23);
  hwLeft = {
    W: shape.W, H: shape.H,
    fan: Object.assign({ fell: -1 }, shape.fans[1]),
    strands: shape.strands.map(s => Object.assign({ cut: -1, at: 0, dew: [rnd(), rnd(), rnd()].map(t => [t, .9 + rnd() * 1.2]) }, s)),
  };
  hwLeftCv.width = innerWidth; hwLeftCv.height = innerHeight;
  hwLeftScale();
  document.body.append(hwLeftCv);
  hwLeftCv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
  hwLeftDraw(performance.now());
};
const hwWebsGone = () => {
  cancelAnimationFrame(hwLeftRaf);
  hwLeftRaf = 0;
  hwLeft = null;
  hwLeftCv.remove();
};
// The window resized: their shape stretched to it
const hwLeftScale = () => {
  const W = innerWidth, H = innerHeight, kx = W / hwLeft.W, ky = H / hwLeft.H;
  for (const s of hwLeft.strands) { s.x0 *= kx; s.cx *= kx; s.x1 *= kx; s.y0 *= ky; s.cy *= ky; s.y1 *= ky; }
  const f = hwLeft.fan;
  f.cx *= kx; f.cy *= ky; f.R *= Math.min(kx, ky); f.rings = f.rings.map(r => r * Math.min(kx, ky));
  hwLeft.W = W; hwLeft.H = H;
};

// A half of a cut strand, falling: its loose end swings down below its anchor, the thread hanging
// from it, while it fades
const hwDrawHalf = (g, [a, q, m], p) => {
  const len = Math.hypot(m[0] - a[0], m[1] - a[1]) * .9, e = 1 - Math.pow(1 - p, 3);
  const swing = Math.sin(p * 9) * (1 - p) * .25;  // a little swing as it settles
  const ex = a[0] + (m[0] - a[0]) * (1 - e) + Math.sin(swing) * len * e, ey = a[1] + (m[1] - a[1]) * (1 - e) + Math.cos(swing) * len * e;
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.quadraticCurveTo(q[0] + (a[0] - q[0]) * e * .7, q[1] + (ey - q[1]) * e * .5, ex, ey);
  g.stroke();
};
const hwLeftDraw = now => {
  hwLeftRaf = 0;
  if (!hwLeft) return;
  const g = hwLeftG;
  g.clearRect(0, 0, hwLeftCv.width, hwLeftCv.height);
  g.strokeStyle = HW_WEB_INK;
  g.fillStyle = "rgba(255,255,255,.8)";
  g.lineCap = "round";
  let moving = false;
  const f = hwLeft.fan;
  if (f) {  // the fan; torn off, it drops and turns as it fades
    const p = f.fell < 0 ? 0 : Math.min(1, (now - f.fell) / HW_LEFT_FALL);
    g.save();
    g.globalAlpha = 1 - p;
    g.translate(0, p * p * f.R * .8);
    g.translate(f.cx, f.cy); g.rotate(p * .35); g.translate(-f.cx, -f.cy);
    hwDrawFan(g, f);
    g.restore();
    if (p >= 1) hwLeft.fan = null; else if (p > 0) moving = true;
  }
  hwLeft.strands = hwLeft.strands.filter(s => {
    g.lineWidth = s.w;
    if (s.cut < 0) {
      g.beginPath(); g.moveTo(s.x0, s.y0); g.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1); g.stroke();
      for (const [t, r] of s.dew) { const [x, y] = hwQuadAt(s, t); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
      return true;
    }
    const p = Math.min(1, (now - s.cut) / HW_LEFT_FALL);
    g.globalAlpha = 1 - p * p;
    hwQuadSplit(s, s.at).forEach(half => hwDrawHalf(g, half, p));
    g.globalAlpha = 1;
    if (p < 1) moving = true;
    return p < 1;
  });
  if (moving) hwLeftRaf = requestAnimationFrame(hwLeftDraw);
};
const hwLeftRedraw = () => { if (hwLeft && !hwLeftRaf) hwLeftRaf = requestAnimationFrame(hwLeftDraw); };

// Cutting: the pointer's move, pressed (or a finger), as a segment; a strand crossed by it snaps at
// the crossing, the fan tears if one of its spokes or rings is crossed
const hwCross = (a, b, c, d) => {  // where segment ab crosses segment cd, as a fraction of cd, or -1
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
  if (!den) return -1;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? u : -1;
};
const hwFanCrossed = (f, a, b) => {
  for (let k = 0; k <= 7; k++) {
    const ang = f.a0 + k / 7 * Math.PI / 2;
    if (hwCross(a, b, [f.cx, f.cy], [f.cx + Math.cos(ang) * f.R, f.cy + Math.sin(ang) * f.R]) >= 0) return true;
  }
  return false;
};
const hwLeftCut = e => {
  if (!hwLeft) return;
  const now = [e.clientX, e.clientY], from = hwLeftAt;
  hwLeftAt = now;
  if (!from || !(e.buttons & 1 || e.pointerType === "touch")) return;
  let cut = false;
  for (const s of hwLeft.strands) {
    if (s.cut >= 0) continue;
    let prev = [s.x0, s.y0];
    for (let i = 1; i <= 24; i++) {
      const pt = hwQuadAt(s, i / 24), u = hwCross(from, now, prev, pt);
      if (u >= 0) { s.cut = performance.now(); s.at = Math.min(.97, Math.max(.03, (i - 1 + u) / 24)); cut = true; break; }
      prev = pt;
    }
  }
  const f = hwLeft.fan;
  if (f && f.fell < 0 && hwFanCrossed(f, from, now)) { f.fell = performance.now(); cut = true; }
  if (!cut) return;
  hwNoise(.06, 4200, "highpass", .12);  // snap
  hwLeftRedraw();
};
const hwLeftStart = e => { hwLeftAt = [e.clientX, e.clientY]; };
const hwLeftResize = () => {
  if (!hwLeft) return;
  hwLeftCv.width = innerWidth; hwLeftCv.height = innerHeight;
  hwLeftScale();
  hwLeftRedraw();
};
hwPart({
  on() {
    document.addEventListener("pointerdown", hwLeftStart, { passive: true });
    document.addEventListener("pointermove", hwLeftCut, { passive: true });
    addEventListener("resize", hwLeftResize);
  },
  off() {
    hwWebsGone();
    document.removeEventListener("pointerdown", hwLeftStart);
    document.removeEventListener("pointermove", hwLeftCut);
    removeEventListener("resize", hwLeftResize);
  },
});
