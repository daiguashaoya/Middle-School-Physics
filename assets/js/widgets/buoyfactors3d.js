/* 第10章第1节：3D 探究浮力的大小跟哪些因素有关——弹簧测力计下挂圆柱体（铝 / 铁，体积相同），水 / 酒精 / 盐水，浸入深度，记录、F–h 图像与分析论证。依赖 three.js、OrbitControls、pressure.js、dynamics.js、buoyancy.js（.fc-* 样式来自 force.js） */
(function () {
  'use strict';
  const { h } = PS;
  const R = 0.075, BH = 0.22, LH0 = 0.16, CR = 0.01995, CH = 0.08, AB = Math.PI * R * R; // 烧杯半径、高、原来的液体深度；圆柱体半径、高（V = 100 cm³）
  const OBJ = { al: { name: '铝圆柱体', G: 2.7, color: 0xe9ecef }, fe: { name: '铁圆柱体', G: 7.9, color: 0x868e96 } };

  PS.register('buoy-factors-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { obj: 'al', liq: 'water', h: -0.04, hs: -0.04, rows: [] };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '5 / 4' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。h 是圆柱体下表面到液面的距离；两个圆柱体的体积都是 100 cm³，高 8 cm。')), side));

    // ---------- 控件 ----------
    const oSeg = PS.ui.seg(Object.keys(OBJ).map((k) => ({ value: k, label: OBJ[k].name })), st.obj, (v) => { st.obj = v; objMat(); tell(); graph.render(); });
    const lSeg = PS.ui.seg(['water', 'alcohol', 'salt'].map((k) => ({ value: k, label: PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; liqMat(); tell(); graph.render(); });
    const sH = PS.ui.slider({ label: '浸入深度 h', min: -4, max: 14, step: 1, value: st.h * 100, unit: 'cm', onInput: (v) => { st.h = v / 100; tell(); } });
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const rd = { G: PS.ui.readout('物重 G', '—'), F: PS.ui.readout('示数 F示', '—'), B: PS.ui.readout('浮力 F浮', '—'), V: PS.ui.readout('V排', '—') };
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    const gbox = h('div');
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择物体和液体'), oSeg.el, h('div', { style: { height: '6px' } }), lSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 改变浸入深度，读数'), sH.el, h('div', { class: 'fl-read' }, Object.values(rd).map((r) => r.el)), h('div', { class: 'row' }, recB, PS.ui.button('清空记录', () => { st.rows = []; table(); graph.render(); }, 'btn btn-ghost btn-sm')), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '物体'), h('th', null, '液体'), h('th', null, 'h'), h('th', null, 'V排'), h('th', null, 'F示'), h('th', null, 'F浮'))), tbody)), h('div', { class: 'small muted', style: { marginTop: '4px' } }, '单位：h/cm，V排/cm³，F示、F浮/N')),
      h('div', { class: 'panel' }, h('h4', null, '④ F–h 图像'), gbox),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑤ 分析论证' : '⑤ 你发现了什么？'), ana));

    const rho = () => PS.LIQ[st.liq].rho / 1000;
    const frac = (hh) => PS.clamp(hh / CH, 0, 1);
    const Fb = (hh) => rho() * 1.0 * frac(hh);
    const Fs = (hh) => OBJ[st.obj].G - Fb(hh);
    const cm = (x) => PS.round(x * 100, 1);

    // ---------- 图像 ----------
    const graph = PS.stage(gbox, { ratio: '300 / 210', draw: (ctx, w, hh) => {
      const F = PS.virtual(ctx, w, hh, 300, 210);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 210);
      const G = OBJ[st.obj].G, ymax = G > 5 ? 8 : 3;
      const curve = (fn) => { const p = []; for (let x = 0; x <= 14.01; x += 0.5) p.push([x, fn(x / 100)]); return p; };
      const ch = PS.dyn.chart(ctx, { x: 40, y: 22, w: 230, h: 150, xmax: 14, ymax, xstep: 2, ystep: ymax > 5 ? 2 : 1, xlab: 4, xl: 'h/cm', yl: 'F/N', F, bg: false, padL: 30,
        series: [{ pts: curve(Fs), color: '#1c7ed6', width: 2.2 }, { pts: curve(Fb), color: PS.FC.B, width: 2.2 }] });
      st.rows.filter((r) => r.obj === st.obj && r.liq === st.liq && r.h >= 0).forEach((r) => {
        ctx.fillStyle = '#1c7ed6'; ctx.beginPath(); ctx.arc(ch.X(r.h), ch.Y(r.F), 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = PS.FC.B; ctx.beginPath(); ctx.arc(ch.X(r.h), ch.Y(r.B), 4, 0, Math.PI * 2); ctx.fill();
      });
      PS.draw.text(ctx, 'F示', ch.X(13), ch.Y(Fs(0.13)) - 6, { size: F(12), weight: 800, color: '#1c7ed6', align: 'center' });
      PS.draw.text(ctx, 'F浮', ch.X(13), ch.Y(Fb(0.13)) - 6, { size: F(12), weight: 800, color: PS.FC.B, align: 'center' });
    } });

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(42, 5 / 4, 0.01, 20);
    camera.position.set(0.3, 0.5, 0.98);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(-0.03, 0.37, 0);
    controls.enableDamping = true; controls.minDistance = 0.25; controls.maxDistance = 3; controls.maxPolarAngle = Math.PI * 0.55;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.6, 2, 1.5); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.5), Std(0xe9dcc6)); desk.position.set(-0.05, -0.015, 0); scene.add(desk);
    // 铁架台
    const ironM = Std(0x495057, { metalness: 0.4, roughness: 0.5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.12), ironM); base.position.set(-0.2, 0.0075, 0); scene.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 12), ironM); pole.position.set(-0.22, 0.45, 0); scene.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.24, 10), ironM); arm.rotation.z = Math.PI / 2; scene.add(arm);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), ironM); scene.add(clamp);
    // 烧杯与液体
    const glassM = Std(0xbfd9ff, { transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const beaker = new THREE.Mesh(new THREE.CylinderGeometry(R, R, BH, 40, 1, true), glassM); beaker.position.y = BH / 2; scene.add(beaker);
    const bBot = new THREE.Mesh(new THREE.CircleGeometry(R, 40), glassM); bBot.rotation.x = -Math.PI / 2; bBot.position.y = 0.002; scene.add(bBot);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.002, 6, 40), Std(0x9fb7d6)); rim.rotation.x = Math.PI / 2; rim.position.y = BH; scene.add(rim);
    const liqM = Std(0x4dabf7, { transparent: true, opacity: 0.36, depthWrite: false });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.002, R - 0.002, 1, 40), liqM); scene.add(liquid);
    const surfM = Std(0x74c0fc, { transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    const surf = new THREE.Mesh(new THREE.RingGeometry(CR + 0.001, R - 0.002, 40), surfM); surf.rotation.x = -Math.PI / 2; scene.add(surf);
    const surfIn = new THREE.Mesh(new THREE.CircleGeometry(CR + 0.001, 24), surfM); surfIn.rotation.x = -Math.PI / 2; scene.add(surfIn);
    function liqMat() { const L = PS.LIQ[st.liq]; liqM.color.set(L.c2); surfM.color.set(L.c2); }
    // 弹簧测力计、细线、圆柱体
    const sc = PS.fl.scale3d({ max: 10, div: 0.2, L: 0.16 });
    scene.add(sc.group);
    const cylM = Std(0xe9ecef, { metalness: 0.55, roughness: 0.3 });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 32), cylM); scene.add(cyl);
    const loopM = Std(0x868e96, { metalness: 0.6, roughness: 0.35 });
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 8, 16), loopM); scene.add(eye);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 1, 6), Std(0x343a40)); scene.add(thread);
    // V排（浸入部分的高亮）
    const vM = Std(0x2f9e44, { transparent: true, opacity: 0.28, depthWrite: false });
    const vMesh = new THREE.Mesh(new THREE.CylinderGeometry(CR + 0.0025, CR + 0.0025, 1, 32), vM); scene.add(vMesh);
    // 深度虚线
    const dashM = new THREE.LineDashedMaterial({ color: 0x1b2333, dashSize: 0.008, gapSize: 0.006 });
    const dash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), dashM); scene.add(dash);
    function objMat() { cylM.color.set(OBJ[st.obj].color); }

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const L = { sc: lab('弹簧测力计'), F: lab(''), hh: lab(''), obj: lab(''), v: lab('V排', 'still') };
    L.F.style.color = '#1c7ed6'; L.hh.style.color = '#1864ab';
    const v3 = new THREE.Vector3();
    function place(e, p, dx) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(' + (dx || '-50%') + ',-50%)';
    }

    function tell() {
      const hh = st.h, O = OBJ[st.obj], Lq = PS.LIQ[st.liq];
      rd.G.set(PS.fmt(O.G, 1) + ' N'); rd.F.set(PS.fmt(Fs(hh), 1) + ' N'); rd.B.set('<span style="color:' + PS.FC.B + '">' + PS.fmt(Fb(hh), 1) + ' N</span>'); rd.V.set(PS.fmt(100 * frac(hh), 0) + ' cm³');
      let s, c = 'info';
      if (hh <= 0) s = O.name + '还在液面上方，示数等于它的重力 G = ' + PS.fmt(O.G, 1) + ' N。';
      else if (hh < CH) s = '圆柱体有 ' + cm(hh) + ' cm 浸在' + Lq.name + '中，V排 = ' + PS.fmt(100 * frac(hh), 0) + ' cm³。浸入得越多，示数越小，浮力越<b>大</b>。';
      else { s = '圆柱体已经<b>浸没</b>（V排 = 100 cm³）。继续增大深度，示数' + (hh > CH ? '<b>不变</b>，浮力也不变。' : '会变吗？试一试。'); c = 'ok'; }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    function record() {
      const r = { obj: st.obj, liq: st.liq, h: cm(st.h), V: PS.round(100 * frac(st.h), 0), F: PS.round(Fs(st.h), 2), B: PS.round(Fb(st.h), 2) };
      if (st.rows.some((x) => x.obj === r.obj && x.liq === r.liq && x.h === r.h)) { msg.className = 'fc-msg bad'; msg.innerHTML = '这组数据已经记录过了，换一个深度、液体或物体试试。'; PS.sound.bad(); return; }
      st.rows.push(r); if (st.rows.length > 14) st.rows.shift();
      PS.sound.good(); table(); graph.render();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, OBJ[r.obj].name.slice(0, 1)), h('td', null, PS.LIQ[r.liq].name), h('td', null, String(r.h)), h('td', null, String(r.V)), h('td', null, PS.fmt(r.F, 1)), h('td', null, h('b', null, PS.fmt(r.B, 1))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 6, class: 'muted' }, '还没有数据')));
      const Rw = st.rows; let a = false, b = false, c = false, d = false;
      for (const x of Rw) for (const y of Rw) {
        if (x.obj === y.obj && x.liq === y.liq && x.V === 100 && y.V === 100 && x.h < y.h) a = true;
        if (x.obj === y.obj && x.liq === y.liq && x.V > 0 && y.V > x.V) b = true;
        if (x.obj === y.obj && x.V === 100 && y.V === 100 && PS.LIQ[x.liq].rho < PS.LIQ[y.liq].rho) c = true;
        if (x.liq === y.liq && x.V === 100 && y.V === 100 && x.obj !== y.obj) d = true;
      }
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + (ok ? '' : '<span class="muted">（还缺对比数据）</span>') + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">F浮 = G − F示（称重法）；每次只改变一个因素（<b>控制变量法</b>）。</div>';
      s += line(a, '浸没后，深度不同，浮力<b>相同</b>——浮力与浸没的<b>深度无关</b>');
      s += line(b, '同一液体中，浸在液体中的<b>体积越大</b>，浮力越<b>大</b>');
      s += line(c, '浸在液体中的体积相同时，液体的<b>密度越大</b>，浮力越<b>大</b>');
      s += line(d, '体积相同的铝和铁浸没在同种液体中，浮力<b>相同</b>——浮力与物体的<b>密度无关</b>');
      if (a && b && c) s += '<div class="tip tip-good" style="margin:8px 0 0">结论：物体在液体中所受浮力的大小，跟它<b>浸在液体中的体积</b>有关，跟<b>液体的密度</b>有关。浸在液体中的体积越大、液体的密度越大，浮力就越大；跟物体浸没的深度无关。</div>';
      ana.innerHTML = s;
    }

    const loop = PS.loop((dt) => {
      st.hs += (st.h - st.hs) * Math.min(1, dt * 5);
      const hh = st.hs, f = frac(hh);
      const level = LH0 + (0.0001 * f) / AB; // V排 = 100 cm³ × f
      const bot = level - hh, top = bot + CH;
      const F = Fs(hh);
      const hookL = sc.set(F);
      const ringY = top + 0.012 + 0.03 - hookL;
      sc.group.position.set(0, ringY, 0);
      arm.position.set(-0.11, ringY + 0.004, 0); clamp.position.set(-0.22, ringY + 0.004, 0);
      cyl.position.set(0, bot + CH / 2, 0);
      eye.position.set(0, top + 0.006, 0);
      const ty0 = top + 0.012, ty1 = ringY + hookL;
      thread.scale.y = Math.max(0.001, ty1 - ty0); thread.position.set(0, (ty0 + ty1) / 2, 0);
      liquid.scale.y = level; liquid.position.y = level / 2;
      surf.position.y = level + 0.0005; surfIn.position.y = level + 0.0005; surfIn.visible = hh <= 0;
      vMesh.visible = f > 0.01; vMesh.scale.y = Math.max(0.001, f * CH); vMesh.position.y = bot + (f * CH) / 2;
      dash.geometry.setFromPoints([new THREE.Vector3(CR + 0.03, level, 0.01), new THREE.Vector3(CR + 0.03, bot, 0.01)]); dash.computeLineDistances();
      dash.visible = hh > 0.002;
      controls.update();
      renderer.render(scene, camera);
      place(L.sc, new THREE.Vector3(0.06, ringY - 0.05, 0), '0%');
      L.F.innerHTML = 'F示 = ' + PS.fmt(F, 1) + ' N'; place(L.F, new THREE.Vector3(0.04, ringY - 0.06 - (F / 10) * 0.16, 0.01), '0%');
      L.obj.innerHTML = OBJ[st.obj].name; place(L.obj, new THREE.Vector3(-0.03, top + 0.025, 0.02), '-100%');
      if (hh > 0.002) { L.hh.innerHTML = 'h = ' + cm(st.h) + ' cm'; place(L.hh, new THREE.Vector3(CR + 0.035, (level + bot) / 2, 0.01), '0%'); } else L.hh.style.display = 'none';
      if (f > 0.01) place(L.v, new THREE.Vector3(-CR - 0.02, bot + (f * CH) / 2, 0.02), '-100%'); else L.v.style.display = 'none';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    liqMat(); objMat(); tell(); table();
    loop.start();
  });
})();
