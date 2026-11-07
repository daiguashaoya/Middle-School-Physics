/*
 * 看得见的物理 · 第15章公共库（电流和电路），第16章起的电学章节也可以使用
 * PS.ELC                     配色：pos 正电荷、neg 负电荷 / 电子、I 电流、wire 导线、glow 灯光、cu 铜
 * PS.el.solve(net)           直流电路求解（节点电压法）。net.els = [{ id, t, a, b, ...参数 }]，a、b 为两端的节点名
 *                            元件 t：bat 电池组（a 为正极，E 电压、r 内阻）、bulb 灯泡（R、Pn 额定功率、open 拧下 / 烧断）、
 *                            sw 开关（on）、wire 导线（open 断了）、amm 电流表（a 为“+”接线柱，range 量程）、vm 电压表、
 *                            res 电阻、led 发光二极管（a 为正极，单向导电）、motor 电动机、bell 电铃
 *                            返回 { V: { 节点: 电势 }, I: { id: 从 a 流向 b 的电流 }, P: { id: 功率 }, out: { 电池 id: 输出电流 }, short: [短路的电池 id] }
 * PS.el.circuit(spec)        固定布局的电路：spec.pos = { 节点: [x, y] }，spec.els 中导线可写 via 拐点；
 *                            返回 { solve(), step(dt), draw(ctx, o), path(e), deg }，draw 画导线、电流（小圆点）、元件符号、连接点
 * PS.el.sym(ctx, t, x1, y1, x2, y2, o)   在两点之间画元件符号（o.lit 灯泡亮度、o.on 开关闭合、o.n 电池节数、o.label、o.F）
 * PS.el.chg(ctx, x, y, 正负, r)        电荷符号（圆圈里的 + 或 −）
 * PS.el.dots(ctx, pts, phase, o)        沿折线画移动的小圆点（o.electron 画成电子）；PS.el.speed(I) 小圆点的速度
 * PS.el.dial(ctx, x, y, w, o)           电流表 / 电压表的表盘（o.v 示数、o.range 量程、o.ranges [小, 大]、o.unit、o.terms 画接线柱、o.sel 选中的接线柱）
 * PS.el.reading(v, range)    按分度值取整的标准读数；PS.el.judge(x, v, range) 判断读数并给出提示
 * PS.el.real                 实物图：battery 电池盒、bulb 灯泡和灯座、sw 单刀开关、wire 导线（返回路径点）、clip 鳄鱼夹
 * PS.el.three(view, o)       three.js 场景的公共部分（与第13章 PS.th.three 相同）
 * 共用样式 .el-msg（.ok / .bad / .info）、.el-pair、.el-chips、.el-read、.el-q、.el-ans、.el-tbl
 * 依赖 core.js（energy.js 中的 PS.en.stage 等由各组件按需使用）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.ELC = { pos: '#e03131', neg: '#1c7ed6', I: '#f08c00', wire: '#1b2333', glow: '#ffd43b', cu: '#c8742c', on: '#2b8a3e', off: '#868e96' };

  const EL = (PS.el = {});
  /* 第15章页面不加载 heat.js，这里补上颜色混合 */
  if (!PS.mixColor) PS.mixColor = function (c1, c2, t) {
    const hx = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : c.match(/[0-9.]+/g).slice(0, 3).map(Number));
    const a = hx(c1), b = hx(c2);
    t = PS.clamp(t, 0, 1);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };
  EL.CELL = { E: 1.5, r: 0.5 };
  const DEF = {
    bat: { E: 3, r: 1 },
    bulb: { R: 10, Pn: 0.75 },
    sw: {},
    wire: { R: 0.004 },
    amm: { R: 0.02, range: 0.6 },
    vm: { R: 1e6, range: 3 },
    res: { R: 10 },
    led: { Vf: 1.8, Ron: 18 },
    motor: { R: 5 },
    bell: { R: 25 },
  };
  EL.param = (e) => Object.assign({}, DEF[e.t] || {}, e);

  function gauss(A, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (p !== c) { const t = A[p]; A[p] = A[c]; A[c] = t; const tb = b[p]; b[p] = b[c]; b[c] = tb; }
      const d = A[c][c];
      if (Math.abs(d) < 1e-300) continue;
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / d;
        if (!f) continue;
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        b[r] -= f * b[c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let s = b[r];
      for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
      x[r] = Math.abs(A[r][r]) < 1e-300 ? 0 : s / A[r][r];
    }
    return x;
  }

  /** 元件的电导 g 与等效电动势 src：从 a 流向 b 的电流 I = g(Va − Vb − src) */
  function cond(p, ledOn) {
    switch (p.t) {
      case 'bat': return [1 / p.r, p.E];
      case 'sw': return [p.on ? 250 : 0, 0];
      case 'wire': return [p.open ? 0 : 1 / p.R, 0];
      case 'bulb': return [p.open ? 0 : 1 / p.R, 0];
      case 'led': return ledOn ? [1 / p.Ron, p.Vf] : [1e-9, 0];
      default: return [p.open ? 0 : 1 / p.R, 0];
    }
  }

  EL.solve = function (net) {
    const els = net.els.map(EL.param), idx = {}, keys = [];
    const node = (k) => { if (!(k in idx)) { idx[k] = keys.length; keys.push(k); } return idx[k]; };
    const b0 = els.find((e) => e.t === 'bat');
    if (b0) node(b0.b);
    els.forEach((e) => { node(e.a); node(e.b); });
    const n = keys.length, ledOn = {};
    let V = new Float64Array(n), gs = [];
    for (let it = 0; it < 14; it++) {
      const G = [], J = new Float64Array(n);
      for (let i = 0; i < n; i++) { G.push(new Float64Array(n)); G[i][i] = 1e-9; }
      gs = els.map((e) => {
        const a = idx[e.a], b = idx[e.b], gc = cond(e, ledOn[e.id]);
        const g = gc[0], src = gc[1];
        if (a !== b && g) {
          G[a][a] += g; G[b][b] += g; G[a][b] -= g; G[b][a] -= g;
          if (src) { J[a] += g * src; J[b] -= g * src; }
        }
        return gc;
      });
      if (n > 1) {
        const A = [], bb = new Float64Array(n - 1);
        for (let i = 1; i < n; i++) { A.push(G[i].slice(1)); bb[i - 1] = J[i]; }
        const x = gauss(A, bb);
        V = new Float64Array(n); for (let i = 1; i < n; i++) V[i] = x[i - 1];
      }
      let changed = false;
      els.forEach((e) => {
        if (e.t !== 'led') return;
        const d = V[idx[e.a]] - V[idx[e.b]];
        if (!ledOn[e.id] && d > e.Vf + 1e-6) { ledOn[e.id] = true; changed = true; }
        else if (ledOn[e.id] && d < e.Vf - 1e-6) { ledOn[e.id] = false; changed = true; }
      });
      if (!changed) break;
    }
    const sol = { V: {}, I: {}, P: {}, out: {}, short: [], keys };
    keys.forEach((k, i) => { sol.V[k] = V[i]; });
    els.forEach((e, i) => {
      const g = gs[i][0], src = gs[i][1], d = V[idx[e.a]] - V[idx[e.b]];
      let I = idx[e.a] === idx[e.b] ? 0 : g * (d - src);
      if (Math.abs(I) < 1e-7) I = 0;
      sol.I[e.id] = I;
      sol.P[e.id] = e.t === 'bat' ? -I * d : e.t === 'led' ? Math.max(0, I) * e.Vf : I * d;
      if (e.t === 'bat') { sol.out[e.id] = -I; if (-I > 0.6 * e.E / e.r) sol.short.push(e.id); }
    });
    return sol;
  };

  /** 用电阻几乎为零的元件（导线、闭合的开关、电流表）把节点分组，返回 find(节点)：同一组的两点之间被导线直接连通 */
  EL.groups = function (net) {
    const par = {};
    const find = (k) => { while (par[k] != null && par[k] !== k) k = par[k]; return k; };
    net.els.forEach((e) => { if (par[e.a] == null) par[e.a] = e.a; if (par[e.b] == null) par[e.b] = e.b; });
    net.els.forEach((e) => {
      if ((e.t === 'wire' && !e.open) || (e.t === 'sw' && e.on) || e.t === 'amm') { const a = find(e.a), b = find(e.b); if (a !== b) par[a] = b; }
    });
    return find;
  };

  /* 元件名称的首字母 → 类型（EL.layout 用） */
  EL.TYPE_OF = { S: 'sw', L: 'bulb', M: 'motor', A: 'amm', R: 'res', D: 'led', B: 'bell', V: 'vm', K: 'sw' };
  const item = (it) => { const o = typeof it === 'string' ? { k: it } : Object.assign({}, it); o.t = o.t || EL.TYPE_OF[o.k[0]]; o.id = o.id || o.k; if (o.label == null) o.label = o.k; return o; };

  /** 沿折线 pts（从节点 n0 走到 n1）放置元件：items = [{ seg 第几段, t 段上的位置 0~1, e 元件 }]，其余部分用导线连起来 */
  EL.route = function (spec, pts, n0, n1, items, Lc) {
    spec._n = spec._n || 0; spec._w = spec._w || 0;
    let cur = n0, via = [];
    items = items.slice().sort((a, b) => a.seg - b.seg || a.t - b.t);
    for (let s = 0; s < pts.length - 1; s++) {
      const p = pts[s], q = pts[s + 1], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
      if (s > 0) via.push(p);
      items.filter((it) => it.seg === s).forEach((it) => {
        const c = [p[0] + ux * L * it.t, p[1] + uy * L * it.t];
        const A = '_n' + ++spec._n, B = '_n' + ++spec._n, l = it.e.len || Lc;
        spec.pos[A] = [c[0] - (ux * l) / 2, c[1] - (uy * l) / 2]; spec.pos[B] = [c[0] + (ux * l) / 2, c[1] + (uy * l) / 2];
        spec.els.push({ id: '_w' + ++spec._w, t: 'wire', a: cur, b: A, via });
        const e = Object.assign({}, it.e);
        if (e.rev) { e.a = B; e.b = A; } else { e.a = A; e.b = B; }
        spec.els.push(e);
        cur = B; via = [];
      });
    }
    spec.els.push({ id: '_w' + ++spec._w, t: 'wire', a: cur, b: n1, via });
  };

  /**
   * 按描述自动排布电路图（电池在下边中间，正极在右）：
   * 串联 { s: ['S', 'L1', 'L2'] }；并联 { t: ['S'] 干路元件（{ k, side: 'R' } 放在电池右边）, b: [['S1', 'L1'], ['L2']] 各条支路（上面一条在前） }
   * 元件可写成 { k: 'S1', on: true, rev: true（反接）, label, seg, t（串联时指定位置） }；o = { x, y, w, h, Lc 元件长度, bat: { n } }
   */
  EL.layout = function (desc, o) {
    o = Object.assign({ x: 40, y: 40, w: 320, h: 220, Lc: 64 }, o || {});
    const spec = { pos: {}, els: [], _n: 0, _w: 0 };
    const x0 = o.x, y0 = o.y, x1 = o.x + o.w, y1 = o.y + o.h, xm = (x0 + x1) / 2, Lc = o.Lc;
    spec.pos.bp = [xm + Lc * 0.45, y1]; spec.pos.bn = [xm - Lc * 0.45, y1];
    spec.els.push(Object.assign({ id: 'E', t: 'bat', n: 2, label: '' }, o.bat || desc.bat || {}, { a: 'bp', b: 'bn' }));
    if (desc.s) {
      const its = desc.s.map(item), n = its.length;
      const pts = [spec.pos.bp, [x1, y1], [x1, y0], [x0, y0], [x0, y1], spec.pos.bn];
      const SL = { 1: [[2, 0.5]], 2: [[2, 0.27], [2, 0.73]], 3: [[1, 0.5], [2, 0.5], [3, 0.5]], 4: [[1, 0.5], [2, 0.3], [2, 0.7], [3, 0.5]], 5: [[1, 0.5], [2, 0.2], [2, 0.5], [2, 0.8], [3, 0.5]] }[n] || [];
      EL.route(spec, pts, 'bp', 'bn', its.map((e, i) => ({ seg: e.seg != null ? e.seg : SL[i][0], t: e.t != null && typeof e.t === 'number' ? e.t : e.pos != null ? e.pos : SL[i][1], e })), Lc);
    } else {
      const tr = (desc.t || []).map(item), br = desc.b.map((b) => b.map(item)), nb = br.length;
      const rows = br.map((_, i) => y0 + (nb === 1 ? 0 : (o.h * (o.rowSpan || 0.6) * i) / (nb - 1)));
      const last = nb - 1;
      rows.forEach((y, i) => { spec.pos['jr' + i] = [x1, y]; spec.pos['jl' + i] = [x0, y]; });
      const R = tr.filter((e) => e.side === 'R'), Lf = tr.filter((e) => e.side !== 'R');
      const spread = (arr) => arr.map((e, i) => (arr.length === 1 ? 0.5 : arr.length === 2 ? [0.3, 0.7][i] : 0.2 + (0.6 * i) / (arr.length - 1)));
      EL.route(spec, [spec.pos.bp, [x1, y1], spec.pos['jr' + last]], 'bp', 'jr' + last, R.map((e, i) => ({ seg: 0, t: spread(R)[i], e })), Lc);
      EL.route(spec, [spec.pos['jl' + last], [x0, y1], spec.pos.bn], 'jl' + last, 'bn', Lf.map((e, i) => ({ seg: 1, t: spread(Lf)[i], e })), Lc);
      for (let i = last; i > 0; i--) {
        spec.els.push({ id: '_w' + ++spec._w, t: 'wire', a: 'jr' + i, b: 'jr' + (i - 1) });
        spec.els.push({ id: '_w' + ++spec._w, t: 'wire', a: 'jl' + (i - 1), b: 'jl' + i });
      }
      br.forEach((b, i) => EL.route(spec, [spec.pos['jr' + i], spec.pos['jl' + i]], 'jr' + i, 'jl' + i, b.map((e, k) => ({ seg: 0, t: spread(b)[k], e })), Lc));
    }
    return spec;
  };

  /** 画一个电荷符号（圆圈里的 + 或 −） */
  EL.chg = function (ctx, x, y, sign, r) {
    ctx.save();
    ctx.fillStyle = sign > 0 ? 'rgba(255,236,236,.95)' : 'rgba(231,245,255,.95)';
    ctx.strokeStyle = sign > 0 ? PS.ELC.pos : PS.ELC.neg; ctx.lineWidth = Math.max(1.2, r * 0.18);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.lineWidth = Math.max(1.6, r * 0.26); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y); ctx.lineTo(x + r * 0.55, y);
    if (sign > 0) { ctx.moveTo(x, y - r * 0.55); ctx.lineTo(x, y + r * 0.55); }
    ctx.stroke();
    ctx.restore();
  };

  /** 小圆点的速度（虚拟像素 / 秒） */
  EL.speed = (I) => 300 * Math.tanh(I / 0.45);

  /** 沿折线 pts 画移动的小圆点：phase 为已走过的路程 */
  EL.dots = function (ctx, pts, phase, o) {
    o = o || {};
    const gap = o.gap || 30, r = o.r || 3.6;
    const segs = [];
    let tot = 0;
    for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(L); tot += L; }
    if (tot < 1) return;
    let s = (((o.electron ? -phase : phase) % gap) + gap) % gap;
    ctx.save();
    ctx.fillStyle = o.color || (o.electron ? PS.ELC.neg : PS.ELC.I);
    let k = 0, acc = 0;
    for (; s < tot; s += gap) {
      while (k < segs.length - 1 && s > acc + segs[k]) { acc += segs[k]; k++; }
      const f = segs[k] ? (s - acc) / segs[k] : 0;
      const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (o.electron && o.sign) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.36; ctx.beginPath(); ctx.moveTo(x - r * 0.5, y); ctx.lineTo(x + r * 0.5, y); ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
  };

  /** 灯光：中心 (x, y)，亮度 b（0~1.5） */
  EL.glow = function (ctx, x, y, r, b) {
    if (b <= 0.01) return;
    const k = Math.min(1.5, b), R = r * (1.4 + k * 1.6);
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, R);
    g.addColorStop(0, 'rgba(255,236,140,' + Math.min(0.95, 0.35 + k * 0.5) + ')');
    g.addColorStop(0.45, 'rgba(255,212,59,' + Math.min(0.55, k * 0.4) + ')');
    g.addColorStop(1, 'rgba(255,212,59,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  };

  /**
   * 在 (x1, y1) → (x2, y2) 之间画元件符号（两端引线 + 符号）
   * o.size 符号半长（默认按长度）、o.lit 灯泡亮度、o.on 开关闭合、o.n 电池节数、o.label 名称、o.ls 名称在哪一侧（±1）、o.F 字号函数、o.color、o.hl 高亮
   */
  EL.sym = function (ctx, t, x1, y1, x2, y2, o) {
    o = o || {};
    const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
    const s = o.size || Math.min(L * 0.34, 36);
    const F = o.F || ((v) => v);
    const col = o.color || '#1b2333';
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = o.lw || 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const ln = (ax, ay, bx, by) => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
    const lead = (w) => { ln(-L / 2, 0, -w, 0); ln(w, 0, L / 2, 0); };
    const circ = (r) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke(); };
    if (o.hl) { ctx.save(); ctx.strokeStyle = o.hl; ctx.globalAlpha = 0.28; ctx.lineWidth = s * 1.3; ln(-s * 0.9, 0, s * 0.9, 0); ctx.restore(); }
    let letter = null;
    const r0 = s * 0.6;
    switch (t) {
      case 'wire': ln(-L / 2, 0, L / 2, 0); break;
      case 'bulb': {
        lead(r0);
        ctx.restore(); EL.glow(ctx, cx, cy, r0, o.lit || 0); ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        ctx.strokeStyle = col; ctx.lineWidth = o.lw || 2.6;
        ctx.fillStyle = o.lit > 0.02 ? 'rgba(255,243,191,.95)' : '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r0, 0, TAU); ctx.fill(); ctx.stroke();
        const q = r0 * 0.707;
        ln(-q, -q, q, q); ln(-q, q, q, -q);
        if (o.open) { ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2; ln(-r0 * 1.1, r0 * 1.1, r0 * 1.1, -r0 * 1.1); }
        break;
      }
      case 'amm': case 'vm': case 'motor': case 'G':
        lead(r0); circ(r0); letter = { amm: 'A', vm: 'V', motor: 'M', G: 'G' }[t]; break;
      case 'bat': case 'cell': {
        const n = o.n || 1, g = s * 0.24, w = (n * 2 - 1) * g;
        lead(w / 2);
        for (let i = 0; i < n; i++) {
          const xp = -w / 2 + i * 2 * g, xn = xp + g;
          ctx.lineWidth = 2.4; ln(xp, -s * 0.62, xp, s * 0.62);
          ctx.lineWidth = 5.5; ctx.lineCap = 'butt'; ln(xn, -s * 0.3, xn, s * 0.3); ctx.lineCap = 'round';
          if (i < n - 1) { ctx.lineWidth = 2.2; ctx.setLineDash(n > 2 ? [3, 3] : []); ln(xn, 0, xn + g, 0); ctx.setLineDash([]); }
        }
        break;
      }
      case 'sw': {
        const w = s * 0.62;
        lead(w);
        ctx.lineWidth = o.lw || 2.6;
        if (o.on) ln(-w, 0, w, 0);
        else { const ang = -0.52; ln(-w, 0, -w + 2 * w * Math.cos(ang), 2 * w * Math.sin(ang)); }
        ctx.fillStyle = '#fff'; ctx.lineWidth = 2;
        [-w, w].forEach((xx) => { ctx.beginPath(); ctx.arc(xx, 0, 4, 0, TAU); ctx.fill(); ctx.stroke(); });
        break;
      }
      case 'res': {
        const w = s * 0.72, hh = s * 0.3;
        lead(w); ctx.fillStyle = '#fff'; ctx.fillRect(-w, -hh, 2 * w, 2 * hh); ctx.strokeRect(-w, -hh, 2 * w, 2 * hh);
        break;
      }
      case 'led': {
        const w = s * 0.42;
        lead(w * 0.8);
        ctx.fillStyle = o.lit > 0.02 ? '#ff6b6b' : '#fff';
        ctx.beginPath(); ctx.moveTo(-w * 0.8, -w); ctx.lineTo(-w * 0.8, w); ctx.lineTo(w * 0.8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ln(w * 0.8, -w, w * 0.8, w);
        ctx.lineWidth = 1.8;
        [[-0.1, 1.05], [0.45, 0.95]].forEach(([dx, dy]) => {
          const bx = dx * w, by = -dy * w, ex = bx + w * 0.55, ey = by - w * 0.55;
          ln(bx, by, ex, ey);
          ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - w * 0.28, ey + w * 0.05); ctx.lineTo(ex - w * 0.05, ey + w * 0.28); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
        });
        if (o.lit > 0.02) { ctx.restore(); EL.glow(ctx, cx, cy, w * 0.6, o.lit * 0.8); ctx.save(); }
        break;
      }
      case 'bell': {
        const w = s * 0.5;
        lead(w);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-w, 0); ctx.arc(0, 0, w, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (o.lit > 0.02) { ctx.lineWidth = 1.8; [1.35, 1.75].forEach((k) => { ctx.beginPath(); ctx.arc(0, 0, w * k, -Math.PI * 0.75, -Math.PI * 0.25); ctx.stroke(); }); }
        break;
      }
      default: ln(-L / 2, 0, L / 2, 0);
    }
    ctx.restore();
    if (letter) D.text(ctx, letter, cx, cy + 1, { size: Math.max(F(13), s * 0.62), weight: 800, align: 'center', baseline: 'middle', color: col });
    if (o.label) {
      const side = o.ls || 1, nx = Math.sin(a) * side, ny = -Math.cos(a) * side;
      const fs = o.fs || F(14), off = s * 0.75 + fs * 0.8;
      D.text(ctx, o.label, cx + nx * off, cy + ny * off, { size: fs, weight: 800, align: 'center', baseline: 'middle', color: o.lc || col });
    }
  };

  /** 导线的连接点 */
  EL.dot = function (ctx, x, y, r, c) { ctx.fillStyle = c || '#1b2333'; ctx.beginPath(); ctx.arc(x, y, r || 5, 0, TAU); ctx.fill(); };

  /**
   * 固定布局的电路。spec.pos = { 节点: [x, y] }，spec.els = [{ id, t, a, b, via, label, ls, n, ... }]
   */
  EL.circuit = function (spec) {
    const C = { spec, ph: {}, sol: null, deg: {} };
    C.path = (e) => [spec.pos[e.a]].concat(e.via || [], [spec.pos[e.b]]);
    C.solve = () => {
      C.sol = EL.solve(spec);
      C.deg = {};
      spec.els.forEach((e) => { C.deg[e.a] = (C.deg[e.a] || 0) + 1; C.deg[e.b] = (C.deg[e.b] || 0) + 1; });
      return C.sol;
    };
    C.el = (id) => spec.els.find((e) => e.id === id);
    C.I = (id) => (C.sol ? C.sol.I[id] || 0 : 0);
    C.lit = (id) => { const e = EL.param(C.el(id)); return C.sol ? Math.max(0, (C.sol.P[id] || 0) / (e.Pn || 0.75)) : 0; };
    C.step = (dt) => { if (!C.sol) return; spec.els.forEach((e) => { C.ph[e.id] = (C.ph[e.id] || 0) + EL.speed(C.sol.I[e.id] || 0) * dt; }); };
    /** o.F 字号函数、o.dots 画电流、o.electron 画电子、o.lw 线宽、o.size 符号大小、o.hl { id: 颜色 }、o.skip { id: true } 不画符号、o.wire 导线颜色 */
    C.draw = function (ctx, o) {
      o = o || {};
      const lw = o.lw || 2.6;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      spec.els.forEach((e) => {
        const pts = C.path(e);
        const hot = C.sol && C.sol.short.length && Math.abs(C.sol.I[e.id] || 0) > 1;
        ctx.strokeStyle = hot ? '#e03131' : e.hlw || o.wire || '#1b2333'; ctx.lineWidth = hot ? lw + 1.5 : lw;
        if (e.t === 'wire' && e.open) {
          ctx.setLineDash([]);
          const m = Math.floor((pts.length - 1) / 2), p = pts[m], q = pts[m + 1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
          const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L, gp = 9;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= m; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.lineTo(mx - ux * gp, my - uy * gp); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(mx + ux * gp, my + uy * gp); for (let i = m + 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
          return;
        }
        if (e.t !== 'wire' && !(e.via && e.via.length)) return;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      });
      if (o.dots && C.sol) spec.els.forEach((e) => { if (Math.abs(C.sol.I[e.id] || 0) > 1e-4) EL.dots(ctx, C.path(e), C.ph[e.id] || 0, { electron: o.electron, gap: o.gap, r: o.r, sign: o.sign }); });
      spec.els.forEach((e) => {
        if (e.t === 'wire' || (o.skip && o.skip[e.id])) return;
        const pa = spec.pos[e.a], pb = spec.pos[e.b];
        let p1 = pa, p2 = pb;
        if (e.via && e.via.length) { p1 = e.via[e.via.length - 1]; }
        EL.sym(ctx, e.t, p1[0], p1[1], p2[0], p2[1], { F: o.F, size: e.size || o.size, n: e.n, on: e.on, open: e.open, lit: e.t === 'bulb' || e.t === 'led' || e.t === 'bell' ? C.lit(e.id) * (e.t === 'led' ? 30 : 1) : 0, label: o.labels === false ? null : e.label, ls: e.ls, hl: o.hl && o.hl[e.id], lw: lw });
      });
      Object.keys(C.deg).forEach((k) => { if (C.deg[k] >= 3 && spec.pos[k] && !(o.noDots && o.noDots[k])) EL.dot(ctx, spec.pos[k][0], spec.pos[k][1], o.jr || 5); });
      ctx.restore();
    };
    return C;
  };

  /**
   * 电流表 / 电压表的表盘：(x, y) 为表盘中心，w 为宽度
   * o.v 示数（可以为负、超量程），o.range 当前量程，o.ranges [小量程, 大量程]（默认 [0.6, 3]），o.unit 'A'，o.terms 画接线柱，o.sel 选中的接线柱（'-', '0.6', '3'）
   * o.zero 指针偏离零刻度的格数（未调零），o.F 字号函数。返回 { terms: [{ k, x, y }], box }
   */
  EL.dial = function (ctx, x, y, w, o) {
    o = o || {};
    const F = o.F || ((v) => v);
    const rg = o.ranges || [0.6, 3], unit = o.unit || 'A';
    const hh = w * 0.74, x0 = x - w / 2, y0 = y - hh / 2;
    ctx.save();
    ctx.fillStyle = o.body || '#343a40'; D.roundRect(ctx, x0 - w * 0.04, y0 - w * 0.04, w * 1.08, hh + w * (o.terms ? 0.3 : 0.08), w * 0.06); ctx.fill();
    ctx.fillStyle = '#fdfcf7'; D.roundRect(ctx, x0, y0, w, hh, w * 0.04); ctx.fill();
    const px = x, py = y0 + hh * 0.9, R = w * 0.43;
    const A0 = -Math.PI / 2 - 0.82, A1 = -Math.PI / 2 + 0.82;
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = Math.max(1, w * 0.006);
    ctx.beginPath(); ctx.arc(px, py, R, A0, A1); ctx.stroke();
    for (let i = 0; i <= 30; i++) {
      const an = A0 + ((A1 - A0) * i) / 30, L = i % 10 === 0 ? w * 0.07 : i % 5 === 0 ? w * 0.05 : w * 0.032;
      ctx.lineWidth = i % 5 === 0 ? Math.max(1.2, w * 0.007) : Math.max(0.8, w * 0.004);
      ctx.beginPath(); ctx.moveTo(px + Math.cos(an) * R, py + Math.sin(an) * R); ctx.lineTo(px + Math.cos(an) * (R + L), py + Math.sin(an) * (R + L)); ctx.stroke();
    }
    const fsB = Math.max(F(11), w * 0.075), fsS = Math.max(F(10), w * 0.062);
    for (let i = 0; i <= 3; i++) {
      const an = A0 + ((A1 - A0) * i) / 3;
      D.text(ctx, String(PS.round((rg[1] * i) / 3, 3)), px + Math.cos(an) * (R + w * 0.12), py + Math.sin(an) * (R + w * 0.12), { size: fsB, weight: 700, align: 'center', baseline: 'middle', color: '#1b2333' });
      D.text(ctx, String(PS.round((rg[0] * i) / 3, 3)), px + Math.cos(an) * (R - w * 0.075), py + Math.sin(an) * (R - w * 0.075), { size: fsS, weight: 700, align: 'center', baseline: 'middle', color: '#1b2333' });
    }
    D.text(ctx, unit, px, py - R * 0.42, { size: Math.max(F(13), w * 0.11), weight: 800, align: 'center', baseline: 'middle', color: '#1b2333' });
    const range = o.range || rg[0];
    let f = o.v == null ? 0 : o.v / range;
    f += (o.zero || 0) / 30;
    f = PS.clamp(f, -0.08, 1.07);
    const an = A0 + (A1 - A0) * f;
    ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = Math.max(1.6, w * 0.011);
    ctx.beginPath(); ctx.moveTo(px - Math.cos(an) * w * 0.05, py - Math.sin(an) * w * 0.05); ctx.lineTo(px + Math.cos(an) * (R + w * 0.05), py + Math.sin(an) * (R + w * 0.05)); ctx.stroke();
    ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(px, py, w * 0.03, 0, TAU); ctx.fill();
    const terms = [];
    if (o.terms) {
      const ty = y0 + hh + w * 0.13, ks = ['-', String(rg[0]), String(rg[1])];
      ks.forEach((k, i) => {
        const tx = x - w * 0.3 + i * w * 0.3, sel = o.sel && o.sel.indexOf(k) >= 0;
        ctx.fillStyle = i === 0 ? '#212529' : '#c92a2a';
        if (sel) { ctx.save(); ctx.fillStyle = 'rgba(255,212,59,.75)'; ctx.beginPath(); ctx.arc(tx, ty, w * 0.075, 0, TAU); ctx.fill(); ctx.restore(); }
        ctx.beginPath(); ctx.arc(tx, ty, w * 0.045, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(tx, ty, w * 0.018, 0, TAU); ctx.fill();
        D.text(ctx, k === '-' ? '−' : k, tx + w * 0.072, ty - w * 0.06, { size: Math.max(F(10), w * 0.06), weight: 800, align: 'left', baseline: 'middle', color: '#f8f9fa' });
        terms.push({ k, x: tx, y: ty });
      });
    }
    ctx.restore();
    return { terms, box: [x0, y0, w, hh] };
  };

  /** 按分度值取整的标准读数 */
  EL.reading = (v, range) => { const d = range / 30; return PS.round(Math.round(v / d) * d, 4); };
  /** 判断读数 x（v 为真实值，range 为量程）：返回 { ok, hint } */
  EL.judge = function (x, v, range, unit) {
    const d = range / 30, ans = EL.reading(v, range), u = unit || 'A';
    if (isNaN(x)) return { ok: false, hint: '请输入一个数。' };
    if (Math.abs(x - ans) < d * 0.3) return { ok: true, hint: '✔ 读数正确：' + PS.fmt(ans, d < 0.05 ? 2 : 1) + ' ' + u + '。' };
    const other = range === 3 || range === 15 ? range / 5 : range * 5;
    if (Math.abs(x - EL.reading(v * (other / range), other)) < (other / 30) * 0.3 || Math.abs(x - ans * (other / range)) < (other / 30) * 0.3) return { ok: false, hint: '看错了量程！现在接的是 0~' + range + ' ' + u + ' 量程，应该读' + (range < other ? '下' : '上') + '面一排刻度，每小格表示 ' + PS.round(d, 3) + ' ' + u + '。' };
    if (Math.abs(Math.abs(x - ans) - d) < d * 0.3) return { ok: false, hint: '差了一小格。这个量程每小格表示 ' + PS.round(d, 3) + ' ' + u + '，再数一数指针过了几小格。' };
    return { ok: false, hint: '不对。先看量程（每小格表示 ' + PS.round(d, 3) + ' ' + u + '），再数指针偏过了几大格、几小格。' };
  };

  /* ================= 实物图 ================= */
  const REAL = (EL.real = {});
  /** 电池盒（水平放置），中心 (x, y)，宽 w；o.n 节数；返回 { pos, neg } 两个接线柱（正极在 o.flip ? 左 : 右） */
  REAL.battery = function (ctx, x, y, w, o) {
    o = o || {};
    const n = o.n || 2, hh = w * (n > 2 ? 0.34 : 0.4), x0 = x - w / 2, y0 = y - hh / 2;
    ctx.save();
    ctx.fillStyle = '#2b2f36'; D.roundRect(ctx, x0, y0, w, hh, hh * 0.18); ctx.fill();
    const cw = (w * 0.86) / n, ch = hh * 0.62;
    for (let i = 0; i < n; i++) {
      const cx0 = x0 + w * 0.07 + i * cw;
      const g = ctx.createLinearGradient(0, y - ch / 2, 0, y + ch / 2);
      g.addColorStop(0, '#ffd8a8'); g.addColorStop(0.45, '#f08c00'); g.addColorStop(1, '#a35a00');
      ctx.fillStyle = g; D.roundRect(ctx, cx0 + 2, y - ch / 2, cw - 8, ch, ch * 0.18); ctx.fill();
      ctx.fillStyle = '#ced4da';
      const tipX = o.flip ? cx0 - 2 : cx0 + cw - 6;
      ctx.fillRect(tipX, y - ch * 0.16, 5, ch * 0.32);
      D.text(ctx, '1.5V', cx0 + cw / 2 - 2, y + 1, { size: Math.max(9, ch * 0.32), weight: 800, align: 'center', baseline: 'middle', color: '#3d2600' });
    }
    const tp = [x0 + w + hh * 0.08, y], tn = [x0 - hh * 0.08, y];
    const pos = o.flip ? tn : tp, neg = o.flip ? tp : tn;
    [[pos, '#e03131', '+'], [neg, '#212529', '−']].forEach(([p, c, s]) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p[0], p[1], hh * 0.17, 0, TAU); ctx.fill();
      ctx.fillStyle = '#dee2e6'; ctx.beginPath(); ctx.arc(p[0], p[1], hh * 0.07, 0, TAU); ctx.fill();
      D.text(ctx, s, p[0], p[1] - hh * 0.36, { size: Math.max(11, hh * 0.32), weight: 900, align: 'center', baseline: 'middle', color: c });
    });
    if (o.hot) { ctx.fillStyle = 'rgba(240,62,62,' + (0.25 + 0.2 * Math.sin(performance.now() / 120)) + ')'; D.roundRect(ctx, x0, y0, w, hh, hh * 0.18); ctx.fill(); }
    ctx.restore();
    return { pos, neg };
  };

  /** 小灯泡和灯座：灯座中心 (x, y)，大小 s（灯座宽）；返回 { t1, t2 } 两个接线柱 */
  REAL.bulb = function (ctx, x, y, s, lit, o) {
    o = o || {};
    ctx.save();
    const bw = s, bh = s * 0.32;
    ctx.fillStyle = '#1c7ed6'; D.roundRect(ctx, x - bw / 2, y - bh / 2, bw, bh, bh * 0.25); ctx.fill();
    ctx.fillStyle = '#1864ab'; ctx.fillRect(x - bw / 2, y + bh * 0.1, bw, bh * 0.4);
    const t1 = [x - bw * 0.36, y], t2 = [x + bw * 0.36, y];
    [t1, t2].forEach((p) => { ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.24, 0, TAU); ctx.fill(); ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.09, 0, TAU); ctx.fill(); });
    if (!o.removed) {
      const gy = y - bh * 0.5 - s * 0.36, gr = s * 0.27;
      ctx.fillStyle = '#ced4da'; ctx.fillRect(x - s * 0.13, y - bh * 0.5 - s * 0.14, s * 0.26, s * 0.14);
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { const yy = y - bh * 0.5 - s * 0.035 * i; ctx.beginPath(); ctx.moveTo(x - s * 0.13, yy); ctx.lineTo(x + s * 0.13, yy); ctx.stroke(); }
      EL.glow(ctx, x, gy, gr * 0.9, lit);
      ctx.fillStyle = lit > 0.03 ? 'rgba(255,249,219,.92)' : 'rgba(231,245,255,.75)';
      ctx.strokeStyle = '#91a7ff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, gy, gr, 0.3 * Math.PI + Math.PI, -0.3 * Math.PI + TAU + Math.PI); ctx.lineTo(x + s * 0.13, y - bh * 0.5 - s * 0.14); ctx.lineTo(x - s * 0.13, y - bh * 0.5 - s * 0.14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = lit > 0.03 ? '#f08c00' : '#495057'; ctx.lineWidth = lit > 0.03 ? 2.2 : 1.3;
      ctx.beginPath(); ctx.moveTo(x - s * 0.07, y - bh * 0.5 - s * 0.14); ctx.lineTo(x - s * 0.08, gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + s * 0.07, y - bh * 0.5 - s * 0.14); ctx.lineTo(x + s * 0.08, gy); ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const xx = x - s * 0.08 + (s * 0.16 * i) / 8, yy = gy + (i % 2 ? -s * 0.03 : s * 0.03) * 0.6; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      if (o.broken) { ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, gy - 6); ctx.lineTo(x + 4, gy + 6); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.arc(x, y - bh * 0.5, s * 0.12, Math.PI, TAU); ctx.fill();
    }
    if (o.label) D.text(ctx, o.label, x, y + bh * 0.5 + (o.fs || 13) * 0.95, { size: o.fs || 13, weight: 800, align: 'center', baseline: 'middle', color: '#1b2333' });
    ctx.restore();
    return { t1, t2 };
  };

  /** 单刀开关：底座中心 (x, y)，宽 s；on 闭合；返回 { t1, t2, hit: [x, y, r] } */
  REAL.sw = function (ctx, x, y, s, on, o) {
    o = o || {};
    ctx.save();
    const bh = s * 0.3;
    ctx.fillStyle = '#e9dcc6'; D.roundRect(ctx, x - s / 2, y - bh / 2, s, bh, bh * 0.25); ctx.fill();
    ctx.strokeStyle = '#c5b395'; ctx.lineWidth = 1; ctx.stroke();
    const t1 = [x - s * 0.36, y], t2 = [x + s * 0.36, y];
    [t1, t2].forEach((p) => { ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.22, 0, TAU); ctx.fill(); ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.08, 0, TAU); ctx.fill(); });
    const hx = x - s * 0.2, cx2 = x + s * 0.22;
    ctx.fillStyle = '#868e96'; ctx.fillRect(hx - 3, y - bh * 0.42, 6, bh * 0.42); ctx.fillRect(cx2 - 5, y - bh * 0.5, 10, bh * 0.5);
    const ang = on ? 0 : -0.62, L = s * 0.5;
    const ex = hx + Math.cos(ang) * L, ey = y - bh * 0.4 + Math.sin(ang) * L;
    ctx.strokeStyle = '#ced4da'; ctx.lineWidth = Math.max(3, s * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, y - bh * 0.4); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(ex + Math.cos(ang) * s * 0.06, ey + Math.sin(ang) * s * 0.06, s * 0.065, 0, TAU); ctx.fill();
    if (o.label) D.text(ctx, o.label, x, y + bh * 0.5 + (o.fs || 13) * 0.95, { size: o.fs || 13, weight: 800, align: 'center', baseline: 'middle', color: '#1b2333' });
    ctx.restore();
    return { t1, t2, hit: [x, y - bh * 0.3, s * 0.45] };
  };

  /** 小电动机：底座中心 (x, y)，大小 s；spin 转角（转动时传入不断增大的角度）；返回 { t1, t2 } */
  REAL.motor = function (ctx, x, y, s, spin, o) {
    o = o || {};
    ctx.save();
    const bh = s * 0.3;
    ctx.fillStyle = '#e9dcc6'; D.roundRect(ctx, x - s / 2, y - bh / 2, s, bh, bh * 0.25); ctx.fill();
    const t1 = [x - s * 0.36, y], t2 = [x + s * 0.36, y];
    [t1, t2].forEach((p) => { ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.22, 0, TAU); ctx.fill(); ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.08, 0, TAU); ctx.fill(); });
    const by = y - bh * 0.5 - s * 0.2;
    const g = ctx.createLinearGradient(0, by - s * 0.18, 0, by + s * 0.18); g.addColorStop(0, '#dee2e6'); g.addColorStop(0.5, '#868e96'); g.addColorStop(1, '#495057');
    ctx.fillStyle = g; D.roundRect(ctx, x - s * 0.28, by - s * 0.18, s * 0.5, s * 0.36, s * 0.06); ctx.fill();
    ctx.fillStyle = '#c92a2a'; ctx.fillRect(x - s * 0.06, by - s * 0.18, s * 0.06, s * 0.36);
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + s * 0.22, by); ctx.lineTo(x + s * 0.34, by); ctx.stroke();
    ctx.save(); ctx.translate(x + s * 0.36, by);
    for (let i = 0; i < 3; i++) { const a = spin + (i * TAU) / 3; ctx.fillStyle = 'rgba(77,171,247,.85)'; ctx.beginPath(); ctx.ellipse(0, Math.sin(a) * s * 0.13, s * 0.03, s * 0.13 * Math.abs(Math.cos(a)) + 2, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (o.label) D.text(ctx, o.label, x, y + bh * 0.5 + (o.fs || 13) * 0.95, { size: o.fs || 13, weight: 800, align: 'center', baseline: 'middle', color: '#1b2333' });
    ctx.restore();
    return { t1, t2 };
  };

  /** 蜂鸣器：底座中心 (x, y)，大小 s；on 在响（画声波，t 为时间）；返回 { t1, t2 } */
  REAL.buzzer = function (ctx, x, y, s, on, t, o) {
    o = o || {};
    ctx.save();
    const bh = s * 0.3;
    ctx.fillStyle = '#e9dcc6'; D.roundRect(ctx, x - s / 2, y - bh / 2, s, bh, bh * 0.25); ctx.fill();
    const t1 = [x - s * 0.36, y], t2 = [x + s * 0.36, y];
    [t1, t2].forEach((p) => { ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.22, 0, TAU); ctx.fill(); ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(p[0], p[1], bh * 0.08, 0, TAU); ctx.fill(); });
    const by = y - bh * 0.5 - s * 0.14;
    ctx.fillStyle = '#212529'; ctx.fillRect(x - s * 0.2, by - s * 0.12, s * 0.4, s * 0.26);
    ctx.beginPath(); ctx.ellipse(x, by - s * 0.12, s * 0.2, s * 0.06, 0, 0, TAU); ctx.fillStyle = '#343a40'; ctx.fill();
    ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.arc(x, by - s * 0.12, s * 0.03, 0, TAU); ctx.fill();
    if (on) { ctx.strokeStyle = 'rgba(240,140,0,.8)'; ctx.lineWidth = 2.5; for (let i = 0; i < 3; i++) { const r = s * (0.28 + i * 0.1) + ((t * 60) % (s * 0.1)); ctx.beginPath(); ctx.arc(x, by - s * 0.1, r, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke(); } }
    if (o.label) D.text(ctx, o.label, x, y + bh * 0.5 + (o.fs || 13) * 0.95, { size: o.fs || 13, weight: 800, align: 'center', baseline: 'middle', color: '#1b2333' });
    ctx.restore();
    return { t1, t2 };
  };

  /** 发光二极管（LED）：灯头中心 (x, y)，大小 s；flip 时长脚（正极）在右；返回 { a 正极（长脚）, k 负极（短脚） } */
  REAL.led = function (ctx, x, y, s, lit, flip) {
    ctx.save();
    const sg = flip ? 1 : -1, la = [x + sg * s * 0.12, y + s * 0.95], lk = [x - sg * s * 0.12, y + s * 0.7];
    ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + sg * s * 0.12, y + s * 0.2); ctx.lineTo(la[0], la[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - sg * s * 0.12, y + s * 0.2); ctx.lineTo(lk[0], lk[1]); ctx.stroke();
    if (lit > 0.02) EL.glow(ctx, x, y - s * 0.1, s * 0.3, Math.min(1.3, lit));
    ctx.fillStyle = lit > 0.02 ? '#ff6b6b' : 'rgba(250,82,82,.55)';
    ctx.beginPath(); ctx.moveTo(x - s * 0.22, y + s * 0.22); ctx.lineTo(x - s * 0.22, y - s * 0.1); ctx.arc(x, y - s * 0.1, s * 0.22, Math.PI, 0); ctx.lineTo(x + s * 0.22, y + s * 0.22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(201,42,42,.8)'; ctx.fillRect(x - s * 0.27, y + s * 0.17, s * 0.54, s * 0.07);
    ctx.restore();
    return { a: la, k: lk };
  };

  /** 鳄鱼夹（导线的末端）：p 为夹口位置，ang 为导线来的方向 */
  REAL.clip = function (ctx, x, y, ang, s, c) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = c || '#e03131'; D.roundRect(ctx, -s * 1.6, -s * 0.36, s * 1.2, s * 0.72, s * 0.2); ctx.fill();
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath(); ctx.moveTo(-s * 0.45, -s * 0.32); ctx.lineTo(s * 0.3, -s * 0.08); ctx.lineTo(s * 0.3, 0); ctx.lineTo(-s * 0.45, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.32); ctx.lineTo(s * 0.3, s * 0.08); ctx.lineTo(s * 0.3, 0); ctx.lineTo(-s * 0.45, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  /** 导线（三次贝塞尔曲线）：从 p1 到 p2，o.c1 / o.c2 控制点（默认向下垂），o.color；返回采样点（画电流用） */
  REAL.wire = function (ctx, p1, p2, o) {
    o = o || {};
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy);
    const sag = o.sag == null ? Math.min(60, L * 0.25) : o.sag;
    const c1 = o.c1 || [p1[0] + dx * 0.25, p1[1] + dy * 0.25 + sag], c2 = o.c2 || [p1[0] + dx * 0.75, p1[1] + dy * 0.75 + sag];
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, u = 1 - t;
      pts.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
    if (ctx) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = (o.w || 5) + 2;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 1.5) : ctx.moveTo(p[0], p[1] + 1.5))); ctx.stroke();
      ctx.strokeStyle = o.hot ? '#ff6b6b' : o.color || '#e03131'; ctx.lineWidth = o.w || 5;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.restore();
    }
    return pts;
  };

  /**
   * three.js 场景的公共部分（与第13章 PS.th.three 相同）：EL.three(view, { cam, target, bg, fov, min, max })
   * 返回 { renderer, scene, camera, controls, Std(颜色, 参数), tex(w, h, fn), label(文字, 类名), place(标签, Vector3), render(dt), fly(cam, target) }
   */
  EL.three = function (view, o) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(o.bg == null ? 0xeef2f7 : o.bg);
    const camera = new THREE.PerspectiveCamera(o.fov || 40, 16 / 10, 0.01, 30);
    camera.position.set(o.cam[0], o.cam[1], o.cam[2]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(o.target[0], o.target[1], o.target[2]);
    controls.enableDamping = true; controls.minDistance = o.min || 0.15; controls.maxDistance = o.max || 3; controls.maxPolarAngle = Math.PI * 0.56;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.65); dl.position.set(0.5, 2, 1.4); scene.add(dl);
    const v3 = new THREE.Vector3();
    const fly = { cam: null, tgt: null };
    const api = {
      renderer, scene, camera, controls,
      Std: (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {})),
      tex(w, hh, fn) { const c = document.createElement('canvas'); c.width = w; c.height = hh; fn(c.getContext('2d'), w, hh); return new THREE.CanvasTexture(c); },
      label(t, cls) { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; },
      place(e, p) {
        v3.copy(p).project(camera);
        if (v3.z > 1 || e.dataset.hide) { e.style.display = 'none'; return; }
        e.style.display = '';
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-50%)';
      },
      fly(cam, tgt) { fly.cam = new THREE.Vector3(cam[0], cam[1], cam[2]); fly.tgt = new THREE.Vector3(tgt[0], tgt[1], tgt[2]); },
      render(dt) {
        if (fly.cam) {
          const k = Math.min(1, (dt || 0.016) * 4);
          camera.position.lerp(fly.cam, k); controls.target.lerp(fly.tgt, k);
          if (camera.position.distanceTo(fly.cam) < 0.002) fly.cam = null;
        }
        controls.update(); renderer.render(scene, camera);
      },
    };
    controls.addEventListener('start', () => { fly.cam = null; });
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    return api;
  };

  /* 第15章组件共用的样式 */
  if (!document.getElementById('el-style')) document.head.append(h('style', { id: 'el-style' }, `
    .el-msg{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.92rem;min-height:2.6em}
    .el-msg.ok{background:var(--green-soft);border-color:#b2f2bb}
    .el-msg.bad{background:var(--red-soft);border-color:#ffc9c9}
    .el-msg.info{background:var(--primary-soft);border-color:#bac8ff}
    .el-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:14px;align-items:start}
    .el-pair > div{min-width:0}
    .el-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .el-chips .btn.on{background:var(--primary);color:#fff;border-color:var(--primary)}
    .el-read{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px;margin-top:6px}
    .el-read .readout{margin:0}
    .el-q{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-top:10px;font-size:.94rem}
    .el-q .q-options{margin-top:8px}
    .el-ans{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .el-ans input{width:110px}
    .el-tbl{width:100%;border-collapse:collapse;font-size:.88rem;margin-top:6px;background:#fff}
    .el-tbl th,.el-tbl td{border:1px solid var(--line);padding:4px 6px;text-align:center}
    .el-tbl th{background:var(--surface-2)}
    .cb-sel{font:inherit;padding:4px 8px;border-radius:8px;border:1px solid var(--line-2);background:#fff}
    .el-pos{color:#e03131;font-weight:800}.el-neg{color:#1c7ed6;font-weight:800}.el-I{color:#e8590c;font-weight:800}
    @media (max-width:680px){.el-pair{grid-template-columns:minmax(0,1fr)}}
  `));
})();
