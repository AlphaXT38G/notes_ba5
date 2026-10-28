// ── A stuck pointer (the Christmas snowman's snowball, the Halloween spider's web) ─────────────
// After something in the face, the real pointer is hidden and another one, frozen or caught in a
// web, follows it slowly for a while, shivering: slow at first (a time constant of 0.7 s), quicker
// in its last 2.5 s, as it frees itself. A sheet over the page catches the clicks and passes them
// to what is under the stuck pointer. Touch screens have no pointer: nothing happens there.
//   stuckPointer({ id, cursor, ms, from }) -> { stop() }
//     id      the id of the stuck pointer's element (its look is the screen's CSS); the sheet
//             is .stuck-sheet (screens.css)
//     cursor  its SVG
//     ms      how long it stays stuck
//     from    where it starts, if the pointer has not moved yet
//   pointerAt                                where the pointer last was, for any file that needs
//                                            it (null until it moves)
let pointerAt = null;
addEventListener("pointermove", e => { pointerAt = [e.clientX, e.clientY]; }, { passive: true });
const stuckPointer = ({ id, cursor, ms, from }) => {
  if (!matchMedia("(pointer: fine)").matches) return { stop() {} };
  const sheet = document.createElement("div"), stuck = document.createElement("div");
  sheet.className = "stuck-sheet";
  stuck.id = id;
  stuck.className = "stuck-cursor";
  stuck.innerHTML = cursor;
  document.body.append(sheet, stuck);
  const pos = (pointerAt || from).slice(), t0 = performance.now();
  let last = t0, raf = null;
  const stop = () => {
    cancelAnimationFrame(raf);
    sheet.remove();
    stuck.remove();
  };
  const frame = now => {
    const dt = Math.min(.1, (now - last) / 1000), left = ms - (now - t0);
    last = now;
    const speed = left > 2500 ? 1.4 : 1.4 + (2500 - left) / 2500 * 20;
    const k = 1 - Math.exp(-speed * dt), [mx, my] = pointerAt || pos;
    pos[0] += (mx - pos[0]) * k;
    pos[1] += (my - pos[1]) * k;
    const shiver = left > 2500 ? 1.2 : .4;
    stuck.style.transform = `translate(${(pos[0] + (Math.random() - .5) * shiver).toFixed(1)}px,${(pos[1] + (Math.random() - .5) * shiver).toFixed(1)}px)`;
    if (left > 0) raf = requestAnimationFrame(frame);
    else stop();
  };
  raf = requestAnimationFrame(frame);
  // a click goes to what is under the stuck pointer
  sheet.addEventListener("click", e => {
    e.stopPropagation();
    sheet.style.pointerEvents = stuck.style.display = "none";
    const el = document.elementFromPoint(pos[0], pos[1]);
    sheet.style.pointerEvents = stuck.style.display = "";
    if (!el) return;
    if (el.matches("input, textarea, select")) el.focus();
    el.click();
  });
  return { stop };
};
