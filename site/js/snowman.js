// ── The snowman's games (both Christmas screens) ──
// The snowman of christmas.js (#xsnowman, in the left margin) is alive:
// - his eyes follow the mouse pointer.
// - his hat: a click knocks it up in the air; it lands crooked and he straightens it.
// - his carrot nose: it can be dragged off his face. Put back on him, he takes it and plants it in
//   place; dropped anywhere else, it lies there and he fishes it back: a rod (cork handle, reel,
//   rings) drawn over the page, a back cast, the line and its float flying out, a ripple, the
//   strike, the reel cranked with the rod bent, the carrot hanging from the hook up to his face.
// - his body: a click tickles him (he giggles, and it calms him down); held down, the warm hand
//   melts him: he sinks, sweats and drips into a puddle, and freezes back when let go (or, melted
//   flat, builds himself up again).
// - his coal buttons are a xylophone: eight notes in a row and he dances; the start of Jingle
//   Bells (E E E, E E E, E G C D E: buttons 2 2 2, 2 2 2, 2 1 4 3 2 from the top) and he sings on.
//   The fifth, lowest one plays Megalovania, one note per click: spam it (his eye glows blue), and
//   at the 22nd click the real song plays, whole, with a fight (sansfight.js), until it is clicked
//   again.
// Each tease (hat, nose, melting him flat) makes him crosser (brows, then red cheeks and steam), and
// he calms down after a while left in peace. The third is one too many: he turns to us, bends down,
// scoops snow from his belly, packs it into a snowball (three squeezes, crumbs falling), winds up
// and throws it. It comes at us, growing as it comes closer and closer, until it fills the whole
// window: we take it in the face. A splash, spray, lumps of snow sliding down the glass, two
// blinks, a blurred view, frost on the window
// (img/frost.png), and for a few seconds a frozen pointer: the real one is hidden, an icy one
// follows it slowly, shivering, and clicks go where the icy one is (touch screens: no pointer).
// What flies (the carrot, the rod and line, the snowball, the snow) is a fixed element over the page,
// made for the move and removed after; on the snowman only transforms and opacity change. The
// snowball and its lumps are bitmaps drawn once on a canvas, so growing them redraws nothing.
// Reduced motion: the same story without the flights (no rod, no flying ball, no slow pointer).
const smQ = sel => snowman.querySelector(sel);
const smHat = smQ(".hat"), smNose = smQ(".nose"), smFace = smQ(".face"), smArm = smQ(".wave");
const smSvg = smQ("svg"), smLook = smQ(".look"), smPuddle = smQ(".puddle"), smUpper = smQ(".upper"), smDent = smQ(".dent");
const smSay = document.createElement("span");
smSay.className = "say";
snowman.append(smSay);
const SM_FREEZE_MS = 12000;  // how long the window stays frozen, before it melts (2.5 s)
let smMad = 0, smMadAt = 0, smBusy = false, smHatUp = false, smGen = 0, smSayEnd = null;
let smMouse = null;  // the pointer: his eyes follow it
let smAnims = [], smExtras = [], smLoop = null, smBox = null, smLookRaf = null;

const smStill = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const smWait = ms => new Promise(done => setTimeout(done, smStill() ? 0 : ms));
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
const smLerp = (a, b, t) => a + (b - a) * t;
const smAnimate = (el, frames, opts) => {
  if (smStill()) return null;
  const a = el.animate(frames, opts);
  smAnims.push(a);
  return a;
};
const smExtra = (tag, id, parent = document.body) => {
  const el = document.createElement(tag);
  if (id) el.id = id;
  smExtras.push(el);
  parent.append(el);
  return el;
};
const smDrop = el => {
  el.remove();
  smExtras = smExtras.filter(x => x !== el);
};
// A point of his drawing (300 x 520), in the window. The scene is fixed, so is his box: it is
// measured once, again after a resize.
const smPt = (x, y) => {
  const r = smBox || (smBox = snowman.getBoundingClientRect()), k = r.width / 300;
  return [r.left + x * k, r.top + y * k];
};
const smK = () => (smBox || (smBox = snowman.getBoundingClientRect())).width / 300;
addEventListener("resize", () => { smBox = null; });
const smSays = (text, ms = 1800) => {
  smSay.textContent = text;
  smSay.classList.add("on");
  clearTimeout(smSayEnd);
  smSayEnd = setTimeout(() => smSay.classList.remove("on"), ms);
};
// Something that floats up from a point of his drawing and goes (a note, a drop): an element in
// his box, its CSS animation removes nothing, a timer does
const smFloat = (cls, text, x, y, ms) => {
  if (snowman.querySelectorAll("." + cls.split(" ")[0]).length > 12) return;
  const el = smExtra("span", null, snowman);
  el.className = cls;
  el.textContent = text;
  el.style.left = `${f1(x / 3)}%`;
  el.style.top = `${f1(y / 5.2)}%`;
  setTimeout(() => smDrop(el), ms);
};

// Sounds, made with Web Audio (a click always came before, so it may play): the xylophone's notes,
// the crunch of packed snow, the whoosh of the snowball and its thud
let smCtx = null;
const smAudio = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!smCtx) { try { smCtx = new AC(); } catch (e) { return null; } }
  if (smCtx.state === "suspended") smCtx.resume();
  return smCtx;
};
const smNote = freq => {
  const ctx = smAudio();
  if (!ctx) return;
  const t = ctx.currentTime, out = ctx.createGain();
  out.gain.setValueAtTime(.0001, t);
  out.gain.exponentialRampToValueAtTime(.2, t + .008);
  out.gain.exponentialRampToValueAtTime(.0001, t + .9);
  out.connect(ctx.destination);
  [[1, 1], [4, .2], [9.2, .05]].forEach(([m, g]) => {  // a bar struck: its tone and two bright overtones
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.value = freq * m;
    og.gain.value = g;
    o.connect(og);
    og.connect(out);
    o.start(t);
    o.stop(t + .95);
  });
};
const smNoise = (ms, from, to, peak, shape) => {  // filtered noise: crunch, whoosh, thud
  const ctx = smAudio();
  if (!ctx) return;
  const n = Math.ceil(ctx.sampleRate * ms / 1000), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime, end = t + ms / 1000;
  src.buffer = buf;
  f.type = "bandpass";
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, end);
  if (shape === "swell") { g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(peak, end); }
  else { g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(.001, end); }
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  src.start(t);
};

// His arm (the near one, towards the courses): turned around the shoulder; the hand is its tip.
// And his top half, bent at the waist (the arm goes with it).
const SM_SHOULDER = [218, 258], SM_HAND = [268, 216], SM_WAIST = [150, 328];
let smArmDeg = 0, smBendDeg = 0;
const smSetArm = deg => { smArmDeg = deg; smArm.style.transform = deg ? `rotate(${f1(deg)}deg)` : ""; };
const smSetBend = deg => { smBendDeg = deg; smUpper.style.transform = deg ? `rotate(${f1(deg)}deg)` : ""; };
const smTurn = ([x, y], [cx, cy], deg) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
};
const smHandAt = () => smTurn(smTurn(SM_HAND, SM_SHOULDER, smArmDeg), SM_WAIST, smBendDeg);  // in his drawing
const smHand = () => smPt(...smHandAt());

// His eyes follow the pointer: at most once a frame, a few units towards it
addEventListener("pointermove", e => {
  smMouse = [e.clientX, e.clientY];
  if (!smLookRaf && snowman.isConnected) smLookRaf = requestAnimationFrame(smLookAt);
}, { passive: true });
const smLookAt = () => {
  smLookRaf = null;
  if (!smMouse || !snowman.isConnected) return;
  const [cx, cy] = smPt(178, 140), dx = smMouse[0] - cx, dy = smMouse[1] - cy, d = Math.hypot(dx, dy) || 1;
  const r = Math.min(1, d / 250) * 3.4;
  smLook.style.transform = `translate(${f1(dx / d * r)}px,${f1(dy / d * r * .8)}px)`;
};

// His temper: 1 = cross, 2 = furious, 3 = the snowball. A quarter of a minute left in peace calms
// him down a step (and so does tickling him).
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

// ── The hat: up in the air, spinning, down crooked, then straightened
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

// ── His body: tickled by a click, melted by a hand held on it
let smTickles = [], smPress = null;
snowman.querySelectorAll(".snow").forEach(part => part.addEventListener("pointerdown", e => {
  if (smBusy || e.button > 0) return;
  e.preventDefault();
  smPress = setTimeout(() => { smPress = null; smMeltStart(); }, 450);
  const up = () => {
    removeEventListener("pointerup", up);
    removeEventListener("pointercancel", up);
    if (smPress) { clearTimeout(smPress); smPress = null; smTickle(); } else smMelting = false;
  };
  addEventListener("pointerup", up);
  addEventListener("pointercancel", up);
}));
const smTickle = () => {
  const now = Date.now();
  smTickles = smTickles.filter(t => now - t < 3000).concat(now);
  smAnimate(smSvg, [{ transform: "none" }, { transform: "scale(1.06,.93)" }, { transform: "scale(.96,1.05)" }, { transform: "scale(1.02,.98)" }, { transform: "none" }], { duration: 500, easing: "ease-out" });
  if (smTickles.length >= 4) {  // a fit of laughter
    smTickles = [];
    snowman.classList.add("laughing");
    smSays("HA HA HA! Stop!", 1600);
    smAnimate(smSvg, [{ transform: "none" }, { transform: "translateY(-10px) rotate(-3deg)" }, { transform: "none" }, { transform: "translateY(-8px) rotate(3deg)" }, { transform: "none" }, { transform: "translateY(-6px)" }, { transform: "none" }], { duration: 1200, delay: 450 });
    setTimeout(() => snowman.classList.remove("laughing"), 1700);
  } else if (smMad) {
    smMad--;
    smPaintMad();
    smSays("Okay, okay… 😊");
  } else smSays(["Hee hee!", "That tickles!", "Hihihi!"][smTickles.length - 1]);
};
// Melting: m from 0 (himself) to 1 (a puddle). He sinks and spreads (scaled from his base), the
// puddle grows under him (counter-scaled, so it stays a puddle), he sweats and drips.
let smMelt = 0, smMelting = false, smMelted = false, smMeltRaf = null, smMeltLast = 0, smMeltSaid = 0;
const smPaintMelt = () => {
  const m = smMelt, sy = 1 - .86 * Math.pow(m, 1.4), sx = 1 + .3 * m;
  smSvg.style.transform = m > 0 ? `scale(${sx.toFixed(3)},${sy.toFixed(3)})` : "";
  smPuddle.style.opacity = Math.min(1, m * 1.6).toFixed(2);
  smPuddle.style.transform = m > 0 ? `scale(${(1 / sx * (.4 + .6 * m)).toFixed(3)},${(1 / sy * (.4 + .6 * m)).toFixed(3)})` : "";
  snowman.classList.toggle("sweaty", m > .04);
};
const smMeltStart = () => {
  smBusy = smMelting = true;
  smMeltSaid = 0;
  snowman.classList.add("hold");
  smSays("Hey, your hand is warm!");
  smMeltLast = performance.now();
  if (!smMeltRaf) smMeltRaf = requestAnimationFrame(smMeltFrame);
};
const smMeltFrame = now => {
  smMeltRaf = null;
  const dt = Math.min(.1, (now - smMeltLast) / 1000);
  smMeltLast = now;
  smMelt = smMelting ? Math.min(1, smMelt + dt / 3.5) : Math.max(0, smMelt - dt / 1.2);
  smPaintMelt();
  if (smMelting && Math.random() < dt * 7) {  // a drop runs down from somewhere on him
    const top = 520 - 420 * (1 - .86 * Math.pow(smMelt, 1.4));
    smFloat("drip", "", 70 + Math.random() * 170, top + Math.random() * (470 - top), 1100);
  }
  if (smMelting && smMelt > .5 && !smMeltSaid) { smMeltSaid = 1; smSays("I'm melting!", 1600); }
  if (smMelt >= 1) { smMelting = false; smMelted = true; return smMeltedFlat(); }
  if (smMelting || smMelt > 0) smMeltRaf = requestAnimationFrame(smMeltFrame);
  else {
    snowman.classList.remove("hold");
    smBusy = false;
    if (smMeltSaid) smSays("Phew…");
  }
};
const smMeltedFlat = async () => {  // a puddle, then he builds himself up again, cross
  const gen = smGen;
  smSays("…", 1200);
  await smWait(1600);
  if (gen !== smGen) return;
  smSays("Brr… much better!", 1800);
  for (let i = 0; i < 6; i++) smFloat("flake", "❄", 90 + Math.random() * 120, 380 + Math.random() * 100, 1200);
  await smTween(1300, t => {  // back up with a little overshoot
    const e = 1 - Math.pow(1 - t, 3);
    smMelt = Math.max(0, 1 - e * 1.06);
    smPaintMelt();
  });
  if (gen !== smGen) return;
  smMelt = 0;
  smPaintMelt();
  smMelted = false;
  snowman.classList.remove("hold");
  smBusy = false;
  smAnnoy();
  setTimeout(smCheck, 900);
};

// ── His buttons: a xylophone (G E D C from the top), and the lowest one plays Megalovania, one note
// a click (in chiptune), his eye glowing blue while it lasts. Spammed on to the 22nd note, the real
// song starts (audio/megalovania.mp3, loaded ahead from the 10th): it plays to its end, unless the
// button is clicked again, which stops it.
const SM_NOTES = [784, 659.3, 587.3, 523.3], SM_BTN_AT = [[178, 240], [181, 268], [179, 297], [184, 392], [187, 436]];
const SM_MEGA = (() => {  // D D D' A G# G F D F G, then the same on C, B and B flat
  const tail = [1174.7, 880, 830.6, 784, 698.5, 587.3, 698.5, 784];
  return [587.3, 523.3, 493.9, 466.2].reduce((all, low) => all.concat([low, low], tail), []);
})();
const SM_MEGA_SONG = 22;  // the click that starts the song
let smMegaI = 0, smMegaAt = 0, smMegaEnd = null, smMegaTrack = null, smMegaSong = false;
const smChip = freq => {  // a square wave, short, like an old console
  const ctx = smAudio();
  if (!ctx) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = "square";
  o.frequency.value = freq;
  f.type = "lowpass";
  f.frequency.value = 3200;
  g.gain.setValueAtTime(.0001, t);
  g.gain.exponentialRampToValueAtTime(.07, t + .005);
  g.gain.setValueAtTime(.07, t + .09);
  g.gain.exponentialRampToValueAtTime(.0001, t + .16);
  o.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + .18);
};
// The Christmas turntable is hushed while the song plays (christmas.js), then plays on
let smHushed = false;
const smHush = on => {
  if (on && carolsPlaying && !smHushed) {
    smHushed = true;
    if (carolsRock) carolsRock.pause(); else if (carolsRadio) ytPause(XMAS_LIVE, CAROLS_YT);
  } else if (!on && smHushed) {
    smHushed = false;
    if (!carolsPlaying) return;  // stopped meanwhile
    if (carolsRock) carolsRock.play().catch(() => {}); else if (carolsRadio) ytPlay(XMAS_LIVE, CAROLS_YT, !carolsMuted);
  }
};
const smMegaStop = () => {  // the song, its fight and the glow end, the count starts again
  if (typeof sfEnd === "function") sfEnd();
  smHush(false);
  dropTrack(smMegaTrack);
  smMegaTrack = null;
  smMegaSong = false;
  smMegaI = 0;
  clearTimeout(smMegaEnd);
  snowman.classList.remove("badtime");
};
const smMegalovania = () => {
  if (smMegaSong) { smSays("…ok.", 1200); return smMegaStop(); }  // clicked during the song: it stops
  const now = Date.now();
  if (now - smMegaAt > 1500) {  // a pause: from the start again
    smMegaI = 0;
    dropTrack(smMegaTrack);
    smMegaTrack = null;
  }
  smMegaAt = now;
  smMegaI++;
  if (smMegaI === 10 && !smMegaTrack) smMegaTrack = preloadTrack("megalovania.mp3", { loop: false });
  if (smMegaI >= 4) snowman.classList.add("badtime");
  if (smMegaI === 18) smSays("You're gonna have a bad time.", 2600);
  clearTimeout(smMegaEnd);
  if (smMegaI < SM_MEGA_SONG) {
    smChip(SM_MEGA[(smMegaI - 1) % SM_MEGA.length]);
    smMegaEnd = setTimeout(() => snowman.classList.remove("badtime"), 1600);
    return;
  }
  // the song, whole, his eye glowing all along
  smMegaSong = true;
  const track = smMegaTrack || (smMegaTrack = preloadTrack("megalovania.mp3", { loop: false }));
  track.addEventListener("ended", () => { if (smMegaTrack === track) smMegaStop(); });
  track.play().catch(() => { if (smMegaTrack === track) smMegaStop(); });
  smHush(true);
  smSays("💀", 1500);
  sfStart();  // and the fight begins (sansfight.js)
};
const SM_JINGLE = "11111110321";  // E E E, E E E, E G C D E
// what he sings on: F F F F F E E E E D D E D G
const SM_ANSWER = [698.5, 698.5, 698.5, 698.5, 698.5, 659.3, 659.3, 659.3, 659.3, 587.3, 587.3, 659.3, 587.3, 784];
let smTune = "", smTuneAt = 0, smDancing = false;
snowman.querySelectorAll(".btn").forEach(btn => {
  const i = +btn.dataset.i;
  btn.addEventListener("pointerdown", e => e.stopPropagation());
  btn.addEventListener("click", e => {
    e.stopPropagation();
    if (i === 4 && smMegaSong) return smMegalovania();  // the song can always be stopped
    if (smBusy && !smDancing) return;
    if (i === 4) {
      smMegalovania();
      smAnimate(btn, [{ transform: "none" }, { transform: "scale(1.3)" }, { transform: "none" }], { duration: 160 });
      return smFloat("note mega", "♪", SM_BTN_AT[4][0] + 14, SM_BTN_AT[4][1] - 10, 1400);
    }
    smNote(SM_NOTES[i]);
    smAnimate(btn, [{ transform: "none" }, { transform: "scale(1.4)" }, { transform: "none" }], { duration: 260, easing: "ease-out" });
    smFloat("note", ["♪", "♫", "♩"][i % 3], SM_BTN_AT[i][0] + 14, SM_BTN_AT[i][1] - 10, 1400);
    const now = Date.now();
    if (now - smTuneAt > 2500) smTune = "";
    smTune = (smTune + i).slice(-20);
    smTuneAt = now;
    if (smTune.endsWith(SM_JINGLE)) { smTune = ""; smDance(true); }
    else if (smTune.length >= 8 && SM_JINGLE.indexOf(smTune) !== 0 && !smDancing) smDance(false);
  });
});
const smDance = async big => {
  smBusy = smDancing = true;
  const gen = smGen;
  snowman.classList.add("hold");
  smSays(big ? "🎶 Jingle all the way!" : "♪ La la la!", big ? 4200 : 2400);
  const ms = big ? 4200 : 2400, hops = big ? 8 : 5;
  const sway = [];
  for (let i = 0; i <= hops * 2; i++) sway.push({ transform: i % 2 ? `translateY(-9px) rotate(${i % 4 === 1 ? -5 : 5}deg)` : "none" });
  smAnimate(smSvg, sway, { duration: ms, easing: "ease-in-out" });
  smAnimate(smArm, [{ transform: "rotate(0)" }, { transform: "rotate(-35deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(-35deg)" }, { transform: "rotate(10deg)" }, { transform: "rotate(0)" }], { duration: ms, iterations: 1 });
  smAnimate(smHat, [{ transform: "none" }, { transform: "translateY(-10px) rotate(-6deg)" }, { transform: "none" }, { transform: "translateY(-10px) rotate(6deg)" }, { transform: "none" }], { duration: ms / 2, iterations: 2 });
  if (big) {  // he sings the next line, his buttons lighting up
    for (let i = 0; i < SM_ANSWER.length; i++) {
      await smWait(i === 7 || i === 11 ? 420 : 260);
      if (gen !== smGen) return;
      smNote(SM_ANSWER[i]);
      smFloat("note", "♪", 200 + Math.random() * 40, 120 + Math.random() * 30, 1400);
    }
    await smWait(500);
  } else {
    for (let i = 0; i < 5; i++) { await smWait(ms / 5); smFloat("note", "♫", 190 + Math.random() * 50, 110 + Math.random() * 40, 1400); }
  }
  if (gen !== smGen) return;
  snowman.classList.remove("hold");
  smBusy = smDancing = false;
};

// ── His nose: the carrot, on its own, the same drawing at the same size as on him. It turns
// around its thick end (#xcarrot's transform-origin), where the hook takes it.
const smCarrot = () => {
  const k = smK();
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
let smAt = [0, 0, 0];  // where the carrot is: its top left corner, its rotation
const smHome = () => smPt(174, 144);
const smPlace = (el, x, y, rot) => {
  smAt = [x, y, rot];
  el.style.transform = `translate(${f1(x)}px,${f1(y)}px) rotate(${f1(rot)}deg)`;
};
const smBait = () => { const k = smK(); return [smAt[0] + 4 * k, smAt[1] + 8 * k]; };  // its thick end
const smNoseBack = async (el, gen, ms) => {  // from where it is back on his face
  const [x0, y0, r0] = smAt, [x1, y1] = smHome();
  await smTween(ms, t => { const e = smEase(t); smPlace(el, smLerp(x0, x1, e), smLerp(y0, y1, e), r0 * (1 - e)); });
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
  await smWait(250);
  await smNoseBack(el, gen, 400);
  if (gen !== smGen) return;
  smSays("There.");
  smBusy = false;
  setTimeout(smCheck, 800);
};

// The fishing rod, drawn over the page in window pixels, from his hand: a cork handle, a blank
// bending as a quadratic curve (three strokes, thinner towards the tip), four rings, a reel with
// its crank; the line from the tip to the hook, sagging, its red and white float; a ripple.
// R: theta (the rod's angle, degrees), len, bend (-1..1, to the clockwise side), crank (radians),
// hook ([x, y] or null), sag (px), bob (the float's bobbing, px), ripple ({ x, y, r, o } or null).
const smRod = () => {
  const k = smK(), wrap = smExtra("div", "xline");
  wrap.innerHTML = '<svg width="100%" height="100%"><path class="line"/><ellipse class="ripple"/><path class="cork"/>' +
    '<path class="blank b0"/><path class="blank b1"/><path class="blank b2"/><g class="rings"><circle/><circle/><circle/><circle/></g>' +
    '<g class="reel"><circle class="spool"/><path class="crank"/><circle class="knob"/></g>' +
    '<g class="float"><circle/><path/></g><path class="hook"/></svg>';
  const q = sel => wrap.querySelector(sel), qa = sel => wrap.querySelectorAll(sel);
  const set = (el, attrs) => { for (const a in attrs) el.setAttribute(a, typeof attrs[a] === "number" ? f1(attrs[a]) : attrs[a]); };
  [[".cork", 6.5], [".b0", 1.5], [".b1", 2.6], [".b2", 3.6], [".crank", 2]].forEach(([s, w]) => set(q(s), { "stroke-width": w * k }));
  set(q(".spool"), { r: 6.5 * k });
  set(q(".knob"), { r: 2.2 * k });
  set(q(".float circle"), { r: 5 * k });
  qa(".rings circle").forEach((c, i) => set(c, { r: (2.4 - i * .35) * k }));
  const R = { theta: -60, len: 0, bend: 0, crank: 0, hook: null, sag: 0, bob: 0, ripple: null, tip: [0, 0] };
  R.draw = () => {
    const B = smHand(), a = R.theta * Math.PI / 180, d = [Math.cos(a), Math.sin(a)], p = [-d[1], d[0]], L = R.len;
    const T = [B[0] + d[0] * L + p[0] * R.bend * L * .35, B[1] + d[1] * L + p[1] * R.bend * L * .35];
    const C = [B[0] + d[0] * L * .55 + p[0] * R.bend * L * .12, B[1] + d[1] * L * .55 + p[1] * R.bend * L * .12];
    const at = t => [(1 - t) * (1 - t) * B[0] + 2 * (1 - t) * t * C[0] + t * t * T[0], (1 - t) * (1 - t) * B[1] + 2 * (1 - t) * t * C[1] + t * t * T[1]];
    const part = t => {  // the curve from the hand to t (de Casteljau)
      const c = [smLerp(B[0], C[0], t), smLerp(B[1], C[1], t)], e = at(t);
      return `M${f1(B[0])},${f1(B[1])}Q${f1(c[0])},${f1(c[1])} ${f1(e[0])},${f1(e[1])}`;
    };
    R.tip = T;
    set(q(".b0"), { d: part(1) });
    set(q(".b1"), { d: part(.62) });
    set(q(".b2"), { d: part(.3) });
    const h0 = [B[0] - d[0] * 13 * k, B[1] - d[1] * 13 * k], h1 = [B[0] + d[0] * 12 * k, B[1] + d[1] * 12 * k];
    set(q(".cork"), { d: L ? `M${f1(h0[0])},${f1(h0[1])}L${f1(h1[0])},${f1(h1[1])}` : "M0,0" });
    qa(".rings circle").forEach((c, i) => { const r = at([.3, .55, .78, 1][i]); set(c, { cx: r[0], cy: r[1] }); });
    const rc = [B[0] - d[0] * 4 * k + p[0] * 7 * k, B[1] - d[1] * 4 * k + p[1] * 7 * k];
    const kn = [rc[0] + Math.cos(R.crank) * 7 * k, rc[1] + Math.sin(R.crank) * 7 * k];
    set(q(".spool"), { cx: rc[0], cy: rc[1] });
    set(q(".crank"), { d: `M${f1(rc[0])},${f1(rc[1])}L${f1(kn[0])},${f1(kn[1])}` });
    set(q(".knob"), { cx: kn[0], cy: kn[1] });
    q(".reel").style.opacity = L > 20 * k ? 1 : 0;
    const H = R.hook;
    q(".line").style.display = q(".hook").style.display = H ? "" : "none";
    q(".float").style.display = H && R.bob !== null ? "" : "none";
    if (H) {
      const M = [(T[0] + H[0]) / 2, (T[1] + H[1]) / 2 + R.sag];
      set(q(".line"), { d: `M${f1(T[0])},${f1(T[1])}Q${f1(M[0])},${f1(M[1])} ${f1(H[0])},${f1(H[1])}` });
      const u = .78, fx = (1 - u) * (1 - u) * T[0] + 2 * (1 - u) * u * M[0] + u * u * H[0], fy = (1 - u) * (1 - u) * T[1] + 2 * (1 - u) * u * M[1] + u * u * H[1] + (R.bob || 0);
      set(q(".float circle"), { cx: fx, cy: fy });
      set(q(".float path"), { d: `M${f1(fx - 5 * k)},${f1(fy)}A${f1(5 * k)},${f1(5 * k)} 0 0 1 ${f1(fx + 5 * k)},${f1(fy)}Z` });
      set(q(".hook"), { d: `M${f1(H[0])},${f1(H[1] - 6 * k)}v${f1(6 * k)}q0,${f1(4 * k)} ${f1(-3.5 * k)},${f1(4 * k)}q${f1(-3 * k)},0 ${f1(-3.5 * k)},${f1(-3 * k)}` });
    }
    const W = R.ripple;
    q(".ripple").style.display = W ? "" : "none";
    if (W) set(q(".ripple"), { cx: W.x, cy: W.y, rx: W.r, ry: W.r * .35, opacity: W.o });
  };
  R.wrap = wrap;
  return R;
};
// Dropped elsewhere: it lies there, and he fishes it back
const smFish = async (el, gen) => {
  smPlace(el, smAt[0], smAt[1], 18);
  if (smStill()) { await smNoseBack(el, gen, 0); smBusy = false; smSays("Got it."); return smCheck(); }
  await smWait(500);
  if (gen !== smGen) return;
  smSays("Hmm… 🎣", 1600);
  const k = smK(), R = smRod(), bait = smBait();
  const stale = () => gen !== smGen;
  // the rod comes out of his hand, pointing up
  await smTween(350, t => { R.len = 150 * k * smEase(t); smSetArm(-12 * t); R.draw(); });
  // the back cast, straight up (not across his face), then the forward cast towards the carrot
  await smTween(420, t => { const e = smEase(t); R.theta = -60 - 42 * e; smSetArm(-12 - 26 * e); R.bend = -.3 * e; R.draw(); });
  if (stale()) return;
  const B = smHand(), aim = Math.max(-70, Math.min(-12, Math.atan2(bait[1] - B[1], bait[0] - B[0]) * 180 / Math.PI - 28));
  await smTween(200, t => { const e = t * t; R.theta = -102 + (aim + 102) * e; smSetArm(-38 + 38 * e); R.bend = .55 * Math.sin(t * Math.PI); R.draw(); });
  if (stale()) return;
  // the line flies out in an arc, the float and the hook landing by the carrot; the rod quivers
  const T0 = R.tip.slice(), top = Math.min(T0[1], bait[1]) - 170;
  smNoise(700, 2400, 900, .05);
  await smTween(800, t => {
    const u = 1 - t;
    R.hook = [u * u * T0[0] + 2 * u * t * (T0[0] + bait[0]) / 2 + t * t * bait[0], u * u * T0[1] + 2 * u * t * top + t * t * bait[1]];
    R.bend = .35 * Math.exp(-4 * t) * Math.cos(t * 20);
    R.sag = 50 * k * t;
    R.bob = 0;
    R.draw();
  });
  if (stale()) return;
  // plop: a ripple, the float bobbing
  await smTween(900, t => {
    R.ripple = { x: bait[0], y: bait[1] + 4 * k, r: (4 + 34 * t) * k, o: 1 - t };
    R.bob = Math.sin(t * 14) * 3 * k * (1 - t);
    R.draw();
  });
  if (stale()) return;
  R.ripple = null;
  // the strike: rod up, carrot hooked (it jumps), line taut
  smSays("Got it!", 1500);
  await smTween(220, t => { R.theta = aim - 20 * smEase(t); R.bend = .45 * t; R.sag = 50 * k * (1 - t); R.draw(); });
  if (stale()) return;
  // the reel: crank turning, rod bent, the carrot coming, wriggling, hanging from the hook
  const H0 = bait.slice(), r0 = smAt[2];
  await smTween(1400, t => {
    const e = smEase(t), T = R.tip;
    R.crank += .45;
    R.bend = .45 * (1 - e * .7);
    R.bob = null;
    const w = Math.sin(t * 22) * 7 * k * (1 - e);
    R.hook = [smLerp(H0[0], T[0], e) + w * .4, smLerp(H0[1], T[1] + 14 * k, e) + w];
    const kk = smK();
    smPlace(el, R.hook[0] - 4 * kk, R.hook[1] - 8 * kk, smLerp(r0, 80, Math.min(1, t * 2)));
    R.draw();
  });
  if (stale()) return;
  // up to his face, then on it, as the rod goes back away
  const r1 = smAt[2];
  await smTween(450, t => {
    const e = smEase(t);
    R.theta = aim - 20 + (-95 - aim + 20) * e;
    R.bend = .15 * (1 - e);
    smSetArm(-20 * e);
    R.draw();
    R.hook = [R.tip[0], R.tip[1] + 14 * k];
    const kk = smK();
    smPlace(el, R.hook[0] - 4 * kk, R.hook[1] - 8 * kk, r1);
  });
  if (stale()) return;
  R.hook = null;
  R.draw();
  const back = smNoseBack(el, gen, 450);
  await smTween(350, t => { R.len = 150 * k * (1 - smEase(t)); smSetArm(-20 * (1 - t)); R.draw(); });
  await back;
  if (stale()) return;
  smDrop(R.wrap);
  smSetArm(0);
  smBusy = false;
  setTimeout(smCheck, 800);
};

// Snow crumbs and spray: particles with gravity and drag on a canvas over the page, drawn while
// any lives
const smParticles = id => {
  const cv = smExtra("canvas", id), ctx = cv.getContext("2d"), list = [];
  cv.width = innerWidth;
  cv.height = innerHeight;
  let last = 0, raf = null;
  const frame = now => {
    raf = null;
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(120,150,200,.55)";
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i], d = Math.pow(p.drag, dt);
      p.vx *= d;
      p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (list.length && cv.isConnected) raf = requestAnimationFrame(frame);
  };
  // n particles from x, y: speed (px/s) in all directions, up (px/s) more upwards, size, life (s)
  const add = (x, y, n, speed, up, r, life, g = 900, drag = .5) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (.3 + Math.random() * .7);
      list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, r: r * (.4 + Math.random() * .8), life: life * (.6 + Math.random() * .6), g, drag });
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  return { add, cv };
};

// ── The snowball. Drawn once on canvases, as bitmaps (growing them redraws nothing): the ball, a
// lumpy sphere of packed snow lit from the top left, grainy, with the creases of the hands; and
// three lumps of snow, for what sticks on the window after.
const smLump = (ctx, cx, cy, r, amp, n, rnd) => {  // a closed, wobbly outline, smoothed
  const pts = Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2, k = 1 + (rnd() - .5) * amp;
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k];
  });
  const mid = i => { const p = pts[i % n], q = pts[(i + 1) % n]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
  ctx.beginPath();
  ctx.moveTo(...mid(0));
  for (let i = 1; i <= n; i++) { const m = mid(i); ctx.quadraticCurveTo(pts[i % n][0], pts[i % n][1], m[0], m[1]); }
  ctx.closePath();
};
const smSnowImage = (size, seed, amp, n, creases, lump) => {  // lump: a flat splash, lighter
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d"), rnd = seeded(seed), h = size / 2, r = size * .46;
  smLump(ctx, h, h, r, amp, n, rnd);
  const g = ctx.createRadialGradient(h * .7, h * .6, r * .05, h, h, r * 1.05);
  [[0, "#ffffff"], [.4, lump ? "#fbfdff" : "#f5f8fc"], [.78, lump ? "#eaf0f7" : "#dbe5f0"], [1, lump ? "#cfdbe9" : "#aabdd4"]].forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // grain: thousands of specks, light and dark
  for (let i = 0; i < size * 9; i++) {
    const x = rnd() * size, y = rnd() * size, s = size / 400 * (.6 + rnd() * 1.6);
    ctx.fillStyle = rnd() < .5 ? "rgba(255,255,255,.7)" : "rgba(110,140,185,.18)";
    ctx.fillRect(x, y, s, s);
  }
  // the creases of the hands that packed it
  ctx.lineCap = "round";
  for (let i = 0; i < creases; i++) {
    const a = rnd() * Math.PI * 2, d = r * (.2 + rnd() * .6), x = h + Math.cos(a) * d, y = h + Math.sin(a) * d, l = r * (.15 + rnd() * .25), b = a + Math.PI / 2 + (rnd() - .5);
    ctx.strokeStyle = "rgba(120,150,195,.28)";
    ctx.lineWidth = size / 150;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(b) * l, y - Math.sin(b) * l);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * .3, y + Math.sin(a) * l * .3, x + Math.cos(b) * l, y + Math.sin(b) * l);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.8)";
    ctx.lineWidth = size / 220;
    ctx.stroke();
  }
  // shadow on the far side, highlight on the near one
  const s = ctx.createRadialGradient(h * .65, h * .55, r * .5, h, h, r * 1.1);
  s.addColorStop(0, "rgba(60,90,140,0)");
  s.addColorStop(1, `rgba(60,90,140,${lump ? .12 : .28})`);
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  if (lump) return c.toDataURL();
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.beginPath();
  ctx.ellipse(h * .68, h * .58, r * .16, r * .09, -.6, 0, Math.PI * 2);
  ctx.fill();
  return c.toDataURL();
};
// The splash of a snowball hitting us in the face: a mass of snow with spikes thrown out all
// round, tipped with drops, and drops further out; shaded and grainy like the rest
const smSplashImage = size => {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d"), rnd = seeded(91), h = size / 2;
  const g = ctx.createRadialGradient(h * .92, h * .88, size * .02, h, h, h);
  [[0, "#ffffff"], [.45, "#f6f9fd"], [.75, "#e4ecf5"], [1, "#c6d4e5"]].forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  smLump(ctx, h, h, size * .25, .3, 18, rnd);
  ctx.fill();
  for (let i = 0; i < 30; i++) {  // the spikes, tapering, each ending in a drop
    const a = i / 30 * Math.PI * 2 + (rnd() - .5) * .18, L = size * (rnd() < .3 ? .26 + rnd() * .08 : .34 + rnd() * .14), w = size * (.02 + rnd() * .03);
    const d = [Math.cos(a), Math.sin(a)], p = [-d[1], d[0]], tip = [h + d[0] * L, h + d[1] * L];
    ctx.beginPath();
    ctx.moveTo(h + d[0] * size * .15 + p[0] * w * 2, h + d[1] * size * .15 + p[1] * w * 2);
    ctx.quadraticCurveTo(h + d[0] * L * .7 + p[0] * w * .5, h + d[1] * L * .7 + p[1] * w * .5, tip[0], tip[1]);
    ctx.quadraticCurveTo(h + d[0] * L * .7 - p[0] * w * .5, h + d[1] * L * .7 - p[1] * w * .5, h + d[0] * size * .15 - p[0] * w * 2, h + d[1] * size * .15 - p[1] * w * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tip[0], tip[1], w * .75, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 40; i++) {  // drops thrown further out
    const a = rnd() * Math.PI * 2, r = size * (.3 + rnd() * .19);
    ctx.beginPath();
    ctx.arc(h + Math.cos(a) * r, h + Math.sin(a) * r, size * (.004 + rnd() * .012), 0, Math.PI * 2);
    ctx.fill();
  }
  // on the snow only: grain, and a shade growing towards the edges
  ctx.globalCompositeOperation = "source-atop";
  for (let i = 0; i < size * 10; i++) {
    ctx.fillStyle = rnd() < .5 ? "rgba(255,255,255,.75)" : "rgba(110,140,185,.2)";
    const sz = size / 500 * (.6 + rnd() * 1.6);
    ctx.fillRect(rnd() * size, rnd() * size, sz, sz);
  }
  const e = ctx.createRadialGradient(h, h, size * .2, h, h, h);
  e.addColorStop(0, "rgba(70,100,150,0)");
  e.addColorStop(1, "rgba(70,100,150,.3)");
  ctx.fillStyle = e;
  ctx.fillRect(0, 0, size, size);
  return c.toDataURL();
};
let smImages = null;
const smSnowImages = () => smImages || (smImages = {
  ball: smSnowImage(768, 5, .1, 20, 9),
  clump: smSnowImage(384, 61, .55, 11, 0, true),
  splash: smSplashImage(1024),
  lumps: [smSnowImage(384, 11, .7, 15, 3, true), smSnowImage(384, 23, .8, 13, 2, true), smSnowImage(384, 37, .65, 17, 3, true)],
});

// Enough: he turns to us, packs a snowball and throws it, in our face
const smThrow = async () => {
  smBusy = true;
  const gen = smGen, stale = () => gen !== smGen, k = smK();
  snowman.classList.add("hold");
  smSays("That's it!", 1400);
  // facing us: the face slides to the middle of his head, the nose points at us (seen short)
  const face = smAnimate(smFace, [{ transform: "none" }, { transform: "translateX(-14px)" }], { duration: 400, fill: "forwards", easing: "ease-out" });
  const nose = smAnimate(smNose, [{ transform: "none" }, { transform: "scaleX(.45)" }], { duration: 400, fill: "forwards", easing: "ease-out" });
  const imgs = smSnowImages();
  await smWait(600);
  if (stale()) return;
  if (smStill()) { smFreeze(innerWidth / 2, innerHeight / 2, gen); return smThrowEnd(gen, face, nose); }
  // He bends down to his right and scoops snow from his own belly with his hand (it leaves a
  // hollow there), stands up again with a loose handful, and packs it in three squeezes: each one
  // makes it rounder, smaller and harder, crumbs falling off.
  smSays("Heh heh heh…", 2400);
  const D = Math.ceil(Math.max(innerWidth, innerHeight) * 1.15), d0 = 34 * k;
  const ball = smExtra("img", "xbig"), clump = smExtra("img", "xclump");
  ball.src = imgs.ball;
  clump.src = imgs.clump;
  ball.style.width = ball.style.height = clump.style.width = clump.style.height = `${D}px`;
  ball.style.opacity = clump.style.opacity = 0;
  const put = (el, x, y, s, sx = 1, sy = 1, rot = 0) => {
    el.style.transform = `translate(${f1(x - D / 2)}px,${f1(y - D / 2)}px) rotate(${f1(rot)}deg) scale(${(s * sx).toFixed(4)},${(s * sy).toFixed(4)})`;
  };
  const putBall = (x, y, s, sx, sy, rot) => put(ball, x, y, s, sx, sy, rot);
  const crumbs = smParticles("xpack");
  const held = () => { const H = smHand(); return [H[0], H[1] - 9 * k]; };  // what he holds sits on his hand
  // the arm angle that puts his hand on the scoop, for a bend: the hand turns by arm + bend
  const SCOOP = [229, 361], BEND = 30;
  const S = smTurn(SM_SHOULDER, SM_WAIST, BEND), v0 = Math.atan2(SM_HAND[1] - SM_SHOULDER[1], SM_HAND[0] - SM_SHOULDER[0]);
  const ARM = (Math.atan2(SCOOP[1] - S[1], SCOOP[0] - S[0]) - v0) * 180 / Math.PI - BEND;
  await smTween(700, t => { const e = smEase(t); smSetBend(BEND * e); smSetArm(ARM * e); });
  if (stale()) return;
  // scooping: the hand digs twice, snow sprays, the hollow opens, a handful comes up
  smNoise(260, 900, 400, .2);
  await smTween(800, t => {
    smSetArm(ARM + 7 * Math.sin(t * Math.PI * 4));
    smDent.style.opacity = Math.min(1, t * 1.4).toFixed(2);
    const [x, y] = held();
    if (Math.random() < .45) crumbs.add(x, y + 6 * k, 2, 140, 160, 2.6 * k, .8);
    clump.style.opacity = Math.min(1, t * 2).toFixed(2);
    put(clump, x, y, d0 * 1.35 / D * Math.min(1, .3 + t));
  });
  if (stale()) return;
  // up again, the handful in front of his chest (a few crumbs dropping)
  await smTween(650, t => {
    const e = smEase(t);
    smSetBend(BEND * (1 - e));
    smSetArm(smLerp(ARM, 26, e));
    const [x, y] = held();
    if (Math.random() < .15) crumbs.add(x, y + 8 * k, 1, 40, 0, 2.2 * k, 1);
    put(clump, x, y, d0 * 1.35 / D);
  });
  if (stale()) return;
  // three squeezes: the loose snow becomes a hard ball
  const pats = [.18, .5, .82];
  let patted = 0;
  await smTween(1600, t => {
    const [x, y] = held();
    if (patted < pats.length && t >= pats[patted]) {
      patted++;
      smNoise(150, 800, 260, .3);
      crumbs.add(x, y, 9 - patted * 2, 170, 60, 2.8 * k, .9);
    }
    const q = pats.reduce((m, p) => Math.max(m, 1 - Math.min(1, Math.abs(t - p) * 12)), 0);  // squeezing now
    const done = Math.min(1, patted / 3 + q * .1), size = d0 * (1.35 - .35 * done) / D;
    smSetArm(26 + 9 * q);
    clump.style.opacity = (1 - done).toFixed(2);
    ball.style.opacity = Math.min(1, done * 1.3).toFixed(2);
    put(clump, x, y, size, 1 + .16 * q, 1 - .16 * q, t * 20);
    putBall(x, y, size, 1 + .16 * q, 1 - .16 * q, t * 20);
  });
  smDrop(clump);
  ball.style.opacity = 1;
  if (stale()) return;
  // the wind-up, the ball in his hand raised over his shoulder, then the throw
  await smTween(650, t => { smSetArm(26 - 88 * smEase(t)); const [x, y] = held(); putBall(x, y, d0 / D); });
  if (stale()) return;
  smSays("Take that!", 1400);
  await smWait(140);
  await smTween(120, t => { smSetArm(-62 + 70 * t * t); const [x, y] = held(); putBall(x, y, d0 / D); });
  if (stale()) return;
  smAnimate(smArm, [{ transform: "rotate(8deg)" }, { transform: "rotate(48deg)" }, { transform: "rotate(0)" }], { duration: 500, easing: "ease-out" });
  smSetArm(0);
  // the flight, towards our eyes. It grows by the same factor each instant (so it keeps growing,
  // and growing, and growing), slowly at first, until it is far bigger than the window. Seen in
  // perspective its distance z is 1 / its size: its place comes to the middle of the window as z
  // (half true perspective, half straight at us, so it heads for our eyes all the way). It spins,
  // and arcs up a little.
  smDrop(crumbs.cv);
  const s0 = d0 / D, sEnd = 2.6, [x0, y0] = held(), x1 = innerWidth / 2, y1 = innerHeight * .46;
  smNoise(1500, 500, 2600, .5, "swell");
  await smTween(1500, t => {
    const s = s0 * Math.pow(sEnd / s0, Math.pow(t, 1.4)), z = s0 / s;
    const f = (1 - t) * (.5 + .5 * Math.min(1, (1 - t) / z)), lift = 160 * k * t * (1 - t) / z * (1 - t);
    putBall(x1 + (x0 - x1) * f, y1 + (y0 - y1) * f - lift, s, 1, 1, t * 300);
  });
  smDrop(ball);
  if (stale()) return;
  smImpact(gen, imgs);
  smFreeze(x1, y1, gen);
  smThrowEnd(gen, face, nose);
};
const smThrowEnd = async (gen, face, nose) => {
  smMad = 0;
  smPaintMad();
  smSays("Ha ha! ❄", 2200);
  // the laugh: a few hops, then back to his three-quarter pose
  smAnimate(smSvg, [{ transform: "none" }, { transform: "translateY(-6px)" }, { transform: "none" }, { transform: "translateY(-5px)" }, { transform: "none" }], { duration: 900, delay: 600 });
  await smWait(2400);
  if (gen !== smGen) return;
  if (face) face.reverse();
  if (nose) nose.reverse();
  await smWait(450);
  if (gen !== smGen) return;
  if (face) face.cancel();
  if (nose) nose.cancel();
  snowman.classList.remove("hold");
  smBusy = false;
  setTimeout(() => { if (gen === smGen) smDent.style.opacity = 0; }, 9000);  // the hollow fills again
};
// In the eyes: a thud and a splash. The snow bursts over the whole window (a splash with spikes
// all round, slammed on and shaking), spray flying off its edges, then it breaks up into lumps
// stuck on the glass that slide down it one by one, the middle first, while we blink twice.
const smImpact = (gen, imgs) => {
  smNoise(450, 300, 80, .9);
  smNoise(320, 2600, 700, .45);
  const W = innerWidth, H = innerHeight, cx = W / 2, cy = H * .46, S = Math.max(W, H) * 1.05;  // its spikes reach the edges
  const white = smExtra("div", "ximpact");
  smAnimate(white, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" });
  const splash = smExtra("img", "xsplash");
  splash.src = imgs.splash;
  splash.style.width = splash.style.height = `${f1(S)}px`;
  const at = (dx, dy, sc) => `translate(${f1(cx - S / 2 + dx)}px,${f1(cy - S / 2 + dy)}px) scale(${sc})`;
  splash.style.transform = at(0, 0, 1);
  smAnimate(splash, [
    { transform: at(0, 0, 1.3), opacity: 1 }, { transform: at(14, -10, .97), opacity: 1, offset: .05 },
    { transform: at(-10, 8, 1.01), opacity: 1, offset: .1 }, { transform: at(6, -4, 1), opacity: 1, offset: .15 },
    { transform: at(0, 0, 1), opacity: 1, offset: .5 }, { transform: at(0, H * .04, 1.02), opacity: 0 },
  ], { duration: 1200, easing: "ease-out", fill: "forwards" });
  const spray = smParticles("xspray");
  for (let i = 0; i < 6; i++) spray.add(cx + (Math.random() - .5) * W * .3, cy + (Math.random() - .5) * H * .3, 24, 2200, 0, 9, .7, 700, .08);
  const L = Math.max(W, H) * .42, spots = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) spots.push([(i + .5) / 4 * W, (j + .5) / 3 * H]);
  spots.push([W / 2, H / 2], [W * .35, H * .55], [W * .62, H * .4]);
  spots.forEach(([x, y], i) => {
    const lump = smExtra("img", null);
    lump.className = "xlump";
    lump.src = imgs.lumps[i % 3];
    const s = L * (.8 + Math.random() * .6), r = Math.random() * 360, jx = (Math.random() - .5) * L * .4, jy = (Math.random() - .5) * L * .4;
    lump.style.width = lump.style.height = `${f1(s)}px`;
    const pos = (dy, sc) => `translate(${f1(x + jx - s / 2)}px,${f1(y + jy - s / 2 + dy)}px) rotate(${f1(r)}deg) scale(${sc})`;
    lump.style.transform = pos(0, 1);
    // the splash breaks up into them; then the middle ones go first (we see again), the edges last
    const edge = Math.hypot(x - W / 2, y - H / 2) / Math.hypot(W / 2, H / 2), hold = 1100 + edge * 1800 + Math.random() * 600, all = hold + 1500 + Math.random() * 1200;
    smAnimate(lump, [
      { transform: pos(0, 1.1), opacity: 0 }, { transform: pos(0, 1.1), opacity: 0, offset: 550 / all }, { transform: pos(0, 1), opacity: 1, offset: 800 / all },
      { transform: pos(H * .06, 1), opacity: 1, offset: hold / all },
      { transform: pos(H * .7, .9), opacity: 0 },
    ], { duration: all, easing: "ease-in", fill: "forwards" });
  });
  // two blinks: eyelids closing over the window
  const lids = smExtra("div", "xlids");
  lids.innerHTML = "<i></i><i></i>";
  const blink = { duration: 340, easing: "ease-in-out" };
  lids.querySelectorAll("i").forEach((lid, i) => {
    const shut = i ? "translateY(-92%)" : "translateY(92%)";
    smAnimate(lid, [{ transform: "none" }, { transform: shut }, { transform: "none" }], { ...blink, delay: 1100 });
    smAnimate(lid, [{ transform: "none" }, { transform: shut }, { transform: "none" }], { ...blink, delay: 1750 });
  });
  setTimeout(() => {
    if (gen !== smGen) return;
    [white, splash, lids, spray.cv].forEach(smDrop);
    document.querySelectorAll(".xlump").forEach(smDrop);
  }, 7000);
};

// The frost and the blurred view, then the frozen pointer
const smFreeze = (x, y, gen) => {
  const frost = smExtra("div", "xfrost"), blur = smExtra("div", "xblur");
  const melt = SM_FREEZE_MS + 2500;
  if (smStill()) frost.style.opacity = 1;
  else {
    smAnimate(frost, [{ opacity: 0 }, { opacity: 1, offset: .03 }, { opacity: 1, offset: SM_FREEZE_MS / melt }, { opacity: 0 }], { duration: melt, fill: "forwards" });
    smAnimate(blur, [{ opacity: 1 }, { opacity: 1, offset: .2 }, { opacity: 0, offset: .55 }, { opacity: 0 }], { duration: melt, fill: "forwards" });
  }
  setTimeout(() => { if (gen === smGen) { smDrop(frost); smDrop(blur); } }, melt);
  if (!smStill() && matchMedia("(pointer: fine)").matches) smSlowPointer(x, y, melt, gen);
};
const smSlowPointer = (x, y, ms, gen) => {
  const sheet = smExtra("div", "xfreeze"), icy = smExtra("div", "xcursor");
  icy.innerHTML = '<svg viewBox="0 0 26 34" width="26" height="34"><path d="M2,2V27L8.5,21 13,31.5 17.5,29.5 13,19.5H22Z" fill="#e3f6ff" stroke="#3d8fc4" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M5,9 8,12M5,15 9,17M10,21 11,25" stroke="#9fd4f2" stroke-width="1.2" stroke-linecap="round"/><path d="M2,27v4M8.5,21l1,4" stroke="#bfe6fb" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const pos = (smMouse || [x, y]).slice(), t0 = performance.now();
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
  if (smMeltRaf) cancelAnimationFrame(smMeltRaf);
  smLoop = smMeltRaf = null;
  clearTimeout(smPress);
  smPress = null;
  smMad = smMelt = 0;
  smBusy = smHatUp = smMelting = smMelted = smDancing = false;
  smTune = "";
  smPaintMelt();
  smSetArm(0);
  smSetBend(0);
  smDent.style.opacity = 0;
  smMegaStop();
  smBox = null;
  snowman.classList.remove("noseless", "hold", "mad1", "mad2", "laughing", "sweaty", "badtime");
  smSay.classList.remove("on");
};
document.addEventListener("christmas", e => { if (!e.detail) smReset(); else smBox = null; });
