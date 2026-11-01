/* 第1节：3D 声波模型——扬声器振动，带动空气分子形成疏密相间的声波。依赖 three.js、OrbitControls */
(function () {
  'use strict';
  const { h } = PS;
  const TAU = Math.PI * 2;
  const SP = 0.1;                      // 空气分子的间距
  const NX = 36, NY = 16, NZ = 16;
  const X0 = -1.25;                    // 分子区域的起点
  const SRC = new Float32Array([-1.45, 0, 0]); // 声源（纸盆）位置
  const C = 0.55;                      // 画面中的“声速”（单位/秒）
  const FREQ = ['很低', '较低', '中等', '较高', '很高'];

  function dotTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    r.addColorStop(0, '#ffffff'); r.addColorStop(0.55, '#ffffff'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
    return new THREE.CanvasTexture(c);
  }

  PS.register('wave-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { on: false, t: 0, t0: 0, tOff: -1, f: 3, a: 3, view: 'slice', track: true, vacuum: false };

    const view = h('div', { class: 'stage-3d', style: { background: '#eef3fa' } });
    el.append(view);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef3fa);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 40);
    camera.position.set(0.3, 0.75, 3.6);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0.2, -0.05, 0);
    controls.enableDamping = true;
    controls.minDistance = 1.2; controls.maxDistance = 8;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa5b8, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6);
    dl.position.set(-1, 2, 2); scene.add(dl);

    // 扬声器：箱体 + 可前后振动的纸盆
    const spk = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.8), new THREE.MeshLambertMaterial({ color: 0x343a40 }));
    box.position.x = -1.75; spk.add(box);
    const coneGeo = new THREE.CylinderGeometry(0.3, 0.1, 0.16, 32, 1, true);
    coneGeo.rotateZ(-Math.PI / 2);
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshLambertMaterial({ color: 0x868e96, side: THREE.DoubleSide }));
    spk.add(cone);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x212529 }));
    cap.rotation.z = -Math.PI / 2; spk.add(cap);
    scene.add(spk);
    // 地面网格
    const grid = new THREE.GridHelper(6, 30, 0xc5cfe0, 0xdde3ee);
    grid.position.set(0.4, -0.95, 0); scene.add(grid);

    // 空气分子
    const all = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let k = 0; k < NZ; k++) {
      const x = X0 + i * SP, y = (j - (NY - 1) / 2) * SP, z = (k - (NZ - 1) / 2) * SP;
      const dx = x - SRC[0], dy = y - SRC[1], dz = z - SRC[2], r = Math.hypot(dx, dy, dz);
      all.push({ x, y, z, r, ux: dx / r, uy: dy / r, uz: dz / r, fall: 0.75 / Math.sqrt(r + 0.25), slice: k === NZ / 2, half: z <= 0.001 });
    }
    const tex = dotTexture();
    let pts = null, list = [], pos = null, col = null;
    function build() {
      if (pts) { scene.remove(pts); pts.geometry.dispose(); }
      list = all.filter((p) => (st.view === 'slice' ? p.slice : st.view === 'half' ? p.half : true));
      pos = new Float32Array(list.length * 3); col = new Float32Array(list.length * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const m = new THREE.PointsMaterial({ size: st.view === 'slice' ? 0.17 : 0.1, map: tex, vertexColors: true, alphaTest: 0.4, transparent: true, depthWrite: true });
      pts = new THREE.Points(g, m);
      pts.visible = !st.vacuum;
      scene.add(pts);
      update();
    }
    // 被跟踪的分子
    const trackIdx = all.findIndex((p) => Math.abs(p.x - 0.45) < 0.01 && Math.abs(p.y + 0.05) < 0.01 && p.slice);
    const tp = all[trackIdx];
    const tracker = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshLambertMaterial({ color: 0xe03131 }));
    scene.add(tracker);
    const rangeLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xe03131, transparent: true, opacity: 0.45 }));
    scene.add(rangeLine);

    // HTML 标签
    const overlay = h('div', { class: 'overlay', style: { inset: 0 } });
    view.append(overlay);
    const lblSpk = h('div', { class: 'label3d', html: '扬声器' });
    const lblTrack = h('div', { class: 'label3d moving', html: '跟踪的分子' });
    const lblVac = h('div', { class: 'w3-msg' }, '真空中没有空气分子，扬声器在振动，声音却无法传播出去');
    const dense = [0, 1, 2].map(() => h('div', { class: 'label3d w3-d', html: '密部' }));
    const sparse = [0, 1, 2].map(() => h('div', { class: 'label3d w3-s', html: '疏部' }));
    overlay.append(lblSpk, lblTrack, lblVac, ...dense, ...sparse);
    const hud = h('div', { class: 'w3-hud' });
    view.append(hud);

    const v3 = new THREE.Vector3();
    function place(elm, x, y, z) {
      v3.set(x, y, z).project(camera);
      const r = view.getBoundingClientRect();
      const vis = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      elm.style.display = vis ? '' : 'none';
      elm.style.left = ((v3.x + 1) / 2) * r.width + 'px';
      elm.style.top = ((1 - v3.y) / 2) * r.height + 'px';
    }

    const lam = () => 1.0 - (st.f - 1) * 0.16;     // 频率越高，疏密越密集
    const amp = () => st.a * 0.021;
    // 某处是否有声波经过：在 [声波尾部, 波前] 之间
    function active(r) {
      if (!st.on && st.tOff < 0) return false;
      const head = C * (st.t - st.t0);
      const tail = st.tOff >= 0 ? C * (st.t - st.tOff) : -1;
      return r <= head && r > tail;
    }
    const cDense = new THREE.Color(0x1a2f99), cSparse = new THREE.Color(0xdbe4ff), cIdle = new THREE.Color(0x748ffc), tmpC = new THREE.Color();
    function update() {
      const k = TAU / lam(), w = k * C, A = amp(), t = st.t;
      for (let n = 0; n < list.length; n++) {
        const p = list[n];
        let u = 0, s = 0, on = active(p.r);
        if (on) { const ph = w * t - k * p.r; u = A * p.fall * Math.sin(ph); s = Math.cos(ph) * Math.min(1, st.a / 3) * Math.min(1, p.fall * 1.3); }
        pos[n * 3] = p.x + u * p.ux; pos[n * 3 + 1] = p.y + u * p.uy; pos[n * 3 + 2] = p.z + u * p.uz;
        if (on) { if (s >= 0) tmpC.copy(cIdle).lerp(cDense, s); else tmpC.copy(cIdle).lerp(cSparse, -s); }
        else tmpC.copy(cIdle);
        col[n * 3] = tmpC.r; col[n * 3 + 1] = tmpC.g; col[n * 3 + 2] = tmpC.b;
      }
      if (pts) { pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true; }
      // 纸盆
      const cu = st.on ? A * 0.9 * Math.sin(w * t) : 0;
      cone.position.x = SRC[0] - 0.08 + cu; cap.position.x = SRC[0] - 0.02 + cu;
      // 跟踪的分子
      const on = active(tp.r) && !st.vacuum;
      const ph = w * t - k * tp.r, uu = on ? A * tp.fall * Math.sin(ph) : 0;
      tracker.position.set(tp.x + uu * tp.ux, tp.y + uu * tp.uy, tp.z + uu * tp.uz + 0.002);
      tracker.visible = st.track && !st.vacuum;
      rangeLine.visible = tracker.visible && on;
      rangeLine.scale.x = Math.max(0.001, 2 * A * tp.fall);
      rangeLine.position.set(tp.x, tp.y - 0.06, tp.z);
    }

    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.tOff >= 0 && C * (st.t - st.tOff) > 4.2) st.tOff = -1; // 声波已全部离开
      update();
      controls.update();
      renderer.render(scene, camera);
      place(lblSpk, -1.75, 0.55, 0);
      place(lblTrack, tracker.position.x, tracker.position.y + 0.12, tracker.position.z);
      lblTrack.style.display = st.track && !st.vacuum ? lblTrack.style.display : 'none';
      lblVac.style.display = st.vacuum && st.on ? 'block' : 'none';
      // 沿中轴线标出密部、疏部
      const k = TAU / lam(), w = k * C;
      const showLbl = !st.vacuum && (st.on || st.tOff >= 0) && st.a > 0;
      [[dense, 0], [sparse, Math.PI]].forEach(([arr, off]) => {
        let m = 0;
        for (let n = -6; n < 12 && m < arr.length; n++) {
          const r = (w * st.t - off - TAU * n) / k;
          const x = SRC[0] + r;
          if (r > 0.3 && x < X0 + (NX - 1) * SP && active(r) && showLbl) { place(arr[m], x, -0.86, 0); m++; }
        }
        for (; m < arr.length; m++) arr[m].style.display = 'none';
      });
      hud.innerHTML = st.on ? (st.vacuum ? '真空：没有传声的介质' : '声波以<b>疏密相间</b>的形式向外传播（画面已大大放慢）') : '点击“发声”';
    }, view);

    /* 控件 */
    const playBtn = PS.ui.button('▶ 发声', () => {
      if (st.on) { st.on = false; st.tOff = st.t; playBtn.innerHTML = '▶ 发声'; return; }
      st.on = true; st.t0 = st.t; st.tOff = -1; playBtn.innerHTML = '⏹ 停止发声';
    }, 'btn btn-primary');
    const viewSeg = PS.ui.seg([{ value: 'slice', label: '剖面' }, { value: 'half', label: '切开一半' }, { value: 'all', label: '整体' }], st.view, (v) => { st.view = v; build(); });
    const fS = PS.ui.slider({ label: '频率', min: 1, max: 5, step: 1, value: st.f, fmt: (v) => FREQ[v - 1], onInput: (v) => { st.f = v; } });
    const aS = PS.ui.slider({ label: '振幅', min: 1, max: 5, step: 1, value: st.a, fmt: (v) => FREQ[v - 1].replace('低', '小').replace('高', '大'), onInput: (v) => { st.a = v; } });
    const trT = PS.ui.toggle('跟踪一个分子', st.track, (v) => { st.track = v; });
    const vacT = PS.ui.toggle('抽成真空', false, (v) => { st.vacuum = v; if (pts) pts.visible = !v; });
    el.append(PS.ui.row(playBtn, viewSeg.el, trT.el, vacT.el), PS.ui.row(fS.el, aS.el));

    function resize() {
      const r = view.getBoundingClientRect();
      if (r.width < 2) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    build();
    loop.start();

    document.head.append(h('style', null, `
      .w3-hud{position:absolute;left:10px;bottom:10px;background:rgba(255,255,255,.9);border-radius:8px;padding:3px 10px;font-size:13px;font-weight:600;color:#3a4458;pointer-events:none}
      .w3-msg{position:absolute;left:50%;top:18%;transform:translateX(-50%);background:rgba(224,49,49,.92);color:#fff;font-weight:700;padding:8px 16px;border-radius:12px;display:none;white-space:nowrap;font-size:14px}
      .label3d.w3-d{background:#1f3db5;color:#fff;border-color:#1f3db5;font-size:12px;padding:1px 8px}
      .label3d.w3-s{background:#fff;color:#4263eb;border-color:#91a7ff;font-size:12px;padding:1px 8px}
      @media (max-width:720px){.w3-msg{white-space:normal;width:80%;text-align:center}}
    `));
  });
})();
