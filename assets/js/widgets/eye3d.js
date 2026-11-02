/* 第5章第4节：3D 眼球剖面模型——角膜、虹膜（瞳孔）、晶状体、睫状体、玻璃体、视网膜、视神经；看远 / 看近时晶状体的厚薄变化；近视眼、远视眼成像位置与眼镜矫正。依赖 three.js、OrbitControls、eye.js（PS.eyeModel） */
(function () {
  'use strict';
  const { h } = PS;
  const RS = 1.2, RR = 1.15, YL = 0.72; // 巩膜半径、视网膜半径、晶状体中心（眼睛局部坐标：前方为 +y）
  const LENS_TO_RETINA = YL + RR;         // 局部单位，对应 17 mm

  PS.register('eye-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls || !PS.eyeModel) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js 和 eye.js，加载失败。')); return; }
    const M = PS.eyeModel;
    const st = { obj: 'far', eye: 'normal', glass: false, bright: false, labels: true };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7' } });
    const info = h('div', { class: 'ln-msg' });
    const oSeg = PS.ui.seg([{ value: 'far', label: '看远处' }, { value: 'near', label: '看近处（25 cm）' }], st.obj, (v) => { st.obj = v; rebuild(); });
    const eSeg = PS.ui.seg([{ value: 'normal', label: '正常眼' }, { value: 'myo', label: '近视眼' }, { value: 'hyp', label: '远视眼' }], st.eye, (v) => { st.eye = v; st.glass = false; gT.set(false); rebuild(); });
    const gT = PS.ui.toggle('戴上合适的眼镜', false, (v) => { st.glass = v; rebuild(); });
    const bT = PS.ui.toggle('强光（瞳孔缩小）', false, (v) => { st.bright = v; rebuild(); });
    const nT = PS.ui.toggle('结构名称', true, (v) => { st.labels = v; });
    el.append(view, PS.ui.row(oSeg.el, eSeg.el), PS.ui.row(gT.el, bT.el, nT.el), info);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.05, 50);
    camera.position.set(-1.4, 0.9, 4.6);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(-0.35, 0, 0);
    controls.enableDamping = true; controls.minDistance = 2; controls.maxDistance = 9;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a8a0, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(-1, 2, 3); scene.add(dl);
    // 眼球局部坐标的 +y 朝向世界 −x（光从左边射来）
    const eye = new THREE.Group(); eye.rotation.z = Math.PI / 2; scene.add(eye);
    const HALF = [Math.PI, Math.PI]; // 只保留 z ≤ 0 的一半（剖面）
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(RS, 56, 36, HALF[0], HALF[1], 0.62, Math.PI - 0.62), new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.6 }));
    eye.add(sclera);
    const retina = new THREE.Mesh(new THREE.SphereGeometry(RR, 56, 36, HALF[0], HALF[1], 0.8, Math.PI - 0.8), new THREE.MeshStandardMaterial({ color: 0xf08c7a, roughness: 0.8, side: THREE.BackSide }));
    eye.add(retina);
    // 剖面：巩膜（白）、脉络膜（深红）、视网膜（粉）三层环
    const ring = (r0, r1, c, t0, tl) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 80, 1, t0, tl), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); eye.add(m); return m; };
    ring(1.18, RS, 0xdee2e6, Math.PI / 2 + 0.62, Math.PI * 2 - 1.24);
    ring(1.16, 1.18, 0x862e2e, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6);
    ring(RR - 0.005, 1.16, 0xf783ac, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6);
    // 玻璃体（剖面上淡淡的颜色）
    const vit = new THREE.Mesh(new THREE.CircleGeometry(RR - 0.01, 64), new THREE.MeshBasicMaterial({ color: 0xe7f5ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
    vit.position.z = -0.002; eye.add(vit);
    // 黄斑
    const mac = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshLambertMaterial({ color: 0xfcc419 })); mac.position.set(0, -RR + 0.02, -0.02); eye.add(mac);
    // 角膜
    const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.8, 40, 16, HALF[0], HALF[1], 0, 1.06), new THREE.MeshStandardMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.45, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    cornea.position.y = 0.584; eye.add(cornea);
    // 视神经
    const nerve = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.9, 20), new THREE.MeshStandardMaterial({ color: 0xffe066, roughness: 0.7 }));
    nerve.position.set(0, -RS - 0.35, 0); eye.add(nerve);
    // 虹膜（瞳孔）、睫状体、晶状体：按状态重建
    let iris = null, cil = null, lens = null, lensCut = null, glasses = null;
    const rayG = new THREE.Group(); eye.add(rayG);
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xf76707 });
    const imgDot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: 0x7048e8 })); eye.add(imgDot);
    function solve() {
      const key = st.eye === 'myo' ? 'myo-thick' : st.eye === 'hyp' ? 'hyp-thin' : 'normal';
      const E = M.EYES[key];
      const g = st.glass ? (st.eye === 'myo' ? -3 : st.eye === 'hyp' ? 3 : 0) : 0;
      const s = M.eyeSolve(E, st.obj === 'far' ? 5000 : 250, g, true);
      return { E, g, s, c: (s.P - E.pmin) / Math.max(1e-6, E.pmax - E.pmin), key };
    }
    function rebuild() {
      const R = solve();
      [iris, cil, lens, lensCut, glasses].forEach((m) => { if (m) { (m.parent || eye).remove(m); } });
      const pr = st.bright ? 0.14 : 0.3;
      iris = new THREE.Mesh(new THREE.RingGeometry(pr, 0.66, 48, 1, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8d5a2b, side: THREE.DoubleSide, roughness: 0.8 }));
      iris.rotation.x = -Math.PI / 2; iris.position.y = 0.95; eye.add(iris);
      const thickF = st.eye === 'myo' ? 1.3 : st.eye === 'hyp' ? 0.72 : 1;
      const ty = (0.17 + R.c * 0.09) * thickF; // 晶状体前后方向的半厚度
      lens = new THREE.Mesh(new THREE.SphereGeometry(0.46, 40, 24, HALF[0], HALF[1]), new THREE.MeshStandardMaterial({ color: 0xffec99, transparent: true, opacity: 0.8, roughness: 0.2 }));
      lens.scale.set(1, ty / 0.46, 1); lens.position.y = YL; eye.add(lens);
      lensCut = new THREE.Mesh(new THREE.CircleGeometry(0.46, 48), new THREE.MeshBasicMaterial({ color: 0xffe066, side: THREE.DoubleSide }));
      lensCut.scale.set(1, ty / 0.46, 1); lensCut.position.set(0, YL, 0.001); eye.add(lensCut);
      const tube = 0.1 + R.c * 0.05;
      cil = new THREE.Mesh(new THREE.TorusGeometry(0.66 - R.c * 0.05, tube, 12, 48, Math.PI), new THREE.MeshStandardMaterial({ color: 0xe599f7, roughness: 0.7 }));
      cil.rotation.x = -Math.PI / 2; cil.position.y = YL; eye.add(cil);
      if (st.glass && R.g) {
        glasses = new THREE.Group();
        const gm = new THREE.MeshStandardMaterial({ color: 0xd0bfff, transparent: true, opacity: 0.55, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
        // 用旋转体画透镜截面：中心厚 tc、边缘厚 te
        const tc = R.g > 0 ? 0.13 : 0.03, te = R.g > 0 ? 0.02 : 0.14, pts = [];
        for (let i = 0; i <= 12; i++) { const r = (0.4 * i) / 12; pts.push(new THREE.Vector2(r, -(tc + (te - tc) * (r / 0.4) ** 2))); }
        for (let i = 12; i >= 0; i--) { const r = (0.4 * i) / 12; pts.push(new THREE.Vector2(r, tc + (te - tc) * (r / 0.4) ** 2)); }
        glasses.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 48), gm));
        const frame = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 40), new THREE.MeshStandardMaterial({ color: 0x343a40 })); frame.rotation.x = Math.PI / 2; glasses.add(frame);
        glasses.position.y = 2.15; eye.add(glasses);
      }
      // 光线（画在剖面上）
      while (rayG.children.length) { const c = rayG.children.pop(); c.geometry.dispose(); }
      const vU = isFinite(R.s.v) ? R.s.v * (LENS_TO_RETINA / M.DR) : 1e3; // 像距（局部单位）
      const I = new THREE.Vector2(0, YL - vU);
      const far = st.obj === 'far';
      const vin = (far ? 0 : -4) + R.g;
      [-0.85, -0.45, 0.45, 0.85].forEach((k) => {
        const x = k * pr * 0.95;
        const pts = [];
        const yStart = 3.6, yG = 2.15;
        if (R.g) {
          const xg = x * (1 + vin * 0.05 * (yG - YL));
          pts.push(far ? new THREE.Vector2(xg, yStart) : new THREE.Vector2(0, yStart + 1.2), new THREE.Vector2(xg, yG));
        } else pts.push(far ? new THREE.Vector2(x, yStart) : new THREE.Vector2(0, yStart + 1.2));
        const q = new THREE.Vector2(x, YL);
        pts.push(q);
        // 从晶状体射向像点，直到碰到视网膜
        const d = I.clone().sub(q).normalize();
        const b = q.dot(d), cc = q.lengthSq() - RR * RR, t = -b + Math.sqrt(Math.max(0, b * b - cc));
        pts.push(q.clone().add(d.multiplyScalar(t)));
        const path = new THREE.CurvePath();
        for (let i = 1; i < pts.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(pts[i - 1].x, pts[i - 1].y, 0.02), new THREE.Vector3(pts[i].x, pts[i].y, 0.02)));
        rayG.add(new THREE.Mesh(new THREE.TubeGeometry(path, 60, 0.012, 6, false), rayMat));
      });
      imgDot.position.set(0, I.y, 0.03);
      imgDot.visible = I.y > -RR - 0.6 && I.y < YL;
      // 说明
      const ok = R.s.err < 0.004;
      const where = ok ? '<b class="hl-g">视网膜上</b>' : R.s.v < R.E.dr ? '视网膜<b>前</b>' : '视网膜<b>后</b>';
      let t = '像成在' + where + '。';
      if (st.eye === 'normal') t += far ? '看远处时，睫状体<b>放松</b>，晶状体<b>变薄</b>。' : '看近处时，睫状体<b>收缩</b>，晶状体<b>变厚</b>，折光能力变强。';
      else if (st.eye === 'myo') t += st.glass ? '近视眼戴上<b>凹透镜</b>，光先发散一些，像后移到视网膜上。' : far ? '近视眼的晶状体太厚、折光能力太强，远处物体的像成在视网膜<b>前</b>。' : '近视眼看近处是清楚的。';
      else t += st.glass ? (far ? '戴着凸透镜（老花镜）看远处，反而看不清。' : '远视眼戴上<b>凸透镜</b>，光先会聚一些，像前移到视网膜上。') : far ? '远视眼看远处是清楚的。' : '远视眼的晶状体太薄、折光能力太弱，近处物体的像成在视网膜<b>后</b>。';
      t += '<br><span class="small">晶状体和角膜共同作用相当于<b>凸透镜</b>，视网膜相当于光屏，成<b>倒立、缩小的实像</b>。可以拖动画面从不同方向观察。</span>';
      info.innerHTML = t;
    }
    // 标签
    const LB = { 角膜: [0, 1.4, 0], 瞳孔: [0, 0.98, 0], 虹膜: [0.52, 1.0, 0], 晶状体: [0, YL, 0], 睫状体: [-0.72, YL + 0.05, 0], 玻璃体: [0.35, -0.3, 0], 视网膜: [-0.75, -0.85, 0], 视神经: [0, -1.85, 0], 黄斑: [0.12, -1.0, 0], 巩膜: [0.9, 0.55, 0] };
    const LBL = {};
    Object.keys(LB).forEach((k) => { LBL[k] = h('div', { class: 'label3d' }, k); view.append(LBL[k]); });
    const v3 = new THREE.Vector3();
    const loop = PS.loop(() => {
      controls.update();
      renderer.render(scene, camera);
      const W = view.clientWidth, H = view.clientHeight;
      eye.updateMatrixWorld();
      Object.keys(LBL).forEach((k) => {
        const e = LBL[k];
        if (!st.labels) { e.style.display = 'none'; return; }
        const p = LB[k];
        v3.set(p[0], p[1], p[2]).applyMatrix4(eye.matrixWorld).project(camera);
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
    rebuild();
    loop.start();
  });
})();
