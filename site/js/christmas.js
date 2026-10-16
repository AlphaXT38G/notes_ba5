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
const NEEDLES = ["#1b5a31", "#246b3c", "#123f22", "#2f7d48"];

// Garland across the top of the page: swags of fir with snow on them and red bows at the hooks,
// and a string of glass bulbs hanging below. By day the bulbs are plain coloured glass; at night
// (CSS) the lit glass and a halo show, twinkling each at its own pace. Rebuilt to the page width.
const garland = document.createElement("div");
garland.id = "garland";
garland.setAttribute("aria-hidden", "true");
const buildGarland = () => {
  const W = Math.max(320, document.documentElement.clientWidth), n = Math.max(2, Math.round(W / 210)), S = W / n, rnd = seeded(12);
  const needles = NEEDLES.map(() => []), snow = [], bows = [], bulbs = [];
  let fir = "", wire = "";
  for (let k = 0; k < n; k++) {
    const x0 = k * S, x1 = x0 + S, cx = x0 + S / 2;
    fir += `M${f1(x0)},6Q${f1(cx)},50 ${f1(x1)},6`;
    for (let i = 0; i <= 80; i++) {  // needles bristling out of the swag, in four greens
      const [x, y] = quad(x0, 6, cx, 50, x1, 6, i / 80);
      for (let j = 0; j < 3; j++) {
        const a = rnd() * Math.PI * 2, l = 6 + rnd() * 7;
        needles[(rnd() * 4) | 0].push(`M${f1(x)},${f1(y)}l${f1(Math.cos(a) * l)},${f1(Math.sin(a) * l)}`);
      }
      if (i % 4 === 2 && rnd() < .7) snow.push(`<circle cx="${f1(x + (rnd() - .5) * 6)}" cy="${f1(y - 5 - rnd() * 3)}" r="${f1(1.6 + rnd() * 2.2)}"/>`);
    }
    wire += `M${f1(x0)},12Q${f1(cx)},74 ${f1(x1)},12`;
    [.13, .31, .5, .69, .87].forEach((t, i) => {
      const [x, y] = quad(x0, 12, cx, 74, x1, 12, t), c = (k * 5 + i) % XMAS_LIGHTS.length, [glass, lit] = XMAS_LIGHTS[c];
      bulbs.push(`<g class="bulb" transform="translate(${f1(x)},${f1(y)}) rotate(${f1((rnd() - .5) * 16)})" style="--d:${f1(-rnd() * 4)}s;--t:${f1(1.8 + rnd() * 2.4)}s">` +
        `<circle class="halo" cy="14" r="17" fill="url(#xg${c})"/><path class="glass" fill="${glass}" d="M-5,5C-6.5,11-4,17 0,22 4,17 6.5,11 5,5Z"/>` +
        `<path class="lit" fill="${lit}" d="M-5,5C-6.5,11-4,17 0,22 4,17 6.5,11 5,5Z"/><ellipse class="gloss" cx="-1.8" cy="11" rx="1.3" ry="3.6"/>` +
        `<rect class="cap" x="-3" y="-1" width="6" height="7" rx="1"/></g>`);
    });
  }
  for (let k = 0; k <= n; k++) {
    bows.push(`<g class="bow" transform="translate(${f1(k * S)},9)"><path d="M0,0C-15,-13-24,5-5,4ZM0,0C15,-13 24,5 5,4Z"/>` +
      `<path d="M-2,2-10,21-5,18-2,23ZM2,2 10,21 5,18 2,23Z"/><circle r="3.4"/></g>`);
  }
  const glows = XMAS_LIGHTS.map(([, , rgb], i) =>
    `<radialGradient id="xg${i}"><stop offset="0" stop-color="rgb(${rgb})" stop-opacity=".85"/><stop offset="1" stop-color="rgb(${rgb})" stop-opacity="0"/></radialGradient>`).join("");
  garland.innerHTML = `<svg width="${W}" height="100" viewBox="0 0 ${W} 100"><defs>${glows}</defs>` +
    `<path class="wire" d="${wire}"/>${bulbs.join("")}<path class="fir" d="${fir}"/>` +
    needles.map((d, i) => `<path stroke="${NEEDLES[i]}" class="needles" d="${d.join("")}"/>`).join("") +
    `<g class="snow">${snow.join("")}</g>${bows.join("")}</svg>`;
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
const MOUNTAINS = `<svg class="mountains" viewBox="0 0 1600 300" preserveAspectRatio="xMidYMax slice">` +
  `<path class="m1" d="M0,190 120,120 210,160 330,70 430,140 520,95 640,165 760,60 880,150 990,100 1110,170 1230,80 1340,145 1450,105 1600,160V300H0Z"/>` +
  `<path class="caps" d="M300,92 330,70 362,94 345,90 330,100 316,88ZM728,84 760,60 792,86 774,82 760,94 744,80ZM1200,102 1230,80 1262,104 1244,99 1230,110 1214,98Z"/>` +
  `<path class="m2" d="M0,230 140,170 260,210 400,150 540,215 690,160 820,220 980,165 1120,225 1260,170 1400,215 1600,180V300H0Z"/>` +
  `<path class="ground-shade" d="M0,262C200,236 380,252 560,246S900,232 1100,248 1450,238 1600,246V300H0Z"/>` +
  `<path class="ground" d="M0,270C220,246 400,262 580,256S920,244 1120,258 1460,248 1600,256V300H0Z"/></svg>`;
// The snowman: a big companion standing in the left margin, beside the columns of courses. Drawn in
// a 300 x 520 box, lit from the top left so it looks round: shaded snowballs with contact shadows
// where they meet and a shadow on the ground, glossy coal, a ridged carrot, a knitted scarf with
// fringes, a top hat with a holly sprig, twig arms. It sways a little, blinks, and now and then
// waves with its right arm (CSS).
const SNOWMAN = (() => {
  const rnd = seeded(31), speckles = [];
  for (const [cx, cy, r] of [[150, 405, 95], [150, 255, 70], [150, 140, 52]]) {
    for (let i = 0; i < r / 3; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * .9;
      speckles.push(`<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d)}" r="${f1(.8 + rnd() * 1.4)}"/>`);
    }
  }
  const coal = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#sm-coal)"/><circle cx="${f1(x - r * .35)}" cy="${f1(y - r * .35)}" r="${f1(r * .28)}" fill="rgba(255,255,255,.7)"/>`;
  const smile = [[130, 160], [139, 166], [150, 168], [161, 166], [170, 160]].map(([x, y]) => coal(x, y, 3.2)).join("");
  return `<svg viewBox="0 0 300 520" aria-hidden="true"><defs>` +
    `<radialGradient id="sm-snow" cx=".36" cy=".3" r=".78"><stop class="k1" offset="0"/><stop class="k2" offset=".45"/><stop class="k3" offset=".82"/><stop class="k4" offset="1"/></radialGradient>` +
    `<radialGradient id="sm-ground"><stop offset="0" stop-color="rgba(30,50,90,.35)"/><stop offset="1" stop-color="rgba(30,50,90,0)"/></radialGradient>` +
    `<radialGradient id="sm-contact"><stop offset="0" stop-color="rgba(60,85,130,.45)"/><stop offset="1" stop-color="rgba(60,85,130,0)"/></radialGradient>` +
    `<radialGradient id="sm-coal" cx=".35" cy=".3"><stop offset="0" stop-color="#6a6a74"/><stop offset=".5" stop-color="#22222a"/><stop offset="1" stop-color="#0a0a0e"/></radialGradient>` +
    `<linearGradient id="sm-carrot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb35a"/><stop offset=".5" stop-color="#ec7a16"/><stop offset="1" stop-color="#b4500a"/></linearGradient>` +
    `<linearGradient id="sm-hat" x1="0" x2="1"><stop offset="0" stop-color="#454556"/><stop offset=".3" stop-color="#2a2a36"/><stop offset=".75" stop-color="#121218"/><stop offset="1" stop-color="#25252f"/></linearGradient>` +
    `<linearGradient id="sm-scarf" x1="0" x2="1"><stop offset="0" stop-color="#e2384f"/><stop offset=".55" stop-color="#b3122e"/><stop offset="1" stop-color="#6e0716"/></linearGradient>` +
    `</defs><ellipse cx="160" cy="498" rx="125" ry="18" fill="url(#sm-ground)"/>` +
    // left arm, behind the body
    `<path class="twig" d="M95,250 32,205M58,224 40,196M46,214 18,206"/>` +
    `<circle cx="150" cy="405" r="95" fill="url(#sm-snow)"/><ellipse cx="150" cy="322" rx="62" ry="13" fill="url(#sm-contact)"/>` +
    `<circle cx="150" cy="255" r="70" fill="url(#sm-snow)"/><ellipse cx="150" cy="192" rx="44" ry="10" fill="url(#sm-contact)"/>` +
    `<g class="speckles">${speckles.join("")}</g>` +
    coal(150, 236, 6) + coal(150, 262, 6.5) + coal(150, 290, 7) + coal(150, 380, 7.5) +
    `<g class="head"><circle cx="150" cy="140" r="52" fill="url(#sm-snow)"/>` +
    `<g class="eyes">${coal(132, 126, 5.5)}${coal(168, 126, 5.5)}</g>${smile}` +
    `<path d="M150,138C166,136 196,144 216,152 194,154 166,152 150,150Z" fill="url(#sm-carrot)"/>` +
    `<path d="M168,139l2,11M180,142l1.5,9M192,146l1,6" stroke="#a5470a" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    // top hat: brim, crown, red band with holly
    `<ellipse cx="150" cy="96" rx="62" ry="13" fill="#1a1a22"/><path d="M110,94V30C110,22 190,22 190,30V94C190,104 110,104 110,94Z" fill="url(#sm-hat)"/>` +
    `<ellipse cx="150" cy="30" rx="40" ry="7" fill="#3a3a48"/><path d="M110,76H190V90C190,96 110,96 110,90Z" fill="#b3122e"/>` +
    `<path d="M172,84c-6,-10 -16,-8 -20,-12 4,6 0,10 6,12 -4,2 0,6 -2,10 6,-4 10,-2 16,-10Z" fill="#1f7a3e"/>` +
    `<circle cx="172" cy="84" r="3.4" fill="#d6203a"/><circle cx="178" cy="80" r="3.4" fill="#c8102e"/></g>` +
    // scarf: band around the neck, and a hanging end with fringes
    `<path d="M96,184C110,200 190,200 204,184L208,200C192,218 108,218 92,200Z" fill="url(#sm-scarf)"/>` +
    `<path d="M104,190C120,200 138,203 150,203M120,198v14M140,202v14M160,202v14M180,198v14" stroke="rgba(255,255,255,.35)" stroke-width="2" fill="none"/>` +
    `<path d="M168,204 186,206 194,276 172,278Z" fill="url(#sm-scarf)"/><path d="M172,226 192,226M174,250 194,250" stroke="rgba(255,255,255,.45)" stroke-width="4"/>` +
    `<path d="M172,278v10M177,278v12M182,277v10M187,277v12M192,276v9" stroke="#b3122e" stroke-width="2.2" stroke-linecap="round"/>` +
    // right arm, in front, the one that waves
    `<g class="wave"><path class="twig" d="M204,248 262,196M240,216 270,206M250,206 248,178"/></g></svg>`;
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

// Santa's sleigh: at night, now and then at random (every 40 s to 4 min), a small sleigh pulled by
// four reindeer, Rudolph's nose glowing in front, crosses the sky far away: random height, size,
// speed and direction, on a gentle arc, leaving a short golden trail.
const REINDEER = x => `<g transform="translate(${x + 33},0) scale(-1,1)"><path d="M0,14C2,8 14,7 22,10L26,4 24,0 27,-1 29,3 31,-1 33,1 30,6 31,9C33,10 33,13 30,13L24,15C22,18 18,19 14,18L16,26 13,26 11,19 6,19 4,26 1,26 3,18C0,18-1,16 0,14Z"/></g>`;
const sleighEl = document.createElement("div");
sleighEl.id = "sleigh";
sleighEl.setAttribute("aria-hidden", "true");
sleighEl.innerHTML = `<svg viewBox="0 0 260 60"><g class="team">${[0, 38, 76, 114].map(REINDEER).join("")}</g>` +
  `<path class="reins" d="M150,28C140,22 160,18 150,16M150,28C120,24 60,20 30,16"/>` +
  `<path class="sleigh" d="M150,22h70c8,0 12,-12 22,-12v6c-6,0 -8,14 -20,14h-66ZM146,40h92c6,0 9,-3 12,-6l2,2c-3,4 -7,8 -14,8h-92ZM160,30v10M210,30v10"/>` +
  `<path class="santa" d="M190,22c0,-10 4,-16 10,-16s10,6 10,16ZM197,6l8,-6 4,4ZM214,22c0,-8 4,-12 12,-12s10,6 8,12Z"/>` +
  `<circle class="nose" cx="1.5" cy="11" r="2.6"/></svg>`;
let sleighIn = 20 + Math.random() * 60;  // seconds before the next flight
let sleighFlight = null;
const flySleigh = () => {
  if (document.hidden || sleighEl.isConnected || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ltr = Math.random() < .5, w = 70 + Math.random() * 60, y = 15 + Math.random() * 25, rise = (Math.random() - .5) * 10;
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
