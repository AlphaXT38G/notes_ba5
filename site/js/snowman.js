// ── The snowman's games (both Christmas screens) ──
// The snowman of christmas.js (#xsnowman, in the left margin) can be teased:
// - his hat: a click knocks it up in the air; it lands crooked and he straightens it.
// - his carrot nose: it can be taken (dragged off his face). Put back on him, he takes it and
//   plants it in place; dropped anywhere else, it lies there and he takes out a fishing rod, casts
//   his line, hooks it and reels it back in.
// Each tease makes him crosser (brows, then red cheeks and steam), and he calms down after a while
// left in peace. The third tease is one too many: he turns to us, winds up and throws a snowball at
// the mouse pointer. It splashes on the window, which frosts over (img/frost.png), and for a few
// seconds the pointer is frozen: the real one is hidden, an icy one follows it slowly, shivering,
// and clicks go where the icy one is (touch screens: the frost only).
// Everything that flies (the carrot, the line, the snowball, the splash) is a fixed element over the
// page, made for the move and removed after; on the snowman only transforms and opacity change.
// Reduced motion: the same story, without the flights (the carrot goes straight back, no slow
// pointer).
const smHat = snowman.querySelector(".hat"), smNose = snowman.querySelector(".nose");
const smFace = snowman.querySelector(".face"), smArm = snowman.querySelector(".wave");
const smSvg = snowman.querySelector("svg");
const smSay = document.createElement("span");
smSay.className = "say";
snowman.append(smSay);
const SM_FREEZE_MS = 7000;  // how long the window stays frozen, before it melts (2.5 s)
let smMad = 0, smMadAt = 0, smBusy = false, smHatUp = false, smGen = 0, smSayEnd = null;
let smMouse = null;  // the pointer, where the snowball goes
let smAnims = [], smExtras = [], smLoop = null;
addEventListener("pointermove", e => { smMouse = [e.clientX, e.clientY]; }, { passive: true });

const smStill = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const smWait = ms => new Promise(done => setTimeout(done, ms));
// a move over ms milliseconds, step(t) called on each frame with t from 0 to 1
const smTween = (ms, step) => new Promise(done => {
  if (smStill() || ms <= 0) { step(1); return done(); }
  const t0 = performance.now();
  const frame = now => {
    const t = Math.min(1, (now - t0) / ms);
    step(t);
    if (t < 1) requestAnimationFrame(frame); else done();
  };
  requestAnimationFrame(frame);
});
const smEase = t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
const smAnimate = (el, frames, opts) => {
  if (smStill()) return null;
  const a = el.animate(frames, opts);
  smAnims.push(a);
  return a;
};
const smExtra = (tag, id) => {
  const el = document.createElement(tag);
  el.id = id;
  smExtras.push(el);
  document.body.append(el);
  return el;
};
const smDrop = el => {
  el.remove();
  smExtras = smExtras.filter(x => x !== el);
};
// A point of his drawing (300 x 520), in the window: the scene is fixed, so is he
const smPt = (x, y) => {
  const r = snowman.getBoundingClientRect(), k = r.width / 300;
  return [r.left + x * k, r.top + y * k];
};
const smSays = (text, ms = 1800) => {
  smSay.textContent = text;
  smSay.classList.add("on");
  clearTimeout(smSayEnd);
  smSayEnd = setTimeout(() => smSay.classList.remove("on"), ms);
};

// His temper: 1 = cross, 2 = furious, 3 = the snowball. A quarter of a minute left in peace calms
// him down a step.
const smPaintMad = () => {
  snowman.classList.toggle("mad1", smMad === 1);
  snowman.classList.toggle("mad2", smMad >= 2);
};
const smAnnoy = () => {
  smMad++;
  smMadAt = Date.now();
  smPaintMad();
  smAnimate(smSvg, [{ transform: "rotate(0)" }, { transform: "rotate(-2deg)" }, { transform: "rotate(2deg)" }, { transform: "rotate(0)" }], { duration: 350 });
};
const smCheck = () => { if (smMad >= 3 && !smBusy) smThrow(); };
everySecond.push(() => {
  if (smMad && !smBusy && Date.now() - smMadAt > 15000) { smMad--; smMadAt = Date.now(); smPaintMad(); }
});

// The hat: up in the air, spinning, down crooked, then straightened
smHat.addEventListener("click", e => {
  e.stopPropagation();
  if (smBusy || smHatUp) return;
  smHatUp = true;
  smAnnoy();
  smSays(["Hey!", "My hat!", "Stop that!"][Math.min(smMad, 3) - 1]);
  smAnimate(smHat, [
    { transform: "none" }, { transform: "translate(8px,-80px) rotate(200deg)", offset: .3 },
    { transform: "translate(16px,-6px) rotate(372deg)", offset: .55 }, { transform: "translate(14px,-3px) rotate(374deg)", offset: .62 },
    { transform: "translate(14px,-3px) rotate(374deg)", offset: .82 }, { transform: "translate(0,-6px) rotate(358deg)", offset: .92 },
    { transform: "rotate(360deg)" },
  ], { duration: 2400, easing: "ease-out" });
  setTimeout(() => { smHatUp = false; smCheck(); }, smStill() ? 300 : 2400);
});

// The carrot, on its own: the same drawing, at the same size as on him
const smCarrot = () => {
  const k = snowman.getBoundingClientRect().width / 300;
  const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  el.id = "xcarrot";
  el.setAttribute("viewBox", "174 144 72 20");
  el.setAttribute("width", f1(72 * k));
  el.setAttribute("height", f1(20 * k));
  el.innerHTML = '<defs><linearGradient id="sm-carrot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb867"/>' +
    '<stop offset=".45" stop-color="#ee7d18"/><stop offset="1" stop-color="#a8480a"/></linearGradient></defs>' + SNOWMAN_NOSE;
  smExtras.push(el);
  document.body.append(el);
  return el;
};
// where it sits on his face (its top left corner), and where it is now
let smAt = [0, 0, 0];  // x, y, rotation
const smHome = () => smPt(174, 144);
const smPlace = (el, x, y, rot) => {
  smAt = [x, y, rot];
  el.style.transform = `translate(${f1(x)}px,${f1(y)}px) rotate(${f1(rot)}deg)`;
};
// Back on his face from where it is, then the nose is his again
const smNoseBack = async (el, gen, ms) => {
  const [x0, y0, r0] = smAt, [x1, y1] = smHome();
  await smTween(ms, t => { const e = smEase(t); smPlace(el, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, r0 * (1 - e)); });
  if (gen !== smGen) return;
  smDrop(el);
  snowman.classList.remove("noseless", "hold");
};

smNose.addEventListener("pointerdown", e => {
  if (smBusy || e.button > 0) return;
  e.preventDefault();
  e.stopPropagation();
  smBusy = true;
  const gen = smGen;
  smAnnoy();
  smSays("My nose!");
  snowman.classList.add("noseless", "hold");
  const el = smCarrot();
  el.classList.add("held");
  const [hx, hy] = smHome(), dx = e.clientX - hx, dy = e.clientY - hy;
  smPlace(el, hx, hy, 0);
  const move = ev => smPlace(el, ev.clientX - dx, ev.clientY - dy, Math.max(-25, Math.min(25, (ev.clientX - dx - smAt[0]) * 2)));
  const up = ev => {
    removeEventListener("pointermove", move);
    removeEventListener("pointerup", up);
    removeEventListener("pointercancel", up);
    if (gen !== smGen) return;
    el.classList.remove("held");
    const r = snowman.getBoundingClientRect();
    const onHim = ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom;
    (onHim ? smReplant : smFish)(el, gen);
  };
  addEventListener("pointermove", move);
  addEventListener("pointerup", up);
  addEventListener("pointercancel", up);
});
// Put back on him: he takes it and plants it where it belongs
const smReplant = async (el, gen) => {
  smAnimate(smArm, [{ transform: "rotate(0)" }, { transform: "rotate(-38deg)", offset: .5 }, { transform: "rotate(0)" }], { duration: 700, easing: "ease-in-out" });
  await smWait(smStill() ? 0 : 250);
  await smNoseBack(el, gen, 400);
  if (gen !== smGen) return;
  smSays("There.");
  smBusy = false;
  setTimeout(smCheck, 800);
};
// Dropped elsewhere: it lies there, and he fishes it back
const smFish = async (el, gen) => {
  smPlace(el, smAt[0], smAt[1], 18);
  if (smStill()) { await smNoseBack(el, gen, 0); smBusy = false; smSays("Got it."); return smCheck(); }
  await smWait(500);
  if (gen !== smGen) return;
  smSays("Hmm…", 1200);
  snowman.classList.add("fishing");
  await smWait(500);
  if (gen !== smGen) return;
  const line = smExtra("div", "xline");
  line.innerHTML = '<svg width="100%" height="100%"><path/><circle r="3"/></svg>';
  const path = line.querySelector("path"), hook = line.querySelector("circle");
  const k = snowman.getBoundingClientRect().width / 300;
  const tip = smPt(334, 104), bait = () => [smAt[0] + 6 * k, smAt[1] + 9 * k];  // the hook takes it by its top
  const draw = (hx, hy, sag) => {
    path.setAttribute("d", `M${f1(tip[0])},${f1(tip[1])}Q${f1((tip[0] + hx) / 2)},${f1((tip[1] + hy) / 2 + sag)} ${f1(hx)},${f1(hy)}`);
    hook.setAttribute("cx", f1(hx));
    hook.setAttribute("cy", f1(hy));
  };
  // the cast: the hook flies in an arc from the tip of the rod to the carrot
  const [bx, by] = bait(), top = Math.min(tip[1], by) - 140;
  await smTween(800, t => {
    const u = 1 - t, x = u * u * tip[0] + 2 * u * t * (tip[0] + bx) / 2 + t * t * bx, y = u * u * tip[1] + 2 * u * t * top + t * t * by;
    draw(x, y, 30 * t);
  });
  if (gen !== smGen) return;
  smAnimate(el, [{ marginTop: "0" }, { marginTop: "-6px" }, { marginTop: "0" }], { duration: 250 });  // hooked
  smSays("Got it!", 1500);
  await smWait(350);
  if (gen !== smGen) return;
  // the reel: carrot and hook come up to the tip of the rod, the line taut
  const [x0, y0, r0] = smAt, x1 = tip[0] - 6 * k, y1 = tip[1] - 9 * k;
  await smTween(1200, t => {
    const e = smEase(t);
    smPlace(el, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, r0 + 60 * Math.sin(e * Math.PI));
    const [hx, hy] = bait();
    draw(hx, hy, 12 * (1 - e));
  });
  if (gen !== smGen) return;
  smDrop(line);
  snowman.classList.remove("fishing");
  await smNoseBack(el, gen, 450);
  if (gen !== smGen) return;
  smBusy = false;
  setTimeout(smCheck, 800);
};

// Enough: he turns to us, winds up and throws a snowball at the pointer
const smThrow = async () => {
  smBusy = true;
  const gen = smGen;
  snowman.classList.add("hold");
  smSays("That's it!", 1400);
  // facing us: the face slides to the middle of his head, the nose points at us (seen short)
  const face = smAnimate(smFace, [{ transform: "none" }, { transform: "translateX(-14px)" }], { duration: 400, fill: "forwards", easing: "ease-out" });
  const nose = smAnimate(smNose, [{ transform: "none" }, { transform: "scaleX(.45)" }], { duration: 400, fill: "forwards", easing: "ease-out" });
  await smWait(smStill() ? 0 : 700);
  if (gen !== smGen) return;
  smAnimate(smArm, [{ transform: "rotate(0)" }, { transform: "rotate(-95deg)", offset: .65 }, { transform: "rotate(35deg)", offset: .85 }, { transform: "rotate(0)" }], { duration: 900, easing: "ease-in" });
  await smWait(smStill() ? 0 : 780);
  if (gen !== smGen) return;
  const [x0, y0] = smPt(262, 200);
  const [x1, y1] = smMouse || [innerWidth / 2, innerHeight / 2];
  if (!smStill()) {
    const ball = smExtra("div", "xball");
    const at = (x, y, s) => ({ transform: `translate(${f1(x)}px,${f1(y)}px) scale(${s})` });
    ball.style.transform = at(x1, y1, 7).transform;
    // towards us: it grows as it comes, in a short arc
    smAnimate(ball, [at(x0, y0, .35), at((x0 + x1) / 2, Math.min(y0, y1) - 120, 2.2), at(x1, y1, 7)], { duration: 600, easing: "cubic-bezier(.5,0,.9,.6)" });
    await smWait(600);
    smDrop(ball);
    if (gen !== smGen) return;
  }
  smFreeze(x1, y1, gen);
  smMad = 0;
  smPaintMad();
  smSays("Ha ha! ❄", 2200);
  // the laugh: a few hops, then back to his three-quarter pose
  smAnimate(smSvg, [{ transform: "none" }, { transform: "translateY(-6px)" }, { transform: "none" }, { transform: "translateY(-5px)" }, { transform: "none" }], { duration: 900 });
  await smWait(smStill() ? 0 : 1800);
  if (gen !== smGen) return;
  if (face) face.reverse();
  if (nose) nose.reverse();
  await smWait(smStill() ? 0 : 450);
  if (gen !== smGen) return;
  if (face) face.cancel();
  if (nose) nose.cancel();
  snowman.classList.remove("hold");
  smBusy = false;
};

// The splash and the frost, then the frozen pointer
const smSplat = (() => {  // a splash of snow, lobed, with drops thrown around it, drawn once
  const rnd = seeded(77), n = 16;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2, r = i % 2 ? 105 + rnd() * 50 : 62 + rnd() * 14;
    return [170 + Math.cos(a) * r, 170 + Math.sin(a) * r];
  });
  // smooth: through the middles of the sides, curving round each point (the lobes)
  const mid = i => { const p = pts[i % n], q = pts[(i + 1) % n]; return `${f1((p[0] + q[0]) / 2)},${f1((p[1] + q[1]) / 2)}`; };
  let d = `M${mid(0)}`;
  for (let i = 1; i <= n; i++) d += `Q${f1(pts[i % n][0])},${f1(pts[i % n][1])} ${mid(i)}`;
  const drops = Array.from({ length: 10 }, () => {
    const a = rnd() * Math.PI * 2, r = 140 + rnd() * 28;
    return `<circle cx="${f1(170 + Math.cos(a) * r)}" cy="${f1(170 + Math.sin(a) * r)}" r="${f1(3 + rnd() * 7)}"/>`;
  }).join("");
  return '<svg viewBox="0 0 340 340" width="100%" height="100%"><defs><radialGradient id="sm-splat" cx=".42" cy=".38">' +
    '<stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f2f6fc"/><stop offset="1" stop-color="#c9d7ea"/></radialGradient></defs>' +
    `<g fill="url(#sm-splat)" stroke="rgba(140,170,210,.55)" stroke-width="2"><path d="${d}Z"/>${drops}</g>` +
    '<path d="M120,150q20,-30 55,-28" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity=".9"/></svg>';
})();
const smFreeze = (x, y, gen) => {
  const frost = smExtra("div", "xfrost"), splat = smExtra("div", "xsplat");
  splat.innerHTML = smSplat;
  splat.style.transform = `translate(${f1(x)}px,${f1(y)}px)`;
  const melt = SM_FREEZE_MS + 2500;
  if (smStill()) frost.style.opacity = 1;
  else {
    smAnimate(frost, [{ opacity: 0 }, { opacity: 1, offset: .03 }, { opacity: 1, offset: SM_FREEZE_MS / melt }, { opacity: 0 }], { duration: melt, fill: "forwards" });
    smAnimate(splat, [
      { transform: `translate(${f1(x)}px,${f1(y)}px) scale(.3)`, opacity: 1 }, { transform: `translate(${f1(x)}px,${f1(y)}px) scale(1.05)`, opacity: 1, offset: .02 },
      { transform: `translate(${f1(x)}px,${f1(y)}px) scale(1)`, opacity: 1, offset: .04 }, { transform: `translate(${f1(x)}px,${f1(y + 30)}px) scale(1)`, opacity: .9, offset: .6 },
      { transform: `translate(${f1(x)}px,${f1(y + 70)}px) scale(.95)`, opacity: 0 },
    ], { duration: melt, fill: "forwards" });
  }
  setTimeout(() => { if (gen === smGen) { smDrop(frost); smDrop(splat); } }, melt);
  if (!smStill() && matchMedia("(pointer: fine)").matches) smSlowPointer(x, y, melt, gen);
};
const smSlowPointer = (x, y, ms, gen) => {
  const sheet = smExtra("div", "xfreeze"), icy = smExtra("div", "xcursor");
  icy.innerHTML = '<svg viewBox="0 0 26 34" width="26" height="34"><path d="M2,2V27L8.5,21 13,31.5 17.5,29.5 13,19.5H22Z" fill="#e3f6ff" stroke="#3d8fc4" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M5,9 8,12M5,15 9,17M10,21 11,25" stroke="#9fd4f2" stroke-width="1.2" stroke-linecap="round"/><path d="M2,27v4M8.5,21l1,4" stroke="#bfe6fb" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const pos = [x, y], t0 = performance.now();
  let last = t0;
  const frame = now => {
    if (gen !== smGen) return;
    const dt = Math.min(.1, (now - last) / 1000), left = ms - (now - t0);
    last = now;
    // slow at first (a time constant of 0.7 s), quicker as the ice melts in the last 2.5 s
    const speed = left > 2500 ? 1.4 : 1.4 + (2500 - left) / 2500 * 20;
    const k = 1 - Math.exp(-speed * dt), [mx, my] = smMouse || pos;
    pos[0] += (mx - pos[0]) * k;
    pos[1] += (my - pos[1]) * k;
    const shiver = left > 2500 ? 1.2 : .4;
    icy.style.transform = `translate(${f1(pos[0] + (Math.random() - .5) * shiver)}px,${f1(pos[1] + (Math.random() - .5) * shiver)}px)`;
    if (left > 0) smLoop = requestAnimationFrame(frame);
    else { smDrop(sheet); smDrop(icy); smLoop = null; }
  };
  smLoop = requestAnimationFrame(frame);
  // a click goes to what is under the icy pointer
  sheet.addEventListener("click", e => {
    e.stopPropagation();
    sheet.style.pointerEvents = icy.style.display = "none";
    const el = document.elementFromPoint(pos[0], pos[1]);
    sheet.style.pointerEvents = icy.style.display = "";
    if (!el) return;
    if (el.matches("input, textarea, select")) el.focus();
    el.click();
  });
};

// Christmas over: every game stops, he is himself again
const smReset = () => {
  smGen++;
  smAnims.forEach(a => a.cancel());
  smAnims = [];
  smExtras.forEach(el => el.remove());
  smExtras = [];
  if (smLoop) cancelAnimationFrame(smLoop);
  smLoop = null;
  smMad = 0;
  smBusy = smHatUp = false;
  snowman.classList.remove("noseless", "hold", "fishing", "mad1", "mad2");
  smSay.classList.remove("on");
};
document.addEventListener("christmas", e => { if (!e.detail) smReset(); });
