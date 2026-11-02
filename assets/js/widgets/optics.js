/*
 * 第4章 光现象 · 公共光学库（其他第4章组件都依赖本文件）
 * PS.LIGHT              光线、法线等的配色
 * PS.N_MEDIA            常见介质的折射率与光速
 * PS.opt                几何：向量、反射、折射（斯涅尔定律）、射线与线段 / 圆的交点、角度换算
 * PS.traceGrad          在折射率连续变化的介质中追踪光线（不均匀糖水、海市蜃楼）
 * PS.beam               画一束光（光晕 + 箭头），可画实线、虚线（反向延长线）
 * PS.angleArc           画角度弧并标注度数
 * PS.drawMirror         平面镜（背面画短斜线）
 * PS.drawCandle / PS.drawEye / PS.drawLaser / PS.drawBulb   蜡烛、眼睛、激光笔、灯泡
 * PS.wlColor            波长（nm）对应的颜色
 * （PS.drag 画布拖动、PS.handle 手柄、PS.sortCards 卡片分类练习已移到 core.js）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  PS.LIGHT = {
    ray: '#f76707',        // 白底上的光线（橙红）
    laser: '#ff2b2b',      // 红色激光
    green: '#40c057',      // 绿色激光
    glow: 'rgba(255,120,60,.22)',
    normal: '#868e96',     // 法线（虚线）
    virt: '#f59f00',       // 反向延长线（虚线）
    image: '#7048e8',      // 虚像
    mirror: '#74c0fc',
    dark: '#141c2b',       // 暗室背景
  };

  /* 折射率与光速（c = 3×10⁸ m/s；水中约为 3/4 c，玻璃中约为 2/3 c） */
  PS.N_MEDIA = {
    air: { name: '空气', n: 1.0, v: '3×10⁸ m/s', frac: '≈ c' },
    water: { name: '水', n: 1.33, v: '2.25×10⁸ m/s', frac: '约 3/4 c' },
    glass: { name: '玻璃', n: 1.5, v: '2×10⁸ m/s', frac: '约 2/3 c' },
  };

  /* ---------------- 几何 ---------------- */
  const V = {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
    mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
    dot: (a, b) => a.x * b.x + a.y * b.y,
    cross: (a, b) => a.x * b.y - a.y * b.x,
    len: (a) => Math.hypot(a.x, a.y),
    norm: (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
    dir: (ang) => ({ x: Math.cos(ang), y: Math.sin(ang) }),
    ang: (a) => Math.atan2(a.y, a.x),
    perp: (a) => ({ x: -a.y, y: a.x }),
    dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
  };
  PS.opt = {
    V, DEG,
    /** 反射：d 入射方向，n 法线（单位向量） */
    reflect(d, n) { const k = 2 * V.dot(d, n); return { x: d.x - k * n.x, y: d.y - k * n.y }; },
    /** 折射：d 入射方向（单位），n 法线（单位，任意朝向），n1 → n2；发生全反射时返回 null */
    refract(d, n, n1, n2) {
      let nn = n, c = -V.dot(d, n);
      if (c < 0) { nn = V.mul(n, -1); c = -c; }
      const eta = n1 / n2, k = 1 - eta * eta * (1 - c * c);
      if (k < 0) return null;
      return V.norm(V.add(V.mul(d, eta), V.mul(nn, eta * c - Math.sqrt(k))));
    },
    /** 射线 o + t·d 与线段 ab 的交点：返回 { t, u, p } 或 null */
    raySeg(o, d, a, b) {
      const e = V.sub(b, a), den = V.cross(d, e);
      if (Math.abs(den) < 1e-12) return null;
      const w = V.sub(a, o);
      const t = V.cross(w, e) / den, u = V.cross(w, d) / den;
      if (t <= 1e-6 || u < 0 || u > 1) return null;
      return { t, u, p: V.add(o, V.mul(d, t)) };
    },
    /** 射线与圆的交点（最近的 t > eps） */
    rayCircle(o, d, c, r) {
      const f = V.sub(o, c), b = V.dot(f, d), cc = V.dot(f, f) - r * r, disc = b * b - cc;
      if (disc < 0) return null;
      const s = Math.sqrt(disc);
      const t1 = -b - s, t2 = -b + s;
      const t = t1 > 1e-6 ? t1 : t2 > 1e-6 ? t2 : null;
      return t == null ? null : { t, p: V.add(o, V.mul(d, t)) };
    },
    /** 两直线 p1 + s·d1 与 p2 + t·d2 的交点 */
    lineLine(p1, d1, p2, d2) {
      const den = V.cross(d1, d2);
      if (Math.abs(den) < 1e-12) return null;
      const s = V.cross(V.sub(p2, p1), d2) / den;
      return V.add(p1, V.mul(d1, s));
    },
    /** 点关于直线（过 a、方向 u）的对称点 */
    mirrorPoint(p, a, u) {
      u = V.norm(u);
      const w = V.sub(p, a), k = V.dot(w, u);
      const foot = V.add(a, V.mul(u, k));
      return V.sub(V.mul(foot, 2), p);
    },
    /** 两个方向之间的夹角（度，0~180） */
    angBetween(a, b) { return Math.acos(PS.clamp(V.dot(V.norm(a), V.norm(b)), -1, 1)) / DEG; },
  };

  /**
   * 在折射率连续变化的介质中追踪光线：o 起点，d 方向，n(x,y) 折射率函数。
   * o.ds 步长，o.steps 最多步数，o.stop(p) 返回 true 时停止。返回点列。
   */
  PS.traceGrad = function (o, d, nf, opt) {
    opt = opt || {};
    const ds = opt.ds || 3, steps = opt.steps || 800, e = opt.eps || 0.5;
    let p = { x: o.x, y: o.y }, v = V.norm(d);
    const pts = [p];
    for (let i = 0; i < steps; i++) {
      const n = nf(p.x, p.y);
      const gx = (nf(p.x + e, p.y) - nf(p.x - e, p.y)) / (2 * e), gy = (nf(p.x, p.y + e) - nf(p.x, p.y - e)) / (2 * e);
      const gd = gx * v.x + gy * v.y;
      v = V.norm({ x: v.x + ((gx - gd * v.x) / n) * ds, y: v.y + ((gy - gd * v.y) / n) * ds });
      p = { x: p.x + v.x * ds, y: p.y + v.y * ds };
      pts.push(p);
      if (opt.stop && opt.stop(p, v)) break;
    }
    pts.dir = v;
    return pts;
  };

  /* ---------------- 绘图 ---------------- */
  /**
   * 画一束光：pts 为点列 [{x,y}, ...]。
   * o：color 颜色；width 线宽；glow 光晕（true / 颜色）；arrow 每段画箭头（true / 'end' / false）；
   *    dash 虚线；alpha 透明度；head 箭头大小
   */
  PS.beam = function (ctx, pts, o) {
    o = o || {};
    if (!pts || pts.length < 2) return;
    const c = o.color || PS.LIGHT.ray, w = o.width || 2.4;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); };
    if (o.glow) {
      ctx.strokeStyle = o.glow === true ? hexA(c, 0.22) : o.glow;
      ctx.lineWidth = w * 4.5; path(); ctx.stroke();
    }
    ctx.strokeStyle = c; ctx.lineWidth = w;
    if (o.dash) ctx.setLineDash(o.dash);
    path(); ctx.stroke();
    ctx.setLineDash([]);
    if (o.arrow) {
      const head = o.head || Math.max(9, w * 4);
      const segs = o.arrow === 'end' ? [pts.length - 2] : pts.map((_, i) => i).slice(0, -1);
      ctx.fillStyle = c;
      segs.forEach((i) => {
        const a = pts[i], b = pts[i + 1];
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        if (L < head * 2.2) return;
        const t = o.arrow === 'end' ? 1 : o.at || 0.55;
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const mx = a.x + (b.x - a.x) * t, my = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(ang) * head * 0.55, my + Math.sin(ang) * head * 0.55);
        ctx.lineTo(mx - Math.cos(ang - 0.45) * head * 0.6, my - Math.sin(ang - 0.45) * head * 0.6);
        ctx.lineTo(mx - Math.cos(ang + 0.45) * head * 0.6, my - Math.sin(ang + 0.45) * head * 0.6);
        ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
  };
  function hexA(c, a) {
    if (c.charAt(0) !== '#') return c;
    const n = parseInt(c.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  PS.hexA = hexA;
  // 两种颜色按比例混合（与 heat.js 相同；第4章页面不加载 heat.js）
  if (!PS.mixColor) PS.mixColor = function (c1, c2, t) {
    const p = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const a = p(c1), b = p(c2);
    t = PS.clamp(t, 0, 1);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };

  /** 在 (x, y) 处画一个朝向 ang 的箭头 */
  PS.arrowHead = function (ctx, x, y, ang, size, color) {
    ctx.save();
    ctx.fillStyle = color || PS.LIGHT.ray;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * size * 0.55, y + Math.sin(ang) * size * 0.55);
    ctx.lineTo(x - Math.cos(ang - 0.45) * size * 0.6, y - Math.sin(ang - 0.45) * size * 0.6);
    ctx.lineTo(x - Math.cos(ang + 0.45) * size * 0.6, y - Math.sin(ang + 0.45) * size * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  /** 从 p 沿方向 d 画到 len 长（返回终点） */
  PS.opt.along = (p, d, len) => V.add(p, V.mul(V.norm(d), len));

  /**
   * 角度弧：圆心 (cx, cy)，从方向角 a1 到 a2（弧度，取较小的那一侧），半径 r。
   * o：color，label（文字），fs 字号，lw 线宽，fill 填充色，off 文字离弧的距离
   */
  PS.angleArc = function (ctx, cx, cy, r, a1, a2, o) {
    o = o || {};
    let d = a2 - a1;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    ctx.save();
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a1, a1 + d, d < 0); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = o.color || '#3b5bdb'; ctx.lineWidth = o.lw || 1.8;
    ctx.beginPath(); ctx.arc(cx, cy, r, a1, a1 + d, d < 0); ctx.stroke();
    if (o.label) {
      const am = a1 + d / 2, rr = r + (o.off || (o.fs || 14) * 1.1);
      ctx.font = PS.font(o.fs || 14, 800);
      ctx.fillStyle = o.color || '#3b5bdb';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.label, cx + Math.cos(am) * rr, cy + Math.sin(am) * rr);
    }
    ctx.restore();
  };

  /** 法线（虚线），过点 p，方向 n（单位），两侧各长 len */
  PS.normalLine = function (ctx, p, n, len, o) {
    o = o || {};
    ctx.save();
    ctx.strokeStyle = o.color || PS.LIGHT.normal; ctx.lineWidth = o.lw || 1.6;
    ctx.setLineDash(o.dash || [7, 5]);
    ctx.beginPath();
    ctx.moveTo(p.x - n.x * (o.back != null ? o.back : len), p.y - n.y * (o.back != null ? o.back : len));
    ctx.lineTo(p.x + n.x * len, p.y + n.y * len);
    ctx.stroke();
    ctx.restore();
  };

  /** 直角符号：在 p 处，两个方向 u、v */
  PS.rightAngle = function (ctx, p, u, v, s, color) {
    s = s || 10;
    ctx.save();
    ctx.strokeStyle = color || PS.LIGHT.normal; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(p.x + u.x * s, p.y + u.y * s);
    ctx.lineTo(p.x + u.x * s + v.x * s, p.y + u.y * s + v.y * s);
    ctx.lineTo(p.x + v.x * s, p.y + v.y * s);
    ctx.stroke();
    ctx.restore();
  };

  /**
   * 平面镜：从 a 到 b；o.side = 1 / −1 表示背面（画短斜线）在 a→b 方向的左侧 / 右侧；
   * o.thick 镜面厚度；o.glass 只画玻璃板（不画斜线）
   */
  PS.drawMirror = function (ctx, a, b, o) {
    o = o || {};
    const u = V.norm(V.sub(b, a)), nb = V.mul(V.perp(u), o.side || 1), L = V.dist(a, b);
    const th = o.thick || 5;
    ctx.save();
    if (!o.glass) {
      ctx.strokeStyle = o.hatch || '#6b7487'; ctx.lineWidth = 1.3;
      const step = o.step || 11, hl = o.hl || 10;
      for (let s = step / 2; s < L; s += step) {
        const p = V.add(a, V.mul(u, s));
        ctx.beginPath();
        ctx.moveTo(p.x + nb.x * th * 0.5, p.y + nb.y * th * 0.5);
        ctx.lineTo(p.x + nb.x * (th * 0.5 + hl) - u.x * hl * 0.7, p.y + nb.y * (th * 0.5 + hl) - u.y * hl * 0.7);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = o.color || (o.glass ? 'rgba(116,192,252,.75)' : '#4dabf7');
    ctx.lineWidth = th; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = Math.max(1, th * 0.25);
    ctx.beginPath(); ctx.moveTo(a.x - nb.x * th * 0.2, a.y - nb.y * th * 0.2); ctx.lineTo(b.x - nb.x * th * 0.2, b.y - nb.y * th * 0.2); ctx.stroke();
    ctx.restore();
  };

  /** 蜡烛：x 中心，y 底部，hh 烛身高度，o：w 宽，lit 点燃，t 时间（火焰摇曳），color，ghost 半透明（像） */
  PS.drawCandle = function (ctx, x, y, hh, o) {
    o = o || {};
    const w = o.w || hh * 0.28, top = y - hh;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    const c = o.color || '#f1f3f5';
    g.addColorStop(0, PS.mixColor(c, '#adb5bd', 0.45)); g.addColorStop(0.45, c); g.addColorStop(1, PS.mixColor(c, '#868e96', 0.5));
    ctx.fillStyle = g;
    D.roundRect(ctx, x - w / 2, top, w, hh, Math.min(4, w * 0.15)); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
    // 烛芯
    ctx.strokeStyle = '#343a40'; ctx.lineWidth = Math.max(1.2, w * 0.06);
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top - hh * 0.06 - 2); ctx.stroke();
    let tip = { x, y: top - hh * 0.06 - 2 };
    if (o.lit) {
      const t = o.t || 0, fh = o.fh || Math.max(16, w * 1.25), fw = fh * 0.42;
      const sway = Math.sin(t * 9.3) * 0.08 + Math.sin(t * 5.1) * 0.06;
      const fy = top - 2, fx = x;
      const tipx = fx + sway * fw * 2, tipy = fy - fh * (1 + Math.sin(t * 13) * 0.04);
      const glow = ctx.createRadialGradient(fx, fy - fh * 0.45, 2, fx, fy - fh * 0.45, fh * 1.4);
      glow.addColorStop(0, 'rgba(255,214,102,.45)'); glow.addColorStop(1, 'rgba(255,214,102,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(fx, fy - fh * 0.45, fh * 1.4, 0, TAU); ctx.fill();
      const fg = ctx.createRadialGradient(fx, fy - fh * 0.25, 1, fx, fy - fh * 0.35, fh * 0.75);
      fg.addColorStop(0, '#fff9db'); fg.addColorStop(0.35, '#ffd43b'); fg.addColorStop(0.8, '#ff922b'); fg.addColorStop(1, 'rgba(255,107,0,.6)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(tipx, tipy);
      ctx.bezierCurveTo(fx + fw, fy - fh * 0.55, fx + fw * 0.9, fy, fx, fy);
      ctx.bezierCurveTo(fx - fw * 0.9, fy, fx - fw, fy - fh * 0.55, tipx, tipy);
      ctx.fill();
      ctx.fillStyle = 'rgba(77,171,247,.55)';
      ctx.beginPath(); ctx.ellipse(fx, fy - fh * 0.12, fw * 0.32, fh * 0.14, 0, 0, TAU); ctx.fill();
      tip = { x: tipx, y: tipy };
    }
    ctx.restore();
    return tip;
  };

  /** 眼睛（侧视图）：(x, y) 为瞳孔位置，ang 为视线方向，s 大小 */
  PS.drawEye = function (ctx, x, y, ang, s, o) {
    o = o || {};
    s = s || 22;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = o.bg || '#fff'; ctx.strokeStyle = o.color || '#1b2333'; ctx.lineWidth = Math.max(1.5, s * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.62, -s * 1.25, -s * 0.12);
    ctx.lineTo(-s * 1.25, s * 0.12);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.62, 0, 0);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.iris || '#4c6ef5';
    ctx.beginPath(); ctx.ellipse(-s * 0.3, 0, s * 0.14, s * 0.27, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b2333';
    ctx.beginPath(); ctx.ellipse(-s * 0.24, 0, s * 0.07, s * 0.15, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /** 激光笔：tip 为出光口，ang 为光的方向，o.len 笔长，o.color 光的颜色 */
  PS.drawLaser = function (ctx, x, y, ang, o) {
    o = o || {};
    const L = o.len || 70, w = o.w || 14;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, '#868e96'); g.addColorStop(0.4, '#dee2e6'); g.addColorStop(1, '#495057');
    ctx.fillStyle = g;
    D.roundRect(ctx, -L, -w / 2, L, w, w * 0.35); ctx.fill();
    ctx.fillStyle = '#343a40'; ctx.fillRect(-4, -w * 0.38, 4, w * 0.76);
    ctx.fillStyle = o.on === false ? '#868e96' : (o.color || PS.LIGHT.laser);
    ctx.fillRect(-L * 0.55, -w / 2 - 2, 8, 3);
    ctx.restore();
  };

  /** 灯泡（点光源）：(x, y) 发光中心，r 半径，on 是否点亮 */
  PS.drawBulb = function (ctx, x, y, r, o) {
    o = o || {};
    ctx.save();
    if (o.on !== false) {
      const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * (o.halo || 3.2));
      g.addColorStop(0, 'rgba(255,236,153,.85)'); g.addColorStop(1, 'rgba(255,236,153,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * (o.halo || 3.2), 0, TAU); ctx.fill();
    }
    ctx.fillStyle = o.on === false ? '#e9ecef' : '#fff3bf';
    ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#868e96';
    if (o.base !== false) { ctx.fillRect(x - r * 0.45, y + r * 0.85, r * 0.9, r * 0.6); }
    ctx.strokeStyle = o.on === false ? '#adb5bd' : '#f08c00'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, y + r * 0.3); ctx.lineTo(x - r * 0.15, y - r * 0.2); ctx.lineTo(x + r * 0.05, y + r * 0.1); ctx.lineTo(x + r * 0.35, y - r * 0.25); ctx.stroke();
    ctx.restore();
  };

  /** 波长（nm，380~780）对应的 RGB 颜色 */
  PS.wlColor = function (wl, a) {
    let r = 0, g = 0, b = 0;
    if (wl < 440) { r = -(wl - 440) / 60; b = 1; }
    else if (wl < 490) { g = (wl - 440) / 50; b = 1; }
    else if (wl < 510) { g = 1; b = -(wl - 510) / 20; }
    else if (wl < 580) { r = (wl - 510) / 70; g = 1; }
    else if (wl < 645) { r = 1; g = -(wl - 645) / 65; }
    else { r = 1; }
    let f = 1;
    if (wl < 420) f = 0.3 + (0.7 * (wl - 380)) / 40;
    else if (wl > 700) f = 0.3 + (0.7 * (780 - wl)) / 80;
    const k = (v) => Math.round(255 * Math.pow(PS.clamp(v * f, 0, 1), 0.8));
    return 'rgba(' + k(r) + ',' + k(g) + ',' + k(b) + ',' + (a == null ? 1 : a) + ')';
  };
  /** 七种色光（由红到紫）与代表波长 */
  PS.SPECTRUM7 = [['红', 680], ['橙', 610], ['黄', 580], ['绿', 530], ['蓝', 475], ['靛', 445], ['紫', 410]];

  /* PS.drag、PS.handle、PS.sortCards 已移到 core.js（第6章起各章通用） */

  /** 暗室背景（带一点暗角） */
  PS.darkRoom = function (ctx, VW, VH, c) {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.1, VW / 2, VH / 2, VW * 0.7);
    g.addColorStop(0, c || '#1c2638'); g.addColorStop(1, '#0b111c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  };

  /* 第4章组件共用的样式 */
  if (!document.getElementById('optics-style')) document.head.append(h('style', { id: 'optics-style' }, `
    .opt-q{margin-top:10px;background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font-size:.94rem}
    .opt-q .q-options{margin-top:8px}
    .opt-q .opt-qhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between}
    .opt-view{background:#0d1626;border-radius:10px;overflow:hidden}
    .opt-cap{font-size:.82rem;color:var(--muted);text-align:center;margin:4px 0 0}
    .opt-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.84rem;color:var(--ink-2);margin-top:8px}
    .opt-legend i{display:inline-block;width:22px;height:0;border-top:3px solid;vertical-align:middle;margin-right:5px}
    .opt-legend i.dash{border-top-style:dashed}
  `));
})();
