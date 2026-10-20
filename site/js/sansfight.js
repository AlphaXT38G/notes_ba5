// ── The snowman's bad time: a fight, in the style of the old pixel RPG duels ──
// When the whole Megalovania plays (the 22nd click on his lowest button, snowman.js), he picks a
// fight. The page goes black around him; where the courses were, the battle box; under it, the
// stats (LV, HP and its bar) and the four buttons FIGHT ACT ITEM MERCY. The mouse pointer becomes a
// red pixel-art heart (drawn on the fight's canvas, the real pointer hidden).
// Turns: an attack, during which the heart is trapped in the box and follows the pointer (or the
// arrow keys) at a limited speed, dodging bones from all sides, blue bones (they only hurt a
// heart that moves), bone waves and skull blasters charging then firing a beam across the screen;
// then a menu, the heart free to pick a button. FIGHT misses (he steps aside), ACT tells about him,
// ITEM heals, MERCY spares him and ends it all. The first turn is slow, after a few seconds to get
// in place; the attacks speed up turn after turn. HP at 0: the heart breaks, game over. The fight
// ends with the song, with MERCY, with Escape, or with Christmas.
// His left eye burns with a blue flame: a WebGL shader ray-marching a volume of noise (the flame
// rises from the eye, leaning back, flickering), drawn on a small canvas over his face.
// Everything here is made when the fight starts and removed when it ends.
const SF_HP = 20;
const SF = { on: false, raf: null, phase: "", t: 0, turn: 0, hp: SF_HP, hitAt: 0, objs: [], pat: null, pats: [], last: 0, keys: {}, typing: null, over: false };
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

// Sounds: square-wave blips (text, hits), noise for the blasters
const sfBlip = (freq, ms, vol = .05, type = "square") => {
  const ctx = smAudio();
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + ms / 1000 + .02);
};

// The layout: the box where the courses are, bigger for the attacks; stats and buttons under it
const sfLayout = () => {
  const W = innerWidth, H = innerHeight;
  const w = Math.min(760, W - 32), h = Math.min(320, Math.max(180, H * .4));
  sfBox = { x: (W - w) / 2, y: Math.max(70, H * .47 - h / 2), w, h };
  if (!sfUi) return;
  const box = sfUi.querySelector(".box");
  Object.assign(box.style, { left: `${sfBox.x}px`, top: `${sfBox.y}px`, width: `${w}px`, height: `${h}px` });
  Object.assign(sfUi.querySelector(".stats").style, { left: `${sfBox.x}px`, top: `${sfBox.y + h + 14}px`, width: `${w}px` });
  Object.assign(sfUi.querySelector(".menu").style, { left: `${sfBox.x}px`, top: `${sfBox.y + h + 52}px`, width: `${w}px` });
  sfCv.width = W;
  sfCv.height = H;
};

// The text in the box, typed letter by letter with a blip
const sfSay = (text, done) => {
  const p = sfUi.querySelector(".text");
  clearInterval(SF.typing);
  p.textContent = "";
  let i = 0;
  SF.typing = setInterval(() => {
    p.textContent = text.slice(0, ++i);
    if (text[i - 1] && text[i - 1].trim()) sfBlip(180, 40, .025);
    if (i >= text.length) { clearInterval(SF.typing); SF.typing = null; if (done) setTimeout(done, 900); }
  }, 32);
};

// ── The attacks. Each pattern spawns objects over its duration; speed grows with the turns.
// Objects: bones { kind: "bone", x, y, w, h, vx, vy, blue } (in window pixels, drawn clipped to the
// box) and blasters { kind: "blaster", x, y, a (angle of fire), t, charge, fire }.
const sfSpeed = () => Math.min(1.25, .55 + SF.turn * .17);  // slow at first
const sfBone = (x, y, w, h, vx, vy, blue) => SF.objs.push({ kind: "bone", x, y, w, h, vx, vy, blue: !!blue });
const SF_PATTERNS = {
  // bones running along the floor and the ceiling, the gap between them moving
  run: () => {
    let next = 0;
    return { dur: 7, step: t => {
      if (t < next) return;
      const s = sfSpeed(), B = sfBox, gap = 92 - s * 18, low = 26 + Math.random() * (B.h - gap - 52);
      next = t + .62 / s;
      const fromLeft = Math.random() < .5, x = fromLeft ? B.x - 14 : B.x + B.w + 4, vx = (fromLeft ? 1 : -1) * 230 * s;
      sfBone(x, B.y + B.h - low, 10, low, vx, 0);
      sfBone(x, B.y, 10, B.h - low - gap, vx, 0);
    } };
  },
  // tall blue bones sweeping the box: stand still and they pass through; white ones on the floor
  blue: () => {
    let next = 0, side = 0;
    return { dur: 7, step: t => {
      if (t < next) return;
      const s = sfSpeed(), B = sfBox;
      next = t + 1.25 / s;
      side = 1 - side;
      sfBone(side ? B.x - 14 : B.x + B.w + 4, B.y, 12, B.h, (side ? 1 : -1) * 250 * s, 0, true);
      sfBone(side ? B.x + B.w + 4 : B.x - 14, B.y + B.h - 30, 10, 30, (side ? -1 : 1) * 200 * s, 0);
    } };
  },
  // a wave: columns of bones from the top and the bottom, a winding gap between them
  wave: () => {
    let next = 0;
    return { dur: 6.5, step: t => {
      if (t < next || t > 5.2) return;
      const s = sfSpeed(), B = sfBox, gap = 110 - s * 20, mid = B.y + B.h / 2 + Math.sin(t * 2.2) * (B.h / 2 - gap / 2 - 14);
      next = t + .16 / s;
      sfBone(B.x + B.w + 4, B.y, 10, mid - gap / 2 - B.y, -210 * s, 0);
      sfBone(B.x + B.w + 4, mid + gap / 2, 10, B.y + B.h - mid - gap / 2, -210 * s, 0);
    } };
  },
  // skull blasters around the box, aiming at the heart, charging then firing
  blasters: () => {
    let next = .4, n = 0;
    return { dur: 7.5, step: t => {
      if (t < next || n >= 6) return;
      const s = sfSpeed(), B = sfBox, a = Math.random() * Math.PI * 2, R = Math.max(B.w, B.h) / 2 + 90;
      const x = B.x + B.w / 2 + Math.cos(a) * R, y = B.y + B.h / 2 + Math.sin(a) * R * .8;
      next = t + 1.05 / s;
      n++;
      SF.objs.push({ kind: "blaster", x, y, a: Math.atan2(sfSoul[1] - y, sfSoul[0] - x), t: 0, charge: .95 / s, fire: .5 });
      sfNoiseUp();
    } };
  },
};
const sfNoiseUp = () => smNoise(600, 300, 1800, .12, "swell");
// The heart's box (inside the border)
const sfInside = () => ({ x0: sfBox.x + 12, y0: sfBox.y + 12, x1: sfBox.x + sfBox.w - 12, y1: sfBox.y + sfBox.h - 12 });

// ── The turns
const sfAttack = () => {
  SF.phase = "attack";
  SF.t = 0;
  SF.objs = [];
  sfUi.classList.add("attacking");
  sfUi.querySelector(".text").textContent = "";
  const I = sfInside();
  sfSoul = [(I.x0 + I.x1) / 2, (I.y0 + I.y1) / 2];  // the heart in the middle
  const names = Object.keys(SF_PATTERNS);
  const pick = () => names[Math.floor(Math.random() * names.length)];
  const first = SF.turn === 0 ? "run" : pick();
  let second = pick();
  if (second === first) second = names[(names.indexOf(first) + 1) % names.length];
  // the first turn: three seconds to get in place, one pattern only
  SF.pats = SF.turn === 0 ? [{ wait: 3 }, first] : [{ wait: 1 }, first, second];
  SF.pat = null;
  smAnimate(smArm, [{ transform: "rotate(0)" }, { transform: "rotate(-50deg)" }, { transform: "rotate(0)" }], { duration: 700, easing: "ease-in-out" });
};
const SF_FLAVOUR = [
  "* The snowman's eye burns blue.\n* You feel like studying would have been safer.",
  "* Snow keeps falling.\n* Somewhere, a deadline is getting closer.",
  "* The snowman is sweating.\n* ...no, wait, he's just melting a little.",
  "* The snowman hums along to the music.",
  "* It smells like carrots and danger.",
];
const sfMenu = text => {
  SF.phase = "menu";
  SF.objs = [];
  SF.turn++;
  sfUi.classList.remove("attacking");
  sfUi.classList.add("choosing");
  sfSay(text || SF_FLAVOUR[(SF.turn - 1) % SF_FLAVOUR.length]);
};
const sfAct = what => {
  if (SF.phase !== "menu" || SF.over) return;
  sfUi.classList.remove("choosing");
  sfBlip(520, 60, .04);
  SF.phase = "talk";
  if (what === "mercy") {
    smSays("Heh. Merry Christmas, kid.", 2600);
    return sfSay("* You spared the snowman.", () => sfEnd(true));
  }
  if (what === "fight") {  // he simply steps aside
    smAnimate(smSvg, [{ transform: "none" }, { transform: "translateX(-34px)" }, { transform: "translateX(-34px)" }, { transform: "none" }], { duration: 900, easing: "ease-in-out" });
    smFloat("miss", "MISS", 180, 60, 1300);
    return sfSay("* You swing at the snowman.\n* He just... steps aside.", sfAttack);
  }
  if (what === "act") return sfSay("* SNOWMAN - ATK 1 DEF 1\n* Made of snow. Very cool. Hates warm hands.", sfAttack);
  SF.hp = SF_HP;
  sfPaintHp();
  sfBlip(880, 200, .04, "triangle");
  sfSay("* You ate a snow cone.\n* Brain freeze! HP maxed out.", sfAttack);
};
const sfPaintHp = () => {
  sfUi.querySelector(".bar i").style.transform = `scaleX(${(SF.hp / SF_HP).toFixed(3)})`;
  sfUi.querySelector(".hpn").textContent = `${SF.hp} / ${SF_HP}`;
};
const sfHurt = () => {
  const now = performance.now();
  if (now - SF.hitAt < 70 || SF.over) return;
  SF.hitAt = now;
  SF.hp = Math.max(0, SF.hp - 1);
  sfPaintHp();
  sfBlip(110, 70, .06);
  if (!SF.hp) sfGameOver();
};
const sfGameOver = () => {
  SF.over = true;
  SF.phase = "over";
  SF.objs = [];
  SF.t = 0;
  sfBlip(70, 600, .08, "sawtooth");
  smSays("Ha. Ha. ❄", 2600);
  sfUi.classList.add("over");
  setTimeout(() => { if (SF.on) sfEnd(false); }, 3800);
};

// ── Every frame: the heart, the patterns, the objects, the hits, the drawing
const sfFrame = now => {
  SF.raf = null;
  if (!SF.on) return;
  const dt = Math.min(.05, (now - SF.last) / 1000);
  SF.last = now;
  SF.t += dt;
  const I = sfInside(), prev = sfSoul.slice();
  if (SF.phase === "attack") {
    // the heart: towards the pointer (or by the arrows), at most 260 px/s, inside the box
    const K = SF.keys, kx = (K.ArrowRight ? 1 : 0) - (K.ArrowLeft ? 1 : 0), ky = (K.ArrowDown ? 1 : 0) - (K.ArrowUp ? 1 : 0);
    const max = 260 * dt;
    if (kx || ky) { sfSoul[0] += kx * max; sfSoul[1] += ky * max; }
    else if (smMouse) {
      const dx = smMouse[0] - sfSoul[0], dy = smMouse[1] - sfSoul[1], d = Math.hypot(dx, dy);
      if (d > .5) { const m = Math.min(d, max); sfSoul[0] += dx / d * m; sfSoul[1] += dy / d * m; }
    }
    sfSoul[0] = Math.max(I.x0, Math.min(I.x1, sfSoul[0]));
    sfSoul[1] = Math.max(I.y0, Math.min(I.y1, sfSoul[1]));
    // the patterns, one after the other
    if (!SF.pat && SF.pats.length) {
      const p = SF.pats.shift();
      SF.pat = typeof p === "string" ? SF_PATTERNS[p]() : { dur: p.wait, step: () => {} };
      SF.pat.t = 0;
    }
    if (SF.pat) {
      SF.pat.t += dt;
      SF.pat.step(SF.pat.t);
      if (SF.pat.t >= SF.pat.dur) SF.pat = null;
    }
    if (!SF.pat && !SF.pats.length) sfMenu();
  } else if (smMouse && SF.phase !== "over") sfSoul = smMouse.slice();  // free: the heart is the pointer
  sfMoved = Math.hypot(sfSoul[0] - prev[0], sfSoul[1] - prev[1]) / Math.max(dt, .001);
  // objects
  const [hx, hy] = sfSoul;
  SF.objs = SF.objs.filter(o => {
    if (o.kind === "bone") {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (SF.phase === "attack" && hx + 5 > o.x && hx - 5 < o.x + o.w && hy + 5 > o.y && hy - 5 < o.y + o.h && (!o.blue || sfMoved > 15)) sfHurt();
      return o.x > sfBox.x - 60 && o.x < sfBox.x + sfBox.w + 60;
    }
    o.t += dt;
    if (o.t > o.charge && !o.boomed) { o.boomed = true; smNoise(500, 1400, 200, .3); }
    if (o.t > o.charge && o.t < o.charge + o.fire && SF.phase === "attack") {
      // distance from the heart to the beam's line, ahead of the skull
      const ux = Math.cos(o.a), uy = Math.sin(o.a), rx = hx - (o.x - uy * 10), ry = hy - (o.y + ux * 10), along = rx * ux + ry * uy, across = Math.abs(-rx * uy + ry * ux);
      if (along > 0 && across < 26) sfHurt();
    }
    return o.t < o.charge + o.fire + .35;
  });
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
    c.fillRect(40, 10 - w / 2 - 5, 3000, w + 10);
    c.fillStyle = "#fff";
    c.fillRect(40, 10 - w / 2, 3000, w);
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
// ── His burning eye: a ray-marched volumetric flame (WebGL), on a canvas over his face
const SF_FLAME_FS = `precision mediump float;
uniform vec2 R; uniform float T;
float h3(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * n3(p); p = p * 2.02 + vec3(3.1, 1.7, 5.3); a *= .5; } return s; }
// the flame's density at p: rising from the eye (y = 0), wide at the base, thinning, leaning back
// and swaying, eaten by noise that climbs with time
float dens(vec3 p){
  float y = p.y;
  if (y < -.1) return 0.;
  vec3 q = p - vec3(-.24 * y * y + .06 * sin(T * 2.3 + y * 3.) * y, 0., 0.);
  float r = mix(.15, .015, smoothstep(0., 1.35, y)) + .05 * exp(-y * 9.);
  float d = length(q.xz) - r;
  float n = fbm(vec3(q.x * 4.2, q.y * 3.4 - T * 3.2, q.z * 4.2 + T * .6));
  return clamp(-d * 9. + (n - .5) * 2.4 + .3, 0., 1.) * (1. - smoothstep(1.05, 1.45, y));
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
  float g = .01 / (dot(uv, uv) + .004);  // the glow of the eye itself
  col += vec3(.25, .7, 1.) * g * .3;
  gl_FragColor = vec4(col, clamp(1. - tr + g * .12, 0., 1.));
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
  if (e.key === "Escape") { e.preventDefault(); return sfEnd(true); }
  if (e.key.indexOf("Arrow") === 0) { e.preventDefault(); SF.keys[e.key] = e.type === "keydown"; }
};
const sfStart = () => {
  if (SF.on || smStill()) return;
  Object.assign(SF, { on: true, phase: "", t: 0, turn: 0, hp: SF_HP, hitAt: 0, objs: [], pat: null, pats: [], keys: {}, over: false });
  smBusy = true;
  snowman.classList.add("hold");
  document.body.classList.add("sansfight");
  sfDark = document.createElement("div");
  sfDark.id = "xdark";
  snowman.parentNode.insertBefore(sfDark, snowman);
  sfUi = document.createElement("div");
  sfUi.id = "xfight";
  sfUi.innerHTML = '<div class="box"><p class="text"></p></div><canvas></canvas>' +
    `<div class="stats"><b>YOU</b><span>LV 1</span><span class="hp">HP</span><i class="bar"><i></i></i><span class="hpn">${SF_HP} / ${SF_HP}</span></div>` +
    '<div class="menu">' + [["fight", "FIGHT"], ["act", "ACT"], ["item", "ITEM"], ["mercy", "MERCY"]].map(([a, n]) =>
      `<button type="button" data-a="${a}"><i></i>${n}</button>`).join("") + "</div>";
  sfCv = sfUi.querySelector("canvas");
  sfCtx = sfCv.getContext("2d");
  document.body.append(sfUi);
  sfLayout();
  sfUi.querySelectorAll(".menu button").forEach(b => {
    b.addEventListener("click", e => { e.stopPropagation(); sfAct(b.dataset.a); });
    b.addEventListener("pointerenter", () => { if (SF.phase === "menu") sfBlip(330, 30, .03); });
  });
  sfUi.addEventListener("pointerdown", e => e.stopPropagation());
  addEventListener("resize", sfLayout);
  addEventListener("keydown", sfKey, true);
  addEventListener("keyup", sfKey, true);
  sfFlame = sfFlameStart();
  if (sfFlame) snowman.classList.add("flaming");
  sfSoul = smMouse ? smMouse.slice() : [innerWidth / 2, innerHeight / 2];
  SF.last = performance.now();
  SF.raf = requestAnimationFrame(sfFrame);
  // the dark falls, a line, then the first attack (slow, after a moment to get in place)
  SF.phase = "talk";
  setTimeout(() => {
    if (!SF.on) return;
    sfSay("* The snowman blocks the way!\n* Get ready...", () => { if (SF.on) sfAttack(); });
  }, 900);
};
// spared: the song stops with it; lost: too
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
