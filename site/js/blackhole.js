// Ray-traced black hole of the Konami code (WebGL). Every pixel follows a ray of light from the
// camera through the curved space around a Schwarzschild black hole, so what shows is physics,
// not a drawing:
//   - the shadow, ~2.6 times the horizon, edged by a thin photon ring (light that turned around it)
//   - a thin accretion disk seen almost edge-on, with the back of the disk bent over and under the
//     shadow by gravity (the Interstellar look), plus its fainter secondary images
//   - relativistic Doppler beaming: the side coming towards us is brighter and bluer, the other one
//     dimmer and redder; gravitational redshift dims and reddens the inner disk
//   - a blackbody colour from the temperature of each ring, Keplerian differential rotation that
//     shears the gas into spiral streaks, a hot haze above and below the disk
//   - a starfield and a faint galaxy band lensed around the hole (Einstein ring, double images)
// Two canvases so that the page can fall *between* them: the back one (sky, under the page) and the
// front one (disk + shadow, over the page, transparent elsewhere). A third, tiny canvas is a copy of
// the front one, scaled up and screen-blended: a cheap bloom.
// Units: the horizon radius is 1. createBlackHole() returns null without WebGL (CSS fallback).

const D0_CSS = 30;  // camera distance at full size, same as D0 in the shader

const BH_SHADER = `
precision highp float;
uniform vec2 uRes;       // canvas size (px)
uniform float uFocal;    // focal length (canvas px)
uniform float uTime;     // seconds since the start
uniform float uGrow;     // apparent size of the hole: 0 = nothing, 1 = full size
uniform float uElev;     // camera height above the disk plane (rad)
#define RIN 3.0          // inner edge of the disk: innermost stable circular orbit
#define ROUT 13.0        // outer edge
#define D0 30.0          // camera distance at full size

float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// Filmic tone mapping (ACES fit) then sRGB gamma: the disk is far brighter than a screen can show
vec3 tone(vec3 c) { c = clamp((c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14), 0., 1.); return pow(c, vec3(1. / 2.2)); }

// Planck's law at three wavelengths (red, green, blue, in µm), white balanced at 6500 K,
// normalised so the brightest channel is 1: the colour of a body at temperature T
vec3 planck(float T) { vec3 l = vec3(.610, .549, .468); return 1. / (l * l * l * l * l * (exp(14388. / (l * T)) - 1.)); }
vec3 blackbody(float T) { vec3 c = planck(max(T, 900.)) / planck(6500.); return c / max(c.r, max(c.g, c.b)); }

// Emitted flux of a thin disk (Shakura-Sunyaev): r^-3 (1 - sqrt(rin / r)), 1 at its peak (r ~ 4.1)
float flux(float r) { float x = RIN / r; return r < RIN ? 0. : x * x * x * (1. - sqrt(x)) / .0567; }

// Redshift factor g = observed / emitted frequency, for gas orbiting at radius r seen along the
// (backward) ray direction dir: Doppler of the orbital speed times the gravitational redshift
float shift(vec3 p, float r, vec3 dir, float speed) {
  float beta = min(sqrt(.5 / (r - 1.)), .7) * speed;
  vec3 orbit = vec3(-p.z, 0., p.x) / r;               // direction of motion (counter-clockwise from above)
  float cosT = dot(orbit, -dir);                      // the photon travels along -dir, towards the camera
  return sqrt(1. - beta * beta) / (1. - beta * cosT) * sqrt(1. - 1. / r);
}

// Light and opacity of the disk where the ray crosses its plane at p
vec4 disk(vec3 p, vec3 dir) {
  float r = length(p.xz);
  if (r < 2. || r > ROUT) return vec4(0.);
  // Gas pattern, turning with the Keplerian speed (faster inside): sampled on a circle so it has
  // no seam, long along the orbit and thin across it, so the shear draws spiral streaks
  float a = atan(p.z, p.x) - uTime * 1.6 * pow(r / RIN, -1.5);
  vec2 c = vec2(cos(a), sin(a));
  float n = .5 * noise(vec3(c * 2.2, r * 1.9)) + .3 * noise(vec3(c * 6., r * 5.3)) + .2 * noise(vec3(c * 15., r * 13.));
  float dens = smoothstep(2., RIN + .3, r) * (1. - smoothstep(ROUT * .5, ROUT, r)) * mix(.25, 1.45, n * n * 1.6);
  float g = shift(p, r, dir, 1.);
  float f = flux(r) + .06 * smoothstep(2., RIN, r) * (1. - flux(r));  // faint plunging gas inside the ISCO
  float T = 4400. * pow(max(f, .02), .25);                                 // peak temperature
  vec3 light = blackbody(T * g) * f * g * g * g * g * dens * .75;          // specific intensity ~ g^4
  // Hot thin gas: it hides what is behind it about as much as it shines, so the dim parts of the
  // disk passing in front of the shadow stay see-through instead of a grey veil
  return vec4(light, clamp(dot(light, vec3(.3, .5, .2)) * 1.6 + dens * .03, 0., .97));
}

// The sky behind: three layers of stars on a 3D grid of the direction, plus a faint galaxy band.
// Star size is set in pixels so they stay sharp points at any screen size.
vec3 sky(vec3 d) {
  vec3 col = vec3(0.);
  for (int l = 0; l < 3; l++) {
    float sc = 90. + float(l) * 95.;
    vec3 p = d * sc, id = floor(p), f = fract(p) - .5;
    float h = hash(id + float(l) * 13.1);
    if (h > .9) {
      vec3 o = (vec3(hash(id + 1.7), hash(id + 2.3), hash(id + 3.1)) - .5) * .7;
      float dd = length(f - o) * uFocal / sc;                         // distance in pixels
      float b = pow(hash(id + 4.9), 6.) * 3. + .15;
      vec3 tint = mix(vec3(1., .78, .55), vec3(.7, .82, 1.), hash(id + 6.2));
      col += tint * b * exp(-dd * dd * 1.1);
    }
  }
  vec3 n = normalize(vec3(.35, 1., .2));                             // galaxy band around this axis
  float band = exp(-pow(dot(d, n) * 3.2, 2.));
  float cloud = noise(d * 4.) * .6 + noise(d * 11.) * .4;
  col += band * cloud * cloud * vec3(.05, .035, .065) + vec3(.004, .003, .007) * noise(d * 2.5);
  return col;
}

void main() {
  vec2 px = gl_FragCoord.xy - .5 * uRes;
  float D = D0 / max(uGrow, .002);                // growing hole = camera coming from far away
  vec3 cam = D * vec3(0., sin(uElev), -cos(uElev));
  vec3 fw = -normalize(cam), rt = normalize(cross(vec3(0, 1, 0), fw)), up = cross(fw, rt);
  vec3 pos = cam, vel = normalize(fw * uFocal + rt * px.x + up * px.y);
  // Light ray in Schwarzschild space: x'' = -3/2 h^2 x / r^5, h = |x × x'| (constant)
  vec3 L = cross(pos, vel);
  float h2 = dot(L, L), esc = max(D * 1.5, 160.), captured = 0.;
  vec3 col = vec3(0.), haze = vec3(0.);
  float alpha = 0., r2 = dot(pos, pos), r = sqrt(r2);
  vec3 acc = -1.5 * h2 * pos / (r2 * r2 * r);
  for (int i = 0; i < 360; i++) {
    if (r < 1.) { captured = 1.; break; }                       // crossed the horizon
    if (r > esc && dot(pos, vel) > 0.) break;                   // gone to the sky
    // Velocity Verlet, with small steps near the hole only (step sizes that change smoothly,
    // or the sky shows rings where rays switch from one step count to the next)
    float dt = .045 * r * max(1., r / 16.);
    vec3 prev = pos;
    vel += .5 * acc * dt;
    pos += vel * dt;
    r2 = dot(pos, pos); r = sqrt(r2);
    acc = -1.5 * h2 * pos / (r2 * r2 * r);
    vel += .5 * acc * dt;
#ifdef FRONT
    if (r > ROUT + 2. && dot(pos, vel) > 0.) break;             // past the disk for good
    vec3 dir = normalize(vel);
    if (prev.y * pos.y < 0.) {                                  // through the disk plane
      vec4 e = disk(mix(prev, pos, prev.y / (prev.y - pos.y)), dir);
      col += (1. - alpha) * e.rgb;
      alpha += (1. - alpha) * e.a;
      if (alpha > .99) break;
    }
    // Hot haze over the disk: a thin glowing layer that thickens outwards, beamed like the disk
    float rr = length(pos.xz);
    if (rr > 2.2 && rr < ROUT) {
      float hz = abs(pos.y) / (.06 + .06 * rr);
      float g = shift(pos, rr, dir, .8);
      haze += (1. - alpha) * exp(-hz * hz) * flux(rr) * g * g * g * dt * length(vel) * .05 * vec3(1., .62, .32);
    }
#endif
  }
#ifdef FRONT
  if (captured > 0.) alpha = 1.;                                 // the shadow hides the page
  // Premultiplied colour. Glow brighter than its opacity raises the opacity: the colour must stay
  // a valid premultiplied one, or the bloom copy (2D canvas) turns it white
  vec3 c = tone(col + haze);
  gl_FragColor = vec4(c, max(alpha, max(c.r, max(c.g, c.b))));
#else
  gl_FragColor = vec4(captured > 0. ? vec3(0.) : tone(sky(normalize(vel))), 1.);
#endif
}`;

function createBlackHole() {
  const back = document.createElement("canvas"), front = document.createElement("canvas"), bloom = document.createElement("canvas");
  back.className = "bh-back"; front.className = "bh-front"; bloom.className = "bh-bloom";
  const opts = { antialias: false, depth: false, stencil: false, powerPreference: "high-performance" };
  const gb = back.getContext("webgl", { ...opts, alpha: false }), gf = front.getContext("webgl", { ...opts, premultipliedAlpha: true });
  if (!gb || !gf) return null;
  if (gb.getShaderPrecisionFormat(gb.FRAGMENT_SHADER, gb.HIGH_FLOAT).precision < 16) return null;  // no highp: rays go wrong

  // One program per canvas, the same shader with or without the disk (#define FRONT)
  const program = (gl, defs) => {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const vs = sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
    const fs = sh(gl.FRAGMENT_SHADER, defs + BH_SHADER);
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("black hole shader:", gl.getShaderInfoLog(fs)); return null; }
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());           // one triangle covering the screen
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    ["uRes", "uFocal", "uTime", "uGrow", "uElev"].forEach(n => u[n] = gl.getUniformLocation(p, n));
    return { gl, u };
  };
  const pb = program(gb, ""), pf = program(gf, "#define FRONT\n");
  if (!pb || !pf) return null;
  const bctx = bloom.getContext("2d");

  // Resolution: ray marching every pixel is heavy, so the canvases are rendered below the screen
  // resolution (the browser scales them up smoothly) and get smaller if frames come too slowly
  let scale = Math.min(1, Math.sqrt(1.1e6 / (innerWidth * innerHeight))), frontScale = .75;
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    back.width = Math.round(w * scale); back.height = Math.round(h * scale);
    front.width = Math.round(w * scale * frontScale); front.height = Math.round(h * scale * frontScale);
    bloom.width = Math.max(1, Math.round(w / 10)); bloom.height = Math.max(1, Math.round(h / 10));
  };
  resize();
  // Size: the shadow (2.6 horizon radii seen from 30) is 13 % of the smaller side of the screen
  const focal = Math.min(Math.min(innerWidth, innerHeight) * .13, 120) * D0_CSS / 2.6;

  // Size animation: keyframes of uGrow played on the clock, like el.animate() but for a uniform
  let grow = 0, tween = null;
  const t0 = performance.now();
  const draw = ({ gl, u }, c, t) => {
    gl.viewport(0, 0, c.width, c.height);
    gl.uniform2f(u.uRes, c.width, c.height);
    gl.uniform1f(u.uFocal, focal * c.width / innerWidth);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uGrow, grow);
    gl.uniform1f(u.uElev, .075 + .09 * Math.exp(-t / 2.2));  // slowly sinking towards the disk plane
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  let raf = 0, slow = 0, last = t0;
  const frame = now => {
    raf = requestAnimationFrame(frame);
    if (tween) {
      const k = Math.min(1, (now - tween.start) / tween.duration), e = tween.ease(k), f = tween.frames;
      let i = 1;
      while (i < f.length - 1 && f[i][0] < e) i++;
      grow = f[i - 1][1] + (f[i][1] - f[i - 1][1]) * Math.min(1, Math.max(0, (e - f[i - 1][0]) / (f[i][0] - f[i - 1][0])));
      if (k === 1) tween = null;
    }
    // Too slow (many frames over 40 ms): render fewer pixels from now on. Much longer gaps are a
    // hidden or throttled tab, not a slow GPU
    const gap = now - last;
    slow = gap > 40 && gap < 200 ? slow + 1 : Math.max(0, slow - 1);
    last = now;
    if (slow > 10 && scale > .45) { scale *= .85; slow = 0; resize(); }
    const t = (now - t0) / 1000;
    draw(pb, back, t);
    draw(pf, front, t);
    bctx.clearRect(0, 0, bloom.width, bloom.height);
    bctx.drawImage(front, 0, 0, bloom.width, bloom.height);  // same frame, so the buffer is still there
  };
  return {
    back, front, bloom,
    start() { raf = requestAnimationFrame(frame); },
    // frames: [[offset 0-1, size], ...], eased as a whole like a CSS animation
    size(frames, duration, ease = k => k) { tween = { frames, duration, ease, start: performance.now() }; },
    destroy() {
      cancelAnimationFrame(raf);
      [gb, gf].forEach(gl => { const x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); });  // free the GPU now
      [back, front, bloom].forEach(c => c.remove());
    }
  };
}
