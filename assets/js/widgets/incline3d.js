/* 第4节：测量小车的平均速度 —— 3D 斜面实验 */
(function () {
  'use strict';
  const { h } = PS;
  const G = 9.8, MU = 0.012;
  const LB = 1.85;          // 木板长度（m）：从 -10 cm 到 175 cm
  const X_TOP = -0.10, X_END = 1.75;
  const TB = 0.02;          // 木板厚度
  const CAR_L = 0.10;

  function boardTexture() {
    const c = document.createElement('canvas');
    const W = 3000, H = 200;
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#e9c48f'); grd.addColorStop(1, '#d9a866');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,70,20,.18)'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { g.beginPath(); const y = 10 + i * 18; g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + 6, W * 0.6, y - 6, W, y + 2); g.stroke(); }
    const px = (cm) => ((cm / 100 - X_TOP) / (X_END - X_TOP)) * W;
    // 刻度带（靠近观察者一侧）
    g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillRect(0, H - 86, W, 86);
    g.strokeStyle = '#2a2414'; g.fillStyle = '#2a2414';
    for (let cm = 0; cm <= 170; cm++) {
      const x = px(cm);
      const len = cm % 10 === 0 ? 42 : cm % 5 === 0 ? 28 : 16;
      g.lineWidth = cm % 10 === 0 ? 4 : 2;
      g.beginPath(); g.moveTo(x, H); g.lineTo(x, H - len); g.stroke();
      if (cm % 10 === 0) { g.font = 'bold 34px Arial'; g.textAlign = 'center'; g.fillText(String(cm), x, H - 50); }
    }
    g.font = 'bold 26px Arial'; g.textAlign = 'left'; g.fillText('cm', px(171), H - 50);
    // 起点线、中点、底端标记
    g.fillStyle = '#e03131'; g.fillRect(px(0) - 4, 0, 8, H - 86);
    g.fillStyle = 'rgba(59,91,219,.55)'; g.fillRect(px(80) - 3, 0, 6, H - 86);
    g.fillStyle = 'rgba(59,91,219,.55)'; g.fillRect(px(160) - 3, 0, 6, H - 86);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    return t;
  }

  PS.register('incline-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = {
      hb: 0.08, block: 1.6, mode: opts.mode || 'auto', phase: 'ready', // ready | running | stopped
      x: 0, t: 0, a: 0, tStop: 0, bounce: 0, rows: [], sens: [], mu: MU, waitingStop: false, swStopped: false,
    };
    const wrap = h('div', { class: 'bench' });
    const left = h('div');
    const side = h('div', { class: 'bench-side' });
    wrap.append(left, side);
    el.append(wrap);
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    left.append(view);

    /* ---------- three.js 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.02, 30);
    camera.position.set(0.1, 0.85, 1.5);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0.0, 0.0, 0.05);
    controls.enableDamping = true;
    controls.minDistance = 0.4; controls.maxDistance = 4.5;
    controls.maxPolarAngle = Math.PI * 0.49;

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a090, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.75);
    dl.position.set(0.8, 2.2, 1.4);
    dl.castShadow = true;
    dl.shadow.mapSize.set(2048, 2048);
    Object.assign(dl.shadow.camera, { left: -1.4, right: 1.4, top: 1.0, bottom: -1.0, near: 0.5, far: 5 });
    dl.shadow.bias = -0.0005;
    scene.add(dl);

    const Lam = (c, e) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    // 实验桌
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.0), Lam(0xf1f3f5));
    table.position.set(0, -0.025, 0);
    table.receiveShadow = true;
    scene.add(table);
    const legMat = Lam(0x868e96);
    [[-1.2, -0.42], [1.2, -0.42], [-1.2, 0.42], [1.2, 0.42]].forEach(([x, z]) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), legMat);
      l.position.set(x, -0.425, z); scene.add(l);
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), Lam(0xd8dee6));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.8; scene.add(floor);

    // 斜面组（局部坐标：x 沿斜面向下，0 为起点线，y 垂直于板面向上）
    const incl = new THREE.Group();
    scene.add(incl);
    const woodSide = Lam(0xb07d45);
    const boardTop = Lam(0xffffff, { map: boardTexture() });
    const board = new THREE.Mesh(new THREE.BoxGeometry(X_END - X_TOP, TB, 0.16), [woodSide, woodSide, boardTop, woodSide, woodSide, woodSide]);
    board.position.set((X_END + X_TOP) / 2, -TB / 2, 0);
    board.receiveShadow = true; board.castShadow = true;
    incl.add(board);
    // 两侧挡条
    [-0.083, 0.083].forEach((z) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(X_END - X_TOP, 0.012, 0.006), woodSide);
      r.position.set((X_END + X_TOP) / 2, 0.006, z); incl.add(r);
    });
    // 小车
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(CAR_L, 0.032, 0.07), Std(0x3b5bdb, { roughness: 0.5 }));
    body.position.y = 0.032; body.castShadow = true; car.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.055), Std(0xf8f9fa, { roughness: 0.4 }));
    top.position.set(-0.012, 0.058, 0); top.castShadow = true; car.add(top);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.07), Std(0xf08c00));
    bumper.position.set(CAR_L / 2 + 0.003, 0.03, 0); car.add(bumper);
    const wheels = [];
    const wg = new THREE.CylinderGeometry(0.014, 0.014, 0.01, 18); wg.rotateX(Math.PI / 2);
    const wm = Std(0x212529, { roughness: 0.8 });
    [[-0.032, -0.039], [0.032, -0.039], [-0.032, 0.039], [0.032, 0.039]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wg, wm); w.position.set(x, 0.014, z); w.castShadow = true; car.add(w); wheels.push(w);
      const hub = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.0105), Std(0xadb5bd)); hub.position.copy(w.position); car.add(hub); wheels.push(hub);
    });
    incl.add(car);
    // 金属片
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.06, 0.15), Std(0xced4da, { metalness: 0.85, roughness: 0.25 }));
    plate.castShadow = true;
    incl.add(plate);
    const plateBase = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.15), Std(0x868e96, { metalness: 0.6, roughness: 0.4 }));
    incl.add(plateBase);
    // 垫块
    const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.2), Lam(0x5c7cfa));
    blockMesh.castShadow = true; blockMesh.receiveShadow = true;
    scene.add(blockMesh);

    // HTML 标签
    const overlay = h('div', { class: 'overlay', style: { inset: 0 } });
    view.append(overlay);
    const lblPlate = h('div', { class: 'label3d still' });
    const lblStart = h('div', { class: 'label3d', html: '起点 0 cm' });
    const lblMsg = h('div', { class: 'inc-msg' });
    overlay.append(lblPlate, lblStart, lblMsg);
    const hud = h('div', { class: 'inc-hud' });
    view.append(hud);

    let theta = 0;
    function layoutIncline() {
      theta = Math.asin(st.hb / LB);
      incl.rotation.z = -theta;
      incl.position.set(-0.8 * Math.cos(theta), X_END * Math.sin(theta) + TB * Math.cos(theta), 0);
      // 垫块：放在靠近顶端的板下方
      const xs = -0.03;
      const px = incl.position.x + xs * Math.cos(theta) + (-TB) * Math.sin(theta);
      const py = incl.position.y - xs * Math.sin(theta) + (-TB) * Math.cos(theta);
      blockMesh.scale.y = Math.max(0.001, py);
      blockMesh.position.set(px, py / 2, 0);
      plate.position.set(st.block + 0.002, 0.03, 0);
      plateBase.position.set(st.block + 0.012, 0.003, 0);
      st.a = G * (Math.sin(theta) - st.mu * Math.cos(theta));
    }
    function placeCar() {
      car.position.set(st.x + st.bounce - CAR_L / 2 - 0.006, 0, 0);
      wheels.forEach((w, i) => { w.rotation.z = -(st.x + st.bounce) / 0.014; });
    }
    const tmp = new THREE.Vector3();
    function label(elm, local, dy) {
      tmp.set(local[0], local[1], local[2]);
      incl.localToWorld(tmp);
      tmp.y += dy || 0;
      tmp.project(camera);
      const r = view.getBoundingClientRect();
      const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
      elm.style.display = vis ? '' : 'none';
      elm.style.left = ((tmp.x + 1) / 2) * r.width + 'px';
      elm.style.top = ((1 - tmp.y) / 2) * r.height + 'px';
    }

    /* ---------- 运行 ---------- */
    let sw = null; // 停表（人工计时时使用）
    function frame(dt) {
      if (st.phase === 'running') {
        st.t = (performance.now() - st.t0) / 1000; // 用真实时钟推进，保证与停表同步
        st.x = 0.5 * st.a * st.t * st.t;
        st.sens.push([st.t, st.a * st.t]);
        if (st.x >= st.block - 1e-6) {
          st.x = st.block;
          st.phase = 'stopped';
          st.bounce = -0.004;
          PS.sound.clack();
          const v = st.a * st.tStop;
          st.sens.push([st.tStop, v], [st.tStop + 0.001, 0]);
          onHit();
        }
      } else if (st.bounce < 0) {
        st.bounce = Math.min(0, st.bounce + dt * 0.03);
      }
      placeCar();
      controls.update();
      renderer.render(scene, camera);
      label(lblPlate, [st.block, 0.07, 0], 0.02);
      lblPlate.innerHTML = '金属片 <small>s = ' + (st.block * 100).toFixed(0) + ' cm</small>';
      label(lblStart, [0, 0.0, -0.08], 0.09);
      hud.innerHTML = '斜面倾角 ' + (theta * 180 / Math.PI).toFixed(1) + '°' + (st.phase !== 'ready' ? '　t = ' + (st.phase === 'running' ? st.t : st.tStop).toFixed(2) + ' s' : '');
      if (sens.on) drawSensor();
    }
    const loop = PS.loop(frame, view);

    function release() {
      if (st.phase === 'running') return;
      reset(true);
      st.mu = MU * (1 + PS.rand(-0.06, 0.06)); // 每次实验摩擦略有不同，时间会有微小差异
      layoutIncline();
      if (st.a <= 0.002) {
        lblMsg.innerHTML = '坡度太小，小车滑不下去！把垫块调高一些。';
        lblMsg.classList.add('show');
        PS.sound.bad();
        return;
      }
      lblMsg.classList.remove('show');
      st.tStop = Math.sqrt((2 * st.block) / st.a);
      st.phase = 'running';
      st.t = 0; st.t0 = performance.now(); st.sens = [[0, 0]];
      if (st.mode === 'manual') {
        sw.reset(); sw.start();
        st.waitingStop = true; st.swStopped = false;
        stopBtn.disabled = false;
        say('小车已释放，停表开始计时。<b>听到“咔哒”撞击声时立即按“停止计时”</b>（或空格键）。');
      } else say('小车已释放，电子计时器正在计时……');
      relBtn.disabled = true;
    }
    function onHit() {
      if (st.mode === 'auto') {
        addRow(st.tStop, 'auto');
        relBtn.disabled = false;
      } else {
        say('“咔哒”！小车撞到了金属片，快按停止！');
        setTimeout(() => { if (st.waitingStop) say('还没按停止？人的反应总是需要时间的。'); }, 2500);
      }
    }
    function stopTiming() {
      if (st.mode !== 'manual' || !st.waitingStop) return;
      sw.stop();
      st.waitingStop = false;
      stopBtn.disabled = true;
      if (st.phase === 'running') {
        // 小车还没撞到就按了
        say('按早了！小车还没撞到金属片。这次数据作废，把小车放回起点重新做。');
        PS.sound.bad();
        st.phase = 'stopped'; st.tStop = st.t;
        relBtn.disabled = false;
        return;
      }
      const t = sw.reading;
      addRow(t, 'manual');
      relBtn.disabled = false;
    }
    function reset(silent) {
      st.phase = 'ready'; st.x = 0; st.t = 0; st.bounce = 0; st.sens = [];
      if (sw && !sw.running) sw.reset();
      if (!silent) say('小车已放回起点。');
      placeCar();
    }

    /* ---------- 数据 ---------- */
    function addRow(t, how) {
      const s = st.block;
      const row = { s, t: how === 'auto' ? PS.round(t, 2) : PS.round(t, 1), how, trueT: st.tStop };
      st.rows.push(row);
      renderTable();
      const err = row.t - st.tStop;
      say('已记录：s = ' + s.toFixed(2) + ' m，t = ' + (how === 'auto' ? row.t.toFixed(2) : row.t.toFixed(1)) + ' s' +
        (how === 'manual' ? '（真实时间 ' + st.tStop.toFixed(2) + ' s，' + (err >= 0 ? '多' : '少') + '了 ' + Math.abs(err).toFixed(2) + ' s——这就是人的反应带来的误差）' : '') + '。');
      PS.sound.good();
    }
    const tbody = h('tbody');
    const analysis = h('div', { class: 'small' });
    function renderTable() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => {
        const del = h('button', { type: 'button', class: 'inc-del', title: '删除这一行', onclick: () => { st.rows.splice(i, 1); renderTable(); } }, '×');
        tbody.append(h('tr', null, h('td', null, i + 1), h('td', null, r.s.toFixed(2)), h('td', null, r.how === 'auto' ? r.t.toFixed(2) : r.t.toFixed(1)), h('td', null, (r.s / r.t).toFixed(2)), h('td', null, r.how === 'auto' ? '电子' : '停表'), h('td', null, del)));
      });
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 6, class: 'muted' }, '释放小车后自动记录')));
      // 分析：取 s=1.6 和 s=0.8 的平均时间
      const avgT = (s) => { const a = st.rows.filter((r) => Math.abs(r.s - s) < 1e-6); return a.length ? a.reduce((x, r) => x + r.t, 0) / a.length : null; };
      const t1 = avgT(1.6), t2 = avgT(0.8);
      if (t1 && t2 && t1 > t2) {
        const v1 = 1.6 / t1, v2 = 0.8 / t2, v3 = 0.8 / (t1 - t2);
        analysis.innerHTML = '<table class="t inc-ana"><tr><th>路段</th><th>s/m</th><th>t/s</th><th>v/(m·s⁻¹)</th></tr>' +
          '<tr><td>全程</td><td>s₁ = 1.60</td><td>t₁ = ' + t1.toFixed(2) + '</td><td>v₁ = ' + v1.toFixed(2) + '</td></tr>' +
          '<tr><td>上半段</td><td>s₂ = 0.80</td><td>t₂ = ' + t2.toFixed(2) + '</td><td>v₂ = ' + v2.toFixed(2) + '</td></tr>' +
          '<tr class="hl-row"><td>下半段</td><td>s₃ = 0.80</td><td>t₃ = ' + (t1 - t2).toFixed(2) + '</td><td><b>v₃ = ' + v3.toFixed(2) + '</b></td></tr></table>' +
          '<p class="muted" style="margin:6px 0 0">其中 s₃ = s₁ − s₂，t₃ = t₁ − t₂。</p>' +
          '<p style="margin:8px 0 0"><b>结论：</b>v₂ ' + (v2 < v1 ? '<' : '>') + ' v₁ ' + (v1 < v3 ? '<' : '>') + ' v₃，小车沿斜面下滑时<b class="hl">速度越来越大</b>，做变速（加速）直线运动。' +
          (st.rows.filter((r) => Math.abs(r.s - 1.6) < 1e-6).length > 1 || st.rows.filter((r) => Math.abs(r.s - 0.8) < 1e-6).length > 1 ? '<br><span class="muted">（表中同一路程做了多次，已取时间的平均值）</span>' : '') + '</p>';
      } else {
        analysis.innerHTML = '<span class="muted">把金属片分别放在 <b>底端（160 cm）</b> 和 <b>中点（80 cm）</b> 各做一次实验，这里会自动算出上半段、下半段和全程的平均速度。</span>';
      }
    }

    /* ---------- 传感器 v-t 图 ---------- */
    const sensBox = h('div', { class: 'inc-sens' });
    left.append(sensBox);
    const sens = { on: true };
    const sensStage = PS.stage(sensBox, { ratio: '1000 / 230', minHeight: 140, draw: () => {} });
    function drawSensor() {
      const ctx = sensStage.ctx, w = sensStage.w, hh = sensStage.h;
      if (!w) return;
      ctx.setTransform(sensStage.dpr, 0, 0, sensStage.dpr, 0, 0);
      ctx.fillStyle = '#0d1626'; ctx.fillRect(0, 0, w, hh);
      const tmax = Math.max(4, Math.ceil(st.tStop || 4));
      const vmax = Math.max(1, Math.ceil(((st.a || 0.3) * (st.tStop || 3)) * 2) / 2);
      const b = { x: 46, y: 22, w: w - 80, h: hh - 52 };
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
      ctx.font = PS.font(10, 500); ctx.fillStyle = '#8ea0bd';
      for (let t = 0; t <= tmax; t++) { const x = b.x + (t / tmax) * b.w; ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(t, x, b.y + b.h + 13); }
      for (let i = 0; i <= 4; i++) { const v = (vmax * i) / 4; const y = b.y + b.h - (i / 4) * b.h; ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v.toFixed(2), b.x - 5, y + 3); }
      ctx.fillStyle = '#c5d3ea'; ctx.font = PS.font(11, 700); ctx.textAlign = 'left';
      ctx.fillText('位移传感器：v–t 图像（v/m·s⁻¹）', b.x, 14);
      ctx.textAlign = 'right'; ctx.fillText('t/s', b.x + b.w + 22, b.y + b.h + 4);
      if (st.sens.length > 1) {
        ctx.strokeStyle = '#69db7c'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        st.sens.forEach(([t, v], i) => { const x = b.x + (t / tmax) * b.w, y = b.y + b.h - (v / vmax) * b.h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      }
    }

    /* ---------- 控制面板 ---------- */
    const hbSlider = PS.ui.slider({ label: '垫块高度', min: 2, max: 30, step: 1, value: 8, unit: 'cm', onInput: (v) => { if (st.phase === 'running') return; st.hb = v / 100; layoutIncline(); reset(true); } });
    const blockSeg = PS.ui.seg([{ value: 1.6, label: '底端 160cm' }, { value: 0.8, label: '中点 80cm' }, { value: 0, label: '自定义' }], 1.6, (v) => {
      if (st.phase === 'running') { blockSeg.set(st.block, true); return; }
      if (v === 0) { custom.disable(false); st.block = custom.value / 100; }
      else { custom.disable(true); st.block = v; custom.set(v * 100, true); }
      layoutIncline(); reset(true);
    });
    const custom = PS.ui.slider({ label: '金属片位置', min: 20, max: 170, step: 10, value: 160, unit: 'cm', onInput: (v) => { if (st.phase === 'running') return; st.block = v / 100; layoutIncline(); reset(true); } });
    custom.disable(true);
    const relBtn = PS.ui.button('▶ 释放小车', release, 'btn btn-primary');
    const backBtn = PS.ui.button('↺ 放回起点', () => { if (st.phase !== 'running') reset(); }, 'btn');
    const stopBtn = PS.ui.button('⏹ 停止计时（空格）', stopTiming, 'btn btn-red');
    stopBtn.disabled = true;
    const swBox = h('div', { class: 'inc-sw' });
    sw = PS.Stopwatch(swBox, { interactive: false, size: 150 });
    const swRead = h('div', { class: 'small center' });
    const manualBox = h('div', { style: { display: 'none' } }, h('div', { class: 'inc-swrow' }, swBox, h('div', null, stopBtn, swRead, h('div', { class: 'kbd-hint' }, '人工计时：听到撞击声后按停止。停表的分度值为 0.1 s。'))));
    const modeSeg = PS.ui.seg([{ value: 'auto', label: '电子计时器' }, { value: 'manual', label: '停表人工计时' }], st.mode, (v) => { st.mode = v; manualBox.style.display = v === 'manual' ? '' : 'none'; reset(true); });
    const msg = h('div', { class: 'feedback show info small' }, '调好垫块和金属片后，点击“释放小车”。');
    function say(html) { msg.innerHTML = html; }

    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 组装器材'), hbSlider.el, h('div', { class: 'row' }, blockSeg.el), custom.el,
        h('div', { class: 'kbd-hint' }, '坡度小一些，小车运动时间长，便于测量时间。')),
      h('div', { class: 'panel' }, h('h4', null, '② 计时方式'), modeSeg.el, manualBox),
      h('div', { class: 'panel' }, h('h4', null, '③ 进行实验'), h('div', { class: 'row' }, relBtn, backBtn), msg),
      h('div', { class: 'panel' }, h('h4', null, '④ 实验数据'),
        h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次'), h('th', null, 's/m'), h('th', null, 't/s'), h('th', null, 'v/(m·s⁻¹)'), h('th', null, '计时'), h('th', null, ''))), tbody)),
        PS.ui.button('清空数据', () => { st.rows = []; renderTable(); }, 'btn btn-sm btn-ghost')),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis)
    );
    if (st.mode === 'manual') { modeSeg.set('manual'); }

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && st.mode === 'manual' && st.waitingStop) {
        const r = view.getBoundingClientRect();
        if (r.bottom > 0 && r.top < innerHeight) { e.preventDefault(); stopTiming(); }
      }
    });

    function resize() {
      const r = view.getBoundingClientRect();
      if (r.width < 2) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    layoutIncline();
    placeCar();
    renderTable();
    loop.start();

    document.head.append(h('style', null, `
      .inc-hud{position:absolute;right:10px;top:10px;background:rgba(255,255,255,.9);border-radius:8px;padding:3px 10px;font-size:13px;font-weight:700;color:#3a4458;pointer-events:none;font-variant-numeric:tabular-nums}
      .inc-msg{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);background:rgba(224,49,49,.92);color:#fff;font-weight:700;padding:10px 18px;border-radius:12px;display:none;white-space:nowrap}
      .inc-msg.show{display:block}
      .inc-sens{margin-top:10px}
      .inc-sens .stage{background:#0d1626;border-color:#0d1626}
      .inc-swrow{display:flex;gap:10px;align-items:center;margin-top:8px}
      .inc-sw{flex:none;width:130px}
      .inc-sw .sw-svg{max-width:130px}
      .inc-ana th,.inc-ana td{white-space:nowrap;padding:5px 4px!important;font-size:.82rem}
      .inc-del{border:0;background:none;color:var(--muted);cursor:pointer;font-size:1rem;line-height:1}
      .inc-del:hover{color:var(--red)}
    `));
  });
})();
