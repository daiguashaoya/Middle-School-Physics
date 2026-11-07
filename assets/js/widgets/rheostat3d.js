/* 第16章第4节：3D 滑动变阻器 rheostat-3d——瓷筒上绕着电阻丝、金属杆、滑片、A B C D 四个接线柱；选两个接线柱接入电路（与灯泡、电流表串联），
 * 拖动滑片（或用滑块）改变接入电路的电阻丝的长度，橙色表示有电流通过的部分；“看结构”显示各部件名称。
 * 依赖 three.js、OrbitControls、circuit.js、circuit3d.js（PS.el.kit3d） */
(function () {
  'use strict';
  const { h } = PS;
  const EL = PS.el;
  const COLS = [0xe03131, 0xf59f00, 0x1c7ed6, 0x2b8a3e, 0xae3ec9, 0x0c8599, 0x212529];
  const RMAX = 20, XL = -0.14, XR = 0.14;
  const PAIRS = ['AC', 'AD', 'BC', 'BD', 'AB', 'CD'];
  PS.register('rheostat-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    if (!EL.kit3d) { el.append(h('div', { class: 'tip tip-warn' }, '需要先加载 circuit3d.js。')); return; }
    const st = { pair: 'AD', p: 1, on: false, sol: null, parts: false, warn: '' };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' }, html: '拖动画面可以换角度观察；直接拖动红色的<b>滑片</b>，或者用右边的滑块。橙色是有电流通过的电阻丝和金属杆。' })), side));
    const pSeg = PS.ui.seg(PAIRS.map((k) => ({ value: k, label: k[0] + '、' + k[1] })), 'AD', (v) => { st.pair = v; st.on = false; build(); });
    const sl = PS.ui.slider({ label: '滑片 P（0 在 A 端）', min: 0, max: 100, step: 1, value: 100, unit: '%', onInput: (v) => { st.p = v / 100; solve(); } });
    const swBtn = PS.ui.button('闭合开关', toggle, 'btn btn-primary btn-sm');
    const partT = PS.ui.toggle('看结构（显示各部件的名称）', false, (v) => { st.parts = v; Object.values(PL).forEach((l) => { l.dataset.hide = v ? '' : '1'; }); });
    const msg = h('div', { class: 'el-msg info' });
    const read = h('div', { class: 'el-read' });
    const rR = PS.ui.readout('接入的电阻', '—'), rI = PS.ui.readout('电流表示数', '—');
    read.append(rR.el, rI.el);
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选两个接线柱接入电路'), pSeg.el, h('p', { class: 'small muted', style: { margin: '6px 0 0' } }, '铭牌“20 Ω 2 A”：最大电阻 20 Ω，允许通过的最大电流 2 A。')),
      h('div', { class: 'panel' }, h('h4', null, '② 闭合开关，移动滑片'), h('div', { class: 'controls' }, swBtn), sl.el, read, msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 认识构造'), partT.el, h('p', { class: 'small', style: { margin: '6px 0 0' } }, '电阻丝外面涂有绝缘漆，相邻的线圈之间是绝缘的；只有滑片接触的地方，绝缘漆被刮去了，滑片才能与电阻丝接通。')));
    const E = EL.three(view, { cam: [0.02, 0.56, 0.6], target: [0, 0.02, -0.03], min: 0.18, max: 1.6 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.8), E.Std(0xe9dcc6, { roughness: 0.9 })); desk.position.y = -0.01; E.scene.add(desk);
    const K = EL.kit3d(E);
    // ---------- 滑动变阻器 ----------
    const rh = new THREE.Group(); rh.position.set(0, 0, -0.14); E.scene.add(rh);
    const Std = E.Std;
    const YT = 0.04, YR = 0.098, RT = 0.024;
    [-1, 1].forEach((s) => {
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.115, 0.06), Std(0x3b5bdb, { roughness: 0.5, metalness: 0.2 })); br.position.set(s * 0.158, 0.0575, 0); rh.add(br);
      const ft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.07), Std(0x3b5bdb, { roughness: 0.5 })); ft.position.set(s * 0.158, 0.003, 0); rh.add(ft);
    });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(RT - 0.002, RT - 0.002, XR - XL + 0.02, 28), Std(0xf8f0e3, { roughness: 0.9 })); tube.rotation.z = Math.PI / 2; tube.position.y = YT; rh.add(tube);
    const coilTex = E.tex(512, 32, (g) => { g.fillStyle = '#8a7a64'; g.fillRect(0, 0, 512, 32); g.strokeStyle = '#d9cdb8'; g.lineWidth = 2; for (let x = 0; x < 512; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 1.5, 32); g.stroke(); } });
    coilTex.wrapS = THREE.RepeatWrapping; coilTex.repeat.set(1, 3);
    const coilM = new THREE.Mesh(new THREE.CylinderGeometry(RT, RT, XR - XL, 28, 1, true), new THREE.MeshStandardMaterial({ map: coilTex, roughness: 0.5, metalness: 0.4 }));
    coilM.rotation.z = Math.PI / 2; coilM.position.y = YT; rh.add(coilM);
    const hlCoil = new THREE.Mesh(new THREE.CylinderGeometry(RT + 0.0012, RT + 0.0012, 1, 28, 1, true), new THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.55, depthWrite: false }));
    hlCoil.rotation.z = Math.PI / 2; hlCoil.position.y = YT; rh.add(hlCoil);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.33, 14), Std(0xced4da, { metalness: 0.85, roughness: 0.25 })); rod.rotation.z = Math.PI / 2; rod.position.y = YR; rh.add(rod);
    const hlRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0058, 0.0058, 1, 14), new THREE.MeshBasicMaterial({ color: 0xff922b, transparent: true, opacity: 0.6, depthWrite: false }));
    hlRod.rotation.z = Math.PI / 2; hlRod.position.y = YR; rh.add(hlRod);
    // 滑片
    const sld = new THREE.Group(); rh.add(sld);
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.03), Std(0x495057, { roughness: 0.5 })); blk.position.y = YR; sld.add(blk);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 16, 12), Std(0xe03131)); knob.position.y = YR + 0.02; sld.add(knob);
    const spring = new THREE.Mesh(new THREE.BoxGeometry(0.008, YR - YT - RT, 0.004), Std(0xe9ecef, { metalness: 0.8, roughness: 0.2 })); spring.position.set(0, (YR + YT + RT) / 2 - 0.006, 0.006); sld.add(spring);
    const scrape = new THREE.Mesh(new THREE.CylinderGeometry(RT + 0.0006, RT + 0.0006, 0.012, 28, 1, true, -0.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xffd8a8 })); scrape.rotation.z = Math.PI / 2; scrape.position.y = YT; sld.add(scrape);
    const grab = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), new THREE.MeshBasicMaterial({ visible: false })); grab.position.y = YR + 0.005; sld.add(grab);
    // 接线柱
    const postGeo = new THREE.CylinderGeometry(0.0055, 0.007, 0.022, 12);
    const RT_T = { A: new THREE.Vector3(-0.172, 0.02, 0.022), B: new THREE.Vector3(0.172, 0.02, 0.022), C: new THREE.Vector3(-0.172, YR + 0.012, 0.0), D: new THREE.Vector3(0.172, YR + 0.012, 0.0) };
    const postT = {};
    Object.keys(RT_T).forEach((k) => {
      const p = new THREE.Mesh(postGeo, Std(0x212529, { metalness: 0.4 })); p.position.copy(RT_T[k]); p.position.y -= 0.011; rh.add(p); postT[k] = p;
      if (k === 'C' || k === 'D') { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.006, 0.01), Std(0xadb5bd, { metalness: 0.7 })); arm.position.set(RT_T[k].x * 0.95, YR, 0); rh.add(arm); }
      else { const lead = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, 0.006), Std(0xadb5bd, { metalness: 0.7 })); lead.position.set(RT_T[k].x * 0.94, 0.012, 0.018); rh.add(lead); }
    });
    const T3 = {}; Object.keys(RT_T).forEach((k) => { T3[k] = RT_T[k].clone(); T3[k].y += 0.012; });
    K.comps.rh = { id: 'rh', kind: 'rheo', g: rh, T: T3 };
    // 标签：接线柱字母（一直显示）与部件名称（看结构时显示）
    const TL = {};
    Object.keys(RT_T).forEach((k) => { TL[k] = E.label(k, 'tl-lab'); });
    const PL = {};
    const PARTS = [['瓷筒', new THREE.Vector3(-0.06, YT - 0.03, 0.03)], ['电阻丝（线圈）', new THREE.Vector3(0.06, YT + 0.005, RT + 0.01)], ['金属杆', new THREE.Vector3(-0.09, YR + 0.018, 0)], ['滑片 P', null], ['支架', new THREE.Vector3(0.158, 0.13, 0)]];
    PARTS.forEach(([t]) => { PL[t] = E.label(t, 'pl-lab'); PL[t].dataset.hide = '1'; });
    const LB = {};
    function label(id, t) { if (!LB[id]) LB[id] = E.label(t); LB[id].innerHTML = t; LB[id].dataset.hide = ''; }
    function build() {
      ['E', 'S', 'A', 'L'].forEach((id) => K.remove(id)); K.clearWires();
      K.battery('E', -0.1, 0.22); K.sw('S', 0.17, 0.22); K.bulb('L', -0.3, 0.06, Math.PI / 2); K.ammeter('A', 0.31, 0.07, -Math.PI / 2);
      const [k1, k2] = st.pair.split('');
      const end = K.chain('E.+', ['S', 'A'], null, COLS);
      K.wire(end, 'rh.' + k2, COLS[2]);
      K.chain('rh.' + k1, ['L'], 'E.-', [COLS[3], COLS[6]]);
      Object.keys(postT).forEach((k) => { postT[k].material.color.setHex(st.pair.indexOf(k) >= 0 ? 0xf08c00 : 0x212529); });
      label('E', '电源'); label('S', '开关'); label('L', '小灯泡'); label('A', '电流表');
      solve();
    }
    function toggle() {
      st.on = !st.on; PS.sound.clack();
      const lo = st.pair.replace(/[CD]/g, '');
      st.warn = st.on && lo.length === 1 && Rnow() < RMAX * 0.5 ? '⚠️ 闭合开关前，应把滑片移到<b>阻值最大</b>的位置（远离 ' + lo + ' 的一端），以保护电路。' : '';
      solve();
    }
    function Rnow() {
      const lo = st.pair.replace(/[CD]/g, '');
      return lo.length === 2 ? RMAX : lo.length === 0 ? 0 : lo === 'A' ? st.p * RMAX : (1 - st.p) * RMAX;
    }
    function solve() {
      K.comps.S.setOn(st.on);
      const extra = [{ id: 'Ra', t: 'res', a: 'rh.A', b: 'rh.P', R: Math.max(0.01, st.p * RMAX) }, { id: 'Rb', t: 'res', a: 'rh.P', b: 'rh.B', R: Math.max(0.01, (1 - st.p) * RMAX) }, { id: 'Rc', t: 'wire', a: 'rh.C', b: 'rh.P' }, { id: 'Rd', t: 'wire', a: 'rh.P', b: 'rh.D' }];
      st.sol = EL.solve(K.net({ E: 3, r: 0.5, on: { S: st.on }, R: { L: 8.3 }, Pn: { L: 0.75 }, extra }));
      const I = Math.max(0, st.sol.I.A || 0), lit = Math.max(0, (st.sol.P.L || 0) / 0.75);
      K.comps.L.setLit(lit); K.comps.A.setValue(st.on ? I : 0, 0.6);
      swBtn.innerHTML = st.on ? '断开开关' : '闭合开关';
      const xp = XL + (XR - XL) * st.p;
      sld.position.x = xp;
      // 有电流通过的部分
      const cur = (id) => Math.abs(st.sol.I[id] || 0) > 1e-3;
      const seg = (m, a, b) => { m.visible = b - a > 0.002; m.scale.set(1, Math.max(0.001, b - a), 1); m.position.x = (a + b) / 2; };
      const ca = cur('Ra'), cb = cur('Rb');
      if (ca && cb) seg(hlCoil, XL, XR); else if (ca) seg(hlCoil, XL, xp); else if (cb) seg(hlCoil, xp, XR); else hlCoil.visible = false;
      const rc = cur('Rc'), rd = cur('Rd');
      if (rc && rd) seg(hlRod, -0.165, 0.165); else if (rc) seg(hlRod, -0.165, xp); else if (rd) seg(hlRod, xp, 0.165); else hlRod.visible = false;
      const R = Rnow();
      rR.set(PS.fmt(R, 1) + ' Ω'); rI.set(st.on ? PS.fmt(EL.reading(I, 0.6), 2) + ' A' : '—');
      const lo = st.pair.replace(/[CD]/g, '');
      let s, c = 'info';
      if (lo.length === 2) s = '接 A、B（<b>同下</b>）：整根电阻丝都接入电路，电阻始终是最大值 20 Ω，灯泡较暗，移动滑片<b>不能</b>改变亮度——变阻器相当于一个定值电阻。';
      else if (!lo.length) s = '接 C、D（<b>同上</b>）：电流只通过金属杆，接入的电阻几乎为零，灯泡最亮，移动滑片<b>不起作用</b>——变阻器相当于一根导线，起不到保护电路的作用。';
      else { s = '“<b>一上一下</b>”：接入电路的是 ' + lo + ' 到滑片之间的电阻丝。滑片向' + (lo === 'A' ? '右' : '左') + '移（远离 ' + lo + '），接入的电阻丝变长，电阻变大，电流变小，灯泡变暗；反之变亮。'; c = 'ok'; }
      if (!st.on) s = '先选接线柱，再闭合开关。' + s;
      if (st.warn) { s = st.warn + '<br>' + s; c = 'bad'; }
      msg.className = 'el-msg ' + c; msg.innerHTML = s;
    }
    // ---------- 在 3D 中拖动滑片 ----------
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.14), hit = new THREE.Vector3();
    let drag = false;
    const setNdc = (e) => { const r = E.renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, E.camera); };
    view.addEventListener('pointerdown', (e) => {
      setNdc(e);
      if (ray.intersectObject(grab, false).length) { drag = true; E.controls.enabled = false; e.stopPropagation(); view.setPointerCapture(e.pointerId); }
    }, true);
    view.addEventListener('pointermove', (e) => {
      if (!drag) return;
      setNdc(e);
      if (ray.ray.intersectPlane(plane, hit)) { st.p = PS.clamp((hit.x - XL) / (XR - XL), 0, 1); sl.set(Math.round(st.p * 100), true); st.warn = ''; solve(); }
    });
    const up = () => { if (drag) { drag = false; E.controls.enabled = true; } };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      K.update(dt, st.sol);
      E.render(dt);
      rh.updateMatrixWorld();
      Object.keys(TL).forEach((k) => E.place(TL[k], rh.localToWorld(v3.copy(RT_T[k]).add(new THREE.Vector3(0, 0.03, 0)))));
      PARTS.forEach(([t, p]) => { E.place(PL[t], p ? rh.localToWorld(v3.copy(p)) : sld.localToWorld(v3.set(0, YR + 0.045, 0))); });
      Object.keys(LB).forEach((id) => { const c = K.comps[id]; if (!c || LB[id].dataset.hide) { LB[id].style.display = 'none'; return; } c.g.updateMatrixWorld(); E.place(LB[id], c.g.localToWorld(v3.copy(c.top || new THREE.Vector3(0, 0.07, 0)))); });
    }, view);
    build();
    loop.start();
    el._knobPos = () => { const v = sld.localToWorld(new THREE.Vector3(0, YR + 0.02, 0)).project(E.camera), r = view.getBoundingClientRect(); return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height]; };
    el._st = st; el._toggle = toggle; el._set = (p) => { st.p = p; sl.set(Math.round(p * 100), true); solve(); };
  });
  if (!document.getElementById('rh3-style')) document.head.append(h('style', { id: 'rh3-style' }, `
    .label3d.tl-lab{background:#f08c00;color:#fff;font-weight:900;min-width:1.6em;text-align:center}
    .label3d.pl-lab{background:rgba(59,91,219,.92);color:#fff}
  `));
})();
