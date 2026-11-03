/* 第13章第3节：3D 比较不同物质的吸热能力——两个规格相同的电加热器分别给质量相等的水和食用油（或煤油）加热；方案一：加热相同时间比较升高的温度，方案二：升高相同温度比较加热时间；温度计读数、自动记录、温度—时间图像、分析论证。依赖 three.js、OrbitControls、heat.js、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const TH = PS.th, TC = PS.TC, D = PS.draw;
  const P = 60, KLOSS = 0.25, M = 0.2, TR = 20, SPEED = 20; // 加热功率 W、散热系数 W/℃、质量 kg、室温、时间加快的倍数
  const LIQ = { water: { n: '水', c: 4200, rho: 1.0, col: 0x74c0fc, op: 0.45 }, oil: { n: '食用油', c: 1970, rho: 0.9, col: 0xfcc419, op: 0.62 }, kero: { n: '煤油', c: 2100, rho: 0.8, col: 0xfff3bf, op: 0.5 } };
  const BX = [-0.11, 0.11], RIN = 0.035, TMIN = -10, TMAX = 110, TLEN = 0.2, TBOT = 0.034; // 两只烧杯的 x；内半径；温度计量程与长度

  PS.register('heatcap-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { b: 'oil', plan: 'time', on: false, t: 0, T: [TR, TR], off: [false, false], tOff: [0, 0], rows: [], hist: [[0, TR, TR]] };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。两个电加热器的规格相同（相同时间内放出的热量相同）。时间加快了 20 倍。')), side));
    const bSeg = PS.ui.seg([{ value: 'oil', label: '食用油' }, { value: 'kero', label: '煤油' }], st.b, (v) => { if (st.t > 0) { msg.className = 'th-msg bad'; msg.innerHTML = '加热已经开始了，先点“重来”再更换液体。'; bSeg.set(st.b, true); return; } st.b = v; build(); reset(); });
    const pSeg = PS.ui.seg([{ value: 'time', label: '加热相同时间，比较升高的温度' }, { value: 'temp', label: '升高相同温度，比较加热时间' }], st.plan, (v) => { st.plan = v; reset(); });
    pSeg.el.style.flexWrap = 'wrap';
    const goB = PS.ui.button('▶ 通电加热', toggle, 'btn btn-primary btn-sm');
    const rd = { t: PS.ui.readout('加热时间', '0.0 min'), a: PS.ui.readout('水的温度', '20 ℃'), b: PS.ui.readout('食用油的温度', '20 ℃') };
    const msg = h('div', { class: 'th-msg info' });
    const thead = h('thead'), tbody = h('tbody'), chartBox = h('div'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 器材：水和'), bSeg.el, h('div', { class: 'small muted', style: { marginTop: '6px' } }, '用天平称取质量相等（都是 200 g）的两种液体，初温相同。')),
      h('div', { class: 'panel' }, h('h4', null, '② 选择实验方案'), pSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 加热，观察温度计'), h('div', { class: 'row' }, goB, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), h('div', { class: 'th-read' }, rd.t.el, rd.a.el, rd.b.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '④ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, thead, tbody)), chartBox),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑤ 分析论证' : '⑤ 你发现了什么？'), ana));
    const B = () => LIQ[st.b];
    const L = () => [LIQ.water, B()];

    // ---------- 场景 ----------
    const E = TH.three(view, { cam: [0.05, 0.27, 0.62], target: [0, 0.11, 0], min: 0.15, max: 1.6 });
    const { scene, Std } = E;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.6), Std(0xe9dcc6)); desk.position.set(0, -0.01, 0); scene.add(desk);
    const glassM = Std(0xcfe3ff, { transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const metal = Std(0xadb5bd, { metalness: 0.8, roughness: 0.3 });
    const bprof = [[0, 0.002], [RIN + 0.002, 0.002], [RIN + 0.002, 0.1], [RIN + 0.006, 0.104]].map(([x, y]) => new THREE.Vector2(x, y));
    const parts = BX.map((x, i) => {
      const g = new THREE.Group(); g.position.x = x; scene.add(g);
      const beaker = new THREE.Mesh(new THREE.LatheGeometry(bprof, 40), glassM); beaker.renderOrder = 5; g.add(beaker);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(RIN, RIN, 1, 32), Std(0xffffff, { transparent: true, opacity: 0.5, depthWrite: false })); liq.renderOrder = 2; g.add(liq);
      // 电加热器：螺旋形的电热丝 + 引线 + 手柄
      const pts = []; for (let k = 0; k <= 160; k++) { const a = (k / 160) * Math.PI * 2 * 4; pts.push(new THREE.Vector3(Math.cos(a) * 0.017, 0.006 + (k / 160) * 0.018, Math.sin(a) * 0.017)); }
      const coilM = Std(0x868e96, { metalness: 0.6, roughness: 0.35, emissive: 0xff4500, emissiveIntensity: 0 });
      const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.0018, 6), coilM); coil.position.x = -0.006; g.add(coil);
      const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.12, 6), coilM); lead.position.set(0.011, 0.084, 0); g.add(lead);
      const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 12), Std(0x343a40)); hd.position.set(0.012, 0.165, 0); g.add(hd);
      const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.012, 0.19, 0), new THREE.Vector3(0.02, 0.23, -0.02), new THREE.Vector3(0.06, 0.2, -0.12), new THREE.Vector3(-x * 0.6, 0.02, -0.16)]), 30, 0.0025, 6), Std(0x212529)); g.add(cord);
      // 温度计（铁架台夹着）
      const tg = new THREE.Group(); tg.position.set(-0.018, TBOT, 0.016); g.add(tg);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, TLEN, 12), Std(0xf1f8ff, { transparent: true, opacity: 0.55, depthWrite: false })); tube.position.y = TLEN / 2; tube.renderOrder = 6; tg.add(tube);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 10), Std(0xe03131)); tg.add(bulb);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 1, 8), Std(0xe03131)); tg.add(col);
      const ticks = E.tex(32, 512, (c, w, hh) => { c.fillStyle = 'rgba(255,255,255,0)'; c.clearRect(0, 0, w, hh); c.strokeStyle = '#343a40'; for (let T = TMIN; T <= TMAX; T += 2) { const y = hh - ((T - TMIN) / (TMAX - TMIN)) * (hh - 16) - 8; c.lineWidth = T % 10 ? 1 : 2.5; c.beginPath(); c.moveTo(0, y); c.lineTo(T % 10 ? 10 : 18, y); c.stroke(); } });
      const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.006, TLEN * 0.92), new THREE.MeshBasicMaterial({ map: ticks, transparent: true, depthWrite: false })); scale.position.set(0.004, TLEN * 0.5, 0.0036); tg.add(scale);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 10), metal); rod.position.set(-0.07, 0.16, -0.05); g.add(rod);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.006, 0.006), metal); arm.position.set(-0.044, 0.19, -0.022); arm.rotation.y = -0.6; g.add(arm);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), Std(0x495057)); clamp.position.set(-0.018, 0.19, 0.016); g.add(clamp);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.1), Std(0x495057)); foot.position.set(-0.07, 0.004, -0.05); g.add(foot);
      return { g, liq, coilM, col };
    });
    // 电源开关盒
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.06), Std(0xf8f9fa)); box.position.set(0, 0.02, -0.17); scene.add(box);
    const lampM = Std(0x2f9e44, { emissive: 0x2f9e44, emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 10), lampM); lamp.position.set(0, 0.044, -0.17); scene.add(lamp);
    const LB = { a: E.label('', 'ref'), b: E.label('', 'ref'), na: E.label(''), nb: E.label(''), heat: E.label('电加热器') };

    function build() {
      L().forEach((q, i) => {
        const p = parts[i], hgt = (M / (q.rho * 1000)) / (Math.PI * RIN * RIN);
        p.liq.material.color.setHex(q.col); p.liq.material.opacity = q.op;
        p.liq.scale.y = hgt; p.liq.position.y = 0.002 + hgt / 2; p.hgt = hgt;
      });
      LB.na.innerHTML = '水 200 g'; LB.nb.innerHTML = B().n + ' 200 g';
      rd.b.el.querySelector('span').innerHTML = B().n + '的温度';
    }
    function reset() {
      st.on = false; st.t = 0; st.T = [TR, TR]; st.off = [false, false]; st.tOff = [0, 0]; st.rows = []; st.hist = [[0, TR, TR]]; st.next = 1;
      goB.innerHTML = '▶ 通电加热';
      table(); tell();
    }
    function toggle() {
      if (st.plan === 'time' && st.t >= 6 - 1e-6) { msg.className = 'th-msg bad'; msg.innerHTML = '已经加热 6 min 了。点“重来”可以重新做。'; return; }
      if (st.plan === 'temp' && st.off[0] && st.off[1]) { msg.className = 'th-msg bad'; msg.innerHTML = '两种液体都已经升高到 50 ℃ 了。点“重来”可以重新做。'; return; }
      st.on = !st.on; goB.innerHTML = st.on ? '⏸ 断开电源' : '▶ 通电加热'; PS.sound.tick(); tell();
    }
    const R = (T) => Math.round(T);
    function tell() {
      rd.t.set(PS.fmt(st.t, 1) + ' min'); rd.a.set(PS.fmtT(st.T[0], 1)); rd.b.set(PS.fmtT(st.T[1], 1));
      let s, cls = 'info';
      if (st.plan === 'time') {
        if (st.t === 0) s = '方案一：用两个相同的电加热器同时加热，<b>加热时间相同，两种液体吸收的热量就相同</b>。每隔 1 min 自动记录一次温度。';
        else if (st.t < 6) s = st.on ? '加热中……比较两只温度计示数升高的快慢。' : '已断电。点“通电加热”继续。';
        else { s = '加热 6 min：水升高了 ' + R(st.T[0] - TR) + ' ℃，' + B().n + '升高了 ' + R(st.T[1] - TR) + ' ℃。吸收相同的热量，<b>' + B().n + '的温度升高得多</b>。'; cls = 'ok'; }
      } else {
        if (st.t === 0) s = '方案二：把两种液体都从 20 ℃ 加热到 50 ℃（升高 30 ℃），哪一种需要加热的时间长？液体到达 50 ℃ 时自动断开它的电加热器。';
        else if (!(st.off[0] && st.off[1])) s = st.on ? '加热中……' + (st.off[1] ? B().n + '已经到 50 ℃ 了，水还没有。' : '') : '已断电。点“通电加热”继续。';
        else { s = '升高相同的温度（30 ℃），水要加热 ' + PS.fmt(st.tOff[0], 1) + ' min，' + B().n + '只要 ' + PS.fmt(st.tOff[1], 1) + ' min：<b>水吸收的热量多</b>。'; cls = 'ok'; }
      }
      msg.className = 'th-msg ' + cls; msg.innerHTML = s;
    }
    function table() {
      thead.innerHTML = ''; tbody.innerHTML = '';
      if (st.plan === 'time') {
        thead.append(h('tr', null, ['加热时间/min', '水的温度/℃', B().n + '的温度/℃'].map((t) => h('th', null, t))));
        [[0, TR, TR]].concat(st.rows).forEach((r) => tbody.append(h('tr', null, h('td', null, String(r[0])), h('td', null, String(R(r[1]))), h('td', null, String(R(r[2]))))));
      } else {
        thead.append(h('tr', null, ['物质', '质量/g', '初温/℃', '末温/℃', '加热时间/min'].map((t) => h('th', null, t))));
        [0, 1].forEach((i) => tbody.append(h('tr', null, h('td', null, L()[i].n), h('td', null, '200'), h('td', null, String(TR)), h('td', null, st.off[i] ? '50' : '—'), h('td', null, st.off[i] ? h('b', null, PS.fmt(st.tOff[i], 1)) : '—'))));
      }
      chart.render(); analyse();
    }
    function analyse() {
      const nb = B().n;
      const done = st.plan === 'time' ? st.rows.length >= 3 : st.off[0] && st.off[1];
      let s = '';
      if (!done) s = '<div class="muted">' + (st.plan === 'time' ? '至少记录 3 组数据后再分析。' : '两种液体都加热到 50 ℃ 后再分析。') + '</div>';
      else {
        s = st.plan === 'time'
          ? '<div>✔ 质量相同的水和' + nb + '，加热相同的时间（吸收相同的热量），<b>' + nb + '的温度升高得多，水的温度升高得少</b>。</div>'
          : '<div>✔ 质量相同的水和' + nb + '，升高相同的温度，<b>水需要加热的时间长</b>，即水吸收的热量多。</div>';
        s += '<div class="tip tip-good" style="margin:8px 0 0"><b>结论：</b>质量相同的不同物质，升高相同的温度，吸收的热量不同——<b>水的吸热能力比' + nb + '强</b>。物理学中用<b>比热容</b>来表示物质的这种性质。</div>';
      }
      s += '<div class="muted" style="margin-top:6px">研究方法：<b>控制变量法</b>（质量、初温相同，用相同的加热器）；<b>转换法</b>（用加热时间的长短表示吸收热量的多少）。注意两种液体质量相同，体积并不相同（' + nb + '的液面更高）。</div>';
      ana.innerHTML = s;
    }
    // 温度—时间图像（画在侧栏里）
    const chart = PS.stage(chartBox, { ratio: '4 / 3', draw: (ctx, w, hh) => {
      const F = PS.virtual(ctx, w, hh, 400, 300);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 300);
      const ch = PS.tchart(ctx, { x: 50, y: 30, w: 320, h: 220 }, { t0: 0, t1: st.plan === 'time' ? 6 : 8, T0: 0, T1: st.plan === 'time' ? 100 : 60, tStep: 1, TStep: st.plan === 'time' ? 20 : 10, F, fs: F(12) });
      ch.line(st.hist.map((p) => [p[0], p[1]]), '#1c7ed6', 2.5);
      ch.line(st.hist.map((p) => [p[0], p[2]]), '#e8590c', 2.5);
      if (st.plan === 'time') { ch.dots(st.rows.map((r) => [r[0], r[1]]), '#1c7ed6', 4); ch.dots(st.rows.map((r) => [r[0], r[2]]), '#e8590c', 4); }
      else ch.hline(50, '#868e96', '50 ℃');
      D.text(ctx, '— 水', 200, 22, { size: F(12), weight: 800, color: '#1c7ed6' });
      D.text(ctx, '— ' + B().n, 270, 22, { size: F(12), weight: 800, color: '#e8590c' });
    } });

    // ---------- 动画 ----------
    let acc = 0;
    const loop = PS.loop((dt) => {
      if (st.on) {
        const dm = (dt * SPEED) / 60; // 经过的模拟时间（min）
        st.t += dm;
        [0, 1].forEach((i) => {
          if (st.off[i]) { st.T[i] -= (KLOSS * (st.T[i] - TR) * dm * 60) / (L()[i].c * M); return; }
          st.T[i] += ((P - KLOSS * (st.T[i] - TR)) * dm * 60) / (L()[i].c * M);
          if (st.plan === 'temp' && st.T[i] >= 50) { st.T[i] = 50; st.off[i] = true; st.tOff[i] = PS.round(st.t, 1); PS.sound.ping(); table(); }
        });
        if (st.plan === 'time' && st.t >= st.next - 1e-9) {
          const k = st.next; st.next++;
          st.rows.push([k, st.T[0], st.T[1]]); PS.sound.tick(); table();
          if (k >= 6) { st.t = 6; st.on = false; goB.innerHTML = '▶ 通电加热'; }
        }
        if (st.plan === 'temp' && st.off[0] && st.off[1]) { st.on = false; goB.innerHTML = '▶ 通电加热'; }
        if (st.t - st.hist[st.hist.length - 1][0] > 0.05) st.hist.push([st.t, st.T[0], st.T[1]]);
        acc += dt; if (acc > 0.2) { acc = 0; tell(); chart.render(); }
        if (!st.on) { tell(); chart.render(); }
      }
      const glow = (i) => (st.on && !st.off[i] ? 0.9 + 0.1 * Math.sin(performance.now() / 120) : 0);
      parts.forEach((p, i) => {
        p.coilM.emissiveIntensity = glow(i);
        const y1 = ((st.T[i] - TMIN) / (TMAX - TMIN)) * TLEN * 0.92 + TLEN * 0.04;
        p.col.scale.y = y1; p.col.position.y = y1 / 2;
      });
      lampM.emissiveIntensity = st.on ? 1 : 0;
      E.render(dt);
      [0, 1].forEach((i) => { const e = i ? LB.b : LB.a; e.innerHTML = PS.fmtT(st.T[i], 0); E.place(e, new THREE.Vector3(BX[i] - 0.018, TBOT + TLEN + 0.016, 0.016)); });
      E.place(LB.na, new THREE.Vector3(BX[0], -0.012, 0.06)); E.place(LB.nb, new THREE.Vector3(BX[1], -0.012, 0.06));
      E.place(LB.heat, new THREE.Vector3(BX[1] + 0.05, 0.17, 0));
    }, view);
    el._st = st;
    build(); reset();
    loop.start();
  });
})();
