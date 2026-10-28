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
