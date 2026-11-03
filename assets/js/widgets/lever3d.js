/* 第12章第1节：3D 探究杠杆的平衡条件——平衡螺母调平、两侧挂钩码（每个 0.5 N，每格 5 cm）、用弹簧测力计竖直 / 斜着拉、记录与分析论证。依赖 three.js、OrbitControls、machine.js（.fc-* 样式来自 force.js） */
(function () {
  'use strict';
  const { h } = PS;
  const HALF = 0.34, CELL = 0.05, PY = 0.42, W1 = 0.5, DELTA = 0.006, KAP = 0.03, TMAX = 0.2;

  PS.register('lever-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const MC = PS.mc;
    const st = { k: 0, k0: 0, nL: 0, pL: 2, mode: 'hook', nR: 0, pR: 2, ang: 0, th: 0, w: 0, rows: [], arms: true };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。杠杆上每格 5 cm，每个钩码重 0.5 N；左侧的钩码作为阻力 F₂，右侧的钩码或弹簧测力计的拉力作为动力 F₁。')), side));

    // ---------- 控件 ----------
    const nutL = PS.ui.button('← 平衡螺母向左调', () => nut(-1), 'btn btn-sm');
    const nutR = PS.ui.button('平衡螺母向右调 →', () => nut(1), 'btn btn-sm');
    const nSeg = (v, f) => { const s = PS.ui.seg([0, 1, 2, 3, 4].map((n) => ({ value: n, label: n ? n + ' 个' : '不挂' })), v, f); s.el.style.flexWrap = 'wrap'; return s; };
    const pSeg = (v, f) => { const s = PS.ui.seg([1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: n + ' 格' })), v, f); s.el.style.flexWrap = 'wrap'; return s; };
    const nl = nSeg(st.nL, (v) => hang('nL', v)), pl = pSeg(st.pL, (v) => hang('pL', v));
    const mSeg = PS.ui.seg([{ value: 'hook', label: '挂钩码' }, { value: 'scale', label: '用弹簧测力计拉' }], st.mode, (v) => hang('mode', v));
    const nr = nSeg(st.nR, (v) => hang('nR', v)), pr = pSeg(st.pR, (v) => hang('pR', v));
    const aSeg = PS.ui.seg([{ value: 0, label: '竖直向下拉' }, { value: 30, label: '斜拉 30°' }, { value: 60, label: '斜拉 60°' }], st.ang, (v) => hang('ang', v));
    aSeg.el.style.flexWrap = 'wrap';
    const hookBox = h('div', null, h('div', { class: 'small muted' }, '钩码个数'), nr.el), scaleBox = h('div', null, h('div', { class: 'small muted' }, '拉力的方向'), aSeg.el);
    const armT = PS.ui.toggle('显示力臂', true, (v) => { st.arms = v; });
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const rd = { F1: PS.ui.readout('动力 F₁', '—', 'accent'), l1: PS.ui.readout('动力臂 l₁', '—', 'accent'), F2: PS.ui.readout('阻力 F₂', '—', 'primary'), l2: PS.ui.readout('阻力臂 l₂', '—', 'primary') };
    const msg = h('div', { class: 'fc-msg' }), state = h('div', { class: 'small', style: { marginTop: '4px' } });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 调节杠杆在水平位置平衡'), h('div', { class: 'row' }, nutL, nutR), state),
      h('div', { class: 'panel' }, h('h4', null, '② 左侧挂钩码（阻力 F₂）'), h('div', { class: 'small muted' }, '钩码个数'), nl.el, h('div', { class: 'small muted', style: { marginTop: '4px' } }, '挂在离支点几格处'), pl.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 右侧的动力 F₁'), mSeg.el, h('div', { style: { marginTop: '6px' } }, hookBox, scaleBox), h('div', { class: 'small muted', style: { marginTop: '4px' } }, '作用在离支点几格处'), pr.el),
      h('div', { class: 'panel' }, h('h4', null, '④ 读数与记录'), h('div', { class: 'mc-read' }, rd.F1.el, rd.l1.el, rd.F2.el, rd.l2.el), h('div', { class: 'row' }, recB, armT.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['次数', 'F₁/N', 'l₁/m', 'F₂/N', 'l₂/m', 'F₁l₁', 'F₂l₂'].map((t) => h('th', null, t)))), tbody)), PS.ui.row(PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'), PS.ui.button('换一根杠杆（重新调平）', fresh, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑥ 分析论证' : '⑥ 你发现了什么？'), ana));

    const tauNut = () => (st.k0 - st.k) * DELTA;
    const level = () => st.k === st.k0;
    const F2 = () => st.nL * W1, l2 = () => st.pL * CELL;
    const cosA = () => Math.cos((st.ang * Math.PI) / 180);
    const scaleF = () => (st.nL * W1 * st.pL * CELL) / (st.pR * CELL * cosA());
    const F1 = () => (st.mode === 'hook' ? st.nR * W1 : scaleF());
    const l1 = () => st.pR * CELL * (st.mode === 'scale' ? cosA() : 1);
    const over = () => st.mode === 'scale' && st.nL > 0 && scaleF() > 5;
    function torque() {
      if (st.mode === 'scale' && st.nL > 0 && !over()) return 0; // 手拉着测力计使杠杆水平平衡
      let t = tauNut() + st.nL * W1 * st.pL * CELL;
      if (st.mode === 'hook') t -= st.nR * W1 * st.pR * CELL; else if (over()) t -= 5 * st.pR * CELL * cosA();
      return t;
    }
    const balanced = () => Math.abs(torque()) < 1e-9;

    function nut(d) {
      if (st.nL > 0 || (st.mode === 'hook' && st.nR > 0)) { tell('挂上钩码以后<b>不能再调节平衡螺母</b>！应该改变钩码的个数或位置，使杠杆重新平衡。', 'bad'); PS.sound.bad(); return; }
      st.k = PS.clamp(st.k + d, -8, 8); PS.sound.tick(); tell();
    }
    function hang(k, v) {
      if (!level() && (k === 'nL' || k === 'nR') && v > 0) {
        tell('先调节<b>平衡螺母</b>，使杠杆在水平位置平衡，再挂钩码。', 'bad'); PS.sound.bad();
        (k === 'nL' ? nl : nr).set(0, true); return;
      }
      st[k] = v;
      hookBox.style.display = st.mode === 'hook' ? '' : 'none'; scaleBox.style.display = st.mode === 'scale' ? '' : 'none';
      PS.sound.clack(); tell();
    }
    function fresh() {
      st.k0 = PS.pick([-4, -3, -2, 2, 3, 4]); st.k = 0; st.nL = 0; st.nR = 0; st.mode = 'hook';
      nl.set(0, true); nr.set(0, true); mSeg.set('hook', true); hookBox.style.display = ''; scaleBox.style.display = 'none';
      tell();
    }
    function tell(t, cls) {
      const lv = level();
      const tq = torque();
      state.innerHTML = lv ? '✔ 杠杆在水平位置平衡（消除了杠杆自重的影响）' : (tauNut() > 0 ? '杠杆<b>左端下沉</b>，平衡螺母应向<b>右</b>调' : '杠杆<b>右端下沉</b>，平衡螺母应向<b>左</b>调') + '（哪端高往哪端调）';
      state.style.color = lv ? 'var(--green)' : 'var(--red)';
      const hasR = st.mode === 'hook' ? st.nR > 0 : st.nL > 0;
      rd.F2.set(st.nL ? PS.fmt(F2(), 1) + ' N' : '—'); rd.l2.set(st.nL ? PS.fmt(l2(), 2) + ' m' : '—');
      rd.F1.set(hasR ? (over() ? '超过量程' : PS.fmt(F1(), st.mode === 'scale' ? 2 : 1) + ' N') : '—');
      rd.l1.set(hasR ? PS.fmt(l1(), st.mode === 'scale' && st.ang ? 3 : 2) + ' m' : '—');
      recB.disabled = !(lv && st.nL > 0 && hasR && balanced());
      if (t) { msg.className = 'fc-msg ' + (cls || 'info'); msg.innerHTML = t; return; }
      let s, c = 'info';
      if (!lv) s = '实验前先调节杠杆两端的<b>平衡螺母</b>，使杠杆在<b>水平位置</b>平衡。';
      else if (!st.nL) s = '杠杆已在水平位置平衡。在左侧挂上钩码（阻力），再在右侧挂钩码或用弹簧测力计拉，使杠杆<b>重新在水平位置平衡</b>。';
      else if (over()) { s = '需要的拉力超过了弹簧测力计的量程（5 N）。把测力计移到离支点远一些的位置。'; c = 'bad'; }
      else if (st.mode === 'scale') { s = st.ang ? '斜着拉时，动力臂是从 O 到拉力作用线的距离（虚线），<b>比 ' + st.pR + ' 格短</b>，所以弹簧测力计的示数<b>变大</b>，而且力臂不能直接从杠杆上读出。' : '竖直向下拉弹簧测力计，使杠杆在水平位置平衡。拉力与杠杆垂直，力臂就在杠杆上，可以直接读出。'; c = st.ang ? 'bad' : 'ok'; }
      else if (Math.abs(tq) < 1e-9) { s = '杠杆在水平位置平衡！力臂可以直接从杠杆上读出。点“记录”，再改变钩码的个数和位置多做几次。'; c = 'ok'; }
      else if (!st.nR) s = '杠杆左端下沉。在右侧挂上钩码，使杠杆重新平衡。';
      else s = tq > 0 ? '杠杆<b>左端下沉</b>：可以在右侧增加钩码或把右侧钩码向外移，也可以把左侧钩码向支点移近。' : '杠杆<b>右端下沉</b>：可以减少右侧钩码或把它向支点移近，也可以把左侧钩码向外移。';
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    function record() {
      if (recB.disabled) return;
      const f1 = st.mode === 'scale' ? PS.round(F1(), 2) : F1(), L1 = st.pR * CELL, slant = st.mode === 'scale' && st.ang > 0;
      const key = [f1, L1, F2(), l2(), slant].join('|');
      if (st.rows.some((r) => r.key === key)) { tell('这组数据已经记录过了，换一组钩码个数或位置。', 'bad'); PS.sound.bad(); return; }
      st.rows.push({ key, f1, L1, f2: F2(), L2: l2(), slant, ang: st.ang, sc: st.mode === 'scale' });
      if (st.rows.length > 8) st.rows.shift();
      PS.sound.good(); table();
      tell(slant ? '已记录。注意：斜拉时力臂不是 ' + st.pR + ' 格（' + PS.fmt(st.pR * CELL, 2) + ' m），表中按杠杆上的长度记下的 l₁ 是错的，F₁l₁ ≠ F₂l₂。' : '已记录。改变钩码的个数和位置，再做几次。', slant ? 'bad' : 'ok');
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => {
        const p1 = PS.round(r.f1 * r.L1, 3), p2 = PS.round(r.f2 * r.L2, 3);
        tbody.append(h('tr', null, h('td', null, String(i + 1) + (r.slant ? ' ⚠' : '')), h('td', null, PS.fmt(r.f1, r.sc ? 2 : 1)), h('td', null, PS.fmt(r.L1, 2)), h('td', null, PS.fmt(r.f2, 1)), h('td', null, PS.fmt(r.L2, 2)),
          h('td', null, h('b', { style: { color: r.slant ? 'var(--red)' : '' } }, String(p1))), h('td', null, h('b', null, String(p2)))));
      });
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 7, class: 'muted' }, '还没有数据')));
      const good = st.rows.filter((r) => !r.slant), slant = st.rows.some((r) => r.slant);
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      const distinct = new Set(good.map((r) => r.f2 + '|' + r.L2 + '|' + r.f1)).size;
      let s = line(good.length >= 1, '每次杠杆平衡时，动力 × 动力臂 = 阻力 × 阻力臂。')
        + line(distinct >= 3, '换不同的钩码个数和位置做了 3 次以上，结论具有<b>普遍性</b>（只做一次得出的结论有偶然性）。');
      if (good.length >= 1 && distinct >= 3) s += '<div class="tip tip-good" style="margin:8px 0 0">杠杆的平衡条件：<b>动力 × 动力臂 = 阻力 × 阻力臂</b>，即 <b>F₁l₁ = F₂l₂</b>。</div>';
      if (slant) s += '<div class="tip tip-warn" style="margin:8px 0 0">带 ⚠ 的一次是斜着拉的：力臂不在杠杆上，按 OA 记的 l₁ 偏大，F₁l₁ ≠ F₂l₂。所以实验中要<b>竖直</b>拉弹簧测力计，使杠杆在<b>水平位置</b>平衡，便于从杠杆上读出力臂。</div>';
      ana.innerHTML = s;
    }

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(38, 16 / 11, 0.01, 20);
    camera.position.set(0.1, 0.46, 0.9);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.32, 0); controls.enableDamping = true; controls.minDistance = 0.3; controls.maxDistance = 3; controls.maxPolarAngle = Math.PI * 0.56;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.6, 2, 1.5); scene.add(dl);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.6), MC.mat(0xe9dcc6)); desk.position.set(0, -0.015, 0); scene.add(desk);
    const iron = MC.mat(0x495057, { metalness: 0.5, roughness: 0.45 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.018, 0.16), MC.mat(0x343a40, { roughness: 0.6 })); base.position.set(0, 0.009, -0.08); scene.add(base);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, PY + 0.04, 12), iron); rod.position.set(0, (PY + 0.04) / 2, -0.08); scene.add(rod);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 10), MC.mat(0xadb5bd, { metalness: 0.7 })); axle.rotation.x = Math.PI / 2; axle.position.set(0, PY, -0.035); scene.add(axle);
    // 杠杆（带刻度孔的纹理）
    const lever = new THREE.Group(); lever.position.set(0, PY, 0); scene.add(lever);
    const tc = document.createElement('canvas'); tc.width = 1400; tc.height = 60;
    const t2 = tc.getContext('2d');
    const gr = t2.createLinearGradient(0, 0, 0, 60); gr.addColorStop(0, '#f1f3f5'); gr.addColorStop(1, '#c3cad3');
    t2.fillStyle = gr; t2.fillRect(0, 0, 1400, 60);
    t2.fillStyle = '#212529'; t2.font = 'bold 20px sans-serif'; t2.textAlign = 'center';
    for (let i = -6; i <= 6; i++) {
      const x = 700 + (i * CELL / (2 * HALF)) * 1400;
      t2.beginPath(); t2.arc(x, 26, i ? 7 : 9, 0, Math.PI * 2); t2.fill();
      if (i) t2.fillText(String(Math.abs(i)), x, 52);
    }
    const tex = new THREE.CanvasTexture(tc);
    const lm = MC.mat(0xffffff, { map: tex, metalness: 0.2, roughness: 0.5 }), ls = MC.mat(0xadb5bd, { metalness: 0.4, roughness: 0.4 });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF, 0.028, 0.012), [ls, ls, ls, ls, lm, lm]); lever.add(bar);
    const thread = MC.mat(0xadb5bd, { metalness: 0.6 });
    [-1, 1].forEach((s) => { const sr = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.06, 8), thread); sr.rotation.z = Math.PI / 2; sr.position.set(s * (HALF + 0.03), 0, 0); lever.add(sr); });
    const nutM = MC.mat(0xf08c00, { metalness: 0.5, roughness: 0.35 });
    const nuts = [-1, 1].map(() => { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 6), nutM); n.rotation.z = Math.PI / 2; lever.add(n); return n; });
    // 钩码组
    function hookGroup() { const g = new THREE.Group(); scene.add(g); return { g, n: -1, line: null }; }
    const HL = hookGroup(), HR = hookGroup();
    function setHooks(H, n) {
      if (H.n === n) return;
      while (H.g.children.length) H.g.remove(H.g.children[0]);
      H.n = n;
      if (!n) return;
      const k = MC.hooks3d(n); k.group.position.y = -0.03; H.g.add(k.group);
      const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.03, 4), MC.mat(0x495057)); ln.position.y = -0.015; H.g.add(ln);
    }
    const sc = MC.scale3d({ max: 5, div: 0.1 }); scene.add(sc.group);
    const hand = MC.hand3d(); scene.add(hand);
    // 力臂的虚线
    const dash = (c) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: c, dashSize: 0.012, gapSize: 0.008 })); scene.add(l); return l; };
    const actLine = dash(0xe8590c), armLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xe8590c })); scene.add(armLine);
    const armL2 = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x1c7ed6 })); scene.add(armL2);
    const setLine = (l, a, b) => { l.geometry.setFromPoints([a, b]); if (l.computeLineDistances) l.computeLineDistances(); };

    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const LB = { O: lab('支点 O'), nut: lab('平衡螺母'), F2: lab(''), F1: lab(''), l1: lab('', 'ref'), l2: lab('', 'ref') };
    const v3 = new THREE.Vector3();
    function place(e, p) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-50%)';
    }
    const onBar = (x) => new THREE.Vector3(x * Math.cos(st.th) - 0.002 * Math.sin(st.th), PY + x * Math.sin(st.th) + 0.002 * Math.cos(st.th), 0);

    PS.loop((dt) => {
      const tq = torque();
      const eq = Math.abs(tq) < 1e-9 ? 0 : PS.clamp(Math.atan(tq / KAP) * 1.6, -TMAX, TMAX);
      st.w += (40 * (eq - st.th) - 9 * st.w) * dt; st.th += st.w * dt;
      if (Math.abs(st.th) > TMAX) { st.th = Math.sign(st.th) * TMAX; st.w = 0; }
      lever.rotation.z = st.th;
      const off = st.k * 0.0025;
      nuts[0].position.set(-(HALF + 0.03) + off, 0, 0); nuts[1].position.set(HALF + 0.03 + off, 0, 0);
      setHooks(HL, st.nL); setHooks(HR, st.mode === 'hook' ? st.nR : 0);
      const qL = onBar(-st.pL * CELL), qR = onBar(st.pR * CELL);
      HL.g.position.copy(qL); HR.g.position.copy(qR);
      const useS = st.mode === 'scale' && st.nL > 0;
      sc.group.visible = hand.visible = useS;
      const a = (st.ang * Math.PI) / 180, d = new THREE.Vector3(Math.sin(a), -Math.cos(a), 0);
      if (useS) {
        const hy = sc.set(over() ? 5 : F1());
        sc.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
        sc.group.position.copy(qR).sub(new THREE.Vector3(0, hy, 0).applyQuaternion(sc.group.quaternion));
        hand.position.copy(sc.group.position).addScaledVector(d, 0.022);
      }
      // 力臂
      const show = st.arms && level() && Math.abs(st.th) < 0.01;
      const O = new THREE.Vector3(0, PY, 0.012);
      const hasR = st.mode === 'hook' ? st.nR > 0 : useS;
      actLine.visible = armLine.visible = show && hasR; armL2.visible = show && st.nL > 0;
      if (show && hasR) {
        const q = qR.clone(); q.z = 0.012;
        const tt = O.clone().sub(q).dot(d), foot = q.clone().addScaledVector(d, tt);
        setLine(actLine, q.clone().addScaledVector(d, Math.min(0, tt) - 0.05), q.clone().addScaledVector(d, Math.max(0.12, tt) + 0.05));
        setLine(armLine, O.clone().add(new THREE.Vector3(0, 0.022, 0)), foot.clone().add(new THREE.Vector3(0, 0.022, 0)));
        LB.l1.innerHTML = 'l₁ = ' + PS.fmt(l1() * 100, st.mode === 'scale' && st.ang ? 1 : 0) + ' cm';
        place(LB.l1, O.clone().add(foot).multiplyScalar(0.5).add(st.mode === 'scale' && st.ang ? new THREE.Vector3(0.06, -0.01, 0) : new THREE.Vector3(0, 0.045, 0)));
      } else LB.l1.style.display = 'none';
      if (show && st.nL > 0) {
        const q = qL.clone(); q.z = 0.012;
        setLine(armL2, O.clone().add(new THREE.Vector3(0, 0.022, 0)), new THREE.Vector3(q.x, PY + 0.022, 0.012));
        LB.l2.innerHTML = 'l₂ = ' + PS.fmt(l2() * 100, 0) + ' cm';
        place(LB.l2, new THREE.Vector3(q.x / 2, PY + 0.06, 0));
      } else LB.l2.style.display = 'none';
      controls.update();
      renderer.render(scene, camera);
      place(LB.O, new THREE.Vector3(0, PY - 0.045, 0.02));
      place(LB.nut, nuts[1].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.04, 0)));
      if (st.nL) { LB.F2.innerHTML = 'F₂ = ' + PS.fmt(F2(), 1) + ' N'; place(LB.F2, qL.clone().add(new THREE.Vector3(0, -0.06 - st.nL * 0.032, 0))); } else LB.F2.style.display = 'none';
      if (hasR) { LB.F1.innerHTML = 'F₁ = ' + (over() ? '?' : PS.fmt(F1(), st.mode === 'scale' ? 2 : 1)) + ' N'; place(LB.F1, useS ? sc.group.position.clone().add(new THREE.Vector3(0.07, 0, 0)) : qR.clone().add(new THREE.Vector3(0, -0.06 - st.nR * 0.032, 0))); } else LB.F1.style.display = 'none';
    }, view).start();
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      const nar = w < 520;
      Object.values(LB).forEach((e) => (e.style.fontSize = nar ? '11px' : ''));
    }
    new ResizeObserver(resize).observe(view);
    resize();
    el._st = st;
    fresh(); table();
  });
})();
