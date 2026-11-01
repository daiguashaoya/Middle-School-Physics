/* 第2节：3D 参照物实验室 —— 选谁当参照物，镜头就跟着谁 */
(function () {
  'use strict';
  const { h } = PS;

  function canvasTexture(w, hgt, draw, repeatX, repeatY) {
    const c = document.createElement('canvas');
    c.width = w; c.height = hgt;
    draw(c.getContext('2d'), w, hgt);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX || 1, repeatY || 1);
    t.anisotropy = 4;
    return t;
  }
  const wrapX = (v, W) => ((((v + W / 2) % W) + W) % W) - W / 2;

  PS.register('reference-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) {
      el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。'));
      return;
    }
    const W = 260; // 场景循环宽度（米）
    const wrap = h('div', { class: 'stage-3d' });
    el.append(wrap);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wrap.append(renderer.domElement);
    const scene = new THREE.Scene();
    const SKY = 0xcfe8ff;
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 80, 135);
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 500);
    camera.position.set(-6, 15, 40);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 12;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI * 0.47;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa070, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(30, 60, 25);
    scene.add(sun);

    const M = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));

    /* ---------- 地面、公路、铁轨（随相机平移，用纹理偏移制造“地面在动”的效果） ---------- */
    const grassTex = canvasTexture(256, 256, (g, w, hh) => {
      g.fillStyle = '#8cc56b'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(70,130,50,.35)' : 'rgba(190,230,140,.35)';
        g.fillRect(Math.random() * w, Math.random() * hh, 2, 2);
      }
      for (let i = 0; i < 18; i++) {
        g.fillStyle = 'rgba(255,255,255,.6)';
        g.beginPath(); g.arc(Math.random() * w, Math.random() * hh, 1.6, 0, Math.PI * 2); g.fill();
      }
    }, 300 / 8, 200 / 8);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), M(0xffffff, { map: grassTex }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const ROAD_TILE = 12;
    const roadTex = canvasTexture(256, 128, (g, w, hh) => {
      g.fillStyle = '#5c636a'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(Math.random() * w, Math.random() * hh, 2, 2); }
      g.fillStyle = '#fff';
      g.fillRect(0, 6, w, 5); g.fillRect(0, hh - 11, w, 5);
      g.fillStyle = '#ffd43b';
      g.fillRect(0, hh / 2 - 3, w / 2, 6);
    }, 300 / ROAD_TILE, 1);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 7.5), M(0xffffff, { map: roadTex }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 7);
    scene.add(road);

    const TIE_TILE = 1.2;
    const railTex = canvasTexture(128, 128, (g, w, hh) => {
      g.fillStyle = '#9a9187'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 700; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(60,50,40,.3)' : 'rgba(230,220,210,.3)'; g.fillRect(Math.random() * w, Math.random() * hh, 3, 3); }
      g.fillStyle = '#6b4f35'; g.fillRect(w * 0.3, 10, w * 0.4, hh - 20);
    }, 300 / TIE_TILE, 1);
    const railBed = new THREE.Mesh(new THREE.PlaneGeometry(300, 4.6), M(0xffffff, { map: railTex }));
    railBed.rotation.x = -Math.PI / 2;
    railBed.position.set(0, 0.03, -2);
    scene.add(railBed);
    const railMat = M(0x868e96);
    [-0.75, 0.75].forEach((dz) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(300, 0.18, 0.12), railMat);
      r.position.set(0, 0.12, -2 + dz);
      scene.add(r);
    });

    /* ---------- 静止的景物（树、电线杆、房子、山、云），按相机位置循环摆放 ---------- */
    const scenery = [];
    function addScenery(obj, x0) { obj.userData.x0 = x0; scene.add(obj); scenery.push(obj); return obj; }
    const trunkMat = M(0x8d5a2b);
    const leafMats = [M(0x2f9e44), M(0x37b24d), M(0x40c057), M(0x2b8a3e)];
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 6);
    const coneGeo = new THREE.ConeGeometry(1.6, 3.8, 7);
    const ballGeo = new THREE.IcosahedronGeometry(1.7, 0);
    function makeTree(scale) {
      const g = new THREE.Group();
      const t = new THREE.Mesh(trunkGeo, trunkMat); t.position.y = 1.1; g.add(t);
      const round = Math.random() < 0.5;
      const c = new THREE.Mesh(round ? ballGeo : coneGeo, PS.pick(leafMats));
      c.position.y = round ? 3.4 : 3.8; g.add(c);
      g.scale.setScalar(scale);
      return g;
    }
    for (let x = -W / 2; x < W / 2; x += 9) {
      addScenery(makeTree(PS.rand(0.8, 1.2)), x + PS.rand(-2, 2)).position.z = 13.5 + PS.rand(0, 3);
      addScenery(makeTree(PS.rand(0.9, 1.4)), x + PS.rand(-3, 3)).position.z = -8 - PS.rand(0, 6);
    }
    const poleMat = M(0x495057);
    for (let x = -W / 2; x < W / 2; x += 26) {
      const g = new THREE.Group();
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 7.5, 6), poleMat); p.position.y = 3.75; g.add(p);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), poleMat); bar.position.set(0, 7, 0.9); g.add(bar);
      addScenery(g, x).position.z = -4.8;
    }
    const wallMats = [M(0xfff4e6), M(0xe7f5ff), M(0xfff9db), M(0xf8f0fc)];
    const roofMats = [M(0xc92a2a), M(0x1971c2), M(0xe8590c)];
    for (let x = -W / 2; x < W / 2; x += 32) {
      const g = new THREE.Group();
      const bw = PS.rand(5, 8), bh = PS.rand(3.5, 6);
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 5), PS.pick(wallMats)); b.position.y = bh / 2; g.add(b);
      const r = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, 5) * 0.75, 2.4, 4), PS.pick(roofMats));
      r.position.y = bh + 1.2; r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.75); g.add(r);
      addScenery(g, x + PS.rand(0, 10)).position.z = -22 - PS.rand(0, 6);
    }
    const mountainMats = [M(0x74b816, { flatShading: true }), M(0x5c940d, { flatShading: true }), M(0x82c91e, { flatShading: true })];
    for (let x = -W / 2; x < W / 2; x += 40) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(PS.rand(22, 32), PS.rand(16, 26), 6), PS.pick(mountainMats));
      addScenery(m, x + PS.rand(0, 15)).position.set(0, 8, -70 - PS.rand(0, 10));
    }
    const cloudMat = M(0xffffff);
    for (let x = -W / 2; x < W / 2; x += 45) {
      const g = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(PS.rand(1.8, 2.8), 1), cloudMat);
        s.position.set(i * 2.2 - 3, PS.rand(-0.5, 0.6), PS.rand(-1, 1)); g.add(s);
      }
      addScenery(g, x + PS.rand(0, 20)).position.set(0, PS.rand(18, 26), PS.rand(-50, -20));
    }

    /* ---------- 运动的物体 ---------- */
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false });
    function blob(len, wid) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(len, wid), shadowMat);
      s.rotation.x = -Math.PI / 2; s.position.y = 0.05;
      return s;
    }
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = M(0x212529);
    function addWheels(g, xs, zs, y, r) {
      const arr = [];
      xs.forEach((x) => zs.forEach((z) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.scale.set(r / 0.4, r / 0.4, 1);
        w.position.set(x, y, z);
        g.add(w); arr.push(w);
      }));
      return arr;
    }

    // 火车
    const winTex = canvasTexture(512, 64, (g, w, hh) => {
      g.fillStyle = '#1d3557'; g.fillRect(0, 0, w, hh);
      for (let i = 0; i < 8; i++) {
        const x = i * 64 + 6;
        g.fillStyle = '#a5d8ff'; g.fillRect(x, 8, 52, 48);
        if (i % 3 !== 1) {
          g.fillStyle = '#263445';
          g.beginPath(); g.arc(x + 26, 30, 9, 0, Math.PI * 2); g.fill();
          g.fillRect(x + 12, 40, 28, 16);
        }
      }
    }, 1, 1);
    function makeCoach(isHead) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 3), M(0xf8f9fa)); body.position.y = 2.3; g.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(10.02, 0.35, 3.02), M(0x1c7ed6)); stripe.position.y = 1.35; g.add(stripe);
      const winMat = M(0xffffff, { map: winTex });
      const win = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.95, 3.04), winMat); win.position.y = 2.55; g.add(win);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 2.8), M(0x495057)); skirt.position.y = 0.75; g.add(skirt);
      if (isHead) {
        const nose = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), M(0xf8f9fa));
        nose.scale.set(2.3, 1, 1); nose.position.set(5, 2.3, 0); g.add(nose);
        const glass = new THREE.Mesh(new THREE.SphereGeometry(1.52, 20, 14, 0, Math.PI * 2, 0, Math.PI / 3.2), M(0x1d3557));
        glass.scale.set(1.6, 0.9, 0.9); glass.rotation.z = -Math.PI / 2.6; glass.position.set(6.2, 2.75, 0); g.add(glass);
      }
      return { g, wheels: addWheels(g, [-3.6, -2.6, 2.6, 3.6], [-1, 1], 0.55, 0.42) };
    }
    const train = new THREE.Group();
    const trainWheels = [];
    [-11, 0, 11].forEach((x, i) => { const c = makeCoach(i === 2); c.g.position.x = x; train.add(c.g); trainWheels.push(...c.wheels); });
    train.add(blob(36, 3.6));
    train.position.z = -2;
    scene.add(train);

    // 汽车
    function makeCar() {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 2), M(0xe03131)); body.position.y = 0.85; g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.85, 1.8), M(0xc92a2a)); cabin.position.set(-0.3, 1.75, 0); g.add(cabin);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.84), M(0x99c9ff)); glass.position.set(-0.3, 1.78, 0); g.add(glass);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 1.6), M(0xfff3bf)); lamp.position.set(2.22, 0.95, 0); g.add(lamp);
      g.add(blob(4.8, 2.4));
      return { g, wheels: addWheels(g, [-1.4, 1.4], [-0.95, 0.95], 0.42, 0.42) };
    }
    const car = makeCar();
    car.g.position.z = 5.2;
    scene.add(car.g);

    // 卡车（向西行驶，车头朝 -x）
    function makeTruck() {
      const g = new THREE.Group();
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.3), M(0xf08c00)); cab.position.set(-3.6, 1.7, 0); g.add(cab);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 2.0), M(0x99c9ff)); glass.position.set(-4.72, 2.2, 0); g.add(glass);
      const box = new THREE.Mesh(new THREE.BoxGeometry(6, 2.9, 2.5), M(0xe7f5ff)); box.position.set(0.6, 2.0, 0); g.add(box);
      const band = new THREE.Mesh(new THREE.BoxGeometry(6.02, 0.5, 2.52), M(0x1971c2)); band.position.set(0.6, 2.2, 0); g.add(band);
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.4, 2.2), M(0x343a40)); chassis.position.set(-0.6, 0.65, 0); g.add(chassis);
      g.add(blob(9, 2.8));
      return { g, wheels: addWheels(g, [-3.6, 1.4, 2.8], [-1.05, 1.05], 0.5, 0.5) };
    }
    const truck = makeTruck();
    truck.g.position.z = 8.8;
    scene.add(truck.g);

    // 飞鸟
    const bird = new THREE.Group();
    const bBody = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), M(0x343a40)); bBody.scale.set(1.8, 0.8, 0.8); bird.add(bBody);
    const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), M(0x343a40)); bHead.position.set(0.85, 0.15, 0); bird.add(bHead);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), M(0xf59f00)); beak.rotation.z = -Math.PI / 2; beak.position.set(1.2, 0.12, 0); bird.add(beak);
    const wingGeo = new THREE.BoxGeometry(0.9, 0.06, 1.6);
    wingGeo.translate(0, 0, 0.8);
    const wingL = new THREE.Mesh(wingGeo, M(0x495057)); bird.add(wingL);
    const wingR = new THREE.Mesh(wingGeo, M(0x495057)); wingR.rotation.y = Math.PI; bird.add(wingR);
    bird.scale.setScalar(1.5);
    bird.position.set(0, 10, 2);
    scene.add(bird);

    // 路边的小孩（相对地面静止）
    const kid = new THREE.Group();
    const skin = M(0xffd8a8);
    const kBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.0, 10), M(0x7048e8)); kBody.position.y = 1.15; kid.add(kBody);
    const kHead = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), skin); kHead.position.y = 2.0; kid.add(kHead);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x212529)); hair.position.y = 2.05; kid.add(hair);
    [-0.16, 0.16].forEach((z) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.65, 6), M(0x1864ab)); l.position.set(0, 0.33, z); kid.add(l); });
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), skin); arm.position.set(0, 2.0, -0.45); arm.rotation.x = 0.5; kid.add(arm);
    kid.scale.setScalar(1.6);
    kid.position.z = 12;
    kid.userData.x0 = 4;
    scene.add(kid);
    scenery.push(kid);

    /* ---------- 状态 ---------- */
    const movers = {
      train: { name: '火车（车上乘客）', obj: train, x: 0, v: 12, z: -2, ly: 5.2, wheels: trainWheels, r: 0.42 },
      car: { name: '汽车', obj: car.g, x: 2, v: 12, z: 5.2, ly: 3.0, wheels: car.wheels, r: 0.42 },
      truck: { name: '卡车', obj: truck.g, x: 30, v: -9, z: 8.8, ly: 4.2, wheels: truck.wheels, r: 0.5 },
      bird: { name: '飞鸟', obj: bird, x: -10, v: 4, z: 2, ly: 2.0, y: 10 },
    };
    const st = { ref: 'ground', camX: 0, paused: false, speed: 1, t: 0, targetZ: 0 };
    const REFZ = { ground: 4, train: -2, car: 5.2, truck: 8.8, bird: 2 };

    /* ---------- 标签 ---------- */
    const labelLayer = h('div', { class: 'overlay', style: { inset: 0 } });
    wrap.append(labelLayer);
    const compass = h('div', { class: 'ref3d-compass', html: '西 <b>←</b> &nbsp; <b>→</b> 东' });
    wrap.append(compass);
    const labels = {};
    function makeLabel(key, name) {
      const d = h('div', { class: 'label3d' });
      d._name = name;
      labelLayer.append(d);
      labels[key] = d;
    }
    Object.keys(movers).forEach((k) => makeLabel(k, movers[k].name));
    makeLabel('kid', '路边的小孩');
    makeLabel('tree', '路边的树');
    const refTree = scenery.find((o) => o.position.z > 13 && Math.abs(o.userData.x0 + 14) < 6) || scenery[0];

    function relState(v) {
      const vr = v - (st.ref === 'ground' ? 0 : movers[st.ref].v);
      if (Math.abs(vr) < 0.05) return { cls: 'still', txt: '静止' };
      return { cls: 'moving', txt: vr > 0 ? '向东运动 →' : '← 向西运动' };
    }
    const tmp = new THREE.Vector3();
    function placeLabel(key, x, y, z, v, isRef) {
      const d = labels[key];
      tmp.set(x, y, z).project(camera);
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05;
      d.style.display = vis ? '' : 'none';
      if (!vis) return;
      const r = wrap.getBoundingClientRect();
      d.style.left = ((tmp.x + 1) / 2) * r.width + 'px';
      d.style.top = ((1 - tmp.y) / 2) * r.height + 'px';
      if (isRef) {
        if (d._html !== 'ref') { d.className = 'label3d ref'; d.innerHTML = d._name + '<small>参照物（假定不动）</small>'; d._html = 'ref'; }
        return;
      }
      const s = relState(v);
      const html = d._name + '<small>' + s.txt + '</small>';
      if (d._html !== html) { d.innerHTML = html; d._html = html; d.className = 'label3d ' + s.cls; }
    }

    /* ---------- 主循环 ---------- */
    function frame(dt) {
      const sdt = st.paused ? 0 : dt * st.speed;
      st.t += sdt;
      for (const k in movers) movers[k].x += movers[k].v * sdt;
      st.camX = st.ref === 'ground' ? st.camX : movers[st.ref].x;
      // 纹理偏移：地面、公路、铁轨“跟着世界走”
      grassTex.offset.x = (st.camX / 8) % 1;
      roadTex.offset.x = (st.camX / ROAD_TILE) % 1;
      railTex.offset.x = (st.camX / TIE_TILE) % 1;
      scenery.forEach((o) => { o.position.x = wrapX(o.userData.x0 - st.camX, W); });
      for (const k in movers) {
        const m = movers[k];
        m.obj.position.x = wrapX(m.x - st.camX, W);
        if (m.wheels) m.wheels.forEach((w) => { w.rotation.z -= (m.v * sdt) / m.r; });
      }
      const flap = Math.sin(st.t * 9) * 0.6;
      wingL.rotation.x = -flap; wingR.rotation.x = flap;
      bird.position.y = 10 + Math.sin(st.t * 1.3) * 0.4;
      // 相机目标平滑移到参照物所在的位置
      controls.target.z += (REFZ[st.ref] - controls.target.z) * Math.min(1, dt * 3);
      controls.update();
      renderer.render(scene, camera);
      for (const k in movers) {
        const m = movers[k];
        placeLabel(k, m.obj.position.x, (m.y || 0) + m.ly, m.z, m.v, st.ref === k);
      }
      placeLabel('kid', kid.position.x, 4.4, kid.position.z, 0, st.ref === 'ground');
      placeLabel('tree', refTree.position.x, 7.2, refTree.position.z, 0, st.ref === 'ground');
    }
    const loop = PS.loop(frame, wrap);

    function resize() {
      const r = wrap.getBoundingClientRect();
      if (r.width < 2) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(wrap);
    resize();
    loop.start();

    /* ---------- 控制面板 ---------- */
    const explain = h('div', { class: 'ref3d-explain' });
    const table = h('div', { class: 'ref3d-table' });
    function updateText() {
      const refName = st.ref === 'ground' ? '地面（路边的树、小孩）' : movers[st.ref].name;
      const rows = [];
      const add = (name, v, isRef) => {
        const s = isRef ? { cls: 'ref', txt: '参照物' } : relState(v);
        rows.push('<span class="r3-chip ' + s.cls + '"><b>' + name + '</b> ' + s.txt + '</span>');
      };
      add('路边的树/小孩', 0, st.ref === 'ground');
      for (const k in movers) add(movers[k].name, movers[k].v, st.ref === k);
      table.innerHTML = rows.join('');
      let txt = '以 <b>' + refName + '</b> 为参照物：';
      if (st.ref === 'ground') txt += '镜头固定在地面上，树木、小孩不动；火车、汽车、卡车、飞鸟的位置在不断变化，都是运动的。';
      else if (st.ref === 'train') txt += '镜头“坐”在火车上，就像车上的乘客一样。窗外的树木、房屋向后（向西）退去——这就是“看山恰似走来迎”。' + (Math.abs(movers.car.v - movers.train.v) < 0.05 ? '汽车和火车同向、同速，汽车相对火车<b>静止</b>（相对静止）。' : '');
      else if (st.ref === 'car') txt += '把汽车看作不动，路边的树向西退，' + (Math.abs(movers.car.v - movers.train.v) < 0.05 ? '火车和汽车快慢相同、方向相同，所以火车是<b>静止</b>的。' : '火车的运动情况取决于它比汽车快还是慢。');
      else if (st.ref === 'truck') txt += '卡车向西开，以它为参照物，树木和小孩都“向东”运动，迎面而来的火车、汽车运动得更快。';
      else txt += '以飞鸟为参照物，地面上的一切都在向西运动；比飞鸟快的火车仍在向东运动。';
      txt += '<br><span class="muted">同一个物体，选择不同的参照物，运动情况可能不同——这就是<b>运动和静止的相对性</b>。</span>';
      explain.innerHTML = txt;
    }
    const refSeg = PS.ui.seg([
      { value: 'ground', label: '🌳 地面' },
      { value: 'train', label: '🚄 火车' },
      { value: 'car', label: '🚗 汽车' },
      { value: 'truck', label: '🚚 卡车' },
      { value: 'bird', label: '🐦 飞鸟' },
    ], 'ground', (v) => { st.ref = v; updateText(); });
    const vTrain = PS.ui.slider({ label: '火车速度', min: 0, max: 25, step: 1, value: 12, unit: 'm/s', onInput: (v) => { movers.train.v = v; updateText(); } });
    const vCar = PS.ui.slider({ label: '汽车速度', min: -25, max: 25, step: 1, value: 12, unit: 'm/s', fmt: (v) => (v < 0 ? '向西 ' + -v : v > 0 ? '向东 ' + v : 0), onInput: (v) => { movers.car.v = v; updateText(); } });
    const speed = PS.ui.slider({ label: '播放速度', min: 0.25, max: 1.5, step: 0.25, value: 1, unit: '×', onInput: (v) => { st.speed = v; } });
    const pause = PS.ui.button('⏸ 暂停', () => { st.paused = !st.paused; pause.innerHTML = st.paused ? '▶ 继续' : '⏸ 暂停'; }, 'btn btn-sm');
    const view = PS.ui.button('视角复位', () => { camera.position.set(-6, 15, 40 + REFZ[st.ref]); controls.target.set(0, 2, REFZ[st.ref]); }, 'btn btn-sm btn-ghost');
    const same = PS.ui.button('汽车与火车同速', () => { vCar.set(vTrain.value); }, 'btn btn-sm');
    el.append(
      PS.ui.row(h('b', null, '选择参照物：'), refSeg.el),
      table,
      explain,
      PS.ui.row(vTrain.el, vCar.el, same),
      PS.ui.row(speed.el, pause, view, h('span', { class: 'kbd-hint' }, '拖动画面可旋转视角，滚轮缩放。'))
    );
    updateText();

    const css = `
    .ref3d-compass{position:absolute;left:12px;top:10px;background:rgba(255,255,255,.88);border-radius:8px;padding:2px 10px;font-size:13px;font-weight:700;color:#3a4458;pointer-events:none}
    .ref3d-compass b{color:var(--primary)}
    .ref3d-table{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
    .r3-chip{font-size:.88rem;padding:3px 10px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface)}
    .r3-chip.still{border-color:var(--green);color:var(--green)}
    .r3-chip.moving{border-color:var(--accent);color:#b35f00}
    .r3-chip.ref{background:var(--primary);border-color:var(--primary);color:#fff}
    .r3-chip b{color:var(--ink)}
    .r3-chip.ref b{color:#fff}
    .ref3d-explain{margin-top:10px;background:var(--surface-2);border-radius:10px;padding:10px 14px;font-size:.95rem;border-left:4px solid var(--primary)}
    `;
    document.head.append(h('style', null, css));
  });
})();
