// ── The snowman's bad time: a fight, in the style of the old pixel RPG duels ──
// When the whole Megalovania plays (the 22nd click on his lowest button, snowman.js), he picks a
// fight. The page goes black around him; where the courses were, the battle box, and under it the
// stats (LV, HP and its bar). The mouse pointer becomes a red pixel-art heart, trapped in the box:
// it is exactly where the pointer is, never slowed, only kept inside; or moved by the arrow keys,
// and then it stays where they left it until the mouse moves again.
// Around it all, a diorama (sansscenes.js): scenes of cut paper whose layers slide with the heart,
// changing during the fight.
// One line to begin with, a moment to get in place, then the attacks never stop, faster and faster,
// overlapping more and more: bones from both sides along the floor and the ceiling, blue bones
// (they only hurt a heart that moves), bone waves, bones raining from the top, bones riding sine
// waves, a propeller of bones turning around the middle, snowflakes of bones bouncing in the box,
// bones erupting from the floor where red warnings flashed, rings of bones closing on the heart,
// skull blasters charging then firing a beam across the screen, alone or four crossing. The bones
// are outlined and shaded, the blue ones glow, the fast and turning ones leave a trail. Each hit:
// a crunch, the screen shakes, the box flashes red. The fight lands with a quake: a run of jolts
// and thuds as the dark falls, and again when the attacks begin. HP at 0: the heart breaks, game over. The fight
// ends with the song, with Escape, at game over, or with Christmas.
// He rises for it: he grows and floats, his bottom sinking past the bottom of the window, and he
// shakes with the quakes.
// His left eye glows blue and a flame rises from it: a WebGL shader ray-marching a volume of noise
// (rising from the top of the eye, leaning back, flickering), on a small canvas over his face that
// follows his gaze.
// Everything here is made when the fight starts and removed when it ends.
const SF_HP = 40;
const SF = { on: false, raf: null, phase: "", t: 0, fight: 0, hp: SF_HP, hitAt: 0, shake: 0, quakes: [], objs: [], active: [], nextAt: 0, n: 0, last: 0, keys: {}, typing: null, over: false, useMouse: true, scene: null };
const SF_SCENE_S = 22;  // seconds of each diorama
let sfUi = null, sfCv = null, sfCtx = null, sfDark = null, sfFlame = null, sfBox = null, sfBg = null, sfBgCtx = null;
let sfSoul = [0, 0], sfMoved = 0;
// The quakes the fight lands with: [seconds after the start of the run, strength] (a strength
// above 1 shakes harder than any hit). As the dark falls: a heavy blow, then aftershocks dying out
// with a last big one; when the attacks begin: a shorter run, as he strikes.
const SF_QUAKE_IN = [[.05, 1.8], [.25, 1.2], [.42, 1.5], [.6, 1], [.78, 1.3], [.95, .9], [1.15, 1.2], [1.35, .8],
  [1.55, 1.1], [1.8, .7], [2.05, 1], [2.3, .6], [2.55, .8], [2.9, 1.6]];
const SF_QUAKE_GO = [[0, 1.7], [.2, 1.1], [.38, 1.4], [.58, .9], [.8, 1.1], [1.05, .6], [1.35, .5]];
const sfQuake = run => { SF.quakes = SF.quakes.concat(run.map(([dt, s]) => [SF.t + dt, s])); };

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

// The layout: a big box where the courses are, the stats under it
const sfLayout = () => {
  const W = innerWidth, H = innerHeight;
  const w = Math.min(760, W - 32), h = Math.min(330, Math.max(190, H * .42));
  sfBox = { x: (W - w) / 2, y: Math.max(60, H * .5 - h / 2 - 16), w, h };
  if (!sfUi) return;
  Object.assign(sfUi.querySelector(".box").style, { left: `${sfBox.x}px`, top: `${sfBox.y}px`, width: `${w}px`, height: `${h}px` });
  Object.assign(sfUi.querySelector(".stats").style, { left: `${sfBox.x}px`, top: `${sfBox.y + h + 14}px`, width: `${w}px` });
  sfCv.width = sfBg.width = W;
  sfCv.height = sfBg.height = H;
  if (SF.scene) SF.scene.cur = SF_SCENES[SF.scene.name](W, H);  // its layers, at the new size
};
// The dioramas, one after another (built when they come), crossfading over 1.6 s
const sfSceneNext = () => {
  const i = SF.scene ? (SF_SCENE_ORDER.indexOf(SF.scene.name) + 1) % SF_SCENE_ORDER.length : 0, name = SF_SCENE_ORDER[i];
  SF.scene = { name, cur: SF_SCENES[name](innerWidth, innerHeight), prev: SF.scene ? SF.scene.cur : null, at: SF.t };
};
const sfBackground = dt => {
  const S = SF.scene, W = sfBg.width, H = sfBg.height, f = Math.min(1, (SF.t - S.at) / 1.6);
  const par = [Math.max(-1, Math.min(1, (sfSoul[0] - W / 2) / (W / 2))), Math.max(-1, Math.min(1, (sfSoul[1] - H / 2) / (H / 2)))];
  if (S.prev && f < 1) sfSceneDraw(sfBgCtx, S.prev, W, H, SF.t, dt, par, 1);
  else S.prev = null;
  sfSceneDraw(sfBgCtx, S.cur, W, H, SF.t, dt, par, f);
};

// The opening line in the box, typed letter by letter with a blip
const sfSay = (text, done) => {
  const p = sfUi.querySelector(".text");
  clearInterval(SF.typing);
  p.textContent = "";
  let i = 0;
  SF.typing = setInterval(() => {
    p.textContent = text.slice(0, ++i);
    if (text[i - 1] && text[i - 1].trim()) smTone(180, 40, { vol: .025 });  // a blip a letter
    if (i >= text.length) { clearInterval(SF.typing); SF.typing = null; if (done) setTimeout(done, 700); }
  }, 30);
};

// ── The attacks. Each pattern spawns objects over its duration, faster as the fight goes on (from
// 0.85 to 2 in a minute and a half). Objects: bones { kind: "bone", x, y, w, h, vx, vy, blue } and
// blasters { kind: "blaster", x, y, a (angle of fire), t, charge, fire }, in window pixels.
const sfSpeed = () => Math.min(2, .85 + SF.fight / 80);
// Bones: a centre x, y, a length along their own axis (a = 0: upright), a width, a turn a and its
// speed va, a velocity; blue ones only hurt a moving heart; fn: a motion of their own (o, dt);
// life: seconds; warm: seconds of a harmless ghost first (a warning); trail: leaves afterimages
const sfBoneAt = (x, y, len, w, a, more) => {
  const b = Object.assign({ kind: "bone", x, y, len, w, a, va: 0, vx: 0, vy: 0, blue: false, t: 0, life: 0, warm: 0, trail: false }, more);
  SF.objs.push(b);
  return b;
};
const sfBone = (x, y, w, h, vx, vy, blue) => sfBoneAt(x + w / 2, y + h / 2, h, w, 0, { vx, vy, blue: !!blue });
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
  // rows of short bones riding sine waves, from the right
  sine: () => {
    let next = 0, ph = Math.random() * 6;
    return { dur: 5.5, step: t => {
      if (t < next || t > 4.6) return;
      const s = sfSpeed(), B = sfBox, base = B.y + B.h / 2, amp = B.h * .32, p = ph + t * 2.2;
      next = t + .2 / s;
      [-1, 1].forEach(side => sfBoneAt(B.x + B.w + 20, base + side * B.h * .2, 46, 10, 0, { trail: true, p: p + (side > 0 ? Math.PI : 0), fn: (o, dt) => {
        o.x -= 240 * s * dt;
        o.y = base + side * B.h * .2 + Math.sin(o.p + o.t * 3.2) * amp * .55;
      } }));
    } };
  },
  // a propeller of four long bones turning around the middle of the box (a hole at its hub)
  spin: () => {
    let made = false;
    return { dur: 6, step: () => {
      if (made) return;
      made = true;
      const s = sfSpeed(), B = sfBox, px = B.x + B.w / 2, py = B.y + B.h / 2, len = Math.min(B.w, B.h) * .44, r0 = 38, dir = Math.random() < .5 ? 1 : -1;
      for (let i = 0; i < 4; i++) {
        sfBoneAt(px, py, len, 12, 0, { life: 5.6, warm: .7, trail: true, ang: i * Math.PI / 2, fn: (o, dt) => {
          o.ang += dir * (o.t < .7 ? .3 : .9 + .45 * s) * dt;
          o.x = px + Math.cos(o.ang) * (r0 + len / 2);
          o.y = py + Math.sin(o.ang) * (r0 + len / 2);
          o.a = o.ang - Math.PI / 2;
        } });
      }
    } };
  },
  // snowflakes of three crossed bones, spinning and bouncing off the walls of the box
  flake: () => {
    let n = 0;
    return { dur: 6, step: t => {
      if (n >= 3 || t < n * 1.1) return;
      n++;
      const s = sfSpeed(), B = sfBox, a = Math.random() * Math.PI * 2, v = 170 * s;
      SF.objs.push({ kind: "flake", x: B.x + 50 + Math.random() * (B.w - 100), y: B.y + 40, vx: Math.cos(a) * v, vy: Math.abs(Math.sin(a)) * v + 40, a: 0, va: 3 + s, len: 64, w: 9, t: 0, life: 6 - n * 1.1, warm: .5, trail: [] });
    } };
  },
  // red warnings on the floor, then bones erupting out of it there (one under the heart)
  erupt: () => {
    let next = .2, n = 0;
    return { dur: 5.6, step: t => {
      if (t < next || n >= 6) return;
      const s = sfSpeed(), B = sfBox, w = 70 + Math.random() * 60, x = n % 2 ? sfSoul[0] - w / 2 : B.x + Math.random() * (B.w - w);
      const h = B.h * (.45 + Math.random() * .25), floor = B.y + B.h, delay = .75 / Math.min(1.5, s);
      next = t + .8 / s;
      n++;
      SF.objs.push({ kind: "warn", x, w, h, t: 0, life: delay });
      for (let bx = x + 6; bx < x + w - 4; bx += 14) {
        sfBoneAt(bx, floor + h / 2, h, 10, 0, { life: delay + .75, fn: o => {
          const u = o.t - delay, k = u < 0 ? 0 : u < .12 ? u / .12 : u < .5 ? 1 : Math.max(0, 1 - (u - .5) / .2);
          o.y = floor + h / 2 - h * k;
        } });
      }
      setTimeout(() => { if (SF.on) { smNoise(180, 900, 200, .2); SF.shake = Math.max(SF.shake, .2); } }, delay * 1000);
    } };
  },
  // rings of short bones closing in on the heart, a gap in each to slip through
  ring: () => {
    let n = 0;
    return { dur: 6, step: t => {
      if (n >= 3 || t < n * 1.7) return;
      n++;
      const s = sfSpeed(), B = sfBox, [cx, cy] = sfSoul, R = Math.hypot(B.w, B.h) * .4, count = 20, gap = Math.floor(Math.random() * count), v = 150 * s;
      for (let i = 0; i < count; i++) {
        if (i === gap || i === (gap + 1) % count || i === (gap + 2) % count) continue;
        const ang = i / count * Math.PI * 2;
        sfBoneAt(cx, cy, 30, 9, ang, { r: R, trail: true, life: R / v + .6, fn: (o, dt) => {
          o.r -= v * dt;
          o.x = cx + Math.cos(ang) * o.r;
          o.y = cy + Math.sin(ang) * o.r;
          o.a = ang;  // lying across the way in, side by side with the next ones
        } });
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
  sfQuake(SF_QUAKE_GO);
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
    smTone(160, 140, { vol: .07, to: 60 });
  } else smTone(120, 50, { vol: .035 });
  SF.shake = Math.max(SF.shake, Math.min(1, SF.shake + (first ? .8 : .25)));  // never cuts a quake short
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
  smTone(220, 900, { vol: .08, type: "sawtooth", to: 50 });
  smSays("Ha. Ha. ❄", 2600);
  sfUi.classList.add("over");
  setTimeout(() => { if (SF.on) sfEnd(); }, 3800);
};
// Does the heart at x, y touch a bone?
// (a point in a bone: brought into the bone's own frame, where it is an upright box)
const sfInBone = (x, y, cx, cy, len, w, a) => {
  const dx = x - cx, dy = y - cy, c = Math.cos(a), s = Math.sin(a);
  return Math.abs(dx * c + dy * s) < w / 2 + 4.5 && Math.abs(-dx * s + dy * c) < len / 2 + 4.5;
};
const sfTouches = (x, y) => SF.objs.some(o => {
  if (o.t < o.warm) return false;
  if (o.kind === "bone") return (!o.blue || sfMoved > 15) && sfInBone(x, y, o.x, o.y, o.len, o.w, o.a);
  if (o.kind === "flake") return [0, 1, 2].some(i => sfInBone(x, y, o.x, o.y, o.len, o.w, o.a + i * Math.PI / 3));
  return false;
});

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
    else if (smMouse && SF.useMouse && SF.phase === "fight") sfSoul = smMouse.slice();
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
  for (const o of SF.objs) {
    if (o.trail && o.kind === "bone") { o.past = o.past || []; o.past.unshift([o.x, o.y, o.a]); if (o.past.length > 3) o.past.pop(); }
    o.t += dt;
    if (o.kind === "bone") {
      if (o.fn) o.fn(o, dt);
      else { o.x += o.vx * dt; o.y += o.vy * dt; o.a += o.va * dt; }
    } else if (o.kind === "flake") {  // bouncing off the walls of the box
      o.trail.unshift([o.x, o.y, o.a]);
      if (o.trail.length > 3) o.trail.pop();
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.a += o.va * dt;
      const r = o.len / 2 - 6;
      if (o.x < I.x0 + r) { o.x = I.x0 + r; o.vx = Math.abs(o.vx); }
      if (o.x > I.x1 - r) { o.x = I.x1 - r; o.vx = -Math.abs(o.vx); }
      if (o.y < I.y0 + r) { o.y = I.y0 + r; o.vy = Math.abs(o.vy); }
      if (o.y > I.y1 - r) { o.y = I.y1 - r; o.vy = -Math.abs(o.vy); }
    }
  }
  if (SF.phase === "fight") {
    const steps = Math.min(12, Math.ceil(Math.hypot(sfSoul[0] - prev[0], sfSoul[1] - prev[1]) / 6));
    for (let i = 1; i <= Math.max(1, steps); i++) {
      const u = i / Math.max(1, steps);
      if (sfTouches(smLerp(prev[0], sfSoul[0], u), smLerp(prev[1], sfSoul[1], u))) { sfHurt(); break; }
    }
  }
  const [hx, hy] = sfSoul;
  SF.objs = SF.objs.filter(o => {
    if (o.life && o.t > o.life) return false;
    if (o.kind === "bone") {
      const m = o.len / 2 + 80;
      return o.x > sfBox.x - m && o.x < sfBox.x + sfBox.w + m && o.y > sfBox.y - m - 200 && o.y < sfBox.y + sfBox.h + m;
    }
    if (o.kind !== "blaster") return true;
    if (o.t > o.charge && !o.boomed) { o.boomed = true; smNoise(500, 1400, 200, .3); SF.shake = Math.max(SF.shake, .35); }
    if (o.t > o.charge && o.t < o.charge + o.fire && SF.phase === "fight") {
      // the distance from the heart to the beam's line (from the mouth, ahead of the skull)
      const ux = Math.cos(o.a), uy = Math.sin(o.a), rx = hx - (o.x - uy * 17), ry = hy - (o.y + ux * 17), along = rx * ux + ry * uy, across = Math.abs(-rx * uy + ry * ux);
      if (along > 0 && across < 26) sfHurt();
    }
    return o.t < o.charge + o.fire + .35;
  });
  // the quakes due: each a jolt and a low thud
  while (SF.quakes.length && SF.t >= SF.quakes[0][0]) {
    const s = SF.quakes.shift()[1];
    SF.shake = Math.max(SF.shake, s);
    smNoise(260 + 120 * s, 260, 40, .25 * Math.min(1, s));
    smTone(70 + 20 * s, 220 + 100 * s, { vol: .06 * Math.min(1, s), type: "sine", to: 32 });
  }
  // the shake, dying away: the box and the diorama behind it (the strongest also tilt a little)
  if (SF.shake > 0) {
    const a = 10 * SF.shake * SF.shake, r = SF.shake > 1 ? (Math.random() - .5) * 1.6 * (SF.shake - 1) : 0;
    sfUi.style.transform = sfBg.style.transform = `translate(${f1((Math.random() - .5) * 2 * a)}px,${f1((Math.random() - .5) * 2 * a)}px) rotate(${f1(r)}deg)`;
    SF.shake = Math.max(0, SF.shake - dt * 4);
    if (!SF.shake) sfUi.style.transform = sfBg.style.transform = "";
  }
  sfRise();
  // the flame follows his gaze (snowman.js moves his eyes; in his own pixels, as he is scaled)
  if (sfFlame) { const k = snowman.offsetWidth / 300; sfFlame.cv.style.transform = `translate(${f1(smLookOff[0] * k)}px,${f1(smLookOff[1] * k)}px)`; }
  if (SF.phase === "fight" && SF.t - SF.scene.at > SF_SCENE_S) sfSceneNext();
  sfBackground(dt);
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
    const ghost = o.t < o.warm ? .3 + .2 * Math.sin(o.t * 30) : 1;  // a warning, blinking, harmless
    if (o.kind === "warn") {  // red on the floor where bones will come out
      const blink = .35 + .25 * Math.sin(o.t * 28);
      c.fillStyle = `rgba(255,40,40,${(blink * .45).toFixed(2)})`;
      c.fillRect(o.x, B.y + B.h - o.h, o.w, o.h);
      c.strokeStyle = `rgba(255,70,70,${blink.toFixed(2)})`;
      c.lineWidth = 2;
      c.strokeRect(o.x + 1, B.y + B.h - o.h + 1, o.w - 2, o.h - 2);
      c.fillStyle = `rgba(255,90,90,${(blink + .3).toFixed(2)})`;
      c.font = "700 22px 'Courier New', monospace";
      c.textAlign = "center";
      c.fillText("!", o.x + o.w / 2, B.y + B.h - 12);
    } else if (o.kind === "bone") {
      if (o.past) o.past.forEach((q, i) => sfDrawBone(c, q[0], q[1], o.len, o.w, q[2], o.blue, ghost * (.22 - i * .06)));
      sfDrawBone(c, o.x, o.y, o.len, o.w, o.a, o.blue, ghost);
    } else if (o.kind === "flake") {
      o.trail.forEach((q, i) => { for (let k = 0; k < 3; k++) sfDrawBone(c, q[0], q[1], o.len, o.w, q[2] + k * Math.PI / 3, false, ghost * (.2 - i * .06)); });
      for (let k = 0; k < 3; k++) sfDrawBone(c, o.x, o.y, o.len, o.w, o.a + k * Math.PI / 3, false, ghost);
      c.globalAlpha = ghost;
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(o.x, o.y, 7, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#4fd0ff";
      c.beginPath();
      c.arc(o.x, o.y, 3, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
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
// A bone: a shaft with two knobs at each end, outlined (the outline drawn first, wider, so only its
// outside shows), a shade along it; blue ones glow
const sfDrawBone = (c, x, y, len, w, a, blue, alpha) => {
  if (alpha <= 0 || len <= 0) return;
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.globalAlpha = alpha;
  const r = w * .42, body = w * .62, ends = [-len / 2 + r, len / 2 - r];
  if (blue) { c.fillStyle = "rgba(40,170,255,.22)"; c.fillRect(-w, -len / 2 - 4, w * 2, len + 8); }
  c.beginPath();
  c.rect(-body / 2, ends[0], body, Math.max(0, ends[1] - ends[0]));
  for (const e of ends) {
    c.moveTo(-r * .7 + r, e);
    c.arc(-r * .7, e, r, 0, Math.PI * 2);
    c.moveTo(r * .7 + r, e);
    c.arc(r * .7, e, r, 0, Math.PI * 2);
  }
  c.strokeStyle = blue ? "#0a4f8a" : "#7f8ca4";
  c.lineWidth = 2.4;
  c.stroke();
  c.fillStyle = blue ? "#33b6ff" : "#fff";
  c.fill();
  c.fillStyle = blue ? "rgba(255,255,255,.4)" : "rgba(140,155,185,.45)";
  c.fillRect(body * .1, ends[0] + r * .6, body * .2, Math.max(0, ends[1] - ends[0] - r * 1.2));
  c.restore();
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

// ── He rises: grown (from a point high on him, so his bottom sinks out of the window), floating
// up and down, shaken by the quakes and the hits like the box
const SF_RISE = .35, SF_RISE_S = 1.4;  // how much he grows, in how many seconds
const sfRise = () => {
  const u = Math.min(1, SF.t / SF_RISE_S), g = u * u * (3 - 2 * u), a = 6 * SF.shake * SF.shake;
  const x = (Math.random() - .5) * 2 * a, y = (Math.random() - .5) * 2 * a - g * (6 + 6 * Math.sin(SF.t * 1.7));
  snowman.style.transform = `translate(${f1(x)}px,${f1(y)}px) scale(${(1 + SF_RISE * g).toFixed(3)})`;
  smBox = null;  // his box changes all the time: his eyes measure it again (snowman.js)
};
const sfRiseEnd = () => {
  snowman.style.transition = "transform .9s ease-in-out";
  snowman.style.transform = "";
  setTimeout(() => { if (!SF.on) snowman.style.transition = ""; smBox = null; }, 950);
};

// ── Start and end
const sfKey = e => {
  if (!SF.on) return;
  if (e.key === "Escape") { e.preventDefault(); return sfEnd(); }
  if (e.key.indexOf("Arrow") === 0) {
    e.preventDefault();
    SF.keys[e.key] = e.type === "keydown";
    SF.useMouse = false;  // the heart stays where the keys leave it, until the mouse moves
  }
};
const sfPointer = () => { SF.useMouse = true; };
const sfStart = () => {
  if (SF.on || smStill()) return;
  Object.assign(SF, { on: true, phase: "talk", t: 0, fight: 0, hp: SF_HP, hitAt: 0, shake: 0, quakes: [], objs: [], active: [], nextAt: 0, n: 0, keys: {}, over: false, useMouse: true });
  smUnfreeze();  // no slow, frozen pointer from a snowball during the fight
  smBusy = true;
  snowman.classList.add("hold");
  document.body.classList.add("sansfight");
  sfDark = document.createElement("div");
  sfDark.id = "xdark";
  sfBg = document.createElement("canvas");
  sfBgCtx = sfBg.getContext("2d");
  sfDark.append(sfBg);
  snowman.parentNode.insertBefore(sfDark, snowman);
  SF.scene = null;
  sfUi = document.createElement("div");
  sfUi.id = "xfight";
  sfUi.innerHTML = '<div class="box"><p class="text"></p></div><canvas></canvas>' +
    `<div class="stats"><b>YOU</b><span>LV 1</span><span class="hp">HP</span><i class="bar"><i></i></i><span class="hpn">${SF_HP} / ${SF_HP}</span><small>ESC: run away</small></div>`;
  sfCv = sfUi.querySelector("canvas");
  sfCtx = sfCv.getContext("2d");
  document.body.append(sfUi);
  sfLayout();
  sfSceneNext();
  sfUi.addEventListener("pointerdown", e => e.stopPropagation());
  addEventListener("pointermove", sfPointer, { passive: true });
  addEventListener("resize", sfLayout);
  addEventListener("keydown", sfKey, true);
  addEventListener("keyup", sfKey, true);
  sfFlame = sfFlameStart();
  snowman.style.transition = "";
  const I = sfInside();
  sfSoul = [(I.x0 + I.x1) / 2, (I.y0 + I.y1) / 2];
  sfQuake(SF_QUAKE_IN);  // the fight lands on us
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
  removeEventListener("pointermove", sfPointer);
  SF.scene = null;
  sfFlameStop();
  sfRiseEnd();
  snowman.classList.remove("hold");
  document.body.classList.remove("sansfight");
  const ui = sfUi, dark = sfDark;
  sfUi = sfDark = null;
  ui.classList.add("leaving");
  dark.classList.add("leaving");
  setTimeout(() => { ui.remove(); dark.remove(); }, 700);
  smBusy = false;
  if (smMegaSong) smMegaStop();
};
