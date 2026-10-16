// ── Closing time (screen "closing", the jazz bar from 0:45 to 1:00) ──────────────────────────
// Once the neon sign has gone dark letter by letter (jazz.js, jazz.css), the bartender comes over
// the whole page to say the bar is closing (css/closing.css): the room darkens and he rises from
// the bottom of the screen, life-size, under a hanging lamp that swings as it comes down, and
// rings the last call bell, then tells you the bar is closing, with a chalkboard of what to know.
// "Good night" sends him away, waving; any other phase sends him away at once.
//
// He is one SVG drawing built from code: white shirt with rolled-up sleeves, charcoal waistcoat
// with satin lapels, welt pockets and a watch chain, black satin bow tie, a towel over his left
// arm, his right arm raised with a brass hand bell. To blend with the black and white photo, it is
// all in greys lit from the right like the photo, darker towards the bottom left (no SVG filter:
// the drawing is repainted while he nods and rings). His head is the Gigachad meme: the photo
// site/img/gigachad.webp (copied to dist/img/ by the build), cut out on a transparent background.
// Skin and neck are grey to match it. Its mouth cannot move, so he nods while talking (.head).
const BARTENDER = `<svg class="bt" viewBox="0 0 520 600" aria-hidden="true">
<defs>
<linearGradient id="bt-skin" x1="0" x2="1"><stop offset="0" stop-color="#4c4c4c"/><stop offset=".55" stop-color="#a9a9a9"/><stop offset=".8" stop-color="#c4c4c4"/><stop offset="1" stop-color="#6e6e6e"/></linearGradient>
<linearGradient id="bt-shirt" x1="0" x2="1"><stop offset="0" stop-color="#9e9b96"/><stop offset=".35" stop-color="#dcd9d3"/><stop offset=".7" stop-color="#f7f5f1"/><stop offset="1" stop-color="#b3b0aa"/></linearGradient>
<linearGradient id="bt-sleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f0eb"/><stop offset=".45" stop-color="#d2cfc9"/><stop offset="1" stop-color="#85827c"/></linearGradient>
<linearGradient id="bt-sleeve-side" x1="0" x2="1"><stop offset="0" stop-color="#8d8a84"/><stop offset=".55" stop-color="#e4e1dc"/><stop offset="1" stop-color="#a6a39d"/></linearGradient>
<linearGradient id="bt-towel" x1="0" x2="1"><stop offset="0" stop-color="#a9a6a0"/><stop offset=".55" stop-color="#f3f1ec"/><stop offset="1" stop-color="#b9b6b0"/></linearGradient>
<linearGradient id="bt-vest" x1="0" x2="1"><stop offset="0" stop-color="#0c0c0d"/><stop offset=".45" stop-color="#1f1f22"/><stop offset=".78" stop-color="#3a3a3f"/><stop offset="1" stop-color="#141416"/></linearGradient>
<linearGradient id="bt-lapel" x1="0" x2="1"><stop offset="0" stop-color="#18181a"/><stop offset=".5" stop-color="#4a4a50"/><stop offset="1" stop-color="#202023"/></linearGradient>
<linearGradient id="bt-satin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3c3c40"/><stop offset=".45" stop-color="#121214"/><stop offset="1" stop-color="#050505"/></linearGradient>
<linearGradient id="bt-shade" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
<linearGradient id="bt-brass" x1="0" x2="1"><stop offset="0" stop-color="#6e470d"/><stop offset=".3" stop-color="#f6d27a"/><stop offset=".55" stop-color="#d9a637"/><stop offset="1" stop-color="#5e3b0a"/></linearGradient>
<linearGradient id="bt-wood" x1="0" x2="1"><stop offset="0" stop-color="#2e1a0c"/><stop offset=".5" stop-color="#6b4325"/><stop offset="1" stop-color="#2a170a"/></linearGradient>
<radialGradient id="bt-jaw"><stop offset="0" stop-color="#111" stop-opacity=".7"/><stop offset="1" stop-color="#111" stop-opacity="0"/></radialGradient>
</defs>
<g>
<path d="M114,600 112,364Q110,314 140,294Q170,276 208,262Q232,252 242,236H284Q294,252 318,262Q356,276 386,294Q414,314 412,364L406,600Z" fill="url(#bt-shirt)"/>
<path d="M150,300Q170,330 168,372M374,300Q356,330 358,372M200,268Q214,282 226,300" fill="none" stroke="#8c8984" stroke-width="2" opacity=".5"/>
<path d="M262,292V420" stroke="#bdb9b2" stroke-width="2.5"/><circle cx="262" cy="330" r="2.6" fill="#fff" stroke="#9a968f"/><circle cx="262" cy="372" r="2.6" fill="#fff" stroke="#9a968f"/>
<path d="M112,600 112,394Q114,350 142,332Q166,318 176,298Q196,280 232,270L262,412V600Z" fill="url(#bt-vest)"/>
<path d="M412,600 412,394Q410,350 384,332Q360,318 350,298Q330,280 292,270L262,412V600Z" fill="url(#bt-vest)"/>
<path d="M232,270 262,412 250,412 222,282ZM292,270 262,412 274,412 302,282Z" fill="url(#bt-lapel)"/>
<path d="M232,270 262,412 292,270" fill="none" stroke="#5a5a60" stroke-width="1.4"/>
<path d="M176,300Q170,330 146,342M350,300Q356,330 378,342" fill="none" stroke="#000" stroke-width="3" opacity=".45"/>
<path d="M200,410Q206,500 200,600M324,410Q318,500 324,600" fill="none" stroke="#000" stroke-width="2" opacity=".35"/>
<path d="M156,482 206,474 207,481 157,489ZM318,474 368,482 367,489 317,481Z" fill="#070708"/>
<path d="M156,481 206,473M318,473 368,481" stroke="#56565c" stroke-width="1.2"/>
<path d="M262,470Q296,506 334,480" fill="none" stroke="#c9a24a" stroke-width="2.2" stroke-dasharray="2.5 1.5"/>
<g><circle cx="262" cy="436" r="4.6" fill="#0a0a0a" stroke="#5c5c62" stroke-width="1.2"/><circle cx="262" cy="470" r="4.6" fill="#0a0a0a" stroke="#5c5c62" stroke-width="1.2"/>
<circle cx="262" cy="504" r="4.6" fill="#0a0a0a" stroke="#5c5c62" stroke-width="1.2"/><circle cx="262" cy="538" r="4.6" fill="#0a0a0a" stroke="#5c5c62" stroke-width="1.2"/>
<circle cx="263.5" cy="434.5" r="1.2" fill="#9a9aa0"/><circle cx="263.5" cy="468.5" r="1.2" fill="#9a9aa0"/><circle cx="263.5" cy="502.5" r="1.2" fill="#9a9aa0"/><circle cx="263.5" cy="536.5" r="1.2" fill="#9a9aa0"/></g>
<path d="M114,600 112,364Q110,314 140,294Q170,276 208,262Q232,252 242,236H284Q294,252 318,262Q356,276 386,294Q414,314 412,364L406,600Z" fill="url(#bt-shade)"/>
<path d="M224,196 220,262Q262,282 306,262L302,196Z" fill="url(#bt-skin)"/>
<path d="M234,222Q248,248 256,272M292,222Q280,248 270,272" fill="none" stroke="#2e2e2e" stroke-width="3" opacity=".35"/>
<ellipse cx="262" cy="232" rx="50" ry="22" fill="url(#bt-jaw)"/>
<path d="M222,244Q262,262 304,244L306,256Q262,274 220,256Z" fill="#d8d5cf"/>
<path d="M222,250Q234,266 262,284L244,298Q224,288 214,262ZM304,250Q292,266 262,284L280,298Q300,288 310,262Z" fill="#f6f4f0" stroke="#a9a59e" stroke-width="1.2"/>
<path d="M216,262Q226,284 244,298M310,262Q300,284 280,298" fill="none" stroke="#8e8a83" stroke-width="1.5" opacity=".6"/>
<path d="M262,280Q246,266 230,268Q222,279 230,292Q246,294 262,284Z" fill="url(#bt-satin)"/>
<path d="M262,280Q278,266 294,268Q302,279 294,292Q278,294 262,284Z" fill="url(#bt-satin)"/>
<path d="M234,272Q246,274 256,280M290,272Q278,274 268,280" fill="none" stroke="#6a6a70" stroke-width="1.4" opacity=".8"/>
<rect x="254" y="273" width="16" height="16" rx="5" fill="#0d0d0e" stroke="#3a3a3e"/>
</g>
<g class="head"><image href="img/gigachad.webp" x="178" y="44" width="178" height="229"/></g>
<g class="left-arm">
<path d="M368,294Q412,298 424,350L432,454 384,460 374,362Z" fill="url(#bt-sleeve-side)"/>
<path d="M398,330Q404,380 400,440M384,318Q396,322 408,336" fill="none" stroke="#8c8984" stroke-width="2" opacity=".5"/>
<path d="M381,446Q408,438 434,444L437,480Q408,472 381,482Z" fill="url(#bt-sleeve-side)" stroke="#8a8780" stroke-width=".8"/>
<path d="M382,462Q408,454 436,460" fill="none" stroke="#8a8780" stroke-width="1" opacity=".7"/>
<path d="M384,482Q410,476 436,480" stroke="#000" stroke-width="3" opacity=".25"/>
<path d="M386,480Q412,474 436,478Q444,530 432,600H392Q380,540 386,480Z" fill="url(#bt-skin)"/>
<path d="M378,510Q408,502 442,508L444,566Q440,590 432,600H392Q380,572 378,510Z" fill="url(#bt-towel)"/>
<path d="M379,522Q408,514 443,520M379,527Q408,519 443,525" fill="none" stroke="#4a4a4e" stroke-width="1.6"/>
<path d="M396,512Q400,556 396,600M424,508Q430,556 424,600" fill="none" stroke="#8f8c86" stroke-width="1.4" opacity=".6"/>
<path d="M378,510Q408,502 442,508" fill="none" stroke="#000" stroke-width="3" opacity=".2"/>
<path d="M368,294Q412,298 424,350L432,454 384,460 374,362Z" fill="url(#bt-shade)" opacity=".6"/>
</g>
<g class="arm">
<path d="M182,280Q132,282 98,314Q72,338 58,364L98,384Q112,356 138,342Q168,328 184,332Z" fill="url(#bt-sleeve)"/>
<path d="M98,384Q112,356 138,342Q168,328 184,332" fill="none" stroke="#000" stroke-width="5" opacity=".18"/>
<path d="M150,296Q128,318 108,320M140,330Q118,344 100,342M120,300Q104,316 92,336" fill="none" stroke="#8c8984" stroke-width="2" opacity=".6"/>
<path d="M60,368Q50,300 82,232H120Q114,292 100,372Z" fill="url(#bt-skin)"/>
<path d="M70,340Q66,300 84,256" fill="none" stroke="#2c2c2c" stroke-width="2.5" opacity=".35"/>
<path d="M104,300Q110,270 112,244" fill="none" stroke="#e0e0e0" stroke-width="3" opacity=".35"/>
<path d="M48,352Q76,340 104,354L106,384Q76,372 50,384Z" fill="url(#bt-sleeve-side)" stroke="#8a8780" stroke-width=".8"/>
<path d="M49,368Q76,356 105,370" fill="none" stroke="#8a8780" stroke-width="1" opacity=".7"/>
<path d="M52,352Q76,342 102,352" fill="none" stroke="#000" stroke-width="3" opacity=".22"/>
<g class="bell">
<rect x="97" y="166" width="10" height="64" rx="5" fill="url(#bt-wood)"/><ellipse cx="102" cy="166" rx="7" ry="5" fill="#5a381c"/>
<path d="M90,226Q86,236 84,250Q80,272 66,286H138Q124,272 120,250Q118,236 114,226Z" fill="url(#bt-brass)"/>
<ellipse cx="102" cy="286" rx="36" ry="6" fill="#8a5e18"/><circle class="clapper" cx="102" cy="293" r="6" fill="#4e3109"/>
<path d="M96,232Q92,256 80,278" fill="none" stroke="#fff3c4" stroke-width="3" opacity=".6"/>
</g>
<path d="M80,216Q78,194 96,188H112Q126,192 124,212Q124,228 108,230H90Q80,228 80,216Z" fill="url(#bt-skin)"/>
<path d="M84,198Q100,194 120,198M83,207Q100,203 122,207M84,216Q100,212 121,216" fill="none" stroke="#3a3a3a" stroke-width="1.5" opacity=".7"/>
<path d="M86,224Q98,232 112,226" fill="none" stroke="#2a2a2a" stroke-width="1.5" opacity=".6"/>
<path d="M80,206Q74,196 84,188Q94,184 100,192" fill="#9a9a9a" stroke="#3a3a3a" stroke-width="1.2"/>
</g>
</svg>`;

const closing = document.createElement("div");
closing.id = "closing";
// The lamp hangs right above his head (.who holds the drawing and the lamp, so it follows him
// at any screen size), its light falling on him
closing.innerHTML = `<div class="shade"></div><div class="stage"><div class="who">${BARTENDER}` +
  '<div class="lamp"><div class="swing"><i class="cord"></i><i class="glow"></i><i class="cap"></i><i class="bulb"></i></div></div></div>' +
  '<div class="talk"><p class="bubble"></p><div class="board"><h2>Closing time</h2><ul>' +
  '<li>🕐 <span class="left"></span></li><li>🍸 Last orders: served</li><li>🎷 Reopens at 21:30<span class="reopen"></span></li></ul>' +
  '<button type="button" class="night-btn">Good night 👋</button></div></div></div>';
const bubble = closing.querySelector(".bubble"), board = closing.querySelector(".board");

// The chalkboard tells how long is left before 1:00, live, when the clock is in the closing slot
// (a forced ?night=closing or the armstrong code can show it at any time: then no countdown),
// and when the bar reopens
const paintBoard = () => {
  const t = clockSeconds(), inSlot = t >= 45 * 60 && t < 3600;
  const left = 3600 - t, reopen = (21 * 3600 + 30 * 60 - t + 86400) % 86400;
  board.querySelector(".left").textContent = inSlot ? `Closing at 1:00, ${Math.floor(left / 60)} min ${String(left % 60).padStart(2, "0")} s left` : "The bar is closing";
  board.querySelector(".reopen").textContent = reopen ? ` (in ${Math.floor(reopen / 3600)} h ${String(Math.floor(reopen / 60) % 60).padStart(2, "0")})` : "";
};
everySecond.push(() => { if (closing.isConnected) paintBoard(); });
// Last call bell: a few strokes of a brass hand bell, made with the Web Audio API (no file to
// load). A bell is a sum of inharmonic partials that ring and die away, the high ones faster.
// Browsers only allow sound after a user gesture: without one the bell rings silently.
const ringBell = (strokes = 4) => {
  if (!(navigator.userActivation?.hasBeenActive) || !window.AudioContext) return;
  const ac = new AudioContext(), out = ac.createGain();
  out.gain.value = .35;
  out.connect(ac.destination);
  for (let i = 0; i < strokes; i++) {
    const t = ac.currentTime + .05 + i * .3, pitch = i % 2 ? 1.02 : 1;  // the bell swings both ways
    [[1, .5], [2.76, .25], [5.4, .12], [8.93, .06]].forEach(([ratio, level], k) => {
      const osc = ac.createOscillator(), env = ac.createGain();
      osc.frequency.value = 1150 * pitch * ratio;
      env.gain.setValueAtTime(.0001, t);
      env.gain.exponentialRampToValueAtTime(level, t + .004);
      env.gain.exponentialRampToValueAtTime(.0001, t + 1.8 / (1 + k));
      osc.connect(env).connect(out);
      osc.start(t);
      osc.stop(t + 2);
    });
  }
  setTimeout(() => ac.close(), strokes * 300 + 2500);
};

// What he says, typed letter by letter in his speech bubble while he nods (.talking)
const CLOSING_WORDS = ["Mesdames, messieurs… on ferme !", "Dernier verre servi, les chaises montent sur les tables.",
  "Rentrez bien. Le jazz reprend demain soir, 21h30."];
const say = (lines, done) => {
  const [text, ...rest] = lines, line = [...text], span = document.createElement("span");  // [...]: emoji stay whole
  bubble.append(span);
  closing.classList.add("talking");
  let n = 0;
  const type = () => {
    span.textContent = line.slice(0, ++n).join("");
    if (n < line.length) return later(line[n - 1].match(/[,.…!]/) ? 260 : 38, type);  // breathes at punctuation
    closing.classList.remove("talking");
    if (rest.length) later(650, () => say(rest, done)); else done?.();
  };
  type();
};

// The scene, step by step: timers are kept so that leaving the bar cancels whatever is planned
let closingTimer = null, sceneTimers = [];
const later = (ms, fn) => sceneTimers.push(setTimeout(fn, ms));
// With reduced motion he is simply there, everything said at once, and leaves at once.
const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const closeBar = () => {  // he arrives once the last letter of the sign (and the sax) is off
  closing.className = "";
  bubble.replaceChildren();
  bubble.classList.remove("on");
  board.classList.remove("on");
  paintBoard();
  document.body.append(closing);
  if (calm()) {
    bubble.innerHTML = CLOSING_WORDS.map(w => `<span>${w}</span>`).join("");
    bubble.classList.add("on");
    board.classList.add("on");
    return;
  }
  later(1500, () => { closing.classList.add("ring"); ringBell(); });  // up on his feet, he rings
  later(2700, () => closing.classList.remove("ring"));
  later(2900, () => { bubble.classList.add("on"); say(CLOSING_WORDS, () => board.classList.add("on")); });
};
const leaveBar = () => {
  clearTimeout(closingTimer);
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  closing.remove();
};
// Good night: the button, a click anywhere or Escape. He waves with his bell, says good night, then
// goes back down, the lamp goes up and the room comes back.
const byeBar = () => {
  if (!closing.isConnected || closing.classList.contains("bye")) return;
  if (calm()) return leaveBar();
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  closing.classList.remove("ring", "talking");
  closing.classList.add("bye");
  bubble.replaceChildren();
  bubble.classList.add("on");
  ringBell(2);
  say(["Bonne nuit ! 👋"]);
  later(1500, () => closing.classList.add("gone"));
  later(2700, leaveBar);
};
closing.addEventListener("click", byeBar);
document.addEventListener("keydown", e => { if (e.key === "Escape") byeBar(); });
document.addEventListener("phase", e => {
  leaveBar();
  if (e.detail === "closing") closingTimer = setTimeout(closeBar, (1 + (titleText.length + 1) * .7 + .5) * 1000);
});
