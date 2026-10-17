// ── Calm night (screen "calm", body.calm) ─────────────────────────────────────────────────────
// After the metal show, when nothing else takes over (no epic finale, no Christmas), the night
// goes quiet until 5:30 (css/calm.css): a calm blue night, and the sound of crickets.
// The subtitle follows the hours of the night (a forced ?night=calm in the day gets the first one)
const calmSubtitle = () => {
  const h = new Date().getHours();
  if (h === 2) return "2 AM. The crickets are revising too.";
  if (h === 3) return "3 AM. Even the exams are asleep.";
  if (h === 4) return "4 AM. The quietest hour of the night.";
  if (h === 5) return "5 AM. The sky is thinking about the morning.";
  return "The show is over. Only the crickets are still up.";
};
SCREENS.calm = { className: "calm", subtitle: calmSubtitle, transition: "calm" };
SCHEDULE.push([3600 + METAL_SECONDS, 5 * 3600 + 30 * 60, "calm"]);  // from the end of the show to 5:30
