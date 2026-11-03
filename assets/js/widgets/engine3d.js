/* 第14章第1节：3D 四冲程内燃机——汽油机 / 柴油机，半透明汽缸，凸轮轴（转速是曲轴的一半）带动进气门、排气门，火花塞 / 喷油嘴，
 * 活塞、连杆、曲轴、飞轮；燃气“分子”从进气道进入、从排气道排出；四个冲程的对照表与计数。依赖 three.js、OrbitControls、thermal.js、heatengine.js（PS.STROKES） */
(function () {
  'use strict';
  const { h } = PS;
  const TH = PS.th;
  const R = 0.04, CR = 0.035, L = 0.11, PH = 0.05, PIN = 0.024, CLR = 0.018;
  const PT0 = CR + L + PIN, CEIL = PT0 + CLR, CYL_B = PT0 - 2 * CR - PH + 0.008;
  const IX = -0.019, EX = 0.019, LIFT = 0.008, CAM_Y = 0.255, CAM_BASE = 0.008, PORT_Y = CEIL + 0.032, BELT_Z = -0.062;
  const D2R = Math.PI / 180;

  PS.register('engine-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const STK = PS.STROKES;
    const st = { type: 'petrol', phi: 0, total: 0, run: true, speed: 60, target: null, labels: true, user: false };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '5 / 4' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。汽缸做成了透明的；小点表示汽缸里的气体（示意），颜色越红温度越高。')), side));
    const typeSeg = PS.ui.seg([{ value: 'petrol', label: '汽油机' }, { value: 'diesel', label: '柴油机' }], st.type, (v) => { st.type = v; setType(); });
    const runB = PS.ui.button('⏸ 暂停', () => { st.user = true; st.run = !st.run; st.target = null; runB.innerHTML = st.run ? '⏸ 暂停' : '▶ 运转'; }, 'btn btn-primary btn-sm');
    const stepB = PS.ui.button('下一个冲程 ⏭', () => { st.user = true; st.run = false; runB.innerHTML = '▶ 运转'; st.target = (Math.floor(st.total / 180 + 1e-6) + 1) * 180 + 90; }, 'btn btn-sm');
    const spSeg = PS.ui.seg([{ value: 25, label: '很慢' }, { value: 60, label: '慢' }, { value: 300, label: '快' }], st.speed, (v) => { st.user = true; st.speed = v; });
    const lbT = PS.ui.toggle('部件名称', true, (v) => { st.labels = v; });
    const big = h('div', { class: 'e3-big' });
    const tbl = h('table', { class: 't e3-t' });
    const cnt = h('div', { class: 'th-read' });
    const rd = { rev: PS.ui.readout('曲轴转过', '0 周'), rec: PS.ui.readout('活塞往复', '0 次'), w: PS.ui.readout('对外做功', '0 次') };
    cnt.append(rd.rev.el, rd.rec.el, rd.w.el);
    const note = h('div', { class: 'th-msg info' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择内燃机'), typeSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 让它转起来'), h('div', { class: 'row' }, runB, stepB), h('div', { class: 'row', style: { marginTop: '6px' } }, spSeg.el), h('div', { style: { marginTop: '6px' } }, lbT.el)),
      h('div', { class: 'panel' }, h('h4', null, '③ 现在是哪个冲程'), big, h('div', { class: 'table-wrap', style: { margin: '6px 0 0' } }, tbl), note),
      h('div', { class: 'panel' }, h('h4', null, '④ 数一数'), cnt, PS.ui.button('计数清零', () => { st.total = st.phi; upd(true); }, 'btn btn-ghost btn-sm')));
    tbl.innerHTML = '<thead><tr><th></th>' + STK.map((s) => '<th>' + s.s + '</th>').join('') + '</tr></thead><tbody>'
      + '<tr><td>进气门</td>' + STK.map((s) => '<td>' + (s.iv ? '打开' : '关闭') + '</td>').join('') + '</tr>'
      + '<tr><td>排气门</td>' + STK.map((s) => '<td>' + (s.ev ? '打开' : '关闭') + '</td>').join('') + '</tr>'
      + '<tr><td>活塞</td>' + STK.map((s) => '<td>' + (s.up ? '向上' : '向下') + '</td>').join('') + '</tr>'
      + '<tr><td>能量转化</td>' + STK.map((s, i) => '<td>' + (i === 1 ? '机械能<br>→内能' : i === 2 ? '内能→<br>机械能' : '—') + '</td>').join('') + '</tr></tbody>';

    // ---------- 场景 ----------
    const E = TH.three(view, { cam: [0.42, 0.25, 0.52], target: [0, 0.075, -0.02], min: 0.15, max: 1.3, fov: 38 });
    const { scene, Std } = E;
    const metal = Std(0xadb5bd, { metalness: 0.75, roughness: 0.32 });
    const dark = Std(0x495057, { metalness: 0.6, roughness: 0.4 });
    const glass = Std(0xd0e4f7, { transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const cyl = (r1, r2, hh, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, hh, seg || 32), m);
    const box = (x, y, z, m) => new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m);
    // 底座与支架
    const base = box(0.28, 0.012, 0.22, Std(0x8a5a1c, { roughness: 0.85 })); base.position.set(0, -0.116, -0.02); scene.add(base);
    [[-0.044]].forEach(([z]) => { const p = box(0.024, 0.11, 0.018, dark); p.position.set(0, -0.055, z); scene.add(p); });
    [[-0.055, -0.045], [0.055, -0.045]].forEach(([x, z]) => { const p = cyl(0.003, 0.003, CEIL + 0.11, dark, 8); p.position.set(x, (CEIL - 0.11) / 2, z); scene.add(p); });
    // 汽缸：后半边不透明，前半边透明
    const cylBack = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, CEIL - CYL_B, 40, 1, true, Math.PI / 2, Math.PI), Std(0xced4da, { metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }));
    cylBack.position.y = (CEIL + CYL_B) / 2; scene.add(cylBack);
    const cylFront = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, CEIL - CYL_B, 40, 1, true, -Math.PI / 2, Math.PI), glass);
    cylFront.position.y = (CEIL + CYL_B) / 2; cylFront.renderOrder = 8; scene.add(cylFront);
    const head = box(0.1, 0.01, 0.1, Std(0x868e96, { metalness: 0.5, roughness: 0.45 })); head.position.y = CEIL + 0.005; scene.add(head);
    // 气道（透明）
    const portM = Std(0xe7f5ff, { transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
    [[IX, -1], [EX, 1]].forEach(([x, sd]) => {
      const v = cyl(0.009, 0.009, PORT_Y - CEIL - 0.01, portM, 20); v.position.set(x, (PORT_Y + CEIL + 0.01) / 2, 0); v.renderOrder = 7; scene.add(v);
      const hz = cyl(0.009, 0.009, 0.09, portM, 20); hz.rotation.z = Math.PI / 2; hz.position.set(x + sd * 0.045, PORT_Y, 0); hz.renderOrder = 7; scene.add(hz);
      const el2 = new THREE.Mesh(new THREE.SphereGeometry(0.009, 16, 12), portM); el2.position.set(x, PORT_Y, 0); el2.renderOrder = 7; scene.add(el2);
    });
    // 气门、弹簧、凸轮轴
    const helix = (() => { const pts = []; for (let i = 0; i <= 140; i++) { const a = (i / 140) * Math.PI * 2 * 6; pts.push(new THREE.Vector3(Math.cos(a) * 0.0075, i / 140, Math.sin(a) * 0.0075)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.0011, 6); })();
    const camShape = (() => {
      const s = new THREE.Shape();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * Math.PI * 2, d = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
        const rr = CAM_BASE + (Math.abs(d) < Math.PI / 4 ? LIFT * Math.cos(2 * d) ** 2 : 0);
        i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      return new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: false });
    })();
    const valves = [IX, EX].map((x) => {
      const g = new THREE.Group(); g.position.x = x; scene.add(g);
      const vh = cyl(0.006, 0.0125, 0.004, metal); vh.position.y = 0.002; g.add(vh);
      const stem = cyl(0.0018, 0.0018, CAM_Y - CAM_BASE - CEIL, metal, 8); stem.position.y = (CAM_Y - CAM_BASE - CEIL) / 2; g.add(stem);
      const ret = cyl(0.0085, 0.0085, 0.002, dark, 16); ret.position.y = CAM_Y - CAM_BASE - CEIL - 0.008; g.add(ret);
      const spring = new THREE.Mesh(helix, Std(0x343a40, { metalness: 0.6, roughness: 0.35 })); scene.add(spring);
      const shaft = new THREE.Group(); shaft.position.set(x, CAM_Y, 0); scene.add(shaft);
      const rod = cyl(0.004, 0.004, 0.08, metal, 12); rod.rotation.x = Math.PI / 2; rod.position.z = -0.03; shaft.add(rod);
      const cam = new THREE.Mesh(camShape, Std(0x5c6670, { metalness: 0.7, roughness: 0.35 })); cam.position.z = -0.005; shaft.add(cam);
      const pul = cyl(0.016, 0.016, 0.008, Std(0xe9ecef, { metalness: 0.5, roughness: 0.4 })); pul.rotation.x = Math.PI / 2; pul.position.z = BELT_Z; shaft.add(pul);
      const mark = box(0.003, 0.012, 0.009, Std(0xe03131)); mark.position.set(0, 0.009, BELT_Z); shaft.add(mark);
      return { g, spring, shaft, ret };
    });
    // 火花塞 / 喷油嘴
    const plug = new THREE.Group(); plug.position.set(0, CEIL, -0.022); scene.add(plug);
    const plugA = new THREE.Group(); plug.add(plugA);
    const cer = cyl(0.005, 0.005, 0.03, Std(0xf8f9fa, { roughness: 0.4 }), 16); cer.position.y = 0.035; plugA.add(cer);
    const hex = cyl(0.008, 0.008, 0.008, metal, 6); hex.position.y = 0.016; plugA.add(hex);
    const tip = cyl(0.0012, 0.0012, 0.012, dark, 6); tip.position.y = 0.002; plugA.add(tip);
    const plugB = new THREE.Group(); plug.add(plugB);
    const inj = cyl(0.006, 0.0045, 0.045, Std(0x343a40, { metalness: 0.6, roughness: 0.35 }), 16); inj.position.y = 0.03; plugB.add(inj);
    const inTip = cyl(0.002, 0.001, 0.008, dark, 8); inTip.position.y = 0.002; plugB.add(inTip);
    const dotTex = E.tex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff3bf, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    spark.position.set(0, CEIL - 0.006, -0.022); spark.scale.setScalar(0.03); spark.renderOrder = 10; scene.add(spark);
    const NS = 60, sprayG = new THREE.BufferGeometry(), sprayP = new Float32Array(NS * 3);
    sprayG.setAttribute('position', new THREE.BufferAttribute(sprayP, 3));
    const spray = new THREE.Points(sprayG, new THREE.PointsMaterial({ size: 0.0035, map: dotTex, color: 0xb58900, transparent: true, depthWrite: false, opacity: 0 })); spray.renderOrder = 9; scene.add(spray);
    const flash = new THREE.PointLight(0xffa94d, 0, 0.5); flash.position.set(0, CEIL - 0.01, 0); scene.add(flash);
    // 活塞、连杆、曲轴、飞轮
    const piston = new THREE.Group(); scene.add(piston);
    const pBody = cyl(R - 0.0008, R - 0.0008, PH, Std(0xced4da, { metalness: 0.7, roughness: 0.3 }), 40); pBody.position.y = -PH / 2; piston.add(pBody);
    for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.0006, 0.0011, 6, 40), dark); ring.rotation.x = Math.PI / 2; ring.position.y = -0.007 - i * 0.006; piston.add(ring); }
    const wpin = cyl(0.005, 0.005, 0.05, dark, 12); wpin.rotation.x = Math.PI / 2; wpin.position.y = -PIN; piston.add(wpin);
    const rod = new THREE.Group(); scene.add(rod);
    const rodBar = box(0.012, L, 0.01, Std(0x868e96, { metalness: 0.7, roughness: 0.35 })); rod.add(rodBar);
    const bigEnd = cyl(0.012, 0.012, 0.012, Std(0x868e96, { metalness: 0.7, roughness: 0.35 }), 20); bigEnd.rotation.x = Math.PI / 2; bigEnd.position.y = -L / 2; rod.add(bigEnd);
    const crank = new THREE.Group(); scene.add(crank);
    const shaftM = cyl(0.007, 0.007, 0.13, metal, 16); shaftM.rotation.x = Math.PI / 2; shaftM.position.z = -0.045; crank.add(shaftM);
    [-0.011, 0.011].forEach((z) => {
      const web = box(0.022, CR + 0.03, 0.006, Std(0x5c6670, { metalness: 0.6, roughness: 0.4 })); web.position.set(0, CR / 2 - 0.008, z); crank.add(web);
      const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 24, 1, false, -Math.PI * 0.25, Math.PI * 0.5), Std(0x5c6670, { metalness: 0.6, roughness: 0.4 })); cw.rotation.x = Math.PI / 2; cw.position.z = z; crank.add(cw);
    });
    const cpin = cyl(0.006, 0.006, 0.028, metal, 12); cpin.rotation.x = Math.PI / 2; cpin.position.y = CR; crank.add(cpin);
    const crankPul = cyl(0.008, 0.008, 0.008, Std(0xe9ecef, { metalness: 0.5, roughness: 0.4 }), 20); crankPul.rotation.x = Math.PI / 2; crankPul.position.z = BELT_Z; crank.add(crankPul);
    const flyTex = E.tex(256, 256, (g, w) => {
      g.fillStyle = '#ced4da'; g.fillRect(0, 0, w, w);
      g.strokeStyle = '#868e96'; g.lineWidth = 16; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 + Math.cos(a) * w * 0.4, w / 2 + Math.sin(a) * w * 0.4); g.stroke(); }
      g.lineWidth = 18; g.beginPath(); g.arc(w / 2, w / 2, w * 0.43, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#e03131'; g.beginPath(); g.arc(w / 2, w * 0.1, 12, 0, Math.PI * 2); g.fill();
    });
    const fly = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 48), [Std(0x868e96, { metalness: 0.6, roughness: 0.4 }), Std(0xffffff, { map: flyTex, metalness: 0.3, roughness: 0.5 }), Std(0xffffff, { map: flyTex, metalness: 0.3, roughness: 0.5 })]);
    fly.rotation.x = Math.PI / 2; fly.position.z = -0.1; crank.add(fly);
    // 正时皮带（示意）
    const beltPts = [[0, -0.0095], [-0.0095, 0], [-0.035, CAM_Y], [-0.031, CAM_Y + 0.011], [-0.019, CAM_Y + 0.0165], [0, CAM_Y + 0.012], [0.019, CAM_Y + 0.0165], [0.031, CAM_Y + 0.011], [0.035, CAM_Y], [0.0095, 0]].map(([x, y]) => new THREE.Vector3(x, y, BELT_Z));
    const belt = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(beltPts, true, 'centripetal'), 160, 0.0018, 6, true), Std(0x212529, { roughness: 0.9 })); scene.add(belt);
    // 燃气“分子”
    const N = 150, gG = new THREE.BufferGeometry(), gP = new Float32Array(N * 3);
    gG.setAttribute('position', new THREE.BufferAttribute(gP, 3));
    const gM = new THREE.PointsMaterial({ size: 0.0068, map: dotTex, transparent: true, depthWrite: false, color: 0x63e6be });
    const gas = new THREE.Points(gG, gM); gas.renderOrder = 6; gas.frustumCulled = false; scene.add(gas);
    const MOL = Array.from({ length: N }, () => ({ a: Math.random() * Math.PI * 2, r: Math.sqrt(Math.random()) * 0.9, u: Math.random() * 0.9 + 0.05, va: PS.gauss(), vr: PS.gauss(), vu: PS.gauss() }));
    const fogM = new THREE.MeshBasicMaterial({ color: 0x63e6be, transparent: true, opacity: 0.12, depthWrite: false });
    const fogMesh = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.001, R - 0.001, 1, 32), fogM); fogMesh.renderOrder = 5; scene.add(fogMesh);

    const LB = { iv: E.label('进气门'), ev: E.label('排气门'), plug: E.label('火花塞'), cyl: E.label('汽缸'), pis: E.label('活塞'), rod: E.label('连杆'), cr: E.label('曲轴'), fly: E.label('飞轮'), cam: E.label('凸轮轴') };
    if (view.clientWidth && view.clientWidth < 500) { st.labels = false; lbT.set(false); }

    function setType() { plugA.visible = st.type === 'petrol'; plugB.visible = !plugA.visible; LB.plug.innerHTML = plugA.visible ? '火花塞' : '喷油嘴'; upd(true); }

    const v3 = new THREE.Vector3();
    const lerp3 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    function along(pts, f) { const n = pts.length - 1, x = Math.min(n - 1e-9, Math.max(0, f * n)), i = Math.floor(x); return lerp3(pts[i], pts[i + 1], x - i); }
    let lastK = -1, lastCnt = '';
    function upd(force) {
      const phi = st.phi, k = Math.min(3, Math.floor(phi / 180)), S0 = STK[k];
      if (k !== lastK || force) {
        lastK = k;
        big.innerHTML = '<b style="color:' + S0.c + '">' + S0.n + '</b>';
        tbl.querySelectorAll('tr').forEach((tr) => tr.querySelectorAll('th, td').forEach((c, j) => c.classList.toggle('on', j === k + 1)));
        const d = st.type === 'diesel';
        note.innerHTML = [
          d ? '进气门打开，活塞向下运动，<b>只吸入空气</b>。' : '进气门打开，活塞向下运动，吸入<b>汽油和空气的混合物</b>。',
          '两个气门都关闭，活塞向上运动，压缩气体：<b>机械能转化为内能</b>，气体的温度升高、压强增大。' + (d ? '柴油机的压缩程度更大，压缩冲程末空气的温度超过柴油的燃点。' : ''),
          (d ? '压缩冲程末，<b>喷油嘴</b>喷出雾状柴油，遇到高温空气<b>自动燃烧</b>（压燃式）' : '压缩冲程末，<b>火花塞</b>产生电火花，点燃混合物（点燃式）') + '；高温高压的燃气推动活塞向下运动：<b>内能转化为机械能</b>，这是唯一<b>对外做功</b>的冲程。',
          '排气门打开，活塞向上运动，把<b>废气</b>排出汽缸。',
        ][k] + (k !== 2 ? '<br><span class="muted">这个冲程靠飞轮的<b>惯性</b>完成。</span>' : '');
      }
      const revs = Math.floor(st.total / 360 + 1e-9), w = st.total >= 540 ? Math.floor((st.total - 540) / 720 + 1e-9) + 1 : 0;
      const c = revs + '|' + w;
      if (c !== lastCnt || force) { lastCnt = c; rd.rev.set(revs + ' 周'); rd.rec.set(revs + ' 次'); rd.w.set(w + ' 次'); }
    }
    let lastPhi = 0;
    const loop = PS.loop((dt) => {
      if (st.run) st.total += st.speed * dt;
      else if (st.target != null) { st.total += Math.min(st.target - st.total, 150 * dt); if (st.total >= st.target - 1e-6) { st.total = st.target; st.target = null; } }
      st.phi = ((st.total % 720) + 720) % 720;
      const phi = st.phi, th = phi * D2R, k = Math.min(3, Math.floor(phi / 180)), f = (phi - k * 180) / 180, diesel = st.type === 'diesel';
      if (st.user && lastPhi < 360 && phi >= 360) PS.sound.clack();
      lastPhi = phi;
      // 活塞、连杆、曲轴
      const yW = CR * Math.cos(th) + Math.sqrt(L * L - CR * CR * Math.sin(th) ** 2), pTop = yW + PIN;
      piston.position.y = pTop;
      crank.rotation.z = -th;
      const cx = CR * Math.sin(th), cy = CR * Math.cos(th);
      rod.position.set(cx / 2, (cy + yW) / 2, 0); rod.rotation.z = Math.atan2(cx, yW - cy);
      // 气门与凸轮
      const liftI = phi < 180 ? LIFT * Math.sin(phi * D2R) ** 2 : 0, liftE = phi > 540 ? LIFT * Math.sin((phi - 540) * D2R) ** 2 : 0;
      [[liftI, 90], [liftE, 630]].forEach(([lf, pk], i) => {
        const V = valves[i];
        V.g.position.y = CEIL - lf;
        const top = CAM_Y - CAM_BASE - lf - 0.008, bot = PORT_Y + 0.011;
        V.spring.position.set(i ? EX : IX, bot, 0); V.spring.scale.y = top - bot;
        let d = (phi - pk) / 2; d = ((d % 360) + 540) % 360 - 180;
        V.shaft.rotation.z = -d * D2R;
      });
      // 燃气
      const vol = CEIL - pTop, col = new THREE.Color();
      const fresh = diesel ? 0x74c0fc : 0x63e6be;
      if (k === 0) col.set(fresh);
      else if (k === 1) col.set(fresh).lerp(new THREE.Color(0xff922b), f * (diesel ? 1 : 0.8));
      else if (k === 2) col.set(f < 0.08 ? 0xffe066 : 0xff6b3d).lerp(new THREE.Color(0x868e96), Math.max(0, f - 0.08) * 1.1);
      else col.set(0x868e96);
      gM.color.copy(col); fogM.color.copy(col);
      fogM.opacity = k === 2 && f < 0.25 ? 0.45 * (1 - f / 0.25) + 0.18 : 0.18;
      fogMesh.scale.y = Math.max(0.001, vol); fogMesh.position.y = pTop + vol / 2;
      const Tsp = k === 0 ? 1 : k === 1 ? 1 + f * 1.4 : k === 2 ? 3 - f * 1.6 : 1.4;
      const fireP = !diesel && phi >= 354 && phi <= 376, inj = diesel && phi >= 348 && phi <= 380;
      spark.material.opacity = fireP ? 0.6 + 0.4 * Math.random() : 0;
      flash.intensity = k === 2 && f < 0.15 ? 2.5 * (1 - f / 0.15) : 0;
      spray.material.opacity = inj ? 0.95 : 0;
      if (inj) for (let i = 0; i < NS; i++) { const a = Math.random() * Math.PI * 2, rr = Math.random() * 0.012, d = Math.random() * 0.014; sprayP[i * 3] = Math.cos(a) * rr * d / 0.014; sprayP[i * 3 + 1] = CEIL - 0.004 - d; sprayP[i * 3 + 2] = -0.022 + Math.sin(a) * rr * d / 0.014; }
      if (inj) sprayG.attributes.position.needsUpdate = true;
      const sp = 0.6 * Math.sqrt(Tsp) * Math.min(dt, 0.05);
      const PI_ = [[-0.1, PORT_Y, 0], [IX, PORT_Y, 0], [IX, CEIL - 0.004, 0]], PE = [[EX, CEIL - 0.004, 0], [EX, PORT_Y, 0], [0.1, PORT_Y, 0]];
      for (let i = 0; i < N; i++) {
        const m = MOL[i];
        m.a += m.va * sp * 2; m.r += m.vr * sp * 0.5; m.u += m.vu * sp * 0.6;
        if (m.r > 0.92) { m.r = 0.92; m.vr = -Math.abs(m.vr); } if (m.r < 0) { m.r = -m.r; m.vr = Math.abs(m.vr); }
        if (m.u > 0.96) { m.u = 0.96; m.vu = -Math.abs(m.vu); } if (m.u < 0.04) { m.u = 0.04; m.vu = Math.abs(m.vu); }
        const C = [Math.cos(m.a) * m.r * (R - 0.003), pTop + m.u * vol, Math.sin(m.a) * m.r * (R - 0.003)];
        let p = C, vis = true;
        if (k === 0) { const pg = (phi - (i / N) * 150) / 30; if (pg < 0) vis = false; else if (pg < 1) p = along(PI_.concat([C]), pg); }
        else if (k === 3) { const pg = (phi - 540 - (i / N) * 150) / 30; if (pg >= 1) vis = false; else if (pg > 0) p = along([C].concat(PE), pg); }
        if (!vis) p = [0, -5, 0];
        gP[i * 3] = p[0]; gP[i * 3 + 1] = p[1]; gP[i * 3 + 2] = p[2];
      }
      gG.attributes.position.needsUpdate = true;
      upd();
      E.render(dt);
      // 标签
      const LBs = Object.values(LB);
      LBs.forEach((e) => (e.dataset.hide = st.labels ? '' : '1'));
      E.place(LB.iv, v3.set(IX - 0.06, PORT_Y + 0.02, 0));
      E.place(LB.ev, v3.set(EX + 0.06, PORT_Y + 0.02, 0));
      E.place(LB.plug, v3.set(-0.03, CEIL + 0.07, -0.022));
      E.place(LB.cyl, v3.set(R + 0.035, CYL_B + 0.03, 0.01));
      E.place(LB.pis, v3.set(-R - 0.035, pTop - PH / 2, 0));
      E.place(LB.rod, v3.set(cx / 2 - 0.045, (cy + yW) / 2, 0));
      E.place(LB.cr, v3.set(0.045, -0.035, 0.02));
      E.place(LB.fly, v3.set(0.095, 0.03, -0.1));
      E.place(LB.cam, v3.set(EX + 0.055, CAM_Y + 0.025, -0.03));
    }, view);
    el._st = st;
    setType();
    loop.start();
  });

  if (!document.getElementById('e3-style')) document.head.append(h('style', { id: 'e3-style' }, `
    .e3-big{font-size:1.35rem;font-weight:800;margin-bottom:2px}
    .e3-t{font-size:.76rem;width:100%}
    .e3-t th,.e3-t td{padding:3px 2px;text-align:center;line-height:1.25}
    .e3-t .on{background:#fff4e6;color:#d9480f;font-weight:700}
  `));
})();
