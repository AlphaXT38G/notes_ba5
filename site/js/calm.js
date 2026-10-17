// ── Calm night (screen "calm", body.calm) ─────────────────────────────────────────────────────
// After the metal show, when nothing else takes over (no epic finale, no Christmas), the night
// goes quiet until 5:30 (css/calm.css): a calm blue night, and the sound of crickets.
// The subtitle follows the hours of the night (a forced ?night=calm in the day gets the first one)
const calmSubtitle = () => {
  const h = new Date().getHours();
  if (h === 2) return "2 AM. The crickets are revising too.";
  if (h === 3) return "3 AM. Even the exams are asleep.";
  if (h === 4) return "4 AM. The quietest hour of the night.";
  if (h === 5) return "5 AM. The sky is thinking about the morning.";
  return "The show is over. Only the crickets are still up.";
};
SCREENS.calm = { className: "calm", subtitle: calmSubtitle, transition: "calm" };
SCHEDULE.push([3600 + METAL_SECONDS, 5 * 3600 + 30 * 60, "calm"]);  // from the end of the show to 5:30
// Every second: the subtitle follows the hour even though the screen stays the same
everySecond.push(() => {
  if (document.body.dataset.phase === "calm" && sub.textContent !== calmSubtitle()) sub.textContent = calmSubtitle();
});

// The moon of tonight: its age in the lunar cycle (0 new, .5 full), counted from a known new
// moon (2000-01-06 18:14 UTC) in synodic months of 29.53 days
const calmMoonAge = () => {
  const days = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
  return (days / 29.530588853 % 1 + 1) % 1;
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
// hills, and two banks of mist drifting slowly along the bottom (CSS). Created when the calm night starts,
// removed when it ends.
const calmSky = document.createElement("div");
calmSky.id = "calm-sky";
calmSky.setAttribute("aria-hidden", "true");
calmSky.innerHTML = `<div class="moon">${MOON}<div class="shade"></div></div><img class="hills" alt="" src="data:image/svg+xml,${encodeURIComponent(CALM_HILLS)}"><i class="mist"></i><i class="mist"></i>`;
const setCalmSky = on => {
  if (!on) return calmSky.remove();
  calmSky.querySelector(".moon .shade").innerHTML = calmMoonShade(calmMoonAge());
  paintCalmDawn();
  document.body.prepend(calmSky);
};
// Dawn: from 4:45 the sky slowly lightens towards the horizon, the stars fade, until 5:30 when the
// day comes back. calmDawn goes from 0 to 1 over those 45 minutes (0 at any other time, e.g. a
// forced ?night=calm in the day), and is given to the CSS as --dawn.
let calmDawn = 0;
const paintCalmDawn = () => {
  calmDawn = Math.min(1, Math.max(0, (clockSeconds() - (4 * 3600 + 45 * 60)) / (45 * 60)));
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

// ── Crickets (Web Audio) ──
// The sound of the calm night is made in the page, no recording to load: a field cricket chirps
// in short bursts of a pure high tone (about 4.5 kHz): 3 or 4 pulses of 16 ms, 38 ms apart, and
// a chirp every half second or so. Each cricket is one oscillator that never stops, whose volume
// (a GainNode) is opened and closed for each pulse. The pulses are scheduled a little ahead on
// the audio clock (tick, every 150 ms, schedules what falls in the next 1.2 s), so the rhythm
// stays exact even when the page is busy or the timer is late.
const CALM_AHEAD = 1.2;
let calmAudio = null;  // { ac, master, crickets, timer } while the calm night plays
const makeCricket = (ac, out, { freq, vol, pan, pulses, every }) => {
  const osc = ac.createOscillator(), gain = ac.createGain(), panner = ac.createStereoPanner();
  osc.frequency.value = freq;
  gain.gain.value = 0;
  panner.pan.value = pan;
  osc.connect(gain).connect(panner).connect(out);
  osc.start();
  return { osc, gain, freq, vol, pulses, every, next: ac.currentTime + Math.random() * every };
};
const chirp = (c, t) => {  // one chirp of cricket c starting at time t (audio clock)
  for (let p = 0; p < c.pulses; p++) {
    const t0 = t + p * .038, g = c.gain.gain;
    g.setValueAtTime(0, t0);
    g.linearRampToValueAtTime(c.vol, t0 + .004);
    g.linearRampToValueAtTime(c.vol * .7, t0 + .012);
    g.linearRampToValueAtTime(0, t0 + .016);
    c.osc.frequency.setValueAtTime(c.freq * (1 - p * .004), t0);  // each pulse a hair lower
  }
};
const calmTick = () => {
  const { ac, crickets } = calmAudio, until = ac.currentTime + CALM_AHEAD;
  for (const c of crickets) {
    while (c.next < until) {
      chirp(c, c.next);
      c.next += c.every * (.92 + Math.random() * .16);
    }
  }
};
const startCrickets = () => {
  if (calmAudio || !window.AudioContext) return;
  const ac = new AudioContext(), master = ac.createGain();
  master.gain.value = .5;
  master.connect(ac.destination);
  const crickets = [makeCricket(ac, master, { freq: 4600, vol: .12, pan: -.3, pulses: 4, every: .52 })];
  calmAudio = { ac, master, crickets, timer: setInterval(() => calmTick(), 150) };
  calmTick();
};
const stopCrickets = () => {
  if (!calmAudio) return;
  clearInterval(calmAudio.timer);
  calmAudio.ac.close();
  calmAudio = null;
};
const setCrickets = on => on ? startCrickets() : stopCrickets();
setCrickets(document.body.classList.contains("calm"));
document.addEventListener("calm", e => setCrickets(e.detail));
