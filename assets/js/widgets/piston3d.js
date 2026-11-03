/* 第13章第2节：3D 做功改变物体的内能——压缩引火仪（迅速 / 缓慢压下活塞，筒内空气温度、硝化棉燃烧）、瓶塞跳起（向瓶内打气，瓶塞跳起时瓶内出现白雾）。依赖 three.js、OrbitControls、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const TH = PS.th, TC = PS.TC;
  const T0 = 293.15, GAM = 1.4;
  const YB = 0.04, YTOP = 0.25, YLOW = 0.061, RIN = 0.018; // 筒底、活塞最高 / 最低位置（压缩比 10）、内半径
  const IGN = 180; // 硝化棉的着火点（约 180 ℃）

  PS.register('piston-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { mode: 'fire', yp: YTOP, T: T0, press: null, burn: 0, burnt: false, smoke: 0, // 引火仪
      p: 1, Tb: T0, pump: 0, pumpY: 0, pop: 0, popAt: 1.6, fog: 0, cork: { y: 0, vy: 0, x: 0, a: 0 } };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。筒内、瓶内的小点表示空气分子（示意），颜色越红温度越高。')), side));
    const modeSeg = PS.ui.seg([{ value: 'fire', label: '压缩引火仪' }, { value: 'cork', label: '瓶塞跳起' }], st.mode, (v) => { st.mode = v; setMode(); });
    const ops = h('div', { class: 'row' });
    const rd = { T: PS.ui.readout('筒内空气的温度', '20 ℃'), V: PS.ui.readout('空气柱的长度', '21.0 cm') };
    const msg = h('div', { class: 'th-msg info' });
    const chain = h('div', { class: 'small', style: { lineHeight: 1.9 } });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择实验'), modeSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 动手做'), ops, h('div', { class: 'th-read' }, rd.T.el, rd.V.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 能量怎样变化？'), chain));

    // ---------- 场景 ----------
    const E = TH.three(view, { cam: [0.2, 0.25, 0.4], target: [0, 0.15, 0], min: 0.12, max: 2 });
    const { scene, Std } = E;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.6), Std(0xe9dcc6)); desk.position.set(0.1, -0.01, 0); scene.add(desk);
    const glassM = Std(0xcfe3ff, { transparent: true, opacity: 0.28, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const metal = Std(0xadb5bd, { metalness: 0.8, roughness: 0.3 });
    const dotTex = E.tex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });

    /* 压缩引火仪 */
    const G1 = new THREE.Group(); scene.add(G1);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.1), Std(0x8a5a1c, { roughness: 0.8 })); base.position.y = 0.015; G1.add(base);
    const prof = [[0, 0.03], [0.032, 0.03], [0.032, 0.27], [RIN, 0.27], [RIN, YB], [0, YB]].map(([x, y]) => new THREE.Vector2(x, y));
    const tube = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), glassM); tube.renderOrder = 5; G1.add(tube);
    const cottonGeo = new THREE.IcosahedronGeometry(0.008, 1);
    const pa = cottonGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = 0.75 + Math.random() * 0.5; pa.setXYZ(i, pa.getX(i) * k * 1.3, pa.getY(i) * k * 0.7, pa.getZ(i) * k * 1.3); }
    cottonGeo.computeVertexNormals();
    const cottonM = Std(0xf8f9fa, { roughness: 1, emissive: 0xff6a00, emissiveIntensity: 0 });
    const cotton = new THREE.Mesh(cottonGeo, cottonM); cotton.position.set(0, YB + 0.006, 0); G1.add(cotton);
    const piston = new THREE.Group(); G1.add(piston);
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(RIN - 0.0005, RIN - 0.0005, 0.012, 32), metal); disk.position.y = 0.006; piston.add(disk);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RIN - 0.001, 0.0018, 8, 32), Std(0x212529)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.004; piston.add(ring);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.26, 12), metal); rod.position.y = 0.012 + 0.13; piston.add(rod);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 16), Std(0x343a40)); handle.rotation.z = Math.PI / 2; handle.position.y = 0.272; piston.add(handle);
    const flameTex = E.tex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,250,200,1)'); gr.addColorStop(0.4, 'rgba(255,170,50,.9)'); gr.addColorStop(1, 'rgba(255,90,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    flame.position.set(0, YB + 0.01, 0); flame.renderOrder = 7; G1.add(flame);
    const N1 = 140;
    const g1 = new THREE.BufferGeometry(), p1 = new Float32Array(N1 * 3);
    g1.setAttribute('position', new THREE.BufferAttribute(p1, 3));
    const pm1 = new THREE.PointsMaterial({ size: 0.0045, map: dotTex, transparent: true, depthWrite: false, color: 0x4dabf7 });
    const pts1 = new THREE.Points(g1, pm1); pts1.renderOrder = 6; G1.add(pts1);
    const M1 = Array.from({ length: N1 }, () => { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (RIN - 0.002); return { x: Math.cos(a) * r, z: Math.sin(a) * r, u: Math.random(), vx: PS.gauss(), vy: PS.gauss(), vz: PS.gauss() }; });
    const smokeM = new THREE.PointsMaterial({ size: 0.007, map: dotTex, transparent: true, depthWrite: false, color: 0x868e96, opacity: 0 });
    const gS = new THREE.BufferGeometry(), pS = new Float32Array(60 * 3);
    gS.setAttribute('position', new THREE.BufferAttribute(pS, 3));
    const smoke = new THREE.Points(gS, smokeM); G1.add(smoke);

    /* 瓶塞跳起 */
    const G2 = new THREE.Group(); scene.add(G2);
    const bprof = [[0, 0.004], [0.05, 0.004], [0.062, 0.03], [0.062, 0.11], [0.03, 0.15], [0.017, 0.16], [0.017, 0.2]].map(([x, y]) => new THREE.Vector2(x, y));
    const bottle = new THREE.Mesh(new THREE.LatheGeometry(bprof, 40), glassM); bottle.renderOrder = 5; G2.add(bottle);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.016, 32), Std(0x74c0fc, { transparent: true, opacity: 0.55, depthWrite: false })); water.position.y = 0.013; G2.add(water);
    const cork = new THREE.Group(); G2.add(cork);
    const corkM = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.015, 0.03, 24), Std(0xc92a2a, { roughness: 0.7 })); cork.add(corkM);
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.05, 8), metal); needle.position.y = 0.005; cork.add(needle);
    const CORK_Y = 0.2;
    const pump = new THREE.Group(); pump.position.set(0.22, 0, 0.02); G2.add(pump);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 24), Std(0x228be6, { metalness: 0.2, roughness: 0.5 })); barrel.position.y = 0.14; pump.add(barrel);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.04), Std(0x343a40)); foot.position.y = 0.006; pump.add(foot);
    const prod = new THREE.Group(); pump.add(prod);
    const prodRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 10), metal); prodRod.position.y = 0.3; prod.add(prodRod);
    const prodH = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.11, 16), Std(0x343a40)); prodH.rotation.z = Math.PI / 2; prodH.position.y = 0.36; prod.add(prodH);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.22, 0.03, 0.02), new THREE.Vector3(0.16, 0.02, 0.06), new THREE.Vector3(0.08, 0.25, 0.05), new THREE.Vector3(0.012, 0.25, 0.0), new THREE.Vector3(0.0, 0.232, 0)]), 40, 0.004, 8), Std(0x343a40, { roughness: 0.8 }));
    G2.add(hose);
    const N2 = 160;
    const g2 = new THREE.BufferGeometry(), p2 = new Float32Array(N2 * 3);
    g2.setAttribute('position', new THREE.BufferAttribute(p2, 3));
    const pm2 = new THREE.PointsMaterial({ size: 0.006, map: dotTex, transparent: true, depthWrite: false, color: 0x4dabf7 });
    const pts2 = new THREE.Points(g2, pm2); pts2.renderOrder = 6; G2.add(pts2);
    const inBottle = () => { for (;;) { const y = 0.024 + Math.random() * 0.12, r = (y < 0.11 ? 0.056 : 0.056 - (y - 0.11) * 0.75) * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2; return [Math.cos(a) * r, y, Math.sin(a) * r]; } };
    const M2 = Array.from({ length: N2 }, () => { const [x, y, z] = inBottle(); return { x, y, z, vx: PS.gauss(), vy: PS.gauss(), vz: PS.gauss() }; });
    const NF = 220, gF = new THREE.BufferGeometry(), pF = new Float32Array(NF * 3);
    for (let i = 0; i < NF; i++) { const [x, y, z] = inBottle(); pF[i * 3] = x; pF[i * 3 + 1] = y; pF[i * 3 + 2] = z; }
    gF.setAttribute('position', new THREE.BufferAttribute(pF, 3));
    const fogM = new THREE.PointsMaterial({ size: 0.04, map: dotTex, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0 });
    const fog = new THREE.Points(gF, fogM); fog.renderOrder = 7; G2.add(fog);

    const LB = { tube: E.label('厚玻璃筒'), cot: E.label('硝化棉'), pis: E.label('活塞'), bot: E.label('瓶子'), pump: E.label('打气筒'), cork: E.label('瓶塞'), fog: E.label('白雾', 'ref') };

    // ---------- 操作 ----------
    function setMode() {
      ops.innerHTML = '';
      const fire = st.mode === 'fire';
      G1.visible = fire; G2.visible = !fire;
      rd.T.el.querySelector('span').innerHTML = fire ? '筒内空气的温度' : '瓶内气体的温度';
      rd.V.el.querySelector('span').innerHTML = fire ? '空气柱的长度' : '瓶内的气压';
      if (fire) {
        ops.append(PS.ui.button('⚡ 迅速压下活塞', () => press(0.25), 'btn btn-primary btn-sm'), PS.ui.button('🐢 缓慢压下活塞', () => press(5), 'btn btn-sm'), PS.ui.button('重来', resetFire, 'btn btn-ghost btn-sm'));
        E.fly([0.2, 0.25, 0.4], [0, 0.15, 0]);
      } else {
        ops.append(PS.ui.button('💨 打一次气', pumpOnce, 'btn btn-primary btn-sm'), PS.ui.button('重来', resetCork, 'btn btn-ghost btn-sm'));
        E.fly([0.32, 0.3, 0.52], [0.09, 0.13, 0]);
      }
      tell();
    }
    function press(dur) {
      if (st.press || st.yp < YTOP - 1e-4) { if (!st.press) { msg.className = 'th-msg bad'; msg.innerHTML = '活塞已经压下去了，点“重来”把活塞拉起来，再做一次。'; } return; }
      if (st.burnt) resetFire(true);
      st.press = { dur, t: 0 }; tell();
    }
    function resetFire(keepMsg) { st.yp = YTOP; st.T = T0; st.press = null; st.burn = 0; st.burnt = false; st.smoke = 0; st.Tmax = T0; cotton.visible = true; cotton.scale.setScalar(1); cottonM.emissiveIntensity = 0; flame.material.opacity = 0; if (keepMsg !== true) tell(); }
    function pumpOnce() {
      if (st.pop || st.pump > 0) return;
      st.pump = 0.0001; PS.sound.tick();
    }
    function resetCork() { st.p = 1; st.Tb = T0; st.pump = 0; st.pop = 0; st.fog = 0; st.popAt = PS.round(PS.rand(1.5, 1.8), 2); st.cork = { y: 0, vy: 0, x: 0, a: 0 }; tell(); }
    const fmtC = (T) => PS.fmtT(T - 273.15, 0);
    function tell() {
      let s, cls = 'info', ch;
      if (st.mode === 'fire') {
        rd.T.set(fmtC(st.T)); rd.V.set(PS.fmt((st.yp - YB) * 100, 1) + ' cm');
        if (st.press) s = st.press.dur < 1 ? '迅速压下活塞……' : '缓慢压下活塞……';
        else if (st.burnt) { s = '硝化棉燃烧起来了！迅速压下活塞时，<b>活塞对筒内的空气做功</b>，空气的内能增加、温度升高，达到了硝化棉的着火点（筒内空气的最高温度约 ' + fmtC(st.Tmax) + '）。'; cls = 'ok'; }
        else if (st.yp < YTOP - 1e-4) { s = '缓慢压下活塞，硝化棉没有燃烧：压缩时空气的内能增加得慢，同时又不断通过筒壁向外传热，温度只升高到约 ' + fmtC(st.Tmax) + '，达不到硝化棉的着火点（约 180 ℃）。'; cls = 'bad'; }
        else s = '厚玻璃筒的底部放有一小团硝化棉（着火点很低），把活塞迅速压下去，观察会发生什么。';
        ch = '活塞对空气<b>做功</b> → 空气的<b>内能增加</b>，温度升高<br><span class="muted">机械能转化为内能</span>';
      } else {
        rd.T.set(fmtC(st.Tb)); rd.V.set(PS.fmt(st.p, 2) + ' 个标准大气压');
        if (st.pop) { s = '瓶塞跳起来了，瓶内出现了<b>白雾</b>！瓶内的气体对瓶塞<b>做功</b>，内能减少，温度降低，瓶内的水蒸气<b>液化</b>成小水滴，形成白雾。'; cls = 'ok'; ch = '瓶内气体对瓶塞<b>做功</b> → 气体的<b>内能减少</b>，温度降低 → 水蒸气液化成“白雾”<br><span class="muted">内能转化为机械能</span>'; }
        else { s = st.p > 1.01 ? '继续打气，瓶内的气压越来越大……当气压大到一定程度时，瓶塞会跳起来。' : '瓶内装有少量的水（瓶内有水蒸气），用打气筒向瓶内打气，观察瓶塞跳起时瓶内的现象。'; ch = '打气时，对瓶内气体<b>做功</b> → 气体的<b>内能增加</b>，温度略微升高'; }
      }
      msg.className = 'th-msg ' + cls; msg.innerHTML = s;
      chain.innerHTML = ch + '<div class="tip tip-good" style="margin:8px 0 0"><b>做功可以改变物体的内能</b>：外界对物体做功，物体的内能增加；物体对外界做功，物体的内能减少。</div>';
    }

    // ---------- 动画 ----------
    let tellT = 0;
    const loop = PS.loop((dt) => {
      if (st.mode === 'fire') stepFire(dt); else stepCork(dt);
      tellT += dt; if (tellT > 0.15) { tellT = 0; if (st.press || st.pop || st.pump) tell(); else if (st.mode === 'fire' ? Math.abs(st.T - T0) > 0.5 : Math.abs(st.Tb - T0 - 5) > 0.3) tell(); }
      E.render(dt);
      const fire = st.mode === 'fire';
      [LB.tube, LB.cot, LB.pis].forEach((e) => (e.dataset.hide = fire ? '' : '1'));
      [LB.bot, LB.pump, LB.cork].forEach((e) => (e.dataset.hide = fire ? '1' : ''));
      LB.fog.dataset.hide = !fire && st.fog > 0.3 ? '' : '1';
      LB.cot.dataset.hide = fire && cotton.visible ? '' : '1';
      E.place(LB.tube, new THREE.Vector3(-0.045, 0.2, 0));
      E.place(LB.cot, new THREE.Vector3(0.05, YB + 0.005, 0.02));
      E.place(LB.pis, new THREE.Vector3(0.045, st.yp + 0.03, 0));
      E.place(LB.bot, new THREE.Vector3(-0.075, 0.08, 0));
      E.place(LB.pump, new THREE.Vector3(0.22, 0.31 - st.pumpY, 0.05));
      E.place(LB.cork, new THREE.Vector3(st.cork.x - 0.04, CORK_Y + st.cork.y + 0.02, 0));
      E.place(LB.fog, new THREE.Vector3(0.0, 0.09, 0.07));
    }, view);
    function stepFire(dt) {
      const H0 = st.yp - YB;
      if (st.press) {
        const P = st.press; P.t += dt;
        const f = Math.min(1, P.t / P.dur);
        const yp = P.dur < 1 ? YTOP - (YTOP - YLOW) * f : YB + (YTOP - YB) * Math.pow((YLOW - YB) / (YTOP - YB), f);
        const V1 = H0, V2 = yp - YB;
        st.T *= Math.pow(V1 / V2, GAM - 1);
        st.yp = yp;
        if (f >= 1) { st.press = null; PS.sound.clack(); setTimeout(tell, 0); }
      }
      st.T -= ((st.T - T0) / 0.9) * dt;
      st.Tmax = Math.max(st.Tmax || T0, st.T);
      if (!st.burnt && st.T - 273.15 > IGN && cotton.visible) { st.burnt = true; st.burn = 0.0001; PS.sound.ping(); }
      if (st.burn > 0 && st.burn < 1) {
        st.burn = Math.min(1, st.burn + dt / 0.9);
        flame.material.opacity = Math.sin(Math.PI * st.burn);
        const s = 0.03 + 0.03 * Math.sin(Math.PI * st.burn); flame.scale.set(s, s * 1.4, 1);
        cottonM.emissiveIntensity = 1.5 * (1 - st.burn); cotton.scale.setScalar(Math.max(0.01, 1 - st.burn));
        if (st.burn >= 1) { cotton.visible = false; st.smoke = 1; for (let i = 0; i < 60; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (RIN - 0.002); pS[i * 3] = Math.cos(a) * r; pS[i * 3 + 1] = YB + Math.random() * (st.yp - YB); pS[i * 3 + 2] = Math.sin(a) * r; } gS.attributes.position.needsUpdate = true; }
      }
      smokeM.opacity = st.smoke * 0.55;
      if (st.smoke) for (let i = 0; i < 60; i++) { pS[i * 3 + 1] = Math.min(st.yp - 0.002, Math.max(YB + 0.001, pS[i * 3 + 1] + PS.gauss() * 0.0006)); }
      if (st.smoke) gS.attributes.position.needsUpdate = true;
      piston.position.y = st.yp;
      // 空气分子
      const sp = 0.06 * Math.sqrt(st.T / T0), H = st.yp - YB;
      for (let i = 0; i < N1; i++) {
        const m = M1[i];
        m.x += m.vx * sp * dt; m.z += m.vz * sp * dt; m.u += (m.vy * sp * dt) / H;
        const r = Math.hypot(m.x, m.z);
        if (r > RIN - 0.0025) { const k = (RIN - 0.0025) / r; m.x *= k; m.z *= k; const d = (m.vx * m.x + m.vz * m.z) / (r * k * r * k); m.vx -= 2 * d * m.x; m.vz -= 2 * d * m.z; }
        if (m.u < 0.02) { m.u = 0.02; m.vy = Math.abs(m.vy); } if (m.u > 0.98) { m.u = 0.98; m.vy = -Math.abs(m.vy); }
        p1[i * 3] = m.x; p1[i * 3 + 1] = YB + m.u * H; p1[i * 3 + 2] = m.z;
      }
      g1.attributes.position.needsUpdate = true;
      pm1.color.setStyle(TH.heatColor(PS.clamp((st.T - T0) / 300, 0, 1)));
    }
    function stepCork(dt) {
      // 打气筒：压下再拉起
      if (st.pump > 0) {
        st.pump += dt / 0.5;
        if (st.pump >= 0.5 && !st.pumped) { st.pumped = true; st.p = PS.round(st.p + 0.1, 2); st.Tb += 1.2; PS.sound.clack(); if (st.p >= st.popAt) { st.pop = 0.0001; st.cork.vy = 1.9; st.cork.vx = 0.25; st.Tb *= Math.pow(1 / st.p, (GAM - 1) / GAM); st.p = 1; st.fog = 1; PS.sound.clack(); setTimeout(() => PS.sound.ping(), 60); } tell(); }
        if (st.pump >= 1) { st.pump = 0; st.pumped = false; tell(); }
      }
      st.pumpY = st.pump > 0 ? Math.sin(Math.PI * st.pump) * 0.1 : 0;
      prod.position.y = -st.pumpY;
      if (!st.pop) st.Tb += (T0 - st.Tb) * dt / 6;
      else {
        st.Tb += (T0 - st.Tb) * dt / 7;
        st.fog = Math.max(0, st.fog - dt / 9);
        const c = st.cork;
        if (c.y > -0.18 || c.vy > 0) { c.vy -= 9.8 * dt * 0.5; c.y += c.vy * dt * 0.5; c.x += c.vx * dt * 0.5; c.a += dt * 6; }
        if (c.y < -0.185 && c.vy < 0) { c.y = -0.185; c.vy = 0; c.vx = 0; }
      }
      cork.position.set(st.cork.x, CORK_Y + st.cork.y, 0); cork.rotation.z = st.cork.y < -0.18 ? Math.PI / 2 : st.cork.a;
      fogM.opacity = 0.95 * Math.min(1, st.fog * 1.3);
      for (let i = 0; i < NF; i++) { pF[i * 3 + 1] += PS.gauss() * 0.0004; }
      gF.attributes.position.needsUpdate = true;
      const sp = 0.05 * Math.sqrt(st.Tb / T0);
      for (let i = 0; i < N2; i++) {
        const m = M2[i];
        m.x += m.vx * sp * dt; m.y += m.vy * sp * dt; m.z += m.vz * sp * dt;
        const rmax = m.y < 0.11 ? 0.056 : Math.max(0.012, 0.056 - (m.y - 0.11) * 0.95), r = Math.hypot(m.x, m.z);
        if (r > rmax) { m.x *= rmax / r; m.z *= rmax / r; m.vx = -m.vx; m.vz = -m.vz; }
        if (m.y < 0.024) { m.y = 0.024; m.vy = Math.abs(m.vy); }
        const top = st.pop ? 0.25 : 0.18;
        if (m.y > top) { if (st.pop && m.y > 0.24) { const [x, y, z] = inBottle(); m.x = x; m.y = y; m.z = z; } else { m.y = top; m.vy = -Math.abs(m.vy); } }
        p2[i * 3] = m.x; p2[i * 3 + 1] = m.y; p2[i * 3 + 2] = m.z;
      }
      g2.attributes.position.needsUpdate = true;
      pm2.color.set(st.Tb < T0 ? 0x1c7ed6 : 0x4dabf7);
    }
    el._st = st;
    resetFire(true); resetCork(); setMode();
    loop.start();
  });
})();
