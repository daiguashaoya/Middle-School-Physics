/* 第10章第2节：3D 探究浮力的大小跟排开液体所受重力的关系——溢水杯、小桶、弹簧测力计，四步测量（空桶、物体、浸入溢水杯、桶和水），浸没 / 浸入一半，溢水杯没装满，自动记录与分析。依赖 three.js、OrbitControls、pressure.js、buoyancy.js（.fc-*、.pr-steps 样式） */
(function () {
  'use strict';
  const { h } = PS;
  const CR = 0.055, CHT = 0.16, SPY = 0.145, AC = Math.PI * CR * CR; // 溢水杯半径、高、溢水口高度、横截面积
  const BR = 0.032, BHT = 0.05, GB = 0.4; // 小桶半径、高、重 0.4 N
  const OBJ = {
    al: { name: '铝块', V: 100, G: 2.7, color: 0xe9ecef },
    stone: { name: '石块', V: 120, G: 3.0, color: 0x868e96 },
    cu: { name: '铜块', V: 50, G: 4.45, color: 0xd9a066 },
  };
  const STEPS = ['测空小桶的重力 G桶', '测物体的重力 G物', '把物体浸入溢水杯，读出示数 F′', '测小桶和溢出液体的总重 G总'];

  PS.register('archimedes-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { obj: 'al', liq: 'water', half: false, notfull: false, step: 0, hang: null, hb: 0.26, over: 0, flowT: 0, m: {}, rows: [], busy: false };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '5 / 4' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。溢水杯装满液体时，液面与溢水口相平。')), side));

    // ---------- 控件 ----------
    const oSeg = PS.ui.seg(Object.keys(OBJ).map((k) => ({ value: k, label: OBJ[k].name })), st.obj, (v) => { st.obj = v; build(); tell(); });
    const lSeg = PS.ui.seg(['water', 'salt', 'alcohol'].map((k) => ({ value: k, label: PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; liqMat(); tell(); });
    const iSeg = PS.ui.seg([{ value: false, label: '浸没' }, { value: true, label: '浸入一半' }], st.half, (v) => { st.half = v; tell(); });
    const fT = PS.ui.toggle('溢水杯没装满（错误操作）', st.notfull, (v) => { st.notfull = v; reset(); });
    const stepUl = h('ol', { class: 'pr-steps' }, STEPS.map((t) => h('li', null, t)));
    const goB = PS.ui.button('下一步', next, 'btn btn-primary btn-sm');
    const againB = PS.ui.button('再做一次', reset, 'btn btn-ghost btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择器材'), oSeg.el, h('div', { style: { height: '6px' } }), lSeg.el, h('div', { style: { height: '6px' } }), iSeg.el, fT.el),
      h('div', { class: 'panel' }, h('h4', null, '② 按步骤测量'), stepUl, h('div', { class: 'row' }, goB, againB), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 实验记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['物体', 'G物', 'F′', 'F浮', 'G总', 'G桶', 'G排'].map((t) => h('th', null, t)))), tbody)), h('div', { class: 'small muted', style: { marginTop: '4px' } }, '单位：N。F浮 = G物 − F′，G排 = G总 − G桶。')),
      h('div', { class: 'panel' }, h('h4', null, opts.lab ? '④ 分析论证' : '④ 你发现了什么？'), ana));

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(42, 5 / 4, 0.01, 20);
    camera.position.set(0.34, 0.5, 0.98);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0.0, 0.34, 0);
    controls.enableDamping = true; controls.minDistance = 0.25; controls.maxDistance = 3; controls.maxPolarAngle = Math.PI * 0.55;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.6, 2, 1.5); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.5), Std(0xe9dcc6)); desk.position.set(0, -0.015, 0); scene.add(desk);
    const ironM = Std(0x495057, { metalness: 0.4, roughness: 0.5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.12), ironM); base.position.set(-0.24, 0.0075, -0.04); scene.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.8, 12), ironM); pole.position.set(-0.24, 0.4, -0.04); scene.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.25, 10), ironM); arm.rotation.z = Math.PI / 2; scene.add(arm);
    const clampM = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), ironM); scene.add(clampM);
    // 溢水杯
    const glassM = Std(0xbfd9ff, { transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CHT, 40, 1, true), glassM); cup.position.y = CHT / 2; scene.add(cup);
    const cupB = new THREE.Mesh(new THREE.CircleGeometry(CR, 40), glassM); cupB.rotation.x = -Math.PI / 2; cupB.position.y = 0.002; scene.add(cupB);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.07, 12, 1, true), glassM);
    spout.rotation.z = Math.PI / 2 + 0.35; spout.position.set(CR + 0.03, SPY - 0.012, 0); scene.add(spout);
    const tipX = CR + 0.062, tipY = SPY - 0.024;
    const liqM = Std(0x4dabf7, { transparent: true, opacity: 0.38, depthWrite: false });
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(CR - 0.002, CR - 0.002, 1, 40), liqM); scene.add(liq);
    const surfM = Std(0x74c0fc, { transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    const surf = new THREE.Mesh(new THREE.CircleGeometry(CR - 0.002, 40), surfM); surf.rotation.x = -Math.PI / 2; scene.add(surf);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 8), liqM); scene.add(stream);
    // 小桶
    const bucket = new THREE.Group();
    const bM = Std(0xced4da, { metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
    const bWall = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR * 0.85, BHT, 28, 1, true), bM); bWall.position.y = BHT / 2; bucket.add(bWall);
    const bBot = new THREE.Mesh(new THREE.CircleGeometry(BR * 0.85, 28), bM); bBot.rotation.x = -Math.PI / 2; bBot.position.y = 0.001; bucket.add(bBot);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.0016, 6, 24, Math.PI), Std(0x495057)); handle.position.y = BHT; bucket.add(handle);
    const bWater = new THREE.Mesh(new THREE.CylinderGeometry(BR * 0.9, BR * 0.85, 1, 24), liqM); bucket.add(bWater);
    scene.add(bucket);
    // 物体
    const objM = Std(0xe9ecef, { metalness: 0.4, roughness: 0.45 });
    let obj = null, side3 = 0.046;
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 8, 16), Std(0x868e96)); scene.add(eye);
    function build() {
      if (obj) { scene.remove(obj); obj.geometry.dispose(); }
      side3 = Math.cbrt(OBJ[st.obj].V) / 100;
      obj = new THREE.Mesh(st.obj === 'stone' ? new THREE.DodecahedronGeometry(side3 * 0.62, 0) : new THREE.BoxGeometry(side3, side3, side3), objM);
      objM.color.set(OBJ[st.obj].color); scene.add(obj);
      st.objP = new THREE.Vector3(-0.13, side3 / 2, 0.06);
    }
    // 测力计与细线
    const sc = PS.fl.scale3d({ max: 5, div: 0.1, L: 0.16 });
    scene.add(sc.group);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 1, 6), Std(0x343a40)); scene.add(thread);
    function liqMat() { const L = PS.LIQ[st.liq]; liqM.color.set(L.c2); surfM.color.set(L.c2); }
    const bucketRest = new THREE.Vector3(tipX + 0.02, 0, 0);
    st.bucketP = bucketRest.clone();

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const L = { F: lab(''), cup: lab('溢水杯'), bk: lab('小桶'), obj: lab('') };
    L.F.style.color = '#1c7ed6';
    const v3 = new THREE.Vector3();
    function place(e, p, dx) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(' + (dx || '-50%') + ',-50%)';
    }

    const rho = () => PS.LIQ[st.liq].rho;
    const Vw0 = () => AC * SPY - (st.notfull ? 60e-6 : 0);
    function vSub() { // 物体浸入液体的体积（m³）
      if (st.hang !== 'obj') return 0;
      const lv = level(), bot = st.objP.y - side3 / 2;
      return OBJ[st.obj].V * 1e-6 * PS.clamp((lv - bot) / side3, 0, 1);
    }
    function level() { return (Vw0() - st.over + st.vs) / AC; }
    function reading() {
      if (st.hang === 'bucket') return GB + rho() * 10 * st.over;
      if (st.hang === 'obj') return OBJ[st.obj].G - rho() * 10 * st.vs;
      return 0;
    }
    const r2 = (x) => PS.round(x, 2);
    function reset() {
      st.vs = 0;
      st.step = 0; st.hang = null; st.over = 0; st.vs = 0; st.m = {}; st.busy = false;
      if (obj) st.objP.set(-0.13, side3 / 2, 0.06);
      st.bucketP.copy(bucketRest);
      tell();
    }
    function next() {
      if (st.busy) return;
      if (st.step === 0) { st.hang = 'bucket'; st.hb = 0.27; }
      else if (st.step === 1) { st.hang = 'obj'; st.hb = 0.26; }
      else if (st.step === 2) { st.hb = SPY - (st.half ? side3 / 2 : side3 + 0.014); }
      else if (st.step === 3) { st.hang = 'bucket'; st.hb = 0.27; }
      else return;
      st.busy = true; st.wait = 0; PS.sound.tick(); tell();
    }
    function settled() {
      const F = r2(reading());
      if (st.step === 0) st.m.Gb = F; else if (st.step === 1) st.m.Go = F; else if (st.step === 2) st.m.Fs = F; else st.m.Gt = F;
      st.step++; st.busy = false;
      if (st.step === 4) {
        const r = { obj: st.obj, liq: st.liq, half: st.half, nf: st.notfull, Go: st.m.Go, Fs: st.m.Fs, Gt: st.m.Gt, Gb: st.m.Gb };
        r.Fb = r2(r.Go - r.Fs); r.Ge = r2(r.Gt - r.Gb);
        st.rows.push(r); if (st.rows.length > 10) st.rows.shift();
        table(); PS.sound.good();
      }
      tell();
    }
    function tell() {
      [...stepUl.children].forEach((li, i) => { li.className = i < st.step ? 'done' : i === st.step ? 'on' : ''; });
      const lock = st.step > 0 && st.step < 4;
      [oSeg, lSeg, iSeg].forEach((s) => s.el.querySelectorAll('button').forEach((b) => { b.disabled = lock; }));
      fT.input.disabled = lock;
      goB.disabled = st.busy || st.step >= 4;
      goB.textContent = st.step < 4 ? '做第 ' + (st.step + 1) + ' 步' : '已完成';
      let s, c = 'info';
      const M = st.m;
      if (st.busy) s = '操作中……';
      else if (st.step === 0) s = '先测<b>空小桶</b>的重力（桶要干的）。' + (st.notfull ? '注意：溢水杯里的' + PS.LIQ[st.liq].name + '<b>没有装满</b>。' : '溢水杯中的' + PS.LIQ[st.liq].name + '已经装到溢水口。');
      else if (st.step === 1) s = '测得 G桶 = <b>' + PS.fmt(M.Gb, 2) + ' N</b>。把小桶放回溢水口下方，再测' + OBJ[st.obj].name + '的重力。';
      else if (st.step === 2) s = '测得 G物 = <b>' + PS.fmt(M.Go, 2) + ' N</b>。接下来把物体' + (st.half ? '浸入一半' : '浸没') + '在溢水杯中，溢出的液体流进小桶。';
      else if (st.step === 3) s = '测得 F′ = <b>' + PS.fmt(M.Fs, 2) + ' N</b>，F浮 = G物 − F′ = ' + PS.fmt(M.Go - M.Fs, 2) + ' N。最后测小桶和溢出液体的总重。';
      else {
        const Fb = M.Go - M.Fs, Ge = M.Gt - M.Gb;
        s = '测得 G总 = ' + PS.fmt(M.Gt, 2) + ' N。F浮 = ' + PS.fmt(Fb, 2) + ' N，G排 = ' + PS.fmt(Ge, 2) + ' N：' + (Math.abs(Fb - Ge) < 0.005 ? '<b>F浮 = G排</b>！换物体、换液体、只浸入一半，再试试。' : '<b>F浮 > G排</b>——溢水杯没装满，物体浸入后液面先上升到溢水口才开始溢出，流进小桶的液体偏少。');
        c = Math.abs(Fb - Ge) < 0.005 ? 'ok' : 'bad';
      }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', { style: r.nf ? { color: 'var(--red)' } : null }, h('td', null, OBJ[r.obj].name.slice(0, 1) + (r.half ? '½' : '') + (r.liq !== 'water' ? '·' + PS.LIQ[r.liq].name.slice(0, 1) : '')), ...[r.Go, r.Fs, r.Fb, r.Gt, r.Gb, r.Ge].map((x, i) => h('td', null, i === 2 || i === 5 ? h('b', null, PS.fmt(x, 2)) : PS.fmt(x, 2))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 7, class: 'muted' }, '完成四步后自动记录')));
      const good = st.rows.filter((r) => !r.nf);
      const objs = new Set(good.map((r) => r.obj)), liqs = new Set(good.map((r) => r.liq)), half = good.some((r) => r.half);
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">“½”表示浸入一半，“盐”“酒”表示液体。多换几个物体和液体，使结论更具有<b>普遍性</b>。</div>';
      s += line(good.length > 0, '每一次都有 F浮 = G排');
      s += line(objs.size > 1, '换了不同的物体（' + objs.size + ' 种）');
      s += line(liqs.size > 1, '换了不同的液体（' + liqs.size + ' 种）');
      s += line(half, '物体只浸入一部分时也成立');
      if (st.rows.some((r) => r.nf)) s += '<div class="tip tip-warn" style="margin:6px 0 0">红色的一行：溢水杯没装满，G排 偏小，不能用来得出结论。</div>';
      if (good.length >= 2 && (objs.size > 1 || liqs.size > 1)) s += '<div class="tip tip-good" style="margin:8px 0 0"><b>阿基米德原理：</b>浸在液体中的物体受到向上的浮力，浮力的大小等于它排开的液体所受的重力，F浮 = G排。</div>';
      ana.innerHTML = s;
    }

    const loop = PS.loop((dt) => {
      const k = Math.min(1, dt * (st.step === 2 && st.busy ? 1.6 : 3.5));
      // 挂在测力计上的物体：底部高度趋近 st.hb；其余物体回到桌上
      const objT = st.hang === 'obj' ? new THREE.Vector3(0, st.hb + side3 / 2, 0) : new THREE.Vector3(-0.13, side3 / 2, 0.06);
      const bkT = st.hang === 'bucket' ? new THREE.Vector3(0, st.hb, 0) : bucketRest;
      st.objP.lerp(objT, k); st.bucketP.lerp(bkT, k);
      // 浸入体积与溢出
      for (let i = 0; i < 6; i++) { st.vs = vSub(); const ov = Vw0() + st.vs - AC * SPY; if (ov > st.over + 1e-9) { st.over = ov; st.flowT = 0.35; } }
      st.flowT = Math.max(0, st.flowT - dt);
      const lv = level();
      liq.scale.y = lv; liq.position.y = lv / 2; surf.position.y = lv + 0.0005;
      obj.position.copy(st.objP);
      bucket.position.copy(st.bucketP);
      const wh = (st.over / (Math.PI * BR * BR * 0.77)) || 0;
      bWater.visible = wh > 0.0005; bWater.scale.y = Math.max(0.0005, wh); bWater.position.y = wh / 2 + 0.001;
      // 测力计
      const F = reading();
      const hookL = sc.set(F);
      let ringY = 0.66, hx = 0, hz = 0;
      if (st.hang === 'obj') { ringY = st.objP.y + side3 / 2 + 0.012 + 0.03 - hookL; hx = st.objP.x; hz = st.objP.z; }
      if (st.hang === 'bucket') { ringY = st.bucketP.y + BHT + BR + 0.025 - hookL; hx = st.bucketP.x; hz = st.bucketP.z; }
      sc.group.position.set(hx, ringY, hz);
      arm.position.set(-0.115, ringY + 0.004, -0.02); arm.rotation.y = Math.atan2(0.04, 0.24); clampM.position.set(-0.24, ringY + 0.004, -0.04);
      eye.position.set(st.objP.x, st.objP.y + side3 / 2 + 0.006, st.objP.z);
      const t0 = st.hang === 'obj' ? st.objP.y + side3 / 2 + 0.012 : st.hang === 'bucket' ? st.bucketP.y + BHT + BR : 0;
      thread.visible = !!st.hang;
      if (st.hang) { const t1 = ringY + hookL; thread.scale.y = Math.max(0.001, t1 - t0); thread.position.set(hx, (t0 + t1) / 2, hz); }
      // 水流
      stream.visible = st.flowT > 0;
      if (stream.visible) { const y1 = st.bucketP.y + wh + 0.002, hh = tipY - y1; stream.scale.y = Math.max(0.001, hh); stream.position.set(tipX + 0.004, (tipY + y1) / 2, 0); }
      // 等待稳定
      if (st.busy) {
        const tgt = st.hang === 'obj' ? objT : bkT, cur = st.hang === 'obj' ? st.objP : st.bucketP;
        if (cur.distanceTo(tgt) < 0.0008) { st.wait += dt; if (st.wait > 0.3) settled(); }
      }
      controls.update();
      renderer.render(scene, camera);
      L.F.innerHTML = st.hang ? 'F = ' + PS.fmt(F, 2) + ' N' : '测力计';
      place(L.F, new THREE.Vector3(hx + 0.04, ringY - 0.06 - (F / 5) * 0.16, hz + 0.01), '0%');
      place(L.cup, new THREE.Vector3(-CR - 0.005, 0.07, 0.03), '-100%');
      place(L.bk, new THREE.Vector3(st.bucketP.x + BR + 0.008, st.bucketP.y + BHT * 0.5, 0.01), '0%');
      L.obj.innerHTML = OBJ[st.obj].name; place(L.obj, new THREE.Vector3(st.objP.x - side3 / 2 - 0.008, st.objP.y, st.objP.z), '-100%');
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    build(); liqMat(); reset(); table();
    loop.start();
  });
})();
