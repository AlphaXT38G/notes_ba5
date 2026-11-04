// ── Halloween castle ──────────────────────────────────────────────────────────────────────────
// Dracula's castle, on its crag behind the courses of the Halloween screens (drawn into the
// scene by hwscene.js): a gothic castle in silhouette, but carved in detail, so that its
// mouldings, its spikes and its monsters show, even if only as shadows:
//   - towers of several heights: some under steep spires bristling with crockets, with pinnacles
//     at their corners and an iron finial; the others flat, with a parapet on machicolations
//     (a row of corbels), battlements, and bartizans (little turrets) hanging at their corners;
//   - on every tower, string courses (a lit edge, the shadow they cast below), corner buttresses
//     with sloping caps, and gargoyles leaning out at the corners; the side the moon lights;
//   - lancet windows under hood mouldings, with their tracery (a mullion, a rondel) when lit;
//     a rose window on the keep, and its great window where a vampire passes now and then;
//   - flying buttresses springing from pinnacled piers to the keep; the curtain wall with its
//     machicolations, battlements and iron spikes; a gate with its portcullis; the crag below;
//   - tiny gargoyle statues on the walls and towers, and two windows with shutters, someone
//     inside (HW_GARGOYLES, HW_PORTALS: their games are in hwsecrets.js).
// All of it in the castle's own box (drawn larger, then scaled down on the crag: hwscene.js),
// with classes for the colours of day and night (css/halloween.css). Seeded, built once.
const HW_BASE = 468;  // where the castle stands on the crag
// x centre, width, top, kind ("spire" or "flat"), from the back to the front
const HW_TOWERS = [[985, 40, 300, "spire"], [1050, 60, 238, "flat"], [1145, 100, 150, "spire"], [1240, 56, 218, "spire"],
  [1312, 82, 280, "flat"], [1385, 44, 250, "spire"], [1440, 34, 330, "spire"]];
// An equilateral pointed arch standing on (x, y), w wide, h high (a lancet window, a gate)
const hwLancet = (x, y, w, h) => {
  const ys = y - h + w * .866;
  return `M${f1(x)},${f1(y)}V${f1(ys)}A${f1(w)},${f1(w)} 0 0 1 ${f1(x + w / 2)},${f1(y - h)}A${f1(w)},${f1(w)} 0 0 1 ${f1(x + w)},${f1(ys)}V${f1(y)}Z`;
};
// The hood moulding over an arch: only its pointed top, from one springing point to the other
const hwHood = (x, y, w, h) => {
  const ys = y - h + w * .866;
  return `M${f1(x)},${f1(ys + 4)}V${f1(ys)}A${f1(w)},${f1(w)} 0 0 1 ${f1(x + w / 2)},${f1(y - h)}A${f1(w)},${f1(w)} 0 0 1 ${f1(x + w)},${f1(ys)}v4`;
};
// A gargoyle leaning out of a wall at (x, y), to the right (dir 1) or the left (-1): a crouching
// beast with a bat's wing and an open jaw
const hwGargoyle = (x, y, dir) => `<path class="tw" transform="translate(${f1(x)},${f1(y)}) scale(${dir * 1.3},1.3)" ` +
  `d="M0,0L6,-3 10,-2 14,-5 16,-3 20,-4 23,-1 18,1 22,3 16,3 12,6 8,4 4,6 0,4ZM5,-2L8,-10 12,-3Z"/>`;
// Crockets along a roof's edge from (x0, y0) up to (x1, y1): little hooks of stone pointing out
const hwCrockets = (x0, y0, x1, y1, out) => {
  let d = "";
  const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 10);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    d += `M${f1(x)},${f1(y)}l${out * 4},-1 ${-out * 1.5},-3Z`;
  }
  return `<path class="tw" d="${d}"/>`;
};
// A pinnacle: a thin spike with a knob, standing on (x, y), h high
const hwPinnacle = (x, y, h, w = 5) => `<path class="roof" d="M${f1(x - w / 2)},${f1(y)}L${f1(x)},${f1(y - h)}L${f1(x + w / 2)},${f1(y)}Z"/>` +
  `<circle class="roof" cx="${f1(x)}" cy="${f1(y - h)}" r="1.4"/>`;
// A lancet window under its hood moulding; lit ones show their tracery
const hwWindow = (x, y, w, h, cls, rnd) => {
  const flick = cls.includes("flick") ? ` style="--d:${f1(-rnd() * 5)}s"` : "";
  let s = `<path class="hood" d="${hwHood(x - 2, y - 2, w + 4, h + 4)}"/><path class="${cls}" d="${hwLancet(x, y, w, h)}"${flick}/>`;
  if (cls.includes("lit") && w > 8) s += `<path class="trac" d="M${f1(x + w / 2)},${f1(y)}V${f1(y - h + w)}"/><circle class="trac" cx="${f1(x + w / 2)}" cy="${f1(y - h + w * .62)}" r="${f1(w * .2)}"/>`;
  return s;
};

// The vampire passing behind the great window, in silhouette against its light: a cape over broad
// shoulders, its high collar standing in two points, a head with pointed ears, eyes glinting red
const hwVampire = (x, y) => `<path d="M${x - 18},${y}L${x - 15},${y - 18}Q${x - 12},${y - 25} ${x - 5},${y - 26}H${x + 5}Q${x + 12},${y - 25} ${x + 15},${y - 18}L${x + 18},${y}Z` +
  `M${x - 5},${y - 26}L${x - 12},${y - 41}L${x - 2},${y - 30}ZM${x + 5},${y - 26}L${x + 12},${y - 41}L${x + 2},${y - 30}Z` +
  `M${x - 4},${y - 36}L${x - 8},${y - 43}L${x - 2.5},${y - 39}ZM${x + 4},${y - 36}L${x + 8},${y - 43}L${x + 2.5},${y - 39}Z"/>` +
  `<ellipse cx="${x}" cy="${y - 34}" rx="4.6" ry="6.2"/>` +
  `<circle class="draceye" cx="${x - 1.8}" cy="${y - 34}" r=".8"/><circle class="draceye" cx="${x + 1.8}" cy="${y - 34}" r=".8"/>`;

const hwCastleTower = ([x, w, top, kind], rnd, index) => {
  const l = x - w / 2, r = x + w / 2, H = HW_BASE - top;
  // the body, its moonlit side, its corner buttresses with their sloping caps
  let s = `<rect class="tw" x="${l}" y="${top}" width="${w}" height="${H}"/><rect class="rim" x="${f1(r - 4)}" y="${top}" width="4" height="${H}"/>`;
  for (const [bx, dir] of [[l - 5, -1], [r, 1]]) {
    for (let y = top + 60; y < HW_BASE; y += 70) s += `<path class="tw" d="M${f1(bx)},${f1(Math.min(HW_BASE, y + 70))}V${f1(y + 8)}L${f1(bx + (dir > 0 ? 0 : 5))},${f1(y)}L${f1(bx + 5)},${f1(y + (dir > 0 ? 8 : 0))}V${f1(Math.min(HW_BASE, y + 70))}Z"/>`;
  }
  // string courses: a lit edge, the shadow below it; gargoyles at the corners of some of them
  for (let y = top + 48, k = 0; y < HW_BASE - 30; y += 56, k++) {
    s += `<rect class="mold" x="${l - 2}" y="${f1(y)}" width="${w + 4}" height="2.4"/><rect class="mshade" x="${l}" y="${f1(y + 2.4)}" width="${w}" height="3.5"/>`;
    if (k % 2 === 0 && w > 38) s += hwGargoyle(r + 1, y - 1, 1) + hwGargoyle(l - 1, y - 1, -1);
  }
  if (kind === "spire") {
    const h = w * 2, peak = top - h;
    s += `<path class="roof" d="M${l - 6},${top}L${x},${f1(peak)}L${r + 6},${top}Z"/><path class="roof-rim" d="M${x},${f1(peak)}L${r + 6},${top}h-5Z"/>` +
      hwCrockets(l - 6, top, x, peak, -1) + hwCrockets(r + 6, top, x, peak, 1) +
      hwPinnacle(l - 4, top + 1, 22) + hwPinnacle(r + 4, top + 1, 22) +
      `<path class="spire" d="M${x},${f1(peak)}v-26M${x - 5},${f1(peak - 18)}h10"/><circle class="roof" cx="${x}" cy="${f1(peak - 6)}" r="2.2"/>` +
      `<rect class="mold" x="${l - 6}" y="${top - 1}" width="${w + 12}" height="3"/>`;
  } else {
    // parapet on machicolations, battlements, bartizans hanging at the corners
    const py = top - 12;
    s += `<rect class="tw" x="${l - 6}" y="${py}" width="${w + 12}" height="14"/><rect class="mold" x="${l - 6}" y="${py}" width="${w + 12}" height="2"/>`;
    for (let k = l - 4; k < r + 4; k += 8) s += `<path class="tw" d="M${f1(k)},${top + 2}h5l-1,7h-3Z"/><rect class="mshade" x="${f1(k + 1)}" y="${top + 2}" width="3" height="5"/>`;
    for (let k = l - 6; k < r + 6; k += 11) s += `<rect class="tw" x="${f1(k)}" y="${py - 9}" width="6.5" height="10"/><path class="spike" d="M${f1(k + 3.2)},${py - 9}v-6"/>`;
    for (const bx of [l - 12, r + 2]) {
      s += `<rect class="tw" x="${f1(bx)}" y="${py - 4}" width="10" height="30"/><path class="tw" d="M${f1(bx)},${py + 26}L${f1(bx + 5)},${py + 40}L${f1(bx + 10)},${py + 26}Z"/>` +
        `<path class="roof" d="M${f1(bx - 2)},${py - 4}L${f1(bx + 5)},${py - 26}L${f1(bx + 12)},${py - 4}Z"/><path class="spire" d="M${f1(bx + 5)},${py - 26}v-8"/>` +
        `<path class="win" d="${hwLancet(bx + 3.5, py + 16, 3, 9)}"/>`;
    }
  }
  // lancet windows: one or two columns, from under the roof down to the walls; the row of a portal
  // is its window, filling the storey between the two string courses
  const cols = w > 60 ? 2 : 1, ww = Math.min(13, w / 4.5);
  for (let y = top + 40, row = 0; y < HW_BASE - 70; y += 56, row++) {
    const portal = Object.keys(HW_PORTALS).find(n => HW_PORTALS[n].tower === index && HW_PORTALS[n].row === row);
    if (portal) { s += hwPortal(portal, x, y, HW_PORTALS[portal].w, y - (top + 48 + 56 * (row - 1) + 9)); continue; }
    for (let c = 0; c < cols; c++) {
      const cx = cols === 1 ? x - ww / 2 : l + w * (c ? .72 : .14), v = rnd();
      s += hwWindow(cx, y, ww, ww * 2.4, v < .45 ? "win lit" : v < .6 ? "win lit flick" : "win", rnd);
    }
  }
  return s;
};

// Gargoyle statues on their pedestals (img/gargoyle.png, cut by tools/gargoyle/cut.py), standing
// on the walls and towers, tiny: x, y of their feet, height, facing right (1) or left (-1). Their
// eye (HW_GARG_EYE, as parts of the image) lights red when they are clicked (hwsecrets.js);
// HW_GARG_RATIO is the image's width over its height (140 x 153 px).
const HW_GARGOYLES = [[1012, 366, 20, -1], [1088, 366, 18, 1], [1036, 217, 16, -1], [1064, 217, 16, 1],
  [1108, 150, 17, -1], [1182, 150, 17, 1], [1293, 259, 18, -1], [1331, 259, 18, 1]];
const HW_GARG_EYE = [.896, .428], HW_GARG_RATIO = 140 / 153;
const hwGargoyles = () => HW_GARGOYLES.map(([x, y, h, dir]) => {
  const w = h * HW_GARG_RATIO, ex = x + dir * (HW_GARG_EYE[0] - .5) * w, ey = y - h + HW_GARG_EYE[1] * h;
  return `<g class="statue"><image href="img/gargoyle.png" x="${f1(x - w / 2)}" y="${y - h}" width="${f1(w)}" height="${h}"` +
    `${dir < 0 ? ` transform="translate(${2 * x},0) scale(-1,1)"` : ""}/>` +
    `<circle class="geye-glow" cx="${f1(ex)}" cy="${f1(ey)}" r="2.6"/><circle class="geye" cx="${f1(ex)}" cy="${f1(ey)}" r=".7"/></g>`;
}).join("");
// Two windows with shutters (they open now and then, hwsecrets.js) and someone inside, in
// silhouette against the light: a knight in armour, his sword raised (the way to the epic finale),
// and a man playing the saxophone, swaying (the way to the jazz bar). The figures stand on x, y
// (the middle of the window's sill); the shutters fold open towards the sides.
const HW_KNIGHT = (x, y) => `<g class="figure knight"><path d="M${x - 7},${y}L${x - 6},${y - 16}L${x - 9},${y - 20}L${x - 8},${y - 27}H${x + 8}L${x + 9},${y - 20}L${x + 6},${y - 16}L${x + 7},${y}Z` +
  `M${x - 3.5},${y - 27}V${y - 33}Q${x},${y - 37} ${x + 3.5},${y - 33}V${y - 27}ZM${x},${y - 36}Q${x - 2},${y - 42} ${x - 6},${y - 41}Q${x - 2},${y - 39} ${x},${y - 35}Z"/>` +
  `<g class="sword"><path d="M${x + 6},${y - 22}L${x + 8},${y - 29}H${x + 10}L${x + 9},${y - 22}Z` +
  `M${x + 5},${y - 30}H${x + 12}V${y - 31.5}H${x + 5}ZM${x + 8},${y - 31.5}L${x + 8.6},${y - 48}L${x + 9.4},${y - 48}L${x + 10},${y - 31.5}Z"/></g></g>`;
const HW_SAXMAN = (x, y) => `<g class="figure saxman"><path d="M${x - 6},${y}L${x - 5},${y - 18}Q${x - 6},${y - 26} ${x},${y - 27}Q${x + 6},${y - 26} ${x + 5},${y - 18}L${x + 6},${y}Z` +
  `M${x},${y - 28}a3.6,4 0 1 1 .1,0ZM${x - 6},${y - 34}H${x + 6}V${y - 35}H${x + 4}V${y - 39}H${x - 4}V${y - 35}H${x - 6}Z` +
  `M${x + 2},${y - 29}L${x + 5},${y - 26}Q${x + 6},${y - 14} ${x + 9},${y - 11}Q${x + 13},${y - 9} ${x + 12},${y - 14}L${x + 10},${y - 15}Q${x + 10},${y - 12} ${x + 8},${y - 13}Q${x + 7},${y - 20} ${x + 5},${y - 28}Z"/></g>`;
// Each takes the place of a row of windows on a tower (tower and row in HW_TOWERS' order, w its
// width), between two string courses, framed in stone, on a little balcony held by corbels, its
// two shutters of planks.
const HW_PORTALS = { sax: { tower: 3, row: 2, w: 22, who: HW_SAXMAN }, knight: { tower: 4, row: 1, w: 30, who: HW_KNIGHT } };
const hwPortal = (name, x, y, w, h) => {
  const { who } = HW_PORTALS[name], l = x - w / 2, shape = hwLancet(l, y, w, h), id = `hw-portal-${name}`;
  let planks = "";
  for (let k = 1; k < 4; k++) planks += `M${f1(l + w * k / 8)},${f1(y - h)}V${y}M${f1(x + w * k / 8)},${f1(y - h)}V${y}`;
  const corbels = [-.35, 0, .35].map(u => `<path class="tw" d="M${f1(x + u * w - 2.5)},${y + 3}h5l-1.2,5h-2.6Z"/>`).join("");
  return `<g class="portal" data-portal="${name}"><clipPath id="${id}"><path d="${shape}"/></clipPath>` +
    `<path class="frame" d="${hwLancet(l - 2.5, y, w + 5, h + 2.5)}"/><path class="hood" d="${hwHood(l - 4, y - 2, w + 8, h + 5)}"/>` +
    `<path class="win lit" d="${shape}"/><g clip-path="url(#${id})"><g transform="translate(${x},${y}) scale(.82) translate(${-x},${-y})">${who(x, y)}</g>` +
    `<rect class="shutter left" x="${f1(l)}" y="${f1(y - h)}" width="${f1(w / 2)}" height="${h}"/><rect class="shutter right" x="${x}" y="${f1(y - h)}" width="${f1(w / 2)}" height="${h}"/>` +
    `<path class="planks" d="${planks}"/></g>` +
    `<rect class="mold" x="${f1(l - 6)}" y="${y}" width="${w + 12}" height="3"/><rect class="mshade" x="${f1(l - 5)}" y="${y + 3}" width="${w + 10}" height="2"/>${corbels}</g>`;
};

const HW_CASTLE = (() => {
  const rnd = seeded(31);
  // the crag: jagged rock falling from the castle to the hills, darker ledges
  const crag = "M880,700L905,560L930,520L962,505L990,470L1470,470L1500,498L1525,560L1560,700Z";
  let ledges = "";
  for (let i = 0; i < 12; i++) {
    const x = 920 + rnd() * 560, y = 495 + rnd() * 160;
    ledges += `M${f1(x)},${f1(y)}l${f1(30 + rnd() * 50)},${f1(-4 + rnd() * 8)}l-8,6Z`;
  }
  // the curtain wall: machicolations, battlements with iron spikes, the gate and its portcullis
  let walls = `<rect class="tw" x="996" y="380" width="438" height="${HW_BASE - 380}"/><rect class="mold" x="992" y="378" width="446" height="2.4"/>`;
  for (let k = 998; k < 1432; k += 8) walls += `<path class="tw" d="M${k},380h5l-1,7h-3Z"/>`;
  walls += `<rect class="mshade" x="996" y="388" width="438" height="4"/>`;
  for (let k = 994; k < 1436; k += 12) walls += `<rect class="tw" x="${k}" y="366" width="7" height="13"/><path class="spike" d="M${k + 3.5},366v-8"/>`;
  for (let y = 410; y < HW_BASE; y += 30) walls += `<rect class="mold" x="996" y="${y}" width="438" height="1.6"/><rect class="mshade" x="996" y="${y + 1.6}" width="438" height="2.4"/>`;
  walls += `<path class="hood" d="${hwHood(1192, HW_BASE - 2, 46, 70)}"/><path class="gate" d="${hwLancet(1195, HW_BASE, 40, 66)}"/>` +
    `<path class="trac" d="M1201,${HW_BASE}V418M1208,${HW_BASE}V408M1215,${HW_BASE}V404M1222,${HW_BASE}V408M1229,${HW_BASE}V418M1195,430H1235M1195,446H1235"/>`;
  // flying buttresses: arches from pinnacled piers up to the keep's walls
  const [kx, kw, kt] = HW_TOWERS[2];
  let flying = "";
  for (const [px, dir] of [[1082, 1], [1208, -1]]) {
    const wx = dir > 0 ? kx - kw / 2 : kx + kw / 2;
    flying += `<rect class="tw" x="${px - 6}" y="300" width="12" height="${HW_BASE - 300}"/>${hwPinnacle(px, 301, 30, 10)}` +
      `<path class="fly" d="M${px},318Q${(px + wx) / 2},${kt + 150} ${wx},${kt + 140}"/><path class="fly" d="M${px},346Q${(px + wx) / 2},${kt + 196} ${wx},${kt + 186}"/>`;
  }
  const towers = HW_TOWERS.map((t, i) => hwCastleTower(t, rnd, i));
  // the keep: its rose window, and its great window, where the vampire passes
  const ry = kt + 46, gw = 22, gy = kt + 180;
  const spokes = Array.from({ length: 8 }, (_, i) => `M${kx},${ry}l${f1(Math.cos(i * Math.PI / 4) * 12.5)},${f1(Math.sin(i * Math.PI / 4) * 12.5)}`).join("");
  const keep = `<circle class="hood" cx="${kx}" cy="${ry}" r="16"/><circle class="win lit rose" cx="${kx}" cy="${ry}" r="13.5"/>` +
    `<path class="trac" d="${spokes}"/><circle class="trac" cx="${kx}" cy="${ry}" r="5"/><circle class="trac" cx="${kx}" cy="${ry}" r="9"/>` +
    `<clipPath id="hw-great"><path d="${hwLancet(kx - gw / 2, gy, gw, 60)}"/></clipPath><path class="hood" d="${hwHood(kx - gw / 2 - 3, gy - 3, gw + 6, 66)}"/>` +
    `<path class="win lit great" d="${hwLancet(kx - gw / 2, gy, gw, 60)}"/>` +
    `<g clip-path="url(#hw-great)"><g class="dracsil">${hwVampire(kx, gy)}</g></g>`;
  const path = `<path class="path" d="M1215,${HW_BASE}C1230,520 1120,540 1150,580S1260,640 1230,700"/>`;
  return `<path class="crag" d="${crag}"/><path class="ledges" d="${ledges}"/>${towers.slice(0, 2).join("")}${walls}${flying}` +
    `${towers[2]}${keep}${towers.slice(3).join("")}${hwGargoyles()}${path}`;
})();
