// ── Christmas (screens "christmas" and "christmas-night", body.christmas) ─────────────────────
// From December 10 to January 3 the usual looks are replaced by Christmas (css/christmas.css):
// the day screen from 6:00 to 18:00, the night screen from 18:00 to 6:00. Both have a garland
// across the top (plain by day, lit at night), snow falling on the effects canvas (fx.js), a
// winter landscape with a decorated tree, gifts and a snowman behind the page, and a Christmas
// turntable playing a live of Christmas music. At night the tree lights play changing patterns,
// Santa's sleigh crosses the sky now and then, and a small golden sax hidden on the tree opens
// the jazz bar (a little fir in the bar brings Christmas back).
// The metal show at 1:00 and the easter eggs still take over as usual.
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

// Christmas replaces the day and the jazz bar, not the shows: the override only rewrites "no
// screen" and the jazz screens, and it runs before the metal and epic ones (this file is loaded
// before metal.js), so those still win. A forced ?night=... is left alone (?night=christmas and
// ?night=christmas-night force these screens). xmasJazz: the hidden sax was clicked, the night
// goes on in the jazz bar until the fir is clicked or Christmas day comes back at 6:00.
const isXmasDate = (d = new Date()) => (d.getMonth() === 11 && d.getDate() >= 10) || (d.getMonth() === 0 && d.getDate() <= 3);
const isXmasDaytime = () => { const t = clockSeconds(); return t >= 6 * 3600 && t < 18 * 3600; };
let xmasJazz = false;
OVERRIDES.push(phase => {
  let p = phase;
  if ((!forced || forcedDismissed) && isXmasDate() && (p === null || SCREENS[p]?.className === "night")) {
    p = isXmasDaytime() ? "christmas" : "christmas-night";
  }
  if (p === "christmas") xmasJazz = false;
  if (xmasJazz && p === "christmas-night") return phase === "closing" ? "closing" : "evening";
  return p;
});

// Same pseudo-random numbers on every visit, so the scene is always drawn the same way
const seeded = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const f1 = n => n.toFixed(1);
const quad = (x0, y0, cx, cy, x1, y1, t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
// Light colours: [glass by day, lit glass at night, glow rgb]
const XMAS_LIGHTS = [["#a3192d", "#ff5a6e", "255,70,90"], ["#b07d12", "#ffd86a", "255,200,80"], ["#1d5aa8", "#7cc0ff", "90,170,255"],
  ["#17784a", "#7dffb4", "90,255,160"], ["#9c2a7e", "#ff94dc", "255,120,210"]];
const NEEDLES = ["#1b5a31", "#246b3c", "#123f22", "#2f7d48", "#2a6b5a"];

// Garland across the top of the page: wide, heavy swags of fir of irregular widths and depths,
// dusted with snow, a gold ribbon woven through, a few pine cones, velvet bows at the hooks. Small
// fairy lights sit in the fir, and glass baubles hang below it on threads of different lengths.
// By day the lights are unlit glass and the baubles plain; at night (CSS) the lights glow and
// twinkle, and each bauble reflects its two nearest lights: a coloured glint on the side facing
// each light, twinkling with it (same --d / --t). Rebuilt to the page width.
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
let garlandSwags = [], garlandBobs = [];  // moving parts, with their physics state (see below)
const buildGarland = () => {
  const W = Math.max(320, document.documentElement.clientWidth), rnd = seeded(12);
  // irregular swags: widths from 240 to 420 px, depths from 45 to 82 px, hooks at slightly different heights
  const hooks = [[0, 6]];
  while (hooks.at(-1)[0] < W) hooks.push([hooks.at(-1)[0] + 240 + rnd() * 180, 3 + rnd() * 9]);
  const scale = W / hooks.at(-1)[0];  // stretch so the last hook lands on the right edge
  hooks.forEach(h => { h[0] *= scale; });
  const swags = [], lights = [], baubles = [];
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
      lights.push({ k, x: x + dx, y: y + dy, c: FAIRY[(rnd() * FAIRY.length) | 0], d: f1(-rnd() * 5), t: f1(1.6 + rnd() * 2.6) });
    }
    // glass baubles hanging below, two or three per swag
    const nb = 2 + (rnd() < .5);
    for (let i = 0; i < nb; i++) {
      const tt = (i + .25 + rnd() * .5) / nb, [x, y] = cubic(curve, tt), thread = 8 + rnd() * 28, r = 8 + rnd() * 6;
      baubles.push({ k, x, y: y + 6, cy: y + 6 + thread + r, r, c: (rnd() * GLASS.length) | 0 });
    }
    const fir = `<path class="fir" d="M${f1(x0)},${f1(y0)}C${curve.slice(1).map(([x, y]) => `${f1(x)},${f1(y)}`).join(" ")}"/>` +
      needles.map((d, i) => `<path stroke="${NEEDLES[i]}" class="needles" d="${d.join("")}"/>`).join("") +
      `<path class="ribbon" d="${ribbon}"/>${cones.join("")}<g class="snow">${snow.join("")}</g>`;
    swags.push({ fir, x0, x1, top: (y0 + y1) / 2, bottom: Math.max(y0, y1) + sag });
  }
  const lightSvg = l => `<g class="fl" style="--d:${l.d}s;--t:${l.t}s"><circle class="halo" cx="${f1(l.x)}" cy="${f1(l.y)}" r="17" fill="url(#fl${FAIRY.indexOf(l.c)})"/>` +
    `<circle class="glass" cx="${f1(l.x)}" cy="${f1(l.y)}" r="2.6"/><circle class="lit" cx="${f1(l.x)}" cy="${f1(l.y)}" r="3.2" fill="${l.c}"/></g>`;
  const baubleSvg = b => {
    // the two nearest lights, mirrored on the side of the glass facing them
    const near = lights.map(l => [Math.hypot(l.x - b.x, l.y - b.cy), l]).sort((a, z) => a[0] - z[0]).slice(0, 2);
    const glints = near.map(([d, l]) => {
      const gx = b.x + (l.x - b.x) / d * b.r * .55, gy = b.cy + (l.y - b.cy) / d * b.r * .55;
      return `<circle class="refl" style="--d:${l.d}s;--t:${l.t}s" cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(b.r * .5)}" fill="url(#fl${FAIRY.indexOf(l.c)})"/>` +
        `<circle class="refl" style="--d:${l.d}s;--t:${l.t}s" cx="${f1(gx)}" cy="${f1(gy)}" r="${f1(Math.max(1, b.r * .1))}" fill="${l.c}"/>`;
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
  // one group per swag (its baubles behind the fir, its lights in front), so each can move on its own;
  // the bows stay nailed to the hooks, on top
  garland.innerHTML = `<svg width="${W}" height="170" viewBox="0 0 ${W} 170"><defs>${defs}</defs>` +
    swags.map((s, k) => `<g class="swag">${baubles.filter(b => b.k === k).map(baubleSvg).join("")}${s.fir}${lights.filter(l => l.k === k).map(lightSvg).join("")}</g>`).join("") +
    `${bows}</svg>`;
  const swagEls = garland.querySelectorAll(".swag");
  garlandSwags = swags.map((s, k) => ({ ...s, el: swagEls[k], a: 0, va: 0, s: 0, vs: 0 }));
  const bobEls = garland.querySelectorAll(".bauble");
  garlandBobs = baubles.sort((a, z) => a.k - z.k).map((b, i) => ({ el: bobEls[i], px: b.x, py: b.y, cy: b.cy, r: b.r, len: b.cy - b.y, th: 0, w: 0 }));
  garland.w = W;
  placeSax();  // the sax may hang on the garland, which was just rebuilt
};

// The winter scene behind the page: mountains and snowy ground across the bottom, and on the right
// a decorated tree (tiers of fir, tinsel, baubles, candy canes, light strings, star), with gifts
// below it. Drawn once as SVG in a 520 x 640 box. The lights are also listed
// (treeLights) for the night canvas that lights them up. The sax ornament is in a separate layer
// above the page (#xtree-front), so it can be clicked even where the cards cover the tree.
const TREE_W = 520, TREE_H = 640, TREE_X = 330;
const treeLights = [];
const treeHalfWidth = y => 12 + (y - 60) / (520 - 60) * 172;  // half width of the tree at height y
const buildTree = () => {
  const rnd = seeded(2025), parts = [];
  const defs = [`<linearGradient id="xfir" x1="0" x2="1"><stop class="s1" offset="0"/><stop class="s2" offset=".45"/><stop class="s3" offset="1"/></linearGradient>`,
    `<linearGradient id="xstar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#ffc93c"/><stop offset="1" stop-color="#c98a0c"/></linearGradient>`,
    `<linearGradient id="xgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".45" stop-color="#e3a923"/><stop offset="1" stop-color="#8a5a08"/></linearGradient>`];
  const BAUBLES = [["#ff6b7d", "#c8102e", "#5c0614"], ["#fff1a6", "#e2a81e", "#6b4504"], ["#bfe1ff", "#2f7ed8", "#0b2d5c"], ["#ffffff", "#c7ced8", "#59626e"], ["#e9b8ff", "#8e3cc8", "#3a0c5a"]];
  BAUBLES.forEach(([a, b, c], i) => defs.push(`<radialGradient id="xb${i}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient>`));

  // Tree skirt and trunk, then the tiers from the bottom up, each casting a shadow on the one below
  parts.push(`<rect x="${TREE_X - 15}" y="512" width="30" height="40" fill="#5a3418"/><ellipse cx="${TREE_X}" cy="560" rx="150" ry="22" fill="#a30d26"/>` +
    `<ellipse cx="${TREE_X}" cy="556" rx="150" ry="19" fill="#c8102e"/><path d="M${TREE_X - 150},556a150,19 0 0 0 300,0" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="1 9" stroke-linecap="round"/>`);
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
    parts.push(`<path d="${path}" fill="url(#xfir)"/>`);
    // needle tips along the bottom edge, and snow resting on some branches
    let tips = "", snow = "";
    for (let j = 0; j < n * 5; j++) {
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
    const c = (rnd() * BAUBLES.length) | 0;
    parts.push(`<g class="bauble"><path d="M${f1(x)},${f1(y - r - 9)}v6" class="hook"/><rect x="${f1(x - 2.6)}" y="${f1(y - r - 4)}" width="5.2" height="4.5" rx="1" fill="url(#xgold)"/>` +
      `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#xb${c})"/>` +
      (rnd() < .35 ? `<path d="M${f1(x - r)},${f1(y)}a${f1(r)},${f1(r * .35)} 0 0 0 ${f1(r * 2)},0" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="1.6"/>` : "") + `</g>`);
  }
  // Candy canes
  [[262, 300, -14], [372, 452, 12], [295, 392, 8]].forEach(([x, y, a]) => {
    const d = `M0,0v-20a7,7 0 0 1 14,0v3`;
    parts.push(`<g transform="translate(${x},${y}) rotate(${a})"><path d="${d}" class="cane"/><path d="${d}" class="cane-stripes"/></g>`);
  });
  // Gifts below the tree: box, ribbon, lid and bow
  [[178, 512, 72, 50, "#c8102e", "#ffd15c"], [258, 528, 52, 36, "#2f6fd1", "#e9eef5"], [380, 508, 78, 52, "#1e8a4c", "#d6203a"], [452, 530, 46, 32, "#e2a81e", "#c8102e"]].forEach(([x, y, w, h, box, rib]) => {
    parts.push(`<g class="gift"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${box}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#xshade)"/>` +
      `<rect x="${x - 3}" y="${y - 7}" width="${w + 6}" height="10" rx="1.5" fill="${box}"/><rect x="${x + w / 2 - 5}" y="${y - 7}" width="10" height="${h + 7}" fill="${rib}"/>` +
      `<rect x="${x - 3}" y="${y - 7}" width="${w + 6}" height="3" fill="rgba(255,255,255,.25)"/>` +
      `<path d="M${x + w / 2},${y - 7}c-14,-14 -22,0 0,0c14,-14 22,0 0,0" fill="${rib}" stroke="rgba(0,0,0,.25)"/></g>`);
  });
  defs.push(`<linearGradient id="xshade" x1="0" x2="1"><stop offset="0" stop-color="rgba(255,255,255,.18)"/><stop offset=".6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,.25)"/></linearGradient>`);
  // Star on the top
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 11 : 27;
    return `${f1(TREE_X + Math.cos(a) * r)},${f1(30 + Math.sin(a) * r)}`;
  }).join(" ");
  parts.push(`<polygon points="${star}" fill="url(#xstar)" stroke="#a8740a" stroke-width="1.2" stroke-linejoin="round"/>`);
  return `<svg viewBox="0 0 ${TREE_W} ${TREE_H}" preserveAspectRatio="xMidYMax meet"><defs>${defs.join("")}</defs>${parts.join("")}</svg>`;
};
// The hidden sax (night only), hanging on the right side of the tree like an ornament:
// golden body bent in a J, bell, neck and mouthpiece, a few keys, a ribbon loop to hang it.
const SAX = { x: 384, y: 300, w: 30, h: 52 };
const SAX_SVG = `<svg viewBox="0 0 30 52" aria-hidden="true"><path d="M15,0v6" stroke="#c8102e" stroke-width="1.6"/>` +
  `<path d="M6,9 11,6 14,10" fill="none" stroke="#b8860b" stroke-width="2.4" stroke-linecap="round"/>` +
  `<path d="M13,10C14,22 13,34 11,40 9,46 13,50 18,49 23,48 24,43 24,37" fill="none" stroke="url(#saxgold)" stroke-width="5.5" stroke-linecap="round"/>` +
  `<path d="M20.5,38 21,31 28,30 27.5,38Z" fill="url(#saxgold)" stroke="#8a5a08" stroke-width=".8"/>` +
  `<circle cx="13.6" cy="18" r="1.2" fill="#fff5c8"/><circle cx="13.6" cy="24" r="1.2" fill="#fff5c8"/><circle cx="13" cy="30" r="1.2" fill="#fff5c8"/>` +
  `<defs><linearGradient id="saxgold" x1="0" x2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#e3a923"/><stop offset="1" stop-color="#8a5a08"/></linearGradient></defs></svg>`;

const scene = document.createElement("div"), tree = document.createElement("div"), treeFront = document.createElement("div");
scene.id = "xscene";
scene.setAttribute("aria-hidden", "true");
tree.id = "xtree";
treeFront.id = "xtree-front";
// Mountains filling the background, kept discreet (colours close to the sky's): three ranges, the
// farther ones higher and paler, each ridge made natural by midpoint displacement between a few
// chosen peaks, with snow on the tops (the range itself clips a jagged snow line), then the snowy
// ground. Drawn once in a 1600 x 700 box, scaled to cover the bottom of the window. ridges keeps
// each range's outline, to put things on the slopes.
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
  let svg = `<svg class="mountains" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><defs>`;
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
    return `<path class="${cls}" d="${d}"/>${snow}`;
  });
  return svg + `</defs>${bodies.join("")}` +
    `<path class="ground-shade" d="M0,662C200,636 380,652 560,646S900,632 1100,648 1450,638 1600,646V700H0Z"/>` +
    `<path class="ground" d="M0,670C220,646 400,662 580,656S920,644 1120,658 1460,648 1600,656V700H0Z"/></svg>`;
})();
// The snowman: a big companion standing in the left margin, beside the columns of courses, seen in
// three-quarter view, face turned to the right as if about to look at the courses. Drawn in a
// 300 x 520 box, lit from the top left: lumpy hand-packed snowballs (wobbly outlines) shaded round,
// a grainy snow texture, contact shadows and a snowdrift at its base, irregular lumps of coal, a
// carrot seen in perspective, a battered top hat tilted back with snow on the brim, a knitted scarf
// with one end blowing behind, tapering branches for arms. It blinks, now and then turns its face
// a little more towards the courses, and waves with the arm on that side (CSS).
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
    `<path d="M178,147C192,145 220,150 244,160 222,163 196,162 179,158 175,155 175,149 178,147Z" fill="url(#sm-carrot)"/>` +
    `<path d="M186,148q2,6 0,11M198,149q2,5 0,10M210,152q1.5,4 0,8M222,155q1,3 0,6" stroke="#a5470a" stroke-width="1.3" fill="none" stroke-linecap="round"/></g>` +
    // battered top hat tilted back, snow on the brim, red band with holly
    `<g transform="rotate(-9 164 104)"><ellipse cx="164" cy="106" rx="62" ry="14" fill="#16161d"/><ellipse cx="164" cy="104" rx="60" ry="12" fill="#25252f"/>` +
    `<path d="M126,104C125,80 127,56 129,36 150,30 180,30 201,36 202,58 203,82 202,104 188,111 140,111 126,104Z" fill="url(#sm-hat)"/>` +
    `<ellipse cx="165" cy="36" rx="36" ry="7.5" fill="#3a3a48"/><path d="M146,40c4,8 6,16 4,26" stroke="rgba(255,255,255,.08)" stroke-width="3" fill="none"/>` +
    `<path d="M126,86C140,92 188,92 202,86L202,100C188,107 140,107 126,100Z" fill="#a30d26"/>` +
    `<path d="M190,94c-6,-10 -16,-8 -20,-12 4,6 0,10 6,12 -4,2 0,6 -2,10 6,-4 10,-2 16,-10Z" fill="#1f7a3e"/><circle cx="190" cy="94" r="3.4" fill="#d6203a"/><circle cx="196" cy="90" r="3.2" fill="#c8102e"/>` +
    `<path d="M106,104c6,-6 14,-5 20,-2 6,-4 14,-3 18,1M190,100c6,-5 14,-5 20,0" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".9"/></g></g>` +
    // scarf around the neck, knotted on the right, its end hanging down the front
    `<path d="M108,196C122,214 196,216 212,196L215,212C198,232 120,232 104,212Z" fill="url(#sm-scarf)"/><path d="M108,196C122,214 196,216 212,196L215,212C198,232 120,232 104,212Z" fill="url(#sm-knit)"/>` +
    `<ellipse cx="196" cy="216" rx="11" ry="9" fill="#9b0d22"/>` +
    `<path d="M188,222C186,246 190,270 196,292L216,288C210,266 206,244 204,220Z" fill="url(#sm-scarf)"/><path d="M188,222C186,246 190,270 196,292L216,288C210,266 206,244 204,220Z" fill="url(#sm-knit)"/>` +
    `<path d="M190,244 207,242M192,264 210,262" stroke="rgba(255,255,255,.4)" stroke-width="4"/>` +
    `<path d="M197,292v9M201,291v11M205,290v9M209,290v10M213,289v8" stroke="#b3122e" stroke-width="2.2" stroke-linecap="round"/>` +
    // near arm, towards the courses: the one that waves
    `<g class="wave"><g class="twig">${branch(218, 258, 274, 212, 7)}${branch(250, 232, 280, 224, 3.5)}${branch(262, 222, 262, 194, 3)}</g></g></svg>`;
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
// Where the tree sits behind the cards (narrow screens), the sax would cover their text: it hangs
// on the garland instead, between two bulbs
const saxOnGarland = matchMedia("(max-width: 1240px)");
const placeSax = () => {
  if (saxOnGarland.matches) {
    saxBtn.style.cssText = `left:${Math.round(garland.w * .78)}px`;
    garland.append(saxBtn);
  } else {
    saxBtn.style.cssText = `left:${SAX.x / TREE_W * 100}%;top:${SAX.y / TREE_H * 100}%;width:${SAX.w / TREE_W * 100}%;height:${SAX.h / TREE_H * 100}%`;
    treeFront.append(saxBtn);
  }
};
saxOnGarland.addEventListener("change", placeSax);
saxBtn.addEventListener("click", e => {
  e.stopPropagation();
  xmasJazz = true;
  applyScreen();
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
const treeFrame = now => {
  treeT += Math.min(.05, (now - treeLast) / 1000);
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
  treeRaf = requestAnimationFrame(treeFrame);
};
const setTreeLights = on => {
  cancelAnimationFrame(treeRaf);
  removeEventListener("resize", treeResize);
  treeCanvas.remove();
  if (!on || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
      const dx = f.x - snowMouseX, dy = f.y - snowMouseY, d = Math.hypot(dx, dy);
      if (d < 80 && d > 0) { f.x += dx / d * (80 - d) * .05; f.y += dy / d * (80 - d) * .02; }
      if (f.y > fxH + 20) Object.assign(f, newFlake(true));
      if (f.x < -20) f.x += fxW + 40; else if (f.x > fxW + 20) f.x -= fxW + 40;
    }
  },
  draw(c) {
    const [dot, star] = FLAKES[document.body.dataset.phase === "christmas" ? "day" : "night"];
    for (const f of flakes) {
      c.globalAlpha = f.crystal ? .9 : .55 + Math.min(.45, f.r / 9);
      if (f.crystal) {
        c.save();
        c.translate(f.x, f.y);
        c.rotate(f.rot);
        c.drawImage(star, -f.r * 1.6, -f.r * 1.6, f.r * 3.2, f.r * 3.2);
        c.restore();
      } else c.drawImage(dot, f.x - f.r * 1.6, f.y - f.r * 1.6, f.r * 3.2, f.r * 3.2);
    }
    c.globalAlpha = 1;
  },
  reset() { flakes.length = 0; flakes.w = 0; },
});

// Santa's sleigh: at night, now and then at random (every 40 s to 4 min), Santa's sleigh crosses
// the sky far away: random height, size, speed and direction, on a gentle arc. Drawn flying to the
// left: Rudolph alone in front, his red nose glowing, then two pairs of reindeer (the far one of each
// pair darker and a little higher, for depth), all galloping (legs and bodies animated in CSS), in
// red harnesses with gold bells; then the red and gold sleigh on curled runners, Santa holding the
// reins, his sack of gifts behind him, and a trail of golden sparkles.
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
  (rudolph ? `<circle class="glow" cx="-2" cy="6" r="7"/><circle cx="-2" cy="6" r="2.4" fill="#ff2a2a"/><circle cx="-2.7" cy="5.3" r=".8" fill="#ffd0d0"/>`
    : `<circle cx="-2" cy="6" r="1.4" fill="#1a0e08"/>`) + `</g></g>`;
const sleighEl = document.createElement("div");
sleighEl.id = "sleigh";
sleighEl.setAttribute("aria-hidden", "true");
sleighEl.innerHTML = `<svg viewBox="-12 -34 452 100"><defs>` +
  `<linearGradient id="rd-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a26a40"/><stop offset="1" stop-color="#5a3118"/></linearGradient>` +
  `<linearGradient id="rd-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#76492a"/><stop offset="1" stop-color="#3b200e"/></linearGradient>` +
  `<linearGradient id="sl-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2384f"/><stop offset=".55" stop-color="#b3122e"/><stop offset="1" stop-color="#6e0716"/></linearGradient>` +
  `<radialGradient id="rd-glow"><stop offset="0" stop-color="rgba(255,60,60,.9)"/><stop offset="1" stop-color="rgba(255,60,60,0)"/></radialGradient>` +
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
  if (document.body.dataset.phase !== "christmas-night") { sleighFlight?.cancel(); sleighIn = 20 + Math.random() * 60; return; }
  if (--sleighIn <= 0) { sleighIn = 40 + Math.random() * 200; flySleigh(); }
});

// The garland reacts to the mouse, like the metal show's chains: passing the pointer through a swag
// makes it swing (a sideways shear from its hooks) and bounce (a vertical stretch), and knocks the
// baubles near the pointer, which then swing on their threads like pendulums. Springs bring
// everything back to rest; the loop only runs while something moves.
let garlandRaf = null, garlandLast = 0, gPrev = null;
const garlandStep = now => {
  const dt = Math.min(.033, (now - garlandLast) / 1000);
  garlandLast = now;
  let moving = false;
  for (const s of garlandSwags) {
    s.va += (-60 * s.a - 3.2 * s.va) * dt; s.a += s.va * dt;
    s.vs += (-90 * s.s - 4 * s.vs) * dt; s.s += s.vs * dt;
    s.a = Math.max(-.35, Math.min(.35, s.a));
    const still = Math.abs(s.a) + Math.abs(s.va) + Math.abs(s.s) + Math.abs(s.vs) < 1e-3;
    if (still) { s.a = s.va = s.s = s.vs = 0; s.el.removeAttribute("transform"); continue; }
    moving = true;
    s.el.setAttribute("transform", `translate(0 ${f1(s.top)}) skewX(${(s.a * 57.3).toFixed(2)}) scale(1 ${(1 + s.s).toFixed(4)}) translate(0 ${f1(-s.top)})`);
  }
  for (const b of garlandBobs) {
    b.w += (-(1500 / b.len) * Math.sin(b.th) - 1.6 * b.w) * dt; b.th += b.w * dt;
    b.th = Math.max(-1.1, Math.min(1.1, b.th));  // a thread, not a rod: never over the top
    if (Math.abs(b.th) + Math.abs(b.w) < 2e-3) { b.th = b.w = 0; b.el.removeAttribute("transform"); continue; }
    moving = true;
    b.el.setAttribute("transform", `rotate(${(b.th * 57.3).toFixed(2)} ${f1(b.px)} ${f1(b.py)})`);
  }
  garlandRaf = moving ? requestAnimationFrame(garlandStep) : null;
};
const garlandTouch = e => {
  if (!garland.isConnected || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const x = e.clientX, y = e.clientY + scrollY, now = performance.now();  // the garland is at the top of the page
  const prev = gPrev;
  gPrev = { x, y, now };
  if (!prev || y > 190 || now - prev.now > 100) return;
  const ms = Math.max(8, now - prev.now), vx = (x - prev.x) / ms, vy = (y - prev.y) / ms;  // px per ms
  let hit = false;
  for (const s of garlandSwags) {
    if (x < s.x0 || x > s.x1 || y < s.top - 10 || y > s.bottom + 40) continue;
    const mid = 1 - Math.abs((x - (s.x0 + s.x1) / 2) / ((s.x1 - s.x0) / 2));  // strongest in the middle of the swag
    s.va += vx * .5 * (.4 + mid);
    s.vs += vy * .25 * (.4 + mid);
    hit = true;
  }
  for (const b of garlandBobs) {
    const bx = b.px - Math.sin(b.th) * b.len, by = b.py + Math.cos(b.th) * b.len;  // where the bauble is now (SVG rotate: + turns it left)
    if (Math.hypot(x - bx, y - by) > b.r + 26) continue;
    b.w = Math.max(-5, Math.min(5, b.w - vx * 2.2 / Math.sqrt(b.len / 30)));  // pushed the way the pointer goes
    hit = true;
  }
  if (hit && !garlandRaf) { garlandLast = now; garlandRaf = requestAnimationFrame(garlandStep); }
};
addEventListener("pointermove", garlandTouch, { passive: true });

// Christmas music: a live of Christmas songs from YouTube, on a Christmas turntable in the bottom
// left corner (red lacquer and gold, snow on the lid, holly, a candy-cane tonearm). It starts with
// the screen and keeps playing from day to night. As for the jazz, without a user gesture yet it
// starts muted and the sound comes on at the first click or key press; pausing is remembered.
const XMAS_LIVE = "XSXEaikz0Bc";
let carols = null, carolsPlaying = false, carolsMuted = false, carolsSoundAt = 0;
const xmasDeck = document.createElement("button");
xmasDeck.id = "xmusic";
xmasDeck.type = "button";
xmasDeck.innerHTML = '<span class="deck"><span class="lid"></span><span class="disc"></span><span class="arm"></span>' +
  '<svg class="holly" viewBox="0 0 40 26" aria-hidden="true"><path d="M20,14C14,4 6,8 1,4 4,9 2,12 6,14 3,16 6,20 4,24 10,20 14,22 20,14Z" fill="#1f7a3e"/>' +
  '<path d="M20,14C26,4 34,8 39,4 36,9 38,12 34,14 37,16 34,20 36,24 30,20 26,22 20,14Z" fill="#17643a"/>' +
  '<circle cx="17" cy="15" r="3" fill="#d6203a"/><circle cx="23" cy="15" r="3" fill="#c8102e"/><circle cx="20" cy="11" r="3" fill="#e0263f"/></svg></span><span class="label"></span>';
const carolsOff = () => { try { return localStorage.getItem("xmas-music") === "off"; } catch (e) { return false; } };
const paintDeck = () => {
  xmasDeck.classList.toggle("playing", carolsPlaying);
  xmasDeck.querySelector(".label").textContent = !carolsPlaying ? "♪ Click for Christmas songs"
    : carolsMuted ? "🔇 Click anywhere for sound" : "♪ Christmas radio — click to pause";
  xmasDeck.title = !carolsPlaying ? "Play the music" : carolsMuted ? "Turn the sound on" : "Pause the music";
};
const carolsCommand = func => carols && carols.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
const carolsPlay = (muted = false) => {
  if (!carols) {
    carols = document.createElement("iframe");
    carols.id = "carols";
    carols.title = "Christmas music";
    carols.allow = "autoplay; encrypted-media";
    carols.src = `https://www.youtube.com/embed/${XMAS_LIVE}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&enablejsapi=1`;
    document.body.append(carols);
    carolsMuted = muted;
  } else carolsCommand("playVideo");
  carolsPlaying = true;
  try { localStorage.removeItem("xmas-music"); } catch (e) {}
  paintDeck();
};
const carolsSound = () => {
  if (!carols || !carolsMuted) return;
  carolsCommand("unMute");
  carolsMuted = false;
  carolsSoundAt = performance.now();
  paintDeck();
};
xmasDeck.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - carolsSoundAt < 600) return;  // this same click just turned the sound on
  if (carolsMuted) carolsSound();
  else if (carolsPlaying) {
    carolsCommand("pauseVideo");
    carolsPlaying = false;
    try { localStorage.setItem("xmas-music", "off"); } catch (e) {}
    paintDeck();
  } else carolsPlay();
});
const setCarols = on => {
  document.removeEventListener("pointerdown", carolsSound);
  document.removeEventListener("keydown", carolsSound);
  if (!on) { carols?.remove(); carols = null; carolsPlaying = carolsMuted = false; xmasDeck.remove(); return; }
  document.body.append(xmasDeck);
  if (!carolsOff()) {
    const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
    carolsPlay(!canSound);
    if (!canSound) {
      document.addEventListener("pointerdown", carolsSound, { once: true });
      document.addEventListener("keydown", carolsSound, { once: true });
    }
  }
  paintDeck();
};

// Back to Christmas from the jazz bar: a small fir with a star in the bottom right corner of the
// bar, only when the bar was opened with the sax
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
  applyScreen();
});
document.addEventListener("phase", e => {
  if (xmasJazz && SCREENS[e.detail]?.className === "night") document.body.append(firBtn); else firBtn.remove();
  if (e.detail === "christmas" || e.detail === "christmas-night") setTreeLights(e.detail === "christmas-night");
});

// Turning the screen on and off: the garland, the scene and the music come and go with the class
let garlandResize = null;
const onGarlandResize = () => {
  clearTimeout(garlandResize);
  garlandResize = setTimeout(() => { if (garland.w !== document.documentElement.clientWidth) buildGarland(); }, 200);
};
const setChristmas = on => {
  removeEventListener("resize", onGarlandResize);
  setCarols(on);
  if (!on) { [garland, scene, treeFront, sleighEl].forEach(el => el.remove()); setTreeLights(false); return; }
  if (!treeBuilt) {
    tree.innerHTML = buildTree();
    scene.innerHTML = MOUNTAINS;
    scene.append(tree, snowman);
    treeBuilt = true;
  }
  buildGarland();
  addEventListener("resize", onGarlandResize);
  document.body.prepend(garland, scene);
  document.body.append(treeFront);
};
setChristmas(document.body.classList.contains("christmas"));
document.addEventListener("christmas", e => setChristmas(e.detail));
