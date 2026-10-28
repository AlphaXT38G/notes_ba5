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

// Tombstones on the hills: rounded, cross, gothic arch, obelisk, leaning a little; their stone is
// shaded across (#hw-stone-g), the side towards the moon lighter
const hwStone = (x, y, kind, h, lean) => {
  const w = h * .62;
  const shapes = [
    `M${f1(-w / 2)},0V${f1(-h + w / 2)}A${f1(w / 2)},${f1(w / 2)} 0 0 1 ${f1(w / 2)},${f1(-h + w / 2)}V0Z`,
    `M-3,0V${f1(-h * .7)}H${f1(-w / 2)}V${f1(-h * .86)}H-3V${f1(-h)}H3V${f1(-h * .86)}H${f1(w / 2)}V${f1(-h * .7)}H3V0Z`,
    `M${f1(-w / 2)},0V${f1(-h * .6)}L0,${f1(-h)}L${f1(w / 2)},${f1(-h * .6)}V0Z`,
    `M${f1(-w * .3)},0L${f1(-w * .18)},${f1(-h * 1.3)}L0,${f1(-h * 1.45)}L${f1(w * .18)},${f1(-h * 1.3)}L${f1(w * .3)},0Z`,
  ];
  const mark = kind === 0 ? `<path class="engr" d="M${f1(-w * .25)},${f1(-h * .55)}h${f1(w * .5)}M${f1(-w * .2)},${f1(-h * .42)}h${f1(w * .4)}M-1,${f1(-h * .8)}v${f1(h * .14)}M${f1(-w * .1)},${f1(-h * .74)}h${f1(w * .2)}"/>` : "";
  return `<g transform="translate(${f1(x)},${f1(y + 3)}) rotate(${f1(lean)})"><path class="stone" d="${shapes[kind]}"/>` +
    `${mark}</g>`;
};
const HW_GRAVES = (() => {
  const rnd = seeded(77);
  let s = "", grass = "";
  const field = (f, x0, x1, n) => {
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + .2 + rnd() * .6) * (x1 - x0) / n;
      s += hwStone(x, f(x), (rnd() * 4) | 0, 26 + rnd() * 26, (rnd() - .5) * 16);
    }
    for (let x = x0; x < x1; x += 9 + rnd() * 14) {
      const y = f(x) + 2;
      grass += `M${f1(x)},${f1(y)}l${f1(-3 + rnd() * 2)},${f1(-6 - rnd() * 8)}M${f1(x + 2)},${f1(y)}l${f1(1 + rnd() * 3)},${f1(-5 - rnd() * 9)}`;
    }
  };
  field(HW_LEFT, 20, 560, 8);
  field(HW_RIGHT, 1040, 1590, 7);
  // an iron fence along the left hill: bars with spear tips, two rails
  let fence = "";
  for (let x = 380; x < 720; x += 13) {
    const y = HW_LEFT(x) + 10;
    fence += `M${x},${f1(y)}V${f1(y - 44)}l-3,6M${x},${f1(y - 44)}l3,6`;
  }
  fence += `M380,${f1(HW_LEFT(380) - 24)}${Array.from({ length: 27 }, (_, i) => `L${380 + i * 13},${f1(HW_LEFT(380 + i * 13) - 24)}`).join("")}`;
  fence += `M380,${f1(HW_LEFT(380) - 4)}${Array.from({ length: 27 }, (_, i) => `L${380 + i * 13},${f1(HW_LEFT(380 + i * 13) - 4)}`).join("")}`;
  return `<path class="fence" d="${fence}"/>${s}<path class="grass" d="${grass}"/>`;
})();

// The dead tree on the left: a twisted trunk and branches splitting in two again and again,
// thinner each time (seeded), drawn as tapering strokes
const HW_TREE = (() => {
  const rnd = seeded(13);
  const strokes = [[], [], [], [], [], []];  // by thickness
  const grow = (x, y, a, len, depth) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    const bend = (rnd() - .5) * len * .5;
    strokes[Math.min(5, depth)].push(`M${f1(x)},${f1(y)}Q${f1((x + x2) / 2 + bend)},${f1((y + y2) / 2 - bend * .3)} ${f1(x2)},${f1(y2)}`);
    if (depth >= 5) return;
    const spread = .35 + rnd() * .35;
    grow(x2, y2, a - spread + (rnd() - .5) * .3, len * (.62 + rnd() * .15), depth + 1);
    grow(x2, y2, a + spread + (rnd() - .5) * .3, len * (.62 + rnd() * .15), depth + 1);
  };
  grow(170, HW_LEFT(170) + 6, -Math.PI / 2 - .08, 150, 0);
  return `<g class="deadtree">${strokes.map((d, i) => `<path class="br${i}" d="${d.join("")}"/>`).join("")}</g>`;
})();

// The stars of the night sky: small dots of a few sizes and warmths, a few of them twinkling
const HW_STARS = (() => {
  const rnd = seeded(99);
  let dots = "", twinkle = "";
  for (let i = 0; i < 160; i++) {
    const x = rnd() * HW_W, y = rnd() * 430, r = rnd() < .9 ? .6 + rnd() * .7 : 1.3 + rnd() * .8;
    const c = `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}"`;
    if (i < 10) twinkle += `${c} style="--d:${f1(-rnd() * 4)}s"/>`;
    else dots += `${c}/>`;
  }
  return `<g class="stars"><g fill="#fff4e0">${dots}</g><g class="twinkle" fill="#fff">${twinkle}</g></g>`;
})();

const hwSky = document.createElement("div");
hwSky.className = "hwsky";
const hwMoon = document.createElement("div");
hwMoon.id = "hwmoon";
hwMoon.innerHTML = MOON;  // the full moon of christmas.js: on Halloween it is full, of course
hwSky.innerHTML = `<svg viewBox="0 0 ${HW_W} ${HW_H}" preserveAspectRatio="xMidYMax slice">` +
  `<defs><linearGradient id="hw-stone-g" x1="0" x2="1"><stop offset="0" class="st1"/><stop offset="1" class="st2"/></linearGradient></defs>` +
  `${HW_STARS}<path class="ridge r0" d="${hwOutline(hwHill(430, [[30, .003, 0], [14, .009, 2]]), 0, HW_W, 20)}"/>` +
  `<path class="ridge r1" d="${hwOutline(HW_FAR, 0, HW_W, 20)}"/><g class="castle" transform="translate(1270,700) scale(.74) translate(-1215,-700)">${HW_CASTLE}</g>` +
  `<path class="hill h0" d="${hwOutline(HW_RIGHT, 860, HW_W)}"/><path class="hill h1" d="${hwOutline(HW_LEFT, 0, 900)}"/>` +
  `<g class="graves">${HW_GRAVES}</g>${HW_TREE}</svg>`;
// Where the crest of the far ridge is on the screen, at screen x (the werewolf walks on it): the
// ridge's outline through the transform that fits the scene's box to the window
const hwRidgeY = sx => {
  const m = hwSky.firstChild.getScreenCTM();
  return m ? HW_FAR((sx - m.e) / m.a) * m.d + m.f : innerHeight * .7;
};
const hwMist = document.createElement("div");
hwMist.className = "hwmist";
hwMist.innerHTML = "<i></i><i></i>";

hwPart({
  on() { hwBack.append(hwMoon, hwSky, hwMist); },
  off() { [hwMoon, hwSky, hwMist].forEach(el => el.remove()); },
});
