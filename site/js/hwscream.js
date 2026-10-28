// ── Halloween screamer ────────────────────────────────────────────────────────────────────────
// The worst surprise of the Halloween screens (halloween.js), over everything: rarely, without
// warning, a zombie (img/screamer.webp) bursts out of the top left corner and lunges at us until
// it fills the window, shaking, for about a second, with a zombie's scream, very loud (Web Audio,
// only once the page has had a gesture: a thump, a roar, a trembling shriek and rasping breath,
// driven into saturation). Not in the first 3 minutes of the screen, then about one minute in
// fifteen, never twice within 12 minutes, never while the search field is used or the tab is
// hidden, never with reduced motion. Typing scream (or hwScream() in the console) shows it at once.
// The photo is loaded with the screen, so it is there, decoded, the moment it jumps; only its
// transform is animated.
const hwScreamer = document.createElement("div"), hwZombie = new Image();
hwScreamer.id = "hwscream";
hwScreamer.setAttribute("aria-hidden", "true");
hwZombie.alt = "";
hwScreamer.append(hwZombie);
