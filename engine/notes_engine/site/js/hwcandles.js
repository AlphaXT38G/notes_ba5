// ── Halloween candles ─────────────────────────────────────────────────────────────────────────
// Three church candles of uneven heights (one a broad, short pillar) standing on the right end of
// the search bar of the Halloween screens (halloween.js), their wax running down over its edge,
// and a fourth one alone on the Previews button, its wax running over it. Each one is drawn in
// SVG, lit from its own flame:
//   - the wax is cream at the top, warming to peach and amber towards the foot, rounded by a
//     shade across it, and glows from inside under the flame, as wax lets light through;
//   - its top has melted into an uneven lip around a hollow, drips run down its side (lighter on
//     their crest, ending in a drop), and a pool of wax spreads at its foot, over the bar;
//   - the flame is layered like a real one: a blue root, an orange body, a white-yellow heart,
//     a wide halo, all flickering each at its own pace (CSS, transform and opacity only); the
//     candles cast a warm light that breathes on the page around them;
//   - wax has run over the bar's edge and the switch's in a few drips (placed by hwCandlePlace,
//     from where the bar ends: it moves with the layout, the switch wrapping below it on phones).
// The candles really melt: while lit they burn down (a candle lasts about 25 minutes), and their
// height is remembered between visits (localStorage). A click on a candle blows it out (a wisp of
// smoke), another lights it again; a candle burnt down to a stub is replaced by a new one.
const HW_CANDLES = [  // width, height when new (px), drips: [x as a part of the width, length, drop]
  { w: 18, h: 60, drips: [[.15, 16, 1], [.8, 24, 1]] },
  { w: 34, h: 42, drips: [[.08, 20, 1], [.35, 10, 0], [.7, 26, 1], [.92, 12, 1]] },
  { w: 21, h: 82, drips: [[.2, 30, 1], [.75, 16, 1], [.5, 8, 0]] },
  { w: 20, h: 36, drips: [[.25, 12, 1], [.8, 18, 1]], alone: true },  // on Previews, under the header buttons
];
const HW_BURN = 1 / (25 * 60);  // the part of a new candle burnt per second
const hwCandleH = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem("hw-candles"));
    if (Array.isArray(saved) && saved.length === HW_CANDLES.length && saved.every(h => h > .1 && h <= 1)) return saved;
  } catch (e) {}
  return HW_CANDLES.map(() => 1);
})();  // heights, as a part of a new candle's

// One candle, h pixels high (the lip, the drips and the pool around it): the SVG is drawn in
// pixels, its foot at the bottom of its box, the pool spilling out on both sides
const hwCandleSvg = ({ w, drips }, h, i) => {
  const W = w + 28, H = h + 10, x0 = 14, x1 = 14 + w, top = 6, mid = x0 + w / 2, id = `hwk${i}`;
  const body = Math.max(0, H - top - 9);  // nothing left of it under the lip once burnt down
  const lip = `M${x0 - 2},${top + 5}C${x0 - 3},${top - 1} ${f1(x0 + w * .2)},${top - 2} ${f1(x0 + w * .35)},${top + 1}C${f1(x0 + w * .5)},${top + 3} ${f1(x0 + w * .6)},${top - 2} ${f1(x0 + w * .8)},${top}` +
    `C${x1 + 2},${top} ${x1 + 3},${top + 3} ${x1 + 2},${top + 7}L${x1},${top + 9}H${x0}Z`;
  const runs = drips.map(([u, len, drop]) => {
    const x = x0 + u * w, l = Math.max(4, Math.min(len * (.6 + .4 * h / 60), h - 14)), r = 2.4;
    return `M${f1(x - r)},${top + 6}V${f1(top + 6 + l)}a${r},${r} 0 0 0 ${2 * r},0V${top + 6}Z` +
      (drop ? `M${f1(x - r - .6)},${f1(top + 6 + l)}a${r + .6},${r + 1.2} 0 1 0 ${f1(2 * r + 1.2)},0Z` : "");
  }).join("");
  const pool = `M${x0 - 12},${H - 1}C${x0 - 14},${H - 6} ${x0 - 4},${H - 7} ${x0},${H - 6}H${x1}C${x1 + 6},${H - 8} ${x1 + 14},${H - 5} ${x1 + 12},${H - 1}C${x1 + 8},${H + 1} ${x0 - 6},${H + 1} ${x0 - 12},${H - 1}Z`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs>` +
    `<linearGradient id="${id}b" x2="0" y2="1"><stop offset="0" stop-color="#fdf3d8"/><stop offset=".35" stop-color="#f6d3a0"/><stop offset="1" stop-color="#d98a5a"/></linearGradient>` +
    `<linearGradient id="${id}r"><stop offset="0" stop-color="#5a1a08" stop-opacity=".45"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset=".45" stop-color="#fff" stop-opacity=".18"/><stop offset=".75" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a1a08" stop-opacity=".55"/></linearGradient>` +
    `<radialGradient id="${id}g" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".5" stop-color="#ff9a3a" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a20" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}d" x2="1"><stop offset="0" stop-color="#e8b47c"/><stop offset=".45" stop-color="#fff4dc"/><stop offset="1" stop-color="#d9965e"/></linearGradient></defs>` +
    `<path d="${pool}" fill="url(#${id}d)"/><path d="M${x0 - 6},${H - 3}Q${mid},${H - 5} ${x1 + 6},${H - 3}" stroke="#fff6e0" stroke-opacity=".6" fill="none"/>` +
    `<rect x="${x0}" y="${top + 4}" width="${w}" height="${body}" fill="url(#${id}b)"/>` +
    `<rect class="glow" x="${x0}" y="${top + 4}" width="${w}" height="${Math.min(46, body)}" fill="url(#${id}g)"/>` +
    `<rect x="${x0}" y="${top + 4}" width="${w}" height="${body}" fill="url(#${id}r)"/>` +
    `<path d="${runs}" fill="url(#${id}d)"/><path d="${lip}" fill="#fdf1d2"/>` +
    `<ellipse cx="${mid}" cy="${top + 4}" rx="${f1(w * .34)}" ry="2.2" fill="#e9b070"/><ellipse class="glow" cx="${mid}" cy="${top + 4}" rx="${f1(w * .3)}" ry="1.6" fill="#ffd27a"/>` +
    `<path d="M${mid},${top + 4}q.5,-3 1.5,-5" stroke="#2a1a10" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>`;
};
// The flame of a candle: halo, orange body, white heart, blue root
const HW_FLAME = '<span class="flame"><i class="halo"></i><i class="body"></i><i class="heart"></i><i class="root"></i></span>';

const hwCandles = document.createElement("div"), hwCandleSolo = document.createElement("div");
hwCandles.className = hwCandleSolo.className = "hwcandles";
hwCandleSolo.classList.add("solo");
// Wax run over an edge: drips hanging from it, each a finger ending in a drop (d: its path, in a
// 200 x 30 box)
const hwWaxRun = (id, d) => {
  const el = document.createElement("div");
  el.className = "hwwax";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x2="1">` +
    `<stop offset="0" stop-color="#e2a46c"/><stop offset=".45" stop-color="#fff2d6"/><stop offset="1" stop-color="#d08a54"/></linearGradient></defs>` +
    `<path fill="url(#${id})" d="${d}"/></svg>`;
  return el;
};
const hwWaxBar = hwWaxRun("hwwax-a", "M0,0H200V3C192,3 190,4 188,6V16A3,3 0 0 1 182,16V6C176,4 170,4 160,4V10A3,3 0 0 1 154,10V4C140,4 130,5 126,6" +
  "V24A3.5,3.5 0 0 1 119,24V6C104,4 92,4 80,5V12A3,3 0 0 1 74,12V5C50,4 30,3 0,3Z");
const hwWaxView = hwWaxRun("hwwax-b", "M0,0H200V3C186,3 176,4 170,6V20A3.5,3.5 0 0 1 163,20V6C140,4 120,4 104,5V11A3,3 0 0 1 98,11V5C60,4 30,3 0,3Z");
hwWaxView.classList.add("view-run");
const hwCandleEls = HW_CANDLES.map((c, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "candle lit";
  b.style.setProperty("--d", `${(-i * .37).toFixed(2)}s`);
  b.title = "Blow out the candle";
  b.setAttribute("aria-label", "Candle");
  (c.alone ? hwCandleSolo : hwCandles).append(b);
  return b;
});
// Draw a candle at its height (again when it has melted by a pixel or more)
const hwCandleDrawn = HW_CANDLES.map(() => 0);
const hwCandlePaint = i => {
  const px = Math.round(HW_CANDLES[i].h * hwCandleH[i]);
  if (px === hwCandleDrawn[i]) return;
  hwCandleDrawn[i] = px;
  hwCandleEls[i].innerHTML = HW_FLAME + hwCandleSvg(HW_CANDLES[i], px, i);
};
const hwSmoke = b => {
  const puff = document.createElement("span");
  puff.className = "hwsmoke";
  b.append(puff);
  setTimeout(() => puff.remove(), 2600);
};
hwCandleEls.forEach((b, i) => b.addEventListener("click", e => {
  e.stopPropagation();
  if (b.classList.contains("lit")) { b.classList.remove("lit"); hwSmoke(b); hwNoise(.25, 900, "bandpass", .12); }
  else { if (hwCandleH[i] < .2) { hwCandleH[i] = 1; hwCandlePaint(i); } b.classList.add("lit"); }
  b.title = b.classList.contains("lit") ? "Blow out the candle" : "Light the candle";
}));
// Burning down, once a second; saved every 10 seconds
let hwSaveIn = 10;
everySecond.push(() => {
  if (!hwCandles.isConnected) return;
  hwCandleEls.forEach((b, i) => {
    if (!b.classList.contains("lit")) return;
    hwCandleH[i] = Math.max(.12, hwCandleH[i] - HW_BURN);
    if (hwCandleH[i] <= .12) { b.classList.remove("lit"); hwSmoke(b); }  // burnt down: it goes out
    hwCandlePaint(i);
  });
  if (--hwSaveIn <= 0) {
    hwSaveIn = 10;
    try { localStorage.setItem("hw-candles", JSON.stringify(hwCandleH.map(h => +h.toFixed(4)))); } catch (e) {}
  }
});
// Placing the candles and the wax on the bar's right end, from where it is laid out (the switch
// beside it, or below it on phones)
const hwCandlePlace = () => {
  const row = document.querySelector(".searchrow"), bar = document.getElementById("search");
  if (!row || !bar || !hwCandles.isConnected) return;
  const right = row.clientWidth - bar.offsetLeft - bar.offsetWidth, top = bar.offsetTop;
  hwCandles.style.right = `${right + 10}px`;
  hwCandles.style.bottom = `${row.clientHeight - top - 9}px`;
  hwWaxBar.style.right = `${right + 2}px`;
  hwWaxBar.style.top = `${top - 1}px`;
};
hwPart({
  on() {
    const row = document.querySelector(".searchrow"), view = document.querySelector(".view");
    if (!row || !view) return;
    HW_CANDLES.forEach((c, i) => hwCandlePaint(i));
    row.append(hwWaxBar, hwCandles);
    view.append(hwWaxView, hwCandleSolo);
    hwCandlePlace();
    addEventListener("resize", hwCandlePlace);
  },
  off() {
    [hwCandles, hwCandleSolo, hwWaxBar, hwWaxView].forEach(el => el.remove());
    removeEventListener("resize", hwCandlePlace);
  },
});
