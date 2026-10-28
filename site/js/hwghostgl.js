// ── Halloween ghosts: their volumetric rendering (WebGL) ──────────────────────────────────────
// Draws one ghost of the Halloween screens (hwghosts.js says who, where and in what pose) on its
// own small canvas, as a body of glowing mist seen through a camera:
//   - the body is a distance field built on a skeleton of 14 points (head, neck, chest, waist,
//     shoulders, elbows, hands, the hem of the robe, the end of the hair or of the hood, the
//     lantern, and the way the face looks), animated in JS: tapered limbs between the joints, a
//     robe falling as a cone from the waist to a ragged hem that ripples, long hair or a pointed
//     hood, smoothly joined;
//   - along each ray the mist is gathered: its density comes from the shape, stirred by a 3D
//     noise drifting upwards, thinner towards the hem; it glows (more at its edges, around its
//     heart, and from above), with a halo around the whole figure;
//   - its face has dark hollows for eyes and mouth (for the monk, the darkness under the hood and
//     two glints in it), and the monk's lantern is a warm light shining on him and around;
//   - it materialises and dissolves in patches (uReveal).
// The shape is called from one loop only (marching), as Direct3D copies a function at every call
// (see bardscene.js); compiled in the background (KHR_parallel_shader_compile).
//   hwSpectreInit(canvas)   sets up the program; false without WebGL
//   hwSpectreReady()        true once compiled
//   hwSpectreDraw(g)        draws: g = { joints (14 x 3 numbers), kind, time, reveal, alpha,
//                           night, lamp }
//   hwSpectreProject(p)     where a point of the ghost's space shows on its canvas, in halves
//                           of its height from its middle
const HW_SPECTRE_CAM = { y: -.25, z: 4.2, k: .3 };  // the camera: its height, its distance, its field
const HW_SPECTRE_FRAG = `precision highp float;
uniform vec2 uRes;uniform vec3 uJ[14];uniform float uTime,uKind,uReveal,uAlpha,uNight,uLamp;
float hash(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
// a tapered limb from a (radius ra) to b (radius rb)
float limb(vec3 p,vec3 a,vec3 b,float ra,float rb){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-mix(ra,rb,h);}
// The body: uKind 0 the lady (hair), 1 the monk (hood, wide sleeves), 2 the shrouded one (one
// winding sheet over all, torn at the hem)
float body(vec3 p,float n){
  float monk=step(.5,uKind)*step(uKind,1.5),shroud=step(1.5,uKind),lady=1.-monk-shroud;
  float d=length(p-uJ[0])-(.115+.06*monk+.04*shroud);
  d=smin(d,limb(p,uJ[1],uJ[0],.05,.06),.04);
  d=smin(d,limb(p,uJ[3],uJ[1],.14+.04*monk+.03*shroud,.12+.02*monk),.09);
  d=smin(d,limb(p,uJ[4],uJ[7],.065,.065),.08);
  float sl=.05+.035*monk+.03*shroud;
  d=smin(d,min(limb(p,uJ[4],uJ[5],sl,sl*.95),limb(p,uJ[5],uJ[6],sl*.95,sl*.55+.02*monk)),.05);
  d=smin(d,min(limb(p,uJ[7],uJ[8],sl,sl*.95),limb(p,uJ[8],uJ[9],sl*.95,sl*.55+.02*monk)),.05);
  // the robe: a cone from the waist to the hem, rippling, cut by a ragged hem
  vec3 axis=normalize(uJ[3]-uJ[10]);
  vec3 rp=p-uJ[3];
  float folds=sin(atan(rp.z,rp.x)*9.+rp.y*2.)*.014*smoothstep(.1,-.8,rp.y);  // its folds, deeper towards the hem
  float robe=limb(p,uJ[3],uJ[10],.15+.03*monk,.44-.08*shroud)+folds+(n-.5)*.045;
  float hem=dot(p-uJ[10],axis)-(noise(vec3(p.xz*7.,uTime*.6))-.5)*(.18+.3*shroud);
  d=smin(d,max(robe,-hem),.1);
  // the hair down her back, or the hood's peak
  d=smin(d,limb(p,uJ[0]+vec3(0.,.04,-.02),uJ[11],.105+.02*lady,.03+.05*lady)+shroud*9.,.06);
  return d;
}
// Its hollows: > 0 in the eyes and the mouth (for the monk, all the darkness under the hood)
float hollows(vec3 p){
  vec3 f=uJ[13],s=normalize(cross(f,vec3(0.,1.,0.))),c=uJ[0]+f*.1;
  float e=min(length(p-(c+s*.045+vec3(0.,.02,0.))),length(p-(c-s*.045+vec3(0.,.02,0.))))-.03;
  float m=length((p-(c-vec3(0.,.055,0.)))*vec3(1.,.6,1.))-.022;
  float hood=length(p-(uJ[0]+f*.07))-.12;
  float monk=step(.5,uKind)*step(uKind,1.5);
  return smoothstep(.012,-.012,mix(min(e,m),hood,monk));
}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.-uRes)/uRes.y;
  vec3 ro=vec3(0.,${HW_SPECTRE_CAM.y},${HW_SPECTRE_CAM.z}),rd=normalize(vec3(uv*${HW_SPECTRE_CAM.k},-1.));
  vec3 tint=mix(vec3(.7,.82,1.),vec3(.62,1.,.86),step(1.5,uKind))*(.8+.35*uNight);
  vec3 lamp=uJ[12],warm=vec3(1.,.62,.28)*(.9+.1*sin(uTime*13.)*sin(uTime*7.));
  vec3 col=vec3(0.);float a=0.,t=2.6,near=9.;
  for(int i=0;i<90;i++){
    vec3 p=ro+rd*t;
    float n=noise(p*3.6+vec3(0.,-uTime*.55,uTime*.17))*.65+noise(p*7.7-vec3(0.,uTime*.9,0.))*.35;
    float d=body(p,n);
    near=min(near,d);
    if(d<.07){
      float low=smoothstep(.1,-1.3,p.y);
      float dens=smoothstep(.03,-.07,d+(n-.5)*.06)*(.35+.8*n)*(1.-.55*low);
      dens*=smoothstep(1.-uReveal*1.3,1.2-uReveal*1.3,noise(p*4.+11.));  // materialising in patches
      float edge=exp(-abs(d)*26.),hole=hollows(p);
      vec3 em=tint*(dens*.055+edge*.05*(1.-low))*(1.-hole)*(.7+.6*smoothstep(-1.,.8,p.y));
      em+=tint*exp(-length(p-uJ[2])*6.)*dens*.04;  // its heart
      em+=uLamp*warm*exp(-length(p-lamp)*4.5)*dens*.6;  // the lantern on it
      vec3 f=uJ[13],s=normalize(cross(f,vec3(0.,1.,0.))),g=uJ[0]+f*.09+vec3(0.,.02,0.);
      em+=(step(.5,uKind)*step(uKind,1.5))*vec3(.85,.95,1.)*exp(-min(length(p-g-s*.04),length(p-g+s*.04))*90.)*.9;  // glints in the hood
      col+=(1.-a)*em;
      a+=(1.-a)*dens*(.06+hole*.25);
      t+=.032;
    }else t+=d*.85;
    if(t>6.2||a>.97)break;
  }
  float halo=exp(-max(near,0.)*9.)*.16*uReveal;
  col+=tint*halo*(1.-a);a+=(1.-a)*halo*.45;
  // the lantern itself, and its light in the air
  vec3 v=lamp-ro;float tc=dot(v,rd),dd=dot(v,v)-tc*tc;
  vec3 lit=warm*(exp(-dd*500.)*1.6+exp(-dd*30.)*.3)*uLamp*uReveal;
  col+=lit;a=max(a,min(1.,lit.r*.8));
  col=1.-exp(-col*1.6);  // the brightest mist kept from burning out
  vec2 q=gl_FragCoord.xy/uRes;
  float edges=smoothstep(0.,.08,min(min(q.x,1.-q.x),min(q.y,1.-q.y)));
  gl_FragColor=vec4(col,a)*uAlpha*edges;
}`;
let hwSpGl = null, hwSpProg = null, hwSpUni = {}, hwSpReady = false;
const hwSpectreInit = canvas => {
  if (hwSpGl) return true;
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
  if (!gl) return false;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  hwSpProg = gl.createProgram();
  gl.attachShader(hwSpProg, sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
  gl.attachShader(hwSpProg, sh(gl.FRAGMENT_SHADER, HW_SPECTRE_FRAG));
  gl.linkProgram(hwSpProg);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  hwSpGl = gl;
  return true;
};
const hwSpectreReady = () => {
  if (hwSpReady) return true;
  const gl = hwSpGl, ext = gl && gl.getExtension("KHR_parallel_shader_compile");
  if (!gl || ext && !gl.getProgramParameter(hwSpProg, ext.COMPLETION_STATUS_KHR)) return false;
  if (!gl.getProgramParameter(hwSpProg, gl.LINK_STATUS)) {
    console.warn("Halloween ghosts:", ...gl.getAttachedShaders(hwSpProg).map(s => gl.getShaderInfoLog(s)));
    hwSpGl = null;
    return false;
  }
  gl.useProgram(hwSpProg);
  const loc = gl.getAttribLocation(hwSpProg, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  ["uRes", "uJ", "uTime", "uKind", "uReveal", "uAlpha", "uNight", "uLamp"].forEach(u => { hwSpUni[u] = gl.getUniformLocation(hwSpProg, u); });
  return hwSpReady = true;
};
