/* 第13章第1节：分子热运动——物质的构成（放大一滴水）、液体和固体的扩散、温度与扩散快慢、分子热运动与机械运动、分子间的作用力、分子力的实验。依赖 heat.js、energy.js、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, TH = PS.th, TC = PS.TC, EN = PS.en;
  const TAU = Math.PI * 2;
  const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const smooth = (a, b, x) => { const t = PS.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /** 一个水分子（O 红、两个 H 白），中心 (x, y)，大小 s（O 的半径），角度 a */
  function water(ctx, x, y, s, a, o) {
    o = o || {};
    const L = s * 1.36, b = (104.5 / 2) * Math.PI / 180;
    const H = [a + Math.PI / 2 - b, a + Math.PI / 2 + b].map((q) => [x + Math.cos(q) * L, y + Math.sin(q) * L]);
    H.forEach(([hx, hy]) => TH.ball(ctx, hx, hy, s * 0.62, o.hc || '#dee2e6'));
    TH.ball(ctx, x, y, s, o.oc || '#e03131');
    return H;
  }

  /** 量筒：x 中心，top 顶部，bot 底部（内底），w 宽；o.max 量程，o.div 分度值，o.label 每隔多少写数字，o.level 液面对应的毫升数，o.color 液体颜色，o.F */
  function cylinder(ctx, x, top, bot, w, o) {
    o = o || {};
    const F = o.F || ((v) => v), l = x - w / 2, r = x + w / 2;
    const y0 = bot - 6, y1 = top + 26, Y = (v) => y0 - (v / o.max) * (y0 - y1);
    ctx.save();
    ctx.fillStyle = 'rgba(235,244,252,.55)'; ctx.fillRect(l, top, w, bot - top);
    if (o.fill) o.fill(Y, l, r);
    else if (o.level) {
      ctx.fillStyle = o.color || 'rgba(165,216,255,.75)';
      ctx.fillRect(l + 2, Y(o.level), w - 4, bot - Y(o.level));
      ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(l + 2, Y(o.level)); ctx.lineTo(r - 2, Y(o.level)); ctx.stroke();
    }
    if (o.max) {
      ctx.strokeStyle = 'rgba(52,58,64,.7)'; ctx.fillStyle = '#343a40';
      ctx.font = PS.font(F(o.fs || 11), 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (let v = o.div; v <= o.max + 1e-9; v += o.div) {
        const big = Math.abs(v / o.label - Math.round(v / o.label)) < 1e-6, yy = Y(v);
        ctx.lineWidth = big ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(l, yy); ctx.lineTo(l + (big ? w * 0.3 : w * 0.17), yy); ctx.stroke();
        if (big && o.numbers !== false) ctx.fillText(String(PS.round(v, 3)), l + w * 0.34, yy);
      }
    }
    ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(l - 6, top - 4); ctx.lineTo(l, top + 4); ctx.lineTo(l, bot); ctx.lineTo(r, bot); ctx.lineTo(r, top); ctx.stroke();
    ctx.fillStyle = '#ced4da'; D.roundRect(ctx, x - w * 0.85, bot, w * 1.7, 12, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(r - 12, top + 10, 5, bot - top - 20);
    ctx.restore();
    return { Y };
  }

  /* ================= 物质的构成：把一滴水不断放大 ================= */
  PS.register('mol-zoom', function (el) {
    const VW = 1000, Z = 6;
    const LV = [
      { n: '一杯水', bar: '2 cm', msg: '一杯水看起来是连续的、均匀的。我们取出其中的一滴水，把它不断放大……' },
      { n: '一滴水', bar: '1 mm', msg: '一滴水的体积约 0.05 mL，里面大约有 <b>1.67×10²¹ 个水分子</b>。如果全世界 80 亿人一起来数，每人每秒数 1 个，也要数约 6 600 年！' },
      { n: '放大 1 000 倍', bar: '10 μm', msg: '用光学显微镜放大上千倍，水看起来仍然是连续的——分子实在太小了，用光学显微镜也看不到。' },
      { n: '放大约 1 亿倍', bar: '1 nm', msg: '用电子显微镜等仪器“放大”到约 1 亿倍，才能看到水是由一个个<b>水分子</b>组成的，而且它们在不停地运动。分子很小，通常以 <b>10⁻¹⁰ m</b> 为单位来量度。' },
      { n: '一个水分子', bar: '0.1 nm', msg: '一个水分子由 2 个氢原子和 1 个氧原子构成。常见的物质是由极其微小的粒子——<b>分子、原子</b>构成的。<b>保持物质原来性质不变的最小微粒叫做分子。</b>' },
    ];
    const st = { z: 0, target: 0 };
    const seg = PS.ui.seg(LV.map((l, i) => ({ value: i, label: l.n })), 0, (v) => { st.target = v; });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 640 : 500), draw });
    const msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(PS.ui.button('▶ 一路放大', () => { if (st.z >= 3.99) st.z = 0; st.target = 4; }, 'btn btn-primary btn-sm'), PS.ui.button('回到一杯水', () => { st.target = 0; }, 'btn btn-ghost btn-sm')), msg);
    let shown = -1;
    PS.loop((dt) => {
      if (Math.abs(st.target - st.z) > 1e-3) st.z += Math.sign(st.target - st.z) * Math.min(Math.abs(st.target - st.z), dt * 0.7);
      else st.z = st.target;
      const k = Math.round(st.z);
      if (Math.abs(st.z - k) < 0.02 && k !== shown) { shown = k; seg.set(k, true); msg.innerHTML = LV[k].msg; }
      S.render();
    }, el).start();
    const MOLS = Array.from({ length: 90 }, (_, i) => ({ gx: (i % 10) - 4.5, gy: Math.floor(i / 10) - 4, ph: hash(i) * TAU, a: hash(i + 50) * TAU, w: 0.6 + hash(i + 99) }));
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const capH = F(15) * 2.8 + 16, cy = (VH - capH) / 2 + 6, R = Math.min(215, (VH - capH) / 2 - 14);
      const c = { x: VW / 2, y: cy }, t = performance.now() / 1000;
      const FOCUS = [{ x: 500, y: cy - R * 0.42 }, { x: 500 + R * 0.25, y: cy + R * 0.2 }, { x: 500, y: cy }, { x: 500, y: cy }];
      const i = Math.min(3, Math.floor(st.z)), f = st.z - i;
      const lv = (k, alpha, sc, foc) => {
        if (alpha <= 0.01) return;
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.translate(c.x, c.y); ctx.scale(sc, sc);
        const p = foc || c; ctx.translate(-p.x, -p.y);
        LEVEL[k](ctx, c, R, t, F);
        ctx.restore();
      };
      if (st.z >= 4) lv(4, 1, 1);
      else {
        const p = { x: PS.lerp(c.x, FOCUS[i].x, Math.min(1, f * 1.4)), y: PS.lerp(c.y, FOCUS[i].y, Math.min(1, f * 1.4)) };
        lv(i, 1 - smooth(0.45, 0.95, f), 1 + f * (Z - 1), p);
        lv(i + 1, smooth(0.35, 0.95, f), PS.lerp(1 / Z, 1, f));
      }
      // 说明与比例尺
      const k = Math.round(st.z), a = 1 - Math.min(1, Math.abs(st.z - k) * 4);
      ctx.save(); ctx.globalAlpha = Math.max(0.15, a);
      const by = VH - F(15) * 1.2 - 10;
      D.text(ctx, LV[k].n, 40, by, { size: F(16), weight: 800, color: '#1b2333' });
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(VW - 200, by - 6); ctx.lineTo(VW - 60, by - 6); ctx.moveTo(VW - 200, by - 14); ctx.lineTo(VW - 200, by + 2); ctx.moveTo(VW - 60, by - 14); ctx.lineTo(VW - 60, by + 2); ctx.stroke();
      D.text(ctx, LV[k].bar, VW - 130, by - 16, { size: F(14), weight: 700, align: 'center', color: '#1b2333' });
      ctx.restore();
    }
    const LEVEL = [
      (ctx, c, R) => { // 一杯水 + 滴管
        PS.beaker(ctx, c.x, c.y + R, R * 1.5, R * 1.25, { level: 0.6, water: '#a5d8ff', marks: true });
        const ty = c.y - R * 0.42;
        ctx.fillStyle = 'rgba(235,244,252,.9)'; ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(c.x - 7, ty - 14); ctx.lineTo(c.x - 7, ty - 80); ctx.lineTo(c.x + 7, ty - 80); ctx.lineTo(c.x + 7, ty - 14); ctx.lineTo(c.x, ty - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e03131'; D.roundRect(ctx, c.x - 12, ty - 118, 24, 42, 10); ctx.fill();
        ctx.fillStyle = '#74c0fc'; ctx.beginPath(); ctx.arc(c.x, ty, 7, 0, TAU); ctx.fill();
      },
      (ctx, c, R) => { // 一滴水
        const r = R * 0.8;
        const g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.2, r * 0.1, c.x, c.y + r * 0.1, r * 1.1);
        g.addColorStop(0, '#e7f5ff'); g.addColorStop(0.6, '#74c0fc'); g.addColorStop(1, '#339af0');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(c.x, c.y - r * 1.15); ctx.bezierCurveTo(c.x + r * 0.35, c.y - r * 0.6, c.x + r, c.y - r * 0.1, c.x + r, c.y + r * 0.25);
        ctx.arc(c.x, c.y + r * 0.25, r, 0, Math.PI); ctx.bezierCurveTo(c.x - r, c.y - r * 0.1, c.x - r * 0.35, c.y - r * 0.6, c.x, c.y - r * 1.15); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(c.x - r * 0.45, c.y - r * 0.05, r * 0.12, r * 0.28, 0.4, 0, TAU); ctx.fill();
      },
      (ctx, c, R, t) => { // 光学显微镜
        ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, TAU); ctx.clip();
        ctx.fillStyle = '#a5d8ff'; ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6;
        for (let k = 0; k < 6; k++) { ctx.beginPath(); for (let x = -R; x <= R; x += 10) { const y = c.y - R + k * 75 + Math.sin(x * 0.03 + t * 0.6 + k) * 8; x === -R ? ctx.moveTo(c.x + x, y) : ctx.lineTo(c.x + x, y); } ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(c.x, c.y, R + 5, 0, TAU); ctx.stroke();
      },
      (ctx, c, R, t) => { // 水分子
        ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, TAU); ctx.clip();
        ctx.fillStyle = '#e7f5ff'; ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);
        const sp = R / 4.6;
        MOLS.forEach((m, k) => {
          const x = c.x + (m.gx + (m.gy % 2 ? 0.5 : 0)) * sp + Math.sin(t * 2.3 * m.w + m.ph) * sp * 0.16, y = c.y + m.gy * sp * 0.9 + Math.cos(t * 1.9 * m.w + m.ph * 1.3) * sp * 0.16;
          if (Math.hypot(x - c.x, y - c.y) > R + 20) return;
          const centre = Math.abs(m.gx + 0.5) < 0.01 && m.gy === 0;
          water(ctx, centre ? c.x : x, centre ? c.y : y, sp * 0.24, m.a + Math.sin(t * 1.4 * m.w + m.ph) * 0.8);
          if (centre) { ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y + sp * 0.12, sp * 0.52, 0, TAU); ctx.stroke(); }
        });
        ctx.restore();
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(c.x, c.y, R + 5, 0, TAU); ctx.stroke();
      },
      (ctx, c, R, t, F) => { // 一个水分子
        const s = R * 0.33;
        const H = water(ctx, c.x, c.y - s * 0.35, s, Math.sin(t * 0.8) * 0.06);
        D.text(ctx, '氧原子 O', c.x, c.y - s * 1.55, { size: F(15), weight: 800, align: 'center', color: '#c92a2a' });
        H.forEach(([hx, hy]) => { const r = hx > c.x; D.text(ctx, '氢原子 H', hx + (r ? 1 : -1) * s * 0.2, hy + s * 0.62 + F(15) * 1.1, { size: F(15), weight: 800, align: r ? 'left' : 'right', color: '#495057' }); });
      },
    ];
  });

  /* ================= 液体和固体的扩散 ================= */
  PS.register('diffusion', function (el) {
    const VW = 1000;
    const st = { mode: 'liquid', t: 0, play: false, rev: false };
    const MODE = {
      liquid: { max: 30, unit: '天', L: 20, a: 7, Dcm: 0.7e-5, sec: 86400 },
      solid: { max: 5, unit: '年', width: 1 },
    };
    const seg = PS.ui.seg([{ value: 'liquid', label: '液体：硫酸铜溶液和清水' }, { value: 'solid', label: '固体：铅块和金块' }], st.mode, (v) => { st.mode = v; st.t = 0; st.play = false; sl.set(0, true); syncSl(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 760 : 520), draw });
    const sl = PS.ui.slider({ label: '经过的时间', min: 0, max: 30, step: 0.1, value: 0, fmt: (v) => fmtT(v), onInput: (v) => { st.t = v; st.play = false; tell(); } });
    sl.el.classList.add('wide');
    const playB = PS.ui.button('▶ 播放', () => { if (st.t >= M().max - 1e-6) st.t = 0; st.play = true; }, 'btn btn-primary btn-sm');
    const revT = PS.ui.toggle('把硫酸铜溶液放在<b>上面</b>（倒过来）', false, (v) => { st.rev = v; st.t = 0; sl.set(0, true); tell(); });
    const msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(sl.el, playB), PS.ui.row(revT.el), msg);
    const M = () => MODE[st.mode];
    function fmtT(v) { return st.mode === 'liquid' ? (v < 1 ? PS.fmt(v * 24, 0) + ' 小时' : '第 ' + PS.fmt(v, 0) + ' 天') : PS.fmt(v, 1) + ' 年'; }
    function syncSl() { sl.input.max = M().max; sl.input.step = st.mode === 'liquid' ? 0.1 : 0.05; sl.set(st.t, true); revT.el.style.display = st.mode === 'liquid' ? '' : 'none'; }
    // 液体：无流通边界的扩散（余弦级数解），y 从底部量起（cm）
    function cLiq(y, td) {
      const m = M(), L = m.L, a = m.a;
      if (td <= 0) return y < a ? 1 : 0;
      const Dt = m.Dcm * td * m.sec;
      let c = a / L;
      for (let n = 1; n <= 80; n++) {
        const k = (n * Math.PI) / L, e = Math.exp(-k * k * Dt);
        if (e < 1e-7) break;
        c += (2 / (n * Math.PI)) * Math.sin(k * a) * Math.cos(k * y) * e;
      }
      return PS.clamp(c, 0, 1);
    }
    function revSink() { return st.rev ? PS.clamp(st.t / 0.4, 0, 1) : 1; }
    function cAt(y) { // 当前时刻 y 处的浓度
      if (!st.rev) return cLiq(y, st.t);
      if (st.t < 0.4) return -1;
      return cLiq(y, st.t + 6);
    }
    function cSol(x) { // x：离分界面的距离（mm，正值在铅一侧），金的比例
      if (st.t <= 0) return x < 0 ? 1 : 0;
      const Ld = MODE.solid.width * Math.sqrt(st.t / 5) / 1.6;
      return 0.5 * erfc(x / Ld);
    }
    function erfc(x) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; }
    function tell() {
      sl.set(st.t, true);
      let s;
      if (st.mode === 'liquid') {
        if (st.rev) s = st.t < 0.4 ? '硫酸铜溶液的<b>密度比水大</b>，放在上面会在<b>重力</b>作用下很快沉下去……' : '倒过来放时，两种液体很快就混在一起了——但这可能是<b>重力</b>使硫酸铜溶液下沉造成的，<b>不能说明分子在运动</b>。所以实验时要把密度大的硫酸铜溶液放在下面。';
        else if (st.t < 0.05) s = '量筒里，蓝色的硫酸铜溶液在下面，清水在上面，界面十分清晰。拖动滑块或点“播放”，看看几天后会怎样。';
        else if (st.t < 20) s = '没有人搅拌，界面却逐渐变得模糊：硫酸铜分子进入了水中，水分子也进入了硫酸铜溶液中——这就是<b>扩散</b>。';
        else s = '30 天后，两种液体已经混合得比较均匀。<b>液体分子在不停地做无规则运动</b>。右边放大的画面是示意图。';
      } else {
        s = st.t < 0.05 ? '把磨得很光滑的铅片和金片紧压在一起，在室温下放置。' : st.t < 4.9 ? '时间越长，金原子进入铅中、铅原子进入金中就越深……' : '放置 5 年后再把它们切开，发现它们互相渗入约 <b>1 mm</b> 深：<b>固体分子也在不停地运动</b>，只是固体中的扩散非常慢。';
      }
      msg.className = 'th-msg ' + (st.t > 0.05 && !(st.rev && st.mode === 'liquid') ? 'ok' : 'info');
      msg.innerHTML = s;
      S.render();
    }
    const SITES = [];
    for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) SITES.push({ i, j, u: hash(i * 31 + j * 7 + 400), ph: hash(i * 13 + j * 17) * TAU });
    PS.loop((dt) => {
      if (st.play) {
        st.t = Math.min(M().max, st.t + dt * M().max / 9);
        if (st.t >= M().max) st.play = false;
        tell();
      } else S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), T = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const top = 50, bot = VH - F(14) * 2 - 30;
      const R = nar ? Math.min(230, (bot - top) / 2 - 10) : Math.min(200, (bot - top) / 2), mx = nar ? 660 : 700, my = (top + bot) / 2;
      // 放大镜
      ctx.save(); ctx.beginPath(); ctx.arc(mx, my, R, 0, TAU); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(mx - R, my - R, 2 * R, 2 * R);
      const sp = R / 6.2;
      let zoomY = 0;
      if (st.mode === 'liquid') {
        const L = M().L, cyl = { x: nar ? 230 : 280, w: nar ? 190 : 150 };
        const Yw = (y) => bot - 6 - (y / L) * (bot - 6 - top - 20);
        zoomY = Yw(M().a);
        SITES.forEach((s) => {
          const x = mx + (s.i + (s.j % 2 ? 0.5 : 0)) * sp + Math.sin(T * 2.6 + s.ph) * sp * 0.18, y = my + s.j * sp * 0.92 + Math.cos(T * 2.1 + s.ph * 1.7) * sp * 0.18;
          const yc = M().a - (s.j * 0.92 * sp) / R * 2.2;
          let c = cAt(yc);
          if (c < 0) c = 0.6 * revSink();
          const blue = s.u < c;
          TH.ball(ctx, x, y, sp * 0.36, blue ? '#1971c2' : '#a5d8ff');
        });
        ctx.restore();
        // 量筒
        cylinder(ctx, cyl.x, top, bot, cyl.w, { F, fill: (Y, l, r) => {
          const n = 90;
          for (let k = 0; k < n; k++) {
            const y0 = (k / n) * L, y1 = ((k + 1) / n) * L, ym = (y0 + y1) / 2;
            let c;
            if (st.rev && st.t < 0.4) c = -1; else c = cAt(ym);
            if (c < 0) continue;
            ctx.fillStyle = PS.mixColor('#e7f5ff', '#1864ab', Math.pow(c, 0.8));
            ctx.fillRect(l + 2, Yw(y1) - 0.5, r - l - 4, Yw(y0) - Yw(y1) + 1);
          }
          if (st.rev && st.t < 0.4) { // 倒过来：密度大的溶液在重力作用下下沉
            const p = revSink();
            ctx.fillStyle = '#e7f5ff'; ctx.fillRect(l + 2, Yw(L), r - l - 4, Yw(0) - Yw(L));
            const a = M().L - M().a, yb = L - a; // 初始在上面的蓝色层
            ctx.fillStyle = '#1864ab';
            ctx.fillRect(l + 2, Yw(L), r - l - 4, Yw(yb) - Yw(L));
            for (let k = 0; k < 6; k++) { const fx = l + 8 + (k + 0.5) * (r - l - 16) / 6, len = p * (yb - 0.2) * (0.7 + 0.3 * hash(k + 3)); ctx.beginPath(); ctx.moveTo(fx - 9, Yw(yb)); ctx.quadraticCurveTo(fx - 4, Yw(yb - len * 0.7), fx, Yw(yb - len)); ctx.quadraticCurveTo(fx + 4, Yw(yb - len * 0.7), fx + 9, Yw(yb)); ctx.fill(); }
          }
          ctx.strokeStyle = 'rgba(28,126,214,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(l + 2, Yw(L)); ctx.lineTo(r - 2, Yw(L)); ctx.stroke();
        } });
        D.text(ctx, '清水', cyl.x + cyl.w / 2 + 12, Yw(st.rev ? L * 0.3 : L * 0.82), { size: F(13), weight: 700, color: '#1c7ed6' });
        D.text(ctx, '硫酸铜溶液', cyl.x + cyl.w / 2 + 12, Yw(st.rev ? L * 0.9 : M().a * 0.4), { size: F(13), weight: 700, color: '#1864ab', baseline: st.rev ? 'top' : 'alphabetic' });
        // 放大镜的引线
        ctx.strokeStyle = 'rgba(52,58,64,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(cyl.x + cyl.w / 2, zoomY - 22); ctx.lineTo(mx - R * 0.72, my - R * 0.7); ctx.moveTo(cyl.x + cyl.w / 2, zoomY + 22); ctx.lineTo(mx - R * 0.72, my + R * 0.7); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2; ctx.strokeRect(cyl.x - cyl.w / 2 + 3, zoomY - 22, cyl.w - 6, 44);
      } else {
        // 固体：铅和金
        SITES.forEach((s) => {
          const x = mx + s.i * sp * 0.98 + Math.sin(T * 3 + s.ph) * sp * 0.06, y = my + s.j * sp * 0.98 + Math.cos(T * 2.7 + s.ph) * sp * 0.06;
          const xmm = ((s.i + 0.5) / 7.5) * 1.6;
          const gold = s.u < cSol(xmm);
          ctx.fillStyle = gold ? '#fab005' : '#868e96';
          ctx.beginPath(); ctx.arc(x, y, sp * 0.42, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(x - sp * 0.13, y - sp * 0.13, sp * 0.13, 0, TAU); ctx.fill();
        });
        ctx.strokeStyle = 'rgba(224,49,49,.6)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - 0.5 * sp * 0.98 + sp * 0.49, my - R); ctx.lineTo(mx + sp * 0.49 - 0.5 * sp * 0.98, my + R); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
        const bx = nar ? 240 : 290, bw = nar ? 170 : 150, by = my - 80;
        const g1 = ctx.createLinearGradient(0, by, 0, by + 160); g1.addColorStop(0, '#fcc419'); g1.addColorStop(1, '#e67700');
        ctx.fillStyle = g1; ctx.fillRect(bx - bw, by, bw, 160);
        const g2 = ctx.createLinearGradient(0, by, 0, by + 160); g2.addColorStop(0, '#adb5bd'); g2.addColorStop(1, '#495057');
        ctx.fillStyle = g2; ctx.fillRect(bx, by, bw, 160);
        const band = 14 * Math.sqrt(st.t / 5);
        if (band > 0.5) { const g = ctx.createLinearGradient(bx - band, 0, bx + band, 0); g.addColorStop(0, 'rgba(250,176,5,0)'); g.addColorStop(0.5, 'rgba(201,160,80,.95)'); g.addColorStop(1, 'rgba(134,142,150,0)'); ctx.fillStyle = g; ctx.fillRect(bx - band, by, 2 * band, 160); }
        D.text(ctx, '金', bx - bw / 2, by + 90, { size: F(18), weight: 800, align: 'center', color: '#fff' });
        D.text(ctx, '铅', bx + bw / 2, by + 90, { size: F(18), weight: 800, align: 'center', color: '#fff' });
        D.arrow(ctx, bx - bw - 60, by + 80, bx - bw - 6, by + 80, { color: '#495057', width: 4, head: 14 });
        D.arrow(ctx, bx + bw + 60, by + 80, bx + bw + 6, by + 80, { color: '#495057', width: 4, head: 14 });
        D.text(ctx, '紧压在一起', bx, by - 16, { size: F(13), weight: 700, align: 'center', color: '#495057' });
        ctx.strokeStyle = 'rgba(52,58,64,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(mx - R * 0.72, my - R * 0.7); ctx.moveTo(bx, by + 160); ctx.lineTo(mx - R * 0.72, my + R * 0.7); ctx.stroke(); ctx.setLineDash([]);
        if (st.t > 0.3) D.text(ctx, '互相渗入约 ' + PS.fmt(Math.sqrt(st.t / 5), 1) + ' mm', bx, by + 160 + F(14) * 1.4, { size: F(13), weight: 700, align: 'center', color: '#e8590c' });
      }
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(mx, my, R + 4, 0, TAU); ctx.stroke();
      D.text(ctx, '放大（示意图）', mx, my + R + F(13) * 1.5 + 4, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      D.text(ctx, fmtT(st.t), 30, VH - 18, { size: F(16), weight: 800, color: '#e8590c' });
    }
    syncSl(); tell();
  });

  /* ================= 冷水和热水中滴墨水 ================= */
  PS.register('ink-temp', function (el) {
    const VW = 1000, N = 260;
    const st = { T: [10, 80], t: 0, run: false, done: false };
    const eta = (T) => 2.414e-5 * Math.pow(10, 247.8 / (T + 273.15 - 140)); // 水的黏度（Pa·s）
    const Dp = (T) => 200 * ((T + 273.15) / 293.15) * (eta(20) / eta(T)); // 等效扩散系数（像素²/s），示意
    const BK = [{ x: 250 }, { x: 750 }];
    const W = 270, H = 300;
    const ink = [[], []];
    function reset() { st.t = 0; st.run = false; st.done = false; ink[0] = []; ink[1] = []; tell(); }
    function dropInk() {
      reset();
      for (let b = 0; b < 2; b++) for (let i = 0; i < N; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 9; ink[b].push({ x: Math.cos(a) * r, y: 14 + Math.sin(a) * r, vy: 55 + PS.rand(-8, 8) }); }
      st.run = true; PS.sound.tick(); tell();
    }
    const sl = [
      PS.ui.slider({ label: '冷水的温度', min: 0, max: 40, step: 1, value: st.T[0], unit: '℃', onInput: (v) => { st.T[0] = v; mols[0].T = v; tell(); } }),
      PS.ui.slider({ label: '热水的温度', min: 50, max: 95, step: 1, value: st.T[1], unit: '℃', onInput: (v) => { st.T[1] = v; mols[1].T = v; tell(); } }),
    ];
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 680 : 560), draw });
    const msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(PS.ui.button('💧 同时滴入一滴墨水', dropInk, 'btn btn-primary btn-sm'), PS.ui.button('换一杯清水', reset, 'btn btn-ghost btn-sm')), PS.ui.row(sl[0].el, sl[1].el), msg);
    const mols = [0, 1].map((b) => ({ T: st.T[b], ps: Array.from({ length: 34 }, () => ({ x: PS.rand(-50, 50), y: PS.rand(-50, 50), vx: 0, vy: 0, a: Math.random() * TAU })) }));
    function spread(b) { const p = ink[b]; if (!p.length) return 0; let s = 0; p.forEach((q) => { s += Math.hypot(q.x, q.y - 60); }); return s / p.length; }
    function tell() {
      let s;
      if (!st.run && !st.t) s = '两只烧杯里分别装有质量相同的冷水和热水。点“同时滴入一滴墨水”，观察哪杯水中的墨水扩散得快。';
      else if (st.t < 6) s = '墨水在两杯水中都慢慢散开——没有人搅拌，是分子的无规则运动使墨水扩散开来。';
      else s = '<b>热水</b>中的墨水扩散得快得多。<b>温度越高，分子的无规则运动越剧烈，扩散越快</b>。分子的运动跟温度有关，所以这种无规则运动叫做<b>分子热运动</b>。';
      msg.className = 'th-msg ' + (st.t >= 6 ? 'ok' : 'info'); msg.innerHTML = s;
    }
    PS.loop((dt) => {
      if (st.run) {
        st.t += dt;
        for (let b = 0; b < 2; b++) {
          const s = Math.sqrt(2 * Dp(st.T[b]) * dt);
          ink[b].forEach((q) => {
            q.x += PS.gauss() * s; q.y += PS.gauss() * s + q.vy * dt; q.vy *= Math.exp(-dt / 1.6);
            if (q.x < -W / 2 + 6) q.x = -W / 2 + 6 + (-W / 2 + 6 - q.x); if (q.x > W / 2 - 6) q.x = W / 2 - 6 - (q.x - (W / 2 - 6));
            if (q.y < 6) q.y = 12 - q.y; if (q.y > H * 0.86 - 6) q.y = 2 * (H * 0.86 - 6) - q.y;
          });
        }
        if (st.t > 45) st.run = false;
        if (Math.floor(st.t) !== st.k) { st.k = Math.floor(st.t); tell(); }
      }
      mols.forEach((m) => {
        const sp = 60 * Math.pow((m.T + 273.15) / 293.15, 3);
        m.ps.forEach((p) => {
          p.vx += PS.gauss() * sp * 6 * dt; p.vy += PS.gauss() * sp * 6 * dt;
          const v = Math.hypot(p.vx, p.vy); if (v > sp) { p.vx *= sp / v; p.vy *= sp / v; }
          p.x += p.vx * dt; p.y += p.vy * dt; p.a += (p.vx - p.vy) * dt * 0.02;
          const r = Math.hypot(p.x, p.y); if (r > 52) { p.x *= 52 / r; p.y *= 52 / r; p.vx *= -0.8; p.vy *= -0.8; }
        });
      });
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const top = F(16) * 1.6 + 20, bot = top + H + 10;
      BK.forEach((bk, b) => {
        const T = st.T[b], hot = b === 1;
        D.text(ctx, (hot ? '热水 ' : '冷水 ') + PS.fmtT(T), bk.x, top - 12, { size: F(16), weight: 800, align: 'center', color: hot ? TC.hot : TC.cold });
        PS.beaker(ctx, bk.x, bot, W + 10, H + 10, { level: 0.86, water: PS.mixColor('#a5d8ff', '#ffc9b9', PS.clamp((T - 15) / 90, 0, 0.75)), marks: false });
        // 墨水
        const wy = bot - (H + 10) * 0.86;
        ctx.save(); ctx.beginPath(); ctx.rect(bk.x - W / 2, wy, W, bot - wy - 3); ctx.clip();
        ink[b].forEach((q) => { ctx.fillStyle = 'rgba(33,37,90,.16)'; ctx.beginPath(); ctx.arc(bk.x + q.x, wy + q.y, 9, 0, TAU); ctx.fill(); });
        ctx.restore();
        if (hot) TH.wave(ctx, bk.x - 50, wy - 10, 40, performance.now() / 1000, { n: 3, gap: 50, color: 'rgba(240,62,62,.35)' });
        // 放大的水分子
        const ix = bk.x, iy = bot + 28 + 62 + (nar ? 10 : 0), m = mols[b];
        ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, 62, 0, TAU); ctx.clip();
        ctx.fillStyle = '#fff'; ctx.fillRect(ix - 62, iy - 62, 124, 124);
        m.ps.forEach((p) => water(ctx, ix + p.x, iy + p.y, 6, p.a));
        ctx.restore();
        ctx.strokeStyle = hot ? TC.hot : TC.cold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ix, iy, 64, 0, TAU); ctx.stroke();
        D.text(ctx, '放大：水分子', ix, iy + 64 + F(13) * 1.3, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      });
      D.text(ctx, '时间 ' + PS.fmt(st.t, 0) + ' s', VW / 2, bot + 96, { size: F(15), weight: 800, align: 'center', color: '#495057' });
    }
    reset();
  });

  /* ================= 分子热运动还是机械运动 ================= */
  PS.register('motion-sort', function (el) {
    PS.sortCards(el, [
      ['走进花园，闻到浓浓的花香', 0, '花香分子不停地做无规则运动，扩散到空气中。'],
      ['沙尘暴时，空气中弥漫着大量的沙尘', 1, '沙尘是由大量分子组成的颗粒，它的运动是机械运动。'],
      ['扫地时，阳光下看到尘土飞扬', 1, '看得见的尘土是宏观物体，不是分子。'],
      ['炒菜时，满屋飘香', 0, '温度高，分子运动剧烈，香味扩散得快。'],
      ['腌咸菜，几天后菜变咸了', 0, '盐分子进入了菜中，是扩散现象。'],
      ['洪水中夹带着大量泥沙', 1, '泥沙随水流动，是机械运动。'],
      ['冬天，雪花漫天飞舞', 1, '雪花是看得见的物体，它的运动是机械运动。'],
      ['打开香水瓶，满屋都能闻到香味', 0, '香水分子扩散到整个房间。'],
      ['春天，柳絮飞扬', 1, '柳絮是看得见的物体。'],
      ['在清水中滴一滴墨水，过一会儿整杯水都变黑了', 0, '墨水分子在水中扩散。'],
      ['煤堆在墙角，时间久了墙壁里面也变黑了', 0, '固体之间也能发生扩散，只是很慢。'],
      ['雾霾天，PM2.5 颗粒物在空中飘浮', 1, 'PM2.5 是直径约 2.5 μm 的颗粒，比分子大得多，它的运动是机械运动。'],
      ['在公共场所吸烟，周围的人能闻到烟味', 0, '烟味分子扩散到周围的空气中，所以公共场所要禁止吸烟。'],
      ['燃放烟花后，烟雾在空中翻滚', 1, '看得见的烟雾是由许多小颗粒组成的，它们的运动是机械运动。'],
    ], ['分子热运动', '机械运动']);
  });

  /* ================= 分子间的作用力 ================= */
  PS.register('mol-force', function (el) {
    const VW = 1000, RM = 4, R0 = 1;
    const st = { r: 1.6, v: 0, free: false, both: true, spring: true, state: null };
    const rep = (x) => 1 / Math.pow(x, 4), att = (x) => -1 / Math.pow(x, 2); // 斥力、引力（示意，r₀ 处相等）
    const net = (x) => rep(x) + att(x);
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 820 : 600), draw });
    const msg = h('div', { class: 'th-msg info' });
    const chips = h('div', { class: 'th-chips' });
    const ST = [
      { k: 'solid', n: '固体', r: 1.0, amp: 0.05, t: '<b>固体</b>：分子间的距离很小（约 r₀），作用力很大，分子只能在平衡位置附近振动，所以固体有一定的形状和体积。' },
      { k: 'liquid', n: '液体', r: 1.08, amp: 0.14, t: '<b>液体</b>：分子间的距离比固体稍大，作用力较小，分子在某个位置附近振动，还能移动到别的位置，所以液体有一定的体积，没有固定的形状，具有流动性。' },
      { k: 'gas', n: '气体', r: 12, amp: 0, t: '<b>气体</b>：分子间的距离很大（大于 10r₀），作用力十分微弱，可以忽略，分子几乎不受约束，可以自由运动，所以气体没有固定的形状和体积，容易被压缩。' },
    ];
    ST.forEach((s) => chips.append(PS.ui.button(s.n, () => { st.state = s.k; st.free = false; tell(); }, 'btn btn-sm')));
    const tB = PS.ui.toggle('同时画出引力和斥力', st.both, (v) => { st.both = v; S.render(); });
    const sB = PS.ui.toggle('用弹簧来比喻', st.spring, (v) => { st.spring = v; S.render(); });
    el.append(PS.ui.row(PS.ui.button('松手，让分子 B 自由运动', () => { st.state = null; st.free = true; st.v = 0; tell(); }, 'btn btn-primary btn-sm'), tB.el, sB.el), h('div', { class: 'small muted', style: { marginTop: '4px' } }, '三种状态中分子间的距离：'), chips, msg);
    const lay = (VH, F) => {
      const gx0 = 110, gx1 = VW - 60, rad = (0.42 * (gx1 - gx0)) / RM, my = 24 + F(14) * 1.2 + 44 + rad, gy0 = my + rad + 28 + F(13) * 1.4 + 26, gy1 = VH - F(13) * 2.4 - 14;
      const X = (r) => gx0 + (r / RM) * (gx1 - gx0);
      const YR = [-0.65, 1.25], Y = (f) => gy1 - ((f - YR[0]) / (YR[1] - YR[0])) * (gy1 - gy0);
      return { gx0, gx1, my, gy0, gy1, X, Y, YR };
    };
    PS.drag(S, { VW, get VH() { return S.VH; },
      hit: (p) => { const F = (px) => EN.fs(S.w || 1000, px), L = lay(S.VH, F); return st.r < RM && Math.hypot(p.x - L.X(st.r), p.y - L.my) < 80 ? 1 : null; },
      start: () => { st.free = false; st.state = null; },
      move: (o, p) => { const F = (px) => EN.fs(S.w || 1000, px), L = lay(S.VH, F); st.r = PS.clamp(((p.x - L.gx0) / (L.gx1 - L.gx0)) * RM, 0.78, RM - 0.15); st.v = 0; tell(); },
    });
    function tell() {
      let s;
      if (st.state) s = ST.find((x) => x.k === st.state).t;
      else {
        const f = net(st.r);
        if (st.r > 3.2) s = '分子间的距离较大时，引力和斥力都变得很小。距离大于分子直径的 10 倍时，分子间的作用力十分微弱，可以忽略。';
        else if (Math.abs(st.r - R0) < 0.03) s = '<b>r = r₀</b>：引力和斥力大小相等，分子 B 受到的合力为零——这个位置叫做<b>平衡位置</b>。';
        else if (f > 0) s = '<b>r &lt; r₀</b>：斥力大于引力，作用力表现为<b>斥力</b>。分子靠得越近，斥力增大得越快——所以固体和液体很难被压缩。';
        else s = '<b>r &gt; r₀</b>：引力大于斥力，作用力表现为<b>引力</b>——所以固体和液体中的分子不会散开，总是聚合在一起。';
        s += '<br><span class="small">分子之间<b>同时存在引力和斥力</b>，就像用弹簧连着的两个小球：压缩时互相推开，拉伸时互相拉近。拖动分子 B 试试，或者点“松手”。</span>';
      }
      msg.innerHTML = s; S.render();
    }
    PS.loop((dt) => {
      const T = performance.now() / 1000;
      if (st.state) {
        const s = ST.find((x) => x.k === st.state);
        if (s.k === 'gas') st.r = RM + 1; else st.r = s.r + Math.sin(T * 9) * s.amp + Math.sin(T * 13.7) * s.amp * 0.4;
        S.render();
      } else if (st.free && st.r < RM) {
        for (let k = 0; k < 4; k++) { const d = dt / 4; st.v += (net(st.r) * 9 - st.v * 1.4) * d; st.r = PS.clamp(st.r + st.v * d, 0.75, RM - 0.15); }
        if (Math.abs(st.v) < 0.003 && Math.abs(st.r - 1) < 0.004) { st.free = false; st.r = 1; tell(); }
        if (Math.round(st.r * 40) !== st.k) { st.k = Math.round(st.r * 40); tell(); }
        else S.render();
      }
    }, el).start();
    function spring(ctx, x1, x2, y, n) {
      ctx.save(); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y);
      const L = x2 - x1, a = 16;
      for (let i = 1; i < n * 2; i++) ctx.lineTo(x1 + (L * i) / (n * 2), y + (i % 2 ? -a : a));
      ctx.lineTo(x2, y); ctx.stroke(); ctx.restore();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), L = lay(VH, F);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const rad = (L.X(1) - L.X(0)) * 0.42, xa = L.X(0), xb = L.X(st.r), y = L.my, far = st.r >= RM;
      // 分子与弹簧
      if (st.spring && !far) spring(ctx, xa + rad * 0.9, xb - rad * 0.9, y, 8);
      TH.ball(ctx, xa, y, rad, '#4c6ef5');
      D.text(ctx, 'A', xa, y + 7, { size: F(18), weight: 800, align: 'center', color: '#fff' });
      if (!far) {
        TH.ball(ctx, xb, y, rad, '#f08c00');
        D.text(ctx, 'B', xb, y + 7, { size: F(18), weight: 800, align: 'center', color: '#fff' });
        const f = net(st.r), k = 120;
        if (st.both) {
          const fr = Math.min(170, rep(st.r) * k), fa = Math.min(170, -att(st.r) * k);
          if (fr > 6) D.arrow(ctx, xb, y - rad - 16, xb + fr, y - rad - 16, { color: '#ae3ec9', width: 4, head: 12 });
          if (fa > 6) D.arrow(ctx, xb, y - rad - 34, xb - fa, y - rad - 34, { color: '#1c7ed6', width: 4, head: 12 });
          if (fr > 6) D.text(ctx, '斥力', xb + fr + 6, y - rad - 10, { size: F(13), weight: 800, color: '#ae3ec9' });
          if (fa > 6) D.text(ctx, '引力', xb - fa - 6, y - rad - 30, { size: F(13), weight: 800, color: '#1c7ed6', align: 'right' });
        }
        const fn = PS.clamp(f * k, -170, 170);
        if (Math.abs(fn) > 5) D.arrow(ctx, xb, y + rad + 18, xb + fn, y + rad + 18, { color: '#e8590c', width: 5, head: 13 });
        D.text(ctx, Math.abs(fn) > 5 ? (f > 0 ? '合力：斥力' : '合力：引力') : '合力为零', xb, y + rad + 22 + F(13) * 1.3, { size: F(13), weight: 800, align: 'center', color: '#e8590c' });
        D.text(ctx, '分子间的距离 r = ' + PS.fmt(st.r, 2) + ' r₀', 20, F(14) + 8, { size: F(14), weight: 800, color: '#343a40' });
      } else {
        D.arrow(ctx, VW - 230, y, VW - 60, y, { color: '#f08c00', width: 3, dash: [8, 6] });
        D.text(ctx, '分子 B 在很远处（r > 10r₀）', VW - 60, y - 20, { size: F(14), weight: 800, align: 'right', color: '#f08c00' });
      }
      // 坐标图
      const { X, Y, gx0, gx1, gy0, gy1 } = L;
      ctx.fillStyle = '#fff'; ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
      D.arrow(ctx, gx0, Y(0), gx1 + 30, Y(0), { color: '#343a40', width: 2 });
      D.arrow(ctx, gx0, gy1, gx0, gy0 - 14, { color: '#343a40', width: 2 });
      D.text(ctx, 'r', gx1 + 34, Y(0) + 6, { size: F(15), weight: 800, color: '#343a40' });
      D.text(ctx, '斥力', gx0 - 8, Y(0.9), { size: F(12), weight: 700, align: 'right', color: '#ae3ec9' });
      D.text(ctx, '引力', gx0 - 8, Y(-0.45), { size: F(12), weight: 700, align: 'right', color: '#1c7ed6' });
      ctx.save(); ctx.beginPath(); ctx.rect(gx0, gy0 - 4, gx1 - gx0, gy1 - gy0 + 8); ctx.clip();
      const curve = (fn, c, wd, dash) => { ctx.strokeStyle = c; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.beginPath(); for (let r = 0.55; r <= RM; r += 0.01) { const yy = Y(fn(r)); r === 0.55 ? ctx.moveTo(X(r), yy) : ctx.lineTo(X(r), yy); } ctx.stroke(); ctx.setLineDash([]); };
      if (st.both) { curve(rep, '#ae3ec9', 2, [7, 5]); curve(att, '#1c7ed6', 2, [7, 5]); }
      curve(net, '#e8590c', 3.5);
      ctx.restore();
      ctx.strokeStyle = 'rgba(52,58,64,.45)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(X(1), gy0); ctx.lineTo(X(1), gy1); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, 'r₀', X(1), Y(0) + F(14) + 4, { size: F(14), weight: 800, align: 'center', color: '#343a40' });
      if (!far) { ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(X(st.r), Y(PS.clamp(net(st.r), L.YR[0], L.YR[1])), 8, 0, TAU); ctx.fill(); }
      D.text(ctx, '橙色：分子间的作用力（合力）随距离变化的示意图', gx0, gy1 + F(13) * 1.5 + 4, { size: F(12), color: '#868e96' });
    }
    tell();
  });

  /* ================= 分子间作用力的实验 ================= */
  PS.register('mol-demos', function (el) {
    const VW = 1000;
    const st = { s: 'lead', lead: 'apart', kg: 0, limit: 0, fall: 0, plate: 'air', pull: 0, F: 0.3, fmax: 0, press: 0, mix: 0, beans: false, hist: [] };
    const SC = { lead: '铅柱“粘”在一起', plate: '把玻璃板拉出水面', press: '压缩空气和水', mix: '水和酒精混合' };
    const seg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k] })), st.s, (v) => { st.s = v; build(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 700 : 500), draw });
    const ctl = h('div', { class: 'controls' });
    const msg = h('div', { class: 'th-msg info' });
    el.append(ctl, msg);
    const btn = (t, f, c) => PS.ui.button(t, f, c || 'btn btn-sm');
    function build() {
      ctl.innerHTML = '';
      if (st.s === 'lead') {
        ctl.append(btn('削平端面，用力压紧', () => { st.lead = 'pressed'; st.kg = 0; st.fall = 0; st.limit = PS.randInt(4, 5) * 2; tell(); }, 'btn btn-primary btn-sm'), btn('端面不平，轻轻对在一起', () => { st.lead = 'loose'; st.kg = 0; st.fall = 0.001; tell(); }), btn('挂一个 2 kg 的重物', () => {
          if (st.lead === 'apart' || st.fall) return;
          st.kg += 2; PS.sound.clack();
          if (st.lead === 'loose' || st.kg > st.limit) st.fall = 0.001;
          tell();
        }, 'btn btn-green btn-sm'), btn('分开重来', () => { st.lead = 'apart'; st.kg = 0; st.fall = 0; tell(); }, 'btn btn-ghost btn-sm'));
      } else if (st.s === 'plate') {
        ctl.append(btn('① 放下玻璃板，使它接触水面', () => { st.plate = 'touch'; st.pull = 0; st.F = 0.3; st.fmax = 0.3; st.hist = []; tell(); }, 'btn btn-primary btn-sm'), btn('② 慢慢向上拉', () => { if (st.plate === 'touch') { st.plate = 'pull'; tell(); } }, 'btn btn-green btn-sm'), btn('重来', () => { st.plate = 'air'; st.pull = 0; st.F = 0.3; st.hist = []; tell(); }, 'btn btn-ghost btn-sm'));
      } else if (st.s === 'press') {
        ctl.append(btn('用同样大的力推活塞', () => { st.pressT = 1; tell(); }, 'btn btn-primary btn-sm'), btn('松手', () => { st.pressT = 0; tell(); }, 'btn btn-ghost btn-sm'));
      } else {
        ctl.append(btn('把酒精倒入水中，摇匀', () => { st.beans = false; st.mixT = 1; st.mix = 0; tell(); }, 'btn btn-primary btn-sm'), btn('类比：黄豆和芝麻混合', () => { st.beans = true; st.mixT = 1; st.mix = 0; tell(); }), btn('重来', () => { st.mixT = 0; st.mix = 0; tell(); }, 'btn btn-ghost btn-sm'));
      }
      tell();
    }
    function tell() {
      let s, cls = 'info';
      if (st.s === 'lead') {
        if (st.lead === 'apart') s = '把两个铅柱的底面<b>削平、削干净</b>，然后<b>紧紧地压在一起</b>，两个铅柱就会结合起来。';
        else if (st.lead === 'loose') s = '端面不平、没有压紧，一松手下面的铅柱就掉下来了——两个铅柱之间绝大多数分子的距离太大，引力几乎为零。';
        else if (st.fall) { s = '挂上 ' + st.kg + ' kg 的重物后，铅柱终于被拉开了。分子间的引力是有限度的。'; cls = 'ok'; }
        else { s = '两个铅柱紧压后结合在一起，下面挂上 <b>' + st.kg + ' kg</b> 的重物都不能把它们拉开！说明<b>分子之间存在引力</b>（只有分子间的距离很小时引力才明显）。'; cls = st.kg ? 'ok' : 'info'; }
      } else if (st.s === 'plate') {
        if (st.plate === 'air') s = '用弹簧测力计吊着一块干净的玻璃板，玻璃板在空气中时，测力计的示数等于玻璃板的重力 0.30 N。';
        else if (st.plate === 'touch') s = '玻璃板的下表面接触水面后，示数基本不变。现在慢慢向上拉……';
        else if (st.plate === 'pull') s = '向上拉时，玻璃板“粘”着水面，示数变大了！';
        else { s = '玻璃板离开水面前，测力计的最大示数约为 <b>' + PS.fmt(st.fmax, 2) + ' N</b>，比玻璃板的重力大。这是因为玻璃分子和水分子之间存在<b>引力</b>。玻璃板离开水面后，下表面沾着一层水。'; cls = 'ok'; }
      } else if (st.s === 'press') {
        s = st.pressT ? '用同样大的力推活塞：装空气的注射器很容易被压缩，装水的注射器几乎压不动。<b>液体和固体中分子间的距离很小，靠得更近时分子间表现为斥力</b>，所以很难被压缩；气体分子间的距离很大，容易被压缩。' : '两个注射器中分别装有 40 mL 的空气和 40 mL 的水，堵住注射器的口。';
        cls = st.pressT ? 'ok' : 'info';
      } else {
        if (!st.mixT) s = '量筒甲中有 50 mL 的水，量筒乙中有 50 mL 的酒精。把它们倒在一起，总体积是 100 mL 吗？';
        else if (st.mix < 1) s = '倒入、摇匀……';
        else if (st.beans) { s = '50 mL 黄豆和 50 mL 芝麻混合后，总体积小于 100 mL——芝麻钻进了黄豆之间的空隙里。这只是一个类比。'; cls = 'ok'; }
        else { s = '混合后的总体积约为 <b>96 mL</b>，<b>小于 100 mL</b>！说明<b>分子之间有间隙</b>：水分子和酒精分子彼此进入了对方分子间的空隙。'; cls = 'ok'; }
      }
      msg.className = 'th-msg ' + cls; msg.innerHTML = s; S.render();
    }
    PS.loop((dt) => {
      if (st.s === 'lead' && st.fall && st.fall < 1) { st.fall = Math.min(1, st.fall + dt * 1.6); if (st.fall >= 1) { PS.sound.clack(); tell(); } }
      if (st.s === 'plate' && st.plate === 'pull') {
        st.pull += dt * 0.32;
        st.F = 0.3 + 0.4 * Math.min(1, st.pull / 0.85) - 0.05 * Math.max(0, (st.pull - 0.85) / 0.15);
        st.fmax = Math.max(st.fmax, st.F);
        if (st.pull >= 1) { st.plate = 'off'; st.F = 0.3; PS.sound.ping(); tell(); }
      } else if (st.s === 'plate' && st.plate === 'off' && st.pull < 1.4) st.pull += dt * 0.6;
      if (st.s === 'plate' && (st.plate === 'pull' || st.plate === 'off') && st.hist.length < 400 && st.pull < 1.6) st.hist.push(st.F);
      if (st.s === 'press') st.press += ((st.pressT || 0) - st.press) * Math.min(1, dt * 4);
      if (st.s === 'mix' && st.mixT && st.mix < 1) { st.mix = Math.min(1, st.mix + dt * 0.45); if (st.mix >= 1) tell(); }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w), T = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const GY = VH - 30;
      if (st.s === 'lead') {
        // 铁架台
        ctx.fillStyle = '#495057'; ctx.fillRect(200, 30, 12, GY - 30); ctx.fillRect(160, GY - 12, 120, 12); ctx.fillRect(200, 40, 330, 10);
        const cx = 500, top = 50, ch = 90, cw = 90;
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top + 30); ctx.stroke();
        const lead = (y, rough) => {
          const g = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0); g.addColorStop(0, '#868e96'); g.addColorStop(0.4, '#dee2e6'); g.addColorStop(1, '#6c757d');
          ctx.fillStyle = g; ctx.fillRect(cx - cw / 2, y, cw, ch);
          ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.ellipse(cx, y, cw / 2, 10, 0, 0, TAU); ctx.fill();
          if (rough) { ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 12; i++) ctx.lineTo(cx - cw / 2 + (i * cw) / 12, y + ch + (i % 2 ? 5 : -3)); ctx.stroke(); }
        };
        if (st.lead === 'apart') {
          lead(top + 30, false);
          lead(GY - ch - 20, false); D.text(ctx, '铅柱', cx + cw / 2 + 14, GY - 70, { size: F(14), weight: 700, color: '#495057' });
        } else {
          const y1 = top + 30, yEnd = GY - ch - (st.kg ? 20 + (st.kg / 2) * 22 : 0), y2 = y1 + ch + (st.lead === 'loose' ? 2 : 0) + st.fall * st.fall * (yEnd - y1 - ch);
          lead(y1, st.lead === 'loose');
          lead(y2, st.lead === 'loose');
          // 挂钩与重物
          const hy = y2 + ch;
          if (st.kg) {
            ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx, hy + 20); ctx.stroke();
            const n = st.kg / 2;
            for (let i = 0; i < n; i++) { const by = hy + 20 + i * 22; ctx.fillStyle = i % 2 ? '#5c7cfa' : '#4263eb'; D.roundRect(ctx, cx - 50, by, 100, 20, 5); ctx.fill(); D.text(ctx, '2 kg', cx, by + 15, { size: Math.min(F(12), 16), weight: 800, align: 'center', color: '#fff' }); }
          }
          if (st.lead === 'pressed' && !st.fall) { ctx.strokeStyle = '#e8590c'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeRect(cx - cw / 2 - 8, y1 + ch - 12, cw + 16, 24); ctx.setLineDash([]); D.text(ctx, '接触面', cx + cw / 2 + 14, y1 + ch + 5, { size: F(13), weight: 700, color: '#e8590c' }); }
        }
        D.text(ctx, '挂的重物：' + st.kg + ' kg', 640, 110, { size: F(16), weight: 800, color: '#343a40' });
      } else if (st.s === 'plate') {
        const cx = nar ? 380 : 400, wy = GY - 130, lift = st.plate === 'air' ? -70 : st.plate === 'touch' ? 0 : Math.min(st.pull, 1) * 26 + Math.max(0, st.pull - 1) * 90;
        PS.beaker(ctx, cx, GY, 360, 230, { level: 0.43, water: '#a5d8ff' });
        const py = GY - 230 * 0.43 - 8 - lift;
        // 被拉起的水
        if (st.plate === 'pull') { ctx.fillStyle = 'rgba(165,216,255,.95)'; ctx.beginPath(); ctx.moveTo(cx - 110, py + 8); ctx.quadraticCurveTo(cx - 120, GY - 230 * 0.43, cx - 150, GY - 230 * 0.43 + 1); ctx.lineTo(cx + 150, GY - 230 * 0.43 + 1); ctx.quadraticCurveTo(cx + 120, GY - 230 * 0.43, cx + 110, py + 8); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = 'rgba(200,230,240,.9)'; ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2; ctx.fillRect(cx - 110, py, 220, 9); ctx.strokeRect(cx - 110, py, 220, 9);
        if (st.plate === 'off') { ctx.fillStyle = 'rgba(77,171,247,.6)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(cx - 96 + i * 24, py + 13, 4, 0, TAU); ctx.fill(); } }
        // 细线与测力计
        const sy = py - 80;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 100, py); ctx.lineTo(cx, sy); ctx.lineTo(cx + 100, py); ctx.stroke();
        const bx = cx - 26, bh = 160, btop = sy - bh;
        ctx.fillStyle = '#f1f3f5'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; D.roundRect(ctx, bx, btop, 52, bh, 8); ctx.fill(); ctx.stroke();
        for (let i = 0; i <= 10; i++) { const yy = btop + 20 + i * 13; ctx.beginPath(); ctx.moveTo(bx + 30, yy); ctx.lineTo(bx + (i % 5 ? 40 : 46), yy); ctx.stroke(); if (i % 5 === 0) D.text(ctx, PS.fmt(i / 10, 1), bx + 26, yy + 4, { size: F(11), weight: 700, align: 'right', color: '#343a40' }); }
        const ptr = btop + 20 + (st.F / 0.1) * 13;
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(bx + 46, ptr); ctx.lineTo(bx + 30, ptr - 5); ctx.lineTo(bx + 30, ptr + 5); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#495057'; ctx.beginPath(); ctx.moveTo(cx, btop); ctx.lineTo(cx, btop - 26); ctx.moveTo(cx, btop + bh); ctx.lineTo(cx, sy); ctx.stroke();
        D.text(ctx, '示数 ' + PS.fmt(st.F, 2) + ' N', cx + 60, btop + 40, { size: F(17), weight: 800, color: '#e03131' });
        // F–t 图像
        const gx = nar ? 640 : 680, gw = nar ? 330 : 280, gy = 80, gh = nar ? 220 : 180;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.fillRect(gx, gy, gw, gh); ctx.strokeRect(gx, gy, gw, gh);
        const Yf = (f) => gy + gh - (f / 0.8) * gh;
        ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(gx, Yf(0.3)); ctx.lineTo(gx + gw, Yf(0.3)); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, 'G = 0.30 N', gx + gw - 4, Yf(0.3) - 6, { size: F(12), weight: 700, align: 'right', color: '#868e96' });
        ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2.5; ctx.beginPath(); st.hist.forEach((f, i) => { const x = gx + (i / 300) * gw; i ? ctx.lineTo(x, Yf(f)) : ctx.moveTo(x, Yf(f)); }); ctx.stroke();
        D.text(ctx, '测力计的示数 F', gx, gy - 10, { size: F(13), weight: 700, color: '#495057' });
      } else if (st.s === 'press') {
        const p = st.press;
        [['空气', 0], ['水', 1]].forEach(([n, k]) => {
          const y = (nar ? 150 : 140) + k * (nar ? 250 : 190), x0 = 120, L0 = 480, comp = k ? 0.004 : 0.45, L = L0 * (1 - comp * p);
          ctx.fillStyle = 'rgba(235,244,252,.7)'; ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2.5; ctx.fillRect(x0, y - 45, 560, 90); ctx.strokeRect(x0, y - 45, 560, 90);
          ctx.fillStyle = '#495057'; ctx.fillRect(x0 - 26, y - 8, 26, 16); ctx.fillStyle = '#e03131'; ctx.fillRect(x0 - 40, y - 14, 14, 28);
          // 内容物
          ctx.save(); ctx.beginPath(); ctx.rect(x0, y - 43, L, 86); ctx.clip();
          if (k) { ctx.fillStyle = 'rgba(165,216,255,.8)'; ctx.fillRect(x0, y - 43, L, 86); }
          const n2 = k ? 60 : 18;
          for (let i = 0; i < n2; i++) { const fx = hash(i + k * 70), fy = hash(i * 3 + 9 + k * 70); const xx = x0 + 10 + fx * (L - 20) + Math.sin(T * 5 + i) * (k ? 2 : 8), yy = y - 36 + fy * 72 + Math.cos(T * 4 + i) * (k ? 2 : 8); TH.ball(ctx, xx, yy, k ? 9 : 8, k ? '#1c7ed6' : '#adb5bd'); }
          ctx.restore();
          // 活塞
          ctx.fillStyle = '#343a40'; ctx.fillRect(x0 + L, y - 43, 14, 86); ctx.fillStyle = '#868e96'; ctx.fillRect(x0 + L + 14, y - 6, 220, 12); ctx.fillRect(x0 + L + 230, y - 34, 14, 68);
          if (p > 0.05) D.arrow(ctx, x0 + L + 330, y, x0 + L + 254, y, { color: '#e8590c', width: 5, head: 14 });
          D.text(ctx, n, x0 + 8, y - 54, { size: F(15), weight: 800, color: k ? '#1c7ed6' : '#495057' });
          D.text(ctx, PS.fmt(40 * (1 - comp * p), 0) + ' mL', x0 + 560, y - 54, { size: F(15), weight: 800, align: 'right', color: '#343a40' });
        });
      } else {
        const m = st.mix, y0 = GY, beans = st.beans;
        const vA = 50 * (1 - smooth(0, 0.5, m)), vB = 50 * (1 - smooth(0.3, 0.8, m));
        const fin = beans ? 88 : 96, vC = m < 0.5 ? smooth(0, 0.5, m) * 50 : m < 0.8 ? 50 + smooth(0.3, 0.8, m) * 50 : 100 - (100 - fin) * smooth(0.8, 1, m);
        const cA = beans ? '#e9c46a' : 'rgba(165,216,255,.85)', cB = beans ? '#868e96' : 'rgba(255,236,153,.85)';
        const sx = nar ? [170, 380, 720] : [180, 380, 720], top = 70;
        cylinder(ctx, sx[0], top + 110, y0, 70, { F, max: 60, div: 2, label: 10, level: vA, color: cA, fs: 10 });
        cylinder(ctx, sx[1], top + 110, y0, 70, { F, max: 60, div: 2, label: 10, level: vB, color: cB, fs: 10 });
        const big = cylinder(ctx, sx[2], top, y0, 90, { F, max: 110, div: 2, label: 10, fs: 10, fill: (Y, l, r) => {
          if (vC <= 0) return;
          if (m < 0.8 && m > 0.5) { ctx.fillStyle = cA; ctx.fillRect(l + 2, Y(50), r - l - 4, Y(0) - Y(50)); ctx.fillStyle = cB; ctx.fillRect(l + 2, Y(vC), r - l - 4, Y(50) - Y(vC)); }
          else { ctx.fillStyle = m >= 0.8 ? (beans ? '#c9b37e' : 'rgba(200,226,220,.9)') : cA; ctx.fillRect(l + 2, Y(vC), r - l - 4, Y(0) - Y(vC)); }
          ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(l + 2, Y(vC)); ctx.lineTo(r - 2, Y(vC)); ctx.stroke();
          ctx.strokeStyle = '#e03131'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(l - 10, Y(100)); ctx.lineTo(r + 10, Y(100)); ctx.stroke(); ctx.setLineDash([]);
        } });
        D.text(ctx, '100 mL', sx[2] + 56, big.Y(100) + 5, { size: F(12), weight: 800, color: '#e03131' });
        D.text(ctx, beans ? '黄豆' : '水', sx[0], top + 92, { size: F(15), weight: 800, align: 'center', color: '#1c7ed6' });
        D.text(ctx, beans ? '芝麻' : '酒精', sx[1], top + 92, { size: F(15), weight: 800, align: 'center', color: '#b08900' });
        if (m >= 1) D.text(ctx, '约 ' + fin + ' mL →', sx[2] - 54, big.Y(fin) + 6, { size: F(16), weight: 800, align: 'right', color: '#2b8a3e' });
        // 微观示意
        if (m >= 1) {
          const zx = nar ? 545 : 540, zy = nar ? 450 : 330, R = 70;
          ctx.save(); ctx.beginPath(); ctx.arc(zx, zy, R, 0, TAU); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(zx - R, zy - R, 2 * R, 2 * R);
          for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const xx = zx + i * 18 + (j % 2 ? 9 : 0), yy = zy + j * 16; TH.ball(ctx, xx, yy, 8, beans ? '#e9c46a' : '#4dabf7'); if (Math.abs(i + j) % 2 === 0) TH.ball(ctx, xx + 9, yy + 8, 4, beans ? '#495057' : '#f08c00'); }
          ctx.restore(); ctx.strokeStyle = '#343a40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(zx, zy, R + 2, 0, TAU); ctx.stroke();
          D.text(ctx, beans ? '芝麻填进了空隙' : '分子彼此进入空隙', zx, zy + R + F(12) * 1.4, { size: F(12), weight: 700, align: 'center', color: '#495057' });
        }
      }
    }
    build();
  });
})();
