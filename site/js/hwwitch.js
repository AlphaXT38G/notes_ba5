// ── Halloween witch ───────────────────────────────────────────────────────────────────────────
// Now and then (every one to three minutes), as Santa's sleigh at Christmas, a witch flies across
// the sky of the Halloween screens (halloween.js), behind the courses, day and night: astride her
// broom, leaning forward, her pointed hat bent back by the wind, her hooked nose ahead, her hair
// and her cape streaming and fluttering behind her, her boots curled, and her black cat sitting at
// the end of the broom, its tail swaying. She rides the wind: a gentle swell up and down, her broom
// tilting with it, at a random height, size, speed and direction.
// Behind the broom's bristles she leaves a trail of magic: sparkles in purple, green and gold that
// twinkle as they drift down and fade, on a canvas of their own in the sky (only while she flies).
// Reduced motion: she never comes.
const hwWitch = document.createElement("div"), hwTrailCv = document.createElement("canvas"), hwTrailG = hwTrailCv.getContext("2d");
hwWitch.id = "hwwitch";
hwTrailCv.id = "hwtrail";
// Drawn flying to the left, in a 160 x 90 box (mirrored when she flies to the right)
hwWitch.innerHTML = `<svg viewBox="0 0 160 90" aria-hidden="true">` +
  `<path class="cape" d="M66,30C82,26 104,28 128,22C120,30 126,34 116,38C124,42 114,46 106,47C98,52 84,52 72,50Z"/>` +
  `<path class="hair" d="M58,24C70,22 84,26 96,22C90,28 94,30 86,32C90,34 80,36 72,34Z"/>` +
  `<path class="stick" d="M8,63L132,51" stroke-width="3.2" stroke-linecap="round"/>` +
  `<path class="bristles" d="M126,49L158,38 155,46 160,52 155,58 158,68 127,58Z"/><path d="M130,52L156,44M131,54L158,53M130,56L155,63" class="straw"/>` +
  `<path d="M124,47h5v13h-5Z" class="band"/>` +
  `<path class="body" d="M52,34C50,28 56,24 62,26L74,30C80,38 82,46 80,52L66,56C60,50 54,42 52,34Z"/>` +
  `<path class="body" d="M66,52C74,54 80,58 78,62L66,64C62,70 58,74 52,76C48,77 44,76 46,73C50,72 54,70 56,66L60,58Z"/>` +
  `<path class="body" d="M56,36C48,42 40,50 36,58L40,61C46,54 52,48 60,44Z"/>` +
  `<path class="body" d="M50,22C49,15 54,10 60,12C64,13 66,18 64,24C62,28 56,30 52,28L48,27C45,26 42,26 40,24C44,23 47,24 50,22Z"/>` +
  `<path class="body" d="M42,16C50,12 64,10 76,12C70,15 60,16 52,18Z"/><path class="body" d="M54,14C56,4 62,-6 74,-12C72,-4 70,6 66,12Z"/>` +
  `<g class="cat"><path class="body" d="M104,50C102,44 104,38 108,36L106,30 110,33 113,30 113,36C116,40 116,46 114,50Z"/>` +
  `<path class="tail" d="M114,48C120,46 122,38 118,34" fill="none" stroke-width="2.2" stroke-linecap="round"/><circle class="eye" cx="108.5" cy="35.5" r=".9"/></g></svg>`;
let hwWitchIn = 30, hwWitchFlight = null, hwWitchRaf = null, hwWitchLast = 0;
const hwSparks = [];
const HW_SPARK_COLORS = ["200,120,255", "125,255,160", "255,200,90", "255,140,230"];
const hwWitchGo = () => {
  if (hwWitchFlight || hwStill() || document.hidden) return;
  const ltr = Math.random() < .5, W = innerWidth, H = innerHeight;
  const w = 80 + Math.random() * 70, speed = 150 + Math.random() * 110;
  hwWitch.style.width = `${f1(w)}px`;
  hwWitch.classList.toggle("ltr", ltr);
  hwBack.append(hwTrailCv, hwWitch);
  hwTrailCv.width = W;
  hwTrailCv.height = H;
  hwWitchFlight = { ltr, w, h: w * 90 / 160, y0: H * (.08 + Math.random() * .22), dip: (Math.random() - .3) * H * .12,
    x: ltr ? -w - 40 : W + 40, speed, t: 0, end: false };
  hwWitchLast = 0;
  hwWitchRaf = requestAnimationFrame(hwWitchFrame);
};
const hwWitchFrame = now => {
  hwWitchRaf = requestAnimationFrame(hwWitchFrame);
  const dt = Math.min(.05, (now - (hwWitchLast || now)) / 1000) || .016, f = hwWitchFlight, W = innerWidth;
  hwWitchLast = now;
  if (f && !f.end) {
    f.t += dt;
    f.x += (f.ltr ? 1 : -1) * f.speed * dt;
    const u = f.ltr ? (f.x + f.w) / (W + f.w * 2) : 1 - (f.x + f.w) / (W + f.w * 2);  // 0 to 1 across
    const y = f.y0 + Math.sin(u * Math.PI) * f.dip + Math.sin(f.t * 2.1) * 9;
    const slope = Math.cos(f.t * 2.1) * 9 * 2.1 / f.speed + Math.cos(u * Math.PI) * Math.PI * f.dip / (W + f.w * 2);
    const tilt = Math.atan(slope) * 180 / Math.PI * (f.ltr ? 1 : -1);
    hwWitch.style.transform = `translate(${f1(f.x)}px,${f1(y)}px) rotate(${f1(f.ltr ? tilt : -tilt)}deg)`;
    // sparkles from behind the bristles
    const tailX = f.ltr ? f.x + f.w * .02 : f.x + f.w * .98, tailY = y + f.h * .6;
    for (let k = 0; k < 2; k++) {
      if (hwSparks.length < 220 && Math.random() < dt * 30) {
        hwSparks.push({ x: tailX + (Math.random() - .5) * 8, y: tailY + (Math.random() - .5) * 10, vx: (f.ltr ? -1 : 1) * (20 + Math.random() * 40), vy: 5 + Math.random() * 20,
          age: 0, life: 1.2 + Math.random() * 1.4, size: 1.5 + Math.random() * 2.5, color: HW_SPARK_COLORS[(Math.random() * HW_SPARK_COLORS.length) | 0], phase: Math.random() * 6 });
      }
    }
    if (f.ltr ? f.x > W + 40 : f.x < -f.w - 40) { f.end = true; hwWitch.remove(); }
  }
  // the trail: twinkling crosses with a glow, drifting down, slowing, fading
  const g = hwTrailG;
  g.clearRect(0, 0, hwTrailCv.width, hwTrailCv.height);
  g.globalCompositeOperation = "lighter";
  for (let i = hwSparks.length - 1; i >= 0; i--) {
    const s = hwSparks[i];
    s.age += dt;
    if (s.age > s.life) { hwSparks.splice(i, 1); continue; }
    s.vx *= .97; s.vy += 12 * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    const a = (1 - s.age / s.life) * (.6 + .4 * Math.sin(s.age * 14 + s.phase)), r = s.size * (1 + s.age * .4);
    g.fillStyle = `rgba(${s.color},${(a * .25).toFixed(3)})`;
    g.beginPath(); g.arc(s.x, s.y, r * 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(${s.color},${a.toFixed(3)})`;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(s.x - r * 2, s.y); g.lineTo(s.x + r * 2, s.y); g.moveTo(s.x, s.y - r * 2); g.lineTo(s.x, s.y + r * 2); g.stroke();
  }
  g.globalCompositeOperation = "source-over";
  if (f && f.end && !hwSparks.length) hwWitchStop();
};
