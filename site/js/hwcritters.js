// ── Halloween bats and leaves (effects canvas) ────────────────────────────────────────────────
// What flies over the Halloween screens, on the effects canvas (fx.js, mode "halloween"):
//   - a colony of bats fluttering in the top of the window: each one wanders towards a point it
//     picks now and then, beating its wings at its own pace (faster when it climbs), swerving away
//     from the pointer (pointerAt, stuckpointer.js); their eyes glint red at night;
//   - autumn leaves (maple, oak and birch, in orange, red, ochre and brown) drifting down,
//     swaying and tumbling (their width shrinks and flips as they turn over);
//   - the bat hunt: a click on a bat (anywhere but on a link or a button) catches it: it bursts in
//     a puff of purple smoke with a squeak, "+1" rises from where it was, and another one comes
//     back from the edge of the window a few seconds later, the tally shown with the "+1".
//   - hwBatBurst(x, y, n): a swarm of bats bursting from a point and flying off the window (the
//     pumpkins all lit), on top of the colony, capped.
// Bats are drawn as paths (a body and two scalloped wings), leaves as sprites drawn once.
const HW_LEAF_COLORS = ["#e2661a", "#c43d12", "#d99a1e", "#8a4a1c", "#f08a2a"];
// A leaf sprite: a maple leaf (five points), an oak leaf (lobes) or a birch leaf (oval), with its
// vein and stalk, a little darker towards the edge
const hwLeafSprite = (kind, color) => {
  const c = document.createElement("canvas"), g = c.getContext("2d");
  c.width = c.height = 32;
  g.translate(16, 17);
  g.fillStyle = color;
  g.beginPath();
  if (kind === 0) {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 13 - Math.abs(i - 4) * .6;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
  } else if (kind === 1) {
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 2, r = 7 + 2.5 * Math.cos(a * 4);
      g.lineTo(Math.cos(a) * r * .7, Math.sin(a) * r * 1.3);
    }
  } else g.ellipse(0, 0, 6, 11, 0, 0, Math.PI * 2);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(60,20,5,.55)";
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.moveTo(0, -10);
  g.lineTo(0, 14);
  g.stroke();
  return c;
};
const HW_LEAVES = HW_LEAF_COLORS.map((col, i) => hwLeafSprite(i % 3, col));

const hwBats = [], hwLeaves = [], hwPuffs = [];
let hwBatsCaught = 0, hwCritW = 0, hwCritH = 0;
const hwNewBat = (x, y, swarm = false) => ({
  x, y, vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 60, k: .55 + Math.random() * .7,
  beat: Math.random() * 6, tx: Math.random() * hwCritW, ty: 30 + Math.random() * hwCritH * .45, swarm,
});
const hwNewLeaf = top => ({
  x: Math.random() * hwCritW, y: top ? -20 - Math.random() * hwCritH : -20, vy: 22 + Math.random() * 28,
  sway: Math.random() * 6, spin: (Math.random() - .5) * 2, a: Math.random() * 6, turn: Math.random() * 6,
  img: HW_LEAVES[(Math.random() * HW_LEAVES.length) | 0], k: .6 + Math.random() * .6,
});
