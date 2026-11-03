/* 第14章第3节：3D 一种设想中的永动机——“滚球轮”：轮上斜装 12 根管子，小球总是滚到管子较低的一端，右边的小球离轴远、左边的离轴近。
 * 推一下，看它能不能一直转下去：两边的力矩、能量的去向（轮子的机械能、内能、小灯的电能）。依赖 three.js、OrbitControls、thermal.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const TH = PS.th, EN = PS.en;
  const N = 12, RA = 0.07, RB = 0.25, BETA = 0.95, MB = 0.3, G = 9.8, I0 = 0.42, AXY = 0.36;
  const TF = 0.07, BV = 0.03, LOAD = 0.35;

  PS.register('wheel-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { th: 0, w: 0, s: new Array(N).fill(0), lamp: false, Ein: 0, Elamp: 0, PE0: 0, turns: 0, th0: 0, pushed: false };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。红色小球在透明的管子里滚动，总是停在管子较低的一端。')), side));
    const rd = { nR: PS.ui.readout('右边的小球', '—'), nL: PS.ui.readout('左边的小球', '—'), tR: PS.ui.readout('右边的力矩之和', '—'), tL: PS.ui.readout('左边的力矩之和', '—'), turn: PS.ui.readout('转过的圈数', '0'), w: PS.ui.readout('转速', '0') };
    const lampT = PS.ui.toggle('带动小发电机点亮小灯（对外做功）', false, (v) => { st.lamp = v; });
    const msg = h('div', { class: 'th-msg info' });
    const barBox = h('div');
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 设计者的想法'), h('p', { class: 'small', style: { margin: 0 }, html: '轮子顺时针转动时，右边的小球滚到管子外端，<b>离轴远</b>；左边的小球滚到管子内端，<b>离轴近</b>。设计者认为：右边小球的力矩大，轮子会<b>永远转下去</b>，还能对外做功。' })),
      h('div', { class: 'panel' }, h('h4', null, '② 推一下试试'), h('div', { class: 'row' }, PS.ui.button('👉 轻轻推一下', () => push(2.2), 'btn btn-primary btn-sm'), PS.ui.button('👉 用力推一下', () => push(5), 'btn btn-sm'), PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), h('div', { style: { marginTop: '6px' } }, lampT.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 数一数、算一算'), h('div', { class: 'th-read' }, rd.nR.el, rd.nL.el, rd.tR.el, rd.tL.el, rd.turn.el, rd.w.el)),
      h('div', { class: 'panel' }, h('h4', null, '④ 能量到哪里去了'), barBox));
    const BS = EN.stage(barBox, { VW: 1000, vh: (w) => (w < 300 ? 640 : 520), draw: drawBars });

    // ---------- 场景 ----------
    const E = TH.three(view, { cam: [0.18, 0.42, 0.95], target: [0, AXY, 0], min: 0.3, max: 2.2 });
    const { scene, Std } = E;
    const dark = Std(0x495057, { metalness: 0.6, roughness: 0.4 }), wood = Std(0x8a5a1c, { roughness: 0.85 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.5), Std(0xe9dcc6)); desk.position.y = -0.01; scene.add(desk);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.22), wood); base.position.y = 0.015; scene.add(base);
    [-0.06, 0.06].forEach((z) => {
      [-1, 1].forEach((sd) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.02), wood); leg.position.set(sd * 0.09, 0.2, z); leg.rotation.z = sd * 0.24; scene.add(leg); });
    });
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 12), dark); axle.rotation.x = Math.PI / 2; axle.position.y = AXY; scene.add(axle);
    const wheel = new THREE.Group(); wheel.position.y = AXY; scene.add(wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(RB + 0.025, 0.008, 10, 80), Std(0x1c7ed6, { metalness: 0.3, roughness: 0.5 })); wheel.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 24), dark); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    const glass = Std(0xd0e4f7, { transparent: true, opacity: 0.26, roughness: 0.05, depthWrite: false });
    const ballM = Std(0xe03131, { metalness: 0.4, roughness: 0.3 });
    const A = [], B = [], balls = [];
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      A.push([RA * Math.sin(a), RA * Math.cos(a)]); B.push([RB * Math.sin(a + BETA), RB * Math.cos(a + BETA)]);
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.006, RB + 0.025, 0.006), Std(0x74c0fc)); sp.position.set(Math.sin(a) * (RB + 0.025) / 2, Math.cos(a) * (RB + 0.025) / 2, -0.02); sp.rotation.z = -a; wheel.add(sp);
      const d = new THREE.Vector3(B[i][0] - A[i][0], B[i][1] - A[i][1], 0), L = d.length();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0155, 0.0155, L + 0.03, 16, 1, false), glass); tube.renderOrder = 6;
      tube.position.set((A[i][0] + B[i][0]) / 2, (A[i][1] + B[i][1]) / 2, 0); tube.quaternion.setFromUnitVectors(up, d.normalize()); wheel.add(tube);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 12), ballM); wheel.add(ball); balls.push(ball);
    }
    const bulbM = new THREE.MeshBasicMaterial({ color: 0xfff3bf, transparent: true, opacity: 0.5 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), bulbM); bulb.position.set(0.36, 0.12, 0.02); scene.add(bulb);
    const bulbBase = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.06, 16), dark); bulbBase.position.set(0.36, 0.075, 0.02); scene.add(bulbBase);
    const glow = new THREE.PointLight(0xffd43b, 0, 0.6); glow.position.copy(bulb.position); scene.add(glow);
    const gen = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 20), Std(0x868e96, { metalness: 0.6, roughness: 0.4 })); gen.rotation.x = Math.PI / 2; gen.position.set(0, AXY, 0.11); scene.add(gen);
    const LB = { R: E.label('右边：离轴远，但个数少'), L: E.label('左边：离轴近，但个数多'), gen: E.label('小发电机'), lamp: E.label('小灯') };

    // ---------- 物理 ----------
    const world = (i, s, th) => {
      const x = A[i][0] + (B[i][0] - A[i][0]) * s, y = A[i][1] + (B[i][1] - A[i][1]) * s, c = Math.cos(th), sn = Math.sin(th);
      return [x * c - y * sn, x * sn + y * c];
    };
    const lowEnd = (i, th) => (world(i, 0, th)[1] < world(i, 1, th)[1] ? 0 : 1);
    const PE = () => { let s = 0; for (let i = 0; i < N; i++) s += MB * G * world(i, st.s[i], st.th)[1]; return s; };
    function torque() { let t = 0; for (let i = 0; i < N; i++) t -= MB * G * world(i, st.s[i], st.th)[0]; return t; }
    function step(dt) {
      for (let i = 0; i < N; i++) { const tg = lowEnd(i, st.th); if (st.s[i] !== tg) { const d = tg - st.s[i]; st.s[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 5); } }
      const tq = torque(), wl = st.lamp && Math.abs(st.w) > 0.05 ? LOAD : 0;
      if (Math.abs(st.w) < 0.02 && Math.abs(tq) < TF * 1.4) { st.w = 0; return; }
      const fr = -Math.sign(st.w || tq) * (TF + wl) - BV * st.w;
      if (wl) st.Elamp += wl * Math.abs(st.w) * dt * 0.8;
      st.w += ((tq + fr) / I0) * dt;
      st.th += st.w * dt;
    }
    function settle() { for (let k = 0; k < 6000; k++) { step(1 / 240); if (st.w === 0 && st.s.every((s, i) => s === lowEnd(i, st.th))) break; } }
    function reset() {
      st.th = Math.random() * Math.PI * 2; st.w = 0;
      for (let i = 0; i < N; i++) st.s[i] = lowEnd(i, st.th);
      settle();
      st.Ein = 0; st.Elamp = 0; st.PE0 = PE(); st.turns = 0; st.th0 = st.th; st.pushed = false; st.max = 0;
      tell(true);
    }
    function push(w0) {
      const before = 0.5 * I0 * st.w * st.w;
      st.w = Math.min(st.w, 0) - w0 * 0.6; if (st.w > -w0) st.w = -w0;
      st.Ein += 0.5 * I0 * st.w * st.w - before; st.pushed = true; PS.sound.tick(); tell(true);
    }
    const ledger = () => { const KE = 0.5 * I0 * st.w * st.w, dPE = PE() - st.PE0, mech = Math.max(0, KE + dPE), Q = Math.max(0, st.Ein - KE - dPE - st.Elamp); return { mech, Q, lamp: st.Elamp, tot: st.Ein }; };
    let lastSay = '';
    function tell(force) {
      let nR = 0, nL = 0, tR = 0, tL = 0;
      for (let i = 0; i < N; i++) { const x = world(i, st.s[i], st.th)[0]; if (x > 0.002) { nR++; tR += MB * G * x; } else if (x < -0.002) { nL++; tL -= MB * G * x; } }
      rd.nR.set(nR + ' 个'); rd.nL.set(nL + ' 个');
      rd.tR.set(PS.fmt(tR, 2) + ' N·m'); rd.tL.set(PS.fmt(tL, 2) + ' N·m');
      rd.turn.set(PS.fmt(Math.abs(st.th - st.th0) / (Math.PI * 2), 1) + ' 圈'); rd.w.set(PS.fmt((Math.abs(st.w) * 60) / (Math.PI * 2), 0) + ' r/min');
      const moving = Math.abs(st.w) > 0.01;
      const key = (st.pushed ? 1 : 0) + '' + (moving ? 1 : 0) + (st.lamp ? 1 : 0);
      if (key !== lastSay || force) {
        lastSay = key; let s, cls = 'info';
        if (!st.pushed) s = '轮子静止时，<b>右边的小球离轴远但个数少，左边的小球离轴近但个数多</b>，两边的力矩几乎相等（看右边的读数），轮子不会自己转起来。推一下试试。';
        else if (moving) s = '轮子在转……能转多久？' + (st.lamp ? '它还要带动发电机点亮小灯（对外做功）。' : '');
        else { s = '轮子转了 ' + PS.fmt(Math.abs(st.th - st.th0) / (Math.PI * 2), 1) + ' 圈就停下来了！推一下给它的能量，' + (st.Elamp > 0.01 ? '一部分转化成了小灯的电能，其余的' : '') + '在轴的摩擦和小球的碰撞中<b>转化成了内能</b>，能量的总量没有变。它不但不能“永远转下去”，更不能无中生有地对外做功——<b>违背能量守恒定律的永动机是不可能造出来的</b>。'; cls = 'ok'; }
        msg.className = 'th-msg ' + cls; msg.innerHTML = s;
      }
      BS.render();
    }
    function drawBars(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), L = ledger(), max = Math.max(0.05, L.tot);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, VH);
      EN.bars(ctx, 20, 20, 960, VH - 40, [{ n: '轮子的\n机械能', v: L.mech, c: '#3b5bdb' }, { n: '内能', v: L.Q, c: '#e03131' }, { n: '小灯的\n电能', v: L.lamp, c: '#f59f00' }], { F, max: max * 1.05, total: L.tot, lines: 2, fmt: (v) => PS.fmt(v, 2) + ' J', bw: 160, bg: false });
      D2.text(ctx, '虚线：推力做的功 ' + PS.fmt(L.tot, 2) + ' J', 980, 46, { size: F(12), weight: 700, align: 'right', color: '#1b2333' });
    }
    const D2 = PS.draw;
    let tt = 0;
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      for (let k = 0; k < 4; k++) step(dt / 4);
      wheel.rotation.z = st.th;
      for (let i = 0; i < N; i++) { const x = A[i][0] + (B[i][0] - A[i][0]) * st.s[i], y = A[i][1] + (B[i][1] - A[i][1]) * st.s[i]; balls[i].position.set(x, y, 0); }
      const lw = st.lamp ? PS.clamp(Math.abs(st.w) / 3, 0, 1) : 0;
      bulbM.color.setHex(lw > 0.05 ? 0xffd43b : 0xf1f3f5); bulbM.opacity = 0.5 + lw * 0.5; glow.intensity = lw * 2.5;
      tt += dt; if (tt > 0.15) { tt = 0; tell(); }
      E.render(dt);
      const sm = view.clientWidth < 560; if (sm !== LB.sm) { LB.sm = sm; LB.R.innerHTML = sm ? '右：远、少' : '右边：离轴远，但个数少'; LB.L.innerHTML = sm ? '左：近、多' : '左边：离轴近，但个数多'; }
      E.place(LB.R, v3.set(0.3, AXY + 0.2, 0)); E.place(LB.L, v3.set(-0.3, AXY + 0.2, 0));
      LB.gen.dataset.hide = st.lamp ? '' : '1'; LB.lamp.dataset.hide = st.lamp ? '' : '1';
      E.place(LB.gen, v3.set(0.07, AXY + 0.05, 0.14)); E.place(LB.lamp, v3.set(0.36, 0.19, 0.02));
    }, view);
    el._st = st;
    reset();
    loop.start();
  });
})();
