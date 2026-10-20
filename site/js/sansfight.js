// ── The snowman's bad time: a fight, in the style of the old pixel RPG duels ──
// When the whole Megalovania plays (the 22nd click on his lowest button, snowman.js), he picks a
// fight. The page goes black around him; where the courses were, the battle box, and under it the
// stats (LV, HP and its bar). The mouse pointer becomes a red pixel-art heart, trapped in the box:
// it is exactly where the pointer is (or moved by the arrow keys), never slowed, only kept inside.
// One line to begin with, a moment to get in place, then the attacks never stop, faster and faster,
// overlapping more and more: bones from both sides along the floor and the ceiling, blue bones
// (they only hurt a heart that moves), bone waves, bones raining from the top, skull blasters
// charging then firing a beam across the screen. Each hit: a crunch, the screen shakes, the box
// flashes red. HP at 0: the heart breaks, game over. The fight ends with the song, with Escape,
// at game over, or with Christmas.
// His left eye glows blue and a flame rises from it: a WebGL shader ray-marching a volume of noise
// (rising from the top of the eye, leaning back, flickering), on a small canvas over his face that
// follows his gaze.
// Everything here is made when the fight starts and removed when it ends.
const SF_HP = 40;
const SF = { on: false, raf: null, phase: "", t: 0, fight: 0, hp: SF_HP, hitAt: 0, shake: 0, objs: [], active: [], nextAt: 0, n: 0, last: 0, keys: {}, typing: null, over: false };
let sfUi = null, sfCv = null, sfCtx = null, sfDark = null, sfFlame = null, sfBox = null;
let sfSoul = [0, 0], sfMoved = 0;

// The red heart, in pixels (11 x 10), and its two halves when it breaks
const SF_HEART = ["..XX...XX..", ".XXXX.XXXX.", "XXXXXXXXXXX", "XXXXXXXXXXX", "XXXXXXXXXXX", ".XXXXXXXXX.", "..XXXXXXX..", "...XXXXX...", "....XXX....", ".....X....."];
const SF_CRACK = [5, 5, 6, 5, 4, 5, 6, 5, 5, 5];  // where each row splits
const sfHeart = (ctx, x, y, px, half, color) => {
  ctx.fillStyle = color || "#ff1a1a";
  SF_HEART.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== "X" || (half === 1 && i >= SF_CRACK[j]) || (half === 2 && i < SF_CRACK[j])) continue;
      ctx.fillRect(Math.round(x + (i - 5.5) * px), Math.round(y + (j - 5) * px), Math.ceil(px), Math.ceil(px));
    }
  });
};

// Sounds: square-wave blips (text), a crunch for the hits, noise for the blasters
const sfBlip = (freq, ms, vol = .05, type = "square", to) => {
  const ctx = smAudio();
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + ms / 1000);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + ms / 1000 + .02);
};

// The layout: a big box where the courses are, the stats under it
const sfLayout = () => {
  const W = innerWidth, H = innerHeight;
  const w = Math.min(760, W - 32), h = Math.min(330, Math.max(190, H * .42));
  sfBox = { x: (W - w) / 2, y: Math.max(60, H * .5 - h / 2 - 16), w, h };
  if (!sfUi) return;
  Object.assign(sfUi.querySelector(".box").style, { left: `${sfBox.x}px`, top: `${sfBox.y}px`, width: `${w}px`, height: `${h}px` });
  Object.assign(sfUi.querySelector(".stats").style, { left: `${sfBox.x}px`, top: `${sfBox.y + h + 14}px`, width: `${w}px` });
  sfCv.width = W;
  sfCv.height = H;
};

// The opening line in the box, typed letter by letter with a blip
const sfSay = (text, done) => {
  const p = sfUi.querySelector(".text");
  clearInterval(SF.typing);
  p.textContent = "";
  let i = 0;
  SF.typing = setInterval(() => {
    p.textContent = text.slice(0, ++i);
    if (text[i - 1] && text[i - 1].trim()) sfBlip(180, 40, .025);
    if (i >= text.length) { clearInterval(SF.typing); SF.typing = null; if (done) setTimeout(done, 700); }
  }, 30);
};

// ── The attacks. Each pattern spawns objects over its duration, faster as the fight goes on (from
// 0.85 to 2 in a minute and a half). Objects: bones { kind: "bone", x, y, w, h, vx, vy, blue } and
// blasters { kind: "blaster", x, y, a (angle of fire), t, charge, fire }, in window pixels.
const sfSpeed = () => Math.min(2, .85 + SF.fight / 80);
const sfBone = (x, y, w, h, vx, vy, blue) => SF.objs.push({ kind: "bone", x, y, w, h, vx, vy, blue: !!blue });
const sfBlast = (x, y, aim) => {
  const s = sfSpeed();
  SF.objs.push({ kind: "blaster", x, y, a: aim, t: 0, charge: .85 / s + .15, fire: .45 });
  smNoise(600, 300, 1800, .1, "swell");
};
const SF_PATTERNS = {
  // bones running along the floor and the ceiling, from both sides, the gap moving
  run: () => {
    let next = 0;
    return { dur: 6, step: t => {
      if (t < next || t > 5) return;
      const s = sfSpeed(), B = sfBox, gap = Math.max(58, 96 - s * 18), low = 22 + Math.random() * (B.h - gap - 44);
      next = t + .5 / s;
      const fromLeft = Math.random() < .5, x = fromLeft ? B.x - 14 : B.x + B.w + 4, vx = (fromLeft ? 1 : -1) * 250 * s;
      sfBone(x, B.y + B.h - low, 10, low, vx, 0);
      sfBone(x, B.y, 10, B.h - low - gap, vx, 0);
    } };
  },
  // tall blue bones sweeping the box, both ways: stand still and they pass through
  blue: () => {
    let next = 0, side = 0;
    return { dur: 6, step: t => {
      if (t < next || t > 5) return;
      const s = sfSpeed(), B = sfBox;
      next = t + 1 / s;
      side = 1 - side;
      sfBone(side ? B.x - 14 : B.x + B.w + 4, B.y, 12, B.h, (side ? 1 : -1) * 280 * s, 0, true);
      sfBone(side ? B.x + B.w + 4 : B.x - 14, B.y + B.h - 34, 10, 34, (side ? -1 : 1) * 230 * s, 0);
    } };
  },
  // a wave: columns of bones from the top and the bottom, a winding gap between them
  wave: () => {
    let next = 0;
    return { dur: 6, step: t => {
      if (t < next || t > 4.8) return;
      const s = sfSpeed(), B = sfBox, gap = Math.max(70, 112 - s * 22), mid = B.y + B.h / 2 + Math.sin(t * 2.4 * Math.min(1.5, s)) * (B.h / 2 - gap / 2 - 12);
      next = t + .14 / s;
      sfBone(B.x + B.w + 4, B.y, 10, mid - gap / 2 - B.y, -230 * s, 0);
      sfBone(B.x + B.w + 4, mid + gap / 2, 10, B.y + B.h - mid - gap / 2, -230 * s, 0);
    } };
  },
  // bones raining from the ceiling, some aimed at the heart
  rain: () => {
    let next = 0;
    return { dur: 5.5, step: t => {
      if (t < next || t > 4.6) return;
      const s = sfSpeed(), B = sfBox, aimed = Math.random() < .35;
      next = t + .2 / s;
      const x = aimed ? sfSoul[0] - 5 : B.x + 10 + Math.random() * (B.w - 30), h = 34 + Math.random() * 40;
      sfBone(x, B.y - h, 10, h, 0, (230 + Math.random() * 120) * s);
    } };
  },
  // skull blasters around the box, aiming at the heart, charging then firing
  blasters: () => {
    let next = .2, n = 0;
    return { dur: 6.5, step: t => {
      if (t < next || n >= 8) return;
      const s = sfSpeed(), B = sfBox, a = Math.random() * Math.PI * 2, R = Math.max(B.w, B.h) / 2 + 90;
      const x = B.x + B.w / 2 + Math.cos(a) * R, y = B.y + B.h / 2 + Math.sin(a) * R * .8;
      next = t + .75 / s;
      n++;
      sfBlast(x, y, Math.atan2(sfSoul[1] - y, sfSoul[0] - x));
    } };
  },
  // four blasters at once, crossing on the heart
  cross: () => {
    let done = 0;
    return { dur: 3.2, step: t => {
      if (done >= 2 || t < done * 1.6) return;
      const B = sfBox, R = Math.max(B.w, B.h) / 2 + 80, [hx, hy] = sfSoul, turn = done ? Math.PI / 4 : 0;
      done++;
      for (let i = 0; i < 4; i++) {
        const a = turn + i * Math.PI / 2, x = hx + Math.cos(a) * R, y = hy + Math.sin(a) * R;
        sfBlast(x, y, a + Math.PI);
      }
    } };
  },
};
const SF_NAMES = Object.keys(SF_PATTERNS);
// The heart's box (inside the border)
const sfInside = () => ({ x0: sfBox.x + 12, y0: sfBox.y + 12, x1: sfBox.x + sfBox.w - 12, y1: sfBox.y + sfBox.h - 12 });

// The fight itself: patterns one after another, the next one starting earlier and earlier, so they
// overlap more and more
const sfFightStart = () => {
  SF.phase = "fight";
  SF.fight = 0;
  SF.nextAt = 2.2;  // a moment to get in place
  SF.n = 0;
  sfUi.classList.add("attacking");
  sfUi.querySelector(".text").textContent = "";
  const I = sfInside();
  sfSoul = [(I.x0 + I.x1) / 2, (I.y0 + I.y1) / 2];
};
const sfNextPattern = () => {
  const last = SF.active.length ? SF.active[SF.active.length - 1].name : "";
  let name = SF.n === 0 ? "run" : SF_NAMES[Math.floor(Math.random() * SF_NAMES.length)];
  if (name === last) name = SF_NAMES[(SF_NAMES.indexOf(name) + 1) % SF_NAMES.length];
  const p = SF_PATTERNS[name]();
  p.name = name;
  p.t = 0;
  SF.active.push(p);
  SF.n++;
  // the next one: at the end of this one at first, then sooner (from 1 s after the end to 45 % in)
  const overlap = Math.min(1, SF.fight / 90);
  SF.nextAt = SF.fight + p.dur * (1 - .55 * overlap) + (1 - overlap);
  smAnimate(smArm, [{ transform: "rotate(0)" }, { transform: "rotate(-50deg)" }, { transform: "rotate(0)" }], { duration: 600, easing: "ease-in-out" });
};
const sfPaintHp = () => {
  sfUi.querySelector(".bar i").style.transform = `scaleX(${(SF.hp / SF_HP).toFixed(3)})`;
  sfUi.querySelector(".hpn").textContent = `${SF.hp} / ${SF_HP}`;
};
// A hit: a point less at most every 60 ms of contact, a crunch, the window shakes, the box flashes
const sfHurt = () => {
  const now = performance.now();
  if (now - SF.hitAt < 60 || SF.over) return;
  const first = now - SF.hitAt > 400;  // a new hit, not the same one going on
  SF.hitAt = now;
  SF.hp = Math.max(0, SF.hp - 1);
  sfPaintHp();
  if (first) {
    smNoise(130, 1600, 300, .45);
    sfBlip(160, 140, .07, "square", 60);
  } else sfBlip(120, 50, .035);
  SF.shake = Math.min(1, SF.shake + (first ? .8 : .25));
  sfUi.classList.remove("hurt");
  void sfUi.offsetWidth;
  sfUi.classList.add("hurt");
  if (!SF.hp) sfGameOver();
};
const sfGameOver = () => {
  SF.over = true;
  SF.phase = "over";
  SF.objs = [];
  SF.active = [];
  SF.t = 0;
  sfBlip(220, 900, .08, "sawtooth", 50);
  smSays("Ha. Ha. ❄", 2600);
  sfUi.classList.add("over");
  setTimeout(() => { if (SF.on) sfEnd(); }, 3800);
};
// Does the heart at x, y touch a bone?
const sfTouches = (x, y) => SF.objs.some(o => o.kind === "bone" && x + 5 > o.x && x - 5 < o.x + o.w && y + 5 > o.y && y - 5 < o.y + o.h && (!o.blue || sfMoved > 15));

// ── Every frame: the heart, the patterns, the objects, the hits, the shake, the drawing
const sfFrame = now => {
  SF.raf = null;
  if (!SF.on) return;
  const dt = Math.min(.05, (now - SF.last) / 1000);
  SF.last = now;
  SF.t += dt;
  const I = sfInside(), prev = sfSoul.slice();
  if (SF.phase === "fight" || SF.phase === "talk") {
    // the heart: where the pointer is (or moved by the arrows), kept inside the box
    const K = SF.keys, kx = (K.ArrowRight ? 1 : 0) - (K.ArrowLeft ? 1 : 0), ky = (K.ArrowDown ? 1 : 0) - (K.ArrowUp ? 1 : 0);
    if (kx || ky) { sfSoul[0] += kx * 300 * dt; sfSoul[1] += ky * 300 * dt; }
    else if (smMouse && SF.phase === "fight") sfSoul = smMouse.slice();
    sfSoul[0] = Math.max(I.x0, Math.min(I.x1, sfSoul[0]));
    sfSoul[1] = Math.max(I.y0, Math.min(I.y1, sfSoul[1]));
  }
  sfMoved = Math.hypot(sfSoul[0] - prev[0], sfSoul[1] - prev[1]) / Math.max(dt, .001);
  if (SF.phase === "fight") {
    SF.fight += dt;
    if (SF.fight >= SF.nextAt) sfNextPattern();
    SF.active = SF.active.filter(p => { p.t += dt; p.step(p.t); return p.t < p.dur; });
  }
  // objects, and the hits (along the whole way the heart went this frame: a fast move does not
  // jump through a bone)
  for (const o of SF.objs) { if (o.kind === "bone") { o.x += o.vx * dt; o.y += o.vy * dt; } else o.t += dt; }
  if (SF.phase === "fight") {
    const steps = Math.min(12, Math.ceil(Math.hypot(sfSoul[0] - prev[0], sfSoul[1] - prev[1]) / 6));
    for (let i = 1; i <= Math.max(1, steps); i++) {
      const u = i / Math.max(1, steps);
      if (sfTouches(smLerp(prev[0], sfSoul[0], u), smLerp(prev[1], sfSoul[1], u))) { sfHurt(); break; }
    }
  }
  const [hx, hy] = sfSoul;
  SF.objs = SF.objs.filter(o => {
    if (o.kind === "bone") return o.x > sfBox.x - 60 && o.x < sfBox.x + sfBox.w + 60 && o.y < sfBox.y + sfBox.h + 10;
    if (o.t > o.charge && !o.boomed) { o.boomed = true; smNoise(500, 1400, 200, .3); SF.shake = Math.max(SF.shake, .35); }
    if (o.t > o.charge && o.t < o.charge + o.fire && SF.phase === "fight") {
      // the distance from the heart to the beam's line (from the mouth, ahead of the skull)
      const ux = Math.cos(o.a), uy = Math.sin(o.a), rx = hx - (o.x - uy * 17), ry = hy - (o.y + ux * 17), along = rx * ux + ry * uy, across = Math.abs(-rx * uy + ry * ux);
      if (along > 0 && across < 26) sfHurt();
    }
    return o.t < o.charge + o.fire + .35;
  });
  // the shake, dying away
  if (SF.shake > 0) {
    const a = 10 * SF.shake * SF.shake;
    sfUi.style.transform = `translate(${f1((Math.random() - .5) * 2 * a)}px,${f1((Math.random() - .5) * 2 * a)}px)`;
    SF.shake = Math.max(0, SF.shake - dt * 4);
    if (!SF.shake) sfUi.style.transform = "";
  }
  // the flame follows his gaze (snowman.js moves his eyes)
  if (sfFlame) { const k = smK(); sfFlame.cv.style.transform = `translate(${f1(smLookOff[0] * k)}px,${f1(smLookOff[1] * k)}px)`; }
  sfDraw(now);
  SF.raf = requestAnimationFrame(sfFrame);
};
const sfDraw = now => {
  const c = sfCtx, B = sfBox;
  c.clearRect(0, 0, sfCv.width, sfCv.height);
  // bones, clipped to the box
  c.save();
  c.beginPath();
  c.rect(B.x + 4, B.y + 4, B.w - 8, B.h - 8);
  c.clip();
  for (const o of SF.objs) {
    if (o.kind !== "bone" || o.h <= 0) continue;
    c.fillStyle = o.blue ? "#14a9ff" : "#fff";
    const cx = o.x + o.w / 2, r = o.w * .42;
    c.fillRect(cx - o.w * .3, o.y + r, o.w * .6, Math.max(0, o.h - r * 2));
    for (const yy of [o.y + r, o.y + o.h - r]) {  // the knobs at both ends
      c.beginPath();
      c.arc(cx - r * .7, yy, r, 0, Math.PI * 2);
      c.arc(cx + r * .7, yy, r, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
  // blasters and their beams, over everything
  for (const o of SF.objs) if (o.kind === "blaster") sfBlaster(c, o);
  // the heart (blinking while hurt; broken at the end)
  const [x, y] = sfSoul;
  if (SF.over) {
    const k = Math.min(1, SF.t / .6);
    if (SF.t < 1.6) { sfHeart(c, x - 4 * k, y, 2, 1); sfHeart(c, x + 4 * k, y, 2, 2); }
    else if (SF.t < 2.4) {
      c.fillStyle = "#ff1a1a";
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, d = (SF.t - 1.6) * 120; c.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d + (SF.t - 1.6) * (SF.t - 1.6) * 260, 4, 4); }
    }
  } else if (now - SF.hitAt > 140 || Math.floor(now / 60) % 2) sfHeart(c, x, y, 2);
};
// A skull blaster: a long horned skull seen from the side, its jaw dropping open when it fires,
// and its beam from the mouth across the whole window
const sfBlaster = (c, o) => {
  const grow = Math.min(1, o.t / .3), firing = o.t > o.charge, fade = firing ? Math.max(0, 1 - (o.t - o.charge - o.fire) / .35) : 1;
  const open = firing ? Math.min(1, (o.t - o.charge) / .08) : 0;
  c.save();
  c.translate(o.x, o.y);
  c.rotate(o.a);
  c.globalAlpha = Math.min(1, fade);
  if (firing) {  // the beam, flickering a little
    const w = 46 * (o.t < o.charge + o.fire ? 1 + .06 * Math.sin((o.t - o.charge) * 60) : fade);
    c.fillStyle = "rgba(170,230,255,.55)";
    c.fillRect(40, 17 - w / 2 - 5, 3000, w + 10);
    c.fillStyle = "#fff";
    c.fillRect(40, 17 - w / 2, 3000, w);
  }
  c.scale(1.7 * grow, 1.7 * grow);
  c.fillStyle = "#fff";
  c.strokeStyle = "#000";
  c.lineWidth = 1.6;
  c.lineJoin = "round";
  const shape = pts => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.stroke(); };
  // horns, swept back
  shape([[-24, -16], [-50, -34], [-40, -20], [-30, -6]]);
  shape([[-24, 10], [-50, 24], [-38, 12], [-28, 2]]);
  // the jaw, turning down around its hinge when it fires
  c.save();
  c.translate(-8, 9);
  c.rotate(.5 * open);
  shape([[0, 0], [38, -1], [36, 5], [30, 9], [4, 11]]);
  c.beginPath();  // lower teeth
  for (let x = 8; x <= 34; x += 6) { c.moveTo(x, -1); c.lineTo(x + 3, -5); c.lineTo(x + 6, -1); }
  c.fill();
  c.stroke();
  c.restore();
  // the cranium and the long snout
  c.beginPath();
  c.ellipse(-12, -3, 22, 19, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  shape([[-6, -19], [26, -12], [34, -5], [34, 3], [28, 9], [-8, 9]]);
  c.fillStyle = "#fff";  // hides the stroke where the snout joins the head
  c.beginPath();
  c.ellipse(-10, -3, 18, 14, 0, 0, Math.PI * 2);
  c.fill();
  // upper teeth
  c.beginPath();
  for (let x = 2; x <= 28; x += 6) { c.moveTo(x, 9); c.lineTo(x + 3, 13); c.lineTo(x + 6, 9); }
  c.fill();
  c.stroke();
  // eye sockets and nostril; a pupil glowing while it charges
  c.fillStyle = "#000";
  c.beginPath();
  c.ellipse(-2, -8, 7, 5.5, -.2, 0, Math.PI * 2);
  c.ellipse(28, -4, 2.2, 1.6, 0, 0, Math.PI * 2);
  c.fill();
  if (!firing) {
    c.fillStyle = Math.floor(o.t * 12) % 2 ? "#ffffff" : "#4fd0ff";
    c.beginPath();
    c.arc(-1, -8, 2.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
};

// ── His burning eye: a ray-marched volumetric flame (WebGL), on a canvas over his face. The eye
// itself (the blue glow of his drawing, snowman.css) stays visible: the flame rises from its top.
const SF_FLAME_FS = `precision mediump float;
uniform vec2 R; uniform float T;
float h3(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * n3(p); p = p * 2.02 + vec3(3.1, 1.7, 5.3); a *= .5; } return s; }
// the flame's density at p: rising from the top of the eye (the eye: a disc of radius .1 around 0),
// wide at its root, thinning, leaning back and swaying, eaten by noise that climbs with time
float dens(vec3 p){
  float y = p.y - .07;
  if (y < -.05) return 0.;
  vec3 q = p - vec3(-.26 * y * y + .06 * sin(T * 2.3 + y * 3.) * y, 0., 0.);
  float r = mix(.12, .015, smoothstep(0., 1.3, y)) + .03 * exp(-y * 10.);
  float d = length(q.xz) - r;
  float n = fbm(vec3(q.x * 4.2, q.y * 3.4 - T * 3.2, q.z * 4.2 + T * .6));
  float keep = smoothstep(.1, .17, length(p.xy));  // not over the eye
  return clamp(-d * 9. + (n - .5) * 2.4 + .3, 0., 1.) * (1. - smoothstep(1.0, 1.4, y)) * smoothstep(-.05, .06, y) * keep;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - vec2(.5 * R.x, .07 * R.y)) / R.y;
  vec3 ro = vec3(0., 0., -3.), rd = normalize(vec3(uv * 1.6, 3.));
  vec3 col = vec3(0.); float tr = 1.;
  for (int i = 0; i < 44; i++) {
    vec3 p = ro + rd * (2.45 + float(i) * .025);
    float d = dens(p);
    if (d > .001) {
      float a = d * .2;
      vec3 e = mix(vec3(.02, .22, 1.), vec3(.78, .97, 1.), d * d) * (1.7 - p.y * .7);
      col += tr * a * e;
      tr *= 1. - a;
      if (tr < .03) break;
    }
  }
  // a soft halo around the eye, outside it
  float r = length(uv * 1.6);
  float g = .006 / (abs(r - .11) + .02) * smoothstep(.09, .13, r);
  col += vec3(.2, .6, 1.) * g * .5;
  gl_FragColor = vec4(col, clamp(1. - tr + g * .2, 0., 1.));
}`;
const sfFlameStart = () => {
  const k = smK(), cv = document.createElement("canvas");
  cv.className = "eyefire";
  cv.width = Math.round(90 * k);
  cv.height = Math.round(140 * k);
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, antialias: false, depth: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }"));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, SF_FLAME_FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const uR = gl.getUniformLocation(prog, "R"), uT = gl.getUniformLocation(prog, "T");
  snowman.append(cv);
  const F = { cv, gl, raf: null, t0: performance.now() };
  const frame = now => {
    F.raf = requestAnimationFrame(frame);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, (now - F.t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  F.raf = requestAnimationFrame(frame);
  return F;
};
const sfFlameStop = () => {
  if (!sfFlame) return;
  cancelAnimationFrame(sfFlame.raf);
  const x = sfFlame.gl.getExtension("WEBGL_lose_context");
  if (x) x.loseContext();  // free the GPU now
  sfFlame.cv.remove();
  sfFlame = null;
};

// ── Start and end
const sfKey = e => {
  if (!SF.on) return;
  if (e.key === "Escape") { e.preventDefault(); return sfEnd(); }
  if (e.key.indexOf("Arrow") === 0) { e.preventDefault(); SF.keys[e.key] = e.type === "keydown"; }
};
const sfStart = () => {
  if (SF.on || smStill()) return;
  Object.assign(SF, { on: true, phase: "talk", t: 0, fight: 0, hp: SF_HP, hitAt: 0, shake: 0, objs: [], active: [], nextAt: 0, n: 0, keys: {}, over: false });
  smUnfreeze();  // no slow, frozen pointer from a snowball during the fight
  smBusy = true;
  snowman.classList.add("hold");
  document.body.classList.add("sansfight");
  sfDark = document.createElement("div");
  sfDark.id = "xdark";
  snowman.parentNode.insertBefore(sfDark, snowman);
  sfUi = document.createElement("div");
  sfUi.id = "xfight";
  sfUi.innerHTML = '<div class="box"><p class="text"></p></div><canvas></canvas>' +
    `<div class="stats"><b>YOU</b><span>LV 1</span><span class="hp">HP</span><i class="bar"><i></i></i><span class="hpn">${SF_HP} / ${SF_HP}</span><small>ESC: run away</small></div>`;
  sfCv = sfUi.querySelector("canvas");
  sfCtx = sfCv.getContext("2d");
  document.body.append(sfUi);
  sfLayout();
  sfUi.addEventListener("pointerdown", e => e.stopPropagation());
  addEventListener("resize", sfLayout);
  addEventListener("keydown", sfKey, true);
  addEventListener("keyup", sfKey, true);
  sfFlame = sfFlameStart();
  if (sfFlame) snowman.classList.add("flaming");
  const I = sfInside();
  sfSoul = [(I.x0 + I.x1) / 2, (I.y0 + I.y1) / 2];
  SF.last = performance.now();
  SF.raf = requestAnimationFrame(sfFrame);
  // the dark falls, the one line, then the fight, which never stops
  setTimeout(() => {
    if (!SF.on) return;
    sfSay("* The snowman blocks the way!\n* Get ready...", () => { if (SF.on) sfFightStart(); });
  }, 900);
};
// Over: the song stops with it
const sfEnd = () => {
  if (!SF.on) return;
  SF.on = false;
  cancelAnimationFrame(SF.raf);
  clearInterval(SF.typing);
  removeEventListener("resize", sfLayout);
  removeEventListener("keydown", sfKey, true);
  removeEventListener("keyup", sfKey, true);
  sfFlameStop();
  snowman.classList.remove("flaming", "hold");
  document.body.classList.remove("sansfight");
  const ui = sfUi, dark = sfDark;
  sfUi = sfDark = null;
  ui.classList.add("leaving");
  dark.classList.add("leaving");
  setTimeout(() => { ui.remove(); dark.remove(); }, 700);
  smBusy = false;
  if (smMegaSong) smMegaStop();
};
