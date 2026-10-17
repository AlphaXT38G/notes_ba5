// ── Jazz bar (screens "evening" and "closing", body.night) ──────────────────────────────────
// From 21:30 the page turns into a jazz bar (css/jazz.css): warm light, neon title, smoke and
// floating notes, a turntable playing jazz. At 0:45 the bar closes until 1:00 (the bartender's
// announcement is in closing.js), then the metal show takes over (metal.js).
SCREENS.evening = { className: "night", subtitle: null, transition: "night" };
SCREENS.closing = { className: "night", subtitle: "Last call was a while ago.", transition: "night" };
SCHEDULE.push([21 * 3600 + 30 * 60, 45 * 60, "evening"], [45 * 60, 3600, "closing"]);

// Closing time: wrap each letter of the title in a span (.l, with its index --i) so the CSS can
// turn them off one by one; once the sign is dark the bartender comes to close (closing.js). Any
// other phase puts the title back as plain text.
const title = document.querySelector("h1"), titleText = title.textContent;
document.addEventListener("phase", e => {
  if (e.detail !== "closing") { title.textContent = titleText; return; }
  title.innerHTML = [...titleText].map((c, i) => `<span class="l" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");
  title.style.setProperty("--n", titleText.length);
});


// Bar air: 3 smoke clouds drifting across the room and a music note rising every ~0.9 s,
// with a random sway and tilt (--sway, --r); everything is removed when the night ends
const air = document.createElement("div");
air.className = "air";
let noteTimer = null;
const note = () => {
  if (crowded(air, 3 + 25)) return;  // 3 smoke clouds + at most 25 notes (see crowded)
  const n = document.createElement("span");
  n.className = "note";
  n.textContent = "♪♫♩♬"[Math.floor(Math.random() * 4)];
  n.style.cssText = `left:${Math.random() * 100}%;font-size:${1 + Math.random() * 1.4}rem;--o:${.25 + Math.random() * .45};` +
    `--sway:${(Math.random() - .5) * 160}px;--r:${(Math.random() - .5) * 50}deg;animation-duration:${9 + Math.random() * 7}s`;
  n.addEventListener("animationend", () => n.remove());
  air.append(n);
};
const setAir = on => {
  clearInterval(noteTimer);
  air.textContent = "";
  air.remove();
  if (!on) return;
  for (let i = 0; i < 3; i++) {
    const s = document.createElement("span");
    s.className = "smoke";
    s.style.cssText = `top:${10 + i * 28}%;left:${-20 + i * 15}%;animation-duration:${50 + i * 17}s;animation-delay:${-i * 13}s`;
    air.append(s);
  }
  document.body.prepend(air);
  for (let i = 0; i < 6; i++) setTimeout(note, i * 300);
  noteTimer = setInterval(note, 900);
};
setAir(document.body.classList.contains("night"));
document.addEventListener("night", e => setAir(e.detail));

// Night music: jazz from YouTube, looped. It starts by itself when the night begins. Browsers
// only allow sound after a user gesture, so if the page has not had one yet it autoplays muted
// and the sound comes on at the first click or key press anywhere. The vinyl button then plays /
// pauses it (through the YouTube iframe API messages). Pausing is remembered: no autoplay on the
// next visits until it is played again.
const JAZZ = "7gtIh5dF9Xk";
let jazz = null, playing = false, jazzMuted = false, jazzSoundAt = 0;
const vinyl = document.createElement("button");
vinyl.id = "vinyl";
vinyl.type = "button";
vinyl.innerHTML = '<span class="deck"><span class="disc"></span><span class="arm"></span></span><span class="label"></span>';
const jazzOff = () => { try { return localStorage.getItem("jazz") === "off"; } catch (e) { return false; } };
const paintVinyl = () => {
  vinyl.classList.toggle("playing", playing);
  vinyl.querySelector(".label").textContent = !playing ? "♪ Click to play some jazz"
    : jazzMuted ? "🔇 Click anywhere for sound" : "♪ Jazz on — click to pause";
  vinyl.title = !playing ? "Play the music" : jazzMuted ? "Turn the sound on" : "Pause the music";
};
const command = func => jazz && jazz.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
const play = (muted = false) => {
  if (!jazz) {  // first time: create the player, it autoplays (muted when there was no gesture yet)
    jazz = document.createElement("iframe");
    jazz.id = "jazz";
    jazz.title = "Background jazz";
    jazz.allow = "autoplay; encrypted-media";
    jazz.src = `https://www.youtube.com/embed/${JAZZ}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${JAZZ}&controls=0&enablejsapi=1`;
    document.body.append(jazz);
    jazzMuted = muted;
  } else command("playVideo");
  playing = true;
  try { localStorage.removeItem("jazz"); } catch (e) {}
  paintVinyl();
};
const pause = () => {
  command("pauseVideo");
  playing = false;
  try { localStorage.setItem("jazz", "off"); } catch (e) {}
  paintVinyl();
};
const jazzSound = () => {  // unmute a jazz that autoplayed muted
  if (!jazz || !jazzMuted) return;
  command("unMute");
  jazzMuted = false;
  jazzSoundAt = performance.now();
  paintVinyl();
};
vinyl.addEventListener("click", e => {
  e.stopPropagation();
  if (performance.now() - jazzSoundAt < 600) return;  // this same click just turned the sound on
  if (jazzMuted) jazzSound();
  else playing ? pause() : play();
});
const setMusic = on => {
  document.removeEventListener("pointerdown", jazzSound);
  document.removeEventListener("keydown", jazzSound);
  if (!on) { if (playing) command("pauseVideo"); playing = false; vinyl.remove(); return; }
  document.body.append(vinyl);
  if (!jazz && !jazzOff()) {
    const canSound = navigator.userActivation ? navigator.userActivation.hasBeenActive : false;
    play(!canSound);
    if (!canSound) {
      document.addEventListener("pointerdown", jazzSound, { once: true });
      document.addEventListener("keydown", jazzSound, { once: true });
    }
  }
  paintVinyl();
};
setMusic(document.body.classList.contains("night"));
document.addEventListener("night", e => setMusic(e.detail));

