// The closing-time bartender's body, painted for the relief renderer (relief.js) so that it looks
// like the Gigachad photo used for his head: same hard light from the right, same black and white,
// same grain. A Gigachad build (huge neck and traps, round shoulders, a deep chest, forearms like
// legs) in a bartender's outfit: white shirt with sleeves rolled up and held by sleeve garters, a
// charcoal wool waistcoat with satin shawl lapels pulled tight over the chest, a black satin bow
// tie, a gold watch chain, a striped towel over his left forearm, and the brass hand bell raised in
// his right hand.
// Same layers and same 520 x 600 canvas as the drawing in closing.js (which stays as the fallback
// without WebGL), so the animations and their pivots do not change: body, arm (the raised arm),
// bell, clapper and hand.
// Each layer is a list of parts (a shape and its material, from back to front) and of relief
// strokes: blurred shapes added to the height (muscles, folds) or taken away from it (hollows,
// creases), plus a few touches of colour (shadow of the head, stripes). renderBartender() renders
// them once and gives one image URL per layer (a promise, null without WebGL).

// Materials: colour (unlit), [specular, glossiness, metal] and [pores, cotton, wool] in 0-255
const BTR_MATS = {
  skin: ["#8e8e8e", [70, 95, 0], [255, 0, 0]],
  shirt: ["#d8d8d4", [22, 40, 0], [0, 255, 0]],
  vest: ["#2b2b2f", [45, 70, 0], [0, 0, 255]],
  satin: ["#141416", [255, 205, 0], [0, 0, 0]],
  button: ["#0d0d0e", [255, 235, 0], [0, 0, 0]],
  shell: ["#f4f2ec", [200, 220, 0], [0, 0, 0]],
  garter: ["#18181a", [140, 130, 0], [0, 90, 0]],
  silver: ["#cfcfd2", [255, 215, 255], [0, 0, 0]],
  gold: ["#d6a640", [255, 205, 255], [0, 0, 0]],
  brass: ["#c8922a", [255, 195, 255], [0, 0, 0]],
  wood: ["#6a4224", [90, 120, 0], [0, 40, 0]],
  towel: ["#e6e4df", [8, 10, 0], [0, 255, 120]],
  stripe: ["#3c3c44", [8, 10, 0], [0, 255, 120]],
  pocket: ["#0b0b0c", [10, 10, 0], [0, 0, 0]],
  nail: ["#b4b0aa", [160, 170, 0], [0, 0, 0]],
};
const btrRgb = v => `rgb(${v.join(",")})`;
// Blurs used in the drawings: btrBlur(n) blurs by n drawing units
const BTR_BLURS = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 14, 18, 20, 22, 26, 36, 40, 50].map(n =>
  `<filter id="b${String(n).replace(".", "_")}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${n}"/></filter>`).join("");
const btrBlur = n => `url(#b${String(n).replace(".", "_")})`;
const btrSvg = (body, bg = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 600" width="1040" height="1200">` +
  `<defs>${BTR_BLURS}</defs>${bg && `<rect width="520" height="600" fill="${bg}"/>`}${body}</svg>`;
// Height strokes: btrUp(...) adds (lighter blend), btrDown(...) takes away (multiply)
// Small, sharp strokes (folds, creases, veins: blur under 10) are scaled down by BTR_DETAIL: the
// lighting shows the smallest step, so they must stay subtle; big soft ones (muscles) are not
const BTR_DETAIL = .35;
const btrK = (blur, v) => blur < 10 ? v * BTR_DETAIL : v;
const btrUp = (markup, blur, v) => `<g style="mix-blend-mode:plus-lighter" filter="${btrBlur(blur)}" opacity="${btrK(blur, v)}">${markup}</g>`;
const btrDown = (markup, blur, v) => `<g style="mix-blend-mode:multiply" filter="${btrBlur(blur)}" opacity="${btrK(blur, v)}">${markup}</g>`;
// A shape as markup: a path "d", or any SVG element given as is
const btrShape = (s, fill) => s.startsWith("<") ? s.replace(/^<(\w+)/, `<$1 fill="${fill}"`) : `<path d="${s}" fill="${fill}"/>`;

// A layer from its parts: [shape, material, volume blur, volume height]; relief is height markup;
// paint is extra colour markup drawn over the parts
const btrLayer = (parts, relief = "", paint = "") => ({
  albedo: btrSvg(parts.map(([s, m]) => btrShape(s, BTR_MATS[m][0])).join("") + paint),
  height: btrSvg(parts.map(([s, , blur, v]) => v ? btrUp(btrShape(s, "#fff"), blur, v) : "").join("") + relief, "#000"),
  mat: btrSvg(parts.map(([s, m]) => btrShape(s, btrRgb(BTR_MATS[m][1]))).join(""), "#000"),
  tex: btrSvg(parts.map(([s, m]) => btrShape(s, btrRgb(BTR_MATS[m][2]))).join(""), "#000"),
});

// ── Body: neck, torso, left arm (on the right of the picture) with its towel ──
const BTR_NECK = "M198,200 C202,236 202,262 190,294 L334,294 C320,262 316,236 318,200 Z";
const BTR_TORSO = "M204,270 C178,281 152,290 132,300 C112,310 102,332 106,362 C108,394 122,420 130,442 " +
  "C136,500 144,560 148,600 L376,600 C380,560 388,500 394,442 C402,420 412,392 414,362 C416,332 408,310 390,300 C370,290 346,281 320,270 Z";
const BTR_SLEEVE_R = "M386,306 C426,304 456,334 462,376 C466,408 468,440 464,468 L408,474 C404,440 398,412 392,392 C388,360 384,330 386,306 Z";
const BTR_FOREARM_R = "M408,466 L464,462 C474,490 474,530 466,600 L404,600 C398,560 400,510 408,466 Z";
const BTR_ROLL_R = "M404,446 C430,440 452,440 468,446 L470,480 C448,474 426,476 405,482 Z";
const BTR_GARTER_R = "M394,398 C420,406 446,404 466,396 L467,410 C446,418 420,420 395,412 Z";
const BTR_TOWEL = "M396,508 C424,500 452,500 478,506 C482,540 480,572 474,600 L398,600 C392,570 392,540 396,508 Z";
const BTR_VEST_L = "M232,292 L262,436 L262,600 L150,600 C146,560 140,500 136,452 C148,420 156,382 166,352 C176,324 194,304 212,296 Z";
const BTR_VEST_R = "M292,292 L262,436 L262,600 L374,600 C378,560 384,500 388,452 C376,420 368,382 358,352 C348,324 330,304 312,296 Z";
const BTR_LAPEL_L = "M212,296 C224,338 244,392 258,432 L262,436 L232,292 Z";
const BTR_LAPEL_R = "M312,296 C300,338 280,392 266,432 L262,436 L292,292 Z";
const BTR_COLLAR = "M198,256 C224,276 300,276 326,256 L330,292 C300,306 224,306 194,292 Z";
const BTR_COLLAR_TIPS = "M214,286 C226,300 244,312 258,318 L250,300 Z M310,286 C298,300 280,312 266,318 L274,300 Z";
const BTR_BOW = "M262,292 Q242,276 222,280 Q212,294 222,309 Q242,310 262,300 Z M262,292 Q282,276 302,280 Q312,294 302,309 Q282,310 262,300 Z";
const BTR_KNOT = "M253,286 h18 a3,3 0 0 1 3,3 v12 a3,3 0 0 1 -3,3 h-18 a3,3 0 0 1 -3,-3 v-12 a3,3 0 0 1 3,-3 Z";
const BTR_POCKETS = "M168,500 L214,493 L215,500 L169,507 Z M310,493 L356,500 L355,507 L309,500 Z";
const BTR_VEST_BUTTONS = [452, 488, 524, 560];
const BTR_BODY = btrLayer([
  [BTR_FOREARM_R, "skin", 18, .5],
  [BTR_SLEEVE_R, "shirt", 20, .52],
  [BTR_ROLL_R, "shirt", 5, .14],
  [BTR_GARTER_R, "garter", 2, .06],
  ["<circle cx=\"430\" cy=\"412\" r=\"5\"/>", "silver", 2, .1],
  [BTR_TOWEL, "towel", 10, .26],
  [BTR_NECK, "skin", 26, .5],
  [BTR_TORSO, "shirt", 50, .34],
  [BTR_VEST_L, "vest", 3, .05],
  [BTR_VEST_R, "vest", 3, .05],
  [BTR_LAPEL_L, "satin", 2, .05],
  [BTR_LAPEL_R, "satin", 2, .05],
  [BTR_POCKETS, "pocket", 1, 0],
  [BTR_COLLAR, "shirt", 4, .32],
  [BTR_COLLAR_TIPS, "shirt", 3, .2],
  [BTR_BOW, "satin", 4, .14],
  [BTR_KNOT, "satin", 2, .1],
  ...[330, 370, 410].map(y => [`<circle cx="262" cy="${y}" r="2.6"/>`, "shell", 1, .05]),
  ...BTR_VEST_BUTTONS.map(y => [`<circle cx="262" cy="${y}" r="5"/>`, "button", 1.5, .12]),
],
  // Muscles under the clothes: traps, shoulders, a deep chest, the pectoral split
  btrUp(`<ellipse cx="176" cy="288" rx="52" ry="24" transform="rotate(20 176 288)"/><ellipse cx="348" cy="288" rx="52" ry="24" transform="rotate(-20 348 288)"/>`, 14, .3) +
  btrUp(`<circle cx="130" cy="340" r="44"/><circle cx="424" cy="350" r="42"/>`, 18, .34) +
  btrUp(`<ellipse cx="200" cy="370" rx="72" ry="50"/><ellipse cx="324" cy="370" rx="72" ry="50"/>`, 22, .3) +
  btrUp(`<ellipse cx="262" cy="520" rx="96" ry="90"/>`, 36, .16) +
  btrDown(`<path d="M262,318V430" stroke="#000" stroke-width="10"/>`, 8, .35) +
  btrDown(`<path d="M150,412 Q200,426 250,416 M274,416 Q324,426 374,412" stroke="#000" stroke-width="12" fill="none"/>`, 10, .3) +
  // Neck: the two big muscles from behind the ears down to the collar, the Adam's apple
  btrUp(`<path d="M222,212 L250,290 M302,212 L274,290" stroke="#fff" stroke-width="16"/>`, 6, .16) +
  btrUp(`<ellipse cx="262" cy="262" rx="8" ry="11"/>`, 4, .08) +
  // Waistcoat pulled tight: strain folds from each button, folds at the sides and the armholes
  btrDown(BTR_VEST_BUTTONS.map(y => `<path d="M256,${y} Q222,${y - 8} 186,${y - 22} M268,${y} Q302,${y - 8} 338,${y - 22}" stroke="#000" stroke-width="5" fill="none"/>`).join(""), 3, .5) +
  btrUp(BTR_VEST_BUTTONS.map(y => `<path d="M252,${y + 6} Q222,${y} 192,${y - 10} M272,${y + 6} Q302,${y} 332,${y - 10}" stroke="#fff" stroke-width="4" fill="none"/>`).join(""), 3, .12) +
  btrDown(`<path d="M168,356 Q160,400 150,440 M356,356 Q364,400 374,440" stroke="#000" stroke-width="8" fill="none"/>`, 5, .4) +
  btrDown(`<path d="M168,500 L214,493 M310,493 L356,500" stroke="#000" stroke-width="5"/>`, 1, .6) +
  btrUp(`<path d="M168,508 L214,501 M310,501 L356,508" stroke="#fff" stroke-width="3"/>`, 1, .1) +
  // Shirt: folds from the collar to the armpits, a crease down the placket, slack at the shoulders
  btrDown(`<path d="M196,300 Q170,340 150,378 M328,300 Q354,340 374,378 M150,310 Q140,350 128,384 M374,310 Q386,350 398,384" stroke="#000" stroke-width="6" fill="none"/>`, 5, .4) +
  btrUp(`<path d="M204,300 Q178,340 158,378 M320,300 Q346,340 366,378" stroke="#fff" stroke-width="5" fill="none"/>`, 5, .12) +
  btrDown(`<path d="M262,300V432" stroke="#000" stroke-width="2"/>`, 1, .4) +
  // Left arm: the shoulder and the biceps filling the sleeve, its folds, the garter biting in,
  // the roll of the sleeve, then the forearm: its big muscles, veins and tendons
  btrUp(`<ellipse cx="440" cy="420" rx="22" ry="40"/>`, 12, .16) +
  btrDown(`<path d="M394,398 Q430,412 466,398 M394,414 Q430,428 466,412" stroke="#000" stroke-width="4" fill="none"/>`, 2, .45) +
  btrDown(`<path d="M400,372 Q426,388 456,378 M404,432 Q430,442 460,430" stroke="#000" stroke-width="6" fill="none"/>`, 6, .35) +
  btrUp(`<path d="M404,452 Q436,446 468,452 M404,466 Q436,460 468,466" stroke="#fff" stroke-width="7" fill="none"/>`, 3, .14) +
  btrDown(`<path d="M404,459 Q436,453 468,459 M404,474 Q436,470 468,474" stroke="#000" stroke-width="3" fill="none"/>`, 2, .5) +
  btrUp(`<ellipse cx="454" cy="500" rx="16" ry="34"/><ellipse cx="420" cy="512" rx="16" ry="38"/>`, 10, .2) +
  btrUp(`<path d="M432,484 C424,510 440,530 430,560 C426,574 432,588 428,600 M430,540 C440,550 450,556 452,570 M418,498 C412,520 416,540 412,560" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/>`, 1, .5) +
  // Towel: soft folds hanging over the forearm
  btrUp(`<path d="M410,510 Q406,556 412,600 M440,506 Q446,552 440,600 M462,508 Q466,556 460,600" stroke="#fff" stroke-width="10" fill="none"/>`, 5, .2) +
  btrDown(`<path d="M424,508 Q426,556 424,600 M452,506 Q456,552 452,600" stroke="#000" stroke-width="6" fill="none"/>`, 4, .45) +
  btrUp(`<path d="M396,510 Q436,498 478,508" stroke="#fff" stroke-width="8" fill="none"/>`, 3, .18) +
  // Bow tie: knot pinched, wings folded
  btrDown(`<path d="M232,288 Q246,294 252,294 M232,302 Q246,298 252,298 M292,288 Q278,294 272,294 M292,302 Q278,298 272,298" stroke="#000" stroke-width="3" fill="none"/>`, 2, .5),
  // Colour touches: the head's shadow on the neck and collar, the shadow side of the neck, the
  // towel's stripes, the gold watch chain
  `<path d="M120,300 C150,312 186,318 204,334 C190,360 150,370 116,368 Z" fill="#000" opacity=".4" filter="${btrBlur(12)}"/>` +
  `<ellipse cx="270" cy="222" rx="60" ry="36" fill="#000" opacity=".28" filter="${btrBlur(18)}"/>` +
  `<ellipse cx="262" cy="270" rx="56" ry="10" fill="#000" opacity=".15" filter="${btrBlur(8)}"/>` +
  `<path d="M397,522 Q436,512 478,520 L478,526 Q436,518 397,528 Z M397,534 Q436,524 479,532 L479,538 Q436,530 397,540 Z" fill="${BTR_MATS.stripe[0]}"/>` +
  `<path d="M262,488 Q296,524 332,500" fill="none" stroke="${BTR_MATS.gold[0]}" stroke-width="2.6" stroke-dasharray="2.6 1.2"/>`
);
// The watch chain also needs its relief and its metal
BTR_BODY.height = BTR_BODY.height.replace("</svg>", btrUp(`<path d="M262,488 Q296,524 332,500" stroke="#fff" stroke-width="2.6" fill="none" stroke-dasharray="2.6 1.2"/>`, 1, .2) + "</svg>");
BTR_BODY.mat = BTR_BODY.mat.replace("</svg>", `<path d="M262,488 Q296,524 332,500" fill="none" stroke="${btrRgb(BTR_MATS.gold[1])}" stroke-width="2.6"/></svg>`);

// ── Raised right arm (on the left of the picture): the sleeve, its garter and roll, the forearm ──
// The forearm goes straight up from the elbow, long and thick (widest under the elbow), the fist
// on top of it and the bell hanging under the fist, so most of the forearm stays in view.
const BTR_ARM_SLEEVE = "M206,300 C202,280 182,270 160,270 C130,272 104,284 88,304 C72,322 60,342 52,362 L104,392 C116,372 136,356 160,348 C182,342 202,334 208,320 Z";
const BTR_ARM_GARTER = "M146,274 C150,296 156,322 164,350 L176,346 C168,320 162,294 158,272 Z";
const BTR_ARM_ROLL = "M42,352 C68,338 98,344 116,358 L116,396 C94,384 68,382 44,390 Z";
const BTR_ARM_FOREARM = "M46,382 C28,342 30,300 42,264 C52,232 62,204 72,176 L118,174 C124,200 132,236 130,272 C128,320 124,354 116,382 Z";
const BTR_ARM = btrLayer([
  [BTR_ARM_FOREARM, "skin", 22, .5],
  [BTR_ARM_SLEEVE, "shirt", 14, .5],
  [BTR_ARM_GARTER, "garter", 2, .06],
  ["<circle cx=\"168\" cy=\"332\" r=\"5\"/>", "silver", 2, .1],
  [BTR_ARM_ROLL, "shirt", 7, .3],
],
  // Biceps bulging the sleeve, folds pulled towards the elbow, the garter biting in, the roll
  btrUp(`<ellipse cx="124" cy="300" rx="44" ry="26" transform="rotate(-30 124 300)"/>`, 12, .26) +
  btrDown(`<path d="M182,300 Q150,316 120,340 M176,326 Q146,340 118,364" stroke="#000" stroke-width="6" fill="none"/>`, 5, .4) +
  btrUp(`<path d="M186,292 Q154,308 124,330" stroke="#fff" stroke-width="5" fill="none"/>`, 4, .14) +
  btrDown(`<path d="M146,274 C150,296 156,322 164,350 M160,272 C164,296 170,322 178,346" stroke="#000" stroke-width="4" fill="none"/>`, 2, .45) +
  btrUp(`<path d="M42,362 Q78,348 116,366 M42,378 Q78,364 116,384" stroke="#fff" stroke-width="8" fill="none"/>`, 4, .3) +
  btrDown(`<path d="M42,370 Q78,356 116,375 M44,391 Q78,381 116,394 M60,352 Q64,372 58,390 M94,350 Q100,372 96,392" stroke="#000" stroke-width="3" fill="none"/>`, 2, .6) +
  // Forearm: the big muscle on the outside under the elbow, the flexors on the inside, the bony
  // ridge between them, the wrist narrowing, and veins running up to the hand
  btrUp(`<ellipse cx="52" cy="306" rx="20" ry="58" transform="rotate(8 52 306)"/><ellipse cx="108" cy="282" rx="18" ry="56" transform="rotate(-4 108 282)"/>`, 12, .3) +
  btrUp(`<ellipse cx="88" cy="214" rx="16" ry="34"/>`, 10, .14) +
  btrUp(`<path d="M98,186 C92,216 100,244 94,276 C90,296 96,312 92,332" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`, 1.5, .3),
  // The forearm's shadow side, the underside of the sleeve, the bell's shadow on the wrist
  `<path d="M46,382 C28,342 30,300 42,264 C52,232 62,204 72,176 L82,176 C66,230 50,300 60,382 Z" fill="#000" opacity=".14" filter="${btrBlur(8)}"/>` +
  `<path d="M104,392 C116,372 136,356 160,348 C178,342 190,340 198,340 L196,326 C170,326 140,336 112,360 Z" fill="#000" opacity=".3" filter="${btrBlur(6)}"/>` +
  `<ellipse cx="96" cy="236" rx="34" ry="12" fill="#000" opacity=".35" filter="${btrBlur(8)}"/>`
);

// ── The bell (brass, wooden handle), its clapper, and the hand holding it ──
const BTR_BELL_BRASS = "M90,168 Q86,178 84,192 Q80,214 64,228 H140 Q124,214 120,192 Q118,178 114,168 Z";
const BTR_BELL = btrLayer([
  ["M97,98 h10 v76 h-10 Z", "wood", 3, .2],
  ["<ellipse cx=\"102\" cy=\"98\" rx=\"8.5\" ry=\"6.5\"/>", "wood", 3, .24],
  [BTR_BELL_BRASS, "brass", 14, .5],
  ["<ellipse cx=\"102\" cy=\"228\" rx=\"38\" ry=\"6\"/>", "brass", 2, .3],
],
  btrUp(`<path d="M86,202 Q102,208 118,202" stroke="#fff" stroke-width="3" fill="none"/>`, 1, .5) +
  btrDown(`<ellipse cx="102" cy="227" rx="33" ry="3.5"/>`, 1, 1),
  `<ellipse cx="102" cy="227" rx="33" ry="3.5" fill="#1d1204"/>`);
const BTR_CLAPPER = btrLayer([["<circle cx=\"102\" cy=\"235\" r=\"6.5\"/>", "brass", 3, .4]]);
// The fist round the handle, seen from the front: four fingers curled one above the other (the
// little one smaller), their knuckles on the right, and the thumb wrapped over the top one. The
// creases are also painted, so that the fingers read at any size.
const BTR_FIST = "M66,184 C56,166 56,142 70,130 C80,124 108,122 120,128 C132,138 134,164 126,184 C108,192 84,192 66,184 Z";
const BTR_FINGERS = [0, 1, 2, 3].map(i => `<rect x="${68 + i}" y="${132 + i * 12}" width="${58 - i * 3}" height="12" rx="6"/>`);
const BTR_CREASES = [0, 1, 2].map(i => `M${70 + i},${144 + i * 12} H${124 - i * 3}`).join(" ");
const BTR_THUMB = "M64,160 C58,144 64,131 78,128 C92,125 108,129 112,137 C102,144 88,148 76,162 Z";
const BTR_HAND = btrLayer([
  [BTR_FIST, "skin", 10, .42],
  ...BTR_FINGERS.map(f => [f, "skin", 3, .18]),
  [BTR_THUMB, "skin", 4, .22],
  ['<ellipse cx="102" cy="133" rx="8" ry="4.6" transform="rotate(-12 102 133)"/>', "nail", 1, .05],
],
  btrDown(`<path d="${BTR_CREASES}" stroke="#000" stroke-width="2.6"/>`, 1, 1.4) +
  btrUp([0, 1, 2, 3].map(i => `<circle cx="${122 - i * 3}" cy="${138 + i * 12}" r="5.5"/>`).join(""), 3, .5) +
  btrDown(`<path d="M70,162 Q90,150 112,140" stroke="#000" stroke-width="4" fill="none"/>`, 2, .9),
  `<path d="${BTR_CREASES}" stroke="#000" stroke-width="1.6" opacity=".45" filter="${btrBlur(1)}"/>` +
  `<path d="M70,162 Q90,150 112,140" stroke="#000" stroke-width="2" fill="none" opacity=".35" filter="${btrBlur(1.5)}"/>` +
  `<path d="M64,182 C58,158 60,138 72,128 L80,128 C70,146 70,166 74,182 Z" fill="#000" opacity=".2" filter="${btrBlur(5)}"/>`);

// Rendered once per visit, the first time it is asked for
let btrRendered = null;
const renderBartender = () => btrRendered ??= renderRelief(
  { body: BTR_BODY, arm: BTR_ARM, bell: BTR_BELL, clapper: BTR_CLAPPER, hand: BTR_HAND }, 520, 600, 2);
