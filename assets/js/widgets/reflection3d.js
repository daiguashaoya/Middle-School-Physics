/* 第4章第2节：探究光的反射定律（3D 实验）——平面镜、可折转 / 倾斜的纸板 ENF、激光笔；读数、记录、三线共面、光路可逆。依赖 three.js、OrbitControls、optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const DEG = Math.PI / 180;
  const BW = 0.3, BH = 0.32, R = 0.27, RP = 0.255; // 纸板半宽、高，激光笔到 O 的距离，量角器半径

  function boardTex(side) {
    const W = 512, H = Math.round((512 * BH) / BW);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fbfbf7'; g.fillRect(0, 0, W, H);
    const cx = side < 0 ? W : 0, cy = H, r = (RP / BW) * W;
    g.strokeStyle = '#adb5bd'; g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy, r, side < 0 ? Math.PI : 1.5 * Math.PI, side < 0 ? 1.5 * Math.PI : 2 * Math.PI); g.stroke();
    g.beginPath(); g.arc(cx, cy, r * 0.62, side < 0 ? Math.PI : 1.5 * Math.PI, side < 0 ? 1.5 * Math.PI : 2 * Math.PI); g.stroke();
    g.font = '700 22px ' + PS.FONT; g.fillStyle = '#495057'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let a = 0; a <= 90; a += 5) {
      const ang = -Math.PI / 2 + side * a * DEG; // 从竖直方向（法线）量起
      const L = a % 10 === 0 ? 26 : 14;
      g.strokeStyle = a % 10 === 0 ? '#495057' : '#adb5bd'; g.lineWidth = a % 10 === 0 ? 2.4 : 1.6;
      g.beginPath(); g.moveTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); g.lineTo(cx + Math.cos(ang) * (r - L), cy + Math.sin(ang) * (r - L)); g.stroke();
      if (a % 10 === 0 && a > 0 && a < 90) g.fillText(String(a), cx + Math.cos(ang) * (r - 46), cy + Math.sin(ang) * (r - 46));
      if (a % 30 === 0 && a > 0 && a < 90) { g.strokeStyle = 'rgba(173,181,189,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * r * 0.62, cy + Math.sin(ang) * r * 0.62); g.stroke(); }
    }
    // 法线 ON（虚线）
    g.strokeStyle = '#868e96'; g.lineWidth = 3; g.setLineDash([14, 10]);
    g.beginPath(); g.moveTo(side < 0 ? W - 2 : 2, H); g.lineTo(side < 0 ? W - 2 : 2, 20); g.stroke(); g.setLineDash([]);
    g.font = '800 64px ' + PS.FONT; g.fillStyle = '#3b5bdb';
    g.fillText(side < 0 ? 'E' : 'F', side < 0 ? 60 : W - 60, 66);
    g.font = '800 34px ' + PS.FONT; g.fillStyle = '#495057';
    g.fillText(side < 0 ? 'N' : '', W - 26, 34);
    g.strokeStyle = '#ced4da'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
    return new THREE.CanvasTexture(c);
  }

  PS.register('reflection-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { i: 40, fold: 0, tilt: 0, smoke: false, labels: true, rev: false, rows: [], did: { fold: false, tilt: false, rev: false, zero: false } };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const view = h('div', { class: 'stage-3d', style: { background: '#dfe4ea' } });
    left.append(view);
    const obs = h('div', { class: 'r3-obs' });
    left.append(obs);

    /* ---------- 控件 ---------- */
    const iS = PS.ui.slider({ label: '入射角', min: 0, max: 80, step: 1, value: st.i, unit: '°', onInput: (v) => { st.i = v; if (v === 0) st.did.zero = true; update(); } });
    const fS = PS.ui.slider({ label: '把 F 板向后折', min: 0, max: 60, step: 1, value: 0, unit: '°', onInput: (v) => { st.fold = v; if (v > 5) st.did.fold = true; update(); } });
    const tS = PS.ui.slider({ label: '纸板向后倾斜', min: 0, max: 30, step: 1, value: 0, unit: '°', onInput: (v) => { st.tilt = v; if (v > 5) st.did.tilt = true; update(); } });
    const smokeT = PS.ui.toggle('喷烟雾显示空气中的光路', false, (v) => { st.smoke = v; update(); });
    const labT = PS.ui.toggle('器材名称', true, (v) => { st.labels = v; });
    const revBtn = PS.ui.button('↩ 光路可逆：让光逆着反射光射入', () => {
      st.rev = !st.rev;
      if (st.rev) { st.fold = 0; st.tilt = 0; fS.set(0, true); tS.set(0, true); st.did.rev = true; }
      revBtn.innerHTML = st.rev ? '↪ 还原：从 E 侧入射' : '↩ 光路可逆：让光逆着反射光射入';
      fS.disable(st.rev); tS.disable(st.rev);
      update();
    }, 'btn btn-sm');
    const rI = PS.ui.readout('入射角 <i class="var">i</i>', '—', 'accent'), rR = PS.ui.readout('反射角 <i class="var">r</i>', '—', 'primary');
    const tbody = h('tbody'), analysis = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 调节入射光线和纸板'), h('div', { class: 'row' }, iS.el), h('div', { class: 'row' }, fS.el), h('div', { class: 'row' }, tS.el)),
      h('div', { class: 'panel' }, h('h4', null, '② 观察'), h('div', { class: 'row' }, smokeT.el), h('div', { class: 'row' }, labT.el), h('div', { class: 'row' }, revBtn)),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数（纸板上的量角器）'), h('div', { class: 'readouts', style: { marginTop: 0 } }, rI.el, rR.el), h('div', { class: 'row' }, PS.ui.button('📝 记录这一组', record, 'btn btn-primary btn-sm'), PS.ui.button('清空', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, '④ 数据记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次数'), h('th', null, '入射角 i'), h('th', null, '反射角 r'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis));

    /* ---------- 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdfe4ea);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.02, 20);
    camera.position.set(0.1, 0.34, 0.74);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.14, 0);
    controls.enableDamping = true; controls.minDistance = 0.4; controls.maxDistance = 2.4; controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa5b1, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(0.6, 1.6, 1.2); scene.add(dl);
    const table3 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.0), new THREE.MeshLambertMaterial({ color: 0xc9a87c }));
    table3.position.y = -0.032; scene.add(table3);
    // 平面镜：玻璃面 + 背面
    const mirrorTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 256, 128); gr.addColorStop(0, '#dbe9f6'); gr.addColorStop(0.5, '#f8fbff'); gr.addColorStop(1, '#c5d8ea'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); return new THREE.CanvasTexture(c); })();
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.012, 0.36), [new THREE.MeshLambertMaterial({ color: 0x5f6b7a }), new THREE.MeshLambertMaterial({ color: 0x5f6b7a }), new THREE.MeshStandardMaterial({ map: mirrorTex, metalness: 0.3, roughness: 0.15 }), new THREE.MeshLambertMaterial({ color: 0x5f6b7a }), new THREE.MeshLambertMaterial({ color: 0x5f6b7a }), new THREE.MeshLambertMaterial({ color: 0x5f6b7a })]);
    mirror.position.y = -0.006; scene.add(mirror);
    // 纸板：整体可绕底边倾斜；F 板可绕 ON 折转
    const boardG = new THREE.Group(); scene.add(boardG);
    const mkHalf = (sd) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 0.004), [new THREE.MeshLambertMaterial({ color: 0xe9ecef }), new THREE.MeshLambertMaterial({ color: 0xe9ecef }), new THREE.MeshLambertMaterial({ color: 0xe9ecef }), new THREE.MeshLambertMaterial({ color: 0xe9ecef }), new THREE.MeshLambertMaterial({ map: boardTex(sd) }), new THREE.MeshLambertMaterial({ color: 0xdee2e6 })]);
      m.position.set((sd * BW) / 2, BH / 2, 0);
      return m;
    };
    const E = mkHalf(-1); boardG.add(E);
    const pivot = new THREE.Group(); boardG.add(pivot);
    const Fm = mkHalf(1); pivot.add(Fm);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, BH, 8), new THREE.MeshLambertMaterial({ color: 0x868e96 }));
    hinge.position.set(0, BH / 2, -0.003); boardG.add(hinge);
    // 激光笔
    const laser = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 16), new THREE.MeshStandardMaterial({ color: 0x868e96, metalness: 0.7, roughness: 0.3 }));
    body.rotation.z = Math.PI / 2; body.position.x = -0.06; laser.add(body);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.012, 16), new THREE.MeshStandardMaterial({ color: 0x343a40 }));
    tip.rotation.z = Math.PI / 2; tip.position.x = -0.002; laser.add(tip);
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.006), new THREE.MeshBasicMaterial({ color: 0xe03131 }));
    btn.position.set(-0.07, 0.008, 0); laser.add(btn);
    scene.add(laser);
    // 激光束：亮芯 + 光晕
    function beam(opacity) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 8), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity }));
      const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 1, 12), new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: opacity * 0.28, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(core, glow); scene.add(g);
      g.set = (a, b) => {
        const d = new THREE.Vector3().subVectors(b, a), L = d.length();
        if (L < 1e-5) { g.visible = false; return; }
        g.visible = true;
        g.position.copy(a).addScaledVector(d, 0.5);
        g.scale.set(1, L, 1);
        g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      };
      return g;
    }
    const bIn = beam(1), bOutF = beam(1), bOutAir = beam(0.55), bInAir = beam(0.55);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffb3b3 }));
    scene.add(spot);
    const spotGlow = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(spotGlow);
    // 烟雾（若干半透明的大球）
    const smoke = new THREE.Group();
    for (let k = 0; k < 14; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false })); s.position.set((Math.random() - 0.5) * 0.9, 0.08 + Math.random() * 0.35, (Math.random() - 0.5) * 0.5); smoke.add(s); }
    scene.add(smoke);

    // 标签
    const LBL = {
      laser: h('div', { class: 'label3d' }, '激光笔'), mirror: h('div', { class: 'label3d' }, '平面镜'),
      inc: h('div', { class: 'label3d moving' }, '入射光线'), ref: h('div', { class: 'label3d moving' }, '反射光线'), on: h('div', { class: 'label3d' }, '法线 ON'), o: h('div', { class: 'label3d' }, '入射点 O'),
    };
    Object.values(LBL).forEach((e) => view.append(e));
    const lblPos = { laser: new THREE.Vector3(), mirror: new THREE.Vector3(0.3, 0, 0.16), inc: new THREE.Vector3(), ref: new THREE.Vector3(), on: new THREE.Vector3(), o: new THREE.Vector3(0, -0.01, 0.03) };
    let refVisible = false;
    const O3 = new THREE.Vector3(0, 0, 0);

    function update() {
      // 纸板姿态
      boardG.rotation.x = -st.tilt * DEG;
      pivot.rotation.y = st.fold * DEG;
      boardG.updateMatrixWorld(true);
      const i = st.i * DEG, off = 0.0032;
      // 入射点 A（纸板局部坐标）
      const sideK = st.rev ? 1 : -1;
      const Aloc = new THREE.Vector3(sideK * R * Math.sin(i), R * Math.cos(i), off);
      const A = Aloc.clone().applyMatrix4(boardG.matrixWorld);
      const Ooff = new THREE.Vector3(0, 0, off).applyMatrix4(boardG.matrixWorld);
      const A0 = new THREE.Vector3(Aloc.x, Aloc.y, 0).applyMatrix4(boardG.matrixWorld); // 光线所在的平面（不含贴纸板的微小偏移）
      const d = new THREE.Vector3().subVectors(O3, A0).normalize();
      // 激光笔
      laser.position.copy(A);
      laser.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3().subVectors(Ooff, A).normalize());
      bIn.set(A, Ooff);
      // 反射光线（镜面在 y = 0 平面）
      const dr = new THREE.Vector3(d.x, -d.y, d.z).normalize();
      // 反射光在纸板哪一半上？（逆射时反射光应在 E 上）
      const target = st.rev ? E : Fm;
      const nT = new THREE.Vector3(0, 0, 1).applyQuaternion(target.getWorldQuaternion(new THREE.Quaternion()));
      const inPlane = Math.abs(dr.dot(nT)) < 0.004;
      refVisible = inPlane;
      const B = O3.clone().addScaledVector(dr, R);
      if (inPlane) { bOutF.set(Ooff.clone().addScaledVector(nT, 0.0002), B.clone().addScaledVector(nT, off)); } else bOutF.visible = false;
      if (!inPlane && st.smoke) bOutAir.set(O3, O3.clone().addScaledVector(dr, 0.45)); else bOutAir.visible = false;
      bInAir.visible = false;
      spot.position.copy(Ooff); spotGlow.position.copy(Ooff);
      smoke.visible = st.smoke;
      // 标签位置
      lblPos.laser.copy(A).add(new THREE.Vector3(0, 0.035, 0));
      lblPos.inc.lerpVectors(A, O3, 0.45).add(new THREE.Vector3(0, 0.02, 0.01));
      lblPos.ref.copy(O3).addScaledVector(dr, R * 0.6).add(new THREE.Vector3(0, 0.02, 0.01));
      lblPos.on.set(0, BH + 0.03, 0).applyMatrix4(boardG.matrixWorld);
      // 读数
      rI.set(st.i + '°');
      rR.set(inPlane ? st.i + '°' : '<span class="small">F 板上看不到</span>');
      let t;
      if (st.rev) t = '让光逆着原来反射光的方向（从 F 板一侧）射到 O 点，反射光恰好沿原来入射光的方向射出——在反射现象中，<b>光路是可逆的</b>。';
      else if (st.tilt > 0.5) t = '纸板没有<b>垂直</b>于镜面放置：法线不在纸板上了，F 板上<b>看不到</b>反射光。' + (st.smoke ? '烟雾显示：反射光射向了纸板的前方。' : '反射光到哪里去了？喷点烟雾看看。') + '所以实验时纸板要与镜面<b>垂直</b>。';
      else if (st.fold > 0.5) t = '把 F 板向后折，F 板上<b>看不到</b>反射光了！' + (st.smoke ? '烟雾显示：反射光仍在原来的平面内（E 板所在的平面）。' : '') + '这说明：反射光线、入射光线和法线在<b>同一平面内</b>。';
      else if (st.i === 0) t = '光<b>垂直</b>射到镜面上（沿法线入射），入射角为 0°，反射光沿<b>原路返回</b>，反射角也为 0°。';
      else t = '激光笔紧贴 E 板射向 O 点，在 F 板上看到了反射光。读一读量角器上的入射角和反射角，记录下来；再改变入射角多测几次。';
      obs.innerHTML = '👀 ' + t;
      analyse();
    }
    function record() {
      if (st.rev) { PS.toast('先点“还原”，从 E 侧入射再记录'); return; }
      if (!refVisible) { PS.toast('F 板上看不到反射光，无法读出反射角', 'bad'); return; }
      if (st.rows.some((r) => r.i === st.i)) { PS.toast('这个入射角已经记录过了，换一个入射角'); return; }
      st.rows.push({ i: st.i, r: st.i });
      if (st.rows.length > 8) st.rows.shift();
      PS.sound.tick(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, k) => tbody.append(h('tr', null, h('td', null, k + 1), h('td', null, r.i + '°'), h('td', null, r.r + '°'))));
      analyse();
    }
    function analyse() {
      const n = st.rows.length;
      const items = [
        ['反射角<b>等于</b>入射角（至少测 3 组，已测 ' + n + ' 组）', n >= 3],
        ['反射光线、入射光线分居<b>法线两侧</b>', n >= 1],
        ['反射光线、入射光线和法线在<b>同一平面内</b>（试试把 F 板向后折）', st.did.fold || st.did.tilt],
        ['光垂直入射时，反射光沿原路返回（入射角调到 0°）', st.did.zero],
        ['在反射现象中，<b>光路可逆</b>', st.did.rev],
      ];
      analysis.innerHTML = items.map(([t, ok]) => (ok ? '✅ ' : '⬜ ') + t).join('<br>') + (items.every((x) => x[1]) ? '<br><b class="hl-g">结论：三线共面，法线居中，两角相等；光路可逆。</b>' : '');
    }

    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt, t) => {
      smoke.children.forEach((s, k) => { s.position.x += Math.sin(t * 0.3 + k) * dt * 0.01; });
      const pulse = 0.22 + Math.sin(t * 6) * 0.05;
      spotGlow.material.opacity = pulse;
      controls.update();
      renderer.render(scene, camera);
      const W = view.clientWidth, H = view.clientHeight;
      Object.keys(LBL).forEach((k) => {
        const e = LBL[k];
        let show = st.labels;
        if (k === 'ref') show = show && (refVisible || st.smoke);
        if (!show) { e.style.display = 'none'; return; }
        v3.copy(lblPos[k]).project(camera);
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
    update(); table();
    loop.start();
  });
})();
