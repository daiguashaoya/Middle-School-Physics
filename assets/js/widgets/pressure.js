/*
 * 看得见的物理 · 第9章公共库（压强）
 * PS.LIQ                      液体：水 / 盐水 / 酒精 / 水银 / 煤油（名称、密度 kg/m³、颜色）
 * PS.pr.g                     计算题取 10 N/kg（托里拆利实验用 9.8 N/kg）
 * PS.pr.sci(x, sig) / fmtPa(p, unit)   画布用的科学记数法文字（1.25×10⁴ Pa）；html 版 PS.pretty
 * PS.pr.bp(p)                 水的沸点（℃）与液面上方气压（Pa）的关系（安托万公式）
 * PS.pr.atm(hm)               海拔 hm 米处的大气压（Pa，标准大气模型）
 * PS.pr.liquid(ctx, x, y, w, h, kind, o)  一块液体（上表面 y），带液面高光
 * PS.pr.glass(ctx, pathFn, o) 玻璃器壁（先填浅色，再描边加高光）
 * PS.pr.utube(ctx, o)         U 形管压强计（两管、刻度板、红色液体，o.dh 高度差 px，左管接探头）；返回各部位位置
 * PS.pr.probe(ctx, x, y, ang, o)  压强计的探头（金属盒 + 橡皮膜，膜朝 ang 方向，o.bulge 内凹程度）
 * PS.pr.gauge(ctx, x, y, r, o) 圆形压强表 / 气压计（o.v、o.min、o.max、o.unit、o.label、o.ticks）
 * PS.pr.inArrows(ctx, x, y, o) 一点处各个方向的压强（8 个向内的箭头）
 * PS.pr.air(ctx, x, y, w, h, o)  空气分子示意（o.n 密度、o.t 时间，抖动的小点）
 * PS.pr.sponge(ctx, x0, x1, y, hh, dent)  海绵（dent(x) 返回该处凹陷的深度 px）
 * 依赖 core.js、force.js（.fc-* 样式）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.LIQ = {
    water: { name: '水', rho: 1.0e3, c: 'rgba(77,171,247,.42)', c2: '#4dabf7', top: 'rgba(165,216,255,.9)' },
    salt: { name: '盐水', rho: 1.2e3, c: 'rgba(32,201,151,.38)', c2: '#20c997', top: 'rgba(150,242,215,.9)' },
    alcohol: { name: '酒精', rho: 0.8e3, c: 'rgba(250,176,5,.28)', c2: '#f59f00', top: 'rgba(255,236,153,.9)' },
    mercury: { name: '水银', rho: 13.6e3, c: '#a8b1bc', c2: '#6c757d', top: '#dee2e6' },
    kerosene: { name: '煤油', rho: 0.8e3, c: 'rgba(252,196,25,.45)', c2: '#f08c00', top: 'rgba(255,224,102,.95)' },
  };

  const PR = (PS.pr = {});
  PR.g = 10;
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  PR.sup = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  /** 科学记数法文字：1.25×10⁴；|x| 在 0.01~10000 之间直接写数字 */
  PR.sci = function (x, sig) {
    sig = sig || 3;
    if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax >= 0.01 && ax < 1e4) return String(+x.toPrecision(sig)).replace('-', '−');
    let e = Math.floor(Math.log10(ax)), m = +(x / Math.pow(10, e)).toPrecision(sig);
    if (Math.abs(m) >= 10) { m /= 10; e++; }
    return String(m).replace('-', '−') + '×10' + PR.sup(e);
  };
  PR.fmtPa = (p, unit) => PR.sci(p, 3) + ' ' + (unit || 'Pa');

  /** 水的沸点：安托万公式（1~100 ℃、99~374 ℃ 两组常数），p 单位 Pa */
  PR.bp = function (p) {
    const mm = Math.max(1, p / 133.322);
    let T = 1730.63 / (8.07131 - Math.log10(mm)) - 233.426;
    if (T > 99) T = 1810.94 / (8.14019 - Math.log10(mm)) - 244.485;
    return T;
  };
  /** 海拔 hm 米处的大气压（标准大气，对流层） */
  PR.atm = (hm) => 101325 * Math.pow(1 - 2.25577e-5 * hm, 5.25588);

  /** 一块液体：上表面在 y */
  PR.liquid = function (ctx, x, y, w, hh, kind, o) {
    o = o || {};
    const L = PS.LIQ[kind] || PS.LIQ.water;
    if (hh <= 0) return;
    ctx.save();
    ctx.fillStyle = L.c; ctx.fillRect(x, y, w, hh);
    if (o.surface !== false) {
      ctx.strokeStyle = L.c2; ctx.lineWidth = o.lw || 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
      ctx.fillStyle = L.top; ctx.globalAlpha = 0.6; ctx.fillRect(x, y, w, Math.min(4, hh)); ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  /** 玻璃器壁：pathFn(ctx) 画出路径 */
  PR.glass = function (ctx, pathFn, o) {
    o = o || {};
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = o.color || 'rgba(108,140,180,.95)'; ctx.lineWidth = o.width || 3;
    pathFn(ctx); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = (o.width || 3) * 0.35;
    pathFn(ctx); ctx.stroke();
    ctx.restore();
  };

  /**
   * U 形管压强计：o.x 左管中心，o.gap 两管间距，o.y 管口，o.L 管长，o.dh 液面高度差（px，左低右高为正），
   * o.k 每厘米多少 px（刻度），o.F 字号函数，o.liq 颜色；返回 { lx, rx, yL, yR, mid, top }
   */
  PR.utube = function (ctx, o) {
    const F = o.F || ((v) => v);
    const lx = o.x, rx = o.x + (o.gap || 60), top = o.y, L = o.L || 260, r = (o.gap || 60) / 2, tw = o.tw || 12;
    const bot = top + L, mid = top + L * 0.5, dh = o.dh || 0;
    const yL = mid + dh / 2, yR = mid - dh / 2;
    const cx = (lx + rx) / 2;
    ctx.save();
    // 刻度板
    ctx.fillStyle = '#fff8e6'; ctx.strokeStyle = '#d9b77a'; ctx.lineWidth = 1.5;
    D.roundRect(ctx, lx - 34, top - 14, rx - lx + 68, L + r + 32, 8); ctx.fill(); ctx.stroke();
    const k = o.k || 10;
    ctx.strokeStyle = '#8a6d3b'; ctx.fillStyle = '#8a6d3b'; ctx.font = PS.font(F(10), 600); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = -12; i <= 12; i++) {
      const yy = mid - i * k; if (yy < top + 4 || yy > bot - 2) continue;
      const big = i % 5 === 0;
      ctx.lineWidth = big ? 1.3 : 0.8;
      ctx.beginPath(); ctx.moveTo(cx - (big ? 9 : 5), yy); ctx.lineTo(cx + (big ? 9 : 5), yy); ctx.stroke();
      if (big && i) ctx.fillText(String(Math.abs(i)), cx, yy - 7);
    }
    ctx.fillText('cm', cx, top - 4);
    // 液体（先画，再画玻璃）
    const liq = o.liq || 'rgba(240,62,62,.75)';
    ctx.fillStyle = liq;
    ctx.fillRect(lx - tw / 2 + 1.5, yL, tw - 3, bot - yL);
    ctx.fillRect(rx - tw / 2 + 1.5, yR, tw - 3, bot - yR);
    ctx.lineWidth = tw - 3; ctx.strokeStyle = liq;
    ctx.beginPath(); ctx.arc(cx, bot, r, 0, Math.PI); ctx.stroke();
    // 凹液面
    ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 1.6;
    [[lx, yL], [rx, yR]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - tw / 2 + 2, y - 1.5); ctx.quadraticCurveTo(x, y + 2.5, x + tw / 2 - 2, y - 1.5); ctx.stroke(); });
    // 玻璃管
    PR.glass(ctx, (c) => {
      c.beginPath();
      c.moveTo(lx - tw / 2, top); c.lineTo(lx - tw / 2, bot); c.arc(cx, bot, r + tw / 2, Math.PI, 0, true); c.lineTo(rx + tw / 2, top);
      c.moveTo(lx + tw / 2, top); c.lineTo(lx + tw / 2, bot); c.arc(cx, bot, r - tw / 2, Math.PI, 0, true); c.lineTo(rx - tw / 2, top);
    }, { width: 2.2 });
    // 高度差标注
    if (o.showDh !== false && Math.abs(dh) > 3) {
      const xx = rx + tw / 2 + 12;
      ctx.strokeStyle = '#1b2333'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx - tw / 2, yL); ctx.lineTo(xx + 6, yL); ctx.moveTo(rx, yR); ctx.lineTo(xx + 6, yR); ctx.stroke(); ctx.setLineDash([]);
      D.arrow(ctx, xx, (yL + yR) / 2, xx, Math.min(yL, yR), { color: '#1b2333', width: 1.4, head: 7 });
      D.arrow(ctx, xx, (yL + yR) / 2, xx, Math.max(yL, yR), { color: '#1b2333', width: 1.4, head: 7 });
      if (o.label) D.text(ctx, o.label, xx + 8, (yL + yR) / 2, { size: F(13), weight: 800, color: '#c92a2a', bg: 'rgba(255,255,255,.85)' });
    }
    ctx.restore();
    return { lx, rx, yL, yR, mid, top, bot };
  };

  /** 探头：金属盒 + 橡皮膜，膜朝 ang 方向（画布角度，0 向右，π/2 向下） */
  PR.probe = function (ctx, x, y, ang, o) {
    o = o || {};
    const R = o.r || 16, d = o.d || 12, b = o.bulge || 0;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    // 盒身（膜在 +x 一侧）
    const g = ctx.createLinearGradient(-d, -R, -d, R); g.addColorStop(0, '#dee2e6'); g.addColorStop(0.5, '#adb5bd'); g.addColorStop(1, '#868e96');
    ctx.fillStyle = g; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4;
    D.roundRect(ctx, -d, -R, d, 2 * R, 3); ctx.fill(); ctx.stroke();
    // 橡皮膜（受压向内凹）
    ctx.fillStyle = o.hl ? '#ff8787' : '#fa5252'; ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(3 - b * 2, 0, 0, R); ctx.lineTo(-2, R); ctx.lineTo(-2, -R); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  /** 圆形表盘 */
  PR.gauge = function (ctx, x, y, r, o) {
    const F = o.F || ((v) => v);
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const A = (v) => a0 + ((PS.clamp(v, o.min, o.max) - o.min) / (o.max - o.min)) * (a1 - a0);
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = o.ring || '#495057'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    if (o.zone) { ctx.strokeStyle = o.zone[2]; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, r - 8, A(o.zone[0]), A(o.zone[1])); ctx.stroke(); }
    const n = o.ticks || 10;
    ctx.strokeStyle = '#343a40'; ctx.fillStyle = '#343a40'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = PS.font(F(10), 600);
    for (let i = 0; i <= n * 2; i++) {
      const v = o.min + ((o.max - o.min) * i) / (n * 2), a = A(v), big = i % 2 === 0;
      ctx.lineWidth = big ? 1.8 : 1;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4)); ctx.lineTo(x + Math.cos(a) * (r - (big ? 13 : 9)), y + Math.sin(a) * (r - (big ? 13 : 9))); ctx.stroke();
      if (big && (o.labelEvery ? (i / 2) % o.labelEvery === 0 : true)) ctx.fillText(o.fmt ? o.fmt(v) : String(PS.round(v, 2)), x + Math.cos(a) * (r - 24), y + Math.sin(a) * (r - 24));
    }
    if (o.label) D.text(ctx, o.label, x, y + r * 0.42, { size: F(11), weight: 700, color: '#495057', align: 'center' });
    if (o.unit) D.text(ctx, o.unit, x, y - r * 0.38, { size: F(10), color: '#868e96', align: 'center' });
    const a = A(o.v);
    ctx.strokeStyle = o.needle || '#e03131'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 8, y - Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * (r - 14), y + Math.sin(a) * (r - 14)); ctx.stroke();
    ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /** 一点处各个方向的压强 */
  PR.inArrows = function (ctx, x, y, o) {
    o = o || {};
    const n = o.n || 8, len = o.len || 22, gap = o.gap || 6, c = o.color || '#1c7ed6';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      D.arrow(ctx, x + Math.cos(a) * (gap + len), y + Math.sin(a) * (gap + len), x + Math.cos(a) * gap, y + Math.sin(a) * gap, { color: c, width: o.width || 2, head: o.head || 7 });
    }
  };

  /** 空气分子示意：在矩形内画 o.n 个抖动的小点（位置由下标决定，不随机闪烁） */
  PR.air = function (ctx, x, y, w, hh, o) {
    o = o || {};
    const n = Math.round(o.n == null ? 30 : o.n), t = o.t || 0, r = o.r || 2.6;
    ctx.save();
    ctx.fillStyle = o.color || 'rgba(76,110,245,.55)';
    for (let i = 0; i < n; i++) {
      const fx = (Math.sin(i * 12.9898) * 43758.5453) % 1, fy = (Math.sin(i * 78.233) * 12543.1234) % 1;
      const px = x + Math.abs(fx) * w + Math.sin(t * 3 + i) * 3, py = y + Math.abs(fy) * hh + Math.cos(t * 2.6 + i * 1.7) * 3;
      if (px < x || px > x + w || py < y || py > y + hh) continue;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  /** 海绵：上表面 y，厚 hh，dent(x) 为该处凹陷深度 */
  PR.sponge = function (ctx, x0, x1, y, hh, dent) {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, y + hh);
    for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, y + (dent ? dent(x) : 0));
    ctx.lineTo(x1, y + hh); ctx.closePath();
    ctx.fillStyle = '#ffe066'; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(230,170,0,.45)';
    for (let i = 0; i < 90; i++) {
      const fx = Math.abs((Math.sin(i * 91.7) * 9631.3) % 1), fy = Math.abs((Math.sin(i * 17.3) * 4211.7) % 1);
      const px = x0 + fx * (x1 - x0), py0 = y + fy * hh;
      const dd = dent ? dent(px) : 0, py = py0 + dd * (1 - (py0 - y) / hh);
      const sq = 1 - (dd / hh) * 0.8 * (1 - (py0 - y) / hh);
      ctx.beginPath(); ctx.ellipse(px, py, 3.2, 2.4 * Math.max(0.3, sq), 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#e8a600'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  };

  /* 第9章组件共用的样式（.fc-* 来自 force.js，.dy-* 来自 dynamics.js） */
  if (!document.getElementById('pr-style')) document.head.append(h('style', { id: 'pr-style' }, `
    .pr-steps{margin:6px 0 0;padding-left:1.4em;font-size:.9rem}
    .pr-steps li{margin:2px 0;color:var(--muted)}
    .pr-steps li.on{color:var(--ink);font-weight:700}
    .pr-steps li.done{color:var(--green)}
    .pr-calc{font-size:.95rem;line-height:1.9}
    .pr-calc .row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
    .pr-calc input{width:90px}
    .pr-calc select{padding:3px 4px;border-radius:6px;border:1px solid var(--line-2)}
  `));
})();
