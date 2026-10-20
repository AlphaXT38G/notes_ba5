// ── The fight's backgrounds (sansfight.js): dioramas ──
// Behind the snowman and the battle box, the dark becomes a little stage: scenes cut out of paper,
// layer behind layer, each one casting a shadow on the one behind and lit along its edge. The layers
// slide against each other as the heart moves (the nearer, the more: parallax), and sway slowly;
// a few things live on top (falling snow, light shafts, rising sparks, an aurora). The scenes follow
// one another during the fight, crossfading:
//   forest   a snowy forest at night: stars and moon, far mountains, two rows of pines, a snowbank
//   hall     a golden hall: tall arched windows, pillars, a tiled floor, shafts of light, dust
//   cavern   an ice cavern: crystals far away, icicles above and below, big crystals near, sparks
//   aurora   an aurora over the mountains and a frozen lake, stars
// Each layer is drawn once on its own canvas, a little bigger than the window (for the parallax),
// when its scene comes; only drawImage and the few living things run on each frame.
const SF_PAD = 80, SF_PADY = 44;  // how far a layer reaches past the window
const sfLayer = (W, H, depth, draw) => {
  const c = document.createElement("canvas");
  c.width = W + 2 * SF_PAD;
  c.height = H + 2 * SF_PADY;
  const x = c.getContext("2d");
  x.translate(SF_PAD, SF_PADY);
  draw(x, W, H);
  return { c, depth };
};
// a piece of paper: filled, its shadow on what is behind, a light edge (drawn wide, then the paper
// filled over it again: only the outline of the whole shape shows, not the edges of its parts)
const sfCut = (x, path, fill, rim) => {
  x.save();
  x.shadowColor = "rgba(0,0,0,.65)";
  x.shadowBlur = 16;
  x.shadowOffsetY = 7;
  x.fillStyle = fill;
  x.beginPath();
  path(x);
  x.fill();
  x.restore();
  if (!rim) return;
  x.strokeStyle = rim;
  x.lineWidth = 3.2;
  x.lineJoin = "round";
  x.beginPath();
  path(x);
  x.stroke();
  x.fillStyle = fill;
  x.fill();
};
// a ridge of peaks across the layer, from y0 (base) up by about h
const sfRidge = (rnd, W, y0, h, n) => x => {
  x.moveTo(-SF_PAD, y0 + SF_PADY + 40);
  x.lineTo(-SF_PAD, y0);
  for (let i = 0; i <= n; i++) {
    const px = -SF_PAD + (W + 2 * SF_PAD) * i / n, peak = i % 2 ? y0 - h * (.5 + rnd() * .5) : y0 - h * rnd() * .3;
    x.lineTo(px, peak);
  }
  x.lineTo(W + SF_PAD, y0 + SF_PADY + 40);
  x.closePath();
};
const sfPine = (x, cx, base, h) => {  // three tiers and a trunk
  const w = h * .42;
  for (let i = 0; i < 3; i++) {
    const top = base - h + i * h * .25, wide = w * (.55 + i * .25), bot = top + h * .42;
    x.moveTo(cx, top);
    x.lineTo(cx + wide, bot);
    x.lineTo(cx - wide, bot);
    x.closePath();
  }
  x.rect(cx - h * .04, base - h * .2, h * .08, h * .22);
};
const sfStars = (x, rnd, W, H, n) => {
  for (let i = 0; i < n; i++) {
    x.fillStyle = `rgba(255,255,255,${(.3 + rnd() * .7).toFixed(2)})`;
    const s = rnd() < .9 ? 1 : 2;
    x.fillRect(-SF_PAD + rnd() * (W + 2 * SF_PAD), -SF_PADY + rnd() * H * .7, s, s);
  }
};

const SF_SCENES = {
  forest: (W, H) => {
    const rnd = seeded(401);
    const flakes = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 1 + Math.random() * 2.5, v: 20 + Math.random() * 40 }));
    return {
      sky: ["#040a1c", "#13264d"],
      layers: [
        sfLayer(W, H, .012, x => {
          sfStars(x, rnd, W, H, 260);
          const g = x.createRadialGradient(W * .78, H * .18, 10, W * .78, H * .18, 120);
          g.addColorStop(0, "rgba(220,235,255,.35)");
          g.addColorStop(1, "rgba(220,235,255,0)");
          x.fillStyle = g;
          x.fillRect(W * .78 - 120, H * .18 - 120, 240, 240);
          x.fillStyle = "#e9f1ff";
          x.beginPath();
          x.arc(W * .78, H * .18, 34, 0, Math.PI * 2);
          x.fill();
        }),
        sfLayer(W, H, .03, x => sfCut(x, sfRidge(rnd, W, H * .62, H * .3, 14), "#1b2c52", "rgba(190,215,255,.45)")),
        sfLayer(W, H, .06, x => sfCut(x, p => {
          p.rect(-SF_PAD, H * .78, W + 2 * SF_PAD, H * .3);
          for (let i = 0; i < 26; i++) sfPine(p, -SF_PAD + (W + 2 * SF_PAD) * (i + rnd() * .6) / 26, H * .8, H * (.16 + rnd() * .1));
        }, "#10203f", "rgba(210,230,255,.55)")),
        sfLayer(W, H, .11, x => sfCut(x, p => {
          p.moveTo(-SF_PAD, H + SF_PADY);
          for (let i = 0; i <= 10; i++) p.lineTo(-SF_PAD + (W + 2 * SF_PAD) * i / 10, H * (.9 + rnd() * .05));
          p.lineTo(W + SF_PAD, H + SF_PADY);
          p.closePath();
          [-.02, .06, .93, 1.01].forEach(f => sfPine(p, W * f, H * .96, H * (.42 + rnd() * .12)));
        }, "#070e20", "rgba(230,240,255,.8)")),
      ],
      live: (c, t, dt) => {  // snow falling in front of it all
        c.fillStyle = "rgba(235,242,255,.85)";
        for (const f of flakes) {
          f.y += f.v * dt;
          f.x += Math.sin(t + f.s * 3) * 12 * dt;
          if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
          c.fillRect(f.x, f.y, f.s, f.s);
        }
      },
    };
  },
  hall: (W, H) => {
    const rnd = seeded(502);
    const motes = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6 }));
    const n = Math.max(4, Math.round(W / 260));
    return {
      sky: ["#1e1204", "#5a3a0c"],
      layers: [
        sfLayer(W, H, .02, x => {  // the windows, glowing
          for (let i = 0; i < n + 1; i++) {
            const cx = -SF_PAD / 2 + (W + SF_PAD) * (i + .5) / (n + 1), w = 70, top = H * .12, bot = H * .62;
            const g = x.createLinearGradient(0, top, 0, bot);
            g.addColorStop(0, "#fff3c4");
            g.addColorStop(1, "#e7a83a");
            sfCut(x, p => { p.moveTo(cx - w / 2, bot); p.lineTo(cx - w / 2, top + w / 2); p.arc(cx, top + w / 2, w / 2, Math.PI, 0); p.lineTo(cx + w / 2, bot); p.closePath(); }, g, "rgba(255,250,220,.9)");
            x.strokeStyle = "rgba(90,55,10,.8)";  // the mullions
            x.lineWidth = 4;
            x.beginPath();
            x.moveTo(cx, top + 6);
            x.lineTo(cx, bot);
            for (let k = 1; k < 4; k++) { x.moveTo(cx - w / 2, top + w / 2 + (bot - top - w / 2) * k / 4); x.lineTo(cx + w / 2, top + w / 2 + (bot - top - w / 2) * k / 4); }
            x.stroke();
          }
        }),
        sfLayer(W, H, .055, x => sfCut(x, p => {  // the pillars, between the windows
          for (let i = 0; i <= n + 1; i++) {
            const cx = -SF_PAD / 2 + (W + SF_PAD) * i / (n + 1), w = 46;
            p.rect(cx - w / 2, H * .04, w, H * .86);
            p.rect(cx - w * .8, H * .04, w * 1.6, 20);
            p.rect(cx - w * .8, H * .86, w * 1.6, 22);
          }
          p.rect(-SF_PAD, -SF_PADY, W + 2 * SF_PAD, H * .04 + SF_PADY);
        }, "#1a1006", "rgba(255,215,130,.55)")),
        sfLayer(W, H, .1, x => {  // the floor, tiles in perspective
          const y0 = H * .88;
          sfCut(x, p => p.rect(-SF_PAD, y0, W + 2 * SF_PAD, H * .2), "#2b1c0a", "rgba(255,210,120,.5)");
          x.strokeStyle = "rgba(255,200,110,.18)";
          x.lineWidth = 1;
          x.beginPath();
          for (let i = -20; i <= 20; i++) { x.moveTo(W / 2 + i * 40, y0); x.lineTo(W / 2 + i * 110, H + SF_PADY); }
          for (let j = 1; j < 5; j++) { const y = y0 + (H * .2) * (j / 5) * (j / 5); x.moveTo(-SF_PAD, y); x.lineTo(W + SF_PAD, y); }
          x.stroke();
        }),
      ],
      live: (c, t) => {  // shafts of light through the windows, dust in them
        c.save();
        c.globalCompositeOperation = "lighter";
        for (let i = 0; i < n + 1; i++) {
          const cx = -SF_PAD / 2 + (W + SF_PAD) * (i + .5) / (n + 1), a = .05 + .03 * Math.sin(t * .8 + i);
          c.fillStyle = `rgba(255,220,140,${a.toFixed(3)})`;
          c.beginPath();
          c.moveTo(cx - 35, H * .2);
          c.lineTo(cx + 35, H * .2);
          c.lineTo(cx + 230, H);
          c.lineTo(cx + 60, H);
          c.closePath();
          c.fill();
        }
        c.fillStyle = "rgba(255,230,170,.6)";
        for (const m of motes) c.fillRect(m.x + Math.sin(t * .5 + m.p) * 20, m.y + Math.cos(t * .4 + m.p) * 14, 2, 2);
        c.restore();
      },
    };
  },
  cavern: (W, H) => {
    const rnd = seeded(603);
    const sparks = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 10 + Math.random() * 30, p: Math.random() * 6 }));
    const spikes = (p, y0, dir, n, hMin, hMax, wMax) => {  // icicles from the top (dir 1) or the bottom (dir -1)
      p.moveTo(-SF_PAD, y0 - dir * (SF_PADY + 40));
      for (let i = 0; i <= n; i++) {
        const px = -SF_PAD + (W + 2 * SF_PAD) * i / n, w = wMax * (.4 + rnd() * .6), h = hMin + rnd() * (hMax - hMin);
        p.lineTo(px - w, y0);
        p.lineTo(px, y0 + dir * h);
        p.lineTo(px + w, y0);
      }
      p.lineTo(W + SF_PAD, y0 - dir * (SF_PADY + 40));
      p.closePath();
    };
    return {
      sky: ["#010b12", "#05303f"],
      layers: [
        sfLayer(W, H, .025, x => sfCut(x, p => { spikes(p, H * .02, 1, 22, H * .1, H * .25, 28); spikes(p, H * .98, -1, 22, H * .12, H * .3, 30); }, "#0a3442", "rgba(110,220,255,.5)")),
        sfLayer(W, H, .06, x => sfCut(x, p => { spikes(p, -10, 1, 13, H * .06, H * .2, 40); spikes(p, H + 10, -1, 13, H * .08, H * .22, 46); }, "#06222d", "rgba(150,235,255,.75)")),
        sfLayer(W, H, .11, x => {  // big crystals near, at the sides
          [[-.03, .9, .5, -.25], [.06, .98, .32, .2], [.96, .92, .46, .3], [1.04, .97, .3, -.2]].forEach(([fx, fy, fh, lean]) => {
            const bx = W * fx, by = H * fy, h = H * fh, w = h * .22;
            const g = x.createLinearGradient(bx - w, 0, bx + w, 0);
            g.addColorStop(0, "#0d5c73");
            g.addColorStop(.5, "#4fd2f0");
            g.addColorStop(1, "#0a3f52");
            sfCut(x, p => { p.moveTo(bx - w, by); p.lineTo(bx - w * .8 + lean * h, by - h * .8); p.lineTo(bx + lean * h * 1.1, by - h); p.lineTo(bx + w * .8 + lean * h, by - h * .8); p.lineTo(bx + w, by); p.closePath(); }, g, "rgba(220,250,255,.9)");
          });
        }),
      ],
      live: (c, t, dt) => {  // sparks of light rising, twinkling
        c.save();
        c.globalCompositeOperation = "lighter";
        for (const s of sparks) {
          s.y -= s.v * dt;
          if (s.y < 0) { s.y = H; s.x = Math.random() * W; }
          const a = .3 + .3 * Math.sin(t * 3 + s.p);
          c.fillStyle = `rgba(120,230,255,${a.toFixed(2)})`;
          c.fillRect(s.x, s.y, 2, 2);
        }
        c.restore();
      },
    };
  },
  aurora: (W, H) => {
    const rnd = seeded(704);
    return {
      sky: ["#00030b", "#03162a"],
      layers: [
        sfLayer(W, H, .012, x => sfStars(x, rnd, W, H, 320)),
        sfLayer(W, H, .035, x => sfCut(x, sfRidge(rnd, W, H * .72, H * .34, 18), "#050c18", "rgba(170,255,220,.35)")),
        sfLayer(W, H, .08, x => {  // the frozen lake, with a pale reflection and cracks
          const g = x.createLinearGradient(0, H * .8, 0, H);
          g.addColorStop(0, "#0b2a33");
          g.addColorStop(1, "#04121a");
          sfCut(x, p => p.rect(-SF_PAD, H * .8, W + 2 * SF_PAD, H * .3), g, "rgba(170,255,230,.5)");
          x.strokeStyle = "rgba(180,240,255,.18)";
          x.lineWidth = 1;
          x.beginPath();
          for (let i = 0; i < 14; i++) { let px = rnd() * W, py = H * (.82 + rnd() * .15); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (rnd() - .5) * 80; py += (rnd() - .3) * 12; x.lineTo(px, py); } }
          x.stroke();
        }),
      ],
      live: (c, t) => {  // the aurora: three curtains waving, green, teal and violet
        c.save();
        c.globalCompositeOperation = "lighter";
        [["rgba(60,255,160,", .0, H * .2], ["rgba(40,200,255,", 1.7, H * .27], ["rgba(170,90,255,", 3.1, H * .14]].forEach(([col, ph, y0]) => {
          const g = c.createLinearGradient(0, y0 - 60, 0, y0 + 120);
          g.addColorStop(0, col + "0)");
          g.addColorStop(.35, col + ".22)");
          g.addColorStop(1, col + "0)");
          c.fillStyle = g;
          c.beginPath();
          for (let i = 0; i <= 40; i++) { const px = W * i / 40, py = y0 + Math.sin(i * .35 + t * .6 + ph) * 30 + Math.sin(i * .9 - t * .4) * 12; i ? c.lineTo(px, py - 60) : c.moveTo(px, py - 60); }
          for (let i = 40; i >= 0; i--) { const px = W * i / 40, py = y0 + Math.sin(i * .35 + t * .6 + ph) * 30 + Math.sin(i * .9 - t * .4) * 12; c.lineTo(px, py + 120); }
          c.closePath();
          c.fill();
        });
        c.restore();
      },
    };
  },
};
const SF_SCENE_ORDER = ["forest", "hall", "cavern", "aurora"];
// One scene drawn on the background canvas: sky, layers slid by the parallax (par: -1..1 each way),
// the living things; alpha for the crossfades
const sfSceneDraw = (c, S, W, H, t, dt, par, alpha) => {
  c.globalAlpha = alpha;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, S.sky[0]);
  g.addColorStop(1, S.sky[1]);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  for (const L of S.layers) {
    const dx = -par[0] * L.depth * 600 + Math.sin(t * .17) * L.depth * 110, dy = -par[1] * L.depth * 360;  // within the pads
    c.drawImage(L.c, -SF_PAD + dx, -SF_PADY + dy);
  }
  S.live(c, t, dt);
  c.globalAlpha = 1;
};
