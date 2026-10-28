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
