/*
 * 看得见的物理 · 第7章公共库（力）
 * PS.FC                       力的配色：推 / 拉等一般的力（橙红）、重力 G（紫）、支持力 / 弹力（青）、拉力（蓝）
 * PS.force.g                  9.8 N/kg
 * PS.force.arrow(ctx, x, y, ang, len, o)   力的示意图：作用点圆点 + 带箭头的线段 + 标注（ang：0 向右，π/2 向下）
 * PS.force.spring(ctx, x1, y1, x2, y2, o)  两点之间的螺旋弹簧（前后两层线条，有立体感）
 * PS.force.scale(ctx, o)      竖直的弹簧测力计（拉环、刻度板、弹簧、指针、挂钩），o.F 为拉力；返回各部件位置
 * PS.force.scaleZoom(ctx, F, o)  弹簧测力计指针附近的放大读数视图
 * PS.force.hookMass(ctx, x, y, n, o)  一串钩码（每个 50 g），返回最下端的 y
 * PS.force.person(ctx, x, y, o)  简笔小人（手伸向 o.hand，可推、可拉）
 * PS.force.box / ground / cart / magnet / ball  木箱、地面（斜线）、小车、条形磁体、小球
 * PS.force.fmtN(F, d)         力的读数格式（负号用 −）
 * 依赖 core.js
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.FC = { F: '#e8590c', G: '#7048e8', N: '#0c8599', T: '#1c7ed6', f: '#c2255c', ok: '#2b8a3e', bad: '#e03131' };

  const FO = (PS.force = {});
  FO.g = 9.8;
  FO.fmtN = (F, d) => PS.fmt(F, d == null ? 1 : d).replace('-', '−');

  /** 力的示意图：作用点 (x, y)，方向 ang（弧度，画布坐标：0 向右，π/2 向下），长度 len */
  FO.arrow = function (ctx, x, y, ang, len, o) {
    o = o || {};
    const c = o.color || PS.FC.F, w = o.width || 3.2, hd = o.head || 13;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    D.arrow(ctx, x, y, x2, y2, { color: c, width: w, head: hd, dash: o.dash });
    if (o.dot !== false) {
      ctx.fillStyle = c; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, o.dotR || 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    }
    if (o.label) {
      const F = o.F || ((v) => v);
      const fs = o.size || F(15);
      // 标注放在箭头末端的外侧（沿方向再走一点，并向法线方向偏移）
      const off = o.labelOff != null ? o.labelOff : 14;
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const side = o.labelSide || 1;
      const lx = x2 + Math.cos(ang) * 6 + nx * off * side, ly = y2 + Math.sin(ang) * 6 + ny * off * side;
      ctx.font = PS.font(fs, 700);
      ctx.textAlign = Math.abs(Math.cos(ang)) > 0.5 ? (Math.cos(ang) > 0 ? 'left' : 'right') : 'center';
      if (Math.abs(Math.cos(ang)) <= 0.5) ctx.textAlign = nx * side > 0.3 ? 'left' : nx * side < -0.3 ? 'right' : 'center';
      ctx.textBaseline = 'middle';
      if (o.bg !== false) {
        const tw = ctx.measureText(o.label).width;
        let bx = lx;
        if (ctx.textAlign === 'center') bx = lx - tw / 2; else if (ctx.textAlign === 'right') bx = lx - tw;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        D.roundRect(ctx, bx - 4, ly - fs * 0.62, tw + 8, fs * 1.24, 5); ctx.fill();
      }
      ctx.fillStyle = c;
      ctx.fillText(o.label, lx, ly);
    }
    ctx.restore();
    return { x2, y2 };
  };

  /** 螺旋弹簧：从 (x1,y1) 到 (x2,y2)，o.n 圈数、o.r 半径、o.color、o.width、o.lead 两端直线段长度、o.tilt 斜视程度 */
  FO.spring = function (ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const n = o.n || 12, r = o.r || 9, lead = o.lead != null ? o.lead : 6, tilt = o.tilt != null ? o.tilt : 0.45;
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = (x2 - x1) / L, uy = (y2 - y1) / L, px = -uy, py = ux;
    const a = lead, b = Math.max(a + 1, L - lead);
    // 斜着看螺旋线：横向 r·cos φ，沿轴方向再加上 tilt·r·sin φ（前半圈 sin φ > 0 画深色，后半圈画浅色）
    const P = (t) => {
      const ph = t * n * TAU, s = a + (b - a) * t + tilt * r * Math.sin(ph);
      return [x1 + ux * s + px * r * Math.cos(ph), y1 + uy * s + py * r * Math.cos(ph), Math.sin(ph)];
    };
    const N = Math.max(60, n * 28);
    const pts = [];
    for (let i = 0; i <= N; i++) pts.push(P(i / N));
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const layer = (front, color, lw) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < pts.length; i++) {
        const q = pts[i], on = front ? q[2] >= -0.08 : q[2] <= 0.08;
        if (on) { if (!pen) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); pen = true; } else pen = false;
      }
      ctx.stroke();
    };
    const lw = o.width || 2.4, c = o.color || '#495057';
    layer(false, o.back || 'rgba(110,120,140,.6)', lw * 0.8);
    ctx.strokeStyle = c; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(pts[0][0], pts[0][1]); ctx.moveTo(pts[N][0], pts[N][1]); ctx.lineTo(x2, y2); ctx.stroke();
    layer(true, c, lw);
    ctx.restore();
  };

  /**
   * 竖直的弹簧测力计（正视图）。o.x：中心线；o.y：拉环圆心
   * o.max 量程（N）、o.div 分度值（N）、o.L 满量程刻度长（px）、o.F 拉力（N，指针位置）、o.zero 不受力时指针的位置（N，未调零）
   * o.w 外壳宽、o.F2 字号函数、o.hl 高亮的部件（'ring' | 'spring' | 'pointer' | 'board' | 'hook'）、o.inverted 倒挂（拉环在下）
   * o.over 超过量程（弹簧被拉坏的示意）
   * 返回 { ring, hook, y0, L, py, top, bottom }
   */
  FO.scale = function (ctx, o) {
    const F = o.F2 || ((v) => v);
    const max = o.max || 5, div = o.div || 0.2, L = o.L || 300, w = o.w || 74;
    const x = o.x, rr = o.rr || 13;
    const top = o.y + rr + 4, y0 = top + 30, bottom = y0 + L + 26;
    const shown = PS.clamp((o.F || 0) + (o.zero || 0), -0.3 * div, max + 0.4 * div);
    const py = y0 + (shown / max) * L;
    const hl = o.hl;
    const glow = (part) => hl === part;
    ctx.save();
    // 拉环
    ctx.strokeStyle = glow('ring') ? PS.FC.F : '#868e96'; ctx.lineWidth = glow('ring') ? 5 : 4;
    ctx.beginPath(); ctx.arc(x, o.y, rr, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, o.y + rr); ctx.lineTo(x, top + 2); ctx.stroke();
    // 外壳（刻度板）
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#e7ecf3'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#dfe5ee');
    ctx.fillStyle = g; ctx.strokeStyle = glow('board') ? PS.FC.F : '#8d99ab'; ctx.lineWidth = glow('board') ? 3.5 : 1.6;
    D.roundRect(ctx, x - w / 2, top, w, bottom - top, 10); ctx.fill(); ctx.stroke();
    // 中间的槽（透明窗）
    const sw = 16;
    ctx.fillStyle = '#eef3fa'; ctx.strokeStyle = '#b5c0cf'; ctx.lineWidth = 1;
    D.roundRect(ctx, x - sw / 2, top + 6, sw, bottom - top - 12, 6); ctx.fill(); ctx.stroke();
    // 刻度
    ctx.strokeStyle = '#1b2333'; ctx.fillStyle = '#1b2333';
    const nDiv = Math.round(max / div);
    const per = Math.round(1 / div); // 每 1 N 有几小格
    for (let i = 0; i <= nDiv; i++) {
      const v = i * div, yy = y0 + (v / max) * L;
      const major = i % per === 0, half = per % 2 === 0 && i % (per / 2) === 0;
      const tl = major ? 13 : half ? 9 : 6;
      ctx.lineWidth = major ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x - sw / 2 - 2, yy); ctx.lineTo(x - sw / 2 - 2 - tl, yy);
      ctx.moveTo(x + sw / 2 + 2, yy); ctx.lineTo(x + sw / 2 + 2 + tl, yy);
      ctx.stroke();
    }
    ctx.font = PS.font(o.fs || F(13), 700); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const labelEvery = max > 10 ? (max > 50 ? 10 : 2) : 1;
    for (let v = 0; v <= max + 1e-9; v += labelEvery) ctx.fillText(String(PS.round(v, 2)), x - sw / 2 - 17, y0 + (v / max) * L);
    ctx.textAlign = 'left';
    ctx.font = PS.font(o.fs ? o.fs * 0.9 : F(12), 700);
    ctx.fillText('N', x + sw / 2 + 16, top + 14);
    // 弹簧（槽内，从顶端到指针）
    const sTop = top + 8;
    FO.spring(ctx, x, sTop, x, py - 3, { n: 11, r: 5.5, width: 1.8, lead: 3, color: glow('spring') ? PS.FC.F : o.over ? '#868e96' : '#495057', back: glow('spring') ? 'rgba(232,89,12,.45)' : undefined });
    // 指针（横条 + 左右尖）
    const pc = glow('pointer') ? PS.FC.F : '#e03131';
    ctx.fillStyle = pc;
    ctx.fillRect(x - sw / 2 + 1, py - 2.2, sw - 2, 4.4);
    ctx.beginPath(); ctx.moveTo(x - sw / 2 - 1, py - 4); ctx.lineTo(x - sw / 2 - 12, py); ctx.lineTo(x - sw / 2 - 1, py + 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + sw / 2 + 1, py - 4); ctx.lineTo(x + sw / 2 + 12, py); ctx.lineTo(x + sw / 2 + 1, py + 4); ctx.closePath(); ctx.fill();
    if (glow('pointer')) { ctx.strokeStyle = 'rgba(232,89,12,.35)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - sw / 2 - 12, py); ctx.lineTo(x + sw / 2 + 12, py); ctx.stroke(); }
    // 拉杆与挂钩（随指针移动）
    const rodEnd = py + (bottom - y0) + 6;
    ctx.strokeStyle = glow('hook') ? PS.FC.F : '#868e96'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, py + 2); ctx.lineTo(x, rodEnd); ctx.stroke();
    ctx.lineWidth = glow('hook') ? 4.5 : 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, rodEnd); ctx.lineTo(x, rodEnd + 10); ctx.arc(x - 7, rodEnd + 10, 7, 0, Math.PI * 0.95); ctx.stroke();
    ctx.restore();
    return { ring: { x, y: o.y - rr }, hook: { x: x - 7, y: rodEnd + 17 }, y0, L, py, top, bottom, w, sw };
  };

  /** 指针附近的放大读数视图：在 (o.x, o.y) 画一个 o.w × o.h 的圆角框，显示 F 附近 ±o.span N 的刻度 */
  FO.scaleZoom = function (ctx, Fv, o) {
    const F = o.F2 || ((v) => v);
    const max = o.max || 5, div = o.div || 0.2, W = o.w || 200, H = o.h || 200, span = o.span || div * 4.5;
    const cx = o.x + W / 2, cy = o.y + H / 2;
    const k = H / (2 * span); // 每牛顿像素
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2;
    D.roundRect(ctx, o.x, o.y, W, H, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); D.roundRect(ctx, o.x + 1, o.y + 1, W - 2, H - 2, 11); ctx.clip();
    const sw = 22;
    ctx.fillStyle = '#eef3fa'; ctx.fillRect(cx - sw / 2, o.y, sw, H);
    const shown = (o.pointer != null ? o.pointer : Fv);
    const per = Math.round(1 / div);
    const nDiv = Math.round(max / div);
    for (let i = 0; i <= nDiv; i++) {
      const v = i * div; const yy = cy + (v - shown) * k;
      if (yy < o.y - 10 || yy > o.y + H + 10) continue;
      const major = i % per === 0, half = per % 2 === 0 && i % (per / 2) === 0;
      const tl = major ? 34 : half ? 24 : 15;
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = major ? 2.4 : 1.5;
      ctx.beginPath(); ctx.moveTo(cx - sw / 2 - 3, yy); ctx.lineTo(cx - sw / 2 - 3 - tl, yy); ctx.moveTo(cx + sw / 2 + 3, yy); ctx.lineTo(cx + sw / 2 + 3 + tl, yy); ctx.stroke();
      if (major) { ctx.fillStyle = '#1b2333'; ctx.font = PS.font(F(18), 800); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(String(PS.round(v, 2)), cx - sw / 2 - 42, yy); }
    }
    // 指针
    ctx.fillStyle = '#e03131';
    ctx.fillRect(cx - sw / 2, cy - 3.5, sw, 7);
    ctx.beginPath(); ctx.moveTo(cx - sw / 2, cy - 7); ctx.lineTo(cx - sw / 2 - 22, cy); ctx.lineTo(cx - sw / 2, cy + 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + sw / 2, cy - 7); ctx.lineTo(cx + sw / 2 + 22, cy); ctx.lineTo(cx + sw / 2, cy + 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (o.title !== false) D.text(ctx, o.title || '🔍 放大看指针', o.x + W / 2, o.y - 8, { size: F(13), weight: 700, color: '#3b5bdb', align: 'center' });
  };

  /** 一串钩码：从挂点 (x, y) 往下挂 n 个，每个 50 g；返回最下端的 y */
  FO.hookMass = function (ctx, x, y, n, o) {
    o = o || {};
    const bw = o.w || 26, bh = o.h || 22, gap = 9;
    let yy = y;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.strokeStyle = '#7a6420'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      // 顶部的小钩
      ctx.beginPath(); ctx.moveTo(x, yy + gap); ctx.lineTo(x, yy + 3); ctx.arc(x + 3.5, yy + 3, 3.5, Math.PI, Math.PI * 1.9); ctx.stroke();
      const top = yy + gap;
      const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
      g.addColorStop(0, '#b8902a'); g.addColorStop(0.35, '#f1d27a'); g.addColorStop(1, '#a07b1e');
      ctx.fillStyle = g; ctx.strokeStyle = '#7a6420'; ctx.lineWidth = 1;
      D.roundRect(ctx, x - bw / 2, top, bw, bh, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x - bw / 2, top + bh * 0.42, bw, 2);
      if (o.label !== false && bw >= 22) { ctx.fillStyle = '#5c4a12'; ctx.font = PS.font(o.fs || 9, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('50g', x, top + bh * 0.72); }
      ctx.restore();
      yy = top + bh;
    }
    return yy;
  };

  /** 简笔小人：脚底中心 (x, y)，o.h 身高，o.hand 手的位置（可为 null），o.lean 身体前倾（弧度），o.color */
  FO.person = function (ctx, x, y, o) {
    o = o || {};
    const H = o.h || 150, c = o.color || '#3b5bdb', dir = o.dir || 1, lean = o.lean || 0;
    const leg = H * 0.45, body = H * 0.33, head = H * 0.11;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const hipX = x + Math.sin(lean) * 0 * dir, hipY = y - leg;
    const shX = hipX + Math.sin(lean) * body * dir, shY = hipY - Math.cos(lean) * body;
    // 腿
    const st = o.stride != null ? o.stride : 0.25;
    ctx.strokeStyle = '#343a40'; ctx.lineWidth = H * 0.06;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(x - dir * leg * st, y); ctx.moveTo(hipX, hipY); ctx.lineTo(x + dir * leg * st * 0.6, y); ctx.stroke();
    // 身体
    ctx.strokeStyle = c; ctx.lineWidth = H * 0.11;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(shX, shY); ctx.stroke();
    // 头
    const hx = shX + Math.sin(lean) * head * 1.25 * dir, hy = shY - Math.cos(lean) * head * 1.25;
    ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(hx, hy, head, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(hx, hy - head * 0.25, head * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    // 手臂
    ctx.strokeStyle = '#ffc078'; ctx.lineWidth = H * 0.05;
    const hand = o.hand || { x: shX + dir * H * 0.12, y: shY + H * 0.22 };
    const hand2 = o.hand2 || hand;
    const arm = (hd) => {
      const dx = hd.x - shX, dy = hd.y - shY, d = Math.hypot(dx, dy), seg = H * 0.2;
      let ex, ey;
      if (d >= seg * 2) { ex = (shX + hd.x) / 2; ey = (shY + hd.y) / 2; }
      else { const m = Math.sqrt(seg * seg - (d / 2) * (d / 2)); ex = (shX + hd.x) / 2 - (dy / d) * m * dir * -1; ey = (shY + hd.y) / 2 + (dx / d) * m * dir * -1; if (ey < Math.min(shY, hd.y)) ey = Math.max(shY, hd.y); }
      ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(ex, ey); ctx.lineTo(hd.x, hd.y); ctx.stroke();
      ctx.fillStyle = '#ffc078'; ctx.beginPath(); ctx.arc(hd.x, hd.y, H * 0.035, 0, TAU); ctx.fill();
    };
    arm(hand2); arm(hand);
    ctx.restore();
    return { sh: { x: shX, y: shY }, head: { x: hx, y: hy } };
  };

  /** 木箱：左下角 (x, y - h) 到 (x + w, y) */
  FO.box = function (ctx, x, y, w, hh, o) {
    o = o || {};
    ctx.save();
    const g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, o.c1 || '#e9b872'); g.addColorStop(1, o.c2 || '#c98d3e');
    ctx.fillStyle = g; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2;
    ctx.fillRect(x, y - hh, w, hh); ctx.strokeRect(x, y - hh, w, hh);
    ctx.strokeStyle = 'rgba(138,90,28,.55)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 6, y - hh + 6, w - 12, hh - 12);
    ctx.beginPath(); ctx.moveTo(x + 6, y - hh + 6); ctx.lineTo(x + w - 6, y - 6); ctx.moveTo(x + w - 6, y - hh + 6); ctx.lineTo(x + 6, y - 6); ctx.stroke();
    if (o.label) D.text(ctx, o.label, x + w / 2, y - hh / 2, { size: o.fs || 14, weight: 800, color: '#5c3a0e', align: 'center', baseline: 'middle', bg: 'rgba(255,255,255,.7)' });
    ctx.restore();
  };

  /** 地面：水平线 + 下方短斜线 */
  FO.ground = function (ctx, x0, x1, y, o) {
    o = o || {};
    ctx.save();
    if (o.fill !== false) { ctx.fillStyle = o.fill || '#f1f3f5'; ctx.fillRect(x0, y, x1 - x0, o.depth || 22); }
    ctx.strokeStyle = o.color || '#868e96'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let xx = x0 + 6; xx < x1; xx += 14) { ctx.moveTo(xx, y); ctx.lineTo(xx - 9, y + 10); }
    ctx.stroke();
    ctx.restore();
  };

  /** 小车：车身左下角 (x, y)（y 为轮子着地处），o.w 宽，o.color */
  FO.cart = function (ctx, x, y, o) {
    o = o || {};
    const w = o.w || 120, hh = o.h || 34, r = o.r || 11, c = o.color || '#4dabf7';
    ctx.save();
    ctx.fillStyle = c; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5;
    D.roundRect(ctx, x, y - r * 1.6 - hh, w, hh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 6, y - r * 1.6 - hh + 5, w - 12, 6);
    [x + w * 0.22, x + w * 0.78].forEach((wx) => {
      ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(wx, y - r, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(wx, y - r, r * 0.4, 0, TAU); ctx.fill();
      if (o.spin != null) { ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(wx, y - r); ctx.lineTo(wx + Math.cos(o.spin) * r * 0.85, y - r + Math.sin(o.spin) * r * 0.85); ctx.stroke(); }
    });
    if (o.label) D.text(ctx, o.label, x + w / 2, y - r * 1.6 - hh / 2, { size: o.fs || 13, weight: 800, color: '#fff', align: 'center', baseline: 'middle' });
    ctx.restore();
    return { top: y - r * 1.6 - hh };
  };

  /** 条形磁体：中心 (x, y)，长 len，角度 ang；o.n 在哪一端（1 = 右端为 N 极） */
  FO.magnet = function (ctx, x, y, len, o) {
    o = o || {};
    const th = o.t || len * 0.26, ang = o.ang || 0, nRight = o.n !== -1;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = nRight ? '#4dabf7' : '#ff6b6b'; ctx.fillRect(-len / 2, -th / 2, len / 2, th);
    ctx.fillStyle = nRight ? '#ff6b6b' : '#4dabf7'; ctx.fillRect(0, -th / 2, len / 2, th);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.strokeRect(-len / 2, -th / 2, len, th);
    ctx.fillStyle = '#fff'; ctx.font = PS.font(Math.max(10, th * 0.55), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nRight ? 'S' : 'N', -len / 4, 1); ctx.fillText(nRight ? 'N' : 'S', len / 4, 1);
    ctx.restore();
  };

  /** 小球（金属光泽） */
  FO.ball = function (ctx, x, y, r, c1, c2) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, c1 || '#ced4da'); g.addColorStop(1, c2 || '#495057');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };

  /* 第7章组件共用的样式 */
  if (!document.getElementById('force-style')) document.head.append(h('style', { id: 'force-style' }, `
    .fc-msg{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.92rem;min-height:2.6em}
    .fc-msg.ok{background:var(--green-soft);border-color:#b2f2bb}
    .fc-msg.bad{background:var(--red-soft);border-color:#ffc9c9}
    .fc-msg.info{background:var(--primary-soft);border-color:#bac8ff}
    .fc-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:14px;align-items:start}
    .fc-pair > div{min-width:0}
    .fc-ans{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .fc-ans input{width:96px}
    .fc-q{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-top:10px;font-size:.94rem}
    .fc-q .q-options{margin-top:8px}
    .fc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .fc-chips .btn.on{background:var(--primary);color:#fff;border-color:var(--primary)}
    @media (max-width:680px){.fc-pair{grid-template-columns:minmax(0,1fr)}}
  `));
})();
