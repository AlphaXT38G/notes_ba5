// ── The bard of the epic finale (body.epic) ───────────────────────────────────────────────────
// The finale's music player: a knight playing the lute, sitting in the grass against a mossy
// boulder by a campfire, a little pixel art painting in the bottom left corner (his scene is
// ray-marched in bardscene.js, css/bard.css). It replaces the metal show's amp when the finale
// takes over. The song's title is lettered in pixels in the bottom right corner of the painting.
// As the next tape waits in its case behind the day's cassette deck, the next song waits on an
// old parchment standing behind the painting, its name inked in pixels on the part that peeks out
// above the frame: clicking it changes the song. Clicking the knight plays / pauses.
// The finale has two songs (BARD_SONGS), each with its mood in the scene: the Two Steps From Hell
// mix (audio/epic.mp3: blue arcane fire, blue motes) and Dragonborn, the theme of Skyrim
// (audio/dragonborn.mp3: a red fire, a starry night, a dragon crossing the moon). When one ends
// the next one comes; the song chosen is remembered.
// Playing, he strums at the song's pace, nodding, his left hand moving along the neck; paused, he
// dozes, chin down, and the fire burns lower. A song change is a little show (bardNext): he stops
// and looks up at the fire, strums a flourish (a chord plucked with Web Audio), the fire is drawn
// in, then bursts in the new song's colour, a shock wave runs over the grass, the title dissolves
// pixel by pixel and the new one appears, the parchment dips behind the frame and comes back with
// the following song's name, and the new song starts. A click on the fire changes the song too.
// As the other screens' music, the song autoplays muted when the page has had no gesture yet, and
// the sound comes on at the first click or key press anywhere.
const BARD_SONGS = [
  { file: "epic.mp3", name: "Two Steps From Hell", mood: 0, tempo: 1.25,
    chord: [110, 164.81, 220, 261.63, 329.63] },  // A minor
  { file: "dragonborn.mp3", name: "Dragonborn", mood: 1, tempo: 1.55,
    chord: [73.42, 146.83, 220, 293.66, 349.23] },  // D minor
];
let bardSong = (() => {
  try { const i = Number(localStorage.getItem("epicSong")); if (BARD_SONGS[i]) return i; } catch (e) {}
  return 0;
})();
let epicRiff = null, epicPlaying = false, bardSoundAt = 0, bardFading = [];
const epicMuted = () => !!epicRiff && epicRiff.muted;

const bard = document.createElement("div");
bard.id = "bard";
bard.innerHTML = '<div class="stage"><canvas class="ui"></canvas><span class="flash"></span><span class="notes"></span></div>' +
  '<button type="button" class="slip"><canvas></canvas></button><button type="button" class="sr toggle"></button>' +
  '<span class="sr" aria-live="polite"></span>';
const bardStage = bard.querySelector(".stage"), bardUI = bard.querySelector(".ui"), bardUx = bardUI.getContext("2d");
const bardToggleBtn = bard.querySelector(".toggle"), bardNextBtn = bard.querySelector(".slip"), bardSay = bard.querySelector("span.sr");
let bardShown = bardSong;  // the song whose title is written (changed halfway through a change)
let bardHover = null;      // what the pointer is over: "fire", "knight" or null

const paintBard = () => {
  // the song that comes after the one shown: the parchment's (it changes while it is hidden)
  const song = BARD_SONGS[bardShown], next = BARD_SONGS[(bardShown + 1) % BARD_SONGS.length];
  const toggle = !epicPlaying ? "Play the music" : epicMuted() ? "Turn the sound on" : "Pause the music";
  bard.classList.toggle("mood-1", song.mood === 1);
  bardToggleBtn.textContent = `${toggle} (${song.name})`;
  bardNextBtn.title = `Next song: ${next.name}`;
  bardNextBtn.setAttribute("aria-label", bardNextBtn.title);
  if (bardSlipFor !== next) bardSlipArt(next);
  // the tooltip says what a click does where the pointer is
  bardStage.title = bardHover === "fire" ? `The fire: next song (${next.name})` : `The knight: ${toggle.toLowerCase()} · the fire: next song`;
};

// The songs: <audio> tracks of screens.js, not looped, the next one coming when one ends
const bardTrack = track => {
  track.addEventListener("ended", () => { if (track === epicRiff) bardNext(); });
  return track;
};
// Loaded as soon as "More epicness ?" is clicked (epic.js), paused, so it starts at once
const preloadEpic = () => { if (!epicRiff) epicRiff = bardTrack(preloadTrack(BARD_SONGS[bardSong].file, { loop: false })); };
const epicPlay = () => {
  if (!epicRiff) epicRiff = bardTrack(screenTrack(BARD_SONGS[bardSong].file, { loop: false, muted: !screenGesture() }));
  else epicRiff.play().catch(() => {});
  epicPlaying = true;
  paintBard();
};
const epicPause = () => {
  if (epicRiff) epicRiff.pause();
  epicPlaying = false;
  paintBard();
};
const epicSound = () => {  // unmute a song that autoplayed muted
  if (!epicMuted()) return;
  epicRiff.muted = false;
  bardSoundAt = performance.now();
  paintBard();
};
// The song that is left fades out in 0.7 s instead of stopping dead
const bardFade = track => {
  if (!track) return;
  bardFading.push(track);
  const v0 = track.volume, t0 = performance.now();
  const step = () => {
    const k = (performance.now() - t0) / 700;
    if (k >= 1 || !bardFading.includes(track)) {
      dropTrack(track);
      bardFading = bardFading.filter(t => t !== track);
      return;
    }
    track.volume = v0 * (1 - k);
    setTimeout(step, 40);
  };
  step();
};

// ── Sounds of a song change (Web Audio, made in a click so it may sound) ──
// The flourish: the chord of the new song plucked on the lute, string by string, twice (a
// Karplus-Strong string: a burst of noise fed back through a delay of one period, softened each
// time round, rings like a plucked string). The burst of the fire: a "whoomp" of filtered noise
// over a low thump.
let bardAudio = null;
const bardAudioReady = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!bardAudio && AC) try { bardAudio = new AC(); } catch (e) {}
  if (bardAudio && bardAudio.state === "suspended") bardAudio.resume().catch(() => {});
};
const bardPluck = (ac, freq, when, gain) => {
  const rate = ac.sampleRate, n = Math.max(2, Math.round(rate / freq)), len = Math.round(rate * 1.6);
  const buf = ac.createBuffer(1, len, rate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  for (let i = n; i < len; i++) d[i] = .4975 * (d[i - n] + d[Math.max(0, i - n - 1)]);
  const src = ac.createBufferSource(), warm = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = buf;
  warm.type = "lowpass"; warm.frequency.value = 2600;
  g.gain.value = gain;
  src.connect(warm); warm.connect(g); g.connect(ac.destination);
  src.start(when);
};
const bardChord = song => {
  const ac = bardAudio;
  if (!ac || ac.state !== "running") return;
  try {
    const t = ac.currentTime + .02;
    song.chord.forEach((f, i) => bardPluck(ac, f, t + i * .055, .16));                        // down
    song.chord.slice().reverse().forEach((f, i) => bardPluck(ac, f, t + .36 + i * .04, .11));  // and up
  } catch (e) {}
};
const bardWhoomp = () => {
  const ac = bardAudio;
  if (!ac || ac.state !== "running") return;
  try {
    const t = ac.currentTime, rate = ac.sampleRate;
    const noise = ac.createBuffer(1, Math.round(rate * 1.2), rate), d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), low = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noise;
    low.type = "lowpass";
    low.frequency.setValueAtTime(250, t); low.frequency.exponentialRampToValueAtTime(2400, t + .12); low.frequency.exponentialRampToValueAtTime(180, t + 1.1);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + .06); g.gain.exponentialRampToValueAtTime(.0001, t + 1.15);
    src.connect(low); low.connect(g); g.connect(ac.destination);
    src.start(t); src.stop(t + 1.2);
    const thump = ac.createOscillator(), tg = ac.createGain();
    thump.frequency.setValueAtTime(80, t); thump.frequency.exponentialRampToValueAtTime(32, t + .8);
    tg.gain.setValueAtTime(.0001, t); tg.gain.exponentialRampToValueAtTime(.5, t + .02); tg.gain.exponentialRampToValueAtTime(.0001, t + .9);
    thump.connect(tg); tg.connect(ac.destination);
    thump.start(t); thump.stop(t + 1);
  } catch (e) {}
};

// ── The painting: the values of bardscene.js, animated here ──
// Each frame (30 a second: pixel art needs no more) the values move towards what the knight is
// doing; a song change (swapStart) follows its own timeline, in seconds since it started:
//   0 - 0.35   he stops and looks up at the fire          1.2 - 1.45  the mood turns to the new song
//   0.35 - 1   a fast flourish on the strings             1.3 - 2.4   the shock wave runs out
//   0.9 - 1.25 the fire is drawn in, then bursts (1.3)    1.45        the new song starts, he plays
const BARD_SWAP = 2.6;
const bardVal = { uTime: 0, uMood: BARD_SONGS[bardSong].mood, uPlay: 0, uStrum: 0, uFret: 0, uPitch: -.5, uYaw: 0, uFlare: 0, uRing: 0 };
let bardScene = null, bardCanvas = null, bardRaf = 0, bardDrawn = 0, bardScale = 1, bardSlow = 0;
let strumPhase = 0, swapStart = -1, swapFrom = 0, bardTimers = [];
const bardStill = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const toward = (v, to, rate, dt) => v + (to - v) * Math.min(1, rate * dt);
const bardStep = (now, dt) => {
  const v = bardVal, song = BARD_SONGS[bardSong], s = swapStart < 0 ? -1 : (now - swapStart) / 1000;
  let play = epicPlaying ? 1 : 0, tempo = song.tempo, pitch, yaw;
  if (s >= 0) {
    play = s < .35 ? 0 : s < 1 ? 1 : s < 1.45 ? 0 : play;
    if (s < 1) tempo = 4.2;
  }
  v.uTime += dt;
  v.uPlay = toward(v.uPlay, play, 7, dt);
  strumPhase += dt * tempo * Math.PI * 2 * Math.min(1, v.uPlay * 3);
  // A stroke: quickly down across the strings, more slowly back up
  const sp = strumPhase % (Math.PI * 2);
  const stroke = sp < 1.6 ? Math.cos(sp / 1.6 * Math.PI) : -Math.cos((sp - 1.6) / (Math.PI * 2 - 1.6) * Math.PI);
  v.uStrum = toward(v.uStrum, stroke * v.uPlay, 25, dt);
  // The left hand moves to another chord every two strokes
  const chord = [0, .05, -.03, .07][Math.floor(strumPhase / (Math.PI * 4)) % 4];
  v.uFret = toward(v.uFret, chord * v.uPlay, 9, dt);
  // The head: on the fire during a change, nodding on the strokes while he plays, else dozing
  if (s >= 0 && s < 1.6) { pitch = .12; yaw = .6; }
  else if (epicPlaying) { pitch = -.32 + .08 * Math.sin(strumPhase); yaw = -.3; }
  else { pitch = -.62 + .03 * Math.sin(v.uTime * 1.7); yaw = -.05; }
  v.uPitch = toward(v.uPitch, pitch, 5, dt);
  v.uYaw = toward(v.uYaw, yaw, 4, dt);
  // The fire, its burst and the shock wave
  const mood = song.mood;
  if (s >= 0) {
    v.uMood = s < 1.2 ? swapFrom : s < 1.45 ? swapFrom + (mood - swapFrom) * (s - 1.2) / .25 : mood;
    v.uFlare = s < .9 ? toward(v.uFlare, 0, 4, dt) : s < 1.25 ? -.35 * (s - .9) / .35 : s < 1.35 ? -.35 + 1.35 * (s - 1.25) / .1 : Math.exp((1.35 - s) * 2.2);
    v.uRing = s > 1.3 && s < 2.4 ? (s - 1.3) / 1.1 : 0;
  } else {
    v.uMood = toward(v.uMood, mood, 3, dt);
    v.uFlare = toward(v.uFlare, epicPlaying ? 0 : -.15, 2, dt);
    v.uRing = 0;
  }
};
const bardRender = () => { if (bardScene) bardScene.render(bardVal); };
// The shader compiles in the background (bardscene.js), seconds on some systems: meanwhile the
// frame shows a plain night and "Tuning the lute…" (.tuning), and the painting fades in once it is
// ready; if it fails, the plain night stays (.flat)
const bardCheck = () => {
  const state = bardScene ? bardScene.ready() : "failed";
  bard.classList.toggle("tuning", state === "compiling");
  bard.classList.toggle("flat", state === "failed");
  return state;
};
const bardFrame = now => {
  bardRaf = requestAnimationFrame(bardFrame);
  const gap = now - bardDrawn;
  if (gap < 30) return;
  bardDrawn = now;
  const state = bardCheck();
  if (state === "compiling" || state === "failed") {  // the title still shows, over the plain night
    bardStep(now, Math.min(gap, 100) / 1000);
    bardUISize();
    bardDrawUI(now);
    return;
  }
  // Too slow (many frames well over 33 ms): fewer pixels from now on. Longer gaps are a hidden tab
  bardSlow = gap > 55 && gap < 250 ? bardSlow + 1 : Math.max(0, bardSlow - 1);
  if (bardSlow > 20 && bardScale > .5) { bardScale *= .8; bardSlow = 0; bardScene.resize(bardScale); }
  bardStep(now, Math.min(gap, 100) / 1000);
  bardRender();
  bardUISize();
  bardDrawUI(now);
};
const bardResize = () => {
  if (bardScene) { bardScene.resize(bardScale); bardRender(); }
  bardUISize();
  bardDrawUI(performance.now());
};
// The canvas and its scene are made once in the visit and kept, so that its shader compiles once:
// when "More epicness ?" shows up (epic.js), ahead of the finale, or when the finale starts.
// Without WebGL there is none: the frame shows a plain night drawn in CSS.
const bardWarm = () => {
  if (bardCanvas) return;
  bardCanvas = document.createElement("canvas");
  bardScene = createBardScene(bardCanvas);
};

// ── Pixel fonts, drawn by hand: a browser font shrunk to a few pixels and cut out turns to mush.
// Each letter is its rows of pixels ("#" inked), of its own width; letters are one pixel apart.
const bardFont = (src, height, space) => {
  const font = { " ": Array(height).fill(".".repeat(space)) };
  Object.keys(src).forEach(k => { font[k] = src[k].split(" "); });
  return font;
};
const bardGlyphOf = (font, ch) => font[ch] || font[" "];
const bardTextWidth = (font, text) => [...text].reduce((w, ch) => w + bardGlyphOf(font, ch)[0].length + 1, -1);
// A name in capitals, on two lines (as many words on each) when wider than max
const bardTextLines = (font, text, max) => {
  const words = text.toUpperCase().split(" "), one = words.join(" ");
  if (bardTextWidth(font, one) <= max || words.length < 2) return [one];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(" "), words.slice(half).join(" ")];
};
// Calls plot(x, y) for each inked pixel of a line written from its top left corner (x, y)
const bardWrite = (font, line, x, y, plot) => {
  [...line].forEach(ch => {
    const rows = bardGlyphOf(font, ch);
    rows.forEach((row, j) => [...row].forEach((v, i) => { if (v === "#") plot(x + i, y + j); }));
    x += rows[0].length + 1;
  });
};
// The title's: capitals five pixels high
const BARD_FONT_SMALL = bardFont({
  A: ".##. #..# #### #..# #..#", B: "###. #..# ###. #..# ###.", C: ".### #... #... #... .###",
  D: "###. #..# #..# #..# ###.", E: "#### #... ###. #... ####", F: "#### #... ###. #... #...",
  G: ".### #... #.## #..# .###", H: "#..# #..# #### #..# #..#", I: "### .#. .#. .#. ###",
  J: "..## ...# ...# #..# .##.", K: "#..# #.#. ##.. #.#. #..#", L: "#... #... #... #... ####",
  M: "#...# ##.## #.#.# #...# #...#", N: "#..# ##.# #.## #..# #..#", O: ".##. #..# #..# #..# .##.",
  P: "###. #..# ###. #... #...", Q: ".##. #..# #..# #.#. .#.#", R: "###. #..# ###. #.#. #..#",
  S: ".### #... .##. ...# ###.", T: "### .#. .#. .#. .#.", U: "#..# #..# #..# #..# .##.",
  V: "#...# #...# .#.#. .#.#. ..#..", W: "#...# #...# #.#.# ##.## #...#", X: "#..# #..# .##. #..# #..#",
  Y: "#.# #.# .#. .#. .#.", Z: "#### ...# .##. #... ####",
}, 5, 2);
// The parchment's: capitals seven pixels high (the title's would be too cramped there)
const BARD_FONT_INK = bardFont({
  A: ".###. #...# #...# ##### #...# #...# #...#", B: "####. #...# #...# ####. #...# #...# ####.",
  C: ".###. #...# #.... #.... #.... #...# .###.", D: "####. #...# #...# #...# #...# #...# ####.",
  E: "##### #.... #.... ####. #.... #.... #####", F: "##### #.... #.... ####. #.... #.... #....",
  G: ".###. #...# #.... #.### #...# #...# .####", H: "#...# #...# #...# ##### #...# #...# #...#",
  I: "### .#. .#. .#. .#. .#. ###", J: "..### ...#. ...#. ...#. ...#. #..#. .##..",
  K: "#...# #..#. #.#.. ##... #.#.. #..#. #...#", L: "#.... #.... #.... #.... #.... #.... #####",
  M: "#...# ##.## #.#.# #.#.# #...# #...# #...#", N: "#...# #...# ##..# #.#.# #..## #...# #...#",
  O: ".###. #...# #...# #...# #...# #...# .###.", P: "####. #...# #...# ####. #.... #.... #....",
  Q: ".###. #...# #...# #...# #.#.# #..#. .##.#", R: "####. #...# #...# ####. #.#.. #..#. #...#",
  S: ".#### #.... #.... .###. ....# ....# ####.", T: "##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..",
  U: "#...# #...# #...# #...# #...# #...# .###.", V: "#...# #...# #...# #...# #...# .#.#. ..#..",
  W: "#...# #...# #...# #.#.# #.#.# #.#.# .#.#.", X: "#...# #...# .#.#. ..#.. .#.#. #...# #...#",
  Y: "#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..", Z: "##### ....# ...#. ..#.. .#... #.... #####",
}, 7, 3);

// ── The title, lettered in pixels over the painting at its own resolution (each of its pixels one
// of the painting's), in the bottom right corner, as on the covers of those videos: capitals of the
// small font, a dark outline, a thin ornament above them in the fire's colour. During a song
// change it dissolves pixel by pixel and the new one appears the same way.
let bardTitle = null;  // the title's pixels, made once per song and size
const bardUIColour = () => BARD_SONGS[bardShown].mood ? [255, 92, 70] : [140, 180, 255];
// The title's pixels: the name, right-aligned (1), the ornament above it (2), and
// their outline (3): a lit pixel's neighbours. Too wide for the painting (phones), it goes on two
// lines.
const bardTitleArt = (song, W, H) => {
  const px = new Uint8Array(W * H), rnd = new Float32Array(W * H), font = BARD_FONT_SMALL;
  const lines = bardTextLines(font, song.name, W * .7);
  const put = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = v; };
  const right = W - 4, widest = Math.max(...lines.map(line => bardTextWidth(font, line)));
  let y = H - 4 - lines.length * 7 + 2;
  const oy = y - 3;
  lines.forEach(line => {
    bardWrite(font, line, right - bardTextWidth(font, line), y, (x, yy) => put(x, yy, 1));
    y += 7;
  });
  const ox = Math.round(right - widest * .7), cx = Math.round(right - widest * .35);
  for (let i = ox; i <= right; i++) put(i, oy, 2);  // a line, a diamond in its middle
  [[0, -1], [-1, 0], [1, 0], [0, 1]].forEach(([dx, dy]) => put(cx + dx, oy + dy, 2));
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const k = yy * W + xx;
    rnd[k] = Math.random();
    if (px[k]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ny = yy + dy, nx = xx + dx;
      if (ny >= 0 && ny < H && nx >= 0 && nx < W && (px[ny * W + nx] === 1 || px[ny * W + nx] === 2)) { px[k] = 3; break; }
    }
  }
  return { song, W, H, px, rnd, img: bardUx.createImageData(W, H) };
};
const bardDrawUI = now => {
  const W = bardUI.width, H = bardUI.height;
  if (!W || !H) return;
  const song = BARD_SONGS[bardShown], rgb = bardUIColour();
  if (!bardTitle || bardTitle.song !== song || bardTitle.W !== W || bardTitle.H !== H) bardTitle = bardTitleArt(song, W, H);
  // How much of the title shows: all of it, or dissolving / appearing during a change
  const s = swapStart < 0 ? -1 : (now - swapStart) / 1000;
  const k = s < 0 ? 1 : s < .6 ? 1 - s / .6 : s < 1.25 ? 0 : Math.min(1, (s - 1.25) / .65);
  if (k === 1 && bardTitle.drawn === 1) return;  // nothing changed since the last frame
  bardTitle.drawn = k;
  const t = bardTitle, d = t.img.data;
  for (let i = 0; i < W * H; i++) {
    const v = t.px[i] && t.rnd[i] < k ? t.px[i] : 0, o = i * 4;
    if (v === 1) { d[o] = 246; d[o + 1] = 240; d[o + 2] = 226; d[o + 3] = 255; }
    else if (v === 2) { d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255; }
    else if (v === 3) { d[o] = 8; d[o + 1] = 6; d[o + 2] = 18; d[o + 3] = 200; }
    else d[o + 3] = 0;
  }
  bardUx.putImageData(t.img, 0, 0);
};
// ── The parchment of the next song, in pixel art too (one of its pixels, BARD_PIXEL CSS pixels,
// kept straight on the screen: a pixel grid turned by CSS goes jagged): old paper in a few soft
// tones, a stain or two away from the writing, ragged edges burnt brown; the name in capitals of
// the ink font, in solid brown ink that bleeds a shade into the paper below each stroke, on one
// line or two. Its random draws are seeded by the name, so that it always looks the same. Its
// lower part is hidden behind the frame.
let bardSlipFor = null;
const bardSlipArt = song => {
  bardSlipFor = song;
  const canvas = bardNextBtn.querySelector("canvas"), c = canvas.getContext("2d");
  let seed = [...song.name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const font = BARD_FONT_INK, lines = bardTextLines(font, song.name, 62);
  const tw = Math.max(...lines.map(line => bardTextWidth(font, line))), textH = lines.length * 10 - 3;
  const W = tw + 16, H = textH + 18, ty = 6;  // the writing from ty to ty + textH, the rest hidden
  canvas.width = W; canvas.height = H;
  canvas.style.width = `${W * BARD_PIXEL}px`; canvas.style.height = `${H * BARD_PIXEL}px`;
  // The ragged outline: how far each column / row is eaten in from the edge, in short runs
  const ragged = n => {
    const a = [];
    let v = 0;
    for (let k = 0; k < n; k++) { if (rand() < .35) v = Math.floor(rand() * 3); a.push(v); }
    return a;
  };
  const top = ragged(W), bottom = ragged(W), left = ragged(H), right = ragged(H);
  // Stains, kept off the writing
  const stains = [];
  for (let n = 0; n < 40 && stains.length < 2; n++) {
    const [sx, sy, r] = [3 + rand() * (W - 6), 2 + rand() * (H - 4), 1.6 + rand() * 2];
    if (sy + r < ty - 1 || sy - r > ty + textH + 1 || sx + r < 6 || sx - r > W - 6) stains.push([sx, sy, r]);
  }
  const PAPER = [[236, 219, 172], [224, 202, 150], [208, 182, 126]];
  const img = c.createImageData(W, H), d = img.data;
  const set = (x, y, rgb) => { const o = (y * W + x) * 4; d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255; };
  const get = (x, y) => { const o = (y * W + x) * 4; return d[o + 3] ? [d[o], d[o + 1], d[o + 2]] : null; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = Math.min(y - top[x], H - 1 - y - bottom[x], x - left[y], W - 1 - x - right[y]);
    if (edge < 0) continue;
    // soft tones: broad waves, a little grain, cleaner where the name is written
    const inText = y >= ty - 2 && y <= ty + textH + 1;
    const tone = Math.sin(x * .21 + y * .13) * .8 + Math.sin(y * .35 - x * .09 + 2) * .6 + (rand() - .5) * (inText ? .3 : .9);
    let rgb = PAPER[tone > .55 ? 0 : tone > -.6 ? 1 : 2];
    if (stains.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r)) rgb = [190, 158, 100];
    if (edge === 0) rgb = rand() < .75 ? [96, 58, 28] : [126, 84, 42];        // burnt
    else if (edge === 1) rgb = rand() < .5 ? [168, 126, 72] : [186, 150, 94];  // scorched
    else if (edge === 2 && rand() < .4) rgb = [198, 168, 112];
    set(x, y, rgb);
  }
  // The name: the ink's bleed first (a shade darker, one pixel down), then the ink itself
  const ink = [];
  lines.forEach((line, k) => bardWrite(font, line, Math.round((W - bardTextWidth(font, line)) / 2), ty + k * 10, (x, y) => ink.push([x, y])));
  ink.forEach(([x, yy]) => {
    const under = get(x, yy + 1);
    if (under) set(x, yy + 1, under.map(v => Math.round(v * .86)));
  });
  ink.forEach(([x, yy]) => set(x, yy, [52, 30, 14]));
  c.putImageData(img, 0, 0);
};

// The UI's canvas has the painting's size (or the frame's, in painting pixels, without WebGL)
const bardUISize = () => {
  const box = bardStage.getBoundingClientRect();
  const W = bardCanvas && bardScene ? bardCanvas.width : Math.round(box.width / BARD_PIXEL);
  const H = bardCanvas && bardScene ? bardCanvas.height : Math.round(box.height / BARD_PIXEL);
  if (bardUI.width !== W || bardUI.height !== H) { bardUI.width = W; bardUI.height = H; bardTitle = null; }
};

// Music notes flying out of the painting at the burst (removed when their animation ends)
const bardNotes = () => {
  const box = bard.querySelector(".notes");
  for (let i = 0; i < 7; i++) {
    const n = document.createElement("i");
    n.textContent = "♪♫♩♬"[i % 4];
    n.style.cssText = `left:${18 + Math.random() * 30}%;--dx:${(Math.random() - .3) * 9}rem;--dy:${-(4 + Math.random() * 6)}rem;` +
      `--r:${(Math.random() - .5) * 70}deg;animation-delay:${(i * .06).toFixed(2)}s`;
    n.addEventListener("animationend", () => n.remove());
    box.append(n);
  }
};

// Changing the song (the fire, or the end of a song)
const bardLater = (ms, fn) => bardTimers.push(setTimeout(fn, ms));
const bardNext = () => {
  if (swapStart >= 0) return;
  const muted = epicMuted();
  bardFade(epicRiff);
  bardSong = (bardSong + 1) % BARD_SONGS.length;
  try { localStorage.setItem("epicSong", String(bardSong)); } catch (e) {}
  const song = BARD_SONGS[bardSong];
  epicRiff = bardTrack(preloadTrack(song.file, { loop: false }));  // ready, paused, until it is its turn
  epicRiff.muted = muted;
  epicPlaying = true;  // a song chosen is a song to hear
  const start = () => { bardShown = bardSong; bardSay.textContent = `Now playing: ${song.name}`; epicPlay(); };
  if (bardStill() || !bardScene) { start(); bardVal.uMood = song.mood; bardRender(); bardDrawUI(performance.now()); return; }
  swapStart = performance.now();
  swapFrom = bardVal.uMood;
  bard.classList.add("swap");
  paintBard();
  bardLater(450, () => { if (!muted) bardChord(song); });
  bardLater(1250, () => {
    if (!muted) bardWhoomp();
    bardShown = bardSong;
    bard.classList.remove("swap");
    bard.classList.add("burst");
    bardNotes();
    paintBard();
  });
  bardLater(1450, start);
  bardLater(BARD_SWAP * 1000, () => { swapStart = -1; bard.classList.remove("burst"); });
};

// What is under the pointer: the fire (a circle around it in the painting) or the knight (the rest)
const bardWhere = e => {
  const box = bardStage.getBoundingClientRect(), H = box.height;
  const x = (e.clientX - box.left - box.width / 2) / H, y = (box.height / 2 - (e.clientY - box.top)) / H;
  const [fx, fy] = bardProject([BARD_FIRE[0], .15, BARD_FIRE[2]]);
  return Math.hypot(x - fx, y - fy) < .2 ? "fire" : "knight";
};
const bardToggle = () => {
  if (performance.now() - bardSoundAt < 600 || swapStart >= 0) return;  // this same click just turned the sound on
  if (epicMuted()) epicSound();
  else if (epicPlaying) epicPause();
  else epicPlay();
  if (bardStill()) { bardStep(performance.now(), 1); bardRender(); bardDrawUI(performance.now()); }
};
const bardChange = () => {
  if (epicMuted()) epicSound();
  bardNext();
};
bardStage.addEventListener("click", e => {
  e.stopPropagation();
  bardAudioReady();
  if (bardWhere(e) === "fire") bardChange(); else bardToggle();
});
bardStage.addEventListener("pointermove", e => {
  const where = e.pointerType === "touch" ? null : bardWhere(e);
  if (where !== bardHover) { bardHover = where; paintBard(); }
});
bardStage.addEventListener("pointerleave", () => { bardHover = null; paintBard(); });
bardToggleBtn.addEventListener("click", e => { e.stopPropagation(); bardAudioReady(); bardToggle(); });
bardNextBtn.addEventListener("click", e => { e.stopPropagation(); bardAudioReady(); bardChange(); });

const setEpicMusic = on => {
  document.removeEventListener("pointerdown", epicSound);
  document.removeEventListener("keydown", epicSound);
  cancelAnimationFrame(bardRaf);
  removeEventListener("resize", bardResize);
  if (!on) {
    bardTimers.forEach(clearTimeout);
    bardTimers = [];
    swapStart = -1;
    dropTrack(epicRiff);
    bardFading.forEach(dropTrack);
    bardFading = [];
    epicRiff = null; epicPlaying = false;
    bard.classList.remove("swap", "burst", "tuning");
    bard.remove();
    return;
  }
  bardShown = bardSong;
  document.body.append(bard);
  bardWarm();
  bardStage.prepend(bardCanvas);
  Object.assign(bardVal, { uMood: BARD_SONGS[bardSong].mood, uPlay: 0, uPitch: -.5, uFlare: 0, uRing: 0 });
  epicPlay();
  if (epicMuted()) {
    document.addEventListener("pointerdown", epicSound, { once: true });
    document.addEventListener("keydown", epicSound, { once: true });
  }
  if (bardScene) bardScene.resize(bardScale);
  addEventListener("resize", bardResize);
  bardCheck();
  if (bardStill()) {  // one still picture, once the shader is ready
    const still = () => {
      if (!bard.isConnected) return;
      bardUISize();
      bardStep(performance.now(), 1);
      bardDrawUI(performance.now());
      if (bardCheck() === "compiling") { bardTimers.push(setTimeout(still, 250)); return; }
      bardRender();
    };
    still();
  } else { bardDrawn = 0; bardRaf = requestAnimationFrame(bardFrame); }
};
setEpicMusic(document.body.classList.contains("epic"));
document.addEventListener("epic", e => setEpicMusic(e.detail));
