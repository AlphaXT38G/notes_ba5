// ── The bard of the epic finale (body.epic) ───────────────────────────────────────────────────
// The finale's music player: a knight playing the lute, sitting in the grass against a mossy
// boulder by a campfire, a little pixel art painting in the bottom left corner (his scene is
// ray-marched in bardscene.js), with a parchment under it naming the song (css/bard.css). It
// replaces the metal show's amp when the finale takes over.
// The finale has two songs (BARD_SONGS), each with its mood in the scene: the Two Steps From Hell
// mix (audio/epic.mp3: blue arcane fire, blue motes) and Dragonborn, the theme of Skyrim
// (audio/dragonborn.mp3: orange fire, snow, an aurora, a dragon crossing the moon). When one ends
// the next one comes; the song chosen is remembered.
// Clicking the painting plays / pauses: playing, he strums at the song's pace, nodding, his left
// hand moving along the neck; paused, he dozes, chin down, and the fire burns lower. The wax seal
// of the parchment changes the song, as a little show (bardNext): he stops and looks up at the
// fire, strums a flourish (a chord plucked with Web Audio), the fire is drawn in, then bursts in
// the new song's colour, a shock wave runs over the grass, the parchment rolls up and unrolls with
// the new name, and the new song starts.
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
bard.innerHTML = '<button type="button" class="stage"><span class="flash"></span><span class="notes"></span></button>' +
  '<div class="scroll"><span class="song"><b></b><small></small></span><button type="button" class="seal">♫</button></div>';
const bardStage = bard.querySelector(".stage"), bardSeal = bard.querySelector(".seal");
let bardShown = bardSong;  // the song named on the parchment (changed halfway through a change)

const paintBard = () => {
  const song = BARD_SONGS[bardShown], next = BARD_SONGS[(bardSong + 1) % BARD_SONGS.length];
  bard.classList.toggle("playing", epicPlaying);
  bard.classList.toggle("mood-1", BARD_SONGS[bardShown].mood === 1);
  bard.querySelector(".song b").textContent = song.name;
  bard.querySelector(".song small").textContent = !epicPlaying ? "⚔️ Click the knight to play"
    : epicMuted() ? "🔇 Click anywhere for sound" : `${song.icon} ${song.sub} · click to pause`;
  bardStage.title = !epicPlaying ? "Play the music" : epicMuted() ? "Turn the sound on" : "Pause the music";
  bardStage.setAttribute("aria-label", `${bardStage.title} (${song.name})`);
  bardSeal.title = `Next song: ${next.name}`;
  bardSeal.setAttribute("aria-label", bardSeal.title);
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
const bardFrame = now => {
  bardRaf = requestAnimationFrame(bardFrame);
  const gap = now - bardDrawn;
  if (gap < 30) return;
  bardDrawn = now;
  // Too slow (many frames well over 33 ms): fewer pixels from now on. Longer gaps are a hidden tab
  bardSlow = gap > 55 && gap < 250 ? bardSlow + 1 : Math.max(0, bardSlow - 1);
  if (bardSlow > 20 && bardScale > .5) { bardScale *= .8; bardSlow = 0; bardScene.resize(bardScale); }
  bardStep(now, Math.min(gap, 100) / 1000);
  bardRender();
};
const bardResize = () => { if (bardScene) { bardScene.resize(bardScale); bardRender(); } };

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

// Changing the song (the seal, or the end of a song)
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
  const start = () => { bardShown = bardSong; epicPlay(); };
  if (bardStill() || !bardScene) { start(); bardVal.uMood = song.mood; bardRender(); return; }
  swapStart = performance.now();
  swapFrom = bardVal.uMood;
  bard.classList.add("swap");  // the parchment rolls up
  paintBard();
  bardLater(450, () => { if (!muted) bardChord(song); });
  bardLater(1250, () => {
    if (!muted) bardWhoomp();
    bardShown = bardSong;
    bard.classList.remove("swap");  // and unrolls with the new name
    bard.classList.add("burst");
    bardNotes();
    paintBard();
  });
  bardLater(1450, start);
  bardLater(BARD_SWAP * 1000, () => { swapStart = -1; bard.classList.remove("burst"); });
};

bardStage.addEventListener("click", e => {
  e.stopPropagation();
  bardAudioReady();
  if (performance.now() - bardSoundAt < 600 || swapStart >= 0) return;  // this same click just turned the sound on
  if (epicMuted()) epicSound();
  else if (epicPlaying) epicPause();
  else epicPlay();
  if (bardStill()) { bardStep(performance.now(), 1); bardRender(); }
});
bardSeal.addEventListener("click", e => {
  e.stopPropagation();
  bardAudioReady();
  if (epicMuted()) epicSound();
  bardNext();
});

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
    if (bardScene) bardScene.destroy();
    bardScene = null;
    bard.classList.remove("swap", "burst");
    bard.remove();
    return;
  }
  bardShown = bardSong;
  document.body.append(bard);
  // A new canvas each time (the last one's WebGL context was freed), drawn by bardscene.js; without
  // WebGL the frame stays, with a plain night drawn in CSS
  if (bardCanvas) bardCanvas.remove();
  bardCanvas = document.createElement("canvas");
  bardStage.prepend(bardCanvas);
  bardScene = createBardScene(bardCanvas);
  bard.classList.toggle("flat", !bardScene);
  Object.assign(bardVal, { uMood: BARD_SONGS[bardSong].mood, uPlay: 0, uPitch: -.5, uFlare: 0, uRing: 0 });
  epicPlay();
  if (epicMuted()) {
    document.addEventListener("pointerdown", epicSound, { once: true });
    document.addEventListener("keydown", epicSound, { once: true });
  }
  if (!bardScene) return;
  bardScene.resize(bardScale);
  addEventListener("resize", bardResize);
  if (bardStill()) { bardStep(performance.now(), 1); bardRender(); }  // one still picture
  else { bardDrawn = 0; bardRaf = requestAnimationFrame(bardFrame); }
};
setEpicMusic(document.body.classList.contains("epic"));
document.addEventListener("epic", e => setEpicMusic(e.detail));
