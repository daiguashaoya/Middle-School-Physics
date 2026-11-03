/* 第13章第2节：内能——内能的组成、内能与机械能、比较内能的大小、热传递的三种方式、热传递与热量、做功改变内能的实例、做功还是热传递、温度热量和内能。依赖 heat.js、energy.js、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, TH = PS.th, TC = PS.TC, EN = PS.en, EC = PS.EC;
  const TAU = Math.PI * 2;
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /** 堆叠柱：每根柱子下段为分子动能、上段为分子势能，整根为内能。items = [{ n, k, p }] */
  function stackBars(ctx, x, y, w, hh, items, o) {
    const F = o.F, max = o.max, n = items.length;
    const top = y + F(16) * 1.3 + 8, bot = y + hh - F(13) * 1.4 - 10;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, x, y, w, hh, 10); ctx.fill(); ctx.stroke();
    D.text(ctx, o.title || '内能（示意）', x + w / 2, y + F(16) + 2, { size: F(15), weight: 800, align: 'center', color: TC.u });
    const gap = w / n, bw = Math.min(gap * 0.5, 90);
    ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 8, bot); ctx.lineTo(x + w - 8, bot); ctx.stroke();
    items.forEach((it, i) => {
      const cx = x + gap * (i + 0.5), H = bot - top, hk = (it.k / max) * H, hp = (it.p / max) * H;
      ctx.fillStyle = TC.k; D.roundRect(ctx, cx - bw / 2, bot - hk, bw, hk, 3); ctx.fill();
      ctx.fillStyle = TC.p; D.roundRect(ctx, cx - bw / 2, bot - hk - hp, bw, hp, 3); ctx.fill();
      ctx.strokeStyle = TC.u; ctx.lineWidth = 2.5; D.roundRect(ctx, cx - bw / 2 - 3, bot - hk - hp - 3, bw + 6, hk + hp + 3, 5); ctx.stroke();
      if (it.ghost) { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; const gh = (it.ghost / max) * H; ctx.beginPath(); ctx.moveTo(cx - bw / 2 - 12, bot - gh); ctx.lineTo(cx + bw / 2 + 12, bot - gh); ctx.stroke(); ctx.setLineDash([]); }
      D.text(ctx, it.n, cx, bot + F(13) * 1.15 + 2, { size: F(13), weight: 800, align: 'center', color: '#343a40' });
    });
    ctx.restore();
  }
  function legend(ctx, x, y, F) {
    ctx.save();
    const s = F(12);
    [[TC.k, '分子动能'], [TC.p, '分子势能']].forEach(([c, t], i) => { ctx.fillStyle = c; ctx.fillRect(x + i * s * 6.2, y - s * 0.8, s, s); D.text(ctx, t, x + i * s * 6.2 + s * 1.4, y, { size: s, weight: 700, color: '#495057' }); });
    ctx.restore();
  }

  /* ================= 内能：所有分子的动能与分子势能的总和 ================= */
  PS.register('ie-model', function (el) {
    const VW = 1000;
    const st = { mode: 'T', T: 20 };
    const seg = PS.ui.seg([{ value: 'T', label: '温度不同' }, { value: 'm', label: '质量不同' }, { value: 's', label: '状态不同' }], st.mode, (v) => { st.mode = v; sl.el.style.display = v === 's' ? 'none' : ''; tell(); });
    seg.el.style.flexWrap = 'wrap';
    const sl = PS.ui.slider({ label: '铁块的温度', min: -40, max: 200, step: 1, value: st.T, unit: '℃', onInput: (v) => { st.T = v; tell(); } });
    sl.el.classList.add('wide');
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 900 : 480), draw });
    const msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(sl.el), msg);
    const lat = (cols, rows) => { const a = []; for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) a.push({ i, j, ph: Math.random() * TAU, ph2: Math.random() * TAU, w: 0.8 + Math.random() * 0.5 }); return a; };
    const A = lat(5, 4), B = lat(10, 4);
    const ice = PS.Mols(24, { w: 230, h: 190, r: 13 }), wat = PS.Mols(24, { w: 230, h: 190, r: 13 });
    ice.setState('solid'); wat.setState('liquid');
    const KE = (T, N) => N * (T + 273), PE = (T, N) => N * (250 + 0.1 * (T + 273));
    function tell() {
      let s;
      if (st.mode === 'T') s = st.T < 0 ? '铁块的温度很低，分子的热运动减弱了，但<b>并没有停止</b>，所以铁块仍然有内能。<b>一切物体，不论温度高低，都具有内能。</b>' : '<b>同一物体，温度越高，分子热运动越剧烈，分子动能越大，内能越大。</b>温度降低时，内能减小。虚线是 20 ℃ 时内能的大小。';
      else if (st.mode === 'm') s = '温度相同的两块铁，分子热运动的剧烈程度相同，但 2 kg 的铁块中分子的数目是 1 kg 铁块的 2 倍，所以<b>同种物质、温度相同时，质量越大，内能越大</b>。';
      else s = '质量都是 1 kg、温度都是 0 ℃ 的冰和水，分子动能相同；但冰熔化成水要<b>吸收热量</b>，这些能量使分子势能增大，所以 <b>0 ℃ 的水的内能比 0 ℃ 的冰大</b>。物体的状态改变时，内能也会改变。';
      msg.innerHTML = s;
    }
    PS.loop((dt) => { ice.step(dt, 0.25); wat.step(dt, 0.25); S.render(); }, el).start();
    function block(ctx, x, y, cols, rows, T, F, label, mols) {
      const sp = 46, w = cols * sp + 20, hh = rows * sp + 20, t = performance.now() / 1000;
      const f = Math.pow((T + 273) / 293, 1.5), amp = 8 * f, c = TH.heatColor(PS.clamp((T + 40) / 240, 0, 1));
      ctx.fillStyle = '#eef1f6'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; D.roundRect(ctx, x, y, w, hh, 10); ctx.fill(); ctx.stroke();
      const P = mols.map((m) => [x + 10 + sp / 2 + m.i * sp + Math.sin(t * 7 * f * m.w + m.ph) * amp, y + 10 + sp / 2 + m.j * sp + Math.cos(t * 6 * f * m.w + m.ph2) * amp]);
      ctx.strokeStyle = 'rgba(12,133,153,.45)'; ctx.lineWidth = 2;
      mols.forEach((m, k) => mols.forEach((n, q) => { if (q > k && Math.abs(m.i - n.i) + Math.abs(m.j - n.j) === 1) { ctx.beginPath(); ctx.moveTo(P[k][0], P[k][1]); ctx.lineTo(P[q][0], P[q][1]); ctx.stroke(); } }));
      P.forEach(([px, py]) => TH.ball(ctx, px, py, 13, c));
      D.text(ctx, label, x + w / 2, y + hh + F(14) * 1.3, { size: F(14), weight: 800, align: 'center', color: '#343a40' });
      return { w, hh };
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const bars = nar ? { x: 120, y: 470, w: 760, h: VH - 470 - F(12) * 2 - 20 } : { x: 650, y: 30, w: 320, h: VH - 60 - F(12) * 1.5 };
      const ly = nar ? VH - 14 : VH - 16;
      if (st.mode === 'T') {
        const k1 = nar ? 1.3 : 1.45;
        ctx.save(); ctx.translate(nar ? 500 - 125 * k1 : 330 - 125 * k1, nar ? 40 : 50); ctx.scale(k1, k1);
        block(ctx, 0, 0, 5, 4, st.T, (p) => F(p) / k1, '1 kg 的铁块，' + PS.fmtT(st.T), A);
        ctx.restore();
        stackBars(ctx, bars.x, bars.y, bars.w, bars.h, [{ n: PS.fmtT(st.T), k: KE(st.T, 20), p: PE(st.T, 20), ghost: KE(20, 20) + PE(20, 20) }], { F, max: KE(200, 20) + PE(200, 20) });
      } else if (st.mode === 'm') {
        const s1 = nar ? 0.8 : 0.62;
        ctx.save(); ctx.translate(nar ? 30 : 20, 70); ctx.scale(s1, s1);
        block(ctx, 0, 0, 5, 4, st.T, (p) => F(p) / s1, '1 kg', A);
        ctx.restore();
        ctx.save(); ctx.translate(nar ? 30 + 270 * s1 + 30 : 20 + 270 * s1, 70); ctx.scale(s1, s1);
        block(ctx, 0, 0, 10, 4, st.T, (p) => F(p) / s1, '2 kg（温度相同：' + PS.fmtT(st.T) + '）', B);
        ctx.restore();
        stackBars(ctx, bars.x, bars.y, bars.w, bars.h, [{ n: '1 kg', k: KE(st.T, 20), p: PE(st.T, 20) }, { n: '2 kg', k: KE(st.T, 40), p: PE(st.T, 40) }], { F, max: KE(200, 40) + PE(200, 40) });
      } else {
        const bx = nar ? [150, 610] : [40, 330], by = 80;
        [[ice, '1 kg、0 ℃ 的冰'], [wat, '1 kg、0 ℃ 的水']].forEach(([M, n], i) => {
          ctx.fillStyle = i ? '#e7f5ff' : '#f1f3f5'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; D.roundRect(ctx, bx[i] - 10, by - 10, 250, 210, 10); ctx.fill(); ctx.stroke();
          M.draw(ctx, bx[i], by, { color: () => (i ? '#15aabf' : '#4c6ef5') });
          D.text(ctx, n, bx[i] + 115, by + 200 + F(14) * 1.4, { size: F(14), weight: 800, align: 'center', color: '#343a40' });
        });
        stackBars(ctx, bars.x, bars.y, bars.w, bars.h, [{ n: '冰', k: KE(0, 20), p: PE(0, 20) }, { n: '水', k: KE(0, 20), p: PE(0, 20) + 2300 }], { F, max: KE(0, 20) + PE(0, 20) + 2600 });
      }
      legend(ctx, bars.x + 10, ly, F);
    }
    tell();
  });

  /* ================= 内能与机械能 ================= */
  PS.register('ie-mech', function (el) {
    const VW = 1000, m = 0.5, g = 10, c = 460, U0 = c * m * 293; // 0.5 kg 铁球；内能按 c·m·(T + 273) 估算，只作示意
    const st = { y: 0, v: 0, x: 0, vx: 0, T: 20, Tto: 20, mode: 'rest', liftTo: 0, bounce: 0 };
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 900 : 470), draw });
    const msg = h('div', { class: 'th-msg info' });
    const B = (t, f, cls) => PS.ui.button(t, f, cls || 'btn btn-sm');
    el.append(PS.ui.row(
      B('静止在地面上', () => { st.mode = 'rest'; st.y = 0; st.v = 0; st.x = 0; tell(); }),
      B('举高到 2 m', () => { st.mode = 'lift'; st.v = 0; tell(); }),
      B('从 2 m 高处落下', () => { st.mode = 'fall'; st.y = 2; st.v = 0; st.x = 0; st.bounce = 0; tell(); }, 'btn btn-primary btn-sm'),
      B('🔥 加热到 80 ℃', () => { st.Tto = 80; tell(); }),
      B('❄ 冷却到 −20 ℃', () => { st.Tto = -20; tell(); })), msg);
    function tell() {
      let s;
      const Ek = 0.5 * m * st.v * st.v, Ep = m * g * st.y;
      if (st.mode === 'done' && st.bounce > 0) s = '小球弹跳几次后停在地面上，机械能变为零——减少的机械能转化成了<b>内能</b>，小球（和地面）的温度略微升高了。<b>内能和机械能可以相互转化。</b>';
      else if (Ek + Ep < 1e-6) s = '静止在地面上的小球，动能和重力势能都为零（以地面为参照），<b>机械能为零</b>；但它的分子仍在不停地运动，<b>内能不为零</b>。';
      else s = '小球的位置、速度变化时，<b>机械能</b>改变，但只要温度、质量、状态不变，<b>内能</b>就不变——内能与物体整体的机械运动情况无关，而与物体内部分子的热运动和相互作用情况有关。';
      if (Math.abs(st.Tto - 20) > 1) s += '<br>改变小球的温度时，机械能不变，内能随温度改变：温度越高，内能越大。';
      msg.className = 'th-msg ' + (st.mode === 'done' && st.bounce > 0 ? 'ok' : 'info'); msg.innerHTML = s;
    }
    PS.loop((dt) => {
      if (st.mode === 'lift') { st.y = Math.min(2, st.y + dt * 1.5); if (st.y >= 2) { st.mode = 'hold'; tell(); } }
      if (st.mode === 'fall') {
        for (let k = 0; k < 4; k++) {
          const d = dt / 4;
          if (st.y > 0 || st.v > 0) { st.v -= g * d; st.y += st.v * d; }
          if (st.y < 0) { const E = 0.5 * m * st.v * st.v; st.y = 0; st.v = Math.abs(st.v) * 0.72; const lost = E - 0.5 * m * st.v * st.v; st.T += lost / (c * m); st.Tto += lost / (c * m); if (st.v < 0.35) st.v = 0; st.bounce++; PS.sound.clack(); }
        }
        if (st.y <= 0 && st.v <= 0) { st.y = 0; st.v = 0; st.mode = 'done'; tell(); }
      }
      st.T += (st.Tto - st.T) * Math.min(1, dt * 1.5);
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const GY = nar ? 440 : VH - 50, H2 = GY - 70, Y = (y) => GY - 26 - (y / 2.2) * (H2 - 30), bx = nar ? 480 : 230, rx = nar ? 190 : 70;
      ctx.fillStyle = '#c9b38a'; ctx.fillRect(0, GY, nar ? VW : 520, 20); ctx.fillStyle = '#adb5bd'; ctx.fillRect(0, GY + 20, nar ? VW : 520, 6);
      // 高度尺
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx, GY); ctx.lineTo(rx, Y(2.2)); ctx.stroke();
      for (let v = 0; v <= 2; v += nar ? 1 : 0.5) { ctx.beginPath(); ctx.moveTo(rx, Y(v)); ctx.lineTo(rx + 14, Y(v)); ctx.stroke(); D.text(ctx, PS.fmt(v, nar ? 0 : 1) + ' m', rx - 8, Y(v) + 5, { size: F(12), weight: 700, align: 'right', color: '#495057' }); }
      // 小球
      const f = PS.clamp((st.T + 20) / 100, 0, 1);
      EN.ball(ctx, bx, Y(st.y), 26, PS.mixColor('#adb5bd', '#ff8787', f), PS.mixColor('#495057', '#c92a2a', f));
      if (Math.abs(st.T - 20) > 0.5 || st.bounce) D.text(ctx, PS.fmtT(st.T, st.bounce && Math.abs(st.Tto - 20) < 1 ? 2 : 0), bx + 36, Y(st.y) - 20, { size: F(14), weight: 800, color: TC.hot });
      if (st.v && st.mode === 'fall') D.arrow(ctx, bx, Y(st.y) + (st.v < 0 ? 30 : -30), bx, Y(st.y) + (st.v < 0 ? 30 + Math.min(80, -st.v * 12) : -30 - Math.min(80, st.v * 12)), { color: EC.k, width: 4 });
      D.text(ctx, '0.5 kg 的铁球', bx, GY + 20 + F(13) * 1.3 + 6, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      // 能量柱
      const Ek = 0.5 * m * st.v * st.v, Ep = m * g * st.y;
      const b1 = nar ? { x: 60, y: 540, w: 560, h: VH - 560 } : { x: 540, y: 30, w: 270, h: VH - 60 };
      EN.bars(ctx, b1.x, b1.y, b1.w, b1.h, [{ n: '动能', v: Ek, c: EC.k }, { n: '重力\n势能', v: Ep, c: EC.g }, { n: '机械能', v: Ek + Ep, c: EC.m }], { F, max: 11, title: '机械能', lines: 2, fmt: (v) => PS.fmt(v, 1) + ' J' });
      const b2 = nar ? { x: 640, y: 540, w: 300, h: VH - 560 } : { x: 830, y: 30, w: 150, h: VH - 60 };
      const U = c * m * (st.T + 273) + 0, Umax = c * m * (80 + 273) * 1.08;
      EN.bars(ctx, b2.x, b2.y, b2.w, b2.h, [{ n: '内能\n（示意）', v: U, c: EC.q }], { F, max: Umax, title: '内能', lines: 2, values: false });
      if (!nar) D.text(ctx, '不为零', b2.x + b2.w / 2, b2.y + b2.h * 0.5, { size: F(13), weight: 800, align: 'center', color: '#fff' });
    }
    tell();
  });

  /* ================= 比较内能的大小 ================= */
  PS.register('ie-compare', function (el) {
    PS.sortCards(el, [
      ['甲：一杯 80 ℃ 的水<br>乙：同一杯水冷却到 20 ℃', 0, '同一物体，温度越高，内能越大。'],
      ['甲：1 kg、0 ℃ 的冰<br>乙：1 kg、0 ℃ 的水', 1, '0 ℃ 的冰熔化成 0 ℃ 的水要吸收热量，内能增加。'],
      ['甲：一桶 20 ℃ 的水<br>乙：一杯 20 ℃ 的水', 0, '同种物质、温度相同时，质量越大，内能越大。'],
      ['甲：静止在地面上的铅球（20 ℃）<br>乙：同一个铅球被举高 2 m（20 ℃）', 2, '内能与物体的高度无关；乙的机械能大，内能一样大。'],
      ['甲：高速飞行的子弹（20 ℃）<br>乙：同一颗子弹静止在桌上（20 ℃）', 2, '内能与物体整体的运动速度无关。'],
      ['甲：−10 ℃ 的冰块<br>乙：同一块冰升温到 −2 ℃', 1, '温度升高，分子热运动更剧烈，内能增大。'],
      ['甲：1 kg、100 ℃ 的水<br>乙：1 kg、100 ℃ 的水蒸气', 1, '水汽化成同温度的水蒸气要吸收热量，内能增大。'],
      ['甲：一小杯 90 ℃ 的热水<br>乙：一大桶 30 ℃ 的温水', 3, '质量和温度都不同，只凭温度不能判断内能的大小。'],
      ['甲：在阳光下晒了一上午的棉被<br>乙：早上刚拿出来的同一床棉被', 0, '晒过以后棉被吸收了热量，温度升高，内能增大。'],
    ], ['甲的大', '乙的大', '一样大', '无法比较']);
  });

  /* ================= 热传递的三种方式 ================= */
  PS.register('transfer-ways', function (el) {
    const VW = 1000;
    const MAT = { cu: { n: '铜棒', a: 80, c: '#e8935a' }, fe: { n: '铁棒', a: 16, c: '#868e96' }, glass: { n: '玻璃棒', a: 0.25, c: '#c5f6fa' } };
    const N = 40, TACK = [6, 13, 20, 27, 34];
    const st = { s: 'cond', mat: 'cu', run: false, t: 0, T: [], fall: [], shield: false, Tm: 20 };
    const seg = PS.ui.seg([{ value: 'cond', label: '热传导' }, { value: 'conv', label: '对流' }, { value: 'rad', label: '热辐射' }], st.s, (v) => { st.s = v; reset(); });
    const mSeg = PS.ui.seg(Object.keys(MAT).map((k) => ({ value: k, label: MAT[k].n })), st.mat, (v) => { st.mat = v; reset(); });
    const shT = PS.ui.toggle('中间放一块挡板', false, (v) => { st.shield = v; tell(); });
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 700 : 460), draw });
    const msg = h('div', { class: 'th-msg info' });
    const extra = h('div', { class: 'controls' });
    el.append(PS.ui.row(PS.ui.button('🔥 开始加热', () => { st.run = true; tell(); }, 'btn btn-primary btn-sm'), PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), extra, msg);
    const P = Array.from({ length: 70 }, (_, i) => ({ x: hash(i) * 0.9 + 0.05, y: hash(i + 99) * 0.9 + 0.05, tr: [] }));
    function reset() {
      st.run = false; st.t = 0; st.T = Array(N).fill(20); st.fall = TACK.map(() => 0); st.Tm = 20;
      P.forEach((p, i) => { p.x = 0.12 + 0.1 * hash(i); p.y = 0.82 + 0.12 * hash(i + 7); p.tr = []; });
      extra.innerHTML = '';
      if (st.s === 'cond') extra.append(mSeg.el); else if (st.s === 'rad') extra.append(shT.el);
      tell();
    }
    function tell() {
      let s;
      if (st.s === 'cond') {
        const n = st.fall.filter((f) => f > 0).length;
        s = '用蜡在' + MAT[st.mat].n + '上粘几根火柴，用酒精灯加热棒的一端。';
        if (st.run) s = n ? '火柴从靠近火焰的一端开始，<b>依次</b>掉下来：热量从温度高的一端沿着棒传到温度低的一端——这种方式叫做<b>热传导</b>（已掉下 ' + n + ' 根）。' : '加热中……';
        if (st.run && st.t > 8) s += st.mat === 'glass' ? '<br>玻璃棒上的火柴迟迟不掉：<b>玻璃不善于传热</b>，是热的不良导体。' : st.mat === 'fe' ? '<br>铁棒传热比铜棒慢一些。<b>金属善于传热</b>，是热的良导体。' : '<br>铜棒传热最快。<b>金属善于传热</b>，是热的良导体。';
      } else if (st.s === 'conv') s = st.run ? '烧杯底部左侧的水受热后温度升高、密度变小而<b>上升</b>，上面的冷水<b>下沉</b>补充，形成循环流动——靠液体或气体的流动来传热的方式叫做<b>对流</b>。所以暖气片要装在房间的下面，空调要装在上面。' : '在烧杯底部左侧放几粒高锰酸钾（紫色），用酒精灯在下面加热，观察紫色的水怎样流动。';
      else s = st.shield ? '中间放上挡板后，温度计几乎不再升温：<b>热辐射</b>像光一样沿直线传播，能被挡住。' : st.run ? '电暖器不接触温度计，中间也不需要水或空气流动，温度计的示数却升高了——热量以<b>热辐射</b>的方式直接传了过去。热辐射<b>不需要介质</b>，太阳的热就是通过热辐射穿过真空传到地球的。' : '点“开始加热”，看看电暖器发出的热怎样传到右边的温度计。';
      msg.innerHTML = s;
    }
    PS.loop((dt) => {
      if (st.run) {
        st.t += dt;
        if (st.s === 'cond') {
          const a = MAT[st.mat].a, sub = Math.ceil((dt * 2) / 0.004), d = (dt * 2) / sub, T = st.T, hl = 0.05;
          for (let k = 0; k < sub; k++) {
            const n = T.slice();
            for (let i = 0; i < N; i++) {
              const L = i ? T[i - 1] : T[i], R = i < N - 1 ? T[i + 1] : T[i];
              n[i] = T[i] + d * (a * (L - 2 * T[i] + R) - hl * (T[i] - 20));
            }
            n[0] = n[1] = 420;
            for (let i = 0; i < N; i++) T[i] = n[i];
          }
          TACK.forEach((c, i) => { if (!st.fall[i] && st.T[c] > 60) { st.fall[i] = 0.001; PS.sound.tick(); tell(); } if (st.fall[i] && st.fall[i] < 1) st.fall[i] = Math.min(1, st.fall[i] + dt * 2); });
        } else if (st.s === 'conv') {
          P.forEach((p) => {
            const u = Math.PI * Math.sin(Math.PI * p.x) * Math.cos(Math.PI * p.y), v = -Math.PI * Math.cos(Math.PI * p.x) * Math.sin(Math.PI * p.y);
            p.x += u * dt * 0.09 + PS.gauss() * 0.002; p.y += v * dt * 0.09 + PS.gauss() * 0.002;
            p.x = PS.clamp(p.x, 0.03, 0.97); p.y = PS.clamp(p.y, 0.03, 0.97);
            p.tr.push([p.x, p.y]); if (p.tr.length > 40) p.tr.shift();
          });
        } else if (!st.shield) st.Tm += (60 - st.Tm) * dt * 0.06;
        else st.Tm += (20 - st.Tm) * dt * 0.02;
      }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const GY = VH - 20;
      if (st.s === 'cond') {
        const x0 = 150, x1 = 930, ry = nar ? 220 : 170, rh = 22, cw = (x1 - x0) / N;
        // 支架
        ctx.fillStyle = '#495057'; ctx.fillRect(900, ry, 12, GY - ry); ctx.fillRect(860, GY - 12, 90, 12);
        for (let i = 0; i < N; i++) { const f = PS.clamp((st.T[i] - 20) / 450, 0, 1); ctx.fillStyle = f > 0.02 ? PS.mixColor(MAT[st.mat].c.length === 7 ? MAT[st.mat].c : '#868e96', '#ff3b1f', f) : MAT[st.mat].c; ctx.fillRect(x0 + i * cw, ry, cw + 0.6, rh); }
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, ry, x1 - x0, rh);
        TACK.forEach((c, i) => {
          const x = x0 + (c + 0.5) * cw, f = st.fall[i], fy = f * f * (GY - ry - 90);
          ctx.save(); ctx.translate(x, ry + rh + fy); ctx.rotate(f * 1.2);
          ctx.fillStyle = f ? 'rgba(255,236,153,.4)' : '#fff3bf'; if (!f) { ctx.beginPath(); ctx.arc(0, 4, 9, 0, TAU); ctx.fill(); }
          ctx.fillStyle = '#c98d3e'; ctx.fillRect(-3, 2, 6, 70); ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.ellipse(0, 76, 6, 9, 0, 0, TAU); ctx.fill();
          ctx.restore();
        });
        const ls = nar ? 1.25 : 1.05, lb = ry + rh + 130 * ls - 8;
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(x0 + 1.2 * cw - 60, lb, 120, GY - lb); ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1.2 * cw - 60, lb, 120, GY - lb);
        PS.lamp(ctx, x0 + 1.2 * cw, lb, ls, { on: st.run, t });
        D.text(ctx, MAT[st.mat].n, x1 - 6, ry - 12, { size: F(15), weight: 800, align: 'right', color: '#343a40' });
        D.text(ctx, '火柴用蜡粘在棒的下面', 560, GY - 20, { size: F(12), color: '#868e96', align: 'center' });
      } else if (st.s === 'conv') {
        const bw = nar ? 520 : 420, bh = nar ? 420 : 300, cx = nar ? 500 : 380, by = GY - (nar ? 120 : 95);
        PS.beaker(ctx, cx, by, bw, bh, { level: 0.9, water: '#d0ebff' });
        const L = cx - bw / 2 + 4, Wd = bw - 8, Tp = by - bh * 0.9 + 6, Hd = bh * 0.9 - 12;
        if (st.run) { const g = ctx.createLinearGradient(L, 0, L + Wd, 0); g.addColorStop(0, 'rgba(255,135,135,.35)'); g.addColorStop(0.5, 'rgba(255,135,135,0)'); ctx.fillStyle = g; ctx.fillRect(L, Tp, Wd, Hd); }
        P.forEach((p) => {
          if (p.tr.length > 1) { ctx.strokeStyle = 'rgba(156,54,181,.25)'; ctx.lineWidth = 3; ctx.beginPath(); p.tr.forEach(([x, y], i) => (i ? ctx.lineTo(L + x * Wd, Tp + y * Hd) : ctx.moveTo(L + x * Wd, Tp + y * Hd))); ctx.stroke(); }
          ctx.fillStyle = '#9c36b5'; ctx.beginPath(); ctx.arc(L + p.x * Wd, Tp + p.y * Hd, 4, 0, TAU); ctx.fill();
        });
        PS.lamp(ctx, cx - bw * 0.3, GY, nar ? 0.9 : 0.75, { on: st.run, t });
        ctx.fillStyle = '#495057'; ctx.fillRect(cx - bw / 2 - 20, by, bw + 40, 8);
        if (st.run) { D.arrow(ctx, L + Wd * 0.18, Tp + Hd * 0.75, L + Wd * 0.18, Tp + Hd * 0.25, { color: TC.hot, width: 4, head: 14 }); D.arrow(ctx, L + Wd * 0.82, Tp + Hd * 0.25, L + Wd * 0.82, Tp + Hd * 0.75, { color: TC.cold, width: 4, head: 14 }); }
        if (!nar) { D.text(ctx, '热水上升', 700, 120, { size: F(15), weight: 800, color: TC.hot }); D.text(ctx, '冷水下沉', 700, 160, { size: F(15), weight: 800, color: TC.cold }); D.text(ctx, '紫色的是高锰酸钾溶液', 700, 210, { size: F(13), color: '#9c36b5' }); }
      } else {
        // 电暖器
        const hx = 160, hy = nar ? 200 : 150;
        ctx.fillStyle = '#495057'; D.roundRect(ctx, hx - 90, hy - 90, 180, 200, 12); ctx.fill();
        for (let i = 0; i < 4; i++) { ctx.fillStyle = st.run ? PS.mixColor('#ff8787', '#ffd43b', 0.3 + 0.2 * Math.sin(t * 3 + i)) : '#868e96'; D.roundRect(ctx, hx - 70, hy - 70 + i * 44, 140, 22, 11); ctx.fill(); }
        ctx.fillStyle = '#343a40'; ctx.fillRect(hx - 60, hy + 110, 120, 14); ctx.fillRect(hx - 8, hy + 110, 16, GY - hy - 110);
        D.text(ctx, '电暖器', hx, hy - 104, { size: F(14), weight: 700, align: 'center', color: '#495057' });
        const tx = nar ? 820 : 800;
        if (st.run) for (let k = 0; k < 5; k++) { const ph = (t * 0.6 + k / 5) % 1, x = hx + 100 + ph * (tx - hx - 140); if (st.shield && x > 520) continue; ctx.strokeStyle = 'rgba(240,62,62,' + (0.55 * (1 - ph * 0.6)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); for (let yy = -70; yy <= 70; yy += 4) { const xx = x + Math.sin(yy * 0.15 + t * 5) * 6; yy === -70 ? ctx.moveTo(xx, hy + yy + 20) : ctx.lineTo(xx, hy + yy + 20); } ctx.stroke(); }
        if (st.shield) { ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#868e96'; ctx.fillRect(520, hy - 110, 18, 260); ctx.strokeRect(520, hy - 110, 18, 260); D.text(ctx, '挡板', 529, hy - 120, { size: F(13), weight: 700, align: 'center', color: '#495057' }); }
        PS.thermo(ctx, { x: tx, top: hy - 120, bulbY: hy + 130, min: 0, max: 80, div: 1, label: 10, value: st.Tm, w: 18, F, fs: F(12) });
        D.text(ctx, PS.fmtT(st.Tm, 1), tx + 70, hy + 130, { size: F(16), weight: 800, color: TC.hot });
        D.text(ctx, '空气不流动、不接触', 340, GY - 6, { size: F(12), color: '#868e96', align: 'center' });
      }
    }
    reset();
  });

  /* ================= 热传递与热量 ================= */
  PS.register('heat-flow', function (el) {
    const VW = 1000;
    const MAT = { fe1: { n: '1 kg 铁块', c: 460, m: 1, cols: 4 }, fe2: { n: '2 kg 铁块', c: 460, m: 2, cols: 8 }, water: { n: '1 kg 水', c: 4200, m: 1, cols: 4, liquid: true } };
    const st = { a: 'fe1', b: 'fe1', T1: 90, T2: 10, Q: 0, t: 0, run: false, hist: [], packets: [] };
    const aSeg = PS.ui.seg([{ value: 'fe1', label: '1 kg 铁块' }, { value: 'fe2', label: '2 kg 铁块' }], st.a, (v) => { st.a = v; reset(); });
    const bSeg = PS.ui.seg([{ value: 'fe1', label: '1 kg 铁块' }, { value: 'water', label: '1 kg 水' }], st.b, (v) => { st.b = v; reset(); });
    el.append(h('div', { class: 'controls' }, h('span', { class: 'small' }, '甲（90 ℃）：'), aSeg.el, h('span', { class: 'small' }, '乙（10 ℃）：'), bSeg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 860 : 520), draw });
    const rd = { a: PS.ui.readout('甲的温度', '90 ℃'), b: PS.ui.readout('乙的温度', '10 ℃'), q: PS.ui.readout('传递的热量 Q', '0 J') };
    const msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(PS.ui.button('▶ 让它们接触', () => { if (!st.run && st.t === 0) st.run = true; tell(); }, 'btn btn-primary btn-sm'), PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), h('div', { class: 'th-read' }, rd.a.el, rd.b.el, rd.q.el), msg);
    const MA = () => MAT[st.a], MB = () => MAT[st.b];
    const lat = (k) => Array.from({ length: 24 }, (_, i) => ({ i: i % 8, j: Math.floor(i / 8), ph: hash(i + k) * TAU, w: 0.8 + hash(i * 3 + k) * 0.5 }));
    const LA = lat(1), LB = lat(50);
    function reset() { st.T1 = 90; st.T2 = 10; st.Q = 0; st.t = 0; st.run = false; st.hist = [[0, 90, 10]]; st.packets = []; tell(); }
    function tell() {
      const C1 = MA().c * MA().m, C2 = MB().c * MB().m, Tf = (C1 * 90 + C2 * 10) / (C1 + C2);
      rd.a.set(PS.fmtT(st.T1, 1)); rd.b.set(PS.fmtT(st.T2, 1)); rd.q.set(TH.fmtQ(st.Q));
      let s;
      if (!st.run && st.t === 0) s = '甲的温度高（90 ℃），乙的温度低（10 ℃）。让它们接触，会发生什么？';
      else if (st.T1 - st.T2 > 0.3) s = '<b>热量从高温的甲传给低温的乙</b>：甲<b>放出热量</b>，温度降低，内能减少；乙<b>吸收热量</b>，温度升高，内能增加。右边分子的振动在变剧烈，左边在减弱。';
      else s = '甲、乙的温度相同（约 ' + PS.fmtT(Tf, 1) + '）时，热传递就停止了。在这个过程中，甲放出的热量等于乙吸收的热量：<b>Q放 = Q吸 = ' + TH.fmtQ(st.Q) + '</b>。<br>在热传递过程中，<b>传递内能的多少叫做热量</b>（单位 J）。热量是一个<b>过程量</b>，只能说“吸收”或“放出”热量，不能说物体“含有”或“具有”热量。' + (st.b === 'water' ? '<br>乙换成水后，最后的温度离 10 ℃ 更近——水吸收同样多的热量，温度升高得少（第3节“比热容”会学到）。' : '');
      msg.className = 'th-msg ' + (st.run && st.T1 - st.T2 <= 0.3 ? 'ok' : 'info'); msg.innerHTML = s;
    }
    PS.loop((dt) => {
      if (st.run) {
        const C1 = MA().c * MA().m, C2 = MB().c * MB().m, k = (C1 * C2) / (2.6 * (C1 + C2)) * (st.b === 'water' ? 1 : 1);
        const d = dt;
        const P = k * (st.T1 - st.T2);
        st.T1 -= (P * d) / C1; st.T2 += (P * d) / C2; st.Q += P * d; st.t += d;
        if (Math.random() < (st.T1 - st.T2) / 80 * dt * 30) st.packets.push({ p: 0, y: Math.random() });
        if (st.t - st.hist[st.hist.length - 1][0] > 0.15) st.hist.push([st.t, st.T1, st.T2]);
        if (st.T1 - st.T2 < 0.3) { st.run = false; st.T1 = st.T2 = (st.T1 * C1 + st.T2 * C2) / (C1 + C2); st.hist.push([st.t, st.T1, st.T2]); }
        if (Math.floor(st.t * 4) !== st.k) { st.k = Math.floor(st.t * 4); tell(); }
        if (!st.run) tell();
      }
      st.packets.forEach((p) => (p.p += dt * 0.9)); st.packets = st.packets.filter((p) => p.p < 1);
      S.render();
    }, el).start();
    function blk(ctx, x, y, M, T, L, F, name, right) {
      const sp = 40, cols = M.cols, w = cols * sp + 16, hh = 3 * sp + 16, t = performance.now() / 1000;
      const f = Math.pow((T + 273) / 293, 2), amp = 2 + 9 * (f - 0.75), c = TH.heatColor(PS.clamp(T / 90, 0, 1));
      ctx.fillStyle = M.liquid ? '#d0ebff' : '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2;
      const X = right ? x : x - w;
      D.roundRect(ctx, X, y, w, hh, 8); ctx.fill(); ctx.stroke();
      L.forEach((m) => { if (m.i >= cols) return; const px = X + 8 + sp / 2 + m.i * sp + Math.sin(t * 8 * f * m.w + m.ph) * amp + (M.liquid ? Math.sin(t * 0.7 + m.ph) * 8 : 0), py = y + 8 + sp / 2 + m.j * sp + Math.cos(t * 7 * f * m.w + m.ph * 1.7) * amp; TH.ball(ctx, px, py, 12, c); });
      D.text(ctx, name, X + w / 2, y - 12, { size: F(15), weight: 800, align: 'center', color: '#343a40' });
      TH.dthermo(ctx, X + w / 2, y + hh + F(16) * 1.2, T, { F, fs: 15 });
      return w;
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const cx = 500, by = F(15) * 1.3 + 30, sc = nar ? 1 : 1.15;
      ctx.save(); ctx.translate(cx, 0); ctx.scale(sc, sc); ctx.translate(-cx, 0);
      blk(ctx, cx - 3, by / sc, MA(), st.T1, LA, (p) => F(p) / sc, nar ? '甲' : '甲 ' + MA().n, false);
      blk(ctx, cx + 3, by / sc, MB(), st.T2, LB, (p) => F(p) / sc, nar ? '乙' : '乙 ' + MB().n, true);
      st.packets.forEach((p) => { const x = cx - 60 + p.p * 120, y = by / sc + 20 + p.y * 110; ctx.fillStyle = 'rgba(232,89,12,' + (1 - Math.abs(p.p - 0.5) * 1.4) + ')'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); });
      if (st.run) { const ay = by / sc + 136 + F(16) * 1.2 / sc; TH.qArrow(ctx, cx - 36, ay, cx + 36, ay, { w: 20 }); D.text(ctx, 'Q', cx, ay + F(13) * 1.3 / sc + 6, { size: F(13) / sc, weight: 800, align: 'center', color: TC.Q }); }
      ctx.restore();
      // T–t 图像
      const gy = by + (3 * 40 + 16) * sc + F(16) * 2.6 + 40, box = { x: 110, y: gy, w: 800, h: VH - gy - F(12) * 2.6 - 18 };
      const tmax = Math.max(10, st.t + 1);
      const ch = PS.tchart(ctx, box, { t0: 0, t1: tmax, T0: 0, T1: 100, tStep: tmax > 20 ? 5 : 2, TStep: 20, F, xl: '时间/s' });
      ch.line(st.hist.map((p) => [p[0], p[1]]), TC.hot, 3);
      ch.line(st.hist.map((p) => [p[0], p[2]]), TC.cold, 3);
      D.text(ctx, '甲', ch.X(st.t) + 8, ch.Y(st.T1) - 6, { size: F(13), weight: 800, color: TC.hot });
      D.text(ctx, '乙', ch.X(st.t) + 8, ch.Y(st.T2) + 16, { size: F(13), weight: 800, color: TC.cold });
    }
    reset();
  });

  /* ================= 做功改变物体的内能 ================= */
  PS.register('work-heat', function (el) {
    const VW = 1000;
    const SC = {
      rub: { n: '搓手取暖', act: '🖐 按住搓手', T0: 30, max: 42, k: 2.2, tau: 6, why: '两手互相摩擦，<b>克服摩擦做功</b>，机械能转化为内能，手的温度升高。' },
      wire: { n: '反复弯折铁丝', act: '🔧 按住来回弯折', T0: 20, max: 75, k: 9, tau: 5, why: '反复弯折铁丝，<b>对铁丝做功</b>，弯折处的内能增加、温度升高，摸上去烫手。' },
      drill: { n: '钻木取火', act: '🔥 按住快速转动木棒', T0: 20, max: 420, k: 28, tau: 9, why: '木棒与木板摩擦，<b>克服摩擦做功</b>，机械能转化为内能，温度达到木头的着火点就燃烧起来了。' },
      slide: { n: '从滑梯上滑下', act: '▶ 滑下来', T0: 30, max: 45, k: 0, tau: 8, why: '从滑梯上滑下时，<b>克服摩擦做功</b>，机械能转化为内能，臀部有灼热的感觉。' },
    };
    const st = { s: 'rub', T: 30, hold: false, ph: 0, W: 0, slide: -1, fire: 0 };
    const seg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k].n })), st.s, (v) => { st.s = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 700 : 440), draw });
    const act = h('button', { type: 'button', class: 'btn btn-primary' });
    const down = (e) => { e.preventDefault(); if (st.s === 'slide') { if (st.slide < 0 || st.slide >= 1) { st.slide = 0; } return; } st.hold = true; };
    const up = () => { st.hold = false; };
    act.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel'].forEach((e) => act.addEventListener(e, up));
    act.addEventListener('click', () => { if (st.s !== 'slide' && !st.hold) { st.T = Math.min(SC[st.s].max, st.T + SC[st.s].k * 0.35); st.W += 1; st.ph += 1.5; } });
    const msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(act, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), msg);
    function reset() { const c = SC[st.s]; st.T = c.T0; st.W = 0; st.hold = false; st.slide = -1; st.fire = 0; act.innerHTML = c.act; tell(); }
    function tell() {
      const c = SC[st.s];
      let s = st.T - c.T0 > (st.s === 'drill' ? 60 : 3) ? c.why : '点击或<b>按住</b>上面的按钮，观察温度的变化。';
      if (st.s === 'drill' && st.fire) s = '着火了！' + c.why;
      if (st.T - c.T0 > 3) s += '<br><span class="small">停止做功后，温度会慢慢降下来——物体通过热传递把内能传给周围的空气。</span>';
      msg.className = 'th-msg ' + (st.T - c.T0 > 3 ? 'ok' : 'info'); msg.innerHTML = s;
    }
    PS.loop((dt) => {
      const c = SC[st.s];
      if (st.hold) { st.T += c.k * dt * (1 - (st.T - c.T0) / (c.max - c.T0 + 1e-9) * 0.6); st.ph += dt * 14; st.W += dt; }
      if (st.s === 'slide' && st.slide >= 0 && st.slide < 1) { st.slide = Math.min(1, st.slide + dt / 1.8); if (st.slide > 0.15 && st.slide < 0.85) st.T += dt * 6; st.W += dt; }
      st.T = Math.min(c.max, st.T);
      st.T -= ((st.T - c.T0) / c.tau) * dt * (st.hold ? 0.3 : 1);
      if (st.s === 'drill' && st.T > 280 && !st.fire) { st.fire = 1; PS.sound.ping(); }
      if (Math.round(st.T) !== st.k) { st.k = Math.round(st.T); tell(); }
      S.render();
    }, el).start();
    function hand(ctx, x, y, s, flip, col) {
      ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s);
      ctx.fillStyle = col; ctx.strokeStyle = '#c98d6a'; ctx.lineWidth = 2;
      D.roundRect(ctx, -10, -70, 60, 120, 26); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { D.roundRect(ctx, -6 + i * 13, -125, 13, 64, 6); ctx.fill(); ctx.stroke(); }
      D.roundRect(ctx, 38, -40, 16, 50, 8); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), c = SC[st.s], t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const f = PS.clamp((st.T - c.T0) / (c.max - c.T0), 0, 1), GY = VH - 30, cx = nar ? 380 : 400;
      if (st.s === 'rub') {
        const dy = Math.sin(st.ph) * 30, col = PS.mixColor('#ffd8b5', '#ff8a7a', f);
        hand(ctx, cx - 12, GY - 140 + dy, 1.5, true, col);
        hand(ctx, cx + 12, GY - 140 - dy, 1.5, false, col);
        if (f > 0.15) TH.wave(ctx, cx, GY - 360, 60, t, { n: 3, gap: 40, color: 'rgba(240,62,62,' + f * 0.6 + ')' });
      } else if (st.s === 'wire') {
        const a = Math.sin(st.ph) * 0.6, bx = cx, by = GY - 170;
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx - 220, by); ctx.lineTo(bx, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * 200, by + Math.sin(a) * 200); ctx.stroke();
        const g = ctx.createRadialGradient(bx, by, 2, bx, by, 50); g.addColorStop(0, 'rgba(255,80,40,' + f + ')'); g.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 50, 0, TAU); ctx.fill();
        hand(ctx, bx - 210, by + 50, 0.8, false, '#ffd8b5'); hand(ctx, bx + Math.cos(a) * 190, by + Math.sin(a) * 190 + 50, 0.8, true, '#ffd8b5');
        D.text(ctx, '弯折处', bx, by - 40, { size: F(14), weight: 800, align: 'center', color: TC.hot });
      } else if (st.s === 'drill') {
        ctx.fillStyle = '#a9825a'; ctx.fillRect(cx - 220, GY - 40, 440, 40);
        const sx = cx, ang = st.ph;
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(sx - 9, GY - 300, 18, 262);
        for (let i = 0; i < 6; i++) { const yy = GY - 290 + i * 42 + ((ang * 8) % 42); if (yy < GY - 45) { ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 9, yy); ctx.lineTo(sx + 9, yy + 6); ctx.stroke(); } }
        hand(ctx, sx - 40 + Math.sin(st.ph) * 12, GY - 160, 0.9, true, '#ffd8b5'); hand(ctx, sx + 40 + Math.sin(st.ph) * 12, GY - 160, 0.9, false, '#ffd8b5');
        const glow = PS.clamp((st.T - 150) / 150, 0, 1);
        if (glow > 0) { const g = ctx.createRadialGradient(sx, GY - 40, 2, sx, GY - 40, 40); g.addColorStop(0, 'rgba(255,90,30,' + glow + ')'); g.addColorStop(1, 'rgba(255,90,30,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, GY - 40, 40, 0, TAU); ctx.fill(); }
        if (st.T > 120) for (let i = 0; i < 6; i++) { const p = (t * 0.5 + i / 6) % 1; ctx.fillStyle = 'rgba(134,142,150,' + (0.4 * (1 - p)) + ')'; ctx.beginPath(); ctx.arc(sx + 30 + Math.sin(p * 6 + i) * 20, GY - 50 - p * 160, 10 + p * 24, 0, TAU); ctx.fill(); }
        if (st.fire) { const fl = 1 + 0.1 * Math.sin(t * 20); ctx.fillStyle = 'rgba(255,146,43,.9)'; ctx.beginPath(); ctx.moveTo(sx + 50, GY - 40 - 90 * fl); ctx.quadraticCurveTo(sx + 100, GY - 60, sx + 60, GY - 40); ctx.quadraticCurveTo(sx + 20, GY - 60, sx + 50, GY - 40 - 90 * fl); ctx.fill(); ctx.fillStyle = 'rgba(255,224,102,.95)'; ctx.beginPath(); ctx.moveTo(sx + 55, GY - 40 - 50 * fl); ctx.quadraticCurveTo(sx + 80, GY - 52, sx + 58, GY - 40); ctx.quadraticCurveTo(sx + 38, GY - 52, sx + 55, GY - 40 - 50 * fl); ctx.fill(); }
        ctx.fillStyle = '#f1f3f5'; ctx.beginPath(); ctx.ellipse(sx + 58, GY - 42, 26, 8, 0, 0, TAU); ctx.fill(); D.text(ctx, '干草', sx + 92, GY - 50, { size: F(12), weight: 700, color: '#868e96' });
      } else {
        const x0 = 120, y0 = GY - 300, x1 = 640, y1 = GY - 30;
        ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + 200, y0 + 40, x1 - 120, y1 - 10); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0 - 20, y0 + 10); ctx.lineTo(x0 - 20, GY); ctx.moveTo(x0 - 60, y0 + 10); ctx.lineTo(x0 - 60, GY); for (let i = 0; i < 6; i++) { ctx.moveTo(x0 - 60, y0 + 30 + i * 45); ctx.lineTo(x0 - 20, y0 + 30 + i * 45); } ctx.stroke();
        const p = st.slide < 0 ? 0 : st.slide, q = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
        const bx = q < 0.8 ? (1 - q / 0.8) * (1 - q / 0.8) * x0 + 2 * (1 - q / 0.8) * (q / 0.8) * (x0 + 200) + (q / 0.8) * (q / 0.8) * (x1 - 120) : x1 - 120 + ((q - 0.8) / 0.2) * 120;
        const by = q < 0.8 ? (1 - q / 0.8) * (1 - q / 0.8) * y0 + 2 * (1 - q / 0.8) * (q / 0.8) * (y0 + 40) + (q / 0.8) * (q / 0.8) * (y1 - 10) : y1 - 10 + ((q - 0.8) / 0.2) * 10;
        ctx.fillStyle = '#4263eb'; D.roundRect(ctx, bx - 20, by - 50, 40, 44, 10); ctx.fill();
        ctx.fillStyle = '#ffd8b5'; ctx.beginPath(); ctx.arc(bx, by - 70, 20, 0, TAU); ctx.fill();
        const g = ctx.createRadialGradient(bx, by - 8, 2, bx, by - 8, 34); g.addColorStop(0, 'rgba(255,80,40,' + f + ')'); g.addColorStop(1, 'rgba(255,80,40,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by - 8, 34, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c9b38a'; ctx.fillRect(0, GY, VW, 30);
      }
      // 温度计与能量转化
      const tx = nar ? 860 : 820, ttop = 50, tb = GY - 30;
      PS.thermo(ctx, { x: tx, top: ttop, bulbY: tb, min: st.s === 'drill' ? 0 : 20, max: st.s === 'drill' ? 400 : st.s === 'wire' ? 80 : 50, div: st.s === 'drill' ? 10 : 1, label: st.s === 'drill' ? 100 : 10, value: st.T, w: 20, F, fs: F(12) });
      D.text(ctx, PS.fmtT(st.T, 0), tx, tb + 40 + F(14) * 0.4, { size: F(16), weight: 800, align: 'center', color: TC.hot });
      const ex = nar ? 640 : 680, ey = 50;
      D.text(ctx, '机械能', ex, ey, { size: F(14), weight: 800, align: 'center', color: EC.W });
      D.arrow(ctx, ex, ey + 10, ex, ey + 70, { color: EC.W, width: 4, head: 12 });
      D.text(ctx, '内能', ex, ey + 70 + F(14) * 1.3, { size: F(14), weight: 800, align: 'center', color: EC.q });
      D.text(ctx, '做功', ex + 12, ey + 46, { size: F(12), weight: 700, color: '#868e96' });
    }
    reset();
  });

  /* ================= 做功还是热传递 ================= */
  PS.register('ways-sort', function (el) {
    PS.sortCards(el, [
      ['搓手取暖', 0, '克服摩擦做功。'],
      ['用热水袋暖手', 1, '热量从热水袋传到手上。'],
      ['钻木取火', 0, '克服摩擦做功，机械能转化为内能。'],
      ['用酒精灯给试管里的水加热', 1, '火焰把热量传给试管和水。'],
      ['从滑梯上滑下，臀部有灼热感', 0, '克服摩擦做功。'],
      ['太阳把棉被晒得热乎乎的', 1, '热辐射，是热传递。'],
      ['反复弯折铁丝，弯折处变热', 0, '对铁丝做功。'],
      ['把冰块放在手心里，手变凉了', 1, '手把热量传给冰块。'],
      ['锯木头时，锯条发烫', 0, '克服摩擦做功。'],
      ['用铁锅炒菜，锅铲变热', 1, '热量从热锅传到锅铲（热传导）。'],
      ['用打气筒打气，筒壁变热', 0, '压缩筒内的空气做功（还有活塞与筒壁的摩擦）。'],
      ['冬天对着手哈气，手变暖和', 1, '热的水蒸气把热量传给手（还有液化放热）。'],
      ['流星进入大气层后发光发热', 0, '流星高速穿过大气层，压缩空气、克服摩擦做功。'],
      ['把烧红的工件放进冷水中，工件冷却', 1, '工件把热量传给冷水。'],
      ['用砂轮磨刀，刀发热', 0, '克服摩擦做功。'],
      ['把饮料放进冰箱，饮料变凉', 1, '饮料把热量传给冰箱里的冷空气。'],
    ], ['做功', '热传递']);
  });

  /* ================= 温度、热量和内能 ================= */
  PS.register('tqe', function (el) {
    const VW = 1000, m = 0.1, P = 200, SPEED = 10; // 0.1 kg 碎冰，加热功率 200 W（有效），时间加快 10 倍
    const Lf = 3.36e5, ci = 2.1e3, cw = 4.2e3;
    const st = { Q: 0, run: false, hist: [[0, -10]] };
    const Q1 = ci * m * 10, Q2 = Q1 + Lf * m, QM = Q2 + cw * m * 30;
    const state = (Q) => (Q < Q1 ? { T: -10 + Q / (ci * m), f: 0 } : Q < Q2 ? { T: 0, f: (Q - Q1) / (Lf * m) } : { T: Math.min(30, (Q - Q2) / (cw * m)), f: 1 });
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 1000 : 460), draw });
    const rd = { T: PS.ui.readout('温度', '−10 ℃'), Q: PS.ui.readout('吸收的热量', '0 J'), s: PS.ui.readout('状态', '固态') };
    const msg = h('div', { class: 'th-msg info' });
    const goB = PS.ui.button('🔥 开始加热', () => { st.run = !st.run; goB.innerHTML = st.run ? '⏸ 暂停' : '🔥 继续加热'; }, 'btn btn-primary btn-sm');
    el.append(PS.ui.row(goB, PS.ui.button('重来', () => { st.Q = 0; st.run = false; st.hist = [[0, -10]]; goB.innerHTML = '🔥 开始加热'; tell(); }, 'btn btn-ghost btn-sm')), h('div', { class: 'th-read' }, rd.T.el, rd.Q.el, rd.s.el), msg);
    const judge = h('div', { style: { marginTop: '14px' } });
    el.append(h('h4', { style: { margin: '16px 0 4px' } }, '判一判：下面的说法对吗？'), judge);
    PS.sortCards(judge, [
      ['物体的温度越高，含有的热量越多', 1, '热量是过程量，不能说“含有热量”；应该说温度越高，内能越大（同一物体）。'],
      ['物体吸收了热量，温度一定升高', 1, '晶体熔化、液体沸腾时，吸收热量，温度不变。'],
      ['同一物体温度升高，内能一定增大', 0, '温度升高，分子热运动更剧烈，分子动能增大，内能增大。'],
      ['物体的内能增大，一定是吸收了热量', 1, '也可能是外界对它做了功。'],
      ['物体的温度不变，内能也可能增大', 0, '例如冰熔化成水时，温度不变，内能增大。'],
      ['热量总是从内能大的物体传给内能小的物体', 1, '热量从温度高的物体传给温度低的物体，与内能的大小无关。'],
      ['0 ℃ 的冰块没有内能', 1, '一切物体都有内能。'],
      ['热传递过程中传递的是温度', 1, '传递的是能量（内能），传递的多少叫做热量。'],
      ['两个物体的温度相同时，它们之间不会发生热传递', 0, '热传递的条件是存在温度差。'],
    ], ['正确', '错误']);
    function tell() {
      const s = state(st.Q);
      rd.T.set(PS.fmtT(s.T, 1)); rd.Q.set(TH.fmtQ(st.Q)); rd.s.set(s.f <= 0 ? '固态（冰）' : s.f >= 1 ? '液态（水）' : '固液共存');
      let t;
      if (st.Q === 0) t = '烧杯里有 0.1 kg、−10 ℃ 的碎冰，用酒精灯持续加热。观察温度、吸收的热量和内能怎样变化。';
      else if (s.f <= 0) t = '冰吸收热量，<b>温度升高，内能增加</b>。';
      else if (s.f < 1) t = '冰在熔化：<b>继续吸收热量，温度保持 0 ℃ 不变，但内能在增加</b>（分子势能增大）。所以“物体吸收热量，温度一定升高”是错误的。';
      else t = '冰全部熔化成水后，水吸收热量，温度又开始升高，内能继续增加。<br><b>温度</b>是物体冷热程度的标志（状态量）；<b>内能</b>是物体内所有分子动能和分子势能的总和（状态量，说“具有”）；<b>热量</b>是热传递中传递内能的多少（过程量，说“吸收”“放出”）。';
      msg.className = 'th-msg ' + (s.f > 0 && s.f < 1 ? 'ok' : 'info'); msg.innerHTML = t;
    }
    PS.loop((dt) => {
      if (st.run && st.Q < QM) {
        st.Q = Math.min(QM, st.Q + P * dt * SPEED);
        const tm = st.Q / P / 60;
        if (tm - st.hist[st.hist.length - 1][0] > 0.05) st.hist.push([tm, state(st.Q).T]);
        if (st.Q >= QM) { st.run = false; goB.innerHTML = '🔥 开始加热'; }
        const k = Math.floor(st.Q / 500);
        if (k !== st.k) { st.k = k; tell(); }
      }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const s = state(st.Q);
      // 烧杯、冰、酒精灯
      const k = nar ? 1.6 : 1, bx = nar ? 420 : 170, by = nar ? 460 : VH - 120;
      ctx.save(); ctx.translate(bx, by); ctx.scale(k, k); ctx.translate(-bx, -by);
      ctx.fillStyle = '#495057'; ctx.fillRect(bx - 100, by, 200, 8);
      const level = 0.55;
      PS.beaker(ctx, bx, by, 160, 170, { level: s.f > 0 ? level * (0.5 + 0.5 * s.f) : 0, water: '#a5d8ff' });
      const nIce = Math.round(14 * (1 - s.f));
      for (let i = 0; i < nIce; i++) { const ix = bx - 60 + (i % 5) * 28 + hash(i) * 6, iy = by - 18 - Math.floor(i / 5) * 24 - hash(i + 4) * 4; ctx.fillStyle = 'rgba(231,245,255,.95)'; ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 1.5; ctx.save(); ctx.translate(ix, iy); ctx.rotate(hash(i + 9)); ctx.fillRect(-11, -9, 22, 18); ctx.strokeRect(-11, -9, 22, 18); ctx.restore(); }
      PS.lamp(ctx, bx, by + 110, 0.85, { on: st.run, t });
      PS.thermo(ctx, { x: bx + 40, top: by - 250, bulbY: by - 22, min: -20, max: 40, div: 1, label: nar ? 20 : 10, value: s.T, w: 14, F: (p) => F(p) / k, fs: F(11) / k });
      ctx.restore();
      // 图像与内能柱
      const gx = nar ? 110 : 420, gy = nar ? by + 220 : 50, gw = nar ? 520 : 390, gh = nar ? VH - by - 220 - F(12) * 3 - 20 : VH - 50 - F(12) * 3 - 30;
      const ch = PS.tchart(ctx, { x: gx, y: gy, w: gw, h: gh }, { t0: 0, t1: QM / P / 60 * 1.02, T0: -20, T1: 40, tStep: 1, TStep: 10, F });
      ch.line(st.hist, '#3b5bdb', 3);
      if (s.f > 0 && s.f < 1) D.text(ctx, '熔化：温度不变', ch.X(st.hist[st.hist.length - 1][0]), ch.Y(0) - 12, { size: F(13), weight: 800, align: 'center', color: '#7048e8', bg: 'rgba(255,255,255,.9)' });
      const bxx = nar ? 760 : 880, bw = nar ? 180 : 100;
      EN.bars(ctx, bxx - bw / 2, gy - 10, bw, gh + 30, [{ n: '内能', v: 30 + st.Q / 1000, c: EC.q }], { F, max: 30 + QM / 1000, values: false });
    }
    tell();
  });
})();
