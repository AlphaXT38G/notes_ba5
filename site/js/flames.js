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
  } else layer.textContent = "";  // drop the flames still rising, right away
  try { localStorage.setItem("fire", on ? "1" : ""); } catch (e) {}
};
// 20 clicks on the flame button within a minute start the metal takeover (easter egg, see
// startMetalEgg in metal.js); the clicks counted are the ones of the last 60 s.
// In the jazz bar, at Christmas and at Halloween the button is still there but lights no flames
// (too heavy on top of the screen): it only gives a little puff and counts towards the 20 clicks.
const fireClicks = [];
fireBtn.addEventListener("click", () => {
  if (["night", "christmas", "halloween"].some(c => document.body.classList.contains(c))) {
    fireBtn.animate([{ transform: "scale(1)" }, { transform: "scale(1.25) rotate(-8deg)" }, { transform: "scale(1)" }], { duration: 200 });
  } else setFire(!document.body.classList.contains("fire"));
  const now = Date.now();
  fireClicks.push(now);
  while (fireClicks[0] < now - 60000) fireClicks.shift();
  if (fireClicks.length === 10) preloadRiff();  // halfway: get the song ready (see metal.js)
  if (fireClicks.length >= 20) {
    fireClicks.length = 0;
    startMetalEgg();
  }
});
try { if (localStorage.getItem("fire")) setFire(true); } catch (e) {}

