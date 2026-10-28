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
