/* 第11章第4节：3D 滚摆与单摆——滚摆的上下运动、单摆的摆动、铁锁会不会打到鼻子；动能、重力势能、内能柱状图，有无空气阻力。依赖 three.js、OrbitControls、energy.js（.fc-* 样式来自 force.js） */
(function () {
  'use strict';
  const { h } = PS;
  const TOP = 1.0, G = 9.8;
  const MODES = { roll: '滚摆', pend: '单摆', lock: '铁锁摆向鼻子' };

  PS.register('pendulum-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { mode: 'roll', air: true, run: false, ang0: 40, th: 0, w: 0, s: 0, u: 0, rot: 0, E0: 1, q: 0, T: 0, lastMsg: '', hit: false, minGap: 1 };
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '5 / 4' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。柱状图中的能量是示意的相对大小。')), side));

    // ---------- 控件 ----------
    const mSeg = PS.ui.seg(Object.keys(MODES).map((k) => ({ value: k, label: MODES[k] })), st.mode, (v) => { st.mode = v; setup(); });
    mSeg.el.style.flexWrap = 'wrap';
    const sA = PS.ui.slider({ label: '拉开的角度', min: 15, max: 60, step: 5, value: st.ang0, unit: '°', onInput: (v) => { st.ang0 = v; reset(); } });
    const airT = PS.ui.toggle('有空气阻力和摩擦', st.air, (v) => { st.air = v; reset(); });
    const goB = PS.ui.button('▶ 松手', () => { if (st.run) return; reset(); st.run = true; tell(); }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const gbox = h('div');
    const angRow = h('div', null, sA.el);
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择实验'), mSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 条件'), angRow, airT.el, h('div', { class: 'row', style: { marginTop: '6px' } }, goB, PS.ui.button('放回起点', reset, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, '③ 能量的转化'), gbox, msg));
    const bars = PS.stage(gbox, { ratio: '300 / 230', draw: (ctx, w, hh) => {
      const F = PS.virtual(ctx, w, hh, 300, 230);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 230);
      const E = energies();
      PS.en.bars(ctx, 6, 8, 288, 216, [{ n: '动能', v: E.k, c: PS.EC.k }, { n: '重力\n势能', v: E.g, c: PS.EC.g }, { n: '内能\n(增加)', v: E.q, c: PS.EC.q }, { n: '机械\n能', v: E.k + E.g, c: PS.EC.m }], { F, max: st.E0 * 1.05, values: false, lines: 2, bg: false });
    } });

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);
    const camera = new THREE.PerspectiveCamera(40, 5 / 4, 0.01, 20);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.minDistance = 0.5; controls.maxDistance = 5; controls.maxPolarAngle = Math.PI * 0.6;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(0.8, 2.5, 1.6); scene.add(dl);
    const Std = (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {}));
    const ironM = Std(0x495057, { metalness: 0.4, roughness: 0.5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.4), Std(0xd9a86c)); base.position.y = -0.015; scene.add(base);
    [-0.42, 0.42].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, TOP, 12), ironM); p.position.set(x, TOP / 2, 0); scene.add(p); });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.86, 12), ironM); bar.rotation.z = Math.PI / 2; bar.position.y = TOP; scene.add(bar);
    const lineM = new THREE.LineBasicMaterial({ color: 0x343a40 });
    const mkLine = () => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); const l = new THREE.Line(g, lineM); scene.add(l); return l; };
    const setLine = (l, a, b) => { const p = l.geometry.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; };
    // 滚摆
    const RW = 0.13, RA = 0.007, S_TOP = 0.16, S_BOT = 0.74; // 轮半径、轴半径、绳子放出的长度范围
    const wheel = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(RW, RW, 0.035, 40), Std(0xf08c00, { metalness: 0.3, roughness: 0.4 })); disc.rotation.x = Math.PI / 2; wheel.add(disc);
    for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(RW * 1.9, 0.012, 0.037), Std(0x7a3e00)); sp.rotation.z = (i * Math.PI) / 4; wheel.add(sp); }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(RA, RA, 0.32, 12), ironM); axle.rotation.x = Math.PI / 2; wheel.add(axle);
    scene.add(wheel);
    const rl1 = mkLine(), rl2 = mkLine();
    // 单摆的小球、铁锁
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), Std(0xadb5bd, { metalness: 0.85, roughness: 0.25 })); scene.add(bob);
    const lock = new THREE.Group();
    const lb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.075, 0.035), Std(0x868e96, { metalness: 0.7, roughness: 0.35 })); lb.position.y = -0.055; lock.add(lb);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 20, Math.PI), Std(0xced4da, { metalness: 0.8 })); sh.position.y = -0.018; lock.add(sh);
    scene.add(lock);
    const pl = mkLine();
    // 人头（铁锁）
    const head = new THREE.Group();
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 18), Std(0xffd8a8, { roughness: 0.7 })); head.add(face);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.103, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.45), Std(0x343a40)); hair.rotation.z = 0.5; head.add(hair);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 12), Std(0xf4a97a)); nose.rotation.z = Math.PI / 2; nose.position.set(-0.115, -0.01, 0); head.add(nose);
    [-0.035, 0.035].forEach((z) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), Std(0x212529)); e.position.set(-0.085, 0.03, z); head.add(e); });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 20), Std(0x3b5bdb)); body.position.set(0.02, -0.38, 0); head.add(body);
    scene.add(head);
    // 位置标记
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const LB = { a: lab('A'), b: lab('B'), c: lab('C'), n: lab('', 'ref') };
    const v3 = new THREE.Vector3();
    function place(e, p) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-50%)';
    }

    const L = () => (st.mode === 'lock' ? 0.78 : 0.62);
    const th0 = () => (st.mode === 'lock' ? 35 : st.ang0) * Math.PI / 180;
    const pivot = new THREE.Vector3(0, TOP, 0);
    const A0 = G / 30; // 滚摆的加速度（转动惯量大，下降得慢）
    function energies() {
      if (st.mode === 'roll') { const k = 0.5 * (G / A0) * st.u * st.u, g = G * (S_BOT - st.s); return { k, g, q: Math.max(0, st.E0 - k - g) }; }
      const k = 0.5 * L() * L() * st.w * st.w, g = G * L() * (1 - Math.cos(st.th)); return { k, g, q: Math.max(0, st.E0 - k - g) };
    }
    function setup() {
      angRow.style.display = st.mode === 'pend' ? '' : 'none';
      const cams = { roll: [[0.25, 0.75, 1.75], [0, 0.55, 0]], pend: [[0.3, 0.7, 1.8], [0, 0.55, 0]], lock: [[0.9, 0.8, 1.7], [0.15, 0.55, 0]] };
      camera.position.set(...cams[st.mode][0]); controls.target.set(...cams[st.mode][1]);
      wheel.visible = st.mode === 'roll'; rl1.visible = rl2.visible = st.mode === 'roll';
      bob.visible = st.mode === 'pend'; lock.visible = head.visible = st.mode === 'lock'; pl.visible = st.mode !== 'roll';
      if (st.mode === 'lock') {
        const p0 = pivot.clone().add(new THREE.Vector3(Math.sin(th0()) * L(), -Math.cos(th0()) * L(), 0));
        // 铁锁（倾斜 35°）的中心在挂点下方 0.055 处，右边缘约在 +0.08；鼻尖（头的局部坐标 x = −0.135）正好碰到它
        head.position.set(p0.x + 0.08 + 0.135 + 0.004, p0.y - 0.035, 0);
      }
      reset();
    }
    function reset() {
      st.run = false; st.T = 0; st.hit = false; st.minGap = 1;
      if (st.mode === 'roll') { st.s = S_TOP; st.u = 0; st.E0 = G * (S_BOT - S_TOP); }
      else { st.th = th0(); st.w = 0; st.E0 = G * L() * (1 - Math.cos(st.th)); }
      tell(); bars.render();
    }
    function tell() {
      let t;
      if (!st.run && st.T === 0) t = st.mode === 'roll' ? '把滚摆的细绳绕在轴上，使它升到最高点，然后松手。猜一猜：它下降、上升时能量怎样转化？' : st.mode === 'pend' ? '把小球拉到 A 点，然后松手，观察小球在 A、B、C 之间的摆动。' : '把铁锁拉到鼻子前，稳定后松手（头不要动）。铁锁摆回来时，会打到鼻子吗？' + (st.air ? '' : '<br><b>现在没有空气阻力和摩擦（理想情况）</b>。');
      else if (st.mode === 'roll') {
        if (Math.abs(st.u) < 0.03 && st.s < S_BOT - 0.1) t = '滚摆到达最高点，速度为零，动能为零，重力势能最大。' + (st.air ? '每次回到最高点都比上一次低一点：有一部分机械能转化为<b>内能</b>，机械能减小。' : '');
        else t = st.u > 0 ? '滚摆<b>下降</b>，越转越快：<span class="en-g">重力势能</span>转化为<span class="en-k">动能</span>。到最低点时转得最快，动能最大。' : '滚摆<b>上升</b>，越转越慢：<span class="en-k">动能</span>转化为<span class="en-g">重力势能</span>。';
      } else if (st.mode === 'pend') t = (st.th * st.w < 0 ? '小球向 B 点摆动：高度减小、速度增大，<span class="en-g">重力势能</span>转化为<span class="en-k">动能</span>；在最低点 B 速度最大，动能最大。' : '小球离开 B 点向高处摆：速度减小、高度增大，<span class="en-k">动能</span>转化为<span class="en-g">重力势能</span>；在最高点速度为零。') + (st.air ? '<br><span class="small">有空气阻力时，小球摆到的高度越来越低，机械能逐渐减小。</span>' : '<br><span class="small">没有阻力时，小球每次都能摆到与 A 点同样的高度（C 点），机械能守恒。</span>');
      else t = st.hit ? '没有空气阻力和摩擦时，铁锁<b>恰好回到原来的位置</b>，碰到鼻尖（但不会打疼你）——机械能守恒。实际中做不到。' : st.T > 1.2 && st.minGap < 0.2 ? '铁锁摆回来时离鼻子还差 ' + PS.fmt(st.minGap * 100, 1) + ' cm，<b>不会打到鼻子</b>。铁锁摆动时要克服空气阻力和摩擦，一部分机械能转化为内能，机械能减小，摆不回原来的高度。' : '铁锁摆出去了：重力势能 → 动能 → 重力势能……';
      if (t !== st.lastMsg) { st.lastMsg = t; msg.className = 'fc-msg ' + (st.mode === 'lock' && st.T > 1.2 ? 'ok' : 'info'); msg.innerHTML = t; }
    }

    const loop = PS.loop((dt) => {
      if (st.run) {
        st.T += dt;
        const n = 20, h1 = dt / n;
        for (let i = 0; i < n; i++) {
          if (st.mode === 'roll') {
            st.u += A0 * h1 - (st.air ? 0.15 * st.u * h1 : 0); st.s += st.u * h1;
            if (st.s >= S_BOT && st.u > 0) { st.s = S_BOT; st.u = -st.u * (st.air ? 0.93 : 1); }
            if (st.s < S_TOP) { st.s = S_TOP; st.u = 0; }
            st.rot += Math.abs(st.u) / RA * h1 * 0.05;
          } else {
            const c = st.air ? (st.mode === 'lock' ? 0.12 : 0.15) : 0;
            st.w += (-(G / L()) * Math.sin(st.th) - c * st.w) * h1; st.th += st.w * h1;
          }
        }
        if (st.mode === 'lock' && st.T > 0.8) {
          const gap = (th0() - st.th) * L();
          if (st.w > 0 || Math.abs(st.w) < 0.05) st.minGap = Math.min(st.minGap, Math.max(0, gap));
          if (!st.air && gap < 0.002 && st.T > 1.2 && !st.hit) { st.hit = true; st.run = false; PS.sound.clack(); }
          if (st.air && st.w < 0 && st.T > 1.2 && st.minGap < 0.2) { st.run = false; }
        }
        tell(); bars.render();
      }
      // 摆放
      if (st.mode === 'roll') {
        const y = TOP - st.s;
        wheel.position.set(0, y, 0); wheel.rotation.z = -st.rot;
        setLine(rl1, new THREE.Vector3(0, TOP, 0.14), new THREE.Vector3(0, y + RA, 0.14));
        setLine(rl2, new THREE.Vector3(0, TOP, -0.14), new THREE.Vector3(0, y + RA, -0.14));
      } else {
        const p = pivot.clone().add(new THREE.Vector3(Math.sin(st.th) * L(), -Math.cos(st.th) * L(), 0));
        setLine(pl, pivot, p);
        if (st.mode === 'pend') bob.position.copy(p).add(new THREE.Vector3(Math.sin(st.th) * 0.035, -Math.cos(st.th) * 0.035, 0));
        else { lock.position.copy(p); lock.rotation.z = st.th; }
      }
      controls.update();
      renderer.render(scene, camera);
      if (st.mode === 'pend') {
        const P = (a, d) => pivot.clone().add(new THREE.Vector3(Math.sin(a) * (L() + d), -Math.cos(a) * (L() + d), 0));
        LB.a.textContent = 'A'; LB.c.textContent = 'C'; LB.b.textContent = 'B';
        place(LB.a, P(th0(), 0.1)); place(LB.b, P(0, 0.11)); place(LB.c, P(-th0(), 0.1)); LB.n.style.display = 'none';
      } else if (st.mode === 'roll') {
        LB.a.textContent = '最高点'; LB.b.textContent = '最低点';
        place(LB.a, new THREE.Vector3(-0.32, TOP - S_TOP, 0)); place(LB.b, new THREE.Vector3(-0.32, TOP - S_BOT, 0));
        LB.c.style.display = 'none'; LB.n.style.display = 'none';
      } else {
        [LB.a, LB.b, LB.c].forEach((e) => (e.style.display = 'none'));
        LB.n.innerHTML = st.hit ? '碰到鼻尖！' : st.T > 1.2 && st.air && !st.run ? '没打到鼻子' : '鼻子';
        place(LB.n, head.position.clone().add(new THREE.Vector3(0, 0.17, 0)));
      }
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    setup();
    loop.start();
  });
})();
