/*
 * 看得见的物理 · 第6章公共库（质量与密度）
 * PS.RHO                教材密度表（固体、液体：×10³ kg/m³；气体：kg/m³，0 ℃、标准大气压）
 * PS.MAT                常用材料（名称、密度 g/cm³、颜色）
 * PS.mass.WEIGHTS       砝码盒：100、50、20、20、10、5 g；天平称量 200 g，标尺 0~5 g，分度值 0.2 g
 * PS.mass.decompose(m)  用砝码和游码凑出质量（从大到小试加）
 * PS.mass.balance(ctx, F, o)  托盘天平正视图（横梁倾斜、指针、标尺与游码、托盘上的物体和砝码）
 * PS.mass.beam()        横梁摆动模型（阻尼振动）；PS.mass.tiltOf(Δ克) → −1~1；指针偏向较重的一侧（“左偏右调”）
 * PS.mass.weight / rider / scale / cylinder / beaker / block / stone  画砝码、标尺放大图、电子秤、量筒、烧杯、长方体、石块
 * PS.mass.fmt(g, d)     质量读数格式
 * 依赖 core.js
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  /* ---------------- 密度表（人教版教材） ---------------- */
  PS.RHO = {
    solid: [['锇', 22.5], ['金', 19.3], ['铅', 11.3], ['银', 10.5], ['铜', 8.9], ['钢、铁', 7.9], ['铝', 2.7], ['花岗岩', '2.6~2.8'], ['砖', '1.4~2.2'], ['冰（0 ℃）', 0.9], ['蜡', 0.9], ['干松木', 0.5]],
    liquid: [['水银', 13.6], ['硫酸', 1.8], ['海水', 1.03], ['纯水', 1.0], ['植物油', 0.9], ['煤油', 0.8], ['酒精', 0.8], ['汽油', 0.71]],
    gas: [['二氧化碳', 1.98], ['氧', 1.43], ['空气', 1.29], ['一氧化碳', 1.25], ['氦', 0.18], ['氢', 0.09]],
  };

  /* 常用材料（密度单位 g/cm³） */
  PS.MAT = {
    gold: { name: '金', rho: 19.3, c: '#f2c230', d: '#b8860b' },
    lead: { name: '铅', rho: 11.3, c: '#7b8494', d: '#4a5160' },
    silver: { name: '银', rho: 10.5, c: '#dfe4ea', d: '#9aa3ad' },
    copper: { name: '铜', rho: 8.9, c: '#d9895a', d: '#9c5528' },
    iron: { name: '铁', rho: 7.9, c: '#9aa3ae', d: '#5f6773' },
    al: { name: '铝', rho: 2.7, c: '#d5dbe2', d: '#97a1ac' },
    granite: { name: '花岗岩', rho: 2.7, c: '#a59e94', d: '#6f675d' },
    ice: { name: '冰', rho: 0.9, c: '#d0ebff', d: '#74c0fc' },
    wax: { name: '石蜡', rho: 0.9, c: '#f4eed6', d: '#c9bd8c' },
    wood: { name: '干松木', rho: 0.5, c: '#e0b878', d: '#a87b3c' },
    water: { name: '水', rho: 1.0, c: '#a5d8ff', d: '#4dabf7' },
  };

  const M = (PS.mass = {});
  M.WEIGHTS = [100, 50, 20, 20, 10, 5];
  M.CAP = 200; M.RMAX = 5; M.DIV = 0.2;
  M.fmt = (g, d) => PS.fmt(g, d == null ? 1 : d).replace('-', '−');

  /** 用砝码（从大到小）和游码凑出质量 m（g）：返回 { w: [砝码], r: 游码示数 } */
  M.decompose = function (m) {
    // 从大到小试加砝码，剩下不足 5 g 的部分用游码
    const w = [];
    let rest = PS.round(m, 2);
    for (const g of M.WEIGHTS) { if (rest >= g - 1e-9) { w.push(g); rest = PS.round(rest - g, 2); } }
    return { w, r: rest };
  };

  /** 天平横梁的倾斜量：Δ = 左盘 − 右盘（g），±1 g 时指针偏满 10 格（每格 0.1 g），再大就碰到限位 */
  M.tiltOf = (delta) => PS.clamp(delta / 1.0, -1.08, 1.08);

  /** 横梁摆动（阻尼振动）。b.step(dt, 目标倾斜) ；b.a 当前倾斜（正 = 左盘下沉，指针偏左） */
  M.beam = function (o) {
    o = o || {};
    const b = { a: o.a || 0, v: 0 };
    const w = TAU * (o.freq || 0.75), z = o.damp || 0.13;
    b.step = function (dt, target) {
      const n = Math.max(1, Math.ceil(dt / 0.004)), hh = dt / n;
      for (let i = 0; i < n; i++) {
        const acc = -w * w * (b.a - target) - 2 * z * w * b.v;
        b.v += acc * hh; b.a += b.v * hh;
        if (Math.abs(b.a) > 1.08) { b.a = Math.sign(b.a) * 1.08; b.v *= -0.25; }
      }
    };
    b.kick = (v) => { b.v += v; };
    Object.defineProperty(b, 'still', { get: () => Math.abs(b.v) < 0.03 });
    return b;
  };

  /* ---------------- 砝码 ---------------- */
  const WSIZE = { 100: [26, 33], 50: [21, 27], 20: [16, 21], 10: [13, 17], 5: [11, 14], 2: [9, 11], 1: [8, 10] };
  /** 砝码（底部中心在 x, y） */
  M.weight = function (ctx, x, y, g, o) {
    o = o || {};
    const [w, hh] = WSIZE[g] || [12, 15];
    ctx.save();
    const gr = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    gr.addColorStop(0, '#9c6b16'); gr.addColorStop(0.35, '#f7d774'); gr.addColorStop(0.6, '#e2b23f'); gr.addColorStop(1, '#8a5a0b');
    ctx.fillStyle = gr; ctx.strokeStyle = '#6b4708'; ctx.lineWidth = 0.8;
    // 身
    D.roundRect(ctx, x - w / 2, y - hh, w, hh, 2.5); ctx.fill(); ctx.stroke();
    // 颈与钮
    const nw = w * 0.32, nh = hh * 0.18, kr = w * 0.24;
    ctx.fillRect(x - nw / 2, y - hh - nh, nw, nh); ctx.strokeRect(x - nw / 2, y - hh - nh, nw, nh);
    ctx.beginPath(); ctx.ellipse(x, y - hh - nh - kr * 0.55, kr, kr * 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (o.label !== false && w >= 11) {
      ctx.fillStyle = '#5c3d05'; ctx.font = PS.font(Math.max(5.5, w * 0.3), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(g + 'g', x, y - hh * 0.45);
    }
    if (o.hl) { ctx.strokeStyle = o.hl; ctx.lineWidth = 2; D.roundRect(ctx, x - w / 2 - 2, y - hh - nh - kr * 1.3, w + 4, hh + nh + kr * 1.3 + 2, 4); ctx.stroke(); }
    ctx.restore();
    return w;
  };
  M.weightSize = (g) => WSIZE[g] || [12, 15];

  /** 一排砝码的总宽度 */
  function rowWidth(ws) { return ws.reduce((s, g) => s + M.weightSize(g)[0], 0) + Math.max(0, ws.length - 1) * 2; }

  /* ---------------- 托盘天平（正视图） ----------------
   * o.x, o.y：底座底边中点；o.s：缩放；o.tilt：−1~1（正 = 左盘下沉、指针偏左）；o.rider：游码示数（g）
   * o.left / o.right：托盘上的东西 { w: [砝码], draw(ctx, x, y) 在托盘上画物体（局部坐标，y 为盘面） }
   * o.nut：平衡螺母位置（−1~1，仅示意）；o.labels：显示部件名称；o.hl：高亮部件；o.dim：半透明
   */
  M.balance = function (ctx, F, o) {
    const s = o.s || 1, tilt = o.tilt || 0;
    const th = tilt * 0.05, phi = -tilt * 0.2; // 横梁转角、指针转角（rad）
    const fs = (px, mn) => F(px, mn) / s;
    ctx.save();
    ctx.translate(o.x, o.y); ctx.scale(s, s);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const P = { x: 0, y: -152 };
    // 底座
    let g = ctx.createLinearGradient(0, -24, 0, 0);
    g.addColorStop(0, '#5f6670'); g.addColorStop(1, '#2f343b');
    ctx.fillStyle = g; D.roundRect(ctx, -170, -24, 340, 22, 6); ctx.fill();
    ctx.fillStyle = '#23272d'; [-150, 150].forEach((x) => { ctx.fillRect(x - 12, -3, 24, 3); });
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-164, -22, 328, 3);
    // 支柱
    g = ctx.createLinearGradient(-11, 0, 11, 0);
    g.addColorStop(0, '#454b54'); g.addColorStop(0.5, '#6c737e'); g.addColorStop(1, '#3d424a');
    ctx.fillStyle = g; ctx.fillRect(-10, -150, 20, 128);
    // 分度盘
    const R1 = 100, R2 = 120, A0 = Math.PI / 2;
    ctx.save(); ctx.translate(P.x, P.y);
    ctx.fillStyle = o.hl === 'scale' ? '#fff3bf' : '#f8f9fa'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R2 + 4, A0 - 0.24, A0 + 0.24); ctx.arc(0, 0, R1 - 4, A0 + 0.24, A0 - 0.24, true); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (let i = -10; i <= 10; i++) {
      const a = A0 + i * 0.02, L = i === 0 ? 18 : i % 5 === 0 ? 13 : 8;
      ctx.strokeStyle = i === 0 ? '#e03131' : '#343a40'; ctx.lineWidth = i === 0 ? 1.6 : 0.8;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R2 + 2), Math.sin(a) * (R2 + 2)); ctx.lineTo(Math.cos(a) * (R2 + 2 - L), Math.sin(a) * (R2 + 2 - L)); ctx.stroke();
    }
    // 指针
    ctx.rotate(phi);
    ctx.strokeStyle = o.hl === 'pointer' ? '#3b5bdb' : '#1b2333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, R2 + 1); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(-2.4, R2 - 8); ctx.lineTo(2.4, R2 - 8); ctx.lineTo(0, R2 + 2); ctx.closePath(); ctx.fill();
    ctx.restore();
    // 横梁（绕支点转动）
    const endL = { x: P.x - 128 * Math.cos(th), y: P.y + 128 * Math.sin(th) };
    const endR = { x: P.x + 128 * Math.cos(th), y: P.y - 128 * Math.sin(th) };
    // 托盘架与托盘（托盘保持水平）
    const panY = [endL.y - 36, endR.y - 36];
    [endL, endR].forEach((e, i) => {
      ctx.fillStyle = '#4b525c'; ctx.fillRect(e.x - 2.5, e.y - 34, 5, 34);
      ctx.fillRect(e.x - 22, e.y - 36, 44, 4);
      // 盘
      const y0 = panY[i];
      g = ctx.createLinearGradient(0, y0 - 4, 0, y0 + 10);
      g.addColorStop(0, '#f1f3f5'); g.addColorStop(1, '#adb5bd');
      ctx.fillStyle = o.hl === 'pan' ? '#d0ebff' : g; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.x - 60, y0 - 3); ctx.lineTo(e.x + 60, y0 - 3); ctx.quadraticCurveTo(e.x + 56, y0 + 9, e.x + 40, y0 + 9); ctx.lineTo(e.x - 40, y0 + 9); ctx.quadraticCurveTo(e.x - 56, y0 + 9, e.x - 60, y0 - 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dee2e6'; ctx.beginPath(); ctx.ellipse(e.x, y0 - 3, 60, 3.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
    });
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(-th);
    // 平衡螺母的螺杆与螺母
    const nut = PS.clamp(o.nut || 0, -1, 1);
    [-1, 1].forEach((sd) => {
      ctx.fillStyle = '#868e96'; ctx.fillRect(sd > 0 ? 158 : -184, -2, 26, 4);
      const nx = sd * 171 + nut * 9;
      ctx.fillStyle = o.hl === 'nut' ? '#4c6ef5' : '#adb5bd'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 0.8;
      D.roundRect(ctx, nx - 5, -7, 10, 14, 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(nx - 5, -2.5); ctx.lineTo(nx + 5, -2.5); ctx.moveTo(nx - 5, 2.5); ctx.lineTo(nx + 5, 2.5); ctx.stroke();
    });
    g = ctx.createLinearGradient(0, -7, 0, 7);
    g.addColorStop(0, '#8a929e'); g.addColorStop(0.5, '#5c636e'); g.addColorStop(1, '#3b4049');
    ctx.fillStyle = o.hl === 'beam' ? '#748ffc' : g;
    D.roundRect(ctx, -160, -7, 320, 14, 4); ctx.fill();
    // 标尺
    const X0 = -105, PX = 42;
    ctx.fillStyle = o.hl === 'ruler' ? '#fff3bf' : '#f8f9fa'; ctx.fillRect(X0 - 6, -6, 222, 12);
    ctx.strokeStyle = '#343a40'; ctx.lineWidth = 0.6;
    for (let i = 0; i <= 25; i++) { const x = X0 + i * PX * 0.2, L = i % 5 === 0 ? 6 : 3.5; ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x, -6 + L); ctx.stroke(); }
    ctx.fillStyle = '#343a40'; ctx.font = PS.font(fs(9, 6), 600); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let i = 0; i <= 5; i++) ctx.fillText(String(i), X0 + i * PX + (i === 0 ? 3 : 0), 5.5);
    // 游码（左边缘对准示数）
    const rx = X0 + PS.clamp(o.rider || 0, 0, 5) * PX;
    ctx.fillStyle = o.hl === 'rider' ? 'rgba(76,110,245,.85)' : 'rgba(240,140,0,.88)'; ctx.strokeStyle = '#a35a00'; ctx.lineWidth = 1;
    ctx.fillRect(rx, -9, 7, 18); ctx.strokeRect(rx, -9, 7, 18);
    // 支点（刀口）
    ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
    ctx.restore();
    // 托盘上的东西
    [o.left, o.right].forEach((it, i) => {
      if (!it) return;
      const e = i ? endR : endL, y0 = panY[i] - 3;
      if (it.draw) it.draw(ctx, e.x, y0);
      if (it.w && it.w.length) {
        const ws = it.w.slice().sort((a, b) => b - a);
        let x = e.x - rowWidth(ws) / 2;
        ws.forEach((wg) => { const ww = M.weightSize(wg)[0]; M.weight(ctx, x + ww / 2, y0, wg); x += ww + 2; });
      }
    });
    // 部件名称
    if (o.labels) {
      const L = [['托盘', endL.x - 40, panY[0] - 6, -150, -230], ['横梁', -60, P.y - 2, -60, -112], ['平衡螺母', 171 + nut * 9, P.y - 6, 200, -196], ['标尺', 60, P.y + 2, 120, -112], ['游码', X0 + (o.rider || 0) * PX + 3, P.y + 6, 10, -104],
        ['指针', -6, -88, -70, -66], ['分度盘', 0, -44, 70, -48], ['底座', -120, -12, -205, -12]];
      ctx.font = PS.font(fs(12, 10), 700); ctx.textBaseline = 'middle';
      L.forEach(([t, ax, ay, lx, ly]) => {
        ctx.strokeStyle = '#4c6ef5'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); ctx.stroke();
        ctx.fillStyle = '#4c6ef5'; ctx.beginPath(); ctx.arc(ax, ay, 1.8, 0, TAU); ctx.fill();
        const tw = ctx.measureText(t).width;
        ctx.textAlign = lx < ax - 2 ? 'right' : lx > ax + 2 ? 'left' : 'center';
        const bx = ctx.textAlign === 'right' ? lx - tw - 3 : ctx.textAlign === 'left' ? lx - 3 : lx - tw / 2 - 3;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(ctx, bx, ly - fs(9, 7), tw + 6, fs(18, 14), 4); ctx.fill();
        ctx.fillStyle = '#23367f'; ctx.fillText(t, ctx.textAlign === 'right' ? lx - 1 : ctx.textAlign === 'left' ? lx + 1 : lx, ly);
      });
    }
    ctx.restore();
    // 返回两个盘面中心（画布坐标），方便放置物体动画
    return { left: { x: o.x + endL.x * s, y: o.y + (panY[0] - 3) * s }, right: { x: o.x + endR.x * s, y: o.y + (panY[1] - 3) * s } };
  };

  /** 标尺放大图：x, y 为 0 刻度线下端；w 全长；o.max（5 g）、o.div（0.2 g）、o.rider */
  M.rider = function (ctx, F, x, y, w, o) {
    o = o || {};
    const max = o.max || 5, div = o.div || 0.2, n = Math.round(max / div), px = w / max;
    ctx.save();
    ctx.fillStyle = '#5c636e'; D.roundRect(ctx, x - 26, y - 46, w + 52, 60, 8); ctx.fill();
    ctx.fillStyle = '#f8f9fa'; ctx.fillRect(x - 14, y - 40, w + 28, 46);
    ctx.strokeStyle = '#212529';
    for (let i = 0; i <= n; i++) {
      const v = i * div, xx = x + v * px, big = Math.abs(v - Math.round(v)) < 1e-6, half = !big && Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
      ctx.lineWidth = big ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(xx, y + 6); ctx.lineTo(xx, y + 6 - (big ? 22 : half ? 15 : 11)); ctx.stroke();
    }
    ctx.fillStyle = '#212529'; ctx.font = PS.font(F(15), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (let v = 0; v <= max; v++) ctx.fillText(String(v), x + v * px, y - 22);
    ctx.font = PS.font(F(13), 600); ctx.fillText('g', x + w + 14, y - 22);
    if (o.rider != null) {
      const rx = x + o.rider * px, rw = px * (o.rw || 2 * div); // 游码宽约两格
      ctx.fillStyle = 'rgba(240,140,0,.55)'; ctx.strokeStyle = '#a35a00'; ctx.lineWidth = 2;
      ctx.fillRect(rx, y - 50, rw, 68); ctx.strokeRect(rx, y - 50, rw, 68);
      if (o.mark) { ctx.strokeStyle = '#e03131'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(rx, y - 60); ctx.lineTo(rx, y + 26); ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.restore();
  };

  /* ---------------- 电子秤（电子天平） ---------------- */
  /** x, y：底边中点；w 宽；o.text 显示的数字；o.unit；o.dim */
  M.scale = function (ctx, F, x, y, w, o) {
    o = o || {};
    const hh = w * 0.32;
    ctx.save();
    let g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, '#e9ecef'); g.addColorStop(1, '#adb5bd');
    ctx.fillStyle = g; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2 + 8, y - hh); ctx.lineTo(x + w / 2 - 8, y - hh); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 秤盘
    ctx.fillStyle = '#ced4da'; ctx.fillRect(x - w * 0.4, y - hh - 6, w * 0.8, 6);
    ctx.fillStyle = '#f1f3f5'; D.roundRect(ctx, x - w * 0.44, y - hh - 10, w * 0.88, 5, 2); ctx.fill(); ctx.stroke();
    // 显示屏
    const sw = w * 0.5, sh = hh * 0.5, sx = x - sw / 2 - w * 0.08, sy = y - hh * 0.78;
    ctx.fillStyle = '#20302a'; D.roundRect(ctx, sx, sy, sw, sh, 4); ctx.fill();
    ctx.fillStyle = o.dim ? '#4f6b5c' : '#69db7c'; ctx.font = PS.font(Math.min(sh * 0.72, F(22)), 800); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(o.text == null ? '0.0' : o.text, sx + sw - 8, sy + sh / 2 + 1);
    ctx.fillStyle = '#495057'; ctx.font = PS.font(F(11), 700); ctx.textAlign = 'left';
    ctx.fillText(o.unit || 'g', sx + sw + 6, sy + sh / 2);
    // 按钮
    ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x + w * 0.36, y - hh * 0.52, Math.max(3, w * 0.025), 0, TAU); ctx.fill();
    ctx.restore();
    return y - hh - 10; // 秤盘上表面
  };

  /* ---------------- 量筒 ----------------
   * x 中心，y 底座底边；w 内径宽，hh 量程部分的高度；o.cap 量程，o.div 分度值，o.V 液面示数（mL）
   * o.liquid 颜色；o.meniscus 'concave'（默认）| 'convex'（水银）；o.inside(ctx, info) 在液体下面画物体
   * 返回 info：{ left, right, y0（0 刻度）, ppm（每 mL 像素）, level（液面 y） }
   */
  M.cylinder = function (ctx, F, x, y, w, hh, o) {
    o = o || {};
    const cap = o.cap || 50, div = o.div || 1, V = o.V || 0;
    const baseH = Math.max(6, w * 0.16), y0 = y - baseH - 4, ppm = hh / cap, top = y0 - hh * 1.1;
    const L = x - w / 2, R = x + w / 2;
    const info = { left: L, right: R, y0, ppm, top, level: y0 - V * ppm };
    ctx.save();
    // 底座
    ctx.fillStyle = 'rgba(206,224,240,.9)'; ctx.strokeStyle = '#8aa0b8'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - w * 0.95, y); ctx.lineTo(x - w * 0.8, y - baseH); ctx.lineTo(x + w * 0.8, y - baseH); ctx.lineTo(x + w * 0.95, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 筒身
    ctx.fillStyle = 'rgba(235,244,252,.55)';
    ctx.fillRect(L, top, w, y - baseH - top);
    if (o.inside) o.inside(ctx, info);
    // 液体
    if (V > 0) {
      const ly = info.level, m = Math.min(w * 0.12, 7), conv = o.meniscus === 'convex';
      ctx.fillStyle = o.liquid || 'rgba(116,192,252,.45)';
      ctx.beginPath(); ctx.moveTo(L + 1, y - baseH - 1);
      if (conv) { ctx.lineTo(L + 1, ly + m * 0.7); ctx.quadraticCurveTo(L + 2, ly, L + w * 0.3, ly); ctx.lineTo(R - w * 0.3, ly); ctx.quadraticCurveTo(R - 2, ly, R - 1, ly + m * 0.7); }
      else { ctx.lineTo(L + 1, ly - m); ctx.quadraticCurveTo(L + 3, ly, L + w * 0.3, ly); ctx.lineTo(R - w * 0.3, ly); ctx.quadraticCurveTo(R - 3, ly, R - 1, ly - m); }
      ctx.lineTo(R - 1, y - baseH - 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = o.surface || 'rgba(28,126,214,.8)'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (conv) { ctx.moveTo(L + 1, ly + m * 0.7); ctx.quadraticCurveTo(L + 2, ly, L + w * 0.3, ly); ctx.lineTo(R - w * 0.3, ly); ctx.quadraticCurveTo(R - 2, ly, R - 1, ly + m * 0.7); }
      else { ctx.moveTo(L + 1, ly - m); ctx.quadraticCurveTo(L + 3, ly, L + w * 0.3, ly); ctx.lineTo(R - w * 0.3, ly); ctx.quadraticCurveTo(R - 3, ly, R - 1, ly - m); }
      ctx.stroke();
    }
    // 刻度
    if (o.ticks !== false) {
      const every = o.every || (cap <= 10 ? 1 : cap <= 50 ? 10 : cap <= 100 ? 10 : 50);
      const n = Math.round(cap / div);
      ctx.strokeStyle = '#1b2333'; ctx.fillStyle = '#1b2333'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = PS.font(o.fs || F(11), 600);
      const skipMinor = ppm * div < 2.2; // 太密就不画最小刻度
      for (let i = 1; i <= n; i++) {
        const v = PS.round(i * div, 4), yy = y0 - v * ppm;
        const big = Math.abs(v / every - Math.round(v / every)) < 1e-6;
        const mid = !big && Math.abs((v * 2) / every - Math.round((v * 2) / every)) < 1e-6;
        if (!big && !mid && skipMinor) continue;
        const len = big ? w * 0.42 : mid ? w * 0.3 : w * 0.2;
        ctx.lineWidth = big ? 1.3 : 0.8;
        ctx.beginPath(); ctx.moveTo(L + 2, yy); ctx.lineTo(L + 2 + len, yy); ctx.stroke();
        if (big && o.numbers !== false) ctx.fillText(String(v), L + 4 + len, yy);
      }
      if (o.numbers !== false) { ctx.font = PS.font(F(10), 700); ctx.textAlign = 'center'; ctx.fillText('mL', x, top + F(10)); }
    }
    // 外壁
    ctx.strokeStyle = '#8aa0b8'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(L - 4, top - 2); ctx.lineTo(L, top + 4); ctx.lineTo(L, y - baseH); ctx.moveTo(R, y - baseH); ctx.lineTo(R, top); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(R - w * 0.16, top + 10, w * 0.06, y - baseH - top - 20);
    ctx.restore();
    return info;
  };

  /* ---------------- 烧杯 ---------------- */
  /** x 中心，y 底，w 宽，hh 高；o.level（0~1），o.liquid 颜色，o.marks 刻度 */
  M.beaker = function (ctx, x, y, w, hh, o) {
    o = o || {};
    const l = x - w / 2, r = x + w / 2, t = y - hh;
    ctx.save();
    ctx.fillStyle = 'rgba(235,244,252,.5)';
    ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l, y - 5); ctx.quadraticCurveTo(l, y, l + 5, y); ctx.lineTo(r - 5, y); ctx.quadraticCurveTo(r, y, r, y - 5); ctx.lineTo(r, t); ctx.closePath(); ctx.fill();
    if (o.inside) o.inside(ctx);
    if (o.level > 0) {
      const wy = y - hh * o.level;
      ctx.fillStyle = o.liquid || 'rgba(116,192,252,.5)';
      ctx.beginPath(); ctx.moveTo(l + 1.5, wy); ctx.lineTo(l + 1.5, y - 5); ctx.quadraticCurveTo(l + 1.5, y - 1.5, l + 6, y - 1.5); ctx.lineTo(r - 6, y - 1.5); ctx.quadraticCurveTo(r - 1.5, y - 1.5, r - 1.5, y - 5); ctx.lineTo(r - 1.5, wy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = o.surface || 'rgba(28,126,214,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(l + 1.5, wy); ctx.lineTo(r - 1.5, wy); ctx.stroke();
    }
    if (o.film) { // 内壁残留的液体
      ctx.fillStyle = o.liquid || 'rgba(116,192,252,.5)';
      for (let i = 0; i < 7; i++) { const yy = t + hh * (0.2 + i * 0.1); ctx.beginPath(); ctx.ellipse(l + 4, yy, 2, 3.5, 0, 0, TAU); ctx.ellipse(r - 4, yy + hh * 0.04, 2, 3.5, 0, 0, TAU); ctx.fill(); }
    }
    if (o.marks) {
      ctx.strokeStyle = 'rgba(80,100,130,.5)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { const yy = y - (hh * i) / 5; ctx.beginPath(); ctx.moveTo(l + 4, yy); ctx.lineTo(l + 4 + (i % 2 ? 8 : 14), yy); ctx.stroke(); }
    }
    ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(l - 5, t - 2); ctx.lineTo(l, t + 3); ctx.lineTo(l, y - 5); ctx.quadraticCurveTo(l, y, l + 5, y); ctx.lineTo(r - 5, y); ctx.quadraticCurveTo(r, y, r, y - 5); ctx.lineTo(r, t); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(l + 4, t + 6, 4, hh - 18);
    ctx.restore();
  };

  /* ---------------- 长方体（带一点立体感） ---------------- */
  /** x 左，y 底，w 宽，hh 高，mat 材料（PS.MAT 的一项）或颜色；o.d 进深 */
  M.block = function (ctx, x, y, w, hh, mat, o) {
    o = o || {};
    const c = typeof mat === 'string' ? mat : mat.c, dk = typeof mat === 'string' ? mix(mat, '#000000', 0.35) : mat.d;
    const d = o.d != null ? o.d : Math.min(w, hh) * 0.28;
    ctx.save();
    ctx.lineWidth = 1; ctx.strokeStyle = dk;
    ctx.fillStyle = mix(c, '#ffffff', 0.25);
    ctx.beginPath(); ctx.moveTo(x, y - hh); ctx.lineTo(x + d, y - hh - d * 0.6); ctx.lineTo(x + w + d, y - hh - d * 0.6); ctx.lineTo(x + w, y - hh); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = mix(c, '#000000', 0.18);
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y - hh); ctx.lineTo(x + w + d, y - hh - d * 0.6); ctx.lineTo(x + w + d, y - d * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c; ctx.fillRect(x, y - hh, w, hh); ctx.strokeRect(x, y - hh, w, hh);
    if (o.grain) { // 木纹
      ctx.strokeStyle = 'rgba(120,70,20,.35)'; ctx.lineWidth = 0.8;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x, y - (hh * i) / 4); ctx.bezierCurveTo(x + w * 0.3, y - (hh * i) / 4 - 2, x + w * 0.6, y - (hh * i) / 4 + 2, x + w, y - (hh * i) / 4); ctx.stroke(); }
    }
    if (o.label) {
      ctx.fillStyle = o.labelColor || '#1b2333'; ctx.font = PS.font(o.fs || 12, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.label, x + w / 2, y - hh / 2);
    }
    ctx.restore();
  };

  /** 不规则石块：x 中心，y 底，r 大小；seed 决定形状 */
  M.stone = function (ctx, x, y, r, o) {
    o = o || {};
    const seed = o.seed || 3, n = 9;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, k = 0.78 + 0.22 * Math.abs(Math.sin(seed * 12.9898 + i * 78.233));
      pts.push([Math.cos(a) * r * k * 1.25, Math.sin(a) * r * k * 0.85]);
    }
    const minY = Math.max(...pts.map((p) => p[1]));
    ctx.save(); ctx.translate(x, y - minY);
    const g = ctx.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, o.c1 || '#a8a29a'); g.addColorStop(1, o.c2 || '#6b645b');
    ctx.fillStyle = g; ctx.strokeStyle = '#4a443d'; ctx.lineWidth = 1;
    ctx.beginPath();
    pts.forEach((p, i) => { const q = pts[(i + 1) % n]; const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(p[0], p[1], mx, my); });
    ctx.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.3, r * 0.14, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
    return y - minY + Math.min(...pts.map((p) => p[1])); // 石块顶部的 y
  };

  /** 颜色混合（不依赖 heat.js / optics.js） */
  function mix(c1, c2, t) {
    const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  M.mix = mix;
  if (!PS.mixColor) PS.mixColor = mix;

  /* 第6章组件共用的样式 */
  if (!document.getElementById('mass-style')) document.head.append(h('style', { id: 'mass-style' }, `
    .ms-msg{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.92rem;min-height:2.6em}
    .ms-msg.ok{background:var(--green-soft);border-color:#b2f2bb}
    .ms-msg.bad{background:var(--red-soft);border-color:#ffc9c9}
    .ms-msg.info{background:var(--primary-soft);border-color:#bac8ff}
    .ms-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:14px;align-items:start}
    .ms-pair > div{min-width:0}
    .ms-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px;font-size:.9rem}
    .ms-steps li{display:flex;gap:8px;align-items:flex-start;padding:5px 8px;border-radius:8px;background:var(--surface);border:1px solid var(--line)}
    .ms-steps li .n{flex:0 0 22px;height:22px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line-2);display:grid;place-items:center;font-weight:800;font-size:.8rem;color:var(--ink-2)}
    .ms-steps li.cur{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-soft)}
    .ms-steps li.done .n{background:var(--green);border-color:var(--green);color:#fff}
    .ms-ans{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .ms-ans input{width:96px}
    .ms-q{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-top:10px;font-size:.94rem}
    .ms-q .q-options{margin-top:8px}
    .q-options.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
    @media (max-width:680px){.ms-pair{grid-template-columns:minmax(0,1fr)}.q-options.cols-3{grid-template-columns:1fr}}
  `));
})();
