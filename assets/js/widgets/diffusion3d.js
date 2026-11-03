/* 第13章第1节：3D 气体的扩散——装二氧化氮（红棕色、密度比空气大）的集气瓶在下、装空气的集气瓶倒扣在上，抽掉玻璃板后两种气体逐渐混合；可以对调位置、提高温度；分子示意、上瓶中二氧化氮的比例图像。依赖 three.js、OrbitControls、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const TH = PS.th, D = PS.draw;
  const R = 0.05, Y0 = 0.006, YM = 0.205, Y1 = 0.404, NS = 24, N = 260; // 内半径、瓶底、两瓶口相接处、上瓶底；每个瓶的分层数、每种分子的个数
  const D0 = 5e-4; // 等效扩散系数（m²/s，动画加快）

  PS.register('diffusion-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { rev: false, hot: false, plate: 1, pull: false, t: 0, run: false, mols: true, hist: [[0, 0]] };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 12' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。小点表示分子（示意，红棕色为二氧化氮，浅蓝色为空气）；真实的扩散要几分钟，动画加快了。')), side));
    const pSeg = PS.ui.seg([{ value: false, label: '二氧化氮在下' }, { value: true, label: '二氧化氮在上' }], st.rev, (v) => { st.rev = v; reset(); });
    const tSeg = PS.ui.seg([{ value: false, label: '室温' }, { value: true, label: '温度较高' }], st.hot, (v) => { st.hot = v; tell(); });
    const pullB = PS.ui.button('抽掉玻璃板', () => { if (st.plate >= 1 && !st.pull) { st.pull = true; st.run = true; PS.sound.tick(); tell(); } }, 'btn btn-primary btn-sm');
    const mT = PS.ui.toggle('显示分子', st.mols, (v) => { st.mols = v; ptsA.visible = ptsB.visible = v; });
    const rd = { t: PS.ui.readout('经过的时间', '0 s'), f: PS.ui.readout('上面瓶中的二氧化氮', '0%') };
    const msg = h('div', { class: 'th-msg info' });
    const chartBox = h('div'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 两个瓶子怎样放？'), pSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 温度'), tSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 抽掉玻璃板，观察'), h('div', { class: 'row' }, pullB, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm'), mT.el), h('div', { class: 'th-read' }, rd.t.el, rd.f.el), msg),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '④ 分析论证' : '④ 你发现了什么？'), chartBox, ana));

    // ---------- 场景 ----------
    const E = TH.three(view, { cam: [0.32, 0.36, 0.62], target: [0, 0.2, 0], min: 0.2, max: 2 });
    const { scene, Std } = E;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 0.6), Std(0xe9dcc6)); desk.position.y = -0.01; scene.add(desk);
    const glassM = Std(0xcfe3ff, { transparent: true, opacity: 0.22, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const jarProf = [[0, 0], [R + 0.004, 0], [R + 0.004, 0.19], [R + 0.012, 0.196], [R + 0.012, 0.2], [R, 0.2]].map(([x, y]) => new THREE.Vector2(x, y));
    const lower = new THREE.Mesh(new THREE.LatheGeometry(jarProf, 40), glassM); lower.renderOrder = 5; scene.add(lower);
    const upper = new THREE.Mesh(new THREE.LatheGeometry(jarProf, 40), glassM); upper.renderOrder = 5; upper.rotation.x = Math.PI; upper.position.y = 0.41; scene.add(upper);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.004, 0.15), Std(0xd0ebff, { transparent: true, opacity: 0.45, depthWrite: false })); plate.position.y = YM; plate.renderOrder = 6; scene.add(plate);
    // 气体的颜色：分层的圆柱
    const sliceH = (YM - Y0) / NS, slices = [];
    for (let i = 0; i < NS * 2; i++) {
      const y = i < NS ? Y0 + (i + 0.5) * sliceH : YM + 0.004 + (i - NS + 0.5) * ((Y1 - YM - 0.004) / NS);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.001, R - 0.001, i < NS ? sliceH : (Y1 - YM - 0.004) / NS, 32, 1, false), new THREE.MeshBasicMaterial({ color: 0x9c4a1a, transparent: true, opacity: 0, depthWrite: false }));
      m.position.y = y; m.renderOrder = 2; scene.add(m); slices.push({ m, c: 0 });
    }
    // 分子
    const dot = E.tex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const mk = (col, size) => { const g = new THREE.BufferGeometry(), a = new Float32Array(N * 3); g.setAttribute('position', new THREE.BufferAttribute(a, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ size, map: dot, transparent: true, depthWrite: false, color: col })); p.renderOrder = 4; scene.add(p); return { g, a, p }; };
    const A = mk(0x8f3b12, 0.009), B = mk(0x74c0fc, 0.007);
    const ptsA = A.p, ptsB = B.p;
    const PA = [], PB = [];
    const LB = { up: E.label(''), dn: E.label(''), plate: E.label('玻璃板') };

    function seed(arr, top) {
      arr.length = 0;
      for (let i = 0; i < N; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (R - 0.004); arr.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: top ? YM + 0.006 + Math.random() * (Y1 - YM - 0.01) : Y0 + 0.003 + Math.random() * (YM - Y0 - 0.008) }); }
    }
    function reset() {
      st.plate = 1; st.pull = false; st.t = 0; st.run = false; st.hist = [[0, 0]];
      seed(PA, st.rev); seed(PB, !st.rev);
      slices.forEach((s, i) => (s.c = (i < NS) !== st.rev ? 1 : 0));
      LB.dn.innerHTML = st.rev ? '空气' : '二氧化氮'; LB.up.innerHTML = st.rev ? '二氧化氮' : '空气';
      tell(); chart.render();
    }
    const upFrac = () => PA.filter((p) => p.y > YM).length / N;
    function tell() {
      const f = upFrac();
      rd.t.set(PS.fmt(st.t, 0) + ' s'); rd.f.set(PS.fmt(f * 100, 0) + '%');
      let s, cls = 'info';
      if (!st.pull) s = st.rev ? '把装二氧化氮的瓶子放在<b>上面</b>。二氧化氮的密度比空气大，抽掉玻璃板后会怎样？' : '下面的瓶子装着红棕色的<b>二氧化氮</b>（密度比空气大），上面倒扣的瓶子装着<b>空气</b>，中间用玻璃板隔开。抽掉玻璃板，观察两个瓶中颜色的变化。';
      else if (st.rev) { s = '二氧化氮在上面时，由于<b>重力</b>的作用，它很快沉到下面，两瓶气体很快就混合了——这样就分不清是重力的作用还是分子运动的结果，<b>不能说明分子在运动</b>。'; cls = 'bad'; }
      else if (f < 0.12) s = '密度大的二氧化氮在下面，却慢慢“跑”到了上面的瓶子里……';
      else if (f < 0.4) s = '上面瓶子里的气体也逐渐变成了红棕色，下面瓶子里的颜色变浅了……';
      else { s = '上面瓶子里的气体也变成了红棕色，最后两个瓶子中气体的颜色基本相同：两种气体彼此进入了对方——这就是<b>扩散</b>。说明<b>气体分子在不停地做无规则运动</b>。' + (st.hot ? '<br>温度较高时，扩散得更快。' : ''); cls = 'ok'; }
      msg.className = 'th-msg ' + cls; msg.innerHTML = s;
      const done = st.pull && !st.rev && f > 0.3;
      ana.innerHTML = (done ? '<div class="tip tip-good" style="margin:8px 0 0">不同的物质在互相接触时彼此进入对方的现象叫做<b>扩散</b>。扩散现象说明：①分子在不停地做无规则运动；②分子之间有间隙。</div>' : '<div class="muted" style="margin-top:6px">抽掉玻璃板后，看上面瓶中二氧化氮的比例怎样变化。</div>')
        + '<div class="muted" style="margin-top:6px">密度大的二氧化氮要放在<b>下面</b>，排除重力的影响。这是用看得见的现象认识看不见的分子运动（转换法）。</div>';
    }
    const chart = PS.stage(chartBox, { ratio: '4 / 3', draw: (ctx, w, hh) => {
      const F = PS.virtual(ctx, w, hh, 400, 300);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 300);
      const ch = PS.tchart(ctx, { x: 55, y: 30, w: 315, h: 215 }, { t0: 0, t1: 60, T0: 0, T1: 100, tStep: 10, TStep: 20, F, fs: F(12), xl: '时间/s', yl: '上瓶中二氧化氮/%' });
      ch.hline(50, '#868e96', '均匀时 50%');
      ch.line(st.hist.map((p) => [p[0], p[1] * 100]), '#9c4a1a', 2.5);
    } });

    let acc = 0;
    const loop = PS.loop((dt) => {
      if (st.pull && st.plate > 0) { st.plate = Math.max(0, st.plate - dt / 1.2); }
      if (st.run && st.t < 60) {
        st.t += dt;
        const Dm = D0 * (st.hot ? 2.6 : 1) * (st.rev && st.t < 12 ? 7 : 1);
        const s = Math.sqrt(2 * Dm * dt), open = st.plate <= 0.35;
        const move = (arr, heavy) => arr.forEach((p) => {
          const oy = p.y;
          p.x += PS.gauss() * s; p.z += PS.gauss() * s; p.y += PS.gauss() * s;
          if (st.rev && st.t < 12) p.y += (heavy ? -0.012 : 0.012) * dt; // 对调时重力使气体下沉 / 上浮
          const r = Math.hypot(p.x, p.z); if (r > R - 0.004) { p.x *= (R - 0.004) / r; p.z *= (R - 0.004) / r; }
          if (p.y < Y0 + 0.003) p.y = Y0 + 0.003; if (p.y > Y1 - 0.003) p.y = Y1 - 0.003;
          if (!open && (oy - YM) * (p.y - YM) <= 0) p.y = oy;
        });
        move(PA, true); move(PB, false);
        if (st.t - st.hist[st.hist.length - 1][0] > 0.5) st.hist.push([st.t, upFrac()]);
        acc += dt; if (acc > 0.4) { acc = 0; tell(); chart.render(); }
        if (st.t >= 60) { st.run = false; tell(); chart.render(); }
      }
      // 每层的浓度（用分子个数统计，再平滑）
      const cnt = new Array(NS * 2).fill(0);
      PA.forEach((p) => { const i = p.y < YM ? Math.floor((p.y - Y0) / sliceH) : NS + Math.floor((p.y - YM - 0.004) / ((Y1 - YM - 0.004) / NS)); cnt[PS.clamp(i, 0, NS * 2 - 1)]++; });
      const k = Math.min(1, dt * 1.5);
      slices.forEach((sl, i) => {
        const raw = (0.25 * (cnt[i - 1] || cnt[i]) + 0.5 * cnt[i] + 0.25 * (cnt[i + 1] || cnt[i])) / (N / NS);
        if (st.pull) sl.c += (Math.min(1, raw) - sl.c) * k;
        sl.m.material.opacity = 0.62 * Math.pow(sl.c, 0.8);
      });
      [[A, PA], [B, PB]].forEach(([G, arr]) => { arr.forEach((p, i) => { G.a[i * 3] = p.x; G.a[i * 3 + 1] = p.y; G.a[i * 3 + 2] = p.z; }); G.g.attributes.position.needsUpdate = true; });
      plate.position.x = (1 - st.plate) * 0.2; plate.visible = st.plate > 0;
      E.render(dt);
      E.place(LB.dn, new THREE.Vector3(-R - 0.05, 0.1, 0)); E.place(LB.up, new THREE.Vector3(-R - 0.05, 0.31, 0));
      LB.plate.dataset.hide = st.plate > 0 ? '' : '1'; E.place(LB.plate, new THREE.Vector3(0.09 + (1 - st.plate) * 0.2, YM + 0.012, 0.06));
    }, view);
    el._st = st;
    reset();
    loop.start();
  });
})();
