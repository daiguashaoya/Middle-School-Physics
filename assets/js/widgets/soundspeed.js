/* 第1节第2课时：声速（不同介质中的声速赛跑）、长铁管听到几次声音、回声。依赖 sound.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  // 教材“小资料”中的声速（m/s）
  const MEDIA = [
    { k: 'vac', name: '真空', v: 0, kind: '—' },
    { k: 'air0', name: '空气（0 ℃）', v: 331, kind: '气体' },
    { k: 'air15', name: '空气（15 ℃）', v: 340, kind: '气体' },
    { k: 'air25', name: '空气（25 ℃）', v: 346, kind: '气体' },
    { k: 'cork', name: '软木', v: 500, kind: '固体' },
    { k: 'kero', name: '煤油（25 ℃）', v: 1324, kind: '液体' },
    { k: 'water', name: '水（常温）', v: 1500, kind: '液体' },
    { k: 'sea', name: '海水（25 ℃）', v: 1531, kind: '液体' },
    { k: 'ice', name: '冰', v: 3230, kind: '固体' },
    { k: 'cu', name: '铜（棒）', v: 3750, kind: '固体' },
    { k: 'marble', name: '大理石', v: 3810, kind: '固体' },
    { k: 'al', name: '铝（棒）', v: 5000, kind: '固体' },
    { k: 'fe', name: '铁（棒）', v: 5200, kind: '固体' },
  ];
  const M = {};
  MEDIA.forEach((m) => { M[m.k] = m; });
  const LANE_C = ['#868e96', '#7048e8', '#1c7ed6', '#e8590c'];

  /* ================= 声速赛跑 ================= */
  PS.register('media-race', function (el) {
    const VW = 1000, VH = 380;
    const st = { lanes: ['vac', 'air15', 'water', 'fe'], s: 1020, t: 0, run: false, scale: 1 };
    const sels = st.lanes.map((k, i) => {
      const s = h('select', { 'aria-label': '第' + (i + 1) + '条跑道的介质' }, MEDIA.map((m) => h('option', { value: m.k }, m.name)));
      s.value = k;
      s.addEventListener('change', () => { st.lanes[i] = s.value; reset(); });
      return s;
    });
    const dS = PS.ui.slider({ label: '传播距离', min: 170, max: 3400, step: 170, value: st.s, unit: 'm', onInput: (v) => { st.s = v; reset(); } });
    el.append(h('div', { class: 'mr-sels' }, sels.map((s, i) => h('label', null, h('i', { style: { background: LANE_C[i] } }), '跑道 ' + (i + 1), s))));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const goBtn = PS.ui.button('🔔 同时发出声音', go, 'btn btn-primary');
    const res = h('div', { class: 'mr-res' });
    el.append(PS.ui.row(goBtn, PS.ui.button('↺ 重置', reset, 'btn'), dS.el), res);

    const times = () => st.lanes.map((k) => (M[k].v ? st.s / M[k].v : Infinity));
    function go() {
      const ts = times().filter(isFinite);
      st.scale = ts.length ? Math.max(...ts) / 5 : 1; // 最慢的一条约用 5 s 画面时间跑完
      st.t = 0; st.run = true;
      res.innerHTML = '';
      loop.start();
    }
    function reset() { st.run = false; st.t = 0; loop.stop(); res.innerHTML = '<span class="muted small">选好四条跑道的介质，点“同时发出声音”。</span>'; S.render(); }
    const loop = PS.loop((dt) => {
      st.t += dt * st.scale; // st.t 为真实时间
      const ts = times().filter(isFinite);
      if (!ts.length || st.t >= Math.max(...ts)) { st.t = ts.length ? Math.max(...ts) : st.t; loop.stop(); showRes(); }
      S.render();
    }, S.stage);

    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const x0 = 230, x1 = 930, ts = times();
      const order = ts.map((t, i) => [t, i]).filter((a) => isFinite(a[0])).sort((a, b) => a[0] - b[0]).map((a) => a[1]);
      st.lanes.forEach((k, i) => {
        const y = 40 + i * 82, m = M[k], c = LANE_C[i];
        D.text(ctx, m.name, 18, y + 4, { size: F(15), weight: 700, color: c });
        D.text(ctx, m.v ? m.v + ' m/s · ' + m.kind : '没有介质', 18, y + 26, { size: F(12.5), weight: 500, color: '#6b7487' });
        ctx.fillStyle = k === 'vac' ? '#f1f3f5' : '#eef2ff';
        D.roundRect(ctx, x0, y - 16, x1 - x0, 40, 10); ctx.fill();
        if (k === 'vac') { ctx.strokeStyle = '#ced4da'; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]); }
        ctx.font = F(24, 16) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔔', x0 - 22, y + 4); ctx.fillText('👂', x1 + 30, y + 4);
        ctx.textBaseline = 'alphabetic';
        if (!m.v) {
          if (st.run || st.t > 0) D.text(ctx, '✗ 真空不能传声，声音传不过去', (x0 + x1) / 2, y + 9, { size: F(14), weight: 700, color: '#e03131', align: 'center' });
          return;
        }
        const k01 = Math.min(1, (st.t * m.v) / st.s), xf = x0 + (x1 - x0) * k01;
        if (st.t > 0) {
          const g = ctx.createLinearGradient(x0, 0, xf, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, c + '55');
          ctx.fillStyle = g; D.roundRect(ctx, x0, y - 16, Math.max(0, xf - x0), 40, 10); ctx.fill();
          if (k01 < 1) {
            ctx.strokeStyle = c; ctx.lineWidth = 3;
            for (let j = 0; j < 4; j++) { const xx = xf - j * 9; if (xx < x0) break; ctx.globalAlpha = 1 - j * 0.22; ctx.beginPath(); ctx.moveTo(xx, y - 12); ctx.lineTo(xx, y + 20); ctx.stroke(); }
            ctx.globalAlpha = 1;
          } else {
            const rank = order.indexOf(i) + 1;
            D.text(ctx, '第 ' + rank + ' 名  t = ' + PS.fmt(ts[i], ts[i] < 1 ? 3 : 2) + ' s', x1 - 10, y + 9, { size: F(14), weight: 800, color: c, align: 'right', bg: 'rgba(255,255,255,.92)' });
          }
        }
      });
      D.text(ctx, '已经过的真实时间 t = ' + PS.fmt(st.t, 3) + ' s', VW - 16, VH - 10, { size: F(13), weight: 700, color: '#3a4458', align: 'right' });
      if (st.run && st.scale > 0) {
        const r = st.scale < 1 ? 1 / st.scale : st.scale;
        D.text(ctx, r < 1.3 ? '画面接近真实速度' : '画面' + (st.scale < 1 ? '慢放' : '加快') + '约 ' + PS.fmt(r, r < 10 ? 1 : 0) + ' 倍', 18, VH - 10, { size: F(12), weight: 600, color: '#868e96' });
      }
      ctx.restore();
    }
    function showRes() {
      const ts = times();
      const rows = st.lanes.map((k, i) => ({ m: M[k], t: ts[i] })).filter((r) => r.m.v).sort((a, b) => a.t - b.t);
      let html = '<b>传播 ' + st.s + ' m 所用的时间：</b>' + rows.map((r) => r.m.name + ' ' + PS.fmt(r.t, r.t < 1 ? 3 : 2) + ' s').join('，') + '。';
      const kinds = new Set(rows.map((r) => r.m.kind));
      if (kinds.has('固体') && kinds.has('气体')) html += '<br>一般情况下，声音在<b class="hl">固体中传播最快</b>，液体中较快，<b>气体中最慢</b>。';
      if (st.lanes.includes('cork') && rows.some((r) => r.m.kind === '液体' && r.m.v > 500)) html += '<br><span class="hl-o">注意：软木是固体，声速却比水小——所以“固体中声速大于液体”只是一般规律。</span>';
      if (st.lanes.includes('vac')) html += '<br>真空跑道上的声音始终没有出发：<b>真空不能传声</b>。';
      res.innerHTML = html;
    }
    reset();
    document.head.append(h('style', null, `
      .mr-sels{display:flex;flex-wrap:wrap;gap:8px 16px;margin-bottom:10px}
      .mr-sels label{display:inline-flex;align-items:center;gap:6px;font-size:.9rem;font-weight:700;color:var(--ink-2)}
      .mr-sels i{width:10px;height:10px;border-radius:50%;display:inline-block}
      .mr-sels select{padding:4px 8px;font-size:.9rem}
      .mr-res{margin-top:10px;background:var(--surface-2);border-radius:10px;padding:10px 14px;border:1px dashed var(--line-2);font-size:.95rem}
    `));
  });

  /* ================= 长铁管：能听到几次敲击声 ================= */
  const V_FE = 5200, V_W = 1500, V_AIR = 340, GAP = 0.1;
  PS.register('pipe-echo', function (el) {
    const VW = 1000, VH = 470;
    const st = { L: 100, water: false, t: -1, scale: 1 };
    const toL = (v) => Math.round(10 * Math.pow(300, v / 100));   // 滑块 0~100 → 10~3000 m
    const fromL = (L) => (100 * Math.log(L / 10)) / Math.log(300);
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const lS = PS.ui.slider({ label: '铁管长度', min: 0, max: 100, step: 0.5, value: fromL(st.L), fmt: (v) => toL(v) + ' m', onInput: (v) => { st.L = toL(v); stop(); } });
    lS.el.querySelector('.slider-val').style.minWidth = '72px';
    const wT = PS.ui.toggle('管中装满水', false, (v) => { st.water = v; stop(); });
    const res = h('div', { class: 'mr-res' });
    el.append(PS.ui.row(PS.ui.button('🔨 敲击铁管', strike, 'btn btn-primary'), PS.ui.button('🔊 真实听感', listen, 'btn'), lS.el, wT.el), res);

    function arrivals() {
      const a = [{ name: '铁管', t: st.L / V_FE, c: '#e8590c' }];
      if (st.water) a.push({ name: '水', t: st.L / V_W, c: '#1c7ed6' });
      a.push({ name: '空气', t: st.L / V_AIR, c: '#7048e8' });
      return a;
    }
    // 相邻两次声音到达人耳的时间差不小于 0.1 s，人耳才能把它们区分开
    function heard() {
      const a = arrivals();
      let n = 1;
      for (let i = 1; i < a.length; i++) if (a[i].t - a[i - 1].t >= GAP) n++;
      return n;
    }
    function strike() {
      st.scale = arrivals()[arrivals().length - 1].t / 3.5; // 画面约 3.5 s
      st.t = 0;
      loop.start();
      PS.audio.strike(1800, [[1, 0.6, 0.08], [2.7, 0.3, 0.05]], { gain: 0.25, click: 0.5 });
    }
    function listen() {
      // 按真实时间间隔播放各次到达的声音
      arrivals().forEach((x, i) => PS.audio.strike(i === 0 ? 2400 : 1500, [[1, 0.8, 0.06], [2.3, 0.3, 0.04]], { gain: 0.32 * (i === 0 ? 0.9 : 1), click: 0.4, when: 0.15 + x.t }));
      PS.toast('听到了 ' + heard() + ' 次敲击声');
    }
    function stop() { loop.stop(); st.t = -1; S.render(); summary(); }
    const loop = PS.loop((dt) => {
      st.t += dt * st.scale;
      const end = arrivals()[arrivals().length - 1].t;
      if (st.t > end * 1.02) { st.t = end * 1.02; loop.stop(); }
      S.render();
    }, S.stage);

    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const x0 = 120, x1 = 880, yp = 170, a = arrivals();
      // 地面与铁管
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, yp + 34, VW, 8);
      ctx.fillStyle = '#868e96'; D.roundRect(ctx, x0, yp - 16, x1 - x0, 32, 8); ctx.fill();
      ctx.fillStyle = st.water ? '#74c0fc' : '#dee2e6'; ctx.fillRect(x0 + 4, yp - 9, x1 - x0 - 8, 18);
      ctx.font = F(36, 20) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🔨', x0 - 40, yp - 30); ctx.fillText('👂', x1 + 46, yp + 2);
      ctx.textBaseline = 'alphabetic';
      D.text(ctx, '甲在一端敲击', x0 - 10, yp + 62, { size: F(13), weight: 700, color: '#3a4458', align: 'center' });
      D.text(ctx, '乙在另一端听', x1 + 20, yp + 62, { size: F(13), weight: 700, color: '#3a4458', align: 'center' });
      D.dim(ctx, x0, x1, yp - 60, '铁管长 ' + st.L + ' m', { color: '#495057', size: F(13) });
      // 三路声波
      if (st.t >= 0) {
        a.forEach((x) => {
          const v = st.L / x.t, k = Math.min(1, (st.t * v) / st.L), xx = x0 + (x1 - x0) * k;
          ctx.strokeStyle = x.c; ctx.lineWidth = 4;
          if (x.name === '空气') { for (let j = 0; j < 3; j++) { ctx.globalAlpha = 1 - j * 0.3; ctx.beginPath(); ctx.arc(xx - j * 10, yp - 30, 22, -0.9, 0.9); ctx.stroke(); } }
          else { const yy = x.name === '铁管' ? yp - 13 : yp; for (let j = 0; j < 3; j++) { ctx.globalAlpha = 1 - j * 0.3; ctx.beginPath(); ctx.moveTo(xx - j * 8, yy - (x.name === '铁管' ? 3 : 7)); ctx.lineTo(xx - j * 8, yy + (x.name === '铁管' ? 3 : 7)); ctx.stroke(); } }
          ctx.globalAlpha = 1;
        });
      }
      // 时间轴
      const tb = { x: 80, y: 318, w: 840 }, tmax = a[a.length - 1].t * 1.12;
      const T = (t) => tb.x + (t / tmax) * tb.w;
      D.arrow(ctx, tb.x, tb.y, tb.x + tb.w + 20, tb.y, { width: 1.5, head: 8 });
      D.text(ctx, 't/s', tb.x + tb.w + 22, tb.y - 8, { size: F(12), weight: 700, color: '#1b2333' });
      D.text(ctx, '乙听到声音的时刻', tb.x, tb.y - 46, { size: F(13), weight: 700, color: '#3a4458' });
      a.forEach((x, i) => {
        const shown = st.t < 0 || st.t >= x.t;
        ctx.globalAlpha = shown ? 1 : 0.25;
        ctx.strokeStyle = x.c; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(T(x.t), tb.y - 22); ctx.lineTo(T(x.t), tb.y + 8); ctx.stroke();
        D.text(ctx, x.name + '传来 ' + PS.fmt(x.t, 3) + ' s', T(x.t), tb.y + 28 + (i % 2) * 22, { size: F(12.5), weight: 700, color: x.c, align: 'center' });
        ctx.globalAlpha = 1;
        if (i > 0) {
          const dt = x.t - a[i - 1].t, ok = dt >= GAP, yb = tb.y + 92 + (i - 1) * 30;
          ctx.globalAlpha = st.t < 0 || st.t >= x.t ? 1 : 0.25;
          D.dim(ctx, T(a[i - 1].t), T(x.t), yb, 'Δt = ' + PS.fmt(dt, 3) + ' s ' + (ok ? '≥ 0.1 s 能分辨' : '< 0.1 s 分不开'), { color: ok ? '#2b8a3e' : '#e03131', size: F(12) });
          ctx.globalAlpha = 1;
        }
      });
      ctx.restore();
    }
    function summary() {
      const n = heard();
      const need2 = 0.1 / (1 / V_AIR - 1 / V_FE), need3 = 0.1 / (1 / V_W - 1 / V_FE);
      res.innerHTML = '乙能听到 <b class="hl" style="font-size:1.15em">' + n + ' 次</b>敲击声。' +
        '最先传到的是经<b>铁管</b>传来的声音（固体中声速最大），最后才是经<b>空气</b>传来的。<br>' +
        '<span class="muted small">人耳能区分两次声音的时间间隔至少为 0.1 s。空管：长度大于约 ' + need2.toFixed(1) + ' m 才能听到两次；装满水：长度大于约 ' + need3.toFixed(0) + ' m 才能听到三次。</span>';
    }
    summary();
  });

  /* ================= 回声 ================= */
  PS.register('echo', function (el) {
    const VW = 1000, VH = 450;
    const st = { d: 170, t: -1, scale: 1, v: 340 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const dS = PS.ui.slider({ label: '人到山崖的距离', min: 5, max: 680, step: 1, value: st.d, unit: 'm', onInput: (v) => { st.d = v; stop(); } });
    const readT = PS.ui.readout('回声比原声晚到', '—', 'accent');
    const readR = PS.ui.readout('能否听到回声', '—');
    const res = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(PS.ui.button('📢 大喊一声', shout, 'btn btn-primary'), PS.ui.button('🔊 真实听感', listen, 'btn'), dS.el), h('div', { class: 'readouts' }, readT.el, readR.el), res);

    const dt = () => (2 * st.d) / st.v;
    function shout() { st.scale = dt() / 3; st.t = 0; loop.start(); PS.audio.shout({ gain: 0.3 }); }
    function listen() {
      PS.audio.shout({ gain: 0.35 });
      PS.audio.shout({ gain: 0.35 * Math.max(0.25, 1 - st.d / 900), when: dt() });
    }
    function stop() { loop.stop(); st.t = -1; S.render(); upd(); }
    const loop = PS.loop((d) => {
      st.t += d * st.scale;
      if (st.t > dt() * 1.15) { loop.stop(); st.t = -1; }
      S.render();
    }, S.stage);
    function axisMax() { return [20, 50, 100, 200, 400, 700].find((m) => m >= st.d * 1.15) || 700; }

    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const sky = ctx.createLinearGradient(0, 0, 0, 300);
      sky.addColorStop(0, '#d0ebff'); sky.addColorStop(1, '#f1f8ff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, 300);
      ctx.fillStyle = '#b2f2bb'; ctx.fillRect(0, 280, VW, 30);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 310, VW, VH - 310);
      const xp = 110, X = (m) => xp + (m / axisMax()) * 780, xc = X(st.d);
      // 山崖
      ctx.fillStyle = '#868e96';
      ctx.beginPath(); ctx.moveTo(xc, 282); ctx.lineTo(xc + 6, 60); ctx.lineTo(xc + 40, 40); ctx.lineTo(VW + 10, 30); ctx.lineTo(VW + 10, 282); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#69db7c'; ctx.beginPath(); ctx.moveTo(xc + 6, 60); ctx.lineTo(xc + 40, 40); ctx.lineTo(VW + 10, 30); ctx.lineTo(VW + 10, 46); ctx.lineTo(xc + 40, 54); ctx.closePath(); ctx.fill();
      ctx.font = F(44, 24) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('🧒', xp - 30, 280);
      // 距离标尺
      ctx.fillStyle = '#6b7487'; ctx.font = PS.font(F(11), 500);
      const step = axisMax() / 5;
      for (let m = 0; m <= axisMax() + 1e-9; m += step) { ctx.fillRect(X(m), 300, 1, 8); ctx.fillText(m + ' m', X(m), 322); }
      D.dim(ctx, xp, xc, 250, 's = ' + st.d + ' m', { color: '#1b2333', size: F(13) });
      // 声波：去和回
      if (st.t >= 0) {
        const one = st.d / st.v;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, VW, 296); ctx.clip();
        ctx.lineWidth = 3;
        const arc = (cx, r, a0) => { const a = Math.min(0.5, 110 / Math.max(1, r)); ctx.beginPath(); ctx.arc(cx, 200, Math.max(1, r), a0 - a, a0 + a); ctx.stroke(); };
        for (let j = 0; j < 3; j++) {
          const tt = st.t - j * one * 0.08;
          if (tt < 0) continue;
          ctx.globalAlpha = 1 - j * 0.28;
          if (tt <= one) { ctx.strokeStyle = '#7048e8'; arc(xp - 20, X(st.v * tt) - xp + 20, 0); }
          else if (tt <= 2 * one) { ctx.strokeStyle = '#e8590c'; arc(xc + 30, xc + 30 - X(st.d - st.v * (tt - one)), Math.PI); }
        }
        ctx.restore();
        D.text(ctx, st.t <= one ? '原声传向山崖' : st.t <= 2 * one ? '遇到山崖反射回来——回声' : '听到回声', 30, 34, { size: F(15), weight: 700, color: st.t <= one ? '#7048e8' : '#e8590c', bg: 'rgba(255,255,255,.85)' });
      }
      // 时间轴：原声与回声
      const tb = { x: 80, y: 400, w: 840 }, tmax = Math.max(0.6, dt() * 1.3 + 0.45);
      const T = (t) => tb.x + (t / tmax) * tb.w;
      D.arrow(ctx, tb.x, tb.y, tb.x + tb.w + 16, tb.y, { width: 1.4, head: 7 });
      D.text(ctx, 't/s', tb.x + tb.w + 18, tb.y - 6, { size: F(12), weight: 700 });
      ctx.fillStyle = 'rgba(112,72,232,.75)'; ctx.fillRect(T(0), tb.y - 24, T(0.4) - T(0), 16);
      ctx.fillStyle = 'rgba(232,89,12,.7)'; ctx.fillRect(T(dt()), tb.y - 44, T(dt() + 0.4) - T(dt()), 16);
      D.text(ctx, '原声', T(0) + 4, tb.y - 30, { size: F(12), weight: 700, color: '#7048e8' });
      D.text(ctx, '回声', T(dt()) + 4, tb.y - 50, { size: F(12), weight: 700, color: '#e8590c' });
      ctx.fillStyle = '#6b7487'; ctx.font = PS.font(F(11), 500); ctx.textAlign = 'center';
      const ts = tmax > 3 ? 1 : tmax > 1.2 ? 0.5 : 0.1;
      for (let t = 0; t <= tmax + 1e-9; t += ts) { ctx.fillRect(T(t), tb.y, 1, 6); ctx.fillText(PS.round(t, 1) + '', T(t), tb.y + 20); }
      ctx.restore();
    }
    function upd() {
      const t = dt();
      readT.set(PS.fmt(t, 3) + ' s');
      const ok = t >= 0.1;
      readR.set(ok ? '<span class="hl-g">能</span>' : '<span class="hl-r">不能区分</span>');
      res.className = 'feedback show ' + (ok ? 'info' : 'bad');
      res.innerHTML = ok
        ? '声音往返的路程是 2s，所以回声比原声晚 t = <span class="frac"><span>2s</span><span>v</span></span> = <span class="frac"><span>2 × ' + st.d + ' m</span><span>340 m/s</span></span> ≈ ' + PS.fmt(t, 3) + ' s ≥ 0.1 s，人耳能把回声和原声区分开。'
        : '回声比原声只晚 ' + PS.fmt(t, 3) + ' s（不到 0.1 s），回声和原声混在一起，<b>使原声加强</b>——在空房间里说话比在旷野里响亮就是这个原因。要听到回声，人离障碍物至少约 <b>17 m</b>。';
    }
    upd();

    // 回声测距练习
    const q = h('div', { class: 'ul-challenge' });
    el.append(q);
    function newQ() {
      const t = PS.pick([0.6, 0.8, 1, 1.2, 1.5, 2, 2.4, 3, 4]);
      const ans = (340 * t) / 2;
      const input = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '?' });
      const fb = h('span', { class: 'q-fb' });
      const check = () => {
        const v = parseFloat(input.value);
        const ok = Math.abs(v - ans) < 0.6;
        input.className = 'num ' + (ok ? 'ok' : 'bad');
        fb.className = 'q-fb ' + (ok ? 'ok' : 'bad');
        fb.innerHTML = ok ? '✔ 正确！s = vt/2 = 340 m/s × ' + t + ' s ÷ 2 = ' + ans + ' m' : '✘ 别忘了除以 2：声音走了一个来回。';
        ok ? PS.sound.good() : PS.sound.bad();
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      q.innerHTML = '';
      q.append(h('span', { class: 'ul-q' }, '练一练'), h('span', null, '对着山崖大喊一声，经过 ' + t + ' s 听到回声，人到山崖的距离是'), input, h('span', null, 'm'), PS.ui.button('检查', check, 'btn btn-sm btn-primary'), PS.ui.button('换一题', newQ, 'btn btn-sm btn-ghost'), fb);
    }
    newQ();
  });
})();
