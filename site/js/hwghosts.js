// ── Halloween ghosts: who they are, how they move ─────────────────────────────────────────────
// The ghosts of the Halloween screens (halloween.js): every half a minute or so, one of the dead
// appears and wanders a while among the courses. Three of them, in turn: the lady in white (long
// hair, hands clasped), the monk (head bowed under his hood, a lantern held out) and the shrouded
// one (a winding sheet over all, arms reaching out). Each is a body in 3D on a skeleton
// (HW_POSES), rendered as glowing mist by hwghostgl.js on a small canvas that follows it.
// Their life, every frame (hwGhostStep):
//   - they move in three dimensions: across the window, and in depth (smaller and dimmer far away,
//     behind the courses; larger and brighter near, in front of them), drawn to one place after
//     another by a damped spring, so they glide off slowly, arrive softly and never stop dead;
//     they linger at each place;
//   - their body turns in 3D to face where they go (in profile when crossing, from the front when
//     coming nearer), and when they stop, they turn to look at us, the head first;
//   - their skeleton lives: breathing, floating up and down, leaning into their motion; what
//     hangs (the robe's hem, the lady's hair, the hood) trails behind it; the lady's hands drift,
//     the shrouded one's arms rise and fall as if groping, the monk's lantern swings on its chain
//     as a pendulum, pushed by his moves;
//   - ectoplasm escapes them: wisps drawn on the effects canvas (fx.js), shed from the hem and
//     the hands, rising and curling as they fade;
//   - they materialise in patches, flicker now and then, and dissolve the same way.
// A click on one: it turns to face us and rushes at us as it dissolves. Without WebGL, or with
// reduced motion, no ghosts.
// The skeleton, facing us (+z), in the ghost's units (a figure about 2 tall): head, neck, chest,
// waist, left shoulder, elbow, hand, right shoulder, elbow, hand, hem, end of the hair or hood,
// lantern, and the face's direction
const HW_POSES = [
  { name: "lady", joints: [[0, .62, 0], [0, .48, 0], [0, .3, .02], [0, -.02, 0], [-.19, .43, 0], [-.24, .16, .08], [-.05, .08, .2],
    [.19, .43, 0], [.24, .16, .08], [.05, .08, .2], [0, -1.25, -.05], [0, -.3, -.16], [0, 0, 0], [0, 0, 1]] },
  { name: "monk", joints: [[0, .6, .04], [0, .47, 0], [0, .3, .02], [0, -.02, 0], [-.21, .42, 0], [-.27, .15, .05], [-.2, -.08, .12],
    [.21, .42, 0], [.3, .22, .2], [.3, .15, .42], [0, -1.25, 0], [0, .7, -.2], [.3, -.07, .42], [0, -.2, .98]], lamp: true },
  { name: "shroud", joints: [[0, .7, 0], [0, .52, 0], [0, .32, 0], [0, 0, 0], [-.2, .45, 0], [-.22, .43, .3], [-.18, .42, .62],
    [.2, .45, 0], [.22, .44, .3], [.18, .43, .62], [0, -1.25, -.1], [0, .7, 0], [0, 0, 0], [0, 0, 1]] },
];
const hwGhostEl = document.createElement("div"), hwGhostCv = document.createElement("canvas"), hwGhostHit = document.createElement("div");
hwGhostEl.id = "hwghost";
hwGhostHit.className = "hit";
hwGhostHit.title = "A ghost";
hwGhostEl.append(hwGhostCv, hwGhostHit);
let hwGh = null, hwGhRaf = null, hwGhLast = 0, hwGhIn = 12, hwGhNext = 0;
const hwWisps = [];

const hwRotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const hwAngle = a => Math.atan2(Math.sin(a), Math.cos(a));  // in -pi..pi
// A place to go: across the window, at some depth (0 far, 1 near)
const hwGhostTarget = g => {
  g.target = [innerWidth * (.12 + Math.random() * .76), innerHeight * (.42 + Math.random() * .2), .15 + Math.random() * .75];
};
const hwGhostGo = () => {
  if (hwGh || hwStill() || document.hidden) return;
  if (!hwSpectreInit(hwGhostCv)) return;
  const kind = hwGhNext;
  hwGhNext = (hwGhNext + 1) % HW_POSES.length;
  hwGh = {
    kind, t: Math.random() * 20, pos: [innerWidth * (.15 + Math.random() * .7), innerHeight * (.42 + Math.random() * .2), .2 + Math.random() * .5],
    vel: [0, 0, 0], yaw: (Math.random() - .5) * 2, head: 0, linger: 3, stops: 3 + Math.floor(Math.random() * 3),
    reveal: 0, leaving: false, rush: false, flicker: 0, swing: 0, swingV: 0, joints: new Float32Array(42),
  };
  hwGhostTarget(hwGh);
  hwFront.append(hwGhostEl);
  const r = innerWidth < 700 ? .55 : .7;  // under 1x: it is mist
  hwGhostCv.width = Math.round(hwGhostEl.offsetWidth * r);
  hwGhostCv.height = Math.round(hwGhostEl.offsetHeight * r);
  hwGhLast = 0;
  hwGhRaf = requestAnimationFrame(hwGhostFrame);
};
// One step of its life (dt in seconds)
const hwGhostStep = dt => {
  const g = hwGh;
  g.t += dt;
  // moving: a damped spring to the place it goes, slow to leave, soft to arrive
  const [tx, ty, tz] = g.target, k = g.rush ? 6 : 1.1, c = 2 * Math.sqrt(k);
  const acc = [k * (tx - g.pos[0]) - c * g.vel[0], k * (ty - g.pos[1]) - c * g.vel[1], k * 300 * (tz - g.pos[2]) - c * g.vel[2] * 1];
  for (let i = 0; i < 3; i++) g.vel[i] += acc[i] * dt;
  const sp = Math.hypot(g.vel[0], g.vel[1]), max = g.rush ? 400 : 75;
  if (sp > max) { g.vel[0] *= max / sp; g.vel[1] *= max / sp; }
  g.pos[0] += g.vel[0] * dt;
  g.pos[1] += g.vel[1] * dt;
  g.pos[2] = Math.max(0, Math.min(g.rush ? 1.6 : 1, g.pos[2] + g.vel[2] / 300 * dt));
  const arrived = Math.hypot(tx - g.pos[0], ty - g.pos[1]) < 18 && Math.abs(tz - g.pos[2]) < .08;
  if (arrived && !g.leaving) {
    if ((g.linger -= dt) <= 0) {
      if (--g.stops <= 0) g.leaving = true;
      else { hwGhostTarget(g); g.linger = 2.5 + Math.random() * 3; }
    }
  }
  // turning: to where it goes (in profile across, from the front coming nearer); at rest, to us
  const vx = g.vel[0], vz = g.vel[2], moving = Math.hypot(vx, vz) > 12;
  const want = g.rush ? 0 : moving ? Math.atan2(vx, vz * .8) : 0;
  g.yaw += hwAngle(want - g.yaw) * Math.min(1, dt * (moving ? 1.6 : .9));
  g.head += (hwAngle((moving ? 0 : -g.yaw * .8)) - g.head) * Math.min(1, dt * 2.5);  // the head turns first
  // the lantern, a pendulum on its chain, pushed by his moves
  g.swingV += (-9 * Math.sin(g.swing) - 1.2 * g.swingV - acc[0] * .004) * dt;
  g.swing += g.swingV * dt;
  // there, then gone: materialising, a flicker now and then, dissolving
  g.reveal = Math.max(0, Math.min(1, g.reveal + (g.leaving || g.rush ? -dt / (g.rush ? 1 : 3) : dt / 3.5)));
  if (g.flicker > 0) g.flicker -= dt;
  else if (Math.random() < dt * .07) g.flicker = .06 + Math.random() * .14;
  hwGhostPose(g, [vx, -g.vel[1], vz]);
};
// The skeleton of the moment, in the ghost's space: the pose, alive, leaning, trailing, turned
const hwGhostPose = (g, v) => {
  const pose = HW_POSES[g.kind], t = g.t;
  const local = hwRotY([v[0] / 120, v[1] / 120, v[2] / 120], -g.yaw);  // its motion as it feels it
  const bob = Math.sin(t * 1.15) * .035, breath = Math.sin(t * 2) * .008;
  pose.joints.forEach((j0, i) => {
    let [x, y, z] = j0;
    if (i === 13) {  // the face's direction: the head's own turn
      [x, y, z] = hwRotY([x, y, z], g.head);
    } else {
      const above = Math.max(0, y);  // leaning into its motion, more at the top
      x += local[0] * .12 * above; z += local[2] * .12 * above;
      y += bob + (y > .2 ? breath : 0);
      if (i === 10) { x -= local[0] * .45; z -= local[2] * .45; x += Math.sin(t * .8) * .06; }  // the hem trails and sways
      if (i === 11) { x -= local[0] * .3; z -= local[2] * .3; y -= Math.abs(local[0]) * .1; x += Math.sin(t * 1.3) * .04; }  // hair, hood
      if (pose.name === "lady" && (i === 6 || i === 9)) { y += Math.sin(t * .9) * .02; x += Math.sin(t * .6) * .015; }
      if (pose.name === "shroud" && (i === 5 || i === 6 || i === 8 || i === 9)) {  // groping
        const side = i < 7 ? 0 : 1.7, k = i === 6 || i === 9 ? 1 : .5;
        y += Math.sin(t * .8 + side) * .07 * k; z += Math.sin(t * .5 + side) * .06 * k;
      }
      if (i === 12 && pose.lamp) {  // the lantern on its chain, from the hand
        const [hx, hy, hz] = pose.joints[9];
        x = hx + Math.sin(g.swing) * .22; y = hy + bob - Math.cos(g.swing) * .22; z = hz;
      }
      if (i === 0) { const f = hwRotY([0, 0, .03], g.head); x += f[0]; z += f[2] - .03; }  // the head turning
    }
    const [rx, ry, rz] = hwRotY([x, y, z], g.yaw);
    g.joints[i * 3] = rx; g.joints[i * 3 + 1] = ry; g.joints[i * 3 + 2] = rz;
  });
};
// Where a point of the ghost shows in the window (for the wisps)
const hwGhostScreen = (g, i, jitter) => {
  const j = [g.joints[i * 3] + (Math.random() - .5) * jitter, g.joints[i * 3 + 1], g.joints[i * 3 + 2] + (Math.random() - .5) * jitter];
  const [u, w] = hwSpectreProject(j), h = hwGhostEl.offsetHeight * g.scale / 2;
  return [g.pos[0] + u * h, g.pos[1] - w * h];
};
const hwGhostFrame = now => {
  hwGhRaf = requestAnimationFrame(hwGhostFrame);
  const dt = Math.min(.05, (now - (hwGhLast || now)) / 1000) || .016;
  hwGhLast = now;
  if (!hwSpectreReady()) { if (!hwSpGl) hwGhostEnd(); return; }
  hwGhostStep(dt);
  const g = hwGh, pose = HW_POSES[g.kind];
  g.scale = .55 + .55 * g.pos[2];  // near: larger
  const w = hwGhostEl.offsetWidth, h = hwGhostEl.offsetHeight;
  hwGhostEl.style.transform = `translate(${f1(g.pos[0] - w / 2)}px,${f1(g.pos[1] - h / 2)}px) scale(${g.scale.toFixed(3)})`;
  // far away it wanders behind the courses, in the scene; near, in front of them
  if (g.pos[2] < .42 && hwGhostEl.parentNode !== hwBack) hwBack.append(hwGhostEl);
  else if (g.pos[2] > .55 && hwGhostEl.parentNode !== hwFront) hwFront.append(hwGhostEl);
  hwSpectreDraw({
    joints: g.joints, kind: g.kind, time: g.t, reveal: g.reveal, night: hwNight() ? 1 : 0, lamp: pose.lamp ? 1 : 0,
    alpha: (g.flicker > 0 ? .5 : 1) * (.7 + .3 * Math.min(1, g.pos[2])),
  });
  // ectoplasm escaping it, from the hem and the hands
  if (g.reveal > .3 && Math.random() < dt * 30) {
    const from = [10, 10, 10, 6, 9][(Math.random() * 5) | 0], [x, y] = hwGhostScreen(g, from, from === 10 ? .7 : .1);
    if (hwWisps.length < 140) hwWisps.push({ x, y, vx: g.vel[0] * .3 + (Math.random() - .5) * 20, vy: -15 - Math.random() * 25, age: 0, life: 1.6 + Math.random() * 1.6, size: (6 + Math.random() * 8) * g.scale, kind: g.kind, seed: Math.random() * 9 });
  }
  if (g.reveal <= 0 && (g.leaving || g.rush)) hwGhostEnd();
};
const hwGhostEnd = () => {
  cancelAnimationFrame(hwGhRaf);
  hwGhRaf = null;
  hwGh = null;
  hwGhostEl.remove();
};
// The wisps, on the effects canvas: soft glows rising, curling, swelling and fading
const HW_WISP = [blob(180, 205, 255, .55), blob(180, 205, 255, .55), blob(160, 255, 215, .55)];
fxLayers.push({
  mode: "halloween",
  reset() { hwWisps.length = 0; },
  update(dt) {
    for (let i = hwWisps.length - 1; i >= 0; i--) {
      const w = hwWisps[i];
      w.age += dt;
      if (w.age > w.life) { hwWisps.splice(i, 1); continue; }
      w.vx += Math.sin(w.age * 2.3 + w.seed) * 30 * dt;  // curling
      w.vx *= .98;
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      w.size += 10 * dt;
    }
  },
  draw(g) {
    if (!hwWisps.length) return;
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const w of hwWisps) {
      const k = w.age / w.life;
      g.globalAlpha = .45 * Math.sin(Math.PI * k);
      g.drawImage(HW_WISP[w.kind], w.x - w.size, w.y - w.size, w.size * 2, w.size * 2);
    }
    g.restore();
  },
});
// A click: it turns to us and rushes at us, dissolving
hwGhostHit.addEventListener("click", e => {
  if (!hwGh || hwGh.rush) return;
  e.stopPropagation();
  hwGh.rush = true;
  hwGh.target = [hwGh.pos[0], hwGh.pos[1] + 40, 1.6];
  hwNoise(1.4, 600, "bandpass", .14);  // a breath
});
everySecond.push(() => { if (hwOn && --hwGhIn <= 0) { hwGhostGo(); hwGhIn = 25 + Math.random() * 25; } });
hwPart({
  on() { hwGhIn = 6 + Math.random() * 10; },
  off() { hwGhostEnd(); },
});
