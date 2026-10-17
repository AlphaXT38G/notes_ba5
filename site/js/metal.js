// ── Metal takeover (screen "metal", body.metal) ───────────────────────────────────────────────
// At 1:00:00 one metal song, played three times in a row, takes over the page for 1 min 51 s
// (css/metal.css): red stage, chrome title, headbanging cards, lightning, chains, fire and thrown
// silhouettes on the effects canvas (fx.js), and a guitar amp playing the song. Then the calm
// night comes (calm.js), unless the epic finale takes over (epic.js). 20 clicks on the flame
// button within a minute start it at any time of day (startMetalEgg, called by flames.js).
const METAL_SONG = 37, METAL_PLAYS = 3;          // the song lasts 37 s and is played 3 times
const METAL_SECONDS = METAL_SONG * METAL_PLAYS;  // so the show lasts 1 min 51 s
let metalEggAt = 0;         // when the easter egg started it (0 = not running)
SCREENS.metal = {
  className: "metal",
  subtitle: () => metalEggAt ? "You lit too many fires. Time to headbang. 🤘" : "1:00 AM. Time to headbang. 🤘",
  transition: "metal",
};
SCHEDULE.push([3600, 3600 + METAL_SECONDS, "metal"]);
OVERRIDES.push(phase => {  // the easter egg runs for one song, whatever the clock says
  if (metalEggAt && Date.now() - metalEggAt < METAL_SECONDS * 1000) return "metal";
  metalEggAt = 0;
  return phase;
});
const startMetalEgg = () => { metalEggAt = Date.now(); applyScreen(); };
const metalLeft = () => {  // seconds before the current metal takeover ends (Infinity when forced)
  if (metalEggAt) return METAL_SECONDS - (Date.now() - metalEggAt) / 1000;
  if (forced === "metal") return Infinity;
  return 3600 + METAL_SECONDS - clockSeconds();
};
// A forced ?night=metal has no start on the clock: it counts from when the screen showed up
let metalOnAt = 0;
document.addEventListener("metal", e => { metalOnAt = e.detail ? Date.now() : 0; });
const metalElapsed = () => {  // seconds since the current metal takeover started
  if (metalEggAt) return (Date.now() - metalEggAt) / 1000;
  if (forced === "metal") return metalOnAt ? (Date.now() - metalOnAt) / 1000 : 0;
  return Math.max(0, clockSeconds() - 3600);
};

// Metal stage: a white strobe, the equalizer and the effects canvas below, all created when the
// metal phase starts and removed when it ends. A bolt strikes every 1.2 - 3.5 s at a random spot,
// with a flash and a short shake of the page.
const strobe = document.createElement("div"), eq = document.createElement("div");
strobe.id = "strobe";
eq.id = "eq";
eq.innerHTML = Array.from({ length: 48 }, () =>
  `<i style="--d:${(.18 + Math.random() * .3).toFixed(2)}s;--lo:${(.08 + Math.random() * .2).toFixed(2)};--hi:${(.45 + Math.random() * .55).toFixed(2)}"></i>`
).join("");
// Lightning: each bolt is generated at random. A jagged path runs from above the top of the
// screen down to a random point, the segments kicked sideways at random, and side branches fork
// off it (up to two levels, thinner each time). It is drawn three times on top of each other
// (wide violet halo, glow, white core) and flickers a few times during its 0.5 s life.
const bolts = [];
const FLICKER = [1, .2, 1, .45, .9, .6, 0];  // brightness over the life of a bolt
const boltPath = (x1, y1, x2, y2, spread, depth, out, width) => {
  const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(5, Math.round(len / 18));
  const pts = [[x1, y1]], ang = Math.atan2(y2 - y1, x2 - x1);
  for (let i = 1; i <= n; i++) {
    const t = i / n, last = i === n;
    const x = x1 + (x2 - x1) * t + (last ? 0 : (Math.random() - .5) * spread);
    const y = y1 + (y2 - y1) * t + (last ? 0 : (Math.random() - .5) * spread * .3);
    pts.push([x, y]);
    if (depth < 2 && !last && Math.random() < .16) {  // fork a branch off this point
      const bl = (1 - t) * len * (.3 + Math.random() * .4), ba = ang + (Math.random() < .5 ? -1 : 1) * (.35 + Math.random() * .6);
      boltPath(x, y, x + Math.cos(ba) * bl, y + Math.sin(ba) * bl, spread * .6, depth + 1, out, width * .5);
    }
  }
  out.push({ pts, width });
};
fxLayers.push({
  mode: "metal",
  update(dt) {
    for (const b of bolts) b.age += dt;
    while (bolts.length && bolts[0].age > bolts[0].life) bolts.shift();
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    c.lineCap = c.lineJoin = "round";
    for (const b of bolts) {
      const a = FLICKER[Math.min(FLICKER.length - 1, Math.floor(b.age / b.life * FLICKER.length))];
      for (const [mul, color, blur] of [[4, `rgba(150,100,255,${.35 * a})`, 30], [2, `rgba(205,180,255,${.7 * a})`, 12], [1, `rgba(255,255,255,${a})`, 0]]) {
        c.strokeStyle = color; c.shadowColor = "#a77bff"; c.shadowBlur = blur;
        for (const p of b.paths) {
          c.lineWidth = p.width * mul;
          c.beginPath();
          p.pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
          c.stroke();
        }
      }
    }
    c.restore();
  },
  reset() { bolts.length = 0; },
});

// Chains: heavy metal chains hanging from the top corners, simulated with Verlet integration:
// each joint remembers its previous position (its speed is the difference), gravity pulls it
// down, then every link is pushed back to its fixed length a few times per frame, the top joint
// staying nailed above the screen. They sway by themselves, get whipped by each lightning strike
// and kicked on each beat, and swing away from the mouse. Links alternate face-on (a ring) and
// edge-on (a thick bar), drawn with a dark outline, a steel gradient and a highlight.
const LINK = 13;  // distance between two joints, px
const chains = [];
let mouseX = -1e4, mouseY = -1e4, beatClock = 0;
addEventListener("pointermove", e => { mouseX = e.clientX; mouseY = e.clientY; });
const makeChains = () => {
  chains.length = 0;
  chains.w = fxW;
  // Hang them in the empty margins beside the content (960 px wide): two per side when there is
  // room, otherwise one against each edge of the screen
  const margin = (fxW - 960) / 2;
  const spots = margin >= 120 ? [margin * .3, margin * .75, fxW - margin * .75, fxW - margin * .3] : [10, fxW - 10];
  for (const x of spots) {
    const n = Math.round(fxH * (.28 + Math.random() * .3) / LINK);
    chains.push(Array.from({ length: n + 1 }, (_, i) => ({ x, y: (i - 1) * LINK, px: x, py: (i - 1) * LINK })));
  }
};
const kick = power => chains.forEach(ch => ch.forEach(p => { p.px -= (Math.random() - .5) * power; }));  // moving px gives speed
strikeHooks.push(() => kick(16));
const steelCache = {};  // gradients are expressed in the link's own coordinates, so they can be reused
const steel = (c, w) => steelCache[w] || (steelCache[w] = steelGradient(c, w));
const steelGradient = (c, w) => {  // vertical steel gradient across a link of thickness w
  const g = c.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, "#f4f4f4"); g.addColorStop(.35, "#9a9a9a"); g.addColorStop(.55, "#3c3c3c"); g.addColorStop(.8, "#c8c8c8"); g.addColorStop(1, "#5a5a5a");
  return g;
};
const drawLink = (c, a, b, face) => {
  c.save();
  c.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
  c.rotate(Math.atan2(b.y - a.y, b.x - a.x));
  const len = LINK * .78;
  if (face) {  // a ring seen from the front
    c.lineWidth = 5.5; c.strokeStyle = "#0b0b0b";
    c.beginPath(); c.ellipse(0, 0, len, 5.5, 0, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3.2; c.strokeStyle = steel(c, 6);
    c.stroke();
    c.lineWidth = 1; c.strokeStyle = "rgba(255,255,255,.55)";
    c.beginPath(); c.ellipse(0, -.8, len - 1, 4.2, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  } else {  // a ring seen from the side: a thick rounded bar
    c.lineCap = "round";
    c.lineWidth = 6.5; c.strokeStyle = "#0b0b0b";
    c.beginPath(); c.moveTo(-len, 0); c.lineTo(len, 0); c.stroke();
    c.lineWidth = 4.2; c.strokeStyle = steel(c, 2.5);
    c.stroke();
  }
  c.restore();
};
fxLayers.push({
  mode: "metal",
  update(dt) {
    if (chains.w !== fxW) makeChains();  // first frame, or the window was resized
    beatClock += dt;
    if (beatClock > .46) { beatClock -= .46; kick(3.5); }
    const g = 900 * dt * dt;
    for (const ch of chains) {
      for (let i = 1; i < ch.length; i++) {
        const p = ch[i], vx = (p.x - p.px) * .99, vy = (p.y - p.py) * .99;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + g;
        const dx = p.x - mouseX, dy = p.y - mouseY, d = Math.hypot(dx, dy);
        if (d < 90 && d > 0) p.x += dx / d * (90 - d) * .06;  // pushed away by the mouse
      }
      for (let k = 0; k < 6; k++) for (let i = 1; i < ch.length; i++) {
        const a = ch[i - 1], b = ch[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - LINK) / d;
        if (i === 1) { b.x -= dx * f; b.y -= dy * f; }  // the top joint never moves
        else { a.x += dx * f / 2; a.y += dy * f / 2; b.x -= dx * f / 2; b.y -= dy * f / 2; }
      }
    }
  },
  draw(c) {
    for (const ch of chains) for (let i = 1; i < ch.length; i++) drawLink(c, ch[i - 1], ch[i], i % 2);
  },
  reset() { chains.length = 0; chains.w = 0; },
});

// Fire and sparks. A curtain of flames rises from the bottom of the screen: each particle goes
// from white-yellow to orange, red and dark smoke as it ages, rising with a slight wobble while it
// shrinks. To keep a few hundred of them cheap, each colour is pre-drawn once as a soft blob that
// is then only copied (drawImage). Each lightning strike throws a shower of sparks from where it
// hits: bright streaks falling under gravity.
const FIRE = [blob(255, 245, 190, .9), blob(255, 190, 40, .8), blob(255, 90, 10, .7), blob(190, 20, 0, .5), blob(40, 20, 20, .35)];
const flames = [], sparks = [];
strikeHooks.push((x, y) => {
  for (let i = 0; i < 45 && sparks.length < 220; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 2.4, s = 150 + Math.random() * 380;
    sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, age: 0, life: .5 + Math.random() * .6 });
  }
});
fxLayers.push({
  mode: "metal",
  update(dt) {
    for (let n = Math.min(40, dt * fxW * .35); n > 0 && flames.length < 450; n--) {
      flames.push({ x: Math.random() * fxW, y: fxH + 12, vx: (Math.random() - .5) * 20, vy: -(80 + Math.random() * 120),
        r: 16 + Math.random() * 20, age: 0, life: .7 + Math.random() * .7, seed: Math.random() * 6 });
    }
    for (const f of flames) {
      f.age += dt;
      f.x += (f.vx + Math.sin(f.age * 6 + f.seed) * 25) * dt;
      f.y += f.vy * dt;
      f.r *= 1 - dt * .5;
    }
    for (const s of sparks) {
      s.age += dt;
      s.px = s.x; s.py = s.y;
      s.vy += 900 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    for (const list of [flames, sparks]) {
      let k = 0;
      for (const p of list) if (p.age < p.life) list[k++] = p;
      list.length = k;
    }
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const f of flames) {
      const t = f.age / f.life;
      c.globalAlpha = 1 - t * .6;
      c.drawImage(FIRE[Math.min(4, Math.floor(t * 5))], f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    c.globalAlpha = 1;
    c.lineCap = "round";
    for (const s of sparks) {
      const t = s.age / s.life;
      c.strokeStyle = `rgba(255,${Math.round(230 - t * 150)},${Math.round(120 - t * 120)},${1 - t})`;
      c.lineWidth = 2.2 * (1 - t) + .5;
      c.beginPath(); c.moveTo(s.px, s.py); c.lineTo(s.x + (s.x - s.px), s.y + (s.y - s.py)); c.stroke();
    }
    c.restore();
  },
  reset() { flames.length = sparks.length = 0; },
});

// Flying silhouettes: a skull, a Flying V guitar and a "horns" hand, drawn as vector shapes in a
// 100 x 100 box and filled with chrome, outlined in black with
// a red glow. They are thrown from the bottom corners in an arc, with real gravity and a spin.
const SKULL = new Path2D("M50 6C28 6 12 22 12 44c0 13 6 22 14 28v14c0 4 3 7 7 7h4v-8h6v8h14v-8h6v8h4c4 0 7-3 7-7V72c8-6 14-15 14-28C88 22 72 6 50 6Z" +
  "M33 40c6 0 11 5 11 11s-5 10-11 10-11-4-11-10 5-11 11-11ZM67 40c6 0 11 5 11 11s-5 10-11 10-11-4-11-10 5-11 11-11ZM50 60l6 12H44Z");
const FLYING_V = new Path2D("M44 2h12l-2 12h-2v30l28 46-15 10-15-26-15 26-15-10 28-46V14h-2Z");
const HORNS = new Path2D();
HORNS.roundRect(28, 48, 46, 46, 10);  // fist
HORNS.roundRect(28, 6, 13, 52, 6);    // index finger, up
HORNS.roundRect(61, 16, 12, 42, 6);   // little finger, up
HORNS.roundRect(36, 58, 30, 11, 5);   // thumb folded over the other fingers
// [shape, fill rule]: even-odd cuts the skull's eyes and nose, non-zero merges the hand's parts
const SHAPES = [[SKULL, "evenodd"], [FLYING_V, "nonzero"], [HORNS, "nonzero"]];
const thrown = [];
let chrome = null;
let throwClock = 0;
fxLayers.push({
  mode: "metal",
  update(dt) {
    throwClock += dt;
    if (throwClock > .35) {
      throwClock = 0;
      if (thrown.length < 18) {
        const left = Math.random() < .5, dir = left ? 1 : -1;
        const [shape, rule] = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        thrown.push({ shape, rule, size: 34 + Math.random() * 30,
          x: left ? Math.random() * fxW * .12 : fxW - Math.random() * fxW * .12, y: fxH + 40,
          vx: dir * fxW * (.18 + Math.random() * .3), vy: -fxH * (1 + Math.random() * .45),
          a: 0, va: dir * (3 + Math.random() * 5) });
      }
    }
    for (const t of thrown) {
      t.vy += fxH * 1.1 * dt;  // gravity, scaled to the screen so the arc always fits
      t.x += t.vx * dt; t.y += t.vy * dt; t.a += t.va * dt;
    }
    let k = 0;
    for (const t of thrown) if (t.y < fxH + 80) thrown[k++] = t;
    thrown.length = k;
  },
  draw(c) {
    for (const t of thrown) {
      c.save();
      c.translate(t.x, t.y);
      c.rotate(t.a);
      c.scale(t.size / 100, t.size / 100);
      c.translate(-50, -50);
      if (!chrome) {  // made once: it lives in the shape's own 100 x 100 box
        chrome = c.createLinearGradient(0, 0, 0, 100);
        chrome.addColorStop(0, "#ffffff"); chrome.addColorStop(.4, "#9c9c9c"); chrome.addColorStop(.52, "#2e2e2e"); chrome.addColorStop(.7, "#dcdcdc"); chrome.addColorStop(1, "#6a6a6a");
      }
      c.shadowColor = "rgba(255,40,0,.9)"; c.shadowBlur = 18;
      c.fillStyle = chrome;
      c.fill(t.shape, t.rule);
      c.shadowBlur = 0;
      c.lineWidth = 4; c.strokeStyle = "#0a0a0a";
      c.stroke(t.shape);
      c.restore();
    }
  },
  reset() { thrown.length = 0; throwClock = 0; },
});

let boltTimer = null;
const strike = () => {
  boltTimer = setTimeout(strike, 1200 + Math.random() * 2300);
  if (document.hidden || bolts.length >= 3) return;
  const x = fxW * (.08 + Math.random() * .84), ex = x + (Math.random() - .5) * fxW * .25, ey = fxH * (.55 + Math.random() * .4);
  const paths = [];
  boltPath(x, -20, ex, ey, 70, 0, paths, 2.6);
  bolts.push({ paths, age: 0, life: .5 });
  strikeHooks.forEach(hook => hook(ex, ey));
  strobe.animate([{ opacity: 0 }, { opacity: .35 }, { opacity: 0 }], { duration: 180 });
  document.querySelector(".wrap").animate(
    [{ transform: "none" }, { transform: "translate(-6px,3px)" }, { transform: "translate(5px,-4px)" }, { transform: "none" }],
    { duration: 220 });
};
// Start / stop the metal stage: strobe, equalizer and lightning (the canvas effects themselves
// are started by setFx). The first bolt waits for the slam into the show to settle.
const setMetalStage = on => {
  clearTimeout(boltTimer);
  [strobe, eq].forEach(el => el.remove());
  if (!on) return;
  document.body.append(strobe, eq);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) boltTimer = setTimeout(strike, 800);
};
setMetalStage(document.body.classList.contains("metal"));
document.addEventListener("metal", e => setMetalStage(e.detail));

// Metal music: a cover of the Master of Puppets solo from YouTube (37 s), played three times in a
// row: the show ends with the third play. It is in sync with the takeover: opened late, it starts
// at the right play, further into the song, so both end together. It starts by
// itself when the phase begins. Browsers only allow sound after a user gesture, so if the page
// has not had one yet the song autoplays muted and the sound comes on at the first click or key
// press anywhere (the song keeps its place in time). The amp plays / pauses it; the end of the
// phase stops it.
const METAL = "mOqcq7DZo_U";
let riff = null, rocking = false, riffMuted = false, soundAt = 0;
const amp = document.createElement("button");
amp.id = "amp";
amp.type = "button";
amp.innerHTML = '<span class="cab"><span class="panel"><span class="logo">BA5</span><span class="knobs">' +
  "<i></i>".repeat(5) + '</span></span><span class="grille"><span class="cone"></span><span class="cone"></span></span></span><span class="label"></span>';
const paintAmp = () => {
  if (amp.classList.contains("epic")) {  // the epic finale plays its own song on the same amp
    amp.classList.toggle("playing", epicPlaying);
    amp.querySelector(".label").textContent = !epicPlaying ? "✨ Click for epicness"
      : epicMuted ? "🔇 Click anywhere for sound" : "✨ Epic — click to pause";
    amp.title = !epicPlaying ? "Play the music" : epicMuted ? "Turn the sound on" : "Pause the music";
    return;
  }
  amp.classList.toggle("playing", rocking);
  // which of the three plays is on (a forced show plays it forever: no count)
  const count = metalLeft() === Infinity ? "" : ` ${Math.min(METAL_PLAYS, riffPlay + 1)}/${METAL_PLAYS}`;
  amp.querySelector(".label").textContent = !rocking ? "🎸 Click to crank it up"
    : riffMuted ? "🔇 Click anywhere for sound" : `🎸 Rocking${count} — click to mute`;
  amp.title = !rocking ? "Play the music" : riffMuted ? "Turn the sound on" : "Pause the music";
};
const riffCommand = (func, args = []) => riff && riff.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const makeRiff = (autoplay, muted, start) => {
  riff = document.createElement("iframe");
  riff.id = "riff";
  riff.title = "Metal song";
  riff.allow = "autoplay; encrypted-media";
  riff.src = `https://www.youtube.com/embed/${METAL}?autoplay=${autoplay}&mute=${muted ? 1 : 0}` +
    `&start=${start}&controls=0&enablejsapi=1`;
  document.body.append(riff);
  riffMuted = muted;
};
// Loading the YouTube player takes a few seconds, so when the takeover is coming (10th click on
// the flame button, or 00:59:30) the player is loaded in advance, hidden, paused and muted at
// its start; starting it is then almost instant. Unused, it is dropped again after 75 s.
let riffWaiting = false, riffDrop = null;
const preloadRiff = () => {
  if (riff) return;
  makeRiff(0, true, 0);
  riffWaiting = true;
  clearTimeout(riffDrop);
  riffDrop = setTimeout(() => {
    if (riffWaiting && !document.body.classList.contains("metal")) { riff.remove(); riff = null; riffWaiting = false; }
  }, 75000);
};
everySecond.push(() => {  // 00:59:30: get the song ready for the 1:00 show
  const t = clockSeconds();
  if (t >= 3600 - 30 && t < 3600) preloadRiff();
});
// Each new play starts the song again from the top (the player has stopped at its end by then).
// riffPlay: which play the player is on (0, 1, 2), so the song restarts once per play.
let riffPlay = 0;
const metalPlay = () => Math.floor(metalElapsed() / METAL_SONG);
everySecond.push(() => {
  if (!rocking || riffWaiting || !document.body.classList.contains("metal")) return;
  const play = metalPlay();
  if (play === riffPlay) return;
  riffPlay = play;
  riffCommand("seekTo", [0, true]);
  riffCommand("playVideo");
  paintAmp();
});
const rock = (muted = false) => {
  riffPlay = metalPlay();
  const late = Math.floor(metalElapsed()) % METAL_SONG;  // where the current play is in the song
  if (!riff) makeRiff(1, muted, late);
  else if (riffWaiting) {  // the preloaded player: jump to the right spot, sound on if allowed, play
    riffWaiting = false;
    if (late) riffCommand("seekTo", [late, true]);
    if (!muted) { riffCommand("unMute"); riffMuted = false; }
    riffCommand("playVideo");
    // preloaded only a moment ago, it may not be ready for commands yet: repeat them a few times
    [1500, 3000, 5000].forEach(ms => setTimeout(() => {
      if (!rocking) return;
      if (!riffMuted) riffCommand("unMute");
      riffCommand("playVideo");
    }, ms));
  } else {  // paused by the amp: the show went on meanwhile, jump back in time with it
    riffCommand("seekTo", [late, true]);
    riffCommand("playVideo");
  }
  rocking = true;
  paintAmp();
};
const riffSound = () => {  // unmute a song that autoplayed muted
  if (!riff || !riffMuted) return;
  riffCommand("unMute");
  riffMuted = false;
  soundAt = performance.now();
  paintAmp();
};
amp.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - soundAt < 600) return;  // this same click just turned the sound on
  if (amp.classList.contains("epic")) {  // epic song (see the epic finale below)
    if (epicMuted) epicSound();
    else if (epicPlaying) { epicCommand("pauseVideo"); epicPlaying = false; paintAmp(); }
    else epicPlay();
    return;
  }
  if (riffMuted) riffSound();
  else if (rocking) { riffCommand("pauseVideo"); rocking = false; paintAmp(); }
  else rock();
});
const setMetalMusic = on => {
  document.removeEventListener("pointerdown", riffSound);
  document.removeEventListener("keydown", riffSound);
  if (!on) { riff?.remove(); riff = null; rocking = riffMuted = riffWaiting = false; amp.remove(); return; }
  document.body.append(amp);
  const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
  rock(!canSound);
  if (!canSound) {
    document.addEventListener("pointerdown", riffSound, { once: true });
    document.addEventListener("keydown", riffSound, { once: true });
  }
};
setMetalMusic(document.body.classList.contains("metal"));
document.addEventListener("metal", e => setMetalMusic(e.detail));

