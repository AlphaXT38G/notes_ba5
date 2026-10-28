// ── Halloween werewolf ────────────────────────────────────────────────────────────────────────
// Now and then (every one to three minutes), a werewolf walks along the far hill on the left of
// the Halloween screens (halloween.js), in silhouette like the castle: in from the left
// edge of the window to the edge of the courses (never behind them), then back.
// It is a photo cut into layers at its joints (img/werewolf/, made by tools/werewolf/cut.py: body,
// head, both arms, both legs, tail), all at the photo's size so they stack exactly, each turned
// about its joint in CSS (transforms only): the legs stride, the arms swing, the tail sways, the
// body bobs, and the head is carried low, looking ahead.
// Where it stops, at night, it straightens up, throws its head back to the moon and howls (a
// recorded wolf, through Web Audio, once the page has had a gesture); by day it only sniffs the
// air. Reduced motion: it never comes.
const HW_WOLF_PARTS = ["tail", "leg-r", "arm-r", "body", "leg-l", "head", "arm-l"];  // back to front
const hwWolf = document.createElement("div");
hwWolf.id = "hwwolf";
hwWolf.innerHTML = `<div class="fig">${HW_WOLF_PARTS.map(p => `<img class="${p}" alt="" src="img/werewolf/${p}.png">`).join("")}</div>`;
let hwWolfWalk = null, hwWolfIn = 40, hwWolfTimers = [];
// A space the size of a hillside: a long tail of noise fading away, the hills sending the howl back
let hwWolfHills = null;
const hwHillsVerb = ac => {
  if (hwWolfHills) return hwWolfHills;
  const n = Math.round(ac.sampleRate * 3), ir = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  }
  hwWolfHills = ac.createConvolver();
  hwWolfHills.buffer = ir;
  hwWolfHills.connect(ac.destination);
  return hwWolfHills;
};
// The howl: a recorded wolf (audio/wolf.mp3), its second howl, the whole one (from 7.6 s, 5 s
// long: it rises, holds its note and falls away), faded in and out, heard close and through the
// hills; the same howl, a little lower and far away, answers it. The file is decoded once, the
// first time it is needed.
const HW_HOWL = { at: 7.6, length: 5 };
let hwHowlBuf = null;
const hwHowlLoad = ac => {
  if (hwHowlBuf) return hwHowlBuf;
  hwHowlBuf = fetch("audio/wolf.mp3").then(r => r.arrayBuffer())
    .then(data => new Promise((ok, no) => ac.decodeAudioData(data, ok, no)));
  hwHowlBuf.catch(() => { hwHowlBuf = null; });
  return hwHowlBuf;
};
const hwHowlVoice = (ac, buf, at, rate, loud, wetness) => {
  const t = ac.currentTime + at, src = ac.createBufferSource(), env = ac.createGain(), wet = ac.createGain();
  const len = HW_HOWL.length / rate;
  src.buffer = buf;
  src.playbackRate.value = rate;
  env.gain.setValueAtTime(.0001, t);
  env.gain.exponentialRampToValueAtTime(loud, t + .15);
  env.gain.setValueAtTime(loud, t + len - .6);
  env.gain.exponentialRampToValueAtTime(.0001, t + len);
  wet.gain.value = wetness;
  src.connect(env);
  env.connect(ac.destination);
  env.connect(wet).connect(hwHillsVerb(ac));
  src.start(t, HW_HOWL.at, HW_HOWL.length);
};
const hwHowl = () => {
  const ac = hwAudioCtx();
  if (!ac || !screenGesture()) return;
  hwHowlLoad(ac).then(buf => {
    hwHowlVoice(ac, buf, 0, 1, .9, .45);
    hwHowlVoice(ac, buf, 2.2, .9, .12, 1.2);  // the answer, far away
  }, () => {});
};
// A walk: in from the left edge of the window to the edge of the courses, along the far hill; a
// pause there (at night it rears up and howls to the moon, by day it sniffs the air), then it
// turns round and walks back out. Not when there is no margin beside the courses to walk in.
// Its feet stay on the crest: a keyframe every 24 px puts them where the ridge is (hwRidgeY).
const hwWolfStep = (from, to, then) => {
  const w = hwWolf.offsetWidth, h = hwWolf.offsetHeight, n = Math.max(2, Math.ceil(Math.abs(to - from) / 24));
  const frames = Array.from({ length: n + 1 }, (_, i) => {
    const x = from + (to - from) * i / n;
    return { transform: `translate(${f1(x)}px,${f1(hwRidgeY(x + w / 2) - h * .97)}px)` };
  });
  hwWolfWalk = hwWolf.animate(frames, { duration: Math.abs(to - from) / 30 * 1000, easing: "linear", fill: "forwards" });
  hwWolfWalk.onfinish = then;
};
const hwWolfGo = () => {
  if (hwWolfWalk || hwStill() || document.hidden) return;
  hwWolf.classList.remove("back", "howl", "still");
  hwBack.append(hwWolf);
  const course = document.querySelector(".grid"), w = hwWolf.offsetWidth;
  const stop = (course ? course.getBoundingClientRect().left : 0) - w - 30;
  if (stop < 40) { hwWolf.remove(); return; }
  hwWolfStep(-w - 10, stop, () => {
    const night = hwNight();
    hwWolf.classList.add(night ? "howl" : "still");
    if (night) hwWolfTimers.push(setTimeout(hwHowl, 700));
    hwWolfTimers.push(setTimeout(() => {
      hwWolf.classList.remove("howl", "still");
      hwWolf.classList.add("back");
      hwWolfStep(stop, -w - 10, () => { hwWolf.remove(); hwWolfWalk = null; });
    }, night ? 5600 : 2500));
  });
};
everySecond.push(() => { if (hwOn && --hwWolfIn <= 0) { hwWolfGo(); hwWolfIn = 70 + Math.random() * 120; } });
hwPart({
  on() { hwWolfIn = 20 + Math.random() * 30; },
  off() {
    if (hwWolfWalk) { hwWolfWalk.cancel(); hwWolfWalk = null; }
    hwWolfTimers.forEach(clearTimeout);
    hwWolfTimers = [];
    hwWolf.remove();
  },
});
