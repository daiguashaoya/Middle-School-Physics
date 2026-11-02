/*
 * 第5章 透镜及其应用 · 公共透镜库（依赖 optics.js；其他第5章组件都依赖本文件）
 * PS.lens.image(u, f)          理想薄透镜成像：像距、放大率、虚实
 * PS.lens.through(p, d, L)     光线通过理想薄透镜后的方向（凹透镜 f < 0）
 * PS.lens.surfaces(kind, ...)  六种透镜截面（双凸、平凸、凸凹、双凹、平凹、凹凸）的两个球面
 * PS.lens.traceReal(...)       按斯涅尔定律追踪光线通过真实透镜的两个球面
 * PS.lens.drawShape / draw     画透镜截面 / 光路图中的透镜
 * PS.lens.axis                 主光轴（标出 O、F、2F）
 * PS.lens.arrowObj             物体、像（箭头；虚像画虚线）
 * PS.lens.screen               光屏
 * PS.lens.blur                 把一段绘制按“圆盘”模糊（离焦的像），不依赖 ctx.filter
 * PS.lens.quiz                 选择题小卡片（随机出题用）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const TAU = Math.PI * 2;

  const GLASS = { fill: 'rgba(165,216,255,.5)', stroke: '#339af0', edge: 'rgba(255,255,255,.7)' };

  /* ---------------- 理想薄透镜 ---------------- */
  /** u 物距（> 0），f 焦距（凹透镜为负）：v 像距（> 0 实像在异侧，< 0 虚像在同侧），m 放大率（> 0 正立） */
  function image(u, f) {
    if (Math.abs(u - f) < 1e-9) return { v: Infinity, m: Infinity, inf: true, real: false };
    const v = (u * f) / (u - f);
    return { v, m: -v / u, real: v > 0, inf: false };
  }

  /**
   * 光线 p + t·d 通过理想薄透镜 L = { x, y, f, H }（透镜在 x = L.x，主光轴 y = L.y，半高 H）。
   * 返回 { q 入射点, d 出射方向 }，没有射到透镜上时返回 null。
   * 做法：与入射光平行、过光心的光线和焦平面的交点 P，出射光线（或其反向延长线）过 P。
   */
  function through(p, d, L) {
    if (Math.abs(d.x) < 1e-9) return null;
    const t = (L.x - p.x) / d.x;
    if (t <= 1e-6) return null;
    const q = { x: L.x, y: p.y + d.y * t };
    if (L.H != null && Math.abs(q.y - L.y) > L.H) return null;
    const sx = d.x > 0 ? 1 : -1, s = d.y / d.x;
    const P = { x: L.x + sx * L.f, y: L.y + s * sx * L.f };
    const dir = L.f > 0 ? V.norm(V.sub(P, q)) : V.norm(V.sub(q, P));
    return { q, d: dir, P };
  }

  /* ---------------- 真实透镜（两个球面） ---------------- */
  // 球面：顶点 x、半径 R（> 0 球心在右侧，Infinity 为平面）。x(y) = x + R − sign(R)·√(R² − y²)
  function sag(R, y) { if (!isFinite(R)) return 0; const s = Math.sqrt(Math.max(0, R * R - y * y)); return R > 0 ? R - s : R + s; }
  /**
   * 六种截面：kind = 'bi-convex' | 'plano-convex' | 'meniscus-convex' | 'bi-concave' | 'plano-concave' | 'meniscus-concave'
   * cx 中心，H 半高，R 主要球面半径，edge 最薄处厚度。返回 [前表面, 后表面]，以及中心厚度 tc、边缘厚度 te
   */
  function surfaces(kind, cx, H, R, edge) {
    edge = edge || 6;
    const s1 = sag(R, H), s2 = sag(R * 1.9, H);
    let R0, R1, tc;
    switch (kind) {
      case 'bi-convex': R0 = R; R1 = -R; tc = edge + 2 * s1; break;
      case 'plano-convex': R0 = R; R1 = Infinity; tc = edge + s1; break;
      case 'meniscus-convex': R0 = R; R1 = R * 1.9; tc = edge + s1 - s2; break;
      case 'bi-concave': R0 = -R; R1 = R; tc = edge; break;
      case 'plano-concave': R0 = Infinity; R1 = R; tc = edge; break;
      case 'meniscus-concave': R0 = R * 1.9; R1 = R; tc = edge; break;
      default: R0 = R; R1 = -R; tc = edge + 2 * s1;
    }
    const S = [{ x: cx - tc / 2, R: R0, H }, { x: cx + tc / 2, R: R1, H }];
    S.tc = tc;
    S.te = (S[1].x + sag(R1, H)) - (S[0].x + sag(R0, H));
    S.kind = kind;
    S.convex = kind.indexOf('convex') > 0 || kind === 'bi-convex';
    return S;
  }
  /** 射线与球面（或平面）的交点，cy 为主光轴 */
  function hitSurf(p, d, s, cy) {
    if (!isFinite(s.R)) {
      if (Math.abs(d.x) < 1e-9) return null;
      const t = (s.x - p.x) / d.x;
      if (t <= 1e-6) return null;
      const q = V.add(p, V.mul(d, t));
      if (Math.abs(q.y - cy) > s.H + 1e-6) return null;
      return { q, n: { x: -1, y: 0 } };
    }
    const c = { x: s.x + s.R, y: cy };
    const f = V.sub(p, c), b = V.dot(f, d), cc = V.dot(f, f) - s.R * s.R, disc = b * b - cc;
    if (disc < 0) return null;
    const r = Math.sqrt(disc);
    let best = null;
    [-b - r, -b + r].forEach((t) => {
      if (t <= 1e-6) return;
      const q = V.add(p, V.mul(d, t));
      if (Math.abs(q.y - cy) > s.H + 1e-6) return;
      if (Math.abs(q.x - s.x) > Math.abs(s.R) * 0.8) return; // 只取顶点附近的那一段球面
      if (!best || t < best.t) best = { t, q };
    });
    if (!best) return null;
    return { q: best.q, n: V.norm(V.sub(best.q, c)) };
  }
  /** 追踪光线通过真实透镜（折射率 n），返回点列（最后一段沿出射方向延长 len） */
  function traceReal(p, d, S, cy, n, len) {
    const pts = [p];
    let cur = p, dir = V.norm(d);
    for (let k = 0; k < 2; k++) {
      const hs = hitSurf(cur, dir, S[k], cy);
      if (!hs) { pts.push(V.add(cur, V.mul(dir, len || 600))); pts.out = dir; pts.miss = true; return pts; }
      const nd = O.refract(dir, hs.n, k === 0 ? 1 : n, k === 0 ? n : 1);
      pts.push(hs.q);
      if (!nd) { pts.out = null; return pts; }
      cur = hs.q; dir = nd;
    }
    pts.push(V.add(cur, V.mul(dir, len || 600)));
    pts.out = dir;
    return pts;
  }
  /** 磨镜者公式估算焦距（薄透镜近似） */
  function focalOf(S, n) {
    const c0 = isFinite(S[0].R) ? 1 / S[0].R : 0, c1 = isFinite(S[1].R) ? 1 / S[1].R : 0;
    const P = (n - 1) * (c0 - c1);
    return Math.abs(P) < 1e-12 ? Infinity : 1 / P;
  }

  /* ---------------- 绘图 ---------------- */
  /** 画真实透镜的截面（S 为 surfaces 的返回值） */
  function drawShape(ctx, S, cy, o) {
    o = o || {};
    const H = S[0].H, N = 40;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const y = -H + (2 * H * i) / N; ctx.lineTo(S[0].x + sag(S[0].R, y), cy + y); }
    for (let i = N; i >= 0; i--) { const y = -H + (2 * H * i) / N; ctx.lineTo(S[1].x + sag(S[1].R, y), cy + y); }
    ctx.closePath();
    const g = ctx.createLinearGradient(S[0].x - 20, 0, S[1].x + 20, 0);
    g.addColorStop(0, o.fill || GLASS.fill); g.addColorStop(0.5, o.fill2 || 'rgba(208,235,255,.62)'); g.addColorStop(1, o.fill || GLASS.fill);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = o.stroke || GLASS.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke();
    ctx.restore();
  }
  /**
   * 光路图中的透镜：中心 (x, y)，半高 H。o.type 'convex' | 'concave'；o.style 'shape'（默认）| 'symbol'（双箭头符号）；
   * o.w 最厚处宽度；o.alpha；o.label 文字；o.F 字号函数
   */
  function draw(ctx, x, y, H, o) {
    o = o || {};
    const cvx = o.type !== 'concave';
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.style === 'symbol') {
      ctx.strokeStyle = o.stroke || '#1c7ed6'; ctx.fillStyle = o.stroke || '#1c7ed6'; ctx.lineWidth = o.lw || 3;
      ctx.beginPath(); ctx.moveTo(x, y - H); ctx.lineTo(x, y + H); ctx.stroke();
      const a = o.head || 13;
      [-1, 1].forEach((s) => {
        const ty = y + s * H;
        ctx.beginPath();
        if (cvx) { ctx.moveTo(x, ty + s * 2); ctx.lineTo(x - a * 0.6, ty - s * a * 0.9); ctx.lineTo(x + a * 0.6, ty - s * a * 0.9); }
        else { ctx.moveTo(x, ty - s * a * 0.9); ctx.lineTo(x - a * 0.6, ty + s * 1); ctx.lineTo(x + a * 0.6, ty + s * 1); }
        ctx.closePath(); ctx.fill();
      });
    } else {
      const w = o.w || 26, e = cvx ? 3 : Math.max(5, w * 0.22);
      ctx.beginPath();
      if (cvx) {
        ctx.moveTo(x, y - H);
        ctx.quadraticCurveTo(x + w, y, x, y + H);
        ctx.quadraticCurveTo(x - w, y, x, y - H);
      } else {
        const hw = w / 2;
        ctx.moveTo(x - hw, y - H); ctx.lineTo(x + hw, y - H);
        ctx.quadraticCurveTo(x + e * 0.2 - hw * 0.15, y, x + hw, y + H);
        ctx.lineTo(x - hw, y + H);
        ctx.quadraticCurveTo(x - e * 0.2 + hw * 0.15, y, x - hw, y - H);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, o.fill || GLASS.fill); g.addColorStop(0.5, 'rgba(219,240,255,.72)'); g.addColorStop(1, o.fill || GLASS.fill);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = o.stroke || GLASS.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke();
      if (o.center !== false) { ctx.strokeStyle = 'rgba(28,126,214,.35)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y - H); ctx.lineTo(x, y + H); ctx.stroke(); ctx.setLineDash([]); }
    }
    if (o.label) D.text(ctx, o.label, x, y - H - 10, { size: o.fs || 14, weight: 800, color: o.stroke || '#1c7ed6', align: 'center' });
    ctx.restore();
  }

  /**
   * 主光轴：o = { x0, x1, y, cx 光心, f 焦距（像素，正数）, F 字号函数, two（标 2F）, color, labels, dark（暗底） }
   */
  function axis(ctx, o) {
    const F = o.F || ((v) => v), c = o.color || (o.dark ? '#adb5bd' : '#495057');
    ctx.save();
    ctx.strokeStyle = c; ctx.lineWidth = 1.4; ctx.setLineDash(o.dash || []);
    ctx.beginPath(); ctx.moveTo(o.x0, o.y); ctx.lineTo(o.x1, o.y); ctx.stroke();
    ctx.setLineDash([]);
    if (o.f) {
      const marks = [[o.cx - o.f, o.fl || 'F'], [o.cx + o.f, o.fr || 'F']];
      if (o.two) marks.push([o.cx - 2 * o.f, '2F'], [o.cx + 2 * o.f, '2F']);
      marks.forEach(([x, t]) => {
        if (x < o.x0 - 1 || x > o.x1 + 1) return;
        ctx.fillStyle = o.fcolor || (o.dark ? '#ffd43b' : '#e8590c');
        ctx.beginPath(); ctx.arc(x, o.y, t === '2F' ? 3.5 : 4.5, 0, TAU); ctx.fill();
        if (o.labels !== false) D.text(ctx, t, x, o.y + F(20), { size: F(13), weight: 800, color: ctx.fillStyle, align: 'center' });
      });
    }
    if (o.labels !== false && o.cx != null) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(o.cx, o.y, 3, 0, TAU); ctx.fill();
      D.text(ctx, 'O', o.cx + 6, o.y + F(18), { size: F(13), weight: 800, color: c });
    }
    ctx.restore();
  }

  /** 物体 / 像：竖直箭头，底端 (x, yb)，高 hh（负数向下）。o：color、dash（虚像）、width、label、F */
  function arrowObj(ctx, x, yb, hh, o) {
    o = o || {};
    const c = o.color || '#2b8a3e', w = o.width || 4;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash === true ? [7, 5] : o.dash);
    const ty = yb - hh, s = hh > 0 ? 1 : -1, head = Math.min(o.head || 16, Math.abs(hh) * 0.6);
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, ty + s * head * 0.6); ctx.stroke();
    ctx.setLineDash([]);
    if (o.dash) {
      ctx.lineWidth = Math.max(1.5, w * 0.5);
      ctx.beginPath(); ctx.moveTo(x - head * 0.55, ty + s * head); ctx.lineTo(x, ty); ctx.lineTo(x + head * 0.55, ty + s * head); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x - head * 0.55, ty + s * head); ctx.lineTo(x + head * 0.55, ty + s * head); ctx.closePath(); ctx.fill();
    }
    if (o.label) D.text(ctx, o.label, x + (o.lx || 10), ty + s * (o.ly || 4), { size: o.fs || 14, weight: 800, color: c, baseline: s > 0 ? 'top' : 'bottom' });
    ctx.restore();
  }

  /** 光屏：中心 (x, y)，半高 hh；o.lit 屏上的光斑颜色 */
  function screen(ctx, x, y, hh, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = '#868e96'; ctx.fillRect(x - 2, y + hh, 4, o.stand || 30);
    ctx.fillStyle = o.color || '#f8f9fa'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
    D.roundRect(ctx, x - 5, y - hh, 10, hh * 2, 3); ctx.fill(); ctx.stroke();
    if (o.label) D.text(ctx, o.label, x, y - hh - 8, { size: o.fs || 13, weight: 700, color: '#495057', align: 'center' });
    ctx.restore();
  }

  /**
   * 把 fn(ctx) 的绘制按半径 r（当前坐标单位）的圆盘模糊：画 n 次，每次偏移一点、透明度相等。
   * o.half：只取上半 / 下半圆盘（遮住一半透镜）；o.alpha 总透明度
   */
  const GA = Math.PI * (3 - Math.sqrt(5));
  function blur(ctx, r, fn, o) {
    o = o || {};
    const n = r < 0.6 ? 1 : Math.min(o.max || 28, Math.max(8, Math.round(r * 1.6)));
    ctx.save();
    const a0 = o.alpha == null ? 1 : o.alpha;
    if (n === 1) { ctx.globalAlpha = a0; fn(ctx); ctx.restore(); return; }
    ctx.globalCompositeOperation = o.op || 'lighter';
    ctx.globalAlpha = a0 / n * (o.op === 'source-over' ? 1.6 : 1);
    for (let i = 0; i < n; i++) {
      const rr = r * Math.sqrt((i + 0.5) / n), a = i * GA;
      let dx = Math.cos(a) * rr, dy = Math.sin(a) * rr;
      if (o.half) dy = o.half * Math.abs(dy);
      ctx.save(); ctx.translate(dx, dy); fn(ctx); ctx.restore();
    }
    ctx.restore();
  }

  /** 选择题小卡片：返回 { el, ask(q, options, answer, explain) } */
  function quiz(title, onNext) {
    const stem = h('div', { class: 'q-stem' });
    const box = h('div', { class: 'q-options' });
    const ex = h('div', { class: 'q-explain' });
    const score = h('span', { class: 'small muted' });
    let st = { n: 0, ok: 0, done: true };
    const el = h('div', { class: 'opt-q' }, h('div', { class: 'opt-qhead' }, h('b', { html: title }), h('span', null, score, ' ', PS.ui.button('换一题 →', () => onNext && onNext(), 'btn btn-ghost btn-sm'))), stem, box, ex);
    return {
      el,
      ask(q, options, answer, explain, cols) {
        st.done = false;
        stem.innerHTML = q; ex.classList.remove('show'); box.innerHTML = '';
        box.className = 'q-options' + (cols ? ' cols-' + cols : options.every((x) => String(x).replace(/<[^>]+>/g, '').length < 14) ? '' : ' cols-1');
        options.forEach((t, k) => {
          const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCDEF'[k] + '</span>' + t });
          b.addEventListener('click', () => {
            if (st.done) return;
            st.done = true; st.n++;
            const ok = k === answer; if (ok) st.ok++;
            box.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === answer) x.classList.add('right'); });
            if (!ok) b.classList.add('wrong');
            ok ? PS.sound.good() : PS.sound.bad();
            ex.innerHTML = '<b>' + (ok ? '✔ 正确。' : '✘ 正确答案是 ' + 'ABCDEF'[answer] + '。') + '</b>' + explain; ex.classList.add('show');
            score.innerHTML = '答对 ' + st.ok + ' / ' + st.n;
          });
          box.append(b);
        });
      },
    };
  }

  /** 凸透镜成像规律：按物距判断（f 焦距），返回 { zone, text, use } */
  function rule(u, f) {
    const e = 1e-6;
    if (u > 2 * f + e) return { zone: 0, text: '倒立、缩小的实像', v: 'f < v < 2f', use: '照相机' };
    if (Math.abs(u - 2 * f) <= e) return { zone: 1, text: '倒立、等大的实像', v: 'v = 2f', use: '测焦距' };
    if (u > f + e) return { zone: 2, text: '倒立、放大的实像', v: 'v > 2f', use: '投影仪' };
    if (Math.abs(u - f) <= e) return { zone: 3, text: '不成像', v: '—', use: '平行光源' };
    return { zone: 4, text: '正立、放大的虚像', v: '与物同侧', use: '放大镜' };
  }

  /** 光路图的底色（浅色、淡淡的方格） */
  function paper(ctx, VW, VH, o) {
    o = o || {};
    ctx.fillStyle = o.bg || '#fbfcfe'; ctx.fillRect(0, 0, VW, VH);
    if (o.grid === false) return;
    ctx.strokeStyle = 'rgba(59,91,219,.06)'; ctx.lineWidth = 1;
    const g = o.grid || 40;
    ctx.beginPath();
    for (let x = g; x < VW; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, VH); }
    for (let y = g; y < VH; y += g) { ctx.moveTo(0, y); ctx.lineTo(VW, y); }
    ctx.stroke();
  }

  /** 把一条光线（点列）裁到矩形 [x0, x1] × [y0, y1] 以内（只裁最后一段） */
  function clipEnd(pts, x0, y0, x1, y1) {
    const n = pts.length;
    if (n < 2) return pts;
    const a = pts[n - 2], b = pts[n - 1], d = V.sub(b, a);
    let t = 1;
    if (b.x > x1) t = Math.min(t, (x1 - a.x) / d.x);
    if (b.x < x0) t = Math.min(t, (x0 - a.x) / d.x);
    if (b.y > y1) t = Math.min(t, (y1 - a.y) / d.y);
    if (b.y < y0) t = Math.min(t, (y0 - a.y) / d.y);
    pts[n - 1] = V.add(a, V.mul(d, Math.max(0, t)));
    return pts;
  }

  PS.lens = { image, through, sag, surfaces, traceReal, focalOf, drawShape, draw, axis, arrowObj, screen, blur, quiz, rule, paper, clipEnd, GLASS };

  /* 第5章组件共用的样式 */
  if (!document.getElementById('lens-style')) document.head.append(h('style', { id: 'lens-style' }, `
    .ln-msg{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.92rem;min-height:2.6em}
    .ln-two{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:12px;align-items:start}
    .ln-two > div{min-width:0}
    @media (max-width:720px){.ln-two{grid-template-columns:minmax(0,1fr)}}
    .ln-view{border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#fff}
    .ln-view-cap{font-size:.82rem;color:var(--muted);text-align:center;margin:4px 0 0}
    .ln-pair{display:grid;grid-template-columns:minmax(0,270px) minmax(0,1fr);gap:14px;align-items:start;margin-top:10px}
    .ln-pair > div{min-width:0}
    .ln-pair .controls:first-child{margin-top:0}
    .ln-pair.rev{grid-template-columns:minmax(0,1fr) minmax(0,300px)}
    .ln-inset-t{font-size:.85rem;font-weight:800;margin-bottom:4px}
    @media (max-width:600px){.ln-pair,.ln-pair.rev{grid-template-columns:minmax(0,1fr)}.ln-pair > .ln-inset{max-width:300px;width:100%;margin:0 auto}}
    .ln-rules td.on, .ln-rules tr.on td{background:#fff3bf}
    .ln-rules tr.on td:first-child{box-shadow:inset 4px 0 0 var(--accent)}
  `));
})();
