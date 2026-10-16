// Relief renderer: turns a flat drawing into a lit, photo-like bitmap (WebGL), used to paint the
// closing-time bartender's body in the same style as the Gigachad photo of his head.
// A layer is described by four SVG drawings on the same canvas:
//   albedo   the colour of each thing, unlit, and its outline (alpha)
//   height   how far each point stands out towards us, in grey (black = back, white = front).
//            Blurred shapes make round volumes: a blurred arm is a cylinder, a blurred pectoral a
//            dome, a blurred dark stroke a fold
//   mat      material, red = specular strength, green = glossiness, blue = metal
//   tex      micro texture, red = skin pores, green = woven cotton, blue = wool twill
// The shader then lights it like a studio photo: a hard key light from the right (as on the
// photo), a soft fill from the left and the bar lamp from above; the normals come from the height,
// with cast shadows (marching the height towards the key light), ambient occlusion in the hollows,
// wrapped light on skin (light going under it), specular highlights, then black and white with the
// photo's contrast and film grain. Only coloured things (brass, gold, wood) keep a little colour.
// renderRelief() is async (the SVG drawings are decoded as images) and returns one image URL per
// layer, or null without WebGL or if the browser refuses to read the drawings.

const RELIEF_SHADER = `
precision highp float;
uniform sampler2D uAlb, uHgt, uMat, uTex;
uniform vec2 uRes;      // bitmap size (px)
uniform float uUnit;    // bitmap px per drawing unit
varying vec2 vUv;
#define DEPTH 80.      // drawing units between black and white in the height drawing

// The height comes smoothed and packed in two channels (see RELIEF_BLUR): 16 bits instead of 8
float H(vec2 uv) { vec2 v = texture2D(uHgt, uv).rg; return v.x + v.y / 255.; }
// Hash without sin(): sin of large numbers is imprecise on GPUs and shows as stripes
float hash(vec2 p) { vec3 q = fract(p.xyx * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
// Slope of a noise field: a small bump map
vec2 bumps(vec2 p) { float e = .5; return vec2(noise(p + vec2(e, 0.)) - noise(p - vec2(e, 0.)), noise(p + vec2(0., e)) - noise(p - vec2(0., e))); }

void main() {
  vec4 alb = texture2D(uAlb, vUv);
  if (alb.a < .004) { gl_FragColor = vec4(0.); return; }
  vec3 mat = texture2D(uMat, vUv).rgb, tex = texture2D(uTex, vUv).rgb;
  vec2 px = 1. / uRes;
  vec2 p = vUv * uRes / uUnit;                       // position in drawing units (y up)
  float h = H(vUv);

  // Normal from the height. The height drawing has only 256 grey levels, so a slope taken between
  // neighbouring texels shows them as terraces: it is averaged over several distances and a few
  // texels across, which smooths the steps away
  vec2 g = vec2(0.);
  for (int i = 1; i <= 4; i++) {
    for (int j = -1; j <= 1; j++) {
      float o = float(i), q = float(j) * 1.5;
      g.x += (H(vUv + vec2(o, q) * px) - H(vUv - vec2(o, -q) * px)) / (2. * o);
      g.y += (H(vUv + vec2(q, o) * px) - H(vUv - vec2(-q, o) * px)) / (2. * o);
    }
  }
  g /= 12.;
  vec3 n = vec3(-g * DEPTH * uUnit, 1.);
  // Micro textures, as small bumps: pores, the fine grain of cotton, the diagonal rib of wool
  n.xy += (bumps(p * 1.7) * .5 + bumps(p * 4.3) * .25) * tex.r;
  n.xy += (bumps(p * vec2(2.6, 2.2)) * .12 + bumps(p * 6.) * .06) * tex.g;
  n.xy += bumps(vec2(p.x + p.y, p.x - p.y) * vec2(2.4, .6)) * .3 * tex.b;
  n = normalize(n);

  // Ambient occlusion: how much higher the surroundings are, on two rings
  float occ = 0.;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * .785 + .3;
    vec2 d = vec2(cos(a), sin(a)) * px * uUnit;
    occ += max(H(vUv + d * 5.) - h, 0.) + max(H(vUv + d * 14.) - h, 0.) * .6;
  }
  float ao = clamp(1. - occ * 1.1, .15, 1.);

  // Lights: key from the right (hard, casts shadows), fill from the left, bar lamp from above
  vec3 key = normalize(vec3(.86, .3, .42)), fill = normalize(vec3(-.75, .1, .65)), lamp = normalize(vec3(-.1, .92, .38));
  // Cast shadow: walk towards the key light over the height; anything above the ray hides it
  float lit = 1.;
  vec2 dir = normalize(key.xy) * px * uUnit;
  float rise = key.z / length(key.xy) / DEPTH;        // ray height gained per drawing unit
  for (int i = 1; i <= 24; i++) {
    float t = float(i) * 2.2;
    float above = H(vUv + dir * t) - (h + rise * t);
    lit = min(lit, 1. - smoothstep(.0, .05, above));
  }
  float skin = tex.r;
  float w = .35 * skin;                               // wrapped light: light going under the skin
  float dk = clamp((dot(n, key) + w) / (1. + w), 0., 1.) * mix(.25, 1., lit);
  float df = clamp((dot(n, fill) + w) / (1. + w), 0., 1.);
  float dl = clamp(dot(n, lamp), 0., 1.);
  vec3 base = alb.rgb * (1. - mat.b * .75);           // metals are mostly reflection
  vec3 col = base * (.06 * ao + 1.05 * dk + .16 * df * ao + .26 * dl * ao);
  // Highlights (Blinn-Phong): sharp on glossy things, coloured by metals
  vec3 hk = normalize(key + vec3(0, 0, 1)), hl = normalize(lamp + vec3(0, 0, 1));
  float shine = mix(6., 140., mat.g);
  float s = (pow(max(dot(n, hk), 0.), shine) * lit + pow(max(dot(n, hl), 0.), shine) * .5 * ao) * mat.r * (shine + 8.) / 40.;
  col += s * mix(vec3(1.), alb.rgb * 1.6, mat.b);
  // Metals and glossy things also mirror the room: a dim bar, brighter towards the lamp above
  vec3 r = reflect(vec3(0, 0, -1), n);
  float room = .05 + .6 * smoothstep(-.2, 1., r.y) + .5 * pow(max(dot(r, key), 0.), 4.);
  col += room * ao * mat.g * mix(vec3(.12) * mat.r, alb.rgb * 1.3, mat.b);
  // A little red in the skin's shadow edge, as light coming back through it (lost in the black and white below)
  // Black and white like the photo, except colourful things (brass, gold, wood) that keep some colour
  float lum = dot(col, vec3(.299, .587, .114));
  float sat = max(alb.r, max(alb.g, alb.b)) - min(alb.r, min(alb.g, alb.b));
  col = mix(vec3(lum), col, smoothstep(.12, .35, sat));
  col = col / (1. + col * .35);                        // highlights roll off
  col = smoothstep(0., 1., pow(col, vec3(1.05)));     // the photo's contrast
  col += (hash(gl_FragCoord.xy) - .5) * .07;           // film grain
  gl_FragColor = vec4(clamp(col, 0., 1.) * alb.a, alb.a);
}`;

// Smoothing of the height before lighting, one direction at a time (uStep = one texel across or
// down). The drawing has only 256 grey levels, so a gentle slope is a staircase that the lighting
// would show as rings; a wide Gaussian blur turns the steps back into a slope, and its result is
// kept with 16 bits (whole levels in red, the fraction in green).
const RELIEF_BLUR = `
precision highp float;
uniform sampler2D uSrc;
uniform vec2 uStep;
uniform float uPacked;  // 0: the 8-bit drawing, 1: an already packed height
varying vec2 vUv;
float get(vec2 uv) { vec4 v = texture2D(uSrc, uv); return uPacked > .5 ? v.r + v.g / 255. : v.r; }
void main() {
  float sum = 0., wsum = 0.;
  for (int i = -12; i <= 12; i++) {
    float w = exp(-float(i * i) / 32.);  // sigma = 4 texels
    sum += get(vUv + uStep * float(i)) * w; wsum += w;
  }
  float v = sum / wsum * 255.;
  gl_FragColor = vec4(floor(v) / 255., fract(v), 0., 1.);
}`;

// The SVG drawings are decoded as images, at the bitmap size
const reliefImage = svg => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = fail;
  img.src = "data:image/svg+xml," + encodeURIComponent(svg);
});

// layers: { name: { albedo, height, mat, tex } } SVG strings, all `width` x `height` drawing units,
// rendered at `unit` bitmap pixels per unit. Returns { name: blob URL } or null.
async function renderRelief(layers, width, height, unit = 2) {
  const c = document.createElement("canvas"), W = width * unit, Hh = height * unit;
  c.width = W; c.height = Hh;
  const gl = c.getContext("webgl", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const vs = sh(gl.VERTEX_SHADER, "attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}");
  const program = src => {
    const fs = sh(gl.FRAGMENT_SHADER, src), prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "p"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn("relief shader:", gl.getShaderInfoLog(fs)); return null; }
    return prog;
  };
  const light = program(RELIEF_SHADER), blur = program(RELIEF_BLUR);
  if (!light || !blur) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());  // one triangle covering the bitmap
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);  // texture rows bottom-up, like the output (y up)
  const texture = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(f => gl.texParameteri(gl.TEXTURE_2D, f, gl.LINEAR));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(f => gl.texParameteri(gl.TEXTURE_2D, f, gl.CLAMP_TO_EDGE));
    return t;
  };
  // Four drawings in, two render targets for the two blur passes of the height
  const maps = [texture(), texture(), texture(), texture()];
  const targets = [0, 1].map(() => {
    const t = texture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, Hh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, fb };
  });
  const pass = (prog, fb, textures, uniforms) => {
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, W, Hh);
    textures.forEach(([name, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(gl.getUniformLocation(prog, name), i);
    });
    for (const [name, v] of Object.entries(uniforms)) gl[`uniform${v.length}f`](gl.getUniformLocation(prog, name), ...v);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const urls = {};
  try {
    for (const [name, layer] of Object.entries(layers)) {
      const imgs = await Promise.all(["albedo", "height", "mat", "tex"].map(k => reliefImage(layer[k])));
      imgs.forEach((img, i) => {
        gl.bindTexture(gl.TEXTURE_2D, maps[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);  // throws if the browser forbids it
      });
      pass(blur, targets[0].fb, [["uSrc", maps[1]]], { uStep: [1 / W, 0], uPacked: [0] });
      pass(blur, targets[1].fb, [["uSrc", targets[0].t]], { uStep: [0, 1 / Hh], uPacked: [1] });
      pass(light, null, [["uAlb", maps[0]], ["uHgt", targets[1].t], ["uMat", maps[2]], ["uTex", maps[3]]],
        { uRes: [W, Hh], uUnit: [unit] });
      const blob = await new Promise(ok => c.toBlob(ok, "image/webp", .92));
      if (!blob) return null;
      urls[name] = URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn("relief:", e);
    return null;
  } finally {
    const x = gl.getExtension("WEBGL_lose_context");
    if (x) x.loseContext();  // free the GPU now
  }
  return urls;
}
