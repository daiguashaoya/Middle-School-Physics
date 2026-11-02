/*
 * 看得见的物理 · 第8章公共库（运动和力）
 * PS.SURF                     接触面：毛巾 / 棉布 / 木板 / 玻璃 / 绝对光滑（名称、颜色、滑动摩擦的等效系数 mu）
 * PS.dyn.surface(ctx, x0, x1, y, kind, o)  画一段水平接触面（毛巾的绒圈、棉布的纹理、木纹、玻璃反光），o.depth 厚度
 * PS.dyn.hscale(ctx, o)       水平的弹簧测力计（拉环在右、挂钩在左）：o.x 拉环圆心、o.y 轴线、o.max、o.div、o.L、o.F；返回 { hook, ring, left, right, px }
 * PS.dyn.hzoom(ctx, F, o)     水平测力计指针附近的放大读数视图
 * PS.dyn.block(ctx, x, y, w, h, o)  木块（左下角 x、底面 y），o.weights 上面叠放的砝码个数，o.side 侧放的纹理
 * PS.dyn.weight(ctx, x, y, o) 一个槽码 / 砝码（底面中心）
 * PS.dyn.chart(ctx, o)        简单坐标图：o.x/o.y/o.w/o.h、xmax/ymax、xstep/ystep、xl/yl、series [{ pts, color, dash, width }]
 * PS.dyn.strobe(ctx, pts, o)  频闪照片式的一串点
 * PS.dyn.person2(ctx, x, y, o) 侧面的站立乘客（可前倾 / 后仰），返回头的位置
 * 依赖 core.js、force.js
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.SURF = {
    towel: { name: '毛巾', mu: 0.5, c: '#f8c4d8', c2: '#e599b7' },
    cotton: { name: '棉布', mu: 0.3, c: '#cfe3f7', c2: '#9cc2e8' },
    wood: { name: '木板', mu: 0.2, c: '#e3bf86', c2: '#b88a4b' },
    glass: { name: '玻璃', mu: 0.1, c: '#dff3fb', c2: '#9fd3e6' },
    ideal: { name: '绝对光滑', mu: 0, c: '#f1f3f5', c2: '#ced4da' },
  };

  const DY = (PS.dyn = {});

  /** 一段水平接触面：上表面 y，从 x0 到 x1 */
  DY.surface = function (ctx, x0, x1, y, kind, o) {
    o = o || {};
    const S = PS.SURF[kind] || PS.SURF.wood, dep = o.depth || 16;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y - 12, x1 - x0, dep + 14); ctx.clip();
    ctx.fillStyle = S.c; ctx.fillRect(x0, y, x1 - x0, dep);
    if (kind === 'towel') {
      // 毛巾：一排排小绒圈，表面最粗糙
      ctx.strokeStyle = S.c2; ctx.lineWidth = 1.6;
      for (let x = x0 + 3; x < x1; x += 7) { ctx.beginPath(); ctx.arc(x, y + 1, 3.4, Math.PI, TAU); ctx.stroke(); }
      for (let x = x0 + 6; x < x1; x += 7) { ctx.beginPath(); ctx.arc(x, y + 7, 2.6, Math.PI, TAU); ctx.stroke(); }
    } else if (kind === 'cotton') {
      ctx.strokeStyle = S.c2; ctx.lineWidth = 1;
      for (let x = x0; x < x1; x += 6) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + dep); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x0, y + dep * 0.5); ctx.lineTo(x1, y + dep * 0.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(80,120,170,.5)'; ctx.beginPath();
      for (let x = x0; x < x1; x += 4) { ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 1.4); }
      ctx.stroke();
    } else if (kind === 'wood') {
      ctx.strokeStyle = 'rgba(120,75,25,.35)'; ctx.lineWidth = 1.2;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); const yy = y + (i * dep) / 4; ctx.moveTo(x0, yy); for (let x = x0; x <= x1; x += 40) ctx.lineTo(x, yy + Math.sin(x * 0.03 + i) * 1.2); ctx.stroke(); }
    } else if (kind === 'glass') {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let x = x0 + 20; x < x1; x += 90) { ctx.beginPath(); ctx.moveTo(x, y + dep - 2); ctx.lineTo(x + 14, y + 2); ctx.lineTo(x + 22, y + 2); ctx.lineTo(x + 8, y + dep - 2); ctx.fill(); }
    }
    ctx.strokeStyle = S.c2; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y, x1 - x0, dep);
    ctx.restore();
  };

  /** 水平的弹簧测力计：拉环在右（o.x, o.y），挂钩在左；刻度从右向左增大 */
  DY.hscale = function (ctx, o) {
    const F = o.F2 || ((v) => v);
    const max = o.max || 5, div = o.div || 0.1, L = o.L || 260, hh = o.h || 40;
    const rr = o.rr || 11, y = o.y;
    const right = o.x - rr - 4, x0 = right - 26, left = x0 - L - 22;
    const shown = PS.clamp(o.F || 0, -0.3 * div, max + 0.4 * div);
    const px = x0 - (shown / max) * L;
    ctx.save();
    // 拉环
    ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(o.x, y, rr, 0, TAU); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x - rr, y); ctx.lineTo(right - 1, y); ctx.stroke();
    // 外壳
    const g = ctx.createLinearGradient(0, y - hh / 2, 0, y + hh / 2);
    g.addColorStop(0, '#e7ecf3'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#dfe5ee');
    ctx.fillStyle = g; ctx.strokeStyle = '#8d99ab'; ctx.lineWidth = 1.4;
    D.roundRect(ctx, left, y - hh / 2, right - left, hh, 8); ctx.fill(); ctx.stroke();
    const sw = 12;
    ctx.fillStyle = '#eef3fa'; ctx.strokeStyle = '#b5c0cf'; ctx.lineWidth = 1;
    D.roundRect(ctx, left + 5, y - sw / 2, right - left - 10, sw, 5); ctx.fill(); ctx.stroke();
    // 刻度（上下两排）
    ctx.strokeStyle = '#1b2333'; ctx.fillStyle = '#1b2333';
    const nDiv = Math.round(max / div), per = Math.round(1 / div);
    for (let i = 0; i <= nDiv; i++) {
      const xx = x0 - ((i * div) / max) * L;
      const major = i % per === 0, half = per % 2 === 0 && i % (per / 2) === 0;
      const tl = major ? 9 : half ? 6.5 : 4;
      ctx.lineWidth = major ? 1.3 : 0.8;
      ctx.beginPath(); ctx.moveTo(xx, y - sw / 2 - 1); ctx.lineTo(xx, y - sw / 2 - 1 - tl); ctx.moveTo(xx, y + sw / 2 + 1); ctx.lineTo(xx, y + sw / 2 + 1 + tl); ctx.stroke();
    }
    if (o.labels !== false) {
      ctx.font = PS.font(o.fs || F(10), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      for (let v = 0; v <= max + 1e-9; v += 1) ctx.fillText(String(v), x0 - (v / max) * L, y - hh / 2 - 1);
      ctx.textAlign = 'left'; ctx.fillText('N', right + 2, y - hh / 2 - 1);
    }
    // 弹簧（从右端到指针）
    PS.force.spring(ctx, right - 4, y, px + 2, y, { n: 10, r: 4, width: 1.5, lead: 2 });
    // 指针
    ctx.fillStyle = '#e03131';
    ctx.fillRect(px - 2, y - sw / 2 + 1, 4, sw - 2);
    ctx.beginPath(); ctx.moveTo(px - 3, y - sw / 2 - 1); ctx.lineTo(px, y - sw / 2 - 9); ctx.lineTo(px + 3, y - sw / 2 - 1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - 3, y + sw / 2 + 1); ctx.lineTo(px, y + sw / 2 + 9); ctx.lineTo(px + 3, y + sw / 2 + 1); ctx.closePath(); ctx.fill();
    // 拉杆与挂钩（随指针移动）
    const rodEnd = px - (x0 - left) - 6;
    ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px - 2, y); ctx.lineTo(rodEnd, y); ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(rodEnd, y); ctx.lineTo(rodEnd - 8, y); ctx.arc(rodEnd - 8, y + 6, 6, -Math.PI / 2, Math.PI * 0.55, true); ctx.stroke();
    ctx.restore();
    return { hook: { x: rodEnd - 14, y: y + 6 }, ring: { x: o.x, y }, left, right, px, x0 };
  };

  /** 水平测力计的放大读数视图：在 (o.x, o.y) 画 o.w × o.h 的框，显示 F 附近 ±o.span N */
  DY.hzoom = function (ctx, Fv, o) {
    const F = o.F2 || ((v) => v);
    const max = o.max || 5, div = o.div || 0.1, W = o.w || 220, H = o.h || 96, span = o.span || div * 6;
    const cx = o.x + W / 2, cy = o.y + H / 2, k = W / (2 * span);
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2;
    D.roundRect(ctx, o.x, o.y, W, H, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); D.roundRect(ctx, o.x + 1, o.y + 1, W - 2, H - 2, 9); ctx.clip();
    const sw = 18;
    ctx.fillStyle = '#eef3fa'; ctx.fillRect(o.x, cy - sw / 2, W, sw);
    const per = Math.round(1 / div), nDiv = Math.round(max / div);
    for (let i = 0; i <= nDiv; i++) {
      const v = i * div, xx = cx - (v - Fv) * k;
      if (xx < o.x - 10 || xx > o.x + W + 10) continue;
      const major = i % per === 0, half = per % 2 === 0 && i % (per / 2) === 0;
      const tl = major ? 22 : half ? 16 : 10;
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = major ? 2.2 : 1.3;
      ctx.beginPath(); ctx.moveTo(xx, cy - sw / 2 - 2); ctx.lineTo(xx, cy - sw / 2 - 2 - tl); ctx.moveTo(xx, cy + sw / 2 + 2); ctx.lineTo(xx, cy + sw / 2 + 2 + tl * 0.7); ctx.stroke();
      if (major) { ctx.fillStyle = '#1b2333'; ctx.font = PS.font(F(15), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(String(PS.round(v, 2)), xx + 0.5, cy - sw / 2 - 26); }
    }
    ctx.fillStyle = '#e03131';
    ctx.fillRect(cx - 2.5, cy - sw / 2, 5, sw);
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - sw / 2); ctx.lineTo(cx, cy - sw / 2 - 18); ctx.lineTo(cx + 5, cy - sw / 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy + sw / 2); ctx.lineTo(cx, cy + sw / 2 + 16); ctx.lineTo(cx + 5, cy + sw / 2); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (o.title !== false) D.text(ctx, o.title || '🔍 放大看指针', cx, o.y - 7, { size: F(12), weight: 700, color: '#3b5bdb', align: 'center' });
  };

  /** 木块：左下角 x、底面 y */
  DY.block = function (ctx, x, y, w, hh, o) {
    o = o || {};
    ctx.save();
    const g = ctx.createLinearGradient(0, y - hh, 0, y);
    g.addColorStop(0, o.c1 || '#e9c48f'); g.addColorStop(1, o.c2 || '#c9934f');
    ctx.fillStyle = g; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 1.8;
    ctx.fillRect(x, y - hh, w, hh); ctx.strokeRect(x, y - hh, w, hh);
    ctx.strokeStyle = 'rgba(120,75,25,.3)'; ctx.lineWidth = 1;
    const n = Math.max(2, Math.round(hh / 14));
    for (let i = 1; i < n; i++) { ctx.beginPath(); const yy = y - hh + (i * hh) / n; ctx.moveTo(x + 3, yy); ctx.bezierCurveTo(x + w * 0.3, yy + 2, x + w * 0.7, yy - 2, x + w - 3, yy + 1); ctx.stroke(); }
    if (o.label) D.text(ctx, o.label, x + w / 2, y - hh / 2, { size: o.fs || 14, weight: 800, color: '#5c3a0e', align: 'center', baseline: 'middle' });
    // 叠放的砝码
    let top = y - hh;
    for (let i = 0; i < (o.weights || 0); i++) top = DY.weight(ctx, x + w / 2 + (i % 2 ? 6 : -6), top, { w: Math.min(56, w * 0.5) });
    ctx.restore();
    return top;
  };

  /** 一个砝码（底面中心 x, y），返回顶部 y */
  DY.weight = function (ctx, x, y, o) {
    o = o || {};
    const w = o.w || 46, hh = o.h || w * 0.62;
    ctx.save();
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#9aa3ad'); g.addColorStop(0.4, '#eef1f4'); g.addColorStop(1, '#7c8590');
    ctx.fillStyle = g; ctx.strokeStyle = '#5c636b'; ctx.lineWidth = 1.2;
    D.roundRect(ctx, x - w / 2, y - hh, w, hh * 0.78, 4); ctx.fill(); ctx.stroke();
    D.roundRect(ctx, x - w * 0.18, y - hh - hh * 0.22, w * 0.36, hh * 0.3, 3); ctx.fill(); ctx.stroke();
    ctx.fillRect(x - w / 2, y - hh * 0.22, w, hh * 0.22); ctx.strokeRect(x - w / 2, y - hh * 0.22, w, hh * 0.22);
    if (o.label) { ctx.fillStyle = '#343a40'; ctx.font = PS.font(o.fs || 10, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.label, x, y - hh * 0.6); }
    ctx.restore();
    return y - hh - hh * 0.22;
  };

  /** 坐标图 */
  DY.chart = function (ctx, o) {
    const F = o.F || ((v) => v);
    const x0 = o.x, y0 = o.y + o.h, x1 = o.x + o.w, y1 = o.y;
    const X = (t) => x0 + (t / o.xmax) * (x1 - x0), Y = (v) => y0 - ((v - (o.ymin || 0)) / (o.ymax - (o.ymin || 0))) * (y0 - y1);
    ctx.save();
    if (o.bg !== false) { ctx.fillStyle = o.bg || '#fff'; D.roundRect(ctx, x0 - (o.padL || 44), y1 - 24, o.w + (o.padL || 44) + 34, o.h + 52, 10); ctx.fill(); }
    ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
    if (o.xstep) for (let t = o.xstep; t <= o.xmax + 1e-9; t += o.xstep) { ctx.beginPath(); ctx.moveTo(X(t), y0); ctx.lineTo(X(t), y1); ctx.stroke(); }
    if (o.ystep) for (let v = (o.ymin || 0) + o.ystep; v <= o.ymax + 1e-9; v += o.ystep) { ctx.beginPath(); ctx.moveTo(x0, Y(v)); ctx.lineTo(x1, Y(v)); ctx.stroke(); }
    D.arrow(ctx, x0, y0, x1 + 12, y0, { color: '#495057', width: 1.5, head: 7 });
    D.arrow(ctx, x0, y0, x0, y1 - 12, { color: '#495057', width: 1.5, head: 7 });
    D.text(ctx, o.xl || 't/s', x1 + 14, y0 + 4, { size: F(12), weight: 700 });
    D.text(ctx, o.yl || 'v', x0 + 6, y1 - 12, { size: F(12), weight: 700 });
    const lab = o.xlab || o.xstep;
    if (lab) for (let t = lab; t <= o.xmax + 1e-9; t += lab) D.text(ctx, String(PS.round(t, 2)), X(t), y0 + 15, { size: F(11), align: 'center', color: '#495057' });
    const ylab = o.ylab || o.ystep;
    if (ylab) for (let v = (o.ymin || 0) + ylab; v <= o.ymax + 1e-9; v += ylab) D.text(ctx, String(PS.round(v, 2)), x0 - 6, Y(v) + 4, { size: F(11), align: 'right', color: '#495057' });
    D.text(ctx, '0', x0 - 6, y0 + 14, { size: F(11), align: 'right', color: '#495057' });
    ctx.beginPath(); ctx.rect(x0, y1 - 4, x1 - x0 + 2, y0 - y1 + 6); ctx.clip();
    (o.series || []).forEach((s) => {
      if (!s.pts || s.pts.length < 2) return;
      ctx.strokeStyle = s.color || '#3b5bdb'; ctx.lineWidth = s.width || 2.4; ctx.lineJoin = 'round';
      ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      s.pts.forEach((p, i) => { const xx = X(p[0]), yy = Y(PS.clamp(p[1], (o.ymin || 0) - (o.ymax - (o.ymin || 0)) * 0.1, o.ymax * 1.1)); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
      ctx.stroke();
    });
    ctx.restore();
    return { X, Y };
  };

  /** 频闪照片：一串半透明的点 */
  DY.strobe = function (ctx, pts, o) {
    o = o || {};
    ctx.save();
    pts.forEach((p, i) => {
      ctx.globalAlpha = o.alpha != null ? o.alpha : 0.25 + (0.5 * (i + 1)) / pts.length;
      ctx.fillStyle = o.color || '#3b5bdb';
      ctx.beginPath(); ctx.arc(p[0], p[1], o.r || 6, 0, TAU); ctx.fill();
    });
    ctx.restore();
  };

  /** 侧面的站立乘客：脚底 (x, y)，o.lean 上身倾角（正 = 向右倾），o.h 身高，o.color */
  DY.person2 = function (ctx, x, y, o) {
    o = o || {};
    const H = o.h || 140, lean = o.lean || 0, c = o.color || '#3b5bdb';
    const leg = H * 0.46, body = H * 0.32, head = H * 0.1;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const hipX = x, hipY = y - leg;
    ctx.strokeStyle = '#343a40'; ctx.lineWidth = H * 0.06;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(x - H * 0.06, y); ctx.moveTo(hipX, hipY); ctx.lineTo(x + H * 0.06, y); ctx.stroke();
    const shX = hipX + Math.sin(lean) * body, shY = hipY - Math.cos(lean) * body;
    ctx.strokeStyle = c; ctx.lineWidth = H * 0.11;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(shX, shY); ctx.stroke();
    const hx = shX + Math.sin(lean) * head * 1.3, hy = shY - Math.cos(lean) * head * 1.3;
    ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(hx, hy, head, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(hx, hy - head * 0.25, head * 1.02, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    if (o.hand) {
      ctx.strokeStyle = '#ffc078'; ctx.lineWidth = H * 0.045;
      ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo((shX + o.hand.x) / 2 + 4, (shY + o.hand.y) / 2); ctx.lineTo(o.hand.x, o.hand.y); ctx.stroke();
    }
    ctx.restore();
    return { head: { x: hx, y: hy }, sh: { x: shX, y: shY } };
  };

  /* 第8章组件共用的样式（.fc-* 来自 force.js） */
  if (!document.getElementById('dyn-style')) document.head.append(h('style', { id: 'dyn-style' }, `
    .dy-check{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:.92rem}
    .dy-check span{display:inline-flex;align-items:center;gap:4px}
    .dy-check .y{color:#2b8a3e;font-weight:700}
    .dy-check .n{color:#e03131;font-weight:700}
    .dy-scenes{display:flex;flex-wrap:wrap;gap:6px}
    .dy-scenes .btn.on{background:var(--primary);color:#fff;border-color:var(--primary)}
  `));
})();
