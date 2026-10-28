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
