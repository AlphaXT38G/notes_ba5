// ── Halloween screamer ────────────────────────────────────────────────────────────────────────
// The worst surprise of the Halloween screens (halloween.js), over everything: rarely, without
// warning, a zombie (img/screamer.webp) bursts out of the top left corner and lunges at us until
// it fills the window, shaking, for about a second, with a zombie's scream, very loud (Web Audio,
// only once the page has had a gesture: a thump, a roar, a trembling shriek and rasping breath,
// driven into saturation). Not in the first 3 minutes of the screen, then about one minute in
// fifteen, never twice within 12 minutes, never while the search field is used or the tab is
// hidden, never with reduced motion. Typing candy (or hwScream() in the console) shows it at once.
// The photo is loaded with the screen, so it is there, decoded, the moment it jumps; only its
// transform is animated.
const hwScreamer = document.createElement("div"), hwZombie = new Image();
hwScreamer.id = "hwscream";
hwScreamer.setAttribute("aria-hidden", "true");
hwZombie.alt = "";
hwScreamer.append(hwZombie);
// The zombie's scream, as loud as the page can make it, on the edge of saturation: a thump as it
// lands, a roar from deep in its throat (a rough low voice, shaken), a shriek of three detuned
// voices trembling fast and rising, and a burst of rasping breath; all of it driven through a
// hard clipper, so it comes out full and torn
const hwScreech = () => {
  const ac = hwAudioCtx();
  if (!ac || !screenGesture()) return;
  const t = ac.currentTime, end = t + 1.5, bus = ac.createGain(), clip = ac.createWaveShaper(), out = ac.createGain();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) curve[i] = Math.tanh((i / 511.5 - 1) * 5);
  clip.curve = curve;
  bus.gain.value = 1.4;
  out.gain.setValueAtTime(1, t);
  out.gain.setValueAtTime(1, end - .35);
  out.gain.exponentialRampToValueAtTime(.001, end);
  bus.connect(clip).connect(out).connect(ac.destination);
  const osc = (type, freqs, gain) => {  // a voice: its pitch through [time, Hz] points, its loudness
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    freqs.forEach(([dt, f], i) => i ? o.frequency.exponentialRampToValueAtTime(f, t + dt) : o.frequency.setValueAtTime(f, t + dt));
    g.gain.value = gain;
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(end);
    return o;
  };
  const shake = (o, rate, depth) => {  // a fast tremble of its pitch
    const lfo = ac.createOscillator(), d = ac.createGain();
    lfo.frequency.value = rate;
    d.gain.value = depth;
    lfo.connect(d).connect(o.frequency);
    lfo.start(t);
    lfo.stop(end);
  };
  osc("sine", [[0, 90], [.3, 32]], 1);  // the thump
  shake(osc("sawtooth", [[0, 130], [.2, 190], [1.2, 90]], .7), 31, 25);  // the roar
  for (const detune of [.97, 1, 1.04]) {  // the shriek
    const o = osc("sawtooth", [[0, 700 * detune], [.18, 1250 * detune], [.8, 1400 * detune], [1.4, 650 * detune]], .35);
    shake(o, 17 + detune * 4, 70);
  }
  const n = Math.round(ac.sampleRate * 1.4), buf = ac.createBuffer(1, n, ac.sampleRate), data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const breath = ac.createBufferSource(), rasp = ac.createBiquadFilter(), g = ac.createGain();
  breath.buffer = buf;
  rasp.type = "bandpass";
  rasp.frequency.value = 1800;
  rasp.Q.value = .7;
  g.gain.value = .8;
  breath.connect(rasp).connect(g).connect(bus);
  breath.start(t);
};
let hwScreamAt = 0, hwScreenSince = 0;
const hwScream = () => {
  hwScreamAt = Date.now();
  if (!hwZombie.src) hwZombie.src = "img/screamer.webp";
  document.body.append(hwScreamer);
  hwScreech();
  setTimeout(() => hwScreamer.remove(), 1100);
};
everySecond.push(() => {
  if (!hwOn) return;
  const now = Date.now();
  if (hwStill() || document.hidden || now - hwScreenSince < 180000 || now - hwScreamAt < 720000) return;
  if (document.activeElement && document.activeElement.matches("input")) return;
  if (Math.random() < 1 / 900) hwScream();  // about once in 15 minutes
});
// Typing s c r e a m (or in the search field then Enter: onCode, ui.js) brings it at once, on the
// Halloween screens only
onCode("candy", () => { if (hwOn) hwScream(); });
hwPart({
  on() {
    hwScreenSince = Date.now();
    if (!hwStill()) hwZombie.src = "img/screamer.webp";  // loaded ahead, so it jumps at once
  },
  off() { hwScreamer.remove(); },
});
