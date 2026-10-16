// ── Closing time (screen "closing", the jazz bar from 0:45 to 1:00) ──────────────────────────
// Once the neon sign has gone dark letter by letter (jazz.js, jazz.css), the bartender comes over
// the whole page to say the bar is closing (css/closing.css): the room darkens and he rises from
// the bottom of the screen, life-size, under a hanging lamp that swings as it comes down, and
// rings the last call bell, then tells you the bar is closing, with a chalkboard of what to know.
// "Good night" sends him away, waving; any other phase sends him away at once.
//
// He is made of layers stacked in .bt, all on the same 520 x 600 canvas: his body (white shirt
// with rolled-up sleeves, charcoal wool waistcoat with satin lapels, welt pockets and a watch
// chain, black satin bow tie, a towel over his left arm), his raised right arm, the brass hand
// bell and its clapper, the hand holding it, and his head: the Gigachad meme photo
// site/img/gigachad.webp (copied to dist/img/ by the build), cut out on a transparent background.
//
// Each drawn layer is an SVG shown as an <img>: the browser renders it once into a bitmap, filters
// included, and the animations (bell, arm, nod) only move those bitmaps. So the drawing can afford
// effects far too slow to redo on every frame: wool and cotton textures (noise lit by a light from
// the right, like the photo), soft blurred shadows and folds, satin sheen and a film grain. All in
// greys, to blend with the black and white photo; only the brass and the watch chain keep colour.
const BT_DEFS = `
<linearGradient id="skin" x1="0" x2="1"><stop offset="0" stop-color="#505050"/><stop offset=".55" stop-color="#a6a6a6"/><stop offset=".8" stop-color="#c8c8c8"/><stop offset="1" stop-color="#727272"/></linearGradient>
<linearGradient id="shirt" x1="0" x2="1"><stop offset="0" stop-color="#a7a49f"/><stop offset=".35" stop-color="#e2dfda"/><stop offset=".7" stop-color="#fbfaf7"/><stop offset="1" stop-color="#bdbab4"/></linearGradient>
<linearGradient id="sleeve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f6f2"/><stop offset=".45" stop-color="#d9d6d0"/><stop offset="1" stop-color="#8e8b85"/></linearGradient>
<linearGradient id="sleeve-side" x1="0" x2="1"><stop offset="0" stop-color="#97948e"/><stop offset=".6" stop-color="#eeebe6"/><stop offset="1" stop-color="#aeaba5"/></linearGradient>
<linearGradient id="vest" x1="0" x2="1"><stop offset="0" stop-color="#101012"/><stop offset=".45" stop-color="#26262a"/><stop offset=".78" stop-color="#46464c"/><stop offset="1" stop-color="#18181b"/></linearGradient>
<linearGradient id="lapel" x1="0" x2="1"><stop offset="0" stop-color="#1a1a1d"/><stop offset=".5" stop-color="#5a5a62"/><stop offset="1" stop-color="#232327"/></linearGradient>
<linearGradient id="satin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a50"/><stop offset=".4" stop-color="#141416"/><stop offset="1" stop-color="#050505"/></linearGradient>
<linearGradient id="towel" x1="0" x2="1"><stop offset="0" stop-color="#a3a09a"/><stop offset=".55" stop-color="#f4f2ee"/><stop offset="1" stop-color="#b6b3ad"/></linearGradient>
<linearGradient id="shade" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
<linearGradient id="brass" x1="0" x2="1"><stop offset="0" stop-color="#5e3b0a"/><stop offset=".28" stop-color="#e9bf5e"/><stop offset=".4" stop-color="#fff0b8"/><stop offset=".6" stop-color="#c8922a"/><stop offset="1" stop-color="#4e3008"/></linearGradient>
<linearGradient id="wood" x1="0" x2="1"><stop offset="0" stop-color="#2a1709"/><stop offset=".5" stop-color="#6e4627"/><stop offset="1" stop-color="#26150a"/></linearGradient>
<radialGradient id="jaw"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="soft3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
<filter id="cotton" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75 .5" numOctaves="2" seed="7" result="n"/>
<feDiffuseLighting in="n" surfaceScale=".35" lighting-color="#fff" result="l"><feDistantLight azimuth="-35" elevation="60"/></feDiffuseLighting>
<feComponentTransfer in="l" result="l2"><feFuncR type="linear" slope="1.1"/><feFuncG type="linear" slope="1.1"/><feFuncB type="linear" slope="1.1"/></feComponentTransfer>
<feBlend in="SourceGraphic" in2="l2" mode="multiply" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>
<filter id="wool" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".6 .22" numOctaves="2" seed="3" result="n"/>
<feDiffuseLighting in="n" surfaceScale=".22" lighting-color="#fff" result="l"><feDistantLight azimuth="-35" elevation="50"/></feDiffuseLighting>
<feComponentTransfer in="l" result="l2"><feFuncR type="linear" slope="1.16"/><feFuncG type="linear" slope="1.16"/><feFuncB type="linear" slope="1.16"/></feComponentTransfer>
<feBlend in="SourceGraphic" in2="l2" mode="multiply" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>
<filter id="pores" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".45" numOctaves="2" seed="11" result="n"/>
<feDiffuseLighting in="n" surfaceScale=".5" lighting-color="#fff" result="l"><feDistantLight azimuth="-35" elevation="55"/></feDiffuseLighting>
<feComponentTransfer in="l" result="l2"><feFuncR type="linear" slope="1.12"/><feFuncG type="linear" slope="1.12"/><feFuncB type="linear" slope="1.12"/></feComponentTransfer>
<feBlend in="SourceGraphic" in2="l2" mode="multiply" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="1" stitchTiles="stitch" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 .45 0 0 0 0 .45 0 0 0 0 .45 .16 .16 .16 0 -.2" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in" result="s"/>
<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="s"/></feMerge></filter>`;
// One layer: an SVG image on the shared canvas (encoded as a data: URL, rendered once)
const btLayer = (cls, body) => `<img class="${cls}" alt="" src="data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 600" width="520" height="600"><defs>${BT_DEFS}</defs><g filter="url(#grain)">${body}</g></svg>`)}">`;
const TORSO = "M114,600 112,364Q110,314 140,294Q170,276 208,262Q232,252 242,236H284Q294,252 318,262Q356,276 386,294Q414,314 412,364L406,600Z";
const BT_BODY = `
<path d="${TORSO}" fill="url(#shirt)" filter="url(#cotton)"/>
<ellipse cx="306" cy="334" rx="62" ry="40" fill="#fff" opacity=".35" filter="url(#soft)"/>
<g fill="none" stroke-linecap="round" filter="url(#soft3)">
<path d="M148,300Q172,330 170,384M196,272Q214,290 224,310" stroke="#000" stroke-width="6" opacity=".22"/>
<path d="M156,300Q180,330 178,384" stroke="#fff" stroke-width="4" opacity=".4"/>
<path d="M374,300Q352,332 354,384" stroke="#000" stroke-width="6" opacity=".18"/>
<path d="M366,300Q344,332 346,384" stroke="#fff" stroke-width="4" opacity=".45"/></g>
<path d="M262,292V420" stroke="#b9b5ae" stroke-width="2.4"/><path d="M265,292V420" stroke="#fff" stroke-width="1" opacity=".7"/>
<g fill="#fdfcfa" stroke="#8f8b84" stroke-width=".8"><circle cx="262" cy="330" r="2.6"/><circle cx="262" cy="372" r="2.6"/></g>
<g filter="url(#wool)"><path d="M112,600 112,394Q114,350 142,332Q166,318 176,298Q196,280 232,270L262,412V600Z" fill="url(#vest)"/>
<path d="M412,600 412,394Q410,350 384,332Q360,318 350,298Q330,280 292,270L262,412V600Z" fill="url(#vest)"/></g>
<path d="M232,270 262,412 250,412 222,282ZM292,270 262,412 274,412 302,282Z" fill="url(#lapel)"/>
<path d="M296,280 270,404" stroke="#fff" stroke-width="2.5" opacity=".28" filter="url(#soft3)"/>
<path d="M232,270 262,412 292,270" fill="none" stroke="#000" stroke-width="7" opacity=".35" filter="url(#soft3)"/>
<path d="M176,300Q170,330 146,342M350,300Q356,330 378,342" fill="none" stroke="#000" stroke-width="8" opacity=".4" filter="url(#soft3)"/>
<path d="M340,310Q376,340 384,430Q388,510 380,600" fill="none" stroke="#fff" stroke-width="22" opacity=".08" filter="url(#soft)"/>
<path d="M200,410Q206,500 200,600M324,410Q318,500 324,600" fill="none" stroke="#000" stroke-width="3" opacity=".35" filter="url(#soft3)"/>
<path d="M324,410Q318,500 324,600" fill="none" stroke="#fff" stroke-width="1.2" opacity=".12" transform="translate(2)"/>
<path d="M156,482 206,474 207,481 157,489ZM318,474 368,482 367,489 317,481Z" fill="#050506"/>
<path d="M156,481 206,473M318,473 368,481" stroke="#6a6a72" stroke-width="1"/>
<path d="M262,470Q296,508 334,480" fill="none" stroke="#000" stroke-width="3" opacity=".4" filter="url(#soft3)" transform="translate(1 3)"/>
<path d="M262,470Q296,508 334,480" fill="none" stroke="#b8902e" stroke-width="2.4" stroke-dasharray="2.6 1.4"/>
<path d="M262,470Q296,508 334,480" fill="none" stroke="#fff3c2" stroke-width=".8" stroke-dasharray="1 3" opacity=".8"/>
${[436, 470, 504, 538].map(y => `<circle cx="263" cy="${y + 2}" r="5" fill="#000" opacity=".5" filter="url(#soft3)"/><circle cx="262" cy="${y}" r="4.6" fill="#0a0a0b" stroke="#55555c" stroke-width="1"/><circle cx="263.6" cy="${y - 1.6}" r="1.3" fill="#c4c4ca"/>`).join("")}
<path d="${TORSO}" fill="url(#shade)"/>
<path d="M224,196 220,262Q262,282 306,262L302,196Z" fill="url(#skin)" filter="url(#pores)"/>
<path d="M236,222Q248,248 256,272M290,222Q280,248 270,272" fill="none" stroke="#000" stroke-width="5" opacity=".25" filter="url(#soft3)"/>
<ellipse cx="264" cy="234" rx="54" ry="24" fill="url(#jaw)"/>
<path d="M222,244Q262,262 304,244L306,256Q262,274 220,256Z" fill="#d6d3cd" filter="url(#cotton)"/>
<path d="M216,258Q262,286 310,258" fill="none" stroke="#000" stroke-width="8" opacity=".35" filter="url(#soft3)"/>
<path d="M222,250Q234,266 262,284L244,298Q224,288 214,262ZM304,250Q292,266 262,284L280,298Q300,288 310,262Z" fill="#f7f6f2" stroke="#9c988f" stroke-width=".8" filter="url(#cotton)"/>
<path d="M216,264Q228,286 244,298M310,264Q300,286 280,298" fill="none" stroke="#000" stroke-width="4" opacity=".28" filter="url(#soft3)"/>
<path d="M246,296Q262,306 280,296" fill="none" stroke="#000" stroke-width="6" opacity=".3" filter="url(#soft3)"/>
<path d="M262,280Q246,266 230,268Q222,279 230,292Q246,294 262,284Z" fill="url(#satin)"/>
<path d="M262,280Q278,266 294,268Q302,279 294,292Q278,294 262,284Z" fill="url(#satin)"/>
<path d="M236,272Q248,274 257,280M288,272Q277,274 267,280M234,288Q246,288 256,284" fill="none" stroke="#9a9aa2" stroke-width="1.6" opacity=".55" filter="url(#soft3)"/>
<rect x="254" y="273" width="16" height="16" rx="5" fill="#0b0b0c"/><path d="M257,276Q262,274 267,276" stroke="#8a8a92" stroke-width="1.2" fill="none" opacity=".7"/>
<path d="M366,300Q404,310 410,360L414,470" fill="none" stroke="#000" stroke-width="14" opacity=".35" filter="url(#soft)"/>
<path d="M368,294Q412,298 424,350L432,454 384,460 374,362Z" fill="url(#sleeve-side)" filter="url(#cotton)"/>
<g fill="none" stroke-linecap="round" filter="url(#soft3)"><path d="M396,330Q404,384 398,444M384,318Q398,322 410,338" stroke="#000" stroke-width="5" opacity=".22"/>
<path d="M402,330Q410,384 404,444" stroke="#fff" stroke-width="3" opacity=".45"/></g>
<path d="M384,482Q410,476 436,480" stroke="#000" stroke-width="8" opacity=".35" filter="url(#soft3)"/>
<path d="M386,480Q412,474 436,478Q444,530 432,600H392Q380,540 386,480Z" fill="url(#skin)" filter="url(#pores)"/>
<path d="M392,490Q386,540 394,600" fill="none" stroke="#000" stroke-width="6" opacity=".25" filter="url(#soft3)"/>
<path d="M381,446Q408,438 434,444L437,480Q408,472 381,482Z" fill="url(#sleeve-side)" filter="url(#cotton)"/>
<path d="M382,462Q408,454 436,460" fill="none" stroke="#000" stroke-width="2.5" opacity=".3" filter="url(#soft3)"/>
<path d="M376,512Q408,504 444,510" fill="none" stroke="#000" stroke-width="9" opacity=".35" filter="url(#soft3)"/>
<path d="M378,510Q408,502 442,508L444,566Q440,590 432,600H392Q380,572 378,510Z" fill="url(#towel)" filter="url(#cotton)"/>
<path d="M379,522Q408,514 443,520M379,527Q408,519 443,525" fill="none" stroke="#3e3e44" stroke-width="1.6" opacity=".85"/>
<g fill="none" filter="url(#soft3)"><path d="M396,512Q400,556 396,600M424,508Q430,556 424,600" stroke="#000" stroke-width="4" opacity=".22"/>
<path d="M410,510Q414,556 410,600" stroke="#fff" stroke-width="4" opacity=".5"/></g>
<path d="M368,294Q412,298 424,350L432,454 384,460 374,362Z" fill="url(#shade)" opacity=".6"/>`;
const BT_ARM = `
<path d="M182,280Q132,282 98,314Q72,338 58,364L98,384Q112,356 138,342Q168,328 184,332Z" fill="url(#sleeve)" filter="url(#cotton)"/>
<g fill="none" stroke-linecap="round" filter="url(#soft3)"><path d="M150,296Q128,318 108,322M140,330Q118,344 100,344M122,300Q104,316 92,338" stroke="#000" stroke-width="5" opacity=".2"/>
<path d="M146,292Q124,312 104,316M126,296Q108,310 96,330" stroke="#fff" stroke-width="3" opacity=".5"/>
<path d="M98,384Q112,356 138,342Q168,328 184,332" stroke="#000" stroke-width="10" opacity=".25"/></g>
<path d="M60,368Q50,300 82,232H120Q114,292 100,372Z" fill="url(#skin)" filter="url(#pores)"/>
<g fill="none" filter="url(#soft3)"><path d="M66,350Q60,300 82,250" stroke="#000" stroke-width="7" opacity=".3"/><path d="M106,330Q112,280 114,244" stroke="#fff" stroke-width="5" opacity=".3"/>
<path d="M86,330Q90,290 98,250" stroke="#000" stroke-width="3" opacity=".15"/></g>
<path d="M52,352Q76,342 102,352" fill="none" stroke="#000" stroke-width="8" opacity=".3" filter="url(#soft3)" transform="translate(0 -6)"/>
<path d="M48,352Q76,340 104,354L106,384Q76,372 50,384Z" fill="url(#sleeve-side)" filter="url(#cotton)"/>
<path d="M49,368Q76,356 105,370" fill="none" stroke="#000" stroke-width="2.5" opacity=".3" filter="url(#soft3)"/>`;
const BT_BELL = `
<rect x="97" y="166" width="10" height="64" rx="5" fill="url(#wood)"/><ellipse cx="102" cy="166" rx="7" ry="5" fill="#5a381c"/>
<path d="M100,170V226" stroke="#a07048" stroke-width="1" opacity=".5"/>
<path d="M90,226Q86,236 84,250Q80,272 66,286H138Q124,272 120,250Q118,236 114,226Z" fill="url(#brass)"/>
<ellipse cx="102" cy="286" rx="36" ry="6" fill="#6e4a12"/><ellipse cx="102" cy="285" rx="33" ry="4" fill="#2e1d05"/>
<path d="M95,234Q90,258 78,278" fill="none" stroke="#fff" stroke-width="4" opacity=".7" filter="url(#soft3)"/>
<path d="M112,236Q116,260 128,280" fill="none" stroke="#000" stroke-width="5" opacity=".25" filter="url(#soft3)"/>`;
const BT_CLAPPER = `<circle cx="102" cy="293" r="6" fill="#4e3109"/><circle cx="100" cy="291" r="2" fill="#d9b25a" opacity=".7"/>`;
const BT_HAND = `
<path d="M78,206Q74,190 92,186L114,186Q128,190 126,208Q126,230 108,232H90Q78,230 78,206Z" fill="url(#skin)" filter="url(#pores)"/>
${[190, 199, 208, 217].map(y => `<path d="M82,${y + 9}Q103,${y + 4} 124,${y + 9}" fill="none" stroke="#000" stroke-width="2.5" opacity=".35" filter="url(#soft3)"/><path d="M84,${y + 2}Q103,${y - 2} 122,${y + 2}" fill="none" stroke="#fff" stroke-width="2" opacity=".25" filter="url(#soft3)"/>`).join("")}
<path d="M80,206Q72,194 84,186Q96,182 104,192Q100,198 92,200Z" fill="url(#skin)"/>
<path d="M84,188Q96,184 102,192" fill="none" stroke="#000" stroke-width="2" opacity=".35" filter="url(#soft3)"/>
<path d="M86,228Q100,236 116,228" fill="none" stroke="#000" stroke-width="4" opacity=".3" filter="url(#soft3)"/>`;
const BARTENDER = `<div class="bt" aria-hidden="true">${btLayer("body", BT_BODY)}<img class="head" alt="" src="img/gigachad.webp">` +
  `<div class="arm">${btLayer("", BT_ARM)}<div class="bell">${btLayer("", BT_BELL)}${btLayer("clapper", BT_CLAPPER)}</div>${btLayer("", BT_HAND)}</div></div>`;

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

// The photo-like body (bartender.js, relief.js) replaces this drawing when it can: it is rendered
// as soon as the bar starts closing, long before he comes up, and swapped in all at once once every
// layer is decoded. Without WebGL the drawing above simply stays. .real marks the swap (CSS).
const realBartender = () => renderBartender().then(async urls => {
  if (!urls) return;
  const bt = closing.querySelector(".bt"), q = s => bt.querySelector(s);
  const layers = { body: q(":scope > img.body"), arm: q(".arm > img:first-child"), bell: q(".bell > img:first-child"),
    clapper: q("img.clapper"), hand: q(".arm > img:last-child") };
  await Promise.all(Object.values(urls).map(u => { const i = new Image(); i.src = u; return i.decode(); }));
  for (const [name, img] of Object.entries(layers)) img.src = urls[name];
  bt.classList.add("real");
}).catch(() => {});

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
  if (e.detail !== "closing") return;
  realBartender();
  closingTimer = setTimeout(closeBar, (1 + (titleText.length + 1) * .7 + .5) * 1000);
});
