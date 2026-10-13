// Theme toggle: flip between light and dark, starting from what is shown now.
// With no saved choice, the page follows the system (prefers-color-scheme); the button
// then sets data-theme on <html>, which overrides it (see the colour tokens in CSS).
const root = document.documentElement, themeBtn = document.getElementById("theme");
const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const paintBtn = () => { themeBtn.textContent = isDark() ? "☀" : "☾"; themeBtn.title = isDark() ? "Light mode" : "Dark mode"; };
themeBtn.addEventListener("click", () => {
  root.dataset.theme = isDark() ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  paintBtn();
});
paintBtn();

// Flame mode: fire styling (body.fire in CSS) plus flames rising from the bottom of the screen.
// The flames live in a fixed, click-through layer so they never get in the way.
const fireBtn = document.getElementById("fire"), layer = document.createElement("div");
layer.className = "flames";
document.body.append(layer);
let timer = null;  // interval spawning new flames while the mode is on
// While the page is in the background the browser pauses CSS animations, so the floating emojis
// (flames, music notes) never reach their end and are never removed, while the intervals keep
// adding more: they piled up at the bottom of the screen and made the page lag on return.
// So nothing is added while the page is hidden, and never more than `max` at once in a layer.
const crowded = (box, max) => document.hidden || box.childElementCount >= max;
// One flame emoji at x% of the width, size in rem, rising for dur seconds with a random drift
// and tilt (--dx, --r, used by the "rise" keyframes); it removes itself when the animation ends
const flame = (x, size, dur) => {
  if (crowded(layer, 70)) return;
  const f = document.createElement("span");
  f.textContent = "🔥";
  f.style.cssText = `left:${x}%;font-size:${size}rem;animation-duration:${dur}s;--dx:${(Math.random() - .5) * 120}px;--r:${(Math.random() - .5) * 60}deg`;
  f.addEventListener("animationend", () => f.remove());
  layer.append(f);
};
// Turn the mode on (a burst of 25 flames, then a new one every 140 ms) or off, and remember it
const setFire = on => {
  document.body.classList.toggle("fire", on);
  fireBtn.setAttribute("aria-pressed", on);
  clearInterval(timer);
  if (on) {
    for (let i = 0; i < 25; i++) flame(Math.random() * 100, 1 + Math.random() * 2, 2 + Math.random() * 3);
    timer = setInterval(() => flame(Math.random() * 100, .8 + Math.random() * 1.8, 3 + Math.random() * 4), 140);
  } else layer.replaceChildren();  // drop the flames still rising, right away
  try { localStorage.setItem("fire", on ? "1" : ""); } catch (e) {}
};
// 20 clicks on the flame button within a minute start the metal takeover (easter egg, see
// metalEggAt in the night code below); the clicks counted are the ones of the last 60 s.
// In the jazz bar the button is still there but lights no flames (too heavy on top of the bar):
// it only gives a little puff and counts towards the 20 clicks.
const fireClicks = [];
fireBtn.addEventListener("click", () => {
  if (document.body.classList.contains("night")) {
    fireBtn.animate([{ transform: "scale(1)" }, { transform: "scale(1.25) rotate(-8deg)" }, { transform: "scale(1)" }], { duration: 200 });
  } else setFire(!document.body.classList.contains("fire"));
  const now = Date.now();
  fireClicks.push(now);
  while (fireClicks[0] < now - 60000) fireClicks.shift();
  if (fireClicks.length === 10) preloadRiff();  // halfway: get the song ready (see the metal music)
  if (fireClicks.length >= 20) {
    fireClicks.length = 0;
    metalEggAt = now;
    applyNight();
  }
});
try { if (localStorage.getItem("fire")) setFire(true); } catch (e) {}

// Surprise banner: on about 1 visit in 5, an "important new content" banner links to a Rickroll.
// It opens in a new tab and disappears once clicked.
if (Math.random() < 0.2) {
  const banner = document.createElement("a");
  banner.id = "surprise";
  banner.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  banner.target = "_blank";
  banner.rel = "noopener";
  banner.innerHTML = "⚠ IMPORTANT NEW CONTENT <small>click to open</small>";
  banner.addEventListener("click", () => banner.remove());
  document.body.append(banner);
}

// Konami code easter egg (up up down down left right left right B A): a dimensional rift opens,
// a black hole swallows the page, then everything comes back in confetti colours
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiPos = 0,     // how many keys of the sequence have been typed so far
    riftBusy = false;  // true while the animation (and the party after it) runs, to ignore repeats
document.addEventListener("keydown", e => {
  if (e.target.matches("input")) return;  // typing in the search field never triggers it
  // Advance on the expected key; on a wrong key restart, unless it is itself a first "up"
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiPos = k === KONAMI[konamiPos] ? konamiPos + 1 : (k === KONAMI[0] ? 1 : 0);
  if (konamiPos === KONAMI.length) { konamiPos = 0; rift(); }
});

const wait = ms => new Promise(r => setTimeout(r, ms));  // pause inside an async function
// Create an element, give it an id (styled in CSS) and add it at the end of <body>
const make = (tag, id) => { const el = document.createElement(tag); if (id) el.id = id; document.body.append(el); return el; };

// Confetti on a full-screen canvas: an explosion from (ox, oy) plus a rain from the top.
// Each piece is a small rectangle with gravity, air drag, a little sideways wobble and a flip
// (scaleY by cos) so it looks like paper; the canvas is removed after 7 s or once all have fallen.
function confetti(ox, oy) {
  const c = make("canvas"), ctx = c.getContext("2d"), dpr = devicePixelRatio || 1;
  const W = innerWidth, H = innerHeight;
  c.className = "confetti";
  c.width = W * dpr; c.height = H * dpr; ctx.scale(dpr, dpr);
  const colors = ["#ff3d7f", "#ffb300", "#2ec27e", "#2f80ed", "#9b51e0", "#00e5ff", "#ffe066"];
  const parts = [];
  const add = (x, y, vx, vy) => parts.push({ x, y, vx, vy, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4,
    r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[Math.floor(Math.random() * colors.length)] });
  for (let i = 0; i < 260; i++) {           // explosion out of the black hole
    const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 14;
    add(ox, oy, Math.cos(a) * s, Math.sin(a) * s - 5);
  }
  for (let i = 0; i < 180; i++) add(Math.random() * W, -Math.random() * H, (Math.random() - .5) * 2, 1 + Math.random() * 3);  // rain
  const end = performance.now() + 7000;
  (function frame(now) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vx *= .985; p.vy = p.vy * .985 + .22;
      p.x += p.vx + Math.sin(p.r) * .6; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.r * 2));
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (now < end && parts.some(p => p.y < H + 20)) requestAnimationFrame(frame); else c.remove();
  })(performance.now());
}

// The whole Konami animation, about 5 s, then 15 s of party theme. Every movement uses the
// Web Animations API (el.animate), so nothing in the page layout is changed for real:
// cancelling the animations is enough to put every element back where it was.
async function rift() {
  if (riftBusy) return;
  riftBusy = true;
  const hx = innerWidth / 2, hy = innerHeight / 2;  // centre of the screen = centre of the hole
  // Final state: party colours (body.party in CSS) and confetti for 15 s, then back to normal
  const party = () => {
    document.body.classList.add("party");
    confetti(hx, hy);
    setTimeout(() => { document.body.classList.remove("party"); riftBusy = false; }, 15000);
  };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return party();  // skip the black hole

  // The pieces that get swallowed one by one: header parts, card titles and every visible line
  // of the cards (hidden ones, e.g. inside closed sections, have no size and are left out)
  const pieces = [...document.querySelectorAll(
    "header h1, header .sub, #search, .view, .tools button, main section .code, main section h2, main section > .links > li, footer"
  )].filter(el => el.getBoundingClientRect().width > 0);
  const wrap = document.querySelector(".wrap");
  document.body.classList.add("rift");
  const space = make("div", "void"), crack = make("div", "crack"), hole = make("div", "hole"), flash = make("div", "flash");
  hole.innerHTML = '<i class="lens"></i><i class="shadow"></i><i class="disk"></i>';

  // 1. The rift tears open: darkness falls, a crack of light splits the screen, the page trembles
  space.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, fill: "forwards" });
  crack.animate([
    { height: "0", width: "3px" }, { height: "35vh", width: "2px", offset: .5 },
    { height: "70vh", width: "5px", offset: .8 }, { height: "70vh", width: "40px", opacity: 0 }
  ], { duration: 1100, easing: "ease-in", fill: "forwards" });
  wrap.animate(Array.from({ length: 24 }, (_, i) => {
    const a = i / 24 * 6;
    return { transform: `translate(${(Math.random() - .5) * a}px, ${(Math.random() - .5) * a}px)` };
  }), { duration: 3000 });
  await wait(800);

  // 2. The black hole opens
  hole.animate([{ transform: "scale(0)" }, { transform: "scale(1.12)", offset: .7 }, { transform: "scale(1)" }],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  await wait(400);

  // 3. Every piece of the page spirals into it, closest first.
  //    (dx, dy) goes from the piece to the hole; halfway, the piece is pushed sideways along
  //    (-dy, dx) to curve its path into a spiral, while it spins, shrinks to nothing and blurs.
  const flights = pieces.map(el => {
    const b = el.getBoundingClientRect();
    const dx = hx - (b.left + b.width / 2), dy = hy - (b.top + b.height / 2);
    const dist = Math.hypot(dx, dy), spin = (Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 540);
    const anim = el.animate([
      { transform: "none", opacity: 1, filter: "blur(0)" },
      { transform: `translate(${dx * .35 - dy * .3}px, ${dy * .35 + dx * .3}px) rotate(${spin * .3}deg) scale(.85)`, offset: .45 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0)`, opacity: 0, filter: "blur(6px)" }
    ], { duration: 900 + Math.random() * 500, delay: Math.min(dist, 900) * 1.1, easing: "cubic-bezier(.55,0,1,.45)", fill: "forwards" });
    return { el, anim, dx, dy, spin };
  });
  await Promise.all(flights.map(f => f.anim.finished));

  // 4. The hole collapses in a flash of light
  hole.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: .3 }, { transform: "scale(0)" }],
    { duration: 500, easing: "ease-in", fill: "forwards" });
  await wait(350);
  flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700 });
  await wait(250);
  [space, crack, hole].forEach(el => el.remove());
  setTimeout(() => flash.remove(), 700);
  document.body.classList.remove("rift");

  // 5. Everything comes back out, bouncing into place, in confetti colours:
  //    drop the "swallowed" state, then play each piece from the hole back to its own spot
  //    (the cubic-bezier above 1 gives the overshoot bounce)
  party();
  flights.forEach(({ el, anim, dx, dy, spin }) => {
    anim.cancel();
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(${-spin / 2}deg) scale(0)`, opacity: 0 },
      { transform: "none", opacity: 1 }
    ], { duration: 700, delay: Math.random() * 400, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" });
  });
}

// Night: from 21:30 the page turns into a jazz bar (body.night in CSS), then plays one metal song.
// The night goes through phases (body[data-phase] in CSS):
//   evening  21:30    - 0:45     jazz bar, warm light
//   closing   0:45    - 1:00     the bar closes, the subtitle changes (see below)
//   metal     1:00:00 - 1:01:51  hard rock / metal takeover for one song (body.metal, see below)
//   epic      after a metal takeover, only if "More epicness ?" was clicked (body.epic, see below)
// After that the page is back to its usual day look.
// Checked every second (the metal phase is short and must start right on time).
// ?night=0 / 1 / evening / closing / metal in the URL forces a phase (handy to try it any time).
const sub = document.querySelector(".sub"), daySub = sub.textContent;
const NIGHT_SUBS = {  // null = keep the usual subtitle
  evening: null,
  closing: "Last call was a while ago.",
  metal: "1:00 AM. Time to headbang. 🤘",
  epic: "Behold… more epicness.",
};
const NIGHT = new Set(["evening", "closing"]);  // the jazz bar phases (body.night)
const METAL_SECONDS = 111;  // the song plays from 1:50 to its end, 1 min 51 s later
const forced = new URLSearchParams(location.search).get("night");
// Easter egg: spamming the flame button (see below) starts the metal takeover at any time of
// day, for one song; metalEggAt is when it started (0 = not running)
let metalEggAt = 0;
// Epic finale: 10 s before a metal takeover ends, a "More epicness ?" button shows up (see the
// epic code below). Clicked, it queues the epic phase (body.epic), which takes over right when
// the metal ends and lasts until the "Back to normal" button is clicked (epicAt = when it started,
// 0 = not running). ?night=epic forces it, until that button is clicked (epicLeft).
let epicQueued = false, epicAt = 0, epicLeft = false;
const clockSeconds = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
const metalLeft = () => {  // seconds before the current metal takeover ends (Infinity when forced)
  if (metalEggAt) return METAL_SECONDS - (Date.now() - metalEggAt) / 1000;
  if (forced === "metal") return Infinity;
  return 3600 + METAL_SECONDS - clockSeconds();
};
const phaseNow = () => {
  if ((forced === "epic" && !epicLeft) || epicAt) return "epic";
  const phase = basePhase();
  if (epicQueued && phase !== "metal") {  // the metal just ended: the epic finale takes over
    epicQueued = false;
    if (document.body.dataset.phase === "metal") { epicAt = Date.now(); return "epic"; }
  }
  return phase;
};
const basePhase = () => {
  if (metalEggAt && Date.now() - metalEggAt < METAL_SECONDS * 1000) return "metal";
  metalEggAt = 0;
  if (forced === "0") return null;
  if (forced in NIGHT_SUBS && forced !== "epic") return forced;  // a left epic falls back to the clock
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (t >= 21 * 3600 + 30 * 60 || t < 45 * 60) return "evening";
  if (t < 3600) return "closing";
  if (t < 3600 + METAL_SECONDS) return "metal";
  return forced === "1" ? "evening" : null;  // ?night=1 during the day: start of the night
};
// Changing style is animated with the View Transitions API: the browser snapshots the page before
// and after the change and animates between the two (CSS ::view-transition-*, picked by
// html[data-vt]): a slow warm fade into the jazz bar, a hard slam into the metal show, a soft fade
// back to the day. Not on the first load, not with reduced motion, and browsers without the API
// just switch instantly.
let nightShown = false;
const applyNight = () => {
  const phase = phaseNow();
  if (phase === (document.body.dataset.phase || null)) { nightShown = true; return; }
  const night = NIGHT.has(phase), metal = phase === "metal", epic = phase === "epic";
  const swap = () => {
    if (phase) document.body.dataset.phase = phase; else delete document.body.dataset.phase;
    sub.textContent = (metalEggAt && phase === "metal" ? "You lit too many fires. Time to headbang. 🤘"
      : phase && NIGHT_SUBS[phase]) || daySub;
    // Flames on top of the jazz bar or the shows are too many moving elements (the page lags):
    // they turn the flame mode off (the shows hide its button, the bar keeps it only for clicks)
    if ((night || metal || epic) && document.body.classList.contains("fire")) setFire(false);
    if (night !== document.body.classList.contains("night")) {
      document.body.classList.toggle("night", night);
      document.dispatchEvent(new CustomEvent("night", { detail: night }));  // for the night extras below
    }
    if (metal !== document.body.classList.contains("metal")) {
      document.body.classList.toggle("metal", metal);
      document.dispatchEvent(new CustomEvent("metal", { detail: metal }));  // for the metal extras below
    }
    if (epic !== document.body.classList.contains("epic")) {
      document.body.classList.toggle("epic", epic);
      document.dispatchEvent(new CustomEvent("epic", { detail: epic }));  // for the epic extras below
    }
    document.dispatchEvent(new CustomEvent("phase", { detail: phase }));
  };
  const animate = nightShown && document.startViewTransition && !document.hidden
    && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  nightShown = true;
  styleSwitch?.skipTransition();  // a previous change still animating ends at once
  if (!animate) { delete root.dataset.vt; return swap(); }
  root.dataset.vt = metal ? "metal" : epic ? "epic" : night ? "night" : "day";
  const t = styleSwitch = document.startViewTransition(swap);
  const done = () => { if (styleSwitch === t) { styleSwitch = null; delete root.dataset.vt; } };
  t.ready.catch(() => {});  // skipped by the browser (e.g. tab hidden meanwhile): the change still applies
  t.finished.then(done, done);
  setTimeout(done, 2500);  // never leave data-vt behind
};
let styleSwitch = null;  // the view transition in progress, if any
// Closing time: wrap each letter of the title in a span (.l, with its index --i) so the CSS can
// turn them off one by one, then bring the bartender in once the sign is dark. Any other phase
// puts the title back as plain text and sends the bartender away. A click on him dismisses him.
const title = document.querySelector("h1"), titleText = title.textContent;
let barman = null, barmanTimer = null;
document.addEventListener("phase", e => {
  clearTimeout(barmanTimer);
  barman?.remove();
  barman = null;
  if (e.detail !== "closing") { title.textContent = titleText; return; }
  title.innerHTML = [...titleText].map((c, i) => `<span class="l" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");
  title.style.setProperty("--n", titleText.length);
  barmanTimer = setTimeout(() => {
    barman = document.createElement("div");
    barman.id = "barman";
    barman.title = "Click to close";
    barman.innerHTML = '<span class="who">🧑‍🍳</span><span class="say">On ferme. Va dormir.<small>The bar reopens at 21:30</small></span>';
    barman.addEventListener("click", () => barman.remove());
    document.body.append(barman);
  }, (1 + (titleText.length + 1) * .7 + .5) * 1000);
});

applyNight();
setInterval(() => { applyNight(); preloadSoon(); epicTick(); }, 1000);  // see the metal music and the epic finale below

// Bar air: 3 smoke clouds drifting across the room and a music note rising every ~0.9 s,
// with a random sway and tilt (--sway, --r); everything is removed when the night ends
const air = document.createElement("div");
air.className = "air";
let noteTimer = null;
const note = () => {
  if (crowded(air, 3 + 25)) return;  // 3 smoke clouds + at most 25 notes (see crowded)
  const n = document.createElement("span");
  n.className = "note";
  n.textContent = "♪♫♩♬"[Math.floor(Math.random() * 4)];
  n.style.cssText = `left:${Math.random() * 100}%;font-size:${1 + Math.random() * 1.4}rem;--o:${.25 + Math.random() * .45};` +
    `--sway:${(Math.random() - .5) * 160}px;--r:${(Math.random() - .5) * 50}deg;animation-duration:${9 + Math.random() * 7}s`;
  n.addEventListener("animationend", () => n.remove());
  air.append(n);
};
const setAir = on => {
  clearInterval(noteTimer);
  air.replaceChildren();
  air.remove();
  if (!on) return;
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "smoke";
    s.style.cssText = `top:${10 + i * 28}%;left:${-20 + i * 15}%;animation-duration:${50 + i * 17}s;animation-delay:${-i * 13}s`;
    air.append(s);
  }
  document.body.prepend(air);
  for (let i = 0; i < 6; i++) setTimeout(note, i * 300);
  noteTimer = setInterval(note, 900);
};
setAir(document.body.classList.contains("night"));
document.addEventListener("night", e => setAir(e.detail));

// Night music: jazz from YouTube, looped. It starts by itself when the night begins. Browsers
// only allow sound after a user gesture, so if the page has not had one yet it autoplays muted
// and the sound comes on at the first click or key press anywhere. The vinyl button then plays /
// pauses it (through the YouTube iframe API messages). Pausing is remembered: no autoplay on the
// next visits until it is played again.
const JAZZ = "7gtIh5dF9Xk";
let jazz = null, playing = false, jazzMuted = false, jazzSoundAt = 0;
const vinyl = document.createElement("button");
vinyl.id = "vinyl";
vinyl.type = "button";
vinyl.innerHTML = '<span class="deck"><span class="disc"></span><span class="arm"></span></span><span class="label"></span>';
const jazzOff = () => { try { return localStorage.getItem("jazz") === "off"; } catch (e) { return false; } };
const paintVinyl = () => {
  vinyl.classList.toggle("playing", playing);
  vinyl.querySelector(".label").textContent = !playing ? "♪ Click to play some jazz"
    : jazzMuted ? "🔇 Click anywhere for sound" : "♪ Jazz on — click to pause";
  vinyl.title = !playing ? "Play the music" : jazzMuted ? "Turn the sound on" : "Pause the music";
};
const command = func => jazz && jazz.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
const play = (muted = false) => {
  if (!jazz) {  // first time: create the player, it autoplays (muted when there was no gesture yet)
    jazz = document.createElement("iframe");
    jazz.id = "jazz";
    jazz.title = "Background jazz";
    jazz.allow = "autoplay; encrypted-media";
    jazz.src = `https://www.youtube.com/embed/${JAZZ}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${JAZZ}&controls=0&enablejsapi=1`;
    document.body.append(jazz);
    jazzMuted = muted;
  } else command("playVideo");
  playing = true;
  try { localStorage.removeItem("jazz"); } catch (e) {}
  paintVinyl();
};
const pause = () => {
  command("pauseVideo");
  playing = false;
  try { localStorage.setItem("jazz", "off"); } catch (e) {}
  paintVinyl();
};
const jazzSound = () => {  // unmute a jazz that autoplayed muted
  if (!jazz || !jazzMuted) return;
  command("unMute");
  jazzMuted = false;
  jazzSoundAt = performance.now();
  paintVinyl();
};
vinyl.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - jazzSoundAt < 600) return;  // this same click just turned the sound on
  if (jazzMuted) jazzSound();
  else playing ? pause() : play();
});
const setMusic = on => {
  document.removeEventListener("pointerdown", jazzSound);
  document.removeEventListener("keydown", jazzSound);
  if (!on) { if (playing) command("pauseVideo"); playing = false; vinyl.remove(); return; }
  document.body.append(vinyl);
  if (!jazz && !jazzOff()) {
    const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
    play(!canSound);
    if (!canSound) {
      document.addEventListener("pointerdown", jazzSound, { once: true });
      document.addEventListener("keydown", jazzSound, { once: true });
    }
  }
  paintVinyl();
};
setMusic(document.body.classList.contains("night"));
document.addEventListener("night", e => setMusic(e.detail));

// Metal stage: a white strobe, the equalizer and the effects canvas below, all created when the
// metal phase starts and removed when it ends. A bolt strikes every 1.2 - 3.5 s at a random spot,
// with a flash and a short shake of the page.
const strobe = document.createElement("div"), eq = document.createElement("div");
strobe.id = "strobe";
eq.id = "eq";
eq.innerHTML = Array.from({ length: 48 }, () =>
  `<i style="--d:${(.18 + Math.random() * .3).toFixed(2)}s;--lo:${(.08 + Math.random() * .2).toFixed(2)};--hi:${(.45 + Math.random() * .55).toFixed(2)}"></i>`
).join("");
// Metal effects canvas: one full-screen, click-through canvas and one animation loop for the
// lightning and the other drawn effects below (chains, fire, sparks, flying silhouettes). One
// canvas is much lighter than dozens of animated elements. The loop only runs during the metal
// phase, the browser pauses it in background tabs, and each step is capped at 50 ms, so nothing
// piles up while the page is hidden. Each effect registers {mode, update(dt), draw(ctx), reset(),
// optional resize()};
// only the effects of the current mode ("metal" or "epic", fxMode) run.
const fx = document.createElement("canvas"), ctx = fx.getContext("2d");
fx.id = "metalfx";
let fxW = 0, fxH = 0, fxRaf = null, fxLast = 0, fxMode = null;
const fxLayers = [], strikeHooks = [];  // strikeHooks: called with (x, y) where a bolt hits
// Drawn at 1 canvas pixel per CSS pixel even on high-density screens: the effects are soft glows,
// and a 2x canvas means 4x the pixels to fill and composite on every frame (and while scrolling)
const fxResize = () => {
  fxW = innerWidth; fxH = innerHeight;
  fx.width = fxW; fx.height = fxH;
  fxLayers.forEach(layer => layer.resize?.());
};
const fxFrame = now => {
  const dt = Math.min(.05, (now - fxLast) / 1000);
  fxLast = now;
  ctx.clearRect(0, 0, fxW, fxH);
  for (const layer of fxLayers) if (layer.mode === fxMode) { layer.update(dt); layer.draw(ctx); }
  fxRaf = requestAnimationFrame(fxFrame);
};
const fxStart = () => {
  fxResize();
  document.body.append(fx);
  addEventListener("resize", fxResize);
  fxLast = performance.now();
  fxRaf = requestAnimationFrame(fxFrame);
};
const fxStop = () => {
  cancelAnimationFrame(fxRaf);
  removeEventListener("resize", fxResize);
  fx.remove();
  fxLayers.forEach(layer => layer.reset());
};

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
const steel = (c, w) => steelCache[w] ||= steelGradient(c, w);
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
const blob = (r, g, b, a) => {
  const s = document.createElement("canvas"), sc = s.getContext("2d");
  s.width = s.height = 64;
  const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`); grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  sc.fillStyle = grad; sc.fillRect(0, 0, 64, 64);
  return s;
};
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

// ── Epic finale effects (mode "epic") ──
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
// Start / stop the stage for the current show: the metal one (strobe, equalizer, lightning and
// the "metal" canvas effects) or the epic one (the "epic" canvas effects, see below)
const setStage = () => {
  const mode = document.body.classList.contains("metal") ? "metal" : document.body.classList.contains("epic") ? "epic" : null;
  clearTimeout(boltTimer);
  [strobe, eq].forEach(el => el.remove());
  fxStop();
  fxMode = mode;
  if (!mode) return;
  if (mode === "metal") document.body.append(strobe, eq);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  fxStart();
  if (mode === "metal") strike();
};
setStage();
document.addEventListener("metal", setStage);
document.addEventListener("epic", setStage);

// Metal music: one song from YouTube, from 1:50 to its end (METAL_SECONDS later), in sync with the
// takeover: opened late, it starts further into the song so both end together. It starts by
// itself when the phase begins. Browsers only allow sound after a user gesture, so if the page
// has not had one yet the song autoplays muted and the sound comes on at the first click or key
// press anywhere (the song keeps its place in time). The amp plays / pauses it; the end of the
// phase stops it.
const METAL = "IAvgph1RjCc", METAL_START = 110;
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
  amp.querySelector(".label").textContent = !rocking ? "🎸 Click to crank it up"
    : riffMuted ? "🔇 Click anywhere for sound" : "🎸 Rocking — click to mute";
  amp.title = !rocking ? "Play the music" : riffMuted ? "Turn the sound on" : "Pause the music";
};
const riffCommand = (func, args = []) => riff && riff.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const makeRiff = (autoplay, muted, start) => {
  riff = document.createElement("iframe");
  riff.id = "riff";
  riff.title = "Metal song";
  riff.allow = "autoplay; encrypted-media";
  riff.src = `https://www.youtube.com/embed/${METAL}?autoplay=${autoplay}&mute=${muted ? 1 : 0}` +
    `&start=${start}&end=${METAL_START + METAL_SECONDS}&controls=0&enablejsapi=1`;
  document.body.append(riff);
  riffMuted = muted;
};
// Loading the YouTube player takes a few seconds, so when the takeover is coming (10th click on
// the flame button, or 00:59:30) the player is loaded in advance, hidden, paused and muted at
// 1:50; starting it is then almost instant. Unused, it is dropped again after 75 s.
let riffWaiting = false, riffDrop = null;
const preloadRiff = () => {
  if (riff) return;
  makeRiff(0, true, METAL_START);
  riffWaiting = true;
  clearTimeout(riffDrop);
  riffDrop = setTimeout(() => {
    if (riffWaiting && !document.body.classList.contains("metal")) { riff.remove(); riff = null; riffWaiting = false; }
  }, 75000);
};
const preloadSoon = () => {  // called every second with the clock check
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (t >= 3600 - 30 && t < 3600) preloadRiff();
};
const rock = (muted = false) => {
  const d = new Date(), t = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  const late = metalEggAt ? Math.floor((Date.now() - metalEggAt) / 1000)  // seconds since it started
    : forced === "metal" ? 0 : Math.max(0, t - 3600);
  if (!riff) makeRiff(1, muted, METAL_START + late);
  else if (riffWaiting) {  // the preloaded player: jump to the right spot, sound on if allowed, play
    riffWaiting = false;
    if (late) riffCommand("seekTo", [METAL_START + late, true]);
    if (!muted) { riffCommand("unMute"); riffMuted = false; }
    riffCommand("playVideo");
    // preloaded only a moment ago, it may not be ready for commands yet: repeat them a few times
    [1500, 3000, 5000].forEach(ms => setTimeout(() => {
      if (!rocking) return;
      if (!riffMuted) riffCommand("unMute");
      riffCommand("playVideo");
    }, ms));
  } else riffCommand("playVideo");
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

// "More epicness ?": 10 s before a metal takeover ends this button rises in the middle of the
// screen. Clicking it queues the epic finale (epicQueued, see phaseNow) and gets its song ready
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
// epic and the page falls back to whatever the clock says (day, or the jazz bar at night).
const leaveBtn = document.createElement("button");
leaveBtn.id = "leave";
leaveBtn.type = "button";
leaveBtn.textContent = "↩ Back to normal";
leaveBtn.addEventListener("click", e => {
  e.stopPropagation();
  epicAt = 0;
  epicLeft = true;
  applyNight();
});
const setLeave = on => on ? document.body.append(leaveBtn) : leaveBtn.remove();
setLeave(document.body.classList.contains("epic"));
document.addEventListener("epic", e => setLeave(e.detail));

const epicTick = () => {  // called every second with the clock check
  const left = document.body.classList.contains("metal") ? metalLeft() : 0;
  if (left > 0 && left <= 10) {
    if (!moreBtn.isConnected) {
      moreBtn.classList.remove("queued");
      moreBtn.textContent = "✨ More epicness ?";
      document.body.append(moreBtn);
    }
  } else moreBtn.remove();
};

// Names / Previews switch: sets data-view on <html> (the CSS does the rest) and remembers it
const viewBtns = document.querySelectorAll(".view button");
const setView = v => {
  root.dataset.view = v;
  viewBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.view === v));
  try { localStorage.setItem("view", v); } catch (e) {}
};
viewBtns.forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
viewBtns.forEach(b => b.setAttribute("aria-pressed", b.dataset.view === (root.dataset.view || "names")));

// Search: keep subjects and documents whose text matches, open the sections holding a match.
// Every word typed must appear (in any order, case-insensitive). If the subject itself matches
// (name or code), the whole card stays as usual; otherwise only the matching documents are kept.
// An empty field shows everything again and closes the sections.
const q = document.getElementById("search");
q.addEventListener("input", () => {
  const words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const hit = el => words.every(w => el.textContent.toLowerCase().includes(w));
  let shown = 0;  // number of subjects still visible, to show the no-result message
  document.querySelectorAll("main section").forEach(sec => {
    const whole = !words.length || hit(sec.querySelector("h2")) || hit(sec.querySelector(".code"));
    let any = whole;
    sec.querySelectorAll(".links a").forEach(a => {
      const ok = whole || hit(a);
      a.parentNode.hidden = !ok;
      any ||= ok;
    });
    // A collapsible section is hidden when nothing in it matches, and opened while it holds a
    // match found by document name (folder headings are hidden then, they would be misleading)
    sec.querySelectorAll("details").forEach(d => {
      const inside = [...d.querySelectorAll(".links a")].some(a => !a.parentNode.hidden);
      d.parentNode.hidden = !inside;
      d.querySelectorAll(".group").forEach(g => g.hidden = !whole && !!words.length);
      d.open = words.length > 0 && inside && !whole;
    });
    sec.hidden = !any;
    shown += any;
  });
  document.getElementById("empty").hidden = shown > 0;
});
