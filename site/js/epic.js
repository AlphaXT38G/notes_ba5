// ── Epic finale (screen "epic", body.epic) ────────────────────────────────────────────────────
// 10 s before a metal show ends, a "More epicness ?" medallion shows up. Clicked, it queues the
// epic finale, summoned in the last seconds of the show, which takes over right when the metal
// ends (css/epic.css): a blue and violet fantasy night with blue fire on the effects canvas
// (fx.js), and its music played by a knight with a lute by a campfire (bard.js). It lasts until
// a code leaves it (leaveEpic, below). The kamelot code (below) opens it at any time.
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
// (preloadEpic, below); it stays, counting down, until the metal ends, then goes away.
// It is a medallion forged in blue fire (css/epic.css), on a pool of darkness that hides the show
// behind: light rays turning behind it, a ring of runes (an SVG shown as an <img>, its glow
// rendered once), ten charge pips around it that light up one by one as the end of the show nears
// once it was clicked, sparks rising, a shine sweeping its face. Every moving part only turns,
// scales or fades.
const MORE_SIGIL = (() => {
  const runes = Array.from({ length: 30 }, (_, i) => {
    let d = "";
    for (let k = 0; k < 3; k++) {
      const r = () => (Math.random() * 7 - 3.5).toFixed(1);
      d += `M${r()},${r()}L${r()},${r()}`;
    }
    return `<path transform="rotate(${i * 12}) translate(0,-83)" d="${d}"/>`;
  }).join("");
  const ticks = Array.from({ length: 72 }, (_, i) => `<path transform="rotate(${i * 5})" d="M0,-96v${i % 6 ? 3 : 6}"/>`).join("");
  const star = [0, 45].map(a => `<rect transform="rotate(${a})" x="-50" y="-50" width="100" height="100"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200"><defs><filter id="g" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
    `<g filter="url(#g)" fill="none" stroke="#a9c8ff" stroke-linecap="round"><circle r="92" stroke-width="1.6"/><circle r="74" stroke-width="1.2"/>` +
    `<circle r="99" stroke-width=".6" stroke-dasharray="2 5"/><g stroke-width="1">${ticks}</g><g stroke-width="1.3" stroke="#d6c4ff">${runes}</g>` +
    `<g stroke-width="1" stroke="#7fa6ff" opacity=".8">${star}</g></g></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
})();
const moreBtn = document.createElement("button");
moreBtn.id = "more";
moreBtn.type = "button";
moreBtn.innerHTML = `<span class="m-void"></span><span class="m-burst"></span><span class="m-rays"></span><span class="m-halo"></span><img class="m-sigil" src="${MORE_SIGIL}" alt="">` +
  `<span class="m-pips">${Array.from({ length: 10 }, (_, i) => `<i style="transform:rotate(${i * 36}deg)"></i>`).join("")}</span>` +
  `<span class="m-sparks">${Array.from({ length: 12 }, (_, i) => `<i style="transform:rotate(${i * 30 + 8}deg)"><b style="animation-delay:${(i * .37 % 2).toFixed(2)}s"></b></i>`).join("")}</span>` +
  `<span class="m-face"><small class="m-kick"></small><b class="m-title"></b><small class="m-hint"></small><span class="m-shine"></span></span>`;
const paintMore = () => {
  const queued = moreBtn.classList.contains("queued"), left = Math.max(0, Math.ceil(metalLeft()));
  moreBtn.querySelector(".m-kick").textContent = queued ? "Summoning" : "The show is ending";
  moreBtn.querySelector(".m-title").innerHTML = queued ? `<span class="m-count">${left}</span>` : "More<br>epicness ?";
  moreBtn.querySelector(".m-hint").textContent = queued ? "Epicness incoming…" : "⚔️ Click to summon";
  moreBtn.setAttribute("aria-label", queued ? `Epic finale in ${left} seconds` : "More epicness");
  moreBtn.querySelectorAll(".m-pips i").forEach((pip, i) => pip.classList.toggle("on", queued && i < 10 - left));
};
moreBtn.addEventListener("click", e => {
  e.stopPropagation();
  if (epicQueued) return;
  epicQueued = true;
  preloadEpic();
  moreBtn.classList.add("queued");
  paintMore();
  queueSummoning();
});

// The summoning: the last seconds of the show once the finale is queued, so that the switch is an
// event rather than a cut. SUMMON_BUILD s before the metal ends an overlay (#summon, css/epic.css)
// takes over: the room goes dark, a huge rune circle turns in, pillars of light rise from the
// floor, streaks of energy rush to the medallion, which implodes into a core of light; at the very
// end of the show the core bursts in a white flash and two shock waves, the screen switches under
// the flash (the view transition starts from white), and "Epicness unleashed" shows while the
// light fades onto the finale. A rising whoosh and a deep boom go with it (Web Audio, unless the
// show was muted). Its CSS animations share one timeline (SUMMON_BUILD + SUMMON_TAIL long, the
// switch at SUMMON_BUILD); clicked late, it starts part way through (--skip, a negative delay).
// The switch itself is timed to the millisecond here instead of waiting for the next clock tick.
const SUMMON_BUILD = 3.2, SUMMON_TAIL = 2.6;
const summon = document.createElement("div");
summon.id = "summon";
summon.setAttribute("aria-hidden", "true");
summon.innerHTML = `<span class="s-veil"></span><img class="s-sigil" src="${MORE_SIGIL}" alt="">` +
  `<span class="s-beams">${[8, 22, 34, 46, 58, 70, 83, 93].map((x, i) => `<i style="left:${x}%;animation-delay:calc(var(--skip) + ${(i * .53 % 1.4).toFixed(2)}s)"></i>`).join("")}</span>` +
  `<span class="s-streaks">${Array.from({ length: 18 }, (_, i) => `<i style="transform:rotate(${i * 20 + (i * 7) % 11}deg)"><b style="animation-delay:${(i * .29 % .7).toFixed(2)}s"></b></i>`).join("")}</span>` +
  `<span class="s-core"></span><span class="s-wave"></span><span class="s-wave s-wave2"></span><span class="s-flash"></span>` +
  `<span class="s-word"><b>Epicness</b><b>unleashed</b></span>`;
let summonTimers = [], summonAudio = null;
const metalLeftNow = () => metalEggAt ? metalLeft() : metalLeft() - new Date().getMilliseconds() / 1000;  // the clock's, to the ms
const endSummoning = () => {
  summonTimers.forEach(clearTimeout);
  summonTimers = [];
  summon.remove();
  moreBtn.classList.remove("implode");
  if (summonAudio && summonAudio.state === "running") summonAudio.suspend().catch(() => {});  // its sounds are over
};
const queueSummoning = () => {
  endSummoning();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;  // the finale simply comes on time
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC && !summonAudio) try { summonAudio = new AC(); } catch (e) {}  // made in the click, so allowed to sound
  summonTimers.push(setTimeout(startSummoning, Math.max(0, (metalLeftNow() - SUMMON_BUILD) * 1000)));
};
const startSummoning = () => {
  if (!epicQueued || document.body.dataset.phase !== "metal") return;
  const left = Math.max(0, metalLeftNow());
  summon.style.setProperty("--skip", `${-(SUMMON_BUILD - Math.min(left, SUMMON_BUILD)).toFixed(2)}s`);
  document.body.append(summon);
  summonSound(left);
  summonTimers.push(
    setTimeout(() => moreBtn.classList.add("implode"), Math.max(0, left - .75) * 1000),
    setTimeout(applyScreen, left * 1000 + 30),  // the show is over: the epic override takes over
    setTimeout(endSummoning, (left + SUMMON_TAIL) * 1000));
};
// The whoosh, band-passed noise sweeping up until the end of the show, then the boom, a sine
// falling from 90 to 28 Hz
const summonSound = left => {
  const ac = summonAudio;
  if (!ac || left < .4 || riffMuted()) return;
  try {
    if (ac.state === "suspended") ac.resume();
    const t0 = ac.currentTime, tb = t0 + left, rate = ac.sampleRate;
    const noise = ac.createBuffer(1, Math.ceil((left + 1) * rate), rate), d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), band = ac.createBiquadFilter(), hiss = ac.createGain();
    src.buffer = noise;
    band.type = "bandpass"; band.Q.value = 1.4;
    band.frequency.setValueAtTime(160, t0); band.frequency.exponentialRampToValueAtTime(5200, tb);
    hiss.gain.setValueAtTime(.0001, t0); hiss.gain.exponentialRampToValueAtTime(.3, tb - .05); hiss.gain.exponentialRampToValueAtTime(.0001, tb + .5);
    src.connect(band); band.connect(hiss); hiss.connect(ac.destination);
    src.start(t0); src.stop(tb + 1);
    const boom = ac.createOscillator(), thump = ac.createGain();
    boom.frequency.setValueAtTime(90, tb); boom.frequency.exponentialRampToValueAtTime(28, tb + 1.4);
    thump.gain.setValueAtTime(.0001, t0); thump.gain.setValueAtTime(.0001, tb); thump.gain.exponentialRampToValueAtTime(.8, tb + .02); thump.gain.exponentialRampToValueAtTime(.0001, tb + 1.8);
    boom.connect(thump); thump.connect(ac.destination);
    boom.start(tb); boom.stop(tb + 2);
  } catch (e) {}
};
// The show ended without the finale (e.g. by the clock), or the finale ended: nothing to summon
document.addEventListener("metal", e => { if (!e.detail && !epicAt) endSummoning(); });
document.addEventListener("epic", e => { if (!e.detail) endSummoning(); });
// The finale's music (a Two Steps From Hell mix, then Dragonborn) and its player, the knight with
// the lute, are in bard.js: the "More epicness ?" click loads the song ahead with preloadEpic(), so
// it starts at once when the metal ends; the click also counts as the gesture browsers need for
// sound.

// Leaving the finale: the kamelot code typed again, the normal code, or another code that brings
// its own screen (leaveShows, below). The page falls back to whatever the clock says (the calm
// night after the metal show, the day, or the jazz bar at night). As long as it runs, the calm
// night waits.
const leaveEpic = () => {
  epicAt = 0;
  epicQueued = false;
  if (forced === "epic") forcedDismissed = true;  // also leaves a ?screen=epic
  applyScreen();
};
// The shows (the metal show, the epic finale) win over the jazz bar, Christmas and the calm night.
// A code typed during one (armstrong, yeti, peace: armstrong.js, christmas.js, calm.js) ends it
// first, so that its screen shows at once: the easter egg shows stop, a forced ?screen=metal or
// epic is left, and the metal show of the clock gives way until 01:01:51 (skipSlot, screens.js).
const leaveShows = () => {
  const phase = document.body.dataset.phase;
  if (phase !== "metal" && phase !== "epic") return;
  metalEggAt = epicAt = 0;
  epicQueued = false;
  if (forced === phase) forcedDismissed = true;
  if (scheduledPhase() === "metal") skipSlot();
};

// ── Kamelot code (easter egg: the epic finale at any time) ──
// Typing k a m e l o t (outside the search field, or in it then Enter: onCode, ui.js) opens the
// epic finale at once, whatever the time and the screen (its override comes after the metal one,
// so it wins over the shows too). It lasts like the finale after a metal show; typed again in it,
// it leaves it for the normal screen of that moment, by the clock alone: the eggs the finale was
// opened over (boo, yeti, armstrong, peace: Halloween's knight opens it the same way) are dropped
// too, as typing armstrong again in the bar does (backToClock, armstrong.js). Typing is a gesture,
// so its music plays with sound at once.
onCode("kamelot", () => {
  if (epicAt || document.body.dataset.phase === "epic") {  // even mid-transition
    backToClock();
    peaceEgg = false;
    return leaveEpic();
  }
  epicQueued = false;
  epicAt = Date.now();
  applyScreen();
});

everySecond.push(() => {  // show / hide "More epicness ?" in the last 10 s of a metal show
  const left = document.body.classList.contains("metal") ? metalLeft() : 0;
  if (left > 0 && left <= 10) {
    if (!moreBtn.isConnected) {
      moreBtn.classList.remove("queued");
      document.body.append(moreBtn);
      bardWarm();  // the bard's shader starts compiling now, in case the finale comes
    }
    paintMore();
  } else moreBtn.remove();
});

