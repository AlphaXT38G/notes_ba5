// ── Epic finale (screen "epic", body.epic) ────────────────────────────────────────────────────
// 10 s before a metal show ends, a "More epicness ?" button shows up. Clicked, it queues the epic
// finale, which takes over right when the metal ends (css/epic.css): a blue and violet fantasy
// night with blue fire on the effects canvas (fx.js), the amp playing epic music in a loop. It
// lasts until its "Back to normal" button is clicked.
let epicQueued = false, epicAt = 0;  // epicAt: when it started (0 = not running)
SCREENS.epic = { className: "epic", subtitle: "Behold… more epicness.", transition: "epic" };
OVERRIDES.push(phase => {  // runs after the metal override (metal.js is loaded first)
  if (epicAt) return "epic";
  if (epicQueued && phase !== "metal") {  // the metal just ended: the epic finale takes over
    epicQueued = false;
    if (document.body.dataset.phase === "metal") { epicAt = Date.now(); return "epic"; }
  }
  return phase;
});

// ── Epic finale effects (canvas layers of mode "epic", see fx.js) ──
// Blue fire: thousands of tiny additive particles born in clusters ("tongues") that drift along
// the bottom, plus two tall braziers in the bottom corners. Each particle is stretched upward,
// wobbles with a turbulence made of sines of time and height, and cools from a white-cyan core
// to blue, violet and indigo smoke as it rises. Blobs are pre-drawn once, then only copied.
const BLUE_FIRE = [blob(200, 240, 255, .7), blob(110, 200, 255, .8), blob(60, 110, 255, .75), blob(140, 70, 255, .6), blob(50, 25, 110, .35)];
const blueFlames = [], embers = [], motes = [];
let tongues = [], fireTime = 0;
const makeTongues = () => {
  tongues = Array.from({ length: Math.max(8, Math.round(fxW / 70)) }, () => ({ x: Math.random() * fxW, v: (Math.random() - .5) * 30, power: .6 + Math.random() * .6 }));
  tongues.w = fxW;
};
fxLayers.push({
  mode: "epic",
  update(dt) {
    if (tongues.w !== fxW) makeTongues();
    fireTime += dt;
    const spawn = (x, y, size, rise) => blueFlames.push({ x, y, size, rise, age: 0, life: .6 + Math.random() * .6, seed: Math.random() * 9 });
    for (const t of tongues) {
      t.x += t.v * dt;
      if (t.x < 0 || t.x > fxW) t.v *= -1;
      for (let n = dt * 50 * t.power; n > 0 && blueFlames.length < 760; n--) {
        spawn(t.x + (Math.random() - .5) * 50, fxH + 10, 7 + Math.random() * 11 * t.power, 150 + Math.random() * 220 * t.power);
      }
    }
    for (const bx of [fxW * .04, fxW * .96]) {  // the two braziers
      for (let n = dt * 85; n > 0 && blueFlames.length < 760; n--) {
        spawn(bx + (Math.random() - .5) * 46, fxH + 10, 10 + Math.random() * 16, 260 + Math.random() * 320);
      }
    }
    for (const f of blueFlames) {
      f.age += dt;
      const h = fxH - f.y;
      f.x += (Math.sin(fireTime * 3 + f.seed + h * .02) * 30 + Math.sin(fireTime * 7.3 + f.seed * 2) * 12) * dt;
      f.y -= f.rise * dt;
      f.size *= 1 - dt * .45;
    }
    let k = 0;
    for (const f of blueFlames) if (f.age < f.life) blueFlames[k++] = f;
    blueFlames.length = k;
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const f of blueFlames) {
      const t = f.age / f.life, w = f.size, h = f.size * 2.6;  // stretched upward like a tongue of fire
      c.globalAlpha = (1 - t) * .9;
      c.drawImage(BLUE_FIRE[Math.min(4, Math.floor(t * 5))], f.x - w, f.y - h, w * 2, h * 2);
    }
    c.restore();
  },
  reset() { blueFlames.length = 0; tongues = []; fireTime = 0; },
});
// Embers and arcane motes: bright cyan sparks shooting up and twinkling, and soft blue / violet
// orbs of light floating slowly across the room
fxLayers.push({
  mode: "epic",
  update(dt) {
    for (let n = dt * 40; n > 0 && embers.length < 120; n--) {
      embers.push({ x: Math.random() * fxW, y: fxH, vx: (Math.random() - .5) * 40, vy: -(120 + Math.random() * 260), age: 0, life: 1.5 + Math.random() * 2, tw: Math.random() * 9 });
    }
    while (motes.length < 26) {
      motes.push({ x: Math.random() * fxW, y: Math.random() * fxH, r: 3 + Math.random() * 6, vx: (Math.random() - .5) * 18, vy: -(6 + Math.random() * 16), hue: Math.random() < .5 ? 205 : 270, ph: Math.random() * 9 });
    }
    for (const e of embers) { e.age += dt; e.x += e.vx * dt + Math.sin(e.age * 4 + e.tw) * 20 * dt; e.y += e.vy * dt; e.vy *= 1 - dt * .3; }
    for (const m of motes) { m.x += m.vx * dt; m.y += m.vy * dt; m.ph += dt; if (m.y < -20) { m.y = fxH + 20; m.x = Math.random() * fxW; } }
    let k = 0;
    for (const e of embers) if (e.age < e.life) embers[k++] = e;
    embers.length = k;
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const e of embers) {
      const a = (1 - e.age / e.life) * (.55 + .45 * Math.sin(e.age * 18 + e.tw));  // twinkle
      c.fillStyle = `rgba(190,240,255,${Math.max(0, a)})`;
      c.fillRect(e.x - 1.2, e.y - 1.2, 2.4, 2.4);
    }
    for (const m of motes) {
      const a = .35 + .25 * Math.sin(m.ph * 2);
      c.globalAlpha = a;
      c.drawImage(m.hue === 205 ? BLUE_FIRE[1] : BLUE_FIRE[3], m.x - m.r * 3, m.y - m.r * 3, m.r * 6, m.r * 6);
    }
    c.restore();
  },
  reset() { embers.length = motes.length = 0; },
});
// Arcane circle: a huge magic circle turning slowly behind the page, very faint: three rings, a
// ring of runes (glyphs made of random strokes, generated once) and an eight-pointed star of two
// squares. Its glow (shadowBlur) is costly, so the circle is drawn once per screen size on its own
// small canvas, and each frame only copies it, turned a little further.
const RUNES = Array.from({ length: 24 }, () => Array.from({ length: 3 }, () => [Math.random() * 10 - 5, Math.random() * 14 - 7, Math.random() * 10 - 5, Math.random() * 14 - 7]));
let circleTurn = 0, circleArt = null;
const drawCircleArt = () => {
  const R = Math.min(fxW, fxH) * .42, size = Math.ceil(R * 2 + 40);
  circleArt = document.createElement("canvas");
  circleArt.width = circleArt.height = size;
  const c = circleArt.getContext("2d");
  c.translate(size / 2, size / 2);
  c.strokeStyle = "rgba(140,170,255,.13)";
  c.shadowColor = "rgba(120,140,255,.6)"; c.shadowBlur = 12;
  c.lineWidth = 2;
  for (const r of [R, R * .86, R * .55]) { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); }
  for (let s = 0; s < 2; s++) {  // two squares turned 45 degrees: an eight-pointed star
    c.save(); c.rotate(s * Math.PI / 4);
    c.strokeRect(-R * .6, -R * .6, R * 1.2, R * 1.2);
    c.restore();
  }
  c.lineWidth = 1.6;
  RUNES.forEach((rune, i) => {  // the ring of runes between the two outer circles
    c.save();
    c.rotate(i / RUNES.length * Math.PI * 2);
    c.translate(0, -R * .93);
    c.beginPath();
    for (const [x1, y1, x2, y2] of rune) { c.moveTo(x1, y1); c.lineTo(x2, y2); }
    c.stroke();
    c.restore();
  });
};
fxLayers.push({
  mode: "epic",
  update(dt) { circleTurn += dt * .08; },
  draw(c) {
    if (!circleArt) drawCircleArt();
    c.save();
    c.globalCompositeOperation = "lighter";
    c.translate(fxW / 2, fxH / 2);
    c.rotate(circleTurn);
    c.drawImage(circleArt, -circleArt.width / 2, -circleArt.height / 2);
    c.restore();
  },
  resize() { circleArt = null; },
  reset() {},
});


// "More epicness ?": 10 s before a metal takeover ends this button rises in the middle of the
// screen. Clicking it queues the epic finale (epicQueued, see the override above) and gets its song ready
// (preloadEpic, below); it stays as "Epicness incoming…" until the metal ends, then goes away.
const moreBtn = document.createElement("button");
moreBtn.id = "more";
moreBtn.type = "button";
moreBtn.addEventListener("click", e => {
  e.stopPropagation();
  if (epicQueued) return;
  epicQueued = true;
  preloadEpic();
  moreBtn.classList.add("queued");
  moreBtn.textContent = "⚔️ Epicness incoming…";
});
// Epic music: the epic video, looped, on the same amp (turned blue). The player is loaded as soon
// as the button is clicked (paused), so it starts at once when the metal ends; the click also
// counts as the gesture browsers need for sound.
const EPIC = "pCUzn7WbUb4";
let epicRiff = null, epicPlaying = false, epicMuted = false;
const epicCommand = (func, args = []) => epicRiff && epicRiff.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const makeEpicRiff = (autoplay, muted) => {
  epicRiff = document.createElement("iframe");
  epicRiff.id = "epicriff";
  epicRiff.title = "Epic song";
  epicRiff.allow = "autoplay; encrypted-media";
  epicRiff.src = `https://www.youtube.com/embed/${EPIC}?autoplay=${autoplay}&mute=${muted ? 1 : 0}` +
    `&loop=1&playlist=${EPIC}&controls=0&enablejsapi=1`;
  document.body.append(epicRiff);
  epicMuted = muted;
};
const preloadEpic = () => { if (!epicRiff) makeEpicRiff(0, false); };
const epicPlay = () => {
  if (!epicRiff) {
    const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
    makeEpicRiff(1, !canSound);  // without any gesture yet (e.g. ?night=epic) it starts muted
  } else epicCommand("playVideo");
  epicPlaying = true;
  // a player that has only just been created ignores commands until it is ready: say "play"
  // again a few times (harmless if it is already playing)
  [1500, 3000, 5000, 8000].forEach(ms => setTimeout(() => { if (epicPlaying) epicCommand("playVideo"); }, ms));
  paintAmp();
};
const epicSound = () => { if (epicRiff && epicMuted) { epicCommand("unMute"); epicMuted = false; soundAt = performance.now(); paintAmp(); } };
const setEpicMusic = on => {
  document.removeEventListener("pointerdown", epicSound);
  if (!on) {
    epicRiff?.remove(); epicRiff = null; epicPlaying = epicMuted = false;
    amp.classList.remove("epic");
    if (!document.body.classList.contains("metal")) amp.remove();
    return;
  }
  amp.classList.add("epic");
  document.body.append(amp);
  epicPlay();
  if (epicMuted) document.addEventListener("pointerdown", epicSound, { once: true });
};
setEpicMusic(document.body.classList.contains("epic"));
document.addEventListener("epic", e => setEpicMusic(e.detail));

// "Back to normal": a small button in the bottom right corner during the epic finale. It ends the
// epic and the page falls back to whatever the clock says (the calm night after the metal show,
// the day, or the jazz bar at night). As long as the epic runs, the calm night waits.
const leaveBtn = document.createElement("button");
leaveBtn.id = "leave";
leaveBtn.type = "button";
leaveBtn.textContent = "↩ Back to normal";
leaveBtn.addEventListener("click", e => {
  e.stopPropagation();
  epicAt = 0;
  forcedDismissed = true;  // also leaves a ?night=epic
  applyScreen();
});
const setLeave = on => on ? document.body.append(leaveBtn) : leaveBtn.remove();
setLeave(document.body.classList.contains("epic"));
document.addEventListener("epic", e => setLeave(e.detail));

everySecond.push(() => {  // show / hide "More epicness ?" in the last 10 s of a metal show
  const left = document.body.classList.contains("metal") ? metalLeft() : 0;
  if (left > 0 && left <= 10) {
    if (!moreBtn.isConnected) {
      moreBtn.classList.remove("queued");
      moreBtn.textContent = "✨ More epicness ?";
      document.body.append(moreBtn);
    }
  } else moreBtn.remove();
});

