// ── Cassette player (the day, no screen) ──
// Music for the usual look of the page: a small portable cassette player in the bottom left
// corner. The tapes are Lofi Girl mixes from YouTube (the last one is the live radio, a tape that
// never ends), played by a hidden <iframe> driven by postMessage commands, like the Christmas
// radio. The player plays / pauses the tape in it; its ⏏ key opens the tape box, a list above it
// that takes any number of tapes (add one to TAPES, nothing else). Changing tape is done as on a
// real player: the door opens, the tape comes out, the new one goes in, the door closes, it plays.
// When a mix ends the next tape goes in the same way.
// Unlike the screens' music, nothing plays by itself: someone reading notes at noon did not ask for
// music. The chosen tape is remembered; a screen (jazz bar, Christmas...) takes the player away,
// and it comes back stopped with the day.
const TAPES = [
  { id: "_jH2oTNRe7g", icon: "🍂", short: "Autumn", name: "Cozy autumn lofi", color: "#d9622b" },
  { id: "XVFUtEh9zrY", icon: "☀️", short: "Summer", name: "Summer lofi", color: "#e8a92a" },
  { id: "lTRiuFIWV54", icon: "📚", short: "1 A.M.", name: "1 A.M. study session", color: "#5a5fc4" },
  { id: "rFZHOHl-L8A", icon: "📻", short: "Radio", name: "Lofi hip hop radio", color: "#c43d6a" },
];
let tapeAt = (() => {
  try { const i = +localStorage.getItem("tape"); return i >= 0 && i < TAPES.length ? i : 0; } catch (e) { return 0; }
})();
let tapePlayer = null, tapeReady = false, tapePlaying = false, tapeTell = null;
let tapeSwapping = false, tapeTimers = [];

// The cassette drawn in CSS: a shell, a coloured label with the tape's name, a window with its two
// reels (spinning while it plays)
const cassette = tape => `<span class="cassette" style="--tc:${tape.color}"><b>${tape.icon} ${tape.short}</b>` +
  '<i class="reels"><i></i><i></i></i></span>';
const tapeDeck = document.createElement("div");
tapeDeck.id = "tapedeck";
tapeDeck.innerHTML = '<span class="label" aria-live="polite"></span>' +
  '<div class="tapebox" role="group" aria-label="Tapes"><p>Tapes</p><ul></ul></div><span class="unit">' +
  '<button type="button" class="walkman"><span class="bay"></span><span class="door"></span><i class="led"></i></button>' +
  '<button type="button" class="eject" aria-expanded="false" aria-label="Change tape" title="Change tape">⏏</button></span>';
const walkman = tapeDeck.querySelector(".walkman"), tapeBay = tapeDeck.querySelector(".bay");
const tapeEject = tapeDeck.querySelector(".eject"), tapeList = tapeDeck.querySelector(".tapebox ul");
TAPES.forEach((tape, i) => {
  const li = document.createElement("li"), b = document.createElement("button");
  b.type = "button";
  b.innerHTML = `<span class="mini" style="--tc:${tape.color}">${tape.icon}</span><span>${tape.name}</span><small>in the player</small>`;
  b.addEventListener("click", () => { tapeBoxOpen(false); if (i !== tapeAt) swapTape(i); else if (!tapePlaying) tapePlay(); });
  li.append(b);
  tapeList.append(li);
});

const paintTapes = () => {
  const tape = TAPES[tapeAt];
  tapeDeck.classList.toggle("playing", tapePlaying);
  tapeDeck.querySelector(".label").textContent = tapeSwapping ? `⏏ ${tape.name}…`
    : tapePlaying ? `♪ ${tape.name} — click to pause` : `♪ ${tape.name} — click to play`;
  walkman.title = tapePlaying ? "Pause the tape" : `Play ${tape.name}`;
  walkman.setAttribute("aria-label", walkman.title);
  [...tapeList.querySelectorAll("button")].forEach((b, i) => b.setAttribute("aria-current", i === tapeAt));
};
// The label says what plays for a few seconds after a change, then only on hover / focus
const tellTape = () => {
  tapeDeck.classList.add("tell");
  clearTimeout(tapeTell);
  tapeTell = setTimeout(() => tapeDeck.classList.remove("tell"), 4000);
};
// The tape box, above the player: closed by a choice, a click elsewhere or Escape
const tapeBoxOpen = open => {
  tapeDeck.classList.toggle("choosing", open);
  tapeEject.setAttribute("aria-expanded", open);
  if (open) document.addEventListener("pointerdown", tapeBoxAway);
  else document.removeEventListener("pointerdown", tapeBoxAway);
};
const tapeBoxAway = e => { if (!tapeDeck.contains(e.target)) tapeBoxOpen(false); };
tapeEject.addEventListener("click", () => tapeBoxOpen(!tapeDeck.classList.contains("choosing")));
tapeDeck.addEventListener("keydown", e => {
  if (e.key === "Escape" && tapeDeck.classList.contains("choosing")) { tapeBoxOpen(false); tapeEject.focus(); }
});

const tapeCommand = func => tapePlayer && tapePlayer.contentWindow.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
const tapeStop = () => {  // the tape out of the player: its iframe goes
  if (tapePlayer) tapePlayer.remove();
  tapePlayer = null;
  tapeReady = false;
};
const tapePlay = () => {
  if (tapePlayer && tapeReady) tapeCommand("playVideo");
  else {
    tapeStop();  // a player not ready yet would ignore the command: a fresh one starts by itself
    tapePlayer = document.createElement("iframe");
    tapePlayer.id = "tapeplayer";
    tapePlayer.title = "Lofi music";
    tapePlayer.allow = "autoplay; encrypted-media";
    tapePlayer.src = `https://www.youtube.com/embed/${TAPES[tapeAt].id}?autoplay=1&controls=0&enablejsapi=1`;
    // Ask the player to report its state (the end of a mix), as the YouTube iframe API does: again
    // and again until it answers, since it does not listen yet when the frame has just loaded
    const player = tapePlayer;
    player.addEventListener("load", () => {
      let tries = 0;
      const ask = () => {
        if (tapePlayer !== player || tapeReady || ++tries > 20) return;
        player.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "tapes", channel: "widget" }), "*");
        setTimeout(ask, 500);
      };
      ask();
    });
    document.body.append(tapePlayer);
  }
  tapePlaying = true;
  paintTapes();
};
const tapePause = () => {
  if (tapeReady) tapeCommand("pauseVideo"); else tapeStop();
  tapePlaying = false;
  paintTapes();
};

// Changing tape, step by step (the moves are CSS transitions, tapes.css): the door opens (.open),
// the tape slides up out of the bay (.eject), the new one is put above it without a transition
// (.insert), then slides down into it, the door closes, and it plays. With reduced motion the
// tape is simply changed.
const tapeLater = (ms, fn) => tapeTimers.push(setTimeout(fn, ms));
const swapTape = i => {
  if (tapeSwapping) return;
  tapeStop();
  tapePlaying = false;
  tapeAt = i;
  try { localStorage.setItem("tape", i); } catch (e) {}
  const putIn = () => { tapeBay.innerHTML = cassette(TAPES[i]); };
  const done = () => { tapeSwapping = false; tapePlay(); tellTape(); };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { putIn(); return done(); }
  tapeSwapping = true;
  paintTapes();
  tellTape();
  tapeDeck.classList.add("open");
  tapeLater(350, () => tapeDeck.classList.add("eject"));
  tapeLater(850, () => {
    putIn();
    tapeDeck.classList.remove("eject");
    tapeDeck.classList.add("insert");
    void tapeBay.offsetWidth;  // the new tape starts above the bay, then slides down
    tapeDeck.classList.remove("insert");
  });
  tapeLater(1400, () => tapeDeck.classList.remove("open"));
  tapeLater(1750, done);
};
walkman.addEventListener("click", () => {
  if (tapeSwapping) return;
  tapePlaying ? tapePause() : tapePlay();
  tellTape();
});
// What the player reports: that it is ready (commands now work), and its state: 0 = the mix has
// ended, then the next tape goes in
window.addEventListener("message", e => {
  if (!tapePlayer || e.source !== tapePlayer.contentWindow || typeof e.data !== "string") return;
  let msg;
  try { msg = JSON.parse(e.data); } catch (err) { return; }
  const state = msg.event === "onStateChange" ? msg.info
    : msg.event === "infoDelivery" && msg.info ? msg.info.playerState : undefined;
  if (msg.event === "onReady" || msg.event === "initialDelivery" || state !== undefined) tapeReady = true;
  if (state === 0 && tapePlaying) swapTape((tapeAt + 1) % TAPES.length);
});

const setTapes = on => {
  if (!on) {
    tapeStop();
    tapeTimers.forEach(clearTimeout);
    tapeTimers = [];
    tapePlaying = tapeSwapping = false;
    tapeBoxOpen(false);
    tapeDeck.classList.remove("open", "eject", "insert", "tell");
    tapeDeck.remove();
    return;
  }
  if (tapeDeck.isConnected) return;
  tapeBay.innerHTML = cassette(TAPES[tapeAt]);
  document.body.append(tapeDeck);
  paintTapes();
};
// Only during the day: the first screen is set by start.js, after this file, hence the timeout
document.addEventListener("phase", e => setTapes(!e.detail));
setTimeout(() => setTapes(!document.body.dataset.phase));
