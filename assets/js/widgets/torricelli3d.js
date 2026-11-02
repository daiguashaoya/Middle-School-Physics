/* 第9章第3节：3D 托里拆利实验——灌满水银、倒插入槽、放开手指；倾斜、粗细、插入深度、海拔、混入空气、换成水。依赖 three.js、OrbitControls、pressure.js、force.js（.fc-* 样式） */
(function () {
  'use strict';
  const { h } = PS;
  const YS = 0.045, TL = 1.0, RHO = 13.6e3, G = 9.8; // 槽中水银面高度、玻璃管长
  const ALT = { 0: '海平面', 1000: '海拔 1000 m', 3000: '海拔 3000 m', 8849: '珠峰顶' };

  PS.register('torricelli-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { phase: 'empty', f: 0, k: 0, Lc: TL, vL: 0, tilt: 0, thick: false, d: 0.02, alt: 0, air: false, water: false, rows: [] };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面换角度、滚轮缩放可以看清刻度。水银有毒，实验室里由老师演示，这里放心操作。')), side));

    // ---------- 控件 ----------
    const b1 = PS.ui.button('① 灌满水银', () => go('fill'), 'btn btn-primary btn-sm');
    const b2 = PS.ui.button('② 堵住管口，倒插在水银槽中', () => go('invert'), 'btn btn-primary btn-sm');
    const b3 = PS.ui.button('③ 放开手指', () => go('release'), 'btn btn-primary btn-sm');
    const sT = PS.ui.slider({ label: '玻璃管倾斜', min: 0, max: 60, step: 5, value: 0, unit: '°', onInput: (v) => { st.tilt = v; chg(); } });
    const sD = PS.ui.slider({ label: '管口插入深度', min: 1, max: 4, step: 1, value: 2, unit: 'cm', onInput: (v) => { st.d = v / 100; build(); chg(); } });
    const thSeg = PS.ui.seg([{ value: false, label: '细玻璃管' }, { value: true, label: '粗玻璃管' }], st.thick, (v) => { st.thick = v; build(); chg(); });
    const aSeg = PS.ui.seg(Object.keys(ALT).map((k) => ({ value: +k, label: ALT[k] })), st.alt, (v) => { st.alt = v; chg(); });
    aSeg.el.style.flexWrap = 'wrap';
    const airT = PS.ui.toggle('管内混入了少量空气', false, (v) => { st.air = v; chg(); });
    const waterT = PS.ui.toggle('换成水来做（管长仍是 1 m）', false, (v) => { st.water = v; liq(); chg(); });
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    const explore = h('div', { class: 'panel' }, h('h4', null, '② 改变条件'), thSeg.el, sT.el, sD.el, h('div', { class: 'small muted', style: { marginTop: '4px' } }, '实验地点'), aSeg.el, airT.el, waterT.el);
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 做实验'), h('div', { class: 'row' }, b1), h('div', { class: 'row' }, b2), h('div', { class: 'row' }, b3, PS.ui.button('↺ 重做', () => go('empty'), 'btn btn-ghost btn-sm')), msg),
      explore,
      h('div', { class: 'panel' }, h('h4', null, '③ 实验记录'), h('div', { class: 'row' }, PS.ui.button('📝 记录', record, 'btn btn-green btn-sm'), PS.ui.button('清空', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '条件'), h('th', null, '竖直高度 h/mm'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '④ 分析论证' : '④ 你发现了什么？'), ana));

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.01, 20);
    camera.position.set(0.42, 0.6, 1.45);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.47, 0);
    controls.enableDamping = true; controls.minDistance = 0.3; controls.maxDistance = 4; controls.maxPolarAngle = Math.PI * 0.55;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.6, 2, 1.5); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const glassM = Std(0xcfe3ff, { transparent: true, opacity: 0.25, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    const hgM = Std(0xc5ccd3, { metalness: 0.85, roughness: 0.22 });
    const waterM = Std(0x4dabf7, { transparent: true, opacity: 0.6 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.6), Std(0xe9dcc6)); desk.position.set(-0.1, -0.015, 0); scene.add(desk);
    const trough = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.065, 40, 1, true), Std(0x9fb7d6, { transparent: true, opacity: 0.45, side: THREE.DoubleSide })); trough.position.y = 0.0325; scene.add(trough);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.146, 0.14, YS, 40), hgM); pool.position.y = YS / 2; scene.add(pool);
    // 刻度尺（竖直，从槽中水银面量起）
    const ruler = (function () {
      const c = document.createElement('canvas'); c.width = 128; c.height = 2048; const g = c.getContext('2d');
      g.fillStyle = '#fff8e6'; g.fillRect(0, 0, 128, 2048);
      const k = 2048 / 1.0; g.strokeStyle = '#2a2414'; g.fillStyle = '#2a2414'; g.font = 'bold 26px sans-serif';
      for (let mm = 0; mm <= 1000; mm += 5) { const y = 2048 - mm * k / 1000; const big = mm % 50 === 0; g.lineWidth = big ? 3 : 1.3; g.beginPath(); g.moveTo(0, y); g.lineTo(big ? 44 : mm % 10 === 0 ? 28 : 16, y); g.stroke(); if (mm % 100 === 0 && mm) g.fillText(String(mm), 50, y + 9); }
      g.fillStyle = '#e03131'; g.fillRect(0, 2048 - 760 * k / 1000 - 2, 128, 4);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.0), Std(0xffffff, { map: new THREE.CanvasTexture(c) }));
      m.position.set(0.07, YS + 0.5, -0.03); return m;
    })();
    scene.add(ruler);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.06, 0.012), Std(0x6c757d)); stand.position.set(0.105, 0.53, -0.04); scene.add(stand);
    // 玻璃管（组的原点 = 管口进入水银面的位置）
    const tube = new THREE.Group(); scene.add(tube);
    let glass, cap, col;
    function build() {
      [glass, cap, col].forEach((m) => { if (m) { tube.remove(m); m.geometry.dispose(); } });
      const r = st.thick ? 0.011 : 0.006;
      glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r, TL, 24, 1, true), glassM); glass.position.y = -st.d + TL / 2; tube.add(glass);
      cap = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), glassM); cap.position.y = -st.d + TL; tube.add(cap);
      col = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, 1, 18), st.water ? waterM : hgM); tube.add(col);
    }
    function liq() { if (col) col.material = st.water ? waterM : hgM; }
    const finger = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), Std(0xffc078)); scene.add(finger);
    const level = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.0015, 0.0015), Std(0xe03131)); scene.add(level);
    const arrows = [-0.1, 0.1, 0.0].map((x, i) => { const a = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(x, YS + 0.12, i === 2 ? 0.1 : 0), 0.1, 0x1c7ed6, 0.03, 0.018); scene.add(a); return a; });

    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const L = { h: lab(''), vac: lab('真空'), p0: lab('大气压'), trough: lab('水银槽', 'ref') };
    L.h.style.color = '#c92a2a'; L.p0.style.color = '#1c7ed6';
    const v3 = new THREE.Vector3();
    function place(e, p, below) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,' + (below ? '8px' : '-100%') + ')';
    }

    const p0 = () => PR_atm(st.alt);
    function PR_atm(m) { return PS.pr.atm(m); }
    const h0 = () => p0() / ((st.water ? 1000 : RHO) * G); // 不混入空气时液柱的竖直高度
    /** 液柱沿管的长度（从管口量起）；混入空气时按玻意耳定律求平衡 */
    function target() {
      const c = Math.cos((st.tilt * Math.PI) / 180), maxL = TL - 0.002;
      if (!st.air) return Math.min(maxL, st.d + h0() / c);
      let lo = 0, hi = h0();
      for (let i = 0; i < 40; i++) {
        const hv = (lo + hi) / 2, gap = Math.max(1e-4, TL - st.d - hv / c), pa = (p0() * 0.012) / gap;
        if (pa + (st.water ? 1000 : RHO) * G * hv > p0()) hi = hv; else lo = hv;
      }
      return Math.min(maxL, st.d + lo / c);
    }
    const vert = () => (st.Lc - st.d) * Math.cos((st.tilt * Math.PI) / 180);
    function chg() { if (st.phase === 'released') st.told = null; tell(); }
    function go(ph) {
      if (ph === 'empty') { Object.assign(st, { phase: 'empty', f: 0, k: 0, Lc: TL, vL: 0 }); }
      else if (ph === 'fill' && st.phase === 'empty') { st.phase = 'fill'; }
      else if (ph === 'invert' && st.phase === 'filled') { st.phase = 'invert'; st.k = 0; }
      else if (ph === 'release' && st.phase === 'inverted') { st.phase = 'released'; st.Lc = TL - 0.002; st.vL = 0; st.told = null; PS.sound.tick(); }
      else return;
      tell();
    }
    function tell() {
      b1.disabled = st.phase !== 'empty'; b2.disabled = st.phase !== 'filled'; b3.disabled = st.phase !== 'inverted';
      explore.style.opacity = st.phase === 'released' ? '1' : '.45'; explore.style.pointerEvents = st.phase === 'released' ? '' : 'none';
      let s, c = 'info';
      if (st.phase === 'empty') s = '取一根长约 <b>1 m</b>、一端封闭的玻璃管。先在管里灌满水银。';
      else if (st.phase === 'fill') s = '正在灌水银……';
      else if (st.phase === 'filled') s = '管里灌满了水银（不能留有气泡）。用手指堵住管口，把玻璃管倒过来插在水银槽中。';
      else if (st.phase === 'invert') s = '倒插入水银槽中……';
      else if (st.phase === 'released' && st.told == null) s = '管内的水银面下降……';
      else if (st.phase === 'inverted') s = '管口已在槽中水银面以下。放开手指，看管内的水银会不会全部流出来？';
      else {
        const hv = vert(), full = st.Lc >= TL - 0.003;
        if (st.water) { s = '换成水：大气压能支持约 <b>' + PS.fmt(h0(), 1) + ' m</b> 高的水柱，1 m 长的管子被水<b>充满</b>，上方没有真空。所以托里拆利用密度很大的<b>水银</b>做实验。'; c = 'bad'; }
        else if (full) { s = '玻璃管倾斜得太厉害，管顶的竖直高度不到 ' + PS.fmt(h0() * 1000, 0) + ' mm，水银<b>充满了</b>整根管子。'; c = 'bad'; }
        else {
          s = '管内水银面下降到一定高度就不再下降，管内外水银面的<b>竖直高度差</b> h = <b>' + PS.fmt(hv * 1000, 0) + ' mm</b>；管内水银面上方是<b>真空</b>' + (st.air ? '（混入了空气，测得的 h <b>偏小</b>）' : '') + '。<br>大气压 = 这段水银柱产生的压强：p = ρgh = 13.6×10³ kg/m³ × 9.8 N/kg × ' + PS.fmt(hv, 3) + ' m ≈ <b>' + PS.pr.fmtPa(RHO * G * hv) + '</b>。';
          if (st.tilt) s += '<br>玻璃管倾斜后，水银柱变<b>长</b>了，但<b>竖直高度</b>不变。';
          c = st.air ? 'bad' : 'ok';
        }
      }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    function record() {
      if (st.phase !== 'released') { msg.className = 'fc-msg bad'; msg.innerHTML = '先完成①②③，放开手指后再记录。'; PS.sound.bad(); return; }
      if (Math.abs(st.vL) > 0.01 || Math.abs(st.Lc - target()) > 0.002) { msg.className = 'fc-msg bad'; msg.innerHTML = '水银柱还在晃动，等它静止后再读数。'; return; }
      st.rows.push({ tilt: st.tilt, thick: st.thick, d: st.d, alt: st.alt, air: st.air, water: st.water, hv: Math.round(vert() * 1000), full: st.Lc >= TL - 0.003 });
      if (st.rows.length > 10) st.rows.shift();
      PS.sound.good(); table();
    }
    const desc = (r) => [r.water ? '水' : '', r.thick ? '粗管' : '细管', r.tilt ? '倾斜 ' + r.tilt + '°' : '竖直', '插入 ' + Math.round(r.d * 100) + ' cm', ALT[r.alt], r.air ? '有空气' : ''].filter(Boolean).join('，');
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', { class: 'small' }, desc(r)), h('td', null, h('b', null, r.full ? '充满' : String(r.hv))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 2, class: 'muted' }, '还没有数据')));
      const R = st.rows.filter((r) => !r.water && !r.full);
      const only = (a, b, key) => ['tilt', 'thick', 'd', 'alt', 'air'].every((k) => (k === key ? a[k] !== b[k] : a[k] === b[k]));
      const pair = (key) => R.some((a) => R.some((b) => only(a, b, key)));
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + (ok ? '' : '<span class="muted">（还缺对比数据）</span>') + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">每次只改变一个条件，比较水银柱的竖直高度。</div>';
      s += line(pair('tilt'), '玻璃管<b>倾斜</b>：竖直高度不变');
      s += line(pair('thick'), '玻璃管的<b>粗细</b>：竖直高度不变');
      s += line(pair('d'), '管口<b>插入的深度</b>：竖直高度不变');
      s += line(pair('alt'), '<b>海拔越高</b>，大气压越小，竖直高度越小');
      if (pair('air')) s += '<div class="tip tip-warn" style="margin:6px 0 0">管内混入空气，空气对水银柱有向下的压强，测得的高度<b>偏小</b>。</div>';
      if (pair('tilt') && pair('thick') && pair('d')) s += '<div class="tip tip-good" style="margin:8px 0 0">水银柱的竖直高度只随<b>外界大气压</b>的变化而变化，与玻璃管的粗细、是否倾斜、插入水银槽的深度无关。通常把 <b>760 mm</b> 高水银柱产生的压强叫做<b>标准大气压</b>：p₀ = 1.013×10⁵ Pa。</div>';
      ana.innerHTML = s;
    }

    const FILL = new THREE.Vector3(-0.34, TL - 0.02, 0);
    const loop = PS.loop((dt) => {
      // 阶段动画
      if (st.phase === 'fill') { st.f = Math.min(1, st.f + dt * 0.6); if (st.f >= 1) { st.phase = 'filled'; tell(); } }
      if (st.phase === 'invert') { st.k = Math.min(1, st.k + dt * 0.45); if (st.k >= 1) { st.phase = 'inverted'; tell(); } }
      if (st.phase === 'released') {
        const tg = target(), wn = 9;
        st.vL += (-wn * wn * (st.Lc - tg) - 2 * 0.35 * wn * st.vL) * dt; st.Lc += st.vL * dt;
        if (st.Lc > TL - 0.002) { st.Lc = TL - 0.002; st.vL = Math.min(0, st.vL); }
        // 液柱静止后（或静止的位置变了）再更新说明文字
        const key = Math.abs(st.vL) < 0.004 && Math.abs(st.Lc - tg) < 0.001 ? Math.round(vert() * 1000) + (st.water ? 'w' : '') : null;
        if (key != null && key !== st.told) { st.told = key; tell(); }
      }
      // 玻璃管的位置与方向
      const tilt = (st.tilt * Math.PI) / 180;
      if (st.phase === 'empty' || st.phase === 'fill' || st.phase === 'filled') { tube.position.copy(FILL); tube.position.y = TL - st.d; tube.rotation.set(0, 0, Math.PI); }
      else if (st.phase === 'invert') {
        const k = st.k, e = k * k * (3 - 2 * k);
        tube.position.set(PS.lerp(FILL.x, 0, e), PS.lerp(TL - st.d, YS, e) + Math.sin(e * Math.PI) * 0.25, 0);
        tube.rotation.set(0, 0, PS.lerp(Math.PI, 0, e));
      } else { tube.position.set(0, YS, 0); tube.rotation.set(0, 0, -tilt); }
      // 管内液柱：灌水银时从封闭端（本地上端）往下长；倒插后从管口往上
      let a, b;
      if (st.phase === 'empty' || st.phase === 'fill') { b = TL - st.d; a = b - st.f * TL; }
      else if (st.phase === 'filled' || st.phase === 'invert' || st.phase === 'inverted') { a = -st.d; b = TL - st.d - 0.002; }
      else { a = -st.d; b = st.Lc - st.d; }
      col.visible = b - a > 0.002; col.scale.y = Math.max(0.001, b - a); col.position.y = (a + b) / 2;
      // 手指堵住管口
      finger.visible = st.phase === 'filled' || st.phase === 'invert' || st.phase === 'inverted';
      if (finger.visible) { v3.set(0, -st.d - 0.012, 0); tube.localToWorld(finger.position.copy(v3)); }
      const done = st.phase === 'released';
      const topY = YS + vert();
      level.visible = done && !st.water && st.Lc < TL - 0.003;
      level.position.set(0.02, topY, -0.01);
      arrows.forEach((ar) => (ar.visible = done || st.phase === 'inverted'));
      controls.update();
      renderer.render(scene, camera);
      if (done && !st.water && st.Lc < TL - 0.003) {
        L.h.innerHTML = 'h = ' + PS.fmt(vert() * 1000, 0) + ' mm'; place(L.h, new THREE.Vector3(0.12, topY, 0));
        const tp = new THREE.Vector3(0, TL - st.d - 0.03, 0); tube.localToWorld(tp); L.vac.innerHTML = st.air ? '少量空气' : '真空'; place(L.vac, tp);
      } else { L.h.style.display = 'none'; L.vac.style.display = 'none'; }
      if (done || st.phase === 'inverted') place(L.p0, new THREE.Vector3(-0.1, YS + 0.13, 0)); else L.p0.style.display = 'none';
      place(L.trough, new THREE.Vector3(-0.12, 0.0, 0.14), true);
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    build(); tell(); table();
    loop.start();
  });
})();
