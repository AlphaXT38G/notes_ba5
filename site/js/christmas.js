// ── Christmas (screens "christmas" and "christmas-night", body.christmas) ─────────────────────
// From December 10 to January 3 the usual looks are replaced by Christmas (css/christmas.css):
// the day screen from 6:00 to 18:00, the night screen from 18:00 to 6:00. Typing "yeti" brings
// them at any time of the year. Both screens have:
//   - a garland across the top (lit at night),
//   - snow falling on the effects canvas (fx.js),
//   - a winter scene behind the page: big discreet mountains, a decorated tree on the right with
//     gifts, a snowman companion on the left (and at night the moon and chalet lights),
//   - a Christmas turntable playing Jingle Bell Rock or a live of Christmas music,
//   - a small golden sax hidden among the tree's ornaments, which opens the jazz bar (a little
//     fir in the bar brings Christmas back), a red guitar standing behind the gifts, which
//     starts the metal show, and a firefly jar swinging under the garland, which opens the calm
//     night (the same fir brings Christmas back).
// At night the tree lights play changing patterns and Santa's sleigh crosses the sky now and then.
// The metal show at 1:00 and the other easter eggs still take over.
//
// In this file, in order: screens and override, the yeti code, shared helpers, the garland, the
// bow, the tag and the gifts, the tree and its sax ornament, the guitar, the jar, the mountains, the
// moon, the snowman, the sax, guitar and jar buttons, the tree lights canvas, the snow, the sleigh,
// the music, the fir back from the jazz bar or the calm night, the jar's pendulum, and turning it
// all on and off.
// Every drawing is SVG built once from code (seeded random, so it looks the same on every visit).
const xmasSubtitle = () => {
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  if (m === 11 && day < 24) return `${25 - day} days until Christmas. Revise by the tree.`;
  if (m === 11 && day === 24) return "Christmas Eve. One last chapter before the presents.";
  if (m === 11 && day === 25) return "Merry Christmas! The notes can wait until tomorrow.";
  if (m === 11 && day === 31) return "New Year's Eve. Last revisions of the year.";
  if (m === 0 && day <= 3) return `Happy New Year ${d.getFullYear()}! Exams are coming.`;
  return "Happy holidays, and good luck with the exams.";
};
SCREENS.christmas = { className: "christmas", subtitle: xmasSubtitle, transition: "christmas" };
SCREENS["christmas-night"] = { className: "christmas", subtitle: xmasSubtitle, transition: "christmas" };

// Christmas replaces the day, the calm night and the jazz bar, not the shows: the override only
// rewrites the normal screens (no screen, the calm night, see isNormal) and the jazz screens, and
// it runs before the metal and epic ones (this file is loaded before metal.js), so those still
// win. A forced ?screen=... is left alone (?screen=christmas and ?screen=christmas-night force these
// screens), unless the yeti code was typed (xmasEgg).
// xmasJazz: the hidden sax was clicked on that Christmas screen ("christmas" or "christmas-night"):
// the jazz bar replaces it until the fir is clicked or the other one comes (18:00 or 6:00).
// xmasPeace: the calm night was opened with the firefly jar (the peace egg of calm.js, which keeps
// the yeti egg then), so the fir shows there too and brings Christmas back.
const isXmasDate = (d = new Date()) => (d.getMonth() === 11 && d.getDate() >= 10) || (d.getMonth() === 0 && d.getDate() <= 3);
const isXmasDaytime = () => { const t = clockSeconds(); return t >= 6 * 3600 && t < 18 * 3600; };
// Easter egg: typing y e t i (outside the search field) brings Christmas at any time of the year, day
// or night by the clock as usual, for the rest of the visit. Outside the Christmas period, typing it
// on a Christmas screen (from the egg or a forced ?screen=christmas...) goes back to the normal
// screen; during the period it does nothing there, Christmas is there anyway. What counts is the
// screen shown, not the egg: typed in a jazz bar opened over Christmas (armstrong code, sax), it
// brings Christmas back. It overrides a forced ?screen=.
// yetiTyped: how many times it was typed, so that the armstrong code's bar gives way (armstrong.js)
let xmasJazz = false, xmasEgg = false, xmasPeace = false, yetiTyped = 0;
OVERRIDES.push(phase => {
  let p = phase;
  if ((xmasEgg || (!forced || forcedDismissed) && isXmasDate()) && (isNormal(p) || screenClass(p) === "night")) {
    p = isXmasDaytime() ? "christmas" : "christmas-night";
  }
  if (xmasJazz && xmasJazz !== p && (p === "christmas" || p === "christmas-night")) xmasJazz = false;
  if (xmasJazz && p === xmasJazz) return phase === "closing" ? "closing" : "evening";
  return p;
});

const YETI = ["y", "e", "t", "i"];
let yetiPos = 0;  // how many letters of the word have been typed so far
document.addEventListener("keydown", e => {
  if (e.target.matches("input")) return;  // typing in the search field never triggers it
  const k = e.key.toLowerCase();
  yetiPos = k === YETI[yetiPos] ? yetiPos + 1 : (k === YETI[0] ? 1 : 0);
  if (yetiPos !== YETI.length) return;
  yetiPos = 0;
  const onXmas = document.body.classList.contains("christmas");
  if (onXmas && isXmasDate()) return;
  yetiTyped++;
  xmasJazz = false;  // a bar opened with the sax gives way too
  if (!isXmasDate()) xmasEgg = !onXmas;
  if (onXmas && forced && forced.startsWith("christmas")) forcedDismissed = true;  // also leaves a forced Christmas
  applyScreen();
});

// Same pseudo-random numbers on every visit, so the scene is always drawn the same way
const seeded = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const f1 = n => n.toFixed(1);  // one decimal is plenty in SVG coordinates, and keeps the markup short
// point at t (0 - 1) on a quadratic Bezier curve from (x0, y0) to (x1, y1), controlled by (cx, cy)
const quad = (x0, y0, cx, cy, x1, y1, t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
// Colours of the tree lights: [glass by day, lit glass at night, glow rgb]
const XMAS_LIGHTS = [["#a3192d", "#ff5a6e", "255,70,90"], ["#b07d12", "#ffd86a", "255,200,80"], ["#1d5aa8", "#7cc0ff", "90,170,255"],
  ["#17784a", "#7dffb4", "90,255,160"], ["#9c2a7e", "#ff94dc", "255,120,210"]];
const NEEDLES = ["#1b5a31", "#246b3c", "#123f22", "#2f7d48", "#2a6b5a"];  // greens of the garland's fir needles

// Garland across the top of the page: wide, heavy swags of fir of irregular widths and depths,
// dusted with snow, a gold ribbon woven through, a few pine cones, velvet bows at the hooks. Small
// fairy lights sit in the fir, and glass baubles hang below it on threads of different lengths.
// By day the lights are unlit glass and the baubles plain; at night (CSS) the lights are lit, each
// bauble reflects its two nearest lights (a coloured glint on the side facing each light), and the
// lights' halos twinkle each at its own pace on a canvas over the garland (paintGarlandGlow, below).
// The halos used to be SVG circles with a CSS animation each: some 150 animated elements, which
// restyled and redrew the whole garland, needles and all, on every frame. Rebuilt to the page width.
const GLASS = [["#ff8a9a", "#b3122e", "#4d0512"], ["#ffe6a0", "#c99416", "#5c3b02"], ["#9ff0c8", "#16804a", "#053520"],
  ["#d6ecff", "#4f8fd6", "#11305e"], ["#ffffff", "#b9c2ce", "#4b5361"]];
const FAIRY = ["#fff1c9", "#fff1c9", "#ffd86a", "#ff5a6e", "#7cc0ff", "#fff1c9"];  // mostly warm white
const garland = document.createElement("div");
garland.id = "garland";
garland.setAttribute("aria-hidden", "true");
const cubic = (p, t) => {
  const u = 1 - t;
  return [0, 1].map(k => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
};
const buildGarland = () => {
  const W = Math.max(320, document.documentElement.clientWidth), rnd = seeded(12);
  // irregular swags: widths from 240 to 420 px, depths from 45 to 82 px, hooks at slightly different heights
  const hooks = [[0, 6]];
  const last = () => hooks[hooks.length - 1];  // not .at(-1): Chromium 92+ only
  while (last()[0] < W) hooks.push([last()[0] + 240 + rnd() * 180, 3 + rnd() * 9]);
  const scale = W / last()[0];  // stretch so the last hook lands on the right edge
  hooks.forEach(h => { h[0] *= scale; });
  const swags = [], lights = [], baubles = [];
  // the firefly jar hangs on the left, in the margin beside the title (placeJar, below)
  const jarX = W < 700 ? W * .1 : W * .12;
  let jarY = 20;
  for (let k = 0; k + 1 < hooks.length; k++) {
    const [x0, y0] = hooks[k], [x1, y1] = hooks[k + 1], w = x1 - x0, sag = 45 + rnd() * 37, lean = (rnd() - .5) * .25;
    const curve = [[x0, y0], [x0 + w * (.28 + lean), y0 + sag * 1.3], [x0 + w * (.72 + lean), y1 + sag * 1.3], [x1, y1]];
    const needles = NEEDLES.map(() => []), snow = [], cones = [];
    let ribbon = "";
    const n = Math.round(w / 2.2);
    for (let i = 0; i <= n; i++) {
      const tt = i / n, [x, y] = cubic(curve, tt), [xa, ya] = cubic(curve, Math.min(1, tt + .01)), [xb, yb] = cubic(curve, Math.max(0, tt - .01));
      const len = Math.hypot(xa - xb, ya - yb) || 1, nx = -(ya - yb) / len, ny = (xa - xb) / len;  // normal, pointing down-ish
      const thick = 11 * Math.sin(Math.PI * Math.min(1, .25 + tt * .5 + (1 - tt) * .25)) + 3;  // fuller in the middle
      for (let j = 0; j < 4; j++) {
        const off = (rnd() - .5) * 2 * thick, a = rnd() * Math.PI * 2, l = 7 + rnd() * 8;
        needles[(rnd() * NEEDLES.length) | 0].push(`M${f1(x + nx * off)},${f1(y + ny * off)}l${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)}`);
      }
      if (i % 5 === 0 && rnd() < .55) snow.push(`<ellipse cx="${f1(x - nx * (thick - 2) + (rnd() - .5) * 6)}" cy="${f1(y - ny * (thick - 2))}" rx="${f1(2.5 + rnd() * 3.5)}" ry="${f1(1.6 + rnd() * 1.6)}"/>`);
      const wob = Math.sin(tt * Math.PI * 2 * (w / 90)) * thick * .8;
      ribbon += `${i ? "L" : "M"}${f1(x + nx * wob)},${f1(y + ny * wob)}`;
    }
    // pine cones, here and there
    if (rnd() < .7) {
      const [x, y] = cubic(curve, .2 + rnd() * .6), a = f1((rnd() - .5) * 60);
      cones.push(`<g class="cone" transform="translate(${f1(x)},${f1(y + 6)}) rotate(${a})"><ellipse rx="6" ry="10" cy="6"/>` +
        `<path d="M-5,0h10M-6,5h12M-5.5,10h11M-4,14h8"/></g>`);
    }
    // fairy lights in the fir
    const nl = Math.round(w / 34);
    for (let i = 0; i < nl; i++) {
      const tt = (i + .3 + rnd() * .4) / nl, [x, y] = cubic(curve, tt), dx = (rnd() - .5) * 10, dy = (rnd() - .3) * 14;
      lights.push({ k, x: x + dx, y: y + dy, c: FAIRY[(rnd() * FAIRY.length) | 0], d: -rnd() * 5, t: 1.6 + rnd() * 2.6 });
    }
    // glass baubles hanging below, two or three per swag
    const nb = 2 + (rnd() < .5);
    for (let i = 0; i < nb; i++) {
      const tt = (i + .25 + rnd() * .5) / nb, [x, y] = cubic(curve, tt), thread = 8 + rnd() * 28, r = 8 + rnd() * 6;
      const c = (rnd() * GLASS.length) | 0;
      if (Math.abs(x - jarX) > 34) baubles.push({ k, x, y: y + 6, cy: y + 6 + thread + r, r, c });  // off the jar
    }
    if (jarX >= x0 && jarX < x1) {  // the jar's swag: where the middle of the fir crosses its x
      for (let i = 0, best = Infinity; i <= 100; i++) {
        const [x, y] = cubic(curve, i / 100);
        if (Math.abs(x - jarX) < best) { best = Math.abs(x - jarX); jarY = y; }
      }
    }
    const fir = `<path class="fir" d="M${f1(x0)},${f1(y0)}C${curve.slice(1).map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}"/>` +
      needles.map((d, i) => `<path stroke="${NEEDLES[i]}" class="needles" d="${d.join("")}"/>`).join("") +
      `<path class="ribbon" d="${ribbon}"/>${cones.join("")}<g class="snow">${snow.join("")}</g>`;
    swags.push(fir);
  }
  const lightSvg = l => `<circle class="glass" cx="${f1(l.x)}" cy="${f1(l.y)}" r="2.6"/><circle class="lit" cx="${f1(l.x)}" cy="${f1(l.y)}" r="3.2" fill="${l.c}"/>`;
  const baubleSvg = b => {
    // the two nearest lights, mirrored on the side of the glass facing them
    const near = lights.map(l => [Math.hypot(l.x - b.x, l.y - b.cy), l]).sort((a, z) => a[0] - z[0]).slice(0, 2);
    const glints = near.map(([d, l]) => {
      const gx = b.x + (l.x - b.x) / d * b.r * .55, gy = b.cy + (l.y - b.cy) / d * b.r * .55;
      return `<circle class="refl" cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(b.r * .5)}" fill="url(#fl${FAIRY.indexOf(l.c)})"/>` +
        `<circle class="refl" cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(Math.max(1, b.r * .1))}" fill="${l.c}"/>`;
    }).join("");
    return `<g class="bauble"><path class="thread" d="M${f1(b.x)},${f1(b.y)}V${f1(b.cy - b.r - 3)}"/>` +
      `<rect class="cap" x="${f1(b.x - 2.8)}" y="${f1(b.cy - b.r - 4)}" width="5.6" height="5" rx="1"/>` +
      `<circle cx="${f1(b.x)}" cy="${f1(b.cy)}" r="${f1(b.r)}" fill="url(#gb${b.c})"/>${glints}` +
      `<ellipse class="shine" cx="${f1(b.x - b.r * .38)}" cy="${f1(b.cy - b.r * .4)}" rx="${f1(b.r * .22)}" ry="${f1(b.r * .32)}" transform="rotate(-30 ${f1(b.x - b.r * .38)} ${f1(b.cy - b.r * .4)})"/></g>`;
  };
  const bows = hooks.map(([x, y]) => `<g class="bow" transform="translate(${f1(x)},${f1(y + 4)})">` +
    `<path d="M-3,3C-9,24-13,34-15,42L-9,38-6,44C-4,30-1,18 1,4ZM3,3C9,24 13,34 15,42L9,38 6,44C4,30 1,18-1,4Z" fill="url(#bowtail)"/>` +
    `<path d="M0,0C-20,-18-34,4-6,6ZM0,0C20,-18 34,4 6,6Z" fill="url(#bowloop)"/><ellipse rx="5" ry="4.5" fill="#9b0d22"/></g>`).join("");
  const defs = FAIRY.map((c, i) => FAIRY.indexOf(c) === i ?
    `<radialGradient id="fl${i}"><stop offset="0" stop-color="${c}" stop-opacity=".95"/><stop offset=".35" stop-color="${c}" stop-opacity=".45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>` : "").join("") +
    GLASS.map(([a, b, c], i) => `<radialGradient id="gb${i}" cx=".38" cy=".32" r=".75"><stop class="g1" offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`).join("") +
    `<linearGradient id="bowloop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2384f"/><stop offset=".6" stop-color="#b3122e"/><stop offset="1" stop-color="#7d0a1d"/></linearGradient>` +
    `<linearGradient id="bowtail" x1="0" x2="1"><stop offset="0" stop-color="#8a0c20"/><stop offset=".5" stop-color="#c8102e"/><stop offset="1" stop-color="#8a0c20"/></linearGradient>` +
    `<linearGradient id="ribbon" x1="0" x2="1"><stop offset="0" stop-color="#f6dc8a"/><stop offset=".5" stop-color="#d4a630"/><stop offset="1" stop-color="#f6dc8a"/></linearGradient>`;
  // swag by swag: its baubles behind the fir, its lights in front; the bows on top, at the hooks.
  // The garland does not react to the mouse any more: it is drawn once and never redrawn.
  garland.innerHTML = `<svg width="${W}" height="170" viewBox="0 0 ${W} 170"><defs>${defs}</defs>` +
    swags.map((fir, k) => baubles.filter(b => b.k === k).map(baubleSvg).join("") + fir + lights.filter(l => l.k === k).map(lightSvg).join("")).join("") +
    `${bows}</svg>`;
  garlandLights = lights.map(l => ({ ...l, c: FAIRY.indexOf(l.c) }));
  garlandGlow.width = W; garlandGlow.height = 170;  // also clears it
  garlandGlowShown = false;
  garland.append(garlandGlow);
  garland.w = W;
  placeJar(jarX, jarY);
};

// The halos of the garland's fairy lights at night, on a canvas over the garland, at 1x (they are
// soft glows; the crisp lit bulbs stay in the SVG). Painted by the night lights loop (treeFrame,
// below) with each light's twinkle; painted once, still, with reduced motion. Nothing is drawn
// while the page is scrolled past the garland.
const garlandGlow = document.createElement("canvas"), gctx = garlandGlow.getContext("2d");
// the halo of each colour: the same falloff as the baubles' reflections (#fl gradients)
const FAIRY_GLOWS = FAIRY.map(hex => {
  const s = document.createElement("canvas"), c = s.getContext("2d"), rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(",");
  s.width = s.height = 64;
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${rgb},.95)`); g.addColorStop(.35, `rgba(${rgb},.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return s;
});
// opacity through one twinkle (p: 0 - 1), eased between these keyframes
const TWINKLE = [[0, 1], [.45, .55], [.55, .9], [.7, .4], [1, 1]];
const twinkle = p => {
  let i = 1;
  while (TWINKLE[i][0] < p) i++;
  const [p0, a0] = TWINKLE[i - 1], [p1, a1] = TWINKLE[i], u = (p - p0) / (p1 - p0);
  return a0 + (a1 - a0) * u * u * (3 - 2 * u);
};
let garlandLights = [], garlandGlowShown = false;
const paintGarlandGlow = time => {  // time in seconds, or null: still lights
  const shown = time === null || scrollY < 180;
  if (!shown && !garlandGlowShown) return;  // scrolled away and already cleared
  gctx.clearRect(0, 0, garlandGlow.width, garlandGlow.height);
  garlandGlowShown = shown;
  if (!shown) return;
  for (const l of garlandLights) {
    gctx.globalAlpha = time === null ? 1 : twinkle((((time - l.d) / l.t) % 1 + 1) % 1);
    gctx.drawImage(FAIRY_GLOWS[l.c], l.x - 17, l.y - 17, 34, 34);
  }
  gctx.globalAlpha = 1;
};

// The tree, on the right of the winter scene behind the page (#xscene): tiers of fir with snow on
// the branches, tinsel, baubles, candy canes, light strings and a star, a red skirt and gifts below
// it. Drawn once as SVG in a 520 x 640 box, lit from the top left like the rest of the scene and
// shaded for volume: each tier is rounded by gradients (darker under the tier above it and towards
// its edges), carries rows of hanging branches layered like scales (light on the lit side, dark
// on the far side), a lip under its edge and a rim of light along the lit half; the trunk is a
// cylinder, the skirt a lit cloth, the baubles have their reflection and their shadow on the
// needles, the star is cut in facets. All of it is static (no blur, no animation), so it costs
// nothing once drawn. The lights are also listed (treeLights) for the night canvas that lights
// them up. The sax ornament and the guitar are in a separate layer above the page (#xtree-front),
// so they can be clicked even where the cards cover the tree.
// A ribbon bow seen from the front, in volume without gradients (the gifts, the guitar and the jar
// share it, and the jar and guitar are separate SVGs): the left loop lit, the right one in shade,
// the inside of each loop darker, a glint on the left loop, two tails and the knot.
const bow3d = (x, y, c, dark, k = 1) => `<g transform="translate(${f1(x)},${f1(y)}) scale(${k})">` +
  `<path d="M-1,1L-8,11 -4.5,11.5 0,3Z" fill="${dark}"/><path d="M1,1L7,12 10.5,10.5 1.8,1.5Z" fill="${dark}"/>` +
  `<path d="M0,0C-5,-11 -18,-13 -17,-4 -16,3 -6,2 0,0Z" fill="${c}"/><path d="M-1.5,-.5C-6,-7 -13,-8 -13.5,-3.5 -11,-2 -6,-1 -1.5,-.5Z" fill="${dark}" opacity=".55"/>` +
  `<path d="M0,0C5,-11 18,-13 17,-4 16,3 6,2 0,0Z" fill="${c}"/><path d="M0,0C5,-11 18,-13 17,-4 16,3 6,2 0,0Z" fill="rgba(0,0,0,.22)"/>` +
  `<path d="M1.5,-.5C6,-7 13,-8 13.5,-3.5 11,-2 6,-1 1.5,-.5Z" fill="${dark}" opacity=".55"/>` +
  `<path d="M-14,-6c2,-3 5,-4 8,-2" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.3" stroke-linecap="round"/>` +
  `<ellipse rx="3.4" ry="2.8" fill="${c}"/><ellipse rx="3.4" ry="2.8" fill="rgba(0,0,0,.15)"/><ellipse cx="-1" cy="-1" rx="1.4" ry="1" fill="rgba(255,255,255,.45)"/></g>`;
// A gift tag hanging from its string (x, y: where the string is tied), turned by a few degrees:
// a cream card with a cut corner, its hole, and two red lines of writing too small to read
const giftTag = (x, y, a) => `<g transform="translate(${x},${y}) rotate(${a})"><path d="M0,0L-1,6.5" stroke="#b8935a" stroke-width=".6"/>` +
  `<path d="M-4.5,6H2.5L4.5,8.5V15H-4.5Z" fill="#f6ecd4" stroke="rgba(60,30,0,.35)" stroke-width=".4"/><path d="M2.5,6V8.5H4.5" fill="rgba(0,0,0,.08)"/>` +
  `<circle cx="-1" cy="8.3" r=".8" fill="#8a6a3a"/><path d="M-3,11.2h4.5M-3,13h3" stroke="#c8102e" stroke-width=".55" stroke-linecap="round"/></g>`;
const TREE_W = 520, TREE_H = 640, TREE_X = 330;
const treeLights = [];
const treeHalfWidth = y => 12 + (y - 60) / (520 - 60) * 172;  // half width of the tree at height y
// Gifts below the tree, as boxes in volume seen a little from above: the front, the side that
// faces the tree's middle (the right one for the gifts on the left, the left one for those on the
// right), and the lid, with its top, overhanging the box and casting a shadow on it. Lit from the
// top left: the top is the lightest, the front shaded across and darker near the floor, a right
// side in shade. The ribbon goes round the box (front, side and top) and a bow sits in the middle
// of the lid; some papers have a pattern. Each one casts a shadow on the skirt (foot). Their
// gradients and patterns are in the tree's defs (buildTree).
const giftPoly = (pts, fill) => `<polygon points="${pts.map(([a, b]) => `${f1(a)},${f1(b)}`).join(" ")}" fill="${fill}"/>`;
const giftBox = ([x, y, w, h, box, rib, ribDark, pat], foot = true) => {
  const side = x + w / 2 < TREE_X ? 1 : -1, d = Math.min(18, w * .24), dx = side * d * .5, dy = -d * .62;
  const sideShade = side > 0 ? "rgba(0,0,0,.3)" : "rgba(0,0,0,.1)", cx = x + w / 2, rw = Math.max(7, w * .14);
  const along = (x0, y0, t) => [x0 + dx * t, y0 + dy * t];  // a point t of the way back from the front
  const band = (x0, ya, yb) => [along(x0, ya, .5 - .16), along(x0, ya, .5 + .16), along(x0, yb, .5 + .16), along(x0, yb, .5 - .16)];
  const sideFace = (x0, ya, yb) => [[x0, ya], along(x0, ya, 1), along(x0, yb, 1), [x0, yb]];
  const L = 10, o = 3, lx = x - o, lw = w + 2 * o, ly = y - L + 2;  // the lid
  const bx = side > 0 ? x + w : x, lsx = side > 0 ? lx + lw : lx;  // where the visible sides are
  let g = foot ? `<ellipse cx="${f1(cx + 9)}" cy="${f1(y + h)}" rx="${f1(w * .62)}" ry="6" fill="url(#xgiftfoot)"/>` : "";
  // the box: its side (paper, ribbon, shade), then its front (paper, pattern, ribbon, shading)
  g += giftPoly(sideFace(bx, y, y + h), box) + (pat ? giftPoly(sideFace(bx, y, y + h), `url(#${pat})`) : "") + giftPoly(band(bx, y, y + h), rib) + giftPoly(sideFace(bx, y, y + h), sideShade);
  g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${box}"/>` + (pat ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${pat})"/>` : "") +
    `<rect x="${f1(cx - rw / 2)}" y="${y}" width="${f1(rw)}" height="${h}" fill="${rib}"/><rect x="${f1(cx - rw / 2)}" y="${y}" width="${f1(rw * .3)}" height="${h}" fill="rgba(255,255,255,.22)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#xshade)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#xgiftfloor)"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="5" fill="rgba(0,0,0,.28)"/>`;  // the lid's shadow on the box
  // the lid: its side, its front, then its top with the two ribbons crossing and the bow
  const top = [[lx, ly], [lx + lw, ly], along(lx + lw, ly, 1), along(lx, ly, 1)];
  g += giftPoly(sideFace(lsx, ly, ly + L), box) + giftPoly(band(lsx, ly, ly + L), rib) + giftPoly(sideFace(lsx, ly, ly + L), sideShade);
  g += `<rect x="${lx}" y="${ly}" width="${lw}" height="${L}" fill="${box}"/>` + (pat ? `<rect x="${lx}" y="${ly}" width="${lw}" height="${L}" fill="url(#${pat})"/>` : "") +
    `<rect x="${f1(cx - rw / 2)}" y="${ly}" width="${f1(rw)}" height="${L}" fill="${rib}"/><rect x="${lx}" y="${ly}" width="${lw}" height="${L}" fill="url(#xshade)"/>` +
    `<rect x="${lx}" y="${ly + L - 1.5}" width="${lw}" height="1.5" fill="rgba(0,0,0,.25)"/>`;
  g += giftPoly(top, box) + (pat ? giftPoly(top, `url(#${pat})`) : "") +
    giftPoly([[cx - rw / 2, ly], [cx + rw / 2, ly], along(cx + rw / 2, ly, 1), along(cx - rw / 2, ly, 1)], rib) +
    giftPoly([along(lx, ly, .5 - .16), along(lx + lw, ly, .5 - .16), along(lx + lw, ly, .5 + .16), along(lx, ly, .5 + .16)], rib) +
    giftPoly(top, "rgba(255,255,255,.2)") + `<path d="M${f1(lx)},${f1(ly)}H${f1(lx + lw)}" stroke="rgba(255,255,255,.45)" stroke-width="1"/>`;
  const [bowX, bowY] = along(cx, ly, .5);
  return `<g class="gift">${g}${bow3d(bowX, bowY + 1, rib, ribDark, Math.min(1.25, w / 60))}</g>`;
};
// x, y, width, height, paper, ribbon, ribbon in shade, pattern; from the back to the front (lowest last)
const GIFTS = [[178, 512, 72, 50, "#c8102e", "#ffd15c", "#c9921c", "xpdots"], [258, 528, 52, 36, "#2f6fd1", "#eef2f8", "#aab4c4", "xpflakes"],
  [380, 508, 78, 52, "#1e8a4c", "#d6203a", "#8e0f22", "xpstripes"], [452, 530, 46, 32, "#e2a81e", "#c8102e", "#7e0a1d", ""]]
  .sort((a, b) => (a[1] + a[3]) - (b[1] + b[3]));
const buildTree = () => {
  const rnd = seeded(2025), parts = [];
  const defs = [`<linearGradient id="xfir" x1="0" x2="1"><stop class="s1" offset="0"/><stop class="s2" offset=".45"/><stop class="s3" offset="1"/></linearGradient>`,
    `<linearGradient id="xstar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffc93c"/><stop offset="1" stop-color="#c98a0c"/></linearGradient>`,
    `<linearGradient id="xgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".45" stop-color="#e3a923"/><stop offset="1" stop-color="#8a5a08"/></linearGradient>`,
    // volume of a tier: in the shadow of the tier above at its top, rounded like a cone (lit on the
    // left, darker towards the edges), a rim of light along the lit half of its edge
    `<linearGradient id="xfirdepth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(0,18,6,.55)"/><stop offset=".4" stop-color="rgba(0,18,6,0)"/><stop offset=".85" stop-color="rgba(0,18,6,0)"/><stop offset="1" stop-color="rgba(0,18,6,.25)"/></linearGradient>`,
    `<radialGradient id="xfirround" cx=".34" cy=".62" r=".72"><stop offset="0" stop-color="rgba(220,255,200,.16)"/><stop offset=".55" stop-color="rgba(220,255,200,0)"/><stop offset="1" stop-color="rgba(0,15,5,.4)"/></radialGradient>`,
    `<linearGradient id="xrim" x1="0" x2="1"><stop offset="0" stop-color="rgba(190,245,170,.75)"/><stop offset=".45" stop-color="rgba(190,245,170,.25)"/><stop offset=".6" stop-color="rgba(190,245,170,0)"/></linearGradient>`,
    `<linearGradient id="xtrunk" x1="0" x2="1"><stop offset="0" stop-color="#8a5a2c"/><stop offset=".35" stop-color="#6b4220"/><stop offset="1" stop-color="#2e1808"/></linearGradient>`,
    `<radialGradient id="xskirt" cx=".32" cy=".25" r=".8"><stop offset="0" stop-color="#ea3048"/><stop offset=".5" stop-color="#c8102e"/><stop offset="1" stop-color="#7e0a1d"/></radialGradient>`,
    `<radialGradient id="xtrunkfoot"><stop offset="0" stop-color="rgba(40,0,8,.55)"/><stop offset="1" stop-color="rgba(40,0,8,0)"/></radialGradient>`];
  const BAUBLES = [["#ff6b7d", "#c8102e", "#5c0614"], ["#fff1a6", "#e2a81e", "#6b4504"], ["#bfe1ff", "#2f7ed8", "#0b2d5c"], ["#ffffff", "#c7ced8", "#59626e"], ["#e9b8ff", "#8e3cc8", "#3a0c5a"]];
  BAUBLES.forEach(([a, b, c], i) => defs.push(`<radialGradient id="xb${i}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`));

  // Tree skirt (a lit cloth with a few soft folds) and trunk (a cylinder standing in it), then the
  // tiers from the bottom up, each casting a shadow on the one below
  const folds = [-110, -62, -18, 30, 76, 118].map(dx => `M${TREE_X + dx * .55},541Q${TREE_X + dx * .8},556 ${TREE_X + dx},${f1(556 + 17 * Math.sqrt(1 - (dx / 150) ** 2))}`).join("");
  parts.push(`<ellipse cx="${TREE_X}" cy="560" rx="150" ry="22" fill="#7e0a1d"/><ellipse cx="${TREE_X}" cy="556" rx="150" ry="19" fill="url(#xskirt)"/>` +
    `<path d="${folds}" fill="none" stroke="rgba(70,0,12,.28)" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M${TREE_X - 150},556a150,19 0 0 0 300,0" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="1 9" stroke-linecap="round"/>` +
    `<ellipse cx="${TREE_X + 6}" cy="551" rx="30" ry="6" fill="url(#xtrunkfoot)"/><rect x="${TREE_X - 15}" y="512" width="30" height="40" fill="url(#xtrunk)"/>` +
    `<ellipse cx="${TREE_X}" cy="552" rx="15" ry="3" fill="#2e1808"/><path d="M${TREE_X - 8},516v32M${TREE_X + 3},514v34" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/>`);
  const TIERS = [[290, 525, 184], [222, 438, 150], [160, 350, 118], [106, 262, 86], [62, 178, 52]];
  TIERS.forEach(([top, bottom, hw], i) => {
    const n = 7 + (4 - i) * 2, step = hw * 2 / n;
    let edge = "";
    for (let j = 0; j < n; j++) {
      const xa = TREE_X - hw + j * step;
      edge += `Q${f1(xa + step / 2)},${f1(bottom + 13 + rnd() * 6)} ${f1(xa + step)},${f1(bottom - rnd() * 4)}`;
    }
    const path = `M${TREE_X},${top - 34}C${TREE_X - hw * .35},${f1(top + (bottom - top) * .45)} ${f1(TREE_X - hw * .8)},${f1(bottom - 20)} ${f1(TREE_X - hw)},${bottom}${edge}` +
      `C${f1(TREE_X + hw * .8)},${f1(bottom - 20)} ${TREE_X + hw * .35},${f1(top + (bottom - top) * .45)} ${TREE_X},${top - 34}Z`;
    if (i) parts.push(`<path d="${path}" transform="translate(0,9)" class="tier-shadow"/>`);
    // the lip: the underside of the branches, seen just below their edge
    parts.push(`<path d="${path}" transform="translate(0,3.5)" class="tier-lip"/><path d="${path}" fill="url(#xfir)"/>` +
      `<path d="${path}" fill="url(#xfirdepth)"/><path d="${path}" fill="url(#xfirround)"/>`);
    // rows of drooping branches inside the tier, layered like scales: each branch is a hanging
    // crescent with its shadow under it and a fringe of needles along its edge, in three tones by
    // where it is (lit on the left, in the shade on the right and in the shadow of the tier above)
    const tones = ["", "", ""], fringe = ["", "", ""];
    let shade = "";
    for (let r = 1; r <= 3; r++) {
      const y = top + (bottom - top) * (r / 4) - 6, half = hw * (.3 + .7 * (y - top + 34) / (bottom - top + 34)) * .88;
      const count = Math.max(3, Math.round(half * 2 / 30)), w = half * 2 / count;
      for (let k = 0; k < count; k++) {
        const x = TREE_X - half + k * w + (rnd() - .5) * 5, yy = y + (rnd() - .5) * 6, out = (x + w / 2 - TREE_X) / hw;
        const lit = (1 - out) / 2 - (r === 1 ? .22 : 0) + (rnd() - .5) * .2, tone = lit > .55 ? 0 : lit > .28 ? 1 : 2;
        const ww = w + 6, sag = 9 + rnd() * 4, x0 = x - 3;
        tones[tone] += `M${f1(x0)},${f1(yy)}Q${f1(x0 + ww / 2)},${f1(yy + sag * 2)} ${f1(x0 + ww)},${f1(yy)}Q${f1(x0 + ww / 2)},${f1(yy + sag * .5)} ${f1(x0)},${f1(yy)}Z`;
        shade += `M${f1(x0 + 1)},${f1(yy + 3)}Q${f1(x0 + ww / 2 + 1)},${f1(yy + sag * 2 + 4)} ${f1(x0 + ww + 1)},${f1(yy + 3)}Q${f1(x0 + ww / 2)},${f1(yy + sag + 2)} ${f1(x0 + 1)},${f1(yy + 3)}Z`;
        for (let q = 1; q < 4; q++) {  // a few needles along the bottom of the crescent
          const t = q / 4, nx = x0 + ww * t, ny = yy + 2 * sag * t * (1 - t) * 2 * .98;
          fringe[tone] += `M${f1(nx)},${f1(ny - 1)}l${f1(out * 2 + (rnd() - .5) * 1.6)},${f1(3 + rnd() * 2.5)}`;
        }
      }
    }
    parts.push(`<path class="ndsh" d="${shade}"/>` + tones.map((d, t) => `<path class="nd${t + 1}" d="${d}"/><path class="nf${t + 1}" d="${fringe[t]}"/>`).join(""));
    parts.push(`<path class="rim" d="M${f1(TREE_X - hw)},${bottom}${edge}" stroke="url(#xrim)"/>`);
    // needle tips along the bottom edge, and snow resting on some branches
    let tips = "", snow = "";
    for (let j = 0; j < n * 3; j++) {
      const x = TREE_X - hw + rnd() * hw * 2, y = bottom - 2 + rnd() * 10;
      tips += `M${f1(x)},${f1(y)}l${f1((rnd() - .5) * 8)},${f1(4 + rnd() * 6)}`;
    }
    for (let j = 0; j < n; j += 2) {
      const xa = TREE_X - hw + j * step + step * .2;
      snow += `M${f1(xa)},${f1(bottom - 3)}q${f1(step * .3)},-6 ${f1(step * .6)},0`;
    }
    parts.push(`<path class="tips" d="${tips}"/><path class="branch-snow" d="${snow}"/>`);
  });
  // Tinsel: golden bead strands swagging across the tree
  [[140, 175], [215, 250], [290, 330], [370, 405], [450, 480]].forEach(([y1, y2], i) => {
    const l = i % 2 ? [TREE_X + treeHalfWidth(y1) - 10, y1] : [TREE_X - treeHalfWidth(y1) + 10, y1];
    const r = i % 2 ? [TREE_X - treeHalfWidth(y2) + 10, y2] : [TREE_X + treeHalfWidth(y2) - 10, y2];
    const d = `M${f1(l[0])},${l[1]}Q${TREE_X},${Math.max(y1, y2) + 34} ${f1(r[0])},${r[1]}`;
    parts.push(`<path class="beads-shade" d="${d}" transform="translate(.8,1.2)"/><path class="beads" d="${d}"/>`);
  });
  // Light strings: a dark wire with small bulbs, unlit (the night canvas lights them)
  let lightsSvg = "";
  [[110, 128], [180, 206], [255, 285], [330, 362], [405, 440], [480, 505]].forEach(([y1, y2], s) => {
    const x0 = TREE_X - treeHalfWidth(y1) + 4, x1 = TREE_X + treeHalfWidth(y2) - 4, cy = Math.max(y1, y2) + 26;
    lightsSvg += `<path class="light-wire" d="M${f1(x0)},${y1}Q${TREE_X},${cy} ${f1(x1)},${y2}"/>`;
    const count = 5 + s * 2;
    for (let i = 0; i < count; i++) {
      const [x, y] = quad(x0, y1, TREE_X, cy, x1, y2, (i + .5) / count), c = (s * 3 + i) % XMAS_LIGHTS.length;
      treeLights.push({ x, y: y + 3, c, n: treeLights.length, seed: rnd() * 100 });
      lightsSvg += `<ellipse cx="${f1(x)}" cy="${f1(y + 3)}" rx="2.6" ry="3.6" fill="${XMAS_LIGHTS[c][0]}"/>`;
    }
  });
  parts.push(lightsSvg);
  // Baubles at random spots inside the tree, not too close to each other nor to the sax
  const taken = [[SAX.x + 14, SAX.y + 22, 34]];
  for (let tries = 0, placed = 0; tries < 600 && placed < 26; tries++) {
    const y = 120 + rnd() * 390, x = TREE_X + (rnd() * 2 - 1) * (treeHalfWidth(y) - 16), r = 7 + rnd() * 5;
    if (taken.some(([tx, ty, tr]) => Math.hypot(tx - x, ty - y) < tr + r + 6)) continue;
    taken.push([x, y, r]);
    placed++;
    const c = (placed * 2 + ((rnd() * 2) | 0)) % BAUBLES.length;  // every colour about as often
    parts.push(`<g class="bauble"><ellipse cx="${f1(x + r * .45)}" cy="${f1(y + r * .75)}" rx="${f1(r * .95)}" ry="${f1(r * .45)}" class="bauble-shadow"/>` +
      `<path d="M${f1(x)},${f1(y - r - 9)}v6" class="hook"/><rect x="${f1(x - 2.6)}" y="${f1(y - r - 4)}" width="5.2" height="4.5" rx="1" fill="url(#xgold)"/>` +
      `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#xb${c})"/>` +
      `<ellipse cx="${f1(x - r * .38)}" cy="${f1(y - r * .42)}" rx="${f1(r * .3)}" ry="${f1(r * .2)}" transform="rotate(-35 ${f1(x - r * .38)} ${f1(y - r * .42)})" fill="rgba(255,255,255,.75)"/>` +
      `<path d="M${f1(x + r * .3)},${f1(y + r * .75)}a${f1(r)},${f1(r)} 0 0 0 ${f1(r * .5)},${f1(-r * .6)}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>` +
      (rnd() < .35 ? `<path d="M${f1(x - r)},${f1(y)}a${f1(r)},${f1(r * .35)} 0 0 0 ${f1(r * 2)},0" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.6"/>` : "") + `</g>`);
  }
  // Candy canes
  [[262, 300, -14], [372, 452, 12], [295, 392, 8]].forEach(([x, y, a]) => {
    const d = `M0,0v-20a7,7 0 0 1 14,0v3`;
    parts.push(`<g transform="translate(${x},${y}) rotate(${a})"><path d="${d}" class="cane"/><path d="${d}" class="cane-stripes"/></g>`);
  });
  defs.push(`<radialGradient id="xgiftfoot"><stop offset="0" stop-color="rgba(50,0,10,.5)"/><stop offset="1" stop-color="rgba(50,0,10,0)"/></radialGradient>`,
    `<linearGradient id="xgiftfloor" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,.25)"/></linearGradient>`,
    `<pattern id="xpdots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.3" fill="rgba(255,215,90,.75)"/><circle cx="7" cy="7" r="1.3" fill="rgba(255,215,90,.75)"/></pattern>`,
    `<pattern id="xpstripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="3" height="8" fill="rgba(255,255,255,.16)"/></pattern>`,
    `<pattern id="xpflakes" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M4,1v6M1,4h6M2,2l4,4M6,2l-4,4M11,8v5M8.5,10.5h5" stroke="rgba(255,255,255,.55)" stroke-width=".7"/></pattern>`);
  GIFTS.forEach(gift => parts.push(giftBox(gift)));  // the gifts (giftBox, above)
  defs.push(`<linearGradient id="xshade" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,255,255,.18)"/><stop offset=".6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,.25)"/></linearGradient>`);
  // Star on the top
  // Star on the top, cut in facets: each point is two triangles from the centre, the one facing the
  // light (top left) bright, the other in shade
  const starPts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27;
    return [TREE_X + Math.cos(a) * r, 30 + Math.sin(a) * r, a];
  });
  const star = starPts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ");
  let facets = "";
  starPts.forEach(([x, y, a], i) => {
    if (i % 2) return;
    [starPts[(i + 9) % 10], starPts[i + 1]].forEach(([ix, iy], k) => {
      // how much this facet faces the top left: its middle direction from the centre
      const mid = a + (k ? 1 : -1) * Math.PI / 10, lit = Math.cos(mid - Math.PI * 1.25);
      const fill = lit > .3 ? "#fff6c4" : lit > -.3 ? "#ffd04a" : "#c98a0c";
      facets += `<polygon points="${TREE_X},30 ${f1(x)},${f1(y)} ${f1(ix)},${f1(iy)}" fill="${fill}"/>`;
    });
  });
  parts.push(`<polygon points="${star}" fill="url(#xstar)"/>${facets}<polygon points="${star}" fill="none" stroke="#a8740a" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<circle cx="${TREE_X - 6}" cy="22" r="2.2" fill="rgba(255,255,255,.85)"/>`);
  return `<svg viewBox="0 0 ${TREE_W} ${TREE_H}" preserveAspectRatio="xMidYMax meet"><defs>${defs.join("")}</defs>${parts.join("")}</svg>`;
};
// The hidden sax, hanging on the right side of the tree like an ornament:
// golden body bent in a J, bell, neck and mouthpiece, a few keys, a ribbon loop to hang it.
const SAX = { x: 388, y: 306, w: 22, h: 38 };  // small: an ornament among others, to be found
const SAX_SVG = `<svg viewBox="0 0 30 52" aria-hidden="true"><path d="M15,0v6" stroke="#c8102e" stroke-width="1.6"/>` +
  `<path d="M6,9 11,6 14,10" fill="none" stroke="#b8860b" stroke-width="2.4" stroke-linecap="round"/>` +
  `<path d="M13,10C14,22 13,34 11,40 9,46 13,50 18,49 23,48 24,43 24,37" fill="none" stroke="url(#saxgold)" stroke-width="5.5" stroke-linecap="round"/>` +
  `<path d="M20.5,38 21,31 28,30 27.5,38Z" fill="url(#saxgold)" stroke="#8a5a08" stroke-width=".8"/>` +
  `<circle cx="13.6" cy="18" r="1.2" fill="#fff5c8"/><circle cx="13.6" cy="24" r="1.2" fill="#fff5c8"/><circle cx="13" cy="30" r="1.2" fill="#fff5c8"/>` +
  `<defs><linearGradient id="saxgold" x1="0" x2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#e3a923"/><stop offset="1" stop-color="#8a5a08"/></linearGradient></defs></svg>`;

// The hidden guitar, standing behind the green gift as if it were part of the pile: a red electric
// guitar twice the size of the old small one, its body half hidden by the gift (its left side and
// horn show beside it), its neck and headstock rising against the tree, the gifts' gold bow and a
// tag tied on the neck, and a soft shadow on the branches behind it. To pass behind the gift while staying in the layer
// above the page (to be clicked), it draws the green and yellow gifts again over itself, exactly
// where the tree draws them (giftBox, without their shadow on the skirt); only the guitar itself
// takes clicks (.gtr, css/christmas.css). Its bottom may be cut by the window: it still reads as a
// guitar. In the tree's coordinates, like the gifts.
const GUITAR = { x: 344, y: 390, w: 84, h: 178 };
const GUITAR_SHAPE = `M10.5,0H15.5L15,8H14.6V35C16,37 18,38 20,34 24,33 25,40 23,44 25,48 25,58 18,61 15,63 11,63 8,61 1,58 1,48 3,44 1,40 2,33 6,34 8,38 10,37 11.4,35V8H11Z`;
const GUITAR_AT = "translate(392,528) rotate(-9) scale(2) translate(-13,-63)";  // the bottom of its body at 392,528
const GUITAR_SVG = `<svg viewBox="${GUITAR.x} ${GUITAR.y} ${GUITAR.w} ${GUITAR.h}" aria-hidden="true"><defs>` +
  `<linearGradient id="guitarred" x1="0" x2="1"><stop offset="0" stop-color="#e8423a"/><stop offset=".45" stop-color="#a80f1d"/><stop offset="1" stop-color="#45000a"/></linearGradient></defs>` +
  // its shadow on the branches behind it, cast to the right (the light comes from the top left)
  `<g transform="translate(6,3)"><path transform="${GUITAR_AT}" d="${GUITAR_SHAPE}" fill="rgba(0,25,10,.3)"/></g>` +
  // the guitar, drawn upright (bottom of the body at 13,63)
  `<g class="gtr"><g transform="${GUITAR_AT}">` +
  `<path d="M10.5,0H15.5L15,8H11Z" fill="#1a1a1f"/><path d="M10,2h-1.6M10,5h-1.6M16,2h1.6M16,5h1.6" stroke="#cfcfcf" stroke-width="1.2"/>` +
  `<rect x="11.4" y="7" width="3.2" height="30" fill="#3b2412"/><rect x="11.4" y="7" width="1" height="30" fill="rgba(255,255,255,.15)"/>` +
  `<path d="M11.4,12h3.2M11.4,17h3.2M11.4,22h3.2M11.4,27h3.2M11.4,32h3.2" stroke="#c9b48a" stroke-width=".5"/>` +
  `<path d="M6,34C2,33 1,40 3,44 1,48 1,58 8,61 11,63 15,63 18,61 25,58 25,48 23,44 25,40 24,33 20,34 18,38 16,38 14.5,37H11.5C10,38 8,38 6,34Z" fill="url(#guitarred)" stroke="#3a0008" stroke-width=".8"/>` +
  `<path d="M4.5,40C3.5,44 3.5,50 5,54M3.4,35.5C4.5,34.5 5.5,35 6,36" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1" stroke-linecap="round"/>` +
  `<rect x="9.5" y="43" width="7" height="3" rx=".8" fill="#111"/><rect x="9.5" y="49" width="7" height="3" rx=".8" fill="#111"/><rect x="10" y="55" width="6" height="1.6" fill="#bbb"/>` +
  `<circle cx="19.5" cy="53" r="1.1" fill="#e3a923"/><circle cx="18" cy="57" r="1.1" fill="#e3a923"/>` +
  `<path d="M12,1V56M13,1V56M14,1V56" stroke="rgba(235,235,235,.6)" stroke-width=".3"/>` +
  // the gold bow tied on the neck, the same ribbon as the red gift's
  `<path d="M11,24.5h4.2" stroke="#ffd15c" stroke-width="2.2"/><path d="M11,25.3h4.2" stroke="#c9921c" stroke-width=".8"/>` + bow3d(13, 24.5, "#ffd15c", "#c9921c", .45) + `</g>` +
  // its tag, hanging straight down from the bow (where the bow is, once the guitar is tilted)
  giftTag(378, 452, -4) + `</g>` +
  // the gifts in front of it, drawn again over it
  GIFTS.filter(g => g[0] >= 380).map(g => giftBox(g, false)).join("") + `</svg>`;

// The hidden firefly jar, hanging under the garland at the top of the page like its baubles: the
// jar of the calm night (calm.js) wrapped as a present, a cork lid with the gifts' red bow, twine
// round the neck, its string going up into the fir, a gift tag, moss at the bottom and a firefly
// glowing inside, wandering behind the glass (CSS). It swings on its string (the jar's pendulum,
// below). Drawn in the coordinates it had on the skirt, the string added above it: the top of the
// string, where it swings from, is the top middle of the box (252, JAR.y).
const JAR = { x: 234, y: 478, w: 36, h: 70 };
const JAR_GLASS = "M245,513H259Q259,516 261.5,517.5Q263.5,519 263.5,522V542Q263.5,546.5 259,546.5H245Q240.5,546.5 240.5,542V522Q240.5,519 242.5,517.5Q245,516 245,513Z";
const JAR_SVG = `<svg viewBox="${JAR.x} ${JAR.y} ${JAR.w} ${JAR.h}" aria-hidden="true"><defs>` +
  `<radialGradient id="jarglow"><stop offset="0" stop-color="rgba(240,255,190,1)"/><stop offset=".3" stop-color="rgba(205,255,140,.6)"/><stop offset="1" stop-color="rgba(170,255,120,0)"/></radialGradient>` +
  `<linearGradient id="jarglass" x1="0" x2="1"><stop offset="0" stop-color="rgba(210,230,255,.34)"/><stop offset=".3" stop-color="rgba(210,230,255,.1)"/><stop offset=".75" stop-color="rgba(210,230,255,.06)"/><stop offset="1" stop-color="rgba(210,230,255,.3)"/></linearGradient>` +
  `<linearGradient id="jarcork" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49a64"/><stop offset="1" stop-color="#7a5430"/></linearGradient>` +
  `<clipPath id="jarclip"><path d="${JAR_GLASS}"/></clipPath></defs>` +
  // the string, from the fir down to the twine, knotted round the lid
  `<path d="M252,${JAR.y}V508.5" stroke="#b8935a" stroke-width=".9"/><path d="M252,${JAR.y}V508.5" stroke="rgba(255,255,255,.35)" stroke-width=".3" transform="translate(-.3,0)"/>` +
  `<circle class="halo" cx="252" cy="529" r="22" fill="url(#jarglow)"/>` +  // at night, its light around the jar
  `<path d="${JAR_GLASS}" fill="url(#jarglass)"/>` +
  // inside the glass: moss and a twig at the bottom, the firefly (its light, then its body)
  `<g clip-path="url(#jarclip)"><path d="M240,547C242,540 246,543 248,540 250,543 254,539 256,542 259,539 262,542 264,540V547Z" fill="#2f6b34"/>` +
  `<path d="M243,543L258,533M252,537l3,-6" stroke="#5a3a1c" stroke-width="1.1" stroke-linecap="round" fill="none"/>` +
  `<g class="fly"><circle class="glow" cx="252" cy="529" r="9" fill="url(#jarglow)"/>` +
  `<ellipse cx="251.2" cy="528.4" rx="1.3" ry=".8" fill="#2a2a22"/><circle cx="252.6" cy="529.1" r="1.1" fill="#f6ffd0"/>` +
  `<path d="M250.6,527.6l-1.6,-1.4M251.6,527.6l1.2,-1.6" stroke="rgba(220,235,255,.7)" stroke-width=".5"/></g></g>` +
  // the glass: its outline and the reflections of the light from the left
  `<path d="${JAR_GLASS}" fill="none" stroke="rgba(225,240,255,.75)" stroke-width=".8"/>` +
  // its round shape: the thick glass of the bottom and the rim of the neck seen as ellipses
  `<path d="M241.5,543.5Q252,548.5 262.5,543.5" fill="none" stroke="rgba(235,245,255,.6)" stroke-width="1.4"/>` +
  `<ellipse cx="252" cy="513.4" rx="7.2" ry="1.3" fill="none" stroke="rgba(235,245,255,.6)" stroke-width=".6"/>` +
  `<path d="M243.2,522V541" stroke="rgba(255,255,255,.7)" stroke-width="1.3" stroke-linecap="round"/><path d="M261,524V532" stroke="rgba(255,255,255,.35)" stroke-width=".8" stroke-linecap="round"/>` +
  // twine round the neck, the cork lid, and the red bow that makes it a present
  `<path d="M244.6,514.5H259.4" stroke="#c9a86a" stroke-width="1.4"/><rect x="243.5" y="508" width="17" height="5.5" rx="1.2" fill="url(#jarcork)"/>` +
  `<rect x="243.5" y="508" width="17" height="1.4" rx=".7" fill="rgba(255,255,255,.25)"/>` +
  `<path d="M252,508v5.5" stroke="#c8102e" stroke-width="2.4"/>` + bow3d(252, 508.5, "#c8102e", "#7e0a1d", .62) +
  giftTag(244.5, 515, 12) + `</svg>`;

const scene = document.createElement("div"), tree = document.createElement("div"), treeFront = document.createElement("div");
scene.id = "xscene";
scene.setAttribute("aria-hidden", "true");
tree.id = "xtree";
treeFront.id = "xtree-front";
// Mountains filling the background, kept discreet (colours close to the sky's): three ranges, the
// farther ones higher and paler, each ridge made natural by midpoint displacement between a few
// chosen peaks, with snow on the tops (the range itself clips a jagged snow line), then the snowy
// ground. At night, small yellow chalet lights, soft as if seen through cold air, dot the
// slopes: a few hamlets and lone ones, smaller and dimmer on the far ranges, drawn with their own
// range so the nearer ranges hide them (CSS shows them at night only, some flickering slowly).
// The softness is in their gradients, not in blur filters: a flickering light is redrawn on every
// frame, and a blur would run again each time.
// Drawn once in a 1600 x 700 box, scaled to cover the bottom of the window. ridges keeps each
// range's outline (y at a given x).
const ridges = [];
const MOUNTAINS = (() => {
  const rnd = seeded(77), W = 1600, H = 700;
  const ridge = (peaks, rough) => {  // peaks: [x, y] control points, rough: displacement amplitude
    let pts = peaks;
    for (let level = 0, amp = rough; level < 6; level++, amp *= .55) {
      const next = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        next.push([(x0 + x1) / 2, (y0 + y1) / 2 + (rnd() - .5) * amp], [x1, y1]);
      }
      pts = next;
    }
    return pts;
  };
  const yAt = (pts, x) => {
    const i = Math.max(1, pts.findIndex(([px]) => px >= x));
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + (y1 - y0) * ((x - x0) / ((x1 - x0) || 1));
  };
  const RANGES = [
    ["m0", [[0, 300], [180, 170], [330, 250], [520, 95], [700, 230], [860, 130], [1040, 210], [1230, 70], [1420, 200], [1600, 140]], 70, 70],
    ["m1", [[0, 360], [150, 300], [300, 380], [470, 250], [640, 360], [820, 270], [1000, 390], [1160, 280], [1350, 370], [1600, 290]], 60, 55],
    ["m2", [[0, 470], [200, 420], [380, 480], [560, 430], [760, 500], [960, 440], [1180, 505], [1380, 445], [1600, 480]], 40, 0],
  ];
  let svg = `<svg class="mountains" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>` +
    // the glow around a window, and the window itself with a soft edge
    `<radialGradient id="xchalet"><stop offset="0" stop-color="rgba(255,205,40,.75)"/><stop offset=".4" stop-color="rgba(255,190,30,.32)"/><stop offset="1" stop-color="rgba(255,190,30,0)"/></radialGradient>` +
    `<radialGradient id="xchaletcore"><stop offset=".45" stop-color="#ffd23a"/><stop offset="1" stop-color="rgba(255,210,58,0)"/></radialGradient>`;
  const bodies = RANGES.map(([cls, peaks, rough, snowDepth], i) => {
    const pts = ridge(peaks, rough);
    ridges.push({ cls, pts, y: x => yAt(pts, x) });
    const d = `M${pts.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")} ${W},${H}H0Z`;
    svg += `<clipPath id="xclip${i}"><path d="${d}"/></clipPath>`;
    let snow = "";
    if (snowDepth) {  // jagged snow line, running a little below the tops
      const top = Math.min(...pts.map(([, y]) => y));
      const line = Array.from({ length: 81 }, (_, k) => {
        const x = k * W / 80, y = Math.max(top + snowDepth * .6, yAt(pts, x) + snowDepth * (.5 + rnd() * .6));
        return `${f1(x)},${f1(y)}`;
      });
      snow = `<path class="caps ${cls}c" clip-path="url(#xclip${i})" d="M0,0 ${line.join(" ")} ${W},0Z"/>`;
    }
    // chalets: hamlets of 2 to 5 lights, and lone ones, below the snow line and above the ground
    const far = 1 - i * .35, lights = [];
    for (let h = 0; h < 6 + i * 2; h++) {
      const x0 = 20 + rnd() * (W - 40), n = rnd() < .4 ? 1 : 2 + ((rnd() * 4) | 0);
      for (let k = 0; k < n; k++) {
        const x = Math.min(W - 5, Math.max(5, x0 + (rnd() - .5) * 40)), y = yAt(pts, x) + 30 + snowDepth * .8 + rnd() * (90 - i * 25);
        if (y > 630) continue;
        const r = (1.6 + rnd() * .9) * (1.4 - far * .5);
        // dimmed with fill-opacity (inherited), so that the flicker can animate the group's opacity
        lights.push(`<g class="chalet${rnd() < .3 ? " flicker" : ""}" style="--d:${f1(-rnd() * 6)}s;fill-opacity:${f1(.6 + (1 - far) * .4)}">` +
          `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 5.5)}" fill="url(#xchalet)"/>` +
          `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.8)}" fill="url(#xchaletcore)"/></g>`);
      }
    }
    return `<path class="${cls}" d="${d}"/>${snow}<g class="chalets">${lights.join("")}</g>`;
  });
  return svg + `</defs>${bodies.join("")}` +
    `<path class="ground-shade" d="M0,662C200,636 380,652 560,646S900,632 1100,648 1450,638 1600,646V700H0Z"/>` +
    `<path class="ground" d="M0,670C220,646 400,662 580,656S920,644 1120,658 1460,648 1600,656V700H0Z"/></svg>`;
})();
// The moon (night only, CSS), as we see it from here: a full moon with its dark seas (Oceanus
// Procellarum, the Mare Imbrium, Serenitatis, Tranquillitatis, Crisium, Fecunditatis, Nectaris,
// Nubium, Humorum, Frigoris) softly blurred, the bright craters Tycho (with its rays), Copernicus
// and Kepler, dark Plato, a scatter of small craters, and a darker rim (limb darkening).
const MOON = (() => {
  const rnd = seeded(5);
  const seas = [
    "M-44,-14C-46,0-42,18-30,28-24,30-18,24-16,14-14,6-18,-2-14,-10-16,-20-24,-28-34,-26-40,-22-42,-18-44,-14Z",  // Oceanus Procellarum
    "M-28,-22C-28,-32-16,-36-6,-32 2,-28 2,-18-4,-12-10,-8-22,-10-28,-22Z",  // Imbrium
    "M0,-26C2,-32 12,-32 15,-25 16,-18 10,-14 4,-15-1,-17-2,-22 0,-26Z",  // Serenitatis
    "M6,-12C10,-16 22,-14 25,-6 27,2 20,6 13,4 6,2 2,-6 6,-12Z",  // Tranquillitatis
    "M30,-18C34,-21 41,-19 41,-13 41,-8 35,-6 31,-8 28,-10 27,-15 30,-18Z",  // Crisium
    "M24,0C28,-2 34,1 34,7 33,13 26,14 23,10 21,6 21,2 24,0Z",  // Fecunditatis
    "M14,10C17,8 22,10 21,15 20,19 15,19 13,16 12,13 12,11 14,10Z",  // Nectaris
    "M-20,14C-14,10-4,12-2,19-1,26-8,30-16,28-22,26-24,18-20,14Z",  // Nubium
    "M-34,14C-31,11-25,12-25,17-25,22-31,23-34,20-36,18-36,16-34,14Z",  // Humorum
    "M-30,-36C-16,-41 12,-41 26,-35 24,-32 10,-34-2,-34-14,-34-24,-32-30,-36Z",  // Frigoris
  ];
  const small = Array.from({ length: 26 }, () => {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 44, r = .8 + rnd() * 1.6;
    return `<circle cx="${f1(Math.cos(a) * d)}" cy="${f1(Math.sin(a) * d)}" r="${f1(r)}"/>`;
  }).join("");
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = i / 12 * Math.PI * 2 + rnd() * .3, l = 12 + rnd() * 22;
    return `M-6,36l${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)}`;
  }).join("");
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><defs>` +
    `<radialGradient id="moon-disc" cx=".45" cy=".42" r=".6"><stop offset="0" stop-color="#fffbea"/><stop offset=".7" stop-color="#f4ecd2"/><stop offset="1" stop-color="#d8cca8"/></radialGradient>` +
    `<clipPath id="moon-clip"><circle r="49"/></clipPath><filter id="moon-soft"><feGaussianBlur stdDeviation="1"/></filter></defs>` +
    `<circle r="49" fill="url(#moon-disc)"/><g clip-path="url(#moon-clip)">` +
    `<g fill="#a99f86" opacity=".5" filter="url(#moon-soft)">${seas.map(d => `<path d="${d}"/>`).join("")}</g>` +
    `<path d="${rays}" stroke="rgba(255,255,245,.35)" stroke-width=".9" fill="none" stroke-linecap="round"/>` +
    `<g fill="rgba(140,130,110,.25)" stroke="rgba(255,255,245,.35)" stroke-width=".5">${small}</g>` +
    `<circle cx="-6" cy="36" r="2.2" fill="#fffef6"/><circle cx="-18" cy="-4" r="2.6" fill="#fdf8e6" stroke="#cfc5a6" stroke-width=".5"/>` +
    `<circle cx="-30" cy="-4" r="1.6" fill="#fdf8e6"/><ellipse cx="-6" cy="-37" rx="2.6" ry="1.6" fill="#8e8670"/>` +
    `<circle r="49" fill="none" stroke="rgba(150,135,100,.25)" stroke-width="3"/></g></svg>`;
})();
const moon = document.createElement("div");
moon.id = "xmoon";
moon.innerHTML = MOON;

// The snowman: a big companion standing in the left margin, beside the columns of courses, seen in
// three-quarter view, face turned to the right as if about to look at the courses. Drawn in a
// 300 x 520 box, lit from the top left: lumpy hand-packed snowballs (wobbly outlines) shaded round,
// a grainy snow texture, contact shadows and a snowdrift at its base, irregular lumps of coal, a
// carrot seen in perspective, a battered top hat tilted back with snow on the brim, a knitted scarf
// with one end blowing behind, tapering branches for arms. It blinks, now and then turns its face
// a little more towards the courses, and waves with the arm on that side (CSS). Its hat, nose,
// brows, cheeks, steam and fishing rod are parts of their own for its games (snowman.js).
// His carrot nose, also drawn on its own when it is taken from him (snowman.js)
const SNOWMAN_NOSE = `<path d="M178,147C192,145 220,150 244,160 222,163 196,162 179,158 175,155 175,149 178,147Z" fill="url(#sm-carrot)"/>` +
  `<path d="M186,148q2,6 0,11M198,149q2,5 0,10M210,152q1.5,4 0,8M222,155q1,3 0,6" stroke="#a5470a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
const SNOWMAN = (() => {
  const rnd = seeded(31);
  // closed wobbly outline through n points around an ellipse, smoothed (Catmull-Rom to Bezier)
  const lump = (cx, cy, rx, ry, amp) => {
    const n = 22, pts = Array.from({ length: n }, (_, i) => {
      const a = i / n * Math.PI * 2, k = 1 + (rnd() - .5) * amp;
      return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
    });
    let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const [p0, p1, p2, p3] = [pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)},${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)},${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])},${f1(p2[1])}`;
    }
    return d + "Z";
  };
  // an irregular lump of coal, with a glint
  const coal = (x, y, r) => {
    const pts = Array.from({ length: 7 }, (_, i) => {
      const a = i / 7 * Math.PI * 2, k = r * (.75 + rnd() * .45);
      return `${f1(x + Math.cos(a) * k)},${f1(y + Math.sin(a) * k * .9)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="url(#sm-coal)"/><circle cx="${f1(x - r * .3)}" cy="${f1(y - r * .35)}" r="${f1(r * .22)}" fill="rgba(255,255,255,.6)"/>`;
  };
  // a branch tapering from its base: the same line stroked thinner and thinner, each a bit shorter
  const branch = (x0, y0, x1, y1, w) => [1, .75, .5].map((f, i) => {
    const xe = x0 + (x1 - x0) * (1 - i * .08), ye = y0 + (y1 - y0) * (1 - i * .08);
    return `<path d="M${x0},${y0}L${f1(xe)},${f1(ye)}" stroke-width="${f1(w * f)}"/>`;
  }).join("");
  const BOTTOM = lump(150, 412, 100, 86, .07), MIDDLE = lump(156, 264, 70, 64, .08), HEAD = lump(164, 152, 50, 47, .07);
  const ball = d => `<path d="${d}" fill="url(#sm-snow)"/><path d="${d}" fill="url(#sm-under)"/><path d="${d}" fill="#fff" filter="url(#sm-grain)" opacity=".55"/>`;
  return `<svg viewBox="0 0 300 520" aria-hidden="true"><defs>` +
    `<radialGradient id="sm-snow" cx=".33" cy=".27" r=".8"><stop class="k1" offset="0"/><stop class="k2" offset=".42"/><stop class="k3" offset=".8"/><stop class="k4" offset="1"/></radialGradient>` +
    `<linearGradient id="sm-under" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="rgba(50,75,120,0)"/><stop offset="1" stop-color="rgba(50,75,120,.28)"/></linearGradient>` +
    `<filter id="sm-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="4"/>` +
    `<feColorMatrix values="0 0 0 0 .45  0 0 0 0 .55  0 0 0 0 .72  0 0 0 -2.2 1.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>` +
    `<radialGradient id="sm-contact"><stop offset="0" stop-color="rgba(55,80,125,.5)"/><stop offset="1" stop-color="rgba(55,80,125,0)"/></radialGradient>` +
    `<radialGradient id="sm-ground"><stop offset="0" stop-color="rgba(30,50,90,.4)"/><stop offset="1" stop-color="rgba(30,50,90,0)"/></radialGradient>` +
    `<linearGradient id="sm-drift" x1="0" y1="0" x2="0" y2="1"><stop class="k1" offset="0"/><stop class="k3" offset="1"/></linearGradient>` +
    `<radialGradient id="sm-coal" cx=".35" cy=".3"><stop offset="0" stop-color="#5d5d66"/><stop offset=".55" stop-color="#1e1e25"/><stop offset="1" stop-color="#08080b"/></radialGradient>` +
    `<linearGradient id="sm-carrot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb867"/><stop offset=".45" stop-color="#ee7d18"/><stop offset="1" stop-color="#a8480a"/></linearGradient>` +
    `<linearGradient id="sm-hat" x1="0" x2="1"><stop offset="0" stop-color="#4a4a5a"/><stop offset=".25" stop-color="#2c2c38"/><stop offset=".7" stop-color="#121218"/><stop offset="1" stop-color="#262630"/></linearGradient>` +
    `<linearGradient id="sm-scarf" x1="0" x2="1"><stop offset="0" stop-color="#e8475d"/><stop offset=".5" stop-color="#b3122e"/><stop offset="1" stop-color="#650614"/></linearGradient>` +
    `<pattern id="sm-knit" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><path d="M0,0 3,6 6,0" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.2"/></pattern>` +
    `</defs><ellipse cx="160" cy="500" rx="135" ry="20" fill="url(#sm-ground)"/>` +
    // far arm and the scarf end blowing behind, both behind the body
    `<g class="twig">${branch(100, 252, 40, 196, 7)}${branch(62, 216, 40, 186, 3.5)}${branch(52, 206, 22, 200, 3)}</g>` +
    `<path d="M112,206C92,214 72,228 50,236 58,226 54,220 46,222 66,210 86,200 110,196Z" fill="url(#sm-scarf)"/><path d="M112,206C92,214 72,228 50,236 58,226 54,220 46,222 66,210 86,200 110,196Z" fill="url(#sm-knit)"/>` +
    ball(BOTTOM) + `<ellipse cx="154" cy="327" rx="60" ry="12" fill="url(#sm-contact)"/>` +
    ball(MIDDLE) + `<ellipse cx="160" cy="198" rx="42" ry="9" fill="url(#sm-contact)"/>` +
    // buttons, following the curve of the body turned to the right
    coal(178, 240, 6.5) + coal(181, 268, 7) + coal(179, 297, 7) + coal(184, 392, 8) +
    // snowdrift piled around the base
    `<path d="M20,505C40,470 80,476 100,486 130,474 180,476 210,486 240,474 270,480 285,505Z" fill="url(#sm-drift)"/>` +
    `<g class="headball">${ball(HEAD)}<g class="face"><g class="eyes"><ellipse cx="166" cy="140" rx="5.5" ry="6.5" fill="url(#sm-coal)"/><ellipse cx="190" cy="138" rx="4.2" ry="6" fill="url(#sm-coal)"/>` +
    `<circle cx="164.5" cy="137.5" r="1.4" fill="rgba(255,255,255,.7)"/><circle cx="188.8" cy="135.8" r="1.1" fill="rgba(255,255,255,.7)"/></g>` +
    [[160, 170, 3.2], [168, 175, 3.3], [177, 177, 3.3], [186, 175, 3], [193, 170, 2.6]].map(([x, y, r]) => coal(x, y, r)).join("") +
    `<g class="nose">${SNOWMAN_NOSE}</g>` +
    // when cross (snowman.js): frowning brows, red cheeks
    `<g class="brows"><path d="M156,126 172,133M184,131 199,123" stroke="#1e1e25" stroke-width="3.6" stroke-linecap="round"/></g>` +
    `<g class="blush"><ellipse cx="154" cy="160" rx="8" ry="4.5"/><ellipse cx="200" cy="158" rx="6" ry="4"/></g></g>` +
    // battered top hat tilted back, snow on the brim, red band with holly
    `<g class="hat"><g transform="rotate(-9 164 104)"><ellipse cx="164" cy="106" rx="62" ry="14" fill="#16161d"/><ellipse cx="164" cy="104" rx="60" ry="12" fill="#25252f"/>` +
    `<path d="M126,104C125,80 127,56 129,36 150,30 180,30 201,36 202,58 203,82 202,104 188,111 140,111 126,104Z" fill="url(#sm-hat)"/>` +
    `<ellipse cx="165" cy="36" rx="36" ry="7.5" fill="#3a3a48"/><path d="M146,40c4,8 6,16 4,26" stroke="rgba(255,255,255,.08)" stroke-width="3" fill="none"/>` +
    `<path d="M126,86C140,92 188,92 202,86L202,100C188,107 140,107 126,100Z" fill="#a30d26"/>` +
    `<path d="M190,94c-6,-10 -16,-8 -20,-12 4,6 0,10 6,12 -4,2 0,6 -2,10 6,-4 10,-2 16,-10Z" fill="#1f7a3e"/><circle cx="190" cy="94" r="3.4" fill="#d6203a"/><circle cx="196" cy="90" r="3.2" fill="#c8102e"/>` +
    `<path d="M106,104c6,-6 14,-5 20,-2 6,-4 14,-3 18,1M190,100c6,-5 14,-5 20,0" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".9"/></g></g>` +
    // steam puffing out from under the hat when he is about to lose it
    `<g class="steam"><circle cx="122" cy="96" r="7"/><circle cx="206" cy="94" r="6"/><circle cx="118" cy="84" r="5"/></g></g>` +
    // scarf around the neck, knotted on the right, its end hanging down the front
    `<path d="M108,196C122,214 196,216 212,196L215,212C198,232 120,232 104,212Z" fill="url(#sm-scarf)"/><path d="M108,196C122,214 196,216 212,196L215,212C198,232 120,232 104,212Z" fill="url(#sm-knit)"/>` +
    `<ellipse cx="196" cy="216" rx="11" ry="9" fill="#9b0d22"/>` +
    `<path d="M188,222C186,246 190,270 196,292L216,288C210,266 206,244 204,220Z" fill="url(#sm-scarf)"/><path d="M188,222C186,246 190,270 196,292L216,288C210,266 206,244 204,220Z" fill="url(#sm-knit)"/>` +
    `<path d="M190,244 207,242M192,264 210,262" stroke="rgba(255,255,255,.4)" stroke-width="4"/>` +
    `<path d="M197,292v9M201,291v11M205,290v9M209,290v10M213,289v8" stroke="#b3122e" stroke-width="2.2" stroke-linecap="round"/>` +
    // near arm, towards the courses: the one that waves
    `<g class="wave"><g class="twig">${branch(218, 258, 274, 212, 7)}${branch(250, 232, 280, 224, 3.5)}${branch(262, 222, 262, 194, 3)}</g>` +
    // the fishing rod he takes out to get his nose back from afar (snowman.js), its tip at 334,104
    `<g class="rod"><path d="M262,226 334,104" stroke="#3b2414" stroke-width="3.4" stroke-linecap="round"/><path d="M300,162 334,104" stroke="#6b4423" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="276" cy="212" r="6" fill="#8a8f99" stroke="#3a3d44" stroke-width="1.5"/><path d="M276,212l5,-3" stroke="#3a3d44" stroke-width="1.5"/></g></g></svg>`;
})();
const snowman = document.createElement("div");
snowman.id = "xsnowman";
snowman.innerHTML = SNOWMAN;

const treeCanvas = document.createElement("canvas"), tctx = treeCanvas.getContext("2d");
let treeBuilt = false;
const saxBtn = document.createElement("button");
saxBtn.id = "xsax";
saxBtn.type = "button";
saxBtn.title = "A sax among the ornaments?";
saxBtn.setAttribute("aria-label", "Go to the jazz bar");
saxBtn.innerHTML = SAX_SVG;
// Always in the tree, even where the tree is behind the cards (narrow screens): its layer is above
// the page, so it stays clickable there, over the cards
saxBtn.style.cssText = `left:${SAX.x / TREE_W * 100}%;top:${SAX.y / TREE_H * 100}%;width:${SAX.w / TREE_W * 100}%;height:${SAX.h / TREE_H * 100}%`;
treeFront.append(saxBtn);
saxBtn.addEventListener("click", e => {
  e.stopPropagation();
  xmasJazz = document.body.dataset.phase;  // the Christmas screen it replaces
  applyScreen();
});
// The guitar, in the same layer: the metal show takes over for one song (metal.js, loaded after
// this file, so startMetalEgg exists by the time it is clicked), then Christmas comes back
const guitarBtn = document.createElement("button");
guitarBtn.id = "xguitar";
guitarBtn.type = "button";
guitarBtn.title = "Who left a guitar under the tree?";
guitarBtn.setAttribute("aria-label", "Go to the metal show");
guitarBtn.innerHTML = GUITAR_SVG;
guitarBtn.style.cssText = `left:${GUITAR.x / TREE_W * 100}%;top:${GUITAR.y / TREE_H * 100}%;width:${GUITAR.w / TREE_W * 100}%;height:${GUITAR.h / TREE_H * 100}%`;
treeFront.append(guitarBtn);
guitarBtn.addEventListener("click", e => {
  e.stopPropagation();
  startMetalEgg("Santa brought a guitar.");
});
// The firefly jar, hanging under the garland (placed by placeJar, below): it opens the calm night,
// as the peace code does (startPeace, calm.js, loaded after this file); the fir there, or typing
// peace, brings Christmas back
const jarBtn = document.createElement("button");
jarBtn.id = "xjar";
jarBtn.type = "button";
jarBtn.title = "A firefly in a jar?";
jarBtn.setAttribute("aria-label", "Go to the calm night");
jarBtn.innerHTML = JAR_SVG;
jarBtn.addEventListener("click", e => {
  e.stopPropagation();
  startPeace(true);
});

// Tree lights at night, on a canvas over the tree (behind the page, unlike the effects canvas):
// each light is a pre-drawn glow, its brightness and colour given by the current pattern. The
// pattern changes every 12 s (twinkle, chase, wave, colour cycle, sparkle), fading from one to the
// next; the star glows and its rays turn slowly. The loop only runs at night, while on screen.
const LIGHT_GLOWS = XMAS_LIGHTS.map(([, , rgb]) => blob(...rgb.split(",").map(Number), .9));
const CORE = blob(255, 255, 240, 1), STAR_GLOW = blob(255, 214, 110, .8);
const RAYS = (() => {
  const s = document.createElement("canvas"), c = s.getContext("2d");
  s.width = s.height = 160;
  c.translate(80, 80);
  for (let i = 0; i < 12; i++) {
    c.rotate(Math.PI / 6);
    const g = c.createLinearGradient(0, 0, 0, -80);
    g.addColorStop(0, "rgba(255,230,150,.55)"); g.addColorStop(1, "rgba(255,230,150,0)");
    c.fillStyle = g;
    c.beginPath(); c.moveTo(-(i % 2 ? 2 : 4), 0); c.lineTo(0, i % 2 ? -55 : -80); c.lineTo(i % 2 ? 2 : 4, 0); c.fill();
  }
  return s;
})();
const PATTERNS = [
  (l, t) => [.55 + .45 * Math.sin(t * 2.3 + l.seed), l.c],                                        // twinkle
  (l, t) => [Math.max(.12, Math.sin(l.n * .45 - t * 4.5)) ** 3, l.c],                              // chase along the strings
  (l, t) => [.15 + .85 * ((Math.sin(l.y * .028 - t * 2.6) + 1) / 2) ** 2, l.c],                   // wave falling down the tree
  (l, t) => [1, (l.c + Math.floor(t * 1.6 + l.y * .01)) % XMAS_LIGHTS.length],                    // colours rolling down
  (l, t) => [.3 + .7 * Math.max(0, Math.sin(t * 7 + l.seed * 13)) ** 12, l.c],                    // sparkle
];
let treeRaf = null, treeT = 0, treeLast = 0, treeScale = 1;
const treeResize = () => {
  const r = tree.getBoundingClientRect();
  treeCanvas.width = Math.round(r.width); treeCanvas.height = Math.round(r.height);
  // the SVG keeps its proportions, bottom-aligned and centred in the box (xMidYMax meet)
  treeScale = Math.min(r.width / TREE_W, r.height / TREE_H);
  treeCanvas.ox = (r.width - TREE_W * treeScale) / 2;
  treeCanvas.oy = r.height - TREE_H * treeScale;
};
// The same loop paints the garland's halos (paintGarlandGlow), at 30 frames a second: plenty for
// lights that fade and twinkle, and half the drawing of a 60 Hz screen (a quarter at 120 Hz).
const treeFrame = now => {
  treeRaf = requestAnimationFrame(treeFrame);
  if (now - treeLast < 30) return;
  // never backwards: the first frame's time can be a little before the performance.now() of its
  // start, and a negative time would pick a pattern that does not exist
  treeT += Math.max(0, Math.min(.05, (now - treeLast) / 1000));
  treeLast = now;
  const c = tctx, s = treeScale, idx = Math.floor(treeT / 12), fade = Math.min(1, (treeT % 12) / 1.2);
  const cur = PATTERNS[idx % PATTERNS.length], prev = PATTERNS[(idx + PATTERNS.length - 1) % PATTERNS.length];
  c.clearRect(0, 0, treeCanvas.width, treeCanvas.height);
  c.save();
  c.translate(treeCanvas.ox, treeCanvas.oy);
  c.globalCompositeOperation = "lighter";
  // the star: turning rays and a breathing glow
  c.save();
  c.translate(TREE_X * s, 30 * s);
  c.rotate(treeT * .25);
  c.globalAlpha = .75 + .25 * Math.sin(treeT * 1.7);
  c.drawImage(RAYS, -80 * s, -80 * s, 160 * s, 160 * s);
  c.restore();
  c.globalAlpha = .8 + .2 * Math.sin(treeT * 2.1);
  c.drawImage(STAR_GLOW, (TREE_X - 55) * s, (30 - 55) * s, 110 * s, 110 * s);
  for (const l of treeLights) {
    const [b1, c1] = cur(l, treeT), [b0, c0] = prev(l, treeT);
    const glow = 15 * s;
    // fading between two patterns: the old one dims while the new one brightens
    for (const [b, col] of fade < 1 ? [[b0 * (1 - fade), c0], [b1 * fade, c1]] : [[b1, c1]]) {
      if (b <= .02) continue;
      c.globalAlpha = Math.min(1, b);
      c.drawImage(LIGHT_GLOWS[col], (l.x * s) - glow, (l.y * s) - glow, glow * 2, glow * 2);
      c.drawImage(CORE, (l.x - 3) * s, (l.y - 3) * s, 6 * s, 6 * s);
    }
  }
  c.restore();
  paintGarlandGlow(treeT);
};
const setTreeLights = on => {
  cancelAnimationFrame(treeRaf);
  treeRaf = null;
  removeEventListener("resize", treeResize);
  treeCanvas.remove();
  if (!on) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { paintGarlandGlow(null); return; }
  tree.append(treeCanvas);
  treeResize();
  addEventListener("resize", treeResize);
  treeLast = performance.now();
  treeRaf = requestAnimationFrame(treeFrame);
};

// Snow on the effects canvas (fx.js, mode "christmas"): soft round flakes of a few sizes and, one in
// ten, a six-armed crystal turning as it falls. They drift with a slow changing wind, sway, and
// move aside around the mouse. By day each flake has a faint blue rim, so it shows on the pale sky.
const crystal = day => {
  const s = document.createElement("canvas"), c = s.getContext("2d");
  s.width = s.height = 48;
  c.translate(24, 24);
  c.lineCap = "round";
  for (const [w, color] of day ? [[3.4, "rgba(110,145,190,.55)"], [1.6, "#fff"]] : [[1.8, "rgba(255,255,255,.95)"]]) {
    c.lineWidth = w; c.strokeStyle = color;
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate(i * Math.PI / 3);
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(0, -20);
      c.moveTo(0, -8); c.lineTo(-5, -13); c.moveTo(0, -8); c.lineTo(5, -13);
      c.moveTo(0, -14); c.lineTo(-3.5, -17.5); c.moveTo(0, -14); c.lineTo(3.5, -17.5);
      c.stroke();
      c.restore();
    }
  }
  return s;
};
const dayFlake = (() => {
  const s = document.createElement("canvas"), c = s.getContext("2d");
  s.width = s.height = 32;
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.45, "rgba(255,255,255,.95)");
  g.addColorStop(.62, "rgba(120,150,195,.45)"); g.addColorStop(1, "rgba(120,150,195,0)");
  c.fillStyle = g; c.fillRect(0, 0, 32, 32);
  return s;
})();
const FLAKES = { night: [blob(255, 255, 255, .95), crystal(false)], day: [dayFlake, crystal(true)] };
const flakes = [];
let snowWind = 0, snowT = 0, snowMouseX = -1e4, snowMouseY = -1e4;
addEventListener("pointermove", e => { snowMouseX = e.clientX; snowMouseY = e.clientY; });
const newFlake = top => {
  const r = Math.random(), big = Math.random() < .1;
  return { x: Math.random() * fxW, y: top ? -20 : Math.random() * fxH, r: big ? 7 + Math.random() * 6 : 1.2 + r * r * 3.8, crystal: big,
    vy: big ? 28 + Math.random() * 20 : 22 + r * 50, sway: 10 + Math.random() * 25, phase: Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * 1.2 };
};
fxLayers.push({
  mode: "christmas",
  update(dt) {
    snowT += dt;
    snowWind = Math.sin(snowT * .13) * 22 + Math.sin(snowT * .37) * 10;
    const want = Math.min(320, Math.round(fxW * fxH / 7000));
    while (flakes.length < want) flakes.push(newFlake(flakes.w === fxW));
    flakes.length = Math.min(flakes.length, want);
    flakes.w = fxW;
    for (const f of flakes) {
      f.y += f.vy * dt;
      f.x += (snowWind * (.4 + f.r / 8) + Math.cos(snowT * .9 + f.phase) * f.sway) * dt;
      f.rot += f.vr * dt;
      const dx = f.x - snowMouseX, dy = f.y - snowMouseY, d2 = dx * dx + dy * dy;
      if (d2 < 6400 && d2 > 0) { const d = Math.sqrt(d2); f.x += dx / d * (80 - d) * .05; f.y += dy / d * (80 - d) * .02; }  // within 80 px
      if (f.y > fxH + 20) Object.assign(f, newFlake(true));
      if (f.x < -20) f.x += fxW + 40; else if (f.x > fxW + 20) f.x -= fxW + 40;
    }
  },
  draw(c) {
    const [dot, star] = FLAKES[document.body.dataset.phase === "christmas" ? "day" : "night"];
    for (const f of flakes) {
      c.globalAlpha = f.crystal ? .9 : .55 + Math.min(.45, f.r / 9);
      if (f.crystal) {
        // turned in place with one setTransform rather than save / translate / rotate / restore
        const cos = Math.cos(f.rot), sin = Math.sin(f.rot);
        c.setTransform(cos, sin, -sin, cos, f.x, f.y);
        c.drawImage(star, -f.r * 1.6, -f.r * 1.6, f.r * 3.2, f.r * 3.2);
        c.setTransform(1, 0, 0, 1, 0, 0);
      } else c.drawImage(dot, f.x - f.r * 1.6, f.y - f.r * 1.6, f.r * 3.2, f.r * 3.2);
    }
    c.globalAlpha = 1;
  },
  reset() { flakes.length = 0; flakes.w = 0; },
});

// Santa's sleigh: at night, now and then at random (every 40 s to 4 min), Santa's sleigh crosses
// the sky far away: random height, size, speed and direction, on a gentle arc. Drawn flying to the
// left: Rudolph alone in front, his red nose shining bright (white-hot core, glow, wide halo and a
// small flare, pulsing), then two pairs of reindeer (the far one of each pair darker and a little
// higher, for depth), all galloping (legs and bodies animated in CSS), in red harnesses with gold
// bells; then the red and gold sleigh on curled runners, Santa holding the reins, his sack of
// gifts behind him, and a trail of golden sparkles. Flying to the right, it is mirrored (.ltr).
const deer = (x, y, far, rudolph = false) => `<g transform="translate(${x},${y})"><g class="deer${far ? " far" : ""}" style="--b:${f1(-Math.random())}s">` +
  // far legs (behind the body), antler behind
  `<g class="legs-f" style="--o:-.15s"><path d="M22,27 15,35 9,33"/></g><g class="legs-h" style="--o:-.15s"><path d="M46,27 54,35 62,37"/></g>` +
  `<path class="antler back" d="M14,1C14,-4 16,-9 21,-12M16,-5C18,-7 19,-8 18,-11M15,-2C12,-4 11,-7 12,-9"/>` +
  `<path class="body" d="M16,16C20,11 32,10 44,11C52,11 57,15 56,21C55,27 49,30 41,30C33,31 24,31 18,28C13,26 12,20 16,16Z"/>` +
  `<path class="body" d="M18,18C15,12 12,7 9,3L15,1C18,6 22,11 26,14Z"/>` +
  `<path class="body" d="M9,3C7,0 3,0 0,2-3,4-3,7-1,8 2,9 6,8 9,7 12,6 13,4 12,2Z"/><path class="body" d="M12,1 16,-3 15,2Z"/>` +
  `<path class="pale" d="M18,27C26,30 36,30 44,29 38,26 26,26 18,27ZM9,6C12,9 15,14 18,19 17,13 14,8 11,5Z"/>` +
  `<path class="tail" d="M55,14c3,-3 7,-1 5,2 -1,1 -3,1 -5,0Z"/>` +
  `<path class="antler" d="M11,0C10,-5 12,-10 17,-13M13,-6C15,-8 16,-9 15,-12M12,-3C9,-5 8,-8 9,-10"/>` +
  `<circle cx="5" cy="2.5" r=".9" fill="#111"/>` +
  // near legs, harness with bells
  `<g class="legs-f"><path d="M18,26 12,34 6,31"/></g><g class="legs-h"><path d="M50,25 58,32 66,33"/></g>` +
  `<path class="strap" d="M15,15C17,21 19,26 20,29M27,12C27,18 27,24 27,30"/><circle class="bell" cx="17.5" cy="21" r="1.6"/><circle class="bell" cx="27" cy="21" r="1.6"/>` +
  (rudolph ? `<g class="nose"><circle class="halo" cx="-2" cy="6" r="30"/><circle class="glow" cx="-2" cy="6" r="13"/>` +
      `<path class="flare" d="M-26,6Q-2,4.6 22,6Q-2,7.4-26,6Z"/><circle cx="-2" cy="6" r="3.2" fill="#ff1f1f"/>` +
      `<circle cx="-2" cy="6" r="1.8" fill="#ff8a8a"/><circle cx="-2.6" cy="5.4" r=".9" fill="#fff"/></g>`
    : `<circle cx="-2" cy="6" r="1.4" fill="#1a0e08"/>`) + `</g></g>`;
const sleighEl = document.createElement("div");
sleighEl.id = "sleigh";
sleighEl.setAttribute("aria-hidden", "true");
sleighEl.innerHTML = `<svg viewBox="-12 -34 452 100"><defs>` +
  `<linearGradient id="rd-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a26a40"/><stop offset="1" stop-color="#5a3118"/></linearGradient>` +
  `<linearGradient id="rd-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76492a"/><stop offset="1" stop-color="#3b200e"/></linearGradient>` +
  `<linearGradient id="sl-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2384f"/><stop offset=".55" stop-color="#b3122e"/><stop offset="1" stop-color="#6e0716"/></linearGradient>` +
  `<radialGradient id="rd-glow"><stop offset="0" stop-color="rgba(255,90,80,1)"/><stop offset=".35" stop-color="rgba(255,40,40,.75)"/><stop offset="1" stop-color="rgba(255,30,30,0)"/></radialGradient>` +
  `<radialGradient id="rd-halo"><stop offset="0" stop-color="rgba(255,60,50,.45)"/><stop offset=".5" stop-color="rgba(255,40,40,.15)"/><stop offset="1" stop-color="rgba(255,40,40,0)"/></radialGradient>` +
  `<radialGradient id="sl-spark"><stop offset="0" stop-color="#fff7d0"/><stop offset=".4" stop-color="rgba(255,215,110,.8)"/><stop offset="1" stop-color="rgba(255,215,110,0)"/></radialGradient></defs>` +
  // golden sparkles trailing behind the sleigh
  [[360, 44, 5], [374, 50, 4], [388, 42, 3.4], [400, 52, 3], [412, 46, 2.4], [424, 50, 2], [434, 44, 1.6]].map(([x, y, r], i) =>
    `<circle class="spark" style="--s:${f1(-i * .23)}s" cx="${x}" cy="${y}" r="${r}" fill="url(#sl-spark)"/>`).join("") +
  // reins from the sleigh to every harness
  `<path class="reins" d="M276,10C220,6 140,4 70,14M276,10C230,4 150,0 82,8M276,10C210,10 120,12 20,16"/>` +
  deer(156, -6, true) + deer(82, -6, true) + deer(148, 2, false) + deer(74, 2, false) + deer(0, 4, false, true) +
  // the sleigh: runners, body with a scroll at the front, gold trim
  `<path class="runner" d="M228,51C220,51 218,44 224,42 228,41 231,45 228,48M226,58H340C346,58 349,54 346,51M250,48 247,58M298,48V58M330,45 334,58"/>` +
  `<path d="M318,20C316,2 326,-12 338,-12 350,-10 356,4 352,20Z" fill="#7a2e1c"/><path d="M326,-6C330,-2 342,-2 346,-8" stroke="#5a1f12" stroke-width="2" fill="none"/>` +
  `<rect x="326" y="-22" width="12" height="11" fill="#1f7a3e"/><rect x="331" y="-22" width="2.4" height="11" fill="#e3b341"/><rect x="339" y="-18" width="10" height="9" fill="#e3b341"/><rect x="343" y="-18" width="2" height="9" fill="#c8102e"/>` +
  // Santa: coat, belt, fur trims, beard, face, floppy hat trailing behind, arm forward on the reins
  `<path d="M286,24C284,6 292,-6 304,-6S324,6 322,24Z" fill="url(#sl-red)"/><rect x="286" y="10" width="36" height="4.5" fill="#1b1b1b"/><rect x="301" y="9.4" width="6" height="5.6" fill="none" stroke="#e3b341" stroke-width="1.4"/>` +
  `<path d="M302,-14C301,-24 310,-28 318,-22 323,-18 328,-12 331,-8L327,-6C323,-10 318,-14 314,-14Z" fill="url(#sl-red)"/><circle cx="330" cy="-6" r="3.4" fill="#fff"/>` +
  `<circle cx="304" cy="-11" r="6.2" fill="#f2c7a2"/><path d="M296,-15C296,-18 312,-18 312,-15" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>` +
  `<path d="M297,-10C294,-2 300,5 306,3 312,5 316,-2 312,-10 309,-7 300,-7 297,-10Z" fill="#f4f6fa"/><circle cx="301" cy="-12" r=".9" fill="#222"/>` +
  `<path d="M292,4C286,8 280,11 274,11" stroke="url(#sl-red)" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="273" cy="11" r="3.2" fill="#1b1b1b"/><path d="M278,9.5 280,13" stroke="#fff" stroke-width="2.4"/>` +
  `<path class="sleigh-body" d="M236,30C232,22 238,14 248,16L262,20H318C324,8 336,2 348,6 342,10 340,18 340,28 340,40 330,48 316,48H250C240,48 236,40 236,30Z"/>` +
  `<path d="M236,30C228,26 226,16 234,12 240,10 244,14 242,18" stroke="#e3b341" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
  `<path d="M248,16 262,20H318C324,8 336,2 348,6" stroke="#e3b341" stroke-width="1.8" fill="none"/>` +
  `<path d="M262,34C268,26 278,26 282,32 284,36 280,40 276,38M282,32C290,40 304,40 310,32 314,28 320,30 318,34" stroke="#f0cc6a" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;
let sleighIn = 20 + Math.random() * 60;  // seconds before the next flight
let sleighFlight = null;
const flySleigh = () => {
  if (document.hidden || sleighEl.isConnected || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ltr = Math.random() < .5, w = 130 + Math.random() * 70, y = 15 + Math.random() * 25, rise = (Math.random() - .5) * 10;
  sleighEl.style.cssText = `top:${f1(y)}vh;width:${f1(w)}px`;
  sleighEl.classList.toggle("ltr", ltr);  // flying left to right: the drawing is mirrored (CSS)
  const [from, to] = ltr ? [`-${f1(w + 40)}px`, "100vw"] : ["100vw", `-${f1(w + 40)}px`];
  document.body.append(sleighEl);
  sleighFlight = sleighEl.animate([
    { transform: `translate(${from},0)` },
    { transform: `translate(calc((${from} + ${to}) / 2),${f1(-2 - Math.random() * 4)}vh)` },
    { transform: `translate(${to},${f1(rise)}vh)` },
  ], { duration: (14 + Math.random() * 14) * 1000, easing: "linear" });
  sleighFlight.onfinish = sleighFlight.oncancel = () => sleighEl.remove();
};
everySecond.push(() => {
  if (document.body.dataset.phase !== "christmas-night") { if (sleighFlight) sleighFlight.cancel(); sleighIn = 20 + Math.random() * 60; return; }
  if (--sleighIn <= 0) { sleighIn = 40 + Math.random() * 200; flySleigh(); }
});

// Christmas music, on a Christmas turntable in the bottom left corner (red lacquer and gold, snow
// on the lid, holly, a candy-cane tonearm). Two records: "Jingle Bell Rock"
// (audio/jingle-bell-rock.mp3, looped, red label) or a live of Christmas songs from YouTube (the
// only music of the page still from YouTube: a radio that never ends, no file; green label). The
// other record waits in its sleeve, leaning behind the turntable: clicking the sleeve swaps them
// and plays the new one. The turntable plays / pauses the record on; the choice and the pause
// are remembered. It starts with the screen and keeps playing from day to night. As for the
// jazz, without a user gesture yet it starts muted and the sound comes on at the first click or
// key press.
const XMAS_LIVE = "XSXEaikz0Bc";
let carolsRock = null, carolsRadio = false;  // the record on: an <audio>, or the YouTube radio (youtube.js)
const CAROLS_YT = {};  // the turntable, as the owner of the radio's player
let carolsPlaying = false, carolsMuted = false, carolsSoundAt = 0;
let carolsRecord = (() => { try { return localStorage.getItem("xmas-record") === "radio" ? "radio" : "rock"; } catch (e) { return "rock"; } })();
const xmasDeck = document.createElement("button");
xmasDeck.id = "xmusic";
xmasDeck.type = "button";
xmasDeck.innerHTML = '<span class="deck"><span class="lid"></span><span class="disc"></span><span class="arm"></span>' +
  '<svg class="holly" viewBox="0 0 40 26" aria-hidden="true"><path d="M20,14C14,4 6,8 1,4 4,9 2,12 6,14 3,16 6,20 4,24 10,20 14,22 20,14Z" fill="#1f7a3e"/>' +
  '<path d="M20,14C26,4 34,8 39,4 36,9 38,12 34,14 37,16 34,20 36,24 30,20 26,22 20,14Z" fill="#17643a"/>' +
  '<circle cx="17" cy="15" r="3" fill="#d6203a"/><circle cx="23" cy="15" r="3" fill="#c8102e"/><circle cx="20" cy="11" r="3" fill="#e0263f"/></svg></span><span class="label"></span>';
// The sleeve of the other record, behind the turntable: its cover shows what it would put on
const XMAS_RECORDS = { rock: { icon: "🔔", short: "Rock", name: "Jingle Bell Rock" }, radio: { icon: "📻", short: "Radio", name: "Christmas radio" } };
const xmasSleeve = document.createElement("button");
xmasSleeve.id = "xsleeve";
xmasSleeve.type = "button";
xmasSleeve.innerHTML = '<span class="rec"></span><span class="cover"><i></i><b></b></span>';
const carolsOff = () => { try { return localStorage.getItem("xmas-music") === "off"; } catch (e) { return false; } };
const paintDeck = () => {
  const name = XMAS_RECORDS[carolsRecord].name, other = carolsRecord === "rock" ? "radio" : "rock";
  xmasDeck.classList.toggle("playing", carolsPlaying);
  xmasDeck.classList.toggle("radio", carolsRecord === "radio");
  xmasDeck.querySelector(".label").textContent = !carolsPlaying ? "♪ Click for Christmas songs"
    : carolsMuted ? "🔇 Click anywhere for sound" : `♪ ${name} — click to pause`;
  xmasDeck.title = !carolsPlaying ? "Play the music" : carolsMuted ? "Turn the sound on" : "Pause the music";
  xmasSleeve.classList.toggle("rock", other === "rock");
  xmasSleeve.classList.toggle("radio", other === "radio");
  xmasSleeve.querySelector("i").textContent = XMAS_RECORDS[other].icon;
  xmasSleeve.querySelector("b").textContent = XMAS_RECORDS[other].short;
  xmasSleeve.title = `Put on ${XMAS_RECORDS[other].name}`;
  xmasSleeve.setAttribute("aria-label", xmasSleeve.title);
};
// The radio's player stays in the page once made (paused when the record is off), and is muted
// during YouTube's ads: coming back to it plays on with no new ad (youtube.js)
const carolsStart = muted => {  // puts the chosen record on, playing
  if (carolsRecord === "rock") carolsRock = screenTrack("jingle-bell-rock.mp3", { muted });
  else { ytPlay(XMAS_LIVE, CAROLS_YT, !muted); carolsRadio = true; }
  carolsMuted = muted;
};
const carolsStop = () => {  // takes the record off
  dropTrack(carolsRock);
  if (carolsRadio) ytPause(XMAS_LIVE, CAROLS_YT);
  carolsRock = null;
  carolsRadio = false;
};
const carolsPlay = (muted = false) => {
  if (carolsRock) carolsRock.play().catch(() => {});
  else if (carolsRadio) ytPlay(XMAS_LIVE, CAROLS_YT, !carolsMuted);
  else carolsStart(muted);
  carolsPlaying = true;
  try { localStorage.removeItem("xmas-music"); } catch (e) {}
  paintDeck();
};
const carolsPause = () => {
  if (carolsRock) carolsRock.pause(); else ytPause(XMAS_LIVE, CAROLS_YT);
  carolsPlaying = false;
  try { localStorage.setItem("xmas-music", "off"); } catch (e) {}
  paintDeck();
};
const carolsSound = () => {
  if (!carolsMuted) return;
  if (carolsRock) carolsRock.muted = false; else ytSound(XMAS_LIVE, CAROLS_YT, true);
  carolsMuted = false;
  carolsSoundAt = performance.now();
  paintDeck();
};
xmasDeck.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - carolsSoundAt < 600) return;  // this same click just turned the sound on
  if (carolsMuted) carolsSound();
  else if (carolsPlaying) carolsPause();
  else carolsPlay();
});
let xmasSwapEnd = null;
xmasSleeve.addEventListener("click", e => {  // the records swap: the one on goes in the sleeve, the other plays
  e.stopPropagation();
  carolsStop();
  carolsRecord = carolsRecord === "rock" ? "radio" : "rock";
  try { localStorage.setItem("xmas-record", carolsRecord); } catch (e) {}
  carolsPlay();
  // the swap, seen: the record lands on the turntable, the sleeve dips (class removed, reflow, put
  // back); once over, the record may spin again
  for (const el of [xmasDeck, xmasSleeve]) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
  clearTimeout(xmasSwapEnd);
  xmasSwapEnd = setTimeout(() => { xmasDeck.classList.remove("swap"); xmasSleeve.classList.remove("swap"); }, 600);
});
const carolsWarm = () => ytWarm(XMAS_LIVE);
const setCarols = on => {
  document.removeEventListener("pointerdown", carolsSound);
  document.removeEventListener("keydown", carolsSound);
  if (!on) { carolsStop(); carolsPlaying = carolsMuted = false; xmasDeck.remove(); xmasSleeve.remove(); return; }
  document.body.append(xmasSleeve, xmasDeck);
  // The radio made ahead, through its ads, once the turntable is reached for (youtube.js)
  ["pointerenter", "touchstart", "focusin"].forEach(type => {
    xmasDeck.addEventListener(type, carolsWarm, { passive: true });
    xmasSleeve.addEventListener(type, carolsWarm, { passive: true });
  });
  if (!carolsOff()) {
    const canSound = screenGesture();
    carolsPlay(!canSound);
    if (!canSound) {
      document.addEventListener("pointerdown", carolsSound, { once: true });
      document.addEventListener("keydown", carolsSound, { once: true });
    }
  }
  paintDeck();
};

// Back to Christmas from the jazz bar or the calm night: a small fir with a star in the bottom
// right corner, only when the bar was opened with the sax, or the calm night with the firefly jar
const firBtn = document.createElement("button");
firBtn.id = "xback";
firBtn.type = "button";
firBtn.title = "Back to Christmas";
firBtn.setAttribute("aria-label", "Back to Christmas");
firBtn.innerHTML = '<svg viewBox="0 0 30 40" aria-hidden="true"><path d="M15,4 25,17H20L28,28H21L29,36H1L9,28H2L10,17H5Z" fill="#1f7a3e"/>' +
  '<rect x="13" y="36" width="4" height="4" fill="#6b3d1c"/><circle cx="11" cy="22" r="1.6" fill="#ff5a6e"/><circle cx="19" cy="27" r="1.6" fill="#ffd86a"/>' +
  '<circle cx="14" cy="32" r="1.6" fill="#7cc0ff"/><path d="M15,0 16.2,3H19L16.8,4.8 17.6,7.6 15,6 12.4,7.6 13.2,4.8 11,3H13.8Z" fill="#ffd86a"/></svg>';
firBtn.addEventListener("click", e => {
  e.stopPropagation();
  xmasJazz = false;
  if (xmasPeace) peaceEgg = xmasPeace = false;
  applyScreen();
});
document.addEventListener("phase", e => {
  // (the peace egg ends when the calm night is left another way: typing peace, yeti or armstrong)
  if (xmasJazz && screenClass(e.detail) === "night" || xmasPeace && peaceEgg && e.detail === "calm") document.body.append(firBtn);
  else firBtn.remove();
  if (e.detail === "christmas" || e.detail === "christmas-night") setTreeLights(e.detail === "christmas-night");
});

// The jar's pendulum. The jar hangs from its string (placeJar, called when the garland is built),
// in the page like the garland (it scrolls with it), over the garland, a little bigger than the
// baubles. It swings like a pendulum with friction (a period of about 1.7 s): a breath of wind
// every 2 to 6 s, the mouse passing by pushes it (its speed across, the closer the stronger), and
// scrolling the page makes it lag and swing back. Only its rotation changes (transform), on each
// frame while it moves; once it has settled the loop sleeps until the next breath of wind (a
// timer), and the wind waits while the jar is scrolled out of the window. Its place is kept in
// page coordinates (jarAt), so nothing reads the layout per frame or per mouse move.
// Reduced motion: it hangs still.
const JAR_K = () => innerWidth < 700 ? 1.45 : 2.5;  // pixels per unit of its drawing
const jarAt = { x: 0, y: 0, bottom: 0 };  // its string's top, and its bottom, in page pixels
let jarAngle = 0, jarSpin = 0, jarRaf = null, jarLast = 0, jarGust = 0, jarScroll = 0, jarNap = 0;
const placeJar = (x, y) => {
  const k = JAR_K();
  jarBtn.style.cssText = `left:${f1(x - JAR.w * k / 2)}px;top:${f1(y)}px;width:${f1(JAR.w * k)}px;height:${f1(JAR.h * k)}px`;
  Object.assign(jarAt, { x, y, bottom: y + JAR.h * k });
};
const jarStill = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const jarFrame = now => {
  jarRaf = null;
  const dt = Math.min(.05, (now - (jarLast || now)) / 1000);
  jarLast = now;
  if (now > jarGust) {  // a breath of wind
    jarSpin += (Math.random() - .5) * .5;
    jarGust = now + 2000 + Math.random() * 4000;
  }
  jarSpin += (-14 * Math.sin(jarAngle) - 1.1 * jarSpin) * dt;
  jarAngle = Math.max(-.7, Math.min(.7, jarAngle + jarSpin * dt));
  jarBtn.style.transform = `rotate(${(jarAngle * 180 / Math.PI).toFixed(2)}deg)`;
  if (Math.abs(jarSpin) > .003 || Math.abs(jarAngle) > .003) { jarRaf = requestAnimationFrame(jarFrame); return; }
  // settled: sleep until the next breath of wind, if it is on screen to feel it
  if (scrollY < jarAt.bottom) jarNap = setTimeout(wakeJar, Math.max(0, jarGust - now));
};
const wakeJar = () => {
  if (jarRaf || jarStill() || !jarBtn.isConnected) return;
  clearTimeout(jarNap);
  jarLast = 0;
  jarRaf = requestAnimationFrame(jarFrame);
};
const pushJar = e => {
  const dx = e.pageX - jarAt.x, dy = e.pageY - (jarAt.y + (jarAt.bottom - jarAt.y) * .7);
  const near = 1 - Math.hypot(dx, dy) / 160;
  if (near <= 0 || !e.movementX) return;
  jarSpin += Math.max(-.12, Math.min(.12, e.movementX * .004)) * near;
  wakeJar();
};
const scrollJar = () => {
  const y = scrollY;
  jarSpin += Math.max(-.4, Math.min(.4, (y - jarScroll) * .004));
  jarScroll = y;
  wakeJar();
};
const setJarSwing = on => {
  removeEventListener("pointermove", pushJar);
  removeEventListener("scroll", scrollJar);
  if (jarRaf) cancelAnimationFrame(jarRaf);
  clearTimeout(jarNap);
  jarRaf = null;
  jarAngle = jarSpin = 0;
  jarBtn.style.transform = "";
  if (!on || jarStill()) return;
  jarScroll = scrollY;
  addEventListener("pointermove", pushJar, { passive: true });
  addEventListener("scroll", scrollJar, { passive: true });
  jarSpin = .25;  // it comes in swinging a little
  wakeJar();
};

// Turning the screen on and off: the garland, the scene and the music come and go with the class
let garlandResize = null;
const onGarlandResize = () => {
  clearTimeout(garlandResize);
  garlandResize = setTimeout(() => {
    if (garland.w === document.documentElement.clientWidth) return;
    buildGarland();
    // the night lights loop repaints the halos; without it (reduced motion), paint them still
    if (!treeRaf && document.body.dataset.phase === "christmas-night") paintGarlandGlow(null);
  }, 200);
};
const setChristmas = on => {
  removeEventListener("resize", onGarlandResize);
  setCarols(on);
  if (!on) { [garland, scene, treeFront, sleighEl, jarBtn].forEach(el => el.remove()); setTreeLights(false); setJarSwing(false); return; }
  if (!treeBuilt) {
    tree.innerHTML = buildTree();
    scene.innerHTML = MOUNTAINS;
    scene.append(moon, tree, snowman);
    treeBuilt = true;
  }
  buildGarland();
  addEventListener("resize", onGarlandResize);
  document.body.prepend(garland, scene);
  document.body.append(treeFront);
  garland.after(jarBtn);  // over the garland, in the page
  setJarSwing(true);
};
setChristmas(document.body.classList.contains("christmas"));
document.addEventListener("christmas", e => setChristmas(e.detail));
