/* 第15章第1节：3D 电荷间的相互作用 charge-3d——支架上能自由转动的棒，用另一根棒靠近它的一端，看排斥还是吸引；
 * 另一个场景：用手捋塑料绳，绳子带上同种电荷相互排斥而散开。依赖 three.js、OrbitControls、circuit.js */
(function () {
  'use strict';
  const { h } = PS;
  const EL = PS.el;
  const RODS = {
    rubber: { n: '橡胶棒（毛皮摩擦过）', q: -1, col: 0x2b2f36, op: 1 },
    glass: { n: '玻璃棒（丝绸摩擦过）', q: 1, col: 0xa5d8ff, op: 0.55 },
    plain: { n: '没有摩擦过的玻璃棒', q: 0, col: 0xa5d8ff, op: 0.55 },
  };
  const L = 0.32, PY = 0.28, TIPX = 0.15;

  PS.register('charge-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { mode: 'rod', hang: 'rubber', hand: 'rubber', d: 0.22, phi: 0, w: 0, rec: {}, strokes: 0, spread: 0, stroke: null, t: 0, say: '' };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。红色圆圈表示正电荷，蓝色圆圈表示负电荷。')), side));
    const modeSeg = PS.ui.seg([{ value: 'rod', label: '电荷间的相互作用' }, { value: 'rope', label: '捋塑料绳' }], 'rod', (v) => setMode(v));
    const hangSeg = PS.ui.seg([{ value: 'rubber', label: '橡胶棒' }, { value: 'glass', label: '玻璃棒' }], 'rubber', (v) => { st.hang = v; build(); });
    const handSeg = PS.ui.seg([{ value: 'rubber', label: '橡胶棒' }, { value: 'glass', label: '玻璃棒' }, { value: 'plain', label: '没摩擦的玻璃棒' }], 'rubber', (v) => { st.hand = v; build(); });
    const dist = PS.ui.slider({ label: '手中的棒离它的距离', min: 2, max: 22, step: 1, value: 22, unit: 'cm', onInput: (v) => { st.d = v / 100; } });
    const msg = h('div', { class: 'el-msg info' });
    const tbl = h('div');
    const rodPanel = h('div', null,
      h('div', { class: 'panel' }, h('h4', null, '① 选器材'), h('div', { class: 'small' }, '放在支架上的棒（已摩擦过）：'), hangSeg.el, h('div', { class: 'small', style: { marginTop: '6px' } }, '手中的棒：'), handSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 慢慢靠近它的一端'), dist.el, h('div', { class: 'controls' }, PS.ui.button('⬅ 靠近', () => { dist.set(3); }, 'btn btn-primary btn-sm'), PS.ui.button('拿开', () => { dist.set(22); }, 'btn btn-sm'), PS.ui.button('让棒转回原位', reset, 'btn btn-ghost btn-sm')), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 实验记录'), tbl));
    const ropeMsg = h('div', { class: 'el-msg info' });
    const ropeRd = PS.ui.readout('捋的次数', '0');
    const ropePanel = h('div', { style: { display: 'none' } },
      h('div', { class: 'panel' }, h('h4', null, '用手捋塑料绳'), h('p', { class: 'small', style: { margin: '0 0 6px' } }, '把一束细塑料绳（塑料包装绳撕成的细丝）的上端系住，用干燥的手从上向下捋几下。'),
        h('div', { class: 'controls' }, PS.ui.button('✋ 从上向下捋一下', strokeRope, 'btn btn-primary btn-sm'), PS.ui.button('重来', () => { st.strokes = 0; tellRope(); }, 'btn btn-ghost btn-sm')), h('div', { class: 'el-read' }, ropeRd.el), ropeMsg));
    side.append(h('div', { class: 'panel' }, modeSeg.el), rodPanel, ropePanel);

    // ---------- 场景 ----------
    const E = EL.three(view, { cam: [0.26, 0.46, 0.6], target: [0.05, 0.24, -0.06], min: 0.25, max: 1.6 });
    const { scene, Std } = E;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.8), Std(0xe9dcc6)); desk.position.y = -0.01; scene.add(desk);
    const metal = Std(0x868e96, { metalness: 0.6, roughness: 0.35 });
    const qTex = (sg) => E.tex(64, 64, (g) => {
      g.fillStyle = sg > 0 ? '#fff0f0' : '#e7f5ff'; g.strokeStyle = sg > 0 ? '#e03131' : '#1c7ed6'; g.lineWidth = 7;
      g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fill(); g.stroke();
      g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(17, 32); g.lineTo(47, 32); if (sg > 0) { g.moveTo(32, 17); g.lineTo(32, 47); } g.stroke();
    });
    const QM = { 1: new THREE.SpriteMaterial({ map: qTex(1) }), '-1': new THREE.SpriteMaterial({ map: qTex(-1) }) };
    const sprite = (sg, s) => { const sp = new THREE.Sprite(QM[sg]); sp.scale.set(s || 0.022, s || 0.022, 1); return sp; };

    const rodScene = new THREE.Group(); scene.add(rodScene);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.015, 32), Std(0x495057)); base.position.y = 0.008; rodScene.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, PY - 0.02, 12), metal); post.position.y = (PY - 0.02) / 2 + 0.015; rodScene.add(post);
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 20, Math.PI), metal); cradle.rotation.z = Math.PI; cradle.position.y = PY + 0.004; rodScene.add(cradle);
    const hangG = new THREE.Group(); hangG.position.y = PY + 0.012; rodScene.add(hangG);
    cradle.parent.remove(cradle); hangG.add(cradle); cradle.position.set(0, -0.008, 0); cradle.rotation.set(0, Math.PI / 2, Math.PI);
    const handG = new THREE.Group(); rodScene.add(handG);
    const LB = { hang: E.label(''), hand: E.label('') };
    let hangRod = null, handRod = null;
    function rodMesh(k, len) {
      const R = RODS[k], g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, len, 20), Std(R.col, { transparent: R.op < 1, opacity: R.op, roughness: R.op < 1 ? 0.1 : 0.6, depthWrite: R.op === 1 }));
      g.add(m); return g;
    }
    function build() {
      if (hangRod) hangG.remove(hangRod);
      if (handRod) handG.remove(handRod);
      hangRod = rodMesh(st.hang, L); hangRod.rotation.z = Math.PI / 2; hangG.add(hangRod);
      const q1 = RODS[st.hang].q;
      for (let i = 0; i < 4; i++) { const s = sprite(q1); s.position.set(TIPX - 0.012 - i * 0.02, 0.018, 0); hangG.add(s); hangRod.userData['s' + i] = s; }
      hangG.children.filter((c) => c.isSprite && !Object.values(hangRod.userData).includes(c)).forEach((c) => hangG.remove(c));
      handRod = new THREE.Group();
      const r2 = rodMesh(st.hand, 0.3); r2.rotation.x = Math.PI / 2; r2.position.z = -0.15; handRod.add(r2);
      const q2 = RODS[st.hand].q;
      if (q2) for (let i = 0; i < 4; i++) { const s = sprite(q2); s.position.set(0, 0.018, -0.012 - i * 0.02); handRod.add(s); }
      const skin = Std(0xf4c7a1, { roughness: 0.8 });
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), skin); fist.scale.set(1.1, 0.8, 1.3); fist.position.z = -0.25; handRod.add(fist);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.2, 14), Std(0x4dabf7, { roughness: 0.9 })); arm.rotation.x = Math.PI / 2; arm.position.z = -0.36; handRod.add(arm);
      handG.add(handRod);
      LB.hang.innerHTML = RODS[st.hang].n.replace('（', '<br>（'); LB.hand.innerHTML = '手中：' + RODS[st.hand].n;
      reset();
    }
    function reset() { st.phi = (Math.random() - 0.5) * 0.04; st.w = 0; st.say = ''; tell(); }

    // ---------- 塑料绳 ----------
    const ropeScene = new THREE.Group(); ropeScene.visible = false; scene.add(ropeScene);
    const RTOP = 0.52, RL = 0.4, NS = 14;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, RTOP + 0.02, 10), metal); stand.position.set(-0.14, (RTOP + 0.02) / 2, 0); ropeScene.add(stand);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 10), metal); bar.rotation.z = Math.PI / 2; bar.position.set(-0.07, RTOP + 0.02, 0); ropeScene.add(bar);
    const rbase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.12), Std(0x495057)); rbase.position.set(-0.12, 0.006, 0); ropeScene.add(rbase);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), Std(0xf03e3e)); knot.position.set(0, RTOP, 0); ropeScene.add(knot);
    const strandM = Std(0xff6b6b, { roughness: 0.5, side: THREE.DoubleSide });
    const strands = [], strandQ = [];
    for (let i = 0; i < NS; i++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), strandM); ropeScene.add(m); strands.push(m); const sp = sprite(-1, 0.018); ropeScene.add(sp); strandQ.push(sp); }
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), Std(0xf4c7a1, { roughness: 0.8 })); handR.scale.set(1.3, 0.8, 1); ropeScene.add(handR);
    let lastSpread = -1;
    function shapeRope(sp, t) {
      if (Math.abs(sp - lastSpread) < 1e-4 && !st.stroke) return;
      lastSpread = sp;
      for (let i = 0; i < NS; i++) {
        const a = (i / NS) * Math.PI * 2 + 0.3 * Math.sin(i * 2.1), jit = 0.75 + 0.5 * ((i * 37) % 10) / 10;
        const pts = [];
        for (let k = 0; k <= 12; k++) {
          const s = k / 12, r = 0.004 + sp * jit * 0.17 * Math.pow(s, 1.25) + 0.003 * s;
          pts.push(new THREE.Vector3(Math.cos(a) * r, RTOP - s * RL * (1 - sp * 0.12 * s), Math.sin(a) * r));
        }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0016, 4, false);
        strands[i].geometry.dispose(); strands[i].geometry = g;
        const p = pts[9];
        strandQ[i].position.set(p.x * 1.08, p.y, p.z * 1.08); strandQ[i].visible = sp > 0.08;
      }
    }
    function strokeRope() { if (st.stroke) return; st.stroke = { f: 0 }; PS.sound.tick(); }
    function tellRope() {
      ropeRd.set(st.strokes + ' 次');
      ropeMsg.className = 'el-msg ' + (st.strokes ? 'ok' : 'info');
      ropeMsg.innerHTML = !st.strokes ? '塑料绳自然下垂。用手从上向下捋一下试试。' : '塑料绳与手摩擦后<b>带上了同种电荷（负电荷）</b>，同种电荷<b>相互排斥</b>，所以细丝向四周散开。' + (st.strokes < 4 ? '多捋几下，看看散得怎样。' : '捋的次数越多，带的电荷越多，散得越开。');
    }

    function setMode(m) {
      st.mode = m;
      rodScene.visible = m === 'rod'; ropeScene.visible = m === 'rope';
      rodPanel.style.display = m === 'rod' ? '' : 'none'; ropePanel.style.display = m === 'rope' ? '' : 'none';
      Object.values(LB).forEach((l) => { l.dataset.hide = m === 'rod' ? '' : '1'; if (m !== 'rod') l.style.display = 'none'; });
      if (m === 'rod') E.fly([0.26, 0.46, 0.6], [0.05, 0.24, -0.06]); else E.fly([0.05, 0.42, 0.75], [0, 0.32, 0]);
      tellRope(); lastSpread = -1;
    }

    // ---------- 物理 ----------
    const tip = new THREE.Vector3(), end = new THREE.Vector3();
    function interact() {
      const a = RODS[st.hang].q, b = RODS[st.hand].q;
      return a && b ? a * b : a || b ? -0.35 : 0;
    }
    function step(dt) {
      tip.set(TIPX, PY + 0.012, -st.d - 0.012);
      end.set(Math.cos(st.phi) * TIPX, PY + 0.012, -Math.sin(st.phi) * TIPX);
      const dx = end.x - tip.x, dz = end.z - tip.z, r2 = dx * dx + dz * dz, r = Math.sqrt(r2);
      const s = interact(), F = (0.0016 * s) / (r2 + 0.0006);
      const Fx = (F * dx) / r, Fz = (F * dz) / r;
      const rx = end.x, rz = end.z;
      const tau = rz * Fx - rx * Fz;
      st.w += (tau / 0.0009 - st.w * 6) * dt;
      const nphi = st.phi + st.w * dt;
      const ne = [Math.cos(nphi) * TIPX, -Math.sin(nphi) * TIPX];
      if (Math.hypot(ne[0] - tip.x, ne[1] - tip.z) < 0.026 && s < 0) { st.w = 0; return; }
      st.phi = PS.clamp(nphi, -1.9, 1.9);
      if (Math.abs(st.phi) >= 1.9) st.w = 0;
    }
    function tell() {
      const s = interact(), moved = st.phi;
      let key = 'wait', txt, cls = 'info';
      if (st.d > 0.15) txt = '手中的棒离得还远。拖动滑块（或点“⬅ 靠近”），让它慢慢靠近支架上那根棒的一端。';
      else if (s === 0) txt = '两根棒都不带电，没有相互作用。';
      else if (Math.abs(moved) < 0.12) txt = '靠近中……';
      else {
        const rep = moved < 0;
        key = st.hang + '|' + st.hand;
        txt = rep ? '支架上的棒<b>被推开</b>，两根棒<b>相互排斥</b>：它们带<b>同种电荷</b>。' : st.hand === 'plain' ? '没有摩擦过的玻璃棒不带电，支架上带电的棒却<b>被吸引</b>过来——<b>带电体能吸引轻小物体</b>。所以两个物体相互吸引，不一定都带电！' : '支架上的棒<b>被吸引</b>过来，两根棒<b>相互吸引</b>：它们带<b>异种电荷</b>。';
        cls = 'ok';
        if (!st.rec[key]) { st.rec[key] = rep ? '相互排斥' : '相互吸引'; table(); PS.sound.good(); }
      }
      if (txt !== st.say) { st.say = txt; msg.className = 'el-msg ' + cls; msg.innerHTML = txt; }
    }
    function table() {
      const ks = Object.keys(st.rec);
      tbl.innerHTML = ks.length ? '<table class="el-tbl"><tr><th>支架上的棒</th><th>手中的棒</th><th>现象</th></tr>' + ks.map((k) => { const [a, b] = k.split('|'); return '<tr><td>' + RODS[a].n.replace(/（.*/, '') + '</td><td>' + RODS[b].n.replace(/（.*/, '') + '</td><td>' + st.rec[k] + '</td></tr>'; }).join('') + '</table>' +
        (st.rec['rubber|rubber'] && st.rec['glass|glass'] && (st.rec['rubber|glass'] || st.rec['glass|rubber']) ? '<div class="el-msg ok"><b>结论：</b>同种电荷互相排斥，异种电荷互相吸引。自然界只有两种电荷：丝绸摩擦过的玻璃棒带<b>正电荷</b>，毛皮摩擦过的橡胶棒带<b>负电荷</b>。</div>' : '<p class="small muted" style="margin:4px 0 0">换几种组合再做：橡胶棒与橡胶棒、玻璃棒与玻璃棒、橡胶棒与玻璃棒……</p>')
        : '<p class="small muted" style="margin:0">每做一种组合，结果会记录在这里。</p>';
    }

    const v3 = new THREE.Vector3();
    let tt = 0;
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.mode === 'rod') {
        for (let k = 0; k < 4; k++) step(dt / 4);
        hangG.rotation.y = st.phi;
        handG.position.set(TIPX, PY + 0.012, -st.d - 0.012);
        tt += dt; if (tt > 0.2) { tt = 0; tell(); }
        E.place(LB.hang, v3.set(-0.1, PY + 0.07, 0));
        E.place(LB.hand, v3.set(TIPX + 0.02, PY + 0.07, -st.d - 0.16));
      } else {
        if (st.stroke) {
          st.stroke.f += dt / 1.1;
          const f = Math.min(1, st.stroke.f);
          handR.visible = true; handR.position.set(0.03, RTOP - 0.02 - f * RL * 0.95, 0.02);
          if (st.stroke.f >= 1) { st.stroke = null; st.strokes++; tellRope(); }
        } else handR.visible = false;
        const goal = st.stroke ? Math.max(0, st.spread * 0.4) : 1 - Math.exp(-st.strokes / 2.5);
        st.spread += (goal - st.spread) * Math.min(1, dt * (st.stroke ? 8 : 3));
        shapeRope(st.spread);
      }
      E.render(dt);
    }, view);
    build(); table(); tellRope();
    loop.start();
    el._st = st;
  });
})();
