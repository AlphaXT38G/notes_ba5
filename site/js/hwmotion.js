// ── Halloween: the scene comes alive ──────────────────────────────────────────────────────────
// What moves the Halloween scene (hwscene.js) as a whole, or now and then:
//   - depth: its four planes (far, mid, near, tree) slide by different amounts as the pointer
//     moves and as the page scrolls, the nearest the most (parallax), and drift a little by
//     themselves when nothing moves (phones); what is laid over a plane from outside follows it
//     (the werewolf, the castle's buttons, the jar). Done in the effects canvas' frame loop
//     (fx.js, mode "halloween"), translate only;
//   - the wind: a gust every 25 s to 1 min 10, for 7 s (#hwscene.gust: the tree bends, the
//     scarecrow and the lantern sway, the banners flap, css/hwlife.css), hwWind rising and falling
//     (the leaves blow across, hwcritters.js), with a soft whoosh;
//   - at night: shooting stars every 5 to 20 s (sometimes a big one, slower), a light
//     carried from window to window along a floor of the castle, and now and then a swarm of bats
//     bursting from the keep;
//   - day and night: a hand rising from the earth on the left hill (hwhills.js) now and then.
// Reduced motion: none of it.
const HW_DEPTH = { far: .15, mid: .35, near: .7, tree: 1 };
const hwSlide = { x: 0, y: 0 };  // the parallax now, eased: x in -1..1, y in 0..1
let hwDriftT = 0;
fxLayers.push({
  mode: "halloween",
  resize() {},
  reset() {},
  update(dt) {
    hwWind += ((hwBack.classList.contains("gust") ? 1 : 0) - hwWind) * Math.min(1, dt * 1.2);
    if (hwStill()) return;
    hwDriftT += dt;
    // where the planes should be: the pointer from the middle of the window, the scroll down to
    // 600 px, and a slow drift of their own
    const p = pointerAt, sc = Math.min(1, (scrollY || 0) / 600);
    const tx = (p ? (p[0] / innerWidth - .5) * 2 : 0) + Math.sin(hwDriftT / 7) * .15;
    const ty = Math.min(1, (p ? p[1] / innerHeight * .4 : .2) + sc * .6 + Math.sin(hwDriftT / 9) * .05);
    const k = Math.min(1, dt * 3);
    hwSlide.x += (tx - hwSlide.x) * k;
    hwSlide.y += (ty - hwSlide.y) * k;
    // across: the nearest plane the most, against the pointer (18 px at most); up and down: the
    // far planes rise (up to 34 px) and the near ones stay, so the hills never leave the bottom
    for (const n of HW_PLANES) {
      const d = hwDepth[n];
      d[0] = -hwSlide.x * 18 * HW_DEPTH[n];
      d[1] = -(1 - HW_DEPTH[n]) * hwSlide.y * 34;
      hwLayers[n].style.translate = `${f1(d[0])}px ${f1(d[1])}px`;
    }
    const at = n => `${f1(hwDepth[n][0])}px ${f1(hwDepth[n][1])}px`;
    hwWolf.style.translate = hwHits.style.translate = at("mid");
    hwJar.style.translate = at("near");
  },
  draw() {},
});

// The wind: a gust now and then
let hwGustIn = 20, hwGustEnd = null;
const hwGust = () => {
  hwBack.classList.add("gust");
  hwNoise(6, 380, "bandpass", .06);
  hwNoise(5, 900, "bandpass", .025, .6);
  clearTimeout(hwGustEnd);
  hwGustEnd = setTimeout(() => hwBack.classList.remove("gust"), 7000);
};

// Shooting stars, in the far plane, behind the ridges and the castle: a streak with a bright head,
// rushing along and fading, its direction and length at random; one in five is a big slow one
let hwMeteorIn = 6;
const HW_SVG = "http://www.w3.org/2000/svg";
const hwMeteor = () => {
  const box = hwLayers.far.querySelector(".meteors");
  if (!box || box.childElementCount > 3) return;
  const big = Math.random() < .2, a = 14 + Math.random() * 26, left = Math.random() < .5;
  const g = document.createElementNS(HW_SVG, "g");
  g.setAttribute("transform", `translate(${f1(150 + Math.random() * 1300)},${f1(30 + Math.random() * 250)}) rotate(${f1(left ? 180 - a : a)}) scale(${big ? 1.6 : .7 + Math.random() * .5})`);
  g.innerHTML = `<g class="meteor${big ? " big" : ""}"><path d="M0,0H-160"/><circle r="${big ? 2.4 : 1.6}"/></g>`;
  box.append(g);
  setTimeout(() => g.remove(), big ? 2200 : 1200);
};

// A light carried along a floor of the castle at night: the dark windows of one row, one after the
// other, lit then dark again
let hwWalkIn = 12, hwWalkTimers = [];
const hwWalkLight = () => {
  hwWalkTimers.forEach(clearTimeout);
  hwWalkTimers = [];
  const rows = {};
  hwLayers.mid.querySelectorAll(".win:not(.lit)").forEach(w => {
    if (w.closest(".portal")) return;
    const b = w.getBBox(), key = Math.round(b.y / 4);
    (rows[key] = rows[key] || []).push([b.x, w]);
  });
  const all = Object.keys(rows).map(k => rows[k]).filter(r => r.length > 1);
  if (!all.length) return;
  const row = all[(Math.random() * all.length) | 0].sort((p, q) => p[0] - q[0]).map(p => p[1]);
  if (Math.random() < .5) row.reverse();
  row.forEach((w, i) => {
    hwWalkTimers.push(setTimeout(() => w.classList.add("pass"), i * 900));
    hwWalkTimers.push(setTimeout(() => w.classList.remove("pass"), i * 900 + 1300));
  });
};

// Bats bursting from the top of the keep (its spire, at (1145, 40) in the castle's box), on the
// effects canvas
let hwSwarmIn = 50;
const hwSwarm = () => {
  const m = hwFit(), [x, y] = hwCastleAt(1145, 40);
  hwBatBurst(x * m.s + m.x + hwDepth.mid[0], y * m.s + m.y + hwDepth.mid[1], 9);
};

// The hand from the earth
let hwHandIn = 30;
const hwHandRise = () => {
  const hand = hwLayers.near.querySelector(".hand");
  hand.classList.remove("rise");
  void hand.getBBox();  // the class taken off is seen, so putting it back starts the rise again
  hand.classList.add("rise");
};

everySecond.push(() => {
  if (!hwOn || hwStill() || document.hidden) return;
  if (--hwGustIn <= 0) { hwGust(); hwGustIn = 25 + Math.random() * 45; }
  if (--hwHandIn <= 0) { hwHandRise(); hwHandIn = 40 + Math.random() * 60; }
  if (!hwNight()) return;
  if (--hwMeteorIn <= 0) { hwMeteor(); hwMeteorIn = 5 + Math.random() * 15; }
  if (--hwWalkIn <= 0) { hwWalkLight(); hwWalkIn = 14 + Math.random() * 20; }
  if (--hwSwarmIn <= 0) { hwSwarm(); hwSwarmIn = 60 + Math.random() * 70; }
});
hwPart({
  on() {
    // the tree bends about the foot of its trunk (in the scene's box)
    const foot = `170px ${f1(HW_LEFT(170) + 6)}px`;
    hwLayers.tree.querySelectorAll(".treesway, .deadtree").forEach(g => { g.style.transformOrigin = foot; });
    hwGustIn = 15 + Math.random() * 15;
    hwMeteorIn = 3;
  },
  off() {
    clearTimeout(hwGustEnd);
    hwBack.classList.remove("gust");
    hwWind = 0;
    hwWalkTimers.forEach(clearTimeout);
    hwWalkTimers = [];
    hwLayers.mid.querySelectorAll(".win.pass").forEach(w => w.classList.remove("pass"));
    hwLayers.far.querySelector(".meteors").textContent = "";
  },
});
