/* 第11章第4节：3D 过山车——从不同高度由静止出发，能否冲过后面的坡顶；有无摩擦与空气阻力；动能、重力势能、内能柱状图；跟随视角。依赖 three.js、OrbitControls、energy.js（.fc-* 样式来自 force.js） */
(function () {
  'use strict';
  const { h } = PS;
  const K = 0.02, G = 9.8, MU = 0.05, BRAKE = 215; // 场景单位 / 米；等效阻力系数；进站刹车区起点 x（m）
  // 轨道的侧视轮廓（米）：提升坡顶 62 m，第二个坡顶约 45 m，第三个坡顶约 30 m，终点站 12 m
  const PTS = [[-10, 6], [5, 6], [18, 30], [28, 56], [36, 62], [44, 56], [56, 25], [66, 6], [74, 3], [82, 6], [92, 30], [100, 43], [106, 45], [112, 43], [120, 25], [130, 6], [138, 4], [146, 6], [156, 22], [164, 30], [172, 22], [181, 8], [190, 4], [200, 6], [210, 11], [220, 12], [240, 12], [258, 12]];

  PS.register('coaster-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { H: 50, fric: false, follow: false, run: false, s: 0, v: 0, q: 0, back: false, done: false, lastMsg: '', vmax: 0 };
    const view = h('div', { class: 'stage-3d', style: { background: '#d0ebff' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。过山车在出发点由静止开始下滑（不再用电机牵引）；到终点站后自动刹车。')), side));

    // ---------- 曲线（米） ----------
    const curveM = new THREE.CatmullRomCurve3(PTS.map((p) => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal');
    const LEN = curveM.getLength();
    const N = 1600, samp = [];
    for (let i = 0; i <= N; i++) { const p = curveM.getPointAt(i / N); samp.push(p); }
    const yAt = (s) => curveM.getPointAt(PS.clamp(s / LEN, 0, 1)).y;
    const peak = (x0, x1) => samp.filter((p) => p.x > x0 && p.x < x1).reduce((m, p) => Math.max(m, p.y), 0);
    const HILL2 = peak(95, 118), HILL3 = peak(150, 178);
    function startS(H) { // 提升坡顶之后、高度为 H 的位置
      for (let i = 0; i <= N; i++) { const p = samp[i]; if (p.x > 37 && p.y <= H) return (i / N) * LEN; }
      return 0;
    }

    // ---------- 控件 ----------
    const hSeg = PS.ui.seg([40, 50, 60].map((v) => ({ value: v, label: '出发高度 ' + v + ' m' })), st.H, (v) => { st.H = v; reset(); });
    hSeg.el.style.flexWrap = 'wrap';
    const fT = PS.ui.toggle('有摩擦和空气阻力', st.fric, (v) => { st.fric = v; reset(); });
    const folT = PS.ui.toggle('跟随过山车', st.follow, (v) => { st.follow = v; if (!v) { camera.position.set(2.5, 1.0, 4.6); controls.target.set(2.5, 0.45, 0); } });
    const goB = PS.ui.button('▶ 出发', () => { if (st.run) return; if (st.done || st.s !== startS(st.H)) reset(); st.run = true; }, 'btn btn-primary btn-sm');
    const rd = { y: PS.ui.readout('高度', '—'), v: PS.ui.readout('速度', '—') };
    const msg = h('div', { class: 'fc-msg' });
    const gbox = h('div');
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 出发的高度'), hSeg.el, h('div', { class: 'small muted', style: { marginTop: '4px' } }, '后面两个坡顶的高度约为 ' + Math.round(HILL2) + ' m 和 ' + Math.round(HILL3) + ' m。')),
      h('div', { class: 'panel' }, h('h4', null, '② 条件'), fT.el, folT.el, h('div', { class: 'row', style: { marginTop: '6px' } }, goB, PS.ui.button('回到出发点', reset, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, '③ 能量'), h('div', { class: 'en-read' }, rd.y.el, rd.v.el), gbox, msg));
    const bars = PS.stage(gbox, { ratio: '300 / 220', draw: (ctx, w, hh) => {
      const F = PS.virtual(ctx, w, hh, 300, 220);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 220);
      const y = yAt(st.s), k = 0.5 * st.v * st.v, g = G * y;
      PS.en.bars(ctx, 6, 8, 288, 206, [{ n: '动能', v: k, c: PS.EC.k }, { n: '重力\n势能', v: g, c: PS.EC.g }, { n: '内能\n(增加)', v: st.q, c: PS.EC.q }, { n: '机械\n能', v: k + g, c: PS.EC.m }], { F, max: G * 62, values: false, lines: 2, bg: false });
    } });

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd0ebff);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.01, 60);
    camera.position.set(2.5, 1.0, 4.6);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(2.5, 0.45, 0);
    controls.enableDamping = true; controls.minDistance = 0.3; controls.maxDistance = 10; controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8a5a, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(2, 5, 3); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), Std(0x8ce99a, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(2.5, 0, 0); scene.add(ground);
    // 轨道：两条钢轨 + 枕木 + 支柱
    const railM = Std(0xe03131, { metalness: 0.4, roughness: 0.4 });
    [-1, 1].forEach((z) => {
      const c = new THREE.CatmullRomCurve3(PTS.map((p) => new THREE.Vector3(p[0] * K, p[1] * K, z * 0.016)), false, 'centripetal');
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(c, 600, 0.0045, 6, false), railM));
    });
    const tieM = Std(0x495057), supM = Std(0xadb5bd, { metalness: 0.3 });
    for (let d = 0; d < LEN; d += 2.5) {
      const p = curveM.getPointAt(d / LEN), t = curveM.getTangentAt(d / LEN);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.04), tieM);
      tie.position.set(p.x * K, p.y * K - 0.004, 0); tie.rotation.z = Math.atan2(t.y, t.x); scene.add(tie);
    }
    for (let d = 4; d < LEN; d += 9) {
      const p = curveM.getPointAt(d / LEN);
      if (p.y < 3.5) continue;
      const hh = p.y * K - 0.006;
      [-1, 1].forEach((z) => { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, hh, 6), supM); sp.position.set(p.x * K, hh / 2, z * 0.016); scene.add(sp); });
    }
    // 站台
    const stM = Std(0xfab005);
    const st1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.08), stM); st1.position.set(BRAKE * K + 0.38, 12 * K - 0.025, 0.07); scene.add(st1);
    // 车
    const car = new THREE.Group();
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.024, 0.042), Std(0x3b5bdb, { metalness: 0.2, roughness: 0.4 })); cb.position.y = 0.02; car.add(cb);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.042), Std(0xfab005)); front.position.set(0.036, 0.024, 0); car.add(front);
    [[-0.025, 1], [0.025, 1], [-0.025, -1], [0.025, -1]].forEach(([x, z]) => { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 12), tieM); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.007, z * 0.018); car.add(wh); });
    [[-0.015], [0.015]].forEach(([x]) => { const hd = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 8), Std(0xffd8a8)); hd.position.set(x, 0.042, 0); car.add(hd); });
    car.scale.setScalar(1.6);
    scene.add(car);

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const LB = { h2: lab('约 ' + Math.round(HILL2) + ' m'), h3: lab('约 ' + Math.round(HILL3) + ' m'), st: lab('终点站'), s: lab('', 'ref') };
    const v3 = new THREE.Vector3();
    function place(e, p) {
      v3.copy(p).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-50%)';
    }

    function reset() {
      st.run = false; st.s = startS(st.H); st.v = 0; st.q = 0; st.back = false; st.done = false; st.vmax = 0; st.passed = 0;
      tell(); bars.render();
    }
    function tell() {
      const y = yAt(st.s);
      rd.y.set(PS.fmt(y, 1) + ' m'); rd.v.set(PS.fmt(Math.abs(st.v), 1) + ' m/s<br><span class="small muted">' + PS.fmt(Math.abs(st.v) * 3.6, 0) + ' km/h</span>');
      let t, cls = 'info';
      if (!st.run && !st.done && !st.back && st.v === 0) t = '过山车停在 ' + st.H + ' m 高的地方。猜一猜：它能冲过后面约 ' + Math.round(HILL2) + ' m 和 ' + Math.round(HILL3) + ' m 高的坡顶吗？' + (st.fric ? '' : '<br><span class="small">现在不计摩擦和空气阻力：只有动能和势能相互转化。</span>');
      else if (st.done) { cls = 'ok'; t = '到站了！一路上：下坡时<span class="en-g">重力势能</span>转化为<span class="en-k">动能</span>，上坡时<span class="en-k">动能</span>转化为<span class="en-g">重力势能</span>。' + (st.fric ? '有摩擦和空气阻力时，一部分机械能转化为<span class="en-q">内能</span>，机械能逐渐减小。' : '不计阻力时，机械能的总量<b>保持不变</b>（机械能守恒）。') + '进站时刹车，机械能转化为<span class="en-q">内能</span>，过山车停下来。'; }
      else if (st.back) { cls = 'bad'; t = '没能冲过 ' + (st.passed ? '约 ' + Math.round(HILL3) : '约 ' + Math.round(HILL2)) + ' m 的坡顶，又滑了回来！' + (st.fric ? '有阻力时机械能不断减小，过山车能到达的高度<b>低于</b>出发点；它最后会停在谷底。' : '不计阻力时，过山车最高只能回到与出发点<b>同样的高度</b>（' + st.H + ' m），比这更高的坡顶冲不过去。'); }
      else t = st.v * (curveM.getTangentAt(PS.clamp(st.s / LEN, 0, 1)).y) < 0 ? '<b>下坡</b>：高度减小、速度增大，重力势能转化为动能。' : '<b>上坡</b>：速度减小、高度增大，动能转化为重力势能。';
      if (t !== st.lastMsg) { st.lastMsg = t; msg.className = 'fc-msg ' + cls; msg.innerHTML = t; }
    }
    const loop = PS.loop((dt) => {
      if (st.run) {
        const n = 20, h1 = (dt * 2.2) / n; // 时间放快
        for (let i = 0; i < n; i++) {
          const u = PS.clamp(st.s / LEN, 0, 1), t = curveM.getTangentAt(u), p = curveM.getPointAt(u);
          let a = -G * t.y;
          const fr = st.fric ? MU * G * Math.abs(t.x) + 0.0012 * st.v * st.v : 0;
          const brake = p.x > BRAKE ? 12 : 0;
          const dec = fr + brake;
          if (Math.abs(st.v) < 0.05 && Math.abs(a) <= dec) { st.v = 0; if (brake && p.x > BRAKE) { st.done = true; st.run = false; break; } }
          else { a -= Math.sign(st.v || a) * dec; const v0 = st.v; st.v += a * h1; if (v0 && Math.sign(st.v) !== Math.sign(v0) && dec > 0) st.v = 0; st.s += st.v * h1; if (dec) st.q += dec * Math.abs(st.v) * h1; }
          if (st.v < -0.01 && !st.back) st.back = true;
          if (p.x > 150) st.passed = 1;
          if (st.s <= 0) { st.s = 0; st.v = Math.abs(st.v); }
          if (st.s >= LEN) { st.s = LEN; st.v = 0; st.done = true; st.run = false; }
        }
        // 机械能守恒时的数值误差：按能量修正速度大小
        if (!st.fric && yAt(st.s) <= st.H) { const vv = Math.sqrt(Math.max(0, 2 * G * (st.H - yAt(st.s)))); const p = curveM.getPointAt(PS.clamp(st.s / LEN, 0, 1)); if (p.x < BRAKE) st.v = Math.sign(st.v || 1) * vv; }
        if (st.fric && st.back && Math.abs(st.v) < 0.02 && Math.abs(curveM.getTangentAt(PS.clamp(st.s / LEN, 0, 1)).y) < 0.03) { st.v = 0; st.run = false; }
        tell(); bars.render();
      }
      const u = PS.clamp(st.s / LEN, 0, 1), p = curveM.getPointAt(u), t = curveM.getTangentAt(u);
      car.position.set(p.x * K, p.y * K + 0.002, 0); car.rotation.z = Math.atan2(t.y, t.x);
      if (st.follow) {
        const want = new THREE.Vector3(p.x * K - 0.25, p.y * K + 0.18, 0.55), tg = new THREE.Vector3(p.x * K + 0.05, p.y * K, 0);
        camera.position.lerp(want, Math.min(1, dt * 4)); controls.target.lerp(tg, Math.min(1, dt * 4));
      }
      controls.update();
      renderer.render(scene, camera);
      place(LB.h2, new THREE.Vector3(106 * K, HILL2 * K + 0.08, 0));
      place(LB.h3, new THREE.Vector3(164 * K, HILL3 * K + 0.08, 0));
      place(LB.st, new THREE.Vector3(232 * K, 12 * K + 0.08, 0));
      LB.s.innerHTML = '出发点 ' + st.H + ' m'; place(LB.s, new THREE.Vector3(curveM.getPointAt(startS(st.H) / LEN).x * K + 0.2, st.H * K + 0.1, 0));
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    el._st = st;
    reset();
    loop.start();
  });
})();
