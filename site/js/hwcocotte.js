// ── Halloween music player: the pumpkin cocotte ─────────────────────────────────────────────
// The player of the Halloween music (hwmusic.js): an enamelled cast-iron cocotte shaped like a
// pumpkin, on a round wooden board, seen a little from above. The lid and the pot are one enamel:
// orange, the lid lighter at its crown, the pot's top the colour of the lid's rim, deepening to red
// at its foot. Each rib of the pot is rounded (darker in its grooves, lighter on its crown, the
// whole pot darker towards its sides) and catches a gleam of light; the lid is a ribbed dome with
// an embossed seam and a curly golden stem for a knob; two loop handles on the sides. Under the
// lid, a soup of orange bubbles.
// While the music plays (CSS, css/hwmusic.css), the lid lifts and bobs as if the pot simmered,
// steam escapes from under it, the soup bubbles and notes rise. The soup is the colour of the
// track playing (--soup, --bubble, set by hwmusic.js).
// The other tracks are potions in glass flasks on a plank beside it (hwFlaskSvg): three shapes
// of flask, the potion in the track's colour, a cork, a gleam on the glass.
const HW_ENAMEL = ["#ffa64a", "#f26a1b", "#c9260f", "#5e1004"];  // the pot's orange enamel, light to dark
// The pot's ribs: the visible ones, at these angles from the front
const HW_RIBS = [-1.3, -.9, -.48, 0, .48, .9, 1.3];
const hwCocotteSvg = (id, colors) => {
  const [top, mid, foot, shade] = colors;
  const at = (a, rx, ry, cy) => [100 + rx * Math.sin(a), cy + ry * Math.cos(a)];
  // a rib of the pot, from the lid's rim down to the foot, bulging out on the way
  const rib = a => {
    const [x0, y0] = at(a, 76, 13, 90), [xm, ym] = at(a, 86, 15, 122), [x1, y1] = at(a, 60, 10, 152);
    return [x0, y0, 2 * xm - (x0 + x1) / 2, 2 * ym - (y0 + y1) / 2, x1, y1];
  };
  const ribs = HW_RIBS.map(rib);
  let lobes = "", grads = "";
  for (let k = 0; k + 1 < ribs.length; k++) {  // each lobe rounded by a gradient across it
    const [a0, b0, c0, d0, e0, g0] = ribs[k], [a1, b1, c1, d1, e1, g1] = ribs[k + 1];
    grads += `<linearGradient id="${id}r${k}" gradientUnits="userSpaceOnUse" x1="${f1(c0)}" x2="${f1(c1)}">` +
      `<stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".45" stop-color="#fff" stop-opacity=".14"/>` +
      `<stop offset=".6" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>`;
    lobes += `<path d="M${f1(a0)},${f1(b0)}Q${f1(c0)},${f1(d0)} ${f1(e0)},${f1(g0)}L${f1(e1)},${f1(g1)}Q${f1(c1)},${f1(d1)} ${f1(a1)},${f1(b1)}Z" fill="url(#${id}r${k})"/>`;
  }
  const grooves = ribs.map(([a, b, c, d, e, g]) => `M${f1(a)},${f1(b)}Q${f1(c)},${f1(d)} ${f1(e)},${f1(g)}`).join("");
  // the lid's ribs, from the knob down to its rim
  const lidRibs = [-1.25, -.85, -.42, 0, .42, .85, 1.25].map(a => {
    const [x, y] = at(a, 80, 14, 88);
    return `M${f1(100 + Math.sin(a) * 6)},${f1(43)}Q${f1(100 + Math.sin(a) * 72)},${f1(50 + Math.cos(a) * 4)} ${f1(x)},${f1(y)}`;
  }).join("");
  const beads = Array.from({ length: 23 }, (_, i) => {
    const [x, y] = at(-1.45 + i * 2.9 / 22, 77, 12.5, 85);
    return `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.1"/>`;
  }).join("");
  return `<svg viewBox="0 0 200 180" aria-hidden="true"><defs>${grads}` +
    `<linearGradient id="${id}e" x2="0" y2="1"><stop offset="0" stop-color="${mid}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${foot}"/></linearGradient>` +
    `<linearGradient id="${id}c"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".22" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>` +
    `<radialGradient id="${id}d" cx=".38" cy=".15" r=".95"><stop offset="0" stop-color="${top}"/><stop offset=".6" stop-color="${mid}"/></radialGradient>` +
    `<linearGradient id="${id}g" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".4" stop-color="#d9a73a"/><stop offset="1" stop-color="#6a4608"/></linearGradient>` +
    `<linearGradient id="${id}w" x2="0" y2="1"><stop offset="0" stop-color="#8a5228"/><stop offset="1" stop-color="#4a2a12"/></linearGradient>` +
    `<radialGradient id="${id}s"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>` +
    // the wooden board: its edge, its top with the rings of the tree, the pot's shadow
    `<ellipse cx="100" cy="164" rx="96" ry="15" fill="#3a200c"/><ellipse cx="100" cy="159" rx="96" ry="15" fill="url(#${id}w)"/>` +
    `<path d="M30,160Q100,150 170,160M48,165Q100,158 152,165M60,155Q100,149 140,155" stroke="rgba(40,18,4,.35)" fill="none"/>` +
    `<ellipse cx="102" cy="156" rx="76" ry="11" fill="url(#${id}s)"/>` +
    // the handles, behind and beside the pot
    `<path d="M30,96C8,90 2,114 26,112M170,96C192,90 198,114 174,112" stroke="${mid}" stroke-width="8" fill="none" stroke-linecap="round"/>` +
    `<path d="M28,94C12,92 9,108 24,108M172,94C188,92 191,108 176,108" stroke="${top}" stroke-width="2" fill="none" stroke-opacity=".7"/>` +
    // the pot: enamel, ribs, cylinder shading, grooves, gleams
    `<path d="M24,90C20,120 34,149 52,154Q100,166 148,154C166,149 180,120 176,90Z" fill="url(#${id}e)"/>${lobes}` +
    `<path d="M24,90C20,120 34,149 52,154Q100,166 148,154C166,149 180,120 176,90Z" fill="url(#${id}c)"/>` +
    `<path d="${grooves}" stroke="${shade}" stroke-opacity=".45" stroke-width="1.6" fill="none"/>` +
    `<path d="M62,100Q58,124 66,146M86,100Q84,120 88,148" stroke="#fff" stroke-opacity=".35" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M64,104Q61,116 63,126" stroke="#fff" stroke-opacity=".8" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    // inside, under the lid: the dark pot and the soup, bubbling
    `<ellipse cx="100" cy="90" rx="74" ry="12" fill="${shade}"/><ellipse class="soup" cx="100" cy="92" rx="66" ry="9"/>` +
    `<g class="bubbles"><circle cx="76" cy="92" r="3"/><circle cx="104" cy="94" r="2.4"/><circle cx="126" cy="91" r="2.8"/></g>` +
    // the lid: rim, ribbed dome, seam of beads, gleams, golden stem
    `<g class="lid"><ellipse cx="100" cy="89" rx="80" ry="14" fill="${mid}"/><ellipse cx="100" cy="90" rx="80" ry="13" fill="#000" fill-opacity=".18"/>` +
    `<path d="M20,88C22,58 58,40 100,38C142,40 178,58 180,88A80,14 0 0 1 20,88Z" fill="url(#${id}d)"/>` +
    `<path d="M20,88C22,58 58,40 100,38C142,40 178,58 180,88A80,14 0 0 1 20,88Z" fill="url(#${id}c)"/>` +  // shaded round like the pot
    `<path d="${lidRibs}" stroke="${shade}" stroke-opacity=".4" stroke-width="2" fill="none"/>` +
    `<path d="${lidRibs}" stroke="#fff" stroke-opacity=".18" stroke-width="1.2" fill="none" transform="translate(-1.6,0)"/>` +
    `<g fill="${top}" fill-opacity=".8">${beads}</g>` +
    `<path d="M56,58Q70,46 90,42" stroke="#fff" stroke-opacity=".75" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M38,76Q42,66 50,60" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M100,44C97,32 100,22 108,16C114,11 123,13 123,20C123,25 117,26 116,22" stroke="url(#${id}g)" stroke-width="7" fill="none" stroke-linecap="round"/>` +
    `<path d="M99,38C97,30 100,22 107,17" stroke="#fff6c8" stroke-opacity=".8" stroke-width="1.5" fill="none" stroke-linecap="round"/></g></svg>`;
};
// A flask of potion, in a viewBox of 40 x 60: the glass (its outline also clips the potion), the
// level of the potion, where its bubbles rise. Three shapes, taken in turn along the plank.
const HW_FLASKS = [
  { glass: "M16,8H24V23A17,17 0 1 1 16,23Z", level: 34 },  // round flask
  { glass: "M15,8H25V16Q34,19 34,27V55Q34,58 31,58H9Q6,58 6,55V27Q6,19 15,16Z", level: 28 },  // square bottle
  { glass: "M16,8H24V22L35,51Q37,58 30,58H10Q3,58 5,51L16,22Z", level: 36 },  // conical flask
];
const hwFlaskSvg = (id, shape, color, light) => {
  const { glass, level } = HW_FLASKS[shape];
  return `<svg viewBox="0 0 40 60" aria-hidden="true"><defs><clipPath id="${id}c"><path d="${glass}"/></clipPath>` +
    `<radialGradient id="${id}g" cx=".4" cy=".35"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${color}"/></radialGradient></defs>` +
    `<g clip-path="url(#${id}c)"><g class="potion"><rect x="0" y="${level}" width="40" height="${60 - level}" fill="url(#${id}g)"/>` +
    `<rect x="0" y="${level}" width="40" height="1.6" fill="${light}" opacity=".8"/></g>` +
    `<g class="fizz" fill="${light}"><circle cx="17" cy="54" r="1.3"/><circle cx="24" cy="56" r="1"/></g></g>` +
    `<path d="${glass}" fill="rgba(220,236,245,.14)" stroke="rgba(235,245,250,.7)" stroke-width="1.3"/>` +
    `<path d="M11,${level + 4}Q9,${level + 12} 11,${level + 18}" stroke="#fff" stroke-opacity=".6" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
    `<g class="cork"><rect x="14.5" y="2" width="11" height="8" rx="2" fill="#8a5a32"/><rect x="14.5" y="2" width="11" height="2.2" rx="1" fill="#b07a4a"/></g></svg>`;
};
// The player's drawing (steam, notes and the stream of a potion poured into it, over it), and a
// flask with its paper label
const HW_COCOTTE = {
  html: () => `<span class="pot">${hwCocotteSvg("hwco", HW_ENAMEL)}<i class="steam"></i><i class="steam"></i><i class="steam"></i>` +
    `<b class="note">♪</b><b class="note">♫</b><i class="stream"></i></span>`,
  flask: (slot, track, light) => `${hwFlaskSvg(`hwfl${slot}`, slot % HW_FLASKS.length, track.color, light)}<span class="tag">${track.short}</span>`,
};
