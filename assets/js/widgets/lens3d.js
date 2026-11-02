/* 第5章第3节：探究凸透镜成像的规律（3D 光具座）——拖动蜡烛、透镜、光屏，光屏上的像按薄透镜公式和离焦模糊实时计算；透过透镜看虚像；三心不同高、遮住半个透镜；记录与分析。依赖 three.js、OrbitControls、optics.js、lens.js */
(function () {
  'use strict';
  const { h } = PS;
  const H0 = 0.15;            // 主光轴到导轨顶面的高度
  const LR = 0.025, A = 0.05; // 透镜半径、直径
  const SW = 0.16, SH = 0.14; // 光屏宽、高
  const TW = 512, TH = 448, PX = TW / SW; // 光屏贴图：每米多少像素

  function canvasTex(w, hh, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    draw(c.getContext('2d'), w, hh);
    return new THREE.CanvasTexture(c);
  }
  // 烛焰小图（光屏上的像用）
  const FLAME = (function () {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 92, 2, 32, 80, 40);
    gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(0.35, 'rgba(255,214,90,1)'); gr.addColorStop(0.75, 'rgba(255,140,40,.85)'); gr.addColorStop(1, 'rgba(255,100,20,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(32, 3); g.bezierCurveTo(62, 60, 58, 124, 32, 125); g.bezierCurveTo(6, 124, 2, 60, 32, 3); g.fill();
    return c;
  })();

  PS.register('lens-bench-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { f: 0.1, xc: 0.20, xl: 0.50, xs: 0.65, eye: false, labels: true, misalign: false, cover: false, rows: [], judge: { o: null, s: null, r: null }, did: { eye: false, mis: false, cover: false } };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const view = h('div', { class: 'stage-3d', style: { background: '#2a303b' } });
    left.append(view);
    const obs = h('div', { class: 'ln-msg' });
    left.append(obs);

    /* ---------- 控件 ---------- */
    const fSeg = PS.ui.seg([{ value: 0.1, label: 'f = 10 cm' }, { value: 0.15, label: 'f = 15 cm' }], st.f, (v) => { st.f = v; update(); });
    const cS = PS.ui.slider({ label: '蜡烛', min: 0, max: 48, step: 0.5, value: st.xc * 100, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.xc = v / 100; update(); } });
    const sS = PS.ui.slider({ label: '光屏', min: 52, max: 100, step: 0.5, value: st.xs * 100, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.xs = v / 100; snap(); update(); } });
    const eyeB = PS.ui.button('👁 拿走光屏，从右侧透过透镜看', () => { st.eye = !st.eye; if (st.eye) st.did.eye = true; camGoal = st.eye ? 'eye' : 'front'; camAnim = 1; update(); }, 'btn btn-sm');
    const scrB = PS.ui.button('🔍 正对光屏看', () => { if (st.eye) return; camGoal = camGoal === 'screen' ? 'front' : 'screen'; camAnim = 1; scrB.innerHTML = camGoal === 'screen' ? '↩ 回到整体视角' : '🔍 正对光屏看'; }, 'btn btn-ghost btn-sm');
    const misT = PS.ui.toggle('烛焰、透镜、光屏中心不在同一高度', false, (v) => { st.misalign = v; if (v) st.did.mis = true; update(); });
    const covT = PS.ui.toggle('用纸板遮住透镜上半部分', false, (v) => { st.cover = v; if (v) st.did.cover = true; update(); });
    const labT = PS.ui.toggle('器材名称', true, (v) => { st.labels = v; });
    const rU = PS.ui.readout('物距 u', '—', 'accent'), rV = PS.ui.readout('光屏到透镜', '—', 'primary'), rQ = PS.ui.readout('光屏上', '—');
    const jO = PS.ui.seg([{ value: '正立', label: '正立' }, { value: '倒立', label: '倒立' }], null, (v) => { st.judge.o = v; });
    const jS = PS.ui.seg([{ value: '放大', label: '放大' }, { value: '等大', label: '等大' }, { value: '缩小', label: '缩小' }], null, (v) => { st.judge.s = v; });
    const jR = PS.ui.seg([{ value: '实像', label: '实像' }, { value: '虚像', label: '虚像' }], null, (v) => { st.judge.r = v; });
    const tbody = h('tbody'), analysis = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 器材（光具座、蜡烛、凸透镜、光屏）'), h('div', { class: 'row' }, fSeg.el), h('div', { class: 'row' }, labT.el)),
      h('div', { class: 'panel' }, h('h4', null, '② 移动蜡烛和光屏'), h('p', { class: 'small muted', style: { margin: '2px 0 4px' }, html: '可以在 3D 画面中<b>拖动底座</b>，也可以用滑块。透镜固定在 50 cm 处（也能拖动）。' }), h('div', { class: 'row' }, cS.el), h('div', { class: 'row' }, sS.el), h('div', { class: 'row' }, scrB, eyeB)),
      h('div', { class: 'panel' }, h('h4', null, '③ 观察并判断像的性质'), h('div', { class: 'readouts', style: { marginTop: 0 } }, rU.el, rV.el, rQ.el), h('div', { class: 'row' }, jO.el, jS.el), h('div', { class: 'row' }, jR.el, PS.ui.button('📝 记录', record, 'btn btn-primary btn-sm'), PS.ui.button('清空', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, '④ 数据记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'u/cm'), h('th', null, 'v/cm'), h('th', null, '像的性质'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis),
      h('div', { class: 'panel' }, h('h4', null, '⑥ 试一试：实验中的问题'), h('div', { class: 'row' }, misT.el), h('div', { class: 'row' }, covT.el)));

    /* ---------- 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a303b);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.01, 10);
    const PRE = {
      front: [new THREE.Vector3(0.36, 0.42, 0.86), new THREE.Vector3(0.52, 0.11, 0)],
    };
    camera.position.copy(PRE.front[0]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(PRE.front[1]);
    controls.enableDamping = true; controls.minDistance = 0.12; controls.maxDistance = 2; controls.maxPolarAngle = Math.PI * 0.49;
    let camGoal = 'front', camAnim = 0;
    scene.add(new THREE.HemisphereLight(0xcfd8e6, 0x3b4252, 0.55));
    const dl = new THREE.DirectionalLight(0xffffff, 0.35); dl.position.set(0.3, 1.2, 0.9); scene.add(dl);
    const glow = new THREE.PointLight(0xffc070, 0.6, 0.5); scene.add(glow);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.6), new THREE.MeshLambertMaterial({ color: 0x5c4630 }));
    desk.position.set(0.5, -0.045, 0); scene.add(desk);
    // 光具座（导轨 + 刻度）
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.025, 0.05), new THREE.MeshLambertMaterial({ color: 0xb8c0cc }));
    rail.position.set(0.5, -0.0125, 0); scene.add(rail);
    const scaleTex = canvasTex(2080, 60, (g, w, hh) => {
      g.fillStyle = '#f8f9fa'; g.fillRect(0, 0, w, hh);
      g.fillStyle = '#212529'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
      for (let c = 0; c <= 100; c++) {
        const x = 40 + c * 20;
        g.fillRect(x - 1, 0, 2, c % 10 === 0 ? 30 : c % 5 === 0 ? 20 : 12);
        if (c % 10 === 0) g.fillText(String(c), x, 54);
      }
      for (let c = 0; c < 100; c++) for (let k = 1; k < 10; k++) { if (k === 5) continue; g.fillRect(40 + c * 20 + k * 2 - 0.5, 0, 1, 6); }
    });
    scaleTex.anisotropy = 4;
    const scaleM = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.03), new THREE.MeshBasicMaterial({ map: scaleTex }));
    scaleM.position.set(0.5, -0.0125, 0.0252); scene.add(scaleM);
    // 底座（滑块）
    function carriage(color) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.022, 0.064), new THREE.MeshLambertMaterial({ color: 0x495057 })); base.position.y = 0.011; g.add(base);
      const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.003, 0.03), new THREE.MeshBasicMaterial({ color })); mark.position.set(0, -0.004, 0.0326); g.add(mark);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.1), new THREE.MeshBasicMaterial({ visible: false })); grip.position.y = 0.02; g.add(grip);
      g.grip = grip;
      scene.add(g);
      return g;
    }
    const rod = (len) => new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 10), new THREE.MeshLambertMaterial({ color: 0x868e96 }));
    // 蜡烛
    const cCar = carriage(0xe8590c);
    const cRod = rod(0.06); cRod.position.y = 0.05; cCar.add(cRod);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 20), new THREE.MeshLambertMaterial({ color: 0x868e96 })); plate.position.y = 0.082; cCar.add(plate);
    const candleG = new THREE.Group(); scene.add(candleG); // 蜡烛（不含底座，便于复制成像）
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xf1e6d0, emissive: 0x2a1a08 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 20), bodyMat); candleG.add(body);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.006, 6), new THREE.MeshLambertMaterial({ color: 0x343a40 })); candleG.add(wick);
    const flameTex = new THREE.CanvasTexture(FLAME);
    const flameMat = new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const flame = new THREE.Sprite(flameMat); flame.scale.set(0.012, 0.025, 1); candleG.add(flame);
    // 透镜
    const lCar = carriage(0x1c7ed6);
    const lRod = rod(H0 - LR - 0.02); lRod.position.y = 0.022 + (H0 - LR - 0.022) / 2; lCar.add(lRod);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(LR + 0.003, 0.003, 10, 40), new THREE.MeshLambertMaterial({ color: 0x343a40 })); ring.rotation.y = Math.PI / 2; ring.position.y = H0; lCar.add(ring);
    const lensGeo = new THREE.SphereGeometry(LR, 36, 18); lensGeo.scale(0.22, 1, 1);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.1, depthWrite: false });
    const lens = new THREE.Mesh(lensGeo, lensMat); lens.position.y = H0; lens.renderOrder = 4; lCar.add(lens);
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.003, LR + 0.006, 2 * LR + 0.01), new THREE.MeshLambertMaterial({ color: 0x343a40 }));
    card.position.set(-0.008, H0 + (LR + 0.006) / 2, 0); lCar.add(card);
    // 透镜范围的模板（透过透镜看时用）
    const mask = new THREE.Mesh(new THREE.CircleGeometry(LR, 40), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }));
    mask.rotation.y = Math.PI / 2; mask.position.y = H0; mask.renderOrder = -10; lCar.add(mask);
    // 光屏
    const sCar = carriage(0x7048e8);
    const sRod = rod(H0 - SH / 2 - 0.015); sRod.position.y = 0.022 + (H0 - SH / 2 - 0.022) / 2; sCar.add(sRod);
    const scrCanvas = document.createElement('canvas'); scrCanvas.width = TW; scrCanvas.height = TH;
    const scrCtx = scrCanvas.getContext('2d');
    const scrTex = new THREE.CanvasTexture(scrCanvas);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: scrTex }));
    scr.rotation.y = -Math.PI / 2; scr.position.set(-0.002, H0, 0); sCar.add(scr);
    const scrBack = new THREE.Mesh(new THREE.BoxGeometry(0.003, SH + 0.006, SW + 0.006), new THREE.MeshLambertMaterial({ color: 0x343a40 })); scrBack.position.set(0.0005, H0, 0); sCar.add(scrBack);
    // 虚像 / 透过透镜看到的像：复制蜡烛（只在透镜范围内显示）
    const imgMatB = new THREE.MeshLambertMaterial({ color: 0xf1e6d0, emissive: 0x2a1a08, side: THREE.DoubleSide, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc });
    const imgBody = new THREE.Mesh(body.geometry, imgMatB); imgBody.matrixAutoUpdate = false; scene.add(imgBody);
    const imgFlameMat = new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc });
    const imgFlame = new THREE.Sprite(imgFlameMat); scene.add(imgFlame);
    const blurMat = new THREE.SpriteMaterial({ map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,150,.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false, depthTest: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc });
    const blurSp = new THREE.Sprite(blurMat); scene.add(blurSp);
    // 透过透镜看时，原来的蜡烛只在透镜以外显示
    const realMats = [bodyMat, flameMat];
    function setEyeStencil(on) { realMats.forEach((m) => { m.stencilWrite = on; m.stencilRef = 1; m.stencilFunc = THREE.NotEqualStencilFunc; m.needsUpdate = true; }); }

    /* ---------- 计算 ---------- */
    const dc = () => (st.misalign ? -0.04 : 0); // 烛焰中心比主光轴低 4 cm
    function optics() {
      const u = st.xl - st.xc, f = st.f, s = st.xs - st.xl;
      const iv = 1 / f - 1 / u; // 1/v
      const v = Math.abs(iv) < 1e-9 ? Infinity : 1 / iv;
      return { u, f, s, v, m: -v / u, real: iv > 1e-9, inf: Math.abs(iv) < 1e-9, b: A * Math.abs(1 - s * iv) };
    }
    function snap() {
      const o = optics();
      if (o.real && Math.abs(st.xs - (st.xl + o.v)) < 0.006 && st.xl + o.v <= 1.0) { st.xs = st.xl + o.v; }
    }
    function sharp() { const o = optics(); return o.real && Math.abs(o.s - o.v) < 0.0008; }
    // 光屏贴图：先在低分辨率画布上画清晰的像，再做圆盘模糊，最后放大叠加到光屏上
    const cA = document.createElement('canvas'), cB = document.createElement('canvas');
    function drawScreen(t) {
      const o = optics(), g = scrCtx;
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#5f666f'; g.fillRect(0, 0, TW, TH);
      if (st.eye) { scrTex.needsUpdate = true; return; }
      const k = -o.s / o.u;                       // 主光线：物高 y → 光屏上 k·y
      const fy = dc() + 0.0125;                    // 烛焰中心（相对主光轴）
      const yC = TH / 2 - k * fy * PX;             // 烛焰中心的像在贴图上的 y
      const R = Math.max(0.5, (o.b / 2) * PX);     // 模糊圆半径（像素）
      const flameH = 0.025 * Math.abs(k) * PX, flameW = flameH * 0.48;
      const q = R > 5 ? Math.max(1 / 24, 5 / R) : 1;
      const w = Math.ceil(TW * q), hh = Math.ceil(TH * q);
      if (cA.width !== w || cA.height !== hh) { cA.width = cB.width = w; cA.height = cB.height = hh; }
      const a = cA.getContext('2d'), b = cB.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, w, hh);
      a.setTransform(q, 0, 0, q, 0, 0);
      const fl = 1 + Math.sin(t * 13) * 0.04;
      // 蜡烛身（被烛焰照亮，较暗）
      a.fillStyle = 'rgba(255,214,160,.22)';
      const bw = 0.02 * Math.abs(k) * PX, bl = 0.06 * Math.abs(k) * PX;
      a.fillRect(TW / 2 - bw / 2, k < 0 ? yC - 0.0125 * Math.abs(k) * PX - bl : yC + 0.0125 * Math.abs(k) * PX, bw, bl);
      a.save(); a.translate(TW / 2, yC); if (k < 0) a.scale(1, -1);
      a.drawImage(FLAME, -flameW / 2, -flameH / 2 * fl, flameW, flameH * fl);
      a.restore();
      b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, w, hh);
      const half = st.cover ? (1 - o.s * (1 / o.f - 1 / o.u) > 0 ? 1 : -1) : 0;
      PS.lens.blur(b, R * q, (c) => c.drawImage(cA, 0, 0), { max: 26, half });
      // 亮度：会聚到像上的光越集中越亮；遮住一半透镜，光减半
      let I = PS.clamp(Math.pow(0.15 / o.s, 2), 0.12, 2.2) * (st.cover ? 0.5 : 1);
      if (R > flameH) I *= PS.clamp(Math.sqrt(R / Math.max(flameH, 4)), 1, 3.5); // 大光斑：适当提亮，便于观察
      g.globalCompositeOperation = 'lighter';
      g.imageSmoothingEnabled = true;
      let left = I;
      while (left > 0.01) { g.globalAlpha = Math.min(1, left); g.drawImage(cB, 0, 0, w, hh, 0, 0, TW, TH); left -= 1; }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      scrTex.needsUpdate = true;
    }
    function update() {
      st.xc = PS.clamp(st.xc, 0, st.xl - 0.02);
      st.xs = PS.clamp(st.xs, st.xl + 0.02, 1.0);
      cS.set(st.xc * 100, true); sS.set(st.xs * 100, true);
      const o = optics();
      // 位置
      cCar.position.x = st.xc; lCar.position.x = st.xl; sCar.position.x = st.xs;
      const fy = H0 + dc(); // 烛焰中心
      const top = fy - 0.0125;
      const bh = top - 0.084;
      body.scale.y = bh; body.position.set(st.xc, 0.084 + bh / 2, 0);
      wick.position.set(st.xc, top + 0.002, 0);
      flame.position.set(st.xc, fy, 0);
      glow.position.set(st.xc, fy + 0.01, 0);
      sCar.visible = !st.eye;
      card.visible = st.cover;
      setEyeStencil(st.eye);
      // 读数
      rU.set((o.u * 100).toFixed(1) + ' cm');
      rV.set(st.eye ? '—' : (o.s * 100).toFixed(1) + ' cm');
      const sh = sharp();
      rQ.set(st.eye ? '（已拿走）' : sh ? '<span class="hl-g">清晰的像</span>' : o.real && o.b < 0.004 ? '较模糊' : o.real ? '模糊' : '光斑');
      // 观察提示
      const fcm = Math.round(st.f * 100);
      let t;
      if (st.eye) {
        if (!o.real && !o.inf) t = '✅ 从光屏一侧透过凸透镜看到了烛焰<b>正立、放大的虚像</b>（像在蜡烛同侧，比蜡烛离透镜更远）。虚像不能用光屏承接，只能用眼睛透过透镜看到。';
        else if (o.inf) t = '蜡烛在焦点上，透过透镜只能看到模糊的一片——<b>不成像</b>。';
        else t = '物体在焦点以外时，透过透镜看到的是模糊的光或<b>倒立的像</b>（成实像）。把蜡烛移到 <b>' + fcm + ' cm 以内</b>（一倍焦距内）再看看。';
      } else if (st.misalign && o.real) t = '⚠️ 烛焰、透镜、光屏的中心<b>不在同一高度</b>：像偏向光屏的' + (dc() < 0 ? '上方' : '下方') + '，甚至跑出光屏。实验前要调节三者中心<b>大致在同一高度</b>，使像成在光屏中央。';
      else if (sh) t = '✅ 光屏上出现<b>清晰</b>的像。仔细观察像的倒正、大小，在右侧判断后点“记录”。' + (st.cover ? '<br>遮住透镜上半部分：像仍然<b>完整</b>，只是<b>变暗</b>了。' : '');
      else if (o.inf) t = '蜡烛在<b>焦点</b>上（u = f = ' + fcm + ' cm）：光经透镜后平行射出，无论怎样移动光屏，都只能得到大小不变的光斑，<b>不成像</b>。';
      else if (!o.real) t = '蜡烛在<b>一倍焦距以内</b>（u &lt; ' + fcm + ' cm）：怎样移动光屏都得不到像，只有一片光斑——成的是<b>虚像</b>。点“拿走光屏，从右侧透过透镜看”。';
      else if (st.xl + o.v > 1.0) t = '像距 v 太大，超出了光具座的范围（光屏放不到那么远）——蜡烛离焦点太近了。把蜡烛稍微<b>远离</b>透镜。';
      else t = '移动光屏，直到光屏上出现<b>最清晰</b>的像（光屏在像的位置附近会自动对齐）。' + (o.s < o.v ? '光屏应该<b>远离</b>透镜。' : '光屏应该<b>靠近</b>透镜。');
      obs.innerHTML = '👀 ' + t;
      analyse();
    }
    function judgeTruth() {
      const o = optics();
      if (o.inf) return null;
      const e = Math.abs(Math.abs(o.m) - 1) < 0.02;
      return { o: o.real ? '倒立' : '正立', s: e ? '等大' : Math.abs(o.m) > 1 ? '放大' : '缩小', r: o.real ? '实像' : '虚像' };
    }
    function record() {
      const o = optics();
      if (o.inf) { PS.toast('蜡烛在焦点上，不成像'); return; }
      if (o.real && st.eye) { PS.toast('成实像时，请放回光屏，在光屏上找到清晰的像再记录'); return; }
      if (o.real && !sharp()) { PS.toast('先移动光屏，找到清晰的像', 'bad'); return; }
      if (!o.real && !st.eye) { PS.toast('光屏上没有像。拿走光屏，透过透镜看一看', 'bad'); return; }
      const J = st.judge;
      if (!J.o || !J.s || !J.r) { PS.toast('先判断像的正倒、大小和虚实'); return; }
      const T = judgeTruth();
      const ok = J.o === T.o && J.s === T.s && J.r === T.r;
      const u = PS.round(o.u * 100, 1);
      if (st.rows.some((r) => Math.abs(r.u - u) < 0.01 && r.f === st.f)) { PS.toast('这个物距已经记录过了，换一个位置'); return; }
      st.rows.push({ u, v: o.real ? PS.round(o.v * 100, 1) : null, f: st.f, txt: T.o + '、' + T.s + '的' + T.r, ok, zone: PS.lens.rule(o.u, st.f).zone });
      if (st.rows.length > 8) st.rows.shift();
      if (ok) PS.sound.good(); else { PS.sound.bad(); PS.toast('判断有误，正确的是：' + T.o + '、' + T.s + '的' + T.r, 'bad'); }
      table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.u.toFixed(1)), h('td', null, r.v == null ? '—' : r.v.toFixed(1)), h('td', { class: 'l', html: (r.ok ? '' : '<span style="color:var(--red)">✘</span> ') + r.txt }))));
      analyse();
    }
    function analyse() {
      const R = st.rows, z = (k) => R.some((r) => r.zone === k);
      const real = R.filter((r) => r.v != null);
      const items = [
        ['u &gt; 2f：倒立、缩小的实像', z(0)],
        ['u = 2f：倒立、等大的实像', z(1)],
        ['f &lt; u &lt; 2f：倒立、放大的实像', z(2)],
        ['u &lt; f：正立、放大的虚像（透过透镜看）', z(4)],
        ['成实像时<b>物近像远像变大</b>（实像至少 3 组：已测 ' + real.length + ' 组）', real.length >= 3],
      ];
      analysis.innerHTML = items.map(([t, ok]) => (ok ? '✅ ' : '⬜ ') + t).join('<br>') + (z(0) && z(2) && z(4) ? '<br><b class="hl-g">结论：一倍焦距分虚实，二倍焦距分大小；实像都是倒立的，虚像是正立的。</b>' : '');
    }

    /* ---------- 拖动底座 ---------- */
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), hit = new THREE.Vector3();
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), planeY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.02);
    let drag = null, grabDx = 0;
    const cv = renderer.domElement;
    const ptr = (e) => { const r = cv.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); };
    const plane = () => { const d = new THREE.Vector3(); camera.getWorldDirection(d); return Math.abs(d.z) > Math.abs(d.y) * 0.6 ? planeZ : planeY; };
    const objs = () => [['c', cCar], ['l', lCar], ['s', sCar]].filter(([, o]) => o.visible);
    function pick() {
      for (const [k, o] of objs()) { if (ray.intersectObject(o.grip, false).length || ray.intersectObject(o, true).filter((x) => x.object !== mask).length) return k; }
      if (ray.intersectObject(candleG, true).length) return 'c';
      return null;
    }
    view.addEventListener('pointerdown', (e) => {
      if (e.target !== cv) return;
      ptr(e);
      const k = pick();
      if (k && ray.ray.intersectPlane(plane(), hit)) { drag = k; grabDx = { c: st.xc, l: st.xl, s: st.xs }[k] - hit.x; controls.enabled = false; cv.setPointerCapture(e.pointerId); e.stopPropagation(); }
    }, true);
    cv.addEventListener('pointermove', (e) => {
      ptr(e);
      if (!drag) { cv.style.cursor = pick() ? 'grab' : ''; return; }
      if (!ray.ray.intersectPlane(plane(), hit)) return;
      const x = PS.round(hit.x + grabDx, 3);
      if (drag === 'c') st.xc = PS.round(x * 200, 0) / 200;
      if (drag === 'l') st.xl = PS.clamp(PS.round(x * 200, 0) / 200, st.xc + 0.02, st.xs - 0.02);
      if (drag === 's') { st.xs = PS.round(x * 1000, 0) / 1000; snap(); }
      update();
    });
    const up = () => { if (drag) { drag = null; controls.enabled = true; } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    // 标签
    const LBL = { c: h('div', { class: 'label3d' }, '蜡烛'), l: h('div', { class: 'label3d' }), s: h('div', { class: 'label3d' }, '光屏'), r: h('div', { class: 'label3d' }, '光具座') };
    Object.values(LBL).forEach((e) => view.append(e));
    const eyeTip = h('div', { class: 'label3d ref', style: { left: '50%', top: '12px', transform: 'translateX(-50%)', display: 'none' } }, '👁 眼睛在光屏一侧，透过凸透镜看蜡烛');
    view.append(eyeTip);
    const v3 = new THREE.Vector3();
    const mImg = new THREE.Matrix4(), mT1 = new THREE.Matrix4(), mS = new THREE.Matrix4(), mT2 = new THREE.Matrix4();
    const loop = PS.loop((dt, t) => {
      const o = optics();
      const fl = 1 + Math.sin(t * 13) * 0.05 + Math.sin(t * 7.3) * 0.04;
      flame.scale.set(0.012, 0.025 * fl, 1);
      glow.intensity = 0.55 + Math.sin(t * 11) * 0.05;
      drawScreen(t);
      // 透过透镜看到的像
      const yc = H0;
      let showImg = false, showBlur = false;
      if (st.eye && !o.inf) {
        const eyeD = camera.position.x - st.xl;
        if (!o.real || eyeD > o.v + 0.04) {
          showImg = true;
          const xi = st.xl + o.v, m = o.m;
          mT2.makeTranslation(-st.xc, -yc, 0); mS.makeScale(Math.abs(m), m, m); mT1.makeTranslation(xi, yc, 0);
          mImg.copy(mT1).multiply(mS).multiply(mT2);
          body.updateMatrixWorld();
          imgBody.matrix.copy(mImg).multiply(body.matrixWorld);
          imgBody.matrixWorldNeedsUpdate = true;
          const fp = new THREE.Vector3(st.xc, H0 + dc(), 0).applyMatrix4(mImg);
          imgFlame.position.copy(fp);
          imgFlame.scale.set(0.012 * Math.abs(m), 0.025 * Math.abs(m) * fl, 1);
          imgFlameMat.rotation = m < 0 ? Math.PI : 0;
        } else showBlur = true;
      }
      imgBody.visible = imgFlame.visible = showImg;
      blurSp.visible = showBlur;
      if (showBlur) { blurSp.position.set(st.xl, H0, 0); blurSp.scale.set(0.06, 0.06, 1); }
      // 摄像机
      if (camAnim > 0) {
        camAnim = Math.max(0, camAnim - dt * 0.7);
        let P, T;
        if (camGoal === 'eye') { P = new THREE.Vector3(st.xl + (o.real ? Math.min(o.v + 0.15, 0.6) : 0.2), H0 + 0.004, 0.0); T = new THREE.Vector3(st.xl - 0.2, H0, 0); }
        else if (camGoal === 'screen') { P = new THREE.Vector3(st.xs - 0.3, H0 + 0.05, 0.17); T = new THREE.Vector3(st.xs, H0, 0); }
        else { P = PRE.front[0]; T = PRE.front[1]; }
        const k = Math.min(1, dt * 5); // 与帧率无关的缓动
        camera.position.lerp(P, k); controls.target.lerp(T, k);
      }
      controls.update();
      renderer.render(scene, camera);
      eyeTip.style.display = st.eye ? '' : 'none';
      eyeB.innerHTML = st.eye ? '↩ 放回光屏' : '👁 拿走光屏，从右侧透过透镜看';
      const W = view.clientWidth, H = view.clientHeight;
      LBL.l.textContent = '凸透镜 f = ' + Math.round(st.f * 100) + ' cm';
      const pos = { c: new THREE.Vector3(st.xc, H0 + dc() + 0.045, 0), l: new THREE.Vector3(st.xl, H0 + LR + 0.03, 0), s: new THREE.Vector3(st.xs, H0 + SH / 2 + 0.025, 0), r: new THREE.Vector3(0.06, 0.02, 0.03) };
      Object.keys(LBL).forEach((k) => {
        const e = LBL[k];
        if (!st.labels || st.eye || (k === 's' && !sCar.visible)) { e.style.display = 'none'; return; }
        v3.copy(pos[k]).project(camera);
        e.style.display = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 ? '' : 'none';
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
    update(); table();
    loop.start();
  });
})();
