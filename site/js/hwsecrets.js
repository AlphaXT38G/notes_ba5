// ── Halloween secrets: the castle's windows, its gargoyles, the firefly jar ────────────────────
// What can be clicked in the scene behind the courses of the Halloween screens (halloween.js).
// The scene is click-through, behind the page, so each of these gets an invisible button above the
// page, laid over it from where the scene puts it on the screen (getBoundingClientRect), and only
// where no course card covers it (hwSecretsPlace, again on every resize and scroll):
//   - two windows of the castle (HW_PORTALS, hwcastle.js) open their shutters now and then, and
//     close them a while later: a knight in armour stands in one, his sword raised; a man plays the
//     saxophone in the other, swaying. Clicked while closed, a window opens; clicked open, it takes
//     us there: the knight to the epic finale, the saxophonist to the jazz bar (the kamelot and
//     armstrong codes);
//   - the tiny gargoyle statues (HW_GARGOYLES): a click lights a red glint in their eyes, with a
//     low growl, another puts it out;
//   - a firefly jar half buried like a grave on the near hill, by the dead tree (not where the
//     werewolf walks): an orange-red firefly wanders inside, its glow breathing on the ground; a
//     click opens the calm night (the peace code).
// Taken to one of those screens from here, a little jack-o'-lantern in the bottom right corner
// brings Halloween back (the same code again), as the fir does for Christmas.
const hwHits = document.createElement("div");
hwHits.id = "hwhits";
// The jar, drawn in volume: a glass jar tilted in the earth, its cork and twine, the mound of
// earth hiding its foot, the firefly and its light
const hwJar = document.createElement("button");
hwJar.id = "hwjar";
hwJar.type = "button";
hwJar.title = "A firefly jar";
hwJar.setAttribute("aria-label", "Firefly jar");
hwJar.innerHTML = `<i class="light"></i><svg viewBox="0 0 40 56" aria-hidden="true"><defs>` +
  `<linearGradient id="hwjar-glass" x2="1"><stop offset="0" stop-color="#cfe3ea" stop-opacity=".55"/><stop offset=".3" stop-color="#fff" stop-opacity=".18"/>` +
  `<stop offset=".7" stop-color="#9fb6c0" stop-opacity=".12"/><stop offset="1" stop-color="#6d8792" stop-opacity=".5"/></linearGradient>` +
  `<radialGradient id="hwjar-fly"><stop offset="0" stop-color="#fff2c0"/><stop offset=".35" stop-color="#ff8a2a"/><stop offset="1" stop-color="#ff3a10" stop-opacity="0"/></radialGradient>` +
  `<linearGradient id="hwjar-earth" x2="0" y2="1"><stop offset="0" stop-color="#2a1a14"/><stop offset="1" stop-color="#0c0606"/></linearGradient></defs>` +
  `<g transform="rotate(-14 20 44)"><rect x="9" y="8" width="22" height="40" rx="5" fill="url(#hwjar-glass)" stroke="#a9c2cc" stroke-opacity=".6"/>` +
  `<g class="fly"><circle cx="20" cy="30" r="7" fill="url(#hwjar-fly)"/><circle cx="20" cy="30" r="1.4" fill="#fff6d8"/></g>` +
  `<path d="M12,12V40" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" stroke-linecap="round"/>` +
  `<rect x="11" y="3" width="18" height="7" rx="2" fill="#8a5a32"/><rect x="11" y="3" width="18" height="2" rx="1" fill="#a87448"/>` +
  `<path d="M10,11Q20,14 30,11" stroke="#c8a46a" stroke-width="1.2" fill="none"/></g>` +
  `<path d="M0,56C2,44 10,40 20,41C30,40 38,44 40,56Z" fill="url(#hwjar-earth)"/><path d="M6,46l2,-1M30,45l3,1M15,43l1,-1" stroke="#3a2a20"/></svg>`;
// The jack-o'-lantern that brings Halloween back
const hwBackBtn = document.createElement("button");
hwBackBtn.id = "hwback";
hwBackBtn.type = "button";
hwBackBtn.title = "Back to Halloween";
hwBackBtn.setAttribute("aria-label", "Back to Halloween");
hwBackBtn.innerHTML = `<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M20 7c2-5 5-6 7-5-3 1-5 3-6 6z" fill="#557a2a"/>` +
  `<ellipse cx="12" cy="22" rx="10" ry="12" fill="#e86a10"/><ellipse cx="28" cy="22" rx="10" ry="12" fill="#e86a10"/><ellipse cx="20" cy="22" rx="10" ry="13" fill="#ff8c1f"/>` +
  `<path d="M11 18l4-4 2 5zM29 18l-4-4-2 5zM10 25q10 9 20 0l-3 2-2-2-2 3-3-3-3 3-2-3-2 2z" fill="#ffe08a"/></svg>`;
// The code that took us from Halloween to another screen, to undo it, and the class of that screen
// (left any other way, by another code or by the clock, the way back is forgotten)
let hwVisit = null, hwVisitClass = null;

// The portals: opening, closing, and where they lead
const HW_PORTAL_TO = { knight: "kamelot", sax: "armstrong" };
const hwPortalEl = name => hwBack.querySelector(`.portal[data-portal="${name}"]`);
const hwPortalOpen = (name, secs) => {
  const el = hwPortalEl(name);
  if (!el) return;
  el.classList.add("open");
  clearTimeout(el.shut);
  el.shut = setTimeout(() => el.classList.remove("open"), secs * 1000);
};
const hwGo = code => {
  hwVisit = code;
  hwVisitClass = null;
  CODES[code]();
};
let hwPortalIn = 15;
everySecond.push(() => {
  if (!hwOn || hwStill() || --hwPortalIn > 0) return;
  hwPortalIn = 20 + Math.random() * 30;
  hwPortalOpen(Math.random() < .5 ? "knight" : "sax", 14);
});

