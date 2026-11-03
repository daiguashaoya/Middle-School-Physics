/*
 * 看得见的物理 · 第10章公共库（浮力）
 * PS.FC.B                     浮力的颜色（绿）；其余力的颜色见 force.js
 * PS.LIQ.sea / milk           海水 1.03、牛奶 1.03（×10³ kg/m³；水、盐水、酒精、水银、煤油见 pressure.js）
 * PS.MATL                     物体的材料：铝 / 铁 / 铜 / 石块 / 木 / 冰 / 蜡 / 塑料（名称、密度 g/cm³、颜色）
 * PS.fl.g                     计算题取 10 N/kg
 * PS.fl.vessel(ctx, x, y, w, hh, o)   玻璃容器（开口，杯口 y，杯底 y + hh）；o.part 'back' 只画底色、'front' 只画器壁；o.spout 溢水口距杯口的距离
 * PS.fl.water(ctx, x, y, w, hh, level, kind)  容器中的液体（液面 level，画在器壁内侧）
 * PS.fl.metal(ctx, cx, top, w, hh, mat, o)    侧视的圆柱体（金属光泽、顶面椭圆、挂钩环），返回挂点
 * PS.fl.bucket(ctx, cx, bottom, w, hh, fill, o)  小桶（fill 0~1 为桶中水的多少）
 * PS.fl.hand(ctx, x, y, ang)  一只手（掌心朝 ang 方向）
 * PS.fl.forces(ctx, x, y, list, o)  同一作用点的竖直的力：list = [{ n: 'G', v: 2.7, c, up }]，向上的力有两个时左右错开
 * PS.fl.capFrac(d, R) / cylFrac(d, R)  球 / 水平圆柱浸入深度 d 时浸入的体积分数
 * PS.fl.step(b, dt, o)        竖直方向的浮沉运动（重力、浮力、阻力、容器底的支持力），b = { y, v }（y 向下为正）
 * PS.fl.scale3d(o)            three.js 中的弹簧测力计（拉环在原点），set(F) 返回挂钩的 y
 * 依赖 core.js、force.js、pressure.js
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.FC.B = '#2f9e44';
  PS.LIQ.sea = { name: '海水', rho: 1.03e3, c: 'rgba(28,126,214,.42)', c2: '#1c7ed6', top: 'rgba(165,216,255,.9)' };
  PS.LIQ.milk = { name: '牛奶', rho: 1.03e3, c: 'rgba(241,243,245,.92)', c2: '#adb5bd', top: 'rgba(255,255,255,.95)' };

  PS.MATL = {
    al: { name: '铝', rho: 2.7, c1: '#f1f3f5', c2: '#adb5bd' },
    fe: { name: '铁', rho: 7.9, c1: '#ced4da', c2: '#495057' },
    cu: { name: '铜', rho: 8.9, c1: '#ffd8a8', c2: '#c0702a' },
    stone: { name: '石块', rho: 2.5, c1: '#ced4da', c2: '#6c757d' },
    wood: { name: '木块', rho: 0.5, c1: '#f1cf98', c2: '#c98d3e' },
    ice: { name: '冰', rho: 0.9, c1: '#e7f5ff', c2: '#a5d8ff' },
    wax: { name: '蜡', rho: 0.9, c1: '#fff3bf', c2: '#f2c94c' },
    plastic: { name: '塑料', rho: 1.2, c1: '#d0bfff', c2: '#845ef7' },
  };

  const FL = (PS.fl = {});
  FL.g = 10;

  /** 玻璃容器：杯口 y，杯底 y + hh；o.part = 'back' | 'front'（默认两者都画）；o.spout 溢水口距杯口的距离（右侧） */
  FL.vessel = function (ctx, x, y, w, hh, o) {
    o = o || {};
    const r = Math.min(10, w * 0.08);
    if (o.part !== 'front') {
      ctx.save();
      ctx.fillStyle = o.back || 'rgba(231,245,255,.45)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + hh - r); ctx.quadraticCurveTo(x, y + hh, x + r, y + hh); ctx.lineTo(x + w - r, y + hh); ctx.quadraticCurveTo(x + w, y + hh, x + w, y + hh - r); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (o.part === 'back') return;
    PS.pr.glass(ctx, (c) => {
      c.beginPath();
      c.moveTo(x - 5, y - 3); c.lineTo(x, y + 2);
      c.lineTo(x, y + hh - r); c.quadraticCurveTo(x, y + hh, x + r, y + hh); c.lineTo(x + w - r, y + hh); c.quadraticCurveTo(x + w, y + hh, x + w, y + hh - r);
      if (o.spout != null) {
        const sy = y + o.spout;
        c.lineTo(x + w, sy + 7); c.lineTo(x + w + 26, sy + 19);
        c.moveTo(x + w + 26, sy + 9); c.lineTo(x + w, sy - 3);
      }
      c.lineTo(x + w, y + 2); c.lineTo(x + w + 5, y - 3);
    }, { width: o.width || 3 });
    if (o.ticks) {
      ctx.save();
      ctx.strokeStyle = 'rgba(73,80,87,.55)'; ctx.fillStyle = 'rgba(73,80,87,.8)'; ctx.lineWidth = 1;
      ctx.font = PS.font(o.fs || 11, 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      o.ticks.forEach(([ty, lab]) => { ctx.beginPath(); ctx.moveTo(x + 2, ty); ctx.lineTo(x + (lab ? 16 : 9), ty); ctx.stroke(); if (lab) ctx.fillText(lab, x + 19, ty); });
      ctx.restore();
    }
  };

  /** 容器中的液体：液面在 level（器壁内侧留 2 px） */
  FL.water = function (ctx, x, y, w, hh, level, kind, o) {
    const r = Math.min(10, w * 0.08), bot = y + hh;
    if (level >= bot - 1) return;
    const L = PS.LIQ[kind] || PS.LIQ.water;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x + 1.5, level); ctx.lineTo(x + 1.5, bot - r); ctx.quadraticCurveTo(x + 1.5, bot - 1.5, x + r, bot - 1.5); ctx.lineTo(x + w - r, bot - 1.5); ctx.quadraticCurveTo(x + w - 1.5, bot - 1.5, x + w - 1.5, bot - r); ctx.lineTo(x + w - 1.5, level); ctx.closePath();
    ctx.fillStyle = L.c; ctx.fill();
    ctx.strokeStyle = L.c2; ctx.lineWidth = (o && o.lw) || 2;
    ctx.beginPath(); ctx.moveTo(x + 1.5, level); ctx.lineTo(x + w - 1.5, level); ctx.stroke();
    ctx.fillStyle = L.top; ctx.globalAlpha = 0.55; ctx.fillRect(x + 1.5, level, w - 3, Math.min(4, bot - level)); ctx.globalAlpha = 1;
    ctx.restore();
  };

  /** 侧视的圆柱体：中心 cx，顶面 top，宽 w，高 hh；o.hook 画挂钩环（默认画）；返回 { hx, hy } 挂点 */
  FL.metal = function (ctx, cx, top, w, hh, mat, o) {
    o = o || {};
    const M = PS.MATL[mat] || PS.MATL.al, e = Math.min(8, w * 0.12);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, M.c2); g.addColorStop(0.35, M.c1); g.addColorStop(0.6, M.c1); g.addColorStop(1, M.c2);
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, top); ctx.lineTo(cx - w / 2, top + hh); ctx.ellipse(cx, top + hh, w / 2, e, 0, Math.PI, 0, true); ctx.lineTo(cx + w / 2, top); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = M.c1; ctx.beginPath(); ctx.ellipse(cx, top, w / 2, e, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (o.label) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = PS.font(o.fs || 13, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.label, cx, top + hh / 2 + 2); }
    let hy = top;
    if (o.hook !== false) {
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(cx, top - 7, 6, 0, TAU); ctx.stroke();
      hy = top - 13;
    }
    ctx.restore();
    return { hx: cx, hy };
  };

  /** 小桶：底面中心 (cx, bottom)，fill 为桶中水的高度比例 */
  FL.bucket = function (ctx, cx, bottom, w, hh, fill, o) {
    o = o || {};
    const top = bottom - hh, wt = w, wb = w * 0.82;
    ctx.save();
    if (fill > 0) {
      const ly = bottom - hh * Math.min(1, fill), k = (bottom - ly) / hh, wl = wb + (wt - wb) * k;
      ctx.fillStyle = (PS.LIQ[o.kind] || PS.LIQ.water).c;
      ctx.beginPath(); ctx.moveTo(cx - wb / 2 + 1, bottom - 1); ctx.lineTo(cx - wl / 2 + 1, ly); ctx.lineTo(cx + wl / 2 - 1, ly); ctx.lineTo(cx + wb / 2 - 1, bottom - 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = (PS.LIQ[o.kind] || PS.LIQ.water).c2; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - wl / 2 + 1, ly); ctx.lineTo(cx + wl / 2 - 1, ly); ctx.stroke();
    }
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(206,212,218,.25)';
    ctx.beginPath(); ctx.moveTo(cx - wt / 2, top); ctx.lineTo(cx - wb / 2, bottom); ctx.lineTo(cx + wb / 2, bottom); ctx.lineTo(cx + wt / 2, top); ctx.fill(); ctx.stroke();
    if (o.handle !== false) { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - wt / 2, top); ctx.quadraticCurveTo(cx, top - hh * 0.75, cx + wt / 2, top); ctx.stroke(); }
    ctx.restore();
    return { hx: cx, hy: top - hh * 0.38 };
  };

  /** 一只手：掌心朝 ang 方向推（手臂在反方向） */
  FL.hand = function (ctx, x, y, ang, o) {
    o = o || {};
    const s = o.s || 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#e8a87c'; ctx.lineWidth = 1.5;
    ctx.fillRect(-80, -12, 66, 24); ctx.strokeRect(-80, -12, 66, 24);
    ctx.beginPath(); ctx.ellipse(-14, 0, 14, 20, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  /** 同一作用点的竖直的力（向下的画在中间，向上的有两个时左右错开） */
  FL.forces = function (ctx, x, y, list, o) {
    o = o || {};
    const k = o.k || 30, F = o.F, ups = list.filter((f) => f.up && f.v > 1e-6);
    list.forEach((f) => {
      if (!(f.v > 1e-6)) return;
      let dx = 0;
      if (f.up && ups.length > 1) dx = (ups.indexOf(f) - (ups.length - 1) / 2) * (o.gap || 22);
      if (!f.up && f.dx) dx = f.dx;
      const lab = f.n + (o.values === false ? '' : ' = ' + PS.fmt(f.v, f.d == null ? (o.d == null ? 1 : o.d) : f.d).replace('-', '−') + ' N');
      PS.force.arrow(ctx, x + dx, y, f.up ? -Math.PI / 2 : Math.PI / 2, Math.max(o.min || 8, f.v * k), { color: f.c, label: lab, F, labelSide: f.side || (dx < 0 ? 1 : -1), width: o.width || 3, head: o.head || 11, dotR: 4 });
    });
  };

  /** 球（半径 R）浸入深度 d 时浸入的体积分数 */
  FL.capFrac = function (d, R) {
    d = PS.clamp(d, 0, 2 * R);
    return (d * d * (3 * R - d)) / (4 * R * R * R);
  };
  /** 水平放置的圆柱（半径 R）浸入深度 d 时浸入的体积分数（弓形面积 / 圆面积） */
  FL.cylFrac = function (d, R) {
    d = PS.clamp(d, 0, 2 * R);
    const th = 2 * Math.acos(1 - d / R);
    return (th - Math.sin(th)) / TAU;
  };

  /**
   * 竖直方向的浮沉运动：b = { y, v }，y 为物体底部在液面下的深度（m，向下为正）
   * o.m 质量 kg，o.sub(y) 浸入的体积 m³，o.rho 液体密度，o.floor 底部能到达的最大深度（容器底），o.c 阻尼系数
   * 返回 { G, Fb, N, Vs }
   */
  FL.step = function (b, dt, o) {
    const g = FL.g, n = Math.max(1, Math.ceil(dt / 0.004)), h1 = dt / n;
    let Fb = 0, N = 0, Vs = 0;
    const G = o.m * g;
    for (let i = 0; i < n; i++) {
      Vs = o.sub(b.y); Fb = o.rho * g * Vs;
      const mEff = o.m + 0.5 * o.rho * Vs;
      const a = (G - Fb) / mEff - (o.c || 3) * b.v - (o.c2 || 0) * b.v * Math.abs(b.v);
      b.v += a * h1; b.y += b.v * h1;
      if (o.floor != null && b.y >= o.floor) { b.y = o.floor; if (b.v > 0) b.v = 0; }
      if (o.ceil != null && b.y <= o.ceil) { b.y = o.ceil; if (b.v < 0) b.v = 0; }
    }
    Vs = o.sub(b.y); Fb = o.rho * g * Vs;
    if (o.floor != null && b.y >= o.floor - 1e-6 && G > Fb) N = G - Fb;
    return { G, Fb, N, Vs };
  };

  /** 漂浮时的浸入深度（二分法）；沉底时返回 null */
  FL.floatDepth = function (m, rho, sub, ymax) {
    if (rho * sub(ymax) < m) return null;
    let a = 0, b = ymax;
    for (let i = 0; i < 50; i++) { const c = (a + b) / 2; if (rho * sub(c) < m) a = c; else b = c; }
    return (a + b) / 2;
  };

  /** three.js 的弹簧测力计：拉环在原点，o.max 量程 N，o.L 满量程刻度长（m）；set(F) 设定拉力，返回挂钩最低点的 y */
  FL.scale3d = function (o) {
    o = o || {};
    const max = o.max || 10, div = o.div || 0.2, L = o.L || 0.2, W = 0.05, T = 0.014;
    const y0 = -0.06, bodyTop = -0.03, bodyBot = y0 - L - 0.025, BH = bodyTop - bodyBot;
    const g = new THREE.Group();
    const c = document.createElement('canvas'); c.width = 160; c.height = Math.round(160 * BH / W);
    const x2 = c.getContext('2d'), k = c.height / BH, Y = (yy) => (bodyTop - yy) * k;
    x2.fillStyle = '#f8f9fa'; x2.fillRect(0, 0, c.width, c.height);
    x2.fillStyle = '#e7ecf3'; x2.fillRect(c.width / 2 - 14, 6, 28, c.height - 12);
    x2.strokeStyle = '#1b2333'; x2.fillStyle = '#1b2333'; x2.font = 'bold 30px sans-serif'; x2.textAlign = 'right'; x2.textBaseline = 'middle';
    const nDiv = Math.round(max / div), per = Math.round(1 / div);
    for (let i = 0; i <= nDiv; i++) {
      const yy = Y(y0 - (i * div / max) * L), big = i % per === 0, half = per % 2 === 0 && i % (per / 2) === 0;
      const tl = big ? 30 : half ? 22 : 14;
      x2.lineWidth = big ? 3 : 1.6;
      x2.beginPath(); x2.moveTo(c.width / 2 - 16, yy); x2.lineTo(c.width / 2 - 16 - tl, yy); x2.moveTo(c.width / 2 + 16, yy); x2.lineTo(c.width / 2 + 16 + tl, yy); x2.stroke();
      if (big) x2.fillText(String(i / per), c.width / 2 - 50, yy);
    }
    x2.textAlign = 'left'; x2.fillText('N', c.width / 2 + 40, Y(y0) - 22);
    const tex = new THREE.CanvasTexture(c);
    const side = new THREE.MeshStandardMaterial({ color: 0xdfe5ee, roughness: 0.6 });
    const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, BH, T), [side, side, side, side, front, side]);
    body.position.y = (bodyTop + bodyBot) / 2; g.add(body);
    const metal = new THREE.MeshStandardMaterial({ color: 0x868e96, metalness: 0.6, roughness: 0.35 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0022, 8, 24), metal); ring.position.y = -0.011; g.add(ring);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.01, 8), metal); neck.position.y = -0.026; g.add(neck);
    const ptr = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.0035, 0.004), new THREE.MeshStandardMaterial({ color: 0xe03131 })); ptr.position.z = T / 2 + 0.002; g.add(ptr);
    const rodLen = L + 0.025 + 0.018;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, rodLen, 8), metal); g.add(rod);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0022, 8, 20, Math.PI * 1.6), metal); hook.rotation.z = Math.PI * 0.9; g.add(hook);
    const api = {
      group: g, body,
      set(F) {
        const py = y0 - (PS.clamp(F, -0.02 * max, max * 1.02) / max) * L;
        ptr.position.y = py;
        rod.position.y = py - rodLen / 2;
        hook.position.y = py - rodLen - 0.007;
        return py - rodLen - 0.014;
      },
    };
    api.set(0);
    return api;
  };

  /* 第10章组件共用的样式（.fc-* 来自 force.js，.pr-* 来自 pressure.js） */
  if (!document.getElementById('fl-style')) document.head.append(h('style', { id: 'fl-style' }, `
    .fl-read{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;margin-top:6px}
    .fl-read .readout{margin:0}
    .fl-eq{font-size:1.02rem;text-align:center;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:6px 10px;margin-top:8px;line-height:1.8}
    .fl-eq b{color:var(--green)}
    .fl-steps{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .fl-steps .btn.done{background:var(--green-soft);border-color:#b2f2bb;color:var(--green)}
  `));
})();
