// ── Closing time (screen "closing", the jazz bar from 0:45 to 1:00) ──────────────────────────
// Once the neon sign has gone dark letter by letter (jazz.js, jazz.css), the bartender comes over
// the whole page to say the bar is closing (css/closing.css): the room darkens and he rises from
// the bottom of the screen, life-size, under a hanging lamp that swings as it comes down, and
// rings the last call bell. Any other phase sends him away at once.
//
// He is one SVG drawing built from code: shirt and waistcoat, bow tie, a towel over his left arm,
// his right arm raised with a brass hand bell, and a face with moving parts (.lid, .mouth).
const BARTENDER = `<svg class="bt" viewBox="0 0 520 600" aria-hidden="true">
<defs>
<radialGradient id="bt-skin" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="#f3c9a5"/><stop offset=".6" stop-color="#dba079"/><stop offset="1" stop-color="#b5755a"/></radialGradient>
<linearGradient id="bt-arm" x1="0" x2="1"><stop offset="0" stop-color="#c48463"/><stop offset=".5" stop-color="#e8b18c"/><stop offset="1" stop-color="#b9795b"/></linearGradient>
<linearGradient id="bt-shirt" x1="0" x2="1"><stop offset="0" stop-color="#cfc9bf"/><stop offset=".45" stop-color="#fbf8f2"/><stop offset="1" stop-color="#c9c2b6"/></linearGradient>
<linearGradient id="bt-vest" x1="0" x2="1"><stop offset="0" stop-color="#0b0a0b"/><stop offset=".5" stop-color="#2b2427"/><stop offset="1" stop-color="#0b0a0b"/></linearGradient>
<linearGradient id="bt-brass" x1="0" x2="1"><stop offset="0" stop-color="#6e470d"/><stop offset=".3" stop-color="#f6d27a"/><stop offset=".55" stop-color="#d9a637"/><stop offset="1" stop-color="#5e3b0a"/></linearGradient>
<linearGradient id="bt-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d2c21"/><stop offset="1" stop-color="#1a120d"/></linearGradient>
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
<path d="M232,205V262Q260,284 288,262V205Z" fill="#c98b67"/>
<ellipse cx="260" cy="228" rx="30" ry="10" fill="#a76a4f" opacity=".6"/>
<path d="M232,250 260,282 240,294 222,258ZM288,250 260,282 280,294 298,258Z" fill="#fffdf8" stroke="#cfc8bc"/>
<path d="M260,274 226,258 229,294ZM260,274 294,258 291,294Z" fill="url(#bt-bow)"/>
<rect x="251" y="265" width="18" height="18" rx="5" fill="#8f1a2e"/>
<ellipse cx="198" cy="158" rx="12" ry="20" fill="#d29672"/><ellipse cx="322" cy="158" rx="12" ry="20" fill="#d29672"/>
<path d="M200,150Q195,160 200,170M320,150Q325,160 320,170" fill="none" stroke="#a96a4e" stroke-width="2"/>
<path d="M198,140Q196,215 236,238Q260,250 284,238Q324,215 322,140Q322,70 260,70Q198,70 198,140Z" fill="url(#bt-skin)"/>
<path d="M204,178Q212,222 240,238Q260,248 280,238Q308,222 316,178Q300,216 260,222Q220,216 204,178Z" fill="#4a3022" opacity=".13"/>
<path d="M196,142Q192,70 260,62Q328,70 324,142Q320,104 294,98Q262,88 228,98Q200,104 196,142Z" fill="url(#bt-hair)"/>
<path d="M214,92Q250,80 300,90M222,100Q258,88 296,98" fill="none" stroke="#5a4535" stroke-width="2" opacity=".7"/>
<path d="M196,142Q195,122 204,110L206,140ZM324,142Q325,122 316,110L314,140Z" fill="#9a948e"/>
<path d="M222,127Q238,116 253,124M267,124Q282,116 298,127" fill="none" stroke="#2a1c14" stroke-width="7" stroke-linecap="round"/>
<ellipse cx="238" cy="145" rx="11" ry="6.5" fill="#f7f1ea"/><ellipse cx="282" cy="145" rx="11" ry="6.5" fill="#f7f1ea"/>
<g class="eyes"><circle cx="239" cy="145" r="5" fill="#4a3020"/><circle cx="281" cy="145" r="5" fill="#4a3020"/>
<circle cx="239" cy="145" r="2.4" fill="#120a06"/><circle cx="281" cy="145" r="2.4" fill="#120a06"/>
<circle cx="241" cy="143" r="1.4" fill="#fff"/><circle cx="283" cy="143" r="1.4" fill="#fff"/></g>
<ellipse class="lid" cx="238" cy="145" rx="12" ry="7.5" fill="#d69c77"/><ellipse class="lid" cx="282" cy="145" rx="12" ry="7.5" fill="#d69c77"/>
<path d="M226,143Q238,134 250,143M270,143Q282,134 294,143" fill="none" stroke="#6b4030" stroke-width="2.2"/>
<path d="M228,155Q238,159 248,155M272,155Q282,159 292,155" fill="none" stroke="#8a5038" stroke-width="1.5" opacity=".45"/>
<ellipse cx="224" cy="180" rx="14" ry="9" fill="#e0646a" opacity=".16"/><ellipse cx="296" cy="180" rx="14" ry="9" fill="#e0646a" opacity=".16"/>
<path d="M258,140 252,182Q260,190 270,182" fill="none" stroke="#9a5a3e" stroke-width="2.5" opacity=".7"/>
<ellipse cx="262" cy="176" rx="6" ry="4" fill="#ffe2c6" opacity=".45"/>
<path d="M240,186Q232,200 236,214M280,186Q288,200 284,214" fill="none" stroke="#9a5a3e" stroke-width="1.6" opacity=".4"/>
<g class="mouth"><ellipse cx="260" cy="213" rx="11" ry="8" fill="#4a1712"/><ellipse cx="260" cy="218" rx="7" ry="3" fill="#c0525a"/><rect x="252" y="205" width="16" height="3" rx="1.5" fill="#f2ece2"/></g>
<path d="M260,196Q244,190 230,200Q214,210 206,198Q204,208 214,212Q232,216 246,206Q254,203 260,206Q266,203 274,206Q288,216 306,212Q316,208 314,198Q306,210 290,200Q276,190 260,196Z" fill="#2b1d16"/>
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
<ellipse cx="102" cy="206" rx="22" ry="18" fill="#dca07a"/>
<path d="M86,198Q100,194 116,198M85,207Q100,203 118,207M87,216Q100,212 116,216" fill="none" stroke="#a96a4e" stroke-width="1.8"/>
</g>
</svg>`;

const closing = document.createElement("div");
closing.id = "closing";
closing.innerHTML = '<div class="shade"></div><div class="lamp"><div class="swing"><i class="cord"></i><i class="glow"></i><i class="cap"></i><i class="bulb"></i></div></div>' +
  `<div class="stage">${BARTENDER}</div>`;
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

// The scene, step by step: timers are kept so that leaving the bar cancels whatever is planned
let closingTimer = null, sceneTimers = [];
const later = (ms, fn) => sceneTimers.push(setTimeout(fn, ms));
const closeBar = () => {  // he arrives once the last letter of the sign (and the sax) is off
  closing.className = "";
  document.body.append(closing);
  later(1500, () => { closing.classList.add("ring"); ringBell(); });  // up on his feet, he rings
  later(2700, () => closing.classList.remove("ring"));
};
const leaveBar = () => {
  clearTimeout(closingTimer);
  sceneTimers.forEach(clearTimeout);
  sceneTimers = [];
  closing.remove();
};
closing.addEventListener("click", leaveBar);
document.addEventListener("phase", e => {
  leaveBar();
  if (e.detail === "closing") closingTimer = setTimeout(closeBar, (1 + (titleText.length + 1) * .7 + .5) * 1000);
});
