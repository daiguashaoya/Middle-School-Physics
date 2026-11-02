/* 第4章第3节：探究平面镜成像的特点（3D 实验）——薄 / 厚玻璃板、平面镜、玻璃板倾斜；拖动蜡烛 B 与像重合（等效替代法）、光屏检验虚像、记录与分析。依赖 three.js、OrbitControls、optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const DEG = Math.PI / 180;
  const CH = 0.08, CR = 0.009; // 蜡烛高 8 cm、半径
  const GW = 0.36, GH = 0.24;  // 玻璃板宽、高

  function canvasTex(w, hh, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    draw(c.getContext('2d'), w, hh);
    return new THREE.CanvasTexture(c);
  }

  PS.register('mirror-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { plate: 'thin', tilt: false, d: 0.1, B: new THREE.Vector3(0.06, 0, -0.16), screen: false, labels: true, rows: [], did: { thick: false, tilt: false, mirror: false, screen: false } };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const view = h('div', { class: 'stage-3d', style: { background: '#d9dee6' } });
    left.append(view);
    const obs = h('div', { class: 'r3-obs' });
    left.append(obs);

    /* ---------- 控件 ---------- */
    const pSeg = PS.ui.seg([{ value: 'thin', label: '薄玻璃板' }, { value: 'thick', label: '厚玻璃板' }, { value: 'mirror', label: '平面镜' }], st.plate, (v) => { st.plate = v; st.did[v] = true; build(); update(); });
    const tiltT = PS.ui.toggle('玻璃板没有竖直放置（倾斜）', false, (v) => { st.tilt = v; if (v) st.did.tilt = true; build(); update(); });
    const uS = PS.ui.slider({ label: '蜡烛 A 到玻璃板', min: 4, max: 15, step: 0.5, value: 10, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.d = v / 100; update(); } });
    const scrBtn = PS.ui.button('⬜ 拿走蜡烛 B，在像的位置放光屏', () => {
      st.screen = !st.screen; if (st.screen) st.did.screen = true;
      scrBtn.innerHTML = st.screen ? '↩ 拿走光屏，放回蜡烛 B' : '⬜ 拿走蜡烛 B，在像的位置放光屏';
      update();
    }, 'btn btn-sm');
    const backBtn = PS.ui.button('👁 绕到光屏一侧直接看光屏', () => { camGoal = camGoal === 'back' ? 'front' : 'back'; backBtn.innerHTML = camGoal === 'back' ? '👁 回到蜡烛 A 一侧（透过玻璃板看）' : '👁 绕到光屏一侧直接看光屏'; camAnim = 1; }, 'btn btn-sm');
    const labT = PS.ui.toggle('器材名称', true, (v) => { st.labels = v; });
    const rU = PS.ui.readout('A 到玻璃板', '—', 'accent'), rV = PS.ui.readout('B 到玻璃板', '—', 'primary'), rC = PS.ui.readout('B 与像', '—');
    const tbody = h('tbody'), analysis = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择器材'), h('div', { class: 'row' }, pSeg.el), h('div', { class: 'row' }, tiltT.el)),
      h('div', { class: 'panel' }, h('h4', null, '② 点燃蜡烛 A，移动蜡烛 B'), h('div', { class: 'row' }, uS.el), h('p', { class: 'small muted', style: { margin: '4px 0' }, html: '在 3D 画面中<b>拖动玻璃板后面的蜡烛 B</b>，直到从前面看去它与 A 的像完全重合。' }), h('div', { class: 'row' }, scrBtn), h('div', { class: 'row' }, backBtn), h('div', { class: 'row' }, labT.el)),
      h('div', { class: 'panel' }, h('h4', null, '③ 测量（白纸上每小格 1 cm）'), h('div', { class: 'readouts', style: { marginTop: 0 } }, rU.el, rV.el, rC.el), h('div', { class: 'row' }, PS.ui.button('📝 记录这一组', record, 'btn btn-primary btn-sm'), PS.ui.button('清空', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, '④ 数据记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次数'), h('th', null, '物距/cm'), h('th', null, '像距/cm'), h('th', null, '像与物的大小'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis));

    /* ---------- 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd9dee6);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.01, 10);
    const CAM_F = new THREE.Vector3(0.05, 0.19, 0.4), TGT_F = new THREE.Vector3(0, 0.05, -0.07);
    const CAM_B = new THREE.Vector3(-0.12, 0.2, -0.5), TGT_B = new THREE.Vector3(0, 0.04, -0.1);
    camera.position.copy(CAM_F);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(TGT_F);
    controls.enableDamping = true; controls.minDistance = 0.18; controls.maxDistance = 1.4; controls.maxPolarAngle = Math.PI * 0.47;
    let camGoal = 'front', camAnim = 0;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94a3, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.45); dl.position.set(0.5, 1.2, 0.8); scene.add(dl);
    const tableM = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.9), new THREE.MeshLambertMaterial({ color: 0x8d6e4c }));
    tableM.position.y = -0.016; scene.add(tableM);
    // 坐标纸（每小格 1 cm），中间一条线表示玻璃板的位置
    const paperTex = canvasTex(1000, 800, (g, w, hh) => {
      g.fillStyle = '#fdfdfb'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i <= 50; i++) { const x = i * 20; g.strokeStyle = i % 5 ? '#d3e4f5' : '#9cc3ea'; g.lineWidth = i % 5 ? 1 : 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); }
      for (let j = 0; j <= 40; j++) { const y = j * 20; g.strokeStyle = j % 5 ? '#d3e4f5' : '#9cc3ea'; g.lineWidth = j % 5 ? 1 : 2; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = '#3b5bdb'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 400); g.lineTo(w, 400); g.stroke();
    });
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshLambertMaterial({ map: paperTex }));
    paper.rotation.x = -Math.PI / 2; paper.position.y = 0.0005; scene.add(paper);
    // 火焰贴图
    const flameTex = canvasTex(64, 128, (g, w, hh) => {
      const gr = g.createRadialGradient(w / 2, hh * 0.7, 2, w / 2, hh * 0.62, w * 0.55);
      gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.35, 'rgba(255,214,90,.95)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(w / 2, 4); g.bezierCurveTo(w * 0.95, hh * 0.5, w * 0.92, hh * 0.96, w / 2, hh - 3); g.bezierCurveTo(w * 0.08, hh * 0.96, w * 0.05, hh * 0.5, w / 2, 4); g.fill();
    });
    const flameMat = (op) => new THREE.SpriteMaterial({ map: flameTex, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
    function candle(color, opacity) {
      const g = new THREE.Group();
      const mat = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity >= 1 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 20), mat); body.position.y = CH / 2; g.add(body);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.008, 6), new THREE.MeshLambertMaterial({ color: 0x343a40, transparent: opacity < 1, opacity })); wick.position.y = CH + 0.004; g.add(wick);
      g.mat = mat;
      return g;
    }
    const A = candle(0xf1e6d0, 1); scene.add(A);
    const flameA = new THREE.Sprite(flameMat(1)); flameA.scale.set(0.016, 0.03, 1); scene.add(flameA);
    const glowA = new THREE.PointLight(0xffc870, 0.4, 0.4); scene.add(glowA);
    const B = candle(0xf1e6d0, 1); scene.add(B);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, CH + 0.04, 12), new THREE.MeshBasicMaterial({ visible: false })); // 放大的抓取范围（不显示）
    grip.position.y = (CH + 0.04) / 2; B.add(grip);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.003), new THREE.MeshLambertMaterial({ color: 0xffffff })); scene.add(screen);
    // 玻璃板（或平面镜）+ 支架
    let plate = null, plateBack = null;
    const holder = new THREE.Group(); scene.add(holder);
    [-GW / 2 + 0.02, GW / 2 - 0.02].forEach((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.04), new THREE.MeshLambertMaterial({ color: 0x495057 })); m.position.set(x, 0.006, 0); holder.add(m); });
    // 像（一或两个）：按镜面反射矩阵摆放
    const images = [];
    function mkImage(op) {
      const g = candle(0xf1e6d0, op);
      g.matrixAutoUpdate = false; scene.add(g);
      const f = new THREE.Sprite(flameMat(Math.min(1, op * 1.6))); f.scale.set(0.016, 0.03, 1); scene.add(f);
      return { g, f, op };
    }
    function thick() { return st.plate === 'thick' ? 0.012 : 0.003; }
    function normal() { const a = st.tilt ? 12 * DEG : 0; return new THREE.Vector3(0, -Math.sin(a), Math.cos(a)); } // 玻璃板的法线（指向蜡烛 A 一侧）
    function build() {
      if (plate) { scene.remove(plate); plate.geometry.dispose(); }
      const t = thick(), mir = st.plate === 'mirror';
      plate = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, t), mir
        ? new THREE.MeshStandardMaterial({ color: 0xe3ebf3, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false })
        : new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: st.plate === 'thick' ? 0.32 : 0.2, roughness: 0.05, depthWrite: false }));
      plate.renderOrder = 5;
      const a = st.tilt ? 12 * DEG : 0;
      // 板的底边在 z = 0、y = 0 处，倾斜时顶端向观察者一侧（+z）倾斜
      plate.position.set(0, (GH / 2) * Math.cos(a), (GH / 2) * Math.sin(a));
      plate.rotation.x = a;
      scene.add(plate);
      if (plateBack) scene.remove(plateBack);
      plateBack = null;
      if (mir) { plateBack = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(GW, GH, t)), new THREE.LineBasicMaterial({ color: 0x495057 })); plateBack.position.copy(plate.position); plateBack.rotation.x = a; scene.add(plateBack); } // 镜框
      images.forEach((im) => { scene.remove(im.g); scene.remove(im.f); });
      images.length = 0;
      images.push(mkImage(mir ? 0.95 : 0.42));
      if (st.plate === 'thick') images.push(mkImage(0.26));
    }
    // 关于平面 n·x = c 的反射矩阵
    function reflM(n, c) {
      const m = new THREE.Matrix4();
      m.set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * c * n.x,
        -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * c * n.y,
        -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 2 * c * n.z,
        0, 0, 0, 1);
      return m;
    }
    const imgPos = [];
    let coincide = -1;
    function update() {
      const n = normal(), t = thick(), az = st.d + t / 2; // 蜡烛 A 到前表面（反射面）的距离为 d
      A.position.set(0, 0, az);
      A.updateMatrix();
      flameA.position.set(0, CH + 0.018, az);
      glowA.position.copy(flameA.position);
      imgPos.length = 0;
      images.forEach((im, k) => {
        const c = k === 0 ? t / 2 : -t / 2; // 前表面、后表面
        const M = reflM(n, c);
        im.g.matrix.copy(M).multiply(A.matrix);
        im.g.matrixWorldNeedsUpdate = true;
        im.f.position.copy(flameA.position).applyMatrix4(M);
        imgPos.push(new THREE.Vector3(0, 0, az).applyMatrix4(M));
      });
      // B 与像是否重合
      coincide = -1;
      imgPos.forEach((p, k) => { if (Math.abs(p.y) < 0.004 && Math.hypot(st.B.x - p.x, st.B.z - p.z) < 0.008) { coincide = k; st.B.x = p.x; st.B.z = p.z; } });
      B.position.copy(st.B);
      B.visible = !st.screen && st.plate !== 'mirror';
      screen.visible = st.screen;
      screen.position.set(imgPos[0].x, 0.06, imgPos[0].z);
      const ucm = st.d * 100, vcm = (t / 2 - st.B.z) * 100;
      rU.set(ucm.toFixed(1) + ' cm');
      rV.set(st.plate === 'mirror' ? '看不到 B' : vcm.toFixed(1) + ' cm');
      rC.set(st.plate === 'mirror' ? '—' : coincide >= 0 ? '<span class="hl-g">完全重合</span>' : '没有重合');
      let msg;
      if (st.plate === 'mirror') msg = '用平面镜做实验：像很清楚，但看不到镜子<b>后面</b>的蜡烛 B，<b>无法确定像的位置</b>。所以要用透明的<b>玻璃板</b>代替平面镜——既能看到 A 的像，又能看到后面的 B。';
      else if (st.tilt) msg = '玻璃板没有<b>竖直</b>放置：A 的像不在桌面上（“飘”在空中或“沉”到桌面下），蜡烛 B 怎么移动都<b>不能与像重合</b>。所以玻璃板一定要与桌面<b>垂直</b>。';
      else if (st.screen) msg = camGoal === 'back' ? '绕到光屏一侧<b>直接</b>看光屏：光屏上<b>没有</b>蜡烛的像！说明平面镜成的是<b>虚像</b>，不能用光屏承接。' : '透过玻璃板看，像好像“落”在光屏上——这是透过玻璃看到的虚像。点“绕到光屏一侧直接看光屏”试试。';
      else if (coincide >= 0) msg = '✅ 蜡烛 B 与 A 的像<b>完全重合</b>，B 好像也被点燃了！说明像与物<b>大小相等</b>（等效替代法）。记下 A、B 的位置，量一量它们到玻璃板的距离。' + (st.plate === 'thick' ? '<br>⚠️ 厚玻璃板前后两个表面<b>各成一个像</b>，看到两个像，不便于确定像的位置——所以要用<b>薄</b>玻璃板。' : '');
      else msg = st.plate === 'thick' ? '用厚玻璃板时看到了<b>两个</b>像（玻璃板的前、后表面都反射成像）。拖动蜡烛 B 试着与像重合。' : '点燃蜡烛 A，透过玻璃板看到了 A 的像。<b>拖动蜡烛 B</b>，直到从前面看去，B 与 A 的像完全重合。';
      obs.innerHTML = '👀 ' + msg;
      analyse();
    }
    function record() {
      if (st.plate === 'mirror' || st.tilt) { PS.toast('换成竖直放置的薄玻璃板再记录'); return; }
      if (coincide < 0 || st.screen) { PS.toast('先让蜡烛 B 与 A 的像完全重合', 'bad'); return; }
      const u = PS.round(st.d * 100, 1), v = PS.round((thick() / 2 - st.B.z) * 100, 1);
      if (st.rows.some((r) => Math.abs(r.u - u) < 0.01)) { PS.toast('改变蜡烛 A 的位置再记录一组'); return; }
      st.rows.push({ u, v });
      if (st.rows.length > 6) st.rows.shift();
      PS.sound.tick(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, k) => tbody.append(h('tr', null, h('td', null, k + 1), h('td', null, r.u.toFixed(1)), h('td', null, r.v.toFixed(1)), h('td', null, '相等'))));
      analyse();
    }
    function analyse() {
      const n = st.rows.length;
      const items = [
        ['像与物的<b>大小相等</b>（B 与 A 的像完全重合）', n >= 1],
        ['像与物到平面镜的<b>距离相等</b>（已测 ' + n + ' 组，至少 3 组）', n >= 3],
        ['像与物的连线与镜面<b>垂直</b>（看坐标纸：A、B 在同一条垂线上）', n >= 1],
        ['平面镜成的是<b>虚像</b>（光屏上承接不到）', st.did.screen],
        ['为什么用<b>薄</b>玻璃板？（试试厚玻璃板）', st.did.thick],
        ['玻璃板为什么要<b>竖直</b>放置？（试试倾斜）', st.did.tilt],
      ];
      analysis.innerHTML = items.map(([t, ok]) => (ok ? '✅ ' : '⬜ ') + t).join('<br>') + (n >= 3 && st.did.screen ? '<br><b class="hl-g">结论：平面镜成正立、等大的虚像，像与物到镜面的距离相等，像与物的连线与镜面垂直。</b>' : '');
    }

    /* ---------- 拖动蜡烛 B ---------- */
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
    let dragging = false;
    const grab = new THREE.Vector3(); // 按下时，指针在桌面上的点与蜡烛 B 底部的偏移
    const cv = renderer.domElement;
    const ptr = (e) => { const r = cv.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); };
    // 在外层容器的捕获阶段处理，抢在 OrbitControls 之前：按住蜡烛 B 时拖动蜡烛，否则旋转视角
    view.addEventListener('pointerdown', (e) => {
      if (!B.visible || e.target !== cv) return;
      ptr(e);
      if (ray.intersectObject(B, true).length && ray.ray.intersectPlane(plane, hit)) { grab.subVectors(st.B, hit); dragging = true; controls.enabled = false; cv.setPointerCapture(e.pointerId); e.stopPropagation(); }
    }, true);
    cv.addEventListener('pointermove', (e) => {
      ptr(e);
      if (!dragging) { cv.style.cursor = B.visible && ray.intersectObject(B, true).length ? 'grab' : ''; return; }
      if (ray.ray.intersectPlane(plane, hit)) { hit.add(grab); st.B.set(PS.clamp(hit.x, -0.2, 0.2), 0, PS.clamp(hit.z, -0.19, -0.02)); update(); }
    });
    const up = () => { if (dragging) { dragging = false; controls.enabled = true; } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    // 标签
    const LBL = { A: h('div', { class: 'label3d' }, '蜡烛 A（点燃）'), B: h('div', { class: 'label3d' }, '蜡烛 B（未点燃）'), P: h('div', { class: 'label3d' }, '玻璃板'), I: h('div', { class: 'label3d ref' }, 'A 的像'), S: h('div', { class: 'label3d' }, '光屏') };
    Object.values(LBL).forEach((e) => view.append(e));
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt, t) => {
      const fl = 1 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.04;
      flameA.scale.set(0.016, 0.03 * fl, 1);
      images.forEach((im) => im.f.scale.set(0.016, 0.03 * fl, 1));
      glowA.intensity = 0.35 + Math.sin(t * 11) * 0.04;
      if (camAnim > 0) {
        camAnim = Math.max(0, camAnim - dt * 0.9);
        camera.position.lerp(camGoal === 'back' ? CAM_B : CAM_F, 0.08);
        controls.target.lerp(camGoal === 'back' ? TGT_B : TGT_F, 0.08);
      }
      controls.update();
      // 像只能透过玻璃板从蜡烛 A 一侧看到
      const front = camera.position.z > 0.01;
      images.forEach((im, k) => {
        let vis = front;
        if (vis) { const p = imgPos[k].clone().setY(0.05), d = p.clone().sub(camera.position); const s = -camera.position.z / d.z; const q = camera.position.clone().addScaledVector(d, s); vis = Math.abs(q.x) < GW / 2 && q.y > 0 && q.y < GH; }
        im.g.visible = im.f.visible = vis;
      });
      renderer.render(scene, camera);
      const W = view.clientWidth, H = view.clientHeight;
      const pos = { A: new THREE.Vector3(0, CH + 0.05, A.position.z), B: st.B.clone().setY(CH + 0.045), P: new THREE.Vector3(-GW / 2 + 0.03, GH + 0.01, 0), I: imgPos[0] ? imgPos[0].clone().setY(CH + 0.045) : new THREE.Vector3(), S: new THREE.Vector3(screen.position.x, 0.135, screen.position.z) };
      Object.keys(LBL).forEach((k) => {
        const e = LBL[k];
        let show = st.labels && (k !== 'B' || B.visible) && (k !== 'S' || st.screen) && (k !== 'I' || (images[0] && images[0].g.visible && coincide < 0 && !st.screen));
        if (!show) { e.style.display = 'none'; return; }
        v3.copy(pos[k]).project(camera);
        e.style.display = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 ? '' : 'none';
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W) + 'px,' + ((-v3.y * 0.5 + 0.5) * H) + 'px) translate(-50%,-100%)';
      });
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    if (el.clientWidth && el.clientWidth < 560) { st.labels = false; labT.set(false); }
    if (!document.getElementById('r3-style')) document.head.append(h('style', { id: 'r3-style' }, '.r3-obs{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.92rem;min-height:2.6em}'));
    build(); update(); table();
    loop.start();
  });
})();
