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
// A swarm leaving from (x, y): the extra bats fly out of the window, then are dropped
const hwBatBurst = (x, y, n) => {
  for (let i = 0; i < n && hwBats.length < 60; i++) {
    const b = hwNewBat(x, y, true), a = Math.random() * Math.PI * 2, v = 180 + Math.random() * 260;
    b.vx = Math.cos(a) * v; b.vy = Math.sin(a) * v - 80;
    hwBats.push(b);
  }
};

// One bat, its wings at beat (radians): a furry body, ears, and two wings whose tips rise and fall,
// their trailing edge cut in scallops between the fingers
const hwDrawBat = (g, b, night) => {
  const s = 14 * b.k, f = Math.sin(b.beat), lift = f * s * .9;
  g.save();
  g.translate(b.x, b.y);
  g.rotate(Math.max(-.4, Math.min(.4, b.vx / 900)));
  g.beginPath();
  for (const side of [-1, 1]) {
    g.moveTo(0, -s * .1);
    g.quadraticCurveTo(side * s * .9, -s * .2 - lift * .6, side * s * 1.8, -lift);
    g.quadraticCurveTo(side * s * 1.45, s * .05 - lift * .4, side * s * 1.2, s * .2 - lift * .3);
    g.quadraticCurveTo(side * s * .95, s * .02 - lift * .2, side * s * .7, s * .28 - lift * .15);
    g.quadraticCurveTo(side * s * .45, s * .1, side * s * .2, s * .3);
    g.lineTo(0, s * .2);
  }
  g.fill();
  g.beginPath();
  g.ellipse(0, s * .05, s * .22, s * .36, 0, 0, Math.PI * 2);
  g.moveTo(-s * .16, -s * .22); g.lineTo(-s * .2, -s * .5); g.lineTo(-s * .04, -s * .3);
  g.moveTo(s * .16, -s * .22); g.lineTo(s * .2, -s * .5); g.lineTo(s * .04, -s * .3);
  g.fill();
  if (night) {
    g.fillStyle = "#ff3a2a";
    g.fillRect(-s * .1 - 1, -s * .14, 2, 2);
    g.fillRect(s * .1 - 1, -s * .14, 2, 2);
  }
  g.restore();
};

fxLayers.push({
  mode: "halloween",
  resize() {
    hwCritW = fxW; hwCritH = fxH;
    if (!hwBats.length) {
      const n = fxW < 700 ? 7 : 12;
      for (let i = 0; i < n; i++) hwBats.push(hwNewBat(Math.random() * fxW, 40 + Math.random() * fxH * .4));
      for (let i = 0; i < (fxW < 700 ? 8 : 14); i++) hwLeaves.push(hwNewLeaf(true));
    }
  },
  reset() { hwBats.length = hwLeaves.length = hwPuffs.length = 0; },
  update(dt) {
    for (let i = hwBats.length - 1; i >= 0; i--) {
      const b = hwBats[i];
      if (b.swarm) {  // flying off: a little steering, then gone once out of the window
        b.vy -= 30 * dt;
        if (b.x < -60 || b.x > hwCritW + 60 || b.y < -60 || b.y > hwCritH + 60) { hwBats.splice(i, 1); continue; }
      } else {
        if (Math.random() < dt * .25 || Math.hypot(b.tx - b.x, b.ty - b.y) < 40) {
          b.tx = Math.random() * hwCritW; b.ty = 30 + Math.random() * hwCritH * .45;
        }
        b.vx += Math.sign(b.tx - b.x) * 140 * dt + (Math.random() - .5) * 300 * dt;
        b.vy += Math.sign(b.ty - b.y) * 90 * dt + (Math.random() - .5) * 260 * dt;
        const [mx, my] = pointerAt || [-1e4, -1e4], dx = b.x - mx, dy = b.y - my, d = Math.hypot(dx, dy);
        if (d < 130) { b.vx += dx / d * 900 * dt; b.vy += dy / d * 900 * dt; }  // the pointer scares them
        const v = Math.hypot(b.vx, b.vy), max = 190 * b.k + 60;
        if (v > max) { b.vx *= max / v; b.vy *= max / v; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.beat += dt * (14 + (b.vy < 0 ? 8 : 0)) / b.k;
    }
    for (const l of hwLeaves) {
      l.y += l.vy * dt * l.k;
      l.sway += dt * 1.2;
      l.x += Math.sin(l.sway) * 30 * dt;
      l.a += l.spin * dt;
      l.turn += dt * 2;
      if (l.y > hwCritH + 30) Object.assign(l, hwNewLeaf(false));
    }
    for (let i = hwPuffs.length - 1; i >= 0; i--) if ((hwPuffs[i].t += dt) > 1) hwPuffs.splice(i, 1);
  },
  draw(g) {
    const night = hwNight();
    for (const l of hwLeaves) {
      g.save();
      g.translate(l.x, l.y);
      g.rotate(l.a);
      g.scale(Math.cos(l.turn) * l.k, l.k);  // turning over: thinner, then the other side
      g.globalAlpha = .85;
      g.drawImage(l.img, -16, -16);
      g.restore();
    }
    g.globalAlpha = 1;
    g.fillStyle = night ? "#07040c" : "#1a0c08";
    for (const b of hwBats) { hwDrawBat(g, b, night); g.fillStyle = night ? "#07040c" : "#1a0c08"; }
    for (const p of hwPuffs) {  // a caught bat: purple smoke, and "+1" rising
      g.globalAlpha = 1 - p.t;
      g.fillStyle = "rgba(150,90,220,.5)";
      for (let k = 0; k < 6; k++) {
        const a = k * 1.05 + p.t;
        g.beginPath();
        g.arc(p.x + Math.cos(a) * p.t * 30, p.y + Math.sin(a) * p.t * 30, 6 + p.t * 10, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "#ffb347";
      g.font = "700 16px Georgia,serif";
      g.fillText(`+1 🦇 ${p.n}`, p.x - 20, p.y - 20 - p.t * 30);
    }
    g.globalAlpha = 1;
  },
});

