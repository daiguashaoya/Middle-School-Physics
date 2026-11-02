/* 第6章第2节：3D 密度方块——质量都是 1 kg 时比体积，体积都是 1 L 时比质量；可以加上“1 kg 空气”对比。依赖 three.js、OrbitControls、mass.js */
(function () {
  'use strict';
  const { h } = PS;
  const LIST = [
    { n: '金', rho: 19.3, c: 0xf2c230, metal: 0.6 },
    { n: '铅', rho: 11.3, c: 0x7b8494, metal: 0.5 },
    { n: '铜', rho: 8.9, c: 0xd9895a, metal: 0.55 },
    { n: '铁', rho: 7.9, c: 0x9aa3ae, metal: 0.5 },
    { n: '铝', rho: 2.7, c: 0xd5dbe2, metal: 0.45 },
    { n: '水', rho: 1.0, c: 0x74c0fc, water: true },
    { n: '冰', rho: 0.9, c: 0xd0ebff, ice: true },
    { n: '干松木', rho: 0.5, c: 0xd9a95f, wood: true },
  ];
  const fmt = (x, d) => PS.fmt(x, d == null ? 1 : d);

  PS.register('density-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { mode: 'mass', air: false, sel: null, labels: true };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7' } });
    const mSeg = PS.ui.seg([{ value: 'mass', label: '质量都是 1 kg' }, { value: 'vol', label: '体积都是 1 L（1 dm³）' }], st.mode, (v) => { st.mode = v; upd(); });
    const airT = PS.ui.toggle('加上 1 kg 空气', false, (v) => { st.air = v; camGoal = v ? 'air' : 'all'; upd(); });
    const labT = PS.ui.toggle('数值标签', true, (v) => { st.labels = v; });
    const msg = h('div', { class: 'ms-msg' });
    el.append(PS.ui.row(mSeg.el, airT.el, labT.el), view, msg);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.01, 30);
    const CAMS = { all: [[0.0, 0.4, 1.2], [0, 0.06, 0]], air: [[0.9, 1.1, 2.5], [0.1, 0.25, -0.5]] };
    camera.position.set(...CAMS.all[0]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMS.all[1]);
    controls.enableDamping = true; controls.minDistance = 0.25; controls.maxDistance = 5; controls.maxPolarAngle = Math.PI * 0.49;
    let camGoal = null;
    controls.addEventListener('start', () => { camGoal = null; });
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.65); dl.position.set(0.5, 1.2, 0.8); scene.add(dl);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.02, 3), new THREE.MeshLambertMaterial({ color: 0xc9b089 }));
    floor.position.set(0, -0.01, -0.4); scene.add(floor);
    // 木纹贴图
    const woodTex = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#d9a95f'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(130,80,30,.45)'; g.lineWidth = 2;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 8 + i * 14); g.bezierCurveTo(40, 2 + i * 14, 80, 16 + i * 14, 128, 8 + i * 14); g.stroke(); }
      return new THREE.CanvasTexture(c);
    })();
    const SP = 0.17;
    const items = LIST.map((it, i) => {
      const g = new THREE.Group();
      g.position.set((i - (LIST.length - 1) / 2) * SP, 0, 0);
      scene.add(g);
      // 底座（小秤台）
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.15), new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.5 }));
      plate.position.y = 0.006; g.add(plate);
      let mat;
      if (it.water) mat = new THREE.MeshStandardMaterial({ color: it.c, transparent: true, opacity: 0.55, roughness: 0.1 });
      else if (it.ice) mat = new THREE.MeshStandardMaterial({ color: it.c, transparent: true, opacity: 0.75, roughness: 0.15 });
      else if (it.wood) mat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
      else mat = new THREE.MeshStandardMaterial({ color: it.c, metalness: it.metal * 0.45, roughness: 0.35 });
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
      cube.userData.i = i; g.add(cube);
      let glass = null;
      if (it.water) { glass = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x4dabf7 })); g.add(glass); }
      const lbl = h('div', { class: 'label3d' });
      view.append(lbl);
      return { it, g, cube, glass, lbl, s: 0.1 };
    });
    // 1 kg 空气
    const airSide = Math.cbrt(1 / 1.29);
    const air = new THREE.Group(); air.position.set(0.1, airSide / 2 + 0.001, -0.75); scene.add(air);
    const airBox = new THREE.Mesh(new THREE.BoxGeometry(airSide, airSide, airSide), new THREE.MeshStandardMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.16, depthWrite: false }));
    air.add(airBox, new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(airSide, airSide, airSide)), new THREE.LineBasicMaterial({ color: 0x339af0 })));
    const airLbl = h('div', { class: 'label3d' }, '1 kg 空气：体积约 0.78 m³（棱长约 92 cm）');
    view.append(airLbl);
    air.visible = false;

    function side(it) { return st.mode === 'mass' ? Math.cbrt(1000 / it.rho) / 100 : 0.1; }
    function upd() {
      air.visible = st.air;
      const k = st.sel;
      if (k != null) {
        const it = LIST[k], V = 1000 / it.rho;
        msg.className = 'ms-msg info';
        msg.innerHTML = '🔎 <b>' + it.n + '</b>：ρ = ' + (it.rho === 1 ? '1.0' : it.rho) + '×10³ kg/m³。<b>1 kg</b> ' + it.n + '的体积 V = m/ρ = ' + fmt(V, 0) + ' cm³（棱长 ' + fmt(Math.cbrt(V), 1) + ' cm）；<b>1 L</b> ' + it.n + '的质量 m = ρV = ' + it.rho + ' kg。';
      } else if (st.mode === 'mass') {
        msg.className = 'ms-msg';
        msg.innerHTML = '每个方块的质量都是 <b>1 kg</b>。<b>质量相同时，密度越大，体积越小</b>（体积与密度成反比）。1 kg 的金只有乒乓球那么大，1 kg 的干松木却是棱长约 12.6 cm 的大方块。' + (st.air ? '<br>1 kg 空气的体积约 0.78 m³，要装进一个棱长约 92 cm 的大箱子！' : '') + '<span class="muted">（点击方块看计算）</span>';
      } else {
        msg.className = 'ms-msg';
        msg.innerHTML = '每个方块的体积都是 <b>1 L = 1 dm³</b>（棱长 10 cm）。<b>体积相同时，密度越大，质量越大</b>（质量与密度成正比）。1 L 水的质量是 1 kg。' + (st.air ? '<br>1 L 空气的质量只有约 1.29 g。' : '') + '<span class="muted">（点击方块看计算）</span>';
      }
      items.forEach((o, i) => { o.cube.material.emissive && o.cube.material.emissive.setHex(i === k ? 0x223377 : 0x000000); });
    }
    // 点击
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
    const cv = renderer.domElement;
    let down = null;
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null;
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(items.map((o) => o.cube), false)[0];
      st.sel = hit ? hit.object.userData.i : null;
      if (hit) PS.sound.tick();
      upd();
    });
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      if (camGoal) {
        const [p, t] = CAMS[camGoal], k = Math.min(1, dt * 3);
        camera.position.lerp(v3.set(...p), k); controls.target.lerp(new THREE.Vector3(...t), k);
        if (camera.position.distanceTo(v3.set(...p)) < 0.003) camGoal = null;
      }
      items.forEach((o) => {
        o.s += (side(o.it) - o.s) * Math.min(1, dt * 4);
        o.cube.scale.setScalar(o.s); o.cube.position.y = 0.012 + o.s / 2;
        if (o.glass) { o.glass.scale.setScalar(o.s * 1.01); o.glass.position.y = o.cube.position.y; }
      });
      controls.update();
      renderer.render(scene, camera);
      const W = view.clientWidth, H = view.clientHeight;
      items.forEach((o, i) => {
        const e = o.lbl;
        const show = st.labels || st.sel === i;
        if (!show) { e.style.display = 'none'; return; }
        v3.set(o.g.position.x, 0.025 + o.s + 0.03, 0).project(camera);
        e.style.display = v3.z < 1 ? '' : 'none';
        const val = st.mode === 'mass' ? fmt(1000 / o.it.rho, 0) + ' cm³' : o.it.rho + ' kg';
        e.innerHTML = o.it.n + '<small>' + val + '</small>';
        e.className = 'label3d' + (st.sel === i ? ' ref' : '');
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W) + 'px,' + ((-v3.y * 0.5 + 0.5) * H) + 'px) translate(-50%,-100%)';
      });
      if (st.air) {
        v3.set(air.position.x, airSide + 0.06, air.position.z).project(camera);
        airLbl.style.display = v3.z < 1 ? '' : 'none';
        airLbl.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W) + 'px,' + ((-v3.y * 0.5 + 0.5) * H) + 'px) translate(-50%,-100%)';
      } else airLbl.style.display = 'none';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      // 窄屏时离远一点，保证 8 个方块都在画面里
      const far = hh / w > 0.7 ? 1.5 : 1;
      CAMS.all[0] = [0, 0.4 * far, 1.2 * far];
      if (!camGoal && !st.air && !resize.done) { camera.position.set(...CAMS.all[0]); resize.done = true; }
    }
    new ResizeObserver(resize).observe(view);
    resize();
    if (el.clientWidth && el.clientWidth < 560) { st.labels = false; labT.set(false); }
    upd();
    loop.start();
  });
})();
