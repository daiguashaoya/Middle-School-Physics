/* 第3章第2节：物质的三种状态（3D 分子模型）——固态、液态、气态的分子排列与运动，加热 / 冷却时连续变化。依赖 three.js、OrbitControls、heat.js */
(function () {
  'use strict';
  const { h } = PS;

  const N1 = 5, N = N1 * N1 * N1;     // 5×5×5 个分子
  const BOX = 1, R = 0.052, GAP = 0.125;
  const COL = [0x4c6ef5, 0x15aabf, 0xfd7e14];
  const INFO = [
    { k: 'solid', T: '−10 ℃', name: '固态（冰）', html: '分子<b>排列紧密、有规则</b>，分子间作用力很大，每个分子只能在<b>固定的位置附近振动</b>。<br>所以固体有<b>固定的形状和体积</b>。' },
    { k: 'liquid', T: '50 ℃', name: '液态（水）', html: '分子间距离仍然很小，但<b>没有固定的位置</b>，可以在其他分子之间移动。<br>所以液体有<b>一定的体积</b>，但<b>没有固定的形状</b>，具有流动性。' },
    { k: 'gas', T: '120 ℃', name: '气态（水蒸气）', html: '分子间<b>距离很大</b>，作用力几乎为零，分子<b>极度散乱、高速运动</b>，可以到达容器的各个角落。<br>所以气体<b>没有固定的形状和体积</b>，容易被压缩。' },
  ];

  PS.register('states-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f8' } });
    el.append(view);
    const st = { level: 0, target: 0, trail: true, t: 0, busy: 0 };
    const segBtns = PS.ui.seg(INFO.map((s, i) => ({ value: i, label: s.name })), 0, (v) => go(v));
    const cool = PS.ui.button('❄️ 冷却（放热）', () => go(Math.max(0, st.target - 1)), 'btn');
    const heat = PS.ui.button('🔥 加热（吸热）', () => go(Math.min(2, st.target + 1)), 'btn btn-accent');
    const tg = PS.ui.toggle('显示一个分子的运动轨迹', true, (v) => { st.trail = v; trail.visible = v; });
    const out = h('div', { class: 'feedback show info' });
    const tag = h('div', { class: 's3-tag' });
    view.append(tag);
    el.append(PS.ui.row(segBtns.el), PS.ui.row(cool, heat, tg.el), out);

    /* ---------- 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f8);
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.05, 30);
    camera.position.set(1.5, 1.25, 2.2);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.42, 0);
    controls.enableDamping = true; controls.minDistance = 1.2; controls.maxDistance = 5;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa5b8, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(1.5, 3, 2); scene.add(dl);
    // 容器（玻璃盒）
    const boxGeo = new THREE.BoxGeometry(BOX, BOX, BOX);
    const glass = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xd0ebff, transparent: true, opacity: 0.12, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
    glass.position.y = BOX / 2; scene.add(glass);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x7d8ca3 }));
    edges.position.y = BOX / 2; scene.add(edges);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshLambertMaterial({ color: 0xdfe5ee }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.002; scene.add(floor);
    // 分子
    const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(R, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.05 }), N);
    scene.add(mesh);
    const color = new THREE.Color(), m4 = new THREE.Matrix4();
    // 格点（放在盒子底部中央），从下往上编号，熔化时上层先离开格点
    const ps = [];
    const off = ((N1 - 1) * GAP) / 2;
    for (let j = 0; j < N1; j++) for (let i = 0; i < N1; i++) for (let k = 0; k < N1; k++) {
      const p = { site: new THREE.Vector3(i * GAP - off, R + 0.004 + j * GAP, k * GAP - off), pos: new THREE.Vector3(), vel: new THREE.Vector3(), s: 0, ph: Math.random() * 10 };
      p.pos.copy(p.site); ps.push(p);
    }
    // 轨迹（跟踪最上层中央的一个分子）
    const TRK = ps[N - 1 - 12];
    const TN = 160, tbuf = new Float32Array(TN * 3);
    const tgeo = new THREE.BufferGeometry(); tgeo.setAttribute('position', new THREE.BufferAttribute(tbuf, 3));
    const trail = new THREE.Line(tgeo, new THREE.LineBasicMaterial({ color: 0xe03131 }));
    scene.add(trail);
    let tcount = 0;
    const hl = new THREE.Mesh(new THREE.SphereGeometry(R * 1.25, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe03131 }));
    scene.add(hl);

    function go(v) {
      if (v === st.target) return;
      st.target = v; segBtns.set(v, true);
      const up = v > st.level;
      out.className = 'feedback show info';
      out.innerHTML = up ? (st.level < 1 && v >= 1 ? '加热：分子振动越来越剧烈，挣脱了固定的位置——<b>熔化</b>（吸热）……' : '继续加热：液面上的分子获得足够的能量，飞离液体——<b>汽化</b>（吸热）……')
        : (st.level > 1 && v <= 1 ? '冷却：气体分子运动变慢，相互靠近，聚集成液体——<b>液化</b>（放热）……' : '继续冷却：分子运动变慢，重新排列到固定的位置上——<b>凝固</b>（放热）……');
    }
    // 每个分子的“状态门槛”：level 连续变化，level 超过门槛的分子改变状态
    ps.forEach((p, i) => { p.mThr = (N - i - 0.5) / N; p.gThr = 1 + (N - i - 0.5) / N; }); // 上层的分子先熔化、先汽化
    function stepPhysics(dt) {
      const L = st.level;
      for (const p of ps) {
        const s = L < p.mThr ? 0 : L < p.gThr ? 1 : 2;
        if (s !== p.s) {
          if (s === 2) p.vel.set(PS.rand(-1, 1), PS.rand(0.6, 1.4), PS.rand(-1, 1)).setLength(1.2);
          if (s === 1 && p.s === 2) p.vel.multiplyScalar(0.2);
          p.s = s;
        }
      }
      const nCond = ps.filter((p) => p.s < 2).length;
      const surf = R + (nCond * GAP * GAP * GAP) / (BOX * BOX) * 1.25 + 0.02;
      const heatAmp = 0.006 + 0.006 * Math.min(1, L);
      for (const p of ps) {
        if (p.s === 0) {
          p.ph += dt * 9;
          p.pos.set(p.site.x + Math.sin(p.ph * 1.3) * heatAmp * 3, p.site.y + Math.sin(p.ph * 1.7 + 1) * heatAmp * 3, p.site.z + Math.cos(p.ph * 1.1) * heatAmp * 3);
          continue;
        }
        if (p.s === 1) {
          p.vel.x += PS.gauss() * 1.6 * dt; p.vel.y += PS.gauss() * 1.6 * dt - 0.9 * dt; p.vel.z += PS.gauss() * 1.6 * dt;
          p.vel.multiplyScalar(0.94);
        } else {
          const sp = p.vel.length() || 1; p.vel.multiplyScalar(1.3 / sp);
        }
        p.pos.addScaledVector(p.vel, dt);
        const lim = BOX / 2 - R;
        if (p.pos.x < -lim) { p.pos.x = -lim; p.vel.x = Math.abs(p.vel.x); }
        if (p.pos.x > lim) { p.pos.x = lim; p.vel.x = -Math.abs(p.vel.x); }
        if (p.pos.z < -lim) { p.pos.z = -lim; p.vel.z = Math.abs(p.vel.z); }
        if (p.pos.z > lim) { p.pos.z = lim; p.vel.z = -Math.abs(p.vel.z); }
        if (p.pos.y < R) { p.pos.y = R; p.vel.y = Math.abs(p.vel.y); }
        if (p.pos.y > BOX - R) { p.pos.y = BOX - R; p.vel.y = -Math.abs(p.vel.y); }
        if (p.s === 1 && p.pos.y > surf) { p.pos.y = surf; p.vel.y = -Math.abs(p.vel.y) * 0.5; }
        if (p.s === 2 && nCond && p.pos.y < surf + R) { p.pos.y = surf + R; p.vel.y = Math.abs(p.vel.y); }
      }
      // 液体分子之间、液体与固体之间的排斥
      const d0 = R * 2.1;
      for (let i = 0; i < N; i++) {
        const a = ps[i];
        if (a.s === 2) continue;
        for (let j = i + 1; j < N; j++) {
          const b = ps[j];
          if (b.s === 2 || (a.s === 0 && b.s === 0)) continue;
          const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 0 && d2 < d0 * d0) {
            const d = Math.sqrt(d2), push = (d0 - d) / d;
            if (a.s === 0) { b.pos.x += dx * push; b.pos.y += dy * push; b.pos.z += dz * push; }
            else if (b.s === 0) { a.pos.x -= dx * push; a.pos.y -= dy * push; a.pos.z -= dz * push; }
            else { const k = push / 2; a.pos.x -= dx * k; a.pos.y -= dy * k; a.pos.z -= dz * k; b.pos.x += dx * k; b.pos.y += dy * k; b.pos.z += dz * k; }
          }
        }
      }
    }
    function sync() {
      ps.forEach((p, i) => {
        m4.makeTranslation(p.pos.x, p.pos.y, p.pos.z);
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, color.setHex(COL[p.s]));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      hl.position.copy(TRK.pos);
      // 轨迹
      tbuf.copyWithin(3, 0, (TN - 1) * 3);
      tbuf[0] = TRK.pos.x; tbuf[1] = TRK.pos.y; tbuf[2] = TRK.pos.z;
      tcount = Math.min(TN, tcount + 1);
      tgeo.setDrawRange(0, tcount);
      tgeo.attributes.position.needsUpdate = true;
    }
    function label() {
      const i = Math.round(st.level);
      const near = Math.abs(st.level - i) < 0.02;
      const info = INFO[i];
      tag.innerHTML = near ? '<b style="color:' + PS.STATE[info.k].c + '">' + info.name + '</b>　约 ' + info.T : st.level < 1 ? '固液共存：<b>熔化 / 凝固</b>中' : '<b>汽化 / 液化</b>中';
      if (near && st.level === st.target) {
        if (out.dataset.k !== String(i)) { out.dataset.k = String(i); out.className = 'feedback show ok'; out.innerHTML = '<b>' + info.name + '：</b>' + info.html; }
      } else out.dataset.k = '';
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.level !== st.target) {
        const d = st.target - st.level, sp = 0.32 * dt;
        st.level = Math.abs(d) < sp ? st.target : st.level + Math.sign(d) * sp;
      }
      const n = 2;
      for (let i = 0; i < n; i++) stepPhysics(dt / n);
      sync(); label();
      controls.update();
      renderer.render(scene, camera);
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    sync();
    out.dataset.k = '';
    label();
    loop.start();
    if (!document.getElementById('s3-style')) document.head.append(h('style', { id: 's3-style' }, `
      .s3-tag{position:absolute;left:12px;top:10px;background:rgba(255,255,255,.92);border-radius:10px;padding:5px 12px;font-size:.92rem;box-shadow:0 2px 8px rgba(0,0,0,.1);pointer-events:none}
    `));
  });
})();
