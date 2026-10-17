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

// The night scene behind the page (#calm-sky, click-through): the moon in the top right corner,
// as it is tonight (the full moon of the Christmas night, christmas.js, under its shade). Created
// when the calm night starts, removed when it ends.
const calmSky = document.createElement("div");
calmSky.id = "calm-sky";
calmSky.setAttribute("aria-hidden", "true");
calmSky.innerHTML = `<div class="moon">${MOON}<div class="shade"></div></div>`;
const setCalmSky = on => {
  if (!on) return calmSky.remove();
  calmSky.querySelector(".moon .shade").innerHTML = calmMoonShade(calmMoonAge());
  document.body.prepend(calmSky);
};
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
      const a = s.a * (.65 + .35 * Math.sin(calmTime * s.speed + s.phase));
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
