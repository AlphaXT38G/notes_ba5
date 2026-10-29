// ── Halloween hills: what stands on them ──────────────────────────────────────────────────────
// More life on the graveyard hills of the Halloween scene (hwscene.js calls hwHillLife() into its
// near plane, once its hills are known). Most of it stands on the left hill, between the dead tree
// and the courses, the part of the scene a wide window shows (the jar of hwsecrets.js is there
// too, at x 330):
//   - a hand rising from the earth now and then, by the tree, its fingers clawing, then sinking
//     back (hwmotion.js says when: class "rise");
//   - a scarecrow with a carved pumpkin head, its face glowing at night, a crow on its arm,
//     swaying a little, much more in a gust;
//   - an open grave, its mound of earth and a shovel stuck in it;
//   - a crooked post with an iron lantern hanging from its arm, swinging in the wind, lit at night;
//   - a leaning signpost: the exams one way (towards the castle, of course), the library the other;
//   - a small crypt, its door ajar on a green glow at night;
//   - will-o'-wisps drifting over the graves at night, pale blue-green.
// Built once, as SVG in the scene's box; moved by CSS (css/hwlife.css).
const hwHillLife = () => {
  const at = (x, f) => `translate(${f1(x)},${f1(f(x) + 2)})`;
  // the open grave: a dark hole seen from the side, its mound, the shovel
  const grave = `<g transform="${at(395, HW_LEFT)}"><path class="earth" d="M-26,0Q-22,-5-12,-6L14,-6Q22,-5 26,0Z"/><path class="hole" d="M-14,-3L14,-3 12,1-12,1Z"/>` +
    `<path class="earth" d="M18,0Q24,-16 36,-14Q46,-12 50,0Z"/><g transform="translate(38,-12) rotate(18)"><rect class="wood" x="-1.3" y="-34" width="2.6" height="30"/>` +
    `<path class="iron" d="M-5,-4H5L4,8Q0,12-4,8Z"/><rect class="wood" x="-5" y="-38" width="10" height="3" rx="1.5"/></g></g>`;
  // the lantern post: a crooked post, its arm, the lantern hanging from a hook (swinging about it)
  const lantern = `<g transform="${at(448, HW_LEFT)}"><path class="wood-s" d="M0,0Q-3,-40 2,-92"/><path class="wood-s thin" d="M1,-86Q14,-90 26,-84"/>` +
    `<circle class="lamp-glow" cx="26" cy="-64" r="22"/><g class="lantern"><path class="iron-s" d="M26,-84V-76"/>` +
    `<path class="iron" d="M20,-76H32L30,-73H22Z"/><rect class="lamp" x="21.5" y="-73" width="9" height="13" rx="1.5"/>` +
    `<path class="iron-s" d="M21.5,-73V-60M30.5,-73V-60M26,-73V-60"/><path class="iron" d="M20,-60H32L29,-56H23Z"/></g></g>`;
  // the hand rising from the earth: forearm, palm, five fingers, clipped at the ground
  const hand = `<g transform="${at(212, HW_LEFT)}"><clipPath id="hw-hand-clip"><rect x="-30" y="-80" width="60" height="80"/></clipPath>` +
    `<g clip-path="url(#hw-hand-clip)"><g class="hand"><path class="skin" d="M-6,40L-7,-18Q-9,-30-4,-34L5,-34Q9,-30 7,-18L6,40Z"/>` +
    `<g class="fingers"><path class="skin" d="M-5,-32Q-12,-42-10,-52L-7,-51Q-7,-42-2,-34ZM-3,-34Q-6,-48-4,-58L-1,-58Q-1,-46 1,-34Z` +
    `M0,-34Q1,-50 4,-58L7,-57Q4,-46 3,-34ZM3,-33Q8,-44 12,-50L14,-48Q10,-40 6,-31ZM5,-24Q13,-28 16,-34L17,-31Q13,-23 6,-20Z"/></g>` +
    `<path class="rag" d="M-7,-14L7,-14 6,-6 3,-9 0,-4-3,-9-7,-5Z"/></g></g><path class="earth" d="M-14,1Q-6,-4 0,-3Q8,-5 14,1Z"/></g>`;
  // the scarecrow: post and crossbar, a ragged coat, straw, a hat, the pumpkin head and its face
  const scarecrow = `<g transform="${at(268, HW_LEFT)}"><g class="scarecrow"><g class="sc-gust">` +
    `<rect class="wood" x="-2.5" y="-112" width="5" height="112"/><rect class="wood" x="-36" y="-86" width="72" height="4"/>` +
    `<path class="coat" d="M-32,-88L-8,-92 8,-92 32,-88 36,-76 30,-78 27,-71 21,-77 13,-76 15,-46 9,-51 4,-44 0,-51-4,-44-9,-51-15,-46-13,-76-21,-77-27,-71-30,-78-36,-76Z"/>` +
    `<path class="straw" d="M-36,-78l-6,6M-34,-76l-4,9M36,-78l6,6M34,-76l4,9M-9,-50l-3,9M0,-50v10M9,-50l3,9M-5,-48l-1,8M5,-48l1,8"/>` +
    `<path class="patch" d="M-10,-80h7v8h-7zM16,-70l6,1-1,6-6-1z"/>` +
    `<ellipse class="pumpkin" cx="0" cy="-103" rx="14" ry="11.5"/><path class="pumpkin-rib" d="M-5,-113Q-9,-103-5,-92M5,-113Q9,-103 5,-92"/>` +
    `<path class="face" d="M-9,-106l4,-5 3,5ZM9,-106l-4,-5-3,5ZM-9,-99Q0,-92 9,-99L6,-98 4,-96 2,-98 0,-96-2,-98-4,-96-6,-98Z"/>` +
    `<path class="hat" d="M-20,-111Q0,-115 20,-111L12,-113 6,-134Q8,-140 13,-141Q4,-142 0,-132L-11,-113Z"/>` +
    `<g transform="translate(30,-88)"><path class="crow" d="M-6,0Q-6,-8 0,-9L4,-11 5,-9 3,-8Q4,-3 0,0Z"/><path class="crow" d="M-5,-2L-11,1-5,1Z"/></g>` +
    `</g></g></g>`;
  // the signpost, leaning: two boards, the exams towards the castle
  const sign = `<g transform="${at(918, HW_RIGHT)} rotate(-5)"><rect class="wood" x="-2.5" y="-74" width="5" height="74"/>` +
    `<path class="board" d="M-6,-70H40L48,-63 40,-56H-6Z"/><text class="sign-t" x="2" y="-60">EXAMS</text>` +
    `<path class="board" d="M6,-50H-36L-44,-43-36,-36H6Z" transform="rotate(4 0 -43)"/><text class="sign-t" x="-34" y="-40" transform="rotate(4 0 -43)">LIBRARY</text></g>`;
  // the crypt: steps, two columns, a pediment with a cross, its door ajar on a glow
  const crypt = `<g transform="${at(1118, HW_RIGHT)}"><path class="crypt-glow" d="M-40,-4Q0,-70 40,-4Z"/>` +
    `<path class="crypt" d="M-34,0H34V-5H-34ZM-30,-5H30V-9H-30ZM-26,-9H26V-56H-26ZM-31,-56H31L0,-78Z"/>` +
    `<path class="crypt-lit" d="M-26,-9H-22V-56H-26ZM-31,-56H31V-59H-31Z"/><rect class="crypt" x="-1.5" y="-92" width="3" height="16"/><rect class="crypt" x="-6" y="-88" width="12" height="3"/>` +
    `<path class="crypt-door" d="M-9,-9V-38Q0,-48 9,-38V-9Z"/><path class="crypt-crack" d="M-1.2,-9V-43L1.5,-43V-9Z"/>` +
    `<path class="crypt-col" d="M-21,-9V-54M21,-9V-54"/></g>`;
  // the will-o'-wisps: soft lights, each drifting on its own two slow paths
  const wisps = [[140, 560, 0], [470, 540, -4], [1010, 585, -7], [1260, 570, -2.5]].map(([x, y, d]) =>
    `<g class="wisp" transform="translate(${x},${y})" style="--d:${d}s"><g class="wisp-x"><g class="wisp-y"><circle r="16" fill="url(#hw-wisp-g)"/><circle class="wisp-core" r="2.4"/></g></g></g>`).join("");
  return `<defs><radialGradient id="hw-wisp-g"><stop offset="0" stop-color="#d8fff4" stop-opacity=".9"/><stop offset=".25" stop-color="#7affd8" stop-opacity=".45"/>` +
    `<stop offset="1" stop-color="#3affc0" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="hw-lamp-g"><stop offset="0" stop-color="#ffd27a" stop-opacity=".75"/><stop offset="1" stop-color="#ff9a2e" stop-opacity="0"/></radialGradient></defs>` +
    `<g class="hillife">${grave}${lantern}${hand}${scarecrow}${sign}${crypt}<g class="wisps">${wisps}</g></g>`;
};
