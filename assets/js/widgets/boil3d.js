/* 第3章第3节：探究水沸腾时温度变化的特点（3D 实验）——气泡、白气、水声、温度—时间图像、沸点与气压。依赖 three.js、OrbitControls、heat.js（sound.js 可选：有它时能听到水声） */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const ROOM = 20;

  const BR = 0.22, BH = 0.34, NET_Y = 0.415; // 烧杯半径、高度；石棉网高度
  const MAXB = 280, NSTEAM = 36;

  function canvasTex(w, hh, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    draw(c.getContext('2d'), w, hh);
    return new THREE.CanvasTexture(c);
  }

  PS.register('boil-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { T0: 90, mass: 1, lid: false, bp: 100, lamp: false, run: false, fast: false, t: 0, T: 90, rows: [], trace: [], boilAt: null, zoom: false, sound: true, labels: true, snd: null, nextRec: 0 };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    left.append(view);
    const obs = h('div', { class: 'b3-obs' });
    const clock = h('div', { class: 'b3-clock' });
    view.append(clock);
    left.append(obs);
    const chart = PS.stage(left, { ratio: '1000 / 330', draw: drawChart });
    chart.stage.style.marginTop = '10px';

    /* ---------- 控件 ---------- */
    const t0Seg = PS.ui.seg([{ value: 90, label: '初温 90 ℃' }, { value: 60, label: '初温 60 ℃' }], st.T0, (v) => { st.T0 = v; reset(); });
    const mSeg = PS.ui.seg([{ value: 1, label: '水少（100 g）' }, { value: 2, label: '水多（200 g）' }], st.mass, (v) => { st.mass = v; reset(); });
    const pSeg = PS.ui.seg([{ value: 100, label: '标准大气压' }, { value: 98, label: '实验室气压（约 95 kPa）' }], st.bp, (v) => { st.bp = v; reset(); });
    const lidT = PS.ui.toggle('烧杯上加纸盖', false, (v) => { st.lid = v; lid.visible = v; reset(); });
    const lampBtn = PS.ui.button('🔥 点燃酒精灯，开始计时', () => {
      st.lamp = !st.lamp; st.run = true;
      lampBtn.innerHTML = st.lamp ? '撤去（熄灭）酒精灯' : '🔥 重新点燃酒精灯';
      if (st.lamp) startSound();
      if (!st.lamp && st.T >= st.bp - 0.05) say('撤去酒精灯后，水不能继续<b>吸热</b>，很快就<b>停止沸腾</b>了。说明沸腾需要持续吸热。', 'ok');
      loop.start();
    }, 'btn btn-primary');
    const fastT = PS.ui.toggle('快进 ×4', false, (v) => { st.fast = v; });
    const zoomBtn = PS.ui.button('🔍 放大观察气泡', () => { st.zoom = !st.zoom; zoomBtn.innerHTML = st.zoom ? '↩ 还原视角' : '🔍 放大观察气泡'; }, 'btn btn-sm');
    const sndT = PS.ui.toggle('听水声', true, (v) => { st.sound = v; if (!v) stopSound(); else if (st.lamp) startSound(); });
    const labT = PS.ui.toggle('器材名称', true, (v) => { st.labels = v; });
    if (el.clientWidth && el.clientWidth < 560) { st.labels = false; labT.set(false); } // 手机上 3D 画面小，默认不显示器材名称
    const msg = h('div', { class: 'feedback show info small' });
    const thermo = PS.stage(h('div'), { ratio: '1000 / 560', draw: drawThermo });
    const rT = PS.ui.readout('时间', '0 min'), rTemp = PS.ui.readout('水温', '—', 'accent');
    const tbody = h('tbody');
    const analysis = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 实验条件'), h('div', { class: 'row' }, t0Seg.el), h('div', { class: 'row' }, mSeg.el), h('div', { class: 'row' }, pSeg.el), h('div', { class: 'row' }, lidT.el)),
      h('div', { class: 'panel' }, h('h4', null, '② 进行实验'), h('div', { class: 'row' }, lampBtn), h('div', { class: 'row' }, fastT.el, sndT.el, labT.el), h('div', { class: 'row' }, zoomBtn, PS.ui.button('↺ 重做', () => reset(), 'btn btn-ghost btn-sm')), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数（温度计放大）'), thermo.stage.parentNode, h('div', { class: 'readouts' }, rT.el, rTemp.el)),
      h('div', { class: 'panel' }, h('h4', null, '④ 每隔 1 min 记录一次（自动）'), h('div', { class: 'table-wrap', style: { maxHeight: '200px', overflowY: 'auto' } }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '时间/min'), h('th', null, '温度/℃'), h('th', null, '现象'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis));
    function say(t, c) { msg.className = 'feedback show small ' + (c || 'info'); msg.innerHTML = t; }

    /* ---------- 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.02, 20);
    const CAM_FAR = new THREE.Vector3(1.0, 1.0, 2.0), TGT_FAR = new THREE.Vector3(-0.08, 0.6, 0);
    const CAM_NEAR = new THREE.Vector3(0.22, 0.6, 0.62), TGT_NEAR = new THREE.Vector3(0, 0.5, 0);
    camera.position.copy(CAM_FAR);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(TGT_FAR);
    controls.enableDamping = true; controls.minDistance = 0.35; controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI * 0.52;
    let camAnim = 0;
    zoomBtn.addEventListener('click', () => { camAnim = 1; });
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a090, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.65);
    dl.position.set(1, 2.4, 1.4); dl.castShadow = true; dl.shadow.mapSize.set(1024, 1024);
    Object.assign(dl.shadow.camera, { left: -1.2, right: 1.2, top: 1.4, bottom: -0.4, near: 0.5, far: 6 });
    scene.add(dl);
    const Lam = (c, e) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.3), Lam(0xf1f3f5));
    table.position.y = -0.025; table.receiveShadow = true; scene.add(table);
    // 铁架台
    const metal = Std(0x495057, { metalness: 0.6, roughness: 0.45 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.3), metal); base.position.set(-0.42, 0.015, 0); base.castShadow = true; scene.add(base);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.3, 12), metal); rod.position.set(-0.52, 0.65, 0); rod.castShadow = true; scene.add(rod);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 8, 40), metal); ring.rotation.x = Math.PI / 2; ring.position.set(0, NET_Y - 0.008, 0); scene.add(ring);
    const ringArm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 8), metal); ringArm.rotation.z = Math.PI / 2; ringArm.position.set(-0.36, NET_Y - 0.008, 0); scene.add(ringArm);
    const clampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.6, 8), metal); clampArm.rotation.z = Math.PI / 2; clampArm.position.set(-0.22, 1.08, 0); scene.add(clampArm);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), Std(0x343a40)); clamp.position.set(0.07, 1.08, 0); scene.add(clamp);
    // 石棉网
    const netTex = canvasTex(256, 256, (g, w, hh) => {
      g.fillStyle = '#9aa1a9'; g.fillRect(0, 0, w, hh);
      g.strokeStyle = '#6c737b'; g.lineWidth = 2;
      for (let i = 0; i <= w; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, hh); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
      g.fillStyle = '#f1f3f5'; g.beginPath(); g.arc(w / 2, hh / 2, w * 0.3, 0, TAU); g.fill();
    });
    const net = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.5), [Lam(0x868e96), Lam(0x868e96), new THREE.MeshLambertMaterial({ map: netTex }), Lam(0x868e96), Lam(0x868e96), Lam(0x868e96)]);
    net.position.set(0, NET_Y, 0); net.receiveShadow = true; scene.add(net);
    // 烧杯
    const prof = [new THREE.Vector2(0.0001, 0), new THREE.Vector2(BR - 0.01, 0), new THREE.Vector2(BR, 0.012), new THREE.Vector2(BR, BH), new THREE.Vector2(BR + 0.012, BH + 0.008)];
    const beaker = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), Std(0xd0ebff, { transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    beaker.position.y = NET_Y + 0.004; beaker.renderOrder = 4; scene.add(beaker);
    // 水
    const waterMat = Std(0x9fd3f7, { transparent: true, opacity: 0.5, roughness: 0.15, depthWrite: false });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.006, BR - 0.006, 1, 48), waterMat);
    water.renderOrder = 1; scene.add(water);
    const surfMat = Std(0xd0ebff, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
    const surf = new THREE.Mesh(new THREE.CircleGeometry(BR - 0.006, 48), surfMat);
    surf.rotation.x = -Math.PI / 2; surf.renderOrder = 2; scene.add(surf);
    // 纸盖
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.02, BR + 0.02, 0.006, 48), Lam(0xf8f0e3));
    lid.position.y = NET_Y + BH + 0.012; lid.visible = false; lid.castShadow = true; scene.add(lid);
    // 温度计（玻璃管 + 玻璃泡 + 红色液柱）
    const TX = 0.07, BULB_Y = NET_Y + 0.06, TLEN = 0.74;
    const tGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, TLEN, 16), Std(0xf1f8ff, { transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }));
    tGlass.position.set(TX, BULB_Y + TLEN / 2, 0); tGlass.renderOrder = 5; scene.add(tGlass);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 12), Std(0xe03131, { roughness: 0.3 })); bulb.position.set(TX, BULB_Y, 0); scene.add(bulb);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 1, 8), Std(0xe03131)); scene.add(col);
    const colY = (T) => BULB_Y + 0.03 + ((T + 20) / 130) * (TLEN - 0.06);
    // 酒精灯
    const lampG = new THREE.Group();
    const lprof = [new THREE.Vector2(0.0001, 0), new THREE.Vector2(0.09, 0.005), new THREE.Vector2(0.11, 0.05), new THREE.Vector2(0.1, 0.12), new THREE.Vector2(0.06, 0.17), new THREE.Vector2(0.03, 0.19), new THREE.Vector2(0.03, 0.21)];
    const lampBody = new THREE.Mesh(new THREE.LatheGeometry(lprof, 32), Std(0xe7f5ff, { transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false }));
    lampBody.renderOrder = 3; lampG.add(lampBody);
    const alc = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.105, 0.07, 32), Std(0xa5d8ff, { transparent: true, opacity: 0.6 })); alc.position.y = 0.04; lampG.add(alc);
    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.03, 16), Std(0xadb5bd, { metalness: 0.7, roughness: 0.3 })); holder.position.y = 0.225; lampG.add(holder);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8), Lam(0xf8f9fa)); wick.position.y = 0.25; lampG.add(wick);
    const flameTex = canvasTex(64, 128, (g, w, hh) => {
      const gr = g.createRadialGradient(w / 2, hh * 0.62, 2, w / 2, hh * 0.6, w * 0.55);
      gr.addColorStop(0, 'rgba(120,170,255,1)'); gr.addColorStop(0.35, 'rgba(255,220,120,.95)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(w / 2, 2); g.bezierCurveTo(w * 0.95, hh * 0.45, w * 0.95, hh * 0.95, w / 2, hh - 2); g.bezierCurveTo(w * 0.05, hh * 0.95, w * 0.05, hh * 0.45, w / 2, 2); g.fill();
    });
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.position.y = 0.33; flame.scale.set(0.07, 0.16, 1); lampG.add(flame);
    lampG.position.set(0, 0, 0); scene.add(lampG);
    // 气泡
    const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.1, emissive: 0x335577, emissiveIntensity: 0.15 }), MAXB);
    bubbles.renderOrder = 2; scene.add(bubbles);
    const B = []; // {x, y, z, r, v, grow}
    const m4 = new THREE.Matrix4();
    // 白气
    const puffTex = canvasTex(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const puffs = [];
    for (let i = 0; i < NSTEAM; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; s.renderOrder = 6; scene.add(s); puffs.push({ s, life: 0, max: 1 });
    }
    // 器材名称
    const LBL = [['烧杯', new THREE.Vector3(-BR - 0.02, NET_Y + 0.3, 0)], ['温度计', new THREE.Vector3(TX, 1.17, 0)], ['石棉网', new THREE.Vector3(0.24, NET_Y, 0.18)], ['酒精灯', new THREE.Vector3(0.12, 0.12, 0.06)], ['铁架台', new THREE.Vector3(-0.52, 1.3, 0)]];
    const lblEls = LBL.map(([t]) => { const e = h('div', { class: 'label3d' }, t); view.append(e); return e; });
    const v3 = new THREE.Vector3();

    /* ---------- 物理 ---------- */
    const levelH = () => (st.mass === 1 ? 0.12 : 0.21);
    function waterGeo() {
      const hh = levelH();
      water.scale.y = hh; water.position.y = NET_Y + 0.006 + hh / 2;
      surf.position.y = NET_Y + 0.006 + hh;
    }
    // 每分钟的温度变化（℃/min）：C·dT/dt = P − K(T − 20) − E(T)
    function rate(T) {
      const P = st.lamp ? 4.6 : 0;
      const K = st.lid ? 0.015 : 0.025;
      const E = (st.lid ? 0.25 : 1) * 0.8 * Math.exp((T - st.bp) / 6);
      return (P - K * (T - ROOM) - E) / st.mass;
    }
    const boiling = () => st.lamp && st.T >= st.bp - 0.02;
    function reset() {
      Object.assign(st, { lamp: false, run: false, t: 0, T: st.T0, rows: [], trace: [], boilAt: null, nextRec: 0 });
      lampBtn.innerHTML = '🔥 点燃酒精灯，开始计时';
      B.length = 0;
      waterGeo(); stopSound();
      record(); renderTable(); upd();
      say('按图组装器材（自下而上）。点燃酒精灯开始计时，每隔 1 min 记录一次温度，同时观察<b>气泡</b>和<b>声音</b>的变化，直到水沸腾后再记录 2 min。');
      loop.start();
    }
    function record() {
      st.rows.push({ t: Math.round(st.t), T: PS.round(st.T, 1), b: st.T >= st.bp - 0.02 && st.lamp ? '沸腾' : st.T > st.bp - 6 ? '气泡变多' : '少量气泡' });
    }
    function renderTable() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.t), h('td', null, PS.fmt(r.T, 1)), h('td', { style: { fontSize: '.8rem', color: r.b === '沸腾' ? 'var(--red)' : 'var(--muted)', fontWeight: 700 } }, r.b))));
      const sc = tbody.closest('.table-wrap'); if (sc) sc.scrollTop = 1e6;
      analyse();
    }
    function analyse() {
      const R = st.rows;
      const bi = R.findIndex((r) => r.b === '沸腾');
      if (bi < 0 || R.length - bi < 3) { analysis.innerHTML = '<span class="muted">水沸腾后再记录 2 min，这里会给出分析。</span>'; return; }
      const time = R[bi].t;
      analysis.innerHTML = '<p style="margin:0 0 6px">第 ' + time + ' min 水开始沸腾，之后虽然继续加热，温度却保持 <b>' + PS.fmtT(st.bp) + '</b> 不变：水的<b>沸点是 ' + st.bp + ' ℃</b>' + (st.bp < 100 ? '（低于 100 ℃，因为实验室的气压低于 1 个标准大气压）' : '') + '。</p>' +
        '<p style="margin:0 0 6px">结论：水沸腾时要<b>继续吸热</b>，但温度<b>保持不变</b>。沸腾前气泡上升<b>变小</b>，沸腾时气泡上升<b>变大</b>，到水面破裂。</p>' +
        '<p style="margin:0" class="muted">从 ' + st.T0 + ' ℃ 加热到沸腾用了约 ' + time + ' min。试试减少水量、提高初温、加纸盖，能不能缩短时间？</p>';
    }
    function upd() {
      rT.set(PS.fmt(st.t, 1) + ' min');
      rTemp.set(PS.fmtT(st.T, 1));
      clock.innerHTML = '⏱ ' + PS.fmt(st.t, 1) + ' min　🌡 ' + PS.fmtT(st.T, 1);
      const sub = st.bp - st.T;
      obs.innerHTML = boiling() ? '<b style="color:#e03131">沸腾：</b>大量气泡上升、<b>变大</b>，到水面破裂开来，里面的水蒸气散发到空气中；水声变小。'
        : !st.lamp && st.t > 0 && sub < 3 ? '<b>停止加热：</b>水不能继续吸热，<b>停止沸腾</b>。'
          : sub < 6 ? '<b>沸腾前：</b>气泡增多，上升过程中逐渐<b>变小</b>；水声很响（“响水不开”）。'
            : '<b>加热中：</b>少量气泡在杯底产生，上升过程中<b>变小</b>、消失。';
      thermo.render(); chart.render();
    }

    /* ---------- 声音（需要 sound.js） ---------- */
    let hiss = null, rumble = null;
    function startSound() {
      if (!st.sound || !PS.audio || hiss) return;
      hiss = PS.audio.noise({ gain: 0.0001, filter: { type: 'bandpass', freq: 3200, Q: 0.7 } });
      rumble = PS.audio.noise({ gain: 0.0001, filter: { type: 'lowpass', freq: 380 } });
    }
    function stopSound() { if (hiss) hiss.stop(); if (rumble) rumble.stop(); hiss = rumble = null; }
    function soundLevel() {
      if (!hiss) return;
      const T = st.T, near = PS.clamp((T - 70) / (st.bp - 72), 0, 1);
      const b = boiling();
      hiss.setGain(st.lamp ? (b ? 0.03 : 0.16 * near * near) : 0.0001);
      rumble.setGain(st.lamp ? (b ? 0.2 : 0.04 * near) : 0.0001);
    }
    if (PS.audio) PS.audio.whenHidden(view, stopSound);

    /* ---------- 动画 ---------- */
    function spawnBubble(boil) {
      if (B.length >= MAXB) return;
      const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * (BR - 0.04) * (boil ? 1 : 0.6);
      B.push({ x: Math.cos(a) * rr, z: Math.sin(a) * rr, y: NET_Y + 0.012, r: boil ? PS.rand(0.006, 0.011) : PS.rand(0.004, 0.009), v: PS.rand(0.06, 0.1), boil });
    }
    let spawnAcc = 0;
    const loop = PS.loop((dt) => {
      if (st.run) {
        const sp = st.fast ? 4 : 1, dm = dt * 0.25 * sp; // 1 s 现实时间 = 0.25 min（快进 ×4 时 1 min）
        const n = 8;
        for (let i = 0; i < n; i++) {
          let r = rate(st.T);
          if (st.lamp && st.T >= st.bp && r > 0) r = 0; // 沸腾时吸收的热量都用来汽化，温度不变
          st.T = Math.min(st.bp, st.T + (r * dm) / n);
          st.t += dm / n;
          if (st.t >= st.nextRec + 1 - 1e-9) { st.nextRec += 1; record(); renderTable(); }
        }
        if (boiling() && st.boilAt == null) { st.boilAt = st.t; say('水<b>沸腾</b>了！注意观察：继续加热，温度计的示数还变吗？再记录 2 min。', 'ok'); }
        st.trace.push([st.t, st.T]);
        if (st.t > 40) { st.run = false; st.lamp = false; lampBtn.innerHTML = '🔥 重新点燃酒精灯'; say('实验时间较长了，可以“重做”换一种条件比较。'); }
        upd(); soundLevel();
      }
      // 气泡
      const b = boiling();
      const sub = st.bp - st.T;
      const pre = st.lamp ? PS.clamp((st.T - 70) / (st.bp - 70), 0, 1) : PS.clamp((st.T - (st.bp - 3)) / 3, 0, 1) * 0.3;
      const rateB = b ? 70 : pre * pre * 26;
      spawnAcc += rateB * dt;
      while (spawnAcc > 1) { spawnBubble(b); spawnAcc -= 1; }
      const top = NET_Y + 0.006 + levelH();
      for (let i = B.length - 1; i >= 0; i--) {
        const q = B[i];
        const hot = b || (q.boil && st.T > st.bp - 0.5);
        q.v += (hot ? 0.5 : 0.15) * dt;
        q.y += q.v * dt;
        q.r += (hot ? 0.022 : -0.011 * PS.clamp(sub / 4, 0.4, 2)) * dt; // 沸腾时变大，沸腾前遇到上层较冷的水而变小
        q.x += Math.sin(q.y * 60 + i) * 0.0006;
        if (q.r < 0.0015) { B.splice(i, 1); continue; }
        if (q.y + q.r > top) { if (hot) puff(q.x, top, q.z, true); B.splice(i, 1); }
      }
      for (let i = 0; i < MAXB; i++) {
        const q = B[i];
        if (q) m4.makeScale(q.r, q.r, q.r).setPosition(q.x, q.y, q.z); else m4.makeScale(0, 0, 0);
        bubbles.setMatrixAt(i, m4);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      // 白气：水温高时少量，沸腾时大量
      if (!st.lid || Math.random() < 0.25) {
        const pr = b ? 9 : st.T > 80 ? (st.T - 80) * 0.12 : 0;
        if (Math.random() < pr * dt) puff(PS.rand(-0.12, 0.12), st.lid ? NET_Y + BH + 0.02 : top + 0.02, PS.rand(-0.12, 0.12), false);
      }
      puffs.forEach((p) => {
        if (p.life <= 0) { p.s.visible = false; return; }
        p.life -= dt;
        const k = 1 - p.life / p.max;
        p.s.position.y += dt * 0.12; p.s.position.x += dt * 0.02;
        const sc = 0.05 + k * 0.16;
        p.s.scale.set(sc, sc, 1);
        // 刚离开水面处是看不见的水蒸气，上方遇冷液化成“白气”，再往上又汽化消失
        p.s.material.opacity = (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88) * 0.55;
      });
      // 火焰、液柱、水色
      flame.visible = st.lamp;
      if (st.lamp) { const fl = 1 + 0.07 * Math.sin(performance.now() / 55) + 0.04 * Math.sin(performance.now() / 23); flame.scale.set(0.07 * (2 - fl), 0.16 * fl, 1); }
      const cy = colY(st.T);
      col.scale.y = cy - BULB_Y; col.position.set(TX, (cy + BULB_Y) / 2, 0);
      waterMat.color.setStyle(PS.waterColor(st.T));
      surf.position.y = top + (b ? Math.sin(performance.now() / 70) * 0.002 : 0);
      // 摄像机
      if (camAnim > 0) {
        camAnim = Math.max(0, camAnim - dt * 1.4);
        const k = 1 - camAnim * camAnim;
        camera.position.lerp(st.zoom ? CAM_NEAR : CAM_FAR, k * 0.2);
        controls.target.lerp(st.zoom ? TGT_NEAR : TGT_FAR, k * 0.2);
      }
      controls.update();
      renderer.render(scene, camera);
      // 标签
      const W = view.clientWidth, H = view.clientHeight;
      LBL.forEach(([, p], i) => {
        const e = lblEls[i];
        if (!st.labels) { e.style.display = 'none'; return; }
        v3.copy(p).project(camera);
        e.style.display = v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 ? '' : 'none';
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * W) + 'px,' + ((-v3.y * 0.5 + 0.5) * H) + 'px) translate(-50%,-100%)';
      });
    }, view);
    function puff(x, y, z, small) {
      const p = puffs.find((q) => q.life <= 0);
      if (!p) return;
      p.max = p.life = small ? 1.2 : 2.6;
      p.s.position.set(x, y + (small ? 0.03 : 0.05), z);
      p.s.visible = true;
    }
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();

    /* ---------- 2D：温度计放大、温度—时间图像 ---------- */
    function drawThermo(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, 1000, 560);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 560);
      PS.thermo(ctx, { x: 380, top: -30, bulbY: 590, bulb: false, min: st.T - 6.5, max: st.T + 6.5, div: 1, label: 10, value: st.T, w: 120, F, fs: F(15), unit: false, pad: 0 });
      D.text(ctx, '单位：℃', 960, 60, { size: F(13), weight: 700, color: '#6b7487', align: 'right' });
      ctx.restore();
    }
    function drawChart(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, 1000, 330);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, 330);
      const t1 = Math.max(st.T0 === 90 ? 10 : 20, Math.ceil(st.t / 2) * 2 + 2);
      const T0 = st.T0 === 90 ? 86 : 56, T1 = 102;
      const c = PS.tchart(ctx, { x: 80, y: 30, w: 860, h: 250 }, { t0: 0, t1, T0, T1, tStep: 1, TStep: st.T0 === 90 ? 2 : 5, tLabelEvery: t1 > 24 ? 2 : 1, F, fs: F(12) });
      c.hline(st.bp, '#e03131', '沸点 ' + st.bp + ' ℃');
      c.line(st.trace, 'rgba(59,91,219,.3)', 2);
      const pts = st.rows.map((r) => [r.t, r.T]);
      c.line(pts, '#3b5bdb', 2.6); c.dots(pts, '#3b5bdb', 4);
      D.text(ctx, '水沸腾时温度与时间的关系', 940, 20, { size: F(14), weight: 800, color: '#3a4458', align: 'right' });
      ctx.restore();
    }
    if (!document.getElementById('b3-style')) document.head.append(h('style', { id: 'b3-style' }, `
      .b3-obs{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.9rem;min-height:2.6em}
      .b3-clock{position:absolute;left:10px;top:10px;background:rgba(27,35,51,.82);color:#fff;border-radius:10px;padding:4px 12px;font-size:.92rem;font-weight:700;font-variant-numeric:tabular-nums;pointer-events:none}
      
    `));
    reset();
  });
})();
