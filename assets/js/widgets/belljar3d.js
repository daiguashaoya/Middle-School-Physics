/* 第1节：真空罩中的电铃（3D）——声音的传播需要介质。依赖 three.js、OrbitControls、sound.js */
(function () {
  'use strict';
  const { h } = PS;
  const TAU = Math.PI * 2;
  const JX = -0.25;            // 玻璃罩中心 x
  const JR = 0.27, JH = 0.38;  // 罩的半径、圆柱部分高度
  const NMOL = 420;
  const P_MIN = 0.006;         // 抽气机不可能把空气抽干净

  function gaugeCanvas() {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    return c;
  }
  function drawGauge(c, p) {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#f8f9fa'; g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.fill();
    g.lineWidth = 10; g.strokeStyle = '#495057'; g.stroke();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    g.strokeStyle = '#1b2333'; g.fillStyle = '#1b2333'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((a1 - a0) * i) / 10;
      g.lineWidth = i % 2 ? 2 : 4;
      g.beginPath(); g.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); g.lineTo(128 + Math.cos(a) * (i % 2 ? 88 : 82), 128 + Math.sin(a) * (i % 2 ? 88 : 82)); g.stroke();
      if (i % 2 === 0) { g.font = 'bold 22px Arial'; g.fillText(String(i * 10), 128 + Math.cos(a) * 64, 128 + Math.sin(a) * 64); }
    }
    g.font = 'bold 20px Arial'; g.fillText('kPa', 128, 178);
    const a = a0 + (a1 - a0) * Math.min(1, (p * 101) / 100);
    g.strokeStyle = '#e03131'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); g.stroke();
    g.fillStyle = '#343a40'; g.beginPath(); g.arc(128, 128, 10, 0, TAU); g.fill();
  }

  PS.register('belljar-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { ring: false, pump: 0, p: 1, pad: true, t: 0, L: 0, rows: [], snd: null, minP: 1 }; // pump：1 抽气，−1 放气，0 停止

    const wrap = h('div', { class: 'bench' });
    const left = h('div');
    const side = h('div', { class: 'bench-side' });
    wrap.append(left, side);
    el.append(wrap);
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    left.append(view);
    // 气压—声级图像：实时轨迹 + 记录的数据点
    const hist = [];
    const chart = PS.stage(h('div', { class: 'bj-chart' }), { ratio: '1000 / 330', minHeight: 170, draw: drawChart });
    left.append(chart.stage.parentNode);

    /* ---------- 场景 ---------- */
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.02, 20);
    camera.position.set(0.3, 0.72, 1.6);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0.08, 0.3, 0);
    controls.enableDamping = true;
    controls.minDistance = 0.5; controls.maxDistance = 4;
    controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a090, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(0.8, 2, 1.2); dl.castShadow = true;
    dl.shadow.mapSize.set(1024, 1024);
    Object.assign(dl.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.5, far: 5 });
    scene.add(dl);
    const Lam = (c, e) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));

    const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 1.1), Lam(0xf1f3f5));
    table.position.y = -0.025; table.receiveShadow = true; scene.add(table);
    // 底盘
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.34, 0.04, 48), Std(0x495057, { metalness: 0.5, roughness: 0.5 }));
    plate.position.set(JX, 0.02, 0); plate.castShadow = plate.receiveShadow = true; scene.add(plate);
    // 泡沫塑料垫
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.22), Lam(0xfff3bf));
    foam.position.set(JX, 0.0625, 0); foam.castShadow = true; scene.add(foam);
    // 电铃
    const bell = new THREE.Group();
    const bbase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.12), Std(0x343a40, { roughness: 0.6 }));
    bbase.position.y = 0.03; bbase.castShadow = true; bell.add(bbase);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 10), Std(0xadb5bd, { metalness: 0.8, roughness: 0.3 }));
    post.position.set(-0.03, 0.125, 0); bell.add(post);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 32, 16, 0, TAU, 0, Math.PI / 2), Std(0xe03131, { metalness: 0.55, roughness: 0.3, side: THREE.DoubleSide }));
    dome.position.set(-0.03, 0.19, 0); dome.castShadow = true; bell.add(dome);
    const arm = new THREE.Group();
    arm.position.set(0.07, 0.06, 0);
    const armRod = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.13, 0.006), Std(0xadb5bd, { metalness: 0.8, roughness: 0.3 }));
    armRod.position.y = 0.065; arm.add(armRod);
    const hammer = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), Std(0x212529, { metalness: 0.6 }));
    hammer.position.set(-0.006, 0.13, 0); arm.add(hammer);
    bell.add(arm);
    bell.position.set(JX, 0.085, 0);
    scene.add(bell);
    // 玻璃罩（旋转体）
    const prof = [];
    prof.push(new THREE.Vector2(JR + 0.012, 0));
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push(new THREE.Vector2((JR + 0.006) * Math.cos(a) + 0.0001, JH + JR * Math.sin(a))); }
    const jarGeo = new THREE.LatheGeometry(prof, 48);
    const jar = new THREE.Mesh(jarGeo, Std(0xd0ebff, { transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    jar.position.set(JX, 0.04, 0); jar.renderOrder = 3; scene.add(jar);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(JR + 0.006, 0.008, 8, 48), Lam(0x212529));
    rim.rotation.x = Math.PI / 2; rim.position.set(JX, 0.045, 0); scene.add(rim);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), Std(0xadb5bd, { transparent: true, opacity: 0.6 }));
    knob.position.set(JX, 0.04 + JH + JR + 0.02, 0); scene.add(knob);
    // 抽气机与气压计
    const pump = new THREE.Group();
    const pbody = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.24), Lam(0x3b5bdb));
    pbody.position.y = 0.13; pbody.castShadow = true; pump.add(pbody);
    const gc = gaugeCanvas();
    drawGauge(gc, 1);
    const gtex = new THREE.CanvasTexture(gc);
    const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), new THREE.MeshBasicMaterial({ map: gtex }));
    gauge.position.set(0, 0.15, 0.1205); pump.add(gauge);
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16), Std(0xced4da, { metalness: 0.7, roughness: 0.3 }));
    piston.position.set(0.08, 0.3, -0.04); pump.add(piston);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.03), Lam(0x212529));
    pump.add(handle);
    pump.position.set(0.62, 0, 0.05);
    scene.add(pump);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(JX + 0.3, 0.025, 0.08), new THREE.Vector3(0.2, 0.0, 0.25), new THREE.Vector3(0.42, 0.0, 0.2), new THREE.Vector3(0.47, 0.06, 0.1)]), 40, 0.012, 8), Lam(0x212529));
    scene.add(hose);
    // 罩内空气分子
    const mpos = new Float32Array(NMOL * 3), mvel = [];
    function inside(x, y, z) {
      const r = Math.hypot(x, z);
      if (y < 0.09 || y > 0.04 + JH + JR - 0.03) return false;
      if (y > 0.04 + JH) return r < Math.sqrt(Math.max(0, JR * JR - (y - 0.04 - JH) ** 2)) - 0.02;
      return r < JR - 0.02;
    }
    for (let i = 0; i < NMOL; i++) {
      let x, y, z;
      do { x = PS.rand(-JR, JR); y = PS.rand(0.09, 0.66); z = PS.rand(-JR, JR); } while (!inside(x, y, z) || (Math.abs(x) < 0.12 && y < 0.29 && Math.abs(z) < 0.09));
      mpos.set([x, y, z], i * 3);
      mvel.push([PS.rand(-1, 1) * 0.12, PS.rand(-1, 1) * 0.12, PS.rand(-1, 1) * 0.12]);
    }
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
    const mols = new THREE.Points(mg, new THREE.PointsMaterial({ color: 0x4c6ef5, size: 0.012 }));
    mols.position.x = JX;
    scene.add(mols);
    // 向外传播的声波（半透明球壳）
    const shells = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0x7048e8, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide }));
      m.position.set(JX, 0.3, 0); m.renderOrder = 4; scene.add(m);
      return m;
    });

    // 标签
    const overlay = h('div', { class: 'overlay', style: { inset: 0 } });
    view.append(overlay);
    const lbl = {
      jar: h('div', { class: 'label3d', html: '玻璃罩' }),
      bell: h('div', { class: 'label3d', html: '电铃' }),
      foam: h('div', { class: 'label3d', html: '泡沫塑料' }),
      pump: h('div', { class: 'label3d', html: '抽气机' }),
    };
    Object.values(lbl).forEach((e) => overlay.append(e));
    const hud = h('div', { class: 'bj-hud' });
    view.append(hud);
    const v3 = new THREE.Vector3();
    function place(elm, x, y, z) {
      v3.set(x, y, z).project(camera);
      const r = view.getBoundingClientRect();
      elm.style.display = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05 ? '' : 'none';
      elm.style.left = ((v3.x + 1) / 2) * r.width + 'px';
      elm.style.top = ((1 - v3.y) / 2) * r.height + 'px';
    }

    /* ---------- 声音的大小 ---------- */
    // 经空气传出的比例随气压减小；经底座（固体）漏出的部分取决于是否垫泡沫塑料
    function loudness() {
      if (!st.ring) return 0;
      const air = Math.pow(st.p, 0.6);
      const leak = st.pad ? 0.025 : 0.38;
      return 1 - (1 - air) * (1 - leak);
    }
    const dB = (L) => (L <= 0 ? 0 : Math.round(20 + 55 * L));
    function hearText(L) {
      if (!st.ring) return '电铃没有响';
      if (L > 0.8) return '铃声响亮';
      if (L > 0.45) return '铃声变小了';
      if (L > 0.15) return '铃声很小';
      return '几乎听不到';
    }

    /* ---------- 运行 ---------- */
    let gaugeP = -1;
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.pump === 1) { st.p = Math.max(P_MIN, st.p * Math.exp(-dt / 3.2)); if (st.p <= P_MIN + 1e-4) setPump(0); }
      else if (st.pump === -1) { st.p = Math.min(1, 1 - (1 - st.p) * Math.exp(-dt / 1.0)); if (st.p > 0.999) { st.p = 1; setPump(0); } }
      st.minP = Math.min(st.minP, st.p);
      st.L = loudness();
      if (st.snd) st.snd.setGain(0.2 * st.L);
      // 电铃小锤
      arm.rotation.z = st.ring ? 0.12 * Math.max(0, Math.sin(st.t * TAU * 9)) : 0;
      dome.position.x = -0.03 + (st.ring ? 0.0015 * Math.sin(st.t * 300) : 0);
      // 分子
      const n = Math.round(NMOL * st.p);
      mg.setDrawRange(0, n);
      for (let i = 0; i < n; i++) {
        const v = mvel[i];
        for (let k = 0; k < 3; k++) { v[k] += PS.rand(-1, 1) * 0.6 * dt; v[k] = PS.clamp(v[k], -0.2, 0.2); }
        const x = mpos[i * 3] + v[0] * dt, y = mpos[i * 3 + 1] + v[1] * dt, z = mpos[i * 3 + 2] + v[2] * dt;
        if (inside(x, y, z)) { mpos[i * 3] = x; mpos[i * 3 + 1] = y; mpos[i * 3 + 2] = z; } else { v[0] *= -1; v[1] *= -1; v[2] *= -1; }
      }
      mg.attributes.position.needsUpdate = true;
      // 声波
      shells.forEach((m, i) => {
        const ph = (st.t * 0.7 + i / 3) % 1;
        m.scale.setScalar(0.36 + ph * 1.0);
        m.material.opacity = 0.16 * st.L * (1 - ph);
        m.visible = st.L > 0.02;
      });
      // 抽气机活塞
      const pk = st.pump !== 0 ? Math.sin(st.t * 8) * 0.04 : 0;
      piston.position.y = 0.3 + pk; handle.position.set(0.08, 0.385 + pk, -0.04);
      if (Math.abs(gaugeP - st.p) > 0.002) { drawGauge(gc, st.p); gtex.needsUpdate = true; gaugeP = st.p; }
      controls.update();
      renderer.render(scene, camera);
      place(lbl.jar, JX - 0.2, 0.62, 0);
      place(lbl.bell, JX - 0.03, 0.42, 0);
      place(lbl.foam, JX + 0.16, 0.1, 0.12);
      place(lbl.pump, 0.62, 0.5, 0.05);
      hud.innerHTML = '罩内气压 ' + (st.p * 101).toFixed(st.p < 0.1 ? 1 : 0) + ' kPa';
      updatePanel();
      if (st.ring) {
        const last = hist[hist.length - 1];
        if (!last || Math.abs(last[0] - st.p) > 0.004 || Math.abs(last[1] - st.L) > 0.004) { hist.push([st.p, st.L]); if (hist.length > 600) hist.shift(); }
      }
      chart.render();
    }, view);

    function drawChart(ctx, w, hh) {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hh);
      const b = { x: 54, y: 26, w: w - 80, h: hh - 62 };
      const X = (p) => b.x + (p * 101 / 110) * b.w, Y = (d) => b.y + b.h - ((d - 10) / 80) * b.h;
      ctx.strokeStyle = '#e9ecef'; ctx.lineWidth = 1; ctx.font = PS.font(11, 500); ctx.fillStyle = '#6b7487';
      for (let k = 0; k <= 100; k += 20) { ctx.beginPath(); ctx.moveTo(X(k / 101), b.y); ctx.lineTo(X(k / 101), b.y + b.h); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(k, X(k / 101), b.y + b.h + 15); }
      for (let d = 10; d <= 90; d += 20) { ctx.beginPath(); ctx.moveTo(b.x, Y(d)); ctx.lineTo(b.x + b.w, Y(d)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(d, b.x - 6, Y(d) + 4); }
      PS.draw.arrow(ctx, b.x, b.y + b.h, b.x + b.w + 14, b.y + b.h, { width: 1.4, head: 7 });
      PS.draw.arrow(ctx, b.x, b.y + b.h, b.x, b.y - 10, { width: 1.4, head: 7 });
      ctx.fillStyle = '#1b2333'; ctx.font = PS.font(12, 700); ctx.textAlign = 'left';
      ctx.fillText('声级/dB', b.x + 6, b.y - 8);
      ctx.textAlign = 'right'; ctx.fillText('罩内气压/kPa', b.x + b.w + 12, b.y + b.h - 6);
      ctx.textAlign = 'center'; ctx.fillStyle = '#3a4458'; ctx.fillText('气压—声级图像（模拟）', b.x + b.w / 2, b.y - 8);
      // 实时轨迹
      if (hist.length > 1) {
        ctx.strokeStyle = 'rgba(59,91,219,.55)'; ctx.lineWidth = 2;
        ctx.beginPath();
        hist.forEach(([p, L], i) => { const x = X(p), y = Y(dB(L)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      }
      st.rows.forEach((r) => { ctx.fillStyle = r.pad ? '#2b8a3e' : '#e03131'; ctx.beginPath(); ctx.arc(X(r.p), Y(r.db), 5, 0, TAU); ctx.fill(); });
      if (st.ring) { ctx.fillStyle = '#f08c00'; ctx.beginPath(); ctx.arc(X(st.p), Y(dB(st.L)), 6, 0, TAU); ctx.fill(); }
      // 推理：气压为零时
      if (st.minP < 0.05 && st.pad) {
        ctx.setLineDash([5, 4]); ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(st.minP), Y(dB(Math.max(0.03, loudnessAt(st.minP))))); ctx.lineTo(X(0), Y(12)); ctx.stroke(); ctx.setLineDash([]);
        PS.draw.text(ctx, '推理：真空时听不到声音', X(0) + 10, Y(24), { size: 11.5, weight: 700, color: '#7048e8' });
      }
    }
    function loudnessAt(p) { const air = Math.pow(p, 0.6); return 1 - (1 - air) * (1 - 0.025); }

    /* ---------- 面板 ---------- */
    const ringBtn = PS.ui.button('🔔 接通电铃', () => {
      st.ring = !st.ring;
      ringBtn.innerHTML = st.ring ? '⏻ 断开电铃' : '🔔 接通电铃';
      ringBtn.className = st.ring ? 'btn btn-red' : 'btn btn-primary';
      if (st.ring) st.snd = PS.audio.bell(0.0001); else if (st.snd) { st.snd.stop(); st.snd = null; }
    }, 'btn btn-primary');
    const pumpBtn = PS.ui.button('⬇ 开始抽气', () => setPump(st.pump === 1 ? 0 : 1), 'btn');
    const ventBtn = PS.ui.button('⬆ 打开阀门放气', () => setPump(st.pump === -1 ? 0 : -1), 'btn');
    function setPump(v) {
      st.pump = v;
      pumpBtn.innerHTML = v === 1 ? '⏸ 停止抽气' : '⬇ 开始抽气';
      ventBtn.innerHTML = v === -1 ? '⏸ 关闭阀门' : '⬆ 打开阀门放气';
      pumpBtn.classList.toggle('btn-accent', v === 1);
      ventBtn.classList.toggle('btn-accent', v === -1);
    }
    const padT = PS.ui.toggle('电铃下面垫泡沫塑料', true, (v) => { st.pad = v; foam.visible = v; bell.position.y = v ? 0.085 : 0.04; lbl.foam.style.visibility = v ? '' : 'hidden'; });
    const meter = PS.levelMeter('听到的铃声');
    const pR = PS.ui.readout('罩内气压', '101 kPa');
    const dbR = PS.ui.readout('声级计（模拟）', '—', 'accent');
    const msg = h('div', { class: 'feedback info show small' }, '先接通电铃，听一听铃声；再开始抽气，注意铃声的变化。');
    const tbody = h('tbody');
    const analysis = h('div', { class: 'small' });
    function record() {
      if (!st.ring) { msg.innerHTML = '先接通电铃再记录。'; return; }
      st.rows.push({ p: st.p, db: dB(st.L), txt: hearText(st.L), pad: st.pad });
      renderTable();
      PS.sound.tick();
    }
    function renderTable() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, i + 1), h('td', null, (r.p * 101).toFixed(r.p < 0.1 ? 1 : 0)), h('td', null, r.db), h('td', null, r.txt + (r.pad ? '' : '（未垫泡沫）')))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '在不同气压下点“记录”')));
      const ok = st.rows.filter((r) => r.pad);
      const ps = new Set(ok.map((r) => Math.round(r.p * 20)));
      if (ok.length >= 3 && ps.size >= 3) {
        analysis.innerHTML = '<p style="margin:0 0 6px"><b>现象：</b>罩内空气越少，听到的铃声越小；放进空气，铃声又变大。</p>' +
          '<p style="margin:0 0 6px"><b>推理：</b>如果把罩内的空气<b>全部抽出</b>，我们将<b>听不到</b>铃声。</p>' +
          '<p style="margin:0 0 6px"><b>结论：</b><span class="hl">声音的传播需要介质，真空不能传声。</span></p>' +
          '<p class="muted" style="margin:0">实际上不可能把空气抽干净，所以总还能听到微弱的铃声——这个结论是在实验基础上<b>推理</b>得出的（理想实验法 / 科学推理法）。</p>';
      } else analysis.innerHTML = '<span class="muted">至少在 3 个不同的气压下记录数据（电铃下垫着泡沫塑料），这里会给出结论。</span>';
    }
    let lastMsg = '';
    function updatePanel() {
      meter.set(st.L, hearText(st.L));
      pR.set((st.p * 101).toFixed(st.p < 0.1 ? 1 : 0) + ' kPa');
      dbR.set(st.ring ? dB(st.L) + ' dB' : '—');
      let m;
      if (!st.ring) m = '先接通电铃，听一听铃声；再开始抽气，注意铃声的变化。';
      else if (!st.pad && st.p < 0.2) m = '空气已经很少了，铃声却还挺响——声音通过电铃底座和底盘（<b>固体</b>）传了出来！所以实验时要在电铃下垫上泡沫塑料。';
      else if (st.pump === 1) m = '正在抽气……罩内空气越来越少，铃声越来越小。';
      else if (st.pump === -1) m = '空气逐渐进入罩内，铃声又逐渐变大了。';
      else if (st.p <= P_MIN + 1e-3) m = '已经抽到最低气压，仍能听到非常微弱的铃声（罩内还残留少量空气）。看，电铃的小锤还在敲——<b>声源在振动，声音却几乎传不出来</b>。';
      else m = st.p > 0.98 ? '铃声响亮。点“开始抽气”。' : '可以点“记录”保存当前的数据。';
      if (m !== lastMsg) { msg.innerHTML = m; lastMsg = m; }
    }
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 电源与抽气机'), h('div', { class: 'row' }, ringBtn), h('div', { class: 'row' }, pumpBtn, ventBtn), padT.el),
      h('div', { class: 'panel' }, h('h4', null, '② 观察与倾听'), meter.el, h('div', { class: 'readouts' }, pR.el, dbR.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 记录数据'), h('div', { class: 'row' }, PS.ui.button('📝 记录', record, 'btn btn-green btn-sm'), PS.ui.button('清空', () => { st.rows = []; renderTable(); }, 'btn btn-ghost btn-sm')),
        h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次'), h('th', null, '气压/kPa'), h('th', null, '声级/dB'), h('th', null, '现象'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '④ 分析论证'), analysis)
    );
    PS.audio.whenHidden(view, () => { if (st.ring) ringBtn.click(); });

    function resize() {
      const r = view.getBoundingClientRect();
      if (r.width < 2) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    renderTable();
    loop.start();
    document.head.append(h('style', null, `
      .bj-chart{margin-top:10px}
      .bj-hud{position:absolute;right:10px;top:10px;background:rgba(255,255,255,.92);border-radius:8px;padding:3px 10px;font-size:13px;font-weight:700;color:#3a4458;pointer-events:none;font-variant-numeric:tabular-nums}
    `));
  });
})();
