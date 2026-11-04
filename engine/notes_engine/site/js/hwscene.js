// ── Halloween scene (behind the page) ─────────────────────────────────────────────────────────
// The backdrop of the Halloween screens (halloween.js), in #hwscene, behind the courses:
//   - a giant moon, its top risen behind the far ridges like one more hill, the castle black
//     against it (HW_BIGMOON): by day pale in the haze, at night the warm full moon;
//   - at night only: a deep purple sky and a field of stars (a few twinkle);
//   - Dracula's castle on its crag, on the right (HW_CASTLE, hwcastle.js): its windows are dark
//     by day and lit at night (some flicker like candles); its banners, smoke and crows
//     (HW_CASTLE_LIFE, hwcastlelife.js);
//   - far ridges, a haze, then the graveyard hills in front: tombstones of several shapes,
//     crosses, an obelisk, an iron fence, grass tufts, and what stands on the hills (hwHillLife(),
//     hwhills.js); a dead tree on the left;
//   - two bands of mist drifting slowly at the bottom (CSS, transform only).
// All of it is SVG built once from code (seeded random, christmas.js, so it looks the same on
// every visit), in a 1600 x 700 box covering the window from the bottom (the castle drawn bigger,
// then scaled down on its crag: hwCastleAt), in four planes (hwPlane below). What moves in it is
// animated by CSS (transform and opacity) or by hwmotion.js (the planes, the wind, the meteors).
const HW_W = 1600, HW_H = 700;
// The outline of a hill: y at x, from a few waves (so tombstones can stand on it)
const hwHill = (base, waves) => x => base + waves.reduce((y, [a, f, p]) => y + a * Math.sin(x * f + p), 0);
const HW_FAR = hwHill(470, [[22, .004, 1], [12, .011, 3]]);
const HW_LEFT = hwHill(612, [[26, .0045, 2.2], [8, .017, .4]]);
const HW_RIGHT = hwHill(640, [[18, .005, 4.1], [7, .02, 1.3]]);
// The left hill's outline as drawn: from x 820 it slopes down in front of the right hill to the
// bottom of the box at x 1000, instead of stopping on a cliff
// The castle is drawn in a box of its own, larger, then put on its crag: scaled .74 about (1215, 700)
// and moved to x 1270. hwCastleAt says where a point of its box is in the scene's
const HW_CASTLE_FIT = { x: 1270, ox: 1215, oy: 700, k: .74 };
const hwCastleAt = (x, y) => [HW_CASTLE_FIT.x + (x - HW_CASTLE_FIT.ox) * HW_CASTLE_FIT.k, HW_CASTLE_FIT.oy + (y - HW_CASTLE_FIT.oy) * HW_CASTLE_FIT.k];
const HW_LEFT_END = x => x <= 820 ? HW_LEFT(x) : HW_LEFT(x) + Math.pow((x - 820) / 180, 2) * (HW_H - HW_LEFT(x));
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

// The giant moon: the moon of christmas.js, huge, its centre on the far ridge so only its dome
// shows behind the hills and the castle, in a halo, the haze thickening towards the horizon. By
// day pale, barely warmed by a veil; at night (CSS) warm and slightly orange, the tint of a full
// moon low in the sky (#hw-bigmoon-night: sepia(.45) saturate(1.6) hue-rotate(-12deg) as one SVG
// filter, the CSS functions not being sure to work on an element inside an <svg>), in a warm
// halo, a purple dusk at its foot (the gradients' stops recoloured by CSS)
const HW_BIGMOON = (() => {
  const cx = 800, cy = 500, r = 430;
  return `<g class="bigmoon"><defs>` +
    `<radialGradient id="hw-bigmoon-halo"><stop class="hl" offset=".62" stop-color="#fff0d0" stop-opacity=".18"/><stop class="hl2" offset="1" stop-color="#ffe0b0" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="hw-bigmoon-haze" x1="0" x2="0" y1="0" y2="1"><stop class="hz" offset=".4" stop-color="#2a140c" stop-opacity="0"/><stop class="hz" offset=".6" stop-color="#2a140c" stop-opacity=".6"/></linearGradient>` +
    `<filter id="hw-bigmoon-night" color-interpolation-filters="sRGB"><feColorMatrix values=".727 .346 .085 0 0 .157 .859 .076 0 0 .122 .24 .609 0 0 0 0 0 1 0"/>` +
    `<feColorMatrix type="saturate" values="1.6"/><feColorMatrix type="hueRotate" values="-12"/></filter></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 1.6}" fill="url(#hw-bigmoon-halo)"/>` +
    // its own ids: the moon's gradients are also in the Christmas scene's moon
    MOON.replace(/moon-(disc|clip|soft)/g, "hw-bigmoon-$1").replace("<svg ", `<svg x="${cx - r * 1.02}" y="${cy - r * 1.02}" width="${r * 2.04}" height="${r * 2.04}" `) +
    `<circle class="veil" cx="${cx}" cy="${cy}" r="${r}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#hw-bigmoon-haze)"/></g>`;
})();

// The scene is cut into four planes, one above the other, each an <svg> of the same box laid the
// same way over the window (a little wider than it, so a plane slid aside never shows its edge):
//   far    the stars and the shooting stars, the giant moon, the farthest ridge
//   mid    the far ridge (where the werewolf walks) and the castle on its crag
//   near   a haze between the castle and the hills, the hills, the graveyard and what stands
//          on the hills (hwhills.js)
//   tree   the dead tree, alone so the wind can bend it (hwmotion.js)
// hwmotion.js slides them by different amounts (parallax: the pointer, the scroll), so the scene
// has depth; hwDepth holds where each one is slid to, for what is laid over a plane from outside
// (the werewolf, the buttons of hwsecrets.js, the jar).
const hwPlane = (name, inner, defs = "") => {
  const el = document.createElement("div");
  el.className = `hwsky hwl-${name}`;
  el.innerHTML = `<svg viewBox="0 0 ${HW_W} ${HW_H}" preserveAspectRatio="xMidYMax slice">${defs}${inner}</svg>`;
  return el;
};
const HW_PLANES = ["far", "mid", "near", "tree"];
const hwLayers = {
  far: hwPlane("far", `${HW_STARS}<defs><linearGradient id="hw-meteor-g" gradientUnits="userSpaceOnUse" x1="0" x2="-160" y1="0" y2="0">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".2" stop-color="#fff2d8" stop-opacity=".6"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></linearGradient></defs>` +
    `<g class="meteors"></g>${HW_BIGMOON}<path class="ridge r0" d="${hwOutline(hwHill(430, [[30, .003, 0], [14, .009, 2]]), 0, HW_W, 20)}"/>`),
  mid: hwPlane("mid", `<path class="ridge r1" d="${hwOutline(HW_FAR, 0, HW_W, 20)}"/><g class="castle" transform="translate(${HW_CASTLE_FIT.x},${HW_CASTLE_FIT.oy}) scale(${HW_CASTLE_FIT.k}) translate(${-HW_CASTLE_FIT.ox},${-HW_CASTLE_FIT.oy})">${HW_CASTLE}${HW_CASTLE_LIFE}</g>`),
  near: hwPlane("near", `<rect class="haze" x="0" y="380" width="${HW_W}" height="${HW_H - 380}" fill="url(#hw-haze-g)"/>` +
    `<path class="hill h0" d="${hwOutline(HW_RIGHT, 860, HW_W)}"/><path class="hill h1" d="${hwOutline(HW_LEFT_END, 0, 1000, 10)}"/><g class="graves">${HW_GRAVES}</g>${hwHillLife()}`,
    `<defs><linearGradient id="hw-stone-g" x1="0" x2="1"><stop offset="0" class="st1"/><stop offset="1" class="st2"/></linearGradient>` +
    `<linearGradient id="hw-haze-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="hz" stop-opacity="0"/><stop offset=".35" class="hz" stop-opacity=".5"/><stop offset="1" class="hz" stop-opacity=".15"/></linearGradient></defs>`),
  tree: hwPlane("tree", `<g class="treesway">${HW_TREE}</g>`),
};
const hwDepth = { far: [0, 0], mid: [0, 0], near: [0, 0], tree: [0, 0] };
// Where a point of the scene's box is on the screen, the planes not slid: the box fitted to a
// plane's box (xMidYMax slice), from its layout alone, whatever the parallax
const hwFit = () => {
  const el = hwLayers.near, W = el.offsetWidth || innerWidth, H = el.offsetHeight || innerHeight, s = Math.max(W / HW_W, H / HW_H);
  return { s, x: el.offsetLeft + (W - HW_W * s) / 2, y: el.offsetTop + H - HW_H * s };
};
// Where the crest of the far ridge is on the screen, at screen x (the werewolf walks on it)
const hwRidgeY = sx => {
  const m = hwFit();
  return HW_FAR((sx - m.x) / m.s) * m.s + m.y;
};
const hwMist = document.createElement("div");
hwMist.className = "hwmist";
hwMist.innerHTML = "<i></i><i></i>";

hwPart({
  on() { hwBack.append(...HW_PLANES.map(n => hwLayers[n]), hwMist); },
  off() { [...HW_PLANES.map(n => hwLayers[n]), hwMist].forEach(el => el.remove()); },
});
