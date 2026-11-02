/* 第7章第1节：3D 推门——力的大小、方向、作用点都会影响力的作用效果。依赖 three.js、OrbitControls、force.js */
(function () {
  'use strict';
  const { h } = PS;
  const W = 0.9, HGT = 2.0, TH = 0.04, HINGE_X = -W / 2;
  const MASS = 7, I = (MASS * W * W) / 3, PUSH_T = 0.25, DAMP = 2.0, MAXA = (100 * Math.PI) / 180;
  const DIRS = [
    { v: 'push', label: '垂直门板向里推', short: '垂直推', k: 1 },
    { v: 'pull', label: '垂直门板向外拉', short: '垂直拉', k: -1 },
    { v: 'slant', label: '斜着推（与门板成 45°）', short: '斜推 45°', k: Math.SQRT1_2 },
    { v: 'along', label: '沿门板推向门轴', short: '沿门板推', k: 0 },
  ];
  const PTS = [{ n: 'A', r: 0.8, t: '门把手处' }, { n: 'B', r: 0.45, t: '门的中间' }, { n: 'C', r: 0.12, t: '靠近门轴' }];
  const deg = (a) => Math.round((a * 180) / Math.PI);

  PS.register('door-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { F: 15, dir: 'push', r: 0.8, th: 0, w: 0, pushT: 0, closing: false, pending: null, rows: [], glow: 0 };
    const view = h('div', { class: 'stage-3d', style: { background: '#e9eef5' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察；点击门板可以选择推门的位置（作用点）。')), side));

    // ---------- 控件 ----------
    const fS = PS.ui.slider({ label: 'F', min: 5, max: 30, step: 5, value: st.F, unit: 'N', onInput: (v) => { st.F = v; arrowUpd(); } });
    const dSeg = PS.ui.seg(DIRS.map((d) => ({ value: d.v, label: d.label })), st.dir, (v) => { st.dir = v; arrowUpd(); });
    dSeg.el.style.flexWrap = 'wrap';
    const pSeg = PS.ui.seg(PTS.map((p) => ({ value: p.r, label: p.n + '（' + p.t + '）' })), st.r, (v) => { st.r = v; arrowUpd(); });
    pSeg.el.style.flexWrap = 'wrap';
    const angR = PS.ui.readout('门转过的角度', '0°', 'accent');
    const goB = PS.ui.button('👋 推（拉）一下', push, 'btn btn-primary');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody');
    const ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 力的大小'), fS.el),
      h('div', { class: 'panel' }, h('h4', null, '② 力的方向'), dSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 力的作用点'), pSeg.el, h('div', { class: 'small muted' }, '也可以直接点击门板选位置')),
      h('div', { class: 'panel' }, h('h4', null, '④ 推门'), h('div', { class: 'row' }, goB, PS.ui.button('关门', () => { st.closing = true; st.pending = null; }, 'btn btn-ghost btn-sm')), h('div', { class: 'readouts', style: { marginTop: '6px' } }, angR.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次'), h('th', null, '大小'), h('th', null, '方向'), h('th', null, '作用点'), h('th', null, '转过'))), tbody)), PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')),
      h('div', { class: 'panel' }, h('h4', null, '⑥ 分析论证'), ana));

    // ---------- 三维场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9eef5);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 40);
    camera.position.set(1.7, 1.75, 2.9);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(-0.05, 0.9, 0);
    controls.enableDamping = true; controls.minDistance = 1.2; controls.maxDistance = 7; controls.maxPolarAngle = Math.PI * 0.495;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(2, 4, 3); scene.add(dl);

    // 地板（木纹）
    const woodTex = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#d8b884'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(150,100,40,.08)' : 'rgba(255,255,255,.06)'; g.fillRect(0, i * 32, 256, 32); g.strokeStyle = 'rgba(120,80,30,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
    })();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshLambertMaterial({ map: woodTex }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    // 墙（中间留门洞）
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xf1ede4 });
    const WT = 0.12, WH = 2.6, WL = 3.2;
    const wl = new THREE.Mesh(new THREE.BoxGeometry(WL, WH, WT), wallMat); wl.position.set(HINGE_X - 0.03 - WL / 2, WH / 2, 0); scene.add(wl);
    const wr = new THREE.Mesh(new THREE.BoxGeometry(WL, WH, WT), wallMat); wr.position.set(W / 2 + 0.03 + WL / 2, WH / 2, 0); scene.add(wr);
    const wt = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, WH - HGT - 0.02, WT), wallMat); wt.position.set(0, HGT + 0.02 + (WH - HGT - 0.02) / 2, 0); scene.add(wt);
    // 门框
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x8d6e4a });
    [[HINGE_X - 0.015, HGT / 2 + 0.01, 0.03, HGT + 0.02], [W / 2 + 0.015, HGT / 2 + 0.01, 0.03, HGT + 0.02]].forEach(([x, y, w, hh]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, WT + 0.02), frameMat); m.position.set(x, y, 0); scene.add(m); });
    const ftop = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.03, WT + 0.02), frameMat); ftop.position.set(0, HGT + 0.015, 0); scene.add(ftop);

    // 地面量角器（以门轴为圆心）
    const prot = (function () {
      const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
      const R = 256 / 1.15, cx = 256, cy = 256;
      g.strokeStyle = 'rgba(59,91,219,.85)'; g.fillStyle = 'rgba(59,91,219,.9)'; g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, R, (-100 * Math.PI) / 180, (100 * Math.PI) / 180); g.stroke();
      g.font = 'bold 22px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let a = -100; a <= 100; a += 5) {
        const r = (a * Math.PI) / 180, L = a % 30 === 0 ? 26 : a % 10 === 0 ? 16 : 9;
        g.lineWidth = a % 10 === 0 ? 3 : 2;
        g.beginPath(); g.moveTo(cx + Math.cos(r) * R, cy - Math.sin(r) * R); g.lineTo(cx + Math.cos(r) * (R - L), cy - Math.sin(r) * (R - L)); g.stroke();
        if (a % 30 === 0 && a !== 0) g.fillText(Math.abs(a) + '°', cx + Math.cos(r) * (R - 46), cy - Math.sin(r) * (R - 46));
      }
      const t = new THREE.CanvasTexture(c);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(HINGE_X, 0.003, 0); return m;
    })();
    scene.add(prot);

    // 门（绕门轴转动）
    const door = new THREE.Group(); door.position.set(HINGE_X, 0, 0); scene.add(door);
    const doorTex = (function () {
      const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
      g.fillStyle = '#c99a63'; g.fillRect(0, 0, 256, 512);
      g.strokeStyle = 'rgba(110,70,30,.25)'; g.lineWidth = 2; for (let i = 0; i < 24; i++) { g.beginPath(); g.moveTo(10 + i * 10, 0); g.bezierCurveTo(14 + i * 10, 150, 6 + i * 10, 350, 12 + i * 10, 512); g.stroke(); }
      g.strokeStyle = 'rgba(90,55,20,.55)'; g.lineWidth = 6; g.strokeRect(34, 40, 188, 190); g.strokeRect(34, 280, 188, 190);
      return new THREE.CanvasTexture(c);
    })();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(W, HGT, TH), new THREE.MeshLambertMaterial({ map: doorTex }));
    panel.position.set(W / 2, HGT / 2, 0); door.add(panel);
    // 把手（两面）
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xc0c6cf, metalness: 0.6, roughness: 0.3 });
    [1, -1].forEach((s) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20), knobMat); base.rotation.x = Math.PI / 2; base.position.set(0.8, 1.0, s * (TH / 2 + 0.01)); door.add(base);
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), knobMat); lever.position.set(0.75, 1.0, s * (TH / 2 + 0.05)); door.add(lever);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), knobMat); neck.rotation.x = Math.PI / 2; neck.position.set(0.8, 1.0, s * (TH / 2 + 0.03)); door.add(neck);
    });
    // 合页
    [0.3, 1.7].forEach((y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 10), knobMat); m.position.set(0, y, 0); door.add(m); });
    // 门轴示意线
    const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(HINGE_X, 0, 0), new THREE.Vector3(HINGE_X, HGT + 0.2, 0)]), new THREE.LineDashedMaterial({ color: 0x3b5bdb, dashSize: 0.05, gapSize: 0.04 }));
    axis.computeLineDistances(); scene.add(axis);
    // 作用点标记
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xe8590c });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), dotMat); door.add(dot);
    const pDots = PTS.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 8), new THREE.MeshBasicMaterial({ color: 0x495057 })); door.add(m); return m; });
    // 力的箭头（圆柱 + 圆锥）
    const arrow = new THREE.Group();
    const aMat = new THREE.MeshStandardMaterial({ color: 0xe8590c, emissive: 0x7a2a00, roughness: 0.5 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1, 12), aMat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 16), aMat);
    arrow.add(shaft, head); door.add(arrow);
    const up = new THREE.Vector3(0, 1, 0);
    function arrowUpd() {
      const D = DIRS.find((d) => d.v === st.dir);
      const len = 0.12 + st.F * 0.018;
      // 门的局部坐标：x 沿门板离开门轴，z 指向门前（摄像机一侧）
      let dir, tail;
      const P = new THREE.Vector3(st.r, 1.0, TH / 2 + 0.003);
      if (D.v === 'push') { dir = new THREE.Vector3(0, 0, -1); tail = P.clone().addScaledVector(dir, -len); }
      else if (D.v === 'pull') { dir = new THREE.Vector3(0, 0, 1); tail = P.clone(); }
      else if (D.v === 'slant') { dir = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2); tail = P.clone().addScaledVector(dir, -len); }
      else { dir = new THREE.Vector3(-1, 0, 0); tail = P.clone().addScaledVector(dir, -len).setZ(TH / 2 + 0.03); }
      arrow.position.copy(tail);
      st.lblAt = D.v === 'pull' ? P.clone().addScaledVector(dir, len + 0.04) : tail.clone().addScaledVector(dir, -0.04);
      arrow.quaternion.setFromUnitVectors(up, dir);
      shaft.scale.y = len - 0.1; shaft.position.y = (len - 0.1) / 2; head.position.y = len - 0.05;
      dot.position.copy(P);
      pDots.forEach((m, i) => { m.position.set(PTS[i].r, 1.0, TH / 2 + 0.004); m.visible = Math.abs(PTS[i].r - st.r) > 0.02; });
      tell();
    }

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const L = { pts: PTS.map((p) => lab(p.n)), axis: lab('门轴', 'ref'), F: lab(''), ang: lab('') };
    const v3 = new THREE.Vector3();
    function place(e, p, below) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,' + (below ? '8px' : '-100%') + ')';
    }

    // 点击门板选作用点
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
    const cv = renderer.domElement;
    let down = null;
    cv.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
      down = null;
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObject(panel, false)[0];
      if (!hit) return;
      const loc = door.worldToLocal(hit.point.clone());
      st.r = PS.round(PS.clamp(loc.x, 0.05, 0.86), 2);
      const near = PTS.find((p) => Math.abs(p.r - st.r) < 0.04);
      if (near) st.r = near.r;
      pSeg.set(near ? near.r : null, true);
      PS.sound.tick();
      arrowUpd();
    });

    function push() {
      if (st.pushT > 0 || st.closing) return;
      if (st.pending) { st.w = 0; done(); } // 上一次还没停稳：先按当前角度记录
      if (Math.abs(st.th) > 0.01 || Math.abs(st.w) > 0.01) { st.closing = true; st.afterClose = true; return; }
      start();
    }
    function start() {
      st.pushT = PUSH_T; st.th0 = st.th;
      st.pending = { F: st.F, dir: st.dir, r: st.r };
      st.glow = 1;
      PS.sound.clack();
      msg.className = 'fc-msg'; msg.innerHTML = '……';
    }
    function tell() {
      const D = DIRS.find((d) => d.v === st.dir);
      if (st.pushT > 0 || st.pending) return;
      msg.className = 'fc-msg';
      msg.innerHTML = '用 <b>' + st.F + ' N</b> 的力，在离门轴 <b>' + Math.round(st.r * 100) + ' cm</b> 处，' + D.label + '。点“推（拉）一下”。';
    }
    function done() {
      const p = st.pending; st.pending = null;
      const a = st.th - st.th0;
      const D = DIRS.find((d) => d.v === p.dir);
      st.rows.push({ F: p.F, dir: p.dir, r: p.r, a });
      if (st.rows.length > 10) st.rows.shift();
      table();
      msg.className = 'fc-msg ' + (Math.abs(a) < 0.01 ? 'bad' : 'ok');
      msg.innerHTML = Math.abs(a) < 0.01 ? '门<b>一点也没动</b>！沿着门板指向门轴的力，不能使门转动。' : '门' + (a > 0 ? '向里' : '向外') + '转过了 <b>' + Math.abs(deg(a)) + '°</b>。' + (D.v === 'pull' ? '拉门时门向外开——力的方向变了，作用效果也变了。' : '');
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, String(i + 1)), h('td', null, r.F + ' N'), h('td', null, DIRS.find((d) => d.v === r.dir).short), h('td', null, (PTS.find((p) => p.r === r.r) || { n: '' }).n + ' ' + Math.round(r.r * 100) + ' cm'), h('td', null, h('b', null, (r.a < -0.01 ? '向外 ' : '') + Math.abs(deg(r.a)) + '°')))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '还没有数据')));
      analysis();
    }
    function analysis() {
      const R = st.rows, found = { F: null, dir: null, r: null };
      for (let i = 0; i < R.length; i++) for (let j = 0; j < R.length; j++) {
        if (i === j) continue;
        const a = R[i], b = R[j];
        const sF = a.F === b.F, sD = a.dir === b.dir, sR = Math.abs(a.r - b.r) < 0.005;
        if (!sF && sD && sR && a.F > b.F) found.F = found.F || [a, b];
        if (sF && !sD && sR) found.dir = found.dir || [a, b];
        if (sF && sD && !sR && a.r > b.r) found.r = found.r || [a, b];
      }
      const line = (ok, t, ex) => '<div>' + (ok ? '✔ ' : '○ ') + t + (ok ? '：' + ex : '<span class="muted">（还没有对比数据）</span>') + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">用<b>控制变量法</b>：每次只改变一个因素，比较门转过的角度。</div>';
      s += line(found.F, '只改变力的<b>大小</b>', found.F ? found.F[0].F + ' N 转过 ' + Math.abs(deg(found.F[0].a)) + '°，' + found.F[1].F + ' N 转过 ' + Math.abs(deg(found.F[1].a)) + '°——力越大，效果越明显' : '');
      s += line(found.dir, '只改变力的<b>方向</b>', found.dir ? DIRS.find((d) => d.v === found.dir[0].dir).short + '与' + DIRS.find((d) => d.v === found.dir[1].dir).short + '，门转动的情况不同' : '');
      s += line(found.r, '只改变力的<b>作用点</b>', found.r ? '离门轴 ' + Math.round(found.r[0].r * 100) + ' cm 处转过 ' + Math.abs(deg(found.r[0].a)) + '°，' + Math.round(found.r[1].r * 100) + ' cm 处只转过 ' + Math.abs(deg(found.r[1].a)) + '°——离门轴越远越容易推开' : '');
      if (found.F && found.dir && found.r) s += '<div class="tip tip-good" style="margin:8px 0 0">结论：力的作用效果跟力的<b>大小</b>、<b>方向</b>和<b>作用点</b>都有关。物理学中把它们叫做<b>力的三要素</b>。</div>';
      ana.innerHTML = s;
    }

    const loop = PS.loop((dt) => {
      // 物理：推力只作用 0.25 s；门受到与转速成正比的阻力（示意）
      const n = 4;
      for (let k = 0; k < n; k++) {
        const d = dt / n;
        if (st.closing) {
          st.th += (0 - st.th) * Math.min(1, d * 7); st.w = 0;
          if (Math.abs(st.th) < 0.002) { st.th = 0; st.closing = false; if (st.afterClose) { st.afterClose = false; start(); } }
          continue;
        }
        if (st.pushT > 0) {
          const D = DIRS.find((x) => x.v === st.pending.dir);
          st.w += ((st.pending.F * st.pending.r * D.k) / I) * d;
          st.pushT -= d;
        }
        st.w -= DAMP * st.w * d;
        if (st.pushT <= 0 && Math.abs(st.w) < 0.04) st.w = 0;
        st.th += st.w * d;
        if (Math.abs(st.th) > MAXA) { st.th = Math.sign(st.th) * MAXA; st.w = 0; }
      }
      if (st.pending && st.pushT <= 0 && st.w === 0 && !st.closing) done();
      door.rotation.y = st.th;
      st.glow = Math.max(0, st.glow - dt * 1.5);
      aMat.emissive.setRGB(0.48 + st.glow * 0.4, 0.16 + st.glow * 0.2, 0);
      controls.update();
      renderer.render(scene, camera);
      angR.set(Math.abs(deg(st.th)) + '°' + (st.th < -0.01 ? '（向外）' : st.th > 0.01 ? '（向里）' : ''));
      // 标签
      door.updateMatrixWorld();
      PTS.forEach((p, i) => place(L.pts[i], door.localToWorld(new THREE.Vector3(p.r, 0.98, TH / 2)), true));
      place(L.axis, new THREE.Vector3(HINGE_X, HGT + 0.22, 0));
      const tipW = door.localToWorld(st.lblAt.clone());
      L.F.innerHTML = 'F = ' + st.F + ' N'; place(L.F, tipW);
      L.F.style.color = '#e8590c';
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      if (!resize.done) { const far = hh / w > 0.7 ? 1.35 : 1; camera.position.set(1.7 * far, 1.75 * far, 2.9 * far); resize.done = true; }
    }
    new ResizeObserver(resize).observe(view);
    resize();
    dSeg.set(st.dir, true); pSeg.set(st.r, true);
    arrowUpd(); table();
    loop.start();
  });
})();
