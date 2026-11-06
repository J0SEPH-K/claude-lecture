/* Laser pointer: a glowing dot replaces the cursor; click-and-drag draws a smooth glowing
   stroke that fades out after you let go. Press L to switch the laser off and on. */
(() => {
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return; // touch screens keep swipe navigation

  const COLOR = '255, 59, 48';          // laser red
  const CORE = '255, 236, 232';
  const HOLD = 700, FADE = 900;         // ms visible after release, then fade length
  const DRAG_START = 4;                 // px of movement before a press becomes a stroke

  const cv = document.createElement('canvas');
  cv.className = 'laser-canvas';
  const dot = document.createElement('div');
  dot.className = 'laser-dot';
  document.body.append(cv, dot);
  const ctx = cv.getContext('2d');

  let on = true, W = 0, H = 0, dpr = 1;
  let x = -100, y = -100;   // pointer position in viewport pixels
  let down = null, current = null;
  const strokes = [];

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = document.documentElement.clientWidth; H = document.documentElement.clientHeight;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();

  function setOn(v) {
    on = v;
    document.documentElement.classList.toggle('laser-on', on);
    if (!on) { strokes.length = 0; current = null; down = null; }
  }
  setOn(true);

  const blocked = () => document.querySelector('.overview.is-open');

  const addPoint = (px, py) => {
    const pts = current.pts, l = pts[pts.length - 1];
    if (Math.hypot(px - l.x, py - l.y) >= 1.5) pts.push({ x: px, y: py });
  };
  window.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!on || !down) return;
    if (!current) {
      if (Math.hypot(x - down.x, y - down.y) < DRAG_START) return;
      current = { pts: [{ x: down.x, y: down.y }], end: 0 };
      strokes.push(current);
      document.documentElement.classList.add('laser-drawing');
    }
    // use every intermediate sample the browser collected, at the exact pointer position
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (evs.length) evs.forEach((c) => addPoint(c.clientX, c.clientY)); else addPoint(x, y);
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    if (!on || e.button !== 0 || blocked()) return;
    down = { x: e.clientX, y: e.clientY };
  });

  const finish = () => {
    if (current) current.end = performance.now();
    current = null; down = null;
    document.documentElement.classList.remove('laser-drawing');
  };
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
  window.addEventListener('blur', finish);

  // a click that ended a drawn stroke should not also press whatever is under it
  window.addEventListener('click', (e) => {
    if (document.documentElement.dataset.justDrew) { e.stopPropagation(); e.preventDefault(); delete document.documentElement.dataset.justDrew; }
  }, true);
  window.addEventListener('pointerup', () => {
    const last = strokes[strokes.length - 1];
    if (last && last.end && performance.now() - last.end < 30 && last.pts.length > 2) document.documentElement.dataset.justDrew = '1';
  });

  window.addEventListener('dragstart', (e) => { if (on) e.preventDefault(); });

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'l' || e.key === 'L') && !e.metaKey && !e.ctrlKey && !e.altKey) setOn(!on);
  });

  // round off hand jitter without moving the line away from the cursor:
  // each point is averaged with its neighbours on both sides, the two ends stay exactly where they were
  function smooth(pts) {
    if (pts.length < 5) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
      const k = Math.min(3, i, pts.length - 1 - i);
      let sx = 0, sy = 0;
      for (let j = i - k; j <= i + k; j++) { sx += pts[j].x; sy += pts[j].y; }
      out.push({ x: sx / (2 * k + 1), y: sy / (2 * k + 1) });
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  // draw as a chain of quadratic curves through segment midpoints: no corners
  function path(raw) {
    const pts = smooth(raw);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length < 3) { ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); return; }
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    const l = pts[pts.length - 1];
    ctx.lineTo(l.x, l.y);
  }

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      let a = 1;
      if (s.end) {
        const t = now - s.end - HOLD;
        if (t > 0) a = Math.max(0, 1 - t / FADE);
        if (a === 0) { strokes.splice(i, 1); continue; }
      }
      if (s.pts.length < 2) continue;
      path(s.pts);
      ctx.shadowColor = `rgba(${COLOR}, ${a})`;
      ctx.shadowBlur = 22;
      ctx.strokeStyle = `rgba(${COLOR}, ${0.55 * a})`; ctx.lineWidth = 10; ctx.stroke();
      ctx.shadowBlur = 8;
      ctx.strokeStyle = `rgba(${COLOR}, ${0.95 * a})`; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(${CORE}, ${0.9 * a})`; ctx.lineWidth = 1.6; ctx.stroke();
    }

    dot.style.transform = `translate(${x}px, ${y}px)`;
    dot.style.opacity = on && !blocked() ? '1' : '0';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
