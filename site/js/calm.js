// ── Calm night (screen "calm", body.calm) ─────────────────────────────────────────────────────
// After the metal show, when nothing else takes over (no epic finale, no Christmas), the night
// goes quiet until 5:30 (css/calm.css): a calm blue night, and the sound of crickets.
//   - behind the page: the moon as it is tonight, hills with pines and a lone tree, drifting mist,
//     and from 4:45 the dawn rising from the horizon,
//   - on the effects canvas (fx.js): twinkling stars, a shooting star now and then, fireflies,
//   - the sounds of the night: a recording of a forest at night (audio/calm.mp3), a little
//     quieter than the other music, and the first birds at dawn (Web Audio); a firefly jar in the
//     bottom left corner pauses / resumes them.
// It is a "normal" screen (screens.js): the usual look of those hours, which Christmas and the
// armstrong code replace like the day. The metal show and the epic finale come before it.

// The subtitle follows the hours of the night (a forced ?night=calm in the day gets the first one)
const calmSubtitle = () => {
  const h = new Date().getHours();
  if (h === 2) return "2 AM. The crickets are revising too.";
  if (h === 3) return "3 AM. Even the exams are asleep.";
  if (h === 4) return "4 AM. The quietest hour of the night.";
  if (h === 5) return "5 AM. The sky is thinking about the morning.";
  return "The show is over. Only the crickets are still up.";
};
// normal: the calm night is the usual look of those hours, Christmas and the armstrong code
// replace it as they replace the day (see screens.js)
SCREENS.calm = { className: "calm", subtitle: calmSubtitle, transition: "calm", normal: true };
SCHEDULE.push([3600 + METAL_SECONDS, 5 * 3600 + 30 * 60, "calm"]);  // from the end of the show to 5:30
// Every second: the subtitle follows the hour even though the screen stays the same
everySecond.push(() => {
  if (document.body.dataset.phase === "calm" && sub.textContent !== calmSubtitle()) sub.textContent = calmSubtitle();
});

// The moon of tonight: its age in the lunar cycle (0 new, .5 full), between the true new moon
// before now and the next one. A lunar month is not always 29.53 days (from about 29.3 to 29.8,
// the Moon's orbit is an ellipse pulled by the Sun), so counting mean months can be wrong by
// half a day: the new moons are computed as in Jean Meeus, Astronomical Algorithms (ch. 49),
// the mean new moon number k plus its largest periodic corrections, right to a few minutes.
const calmNewMoon = k => {  // time (ms) of new moon number k (k = 0: 2000-01-06)
  const T = k / 1236.85, sin = deg => Math.sin(deg * Math.PI / 180);
  const jde = 2451550.09766 + 29.530588861 * k + .00015437 * T ** 2 - .00000015 * T ** 3 + .00000000073 * T ** 4;
  const E = 1 - .002516 * T - .0000074 * T ** 2;  // the Earth's orbit slowly getting rounder
  const M = 2.5534 + 29.1053567 * k - .0000014 * T ** 2 - .00000011 * T ** 3;  // Sun's mean anomaly
  const Mm = 201.5643 + 385.81693528 * k + .0107582 * T ** 2 + .00001238 * T ** 3 - .000000058 * T ** 4;  // Moon's
  const F = 160.7108 + 390.67050284 * k - .0016118 * T ** 2 - .00000227 * T ** 3 + .000000011 * T ** 4;  // latitude
  const N = 124.7746 - 1.56375588 * k + .0020672 * T ** 2 + .00000215 * T ** 3;  // ascending node
  const fix = -.4072 * sin(Mm) + .17241 * E * sin(M) + .01608 * sin(2 * Mm) + .01039 * sin(2 * F)
    + .00739 * E * sin(Mm - M) - .00514 * E * sin(Mm + M) + .00208 * E * E * sin(2 * M) - .00111 * sin(Mm - 2 * F)
    - .00057 * sin(Mm + 2 * F) + .00056 * E * sin(2 * Mm + M) - .00042 * sin(3 * Mm) + .00042 * E * sin(M + 2 * F)
    + .00038 * E * sin(M - 2 * F) - .00024 * E * sin(2 * Mm - M) - .00017 * sin(N);
  return (jde + fix - 2440587.5) * 864e5;  // Julian day to Unix time
};
const calmMoonAge = (now = Date.now()) => {
  let k = Math.floor((now - calmNewMoon(0)) / (29.530588861 * 864e5));
  while (calmNewMoon(k) > now) k--;
  while (calmNewMoon(k + 1) <= now) k++;
  const prev = calmNewMoon(k);
  return (now - prev) / (calmNewMoon(k + 1) - prev);
};
// The unlit part of the moon, drawn over the full moon of christmas.js in the same -50..50 box: a
// half disc on the dark side, closed by the terminator, a half ellipse whose width follows the
// phase (it bulges into the lit half for a crescent, into the dark half for a gibbous moon). Seen
// from the northern hemisphere: lit on the right while waxing, on the left while waning. It is
// not black: the earthshine leaves the dark side faintly visible.
const calmMoonShade = age => {
  const k = Math.cos(age * 2 * Math.PI), rx = (Math.abs(k) * 49).toFixed(1);
  const d = `M0,-49A49,49 0 0 0 0,49A${rx},49 0 0 ${k > 0 ? 0 : 1} 0,-49Z`;  // dark side on the left
  return `<svg viewBox="-50 -50 100 100"><path d="${d}" fill="rgba(4,9,26,.86)"${age > .5 ? ' transform="scale(-1,1)"' : ""}/></svg>`;
};

// The hills at the bottom of the night, SVG built once from code (seeded random, christmas.js, so
// they are the same on every visit), in a 1600 x 260 box: a far ridge with small pines, lit a
// little by the moon along its top, then a near hill almost black, edged with blades of grass and
// a round tree. Shown as an <img>: rendered once into a bitmap.
const CALM_HILLS = (() => {
  const rnd = seeded(77);
  const ridge = (base, amp, phase) => x => base - amp * (Math.sin(x / 260 + phase) * .6 + Math.sin(x / 97 + phase * 2) * .25 + Math.sin(x / 41) * .08);
  const far = ridge(150, 40, 1), near = ridge(205, 26, 4);
  const line = (f, step = 20) => Array.from({ length: 1600 / step + 1 }, (_, i) => `${i * step},${f1(f(i * step))}`).join("L");
  const pines = Array.from({ length: 34 }, () => {
    const x = rnd() * 1600, y = far(x) + 4, h = 10 + rnd() * 18, w = h * .38;
    return `M${f1(x)},${f1(y - h)}L${f1(x + w)},${f1(y)}L${f1(x - w)},${f1(y)}Z`;
  }).join("");
  const grass = Array.from({ length: 420 }, () => {
    const x = rnd() * 1600, y = near(x) + 3, h = 5 + rnd() * 13, lean = (rnd() - .4) * 9;
    return `M${f1(x - 1.4)},${f1(y)}Q${f1(x + lean * .3)},${f1(y - h * .6)} ${f1(x + lean)},${f1(y - h)}Q${f1(x + lean * .2)},${f1(y - h * .5)} ${f1(x + 1.4)},${f1(y)}Z`;
  }).join("");
  const tx = 230, ty = near(tx);  // the round tree, on the left where the courses leave room
  const crown = Array.from({ length: 9 }, () => `<circle cx="${f1(tx + (rnd() - .5) * 70)}" cy="${f1(ty - 70 - rnd() * 45)}" r="${f1(22 + rnd() * 16)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 260" preserveAspectRatio="xMidYMax slice">` +
    `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14264f"/><stop offset=".25" stop-color="#0b1838"/></linearGradient></defs>` +
    `<path d="M0,260L${line(far)}L1600,260Z" fill="url(#h)"/><path d="${pines}" fill="#0b1838"/>` +
    `<path d="M${line(far)}" fill="none" stroke="rgba(170,195,255,.18)" stroke-width="1.2"/>` +
    `<path d="M${f1(tx - 4)},${f1(ty + 4)}L${f1(tx - 2)},${f1(ty - 80)}L${f1(tx + 3)},${f1(ty - 80)}L${f1(tx + 5)},${f1(ty + 4)}Z" fill="#040916"/>` +
    `<g fill="#040916">${crown}</g>` +
    `<path d="M0,260L${line(near)}L1600,260Z" fill="#040916"/><path d="${grass}" fill="#040916"/></svg>`;
})();

// The night scene behind the page (#calm-sky, click-through): the moon in the top right corner,
// as it is tonight (the full moon of the Christmas night, christmas.js, under its shade), the
// hills, and two banks of mist drifting slowly along the bottom (CSS). Created when the calm
// night starts, removed when it ends.
const calmSky = document.createElement("div");
calmSky.id = "calm-sky";
calmSky.setAttribute("aria-hidden", "true");
calmSky.innerHTML = `<div class="moon">${MOON}<div class="shade"></div></div><img class="hills" alt="" src="data:image/svg+xml,${encodeURIComponent(CALM_HILLS)}"><i class="mist"></i><i class="mist"></i>`;
// The moon is drawn for now each time the calm night starts, and again every minute while it
// lasts (its phase moves by about half a degree an hour: it is the same moon all night, but the
// page may stay open from one night to the next)
let calmMoonAt = 0;
const paintCalmMoon = () => {
  calmMoonAt = Date.now();
  calmSky.querySelector(".moon .shade").innerHTML = calmMoonShade(calmMoonAge());
};
everySecond.push(() => { if (calmSky.isConnected && Date.now() - calmMoonAt > 60000) paintCalmMoon(); });
const setCalmSky = on => {
  if (!on) return calmSky.remove();
  paintCalmMoon();
  paintCalmDawn();
  document.body.prepend(calmSky);
};
// Dawn: from 4:45 the sky slowly lightens towards the horizon, the stars fade, until 5:30 when the
// day comes back. calmDawn goes from 0 to 1 over those 45 minutes (0 at any other time, e.g. a
// forced ?night=calm in the day), and is given to the CSS as --dawn.
let calmDawn = 0;
const paintCalmDawn = () => {
  const t = clockSeconds() - (4 * 3600 + 45 * 60);
  calmDawn = t >= 0 && t < 45 * 60 ? t / (45 * 60) : 0;
  calmSky.style.setProperty("--dawn", calmDawn.toFixed(3));
};
everySecond.push(() => { if (calmSky.isConnected) paintCalmDawn(); });
setCalmSky(document.body.classList.contains("calm"));
document.addEventListener("calm", e => setCalmSky(e.detail));

// ── Calm night effects (canvas layers of mode "calm", see fx.js) ──
// Stars: a few hundred points, denser towards the top of the sky, each twinkling at its own slow
// pace. They are made again when the window changes size, so they always fill the sky.
const calmStars = [];
let calmTime = 0;
const makeCalmStars = () => {
  calmStars.length = 0;
  const n = Math.min(420, Math.round(fxW * fxH / 3200));
  // the canvas is drawn over the moon: no star in front of it
  const m = calmSky.querySelector(".moon").getBoundingClientRect(), mx = m.x + m.width / 2, my = m.y + m.height / 2;
  while (calmStars.length < n) {
    const x = Math.random() * fxW, y = Math.random() ** 1.6 * fxH * .85;
    if (Math.hypot(x - mx, y - my) < m.width / 2 + 4) continue;
    calmStars.push({ x, y, r: .5 + Math.random() ** 3 * 1.4,
      a: .25 + Math.random() * .6, speed: .4 + Math.random() * 1.6, phase: Math.random() * 9, blue: Math.random() < .35 });
  }
  calmStars.w = fxW; calmStars.h = fxH;
};
fxLayers.push({
  mode: "calm",
  update(dt) {
    calmTime += dt;
    if (calmStars.w !== fxW || calmStars.h !== fxH) makeCalmStars();
  },
  draw(c) {
    for (const s of calmStars) {
      const a = s.a * (.65 + .35 * Math.sin(calmTime * s.speed + s.phase)) * (1 - calmDawn * .8);  // fading at dawn
      c.fillStyle = s.blue ? `rgba(180,205,255,${a.toFixed(2)})` : `rgba(240,244,255,${a.toFixed(2)})`;
      c.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
  },
  reset() { calmStars.length = 0; calmStars.w = 0; },
});
// Shooting stars: now and then (every 6 - 20 s) a meteor crosses a part of the sky, downwards,
// a bright head with a tail fading behind it, gone in less than a second
let calmMeteor = null, calmMeteorIn = 4;
fxLayers.push({
  mode: "calm",
  update(dt) {
    if (calmMeteor) {
      calmMeteor.age += dt;
      if (calmMeteor.age > calmMeteor.life) calmMeteor = null;
    } else if ((calmMeteorIn -= dt) <= 0) {
      calmMeteorIn = 6 + Math.random() * 14;
      const dir = Math.random() < .5 ? 1 : -1, a = (.35 + Math.random() * .4) * Math.PI / 2, speed = 700 + Math.random() * 500;
      calmMeteor = { x: fxW * (.1 + Math.random() * .8), y: fxH * Math.random() * .35, vx: Math.cos(a) * speed * dir, vy: Math.sin(a) * speed,
        age: 0, life: .5 + Math.random() * .4 };
    }
  },
  draw(c) {
    const m = calmMeteor;
    if (!m) return;
    const t = m.age / m.life, x = m.x + m.vx * m.age, y = m.y + m.vy * m.age, tail = .12;
    const a = Math.sin(t * Math.PI);  // fades in, then out
    const g = c.createLinearGradient(x, y, x - m.vx * tail, y - m.vy * tail);
    g.addColorStop(0, `rgba(235,242,255,${a.toFixed(2)})`);
    g.addColorStop(1, "rgba(150,180,255,0)");
    c.strokeStyle = g;
    c.lineWidth = 1.6;
    c.lineCap = "round";
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - m.vx * tail, y - m.vy * tail); c.stroke();
  },
  reset() { calmMeteor = null; calmMeteorIn = 4; },
});
// Fireflies: a handful of soft pale lights wandering in the lower half of the screen, each one
// turning slowly (its heading drifts at random) and glowing for a few seconds, then going dark
// for a while. The glow is a blob pre-drawn once (fx.js), only copied.
const CALM_GLOW = blob(185, 255, 225, .9), calmFlies = [];
fxLayers.push({
  mode: "calm",
  update(dt) {
    const want = Math.min(18, Math.round(fxW / 80));
    while (calmFlies.length < want) {
      calmFlies.push({ x: Math.random() * fxW, y: fxH * (.45 + Math.random() * .55), heading: Math.random() * 7,
        speed: 12 + Math.random() * 18, clock: Math.random() * 8, on: 2.5 + Math.random() * 2, off: 2 + Math.random() * 5 });
    }
    calmFlies.length = want;
    for (const f of calmFlies) {
      f.heading += (Math.random() - .5) * 2.4 * dt;
      f.x += Math.cos(f.heading) * f.speed * dt;
      f.y += Math.sin(f.heading) * f.speed * dt * .6;
      if (f.x < -20) f.x = fxW + 20; else if (f.x > fxW + 20) f.x = -20;
      // turn back inside the low sky: heading down from the top edge, up from the bottom one
      if (f.y < fxH * .4) { f.y = fxH * .4; f.heading = Math.abs(f.heading % Math.PI); }
      else if (f.y > fxH + 10) { f.y = fxH + 10; f.heading = -Math.abs(f.heading % Math.PI); }
      f.clock = (f.clock + dt) % (f.on + f.off);
    }
  },
  draw(c) {
    c.save();
    c.globalCompositeOperation = "lighter";
    for (const f of calmFlies) {
      if (f.clock > f.on) continue;  // dark for now
      const a = Math.sin(f.clock / f.on * Math.PI);  // glows up, then fades
      c.globalAlpha = a * .85;
      c.drawImage(CALM_GLOW, f.x - 9, f.y - 9, 18, 18);
      c.globalAlpha = a;
      c.fillStyle = "#f2fff8";
      c.fillRect(f.x - 1, f.y - 1, 2, 2);
    }
    c.restore();
  },
  reset() { calmFlies.length = 0; },
});

// ── Sounds of the night ──
// The night is a recording: "Mystical Forest", the sounds of a forest at night (audio/calm.mp3),
// looped, started at a random point so that each night sounds a little different. It plays a bit
// quieter than the other music (volume 60 %). From the dawn it fades a little, and the first birds
// sing over it (made in the page with Web Audio, below). Browsers only allow sound after a user
// gesture: without one yet it starts muted and the sound comes on at the first click or key press
// anywhere (the birds' audio clock waits suspended until then). Everything is removed when the
// calm night ends.
const CALM_VOLUME = .6;
let calmTrack = null, calmPlaying = false;
let calmAudio = null;  // { ac, master, timer, birdAt }: the birds' Web Audio, while the calm night runs
const calmMuted = () => !!calmTrack && calmTrack.muted;
const calmClock = how => { if (calmAudio) calmAudio.ac[how](); };  // "resume" / "suspend" the birds' audio
const paintCalmVolume = () => { calmTrack.volume = CALM_VOLUME * (1 - calmDawn * .5); };  // lower as the dawn comes
everySecond.push(() => { if (calmTrack) paintCalmVolume(); });
const makeCalmTrack = muted => {
  const track = calmTrack = screenTrack("calm.mp3", { muted });
  paintCalmVolume();
  track.addEventListener("loadedmetadata", () => {
    if (isFinite(track.duration)) track.currentTime = Math.random() * track.duration * .9;
  }, { once: true });
};

// The first birds: once the dawn is well on its way (from about 5:05), a bird sings now and then
// (every 4 - 14 s), a short phrase of 3 to 6 whistled notes, each a quick slide of pitch between
// 2 and 5 kHz, somewhere on the left or the right
const calmBird = (ac, out, t) => {
  const pan = ac.createStereoPanner();
  pan.pan.value = (Math.random() - .5) * 1.6;
  pan.connect(out);
  const notes = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < notes; i++) {
    const osc = ac.createOscillator(), gain = ac.createGain(), len = .07 + Math.random() * .12;
    const f0 = 2000 + Math.random() * 3000, fEnd = f0 * (.7 + Math.random() * .6);
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(fEnd, t + len);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(.045, t + .015);
    gain.gain.linearRampToValueAtTime(0, t + len);
    osc.connect(gain).connect(pan);
    osc.start(t);
    osc.stop(t + len + .02);
    t += len + .03 + Math.random() * .08;
  }
};
const startCalmBirds = () => {
  if (calmAudio || !window.AudioContext) return;
  const ac = new AudioContext(), master = ac.createGain();
  master.gain.value = .5;
  master.connect(ac.destination);
  const audio = calmAudio = { ac, master, birdAt: 0 };
  audio.timer = setInterval(() => {
    if (calmDawn <= .45 || ac.state !== "running" || ac.currentTime < audio.birdAt) return;
    calmBird(ac, master, ac.currentTime + .05);
    audio.birdAt = ac.currentTime + 4 + Math.random() * 10;
  }, 500);
};
const stopCalmBirds = () => {
  if (!calmAudio) return;
  clearInterval(calmAudio.timer);
  calmAudio.ac.close();
  calmAudio = null;
};

// The jar: a glass jar with a firefly inside, in the bottom left corner (where the jazz bar has
// its turntable), lit while the crickets sing. Clicking it pauses / resumes the night's sounds.
// calmPaused: it was clicked to pause, the sound stays off until it is clicked again, on the
// next visits too (remembered like the jazz).
const calmJar = document.createElement("button");
calmJar.id = "jar";
calmJar.type = "button";
calmJar.innerHTML = '<span class="glass"><i class="lid"></i><i class="fly"></i></span><span class="label"></span>';
let calmPaused = (() => { try { return localStorage.getItem("crickets") === "off"; } catch (e) { return false; } })();
let calmSoundAt = 0;
const paintCalmJar = () => {
  const on = calmPlaying && !calmMuted();
  calmJar.classList.toggle("playing", on);
  calmJar.querySelector(".label").textContent = on ? "🦗 Crickets — click to pause"
    : calmPlaying ? "🔇 Click anywhere for sound" : "🦗 Click for the crickets";
  calmJar.title = on ? "Pause the sounds of the night" : "Play the sounds of the night";
};
const calmPlay = (muted = false) => {
  if (!calmTrack) makeCalmTrack(muted); else calmTrack.play().catch(() => {});
  calmClock("resume");
  calmPlaying = true;
  paintCalmJar();
};
const calmSound = () => {  // the first gesture: let the night be heard
  if (!calmMuted()) return;
  calmTrack.muted = false;
  calmClock("resume");
  calmSoundAt = performance.now();
  paintCalmJar();
};
calmJar.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - calmSoundAt < 600) return;  // this same click just turned the sound on
  if (calmMuted()) return calmSound();
  calmPaused = calmPlaying;
  try { calmPaused ? localStorage.setItem("crickets", "off") : localStorage.removeItem("crickets"); } catch (e) {}
  if (calmPaused) {
    calmTrack.pause();
    calmClock("suspend");
    calmPlaying = false;
    paintCalmJar();
  } else calmPlay();
});
const setCrickets = on => {
  document.removeEventListener("pointerdown", calmSound);
  document.removeEventListener("keydown", calmSound);
  if (!on) {
    dropTrack(calmTrack);
    calmTrack = null;
    calmPlaying = false;
    stopCalmBirds();
    calmJar.remove();
    return;
  }
  document.body.append(calmJar);
  startCalmBirds();
  if (!calmPaused) {
    const canSound = screenGesture();
    calmPlay(!canSound);
    if (!canSound) {
      document.addEventListener("pointerdown", calmSound, { once: true });
      document.addEventListener("keydown", calmSound, { once: true });
    }
  } else calmClock("suspend");
  paintCalmJar();
};
setCrickets(document.body.classList.contains("calm"));
document.addEventListener("calm", e => setCrickets(e.detail));
