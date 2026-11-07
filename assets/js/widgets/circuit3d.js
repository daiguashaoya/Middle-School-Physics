/* 第15章：3D 电路器材与两个 3D 实验——sp-3d 连接串联电路和并联电路、law-3d 探究串、并联电路中电流的规律。
 * PS.el.kit3d(E)：在 EL.three 场景中摆放电池盒、灯泡（灯座）、开关、电流表，用弯曲的导线连接接线柱，导线上的小球表示电流。
 * 依赖 three.js、OrbitControls、circuit.js */
(function () {
  'use strict';
  const { h } = PS;
  const EL = PS.el;

  /* ================= 3D 器材 ================= */
  EL.kit3d = function (E) {
    const { scene, Std } = E;
    const K = { comps: {}, wires: [], phase: {} };
    const postGeo = new THREE.CylinderGeometry(0.0055, 0.007, 0.03, 12);
    const glowTex = E.tex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(255,240,170,1)'); r.addColorStop(0.35, 'rgba(255,212,59,.55)'); r.addColorStop(1, 'rgba(255,212,59,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const dotGeo = new THREE.SphereGeometry(0.0042, 8, 6), dotMat = new THREE.MeshBasicMaterial({ color: 0xf08c00 });
    function post(g, x, z, col, yb) {
      const p = new THREE.Mesh(postGeo, Std(col, { metalness: 0.3, roughness: 0.4 })); p.position.set(x, (yb || 0) + 0.015, z); g.add(p);
      return new THREE.Vector3(x, (yb || 0) + 0.03, z);
    }
    function comp(id, kind, x, z, ry) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; scene.add(g);
      const c = { id, kind, g, T: {} }; K.comps[id] = c; return c;
    }
    K.battery = function (id, x, z, ry) {
      const c = comp(id, 'bat', x, z, ry), g = c.g;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.032, 0.066), Std(0x2b2f36, { roughness: 0.7 })); body.position.y = 0.016; g.add(body);
      [-0.038, 0.038].forEach((cx) => {
        const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.07, 20), Std(0xf08c00, { roughness: 0.4, metalness: 0.2 })); cell.rotation.z = Math.PI / 2; cell.position.set(cx, 0.034, 0); g.add(cell);
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.006, 10), Std(0xced4da, { metalness: 0.8 })); tip.rotation.z = Math.PI / 2; tip.position.set(cx + 0.037, 0.034, 0); g.add(tip);
      });
      c.T['+'] = post(g, 0.1, 0, 0xe03131); c.T['-'] = post(g, -0.1, 0, 0x212529);
      return c;
    };
    K.bulb = function (id, x, z, ry) {
      const c = comp(id, 'bulb', x, z, ry), g = c.g;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.02, 0.05), Std(0x1c7ed6, { roughness: 0.6 })); base.position.y = 0.01; g.add(base);
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.022, 16), Std(0xced4da, { metalness: 0.7, roughness: 0.3 })); sock.position.y = 0.031; g.add(sock);
      const glassM = Std(0xf1f8ff, { transparent: true, opacity: 0.45, roughness: 0.05, emissive: 0xffd43b, emissiveIntensity: 0, depthWrite: false });
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 16), glassM); glass.position.y = 0.062; glass.renderOrder = 5; g.add(glass);
      const filM = new THREE.MeshBasicMaterial({ color: 0x495057 });
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0012, 6, 16), filM); fil.position.y = 0.062; g.add(fil);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0 })); glow.position.y = 0.062; glow.scale.set(0.12, 0.12, 1); glow.renderOrder = 6; g.add(glow);
      c.T['1'] = post(g, -0.036, 0, 0xadb5bd, 0.005); c.T['2'] = post(g, 0.036, 0, 0xadb5bd, 0.005);
      c.setLit = (b) => { b = Math.min(1.4, Math.max(0, b)); glassM.emissiveIntensity = b * 1.4; glassM.opacity = 0.45 + b * 0.4; filM.color.setHex(b > 0.03 ? 0xffa94d : 0x495057); glow.material.opacity = Math.min(1, b * 1.1); const s = 0.06 + b * 0.12; glow.scale.set(s, s, 1); };
      c.setRemoved = (v) => { glass.visible = !v; fil.visible = !v; glow.visible = !v; };
      c.top = new THREE.Vector3(0, 0.1, 0);
      return c;
    };
    K.sw = function (id, x, z, ry) {
      const c = comp(id, 'sw', x, z, ry), g = c.g;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.042), Std(0xe9dcc6, { roughness: 0.8 })); base.position.y = 0.006; g.add(base);
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.012), Std(0x868e96, { metalness: 0.6 })); hinge.position.set(-0.024, 0.02, 0); g.add(hinge);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.012), Std(0x868e96, { metalness: 0.6 })); clip.position.set(0.03, 0.02, 0); g.add(clip);
      const piv = new THREE.Group(); piv.position.set(-0.024, 0.026, 0); g.add(piv);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.003, 0.008), Std(0xdee2e6, { metalness: 0.8, roughness: 0.2 })); blade.position.x = 0.031; piv.add(blade);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), Std(0xe03131)); knob.position.set(0.068, 0.004, 0); piv.add(knob);
      c.T['1'] = post(g, -0.042, 0, 0xadb5bd, 0.003); c.T['2'] = post(g, 0.042, 0, 0xadb5bd, 0.003);
      c.ang = 0.7; c.goal = 0.7;
      c.setOn = (on) => { c.goal = on ? 0 : 0.7; };
      c.tick = (dt) => { c.ang += (c.goal - c.ang) * Math.min(1, dt * 12); piv.rotation.z = c.ang; };
      c.top = new THREE.Vector3(0, 0.07, 0);
      return c;
    };
    K.ammeter = function (id, x, z, ry) {
      const c = comp(id, 'amm', x, z, ry), g = c.g;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.07, 0.06), Std(0x343a40, { roughness: 0.6 })); body.position.y = 0.035; g.add(body);
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 190;
      const tex = new THREE.CanvasTexture(cv);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.074), new THREE.MeshBasicMaterial({ map: tex })); face.position.set(0, 0.04, 0.0305); g.add(face);
      const lab = document.createElement('canvas'); lab.width = 256; lab.height = 48;
      const lc = lab.getContext('2d'); lc.fillStyle = '#343a40'; lc.fillRect(0, 0, 256, 48); lc.font = 'bold 30px sans-serif'; lc.textAlign = 'center'; lc.fillStyle = '#f8f9fa'; [['−', 60], ['0.6', 128], ['3', 196]].forEach(([t, xx]) => lc.fillText(t, xx, 36));
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.019), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lab) })); strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0.0705, 0.019); g.add(strip);
      c.T['-'] = post(g, -0.032, -0.008, 0x212529, 0.07); c.T['0.6'] = post(g, 0, -0.008, 0xe03131, 0.07); c.T['3'] = post(g, 0.032, -0.008, 0xe03131, 0.07);
      let last = '';
      c.setValue = (v, range) => {
        const key = PS.round(v, 4) + '|' + range;
        if (key === last) return; last = key;
        const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#343a40'; ctx.fillRect(0, 0, 256, 190);
        EL.dial(ctx, 128, 95, 236, { v, range });
        tex.needsUpdate = true;
      };
      c.setValue(0, 0.6);
      c.top = new THREE.Vector3(0, 0.1, 0);
      return c;
    };
    K.world = (key) => { const [id, k] = key.split(/\.(.+)/); const c = K.comps[id]; c.g.updateMatrixWorld(); return c.g.localToWorld(c.T[k].clone()); };
    K.wire = function (k1, k2, color) {
      const p1 = K.world(k1), p2 = K.world(k2), d = p1.distanceTo(p2);
      const m = p1.clone().add(p2).multiplyScalar(0.5); m.y += 0.02 + d * 0.12;
      const curve = new THREE.CatmullRomCurve3([p1, p1.clone().add(new THREE.Vector3(0, 0.018, 0)), m, p2.clone().add(new THREE.Vector3(0, 0.018, 0)), p2], false, 'centripetal');
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0032, 6, false), Std(color, { roughness: 0.5 })); scene.add(mesh);
      const len = curve.getLength(), n = Math.max(2, Math.floor(len / 0.032)), dots = [];
      for (let i = 0; i < n; i++) { const s = new THREE.Mesh(dotGeo, dotMat); s.visible = false; scene.add(s); dots.push(s); }
      const w = { id: 'w' + K.wires.length, k1, k2, curve, len, mesh, dots, ph: 0 };
      K.wires.push(w); return w;
    };
    K.clearWires = () => { K.wires.forEach((w) => { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.dots.forEach((d) => scene.remove(d)); }); K.wires = []; };
    K.remove = (id) => { const c = K.comps[id]; if (c) { scene.remove(c.g); delete K.comps[id]; } };
    /** 按接线柱之间的导线生成网表：o.E 电压、o.r 内阻、o.R { 灯泡 id: 电阻 }、o.on { 开关 id: 闭合 }、o.open { 灯泡 id: 拧下 } */
    K.net = function (o) {
      const els = [];
      const used = new Set(); K.wires.forEach((w) => { used.add(w.k1); used.add(w.k2); });
      Object.values(K.comps).forEach((c) => {
        if (c.kind === 'bat') els.push({ id: c.id, t: 'bat', a: c.id + '.+', b: c.id + '.-', E: o.E || 3, r: o.r || 1 });
        else if (c.kind === 'bulb') els.push({ id: c.id, t: 'bulb', a: c.id + '.2', b: c.id + '.1', R: (o.R && o.R[c.id]) || 10, Pn: (o.Pn && o.Pn[c.id]) || 0.75, open: o.open && o.open[c.id] });
        else if (c.kind === 'sw') els.push({ id: c.id, t: 'sw', a: c.id + '.2', b: c.id + '.1', on: o.on && o.on[c.id] });
        else if (c.kind === 'amm') { const rk = used.has(c.id + '.0.6') ? '0.6' : used.has(c.id + '.3') ? '3' : null; if (rk) { els.push({ id: c.id, t: 'amm', a: c.id + '.' + rk, b: c.id + '.-' }); c.range = +rk; } else c.range = null; }
      });
      K.wires.forEach((w) => els.push({ id: w.id, t: 'wire', a: w.k1, b: w.k2 }));
      return { els };
    };
    K.update = function (dt, sol, o) {
      o = o || {};
      Object.values(K.comps).forEach((c) => { if (c.tick) c.tick(dt); });
      K.wires.forEach((w) => {
        const I = sol ? sol.I[w.id] || 0 : 0, on = Math.abs(I) > 0.003 && o.dots !== false;
        w.ph += 0.22 * Math.tanh(I / 0.45) * dt;
        w.dots.forEach((d, i) => { d.visible = on; if (on) { const s = (((w.ph / w.len + i / w.dots.length) % 1) + 1) % 1; w.curve.getPointAt(s, d.position); } });
      });
    };
    /** 一串元件：从接线柱 start 出发，依次经过 ids 中的元件（每个元件自动选离上一个接线柱近的一端作为入口），到接线柱 end */
    K.chain = function (start, ids, end, colors) {
      let prev = start, k = 0;
      ids.forEach((id) => {
        const c = K.comps[id];
        let ins, outs;
        if (c.kind === 'amm') { ins = id + '.' + (c.useRange || '0.6'); outs = id + '.-'; }
        else {
          const ks = Object.keys(c.T).map((x) => id + '.' + x), pp = K.world(prev);
          ks.sort((a, b) => K.world(a).distanceTo(pp) - K.world(b).distanceTo(pp));
          ins = ks[0]; outs = ks[1];
        }
        K.wire(prev, ins, colors[k++ % colors.length]);
        prev = outs;
      });
      if (end) K.wire(prev, end, colors[k % colors.length]);
      return prev;
    };
    return K;
  };
  const COLS = [0xe03131, 0xf59f00, 0x1c7ed6, 0x2b8a3e, 0xae3ec9, 0x0c8599, 0x212529];
  const desk = (E) => { const d = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.8), E.Std(0xe9dcc6, { roughness: 0.9 })); d.position.y = -0.01; E.scene.add(d); };

  /* ================= 3D 连接串联电路和并联电路 ================= */
  PS.register('sp-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { mode: 'series', on: { S: false, S1: true, S2: true }, open: {}, spos: 0, sol: null, acted: false, log: [] };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察；导线上移动的橙色小球表示电流的方向。')), side));
    const modeSeg = PS.ui.seg([{ value: 'series', label: '串联电路' }, { value: 'parallel', label: '并联电路' }], 'series', (v) => { st.mode = v; st.open = {}; st.on = { S: false, S1: true, S2: true }; st.spos = 0; build(); });
    const btns = h('div', { class: 'el-chips' });
    const msg = h('div', { class: 'el-msg info' });
    const logBox = h('div', { class: 'el-msg info' });
    side.append(h('div', { class: 'panel' }, h('h4', null, '① 选择连接方式'), modeSeg.el), h('div', { class: 'panel' }, h('h4', null, '② 操作'), btns, msg), h('div', { class: 'panel' }, h('h4', null, '③ 你的发现'), logBox));
    const E = EL.three(view, { cam: [0.04, 0.46, 0.5], target: [0, 0, -0.03], min: 0.2, max: 1.8 });
    desk(E);
    const K = EL.kit3d(E);
    const LB = {};
    function label(id, t) { if (!LB[id]) LB[id] = E.label(t); LB[id].innerHTML = t; LB[id].dataset.hide = ''; }
    function build() {
      Object.keys(K.comps).forEach((id) => K.remove(id)); K.clearWires();
      Object.values(LB).forEach((l) => { l.dataset.hide = '1'; });
      K.battery('E', 0, 0.2);
      if (st.mode === 'series') {
        K.bulb('L1', 0.15, -0.16); K.bulb('L2', -0.15, -0.16);
        const SP = [[0.28, 0.02, Math.PI / 2], [0, -0.27, 0], [-0.28, 0.02, Math.PI / 2]][st.spos];
        K.sw('S', SP[0], SP[1], SP[2]);
        const order = [['S', 'L1', 'L2'], ['L1', 'S', 'L2'], ['L1', 'L2', 'S']][st.spos];
        K.chain('E.+', order, 'E.-', COLS);
        label('E', '电源'); label('L1', 'L1'); label('L2', 'L2'); label('S', '开关 S');
      } else {
        K.sw('S', 0.3, 0.06, Math.PI / 2);
        K.sw('S1', 0.13, -0.22); K.bulb('L1', -0.1, -0.22);
        K.sw('S2', 0.13, -0.04); K.bulb('L2', -0.1, -0.04);
        const j = K.chain('E.+', ['S'], null, COLS);
        K.chain(j, ['S1', 'L1'], 'E.-', [COLS[1], COLS[2], COLS[3]]);
        K.chain(j, ['S2', 'L2'], 'E.-', [COLS[4], COLS[5], COLS[6]]);
        label('E', '电源'); label('L1', 'L1'); label('L2', 'L2'); label('S', '干路开关 S'); label('S1', 'S1'); label('S2', 'S2');
      }
      solve();
    }
    function note(s) { if (st.acted && st.log[st.log.length - 1] !== s) { st.log.push(s); if (st.log.length > 6) st.log.shift(); } }
    function solve() {
      Object.values(K.comps).forEach((c) => { if (c.kind === 'sw') c.setOn(!!st.on[c.id]); if (c.kind === 'bulb') c.setRemoved(!!st.open[c.id]); });
      st.sol = EL.solve(K.net({ E: 3, r: 1, on: st.on, open: st.open }));
      const lit = (id) => Math.max(0, (st.sol.P[id] || 0) / 0.75);
      ['L1', 'L2'].forEach((id) => K.comps[id].setLit(lit(id)));
      btns.innerHTML = '';
      const b = (t, f, on) => btns.append(PS.ui.button(t, () => { f(); st.acted = true; PS.sound.tick(); solve(); }, 'btn btn-sm' + (on ? ' on' : '')));
      const sws = st.mode === 'series' ? ['S'] : ['S', 'S1', 'S2'];
      sws.forEach((k) => b((st.on[k] ? '断开 ' : '闭合 ') + k, () => { st.on[k] = !st.on[k]; PS.sound.clack(); }));
      ['L1', 'L2'].forEach((k) => b((st.open[k] ? '拧上 ' : '拧下 ') + k, () => { st.open[k] = !st.open[k]; }, st.open[k]));
      if (st.mode === 'series') btns.append(PS.ui.button('改变开关的位置', () => { st.spos = (st.spos + 1) % 3; st.acted = true; build(); }, 'btn btn-sm'));
      const L1 = lit('L1') > 0.04, L2 = lit('L2') > 0.04, n = (L1 ? 1 : 0) + (L2 ? 1 : 0);
      let s = 'L1 ' + (L1 ? '亮' : '不亮') + '，L2 ' + (L2 ? '亮' : '不亮') + '。';
      if (st.mode === 'series') {
        if (n) s += '电流从电源正极出发，依次经过各元件回到负极，只有<b>一条路径</b>。';
        if (st.on.S && (st.open.L1 || st.open.L2)) { s += '拧下一个灯泡，另一个也不亮了。'; note('串联：拧下一个灯泡，另一个也不亮——各用电器相互影响。'); }
        if (!st.on.S) note('串联：断开开关，两灯同时熄灭。');
        if (st.spos && st.on.S) note('串联：改变开关的位置，它仍然同时控制两灯。');
      } else {
        if (n) s += '电流在分支点分成' + (n === 2 ? '<b>两条路径</b>' : '两路') + '，在汇合点汇合。';
        if (st.on.S && st.on.S1 && st.on.S2 && (st.open.L1 !== st.open.L2)) note('并联：拧下一个灯泡，另一个照样发光——各用电器互不影响。');
        if (!st.on.S) note('并联：断开干路开关 S，两灯都熄灭——干路开关控制整个电路。');
        if (st.on.S && st.on.S1 !== st.on.S2) note('并联：支路开关只控制它所在支路的灯泡。');
      }
      msg.className = 'el-msg ' + (n ? 'ok' : 'info'); msg.innerHTML = s;
      logBox.className = 'el-msg ' + (st.log.length ? 'ok' : 'info');
      logBox.innerHTML = st.log.length ? st.log.map((x) => '· ' + x).join('<br>') : '闭合开关，再试试拧下一个灯泡、改变开关的位置、断开支路开关……';
    }
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      K.update(dt, st.sol);
      E.render(dt);
      Object.keys(LB).forEach((id) => { const c = K.comps[id]; if (!c || LB[id].dataset.hide) { LB[id].style.display = 'none'; return; } c.g.updateMatrixWorld(); E.place(LB[id], c.g.localToWorld(v3.copy(c.top || new THREE.Vector3(0, 0.07, 0)))); });
    }, view);
    build();
    loop.start();
    el._st = st;
  });

  /* ================= 3D 探究串、并联电路中电流的规律 ================= */
  const SPEC = { '2.5': { n: '2.5 V', R: 8.3, Pn: 0.75 }, '3.8': { n: '3.8 V', R: 12.7, Pn: 1.14 } };
  PS.register('law-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { mode: 'series', pt: 'A', range: 0.6, on: false, spec: { L1: '2.5', L2: '3.8' }, sol: null, groups: { series: [], parallel: [] }, show: false };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' }, html: '拖动画面可以换角度观察。电流表要<b>串联</b>在被测电路中，电流从“0.6”或“3”接线柱流入、从“−”接线柱流出。' })), side));
    const modeSeg = PS.ui.seg([{ value: 'series', label: '串联电路' }, { value: 'parallel', label: '并联电路' }], 'series', (v) => { st.mode = v; st.on = false; build(); });
    const specSel = (k) => { const s = h('select', { class: 'cb-sel' }, Object.keys(SPEC).map((x) => h('option', { value: x }, SPEC[x].n))); s.value = st.spec[k]; s.addEventListener('change', () => { st.spec[k] = s.value; st.on = false; build(); }); return s; };
    const ptSeg = PS.ui.seg(['A', 'B', 'C'].map((p) => ({ value: p, label: p + ' 点' })), 'A', (v) => { st.pt = v; st.on = false; build(); });
    const rgSeg = PS.ui.seg([{ value: 0.6, label: '接“0.6”（0~0.6 A）' }, { value: 3, label: '接“3”（0~3 A）' }], 0.6, (v) => { st.range = v; st.on = false; build(); });
    const swBtn = PS.ui.button('闭合开关', () => { st.on = !st.on; PS.sound.clack(); solve(); }, 'btn btn-primary btn-sm');
    const ptInfo = h('div', { class: 'small muted' });
    const dialBox = h('div', { style: { maxWidth: '260px' } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '读数' });
    const fb = h('div', { class: 'el-msg info' });
    const tbl = h('div');
    const ana = h('div', { class: 'el-msg info' });
    const showT = PS.ui.toggle('直接显示示数（老师演示用）', false, (v) => { st.show = v; solve(); });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 连接电路'), modeSeg.el, h('div', { class: 'controls', style: { marginTop: '6px' } }, h('label', { class: 'small' }, 'L1 规格 ', specSel('L1')), h('label', { class: 'small' }, 'L2 规格 ', specSel('L2')))),
      h('div', { class: 'panel' }, h('h4', null, '② 电流表接在哪里'), ptSeg.el, ptInfo, rgSeg.el, h('div', { class: 'controls', style: { marginTop: '6px' } }, swBtn)),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数并记录'), dialBox, h('div', { class: 'el-ans' }, inp, h('span', null, 'A'), PS.ui.button('记录', record, 'btn btn-primary btn-sm')), fb, showT.el),
      h('div', { class: 'panel' }, h('h4', null, '④ 数据与结论'), tbl, ana));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') record(); });
    const DS = PS.stage(dialBox, { ratio: '1 / 0.8', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 300, 240); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 240); EL.dial(ctx, 150, 105, 250, { v: st.on ? amI() : 0, range: st.range, terms: true, sel: ['-', String(st.range)], F }); } });
    const E = EL.three(view, { cam: [0.02, 0.46, 0.5], target: [0, 0, -0.03], min: 0.2, max: 1.8 });
    desk(E);
    const K = EL.kit3d(E);
    const LB = {};
    const PTS = { series: { A: '电源正极与 L1 之间', B: 'L1 与 L2 之间', C: 'L2 与电源负极之间' }, parallel: { A: '干路上', B: 'L1 所在的支路上', C: 'L2 所在的支路上' } };
    function label(id, t) { if (!LB[id]) LB[id] = E.label(t); LB[id].innerHTML = t; LB[id].dataset.hide = ''; }
    function build() {
      Object.keys(K.comps).forEach((id) => K.remove(id)); K.clearWires();
      Object.values(LB).forEach((l) => { l.dataset.hide = '1'; });
      K.battery('E', -0.05, 0.22); K.sw('S', 0.2, 0.2);
      const amm = (x, z, ry) => { const c = K.ammeter('A', x, z, ry); c.useRange = String(st.range); return c; };
      const P = st.pt;
      if (st.mode === 'series') {
        K.bulb('L1', 0.16, -0.17); K.bulb('L2', -0.18, -0.17);
        if (P === 'A') amm(0.33, -0.02, -Math.PI / 2); else if (P === 'B') amm(-0.01, -0.3, 0); else amm(-0.34, -0.0, Math.PI / 2);
        const seq = ['S'].concat(P === 'A' ? ['A'] : [], ['L1'], P === 'B' ? ['A'] : [], ['L2'], P === 'C' ? ['A'] : []);
        K.chain('E.+', seq, 'E.-', COLS);
      } else {
        K.bulb('L1', -0.12, -0.24); K.bulb('L2', -0.12, -0.06);
        if (P === 'A') amm(0.34, 0.0, -Math.PI / 2); else if (P === 'B') amm(0.12, -0.27, 0); else amm(0.12, -0.09, 0);
        const j = K.chain('E.+', ['S'].concat(P === 'A' ? ['A'] : []), null, COLS);
        K.chain(j, (P === 'B' ? ['A'] : []).concat(['L1']), 'E.-', [COLS[2], COLS[3], COLS[4]]);
        K.chain(j, (P === 'C' ? ['A'] : []).concat(['L2']), 'E.-', [COLS[5], COLS[1], COLS[6]]);
      }
      label('E', '电源'); label('S', '开关 S'); label('L1', 'L1（' + SPEC[st.spec.L1].n + '）'); label('L2', 'L2（' + SPEC[st.spec.L2].n + '）'); label('A', '电流表（测 ' + P + ' 点）');
      ptInfo.innerHTML = '现在测 <b>' + P + ' 点</b>：' + PTS[st.mode][P] + '。';
      solve(); table();
    }
    function amI() { return st.sol ? st.sol.I.A || 0 : 0; }
    function solve() {
      K.comps.S.setOn(st.on);
      st.sol = EL.solve(K.net({ E: 3, r: 0.5, on: { S: st.on }, R: { L1: SPEC[st.spec.L1].R, L2: SPEC[st.spec.L2].R }, Pn: { L1: SPEC[st.spec.L1].Pn, L2: SPEC[st.spec.L2].Pn } }));
      ['L1', 'L2'].forEach((id) => K.comps[id].setLit(Math.max(0, (st.sol.P[id] || 0) / SPEC[st.spec[id]].Pn) * 1.6));
      K.comps.A.setValue(st.on ? amI() : 0, st.range);
      swBtn.innerHTML = st.on ? '断开开关' : '闭合开关';
      const v = amI();
      if (!st.on) { fb.className = 'el-msg info'; fb.innerHTML = '闭合开关，读出电流表的示数（看右上方放大的表盘）。'; }
      else if (v > st.range) { fb.className = 'el-msg bad'; fb.innerHTML = '指针偏转超过了量程！应断开开关，改接 0~3 A 量程。'; }
      else if (st.range === 3 && v < 0.6) { fb.className = 'el-msg info'; fb.innerHTML = '指针偏转角度很小，读数不精确。电流小于 0.6 A 时，应换用 0~0.6 A 的小量程。' + (st.show ? '（示数 ' + PS.fmt(EL.reading(v, 3), 1) + ' A）' : ''); }
      else { fb.className = 'el-msg info'; fb.innerHTML = '读出示数，填在上面的框里，点“记录”。' + (st.show ? '（示数 ' + PS.fmt(EL.reading(v, st.range), 2) + ' A）' : ''); }
      DS.render();
    }
    function cur() {
      const G = st.groups[st.mode], key = st.spec.L1 + '|' + st.spec.L2;
      let g = G[G.length - 1];
      if (!g || g.key !== key) { g = { key, L1: st.spec.L1, L2: st.spec.L2 }; G.push(g); if (G.length > 4) G.shift(); }
      return g;
    }
    function record() {
      if (!st.on) { fb.className = 'el-msg bad'; fb.innerHTML = '先闭合开关，再读数。'; return; }
      const v = amI();
      if (v > st.range) { fb.className = 'el-msg bad'; fb.innerHTML = '超过量程了，不能读数。先换用 0~3 A 量程。'; return; }
      const r = EL.judge(parseFloat(String(inp.value).replace(/，/g, '.')), v, st.range);
      fb.className = 'el-msg ' + (r.ok ? 'ok' : 'bad'); fb.innerHTML = r.hint;
      if (!r.ok) { PS.sound.bad(); return; }
      PS.sound.good();
      const g = cur(); g[st.pt] = EL.reading(v, st.range); g['r' + st.pt] = st.range;
      inp.value = '';
      table();
      const nextPt = ['A', 'B', 'C'].find((p) => g[p] == null);
      if (nextPt) { fb.innerHTML += '接下来把电流表改接到 <b>' + nextPt + ' 点</b>。'; }
      else fb.innerHTML += '这一组测完了。换用不同规格的灯泡再测一组，避免结论的偶然性。';
    }
    function table() {
      const G = st.groups[st.mode];
      const f = (v) => (v == null ? '' : PS.fmt(v, 2));
      tbl.innerHTML = '<table class="el-tbl"><tr><th>次数</th><th>L1、L2 规格</th><th>I<sub>A</sub>/A</th><th>I<sub>B</sub>/A</th><th>I<sub>C</sub>/A</th></tr>' +
        (G.length ? G.map((g, i) => '<tr><td>' + (i + 1) + '</td><td>' + SPEC[g.L1].n + '，' + SPEC[g.L2].n + '</td><td>' + f(g.A) + '</td><td>' + f(g.B) + '</td><td>' + f(g.C) + '</td></tr>').join('') : '<tr><td colspan="5" class="muted">还没有数据</td></tr>') + '</table>';
      const full = G.filter((g) => g.A != null && g.B != null && g.C != null);
      let s, c = 'info';
      if (!full.length) s = '把电流表依次接在 A、B、C 三点，分别测出电流。' + (st.mode === 'series' ? '' : '注意 A 点在干路上，电流较大。');
      else if (st.mode === 'series') {
        const eq = full.every((g) => Math.abs(g.A - g.B) < 0.03 && Math.abs(g.B - g.C) < 0.03);
        s = eq ? '每一组中 I<sub>A</sub> = I<sub>B</sub> = I<sub>C</sub>。' + (full.length >= 2 ? '<b>结论：串联电路中，电流处处相等</b>（I<sub>A</sub> = I<sub>B</sub> = I<sub>C</sub>）。' : '换用不同规格的灯泡再测一组。') : '比较 A、B、C 三点的电流，它们有什么关系？';
        c = eq && full.length >= 2 ? 'ok' : 'info';
      } else {
        const sum = full.every((g) => Math.abs(g.A - (g.B + g.C)) <= (g.rA === 3 ? 0.1 : 0.04));
        s = sum ? '每一组中 I<sub>A</sub> 都等于 I<sub>B</sub> + I<sub>C</sub>（在误差范围内）。' + (full.length >= 2 ? '<b>结论：并联电路中，干路电流等于各支路电流之和</b>（I<sub>A</sub> = I<sub>B</sub> + I<sub>C</sub>）。两灯规格相同时，两条支路的电流相等；规格不同时不相等。' : '换用不同规格的灯泡再测一组。') : '比较干路电流 I<sub>A</sub> 与两条支路电流 I<sub>B</sub>、I<sub>C</sub> 的关系。';
        c = sum && full.length >= 2 ? 'ok' : 'info';
      }
      ana.className = 'el-msg ' + c; ana.innerHTML = s;
    }
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt) => {
      K.update(dt, st.sol);
      E.render(dt);
      Object.keys(LB).forEach((id) => { const c = K.comps[id]; if (!c || LB[id].dataset.hide) { LB[id].style.display = 'none'; return; } c.g.updateMatrixWorld(); E.place(LB[id], c.g.localToWorld(v3.copy(c.top || new THREE.Vector3(0, 0.07, 0)))); });
    }, view);
    build();
    loop.start();
    el._st = st; el._amI = amI; el._record = record; el._inp = inp;
  });
})();
