// ── Halloween music ───────────────────────────────────────────────────────────────────────────
// The music of the Halloween screens, played by a pumpkin cocotte in the bottom left corner (an
// enamelled cast-iron pot on a wooden board, drawn in hwcocotte.js): while the music plays its lid
// lifts and bobs as if simmering, and steam escapes.
// The tracks are HW_TRACKS: a YouTube video (id, played through youtube.js, its ads muted) or an
// mp3 of site/audio (file, screenTrack); its colour is the soup's while it plays. As the
// Christmas turntable: a click on the player plays / pauses; the choice and the pause are
// remembered; without a user gesture yet it starts muted and the sound comes at the first click
// or key press.
// The other tracks wait beside the cocotte as potions in flasks, on a little plank (#hwshelf):
// a click on one pours it into the pot. The flask flies over it and tips, the lid lifts, the
// potion runs in, the soup takes its colour in a puff of steam of that colour, and that track
// plays; then the flask comes back to its place on the plank, refilled with the track that was
// playing. Cooking the next music, in short.
const HW_TRACKS = [
  { id: "FEKpdb4Kkp4", name: "Lofi Girl - Halloween 2025", short: "2025", color: "#ff8a2a" },
  { id: "0sfDth4lMLc", name: "Spooky lofi radio", short: "Spooky", color: "#a66bff" },
  { id: "D6TSIHxNzfU", name: "Lofi Girl - Halloween 2024", short: "2024", color: "#62d03e" },
  { id: "vuPhCSunt5U", name: "Autumn village ambience", short: "Cozy", color: "#e8443a" },
];
const HW_YT = {};  // the Halloween player, as the owner of a YouTube player (youtube.js)
let hwTrackAt = (() => { try { return Math.min(HW_TRACKS.length - 1, +localStorage.getItem("hw-track") || 0); } catch (e) { return 0; } })();
let hwAudioEl = null, hwYtOn = false, hwPlaying = false, hwMuted = false, hwSoundAt = 0;
const hwMusic = document.createElement("button"), hwShelfEl = document.createElement("div");
hwMusic.id = "hwmusic";
hwMusic.type = "button";
hwShelfEl.id = "hwshelf";
// The tracks on the plank, slot by slot: the others, in the order of the list; a poured slot gets
// the track that was playing
const hwShelf = HW_TRACKS.map((t, i) => i).filter(i => i !== hwTrackAt);
const hwTrack = () => HW_TRACKS[hwTrackAt];
const hwMusicOff = () => { try { return localStorage.getItem("hw-music") === "off"; } catch (e) { return false; } };

const hwPaint = () => {
  hwMusic.classList.toggle("playing", hwPlaying);
  hwMusic.querySelector(".label").textContent = !hwPlaying ? "♪ Click for music"
    : hwMuted ? "🔇 Click anywhere for sound" : `♪ ${hwTrack().name} — click to pause`;
  hwMusic.title = !hwPlaying ? "Play the music" : hwMuted ? "Turn the sound on" : "Pause the music";
};
// A colour lighter by k (0 - 1), towards white: the bubbles of the soup, the potion's glow
const hwTint = (hex, k) => "#" + [1, 3, 5].map(i => {
  const c = parseInt(hex.slice(i, i + 2), 16);
  return Math.round(c + (255 - c) * k).toString(16).padStart(2, "0");
}).join("");
const hwSoup = () => {
  hwMusic.style.setProperty("--soup", hwTrack().color);
  hwMusic.style.setProperty("--bubble", hwTint(hwTrack().color, .45));
};
// Putting the track on, and taking it off: an <audio>, or the YouTube player (kept in the page
// once made, paused: coming back to it plays on with no new ad)
const hwStart = muted => {
  const t = hwTrack();
  if (t.file) hwAudioEl = screenTrack(t.file, { muted });
  else { ytPlay(t.id, HW_YT, !muted); hwYtOn = true; }
  hwMuted = muted;
};
const hwStop = () => {
  dropTrack(hwAudioEl);
  if (hwYtOn) ytPause(hwTrack().id, HW_YT);
  hwAudioEl = null;
  hwYtOn = false;
};
const hwPlay = (muted = false) => {
  if (hwAudioEl) hwAudioEl.play().catch(() => {});
  else if (hwYtOn) ytPlay(hwTrack().id, HW_YT, !hwMuted);
  else hwStart(muted);
  hwPlaying = true;
  try { localStorage.removeItem("hw-music"); } catch (e) {}
  hwPaint();
};
const hwPause = () => {
  if (hwAudioEl) hwAudioEl.pause(); else if (hwYtOn) ytPause(hwTrack().id, HW_YT);
  hwPlaying = false;
  try { localStorage.setItem("hw-music", "off"); } catch (e) {}
  hwPaint();
};
const hwSound = () => {
  if (!hwMuted) return;
  if (hwAudioEl) hwAudioEl.muted = false; else if (hwYtOn) ytSound(hwTrack().id, HW_YT, true);
  hwMuted = false;
  hwSoundAt = performance.now();
  hwPaint();
};
musicButtons.push(hwMusic);  // the space bar too (screens.js)
hwMusic.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - hwSoundAt < 600) return;  // this same click just turned the sound on
  if (hwMuted) hwSound();
  else if (hwPlaying) hwPause();
  else hwPlay();
});
// The flasks, and pouring one into the pot
let hwPouring = false, hwPourTimers = [];
const hwFlask = (slot, fresh) => {
  const t = HW_TRACKS[hwShelf[slot]], b = document.createElement("button");
  b.type = "button";
  b.className = fresh ? "flask fresh" : "flask";
  b.title = `Pour in ${t.name}`;
  b.setAttribute("aria-label", b.title);
  b.style.setProperty("--glow", t.color);
  b.innerHTML = HW_COCOTTE.flask(slot, t, hwTint(t.color, .55));
  b.addEventListener("click", e => { e.stopPropagation(); hwPour(slot, b); });
  return b;
};
const hwShelfPaint = () => {
  hwShelfEl.textContent = "";
  hwShelf.forEach((_, k) => hwShelfEl.append(hwFlask(k)));
};
// The swap itself: that slot's track plays, the one that was playing goes into the slot
const hwSwitch = slot => {
  hwStop();
  const was = hwTrackAt;
  hwTrackAt = hwShelf[slot];
  hwShelf[slot] = was;
  try { localStorage.setItem("hw-track", hwTrackAt); } catch (e) {}
  hwSoup();
  hwPlay();
};
const hwPour = (slot, flask) => {
  if (hwPouring) return;
  if (hwStill()) {  // reduced motion: no flight, the flask simply changes
    hwSwitch(slot);
    hwShelfEl.replaceChild(hwFlask(slot), flask);
    return;
  }
  hwPouring = true;
  // where the flask flies: tipped (rotate(-115deg), css/hwmusic.css), its neck is 0.45 of its
  // height to the left of its centre and 0.21 below it; that neck goes over the middle of the pot
  const pot = hwMusic.querySelector(".pot").getBoundingClientRect(), f = flask.getBoundingClientRect();
  const neckX = pot.left + pot.width / 2, neckY = pot.top + pot.height * .1;
  flask.style.setProperty("--dx", `${f1(neckX + .45 * f.height - (f.left + f.width / 2))}px`);
  flask.style.setProperty("--dy", `${f1(neckY - .21 * f.height - (f.top + f.height / 2))}px`);
  hwMusic.style.setProperty("--pour", HW_TRACKS[hwShelf[slot]].color);
  flask.classList.add("pour");
  hwMusic.classList.remove("puff");
  hwMusic.classList.add("pouring");
  hwPourTimers = [
    setTimeout(() => {  // the potion is in: the new soup, its steam, its music
      hwSwitch(slot);
      hwMusic.style.setProperty("--puff", hwTint(hwTrack().color, .3));
      hwMusic.classList.add("puff");
    }, 1000),
    setTimeout(() => {  // the flask back on the plank, refilled
      hwMusic.classList.remove("pouring");
      hwShelfEl.replaceChild(hwFlask(slot, true), flask);
      hwPouring = false;
    }, 1550),
    setTimeout(() => hwMusic.classList.remove("puff"), 2400),  // its steam gone: the simmering one again
  ];
};
// The YouTube tracks made ahead, through their ads, once the player is reached for
const hwWarm = () => HW_TRACKS.forEach(t => { if (t.id) ytWarm(t.id); });
["pointerenter", "touchstart", "focusin"].forEach(type => {
  hwMusic.addEventListener(type, hwWarm, { passive: true });
  hwShelfEl.addEventListener(type, hwWarm, { passive: true });
});

hwPart({
  on() {
    hwMusic.innerHTML = `${HW_COCOTTE.html()}<span class="label"></span>`;
    hwSoup();
    hwFront.append(hwMusic);
    hwMusic.classList.toggle("shelved", hwShelf.length > 0);  // a single track: no plank
    if (hwShelf.length) {
      hwShelfPaint();
      hwFront.append(hwShelfEl);
    }
    if (!hwMusicOff()) {
      const canSound = screenGesture();
      hwPlay(!canSound);
      if (!canSound) {
        document.addEventListener("pointerdown", hwSound, { once: true });
        document.addEventListener("keydown", hwSound, { once: true });
      }
    }
    hwPaint();
  },
  off() {
    document.removeEventListener("pointerdown", hwSound);
    document.removeEventListener("keydown", hwSound);
    hwPourTimers.forEach(clearTimeout);
    hwPouring = false;
    hwMusic.classList.remove("pouring", "puff");
    hwStop();
    hwPlaying = hwMuted = false;
    hwMusic.remove();
    hwShelfEl.remove();
  },
});
