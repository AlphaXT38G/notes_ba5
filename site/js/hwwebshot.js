// ── Halloween: the spider's web in our face ───────────────────────────────────────────────────
// What the angry spider of the Halloween screens (hwspider.js) does to us, as the Christmas
// snowman does with his snowball: hwWebShot(x, y) spits a web from where it is.
//   - the web flies at us, spinning a little and growing faster and faster as it comes, until it
//     is far larger than the window: it lands on our face with a wet slap;
//   - it clings over the whole view, quivering, then sags slowly under its own weight and thins
//     away; webs are left everywhere: in every corner, strands across the window, dew on them;
//   - the pointer is caught in it: a sticky pointer, wrapped in threads, drags behind the real one
//     for twelve seconds (stuckpointer.js) before it tears free.
// The webs are bitmaps drawn once on canvases (the flying one at a large size), so growing them,
// sagging them and fading them only change their transform and opacity.
const HW_SHOT_MS = 12000;  // how long we stay caught
// An orb web on a canvas of `size` pixels: spokes from the centre, a spiral of sticky thread
// sagging between them, a few broken threads, dew drops catching the light
const hwOrbWeb = (size, seed) => {
  const c = document.createElement("canvas"), g = c.getContext("2d"), rnd = seeded(seed), R = size / 2;
  c.width = c.height = size;
  g.translate(R, R);
  g.strokeStyle = "rgba(240,242,255,.85)";
  g.lineCap = "round";
  const spokes = 18, angles = Array.from({ length: spokes }, (_, i) => (i + rnd() * .5) / spokes * Math.PI * 2);
  g.lineWidth = size / 420;
  for (const a of angles) {
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * (.9 + rnd() * .1), Math.sin(a) * R * (.9 + rnd() * .1)); g.stroke();
  }
  g.lineWidth = size / 650;
  for (let r = R * .06; r < R * .92; r += R * (.035 + rnd() * .02)) {
    g.beginPath();
    angles.forEach((a, i) => {
      const b = angles[(i + 1) % spokes] + (i === spokes - 1 ? Math.PI * 2 : 0), m = (a + b) / 2, sag = r * .94;
      if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      if (rnd() < .06) { g.moveTo(Math.cos(b) * r, Math.sin(b) * r); return; }  // a broken thread
      g.quadraticCurveTo(Math.cos(m) * sag, Math.sin(m) * sag, Math.cos(b) * r, Math.sin(b) * r);
    });
    g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,.9)";
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * R * .9;
    g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, size / 1100 + rnd() * size / 800, 0, Math.PI * 2); g.fill();
  }
  return c;
};
// Webs everywhere, over the whole window: fans in the corners, strands across, dew
const hwWebMess = () => {
  const c = document.createElement("canvas"), g = c.getContext("2d"), W = innerWidth, H = innerHeight, rnd = seeded(91);
  c.width = W; c.height = H;
  g.strokeStyle = "rgba(235,238,255,.6)";
  g.lineCap = "round";
  for (const [cx, cy, dir] of [[0, 0, 0], [W, 0, 1], [W, H, 2], [0, H, 3]]) {  // a fan in each corner
    const R = Math.min(W, H) * (.35 + rnd() * .15), a0 = dir * Math.PI / 2;
    g.lineWidth = 1.1;
    for (let k = 0; k <= 7; k++) {
      const a = a0 + k / 7 * Math.PI / 2;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
    }
    g.lineWidth = .8;
    for (let r = R * .12; r < R; r += R * (.08 + rnd() * .05)) {
      g.beginPath();
      for (let k = 0; k <= 7; k++) {
        const a = a0 + k / 7 * Math.PI / 2, m = a0 + (k - .5) / 7 * Math.PI / 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        if (k === 0) g.moveTo(x, y);
        else g.quadraticCurveTo(cx + Math.cos(m) * r * .9, cy + Math.sin(m) * r * .9, x, y);
      }
      g.stroke();
    }
  }
  for (let i = 0; i < 14; i++) {  // strands across the window, sagging
    const x0 = rnd() * W, y0 = rnd() * H * .4, x1 = rnd() * W, y1 = H * (.3 + rnd() * .7);
    g.lineWidth = .6 + rnd();
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + rnd() * 80, x1, y1); g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,.8)";
  for (let i = 0; i < 160; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * H, .8 + rnd() * 1.6, 0, Math.PI * 2); g.fill(); }
  return c;
};
// The stuck pointer: an arrow wrapped in threads
const HW_WEB_CURSOR = '<svg viewBox="0 0 30 36" width="30" height="36"><path d="M2,2V27L8.5,21 13,31.5 17.5,29.5 13,19.5H22Z" fill="#f4f2ff" stroke="#6a5a8a" stroke-width="1.5" stroke-linejoin="round"/>' +
  '<path d="M0,6 24,14M1,18 20,8M3,25 18,24M6,31 15,18M10,4 12,30" stroke="#fff" stroke-width=".7" opacity=".85"/><circle cx="12" cy="13" r="1.2" fill="#fff"/></svg>';
let hwShotFly = null, hwShotWebs = [], hwShotStuck = null, hwShotTimers = [];
const hwWebShot = (x, y) => {
  hwWebShotEnd();
  const W = innerWidth, H = innerHeight, size = Math.min(1400, Math.max(W, H) * 1.1);
  const fly = hwOrbWeb(1024, 7), mess = hwWebMess();
  fly.className = "hwshot";
  mess.className = "hwshot-mess";
  fly.style.cssText = `width:${size}px;height:${size}px;left:${f1(W / 2 - size / 2)}px;top:${f1(H / 2 - size / 2)}px`;
  document.body.append(mess, fly);
  hwShotWebs = [fly, mess];
  hwNoise(.35, 1800, "highpass", .2);  // the spit
  // flying at us: from the spider, small, spinning, faster and faster as it grows
  const from = `translate(${f1(x - W / 2)}px,${f1(y - H / 2)}px) scale(.02) rotate(-40deg)`;
  hwShotFly = fly.animate([
    { transform: from },
    { transform: `translate(${f1((x - W / 2) * .5)}px,${f1((y - H / 2) * .5)}px) scale(.18) rotate(-15deg)`, offset: .6 },
    { transform: "translate(0,0) scale(1.5) rotate(0deg)" },
  ], { duration: 850, easing: "cubic-bezier(.6,0,.9,.6)", fill: "forwards" });
  hwShotFly.onfinish = () => {
    // on our face: a wet slap, it clings and quivers, then sags and thins away; webs everywhere
    hwNoise(.5, 260, "lowpass", .5);
    hwNoise(.25, 2400, "bandpass", .25);
    mess.animate([{ opacity: 0 }, { opacity: 1, offset: .04 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { duration: HW_SHOT_MS + 2500, fill: "forwards" });
    hwShotFly = fly.animate([
      { transform: "scale(1.5)", opacity: 1 },
      { transform: "scale(1.47,1.53)", opacity: 1, offset: .04 },
      { transform: "scale(1.5)", opacity: 1, offset: .1 },
      { transform: "translateY(8vh) scale(1.5,1.62)", opacity: .7, offset: .5 },
      { transform: "translateY(30vh) scale(1.45,1.8)", opacity: 0 },
    ], { duration: 9000, easing: "ease-in", fill: "forwards" });
    hwShotStuck = stuckPointer({ id: "hwwebcursor", cursor: HW_WEB_CURSOR, ms: HW_SHOT_MS, from: [W / 2, H / 2] });
    hwShotTimers.push(setTimeout(hwWebShotEnd, HW_SHOT_MS + 2600));
  };
};
