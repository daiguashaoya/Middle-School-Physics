/*
 * 看得见的物理 · 第11章公共库（功和机械能）
 * PS.EC                       能量的配色：动能 k（橙）、重力势能 g（蓝）、弹性势能 e（青）、内能 q（红）、机械能 m（深灰）、功 W（紫）
 * PS.en.g                     计算题取 10 N/kg
 * PS.en.fmtJ(x, sig)          能量 / 功的读数（自动用 kJ、科学记数法），返回 HTML
 * PS.en.bars(ctx, x, y, w, hh, items, o)  能量柱状图：items = [{ n: '动能', v, c }]，o.max 满格的值、o.F 字号函数、o.total 画出机械能总量的虚线、o.title
 * PS.en.ball(ctx, x, y, r, c1, c2)  带高光的小球
 * PS.en.stopwatch(ctx, x, y, t, o)  数字停表（显示 t 秒）
 * PS.en.calc(el, o)           公式三角形计算器：top = a × b（W = Fs、W = Pt、P = Fv），o.top / o.a / o.b = { k, name, unit, units: { 单位: 倍数 }, v }，o.presets
 * PS.en.parse(s)              解析输入的数字（支持 1.2×10^3、1.2e3）
 * PS.en.txt(x, sig)          画布用的数字文字（2.4×10⁶）
 * PS.en.estimate(box, QS)    估测选择题（随机出题、换一题）
 * 依赖 core.js、force.js（.fc-* 样式）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.EC = { k: '#f08c00', g: '#3b5bdb', e: '#0c8599', q: '#e03131', m: '#1b2333', W: '#7048e8' };

  const EN = (PS.en = {});
  EN.g = 10;

  EN.fmtJ = function (x, sig) {
    if (!isFinite(x)) return '—';
    const a = Math.abs(x);
    if (a >= 1e4 && a < 1e7 && Math.abs(a / 1e3 - Math.round(a / 1e3)) < 1e-9) return PS.fmt(x / 1e3, 0) + ' kJ';
    return PS.pretty(x, sig || 3) + ' J';
  };

  /** 把 #rrggbb 颜色调浅（t = 0~1） */
  EN.light = function (c, t) {
    const n = parseInt(c.slice(1), 16), f = (v) => Math.round(v + (255 - v) * t);
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  };

  /** 画布用的数字文字（科学记数法用上标：2.4×10⁶） */
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '−': '⁻' };
  EN.txt = (x, sig) => PS.pretty(x, sig || 4).replace(/<sup>(.*?)<\/sup>/g, (m, e) => e.split('').map((c) => SUP[c] || c).join('')).replace(' × ', '×');

  EN.parse = (s) => parseFloat(String(s).replace(/\s/g, '').replace(/[×xX*]10\^?([−-]?\d+)/, 'e$1').replace('−', '-'));

  /** 能量柱状图（竖直的柱子从底部向上长） */
  EN.bars = function (ctx, x, y, w, hh, items, o) {
    o = o || {};
    const F = o.F || ((v) => v);
    const n = items.length, max = o.max || Math.max(1e-9, ...items.map((it) => it.v));
    const top = y + (o.title ? F(20) : 6), labH = F(13) * (o.lines || 1) * 1.25 + 8, bot = y + hh - labH;
    ctx.save();
    if (o.bg !== false) { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, x, y - 6, w, hh + 10, 10); ctx.fill(); ctx.stroke(); }
    if (o.title) D.text(ctx, o.title, x + w / 2, y + F(14), { size: F(14), weight: 800, align: 'center', color: '#343a40' });
    const gap = w / n, bw = Math.min(gap * 0.56, o.bw || 46);
    ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 8, bot); ctx.lineTo(x + w - 8, bot); ctx.stroke();
    items.forEach((it, i) => {
      const cx = x + gap * (i + 0.5), v = Math.max(0, it.v), bh = Math.min(1.08, v / max) * (bot - top);
      const g = ctx.createLinearGradient(0, bot - bh, 0, bot);
      g.addColorStop(0, it.c); g.addColorStop(1, EN.light(it.c, 0.3));
      ctx.fillStyle = g; D.roundRect(ctx, cx - bw / 2, bot - bh, bw, bh, Math.min(6, bh / 2)); ctx.fill();
      if (it.dash) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = it.c; ctx.lineWidth = 2; D.roundRect(ctx, cx - bw / 2, bot - Math.min(1.08, it.dash / max) * (bot - top), bw, Math.min(1.08, it.dash / max) * (bot - top), 6); ctx.stroke(); ctx.restore(); }
      const lab = String(it.n).split('\n');
      lab.forEach((t, k) => D.text(ctx, t, cx, bot + F(13) * (1.05 + k * 1.2), { size: F(13), weight: 700, align: 'center', color: it.c }));
      if (o.values !== false && it.v != null) D.text(ctx, o.fmt ? o.fmt(it.v) : PS.fmt(it.v, o.d == null ? 0 : o.d), cx, bot - bh - 6, { size: F(12), weight: 700, align: 'center', color: '#495057' });
    });
    if (o.total != null) {
      const ty = bot - Math.min(1.08, o.total / max) * (bot - top);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = PS.EC.m; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 8, ty); ctx.lineTo(x + w - 8, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    return { top, bot };
  };

  /** 带高光的小球 */
  EN.ball = function (ctx, x, y, r, c1, c2) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c1 || '#ced4da'); g.addColorStop(1, c2 || '#495057');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };

  /** 数字停表：中心 (x, y)，显示 t 秒 */
  EN.stopwatch = function (ctx, x, y, t, o) {
    o = o || {};
    const F = o.F || ((v) => v), r = o.r || 46;
    ctx.save();
    ctx.fillStyle = '#343a40'; ctx.fillRect(x - 7, y - r - 14, 14, 12);
    ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f8f9fa'; ctx.beginPath(); ctx.arc(x, y, r - 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d3f9d8'; D.roundRect(ctx, x - r * 0.72, y - r * 0.28, r * 1.44, r * 0.56, 5); ctx.fill();
    D.text(ctx, PS.fmt(t, 1) + ' s', x, y + 1, { size: F(o.fs || 17), weight: 800, align: 'center', baseline: 'middle', color: '#1b2333' });
    if (o.label) D.text(ctx, o.label, x, y + r + F(15), { size: F(12), weight: 700, align: 'center', color: '#495057' });
    ctx.restore();
  };

  /** 公式三角形计算器：top = a × b */
  EN.calc = function (el, o) {
    const V = { top: o.top, a: o.a, b: o.b };
    const st = { mode: o.mode || 'top' };
    const inp = (v) => h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', value: v });
    const sel = (u, v) => { const s = h('select'); Object.keys(u).forEach((k) => s.append(h('option', { value: k, selected: k === v ? true : null }, k))); return s; };
    const rows = {}, ins = {}, uns = {};
    ['top', 'a', 'b'].forEach((k) => {
      const q = V[k];
      ins[k] = inp(q.v);
      uns[k] = q.units ? sel(q.units, q.unit) : h('span', null, q.unit);
      rows[k] = h('div', { class: 'row' }, h('b', { html: q.name + ' =' }), ins[k], uns[k]);
    });
    const out = h('div', { class: 'fc-msg info' });
    const seg = PS.ui.seg([{ value: 'top', label: '求' + V.top.short }, { value: 'a', label: '求' + V.a.short }, { value: 'b', label: '求' + V.b.short }], st.mode, (v) => { st.mode = v; show(); });
    const tri = h('div', { style: { display: 'grid', placeItems: 'center' } });
    el.append(PS.ui.row(seg.el),
      h('div', { class: 'fc-pair', style: { marginTop: '8px' } },
        h('div', { class: 'en-calc' }, rows.top, rows.a, rows.b, PS.ui.row(PS.ui.button('计算', calc, 'btn btn-primary btn-sm')), out),
        tri));
    if (o.presets) el.append(h('div', { class: 'small muted', style: { marginTop: '8px' } }, '例子：'), h('div', { class: 'fc-chips' }, o.presets.map((p) => PS.ui.button(p.t, () => {
      seg.set(p.mode, true); st.mode = p.mode;
      ['top', 'a', 'b'].forEach((k) => { if (p[k] != null) ins[k].value = String(p[k]); if (p.u && p.u[k] && V[k].units) uns[k].value = p.u[k]; });
      show(); calc(); if (p.note) out.innerHTML += '<br><span class="small muted">' + p.note + '</span>';
    }, 'btn btn-sm'))));
    const val = (k) => EN.parse(ins[k].value) * (V[k].units ? V[k].units[uns[k].value] : 1);
    const base = (k) => (V[k].units ? Object.keys(V[k].units).find((u) => V[k].units[u] === 1) : V[k].unit);
    const it = (s) => '<tspan font-style="italic">' + s + '</tspan>';
    function show() {
      ['top', 'a', 'b'].forEach((k) => (rows[k].style.opacity = k === st.mode ? '.35' : '1'));
      const c = (k) => (st.mode === k ? '#e8590c' : '#1b2333');
      tri.innerHTML = '<svg viewBox="0 0 200 170" width="190"><path d="M100 10 L190 160 L10 160 Z" fill="#fff" stroke="#3b5bdb" stroke-width="3"/><line x1="45" y1="100" x2="155" y2="100" stroke="#3b5bdb" stroke-width="2"/><line x1="100" y1="100" x2="100" y2="160" stroke="#3b5bdb" stroke-width="2"/>'
        + '<text x="100" y="78" font-size="30" text-anchor="middle" font-weight="700" fill="' + c('top') + '">' + it(V.top.k) + '</text>'
        + '<text x="66" y="142" font-size="28" text-anchor="middle" font-weight="700" fill="' + c('a') + '">' + it(V.a.k) + '</text>'
        + '<text x="134" y="142" font-size="28" text-anchor="middle" font-weight="700" fill="' + c('b') + '">' + it(V.b.k) + '</text></svg>'
        + '<div class="small" style="text-align:center">' + { top: V.top.k + ' = ' + V.a.k + V.b.k, a: V.a.k + ' = ' + V.top.k + ' / ' + V.b.k, b: V.b.k + ' = ' + V.top.k + ' / ' + V.a.k }[st.mode] + '<br><span class="muted">遮住要求的量，剩下的就是算法</span></div>';
      out.className = 'fc-msg info'; out.innerHTML = o.hint || '填好已知量，点“计算”。';
    }
    function conv(k) {
      if (!V[k].units || V[k].units[uns[k].value] === 1) return '';
      return V[k].k + ' = ' + PS.prettyText(EN.parse(ins[k].value)) + ' ' + uns[k].value + ' = ' + PS.pretty(val(k)) + ' ' + base(k) + '<br>';
    }
    function calc() {
      const T = val('top'), A = val('a'), B = val('b');
      let s;
      if (st.mode === 'top') {
        if (!(A > 0 && B > 0)) return bad();
        s = conv('a') + conv('b') + V.top.k + ' = ' + V.a.k + V.b.k + ' = ' + PS.pretty(A) + ' ' + base('a') + ' × ' + PS.pretty(B) + ' ' + base('b') + ' = <b>' + PS.pretty(A * B) + ' ' + base('top') + '</b>';
        if (o.extra) s += o.extra('top', A * B);
      } else {
        const k = st.mode, other = k === 'a' ? 'b' : 'a', Ov = k === 'a' ? B : A;
        if (!(T > 0 && Ov > 0)) return bad();
        s = conv('top') + conv(other) + V[k].k + ' = <span class="frac"><span>' + V.top.k + '</span><span>' + V[other].k + '</span></span> = <span class="frac"><span>' + PS.pretty(T) + ' ' + base('top') + '</span><span>' + PS.pretty(Ov) + ' ' + base(other) + '</span></span> = <b>' + PS.pretty(T / Ov) + ' ' + base(k) + '</b>';
        if (o.extra) s += o.extra(k, T / Ov);
      }
      out.className = 'fc-msg ok'; out.innerHTML = s;
    }
    function bad() { out.className = 'fc-msg bad'; out.innerHTML = '请输入正数（可以写成 2.4×10^6 或 2400000）。'; }
    show();
  };

  /**
   * 虚拟高度随宽度变化的画布（手机上字号放大，需要更高的画面）：o.VW 虚拟宽度，o.vh(w) 返回宽 w（CSS 像素）时的虚拟高度，
   * o.draw(ctx, w, hh, VH)；返回的 S.VH 为当前虚拟高度（PS.drag 可传 { VW, get VH() { return S.VH; } }）
   */
  EN.stage = function (container, o) {
    let VH = Math.round(o.vh(1000));
    const S = PS.stage(container, {
      ratio: o.VW + ' / ' + VH,
      draw: (ctx, w, hh) => o.draw(ctx, w, hh, VH),
      onResize: (s) => { const v = Math.round(o.vh(s.w)); if (v !== VH) { VH = v; s.stage.style.aspectRatio = o.VW + ' / ' + v; } },
    });
    Object.defineProperty(S, 'VH', { get: () => VH });
    return S;
  };
  /** 手机上的窄画布 */
  EN.narrow = (w) => w < 560;
  /** 按宽度 w 估算 F(px) 的虚拟字号（与 PS.virtual 的 F 相同，VW = 1000） */
  EN.fs = (w, px, min) => { const k = w / 1000; return Math.max(min || 11, px * k) / k; };

  /**
   * 对数刻度上的“排行榜”：o.items = [[名称, 数值, emoji, 说明]]，o.lmin / o.lmax 指数范围，o.tick(e) 刻度文字，
   * o.caption 横轴说明，o.hint 左上角提示，o.fmt(v) 选中项的数值文字；返回 { S, msg }
   */
  EN.ladder = function (el, o) {
    const VW = 1000, X0 = 70, X1 = 940, st = { on: o.on || 0 };
    const lay = (w) => {
      const r = Math.max(26, 16 / (w / 1000)), top = EN.fs(w, 13) * 1.6 + 10, gap = 2.15 * r;
      const rows = [top + r, top + r + gap, top + r + 2 * gap], AY = rows[2] + r + 26 + EN.fs(w, 14) * 1.4;
      return { r, rows, AY, VH: AY + EN.fs(w, 14) * 2.6 + 12 + EN.fs(w, 12) * 0.6 + 8 };
    };
    const S = EN.stage(el, { VW, vh: (w) => lay(w).VH, draw });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(msg);
    const lx = (v) => X0 + ((Math.log10(v) - o.lmin) / (o.lmax - o.lmin)) * (X1 - X0);
    PS.drag(S, { VW, get VH() { return S.VH; }, hit: (p) => { const L = lay(S.w || 1000), i = o.items.findIndex((it, k) => Math.hypot(p.x - lx(it[1]), p.y - L.rows[k % 3]) < L.r + 4); return i >= 0 ? i : null; }, start: (i) => { st.on = i; PS.sound.tick(); upd(); }, move() {} });
    function upd() { const it = o.items[st.on]; msg.innerHTML = '<b>' + it[0] + '</b>：' + it[3] + '。'; S.render(); }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), L = lay(w), AY = L.AY;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      D.arrow(ctx, X0 - 20, AY, X1 + 40, AY, { color: '#495057', width: 2.5 });
      for (let e = o.lmin; e <= o.lmax; e++) {
        const x = lx(Math.pow(10, e));
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, AY - 8); ctx.lineTo(x, AY + 8); ctx.stroke();
        if ((e - o.lmin) % 2 === 0 || !EN.narrow(w)) D.text(ctx, o.tick(e), x, AY + F(14) + 10, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      }
      D.text(ctx, o.caption, VW / 2, AY + F(14) * 2.6 + 12, { size: F(12), color: '#868e96', align: 'center' });
      o.items.forEach((it, k) => {
        const x = lx(it[1]), y = L.rows[k % 3], on = k === st.on;
        ctx.strokeStyle = on ? '#e8590c' : '#adb5bd'; ctx.lineWidth = on ? 2.5 : 1.2; ctx.setLineDash(on ? [] : [4, 4]);
        ctx.beginPath(); ctx.moveTo(x, y + L.r); ctx.lineTo(x, AY); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = on ? '#fff3df' : '#fff'; ctx.strokeStyle = on ? '#e8590c' : '#dee2e6'; ctx.lineWidth = on ? 2.5 : 1.5;
        ctx.beginPath(); ctx.arc(x, y, L.r, 0, TAU); ctx.fill(); ctx.stroke();
        D.text(ctx, it[2], x, y + 1, { size: Math.min(50, L.r * 1.05), align: 'center', baseline: 'middle' });
      });
      const it = o.items[st.on];
      D.text(ctx, o.fmt(it), PS.clamp(lx(it[1]), 260, 740), AY - 16, { size: F(14), weight: 800, color: '#e8590c', align: 'center', bg: 'rgba(255,255,255,.94)' });
      D.text(ctx, o.hint, 16, F(13) + 10, { size: F(13), color: '#868e96' });
    }
    upd();
    return { S, msg };
  };

  /** 估测选择题：box 为容器，QS = [[题干, 选项数组, 答案下标, 解析], ...]，随机出一题，可“换一题” */
  EN.estimate = function (box, QS, title) {
    let qi = PS.randInt(0, QS.length - 1);
    function ask() {
      const [stem, opts, ans, why] = QS[qi];
      box.innerHTML = '';
      const fb = h('div', { class: 'small', style: { marginTop: '6px' } });
      const ops = h('div', { class: 'q-options cols-4' });
      opts.forEach((o, k) => {
        const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCD'[k] + '</span>' + o });
        b.addEventListener('click', () => {
          if (ops.dataset.done) return; ops.dataset.done = 1;
          ops.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === ans) x.classList.add('right'); });
          if (k !== ans) b.classList.add('wrong');
          k === ans ? PS.sound.good() : PS.sound.bad();
          fb.innerHTML = (k === ans ? '✔ 正确！' : '✘ 正确答案是 ' + opts[ans] + '。') + ' ' + why;
        });
        ops.append(b);
      });
      box.append(h('b', null, title || '估一估：'), stem, ops, h('div', { class: 'controls', style: { marginTop: '6px' } }, fb, PS.ui.button('换一题', () => { qi = (qi + 1 + PS.randInt(0, QS.length - 2)) % QS.length; ask(); }, 'btn btn-ghost btn-sm')));
    }
    ask();
  };

  /* 第11章组件共用的样式（.fc-* 来自 force.js） */
  if (!document.getElementById('en-style')) document.head.append(h('style', { id: 'en-style' }, `
    .en-calc{font-size:.95rem;line-height:1.9}
    .en-calc .row{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
    .en-calc input{width:100px}
    .en-calc select{padding:3px 4px;border-radius:6px;border:1px solid var(--line-2)}
    .en-read{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px;margin-top:6px}
    .en-read .readout{margin:0}
    .en-tabs{display:flex;flex-wrap:wrap;gap:6px}
    .en-tabs .btn.on{background:var(--primary);color:#fff;border-color:var(--primary)}
    .q-options.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}
    @media (max-width:680px){.q-options.cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .en-k{color:#f08c00;font-weight:700}.en-g{color:#3b5bdb;font-weight:700}.en-e{color:#0c8599;font-weight:700}.en-q{color:#e03131;font-weight:700}
  `));
})();
