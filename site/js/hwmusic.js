// ── Halloween music ───────────────────────────────────────────────────────────────────────────
// The music of the Halloween screens, played by a pumpkin cocotte in the bottom left corner (an
// enamelled cast-iron pot on a wooden board, drawn in hwcocotte.js): while the music plays its lid
// lifts and bobs as if simmering, and steam escapes.
// The tracks are HW_TRACKS: a YouTube video (id, played through youtube.js, its ads muted) or an
// mp3 of site/audio (file, screenTrack). With more than one, the next one waits beside the
// player in a small green cocotte (HW_COCOTTE.next): a click on it puts it on. As the
// Christmas turntable: a click on the player plays / pauses; the choice and the pause are
// remembered; without a user gesture yet it starts muted and the sound comes at the first click
// or key press.
const HW_TRACKS = [
  { id: "_jH2oTNRe7g", name: "Cozy autumn lofi", short: "Autumn", color: "#d9622b" },
];
const HW_YT = {};  // the Halloween player, as the owner of a YouTube player (youtube.js)
let hwTrackAt = (() => { try { return Math.min(HW_TRACKS.length - 1, +localStorage.getItem("hw-track") || 0); } catch (e) { return 0; } })();
let hwAudioEl = null, hwYtOn = false, hwPlaying = false, hwMuted = false, hwSoundAt = 0;
const hwMusic = document.createElement("button"), hwNext = document.createElement("button");
hwMusic.id = "hwmusic";
hwMusic.type = "button";
hwNext.id = "hwnext";
hwNext.type = "button";
const hwTrack = () => HW_TRACKS[hwTrackAt];
const hwMusicOff = () => { try { return localStorage.getItem("hw-music") === "off"; } catch (e) { return false; } };

const hwPaint = () => {
  hwMusic.classList.toggle("playing", hwPlaying);
  hwMusic.querySelector(".label").textContent = !hwPlaying ? "♪ Click for music"
    : hwMuted ? "🔇 Click anywhere for sound" : `♪ ${hwTrack().name} — click to pause`;
  hwMusic.title = !hwPlaying ? "Play the music" : hwMuted ? "Turn the sound on" : "Pause the music";
  const next = HW_TRACKS[(hwTrackAt + 1) % HW_TRACKS.length];
  hwNext.title = `Put on ${next.name}`;
  hwNext.setAttribute("aria-label", hwNext.title);
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
hwMusic.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - hwSoundAt < 600) return;  // this same click just turned the sound on
  if (hwMuted) hwSound();
  else if (hwPlaying) hwPause();
  else hwPlay();
});
