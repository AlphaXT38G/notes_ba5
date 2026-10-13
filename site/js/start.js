// Start: everything is loaded, so show the right screen for now, then check again every second
// (the metal show is short and must start right on time). Each screen module listens to its own
// event, and can add a function to run every second to `everySecond` (see screens.js).
applyNight();
setInterval(() => { applyNight(); preloadSoon(); epicTick(); }, 1000);
