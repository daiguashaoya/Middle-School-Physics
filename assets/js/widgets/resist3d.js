/* 第8章第1节：3D 探究阻力对物体运动的影响——小车从斜面同一高度滑下，在毛巾 / 棉布 / 木板 / 玻璃 / 绝对光滑（推理）的水平面上滑行。依赖 three.js、OrbitControls、force.js、dynamics.js */
(function () {
  'use strict';
  const { h } = PS;
  const G = 9.8, TH = (20 * Math.PI) / 180, MU0 = 0.02;
  const BL = 2.2;            // 水平木板长（m）
  const IL = 0.62;           // 斜面长（m）
  const CAR_L = 0.1;
  // 水平面上的等效阻力系数（含车轮的滚动阻力；毛巾上车轮陷进绒毛里，阻力最大）
  const SF = {
    towel: { mu: 0.5, c: '#e64980' },
    cotton: { mu: 0.23, c: '#1c7ed6' },
    wood: { mu: 0.105, c: '#b07d45' },
    glass: { mu: 0.064, c: '#0c8599' },
    ideal: { mu: 0, c: '#2b8a3e' },
  };
  const POS = [{ n: 'A', s: 0.4 }, { n: 'B', s: 0.3 }, { n: 'C', s: 0.2 }];

  function tex(draw, w, hh, rx) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    draw(c.getContext('2d'), w, hh);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, 1); t.anisotropy = 8;
    return t;
  }
  const SURF_TEX = {
    towel: (g, w, hh) => { g.fillStyle = '#f8c4d8'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#e599b7'; g.lineWidth = 2; for (let y = 4; y < hh; y += 8) for (let x = (y % 16 ? 4 : 0); x < w; x += 8) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.stroke(); } },
    cotton: (g, w, hh) => { g.fillStyle = '#cfe3f7'; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(80,130,190,.45)'; g.lineWidth = 1.5; for (let x = 0; x < w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); } for (let y = 0; y < hh; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } },
    wood: (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#e9c48f'); gr.addColorStop(1, '#d9a866'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(120,70,20,.2)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); const y = 6 + i * 11; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 4, w * 0.6, y - 4, w, y); g.stroke(); } },
    glass: (g, w, hh) => { g.fillStyle = '#e3f6fd'; g.fillRect(0, 0, w, hh); g.fillStyle = 'rgba(255,255,255,.8)'; for (let x = 20; x < w; x += 120) { g.beginPath(); g.moveTo(x, hh); g.lineTo(x + 26, 0); g.lineTo(x + 40, 0); g.lineTo(x + 14, hh); g.fill(); } },
    ideal: (g, w, hh) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#edf2ff'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#edf2ff'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.fillStyle = 'rgba(112,72,232,.5)'; g.font = 'bold 22px sans-serif'; g.textBaseline = 'middle'; g.fillText('绝对光滑（假想）', 20, hh / 2); },
  };

  PS.register('resist-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { surf: 'towel', pos: 'A', phase: 'ready', s: 0.4, x: 0, v: 0, t: 0, rows: [], curves: [], cur: null };
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察，滚轮缩放。')), side));

    // ---------- 控件 ----------
    const sSeg = PS.ui.seg(Object.keys(SF).map((k) => ({ value: k, label: k === 'ideal' ? '绝对光滑（推理）' : PS.SURF[k].name })), st.surf, (v) => { st.surf = v; resetCar(); build(); });
    sSeg.el.style.flexWrap = 'wrap';
    const pSeg = PS.ui.seg(POS.map((p) => ({ value: p.n, label: p.n + ' 点' })), st.pos, (v) => { st.pos = v; resetCar(); });
    const goB = PS.ui.button('▶ 释放小车', release, 'btn btn-primary');
    const vR = PS.ui.readout('速度 v', '0.00 m/s', 'primary');
    const dR = PS.ui.readout('在水平面上滑行', '0.0 cm', 'accent');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody');
    const ana = h('div', { class: 'small' });
    const chartEl = h('div');
    const CS = PS.stage(chartEl, { ratio: '16 / 10', draw: drawChart });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 水平面上铺什么'), sSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 从斜面上哪一点释放'), pSeg.el, h('div', { class: 'small muted' }, 'A 点最高，C 点最低')),
      h('div', { class: 'panel' }, h('h4', null, '③ 进行实验'), h('div', { class: 'row' }, goB, PS.ui.button('放回', resetCar, 'btn btn-ghost btn-sm')), h('div', { class: 'readouts', style: { marginTop: '6px' } }, vR.el, dR.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '④ 速度—时间图像（在水平面上）'), chartEl),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '水平面'), h('th', null, '释放点'), h('th', null, '阻力'), h('th', null, '滑行距离'))), tbody)), PS.ui.button('清空记录', () => { st.rows = []; st.curves = []; table(); CS.render(); }, 'btn btn-ghost btn-sm')),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑥ 分析论证' : '⑥ 你发现了什么？'), ana));

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.02, 60);
    const CAM0 = new THREE.Vector3(0.75, 1.05, 2.25), TGT0 = new THREE.Vector3(0.78, -0.05, 0);
    camera.position.copy(CAM0);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(TGT0);
    controls.enableDamping = true; controls.minDistance = 0.35; controls.maxDistance = 5; controls.maxPolarAngle = Math.PI * 0.49;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xa09080, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(1, 3, 2); scene.add(dl);
    const Lam = (c, e) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));

    // 实验桌和地面
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 1.0), Lam(0xf1f3f5)); desk.position.set(0.7, -0.045, 0); scene.add(desk);
    [[-1.0, -0.42], [2.4, -0.42], [-1.0, 0.42], [2.4, 0.42]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), Lam(0x868e96)); l.position.set(x, -0.445, z); scene.add(l); });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), Lam(0xd8dee6)); floor.rotation.x = -Math.PI / 2; floor.position.set(10, -0.82, 0); scene.add(floor);

    // 斜面（局部坐标：x 沿斜面向下，0 为斜面底端）
    const woodMat = Lam(0xffffff, { map: tex(SURF_TEX.wood, 512, 64, 1) });
    const sideMat = Lam(0xb07d45);
    const incl = new THREE.Group(); incl.rotation.z = -TH; scene.add(incl);
    const ib = new THREE.Mesh(new THREE.BoxGeometry(IL, 0.02, 0.2), [sideMat, sideMat, woodMat, sideMat, sideMat, sideMat]);
    ib.position.set(-IL / 2, -0.01, 0); incl.add(ib);
    // 斜面的支架（垫块）
    const topY = IL * Math.sin(TH);
    const blk = new THREE.Mesh(new THREE.BoxGeometry(0.1, topY, 0.2), Lam(0x5c7cfa)); blk.position.set(-IL * Math.cos(TH) + 0.05, topY / 2 - 0.02, 0); scene.add(blk);
    // A、B、C 标记线
    const markMat = Lam(0xe03131);
    POS.forEach((p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, 0.2), markMat); m.position.set(-p.s, 0.0015, 0); incl.add(m); });

    // 水平木板 + 铺的材料
    const board = new THREE.Mesh(new THREE.BoxGeometry(BL, 0.02, 0.2), [sideMat, sideMat, woodMat, sideMat, sideMat, sideMat]);
    board.position.set(BL / 2, -0.01, 0); scene.add(board);
    woodMat.map.repeat.set(1, 1);
    const longBoard = new THREE.Mesh(new THREE.BoxGeometry(40, 0.02, 0.2), Lam(0xffffff, { map: tex(SURF_TEX.ideal, 512, 64, 40) }));
    longBoard.position.set(20, -0.01, 0); scene.add(longBoard);
    let cover = null;
    // 刻度尺（放在木板前边沿）
    const rulerTex = tex((g, w, hh) => {
      g.fillStyle = '#fff3bf'; g.fillRect(0, 0, w, hh);
      g.strokeStyle = '#2a2414'; g.fillStyle = '#2a2414';
      for (let cm = 0; cm <= 220; cm++) { const x = (cm / 220) * (w - 40) + 20, L = cm % 10 === 0 ? hh * 0.5 : cm % 5 === 0 ? hh * 0.32 : hh * 0.18; g.lineWidth = cm % 10 === 0 ? 3 : 1.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, L); g.stroke(); if (cm % 20 === 0) { g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText(String(cm), x, hh - 8); } }
    }, 4096, 80, 1);
    rulerTex.wrapS = THREE.ClampToEdgeWrapping;
    const ruler = new THREE.Mesh(new THREE.PlaneGeometry(BL * (4096 / (4096 - 40)), 0.05), new THREE.MeshBasicMaterial({ map: rulerTex }));
    ruler.rotation.x = -Math.PI / 2; ruler.position.set(BL / 2, 0.001, 0.135); scene.add(ruler);
    const rulerBase = new THREE.Mesh(new THREE.BoxGeometry(BL + 0.04, 0.02, 0.06), Lam(0xf1f3f5)); rulerBase.position.set(BL / 2, -0.01, 0.135); scene.add(rulerBase);

    function build() {
      if (cover) { scene.remove(cover); cover.geometry.dispose(); cover = null; }
      const ideal = st.surf === 'ideal';
      longBoard.visible = ideal; board.visible = !ideal;
      if (st.surf !== 'wood' && !ideal) {
        const t = tex(SURF_TEX[st.surf], 256, 64, 11);
        const mat = st.surf === 'glass' ? Std(0xffffff, { map: t, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 }) : Lam(0xffffff, { map: t });
        cover = new THREE.Mesh(new THREE.BoxGeometry(BL - 0.02, st.surf === 'towel' ? 0.006 : 0.003, 0.198), mat);
        cover.position.set(BL / 2 + 0.01, st.surf === 'towel' ? 0.003 : 0.0015, 0); scene.add(cover);
      }
      surfLbl.innerHTML = ideal ? '绝对光滑的水平面（假想，足够长）' : '水平面上铺' + PS.SURF[st.surf].name;
    }

    // 小车
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(CAR_L, 0.032, 0.07), Std(0x3b5bdb, { roughness: 0.5 })); body.position.y = 0.034; car.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.055), Std(0xf8f9fa, { roughness: 0.4 })); top.position.set(-0.012, 0.06, 0); car.add(top);
    const bump = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.07), Std(0xf08c00)); bump.position.set(CAR_L / 2 + 0.003, 0.032, 0); car.add(bump);
    const wheels = [];
    const wg = new THREE.CylinderGeometry(0.014, 0.014, 0.01, 18); wg.rotateX(Math.PI / 2);
    [[-0.032, -0.039], [0.032, -0.039], [-0.032, 0.039], [0.032, 0.039]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wg, Std(0x212529, { roughness: 0.8 })); w.position.set(x, 0.014, z); car.add(w);
      const hub = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.0105), Std(0xadb5bd)); hub.position.copy(w.position); car.add(hub); wheels.push(hub);
    });
    scene.add(car);
    // 停止位置标记
    const stopMk = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.03, 12), Std(0xe8590c)); stopMk.rotation.z = Math.PI; stopMk.visible = false; scene.add(stopMk);

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const L = { pts: POS.map((p) => lab(p.n, 'ref')), stop: lab(''), surf: lab('') };
    const surfLbl = L.surf;
    const v3 = new THREE.Vector3();
    function place(e, p, below) {
      v3.copy(p).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 1.05 || Math.abs(v3.y) > 1.05) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,' + (below ? '8px' : '-100%') + ')';
    }

    const P = () => POS.find((p) => p.n === st.pos);
    function resetCar() {
      st.phase = 'ready'; st.s = P().s; st.x = 0; st.v = 0; st.t = 0; st.cur = null; stopMk.visible = false; L.stop.style.display = 'none';
      st.follow = false;
      camera.position.copy(CAM0); controls.target.copy(TGT0);
      msg.className = 'fc-msg'; msg.innerHTML = '小车放在斜面的 <b>' + st.pos + ' 点</b>。点“释放小车”，让它<b>由静止</b>滑下。';
      vR.set('0.00 m/s'); dR.set('0.0 cm');
    }
    function release() {
      if (st.phase !== 'ready') resetCar();
      st.phase = 'incline'; PS.sound.tick();
      st.cur = { surf: st.surf, pos: st.pos, pts: [] };
      msg.className = 'fc-msg'; msg.innerHTML = '……';
    }
    function finish() {
      st.phase = 'stopped';
      const d = st.x;
      st.rows.push({ surf: st.surf, pos: st.pos, d });
      if (st.rows.length > 12) st.rows.shift();
      st.curves.push(st.cur); if (st.curves.length > 6) st.curves.shift();
      table(); CS.render();
      PS.sound.good();
      stopMk.visible = true; stopMk.position.set(d, 0.11, 0.05);
      L.stop.innerHTML = '停在 ' + PS.fmt(d * 100, 1) + ' cm';
      msg.className = 'fc-msg ok';
      msg.innerHTML = '小车在' + PS.SURF[st.surf].name + '上滑行了 <b>' + PS.fmt(d * 100, 1) + ' cm</b> 后停下。' + (st.rows.length < 2 ? '换一种材料，从<b>同一点</b>释放再做一次。' : '');
    }
    function table() {
      tbody.innerHTML = '';
      const order = ['towel', 'cotton', 'wood', 'glass'];
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, PS.SURF[r.surf].name), h('td', null, r.pos), h('td', null, ['最大', '较大', '较小', '很小'][order.indexOf(r.surf)]), h('td', null, h('b', null, PS.fmt(r.d * 100, 1) + ' cm')))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      analysis();
    }
    function analysis() {
      const R = st.rows;
      const bySurf = {};
      R.forEach((r) => { (bySurf[r.pos] = bySurf[r.pos] || {})[r.surf] = r.d; });
      // 找一个释放点，在这个点上做过的材料最多
      let best = null, n = 0;
      Object.keys(bySurf).forEach((p) => { const k = Object.keys(bySurf[p]).length; if (k > n) { n = k; best = p; } });
      const pts = new Set(R.map((r) => r.pos));
      let s = '<div class="muted" style="margin-bottom:4px">用<b>控制变量法</b>：小车每次从斜面的<b>同一高度</b>由静止滑下（到达水平面时的速度相同），只改变水平面的粗糙程度；用<b>滑行距离</b>反映阻力对运动的影响（<b>转换法</b>）。</div>';
      if (pts.size > 1 && n < 2) s += '<div class="tip tip-warn" style="margin:6px 0">释放点不同，小车到达水平面时的速度就不同，这样比较滑行距离是没有意义的。要从<b>同一点</b>释放。</div>';
      if (n >= 3) {
        const list = ['towel', 'cotton', 'wood', 'glass'].filter((k) => bySurf[best][k] != null).map((k) => PS.SURF[k].name + ' ' + PS.fmt(bySurf[best][k] * 100, 0) + ' cm').join(' → ');
        s += '<div>从 ' + best + ' 点释放：' + list + '</div>';
        s += '<div class="tip tip-good" style="margin:8px 0 0">结论：水平面越光滑，小车受到的<b>阻力越小</b>，<b>速度减小得越慢</b>，滑行的距离<b>越远</b>（v–t 图像越平缓）。</div>';
        s += '<div style="margin-top:6px"><b>推理：</b>如果水平面<b>绝对光滑</b>，小车不受阻力，速度就<b>不会减小</b>，将以恒定的速度<b>永远运动下去</b>。点上面的“绝对光滑（推理）”看看。</div>';
      } else s += '<div>从同一点释放，至少在 3 种材料上各做一次，再比较滑行距离。</div>';
      ana.innerHTML = s;
    }
    function drawChart(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 500, 312);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 500, 312);
      const series = st.curves.concat(st.cur && st.cur.pts.length ? [st.cur] : []).map((c) => ({ pts: c.pts, color: SF[c.surf].c, dash: c.surf === 'ideal' ? [7, 5] : null, width: 2.6 }));
      DY.chart(ctx, { F, x: 56, y: 30, w: 400, h: 230, xmax: 3, ymax: 2, xstep: 0.5, xlab: 1, ystep: 0.5, yl: 'v/(m·s⁻¹)', xl: 't/s', series, bg: false, padL: 40 });
      let y = 40;
      const seen = [];
      st.curves.concat(st.cur ? [st.cur] : []).forEach((c) => { if (seen.includes(c.surf)) return; seen.push(c.surf); D.text(ctx, '— ' + (c.surf === 'ideal' ? '绝对光滑' : PS.SURF[c.surf].name), 450, y, { size: F(13), weight: 700, color: SF[c.surf].c, align: 'right' }); y += 20; });
    }
    const DY = PS.dyn, D = PS.draw;

    const loop = PS.loop((dt) => {
      const n = 8;
      for (let i = 0; i < n && (st.phase === 'incline' || st.phase === 'flat'); i++) {
        const d = dt / n;
        if (st.phase === 'incline') {
          st.v += G * (Math.sin(TH) - MU0 * Math.cos(TH)) * d; st.s -= st.v * d;
          if (st.s <= 0) { st.x = -st.s; st.s = 0; st.phase = 'flat'; st.t = 0; st.cur.pts.push([0, st.v]); }
        } else {
          const mu = SF[st.surf].mu;
          st.v -= mu * G * d; st.t += d;
          if (st.v <= 0) { st.v = 0; finish(); break; }
          st.x += st.v * d;
          if (!st.cur.pts.length || st.t - st.cur.pts[st.cur.pts.length - 1][0] > 0.04) st.cur.pts.push([st.t, st.v]);
          if (st.surf === 'ideal') {
            st.follow = st.x > 0.9;
            if (st.x > 38) { st.phase = 'stopped'; msg.className = 'fc-msg ok'; msg.innerHTML = '小车已经匀速滑行了 38 m，速度一直是 <b>' + PS.fmt(st.v, 2) + ' m/s</b>。如果水平面足够长，它将<b>永远运动下去</b>——运动不需要力来维持。'; st.curves.push(st.cur); CS.render(); }
          }
        }
      }
      if (st.phase === 'flat' && st.surf === 'ideal' && st.x > 0.3) { msg.className = 'fc-msg ok'; msg.innerHTML = '没有阻力，小车的速度<b>保持不变</b>（v–t 图像是水平线），它将一直以 ' + PS.fmt(st.v, 2) + ' m/s 的速度做匀速直线运动……'; }
      // 小车位置：在斜面上时车头在 s 处，车的中心沿斜面再向上 CAR_L / 2；到水平面后车头在 x 处
      const onIncl = st.phase === 'ready' || st.phase === 'incline';
      let cx, cy, rot;
      if (onIncl) { const sc = st.s + CAR_L / 2; cx = -sc * Math.cos(TH); cy = sc * Math.sin(TH); rot = -TH; }
      else { cx = st.x - CAR_L / 2; cy = 0; rot = 0; }
      car.position.set(cx, cy + (st.surf === 'towel' && rot === 0 ? 0.004 : 0), 0); car.rotation.z = rot;
      const wspin = -(onIncl ? P().s - st.s : P().s + st.x) / 0.014;
      wheels.forEach((w) => { w.rotation.z = wspin; });
      if (st.follow) {
        const dx = (st.x + 0.2) - controls.target.x;
        if (dx > 0) { controls.target.x += dx; camera.position.x += dx; }
      }
      controls.update();
      renderer.render(scene, camera);
      vR.set(PS.fmt(st.v, 2) + ' m/s');
      dR.set(PS.fmt(st.x * 100, 1) + ' cm');
      if (st.phase === 'flat' || st.phase === 'incline') CS.render();
      // 标签
      POS.forEach((p, i) => place(L.pts[i], new THREE.Vector3(-p.s * Math.cos(TH), p.s * Math.sin(TH) + 0.01, -0.11)));
      if (stopMk.visible) place(L.stop, new THREE.Vector3(st.x, 0.13, 0.05));
      place(L.surf, new THREE.Vector3(st.follow ? controls.target.x + 0.4 : 1.6, 0.03, -0.1));
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    sSeg.set(st.surf, true); pSeg.set(st.pos, true);
    build(); resetCar(); table();
    loop.start();
  });
})();
