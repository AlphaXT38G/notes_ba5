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

