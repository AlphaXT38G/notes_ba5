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

// Wrap each visible letter under the roots in its own inline-block <span class="rl"> so that it
// can fly on its own. Words stay unbreakable (span.rw, nowrap) so lines wrap as before, and each
// text node becomes a single inline span (span.rs), so a flex container still sees one item.
// Returns the letters and restore(), which puts the original text nodes back.
const graphemes = s => typeof Intl.Segmenter === "function"
  ? [...new Intl.Segmenter().segment(s)].map(x => x.segment) : Array.from(s);  // keeps emoji whole
function splitLetters(roots) {
  const nodes = [];
  for (const root of roots) {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());)  // hidden text (closed sections, other view) is left alone
      if (n.data.trim() && n.parentElement.getClientRects().length && !n.parentElement.closest("script, style")) nodes.push(n);
  }
  const letters = [], swaps = [];
  for (const n of nodes) {
    const box = document.createElement("span");
    box.className = "rs";
    for (const part of n.data.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s/.test(part)) { box.append(part); continue; }
      const word = document.createElement("span");
      word.className = "rw";
      for (const g of graphemes(part)) {
        const l = document.createElement("span");
        l.className = "rl"; l.textContent = g;
        word.append(l); letters.push(l);
      }
      box.append(word);
    }
    n.replaceWith(box);
    swaps.push([box, n]);
  }
  return { letters, restore: () => swaps.forEach(([box, n]) => box.replaceWith(n)) };
}

// The whole Konami animation, about 20 s (slow, to watch the black hole and its supernova), then 15 s of party theme. Every movement uses the
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

  // What gets swallowed: first every letter of the page on its own, then the boxes that held them,
  // innermost first (badges, progress bars, buttons, rows, then the course cards; the title too,
  // for its decorations drawn in CSS), and the music player of the screen. Hidden ones (e.g. in
  // closed sections) have no size and are left out. What comes back out at the end are the big
  // pieces, once the letters are put back together.
  const wrap = document.querySelector(".wrap");
  const shown = sel => [...document.querySelectorAll(sel)].filter(el => el.getBoundingClientRect().width > 0);
  const music = shown("#vinyl, #amp, #xmusic");
  const boxes = [...shown("header h1, #search, .view button, .view, .tools button, .links li, .bar, .new, .thumb, main section"), ...music];
  const returning = [...shown("header h1, header .sub, #search, .view, .tools button, main section, footer"), ...music];
  const { letters, restore } = splitLetters([wrap, ...music]);
  // Level of a box: 1 if it holds no other box, else one more than the highest box it holds
  const levels = new Map();
  const level = el => {
    if (!levels.has(el)) levels.set(el, 1 + Math.max(0, ...boxes.filter(b => b !== el && el.contains(b)).map(level)));
    return levels.get(el);
  };
  document.body.classList.add("rift");
  const space = make("div", "void"), crack = make("div", "crack"), hole = make("div", "hole"), flash = make("div", "flash");
  // The ray-traced black hole (blackhole.js): its sky goes in the void under the page, its disk and
  // shadow over the page. Without WebGL, the CSS drawing of it.
  const bh = createBlackHole();
  if (bh) { space.append(bh.back); hole.classList.add("gl"); hole.append(bh.front, bh.bloom); bh.start(); }
  else hole.innerHTML = '<i class="lens"></i><i class="shadow"></i><i class="disk"></i>';

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
  if (bh) bh.tween("grow", [[0, 0], [.7, 1.12], [1, 1]], 1800, k => 1 - (1 - k) ** 3);
  else hole.animate([{ transform: "scale(0)" }, { transform: "scale(1.12)", offset: .7 }, { transform: "scale(1)" }],
    { duration: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
  await wait(1800);  // a moment to look at it before it starts eating

  // 3. The page spirals into it, closest first. Each piece orbits the hole (all the same way,
  //    like the gas of its disk), faster and faster as it falls in, flattens towards the disk
  //    plane, spins, and shrinks to nothing. Boxes also blur (a few of them only: blur is costly).
  const swallow = (el, delay, duration, blur) => {
    const b = el.getBoundingClientRect();
    const x0 = b.left + b.width / 2 - hx, y0 = b.top + b.height / 2 - hy;  // from the hole centre
    const r0 = Math.hypot(x0, y0), a0 = Math.atan2(y0, x0);
    const turn = Math.PI * (1 + Math.random() * .8), spin = 360 + Math.random() * 540;
    const frames = [];
    for (let i = 0; i <= 10; i++) {
      const p = i / 10, r = r0 * (1 - p) ** 1.2, a = a0 + turn * p ** 1.6;
      const x = Math.cos(a) * r, y = Math.sin(a) * r * (1 - .7 * p);
      const f = { transform: `translate(${x - x0}px, ${y - y0}px) rotate(${spin * p * p}deg) scale(${(1 - p) ** .8})`,
        opacity: p < .7 ? 1 : (1 - p) / .3 };
      if (blur) f.filter = `blur(${p * 6}px)`;
      frames.push(f);
    }
    return el.animate(frames, { duration, delay, easing: "cubic-bezier(.4,0,.85,.6)", fill: "forwards" });
  };
  //    Timing: the closest go first (up to 4.5 s later for the farthest), each fall takes about
  //    2 s, and a box leaves 2.6 s after its own letters, plus 1.6 s per level of boxes inside it.
  const near = el => { const b = el.getBoundingClientRect(); return Math.min(Math.hypot(hx - b.left - b.width / 2, hy - b.top - b.height / 2), 900) * 5; };
  const fall = () => 1800 + Math.random() * 800;
  const anims = [
    ...letters.map(l => swallow(l, near(l) + Math.random() * 400, fall(), false)),
    ...boxes.map(el => swallow(el, near(el) + 2600 + (level(el) - 1) * 1600, fall(), true))
  ];
  await Promise.all(anims.map(a => a.finished));

  // 4. The end. With WebGL, a supernova in stages; without, the hole collapses in a flash
  if (bh) {
    // a. Instability: the gas overheats and turns faster and faster, the hole throbs, and the
    //    whole sky shakes harder and harder (same keyframes for both layers, so they move together)
    bh.tween("heat", [[0, 1], [1, 3.2]], 2200, k => k * k);
    bh.tween("speed", [[0, 1], [1, 6]], 2200, k => k * k);
    bh.tween("grow", [[0, 1], [.2, 1.06], [.35, .97], [.5, 1.1], [.65, .95], [.8, 1.15], [1, 1.1]], 2200);
    const shake = n => Array.from({ length: 40 }, (_, i) => {
      const a = n(i / 39);
      return { transform: `translate(${(Math.random() - .5) * a}px, ${(Math.random() - .5) * a}px)` };
    });
    const quake = shake(k => k * k * 16);
    [space, hole].forEach(el => el.animate(quake, { duration: 2800 }));
    await wait(2200);
    // b. Implosion: the hole falls in on itself down to a point, its gas at its brightest
    bh.tween("grow", [[0, 1.1], [1, 0]], 600, k => k * k * k);
    bh.tween("heat", [[0, 3.2], [1, 5]], 600);
    await wait(600);
    // c. A held breath: darkness, and a single point of light, the core bouncing back
    bh.destroy();
    [crack, hole].forEach(el => el.remove());
    const core = make("div", "sn-core");
    core.animate([{ transform: "scale(0)" }, { transform: "scale(1)", offset: .3 }, { transform: "scale(.6)", offset: .7 },
      { transform: "scale(2.5)" }], { duration: 550, easing: "ease-in", fill: "forwards" });
    await wait(550);
    // d. Detonation (supernova.js): flash, shock wave, ejecta, then the nebula and its pulsar
    core.remove();
    const sn = createSupernova();
    if (sn) { document.body.append(sn.canvas); sn.start(); }
    else { flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700 }); }
    space.animate(shake(k => 30 * (1 - k) ** 2), { duration: 900 });
    await wait(1800);
    // e. The page comes back out as the nebula spreads, and the night sky fades away
    space.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1500, fill: "forwards" }).finished.then(() => {
      space.remove(); flash.remove();
      document.body.classList.remove("rift");  // only now: until then the page must stay above the sky
    });
  } else {
    hole.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: .3 }, { transform: "scale(0)" }],
      { duration: 500, easing: "ease-in", fill: "forwards" });
    await wait(350);
    flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700 });
    await wait(250);
    [space, crack, hole].forEach(el => el.remove());
    setTimeout(() => flash.remove(), 700);
    document.body.classList.remove("rift");
  }

  // 5. Everything comes back out, bouncing into place, in confetti colours: drop the "swallowed"
  //    state and put the letters back together, then play each big piece from the hole back to
  //    its own spot (the cubic-bezier above 1 gives the overshoot bounce)
  party();
  anims.forEach(a => a.cancel());
  restore();
  returning.forEach(el => {
    const b = el.getBoundingClientRect();
    const dx = hx - (b.left + b.width / 2), dy = hy - (b.top + b.height / 2), spin = 360 + Math.random() * 540;
    el.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(${-spin / 2}deg) scale(0)`, opacity: 0 },
      { transform: "none", opacity: 1 }
    ], { duration: 700, delay: Math.random() * 400, easing: "cubic-bezier(.34,1.56,.64,1)", fill: "backwards" });
  });
}

