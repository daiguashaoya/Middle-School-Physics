/*
 * 第12章：两个 3D 滑轮实验
 * pulley-3d  研究定滑轮和动滑轮的特点（直接提起 / 定滑轮沿三个方向拉 / 动滑轮竖直或斜着拉，动滑轮重 0.4 N，记录与分析）
 * eta-3d     测量滑轮组的机械效率（甲：一定一动 n = 3；乙：两定两动 n = 5；钩码每个 1 N；匀速 / 静止时读数 / 加速拉；计算 η 后记录，分析论证）
 * 依赖 three.js、OrbitControls、machine.js（PS.mc 的 3D 器材、belt），.fc-* 样式来自 force.js
 */
(function () {
  'use strict';
  const { h } = PS;
  const TAU = Math.PI * 2;

  /* 两个实验共用：场景、灯光、桌面、标签 */
  function setup(el, aspect, cam, tgt) {
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: aspect } });
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(38, 1.4, 0.01, 20);
    camera.position.set(cam[0], cam[1], cam[2]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(tgt[0], tgt[1], tgt[2]); controls.enableDamping = true; controls.minDistance = 0.25; controls.maxDistance = 4; controls.maxPolarAngle = Math.PI * 0.56;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.6, 2, 1.6); scene.add(dl);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.6), PS.mc.mat(0xe9dcc6)); desk.position.set(0, -0.015, 0); scene.add(desk);
    const v3 = new THREE.Vector3();
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    function place(e, p) {
      if (!p) { e.style.display = 'none'; return; }
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-50%)';
    }
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
      view.querySelectorAll('.label3d').forEach((e) => (e.style.fontSize = w < 520 ? '11px' : ''));
    }
    new ResizeObserver(resize).observe(view);
    requestAnimationFrame(resize);
    return { view, renderer, scene, camera, controls, lab, place, render() { controls.update(); renderer.render(scene, camera); } };
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z || 0);

  /* ================= 研究定滑轮和动滑轮的特点 ================= */
  PS.register('pulley-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const MC = PS.mc;
    const RG = 0.03, ARM = 0.76, HMAX = 0.1, GD = 0.4;
    const st = { kind: 'fixed', n: 2, dir: 0, gd: true, phase: 'ready', t: 0, hh: 0, rows: [] };
    const S = setup(el, '16 / 12', [0.2, 0.6, 1.32], [0.06, 0.5, 0]);
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, S.view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。每个钩码重 1 N；不计绳重和摩擦。')), side));

    const kSeg = PS.ui.seg([{ value: 'direct', label: '直接提起钩码' }, { value: 'fixed', label: '使用定滑轮' }, { value: 'moving', label: '使用动滑轮' }], st.kind, (v) => { st.kind = v; st.dir = 0; dirs(); ready(); });
    kSeg.el.style.flexWrap = 'wrap';
    const nSeg = PS.ui.seg([1, 2, 3, 4].map((n) => ({ value: n, label: n + ' 个' })), st.n, (v) => { st.n = v; ready(); });
    const gdSeg = PS.ui.seg([{ value: true, label: '动滑轮重 0.4 N' }, { value: false, label: '轻质动滑轮（不计重）' }], st.gd, (v) => { st.gd = v; ready(); });
    gdSeg.el.style.flexWrap = 'wrap';
    const dBox = h('div');
    const goB = PS.ui.button('▶ 匀速拉动', pull, 'btn btn-primary btn-sm');
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const rd = { G: PS.ui.readout('钩码重 G', '—', 'primary'), F: PS.ui.readout('测力计示数 F', '—', 'accent'), h: PS.ui.readout('钩码上升 h', '—'), s: PS.ui.readout('绳端移动 s', '—') };
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    const gdRow = h('div', { style: { marginTop: '6px' } }, gdSeg.el);
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择实验装置'), kSeg.el, gdRow),
      h('div', { class: 'panel' }, h('h4', null, '② 挂上钩码'), nSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 拉力的方向'), dBox),
      h('div', { class: 'panel' }, h('h4', null, '④ 拉动并读数'), h('div', { class: 'row' }, goB, recB), h('div', { class: 'mc-read' }, rd.G.el, rd.F.el, rd.h.el, rd.s.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['装置', '拉力方向', 'G/N', 'F/N', 'h/cm', 's/cm'].map((t) => h('th', null, t)))), tbody)), PS.ui.row(PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑥ 分析论证' : '⑥ 你发现了什么？'), ana));
    const DIRS = { direct: [{ v: 0, t: '竖直向上' }], fixed: [{ v: 0, t: '竖直向下' }, { v: 45, t: '斜向下' }, { v: 90, t: '水平' }], moving: [{ v: 0, t: '竖直向上' }, { v: 30, t: '斜向上（偏 30°）' }] };
    function dirs() {
      dBox.innerHTML = '';
      const sg = PS.ui.seg(DIRS[st.kind].map((d) => ({ value: d.v, label: d.t })), st.dir, (v) => { st.dir = v; ready(); });
      sg.el.style.flexWrap = 'wrap'; dBox.append(sg.el);
      gdRow.style.display = st.kind === 'moving' ? '' : 'none';
    }
    const G = () => st.n;
    const dirName = () => DIRS[st.kind].find((d) => d.v === st.dir).t;
    function Fv() {
      if (st.kind === 'moving') return (G() + (st.gd ? GD : 0)) / (2 * Math.cos((st.dir * Math.PI) / 180));
      return G();
    }
    const ratio = () => (st.kind === 'moving' ? 2 : 1);
    function ready() { st.phase = 'ready'; st.t = 0; st.hh = 0; tell(); }
    function pull() { if (st.phase === 'pull') return; st.phase = 'pull'; st.t = 0; st.hh = 0; tell(); }
    function tell() {
      const done = st.phase === 'done', Fr = PS.round(Fv(), 2);
      rd.G.set(G() + ' N');
      rd.F.set(st.phase === 'ready' ? '—' : PS.fmt(Fr, Math.abs(Fr * 10 - Math.round(Fr * 10)) < 1e-6 ? 1 : 2) + ' N');
      rd.h.set(PS.fmt(st.hh * 100, 1) + ' cm'); rd.s.set(PS.fmt(st.hh * ratio() * 100, 1) + ' cm');
      recB.disabled = !done;
      let t;
      if (st.phase === 'ready') t = st.kind === 'direct' ? '先用弹簧测力计直接提起钩码，测出钩码的重力 G。' : st.kind === 'fixed' ? '定滑轮的轴固定在铁架台上。沿' + dirName() + '方向匀速拉动弹簧测力计，比较 F 与 G、s 与 h。' : '动滑轮和钩码一起上升。' + dirName() + '匀速拉动弹簧测力计，比较 F 与 G、s 与 h。';
      else if (st.phase === 'pull') t = '匀速拉动中……弹簧测力计的示数保持不变。';
      else t = '钩码上升了 ' + PS.fmt(st.hh * 100, 0) + ' cm，绳子自由端移动了 ' + PS.fmt(st.hh * ratio() * 100, 0) + ' cm。点“记录”，再换钩码个数或拉力方向试一试。';
      msg.className = 'fc-msg ' + (done ? 'ok' : 'info'); msg.innerHTML = t;
    }
    function record() {
      if (st.phase !== 'done') return;
      const key = [st.kind, st.dir, st.n, st.kind === 'moving' ? st.gd : 0].join('|');
      if (st.rows.some((r) => r.key === key)) { msg.className = 'fc-msg bad'; msg.innerHTML = '这组已经记录过了，换钩码个数或拉力方向。'; PS.sound.bad(); return; }
      st.rows.push({ key, kind: st.kind, dir: st.dir, dn: dirName(), G: G(), F: PS.round(Fv(), 2), hh: 10, s: 10 * ratio(), gd: st.gd });
      if (st.rows.length > 10) st.rows.shift();
      PS.sound.good(); table();
    }
    function table() {
      tbody.innerHTML = '';
      const nm = { direct: '直接提', fixed: '定滑轮', moving: '动滑轮' };
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, nm[r.kind]), h('td', null, r.dn), h('td', null, String(r.G)), h('td', null, h('b', null, PS.fmt(r.F, Math.abs(r.F * 10 - Math.round(r.F * 10)) < 1e-6 ? 1 : 2))), h('td', null, String(r.hh)), h('td', null, String(r.s)))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 6, class: 'muted' }, '还没有数据')));
      const R = st.rows, line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      const fx = R.filter((r) => r.kind === 'fixed'), mv = R.filter((r) => r.kind === 'moving');
      const fxDirs = new Set(fx.map((r) => r.dir)).size > 1;
      let s = line(fx.length > 0, '使用<b>定滑轮</b>：F = G，<b>不省力</b>；s = h，不省距离；但可以<b>改变力的方向</b>。')
        + line(fxDirs, '沿不同方向拉定滑轮，拉力的大小<b>不变</b>。')
        + line(mv.some((r) => r.dir === 0), '使用<b>动滑轮</b>竖直向上拉：F = <span class="frac"><span>G + G动</span><span>2</span></span>，<b>省力</b>（考虑动滑轮重时略大于 G 的一半）；s = 2h，<b>费距离</b>；不能改变力的方向。')
        + line(mv.some((r) => r.dir > 0), '斜着拉动滑轮，拉力<b>变大</b>，不再省一半力。');
      if (fx.length && mv.length) s += '<div class="tip tip-good" style="margin:8px 0 0">定滑轮可以改变力的方向，但不省力；动滑轮可以省力，但费距离。<b>省力的机械必然费距离。</b></div>';
      ana.innerHTML = s;
    }

    // ---------- 场景 ----------
    const scene = S.scene;
    const stand = MC.stand3d({ x: -0.3, z: 0, H: 0.82, armY: ARM, arm: 0.48 }); scene.add(stand.group);
    const fixedP = MC.pulley3d(RG, { strap: 1, len: ARM - 0.006 - 0.66 - 0.016 - RG * 1.22 }); fixedP.group.position.set(0, 0.66, 0); scene.add(fixedP.group);
    const movP = MC.pulley3d(RG, { strap: -1, len: 0.03 }); scene.add(movP.group);
    const rope = MC.rope3d(scene, { r: 0.0017 });
    const hooks = new THREE.Group(); scene.add(hooks);
    let hookN = -1;
    const sc = MC.scale3d({ max: 5, div: 0.1 }); scene.add(sc.group);
    const hand = MC.hand3d(); scene.add(hand);
    const tieM = new THREE.Mesh(new THREE.SphereGeometry(0.005, 10, 8), MC.mat(0x495057)); scene.add(tieM);
    const LB = { p: S.lab(''), G: S.lab(''), sc: S.lab('弹簧测力计'), F: S.lab('', 'ref'), hs: S.lab('', 'still') };
    const up = new THREE.Vector3(0, 1, 0);

    PS.loop((dt) => {
      if (st.phase === 'pull') {
        st.t += dt; st.hh = HMAX * Math.min(1, st.t / 2.2);
        if (st.t >= 2.2) { st.phase = 'done'; PS.sound.ping(); }
        tell();
      }
      if (hookN !== st.n) { while (hooks.children.length) hooks.remove(hooks.children[0]); hooks.add(MC.hooks3d(st.n, { r: 0.012, h: 0.022 }).group); hookN = st.n; }
      const F = st.phase === 'ready' ? 0 : Fv(), hy = sc.set(F);
      fixedP.group.visible = st.kind === 'fixed'; movP.group.visible = st.kind === 'moving'; tieM.visible = st.kind === 'moving';
      let path = null, hookPt, d, wTop, pulleyC = null;
      if (st.kind === 'direct') {
        wTop = V(0.02, 0.36 + st.hh); d = up.clone(); hookPt = wTop.clone();
      } else if (st.kind === 'fixed') {
        const Cc = fixedP.group.position, a = (st.dir * Math.PI) / 180;
        d = V(Math.sin(a), -Math.cos(a)); const T = V(Cc.x - d.y * RG, Cc.y + d.x * RG);
        wTop = V(Cc.x - RG, 0.34 + st.hh);
        hookPt = T.clone().addScaledVector(d, (st.dir === 90 ? 0.16 : 0.18) + st.hh);
        path = { segs: [[wTop.x, wTop.y, Cc.x - RG, Cc.y], [T.x, T.y, hookPt.x, hookPt.y]], arcs: [{ x: Cc.x, y: Cc.y, r: RG, a0: Math.PI, d: Math.atan2(T.y - Cc.y, T.x - Cc.x) - Math.PI }] };
        fixedP.wheel.rotation.z = -st.hh / RG; pulleyC = Cc;
      } else {
        const f = (st.dir * Math.PI) / 180, Cc = V(0.21, 0.3 + st.hh);
        movP.group.position.copy(Cc); movP.wheel.rotation.z = st.hh / RG;
        const TL = V(Cc.x - RG * Math.cos(f), Cc.y - RG * Math.sin(f)), TR = V(Cc.x + RG * Math.cos(f), Cc.y - RG * Math.sin(f));
        const uL = V(-Math.sin(f), Math.cos(f)); d = V(Math.sin(f), Math.cos(f));
        const tie = TL.clone().addScaledVector(uL, (ARM - 0.006 - TL.y) / Math.cos(f));
        tieM.position.copy(tie);
        hookPt = TR.clone().addScaledVector(d, 0.08 + st.hh * 2);
        path = { segs: [[tie.x, tie.y, TL.x, TL.y], [TR.x, TR.y, hookPt.x, hookPt.y]], arcs: [{ x: Cc.x, y: Cc.y, r: RG, a0: -Math.PI + f, d: Math.PI - 2 * f }] };
        wTop = V(Cc.x, Cc.y + movP.group.userData.hookY); pulleyC = Cc;
      }
      hooks.position.copy(wTop);
      if (path) rope.update(path); else rope.update({ segs: [], arcs: [] });
      // 弹簧测力计：挂钩在 hookPt，拉环沿拉力方向 d
      if (st.kind === 'direct') { sc.group.quaternion.set(0, 0, 0, 1); sc.group.position.set(wTop.x, wTop.y - hy, 0); }
      else { sc.group.quaternion.setFromUnitVectors(up, d); sc.group.position.copy(hookPt).sub(V(0, hy, 0).applyQuaternion(sc.group.quaternion)); }
      hand.position.copy(sc.group.position).addScaledVector(st.kind === 'direct' ? up : d, 0.022);
      S.render();
      const kname = { direct: '', fixed: '定滑轮', moving: '动滑轮' }[st.kind];
      LB.p.innerHTML = kname; S.place(LB.p, pulleyC ? pulleyC.clone().add(V(-0.1, 0.02, 0)) : null);
      LB.G.innerHTML = '钩码 G = ' + G() + ' N'; S.place(LB.G, wTop.clone().add(V(-0.14, -0.03 - st.n * 0.034 / 2, 0)));
      S.place(LB.sc, sc.group.position.clone().add(V(0, -0.11, 0).applyQuaternion(sc.group.quaternion)).add(V(0.11, 0, 0)));
      if (st.phase !== 'ready') { LB.F.innerHTML = 'F = ' + PS.fmt(Fv(), 2) + ' N'; S.place(LB.F, hand.position.clone().add(V(0.06, 0.03, 0))); } else S.place(LB.F, null);
      if (st.phase !== 'ready') { LB.hs.innerHTML = 'h = ' + PS.fmt(st.hh * 100, 0) + ' cm，s = ' + PS.fmt(st.hh * ratio() * 100, 0) + ' cm'; S.place(LB.hs, V(-0.06, 0.16, 0.1)); } else S.place(LB.hs, null);
    }, S.view).start();
    el._st = st;
    dirs(); ready(); table();
  });

  /* ================= 测量滑轮组的机械效率 ================= */
  const BLOCKS = {
    a: { name: '甲：一定一动', nf: 1, nm: 1, gd: 0.5, fr: 0.9025 },
    b: { name: '乙：两定两动', nf: 2, nm: 2, gd: 0.8, fr: 0.84 },
  };
  function seqOf(B) { const s = []; let uf = 0, um = 0, top = true; for (;;) { if (top) { if (uf >= B.nf) break; uf++; s.push(true); } else { if (um >= B.nm) break; um++; s.push(false); } top = !top; } return s; }
  PS.register('eta-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const MC = PS.mc;
    const RG = 0.024, ARM = 0.7, YF = 0.62, YM0 = 0.3;
    const st = { b: 'a', n: 2, H: 0.1, mode: 'ok', phase: 'ready', t: 0, hh: 0, checked: false, rows: [] };
    const S = setup(el, '4 / 5', [0.35, 0.72, 1.85], [0.05, 0.6, 0]);
    S.view.style.aspectRatio = '4 / 5';
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, S.view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察，滚轮缩放。每个钩码重 1 N；刻度尺测量钩码上升的高度 h 和绳端移动的距离 s。')), side));
    const bSeg = PS.ui.seg(Object.keys(BLOCKS).map((k) => ({ value: k, label: BLOCKS[k].name })), st.b, (v) => { st.b = v; build(); ready(); });
    const nSeg = PS.ui.seg([1, 2, 3, 4].map((n) => ({ value: n, label: n + ' N' })), st.n, (v) => { st.n = v; ready(); });
    const hSeg = PS.ui.seg([{ value: 0.05, label: '5 cm' }, { value: 0.1, label: '10 cm' }], st.H, (v) => { st.H = v; ready(); });
    const mSeg = PS.ui.seg([{ value: 'ok', label: '竖直向上匀速拉动' }, { value: 'still', label: '静止时读数' }, { value: 'fast', label: '加速向上拉' }], st.mode, (v) => { st.mode = v; ready(); });
    mSeg.el.style.flexWrap = 'wrap';
    const goB = PS.ui.button('▶ 拉动弹簧测力计', pull, 'btn btn-primary btn-sm');
    const rd = { G: PS.ui.readout('钩码重 G', '—', 'primary'), h: PS.ui.readout('钩码上升 h', '—'), F: PS.ui.readout('拉力 F', '—', 'accent'), s: PS.ui.readout('绳端移动 s', '—') };
    const zoomBox = h('div', { class: 'mc-zoom' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: 'η' });
    const chkB = PS.ui.button('检查', check, 'btn btn-primary btn-sm'), recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择滑轮组和钩码'), bSeg.el, h('div', { class: 'small muted', style: { marginTop: '6px' } }, '钩码的总重 G'), nSeg.el, h('div', { class: 'small muted', style: { marginTop: '6px' } }, '钩码上升的高度 h'), hSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 拉动弹簧测力计'), mSeg.el, h('div', { class: 'row' }, goB)),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数'), h('div', { class: 'mc-read' }, rd.G.el, rd.h.el, rd.F.el, rd.s.el), zoomBox),
      h('div', { class: 'panel' }, h('h4', null, '④ 计算机械效率'), h('div', { class: 'fc-ans' }, h('span', { html: 'η = <span class="frac"><span>Gh</span><span>Fs</span></span> =' }), inp, h('span', null, '%'), chkB, recB), msg),
      h('div', { class: 'panel' }, h('h4', null, '⑤ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['装置', 'G/N', 'h/m', 'F/N', 's/m', 'W有/J', 'W总/J', 'η'].map((t) => h('th', null, t)))), tbody)), PS.ui.row(PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '⑥ 分析论证' : '⑥ 你发现了什么？'), ana));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const ZS = PS.stage(zoomBox, { ratio: '220 / 150', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 220, 150); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 220, 150); PS.force.scaleZoom(ctx, st.phase === 'ready' ? 0 : Fr(), { x: 24, y: 22, w: 172, h: 120, max: 5, div: 0.1, F2: F, span: 0.35, title: '🔍 测力计示数' }); } });

    const B = () => BLOCKS[st.b];
    const SEQ = () => seqOf(B());
    const nSup = () => { const s = SEQ(); let n = 0; for (let i = 0; i <= s.length; i++) { const a = i === 0 ? true : !s[i - 1], b = i < s.length ? !s[i] : false; if (a || b) n++; } return n; };
    function Fr() {
      const n = nSup(), base = (st.n + B().gd) / n;
      const f = st.mode === 'still' ? base : st.mode === 'fast' ? (base / B().fr) * 1.15 : base / B().fr;
      return PS.round(f, 1);
    }
    const eta = () => (st.n * st.H) / (Fr() * nSup() * st.H);
    function ready() { st.phase = 'ready'; st.t = 0; st.hh = 0; st.checked = false; inp.value = ''; tell(); }
    function pull() { if (st.phase === 'pull') return; ready(); st.phase = 'pull'; tell(); }
    function tell() {
      const done = st.phase === 'done', n = nSup();
      rd.G.set(st.n + ' N'); rd.h.set(done ? PS.fmt(st.H, 2) + ' m' : '—'); rd.s.set(done ? PS.fmt(st.H * n, 2) + ' m' : '—');
      rd.F.set(st.phase === 'ready' ? '—' : PS.fmt(Fr(), 1) + ' N');
      chkB.disabled = !done; recB.disabled = !(done && st.checked); inp.disabled = !done;
      ZS.render();
      let t, c = 'info';
      if (st.phase === 'ready') t = '用弹簧测力计测出钩码的重力 G，记下钩码和绳端的位置。然后拉动弹簧测力计，使钩码升高 h，读出拉力 F，用刻度尺测出 h 和绳端移动的距离 s。';
      else if (st.phase === 'pull') t = st.mode === 'ok' ? '<b>竖直向上匀速</b>拉动弹簧测力计，示数稳定，边拉边读数。' : st.mode === 'fast' ? '加速拉动时，弹簧测力计的示数偏大。' : '静止时读数：此时绳与滑轮之间没有滑动，测不出摩擦的影响，示数偏小。';
      else if (st.checked) { t = '✔ 计算正确。点“记录”保存这组数据。'; c = 'ok'; }
      else t = '读数完毕：G = ' + st.n + ' N，h = ' + PS.fmt(st.H, 2) + ' m，F = ' + PS.fmt(Fr(), 1) + ' N，s = ' + PS.fmt(st.H * n, 2) + ' m。算出机械效率 η = W有/W总 = Gh/(Fs)，填百分数（保留一位小数）。';
      msg.className = 'fc-msg ' + c; msg.innerHTML = t;
    }
    function check() {
      if (st.phase !== 'done') return;
      const v = PS.en.parse(inp.value.replace('%', '')), e = eta() * 100;
      if (isNaN(v)) { inp.focus(); return; }
      const ok = Math.abs(v - e) <= 0.15 || (v < 1.01 && Math.abs(v * 100 - e) <= 0.15);
      if (ok && v < 1.01) { msg.className = 'fc-msg bad'; msg.innerHTML = '机械效率请填<b>百分数</b>中的数字：' + PS.fmt(v, 3) + ' = ' + PS.fmt(e, 1) + '%，填 ' + PS.fmt(e, 1) + '。'; PS.sound.bad(); return; }
      st.checked = ok;
      if (ok) PS.sound.good(); else PS.sound.bad();
      if (!ok) { msg.className = 'fc-msg bad'; msg.innerHTML = '✘ 再算一算：W有 = Gh = ' + st.n + ' N × ' + PS.fmt(st.H, 2) + ' m，W总 = Fs = ' + PS.fmt(Fr(), 1) + ' N × ' + PS.fmt(st.H * nSup(), 2) + ' m，η = W有/W总。'; recB.disabled = true; return; }
      tell();
    }
    function record() {
      if (!st.checked) return;
      const n = nSup(), key = [st.b, st.n, st.H, st.mode].join('|');
      if (st.rows.some((r) => r.key === key)) { msg.className = 'fc-msg bad'; msg.innerHTML = '这组已经记录过了，换一组钩码、高度或滑轮组。'; PS.sound.bad(); return; }
      st.rows.push({ key, b: st.b, G: st.n, H: st.H, F: Fr(), s: st.H * n, mode: st.mode, eta: eta() });
      if (st.rows.length > 10) st.rows.shift();
      st.checked = false; PS.sound.good(); table(); tell();
      msg.className = 'fc-msg ok'; msg.innerHTML = '已记录。改变钩码的重、提升的高度或换一个滑轮组，再测几次。';
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, (r.b === 'a' ? '甲' : '乙') + (r.mode !== 'ok' ? ' ⚠' : '')), h('td', null, String(r.G)), h('td', null, PS.fmt(r.H, 2)), h('td', null, PS.fmt(r.F, 1)), h('td', null, PS.fmt(r.s, 2)),
        h('td', null, PS.fmt(r.G * r.H, 2)), h('td', null, PS.fmt(r.F * r.s, 3)), h('td', null, h('b', null, PS.fmt(r.eta * 100, 1) + '%')))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 8, class: 'muted' }, '还没有数据')));
      const R = st.rows.filter((r) => r.mode === 'ok'), line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      const sameB = R.some((a) => R.some((b) => a.b === b.b && a.G !== b.G));
      const sameG = R.some((a) => R.some((b) => a.G === b.G && a.b !== b.b));
      const sameH = R.some((a) => R.some((b) => a.b === b.b && a.G === b.G && a.H !== b.H));
      let s = line(sameB, '同一滑轮组，提升的钩码<b>越重</b>，机械效率<b>越高</b>。')
        + line(sameG, '提升相同的钩码，动滑轮<b>越多（越重）</b>的滑轮组，额外功越多，机械效率<b>越低</b>。')
        + line(sameH, '同一滑轮组提升相同的钩码，机械效率与钩码<b>上升的高度无关</b>。');
      if (st.rows.some((r) => r.mode === 'still')) s += '<div class="tip tip-warn" style="margin:8px 0 0">带 ⚠ 的“静止时读数”：没有测出摩擦的影响，拉力偏小，算出的 η <b>偏大</b>。实验中要<b>竖直向上匀速</b>拉动弹簧测力计。</div>';
      else if (st.rows.some((r) => r.mode === 'fast')) s += '<div class="tip tip-warn" style="margin:8px 0 0">带 ⚠ 的“加速向上拉”：示数偏大，算出的 η 偏小。</div>';
      if (sameB && sameG) s += '<div class="tip tip-good" style="margin:8px 0 0">提高滑轮组机械效率的方法：<b>增加物重</b>、<b>减小动滑轮的重</b>、<b>减小摩擦</b>（加润滑油）。机械效率总小于 100%。</div>';
      ana.innerHTML = s;
    }

    // ---------- 场景 ----------
    const scene = S.scene;
    const stand = MC.stand3d({ x: -0.32, z: 0, H: 0.76, armY: ARM, arm: 0.48 }); scene.add(stand.group);
    const rope = MC.rope3d(scene, { r: 0.0016 });
    const dyn = new THREE.Group(); scene.add(dyn);
    let P = [], frame = null, tieM = null, hookG = new THREE.Group(), hookN = -1;
    scene.add(hookG);
    const sc = MC.scale3d({ max: 5, div: 0.1 }); scene.add(sc.group);
    const hand = MC.hand3d(); scene.add(hand);
    // 竖直的刻度尺（1.2 m，cm 刻度）
    const rc = document.createElement('canvas'); rc.width = 90; rc.height = 1200;
    const r2 = rc.getContext('2d');
    r2.fillStyle = '#fff3bf'; r2.fillRect(0, 0, 90, 1200); r2.strokeStyle = '#495057'; r2.fillStyle = '#343a40'; r2.font = 'bold 22px sans-serif';
    for (let c = 0; c <= 120; c++) { const y = 1200 - c * 10; r2.lineWidth = c % 10 ? 1.5 : 3; r2.beginPath(); r2.moveTo(0, y); r2.lineTo(c % 10 ? (c % 5 ? 16 : 24) : 34, y); r2.stroke(); if (c % 10 === 0 && c > 0 && c < 120) r2.fillText(String(c), 38, y + 8); }
    const ruler = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 1.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rc) }));
    scene.add(ruler);
    const mk = (c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.004), MC.mat(c)); scene.add(m); return m; };
    const mL0 = mk(0x1c7ed6), mL1 = mk(0x1c7ed6), mS0 = mk(0xe8590c), mS1 = mk(0xe8590c);
    const LB = { G: S.lab(''), sc: S.lab('弹簧测力计'), F: S.lab('', 'ref'), h: S.lab('', 'still'), s: S.lab('', 'moving'), fx: S.lab('定滑轮'), mv: S.lab('动滑轮') };
    let xs = [];
    function build() {
      while (dyn.children.length) dyn.remove(dyn.children[0]);
      const seq = SEQ(), m = seq.length;
      xs = []; for (let i = 0; i <= m; i++) xs.push(-RG * m + i * 2 * RG);
      P = seq.map((top, j) => {
        const p = MC.pulley3d(RG, top ? { strap: 1, len: ARM - 0.006 - YF - 0.016 - RG * 1.22 } : {});
        p.top = top; p.x = xs[j] + RG; dyn.add(p.group);
        if (top) p.group.position.set(p.x, YF, 0);
        return p;
      });
      const mv = P.filter((p) => !p.top), x0 = xs[0], x1 = Math.max(...mv.map((p) => p.x));
      frame = new THREE.Group(); dyn.add(frame);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.012, 0.008, 0.006), MC.mat(0x868e96, { metalness: 0.5 })); bar.position.set((x0 + x1) / 2, 0, -0.011); frame.add(bar);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, 0.004), MC.mat(0x868e96, { metalness: 0.5 })); plate.position.set((x0 + x1) / 2, -0.026, -0.011); frame.add(plate);
      tieM = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), MC.mat(0x495057)); tieM.position.set(x0, 0, 0); frame.add(tieM);
      frame.userData.mid = (x0 + x1) / 2;
      ruler.position.set(xs[m] + 0.075, 0.6, -0.01);
      hookN = -1;
    }
    PS.loop((dt) => {
      if (st.phase === 'pull') {
        st.t += dt; st.hh = st.H * Math.min(1, st.t / 2.6);
        if (st.t >= 2.6) { st.phase = 'done'; PS.sound.ping(); }
        tell();
      }
      const seq = SEQ(), m = seq.length, n = nSup(), ym = YM0 + st.hh;
      frame.position.set(0, ym, 0);
      if (hookN !== st.n) { while (hookG.children.length) hookG.remove(hookG.children[0]); hookG.add(MC.hooks3d(st.n, { r: 0.012, h: 0.022 }).group); hookN = st.n; }
      hookG.position.set(frame.userData.mid, ym - 0.05, 0);
      let sup = 0;
      P.forEach((p, j) => {
        const a = j === 0 ? true : !P[j - 1].top, b = !p.top;
        if (a || b) sup++;
        if (!p.top) p.group.position.set(p.x, ym, 0);
        p.wheel.rotation.z = ((p.top ? -1 : 1) * sup * st.hh) / RG;
      });
      const F = st.phase === 'ready' ? 0 : Fr(), hy = sc.set(F);
      const hookY = ym + 0.07 + n * st.hh;
      const nodes = [{ x: xs[0], y: ym }].concat(P.map((p) => ({ x: p.x, y: p.top ? YF : ym, r: RG, s: p.top ? -1 : 1 })), [{ x: xs[m], y: hookY }]);
      rope.update(MC.belt(nodes));
      sc.group.quaternion.set(0, 0, 0, 1); sc.group.position.set(xs[m], hookY - hy, 0);
      hand.position.set(xs[m], sc.group.position.y + 0.024, 0);
      // 刻度尺上的记号：钩码底部、测力计挂钩
      const hBot = ym - 0.05 - st.n * 0.034, rx = ruler.position.x;
      const h0 = YM0 - 0.05 - st.n * 0.034, s0 = YM0 + 0.07;
      mL0.position.set(rx, h0, 0); mL1.position.set(rx, hBot, 0.002); mS0.position.set(rx, s0, 0); mS1.position.set(rx, hookY, 0.002);
      mL1.visible = mS1.visible = st.phase !== 'ready';
      S.render();
      LB.G.innerHTML = 'G = ' + st.n + ' N'; S.place(LB.G, V(frame.userData.mid - 0.08, hBot + 0.03, 0));
      S.place(LB.sc, sc.group.position.clone().add(V(-0.085, -0.15, 0)));
      if (st.phase !== 'ready') { LB.F.innerHTML = 'F = ' + PS.fmt(Fr(), 1) + ' N'; S.place(LB.F, sc.group.position.clone().add(V(-0.085, -0.03, 0))); } else S.place(LB.F, null);
      if (st.phase !== 'ready') { LB.h.innerHTML = 'h = ' + PS.fmt(st.hh * 100, 1) + ' cm'; LB.s.innerHTML = 's = ' + PS.fmt(st.hh * n * 100, 1) + ' cm'; S.place(LB.h, V(rx + 0.08, (h0 + hBot) / 2, 0)); S.place(LB.s, V(rx + 0.08, (s0 + hookY) / 2 + 0.03, 0)); }
      else { S.place(LB.h, null); S.place(LB.s, null); }
      S.place(LB.fx, V(xs[0] - 0.07, YF + 0.04, 0)); S.place(LB.mv, V(xs[0] - 0.07, ym - 0.02, 0));
    }, S.view).start();
    el._st = st; el._eta = () => eta();
    build(); ready(); table();
  });
})();
