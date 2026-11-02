/* 第8章第1节：牛顿第一定律——伽利略理想斜面、假如外力全部消失、惯性现象、公交车上的惯性、惯性与质量、在行驶的车上跳起、惯性的利用与防止。依赖 force.js、dynamics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, DY = PS.dyn;
  const TAU = Math.PI * 2;
  const rad = (d) => (d * Math.PI) / 180;

  /* ================= 伽利略的理想斜面实验 ================= */
  PS.register('galileo-ramp', function (el) {
    const VW = 1000, VH = 420, BXs = 380, BY = 372, AL = rad(35), GP = 900, PPC = 4;
    const st = { beta: 25, ideal: true, h0: 160, s: 0, v: 0, run: false, peak: 0, rows: [], k: 1, camX: 0, passes: 0, maxS: 0 };
    const bSeg = PS.ui.seg([{ value: 40, label: '40°' }, { value: 25, label: '25°' }, { value: 12, label: '12°' }, { value: 0, label: '0°（水平）' }], st.beta, (v) => { st.beta = v; reset(); });
    const iSeg = PS.ui.seg([{ value: true, label: '理想：没有摩擦' }, { value: false, label: '真实：有摩擦' }], st.ideal, (v) => { st.ideal = v; reset(); });
    el.append(PS.ui.row(h('span', { class: 'small muted' }, '右侧斜面的倾角'), bSeg.el), PS.ui.row(iSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const hS = PS.ui.slider({ label: '释放高度', min: 20, max: 50, step: 5, value: st.h0 / PPC, unit: 'cm', onInput: (v) => { st.h0 = v * PPC; reset(); } });
    const goB = PS.ui.button('▶ 释放小球', () => { if (st.run) return; reset(); st.run = true; st.s = -st.h0 / Math.sin(AL); PS.sound.tick(); }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody');
    el.append(PS.ui.row(hS.el, goB, PS.ui.button('↺ 放回', reset, 'btn btn-ghost btn-sm')), msg,
      h('div', { class: 'table-wrap', style: { marginTop: '8px' } }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '右侧倾角'), h('th', null, '摩擦'), h('th', null, '释放高度'), h('th', null, '滚上的高度'), h('th', null, '沿斜面滚过的路程'))), tbody)));
    function reset() {
      st.run = false; st.s = -st.h0 / Math.sin(AL); st.v = 0; st.peak = 0; st.camX = 0; st.passes = 0; st.maxS = 0; st.logged = false;
      st.k = st.beta ? Math.min(1, 560 / (st.h0 / Math.tan(rad(st.beta)) + 30), 300 / (st.h0 / Math.tan(AL) + 30)) : 0.85;
      msg.className = 'fc-msg'; msg.innerHTML = '小球从左侧斜面上高 <b>' + st.h0 / PPC + ' cm</b> 处由静止释放，它会滚上右侧斜面多高？先猜一猜，再点“释放小球”。';
      S.render();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.beta + '°'), h('td', null, r.ideal ? '没有' : '有'), h('td', null, r.h0 + ' cm'), h('td', null, r.beta ? PS.fmt(r.hh, 1) + ' cm' : '—'), h('td', null, h('b', null, r.dist)))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '还没有数据——依次把倾角改小，各做一次')));
    }
    const pos = (s) => {
      const b = rad(st.beta);
      return s < 0 ? [s * Math.cos(AL), -s * Math.sin(AL)] : [s * Math.cos(b), s * Math.sin(b)];
    };
    const loop = PS.loop((dt) => {
      if (!st.run) return;
      const b = rad(st.beta), mu = st.ideal ? 0 : 0.06, n = 10;
      for (let i = 0; i < n; i++) {
        const d = dt / n;
        const th = st.s < 0 ? AL : b;
        let a = st.s < 0 ? GP * Math.sin(AL) : -GP * Math.sin(b);
        if (mu && Math.abs(st.v) > 0.5) a -= mu * GP * Math.cos(th) * Math.sign(st.v);
        const v0 = st.v;
        st.v += a * d; st.s += st.v * d;
        if (mu && Math.abs(st.s) < 2 && Math.abs(st.v) < 8 && st.beta) { st.v = 0; st.s = 0; st.run = false; msg.className = 'fc-msg bad'; msg.innerHTML = '有摩擦时，小球每次滚上的高度都比上一次低，来回滚几次后停在了最低处。'; break; }
        if (mu && !st.beta && st.s > 0 && v0 > 0 && st.v <= 0.5) { // 有摩擦的水平面：滚一段后停下
          st.v = 0; st.run = false;
          st.rows.push({ beta: 0, ideal: false, h0: st.h0 / PPC, hh: 0, dist: PS.fmt(st.s / PPC, 0) + ' cm' }); if (st.rows.length > 8) st.rows.shift(); table();
          msg.className = 'fc-msg bad'; msg.innerHTML = '有摩擦时，小球在水平面上滚了 <b>' + PS.fmt(st.s / PPC / 100, 1) + ' m</b> 后停了下来——是<b>摩擦阻力</b>改变了它的运动状态。';
          break;
        }
        if (st.s > 0) st.maxS = Math.max(st.maxS, st.s);
        if (st.s > 0 && v0 > 0 && st.v <= 0) { // 到达右侧最高点
          st.passes++;
          if (st.passes === 1) {
            const hh = (st.s * Math.sin(b)) / PPC;
            st.rows.push({ beta: st.beta, ideal: st.ideal, h0: st.h0 / PPC, hh, dist: PS.fmt(st.s / PPC, 0) + ' cm' });
            if (st.rows.length > 8) st.rows.shift();
            table(); PS.sound.good();
            msg.className = 'fc-msg ' + (st.ideal ? 'ok' : 'info');
            msg.innerHTML = st.ideal ? '没有摩擦时，小球滚到了<b>与释放点相同的高度</b>（' + PS.fmt(hh, 1) + ' cm）。倾角为 ' + st.beta + '° 时，它沿斜面滚过了 <b>' + PS.fmt(st.s / PPC, 0) + ' cm</b>。再把倾角改小试试。' : '有摩擦时，小球滚上的高度（' + PS.fmt(hh, 1) + ' cm）<b>比释放高度低</b>——一部分“本领”被摩擦消耗了。';
          }
        }
      }
      if (st.beta === 0 && st.s > 0) {
        const [x] = pos(st.s);
        st.camX = Math.max(0, (x * st.k + BXs - 760) / st.k);
        if (st.ideal && st.s > 300 && !st.logged) { st.logged = true; st.rows.push({ beta: 0, ideal: true, h0: st.h0 / PPC, hh: 0, dist: '永远运动下去' }); if (st.rows.length > 8) st.rows.shift(); table(); PS.sound.good(); }
        if (st.ideal && st.s > 300) { msg.className = 'fc-msg ok'; msg.innerHTML = '右侧变成水平面后，小球<b>再也达不到原来的高度</b>，也就不会停下来——已经滚过 <b>' + PS.fmt(st.s / PPC / 100, 1) + ' m</b>……伽利略推断：<b>如果没有摩擦，小球将以恒定的速度永远运动下去</b>。'; }
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const k = st.k, b = rad(st.beta);
      const X = (x) => BXs + (x - st.camX) * k, Y = (y) => BY - y * k;
      // 斜面（三角形木块）
      const topH = st.h0 + 50;
      ctx.fillStyle = st.ideal ? '#dbe4ff' : '#e9c48f'; ctx.strokeStyle = st.ideal ? '#748ffc' : '#a87b3c'; ctx.lineWidth = 2;
      const lx = -topH / Math.tan(AL);
      ctx.beginPath(); ctx.moveTo(X(lx), Y(topH)); ctx.lineTo(X(0), Y(0)); ctx.lineTo(X(lx), Y(0)); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (st.beta) { const rx = topH / Math.tan(b); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(rx), Y(topH)); ctx.lineTo(X(rx), Y(0)); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else { ctx.fillRect(X(0), Y(0), VW - X(0) + 10, 8); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(VW + 10, Y(0)); ctx.stroke(); }
      FO.ground(ctx, 0, VW, BY + (st.beta ? 0 : 8), { depth: 30 });
      // 释放高度的虚线
      ctx.strokeStyle = 'rgba(232,89,12,.8)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, Y(st.h0)); ctx.lineTo(VW, Y(st.h0)); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '释放高度 ' + st.h0 / PPC + ' cm', 14, Y(st.h0) - 8, { size: F(13), weight: 700, color: '#e8590c' });
      // 水平时的路程刻度
      if (!st.beta) for (let m = 1; m < 200; m++) { const x = X(m * 100 * PPC); if (x < -20 || x > VW + 20) continue; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, Y(0) + 8); ctx.lineTo(x, Y(0) + 18); ctx.stroke(); D.text(ctx, m + ' m', x, Y(0) + 32, { size: F(11), align: 'center', color: '#495057' }); }
      // 小球
      // 小球：斜面上的接触点沿外法线方向移 R（左斜面外法线指向右上方，右斜面指向左上方）
      const [px, py] = pos(st.s), R = 14;
      const nsx = st.s < 0 ? Math.sin(AL) : -Math.sin(b), nsy = -(st.s < 0 ? Math.cos(AL) : Math.cos(b));
      const cx = X(px) + nsx * R, cy = Y(py) + nsy * R;
      FO.ball(ctx, cx, cy, R, '#ffc9c9', '#c92a2a');
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; const sp = (st.s * k) / R; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sp) * R * 0.8, cy + Math.sin(sp) * R * 0.8); ctx.stroke();
      // 最高点标记
      if (st.maxS > 0 && st.beta) { const [mx, my] = pos(st.maxS); ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(X(mx), Y(my), 4, 0, TAU); ctx.fill(); }
      D.text(ctx, st.ideal ? '理想斜面（没有摩擦）' : '真实斜面（有摩擦）', VW - 16, 30, { size: F(14), weight: 800, color: st.ideal ? '#3b5bdb' : '#a87b3c', align: 'right' });
      if (k < 0.99 && st.beta) D.text(ctx, '（画面按比例缩小）', VW - 16, 52, { size: F(12), color: '#868e96', align: 'right' });
    }
    bSeg.set(st.beta, true); iSeg.set(st.ideal, true);
    reset(); table();
    loop.start();
  });

  /* ================= 假如外力全部消失 ================= */
  const VF = {
    book: { name: '静止的书', key: null },
    car: { name: '行驶的汽车', key: null },
    fall: { name: '下落的苹果', key: null },
    circle: { name: '绳拴小球转圈（俯视）', key: [['side', '转到最右边时']] },
    pend: { name: '摆动的小球', key: [['top', '摆到最高点时'], ['bottom', '摆到最低点时']] },
    up: { name: '竖直上抛的球', key: [['top', '到达最高点时']] },
    throw: { name: '斜向上抛出的球', key: [['top', '到达最高点时']] },
  };
  PS.register('vanish-force', function (el) {
    const VW = 1000, VH = 420, GP = 600;
    const st = { k: 'pend', t: 0, p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, gone: false, trail: [], tt: 0, wait: null, frozen: false, th: 0, om: 0 };
    const seg = PS.ui.seg(Object.keys(VF).map((k) => ({ value: k, label: VF[k].name })), st.k, (v) => { st.k = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const keys = h('span', { class: 'dy-scenes' });
    const goneB = PS.ui.button('💥 所有外力突然消失！', () => vanish(), 'btn btn-accent btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const quiz = h('div', { class: 'fc-q', style: { display: 'none' } });
    el.append(PS.ui.row(goneB, keys, PS.ui.button('↺ 重来', reset, 'btn btn-ghost btn-sm')), quiz, msg);
    const readV = () => Math.hypot(st.v.x, st.v.y);
    function reset() {
      st.t = 0; st.gone = false; st.trail = []; st.tt = 0; st.wait = null; st.frozen = false; quiz.style.display = 'none';
      const k = st.k;
      if (k === 'book') { st.p = { x: 500, y: 300 }; st.v = { x: 0, y: 0 }; }
      if (k === 'car') { st.p = { x: 200, y: 330 }; st.v = { x: 160, y: 0 }; }
      if (k === 'fall') { st.p = { x: 520, y: 110 }; st.v = { x: 0, y: 0 }; }
      if (k === 'circle') { st.th = Math.PI * 0.7; }
      if (k === 'pend') { st.th = rad(40); st.om = 0; }
      if (k === 'up') { st.p = { x: 500, y: 370 }; st.v = { x: 0, y: -520 }; }
      if (k === 'throw') { st.p = { x: 120, y: 370 }; st.v = { x: 300, y: -470 }; }
      keys.innerHTML = '';
      (VF[k].key || []).forEach(([id, label]) => keys.append(PS.ui.button('⏸ ' + label, () => { reset(); st.wait = id; msg.className = 'fc-msg info'; msg.innerHTML = '运动到“' + label.replace('时', '') + '”时会自动停住，请你预测……'; }, 'btn btn-sm')));
      msg.className = 'fc-msg';
      msg.innerHTML = '物体正在运动（或静止）。随时点“<b>所有外力突然消失！</b>”，看看它接下来会怎样运动。' + (VF[k].key ? '也可以点右边的按钮，在关键位置停下来先预测。' : '');
      step(0);
      S.render();
    }
    function step(dt) {
      const k = st.k;
      if (st.gone) { st.p.x += st.v.x * dt; st.p.y += st.v.y * dt; if (k === 'car' && st.p.x > VW + 80) st.p.x = -80; return; }
      if (k === 'car') { st.p.x += st.v.x * dt; if (st.p.x > VW + 80) st.p.x = -80; }
      if (k === 'fall') { st.v.y += GP * dt; st.p.y += st.v.y * dt; if (st.p.y > 372) { st.p.y = 110; st.v.y = 0; } }
      if (k === 'circle') {
        const w = 2.4, R = 150; st.th += w * dt;
        st.p = { x: 500 + R * Math.cos(st.th), y: 210 + R * Math.sin(st.th) }; st.v = { x: -R * w * Math.sin(st.th), y: R * w * Math.cos(st.th) };
      }
      if (k === 'pend') {
        const L = 260, n = 6;
        for (let i = 0; i < n; i++) { st.om += -(GP * 1.5 / L) * Math.sin(st.th) * (dt / n); st.th += st.om * (dt / n); }
        st.p = { x: 500 + L * Math.sin(st.th), y: 50 + L * Math.cos(st.th) }; st.v = { x: L * st.om * Math.cos(st.th), y: -L * st.om * Math.sin(st.th) };
      }
      if (k === 'up' || k === 'throw') {
        st.v.y += GP * dt; st.p.x += st.v.x * dt; st.p.y += st.v.y * dt;
        if (st.p.y > 372) { if (k === 'up') { st.p = { x: 500, y: 370 }; st.v = { x: 0, y: -520 }; } else { st.p = { x: 120, y: 370 }; st.v = { x: 300, y: -470 }; } st.trail = []; }
      }
    }
    function vanish() {
      if (st.gone) return;
      st.gone = true; st.tt = 0; st.wait = null; quiz.style.display = 'none';
      PS.sound.ping();
      const v = readV();
      msg.className = 'fc-msg ok';
      msg.innerHTML = v < 3 ? '外力消失的瞬间，它是<b>静止</b>的，所以它将<b>保持静止状态</b>。' : '外力消失的瞬间，它的速度是 ' + PS.fmt(v / 100, 1) + ' m/s（示意），方向如箭头所示——它将以这个速度<b>做匀速直线运动</b>（频闪点的间隔都相等），不会再拐弯，也不会变快变慢。';
      if (st.k === 'circle') msg.innerHTML += '小球沿<b>切线方向</b>飞出。';
    }
    function ask(id) {
      st.frozen = true;
      const still = readV() < 3;
      const opts = ['保持静止', '做匀速直线运动', '继续沿原来的曲线运动', '速度越来越慢，最后停下来'];
      const ans = still ? 0 : 1;
      quiz.style.display = '';
      quiz.innerHTML = '';
      quiz.append(h('div', { html: '<b>预测：</b>' + VF[st.k].name + (VF[st.k].key.find((x) => x[0] === id) || ['', ''])[1] + '，如果所有外力突然消失，它将……' }));
      const box = h('div', { class: 'fc-chips' });
      opts.forEach((o, i) => box.append(PS.ui.button(o, () => {
        const ok = i === ans;
        ok ? PS.sound.good() : PS.sound.bad();
        st.frozen = false; vanish();
        msg.className = 'fc-msg ' + (ok ? 'ok' : 'bad');
        msg.innerHTML = (ok ? '✔ 预测正确！' : '✘ 正确答案是“' + opts[ans] + '”。') + (still ? '此时物体的速度为零，外力消失后它将<b>保持静止</b>。' : '此时物体有速度，外力消失后它将沿此刻的速度方向<b>做匀速直线运动</b>。');
      }, 'btn btn-sm')));
      quiz.append(box);
    }
    const loop = PS.loop((dt) => {
      if (st.frozen) { S.render(); return; }
      const before = { th: st.th, om: st.om, vy: st.v.y };
      step(dt);
      if (st.wait && !st.gone) {
        let hit = false;
        if (st.k === 'pend' && st.wait === 'top' && before.om * st.om < 0) hit = true;
        if (st.k === 'pend' && st.wait === 'bottom' && before.th * st.th < 0) hit = true;
        if ((st.k === 'up' || st.k === 'throw') && st.wait === 'top' && before.vy < 0 && st.v.y >= 0) { hit = true; st.v.y = 0; }
        if (st.k === 'circle' && st.wait === 'side' && Math.sin(before.th) < 0 && Math.sin(st.th) >= 0 && Math.cos(st.th) > 0) { hit = true; st.th = Math.round(st.th / TAU) * TAU; step(0); }
        if (hit) {
          if (st.k === 'pend' && st.wait === 'top') { st.om = 0; st.v = { x: 0, y: 0 }; }
          ask(st.wait); st.wait = null;
        }
      }
      st.tt += dt;
      if (st.tt > 0.14) { st.tt = 0; if (st.gone || st.k === 'throw' || st.k === 'up') { st.trail.push([st.p.x, st.p.y, st.gone]); if (st.trail.length > 40) st.trail.shift(); } }
      S.render();
    }, el);
    function tree(ctx, x, y) {
      ctx.fillStyle = '#8d6e4a'; ctx.fillRect(x - 10, y - 160, 20, 160);
      ctx.fillStyle = '#69db7c'; [[0, -190, 70], [-50, -160, 50], [50, -160, 50]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill(); });
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const k = st.k;
      ctx.fillStyle = k === 'circle' ? '#eef3fa' : '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (k !== 'circle') FO.ground(ctx, 0, VW, 386, { depth: 34 });
      // 频闪点
      DY.strobe(ctx, st.trail.filter((p) => p[2]).map((p) => p), { color: '#e8590c', r: 6 });
      DY.strobe(ctx, st.trail.filter((p) => !p[2]), { color: '#adb5bd', r: 5, alpha: 0.4 });
      const p = st.p;
      if (k === 'book') {
        if (!st.gone) { ctx.fillStyle = '#c98d3e'; ctx.fillRect(330, 320, 340, 22); ctx.fillStyle = '#a87b3c'; ctx.fillRect(350, 342, 20, 44); ctx.fillRect(630, 342, 20, 44); }
        else { ctx.strokeStyle = 'rgba(201,141,62,.35)'; ctx.setLineDash([6, 5]); ctx.strokeRect(330, 320, 340, 22); ctx.setLineDash([]); }
        ctx.fillStyle = '#4dabf7'; ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2; ctx.fillRect(430, 290, 140, 30); ctx.strokeRect(430, 290, 140, 30);
        D.text(ctx, '书', 500, 306, { size: F(14), weight: 800, color: '#fff', align: 'center', baseline: 'middle' });
        if (!st.gone) { FO.arrow(ctx, 500, 305, Math.PI / 2, 70, { color: FC.G, label: 'G', F }); FO.arrow(ctx, 500, 320, -Math.PI / 2, 90, { color: FC.N, label: 'F支', F, labelSide: -1 }); }
        else D.text(ctx, '桌子“消失”了，书也不受重力——它悬在原处不动', 500, 250, { size: F(15), weight: 700, color: '#2b8a3e', align: 'center' });
      }
      if (k === 'car') {
        FO.cart(ctx, p.x - 70, 386, { w: 140, h: 40, r: 14, color: '#f08c00', label: '汽车', spin: p.x / 14 });
        if (!st.gone) { FO.arrow(ctx, p.x + 70, 350, 0, 60, { color: FC.F, label: 'F牵', F }); FO.arrow(ctx, p.x - 70, 350, Math.PI, 60, { color: FC.f, label: 'f阻', F }); }
      }
      if (k === 'fall') {
        if (!st.gone) tree(ctx, 440, 386);
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#5c940d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x + 4, p.y - 24); ctx.stroke();
        if (!st.gone) FO.arrow(ctx, p.x, p.y, Math.PI / 2, 60, { color: FC.G, label: 'G', F });
      }
      if (k === 'circle') {
        ctx.strokeStyle = 'rgba(59,91,219,.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(500, 210, 150, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(500, 210, 7, 0, TAU); ctx.fill();
        if (!st.gone) { ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(500, 210); ctx.lineTo(p.x, p.y); ctx.stroke(); FO.arrow(ctx, p.x, p.y, Math.atan2(210 - p.y, 500 - p.x), 55, { color: FC.T, label: 'F拉', F }); }
        FO.ball(ctx, p.x, p.y, 15, '#a5d8ff', '#1c7ed6');
        D.text(ctx, '光滑水平桌面（俯视图）', 16, 30, { size: F(13), color: '#868e96' });
      }
      if (k === 'pend') {
        ctx.fillStyle = '#868e96'; ctx.fillRect(380, 36, 240, 14);
        if (!st.gone) { ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(500, 50); ctx.lineTo(p.x, p.y); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(500, 50, 260, rad(50), rad(130)); ctx.stroke(); ctx.setLineDash([]);
        FO.ball(ctx, p.x, p.y, 16, '#ffd43b', '#e67700');
        if (!st.gone) { FO.arrow(ctx, p.x, p.y, Math.PI / 2, 55, { color: FC.G, label: 'G', F }); FO.arrow(ctx, p.x, p.y, Math.atan2(50 - p.y, 500 - p.x), 55, { color: FC.T, label: 'F拉', F, labelSide: -1 }); }
      }
      if (k === 'up' || k === 'throw') {
        if (k === 'throw' && !st.gone) { FO.person(ctx, 90, 386, { h: 110, hand: { x: 120, y: 290 } }); }
        if (k === 'up' && !st.gone) FO.person(ctx, 470, 386, { h: 110, hand: { x: 497, y: 288 } });
        FO.ball(ctx, p.x, p.y, 14, '#b2f2bb', '#2b8a3e');
        if (!st.gone) FO.arrow(ctx, p.x, p.y, Math.PI / 2, 55, { color: FC.G, label: 'G', F });
      }
      // 速度箭头
      const v = readV();
      if (v > 3) D.arrow(ctx, p.x, p.y, p.x + (st.v.x / v) * Math.min(90, 30 + v * 0.12), p.y + (st.v.y / v) * Math.min(90, 30 + v * 0.12), { color: '#2b8a3e', width: 2.4, head: 10, dash: [5, 4] });
      D.text(ctx, st.gone ? '所有外力都已消失' : '受力情况：' + (k === 'book' ? '重力、支持力' : k === 'car' ? '水平方向：牵引力、阻力（竖直方向：重力、支持力）' : k === 'circle' ? '绳的拉力（竖直方向的重力和支持力平衡）' : k === 'pend' ? '重力、绳的拉力' : '重力（不计空气阻力）'), VW - 16, k === 'circle' ? 400 : 30, { size: F(13), weight: 700, color: st.gone ? '#e8590c' : '#495057', align: 'right' });
      D.text(ctx, 'v = ' + PS.fmt(v / 100, 1) + ' m/s（示意）', VW - 16, k === 'circle' ? 400 - F(13) * 1.3 : 30 + F(13) * 1.3, { size: F(13), color: '#2b8a3e', align: 'right' });
      if (st.frozen) D.text(ctx, '⏸ 先预测，再看结果', 500, 200, { size: F(20), weight: 800, color: '#3b5bdb', align: 'center', bg: 'rgba(255,255,255,.85)' });
    }
    seg.set(st.k, true);
    reset();
    loop.start();
  });

  /* ================= 惯性现象 ================= */
  const IN = {
    plate: { name: '小球与金属片', fast: '弹簧片迅速把金属片弹出', slow: '用手慢慢把金属片推出',
      ok: ['小球', '原来静止', '金属片受到打击，突然飞出（运动状态改变）', '小球由于具有惯性，要保持原来的静止状态，没有随金属片飞出，在重力作用下落入支座的凹槽中'],
      slowT: '慢慢推时，小球受到金属片的摩擦力，有足够的时间跟着金属片一起运动，最后从支座上掉了下去。' },
    coin: { name: '硬币与卡片', fast: '用手指迅速弹出卡片', slow: '用手慢慢把卡片推走',
      ok: ['硬币', '原来静止', '卡片受力迅速飞出', '硬币由于具有惯性，要保持原来的静止状态，在重力作用下落入杯中'],
      slowT: '慢慢推时，硬币受到卡片的摩擦力，跟着卡片一起运动了。' },
    cloth: { name: '拍打衣服除尘', fast: '用木棒拍打衣服', slow: null,
      ok: ['灰尘', '原来与衣服一起静止', '衣服受力突然运动', '灰尘由于具有惯性，要保持原来的静止状态，与衣服分离，在重力作用下落下'] },
    hammer: { name: '撞击锤柄紧固锤头', fast: '握住锤柄向下撞击板凳', slow: null,
      ok: ['锤头', '原来与锤柄一起向下运动', '锤柄撞到板凳突然停止', '锤头由于具有惯性，要保持原来向下运动的状态，继续向下运动，就紧紧地套在锤柄上了'] },
  };
  PS.register('inertia-demos', function (el) {
    const VW = 1000, VH = 380;
    const st = { k: 'plate', t: -1, fast: true, slow: false };
    const seg = PS.ui.seg(Object.keys(IN).map((k) => ({ value: k, label: IN[k].name })), st.k, (v) => { st.k = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const how = PS.ui.seg([{ value: true, label: '迅速' }, { value: false, label: '缓慢' }], true, (v) => { st.fast = v; reset(); });
    const slowT = PS.ui.toggle('慢动作', false, (v) => { st.slow = v; });
    const goB = PS.ui.button('▶ 演示', () => { reset(); st.t = 0; PS.sound.clack(); }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(goB, how.el, slowT.el, PS.ui.button('↺ 复原', reset, 'btn btn-ghost btn-sm')), msg);
    function reset() {
      st.t = -1;
      const E = IN[st.k];
      how.el.style.display = E.slow ? '' : 'none';
      if (!E.slow) st.fast = true;
      msg.className = 'fc-msg'; msg.innerHTML = '点“演示”：' + (st.fast ? E.fast : E.slow) + '。先猜猜' + E.ok[0] + '会怎样。';
      S.render();
    }
    function done() {
      const E = IN[st.k];
      if (!st.fast) { msg.className = 'fc-msg info'; msg.innerHTML = E.slowT + '对比可见：<b>迅速</b>弹出时，' + E.ok[0] + '来不及跟着动，才能显示出惯性。'; return; }
      msg.className = 'fc-msg ok';
      msg.innerHTML = '<b>用惯性解释现象（四步）：</b>①研究对象：<b>' + E.ok[0] + '</b>；②' + E.ok[1] + '；③' + E.ok[2] + '；④' + E.ok[3] + '。';
    }
    const loop = PS.loop((dt) => {
      if (st.t >= 0) { const was = st.t; st.t += dt * (st.slow ? 0.25 : 1); if (was < 1.6 && st.t >= 1.6) done(); }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const t = Math.max(0, st.t), k = st.k, run = st.t >= 0;
      if (k === 'plate' || k === 'coin') {
        // 载体（金属片 / 卡片）的位移：迅速——不到 0.1 s 就飞出；缓慢——匀速推出 180 px 后连同上面的物体一起掉下
        const isPlate = k === 'plate';
        const sx = 500, topY = isPlate ? 230 : 210, FLY = 360;
        let dx = 0, fall = 0;
        if (run) {
          if (st.fast) dx = Math.min(700, Math.max(0, t - 0.12) * 4200);
          else { dx = Math.min(180, t * 200); const tf = Math.max(0, t - 0.9); fall = Math.min(FLY - topY + 4, 0.5 * 2500 * tf * tf); }
        }
        ctx.fillStyle = '#dee2e6'; ctx.fillRect(0, FLY + 8, VW, VH - FLY - 8);
        if (isPlate) {
          // 底座、支座（顶部有凹槽）
          ctx.fillStyle = '#495057'; ctx.fillRect(330, 340, 340, 20);
          ctx.fillStyle = '#868e96'; ctx.fillRect(sx - 22, topY + 6, 44, 340 - topY - 6);
          ctx.fillStyle = '#f8fafd'; ctx.beginPath(); ctx.arc(sx, topY + 6, 12, 0, Math.PI); ctx.fill();
          // 弹簧片
          const ang = run ? (t < 0.12 ? -0.7 + (t / 0.12) * 0.7 : 0) : -0.7;
          ctx.save(); ctx.translate(360, 340); ctx.rotate(st.fast ? ang : -0.7); ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -(340 - topY) + 2); ctx.stroke(); ctx.restore();
          D.text(ctx, '弹簧片', 330, 200, { size: F(12), color: '#1c7ed6', align: 'center' });
          D.text(ctx, '支座（顶端有凹槽）', sx + 40, 320, { size: F(12), color: '#495057' });
        } else {
          // 杯子
          ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 4; ctx.fillStyle = 'rgba(165,216,255,.25)';
          ctx.beginPath(); ctx.moveTo(sx - 70, topY + 4); ctx.lineTo(sx - 56, 360); ctx.lineTo(sx + 56, 360); ctx.lineTo(sx + 70, topY + 4); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#495057'; ctx.fillRect(300, 360, 400, 8);
        }
        // 载体
        const cw = isPlate ? 120 : 200, cy = topY - 4;
        ctx.fillStyle = isPlate ? '#ced4da' : '#ffe8cc'; ctx.strokeStyle = isPlate ? '#868e96' : '#f08c00'; ctx.lineWidth = 1.5;
        ctx.fillRect(sx - cw / 2 + dx, cy + fall, cw, 8); ctx.strokeRect(sx - cw / 2 + dx, cy + fall, cw, 8);
        if (!st.fast && run && t < 0.9) { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, sx - cw / 2 + dx - 42, cy - 12, 40, 30, 10); ctx.fill(); ctx.stroke(); }
        // 被研究的物体（小球 / 硬币）：迅速时不随载体动、竖直落下；缓慢时随载体一起动
        let ox = sx, oy = cy;
        if (run) {
          if (st.fast) { const tf = Math.max(0, t - 0.15); oy = cy + Math.min(isPlate ? 12 : 146, 0.5 * 2500 * tf * tf); }
          else { ox = sx + dx; oy = cy + fall; }
        }
        if (isPlate) FO.ball(ctx, ox, oy - 14, 14, '#ffc9c9', '#c92a2a');
        else { ctx.fillStyle = '#fcc419'; ctx.strokeStyle = '#e67700'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ox, oy - 6, 22, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      }
      if (k === 'cloth') {
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(100, 60); ctx.lineTo(900, 60); ctx.stroke();
        const hit = run && t > 0.3;
        const sw = hit ? 34 * Math.exp(-(t - 0.3) * 3) * Math.cos((t - 0.3) * 12) : 0;
        ctx.save(); ctx.translate(500, 60);
        ctx.fillStyle = '#748ffc'; ctx.strokeStyle = '#4263eb'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(120, 0); ctx.lineTo(150 + sw, 70); ctx.lineTo(100 + sw * 1.2, 70); ctx.lineTo(100 + sw * 1.4, 260); ctx.lineTo(-100 + sw * 1.4, 260); ctx.lineTo(-100 + sw * 1.2, 70); ctx.lineTo(-150 + sw, 70); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        // 灰尘
        for (let i = 0; i < 26; i++) {
          const x0 = 420 + ((i * 37) % 160), y0 = 150 + ((i * 53) % 150);
          let x = x0, y = y0;
          if (hit) { const tf = t - 0.33; y = y0 + 0.5 * 600 * tf * tf; x = x0 + tf * 6 * ((i % 3) - 1); }
          if (y < 370) { ctx.fillStyle = 'rgba(120,100,80,.75)'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
        }
        // 木棒
        const bx = run ? (t < 0.3 ? 760 - (t / 0.3) * 115 : 645 + Math.min(120, (t - 0.3) * 300)) : 760;
        ctx.save(); ctx.translate(bx, 200); ctx.rotate(-0.25); ctx.fillStyle = '#a87b3c'; D.roundRect(ctx, 0, -8, 220, 16, 8); ctx.fill(); ctx.restore();
        D.text(ctx, '衣服', 500, 340, { size: F(14), color: '#4263eb', align: 'center' });
      }
      if (k === 'hammer') {
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(380, 320, 240, 26); ctx.fillStyle = '#a87b3c'; ctx.fillRect(400, 346, 20, 34); ctx.fillRect(580, 346, 20, 34);
        D.text(ctx, '板凳', 500, 338, { size: F(13), weight: 700, color: '#5c3a0e', align: 'center' });
        // 锤柄下端从 y = 200 落到板凳上（y = 320）后突然停止；锤头由于惯性继续向下滑，直到空隙消失
        const V = 600, G0 = 22, DEC = (V * V) / (2 * G0);
        let yb = 200, gap = G0;
        if (run) {
          const tHit = (320 - 200) / V;
          if (t < tHit) yb = 200 + V * t;
          else { yb = 320; const tf = t - tHit; gap = tf >= V / DEC ? 0 : G0 - (V * tf - 0.5 * DEC * tf * tf); }
        }
        const top = yb - 250;
        ctx.fillStyle = '#d9a066'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 1.5; ctx.fillRect(490, top, 20, yb - top); ctx.strokeRect(490, top, 20, yb - top);
        // 锤头：柄的顶端插在锤头的孔里，孔的上部空着的部分就是空隙 gap
        const ht = top - gap;
        ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; D.roundRect(ctx, 420, ht, 160, 44, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f8fafd'; ctx.fillRect(492, ht, 16, Math.max(0, gap));
        ctx.fillStyle = '#d9a066'; ctx.fillRect(490, top, 20, Math.max(0, ht + 44 - top));
        D.text(ctx, gap > 4 ? '锤头松了（顶部有空隙）' : '锤头套紧了 ✔', 600, ht + 26, { size: F(14), weight: 700, color: gap > 4 ? '#e03131' : '#2b8a3e' });
        if (run && yb >= 320 && t < 1.2) FO.arrow(ctx, 400, ht + 10, Math.PI / 2, 50, { color: '#2b8a3e', label: '锤头继续向下', F, labelSide: 1, dot: false });
      }
      D.text(ctx, IN[k].name, 18, 32, { size: F(17), weight: 800, color: '#3b5bdb' });
      if (st.slow && run) D.text(ctx, '慢动作 ×¼', VW - 18, 32, { size: F(13), color: '#e8590c', align: 'right' });
    }
    seg.set(st.k, true); how.set(true, true);
    reset();
    loop.start();
  });

  /* ================= 公交车上的惯性 / 安全带 ================= */
  PS.register('bus-inertia', function (el) {
    const VW = 1000, VH = 420, GP = 600;
    const st = { tab: 'bus', mode: 'stop', v: 0, a: 0, x: 0, lean: 0, lw: 0, hang: 0, hw: 0, tilt: 0, quiz: null,
      crash: 'front', belt: true, bag: true, ct: -1 };
    const tab = PS.ui.seg([{ value: 'bus', label: '公交车上' }, { value: 'crash', label: '安全带与安全气囊' }], st.tab, (v) => { st.tab = v; ui(); });
    el.append(PS.ui.row(tab.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const quizBox = h('div', { class: 'fc-q', style: { display: 'none' } });
    const msg = h('div', { class: 'fc-msg' });
    el.append(ctl, quizBox, msg);
    const MODES = [['stop', '静止'], ['start', '🚦 突然启动（加速）'], ['cruise', '匀速行驶'], ['brake', '🛑 紧急刹车（减速）']];
    const mBtns = MODES.map(([m, t]) => PS.ui.button(t, () => setMode(m), 'btn btn-sm'));
    const cSeg = PS.ui.seg([{ value: 'front', label: '正面撞车' }, { value: 'rear', label: '被后车追尾' }], st.crash, (v) => { st.crash = v; st.ct = -1; tellCrash(); });
    const beltT = PS.ui.toggle('系安全带', true, (v) => { st.belt = v; st.ct = -1; tellCrash(); });
    const bagT = PS.ui.toggle('安全气囊', true, (v) => { st.bag = v; st.ct = -1; tellCrash(); });
    const crashB = PS.ui.button('▶ 开始', () => { st.ct = 0; PS.sound.tick(); }, 'btn btn-primary btn-sm');
    function ui() {
      ctl.innerHTML = ''; quizBox.style.display = 'none'; st.quiz = null;
      if (st.tab === 'bus') { ctl.append(...mBtns, PS.ui.button('🤔 考考你', quiz, 'btn btn-ghost btn-sm')); setMode('stop'); }
      else { ctl.append(cSeg.el, beltT.el, bagT.el, crashB); st.ct = -1; tellCrash(); }
      S.render();
    }
    function setMode(m) {
      st.mode = m; quizBox.style.display = 'none'; st.quiz = null;
      mBtns.forEach((b, i) => b.classList.toggle('btn-primary', MODES[i][0] === m));
      if (m === 'cruise' && st.v < 60) st.v = 200;
      const T = {
        stop: '车静止，人站得很稳。点下面的按钮，看看车的运动状态改变时，人、吊环和杯中的水会怎样。',
        start: '汽车<b>突然启动</b>：人的脚随车一起向前运动，上身由于<b>惯性</b>仍要保持原来的<b>静止状态</b>，所以人会<b>向后仰</b>；吊环向后摆，杯中的水向后涌（后面高）。',
        cruise: '汽车<b>匀速直线行驶</b>：人和车的运动状态相同且不改变，人站得稳，吊环竖直，水面水平——和静止时一样。',
        brake: '汽车<b>紧急刹车</b>：人的脚随车减速，上身由于<b>惯性</b>仍要保持原来的<b>运动状态</b>继续向前运动，所以人会<b>向前倾</b>；吊环向前摆，杯中的水向前涌（前面高）。',
      };
      msg.className = 'fc-msg' + (m === 'start' || m === 'brake' ? ' info' : ''); msg.innerHTML = T[m];
    }
    function quiz() {
      const cases = [['start', '车向右（车头方向）突然启动'], ['brake', '车向右行驶时突然刹车'], ['cruise', '车向右匀速直线行驶']];
      const c = PS.pick(cases);
      st.quiz = c[0]; st.mode = c[0] === 'cruise' ? 'cruise' : c[0];
      st.v = c[0] === 'start' ? 40 : 260; st.qT = 0.7;
      mBtns.forEach((b) => b.classList.remove('btn-primary'));
      msg.className = 'fc-msg'; msg.innerHTML = '画面中只能看到车厢内部（看不到窗外），观察吊环和水面，判断车正在怎样运动。';
      quizBox.style.display = ''; quizBox.innerHTML = '';
      quizBox.append(h('div', { html: '<b>考考你：</b>车头朝右。根据吊环和水面的样子，车正在……' }));
      const box = h('div', { class: 'fc-chips' });
      cases.forEach(([id, t]) => box.append(PS.ui.button(t, () => {
        const ok = id === c[0];
        ok ? PS.sound.good() : PS.sound.bad();
        quizBox.innerHTML = (ok ? '✔ 对了！' : '✘ 正确答案：' + c[1] + '。') + (c[0] === 'start' ? '吊环和水向<b>后</b>偏，说明车在<b>加速</b>（也可能是向左行驶时刹车）。' : c[0] === 'brake' ? '吊环和水向<b>前</b>偏，说明车在<b>减速</b>（也可能是向左突然启动）。' : '吊环竖直、水面水平，车的运动状态没有改变（静止或匀速直线运动）。') + ' <button class="btn btn-sm btn-ghost">再来一题</button>';
        quizBox.querySelector('button').onclick = quiz;
        st.quiz = null;
      }, 'btn btn-sm')));
      quizBox.append(box);
    }
    function tellCrash() {
      msg.className = 'fc-msg';
      msg.innerHTML = st.crash === 'front' ? '汽车以较大的速度撞上障碍物，车身<b>突然停止</b>。乘客的身体由于惯性会怎样？试试系 / 不系安全带。' : '静止的汽车被后面的车撞了一下，车身<b>突然向前运动</b>。乘客的头会怎样？座椅上的<b>头枕</b>有什么用？';
    }
    function crashDone() {
      msg.className = 'fc-msg ' + (st.crash === 'front' ? (st.belt ? 'ok' : 'bad') : 'ok');
      if (st.crash === 'front') msg.innerHTML = st.belt ? '车突然停止，乘客由于惯性继续向前运动，<b>安全带</b>拉住了身体，' + (st.bag ? '<b>安全气囊</b>弹出，缓冲了头部的撞击。' : '但没有安全气囊，头仍向前猛冲。') : '没有系安全带：车停了，人由于<b>惯性</b>保持原来的速度向前冲，撞到方向盘和挡风玻璃上——非常危险！' + (st.bag ? '（安全气囊只能起辅助作用，必须系安全带。）' : '');
      else msg.innerHTML = '车身突然向前运动，乘客的头由于<b>惯性</b>要保持原来的静止状态，会<b>向后仰</b>，<b>头枕</b>挡住了头部，防止颈部受伤。';
    }
    const loop = PS.loop((dt) => {
      if (st.tab === 'bus') {
        const A = { stop: 0, start: 220, cruise: 0, brake: -320 }[st.mode];
        if (st.mode === 'stop') st.v = 0;
        st.a = A;
        if (st.mode === 'start' && st.v > 520) st.a = 0;
        if (st.mode === 'brake' && st.v <= 0) { st.v = 0; st.a = 0; }
        if (st.quiz && st.qT != null) { st.qT -= dt; if (st.qT < 0 && st.quiz !== 'cruise') { st.v = st.quiz === 'start' ? 40 : 260; st.qT = 0.7; } }
        st.v = Math.max(0, st.v + st.a * dt); st.x += st.v * dt;
        // 吊环和上身：阻尼摆，平衡角 tanθ = −a/g
        const eq = Math.atan(-st.a / GP);
        st.hw += (-(18) * (st.hang - eq) - 4 * st.hw) * dt; st.hang += st.hw * dt;
        st.lw += (-(30) * (st.lean - eq * 1.2) - 9 * st.lw) * dt; st.lean += st.lw * dt;
        st.tilt += (eq - st.tilt) * Math.min(1, dt * 5);
      } else if (st.ct >= 0) { const was = st.ct; st.ct += dt * 0.6; if (was < 1.1 && st.ct >= 1.1) crashDone(); }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      if (st.tab === 'bus') drawBus(ctx, F); else drawCrash(ctx, F);
    }
    function drawBus(ctx, F) {
      const hide = !!st.quiz;
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
      // 窗外：路和树（随车速移动）
      if (!hide) {
        for (let i = -1; i < 8; i++) { const x = ((i * 170 - st.x * 0.6) % 1190 + 1190) % 1190 - 100; ctx.fillStyle = '#8ce99a'; ctx.beginPath(); ctx.arc(x, 150, 40, 0, TAU); ctx.fill(); ctx.fillStyle = '#8d6e4a'; ctx.fillRect(x - 5, 180, 10, 60); }
      }
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(0, 384, VW, 36);
      if (!hide) { ctx.fillStyle = '#fff'; for (let i = 0; i < 12; i++) { const x = ((i * 120 - st.x) % 1440 + 1440) % 1440 - 120; ctx.fillRect(x, 400, 60, 5); } }
      // 车身
      ctx.fillStyle = hide ? '#dee2e6' : 'rgba(255,255,255,.0)';
      ctx.fillRect(130, 70, 740, 300);
      ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 10; D.roundRect(ctx, 125, 65, 750, 310, 22); ctx.stroke();
      ctx.fillStyle = '#f08c00'; ctx.fillRect(125, 300, 750, 70);
      ctx.fillStyle = '#343a40'; [260, 740].forEach((x) => { ctx.beginPath(); ctx.arc(x, 372, 26, 0, TAU); ctx.fill(); ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(x, 372, 10, 0, TAU); ctx.fill(); ctx.fillStyle = '#343a40'; });
      ctx.strokeStyle = 'rgba(240,140,0,.6)'; ctx.lineWidth = 6; [370, 620].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x, 300); ctx.stroke(); });
      D.text(ctx, '车头 →', 860, 92, { size: F(14), weight: 800, color: '#e8590c', align: 'right' });
      // 扶杆与吊环
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(140, 100); ctx.lineTo(860, 100); ctx.stroke();
      [300, 470].forEach((hx) => {
        const L = 80, ex = hx + Math.sin(st.hang) * L, ey = 100 + Math.cos(st.hang) * L;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, 100); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ex + Math.sin(st.hang) * 14, ey + Math.cos(st.hang) * 14, 14, 0, TAU); ctx.stroke();
      });
      // 乘客
      DY.person2(ctx, 600, 300, { h: 170, lean: PS.clamp(st.lean, -0.6, 0.6), hand: null });
      // 杯中的水（小桌上）
      const cx = 760, cy = 300;
      ctx.fillStyle = '#a87b3c'; ctx.fillRect(cx - 60, cy - 70, 120, 10); ctx.fillRect(cx - 6, cy - 60, 12, 60);
      const cw = 70, ch = 70, top = cy - 70 - ch, wl = top + 30, sl = Math.tan(st.tilt) * cw;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - cw / 2, top, cw, ch); ctx.clip();
      ctx.fillStyle = 'rgba(77,171,247,.65)';
      ctx.beginPath(); ctx.moveTo(cx - cw / 2, wl + sl / 2); ctx.lineTo(cx + cw / 2, wl - sl / 2); ctx.lineTo(cx + cw / 2, top + ch); ctx.lineTo(cx - cw / 2, top + ch); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 3; ctx.strokeRect(cx - cw / 2, top, cw, ch);
      if (!hide) {
        D.text(ctx, 'v = ' + PS.fmt(st.v / 30, 1) + ' m/s', 150, 40, { size: F(15), weight: 800, color: '#1c7ed6' });
        D.text(ctx, st.a > 1 ? '正在加速' : st.a < -1 ? '正在减速' : st.v > 1 ? '匀速直线运动' : '静止', 150, 40 + F(15) * 1.25, { size: F(13), color: '#495057' });
        if (Math.abs(st.a) > 1) D.arrow(ctx, 500, 40, 500 + Math.sign(st.a) * 80, 40, { color: st.a > 0 ? '#2b8a3e' : '#e03131', width: 3, head: 11 });
        if (Math.abs(st.a) > 1) D.text(ctx, st.a > 0 ? '速度变大' : '速度变小', 500 + Math.sign(st.a) * 90, 45, { size: F(13), weight: 700, color: st.a > 0 ? '#2b8a3e' : '#e03131', align: st.a > 0 ? 'left' : 'right' });
      } else D.text(ctx, '（看不到窗外）', 500, 40, { size: F(15), weight: 700, color: '#868e96', align: 'center' });
    }
    function drawCrash(ctx, F) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(0, 360, VW, 60);
      const t = Math.max(0, st.ct), run = st.ct >= 0, front = st.crash === 'front';
      // 车的位置
      let carX, carV;
      if (front) { const tHit = 0.5; carX = run ? (t < tHit ? 160 + t * 500 : 410) : 160; carV = run && t < tHit ? 1 : 0; }
      else { carX = 300; if (run && t > 0.4) carX = 300 + Math.min(1, (t - 0.4) / 0.15) * 30 + Math.max(0, t - 0.55) * 120; carV = 0; }
      void carV;
      // 障碍物 / 后车
      if (front) { ctx.fillStyle = '#e03131'; ctx.fillRect(842, 160, 40, 200); ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(842, 175 + i * 50, 40, 18); }
      else { const fr = run ? Math.min(carX, -100 + t * 1000) : -100; FO.cart(ctx, fr - 230, 360, { w: 230, h: 70, r: 26, color: '#868e96', label: '后车' }); }
      // 车身（剖面）
      const cx = carX;
      ctx.fillStyle = '#4dabf7'; ctx.strokeStyle = '#1971c2'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, 300); ctx.lineTo(cx, 220); ctx.lineTo(cx + 110, 210); ctx.lineTo(cx + 190, 130); ctx.lineTo(cx + 330, 130); ctx.lineTo(cx + 400, 215); ctx.lineTo(cx + 430, 230); ctx.lineTo(cx + 430, 300); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e7f5ff'; ctx.beginPath(); ctx.moveTo(cx + 200, 142); ctx.lineTo(cx + 322, 142); ctx.lineTo(cx + 385, 215); ctx.lineTo(cx + 200, 215); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#343a40'; [cx + 90, cx + 350].forEach((x) => { ctx.beginPath(); ctx.arc(x, 330, 30, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#4dabf7'; ctx.fillRect(cx, 300, 430, 20);
      // 座椅和头枕
      ctx.fillStyle = '#495057'; D.roundRect(ctx, cx + 200, 170, 26, 110, 8); ctx.fill(); D.roundRect(ctx, cx + 200, 268, 100, 22, 8); ctx.fill();
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, cx + 196, 140, 30, 26, 8); ctx.fill();
      // 方向盘
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx + 370, 250); ctx.lineTo(cx + 330, 200); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx + 330, 200, 6, 26, -0.6, 0, TAU); ctx.stroke();
      // 乘客：身体相对车身的偏移 d、头的后仰角
      let d = 0, head = 0;
      if (run && front && t > 0.5) {
        const tf = t - 0.5, free = 500 * tf;
        const lim = st.belt ? 34 : 95;
        d = Math.min(free, lim);
        if (st.belt && free > lim) d = lim - Math.min(lim * 0.5, (free - lim) * 0.15);
      }
      if (run && !front && t > 0.4) { head = -Math.min(0.5, (t - 0.4) * 4); if (t > 0.6) head = -Math.max(0.15, 0.5 - (t - 0.6) * 1.2); }
      const hipX = cx + 242 + d * 0.6, hipY = 262;
      const lean = front ? Math.min(0.9, d / 110) : 0;
      const shX = hipX + Math.sin(lean) * 60 + d * 0.3, shY = hipY - Math.cos(lean) * 60;
      ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(hipX + 70, hipY + 4); ctx.lineTo(hipX + 80, hipY + 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(shX, shY); ctx.stroke();
      const hl = lean + (front ? 0 : head);
      let hx = shX + Math.sin(hl) * 26, hy = shY - Math.cos(hl) * 26;
      if (!front) hx = Math.max(hx, cx + 226 + 15); // 头枕挡住了头
      ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 17, 0, TAU); ctx.fill(); ctx.stroke();
      // 安全带
      if (st.belt) { ctx.strokeStyle = '#212529'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx + 214, 172); ctx.lineTo(shX + 6, shY + 10); ctx.lineTo(hipX + 20, hipY); ctx.stroke(); }
      // 安全气囊
      if (front && st.bag && run && t > 0.53) { const r = Math.min(44, (t - 0.53) * 600); ctx.fillStyle = 'rgba(248,249,250,.95)'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx + 320, 190, r * 0.7, r, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      if (front && !st.belt && d > 90) D.text(ctx, '💥', cx + 360, 180, { size: 40 });
      D.text(ctx, front ? '正面撞车：车身突然停止' : '被追尾：车身突然向前运动', 18, 32, { size: F(16), weight: 800, color: '#3b5bdb' });
    }
    tab.set(st.tab, true); cSeg.set(st.crash, true);
    ui();
    loop.start();
  });

  /* ================= 惯性的大小与质量 ================= */
  PS.register('inertia-mass', function (el) {
    const VW = 1000, VH = 380, PPM = 60;
    const CARTS = [{ m: 1, name: '空车', c: '#4dabf7', y: 170 }, { m: 4, name: '装满砖块的车', c: '#f08c00', y: 330 }];
    const st = { exp: 'push', t: -1, run: false, x: [0, 0], v: [0, 0], done: false };
    const seg = PS.ui.seg([{ value: 'push', label: '用同样大的力推 1 s' }, { value: 'stop', label: '以同样的速度运动，用同样大的力让它停下' }], st.exp, (v) => { st.exp = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(PS.ui.button('▶ 开始', () => { reset(); st.t = 0; PS.sound.tick(); }, 'btn btn-primary btn-sm'), PS.ui.button('↺ 复原', reset, 'btn btn-ghost btn-sm')), msg);
    const FN = 4; // 推力 / 阻力 4 N（示意，光滑轨道）
    function reset() {
      st.t = -1; st.done = false; st.x = [0, 0];
      st.v = st.exp === 'push' ? [0, 0] : [2, 2];
      msg.className = 'fc-msg';
      msg.innerHTML = st.exp === 'push' ? '光滑轨道上有两辆小车：空车 1 kg，装满砖块的车 4 kg。用<b>同样大的力</b>（4 N）各推 <b>1 s</b>，哪辆车的速度变化大？' : '两辆车都以 <b>2 m/s</b> 的速度运动，用同样大的力（4 N）让它们停下来，哪辆车更难停下？';
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.t < 0 || st.t > 4.5) { S.render(); return; }
      st.t += dt;
      for (let i = 0; i < 2; i++) {
        const m = CARTS[i].m;
        let a = 0;
        if (st.exp === 'push') a = st.t < 1 ? FN / m : 0;
        else if (st.v[i] > 0) a = -FN / m;
        st.v[i] = Math.max(0, st.v[i] + a * dt);
        st.x[i] += st.v[i] * dt;
      }
      if (!st.done && ((st.exp === 'push' && st.t > 1.4) || (st.exp === 'stop' && st.v[0] === 0 && st.v[1] === 0))) {
        st.done = true; PS.sound.good();
        msg.className = 'fc-msg ok';
        msg.innerHTML = st.exp === 'push' ? '推 1 s 后，空车的速度变为 <b>4 m/s</b>，装满砖块的车只有 <b>1 m/s</b>——质量大的车，运动状态<b>更难改变</b>。' : '空车滑行 <b>' + PS.fmt(st.x[0], 1) + ' m</b> 就停下了，装满砖块的车滑行了 <b>' + PS.fmt(st.x[1], 1) + ' m</b>——质量大的车<b>更难停下</b>。';
        msg.innerHTML += '<br>结论：<b>质量越大，惯性越大</b>，物体的运动状态越难改变。惯性的大小<b>只与质量有关</b>，与速度、是否受力无关。';
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      CARTS.forEach((c, i) => {
        const gy = c.y;
        ctx.fillStyle = '#dee2e6'; ctx.fillRect(0, gy, VW, 8);
        for (let m = 0; m <= 15; m++) { const x = 90 + m * PPM; ctx.fillStyle = '#868e96'; ctx.fillRect(x - 1, gy + 8, 2, m % 5 === 0 ? 12 : 6); if (m % 5 === 0) D.text(ctx, m + ' m', x, gy + 32, { size: F(11), align: 'center', color: '#495057' }); }
        const x = 90 + Math.min(st.x[i], 14.2) * PPM;
        FO.cart(ctx, x - 50, gy, { w: 100, h: 34, r: 11, color: c.c, spin: st.x[i] * 6 });
        if (c.m > 1) for (let k = 0; k < 6; k++) { ctx.fillStyle = '#c92a2a'; ctx.strokeStyle = '#862e2e'; ctx.lineWidth = 1; const bx = x - 44 + (k % 3) * 30, by = gy - 52 - Math.floor(k / 3) * 15; ctx.fillRect(bx, by, 28, 14); ctx.strokeRect(bx, by, 28, 14); }
        D.text(ctx, c.name + '（' + c.m + ' kg）', 20, gy - 80, { size: F(15), weight: 800, color: c.c === '#4dabf7' ? '#1c7ed6' : '#e8590c' });
        D.text(ctx, 'v = ' + PS.fmt(st.v[i], 1) + ' m/s', VW - 20, gy - 80, { size: F(15), weight: 700, color: '#2b8a3e', align: 'right' });
        const pushing = st.t >= 0 && (st.exp === 'push' ? st.t < 1 : st.v[i] > 0);
        if (pushing) {
          if (st.exp === 'push') FO.arrow(ctx, x - 50, gy - 30, 0, 50, { color: FC.F, label: '4 N', F, labelSide: -1, dot: false });
          else FO.arrow(ctx, x + 50, gy - 30, Math.PI, 50, { color: FC.f, label: '4 N', F, labelSide: -1, dot: false });
        }
      });
    }
    seg.set(st.exp, true);
    reset();
    loop.start();
  });

  /* ================= 在行驶的车上竖直跳起 ================= */
  PS.register('ship-jump', function (el) {
    const VW = 1000, VH = 400, PPM = 120, V0 = 2, VJ = 2.6, G = 9.8, FLOOR = 300;
    const st = { view: 'ground', mode: 'uniform', t: -1, slow: true, res: null };
    const vSeg = PS.ui.seg([{ value: 'ground', label: '站在地面上看' }, { value: 'train', label: '坐在车上看' }], st.view, (v) => { st.view = v; S.render(); });
    const mSeg = PS.ui.seg([{ value: 'uniform', label: '车匀速行驶' }, { value: 'acc', label: '起跳后车加速' }, { value: 'dec', label: '起跳后车减速' }], st.mode, (v) => { st.mode = v; reset(); });
    mSeg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(vSeg.el), PS.ui.row(mSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(PS.ui.button('🦘 竖直向上跳', () => { reset(); st.t = 0; PS.sound.tick(); }, 'btn btn-primary btn-sm'), PS.ui.toggle('慢动作', true, (v) => { st.slow = v; }).el, PS.ui.button('↺ 复原', reset, 'btn btn-ghost btn-sm')), msg);
    const TJ = (2 * VJ) / G;
    const acc = () => ({ uniform: 0, acc: 2.5, dec: -2.5 }[st.mode]);
    // 车的位移（起跳时车厢上的起跳点在 x = 0）：起跳后的 TJ 秒内加速度为 acc，之后保持落地时的速度
    const trainX = (t) => { const a = acc(), tt = PS.clamp(t, 0, TJ); return V0 * t + 0.5 * a * tt * tt + a * TJ * Math.max(0, t - TJ); };
    // 人在空中水平速度保持 V0（惯性），落地后随车运动
    const manX = (t) => (t < TJ ? V0 * Math.max(0, t) : trainX(t) + st.offset);
    function reset() { st.t = -1; st.res = null; st.offset = V0 * TJ - trainX(TJ); st.trail = []; msg.className = 'fc-msg'; msg.innerHTML = '车（或船）以 2 m/s 向右行驶，车上的人竖直向上跳起。他会落在起跳点的哪里？红色“×”是起跳点。'; S.render(); }
    const loop = PS.loop((dt) => {
      if (st.t >= 0) {
        st.t += dt * (st.slow ? 0.35 : 1);
        if (st.t <= TJ) { st.trail.push([st.t, manX(st.t), VJ * st.t - 0.5 * G * st.t * st.t]); }
        if (st.t > TJ && st.res == null) {
          st.trail.push([TJ, manX(TJ - 1e-6), 0]);
          st.res = st.offset; PS.sound.clack();
          const cm = Math.round(st.offset * 100);
          msg.className = 'fc-msg ' + (st.mode === 'uniform' ? 'ok' : 'info');
          msg.innerHTML = st.mode === 'uniform' ? '人落回了<b>原处</b>！起跳前人随车以 2 m/s 向右运动，跳起后由于<b>惯性</b>，人在水平方向仍保持 2 m/s 的速度，与车“同步”前进，所以落回原处。' : st.mode === 'acc' ? '人落在起跳点的<b>后方</b>约 ' + Math.abs(cm) + ' cm：人在空中水平速度保持 2 m/s 不变（惯性），而车加速跑到了前面。' : '人落在起跳点的<b>前方</b>约 ' + Math.abs(cm) + ' cm：人在空中保持 2 m/s 的水平速度（惯性），而车减速了。';
        }
        if (st.t > TJ + 1.6) st.t = TJ + 1.6;
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
      const t = Math.max(st.t, 0), tr = trainX(t);
      // 视角：地面看——起跳点附近的地面不动；车上看——车厢不动
      const cam = st.view === 'ground' ? 0 : tr;
      const X = (x) => 380 + (x - cam) * PPM;
      // 远处的电线杆（地面上的参照物）
      for (let i = -6; i < 16; i++) { const x = X(i * 1.5); if (x < -30 || x > VW + 30) continue; ctx.fillStyle = '#868e96'; ctx.fillRect(x - 3, 70, 6, 260); ctx.fillRect(x - 18, 80, 36, 4); }
      ctx.fillStyle = '#ced4da'; ctx.fillRect(0, 360, VW, 40);
      for (let i = -10; i < 30; i++) { const x = X(i * 0.6); if (x < -40 || x > VW + 40) continue; ctx.fillStyle = '#868e96'; ctx.fillRect(x - 14, 366, 28, 6); }
      // 平板车（车厢地板）
      const t0 = X(tr - 3.2), t1 = X(tr + 3.2);
      ctx.fillStyle = '#f08c00'; ctx.fillRect(t0, FLOOR, t1 - t0, 30);
      ctx.fillStyle = '#d9480f'; ctx.fillRect(t0, FLOOR + 30, t1 - t0, 12);
      for (let i = -3; i <= 3; i++) { const wx = X(tr + i * 1.0); ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(wx, 350, 12, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 4; ctx.strokeRect(t0, FLOOR - 160, t1 - t0, 160);
      // 起跳点 ×（画在车厢地板上）
      const mk = X(tr + 0);
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(mk - 9, FLOOR - 9); ctx.lineTo(mk + 9, FLOOR + 9); ctx.moveTo(mk + 9, FLOOR - 9); ctx.lineTo(mk - 9, FLOOR + 9); ctx.stroke();
      // 轨迹
      if (st.trail && st.trail.length > 1) {
        ctx.strokeStyle = 'rgba(59,91,219,.7)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath();
        // 地面上看：人相对地面的位置；车上看：人相对车厢的位置
        st.trail.forEach((p, i) => { const xx = st.view === 'ground' ? X(p[1]) : 380 + (p[1] - trainX(p[0])) * PPM, yy = FLOOR - p[2] * PPM - 60; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
        ctx.stroke(); ctx.setLineDash([]);
      }
      // 人
      const air = st.t >= 0 && st.t < TJ;
      const mx = st.t < 0 ? tr : manX(t), my = air ? VJ * t - 0.5 * G * t * t : 0;
      FO.person(ctx, X(mx), FLOOR - my * PPM, { h: 120, hand: { x: X(mx) + 14, y: FLOOR - my * PPM - 70 }, stride: air ? 0.12 : 0.22 });
      D.text(ctx, st.view === 'ground' ? '站在地面上看：人的轨迹是一条曲线' : '坐在车上看：人竖直上升、竖直下落', 18, 30, { size: F(15), weight: 800, color: '#3b5bdb' });
      D.text(ctx, '车速 ' + PS.fmt(V0 + acc() * Math.min(t, TJ), 1) + ' m/s →', VW - 18, 30, { size: F(14), weight: 700, color: '#e8590c', align: 'right' });
      if (st.res != null && Math.abs(st.res) > 0.01) { const lx = X(tr + st.offset); D.arrow(ctx, mk, FLOOR + 60, lx, FLOOR + 60, { color: '#7048e8', width: 2.5, head: 9, both: true }); }
    }
    vSeg.set(st.view, true); mSeg.set(st.mode, true);
    reset();
    loop.start();
  });

  /* ================= 利用惯性还是防止惯性的危害 ================= */
  PS.register('inertia-sort', function (el) {
    PS.sortCards(el, [
      ['跳远运动员起跳前要助跑', 0, '起跳后由于惯性继续向前运动，跳得更远。'],
      ['拍打衣服，除去上面的灰尘', 0, '衣服运动，灰尘由于惯性保持静止而脱离衣服。'],
      ['洗完手后用力甩掉手上的水', 0, '手停下，水由于惯性继续运动，离开手。'],
      ['锤头松了，把锤柄在板凳上撞几下', 0, '锤柄停止，锤头由于惯性继续向下运动而套紧。'],
      ['投掷铅球、标枪', 0, '出手后铅球由于惯性继续向前运动。'],
      ['用盆泼水时，盆留在手里，水泼了出去', 0, '盆停下，水由于惯性继续向前运动。'],
      ['驾驶员和前排乘客必须系安全带', 1, '紧急刹车时，防止人由于惯性向前冲而受伤。'],
      ['汽车上安装安全气囊', 1, '撞车时人由于惯性向前冲，气囊起缓冲作用。'],
      ['汽车座椅上安装头枕', 1, '被追尾时，头由于惯性向后仰，头枕保护颈部。'],
      ['公路上汽车要限速行驶、保持车距', 1, '车有惯性，刹车后还要滑行一段距离。'],
      ['公交车上提示“车辆转弯，请拉好扶手”', 1, '车转弯时人由于惯性保持原来的运动方向，容易摔倒。'],
      ['货车不能超载', 1, '质量越大惯性越大，刹车时更难停下。'],
      ['地铁进站时缓慢减速停下', 1, '避免乘客由于惯性向前倾倒。'],
    ], ['利用惯性', '防止惯性带来的危害']);
  });
})();
