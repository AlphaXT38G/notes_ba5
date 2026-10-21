// ── The bard of the epic finale: his scene, ray-marched in WebGL ───────────────────────────────
// A knight in plate armour and a blue mantle sits in the grass, his back against a mossy boulder,
// playing a lute by a campfire, under a moonlit sky: a little diorama drawn as pixel art. Every
// pixel follows a ray from the camera into a scene made of distance fields (no image, no model),
// so the light is computed, not painted:
//   - the campfire is the main light: it flickers, and its shadows (the knight's on the boulder,
//     the stones' on the grass) are traced towards it; the moon behind them adds a cold rim light
//   - the armour, the sword and the shield's rim are mirrors: a second ray is traced from them,
//     so the plates show the fire, the grass and the sky
//   - ambient occlusion darkens the creases (under the arms, where he leans on the rock)
//   - the flames are a sheet of moving noise facing the camera, with sparks rising from them
//   - the sky: stars, the moon, two rows of fir trees, and for Dragonborn a starry night with the
//     Milky Way and a dragon crossing the moon from time to time
// Then the colours are tone mapped and posterised with ordered (Bayer) dithering at a low
// resolution, shown with crisp pixels (css/bard.css): the look of a pixel art painting.
// Two moods, mixed by uMood: 0 is the arcane night of the epic mix (blue fire, blue motes),
// 1 is Dragonborn (a red fire, a starry night and the Milky Way, the dragon).
// createBardScene(canvas) returns null without WebGL (bard.js then shows a plain frame); else
// { render(values), resize(scale), ready() }, values being the animated uniforms (see
// BARD_UNIFORMS), ready() saying "compiling", "ready" or "failed".

// The lute's frame, in the knight's own coordinates (x his left, y up, z where he looks): the
// soundboard faces him forward and up, the neck goes to his left and up. Made orthonormal here,
// then written into the shader as numbers.
const bardLute = (() => {
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return v.map(c => c / l); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const n = norm([.12, .42, 1]);
  const u0 = norm([1, .48, -.12]), k = dot(u0, n);
  const u = norm(u0.map((c, i) => c - n[i] * k));
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  const glsl = a => `vec3(${a.map(c => c.toFixed(4)).join(",")})`;
  return { u: glsl(u), v: glsl(v), n: glsl(n) };
})();

// The camera and the fire, shared with bard.js, which finds where the fire and the knight are in
// the painting (bardProject) to make them clickable
const BARD_CAM = { ro: [-.04, .55, -1.55], ta: [-.04, .37, .3], focal: 1.5 };
const BARD_FIRE = [-.56, 0, -.2], BARD_KNIGHT = [.31, .45, .44];  // the knight: his chest
// Where a point of the scene shows, in the painting's units: [x, y] from its centre, in heights
const bardProject = P => {
  const sub = (a, b) => a.map((c, i) => c - b[i]), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = a => { const l = Math.sqrt(dot(a, a)); return a.map(c => c / l); };
  const cw = norm(sub(BARD_CAM.ta, BARD_CAM.ro)), cu = norm([cw[2], 0, -cw[0]]);
  const cv = [cw[1] * cu[2] - cw[2] * cu[1], cw[2] * cu[0] - cw[0] * cu[2], cw[0] * cu[1] - cw[1] * cu[0]];
  const d = sub(P, BARD_CAM.ro), z = dot(d, cw);
  return [dot(d, cu) / z * BARD_CAM.focal, dot(d, cv) / z * BARD_CAM.focal];
};
const bardVec = a => `vec3(${a.join(", ")})`;

// uTime: seconds; uMood: 0 epic mix, 1 Dragonborn; uPlay: how much he plays (0 still, 1 playing);
// uStrum: the right hand across the strings (-1 to 1); uFret: the left hand along the neck;
// uPitch / uYaw: his head (chin down < 0 < looking up, his right < 0 < his left); uFlare: the fire
// (< 0 drawn in, 1 a burst); uRing: the shock wave of a burst running over the ground (0 to 1)
const BARD_UNIFORMS = ["uRes", "uTime", "uMood", "uPlay", "uStrum", "uFret", "uPitch", "uYaw", "uFlare", "uRing"];

const BARD_SHADER = `
uniform vec2 uRes;
uniform float uTime, uMood, uPlay, uStrum, uFret, uPitch, uYaw, uFlare, uRing;

// The scene, in metres: y up, the camera looks along +z. He sits at KNIGHT, facing KF (towards the
// camera and the fire, on his left), KX being his left; the boulder is behind him, the fire in
// front of him, on the left of the picture.
const vec3 KNIGHT = vec3(.22, 0., .32);
const vec3 KF = vec3(-.6, 0., -.8);
const vec3 KX = vec3(-.8, 0., .6);
const vec3 FIRE = ${bardVec(BARD_FIRE)};
const vec3 ROCK = vec3(.62, .3, .86);
const vec3 MOON = vec3(-.3613, .1305, .9232);  // normalised      // towards the moon, behind them on the left
const vec3 LU = ${bardLute.u}, LV = ${bardLute.v}, LN = ${bardLute.n};  // the lute: neck, across, soundboard
const vec3 LC = vec3(-.035, .31, .17);            // the middle of its body, on his right thigh

// ── Noise ──
float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float hash2(vec2 p) { return hash(vec3(p, 1.7)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

// ── Distance fields ──
float sdEll(vec3 p, vec3 r) { float k0 = length(p / r), k1 = length(p / (r * r)); return k0 * (k0 - 1.) / k1; }
float sdCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {  // a capsule whose radius goes from r1 to r2
  vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - ba * h) - mix(r1, r2, h);
}
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.) - r; }
float sdCyl(vec3 p, float r, float h, float rr) {  // upright cylinder with rounded edges
  vec2 d = vec2(length(p.xz) - r + rr, abs(p.y) - h + rr);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.)) - rr;
}
float smin(float a, float b, float k) { float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
vec2 un(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec3 toLute(vec3 q) { q -= LC; return vec3(dot(q, LU), dot(q, LV), dot(q, LN)); }

// Materials: 1 grass, 2 rock, 3 steel, 4 blue cloth, 5 lute wood, 6 leather, 7 log, 8 fire
// stone, 9 shield, 10 bark
// The knight, in his own coordinates q. A bounding sphere first: far from it, nothing to compute.
vec2 knight(vec3 q) {
  float bound = length(q - vec3(0., .4, .16)) - .8;
  if (bound > .08) return vec2(bound, 0.);
  float breath = 1. + .014 * sin(uTime * 1.7);
  // The body in its blue surcoat, leaning back against the boulder: chest and belly melted
  // into one, wider at the shoulders, its skirt over the hips
  float body = sdEll(q - vec3(0., .46, -.16), vec3(.2, .16, .135) * breath);
  body = smin(body, sdCone(q, vec3(0., .13, -.01), vec3(0., .36, -.11), .165, .15), .1);
  vec2 r = vec2(body, 4.);
  vec3 b = q - vec3(0., .25, -.06);
  b.yz = rot(-.4) * b.yz;
  r = un(r, vec2(length(vec2(length(b.xz * vec2(1., 1.1)) - .155, b.y)) - .018, 6.));  // belt
  // Pauldrons
  vec3 qs = vec3(abs(q.x), q.yz);
  r = un(r, vec2(sdEll(qs - vec3(.19, .58, -.19), vec3(.1, .075, .1)), 3.));
  // Helmet: a great helm on a pivot at the neck, turned by uYaw and uPitch, with a visor slit and
  // a ridge down its face
  vec3 h = q - vec3(0., .63, -.22);
  h.xz = rot(uYaw) * h.xz;
  h.yz = rot(uPitch) * h.yz;
  h -= vec3(0., .14, .025);
  float helm = sdCyl(h, .094 - .012 * h.y, .115, .035);
  helm = max(helm, -sdBox(h - vec3(0., .025, .11), vec3(.075, .007, .06), 0.));
  helm = min(helm, sdBox(h - vec3(0., -.015, .093), vec3(.005, .085, .008), .002));
  r = un(r, vec2(min(helm, sdCone(q, vec3(0., .52, -.17), vec3(0., .69, -.22), .085, .075)), 3.));  // with the gorget
  // The mantle: a collar of blue cloth around the neck, the cape behind his back, down to the
  // grass where it spreads on his right, its hem waving a little
  vec3 c = q - vec3(0., .6, -.205);
  c.yz = rot(-.45) * c.yz;
  float cloth = length(vec2(length(c.xz * vec2(1., 1.2)) - .125, c.y)) - .04;
  vec3 cp = q - vec3(0., .3, -.32);
  cp.yz = rot(.42) * cp.yz;
  cp.z += .012 * sin(cp.y * 14. + uTime * 2.1) + .02 * cp.x * cp.x * 9.;
  cloth = min(cloth, sdBox(cp, vec3(.2 + .06 * (.3 - cp.y), .3, .012), .01));
  cloth = min(cloth, sdEll(q - vec3(-.27, .015, -.18), vec3(.25, .022, .2)) - .004 * sin(q.x * 40. + uTime));
  // a tabard over the lap
  cloth = min(cloth, sdEll(q - vec3(0., .15, .07), vec3(.18, .06, .16)));
  r = un(r, vec2(cloth, 4.));
  // Legs: the right one stretched out, the left one bent, knee up; knee cops and sabatons
  vec3 kr = vec3(-.12, .14, .36), kl = vec3(.14, .26, .3);
  float legs = min(sdCone(q, vec3(-.09, .12, .02), kr, .085, .065), sdCone(q, kr, vec3(-.14, .075, .64), .064, .052));
  legs = min(legs, min(sdCone(q, vec3(.09, .12, .02), kl, .085, .065), sdCone(q, kl, vec3(.19, .06, .52), .064, .052)));
  legs = min(legs, min(length(q - kr) - .07, length(q - kl) - .07));
  legs = min(legs, sdEll(q - vec3(-.14, .1, .68), vec3(.042, .07, .05)));
  legs = min(legs, sdEll(q - vec3(.19, .075, .56), vec3(.042, .065, .05)));
  r = un(r, vec2(legs, 3.));
  // Arms: the right hand strums over the soundboard (uStrum, across the strings), the left one
  // holds the neck (uFret, along it); elbows out, with couters and gauntlets
  vec3 hr = LC + LV * (.03 + .04 * uStrum) + LN * .05 - LU * .035;
  vec3 hl = LC + LU * (.32 + uFret) - LN * .012 - LV * .036;
  vec3 sr = vec3(-.19, .55, -.19), sl = vec3(.19, .55, -.19);
  vec3 er = mix(sr, hr, .5) + vec3(-.11, -.09, -.03), el = mix(sl, hl, .5) + vec3(.11, -.1, .02);
  // the forearms stop at the wrists, so that the hands show (below)
  vec3 wr = hr + LV * .034 + LN * .006, wl = hl - LV * .034 - LN * .004;
  float arms = min(sdCone(q, sr, er, .056, .05), sdCone(q, er, wr, .05, .036));
  arms = min(arms, min(sdCone(q, sl, el, .056, .05), sdCone(q, el, wl, .05, .036)));
  arms = min(arms, min(length(q - er) - .058, length(q - el) - .058));
  r = un(r, vec2(arms, 3.));
  // The hands, in steel gauntlets: a palm, four fingers (one finger repeated) and a thumb. The
  // right one over the strings, fingers pointing across them and curled onto the soundboard; the
  // left one under the neck, its fingers wrapped over it. In a loop, written out once.
  for (int k = ZERO; k < 2; k++) {
    bool right = k == 0;
    vec3 a = right ? -LV : LV, c = right ? LN : -LN, x = q - (right ? hr : hl);  // fingers, back of the hand
    vec3 hp = vec3(dot(x, LU), dot(x, a), dot(x, c));
    float hand = sdBox(hp, vec3(.027, .024, .011), .01);
    vec3 f = hp;
    f.x -= clamp(floor((f.x + .021) / .014 + .5), 0., 3.) * .014 - .021;
    hand = min(hand, sdCone(f, vec3(0., .03, 0.), vec3(0., .062, -.02), .0095, .008));
    hand = min(hand, sdCone(hp, vec3(right ? -.028 : .028, 0., .004), vec3(right ? -.03 : .03, .032, -.012), .009, .007));
    r = un(r, vec2(hand, 3.));
  }
  // The lute: a pear-shaped bowl cut flat by the soundboard, the neck, and the pegbox bent back
  vec3 l = toLute(q);
  float lute = smin(sdEll(l - vec3(-.03, 0., 0.), vec3(.13, .09, .075)), sdEll(l - vec3(.07, 0., 0.), vec3(.085, .062, .058)), .05);
  lute = max(lute, l.z - .004);
  lute = min(lute, sdBox(l - vec3(.25, 0., -.004), vec3(.14, .016, .01), .003));
  vec3 pb = l - vec3(.385, 0., -.008);
  pb.xz = rot(.95) * pb.xz;
  lute = min(lute, sdBox(pb - vec3(.045, 0., 0.), vec3(.045, .015, .007), .003));
  r = un(r, vec2(lute, 5.));
  // His sword, planted in the grass on his left, leaning on the boulder: blade, crossguard, grip
  // (leather) and pommel
  vec3 s = q - vec3(.43, -.04, -.08);
  s.yz = rot(.3) * s.yz;
  s.xy = rot(-.08) * s.xy;
  float sword = min(sdBox(s - vec3(0., .3, 0.), vec3(.019 - .012 * (.6 - s.y), .3, .004), .002), sdBox(s - vec3(0., .615, 0.), vec3(.075, .01, .012), .004));
  sword = min(sword, length(s - vec3(0., .77, 0.)) - .024);
  r = un(r, vec2(sword, 3.));
  r = un(r, vec2(sdCone(s, vec3(0., .63, 0.), vec3(0., .75, 0.), .014, .013), 6.));
  return r;
}

// The heater shield leaning on the boulder, on the right of the picture: a lens-shaped outline,
// slightly curved
vec3 shieldSpace(vec3 p) {
  vec3 s = p - vec3(.76, .23, .28);
  s.xz = rot(-.35) * s.xz;
  s.yz = rot(-.32) * s.yz;
  return s;
}
float shieldShape(vec2 s) { return max(length(vec2(abs(s.x) + .17, s.y - .1)) - .34, s.y - .19); }
float shield(vec3 p) {
  vec3 s = shieldSpace(p);
  s.z += s.x * s.x * .7;
  return max(shieldShape(s.xy), abs(s.z) - .014) * .9;
}

// The boulder: three lumps melted together, roughened by a few waves
float rock(vec3 p) {
  float d = sdEll(p - ROCK, vec3(.82, .62, .55));
  d = smin(d, sdEll(p - ROCK - vec3(.6, -.12, .16), vec3(.5, .46, .46)), .2);
  d = smin(d, sdEll(p - ROCK - vec3(-.62, -.24, .12), vec3(.42, .33, .36)), .15);
  d += .028 * sin(p.x * 9.) * sin(p.y * 11. + 1.) * sin(p.z * 7. + 2.) + .012 * sin(p.x * 23. + p.z * 19.) * sin(p.y * 21.);
  return d * .8;
}

// The campfire: a ring of eight stones (one stone repeated around the circle) and a tepee of logs
vec2 campfire(vec3 p) {
  float bound = length(p - vec3(0., .1, 0.)) - .36;
  if (bound > .08) return vec2(bound, 0.);
  float a = atan(p.z, p.x), sector = 6.2831853 / 8.;
  a = mod(a + sector * .5, sector) - sector * .5;
  vec3 sp = vec3(cos(a) * length(p.xz), p.y, sin(a) * length(p.xz));
  vec2 r = vec2(sdEll(sp - vec3(.21, .025, 0.), vec3(.06, .045, .055)), 8.);
  float logs = sdCone(p, vec3(-.14, .02, -.07), vec3(.02, .19, 0.), .028, .016);
  logs = min(logs, sdCone(p, vec3(.13, .02, -.06), vec3(-.01, .19, .01), .028, .016));
  logs = min(logs, sdCone(p, vec3(0., .02, .14), vec3(0., .19, -.01), .028, .016));
  logs = min(logs, sdCone(p, vec3(-.16, .03, .08), vec3(.16, .03, .12), .03, .03));
  return un(r, vec2(logs, 7.));
}

vec2 map(vec3 p) {
  vec2 r = vec2(p.y - .015 * sin(p.x * 3.1) * sin(p.z * 2.3 + 1.), 1.);
  r = un(r, vec2(rock(p), 2.));
  r = un(r, vec2(sdCone(p, vec3(1.32, -.1, 1.45), vec3(1.22, 2.6, 1.6), .34, .24) + .01 * sin(atan(p.z - 1.45, p.x - 1.3) * 14.), 10.));
  vec3 k = p - KNIGHT;
  r = un(r, knight(vec3(dot(k, KX), k.y, dot(k, KF))));
  r = un(r, campfire(p - FIRE));
  r = un(r, vec2(shield(p), 9.));
  return r;
}

// The tetrahedron of offsets that samples the gradient of map() for a normal
vec3 tetra(int k) {
  float f = float(k);
  return .5773 * (2. * vec3(mod(floor((f + 3.) / 2.), 2.), mod(floor(f / 2.), 2.), mod(f, 2.)) - 1.);
}

// ── Light ──
vec3 fireColor() { return mix(vec3(.3, .62, 1.7), vec3(1.9, .16, .1), uMood); }
float fireFlicker() {
  return (1. + .16 * sin(uTime * 11.) + .1 * sin(uTime * 17.3 + 1.) + .1 * sin(uTime * 5.1 + 2.)) * (1. + 1.8 * uFlare);
}
vec3 fireLight() { return FIRE + vec3(.02 * sin(uTime * 7.), .3 + .1 * uFlare, .02 * cos(uTime * 6.)); }
vec3 moonColor() { return mix(vec3(.22, .3, .62), vec3(.3, .38, .55), uMood) * .55; }

// The colour of each material at p (normal n). Two noises, coarse and fine, are computed once and
// shared by every material: each noise() written out costs the compiler dearly.
vec3 albedo(vec3 p, vec3 n, float m) {
  vec3 c = vec3(.5);
  float n1 = noise(p * 6.), n2 = noise(p * 19. + 7.);
  if (m < 1.5) {  // grass: patches and blades, more trodden near the fire
    float g = n1, blade = hash2(floor(p.xz * 70.));
    c = mix(vec3(.05, .12, .035), vec3(.14, .27, .07), g) * (.75 + .5 * blade);
    c = mix(c, vec3(.13, .1, .06), smoothstep(.42, .2, length(p.xz - FIRE.xz)));
  } else if (m < 2.5) {  // stone, under a coat of moss on its top and its shady side
    float moss = smoothstep(.15, .55, n.y * .7 + n.z * .35 + .55 * n1 - .2);
    c = vec3(.21, .22, .24) * (.6 + .7 * n2);
    c = mix(c, mix(vec3(.06, .17, .04), vec3(.2, .36, .08), n2), moss);
  } else if (m < 3.5) {
    c = vec3(.62, .64, .68);
  } else if (m < 4.5) {  // the mantle: deep blue, with folds
    c = vec3(.06, .13, .46) * (.75 + .25 * sin(p.y * 45. + p.x * 25.));
    vec3 k = p - KNIGHT;
    vec3 q = vec3(dot(k, KX), k.y, dot(k, KF));
    if (length(q.xy - vec2(0., .44)) < .2 && q.y > .09) {  // the surcoat: golden hem, a white star on the chest
      if (q.y < .13) c = vec3(.75, .56, .18);
      vec2 e = q.xy - vec2(0., .46);
      float a = atan(e.y, e.x), star = .035 + .025 * cos(a * 4.);
      if (q.z > -.1 && length(e) < star) c = vec3(.85, .85, .9);
    }
  } else if (m < 5.5) {  // the lute: spruce soundboard with its rosette, bridge and strings; ribbed bowl
    vec3 l = toLute(vec3(dot(p - KNIGHT, KX), p.y, dot(p - KNIGHT, KF)));
    if (l.x > .13) c = vec3(.16, .09, .045);
    else if (l.z > -.006) {
      c = vec3(.62, .4, .18);
      if (length(l.xy - vec2(.04, 0.)) < .024) c = vec3(.08, .045, .02);
      if (abs(l.x + .08) < .009 && abs(l.y) < .03) c = vec3(.15, .07, .03);
      if (abs(l.y) < .011 && l.x > -.08 && fract(l.y * 180.) < .5) c = vec3(.92, .86, .7);
    } else c = fract(atan(l.y, -l.z) * 2.5) < .5 ? vec3(.46, .22, .08) : vec3(.3, .13, .05);
  } else if (m < 6.5) {
    c = vec3(.2, .11, .06);
  } else if (m < 7.5) {  // logs, charred and glowing near the heart of the fire
    c = mix(vec3(.2, .12, .06), vec3(.04, .03, .03), smoothstep(.12, .03, length((p - FIRE).xz)));
  } else if (m < 8.5) {
    c = vec3(.3, .3, .32) * (.7 + .5 * n2);
  } else if (m < 9.5) {  // the shield: steel rim, deep red field, a golden sword
    vec3 s = shieldSpace(p);
    float e = shieldShape(s.xy);
    c = vec3(.48, .06, .06);
    if ((abs(s.x) < .018 && s.y > -.13 && s.y < .13) || (abs(s.y - .07) < .016 && abs(s.x) < .08)) c = vec3(.85, .65, .2);
    if (e > -.025) c = vec3(.62, .64, .68);
  } else {  // bark, mossy at the foot of the trunk
    c = vec3(.17, .12, .08) * (.6 + .7 * hash2(vec2(floor(atan(p.z - 1.45, p.x - 1.3) * 9.), floor(p.y * 3.))));
    c = mix(c, vec3(.08, .2, .05), smoothstep(.7, .1, p.y) * n1);
  }
  return c;
}

// Light reaching p: the fire, the moon and the sky, each light dimmed by its traced shadow
// (sFire, sMoon: 1 for what a mirror shows, not traced)
vec3 lighting(vec3 p, vec3 n, float sFire, float sMoon) {
  vec3 fl = fireLight() - p;
  float fd = length(fl);
  float fire = max(dot(n, fl / fd), 0.) * fireFlicker() / (1. + 5.5 * fd * fd);
  vec3 sky = mix(vec3(.015, .02, .03), mix(vec3(.05, .06, .15), vec3(.05, .09, .12), uMood), n.y * .5 + .5);
  return fireColor() * fire * sFire * 1.6 + moonColor() * max(dot(n, MOON), 0.) * sMoon + sky;
}
float ringGlow(vec3 p) {
  if (uRing <= 0. || uRing >= 1.) return 0.;
  float d = length(p.xz - FIRE.xz) - uRing * 2.2;
  return exp(-d * d * 300.) * (1. - uRing) * 2.5;
}

// ── Sky ──
// Fir trees on the horizon, as a profile of the direction around the camera: tiers of branches
float firs(float az, float k, float seed) {
  float x = az * k, i = floor(x), f = abs(fract(x) - .5) * 2.;
  float h = .07 + .11 * hash2(vec2(i, seed));
  return h * (1. - f) - .012 * fract(h * 90. * (1. - f));
}
vec3 sky(vec3 rd) {
  float el = rd.y, az = atan(rd.x, rd.z);
  vec3 top = mix(vec3(.008, .008, .035), vec3(.004, .006, .028), uMood);
  vec3 low = mix(vec3(.07, .05, .2), vec3(.05, .05, .15), uMood);
  vec3 c = mix(low, top, smoothstep(-.05, .5, el));
  // Stars, twinkling
  vec3 sp = rd * 140., cell = floor(sp);
  float h = hash(cell);
  // Dragonborn's starry night: the Milky Way across the sky (a band of light, denser in stars)
  float milky = exp(-pow(dot(rd, vec3(.62, .55, -.56)), 2.) * 60.) * uMood;
  float few = mix(.975, .93, uMood) - .05 * milky;
  if (h > few) c += vec3(.7, .75, 1.) * (h - few) * mix(40., 22., uMood) * (.6 + .4 * sin(uTime * 3. + h * 90.)) * smoothstep(.03, .2, el) * step(length(fract(sp) - .5), .35);
  c += vec3(.16, .13, .26) * milky * (.5 + .5 * hash(floor(rd * 60.))) * smoothstep(0., .15, el);
  // The moon, its halo and its seas
  float md = dot(rd, MOON);
  c += vec3(.25, .3, .55) * pow(max(md, 0.), 300.) * .4 + vec3(.12, .12, .3) * pow(max(md, 0.), 25.) * .22;
  if (md > .9991) {
    vec3 mp = (rd - MOON) * 160.;
    c = mix(vec3(.95, .95, .88), vec3(.62, .64, .7), smoothstep(.5, .62, noise(mp * .6)));
  }
  // The dragon crossing the sky in front of the moon, wings beating (Dragonborn)
  if (uMood > .5) {
    float k = fract(uTime / 21.), x = (az + .9 - k * 2.4) / .05, y = (el - .5 - .08 * sin(k * 9.)) / .05;
    float flap = sin(uTime * 7.);
    float body = length(vec2(x * .5, y * 2.2 - x * .25)) - .9;
    float wing = max(abs(x + .1) - .55 + abs(y) * .2, (flap > 0. ? y : -y) - abs(flap) * 1.6 * (1. - abs(x + .1) * 1.4));
    wing = max(wing, flap > 0. ? -y : y);
    if (min(body, wing) < 0.) c = vec3(.01, .01, .02);
  }
  // Two rows of firs, the far one paler in the mist
  float far = firs(az, 26., 3.) * .7 - .01, near = firs(az + .17, 15., 7.) * .9 - .03;
  if (el < far) c = mix(vec3(.04, .05, .11), vec3(.05, .08, .1), uMood);
  if (el < near) c = mix(vec3(.012, .02, .04), vec3(.015, .03, .04), uMood);
  return c;
}

// ── The flames: a sheet facing the camera, noise rising through a flame shape ──
vec3 flamePalette(float heat) {
  vec3 blue = mix(mix(vec3(.25, .08, .6), vec3(.15, .45, 1.3), smoothstep(.1, .45, heat)), vec3(1.4, 1.7, 2.), smoothstep(.5, .95, heat));
  vec3 red = mix(mix(vec3(.45, .01, .03), vec3(1.5, .07, .04), smoothstep(.1, .45, heat)), vec3(1.9, .55, .3), smoothstep(.6, .95, heat));
  return mix(blue, red, uMood);
}
vec4 flames(vec3 ro, vec3 rd, float tHit) {
  vec3 nf = normalize(vec3(ro.x - FIRE.x, 0., ro.z - FIRE.z));
  float den = dot(rd, nf);
  if (abs(den) < 1e-3) return vec4(0.);
  float t = dot(FIRE - ro, nf) / den;
  if (t < 0. || t > tHit) return vec4(0.);
  vec3 P = ro + rd * t;
  vec2 f = vec2(dot(P - FIRE, normalize(cross(vec3(0., 1., 0.), nf))), P.y - .04);
  float H = .4 + .38 * uFlare, hh = f.y / H;
  if (hh < 0. || hh > 1.3 || abs(f.x) > .3) return vec4(0.);
  float n = noise(vec3(f.x * 13., f.y * 8. - uTime * 4.5, uTime * .6));
  float n2 = noise(vec3(f.x * 28., f.y * 20. - uTime * 8., 3.));
  // (never a zero width: smoothstep(0, 0, x) is undefined and left a patch of flame above the fire)
  float w = .13 * (1. + .6 * max(uFlare, 0.)) * pow(max(1. - hh, 0.), .55) + .002;
  float x = f.x + (n - .5) * .09 * hh;
  float dens = smoothstep(w, w * .15, abs(x)) * smoothstep(1.15, .15, hh + (n2 - .5) * .55) * smoothstep(1., .8, hh);
  return vec4(flamePalette(dens * (1.15 - hh)) * dens, dens);
}
// Sparks rising from the fire (more in a burst), and in the arcane mood blue motes drifting around
vec3 sparks(vec3 ro, vec3 rd, float tHit) {
  vec3 c = vec3(0.);
  for (int i = ZERO; i < 12; i++) {
    float fi = float(i), life = fract(uTime * (.35 + .03 * fi) + fi * .37);
    vec3 s = FIRE + vec3(.08 * sin(fi * 2.3) + .06 * sin(uTime * 2. + fi) * life, .12 + life * (.75 + .6 * uFlare), .08 * cos(fi * 1.7));
    vec3 os = s - ro;
    float t = dot(os, rd);
    if (t > 0. && t < tHit) c += fireColor() * smoothstep(.014, .0, length(os - rd * t)) * (1. - life) * 1.6;
  }
  for (int i = ZERO; i < 7; i++) {
    float fi = float(i);
    vec3 s = vec3(-1. + fi * .38 + .1 * sin(uTime * .3 + fi), .3 + .25 * sin(uTime * .4 + fi * 2.) + .15 * fi / 7., .1 + .5 * sin(fi * 3.1));
    vec3 os = s - ro;
    float t = dot(os, rd);
    if (t > 0. && t < tHit) c += vec3(.35, .55, 1.4) * smoothstep(.02, .0, length(os - rd * t)) * (.6 + .4 * sin(uTime * 2. + fi)) * (1. - uMood);
  }
  return c;
}

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
float bayer4(vec2 a) { return bayer2(.5 * a) * .25 + bayer2(a); }

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 ro = ${bardVec(BARD_CAM.ro)}, ta = ${bardVec(BARD_CAM.ta)};
  vec3 cw = normalize(ta - ro), cu = normalize(cross(vec3(0., 1., 0.), cw)), cv = cross(cw, cu);
  vec3 rd = normalize(uv.x * cu + uv.y * cv + ${BARD_CAM.focal.toFixed(2)} * cw);

  // Every ray of the pixel is traced in this one loop, one step of map() per turn, so that map()
  // (the whole scene) is written out once in the compiled shader: compilers that copy a function
  // at each call (Direct3D's) then take seconds instead of minutes. The stages, in turn:
  //   0 the ray from the camera          4 the shadow towards the moon
  //   1 the normal where it hit (4 taps) 5 the mirror ray, from steel only
  //   2 ambient occlusion (4 taps)       6 the normal where the mirror ray hit
  //   3 the shadow towards the fire      7 done
  int stage = 0, tap = 0;
  bool mirror = false;  // the mirror ray has started
  float t = .01, m = 0., m2 = 0., ao = 0., aoW = 1., sFire = 1., sMoon = 1., tShadow = 0.;
  vec3 p = ro, n = vec3(0., 1., 0.), acc = vec3(0.), sro = ro, sdir = rd, q = ro, n2 = n, r = rd;
  for (int i = ZERO; i < 260; i++) {
    vec3 at = stage == 0 ? ro + rd * t : stage == 1 ? p + tetra(tap) * .0012 : stage == 2 ? p + n * .03 * float(tap + 1)
      : stage == 5 ? sro + r * t : stage == 6 ? q + tetra(tap) * .0012 : sro + sdir * t;
    vec2 h = map(at);
    if (stage == 0) {
      if (h.x < .0012 * t) { m = h.y; p = at; stage = 1; }
      else { t += h.x; if (t > 7.) stage = 7; }
    } else if (stage == 1 || stage == 6) {
      acc += tetra(tap) * h.x;
      if (++tap == 4) {
        tap = 0;
        if (stage == 1) { n = normalize(acc); stage = 2; } else { n2 = normalize(acc); stage = 7; }
        acc = vec3(0.);
      }
    } else if (stage == 2) {
      ao += (.03 * float(tap + 1) - h.x) * aoW;
      aoW *= .7;
      if (++tap == 4) {
        tap = 0;
        stage = 3;
        vec3 fl = fireLight() - p;
        tShadow = length(fl) - .12;
        sro = p + n * .01; sdir = fl / length(fl); t = .03;
        if (dot(n, sdir) <= 0.) { sFire = 0.; stage = 4; sdir = MOON; tShadow = 3.; }
        if (stage == 4 && dot(n, MOON) <= 0.) { sMoon = 0.; stage = 5; }
      }
    } else if (stage == 3 || stage == 4) {  // soft shadow: how much of the light is seen
      float res = min(stage == 3 ? sFire : sMoon, 9. * h.x / t);
      if (stage == 3) sFire = res; else sMoon = res;
      t += clamp(h.x, .015, .2);
      if (res < .01 || t > tShadow) {
        t = .03;
        if (stage == 3) { stage = 4; sdir = MOON; tShadow = 3.; if (dot(n, MOON) <= 0.) { sMoon = 0.; stage = 5; } }
        else stage = 5;
      }
    } else if (stage == 5) {
      if (!mirror) {  // entering it: steel and the shield's rim only
        bool steel = m > 2.5 && m < 3.5 || m > 8.5 && m < 9.5 && shieldShape(shieldSpace(p).xy) > -.025;
        if (!steel) stage = 7; else { r = reflect(rd, n); sro = p + n * .015; t = .02; mirror = true; }
      } else if (h.x < .003 * t) { m2 = h.y; q = at; stage = 6; }
      else { t += h.x; if (t > 4.) stage = 7; }
    }
    if (stage == 7) break;
  }
  sFire = clamp(sFire, 0., 1.); sMoon = clamp(sMoon, 0., 1.); ao = clamp(1. - ao * 3.2, 0., 1.);

  // The colour of what the camera ray and the mirror ray found (or the sky they went to): in a
  // loop as well, so that albedo() and sky() are written out once
  vec3 seen = vec3(0.), mirrored = vec3(0.), albP = vec3(0.), lightP = vec3(0.);
  for (int k = ZERO; k < 2; k++) {
    bool cam = k == 0;
    float mk = cam ? m : m2;
    vec3 c;
    if (mk > 0.) {
      vec3 pk = cam ? p : q, nk = cam ? n : n2;
      vec3 a = albedo(pk, nk, mk), l = lighting(pk, nk, cam ? sFire : 1., cam ? sMoon : 1.);
      if (cam) { albP = a; lightP = l; }
      c = a * l;
    } else c = sky(cam ? rd : r);
    if (cam) seen = c; else mirrored = c;
    if (!mirror) break;
  }
  vec3 col = seen;
  float tHit = m > 0. ? length(p - ro) : 1e5;
  if (m > 0.) {
    col *= mix(.45, 1., ao);
    if (mirror) {  // steel: a mirror, slightly rough, showing what the second ray found
      vec3 fl = normalize(fireLight() - p);
      float fres = .55 + .45 * pow(1. - max(dot(-rd, n), 0.), 3.);
      col = albP * lightP * ao * .45 + mirrored * albP * fres * mix(.35, .7, ao);
      col += fireColor() * pow(max(dot(r, fl), 0.), 30.) * fireFlicker() * .6 + moonColor() * pow(max(dot(r, MOON), 0.), 40.) * 1.5;
    }
    if (m > 6.5 && m < 7.5) col += fireColor() * smoothstep(.13, .02, length((p - FIRE).xz)) * (.4 + .5 * noise(p * 30. + uTime * 3.)) * .8;  // embers
    col += fireColor() * ringGlow(p);
    col = mix(col, mix(vec3(.06, .045, .17), vec3(.045, .08, .13), uMood), smoothstep(3., 6.5, tHit));  // mist far away
  }

  vec4 fl = flames(ro, rd, tHit);
  col = col * (1. - fl.a * .5) + fl.rgb * 1.6;
  col += sparks(ro, rd, tHit);
  // the warm (or arcane) glow around the fire, in the air
  vec3 os = fireLight() - ro;
  float ft = dot(os, rd), fd = length(os - rd * ft);
  col += fireColor() * .035 * fireFlicker() / (1. + fd * fd * 30.);

  col *= 1.3;  // exposure
  // Tone mapping, a vignette, then the pixel art look: few colours, ordered dithering
  col = clamp((col * (2.51 * col + .03)) / (col * (2.43 * col + .59) + .14), 0., 1.);
  col = pow(col, vec3(1. / 2.2));
  col *= 1. - .35 * dot(uv, uv);
  col = floor(col * 16. + .5 + (bayer4(gl_FragCoord.xy) - .5) * .7) / 16.;
  FRAG = vec4(col, 1.);
}`;

const BARD_PIXEL = 2;  // CSS pixels per pixel of the painting
// The shader takes long to compile on some systems (Direct3D, behind Chrome on Windows, turns
// every call of map() into a copy of the whole scene): it is compiled in the background where the
// browser can (KHR_parallel_shader_compile), and every loop starts at ZERO, a uniform the
// compiler cannot see through, so that it keeps the loops instead of unrolling them (WebGL 2; with
// WebGL 1 loops must start at a constant). Until it is ready, render() draws nothing (ready()).
function createBardScene(canvas) {
  const opts = { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: "low-power" };
  const gl2 = canvas.getContext("webgl2", opts), gl = gl2 || canvas.getContext("webgl", opts);
  if (!gl) return null;
  if (gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision < 16) return null;
  const head = gl2 ? "#version 300 es\nprecision highp float;\nuniform int uZero;\n#define ZERO min(uZero, 0)\nout vec4 fragOut;\n#define FRAG fragOut\n"
    : "precision highp float;\n#define ZERO 0\n#define FRAG gl_FragColor\n";
  const vert = gl2 ? "#version 300 es\nin vec2 p;void main(){gl_Position=vec4(p,0.,1.);}" : "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const fs = sh(gl.FRAGMENT_SHADER, head + BARD_SHADER), p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vert));
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "p");
  gl.linkProgram(p);
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  let state = "compiling";  // then "ready" or "failed"
  const u = {};
  const setUp = () => {
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn("bard shader:", gl.getShaderInfoLog(fs)); state = "failed"; return; }
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());  // one triangle covering the canvas
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    BARD_UNIFORMS.forEach(n => u[n] = gl.getUniformLocation(p, n));
    state = "ready";
  };
  // Without the extension, asking for the result waits for the compiler: done at once
  const ready = () => {
    if (state === "compiling" && (!parallel || gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR))) setUp();
    return state;
  };
  // One pixel of the painting is BARD_PIXEL CSS pixels (more when scale < 1, if frames come too
  // slowly): the canvas follows the frame's size
  const resize = (scale = 1) => {
    const box = canvas.getBoundingClientRect();
    canvas.width = Math.max(40, Math.round(box.width / BARD_PIXEL * scale));
    canvas.height = Math.max(27, Math.round(box.height / BARD_PIXEL * scale));
  };
  return {
    resize,
    ready,
    render(values) {
      if (ready() !== "ready") return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      BARD_UNIFORMS.forEach(n => { if (n !== "uRes") gl.uniform1f(u[n], values[n]); });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
