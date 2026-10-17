// The bar counter in front of the bartender and the desk bell under his open hand, painted for
// the relief renderer (site/js/relief.js) and lit like the photo: key light from the upper left.
// Same canvas as the photo (1162 x 1354), so they stack exactly with the cut layers (cut.js).
// The camera looks up at him, so the counter shows its front: a rounded varnished top edge, a
// brass strip, raised panels, its ends fading out; the bell's base is hidden behind the top edge,
// its brass dome and chrome plunger stand above it, the plunger under the palm of his hand.

const PW = 1162, PH = 1354;
const PROPS_KEY = [-.62, .5, .6];  // the photo's key light: from the upper left, in front
// Materials: colour, [specular, glossiness, metal], [pores, cotton, wool] in 0-255
const PMATS = {
  wood: ["#56402f", [110, 115, 0], [0, 0, 0]],
  brass: ["#c8922a", [255, 200, 255], [0, 0, 0]],
  chrome: ["#d2d4d8", [255, 230, 255], [0, 0, 0]],
  bakelite: ["#101012", [200, 190, 0], [0, 0, 0]],
};
const prgb = v => `rgb(${v.join(",")})`;
const pblur = n => `url(#b${String(n).replace(".", "_")})`;
const PDEFS = [1, 2, 3, 4, 6, 8, 12, 16, 24].map(n =>
  `<filter id="b${String(n).replace(".", "_")}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${n}"/></filter>`).join("") +
  // Vertical wood grain: stretched noise, as a dark brown veil over the wood
  `<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".09 .004" numOctaves="3" seed="8"/>` +
  `<feColorMatrix type="matrix" values="0 0 0 0 .14 0 0 0 0 .09 0 0 0 0 .06 0 0 0 1.3 -.45"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
const psvg = (body, bg = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="${PW}" height="${PH}">` +
  `<defs>${PDEFS}</defs>${bg && `<rect width="${PW}" height="${PH}" fill="${bg}"/>`}${body}</svg>`;
const pshape = (s, fill) => s.startsWith("<") ? s.replace(/^<(\w+)/, `<$1 fill="${fill}"`) : `<path d="${s}" fill="${fill}"/>`;
const pup = (markup, blur, v) => `<g style="mix-blend-mode:plus-lighter" filter="${pblur(blur)}" opacity="${v}">${markup}</g>`;
const pdown = (markup, blur, v) => `<g style="mix-blend-mode:multiply" filter="${pblur(blur)}" opacity="${v}">${markup}</g>`;
// parts: [shape, material, volume blur, volume height]; relief: height markup; paint: colour markup
const playerOf = (parts, relief = "", paint = "") => ({
  albedo: psvg(parts.map(([s, m]) => pshape(s, PMATS[m][0])).join("") + paint),
  height: psvg(parts.map(([s, , b, v]) => v ? pup(pshape(s, "#fff"), b, v) : "").join("") + relief, "#000"),
  mat: psvg(parts.map(([s, m]) => pshape(s, prgb(PMATS[m][1]))).join(""), "#000"),
  tex: psvg(parts.map(([s, m]) => pshape(s, prgb(PMATS[m][2]))).join(""), "#000"),
});

// ── Counter ──
const TOP = 1182;  // top of its rounded edge
const PANELS = [[34, 384], [416, 746], [778, 1128]].map(([a, b]) => `<rect x="${a}" y="1252" width="${b - a}" height="140" rx="6"/>`).join("");
const COUNTER = playerOf([
  [`<rect x="0" y="${TOP + 34}" width="${PW}" height="${PH - TOP - 34}"/>`, "wood", 3, .3],
  [`<rect x="0" y="${TOP}" width="${PW}" height="30" rx="14"/>`, "wood", 10, .62],
  [`<rect x="0" y="${TOP + 29}" width="${PW}" height="7"/>`, "brass", 1, .5],
],
  // Raised panels with bevelled edges, a groove under the brass strip
  pup(PANELS, 4, .3) + pdown(PANELS.replace(/<rect /g, '<rect fill="none" stroke="#000" stroke-width="5" '), 2, .45) +
  pdown(`<path d="M0,${TOP + 38}H${PW}" stroke="#000" stroke-width="3"/>`, 1, .5),
  // Wood grain on everything wooden, a little darker towards the floor
  `<rect x="0" y="${TOP}" width="${PW}" height="${PH - TOP}" fill="#fff" filter="url(#grain)"/>` +
  `<rect x="0" y="${TOP + 29}" width="${PW}" height="7" fill="${PMATS.brass[0]}"/>` +
  `<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>` +
  `<rect x="0" y="${TOP + 40}" width="${PW}" height="${PH - TOP - 40}" fill="url(#floor)"/>`);

// ── Desk bell: brass dome, chrome plunger (its cap under the palm) ──
const DOME = `M178,${TOP + 2} C178,1150 198,1132 224,1132 C250,1132 270,1150 270,${TOP + 2} Z`;
const BELL = playerOf([
  [`<ellipse cx="224" cy="${TOP + 2}" rx="54" ry="8"/>`, "bakelite", 3, .3],
  [DOME, "brass", 16, .62],
  ["M221,1112 h6 v24 h-6 Z", "chrome", 2, .3],
  [`<ellipse cx="224" cy="1112" rx="8.5" ry="4"/>`, "chrome", 2, .36],
],
  pup(`<ellipse cx="206" cy="1146" rx="10" ry="6"/>`, 4, .12) +
  pdown(`<path d="M180,${TOP} Q224,${TOP + 6} 268,${TOP}" stroke="#000" stroke-width="4" fill="none"/>`, 2, .6));

// Renders both props and returns { bell, counter } canvases; the counter's ends fade out
async function renderProps() {
  const urls = await renderRelief({ bell: BELL, counter: COUNTER }, PW, PH, 1, PROPS_KEY);
  if (!urls) throw new Error("WebGL is needed to render the props");
  const out = {};
  for (const [name, url] of Object.entries(urls)) {
    const img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = url; });
    const cv = document.createElement("canvas"); cv.width = PW; cv.height = PH;
    const g = cv.getContext("2d");
    g.drawImage(img, 0, 0);
    if (name === "counter") {
      const fade = g.createLinearGradient(0, 0, PW, 0);
      fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(.12, "#000"); fade.addColorStop(.88, "#000"); fade.addColorStop(1, "rgba(0,0,0,0)");
      g.globalCompositeOperation = "destination-in"; g.fillStyle = fade; g.fillRect(0, 0, PW, PH);
    }
    out[name] = cv;
  }
  return out;
}
