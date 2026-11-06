/* 클로드 정복 강의 deck engine: keyboard / click / swipe navigation, fragments,
   hash routing, overview, timers, hero scan field and the debate tribunal canvas. */
(() => {
  const deck = document.querySelector('.deck');
  const slides = [...deck.querySelectorAll('.slide')];
  const total = slides.length;
  const $count = document.querySelector('[data-count]');
  const $progress = document.querySelector('.progress');
  const $section = document.querySelector('[data-section]');
  let cur = 0;
  let step = 0; // fragments shown on the current slide

  const pad = (n) => String(n).padStart(2, '0');
  const frags = (s) => [...s.querySelectorAll('.frag')];

  /* ---------- scale the 1600×900 stage to the window ---------- */
  function fit() {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    deck.style.transform = `translate(-50%, -50%) scale(${s})`;
    tribunal.resize(); hero.resize();
  }

  /* ---------- section rails on divider slides ---------- */
  const dividers = slides.filter((s) => s.classList.contains('divider'));
  dividers.forEach((d, i) => {
    const rail = d.querySelector('.divider__rail');
    if (!rail) return;
    rail.innerHTML = dividers.map((_, j) => `<i class="${j < i ? 'is-done' : j === i ? 'is-on' : ''}"></i>`).join('');
  });

  /* ---------- navigation ---------- */
  function go(i, atEnd = false) {
    i = Math.max(0, Math.min(total - 1, i));
    const prev = cur;
    slides.forEach((s, j) => {
      s.classList.toggle('is-active', j === i);
      s.classList.toggle('is-past', j < i);
      s.setAttribute('aria-hidden', j === i ? 'false' : 'true');
    });
    cur = i;
    const f = frags(slides[i]);
    step = atEnd ? f.length : 0;
    f.forEach((el, k) => el.classList.toggle('is-shown', k < step));
    const s = slides[i];
    document.body.dataset.theme = s.dataset.theme || 'dark';
    $count.textContent = `${pad(i + 1)} / ${pad(total)}`;
    $progress.style.width = `${((i + 1) / total) * 100}%`;
    $section.textContent = s.dataset.sec || '';
    if (location.hash !== `#${i + 1}`) history.replaceState(null, '', `#${i + 1}`);
    onStep();
    if (prev !== i) document.dispatchEvent(new CustomEvent('slidechange', { detail: { index: i } }));
  }
  function next() {
    const f = frags(slides[cur]);
    if (step < f.length) { f[step].classList.add('is-shown'); step++; onStep(); return; }
    go(cur + 1);
  }
  function prev() {
    const f = frags(slides[cur]);
    if (step > 0) { step--; f[step].classList.remove('is-shown'); onStep(); return; }
    go(cur - 1, true);
  }
  function onStep() {
    const s = slides[cur];
    if (s.querySelector('.tribunal__cv')) tribunal.setStep(step);
    s.querySelectorAll('.tribunal__steps li').forEach((li, k) => li.classList.toggle('is-now', k === step - 1));
  }

  /* ---------- input ---------- */
  let typed = '';
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (overview.classList.contains('is-open')) {
      if (k === 'Escape' || k === 'o' || k === 'O') toggleOverview(false);
      return;
    }
    if (/^[0-9]$/.test(k)) { typed += k; return; }
    if (k === 'Enter' && typed) { go(parseInt(typed, 10) - 1); typed = ''; return; }
    typed = '';
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(total - 1);
    else if (k === 'o' || k === 'O') toggleOverview(true);
    else if (k === 'f' || k === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.();
    }
  });
  document.querySelector('[data-next]').addEventListener('click', next);
  document.querySelector('[data-prev]').addEventListener('click', prev);
  document.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const t = document.getElementById(a.dataset.go);
    if (t) go(slides.indexOf(t));
  }));
  let tx = null, ty = null;
  window.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
    tx = ty = null;
  });
  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (n && n - 1 !== cur) go(n - 1);
  });

  /* ---------- overview ---------- */
  const overview = document.querySelector('.overview');
  const grid = overview.querySelector('.overview__grid');
  grid.innerHTML = slides.map((s, i) => `<button type="button" data-i="${i}"><small>${pad(i + 1)} · ${s.dataset.sec || ''}</small><b>${s.dataset.title || ''}</b></button>`).join('');
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    toggleOverview(false); go(+b.dataset.i);
  });
  function toggleOverview(open) {
    overview.classList.toggle('is-open', open);
    grid.querySelectorAll('button').forEach((b, i) => b.classList.toggle('is-active', i === cur));
  }
  document.querySelector('[data-overview]').addEventListener('click', () => toggleOverview(true));
  overview.querySelector('[data-close]').addEventListener('click', () => toggleOverview(false));

  /* ---------- clock ---------- */
  const clocks = document.querySelectorAll('[data-clock]');
  const tick = () => {
    const t = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour12: false });
    clocks.forEach((c) => (c.textContent = `SEOUL ${t} KST`));
  };
  tick(); setInterval(tick, 1000);

  /* ---------- timers (break / practice) ---------- */
  document.querySelectorAll('[data-timer]').forEach((root) => {
    const out = root.querySelector('.timer');
    const full = parseInt(root.dataset.timer, 10) * 60;
    let left = full, id = null;
    const draw = () => { out.textContent = `${pad(Math.floor(left / 60))}:${pad(left % 60)}`; out.classList.toggle('is-done', left === 0); };
    root.querySelector('[data-start]').addEventListener('click', () => {
      if (id) { clearInterval(id); id = null; return; }
      id = setInterval(() => { left = Math.max(0, left - 1); draw(); if (!left) { clearInterval(id); id = null; } }, 1000);
    });
    root.querySelector('[data-reset]').addEventListener('click', () => { clearInterval(id); id = null; left = full; draw(); });
    draw();
  });

  /* ---------- ending word: letters widen near the cursor (portfolio footer) ---------- */
  const word = document.querySelector('[data-word]');
  if (word) {
    const parts = [...word.childNodes].flatMap((n) => {
      if (n.nodeType === 3) return [...n.textContent].map((ch) => ({ ch, k: false }));
      return [...n.textContent].map((ch) => ({ ch, k: true }));
    });
    word.innerHTML = parts.map((p) => `<span class="${p.k ? 'k' : ''}">${p.ch}</span>`).join('');
    const spans = [...word.querySelectorAll('span')];
    word.parentElement.addEventListener('mousemove', (e) => {
      spans.forEach((sp) => {
        const r = sp.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const w = Math.round(125 - Math.min(1, d * 4) * 63);
        sp.style.fontVariationSettings = `"wdth" ${w}`;
      });
    });
  }

  /* ---------- hero: inspection field (a nod to the portfolio's canvas hero) ---------- */
  const hero = (() => {
    const cv = document.querySelector('.hero__canvas');
    if (!cv) return { resize() {} };
    const ctx = cv.getContext('2d');
    let W = 1600, H = 900, mx = -999, my = -999, t0 = performance.now();
    const cell = 40, cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const flagged = new Set();
    while (flagged.size < 14) flagged.add(Math.floor(Math.random() * cols * rows));
    function resize() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    }
    cv.parentElement.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width * W; my = (e.clientY - r.top) / r.height * H;
    });
    function frame(now) {
      if (slides[cur] === cv.parentElement) {
        const t = (now - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        const scanY = (t * 140) % (H + 200) - 100;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
          const near = Math.hypot(cx - mx, cy - my) < 140;
          const passed = Math.abs(cy - scanY) < 60;
          const id = y * cols + x;
          let a = 0.07 + (near ? 0.25 : 0) + (passed ? 0.12 : 0);
          ctx.fillStyle = `rgba(236,236,228,${a})`;
          ctx.fillRect(cx - 2, cy - 2, 4, 4);
          if (flagged.has(id) && (cy < scanY || near)) {
            ctx.strokeStyle = '#d4ff3a'; ctx.lineWidth = 1.5;
            ctx.strokeRect(cx - 14, cy - 14, 28, 28);
          }
        }
        ctx.fillStyle = 'rgba(212,255,58,.85)'; ctx.fillRect(0, scanY, W, 1.5);
        const g = ctx.createLinearGradient(0, scanY - 80, 0, scanY);
        g.addColorStop(0, 'rgba(212,255,58,0)'); g.addColorStop(1, 'rgba(212,255,58,.08)');
        ctx.fillStyle = g; ctx.fillRect(0, scanY - 80, W, 80);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { resize };
  })();

  /* ---------- tribunal: user → super judge → 10 agents → 3 judges → super judge ---------- */
  const tribunal = (() => {
    const cv = document.querySelector('.tribunal__cv');
    if (!cv) return { resize() {}, setStep() {} };
    const ctx = cv.getContext('2d');
    const W = 1600, H = 900;
    const INK = '#111210', LIME = '#d4ff3a', WARN = '#ff6b3d';
    const cx = 1120;
    const user = { x: cx, y: 150, label: '나 (사용자)' };
    const sj = { x: cx, y: 262, label: '심사위원장' };
    const lenses = ['고정가 계약', '헤지', '소재 대체', '경량화', '연동 단가', '공급처 다변화', '재생 소재', '손실 줄이기', '정부 지원', '현상 유지'];
    // two staggered rows of five agents
    const agents = lenses.map((l, i) => (i < 5
      ? { x: 820 + i * 150, y: 448, label: l, i }
      : { x: 895 + (i - 5) * 150, y: 616, label: l, i }));
    const judges = [-1, 0, 1].map((k, i) => ({ x: 1120 + k * 220, y: 800, label: `심사위원 ${i + 1}` }));
    const picks = [4, 7, 4];      // each judge's own pick
    const winner = 4;
    const unsourced = 1;          // this agent's claim gets struck for lacking a source
    let target = 0, shown = 0, t0 = performance.now();
    let hover = -1, talk = -1, talkT = 0;

    function resize() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    }
    function setStep(s) { target = s; t0 = performance.now(); }
    cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      let best = -1, bd = 1e9;
      agents.forEach((a, i) => { const d = Math.hypot(a.x - x, a.y - y); if (d < bd) { bd = d; best = i; } });
      if (bd < 120) { talk = best; talkT = performance.now(); }
    });

    function node(p, r, fill, stroke, w = 1.5) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); }
    }
    function label(p, txt, dy, color = INK, size = 17, weight = 500) {
      ctx.font = `${weight} ${size}px "IBM Plex Sans KR", system-ui, sans-serif`;
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(txt, p.x, p.y + dy);
    }
    function line(a, b, color, w = 1, dash = []) {
      ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    }
    function packet(a, b, k, color, r = 5) {
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    }
    function square(p, s, fill, stroke) {
      ctx.beginPath(); ctx.rect(p.x - s / 2, p.y - s / 2, s, s);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    function frame(now) {
      if (slides[cur] === cv.closest('.slide')) {
        const t = (now - t0) / 1000;
        const loop = ((now / 1000) % 1.6) / 1.6;
        ctx.clearRect(0, 0, W, H);
        const S = target;

        // static scaffolding
        line(user, sj, 'rgba(17,18,16,.25)', 1, [2, 5]);
        agents.forEach((a) => line(sj, a, 'rgba(17,18,16,.10)', 1, [2, 6]));
        agents.forEach((a) => judges.forEach((j) => line(a, j, 'rgba(17,18,16,.05)', 1)));

        // step 1: the task reaches the super judge
        if (S >= 1) { line(user, sj, INK, 1.5); if (S === 1) packet(user, sj, Math.min(1, t * 1.2) * 1, INK, 6); }
        // step 2: the same task goes to every agent
        if (S >= 2) agents.forEach((a, i) => { line(sj, a, 'rgba(17,18,16,.45)', 1); if (S === 2) packet(sj, a, (loop + i * 0.02) % 1, INK, 4); });
        // step 3: debate: random pairs exchange evidence
        if (S >= 3) {
          for (let i = 0; i < agents.length; i++) {
            const j = (i + 3) % agents.length;
            const ph = (now / 1000 + i * 0.37) % 2.4;
            if (ph < 1.2) { line(agents[i], agents[j], 'rgba(17,18,16,.25)', 1, [3, 4]); if (S === 3) packet(agents[i], agents[j], ph / 1.2, INK, 3); }
          }
        }
        // step 4: judges listen to everything
        if (S >= 4) agents.forEach((a, i) => judges.forEach((jd, k) => {
          if (i === unsourced) return;
          line(a, jd, 'rgba(17,18,16,.12)', 1);
          if (S === 4 && (i + k) % 3 === 0) packet(a, jd, (loop + i * 0.07) % 1, 'rgba(17,18,16,.6)', 3);
        }));
        // step 5: each judge's own pick, reported up
        if (S >= 5) judges.forEach((jd, k) => {
          const a = agents[picks[k]];
          line(a, jd, INK, 2.5);
          ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(17,18,16,.55)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(jd.x, jd.y); ctx.quadraticCurveTo(1540, 760 - k * 140, sj.x + 32, sj.y); ctx.stroke(); ctx.setLineDash([]);
        });
        // step 6: one verdict goes back to the user
        if (S >= 6) { line(sj, agents[winner], INK, 4); line(sj, user, INK, 4); packet(sj, user, loop, LIME, 8); }

        // nodes: agents
        agents.forEach((a, i) => {
          const isWin = S >= 6 && i === winner;
          const isPick = S >= 5 && picks.includes(i);
          const struck = S >= 3 && i === unsourced;
          const r = isWin ? 34 : 26;
          if (isWin) node(a, 46 + Math.sin(now / 250) * 3, 'rgba(212,255,58,.55)');
          node(a, r, isWin ? INK : isPick ? '#fff' : '#ecece4', INK, isPick ? 2.5 : 1.5);
          if (S >= 2 && !isWin) { // unique approach = its own ring segment
            ctx.beginPath(); ctx.arc(a.x, a.y, r + 6, (i / 10) * Math.PI * 2, (i / 10) * Math.PI * 2 + 1.1);
            ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
          }
          label(a, `A${i + 1}`, 0, isWin ? LIME : INK, 16, 600);
          label(a, a.label, r + 22, struck ? WARN : 'rgba(17,18,16,.75)', 16, 500);
          if (struck) {
            ctx.strokeStyle = WARN; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(a.x - 22, a.y - 22); ctx.lineTo(a.x + 22, a.y + 22); ctx.moveTo(a.x + 22, a.y - 22); ctx.lineTo(a.x - 22, a.y + 22); ctx.stroke();
            label(a, '출처가 없으면 삭제', -r - 18, WARN, 15, 600);
          }
          if (S >= 3 && !struck && i % 3 === 0 && !isWin) label(a, '✓ 출처', -r - 16, 'rgba(17,18,16,.55)', 14, 500);
          if (talk === i && now - talkT < 1800) {
            const bx = a.x, by = a.y - 70;
            ctx.fillStyle = INK; ctx.beginPath(); ctx.roundRect(bx - 120, by - 22, 240, 40, 4); ctx.fill();
            label({ x: bx, y: by }, `"${a.label} 관점: 근거는 [출처]"`, -2, '#ecece4', 15, 500);
          }
        });
        // judges
        judges.forEach((jd) => { square(jd, 46, S >= 4 ? INK : '#ecece4', INK); label(jd, '⚖', 1, S >= 4 ? LIME : INK, 20); label(jd, jd.label, 46, INK, 17, 600); });
        // super judge + user
        square(sj, 62, S >= 1 ? INK : '#ecece4', INK); label(sj, '위원장', 1, S >= 1 ? LIME : INK, 15, 700); label(sj, sj.label, -48, INK, 18, 600);
        node(user, 26, S >= 6 ? LIME : '#ecece4', INK, 2); label(user, '👤', 1, INK, 20); label(user, user.label, -44, INK, 18, 600);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { resize, setStep };
  })();

  /* ---------- boot ---------- */
  window.addEventListener('resize', fit);
  fit();
  const start = parseInt(location.hash.slice(1), 10);
  go(start ? start - 1 : 0);
  const loader = document.querySelector('.loader');
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    setTimeout(() => loader.classList.add('is-open'), 700);
    setTimeout(() => { loader.classList.add('is-done'); fit(); }, 1300);
  });
  const help = document.querySelector('.help');
  setTimeout(() => help.classList.add('is-hidden'), 6000);
})();
