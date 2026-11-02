/* 第8章第2节：3D 探究二力平衡的条件——小车 / 木块 / 轻质卡片，两边挂钩码，扭转、剪开。依赖 three.js、OrbitControls、force.js */
(function () {
  'use strict';
  const { h } = PS;
  const XP = 0.95, PR = 0.03;    // 滑轮位置（x = ±XP）、半径
  const WN = 0.5, WM = 0.05;     // 每个钩码重约 0.5 N（50 g）
  const OBJ = {
    cart: { name: '小车', M: 0.2, a: 0.09, y: 0.035, I: 0.0012, fs: 0.04, fk: 0.04, rot: 'y' },
    block: { name: '木块', M: 0.2, a: 0.08, y: 0.035, I: 0.0012, fs: 0.9, fk: 0.7, rot: 'y' },
    card: { name: '轻质卡片', M: 0.004, a: 0.075, y: 0.36, I: 0.00003, fs: 0, fk: 0, rot: 'z' },
  };

  PS.register('twoforce-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { obj: 'cart', nL: 2, nR: 2, held: true, twist: 0, x: 0, v: 0, phi: 0, w: 0, cut: false, xs: [0, 0], vs: [0, 0], t: 0, rows: [], pending: null };
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察（从上往下看更容易看出扭转）。')), side));

    // ---------- 控件 ----------
    const oSeg = PS.ui.seg(Object.keys(OBJ).map((k) => ({ value: k, label: OBJ[k].name })), st.obj, (v) => { st.obj = v; build(); reset(); });
    const cnt = (side) => {
      const out = h('b', { style: { minWidth: '5.5em', display: 'inline-block', textAlign: 'center' } });
      const box = h('div', { class: 'row' }, PS.ui.button('－', () => setN(side, -1), 'btn btn-sm'), out, PS.ui.button('＋', () => setN(side, 1), 'btn btn-sm'));
      return { box, out };
    };
    const cL = cnt('L'), cR = cnt('R');
    const twB = PS.ui.button('↻ 扭转一个角度', () => { if (!st.held) reset(); st.twist = st.twist ? 0 : (35 * Math.PI) / 180; st.phi = st.twist; tell(); }, 'btn btn-sm');
    const cutB = PS.ui.button('✂ 把卡片剪开', () => { if (st.obj !== 'card') return; if (!st.held) reset(); st.cut = !st.cut; st.twist = 0; st.phi = 0; build(); tell(); }, 'btn btn-sm');
    const goB = PS.ui.button('✋ 松手', release, 'btn btn-primary');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 研究对象'), oSeg.el, h('div', { class: 'small muted' }, '放在水平桌面上（卡片用细线吊在空中，重力可忽略）')),
      h('div', { class: 'panel' }, h('h4', null, '② 两边挂钩码（每个 50 g，重约 0.5 N）'), h('div', { class: 'small' }, '左边'), cL.box, h('div', { class: 'small', style: { marginTop: '4px' } }, '右边'), cR.box),
      h('div', { class: 'panel' }, h('h4', null, '③ 操作'), h('div', { class: 'row' }, goB, PS.ui.button('↺ 复位（用手按住）', reset, 'btn btn-ghost btn-sm')), h('div', { class: 'row', style: { marginTop: '6px' } }, twB, cutB), msg),
      h('div', { class: 'panel' }, h('h4', null, '④ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '对象'), h('th', null, 'F₁/N'), h('th', null, 'F₂/N'), h('th', null, '同一直线'), h('th', null, '同一物体'), h('th', null, '松手后'))), tbody)), PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑤ 分析论证' : '⑤ 你发现了什么？'), ana));

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.02, 30);
    camera.position.set(0.05, 0.5, 1.45);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.02, 0);
    controls.enableDamping = true; controls.minDistance = 0.4; controls.maxDistance = 5; controls.maxPolarAngle = Math.PI * 0.499;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.6, 3, 2); scene.add(dl);
    const Lam = (c, e) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.04, 0.7), Lam(0xf3f0ea)); desk.position.y = -0.02; scene.add(desk);
    [[-0.86, -0.3], [0.86, -0.3], [-0.86, 0.3], [0.86, 0.3]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.74, 0.04), Lam(0x868e96)); l.position.set(x, -0.41, z); scene.add(l); });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), Lam(0xd8dee6)); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.78; scene.add(floor);

    // 滑轮组（随研究对象改变高度）
    const pulleys = [-1, 1].map((sd) => {
      const g = new THREE.Group();
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, 0.012, 28), Std(0xadb5bd, { metalness: 0.6, roughness: 0.3 })); wheel.rotation.x = Math.PI / 2; g.add(wheel);
      const groove = new THREE.Mesh(new THREE.TorusGeometry(PR, 0.003, 6, 28), Std(0x495057)); g.add(groove);
      const rod = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1, 0.012), Std(0x6c757d, { metalness: 0.5 })); g.add(rod);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), Std(0x495057)); g.add(clamp);
      g.userData = { rod, clamp, sd };
      scene.add(g); return g;
    });
    const strMat = new THREE.LineBasicMaterial({ color: 0x343a40 });
    const strings = [0, 1].map(() => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), strMat); scene.add(l); return l; });
    // 钩码串
    const wGroups = [0, 1].map(() => { const g = new THREE.Group(); scene.add(g); return g; });
    const wMat = Std(0xd4a72c, { metalness: 0.7, roughness: 0.35 }), hMat = Std(0x868e96, { metalness: 0.6 });
    function buildWeights(g, n) {
      while (g.children.length) g.remove(g.children[0]);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 6, 14, Math.PI * 1.4), hMat); hook.position.y = -0.01; g.add(hook);
      for (let i = 0; i < n; i++) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.026, 20), wMat); c.position.y = -0.03 - i * 0.032; g.add(c);
        const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.008, 6), hMat); nk.position.y = -0.016 - i * 0.032 + 0.003; g.add(nk);
      }
    }

    // 研究对象
    const objG = new THREE.Group(); scene.add(objG);
    const halves = [new THREE.Group(), new THREE.Group()]; halves.forEach((g) => scene.add(g));
    const hand = new THREE.Group();
    (function () { const m = Std(0xffc078, { roughness: 0.8 }); const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.09), m); hand.add(palm); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), m); f.rotation.x = Math.PI / 2; f.position.set(-0.025 + i * 0.017, 0, 0.065); hand.add(f); } const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.3, 12), m); arm.rotation.x = Math.PI / 2 - 0.5; arm.position.set(0, 0.07, -0.17); hand.add(arm); })();
    scene.add(hand);
    function build() {
      [objG, halves[0], halves[1]].forEach((g) => { while (g.children.length) g.remove(g.children[0]); });
      const O = OBJ[st.obj];
      if (st.obj === 'cart') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.1), Std(0x3b5bdb, { roughness: 0.5 })); body.position.y = 0.035; objG.add(body);
        const wg = new THREE.CylinderGeometry(0.016, 0.016, 0.012, 18); wg.rotateX(Math.PI / 2);
        [[-0.05, -0.056], [0.05, -0.056], [-0.05, 0.056], [0.05, 0.056]].forEach(([x, z]) => { const w = new THREE.Mesh(wg, Std(0x212529)); w.position.set(x, 0.016, z); objG.add(w); });
      } else if (st.obj === 'block') {
        const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#d9a866'; g.fillRect(0, 0, 128, 64); g.strokeStyle = 'rgba(120,70,20,.35)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 6 + i * 10); g.bezierCurveTo(40, 10 + i * 10, 80, 2 + i * 10, 128, 6 + i * 10); g.stroke(); }
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.1), Lam(0xffffff, { map: new THREE.CanvasTexture(c) })); body.position.y = 0.03; objG.add(body);
      } else {
        const mk = (w, ox) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.002), Std(0xfff4e6, { roughness: 0.9 })); m.position.x = ox; const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xf08c00 })); m.add(e); return m; };
        if (!st.cut) objG.add(mk(0.17, 0)); else { halves[0].add(mk(0.084, -0.043)); halves[1].add(mk(0.084, 0.043)); }
      }
      // 滑轮中心比挂线点低一个半径：线从滑轮顶部水平引出
      pulleys.forEach((p) => {
        const sd = p.userData.sd;
        p.position.set(sd * XP, O.y - PR, 0);
        const rh = O.y - PR + 0.02;
        p.userData.rod.scale.y = rh; p.userData.rod.position.set(0, -rh / 2, -0.03);
        p.userData.clamp.position.set(0, -(O.y - PR), -0.03);
      });
    }
    function setN(sd, d) {
      if (!st.held) reset();
      if (sd === 'L') st.nL = PS.clamp(st.nL + d, 1, 6); else st.nR = PS.clamp(st.nR + d, 1, 6);
      buildWeights(wGroups[0], st.nL); buildWeights(wGroups[1], st.nR);
      tell();
    }
    function reset() {
      st.held = true; st.x = 0; st.v = 0; st.phi = st.twist; st.w = 0; st.xs = [0, 0]; st.vs = [0, 0]; st.t = 0; st.pending = null;
      tell();
    }
    function tell() {
      cL.out.innerHTML = st.nL + ' 个 · ' + PS.fmt(st.nL * WN, 1) + ' N'; cR.out.innerHTML = st.nR + ' 个 · ' + PS.fmt(st.nR * WN, 1) + ' N';
      cutB.style.display = st.obj === 'card' ? '' : 'none';
      twB.innerHTML = st.twist ? '↺ 不扭转（放正）' : '↻ 扭转一个角度';
      cutB.innerHTML = st.cut ? '用一张完整的卡片' : '✂ 把卡片剪开';
      if (st.held) { msg.className = 'fc-msg'; msg.innerHTML = '手按住' + OBJ[st.obj].name + '：左边拉力 F₁ = ' + PS.fmt(st.nL * WN, 1) + ' N，右边拉力 F₂ = ' + PS.fmt(st.nR * WN, 1) + ' N' + (st.twist ? '，已扭转 35°（两个力不在同一直线上）' : '') + (st.cut ? '，卡片已剪成两半' : '') + '。点“松手”观察。'; }
    }
    function release() {
      if (!st.held) reset();
      st.held = false; st.t = 0; PS.sound.tick();
      st.pending = { obj: st.obj, F1: st.nL * WN, F2: st.nR * WN, line: !st.twist, same: !(st.obj === 'card' && st.cut), moved: 0, rotated: false };
      msg.className = 'fc-msg'; msg.innerHTML = '……';
    }
    function done(res) {
      const p = st.pending; if (!p) return; st.pending = null;
      p.res = res; st.rows.push(p); if (st.rows.length > 10) st.rows.shift();
      table(); PS.sound.good();
      const T = {
        still: ['ok', '松手后' + OBJ[p.obj].name + '<b>保持静止</b>：两个力大小相等、方向相反、作用在同一直线上，彼此平衡。'],
        right: ['bad', '两个力大小不等，' + OBJ[p.obj].name + '向拉力<b>较大的右边</b>运动——不能平衡。'],
        left: ['bad', '两个力大小不等，' + OBJ[p.obj].name + '向拉力<b>较大的左边</b>运动——不能平衡。'],
        turn: ['info', '松手后' + OBJ[p.obj].name + '<b>转动</b>，直到两根细线在<b>同一直线</b>上才静止——不在同一直线上的两个力不能平衡。'],
        turnStuck: ['info', '木块转了一点就不动了——木块与桌面间的<b>摩擦力</b>阻碍了它转动。'],
        split: ['bad', '卡片剪开后，两个力分别作用在<b>两个物体</b>上，两半卡片向两边分开——不能平衡。'],
        stuck: ['bad', '两边拉力<b>不相等</b>，木块却静止了！这是因为木块受到桌面的<b>摩擦力</b>——实验中要用小车或轻质卡片来<b>减小摩擦力的影响</b>。'],
      }[res];
      msg.className = 'fc-msg ' + T[0]; msg.innerHTML = T[1];
    }
    const RES = { still: '静止', right: '向右运动', left: '向左运动', turn: '转回后静止', turnStuck: '转一点就不动', split: '两半分开', stuck: '静止（有摩擦）' };
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', { class: r.res === 'stuck' ? 'hl-row' : null }, h('td', null, OBJ[r.obj].name), h('td', null, PS.fmt(r.F1, 1)), h('td', null, PS.fmt(r.F2, 1)), h('td', null, r.line ? '是' : '否'), h('td', null, r.same ? '是' : '否'), h('td', null, h('b', null, RES[r.res])))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 6, class: 'muted' }, '还没有数据')));
      const R = st.rows, has = (f) => R.some(f);
      const a = has((r) => r.res === 'still' && r.F1 === r.F2), b = has((r) => r.res === 'left' || r.res === 'right'), c = has((r) => r.res === 'turn'), d = has((r) => r.res === 'split');
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + (ok ? '' : '<span class="muted">（还没做）</span>') + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">两边的细线跨过滑轮，所以两个拉力的<b>方向相反</b>；钩码的重力决定拉力的大小。</div>';
      s += line(a, '两边拉力相等、在同一直线上：保持静止');
      s += line(b, '两边拉力不相等：向拉力大的一边运动');
      s += line(c, '扭转一个角度（不在同一直线上）：转动，回到同一直线后静止');
      s += line(d, '剪开卡片（两个力作用在两个物体上）：两半分开');
      if (has((r) => r.res === 'stuck')) s += '<div class="tip tip-warn" style="margin:6px 0 0">用木块时，摩擦力会影响实验结果，所以改用<b>小车</b>（滚动摩擦小）或<b>轻质卡片</b>（不接触桌面）。</div>';
      if (a && b && c && d) s += '<div class="tip tip-good" style="margin:8px 0 0">结论：作用在<b>同一物体</b>上的两个力，如果<b>大小相等、方向相反</b>，并且<b>在同一条直线上</b>，这两个力就彼此平衡——<b>同体、等大、反向、共线</b>。</div>';
      else if (a && b && c) s += '<div style="margin-top:6px">再用轻质卡片做一次“剪开”的实验，验证“同体”这个条件。</div>';
      ana.innerHTML = s;
    }

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const L = { F1: lab(''), F2: lab(''), obj: lab('', 'ref'), hold: lab('用手按住', 'moving') };
    L.F1.style.color = '#e8590c'; L.F2.style.color = '#1c7ed6';
    const v3 = new THREE.Vector3();
    function place(e, p, below) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,' + (below ? '8px' : '-100%') + ')';
    }

    const LIM = XP - 0.2;
    const loop = PS.loop((dt) => {
      const O = OBJ[st.obj], TL = st.nL * WN, TR = st.nR * WN;
      if (!st.held && st.pending) {
        st.t += dt;
        const n = 10;
        for (let i = 0; i < n; i++) {
          const d = dt / n;
          if (st.obj === 'card' && st.cut) {
            // 两半各被一根线拉走（卡片质量可忽略，钩码近似自由下落，示意）
            st.vs[0] -= (TL / (st.nL * WM + 0.002)) * 0.6 * d; st.vs[1] += (TR / (st.nR * WM + 0.002)) * 0.6 * d;
            for (let k = 0; k < 2; k++) { st.xs[k] += st.vs[k] * d; if (Math.abs(st.xs[k]) > LIM) { st.xs[k] = Math.sign(st.xs[k]) * LIM; st.vs[k] = 0; } }
            continue;
          }
          // 平动：系统加速度 = (F₂ − F₁ − f) / (M + m₁ + m₂)
          const Mt = O.M + (st.nL + st.nR) * WM, net = TR - TL;
          if (Math.abs(st.v) < 1e-4 && Math.abs(net) <= O.fs) st.v = 0;
          else { const f = O.fk * Math.sign(st.v || net), nv = st.v + ((net - f) / Mt) * d; st.v = st.v !== 0 && Math.sign(nv) !== Math.sign(st.v) ? 0 : nv; }
          st.x += st.v * d;
          if (Math.abs(st.x) > LIM) { st.x = Math.sign(st.x) * LIM; st.v = 0; }
          // 转动：两根线都水平拉，力矩 τ = −a·sinφ·(F₁ + F₂)；木块还受到摩擦力矩
          const tq = -O.a * Math.sin(st.phi) * (TL + TR);
          const tf = st.obj === 'block' ? 0.03 : 0;
          if (Math.abs(st.w) < 0.02 && Math.abs(tq) <= tf) st.w = 0;
          else { const c = 1.6 * Math.sqrt((O.a * (TL + TR)) / O.I); st.w += ((tq - tf * Math.sign(st.w || tq)) / O.I - c * st.w) * d; }
          st.phi += st.w * d;
        }
        st.pending.moved = Math.max(st.pending.moved, Math.abs(st.x));
        if (Math.abs(st.phi - st.twist) > 0.05) st.pending.rotated = true;
        const settled = st.t > 1.2 && Math.abs(st.v) < 1e-3 && Math.abs(st.w) < 0.02;
        if (st.obj === 'card' && st.cut) { if (st.t > 1.5) done('split'); }
        else if (Math.abs(st.x) >= LIM - 1e-6) done(st.x > 0 ? 'right' : 'left');
        else if (settled) {
          if (st.pending.moved > 0.02) done(st.x > 0 ? 'right' : 'left');
          else if (st.twist) done(Math.abs(st.phi) < 0.06 ? 'turn' : 'turnStuck');
          else done(TL === TR ? 'still' : 'stuck');
        }
      }
      // 放置研究对象
      const y0 = st.obj === 'card' ? O.y : 0;
      objG.position.set(st.x, y0, 0); objG.rotation.set(0, 0, 0);
      if (O.rot === 'y') objG.rotation.y = st.phi; else objG.rotation.z = st.phi;
      objG.visible = !(st.obj === 'card' && st.cut);
      halves.forEach((g, k) => { g.visible = st.obj === 'card' && st.cut; g.position.set(st.xs[k], O.y, 0); });
      // 挂线点（世界坐标）
      const att = [-1, 1].map((sd, k) => {
        if (st.obj === 'card' && st.cut) return new THREE.Vector3(st.xs[k] + sd * O.a, O.y, 0);
        if (O.rot === 'y') return new THREE.Vector3(st.x + sd * O.a * Math.cos(st.phi), O.y, -sd * O.a * Math.sin(st.phi));
        return new THREE.Vector3(st.x + sd * O.a * Math.cos(st.phi), O.y + sd * O.a * Math.sin(st.phi), 0);
      });
      // 挂线点的水平位移：左边挂线点右移 Δx，左边钩码上升 Δx；右边挂线点右移 Δx，右边钩码下降 Δx
      const cutNow = st.obj === 'card' && st.cut, dxL = cutNow ? st.xs[0] : st.x, dxR = cutNow ? st.xs[1] : st.x;
      // 钩码：左边的线在物体右移时变长（钩码上升）
      [0, 1].forEach((k) => {
        const sd = k ? 1 : -1;
        const top = new THREE.Vector3(sd * XP, O.y, 0), outer = new THREE.Vector3(sd * (XP + PR), O.y - PR, 0);
        const hy = O.y - 0.28 + (k ? -dxR : dxL);
        const wy = Math.min(O.y - 0.06, hy);
        wGroups[k].position.set(sd * (XP + PR), wy, 0);
        const g = strings[k].geometry, pos = g.attributes.position;
        pos.setXYZ(0, att[k].x, att[k].y, att[k].z); pos.setXYZ(1, top.x, top.y, top.z); pos.setXYZ(2, outer.x, wy - 0.002, outer.z);
        pos.needsUpdate = true; g.computeBoundingSphere();
      });
      // 手
      hand.visible = st.held;
      hand.position.set(st.x, (st.obj === 'card' ? O.y + 0.075 : O.y + 0.04) + 0.012, 0.02);
      hand.rotation.set(st.obj === 'card' ? -0.9 : 0, 0, 0);
      controls.update();
      renderer.render(scene, camera);
      place(L.F1, new THREE.Vector3(-XP + 0.18, O.y + 0.02, 0)); L.F1.innerHTML = 'F₁ = ' + PS.fmt(TL, 1) + ' N ←';
      place(L.F2, new THREE.Vector3(XP - 0.18, O.y + 0.02, 0)); L.F2.innerHTML = '→ F₂ = ' + PS.fmt(TR, 1) + ' N';
      place(L.obj, new THREE.Vector3(st.x, (st.obj === 'card' ? O.y - 0.06 : 0), 0.06), true); L.obj.innerHTML = O.name;
      if (st.held) place(L.hold, new THREE.Vector3(st.x, O.y + 0.18, 0)); else L.hold.style.display = 'none';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    oSeg.set(st.obj, true);
    build(); buildWeights(wGroups[0], st.nL); buildWeights(wGroups[1], st.nR); reset(); table();
    loop.start();
  });
})();
