/* 第6章第1节：3D 托盘天平——点击部件看作用；游码归零、调节平衡螺母使横梁平衡；左盘放物体，用镊子加减砝码、拖动游码；平衡后读数并记录；操作不当时给出提示（测量中调平衡螺母、超过称量、物码放反、未调平就测量）。依赖 three.js、OrbitControls、mass.js */
(function () {
  'use strict';
  const { h } = PS;
  const M = PS.mass;
  const INFO = {
    pan: ['托盘', '<b>左盘放物体，右盘放砝码</b>（左物右码）。潮湿的物体和化学药品不能直接放在托盘上。'],
    beam: ['横梁', '横梁是一个等臂杠杆。横梁平衡时：物体的质量 = 右盘中砝码的总质量 + 游码所对的刻度值。'],
    nut: ['平衡螺母', '用来调节横梁平衡，<b>只在测量前调节</b>：指针偏左，向右调；指针偏右，向左调（哪边高，就向哪边调）。测量过程中不能再调。'],
    ruler: ['标尺', '这台天平的称量是 200 g，标尺的量程是 5 g，分度值是 0.2 g。'],
    rider: ['游码', '在标尺上移动游码，相当于往右盘里加小砝码。调平衡前先把游码移到标尺左端的<b>零刻度线</b>处；读数时看游码<b>左边缘</b>对准的刻度。'],
    pointer: ['指针', '随横梁摆动。指针指在分度盘的中央，或者左右摆动的幅度相等，就说明横梁平衡了，不必等它完全停下来。'],
    dial: ['分度盘', '看指针：指针偏向哪一侧，那一侧的托盘就较重（下沉）。'],
    base: ['底座', '使用前要把天平放在<b>水平</b>桌面上。'],
    box: ['砝码盒', '砝码有 100 g、50 g、20 g、20 g、10 g、5 g。加砝码时<b>从大到小</b>试加，最后移动游码。'],
    weight: ['砝码', '要用<b>镊子</b>夹取，轻拿轻放，不能用手拿，以免弄脏、锈蚀，影响质量。'],
    tweezers: ['镊子', '加减砝码、拨动游码都要用镊子。'],
  };
  const OBJS = [
    { key: 'cu', name: '铜块', m: 81.4 },
    { key: 'stone', name: '小石块', m: 26.8 },
    { key: 'apple', name: '苹果', m: 153.6 },
    { key: 'bottle', name: '一瓶矿泉水', m: 560 },
  ];
  const WS = [100, 50, 20, 20, 10, 5];
  const WDIM = { 100: [0.0115, 0.028], 50: [0.0092, 0.022], 20: [0.0068, 0.017], 10: [0.0055, 0.0135], 5: [0.0045, 0.011] };
  let P = null;                              // 支点（three.js 加载后再创建）
  const X0 = -0.105, RL = 0.21;              // 标尺：0 刻度的 x，5 g 的长度
  const S0 = 0.8;                            // 空天平、螺母居中时左盘偏重 0.8 g（需要调节）

  function canvasTex(w, hh, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    draw(c.getContext('2d'), w, hh);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  }

  PS.register('balance-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    P = P || new THREE.Vector3(0, 0.175, 0);
    const st = { rider: 1.4, nut: 0, obj: 0, objSide: null, w: WS.map(() => 'box'), labels: true, sel: null, rows: [], did: { zero: false, cal: false, meas: false, read: false }, warn: 0 };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    const stepsEl = h('ol', { class: 'ms-steps' });
    const obs = h('div', { class: 'ms-msg' });
    const info = h('div', { class: 'ms-msg info small' });
    left.append(view, obs, info, h('div', { class: 'panel', style: { marginTop: '10px' } }, h('h4', null, '实验步骤'), stepsEl));

    /* ---------- 控件 ---------- */
    const STEPS = [['放', '把天平放在水平桌面上'], ['调', '游码归零，再调节平衡螺母，使指针指在分度盘中央'], ['测', '左盘放物体，用镊子从大到小加砝码，再移动游码，使横梁平衡'], ['读', '物体的质量 = 砝码总质量 + 游码示数']];
    const rS = PS.ui.slider({ label: '游码', min: 0, max: 5, step: 0.2, value: st.rider, unit: 'g', fmt: (v) => v.toFixed(1), onInput: (v) => { st.rider = PS.round(v, 1); onRider(); } });
    const objSeg = PS.ui.seg(OBJS.map((o, i) => ({ value: i, label: o.name })), 0, (v) => { clearPans(); st.obj = v; showObj(); upd(); });
    const wBtns = h('div', { class: 'row', style: { gap: '4px' } });
    const wb = WS.map((g, i) => { const b = PS.ui.button(g + ' g', () => toggleW(i), 'btn btn-sm'); wBtns.append(b); return b; });
    const camSeg = PS.ui.seg([{ value: 'all', label: '整体' }, { value: 'dial', label: '看分度盘' }, { value: 'ruler', label: '看标尺' }], 'all', (v) => { camGoal = v; });
    const labT = PS.ui.toggle('部件名称', true, (v) => { st.labels = v; });
    const inp = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '质量' });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') readIt(); });
    const tbody = h('tbody');
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 调节横梁平衡'), h('div', { class: 'row' }, PS.ui.button('游码归零', () => { st.rider = 0; rS.set(0, true); onRider(); }, 'btn btn-sm'), PS.ui.button('◀ 平衡螺母向左', () => turnNut(-1), 'btn btn-sm'), PS.ui.button('向右 ▶', () => turnNut(1), 'btn btn-sm')), h('div', { class: 'row' }, rS.el)),
      h('div', { class: 'panel' }, h('h4', null, '② 称量'), h('div', { class: 'row' }, objSeg.el), h('div', { class: 'row' }, PS.ui.button('放到左盘', () => putObj('L'), 'btn btn-primary btn-sm'), PS.ui.button('放到右盘', () => putObj('R'), 'btn btn-ghost btn-sm'), PS.ui.button('拿下来', () => putObj(null), 'btn btn-ghost btn-sm')),
        h('p', { class: 'small muted', style: { margin: '6px 0 2px' } }, '用镊子加减砝码（也可以点击 3D 画面中的砝码）：'), wBtns),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数与记录'), h('div', { class: 'row' }, h('span', { html: '物体的质量 <span class="var">m</span> =' }), inp, h('span', null, 'g'), PS.ui.button('📝 记录', readIt, 'btn btn-primary btn-sm')),
        h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '物体'), h('th', null, '砝码/g'), h('th', null, '游码/g'), h('th', null, '质量/g'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '视角'), h('div', { class: 'row' }, camSeg.el), h('div', { class: 'row' }, labT.el)));

    /* ---------- 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.01, 10);
    const CAMS = { all: [[0.02, 0.31, 0.7], [0.0, 0.1, 0.04]], dial: [[0.0, 0.1, 0.24], [0.0, 0.075, 0.0]], ruler: [[-0.02, 0.22, 0.27], [-0.02, 0.17, 0.0]] };
    camera.position.set(...CAMS.all[0]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMS.all[1]);
    controls.enableDamping = true; controls.minDistance = 0.12; controls.maxDistance = 1.6; controls.maxPolarAngle = Math.PI * 0.49;
    let camGoal = null;
    controls.addEventListener('start', () => { camGoal = null; });
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.4, 1, 0.7); scene.add(dl);
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.2 }, o || {}));
    const parts = [];
    function part(key, mesh, parent) { mesh.userData.part = key; parts.push(mesh); (parent || scene).add(mesh); return mesh; }
    // 桌面
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 0.55), new THREE.MeshLambertMaterial({ color: 0xcfb58e }));
    desk.position.set(0, -0.015, 0.03); scene.add(desk);
    // 底座与支柱
    const DARK = 0x3a3f47;
    const base = part('base', new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.022, 0.1), mat(DARK)));
    base.position.set(0, 0.013, 0);
    [-0.15, 0.15].forEach((x) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.011, 0.004, 16), mat(0x212529)); f.position.set(x, 0.002, 0.035); scene.add(f); const f2 = f.clone(); f2.position.z = -0.035; scene.add(f2); });
    const pillar = part('base', new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.15, 0.022), mat(0x4b525c)));
    pillar.position.set(0, 0.098, 0);
    // 分度盘
    const dialMat = mat(0xf8f9fa, { metalness: 0, roughness: 0.8, side: THREE.DoubleSide });
    const dial = part('dial', new THREE.Mesh(new THREE.RingGeometry(0.096, 0.122, 40, 1, -Math.PI / 2 - 0.25, 0.5), dialMat));
    dial.position.set(0, P.y, 0.016);
    for (let i = -10; i <= 10; i++) {
      const a = -Math.PI / 2 + i * 0.02, L = i === 0 ? 0.016 : i % 5 === 0 ? 0.011 : 0.007;
      const t = new THREE.Mesh(new THREE.BoxGeometry(i === 0 ? 0.0011 : 0.0006, L, 0.0005), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xe03131 : 0x343a40 }));
      const r = 0.12 - L / 2;
      t.position.set(Math.cos(a) * r, P.y + Math.sin(a) * r, 0.0167); t.rotation.z = a + Math.PI / 2; scene.add(t);
    }
    // 指针
    const pointerG = new THREE.Group(); pointerG.position.set(0, P.y, 0.02); scene.add(pointerG);
    const pn = part('pointer', new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.118, 8), mat(0x1b2333)), pointerG); pn.position.y = -0.059;
    const ptip = part('pointer', new THREE.Mesh(new THREE.ConeGeometry(0.0022, 0.008, 8), mat(0x1b2333)), pointerG); ptip.position.y = -0.117; ptip.rotation.z = Math.PI;
    // 横梁（绕支点转动）
    const beamG = new THREE.Group(); beamG.position.copy(P); scene.add(beamG);
    part('beam', new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.014, 0.01), mat(0x5c636e, { metalness: 0.45 })), beamG);
    const rulerTex = canvasTex(1024, 64, (g, w, hh) => {
      g.fillStyle = '#f8f9fa'; g.fillRect(0, 0, w, hh);
      const x0 = 26, L = w - 52;
      g.strokeStyle = '#212529'; g.fillStyle = '#212529';
      for (let i = 0; i <= 25; i++) { const x = x0 + (i / 25) * L; g.lineWidth = i % 5 ? 2 : 3.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, i % 5 ? 20 : 32); g.stroke(); }
      g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      for (let i = 0; i <= 5; i++) g.fillText(String(i), x0 + (i / 5) * L, 60);
      g.font = 'bold 20px sans-serif'; g.fillText('g', w - 10, 60);
    });
    const ruler = part('ruler', new THREE.Mesh(new THREE.PlaneGeometry(RL * 1024 / (1024 - 52), 0.012), new THREE.MeshBasicMaterial({ map: rulerTex })), beamG);
    ruler.position.set(X0 + RL / 2, 0, 0.0052);
    const riderM = part('rider', new THREE.Mesh(new THREE.BoxGeometry(0.0065, 0.019, 0.016), mat(0xf08c00, { metalness: 0.1 })), beamG);
    const riderGrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.03), new THREE.MeshBasicMaterial({ visible: false })); beamG.add(riderGrip);
    const nuts = [-1, 1].map((sd) => {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.03, 10), mat(0x9aa1ab, { metalness: 0.7 })); rod.rotation.z = Math.PI / 2; rod.position.x = sd * 0.175; beamG.add(rod);
      const n = part('nut', new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.009, 6), mat(0xc9ced6, { metalness: 0.8, roughness: 0.3 })), beamG); n.rotation.z = Math.PI / 2;
      return n;
    });
    part('beam', new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 12), mat(0x212529)), beamG).rotation.x = Math.PI / 2;
    // 托盘（始终水平）
    const pans = [-1, 1].map(() => {
      const g = new THREE.Group(); scene.add(g);
      part('pan', new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.045, 8), mat(0x6c737e)), g).position.y = 0.0225;
      const holder = part('pan', new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, 0.006), mat(0x6c737e)), g); holder.position.y = 0.045;
      const h2 = holder.clone(); h2.rotation.y = Math.PI / 2; g.add(h2); h2.userData.part = 'pan'; parts.push(h2);
      const pan = part('pan', new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.054, 0.005, 40), mat(0xe9ecef, { metalness: 0.25, roughness: 0.35 })), g); pan.position.y = 0.049;
      const rim = part('pan', new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.0018, 8, 40), mat(0xced4da, { metalness: 0.3, roughness: 0.35 })), g); rim.rotation.x = Math.PI / 2; rim.position.y = 0.0515;
      return g;
    });
    const PAN_TOP = 0.052;
    // 砝码盒
    const BOX = new THREE.Vector3(0.265, 0, 0.125);
    const boxG = new THREE.Group(); boxG.position.copy(BOX); scene.add(boxG);
    part('box', new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.026, 0.07), mat(0x8b2e2e, { metalness: 0, roughness: 0.7 })), boxG).position.y = 0.013;
    const lid = part('box', new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.006, 0.07), mat(0x8b2e2e, { metalness: 0, roughness: 0.7 })), boxG); lid.position.set(0, 0.04, -0.062); lid.rotation.x = -1.25;
    const felt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.002, 0.062), mat(0x1f3b5a, { metalness: 0, roughness: 0.9 })); felt.position.y = 0.0265; boxG.add(felt);
    const SLOT = [-0.062, -0.03, -0.004, 0.018, 0.04, 0.06];
    SLOT.forEach((x, i) => { const r = WDIM[WS[i]][0] + 0.0015; const hole = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: 0x0d1626 })); hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.0277, 0); boxG.add(hole); });
    // 砝码
    const brass = mat(0xe8b84a, { metalness: 0.35, roughness: 0.3, emissive: 0x2a1c00 });
    const wM = WS.map((g, i) => {
      const [r, hh] = WDIM[g];
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 24), brass); body.position.y = hh / 2;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.36, r * 0.42, hh * 0.18, 16), brass); neck.position.y = hh + hh * 0.09;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 0.52, 16, 12), brass); knob.position.y = hh * 1.18 + r * 0.4; knob.scale.y = 0.75;
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.5, r * 0.75), new THREE.MeshBasicMaterial({ map: canvasTex(128, 64, (c) => { c.fillStyle = '#5c3d05'; c.font = 'bold 44px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(g + 'g', 64, 34); }), transparent: true }));
      lab.position.set(0, hh * 0.5, r + 0.0003);
      [body, neck, knob, lab].forEach((m) => { m.userData.part = 'weight'; m.userData.wi = i; parts.push(m); grp.add(m); });
      grp.userData.top = hh * 1.18 + r * 0.9;
      scene.add(grp);
      return grp;
    });
    // 镊子
    const tw = new THREE.Group(); scene.add(tw);
    [-1, 1].forEach((sd) => { const leg = part('tweezers', new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.1, 0.0015), mat(0xadb5bd, { metalness: 0.9, roughness: 0.2 })), tw); leg.position.set(sd * 0.004, 0.05, 0); leg.rotation.z = -sd * 0.05; });
    const TW_REST = { p: new THREE.Vector3(BOX.x - 0.02, 0.031, BOX.z + 0.05), r: new THREE.Euler(Math.PI / 2, 0, 1.4) };
    tw.position.copy(TW_REST.p); tw.rotation.copy(TW_REST.r);
    // 被测物体
    const STAGE = new THREE.Vector3(-0.25, 0, 0.12);
    const objMeshes = OBJS.map((o) => {
      const g = new THREE.Group();
      let hgt = 0.02;
      if (o.key === 'cu') { const s = 0.021; const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mat(0xd9895a, { metalness: 0.35, roughness: 0.35 })); m.position.y = s / 2; g.add(m); hgt = s; }
      else if (o.key === 'stone') { const geo = new THREE.IcosahedronGeometry(0.014, 1); const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const k = 0.82 + 0.3 * Math.abs(Math.sin(i * 12.9898)); pos.setXYZ(i, pos.getX(i) * k * 1.2, pos.getY(i) * k * 0.75, pos.getZ(i) * k); } geo.computeVertexNormals(); const m = new THREE.Mesh(geo, mat(0x8f877c, { metalness: 0, roughness: 0.95, flatShading: true })); m.position.y = 0.0105; g.add(m); hgt = 0.021; }
      else if (o.key === 'apple') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.034, 28, 20), mat(0xd6302b, { metalness: 0, roughness: 0.45 })); m.scale.y = 0.9; m.position.y = 0.031; g.add(m); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.014, 6), mat(0x5c3d05)); s.position.y = 0.066; g.add(s); hgt = 0.068; }
      else { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.17, 28), new THREE.MeshStandardMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.6, roughness: 0.1 })); b.position.y = 0.085; g.add(b); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.03, 20), b.material); n.position.y = 0.185; g.add(n); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.014, 20), mat(0x1c7ed6)); cap.position.y = 0.207; g.add(cap); const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.0325, 0.0325, 0.05, 28, 1, true), mat(0x2b8a3e, { metalness: 0 })); lbl.position.y = 0.09; g.add(lbl); hgt = 0.214; }
      g.traverse((m) => { if (m.isMesh) { m.userData.part = 'obj'; parts.push(m); } });
      g.userData.hgt = hgt;
      g.position.copy(STAGE); g.visible = false; scene.add(g);
      return g;
    });

    /* ---------- 物理 ---------- */
    const beam = M.beam();
    const W = (side) => WS.reduce((s, g, i) => s + (st.w[i] === side ? g : 0), 0);
    const wSide = () => (st.objSide === 'R' ? 'L' : 'R');
    function delta() {
      const o = OBJS[st.obj];
      const L = (st.objSide === 'L' && !moving(objMeshes[st.obj]) ? o.m : 0) + WS.reduce((s, g, i) => s + (st.w[i] === 'L' && !moving(wM[i]) ? g : 0), 0);
      const R = (st.objSide === 'R' && !moving(objMeshes[st.obj]) ? o.m : 0) + WS.reduce((s, g, i) => s + (st.w[i] === 'R' && !moving(wM[i]) ? g : 0), 0);
      return L - R - st.rider - st.nut + S0;
    }
    const D0 = () => S0 - st.nut; // 空盘、游码归零时的不平衡量
    const loaded = () => st.objSide || st.w.some((s) => s !== 'box');
    const balanced = () => Math.abs(delta()) < 0.05;

    /* ---------- 动画（镊子夹砝码、放物体） ---------- */
    const anims = [];
    const moving = (o) => anims.some((a) => a.o === o);
    function slotPos(i) { return new THREE.Vector3(BOX.x + SLOT[i], 0.0277 - 0.006, BOX.z); }
    function panPos(side) { const g = pans[side === 'L' ? 0 : 1]; return new THREE.Vector3(g.position.x, g.position.y + PAN_TOP, g.position.z); }
    const OFF = [[0, -0.022], [0.03, -0.018], [-0.03, -0.018], [0.0, 0.022], [0.03, 0.02], [-0.03, 0.02]];
    function wTarget(i) {
      const s = st.w[i];
      if (s === 'box') return slotPos(i);
      const list = WS.map((g, j) => j).filter((j) => st.w[j] === s);
      const k = list.indexOf(i), p = panPos(s);
      const crowd = st.objSide === s ? 0.5 : 0; // 和物体同盘时往边上放（一般不会）
      return p.add(new THREE.Vector3(OFF[k][0] + crowd * 0.02, 0, OFF[k][1]));
    }
    function oTarget() { return st.objSide ? panPos(st.objSide) : STAGE.clone(); }
    function animate(o, toFn, dur, onEnd, tweez) {
      anims.push({ o, from: o.position.clone(), toFn, t: 0, dur: dur || 0.8, onEnd, tweez });
    }

    /* ---------- 操作 ---------- */
    function toast(msg, bad) { PS.toast(msg, bad ? 'bad' : 'ok'); bad ? PS.sound.bad() : PS.sound.tick(); }
    function onRider() {
      if (st.rider === 0) st.did.zero = true;
      upd();
    }
    function turnNut(d) {
      if (loaded()) { toast('测量过程中<b>不能</b>调节平衡螺母！应加减砝码或移动游码。', true); st.warn++; showWhy('nut'); return; }
      st.nut = PS.round(PS.clamp(st.nut + d * 0.1, -2, 2), 1);
      if (st.rider !== 0) obsNote = '⚠️ 游码还没有归零就调平衡螺母——这样调好的天平，测得的质量会<b>偏大</b>。先把游码移到零刻度线处。';
      else obsNote = '';
      PS.sound.tick();
      upd();
    }
    let obsNote = '';
    function showWhy(k) { st.sel = k; showInfo(); }
    function putObj(side) {
      if (anims.length) return;
      const o = OBJS[st.obj];
      if (side && st.objSide === side) return;
      if (side && !st.objSide && Math.abs(D0()) > 0.05 && !st.did.cal) toast('还没有调节横梁平衡！应先调平衡再测量。', true);
      if (side === 'R') toast('物体放在了右盘，砝码要放在左盘。注意读数方法会不同哦。', false);
      // 换盘时先把砝码收回
      if (st.objSide && side && side !== st.objSide) WS.forEach((g, i) => { if (st.w[i] !== 'box') { st.w[i] = 'box'; animate(wM[i], () => slotPos(i), 0.5, null, true); } });
      st.objSide = side;
      const om = objMeshes[st.obj];
      animate(om, oTarget, 0.9, () => {
        beam.kick(side === 'L' ? 1.2 : side === 'R' ? -1.2 : 0);
        if (side && o.m > M.CAP + M.RMAX) {
          toast('一瓶矿泉水约 560 g，超过了天平的称量（200 g）！会损坏天平，赶快拿下来。', true);
          setTimeout(() => { if (st.objSide && OBJS[st.obj].m > 205) putObj(null); }, 1800);
        }
        upd();
      });
      upd();
    }
    function toggleW(i) {
      if (anims.length) return;
      if (st.w[i] === 'box') {
        if (!st.objSide) { toast('先把物体放到托盘上，再加砝码。', true); return; }
        st.w[i] = wSide();
      } else st.w[i] = 'box';
      animate(wM[i], () => wTarget(i), 0.8, () => { beam.kick(0.25 * (st.w[i] === 'L' ? 1 : -1)); upd(); }, true);
      upd();
    }
    function clearPans() {
      WS.forEach((g, i) => { if (st.w[i] !== 'box') { st.w[i] = 'box'; animate(wM[i], () => slotPos(i), 0.5, null, false); } });
      if (st.objSide) { st.objSide = null; animate(objMeshes[st.obj], oTarget, 0.5); }
    }
    function showObj() { objMeshes.forEach((m, i) => { m.visible = i === st.obj; if (i !== st.obj) m.position.copy(STAGE); }); }
    function readIt() {
      const x = parseFloat(inp.value.replace(/[，,\s]/g, ''));
      if (isNaN(x)) { inp.focus(); return; }
      const o = OBJS[st.obj];
      if (!st.objSide || anims.length) { toast('先把物体放到托盘上称量。', true); return; }
      if (!balanced()) { toast('天平还没有平衡，指针不在分度盘中央，不能读数。', true); return; }
      const Wt = W(wSide());
      const read = st.objSide === 'L' ? Wt + st.rider : Wt - st.rider;
      if (Math.abs(x - read) > 1e-6) {
        let why = '';
        if (st.objSide === 'R' && Math.abs(x - (Wt + st.rider)) < 1e-6) why = '物体在右盘时，m<sub>物</sub> = m<sub>砝</sub> − m<sub>游</sub>。';
        else if (Math.abs(x - Wt) < 1e-6) why = '别忘了加上游码的示数。';
        obs.className = 'ms-msg bad';
        obs.innerHTML = '✘ 读数不对。' + why + '砝码共 ' + Wt + ' g，游码示数 ' + M.fmt(st.rider) + ' g。';
        PS.sound.bad();
        return;
      }
      const err = PS.round(read - o.m, 2);
      st.rows.push([o.name + (st.objSide === 'R' ? '（放在右盘）' : ''), Wt, st.rider, read, err]);
      table();
      st.did.read = true;
      upd();
      obs.className = 'ms-msg ' + (Math.abs(err) < 1e-6 ? 'ok' : 'bad');
      obs.innerHTML = Math.abs(err) < 1e-6
        ? '✔ 读数正确：<b>' + o.name + '的质量是 ' + M.fmt(read) + ' g</b>。' + (st.objSide === 'R' ? '（物码放反了也能算对，但规范操作是“左物右码”。）' : '')
        : '读数方法没错，但' + o.name + '的真实质量是 ' + M.fmt(o.m) + ' g，测得的 ' + M.fmt(read) + ' g 偏' + (err > 0 ? '大' : '小') + ' ' + M.fmt(Math.abs(err)) + ' g。原因：<b>测量前横梁没有调平衡</b>' + (st.nut !== S0 && Math.abs(S0 - st.nut - 0) > 0.05 ? '（游码归零、空盘时，指针不在分度盘中央）' : '') + '。';
      PS.sound.good();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r[0]), h('td', null, String(r[1])), h('td', null, M.fmt(r[2])), h('td', null, h('b', null, M.fmt(r[3]))))));
    }

    /* ---------- 状态与提示 ---------- */
    function upd() {
      const d = delta(), o = OBJS[st.obj];
      if (!loaded() && st.rider === 0 && Math.abs(d) < 0.05) st.did.cal = true;
      if (st.objSide && balanced() && !anims.length) st.did.meas = true;
      const done = [true, st.did.cal, st.did.meas, st.did.read];
      stepsEl.innerHTML = '';
      const cur = done.indexOf(false);
      STEPS.forEach(([t, d2], i) => stepsEl.append(h('li', { class: done[i] ? 'done' : i === cur ? 'cur' : '' }, h('span', { class: 'n' }, done[i] ? '✓' : String(i + 1)), h('span', { html: '<b>' + t + '</b>：' + d2 }))));
      wb.forEach((b, i) => { b.classList.toggle('btn-accent', st.w[i] !== 'box'); b.innerHTML = (st.w[i] !== 'box' ? '✓ ' : '') + WS[i] + ' g'; });
      // 提示
      const div = Math.round(PS.clamp(d / 0.1, -99, 99));
      const dir = d > 0.05 ? '左' : d < -0.05 ? '右' : '';
      let s = '';
      if (!st.objSide && !st.w.some((x) => x !== 'box')) {
        if (st.rider !== 0) s = '游码在 ' + M.fmt(st.rider) + ' g 处。调节横梁平衡前，先把游码移到标尺左端的<b>零刻度线</b>处。';
        else if (!dir) s = '✔ 指针指在分度盘中央，<b>横梁平衡了</b>。可以把物体放到左盘开始称量。';
        else s = '指针偏' + dir + (Math.abs(div) >= 10 ? '（满偏）' : ' ' + Math.abs(div) + ' 格') + '：' + dir + '盘较重，应把平衡螺母向<b>' + (dir === '左' ? '右' : '左') + '</b>调。';
        if (obsNote && st.rider !== 0) s = obsNote;
      } else if (st.objSide) {
        const ws = wSide() === 'R' ? '右' : '左';
        if (o.m > 205) s = '⚠️ 物体的质量超过了天平的称量（200 g），不能用这台天平称！';
        else if (!dir) s = '✔ 天平平衡了：读出砝码的总质量和游码的示数，算出物体的质量。';
        else if (st.objSide === 'L') s = '指针偏' + dir + (Math.abs(div) >= 10 ? '（满偏）' : ' ' + Math.abs(div) + ' 格') + '：' + (dir === '左' ? '物体较重，<b>加砝码</b>或<b>向右移动游码</b>。' : '砝码较重，<b>换小一点的砝码</b>或<b>向左移动游码</b>。') + (W('R') > o.m ? '（砝码已经比物体重了）' : '');
        else s = '物体在右盘，砝码在' + ws + '盘。指针偏' + dir + '。';
      } else s = '把物体放到托盘上再加砝码。';
      if (anims.length) s = '……';
      obs.className = 'ms-msg' + (s.indexOf('✔') === 0 ? ' ok' : s.indexOf('⚠️') === 0 ? ' bad' : '');
      obs.innerHTML = s;
      showInfo();
    }
    function showInfo() {
      const k = st.sel;
      info.innerHTML = k ? '🔎 <b>' + INFO[k][0] + '</b>：' + INFO[k][1] : '点击天平上的部件，看看它的名称和作用。拖动横梁上的<b>游码</b>可以改变示数；点击砝码可以用镊子把它放上托盘或取下。';
      parts.forEach((m) => { if (m.material && m.material.emissive && m.userData.part !== 'weight') m.material.emissive.setHex(m.userData.part === k ? 0x2b3f9a : 0x000000); });
    }

    /* ---------- 点击、拖动游码 ---------- */
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), hit = new THREE.Vector3();
    const cv = renderer.domElement;
    const ptr = (e) => { const r = cv.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); };
    const rPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.006);
    let drag = false, down = null, grab = 0;
    view.addEventListener('pointerdown', (e) => {
      if (e.target !== cv) return;
      ptr(e); down = { x: e.clientX, y: e.clientY };
      if (ray.intersectObjects([riderM, riderGrip], false).length && ray.ray.intersectPlane(rPlane, hit)) {
        const lp = beamG.worldToLocal(hit.clone());
        drag = true; grab = (X0 + st.rider * RL / 5) - lp.x; controls.enabled = false; cv.setPointerCapture(e.pointerId); e.stopPropagation();
        st.sel = 'rider'; showInfo();
      }
    }, true);
    cv.addEventListener('pointermove', (e) => {
      ptr(e);
      if (drag) {
        if (!ray.ray.intersectPlane(rPlane, hit)) return;
        const lp = beamG.worldToLocal(hit.clone());
        const v = PS.clamp(Math.round((((lp.x + grab - X0) / RL) * 5) / 0.2) * 0.2, 0, 5);
        if (Math.abs(v - st.rider) > 1e-6) { st.rider = PS.round(v, 1); rS.set(st.rider, true); PS.sound.tick(); onRider(); }
        return;
      }
      cv.style.cursor = ray.intersectObjects([riderM, riderGrip], false).length ? 'ew-resize' : ray.intersectObjects(parts, false).length ? 'pointer' : '';
    });
    cv.addEventListener('pointerup', (e) => {
      if (drag) { drag = false; controls.enabled = true; return; }
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null; ptr(e);
      const hits = ray.intersectObjects(parts, false);
      const hm = hits[0] && hits[0].object;
      if (!hm) { st.sel = null; showInfo(); return; }
      const k = hm.userData.part;
      if (k === 'weight') { st.sel = 'weight'; toggleW(hm.userData.wi); }
      else if (k === 'obj') { putObj(st.objSide ? null : 'L'); }
      else { st.sel = k; PS.sound.tick(); }
      showInfo();
    });
    cv.addEventListener('pointercancel', () => { drag = false; controls.enabled = true; });

    /* ---------- 标签 ---------- */
    const LB = { pan: () => new THREE.Vector3(pans[0].position.x - 0.04, pans[0].position.y + 0.065, 0.03), beam: () => new THREE.Vector3(0.125, P.y - 0.022, 0.01), nut: () => new THREE.Vector3(0.19, P.y + 0.018, 0), ruler: () => new THREE.Vector3(-0.07, P.y - 0.022, 0.01),
      rider: () => beamG.localToWorld(new THREE.Vector3(X0 + st.rider * RL / 5, 0.022, 0.008)), pointer: () => new THREE.Vector3(0.012, 0.115, 0.02), dial: () => new THREE.Vector3(0.05, 0.06, 0.02), base: () => new THREE.Vector3(-0.12, 0.03, 0.05), box: () => new THREE.Vector3(BOX.x, 0.065, BOX.z), tweezers: () => tw.position.clone().add(new THREE.Vector3(0, 0.02, 0)) };
    const LBL = {};
    Object.keys(LB).forEach((k) => { LBL[k] = h('div', { class: 'label3d' }, INFO[k][0]); view.append(LBL[k]); });
    const objLbl = h('div', { class: 'label3d' }); view.append(objLbl);
    const v3 = new THREE.Vector3();

    /* ---------- 循环 ---------- */
    const loop = PS.loop((dt) => {
      // 摄像机缓动
      if (camGoal) {
        const [p, t] = CAMS[camGoal], k = Math.min(1, dt * 4);
        camera.position.lerp(v3.set(...p), k); controls.target.lerp(new THREE.Vector3(...t), k);
        if (camera.position.distanceTo(v3.set(...p)) < 0.002) camGoal = null;
      }
      beam.step(dt, M.tiltOf(delta()));
      const th = beam.a * 0.05;
      beamG.rotation.z = th;
      pointerG.rotation.z = -beam.a * 0.2;
      // 托盘随横梁上下
      [-1, 1].forEach((sd, i) => { const ex = P.x + sd * 0.128 * Math.cos(th), ey = P.y + sd * 0.128 * Math.sin(th); pans[i].position.set(ex, ey + 0.005, 0); });
      riderM.position.set(X0 + (st.rider * RL) / 5 + 0.00325, 0, 0); riderGrip.position.copy(riderM.position);
      nuts.forEach((n, i) => { n.position.x = (i ? 1 : -1) * 0.172 + st.nut * 0.006; });
      // 动画
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i];
        a.t = Math.min(1, a.t + dt / a.dur);
        const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2;
        const to = a.toFn();
        a.o.position.lerpVectors(a.from, to, e);
        a.o.position.y += Math.sin(Math.PI * a.t) * 0.09;
        if (a.tweez) { tw.position.set(a.o.position.x, a.o.position.y + a.o.userData.top, a.o.position.z); tw.rotation.set(0, 0, 0.12); }
        if (a.t >= 1) { anims.splice(i, 1); if (a.onEnd) a.onEnd(); if (!anims.length) upd(); }
      }
      if (!anims.some((a) => a.tweez)) { tw.position.lerp(TW_REST.p, Math.min(1, dt * 4)); tw.rotation.x += (TW_REST.r.x - tw.rotation.x) * Math.min(1, dt * 4); tw.rotation.z += (TW_REST.r.z - tw.rotation.z) * Math.min(1, dt * 4); }
      // 静止的东西跟着托盘
      wM.forEach((m, i) => { if (!moving(m)) m.position.copy(wTarget(i)); });
      const om = objMeshes[st.obj];
      if (!moving(om)) om.position.copy(oTarget());
      controls.update();
      renderer.render(scene, camera);
      // 标签
      const Wd = view.clientWidth, Hd = view.clientHeight;
      const place = (e, p, show) => {
        if (!show) { e.style.display = 'none'; return; }
        v3.copy(p).project(camera);
        e.style.display = v3.z < 1 ? '' : 'none';
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * Wd) + 'px,' + ((-v3.y * 0.5 + 0.5) * Hd) + 'px) translate(-50%,-50%)';
      };
      Object.keys(LBL).forEach((k) => { LBL[k].className = 'label3d' + (st.sel === k ? ' ref' : ''); place(LBL[k], LB[k](), st.labels || st.sel === k); });
      objLbl.textContent = OBJS[st.obj].name;
      place(objLbl, om.position.clone().add(new THREE.Vector3(0, om.userData.hgt + 0.02, 0)), st.labels || !st.objSide);
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
    void opts;
    showObj();
    upd();
    loop.start();
  });
})();
