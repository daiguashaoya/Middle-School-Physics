/* 第8章第2节：二力平衡——平衡状态分类、拖动两个力找平衡条件、力和运动的关系、跳伞运动员、平衡力还是相互作用力。依赖 force.js、dynamics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, DY = PS.dyn;
  const TAU = Math.PI * 2;

  /* ================= 平衡状态还是非平衡状态 ================= */
  PS.register('balance-state', function (el) {
    PS.sortCards(el, [
      ['静止在桌面上的书', 0, '静止，是平衡状态。'],
      ['在平直公路上匀速直线行驶的汽车', 0, '匀速直线运动，是平衡状态。'],
      ['匀速直线下降的跳伞运动员', 0, '匀速直线运动，是平衡状态。'],
      ['匀速直线上升的电梯', 0, '匀速直线运动，是平衡状态。'],
      ['挂在天花板下静止的电灯', 0, '静止，是平衡状态。'],
      ['随传送带一起匀速直线运动的箱子', 0, '匀速直线运动，是平衡状态。'],
      ['匀速转弯的汽车', 1, '速度大小不变，但运动方向在变，运动状态改变了。'],
      ['刚刚启动的公交车', 1, '速度变大，运动状态改变。'],
      ['正在进站减速的火车', 1, '速度变小，运动状态改变。'],
      ['竖直上抛到最高点的小球', 1, '最高点只是瞬间速度为零，它只受重力，马上又要下落，不是平衡状态。'],
      ['荡秋千荡到最高点的人', 1, '瞬间速度为零，但受力不平衡，接着就会往回荡。'],
      ['绕地球匀速转动的人造卫星', 1, '运动方向时刻在变，不是平衡状态。'],
      ['从树上落下的苹果', 1, '速度越来越大，不是平衡状态。'],
    ], ['平衡状态', '非平衡状态']);
  });

  /* ================= 拖动两个力：二力平衡的条件 ================= */
  PS.register('balance-cond', function (el) {
    const VW = 1000, VH = 440, CW = 240, CH = 140, PX = 26; // 每牛顿 26 px
    const st = { cut: false, f: [], sim: false, t: 0, bodies: null, hint: '' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const presets = h('div', { class: 'fc-chips' });
    const cutT = PS.ui.toggle('把卡片从中间剪开', false, (v) => { st.cut = v; stopSim(); tell(); });
    const goB = PS.ui.button('✋ 松手', release, 'btn btn-primary btn-sm');
    const chk = h('div', { class: 'dy-check' });
    const msg = h('div', { class: 'fc-msg' });
    el.append(presets, PS.ui.row(goB, cutT.el, PS.ui.button('↺ 复位', () => { stopSim(); tell(); }, 'btn btn-ghost btn-sm')), chk, msg);
    const P0 = () => [{ px: 120, py: 0, fx: 3, fy: 0 }, { px: -120, py: 0, fx: -3, fy: 0 }];
    const PRE = [
      ['✔ 大小相等、方向相反、在同一直线', () => P0()],
      ['大小不等', () => { const f = P0(); f[0].fx = 4; f[1].fx = -2; return f; }],
      ['方向不相反（成一角度）', () => { const f = P0(); f[0].fx = 3 * Math.cos(-0.6); f[0].fy = 3 * Math.sin(-0.6); return f; }],
      ['不在同一直线上', () => { const f = P0(); f[0].py = -55; f[1].py = 55; return f; }],
    ];
    PRE.forEach(([t, fn]) => presets.append(PS.ui.button(t, () => { st.f = fn(); if (st.cut) { st.cut = false; cutT.set(false); } stopSim(); tell(); }, 'btn btn-sm')));
    st.f = P0();
    const C = { x: 500, y: 225 };
    const mag = (f) => Math.hypot(f.fx, f.fy);
    function judge() {
      const [a, b] = st.f;
      const same = !st.cut || Math.sign(a.px || 1) === Math.sign(b.px || 1);
      const eq = Math.abs(mag(a) - mag(b)) < 0.12;
      const ang = Math.acos(PS.clamp((a.fx * b.fx + a.fy * b.fy) / (mag(a) * mag(b) || 1), -1, 1));
      const opp = ang > Math.PI - 0.05;
      // 共线：B 的作用点到 A 的作用线的距离
      const ux = a.fx / (mag(a) || 1), uy = a.fy / (mag(a) || 1);
      const dist = Math.abs((b.px - a.px) * uy - (b.py - a.py) * ux);
      const line = opp && dist < 6;
      return { same, eq, opp, line, ok: same && eq && opp && line };
    }
    function tell() {
      const J = judge();
      const it = (ok, t) => '<span class="' + (ok ? 'y' : 'n') + '">' + (ok ? '✔' : '✘') + ' ' + t + '</span>';
      chk.innerHTML = it(J.same, '作用在同一物体上') + it(J.eq, '大小相等') + it(J.opp, '方向相反') + it(J.line, '作用在同一直线上');
      if (!st.sim) { msg.className = 'fc-msg'; msg.innerHTML = '拖动箭头的<b>末端</b>可以改变力的大小和方向，拖动<b>作用点</b>（圆点）可以改变力的位置。设置好后点“松手”，看卡片能否保持静止。（卡片很轻，不计重力）'; }
      S.render();
    }
    function stopSim() { st.sim = false; st.bodies = null; S.render(); }
    function release() {
      // 刚体：不剪开时是一整张卡片；剪开后左右两半各受一个力
      const mk = (cx, w, idx) => ({ x: C.x + cx, y: C.y, th: 0, vx: 0, vy: 0, w: 0, hw: w / 2, ox: cx, idx });
      if (!st.cut) st.bodies = [mk(0, CW, [0, 1])];
      else {
        const L = [], R = [];
        st.f.forEach((f, i) => (f.px < 0 ? L : R).push(i));
        st.bodies = [mk(-CW / 4, CW / 2, L), mk(CW / 4, CW / 2, R)];
      }
      st.sim = true; st.t = 0; PS.sound.tick();
      const J = judge();
      msg.className = 'fc-msg ' + (J.ok ? 'ok' : 'bad');
      msg.innerHTML = J.ok ? '卡片<b>保持静止</b>——这两个力<b>彼此平衡</b>。' : !J.same ? '卡片被剪成两半后，两个力分别作用在<b>两个物体</b>上，两半各自被拉走——<b>不同体</b>的两个力不能平衡。' : !J.eq ? '两个力大小不等，卡片向<b>较大的力</b>那一边运动——不能平衡。' : !J.opp ? '两个力的方向不相反，卡片沿两力“合起来”的方向运动——不能平衡。' : '两个力大小相等、方向相反，但<b>不在同一直线上</b>，卡片会<b>转动</b>，直到两个力转到同一直线上才停下。';
    }
    // 拖动：作用点 / 箭头末端
    const world = (b, f) => { // 力的作用点在世界坐标中的位置
      if (!b) return { x: C.x + f.px, y: C.y + f.py };
      const rx = f.px - b.ox, ry = f.py, c = Math.cos(b.th), s = Math.sin(b.th);
      return { x: b.x + rx * c - ry * s, y: b.y + rx * s + ry * c };
    };
    PS.drag(S, { VW, VH,
      hit: (p) => {
        if (st.sim) return null;
        for (let i = 0; i < 2; i++) { const f = st.f[i], a = world(null, f); if (Math.hypot(p.x - (a.x + f.fx * PX), p.y - (a.y + f.fy * PX)) < 22) return { i, k: 'tip' }; }
        for (let i = 0; i < 2; i++) { const a = world(null, st.f[i]); if (Math.hypot(p.x - a.x, p.y - a.y) < 18) return { i, k: 'pt' }; }
        return null;
      },
      move: (o, p) => {
        const f = st.f[o.i];
        if (o.k === 'pt') { f.px = PS.clamp(Math.round((p.x - C.x) / 5) * 5, -CW / 2, CW / 2); f.py = PS.clamp(Math.round((p.y - C.y) / 5) * 5, -CH / 2, CH / 2); }
        else {
          const a = world(null, f), dx = p.x - a.x, dy = p.y - a.y;
          let m = PS.clamp(Math.round((Math.hypot(dx, dy) / PX) * 2) / 2, 0.5, 6);
          let ang = Math.atan2(dy, dx); ang = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
          f.fx = m * Math.cos(ang); f.fy = m * Math.sin(ang);
          if (Math.abs(f.fx) < 1e-9) f.fx = 0; if (Math.abs(f.fy) < 1e-9) f.fy = 0;
        }
        tell();
      } });
    const loop = PS.loop((dt) => {
      if (!st.sim || st.t > 4) return;
      st.t += dt;
      const K = 160, n = 6;
      for (let k = 0; k < n; k++) {
        const d = dt / n;
        st.bodies.forEach((b) => {
          let Fx = 0, Fy = 0, tq = 0;
          b.idx.forEach((i) => { const f = st.f[i], a = world(b, f); Fx += f.fx; Fy += f.fy; tq += (a.x - b.x) * f.fy - (a.y - b.y) * f.fx; });
          // 相对质量 m（整张卡片为 1），单位质量的转动惯量 Im；运动受到与速度成正比的阻尼（示意）
          const m = b.hw / (CW / 2), Im = (4 * b.hw * b.hw + CH * CH) / 12;
          b.vx += ((Fx * K) / m - 1.2 * b.vx) * d; b.vy += ((Fy * K) / m - 1.2 * b.vy) * d;
          b.w += ((tq * K) / (m * Im) - 3.2 * b.w) * d;
          b.x += b.vx * d; b.y += b.vy * d; b.th += b.w * d;
          // 碰到画面边缘就停下
          if (b.x < 70 || b.x > VW - 70) { b.x = PS.clamp(b.x, 70, VW - 70); b.vx = 0; }
          if (b.y < 80 || b.y > VH - 80) { b.y = PS.clamp(b.y, 80, VH - 80); b.vy = 0; }
        });
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
      for (let x = 0; x < VW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
      for (let y = 5; y < VH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
      const bodies = st.sim && st.bodies ? st.bodies : st.cut ? [{ x: C.x - CW / 4 - 3, y: C.y, th: 0, hw: CW / 4, ox: -CW / 4 }, { x: C.x + CW / 4 + 3, y: C.y, th: 0, hw: CW / 4, ox: CW / 4 }] : [{ x: C.x, y: C.y, th: 0, hw: CW / 2, ox: 0 }];
      bodies.forEach((b) => {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.th);
        ctx.fillStyle = '#fff4e6'; ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2;
        ctx.fillRect(-b.hw, -CH / 2, b.hw * 2, CH); ctx.strokeRect(-b.hw, -CH / 2, b.hw * 2, CH);
        ctx.restore();
      });
      if (st.cut && !st.sim) { ctx.strokeStyle = '#e03131'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(C.x, C.y - CH / 2 - 16); ctx.lineTo(C.x, C.y + CH / 2 + 16); ctx.stroke(); ctx.setLineDash([]); D.text(ctx, '✂ 剪开', C.x, C.y - CH / 2 - 22, { size: F(13), weight: 700, color: '#e03131', align: 'center' }); }
      if (!st.sim) D.text(ctx, '轻质卡片', C.x, C.y + 6, { size: F(14), weight: 700, color: '#d9480f', align: 'center' });
      // 力
      st.f.forEach((f, i) => {
        let b = null;
        if (st.sim && st.bodies) b = st.bodies.find((bb) => bb.idx.includes(i));
        else if (st.cut) b = bodies[f.px < 0 ? 0 : 1];
        const a = world(b, f), m = mag(f);
        const col = i ? '#1c7ed6' : '#e8590c';
        // 作用线（虚线）
        if (!st.sim) { ctx.strokeStyle = i ? 'rgba(28,126,214,.25)' : 'rgba(232,89,12,.25)'; ctx.setLineDash([4, 6]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a.x - (f.fx / m) * 600, a.y - (f.fy / m) * 600); ctx.lineTo(a.x + (f.fx / m) * 600, a.y + (f.fy / m) * 600); ctx.stroke(); ctx.setLineDash([]); }
        FO.arrow(ctx, a.x, a.y, Math.atan2(f.fy, f.fx), m * PX, { color: col, label: 'F' + (i ? '₂' : '₁') + ' = ' + PS.fmt(m, 1) + ' N', F, labelSide: i ? 1 : -1 });
        if (!st.sim) { const tx = a.x + f.fx * PX, ty = a.y + f.fy * PX; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(tx, ty, 13, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      });
      if (st.sim) D.text(ctx, '松手后……', 20, 30, { size: F(15), weight: 800, color: '#3b5bdb' });
    }
    tell();
    loop.start();
  });

  /* ================= 力和运动的关系 ================= */
  PS.register('force-motion', function (el) {
    const VW = 1000, VH = 430, M = 5, PPM = 36;
    const st = { v0: 0, F1: 2, F2: 2, t: -1, x: 0, v: 0, pts: [], dots: [], tt: 0 };
    const vSeg = PS.ui.seg([{ value: 0, label: '原来静止' }, { value: 2, label: '原来向右运动（2 m/s）' }, { value: -2, label: '原来向左运动（2 m/s）' }], st.v0, (v) => { st.v0 = v; reset(); });
    vSeg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(vSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const s1 = PS.ui.slider({ label: '向右的力 F₁', min: 0, max: 5, step: 1, value: st.F1, unit: 'N', onInput: (v) => { st.F1 = v; reset(); } });
    const s2 = PS.ui.slider({ label: '向左的力 F₂', min: 0, max: 5, step: 1, value: st.F2, unit: 'N', onInput: (v) => { st.F2 = v; reset(); } });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(s1.el, s2.el), PS.ui.row(PS.ui.button('▶ 开始（4 s）', () => { reset(); st.t = 0; PS.sound.tick(); }, 'btn btn-primary btn-sm'), PS.ui.button('↺ 复位', reset, 'btn btn-ghost btn-sm')), msg,
      h('div', { class: 'table-wrap', style: { marginTop: '8px' } }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '受力情况'), h('th', { class: 'l' }, '运动状态'))), h('tbody', { html: '<tr><td>不受力</td><td class="l" rowspan="2">运动状态<b>不变</b>：原来静止的保持静止，原来运动的做匀速直线运动</td></tr><tr><td>受平衡力</td></tr><tr><td>受非平衡力</td><td class="l">运动状态<b>改变</b>：速度大小改变，或运动方向改变</td></tr>' }))));
    function reset() {
      st.t = -1; st.x = 0; st.v = st.v0; st.pts = [[0, st.v0]]; st.dots = []; st.tt = 0;
      msg.className = 'fc-msg'; msg.innerHTML = '光滑冰面上有一个 5 kg 的冰壶（不计摩擦和空气阻力）。设置两个水平方向的力，点“开始”，观察它的运动状态。';
      S.render();
    }
    function done() {
      const a = (st.F1 - st.F2) / M;
      let s;
      if (st.F1 === st.F2) s = (st.F1 ? '两个力大小相等、方向相反、在同一直线上——冰壶受<b>平衡力</b>，' : '冰壶在水平方向<b>不受力</b>，') + (st.v0 ? '原来运动，现在仍以 2 m/s 做<b>匀速直线运动</b>（v–t 图像是水平线）。' : '原来静止，现在仍<b>保持静止</b>。');
      else {
        s = '两个力大小不等——冰壶受<b>非平衡力</b>，运动状态<b>改变</b>：';
        if (!st.v0) s += '由静止开始向' + (a > 0 ? '右' : '左') + '加速。';
        else if (Math.sign(a) === Math.sign(st.v0)) s += '速度越来越大。';
        else s += '速度先变小，' + (Math.abs(st.v0 / a) < 4 ? '减到零后又反向加速。' : '一直在减小。');
      }
      msg.className = 'fc-msg ' + (st.F1 === st.F2 ? 'ok' : 'info'); msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      if (st.t >= 0 && st.t < 4) {
        const a = (st.F1 - st.F2) / M;
        st.t = Math.min(4, st.t + dt); st.v += a * dt; st.x += st.v * dt;
        st.pts.push([st.t, st.v]);
        st.tt += dt; if (st.tt >= 0.5) { st.tt -= 0.5; st.dots.push(st.x); }
        if (st.t >= 4) done();
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 冰面（冰壶固定在画面中间，冰面上的刻度随之移动）
      const gy = 170, cx = 500;
      ctx.fillStyle = '#e3fafc'; ctx.fillRect(0, gy, VW, 30);
      ctx.strokeStyle = '#99e9f2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(VW, gy); ctx.stroke();
      for (let m = Math.floor(st.x - 15); m <= st.x + 15; m++) { const x = cx + (m - st.x) * PPM; ctx.fillStyle = '#66d9e8'; ctx.fillRect(x - 1, gy + 2, 2, m % 5 === 0 ? 16 : 8); if (m % 5 === 0) D.text(ctx, m + ' m', x, gy + 30, { size: F(11), align: 'center', color: '#0c8599' }); }
      // 频闪点
      DY.strobe(ctx, st.dots.map((x) => [cx + (x - st.x) * PPM, gy - 22]), { color: '#7048e8', r: 6 });
      // 冰壶
      ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.ellipse(cx, gy - 18, 34, 16, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.ellipse(cx, gy - 24, 32, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e03131'; ctx.fillRect(cx - 6, gy - 44, 12, 18);
      if (st.F1) FO.arrow(ctx, cx + 34, gy - 22, 0, 22 * st.F1, { color: '#e8590c', label: 'F₁ = ' + st.F1 + ' N', F, labelSide: -1 });
      if (st.F2) FO.arrow(ctx, cx - 34, gy - 22, Math.PI, 22 * st.F2, { color: '#1c7ed6', label: 'F₂ = ' + st.F2 + ' N', F, labelSide: 1 });
      D.text(ctx, 'v = ' + PS.fmt(st.v, 1) + ' m/s' + (Math.abs(st.v) > 0.05 ? (st.v > 0 ? ' →' : ' ←') : ''), 20, 32, { size: F(16), weight: 800, color: '#2b8a3e' });
      D.text(ctx, 't = ' + PS.fmt(Math.max(st.t, 0), 1) + ' s', 20, 32 + F(16) * 1.3, { size: F(13), color: '#495057' });
      D.text(ctx, st.F1 === st.F2 ? (st.F1 ? '受平衡力' : '不受力（水平方向）') : '受非平衡力', VW - 20, 32, { size: F(16), weight: 800, color: st.F1 === st.F2 ? '#2b8a3e' : '#e8590c', align: 'right' });
      DY.chart(ctx, { F, x: 330, y: 250, w: 520, h: 140, xmax: 4, ymin: -6, ymax: 6, xstep: 1, ystep: 2, xl: 't/s', yl: 'v/(m·s⁻¹)', series: [{ pts: st.pts, color: '#2b8a3e' }] });
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(330, 320); ctx.lineTo(850, 320); ctx.stroke();
      D.text(ctx, '向右为正', 860, 324, { size: F(11), color: '#868e96' });
    }
    vSeg.set(st.v0, true);
    reset();
    loop.start();
  });

  /* ================= 跳伞运动员 ================= */
  PS.register('parachute', function (el) {
    const VW = 1000, VH = 440, G = 800, M = G / 9.8, K1 = 0.27, K2 = 32, H0 = 1500;
    const st = { t: 0, y: H0, v: 0, k: K1, open: false, run: false, pts: [[0, 0]], landed: false, ot: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const jumpB = PS.ui.button('🪂 跳出飞机', () => { reset(); st.run = true; PS.sound.tick(); }, 'btn btn-primary btn-sm');
    const openB = PS.ui.button('打开降落伞', () => { if (st.run && !st.open) { st.open = true; st.ot = 0; PS.sound.clack(); } }, 'btn btn-accent btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(jumpB, openB, PS.ui.button('↺ 重来', reset, 'btn btn-ghost btn-sm')), msg);
    function reset() { Object.assign(st, { t: 0, y: H0, v: 0, k: K1, open: false, run: false, pts: [[0, 0]], landed: false, ot: 0, phase: '' }); tell(); S.render(); }
    const fOf = () => st.k * st.v * st.v;
    function tell() {
      const f = fOf();
      let p;
      if (!st.run && !st.landed) p = ['', '运动员和伞总重 <b>800 N</b>，从 1500 m 高空跳下。空气阻力随速度增大而增大。点“跳出飞机”，适当时候再“打开降落伞”。'];
      else if (st.landed) p = ['ok', '安全着陆！总结：f &lt; G 时加速下落；<b>f = G 时匀速下落（二力平衡）</b>；开伞后 f &gt; G，减速下落，直到 f 又等于 G，再次匀速下落。'];
      else if (Math.abs(f - G) < 15) p = ['ok', '阻力增大到 <b>f = G = 800 N</b>，重力和阻力是一对<b>平衡力</b>，运动员<b>匀速直线下落</b>（速度约 ' + PS.fmt(st.v, 0) + ' m/s）。'];
      else if (f < G) p = ['info', '<b>f &lt; G</b>（' + PS.fmt(f, 0) + ' N &lt; 800 N），受非平衡力，<b>加速</b>下落；速度越大，阻力越大……'];
      else p = ['bad', '降落伞打开，阻力突然变大，<b>f &gt; G</b>，运动员<b>减速</b>下落；速度变小，阻力也随之变小……'];
      if (st.phase !== p[1].slice(0, 12)) { st.phase = p[1].slice(0, 12); msg.className = 'fc-msg' + (p[0] ? ' ' + p[0] : ''); msg.innerHTML = p[1]; }
    }
    const loop = PS.loop((dt) => {
      if (st.run && !st.landed) {
        const speed = st.open && st.ot > 4 ? 10 : 3;
        const n = 20, d = (dt * speed) / n;
        for (let i = 0; i < n; i++) {
          if (st.open) { st.ot += d; st.k = Math.min(K1 + (K2 - K1) * Math.min(1, st.ot / 3), (5 * G) / Math.max(1, st.v * st.v)); }
          const a = (G - st.k * st.v * st.v) / M;
          st.v = Math.max(0, st.v + a * d); st.y -= st.v * d; st.t += d;
          if (!st.open && st.y < 600) { st.open = true; st.ot = 0; }
          if (st.y <= 0) { st.y = 0; st.landed = true; st.run = false; PS.sound.good(); break; }
        }
        if (!st.pts.length || st.t - st.pts[st.pts.length - 1][0] > 0.4) st.pts.push([st.t, st.v]);
        tell();
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, '#74c0fc'); sky.addColorStop(1, '#d0ebff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 420, VH);
      // 云朵向上移动表示下落
      for (let i = 0; i < 6; i++) { const yy = ((i * 140 - (H0 - st.y) * 6) % 840 + 840) % 840 - 120; const xx = 40 + ((i * 97) % 300); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(xx, yy, 26, 0, TAU); ctx.arc(xx + 30, yy - 8, 30, 0, TAU); ctx.arc(xx + 60, yy, 24, 0, TAU); ctx.fill(); }
      if (st.y < 120) { ctx.fillStyle = '#69db7c'; ctx.fillRect(0, 300 + st.y * 1.2, 420, 200); }
      const px = 210, py = 230;
      // 降落伞
      if (st.open) {
        const r = Math.min(1, st.ot / 2);
        ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.ellipse(px, py - 120, 30 + 80 * r, 20 + 40 * r, 0, Math.PI, TAU); ctx.fill();
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2; [-1, -0.5, 0, 0.5, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(px + k * (30 + 80 * r), py - 120); ctx.lineTo(px, py - 30); ctx.stroke(); });
      }
      // 运动员
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(px, py - 22, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.lineTo(px, py + 18); ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = '#343a40'; ctx.beginPath(); ctx.moveTo(px, py + 18); ctx.lineTo(px - 10, py + 42); ctx.moveTo(px, py + 18); ctx.lineTo(px + 10, py + 42); ctx.stroke();
      ctx.strokeStyle = '#e8590c'; ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px - (st.open ? 6 : 20), py - (st.open ? 24 : 2)); ctx.moveTo(px, py - 6); ctx.lineTo(px + (st.open ? 6 : 20), py - (st.open ? 24 : 2)); ctx.stroke();
      // 力的示意图
      const f = fOf(), sc = (v) => Math.min(200, (v / 800) * 110);
      FO.arrow(ctx, px + 4, py + 4, Math.PI / 2, sc(G), { color: FC.G, label: 'G = 800 N', F });
      if (f > 1) FO.arrow(ctx, px - 4, py + 4, -Math.PI / 2, sc(f), { color: FC.f, label: 'f = ' + PS.fmt(f, 0) + ' N' + (f > 1600 ? '（箭头已缩短）' : ''), F, labelSide: -1 });
      D.text(ctx, '高度 ' + PS.fmt(st.y, 0) + ' m', 14, 28, { size: F(14), weight: 800, color: '#1b2333', bg: 'rgba(255,255,255,.8)' });
      D.text(ctx, 'v = ' + PS.fmt(st.v, 1) + ' m/s', 14, 28 + F(14) * 1.7, { size: F(14), weight: 800, color: '#2b8a3e', bg: 'rgba(255,255,255,.8)' });
      D.text(ctx, '时间加速 ×' + (st.open && st.ot > 4 ? 10 : 3), 406, 28, { size: F(11), color: '#1864ab', align: 'right' });
      // v–t 图像
      ctx.fillStyle = '#fff'; ctx.fillRect(420, 0, VW - 420, VH);
      DY.chart(ctx, { F, x: 500, y: 50, w: 440, h: 300, xmax: 160, ymax: 60, xstep: 20, xlab: 40, ystep: 10, xl: 't/s', yl: 'v/(m·s⁻¹)', series: [{ pts: st.pts, color: '#2b8a3e', width: 2.6 }], bg: false });
      D.text(ctx, '速度—时间图像', 720, 26, { size: F(14), weight: 800, color: '#495057', align: 'center' });
      const Yv = (v) => 350 - (v / 60) * 300;
      ctx.strokeStyle = 'rgba(112,72,232,.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.4;
      [[54.4, '不开伞时的匀速'], [5, '开伞后的匀速']].forEach(([v, t]) => { ctx.beginPath(); ctx.moveTo(500, Yv(v)); ctx.lineTo(940, Yv(v)); ctx.stroke(); D.text(ctx, t, 938, Yv(v) - 5, { size: F(11), color: '#7048e8', align: 'right' }); });
      ctx.setLineDash([]);
    }
    reset();
    loop.start();
  });

  /* ================= 平衡力还是相互作用力 ================= */
  const PJ = {
    book: { name: '书静止在桌面上', forces: [
      { id: 'G', t: 'G', d: '书受到的重力（地球对书）', on: '书', by: '地球', x: 500, y: 190, a: 90, m: 4, c: FC.G },
      { id: 'N', t: 'F支', d: '桌面对书的支持力', on: '书', by: '桌面', x: 500, y: 215, a: -90, m: 4, c: FC.N },
      { id: 'P', t: 'F压', d: '书对桌面的压力', on: '桌面', by: '书', x: 530, y: 215, a: 90, m: 4, c: FC.F },
    ] },
    lamp: { name: '电灯吊在天花板下', forces: [
      { id: 'G', t: 'G', d: '电灯受到的重力（地球对灯）', on: '电灯', by: '地球', x: 500, y: 290, a: 90, m: 3, c: FC.G },
      { id: 'T', t: 'F拉', d: '电线对电灯的拉力', on: '电灯', by: '电线', x: 500, y: 250, a: -90, m: 3, c: FC.T },
      { id: 'T2', t: 'F拉′', d: '电灯对电线的拉力', on: '电线', by: '电灯', x: 530, y: 236, a: 90, m: 3, c: FC.F },
    ] },
    car: { name: '汽车在平直公路上匀速行驶', forces: [
      { id: 'G', t: 'G', d: '汽车受到的重力', on: '汽车', by: '地球', x: 500, y: 250, a: 90, m: 4, c: FC.G },
      { id: 'N', t: 'F支', d: '路面对汽车的支持力', on: '汽车', by: '路面', x: 470, y: 330, a: -90, m: 4, c: FC.N },
      { id: 'P', t: 'F压', d: '汽车对路面的压力', on: '路面', by: '汽车', x: 560, y: 334, a: 90, m: 4, c: FC.F },
      { id: 'D', t: 'F牵', d: '汽车受到的牵引力', on: '汽车', by: '路面', x: 600, y: 270, a: 0, m: 3, c: '#e8590c' },
      { id: 'f', t: 'f阻', d: '汽车受到的阻力', on: '汽车', by: '路面和空气', x: 400, y: 270, a: 180, m: 3, c: FC.f },
    ] },
    magnet: { name: '磁体吸引桌面上静止的铁块', forces: [
      { id: 'A', t: 'F吸', d: '磁体对铁块的吸引力', on: '铁块', by: '磁体', x: 560, y: 262, a: 180, m: 3, c: FC.T },
      { id: 'B', t: 'F吸′', d: '铁块对磁体的吸引力', on: '磁体', by: '铁块', x: 360, y: 262, a: 0, m: 3, c: FC.F },
      { id: 'f', t: 'f', d: '桌面对铁块的摩擦力', on: '铁块', by: '桌面', x: 620, y: 290, a: 0, m: 3, c: FC.f },
    ] },
  };
  PS.register('pair-judge', function (el) {
    const VW = 1000, VH = 380;
    const st = { k: 'book', sel: [], score: 0, n: 0, done: {} };
    const seg = PS.ui.seg(Object.keys(PJ).map((k) => ({ value: k, label: PJ[k].name })), st.k, (v) => { st.k = v; st.sel = []; ui(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const chips = h('div', { class: 'fc-chips' });
    const ans = h('div', { class: 'fc-chips' });
    const msg = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '4px' } });
    el.append(h('div', { class: 'small', style: { marginTop: '6px' }, html: '<b>第一步：</b>选出两个力' }), chips, h('div', { class: 'small', style: { marginTop: '8px' }, html: '<b>第二步：</b>它们是……' }), ans, msg, score);
    ['一对平衡力', '一对相互作用力', '都不是'].forEach((t, i) => ans.append(PS.ui.button(t, () => answer(i), 'btn btn-sm')));
    const isOpp = (a, b) => Math.abs((((a.a - b.a) % 360) + 360) % 360 - 180) < 1;
    function kind(a, b) {
      const opp = isOpp(a, b), eq = a.m === b.m;
      if (a.on === b.on && opp && eq && (a.a % 180 === 0 ? Math.abs(a.y - b.y) < 40 : Math.abs(a.x - b.x) < 40)) return 0;
      if (a.on === b.by && a.by === b.on && opp && eq) return 1;
      return 2;
    }
    function ui() {
      chips.innerHTML = '';
      PJ[st.k].forces.forEach((f) => {
        const b = PS.ui.button('<b' + (st.sel.includes(f.id) ? '' : ' style="color:' + f.c + '"') + '>' + f.t + '</b>：' + f.d, () => { const i = st.sel.indexOf(f.id); if (i >= 0) st.sel.splice(i, 1); else { st.sel.push(f.id); if (st.sel.length > 2) st.sel.shift(); } ui(); }, 'btn btn-sm' + (st.sel.includes(f.id) ? ' on' : ''));
        chips.append(b);
      });
      msg.className = 'fc-msg'; msg.innerHTML = st.sel.length < 2 ? '点两个力的按钮把它们选出来（画面中会高亮）。' : '选好了，判断它们是什么关系。';
      score.innerHTML = '已判断 ' + st.n + ' 对 · 答对 ' + st.score + ' 对';
      S.render();
    }
    function answer(i) {
      if (st.sel.length < 2) { msg.className = 'fc-msg bad'; msg.innerHTML = '请先选出<b>两个</b>力。'; return; }
      const [a, b] = st.sel.map((id) => PJ[st.k].forces.find((f) => f.id === id));
      const k = kind(a, b), ok = k === i;
      st.n++; if (ok) st.score++;
      ok ? PS.sound.good() : PS.sound.bad();
      const yes = (v) => (v ? '<b style="color:#2b8a3e">是</b>' : '<b style="color:#e03131">否</b>');
      const sameBody = a.on === b.on;
      const opp = isOpp(a, b);
      msg.className = 'fc-msg ' + (ok ? 'ok' : 'bad');
      msg.innerHTML = (ok ? '✔ 正确！' : '✘ 应该是“' + ['一对平衡力', '一对相互作用力', '都不是'][k] + '”。') + '<br>' + a.t + ' 作用在<b>' + a.on + '</b>上（施力物体：' + a.by + '），' + b.t + ' 作用在<b>' + b.on + '</b>上（施力物体：' + b.by + '）。' +
        '<br>同一物体：' + yes(sameBody) + '　大小相等：' + yes(a.m === b.m) + '　方向相反：' + yes(opp) + '　' +
        (k === 0 ? '⇒ 同体、等大、反向、共线，是<b>平衡力</b>。' : k === 1 ? '⇒ 甲对乙、乙对甲，作用在<b>两个物体</b>上，是<b>相互作用力</b>。' : '⇒ ' + (opp ? '虽然大小相等、方向相反，但既不是同一物体受的两个力，也不是两个物体之间的相互作用，' : '方向不相反，') + '<b>都不是</b>。');
      score.innerHTML = '已判断 ' + st.n + ' 对 · 答对 ' + st.score + ' 对';
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const k = st.k;
      if (k === 'book') { ctx.fillStyle = '#c98d3e'; ctx.fillRect(300, 215, 400, 26); ctx.fillStyle = '#a87b3c'; ctx.fillRect(320, 241, 22, 120); ctx.fillRect(658, 241, 22, 120); ctx.fillStyle = '#4dabf7'; ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2; ctx.fillRect(420, 170, 160, 45); ctx.strokeRect(420, 170, 160, 45); D.text(ctx, '书', 470, 197, { size: F(15), weight: 800, color: '#fff' }); D.text(ctx, '桌面', 640, 233, { size: F(13), weight: 700, color: '#5c3a0e' }); }
      if (k === 'lamp') { ctx.fillStyle = '#868e96'; ctx.fillRect(300, 30, 400, 16); ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(500, 46); ctx.lineTo(500, 250); ctx.stroke(); ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#f59f00'; ctx.beginPath(); ctx.arc(500, 290, 40, 0, TAU); ctx.fill(); ctx.stroke(); D.text(ctx, '电线', 512, 120, { size: F(13), color: '#495057' }); }
      if (k === 'car') { FO.ground(ctx, 0, VW, 334, { depth: 40 }); FO.cart(ctx, 360, 334, { w: 280, h: 70, r: 22, color: '#74c0fc', label: '汽车 →' }); }
      if (k === 'magnet') { ctx.fillStyle = '#c98d3e'; ctx.fillRect(150, 290, 700, 22); FO.magnet(ctx, 290, 262, 160, { t: 52, n: 1 }); ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.fillRect(560, 236, 90, 54); ctx.strokeRect(560, 236, 90, 54); D.text(ctx, '铁块', 605, 268, { size: F(13), weight: 800, color: '#fff', align: 'center' }); D.text(ctx, '（磁体被手按住）', 290, 222, { size: F(12), color: '#868e96', align: 'center' }); }
      PJ[k].forces.forEach((f) => {
        const on = st.sel.includes(f.id);
        FO.arrow(ctx, f.x, f.y, (f.a * Math.PI) / 180, f.m * 26, { color: f.c, label: f.t, F, alpha: st.sel.length && !on ? 0.22 : 1, width: on ? 5 : 3.2, labelSide: f.a === 90 ? (f.x > 510 ? -1 : 1) : f.a === -90 ? -1 : 1 });
      });
      D.text(ctx, PJ[k].name, 18, 30, { size: F(16), weight: 800, color: '#3b5bdb' });
    }
    seg.set(st.k, true);
    ui();
  });
})();
