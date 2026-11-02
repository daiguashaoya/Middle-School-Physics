/* 第5章第1节：透镜——认识凸透镜和凹透镜、生活中的透镜分类、烟室中透镜对光的作用、测量焦距、焦距与什么有关、三条特殊光线、透镜作图练习。依赖 optics.js、lens.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const L5 = PS.lens;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const RAY = '#f76707';

  /* ================= 认识凸透镜和凹透镜（六种截面） ================= */
  PS.register('lens-shapes', function (el) {
    const VW = 1000, VH = 540, CY = 372, CX = 500;
    const KINDS = [['A', 'bi-convex'], ['B', 'plano-convex'], ['C', 'bi-concave'], ['D', 'meniscus-convex'], ['E', 'meniscus-concave'], ['F', 'plano-concave']];
    const st = { sel: 0, rays: true, axis: true, judged: {} };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const rT = PS.ui.toggle('让平行光通过', true, (v) => { st.rays = v; S.render(); });
    const aT = PS.ui.toggle('主光轴和光心', true, (v) => { st.axis = v; S.render(); });
    const score = h('span', { class: 'small muted' });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(h('b', null, '这块透镜是：'), PS.ui.button('凸透镜', () => judge(true), 'btn btn-sm'), PS.ui.button('凹透镜', () => judge(false), 'btn btn-sm'), score), PS.ui.row(rT.el, aT.el), msg);
    const big = (k) => L5.surfaces(k, CX, 118, 230, 7);
    const small = (k, i) => L5.surfaces(k, cardX(i), 52, 96, 4);
    const cardX = (i) => 92 + i * 163;
    function judge(cvx) {
      const S0 = big(KINDS[st.sel][1]), ok = S0.convex === cvx;
      st.judged[st.sel] = ok;
      ok ? PS.sound.good() : PS.sound.bad();
      const n = Object.keys(st.judged).length;
      if (n < 6) { const nx = KINDS.findIndex((_, i) => !(i in st.judged)); upd(ok, S0); if (nx >= 0) setTimeout(() => { if (Object.keys(st.judged).length === n) { st.sel = nx; upd(); } }, 2600); }
      else upd(ok, S0);
    }
    function upd(res, S0) {
      S0 = S0 || big(KINDS[st.sel][1]);
      const n = Object.keys(st.judged).length, ok = Object.values(st.judged).filter(Boolean).length;
      score.innerHTML = '已判断 ' + n + ' / 6 · 答对 ' + ok;
      const tc = (S0.tc / 10).toFixed(1), te = (S0.te / 10).toFixed(1);
      const name = KINDS[st.sel][0];
      let t;
      if (res == null) t = '点击上面的透镜 <b>' + KINDS.map((k) => k[0]).join('、') + '</b> 选择一块，比较它<b>中间</b>和<b>边缘</b>的厚度，再判断它是凸透镜还是凹透镜。';
      else {
        t = (res ? '✔ 正确！' : '✘ 不对。') + '透镜 ' + name + ' 中间厚 ' + tc + ' mm、边缘厚 ' + te + ' mm，' + (S0.convex ? '<b>中间厚、边缘薄</b>，是<b>凸透镜</b>。平行光通过后<b>会聚</b>。' : '<b>中间薄、边缘厚</b>，是<b>凹透镜</b>。平行光通过后<b>发散</b>。');
        if (S0.kind === 'meniscus-concave') t += '<br>⚠️ 注意：它的一面虽然向外凸，但<b>中间比边缘薄</b>，仍然是凹透镜——判断时要比较中间和边缘的<b>厚度</b>，不能只看表面凸不凸。';
        if (n === 6) t += '<br>🎉 六块都判断完了：<b>A、B、D</b> 是凸透镜，<b>C、E、F</b> 是凹透镜。';
      }
      msg.className = 'feedback show ' + (res == null ? 'info' : res ? 'ok' : 'bad');
      msg.innerHTML = t;
      S.render();
    }
    PS.drag(S, {
      VW, VH,
      hit: () => null,
      hover: (p) => p.y < 175,
      click: (p) => { if (p.y > 175) return; const i = Math.round((p.x - 92) / 163); if (i >= 0 && i < 6) { st.sel = i; PS.sound.tick(); upd(); } },
    });
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      // 上方：六块透镜
      KINDS.forEach(([n, k], i) => {
        const x = cardX(i), on = i === st.sel;
        ctx.fillStyle = on ? '#e7f5ff' : '#fff'; ctx.strokeStyle = on ? '#339af0' : '#dee2e6'; ctx.lineWidth = on ? 2.5 : 1.2;
        D.roundRect(ctx, x - 74, 14, 148, 150, 12); ctx.fill(); ctx.stroke();
        L5.drawShape(ctx, small(k, i), 82);
        D.text(ctx, n, x - 58, 40, { size: F(17), weight: 800, color: on ? '#1c7ed6' : '#495057' });
        if (i in st.judged) D.text(ctx, st.judged[i] ? '✔' : '✘', x + 52, 40, { size: F(17), weight: 800, color: st.judged[i] ? '#2b8a3e' : '#e03131' });
      });
      D.text(ctx, '点击选择 ↑', VW - 14, 190, { size: F(12), color: '#868e96', align: 'right' });
      // 下方：放大的截面
      const S0 = big(KINDS[st.sel][1]);
      const n = 1.5;
      if (st.axis) {
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.3; ctx.setLineDash([10, 4, 2, 4]);
        ctx.beginPath(); ctx.moveTo(30, CY); ctx.lineTo(VW - 30, CY); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '主光轴', VW - 34, CY - 8, { size: F(13), weight: 700, color: '#495057', align: 'right' });
      }
      if (st.rays) {
        const ys = [-84, -52, -20, 20, 52, 84];
        ys.forEach((y) => {
          const pts = L5.clipEnd(L5.traceReal({ x: 40, y: CY + y }, { x: 1, y: 0 }, S0, CY, n, 900), 0, 200, VW, VH);
          PS.beam(ctx, pts, { color: RAY, width: 2.2, glow: true, arrow: true, head: 11 });
          if (!S0.convex && pts.out) {
            const q = pts[pts.length - 2];
            const back = O.along(q, V.mul(pts.out, -1), 420);
            PS.beam(ctx, L5.clipEnd([q, back], 0, 200, VW, VH), { color: '#f59f00', width: 1.3, dash: [6, 5], alpha: 0.8 });
          }
        });
      }
      L5.drawShape(ctx, S0, CY, { lw: 2.5 });
      // 厚度标注
      const x0c = S0[0].x, x1c = S0[1].x;
      const yE = CY - S0[0].H + 3;
      const x0e = S0[0].x + L5.sag(S0[0].R, S0[0].H - 3), x1e = S0[1].x + L5.sag(S0[1].R, S0[0].H - 3);
      ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.strokeStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(x0c, CY); ctx.lineTo(x1c, CY); ctx.stroke();
      ctx.strokeStyle = '#7048e8'; ctx.beginPath(); ctx.moveTo(x0e, yE); ctx.lineTo(x1e, yE); ctx.stroke();
      const tx = CX + 170;
      D.text(ctx, '中间厚 ' + (S0.tc / 10).toFixed(1) + ' mm', tx, CY + 108, { size: F(14), weight: 800, color: '#e03131', bg: 'rgba(255,255,255,.9)' });
      D.text(ctx, '边缘厚 ' + (S0.te / 10).toFixed(1) + ' mm', tx, CY + 138, { size: F(14), weight: 800, color: '#7048e8', bg: 'rgba(255,255,255,.9)' });
      if (st.axis) {
        ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(CX, CY, 4.5, 0, TAU); ctx.fill();
        D.text(ctx, '光心 O', CX + 10, CY + 22, { size: F(13), weight: 800, color: '#1b2333', bg: 'rgba(255,255,255,.85)' });
      }
      D.text(ctx, '透镜 ' + KINDS[st.sel][0] + ' 的截面（放大）', 24, 222, { size: F(15), weight: 800, color: '#1b2333' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 生活中的透镜：凸透镜、凹透镜还是面镜 ================= */
  PS.register('lens-sort', function (el) {
    PS.sortCards(el, [
      ['🔍 放大镜', 0, '中间厚、边缘薄'],
      ['👓 老花镜（远视眼镜）的镜片', 0, '摸上去中间厚、边缘薄'],
      ['👓 近视眼镜的镜片', 1, '中间薄、边缘厚'],
      ['📷 照相机的镜头', 0, '镜头相当于一个凸透镜'],
      ['📽️ 投影仪的镜头', 0, '镜头相当于一个凸透镜'],
      ['💧 荷叶上的小水珠', 0, '水珠中间厚、边缘薄，相当于凸透镜，透过它看叶脉被放大了'],
      ['🥛 装满水的圆柱形玻璃杯（横着看）', 0, '水柱中间厚、边缘薄，横向相当于凸透镜'],
      ['❄️ 磨成中间厚的冰块（“削冰取火”）', 0, '冰透镜是凸透镜，能把太阳光会聚起来点燃干草'],
      ['🚪 防盗门上的“猫眼”', 1, '“猫眼”（门镜）前面的镜片相当于凹透镜，从屋里能看到门外较大范围的景物'],
      ['⚪ 中间向外凸、但比边缘薄的镜片', 1, '判断依据是厚度：中间薄、边缘厚就是凹透镜'],
      ['🚗 汽车的后视镜（观后镜）', 2, '它是凸面镜，利用光的<b>反射</b>，不让光透过，不是透镜'],
      ['🏠 平整的窗户玻璃', 2, '两个面都是平面、中间和边缘一样厚，不是透镜'],
    ], ['凸透镜', '凹透镜', '不是透镜']);
  });

  /* ================= 烟室中透镜对光的作用（会聚与发散） ================= */
  PS.register('lens-action', function (el) {
    const VW = 1000, VH = 500, CY = 250, LX = 520, FF = 170, LH = 150;
    const st = { lens: 'convex', src: 'par', k: 2, ghost: true, marks: true, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const lSeg = PS.ui.seg([{ value: 'none', label: '不放透镜' }, { value: 'convex', label: '凸透镜' }, { value: 'concave', label: '凹透镜' }], st.lens, (v) => { st.lens = v; upd(); });
    const sSeg = PS.ui.seg([{ value: 'par', label: '平行光' }, { value: 'div', label: '点光源（发散光）' }, { value: 'conv', label: '会聚光' }], st.src, (v) => { st.src = v; kS.el.style.display = v === 'par' ? 'none' : ''; kS.set(st.k, true); upd(); });
    const kS = PS.ui.slider({ label: '距离', min: 0.4, max: 3, step: 0.1, value: st.k, fmt: (v) => (Math.abs(v - 1) < 1e-6 ? '= f' : v.toFixed(1) + ' f'), onInput: (v) => { st.k = v; upd(); } });
    kS.el.classList.add('wide'); kS.el.style.display = 'none';
    const gT = PS.ui.toggle('对比：不放透镜时的光路', true, (v) => { st.ghost = v; S.render(); });
    const mT = PS.ui.toggle('主光轴和焦点', true, (v) => { st.marks = v; S.render(); });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(lSeg.el, sSeg.el), PS.ui.row(kS.el, gT.el, mT.el), msg);
    const f = () => (st.lens === 'concave' ? -FF : FF);
    const ys = [-120, -80, -40, 0, 40, 80, 120];
    function source() {
      // 返回每条光线的起点和方向
      if (st.src === 'par') return ys.map((y) => ({ p: { x: 70, y: CY + y }, d: { x: 1, y: 0 } }));
      if (st.src === 'div') { const P = { x: LX - st.k * FF, y: CY }; return ys.map((y) => ({ p: P, d: V.norm(V.sub({ x: LX, y: CY + y }, P)) })); }
      const C = { x: LX + st.k * FF, y: CY };
      return ys.map((y) => {
        const q = { x: LX, y: CY + y }, d = V.norm(V.sub(C, q));
        let t = (LX - 70) / d.x;
        if (Math.abs(d.y * t) > 200) t = 200 / Math.abs(d.y || 1e-9);
        return { p: V.sub(q, V.mul(d, t)), d };
      });
    }
    function paths() {
      return source().map((r) => {
        const ghost = L5.clipEnd([r.p, O.along(r.p, r.d, 2000)], 40, 40, VW - 40, VH - 40);
        if (st.lens === 'none') return { pts: ghost, ghost };
        const tr = L5.through(r.p, r.d, { x: LX, y: CY, f: f(), H: LH });
        if (!tr) return { pts: ghost, ghost };
        return { pts: L5.clipEnd([r.p, tr.q, O.along(tr.q, tr.d, 2000)], 40, 40, VW - 40, VH - 40), ghost, q: tr.q, d: tr.d };
      });
    }
    function upd() {
      const fv = f(), lensN = st.lens === 'convex' ? '凸透镜' : '凹透镜';
      let t;
      if (st.lens === 'none') t = '没有透镜时，光在烟雾（空气）中沿<b>直线</b>传播。放上凸透镜或凹透镜看看光路有什么变化。';
      else if (st.src === 'par') t = st.lens === 'convex' ? '平行于主光轴的光经凸透镜折射后<b>会聚</b>于主光轴上的一点——这一点叫做凸透镜的<b>焦点 F</b>。凸透镜对光有<b>会聚作用</b>，也叫会聚透镜。' : '平行于主光轴的光经凹透镜折射后<b>发散</b>，折射光线的<b>反向延长线</b>相交于主光轴上的一点——凹透镜的<b>虚焦点 F</b>（没有实际光线会聚）。凹透镜对光有<b>发散作用</b>，也叫发散透镜。';
      else if (st.src === 'div') {
        const k = st.k;
        if (st.lens === 'convex') {
          if (Math.abs(k - 1) < 0.05) t = '点光源放在凸透镜的<b>焦点</b>上：从焦点发出的光经凸透镜折射后变成<b>平行光</b>（光路可逆）。手电筒、探照灯就是这样得到平行光的。';
          else if (k < 1) t = '点光源在焦点以内：通过凸透镜后的光<b>仍然是发散的</b>，但比原来（虚线）<b>收拢</b>了一些——这仍然是<b>会聚作用</b>的体现！会聚作用是指光线比原来更靠拢，不一定相交。';
          else t = '点光源在焦点以外：发散的光经凸透镜折射后会聚于一点（这就是光源的<b>像</b>点，第3节会详细研究）。光线比原来更靠拢——<b>会聚作用</b>。';
        } else t = '发散的光经过凹透镜后变得<b>更加发散</b>——凹透镜对光有<b>发散作用</b>。';
      } else {
        const k = st.k;
        if (st.lens === 'convex') t = '原本会聚的光经过凸透镜后<b>会聚得更厉害</b>，交点比原来（虚线）<b>提前</b>了——会聚作用。';
        else if (Math.abs(k - 1) < 0.05) t = '会聚光原本射向凹透镜另一侧的焦点，经凹透镜折射后变成了<b>平行光</b>：会聚的光变平行了，这是<b>发散作用</b>。';
        else if (k < 1) t = '会聚的光经过凹透镜后<b>仍然会聚</b>，但交点比原来（虚线）<b>推后</b>了——光线比原来更散开，仍然是<b>发散作用</b>。';
        else t = '会聚的光经过凹透镜后变成了<b>发散</b>的光——发散作用。';
      }
      if (st.lens !== 'none' && st.src !== 'par') t += '<br><span class="small">判断会聚还是发散，要把折射光线和<b>原来的传播方向</b>（虚线）比较，而不是看折射光线是否相交。</span>';
      msg.innerHTML = t;
      void fv;
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      PS.darkRoom(ctx, VW, VH, '#1d2433');
      // 烟雾
      for (let i = 0; i < 7; i++) {
        const x = (VW * ((i * 0.17 + st.t * 0.012 * (1 + i * 0.13)) % 1.2)) - 60, y = 120 + ((i * 97) % 280) + Math.sin(st.t * 0.3 + i) * 20;
        const g = ctx.createRadialGradient(x, y, 10, x, y, 190);
        g.addColorStop(0, 'rgba(200,210,230,.07)'); g.addColorStop(1, 'rgba(200,210,230,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 190, y - 190, 380, 380);
      }
      // 玻璃烟室
      ctx.strokeStyle = 'rgba(165,216,255,.35)'; ctx.lineWidth = 3;
      D.roundRect(ctx, 34, 34, VW - 68, VH - 68, 18); ctx.stroke();
      D.text(ctx, '烟室（喷了烟雾的透明盒子）', 50, 62, { size: F(12), weight: 700, color: 'rgba(222,226,230,.7)' });
      const P = paths();
      if (st.marks) {
        L5.axis(ctx, { x0: 40, x1: VW - 40, y: CY, cx: LX, f: st.lens === 'none' ? 0 : FF, F, dark: true, dash: [8, 6], labels: st.lens !== 'none' });
      }
      if (st.ghost && st.lens !== 'none') P.forEach((r) => PS.beam(ctx, r.ghost, { color: 'rgba(255,255,255,.35)', width: 1.2, dash: [6, 6] }));
      // 凹透镜：反向延长线
      if (st.lens === 'concave' && st.src === 'par') P.forEach((r) => { if (r.q && Math.abs(r.q.y - CY) > 1) PS.beam(ctx, [r.q, O.along(r.q, V.mul(r.d, -1), FF * 1.02 / Math.abs(r.d.x))], { color: '#ffd43b', width: 1.3, dash: [5, 5], alpha: 0.85 }); });
      P.forEach((r) => PS.beam(ctx, r.pts, { color: '#ff922b', width: 2.4, glow: 'rgba(255,146,43,.28)', arrow: true, head: 12 }));
      // 光点沿光路运动
      P.forEach((r, i) => {
        const pts = r.pts, segs = [];
        let tot = 0;
        for (let k = 1; k < pts.length; k++) { const l = V.dist(pts[k - 1], pts[k]); segs.push(l); tot += l; }
        for (let m = 0; m < 3; m++) {
          let s = ((st.t * 260 + m * tot / 3 + i * 37) % tot);
          for (let k = 0; k < segs.length; k++) { if (s <= segs[k]) { const p = V.lerp(pts[k], pts[k + 1], s / segs[k]); ctx.fillStyle = 'rgba(255,236,180,.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill(); break; } s -= segs[k]; }
        }
      });
      if (st.lens !== 'none') L5.draw(ctx, LX, CY, LH + 14, { type: st.lens, w: 30, alpha: 0.95, center: false });
      // 光源
      if (st.src === 'par') {
        ctx.fillStyle = '#495057'; D.roundRect(ctx, 40, CY - 140, 34, 280, 8); ctx.fill();
        ctx.fillStyle = '#ffe066'; ctx.fillRect(70, CY - 132, 5, 264);
        D.text(ctx, '平行光源', 46, CY + 162, { size: F(12), weight: 700, color: '#ced4da' });
      } else if (st.src === 'div') {
        const x = LX - st.k * FF;
        PS.drawBulb(ctx, x, CY, 10, { base: false });
      }
      if (st.lens === 'none' && st.src === 'conv') D.text(ctx, '会聚点', LX + st.k * FF, CY - 14, { size: F(12), weight: 700, color: '#ffd43b', align: 'center' });
      ctx.restore();
    }
    upd(); loop.start();
  });

  /* ================= 测量凸透镜的焦距（太阳光） ================= */
  PS.register('lens-focus', function (el, opts) {
    const lab = !!opts.lab;
    const VW = 1000, VH = 560, LXc = 290, LY = 112, K = 16, DL = 8; // 每厘米 16 单位，透镜直径 8 cm
    const FT = 10; // 焦距 10 cm
    const st = { type: 'convex', s: 5, heat: 0, burn: 0, smoke: [], rows: [], t: 0 };
    const wrap = h('div', { class: lab ? 'bench' : '' });
    const left = h('div'), side = h('div', { class: lab ? 'bench-side' : '' });
    wrap.append(left, side); el.append(wrap);
    const S = PS.stage(left, { ratio: VW + ' / ' + VH, draw: paint });
    const tSeg = PS.ui.seg([{ value: 'convex', label: '凸透镜' }, { value: 'concave', label: '凹透镜' }], st.type, (v) => { st.type = v; st.heat = 0; upd(); });
    const sS = PS.ui.slider({ label: '白纸到透镜', min: 1, max: 25, step: 0.1, value: st.s, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.s = v; upd(); } });
    if (!lab) sS.el.classList.add('wide');
    const rS = PS.ui.readout('纸到透镜的距离', '—', 'accent'), rD = PS.ui.readout('光斑直径', '—', 'primary'), rB = PS.ui.readout('光斑亮度', '—');
    const msg = h('div', { class: 'feedback show info' + (lab ? ' small' : '') });
    let tbody, analysis;
    if (lab) {
      tbody = h('tbody'); analysis = h('div', { class: 'small' });
      left.append(msg);
      side.append(h('div', { class: 'panel' }, h('h4', null, '① 选择透镜，正对太阳光'), h('div', { class: 'row' }, tSeg.el)),
        h('div', { class: 'panel' }, h('h4', null, '② 移动白纸（也可以在画面上拖动）'), h('div', { class: 'row' }, sS.el)),
        h('div', { class: 'panel' }, h('h4', null, '③ 观察与读数'), h('div', { class: 'readouts', style: { marginTop: 0 } }, rS.el, rD.el), h('div', { class: 'row' }, PS.ui.button('📝 记录这一组', record, 'btn btn-primary btn-sm'), PS.ui.button('清空', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
        h('div', { class: 'panel' }, h('h4', null, '④ 数据记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '透镜'), h('th', null, '纸到透镜/cm'), h('th', null, '光斑直径/cm'), h('th', null, '亮度'))), tbody))),
        h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis));
    } else el.append(PS.ui.row(tSeg.el, sS.el), h('div', { class: 'readouts' }, rS.el, rD.el, rB.el), msg);
    const fv = () => (st.type === 'convex' ? FT : -6); // 凹透镜焦距 6 cm（画面放得下虚焦点）
    function spot() { const s = st.s, f = fv(); return Math.max(DL * Math.abs(1 - s / f), 0.0093 * s * 1.6); }
    function bright() { const d = spot(); return (DL * DL) / (d * d); }
    function brightText() { const b = bright(); return b > 400 ? '<span class="hl-g">最亮</span>' : b > 12 ? '很亮' : b > 1.6 ? '较亮' : b > 0.8 ? '与阳光差不多' : '比阳光暗'; }
    function upd() {
      rS.set(st.s.toFixed(1) + ' cm');
      const d = spot();
      rD.set(d < 0.25 ? '约 ' + d.toFixed(2) + ' cm' : d.toFixed(1) + ' cm');
      rB.set(brightText());
      let t;
      if (st.type === 'convex') {
        if (Math.abs(st.s - FT) < 0.15) t = '✅ 白纸上的光斑<b>最小、最亮</b>——太阳光（平行光）会聚在了<b>焦点</b>上。此时白纸到凸透镜光心的距离就是<b>焦距</b>：<b>f = ' + FT.toFixed(1) + ' cm</b>。' + (st.burn > 0.2 ? '<br>🔥 持续一段时间，焦点处的纸被烧焦了——凸透镜会聚的阳光能量集中。' : '<br>保持一会儿，看看会发生什么？');
        else if (st.s < FT) t = '光斑比透镜小，但还不是最小。继续把白纸<b>远离</b>透镜。';
        else t = '光斑又变大、变暗了——光在焦点会聚后又散开了。把白纸<b>靠近</b>透镜一些。';
      } else t = '凹透镜正对太阳光：白纸上的光斑总是<b>比透镜还大、比阳光还暗</b>，无论怎样移动白纸都找不到最小、最亮的点——凹透镜对光有<b>发散作用</b>，它的焦点是折射光线<b>反向延长线</b>的交点（虚焦点）。';
      msg.innerHTML = t;
      S.render();
    }
    function record() {
      const d = spot();
      if (st.rows.some((r) => r.type === st.type && Math.abs(r.s - st.s) < 0.05)) { PS.toast('这个位置已经记录过了，换个位置'); return; }
      st.rows.push({ type: st.type, s: PS.round(st.s, 1), d, b: brightText().replace(/<[^>]+>/g, '') });
      if (st.rows.length > 8) st.rows.shift();
      PS.sound.tick(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.type === 'convex' ? '凸' : '凹'), h('td', null, r.s.toFixed(1)), h('td', null, r.d < 0.25 ? '≈0.1' : r.d.toFixed(1)), h('td', null, r.b))));
      const cv = st.rows.filter((r) => r.type === 'convex');
      const near = cv.filter((r) => r.s < FT - 0.1).length, far = cv.filter((r) => r.s > FT + 0.1).length, at = cv.some((r) => Math.abs(r.s - FT) < 0.15);
      const items = [
        ['纸在焦点以内：光斑随距离增大而<b>变小</b>（已测 ' + near + ' 组）', near >= 1],
        ['找到光斑<b>最小、最亮</b>的位置并记录', at],
        ['纸在焦点以外：光斑又<b>变大</b>（已测 ' + far + ' 组）', far >= 1],
        ['换成凹透镜：光斑总比透镜大（发散作用）', st.rows.some((r) => r.type === 'concave')],
      ];
      analysis.innerHTML = items.map(([t, ok]) => (ok ? '✅ ' : '⬜ ') + t).join('<br>') + (at ? '<br><b class="hl-g">结论：光斑最小最亮时，纸到凸透镜的距离就是焦距，f = ' + FT.toFixed(1) + ' cm。</b>' : '');
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => (Math.abs(p.y - (LY + st.s * K)) < 18 && Math.abs(p.x - LXc) < 170 ? 'paper' : null),
      move: (k, p) => { st.s = PS.clamp(PS.round((p.y - LY) / K, 1), 1, 25); sS.set(st.s, true); upd(); },
    });
    const loop = PS.loop((dt) => {
      st.t += dt;
      const b = bright();
      if (st.type === 'convex' && b > 400) st.heat = Math.min(1.5, st.heat + dt * 0.45); else st.heat = Math.max(0, st.heat - dt * 0.6);
      if (st.heat > 1) { const was = st.burn; st.burn = Math.min(1, st.burn + dt * 0.25); if (was <= 0.2 && st.burn > 0.2) upd(); }
      if (st.heat > 0.6 && Math.random() < dt * 14) st.smoke.push({ x: LXc + PS.rand(-4, 4), y: LY + st.s * K - 4, a: 0.5, r: 4 });
      st.smoke.forEach((s) => { s.y -= dt * 40; s.x += Math.sin(st.t * 3 + s.y * 0.05) * dt * 14; s.r += dt * 9; s.a -= dt * 0.25; });
      st.smoke = st.smoke.filter((s) => s.a > 0);
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      // 天空
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#d0ebff'); g.addColorStop(1, '#f1f8ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      // 太阳
      ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(60, 40, 26, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,212,59,.25)'; ctx.beginPath(); ctx.arc(60, 40, 40, 0, TAU); ctx.fill();
      D.text(ctx, '太阳光（平行光）', 98, 46, { size: F(12), weight: 700, color: '#e67700' });
      const r0 = (DL / 2) * K, yP = LY + st.s * K, f = fv() * K;
      const xs = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1].map((k) => k * r0 * 0.94);
      // 光锥
      const half = (spot() / 2) * K;
      const conv = st.type === 'convex';
      ctx.fillStyle = 'rgba(255,224,102,.28)';
      ctx.beginPath(); ctx.moveTo(LXc - r0 * 0.94, LY);
      if (conv && st.s > FT) { ctx.lineTo(LXc, LY + f); ctx.lineTo(LXc - half, yP); ctx.lineTo(LXc + half, yP); ctx.lineTo(LXc, LY + f); }
      else { ctx.lineTo(LXc - half, yP); ctx.lineTo(LXc + half, yP); }
      ctx.lineTo(LXc + r0 * 0.94, LY); ctx.closePath(); ctx.fill();
      // 光线
      xs.forEach((x) => {
        const p0 = { x: LXc + x, y: 70 };
        PS.beam(ctx, [p0, { x: LXc + x, y: LY }], { color: '#f59f00', width: 1.6, arrow: true, head: 9 });
        // 透镜水平放置：出射光线（或其反向延长线）过焦点 P
        const q = { x: LXc + x, y: LY };
        const P = { x: LXc, y: LY + f };
        const d = conv ? V.norm(V.sub(P, q)) : V.norm(V.sub(q, P));
        const t = (yP - LY) / d.y;
        PS.beam(ctx, [q, V.add(q, V.mul(d, t))], { color: '#f76707', width: 1.6 });
        if (!conv) PS.beam(ctx, [q, P], { color: '#f59f00', width: 1, dash: [4, 4], alpha: 0.75 });
      });
      // 透镜（水平放置）
      ctx.save(); ctx.translate(LXc, LY); ctx.rotate(Math.PI / 2);
      L5.draw(ctx, 0, 0, r0, { type: st.type, w: 22, center: false });
      ctx.restore();
      // 焦点
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(LXc, LY + Math.abs(f) * (conv ? 1 : -1), 3.5, 0, TAU); ctx.fill();
      D.text(ctx, conv ? 'F' : 'F（虚焦点）', LXc + 10, LY + Math.abs(f) * (conv ? 1 : -1) + 4, { size: F(12), weight: 800, color: '#e8590c' });
      // 白纸
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1;
      ctx.fillRect(LXc - 160, yP, 320, 6); ctx.strokeRect(LXc - 160, yP, 320, 6);
      const bb = Math.min(1, bright() / 30);
      ctx.fillStyle = 'rgba(255,240,150,' + (0.35 + 0.65 * bb) + ')'; ctx.fillRect(LXc - Math.max(half, 1.5), yP - 1, Math.max(half, 1.5) * 2, 4);
      if (st.burn > 0) { ctx.fillStyle = 'rgba(60,40,20,' + Math.min(0.9, st.burn * 1.4) + ')'; ctx.fillRect(LXc - 2 - st.burn * 6, yP, 4 + st.burn * 12, 6); }
      D.text(ctx, '白纸（可拖动）', LXc + 168, yP + 6, { size: F(12), weight: 700, color: '#495057' });
      st.smoke.forEach((s) => { ctx.fillStyle = 'rgba(134,142,150,' + s.a + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); });
      // 刻度尺（竖直）
      const RX = 70;
      ctx.fillStyle = 'rgba(255,249,219,.95)'; ctx.fillRect(RX - 4, LY, 46, 25 * K + 6);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1;
      ctx.strokeRect(RX - 4, LY, 46, 25 * K + 6);
      for (let c = 0; c <= 25; c++) {
        const y = LY + c * K;
        ctx.beginPath(); ctx.moveTo(RX + 42, y); ctx.lineTo(RX + 42 - (c % 5 ? 8 : 15), y); ctx.stroke();
        if (c % 5 === 0) D.text(ctx, String(c), RX + 2, y + 4, { size: F(11), weight: 700, color: '#495057' });
      }
      D.text(ctx, 'cm', RX + 2, LY + 25 * K + 20, { size: F(11), color: '#495057' });
      ctx.strokeStyle = '#e8590c'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(RX + 42, yP); ctx.lineTo(LXc - 160, yP); ctx.stroke(); ctx.setLineDash([]);
      // 右侧：俯视光斑
      const IX = 610, IY = 70, IW = 360, IH = 360, cx = IX + IW / 2, cy = IY + IH / 2, k2 = 14;
      D.text(ctx, '白纸上的光斑（俯视）', IX, IY - 12, { size: F(14), weight: 800, color: '#1b2333' });
      ctx.save();
      D.roundRect(ctx, IX, IY, IW, IH, 10); ctx.clip();
      ctx.fillStyle = '#d9d4c7'; ctx.fillRect(IX, IY, IW, IH);
      // 透镜的影子以外是阳光照亮的纸
      ctx.fillStyle = '#f8f4ea'; ctx.fillRect(IX, IY, IW, IH);
      const sr = Math.max(1.2, (spot() / 2) * k2);
      const lr = (DL / 2) * k2;
      // 透镜挡住的区域（阴影）
      ctx.fillStyle = '#bfb8a6'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(lr, sr), 0, TAU); ctx.fill();
      const br = bright();
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr * 1.25 + 4);
      const a = PS.clamp(0.25 + Math.log10(1 + br) * 0.32, 0.2, 1);
      gg.addColorStop(0, 'rgba(255,255,240,' + a + ')'); gg.addColorStop(0.8, 'rgba(255,236,150,' + a * 0.9 + ')'); gg.addColorStop(1, 'rgba(255,236,150,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(cx, cy, sr * 1.25 + 4, 0, TAU); ctx.fill();
      if (br > 400) { const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30); g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, TAU); ctx.fill(); }
      if (st.burn > 0) { ctx.fillStyle = 'rgba(40,25,10,' + Math.min(0.95, st.burn * 1.5) + ')'; ctx.beginPath(); ctx.arc(cx, cy, 3 + st.burn * 16, 0, TAU); ctx.fill(); if (st.burn > 0.6) { ctx.fillStyle = 'rgba(255,120,0,.8)'; ctx.beginPath(); ctx.arc(cx, cy, 3 + st.burn * 5, 0, TAU); ctx.fill(); } }
      ctx.strokeStyle = 'rgba(28,126,214,.5)'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(cx, cy, lr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      D.text(ctx, '虚线圆：透镜的大小（直径 8 cm）', IX, IY + IH + 20, { size: F(12), color: '#495057' });
      D.text(ctx, '亮度：' + brightText().replace(/<[^>]+>/g, ''), IX, IY + IH + 44, { size: F(13), weight: 800, color: '#e8590c' });
      ctx.restore();
    }
    if (lab) table();
    upd(); loop.start();
  });

  /* ================= 凸透镜的焦距与什么因素有关 ================= */
  PS.register('focal-factors', function (el) {
    const VW = 1000, VH = 520, K = 22, LXc = 250;
    const LENSES = {
      A: { mat: '玻璃', n: 1.5, R: 10, shape: '较凸' },
      B: { mat: '树脂', n: 1.6, R: 10, shape: '较凸' },
      C: { mat: '玻璃', n: 1.5, R: 16, shape: '较扁' },
      D: { mat: '水晶', n: 1.54, R: 16, shape: '较扁' },
    };
    const st = { pick: ['A', 'C'] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const btns = Object.keys(LENSES).map((k) => {
      const b = PS.ui.button('<b>' + k + '</b> ' + LENSES[k].mat + ' · ' + LENSES[k].shape, () => toggle(k), 'btn btn-sm');
      b._k = k; return b;
    });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(h('span', { class: 'small', html: '选两块透镜比较：' }), ...btns), msg);
    function toggle(k) {
      if (st.pick.indexOf(k) >= 0) return;
      st.pick = [st.pick[1], k];
      PS.sound.tick(); upd();
    }
    function surf(L, cx, cy) { return L5.surfaces('bi-convex', cx, 2.4 * K, L.R * K, 3); }
    function focus(L, cy) {
      const S0 = surf(L, LXc, cy);
      const pts = L5.traceReal({ x: 30, y: cy - 2 }, { x: 1, y: 0 }, S0, cy, L.n, 900);
      const q = pts[pts.length - 2], d = pts.out;
      return (q.x + ((cy - q.y) / d.y) * d.x - LXc) / K;
    }
    function upd() {
      btns.forEach((b) => b.className = 'btn btn-sm' + (st.pick.indexOf(b._k) >= 0 ? ' btn-primary' : ''));
      const [a, b] = st.pick.map((k) => LENSES[k]);
      const fa = focus(a, 0), fb = focus(b, 0);
      let t;
      const sameMat = a.mat === b.mat, sameShape = a.R === b.R;
      if (sameMat && !sameShape) t = '✅ 材料相同、凸起程度不同（控制变量）：' + (a.R < b.R ? st.pick[0] : st.pick[1]) + ' 更凸，焦距更<b>小</b>。结论：材料相同时，凸透镜表面越凸，焦距越小（对光的会聚能力越强）。';
      else if (sameShape && !sameMat) t = '✅ 形状相同、材料不同（控制变量）：焦距分别为 ' + fa.toFixed(1) + ' cm 和 ' + fb.toFixed(1) + ' cm。结论：凸透镜的焦距与<b>材料</b>有关。';
      else t = '⚠️ 这两块透镜的<b>材料和凸起程度都不同</b>，焦距不同不能说明是哪个因素造成的。探究时要<b>控制变量</b>：比较凸起程度选 A、C；比较材料选 A、B（或 C、D）。';
      msg.className = 'feedback show ' + (t.charAt(0) === '✅' ? 'ok' : 'bad');
      msg.innerHTML = t;
      S.render();
    }
    function panel(ctx, F, key, y0) {
      const L = LENSES[key], cy = y0 + 120;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2;
      D.roundRect(ctx, 14, y0 + 8, VW - 28, 236, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, '透镜 ' + key + '：' + L.mat + '，' + L.shape, 30, y0 + 34, { size: F(15), weight: 800, color: '#1b2333' });
      const S0 = surf(L, LXc, cy);
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, cy); ctx.lineTo(VW - 30, cy); ctx.stroke();
      [-46, -30, -15, 15, 30, 46].forEach((y) => {
        const pts = L5.clipEnd(L5.traceReal({ x: 30, y: cy + y }, { x: 1, y: 0 }, S0, cy, L.n, 900), 20, y0 + 40, VW - 24, y0 + 236);
        PS.beam(ctx, pts, { color: RAY, width: 1.8, arrow: true, head: 9 });
      });
      L5.drawShape(ctx, S0, cy);
      const fx = focus(L, cy);
      const xF = LXc + fx * K;
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(xF, cy, 4.5, 0, TAU); ctx.fill();
      D.dim(ctx, LXc, xF, cy + 70, 'f ≈ ' + fx.toFixed(1) + ' cm', { color: '#e8590c', size: F(13) });
      ctx.strokeStyle = 'rgba(232,89,12,.4)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(xF, cy); ctx.lineTo(xF, cy + 70); ctx.moveTo(LXc, cy + 50); ctx.lineTo(LXc, cy + 78); ctx.stroke(); ctx.setLineDash([]);
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      panel(ctx, F, st.pick[0], 0);
      panel(ctx, F, st.pick[1], 260);
      ctx.restore();
    }
    upd();
  });

  /* ================= 三条特殊光线 ================= */
  PS.register('special-rays', function (el) {
    const VW = 1000, VH = 520, CY = 270, LX = 500, FF = 170, LH = 200;
    const st = { type: 'convex', ray: 'par', rev: false, P: { x: 170, y: 150 } };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const tSeg = PS.ui.seg([{ value: 'convex', label: '凸透镜' }, { value: 'concave', label: '凹透镜' }], st.type, (v) => { st.type = v; upd(); });
    const rSeg = PS.ui.seg([{ value: 'par', label: '① 平行于主光轴' }, { value: 'ctr', label: '② 过光心' }, { value: 'foc', label: '③ 过焦点' }, { value: 'all', label: '三条一起' }], st.ray, (v) => { st.ray = v; upd(); });
    const vT = PS.ui.toggle('光路可逆（光反向传播）', false, (v) => { st.rev = v; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(tSeg.el, vT.el), PS.ui.row(rSeg.el), msg);
    const fz = () => (st.type === 'convex' ? FF : -FF);
    const FL = { x: LX - FF, y: CY }, FR = { x: LX + FF, y: CY };
    function dirOf(kind) {
      const P = st.P;
      if (kind === 'par') return { x: 1, y: 0 };
      if (kind === 'ctr') return V.norm(V.sub({ x: LX, y: CY }, P));
      if (st.type === 'convex') { const d = V.norm(V.sub(P, FL)); return P.x > FL.x + 1 ? d : V.mul(d, -1); }
      return V.norm(V.sub(FR, P));
    }
    function trace(kind) {
      const d = dirOf(kind);
      const tr = L5.through(st.P, d, { x: LX, y: CY, f: fz(), H: LH });
      if (!tr) return null;
      return { P: st.P, q: tr.q, d: tr.d, end: L5.clipEnd([tr.q, O.along(tr.q, tr.d, 1500)], 10, 10, VW - 10, VH - 10)[1], kind };
    }
    const TXT = {
      convex: {
        par: '平行于主光轴的光线，经凸透镜折射后<b>通过另一侧的焦点</b>。',
        ctr: '通过<b>光心</b>的光线，经凸透镜后传播方向<b>不变</b>。',
        foc: '通过<b>焦点</b>的光线，经凸透镜折射后<b>平行于主光轴</b>射出。',
      },
      concave: {
        par: '平行于主光轴的光线，经凹透镜折射后发散，折射光线的<b>反向延长线通过同侧的虚焦点</b>。',
        ctr: '通过<b>光心</b>的光线，经凹透镜后传播方向<b>不变</b>。',
        foc: '射向<b>异侧虚焦点</b>（延长线过另一侧焦点）的光线，经凹透镜折射后<b>平行于主光轴</b>射出。',
      },
    };
    function upd() {
      const T = TXT[st.type];
      rSeg.el.querySelectorAll('button')[2].innerHTML = st.type === 'convex' ? '③ 过焦点' : '③ 射向异侧焦点';
      let t;
      if (st.ray === 'all') {
        t = '从同一点 S 发出的三条特殊光线：' + (st.type === 'convex' ? '①②③ 经凸透镜后' + (st.P.x < FL.x ? '<b>相交于一点 S′</b>——这就是 S 的<b>实像</b>（下一节会用到）。' : '<b>反向延长线</b>相交于一点 S′——S 的<b>虚像</b>。') : '经凹透镜后都发散，反向延长线相交于 S′——S 的<b>虚像</b>。') + '<br>作图时只要画出其中<b>两条</b>就能确定像点。';
      } else t = T[st.ray];
      if (st.rev) t += '<br>↩ 光路可逆：让光逆着折射光线射入，就会逆着原来的入射光线射出。' + (st.type === 'convex' && st.ray === 'par' ? '所以①③其实是一对：过焦点的光折射后平行于主光轴。' : '');
      const miss = (st.ray === 'all' ? ['par', 'ctr', 'foc'] : [st.ray]).some((k) => !trace(k));
      t += miss ? '<br>⚠️ 有光线没有射到透镜上，把 S 拖远一点或靠近主光轴一点。' : '<br><span class="small muted">拖动光线的起点 S 试试，规律总是成立。</span>';
      msg.innerHTML = t;
      S.render();
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => (V.dist(p, st.P) < 30 ? 'P' : null),
      move: (k, p) => {
        let x = PS.clamp(p.x, 40, LX - 40), y = PS.clamp(p.y, CY - LH + 12, CY + LH - 12);
        if (Math.abs(y - CY) < 14) y = CY + (y < CY ? -14 : 14);
        if (st.type === 'convex' && Math.abs(x - FL.x) < 10 && (st.ray === 'foc' || st.ray === 'all')) x = FL.x + (x < FL.x ? -10 : 10);
        st.P = { x, y }; upd();
      },
    });
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      L5.axis(ctx, { x0: 20, x1: VW - 20, y: CY, cx: LX, f: FF, F, two: true });
      L5.draw(ctx, LX, CY, LH, { type: st.type, w: 34 });
      const kinds = st.ray === 'all' ? ['par', 'ctr', 'foc'] : [st.ray];
      const cols = { par: '#e8590c', ctr: '#1c7ed6', foc: '#2b8a3e' };
      const rays = kinds.map(trace).filter(Boolean);
      rays.forEach((r) => {
        const c = cols[r.kind];
        // 凸透镜过焦点：入射光线从 S 出发，若 S 在 F 右侧，画出过 F 的虚线辅助
        if (st.type === 'convex' && r.kind === 'foc' && st.P.x > FL.x) PS.beam(ctx, [FL, st.P], { color: c, width: 1.2, dash: [5, 5], alpha: 0.7 });
        if (st.type === 'concave' && r.kind === 'foc') PS.beam(ctx, [r.q, FR], { color: c, width: 1.2, dash: [5, 5], alpha: 0.7 });
        const pts = [r.P, r.q, r.end];
        if (st.rev) PS.beam(ctx, pts.slice().reverse(), { color: c, width: 2.6, arrow: true, head: 13 });
        else PS.beam(ctx, pts, { color: c, width: 2.6, arrow: true, head: 13 });
        // 反向延长线（虚线）
        const needBack = st.type === 'concave' ? r.kind !== 'ctr' : (st.ray === 'all' && st.P.x > FL.x);
        if (needBack && Math.abs(r.d.y) > 1e-4) PS.beam(ctx, L5.clipEnd([r.q, O.along(r.q, V.mul(r.d, -1), 1200)], 10, 10, VW - 10, VH - 10), { color: c, width: 1.2, dash: [6, 5], alpha: 0.75 });
      });
      // 像点
      if (st.ray === 'all' && rays.length >= 2) {
        const a = rays[0], b = rays[1];
        const X = O.lineLine(a.q, a.d, b.q, b.d);
        if (X && X.x > -500 && X.x < VW + 500 && X.y > -300 && X.y < VH + 300 && X.x > 0 && X.x < VW && X.y > 0 && X.y < VH) {
          ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.arc(X.x, X.y, 6, 0, TAU); ctx.fill();
          D.text(ctx, X.x > LX ? 'S′（实像）' : 'S′（虚像）', X.x + 10, X.y - 10, { size: F(14), weight: 800, color: '#7048e8', bg: 'rgba(255,255,255,.85)' });
        }
      }
      ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(st.P.x, st.P.y, 7, 0, TAU); ctx.fill();
      PS.handle(ctx, st.P.x, st.P.y, 11, '#1b2333', 'S（拖动）', F);
      D.text(ctx, st.type === 'convex' ? '凸透镜' : '凹透镜', LX, CY - LH - 12, { size: F(14), weight: 800, color: '#1c7ed6', align: 'center' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 透镜作图练习（自动判分） ================= */
  PS.register('lens-draw', function (el) {
    const VW = 1000, VH = 480, CY = 240, LX = 500, FF = 160, LH = 190, RR = 250;
    const TASKS = [
      ['convex', 'in', 'par'], ['convex', 'in', 'ctr'], ['convex', 'in', 'foc'],
      ['concave', 'in', 'par'], ['concave', 'in', 'ctr'], ['concave', 'in', 'foc'],
      ['convex', 'out', 'par'], ['convex', 'out', 'foc'], ['concave', 'out', 'par'], ['concave', 'out', 'foc'],
    ];
    const st = { task: null, ans: 0, user: 0, done: false, show: false, n: 0, ok: 0, last: -1 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const stem = h('div', { class: 'lj-stem', style: { fontSize: '1.02rem' } });
    const score = h('span', { class: 'small muted' });
    const msg = h('div', { class: 'feedback' });
    el.prepend(stem);
    el.append(PS.ui.row(PS.ui.button('✔ 检查', check, 'btn btn-primary btn-sm'), PS.ui.button('显示答案', () => { st.show = true; S.render(); }, 'btn btn-ghost btn-sm'), PS.ui.button('下一题 →', next, 'btn btn-sm'), score), msg);
    const FL = { x: LX - FF, y: CY }, FR = { x: LX + FF, y: CY };
    function next() {
      let i; do { i = PS.randInt(0, TASKS.length - 1); } while (i === st.last);
      st.last = i;
      const [type, io, kind] = TASKS[i];
      const f = type === 'convex' ? FF : -FF;
      const hgt = PS.pick([-1, 1]) * PS.randInt(60, 150);
      const q = { x: LX, y: CY + hgt };
      let din, dout;
      // din：入射光方向；dout：折射光方向
      if (io === 'in') {
        if (kind === 'par') din = { x: 1, y: 0 };
        else if (kind === 'ctr') { q.y = CY; din = V.norm({ x: 1, y: PS.pick([-1, 1]) * PS.rand(0.25, 0.45) }); }
        else din = type === 'convex' ? V.norm(V.sub(q, FL)) : V.norm(V.sub(FR, q));
        dout = L5.through(V.sub(q, V.mul(din, 10)), din, { x: LX, y: CY, f, H: 1e4 }).d;
      } else {
        // 已知折射光线：par 表示折射光线平行于主光轴，foc 表示折射光线（或其反向延长线）过焦点
        if (kind === 'par') { dout = { x: 1, y: 0 }; din = type === 'convex' ? V.norm(V.sub(q, FL)) : V.norm(V.sub(FR, q)); }
        else { din = { x: 1, y: 0 }; dout = L5.through(V.sub(q, { x: 10, y: 0 }), din, { x: LX, y: CY, f, H: 1e4 }).d; }
      }
      st.task = { type, io, kind, q, din, dout, f };
      st.ans = io === 'in' ? V.ang(dout) : V.ang(V.mul(din, -1));
      st.user = st.ans + PS.pick([-1, 1]) * PS.rand(18, 32) * DEG;
      st.done = false; st.show = false;
      const tn = type === 'convex' ? '凸透镜' : '凹透镜';
      const what = io === 'in'
        ? { par: '平行于主光轴的入射光线', ctr: '过光心的入射光线', foc: type === 'convex' ? '过焦点 F 的入射光线' : '射向另一侧焦点 F 的入射光线' }[kind] + '，画出它经' + tn + '折射后的光线。'
        : { par: '已知经' + tn + '折射后的光线<b>平行于主光轴</b>，画出对应的入射光线。', foc: '已知经' + tn + '折射后的光线' + (type === 'convex' ? '<b>过焦点 F</b>' : '的<b>反向延长线过焦点 F</b>') + '，画出对应的入射光线。' }[kind];
      stem.innerHTML = '📝 ' + (io === 'in' ? '图中是' : '') + what + '<span class="small muted">（拖动橙色圆点调整光线方向，再点“检查”）</span>';
      msg.className = 'feedback';
      S.render();
    }
    function check() {
      if (st.done) return;
      const da = Math.abs(Math.atan2(Math.sin(st.user - st.ans), Math.cos(st.user - st.ans))) / DEG;
      const ok = da < 3.5;
      st.done = true; st.n++; if (ok) st.ok++; st.show = true;
      score.innerHTML = '答对 ' + st.ok + ' / ' + st.n;
      const T = st.task;
      const rule = {
        convex: { par: '平行于主光轴的光线经凸透镜折射后过焦点', ctr: '过光心的光线传播方向不变', foc: '过焦点的光线经凸透镜折射后平行于主光轴' },
        concave: { par: '平行于主光轴的光线经凹透镜折射后，反向延长线过同侧焦点', ctr: '过光心的光线传播方向不变', foc: '射向异侧焦点的光线经凹透镜折射后平行于主光轴' },
      };
      let k = T.kind;
      if (T.io === 'out') k = T.kind === 'par' ? 'foc' : 'par';
      msg.className = 'feedback show ' + (ok ? 'ok' : 'bad');
      msg.innerHTML = (ok ? '✔ 画对了！' : '✘ 偏了 ' + da.toFixed(0) + '°。绿色是正确的光线。') + '依据：' + rule[T.type][k] + '。' + (T.type === 'concave' && k !== 'ctr' ? '注意凹透镜要用<b>虚线</b>画出反向延长线。' : '');
      ok ? PS.sound.good() : PS.sound.bad();
      S.render();
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => { if (st.done || !st.task) return null; const E = O.along(st.task.q, V.dir(st.user), RR); return V.dist(p, E) < 32 ? 'E' : null; },
      move: (k, p) => {
        let a = V.ang(V.sub(p, st.task.q));
        if (st.task.io === 'in' && Math.cos(a) < 0.05) a = Math.sign(Math.sin(a)) * Math.acos(0.05);
        if (st.task.io === 'out' && Math.cos(a) > -0.05) a = Math.sign(Math.sin(a) || 1) * Math.acos(-0.05);
        st.user = a; S.render();
      },
    });
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const T = st.task;
      if (!T) { ctx.restore(); return; }
      L5.axis(ctx, { x0: 20, x1: VW - 20, y: CY, cx: LX, f: FF, F });
      L5.draw(ctx, LX, CY, LH, { type: T.type, w: 32 });
      const q = T.q;
      const clip = (a, b) => L5.clipEnd([a, b], 8, 8, VW - 8, VH - 8);
      // 已知光线
      if (T.io === 'in') {
        PS.beam(ctx, clip(q, O.along(q, V.mul(T.din, -1), 1200)).reverse(), { color: '#1b2333', width: 2.6, arrow: true, head: 13 });
        if (T.type === 'concave' && T.kind === 'foc') PS.beam(ctx, clip(q, FR), { color: '#1b2333', width: 1.2, dash: [6, 5], alpha: 0.7 });
      } else {
        PS.beam(ctx, clip(q, O.along(q, T.dout, 1200)), { color: '#1b2333', width: 2.6, arrow: true, head: 13 });
        if (T.type === 'concave' && T.kind === 'foc') PS.beam(ctx, clip(q, FL), { color: '#1b2333', width: 1.2, dash: [6, 5], alpha: 0.7 });
      }
      // 答案
      if (st.show) {
        const c = '#2b8a3e';
        if (T.io === 'in') {
          PS.beam(ctx, clip(q, O.along(q, T.dout, 1200)), { color: c, width: 3, arrow: true, head: 13, alpha: 0.9 });
          if (T.type === 'concave' && T.kind !== 'ctr') PS.beam(ctx, clip(q, T.kind === 'par' ? FL : O.along(q, V.mul(T.dout, -1), 600)), { color: c, width: 1.4, dash: [6, 5] });
        } else {
          PS.beam(ctx, clip(q, O.along(q, V.mul(T.din, -1), 1200)).reverse(), { color: c, width: 3, arrow: true, head: 13, alpha: 0.9 });
          if (T.type === 'concave' && T.kind === 'par') PS.beam(ctx, clip(q, FR), { color: c, width: 1.4, dash: [6, 5] });
        }
      }
      // 学生画的光线
      const E = O.along(q, V.dir(st.user), RR);
      const uc = st.done ? '#adb5bd' : '#f76707';
      if (T.io === 'in') PS.beam(ctx, [q, E], { color: uc, width: 2.6, arrow: 'end', head: 14 });
      else PS.beam(ctx, [E, q], { color: uc, width: 2.6, arrow: true, head: 14 });
      if (!st.done) PS.handle(ctx, E.x, E.y, 12, '#f76707', '拖动', F);
      ctx.restore();
    }
    if (!document.getElementById('lj-style')) document.head.append(h('style', { id: 'lj-style' }, '.lj-stem{font-size:1.15rem;font-weight:700;margin:10px 0 12px;padding:14px 16px;background:var(--surface-2);border-radius:12px;border:1px solid var(--line)}.lj-btns{display:flex;flex-wrap:wrap;gap:8px}'));
    next();
  });
})();
