/* 第10章第3节：3D 潜水艇——向水舱充水 / 用压缩空气排水，改变自身重力实现上浮和下潜；海水 / 江水；重力、浮力、深度与浮沉状态。依赖 three.js、OrbitControls、pressure.js、buoyancy.js（.fc-* 样式） */
(function () {
  'use strict';
  const { h } = PS;
  // 按比例缩小的模型：艇体长 0.8、半径 0.06（场景单位），水深 0.9；物理量按真实潜艇换算（排水体积 3000 m³）
  const L = 0.8, R = 0.06, DEPTH = 0.9, VS = 3000, VT = 450, M0 = 1030 * VS - 0.67 * VT * 1030; // 艇体体积 m³、水舱容积 m³、不含水舱中水的质量 kg（在海水中充水 67% 时悬浮）
  const KM = 300 / DEPTH; // 场景单位 → 米（水深 300 m）

  PS.register('submarine-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { f: 0.1, ft: 0.1, sea: true, y: 0, v: 0, cut: true, lastS: '', bub: 0 };
    const view = h('div', { class: 'stage-3d', style: { background: '#0b3d6e' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。模型按比例缩小，力和深度按排水体积 3000 m³ 的潜水艇计算。')), side));

    // ---------- 控件 ----------
    const inB = PS.ui.button('⬇ 向水舱充水', () => { st.ft = Math.min(1, st.ft + 0.1); st.bub = 0; PS.sound.tick(); tell(); }, 'btn btn-sm');
    const outB = PS.ui.button('⬆ 用压缩空气排水', () => { st.ft = Math.max(0, st.ft - 0.1); st.bub = 1.2; PS.sound.tick(); tell(); }, 'btn btn-sm');
    const fineIn = PS.ui.button('+1%', () => { st.ft = Math.min(1, PS.round(st.ft + 0.01, 2)); tell(); }, 'btn btn-sm btn-ghost');
    const fineOut = PS.ui.button('−1%', () => { st.ft = Math.max(0, PS.round(st.ft - 0.01, 2)); st.bub = 0.6; tell(); }, 'btn btn-sm btn-ghost');
    const wSeg = PS.ui.seg([{ value: true, label: '在海里（1.03）' }, { value: false, label: '在江里（1.00）' }], st.sea, (v) => { st.sea = v; tell(); });
    const cutT = PS.ui.toggle('剖开艇身看水舱', st.cut, (v) => { st.cut = v; hullM.opacity = v ? 0.35 : 1; hullM.transparent = v; hullM.needsUpdate = true; });
    const rd = { f: PS.ui.readout('水舱中的水', '—'), G: PS.ui.readout('重力 G', '—'), B: PS.ui.readout('浮力 F浮', '—'), d: PS.ui.readout('艇顶的深度', '—') };
    const msg = h('div', { class: 'fc-msg' });
    const stateBig = h('div', { style: { fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', margin: '4px 0' } });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 水舱'), h('div', { class: 'row' }, inB, outB), h('div', { class: 'row' }, h('span', { class: 'small muted' }, '微调：'), fineIn, fineOut), cutT.el),
      h('div', { class: 'panel' }, h('h4', null, '② 海水还是江水'), wSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 受力与状态'), stateBig, h('div', { class: 'fl-read' }, Object.values(rd).map((r) => r.el)), msg));

    const rho = () => (st.sea ? 1030 : 1000);
    const mass = () => M0 + VT * st.f * rho();
    const subFrac = () => PS.fl.cylFrac(PS.clamp(st.y + R, 0, 2 * R), R); // st.y：艇轴线在水面下的深度（场景单位）
    const hoverF = () => (rho() * VS - M0) / (VT * rho());

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfe8ff);
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.01, 30);
    camera.position.set(0.55, 0.15, 1.65);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.4, 0);
    controls.enableDamping = true; controls.minDistance = 0.4; controls.maxDistance = 4;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x335577, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(1, 3, 2); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    // 水体（剖面：一块透明的“海水”）
    const W = 1.8, Z = 0.5;
    const waterM = Std(0x1c7ed6, { transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
    const water = new THREE.Mesh(new THREE.BoxGeometry(W, DEPTH, Z), waterM); water.position.y = -DEPTH / 2; scene.add(water);
    const surfM = Std(0x74c0fc, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(W, Z, 30, 8), surfM); surf.rotation.x = -Math.PI / 2; scene.add(surf);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(W, 0.05, Z), Std(0xc2a36b)); bed.position.y = -DEPTH - 0.025; scene.add(bed);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, DEPTH, Z)), new THREE.LineBasicMaterial({ color: 0x74c0fc })); edges.position.y = -DEPTH / 2; scene.add(edges);
    // 深度刻度
    const ticks = new THREE.Group();
    for (let d = 0; d <= 300; d += 50) { const y = -d / KM; const t = new THREE.Mesh(new THREE.BoxGeometry(d % 100 ? 0.03 : 0.06, 0.003, 0.003), Std(0x1b2333)); t.position.set(-W / 2 + 0.03, y, Z / 2); ticks.add(t); }
    scene.add(ticks);
    // 潜水艇
    const sub = new THREE.Group();
    const hullM = Std(0x495057, { metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.35, depthWrite: false });
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(R, L - 2 * R, 8, 24) : new THREE.CylinderGeometry(R, R, L, 24), hullM); hull.rotation.z = Math.PI / 2; sub.add(hull);
    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.035), Std(0x343a40)); sail.position.set(0.08, R + 0.03, 0); sub.add(sail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.004, 0.16), Std(0x343a40)); fin.position.set(-L / 2 + 0.04, 0, 0); sub.add(fin);
    const rud = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.004), Std(0x343a40)); rud.position.set(-L / 2 + 0.04, 0, 0); sub.add(rud);
    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.07, 0.016), Std(0xfab005)); prop.position.set(-L / 2 - 0.01, 0, 0); sub.add(prop);
    // 水舱（前后两个），里面的水随充水量变化
    const tankM = Std(0xadb5bd, { transparent: true, opacity: 0.35, depthWrite: false }), tankW = Std(0x4dabf7, { transparent: true, opacity: 0.8 });
    const tanks = [-0.22, 0.22].map((x) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.06), tankM); box.position.set(x, -0.012, 0); sub.add(box);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.155, 1, 0.055), tankW); w.position.set(x, 0, 0); sub.add(w);
      return w;
    });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), Std(0xffd43b, { transparent: true, opacity: 0.6 })); cabin.position.set(0, 0, 0); sub.add(cabin);
    scene.add(sub);
    // 气泡（排水时）
    const bubM = Std(0xffffff, { transparent: true, opacity: 0.7 });
    const bubs = []; for (let i = 0; i < 26; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), bubM); b.visible = false; scene.add(b); bubs.push({ m: b, t: Math.random() }); }
    // 力的箭头
    const arrB = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.2, 0x2f9e44, 0.04, 0.03);
    const arrG = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 0.2, 0x7048e8, 0.04, 0.03);
    scene.add(arrB, arrG);

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const LB = { B: lab('F浮'), G: lab('G'), t: lab('水舱'), d: lab(''), s: lab('海面', 'ref') };
    LB.B.style.color = '#2f9e44'; LB.G.style.color = '#7048e8';
    const v3 = new THREE.Vector3();
    function place(e, p, dx) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(' + (dx || '-50%') + ',-50%)';
    }

    function stateOf() {
      if (st.y >= DEPTH - R - 0.0015 && st.v >= -1e-4) return 'bottom';
      if (st.v < -0.004) return 'up';
      if (st.v > 0.004) return 'down';
      if (st.y < R - 1e-4) return 'float';
      return 'suspend';
    }
    const SN = { float: '漂浮在水面', down: '下潜', up: '上浮', suspend: '悬浮', bottom: '沉到海底' };
    function tell() {
      const G = mass() * 10, Fb = rho() * 10 * VS * subFrac(), Ffull = rho() * 10 * VS;
      rd.f.set(Math.round(st.f * 100) + '%'); rd.G.set(PS.pretty(G, 4) + ' N'); rd.B.set('<span style="color:' + PS.FC.B + '">' + PS.pretty(Fb, 4) + ' N</span>'); rd.d.set(PS.fmt(Math.max(0, st.y - R) * KM, 0) + ' m');
      const s = stateOf();
      stateBig.textContent = SN[s];
      const hf = hoverF();
      let t;
      if (s === 'float') t = '潜水艇漂浮在水面：F浮 = G。向水舱<b>充水</b>，自身重力<b>增大</b>，浸没后 F浮（' + PS.pretty(Ffull, 4) + ' N）小于 G，潜水艇下潜。';
      else if (s === 'down') t = 'G > F浮，潜水艇<b>下潜</b>。浸没以后 V排 不变，浮力<b>不变</b>——潜水艇靠改变<b>自身重力</b>实现上浮和下潜。';
      else if (s === 'up') t = '用压缩空气把水舱里的水排出一部分，自身重力<b>减小</b>，F浮 > G，潜水艇<b>上浮</b>。露出水面后 V排 变小，浮力减小，最后漂浮。';
      else if (s === 'suspend') t = 'F浮 = G，潜水艇<b>悬浮</b>在水中，可以停在任意深度航行。';
      else t = '潜水艇沉到了海底：G > F浮。排出一部分水就能上浮。';
      t += '<br><span class="small muted">在' + (st.sea ? '海水' : '江水') + '中，水舱充水约 ' + PS.fmt(hf * 100, 1) + '% 时悬浮。' + (st.sea ? '从海里驶入江里，液体密度变小，浮力变小，要<b>排出</b>一些水才能保持悬浮。' : '江水密度比海水小，悬浮时水舱中的水比在海里时少。') + '</span>';
      msg.className = 'fc-msg ' + (s === 'suspend' || s === 'float' ? 'ok' : 'info'); msg.innerHTML = t;
      st.lastS = s;
    }

    const loop = PS.loop((dt, T) => {
      // 水舱中的水量慢慢变化
      st.f += PS.clamp(st.ft - st.f, -dt * 0.15, dt * 0.15);
      // 竖直方向的运动（时间放快）：y 向下为正
      const n = 6, h1 = (dt * 1.2) / n;
      for (let i = 0; i < n; i++) {
        const m = mass(), Fb = rho() * 9.8 * VS * subFrac(), G = m * 9.8, mE = m + 0.6 * rho() * VS;
        let a = ((G - Fb) / mE) / KM * 120 - 1.6 * st.v; // 场景单位 / s²（放大了加速度并加了阻尼）
        st.v += a * h1; st.y += st.v * h1;
        if (st.y > DEPTH - R - 0.001) { st.y = DEPTH - R - 0.001; if (st.v > 0) st.v = 0; }
      }
      sub.position.set(0.05, -st.y, 0);
      sub.rotation.z = Math.sin(T * 0.8) * 0.004;
      tanks.forEach((w) => { const hh = Math.max(0.001, 0.075 * st.f); w.scale.y = hh; w.position.y = -0.012 - 0.0375 + hh / 2; });
      prop.rotation.x = T * 10;
      // 水面波动
      const pos = surf.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 8 + T * 2) * 0.004);
      pos.needsUpdate = true;
      // 气泡
      if (st.bub > 0) st.bub -= dt;
      bubs.forEach((b, i) => {
        if (st.bub > 0 || b.m.visible) {
          b.t += dt * 0.8;
          if (b.t > 1) { b.t = 0; b.m.visible = st.bub > 0; }
          const x0 = (i % 2 ? 0.27 : -0.17) + 0.05, y0 = -st.y + 0.03;
          b.m.position.set(x0 + Math.sin(b.t * 9 + i) * 0.01, Math.min(0, y0 + b.t * 0.3), (i % 3 - 1) * 0.02);
        }
      });
      // 力的箭头
      const G = mass() * 10, Fb = rho() * 10 * VS * subFrac(), k = 0.22 / (rho() * 10 * VS);
      const c = new THREE.Vector3(0.05, -st.y, Z / 2 - 0.05);
      arrB.position.copy(c).add(new THREE.Vector3(-0.04, 0, 0)); arrB.setLength(Math.max(0.05, Fb * k), 0.04, 0.03);
      arrG.position.copy(c).add(new THREE.Vector3(0.04, 0, 0)); arrG.setLength(Math.max(0.05, G * k), 0.04, 0.03);
      controls.update();
      renderer.render(scene, camera);
      place(LB.B, new THREE.Vector3(0.01, -st.y + Fb * k + 0.02, Z / 2 - 0.05));
      place(LB.G, new THREE.Vector3(0.09, -st.y - G * k - 0.02, Z / 2 - 0.05));
      place(LB.t, new THREE.Vector3(-0.17, -st.y - R - 0.03, 0.03));
      LB.d.innerHTML = PS.fmt(Math.max(0, st.y - R) * KM, 0) + ' m'; place(LB.d, new THREE.Vector3(-W / 2 + 0.08, -Math.max(0, st.y - R), Z / 2), '0%');
      LB.s.innerHTML = st.sea ? '海面' : '江面'; place(LB.s, new THREE.Vector3(W / 2 - 0.12, 0.03, Z / 2));
      if (stateOf() !== st.lastS || Math.round(T * 4) !== st.tk) { st.tk = Math.round(T * 4); tell(); }
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    // 初始：漂浮在水面
    st.y = PS.fl.floatDepth(mass(), rho() * VS, (d) => PS.fl.cylFrac(d, R), 2 * R) - R;
    tell();
    loop.start();
  });
})();
