// Start: every file is loaded and every screen registered, so show the right screen for now, then
// check again every second (the metal show is short and must start right on time), running the
// screens' own every-second tasks with it (see screens.js).
applyScreen();
setInterval(() => { applyScreen(); everySecond.forEach(fn => fn()); }, 1000);
