/* 第5章第3节：凸透镜成像的规律——成像光路图（拖动物体、三条特殊光线、规律表、像距—物距图像）、常考变式（遮住半个透镜、蜡烛变短、交换位置、加眼镜）、成像规律随机练习。依赖 optics.js、lens.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const L5 = PS.lens;
  const TAU = Math.PI * 2;

  const RULES = [
    ['u &gt; 2f', '倒立、缩小、实像', 'f &lt; v &lt; 2f', '异侧', '照相机'],
    ['u = 2f', '倒立、等大、实像', 'v = 2f', '异侧', '测焦距'],
    ['f &lt; u &lt; 2f', '倒立、放大、实像', 'v &gt; 2f', '异侧', '投影仪'],
    ['u = f', '不成像', '—', '—', '平行光源'],
    ['u &lt; f', '正立、放大、虚像', '|v| &gt; u', '同侧', '放大镜'],
  ];
  function rulesTable() {
    const tb = h('tbody');
    RULES.forEach((r) => tb.append(h('tr', null, r.map((c, i) => h('td', { class: i === 1 ? 'l' : '', html: c })))));
    const t = h('table', { class: 't ln-rules' }, h('thead', null, h('tr', null, ['物距', '像的性质', '像距', '像与物', '应用'].map((x, i) => h('th', { class: i === 1 ? 'l' : '' }, x)))), tb);
    return { el: h('div', { class: 'table-wrap', style: { margin: '0' } }, t), set(z) { tb.querySelectorAll('tr').forEach((tr, i) => tr.classList.toggle('on', i === z)); } };
  }

  /* ================= 凸透镜成像光路图 ================= */
  PS.register('lens-bench', function (el) {
    const VW = 1000, VH = 460, CY = 250, LX = 520, K = 8, OH = 5; // 每厘米 8 单位，物体高 5 cm
    const st = { f: 10, u: 30, r: { par: true, ctr: true, foc: true }, play: false, t: 0, graph: true };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const fSeg = PS.ui.seg([{ value: 10, label: 'f = 10 cm' }, { value: 15, label: 'f = 15 cm' }], st.f, (v) => { st.f = v; upd(); });
    const rT = [['par', '平行于主光轴'], ['ctr', '过光心'], ['foc', '过焦点']].map(([k, n]) => PS.ui.toggle(n, true, (v) => { st.r[k] = v; S.render(); }));
    const playB = PS.ui.button('▶ 物体由远及近', () => { st.play = !st.play; st.t = 0; if (st.play) { st.u = 55; loop.start(); } playB.innerHTML = st.play ? '⏸ 暂停' : '▶ 物体由远及近'; }, 'btn btn-sm');
    const rU = PS.ui.readout('物距 u', '—', 'accent'), rV = PS.ui.readout('像距 v', '—', 'primary'), rI = PS.ui.readout('像的性质', '—'), rA = PS.ui.readout('应用', '—');
    const msg = h('div', { class: 'feedback show info' });
    const table = rulesTable();
    const gWrap = h('div', { class: 'ln-view' });
    el.append(PS.ui.row(fSeg.el, playB, h('span', { class: 'small muted' }, '拖动物体 AB；光线：'), ...rT.map((t) => t.el)), h('div', { class: 'readouts' }, rU.el, rV.el, rI.el, rA.el), msg,
      h('div', { class: 'ln-pair rev' }, h('div', null, table.el), h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '像距 v 与物距 u 的关系（实像）'), gWrap)));
    const G = PS.stage(gWrap, { ratio: '4 / 3', draw: paintGraph });
    function upd() {
      const f = st.f, u = st.u, im = L5.image(u, f), R = L5.rule(u, f);
      rU.set(u.toFixed(1) + ' cm');
      rV.set(im.inf ? '无穷远' : im.real ? im.v.toFixed(1) + ' cm' : '虚像，|v| = ' + (-im.v).toFixed(1) + ' cm');
      rI.set(R.text); rA.set(R.use);
      table.set(R.zone);
      const t = [
        '物体在 <b>2 倍焦距以外</b>：成<b>倒立、缩小的实像</b>，像在 1 倍焦距和 2 倍焦距之间，<b>u &gt; v</b>。应用：照相机。',
        '物体在 <b>2 倍焦距处</b>：成<b>倒立、等大的实像</b>，v = u = 2f。这是成<b>放大像和缩小像的分界点</b>，可以用来测焦距。',
        '物体在 <b>1 倍焦距和 2 倍焦距之间</b>：成<b>倒立、放大的实像</b>，像在 2 倍焦距以外，<b>u &lt; v</b>。应用：投影仪。',
        '物体在<b>焦点</b>上：折射光线平行，<b>不成像</b>。焦点是成<b>实像和虚像的分界点</b>。',
        '物体在 <b>1 倍焦距以内</b>：成<b>正立、放大的虚像</b>，像与物在透镜<b>同侧</b>，光屏承接不到。应用：放大镜。',
      ][R.zone];
      msg.innerHTML = t + (R.zone <= 2 ? '<br><span class="small">成实像时：<b>物近像远像变大</b>（物体靠近透镜，像远离透镜，像变大）。</span>' : R.zone === 4 ? '<br><span class="small">成虚像时：物体离透镜越近，像越小。</span>' : '');
      S.render(); G.render();
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => (Math.abs(p.x - (LX - st.u * K)) < 24 && p.y > CY - OH * K - 30 && p.y < CY + 10 ? 'u' : null),
      move: (k, p) => {
        let u = PS.clamp((LX - p.x) / K, 2, 58);
        [st.f, 2 * st.f].forEach((s) => { if (Math.abs(u - s) < 0.7) u = s; });
        st.u = PS.round(u, 1); st.play = false; playB.innerHTML = '▶ 物体由远及近'; upd();
      },
    });
    const loop = PS.loop((dt) => {
      if (!st.play) { loop.stop(); return; }
      st.u = Math.max(2, st.u - dt * (st.u > 2.2 * st.f ? 7 : st.u > st.f * 1.05 ? 1.6 : 2.2));
      if (Math.abs(st.u - st.f) < 0.05) st.u = st.f - 0.06;
      if (st.u <= 2) { st.play = false; playB.innerHTML = '▶ 物体由远及近'; }
      upd();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const f = st.f * K, u = st.u * K, im = L5.image(st.u, st.f);
      // 区域底色
      const z = [[LX - 2 * f, 'rgba(59,91,219,.05)'], [LX - f, 'rgba(240,140,0,.06)']];
      ctx.fillStyle = 'rgba(59,91,219,.05)'; ctx.fillRect(0, 30, LX - 2 * f, VH - 30);
      ctx.fillStyle = 'rgba(240,140,0,.07)'; ctx.fillRect(LX - 2 * f, 30, f, VH - 30);
      ctx.fillStyle = 'rgba(112,72,232,.06)'; ctx.fillRect(LX - f, 30, f, VH - 30);
      void z;
      D.text(ctx, 'u > 2f', (LX - 2 * f) / 2, 52, { size: F(13), weight: 800, color: '#3b5bdb', align: 'center' });
      D.text(ctx, 'f < u < 2f', LX - 1.5 * f, 52, { size: F(13), weight: 800, color: '#e67700', align: 'center' });
      D.text(ctx, 'u < f', LX - 0.5 * f, 52, { size: F(13), weight: 800, color: '#7048e8', align: 'center' });
      L5.axis(ctx, { x0: 10, x1: VW - 10, y: CY, cx: LX, f, F, two: true });
      const H = 150;
      L5.draw(ctx, LX, CY, H, { type: 'convex', w: 30 });
      const ox = LX - u, oh = OH * K;
      const P = { x: ox, y: CY - oh };
      const L = { x: LX, y: CY, f, H: 1e4 };
      const clip = (pts) => L5.clipEnd(pts, 4, 4, VW - 4, VH - 4);
      const FL = { x: LX - f, y: CY };
      const rays = [];
      if (st.r.par) rays.push(['#e8590c', { x: 1, y: 0 }]);
      if (st.r.ctr) rays.push(['#1c7ed6', V.norm(V.sub({ x: LX, y: CY }, P))]);
      if (st.r.foc && Math.abs(st.u - st.f) > 0.05) rays.push(['#2b8a3e', st.u > st.f ? V.norm(V.sub(FL, P)) : V.norm(V.sub(P, FL))]);
      rays.forEach(([c, d]) => {
        const r = L5.through(P, d, L);
        if (!r) return;
        if (Math.abs(r.q.y - CY) > H + 2) {
          // 射到透镜外：按教材习惯把透镜看作足够大，用虚线延长透镜
          ctx.strokeStyle = 'rgba(51,154,240,.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(LX, CY + Math.sign(r.q.y - CY) * H); ctx.lineTo(LX, r.q.y); ctx.stroke(); ctx.setLineDash([]);
        }
        PS.beam(ctx, clip([P, r.q, O.along(r.q, r.d, 2000)]), { color: c, width: 2, arrow: true, head: 11 });
        if (!im.real && !im.inf) PS.beam(ctx, clip([r.q, O.along(r.q, V.mul(r.d, -1), 2000)]), { color: c, width: 1.2, dash: [6, 5], alpha: 0.7 });
      });
      // 物体
      L5.arrowObj(ctx, ox, CY, oh, { color: '#2b8a3e', width: 4, head: 14, label: 'A', fs: F(14), lx: 10 });
      D.text(ctx, 'B', ox - 16, CY + 18, { size: F(14), weight: 800, color: '#2b8a3e' });
      PS.handle(ctx, ox, CY - oh / 2, 9, '#2b8a3e', null, F);
      // 像
      if (!im.inf) {
        const ix = LX + im.v * K, ihh = oh * im.m;
        if (ix > 4 && ix < VW - 4) {
          L5.arrowObj(ctx, ix, CY, ihh, { color: '#7048e8', width: 4, head: 14, dash: !im.real, label: im.real ? 'A′' : 'A′（虚像）', fs: F(14) });
          D.text(ctx, 'B′', ix + 6, CY + (ihh > 0 ? 18 : -8), { size: F(14), weight: 800, color: '#7048e8' });
        } else D.text(ctx, im.real ? '像在右侧更远处 →' : '← 虚像在左侧更远处', im.real ? VW - 14 : 14, CY + 60, { size: F(13), weight: 800, color: '#7048e8', align: im.real ? 'right' : 'left' });
      } else D.text(ctx, '折射光线平行，不成像', VW - 14, CY + 60, { size: F(13), weight: 800, color: '#7048e8', align: 'right' });
      D.dim(ctx, ox, LX, CY + 168, 'u = ' + st.u.toFixed(1) + ' cm', { size: F(13), color: '#2b8a3e' });
      if (im.real && LX + im.v * K < VW) D.dim(ctx, LX, LX + im.v * K, CY + 196, 'v = ' + im.v.toFixed(1) + ' cm', { size: F(13), color: '#7048e8' });
      ctx.restore();
    }
    function paintGraph(ctx, w, hh) {
      ctx.save();
      const GW = 400, GH = 300;
      const F = PS.virtual(ctx, w, hh, GW, GH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, GW, GH);
      const x0 = 46, y0 = GH - 34, sx = 5.6, sy = 3.6; // u 0~60 cm，v 0~70 cm
      ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 1;
      for (let c = 10; c <= 60; c += 10) { ctx.beginPath(); ctx.moveTo(x0 + c * sx, y0); ctx.lineTo(x0 + c * sx, 14); ctx.stroke(); }
      for (let c = 10; c <= 70; c += 10) { ctx.beginPath(); ctx.moveTo(x0, y0 - c * sy); ctx.lineTo(GW - 10, y0 - c * sy); ctx.stroke(); }
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, 10); ctx.lineTo(x0, y0); ctx.lineTo(GW - 8, y0); ctx.stroke();
      ctx.font = PS.font(F(11), 600); ctx.fillStyle = '#495057'; ctx.textAlign = 'center';
      for (let c = 10; c <= 60; c += 10) ctx.fillText(c, x0 + c * sx, y0 + 16);
      ctx.textAlign = 'right';
      for (let c = 10; c <= 70; c += 10) ctx.fillText(c, x0 - 6, y0 - c * sy + 4);
      ctx.textAlign = 'left'; ctx.fillText('u/cm', GW - 40, y0 - 6); ctx.fillText('v/cm', x0 + 6, 18);
      const f = st.f;
      ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2.5; ctx.beginPath();
      let first = true;
      for (let u = f + 0.3; u <= 60; u += 0.2) { const v = (u * f) / (u - f); if (v > 70) continue; const X = x0 + u * sx, Y = y0 - v * sy; if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y); }
      ctx.stroke();
      // u = v = 2f
      ctx.strokeStyle = 'rgba(232,89,12,.6)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x0 + 2 * f * sx, y0); ctx.lineTo(x0 + 2 * f * sx, y0 - 2 * f * sy); ctx.lineTo(x0, y0 - 2 * f * sy); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, 'u = v = 2f = ' + 2 * f + ' cm', x0 + 2 * f * sx + 8, y0 - 2 * f * sy - 8, { size: F(11), weight: 800, color: '#e8590c' });
      const im = L5.image(st.u, f);
      if (im.real && im.v <= 70 && st.u <= 60) { ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(x0 + st.u * sx, y0 - im.v * sy, 6, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    upd();
  });

  /* ================= 常考变式：遮住半个透镜、蜡烛变短、交换位置、加眼镜 ================= */
  PS.register('lens-tricks', function (el) {
    const VW = 1000, VH = 400, CY = 210, LX = 520, K = 8, FCM = 10, A = 6; // 透镜直径 6 cm
    const st = { mode: 'cover', cover: false, u: 30, s: 15, ch: 0, swapped: false, glass: 'none', anim: null, fixed: null };
    const off = { c: 0, l: 0, s: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view', style: { background: '#212529' } });
    const ctl = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 光屏上'), view), ctl));
    const S2 = PS.stage(view, { ratio: '4 / 3', draw: paintScreen });
    const mSeg = PS.ui.seg([{ value: 'cover', label: '遮住半个透镜' }, { value: 'short', label: '蜡烛变短' }, { value: 'swap', label: '交换蜡烛和光屏' }, { value: 'glass', label: '加一副眼镜' }], st.mode, (v) => { reset(v); });
    const box = h('div');
    const msg = h('div', { class: 'feedback show info' });
    ctl.append(PS.ui.row(mSeg.el), box, msg);
    function reset(mode) {
      Object.assign(st, { mode, cover: false, u: 30, s: 15, ch: 0, swapped: false, glass: 'none', anim: null, fixed: null });
      off.c = off.l = off.s = 0;
      box.innerHTML = '';
      if (mode === 'cover') box.append(PS.ui.row(PS.ui.toggle('用硬纸板遮住透镜的上半部分', false, (v) => { st.cover = v; upd(); }).el));
      if (mode === 'short') box.append(PS.ui.row(PS.ui.button('🔥 蜡烛燃烧变短', () => { st.ch = Math.min(st.ch + 1.2, 3.6); off.c = off.l = off.s = 0; st.fixed = null; upd(); }, 'btn btn-sm'), PS.ui.button('蜡烛向上调', () => fix('c'), 'btn btn-ghost btn-sm'), PS.ui.button('透镜向下调', () => fix('l'), 'btn btn-ghost btn-sm'), PS.ui.button('光屏向上调', () => fix('s'), 'btn btn-ghost btn-sm')));
      if (mode === 'swap') box.append(PS.ui.row(PS.ui.button('🔄 交换蜡烛和光屏的位置', () => { st.anim = { t: 0, from: [st.u, st.s], to: [st.s, st.u] }; st.swapped = !st.swapped; loop.start(); }, 'btn btn-sm')));
      if (mode === 'glass') box.append(PS.ui.row(PS.ui.seg([{ value: 'none', label: '不戴眼镜' }, { value: 'myopia', label: '近视眼镜（凹透镜）' }, { value: 'hyper', label: '远视眼镜（凸透镜）' }], 'none', (v) => { st.glass = v; st.s = 15; upd(); }).el), PS.ui.row(PS.ui.button('移动光屏，重新找到清晰的像', () => { const v = sys().v; if (v > 0 && v < 55) { st.anim = { t: 0, from: [st.u, st.s], to: [st.u, v] }; loop.start(); } }, 'btn btn-ghost btn-sm')));
      upd();
    }
    // 竖直方向的调节量（cm，向上为正）：c 蜡烛、l 透镜、s 光屏
    function fix(k) {
      if (st.ch === 0) { PS.toast('先让蜡烛燃烧变短'); return; }
      off.c = off.l = off.s = 0;
      const v = sys().v, u = st.u;
      if (k === 'c') off.c = st.ch;
      if (k === 'l') off.l = (-st.ch * v) / (u + v); // 令像点高度 yl − (yo − yl)·v/u = 0
      if (k === 's') off.s = (st.ch * v) / u;
      st.fixed = k; upd();
    }
    // 像点的高度：y′ = yl − (yo − yl)·(v / u)，yo 为烛焰高度、yl 为光心高度
    function imgY0() { const yo = -st.ch + off.c, yl = off.l, v = sys().v, u = st.u; return yl - (yo - yl) * (v / u); }
    // 成像系统：眼镜在透镜左侧 3 cm 处
    function sys() {
      const fg = st.mode === 'glass' ? (st.glass === 'myopia' ? -40 : st.glass === 'hyper' ? 40 : 0) : 0;
      if (!fg) { const im = L5.image(st.u, FCM); return { v: im.v, m: im.m }; }
      const dg = 5, u1 = st.u - dg, i1 = L5.image(u1, fg);
      const u2 = dg - i1.v, i2 = L5.image(u2, FCM);
      return { v: i2.v, m: i1.m * i2.m, fg };
    }
    function upd() {
      const sy = sys(), sharp = Math.abs(st.s - sy.v) < 0.3;
      let t = '';
      if (st.mode === 'cover') t = st.cover ? '遮住透镜的上半部分后，光屏上的像仍然是<b>完整</b>的，只是<b>变暗</b>了。因为烛焰上每一点发出的光都有一部分通过透镜的下半部分会聚成像，只是会聚的光变少了。' : '光屏上有一个清晰、倒立、缩小的像。如果用硬纸板遮住透镜的上半部分，像会变成什么样？';
      else if (st.mode === 'short') {
        const y = imgY0() - off.s;
        if (st.ch === 0) t = '实验进行一段时间后，蜡烛会燃烧变短。点“蜡烛燃烧变短”，看看光屏上的像怎样移动。';
        else if (Math.abs(y) < 0.05) t = '✅ 像又回到了光屏中央。' + ({ c: '把蜡烛向上调', l: '把透镜向下调', s: '把光屏向上调' }[st.fixed] || '') + '都可以。';
        else t = '蜡烛变短，烛焰向下移，光屏上的像<b>向上</b>移动（像是倒立的，过光心的光线方向不变）。要让像回到光屏中央，可以：蜡烛<b>向上</b>调、透镜<b>向下</b>调，或光屏<b>向上</b>调。';
      } else if (st.mode === 'swap') {
        if (st.anim) t = '交换中……';
        else t = (st.swapped ? '交换后，光屏上<b>仍然</b>能得到清晰的像，但变成了<b>倒立、放大</b>的实像（原来是缩小的）。这是因为在折射现象中，<b>光路可逆</b>。' : '现在 u = 30 cm、v = 15 cm，光屏上成倒立、缩小的实像。如果把蜡烛和光屏的位置<b>互换</b>，光屏上还有像吗？');
      } else {
        if (st.glass === 'none') t = '光屏上有清晰的像。在蜡烛和凸透镜之间放一副眼镜，像会怎样变化？';
        else if (sharp) t = '✅ 光屏移到新位置后又得到了清晰的像。' + (st.glass === 'myopia' ? '近视眼镜是<b>凹透镜</b>，对光有发散作用，使像<b>远离</b>透镜——光屏要<b>远离</b>透镜。' : '远视眼镜是<b>凸透镜</b>，对光有会聚作用，使像<b>靠近</b>透镜——光屏要<b>靠近</b>透镜。');
        else t = '放上' + (st.glass === 'myopia' ? '近视眼镜（凹透镜）' : '远视眼镜（凸透镜）') + '后，光屏上的像变<b>模糊</b>了：像成在了光屏的' + (sy.v > st.s ? '<b>后面</b>' : '<b>前面</b>') + '。光屏应该向' + (sy.v > st.s ? '<b>远离</b>' : '<b>靠近</b>') + '透镜的方向移动。';
      }
      msg.className = 'feedback show ' + (t.charAt(0) === '✅' ? 'ok' : 'info');
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    const loop = PS.loop((dt) => {
      if (!st.anim) { loop.stop(); return; }
      st.anim.t = Math.min(1, st.anim.t + dt * 0.7);
      const e = 0.5 - Math.cos(st.anim.t * Math.PI) / 2;
      st.u = PS.lerp(st.anim.from[0], st.anim.to[0], e); st.s = PS.lerp(st.anim.from[1], st.anim.to[1], e);
      if (st.anim.t >= 1) st.anim = null;
      upd();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const f = FCM * K;
      // 光具座
      ctx.fillStyle = '#ced4da'; ctx.fillRect(20, CY + 120, VW - 40, 14);
      for (let c = -60; c <= 60; c += 5) { const x = LX + c * K; if (x < 24 || x > VW - 24) continue; ctx.fillStyle = '#495057'; ctx.fillRect(x, CY + 120, 1.2, c % 10 ? 5 : 9); }
      L5.axis(ctx, { x0: 20, x1: VW - 20, y: CY, cx: LX, f, F, two: true, labels: true });
      const yo = -st.ch + off.c; // 烛焰中心相对主光轴的高度（cm）
      const cx = LX - st.u * K;
      const lensY = CY - off.l * K;
      // 蜡烛：火焰中心在 CY − yo·K
      const fy = CY - yo * K;
      PS.drawCandle(ctx, cx, CY + 120, CY + 120 - fy - 4, { lit: true, w: 20, fh: 24, t: performance.now() / 1000 });
      const P = { x: cx, y: fy - 10 };
      const sy = sys();
      const L = { x: LX, y: lensY, f, H: (A / 2) * K * 2.2 };
      const sx = LX + st.s * K;
      // 眼镜
      let G = null;
      if (st.mode === 'glass' && st.glass !== 'none') {
        G = { x: LX - 5 * K, y: CY, f: sy.fg * K, H: L.H };
        L5.draw(ctx, G.x, CY, L.H, { type: st.glass === 'myopia' ? 'concave' : 'convex', w: 18, center: false, stroke: '#7048e8', fill: 'rgba(208,191,255,.5)' });
        D.text(ctx, st.glass === 'myopia' ? '近视眼镜' : '远视眼镜', G.x, CY - L.H - 12, { size: F(12), weight: 800, color: '#7048e8', align: 'center' });
      }
      // 光线：从烛焰射向透镜的几条光线
      const ks = st.mode === 'cover' && st.cover ? [0.15, 0.45, 0.8] : [-0.8, -0.4, 0, 0.4, 0.8];
      ks.forEach((k) => {
        let p = P, q0 = { x: LX, y: lensY + k * L.H };
        let d = V.norm(V.sub(q0, p));
        const pts = [p];
        if (G) { const r = L5.through(p, d, G); if (!r) return; pts.push(r.q); p = r.q; d = r.d; }
        const r2 = L5.through(p, d, L);
        if (!r2) return;
        pts.push(r2.q);
        const t = (sx - r2.q.x) / r2.d.x;
        pts.push(V.add(r2.q, V.mul(r2.d, t)));
        PS.beam(ctx, pts, { color: '#f76707', width: 1.6, alpha: 0.85 });
      });
      L5.draw(ctx, LX, lensY, L.H, { type: 'convex', w: 26 });
      if (st.mode === 'cover' && st.cover) { ctx.fillStyle = '#495057'; ctx.fillRect(LX - 22, lensY - L.H - 10, 12, L.H + 10); D.text(ctx, '硬纸板', LX - 28, lensY - L.H - 16, { size: F(12), weight: 800, color: '#495057', align: 'right' }); }
      ctx.fillStyle = '#868e96'; ctx.fillRect(LX - 3, lensY + L.H, 6, CY + 120 - lensY - L.H);
      // 光屏
      const scY = CY - off.s * K;
      L5.screen(ctx, sx, scY, 70, { stand: CY + 120 - scY - 70, label: '光屏', fs: F(12) });
      D.dim(ctx, cx, LX, CY + 160, 'u = ' + st.u.toFixed(1) + ' cm', { size: F(12), color: '#2b8a3e' });
      D.dim(ctx, LX, sx, CY + 160, '光屏 ' + st.s.toFixed(1) + ' cm', { size: F(12), color: '#7048e8' });
      ctx.restore();
    }
    function paintScreen(ctx, w, hh) {
      ctx.save();
      const SW = 400, SH = 300;
      PS.virtual(ctx, w, hh, SW, SH);
      ctx.fillStyle = '#212529'; ctx.fillRect(0, 0, SW, SH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(40, 20, 320, 260);
      ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.moveTo(200, 20); ctx.lineTo(200, 280); ctx.moveTo(40, 150); ctx.lineTo(360, 150); ctx.stroke();
      const sy = sys(), PX = 34; // 每厘米 34 单位
      const v = sy.v;
      const yo = -st.ch + off.c, yl = off.l;
      // 主光线过光心：光屏上的位置（相对光屏中心，向上为正）
      const kk = st.s / (v || 1e9);
      const yImg = (yl - (yo - yl) * (v / st.u)); // 像点高度
      const yOn = yl + (yImg - yl) * kk - off.s;
      const scale = sy.m * kk;
      const blurR = (A / 2) * Math.abs(1 - st.s / v) * PX;
      const bright = (st.mode === 'cover' && st.cover ? 0.5 : 1) * PS.clamp(Math.pow(15 / st.s, 2) * 0.9, 0.35, 1.2);
      ctx.save(); ctx.beginPath(); ctx.rect(40, 20, 320, 260); ctx.clip();
      L5.blur(ctx, Math.min(blurR, 80), (c) => {
        c.save(); c.translate(200, 150 - yOn * PX); c.scale((scale * PX) / 18, (scale * PX) / 18); // 烛焰图形按每厘米 18 单位画
        // 烛焰（局部坐标：火焰中心在原点，向上为负）
        const g = c.createRadialGradient(0, 4, 1, 0, -2, 22);
        g.addColorStop(0, 'rgba(255,250,220,' + bright + ')'); g.addColorStop(0.5, 'rgba(255,212,59,' + bright + ')'); g.addColorStop(1, 'rgba(255,146,43,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, -30); c.bezierCurveTo(16, -10, 14, 14, 0, 16); c.bezierCurveTo(-14, 14, -16, -10, 0, -30); c.fill();
        c.fillStyle = 'rgba(160,160,150,' + 0.6 * bright + ')'; c.fillRect(-10, 16, 20, 60);
        c.restore();
      }, { op: 'source-over', max: 26 });
      ctx.restore();
      ctx.restore();
    }
    reset('cover');
  });

  /* ================= 凸透镜成像规律随机练习 ================= */
  PS.register('lens-quiz', function (el) {
    const Q = L5.quiz('🎲 随机出题：凸透镜成像规律', next);
    el.append(Q.el);
    const IMG = ['倒立、缩小的实像', '倒立、等大的实像', '倒立、放大的实像', '不成像', '正立、放大的虚像'];
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function choose(correct, wrongs, n) { const opts = shuffle([correct].concat(shuffle(wrongs.slice()).slice(0, (n || 4) - 1))); return { opts, ans: opts.indexOf(correct) }; }
    let last = -1;
    function next() {
      let k; do { k = PS.randInt(0, 5); } while (k === last); last = k;
      if (k === 0) {
        const f = PS.pick([5, 8, 10, 12, 15, 20]);
        const z = PS.randInt(0, 4);
        const u = [PS.round(f * PS.rand(2.3, 4), 0), 2 * f, PS.round(f * PS.rand(1.2, 1.8), 0), f, PS.round(f * PS.rand(0.3, 0.8), 0)][z];
        const R = L5.rule(u, f);
        Q.ask('一个凸透镜的焦距为 ' + f + ' cm，把物体放在距透镜 ' + u + ' cm 处，成的像是（　）', IMG.slice(), R.zone, '2f = ' + 2 * f + ' cm。u = ' + u + ' cm，' + ['u &gt; 2f', 'u = 2f', 'f &lt; u &lt; 2f', 'u = f', 'u &lt; f'][R.zone] + '，' + (R.zone === 3 ? '不成像。' : '成' + R.text + '。'), 1);
      } else if (k === 1) {
        // 已知物距和像的性质，求焦距范围
        const u = PS.pick([16, 20, 24, 30]);
        const z = PS.pick([0, 2, 4]);
        let lo, hi;
        if (z === 0) { lo = 0; hi = u / 2; } else if (z === 2) { lo = u / 2; hi = u; } else { lo = u; hi = 99; }
        const cand = [Math.round(u * 0.3), Math.round(u * 0.75), u, Math.round(u * 1.4)];
        const good = cand.filter((x) => x > lo && x < hi);
        const corr = good[0];
        const wr = cand.filter((x) => x !== corr);
        const c = choose(corr + ' cm', wr.map((x) => x + ' cm'));
        Q.ask('物体到凸透镜的距离为 ' + u + ' cm 时，' + ['在光屏上得到倒立、缩小的像', '', '在光屏上得到倒立、放大的像', '', '透过透镜看到正立、放大的像'][z] + '，则该凸透镜的焦距可能是（　）', c.opts, c.ans,
          ['u &gt; 2f，即 ' + u + ' cm &gt; 2f，所以 f &lt; ' + u / 2 + ' cm。', '', 'f &lt; u &lt; 2f，即 f &lt; ' + u + ' cm &lt; 2f，所以 ' + u / 2 + ' cm &lt; f &lt; ' + u + ' cm。', '', 'u &lt; f，所以 f &gt; ' + u + ' cm。'][z]);
      } else if (k === 2) {
        // 已知 u、v（光屏上成清晰的像）
        const f = PS.pick([8, 10, 12, 15]);
        const big = Math.random() < 0.5;
        const u0 = big ? PS.round(f * PS.rand(1.3, 1.7), 0) : PS.round(f * PS.rand(2.4, 3.2), 0);
        const v0 = Math.round((u0 * f) / (u0 - f));
        const c = choose(big ? '倒立、放大的实像，应用于投影仪' : '倒立、缩小的实像，应用于照相机', ['倒立、放大的实像，应用于照相机', '倒立、缩小的实像，应用于投影仪', '正立、放大的虚像，应用于放大镜', big ? '倒立、缩小的实像，应用于照相机' : '倒立、放大的实像，应用于投影仪']);
        Q.ask('在探究凸透镜成像规律的实验中，蜡烛到透镜的距离为 ' + u0 + ' cm 时，光屏在透镜另一侧 ' + v0 + ' cm 处得到清晰的像，这个像是（　）', c.opts, c.ans, '光屏上能承接，是实像（倒立）。' + (big ? 'u &lt; v，像是放大的——投影仪。' : 'u &gt; v，像是缩小的——照相机。'), 1);
      } else if (k === 3) {
        const toward = Math.random() < 0.5;
        const c = choose(toward ? '远离透镜，像变大' : '靠近透镜，像变小', ['远离透镜，像变小', '靠近透镜，像变大', toward ? '靠近透镜，像变小' : '远离透镜，像变大']);
        Q.ask('凸透镜成实像时，把蜡烛向' + (toward ? '<b>靠近</b>' : '<b>远离</b>') + '透镜的方向移动一段距离，要在光屏上再次得到清晰的像，光屏应（　）', c.opts, c.ans, '成实像时“物近像远像变大，物远像近像变小”。', 1);
      } else if (k === 4) {
        const f = PS.pick([5, 8, 10, 12, 15]);
        const c = choose(f + ' cm', [2 * f + ' cm', 4 * f + ' cm', f / 2 + ' cm']);
        Q.ask('小明用同一个凸透镜做实验，发现物距 u 和像距 v 都等于 ' + 2 * f + ' cm 时，光屏上得到倒立、等大的像。这个凸透镜的焦距是（　）', c.opts, c.ans, 'u = v = 2f 时成倒立、等大的实像，所以 2f = ' + 2 * f + ' cm，f = ' + f + ' cm。');
      } else {
        const it = PS.pick([
          ['照相机', 'u &gt; 2f', 'f &lt; v &lt; 2f'],
          ['投影仪', 'f &lt; u &lt; 2f', 'v &gt; 2f'],
          ['放大镜', 'u &lt; f', '像与物同侧'],
        ]);
        const all = ['u &gt; 2f', 'u = 2f', 'f &lt; u &lt; 2f', 'u &lt; f'];
        const c = choose(it[1], all.filter((x) => x !== it[1]));
        Q.ask('使用' + it[0] + '时，物体到镜头（透镜）的距离 u 与焦距 f 的关系是（　）', c.opts, c.ans, it[0] + '：' + it[1] + '，' + it[2] + '。');
      }
    }
    next();
  });
})();
