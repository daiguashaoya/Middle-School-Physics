/* 第4章第4节：3D 水中的筷子和硬币——从任意角度观察，水下部分按光的折射实时计算看到的位置（虚像）：筷子“折断”、池底变浅、加水后硬币“重现”。依赖 three.js、OrbitControls、optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const NW = 1.33;
  const BR = 0.16, BH = 0.12, FLOOR = 0.012; // 碗的半径、高度、碗底

  PS.register('refract-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { level: 0.8, ghost: false, view: 'side', labels: true };
    const view = h('div', { class: 'stage-3d', style: { background: '#e3e8ef' } });
    const obs = h('div', { class: 'r3-obs' });
    const lS = PS.ui.slider({ label: '碗里的水', min: 0, max: 1, step: 0.01, value: st.level, fmt: (v) => Math.round(v * 100) + '%', onInput: (v) => { st.level = v; say(); } });
    lS.el.classList.add('wide');
    const vSeg = PS.ui.seg([{ value: 'side', label: '斜着看' }, { value: 'top', label: '从正上方看' }, { value: 'low', label: '压低视线（看硬币）' }], st.view, (v) => { st.view = v; camAnim = 1; say(); });
    const gT = PS.ui.toggle('显示筷子和硬币的实际位置', false, (v) => { st.ghost = v; say(); });
    el.append(view, PS.ui.row(lS.el), PS.ui.row(vSeg.el, gT.el), obs);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe3e8ef);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.01, 10);
    const VIEWS = {
      side: [new THREE.Vector3(0.07, 0.29, 0.5), new THREE.Vector3(0, 0.06, -0.03)],
      top: [new THREE.Vector3(0.02, 0.62, 0.03), new THREE.Vector3(0, 0.04, 0)],
      low: [new THREE.Vector3(0.56, 0.37, 0.0), new THREE.Vector3(0, 0.04, 0)], // 视线恰好擦过碗口：没有水时看不到碗底中央的硬币
    };
    camera.position.copy(VIEWS.side[0]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(VIEWS.side[1]);
    controls.enableDamping = true; controls.minDistance = 0.32; controls.maxDistance = 1.5; controls.maxPolarAngle = 1.42;
    let camAnim = 0;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8d8576, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.55); dl.position.set(0.4, 1.2, 0.6); scene.add(dl);
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 1.2), new THREE.MeshLambertMaterial({ color: 0xb08968 }));
    table.position.y = -0.015; scene.add(table);
    // 碗（不透明的瓷碗）：外壁和碗口；内壁、碗底单独建（网格细分，水下部分也要按折射变形）
    const prof = [new THREE.Vector2(0.0001, 0), new THREE.Vector2(BR - 0.02, 0), new THREE.Vector2(BR - 0.005, 0.01), new THREE.Vector2(BR + 0.008, BH), new THREE.Vector2(BR, BH + 0.004), new THREE.Vector2(BR - 0.006, BH)];
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshLambertMaterial({ color: 0xf1f3f5, side: THREE.DoubleSide }));
    scene.add(bowl);
    const rimBand = new THREE.Mesh(new THREE.TorusGeometry(BR + 0.004, 0.0035, 8, 64), new THREE.MeshLambertMaterial({ color: 0x4dabf7 }));
    rimBand.rotation.x = Math.PI / 2; rimBand.position.y = BH - 0.012; scene.add(rimBand);
    // 碗底的花纹（帮助看出“变浅”）
    const pat = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f1f3f5'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#74c0fc'; g.lineWidth = 6; for (let r = 30; r < 128; r += 30) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); } return new THREE.CanvasTexture(c); })();
    const floorDisk = new THREE.Mesh(new THREE.RingGeometry(0.0005, BR - 0.014, 64, 24), new THREE.MeshLambertMaterial({ map: pat })); // 细分网格：变形后仍贴合
    floorDisk.rotation.x = -Math.PI / 2; floorDisk.position.y = FLOOR + 0.0004; floorDisk.userData.under = true; scene.add(floorDisk);

    // 需要按折射变换的物体：保存每个顶点的实际（世界）坐标
    const morph = [];
    function addMorph(geo, matrix, mat, noGhost) {
      geo.applyMatrix4(matrix);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      const base = Float32Array.from(geo.attributes.position.array);
      scene.add(mesh);
      let ghost = null;
      if (!noGhost) { ghost = new THREE.Mesh(geo.clone(), new THREE.MeshBasicMaterial({ color: 0x7048e8, wireframe: true, transparent: true, opacity: 0.55, depthTest: false })); ghost.renderOrder = 10; ghost.visible = false; scene.add(ghost); }
      morph.push({ mesh, base, ghost });
      return mesh;
    }
    // 碗的内壁
    addMorph(new THREE.CylinderGeometry(BR - 0.006, BR - 0.014, BH - FLOOR, 64, 30, true), new THREE.Matrix4().makeTranslation(0, (BH + FLOOR) / 2, 0), new THREE.MeshLambertMaterial({ color: 0xf1f3f5, side: THREE.DoubleSide }), true);
    // 筷子：斜插在碗里
    const P0 = new THREE.Vector3(-0.1, FLOOR + 0.004, -0.06), P1 = new THREE.Vector3(0.14, 0.27, -0.015);
    const len = P0.distanceTo(P1);
    const m4 = new THREE.Matrix4().compose(P0.clone().lerp(P1, 0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), P1.clone().sub(P0).normalize()), new THREE.Vector3(1, 1, 1));
    addMorph(new THREE.CylinderGeometry(0.0045, 0.0032, len, 14, 90), m4, new THREE.MeshLambertMaterial({ color: 0xc9a46b }));
    // 硬币：在碗底中央
    const coinTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(50, 50, 10, 64, 64, 64); gr.addColorStop(0, '#ffe8a1'); gr.addColorStop(1, '#d4a017'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 63, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#b8860b'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#b8860b'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', 64, 66); return new THREE.CanvasTexture(c); })();
    const cm = new THREE.Matrix4().makeTranslation(0.0, FLOOR + 0.0016, 0.0);
    addMorph(new THREE.CylinderGeometry(0.0125, 0.0125, 0.0024, 32, 1), cm, [new THREE.MeshLambertMaterial({ color: 0xd4a017 }), new THREE.MeshLambertMaterial({ map: coinTex }), new THREE.MeshLambertMaterial({ color: 0xd4a017 })]);
    // 碗底花纹也随折射“升高”
    {
      const g = floorDisk.geometry.clone();
      floorDisk.updateMatrixWorld(); g.applyMatrix4(floorDisk.matrixWorld);
      scene.remove(floorDisk);
      const mesh = new THREE.Mesh(g, floorDisk.material); mesh.frustumCulled = false; scene.add(mesh);
      morph.push({ mesh, base: Float32Array.from(g.attributes.position.array), ghost: null });
    }
    // 水
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x74c0fc, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 1, true), waterMat); water.renderOrder = 4; scene.add(water);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.32, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }));
    surf.rotation.x = -Math.PI / 2; surf.renderOrder = 5; scene.add(surf);
    const lbl = h('div', { class: 'label3d' }, '水面'); view.append(lbl);

    const L = () => FLOOR + st.level * (BH - FLOOR - 0.012);
    const innerR = (y) => BR - 0.014 + ((y - FLOOR) / (BH - FLOOR)) * 0.02;
    // 水下一点 P（世界坐标）在摄像机 C 看来的位置：先求水面上的折射点 Q，再沿视线 C→Q 延长
    const out = new THREE.Vector3();
    function apparent(px, py, pz, C, lv) {
      const d = lv - py, Hc = C.y - lv;
      if (d <= 0 || Hc < 0.003) return out.set(px, py, pz);
      const dx = C.x - px, dz = C.z - pz, D = Math.hypot(dx, dz);
      let x;
      if (D < 1e-6) x = 0;
      else {
        let lo = 0, hi = D;
        for (let k = 0; k < 28; k++) { const m = (lo + hi) / 2; const f = (NW * m) / Math.hypot(m, d) - (D - m) / Math.hypot(D - m, Hc); if (f > 0) hi = m; else lo = m; }
        x = (lo + hi) / 2;
      }
      const qx = D < 1e-6 ? px : px + (dx / D) * x, qz = D < 1e-6 ? pz : pz + (dz / D) * x;
      const vx = qx - C.x, vy = lv - C.y, vz = qz - C.z, vl = Math.hypot(vx, vy, vz);
      const s = Math.hypot(x, d) / NW; // 沿视线再延长一段（只影响前后遮挡，不影响看到的位置）
      return out.set(qx + (vx / vl) * s, lv + (vy / vl) * s, qz + (vz / vl) * s);
    }
    function deform() {
      const lv = L(), C = camera.position, wet = st.level > 0.01;
      morph.forEach((m) => {
        const pos = m.mesh.geometry.attributes.position, a = pos.array, b = m.base;
        for (let i = 0; i < a.length; i += 3) {
          if (wet && b[i + 1] < lv) { apparent(b[i], b[i + 1], b[i + 2], C, lv); a[i] = out.x; a[i + 1] = out.y; a[i + 2] = out.z; }
          else { a[i] = b[i]; a[i + 1] = b[i + 1]; a[i + 2] = b[i + 2]; }
        }
        pos.needsUpdate = true;
        if (m.ghost) m.ghost.visible = st.ghost && wet;
      });
    }
    function coinHidden() {
      // 实际光线：从硬币中心到眼睛（无水时为直线；有水时先在水中、后在空气中），检查是否被碗口挡住
      const C = camera.position, lv = L(), wet = st.level > 0.01;
      const P = new THREE.Vector3(0, FLOOR + 0.003, 0);
      let A = P.clone();
      if (wet) A = apparent(P.x, P.y, P.z, C, lv).clone();
      // 视线 C→A 与碗口的关系：在水面以上的部分，到碗中心轴的水平距离小于碗口半径时才能进入碗内
      const dir = A.clone().sub(C);
      const t = (BH + 0.004 - C.y) / dir.y; // 视线到达碗口高度的位置
      if (C.y <= BH + 0.004) return false;
      const q = C.clone().addScaledVector(dir, t);
      return Math.hypot(q.x, q.z) > BR - 0.002;
    }
    function say() {
      const hid = coinHidden(), wet = st.level > 0.01;
      let t;
      if (st.view === 'low') t = hid ? '压低视线，恰好看不到碗底的硬币：碗边挡住了硬币射向眼睛的光（光沿直线传播）。' + (wet ? '水还不够多，再加一些水。' : '往碗里<b>加水</b>试试！') : wet ? '加水后，硬币又“出现”了！硬币反射的光从水中斜射入空气时发生<b>折射</b>，折射光进入了眼睛，我们看到的是硬币<b>变高了的虚像</b>。' : '还能看到硬币。用鼠标（手指）把视线再压低一点，直到恰好看不见硬币，再加水。';
      else if (!wet) t = '碗里没有水，筷子是直的。拖动滑块往碗里<b>加水</b>，看看筷子会怎样。';
      else t = '筷子在水面处好像“<b>折断</b>”了，水中的部分好像向<b>上</b>弯折——我们看到的是水中部分的<b>虚像</b>，它比实际位置<b>浅</b>。转动视角，看看从不同方向看，弯折的程度一样吗？' + (st.view === 'top' ? '<br>从正上方看，碗底的花纹和硬币也显得离水面更近：池水看起来变<b>浅</b>了。' : '');
      if (st.ghost && wet) t += '<br><span class="small">紫色线框是筷子和硬币的<b>实际位置</b>。</span>';
      obs.innerHTML = '👀 ' + t;
    }
    let lastHid = null;
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      if (camAnim > 0) {
        camAnim = Math.max(0, camAnim - dt * 0.8);
        camera.position.lerp(VIEWS[st.view][0], 0.1); controls.target.lerp(VIEWS[st.view][1], 0.1);
      }
      controls.update();
      const lv = L(), wet = st.level > 0.01;
      const r = innerR(lv);
      water.visible = surf.visible = wet;
      water.scale.set(innerR((lv + FLOOR) / 2) + 0.002, Math.max(0.001, lv - FLOOR), innerR((lv + FLOOR) / 2) + 0.002); water.position.y = (lv + FLOOR) / 2;
      surf.scale.set(r, r, 1); surf.position.y = lv;
      deform();
      renderer.render(scene, camera);
      const hid = coinHidden();
      if (hid !== lastHid) { lastHid = hid; say(); }
      v3.set(-r * 0.7, lv, r * 0.7).project(camera);
      lbl.style.display = wet && st.labels ? '' : 'none';
      lbl.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-100%)';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    if (!document.getElementById('r3-style')) document.head.append(h('style', { id: 'r3-style' }, '.r3-obs{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.92rem;min-height:2.6em}'));
    say();
    loop.start();
  });
})();
