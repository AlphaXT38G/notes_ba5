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
