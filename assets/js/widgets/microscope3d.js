/* 第5章第5节：3D 显微镜结构——点击部件看作用；转动转换器换物镜、选择目镜，放大倍数 = 目镜 × 物镜；显示光路；转动粗准焦螺旋升降镜筒。依赖 three.js、OrbitControls */
(function () {
  'use strict';
  const { h } = PS;
  const INFO = {
    eye: ['目镜', '靠近<b>眼睛</b>的一组透镜，作用相当于一个凸透镜——<b>放大镜</b>：把物镜成的实像再放大，成<b>正立、放大的虚像</b>。目镜上刻有 5×、10×、16× 等放大倍数。'],
    obj: ['物镜', '靠近<b>被观察物体</b>的一组透镜，作用相当于一个凸透镜——<b>投影仪</b>：标本在它的一倍焦距和二倍焦距之间，成<b>倒立、放大的实像</b>。物镜越长，放大倍数越大。'],
    tube: ['镜筒', '上端装目镜，下端装转换器。物镜成的实像就在镜筒内、目镜的一倍焦距以内。'],
    nose: ['转换器', '上面装有几个放大倍数不同的物镜，转动它可以换用不同的物镜。'],
    stage: ['载物台', '放玻片标本的地方。中央有<b>通光孔</b>，两侧有<b>压片夹</b>固定玻片。'],
    slide: ['玻片标本', '被观察的物体要<b>薄而透明</b>，光才能透过它进入物镜。'],
    mirror: ['反光镜', '一面是平面镜、一面是<b>凹面镜</b>。光线弱时用凹面镜，把光<b>会聚</b>后反射到通光孔中。'],
    diaph: ['遮光器', '上面有大小不同的光圈，可以调节进入镜筒的光的多少。'],
    coarse: ['粗准焦螺旋', '转动时镜筒升降的幅度<b>大</b>，用来找到物像。'],
    fine: ['细准焦螺旋', '转动时镜筒升降的幅度<b>小</b>，使物像更清晰。'],
    arm: ['镜臂', '取放显微镜时握住的部位。'],
    base: ['镜座', '支撑、稳定整个显微镜。'],
  };
  const OBJ = [[4, 0.022, 0xe03131], [10, 0.03, 0xfab005], [40, 0.04, 0x1c7ed6]];

  PS.register('microscope-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { ob: 0, ey: 10, rot: 0, rotGoal: 0, light: true, labels: true, focus: 0, sel: null };
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    const info = h('div', { class: 'ln-msg' });
    const eSeg = PS.ui.seg([5, 10, 16].map((v) => ({ value: v, label: '目镜 ' + v + '×' })), st.ey, (v) => { st.ey = v; buildEye(); upd(); });
    const rM = PS.ui.readout('放大倍数', '—', 'accent');
    const lT = PS.ui.toggle('显示光路', true, (v) => { st.light = v; });
    const nT = PS.ui.toggle('部件名称', true, (v) => { st.labels = v; });
    const fS = PS.ui.slider({ label: '转动粗准焦螺旋', min: 0, max: 30, step: 1, value: 0, fmt: (v) => (v ? '升高 ' + (v / 10).toFixed(1) + ' cm' : '最低'), onInput: (v) => { st.focus = v / 1000; } });
    el.append(view, PS.ui.row(PS.ui.button('🔄 转动转换器（换物镜）', () => { st.ob = (st.ob + 1) % 3; st.rotGoal -= (Math.PI * 2) / 3; upd(); }, 'btn btn-sm'), eSeg.el, h('div', { class: 'readouts', style: { marginTop: 0 } }, rM.el)), PS.ui.row(fS.el, lT.el, nT.el), info);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.01, 10);
    camera.position.set(0.42, 0.34, 0.58);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.17, 0);
    controls.enableDamping = true; controls.minDistance = 0.18; controls.maxDistance = 1.4;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa3b2, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.55); dl.position.set(0.6, 1, 0.8); scene.add(dl);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshLambertMaterial({ color: 0xd4c4a8 }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);

    const parts = [];
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0.25 }, o || {}));
    function part(key, mesh, parent) { mesh.userData.part = key; parts.push(mesh); (parent || scene).add(mesh); return mesh; }
    const DARK = 0x2b2f36, METAL = 0xc9ced6;
    // 镜座（马蹄形）
    const bs = new THREE.Shape();
    bs.moveTo(-0.065, -0.075); bs.lineTo(0.065, -0.075); bs.lineTo(0.065, 0.05); bs.quadraticCurveTo(0.065, 0.09, 0.032, 0.09); bs.lineTo(0.022, 0.025); bs.lineTo(-0.022, 0.025); bs.lineTo(-0.032, 0.09); bs.quadraticCurveTo(-0.065, 0.09, -0.065, 0.05); bs.closePath();
    const baseGeo = new THREE.ExtrudeGeometry(bs, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
    const base = part('base', new THREE.Mesh(baseGeo, mat(DARK)));
    base.rotation.x = Math.PI / 2; base.position.y = 0.023;
    // 镜柱与镜臂
    const pillar = part('arm', new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), mat(DARK)));
    pillar.position.set(0, 0.06, -0.055);
    const armCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.095, -0.058), new THREE.Vector3(0, 0.17, -0.07), new THREE.Vector3(0, 0.24, -0.055), new THREE.Vector3(0, 0.27, -0.025)]);
    part('arm', new THREE.Mesh(new THREE.TubeGeometry(armCurve, 30, 0.013, 12, false), mat(DARK)));
    // 准焦螺旋
    const knobs = [];
    [-1, 1].forEach((s) => {
      const c = part('coarse', new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 28), mat(METAL)));
      c.rotation.z = Math.PI / 2; c.position.set(s * 0.024, 0.15, -0.066); knobs.push(c);
      const f = part('fine', new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 24), mat(METAL)));
      f.rotation.z = Math.PI / 2; f.position.set(s * 0.039, 0.15, -0.066); knobs.push(f);
    });
    // 载物台（带通光孔）
    const ss = new THREE.Shape(); ss.moveTo(-0.055, -0.055); ss.lineTo(0.055, -0.055); ss.lineTo(0.055, 0.055); ss.lineTo(-0.055, 0.055); ss.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.008, 0, Math.PI * 2, true); ss.holes.push(hole);
    const stage = part('stage', new THREE.Mesh(new THREE.ExtrudeGeometry(ss, { depth: 0.008, bevelEnabled: false }), mat(DARK)));
    stage.rotation.x = -Math.PI / 2; stage.position.set(0, 0.112, 0);
    [-1, 1].forEach((s) => { const clip = part('stage', new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.003, 0.04), mat(METAL))); clip.position.set(s * 0.032, 0.123, 0.005); clip.rotation.y = s * 0.3; });
    const slideMat = new THREE.MeshStandardMaterial({ color: 0xd0ebff, transparent: true, opacity: 0.55, roughness: 0.1, emissive: 0x000000 });
    const slide = part('slide', new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.002, 0.026), slideMat)); slide.position.set(0, 0.1215, 0);
    const spec = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0005, 0.012), new THREE.MeshLambertMaterial({ color: 0xc08a50 })); spec.position.set(0, 0.1228, 0); scene.add(spec);
    // 遮光器、反光镜
    const diaph = part('diaph', new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.004, 32), mat(0x495057))); diaph.position.set(0, 0.104, -0.008);
    const mirG = new THREE.Group(); mirG.position.set(0, 0.058, 0); scene.add(mirG);
    const mir = part('mirror', new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 32), mat(0xe7f5ff, { metalness: 0.9, roughness: 0.08 })), mirG);
    mir.rotation.x = -0.45;
    const fork = part('mirror', new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0025, 8, 24, Math.PI), mat(DARK)), mirG); fork.rotation.y = Math.PI / 2; fork.rotation.z = Math.PI;
    const mirPost = part('mirror', new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 8), mat(DARK))); mirPost.position.set(0, 0.06, -0.035); mirPost.rotation.x = Math.PI / 2;
    // 镜头部分（随粗准焦螺旋升降）
    const head = new THREE.Group(); scene.add(head);
    const tube = part('tube', new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 32), mat(0xf1f3f5, { metalness: 0.15 })), head); tube.position.y = 0.245;
    const nose = new THREE.Group(); nose.position.set(0, 0.185, -0.012); head.add(nose);
    part('nose', new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.026, 0.012, 32), mat(METAL)), nose);
    const objs = OBJ.map(([m, L, c], i) => {
      const g = new THREE.Group();
      const a = (i * Math.PI * 2) / 3;
      g.position.set(Math.sin(a) * 0.012, -0.006, Math.cos(a) * 0.012);
      const body = part('obj', new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0078, L, 20), mat(0xdee2e6, { metalness: 0.5 })), g); body.position.y = -L / 2;
      const band = part('obj', new THREE.Mesh(new THREE.CylinderGeometry(0.0079, 0.0079, 0.003, 20), mat(c)), g); band.position.y = -L * 0.3;
      nose.add(g);
      return g;
    });
    let eyeG = null;
    function buildEye() {
      if (eyeG) { head.remove(eyeG); parts.splice(0, parts.length, ...parts.filter((p) => p.userData.eye !== true)); }
      eyeG = new THREE.Group(); head.add(eyeG);
      const L = st.ey === 5 ? 0.045 : st.ey === 10 ? 0.035 : 0.026; // 目镜越短，放大倍数越大
      const e = part('eye', new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.0115, L, 28), mat(0x343a40)), eyeG); e.position.y = 0.3 + L / 2 - 0.004; e.userData.eye = true;
      const lensTop = part('eye', new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.002, 24), new THREE.MeshStandardMaterial({ color: 0x74c0fc, metalness: 0.6, roughness: 0.05 })), eyeG); lensTop.position.y = 0.3 + L - 0.003; lensTop.userData.eye = true;
      eyeG.userData.top = 0.3 + L;
    }
    buildEye();
    // 光路
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.75, depthWrite: false });
    const lightPts = () => { const y = st.focus; return [new THREE.Vector3(0, 0.1, 0.3), new THREE.Vector3(0, 0.058, 0), new THREE.Vector3(0, 0.1225, 0), new THREE.Vector3(0, 0.16 + y, 0), new THREE.Vector3(0, eyeG.userData.top + y, 0), new THREE.Vector3(0, eyeG.userData.top + y + 0.05, 0)]; };
    let lightMesh = null;
    const dots = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff3bf, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: (function () { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 1, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,220,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })() })); s.scale.set(0.012, 0.012, 1); scene.add(s); return s; });
    function buildLight() {
      if (lightMesh) { scene.remove(lightMesh); lightMesh.geometry.dispose(); }
      const path = new THREE.CurvePath(); const p = lightPts();
      for (let i = 1; i < p.length; i++) path.add(new THREE.LineCurve3(p[i - 1], p[i]));
      lightMesh = new THREE.Mesh(new THREE.TubeGeometry(path, 80, 0.0022, 8, false), lightMat);
      scene.add(lightMesh);
      lightMesh.userData.path = path;
    }
    buildLight();
    // 窗户（光源）示意
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff9db })); win.position.set(0, 0.1, 0.32); scene.add(win);

    function upd() {
      const ob = OBJ[st.ob][0];
      rM.set(st.ey + ' × ' + ob + ' = <b>' + st.ey * ob + '</b> 倍');
      showInfo();
    }
    function showInfo() {
      const k = st.sel;
      const base0 = '点击显微镜上的部件，看看它的名称和作用。<b>显微镜的放大倍数 = 目镜放大倍数 × 物镜放大倍数</b>。';
      info.innerHTML = k ? '🔎 <b>' + INFO[k][0] + '</b>：' + INFO[k][1] + (k === 'obj' ? '（当前用的是 ' + OBJ[st.ob][0] + '× 物镜）' : '') : base0;
      parts.forEach((m) => { if (m.material && m.material.emissive) m.material.emissive.setHex(m.userData.part === k ? 0x3b5bdb : 0x000000); });
      if (k && k !== 'slide') slideMat.emissive.setHex(0x000000);
    }
    // 点击选择部件
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
    let down = null;
    const cv = renderer.domElement;
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null;
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(parts, false)[0];
      st.sel = hit ? hit.object.userData.part : null;
      if (st.sel) PS.sound.tick();
      showInfo();
    });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      cv.style.cursor = ray.intersectObjects(parts, false).length ? 'pointer' : '';
    });
    // 标签
    const LB = { eye: [0, 0.36, 0], tube: [0.02, 0.25, 0], nose: [0.03, 0.188, 0], obj: [0.012, 0.15, 0.012], stage: [0.055, 0.12, 0.05], mirror: [0.022, 0.06, 0.02], coarse: [-0.04, 0.17, -0.066], fine: [0.05, 0.135, -0.066], arm: [0, 0.22, -0.075], base: [0.05, 0.03, 0.06], slide: [-0.035, 0.125, 0.012], diaph: [-0.035, 0.1, 0.02] };
    const LBL = {};
    Object.keys(LB).forEach((k) => { LBL[k] = h('div', { class: 'label3d' }, INFO[k][0]); view.append(LBL[k]); });
    const v3 = new THREE.Vector3();
    let lastFocus = -1, lastEy = 0;
    const loop = PS.loop((dt, t) => {
      st.rot += (st.rotGoal - st.rot) * Math.min(1, dt * 5);
      nose.rotation.y = st.rot;
      head.position.y = st.focus;
      knobs.forEach((k, i) => { k.rotation.x = st.focus * (i % 2 ? 60 : 25); });
      if (lastFocus !== st.focus || lastEy !== st.ey) { buildLight(); lastFocus = st.focus; lastEy = st.ey; }
      lightMesh.visible = st.light; win.visible = st.light;
      const path = lightMesh.userData.path;
      dots.forEach((d, i) => { d.visible = st.light; if (st.light) { const u = (t * 0.25 + i / dots.length) % 1; d.position.copy(path.getPointAt(u)); } });
      if (st.light && st.sel !== 'slide') slideMat.emissive.setHex(0x665522); else if (!st.light && st.sel !== 'slide') slideMat.emissive.setHex(0x000000);
      controls.update();
      renderer.render(scene, camera);
      const W = view.clientWidth, H = view.clientHeight;
      Object.keys(LBL).forEach((k) => {
        const e = LBL[k];
        const show = st.labels || st.sel === k;
        if (!show) { e.style.display = 'none'; return; }
        const p = LB[k];
        const yOff = ['eye', 'tube', 'nose', 'obj'].indexOf(k) >= 0 ? st.focus : 0;
        v3.set(p[0], p[1] + yOff, p[2]).project(camera);
        e.className = 'label3d' + (st.sel === k ? ' ref' : '');
        e.style.display = v3.z < 1 ? '' : 'none';
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W) + 'px,' + ((-v3.y * 0.5 + 0.5) * H) + 'px) translate(-50%,-50%)';
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
    if (el.clientWidth && el.clientWidth < 560) { st.labels = false; nT.set(false); }
    void objs;
    upd();
    loop.start();
  });
})();
