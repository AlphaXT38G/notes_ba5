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
