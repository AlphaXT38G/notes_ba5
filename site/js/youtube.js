// ── YouTube players (the day's cassettes, the Christmas radio) ──
// The music still played from YouTube: hidden <iframe>s driven by postMessage commands, as the
// YouTube iframe API does, without loading its script. Two things the plain embed did badly:
// - Ads. A video may open with an ad (and a long mix or a live may break for more), played at
//   full volume where the music was expected. The embed does not say when an ad plays, but the
//   video's own clock (the time it reports) stands still meanwhile. So a player stays muted until
//   its video's time moves, and is muted again whenever that time stops moving while it should
//   play: what is heard is only the music, from its first note.
// - Ads again and again. A player was removed with its tape and a new one, with a new ad, made
//   when the tape came back. Now a player, once made, stays in the page (paused, out of sight),
//   so coming back to a video plays on where it was, with no ad. And ytWarm() makes the players
//   ahead, muted, lets them go through their ads, then pauses them at the start of the music:
//   picking one later plays the music at once.
// One player per video, shared by its users (the cassette deck and the Christmas turntable may
// both play the Christmas radio): the last to play it owns it, and only the owner pauses it.
//   ytWarm(id)                      makes the player ahead: muted, its ad played, then paused
//   ytPlay(id, owner, sound)        plays it; owner: an object, with optional onTime(t) / onEnd()
//   ytPause(id, owner)              pauses it, if owner still has it
//   ytSound(id, owner, on)          sound on / off (it stays muted during ads anyway)
//   ytSeek(id, owner, t)            goes to t seconds
//   ytPlayer(id)                    the player: { ready, time, state, warm, ... }
const YT_PLAYERS = {};
const YT_STILL_MS = () => document.hidden ? 3000 : 1200;  // time standing still for this long: an ad
let ytTicker = null;

const ytCommand = (p, func, args = []) =>
  p.frame.contentWindow && p.frame.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
const ytPlayer = id => {
  if (YT_PLAYERS[id]) return YT_PLAYERS[id];
  const frame = document.createElement("iframe");
  frame.className = "ytplayer";
  frame.title = "Music";
  frame.allow = "autoplay; encrypted-media";
  // Muted from the start: the sound comes on with the music, never with an ad (ytHear)
  frame.src = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&enablejsapi=1`;
  const p = YT_PLAYERS[id] = {
    id, frame, ready: false, state: -1, time: 0, movedAt: 0, muted: true, mutedAt: 0,
    want: "play", owner: null, sound: false, warm: false, music: false, live: false, duration: 0, ad: false,
  };
  // Ask the player to report its state and time: again and again until it answers, since it
  // does not listen yet when the frame has just loaded
  frame.addEventListener("load", () => {
    let tries = 0;
    const ask = () => {
      if (p.ready || ++tries > 20) return;
      frame.contentWindow.postMessage(JSON.stringify({ event: "listening", id, channel: "widget" }), "*");
      setTimeout(ask, 500);
    };
    ask();
  });
  document.body.append(frame);
  ytTick();
  return p;
};

// The sound is on only when wanted, and while the video's own time moves (no ad, not stalled).
// The player says whether it is muted; when that differs from what it should be, the command is
// sent again (at most twice a second: the player may answer late).
const ytHear = p => {
  if (!p.ready) return;
  const hear = p.want === "play" && p.sound && performance.now() - p.movedAt < YT_STILL_MS();
  if (hear === !p.muted || performance.now() - p.mutedAt < 500) return;
  p.mutedAt = performance.now();
  ytCommand(p, hear ? "unMute" : "mute");
};
// Every quarter of a second while a player plays or warms up: a time that stopped moving is
// noticed even when the player sends nothing (it reports changes only). Asleep otherwise.
const ytTick = () => {
  if (ytTicker) return;
  ytTicker = setInterval(() => {
    const busy = Object.keys(YT_PLAYERS).map(id => YT_PLAYERS[id]).filter(p => p.want === "play" || p.warm);
    busy.forEach(ytHear);
    if (!busy.length) { clearInterval(ytTicker); ytTicker = null; }
  }, 250);
};

// What the players report: that they are ready (commands now work), whether they are muted, their
// video's time and their state (1 = playing, 0 = the video has ended)
window.addEventListener("message", e => {
  if (typeof e.data !== "string" || e.data.charAt(0) !== "{") return;
  const id = Object.keys(YT_PLAYERS).find(k => YT_PLAYERS[k].frame.contentWindow === e.source);
  if (!id) return;
  const p = YT_PLAYERS[id];
  let msg;
  try { msg = JSON.parse(e.data); } catch (err) { return; }
  const info = msg.info && typeof msg.info === "object" ? msg.info : {};
  const state = msg.event === "onStateChange" ? msg.info : info.playerState;
  if (!p.ready && (msg.event === "onReady" || msg.event === "initialDelivery" || state !== undefined)) {
    p.ready = true;
    // It autoplays: a player paused before it was ready is paused now
    if (p.want === "pause" && !p.warm) ytCommand(p, "pauseVideo");
  }
  if (typeof info.muted === "boolean") p.muted = info.muted;
  if (typeof state === "number") p.state = state;
  // The video, as first reported (a live has no fixed length)
  const data = info.videoData;
  if (data && data.video_id === id && !p.duration) p.live = !!data.isLive;
  if (typeof info.duration === "number" && info.duration > 0 && !p.duration && !(data && data.video_id !== id)) p.duration = info.duration;
  // Other signs of an ad, in case the player ever reports the ad's own time: another video, a
  // length that is not the video's (not for a live), or an event named after it. Meanwhile the
  // video's time is taken as standing still.
  if (data && data.video_id) p.ad = data.video_id !== id;
  else if (typeof info.duration === "number" && p.duration && !p.live) p.ad = Math.abs(info.duration - p.duration) > 2;
  if (/ad(start|break|play)/i.test(msg.event)) p.ad = true;
  if (/ad(end|complete)/i.test(msg.event)) p.ad = false;
  if (p.ad) p.movedAt = 0;
  if (typeof info.currentTime === "number") {
    if (!p.ad && Math.abs(info.currentTime - p.time) > 0.01 && p.state === 1) {
      p.movedAt = performance.now();
      p.music = true;
    }
    p.time = info.currentTime;
    if (p.owner && p.owner.onTime && p.want === "play") p.owner.onTime(p.time);
  }
  // Warming up: the music has started (the ad, if any, is over), so it waits there, at the start
  if (p.warm && p.music) {
    p.warm = false;
    if (p.want !== "play") {
      ytCommand(p, "pauseVideo");
      if (!p.live) { ytCommand(p, "seekTo", [0, true]); p.time = 0; }  // a live plays on from there
    }
  }
  if (state === 0 && p.want === "play" && p.owner && p.owner.onEnd) p.owner.onEnd();
  ytHear(p);
});

const ytWarm = id => {
  if (YT_PLAYERS[id]) return;
  const p = ytPlayer(id);
  p.want = "pause";
  p.warm = true;
};
const ytPlay = (id, owner, sound) => {
  const p = ytPlayer(id);
  p.owner = owner;
  p.want = "play";
  p.sound = sound;
  p.warm = false;
  if (p.ready) ytCommand(p, "playVideo");
  ytTick();
  ytHear(p);
  return p;
};
const ytPause = (id, owner) => {
  const p = YT_PLAYERS[id];
  if (!p || p.owner !== owner) return;
  p.want = "pause";
  if (p.ready && !p.warm) ytCommand(p, "pauseVideo");
  ytHear(p);
};
const ytSound = (id, owner, on) => {
  const p = YT_PLAYERS[id];
  if (!p || p.owner !== owner) return;
  p.sound = on;
  ytHear(p);
};
const ytSeek = (id, owner, t) => {
  const p = YT_PLAYERS[id];
  if (!p || p.owner !== owner || !p.ready) return;
  ytCommand(p, "seekTo", [t, true]);
  p.time = t;
};
