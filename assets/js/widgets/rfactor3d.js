/* 第16章第3节：3D 探究影响导体电阻大小的因素 rfactor-3d——示教板上的 A 细长铜丝、B 细长镍铬合金丝、C 粗长镍铬合金丝、D 细短镍铬合金丝，
 * 鳄鱼夹接在哪根电阻丝两端，电流表就测出电流；控制变量法选电阻丝；用酒精灯加热灯丝看电阻与温度的关系。
 * 依赖 three.js、OrbitControls、circuit.js、circuit3d.js（PS.el.kit3d） */
(function () {
  'use strict';
  const { h } = PS;
  const EL = PS.el;
  const COLS = [0xe03131, 0xf59f00, 0x1c7ed6, 0x2b8a3e, 0xae3ec9, 0x0c8599, 0x212529];
  /* 长 1 m（短的 0.5 m），细的直径 0.3 mm、粗的直径 0.5 mm；按教材电阻表（铜 0.017、镍铬合金 1.1 Ω·mm²/m）算出电阻 */
  const S_THIN = Math.PI * 0.15 * 0.15, S_THICK = Math.PI * 0.25 * 0.25;
  const WIRES = [
    { k: 'A', n: '细长铜丝', mat: '铜', L: '长', S: '细', R: (0.017 * 1) / S_THIN, len: 1, thick: false, cu: true },
    { k: 'B', n: '细长镍铬合金丝', mat: '镍铬合金', L: '长', S: '细', R: (1.1 * 1) / S_THIN, len: 1, thick: false },
    { k: 'C', n: '粗长镍铬合金丝', mat: '镍铬合金', L: '长', S: '粗', R: (1.1 * 1) / S_THICK, len: 1, thick: true },
    { k: 'D', n: '细短镍铬合金丝', mat: '镍铬合金', L: '短', S: '细', R: (1.1 * 0.5) / S_THIN, len: 0.5, thick: false },
  ];
  const ANS = { mat: 'AB', len: 'BD', area: 'BC' };
  const FIL_R0 = 4;
  PS.register('rfactor-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    if (!EL.kit3d) { el.append(h('div', { class: 'tip tip-warn' }, '需要先加载 circuit3d.js。')); return; }
    const st = { mode: 'wire', w: 'A', on: false, sol: null, net: null, rec: {}, T: 20, fire: false, hist: [], tS: 0, t: 0 };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' }, html: '拖动画面可以换角度观察。电源电压不变，电流表的示数越小，说明接入的电阻丝的电阻越大（<b>转换法</b>）；小灯泡亮度的变化不明显时要看电流表。' })), side));
    const modeSeg = PS.ui.seg([{ value: 'wire', label: '比较四根电阻丝' }, { value: 'heat', label: '加热灯丝' }], 'wire', (v) => { st.mode = v; st.on = false; build(); panels(); });
    const wSeg = PS.ui.seg(WIRES.map((w) => ({ value: w.k, label: w.k + ' ' + w.n })), 'A', (v) => { st.w = v; build(); });
    const swBtn = PS.ui.button('闭合开关', () => { st.on = !st.on; PS.sound.clack(); solve(); }, 'btn btn-primary btn-sm');
    const fireBtn = PS.ui.button('🔥 点燃酒精灯加热', () => { st.fire = !st.fire; fireBtn.innerHTML = st.fire ? '熄灭酒精灯' : '🔥 点燃酒精灯加热'; flame.visible = st.fire; PS.sound.tick(); }, 'btn btn-sm');
    const readBox = h('div', { class: 'el-msg info' });
    const dialBox = h('div', { style: { maxWidth: '240px' } });
    const tbl = h('div');
    const qs = h('div');
    const ana = h('div', { class: 'el-msg info' });
    const pWire = h('div', { class: 'panel' }, h('h4', null, '② 把鳄鱼夹接在哪根电阻丝两端'), wSeg.el);
    const pHeat = h('div', { class: 'panel' }, h('h4', null, '② 加热灯丝'), h('p', { class: 'small', style: { margin: '0 0 6px' } }, '把废灯泡的玻璃打碎，留下灯丝（钨丝），接在两个夹子之间。闭合开关后用酒精灯加热，观察电流表的示数。'), fireBtn);
    const recBtn = PS.ui.button('记录这根电阻丝的电流', record, 'btn btn-primary btn-sm');
    const chartBox = h('div');
    const pData = h('div', { class: 'panel' }, h('h4', null, '④ 数据与分析'), tbl, qs, ana);
    side.append(h('div', { class: 'panel' }, h('h4', null, '① 选择实验'), modeSeg.el), pWire, pHeat,
      h('div', { class: 'panel' }, h('h4', null, '③ 闭合开关，读电流表'), h('div', { class: 'controls' }, swBtn), dialBox, readBox, h('div', { class: 'controls', style: { marginTop: '6px' } }, recBtn), chartBox), pData);
    const DS = PS.stage(dialBox, { ratio: '1 / 0.8', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 300, 240); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 240); EL.dial(ctx, 150, 105, 250, { v: st.on ? amI() : 0, range: 0.6, terms: true, sel: ['-', '0.6'], F }); } });
    const CS = PS.stage(chartBox, { ratio: '300 / 170', draw: drawChart });
    const E = EL.three(view, { cam: [0.0, 0.5, 0.46], target: [0, 0, -0.06], min: 0.2, max: 1.8 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.8), E.Std(0xe9dcc6, { roughness: 0.9 })); desk.position.y = -0.01; E.scene.add(desk);
    const K = EL.kit3d(E);
    // ---------- 示教板 ----------
    const board = new THREE.Group(); board.position.set(0, 0, -0.17); E.scene.add(board);
    const wood = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.27), E.Std(0xc8a26a, { roughness: 0.8 })); wood.position.y = 0.01; board.add(wood);
    const postGeo = new THREE.CylinderGeometry(0.006, 0.007, 0.022, 12), postMat = E.Std(0xadb5bd, { metalness: 0.6, roughness: 0.35 });
    const BT = {};
    const ZS = { A: -0.09, B: -0.03, C: 0.03, D: 0.09 };
    const labTex = (t) => E.tex(64, 64, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1b2333'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 32, 34); });
    WIRES.forEach((w) => {
      const z = ZS[w.k], x0 = -0.2, x1 = x0 + 0.4 * w.len;
      [x0, x1].forEach((x, i) => { const p = new THREE.Mesh(postGeo, postMat); p.position.set(x, 0.031, z); board.add(p); BT[w.k + (i + 1)] = new THREE.Vector3(x, 0.042, z); });
      const r = w.thick ? 0.0026 : 0.0013;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 10), E.Std(w.cu ? 0xd9822b : 0xa0a8b0, { metalness: 0.75, roughness: 0.3 }));
      m.rotation.z = Math.PI / 2; m.position.set((x0 + x1) / 2, 0.036, z); board.add(m);
      const lb = new THREE.Sprite(new THREE.SpriteMaterial({ map: labTex(w.k) })); lb.scale.set(0.022, 0.022, 1); lb.position.set(-0.228, 0.045, z); board.add(lb);
    });
    // 灯丝支架（加热实验用）
    const fil = new THREE.Group(); fil.position.set(0, 0, -0.17); E.scene.add(fil);
    const fbase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.06), E.Std(0x495057, { roughness: 0.7 })); fbase.position.y = 0.006; fil.add(fbase);
    [-0.05, 0.05].forEach((x, i) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 8), postMat); r.position.set(x, 0.07, 0); fil.add(r); BT['F' + (i + 1)] = new THREE.Vector3(x, 0.132, 0); });
    const pts = []; for (let i = 0; i <= 160; i++) { const t = i / 160, a = t * Math.PI * 2 * 14; pts.push(new THREE.Vector3(-0.05 + 0.1 * t, 0.115 + Math.sin(a) * 0.006, Math.cos(a) * 0.006)); }
    const filMat = new THREE.MeshStandardMaterial({ color: 0x868e96, metalness: 0.7, roughness: 0.3, emissive: 0xff4500, emissiveIntensity: 0 });
    fil.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 320, 0.0011, 5, false), filMat));
    const lampG = new THREE.Group(); lampG.position.set(0, 0, 0); fil.add(lampG);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.045, 20), E.Std(0xd0ebff, { transparent: true, opacity: 0.6, roughness: 0.1 })); bottle.position.y = 0.0345; lampG.add(bottle);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.012, 8), E.Std(0xffffff)); wick.position.y = 0.063; lampG.add(wick);
    const flameTex = E.tex(64, 128, (g) => { const r = g.createRadialGradient(32, 90, 2, 32, 80, 50); r.addColorStop(0, 'rgba(255,255,220,1)'); r.addColorStop(0.3, 'rgba(255,190,60,.95)'); r.addColorStop(0.7, 'rgba(255,120,30,.6)'); r.addColorStop(1, 'rgba(255,90,0,0)'); g.fillStyle = r; g.beginPath(); g.ellipse(32, 72, 22, 54, 0, 0, Math.PI * 2); g.fill(); });
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false })); flame.scale.set(0.03, 0.06, 1); flame.position.y = 0.095; flame.visible = false; lampG.add(flame);
    K.comps.board = { id: 'board', kind: 'board', g: board, T: BT };
    K.comps.fil = { id: 'fil', kind: 'board', g: fil, T: BT };
    const clipGeo = new THREE.BoxGeometry(0.018, 0.008, 0.008), clips = [0xe03131, 0x212529].map((c) => { const m = new THREE.Mesh(clipGeo, E.Std(c, { roughness: 0.5 })); E.scene.add(m); return m; });
    const LB = {};
    function label(id, t) { if (!LB[id]) LB[id] = E.label(t); LB[id].innerHTML = t; LB[id].dataset.hide = ''; }
    function build() {
      ['E', 'S', 'A', 'L'].forEach((id) => K.remove(id)); K.clearWires();
      Object.values(LB).forEach((l) => { l.dataset.hide = '1'; });
      board.visible = st.mode === 'wire'; fil.visible = st.mode === 'heat';
      K.battery('E', -0.1, 0.21); K.sw('S', 0.16, 0.21); K.bulb('L', -0.3, 0.05, Math.PI / 2); K.ammeter('A', 0.3, 0.06, -Math.PI / 2);
      const t1 = st.mode === 'wire' ? 'board.' + st.w + '1' : 'fil.F1', t2 = st.mode === 'wire' ? 'board.' + st.w + '2' : 'fil.F2';
      const end = K.chain('E.+', ['S', 'A'], null, COLS);
      K.wire(end, t2, COLS[2]);
      K.chain(t1, ['L'], 'E.-', [COLS[3], COLS[6]]);
      [t2, t1].forEach((k, i) => { clips[i].position.copy(K.world(k)); clips[i].position.y += 0.004; });
      label('E', '电源'); label('S', '开关'); label('L', '小灯泡'); label('A', '电流表');
      solve();
    }
    const Rfil = () => FIL_R0 * (1 + 0.0045 * (st.T - 20));
    function amI() { return st.sol ? Math.max(0, st.sol.I.A || 0) : 0; }
    function solve() {
      K.comps.S.setOn(st.on);
      const extra = st.mode === 'wire' ? WIRES.map((w) => ({ id: 'R' + w.k, t: 'res', a: 'board.' + w.k + '1', b: 'board.' + w.k + '2', R: w.R })) : [{ id: 'RF', t: 'res', a: 'fil.F1', b: 'fil.F2', R: Rfil() }];
      st.net = K.net({ E: 3, r: 0.5, on: { S: st.on }, R: { L: 8.3 }, Pn: { L: 0.75 }, extra });
      st.sol = EL.solve(st.net);
      K.comps.L.setLit(Math.max(0, (st.sol.P.L || 0) / 0.75));
      K.comps.A.setValue(st.on ? amI() : 0, 0.6);
      swBtn.innerHTML = st.on ? '断开开关' : '闭合开关';
      const rd = PS.fmt(EL.reading(amI(), 0.6), 2);
      if (!st.on) { readBox.className = 'el-msg info'; readBox.innerHTML = '闭合开关，看电流表的示数。'; }
      else if (st.mode === 'wire') { const w = WIRES.find((x) => x.k === st.w); readBox.className = 'el-msg ok'; readBox.innerHTML = '接入 ' + w.k + '（' + w.n + '）：电流表示数 <b>' + rd + ' A</b>。'; }
      else { readBox.className = 'el-msg ok'; readBox.innerHTML = '灯丝温度约 ' + Math.round(st.T) + ' ℃，电流表示数 <b>' + rd + ' A</b>。' + (st.T > 150 ? '温度升高，电流变小——灯丝的电阻变大了。' : ''); }
      DS.render();
    }
    function record() {
      if (st.mode !== 'wire') return;
      if (!st.on) { readBox.className = 'el-msg bad'; readBox.innerHTML = '先闭合开关，再读数。'; return; }
      st.rec[st.w] = EL.reading(amI(), 0.6); PS.sound.good();
      const nx = WIRES.find((w) => st.rec[w.k] == null);
      readBox.innerHTML += nx ? '已记录。再把夹子接到 ' + nx.k + ' 的两端。' : '四根电阻丝都测完了，下面来分析。';
      table();
    }
    function table() {
      tbl.innerHTML = '<table class="el-tbl"><tr><th>电阻丝</th><th>材料</th><th>长度</th><th>粗细</th><th>I/A</th></tr>' + WIRES.map((w) => '<tr><td>' + w.k + '</td><td>' + w.mat + '</td><td>' + w.L + '</td><td>' + w.S + '</td><td>' + (st.rec[w.k] == null ? '' : PS.fmt(st.rec[w.k], 2)) + '</td></tr>').join('') + '</table>';
      check();
    }
    /* 控制变量：选哪两根电阻丝 */
    const QS = [['mat', '研究电阻与<b>材料</b>的关系'], ['len', '研究电阻与<b>长度</b>的关系'], ['area', '研究电阻与<b>横截面积</b>的关系']];
    const sels = {};
    QS.forEach(([k, t]) => {
      const mk = () => { const s = h('select', { class: 'cb-sel' }, h('option', { value: '' }, '?'), WIRES.map((w) => h('option', { value: w.k }, w.k))); s.addEventListener('change', check); return s; };
      sels[k] = [mk(), mk()];
      qs.append(h('div', { class: 'small', style: { margin: '6px 0' } }, h('span', { html: t + '，应选 ' }), sels[k][0], ' 和 ', sels[k][1]));
    });
    function check() {
      const done = WIRES.every((w) => st.rec[w.k] != null);
      const lines = [];
      let all = true;
      QS.forEach(([k]) => {
        const v = [sels[k][0].value, sels[k][1].value].sort().join('');
        if (v.length < 2) { all = false; return; }
        const ok = v === ANS[k];
        if (!ok) all = false;
        const [p, q] = ANS[k].split(''), Ip = st.rec[p], Iq = st.rec[q];
        const res = { mat: '长度、横截面积相同时，铜丝的电流大、电阻小，镍铬合金丝的电阻大——导体的电阻与<b>材料</b>有关', len: '材料、横截面积相同时，长的 B 电流小、电阻大——导体越<b>长</b>，电阻越大', area: '材料、长度相同时，粗的 C 电流大、电阻小——横截面积越<b>大</b>，电阻越小' }[k];
        lines.push(ok ? '✔ ' + v[0] + ' 和 ' + v[1] + '：只有' + { mat: '材料', len: '长度', area: '横截面积' }[k] + '不同。' + (done ? res + '（' + p + '：' + PS.fmt(Ip, 2) + ' A，' + q + '：' + PS.fmt(Iq, 2) + ' A）。' : '') : '✘ ' + v[0] + ' 和 ' + v[1] + ' 不行：要控制其他因素相同，只让' + { mat: '材料', len: '长度', area: '横截面积' }[k] + '不同（控制变量法）。');
      });
      ana.className = 'el-msg ' + (all && done ? 'ok' : lines.some((x) => x[0] === '✘') ? 'bad' : 'info');
      ana.innerHTML = (lines.length ? lines.join('<br>') : '先测出四根电阻丝的电流，再在上面选出每次实验要比较的两根电阻丝。') + (all && done ? '<br><b>结论：导体的电阻是导体本身的一种性质，它的大小决定于导体的材料、长度和横截面积，还与温度有关。</b>' : '');
    }
    function panels() {
      pWire.style.display = st.mode === 'wire' ? '' : 'none'; pData.style.display = st.mode === 'wire' ? '' : 'none'; recBtn.style.display = st.mode === 'wire' ? '' : 'none';
      pHeat.style.display = st.mode === 'heat' ? '' : 'none'; chartBox.style.display = st.mode === 'heat' ? '' : 'none';
      if (st.mode === 'heat') { st.hist = []; st.tS = 0; CS.render(); }
    }
    function drawChart(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 300, 170);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 170);
      const x0 = 40, y0 = 14, W = 245, H = 120, X = (t) => x0 + (t / 60) * W, Y = (i) => y0 + H - (i / 0.3) * H;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + H); ctx.lineTo(x0 + W, y0 + H); ctx.stroke();
      [0, 0.1, 0.2, 0.3].forEach((v) => PS.draw.text(ctx, PS.fmt(v, 1), x0 - 4, Y(v) + 4, { size: F(10), align: 'right', color: '#868e96' }));
      PS.draw.text(ctx, 'I/A', x0 + 4, y0 + 8, { size: F(10), weight: 700, color: '#495057' });
      PS.draw.text(ctx, 't/s', x0 + W, y0 + H + 16, { size: F(10), align: 'right', color: '#495057' });
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.5; ctx.beginPath();
      st.hist.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke();
    }
    const v3 = new THREE.Vector3();
    let acc = 0;
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.mode === 'heat') {
        const target = st.fire ? 600 : 20, tau = st.fire ? 7 : 10;
        const T0 = st.T;
        st.T += (target - st.T) * Math.min(1, dt / tau);
        filMat.emissiveIntensity = PS.clamp((st.T - 420) / 300, 0, 1);
        if (Math.abs(st.T - T0) > 0.05) { acc += dt; if (acc > 0.25) { acc = 0; solve(); } }
        if (st.on) { st.tS += dt; if (!st.hist.length || st.tS - st.hist[st.hist.length - 1][0] > 0.5) { if (st.tS > 60) { st.hist = []; st.tS = 0; } st.hist.push([st.tS, amI()]); CS.render(); } }
        if (st.fire) flame.scale.set(0.03 + Math.sin(st.t * 23) * 0.002, 0.06 + Math.sin(st.t * 17) * 0.004, 1);
      }
      K.update(dt, st.sol);
      E.render(dt);
      Object.keys(LB).forEach((id) => { const c = K.comps[id]; if (!c || LB[id].dataset.hide) { LB[id].style.display = 'none'; return; } c.g.updateMatrixWorld(); E.place(LB[id], c.g.localToWorld(v3.copy(c.top || new THREE.Vector3(0, 0.07, 0)))); });
    }, view);
    build(); table(); panels();
    loop.start();
    el._st = st; el._record = record; el._sels = sels; el._amI = amI;
  });
})();
