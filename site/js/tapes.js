// ── Cassette deck (the day, no screen) ──
// Music for the usual look of the page: an early-80s hi-fi cassette deck in the bottom left corner
// (brushed aluminium, smoked cassette door, two backlit VU meters, a red tape counter and a row of
// piano keys). The tapes are Lofi Girl mixes from YouTube (the last one is the live radio, a tape
// that never ends), played by a hidden <iframe> driven by postMessage commands, like the Christmas
// radio. The keys: ⏏ puts in the next tape, ◀◀ / ▶▶ wind 30 s back / forward, ▶ plays, ❚❚ pauses,
// ■ stops (the tape starts over at the next ▶). As the Christmas turntable's sleeve, the next tape
// waits in its case leaning behind the deck: clicking it puts it in too. A change of tape is done as
// on the real thing: the door opens, the tape comes out, the next one goes in, the door closes, it
// plays. When a mix ends the next tape goes in the same way. More tapes: add them to TAPES.
// Unlike the screens' music, nothing plays by itself: someone reading notes at noon did not ask for
// music. The chosen tape is remembered; a screen (jazz bar, Christmas...) takes the deck away, and
// it comes back stopped with the day.
const TAPES = [
  { id: "_jH2oTNRe7g", icon: "🍂", short: "Autumn", name: "Cozy autumn lofi", color: "#d9622b" },
  { id: "XVFUtEh9zrY", icon: "☀️", short: "Summer", name: "Summer lofi", color: "#e8a92a" },
  { id: "lTRiuFIWV54", icon: "📚", short: "1 A.M.", name: "1 A.M. study session", color: "#5a5fc4" },
  { id: "rFZHOHl-L8A", icon: "📻", short: "Radio", name: "Lofi hip hop radio", color: "#c43d6a", live: true },
];
let tapeAt = (() => {
  try { const i = +localStorage.getItem("tape"); return i >= 0 && i < TAPES.length ? i : 0; } catch (e) { return 0; }
})();
let tapePlayer = null, tapeReady = false, tapePlaying = false, tapeTime = 0, tapeTell = null;
let tapeSwapping = false, tapeTimers = [];
const tapeNext = () => (tapeAt + 1) % TAPES.length;

// The cassette drawn in CSS: a shell, a coloured label with the tape's name, a window with its two
// reels (spinning while it plays)
const cassette = tape => `<span class="cassette" style="--tc:${tape.color}"><b>${tape.icon} ${tape.short}</b>` +
  '<i class="reels"><i></i><i></i></i></span>';
// The keys, left to right as on the decks of the time
const TAPE_KEYS = [
  ["eject", "⏏", "Eject: next tape"], ["rew", "◀◀", "Rewind 30 s"], ["play", "▶", "Play"],
  ["ff", "▶▶", "Fast forward 30 s"], ["stop", "■", "Stop"], ["pause", "❚❚", "Pause"],
].map(([k, sym, name]) => [k, sym.replace(/[⏏◀▶]/g, "$&\uFE0E"), name]);  // text glyphs, not emoji
const tapeDeck = document.createElement("div");
tapeDeck.id = "tapedeck";
tapeDeck.innerHTML = '<button type="button" class="case"></button><div class="deck">' +
  '<div class="well"><span class="bay"></span><span class="door"></span></div>' +
  '<div class="panel"><p class="brand">STEREO CASSETTE DECK <i>TD-82</i></p>' +
  '<div class="meters"><span class="vu"><i></i><small>L</small></span><span class="vu"><i></i><small>R</small></span>' +
  '<span class="counter">0:00</span></div>' +
  '<p class="badges"><i class="power"></i>POWER<span>AUTO REVERSE</span><span>CrO₂</span></p></div>' +
  '<div class="keys">' + TAPE_KEYS.map(([k, sym, name]) =>
    `<button type="button" class="key ${k}" title="${name}" aria-label="${name}">${sym}</button>`).join("") +
  '</div></div><span class="label" aria-live="polite"></span>';
const tapeBay = tapeDeck.querySelector(".bay"), tapeCase = tapeDeck.querySelector(".case");
const tapeCounter = tapeDeck.querySelector(".counter");
const tapeKey = k => tapeDeck.querySelector(`.key.${k}`);

const paintCounter = () => {
  const t = Math.floor(tapeTime);
  tapeCounter.textContent = TAPES[tapeAt].live && tapePlayer ? "LIVE" : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const paintTapes = () => {
  const tape = TAPES[tapeAt], next = TAPES[tapeNext()];
  tapeDeck.classList.toggle("playing", tapePlaying);
  tapeDeck.classList.toggle("paused", !tapePlaying && !!tapePlayer);
  tapeDeck.querySelector(".label").textContent = tapeSwapping ? `⏏ ${tape.name}…`
    : tapePlaying ? `♪ ${tape.name}` : tapePlayer ? `❚❚ ${tape.name}` : `▶ ${tape.name}`;
  for (const k of ["rew", "ff"]) tapeKey(k).disabled = !!tape.live;  // a live has no tape to wind
  // The case behind the deck: the next tape, its label showing
  tapeCase.innerHTML = cassette(next);
  tapeCase.title = `Put in ${next.name}`;
  tapeCase.setAttribute("aria-label", tapeCase.title);
  paintCounter();
};
// The label says what plays for a few seconds after a change, then only on hover / focus
const tellTape = () => {
  tapeDeck.classList.add("tell");
  clearTimeout(tapeTell);
  tapeTell = setTimeout(() => tapeDeck.classList.remove("tell"), 4000);
};

const tapeCommand = (func, args = []) => tapePlayer && tapePlayer.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const tapeStop = () => {  // the tape out of the player: its iframe goes
  if (tapePlayer) tapePlayer.remove();
  tapePlayer = null;
  tapeReady = false;
  tapeTime = 0;
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
    // Ask the player to report its state and time, as the YouTube iframe API does: again and
    // again until it answers, since it does not listen yet when the frame has just loaded
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
  if (!tapePlaying) return;
  if (tapeReady) tapeCommand("pauseVideo"); else tapeStop();
  tapePlaying = false;
  paintTapes();
};
const tapeHalt = () => { tapeStop(); tapePlaying = false; paintTapes(); };
const tapeWind = by => {
  if (!tapeReady || TAPES[tapeAt].live) return;
  tapeTime = Math.max(0, tapeTime + by);
  tapeCommand("seekTo", [tapeTime, true]);
  paintCounter();
};

// Changing tape, step by step (the moves are CSS transitions, tapes.css): the door opens (.open),
// the tape slides up out of the well (.eject), the new one is put above it without a transition
// (.insert), then slides down into it, the door closes, and it plays. The case behind the deck
// dips meanwhile (.swap). With reduced motion the tape is simply changed.
const tapeLater = (ms, fn) => tapeTimers.push(setTimeout(fn, ms));
const swapTape = i => {
  if (tapeSwapping) return;
  tapeStop();
  tapePlaying = false;
  tapeAt = i;
  try { localStorage.setItem("tape", i); } catch (e) {}
  const putIn = () => { tapeBay.innerHTML = cassette(TAPES[i]); };
  const done = () => { tapeSwapping = false; tapeDeck.classList.remove("swap"); tapePlay(); tellTape(); };
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { putIn(); return done(); }
  tapeSwapping = true;
  paintTapes();
  tellTape();
  tapeDeck.classList.add("open", "swap");
  tapeLater(350, () => tapeDeck.classList.add("eject"));
  tapeLater(850, () => {
    putIn();
    tapeDeck.classList.remove("eject");
    tapeDeck.classList.add("insert");
    void tapeBay.offsetWidth;  // the new tape starts above the well, then slides down
    tapeDeck.classList.remove("insert");
  });
  tapeLater(1400, () => tapeDeck.classList.remove("open"));
  tapeLater(1750, done);
};
const TAPE_ACTIONS = {
  eject: () => swapTape(tapeNext()), rew: () => tapeWind(-30), play: tapePlay,
  ff: () => tapeWind(30), stop: tapeHalt, pause: tapePause,
};
TAPE_KEYS.forEach(([k]) => tapeKey(k).addEventListener("click", () => {
  if (tapeSwapping) return;
  TAPE_ACTIONS[k]();
  tellTape();
}));
tapeCase.addEventListener("click", () => { if (!tapeSwapping) swapTape(tapeNext()); });
// What the player reports: that it is ready (commands now work), the time (the counter), and its
// state: 0 = the mix has ended, then the next tape goes in
window.addEventListener("message", e => {
  if (!tapePlayer || e.source !== tapePlayer.contentWindow || typeof e.data !== "string") return;
  let msg;
  try { msg = JSON.parse(e.data); } catch (err) { return; }
  const info = msg.info && typeof msg.info === "object" ? msg.info : {};
  const state = msg.event === "onStateChange" ? msg.info : info.playerState;
  if (msg.event === "onReady" || msg.event === "initialDelivery" || state !== undefined) tapeReady = true;
  if (typeof info.currentTime === "number") { tapeTime = info.currentTime; paintCounter(); }
  if (state === 0 && tapePlaying) swapTape(tapeNext());
});

const setTapes = on => {
  if (!on) {
    tapeStop();
    tapeTimers.forEach(clearTimeout);
    tapeTimers = [];
    tapePlaying = tapeSwapping = false;
    tapeDeck.classList.remove("open", "eject", "insert", "swap", "tell");
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
