// ── Halloween castle: what moves on it ─────────────────────────────────────────────────────────
// Dracula's castle (hwcastle.js) is stone; this is what lives on it, drawn into the castle's box
// with it (hwscene.js puts HW_CASTLE_LIFE after HW_CASTLE) and moved by CSS (css/hwlife.css,
// transform and opacity only):
//   - two swallow-tailed banners on poles above the flat towers, rippling, flapping hard in a gust
//     of wind (#hwscene.gust, hwmotion.js);
//   - a chimney on the bigger flat tower, its smoke rising in puffs, carried off to the right;
//   - three crows circling round the keep's spire, each on its own ellipse, at its own pace,
//     beating their wings, turning back at each end.
// What lights up in its windows (a light walking from window to window at night) and the bats
// bursting from the keep are in hwmotion.js.
const HW_CASTLE_LIFE = (() => {
  // a banner on a pole standing on a flat tower's battlements: the cloth in two layers, the fold
  // behind it darker, rippling a little out of step
  const banner = (x, base, h, d) => `<g class="banner" style="--d:${d}s"><path class="pole" d="M${x},${base}V${base - h}"/>` +
    `<circle class="pole-top" cx="${x}" cy="${base - h - 1.5}" r="2"/>` +
    `<path class="cloth fold" d="M${x + 1},${base - h + 1}C${x + 12},${base - h - 2} ${x + 24},${base - h + 4} ${x + 36},${base - h + 1}L${x + 30},${base - h + 8} ${x + 36},${base - h + 15}C${x + 24},${base - h + 18} ${x + 12},${base - h + 12} ${x + 1},${base - h + 15}Z"/>` +
    `<path class="cloth" d="M${x + 1},${base - h + 1}C${x + 11},${base - h - 3} ${x + 22},${base - h + 3} ${x + 34},${base - h}L${x + 28},${base - h + 7} ${x + 34},${base - h + 14}C${x + 22},${base - h + 17} ${x + 11},${base - h + 11} ${x + 1},${base - h + 14}Z"/></g>`;
  // the chimney on the right flat tower, and its puffs of smoke, each starting at its own moment
  const chimney = `<rect class="tw" x="1288" y="236" width="10" height="24"/><rect class="mold" x="1286" y="234" width="14" height="3"/>` +
    Array.from({ length: 6 }, (_, i) => `<circle class="puff" cx="1293" cy="232" r="7" style="--d:${f1(-i * 1.15)}s"/>`).join("");
  // a crow: its body facing right and two wings beating; on an ellipse (rx, ry) round the spire, in
  // t seconds there and back, starting at phase p (s)
  const crow = (rx, ry, t, p, k) => `<g class="crow-x" style="--rx:${rx}px;--t:${t}s;--p:${p}s"><g class="crow-y" style="--ry:${ry}px">` +
    `<g class="crow-turn"><g transform="scale(${k})"><path class="crow" d="M-7,0Q-2,-3 5,-1L9,-2 8,0 5,1Q-2,3-7,1L-11,2-9,0Z"/>` +
    `<path class="crow wing" d="M-3,-1Q-7,-10-13,-12Q-7,-5 2,-1Z"/><path class="crow wing far" d="M0,-1Q-2,-8-7,-11Q-3,-5 3,-1Z"/></g></g></g></g>`;
  return `<g class="castle-life"><defs><radialGradient id="hw-puff-g"><stop offset="0" class="smoke" stop-opacity=".7"/><stop offset="1" class="smoke" stop-opacity="0"/></radialGradient></defs>` +
    banner(1050, 217, 52, 0) + banner(1312, 259, 50, -.7) + chimney +
    `<g transform="translate(1145,-14)">${crow(96, 16, 9, -2, 1.1)}${crow(70, 12, 7, -5.5, .9)}${crow(120, 22, 12, -8, 1.25)}</g></g>`;
})();
