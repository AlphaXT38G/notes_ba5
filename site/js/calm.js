// ── Calm night (screen "calm", body.calm) ─────────────────────────────────────────────────────
// After the metal show, when nothing else takes over (no epic finale, no Christmas), the night
// goes quiet until 5:30 (css/calm.css): a calm blue night, and the sound of crickets.
SCREENS.calm = { className: "calm", subtitle: "The show is over. Only the crickets are still up.", transition: "calm" };
SCHEDULE.push([3600 + METAL_SECONDS, 5 * 3600 + 30 * 60, "calm"]);  // from the end of the show to 5:30
