// ── Cassette player (the day, no screen) ──
// Music for the usual look of the page: a portable cassette player in the bottom left corner, with
// a small rack of tapes beside it. The tapes are Lofi Girl mixes from YouTube (the last one is the
// live radio, a tape that never ends), played by a hidden <iframe> driven by postMessage commands,
// like the Christmas radio. The deck plays / pauses the tape in it; a tape of the rack ejects the
// one in the deck and goes in, playing; the ⏭ key puts in the next tape of the rack (the one way on
// touch screens, where the rack is too small for a finger). When a mix ends the next tape goes in.
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

// The cassette drawn in CSS: a shell, a coloured label with the tape's name, a window with its two
// reels (spinning while it plays)
const cassette = tape => `<span class="cassette" style="--tc:${tape.color}"><b>${tape.icon}<span> ${tape.short}</span></b>` +
  '<i class="reels"><i></i><i></i></i></span>';
const tapeDeck = document.createElement("div");
tapeDeck.id = "tapedeck";
tapeDeck.innerHTML = '<span class="label" aria-live="polite"></span><span class="unit">' +
  '<button type="button" class="walkman"><span class="slot"></span><i class="led"></i></button>' +
  '<button type="button" class="next" aria-label="Next tape" title="Next tape">⏭</button>' +
  '<span class="rack" role="group" aria-label="Tapes"></span></span>';
const walkman = tapeDeck.querySelector(".walkman"), tapeRack = tapeDeck.querySelector(".rack");
TAPES.forEach((tape, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.title = `Put in ${tape.name}`;
  b.setAttribute("aria-label", b.title);
  b.innerHTML = cassette(tape);
  b.addEventListener("click", () => putTape(i));
  tapeRack.append(b);
});

const paintTapes = () => {
  const tape = TAPES[tapeAt];
  tapeDeck.classList.toggle("playing", tapePlaying);
  tapeDeck.querySelector(".label").textContent = tapePlaying ? `♪ ${tape.name} — click to pause` : `♪ ${tape.name} — click to play`;
  walkman.title = tapePlaying ? "Pause the tape" : `Play ${tape.name}`;
  walkman.setAttribute("aria-label", walkman.title);
  [...tapeRack.children].forEach((b, i) => b.classList.toggle("out", i === tapeAt));  // its slot is empty
};
// The label says what plays for a few seconds after a change, then only on hover / focus
const tellTape = () => {
  tapeDeck.classList.add("tell");
  clearTimeout(tapeTell);
  tapeTell = setTimeout(() => tapeDeck.classList.remove("tell"), 4000);
};

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
// A tape of the rack goes in: the one in the deck comes out (the cassette slides in again: class
// removed, reflow, put back), and it plays
const putTape = i => {
  tapeStop();
  tapeAt = i;
  try { localStorage.setItem("tape", i); } catch (e) {}
  const slot = tapeDeck.querySelector(".slot");
  slot.innerHTML = cassette(TAPES[i]);
  tapeDeck.classList.remove("swap");
  void tapeDeck.offsetWidth;
  tapeDeck.classList.add("swap");
  tapePlay();
  tellTape();
};
walkman.addEventListener("click", () => { tapePlaying ? tapePause() : tapePlay(); tellTape(); });
tapeDeck.querySelector(".next").addEventListener("click", () => putTape((tapeAt + 1) % TAPES.length));
// What the player reports: that it is ready (commands now work), and its state: 0 = the mix has
// ended, then the next tape goes in
window.addEventListener("message", e => {
  if (!tapePlayer || e.source !== tapePlayer.contentWindow || typeof e.data !== "string") return;
  let msg;
  try { msg = JSON.parse(e.data); } catch (err) { return; }
  const state = msg.event === "onStateChange" ? msg.info
    : msg.event === "infoDelivery" && msg.info ? msg.info.playerState : undefined;
  if (msg.event === "onReady" || msg.event === "initialDelivery" || state !== undefined) tapeReady = true;
  if (state === 0 && tapePlaying) putTape((tapeAt + 1) % TAPES.length);
});

const setTapes = on => {
  if (!on) { tapeStop(); tapePlaying = false; tapeDeck.remove(); return; }
  if (tapeDeck.isConnected) return;
  tapeDeck.querySelector(".slot").innerHTML = cassette(TAPES[tapeAt]);
  document.body.append(tapeDeck);
  paintTapes();
};
// Only during the day: the first screen is set by start.js, after this file, hence the timeout
document.addEventListener("phase", e => setTapes(!e.detail));
setTimeout(() => setTapes(!document.body.dataset.phase));
