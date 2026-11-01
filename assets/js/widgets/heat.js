/*
 * 第3章 物态变化 · 公共工具（其他第3章组件都依赖本文件）
 * PS.STATE / PS.HEAT_C  物态与吸放热的配色
 * PS.fmtT               温度格式化（−5 ℃）
 * PS.mixColor           两种颜色按比例混合；PS.waterColor(T) 不同温度的水色
 * PS.thermo             画竖直的液体温度计（实验室温度计、寒暑表、放大的读数视图）
 * PS.beaker / PS.lamp / PS.tube   烧杯、酒精灯、试管
 * PS.tchart             温度—时间图像（坐标轴、网格、折线、数据点）
 * PS.Mols               二维分子模型（固态、液态、气态之间可以连续变化）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.STATE = {
    solid: { name: '固态', c: '#3b5bdb', bg: '#e8edff' },
    liquid: { name: '液态', c: '#0c8599', bg: '#e3f7f9' },
    gas: { name: '气态', c: '#e8590c', bg: '#fff4e6' },
    mix: { name: '固液共存', c: '#7048e8', bg: '#f0ebff' },
  };
  PS.HEAT_C = { absorb: '#e03131', release: '#1c7ed6' };

  /** 温度文字：PS.fmtT(-4.7, 1) → “−4.7 ℃” */
  PS.fmtT = function (T, d, noUnit) {
    const s = PS.fmt(T, d == null ? 0 : d);
    return (s.charAt(0) === '-' ? '−' + s.slice(1) : s) + (noUnit ? '' : ' ℃');
  };

  function hex(c) {
    const n = parseInt(c.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  PS.mixColor = function (c1, c2, t) {
    const a = hex(c1), b = hex(c2);
    t = PS.clamp(t, 0, 1);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };
  PS.waterColor = function (T, alpha) {
    const c = T < 50 ? PS.mixColor('#a5d8ff', '#c3e4f7', T / 50) : PS.mixColor('#c3e4f7', '#ffd3bd', (T - 50) / 50);
    return alpha == null ? c : c.replace('rgb', 'rgba').replace(')', ',' + alpha + ')');
  };

  /**
   * 竖直的液体温度计。
   * o：x 玻璃管中心；top 管顶 y；bulbY 玻璃泡圆心 y；min / max 刻度范围；div 分度值；
   *    label 每隔多少度写一个数字（默认 10 个分度）；value 液柱对应的温度；w 管宽；bulbR 玻璃泡半径；
   *    liquid 液体颜色；F 字号换算（PS.virtual 的返回值）；fs 数字字号；bulb:false 不画玻璃泡（放大读数视图）；
   *    numbers:false 不写数字；ticks:false 不画刻度；unit 是否在顶部写“℃”
   * 返回 { y(T) }：温度对应的 y 坐标
   */
  PS.thermo = function (ctx, o) {
    const w = o.w || 16, bulbR = o.bulbR || w * 0.85, div = o.div || 1;
    const F = o.F || ((x) => x);
    const pad = o.pad != null ? o.pad : w * 0.9;
    const yLo = o.bulb === false ? o.bulbY : o.bulbY - bulbR - pad, yHi = o.top + pad;
    const y = (T) => yLo - ((T - o.min) / (o.max - o.min)) * (yLo - yHi);
    const x = o.x;
    ctx.save();
    // 玻璃外壳
    const bottom = o.bulb === false ? o.bulbY + 40 : o.bulbY;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, 'rgba(214,228,240,.95)'); g.addColorStop(0.35, 'rgba(255,255,255,.98)'); g.addColorStop(1, 'rgba(200,214,230,.95)');
    ctx.fillStyle = g;
    ctx.strokeStyle = o.stroke || '#8e9bb0'; ctx.lineWidth = Math.max(1, w * 0.07);
    D.roundRect(ctx, x - w / 2, o.top, w, bottom - o.top, w / 2);
    ctx.fill(); ctx.stroke();
    // 毛细管与液柱
    const cw = o.cw || Math.max(1.6, w * 0.24);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(160,175,195,.55)'; ctx.lineWidth = cw + 1.2;
    ctx.beginPath(); ctx.moveTo(x, o.top + w * 0.35); ctx.lineTo(x, bottom); ctx.stroke();
    ctx.strokeStyle = '#f8fbff'; ctx.lineWidth = cw;
    ctx.beginPath(); ctx.moveTo(x, o.top + w * 0.35); ctx.lineTo(x, bottom); ctx.stroke();
    const lc = o.liquid || '#e03131';
    if (o.value != null) {
      const yl = PS.clamp(y(o.value), o.top + w * 0.4, o.bulb === false ? bottom : o.bulbY - bulbR * 0.5);
      ctx.strokeStyle = lc; ctx.lineWidth = cw;
      ctx.beginPath(); ctx.moveTo(x, bottom); ctx.lineTo(x, yl); ctx.stroke();
    }
    // 玻璃泡
    if (o.bulb !== false) {
      const gb = ctx.createRadialGradient(x - bulbR * 0.35, o.bulbY - bulbR * 0.35, bulbR * 0.1, x, o.bulbY, bulbR);
      gb.addColorStop(0, '#fff'); gb.addColorStop(0.25, lc); gb.addColorStop(1, PS.mixColor(lc.length === 7 ? lc : '#e03131', '#000000', 0.25));
      ctx.fillStyle = gb;
      ctx.beginPath(); ctx.arc(x, o.bulbY, bulbR, 0, TAU); ctx.fill();
      ctx.strokeStyle = o.stroke || '#8e9bb0'; ctx.lineWidth = Math.max(1, w * 0.07); ctx.stroke();
    }
    // 刻度
    const k0 = Math.ceil(o.min / div - 1e-6), k1 = Math.floor(o.max / div + 1e-6); // 刻度线对齐到分度值的整数倍
    const every = o.label ? Math.round(o.label / div) : 10;
    const side = o.side === 'left' ? -1 : 1;
    const x0 = x + side * w * 0.2;
    ctx.strokeStyle = '#1b2333';
    const fs = o.fs || F(Math.max(9, w * 0.7));
    ctx.font = PS.font(fs, 700);
    ctx.fillStyle = '#1b2333';
    ctx.textAlign = side > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
    const big = w * 0.38, mid = w * 0.27, small = w * 0.17;
    for (let k = k0; k <= (o.ticks === false ? k0 - 1 : k1); k++) {
      const T = k * div, yy = y(T);
      const mod = (a, b) => ((a % b) + b) % b;
      const isLabel = mod(k, every) === 0;
      const isMid = !isLabel && every % 2 === 0 && mod(k, every / 2) === 0;
      const len = isLabel ? big : isMid ? mid : small;
      ctx.lineWidth = isLabel ? Math.max(1, w * 0.08) : Math.max(0.7, w * 0.05);
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + side * len, yy); ctx.stroke();
      if (isLabel && o.numbers !== false) {
        const v = PS.round(T, 4);
        ctx.fillText((v < 0 ? '−' : '') + Math.abs(v), x + side * (w / 2 + fs * 0.35), yy);
      }
    }
    if (o.unit !== false) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = PS.font(fs, 800);
      ctx.fillText('℃', x, o.top - 3);
    }
    ctx.restore();
    return { y };
  };

  /** 烧杯：x 中心，y 杯底，w 宽，hh 高；o.level 水面高度（0~1），o.water 水色，o.marks 刻度线 */
  PS.beaker = function (ctx, x, y, w, hh, o) {
    o = o || {};
    const l = x - w / 2, r = x + w / 2, t = y - hh;
    ctx.save();
    ctx.fillStyle = 'rgba(235,244,252,.55)';
    ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l, y - 6); ctx.quadraticCurveTo(l, y, l + 6, y); ctx.lineTo(r - 6, y); ctx.quadraticCurveTo(r, y, r, y - 6); ctx.lineTo(r, t); ctx.closePath(); ctx.fill();
    if (o.level) {
      const wy = y - hh * o.level;
      const g = ctx.createLinearGradient(0, wy, 0, y);
      const c = o.water || '#a5d8ff';
      g.addColorStop(0, c); g.addColorStop(1, PS.mixColor(c.charAt(0) === '#' ? c : '#a5d8ff', '#4dabf7', 0.25));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(l + 2, wy); ctx.lineTo(l + 2, y - 6); ctx.quadraticCurveTo(l + 2, y - 2, l + 7, y - 2); ctx.lineTo(r - 7, y - 2); ctx.quadraticCurveTo(r - 2, y - 2, r - 2, y - 6); ctx.lineTo(r - 2, wy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(28,126,214,.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(l + 2, wy); ctx.lineTo(r - 2, wy); ctx.stroke();
    }
    if (o.marks) {
      ctx.strokeStyle = 'rgba(80,100,130,.45)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { const yy = y - (hh * i) / 5; ctx.beginPath(); ctx.moveTo(l + 4, yy); ctx.lineTo(l + 4 + (i % 2 ? 10 : 18), yy); ctx.stroke(); }
    }
    ctx.strokeStyle = o.stroke || '#7d8ca3'; ctx.lineWidth = o.lw || 2.4;
    ctx.beginPath(); ctx.moveTo(l - 5, t - 2); ctx.lineTo(l, t + 3); ctx.lineTo(l, y - 6); ctx.quadraticCurveTo(l, y, l + 6, y); ctx.lineTo(r - 6, y); ctx.quadraticCurveTo(r, y, r, y - 6); ctx.lineTo(r, t); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(l + 5, t + 8, 5, hh - 22);
    ctx.restore();
  };

  /** 试管：x 中心，top 管口 y，len 长度，w 宽；o.fill 内容物 {from（0~1，从管底量起的高度比例）, color} */
  PS.tube = function (ctx, x, top, len, w, o) {
    o = o || {};
    const r = w / 2, bot = top + len;
    ctx.save();
    const path = () => { ctx.beginPath(); ctx.moveTo(x - r, top); ctx.lineTo(x - r, bot - r); ctx.arc(x, bot - r, r, Math.PI, 0, true); ctx.lineTo(x + r, top); };
    ctx.fillStyle = 'rgba(240,247,255,.6)'; path(); ctx.fill();
    if (o.fill) {
      ctx.save(); path(); ctx.clip();
      o.fill.forEach((f) => { ctx.fillStyle = f.color; const y1 = bot - len * f.to, y0 = bot - len * (f.from || 0); ctx.fillRect(x - r, y1, w, y0 - y1 + 0.5); });
      ctx.restore();
    }
    ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = o.lw || 2; path(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, top, r + 2, 2.5, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  };

  /** 酒精灯：x 中心，y 灯底，s 缩放（1 ≈ 高 100）；o.on 是否点燃，o.t 时间（火焰跳动），o.big 火焰大小（默认 1） */
  PS.lamp = function (ctx, x, y, s, o) {
    o = o || {};
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    // 灯体
    const g = ctx.createLinearGradient(-40, 0, 40, 0);
    g.addColorStop(0, 'rgba(200,220,235,.9)'); g.addColorStop(0.4, 'rgba(250,253,255,.95)'); g.addColorStop(1, 'rgba(185,205,225,.9)');
    ctx.fillStyle = g; ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-12, -62); ctx.lineTo(-12, -54); ctx.bezierCurveTo(-46, -48, -46, -2, -32, 0); ctx.lineTo(32, 0); ctx.bezierCurveTo(46, -2, 46, -48, 12, -54); ctx.lineTo(12, -62); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(165,216,255,.75)';
    ctx.beginPath(); ctx.moveTo(-38, -22); ctx.bezierCurveTo(-40, -6, -36, -2, -30, -2); ctx.lineTo(30, -2); ctx.bezierCurveTo(36, -2, 40, -6, 38, -22); ctx.closePath(); ctx.fill();
    // 灯芯管与灯芯
    ctx.fillStyle = '#adb5bd'; ctx.fillRect(-8, -70, 16, 9);
    ctx.fillStyle = '#f1f3f5'; ctx.fillRect(-3, -78, 6, 9);
    if (o.on) {
      const k = (o.big || 1), t = o.t || 0;
      const fl = 1 + 0.06 * Math.sin(t * 17) + 0.04 * Math.sin(t * 29 + 1);
      const H = 52 * k * fl, W = 13 * k;
      ctx.save(); ctx.translate(0, -78);
      const go = ctx.createRadialGradient(0, -H * 0.3, 2, 0, -H * 0.3, H * 0.75);
      go.addColorStop(0, 'rgba(255,240,170,.95)'); go.addColorStop(0.6, 'rgba(255,170,60,.75)'); go.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = go;
      ctx.beginPath(); ctx.moveTo(0, -H); ctx.bezierCurveTo(W * 1.1, -H * 0.5, W * 1.2, 0, 0, 2); ctx.bezierCurveTo(-W * 1.2, 0, -W * 1.1, -H * 0.5, 0, -H); ctx.fill();
      ctx.fillStyle = 'rgba(80,140,255,.55)';
      ctx.beginPath(); ctx.moveTo(0, -H * 0.42); ctx.bezierCurveTo(W * 0.45, -H * 0.25, W * 0.5, 0, 0, 1); ctx.bezierCurveTo(-W * 0.5, 0, -W * 0.45, -H * 0.25, 0, -H * 0.42); ctx.fill();
      ctx.restore();
    } else if (o.cap) {
      ctx.fillStyle = 'rgba(200,215,230,.95)'; ctx.strokeStyle = '#7d8ca3';
      ctx.beginPath(); ctx.moveTo(-14, -60); ctx.lineTo(-14, -88); ctx.quadraticCurveTo(0, -96, 14, -88); ctx.lineTo(14, -60); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  };

  /**
   * 温度—时间图像。box：{x, y, w, h}；o：t0 t1 T0 T1（范围）、tStep TStep（刻度间隔）、F、
   * xl / yl（坐标轴名称，默认“时间/min”“温度/℃”）、bg 背景色
   * 返回 { X(t), Y(T), line(pts, color, width, dash), dots(pts, color, r), hline(T, color, text) }
   */
  PS.tchart = function (ctx, box, o) {
    const F = o.F || ((x) => x);
    const X = (t) => box.x + ((t - o.t0) / (o.t1 - o.t0)) * box.w;
    const Y = (T) => box.y + box.h - ((T - o.T0) / (o.T1 - o.T0)) * box.h;
    ctx.save();
    ctx.fillStyle = o.bg || '#fff'; ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = '#edf0f5'; ctx.lineWidth = 1;
    const fs = o.fs || F(12);
    ctx.font = PS.font(fs, 600); ctx.fillStyle = '#6b7487';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const tStep = o.tStep || 1, TStep = o.TStep || 10;
    for (let t = Math.ceil(o.t0 / tStep) * tStep; t <= o.t1 + 1e-9; t += tStep) {
      const xx = X(t);
      ctx.beginPath(); ctx.moveTo(xx, box.y); ctx.lineTo(xx, box.y + box.h); ctx.stroke();
      if (!o.tLabelEvery || Math.round(t / tStep) % o.tLabelEvery === 0) ctx.fillText(PS.round(t, 2), xx, box.y + box.h + 4);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let T = Math.ceil(o.T0 / TStep) * TStep; T <= o.T1 + 1e-9; T += TStep) {
      const yy = Y(T);
      ctx.beginPath(); ctx.moveTo(box.x, yy); ctx.lineTo(box.x + box.w, yy); ctx.stroke();
      const v = PS.round(T, 2);
      ctx.fillText((v < 0 ? '−' : '') + Math.abs(v), box.x - 5, yy);
    }
    D.arrow(ctx, box.x, box.y + box.h, box.x + box.w + 14, box.y + box.h, { width: 1.5, head: 8, color: '#1b2333' });
    D.arrow(ctx, box.x, box.y + box.h, box.x, box.y - 14, { width: 1.5, head: 8, color: '#1b2333' });
    ctx.fillStyle = '#1b2333'; ctx.font = PS.font(fs, 700);
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText(o.xl || '时间/min', box.x + box.w + 14, box.y + box.h + fs + 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText(o.yl || '温度/℃', box.x + 6, box.y - 6);
    ctx.restore();
    const api = { X, Y, box };
    api.line = (pts, color, width, dash) => {
      if (pts.length < 2) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(box.x, box.y - 10, box.w + 10, box.h + 10); ctx.clip();
      ctx.strokeStyle = color || '#3b5bdb'; ctx.lineWidth = width || 2.5; ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))));
      ctx.stroke();
      ctx.restore();
    };
    api.dots = (pts, color, r) => {
      ctx.save();
      ctx.fillStyle = color || '#3b5bdb'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      pts.forEach((p) => { ctx.beginPath(); ctx.arc(X(p[0]), Y(p[1]), r || 4, 0, TAU); ctx.fill(); ctx.stroke(); });
      ctx.restore();
    };
    api.hline = (T, color, text) => {
      ctx.save();
      ctx.strokeStyle = color || '#e03131'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(box.x, Y(T)); ctx.lineTo(box.x + box.w, Y(T)); ctx.stroke();
      ctx.restore();
      if (text) D.text(ctx, text, box.x + box.w - 4, Y(T) - 6, { size: fs, weight: 700, color: color || '#e03131', align: 'right', bg: 'rgba(255,255,255,.85)' });
    };
    return api;
  };

  /* ---------------- 二维分子模型 ---------------- */
  /**
   * n 个分子放在 w×h 的容器里（o.amorphous：固态时排列不规则）。M.set(固态比例, 气态比例) 改变物态（其余为液态），M.step(dt, 剧烈程度 0~1)，
   * M.draw(ctx, ox, oy, o)。固态：在格点附近振动；液态：挤在底部、可以移动；气态：在整个容器里高速运动。
   */
  PS.Mols = function (n, o) {
    const w = o.w, hh = o.h, r = o.r || 5;
    const gap = r * 2.15, rowH = gap * 0.88;
    const cols = Math.max(2, Math.floor((w - r) / gap));
    const ps = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols), col = i % cols;
      let sx = r + 1 + col * gap + (row % 2 ? gap / 2 : 0), sy = hh - r - 1 - row * rowH;
      if (o.amorphous) { sx += PS.rand(-0.3, 0.3) * gap; sy += PS.rand(-0.25, 0.25) * gap; } // 非晶体：排列不规则
      ps.push({ sx: Math.min(sx, w - r - 1), sy, x: sx, y: sy, vx: 0, vy: 0, s: 0, ph: Math.random() * TAU, row });
    }
    const M = { ps, w, h: hh, r, solid: 1, gas: 0, heat: 0.3 };
    M.set = function (solid, gas) {
      M.solid = PS.clamp(solid, 0, 1); M.gas = PS.clamp(gas, 0, 1 - M.solid);
      const ns = Math.round(M.solid * n), ng = Math.round(M.gas * n);
      ps.forEach((p, i) => {
        const s = i < ns ? 0 : i >= n - ng ? 2 : 1;
        if (s !== p.s) {
          if (s === 2) { const a = Math.random() * TAU; p.vx = Math.cos(a) * 160; p.vy = -Math.abs(Math.sin(a)) * 160 - 40; }
          if (s === 0 && p.s !== 0) { p.vx = p.vy = 0; }
          p.s = s;
        }
      });
    };
    M.setState = function (k) { M.set(k === 'solid' ? 1 : 0, k === 'gas' ? 1 : 0); };
    M.counts = () => ps.reduce((a, p) => (a[p.s]++, a), [0, 0, 0]);
    M.step = function (dt, heat) {
      if (heat != null) M.heat = heat;
      dt = Math.min(dt, 0.033);
      const c = M.counts();
      const cond = c[0] + c[1];
      const surf = hh - Math.ceil(cond / cols) * rowH * 1.12 - r;   // 液面高度
      M.surf = surf;
      const amp = 0.6 + M.heat * 2.2;
      for (const p of ps) {
        if (p.s === 0) {
          p.ph += dt * (8 + M.heat * 10);
          p.x = p.sx + Math.sin(p.ph * 1.3) * amp;
          p.y = p.sy + Math.cos(p.ph * 1.7) * amp;
        } else if (p.s === 1) {
          const sig = 260 + M.heat * 380;
          p.vx += PS.gauss() * sig * dt; p.vy += PS.gauss() * sig * dt + 60 * dt;
          p.vx *= 0.9; p.vy *= 0.9;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y < surf + r) { p.y = surf + r; p.vy = Math.abs(p.vy) * 0.5; }
        } else {
          const sp = 110 + M.heat * 160, v = Math.hypot(p.vx, p.vy) || 1;
          p.vx = (p.vx / v) * sp; p.vy = (p.vy / v) * sp;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.y < r) { p.y = r; p.vy = Math.abs(p.vy); }
          const floor = c[0] + c[1] ? surf : hh - r;
          if (p.y > floor) { p.y = floor; p.vy = -Math.abs(p.vy); }
        }
        if (p.x < r) { p.x = r; p.vx = Math.abs(p.vx); }
        if (p.x > w - r) { p.x = w - r; p.vx = -Math.abs(p.vx); }
        if (p.y > hh - r) { p.y = hh - r; p.vy = -Math.abs(p.vy); }
      }
      // 液体分子之间的排斥（不重叠）；与固态分子碰撞时只推开液体分子
      const d0 = r * 2.05;
      for (let i = 0; i < n; i++) {
        const a = ps[i];
        if (a.s === 2) continue;
        for (let j = i + 1; j < n; j++) {
          const b = ps[j];
          if (b.s === 2 || (a.s === 0 && b.s === 0)) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d > 0 && d < d0) {
            const push = (d0 - d) / d;
            if (a.s === 0) { b.x += dx * push; b.y += dy * push; }
            else if (b.s === 0) { a.x -= dx * push; a.y -= dy * push; }
            else { a.x -= dx * push * 0.5; a.y -= dy * push * 0.5; b.x += dx * push * 0.5; b.y += dy * push * 0.5; }
          }
        }
      }
    };
    /** o.color：(状态) → 颜色；o.bonds：固态画连线 */
    M.draw = function (ctx, ox, oy, d) {
      d = d || {};
      ctx.save();
      ctx.translate(ox, oy);
      if (d.bonds !== false) {
        ctx.strokeStyle = 'rgba(59,91,219,.25)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = ps[i];
          if (a.s) continue;
          for (let j = i + 1; j < Math.min(n, i + cols + 2); j++) {
            const b = ps[j];
            if (b.s || Math.hypot(a.sx - b.sx, a.sy - b.sy) > gap * 1.1) continue;
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          }
        }
        ctx.stroke();
      }
      for (const p of ps) {
        const c = d.color ? d.color(p.s) : ['#4c6ef5', '#15aabf', '#fd7e14'][p.s];
        const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.15, p.x, p.y, r);
        g.addColorStop(0, '#fff'); g.addColorStop(0.35, c); g.addColorStop(1, c);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    };
    M.set(1, 0);
    return M;
  };

  /* ---------------- 页面公共样式 ---------------- */
  document.head.append(h('style', null, `
    .st-badge{display:inline-block;font-weight:800;font-size:.86rem;padding:1px 9px;border-radius:999px;border:1.5px solid currentColor;background:#fff}
    .hx-list{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
  `));
})();
