// Generic graph animation engine
// ─────────────────────────────────────────────────────────────────────────────
// Requires these globals defined BEFORE loading this script:
//   NODES   — { [id]: { x, y } }
//   EDGES   — [{ u, v, w }]
//   SOURCE  — node id of the source
//   R       — node radius (pixels)
//
// Each step object returned by runAlgorithm() must have:
//   label         — string shown in the status bar
//   nodeLabels    — { [id]: string }  displayed inside each node
//   nodeHighlight — Set<id>           nodes with red border/tint
//   treeEdges     — Set<"u->v">       bold black edges (SPT or visited)
//   activeEdge    — { u, v } | null   edge currently being processed
//   activeOk      — true | false | null
//
// Usage: call initEngine(steps) once the page is loaded.
// ─────────────────────────────────────────────────────────────────────────────

(function () {

  // ── Geometry helpers ─────────────────────────────────────────────────────

  function edgeGeometry(u, v) {
    const nu = NODES[u], nv = NODES[v];
    const dx = nv.x - nu.x, dy = nv.y - nu.y;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const cpx = (nu.x + nv.x) / 2 - uy * 16;
    const cpy = (nu.y + nv.y) / 2 + ux * 16;
    const sd = Math.hypot(cpx - nu.x, cpy - nu.y);
    const sx = nu.x + (cpx - nu.x) / sd * (R + 3);
    const sy = nu.y + (cpy - nu.y) / sd * (R + 3);
    const ed = Math.hypot(cpx - nv.x, cpy - nv.y);
    const ex = nv.x + (cpx - nv.x) / ed * (R + 3);
    const ey = nv.y + (cpy - nv.y) / ed * (R + 3);
    return { sx, sy, ex, ey, cpx, cpy };
  }

  function quadMid(sx, sy, ex, ey, cpx, cpy, t = 0.45) {
    return {
      x: (1 - t) ** 2 * sx + 2 * (1 - t) * t * cpx + t ** 2 * ex,
      y: (1 - t) ** 2 * sy + 2 * (1 - t) * t * cpy + t ** 2 * ey,
    };
  }

  function drawArrow(ctx, sx, sy, ex, ey, cpx, cpy, color, lw) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    const tx = ex - cpx, ty = ey - cpy;
    const tl = Math.hypot(tx, ty);
    const ax = tx / tl, ay = ty / tl;
    const hw = lw > 2 ? 6 : 4.5, hl = lw > 2 ? 11 : 8;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - hl * ax + hw * (-ay), ey - hl * ay + hw * ax);
    ctx.lineTo(ex - hl * ax - hw * (-ay), ey - hl * ay - hw * ax);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // ── Frame renderer ───────────────────────────────────────────────────────

  function drawStep(ctx, step) {
    const cv = ctx.canvas;
    ctx.clearRect(0, 0, cv.width, cv.height);

    for (const e of EDGES) {
      const key      = `${e.u}->${e.v}`;
      const isActive = step.activeEdge && step.activeEdge.u === e.u && step.activeEdge.v === e.v;
      const isTree   = step.treeEdges && step.treeEdges.has(key);

      let color, lw;
      if      (isActive && step.activeOk) { color = '#bb0000'; lw = 3.2; }
      else if (isTree)                    { color = '#111111'; lw = 3.0; }
      else if (isActive)                  { color = '#999999'; lw = 1.3; }
      else                                { color = '#aaaaaa'; lw = 1.2; }

      const g = edgeGeometry(e.u, e.v);
      drawArrow(ctx, g.sx, g.sy, g.ex, g.ey, g.cpx, g.cpy, color, lw);

      const mid = quadMid(g.sx, g.sy, g.ex, g.ey, g.cpx, g.cpy);
      const nu = NODES[e.u], nv = NODES[e.v];
      const pdx = -(nv.y - nu.y), pdy = nv.x - nu.x;
      const pl  = Math.hypot(pdx, pdy);
      ctx.font      = (isActive || isTree) ? 'bold 12px Segoe UI' : '11px Segoe UI';
      ctx.fillStyle = isActive ? (step.activeOk ? '#bb0000' : '#888') : isTree ? '#222' : '#999';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.w, mid.x + (pdx / pl) * 13, mid.y + (pdy / pl) * 13);
    }

    for (const [id, n] of Object.entries(NODES)) {
      const isSource    = id === SOURCE;
      const isHighlit   = step.nodeHighlight   && step.nodeHighlight.has(id);
      const isDone      = step.nodeDone        && step.nodeDone.has(id);
      const isExtracted = step.nodeExtracted  === id;
      const label       = step.nodeLabels ? (step.nodeLabels[id] ?? id) : id;

      // priority: updated (red) > extracted (gold) > finalized (blue) > source (pink) > default
      let fill, stroke, lw, textColor;
      if      (isHighlit)   { fill = '#fff0f0'; stroke = '#bb0000'; lw = 2.4; textColor = '#bb0000'; }
      else if (isExtracted) { fill = '#fffbe6'; stroke = '#cc8800'; lw = 2.4; textColor = '#cc8800'; }
      else if (isDone)      { fill = '#dce8ff'; stroke = '#5580cc'; lw = 2.0; textColor = '#3355aa'; }
      else if (isSource)    { fill = '#f8c8c8'; stroke = '#222222'; lw = 1.5; textColor = '#111111'; }
      else                  { fill = '#ffffff'; stroke = '#222222'; lw = 1.5; textColor = '#111111'; }

      ctx.beginPath();
      ctx.arc(n.x, n.y, R, 0, 2 * Math.PI);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();

      ctx.font = 'bold 13px Segoe UI';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, n.x, n.y);
    }
  }

  // ── Pseudocode panel ─────────────────────────────────────────────────────
  // Populated once from the PSEUDOCODE global (if defined), then only the
  // active class is toggled on each render — no DOM rebuild per frame.

  function buildPseudocode() {
    const el = document.getElementById('pseudocode');
    if (!el || typeof PSEUDOCODE === 'undefined') return;
    el.innerHTML = '';
    for (const line of PSEUDOCODE) {
      const span = document.createElement('span');
      if (line.fn) {
        span.className = 'pseudo-fn';
        span.textContent = line.text;
      } else {
        span.className = 'pseudo-line';
        span.dataset.id = line.id ?? '';
        span.textContent = '  '.repeat(line.indent ?? 0) + line.text;
      }
      el.appendChild(span);
    }
  }

  function highlightPseudocode(pseudoLine) {
    const el = document.getElementById('pseudocode');
    if (!el) return;
    for (const span of el.querySelectorAll('.pseudo-line')) {
      span.classList.toggle('active', span.dataset.id === pseudoLine);
    }
  }

  window.initEngine = function (steps) {
    const cv  = document.getElementById('cv');
    const ctx = cv.getContext('2d');
    let current = 0, playing = false, timer = null;

    buildPseudocode();

    function updateStatus(step) {
      const sb = document.getElementById('status-box');
      if      (step.activeOk === true)  sb.innerHTML = `<span class="ok">${step.label}</span>`;
      else if (step.activeOk === false) sb.innerHTML = `<span class="skip">${step.label}</span>`;
      else                              sb.innerHTML = `<span class="info">${step.label}</span>`;
    }

    function render(idx) {
      drawStep(ctx, steps[idx]);
      updateStatus(steps[idx]);
      highlightPseudocode(steps[idx].pseudoLine ?? '');
      document.getElementById('progress').textContent = `${idx + 1} / ${steps.length}`;
      document.getElementById('btn-prev').disabled = idx === 0;
      document.getElementById('btn-next').disabled = idx === steps.length - 1;
    }

    function stopPlay() {
      clearInterval(timer);
      playing = false;
      document.getElementById('btn-play').textContent = '▶ Play';
    }

    const getMs = () => 2200 - parseInt(document.getElementById('speed').value);

    document.getElementById('btn-prev').onclick  = () => { stopPlay(); if (current > 0) render(--current); };
    document.getElementById('btn-next').onclick  = () => { stopPlay(); if (current < steps.length - 1) render(++current); };
    document.getElementById('btn-reset').onclick = () => { stopPlay(); render(current = 0); };
    document.getElementById('btn-play').onclick  = () => {
      if (playing) { stopPlay(); return; }
      if (current === steps.length - 1) current = 0;
      playing = true;
      document.getElementById('btn-play').textContent = '⏸ Pause';
      timer = setInterval(() => { current < steps.length - 1 ? render(++current) : stopPlay(); }, getMs());
    };
    document.getElementById('speed').oninput = () => {
      if (!playing) return;
      clearInterval(timer);
      timer = setInterval(() => { current < steps.length - 1 ? render(++current) : stopPlay(); }, getMs());
    };

    render(0);
  };

})();
