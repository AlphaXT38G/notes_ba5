// ── Closing time (screen "closing", the jazz bar from 0:45 to 1:00) ──────────────────────────
// Once the neon sign has gone dark letter by letter (jazz.js, jazz.css), the bartender comes over
// the whole page to say the bar is closing (css/closing.css): the room darkens and he rises from
// the bottom of the screen, life-size, under a hanging lamp that swings as it comes down, and
// rings the last call bell, then tells you the bar is closing, with a chalkboard of what to know.
// "Good night" sends him away, waving; any other phase sends him away at once.
//
// He is one SVG drawing built from code: shirt and waistcoat, bow tie, a towel over his left arm,
// his right arm raised with a brass hand bell, and the head of the Gigachad meme, drawn in black
// and white like its photo (square jaw, slicked-back hair, side glance, huge neck), with moving
// parts (.lid, .mouth).
const BARTENDER = `<svg class="bt" viewBox="0 0 520 600" aria-hidden="true">
<defs>
<linearGradient id="bt-skin" x1="0" x2="1"><stop offset="0" stop-color="#3e3e3e"/><stop offset=".4" stop-color="#8e8e8e"/><stop offset=".72" stop-color="#d6d6d6"/><stop offset="1" stop-color="#7c7c7c"/></linearGradient>
<filter id="bt-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5"/></filter>
<linearGradient id="bt-arm" x1="0" x2="1"><stop offset="0" stop-color="#5a5a5a"/><stop offset=".5" stop-color="#a8a8a8"/><stop offset="1" stop-color="#555"/></linearGradient>
<linearGradient id="bt-shirt" x1="0" x2="1"><stop offset="0" stop-color="#cfc9bf"/><stop offset=".45" stop-color="#fbf8f2"/><stop offset="1" stop-color="#c9c2b6"/></linearGradient>
<linearGradient id="bt-vest" x1="0" x2="1"><stop offset="0" stop-color="#0b0a0b"/><stop offset=".5" stop-color="#2b2427"/><stop offset="1" stop-color="#0b0a0b"/></linearGradient>
<linearGradient id="bt-brass" x1="0" x2="1"><stop offset="0" stop-color="#6e470d"/><stop offset=".3" stop-color="#f6d27a"/><stop offset=".55" stop-color="#d9a637"/><stop offset="1" stop-color="#5e3b0a"/></linearGradient>
<linearGradient id="bt-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2e2e"/><stop offset="1" stop-color="#0e0e0e"/></linearGradient>
<linearGradient id="bt-bow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b5283f"/><stop offset="1" stop-color="#6e1222"/></linearGradient>
</defs>
<g class="left-arm">
<path d="M352,282Q408,292 412,350L418,470 372,474 362,360Z" fill="url(#bt-shirt)"/>
<path d="M370,462 420,458 422,488 370,492Z" fill="#e6e0d4" stroke="#bdb5a8"/>
<path d="M374,490 420,486 416,600 380,600Z" fill="url(#bt-arm)"/>
<path d="M360,502 432,494Q440,530 436,562L426,600 406,566 386,600 366,562Q356,530 360,502Z" fill="#f4f1ea" stroke="#d6d0c4"/>
<path d="M362,516 434,508M363,524 435,516" stroke="#b5283f" stroke-width="3"/>
</g>
<path d="M120,600 118,330Q122,285 175,268L230,250H290L345,268Q398,285 402,330L400,600Z" fill="url(#bt-shirt)"/>
<path d="M260,262V420" stroke="#d3ccc0" stroke-width="3"/>
<circle cx="260" cy="310" r="3" fill="#e9e3d8" stroke="#bdb5a8"/><circle cx="260" cy="360" r="3" fill="#e9e3d8" stroke="#bdb5a8"/>
<path d="M118,600 119,352Q124,318 150,306Q170,296 176,282L232,262 260,420V600Z" fill="url(#bt-vest)"/>
<path d="M402,600 401,352Q396,318 370,306Q350,296 344,282L288,262 260,420V600Z" fill="url(#bt-vest)"/>
<path d="M232,262 260,420 288,262" fill="none" stroke="#4a3f44" stroke-width="2"/>
<g fill="#9c8660"><circle cx="260" cy="445" r="5"/><circle cx="260" cy="485" r="5"/><circle cx="260" cy="525" r="5"/><circle cx="260" cy="565" r="5"/></g>
<path d="M160,470H200" stroke="#3a3236" stroke-width="3"/>
<path d="M180,470Q215,505 255,482" fill="none" stroke="#e1b84e" stroke-width="2.5" stroke-dasharray="3 2"/>
<path d="M216,200 210,268Q260,292 310,268L304,200Z" fill="url(#bt-arm)"/>
<path d="M226,214Q244,246 254,272M296,214Q278,246 268,272" fill="none" stroke="#3a3a3a" stroke-width="3" opacity=".6"/>
<ellipse cx="262" cy="250" rx="7" ry="9" fill="#9a9a9a" opacity=".6"/>
<path d="M232,250 260,282 240,294 222,258ZM288,250 260,282 280,294 298,258Z" fill="#fffdf8" stroke="#cfc8bc"/>
<path d="M260,274 226,258 229,294ZM260,274 294,258 291,294Z" fill="url(#bt-bow)"/>
<rect x="251" y="265" width="18" height="18" rx="5" fill="#8f1a2e"/>
<ellipse cx="208" cy="164" rx="9" ry="17" fill="#4e4e4e"/><ellipse cx="326" cy="160" rx="6" ry="15" fill="#6a6a6a"/>
<path d="M210,118Q206,160 212,196L224,236Q244,266 276,266Q306,262 317,236L325,200Q331,160 323,116Q314,70 266,66Q214,70 210,118Z" fill="url(#bt-skin)"/>
<g filter="url(#bt-soft)">
<path d="M212,120Q208,170 216,200L228,236Q240,256 256,262Q236,230 232,200Q226,160 232,120Z" fill="#1c1c1c" opacity=".55"/>
<ellipse cx="236" cy="190" rx="10" ry="18" fill="#222" opacity=".5"/>
<ellipse cx="306" cy="186" rx="7" ry="16" fill="#2a2a2a" opacity=".45"/>
<path d="M292,120Q300,150 296,176" stroke="#f2f2f2" stroke-width="8" opacity=".35"/>
<ellipse cx="282" cy="250" rx="18" ry="6" fill="#efefef" opacity=".25"/>
</g>
<path d="M212,190Q214,214 224,236Q244,266 276,266Q306,262 317,236L325,196Q316,214 302,216Q292,206 278,204Q264,202 252,206Q240,214 228,210Q216,204 212,190Z" fill="#181818" opacity=".5"/>
<path d="M210,124Q200,70 250,50Q296,38 324,78Q336,100 326,128Q320,96 300,86Q268,74 238,86Q214,98 212,126Z" fill="url(#bt-hair)"/>
<path d="M216,92Q246,58 306,64M220,102Q254,72 316,78M228,108Q262,86 320,92M240,96Q270,70 312,70" fill="none" stroke="#a0a0a0" stroke-width="2" opacity=".5"/>
<g filter="url(#bt-soft)"><ellipse cx="246" cy="146" rx="15" ry="8" fill="#141414" opacity=".8"/><ellipse cx="297" cy="145" rx="13" ry="8" fill="#141414" opacity=".7"/></g>
<path d="M226,138Q244,130 262,136L261,141Q244,137 228,143ZM280,136Q296,129 314,134L313,139Q297,136 281,141Z" fill="#0c0c0c"/>
<path d="M240,147Q247,144 254,147Q247,149 240,147ZM291,146Q298,143 304,146Q298,148 291,146Z" fill="#bdbdbd"/>
<g class="eyes"><circle cx="250" cy="146.6" r="1.9" fill="#050505"/><circle cx="300" cy="145.6" r="1.8" fill="#050505"/></g>
<ellipse class="lid" cx="247" cy="147" rx="9" ry="4" fill="#3c3c3c"/><ellipse class="lid" cx="297" cy="146" rx="8" ry="4" fill="#4a4a4a"/>
<path d="M272,138 268,184Q276,192 288,186" fill="none" stroke="#1e1e1e" stroke-width="2.6"/>
<path d="M276,142 279,178" stroke="#f4f4f4" stroke-width="3.2" opacity=".5"/>
<ellipse cx="281" cy="188" rx="4" ry="1.8" fill="#0e0e0e"/>
<g class="mouth"><ellipse cx="274" cy="217" rx="11" ry="7" fill="#0e0e0e"/><rect x="266" y="211" width="16" height="3" rx="1.5" fill="#d0d0d0"/></g>
<path d="M258,215Q274,218 292,211" fill="none" stroke="#0e0e0e" stroke-width="2.6"/>
<path d="M292,209Q297,213 294,219" fill="none" stroke="#1a1a1a" stroke-width="1.8"/>
<ellipse cx="275" cy="226" rx="9" ry="2.4" fill="#c4c4c4" opacity=".35"/>
<path d="M276,246V258" stroke="#111" stroke-width="2"/>
<g class="arm">
<path d="M170,300 80,345" stroke="url(#bt-shirt)" stroke-width="56" stroke-linecap="round"/>
<path d="M150,296Q130,318 112,316M136,330Q118,340 104,334" fill="none" stroke="#bdb5a8" stroke-width="2.5"/>
<path d="M98,336 70,350" stroke="#e6e0d4" stroke-width="60"/>
<path d="M72,342 100,218" stroke="url(#bt-arm)" stroke-width="36" stroke-linecap="round"/>
<g class="bell">
<rect x="96" y="186" width="12" height="44" rx="5" fill="#4a2a14"/>
<path d="M90,226Q86,236 84,250Q80,272 66,286H138Q124,272 120,250Q118,236 114,226Z" fill="url(#bt-brass)"/>
<ellipse cx="102" cy="286" rx="36" ry="6" fill="#8a5e18"/><circle class="clapper" cx="102" cy="293" r="6" fill="#4e3109"/>
<path d="M96,232Q92,256 80,278" fill="none" stroke="#fff3c4" stroke-width="3" opacity=".6"/>
</g>
<ellipse cx="102" cy="206" rx="22" ry="18" fill="#9a9a9a"/>
<path d="M86,198Q100,194 116,198M85,207Q100,203 118,207M87,216Q100,212 116,216" fill="none" stroke="#555" stroke-width="1.8"/>
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

// What he says, typed letter by letter in his speech bubble while his mouth moves (.talking)
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
