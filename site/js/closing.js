// ── Closing time (screen "closing", the jazz bar from 0:45 to 1:00) ──────────────────────────
// Once the neon sign has gone dark letter by letter (jazz.js, jazz.css), the bartender comes over
// the whole page to say the bar is closing (css/closing.css): the room darkens and he rises from
// the bottom of the screen, life-size behind his bar, under a hanging lamp that swings as it comes
// down, and taps the desk bell for last call, then tells you the bar is closing, with a chalkboard
// of what to know. "Good night": two more taps, he nods and goes down; any other phase sends him
// away at once.
//
// He is a photo (the Gigachad photo, dressed as a bartender by an image generator), cut into layers
// by tools/bartender/ and stacked in .bt, all at the size of the photo: the desk bell, his right
// forearm and hand (on the left of the picture), his body, the bar counter in front of him, and
// his head. The joints move (css/closing.css): the head nods while he talks, the forearm lifts and
// drops on the bell to ring it, the chest breathes. The images (site/img/bartender/, copied to
// dist/img/ by the build) are only loaded when the bar starts closing.
const BT_LAYERS = ["bell", "forearm", "body", "counter", "head"];
const BARTENDER = `<div class="bt" aria-hidden="true">${BT_LAYERS.map(n => `<img class="${n}" alt="" data-src="img/bartender/${n}.webp">`).join("")}</div>`;

const closing = document.createElement("div");
closing.id = "closing";
// The lamp hangs right above his head (.who holds him and the lamp, so it follows him
// at any screen size), its light falling on him
closing.innerHTML = `<div class="shade"></div><div class="stage"><div class="who">${BARTENDER}` +
  '<div class="lamp"><div class="swing"><i class="cord"></i><i class="glow"></i><i class="cap"></i><i class="bulb"></i></div></div></div>' +
  '<div class="talk"><p class="bubble"></p><div class="board"><h2>Closing time</h2><ul>' +
  '<li>🕐 <span class="left"></span></li><li>🍸 Last orders: served</li><li>🎷 Reopens at 21:30<span class="reopen"></span></li></ul>' +
  '<button type="button" class="night-btn">Good night 👋</button></div></div></div>';
const bubble = closing.querySelector(".bubble"), board = closing.querySelector(".board");
// Load his layers (once): the bar starts closing about 9 s before he comes up
const loadBartender = () => closing.querySelectorAll(".bt img[data-src]").forEach(img => { img.src = img.dataset.src; delete img.dataset.src; });

// The chalkboard tells how long is left before 1:00, live, when the clock is in the closing slot
// (a forced ?night=closing or the armstrong code can show it at any time: then no countdown),
// and when the bar reopens
const paintBoard = () => {
  const t = clockSeconds(), inSlot = t >= 45 * 60 && t < 3600;
  const left = 3600 - t, reopen = (21 * 3600 + 30 * 60 - t + 86400) % 86400;
  board.querySelector(".left").textContent = inSlot ? `Closing at 1:00, ${Math.floor(left / 60)} min ${String(left % 60).padStart(2, "0")} s left` : "The bar is closing";
  board.querySelector(".reopen").textContent = reopen ? ` (in ${Math.floor(reopen / 3600)} h ${String(Math.floor(reopen / 60) % 60).padStart(2, "0")})` : "";
};
everySecond.push(() => { if (closing.isConnected) paintBoard(); });
// Last call: he taps the desk bell (css/closing.css, .ring: one tap every TAP s, the hand
// landing at TAP_HIT of it). Each tap is a "ding" made with the Web Audio API (no file to load):
// a small brass dome struck once, a sum of inharmonic partials that ring on and die away, the
// high ones faster. Browsers only allow sound after a user gesture: without one it is silent.
const TAP = .42, TAP_HIT = .7;
const ringBell = (taps = 3) => {
  if (!(navigator.userActivation && navigator.userActivation.hasBeenActive) || !window.AudioContext) return;
  const ac = new AudioContext(), out = ac.createGain();
  out.gain.value = .3;
  out.connect(ac.destination);
  for (let i = 0; i < taps; i++) {
    const t = ac.currentTime + (i + TAP_HIT) * TAP;
    [[1, .5], [2.32, .22], [4.25, .1], [6.8, .04]].forEach(([ratio, level], k) => {
      const osc = ac.createOscillator(), env = ac.createGain();
      osc.frequency.value = 2350 * ratio;
      env.gain.setValueAtTime(.0001, t);
      env.gain.exponentialRampToValueAtTime(level, t + .002);
      env.gain.exponentialRampToValueAtTime(.0001, t + 2.4 / (1 + k * 1.5));
      osc.connect(env).connect(out);
      osc.start(t);
      osc.stop(t + 2.5);
    });
  }
  setTimeout(() => ac.close(), (taps * TAP + 3) * 1000);
};

// What he says, typed letter by letter in his speech bubble while he nods (.talking)
const CLOSING_WORDS = ["Mesdames, messieurs… on ferme !", "Rentrez bien. Le jazz reprend demain soir, 21h30."];
const say = (lines, done) => {
  const [text, ...rest] = lines, line = [...text], span = document.createElement("span");  // [...]: emoji stay whole
  bubble.append(span);
  closing.classList.add("talking");
  let n = 0;
  const type = () => {
    span.textContent = line.slice(0, ++n).join("");
    if (n < line.length) return later(line[n - 1].match(/[,.…!]/) ? 260 : 38, type);  // breathes at punctuation
    closing.classList.remove("talking");
    if (rest.length) later(650, () => say(rest, done)); else if (done) done();
  };
  type();
};

// The scene, step by step: timers are kept so that leaving the bar cancels whatever is planned
let closingTimer = null, sceneTimers = [];
const later = (ms, fn) => sceneTimers.push(setTimeout(fn, ms));
// With reduced motion he is simply there, everything said at once, and leaves at once.
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const closeBar = () => {  // he arrives once the last letter of the sign (and the sax) is off
  closing.className = "";
  bubble.textContent = "";
  bubble.classList.remove("on");
  board.classList.remove("on");
  paintBoard();
  document.body.append(closing);
  if (calm()) {
    bubble.innerHTML = CLOSING_WORDS.map(w => `<span>${w}</span>`).join("");
    bubble.classList.add("on");
    board.classList.add("on");
    return;
  }
  later(1500, () => { closing.classList.add("ring"); ringBell(3); });  // up behind his bar, he rings
  later(1500 + 3 * TAP * 1000, () => closing.classList.remove("ring"));
  later(2900, () => { bubble.classList.add("on"); say(CLOSING_WORDS, () => board.classList.add("on")); });
};
const leaveBar = () => {
  clearTimeout(closingTimer);
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  closing.remove();
};
// Good night: the button, a click anywhere or Escape. He taps the bell twice, says good night, then
// goes back down, the lamp goes up and the room comes back.
const byeBar = () => {
  if (!closing.isConnected || closing.classList.contains("bye")) return;
  if (calm()) return leaveBar();
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  closing.classList.remove("ring", "talking");
  closing.classList.add("bye");
  bubble.textContent = "";
  bubble.classList.add("on");
  ringBell(2);
  say(["Bonne nuit ! 👋"]);
  later(1500, () => closing.classList.add("gone"));
  later(2700, leaveBar);
};
closing.addEventListener("click", byeBar);
document.addEventListener("keydown", e => { if (e.key === "Escape") byeBar(); });
document.addEventListener("phase", e => {
  leaveBar();
  if (e.detail !== "closing") return;
  loadBartender();
  closingTimer = setTimeout(closeBar, (1 + (titleText.length + 1) * .7 + .5) * 1000);
});
