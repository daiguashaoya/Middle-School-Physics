/* 第7章第3节：3D 地球上的“下”——各地的人都“脚朝地心”，重力的方向竖直向下（指向地心）。依赖 three.js、OrbitControls、force.js */
(function () {
  'use strict';
  const { h } = PS;
  // 大陆轮廓（经度, 纬度），粗略示意
  const LAND = [
    [[-168, 65], [-160, 71], [-140, 70], [-125, 72], [-95, 72], [-80, 73], [-65, 62], [-56, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 25], [-82, 29], [-90, 29], [-97, 26], [-97, 20], [-90, 16], [-84, 10], [-79, 8], [-83, 8], [-87, 13], [-95, 16], [-105, 20], [-110, 24], [-112, 31], [-117, 32], [-121, 35], [-124, 41], [-124, 47], [-130, 55], [-140, 60], [-152, 59], [-158, 56], [-165, 60]],
    [[-52, 60], [-44, 60], [-38, 65], [-22, 70], [-20, 77], [-30, 83], [-55, 82], [-68, 78], [-60, 75], [-55, 70]],
    [[-80, 9], [-75, 11], [-62, 11], [-52, 5], [-50, 0], [-35, -6], [-39, -14], [-41, -22], [-48, -26], [-54, -34], [-58, -38], [-65, -41], [-66, -47], [-69, -52], [-74, -53], [-75, -46], [-73, -37], [-71, -30], [-70, -18], [-76, -14], [-81, -6], [-80, 0], [-78, 4]],
    [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [60, 69], [70, 73], [80, 73], [100, 77], [115, 73], [130, 71], [150, 72], [170, 70], [180, 68], [180, 65], [170, 60], [160, 58], [156, 51], [142, 54], [140, 48], [132, 43], [128, 38], [126, 35], [122, 40], [118, 38], [122, 31], [120, 25], [110, 20], [108, 16], [105, 9], [100, 13], [98, 8], [100, 3], [104, 1], [98, 16], [94, 18], [90, 22], [86, 20], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [56, 27], [50, 30], [48, 29], [52, 24], [56, 24], [59, 22], [55, 17], [44, 12], [42, 16], [35, 28], [33, 31], [35, 36], [28, 37], [26, 40], [22, 40], [24, 35], [20, 39], [16, 38], [12, 44], [13, 45], [8, 44], [3, 43], [-1, 37], [-5, 36]],
    [[-17, 21], [-16, 28], [-10, 31], [-5, 36], [10, 37], [11, 33], [20, 31], [25, 32], [32, 31], [35, 28], [43, 12], [51, 12], [50, 8], [44, -1], [40, -10], [40, -16], [35, -24], [33, -28], [28, -33], [20, -35], [18, -32], [12, -18], [13, -10], [9, -1], [9, 4], [3, 6], [-5, 5], [-12, 7], [-17, 14]],
    [[114, -22], [122, -18], [129, -15], [136, -12], [142, -11], [146, -19], [153, -25], [151, -33], [146, -39], [140, -38], [135, -35], [129, -32], [115, -34], [113, -26]],
    [[-5, 50], [1, 51], [-2, 56], [-6, 58], [-5, 54]],
    [[130, 31], [135, 34], [140, 35], [142, 40], [141, 45], [139, 38], [133, 34]],
    [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
    [[95, 5], [105, -6], [120, -8], [118, 2], [110, 2], [100, 2]],
    [[172, -34], [178, -38], [174, -42], [167, -46], [170, -44]],
  ];
  const PEOPLE = [
    { n: '北京', lat: 40, lon: 116, c: 0xe03131 },
    { n: '阿根廷（在我们“脚下”）', lat: -38, lon: -64, c: 0x3b5bdb },
    { n: '北极', lat: 88, lon: 0, c: 0x0c8599 },
    { n: '赤道（非洲）', lat: 0, lon: 20, c: 0xf08c00 },
    { n: '澳大利亚', lat: -25, lon: 134, c: 0x7048e8 },
  ];
  const D2R = Math.PI / 180;
  const dirOf = (lat, lon) => new THREE.Vector3(Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.sin(lat * D2R), -Math.cos(lat * D2R) * Math.sin(lon * D2R));

  PS.register('earth-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { lines: false, glass: false, drop: -1, t: 0, labels: true };
    const view = h('div', { class: 'stage-3d', style: { background: '#0b1220' } });
    const dropB = PS.ui.button('🍎 每个人手里的苹果同时松手', () => { st.drop = 0; PS.sound.tick(); tell(); }, 'btn btn-primary btn-sm');
    const lineT = PS.ui.toggle('画出指向地心的连线', false, (v) => { st.lines = v; glassT.set(v); st.glass = v; upd(); });
    const glassT = PS.ui.toggle('地球半透明', false, (v) => { st.glass = v; upd(); });
    const labT = PS.ui.toggle('地名', true, (v) => { st.labels = v; });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(PS.ui.row(dropB, lineT.el, glassT.el, labT.el), view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动可以转动地球、换角度观察；人和苹果都放大画了（示意）。'), msg);
    function tell() {
      msg.innerHTML = st.drop >= 0
        ? '每个苹果都落向<b>脚下的地面</b>：北京的苹果往“下”落，阿根廷的苹果也往“下”落——可从太空看，它们落的方向几乎<b>相反</b>！各地的“下”都是<b>指向地心</b>的。'
        : '我们站在地面上，脚朝下，站得很稳；在我们“脚下”的阿根廷的人，好像是“头朝下”的，他们为什么也站得很稳？我们通常说的“下”，到底是什么方向？点按钮试试。';
      if (st.lines) msg.innerHTML += '<br>连线都相交于<b>地心</b>：重力的方向<b>竖直向下</b>，在地球上就是大致<b>指向地心</b>。';
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 50);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = 1.8; controls.maxDistance = 8; controls.enablePan = false;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    scene.add(new THREE.HemisphereLight(0xffffff, 0x223355, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(3, 2, 4); scene.add(sun);
    // 星空
    const sg = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 500; i++) { const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(18 + Math.random() * 8); sp.push(v.x, v.y, v.z); }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));
    // 地球贴图（等距圆柱投影）
    const tex = (function () {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
      const X = (lon) => ((lon + 180) / 360) * 1024, Y = (lat) => ((90 - lat) / 180) * 512;
      g.fillStyle = '#1c6fb8'; g.fillRect(0, 0, 1024, 512);
      g.fillStyle = '#4fa045'; g.strokeStyle = '#2f7a2a'; g.lineWidth = 2;
      LAND.forEach((P) => { g.beginPath(); P.forEach(([lo, la], i) => g[i ? 'lineTo' : 'moveTo'](X(lo), Y(la))); g.closePath(); g.fill(); g.stroke(); });
      // 南极洲
      g.fillStyle = '#f1f3f5'; g.beginPath(); g.moveTo(0, 512); for (let lo = -180; lo <= 180; lo += 10) g.lineTo(X(lo), Y(-70 - 4 * Math.sin(lo * 0.07))); g.lineTo(1024, 512); g.fill();
      // 北冰洋的冰
      g.fillStyle = 'rgba(241,243,245,.85)'; g.fillRect(0, 0, 1024, Y(84));
      // 经纬线
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
      for (let lo = -180; lo <= 180; lo += 30) { g.beginPath(); g.moveTo(X(lo), 0); g.lineTo(X(lo), 512); g.stroke(); }
      for (let la = -60; la <= 60; la += 30) { g.beginPath(); g.moveTo(0, Y(la)); g.lineTo(1024, Y(la)); g.stroke(); }
      g.strokeStyle = 'rgba(255,224,102,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(1024, Y(0)); g.stroke();
      return new THREE.CanvasTexture(c);
    })();
    const earthMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, opacity: 1 });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), earthMat);
    scene.add(earth);
    const world = new THREE.Group(); scene.add(world); // 人、苹果、连线跟地球一起
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd43b }));
    world.add(core);
    const gArrowMat = new THREE.MeshBasicMaterial({ color: 0xb197fc });
    const people = PEOPLE.map((P) => {
      const up = dirOf(P.lat, P.lon);
      const g = new THREE.Group();
      g.position.copy(up);
      g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      const mat = new THREE.MeshLambertMaterial({ color: P.c });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.08, 12), mat); body.position.y = 0.06; g.add(body);
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), new THREE.MeshLambertMaterial({ color: 0x343a40 })); legs.position.y = 0.012; g.add(legs);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.02, 14, 10), new THREE.MeshLambertMaterial({ color: 0xffd8a8 })); head.position.y = 0.12; g.add(head);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), new THREE.MeshLambertMaterial({ color: 0xffc078 })); arm.position.set(0.035, 0.085, 0); arm.rotation.z = -1.2; g.add(arm);
      // 苹果（在手边）
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), new THREE.MeshLambertMaterial({ color: 0xe03131 }));
      apple.position.set(0.065, 0.1, 0); g.add(apple);
      // 重力的方向：指向地心的箭头（在人的旁边）
      const ga = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 8), gArrowMat); shaft.position.y = -0.06; ga.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 10), gArrowMat); tip.position.y = -0.13; tip.rotation.x = Math.PI; ga.add(tip);
      ga.position.set(-0.06, 0.22, 0); g.add(ga);
      g.scale.setScalar(1.7);
      world.add(g);
      // 指向地心的连线
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), up.clone().multiplyScalar(1.25)]), new THREE.LineDashedMaterial({ color: 0xffd43b, dashSize: 0.04, gapSize: 0.03 }));
      line.computeLineDistances(); line.visible = false; world.add(line);
      const lbl = h('div', { class: 'label3d' }, P.n); view.append(lbl);
      return { P, up, g, apple, line, lbl };
    });
    const centerLbl = h('div', { class: 'label3d ref' }, '地心'); view.append(centerLbl);
    function upd() {
      earthMat.opacity = st.glass ? 0.35 : 1; earthMat.depthWrite = !st.glass;
      people.forEach((o) => { o.line.visible = st.lines; });
      core.visible = st.lines || st.glass;
      tell();
    }
    // 摄像机：从北京上空看
    const camDir = dirOf(30, 110).add(new THREE.Vector3(0, 0.25, 0)).normalize();
    camera.position.copy(camDir.multiplyScalar(3.6));
    controls.target.set(0, 0, 0);
    const v3 = new THREE.Vector3(), wp = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      if (st.drop >= 0) {
        st.drop += dt;
        const y = Math.max(0.016, 0.1 - 0.5 * 0.9 * st.drop * st.drop * 0.6);
        people.forEach((o) => { o.apple.position.y = y; o.apple.position.x = 0.065; });
        if (st.drop > 2.4) { st.drop = -1; people.forEach((o) => { o.apple.position.y = 0.1; }); tell(); }
      }
      controls.update();
      renderer.render(scene, camera);
      const W = view.clientWidth, H = view.clientHeight;
      const camN = camera.position.clone().normalize();
      people.forEach((o) => {
        const e = o.lbl;
        o.g.getWorldPosition(wp);
        const facing = wp.clone().normalize().dot(camN) > 0.05 || st.glass;
        if (!st.labels || !facing) { e.style.display = 'none'; return; }
        v3.copy(o.up).multiplyScalar(1.3).project(camera);
        e.style.display = '';
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W) + 'px,' + ((-v3.y * 0.5 + 0.5) * H) + 'px) translate(-50%,-100%)';
      });
      if (st.lines) { v3.set(0, -0.06, 0).project(camera); centerLbl.style.display = ''; centerLbl.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W) + 'px,' + ((-v3.y * 0.5 + 0.5) * H) + 'px) translate(-50%,0)'; }
      else centerLbl.style.display = 'none';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      if (!resize.done && hh / w > 0.7) { camera.position.multiplyScalar(1.35); resize.done = true; }
    }
    new ResizeObserver(resize).observe(view);
    resize();
    upd();
    loop.start();
  });
})();
