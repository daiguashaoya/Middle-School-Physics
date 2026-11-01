/* 第3节：频闪照片与运动图像、s-t 图像编辑器、平均速度 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;

  function drawCar(ctx, x, y, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = color || '#e03131';
    D.roundRect(ctx, -22, -14, 44, 12, 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(-7, -24); ctx.lineTo(9, -24); ctx.lineTo(15, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(200,230,255,.95)';
    ctx.beginPath(); ctx.moveTo(-9, -15); ctx.lineTo(-5.5, -22); ctx.lineTo(1, -22); ctx.lineTo(1, -15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(3, -15); ctx.lineTo(3, -22); ctx.lineTo(8, -22); ctx.lineTo(12, -15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#212529';
    ctx.beginPath(); ctx.arc(-12, -2, 5, 0, Math.PI * 2); ctx.arc(12, -2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath(); ctx.arc(-12, -2, 2, 0, Math.PI * 2); ctx.arc(12, -2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  PS.drawCar = drawCar;

  /** 坐标轴；返回映射函数 */
  function axes(ctx, b, o) {
    const X = (t) => b.x + (t / o.xmax) * b.w;
    const Y = (v) => b.y + b.h - (v / o.ymax) * b.h;
    ctx.save();
    ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 1;
    ctx.font = PS.font(10.5, 500); ctx.fillStyle = '#6b7487';
    for (let t = 0; t <= o.xmax + 1e-9; t += o.xstep) {
      ctx.beginPath(); ctx.moveTo(X(t), b.y); ctx.lineTo(X(t), b.y + b.h); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(String(PS.round(t, 2)), X(t), b.y + b.h + 14);
    }
    for (let v = 0; v <= o.ymax + 1e-9; v += o.ystep) {
      ctx.beginPath(); ctx.moveTo(b.x, Y(v)); ctx.lineTo(b.x + b.w, Y(v)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(String(PS.round(v, 2)), b.x - 5, Y(v) + 3.5);
    }
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 1.6;
    D.arrow(ctx, b.x, b.y + b.h, b.x + b.w + 14, b.y + b.h, { width: 1.6, head: 8 });
    D.arrow(ctx, b.x, b.y + b.h, b.x, b.y - 12, { width: 1.6, head: 8 });
    ctx.font = PS.font(12, 700); ctx.fillStyle = '#1b2333';
    ctx.textAlign = 'left'; ctx.fillText(o.xlabel, b.x + b.w + 4, b.y + b.h - 8);
    ctx.fillText(o.ylabel, b.x + 6, b.y - 4);
    if (o.title) { ctx.textAlign = 'right'; ctx.fillStyle = '#3a4458'; ctx.fillText(o.title, b.x + b.w, b.y - 4); }
    ctx.restore();
    return { X, Y };
  }
  PS.axes = axes;

  /* ================= 频闪照片 + s-t / v-t 图像 ================= */
  const MODES = {
    uniform: { name: '匀速直线运动', v: () => 8 },
    accel: { name: '加速直线运动', v: (t) => 1.6 * t },
    decel: { name: '减速直线运动', v: (t) => Math.max(0, 16 - 1.6 * t) },
    mixed: { name: '走走停停', v: (t) => (t < 3 ? 10 : t < 5 ? 0 : 6) },
  };
  PS.register('strobe-graph', function (el) {
    const T = 10;
    const st = { mode: 'uniform', t: 0, playing: false, speed: 1, s: [] };
    function integrate() {
      const v = MODES[st.mode].v;
      const N = 1000;
      st.s = [0];
      let s = 0;
      for (let i = 1; i <= N; i++) { const t0 = ((i - 1) / N) * T, t1 = (i / N) * T; s += ((v(t0) + v(t1)) / 2) * (t1 - t0); st.s.push(s); }
    }
    const sAt = (t) => st.s[Math.round((PS.clamp(t, 0, T) / T) * 1000)];
    const S = PS.stage(el, { ratio: '1000 / 600', draw: paint });
    const res = h('div', { class: 'readouts' });
    const loop = PS.loop((dt) => {
      const before = Math.floor(st.t);
      st.t = Math.min(T, st.t + dt * st.speed);
      if (Math.floor(st.t) > before) PS.sound.tick();
      if (st.t >= T) { loop.stop(); st.playing = false; showRes(); }
      S.render();
    }, S.stage);

    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      const v = MODES[st.mode].v;
      const SMAX = 85;
      // ---- 公路与频闪照片 ----
      const roadY = hh * 0.25, x0 = 50, x1 = w - 40;
      const ppm = (x1 - x0) / SMAX;
      ctx.fillStyle = '#495057'; ctx.fillRect(0, roadY - 4, w, 30);
      ctx.strokeStyle = '#fff'; ctx.setLineDash([16, 14]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, roadY + 11); ctx.lineTo(w, roadY + 11); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = PS.font(10.5, 500); ctx.fillStyle = '#6b7487'; ctx.textAlign = 'center';
      for (let m = 0; m <= SMAX; m += 10) { ctx.fillText(m + ' m', x0 + m * ppm, roadY + 42); }
      D.text(ctx, '频闪照片：每隔 1 s 拍一次', 14, 22, { size: 13, weight: 700, color: '#3a4458' });
      const cs = Math.min(1.3, w / 700);
      let prevX = null, lastLabel = -1e9;
      for (let k = 0; k <= Math.floor(st.t + 1e-9); k++) {
        const x = x0 + sAt(k) * ppm;
        drawCar(ctx, x, roadY - 4, cs, '#e03131', k === Math.floor(st.t) && !st.playing ? 1 : 0.35);
        ctx.fillStyle = '#3b5bdb'; ctx.font = PS.font(10.5, 700);
        if (x - lastLabel > 22) { ctx.fillText(k + 's', x, roadY - 36 * cs); lastLabel = x; }
        if (prevX != null && x - prevX > 24) {
          D.text(ctx, PS.fmt(sAt(k) - sAt(k - 1), 1) + 'm', (x + prevX) / 2, roadY + 60, { align: 'center', size: 11, color: '#e8590c', weight: 700 });
        }
        prevX = x;
      }
      drawCar(ctx, x0 + sAt(st.t) * ppm, roadY - 4, cs, '#e03131', 1);
      // ---- 图像 ----
      const gy = hh * 0.47, gh = hh * 0.42;
      const gw = (w - 150) / 2;
      const A = axes(ctx, { x: 50, y: gy, w: gw, h: gh }, { xmax: T, ymax: 90, xstep: 2, ystep: 15, xlabel: 't/s', ylabel: 's/m', title: '路程—时间图像' });
      const B = axes(ctx, { x: 50 + gw + 70, y: gy, w: gw, h: gh }, { xmax: T, ymax: 18, xstep: 2, ystep: 3, xlabel: 't/s', ylabel: 'v/(m·s⁻¹)', title: '速度—时间图像' });
      ctx.lineWidth = 3; ctx.strokeStyle = '#3b5bdb';
      ctx.beginPath();
      for (let t = 0; t <= st.t + 1e-9; t += 0.02) { const px = A.X(t), py = A.Y(sAt(t)); t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.strokeStyle = '#e8590c';
      ctx.beginPath();
      for (let t = 0; t <= st.t + 1e-9; t += 0.02) { const px = B.X(t), py = B.Y(v(t)); t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.fillStyle = '#3b5bdb';
      for (let k = 0; k <= Math.floor(st.t + 1e-9); k++) { ctx.beginPath(); ctx.arc(A.X(k), A.Y(sAt(k)), 3, 0, Math.PI * 2); ctx.fill(); }
      // 当前时刻
      ctx.fillStyle = '#1b2333';
      ctx.beginPath(); ctx.arc(A.X(st.t), A.Y(sAt(st.t)), 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(B.X(st.t), B.Y(v(st.t)), 5, 0, Math.PI * 2); ctx.fill();
      D.text(ctx, 't = ' + st.t.toFixed(1) + ' s   s = ' + sAt(st.t).toFixed(1) + ' m   v = ' + v(st.t).toFixed(1) + ' m/s', w - 14, 22, { align: 'right', size: 13, weight: 700, color: '#1b2333', bg: 'rgba(255,255,255,.9)' });
    }
    function showRes() {
      res.innerHTML = '';
      const s = sAt(T);
      res.append(PS.ui.readout('总路程 s', s.toFixed(0) + ' m').el, PS.ui.readout('总时间 t', T + ' s').el,
        PS.ui.readout('平均速度 v = s / t', (s / T).toFixed(1) + ' m/s', 'green').el);
      const tip = {
        uniform: '每秒通过的路程都相等 → <b>匀速直线运动</b>：s–t 图像是一条过原点的倾斜直线，v–t 图像是一条水平直线。',
        accel: '相等时间内通过的路程越来越大 → 速度越来越大：s–t 图像向上弯曲，v–t 图像逐渐升高。',
        decel: '相等时间内通过的路程越来越小 → 速度越来越小，最后停下。',
        mixed: '3~5 s 内路程不变（s–t 图像水平），小车<b>静止</b>，速度为 0。全程的平均速度只能粗略描述运动快慢。',
      }[st.mode];
      res.append(h('div', { class: 'tip small', style: { width: '100%', margin: '4px 0 0' }, html: tip }));
    }
    const modeSeg = PS.ui.seg(Object.keys(MODES).map((k) => ({ value: k, label: MODES[k].name })), st.mode, (m) => { st.mode = m; integrate(); st.t = 0; loop.stop(); res.innerHTML = ''; S.render(); });
    const play = PS.ui.button('▶ 播放', () => { if (st.t >= T) st.t = 0; res.innerHTML = ''; loop.start(); st.playing = true; }, 'btn btn-primary');
    const pause = PS.ui.button('⏸ 暂停', () => { loop.stop(); st.playing = false; S.render(); }, 'btn');
    const reset = PS.ui.button('↺ 重来', () => { loop.stop(); st.playing = false; st.t = 0; res.innerHTML = ''; S.render(); }, 'btn btn-ghost');
    const spd = PS.ui.seg([{ value: 0.5, label: '0.5×' }, { value: 1, label: '1×' }, { value: 2, label: '2×' }], 1, (v) => { st.speed = v; });
    el.prepend(PS.ui.row(modeSeg.el));
    el.querySelector('.controls').classList.add('top');
    el.append(PS.ui.row(play, pause, reset, h('span', null, '播放速度'), spd.el), res);
    integrate();
    S.render();
  });

  /* ================= s-t 图像编辑器 ================= */
  PS.register('graph-editor', function (el) {
    const TS = [0, 2, 4, 6, 8, 10];
    const SMAX = 60;
    const st = { s: [0, 12, 24, 36, 48, 60], drag: -1, t: 0, playing: false };
    const S = PS.stage(el, { ratio: '1000 / 540', draw: paint });
    let A = null, box = null;
    const res = h('div', { class: 'readouts' });
    const loop = PS.loop((dt) => { st.t = Math.min(10, st.t + dt * 2); if (st.t >= 10) { loop.stop(); st.playing = false; } S.render(); }, S.stage);
    const sAt = (t) => {
      const i = Math.min(4, Math.floor(t / 2));
      return PS.lerp(st.s[i], st.s[i + 1], (t - TS[i]) / 2);
    };
    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      // 公路
      const roadY = hh * 0.16, x0 = 60, x1 = w - 50, ppm = (x1 - x0) / SMAX;
      ctx.fillStyle = '#495057'; ctx.fillRect(0, roadY - 4, w, 26);
      ctx.strokeStyle = '#fff'; ctx.setLineDash([14, 12]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, roadY + 9); ctx.lineTo(w, roadY + 9); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = PS.font(10.5, 500); ctx.fillStyle = '#6b7487'; ctx.textAlign = 'center';
      for (let m = 0; m <= SMAX; m += 10) ctx.fillText(m + ' m', x0 + m * ppm, roadY + 38);
      drawCar(ctx, x0 + sAt(st.t) * ppm, roadY - 4, Math.min(1.2, w / 760), '#3b5bdb');
      // 图像
      box = { x: 60, y: hh * 0.34, w: w - 130, h: hh * 0.54 };
      A = axes(ctx, box, { xmax: 10, ymax: SMAX, xstep: 1, ystep: 10, xlabel: 't/s', ylabel: 's/m' });
      ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 3;
      ctx.beginPath();
      TS.forEach((t, i) => (i ? ctx.lineTo(A.X(t), A.Y(st.s[i])) : ctx.moveTo(A.X(t), A.Y(st.s[i]))));
      ctx.stroke();
      // 每段速度
      for (let i = 0; i < 5; i++) {
        const v = (st.s[i + 1] - st.s[i]) / 2;
        const mx = A.X(TS[i] + 1), my = A.Y((st.s[i] + st.s[i + 1]) / 2) - 14;
        D.text(ctx, v === 0 ? '静止' : 'v=' + PS.pretty(v, 3) + ' m/s', mx, my, { align: 'center', size: 11.5, weight: 700, color: v === 0 ? '#2b8a3e' : '#e8590c', bg: 'rgba(255,255,255,.85)' });
      }
      // 时间游标
      ctx.strokeStyle = 'rgba(27,35,51,.4)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(A.X(st.t), box.y); ctx.lineTo(A.X(st.t), box.y + box.h); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(A.X(st.t), A.Y(sAt(st.t)), 4.5, 0, Math.PI * 2); ctx.fill();
      // 可拖动的点
      TS.forEach((t, i) => {
        if (i === 0) return;
        ctx.fillStyle = st.drag === i ? '#f08c00' : '#fff';
        ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(A.X(t), A.Y(st.s[i]), 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      D.text(ctx, '拖动橙色圆点改变图像，看看小车怎样运动', w - 14, hh - 10, { align: 'right', size: 12, color: '#6b7487' });
    }
    function pick(p) {
      if (!A) return -1;
      let best = -1, bd = 20;
      TS.forEach((t, i) => { if (!i) return; const d = Math.hypot(p.x - A.X(t), p.y - A.Y(st.s[i])); if (d < bd) { bd = d; best = i; } });
      return best;
    }
    S.canvas.addEventListener('pointerdown', (e) => { const i = pick(S.pos(e)); if (i > 0) { st.drag = i; S.canvas.setPointerCapture(e.pointerId); S.render(); } });
    S.canvas.addEventListener('pointermove', (e) => {
      const p = S.pos(e);
      if (st.drag < 0) { S.canvas.style.cursor = pick(p) > 0 ? 'grab' : ''; return; }
      const v = PS.clamp(Math.round(((box.y + box.h - p.y) / box.h) * SMAX), 0, SMAX);
      const i = st.drag;
      st.s[i] = Math.max(st.s[i - 1], v);
      for (let k = i + 1; k < 6; k++) st.s[k] = Math.max(st.s[k], st.s[i]);
      for (let k = i - 1; k > 0; k--) st.s[k] = Math.min(st.s[k], st.s[i]);
      S.render(); update();
    });
    S.canvas.addEventListener('pointerup', () => { st.drag = -1; S.render(); });
    function update() {
      res.innerHTML = '';
      const total = st.s[5];
      res.append(PS.ui.readout('总路程', total + ' m').el, PS.ui.readout('总时间', '10 s').el, PS.ui.readout('全程平均速度', PS.pretty(total / 10, 3) + ' m/s', 'green').el);
      const segs = [];
      for (let i = 0; i < 5; i++) segs.push((st.s[i + 1] - st.s[i]) / 2);
      const allSame = segs.every((v) => Math.abs(v - segs[0]) < 1e-9);
      res.append(PS.ui.readout('运动类型', allSame ? (segs[0] ? '匀速直线运动' : '一直静止') : '变速直线运动', allSame ? 'primary' : 'accent').el);
    }
    const preset = (arr) => () => { st.s = arr.slice(); st.t = 0; S.render(); update(); };
    el.append(
      PS.ui.row(
        PS.ui.button('▶ 让小车按图像运动', () => { st.t = 0; loop.start(); st.playing = true; }, 'btn btn-primary'),
        h('span', null, '预设：'),
        PS.ui.button('匀速', preset([0, 12, 24, 36, 48, 60]), 'btn btn-sm'),
        PS.ui.button('中途停车', preset([0, 20, 20, 20, 40, 60]), 'btn btn-sm'),
        PS.ui.button('越来越快', preset([0, 4, 10, 20, 36, 60]), 'btn btn-sm'),
        PS.ui.button('越来越慢', preset([0, 24, 40, 51, 57, 60]), 'btn btn-sm')),
      res);
    S.render(); update();
  });

  /* ================= 平均速度 ≠ 速度的平均值 ================= */
  PS.register('avg-halves', function (el) {
    const st = { mode: 'dist', v1: 4, v2: 12, t: 0, playing: false };
    const L = 120, TT = 12;
    const S = PS.stage(el, { ratio: '1000 / 230', draw: paint });
    const res = h('div', { class: 'readouts' });
    const plan = () => {
      if (st.mode === 'dist') { const t1 = L / 2 / st.v1, t2 = L / 2 / st.v2; return { t1, t2, total: t1 + t2, s: L }; }
      return { t1: TT / 2, t2: TT / 2, total: TT, s: (st.v1 + st.v2) * TT / 2 };
    };
    const sAt = (t) => { const p = plan(); return t <= p.t1 ? st.v1 * t : st.v1 * p.t1 + st.v2 * (Math.min(t, p.total) - p.t1); };
    const loop = PS.loop((dt) => {
      const p = plan();
      st.t = Math.min(p.total, st.t + dt * (p.total / 6));
      if (st.t >= p.total) { loop.stop(); st.playing = false; }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      const p = plan();
      const SM = Math.max(L, p.s);
      const x0 = 50, x1 = w - 50, ppm = (x1 - x0) / SM;
      const y = hh * 0.48;
      const sMid = st.v1 * p.t1;
      ctx.fillStyle = '#d0ebff'; ctx.fillRect(x0, y, sMid * ppm, 18);
      ctx.fillStyle = '#ffe8cc'; ctx.fillRect(x0 + sMid * ppm, y, (p.s - sMid) * ppm, 18);
      ctx.strokeStyle = '#adb5bd'; ctx.strokeRect(x0, y, p.s * ppm, 18);
      D.text(ctx, (st.mode === 'dist' ? '前半程 ' : '前一半时间 ') + 'v₁ = ' + st.v1 + ' m/s', x0 + (sMid * ppm) / 2, y + 40, { align: 'center', size: 13, weight: 700, color: '#1c7ed6' });
      D.text(ctx, (st.mode === 'dist' ? '后半程 ' : '后一半时间 ') + 'v₂ = ' + st.v2 + ' m/s', x0 + (sMid + (p.s - sMid) / 2) * ppm, y + 40, { align: 'center', size: 13, weight: 700, color: '#e8590c' });
      D.text(ctx, PS.fmt(sMid, 0) + ' m，用时 ' + PS.fmt(p.t1, 1) + ' s', x0 + (sMid * ppm) / 2, y + 60, { align: 'center', size: 12, color: '#495057' });
      D.text(ctx, PS.fmt(p.s - sMid, 0) + ' m，用时 ' + PS.fmt(p.t2, 1) + ' s', x0 + (sMid + (p.s - sMid) / 2) * ppm, y + 60, { align: 'center', size: 12, color: '#495057' });
      drawCar(ctx, x0 + sAt(st.t) * ppm, y, Math.min(1.3, w / 700), st.t <= p.t1 ? '#1c7ed6' : '#e8590c');
      D.text(ctx, '⏱ ' + st.t.toFixed(1) + ' s', w - 14, 24, { align: 'right', size: 14, weight: 800, bg: 'rgba(255,255,255,.9)' });
    }
    function update() {
      const p = plan();
      const avg = p.s / p.total;
      const mean = (st.v1 + st.v2) / 2;
      res.innerHTML = '';
      res.append(
        PS.ui.readout('全程平均速度 = 总路程 ÷ 总时间', PS.fmt(p.s, 0) + ' m ÷ ' + PS.fmt(p.total, 2) + ' s = ' + PS.pretty(avg, 4) + ' m/s', 'green').el,
        PS.ui.readout('两个速度的平均值 (v₁+v₂)/2', PS.pretty(mean, 4) + ' m/s', Math.abs(avg - mean) < 1e-9 ? 'green' : 'accent').el,
        h('div', { class: 'tip small', style: { width: '100%', margin: '4px 0 0' }, html: st.mode === 'dist'
          ? (st.v1 === st.v2 ? '两段速度相同时，平均速度当然等于这个速度。' : '前后半程<b>路程相同</b>，但慢的那段用时更长，所以平均速度<b>小于</b> (v₁+v₂)/2。公式：v = <span class="frac"><span>2v₁v₂</span><span>v₁+v₂</span></span>')
          : '前后两段<b>时间相同</b>，这种情况下平均速度恰好等于 (v₁+v₂)/2。但这只是特例！' }));
    }
    const v1 = PS.ui.slider({ label: 'v₁', min: 2, max: 20, step: 1, value: st.v1, unit: 'm/s', onInput: (v) => { st.v1 = v; st.t = 0; S.render(); update(); } });
    const v2 = PS.ui.slider({ label: 'v₂', min: 2, max: 20, step: 1, value: st.v2, unit: 'm/s', onInput: (v) => { st.v2 = v; st.t = 0; S.render(); update(); } });
    const mode = PS.ui.seg([{ value: 'dist', label: '前后半程（各 60 m）' }, { value: 'time', label: '前后半段时间（各 6 s）' }], 'dist', (m) => { st.mode = m; st.t = 0; S.render(); update(); });
    el.prepend(PS.ui.row(mode.el));
    el.querySelector('.controls').classList.add('top');
    el.append(PS.ui.row(v1.el, v2.el, PS.ui.button('▶ 播放', () => { st.t = 0; loop.start(); }, 'btn btn-primary')), res);
    S.render(); update();
  });
})();
