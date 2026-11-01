/* 第3章第2节：熔化和凝固——探究固体熔化时温度的变化规律、熔化/凝固图像、熔点和沸点表、晶体与非晶体、熔化吸热凝固放热。依赖 heat.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const ROOM = 20;

  /* ================= 熔化实验的物理模型（焓模型） ================= */
  // 用“热量”H 描述物质的状态：晶体在熔点处吸收热量 L 时温度不变；非晶体在一个温度范围内逐渐变软变稀。
  // 数值是为了让实验在十几分钟内完成而选的“等效值”，曲线形状与教材实验一致。
  const SUBS = {
    haibo: { name: '海波', crystal: true, mp: 48, Cs: 1.0, Cl: 1.3, L: 8, T0: 38, Tb0: 50, range: [30, 80], color: '#f1f3f5', liq: 'rgba(230,240,250,.9)' },
    wax: { name: '石蜡', crystal: false, soft: [44, 60], Cs: 1.1, L: 5, T0: 38, Tb0: 50, range: [30, 80], color: '#fff9db', liq: 'rgba(255,244,200,.85)' },
    ice: { name: '冰', crystal: true, mp: 0, Cs: 1.2, Cl: 2.4, L: 16, T0: -8, Tb0: 22, range: [-10, 40], color: '#e7f5ff', liq: 'rgba(165,216,255,.75)' },
  };
  PS.MELT_SUBS = SUBS;
  const smooth = (x) => { x = PS.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  function Hof(s, T) {
    if (!s.crystal) return s.Cs * (T - s.T0) + s.L * smooth((T - s.soft[0]) / (s.soft[1] - s.soft[0]));
    return T <= s.mp ? s.Cs * (T - s.T0) : s.Cs * (s.mp - s.T0) + s.L + s.Cl * (T - s.mp);
  }
  function Tof(s, H) {
    if (s.crystal) {
      const H1 = s.Cs * (s.mp - s.T0);
      if (H <= H1) return s.T0 + H / s.Cs;
      if (H <= H1 + s.L) return s.mp;
      return s.mp + (H - H1 - s.L) / s.Cl;
    }
    let a = -60, b = 200;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (Hof(s, m) < H) a = m; else b = m; }
    return (a + b) / 2;
  }
  /** 熔化的比例 0~1 */
  function fracOf(s, H) {
    if (s.crystal) return PS.clamp((H - s.Cs * (s.mp - s.T0)) / s.L, 0, 1);
    return smooth((Tof(s, H) - s.soft[0]) / (s.soft[1] - s.soft[0]));
  }
  function stateOf(s, H) {
    const f = fracOf(s, H);
    if (s.crystal) return f <= 0.001 ? 'solid' : f >= 0.999 ? 'liquid' : 'mix';
    const T = Tof(s, H);
    return T < s.soft[0] - 2 ? 'solid' : T > s.soft[1] + 1 ? 'liquid' : 'soft';
  }
  function stateText(s, H) {
    const k = stateOf(s, H);
    if (k === 'soft') { const T = Tof(s, H); return T < (s.soft[0] + s.soft[1]) / 2 ? '变软' : '变稀'; }
    return PS.STATE[k].name;
  }
  function stateColor(k) { return k === 'soft' ? '#e8590c' : PS.STATE[k].c; }

  /* ================= 探究固体熔化时温度的变化规律 ================= */
  PS.register('melt-lab', function (el, opts) {
    const VW = 1000, VH = 520;
    const st = { sub: opts.sub || 'haibo', method: 'bath', lamp: false, out: false, run: false, fast: false, t: 0, H: 0, Tb: 50, rows: [], trace: [], tubeX: 300, bubbles: [], noise: 0 };
    const sub = () => SUBS[st.sub];
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const S = PS.stage(left, { ratio: VW + ' / ' + VH, draw: paint });
    const C = PS.stage(left, { ratio: '1000 / 360', draw: chart });
    C.stage.style.marginTop = '10px';
    const mols = {};
    const getMols = () => mols[st.sub] || (mols[st.sub] = PS.Mols(42, { w: 190, h: 150, r: 8, amorphous: !sub().crystal }));

    const subSeg = PS.ui.seg(Object.keys(SUBS).map((k) => ({ value: k, label: SUBS[k].name })), st.sub, (v) => { st.sub = v; reset(); });
    const mSeg = PS.ui.seg([{ value: 'bath', label: '水浴法加热' }, { value: 'direct', label: '酒精灯直接加热' }], st.method, (v) => { st.method = v; reset(); say(v === 'direct' ? '直接加热时试管受热<b>不均匀</b>、温度上升<b>太快</b>，靠近火焰的部分先熔化，温度计示数忽高忽低，不便于观察和记录。对比一下水浴法！' : '水浴法：把试管放在盛水的烧杯中加热，物质<b>受热均匀</b>，温度上升<b>缓慢</b>，便于观察和记录。'); });
    const lampBtn = PS.ui.button('🔥 点燃酒精灯，开始实验', () => {
      st.lamp = !st.lamp; st.run = true;
      lampBtn.innerHTML = st.lamp ? '熄灭酒精灯' : '🔥 点燃酒精灯';
      loop.start(); upd();
    }, 'btn btn-primary');
    const fastBtn = PS.ui.toggle('快进 ×4', false, (v) => { st.fast = v; });
    const outBtn = PS.ui.button('取出试管，观察凝固', () => {
      st.out = !st.out; outBtn.innerHTML = st.out ? '把试管放回热水中' : '取出试管，观察凝固';
      if (st.out && st.lamp) { st.lamp = false; lampBtn.innerHTML = '🔥 点燃酒精灯'; }
      st.run = true; loop.start(); upd();
      if (st.out) say('试管离开了热水，放在 ' + ROOM + ' ℃ 的空气中，物质<b>放热</b>、温度下降。观察凝固过程中温度的变化。');
    }, 'btn');
    const pauseBtn = PS.ui.button('⏸ 暂停', () => { st.run = !st.run; pauseBtn.innerHTML = st.run ? '⏸ 暂停' : '▶ 继续'; if (st.run) loop.start(); }, 'btn btn-ghost btn-sm');
    const rT = PS.ui.readout('时间', '0 min 0 s'), rTemp = PS.ui.readout('温度计示数', '—', 'accent'), rS = PS.ui.readout('状态', '—', 'primary');
    const msg = h('div', { class: 'feedback show info small' });
    const tbody = h('tbody');
    const analysis = h('div', { class: 'small' });
    left.append(h('div', { class: 'readouts' }, rT.el, rTemp.el, rS.el));
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择物质与加热方法'), h('div', { class: 'row' }, subSeg.el), h('div', { class: 'row' }, mSeg.el)),
      h('div', { class: 'panel' }, h('h4', null, '② 进行实验'), h('div', { class: 'row' }, lampBtn), h('div', { class: 'row' }, outBtn), h('div', { class: 'row' }, fastBtn.el, pauseBtn, PS.ui.button('↺ 重做', () => reset(), 'btn btn-ghost btn-sm')), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 每隔 1 min 记录一次（自动）'), h('div', { class: 'table-wrap', style: { maxHeight: '220px', overflowY: 'auto' } }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '时间/min'), h('th', null, '温度/℃'), h('th', null, '状态'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '④ 分析论证'), analysis));
    function say(t, c) { msg.className = 'feedback show small ' + (c || 'info'); msg.innerHTML = t; }
    function reading() { return Tof(sub(), st.H) + (st.method === 'direct' ? st.noise : 0); }
    function reset() {
      const s = sub();
      Object.assign(st, { lamp: false, out: false, run: false, t: 0, H: 0, Tb: s.Tb0, rows: [], trace: [], tubeX: 300, noise: 0 });
      if (st.method === 'direct') st.Tb = ROOM;
      lampBtn.innerHTML = '🔥 点燃酒精灯，开始实验'; outBtn.innerHTML = '取出试管，观察凝固'; pauseBtn.innerHTML = '⏸ 暂停';
      getMols().set(1, 0);
      record(); renderTable(); upd();
      say(st.method === 'bath' ? '用<b>水浴法</b>加热：试管中的' + s.name + '碎末插着温度计，放在烧杯的水中。点燃酒精灯开始实验，每隔 1 min 记录一次温度，同时观察物质的状态。' : '直接用酒精灯给试管加热会怎样？点燃酒精灯试一试。');
      loop.start();
    }
    function record() {
      const s = sub();
      st.rows.push({ t: Math.round(st.t), T: PS.round(reading(), 1), k: stateText(s, st.H), key: stateOf(s, st.H) });
    }
    function renderTable() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.t), h('td', null, PS.fmtT(r.T, 1, true)), h('td', { style: { color: stateColor(r.key), fontSize: '.82rem', fontWeight: 700 } }, r.k))));
      tbody.lastChild && tbody.parentNode.parentNode.scrollTo && (tbody.parentNode.parentNode.scrollTop = 1e6);
      analyse();
    }
    function analyse() {
      const s = sub(), R = st.rows;
      if (R.length < 6) { analysis.innerHTML = '<span class="muted">记录 6 组以上数据后，这里会帮你分析图像。</span>'; return; }
      // 找温度基本不变的一段
      let best = null;
      for (let i = 0; i < R.length; i++) {
        let j = i;
        while (j + 1 < R.length && Math.abs(R[j + 1].T - R[i].T) < 0.35) j++;
        if (j - i >= 2 && (!best || j - i > best[1] - best[0])) best = [i, j];
      }
      const cooling = st.out;
      if (s.crystal && best) {
        const T = R[best[0]].T;
        analysis.innerHTML = '<p style="margin:0 0 6px">从第 <b>' + R[best[0]].t + ' min</b> 到第 <b>' + R[best[1]].t + ' min</b>，温度保持 <b>' + PS.fmtT(T) + '</b> 不变，图像上有一段<b>水平线段</b>。</p>' +
          '<p style="margin:0">' + (cooling ? '结论：' + s.name + '凝固时<b>放热</b>，温度不变，凝固点 = 熔点 = ' + PS.fmtT(s.mp) + '。' : '结论：' + s.name + '熔化时要<b>不断吸热</b>，但温度<b>保持不变</b>——有固定的熔化温度，是<span class="hl">晶体</span>，熔点是 <b>' + PS.fmtT(s.mp) + '</b>。熔化过程中处于<b>固液共存</b>状态。') + '</p>';
      } else if (!s.crystal && R[R.length - 1].T > s.soft[1]) {
        analysis.innerHTML = '<p style="margin:0">' + s.name + '在熔化过程中<b>吸热</b>，温度<b>不断升高</b>，先变软、再变稀，最后变成液体——<b>没有固定的熔化温度</b>，图像上没有水平线段，是<span class="hl">非晶体</span>。</p>';
      } else analysis.innerHTML = '<span class="muted">继续加热、继续记录……注意观察温度和状态的变化。</span>';
    }
    const loop = PS.loop((dt) => {
      const s = sub();
      if (st.run) {
        const sp = st.fast ? 4 : 1;
        const n = Math.ceil(sp * 4);
        const dtm = (dt * sp) / 2 / n; // 1 s 现实时间 = 0.5 min 模拟时间
        for (let i = 0; i < n; i++) {
          const T = Tof(s, st.H);
          let q;
          if (st.out) q = 0.1 * (ROOM - T);
          else if (st.method === 'direct') q = st.lamp ? 0.55 * (160 - T) * 0.12 : 0.1 * (ROOM - T);
          else q = 0.15 * (st.Tb - T);
          st.H += q * dtm;
          if (st.method === 'bath') st.Tb = Math.min(100, st.Tb + ((st.lamp ? 2.2 : 0) - 0.02 * (st.Tb - ROOM)) * dtm);
          const before = Math.floor(st.t + 1e-9);
          st.t += dtm;
          if (Math.floor(st.t + 1e-9) > before) { record(); renderTable(); }
        }
        if (st.method === 'direct') st.noise = st.lamp ? Math.sin(st.t * 9) * 2.5 + Math.sin(st.t * 23) * 1.5 : 0;
        st.trace.push([st.t, reading()]);
        if (st.trace.length > 2400) st.trace.splice(0, st.trace.length - 2400);
        if (st.t >= 30) { st.run = false; say('实验时间已到 30 min。可以“重做”，或换一种物质比较。'); }
        upd();
      }
      st.tubeX += ((st.out ? 560 : 300) - st.tubeX) * Math.min(1, dt * 4);
      const m = getMols();
      const f = fracOf(s, st.H);
      m.set(1 - f, 0);
      m.step(dt, PS.clamp((Tof(s, st.H) - s.range[0]) / (s.range[1] - s.range[0]), 0, 1));
      S.render(); C.render();
    }, S.stage);
    function upd() {
      const s = sub(), T = reading(), k = stateOf(s, st.H);
      const mm = Math.floor(st.t), ss = Math.floor((st.t - mm) * 60);
      rT.set(mm + ' min ' + ss + ' s');
      rTemp.set(PS.fmtT(T, 1));
      rS.set('<span style="color:' + stateColor(k) + '">' + stateText(s, st.H) + '</span>');
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const s = sub(), T = Tof(s, st.H), f = fracOf(s, st.H);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 500, VW, 20);
      // 铁架台
      ctx.fillStyle = '#495057'; D.roundRect(ctx, 30, 488, 250, 12, 3); ctx.fill();
      ctx.fillStyle = '#868e96'; ctx.fillRect(64, 40, 10, 450);
      const bath = st.method === 'bath';
      if (bath) {
        // 铁圈 + 石棉网 + 烧杯
        ctx.fillStyle = '#495057'; ctx.fillRect(74, 334, 120, 6);
        ctx.fillStyle = '#adb5bd'; D.roundRect(ctx, 185, 330, 230, 8, 3); ctx.fill();
        ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.ellipse(300, 334, 50, 4, 0, 0, TAU); ctx.fill();
        PS.beaker(ctx, 300, 330, 210, 180, { level: 0.8, water: PS.waterColor(st.Tb) });
        D.text(ctx, '水温约 ' + Math.round(st.Tb) + ' ℃', 300, 320, { size: F(12), weight: 700, color: '#1c7ed6', align: 'center' });
        if (st.Tb > 95 && st.lamp) for (let i = 0; i < 5; i++) { const ph = (st.t * 3 + i * 0.2) % 1; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(220 + i * 38, 324 - ph * 140, 3 + ph * 4, 0, TAU); ctx.stroke(); }
      }
      PS.lamp(ctx, 300, 500, 1.05, { on: st.lamp, t: st.t * 2 + performance.now() / 1000, cap: !st.lamp });
      // 试管夹
      const tx = st.tubeX, tTop = bath ? 70 : 150, tLen = 230, tW = 40;
      ctx.fillStyle = '#495057'; ctx.fillRect(74, tTop + 30, tx - 74 - tW / 2, 6);
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, tx - tW / 2 - 6, tTop + 22, tW + 12, 22, 4); ctx.fill();
      // 试管中的物质：晶体熔化时下部先熔化（直接加热时更明显）
      const fillH = 0.32, solidCol = s.color, liqCol = s.liq;
      const fills = [];
      if (s.crystal) {
        const fs = 1 - f;
        if (st.method === 'direct') { fills.push({ from: 0, to: fillH * f, color: liqCol }); fills.push({ from: fillH * f, to: fillH, color: solidCol }); }
        else { fills.push({ from: 0, to: fillH, color: liqCol }); if (fs > 0) fills.push({ from: 0, to: fillH * (0.15 + 0.85 * fs), color: solidCol }); }
      } else fills.push({ from: 0, to: fillH, color: PS.mixColor('#fff3bf', '#ffe8a3', f) });
      PS.tube(ctx, tx, tTop, tLen, tW, { fill: fills });
      // 固体颗粒
      if (s.crystal && f < 1) {
        ctx.save();
        const n = Math.round(14 * (1 - f));
        for (let i = 0; i < n; i++) {
          const gx = tx - 13 + ((i * 7) % 26), gy = tTop + tLen - 10 - Math.floor(i / 4) * 12 - (st.method === 'direct' ? fillH * f * tLen : 0);
          ctx.fillStyle = s === SUBS.ice ? 'rgba(255,255,255,.95)' : '#fff'; ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx, gy + 5); ctx.lineTo(gx - 5, gy); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }
      // 试管中的温度计
      PS.thermo(ctx, { x: tx + 4, top: tTop - 50, bulbY: tTop + tLen - 18, min: -20, max: 110, div: 2, label: 20, value: T, w: 9, bulbR: 6, F, fs: F(8), numbers: false, unit: false });
      // 右侧：温度计放大 + 状态 + 微观
      const MX = 610;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5;
      D.roundRect(ctx, MX, 24, 150, 300, 14); ctx.fill(); ctx.stroke();
      ctx.save(); D.roundRect(ctx, MX, 24, 150, 300, 14); ctx.clip();
      const Tr = reading();
      PS.thermo(ctx, { x: MX + 52, top: 10, bulbY: 340, bulb: false, min: Tr - 9, max: Tr + 9, div: 1, label: 10, value: Tr, w: 40, F, fs: F(15), unit: false, pad: 0 });
      ctx.restore();
      D.text(ctx, '温度计（放大）', MX + 75, 346, { size: F(12), weight: 700, color: '#6b7487', align: 'center' });
      const k = stateOf(s, st.H);
      D.text(ctx, PS.fmtT(Tr, 1), 880, 60, { size: F(30), weight: 800, color: '#e8590c', align: 'center', baseline: 'middle' });
      D.text(ctx, stateText(s, st.H), 880, 108, { size: F(18), weight: 800, color: stateColor(k), align: 'center', baseline: 'middle', bg: '#fff' });
      const heatTxt = st.out ? '放热' : st.lamp || (bath && st.Tb > T + 1) ? '吸热' : '';
      if (heatTxt) D.text(ctx, (heatTxt === '吸热' ? '🔥 ' : '❄️ ') + heatTxt, 880, 146, { size: F(15), weight: 800, color: heatTxt === '吸热' ? PS.HEAT_C.absorb : PS.HEAT_C.release, align: 'center', baseline: 'middle' });
      // 微观示意
      const cx = 880, cy = 330, R = 112;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
      getMols().draw(ctx, cx - 95, cy - 80, { bonds: s.crystal });
      ctx.restore();
      ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      D.text(ctx, '微观示意', cx, cy + R + 22, { size: F(12), weight: 700, color: '#7048e8', align: 'center' });
      ctx.restore();
    }
    function chart(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, 1000, 360);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 360);
      const s = sub();
      const t1 = Math.max(16, Math.ceil(st.t / 4) * 4 + 2);
      let [T0, T1] = s.range;
      if (st.method === 'direct') T1 += 20;
      const c = PS.tchart(ctx, { x: 80, y: 34, w: 860, h: 270 }, { t0: 0, t1, T0, T1, tStep: 1, TStep: 5, tLabelEvery: t1 > 20 ? 2 : 1, F, fs: F(12) });
      if (s.crystal) c.hline(s.mp, '#7048e8', '熔点 ' + PS.fmtT(s.mp));
      c.line(st.trace, 'rgba(232,89,12,.35)', 2);
      const pts = st.rows.map((r) => [r.t, r.T]);
      c.line(pts, '#e8590c', 2.6);
      c.dots(pts, '#e8590c', 4);
      D.text(ctx, s.name + (st.out ? '的熔化和凝固图像' : '的熔化图像'), 960, 22, { size: F(14), weight: 800, color: '#3a4458', align: 'right' });
      ctx.restore();
    }
    reset();
  });

  /* ================= 熔化和凝固的图像 ================= */
  const CURVES = {
    cm: { name: '晶体熔化', crystal: true, melt: true, pts: [[0, 40], [4, 48], [9, 48], [13, 58]], L: ['A', 'B', 'C', 'D'],
      seg: ['AB 段：固态，吸热，温度升高', 'BC 段：熔化过程，固液共存，吸热，温度不变（熔点 48 ℃）', 'CD 段：液态，吸热，温度升高'] },
    cs: { name: '晶体凝固', crystal: true, melt: false, pts: [[0, 58], [4, 48], [9, 48], [13, 38]], L: ['E', 'F', 'G', 'H'],
      seg: ['EF 段：液态，放热，温度降低', 'FG 段：凝固过程，固液共存，放热，温度不变（凝固点 48 ℃）', 'GH 段：固态，放热，温度降低'] },
    am: { name: '非晶体熔化', crystal: false, melt: true, fn: (t) => 36 + 2.6 * t - 0.035 * t * t, seg: ['温度不断升高：先变软，再变稀，最后变成液体；吸热；没有固定的熔化温度'] },
    as: { name: '非晶体凝固', crystal: false, melt: false, fn: (t) => 68 - 2.6 * t + 0.035 * t * t, seg: ['温度不断降低：由稀变稠，再变硬，最后变成固体；放热；没有固定的凝固温度'] },
  };
  function curveT(c, t) {
    if (c.fn) return c.fn(t);
    const p = c.pts;
    for (let i = 1; i < p.length; i++) if (t <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (t - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
    return p[p.length - 1][1];
  }
  function curveSeg(c, t) { if (!c.pts) return 0; return t <= c.pts[1][0] ? 0 : t <= c.pts[2][0] ? 1 : 2; }
  PS.register('melt-graph', function (el) {
    const VW = 1000, VH = 420, TMAX = 13;
    const st = { mode: 'cm', t: 2, play: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'ew-resize';
    const mols = { c: PS.Mols(36, { w: 170, h: 140, r: 8 }), a: PS.Mols(36, { w: 170, h: 140, r: 8, amorphous: true }) };
    const seg = PS.ui.seg(Object.keys(CURVES).map((k) => ({ value: k, label: CURVES[k].name })), st.mode, (v) => { st.mode = v; st.t = 0; upd(); });
    const tS = PS.ui.slider({ label: '时间', min: 0, max: TMAX, step: 0.05, value: st.t, unit: 'min', fmt: (v) => v.toFixed(1), onInput: (v) => { st.t = v; st.play = false; playBtn.innerHTML = '▶ 播放'; upd(); } });
    tS.el.classList.add('wide');
    const playBtn = PS.ui.button('▶ 播放', () => { st.play = !st.play; if (st.play && st.t >= TMAX - 0.01) st.t = 0; playBtn.innerHTML = st.play ? '⏸ 暂停' : '▶ 播放'; }, 'btn btn-primary');
    const out = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), PS.ui.row(playBtn, tS.el), out);
    const X = (t) => 80 + (t / TMAX) * 470, Y = (T) => 360 - ((T - 30) / 40) * 310;
    function frac(c, t) {
      if (c.crystal) { const s = curveSeg(c, t), p = c.pts; const f = s === 0 ? 0 : s === 2 ? 1 : (t - p[1][0]) / (p[2][0] - p[1][0]); return c.melt ? f : 1 - f; }
      const T = curveT(c, t); return smooth((T - 44) / 16);
    }
    function upd() {
      const c = CURVES[st.mode], T = curveT(c, st.t);
      tS.set(st.t, true);
      const txt = c.crystal ? c.seg[curveSeg(c, st.t)] : c.seg[0];
      out.innerHTML = '<b>第 ' + st.t.toFixed(1) + ' min，' + PS.fmtT(T, 1) + '</b>　' + txt + '。';
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.play) { st.t = Math.min(TMAX, st.t + dt * 1.2); if (st.t >= TMAX) { st.play = false; playBtn.innerHTML = '▶ 播放'; } upd(); }
      const c = CURVES[st.mode], m = c.crystal ? mols.c : mols.a;
      m.set(1 - frac(c, st.t), 0); m.step(dt, PS.clamp((curveT(c, st.t) - 30) / 40, 0, 1));
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      const c = CURVES[st.mode];
      const ch = PS.tchart(ctx, { x: 80, y: 50, w: 470, h: 310 }, { t0: 0, t1: TMAX, T0: 30, T1: 70, tStep: 1, TStep: 5, F, fs: F(12) });
      // 分段着色
      const N = 160, col = (t) => { if (!c.crystal) return c.melt ? '#e8590c' : '#1c7ed6'; return ['#3b5bdb', '#7048e8', '#0c8599'][c.melt ? curveSeg(c, t) : 2 - curveSeg(c, t)]; };
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TMAX, b = ((i + 1) / N) * TMAX;
        ctx.strokeStyle = col(a); ctx.globalAlpha = a <= st.t ? 1 : 0.3;
        ctx.beginPath(); ctx.moveTo(X(a), Y(curveT(c, a))); ctx.lineTo(X(b), Y(curveT(c, b))); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (c.pts) {
        c.pts.forEach((p, i) => D.text(ctx, c.L[i], X(p[0]) + (i === 0 ? -16 : 6), Y(p[1]) - 10, { size: F(15), weight: 800, color: '#1b2333' }));
        ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(0), Y(48)); ctx.lineTo(X(c.pts[1][0]), Y(48)); ctx.stroke(); ctx.setLineDash([]);
      }
      const T = curveT(c, st.t);
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(X(st.t), Y(30)); ctx.lineTo(X(st.t), Y(T)); ctx.lineTo(X(0), Y(T)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(X(st.t), Y(T), 7, 0, TAU); ctx.fill();
      D.text(ctx, c.crystal ? '海波（晶体）' : '石蜡（非晶体）', 545, 30, { size: F(14), weight: 800, color: '#3a4458', align: 'right' });
      // 右侧：试管 + 微观
      const f = frac(c, st.t), k = c.crystal ? (f <= 0.001 ? 'solid' : f >= 0.999 ? 'liquid' : 'mix') : (T < 42 ? 'solid' : T > 61 ? 'liquid' : 'soft');
      const sub = c.crystal ? SUBS.haibo : SUBS.wax;
      const fills = c.crystal ? [{ from: 0, to: 0.36, color: sub.liq }].concat(f < 1 ? [{ from: 0, to: 0.36 * (0.15 + 0.85 * (1 - f)), color: '#fff' }] : []) : [{ from: 0, to: 0.36, color: PS.mixColor('#fff3bf', '#ffe8a3', f) }];
      PS.tube(ctx, 640, 90, 240, 46, { fill: fills });
      if (c.crystal && f < 1) for (let i = 0; i < Math.round(14 * (1 - f)); i++) { const gx = 625 + ((i * 7) % 30), gy = 318 - Math.floor(i / 4) * 13; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx + 6, gy); ctx.lineTo(gx, gy + 6); ctx.lineTo(gx - 6, gy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      const stName = k === 'soft' ? (T < 52 ? '变软' : '变稀') : PS.STATE[k].name;
      D.text(ctx, stName, 640, 370, { size: F(17), weight: 800, color: stateColor(k), align: 'center', bg: '#fff' });
      D.text(ctx, c.melt ? '🔥 吸热' : '❄️ 放热', 640, 60, { size: F(15), weight: 800, color: c.melt ? PS.HEAT_C.absorb : PS.HEAT_C.release, align: 'center' });
      const cx = 850, cy = 210, R = 110;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
      (c.crystal ? mols.c : mols.a).draw(ctx, cx - 85, cy - 70, { bonds: c.crystal });
      ctx.restore();
      ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      D.text(ctx, '微观示意', cx, cy + R + 22, { size: F(12), weight: 700, color: '#7048e8', align: 'center' });
      ctx.restore();
    }
    function drag(e) { const p = S.pos(e), x = (p.x / S.w) * VW; if (x < 60 || x > 570) return; st.t = PS.clamp(((x - 80) / 470) * TMAX, 0, TMAX); st.play = false; playBtn.innerHTML = '▶ 播放'; upd(); }
    S.canvas.addEventListener('pointerdown', (e) => { drag(e); S.canvas.setPointerCapture(e.pointerId); S.canvas.onpointermove = drag; });
    S.canvas.addEventListener('pointerup', () => { S.canvas.onpointermove = null; });
    upd(); loop.start();
  });

  /* ================= 熔点和沸点表：给定温度下物质处于什么状态 ================= */
  // 数据：人教版教材“几种晶体的熔点”“几种物质的沸点”（标准大气压下，单位 ℃）
  const MELT = [['钨', 3410], ['铁', 1535, 2750], ['钢', 1515], ['灰铸铁', 1177], ['铜', 1083], ['金', 1064], ['银', 962], ['铝', 660], ['铅', 328, 1740], ['锡', 232], ['萘', 80.5], ['海波', 48], ['冰（水）', 0, 100], ['水银', -39, 357], ['甲苯', -95, 111], ['酒精', -117, 78], ['氮', -210, -196], ['氧', -218, -183], ['氢', -259, -253]];
  const BOIL = [['铁', 1535, 2750], ['铅', 328, 1740], ['水银', -39, 357], ['亚麻仁油', null, 287], ['甲苯', -95, 111], ['水', 0, 100], ['酒精', -117, 78], ['氨', null, -33.5], ['氧', -218, -183], ['氮', -210, -196], ['氢', -259, -253], ['氦', null, -268.9]];
  const QUESTIONS = {
    melt: [
      { q: '北方冬天气温可达 −50 ℃，测气温用水银温度计还是酒精温度计？', T: -50, hl: ['水银', '酒精'], a: '−50 ℃ 时水银已经凝固（凝固点 −39 ℃），酒精仍是液态（凝固点 −117 ℃），所以要用<b>酒精温度计</b>。' },
      { q: '能用锡锅来熔化铅吗？', T: 328, hl: ['锡', '铅'], a: '铅的熔点 328 ℃ 高于锡的熔点 232 ℃，铅还没熔化，锡锅就先熔化了，所以<b>不能</b>。' },
      { q: '为什么用钨做白炽灯的灯丝？（发光时灯丝约 2 500 ℃）', T: 2500, hl: ['钨'], a: '钨的熔点高达 3 410 ℃，在 2 500 ℃ 时仍是固态，不会熔化。' },
      { q: '−39 ℃ 的水银是什么状态？', T: -39, hl: ['水银'], a: '−39 ℃ 正好是水银的熔点（凝固点），水银可能是<b>固态、液态，也可能是固液共存</b>。' },
    ],
    boil: [
      { q: '测沸水的温度，用酒精温度计还是水银温度计？', T: 100, hl: ['酒精', '水银'], a: '100 ℃ 时酒精早已沸腾（沸点 78 ℃），而水银的沸点是 357 ℃，仍是液态，所以要用<b>水银温度计</b>。' },
      { q: '从液态空气中分离氧和氮：慢慢升温时，先汽化的是哪种？', T: -190, hl: ['氧', '氮'], a: '液态氮的沸点（−196 ℃）比液态氧（−183 ℃）低，升温时<b>氮先汽化</b>出来。' },
      { q: '常温（约 20 ℃）下，氢、氨、甲苯各是什么状态？', T: 20, hl: ['氢', '氨', '甲苯'], a: '20 ℃ 高于氢（−253 ℃）和氨（−33.5 ℃）的沸点，它们是<b>气态</b>；甲苯的沸点 111 ℃，熔点 −95 ℃，是<b>液态</b>。' },
    ],
  };
  PS.register('phase-explorer', function (el, opts) {
    const mode = opts.mode === 'boil' ? 'boil' : 'melt';
    const LIST = mode === 'boil' ? BOIL : MELT;
    const sl = (T) => Math.sign(T) * Math.log10(1 + Math.abs(T) / 15);
    const lo = -273, hi = 3600, s0 = sl(lo), s1 = sl(hi);
    const P = (T) => ((sl(T) - s0) / (s1 - s0)) * 100;          // 温度 → 百分比位置
    const invP = (p) => { let a = lo, b = hi; for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (P(m) < p) a = m; else b = m; } return (a + b) / 2; };
    const st = { T: 20, hl: [] };
    const box = h('div', { class: 'px-box' });
    const ticks = h('div', { class: 'px-ticks' });
    [-200, -100, -50, 0, 50, 100, 300, 1000, 3000].forEach((T) => { const s = h('span', null, (T < 0 ? '−' : '') + Math.abs(T)); s.style.left = P(T) + '%'; ticks.append(s); });
    const line = h('div', { class: 'px-line' });
    const rowsEl = h('div', { class: 'px-rows' });
    const rows = LIST.map(([n, mp, bp]) => {
      const bar = h('div', { class: 'px-bar' });
      const segs = [];
      if (mp != null) segs.push(['solid', lo, mp]);
      segs.push(['liquid', mp != null ? mp : lo, bp != null ? bp : hi]);
      if (bp != null) segs.push(['gas', bp, hi]);
      segs.forEach(([k, a, b]) => { const s = h('i', { class: 'px-' + k + (mp == null && k === 'liquid' ? ' px-unk' : '') }); s.style.left = P(a) + '%'; s.style.width = (P(b) - P(a)) + '%'; bar.append(s); });
      const tag = h('b', { class: 'px-tag' });
      const r = h('div', { class: 'px-row' }, h('span', { class: 'px-name' }, n), h('div', { class: 'px-track' }, bar), tag);
      rowsEl.append(r);
      return { n, mp, bp, r, tag };
    });
    const track = h('div', { class: 'px-track-all' }, line);
    const slider = h('input', { type: 'range', min: 0, max: 1000, step: 1, class: 'px-slider' });
    const tOut = h('output', { class: 'slider-val' });
    const qBox = h('div', { class: 'px-qs' });
    const ans = h('div', { class: 'feedback' });
    box.append(h('div', { class: 'controls top' }, h('b', null, '环境温度：'), slider, tOut, h('span', { class: 'kbd-hint' }, '（横轴刻度不均匀）')), h('div', { class: 'px-head' }, h('span', { class: 'px-name' }), h('div', { class: 'px-track' }, ticks), h('b', { class: 'px-tag muted' }, '状态')), h('div', { class: 'px-wrap' }, rowsEl, track),
      h('div', { class: 'px-legend' }, h('span', null, h('i', { class: 'px-solid' }), '固态'), h('span', null, h('i', { class: 'px-liquid' }), '液态'), h('span', null, h('i', { class: 'px-gas' }), '气态'), mode === 'boil' ? h('span', null, h('i', { class: 'px-liquid px-unk' }), '（熔点未列出）') : null),
      h('h4', { style: { margin: '14px 0 6px' } }, '🤔 用表格解决问题'), qBox, ans);
    el.append(box);
    QUESTIONS[mode].forEach((q) => qBox.append(PS.ui.button(q.q, () => { st.hl = q.hl; setT(q.T); ans.className = 'feedback show ok'; ans.innerHTML = q.a; }, 'btn btn-sm px-q')));
    slider.addEventListener('input', () => { st.hl = []; ans.className = 'feedback'; setT(Math.round(invP(slider.value / 10))); });
    function setT(T) {
      st.T = T;
      slider.value = P(T) * 10;
      tOut.innerHTML = PS.fmtT(T, T % 1 ? 1 : 0);
      line.style.left = P(T) + '%';
      rows.forEach((r) => {
        let k, txt;
        const eq = (a) => a != null && Math.abs(T - a) < 1e-9;
        if (eq(r.mp)) { k = 'mix'; txt = '固、液或固液共存'; }
        else if (eq(r.bp)) { k = 'gas'; txt = '液态或气态（沸腾）'; }
        else if (r.mp != null && T < r.mp) { k = 'solid'; txt = '固态'; }
        else if (r.bp != null && T > r.bp) { k = 'gas'; txt = '气态'; }
        else { k = 'liquid'; txt = '液态'; }
        r.tag.textContent = txt; r.tag.style.color = PS.STATE[k].c;
        r.r.classList.toggle('hl', st.hl.includes(r.n) || st.hl.includes(r.n.replace(/（.*）/, '')));
      });
    }
    // 点击某一行的分界处，自动吸附到熔点 / 沸点
    rows.forEach((r) => r.r.addEventListener('click', (e) => {
      const tr = r.r.querySelector('.px-track').getBoundingClientRect();
      const T = invP(((e.clientX - tr.left) / tr.width) * 100);
      const c = [r.mp, r.bp].filter((x) => x != null).sort((a, b) => Math.abs(P(a) - P(T)) - Math.abs(P(b) - P(T)))[0];
      if (c != null && Math.abs(P(c) - P(T)) < 4) { st.hl = [r.n]; setT(c); ans.className = 'feedback show info'; ans.innerHTML = r.n + (c === r.mp ? '的熔点（凝固点）是 ' : '的沸点是 ') + PS.fmtT(c, c % 1 ? 1 : 0) + '。'; }
    }));
    setT(st.T);
    if (!document.getElementById('px-style')) document.head.append(h('style', { id: 'px-style' }, `
      .px-box{font-size:.92rem}
      .px-slider{flex:1;min-width:140px;accent-color:var(--primary)}
      .px-head,.px-row{display:grid;grid-template-columns:70px minmax(0,1fr) 120px;gap:10px;align-items:center}
      .px-row{padding:2px 0;border-radius:8px;cursor:pointer}
      .px-row:hover{background:var(--surface-2)}
      .px-row.hl{background:#fff3bf}
      .px-name{font-weight:700;text-align:right;white-space:nowrap}
      .px-track{position:relative;height:16px}
      .px-head .px-track{height:22px}
      .px-ticks span{position:absolute;top:2px;transform:translateX(-50%);font-size:.75rem;color:var(--muted);white-space:nowrap}
      .px-bar{position:absolute;inset:3px 0;border-radius:6px;overflow:hidden;background:var(--line)}
      .px-bar i,.px-legend i{position:absolute;top:0;bottom:0}
      .px-solid{background:#91a7ff}.px-liquid{background:#66d9e8}.px-gas{background:#ffc078}
      .px-unk{background:repeating-linear-gradient(45deg,#66d9e8 0 6px,#c5f6fa 6px 12px)}
      .px-tag{font-size:.82rem;white-space:nowrap}
      .px-wrap{position:relative}
      .px-track-all{position:absolute;top:0;bottom:0;left:80px;right:130px;pointer-events:none}
      .px-line{position:absolute;top:-4px;bottom:-4px;width:0;border-left:2.5px solid var(--red)}
      .px-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:.84rem;color:var(--ink-2)}
      .px-legend span{display:inline-flex;align-items:center;gap:6px}
      .px-legend i{position:static;display:inline-block;width:22px;height:10px;border-radius:4px}
      .px-qs{display:flex;flex-direction:column;gap:6px;align-items:flex-start}
      .px-q{white-space:normal;text-align:left;line-height:1.5}
      @media (max-width:720px){.px-head,.px-row{grid-template-columns:52px minmax(0,1fr) 84px;gap:6px}.px-track-all{left:58px;right:90px}.px-tag{font-size:.74rem;white-space:normal;line-height:1.2}}
    `));
  });

  /* ================= 晶体还是非晶体 ================= */
  const CRYSTAL_ITEMS = [
    ['冰', 1, '冰有固定的熔点 0 ℃'], ['海波', 1, '海波的熔点是 48 ℃'], ['食盐', 1, '食盐颗粒是规则的立方体晶体'], ['明矾', 1, '明矾能长成规则的八面体晶体'], ['萘（樟脑丸）', 1, '萘的熔点是 80.5 ℃'], ['铁、铜等各种金属', 1, '金属都有固定的熔点'], ['水晶（石英）', 1, '水晶是天然晶体'], ['雪花', 1, '雪花是六角形的冰晶'],
    ['松香', 0, '松香加热时逐渐变软，没有固定的熔点'], ['石蜡', 0, '石蜡熔化时温度不断升高'], ['玻璃', 0, '玻璃加热后逐渐变软，可以吹制成各种形状'], ['沥青', 0, '夏天马路上的沥青会变软'], ['塑料', 0, '塑料受热逐渐变软'], ['蜂蜡', 0, '蜂蜡没有固定的熔点'],
  ];
  PS.register('crystal-sort', function (el) {
    const score = h('div', { class: 'quiz-score' });
    const grid = h('div', { class: 'us-grid cs-grid' });
    let ok = 0, done = 0;
    function build() {
      ok = 0; done = 0; grid.innerHTML = '';
      CRYSTAL_ITEMS.slice().sort(() => Math.random() - 0.5).forEach(([t, k, why]) => {
        const card = h('div', { class: 'us-card' }, h('p', null, t));
        const res = h('small');
        const pick = (g) => {
          if (card.classList.contains('done')) return;
          card.classList.add('done', g === k ? 'ok' : 'bad');
          done++; if (g === k) ok++;
          res.innerHTML = (g === k ? '✔ ' : '✘ ') + '<b>' + (k ? '晶体' : '非晶体') + '</b>：' + why;
          g === k ? PS.sound.good() : PS.sound.bad();
          upd();
        };
        card.append(h('div', { class: 'us-btns' }, PS.ui.button('晶体', () => pick(1), 'btn btn-sm'), PS.ui.button('非晶体', () => pick(0), 'btn btn-sm')), res);
        grid.append(card);
      });
      upd();
    }
    function upd() { score.innerHTML = '已判断 <b>' + done + '</b> / ' + CRYSTAL_ITEMS.length + ' · 答对 <b class="ok">' + ok + '</b>' + (done === CRYSTAL_ITEMS.length ? (ok === CRYSTAL_ITEMS.length ? ' · 🎉 全对！' : ' · 再试一次？') : ''); }
    el.append(h('div', { class: 'quiz-head' }, score, PS.ui.button('重新开始', build, 'btn btn-ghost btn-sm')), grid);
    if (!document.getElementById('cs-style')) document.head.append(h('style', { id: 'cs-style' }, '.cs-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}'));
    build();
  });

  /* ================= 熔化吸热、凝固放热的应用 ================= */
  // 两个空间（不放 / 放水或冰）在同样的外界温度下，温度怎样变化。水 / 冰用焓模型计算。
  const LATENT = {
    cellar: { name: '菜窖里放几桶水', Tout: -15, T0: 4, hours: 12, kOut: 0.12, kW: 5, Cw: 2, L: 40, H0: 'water', danger: -1, dangerText: '低于 −1 ℃，蔬菜冻坏了', clock: 22,
      tip: '冬天的夜里，室外 −15 ℃。两个菜窖一样，只是右边的菜窖里放了几桶水。' },
    icebox: { name: '用冰块给海鲜保鲜', Tout: 30, T0: 2, hours: 8, kOut: 0.18, kW: 1.2, Cw: 1, L: 30, H0: 'ice', danger: 8, dangerText: '高于 8 ℃，海鲜容易变质', clock: 8,
      tip: '夏天，室外 30 ℃。两个泡沫箱里都放着刚出海的鱼，右边的箱子里加了冰块。' },
  };
  PS.register('latent-demo', function (el) {
    const VW = 1000, VH = 600;
    const st = { mode: 'cellar', t: 0, run: false, A: [], B: [] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg(Object.keys(LATENT).map((k) => ({ value: k, label: LATENT[k].name })), st.mode, (v) => { st.mode = v; reset(); });
    const runBtn = PS.ui.button('▶ 开始', () => { if (st.t >= cfg().hours) reset(); st.run = !st.run; runBtn.innerHTML = st.run ? '⏸ 暂停' : '▶ 继续'; loop.start(); }, 'btn btn-primary');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el, runBtn, PS.ui.button('↺ 重来', () => reset(), 'btn btn-ghost')), msg);
    const cfg = () => LATENT[st.mode];
    let a, b; // 两个空间的状态
    function reset() {
      const c = cfg();
      a = { T: c.T0 };
      // 水的“焓”：以 0 ℃ 的冰为 0；H < 0 冰，0~L 冰水混合，> L 水
      const Hw = c.H0 === 'water' ? c.L + c.Cw * c.T0 : -c.Cw * 1; // 水与菜窖同温；冰块约 −1 ℃
      b = { T: c.T0, H: Hw };
      st.t = 0; st.run = false; st.A = [[0, a.T]]; st.B = [[0, b.T]];
      runBtn.innerHTML = '▶ 开始';
      msg.className = 'feedback show info'; msg.innerHTML = c.tip + '点“开始”，看看两边的温度怎样变化。';
      S.render();
    }
    const wT = (c, H) => (H < 0 ? H / c.Cw : H <= c.L ? 0 : (H - c.L) / c.Cw);
    const iceFrac = (c, H) => (H < 0 ? 1 : H <= c.L ? 1 - H / c.L : 0);
    const loop = PS.loop((dt) => {
      if (!st.run) return;
      const c = cfg(), n = 20, dh = (dt * 0.9) / n; // 1 s 现实时间 ≈ 0.9 小时
      for (let i = 0; i < n && st.t < c.hours; i++) {
        a.T += c.kOut * (c.Tout - a.T) * dh;
        const Tw = wT(c, b.H), q = c.kW * (b.T - Tw);
        b.T += (c.kOut * (c.Tout - b.T) - q) * dh;
        b.H += q * dh;
        st.t += dh;
      }
      st.A.push([st.t, a.T]); st.B.push([st.t, b.T]);
      if (st.t >= c.hours) { st.run = false; runBtn.innerHTML = '↺ 再来一次'; conclude(); }
      S.render();
    }, S.stage);
    function conclude() {
      const c = cfg();
      msg.className = 'feedback show ok';
      msg.innerHTML = st.mode === 'cellar'
        ? '左边的菜窖温度一直下降，蔬菜冻坏了；右边菜窖里的水降到 0 ℃ 后开始<b>凝固</b>，<b>凝固放热</b>，使菜窖的温度保持在 0 ℃ 左右，蔬菜安然无恙。'
        : '左边箱子的温度很快升高，鱼容易变质；右边箱子里的冰<b>熔化吸热</b>，熔化过程中温度保持 0 ℃ 不变，所以能长时间给海鲜保鲜。';
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const c = cfg(), cel = st.mode === 'cellar';
      ctx.fillStyle = cel ? '#1c2a48' : '#e7f5ff'; ctx.fillRect(0, 0, VW, 300);
      if (cel) { ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(900, 50, 22, 0, TAU); ctx.fill(); ctx.fillStyle = '#1c2a48'; ctx.beginPath(); ctx.arc(890, 44, 20, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; [[120, 40], [300, 70], [520, 30], [700, 60]].forEach(([x, y]) => ctx.fillRect(x, y, 2, 2)); }
      else { ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(900, 56, 30, 0, TAU); ctx.fill(); }
      const hour = (c.clock + st.t) % 24;
      D.text(ctx, (cel ? '🌙 ' : '☀️ ') + String(Math.floor(hour)).padStart(2, '0') + ':' + String(Math.floor((hour % 1) * 60)).padStart(2, '0') + '　室外 ' + PS.fmtT(c.Tout), 30, 36, { size: F(15), weight: 800, color: cel ? '#fff' : '#1b2333' });
      [[260, a, false], [740, b, true]].forEach(([x, s, withW]) => {
        const T = s.T, bad = cel ? T < c.danger : T > c.danger;
        if (cel) {
          ctx.fillStyle = '#8d6e63'; ctx.fillRect(x - 230, 120, 460, 180);
          ctx.fillStyle = '#5d4037'; ctx.fillRect(x - 200, 140, 400, 150);
          ctx.fillStyle = PS.mixColor('#6d4c41', '#90caf9', PS.clamp((4 - T) / 12, 0, 1)); ctx.fillRect(x - 192, 148, 384, 134);
          ctx.fillStyle = '#e9ecef'; ctx.fillRect(x - 230, 112, 460, 10);
        } else {
          ctx.fillStyle = '#f8f9fa'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 3;
          D.roundRect(ctx, x - 200, 130, 400, 160, 12); ctx.fill(); ctx.stroke();
          ctx.fillStyle = PS.mixColor('#d0ebff', '#ffe3e3', PS.clamp((T - 2) / 14, 0, 1)); ctx.fillRect(x - 188, 142, 376, 136);
        }
        ctx.font = F(30, 20) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        (cel ? ['🥬', '🥔', '🥬', '🥕'] : ['🐟', '🦐', '🐟']).forEach((e, i) => { ctx.globalAlpha = bad ? 0.45 : 1; ctx.fillText(e, x - 150 + i * 56, 250); });
        ctx.globalAlpha = 1;
        if (withW) {
          const fr = iceFrac(c, s.H);
          if (cel) for (let i = 0; i < 2; i++) {
            const bx = x + 90 + i * 60, by = 280;
            ctx.fillStyle = '#868e96'; D.roundRect(ctx, bx - 24, by - 76, 48, 76, 6); ctx.fill();
            ctx.fillStyle = '#74c0fc'; ctx.fillRect(bx - 20, by - 66, 40, 62);
            ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(bx - 20, by - 66, 40, 62 * fr);
          } else for (let i = 0; i < 5; i++) {
            const s2 = 22 * Math.sqrt(Math.max(0.05, fr));
            ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#91c4ee'; ctx.lineWidth = 1.5;
            const ix = x + 40 + (i % 3) * 44, iy = 190 + Math.floor(i / 3) * 40;
            if (fr > 0.02) { D.roundRect(ctx, ix - s2 / 2, iy - s2 / 2, s2, s2, 4); ctx.fill(); ctx.stroke(); }
          }
          if (!cel && fr < 1) { ctx.fillStyle = 'rgba(116,192,252,.45)'; ctx.fillRect(x - 188, 278 - (1 - fr) * 18, 376, (1 - fr) * 18); }
          const lbl = cel ? (fr <= 0 ? '水' : fr >= 1 ? '全部结冰' : '正在结冰：凝固放热') : (fr >= 1 ? '冰' : fr <= 0 ? '冰全部熔化了' : '冰在熔化：熔化吸热');
          D.text(ctx, lbl, x + 120, 104, { size: F(13), weight: 800, color: cel ? '#ffe066' : '#1c7ed6', align: 'center', baseline: 'middle', bg: cel ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.9)' });
        }
        D.text(ctx, (withW ? (cel ? '放了几桶水' : '加了冰块') : (cel ? '什么都不放' : '不加冰')) + '：' + PS.fmtT(T, 1), x - 190, 104, { size: F(15), weight: 800, color: bad ? '#ff6b6b' : cel ? '#fff' : '#1b2333', baseline: 'middle' });
        if (bad) D.text(ctx, '⚠️ ' + c.dangerText, x, 165, { size: F(13), weight: 800, color: '#e03131', align: 'center', baseline: 'middle', bg: 'rgba(255,255,255,.92)' });
      });
      // 温度—时间图像
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 300, VW, VH - 300);
      const lo = cel ? -16 : 0, hi = cel ? 6 : 32;
      const ch = PS.tchart(ctx, { x: 90, y: 340, w: 840, h: 210 }, { t0: 0, t1: c.hours, T0: lo, T1: hi, tStep: 1, TStep: cel ? 2 : 4, F, fs: F(12), xl: '时间/h' });
      ch.hline(0, '#7048e8', '0 ℃');
      ch.hline(c.danger, '#e03131', c.dangerText.replace(/，.*/, ''));
      ch.line(st.A, '#e8590c', 3);
      ch.line(st.B, '#1c7ed6', 3);
      D.text(ctx, '━ ' + (cel ? '不放水' : '不加冰'), 800, 326, { size: F(13), weight: 800, color: '#e8590c', align: 'right' });
      D.text(ctx, '━ ' + (cel ? '放了水' : '加了冰'), 930, 326, { size: F(13), weight: 800, color: '#1c7ed6', align: 'right' });
      ctx.restore();
    }
    reset(); loop.start();
  });
})();
