/* 第16章第2节：3D 探究串、并联电路中电压的规律 vlaw-3d——电压表并联在 L1、L2 或电源两端，读数、记录、得出规律。
 * 依赖 three.js、OrbitControls、circuit.js、circuit3d.js（PS.el.kit3d 的电压表） */
(function () {
  'use strict';
  const { h } = PS;
  const EL = PS.el;
  const COLS = [0xe03131, 0xf59f00, 0x1c7ed6, 0x2b8a3e, 0xae3ec9, 0x0c8599, 0x212529];
  /* 两节干电池 3 V、内阻取 1.45 Ω，灯泡电阻按低电压时的值（2.5 V 灯约 8.9 Ω、3.8 V 灯约 12 Ω），使取到 0.1 V 后 U1 + U2 = U 仍然成立 */
  const SPEC = { '2.5': { n: '2.5 V', R: 8.9, Pn: 0.75 }, '3.8': { n: '3.8 V', R: 12, Pn: 1.14 } };
  const PTS = {
    series: [{ k: 'AB', n: 'L1 两端（A、B 之间）', s: 'U₁' }, { k: 'BC', n: 'L2 两端（B、C 之间）', s: 'U₂' }, { k: 'AC', n: 'L1 和 L2 两端（A、C 之间）', s: 'U' }],
    parallel: [{ k: 'L1', n: 'L1 两端', s: 'U₁' }, { k: 'L2', n: 'L2 两端', s: 'U₂' }, { k: 'E', n: '电源两端', s: 'U' }],
  };
  PS.register('vlaw-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    if (!EL.kit3d) { el.append(h('div', { class: 'tip tip-warn' }, '需要先加载 circuit3d.js。')); return; }
    const st = { mode: 'series', pt: 'AB', range: 3, on: false, rev: false, spec: { L1: '2.5', L2: '3.8' }, sol: null, net: null, groups: { series: [], parallel: [] }, show: false };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' }, html: '拖动画面可以换角度观察。电压表要<b>并联</b>在被测电路两端，“+”接线柱（“3”或“15”）接靠近电源正极的一端。' })), side));
    const modeSeg = PS.ui.seg([{ value: 'series', label: '串联电路' }, { value: 'parallel', label: '并联电路' }], 'series', (v) => { st.mode = v; st.on = false; st.pt = PTS[v][0].k; ptSegBuild(); build(); });
    const specSel = (k) => { const s = h('select', { class: 'cb-sel' }, Object.keys(SPEC).map((x) => h('option', { value: x }, SPEC[x].n))); s.value = st.spec[k]; s.addEventListener('change', () => { st.spec[k] = s.value; st.on = false; build(); }); return s; };
    const ptBox = h('div');
    let ptSeg = null;
    function ptSegBuild() { ptSeg = PS.ui.seg(PTS[st.mode].map((p) => ({ value: p.k, label: p.n })), st.pt, (v) => { st.pt = v; st.on = false; build(); }); ptBox.innerHTML = ''; ptBox.append(ptSeg.el); }
    const rgSeg = PS.ui.seg([{ value: 3, label: '接“3”（0~3 V）' }, { value: 15, label: '接“15”（0~15 V）' }], 3, (v) => { st.range = v; st.on = false; build(); });
    const revT = PS.ui.toggle('把电压表的“+”“−”接线柱接反', false, (v) => { st.rev = v; st.on = false; build(); });
    const swBtn = PS.ui.button('闭合开关', () => { st.on = !st.on; PS.sound.clack(); solve(); }, 'btn btn-primary btn-sm');
    const dialBox = h('div', { style: { maxWidth: '260px' } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '读数' });
    const fb = h('div', { class: 'el-msg info' });
    const tbl = h('div');
    const ana = h('div', { class: 'el-msg info' });
    const showT = PS.ui.toggle('直接显示示数（老师演示用）', false, (v) => { st.show = v; solve(); });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 连接电路'), modeSeg.el, h('div', { class: 'controls', style: { marginTop: '6px' } }, h('label', { class: 'small' }, 'L1 规格 ', specSel('L1')), h('label', { class: 'small' }, 'L2 规格 ', specSel('L2')))),
      h('div', { class: 'panel' }, h('h4', null, '② 电压表接在哪里'), ptBox, rgSeg.el, h('div', { style: { marginTop: '6px' } }, revT.el), h('div', { class: 'controls', style: { marginTop: '6px' } }, swBtn)),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数并记录'), dialBox, h('div', { class: 'el-ans' }, inp, h('span', null, 'V'), PS.ui.button('记录', record, 'btn btn-primary btn-sm')), fb, showT.el),
      h('div', { class: 'panel' }, h('h4', null, '④ 数据与结论'), tbl, ana));
    ptSegBuild();
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') record(); });
    const DS = PS.stage(dialBox, { ratio: '1 / 0.8', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 300, 240); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 240); EL.dial(ctx, 150, 105, 250, { v: st.on ? Uv() : 0, range: st.range, ranges: [3, 15], unit: 'V', body: '#2f3d4a', terms: true, sel: ['-', String(st.range)], F }); } });
    const E = EL.three(view, { cam: [0.02, 0.5, 0.52], target: [0, 0, -0.06], min: 0.2, max: 1.8 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.8), E.Std(0xe9dcc6, { roughness: 0.9 })); desk.position.y = -0.01; E.scene.add(desk);
    const K = EL.kit3d(E);
    const LB = {};
    function label(id, t) { if (!LB[id]) LB[id] = E.label(t); LB[id].innerHTML = t; LB[id].dataset.hide = ''; }
    /** 元件 id 与元件 other 相连的那个接线柱 */
    function termTo(id, other) {
      for (const w of K.wires) {
        const a = w.k1.split('.')[0], b = w.k2.split('.')[0];
        if (a === id && b === other) return w.k1;
        if (b === id && a === other) return w.k2;
      }
      return null;
    }
    const other = (key) => { const id = key.split('.')[0], t = key.slice(id.length + 1), ks = Object.keys(K.comps[id].T).filter((x) => x !== t); return id + '.' + ks[0]; };
    function build() {
      Object.keys(K.comps).forEach((id) => K.remove(id)); K.clearWires();
      Object.values(LB).forEach((l) => { l.dataset.hide = '1'; });
      K.battery('E', -0.05, 0.22); K.sw('S', 0.2, 0.2);
      let hi, lo;
      if (st.mode === 'series') {
        K.bulb('L1', 0.16, -0.17); K.bulb('L2', -0.18, -0.17);
        K.voltmeter('V', -0.01, -0.36, 0);
        K.chain('E.+', ['S', 'L1', 'L2'], 'E.-', COLS);
        const a = termTo('L1', 'S'), b = other(a), c = other(termTo('L2', 'L1'));
        [hi, lo] = { AB: [a, b], BC: [b, c], AC: [a, c] }[st.pt];
      } else {
        K.bulb('L1', -0.14, -0.24); K.bulb('L2', -0.14, -0.06);
        K.voltmeter('V', 0.2, -0.3, 0);
        const j = K.chain('E.+', ['S'], null, COLS);
        K.chain(j, ['L1'], 'E.-', [COLS[2], COLS[3]]);
        K.chain(j, ['L2'], 'E.-', [COLS[1], COLS[6]]);
        const t1 = termTo('L1', 'S'), t2 = termTo('L2', 'S');
        [hi, lo] = { L1: [t1, other(t1)], L2: [t2, other(t2)], E: ['E.+', 'E.-'] }[st.pt];
      }
      if (st.rev) { const t = hi; hi = lo; lo = t; }
      K.wire('V.' + st.range, hi, 0xae3ec9); K.wire('V.-', lo, 0x0c8599);
      const p = PTS[st.mode].find((x) => x.k === st.pt);
      label('E', '电源'); label('S', '开关 S'); label('L1', 'L1（' + SPEC[st.spec.L1].n + '）'); label('L2', 'L2（' + SPEC[st.spec.L2].n + '）'); label('V', '电压表（测' + p.n.replace(/（.*）/, '') + '）');
      solve(); table();
    }
    function Uv() { return st.sol ? EL.vread(st.net, st.sol, 'V') : 0; }
    function solve() {
      K.comps.S.setOn(st.on);
      st.net = K.net({ E: 3, r: 1.45, on: { S: st.on }, R: { L1: SPEC[st.spec.L1].R, L2: SPEC[st.spec.L2].R }, Pn: { L1: SPEC[st.spec.L1].Pn, L2: SPEC[st.spec.L2].Pn } });
      st.sol = EL.solve(st.net);
      ['L1', 'L2'].forEach((id) => K.comps[id].setLit(Math.max(0, (st.sol.P[id] || 0) / SPEC[st.spec[id]].Pn) * 1.8));
      const v = Uv();
      K.comps.V.setValue(st.on ? v : 0, st.range);
      swBtn.innerHTML = st.on ? '断开开关' : '闭合开关';
      const rd = st.show ? '（示数 ' + PS.fmt(EL.reading(v, st.range), 1) + ' V）' : '';
      if (!st.on) { fb.className = 'el-msg info'; fb.innerHTML = '闭合开关，读出电压表的示数（看上面放大的表盘）。'; }
      else if (v < -0.05) { fb.className = 'el-msg bad'; fb.innerHTML = '指针<b>反向偏转</b>了！电压表的正、负接线柱接反了，应断开开关，把两根导线对调。'; }
      else if (v > st.range) { fb.className = 'el-msg bad'; fb.innerHTML = '指针偏转超过了量程！应断开开关，改接 0~15 V 量程。'; }
      else if (st.range === 15 && v < 3) { fb.className = 'el-msg info'; fb.innerHTML = '指针偏转角度很小，读数不精确。电压小于 3 V，应换用 0~3 V 的小量程再读数。' + rd; }
      else { fb.className = 'el-msg info'; fb.innerHTML = '读出示数，填在上面的框里，点“记录”。' + rd; }
      DS.render();
    }
    function cur() {
      const G = st.groups[st.mode], key = st.spec.L1 + '|' + st.spec.L2;
      let g = G[G.length - 1];
      if (!g || g.key !== key) { g = { key, s1: st.spec.L1, s2: st.spec.L2 }; G.push(g); if (G.length > 4) G.shift(); }
      return g;
    }
    function record() {
      if (!st.on) { fb.className = 'el-msg bad'; fb.innerHTML = '先闭合开关，再读数。'; return; }
      const v = Uv();
      if (v < -0.05) { fb.className = 'el-msg bad'; fb.innerHTML = '电压表接反了，不能读数。先把“+”“−”接线柱上的导线对调。'; return; }
      if (v > st.range) { fb.className = 'el-msg bad'; fb.innerHTML = '超过量程了，不能读数。先换用 0~15 V 量程。'; return; }
      if (st.range === 15 && v < 3) { fb.className = 'el-msg bad'; fb.innerHTML = '用 0~15 V 量程读数误差太大（每小格 0.5 V）。电压小于 3 V，换用 0~3 V 量程再读。'; return; }
      const r = EL.judge(parseFloat(String(inp.value).replace(/，/g, '.')), v, st.range, 'V');
      fb.className = 'el-msg ' + (r.ok ? 'ok' : 'bad'); fb.innerHTML = r.hint;
      if (!r.ok) { PS.sound.bad(); return; }
      PS.sound.good();
      const g = cur(); g[st.pt] = EL.reading(v, st.range);
      inp.value = '';
      table();
      const nx = PTS[st.mode].find((p) => g[p.k] == null);
      fb.innerHTML += nx ? '接下来把电压表改接到 <b>' + nx.n + '</b>。' : '这一组测完了。换用不同规格的灯泡再测一组，使结论具有普遍性。';
    }
    function table() {
      const G = st.groups[st.mode], P = PTS[st.mode], f = (v) => (v == null ? '' : PS.fmt(v, 1));
      const head = st.mode === 'series' ? ['U<sub>AB</sub>/V', 'U<sub>BC</sub>/V', 'U<sub>AC</sub>/V'] : ['U<sub>1</sub>/V', 'U<sub>2</sub>/V', 'U/V'];
      tbl.innerHTML = '<table class="el-tbl"><tr><th>次数</th><th>L1、L2 规格</th>' + head.map((x) => '<th>' + x + '</th>').join('') + '</tr>' +
        (G.length ? G.map((g, i) => '<tr><td>' + (i + 1) + '</td><td>' + SPEC[g.s1].n + '，' + SPEC[g.s2].n + '</td>' + P.map((p) => '<td>' + f(g[p.k]) + '</td>').join('') + '</tr>').join('') : '<tr><td colspan="5" class="muted">还没有数据</td></tr>') + '</table>';
      const full = G.filter((g) => P.every((p) => g[p.k] != null));
      let s, c = 'info';
      if (!full.length) s = st.mode === 'series' ? '把电压表依次并联在 L1 两端、L2 两端、L1 和 L2 两端，分别测出 U<sub>AB</sub>、U<sub>BC</sub>、U<sub>AC</sub>。' : '把电压表依次并联在 L1 两端、L2 两端、电源两端，分别测出 U<sub>1</sub>、U<sub>2</sub>、U。';
      else if (st.mode === 'series') {
        const ok = full.every((g) => Math.abs(g.AB + g.BC - g.AC) < 0.11);
        s = ok ? '每一组中 U<sub>AB</sub> + U<sub>BC</sub> = U<sub>AC</sub>。' + (full.length >= 2 ? '<b>结论：串联电路两端的总电压等于各部分电路两端电压之和</b>（U = U<sub>1</sub> + U<sub>2</sub>）。两灯规格相同时，它们两端的电压相等；规格不同时不相等。' : '换用不同规格的灯泡再测一组。') : '比较 U<sub>AB</sub>、U<sub>BC</sub> 与 U<sub>AC</sub>，它们有什么关系？';
        c = ok && full.length >= 2 ? 'ok' : 'info';
      } else {
        const ok = full.every((g) => Math.abs(g.L1 - g.L2) < 0.11 && Math.abs(g.L1 - g.E) < 0.11);
        s = ok ? '每一组中 U<sub>1</sub> = U<sub>2</sub> = U。' + (full.length >= 2 ? '<b>结论：并联电路中各支路两端的电压相等，都等于电源两端的电压</b>（U = U<sub>1</sub> = U<sub>2</sub>），与灯泡的规格无关。' : '换用不同规格的灯泡再测一组。') : '比较 U<sub>1</sub>、U<sub>2</sub> 与 U，它们有什么关系？';
        c = ok && full.length >= 2 ? 'ok' : 'info';
      }
      if (full.length) s += '<br><span class="muted">想一想：两节干电池是 3 V，为什么测得的电源电压小一些？——干电池本身也有电阻，电路中有电流时，电池两端的电压会降低一些，电流越大降得越多（并联两灯时更明显）。这不影响得出规律。</span>';
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
    el._st = st; el._U = Uv; el._record = record; el._inp = inp;
  });
})();
