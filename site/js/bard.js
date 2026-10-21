// ── The bard of the epic finale (body.epic) ───────────────────────────────────────────────────
// The finale's music player: a knight playing the lute, sitting in the grass against a mossy
// boulder by a campfire, a little pixel art painting in the bottom left corner (his scene is
// ray-marched in bardscene.js, css/bard.css). It replaces the metal show's amp when the finale
// takes over. Its controls are in the painting itself (the pixel art "UI", below): the song's title
// written in a corner, the knight to play / pause, the fire to change the song.
// The finale has two songs (BARD_SONGS), each with its mood in the scene: the Two Steps From Hell
// mix (audio/epic.mp3: blue arcane fire, blue motes) and Dragonborn, the theme of Skyrim
// (audio/dragonborn.mp3: a red fire, a starry night, a dragon crossing the moon). When one ends
// the next one comes; the song chosen is remembered.
// Clicking the knight plays / pauses: playing, he strums at the song's pace, nodding, his left
// hand moving along the neck; paused, he dozes, chin down, and the fire burns lower. Clicking the
// fire changes the song, as a little show (bardNext): he stops and looks up at the fire, strums a
// flourish (a chord plucked with Web Audio), the fire is drawn in, then bursts in the new song's
// colour, a shock wave runs over the grass, the title dissolves pixel by pixel and the new one
// appears, and the new song starts. Two buttons, hidden until focused, do the same from the
// keyboard.
// As the other screens' music, the song autoplays muted when the page has had no gesture yet, and
// the sound comes on at the first click or key press anywhere.
const BARD_SONGS = [
  { file: "epic.mp3", name: "Two Steps From Hell", sub: "Epic mix", icon: "🔥", mood: 0, tempo: 1.25,
    chord: [110, 164.81, 220, 261.63, 329.63] },  // A minor
  { file: "dragonborn.mp3", name: "Dragonborn", sub: "Skyrim", icon: "🐉", mood: 1, tempo: 1.55,
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
  '<button type="button" class="sr toggle"></button><button type="button" class="sr next"></button><span class="sr" aria-live="polite"></span>';
const bardStage = bard.querySelector(".stage"), bardUI = bard.querySelector(".ui"), bardUx = bardUI.getContext("2d");
const bardToggleBtn = bard.querySelector(".toggle"), bardNextBtn = bard.querySelector(".next"), bardSay = bard.querySelector("span.sr");
let bardShown = bardSong;  // the song whose title is written (changed halfway through a change)
let bardHover = null;      // what the pointer is over: "fire", "knight" or null

const paintBard = () => {
  const song = BARD_SONGS[bardShown], next = BARD_SONGS[(bardSong + 1) % BARD_SONGS.length];
  const toggle = !epicPlaying ? "Play the music" : epicMuted() ? "Turn the sound on" : "Pause the music";
  bard.classList.toggle("playing", epicPlaying);
  bard.classList.toggle("mood-1", song.mood === 1);
  bardToggleBtn.textContent = `${toggle} (${song.name})`;
  bardNextBtn.textContent = `Next song: ${next.name}`;
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
  if (state === "compiling" || state === "failed") {  // the title and glyphs still show, over the plain night
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

// ── The pixel art UI, over the painting at its own resolution (each of its pixels one of the
// painting's): the song's title in the top right corner, over the dark trunk, as on the covers of
// those videos (capitals of a pixel font, a dark outline, an ornament under them in the fire's
// colour), and little glyphs saying what a click does: » by the fire (on hover, always a
// little on touch screens, and for the first seconds), ▶ over the knight when paused, ❚❚ when the
// pointer is over him while he plays, a speaker crossed out while the song is muted. During a song
// change the title dissolves pixel by pixel and the new one appears the same way.
let bardTitle = null, bardShownAt = 0;  // bardTitle: the title's pixels, made once per song and size
const BARD_GLYPHS = {
  next: ["1..1..", ".1..1.", "..1..1", ".1..1.", "1..1.."],
  play: ["1...", "11..", "111.", "1111", "111.", "11..", "1..."],
  pause: ["11.11", "11.11", "11.11", "11.11", "11.11", "11.11"],
  muted: ["..1.....", ".11.1.1.", "111..1..", "111.1.1.", ".11.....", "..1....."],
};
const bardUIColour = () => BARD_SONGS[bardShown].mood ? [255, 92, 70] : [140, 180, 255];
// A pixel font of 5 x 7 capitals, drawn by hand (each letter: seven rows of five pixels): a
// browser font shrunk to a few pixels and cut out turns to mush
const BARD_FONT = (() => {
  const src = {
    A: "01110 10001 10001 11111 10001 10001 10001", B: "11110 10001 10001 11110 10001 10001 11110",
    C: "01110 10001 10000 10000 10000 10001 01110", D: "11110 10001 10001 10001 10001 10001 11110",
    E: "11111 10000 10000 11110 10000 10000 11111", F: "11111 10000 10000 11110 10000 10000 10000",
    G: "01110 10001 10000 10111 10001 10001 01111", H: "10001 10001 10001 11111 10001 10001 10001",
    I: "01110 00100 00100 00100 00100 00100 01110", J: "00111 00010 00010 00010 00010 10010 01100",
    K: "10001 10010 10100 11000 10100 10010 10001", L: "10000 10000 10000 10000 10000 10000 11111",
    M: "10001 11011 10101 10101 10001 10001 10001", N: "10001 10001 11001 10101 10011 10001 10001",
    O: "01110 10001 10001 10001 10001 10001 01110", P: "11110 10001 10001 11110 10000 10000 10000",
    Q: "01110 10001 10001 10001 10101 10010 01101", R: "11110 10001 10001 11110 10100 10010 10001",
    S: "01111 10000 10000 01110 00001 00001 11110", T: "11111 00100 00100 00100 00100 00100 00100",
    U: "10001 10001 10001 10001 10001 10001 01110", V: "10001 10001 10001 10001 10001 01010 00100",
    W: "10001 10001 10001 10101 10101 10101 01010", X: "10001 10001 01010 00100 01010 10001 10001",
    Y: "10001 10001 01010 00100 00100 00100 00100", Z: "11111 00001 00010 00100 01000 10000 11111",
  };
  const font = {};
  Object.keys(src).forEach(k => { font[k] = src[k].split(" "); });
  return font;
})();
// The title's pixels: the name in the pixel font, right-aligned (1), the ornament under it (2), and
// their outline (3): a lit pixel's neighbours. Too wide for the painting (phones), it goes on two
// lines.
const bardTitleArt = (song, W, H) => {
  const px = new Uint8Array(W * H), rnd = new Float32Array(W * H);
  const width = text => text.length * 6 - 1;
  const name = song.name.toUpperCase(), words = name.split(" ");
  let lines = [name];
  if (width(name) > W - 8 && words.length > 1) {
    const half = Math.ceil(words.length / 2);
    lines = [words.slice(0, half).join(" "), words.slice(half).join(" ")];
  }
  const put = (x, y, v) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = v; };
  let y = 3, right = W - 4, widest = 0;
  lines.forEach(line => {
    let x = right - width(line);
    widest = Math.max(widest, width(line));
    [...line].forEach(ch => {
      const rows = BARD_FONT[ch];
      if (rows) rows.forEach((row, j) => [...row].forEach((v, i) => { if (v === "1") put(x + i, y + j, 1); }));
      x += 6;
    });
    y += 9;
  });
  const oy = y, ox = Math.round(right - widest * .8), cx = Math.round(right - widest * .4);
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
const bardGlyph = (name, x, y, rgb, alpha) => {
  if (alpha <= .02) return;
  const rows = BARD_GLYPHS[name], c = bardUx;
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = `rgba(8,6,18,${(alpha * .8).toFixed(2)})`;  // the outline, then the glyph
  rows.forEach((row, j) => [...row].forEach((v, i) => { if (v === "1") c.fillRect(x + i - 1, y + j - 1, 3, 3); }));
  c.fillStyle = `rgba(${rgb.join(",")},${alpha.toFixed(2)})`;
  rows.forEach((row, j) => [...row].forEach((v, i) => { if (v === "1") c.fillRect(x + i, y + j, 1, 1); }));
};
const bardDrawUI = now => {
  const W = bardUI.width, H = bardUI.height;
  if (!W || !H) return;
  const song = BARD_SONGS[bardShown], rgb = bardUIColour();
  if (!bardTitle || bardTitle.song !== song || bardTitle.W !== W || bardTitle.H !== H) bardTitle = bardTitleArt(song, W, H);
  // How much of the title shows: all of it, or dissolving / appearing during a change
  const s = swapStart < 0 ? -1 : (now - swapStart) / 1000;
  const k = s < 0 ? 1 : s < .6 ? 1 - s / .6 : s < 1.25 ? 0 : Math.min(1, (s - 1.25) / .65);
  const t = bardTitle, d = t.img.data;
  for (let i = 0; i < W * H; i++) {
    const v = t.px[i] && t.rnd[i] < k ? t.px[i] : 0, o = i * 4;
    if (v === 1) { d[o] = 246; d[o + 1] = 240; d[o + 2] = 226; d[o + 3] = 255; }
    else if (v === 2) { d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255; }
    else if (v === 3) { d[o] = 8; d[o + 1] = 6; d[o + 2] = 18; d[o + 3] = 200; }
    else d[o + 3] = 0;
  }
  bardUx.putImageData(t.img, 0, 0);
  // The glyphs, where the fire and the knight are in the painting
  const at = P => { const [x, y] = bardProject(P); return [W / 2 + x * H, H / 2 - y * H]; };
  const [fx, fy] = at([BARD_FIRE[0], .3, BARD_FIRE[2]]), [kx, ky] = at(BARD_KNIGHT);
  const pulse = .5 + .5 * Math.sin(now / 400), early = now - bardShownAt < 6000;
  const touch = matchMedia("(pointer: coarse)").matches;
  if (s < 0) {
    bardGlyph("next", fx + 7, fy - 4, rgb, bardHover === "fire" ? 1 : early || touch ? .35 + .3 * pulse : 0);
    if (!epicPlaying) bardGlyph("play", kx - 2, ky - 3, [246, 240, 226], .45 + .4 * pulse);
    else if (bardHover === "knight") bardGlyph("pause", kx - 2, ky - 3, [246, 240, 226], .8);
  }
  if (epicMuted()) bardGlyph("muted", W - 11, H - 9, [246, 240, 226], .5 + .45 * pulse);
};
// The UI's canvas has the painting's size (or the frame's, in painting pixels, without WebGL)
const bardUISize = () => {
  const box = bardStage.getBoundingClientRect();
  const W = bardCanvas && bardScene ? bardCanvas.width : Math.round(box.width / BARD_PIXEL);
  const H = bardCanvas && bardScene ? bardCanvas.height : Math.round(box.height / BARD_PIXEL);
  if (bardUI.width !== W || bardUI.height !== H) { bardUI.width = W; bardUI.height = H; }
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
  bardShownAt = performance.now();
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
