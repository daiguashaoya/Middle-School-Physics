/* 第5章第5节：显微镜和望远镜——显微镜两次放大（光路、放大倍数、移动装片）、开普勒望远镜（视角放大、交换物镜和目镜）、视角、探索宇宙（尺度与排序）。依赖 optics.js、lens.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const L5 = PS.lens;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  /* 洋葱表皮细胞（显微镜视野用）：画在以 (0,0) 为中心、边长 2S 的区域 */
  function cells(ctx, S, seed) {
    ctx.fillStyle = '#f3f0e1'; ctx.fillRect(-S, -S, 2 * S, 2 * S);
    ctx.strokeStyle = '#a17c4a'; ctx.lineWidth = 2;
    const cw = 64, ch = 26;
    let r = seed || 7;
    const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
    for (let y = -S - ch, row = 0; y < S + ch; y += ch, row++) {
      const off = (row % 2) * cw * 0.5;
      for (let x = -S - cw + off; x < S + cw; x += cw) {
        ctx.beginPath(); ctx.rect(x + rnd() * 3, y + rnd() * 2, cw - 4, ch - 3); ctx.stroke();
        ctx.fillStyle = 'rgba(120,80,40,.55)'; ctx.beginPath(); ctx.ellipse(x + cw * (0.3 + rnd() * 0.4), y + ch * 0.5, 5, 4, 0, 0, TAU); ctx.fill();
      }
    }
  }

  /* ================= 显微镜：两次放大 ================= */
  PS.register('microscope', function (el) {
    const VW = 1000, VH = 420, CY = 190;
    const st = { ob: 10, ey: 10, ox: 0, oy: 0, task: null };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view' });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 显微镜视野（看到的像）'), view), rgt));
    const S2 = PS.stage(view, { ratio: '1 / 1', draw: paintView });
    const oSeg = PS.ui.seg([4, 10, 40].map((v) => ({ value: v, label: '物镜 ' + v + '×' })), st.ob, (v) => { st.ob = v; upd(); });
    const eSeg = PS.ui.seg([5, 10, 16].map((v) => ({ value: v, label: '目镜 ' + v + '×' })), st.ey, (v) => { st.ey = v; upd(); });
    const mv = (dx, dy) => () => { st.ox = PS.clamp(st.ox + dx, -3, 3); st.oy = PS.clamp(st.oy + dy, -3, 3); upd(); };
    const rM = PS.ui.readout('放大倍数', '—', 'accent');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(oSeg.el), PS.ui.row(eSeg.el), PS.ui.row(h('span', { class: 'small', html: '移动装片：' }), PS.ui.button('← 向左', mv(-1, 0), 'btn btn-ghost btn-sm'), PS.ui.button('向右 →', mv(1, 0), 'btn btn-ghost btn-sm'), PS.ui.button('↑ 向上', mv(0, -1), 'btn btn-ghost btn-sm'), PS.ui.button('向下 ↓', mv(0, 1), 'btn btn-ghost btn-sm'), PS.ui.button('🎯 挑战', task, 'btn btn-sm')), h('div', { class: 'readouts' }, rM.el), msg);
    function task() {
      st.ox = PS.pick([-2, 2]); st.oy = PS.pick([-2, 2]); st.task = true;
      upd();
    }
    function upd() {
      const M = st.ob * st.ey;
      rM.set(st.ey + ' × ' + st.ob + ' = <b>' + M + '</b> 倍');
      let t = '物镜相当于<b>投影仪</b>：标本在物镜的一倍焦距和二倍焦距之间，成<b>倒立、放大的实像</b>；目镜相当于<b>放大镜</b>：这个实像在目镜的一倍焦距以内，再成<b>正立、放大的虚像</b>。经过两次放大，最终看到的是<b>倒立、放大的虚像</b>。<br>显微镜的放大倍数 = 目镜的放大倍数 × 物镜的放大倍数。';
      if (st.task) {
        // 视野中细胞的位置与装片移动方向相反
        const at = st.ox === 0 && st.oy === 0;
        const pos = (st.ox < 0 ? '右' : st.ox > 0 ? '左' : '') + (st.oy < 0 ? '下' : st.oy > 0 ? '上' : '');
        t = at ? '✅ 标记的细胞到了视野中央！显微镜成倒立的像，像的移动方向与装片的移动方向<b>相反</b>：像在视野哪个方向，装片就向哪个方向移动。' : '🎯 挑战：把带<b>红点</b>的细胞移到视野中央。它现在在视野的<b>' + (pos || '中央') + '方</b>，装片该怎样移动？';
        if (at) st.task = false;
        msg.className = 'feedback show ' + (at ? 'ok' : 'info');
      } else msg.className = 'feedback show info';
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      // 物镜 f1 = 60，标本在物镜左侧 78（f < u < 2f）；目镜 f2 = 160，实像在目镜焦点以内
      const X1 = 200, f1 = 60, X2 = 560, f2 = 160;
      const ox = X1 - 78, oh = 15;
      const i1 = L5.image(78, f1), A1 = { x: X1 + i1.v, y: CY - oh * i1.m };
      const u2 = X2 - A1.x, i2 = L5.image(u2, f2);
      const A2 = { x: X2 + i2.v, y: CY - (CY - A1.y) * i2.m };
      L5.axis(ctx, { x0: 20, x1: VW - 20, y: CY, cx: X1, f: f1, F, labels: false });
      [[X1, f1], [X2, f2]].forEach(([x, f]) => [-1, 1].forEach((s) => { ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(x + s * f, CY, 3.5, 0, TAU); ctx.fill(); }));
      D.text(ctx, 'F₁', X1 + f1, CY + 20, { size: F(12), weight: 800, color: '#e8590c', align: 'center' });
      D.text(ctx, 'F₂', X2 - f2, CY + 20, { size: F(12), weight: 800, color: '#e8590c', align: 'center' });
      const B = { x: ox, y: CY - oh };
      const L1 = { x: X1, y: CY, f: f1, H: 1e4 }, L2 = { x: X2, y: CY, f: f2, H: 1e4 };
      // 第一次成像
      [{ x: 1, y: 0 }, V.norm(V.sub({ x: X1, y: CY }, B))].forEach((d) => {
        const r = L5.through(B, d, L1);
        PS.beam(ctx, [B, r.q, A1], { color: '#f76707', width: 1.8, arrow: true, head: 10 });
      });
      // 第二次成像：从 A1 出发的两条光线
      [{ x: 1, y: 0 }, V.norm(V.sub({ x: X2, y: CY }, A1))].forEach((d) => {
        const r = L5.through(A1, d, L2);
        PS.beam(ctx, L5.clipEnd([A1, r.q, O.along(r.q, r.d, 400)], 0, 0, VW - 10, VH), { color: '#1c7ed6', width: 1.8, arrow: true, head: 10 });
        PS.beam(ctx, L5.clipEnd([r.q, A2], 0, 0, VW, VH), { color: '#74c0fc', width: 1.2, dash: [6, 5] });
      });
      L5.arrowObj(ctx, ox, CY, oh, { color: '#2b8a3e', width: 3.5, head: 10, label: '标本', fs: F(12) });
      L5.arrowObj(ctx, A1.x, CY, CY - A1.y, { color: '#e8590c', width: 3.5, head: 12, label: '倒立放大的实像', fs: F(12) });
      if (A2.y > -400) L5.arrowObj(ctx, A2.x, CY, Math.max(-(CY - 20), CY - A2.y), { color: '#7048e8', width: 3.5, head: 12, dash: true, label: '最终看到的虚像', fs: F(12) });
      L5.draw(ctx, X1, CY, 60, { type: 'convex', w: 26 });
      L5.draw(ctx, X2, CY, 80, { type: 'convex', w: 22 });
      D.text(ctx, '物镜（相当于投影仪）', X1, CY - 76, { size: F(13), weight: 800, color: '#1c7ed6', align: 'center' });
      D.text(ctx, '目镜（相当于放大镜）', X2, CY - 96, { size: F(13), weight: 800, color: '#1c7ed6', align: 'center' });
      PS.drawEye(ctx, X2 + 100, CY, Math.PI, 20);
      ctx.restore();
    }
    function paintView(ctx, w, hh) {
      ctx.save();
      PS.virtual(ctx, w, hh, 300, 300);
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 300, 300);
      ctx.save();
      ctx.beginPath(); ctx.arc(150, 150, 140, 0, TAU); ctx.clip();
      const z = (st.ob * st.ey) / 100; // 相对 100 倍
      ctx.translate(150, 150); ctx.scale(z, z);
      // 装片向右移，像向左移（倒立）
      ctx.translate(-st.ox * 30, -st.oy * 30);
      cells(ctx, 400, 11);
      if (st.task !== null) { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); }
      ctx.restore();
      const g = ctx.createRadialGradient(150, 150, 100, 150, 150, 142);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(150, 150, 142, 0, TAU); ctx.fill();
      ctx.restore();
    }
    upd();
  });

  /* ================= 望远镜：视角变大 ================= */
  PS.register('telescope', function (el) {
    const VW = 1000, VH = 400, CY = 200;
    const st = { swap: false, f1: 360 };
    const TH = 3.2 * DEG; // 月亮上下边缘对眼睛的张角的一半（示意）
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view' });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 看月亮'), view), rgt));
    const S2 = PS.stage(view, { ratio: '1 / 1', draw: paintView });
    const fS = PS.ui.slider({ label: '物镜焦距', min: 240, max: 420, step: 20, value: st.f1, fmt: (v) => (v / 10) + ' cm', onInput: (v) => { st.f1 = v; upd(); } });
    const sT = PS.ui.toggle('交换物镜和目镜', false, (v) => { st.swap = v; upd(); });
    const rM = PS.ui.readout('视角放大', '—', 'accent');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(fS.el), PS.ui.row(sT.el), h('div', { class: 'readouts' }, rM.el), msg);
    const F2 = 90;
    const fa = () => (st.swap ? F2 : st.f1), fb = () => (st.swap ? st.f1 : F2);
    function upd() {
      const M = fa() / fb();
      rM.set(M >= 1 ? '约 ' + M.toFixed(1) + ' 倍' : '约 ' + M.toFixed(2) + ' 倍（变小）');
      msg.innerHTML = st.swap ? '把焦距短的透镜放在前面（当物镜），看到的月亮反而<b>变小</b>了。望远镜的物镜焦距<b>长</b>、目镜焦距<b>短</b>。' : '物镜相当于<b>照相机</b>：使远处的物体在焦点附近成<b>倒立、缩小的实像</b>；目镜相当于<b>放大镜</b>，把这个像放大。像虽然比月亮本身小得多，但它离眼睛很近，<b>视角</b>变大了，所以看起来变大、变近了。物镜焦距越长，视角放大得越多。<br><span class="small">物镜直径大，能会聚更多的光，像更明亮。</span>';
      S.render(); S2.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const f1 = fa(), f2 = fb(), X1 = 120, X2 = X1 + f1 + f2, XF = X1 + f1;
      L5.axis(ctx, { x0: 20, x1: VW - 20, y: CY, cx: X1, f: 0, F, labels: false });
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(XF, CY, 4, 0, TAU); ctx.fill();
      D.text(ctx, '两透镜的焦点重合', XF, CY - 16, { size: F(12), weight: 700, color: '#e8590c', align: 'center' });
      // 来自月亮上边缘的平行光（向下倾斜）
      const d = V.dir(TH);
      const I = { x: XF, y: CY + f1 * Math.tan(TH) };
      [-50, 0, 50].forEach((y0) => {
        const q = { x: X1, y: CY + y0 * (st.swap ? 0.3 : 1) };
        const p = V.sub(q, V.mul(d, 110 / d.x));
        const r2 = L5.through(I, V.norm(V.sub(I, q)), { x: X2, y: CY, f: f2, H: 1e4 });
        const pts = [p, q, I, r2.q, O.along(r2.q, r2.d, 220)];
        PS.beam(ctx, L5.clipEnd(pts, 0, 0, VW - 8, VH), { color: '#f76707', width: 1.7, arrow: true, head: 10 });
      });
      L5.arrowObj(ctx, XF, CY, CY - I.y, { color: '#7048e8', width: 3, head: 10, label: '实像', fs: F(12) });
      L5.draw(ctx, X1, CY, 90, { type: 'convex', w: f1 > 200 ? 18 : 34 });
      L5.draw(ctx, X2, CY, 60, { type: 'convex', w: f2 > 200 ? 14 : 30 });
      D.text(ctx, st.swap ? '物镜（焦距短）' : '物镜（相当于照相机）', X1, CY - 104, { size: F(13), weight: 800, color: '#1c7ed6', align: 'center' });
      D.text(ctx, st.swap ? '目镜（焦距长）' : '目镜（相当于放大镜）', X2, CY - 74, { size: F(13), weight: 800, color: '#1c7ed6', align: 'center' });
      // 视角
      const th2 = Math.atan(Math.tan(TH) * f1 / f2);
      const E = { x: Math.min(VW - 60, X2 + 120), y: CY };
      PS.drawEye(ctx, E.x + 26, E.y, Math.PI, 20);
      PS.angleArc(ctx, X1 - 30, CY, 60, Math.PI, Math.PI + TH, { color: '#2b8a3e', fs: F(12), label: '' });
      D.text(ctx, '肉眼看：视角小', 30, CY - 70, { size: F(12), weight: 800, color: '#2b8a3e' });
      PS.angleArc(ctx, X2, CY, 70, 0, -th2, { color: '#7048e8', fs: F(12), label: '' });
      D.text(ctx, '通过望远镜：视角' + (th2 > TH ? '大' : '小'), X2 + 30, CY + 96, { size: F(12), weight: 800, color: '#7048e8' });
      ctx.restore();
    }
    function paintView(ctx, w, hh) {
      ctx.save();
      PS.virtual(ctx, w, hh, 300, 300);
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, 300, 300);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect((i * 97) % 300, (i * 57) % 300, 1.5, 1.5); }
      const M = fa() / fb();
      const r = 9 * M;
      ctx.save(); ctx.translate(150, 150); ctx.rotate(Math.PI); // 倒立的像
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      ctx.fillStyle = '#f1f3f5'; ctx.fillRect(-r, -r, 2 * r, 2 * r);
      ctx.fillStyle = 'rgba(134,142,150,.55)';
      [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.1], [-0.45, 0.25, 0.08]].forEach(([x, y, s]) => { ctx.beginPath(); ctx.arc(x * r, y * r, s * r, 0, TAU); ctx.fill(); });
      ctx.restore();
      ctx.font = PS.font(13, 700); ctx.fillStyle = '#ced4da'; ctx.textAlign = 'center';
      ctx.fillText(M >= 1 ? '望远镜中的月亮（倒立）' : '看起来更小了', 150, 286);
      // 肉眼看到的大小（对比）
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(150, 150, 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#adb5bd'; ctx.font = PS.font(11, 600); ctx.fillText('虚线圈：肉眼看到的大小', 150, 20);
      ctx.restore();
    }
    upd();
  });

  /* ================= 视角 ================= */
  PS.register('visual-angle', function (el) {
    const VW = 1000, VH = 360, EY = 210, EX = 80, GY = 300;
    const st = { d1: 300, d2: 700 }; // 小树、大树到眼睛的距离（画面单位）
    const H1 = 60, H2 = 140;
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const s1 = PS.ui.slider({ label: '小树的距离', min: 120, max: 880, step: 10, value: st.d1, onInput: (v) => { st.d1 = v; upd(); }, fmt: (v) => (v / 100).toFixed(1) + ' 单位' });
    const s2 = PS.ui.slider({ label: '大树的距离', min: 120, max: 880, step: 10, value: st.d2, onInput: (v) => { st.d2 = v; upd(); }, fmt: (v) => (v / 100).toFixed(1) + ' 单位' });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(s1.el, s2.el), msg);
    // 树顶、树根对眼睛所成的角（度）
    const ang = (H, d) => (Math.atan2(GY - EY, d) + Math.atan2(H - (GY - EY), d)) / DEG;
    function upd() {
      const a1 = ang(H1, st.d1), a2 = ang(H2, st.d2);
      msg.innerHTML = '小树的视角 <b>' + a1.toFixed(1) + '°</b>，大树的视角 <b>' + a2.toFixed(1) + '°</b>。' + (a1 > a2 ? '虽然小树矮，但它离眼睛近，<b>视角更大</b>，看起来反而更大。' : '大树的视角更大，看起来更大。') + '<br>物体对眼睛所成<b>视角</b>的大小，不仅和物体本身的大小有关，还和物体到眼睛的<b>距离</b>有关。人走近平面镜时觉得像“变大”，也是因为视角变大了（像的大小并没有变）。';
      S.render();
    }
    function tree(ctx, x, H, c) {
      ctx.fillStyle = '#8d6e4c'; ctx.fillRect(x - H * 0.06, GY - H * 0.4, H * 0.12, H * 0.4);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, GY - H * 0.66, H * 0.28, H * 0.34, 0, 0, TAU); ctx.fill();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      ctx.fillStyle = '#d3f9d8'; ctx.fillRect(0, GY, VW, VH);
      ctx.fillStyle = '#495057'; ctx.fillRect(EX - 18, EY + 12, 14, GY - EY - 12); // 观察者
      const x1 = EX + st.d1, x2 = EX + st.d2;
      tree(ctx, x2, H2, '#2f9e44'); tree(ctx, x1, H1, '#69db7c');
      [[x1, H1, '#2b8a3e'], [x2, H2, '#1c7ed6']].forEach(([x, H, c]) => {
        ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(EX, EY); ctx.lineTo(x, GY - H); ctx.moveTo(EX, EY); ctx.lineTo(x, GY); ctx.stroke(); ctx.setLineDash([]);
      });
      const arc = (x, H, r, c) => PS.angleArc(ctx, EX, EY, r, Math.atan2(GY - H - EY, x - EX), Math.atan2(GY - EY, x - EX), { color: c, label: ang(H, x - EX).toFixed(1) + '°', fs: F(12), off: 26 });
      arc(x1, H1, 70, '#2b8a3e'); arc(x2, H2, 120, '#1c7ed6');
      PS.drawEye(ctx, EX, EY, 0, 22);
      D.text(ctx, '小树', x1, GY - H1 - 12, { size: F(13), weight: 800, color: '#2b8a3e', align: 'center' });
      D.text(ctx, '大树', x2, GY - H2 - 12, { size: F(13), weight: 800, color: '#1c7ed6', align: 'center' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 探索宇宙 ================= */
  PS.register('universe-scale', function (el) {
    const VW = 1000, VH = 420;
    const LEVELS = [
      { name: '地球和月球', size: '地月距离约 38 万千米', note: '月球是地球的卫星，绕地球运转。' },
      { name: '太阳系', size: '直径约 300 亿千米（海王星轨道附近）', note: '太阳周围有八大行星：水星、金星、地球、火星、木星、土星、天王星、海王星。' },
      { name: '银河系', size: '直径约 10 万光年', note: '太阳系是银河系几千亿颗恒星中的一员。' },
      { name: '宇宙', size: '可观测宇宙直径约 930 亿光年', note: '宇宙由大量不同层次的星系构成，没有中心，而且在不断膨胀。' },
    ];
    const st = { z: 0, t: 0, order: [] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const zS = PS.ui.slider({ label: '缩小视野', min: 0, max: 3, step: 0.01, value: 0, fmt: (v) => LEVELS[Math.round(v)].name, onInput: (v) => { st.z = v; upd(); } });
    zS.el.classList.add('wide');
    const msg = h('div', { class: 'feedback show info' });
    // 排序小练习
    const NAMES = ['月球', '银河系', '地球', '宇宙', '太阳系'], RIGHT = ['宇宙', '银河系', '太阳系', '地球', '月球'];
    const pickBox = h('div', { class: 'us-btns', style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } });
    const orderBox = h('div', { class: 'small', style: { minHeight: '1.6em', margin: '6px 0' } });
    const ofb = h('div', { class: 'feedback' });
    function buildPick() {
      pickBox.innerHTML = ''; st.order = []; orderBox.innerHTML = '依次点击：'; ofb.className = 'feedback';
      NAMES.forEach((n) => { const b = PS.ui.button(n, () => { if (b.disabled) return; b.disabled = true; st.order.push(n); orderBox.innerHTML = '依次点击：' + st.order.join(' &gt; '); if (st.order.length === 5) check(); }, 'btn btn-sm'); pickBox.append(b); });
    }
    function check() {
      const ok = st.order.every((n, i) => n === RIGHT[i]);
      ofb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
      ofb.innerHTML = (ok ? '✔ 正确！' : '✘ 正确的顺序是：') + RIGHT.join(' &gt; ') + '。地球是太阳系中绕太阳运转的一颗行星，月球绕地球运转。';
      ok ? PS.sound.good() : PS.sound.bad();
    }
    el.append(PS.ui.row(zS.el), msg, h('div', { class: 'opt-q' }, h('div', { class: 'opt-qhead' }, h('b', null, '练一练：按尺度由大到小排列'), PS.ui.button('重新开始', buildPick, 'btn btn-ghost btn-sm')), pickBox, orderBox, ofb));
    function upd() {
      const L = LEVELS[Math.round(st.z)];
      msg.innerHTML = '<b>' + L.name + '</b>：' + L.size + '。' + L.note;
      S.render();
    }
    const stars = Array.from({ length: 160 }, (_, i) => ({ x: (i * 397) % VW, y: (i * 211) % VH, r: 0.6 + ((i * 7) % 10) / 9 }));
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, VW, VH);
      stars.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.3 * Math.sin(st.t + s.x)) + ')'; ctx.fillRect(s.x, s.y, s.r, s.r); });
      const cx = VW / 2, cy = VH / 2;
      const lv = (k) => PS.clamp(1 - Math.abs(st.z - k) * 1.6, 0, 1);
      // 0 地月
      let a = lv(0);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        const k = Math.pow(4, st.z);
        ctx.translate(cx, cy); ctx.scale(1 / k, 1 / k);
        const g = ctx.createRadialGradient(-20, -20, 10, 0, 0, 70); g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#1864ab');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 60, 0, TAU); ctx.fill();
        ctx.fillStyle = '#51cf66'; ctx.beginPath(); ctx.ellipse(-15, -10, 24, 16, 0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.ellipse(0, 0, 330, 330 * 0.45, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const ma = st.t * 0.25;
        ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(Math.cos(ma) * 330, Math.sin(ma) * 330 * 0.45, 16, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = a;
        D.text(ctx, '地球', cx, cy + 86, { size: F(13), weight: 800, color: '#a5d8ff', align: 'center' });
        D.text(ctx, '月球', cx + Math.cos(st.t * 0.25) * 330 * Math.pow(4, -st.z), cy + Math.sin(st.t * 0.25) * 330 * 0.45 * Math.pow(4, -st.z) - 24, { size: F(12), weight: 700, color: '#dee2e6', align: 'center' });
        ctx.globalAlpha = 1;
      }
      // 1 太阳系
      a = lv(1);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy);
        const k = Math.pow(3, st.z - 1); ctx.scale(1 / k, 1 / k);
        const sg = ctx.createRadialGradient(0, 0, 4, 0, 0, 36); sg.addColorStop(0, '#fff3bf'); sg.addColorStop(1, 'rgba(255,169,77,0)');
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.fill();
        const PL = [['水星', 40, '#adb5bd', 3], ['金星', 62, '#ffd8a8', 5], ['地球', 84, '#4dabf7', 5], ['火星', 106, '#ff8787', 4], ['木星', 160, '#e9ac7a', 11], ['土星', 220, '#ffe066', 9], ['天王星', 280, '#99e9f2', 7], ['海王星', 330, '#4c6ef5', 7]];
        PL.forEach(([n, r, c, s], i) => {
          ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * 0.5, 0, 0, TAU); ctx.stroke();
          const an = st.t * (0.9 / Math.sqrt(r / 40)) + i * 1.7;
          const x = Math.cos(an) * r * 1.35, y = Math.sin(an) * r * 0.5;
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
          ctx.font = PS.font(F(11), 700); ctx.fillStyle = '#dee2e6'; ctx.textAlign = 'center'; ctx.fillText(n, x, y - s - 4);
        });
        ctx.restore();
      }
      // 2 银河系
      a = lv(2);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy);
        const k = Math.pow(3, st.z - 2); ctx.scale(1 / k, 1 / k);
        ctx.rotate(st.t * 0.03);
        for (let i = 0; i < 900; i++) {
          const arm = i % 2, tt = (i / 900) * 3.4 + 0.2, r = 18 + tt * 70;
          const an = tt * 1.9 + arm * Math.PI + Math.sin(i * 12.9) * 0.25;
          ctx.fillStyle = i % 7 ? 'rgba(200,210,255,.55)' : 'rgba(255,220,180,.8)';
          ctx.fillRect(Math.cos(an) * r + Math.sin(i * 3.1) * 10, (Math.sin(an) * r + Math.cos(i * 5.3) * 10) * 0.55, 1.6, 1.6);
        }
        const cg = ctx.createRadialGradient(0, 0, 2, 0, 0, 50); cg.addColorStop(0, 'rgba(255,240,200,.9)'); cg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, 50, 0, TAU); ctx.fill();
        ctx.restore();
        ctx.globalAlpha = a;
        D.text(ctx, '★ 太阳系大约在这里', cx + 150, cy + 30, { size: F(12), weight: 700, color: '#ffe066' });
        ctx.globalAlpha = 1;
      }
      // 3 宇宙
      a = lv(3);
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        for (let i = 0; i < 70; i++) {
          const x = (i * 337) % VW, y = (i * 173) % VH, s = 6 + (i % 5) * 3;
          const g = ctx.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, 'rgba(255,230,200,.9)'); g.addColorStop(1, 'rgba(160,170,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.5, i, 0, TAU); ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = a; D.text(ctx, '每个光点都是一个像银河系这样的星系', cx, VH - 24, { size: F(13), weight: 700, color: '#dee2e6', align: 'center' }); ctx.globalAlpha = 1;
      }
      D.text(ctx, LEVELS[Math.round(st.z)].name, 20, 34, { size: F(18), weight: 800, color: '#fff' });
      ctx.restore();
    }
    buildPick(); upd(); loop.start();
  });
})();
