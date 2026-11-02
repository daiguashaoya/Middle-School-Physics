/* 第9章第2节：3D 研究液体内部的压强——U 形管压强计、探头深度与方向、换液体、调平与检查气密性、记录与分析。依赖 three.js、OrbitControls、pressure.js、force.js（.fc-* 样式） */
(function () {
  'use strict';
  const { h } = PS;
  const R = 0.09, LH = 0.2, UX = 0.32, GAP = 0.06, UB = 0.06, UT = 0.36, Y0 = 0.21; // 烧杯半径、液面高；U 形管位置、底、顶、平衡液面
  const DIRS = { down: { name: '朝下', v: [0, -1, 0] }, up: { name: '朝上', v: [0, 1, 0] }, left: { name: '朝左', v: [-1, 0, 0] }, right: { name: '朝右', v: [1, 0, 0] }, front: { name: '朝前', v: [0, 0, 1] } };

  PS.register('manometer-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { liq: 'water', dep: 0.06, dir: 'down', uneven: true, leak: false, press: 0, dh: 0.025, rows: [], fixing: 0 };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察；U 形管里是染成红色的水。')), side));

    // ---------- 控件 ----------
    const lSeg = PS.ui.seg(['water', 'salt', 'alcohol'].map((k) => ({ value: k, label: PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; liqMat(); tell(); });
    const sD = PS.ui.slider({ label: '探头深度 h', min: 0, max: 15, step: 1, value: st.dep * 100, unit: 'cm', onInput: (v) => { st.dep = v / 100; tell(); } });
    const dSeg = PS.ui.seg(Object.keys(DIRS).map((k) => ({ value: k, label: DIRS[k].name })), st.dir, (v) => { st.dir = v; tell(); });
    dSeg.el.style.flexWrap = 'wrap';
    const fixB = PS.ui.button('拔下胶管，重新安装', () => { st.uneven = false; st.fixing = 1; PS.sound.tick(); tell(); }, 'btn btn-sm');
    const pressB = PS.ui.button('👆 用手指按压橡皮膜', () => { st.press = 1.6; PS.sound.tick(); tell(); }, 'btn btn-sm');
    const leakT = PS.ui.toggle('胶管漏气（故障）', st.leak, (v) => { st.leak = v; tell(); });
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 实验前的检查'), h('div', { class: 'row' }, fixB, pressB), leakT.el),
      h('div', { class: 'panel' }, h('h4', null, '② 液体与探头'), lSeg.el, sD.el, h('div', { class: 'small muted', style: { marginTop: '4px' } }, '橡皮膜的朝向'), dSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数'), h('div', { class: 'row' }, recB, PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')), msg),
      h('div', { class: 'panel' }, h('h4', null, '④ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '液体'), h('th', null, 'h/cm'), h('th', null, '朝向'), h('th', null, 'Δh/cm'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑤ 分析论证' : '⑤ 你发现了什么？'), ana));

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.01, 20);
    camera.position.set(0.1, 0.36, 0.78);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0.15, 0.17, 0);
    controls.enableDamping = true; controls.minDistance = 0.25; controls.maxDistance = 3; controls.maxPolarAngle = Math.PI * 0.55;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.55); dl.position.set(0.5, 2, 1.5); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const glassM = Std(0xbfd9ff, { transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.5), Std(0xe9dcc6)); desk.position.set(0.15, -0.015, 0); scene.add(desk);
    // 烧杯与液体
    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.25, 40, 1, true), glassM); beaker.position.y = 0.125; scene.add(beaker);
    const bBot = new THREE.Mesh(new THREE.CircleGeometry(R, 40), glassM); bBot.rotation.x = -Math.PI / 2; bBot.position.y = 0.002; scene.add(bBot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.002, 6, 40), Std(0x9fb7d6)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.25; scene.add(rim);
    const liqM = Std(0x4dabf7, { transparent: true, opacity: 0.38, depthWrite: false });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.002, R - 0.002, LH, 40), liqM); liquid.position.y = LH / 2; scene.add(liquid);
    const surfM = Std(0x74c0fc, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const surf = new THREE.Mesh(new THREE.CircleGeometry(R - 0.002, 40), surfM); surf.rotation.x = -Math.PI / 2; surf.position.y = LH; scene.add(surf);
    function liqMat() { const L = PS.LIQ[st.liq]; liqM.color.set(L.c2); surfM.color.set(L.c2); }

    // U 形管压强计（支架、刻度板、两根玻璃管、红色液体）
    const board = (function () {
      const c = document.createElement('canvas'); c.width = 256; c.height = 640; const g = c.getContext('2d');
      g.fillStyle = '#fff8e6'; g.fillRect(0, 0, 256, 640);
      g.fillStyle = '#8a6d3b'; g.strokeStyle = '#8a6d3b'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
      const pxPerM = 640 / (UT - UB + 0.04), y0 = (UT + 0.02 - Y0) * pxPerM;
      for (let i = -14; i <= 14; i++) { const y = y0 - i * 0.01 * pxPerM; const big = i % 5 === 0; g.lineWidth = big ? 3 : 1.5; g.beginPath(); g.moveTo(128 - (big ? 26 : 14), y); g.lineTo(128 + (big ? 26 : 14), y); g.stroke(); if (big && i) g.fillText(String(Math.abs(i)), 128, y - 8); }
      g.fillText('cm', 128, 26);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.14, UT - UB + 0.04), Std(0xffffff, { map: new THREE.CanvasTexture(c) }));
      m.position.set(UX + GAP / 2, (UT + UB) / 2, -0.012); return m;
    })();
    scene.add(board);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.08), Std(0x6c757d)); stand.position.set(UX + GAP / 2, 0.01, -0.01); scene.add(stand);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.012, UB + 0.02, 0.012), Std(0x6c757d)); post.position.set(UX + GAP / 2, (UB + 0.02) / 2, -0.02); scene.add(post);
    const TR = 0.0065;
    [UX, UX + GAP].forEach((x) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(TR, TR, UT - UB, 16, 1, true), glassM); t.position.set(x, (UT + UB) / 2, 0); scene.add(t); });
    const bend = new THREE.Mesh(new THREE.TorusGeometry(GAP / 2, TR, 10, 24, Math.PI), glassM); bend.rotation.z = Math.PI; bend.position.set(UX + GAP / 2, UB, 0); scene.add(bend);
    const redM = Std(0xe03131, { roughness: 0.4 });
    const colL = new THREE.Mesh(new THREE.CylinderGeometry(TR - 0.0015, TR - 0.0015, 1, 14), redM), colR = colL.clone();
    scene.add(colL, colR);
    const bendR = new THREE.Mesh(new THREE.TorusGeometry(GAP / 2, TR - 0.0015, 10, 24, Math.PI), redM); bendR.rotation.z = Math.PI; bendR.position.copy(bend.position); scene.add(bendR);

    // 探头：金属盒 + 橡皮膜；硬管 + 胶管
    const probe = new THREE.Group();
    const box = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 28), Std(0xadb5bd, { metalness: 0.6, roughness: 0.35 })); probe.add(box);
    const memG = new THREE.SphereGeometry(0.019, 28, 8, 0, Math.PI * 2, 0, Math.PI / 2); memG.scale(1, 0.12, 1);
    const mem = new THREE.Mesh(memG, Std(0xfa5252, { roughness: 0.7 })); mem.position.y = 0.006; probe.add(mem); // 橡皮膜在盒子的 +y 一侧
    scene.add(probe);
    const rodM = Std(0xced4da, { transparent: true, opacity: 0.6 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 10), rodM); scene.add(rod);
    let hose = null;
    const hoseM = Std(0xd9480f, { roughness: 0.8 });
    let hoseKey = '';
    function buildHose(top) {
      const key = top.y.toFixed(3);
      if (key === hoseKey) return; hoseKey = key;
      if (hose) { scene.remove(hose); hose.geometry.dispose(); }
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(UX, UT, 0), new THREE.Vector3(UX, UT + 0.06, 0), new THREE.Vector3(UX - 0.12, Math.max(UT + 0.08, top.y + 0.05), 0.02), new THREE.Vector3(top.x, top.y + 0.04, 0), new THREE.Vector3(top.x, top.y, 0)]);
      hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0055, 8, false), hoseM); scene.add(hose);
    }
    // 深度虚线
    const dashM = new THREE.LineDashedMaterial({ color: 0x1b2333, dashSize: 0.008, gapSize: 0.006 });
    const dash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), dashM); scene.add(dash);
    // 手指
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.008, 0.05, 4, 8) : new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10), Std(0xffc078)); scene.add(finger);

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const L = { u: lab('U 形管'), probe: lab('探头（橡皮膜）', 'ref'), dh: lab(''), h: lab(''), hose: lab('胶管') };
    L.dh.style.color = '#c92a2a'; L.h.style.color = '#1864ab';
    const v3 = new THREE.Vector3();
    function place(e, p, below) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,' + (below ? '8px' : '-100%') + ')';
    }

    const target = () => {
      const p = PS.LIQ[st.liq].rho / 1000 * st.dep; // U 形管中水柱的高度差（m）
      const pr = st.press > 0 ? 0.035 * Math.sin(Math.min(1, (1.6 - st.press) / 0.4) * Math.PI / 2) : 0;
      return st.leak ? (st.uneven ? 0.025 : 0) : p + pr + (st.uneven ? 0.025 : 0);
    };
    const rd = (x) => PS.round(x * 100, 1);
    function tell() {
      const L0 = PS.LIQ[st.liq];
      let s, c = 'info';
      if (st.press > 0) { s = st.leak ? '按压橡皮膜，U 形管两边液面<b>几乎不变</b>——装置<b>漏气</b>，要检查胶管的连接处。' : '按压橡皮膜，U 形管两边液面出现明显的高度差，松手后恢复——装置<b>不漏气</b>（气密性良好）。'; c = st.leak ? 'bad' : 'ok'; }
      else if (st.uneven) { s = '实验前发现 U 形管两边的液面<b>不相平</b>。应该怎样调节？（提示：不能往管里加水或倒水）'; c = 'bad'; }
      else if (st.leak) { s = '探头放进液体里，U 形管两边液面却几乎没有高度差——胶管<b>漏气</b>了。'; c = 'bad'; }
      else s = '探头在' + L0.name + '中 <b>' + rd(st.dep) + ' cm</b> 深处，橡皮膜' + DIRS[st.dir].name + '：U 形管两边液面的高度差 Δh = <b>' + rd(target()) + ' cm</b>。高度差越大，探头处的压强越大（<b>转换法</b>）。';
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
      fixB.disabled = !st.uneven;
    }
    function record() {
      if (st.uneven) { msg.className = 'fc-msg bad'; msg.innerHTML = 'U 形管两边液面不相平，先<b>拔下胶管重新安装</b>，使两边液面相平再做实验。'; PS.sound.bad(); return; }
      if (st.leak) { msg.className = 'fc-msg bad'; msg.innerHTML = '装置漏气，测得的数据不可靠。先排除故障（关掉“胶管漏气”）。'; PS.sound.bad(); return; }
      if (st.dep <= 0) { msg.className = 'fc-msg bad'; msg.innerHTML = '探头还在液面上，把它放进液体里。'; PS.sound.bad(); return; }
      st.rows.push({ liq: st.liq, dep: st.dep, dir: st.dir, dh: rd(PS.LIQ[st.liq].rho / 1000 * st.dep) });
      if (st.rows.length > 12) st.rows.shift();
      PS.sound.good(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, PS.LIQ[r.liq].name), h('td', null, String(rd(r.dep))), h('td', null, DIRS[r.dir].name), h('td', null, h('b', null, PS.fmt(r.dh, 1))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      const Rw = st.rows; let a = false, b = false, c = false;
      for (const x of Rw) for (const y of Rw) {
        if (x.liq === y.liq && x.dep === y.dep && x.dir !== y.dir) a = true;
        if (x.liq === y.liq && x.dep < y.dep) b = true;
        if (x.dep === y.dep && x.liq !== y.liq) c = true;
      }
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + (ok ? '' : '<span class="muted">（还缺对比数据）</span>') + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">每次只改变一个因素（<b>控制变量法</b>）；用 U 形管两边液面的高度差表示压强的大小（<b>转换法</b>）。</div>';
      s += line(a, '同种液体、同一深度，橡皮膜朝<b>各个方向</b>，高度差<b>相等</b>');
      s += line(b, '同种液体，深度<b>越深</b>，高度差<b>越大</b>');
      s += line(c, '深度相同时，液体的<b>密度越大</b>，高度差<b>越大</b>');
      if (a && b && c) s += '<div class="tip tip-good" style="margin:8px 0 0">结论：液体内部向<b>各个方向</b>都有压强；在同一深度，各个方向的压强<b>相等</b>；深度越深，压强越<b>大</b>；液体内部的压强还与液体的<b>密度</b>有关，深度相同时，密度越大，压强越大。</div>';
      ana.innerHTML = s;
    }

    const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), dv = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      if (st.press > 0) { const was = st.press; st.press = Math.max(0, st.press - dt); if (was > 0 && st.press === 0) tell(); }
      const tg = target();
      st.dh += (tg - st.dh) * Math.min(1, dt * (st.fixing ? 2.5 : 4));
      if (st.fixing && Math.abs(tg - st.dh) < 1e-4) st.fixing = 0;
      // U 形管液柱
      const yL = Y0 - st.dh / 2, yR = Y0 + st.dh / 2;
      colL.scale.y = yL - UB; colL.position.set(UX, (yL + UB) / 2, 0);
      colR.scale.y = yR - UB; colR.position.set(UX + GAP, (yR + UB) / 2, 0);
      // 探头：中心在液面下 dep 处；膜朝 dir
      const P = new THREE.Vector3(-0.01, LH - Math.max(st.dep, -0.03), 0);
      if (st.dep <= 0) P.y = LH + 0.03;
      probe.position.copy(P);
      dv.set(...DIRS[st.dir].v); q.setFromUnitVectors(up, dv); probe.quaternion.copy(q);
      mem.scale.y = 1 - Math.min(0.9, st.dh * 12); // 受压内凹（示意）
      const top = new THREE.Vector3(P.x, P.y + 0.15, 0);
      rod.scale.y = 0.15 - 0.012; rod.position.set(P.x, P.y + 0.075 + 0.006, 0);
      buildHose(top);
      dash.geometry.setFromPoints([new THREE.Vector3(P.x + 0.04, LH, 0.02), new THREE.Vector3(P.x + 0.04, P.y, 0.02)]); dash.computeLineDistances();
      dash.visible = st.dep > 0;
      finger.visible = st.press > 0;
      if (st.press > 0) { const fo = dv.clone().multiplyScalar(0.04); finger.position.copy(P).add(fo); finger.quaternion.copy(q); }
      controls.update();
      renderer.render(scene, camera);
      place(L.u, new THREE.Vector3(UX + GAP + 0.03, UT + 0.01, 0));
      place(L.probe, new THREE.Vector3(P.x - 0.03, P.y - 0.02, 0.03), true);
      place(L.hose, new THREE.Vector3(UX - 0.12, Math.max(UT + 0.09, top.y + 0.06), 0.02));
      L.dh.innerHTML = 'Δh = ' + PS.fmt(st.dh * 100, 1) + ' cm'; place(L.dh, new THREE.Vector3(UX + GAP + 0.06, Y0, 0));
      if (st.dep > 0) { L.h.innerHTML = 'h = ' + rd(st.dep) + ' cm'; place(L.h, new THREE.Vector3(P.x + 0.04, LH - st.dep / 2, 0.02)); L.h.style.transform += ' translate(60%,50%)'; } else L.h.style.display = 'none';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    liqMat(); tell(); table();
    loop.start();
  });
})();
