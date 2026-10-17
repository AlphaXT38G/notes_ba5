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
// Every second: the subtitle follows the hour even though the screen stays the same
everySecond.push(() => {
  if (document.body.dataset.phase === "calm" && sub.textContent !== calmSubtitle()) sub.textContent = calmSubtitle();
});

// The moon of tonight: its age in the lunar cycle (0 new, .5 full), counted from a known new
// moon (2000-01-06 18:14 UTC) in synodic months of 29.53 days
const calmMoonAge = () => {
  const days = (Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
  return (days / 29.530588853 % 1 + 1) % 1;
};
// The unlit part of the moon, drawn over the full moon of christmas.js in the same -50..50 box: a
// half disc on the dark side, closed by the terminator, a half ellipse whose width follows the
// phase (it bulges into the lit half for a crescent, into the dark half for a gibbous moon). Seen
// from the northern hemisphere: lit on the right while waxing, on the left while waning. It is
// not black: the earthshine leaves the dark side faintly visible.
const calmMoonShade = age => {
  const k = Math.cos(age * 2 * Math.PI), rx = (Math.abs(k) * 49).toFixed(1);
  const d = `M0,-49A49,49 0 0 0 0,49A${rx},49 0 0 ${k > 0 ? 0 : 1} 0,-49Z`;  // dark side on the left
  return `<svg viewBox="-50 -50 100 100"><path d="${d}" fill="rgba(4,9,26,.86)"${age > .5 ? ' transform="scale(-1,1)"' : ""}/></svg>`;
};

// The night scene behind the page (#calm-sky, click-through): the moon in the top right corner,
// as it is tonight (the full moon of the Christmas night, christmas.js, under its shade). Created
// when the calm night starts, removed when it ends.
const calmSky = document.createElement("div");
calmSky.id = "calm-sky";
calmSky.setAttribute("aria-hidden", "true");
calmSky.innerHTML = `<div class="moon">${MOON}<div class="shade"></div></div>`;
const setCalmSky = on => {
  if (!on) return calmSky.remove();
  calmSky.querySelector(".moon .shade").innerHTML = calmMoonShade(calmMoonAge());
  document.body.prepend(calmSky);
};
setCalmSky(document.body.classList.contains("calm"));
document.addEventListener("calm", e => setCalmSky(e.detail));
