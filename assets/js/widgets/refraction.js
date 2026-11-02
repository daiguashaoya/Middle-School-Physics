/* 第4章第4节：光的折射——光具盘上探究折射规律、叉鱼与激光照鱼、池水变浅 / 水中看岸上 / 碗中硬币、海市蜃楼、三种光现象辨析。依赖 optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const C = PS.LIGHT;
  const NW = 1.33;

  /* ================= 探究光折射时的特点（光具盘） ================= */
  PS.register('refract-law', function (el, opts) {
    const lab = !!opts.lab;
    const VW = 1000, VH = 520, Op = { x: 500, y: 260 }, R = 230;
    const st = { med: 'water', dir: 'in', i: 45, refl: true, rev: false, rows: [], did: { zero: false, rev: false, out: false } };
    const wrap = h('div', { class: lab ? 'bench' : '' });
    const left = h('div'), side = h('div', { class: lab ? 'bench-side' : '' });
    wrap.append(left, side); el.append(wrap);
    const S = PS.stage(left, { ratio: VW + ' / ' + VH, draw: paint });
    const mSeg = PS.ui.seg([{ value: 'water', label: '水' }, { value: 'glass', label: '玻璃' }], st.med, (v) => { st.med = v; upd(); });
    const dSeg = PS.ui.seg([{ value: 'in', label: '空气 → 水（玻璃）' }, { value: 'out', label: '水（玻璃）→ 空气' }], st.dir, (v) => { st.dir = v; st.rev = false; if (v === 'out') st.did.out = true; upd(); });
    const iS = PS.ui.slider({ label: '入射角', min: 0, max: 85, step: 1, value: st.i, unit: '°', onInput: (v) => { st.i = v; st.rev = false; if (v === 0) st.did.zero = true; upd(); } });
    const rT = PS.ui.toggle('显示反射光线', true, (v) => { st.refl = v; S.render(); });
    const revB = PS.ui.button('↩ 光路可逆：逆着折射光射入', () => { st.rev = !st.rev; if (st.rev) st.did.rev = true; upd(); }, 'btn btn-sm');
    const rI = PS.ui.readout('入射角', '—', 'accent'), rR = PS.ui.readout('折射角', '—', 'primary'), rF = PS.ui.readout('反射角', '—');
    const msg = h('div', { class: 'feedback show info' + (lab ? ' small' : '') });
    const ctl = [PS.ui.row(mSeg.el, dSeg.el), PS.ui.row(iS.el, rT.el, revB)];
    let tbody, analysis;
    if (lab) {
      tbody = h('tbody'); analysis = h('div', { class: 'small' });
      left.append(msg);
      side.append(h('div', { class: 'panel' }, h('h4', null, '① 选择介质和方向'), h('div', { class: 'row' }, mSeg.el), h('div', { class: 'row' }, dSeg.el)),
        h('div', { class: 'panel' }, h('h4', null, '② 改变入射角'), h('div', { class: 'row' }, iS.el), h('div', { class: 'row' }, rT.el), h('div', { class: 'row' }, revB)),
        h('div', { class: 'panel' }, h('h4', null, '③ 读数'), h('div', { class: 'readouts', style: { marginTop: 0 } }, rI.el, rR.el), h('div', { class: 'row' }, PS.ui.button('📝 记录这一组', record, 'btn btn-primary btn-sm'), PS.ui.button('清空', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
        h('div', { class: 'panel' }, h('h4', null, '④ 数据记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '方向'), h('th', null, '入射角'), h('th', null, '折射角'))), tbody))),
        h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis));
    } else el.append(...ctl, h('div', { class: 'readouts' }, rI.el, rR.el, rF.el), msg);
    const n2 = () => PS.N_MEDIA[st.med].n;
    // 计算光路：入射方向角 i（与法线夹角），方向 in：从上（空气）射向下；out：从下射向上
    function rays() {
      const nA = 1, nB = n2();
      const down = st.dir === 'in';
      const n1 = down ? nA : nB, nn2 = down ? nB : nA;
      const i = st.i * DEG;
      let src, d;
      // 入射光线从左侧射向 O
      if (down) { src = O.along(Op, { x: -Math.sin(i), y: -Math.cos(i) }, R); }
      else { src = O.along(Op, { x: -Math.sin(i), y: Math.cos(i) }, R); }
      d = V.norm(V.sub(Op, src));
      const nrm = { x: 0, y: down ? -1 : 1 };
      const t = O.refract(d, nrm, n1, nn2);
      const r = O.reflect(d, { x: 0, y: -1 });
      const rAng = t ? Math.asin(Math.abs(t.x)) / DEG : null;
      // 菲涅耳反射率（非偏振，近似）：决定反射光、折射光的亮度
      let Rf = 1;
      if (t) { const ci = Math.cos(i), ct = Math.cos(rAng * DEG); const rs = ((n1 * ci - nn2 * ct) / (n1 * ci + nn2 * ct)) ** 2, rp = ((n1 * ct - nn2 * ci) / (n1 * ct + nn2 * ci)) ** 2; Rf = (rs + rp) / 2; }
      return { src, d, t, r, rAng, Rf };
    }
    function upd() {
      const g = rays();
      let src = g.src;
      rI.set(st.i + '°'); rF.set(st.i + '°');
      rR.set(g.t ? PS.fmt(g.rAng, 0) + '°' : '<span class="small">无折射光</span>');
      const med = PS.N_MEDIA[st.med].name;
      let t;
      if (st.rev) t = '让光逆着原来折射光的方向射到 O 点，折射光沿着原来入射光的方向射出——在折射现象中，<b>光路是可逆的</b>。';
      else if (st.i === 0) t = '光<b>垂直</b>射到' + med + '面上时，传播方向<b>不改变</b>（入射角和折射角都是 0°）。';
      else if (!g.t) t = '（拓展）光从' + med + '斜射入空气，入射角大到一定程度时，折射光<b>消失</b>了，光全部被反射回' + med + '中——这叫<b>全反射</b>。光纤通信就利用了全反射。';
      else if (st.dir === 'in') t = '光从空气<b>斜射</b>入' + med + '中，传播方向发生偏折，折射光线<b>偏向</b>法线，折射角 <b>小于</b> 入射角。入射角增大，折射角也增大。';
      else t = '光从' + med + '<b>斜射</b>入空气中，折射光线<b>偏离</b>法线，折射角 <b>大于</b> 入射角。';
      if (!st.rev && g.t && st.i > 0) t += '<br>同时界面上还发生了<b>反射</b>。折射光线、入射光线和法线在同一平面内，折射光线和入射光线分居法线两侧。';
      msg.className = 'feedback show ' + (st.rev ? 'ok' : 'info') + (lab ? ' small' : '');
      msg.innerHTML = t;
      void src;
      S.render();
      if (lab) analyse();
    }
    function record() {
      const g = rays();
      if (st.rev) { PS.toast('先关闭“光路可逆”再记录'); return; }
      if (!g.t) { PS.toast('没有折射光，无法读出折射角', 'bad'); return; }
      const dir = st.dir === 'in' ? '空气→' + PS.N_MEDIA[st.med].name : PS.N_MEDIA[st.med].name + '→空气';
      if (st.rows.some((r) => r.dir === dir && r.i === st.i)) { PS.toast('这一组已经记录过了'); return; }
      st.rows.push({ dir, i: st.i, r: Math.round(g.rAng) });
      if (st.rows.length > 10) st.rows.shift();
      PS.sound.tick(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.dir), h('td', null, r.i + '°'), h('td', null, r.r + '°'))));
      analyse();
    }
    function analyse() {
      const ins = st.rows.filter((r) => r.dir.indexOf('空气→') === 0 && r.i > 0), outs = st.rows.filter((r) => r.dir.indexOf('→空气') > 0 && r.i > 0);
      const items = [
        ['光从空气斜射入水（玻璃）中，折射角<b>小于</b>入射角（已测 ' + ins.length + ' 组）', ins.length >= 2],
        ['入射角增大，折射角也<b>增大</b>', ins.length >= 3 || outs.length >= 3],
        ['光从水（玻璃）斜射入空气中，折射角<b>大于</b>入射角', outs.length >= 1],
        ['光垂直射入时，传播方向<b>不变</b>（入射角调到 0°）', st.did.zero],
        ['在折射现象中，<b>光路可逆</b>', st.did.rev],
      ];
      analysis.innerHTML = items.map(([t, ok]) => (ok ? '✅ ' : '⬜ ') + t).join('<br>') + (items.every((x) => x[1]) ? '<br><b class="hl-g">结论：三线共面，两线分居；空气中的角总是较大的角；光路可逆。</b>' : '');
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => (V.dist(p, rays().src) < 36 ? 'L' : null),
      move: (k, p) => {
        const v = V.sub(p, Op);
        const down = st.dir === 'in';
        let a = Math.atan2(-v.x, down ? -v.y : v.y) / DEG;
        st.i = Math.round(PS.clamp(a, 0, 85)); iS.set(st.i, true); st.rev = false;
        if (st.i === 0) st.did.zero = true;
        upd();
      },
    });
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#1a2234'; ctx.fillRect(0, 0, VW, VH);
      // 光具盘
      ctx.fillStyle = '#f8f9fa'; ctx.beginPath(); ctx.arc(Op.x, Op.y, R + 26, 0, TAU); ctx.fill();
      const isW = st.med === 'water';
      ctx.fillStyle = isW ? 'rgba(116,192,252,.55)' : 'rgba(165,216,255,.75)';
      ctx.beginPath(); ctx.arc(Op.x, Op.y, R + 26, 0, Math.PI); ctx.closePath(); ctx.fill();
      if (!isW) { ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(Op.x, Op.y, R - 40, 0, Math.PI); ctx.closePath(); ctx.stroke(); }
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2;
      for (let a = 0; a < 360; a += 5) {
        const ang = a * DEG, L = a % 10 ? 8 : 16;
        ctx.beginPath(); ctx.moveTo(Op.x + Math.cos(ang) * (R + 26), Op.y + Math.sin(ang) * (R + 26)); ctx.lineTo(Op.x + Math.cos(ang) * (R + 26 - L), Op.y + Math.sin(ang) * (R + 26 - L)); ctx.stroke();
      }
      ctx.font = PS.font(F(11), 700); ctx.fillStyle = '#495057'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let a = 0; a <= 90; a += 10) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const ang = Math.atan2(sy * Math.cos(a * DEG), sx * Math.sin(a * DEG)); if ((a === 0 && sx > 0)) return; ctx.fillText(String(a), Op.x + Math.cos(ang) * (R + 2), Op.y + Math.sin(ang) * (R + 2)); });
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Op.x - R - 26, Op.y); ctx.lineTo(Op.x + R + 26, Op.y); ctx.stroke();
      PS.normalLine(ctx, Op, { x: 0, y: -1 }, R + 26, { color: '#868e96' });
      D.text(ctx, '空气', Op.x - R - 60, Op.y - 30, { size: F(15), weight: 800, color: '#dee2e6', align: 'right' });
      D.text(ctx, PS.N_MEDIA[st.med].name, Op.x - R - 60, Op.y + 40, { size: F(15), weight: 800, color: '#74c0fc', align: 'right' });
      D.text(ctx, '法线', Op.x + 10, Op.y - R - 8, { size: F(12), weight: 700, color: '#868e96' });
      // 光线
      const g = rays();
      const LC = '#ff3b3b';
      if (st.rev) {
        // 逆着折射光射入：从折射光的终点射回 O，出射光沿原入射光反方向
        const P = O.along(Op, g.t, R);
        PS.beam(ctx, [P, Op, g.src], { color: LC, width: 3, arrow: true, head: 15, glow: 'rgba(255,59,59,.25)' });
        PS.drawLaser(ctx, P.x, P.y, V.ang(V.sub(Op, P)), { len: 60, w: 13 });
      } else {
        PS.beam(ctx, [g.src, Op], { color: LC, width: 3, arrow: true, head: 15, glow: 'rgba(255,59,59,.25)' });
        if (g.t) PS.beam(ctx, [Op, O.along(Op, g.t, R)], { color: LC, width: 3 * Math.max(0.45, 1 - g.Rf), arrow: true, head: 15, glow: 'rgba(255,59,59,.22)', alpha: Math.max(0.5, 1 - g.Rf) });
        if (st.refl && st.i > 0) PS.beam(ctx, [Op, O.along(Op, { x: g.d.x, y: -g.d.y }, R)], { color: '#ff8787', width: 2, arrow: true, head: 12, alpha: PS.clamp(0.25 + g.Rf * 2.5, 0.25, 1) });
        PS.drawLaser(ctx, g.src.x, g.src.y, V.ang(g.d), { len: 60, w: 13 });
        PS.handle(ctx, g.src.x - g.d.x * 70, g.src.y - g.d.y * 70, 10, '#e8590c', '拖动', F);
        // 角度
        if (st.i > 0) {
          const up = st.dir === 'in';
          const nIn = up ? -Math.PI / 2 : Math.PI / 2, nOut = -nIn;
          PS.angleArc(ctx, Op.x, Op.y, 70, nIn, V.ang(V.sub(g.src, Op)), { color: '#ffa94d', label: '入射角', fs: F(12), off: 34 });
          if (g.t) PS.angleArc(ctx, Op.x, Op.y, 90, nOut, V.ang(g.t), { color: '#4dabf7', label: '折射角', fs: F(12), off: 34 });
        }
      }
      D.text(ctx, 'O', Op.x - 16, Op.y + 18, { size: F(14), weight: 800, color: '#1b2333' });
      ctx.restore();
    }
    if (lab) table();
    upd();
  });

  /* ================= 叉鱼与激光照鱼 ================= */
  PS.register('fish-spear', function (el) {
    const VW = 1000, VH = 460, WY = 190;
    const st = { tool: 'spear', fish: { x: 640, y: 360 }, eye: { x: 160, y: 70 }, aim: null, shot: null, t: 0, showImg: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const tSeg = PS.ui.seg([{ value: 'spear', label: '🔱 用鱼叉叉鱼' }, { value: 'laser', label: '🔦 用激光照鱼' }], st.tool, (v) => { st.tool = v; st.shot = null; upd(); });
    const iT = PS.ui.toggle('显示光路和鱼的真实位置', false, (v) => { st.showImg = v; S.render(); });
    const nB = PS.ui.button('🐟 换一条鱼', () => { st.fish = { x: PS.randInt(520, 820), y: PS.randInt(290, 400) }; st.shot = null; upd(); }, 'btn btn-ghost btn-sm');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(tSeg.el, iT.el, nB), msg);
    // 鱼发出的光经水面折射进入眼睛：求水面上的折射点（二分法）
    function surfPoint(P, E) {
      let lo = Math.min(P.x, E.x), hi = Math.max(P.x, E.x);
      const f = (x) => { const s1 = (x - P.x) / Math.hypot(x - P.x, WY - P.y), s2 = (E.x - x) / Math.hypot(E.x - x, E.y - WY); return NW * s1 - s2; };
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (f(m) * f(lo) <= 0) hi = m; else lo = m; }
      return { x: (lo + hi) / 2, y: WY };
    }
    // 看到的鱼（虚像）：按作图题的习惯，画在鱼的正上方、进入眼睛的光线的反向延长线上
    function imageOf(P) {
      const q = surfPoint(P, st.eye), d = V.sub(q, st.eye);
      return Math.abs(d.x) < 1e-3 ? { x: P.x, y: WY + (P.y - WY) / NW } : V.add(q, V.mul(d, (P.x - q.x) / d.x));
    }
    PS.drag(S, {
      VW, VH,
      hit: () => null,
      click: (p) => {
        if (p.y < WY + 5) return;
        st.aim = p;
        const d = V.norm(V.sub(p, st.eye));
        if (st.tool === 'spear') {
          // 鱼叉沿直线前进
          const s = V.add(st.eye, V.mul(d, 0));
          const k = (st.fish.y - s.y) / d.y, at = V.add(s, V.mul(d, k));
          st.shot = { pts: [st.eye, V.add(s, V.mul(d, (VH - 10 - s.y) / d.y))], hit: Math.abs(at.x - st.fish.x) < 30, t: 0 };
        } else {
          const q = { x: st.eye.x + d.x * ((WY - st.eye.y) / d.y), y: WY };
          const t = O.refract(d, { x: 0, y: -1 }, 1, NW);
          const end = V.add(q, V.mul(t, (VH - WY) / t.y));
          // 是否照到鱼：鱼到折射光线的距离
          const w = V.sub(st.fish, q), dist = Math.abs(V.cross(t, w));
          st.shot = { pts: [st.eye, q, end], hit: dist < 22, t: 0 };
        }
        loop.start(); upd();
      },
    });
    function upd() {
      let t = st.tool === 'spear' ? '你在岸上看到了水中的鱼。<b>点击</b>水中的位置，鱼叉会朝那里叉下去。' : '用激光笔<b>对准你看到的鱼</b>照射（点击水中的位置），能照到鱼吗？';
      if (st.shot) {
        if (st.tool === 'spear') t = st.shot.hit ? '🎉 叉中了！你瞄准的是看到的鱼的<b>下方</b>。因为我们看到的鱼是光经水面<b>折射</b>形成的<b>虚像</b>，像的位置比鱼的实际位置<b>高</b>。' : '没叉中！看到的“鱼”是鱼的<b>虚像</b>，比实际的鱼<b>浅</b>（高）。叉鱼时要对准看到的鱼的<b>下方</b>。打开“显示光路”看看。';
        else t = st.shot.hit ? '🎉 照到了！激光对准看到的鱼（虚像）就能照到真实的鱼——光从鱼射到眼睛与光从眼睛射向鱼走的是同一条路：<b>光路可逆</b>。' : '没照到。激光要对准<b>看到的鱼</b>照射——这样激光沿着鱼射向眼睛的光路逆向传播，正好照到鱼（光路可逆）。';
      }
      msg.className = 'feedback show ' + (st.shot ? (st.shot.hit ? 'ok' : 'bad') : 'info'); msg.innerHTML = t;
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; if (st.shot) st.shot.t = Math.min(1, st.shot.t + dt * 1.6); S.render(); if (st.shot && st.shot.t >= 1 && st.t > 1e9) loop.stop(); }, S.stage);
    function fish(ctx, x, y, alpha, dash) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
      if (dash) { ctx.strokeStyle = '#495057'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; }
      ctx.fillStyle = '#f76707';
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 15, 0, 0, TAU); dash ? ctx.stroke() : ctx.fill();
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(52, -14); ctx.lineTo(52, 14); ctx.closePath(); dash ? ctx.stroke() : ctx.fill();
      if (!dash) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-20, -4, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(-21, -4, 2, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, WY);
      ctx.fillStyle = '#8ce99a'; ctx.fillRect(0, WY - 6, 300, 6);
      const g = ctx.createLinearGradient(0, WY, 0, VH); g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#1864ab');
      ctx.fillStyle = g; ctx.fillRect(0, WY, VW, VH - WY);
      ctx.fillStyle = '#c2a37a'; ctx.fillRect(0, VH - 14, VW, 14);
      // 人
      ctx.fillStyle = '#495057'; D.roundRect(ctx, st.eye.x - 40, st.eye.y + 16, 40, 100, 10); ctx.fill();
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(st.eye.x - 16, st.eye.y, 20, 0, TAU); ctx.fill();
      PS.drawEye(ctx, st.eye.x, st.eye.y, V.ang(V.sub(st.fish, st.eye)), 13);
      const I = imageOf(st.fish);
      // 看到的鱼（虚像）总是画出来；真实的鱼默认看不清
      fish(ctx, I.x, I.y, 0.95, false);
      if (st.showImg || (st.shot && st.shot.t >= 1)) {
        fish(ctx, st.fish.x, st.fish.y, 0.9, true);
        D.text(ctx, '鱼的实际位置', st.fish.x, st.fish.y + 34, { size: F(12), weight: 700, color: '#fff', align: 'center' });
        D.text(ctx, '看到的鱼（虚像）', I.x, I.y - 26, { size: F(12), weight: 700, color: '#fff', align: 'center' });
        [-14, 14].forEach((dx) => {
          const E = { x: st.eye.x + dx, y: st.eye.y }, q = surfPoint(st.fish, E);
          PS.beam(ctx, [st.fish, q, E], { color: '#ffe066', width: 1.8, arrow: true, head: 11 });
          PS.beam(ctx, [q, I], { color: '#fff', width: 1.2, dash: [5, 4], alpha: 0.85 });
        });
      }
      if (st.shot) {
        const k = st.shot.t, pts = st.shot.pts;
        const tot = pts.reduce((s, p, i) => (i ? s + V.dist(pts[i - 1], p) : 0), 0);
        let left = tot * k; const sub = [pts[0]];
        for (let i = 1; i < pts.length && left > 0; i++) { const L = V.dist(pts[i - 1], pts[i]); sub.push(left >= L ? pts[i] : V.lerp(pts[i - 1], pts[i], left / L)); left -= L; }
        if (st.tool === 'spear') { PS.beam(ctx, sub, { color: '#495057', width: 4 }); const e = sub[sub.length - 1]; D.text(ctx, '🔱', e.x, e.y, { size: F(22), align: 'center', baseline: 'middle' }); }
        else PS.beam(ctx, sub, { color: '#ff3b3b', width: 2.6, glow: 'rgba(255,59,59,.3)' });
      }
      D.text(ctx, '水面', 980, WY - 10, { size: F(13), weight: 700, color: '#1864ab', align: 'right' });
      ctx.restore();
    }
    upd(); loop.start();
  });

  /* ================= 池水变浅、水中看岸上、碗中的硬币 ================= */
  PS.register('refract-image', function (el) {
    const VW = 1000, VH = 440;
    const st = { mode: 'pool', level: 0.0, E: { x: 760, y: 60 } };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'pool', label: '池水“变浅”' }, { value: 'diver', label: '从水中看岸上的树' }, { value: 'coin', label: '碗中的硬币' }], st.mode, (v) => { st.mode = v; st.E = v === 'pool' ? { x: 760, y: 60 } : v === 'diver' ? { x: 640, y: 360 } : { x: 860, y: 80 }; upd(); });
    const lS = PS.ui.slider({ label: '往碗里加水', min: 0, max: 1, step: 0.01, value: 0, fmt: (v) => Math.round(v * 100) + '%', onInput: (v) => { st.level = v; upd(); } });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el, lS.el, h('span', { class: 'kbd-hint' }, '可以拖动眼睛')), msg);
    // 由点 P 经过水平界面 y = Y 折射到 E：折射点（P 在介质 nP 中，E 在介质 nE 中）
    function surf(P, E, Y, nP, nE) {
      let lo = Math.min(P.x, E.x), hi = Math.max(P.x, E.x);
      const f = (x) => nP * (x - P.x) / Math.hypot(x - P.x, Y - P.y) - nE * (E.x - x) / Math.hypot(E.x - x, E.y - Y);
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (f(m) * f(lo) <= 0) hi = m; else lo = m; }
      return { x: (lo + hi) / 2, y: Y };
    }
    // 像：在物体的正上方（或正下方）、进入眼睛的光线的反向延长线上（作图题的习惯画法）
    function image(P, Y, nP, nE) {
      const a = surf(P, { x: st.E.x - 14, y: st.E.y }, Y, nP, nE), b = surf(P, { x: st.E.x + 14, y: st.E.y }, Y, nP, nE);
      const q = surf(P, st.E, Y, nP, nE), d = V.sub(q, st.E);
      const img = Math.abs(d.x) < 1e-3 ? { x: P.x, y: Y + ((P.y - Y) * nE) / nP } : V.add(q, V.mul(d, (P.x - q.x) / d.x));
      return { img, a, b, q };
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => (V.dist(p, st.E) < 34 ? 'E' : null),
      move: (k, p) => {
        if (st.mode === 'pool') st.E = { x: PS.clamp(p.x, 560, 960), y: PS.clamp(p.y, 30, 150) };
        else if (st.mode === 'diver') st.E = { x: PS.clamp(p.x, 520, 940), y: PS.clamp(p.y, 270, 410) };
        else st.E = { x: PS.clamp(p.x, 700, 960), y: PS.clamp(p.y, 40, 230) };
        upd();
      },
    });
    function upd() {
      lS.el.style.display = st.mode === 'coin' ? '' : 'none';
      if (st.mode === 'pool') msg.innerHTML = '池底 A 点反射的光从水中斜射入空气时，折射光线<b>偏离</b>法线。人眼逆着折射光线看去，看到的是 A 点的<b>虚像 A′</b>，A′ 比 A <b>高</b>——所以池水看起来比实际的<b>浅</b>。千万不要贸然下水！';
      else if (st.mode === 'diver') msg.innerHTML = '树梢反射的光从空气斜射入水中，折射光线<b>偏向</b>法线。潜水员逆着折射光线看去，看到的树梢的虚像比实际位置<b>高</b>——在水中看岸上的树，树变<b>高</b>了。';
      else {
        const vis = coinVisible();
        msg.className = 'feedback show ' + (vis ? 'ok' : 'info');
        msg.innerHTML = vis ? (st.level > 0.02 ? '加水后又能看到硬币了！硬币反射的光从水中斜射入空气时发生<b>折射</b>，进入了眼睛，看到的是硬币<b>变高</b>的虚像。' : '眼睛能直接看到硬币。拖动眼睛向下移，直到恰好看不见硬币。') : (st.level > 0.02 ? '水还不够多，再加一些。' : '看不到硬币：碗边挡住了硬币射向眼睛的光（光沿<b>直线</b>传播）。慢慢往碗里<b>加水</b>试试。');
        S.render(); return;
      }
      msg.className = 'feedback show info';
      S.render();
    }
    const BOWL = { l: 300, r: 640, top: 200, bot: 380 };
    const COIN = { x: 360, y: 376 };
    function coinVisible() {
      const Y = BOWL.bot - st.level * (BOWL.bot - BOWL.top - 10);
      let P = COIN;
      if (st.level > 0.02) P = image(COIN, Y, NW, 1).img;
      // 视线是否被碗的右边缘挡住（直线到“像”的那一段在水面以上是实际光线）
      const rim = { x: BOWL.r, y: BOWL.top };
      const d = V.sub(P, st.E);
      const yAtRim = st.E.y + (d.y * (rim.x - st.E.x)) / d.x;
      return yAtRim <= rim.y + 0.5; // 视线从碗边上方经过才看得见
    }
    function tree(ctx, x, y, s, alpha, dash) {
      ctx.save(); ctx.globalAlpha = alpha;
      if (dash) { ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 2; }
      ctx.fillStyle = '#8d6e4c'; dash ? ctx.strokeRect(x - 6, y - 60 * s, 12, 60 * s) : ctx.fillRect(x - 6, y - 60 * s, 12, 60 * s);
      ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.moveTo(x, y - 170 * s); ctx.lineTo(x + 50 * s, y - 50 * s); ctx.lineTo(x - 50 * s, y - 50 * s); ctx.closePath(); dash ? ctx.stroke() : ctx.fill();
      ctx.restore();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f1f3f5'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'pool' || st.mode === 'diver') {
        const WY = st.mode === 'pool' ? 170 : 210;
        ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, WY);
        const g = ctx.createLinearGradient(0, WY, 0, VH); g.addColorStop(0, 'rgba(116,192,252,.75)'); g.addColorStop(1, 'rgba(24,100,171,.85)');
        ctx.fillStyle = g; ctx.fillRect(0, WY, VW, VH - WY);
        if (st.mode === 'pool') {
          ctx.fillStyle = '#ced4da'; ctx.fillRect(0, 410, VW, 30);
          const A = { x: 330, y: 410 };
          const r = image(A, WY, NW, 1);
          [r.a, r.b].forEach((q, k) => { const E = { x: st.E.x + (k ? 14 : -14), y: st.E.y }; PS.beam(ctx, [A, q, E], { color: C.ray, width: 2, arrow: true, head: 12 }); PS.beam(ctx, [q, r.img], { color: C.virt, width: 1.3, dash: [6, 5] }); });
          PS.normalLine(ctx, r.a, { x: 0, y: -1 }, 70, { color: '#868e96' });
          ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(A.x, A.y, 7, 0, TAU); ctx.fill();
          D.text(ctx, 'A（池底）', A.x, A.y - 14, { size: F(13), weight: 800, color: '#e8590c', align: 'center' });
          ctx.strokeStyle = C.image; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(r.img.x, r.img.y, 7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          D.text(ctx, 'A′（看到的池底）', r.img.x - 14, r.img.y, { size: F(13), weight: 800, color: '#fff', align: 'right', baseline: 'middle' });
          ctx.strokeStyle = 'rgba(112,72,232,.6)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, r.img.y); ctx.lineTo(VW, r.img.y); ctx.stroke(); ctx.setLineDash([]);
          D.text(ctx, '看起来的池底', 20, r.img.y - 8, { size: F(12), weight: 700, color: '#fff' });
          PS.drawEye(ctx, st.E.x, st.E.y, V.ang(V.sub(r.a, st.E)), 22);
        } else {
          const T = { x: 260, y: WY - 6 };
          tree(ctx, T.x, T.y, 1, 1);
          const top = { x: T.x, y: T.y - 170 };
          const r = image(top, WY, 1, NW);
          tree(ctx, T.x + (r.img.x - top.x) * 0, T.y, (T.y - r.img.y) / 170, 0.45, true);
          [r.a, r.b].forEach((q, k) => { const E = { x: st.E.x + (k ? 14 : -14), y: st.E.y }; PS.beam(ctx, [top, q, E], { color: C.ray, width: 2, arrow: true, head: 12 }); PS.beam(ctx, [q, r.img], { color: C.virt, width: 1.3, dash: [6, 5] }); });
          PS.normalLine(ctx, r.a, { x: 0, y: -1 }, 70, { color: '#868e96' });
          D.text(ctx, '看到的树梢（虚像）', r.img.x + 20, r.img.y, { size: F(13), weight: 800, color: C.image, baseline: 'middle' });
          // 潜水员
          ctx.fillStyle = '#343a40'; D.roundRect(ctx, st.E.x + 6, st.E.y - 12, 120, 30, 14); ctx.fill();
          ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(st.E.x + 4, st.E.y, 16, 0, TAU); ctx.fill();
          PS.drawEye(ctx, st.E.x, st.E.y, V.ang(V.sub(r.a, st.E)), 14);
        }
        D.text(ctx, '空气', 20, 30, { size: F(14), weight: 800, color: '#495057' });
        D.text(ctx, '水', 20, (st.mode === 'pool' ? 170 : 210) + 30, { size: F(14), weight: 800, color: '#fff' });
      } else {
        const B = BOWL, Y = B.bot - st.level * (B.bot - B.top - 10);
        // 水
        if (st.level > 0.01) { ctx.fillStyle = 'rgba(116,192,252,.6)'; ctx.fillRect(B.l + 8, Y, B.r - B.l - 16, B.bot - Y); }
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 10; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(B.l, B.top); ctx.lineTo(B.l + 4, B.bot); ctx.lineTo(B.r - 4, B.bot); ctx.lineTo(B.r, B.top); ctx.stroke();
        ctx.fillStyle = '#fab005'; ctx.fillRect(COIN.x - 22, COIN.y - 8, 44, 8);
        D.text(ctx, '硬币', COIN.x, COIN.y + 34, { size: F(13), weight: 700, color: '#495057', align: 'center' });
        const vis = coinVisible();
        let P = COIN, a = null;
        if (st.level > 0.02) { const r = image(COIN, Y, NW, 1); P = r.img; a = r.q; }
        if (a) {
          PS.beam(ctx, [COIN, a, st.E], { color: vis ? C.ray : 'rgba(247,103,7,.35)', width: 2, arrow: true, head: 12 });
          PS.beam(ctx, [a, P], { color: C.virt, width: 1.3, dash: [6, 5] });
          ctx.fillStyle = 'rgba(250,176,5,.5)'; ctx.fillRect(P.x - 22, P.y - 8, 44, 8);
          D.text(ctx, '看到的硬币（虚像）', P.x + 30, P.y - 14, { size: F(12), weight: 700, color: C.image });
        } else {
          PS.beam(ctx, [COIN, st.E], { color: vis ? C.ray : 'rgba(247,103,7,.35)', width: 2, dash: vis ? null : [6, 5] });
          if (!vis) D.text(ctx, '光被碗边挡住', B.r + 10, B.top - 20, { size: F(13), weight: 800, color: '#e03131' });
        }
        PS.drawEye(ctx, st.E.x, st.E.y, V.ang(V.sub(P, st.E)), 22);
        D.text(ctx, vis ? '👀 看得见硬币' : '🙈 看不见硬币', st.E.x, st.E.y + 46, { size: F(14), weight: 800, color: vis ? '#2b8a3e' : '#e03131', align: 'center' });
      }
      ctx.restore();
    }
    upd();
  });

  /* ================= 海市蜃楼 ================= */
  PS.register('mirage', function (el) {
    const VW = 1000, VH = 420, GY = 380;
    const st = { mode: 'sea' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'sea', label: '海面上（下冷上暖）' }, { value: 'desert', label: '沙漠里（下热上冷）' }], st.mode, (v) => { st.mode = v; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), msg);
    // 折射率随高度变化（为便于观察作了夸大）：海面上方空气下冷上暖，下层密、折射率大；沙漠下热上冷，下层疏、折射率小
    const nf = (x, y) => { const z = GY - y; const k = 0.07 / (1 + Math.exp((z - 60) / 18)); return st.mode === 'sea' ? 1 + k : 1 + 0.07 - k; };
    const E = { x: 90, y: GY - 60 };
    function shoot(target) {
      // 从眼睛反向追踪：找到能到达物体的光线（光路可逆）
      // 可能有两条光线能到达：一条近似直射，一条弯曲（蜃景）。海面上取最向上射出的那条，沙漠里取最向下的那条
      const sols = [];
      let prev = null;
      for (let a = -0.35; a <= 0.35; a += 0.002) {
        const pts = PS.traceGrad(E, V.dir(a), nf, { ds: 4, steps: 400, stop: (p) => p.x >= target.x || p.y >= GY || p.y < 0 });
        const end = pts[pts.length - 1];
        const f = end.x >= target.x - 2 ? end.y - target.y : null;
        if (f != null && Math.abs(f) < 5) sols.push({ a, pts, err: Math.abs(f) });
        else if (f != null && prev && prev.f != null && Math.sign(f) !== Math.sign(prev.f)) sols.push({ a, pts, err: Math.abs(f) });
        prev = { f };
      }
      if (!sols.length) return null;
      return sols.reduce((b, s) => (st.mode === 'sea' ? (s.a < b.a ? s : b) : (s.a > b.a ? s : b)));
    }
    let cache = {};
    function upd() {
      msg.innerHTML = st.mode === 'sea'
        ? '海面上方的空气<b>下层冷、密</b>，上层暖、疏。远处景物射向空中的光，在密度不均匀的空气中发生<b>折射</b>，逐渐弯向地面，进入观察者的眼睛。人逆着光看去，看到景物的<b>虚像</b>“悬”在空中——这就是海市蜃楼。'
        : '沙漠中地面附近的空气<b>下层热、疏</b>，上层冷、密。远处的树、天空射向地面的光逐渐向上弯曲，进入人眼，人看到地面上好像有一片“水”，水中有树的倒影（倒立的虚像）。夏天柏油路面远处“像有水”也是这个道理。';
      cache = {};
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const sky = ctx.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#a5d8ff'); sky.addColorStop(1, st.mode === 'sea' ? '#e7f5ff' : '#fff4e6');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, GY);
      // 空气分层（颜色表示密度）
      for (let y = GY - 140; y < GY; y += 4) { const n = nf(0, y); ctx.fillStyle = 'rgba(28,126,214,' + ((n - 1) / 0.07) * 0.12 + ')'; ctx.fillRect(0, y, VW, 4); }
      ctx.fillStyle = st.mode === 'sea' ? '#1c7ed6' : '#f2c27b'; ctx.fillRect(0, GY, VW, VH - GY);
      D.text(ctx, st.mode === 'sea' ? '冷、密' : '热、疏', 990, GY - 14, { size: F(13), weight: 800, color: '#1b2333', align: 'right' });
      D.text(ctx, st.mode === 'sea' ? '暖、疏' : '冷、密', 990, GY - 150, { size: F(13), weight: 800, color: '#1b2333', align: 'right' });
      const OX = 900;
      // 景物
      const obj = st.mode === 'sea' ? [{ x: OX, y: GY - 50 }, { x: OX, y: GY - 10 }] : [{ x: OX, y: GY - 120 }, { x: OX, y: GY - 60 }];
      if (st.mode === 'sea') { ctx.fillStyle = '#495057'; ctx.fillRect(OX - 40, GY - 50, 80, 40); ctx.fillRect(OX - 20, GY - 70, 30, 20); D.text(ctx, '远处的船', OX, GY - 80, { size: F(12), weight: 700, color: '#1b2333', align: 'center' }); }
      else { ctx.fillStyle = '#8d6e4c'; ctx.fillRect(OX - 5, GY - 80, 10, 80); ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(OX, GY - 110, 34, 0, TAU); ctx.fill(); D.text(ctx, '远处的树', OX, GY - 155, { size: F(12), weight: 700, color: '#1b2333', align: 'center' }); }
      // 人
      ctx.fillStyle = '#495057'; ctx.fillRect(E.x - 14, E.y + 14, 24, GY - E.y - 14);
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(E.x - 4, E.y, 14, 0, TAU); ctx.fill();
      PS.drawEye(ctx, E.x + 6, E.y, 0, 11);
      // 光线
      const imgs = [];
      obj.forEach((p, k) => {
        const key = st.mode + k;
        if (!(key in cache)) cache[key] = shoot(p);
        const b = cache[key];
        if (!b) return;
        const pts = b.pts.slice().reverse();
        PS.beam(ctx, pts, { color: C.ray, width: 2 });
        PS.arrowHead(ctx, pts[Math.floor(pts.length / 2)].x, pts[Math.floor(pts.length / 2)].y, V.ang(V.sub(pts[Math.floor(pts.length / 2) + 1], pts[Math.floor(pts.length / 2) - 1])), 13, C.ray);
        const d = V.dir(b.a), far = { x: OX, y: E.y + (d.y / d.x) * (OX - E.x) };
        PS.beam(ctx, [E, far], { color: C.virt, width: 1.3, dash: [6, 5] });
        imgs.push(far);
      });
      if (imgs.length === 2) {
        const [t, b] = imgs; // 物体上端、下端的像
        ctx.save(); ctx.globalAlpha = 0.5;
        if (st.mode === 'sea') { const s = (b.y - t.y) / 40; ctx.fillStyle = '#7048e8'; ctx.fillRect(OX - 40, t.y, 80, 40 * s); ctx.fillRect(OX - 20, t.y - 20 * s, 30, 20 * s); }
        else { ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.arc(OX, t.y + 26, 30, 0, TAU); ctx.fill(); ctx.fillRect(OX - 5, b.y - 30, 10, 30); }
        ctx.restore();
        D.text(ctx, st.mode === 'sea' ? '看到的船（虚像，在空中）' : '看到的树（倒立的虚像，像在“水”中）', OX - 60, Math.min(t.y, b.y) - 16, { size: F(13), weight: 800, color: '#7048e8', align: 'right' });
        if (st.mode === 'desert') { ctx.fillStyle = 'rgba(165,216,255,.6)'; ctx.beginPath(); ctx.ellipse(OX - 60, GY - 4, 140, 10, 0, 0, TAU); ctx.fill(); }
      }
      D.text(ctx, '示意图：空气折射率的变化作了夸大', 20, 24, { size: F(12), weight: 600, color: '#495057' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 三种光现象辨析 ================= */
  const JUDGE = [
    ['影子的形成', 0], ['小孔成像', 0], ['日食、月食', 0], ['激光准直', 0], ['排队时“向前看齐”', 0], ['立竿见影', 0], ['一叶障目，不见泰山', 0], ['凿壁偷光', 0], ['树荫下的圆形光斑', 0], ['手影游戏', 0], ['射击瞄准时“三点一线”', 0], ['坐井观天，所见甚小', 0],
    ['平静的湖面映出岸边的树（倒影）', 1], ['镜中花，水中月', 1], ['照镜子', 1], ['用潜望镜观察水面上的情况', 1], ['我们能看到不发光的课本', 1], ['黑板“反光”', 1], ['玻璃幕墙造成光污染', 1], ['杯弓蛇影', 1], ['自行车尾灯“发光”', 1], ['汽车观后镜中看到后方的车', 1], ['波光粼粼的湖面', 1],
    ['池水看起来比实际的浅', 2], ['插入水中的筷子好像在水面处“折断”了', 2], ['海市蜃楼', 2], ['叉鱼时要对准看到的鱼的下方', 2], ['用放大镜看报纸上的字', 2], ['岸上的人看到水中的鱼', 2], ['透过厚玻璃砖看钢笔，钢笔好像“错位”了', 2], ['碗中加水后又能看到碗底的硬币', 2], ['夜空中的星星“眨眼睛”', 2],
    ['雨后天空出现彩虹', 3], ['白光通过三棱镜后形成彩色光带', 3], ['背对太阳向空中喷水雾，看到彩虹', 3],
  ];
  const JNAME = ['光的直线传播', '光的反射', '光的折射', '光的色散'];
  const JWHY = [
    '光在同种均匀介质中沿直线传播形成的。',
    '光射到物体表面（镜面、水面等）被反射形成的；平面镜成的是虚像。',
    '光从一种介质斜射入另一种介质（或在不均匀的介质中）传播方向发生偏折形成的。',
    '白光被分解成各种色光，是光的色散（本质上也是折射）。',
  ];
  PS.register('light-judge', function (el, opts) {
    const cats = opts.all ? 4 : 3;
    const items = JUDGE.filter((x) => x[1] < cats);
    const st = { q: null, ok: 0, n: 0, last: -1 };
    const stem = h('div', { class: 'lj-stem' });
    const btns = h('div', { class: 'lj-btns' });
    const fb = h('div', { class: 'feedback' });
    const score = h('div', { class: 'quiz-score' });
    el.append(h('div', { class: 'quiz-head' }, score, PS.ui.button('下一题 →', next, 'btn btn-primary btn-sm')), stem, btns, fb);
    JNAME.slice(0, cats).forEach((n, k) => btns.append(PS.ui.button(n, () => pick(k), 'btn')));
    function next() {
      let i; do { i = PS.randInt(0, items.length - 1); } while (i === st.last && items.length > 1);
      st.last = i; st.q = items[i]; st.done = false;
      stem.innerHTML = '“' + st.q[0] + '”是由于什么形成的？';
      fb.className = 'feedback'; btns.querySelectorAll('button').forEach((b) => { b.disabled = false; b.className = 'btn'; });
    }
    function pick(k) {
      if (st.done) return; st.done = true; st.n++;
      const ok = k === st.q[1]; if (ok) st.ok++;
      btns.querySelectorAll('button').forEach((b, j) => { b.disabled = true; if (j === st.q[1]) b.className = 'btn btn-green'; else if (j === k) b.className = 'btn btn-red'; });
      fb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✔ 正确！' : '✘ 应该是<b>' + JNAME[st.q[1]] + '</b>。') + JWHY[st.q[1]];
      ok ? PS.sound.good() : PS.sound.bad();
      score.innerHTML = '已答 <b>' + st.n + '</b> 题 · 答对 <b class="ok">' + st.ok + '</b>';
      setTimeout(() => { if (st.done) next(); }, ok ? 1600 : 3200);
    }
    if (!document.getElementById('lj-style')) document.head.append(h('style', { id: 'lj-style' }, '.lj-stem{font-size:1.15rem;font-weight:700;margin:10px 0 12px;padding:14px 16px;background:var(--surface-2);border-radius:12px;border:1px solid var(--line)}.lj-btns{display:flex;flex-wrap:wrap;gap:8px}'));
    score.innerHTML = '题目随机出现，答完自动进入下一题';
    next();
  });
})();
