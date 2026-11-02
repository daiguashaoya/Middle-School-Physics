/* 第8章第3节：3D 自行车上的摩擦——点击部件，看看哪里增大了摩擦、哪里减小了摩擦；可以骑行和刹车。依赖 three.js、OrbitControls */
(function () {
  'use strict';
  const { h } = PS;
  const R = 0.33; // 车轮半径
  const PARTS = [
    { k: 'tire', n: '轮胎上的花纹', g: 0, use: '有益', how: '增大接触面的粗糙程度', why: '轮胎与地面之间的摩擦是有益的：自行车靠它前进、转弯和刹车。轮胎上凹凸不平的花纹增大了接触面的粗糙程度，雨天也不容易打滑。' },
    { k: 'grip', n: '车把套上的花纹', g: 0, use: '有益', how: '增大接触面的粗糙程度', why: '手与车把之间的摩擦是有益的，车把套用橡胶制成并刻有花纹，手握得更牢，不容易滑脱。' },
    { k: 'pedal', n: '脚踏板上的花纹', g: 0, use: '有益', how: '增大接触面的粗糙程度', why: '脚与脚踏板之间的摩擦是有益的，花纹使脚踩上去不容易打滑。' },
    { k: 'brake', n: '刹车（车闸）', g: 0, use: '有益', how: '增大压力', why: '刹车时用力捏闸，闸皮紧紧压在车圈上，压力越大，摩擦力越大，车停得越快。闸皮用橡胶制成，也增大了接触面的粗糙程度。' },
    { k: 'bearing', n: '车轴里的滚珠（轴承）', g: 1, use: '有害', how: '用滚动代替滑动', why: '车轴转动时的摩擦是有害的，会让骑车更费力。车轴里装了一圈钢珠（滚动轴承），用滚动代替滑动，大大减小了摩擦。' },
    { k: 'chain', n: '链条（加润滑油）', g: 1, use: '有害', how: '使接触面彼此分离', why: '链条与齿轮之间的摩擦是有害的。经常给链条加润滑油，油膜把相互接触的金属表面隔开，减小了摩擦，还能防锈。' },
  ];

  PS.register('bike-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { sel: null, ride: false, w: 0, spin: 0, crank: 0, brake: false, seen: {} };
    const view = h('div', { class: 'stage-3d', style: { background: '#e7f5ff' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '点击自行车上带编号的部件（或右边的按钮）；拖动画面可以换角度观察。')), side));
    const list = h('div', { class: 'fc-chips' });
    const info = h('div', { class: 'fc-msg', style: { minHeight: '7em' } });
    const prog = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    const rideB = PS.ui.button('🚲 骑起来', () => { st.ride = !st.ride; st.brake = false; rideB.innerHTML = st.ride ? '⏹ 停止蹬车' : '🚲 骑起来'; }, 'btn btn-primary btn-sm');
    const brakeB = PS.ui.button('✊ 捏闸刹车', () => { st.brake = true; st.ride = false; rideB.innerHTML = '🚲 骑起来'; pick('brake'); }, 'btn btn-accent btn-sm');
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择部件'), list, prog),
      h('div', { class: 'panel' }, h('h4', null, '② 它和摩擦有什么关系'), info),
      h('div', { class: 'panel' }, h('h4', null, '③ 骑一骑'), h('div', { class: 'row' }, rideB, brakeB), h('div', { class: 'small muted', style: { marginTop: '4px' } }, '刹车时注意看闸皮怎样压紧车圈。')),
      h('div', { class: 'panel' }, h('h4', null, '小结'), h('div', { class: 'small', html: '<b style="color:#e8590c">增大有益摩擦：</b>增大压力、增大接触面的粗糙程度。<br><b style="color:#1c7ed6">减小有害摩擦：</b>减小压力、减小接触面的粗糙程度、用滚动代替滑动、使接触面彼此分离。' })));
    PARTS.forEach((p, i) => { const b = PS.ui.button((i + 1) + ' ' + p.n, () => pick(p.k), 'btn btn-sm'); b.dataset.k = p.k; list.append(b); });

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe7f5ff);
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.02, 30);
    camera.position.set(0.8, 0.85, 1.65);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.48, 0);
    controls.enableDamping = true; controls.minDistance = 0.5; controls.maxDistance = 5; controls.maxPolarAngle = Math.PI * 0.495;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(1.5, 3, 2); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, e || {}));
    // 地面（随骑行移动的条纹）
    const gTex = (function () { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#ced4da'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#f8f9fa'; g.fillRect(0, 118, 120, 20); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t; })();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshLambertMaterial({ map: gTex })); ground.rotation.x = -Math.PI / 2; scene.add(ground);

    const pickables = [];
    const mats = {};
    const tag = (mesh, k) => { mesh.userData.part = k; pickables.push(mesh); (mats[k] = mats[k] || []).push(mesh.material); return mesh; };
    function tube(a, b, r, mat) {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 14), mat);
      m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return m;
    }
    const RH = [-0.52, R, 0], FH = [0.52, R, 0], BB = [-0.06, 0.3, 0], ST = [-0.17, 0.8, 0], HT = [0.4, 0.78, 0], HB = [0.44, 0.62, 0];
    const frameMat = Std(0x1c7ed6, { metalness: 0.3, roughness: 0.4 });
    const bike = new THREE.Group(); scene.add(bike);
    [[BB, ST], [ST, HT], [BB, HB], [HT, HB]].forEach(([a, b]) => bike.add(tube(a, b, 0.018, frameMat)));
    [-1, 1].forEach((s) => { bike.add(tube([BB[0], BB[1], s * 0.03], [RH[0], RH[1], s * 0.04], 0.011, frameMat)); bike.add(tube([ST[0], ST[1] - 0.02, s * 0.015], [RH[0], RH[1], s * 0.04], 0.01, frameMat)); bike.add(tube([HB[0], HB[1], s * 0.02], [FH[0], FH[1], s * 0.04], 0.011, frameMat)); });
    // 车座、车把
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.1), Std(0x212529)); seat.position.set(ST[0] - 0.03, ST[1] + 0.07, 0); bike.add(seat);
    bike.add(tube([ST[0], ST[1], 0], [ST[0] - 0.02, ST[1] + 0.05, 0], 0.012, Std(0xadb5bd, { metalness: 0.6 })));
    bike.add(tube(HT, [HT[0] - 0.03, HT[1] + 0.14, 0], 0.014, Std(0xadb5bd, { metalness: 0.6 })));
    const barY = HT[1] + 0.14, barX = HT[0] - 0.03;
    bike.add(tube([barX, barY, -0.26], [barX, barY, 0.26], 0.011, Std(0xadb5bd, { metalness: 0.6 })));
    const gripTex = (function () { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#343a40'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#868e96'; g.lineWidth = 3; for (let y = 4; y < 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 4); g.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); return t; })();
    [-1, 1].forEach((s) => { const g = tube([barX, barY, s * 0.17], [barX, barY, s * 0.27], 0.019, Std(0xffffff, { map: gripTex, roughness: 0.95 })); bike.add(tag(g, 'grip')); });
    // 刹车把手
    const levers = [-1, 1].map((s) => { const l = tube([barX + 0.01, barY, s * 0.16], [barX + 0.09, barY - 0.02, s * 0.25], 0.006, Std(0x868e96, { metalness: 0.6 })); bike.add(tag(l, 'brake')); return l; });
    // 车轮
    const tread = (function () { const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#2b2f33'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#5c636a'; for (let x = 0; x < 512; x += 16) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 8, 32); g.lineTo(x, 56); g.lineTo(x + 5, 56); g.lineTo(x + 13, 32); g.lineTo(x + 5, 8); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 1); return t; })();
    const wheels = [RH, FH].map((C) => {
      const g = new THREE.Group(); g.position.set(...C);
      const tire = new THREE.Mesh(new THREE.TorusGeometry(R - 0.02, 0.022, 14, 64), Std(0xffffff, { map: tread, roughness: 0.95 })); g.add(tag(tire, 'tire'));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.045, 0.008, 8, 64), Std(0xced4da, { metalness: 0.8, roughness: 0.3 })); g.add(rim);
      const sp = [];
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; sp.push(new THREE.Vector3(0, 0, i % 2 ? 0.025 : -0.025), new THREE.Vector3(Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05), 0)); }
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(sp), new THREE.LineBasicMaterial({ color: 0x868e96 })));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 16), Std(0xadb5bd, { metalness: 0.7 })); hub.rotation.x = Math.PI / 2; g.add(hub);
      // 轴承滚珠（露在外面画大一些，便于看到）
      const balls = new THREE.Group();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), Std(0xf1f3f5, { metalness: 0.9, roughness: 0.15 })); b.position.set(Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.045); balls.add(tag(b, 'bearing')); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 30), Std(0x868e96, { metalness: 0.7 })); ring.position.z = 0.045; balls.add(ring);
      g.add(balls); g.userData.balls = balls;
      bike.add(g); return g;
    });
    // 闸皮（车圈顶部两侧）
    const pads = [RH, FH].map((C) => [-1, 1].map((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.014, 0.012), Std(0x212529, { roughness: 0.95 })); p.position.set(C[0], C[1] + R - 0.045, s * 0.03); bike.add(tag(p, 'brake')); return p; }));
    [RH, FH].forEach((C) => bike.add(tube([C[0], C[1] + R - 0.03, -0.035], [C[0], C[1] + R - 0.03, 0.035], 0.005, Std(0x868e96, { metalness: 0.6 }))));
    // 牙盘、飞轮、链条
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.008, 8, 40), Std(0xadb5bd, { metalness: 0.8, roughness: 0.3 })); ring1.position.set(BB[0], BB[1], 0.05); bike.add(ring1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.006, 8, 24), Std(0xadb5bd, { metalness: 0.8, roughness: 0.3 })); ring2.position.set(RH[0], RH[1], 0.05); bike.add(ring2);
    (function () {
      const a = new THREE.Vector2(BB[0], BB[1]), b = new THREE.Vector2(RH[0], RH[1]), r1 = 0.1, r2 = 0.045;
      const pts = [];
      for (let i = 0; i <= 24; i++) { const t = -Math.PI / 2 + (i / 24) * Math.PI; pts.push(new THREE.Vector3(a.x + Math.cos(t) * r1, a.y + Math.sin(t) * r1, 0.05)); }
      for (let i = 0; i <= 16; i++) { const t = Math.PI / 2 + (i / 16) * Math.PI; pts.push(new THREE.Vector3(b.x + Math.cos(t) * r2, b.y + Math.sin(t) * r2, 0.05)); }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const chain = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.006, 6, true), Std(0x495057, { metalness: 0.7, roughness: 0.35 }));
      bike.add(tag(chain, 'chain'));
    })();
    // 曲柄和脚踏
    const crank = new THREE.Group(); crank.position.set(BB[0], BB[1], 0); bike.add(crank);
    const pedalTex = (function () { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#495057'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#adb5bd'; for (let x = 4; x < 64; x += 10) for (let y = 4; y < 64; y += 10) g.fillRect(x, y, 4, 4); return new THREE.CanvasTexture(c); })();
    const pedals = [-1, 1].map((s) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.012), Std(0xadb5bd, { metalness: 0.7 })); arm.position.set(0, s * 0.085, s * 0.07); crank.add(arm);
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.08), Std(0xffffff, { map: pedalTex })); p.userData.s = s; crank.add(tag(p, 'pedal'));
      return p;
    });

    // 标签
    const lab = (t) => { const e = h('div', { class: 'label3d', html: t }); view.append(e); return e; };
    const L = {};
    PARTS.forEach((p, i) => { L[p.k] = lab(String(i + 1)); L[p.k].style.cursor = 'pointer'; });
    const anchor = { tire: () => new THREE.Vector3(FH[0] + R * 0.7, FH[1] - R * 0.7, 0), grip: () => new THREE.Vector3(barX, barY + 0.03, 0.27), pedal: () => pedals[1].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.03, 0.04)), brake: () => new THREE.Vector3(FH[0], FH[1] + R + 0.02, 0), bearing: () => new THREE.Vector3(FH[0], FH[1] + 0.05, 0.05), chain: () => new THREE.Vector3((BB[0] + RH[0]) / 2, BB[1] + 0.12, 0.06) };
    const v3 = new THREE.Vector3();
    function place(e, p) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-100%)';
    }

    function pick(k) {
      st.sel = k; st.seen[k] = true;
      const p = PARTS.find((x) => x.k === k);
      list.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === k));
      PARTS.forEach((q) => { L[q.k].style.background = q.k === k ? (q.g ? '#1c7ed6' : '#e8590c') : ''; L[q.k].style.color = q.k === k ? '#fff' : ''; });
      Object.keys(mats).forEach((kk) => mats[kk].forEach((m) => { if (m.emissive) m.emissive.setHex(kk === k ? (p.g ? 0x0b3a75 : 0x6b2a00) : 0x000000); }));
      info.className = 'fc-msg ' + (p.g ? 'info' : 'ok');
      info.innerHTML = '<b>' + p.n + '</b>　<span class="badge ' + (p.g ? 't' : 'o') + '">' + (p.g ? '减小摩擦' : '增大摩擦') + '</span> <span class="badge g">' + p.use + '摩擦</span><br>方法：<b>' + p.how + '</b>。<br>' + p.why;
      const n = Object.keys(st.seen).length;
      prog.innerHTML = '已认识 ' + n + ' / ' + PARTS.length + ' 个部件' + (n === PARTS.length ? ' 🎉' : '');
      PS.sound.tick();
    }
    // 点击选择
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), cv = renderer.domElement;
    let down = null;
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null;
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      if (hit) pick(hit.object.userData.part);
    });
    PARTS.forEach((p) => { L[p.k].style.pointerEvents = 'auto'; L[p.k].addEventListener('click', () => pick(p.k)); });

    const loop = PS.loop((dt, t) => {
      // 骑行：轮子角速度逐渐增大；刹车：闸皮压紧车圈，角速度迅速减小
      if (st.ride) st.w += (9 - st.w) * Math.min(1, dt * 1.5);
      else if (st.brake) { st.w = Math.max(0, st.w - 22 * dt); if (st.w === 0) st.brake = false; }
      else st.w = Math.max(0, st.w - 0.6 * dt);
      st.spin -= st.w * dt; st.crank -= st.w * 0.42 * dt;
      wheels.forEach((w) => { w.rotation.z = st.spin; });
      crank.rotation.z = st.crank;
      // 脚踏在曲柄末端，反向转动保持水平
      pedals.forEach((p) => { p.position.set(0, p.userData.s * 0.17, p.userData.s * 0.11); p.rotation.z = -st.crank; });
      gTex.offset.x += (st.w * R * dt) / 2;
      const squeeze = st.brake ? 1 : 0;
      pads.forEach((pp) => pp.forEach((p, i) => { p.position.z = (i ? 1 : -1) * (0.03 - 0.012 * squeeze); }));
      levers.forEach((l) => { l.scale.y = 1 - 0.15 * squeeze; });
      const pulse = 1 + 0.25 * Math.sin(t * 6);
      wheels.forEach((w) => w.userData.balls.scale.setScalar(st.sel === 'bearing' ? 1.6 * pulse : 1));
      controls.update();
      renderer.render(scene, camera);
      PARTS.forEach((p) => place(L[p.k], anchor[p.k]()));
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    info.innerHTML = '自行车上有很多地方与摩擦有关：有的地方需要<b>增大</b>摩擦，有的地方需要<b>减小</b>摩擦。点一个部件看看。';
    prog.innerHTML = '已认识 0 / ' + PARTS.length + ' 个部件';
    loop.start();
  });
})();
