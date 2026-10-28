// ── Halloween witch ───────────────────────────────────────────────────────────────────────────
// Now and then (every one to three minutes), as Santa's sleigh at Christmas, a witch flies across
// the sky of the Halloween screens (halloween.js), behind the courses, day and night: astride her
// broom, leaning forward, her pointed hat bent back by the wind, her hooked nose ahead, her hair
// and her cape streaming and fluttering behind her, her boots curled, and her black cat sitting at
// the end of the broom, its tail swaying. She rides the wind: a gentle swell up and down, her broom
// tilting with it, at a random height, size, speed and direction.
// Behind the broom's bristles she leaves a trail of magic: sparkles in purple, green and gold that
// twinkle as they drift down and fade, on a canvas of their own in the sky (only while she flies).
// Reduced motion: she never comes.
const hwWitch = document.createElement("div"), hwTrailCv = document.createElement("canvas"), hwTrailG = hwTrailCv.getContext("2d");
hwWitch.id = "hwwitch";
hwTrailCv.id = "hwtrail";
