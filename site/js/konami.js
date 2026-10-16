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
  if (bh) bh.size([[0, 0], [.7, 1.12], [1, 1]], 1100, k => 1 - (1 - k) ** 3);
  else hole.animate([{ transform: "scale(0)" }, { transform: "scale(1.12)", offset: .7 }, { transform: "scale(1)" }],
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
  if (bh) bh.size([[0, 1], [.3, 1.4], [1, 0]], 500, k => k * k);
  else hole.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: .3 }, { transform: "scale(0)" }],
    { duration: 500, easing: "ease-in", fill: "forwards" });
  await wait(350);
  flash.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 700 });
  await wait(250);
  if (bh) bh.destroy();
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

