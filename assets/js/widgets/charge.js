/* 第15章第1节：两种电荷——摩擦起电 rub-charge、原子结构 atom-model、带电情况的推理 charge-judge、验电器 two-electroscopes、
 * 导体还是绝缘体 conductor-test、分类 cond-sort。依赖 circuit.js、energy.js（PS.en.stage） */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el, EN = PS.en;
  const TAU = Math.PI * 2;
  const POS = PS.ELC.pos, NEG = PS.ELC.neg;

  const chg = EL.chg;

  /** “按住”按钮：按住时 on，点一下补 0.9 s */
  function holdBtn(label, st, key) {
    const b = PS.ui.button(label, null, 'btn btn-primary btn-sm');
    b.addEventListener('pointerdown', () => { st[key] = true; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => { st[key] = false; }));
    b.addEventListener('click', () => { st[key + 'T'] = 0.9; });
    return b;
  }

  /* ================= 摩擦起电 ================= */
  const PAIRS = {
    glass: { rod: '玻璃棒', cloth: '丝绸', sign: 1, rc: 'rgba(165,216,255,.9)', rs: '#4dabf7', cc: '#fff4e6', cs: '#d9c39a', why: '玻璃的原子核束缚电子的本领比丝绸弱' },
    rubber: { rod: '橡胶棒', cloth: '毛皮', sign: -1, rc: '#3b3f45', rs: '#212529', cc: '#a0622d', cs: '#7a3e1d', why: '毛皮的原子核束缚电子的本领比橡胶弱' },
    pen: { rod: '塑料笔杆', cloth: '头发', sign: -1, rc: '#4dabf7', rs: '#1c7ed6', cc: '#3b2a20', cs: '#21170f', why: '头发的原子核束缚电子的本领比塑料弱' },
  };
  PS.register('rub-charge', function (el) {
    const st = { k: 'glass', q: 0, rub: false, rubT: 0, t: 0, near: 0, nearGoal: 0, m: 0, fly: [], bits: [] };
    const seg = PS.ui.seg(Object.keys(PAIRS).map((k) => ({ value: k, label: PAIRS[k].rod + ' + ' + PAIRS[k].cloth })), 'glass', (v) => { st.k = v; reset(); });
    const rd = { q: PS.ui.readout('转移的电子（示意）', '0 个'), rod: PS.ui.readout('棒', '不带电'), cloth: PS.ui.readout('布 / 毛皮', '不带电') };
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, seg.el), view,
      h('div', { class: 'controls', style: { marginTop: '8px' } }, holdBtn('✋ 按住摩擦', st, 'rub'), PS.ui.button('⬇ 靠近碎纸屑', () => { st.nearGoal = st.nearGoal ? 0 : 1; PS.sound.tick(); }, 'btn btn-sm'), PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')),
      h('div', { class: 'el-read' }, rd.q.el, rd.rod.el, rd.cloth.el), msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1250 : 520), draw });
    function reset() {
      st.q = 0; st.m = 0; st.fly = []; st.near = 0; st.nearGoal = 0;
      st.bits = []; for (let i = 0; i < 10; i++) st.bits.push({ x: 140 + i * 38 + (i % 3) * 5, y: 0, a: (i * 37) % 60 - 30, stuck: false, s: 0 });
      tell(true);
    }
    let lastKey = '';
    function tell(force) {
      const P = PAIRS[st.k], n = Math.round(st.q);
      const key = n + '|' + st.nearGoal + '|' + st.bits.filter((b) => b.stuck).length;
      if (key === lastKey && !force) return;
      lastKey = key;
      rd.q.set(n + ' 个'); rd.cloth.el.firstChild.textContent = P.cloth;
      rd.rod.el.firstChild.textContent = P.rod;
      const s1 = n ? (P.sign > 0 ? '<span class="el-pos">带正电</span>' : '<span class="el-neg">带负电</span>') : '不带电';
      const s2 = n ? (P.sign > 0 ? '<span class="el-neg">带负电</span>' : '<span class="el-pos">带正电</span>') : '不带电';
      rd.rod.set(s1); rd.cloth.set(s2);
      let s, c = 'info';
      if (!n) s = '按住“摩擦”按钮，用' + P.cloth + '摩擦' + P.rod + '。看右边的放大镜：摩擦时，电子会从一个物体转移到另一个物体上。';
      else if (st.nearGoal) {
        const k = st.bits.filter((b) => b.stuck).length;
        s = '带电的' + P.rod + '吸引了 ' + k + ' 片碎纸屑——<b>带电体有吸引轻小物体的性质</b>。' + (n < 6 ? '多摩擦几下再试试，能吸起更多纸屑。' : ''); c = 'ok';
      } else {
        s = '<b>' + P.why + '</b>，摩擦时电子从' + (P.sign > 0 ? P.rod + '转移到' + P.cloth : P.cloth + '转移到' + P.rod) + '上：失去电子的' + (P.sign > 0 ? P.rod : P.cloth) + '带<span class="el-pos">正电</span>，得到电子的' + (P.sign > 0 ? P.cloth : P.rod) + '带等量的<span class="el-neg">负电</span>。摩擦起电<b>不是创造了电荷</b>，只是电荷发生了转移。';
        c = 'ok';
      }
      msg.className = 'el-msg ' + c; msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const rubbing = (st.rub || st.rubT > 0) && st.near < 0.05;
      if (st.rubT > 0) st.rubT -= dt;
      if (rubbing && st.q < 9) {
        st.q = Math.min(9, st.q + dt * 2.2);
        const m = Math.min(5, Math.floor((st.q * 5) / 9 + 0.2));
        while (st.m < m) { st.fly.push({ i: st.m, f: 0 }); st.m++; }
        if (Math.random() < dt * 6) PS.sound.tick();
      }
      if (st.nearGoal && (st.rub || st.rubT > 0)) st.nearGoal = 0;
      st.near += PS.clamp(st.nearGoal - st.near, -dt * 1.6, dt * 1.6);
      st.fly.forEach((f) => { f.f = Math.min(1, f.f + dt * 1.8); });
      const cap = Math.round(st.q);
      let stuck = st.bits.filter((b) => b.stuck).length;
      st.bits.forEach((b) => {
        if (!b.stuck && st.near > 0.85 && stuck < cap && b.x > 120 && b.x < 520) { b.stuck = true; stuck++; }
        if (b.stuck && st.nearGoal === 0 && st.near < 0.4 && Math.random() < dt * 1.5) b.stuck = false;
        b.s += ((b.stuck ? 1 : 0) - b.s) * Math.min(1, dt * 7);
      });
      tell();
      S.render();
    }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), P = PAIRS[st.k], nar = VH > 600;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      const k = nar ? 1.45 : 1;
      // ---- 宏观 ----
      ctx.save(); if (nar) ctx.scale(k, k);
      const VWm = nar ? 1000 / k : 620;
      const rx0 = 60, rx1 = Math.min(560, VWm - 40), ry = 150 + st.near * 190, rh = 34;
      ctx.fillStyle = '#e9dcc6'; ctx.fillRect(0, 470, VWm, 50); ctx.fillStyle = '#d6c4a4'; ctx.fillRect(0, 470, VWm, 4);
      st.bits.forEach((b, i) => {
        const by = 462, sy = ry + rh / 2 + 6 + (i % 2) * 7, y = by + (sy - by) * b.s, x = b.x + Math.sin(st.t * 3 + i) * 2 * b.s;
        ctx.save(); ctx.translate(x, y); ctx.rotate((b.a * Math.PI) / 180 * (1 - b.s * 0.6));
        ctx.fillStyle = ['#fff', '#fff9db', '#e7f5ff'][i % 3]; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1;
        ctx.fillRect(-9, -5, 18, 10); ctx.strokeRect(-9, -5, 18, 10); ctx.restore();
      });
      D.text(ctx, '碎纸屑', 120, 500, { size: F(13) / (nar ? k : 1), weight: 700, color: '#7a6a50' });
      const g = ctx.createLinearGradient(0, ry - rh / 2, 0, ry + rh / 2);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, P.rc); g.addColorStop(1, P.rs);
      ctx.fillStyle = g; D.roundRect(ctx, rx0, ry - rh / 2, rx1 - rx0, rh, rh / 2); ctx.fill();
      ctx.fillStyle = '#8c6d46'; D.roundRect(ctx, rx0 - 10, ry - rh / 2 - 3, 70, rh + 6, 8); ctx.fill();
      D.text(ctx, P.rod, rx0 + 25, ry - rh / 2 - 12, { size: F(14) / (nar ? k : 1), weight: 800, align: 'left', color: '#1b2333' });
      const n = Math.round(st.q);
      for (let i = 0; i < n; i++) chg(ctx, 170 + i * ((rx1 - 220) / 9), ry + (i % 2 ? 6 : -6), P.sign, 10);
      const rubbing = (st.rub || st.rubT > 0) && st.near < 0.05;
      if (st.near < 0.3) {
        const cx = 330 + (rubbing ? Math.sin(st.t * 13) * 95 : 0), cy = ry - 4, alpha = 1 - st.near * 3;
        ctx.save(); ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = P.cc; ctx.strokeStyle = P.cs; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, cy - 6, 70, 46, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (st.k !== 'glass') { ctx.strokeStyle = P.cs; ctx.lineWidth = 1.5; for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU, x = cx + Math.cos(a) * 62, y = cy - 6 + Math.sin(a) * 40; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 10); ctx.stroke(); } }
        for (let i = 0; i < n; i++) chg(ctx, cx - 45 + (i % 5) * 22, cy - 24 + Math.floor(i / 5) * 24, -P.sign, 9);
        D.text(ctx, P.cloth, cx, cy - 64, { size: F(14) / (nar ? k : 1), weight: 800, align: 'center', color: '#1b2333' });
        ctx.restore();
      }
      if (rubbing) D.text(ctx, '摩擦中……', 330, 80, { size: F(15) / (nar ? k : 1), weight: 800, align: 'center', color: '#e8590c' });
      ctx.restore();
      // ---- 放大镜 ----
      const cx = nar ? 500 : 812, cy = nar ? 1010 : 250, R = nar ? 200 : 176;
      ctx.save();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, TAU); ctx.clip();
      ctx.fillStyle = P.sign > 0 ? 'rgba(165,216,255,.25)' : 'rgba(52,58,64,.12)'; ctx.fillRect(cx - R, cy - R, 2 * R, R);
      ctx.fillStyle = 'rgba(217,195,154,.25)'; ctx.fillRect(cx - R, cy, 2 * R, R);
      ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke(); ctx.setLineDash([]);
      const loser = P.sign > 0 ? 0 : 1;
      const rowY = [cy - 62, cy + 62], xs = [-2, -1, 0, 1, 2].map((i) => cx + i * 64);
      const pos = (row, i, a) => [xs[i] + Math.cos(a) * 25, rowY[row] + Math.sin(a) * 25];
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 5; i++) {
          const x = xs[i], y = rowY[row];
          ctx.strokeStyle = 'rgba(28,126,214,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 25, 0, TAU); ctx.stroke();
          ctx.fillStyle = POS; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
          D.text(ctx, '+', x, y + 1, { size: 15, weight: 900, align: 'center', baseline: 'middle', color: '#fff' });
          const flying = st.fly.find((f) => f.i === i && f.f < 1);
          const lost = i < st.m && row === loser;
          const extra = i < st.m && row !== loser && !flying;
          const a0 = st.t * 2.2 + i * 1.3 + row;
          if (!lost || flying) { if (!(row === loser && flying)) { const p = pos(row, i, a0); chg(ctx, p[0], p[1], -1, 7); } }
          if (extra) { const p = pos(row, i, a0 + Math.PI); chg(ctx, p[0], p[1], -1, 7); }
          if (lost && !flying) D.text(ctx, '缺电子', x, y + (row ? 38 : -34), { size: 12, weight: 800, align: 'center', baseline: 'middle', color: POS });
        }
      }
      st.fly.forEach((f) => {
        if (f.f >= 1) return;
        const a = pos(loser, f.i, st.t * 2.2 + f.i * 1.3 + loser), b = pos(1 - loser, f.i, st.t * 2.2 + f.i * 1.3 + 1 - loser + Math.PI);
        const e = f.f * f.f * (3 - 2 * f.f);
        chg(ctx, a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e - Math.sin(e * Math.PI) * 18, -1, 8);
      });
      ctx.restore();
      const fs = F(13);
      D.text(ctx, P.rod + (st.m ? (P.sign > 0 ? '：失去电子' : '：得到电子') : '的原子'), cx, cy - R + fs * 1.6, { size: fs, weight: 800, align: 'center', color: '#1b2333', bg: 'rgba(255,255,255,.85)' });
      D.text(ctx, P.cloth + (st.m ? (P.sign > 0 ? '：得到电子' : '：失去电子') : '的原子'), cx, cy + R - fs * 0.8, { size: fs, weight: 800, align: 'center', color: '#1b2333', bg: 'rgba(255,255,255,.85)' });
      D.text(ctx, '🔍 放大镜（示意）', cx, cy - R - 12, { size: fs, weight: 700, align: 'center', color: '#495057' });
    }
    reset();
    loop.start();
    el._st = st;
  });

  /* ================= 原子结构 ================= */
  const ATOMS = [['氢', 1, 0], ['氦', 2, 2], ['锂', 3, 4], ['碳', 6, 6], ['氧', 8, 8], ['钠', 11, 12]];
  PS.register('atom-model', function (el) {
    const st = { k: 3, e: 6, t: 0, real: false };
    const seg = PS.ui.seg(ATOMS.map((a, i) => ({ value: i, label: a[0] })), 3, (v) => { st.k = v; st.e = ATOMS[v][1]; tell(); });
    const rd = { p: PS.ui.readout('质子（带正电）', ''), n: PS.ui.readout('中子（不带电）', ''), e: PS.ui.readout('电子（带负电）', ''), c: PS.ui.readout('整个原子', '') };
    const realT = PS.ui.toggle('按真实比例看原子核', false, (v) => { st.real = v; tell(); });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, seg.el), h('div', { class: 'el-pair' }, view, h('div', null,
      h('div', { class: 'el-read', style: { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }, rd.p.el, rd.n.el, rd.e.el, rd.c.el),
      h('div', { class: 'controls', style: { marginTop: '8px' } }, PS.ui.button('失去一个电子', () => { if (st.e > 0) { st.e--; PS.sound.tick(); } tell(); }, 'btn btn-sm'), PS.ui.button('得到一个电子', () => { if (st.e < ATOMS[st.k][1] + 2) { st.e++; PS.sound.tick(); } tell(); }, 'btn btn-sm'), PS.ui.button('复原', () => { st.e = ATOMS[st.k][1]; tell(); }, 'btn btn-ghost btn-sm')),
      h('div', { style: { marginTop: '6px' } }, realT.el), msg)));
    const S = PS.stage(view, { ratio: '1 / 0.82', draw });
    function tell() {
      const A = ATOMS[st.k], d = A[1] - st.e;
      rd.p.set(A[1] + ' 个'); rd.n.set(A[2] + ' 个'); rd.e.set(st.e + ' 个');
      rd.c.set(d === 0 ? '不带电（中性）' : d > 0 ? '<span class="el-pos">带正电</span>' : '<span class="el-neg">带负电</span>');
      let s = '<b>' + A[0] + '原子</b>：原子核内有 ' + A[1] + ' 个质子' + (A[2] ? '、' + A[2] + ' 个中子' : '（没有中子）') + '，核外有 ' + st.e + ' 个电子。';
      if (d === 0) s += '原子核所带的正电荷与核外电子所带的负电荷<b>在数量上相等</b>，整个原子对外不显电性。';
      else if (d > 0) s += '它<b>失去了 ' + d + ' 个电子</b>，正电荷多于负电荷，整体带正电。';
      else s += '它<b>得到了 ' + -d + ' 个电子</b>，负电荷多于正电荷，整体带负电。';
      if (st.real) s += '<br>原子核的直径只有原子的十万分之一左右：如果原子有一个足球场那么大，原子核只有一粒米大小，原子内部几乎是“空”的。';
      msg.className = 'el-msg ' + (d ? 'ok' : 'info'); msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 500, 410), A = ATOMS[st.k];
      ctx.fillStyle = '#0d1626'; ctx.fillRect(0, 0, 500, 410);
      const cx = 250, cy = 205;
      const shells = [], cap = [2, 8, 8];
      let left = st.e;
      for (let i = 0; i < 3 && left > 0; i++) { shells.push(Math.min(cap[i], left)); left -= cap[i]; }
      const radii = [80, 128, 172];
      radii.forEach((r, i) => { if (i < Math.max(shells.length, 1)) { ctx.strokeStyle = 'rgba(116,192,252,.35)'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); } });
      const nucR = st.real ? 2.5 : 12 + Math.sqrt(A[1] + A[2]) * 6;
      if (st.real) { ctx.fillStyle = POS; ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, TAU); ctx.fill(); D.text(ctx, '← 原子核（还画大了很多）', cx + 10, cy - 10, { size: F(12), weight: 700, color: '#ffc9c9' }); }
      else {
        const N = A[1] + A[2];
        for (let i = 0; i < N; i++) {
          const a = i * 2.39996, r = nucR * 0.72 * Math.sqrt((i + 0.5) / N);
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, isP = i % (N / A[1] > 1.6 ? 2 : 1) === 0 && i / 2 < A[1] || (A[2] === 0);
          ctx.fillStyle = isP ? '#fa5252' : '#adb5bd'; ctx.beginPath(); ctx.arc(x, y, 7.5, 0, TAU); ctx.fill();
          if (isP) D.text(ctx, '+', x, y + 1, { size: 10, weight: 900, align: 'center', baseline: 'middle', color: '#fff' });
        }
        D.text(ctx, '原子核', cx, cy + nucR + F(12) + 2, { size: F(12), weight: 700, align: 'center', color: '#ffc9c9' });
      }
      shells.forEach((n, i) => {
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU + st.t * (1.4 - i * 0.35);
          chg(ctx, cx + Math.cos(a) * radii[i], cy + Math.sin(a) * radii[i], -1, 9);
        }
      });
      D.text(ctx, A[0] + '原子（示意图）', 14, F(14) + 8, { size: F(14), weight: 800, color: '#e7f5ff' });
      D.text(ctx, '电子 e：1.6×10⁻¹⁹ C', 486, 400, { size: F(12), weight: 700, align: 'right', color: '#a5d8ff' });
    }
    tell();
    loop.start();
  });

  /* ================= 带电情况的推理（通草球） ================= */
  const NM = ['甲', '乙', '丙'];
  const SIGN_T = { 1: '带正电', '-1': '带负电', 0: '不带电' };
  const inter = (a, b) => (a === 0 && b === 0 ? 0 : a * b > 0 ? 1 : -1); // 1 排斥，−1 吸引，0 无作用
  PS.register('charge-judge', function (el) {
    const view = h('div');
    const qBox = h('div', { class: 'el-q' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(view, qBox, h('div', { class: 'controls', style: { marginTop: '6px' } }, PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb, score);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 540 : 330), draw });
    let Q = null, n = 0, ok = 0;
    const OPTS = [['带正电', [1]], ['带负电', [-1]], ['不带电', [0]], ['带正电或不带电', [1, 0]], ['带负电或不带电', [-1, 0]]];
    function next() {
      for (let tries = 0; tries < 200; tries++) {
        const known = PS.randInt(0, 2), ks = PS.pick([1, -1]);
        const pairs = PS.pick([[[0, 1], [0, 2]], [[0, 1], [1, 2]], [[0, 2], [1, 2]]]).map((p) => p.slice());
        const truth = [0, 0, 0].map(() => PS.pick([1, -1, 0])); truth[known] = ks;
        const obs = pairs.map(([a, b]) => inter(truth[a], truth[b]));
        if (obs.some((o) => o === 0)) continue;
        const unk = [0, 1, 2].filter((i) => i !== known), poss = { [unk[0]]: new Set(), [unk[1]]: new Set() };
        [1, -1, 0].forEach((u) => [1, -1, 0].forEach((v) => {
          const s = [0, 0, 0]; s[known] = ks; s[unk[0]] = u; s[unk[1]] = v;
          if (pairs.every(([a, b], j) => inter(s[a], s[b]) === obs[j])) { poss[unk[0]].add(u); poss[unk[1]].add(v); }
        }));
        const ans = unk.map((i) => OPTS.findIndex((o) => o[1].length === poss[i].size && o[1].every((x) => poss[i].has(x))));
        if (ans.some((a) => a < 0)) continue;
        Q = { known, ks, pairs, obs, unk, ans, pick: [null, null] };
        break;
      }
      qBox.innerHTML = '';
      const txt = '已知<b>' + NM[Q.known] + '带' + (Q.ks > 0 ? '正' : '负') + '电</b>，' + Q.pairs.map(([a, b], j) => NM[a] + '、' + NM[b] + '相互' + (Q.obs[j] > 0 ? '<b>排斥</b>' : '<b>吸引</b>')).join('，') + '。' + NM[Q.unk[0]] + '和' + NM[Q.unk[1]] + '的带电情况怎样？';
      qBox.append(h('div', { html: txt }));
      Q.unk.forEach((u, j) => {
        const row = h('div', { class: 'el-chips' }, h('b', { style: { alignSelf: 'center', marginRight: '4px' } }, NM[u] + '：'));
        OPTS.forEach((o, k) => { const b = PS.ui.button(o[0], () => { Q.pick[j] = k; row.querySelectorAll('.btn').forEach((x, m) => x.classList.toggle('on', m === k)); if (Q.pick.every((p) => p != null)) check(); }, 'btn btn-sm'); row.append(b); });
        qBox.append(row);
      });
      fb.className = 'el-msg info'; fb.innerHTML = '相互排斥 → 一定带同种电荷；相互吸引 → 可能带异种电荷，<b>也可能一个带电、另一个不带电</b>（带电体能吸引轻小物体）。';
      S.render();
    }
    function check() {
      if (Q.done) return;
      Q.done = true;
      const good = Q.pick.every((p, j) => p === Q.ans[j]);
      n++; if (good) ok++;
      const why = Q.pairs.map(([a, b], j) => NM[a] + '、' + NM[b] + (Q.obs[j] > 0 ? '排斥：带同种电荷' : '吸引：带异种电荷，或其中一个不带电')).join('；');
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 正确答案：' + Q.unk.map((u, j) => NM[u] + OPTS[Q.ans[j]][0]).join('，') + '。') + '<br>' + why + '。';
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    function pair(ctx, x, F, a, b, o) {
      const top = 40, L = 190, gap = 120;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x - 150, top); ctx.lineTo(x + 150, top); ctx.stroke();
      const ang = o > 0 ? 0.22 : -0.12;
      [[a, -1], [b, 1]].forEach(([nm, sd]) => {
        const px = x + sd * gap / 2, bx = px + sd * Math.sin(ang) * L, by = top + Math.cos(ang) * L;
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(bx, by); ctx.stroke();
        const g = ctx.createRadialGradient(bx - 7, by - 7, 3, bx, by, 22); g.addColorStop(0, '#fff'); g.addColorStop(1, '#ced4da');
        ctx.fillStyle = g; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 22, 0, TAU); ctx.fill(); ctx.stroke();
        D.text(ctx, NM[nm], bx, by + 1, { size: F(17), weight: 800, align: 'center', baseline: 'middle', color: '#1b2333' });
      });
      D.text(ctx, o > 0 ? '相互排斥' : '相互吸引', x, 300, { size: F(16), weight: 800, align: 'center', color: o > 0 ? '#e8590c' : '#3b5bdb' });
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), k = VH > 400 ? 1.6 : 1;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      if (!Q) return;
      Q.pairs.forEach(([a, b], j) => { const x = 250 + j * 500; ctx.save(); ctx.translate(x, 0); ctx.scale(k, k); ctx.translate(-x, 0); pair(ctx, x, (p) => F(p) / k, a, b, Q.obs[j]); ctx.restore(); });
    }
    next();
  });

  /* ================= 验电器 ================= */
  /** 验电器：(x, y) 为金属球中心，s 比例，q 电荷（正负整数），o.ball 金属球上的电荷比例 */
  function scope(ctx, x, y, s, q, F, name) {
    const th = q ? (5 + 36 * (1 - Math.exp(-Math.abs(q) / 4))) * (Math.PI / 180) : 0.015;
    const bodyTop = y + 40 * s, bodyH = 210 * s, bw = 170 * s;
    ctx.save();
    ctx.fillStyle = 'rgba(231,245,255,.55)'; ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 2.5;
    D.roundRect(ctx, x - bw / 2, bodyTop, bw, bodyH, 18 * s); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#495057'; ctx.fillRect(x - bw / 2 - 8 * s, bodyTop + bodyH - 4, bw + 16 * s, 14 * s);
    ctx.fillStyle = '#8c6d46'; D.roundRect(ctx, x - 22 * s, bodyTop - 10 * s, 44 * s, 26 * s, 5); ctx.fill();
    ctx.fillStyle = '#adb5bd'; ctx.fillRect(x - 3.5 * s, y, 7 * s, 140 * s + 40 * s);
    const g = ctx.createRadialGradient(x - 9 * s, y - 9 * s, 3, x, y, 26 * s); g.addColorStop(0, '#fff'); g.addColorStop(1, '#868e96');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 26 * s, 0, TAU); ctx.fill();
    const ly = y + 180 * s, L = 90 * s;
    [-1, 1].forEach((sd) => {
      ctx.save(); ctx.translate(x, ly); ctx.rotate(-sd * th);
      ctx.fillStyle = '#fcc419'; ctx.strokeStyle = '#e67700'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-sd * 1, 0); ctx.lineTo(sd * 9 * s, 0); ctx.lineTo(sd * 7 * s, L); ctx.lineTo(-sd * 1, L); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    const n = Math.min(12, Math.abs(q)), sg = Math.sign(q);
    if (n) {
      const nb = Math.ceil(n * 0.34);
      for (let i = 0; i < nb; i++) { const a = -Math.PI / 2 + (i - (nb - 1) / 2) * 0.75; chg(ctx, x + Math.cos(a) * 17 * s, y + Math.sin(a) * 17 * s + 4 * s, sg, 8 * s); }
      const nl = n - nb;
      for (let i = 0; i < nl; i++) {
        const sd = i % 2 ? 1 : -1, k = Math.floor(i / 2), d = 26 * s + k * 20 * s;
        chg(ctx, x + sd * (Math.sin(th) * d + 13 * s), ly + Math.cos(th) * d, sg, 7.5 * s);
      }
    }
    D.text(ctx, name, x, bodyTop + bodyH + 34 * s, { size: F(16), weight: 800, align: 'center', color: '#1b2333' });
    ctx.restore();
    return { leaf: ly, top: y - 26 * s };
  }
  PS.el.scope = scope;

  PS.register('two-electroscopes', function (el) {
    const st = { qa: 0, qb: 0, rod: -1, touch: null, bar: null, flow: [], t: 0, hand: null };
    const rodSeg = PS.ui.seg([{ value: -1, label: '橡胶棒（毛皮摩擦过，带负电）' }, { value: 1, label: '玻璃棒（丝绸摩擦过，带正电）' }], -1, (v) => { st.rod = v; });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, rodSeg.el), view,
      h('div', { class: 'controls', style: { marginTop: '6px' } },
        PS.ui.button('① 用棒接触验电器 A 的金属球', touchA, 'btn btn-primary btn-sm'),
        PS.ui.button('② 用橡胶棒连接 A 和 B', () => connect(false), 'btn btn-sm'),
        PS.ui.button('③ 用带绝缘柄的金属棒连接 A 和 B', () => connect(true), 'btn btn-sm'),
        PS.ui.button('✋ 用手摸一下 A 的金属球', handA, 'btn btn-sm'),
        PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 620 : 520), draw });
    function say(s, c) { msg.className = 'el-msg ' + (c || 'info'); msg.innerHTML = s; }
    function reset() { st.qa = 0; st.qb = 0; st.bar = null; st.flow = []; st.touch = null; st.hand = null; say('验电器由<b>金属球、金属杆、金属箔</b>和绝缘的瓶塞、外壳组成。先选一根带电的棒，点 ① 让它接触验电器 A 的金属球。'); }
    function touchA() {
      if (st.touch) return;
      st.bar = null; st.touch = { f: 0, done: false };
    }
    function connect(metal) {
      if (!st.qa && !st.qb) { say('A、B 都不带电，先点 ① 让 A 带电。'); return; }
      st.bar = { metal, f: 0 };
      if (!metal) say('<b>橡胶棒是绝缘体</b>，电荷不能通过它移动：A 的金属箔张角不变，B 的金属箔仍然闭合。', 'info');
    }
    function handA() { if (!st.qa) { say('A 本来就不带电。'); return; } st.hand = { f: 0 }; st.bar = null; }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.touch) {
        const T = st.touch; T.f += dt * 1.2;
        if (T.f > 0.5 && !T.done) {
          T.done = true;
          if (st.qa && Math.sign(st.qa) !== st.rod) { st.qa += st.rod * 3; say('棒上的电荷与 A 原来的电荷<b>种类相反</b>，接触后发生中和，A 的金属箔张角先变小' + (st.qa === 0 ? '，现在正好闭合了' : '') + '。'); }
          else { st.qa += st.rod * 3; say('棒上的一部分电荷转移到验电器 A 上，两片金属箔带上<b>同种电荷而相互排斥</b>，于是张开。' + (Math.abs(st.qa) > 3 ? '再接触一次，A 带的电荷更多，金属箔<b>张开的角度更大</b>。' : '多接触几次（或多摩擦几下再接触），看张角怎样变化。'), 'ok'); }
          PS.sound.tick();
        }
        if (T.f >= 1) st.touch = null;
      }
      if (st.bar) {
        st.bar.f = Math.min(1, st.bar.f + dt * 1.5);
        if (st.bar.metal && st.bar.f >= 1 && st.qa !== st.qb && st.t % 0.32 < dt) {
          const d = st.qa - st.qb, unit = Math.sign(d);
          if (Math.abs(d) >= 2) {
            st.qa -= unit; st.qb += unit;
            st.flow.push({ f: 0, dir: d < 0 ? -1 : 1 });
            PS.sound.tick();
            if (Math.abs(st.qa - st.qb) < 2) {
              const eAB = d < 0;
              say('金属棒是<b>导体</b>，' + (eAB ? '<b>电子从 A 移动到 B</b>' : '<b>电子从 B 移动到 A</b>') + '，A 的金属箔张角变小，B 的金属箔张开。电荷的定向移动形成<b>电流</b>，电流的方向与电子定向移动的方向相反：电流方向是 <b>' + (eAB ? 'B → A' : 'A → B') + '</b>。', 'ok');
            }
          }
        }
      }
      if (st.hand) {
        st.hand.f += dt;
        if (st.hand.f > 0.4 && st.qa && st.t % 0.12 < dt) { st.flow.push({ f: 0, dir: st.qa < 0 ? 2 : -2 }); st.qa -= Math.sign(st.qa); }
        if (!st.qa && st.hand.f > 1) { st.hand = null; say('人体是<b>导体</b>，用手摸金属球，A 上的电荷经人体导入大地，金属箔闭合。'); }
      }
      st.flow.forEach((f) => { f.f += dt * 2.2; });
      st.flow = st.flow.filter((f) => f.f < 1);
      S.render();
    }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 560;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      const s = nar ? 1.25 : 1, by = nar ? 160 : 130, xa = nar ? 250 : 300, xb = nar ? 750 : 700;
      scope(ctx, xa, by, s, st.qa, F, '验电器 A');
      scope(ctx, xb, by, s, st.qb, F, '验电器 B');
      if (st.bar) {
        const e = st.bar.f, y = by - 26 * s - 6, x2 = xa + (xb - xa) * e;
        ctx.save();
        if (st.bar.metal) {
          ctx.fillStyle = '#adb5bd'; ctx.fillRect(xa, y - 6, x2 - xa, 12);
          ctx.fillStyle = '#e8590c'; ctx.fillRect((xa + xb) / 2 - 16, y - 90, 32, 84);
          D.text(ctx, '绝缘柄', (xa + xb) / 2 + 24, y - 60, { size: F(13), weight: 700, color: '#495057' });
        } else { ctx.fillStyle = '#343a40'; D.roundRect(ctx, xa, y - 9, x2 - xa, 18, 9); ctx.fill(); }
        ctx.restore();
        st.flow.forEach((f) => {
          if (Math.abs(f.dir) !== 1) return;
          const x = f.dir > 0 ? xb + (xa - xb) * f.f : xa + (xb - xa) * f.f;
          chg(ctx, x, y, -1, 9);
        });
        if (st.bar.metal && st.bar.f >= 1 && (st.qa !== 0 || st.qb !== 0)) {
          const eAB = st.qa + st.qb < 0;
          const yy = y + 34;
          D.arrow(ctx, eAB ? xa + 90 : xb - 90, yy, eAB ? xb - 90 : xa + 90, yy, { color: NEG, width: 3, head: 12 });
          D.text(ctx, '电子移动方向', (xa + xb) / 2, yy - 10, { size: F(13), weight: 800, align: 'center', color: NEG });
          D.arrow(ctx, eAB ? xb - 90 : xa + 90, yy + 40, eAB ? xa + 90 : xb - 90, yy + 40, { color: PS.ELC.I, width: 3, head: 12 });
          D.text(ctx, '电流方向', (xa + xb) / 2, yy + 64, { size: F(13), weight: 800, align: 'center', color: PS.ELC.I });
        }
      }
      if (st.touch) {
        const e = st.touch.f < 0.5 ? st.touch.f * 2 : 2 - st.touch.f * 2, rx = xa + 30, ry = by - 26 * s - 130 + e * 104;
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(-0.5);
        ctx.fillStyle = st.rod < 0 ? '#3b3f45' : 'rgba(165,216,255,.95)'; D.roundRect(ctx, -10, -140, 20, 150, 10); ctx.fill();
        for (let i = 0; i < 4; i++) chg(ctx, 0, -10 - i * 24, st.rod, 8);
        ctx.restore();
      }
      if (st.hand) { const e = Math.min(1, st.hand.f * 3); D.text(ctx, '✋', xa - 70 + e * 40, by - 30, { size: 46, align: 'center', baseline: 'middle' }); }
      st.flow.forEach((f) => { if (Math.abs(f.dir) === 2) { const k = f.dir > 0 ? f.f : 1 - f.f; chg(ctx, xa - k * 60, by - k * 10, -1, 8); } });
      D.text(ctx, '两片金属箔带同种电荷，相互排斥而张开；张角越大，带的电荷越多', 500, VH - 14, { size: F(13), weight: 700, align: 'center', color: '#495057' });
    }
    reset();
    loop.start();
    el._st = st;
  });

  /* ================= 导体还是绝缘体 ================= */
  const MATS = [
    { k: 'key', n: '铜钥匙', ico: '🔑', R: 0.02, m: 'metal', c: '#e0a85c', cat: 1 },
    { k: 'nail', n: '铁钉', ico: '🔩', R: 0.03, m: 'metal', c: '#adb5bd', cat: 1 },
    { k: 'lead', n: '铅笔芯', ico: '✏️', R: 6, m: 'metal', c: '#495057', cat: 1, note: '铅笔芯是石墨做的，石墨是导体（电阻比金属大一些，灯泡较暗）' },
    { k: 'salt', n: '食盐水', ico: '💧', R: 18, m: 'ion', c: '#a5d8ff', cat: 1, note: '酸、碱、盐的水溶液能导电，靠的是溶液中的正、负离子' },
    { k: 'body', n: '人体', ico: '✋', R: 2500, m: 'ion', c: '#ffd8a8', cat: 1, note: '人体是导体，只是电阻比较大：灯泡不亮，但灵敏电流计的指针偏转了' },
    { k: 'ruler', n: '塑料尺', ico: '📏', R: 1e12, m: 'ins', c: '#ffe066', cat: 0 },
    { k: 'eraser', n: '橡皮', ico: '⬜', R: 1e12, m: 'ins', c: '#f8f9fa', cat: 0 },
    { k: 'glass', n: '玻璃棒', ico: '🥛', R: 1e12, m: 'ins', c: '#d0ebff', cat: 0, hot: true },
    { k: 'china', n: '陶瓷片', ico: '🍵', R: 1e12, m: 'ins', c: '#f1f3f5', cat: 0 },
    { k: 'wood', n: '干木条', ico: '🌲', R: 1e11, m: 'ins', c: '#c69c6d', cat: 0 },
    { k: 'oil', n: '食用油', ico: '🍶', R: 1e12, m: 'ins', c: '#ffe066', cat: 0 },
  ];
  PS.register('conductor-test', function (el) {
    const st = { m: null, hot: 0, heat: false, t: 0, done: {}, dots: [] };
    const chips = h('div', { class: 'el-chips' }, MATS.map((m) => PS.ui.button(m.ico + ' ' + m.n, () => pick(m), 'btn btn-sm')));
    const heatBtn = PS.ui.button('🔥 用酒精灯把玻璃加热到红炽状态', () => { st.heat = !st.heat; heatBtn.innerHTML = st.heat ? '停止加热' : '🔥 用酒精灯把玻璃加热到红炽状态'; }, 'btn btn-sm');
    heatBtn.style.display = 'none';
    const msg = h('div', { class: 'el-msg info' });
    const tbl = h('div', { class: 'small', style: { marginTop: '6px' } });
    const view = h('div');
    el.append(h('div', { class: 'small muted' }, '把下面的物体夹在两个鳄鱼夹之间：'), chips, view, h('div', { class: 'controls', style: { marginTop: '6px' } }, heatBtn), msg, tbl);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 1250 : 500), draw });
    for (let i = 0; i < 26; i++) st.dots.push({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, ph: Math.random() * TAU });
    function R() { if (!st.m) return 1e15; if (st.m.hot && st.hot > 0.6) return 40 + (1 - st.hot) * 800; return st.m.R; }
    function I() { const s = EL.solve({ els: [{ id: 'B', t: 'bat', a: 'p', b: 'n', E: 3, r: 1 }, { id: 'L', t: 'bulb', a: 'p', b: 'x', R: 10 }, { id: 'X', t: 'res', a: 'x', b: 'n', R: R() }] }); return s.I.L; }
    function pick(m) {
      st.m = m; st.hot = 0; st.heat = false; heatBtn.innerHTML = '🔥 用酒精灯把玻璃加热到红炽状态';
      heatBtn.style.display = m.hot ? '' : 'none';
      chips.querySelectorAll('.btn').forEach((b, i) => b.classList.toggle('on', MATS[i] === m));
      st.done[m.k] = m.cat;
      PS.sound.tick();
      tell(true);
    }
    let last = '';
    function tell(force) {
      const m = st.m;
      const hotOn = m && m.hot && st.hot > 0.6;
      const key = (m ? m.k : '') + hotOn;
      if (key === last && !force) return;
      last = key;
      if (!m) { msg.className = 'el-msg info'; msg.innerHTML = '点上面的物体，把它接入电路。灯泡亮了，说明这个物体<b>容易导电</b>。右边的放大镜可以看到物体内部的电荷。'; }
      else if (hotOn) { msg.className = 'el-msg ok'; msg.innerHTML = '常温下的玻璃是绝缘体，加热到<b>红炽状态</b>时，玻璃变成了导体，灯泡发光！<b>导体和绝缘体之间没有绝对的界限</b>，在一定条件下可以相互转化。'; }
      else if (m.cat) { msg.className = 'el-msg ok'; msg.innerHTML = '<b>' + m.n + '是导体</b>（容易导电）。' + (m.note ? m.note + '。' : '金属中有大量可以自由移动的电子（<b>自由电子</b>），接入电路后自由电子定向移动形成电流。'); }
      else { msg.className = 'el-msg bad'; msg.innerHTML = '<b>' + m.n + '是绝缘体</b>（不容易导电），灯泡不亮。绝缘体中的电荷几乎都被束缚在原子、分子的范围内，<b>不能自由移动</b>——绝缘体不是没有电荷，而是缺少自由电荷。' + (m.hot ? '试试把它加热到红炽状态。' : ''); }
      const keys = Object.keys(st.done);
      tbl.innerHTML = keys.length ? '<b>导体：</b>' + (MATS.filter((x) => st.done[x.k] === 1).map((x) => x.n).join('、') || '—') + '　<b>绝缘体：</b>' + (MATS.filter((x) => st.done[x.k] === 0).map((x) => x.n).join('、') || '—') : '';
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.m && st.m.hot) st.hot = PS.clamp(st.hot + (st.heat ? dt / 4 : -dt / 6), 0, 1);
      tell();
      S.render();
    }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      const k = nar ? 1.55 : 1;
      ctx.save(); if (nar) ctx.scale(k, k);
      const i = I(), lit = (i * i * 10) / 0.75;
      const W = nar ? 1000 / k : 600;
      ctx.fillStyle = '#e9dcc6'; ctx.fillRect(0, 380, W, 140);
      const bt = EL.real.battery(ctx, 150, 420, 190, { n: 2 });
      const bl = EL.real.bulb(ctx, 230, 210, 120, lit, {});
      const cA = [380, 330], cB = [530, 330];
      const wires = [EL.real.wire(ctx, bt.pos, cB, { color: '#e03131', sag: 30, c1: [bt.pos[0] + 120, bt.pos[1] + 30], c2: [cB[0] + 40, cB[1] + 80] }), EL.real.wire(ctx, bt.neg, bl.t1, { color: '#212529', sag: 0, c1: [bt.neg[0] - 60, bt.neg[1] - 60], c2: [bl.t1[0] - 90, bl.t1[1] + 20] }), EL.real.wire(ctx, bl.t2, cA, { color: '#f59f00', sag: 20 })];
      EL.real.clip(ctx, cA[0] + 8, cA[1], 0, 14, '#f59f00'); EL.real.clip(ctx, cB[0] - 8, cB[1], Math.PI, 14, '#e03131');
      if (Math.abs(i) > 1e-3) {
        const ph = st.t * EL.speed(i);
        [wires[0], wires[2]].forEach((p) => EL.dots(ctx, p.slice().reverse(), ph, { gap: 28, r: 4 }));
        EL.dots(ctx, wires[1], ph, { gap: 28, r: 4 });
      }
      const m = st.m;
      if (m) {
        const hc = m.hot && st.hot > 0.05 ? PS.mixColor(m.c, '#ff6b00', st.hot) : m.c;
        ctx.fillStyle = hc; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
        if (m.k === 'salt' || m.k === 'oil') {
          ctx.fillStyle = 'rgba(231,245,255,.7)'; ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 2; ctx.fillRect(400, 300, 110, 90); ctx.strokeRect(400, 300, 110, 90);
          ctx.fillStyle = hc; ctx.globalAlpha = 0.7; ctx.fillRect(402, 325, 106, 63); ctx.globalAlpha = 1;
        } else if (m.k === 'body') {
          ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#e8a46a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(455, 330, 58, 20, 0, 0, TAU); ctx.fill(); ctx.stroke();
          D.text(ctx, '两只手分别捏住两个夹子', 455, 290, { size: F(12) / k, weight: 700, align: 'center', color: '#7a4a00' });
        } else { D.roundRect(ctx, 396, 320, 118, 20, 6); ctx.fill(); ctx.stroke(); }
        D.text(ctx, m.n, 455, m.k === 'salt' || m.k === 'oil' ? 412 : m.k === 'body' ? 372 : 306, { size: F(14) / k, weight: 800, align: 'center', color: '#1b2333' });
        if (m.hot && st.heat) {
          const fx = 455, fy = 365;
          ctx.fillStyle = '#ffa94d'; ctx.beginPath(); ctx.ellipse(fx, fy - 8, 9 + Math.sin(st.t * 20) * 2, 22, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#495057'; ctx.fillRect(fx - 20, fy + 12, 40, 40);
        }
      } else D.text(ctx, '（空）', 455, 336, { size: F(14) / k, weight: 700, align: 'center', color: '#868e96' });
      if (m && m.k === 'body') {
        const gx = 520, gy = 170;
        ctx.fillStyle = '#343a40'; D.roundRect(ctx, gx - 60, gy - 46, 120, 82, 10); ctx.fill();
        ctx.fillStyle = '#fff'; D.roundRect(ctx, gx - 52, gy - 40, 104, 62, 6); ctx.fill();
        ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(gx, gy + 14, 40, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
        const a = -Math.PI / 2 + 0.45 + Math.sin(st.t * 3) * 0.02;
        ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, gy + 14); ctx.lineTo(gx + Math.cos(a) * 44, gy + 14 + Math.sin(a) * 44); ctx.stroke();
        D.text(ctx, 'G', gx, gy + 4, { size: 16, weight: 900, align: 'center', color: '#1b2333' });
        D.text(ctx, '灵敏电流计', gx, gy - 58, { size: F(12) / k, weight: 700, align: 'center', color: '#495057' });
      }
      ctx.restore();
      // ---- 放大镜 ----
      const cx = nar ? 500 : 800, cy = nar ? 1035 : 240, Rr = nar ? 195 : 170;
      ctx.save();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, Rr - 3, 0, TAU); ctx.clip();
      const mode = !m ? 'none' : m.hot && st.hot > 0.6 ? 'ion' : m.m;
      const drift = Math.abs(i) > 1e-3 ? PS.clamp(i * 3, 0.15, 1) : 0;
      if (mode === 'metal') {
        for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const x = cx + a * 54, y = cy + b * 54 + (a % 2 ? 27 : 0); ctx.fillStyle = POS; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill(); D.text(ctx, '+', x, y + 1, { size: 15, weight: 900, align: 'center', baseline: 'middle', color: '#fff' }); }
        st.dots.forEach((d, j) => {
          const x = cx - Rr + ((d.x * 2 * Rr + st.t * 90 * drift + Math.sin(st.t * 3 + d.ph) * 14) % (2 * Rr)), y = cy - Rr + d.y * 2 * Rr + Math.cos(st.t * 2.6 + d.ph) * 12;
          chg(ctx, x, y, -1, 8);
        });
        D.text(ctx, drift ? '自由电子定向移动 →' : '自由电子', cx, cy + Rr * 0.68, { size: F(13), weight: 800, align: 'center', color: NEG, bg: 'rgba(255,255,255,.88)' });
      } else if (mode === 'ion') {
        st.dots.forEach((d, j) => {
          const sg = j % 2 ? 1 : -1, x = cx - Rr + (((d.x * 2 * Rr - sg * st.t * 60 * drift + Math.sin(st.t * 2 + d.ph) * 16) % (2 * Rr)) + 2 * Rr) % (2 * Rr), y = cy - Rr + d.y * 2 * Rr + Math.cos(st.t * 2 + d.ph) * 14;
          chg(ctx, x, y, sg, 10);
        });
        D.text(ctx, drift ? '正、负离子定向移动' : '正、负离子', cx, cy + Rr * 0.68, { size: F(13), weight: 800, align: 'center', color: '#495057', bg: 'rgba(255,255,255,.88)' });
      } else if (mode === 'ins') {
        for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
          const x = cx + a * 66, y = cy + b * 66;
          ctx.strokeStyle = 'rgba(28,126,214,.3)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.stroke();
          ctx.fillStyle = POS; ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
          const an = st.t * 2.4 + a + b * 1.7; chg(ctx, x + Math.cos(an) * 22, y + Math.sin(an) * 22, -1, 6.5);
        }
        D.text(ctx, '电子被束缚在原子周围', cx, cy + Rr * 0.68, { size: F(13), weight: 800, align: 'center', color: '#495057', bg: 'rgba(255,255,255,.88)' });
      } else D.text(ctx, '还没有接入物体', cx, cy, { size: F(14), weight: 700, align: 'center', color: '#868e96' });
      ctx.restore();
      D.text(ctx, '🔍 物体内部（示意）', cx, cy - Rr - 12, { size: F(13), weight: 700, align: 'center', color: '#495057' });
    }
    tell(true);
    loop.start();
    el._pick = (k) => pick(MATS.find((m) => m.k === k));
  });

  /* ================= 导体还是绝缘体：分类 ================= */
  PS.register('cond-sort', function (el) {
    PS.sortCards(el, [
      ['铜导线', 0, '金属是导体'], ['人体', 0, '人体是导体，所以要注意安全用电'], ['大地', 0, '大地是导体'], ['铅笔芯（石墨）', 0, '石墨是导体'],
      ['食盐水', 0, '酸、碱、盐的水溶液是导体'], ['钢板尺', 0, '金属是导体'], ['潮湿的木头', 0, '干木头是绝缘体，潮湿后容易导电'],
      ['橡胶手套', 1, '橡胶是绝缘体'], ['玻璃杯', 1, '常温下的玻璃是绝缘体'], ['塑料袋', 1, '塑料是绝缘体'], ['陶瓷碗', 1, '陶瓷是绝缘体'],
      ['干燥的空气', 1, '通常情况下空气是绝缘体'], ['煤油', 1, '油是绝缘体'], ['干木筷', 1, '干燥的木头是绝缘体'],
    ], ['导体', '绝缘体']);
  });
})();
