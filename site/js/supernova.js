// Supernova at the end of the Konami black hole (WebGL, one full-screen canvas over the page).
// Drawn as a function of the time t since the detonation, in stages that overlap:
//   0.0 s  detonation: a blinding white flash over the whole screen and a blue-white core
//   0.0 s  shock wave: a thin ring racing outwards and slowing down (blast wave, R ~ t^0.45),
//          hot blue-white at first, cooling to orange, with a fainter echo behind it
//   0.1 s  god rays: light streaming out between the clumps of ejecta
//   0.1 s  ejecta: hundreds of fragments flying out with trails, white-hot then orange then red
//   0.4 s  nebula: the remnant shell of gas, filaments torn radially (Rayleigh-Taylor fingers),
//          teal and magenta inside, orange at the edge, slowly expanding
//   1.4 s  pulsar: the neutron star left at the centre, two lighthouse beams sweeping round
//   ~5 s   everything fades out
// The canvas is transparent where nothing shines, so the page shows through as it comes back.
// createSupernova() returns null without WebGL.

const SN_SHADER = `
precision highp float;
uniform vec2 uRes;    // canvas size (px)
uniform float uT;     // seconds since the detonation
uniform float uUnit;  // canvas pixels per unit (unit = the smaller side of the screen)

float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= .5; } return s; }
// Colour of cooling matter: white-hot, then yellow, orange, deep red (k from 0 to 1)
vec3 cooling(float k) { return mix(mix(vec3(1., .97, .92), vec3(1., .62, .22), smoothstep(0., .5, k)), vec3(.75, .12, .08), smoothstep(.5, 1., k)); }

void main() {
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uUnit;
  float t = uT, d = length(p), a = atan(p.y, p.x);
  vec2 dir = p / max(d, 1e-4);
  vec3 col = vec3(0.);

  // Detonation: white-out of the whole screen, and the core, a tiny star brighter than everything
  col += vec3(1., .96, .9) * exp(-t * 4.) * (.9 + 6. * exp(-d * d * 30.));
  col += vec3(.75, .88, 1.) * exp(-d * d * 1500.) * (3. * exp(-t * 1.2) + .5);

  // Shock wave, plus an echo behind it; broken up a little along its edge
  float R = .5 * pow(t + .02, .45), w = .005 + .015 * t;
  float edge = .6 + .8 * noise(vec3(dir * 7., t * 2.));
  float shock = exp(-pow((d - R) / w, 2.)) * edge * exp(-t * .7);
  float echo = exp(-pow((d - R * .82) / (w * 2.), 2.)) * exp(-t * 1.1) * .4;
  col += (shock * 2.4 + echo) * mix(vec3(.65, .85, 1.), vec3(1., .55, .25), smoothstep(.2, 2.5, t));

  // God rays between the clumps, coming from the centre and fading with distance and time
  float rays = pow(noise(vec3(dir * 26., t * .3)), 6.) * 2.;
  col += rays * vec3(1., .85, .6) * exp(-d * 2.2) * smoothstep(0., .1, t) * exp(-t * .9);

  // Ejecta: one fragment per angular cell (two layers), each with its own speed; a bright head
  // and a trail behind it, colour of its cooling
  for (int l = 0; l < 2; l++) {
    float n = 70. + float(l) * 53., cell = floor((a / 6.2832 + .5) * n);
    float h = hash(vec3(cell, float(l) * 7.3, 1.)), sp = .22 + .5 * h;
    float ca = (cell + .5) / n * 6.2832 - 3.1416 + (hash(vec3(cell, 3., float(l))) - .5) * 3. / n;
    float head = sp * pow(t + .02, .6);                    // distance travelled, slowing down
    float along = d - head, across = d * sin(a - ca);
    float trail = along < 0. ? exp(along / (.015 + .07 * t * sp)) : exp(-along * along * 9000.);
    float frag = trail * exp(-across * across * 30000.) * smoothstep(.05, .15, t) * exp(-t * (.45 + .3 * h));
    col += frag * cooling(clamp(t * .35 + (1. - h) * .3, 0., 1.)) * 1.6;
  }

  // Nebula: a shell of torn filaments, radial streaks (high frequency around, low outwards)
  float Rn = .42 * pow(t + .02, .5), u = d / Rn;
  float fil = fbm(vec3(dir * 5., d * 2.5 - t * .3)) * .7 + fbm(vec3(dir * 18., d * 6.)) * .45;
  float shell = smoothstep(.15, .75, u) * (1. - smoothstep(.9, 1.15, u));
  float neb = shell * pow(fil, 3.) * 4.2 * smoothstep(.2, .9, t) * exp(-max(t - 2., 0.) * .55);
  vec3 gas = mix(vec3(.1, .75, .85), vec3(1., .25, .65), noise(vec3(dir * 3., d * 4. + 9.)));
  col += neb * mix(gas, vec3(1., .55, .2), smoothstep(.7, 1.05, u));

  // Pulsar: the neutron star at the centre and its two beams, a narrow cone sweeping round
  float on = smoothstep(1.4, 2., t) * exp(-max(t - 3.4, 0.) * 1.2);
  float spin = t * 7.;
  float off = abs(dot(p, vec2(-sin(spin), cos(spin))));     // distance from the beam axis
  float beam = exp(-pow(off / (.004 + .09 * d), 2.)) * exp(-d * 1.6);
  col += on * (beam * vec3(.55, .8, 1.) * 1.6 + exp(-d * d * 3000.) * vec3(.85, .93, 1.) * 3.);

  col *= 1. - smoothstep(4., 5.5, t);                          // the end
  col = 1. - exp(-col * 1.3);                                  // soft tone mapping
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));     // premultiplied, transparent if dark
}`;

const SN_DURATION = 5500;  // ms until it has fully faded

function createSupernova() {
  const c = document.createElement("canvas");
  c.id = "supernova";
  const gl = c.getContext("webgl", { antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const fs = sh(gl.FRAGMENT_SHADER, SN_SHADER), p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
  gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("supernova shader:", gl.getShaderInfoLog(fs)); return null; }
  gl.useProgram(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());  // one triangle covering the screen
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(p, "uRes"), uT = gl.getUniformLocation(p, "uT"), uUnit = gl.getUniformLocation(p, "uUnit");
  // Rendered below the screen resolution: it is all soft light, the browser scales it up smoothly
  const scale = Math.min(1, Math.sqrt(9e5 / (innerWidth * innerHeight)));
  c.width = Math.round(innerWidth * scale); c.height = Math.round(innerHeight * scale);

  let raf = 0, t0 = 0;
  const frame = now => {
    if (!t0) t0 = now;
    const t = (now - t0) / 1000;
    gl.viewport(0, 0, c.width, c.height);
    gl.uniform2f(uRes, c.width, c.height);
    gl.uniform1f(uUnit, Math.min(c.width, c.height));
    gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (t * 1000 < SN_DURATION) raf = requestAnimationFrame(frame); else destroy();
  };
  const destroy = () => {
    cancelAnimationFrame(raf);
    const x = gl.getExtension("WEBGL_lose_context");
    if (x) x.loseContext();  // free the GPU now
    c.remove();
  };
  return { canvas: c, start() { raf = requestAnimationFrame(frame); }, destroy };
}
