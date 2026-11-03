/* 第12章第1节：杠杆——认识杠杆和五要素、画力臂、杆秤、三类杠杆（拖动支点，省力费距离）、最小动力、分类。依赖 force.js、energy.js、machine.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, MC = PS.mc, C = PS.MC, EN = PS.en;
  const TAU = Math.PI * 2;
  const rot = (p, O, a) => ({ x: O.x + (p.x - O.x) * Math.cos(a) - (p.y - O.y) * Math.sin(a), y: O.y + (p.x - O.x) * Math.sin(a) + (p.y - O.y) * Math.cos(a) });
  const P = (x, y) => ({ x, y });

  /* ================= 认识杠杆：六种工具 + 五要素 ================= */
  function wood(ctx, x, y, w, hh) {
    const g = ctx.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, '#e3bf86'); g.addColorStop(1, '#b88a4b');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, hh);
    ctx.strokeStyle = 'rgba(120,75,25,.35)'; ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x, y + (hh * i) / 3); ctx.bezierCurveTo(x + w * 0.3, y + (hh * i) / 3 + 3, x + w * 0.7, y + (hh * i) / 3 - 3, x + w, y + (hh * i) / 3); ctx.stroke(); }
  }
  function kid(ctx, x, y, c, s) {
    s = s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = '#343a40'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(22, -4); ctx.lineTo(26, 22); ctx.stroke();
    ctx.strokeStyle = c; ctx.lineWidth = 15;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -52); ctx.stroke();
    ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -70, 14, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(0, -73, 14.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.strokeStyle = '#ffc078'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(18, -22); ctx.stroke();
    ctx.restore();
  }
  const TOOLS = [
    {
      key: 'hammer', name: '🔨 羊角锤拔钉子', O: P(520, 380), F1: { p: P(795, 120), a: 0.813, rot: true }, F2: { p: P(420, 358), a: Math.PI / 2 }, max: 0.32,
      lever: [P(418, 358), P(520, 380), P(795, 120)],
      say: { O: '锤头与木板接触的点 O（拔钉子时羊角锤绕它转动）', F1: '手对锤柄的拉力 F₁', F2: '钉子对羊角的阻力 F₂（方向向下）', l1: '从 O 到 F₁ 作用线的距离', l2: '从 O 到 F₂ 作用线（竖直线）的距离' },
      fixed(ctx, st) {
        wood(ctx, 140, 380, 720, 50);
        const dy = st.claw.y - 358;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1000, 380); ctx.clip();
        ctx.fillStyle = '#868e96'; ctx.fillRect(416, 350 + dy, 8, 80); ctx.restore();
        ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#868e96'; ctx.fillRect(416, 380, 8, Math.max(0, 50 + dy)); ctx.restore();
        ctx.fillStyle = '#495057'; D.roundRect(ctx, 406, 345 + dy, 28, 7, 2); ctx.fill();
      },
      tool(ctx) {
        MC.bar(ctx, 540, 350, 795, 120, { w: 26, c1: '#e9b872', c2: '#a8742e' });
        const g = ctx.createLinearGradient(0, 330, 0, 382); g.addColorStop(0, '#adb5bd'); g.addColorStop(1, '#495057');
        ctx.fillStyle = g; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(610, 334); ctx.lineTo(610, 370); ctx.quadraticCurveTo(570, 382, 520, 380);
        ctx.quadraticCurveTo(470, 378, 440, 368); ctx.lineTo(418, 364); ctx.lineTo(410, 356);
        ctx.quadraticCurveTo(440, 338, 490, 334); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#495057'; ctx.fillRect(604, 330, 14, 44);
      },
    },
    {
      key: 'bar', name: '⛏️ 撬棒撬石头', O: P(390, 380), F1: { p: P(815, 262), a: Math.PI / 2 }, F2: { p: P(305, 404), a: Math.PI / 2 }, max: 0.1,
      lever: [P(300, 405), P(820, 260)],
      say: { O: '撬棒与小石块接触的点 O', F1: '手向下压撬棒的力 F₁', F2: '大石头对撬棒的压力 F₂（阻碍撬棒转动）', l1: '从 O 到 F₁ 作用线（竖直线）的距离', l2: '从 O 到 F₂ 作用线的距离' },
      fixed(ctx, st) {
        PS.force.ground(ctx, 60, 940, 420);
        ctx.fillStyle = '#adb5bd'; ctx.strokeStyle = '#6c757d'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(390, 402, 28, 20, 0, 0, TAU); ctx.fill(); ctx.stroke();
        const dy = st.tip.y - 404, b = Math.atan2(dy, 170);
        ctx.save(); ctx.translate(150, 420); ctx.rotate(b);
        const g = ctx.createLinearGradient(0, -130, 0, 0); g.addColorStop(0, '#ced4da'); g.addColorStop(1, '#7c8590');
        ctx.fillStyle = g; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -92); ctx.lineTo(80, -132); ctx.lineTo(150, -120); ctx.lineTo(182, -64); ctx.lineTo(172, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      },
      tool(ctx) { MC.bar(ctx, 296, 406, 822, 259, { w: 13, c1: '#adb5bd', c2: '#495057', stroke: '#343a40' }); },
    },
    {
      key: 'seesaw', name: '🎠 跷跷板', O: P(500, 340), F1: { p: P(770, 334), a: Math.PI / 2 }, F2: { p: P(230, 334), a: Math.PI / 2 }, max: 0.13, rock: true,
      lever: [P(170, 340), P(830, 340)],
      say: { O: '跷跷板转动时绕着的中间转轴 O', F1: '右边小朋友对跷跷板的压力 F₁', F2: '左边小朋友对跷跷板的压力 F₂', l1: '从 O 到 F₁ 作用线的距离', l2: '从 O 到 F₂ 作用线的距离' },
      fixed(ctx) {
        PS.force.ground(ctx, 60, 940, 430);
        ctx.fillStyle = '#ffa94d'; ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(500, 340); ctx.lineTo(545, 430); ctx.lineTo(455, 430); ctx.closePath(); ctx.fill(); ctx.stroke();
      },
      tool(ctx) {
        MC.bar(ctx, 170, 340, 830, 340, { w: 16, c1: '#74c0fc', c2: '#1971c2', stroke: '#1864ab' });
        kid(ctx, 222, 330, '#e64980', 1); ctx.save(); ctx.translate(778, 0); ctx.scale(-1, 1); kid(ctx, 0, 330, '#2f9e44', 1); ctx.restore();
      },
    },
    {
      key: 'barrow', name: '🛒 独轮车', O: P(240, 395), F1: { p: P(835, 330), a: -Math.PI / 2 }, F2: { p: P(440, 285), a: Math.PI / 2 }, max: -0.12,
      lever: [P(240, 395), P(440, 300), P(835, 330)],
      say: { O: '车轮的轴 O（抬车把时车身绕它转动）', F1: '手向上抬车把的力 F₁', F2: '车和货物受到的重力 F₂', l1: '从 O 到 F₁ 作用线的距离', l2: '从 O 到 F₂ 作用线的距离' },
      fixed(ctx) { PS.force.ground(ctx, 60, 940, 440); },
      tool(ctx) {
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(240, 395); ctx.lineTo(300, 352); ctx.lineTo(835, 330); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(560, 345); ctx.lineTo(560, 440); ctx.stroke();
        ctx.fillStyle = '#4dabf7'; ctx.strokeStyle = '#1864ab'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(270, 280); ctx.lineTo(610, 280); ctx.lineTo(580, 350); ctx.lineTo(310, 350); ctx.closePath(); ctx.fill(); ctx.stroke();
        [[350, 220], [420, 220], [490, 220], [385, 165], [455, 165]].forEach(([x, y]) => PS.force.box(ctx, x - 30, y + 58, 66, 52, { c1: '#f08c00', c2: '#d9480f' }));
        ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(240, 395, 45, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(240, 395, 18, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(240 + Math.cos(a) * 18, 395 + Math.sin(a) * 18); ctx.lineTo(240 + Math.cos(a) * 40, 395 + Math.sin(a) * 40); ctx.stroke(); }
      },
    },
    {
      key: 'fish', name: '🎣 钓鱼竿', O: P(220, 430), F1: { p: P(352, 372), a: -1.985, rot: true }, F2: { p: P(880, 140), a: Math.PI / 2 }, max: -0.2,
      lever: [P(220, 430), P(880, 140)],
      say: { O: '后面那只手握住鱼竿的地方 O（鱼竿绕它转动）', F1: '前面那只手对鱼竿的力 F₁', F2: '鱼线对鱼竿的拉力 F₂（方向向下）', l1: '从 O 到 F₁ 作用线的距离', l2: '从 O 到 F₂ 作用线（竖直线）的距离' },
      fixed(ctx, st) {
        ctx.fillStyle = '#d0ebff'; ctx.fillRect(560, 430, 400, 70);
        ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 2; for (let x = 580; x < 950; x += 60) { ctx.beginPath(); ctx.moveTo(x, 448); ctx.quadraticCurveTo(x + 15, 442, x + 30, 448); ctx.stroke(); }
        const T = st.F2p;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(T.x, T.y + 210); ctx.stroke();
        D.text(ctx, '🐟', T.x, T.y + 238, { size: 44, align: 'center', baseline: 'middle' });
      },
      tool(ctx) {
        ctx.strokeStyle = '#343a40'; ctx.lineCap = 'round';
        ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(190, 443); ctx.lineTo(352, 372); ctx.stroke();
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(352, 372); ctx.lineTo(880, 140); ctx.stroke();
        MC.hand(ctx, 220, 430, { s: 1.2 }); MC.hand(ctx, 352, 372, { s: 1.2 });
      },
    },
    {
      key: 'arm', name: '💪 人的前臂', O: P(330, 330), F1: { p: P(392, 322) }, F2: { p: P(700, 330), a: Math.PI / 2 }, max: -0.5,
      ang1: (p) => Math.atan2(118 - p.y, 312 - p.x),
      lever: [P(330, 330), P(700, 330)],
      say: { O: '肘关节 O（前臂绕它转动）', F1: '肱二头肌对前臂的拉力 F₁', F2: '手中的球对前臂的压力 F₂（方向向下）', l1: '从 O 到 F₁ 作用线的距离（很短）', l2: '从 O 到 F₂ 作用线的距离' },
      fixed(ctx, st) {
        ctx.strokeStyle = '#ffc078'; ctx.lineCap = 'round'; ctx.lineWidth = 46; ctx.beginPath(); ctx.moveTo(300, 70); ctx.lineTo(330, 330); ctx.stroke();
        ctx.strokeStyle = '#f1f3f5'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(302, 80); ctx.lineTo(330, 320); ctx.stroke();
        const I = st.F1p;
        ctx.fillStyle = 'rgba(224,49,49,.75)'; ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(312, 118); ctx.quadraticCurveTo(380, (118 + I.y) / 2, I.x, I.y); ctx.quadraticCurveTo(345, (118 + I.y) / 2, 312, 118); ctx.fill(); ctx.stroke();
        D.text(ctx, '肱二头肌', 382, 190, { size: 15, weight: 700, color: '#c92a2a' });
      },
      tool(ctx) {
        ctx.strokeStyle = '#ffc078'; ctx.lineCap = 'round'; ctx.lineWidth = 38; ctx.beginPath(); ctx.moveTo(330, 330); ctx.lineTo(690, 330); ctx.stroke();
        ctx.strokeStyle = '#f1f3f5'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(338, 330); ctx.lineTo(680, 330); ctx.stroke();
        ctx.fillStyle = '#ffc078'; ctx.beginPath(); ctx.ellipse(712, 322, 30, 22, 0, 0, TAU); ctx.fill();
        EN.ball(ctx, 712, 280, 26, '#ff8787', '#c92a2a');
      },
    },
  ];
  const ELEM = [
    { k: 'O', t: '支点 O', cls: 'o', d: '<b>支点</b>：杠杆绕着转动的点，用 O 表示。' },
    { k: 'F1', t: '动力 F₁', cls: 'f1', d: '<b>动力</b>：使杠杆转动的力，用 F₁ 表示。' },
    { k: 'F2', t: '阻力 F₂', cls: 'f2', d: '<b>阻力</b>：阻碍杠杆转动的力，用 F₂ 表示。动力和阻力使杠杆转动的方向<b>相反</b>，它们的受力物体都是杠杆。' },
    { k: 'l1', t: '动力臂 l₁', cls: 'f1', d: '<b>动力臂</b>：从支点到<b>动力作用线</b>的距离，用 l₁ 表示（不是到动力作用点的距离）。' },
    { k: 'l2', t: '阻力臂 l₂', cls: 'f2', d: '<b>阻力臂</b>：从支点到<b>阻力作用线</b>的距离，用 l₂ 表示。' },
  ];

  PS.register('lever-tools', function (el) {
    const VW = 1000, VH = 500;
    const st = { i: 0, on: { O: false, F1: false, F2: false, l1: false, l2: false }, phi: 0, t: -1, schem: false, last: null };
    const sc = h('div', { class: 'mc-chips' });
    const sb = TOOLS.map((T, i) => { const b = PS.ui.button(T.name, () => { st.i = i; st.t = -1; st.phi = 0; upd(); }, 'btn btn-sm'); sc.append(b); return b; });
    const ec = h('div', { class: 'mc-chips' });
    const eb = ELEM.map((E) => { const b = PS.ui.button(E.t, () => { st.on[E.k] = !st.on[E.k]; st.last = st.on[E.k] ? E.k : null; upd(); }, 'btn btn-sm ' + E.cls); ec.append(b); return b; });
    const all = PS.ui.button('全部显示', () => { const v = !ELEM.every((E) => st.on[E.k]); ELEM.forEach((E) => (st.on[E.k] = v)); st.last = null; upd(); }, 'btn btn-ghost btn-sm');
    ec.append(all);
    const goB = PS.ui.button('▶ 用一用', () => { st.t = 0; }, 'btn btn-primary btn-sm');
    const sch = PS.ui.toggle('只看杠杆示意图', false, (v) => { st.schem = v; S.render(); });
    el.append(sc, PS.ui.row(goB, sch.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'small muted', style: { marginTop: '6px' } }, '点下面的按钮，一个一个找出杠杆的五要素：'), ec, msg);
    const T = () => TOOLS[st.i];
    function geo() {
      const t = T(), O = t.O, a = st.phi;
      const p1 = rot(t.F1.p, O, a), p2 = rot(t.F2.p, O, a);
      const a1 = t.ang1 ? t.ang1(p1) : t.F1.a + (t.F1.rot ? a : 0), a2 = t.F2.a + (t.F2.rot ? a : 0);
      const l1 = MC.armLen(O, p1, a1), l2 = MC.armLen(O, p2, a2);
      return { O, p1, p2, a1, a2, l1, l2 };
    }
    function upd() {
      sb.forEach((b, i) => b.classList.toggle('on', i === st.i));
      eb.forEach((b, i) => b.classList.toggle('on', st.on[ELEM[i].k]));
      const t = T(), g = geo();
      let s = '<b>' + t.name.slice(2).trim() + '</b>：在力的作用下能绕着固定点转动的硬棒，就是<b>杠杆</b>。点“用一用”看看它绕哪个点转动。';
      if (st.last) { const E = ELEM.find((e) => e.k === st.last); s = E.d + '<br>在这里是：' + t.say[st.last] + '。'; }
      else if (ELEM.every((E) => st.on[E.k])) s = '五要素都找到了！这里 l₁ ' + (Math.abs(g.l1 - g.l2) < 6 ? '=' : g.l1 > g.l2 ? '>' : '<') + ' l₂' + (Math.abs(g.l1 - g.l2) < 6 ? '' : '（l₁ 约是 l₂ 的 ' + PS.fmt(g.l1 / g.l2, 1) + ' 倍）') + '。杠杆可以是直的，也可以是弯的；力臂不一定在杠杆上。';
      msg.innerHTML = s;
      S.render();
    }
    PS.loop((dt) => {
      if (st.t < 0) return;
      st.t += dt;
      const t = T(), D0 = 2.4;
      if (t.rock) st.phi = t.max * Math.sin((st.t / D0) * TAU);
      else st.phi = t.max * Math.sin(Math.min(1, st.t / D0) * Math.PI);
      if (st.t >= D0 * (t.rock ? 2 : 1)) { st.t = -1; st.phi = 0; }
      S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const t = T(), g = geo(), O = g.O;
      const tip = rot(P(305, 404), O, st.phi), claw = rot(P(418, 358), O, st.phi);
      const gs = { tip, claw, F1p: g.p1, F2p: g.p2 };
      ctx.save(); if (st.schem) ctx.globalAlpha = 0.22;
      t.fixed(ctx, gs);
      ctx.save(); ctx.translate(O.x, O.y); ctx.rotate(st.phi); ctx.translate(-O.x, -O.y); t.tool(ctx); ctx.restore();
      ctx.restore();
      if (st.schem) {
        const pts = t.lever.map((p) => rot(p, O, st.phi));
        ctx.strokeStyle = C.lever; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      const len2 = 88, len1 = PS.clamp((88 * g.l2) / Math.max(1, g.l1), 34, 175);
      if (st.on.l1) MC.arm(ctx, O, g.p1, g.a1, { color: C.F1, label: 'l₁', len: len1, F, size: F(17) });
      if (st.on.l2) MC.arm(ctx, O, g.p2, g.a2, { color: C.F2, label: 'l₂', len: len2, F, size: F(17) });
      if (st.on.F1) PS.force.arrow(ctx, g.p1.x, g.p1.y, g.a1, len1, { color: C.F1, label: 'F₁', F, size: F(18), width: 4 });
      if (st.on.F2) PS.force.arrow(ctx, g.p2.x, g.p2.y, g.a2, len2, { color: C.F2, label: 'F₂', F, size: F(18), width: 4 });
      if (st.on.O || st.schem) {
        ctx.fillStyle = 'rgba(27,35,51,.12)'; ctx.beginPath(); ctx.arc(O.x, O.y, 18, 0, TAU); ctx.fill();
        MC.pin(ctx, O.x, O.y, 7, { label: 'O', size: F(18), lx: -F(16), ly: F(16) });
      }
      D.text(ctx, t.name.slice(2).trim(), 20, F(15) + 10, { size: F(15), weight: 800, color: '#343a40' });
    }
    upd();
  });

  /* ================= 画力臂 ================= */
  const ARMS = [
    {
      name: '羊角锤拔钉子', O: P(520, 430), Pp: P(806, 150), ang: Math.PI, len: 110, lab: 'F',
      draw(ctx) {
        wood(ctx, 300, 430, 520, 30);
        ctx.fillStyle = '#868e96'; ctx.fillRect(452, 392, 7, 40);
        MC.bar(ctx, 545, 400, 810, 145, { w: 20, c1: '#e9b872', c2: '#a8742e' });
        ctx.fillStyle = '#6c757d'; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(600, 384); ctx.lineTo(600, 418); ctx.quadraticCurveTo(560, 432, 520, 430); ctx.quadraticCurveTo(480, 426, 456, 410); ctx.lineTo(448, 398); ctx.quadraticCurveTo(480, 386, 520, 384); ctx.closePath(); ctx.fill(); ctx.stroke();
      },
    },
    {
      name: '撬棒撬石头', O: P(360, 386), Pp: P(800, 254), ang: Math.PI / 2, len: 100, lab: 'F₁',
      draw(ctx) {
        PS.force.ground(ctx, 100, 900, 428);
        ctx.fillStyle = '#adb5bd'; ctx.strokeStyle = '#6c757d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(360, 408, 26, 20, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(130, 428); ctx.lineTo(150, 330); ctx.lineTo(210, 300); ctx.lineTo(268, 330); ctx.lineTo(282, 414); ctx.closePath(); ctx.fill(); ctx.stroke();
        MC.bar(ctx, 262, 415, 805, 252, { w: 12, c1: '#adb5bd', c2: '#495057', stroke: '#343a40' });
      },
    },
    {
      name: '斜拉的杠杆', O: P(220, 330), Pp: P(760, 330), ang: (-2 * Math.PI) / 3, len: 120, lab: 'F',
      draw(ctx) {
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(170, 200, 30, 260); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(200, 200); ctx.lineTo(200, 460); ctx.stroke();
        MC.bar(ctx, 220, 330, 800, 330, { w: 14 });
        MC.load(ctx, 560, 337, 60, 50, { label: 'G', fs: 15 });
      },
    },
    {
      name: '钓鱼竿', O: P(200, 470), Pp: P(850, 150), ang: Math.PI / 2, len: 110, lab: 'F₂',
      draw(ctx) {
        ctx.strokeStyle = '#343a40'; ctx.lineCap = 'round'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(185, 477); ctx.lineTo(330, 406); ctx.stroke();
        ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(330, 406); ctx.lineTo(850, 150); ctx.stroke();
        MC.hand(ctx, 200, 470, { s: 1.1 }); MC.hand(ctx, 320, 411, { s: 1.1 });
      },
    },
    {
      name: '弯折的杠杆', O: P(300, 420), Pp: P(300, 170), ang: -Math.PI / 6, len: 120, lab: 'F',
      draw(ctx) {
        ctx.strokeStyle = '#b9853f'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(300, 170); ctx.lineTo(300, 420); ctx.lineTo(720, 420); ctx.stroke();
        MC.load(ctx, 690, 427, 56, 46, { label: 'G', fs: 15 });
      },
    },
    {
      name: '拉起吊桥', O: P(200, 450), Pp: P(720, 261), ang: Math.atan2(100 - 261, 200 - 720), len: 110, lab: 'F',
      draw(ctx) {
        ctx.fillStyle = '#ced4da'; ctx.fillRect(120, 60, 60, 420); ctx.strokeStyle = '#868e96'; ctx.strokeRect(120, 60, 60, 420);
        ctx.fillStyle = '#d0ebff'; ctx.fillRect(180, 470, 700, 40);
        MC.pulley(ctx, 196, 96, 16, {});
        MC.bar(ctx, 200, 450, 760, 246, { w: 16 });
        ctx.strokeStyle = '#6b5232'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(720, 261); ctx.lineTo(205, 98); ctx.stroke();
      },
    },
  ];
  PS.register('arm-draw', function (el) {
    const VW = 1000, VH = 540;
    const st = { i: 0, t: 0, done: false, n: 0, ok: 0, order: ARMS.map((_, i) => i).sort(() => Math.random() - 0.5), k: 0 };
    const msg = h('div', { class: 'fc-msg info' });
    const score = h('span', { class: 'small muted' });
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    el.append(PS.ui.row(PS.ui.button('✔ 检查', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm'), score), msg);
    const A = () => ARMS[st.i];
    const U = () => ({ x: Math.cos(A().ang), y: Math.sin(A().ang) });
    const footT = () => { const a = A(), u = U(); return (a.O.x - a.Pp.x) * u.x + (a.O.y - a.Pp.y) * u.y; };
    const pt = (t) => { const a = A(), u = U(); return { x: a.Pp.x + u.x * t, y: a.Pp.y + u.y * t }; };
    function angle() { const a = A(), H = pt(st.t), u = U(), vx = H.x - a.O.x, vy = H.y - a.O.y, L = Math.hypot(vx, vy) || 1; return (Math.acos(Math.min(1, Math.abs(vx * u.x + vy * u.y) / L)) * 180) / Math.PI; }
    function tRange() {
      const a = A(), u = U(); let lo = -2000, hi = 2000;
      [[u.x, a.Pp.x, 12, VW - 12], [u.y, a.Pp.y, 12, VH - 12]].forEach(([d, p0, mn, mx]) => { if (Math.abs(d) < 1e-6) return; const t1 = (mn - p0) / d, t2 = (mx - p0) / d; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); });
      return [lo, hi];
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => { const H = pt(st.t); return !st.done && Math.hypot(p.x - H.x, p.y - H.y) < 34 ? 1 : null; },
      move: (_, p) => {
        const a = A(), u = U(), [lo, hi] = tRange();
        st.t = PS.clamp((p.x - a.Pp.x) * u.x + (p.y - a.Pp.y) * u.y, lo, hi);
        if (Math.abs(angle() - 90) < 2) st.t = footT();
        tell(); S.render();
      },
    });
    function next() {
      st.k = (st.k + 1) % ARMS.length; if (st.k === 0) st.order.sort(() => Math.random() - 0.5);
      st.i = st.order[st.k]; st.t = 0; st.done = false; tell(); S.render();
    }
    function tell() {
      if (st.done) return;
      const a = A();
      msg.className = 'fc-msg info';
      msg.innerHTML = '<b>' + a.name + '</b>：画出力 ' + a.lab + ' 的力臂。力的作用线已经用虚线画出（需要时可以延长）。<b>拖动蓝色圆点</b>沿着作用线移动，使支点 O 到它的连线与作用线<b>垂直</b>，再点“检查”。现在的夹角：' + PS.fmt(angle(), 0) + '°';
    }
    function check() {
      if (st.done) return;
      const a = A(), ang = angle();
      st.n++;
      if (Math.abs(ang - 90) < 2.5) {
        st.done = true; st.ok++;
        const l = MC.armLen(a.O, a.Pp, a.ang);
        msg.className = 'fc-msg ok';
        msg.innerHTML = '✔ 正确！从支点 O 向力的作用线作<b>垂线</b>，垂线段的长就是力臂 l（约 ' + PS.fmt(l / 50, 1) + ' 格）。' + (Math.abs(footT()) > a.len ? '这道题要先把力的作用线' + (footT() < 0 ? '<b>反向延长</b>' : '<b>延长</b>') + '才能作出垂线。' : '');
        PS.sound.good();
      } else if (Math.abs(st.t) < 6) {
        msg.className = 'fc-msg bad'; msg.innerHTML = '✘ 你连的是支点 O 到<b>力的作用点</b>的距离。力臂是支点到力的<b>作用线</b>的距离，要从 O 向作用线作垂线。'; PS.sound.bad();
      } else {
        msg.className = 'fc-msg bad'; msg.innerHTML = '✘ 连线与力的作用线的夹角是 ' + PS.fmt(ang, 0) + '°，还不垂直。继续拖动圆点，直到出现直角记号。'; PS.sound.bad();
      }
      score.innerHTML = '已检查 ' + st.n + ' 次，画对 ' + st.ok + ' 题';
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fbfcfe'; ctx.fillRect(0, 0, VW, VH);
      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
      for (let x = 0; x <= VW; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
      for (let y = 0; y <= VH; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
      const a = A(), u = U(), [lo, hi] = tRange();
      a.draw(ctx);
      ctx.setLineDash([9, 7]); ctx.strokeStyle = C.F1; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(a.Pp.x + u.x * lo, a.Pp.y + u.y * lo); ctx.lineTo(a.Pp.x + u.x * hi, a.Pp.y + u.y * hi); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      PS.force.arrow(ctx, a.Pp.x, a.Pp.y, a.ang, a.len, { color: C.F1, label: a.lab, F, size: F(18), width: 4 });
      MC.pin(ctx, a.O.x, a.O.y, 8, { label: 'O', size: F(18), lx: -F(16), ly: F(14) });
      const H = pt(st.t), perp = Math.abs(angle() - 90) < 0.5;
      if (st.done || perp) MC.arm(ctx, a.O, a.Pp, a.ang, { color: C.F2, label: st.done ? 'l' : '', line: false, F, size: F(18) });
      else { ctx.strokeStyle = C.F2; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(a.O.x, a.O.y); ctx.lineTo(H.x, H.y); ctx.stroke(); }
      if (!st.done) PS.handle(ctx, H.x, H.y, 13, C.F2, '拖动', F);
      D.text(ctx, a.name + (st.done ? '　✔' : ''), 16, F(15) + 8, { size: F(15), weight: 800, color: '#343a40', bg: 'rgba(255,255,255,.9)' });
      D.text(ctx, '每小格 = 1 格', VW - 16, VH - 12, { size: F(12), color: '#adb5bd', align: 'right' });
    }
    st.i = st.order[0]; tell();
  });

  /* ================= 杆秤 ================= */
  PS.register('steelyard', function (el) {
    const VW = 1000, VH = 460, OX = 270, BY = 190, K = 15, A0 = 4; // 提纽 x、秤杆 y、每厘米像素、秤钩到提纽 4 cm
    const ITEMS = [{ n: '一条鱼', e: '🐟', m: 0.8 }, { n: '一袋苹果', e: '🍎', m: 1.5 }, { n: '一只鸡', e: '🐔', m: 2.4 }, { n: '一个西瓜', e: '🍉', m: 4.2 }, { n: '神秘包裹', e: '📦', m: 0 }];
    const st = { i: 0, x: 10, th: 0, worn: false, mys: 0 };
    const M0 = () => (st.worn ? 0.45 : 0.5);
    const mass = () => (st.i === 4 ? st.mys : ITEMS[st.i].m);
    const iSeg = PS.ui.seg(ITEMS.map((it, i) => ({ value: i, label: it.e + ' ' + it.n })), st.i, (v) => { st.i = v; if (v === 4) st.mys = PS.round(PS.rand(0.5, 4.8), 1); tell(); });
    iSeg.el.style.flexWrap = 'wrap';
    const wt = PS.ui.toggle('秤砣磨损了（质量变小）', false, (v) => { st.worn = v; tell(); });
    el.append(PS.ui.row(iSeg.el), PS.ui.row(wt.el, h('span', { class: 'small muted' }, '拖动秤砣，使秤杆水平平衡')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const rd = { r: PS.ui.readout('秤砣所在刻度', '—'), t: PS.ui.readout('物体的真实质量', '?') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.r.el, rd.t.el), msg);
    const read = () => (st.x * 0.5) / A0; // 刻度按 0.5 kg 的秤砣标定
    const bal = () => Math.abs(M0() * st.x - mass() * A0) <= 0.03 * A0;
    const Rp = (d) => rot(P(OX + d * K, BY), P(OX, BY), st.th);
    PS.drag(S, {
      VW, VH,
      hit: (p) => { const q = Rp(st.x); return Math.hypot(p.x - q.x, p.y - (q.y + 70)) < 48 || Math.hypot(p.x - q.x, p.y - q.y) < 30 ? 1 : null; },
      move: (_, p) => { st.x = PS.clamp((p.x - OX) / K, 0, 41); tell(); },
      end: () => { st.x = PS.round(((Math.round(read() / 0.05) * 0.05) * A0) / 0.5, 4); tell(); PS.sound.tick(); },
    });
    function tell() {
      rd.r.set(PS.fmt(read(), 2) + ' kg');
      rd.t.set(st.i === 4 && !bal() ? '?' : PS.fmt(mass(), 1) + ' kg');
      const b = bal();
      if (b) {
        msg.className = 'fc-msg ok';
        msg.innerHTML = '✔ 秤杆水平平衡：m物g·a = m砣g·x（a = 4 cm 是秤钩到提纽的距离）。读出质量 <b>' + PS.fmt(read(), 2) + ' kg</b>' + (st.worn ? '，比真实质量 ' + PS.fmt(mass(), 1) + ' kg <b>偏大</b>：秤砣磨损后质量变小，要挂得更远才能平衡，读数偏大。' : '。');
      } else {
        msg.className = 'fc-msg info';
        msg.innerHTML = (M0() * st.x > mass() * A0 ? '秤杆右端下沉：秤砣离提纽太远了，向左移一些。' : '秤杆左端下沉：秤砣离提纽太近了，向右移一些。') + '杆秤利用的是<b>杠杆的平衡条件</b>：提纽是支点，物体对秤钩的拉力是阻力，秤砣对秤杆的拉力是动力。';
      }
    }
    PS.loop((dt) => {
      const tg = bal() ? 0 : PS.clamp((M0() * st.x - mass() * A0) * 0.02, -0.11, 0.11);
      st.th += (tg - st.th) * Math.min(1, dt * 4);
      S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fdf8ef'; ctx.fillRect(0, 0, VW, VH);
      const O = P(OX, BY);
      MC.hand(ctx, OX, 46, { s: 1.4 });
      ctx.strokeStyle = '#6b5232'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(OX, 62); ctx.lineTo(OX, BY - 6); ctx.stroke();
      D.text(ctx, '提纽（支点 O）', OX + 14, 100, { size: F(13), weight: 700, color: '#495057' });
      // 秤杆
      ctx.save(); ctx.translate(OX, BY); ctx.rotate(st.th);
      const g = ctx.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, '#d9a066'); g.addColorStop(1, '#8a5a1c');
      ctx.fillStyle = g; ctx.strokeStyle = '#5c3a0e'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-7 * K, -9); ctx.lineTo(42 * K, -5); ctx.lineTo(42 * K, 5); ctx.lineTo(-7 * K, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let m = 0; m <= 5.0001; m += 0.1) {
        const x = ((m * A0) / 0.5) * K, big = Math.abs(m - Math.round(m)) < 1e-6, half = Math.abs(m * 2 - Math.round(m * 2)) < 1e-6;
        ctx.fillStyle = big ? '#fff3bf' : '#f1e3c4';
        ctx.beginPath(); ctx.arc(x, -2, big ? 3.2 : half ? 2.3 : 1.5, 0, TAU); ctx.fill();
        if (big) D.text(ctx, String(Math.round(m)), x, -16, { size: F(14), weight: 800, align: 'center', color: '#5c3a0e' });
      }
      ctx.restore();
      D.text(ctx, '定盘星（0 kg）', OX + 8, BY + 18 + F(12), { size: F(12), color: '#868e96' });
      D.text(ctx, '单位：kg', 930, BY - 40, { size: F(12), color: '#868e96', align: 'right' });
      MC.pin(ctx, OX, BY, 6);
      // 秤钩和物体
      const hk = Rp(-A0);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(hk.x, hk.y); ctx.lineTo(hk.x, hk.y + 90); ctx.arc(hk.x - 7, hk.y + 90, 7, 0, Math.PI); ctx.stroke();
      const it = ITEMS[st.i];
      D.text(ctx, it.e, hk.x - 4, hk.y + 140, { size: 48, align: 'center', baseline: 'middle' });
      D.text(ctx, it.n, hk.x - 4, hk.y + 190, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      // 秤砣
      const q = Rp(st.x);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x, q.y + 46); ctx.stroke();
      const g2 = ctx.createLinearGradient(q.x - 24, 0, q.x + 24, 0); g2.addColorStop(0, '#343a40'); g2.addColorStop(0.45, '#868e96'); g2.addColorStop(1, '#212529');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(q.x - 10, q.y + 46); ctx.lineTo(q.x + 10, q.y + 46); ctx.lineTo(q.x + 24, q.y + 96); ctx.lineTo(q.x - 24, q.y + 96); ctx.closePath(); ctx.fill();
      D.text(ctx, '秤砣 ' + M0() + ' kg', q.x, q.y + 120, { size: F(13), weight: 700, align: 'center', color: '#343a40', bg: 'rgba(255,255,255,.85)' });
      // 示意：力臂
      D.dim(ctx, hk.x, OX, BY + 232, 'a = 4 cm', { size: F(13), color: C.F2, below: true });
      if (st.x > 1) D.dim(ctx, OX, q.x, BY + 232, 'x = ' + PS.fmt(st.x, 1) + ' cm', { size: F(13), color: C.F1 });
      if (bal()) D.text(ctx, '✔ 水平平衡', 930, 60, { size: F(16), weight: 800, color: C.ok, align: 'right' });
    }
    tell();
  });

  /* ================= 三类杠杆：拖动支点、动力、阻力的位置 ================= */
  PS.register('lever-types', function (el) {
    const VW = 1000, VH = 520, X0 = 100, X1 = 900, Y = 250, G = 60, PX = (X1 - X0) / 1.0; // 1 m = 800 px
    const st = { O: 0.18, A: 0.98, B: 0.02, phi: 0, t: -1 };
    const PRE = [
      { t: '撬棒', O: 0.18, A: 0.98, B: 0.02 }, { t: '天平', O: 0.5, A: 0.9, B: 0.1 }, { t: '独轮车', O: 0.02, A: 0.98, B: 0.35 },
      { t: '镊子', O: 0.02, A: 0.35, B: 0.98 }, { t: '钓鱼竿', O: 0.02, A: 0.2, B: 0.98 },
    ];
    const chips = h('div', { class: 'mc-chips' }, h('span', { class: 'small muted' }, '例子：'), PRE.map((p) => PS.ui.button(p.t, () => { Object.assign(st, { O: p.O, A: p.A, B: p.B, t: -1, phi: 0 }); tell(); }, 'btn btn-sm')));
    const goB = PS.ui.button('▶ 把重物提起来', () => { if (ok()) st.t = 0; }, 'btn btn-primary btn-sm');
    el.append(chips, PS.ui.row(goB, h('span', { class: 'small muted' }, '拖动支点 O、动力作用点（手）、重物，改变它们的位置')));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 640 : VH), draw });
    const rd = { l1: PS.ui.readout('动力臂 l₁', '—'), l2: PS.ui.readout('阻力臂 l₂', '—'), F1: PS.ui.readout('动力 F₁', '—', 'accent'), F2: PS.ui.readout('阻力 F₂', G + ' N', 'primary') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.l1.el, rd.l2.el, rd.F1.el, rd.F2.el), msg);
    const xo = (v) => X0 + v * PX;
    const l1 = () => Math.abs(st.A - st.O), l2 = () => Math.abs(st.B - st.O);
    const ok = () => l1() >= 0.04 && l2() >= 0.04 && Math.abs(st.A - st.B) >= 0.04;
    const sameSide = () => (st.A - st.O) * (st.B - st.O) > 0;
    // 绕 O 转动 phi 后，点 v 的位置
    const at = (v) => rot(P(xo(v), Y), P(xo(st.O), Y), st.phi);
    PS.drag(S, {
      VW, get VH() { return S.VH; },
      hit: (p) => {
        if (st.t >= 0) return null;
        const Oc = P(xo(st.O), Y), Ac = at(st.A), Bc = at(st.B);
        if (Math.hypot(p.x - Oc.x, p.y - (Y + 30)) < 34) return 'O';
        if (Math.hypot(p.x - Bc.x, p.y - (Bc.y + 70)) < 44) return 'B';
        if (Math.abs(p.x - Ac.x) < 34 && Math.abs(p.y - Ac.y) < 110) return 'A';
        return null;
      },
      move: (k, p) => { st[k] = PS.round(PS.clamp((p.x - X0) / PX, 0, 1), 2); st.phi = 0; tell(); },
    });
    function tell() {
      const L1 = l1(), L2 = l2();
      rd.l1.set(PS.fmt(L1, 2) + ' m'); rd.l2.set(PS.fmt(L2, 2) + ' m');
      if (!ok()) { rd.F1.set('—'); msg.className = 'fc-msg bad'; msg.innerHTML = '支点、动力作用点和重物要分开一些（相距至少 4 cm）。'; S.render(); return; }
      const F1 = (G * L2) / L1;
      rd.F1.set(PS.fmt(F1, 1) + ' N');
      const kind = Math.abs(L1 - L2) < 0.005 ? 2 : L1 > L2 ? 0 : 1;
      const where = sameSide() ? (L1 > L2 ? '阻力（重物）在支点和动力之间' : '动力在支点和阻力（重物）之间') : '支点在动力和阻力之间';
      const s1 = PS.fmt(L1 * 0.25 * 100, 1), s2 = PS.fmt(L2 * 0.25 * 100, 1);
      msg.className = 'fc-msg ' + (kind === 0 ? 'ok' : kind === 1 ? 'bad' : 'info');
      msg.innerHTML = [
        '<b>省力杠杆</b>：l₁ > l₂，所以 F₁ < F₂（' + where + '）。',
        '<b>费力杠杆</b>：l₁ < l₂，所以 F₁ > F₂（' + where + '）。',
        '<b>等臂杠杆</b>：l₁ = l₂，F₁ = F₂，既不省力也不费力。',
      ][kind] + (st.phi ? ' 转过同样的角度时，动力作用点移动约 ' + s1 + ' cm，重物升高约 ' + s2 + ' cm：' + (kind === 0 ? '<b>省力，但费距离</b>。' : kind === 1 ? '<b>费力，但省距离</b>。' : '移动的距离相等。') : ' 点“把重物提起来”比较移动的距离。');
      S.render();
    }
    PS.loop((dt) => {
      if (st.t < 0) return;
      st.t = Math.min(1.6, st.t + dt);
      const dir = st.B > st.O ? -1 : 1;
      st.phi = dir * 0.25 * Math.sin(Math.min(1, st.t / 1.2) * Math.PI / 2);
      if (st.t >= 1.6) { st.t = -1; tell(); }
      S.render();
    }, el).start();
    function draw(ctx, w, hh, VHc) {
      const F = PS.virtual(ctx, w, hh, VW, VHc);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VHc);
      const O = P(xo(st.O), Y), A = at(st.A), B = at(st.B);
      const E0 = at(0), E1 = at(1);
      MC.bar(ctx, E0.x, E0.y, E1.x, E1.y, { w: 16 });
      MC.fulcrum(ctx, O.x, Y + 8, 26, {});
      D.text(ctx, 'O', O.x - F(20), Y + F(24), { size: F(18), weight: 800, color: C.O, align: 'center' });
      // 重物（阻力）
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.x, B.y + 40); ctx.stroke();
      MC.load(ctx, B.x, B.y + 34, 64, 54, { label: G + ' N', fs: F(13) });
      PS.force.arrow(ctx, B.x, B.y + 8, Math.PI / 2, 70, { color: C.F2, label: 'F₂', F, size: F(17), labelSide: -1, labelOff: 42 });
      if (ok()) {
        const F1 = (G * l2()) / l1(), up = sameSide();
        const len = PS.clamp((70 * F1) / G, 26, 190);
        PS.force.arrow(ctx, A.x, A.y - (up ? 8 : -8), up ? -Math.PI / 2 : Math.PI / 2, len, { color: C.F1, label: 'F₁', F, size: F(17) });
        D.text(ctx, '✋', A.x, A.y + (up ? 46 : -42), { size: 34, align: 'center', baseline: 'middle' });
      }
      // 力臂
      if (!st.phi) {
        const yA = Y + (EN.narrow(w) ? 210 : 150), yB = yA + F(16) * 2.4;
        D.dim(ctx, O.x, A.x, yA, 'l₁ = ' + PS.fmt(l1(), 2) + ' m', { size: F(14), color: C.F1 });
        D.dim(ctx, O.x, B.x, yB, 'l₂ = ' + PS.fmt(l2(), 2) + ' m', { size: F(14), color: C.F2 });
      } else {
        const A0 = P(xo(st.A), Y), B0 = P(xo(st.B), Y);
        ctx.setLineDash([5, 5]); ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(xo(0), Y); ctx.lineTo(xo(1), Y); ctx.stroke(); ctx.setLineDash([]);
        const mark = (p0, p1, c, t, dx) => { D.arrow(ctx, p0.x + dx, p0.y, p0.x + dx, p1.y, { color: c, width: 2.5, head: 9 }); D.text(ctx, t, p0.x + dx + 10, (p0.y + p1.y) / 2, { size: F(14), weight: 800, color: c, baseline: 'middle', bg: 'rgba(255,255,255,.85)' }); };
        mark(A0, A, C.F1, 's₁', 36); mark(B0, B, C.F2, 's₂', -36 - F(14) * 2);
      }
    }
    tell();
  });

  /* ================= 分类：省力 / 费力 / 等臂 ================= */
  PS.register('lever-sort', function (el) {
    PS.sortCards(el, [
      ['用羊角锤拔钉子', 0, '动力臂（锤柄）比阻力臂长得多。'],
      ['用撬棒撬石头', 0, '支点离石头近，动力臂长。'],
      ['用瓶起子开瓶盖', 0, '支点在瓶盖顶上，手握的一端离支点远。'],
      ['用钢丝钳剪铁丝', 0, '铁丝放在靠近转轴的刀口处，手柄长。'],
      ['推独轮车', 0, '支点在车轮的轴上，阻力（货物重）在中间，动力臂长。'],
      ['用核桃夹夹核桃', 0, '核桃在支点和手之间，动力臂大于阻力臂。'],
      ['修剪树枝的长柄剪刀', 0, '手柄比刀口长得多，可以剪断较粗的树枝。'],
      ['用镊子夹砝码', 1, '手按在中间，动力臂比阻力臂短，但可以省距离、夹得准。'],
      ['用钓鱼竿钓鱼', 1, '前面的手离支点（后面的手）很近，动力臂短。'],
      ['用筷子夹菜', 1, '手指离支点近，阻力臂（到菜的距离）长。'],
      ['理发师用的剪刀', 1, '刀口长、手柄短，费力但省距离，剪得快。'],
      ['划船用的船桨', 1, '手握桨的一端为支点，另一只手离支点近。'],
      ['人用前臂托起重物', 1, '肱二头肌附着在肘关节附近，动力臂很短。'],
      ['扫地用的扫帚', 1, '上面的手为支点，下面的手离支点近。'],
      ['托盘天平', 2, '横梁两侧的力臂相等，是等臂杠杆。'],
      ['两人到支点距离相等的跷跷板', 2, '两边的力臂相等。'],
    ], ['省力杠杆', '费力杠杆', '等臂杠杆']);
  });

  /* ================= 最小动力 ================= */
  const MINS = [
    {
      name: '撬棒', s0: 0.9, a0: Math.PI / 2, O: P(330, 360), pts: [P(180, 400), P(850, 225)], F2: { p: P(190, 397), a: Math.PI / 2, v: 600 },
      draw(ctx) {
        PS.force.ground(ctx, 80, 920, 430);
        ctx.fillStyle = '#adb5bd'; ctx.strokeStyle = '#6c757d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(330, 392, 24, 34, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(90, 430); ctx.lineTo(100, 330); ctx.lineTo(160, 300); ctx.lineTo(205, 330); ctx.lineTo(205, 400); ctx.closePath(); ctx.fill(); ctx.stroke();
        MC.bar(ctx, 180, 400, 850, 225, { w: 12, c1: '#adb5bd', c2: '#495057', stroke: '#343a40' });
      },
    },
    {
      name: '弯折的杠杆', s0: 0.85, a0: 0, O: P(430, 300), pts: [P(180, 300), P(660, 300), P(660, 110)], F2: { p: P(200, 300), a: Math.PI / 2, v: 60 },
      draw(ctx) {
        ctx.strokeStyle = '#b9853f'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(180, 300); ctx.lineTo(660, 300); ctx.lineTo(660, 110); ctx.stroke();
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(415, 300, 30, 160); ctx.strokeStyle = '#868e96'; ctx.strokeRect(415, 300, 30, 160);
        MC.load(ctx, 200, 307, 56, 48, { label: '60 N', fs: 13 });
      },
    },
    {
      name: '推倒木箱', s0: 0.3, a0: 0, O: P(650, 450), pts: [P(350, 450), P(350, 250), P(650, 250), P(650, 450)], F2: { p: P(500, 350), a: Math.PI / 2, v: 400 },
      draw(ctx) {
        PS.force.ground(ctx, 120, 900, 450);
        PS.force.box(ctx, 350, 450, 300, 200, { c1: '#e9b872', c2: '#c98d3e' });
        ctx.fillStyle = PS.FC.G; ctx.beginPath(); ctx.arc(500, 350, 5, 0, TAU); ctx.fill();
      },
    },
  ];
  PS.register('min-force', function (el) {
    const VW = 1000, VH = 500, R = 120;
    const st = { i: 0, s: MINS[0].s0, a: MINS[0].a0, found: false };
    const seg = PS.ui.seg(MINS.map((m, i) => ({ value: i, label: m.name })), st.i, (v) => { st.i = v; st.s = MINS[v].s0; st.a = MINS[v].a0; st.found = false; tell(); });
    el.append(PS.ui.row(seg.el, PS.ui.button('💡 提示', hint, 'btn btn-ghost btn-sm')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const rd = { l1: PS.ui.readout('动力臂 l₁', '—'), F1: PS.ui.readout('需要的动力 F₁', '—', 'accent'), mn: PS.ui.readout('最小动力', '?', 'green') };
    const msg = h('div', { class: 'fc-msg info' });
    el.append(h('div', { class: 'mc-read' }, rd.l1.el, rd.F1.el, rd.mn.el), msg);
    const M = () => MINS[st.i];
    // 多段线上的点：s ∈ [0, 1]
    function poly() { const p = M().pts, L = []; let tot = 0; for (let i = 0; i < p.length - 1; i++) { const d = Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y); L.push(d); tot += d; } return { p, L, tot }; }
    function ptAt(s) { const { p, L, tot } = poly(); let d = s * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = Math.min(1, d / L[i]); return P(p[i].x + (p[i + 1].x - p[i].x) * k, p[i].y + (p[i + 1].y - p[i].y) * k); } d -= L[i]; } return p[0]; }
    function nearest(q) { let best = 0, bd = 1e9; for (let k = 0; k <= 400; k++) { const a = ptAt(k / 400), d = Math.hypot(a.x - q.x, a.y - q.y); if (d < bd) { bd = d; best = k / 400; } } return { s: best, d: bd }; }
    const tau2 = () => { const f = M().F2, O = M().O; return ((f.p.x - O.x) * Math.sin(f.a) - (f.p.y - O.y) * Math.cos(f.a)) * f.v; };
    function calc() {
      const O = M().O, A = ptAt(st.s), u = { x: Math.cos(st.a), y: Math.sin(st.a) };
      const c = (A.x - O.x) * u.y - (A.y - O.y) * u.x; // 单位力的力矩（画布坐标顺时针为正）
      const t2 = tau2(), good = c * t2 < 0 && Math.abs(c) > 4;
      const F1 = good ? Math.abs(t2) / Math.abs(c) : Infinity;
      const far = Math.max(...poly().p.concat([A]).map((q) => Math.hypot(q.x - O.x, q.y - O.y)));
      return { A, c, good, F1, Fmin: Math.abs(t2) / far, l1: Math.abs(c), far };
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => { const A = ptAt(st.s), H = P(A.x + Math.cos(st.a) * R, A.y + Math.sin(st.a) * R); if (Math.hypot(p.x - H.x, p.y - H.y) < 30) return 'dir'; if (Math.hypot(p.x - A.x, p.y - A.y) < 30 || nearest(p).d < 22) return 'pt'; return null; },
      move: (k, p) => {
        if (k === 'pt') st.s = nearest(p).s;
        else { const A = ptAt(st.s); st.a = Math.atan2(p.y - A.y, p.x - A.x); }
        const c = calc();
        if (c.good && c.F1 <= c.Fmin * 1.02) { if (!st.found) PS.sound.good(); st.found = true; }
        tell();
      },
    });
    function hint() {
      msg.className = 'fc-msg info';
      msg.innerHTML = '💡 由 F₁l₁ = F₂l₂ 可知：阻力和阻力臂一定时，<b>动力臂越长，动力越小</b>。在杠杆上找一个<b>离支点 O 最远</b>的点作为动力作用点，连接 O 和这一点，动力的方向与这条连线<b>垂直</b>时，动力臂最长。';
    }
    function tell() {
      const c = calc(), m = M();
      rd.l1.set(c.good ? PS.fmt(c.l1 * 0.2, 0) + ' cm' : '—');
      rd.F1.set(c.good ? PS.fmt(c.F1, 0) + ' N' : '—');
      rd.mn.set(st.found ? PS.fmt(c.Fmin, 0) + ' N' : '?');
      if (!c.good) { msg.className = 'fc-msg bad'; msg.innerHTML = '这个方向的力不能使杠杆平衡：它使杠杆转动的方向与阻力相同（或力的作用线通过支点）。改变力的方向。'; }
      else if (c.F1 <= c.Fmin * 1.02) { msg.className = 'fc-msg ok'; msg.innerHTML = '✔ 找到最小的动力了！动力作用点<b>离支点最远</b>，动力的方向与支点到作用点的连线<b>垂直</b>，这时动力臂就是这条连线，最长。'; }
      else { msg.className = 'fc-msg info'; msg.innerHTML = '<b>' + m.name + '</b>：阻力 F₂ = ' + m.F2.v + ' N。拖动橙色圆点改变动力的<b>作用点</b>，拖动箭头前面的小圆改变动力的<b>方向</b>，找出最小的动力 F₁。'; }
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fbfcfe'; ctx.fillRect(0, 0, VW, VH);
      const m = M(), O = m.O, c = calc();
      m.draw(ctx);
      MC.pin(ctx, O.x, O.y, 8, { label: 'O', size: F(18), lx: F(16), ly: F(14) });
      PS.force.arrow(ctx, m.F2.p.x, m.F2.p.y, m.F2.a, 70, { color: C.F2, label: 'F₂', F, size: F(16), labelSide: -1 });
      if (st.found) { ctx.setLineDash([6, 5]); ctx.strokeStyle = C.ok; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(c.A.x, c.A.y); ctx.stroke(); ctx.setLineDash([]); }
      if (c.good) {
        const len = PS.clamp((90 * c.F1) / c.Fmin, 40, 260);
        MC.arm(ctx, O, c.A, st.a, { color: C.F1, label: 'l₁', len, F, size: F(16) });
        PS.force.arrow(ctx, c.A.x, c.A.y, st.a, len, { color: C.F1, label: 'F₁', F, size: F(17), width: 4 });
      } else PS.force.arrow(ctx, c.A.x, c.A.y, st.a, 90, { color: PS.FC.bad, label: '×', F, size: F(17), width: 3, alpha: 0.7 });
      const H = P(c.A.x + Math.cos(st.a) * R, c.A.y + Math.sin(st.a) * R);
      ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(232,89,12,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.A.x, c.A.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      PS.handle(ctx, H.x, H.y, 11, C.F1, '', F);
      PS.handle(ctx, c.A.x, c.A.y, 12, C.F1, '', F);
      D.text(ctx, m.name, 16, F(15) + 8, { size: F(15), weight: 800, color: '#343a40' });
    }
    tell();
  });
})();
