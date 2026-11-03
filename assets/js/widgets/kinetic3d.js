/* 第11章第3节：3D 探究物体的动能跟哪些因素有关——钢球从斜槽的不同高度由静止滚下，撞击水平面上的木块；质量不同的钢球；木块被撞出的距离、记录与分析论证。依赖 three.js、OrbitControls、energy.js（.fc-* 样式来自 force.js） */
(function () {
  'use strict';
  const { h } = PS;
  const TH = Math.PI / 6, SIN = Math.sin(TH), COS = Math.cos(TH); // 斜槽倾角 30°
  const XB = -0.12, XK = 0.1, TRACK = 0.9; // 斜槽底端 x；木块左侧面的初始位置；水平木板的长度
  const BALLS = { s: { name: '质量小的钢球', m: 0.05, r: 0.0115 }, b: { name: '质量大的钢球', m: 0.1, r: 0.0145 } };
  const HS = { A: 0.1, B: 0.2, C: 0.3 };
  const MB = 0.1, MU = 0.5, ETA = 0.5, K = 0.6; // 木块质量 kg、木块与木板的动摩擦因数、碰撞中传给木块的能量比例、时间放慢

  PS.register('kinetic-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { ball: 's', hk: 'B', phase: 'ready', t: 0, u: 0, x: 0, v: 0, s: 0, sT: 0, ub: 0, vb: 0, rows: [], v0: 0 };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 10' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。钢球从斜槽上的 A、B、C 点由静止滚下；h 是释放点离水平木板的高度。动画放慢了。')), side));

    // ---------- 控件 ----------
    const bSeg = PS.ui.seg(Object.keys(BALLS).map((k) => ({ value: k, label: BALLS[k].name + '（' + BALLS[k].m * 1000 + ' g）' })), st.ball, (v) => { st.ball = v; ballMesh(); ready(); });
    bSeg.el.style.flexWrap = 'wrap';
    const hSeg = PS.ui.seg(Object.keys(HS).map((k) => ({ value: k, label: k + ' 点（h = ' + HS[k] * 100 + ' cm）' })), st.hk, (v) => { st.hk = v; ready(); });
    hSeg.el.style.flexWrap = 'wrap';
    const goB = PS.ui.button('▶ 由静止释放钢球', release, 'btn btn-primary btn-sm');
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const rd = { v: PS.ui.readout('到达水平面时的速度', '—'), s: PS.ui.readout('木块被撞出的距离 s', '—') };
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择钢球'), bSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 选择释放的位置'), hSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 释放钢球，观察木块'), h('div', { class: 'row' }, goB, recB), h('div', { class: 'en-read' }, rd.v.el, rd.s.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '④ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['钢球', 'm/g', 'h/cm', 's/cm'].map((t) => h('th', null, t)))), tbody)), PS.ui.row(PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑤ 分析论证' : '⑤ 你发现了什么？'), ana));

    const B = () => BALLS[st.ball];
    const H = () => HS[st.hk];
    const aIn = 10 * SIN * 5 / 7; // 滚动的钢球沿斜槽向下的加速度
    const vBot = () => Math.sqrt(2 * aIn * (H() / SIN));
    const target = () => PS.round((ETA * B().m * H()) / (MU * MB), 4);

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.01, 20);
    camera.position.set(0.0, 0.5, 1.42);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(-0.05, 0.1, 0);
    controls.enableDamping = true; controls.minDistance = 0.25; controls.maxDistance = 3; controls.maxPolarAngle = Math.PI * 0.55;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.65); dl.position.set(0.5, 2, 1.4); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.6), Std(0xe9dcc6)); desk.position.set(0.05, -0.027, 0); scene.add(desk);
    // 水平木板（上表面 y = 0）
    const woodM = Std(0xd9a86c, { roughness: 0.8 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(TRACK, 0.012, 0.08), woodM); board.position.set(XB + TRACK / 2, -0.006, 0); scene.add(board);
    // 斜槽：倾斜的槽板 + 两侧挡板，底端与木板相接
    const LC = 0.72, chute = new THREE.Group();
    const cM = Std(0x74c0fc, { roughness: 0.5 }), cM2 = Std(0x339af0);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(LC, 0.01, 0.05), cM); cb.position.set(-LC / 2, -0.005, 0); chute.add(cb);
    [-1, 1].forEach((z) => { const rail = new THREE.Mesh(new THREE.BoxGeometry(LC, 0.02, 0.006), cM2); rail.position.set(-LC / 2, 0.006, z * 0.025); chute.add(rail); });
    chute.position.set(XB, 0, 0); chute.rotation.z = -TH; scene.add(chute);
    const legM = Std(0x495057, { metalness: 0.3 });
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, LC * SIN, 0.04), legM); leg.position.set(XB - LC * COS + 0.02, (LC * SIN) / 2 - 0.012, 0); scene.add(leg);
    // A、B、C 标记
    const markM = Std(0xe03131);
    const mark = {};
    Object.keys(HS).forEach((k) => { const u = HS[k] / SIN, m = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.062), markM); m.position.set(XB - u * COS, u * SIN + 0.006, 0); m.rotation.z = -TH; scene.add(m); mark[k] = m; });
    // 刻度尺（木块起始位置为 0）
    const rc = document.createElement('canvas'); rc.width = 1400; rc.height = 70;
    const r2 = rc.getContext('2d');
    r2.fillStyle = '#fff3bf'; r2.fillRect(0, 0, 1400, 70); r2.strokeStyle = '#495057'; r2.fillStyle = '#343a40'; r2.font = 'bold 20px sans-serif'; r2.textAlign = 'center';
    for (let c = 0; c <= 70; c++) { const x = 20 + (c * 1400) / 72; r2.lineWidth = c % 10 ? 1.5 : 2.5; r2.beginPath(); r2.moveTo(x, 0); r2.lineTo(x, c % 10 ? (c % 5 ? 16 : 24) : 32); r2.stroke(); if (c % 10 === 0) r2.fillText(String(c), x, 56); }
    const rtex = new THREE.CanvasTexture(rc);
    const ruler = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.036), new THREE.MeshBasicMaterial({ map: rtex }));
    ruler.rotation.x = -Math.PI / 2; ruler.position.set(XK - (20 / 1400) * 0.72 + 0.36, 0.0005, 0.058); scene.add(ruler);
    // 竖直的高度尺
    const vc = document.createElement('canvas'); vc.width = 80; vc.height = 700;
    const v2 = vc.getContext('2d');
    v2.fillStyle = '#fff'; v2.fillRect(0, 0, 80, 700); v2.strokeStyle = '#495057'; v2.fillStyle = '#343a40'; v2.font = 'bold 22px sans-serif';
    for (let c = 0; c <= 34; c++) { const y = 700 - 10 - c * 20; v2.lineWidth = c % 10 ? 1.5 : 2.5; v2.beginPath(); v2.moveTo(0, y); v2.lineTo(c % 10 ? (c % 5 ? 14 : 22) : 30, y); v2.stroke(); if (c % 10 === 0) v2.fillText(String(c), 34, y + 8); }
    const vstick = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(vc) }));
    vstick.position.set(XB - LC * COS - 0.04, 0.175 - (10 / 700) * 0.35, 0.03); scene.add(vstick);
    // 钢球与木块
    const ballM = Std(0xdee2e6, { metalness: 0.85, roughness: 0.22 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), ballM); scene.add(ball);
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.04, 6, 32), Std(0x868e96, { metalness: 0.6 })); ball.add(band);
    function ballMesh() { ball.scale.setScalar(B().r); }
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), Std(0xc98d3e, { roughness: 0.75 })); scene.add(block);
    // 速度的虚线痕迹：木块起始位置
    const startLine = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.002, 0.09), Std(0x2b8a3e)); startLine.position.set(XK, 0.001, 0); scene.add(startLine);

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const LB = { A: lab('A'), B: lab('B'), C: lab('C'), ball: lab('钢球'), blk: lab('木块'), s: lab('', 'ref') };
    const v3 = new THREE.Vector3();
    function place(e, p) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-50%)';
    }

    function ready() {
      st.phase = 'ready'; st.t = 0; st.u = H() / SIN; st.s = 0; st.v = 0; st.x = 0; st.v0 = 0;
      tell();
    }
    function release() {
      if (st.phase === 'roll' || st.phase === 'flat' || st.phase === 'hit') return;
      ready(); st.phase = 'roll'; tell();
    }
    function tell() {
      recB.disabled = st.phase !== 'done';
      rd.v.set(st.v0 ? PS.fmt(st.v0, 2) + ' m/s' : '—');
      rd.s.set(st.phase === 'done' || st.phase === 'hit' ? PS.fmt(st.s * 100, 1) + ' cm' : '—');
      let t;
      if (st.phase === 'ready') t = '让' + B().name + '从 ' + st.hk + ' 点（h = ' + H() * 100 + ' cm）由静止滚下。钢球撞击木块，<b>木块被撞得越远，说明钢球的动能越大</b>（转换法）。';
      else if (st.phase === 'done') t = '木块被撞出 <b>' + PS.fmt(st.s * 100, 1) + ' cm</b>。点“记录”，再改变钢球的质量或释放的高度（每次只改变一个因素）。';
      else t = '钢球滚下……从同一高度由静止滚下的钢球，到达水平面时的<b>速度相同</b>，与钢球的质量无关。';
      msg.className = 'fc-msg ' + (st.phase === 'done' ? 'ok' : 'info'); msg.innerHTML = t;
    }
    function record() {
      if (st.phase !== 'done') return;
      if (st.rows.some((r) => r.b === st.ball && r.h === st.hk)) { msg.className = 'fc-msg bad'; msg.innerHTML = '这组已经记录过了，换一个钢球或换一个释放点。'; PS.sound.bad(); return; }
      st.rows.push({ b: st.ball, h: st.hk, s: PS.round(st.s * 100, 1) });
      if (st.rows.length > 8) st.rows.shift();
      PS.sound.good(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.b === 's' ? '小' : '大'), h('td', null, String(BALLS[r.b].m * 1000)), h('td', null, String(HS[r.h] * 100)), h('td', null, h('b', null, PS.fmt(r.s, 1))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      const R = st.rows;
      const sameM = R.some((a) => R.some((b) => a.b === b.b && a.h !== b.h));
      const sameV = R.some((a) => R.some((b) => a.h === b.h && a.b !== b.b));
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      let s = line(sameM, '同一个钢球从<b>越高</b>的位置滚下，到达水平面时<b>速度越大</b>，木块被撞得越远：<b>质量相同时，速度越大，动能越大</b>。')
        + line(sameV, '质量不同的钢球从<b>同一高度</b>滚下（速度相同），<b>质量大</b>的把木块撞得更远：<b>速度相同时，质量越大，动能越大</b>。');
      if (sameM && sameV) s += '<div class="tip tip-good" style="margin:8px 0 0">物体的动能跟<b>质量</b>和<b>速度</b>有关：质量越大、速度越大，动能越大。</div>';
      s += '<div class="muted" style="margin-top:4px">研究方法：控制变量法（用释放高度控制速度）、转换法（用木块移动的距离表示动能的大小）。</div>';
      ana.innerHTML = s;
    }

    const loop = PS.loop((dt) => {
      const r = B().r;
      if (st.phase === 'roll') {
        st.t += dt * K;
        st.u = H() / SIN - 0.5 * aIn * st.t * st.t;
        if (st.u <= 0) { st.v0 = vBot(); st.v = st.v0; st.x = XB; st.phase = 'flat'; tell(); }
      } else if (st.phase === 'flat') {
        st.x += st.v * dt * K;
        if (st.x + r >= XK) {
          st.x = XK - r; st.sT = target() * (1 + PS.rand(-0.02, 0.02));
          st.ub = Math.sqrt(2 * MU * 10 * st.sT); st.vb = 0.3 * st.ub; st.v = st.vb; st.phase = 'hit'; PS.sound.clack(); tell();
        }
      } else if (st.phase === 'hit') {
        const d = dt * K;
        st.ub = Math.max(0, st.ub - MU * 10 * d); st.s = Math.min(st.sT, st.s + st.ub * d);
        st.v = Math.max(0, st.v - 1.2 * d); st.x = Math.min(XK + st.s - r, st.x + st.v * d);
        if (st.ub <= 0 && st.v <= 0) { st.s = st.sT; st.phase = 'done'; tell(); }
        else if (Math.round(st.s * 1000) !== st.sk) { st.sk = Math.round(st.s * 1000); tell(); }
      }
      // 摆放
      if (st.phase === 'ready' || st.phase === 'roll') {
        const u = Math.max(0, st.u);
        ball.position.set(XB - u * COS + r * SIN, u * SIN + r * COS, 0);
        band.rotation.set(0, Math.PI / 2, (u / r));
      } else {
        ball.position.set(st.x, r, 0);
        band.rotation.set(0, Math.PI / 2, -(st.x - XB) / r);
      }
      block.position.set(XK + 0.03 + st.s, 0.02, 0);
      Object.keys(mark).forEach((k) => (mark[k].material = k === st.hk ? markM : legM));
      controls.update();
      renderer.render(scene, camera);
      Object.keys(HS).forEach((k) => { const u = HS[k] / SIN; place(LB[k], new THREE.Vector3(XB - u * COS - 0.035, u * SIN + 0.03, 0)); LB[k].className = 'label3d' + (k === st.hk ? ' ref' : ''); });
      place(LB.ball, ball.position.clone().add(new THREE.Vector3(0, 0.05, 0)));
      place(LB.blk, new THREE.Vector3(XK + 0.03 + st.s, 0.075, 0));
      if (st.phase === 'hit' || st.phase === 'done') { LB.s.innerHTML = 's = ' + PS.fmt(st.s * 100, 1) + ' cm'; place(LB.s, new THREE.Vector3(XK + st.s / 2, 0.01, 0.12)); }
      else LB.s.style.display = 'none';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    el._st = st;
    ballMesh(); ready(); table();
    loop.start();
  });
})();
