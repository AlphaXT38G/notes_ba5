// The effects canvas: one full-screen, click-through canvas and one animation loop for what the
// screens draw (the metal show's lightning, chains, fire and silhouettes, the epic blue fire,
// the Christmas snow, the calm night's stars and fireflies). One canvas is much lighter than
// dozens of animated elements. The loop only runs while a screen that has layers is on, the
// browser pauses it in background tabs, and each step is capped at 50 ms, so nothing piles up
// while the page is hidden. Each effect registers {mode, update(dt), draw(ctx), reset(), optional
// resize()} where mode is the <body> class of its screen; only the layers of the current mode
// (fxMode) run. The canvas keeps its first id, #metalfx: it was the metal show's.
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

const blob = (r, g, b, a) => {
  const s = document.createElement("canvas"), sc = s.getContext("2d");
  s.width = s.height = 64;
  const grad = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`); grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  sc.fillStyle = grad; sc.fillRect(0, 0, 64, 64);
  return s;
};

// Run the effects of the current screen: when a screen whose <body> class has layers registered
// (fxLayers with that mode) starts, the canvas and its loop start; they stop when it ends.
const setFx = () => {
  const mode = [...document.body.classList].find(c => fxLayers.some(layer => layer.mode === c)) || null;
  fxStop();
  fxMode = mode;
  if (mode && !matchMedia("(prefers-reduced-motion: reduce)").matches) fxStart();
};
document.addEventListener("phase", setFx);
