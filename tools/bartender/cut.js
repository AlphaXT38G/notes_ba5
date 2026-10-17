// Cuts the bartender photo (source.webp, an AI-dressed version of the Gigachad photo) into the
// layers the closing scene animates (site/js/closing.js). Run from tools/bartender/index.html.
//
// 1. Cut-out. The background is a smooth grey studio gradient: it is modelled by a quadratic in x
//    and y fitted on the borders of the picture, then everything that looks like it and touches the
//    border through such pixels is background (a flood fill, so that grey parts inside him, like
//    the light on a forearm, stay). Along the outline, the opacity follows how far the pixel is
//    from the background, and the background's grey is taken out of its colour, so no grey halo.
// 2. Layers, all at the size of the photo so they stack exactly:
//    head     above the collar, nods while he talks (pivot under the beard)
//    forearm  his right forearm and hand (on the left of the picture), from under the rolled
//             sleeve: it lifts and drops to tap the desk bell; it reaches up under the sleeve so
//             that lifting it never opens a gap
//    body     the rest, with the head and the forearm taken out (no ghost when they move)

const W = 1162, H = 1354;
// Outlines in photo pixels. HEAD: everything above the collar line. FOREARM: under the cuff of the
// rolled sleeve down past the hand, its right side running along the forearm (clear of the apron).
const HEAD = [[340, 0], [680, 0], [680, 280], [640, 292], [600, 312], [560, 342], [515, 350], [468, 334], [432, 304], [380, 298], [340, 298]];
const CUFF = [[132, 712], [226, 708], [300, 706], [374, 702]];
const FOREARM_SIDE = [[350, 742], [322, 850], [296, 980], [296, 1170], [120, 1170]];
const FOREARM_LAYER = [[132, 684], [376, 684], ...FOREARM_SIDE];  // reaches up under the sleeve
const FOREARM_HOLE = [...CUFF, ...FOREARM_SIDE];                    // what the body loses
// Background enclosed by him (between his left arm and the waistcoat), lighter than the rest: it
// is grown from these points along its own gentle gradient (see cutOut)
const ENCLOSED = [[778, 700], [776, 760], [770, 820]];
// Inside the forearms the light makes some skin as grey as the background: never background
// (a few pixels inside their outlines, which are cut as usual)
const PROTECT = [
  [[846, 656], [946, 646], [946, 720], [942, 742], [936, 768], [912, 800], [870, 870], [846, 930], [818, 930], [814, 862], [844, 790]],
  [[245, 725], [332, 725], [318, 800], [294, 900], [262, 980], [206, 980], [206, 900], [222, 800]],
];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Least squares fit of bg(x, y) = c0 + c1 x + c2 y + c3 x y + c4 x² + c5 y² on the given samples
function fitBackground(lum, samples) {
  const terms = (x, y) => { x /= W; y /= H; return [1, x, y, x * y, x * x, y * y]; };
  const A = Array.from({ length: 6 }, () => new Float64Array(7));
  for (const [x, y] of samples) {
    const t = terms(x, y), v = lum[y * W + x];
    for (let i = 0; i < 6; i++) { for (let j = 0; j < 6; j++) A[i][j] += t[i] * t[j]; A[i][6] += t[i] * v; }
  }
  for (let i = 0; i < 6; i++) {  // Gauss-Jordan
    let p = i; for (let r = i + 1; r < 6; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    for (let r = 0; r < 6; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < 7; c++) A[r][c] -= f * A[i][c]; }
  }
  const c = A.map((row, i) => row[6] / row[i]);
  return (x, y) => terms(x, y).reduce((s, t, i) => s + t * c[i], 0);
}

// The photo cut out: { rgba (Uint8ClampedArray), bg (background grey per pixel) }
function cutOut(img) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data, n = W * H;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = .299 * px[i * 4] + .587 * px[i * 4 + 1] + .114 * px[i * 4 + 2];
  // Background samples: the left and right strips, the top row and the bottom-left corner
  const samples = [];
  for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 6)
    if (x < 132 || x > 980 || y < 12) samples.push([x, y]);
  const bgAt = fitBackground(lum, samples);
  const bg = new Float32Array(n), d = new Float32Array(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; bg[i] = bgAt(x, y); d[i] = Math.abs(lum[i] - bg[i]); }
  // Flood fill of the background from the borders (and the enclosed gap), through pixels close to
  // the background grey, never into the protected part of the arm
  const LOW = 12, seen = new Uint8Array(n), stack = [];
  const protect = PROTECT.map(p => polygonMask(p, 0)).reduce((a, b) => a.map((v, i) => Math.max(v, b[i])));
  const push = i => { if (!seen[i] && d[i] < LOW && protect[i] < .5) { seen[i] = 1; stack.push(i); } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  const flood = (next) => {
    while (stack.length) {
      const i = stack.pop(), x = i % W;
      if (x > 0) next(i, i - 1); if (x < W - 1) next(i, i + 1); if (i >= W) next(i, i - W); if (i < n - W) next(i, i + W);
    }
  };
  flood((from, to) => push(to));
  // The enclosed gap: from each point, step to neighbours of nearly the same grey (it follows the
  // gradient but stops at the edges), never far from that point's grey
  for (const [x, y] of ENCLOSED) {
    const ref = lum[y * W + x];
    seen[y * W + x] = 1; stack.push(y * W + x);
    flood((from, to) => {
      if (!seen[to] && protect[to] < .5 && Math.abs(lum[to] - lum[from]) < 3 && Math.abs(lum[to] - ref) < 22) { seen[to] = 1; stack.push(to); }
    });
  }
  // Close the small notches the fill bit into his outline (lit skin as grey as the background):
  // grow him by R pixels then shrink back by R, so dents narrower than about 2R fill in
  const R = 4, fg = new Uint8Array(n);
  for (let i = 0; i < n; i++) fg[i] = seen[i] ? 0 : 1;
  const grow = (src, val) => {  // square dilation of the pixels equal to val, separable
    const tmp = new Uint8Array(n), out = new Uint8Array(n);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let hit = 0; for (let k = -R; k <= R && !hit; k++) { const xx = x + k; if (xx >= 0 && xx < W && src[y * W + xx] === val) hit = 1; }
      tmp[y * W + x] = hit;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let hit = 0; for (let k = -R; k <= R && !hit; k++) { const yy = y + k; if (yy >= 0 && yy < H && tmp[yy * W + x]) hit = 1; }
      out[y * W + x] = hit ? val : 1 - val;
    }
    return out;
  };
  const closed = grow(grow(fg, 1), 0);   // dilate the figure, then erode it
  // (only where the pixel is not plain background grey: a narrow gap between the arm and the
  // apron is filled by the closing too, but its pixels match the background and stay out)
  for (let i = 0; i < n; i++) if (closed[i] && seen[i] && d[i] >= 6) seen[i] = 0;
  // Near the background (within 2 px), opacity from the distance to its grey; inside, opaque
  const near = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (seen[i]) {
    const x = i % W, y = (i / W) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < W && yy >= 0 && yy < H) near[yy * W + xx] = 1;
    }
  }
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const a = seen[i] ? 0 : near[i] ? smooth(8, 42, d[i]) : 1;
    // Take the background out of the colour of see-through pixels: F = (I - (1 - a) bg) / a
    for (let k = 0; k < 3; k++) {
      const v = px[i * 4 + k];
      out[i * 4 + k] = a > .02 ? (v - (1 - a) * bg[i]) / a : v;
    }
    out[i * 4 + 3] = a * 255;
  }
  return { rgba: out };
}

// A mask of a polygon, feathered by `soft` pixels
function polygonMask(points, soft = 2) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.filter = `blur(${soft}px)`;
  g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
  g.fillStyle = "#fff"; g.fill();
  const d = g.getImageData(0, 0, W, H).data, m = new Float32Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
  return m;
}

// The cut-out multiplied by keep(i) (0-1), as a canvas
function layer(rgba, keep) {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), im = g.createImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    im.data[i * 4] = rgba[i * 4]; im.data[i * 4 + 1] = rgba[i * 4 + 1]; im.data[i * 4 + 2] = rgba[i * 4 + 2];
    im.data[i * 4 + 3] = rgba[i * 4 + 3] * keep(i);
  }
  g.putImageData(im, 0, 0);
  return cv;
}

// All the layers of the photo: { head, forearm, body } canvases
async function cutBartender(src = "source.webp") {
  const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  const { rgba } = cutOut(img);
  const head = polygonMask(HEAD, 1.5), arm = polygonMask(FOREARM_LAYER, 1), hole = polygonMask(FOREARM_HOLE, 1.5);
  return {
    head: layer(rgba, i => head[i]),
    forearm: layer(rgba, i => arm[i] * (1 - head[i])),
    body: layer(rgba, i => (1 - head[i]) * (1 - hole[i])),
  };
}
