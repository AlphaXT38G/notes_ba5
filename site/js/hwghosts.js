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
