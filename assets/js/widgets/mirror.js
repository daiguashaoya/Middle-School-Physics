/* 第4章第3节：平面镜成像——虚像的形成、走近镜子、镜中的钟表 / 文字 / 倒影、平面镜成像作图、潜望镜、凹面镜和凸面镜。依赖 optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const C = PS.LIGHT;

  /* ================= 平面镜成虚像 ================= */
  PS.register('virtual-image', function (el) {
    const VW = 1000, VH = 440, MX = 560; // 镜面 x（反射面朝左）
    const st = { obj: 'S', S: { x: 330, y: 200 }, A: { x: 300, y: 150 }, Bp: { x: 300, y: 320 }, E: { x: 170, y: 330 }, ext: true, link: false, screen: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'S', label: '发光点 S' }, { value: 'AB', label: '物体 AB' }], st.obj, (v) => { st.obj = v; upd(); });
    const extT = PS.ui.toggle('画反射光线的反向延长线', true, (v) => { st.ext = v; upd(); });
    const linkT = PS.ui.toggle('连接物和像', false, (v) => { st.link = v; upd(); });
    const scrT = PS.ui.toggle('在像的位置放一个光屏', false, (v) => { st.screen = v; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el, extT.el, linkT.el, scrT.el), msg);
    const img = (p) => ({ x: 2 * MX - p.x, y: p.y });
    PS.drag(S, {
      VW, VH,
      hit: (p) => {
        if (V.dist(p, st.E) < 34) return 'E';
        if (st.obj === 'S') return V.dist(p, st.S) < 30 ? 'S' : null;
        if (V.dist(p, st.A) < 26) return 'A';
        if (V.dist(p, st.Bp) < 26) return 'B';
        if (Math.abs(p.x - st.A.x) < 20 && p.y > st.A.y && p.y < st.Bp.y) return 'AB';
        return null;
      },
      start: (k, p) => { st.off = { x: p.x - st.A.x, y: p.y - st.A.y }; },
      move: (k, p) => {
        const cl = (q) => ({ x: PS.clamp(q.x, 60, MX - 40), y: PS.clamp(q.y, 30, VH - 30) });
        if (k === 'E') st.E = cl(p);
        else if (k === 'S') st.S = cl(p);
        else if (k === 'A') st.A = cl({ x: p.x, y: Math.min(p.y, st.Bp.y - 40) });
        else if (k === 'B') st.Bp = cl({ x: p.x, y: Math.max(p.y, st.A.y + 40) });
        else { const dy = st.Bp.y - st.A.y; const a = cl({ x: p.x - st.off.x, y: p.y - st.off.y }); st.A = { x: a.x, y: Math.min(a.y, VH - 30 - dy) }; st.Bp = { x: a.x, y: st.A.y + dy }; }
        upd();
      },
    });
    function upd() {
      let t = st.obj === 'S'
        ? 'S 发出的光射到平面镜上，反射光进入眼睛。眼睛总认为光是<b>沿直线</b>传来的，看起来这些光好像是从镜后的 <b>S′</b> 发出的——S′ 就是 S 的像。它不是实际光线会聚成的，而是反射光线的<b>反向延长线</b>的交点，所以叫<b>虚像</b>。'
        : '物体上的每一点都在镜中成像，这些像点组成了物体的像 A′B′。像与物<b>大小相等</b>、到镜面的<b>距离相等</b>、连线与镜面<b>垂直</b>——像与物关于镜面<b>对称</b>。';
      if (st.screen) t += '<br>⬜ 光屏上<b>没有</b>像：虚像不是实际光线会聚成的，<b>不能用光屏承接</b>。';
      msg.innerHTML = t; S.render();
    }
    // 从点 P 发出、反射后进入眼睛附近的几条光线
    function rays(ctx, P, color, F, n) {
      const Pi = img(P);
      for (let k = 0; k < n; k++) {
        const target = { x: st.E.x, y: st.E.y - 26 + (52 * k) / (n - 1) };
        const d = V.sub(target, Pi);
        if (d.x >= -1) continue;
        const s = (MX - Pi.x) / d.x, M = { x: MX, y: Pi.y + d.y * s };
        if (M.y < 20 || M.y > VH - 20) continue;
        PS.beam(ctx, [P, M], { color, width: 1.8, arrow: true, head: 11 });
        PS.beam(ctx, [M, target], { color, width: 1.8, arrow: true, head: 11 });
        if (st.ext) PS.beam(ctx, [M, Pi], { color: C.virt, width: 1.3, dash: [6, 5] });
      }
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#f1f3f5'; ctx.fillRect(MX, 0, VW - MX, VH);
      D.text(ctx, '镜后（没有实际光线）', MX + 220, 30, { size: F(13), weight: 700, color: '#868e96', align: 'center' });
      PS.drawMirror(ctx, { x: MX, y: 20 }, { x: MX, y: VH - 20 }, { side: -1, thick: 6 });
      if (st.obj === 'S') {
        // S 发出的其他光线（射向各个方向）
        for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; PS.beam(ctx, [st.S, O.along(st.S, V.dir(a), 40)], { color: 'rgba(247,103,7,.35)', width: 1.2 }); }
        rays(ctx, st.S, C.ray, F, 3);
        const Si = img(st.S);
        if (st.link) { PS.beam(ctx, [st.S, Si], { color: '#868e96', width: 1.2, dash: [4, 4] }); PS.rightAngle(ctx, { x: MX, y: st.S.y }, { x: -1, y: 0 }, { x: 0, y: -1 }, 10); D.dim(ctx, st.S.x, MX, st.S.y + 26, '', { color: '#3b5bdb' }); D.dim(ctx, MX, Si.x, st.S.y + 26, '', { color: '#7048e8' }); D.text(ctx, (MX - st.S.x) / 20 + ' cm', (st.S.x + MX) / 2, st.S.y + 46, { size: F(12), weight: 700, color: '#3b5bdb', align: 'center' }); D.text(ctx, (MX - st.S.x) / 20 + ' cm', (Si.x + MX) / 2, st.S.y + 46, { size: F(12), weight: 700, color: '#7048e8', align: 'center' }); }
        ctx.fillStyle = '#f76707'; ctx.beginPath(); ctx.arc(st.S.x, st.S.y, 8, 0, TAU); ctx.fill();
        D.text(ctx, 'S', st.S.x - 16, st.S.y - 12, { size: F(17), weight: 900, color: '#f76707', align: 'center' });
        ctx.strokeStyle = C.image; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(Si.x, Si.y, 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, 'S′', Si.x + 18, Si.y - 12, { size: F(17), weight: 900, color: C.image, align: 'center' });
        if (st.screen) scr(ctx, Si, F);
      } else {
        rays(ctx, st.A, C.ray, F, 2);
        rays(ctx, st.Bp, '#e67700', F, 2);
        const Ai = img(st.A), Bi = img(st.Bp);
        if (st.link) [[st.A, Ai], [st.Bp, Bi]].forEach(([p, q]) => PS.beam(ctx, [p, q], { color: '#868e96', width: 1.2, dash: [4, 4] }));
        D.arrow(ctx, st.Bp.x, st.Bp.y, st.A.x, st.A.y, { color: '#e03131', width: 4, head: 16 });
        D.arrow(ctx, Bi.x, Bi.y, Ai.x, Ai.y, { color: C.image, width: 2.5, head: 16, dash: [7, 5] });
        D.text(ctx, 'A', st.A.x - 18, st.A.y, { size: F(16), weight: 900, color: '#e03131', baseline: 'middle' });
        D.text(ctx, 'B', st.Bp.x - 18, st.Bp.y, { size: F(16), weight: 900, color: '#e03131', baseline: 'middle' });
        D.text(ctx, 'A′', Ai.x + 10, Ai.y, { size: F(16), weight: 900, color: C.image, baseline: 'middle' });
        D.text(ctx, 'B′', Bi.x + 10, Bi.y, { size: F(16), weight: 900, color: C.image, baseline: 'middle' });
        if (st.screen) scr(ctx, { x: Ai.x, y: (Ai.y + Bi.y) / 2 }, F);
      }
      PS.drawEye(ctx, st.E.x, st.E.y, V.ang(V.sub({ x: MX, y: st.E.y - 40 }, st.E)), 24);
      D.text(ctx, '眼睛（可拖动）', st.E.x - 10, st.E.y + 40, { size: F(12), weight: 700, color: '#3b5bdb', align: 'center' });
      ctx.restore();
    }
    function scr(ctx, p, F) {
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 2;
      ctx.fillRect(p.x - 6, p.y - 80, 12, 160); ctx.strokeRect(p.x - 6, p.y - 80, 12, 160);
      D.text(ctx, '光屏上没有像', p.x, p.y + 100, { size: F(13), weight: 800, color: '#e03131', align: 'center' });
    }
    upd();
  });

  /* ================= 走近平面镜 ================= */
  PS.register('mirror-walk', function (el) {
    const VW = 1000, VH = 420, MX = 600, GY = 380, PX = 110; // 镜子位置、地面、每米像素
    const st = { d: 2.5, walk: false, v: 0.5, angle: true, half: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const dS = PS.ui.slider({ label: '人到镜面', min: 0.5, max: 4.5, step: 0.1, value: st.d, unit: 'm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.d = v; st.walk = false; upd(); } });
    const walkB = PS.ui.button('🚶 以 0.5 m/s 走向镜子', () => { st.walk = !st.walk; if (st.d <= 0.55) st.d = 4.5; walkB.innerHTML = st.walk ? '⏸ 停下' : '🚶 以 0.5 m/s 走向镜子'; loop.start(); }, 'btn btn-primary btn-sm');
    const aT = PS.ui.toggle('画出视角', true, (v) => { st.angle = v; S.render(); });
    const hT = PS.ui.toggle('照全身需要多长的镜子？', false, (v) => { st.half = v; S.render(); });
    const rD = PS.ui.readout('人到镜', '—'), rI = PS.ui.readout('像到镜', '—'), rP = PS.ui.readout('人与像相距', '—', 'accent'), rH = PS.ui.readout('像高', '1.6 m', 'primary'), rV = PS.ui.readout('像相对于人的速度', '0');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(dS.el, walkB), PS.ui.row(aT.el, hT.el), h('div', { class: 'readouts' }, rD.el, rI.el, rP.el, rH.el, rV.el), msg);
    function upd() {
      rD.set(st.d.toFixed(1) + ' m'); rI.set(st.d.toFixed(1) + ' m'); rP.set((2 * st.d).toFixed(1) + ' m');
      rV.set(st.walk ? '1 m/s' : '0');
      msg.innerHTML = '人靠近镜子时，人觉得镜中的像“变大”了——其实是<b>视角</b>变大了，像的大小始终和人<b>一样大</b>（1.6 m）。' + (st.walk ? '<br>人以 0.5 m/s 的速度走向镜子，像也以 0.5 m/s 的速度走向镜子，像相对于人的速度是 <b>1 m/s</b>。' : '') + (st.half ? '<br>📏 从眼睛看像的头顶和脚底，两条视线在镜面上截出的长度正好是身高的<b>一半</b>：照全身至少需要 0.8 m 长的镜子（与人离镜子多远无关）。' : '');
      dS.set(st.d, true);
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (!st.walk) { loop.stop(); return; }
      st.d = Math.max(0.5, st.d - st.v * dt);
      if (st.d <= 0.5) { st.walk = false; walkB.innerHTML = '🚶 以 0.5 m/s 走向镜子'; }
      upd();
    }, S.stage);
    function person(ctx, x, face, alpha, color) {
      const H = 1.6 * PX;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = color || '#1c7ed6';
      ctx.fillRect(x - 12, GY - H * 0.5, 24, H * 0.5); // 腿
      D.roundRect(ctx, x - 18, GY - H * 0.82, 36, H * 0.36, 8); ctx.fill();
      ctx.fillStyle = color ? color : '#ffd8a8'; ctx.beginPath(); ctx.arc(x, GY - H * 0.9, H * 0.09, 0, TAU); ctx.fill();
      ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(x + face * 6, GY - H * 0.92, 3, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#f1f3f5'; ctx.fillRect(MX, 0, VW - MX, VH);
      ctx.fillStyle = '#dee2e6'; ctx.fillRect(0, GY, VW, VH - GY);
      PS.drawMirror(ctx, { x: MX, y: GY - 200 }, { x: MX, y: GY - 10 }, { side: -1, thick: 6 });
      const px = MX - st.d * PX, ix = MX + st.d * PX;
      person(ctx, px, 1, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(MX + 4, 0, VW, VH); ctx.clip(); person(ctx, ix, -1, 0.4, '#7048e8'); ctx.restore();
      const eye = { x: px + 6, y: GY - 1.6 * PX * 0.92 };
      const top = { x: ix, y: GY - 1.6 * PX }, foot = { x: ix, y: GY };
      if (st.angle || st.half) {
        [top, foot].forEach((q) => {
          const s = (MX - eye.x) / (q.x - eye.x), m = { x: MX, y: eye.y + (q.y - eye.y) * s };
          PS.beam(ctx, [eye, m], { color: C.ray, width: 1.6 });
          PS.beam(ctx, [m, q], { color: C.virt, width: 1.2, dash: [6, 5] });
          if (st.half) { ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, TAU); ctx.fill(); }
        });
        if (st.half) {
          const m1 = eye.y + (top.y - eye.y) * ((MX - eye.x) / (top.x - eye.x)), m2 = eye.y + (foot.y - eye.y) * ((MX - eye.x) / (foot.x - eye.x));
          ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(MX + 6, m1); ctx.lineTo(MX + 6, m2); ctx.stroke();
          D.text(ctx, '0.8 m', MX + 16, (m1 + m2) / 2, { size: F(14), weight: 800, color: '#2b8a3e', baseline: 'middle' });
        }
        if (st.angle) { const a1 = V.ang(V.sub(top, eye)), a2 = V.ang(V.sub(foot, eye)); PS.angleArc(ctx, eye.x, eye.y, 44, a1, a2, { color: '#e8590c', label: '视角 ' + (O.angBetween(V.sub(top, eye), V.sub(foot, eye))).toFixed(0) + '°', fs: F(12), off: 30 }); }
      }
      D.dim(ctx, px, MX, GY + 18, st.d.toFixed(1) + ' m', { color: '#3b5bdb', size: F(13), below: true });
      D.dim(ctx, MX, ix, GY + 18, st.d.toFixed(1) + ' m', { color: '#7048e8', size: F(13), below: true });
      D.text(ctx, '人', px, GY - 1.6 * PX - 14, { size: F(14), weight: 800, color: '#1c7ed6', align: 'center' });
      D.text(ctx, '像（虚像）', ix, GY - 1.6 * PX - 14, { size: F(14), weight: 800, color: '#7048e8', align: 'center' });
      D.text(ctx, '平面镜', MX, GY - 212, { size: F(13), weight: 700, color: '#1c7ed6', align: 'center' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 镜中的钟表、文字和水中倒影 ================= */
  function drawClock(ctx, x, y, r, hh, mm, F) {
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    for (let k = 0; k < 60; k++) { const a = (k / 60) * TAU; const L = k % 5 ? 6 : 14; ctx.lineWidth = k % 5 ? 1.5 : 3.5; ctx.beginPath(); ctx.moveTo(x + Math.sin(a) * (r - 4), y - Math.cos(a) * (r - 4)); ctx.lineTo(x + Math.sin(a) * (r - 4 - L), y - Math.cos(a) * (r - 4 - L)); ctx.stroke(); }
    const ah = ((hh % 12) + mm / 60) / 12 * TAU, am = (mm / 60) * TAU;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(ah) * r * 0.5, y - Math.cos(ah) * r * 0.5); ctx.stroke();
    ctx.strokeStyle = '#e03131'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(am) * r * 0.78, y - Math.cos(am) * r * 0.78); ctx.stroke();
    ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
    ctx.restore();
    void F;
  }
  const fmtHM = (t) => { const hh = Math.floor(t / 60) % 12 || 12, mm = t % 60; return hh + ':' + String(mm).padStart(2, '0'); };
  PS.register('mirror-clock', function (el) {
    const VW = 1000, VH = 400;
    const st = { mode: 'clock', T: 0, txt: '物理 FUN', q: null };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'clock', label: '镜中的钟表' }, { value: 'text', label: '镜中的文字' }, { value: 'water', label: '水中的倒影' }], st.mode, (v) => { st.mode = v; upd(); });
    const inp = h('input', { type: 'text', class: 'q-input', value: st.txt, maxlength: 10, style: { width: '12em' } });
    inp.addEventListener('input', () => { st.txt = inp.value; S.render(); });
    const rowT = PS.ui.row(h('span', null, '写几个字：'), inp);
    const qEl = h('div', { class: 'opt-q' });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), rowT, qEl, msg);
    function newQ() {
      // 实际时间（分钟），避开左右对称的时刻
      let T;
      let mir, opts;
      do {
        T = PS.randInt(1, 11) * 60 + PS.randInt(1, 11) * 5;
        mir = (720 - T) % 720 || 720;
        let extra = (T + PS.pick([60, 120, 660, 30])) % 720 || 720;
        opts = [T, mir, (T + 360) % 720 || 720, extra];
      } while (new Set(opts.map((o) => o % 720)).size < 4);
      st.T = T;
      const order = opts.map((o, k) => [o, k]).sort(() => Math.random() - 0.5);
      st.q = { order, done: false };
      qEl.innerHTML = '';
      qEl.append(h('div', { class: 'opt-qhead' }, h('b', null, '小明从平面镜里看到墙上钟表的指针如右图所示，此时的实际时间是（　）'), PS.ui.button('换一题', () => { newQ(); S.render(); }, 'btn btn-ghost btn-sm')));
      const box = h('div', { class: 'q-options cols-4' });
      const ex = h('div', { class: 'q-explain' });
      order.forEach(([o, k], j) => {
        const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCD'[j] + '</span>' + fmtHM(o) });
        b.addEventListener('click', () => {
          if (st.q.done) return; st.q.done = true;
          box.querySelectorAll('.q-opt').forEach((x, i) => { x.disabled = true; if (order[i][1] === 0) x.classList.add('right'); });
          if (k !== 0) b.classList.add('wrong');
          k === 0 ? PS.sound.good() : PS.sound.bad();
          ex.innerHTML = '<b>解析：</b>平面镜成像左右相反。方法一：把图<b>左右翻过来</b>看（从纸的背面看）；方法二：实际时间 = 12:00 − 镜中读数 = 12:00 − ' + fmtHM(mir) + ' = <b>' + fmtHM(T) + '</b>。';
          ex.classList.add('show'); S.render();
        });
        box.append(b);
      });
      qEl.append(box, ex);
    }
    function upd() {
      rowT.style.display = st.mode === 'text' ? '' : 'none';
      qEl.style.display = st.mode === 'clock' ? '' : 'none';
      msg.innerHTML = st.mode === 'clock' ? '平面镜所成的像与物体<b>左右相反</b>（关于镜面对称）。镜子里的钟表，指针好像在“倒着走”。'
        : st.mode === 'text' ? '竖直的镜子里，文字<b>左右颠倒</b>。救护车车头上的“AMBULANCE”就是反着写的，前面车辆的司机从后视镜里看到的就是正的。'
        : '平静的水面相当于平面镜，倒影是岸上景物的<b>虚像</b>（光的反射），与景物<b>上下颠倒</b>、大小相等。塔顶的像到水面的距离等于塔顶到水面的距离，与水的深浅<b>无关</b>。';
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'clock') {
        D.text(ctx, '墙上的钟表（实际）', 260, 36, { size: F(15), weight: 800, color: '#495057', align: 'center' });
        D.text(ctx, '镜子里看到的', 740, 36, { size: F(15), weight: 800, color: '#7048e8', align: 'center' });
        ctx.fillStyle = '#e7f5ff'; D.roundRect(ctx, 540, 52, 400, 330, 16); ctx.fill();
        ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 6; ctx.stroke();
        ctx.save(); ctx.translate(740, 0); ctx.scale(-1, 1); drawClock(ctx, 0, 215, 135, Math.floor(st.T / 60), st.T % 60, F); ctx.restore();
        if (st.q && st.q.done) drawClock(ctx, 260, 215, 135, Math.floor(st.T / 60), st.T % 60, F);
        else { ctx.fillStyle = '#f1f3f5'; ctx.beginPath(); ctx.arc(260, 215, 135, 0, TAU); ctx.fill(); D.text(ctx, '？', 260, 215, { size: F(80), weight: 900, color: '#adb5bd', align: 'center', baseline: 'middle' }); }
        D.text(ctx, '镜中读数像 ' + fmtHM((720 - st.T) % 720 || 720), 740, 395, { size: F(12), weight: 600, color: '#868e96', align: 'center' });
      } else if (st.mode === 'text') {
        const t = st.txt || ' ';
        D.text(ctx, '原来的字', 250, 60, { size: F(15), weight: 800, color: '#495057', align: 'center' });
        D.text(ctx, '竖直镜子里的像', 750, 60, { size: F(15), weight: 800, color: '#7048e8', align: 'center' });
        ctx.fillStyle = '#e7f5ff'; ctx.fillRect(500, 80, 500, 240);
        PS.drawMirror(ctx, { x: 500, y: 80 }, { x: 500, y: 320 }, { side: -1, thick: 6 });
        ctx.font = PS.font(F(60), 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1b2333'; ctx.fillText(t, 250, 200);
        ctx.save(); ctx.translate(750, 200); ctx.scale(-1, 1); ctx.fillStyle = 'rgba(112,72,232,.85)'; ctx.fillText(t, 0, 0); ctx.restore();
        D.text(ctx, '左右颠倒', 750, 300, { size: F(14), weight: 700, color: '#7048e8', align: 'center' });
      } else {
        const WY = 230;
        const g = ctx.createLinearGradient(0, 0, 0, WY); g.addColorStop(0, '#a5d8ff'); g.addColorStop(1, '#e7f5ff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, WY);
        const pagoda = (sgn, alpha) => {
          ctx.save(); ctx.globalAlpha = alpha; ctx.translate(0, WY); ctx.scale(1, sgn);
          ctx.fillStyle = '#c92a2a';
          for (let k = 0; k < 5; k++) { const y = -20 - k * 36, wd = 110 - k * 16; ctx.fillRect(500 - wd / 2 + 10, y - 26, wd - 20, 26); ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(500 - wd / 2 - 10, y - 26); ctx.lineTo(500 + wd / 2 + 10, y - 26); ctx.lineTo(500, y - 46); ctx.fill(); ctx.fillStyle = '#c92a2a'; }
          ctx.fillStyle = '#495057'; ctx.fillRect(498, -220, 4, 30);
          ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(220, -60, 50, 0, TAU); ctx.arc(780, -50, 44, 0, TAU); ctx.fill();
          ctx.fillStyle = '#8d6e4c'; ctx.fillRect(214, -20, 12, 20); ctx.fillRect(774, -12, 12, 12);
          ctx.restore();
        };
        pagoda(1, 1);
        ctx.fillStyle = '#4dabf7'; ctx.fillRect(0, WY, VW, VH - WY);
        pagoda(-1, 0.45);
        ctx.fillStyle = 'rgba(255,255,255,.25)'; for (let k = 0; k < 14; k++) ctx.fillRect((k * 73) % VW, WY + 20 + ((k * 37) % 140), 50, 2);
        ctx.fillStyle = '#868e96'; ctx.fillRect(0, WY - 6, VW, 6);
        D.dim(ctx, WY - 220, WY, 640, '', {}); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(620, WY - 220); ctx.lineTo(620, WY); ctx.moveTo(620, WY); ctx.lineTo(620, WY + 220); ctx.stroke();
        D.text(ctx, '塔顶到水面 30 m', 630, WY - 110, { size: F(13), weight: 700, color: '#e8590c' });
        D.text(ctx, '像的顶端到水面 30 m', 630, WY + 110, { size: F(13), weight: 700, color: '#fff' });
        D.text(ctx, '（即使湖水只有 2 m 深）', 630, WY + 132, { size: F(12), weight: 600, color: '#e7f5ff' });
      }
      ctx.restore();
    }
    newQ(); upd();
  });

  /* ================= 平面镜成像作图 ================= */
  PS.register('mirror-draw', function (el) {
    const VW = 1000, VH = 440;
    const st = { task: 1, show: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 1, label: '① 作物体 AB 的像' }, { value: 2, label: '② 作经过 P 点的反射光线' }, { value: 3, label: '③ 由 S 和 S′ 确定镜面' }], st.task, (v) => { st.task = v; newTask(); });
    const chk = PS.ui.button('✔ 检查', check, 'btn btn-primary btn-sm');
    const ans = PS.ui.button('看标准作法', () => { st.show = true; upd(); }, 'btn btn-ghost btn-sm');
    const nxt = PS.ui.button('换一题', () => newTask(), 'btn btn-ghost btn-sm');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), PS.ui.row(chk, ans, nxt), msg,
      h('div', { class: 'tip tip-exam small', style: { marginTop: '10px' }, html: '<b>作图规范：</b>平面镜的背面画短斜线；实际光线画<b>实线</b>并标箭头；<b>虚像、法线、反射光线的反向延长线</b>都画<b>虚线</b>；像与物关于镜面对称（对应点连线与镜面垂直，到镜面距离相等）。' }));
    let T = {};
    function newTask() {
      st.show = false;
      const tilt = PS.randInt(-30, 30) * DEG;
      const M0 = { x: 520, y: 230 }, u = { x: Math.sin(tilt), y: Math.cos(tilt) }; // 镜面方向（近似竖直）
      const nL = { x: -u.y, y: u.x }; // 指向左侧（反射面一侧）
      if (st.task === 1) {
        const A = V.add(M0, V.add(V.mul(nL, PS.randInt(110, 200)), V.mul(u, -PS.randInt(60, 120))));
        const B = V.add(M0, V.add(V.mul(nL, PS.randInt(80, 200)), V.mul(u, PS.randInt(40, 120))));
        T = { M0, u, nL, A, B, Ai: { x: 820, y: 120 }, Bi: { x: 860, y: 330 } };
      } else if (st.task === 2) {
        const Sp = V.add(M0, V.add(V.mul(nL, PS.randInt(120, 200)), V.mul(u, -PS.randInt(60, 130))));
        const P = V.add(M0, V.add(V.mul(nL, PS.randInt(120, 260)), V.mul(u, PS.randInt(40, 140))));
        T = { M0, u, nL, Sp, P, k: 0 };
      } else {
        const Sp = { x: PS.randInt(250, 380), y: PS.randInt(110, 330) };
        const ang = PS.randInt(-35, 35) * DEG, d = PS.randInt(110, 170);
        const Si = O.along(Sp, V.dir(ang), 2 * d);
        T = { Sp, Si, C: { x: 700, y: 120 }, a: 0.4 };
      }
      upd();
    }
    const refl = (p) => O.mirrorPoint(p, T.M0, T.u);
    const mirrorEnds = () => [O.along(T.M0, T.u, -210), O.along(T.M0, T.u, 210)];
    PS.drag(S, {
      VW, VH,
      hit: (p) => {
        if (st.show) return null;
        if (st.task === 1) { if (V.dist(p, T.Ai) < 26) return 'Ai'; if (V.dist(p, T.Bi) < 26) return 'Bi'; }
        if (st.task === 2) { const Op = O.along(T.M0, T.u, T.k); if (V.dist(p, Op) < 28) return 'O'; }
        if (st.task === 3) { if (V.dist(p, T.C) < 26) return 'C'; if (V.dist(p, O.along(T.C, V.dir(T.a + Math.PI / 2), 150)) < 28) return 'R'; }
        return null;
      },
      move: (k, p) => {
        if (k === 'Ai' || k === 'Bi') T[k] = { x: PS.clamp(p.x, 20, VW - 20), y: PS.clamp(p.y, 20, VH - 20) };
        else if (k === 'O') T.k = PS.clamp(V.dot(V.sub(p, T.M0), T.u), -200, 200);
        else if (k === 'C') T.C = { x: PS.clamp(p.x, 40, VW - 40), y: PS.clamp(p.y, 40, VH - 40) };
        else T.a = V.ang(V.sub(p, T.C)) - Math.PI / 2;
        S.render();
      },
    });
    function check() {
      let ok, t;
      if (st.task === 1) {
        const eA = V.dist(T.Ai, refl(T.A)), eB = V.dist(T.Bi, refl(T.B));
        ok = eA < 10 && eB < 10;
        t = ok ? '✅ 正确！A′B′ 与 AB 关于镜面对称，要画成<b>虚线</b>并标箭头。' : (eA >= 10 ? 'A′ 的位置不对。' : '') + (eB >= 10 ? 'B′ 的位置不对。' : '') + '提示：过 A 作镜面的垂线，在镜后截取相等的距离。';
      } else if (st.task === 2) {
        const Op = O.along(T.M0, T.u, T.k), Si = refl(T.Sp);
        const err = Math.abs(V.cross(V.norm(V.sub(T.P, Si)), V.sub(Op, Si)));
        ok = err < 6;
        t = ok ? '✅ 正确！入射点 O 在 S′P 的连线上：先作 S 的像 S′，连接 S′P 与镜面的交点就是入射点。' : '入射点不对。提示：反射光线的反向延长线一定过像点 S′——先作出 S′，再连接 S′P。';
      } else {
        const mid = V.lerp(T.Sp, T.Si, 0.5), m = V.dir(T.a + Math.PI / 2);
        const perpErr = Math.abs(90 - O.angBetween(m, V.sub(T.Si, T.Sp)));
        const distErr = Math.abs(V.cross(m, V.sub(mid, T.C)));
        ok = perpErr < 2.5 && distErr < 8;
        t = ok ? '✅ 正确！平面镜是 SS′ 连线的<b>垂直平分线</b>。' : '平面镜应在 SS′ 连线的<b>中点</b>处，并且与 SS′ <b>垂直</b>。' + (perpErr >= 2.5 ? '（还差 ' + perpErr.toFixed(0) + '° 才垂直）' : '');
      }
      msg.className = 'feedback show ' + (ok ? 'ok' : 'bad'); msg.innerHTML = t;
      ok ? PS.sound.good() : PS.sound.bad();
    }
    function upd() {
      msg.className = 'feedback show info';
      msg.innerHTML = st.show
        ? (st.task === 1 ? '标准作法：分别作 A、B 关于镜面的对称点 A′、B′（垂线用虚线），用<b>虚线</b>连接 A′B′ 并标箭头。' : st.task === 2 ? '标准作法：① 作 S 关于镜面的对称点 S′；② 连接 S′P 交镜面于 O；③ 连接 SO（入射光线）、OP（反射光线），S′O 段画虚线。' : '标准作法：连接 SS′，作 SS′ 的垂直平分线，就是平面镜的位置，在背面画短斜线。')
        : st.task === 1 ? '拖动 <b>A′、B′</b> 两个点，画出物体 AB 在平面镜中的像。' : st.task === 2 ? 'S 发出的一条光经平面镜反射后经过 P 点。沿镜面拖动<b>入射点 O</b>，找到正确的位置。' : 'S′ 是发光点 S 在平面镜中的像。拖动镜子的<b>中心点</b>和<b>端点</b>，确定平面镜的位置。';
      S.render();
    }
    function pt(ctx, p, lb, c, F, dash) {
      if (dash) { ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      else { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.fill(); }
      D.text(ctx, lb, p.x + 12, p.y - 12, { size: F(16), weight: 900, color: c });
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      ctx.strokeStyle = '#f1f3f5'; ctx.lineWidth = 1;
      for (let x = 0; x <= VW; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
      for (let y = 0; y <= VH; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
      const t = T;
      if (st.task === 1 || st.task === 2) { const [a, b] = mirrorEnds(); PS.drawMirror(ctx, a, b, { side: V.cross(V.sub(b, a), t.nL) > 0 ? -1 : 1 }); }
      if (st.task === 1) {
        D.arrow(ctx, t.A.x, t.A.y, t.B.x, t.B.y, { color: '#e03131', width: 3.5, head: 15 });
        pt(ctx, t.A, 'A', '#e03131', F); pt(ctx, t.B, 'B', '#e03131', F);
        if (st.show) {
          const Ai = refl(t.A), Bi = refl(t.B);
          [[t.A, Ai], [t.B, Bi]].forEach(([p, q]) => PS.beam(ctx, [p, q], { color: '#adb5bd', width: 1.2, dash: [4, 4] }));
          D.arrow(ctx, Ai.x, Ai.y, Bi.x, Bi.y, { color: '#2b8a3e', width: 2.5, head: 15, dash: [7, 5] });
          pt(ctx, Ai, 'A′', '#2b8a3e', F, true); pt(ctx, Bi, 'B′', '#2b8a3e', F, true);
        } else {
          D.arrow(ctx, t.Ai.x, t.Ai.y, t.Bi.x, t.Bi.y, { color: C.image, width: 2.5, head: 15, dash: [7, 5] });
          PS.handle(ctx, t.Ai.x, t.Ai.y, 11, C.image, 'A′', F); PS.handle(ctx, t.Bi.x, t.Bi.y, 11, C.image, 'B′', F);
        }
      } else if (st.task === 2) {
        pt(ctx, t.Sp, 'S', '#f76707', F); pt(ctx, t.P, 'P', '#3b5bdb', F);
        const Si = refl(t.Sp);
        let Op = O.along(t.M0, t.u, t.k);
        if (st.show) {
          Op = O.lineLine(Si, V.sub(t.P, Si), t.M0, t.u);
          PS.beam(ctx, [t.Sp, Si], { color: '#adb5bd', width: 1.2, dash: [4, 4] });
          pt(ctx, Si, 'S′', C.image, F, true);
          PS.beam(ctx, [Si, Op], { color: C.virt, width: 1.4, dash: [6, 5] });
        }
        PS.beam(ctx, [t.Sp, Op], { color: st.show ? '#2b8a3e' : C.ray, width: 2.5, arrow: true, head: 14 });
        PS.beam(ctx, [Op, t.P], { color: st.show ? '#2b8a3e' : C.ray, width: 2.5, arrow: true, head: 14 });
        if (!st.show) PS.handle(ctx, Op.x, Op.y, 11, '#e8590c', 'O（拖动）', F);
        else D.text(ctx, 'O', Op.x - 20, Op.y, { size: F(16), weight: 900, color: '#2b8a3e', baseline: 'middle' });
      } else {
        pt(ctx, t.Sp, 'S', '#f76707', F); pt(ctx, t.Si, 'S′', C.image, F, true);
        let Cc = t.C, m = V.dir(t.a + Math.PI / 2);
        if (st.show) { Cc = V.lerp(t.Sp, t.Si, 0.5); m = V.perp(V.norm(V.sub(t.Si, t.Sp))); PS.beam(ctx, [t.Sp, t.Si], { color: '#adb5bd', width: 1.2, dash: [4, 4] }); }
        const a = O.along(Cc, m, -150), b = O.along(Cc, m, 150);
        PS.drawMirror(ctx, a, b, { side: V.cross(V.sub(b, a), V.sub(t.Sp, Cc)) > 0 ? -1 : 1, color: st.show ? '#2b8a3e' : null });
        if (!st.show) { PS.handle(ctx, Cc.x, Cc.y, 11, '#3b5bdb', '中心', F); const e = O.along(Cc, m, 150); PS.handle(ctx, e.x, e.y, 11, '#3b5bdb', '转动', F); }
      }
      ctx.restore();
    }
    newTask();
  });

  /* ================= 潜望镜 ================= */
  PS.register('periscope', function (el) {
    const VW = 1000, VH = 460;
    const st = { ang: 45, img: true };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const aS = PS.ui.slider({ label: '镜子与水平面的夹角', min: 30, max: 60, step: 1, value: 45, unit: '°', onInput: (v) => { st.ang = v; upd(); } });
    const iT = PS.ui.toggle('标出看到的像', true, (v) => { st.img = v; S.render(); });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(aS.el, iT.el), msg);
    const TX = 470, TOP = 90, BOT = 360; // 镜筒中心 x、上下镜子中心
    function trace() {
      const a = st.ang * DEG;
      // 上镜：反射面朝左下；下镜：反射面朝右上（两镜平行）
      const n1 = V.norm({ x: -Math.sin(a), y: Math.cos(a) }), n2 = V.mul(n1, -1);
      const u = { x: Math.cos(a), y: Math.sin(a) };
      const pts = [{ x: 60, y: TOP }];
      let p = { x: 60, y: TOP }, d = { x: 1, y: 0 };
      const m1a = O.along({ x: TX, y: TOP }, u, -55), m1b = O.along({ x: TX, y: TOP }, u, 55);
      let hit = O.raySeg(p, d, m1a, m1b);
      if (!hit) return { pts: [p, O.along(p, d, 900)], ok: false };
      pts.push(hit.p); d = O.reflect(d, n1); p = hit.p;
      const m2a = O.along({ x: TX, y: BOT }, u, -55), m2b = O.along({ x: TX, y: BOT }, u, 55);
      hit = O.raySeg(p, d, m2a, m2b);
      if (!hit) { pts.push(O.along(p, d, 500)); return { pts, ok: false }; }
      pts.push(hit.p); d = O.reflect(d, n2); p = hit.p;
      pts.push(O.along(p, d, 420));
      return { pts, ok: Math.abs(d.y) < 0.02 && d.x > 0, u, m: [[m1a, m1b, n1], [m2a, m2b, n2]], out: d };
    }
    function upd() {
      const r = trace();
      msg.innerHTML = st.ang === 45 ? '潜望镜里的两块平面镜<b>互相平行</b>，都与水平方向成 <b>45°</b>。来自物体的光经过两次反射进入眼睛，眼睛看到的是物体<b>正立、等大的虚像</b>。潜望镜利用了平面镜能<b>改变光的传播方向</b>。'
        : '镜子不是 45° 时，水平射入的光反射后' + (r.ok ? '' : '不能水平射出，') + '无法沿水平方向进入眼睛（或根本射不到第二块镜子上）。';
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#d0ebff'); g.addColorStop(0.42, '#e7f5ff'); g.addColorStop(0.42, '#1971c2'); g.addColorStop(1, '#0b4a82');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      // 水面上的帆船
      ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(130, 150); ctx.lineTo(110, 175); ctx.lineTo(48, 175); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(80, 50); ctx.lineTo(80, 145); ctx.lineTo(125, 145); ctx.fill();
      ctx.fillStyle = '#e03131'; ctx.fillRect(78, 40, 4, 110);
      D.text(ctx, '水面上的船', 80, 30, { size: F(13), weight: 700, color: '#1b2333', align: 'center' });
      // 镜筒
      ctx.fillStyle = 'rgba(73,80,87,.88)';
      ctx.fillRect(TX - 60, TOP - 50, 120, 20); ctx.fillRect(TX + 40, TOP - 50, 20, BOT - TOP + 100); ctx.fillRect(TX - 60, TOP + 30, 20, BOT - TOP + 20); ctx.fillRect(TX - 60, BOT + 30, 120, 20);
      ctx.fillStyle = 'rgba(206,212,218,.2)'; ctx.fillRect(TX - 40, TOP - 30, 80, BOT - TOP + 60);
      const r = trace();
      if (r.m) r.m.forEach(([a, b]) => PS.drawMirror(ctx, a, b, { side: a === r.m[0][0] ? -1 : 1 }));
      else { const a = st.ang * DEG, u = { x: Math.cos(a), y: Math.sin(a) }; PS.drawMirror(ctx, O.along({ x: TX, y: TOP }, u, -55), O.along({ x: TX, y: TOP }, u, 55), { side: -1 }); PS.drawMirror(ctx, O.along({ x: TX, y: BOT }, u, -55), O.along({ x: TX, y: BOT }, u, 55), { side: 1 }); }
      PS.beam(ctx, r.pts, { color: '#ffd43b', width: 2.6, arrow: true, head: 14, glow: true });
      D.text(ctx, '潜望镜', TX, TOP - 62, { size: F(14), weight: 800, color: '#1b2333', align: 'center' });
      D.text(ctx, '潜水艇内', 760, VH - 20, { size: F(13), weight: 700, color: '#d0ebff', align: 'center' });
      PS.drawEye(ctx, 650, BOT, Math.PI, 26, { bg: '#f8f9fa' });
      if (st.img && r.ok) {
        // 眼睛看到的像：在入射光的延长线上，正立等大
        ctx.save(); ctx.globalAlpha = 0.45;
        ctx.translate(0, BOT - TOP); // 像在眼睛视线的延长线上
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(30, 150); ctx.lineTo(130, 150); ctx.lineTo(110, 175); ctx.lineTo(48, 175); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(80, 50); ctx.lineTo(80, 145); ctx.lineTo(125, 145); ctx.fill();
        ctx.fillStyle = '#e03131'; ctx.fillRect(78, 40, 4, 110);
        ctx.restore();
        PS.beam(ctx, [{ x: TX, y: BOT }, { x: 140, y: BOT }], { color: C.virt, width: 1.4, dash: [6, 5] });
        D.text(ctx, '看到的像：正立、等大的虚像', 16, BOT + 74, { size: F(13), weight: 800, color: '#ffe066' });
      }
      ctx.restore();
    }
    upd();
  });

  /* ================= 凹面镜和凸面镜 ================= */
  PS.register('curved-mirrors', function (el) {
    const VW = 1000, VH = 440;
    const st = { type: 'concave', src: 'parallel', P: { x: 300, y: 220 } };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const tSeg = PS.ui.seg([{ value: 'concave', label: '凹面镜' }, { value: 'convex', label: '凸面镜' }, { value: 'view', label: '视野比较（汽车后视镜）' }], st.type, (v) => { st.type = v; upd(); });
    const sSeg = PS.ui.seg([{ value: 'parallel', label: '平行光射入' }, { value: 'focus', label: '光源放在焦点上' }, { value: 'point', label: '可拖动的点光源' }], st.src, (v) => { st.src = v; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    const apps = h('div', { class: 'opt-legend' });
    el.append(PS.ui.row(tSeg.el), PS.ui.row(sSeg.el), msg, apps);
    const R = 420, CY = 220;
    // 凹面镜：圆心在左侧，反射面朝左；凸面镜：圆心在右侧，反射面朝左
    const geo = () => (st.type === 'concave' ? { c: { x: 860 - R, y: CY }, vx: 860, s: 1 } : { c: { x: 600 + R, y: CY }, vx: 600, s: -1 });
    const FOC = () => { const g = geo(); return { x: g.vx - g.s * R / 2, y: CY }; };
    PS.drag(S, {
      VW, VH,
      hit: (p) => (st.type !== 'view' && st.src === 'point' && V.dist(p, st.P) < 30 ? 'P' : null),
      move: (k, p) => { const g = geo(); st.P = { x: PS.clamp(p.x, 40, g.vx - 60), y: PS.clamp(p.y, 40, VH - 40) }; S.render(); },
    });
    // 射线与镜面（圆弧，半口径 150）的交点
    function hitMirror(p, d) {
      const g = geo();
      const hit = O.rayCircle(p, d, g.c, R);
      if (!hit) return null;
      if (Math.abs(hit.p.y - CY) > 150) return null;
      if (st.type === 'concave' && hit.p.x < g.c.x) return null;
      if (st.type === 'convex' && hit.p.x > g.c.x) return null;
      // 凸面镜取第一个交点即可；凹面镜从内侧射入，取右侧交点
      const n = V.norm(V.sub(g.c, hit.p));
      return { p: hit.p, n: st.type === 'concave' ? n : V.mul(n, -1) };
    }
    function upd() {
      sSeg.el.style.display = st.type === 'view' ? 'none' : '';
      if (st.type === 'convex' && st.src === 'focus') { st.src = 'parallel'; sSeg.set('parallel', true); }
      let t, a;
      if (st.type === 'concave') {
        t = st.src === 'parallel' ? '<b>凹面镜</b>对光有<b>会聚</b>作用：平行光照射到凹面镜上，反射光会聚于一点——<b>焦点 F</b>。' : st.src === 'focus' ? '把光源放在凹面镜的<b>焦点</b>上，反射光变成<b>平行光</b>射出（光路可逆）。手电筒、汽车头灯、探照灯的反光装置就是这样。' : '拖动点光源：每条光线在镜面上都遵循光的反射定律（法线沿半径方向）。';
        a = ['☀️ 太阳灶（会聚太阳光）', '🔦 手电筒的反光碗', '🚗 汽车头灯', '探照灯', '医生的额镜'];
      } else if (st.type === 'convex') {
        t = '<b>凸面镜</b>对光有<b>发散</b>作用：平行光照射到凸面镜上，反射光向四周散开，反射光的反向延长线交于镜后的一点（虚焦点）。凸面镜成正立、缩小的虚像，能<b>扩大视野</b>。';
        a = ['🚗 汽车观后镜', '道路急转弯处的反光镜', '超市里的防盗镜'];
      } else {
        t = '同样大小的镜子，从<b>凸面镜</b>中能看到更大的范围（绿色区域），所以汽车观后镜、路口的转弯镜都用凸面镜。代价是像变小了，看起来物体离得更远。';
        a = [];
      }
      msg.innerHTML = t;
      apps.innerHTML = a.length ? '<b>应用：</b>' + a.map((x) => '<span class="chip">' + x + '</span>').join('') : '';
      S.render();
    }
    function paintView(ctx, F) {
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 0, VW, VH);
      D.text(ctx, '俯视图', 30, 34, { size: F(14), weight: 800, color: '#495057' });
      [['平面镜', 260, false], ['凸面镜', 740, true]].forEach(([nm, cx, convex]) => {
        const E = { x: cx + 30, y: 400 }, M = { x: cx - 30, y: 330 };
        // 镜面取样
        const pts = [];
        for (let k = 0; k <= 20; k++) {
          const s = (k / 20) * 2 - 1;
          const p0 = { x: M.x + s * 30, y: M.y - s * 22 };
          let n = V.norm({ x: 22, y: 30 }); // 平面镜法线（朝向司机一侧）
          let p = p0;
          if (convex) { const ang = s * 0.5; n = V.norm({ x: Math.cos(Math.atan2(30, 22) + ang), y: Math.sin(Math.atan2(30, 22) + ang) }); p = V.add(p0, V.mul(n, (1 - s * s) * 6)); }
          const d = V.norm(V.sub(p, E)), r = O.reflect(d, n);
          pts.push({ p, r });
        }
        const a = pts[0], b = pts[pts.length - 1];
        ctx.fillStyle = 'rgba(43,138,62,.22)';
        ctx.beginPath(); ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(a.p.x + a.r.x * 700, a.p.y + a.r.y * 700); ctx.lineTo(b.p.x + b.r.x * 700, b.p.y + b.r.y * 700); ctx.lineTo(b.p.x, b.p.y); ctx.closePath(); ctx.fill();
        [a, b].forEach((q) => { PS.beam(ctx, [E, q.p], { color: '#868e96', width: 1.2, dash: [4, 4] }); PS.beam(ctx, [q.p, O.along(q.p, q.r, 400)], { color: '#2b8a3e', width: 1.5 }); });
        ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 6; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.p.x, q.p.y) : ctx.moveTo(q.p.x, q.p.y))); ctx.stroke();
        ctx.fillStyle = '#495057'; D.roundRect(ctx, cx - 10, 340, 120, 100, 14); ctx.fill();
        ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(E.x, E.y, 12, 0, TAU); ctx.fill();
        D.text(ctx, nm, M.x - 40, M.y + 6, { size: F(15), weight: 800, color: '#1c7ed6', align: 'right' });
        D.text(ctx, '司机', E.x + 16, E.y + 4, { size: F(12), weight: 700, color: '#fff' });
      });
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      if (st.type === 'view') { paintView(ctx, F); ctx.restore(); return; }
      PS.darkRoom(ctx, VW, VH);
      const g = geo();
      // 镜面
      ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 7;
      const a0 = Math.asin(150 / R);
      ctx.beginPath();
      if (st.type === 'concave') ctx.arc(g.c.x, g.c.y, R, -a0, a0); else ctx.arc(g.c.x, g.c.y, R, Math.PI - a0, Math.PI + a0);
      ctx.stroke();
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.2;
      for (let k = -14; k <= 14; k++) { const ang = (k / 14) * a0 + (st.type === 'concave' ? 0 : Math.PI); const p = O.along(g.c, V.dir(ang), R + 4); const q = O.along(g.c, V.dir(ang), R + 16); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x + 5, q.y - 6); ctx.stroke(); }
      // 主光轴、焦点
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([8, 6]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, CY); ctx.lineTo(VW - 20, CY); ctx.stroke(); ctx.setLineDash([]);
      const f = FOC();
      ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(f.x, f.y, 5, 0, TAU); ctx.fill();
      D.text(ctx, st.type === 'concave' ? '焦点 F' : '虚焦点 F', f.x, f.y + 26, { size: F(13), weight: 800, color: '#ffe066', align: 'center' });
      // 光线
      const rays = [];
      if (st.src === 'parallel') for (let k = -5; k <= 5; k++) { if (k === 0) continue; rays.push([{ x: 40, y: CY + k * 26 }, { x: 1, y: 0 }]); }
      else { const P = st.src === 'focus' ? f : st.P; for (let k = -6; k <= 6; k++) { const tgt = { x: g.vx, y: CY + k * 23 }; rays.push([P, V.norm(V.sub(tgt, P))]); } }
      rays.forEach(([p, d]) => {
        const hit = hitMirror(p, d);
        if (!hit) return;
        const r = O.reflect(d, hit.n);
        PS.beam(ctx, [p, hit.p], { color: '#ffd43b', width: 1.8, arrow: true, head: 11, glow: 'rgba(255,212,59,.12)' });
        PS.beam(ctx, [hit.p, O.along(hit.p, r, 700)], { color: '#ff922b', width: 1.8, arrow: true, head: 11, glow: 'rgba(255,146,43,.12)' });
        if (st.type === 'convex') PS.beam(ctx, [hit.p, O.along(hit.p, r, -260)], { color: 'rgba(255,224,102,.55)', width: 1.1, dash: [5, 5] });
      });
      if (st.src !== 'parallel') { const P = st.src === 'focus' ? f : st.P; PS.drawBulb(ctx, P.x, P.y, 10, { base: false }); if (st.src === 'point') D.text(ctx, '拖动光源', P.x, P.y - 24, { size: F(12), weight: 700, color: '#ffe066', align: 'center' }); }
      D.text(ctx, st.type === 'concave' ? '凹面镜' : '凸面镜', g.vx + (st.type === 'concave' ? 0 : 30), CY - 175, { size: F(15), weight: 800, color: '#74c0fc', align: 'center' });
      ctx.restore();
    }
    if (!document.getElementById('cm-style')) document.head.append(h('style', { id: 'cm-style' }, '.opt-legend .chip{display:inline-block;background:var(--primary-soft);color:var(--primary);border-radius:999px;padding:1px 10px;margin:2px 4px;font-weight:600}'));
    upd();
  });
})();
