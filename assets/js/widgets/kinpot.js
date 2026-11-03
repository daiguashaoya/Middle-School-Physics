/* 第11章第3节：动能和势能——能量与做功、动能与限速、探究重力势能跟哪些因素有关、弹性势能、能量分类。依赖 force.js、dynamics.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, EN = PS.en, EC = PS.EC;
  const TAU = Math.PI * 2;

  /** 木纹地面 / 沙地 */
  function soil(ctx, x0, x1, y, hh, c1, c2) {
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fillRect(x0, y, x1 - x0, hh);
  }
  /** 弓：中心 (x, y)，弓弦被拉开 pull 像素（向左） */
  function bow(ctx, x, y, pull, s) {
    s = s || 1;
    const R = 110 * s;
    const top = { x: x - 30 * s - pull * 0.15, y: y - R * 0.95 }, bot = { x: x - 30 * s - pull * 0.15, y: y + R * 0.95 };
    ctx.save();
    ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.quadraticCurveTo(x + 40 * s + pull * 0.2, y, bot.x, bot.y); ctx.stroke();
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(x - 30 * s - pull, y); ctx.lineTo(bot.x, bot.y); ctx.stroke();
    ctx.restore();
    return { nx: x - 30 * s - pull, ny: y };
  }
  function arrowShaft(ctx, x, y, ang, L) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke();
    ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(L + 14, 0); ctx.lineTo(L, -6); ctx.lineTo(L, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e03131'; [-1, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(6, 7 * k); ctx.lineTo(22, 7 * k); ctx.lineTo(18, 0); ctx.closePath(); ctx.fill(); });
    ctx.restore();
  }

  /* ================= 能量：能够做功 ================= */
  PS.register('energy-work', function (el) {
    const VW = 1000, VH = 400, GY = 330;
    const SC = {
      pile: { n: '举高的重锤打桩', kind: 'g', why: '被举高的重锤落下时能把木桩打进地里，对木桩<b>做功</b>——高处的重锤具有能量，叫做<b>重力势能</b>。' },
      bow: { n: '拉弯的弓射箭', kind: 'e', why: '拉弯的弓恢复原状时能把箭射出去，对箭<b>做功</b>——发生弹性形变的弓具有能量，叫做<b>弹性势能</b>。' },
      wheel: { n: '流水冲动水车', kind: 'k', why: '流动的水冲击水车，使水车转动，把重物提起来，对外<b>做功</b>——运动的水具有能量，叫做<b>动能</b>。' },
      hammer: { n: '运动的锤子钉钉子', kind: 'k', why: '挥动的锤子能把钉子钉进木板，对钉子<b>做功</b>——运动的锤子具有<b>动能</b>。' },
    };
    const st = { s: 'pile', p: 0, run: false, pile: 0, nail: 0, lift: 0 };
    const seg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k].n })), st.s, (v) => { st.s = v; st.p = 0; st.run = false; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const goB = PS.ui.button('▶ 让它做功', () => { if (st.run) return; if (st.p >= 1) st.p = 0; st.run = true; }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(goB, PS.ui.button('重来', () => { st.p = 0; st.run = false; st.pile = 0; st.nail = 0; st.lift = 0; tell(); }, 'btn btn-ghost btn-sm')), msg);
    function tell() {
      const c = SC[st.s];
      if (st.p < 1) { msg.className = 'fc-msg info'; msg.innerHTML = '点“让它做功”。想一想：它能对别的物体做功吗？'; }
      else { msg.className = 'fc-msg ok'; msg.innerHTML = c.why + '<br><span class="small">物体<b>能够对外做功</b>，就说这个物体具有<b>能量</b>，简称<b>能</b>；能量的单位与功相同，也是<b>焦耳（J）</b>。</span>'; }
      S.render();
    }
    PS.loop((dt) => {
      if (!st.run) { if (st.s === 'wheel') S.render(); return; }
      const dur = { pile: 1.0, bow: 1.4, wheel: 4, hammer: 0.9 }[st.s];
      const was = st.p;
      st.p = Math.min(1, st.p + dt / dur);
      if (st.s === 'pile' && was < 0.6 && st.p >= 0.6) { st.pile = Math.min(4, st.pile + 1); PS.sound.clack(); }
      if (st.s === 'hammer' && was < 0.55 && st.p >= 0.55) { st.nail = Math.min(4, st.nail + 1); PS.sound.clack(); }
      if (st.s === 'wheel') st.lift = Math.min(1, st.lift + dt / 4);
      if (st.p >= 1) { st.run = false; tell(); }
      S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const p = st.p;
      if (st.s === 'pile') {
        soil(ctx, 0, VW, GY, VH - GY, '#c2a36b', '#8a6a3a');
        const top = GY - 120 + st.pile * 22;
        // 木桩
        ctx.fillStyle = '#c98d3e'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2;
        ctx.fillRect(470, top, 60, 200); ctx.strokeRect(470, top, 60, 200);
        // 架子与重锤
        ctx.fillStyle = '#868e96'; ctx.fillRect(400, 40, 10, GY - 40); ctx.fillRect(590, 40, 10, GY - 40); ctx.fillRect(400, 36, 200, 10);
        const H0 = 70, fall = p < 0.6 ? (p / 0.6) * (p / 0.6) : 1, hy = H0 + fall * (top - 60 - H0);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(500, 46); ctx.lineTo(500, hy); ctx.stroke();
        ctx.fillStyle = '#343a40'; D.roundRect(ctx, 455, hy, 90, 60, 6); ctx.fill();
        D.text(ctx, '重锤', 500, hy + 36, { size: F(15), weight: 800, align: 'center', color: '#fff' });
        if (p === 0) D.text(ctx, '被举高的重锤', 640, 100, { size: F(16), weight: 800, color: EC.g });
        D.text(ctx, '木桩已打入 ' + st.pile + ' 次', 640, GY - 30, { size: F(15), weight: 700, color: '#495057' });
      } else if (st.s === 'bow') {
        FO.ground(ctx, 0, VW, GY, { depth: 70 });
        const pull = p < 0.4 ? 90 : p < 0.45 ? 90 * (1 - (p - 0.4) / 0.05) : 0;
        const b = bow(ctx, 230, 200, pull);
        // 靶
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
        [60, 44, 28, 12].forEach((r, i) => { ctx.fillStyle = i % 2 ? '#fff' : '#e03131'; ctx.beginPath(); ctx.ellipse(880, 200, r * 0.35, r, 0, 0, TAU); ctx.fill(); ctx.stroke(); });
        ctx.fillStyle = '#8a5a1c'; ctx.fillRect(876, 260, 8, GY - 260);
        const ax = p < 0.45 ? b.nx : Math.min(860 - 110, b.nx + ((p - 0.45) / 0.3) * 700);
        arrowShaft(ctx, ax, 200, 0, 110);
        if (pull > 0) D.text(ctx, '拉弯的弓', 180, 70, { size: F(16), weight: 800, color: EC.e });
      } else if (st.s === 'wheel') {
        soil(ctx, 0, VW, GY, VH - GY, '#ced4da', '#adb5bd');
        // 水流
        ctx.fillStyle = 'rgba(28,126,214,.45)'; ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(380, 150); ctx.lineTo(380, 175); ctx.lineTo(0, 175); ctx.closePath(); ctx.fill();
        const flow = st.run || st.p >= 1 ? 1 : 0, T = performance.now() / 1000;
        if (flow) { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 12; i++) { const x = ((i * 37 + T * 160) % 380); ctx.fillRect(x, 158 + (i % 3) * 5, 14, 3); } ctx.fillStyle = 'rgba(28,126,214,.35)'; ctx.fillRect(380, 170, 24, GY - 170); }
        // 水车
        const ang = flow ? T * 1.6 : 0, cx = 470, cy = 200, R = 95;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        for (let i = 0; i < 10; i++) { ctx.save(); ctx.rotate((i * TAU) / 10); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, 0); ctx.stroke(); ctx.fillStyle = '#c98d3e'; ctx.fillRect(R - 4, -14, 26, 28); ctx.restore(); }
        ctx.restore();
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.fill();
        // 绳子提起重物
        const ly = 300 - st.lift * 150;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(760, 60); ctx.lineTo(800, 60); ctx.lineTo(800, ly); ctx.stroke();
        ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.arc(800, 60, 12, 0, TAU); ctx.fill();
        FO.box(ctx, 765, ly + 60, 70, 60);
        D.text(ctx, '重物升高了 ' + PS.fmt(st.lift * 1.5, 1) + ' m', 860, 300, { size: F(14), weight: 700, color: '#495057' });
        D.text(ctx, '流动的水', 40, 140, { size: F(16), weight: 800, color: EC.k });
      } else {
        // 锤子钉钉子
        ctx.fillStyle = '#e3bf86'; ctx.strokeStyle = '#b88a4b'; ctx.lineWidth = 2; ctx.fillRect(250, GY - 60, 500, 60); ctx.strokeRect(250, GY - 60, 500, 60);
        FO.ground(ctx, 0, VW, GY, { depth: 70 });
        const nailIn = st.nail * 12, ntop = GY - 60 - 70 + nailIn;
        ctx.fillStyle = '#868e96'; ctx.fillRect(496, ntop, 8, 70); ctx.fillRect(486, ntop - 4, 28, 6);
        const ang = p < 0.55 ? -1.3 + (p / 0.55) * 1.3 : p < 0.7 ? 0 : -((p - 0.7) / 0.3) * 1.3, px = 690, py = ntop - 30;
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(-190, -7, 190, 14);
        ctx.fillStyle = '#495057'; D.roundRect(ctx, -210, -24, 40, 48, 4); ctx.fill();
        ctx.restore();
        D.text(ctx, '钉子已钉入 ' + st.nail + ' 次', 270, GY - 80 - 70, { size: F(15), weight: 700, color: '#495057' });
        if (st.run && p < 0.55) D.text(ctx, '运动的锤子', px - 120, 90, { size: F(16), weight: 800, color: EC.k });
      }
      D.text(ctx, SC[st.s].n, 20, F(18) + 6, { size: F(18), weight: 800 });
    }
    tell();
  });

  /* ================= 动能与车速、质量：为什么要限速 ================= */
  PS.register('ke-compare', function (el) {
    const VW = 1000, GY = 180;
    const CARS = {
      car: { n: '小型客车', m: 1500, lim: 100, a: 7, c: '#3b5bdb', L: 90 },
      bus: { n: '大型客车', m: 12000, lim: 80, a: 6, c: '#f08c00', L: 160 },
      truck: { n: '载货汽车（满载）', m: 25000, lim: 80, a: 5, c: '#2f9e44', L: 180 },
    };
    const st = { car: 'car', v: 80, x: 60, run: false, brake: false, vv: 0, stop: null };
    const cSeg = PS.ui.seg(Object.keys(CARS).map((k) => ({ value: k, label: CARS[k].n })), st.car, (v) => { st.car = v; reset(); });
    el.append(PS.ui.row(cSeg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 780 : 430), draw });
    const sV = PS.ui.slider({ label: '车速 v', min: 20, max: 120, step: 10, value: st.v, unit: 'km/h', onInput: (v) => { st.v = v; reset(); } });
    sV.el.classList.add('wide');
    const goB = PS.ui.button('🛑 前方有障碍，紧急刹车', () => { reset(); st.run = true; st.vv = st.v / 3.6; }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sV.el), PS.ui.row(goB), msg);
    const C = () => CARS[st.car];
    const Ek = (m, kmh) => 0.5 * m * (kmh / 3.6) * (kmh / 3.6);
    const dist = () => (st.v / 3.6) ** 2 / (2 * C().a);
    function reset() { st.x = 0; st.run = false; st.vv = 0; st.stop = null; tell(); }
    function tell() {
      const c = C(), E = Ek(c.m, st.v);
      let t = c.n + '（' + PS.fmt(c.m / 1000, 1) + ' t）以 ' + st.v + ' km/h 行驶，动能约 <b class="en-k">' + PS.fmt(E / 1e3, 0) + ' kJ</b>。';
      if (st.v > c.lim) t += ' <b style="color:#e03131">已超过限速 ' + c.lim + ' km/h！</b>';
      if (st.stop != null) t += '<br>刹车距离约 <b>' + PS.fmt(st.stop, 0) + ' m</b>（不算反应时间）。速度越大，动能越大，刹车距离越长，撞上障碍物时破坏也越大。';
      else t += '<br>同样的速度下，质量越大，动能越大，危险越大——所以大型客车、货车的最高限速比小型客车低。';
      msg.className = 'fc-msg ' + (st.v > c.lim ? 'bad' : 'info'); msg.innerHTML = t;
      S.render();
    }
    PS.loop((dt) => {
      if (!st.run) return;
      const k = 1.6, sc = 4; // 时间放慢、1 m = 4 px
      for (let i = 0; i < 4; i++) { const h1 = (dt * k) / 4; st.vv = Math.max(0, st.vv - C().a * h1); st.x += st.vv * h1; }
      if (st.vv <= 0) { st.run = false; st.stop = st.x; PS.sound.clack(); tell(); }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 公路
      ctx.fillStyle = '#495057'; ctx.fillRect(0, GY - 70, VW, 90);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([30, 24]); ctx.beginPath(); ctx.moveTo(0, GY - 25); ctx.lineTo(VW, GY - 25); ctx.stroke(); ctx.setLineDash([]);
      // 刻度（米）
      const X0 = 200, PXM = 6.9;
      for (let m = 0; m <= 110; m += 10) { const x = X0 + m * PXM; ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, GY + 20); ctx.lineTo(x, GY + 30); ctx.stroke(); if (m % 20 === 0) D.text(ctx, m + ' m', x, GY + 30 + F(12), { size: F(12), align: 'center', color: '#868e96' }); }
      // 车
      const c = C(), x = X0 + st.x * PXM;
      ctx.fillStyle = c.c; D.roundRect(ctx, x - c.L, GY - 60, c.L, 34, 6); ctx.fill();
      D.roundRect(ctx, x - (c.L > 100 ? c.L : 60), GY - 82, c.L > 100 ? c.L - 6 : 46, 26, 6); ctx.fill();
      ctx.fillStyle = '#d0ebff'; ctx.fillRect(x - (c.L > 100 ? 30 : 56), GY - 78, 22, 16);
      ctx.fillStyle = '#212529'; [x - c.L + 22, x - 22].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, GY - 24, 13, 0, TAU); ctx.fill(); });
      if (st.stop != null) { D.dim(ctx, X0, x, GY + 52 + F(12), PS.fmt(st.stop, 0) + ' m', { color: '#e03131', size: F(13) }); }
      // 限速牌
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e03131'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(930, 52, 36, 0, TAU); ctx.fill(); ctx.stroke();
      D.text(ctx, String(c.lim), 930, 54, { size: F(24, 16), weight: 800, align: 'center', baseline: 'middle' });
      ctx.fillStyle = '#868e96'; ctx.fillRect(927, 88, 6, 22);
      // 三种车的动能（以各自的限速行驶）
      const items = Object.keys(CARS).map((k) => ({ n: CARS[k].n.replace('（满载）', '') + '\n' + CARS[k].lim + ' km/h', v: Ek(CARS[k].m, CARS[k].lim) / 1e3, c: CARS[k].c }));
      EN.bars(ctx, nar ? 20 : 560, nar ? 370 : 262, nar ? 960 : 400, nar ? 395 : 158, items.concat([{ n: '当前\n' + st.v + ' km/h', v: Ek(c.m, st.v) / 1e3, c: '#e03131' }]), { F, max: 7000, lines: 2, fmt: (v) => PS.fmt(v, 0) });
      D.text(ctx, '以限速行驶时的动能 / kJ', 20, nar ? 290 : 300, { size: F(14), weight: 800, color: '#343a40' });
      D.text(ctx, 'Ek = ½mv²（拓展：高中学习）', 20, (nar ? 290 : 300) + F(14) * 1.6, { size: F(12), color: '#868e96' });
    }
    tell();
  });

  /* ================= 探究重力势能跟哪些因素有关（小桌陷沙） ================= */
  PS.register('gpe-lab', function (el, opts) {
    const VW = 1000, VH = 460, SY = 390, PXM = 600, FR = 40, KD = 6; // 沙面 y；1 m = 600 px（高度）；沙的阻力 40 N；下陷深度放大 6 倍画
    const MASS = [100, 200, 400];
    const st = { m: 200, hcm: 30, y: 0, v: 0, phase: 'hold', d: 0, rows: [] };
    const mSeg = PS.ui.seg(MASS.map((m) => ({ value: m, label: '重物 ' + m + ' g' })), st.m, (v) => { st.m = v; flat(); });
    el.append(PS.ui.row(mSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sH = PS.ui.slider({ label: '释放高度 h（离桌面）', min: 10, max: 50, step: 10, value: st.hcm, unit: 'cm', onInput: (v) => { st.hcm = v; flat(); } });
    sH.el.classList.add('wide');
    const goB = PS.ui.button('▶ 由静止释放', drop, 'btn btn-primary btn-sm');
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sH.el), PS.ui.row(goB, PS.ui.button('抹平沙子', flat, 'btn btn-ghost btn-sm'), recB), msg);
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    el.append(h('div', { class: 'grid-2', style: { marginTop: '8px', alignItems: 'start' } },
      h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['次数', '重物质量 m/g', '下落高度 h/cm', '桌腿陷入深度 d/mm'].map((t) => h('th', null, t)))), tbody)),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '分析论证' : '你发现了什么？'), ana)));
    const depth = () => (st.m / 1000) * 10 * (st.hcm / 100) / FR; // 米
    function flat() { st.phase = 'hold'; st.y = 0; st.v = 0; st.d = 0; tell(); }
    function drop() { if (st.phase !== 'hold') flat(); st.phase = 'fall'; st.y = 0; st.v = 0; tell(); }
    function tell() {
      recB.disabled = st.phase !== 'done';
      let t;
      if (st.phase === 'hold') t = '把重物举到桌面上方 h 处，由静止释放，它撞击沙子上的小桌，<b>桌腿陷入沙中越深，说明重物的重力势能越大</b>（转换法）。';
      else if (st.phase !== 'done') t = '重物下落……';
      else t = '桌腿陷入沙中 <b>' + PS.fmt(st.d * 1000, 1) + ' mm</b>。点“记录”，再改变重物的质量或高度（每次只改变一个），抹平沙子后再做。';
      msg.className = 'fc-msg ' + (st.phase === 'done' ? 'ok' : 'info'); msg.innerHTML = t;
      S.render();
    }
    function record() {
      if (st.phase !== 'done') return;
      if (st.rows.some((r) => r.m === st.m && r.h === st.hcm)) { msg.className = 'fc-msg bad'; msg.innerHTML = '这组数据已经记录过了。'; PS.sound.bad(); return; }
      st.rows.push({ m: st.m, h: st.hcm, d: PS.round(st.d * 1000, 1) });
      if (st.rows.length > 9) st.rows.shift();
      PS.sound.good(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, String(i + 1)), h('td', null, String(r.m)), h('td', null, String(r.h)), h('td', null, h('b', null, PS.fmt(r.d, 1))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      const R = st.rows;
      const sameM = R.some((a) => R.some((b) => a.m === b.m && a.h !== b.h));
      const sameH = R.some((a) => R.some((b) => a.h === b.h && a.m !== b.m));
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      let s = line(sameM, '质量相同时，物体被举得<b>越高</b>，重力势能<b>越大</b>（比较质量相同、高度不同的两次）。') + line(sameH, '高度相同时，物体的<b>质量越大</b>，重力势能<b>越大</b>（比较高度相同、质量不同的两次）。');
      if (sameM && sameH) s += '<div class="tip tip-good" style="margin:8px 0 0">物体的重力势能跟<b>质量</b>和<b>被举高的高度</b>有关。</div>';
      ana.innerHTML = s;
    }
    PS.loop((dt) => {
      if (st.phase !== 'fall' && st.phase !== 'sink') return;
      const k = 0.5;
      if (st.phase === 'fall') {
        st.v += 10 * dt * k; st.y += st.v * dt * k;
        if (st.y >= st.hcm / 100) { st.y = st.hcm / 100; st.phase = 'sink'; PS.sound.clack(); }
      } else {
        st.d = Math.min(depth(), st.d + dt * 0.04);
        if (st.d >= depth() - 1e-9) { st.d = depth(); st.phase = 'done'; tell(); }
      }
      S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 沙箱
      const BX = 220, BW = 360;
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(BX - 10, SY - 10, BW + 20, VH - SY + 10);
      soil(ctx, BX, BX + BW, SY, VH - SY, '#f3d9a4', '#d9b26a');
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.strokeRect(BX - 10, SY - 10, BW + 20, VH - SY + 20);
      // 小桌（陷入 d）
      const dp = st.d * 1000 * KD / 10 * 1.0, ty = SY - 70 + dp, cx = BX + BW / 2;
      ctx.fillStyle = '#c98d3e'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2;
      ctx.fillRect(cx - 90, ty, 180, 14); ctx.strokeRect(cx - 90, ty, 180, 14);
      [cx - 78, cx + 66].forEach((x) => { ctx.fillRect(x, ty + 14, 12, 56); ctx.strokeRect(x, ty + 14, 12, 56); });
      // 重物
      const top = ty, wy = top - (st.phase === 'hold' ? st.hcm / 100 : st.phase === 'fall' ? st.hcm / 100 - st.y : 0) * PXM;
      const wh = 18 + st.m / 400 * 30, ww = 46 + st.m / 400 * 22;
      ctx.fillStyle = '#495057'; D.roundRect(ctx, cx - ww / 2, wy - wh, ww, wh, 5); ctx.fill();
      D.text(ctx, st.m + ' g', cx, wy - wh / 2 + 5, { size: F(13), weight: 800, align: 'center', color: '#fff' });
      if (st.phase === 'hold') {
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, wy - wh); ctx.lineTo(cx, 20); ctx.stroke();
        D.arrow(ctx, cx + 120, (wy + top) / 2, cx + 120, wy, { color: EC.g, width: 2, head: 8 }); D.arrow(ctx, cx + 120, (wy + top) / 2, cx + 120, top, { color: EC.g, width: 2, head: 8 });
        D.text(ctx, 'h = ' + st.hcm + ' cm', cx + 130, (wy + top) / 2 + 5, { size: F(15), weight: 800, color: EC.g });
      }
      // 放大的读数
      const ZX = 700;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, ZX, 150, 260, 230, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, '桌腿处放大', ZX + 130, 150 + F(14) + 6, { size: F(14), weight: 800, align: 'center', color: '#343a40' });
      D.text(ctx, 'd = ' + PS.fmt(st.d * 1000, 1) + ' mm', ZX + 130, 150 + F(14) + 12 + F(15) * 1.25, { size: F(15), weight: 800, align: 'center', color: '#e03131' });
      soil(ctx, ZX + 20, ZX + 240, 290, 80, '#f3d9a4', '#d9b26a');
      const legB = 290 + st.d * 1000 * 1.6;
      ctx.fillStyle = '#c98d3e'; ctx.strokeStyle = '#8a5a1c'; ctx.fillRect(ZX + 70, 240, 26, legB - 240); ctx.strokeRect(ZX + 70, 240, 26, legB - 240);
      // 刻度尺（mm）
      ctx.fillStyle = '#fff3bf'; ctx.fillRect(ZX + 120, 280, 30, 90); ctx.strokeStyle = '#495057'; ctx.lineWidth = 1; ctx.strokeRect(ZX + 120, 280, 30, 90);
      for (let mm = 0; mm <= 50; mm++) { const y = 290 + mm * 1.6; if (y > 368) break; ctx.beginPath(); ctx.moveTo(ZX + 120, y); ctx.lineTo(ZX + 120 + (mm % 10 ? (mm % 5 ? 5 : 8) : 12), y); ctx.stroke(); if (mm % 10 === 0) D.text(ctx, String(mm), ZX + 136, y + 4, { size: 9, color: '#495057' }); }
      if (st.d > 0) { ctx.strokeStyle = '#e03131'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ZX + 96, legB); ctx.lineTo(ZX + 150, legB); ctx.stroke(); ctx.setLineDash([]); }
    }
    tell(); table();
  });

  /* ================= 弹性势能：弓与弹簧 ================= */
  PS.register('elastic-pe', function (el) {
    const VW = 1000, VH = 420, GY = 380;
    const st = { mode: 'bow', x: 2, p: 0, run: false, marks: [] };
    const mSeg = PS.ui.seg([{ value: 'bow', label: '🏹 拉弓射箭' }, { value: 'spring', label: '弹簧弹小球' }], st.mode, (v) => { st.mode = v; st.marks = []; reset(); });
    el.append(PS.ui.row(mSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sX = PS.ui.slider({ label: '形变程度', min: 1, max: 4, step: 1, value: st.x, fmt: (v) => ['', '小', '较小', '较大', '大'][v], onInput: (v) => { st.x = v; reset(); } });
    sX.el.classList.add('wide');
    const goB = PS.ui.button('▶ 松手', () => { if (st.run) return; reset(); st.run = true; }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sX.el), PS.ui.row(goB, PS.ui.button('清除记号', () => { st.marks = []; S.render(); }, 'btn btn-ghost btn-sm')), msg);
    function reset() { st.p = 0; st.run = false; tell(); }
    const reach = () => st.x * st.x; // 射程 / 高度与形变量的平方成正比（示意）
    function tell() {
      let t;
      if (st.mode === 'bow') t = st.p >= 1 ? '形变越大，弓的<b>弹性势能越大</b>，对箭做的功越多，箭射得越远。' : '弓被拉弯，发生了<b>弹性形变</b>，具有弹性势能。改变拉弓的程度，松手看看箭射多远。';
      else t = st.p >= 1 ? '弹簧被压缩得越多，<b>弹性势能越大</b>，能把小球弹得越高。' : '压缩弹簧，弹簧发生弹性形变，具有弹性势能。改变压缩的程度，松手看看小球被弹起多高。';
      msg.className = 'fc-msg ' + (st.p >= 1 ? 'ok' : 'info'); msg.innerHTML = t + '<br><span class="small">物体由于发生<b>弹性形变</b>而具有的能，叫做<b>弹性势能</b>。物体的弹性形变越大，弹性势能就越大。</span>';
      S.render();
    }
    PS.loop((dt) => {
      if (!st.run) return;
      st.p = Math.min(1, st.p + dt / 1.6);
      if (st.p >= 1) { st.run = false; st.marks.push(st.x); PS.sound.tick(); tell(); }
      S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      FO.ground(ctx, 0, VW, GY, { depth: 40 });
      const p = st.p, E = st.x * st.x;
      if (st.mode === 'bow') {
        const pull = p < 0.05 ? st.x * 22 : 0;
        const b = bow(ctx, 160, 250, pull, 0.8);
        // 箭的轨迹：射程 ∝ x²
        const R = 120 + reach() * 46, x0 = b.nx + 8, y0 = 250;
        const tt = p < 0.05 ? 0 : (p - 0.05) / 0.95, ax = x0 + tt * R, ay = y0 - 4 * 70 * tt * (1 - tt) * (st.x / 4) + tt * (GY - y0 - 6);
        const vy = -4 * 70 * (1 - 2 * tt) * (st.x / 4) + (GY - y0 - 6), ang = Math.atan2(vy, R);
        arrowShaft(ctx, ax - Math.cos(ang) * 90, ay - Math.sin(ang) * 90, ang, 90);
        st.marks.forEach((m) => { const mx = x0 + 120 + m * m * 46; ctx.fillStyle = '#e03131'; ctx.fillRect(mx - 2, GY - 12, 4, 12); D.text(ctx, ['', '小', '较小', '较大', '大'][m], mx, GY + 20, { size: F(12), weight: 700, align: 'center', color: '#e03131' }); });
      } else {
        // 竖直的弹簧把小球向上弹起
        const cx = 300, base = GY, L0 = 120, comp = st.x * 18;
        const launch = p > 0.08, tt = launch ? (p - 0.08) / 0.92 : 0;
        const L = launch ? L0 : L0 - comp;
        FO.spring(ctx, cx, base, cx, base - L, { n: 9, r: 22 });
        ctx.fillStyle = '#495057'; ctx.fillRect(cx - 34, base - L - 6, 68, 8);
        const Hm = reach() * 17, yy = base - L - 24 - (launch ? Hm * (1 - (1 - 2 * tt) * (1 - 2 * tt)) : 0); // 竖直上抛：先上升到最高点再落回
        EN.ball(ctx, cx, yy, 18, '#ffc9c9', '#c92a2a');
        if (!launch && p === 0) { ctx.fillStyle = '#ffd8a8'; D.roundRect(ctx, cx - 30, yy - 40, 60, 18, 8); ctx.fill(); D.text(ctx, '手按住', cx + 44, yy - 28, { size: F(13), weight: 700, color: '#495057' }); }
        // 高度刻度
        ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1;
        for (let k = 0; k <= 6; k++) { const y = base - L0 - 24 - k * 50; ctx.beginPath(); ctx.moveTo(cx + 60, y); ctx.lineTo(cx + 80, y); ctx.stroke(); }
        st.marks.forEach((m) => { const y = base - L0 - 24 - m * m * 17; ctx.fillStyle = '#e03131'; ctx.fillRect(cx + 56, y - 1.5, 30, 3); D.text(ctx, ['', '小', '较小', '较大', '大'][m], cx + 92, y + 5, { size: F(12), weight: 700, color: '#e03131' }); });
      }
      // 弹性势能柱
      EN.bars(ctx, 760, 70, 200, 280, [{ n: '弹性\n势能', v: p < 0.05 ? E : 0, c: EC.e }, { n: st.mode === 'bow' ? '箭的\n动能' : '小球\n的能', v: p < 0.05 ? 0 : E, c: EC.k }], { F, max: 16, values: false, title: '能量（示意）', lines: 2 });
    }
    tell();
  });

  /* ================= 分一分：具有哪种能 ================= */
  PS.register('energy-sort', function (el) {
    PS.sortCards(el, [
      ['在水平公路上行驶的汽车', 0, '运动，但没有被举高（以地面为参照）。'],
      ['在水平冰面上滑行的冰壶', 0, '只有动能。'],
      ['在水平轨道上飞驰的高铁', 0, '只有动能。'],
      ['被举高后静止的杠铃', 1, '被举高，静止，只有重力势能。'],
      ['悬挂在天花板上的吊灯', 1, '处在一定高度，静止。'],
      ['拦河坝内被拦住的水（静止）', 1, '水位高，具有重力势能。'],
      ['停在树枝上的小鸟', 1, '静止，处在一定高度。'],
      ['拉弯的弓', 2, '发生了弹性形变。'],
      ['被压缩的弹簧', 2, '发生了弹性形变。'],
      ['上紧的钟表发条', 2, '发生了弹性形变。'],
      ['拉长的橡皮筋', 2, '发生了弹性形变。'],
      ['在空中飞行的飞机', 3, '既在运动，又处在一定高度。'],
      ['正在下落的雨滴', 3, '既在运动，又处在一定高度。'],
      ['越过横杆时的跳高运动员', 3, '仍在运动，又处在高处。'],
      ['正在爬坡的汽车', 3, '在运动，又有一定的高度。'],
    ], ['只有动能', '只有重力势能', '只有弹性势能', '动能和重力势能']);
  });
})();
