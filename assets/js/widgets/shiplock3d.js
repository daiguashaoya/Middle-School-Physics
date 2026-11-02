/* 第9章第2节：3D 船闸——上游、闸室、下游；阀门 A / B、闸门 C / D；船从上游驶向下游（或反过来）。依赖 three.js、OrbitControls、force.js（.fc-* 样式）、pressure.js（.pr-steps 样式） */
(function () {
  'use strict';
  const { h } = PS;
  const XC = 1.6, XL = 6.5, ZW = 0.7, WH = 2.1, LU = 1.7, LD = 0.5; // 闸门位置 ±XC，河道半宽 ZW，墙高 WH，上游 / 下游水位
  const ZONE = { up: -4.2, mid: 0, down: 4.2 };

  PS.register('shiplock-3d', function (el) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { dir: 'down', Lc: LD, A: false, B: false, C: false, D: false, gC: 0, gD: 0, vA: 0, vB: 0, ship: ZONE.up, shipT: ZONE.up, auto: false, autoT: 0, t: 0 };
    const view = h('div', { class: 'stage-3d', style: { background: '#d0ebff' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面换角度；阀门在闸门底部，用来连通闸室与上游或下游。')), side));

    const dSeg = PS.ui.seg([{ value: 'down', label: '船从上游驶往下游' }, { value: 'up', label: '船从下游驶往上游' }], st.dir, (v) => { st.dir = v; reset(); });
    dSeg.el.style.flexWrap = 'wrap';
    const btn = (k, t) => PS.ui.button(t, () => act(k), 'btn btn-sm');
    const bA = btn('A', ''), bB = btn('B', ''), bC = btn('C', ''), bD = btn('D', '');
    const goB = PS.ui.button('🚢 船前进', () => act('go'), 'btn btn-primary btn-sm');
    const autoB = PS.ui.button('▶ 自动演示', () => { reset(); st.auto = true; st.autoT = 0.8; }, 'btn btn-accent btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const ol = h('ol', { class: 'pr-steps' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 船的航向'), dSeg.el, h('div', { class: 'row' }, autoB, PS.ui.button('↺ 重来', reset, 'btn btn-ghost btn-sm'))),
      h('div', { class: 'panel' }, h('h4', null, '② 操作阀门和闸门'), h('div', { class: 'row' }, bA, bC), h('div', { class: 'row' }, bB, bD), h('div', { class: 'row' }, goB), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 过闸步骤'), ol));

    // ---------- 场景 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd0ebff);
    const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 100);
    camera.position.set(0.6, 3.4, 10.5);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true; controls.minDistance = 3; controls.maxDistance = 25; controls.maxPolarAngle = Math.PI * 0.48;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x88a070, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(4, 10, 6); scene.add(dl);
    const Lam = (c, e) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, e || {}));
    // 河床、两岸（上游河床高一些）
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2 * XL, 0.1, 2 * ZW), Lam(0xa68a64)); bed.position.y = -0.05; scene.add(bed);
    // 剖开的模型：后面是河岸的墙，前面换成透明的玻璃，便于看到三处的水面
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2 * XL, WH, 0.5), Lam(0xc9c3b6)); wall.position.set(0, WH / 2, -(ZW + 0.25)); scene.add(wall);
    const bank = new THREE.Mesh(new THREE.BoxGeometry(2 * XL, 0.1, 3), Lam(0x8ce99a)); bank.position.set(0, WH - 0.05, -(ZW + 0.5 + 1.5)); scene.add(bank);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(2 * XL, WH), Lam(0xe7f5ff, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })); front.position.set(0, WH / 2, ZW + 0.01); scene.add(front);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * XL, WH, 0.001)), new THREE.LineBasicMaterial({ color: 0x74c0fc })); edge.position.copy(front.position); scene.add(edge);
    // 闸首（闸门所在的墩，高出岸墙一点；只画后面的一半）
    [-XC, XC].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, WH + 0.25, 0.7), Lam(0xadb5bd)); b.position.set(x, (WH + 0.25) / 2, -(ZW + 0.35)); scene.add(b); });
    // 水体
    const wM = Lam(0x4dabf7, { transparent: true, opacity: 0.72 });
    const mkW = (x0, x1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 1, 2 * ZW - 0.02), wM); m.position.x = (x0 + x1) / 2; scene.add(m); return m; };
    const wU = mkW(-XL, -XC - 0.05), wC = mkW(-XC + 0.05, XC - 0.05), wD = mkW(XC + 0.05, XL);
    const setW = (m, L) => { m.scale.y = L; m.position.y = L / 2; };
    setW(wU, LU); setW(wD, LD);
    // 闸门：每道两扇人字门，绕岸边的门轴转动
    const gateM = Lam(0x495057);
    function mkGate(x) {
      const leaves = [-1, 1].map((s) => {
        const pivot = new THREE.Group(); pivot.position.set(x, 0, s * ZW);
        const g = new THREE.BoxGeometry(0.08, WH + 0.05, ZW); g.translate(0, (WH + 0.05) / 2, -s * ZW / 2);
        const leaf = new THREE.Mesh(g, gateM); pivot.add(leaf);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, ZW), Lam(0xfab005)); stripe.position.set(0, WH - 0.1, -s * ZW / 2); pivot.add(stripe);
        pivot.userData.s = s; scene.add(pivot); return pivot;
      });
      // 阀门（闸门底部的输水孔 + 可提起的闸板）
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.36), Lam(0x1b2333)); hole.position.set(x, 0.16, 0); scene.add(hole);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.4), Lam(0xe8590c)); plate.position.set(x + 0.02, 0.16, 0); scene.add(plate);
      return { leaves, plate };
    }
    const GC = mkGate(-XC), GD = mkGate(XC);
    // 水流（经阀门）的小水花
    const flowM = Lam(0xffffff, { transparent: true, opacity: 0.85 });
    const drops = []; for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), flowM); d.visible = false; scene.add(d); drops.push(d); }
    // 船
    const ship = new THREE.Group();
    (function () {
      const sh = new THREE.Shape(); sh.moveTo(-0.7, -0.22); sh.lineTo(0.55, -0.22); sh.lineTo(0.8, 0); sh.lineTo(0.55, 0.22); sh.lineTo(-0.7, 0.22); sh.closePath();
      const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.28, bevelEnabled: false }), Lam(0xe03131)); hull.rotation.x = -Math.PI / 2; hull.position.y = -0.12; ship.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.03, 0.42), Lam(0xf1f3f5)); deck.position.set(-0.07, 0.17, 0); ship.add(deck);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.32), Lam(0xffffff)); cab.position.set(-0.4, 0.32, 0); ship.add(cab);
      const fun = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 10), Lam(0x1c7ed6)); fun.position.set(-0.45, 0.55, 0); ship.add(fun);
    })();
    ship.scale.setScalar(1.35);
    scene.add(ship);

    // HTML 标签
    const lab = (t, cls) => { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; };
    const Lb = { up: lab(''), mid: lab(''), down: lab(''), A: lab('阀门 A'), B: lab('阀门 B'), C: lab('闸门 C'), D: lab('闸门 D') };
    const v3 = new THREE.Vector3();
    function place(e, p, below) {
      v3.copy(p).project(camera);
      if (v3.z > 1) { e.style.display = 'none'; return; }
      e.style.display = '';
      e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,' + (below ? '8px' : '-100%') + ')';
    }

    const eq = (a, b) => Math.abs(a - b) < 0.015;
    const shipZone = () => (Math.abs(st.ship - ZONE.up) < 0.05 ? 'up' : Math.abs(st.ship - ZONE.down) < 0.05 ? 'down' : Math.abs(st.ship) < 0.05 ? 'mid' : 'moving');
    // 两个方向的标准步骤：[说明, 判断已完成的条件]
    const STEPS = {
      down: [
        ['关闭阀门 B、闸门 D，打开上游阀门 A：闸室和上游构成连通器', () => st.A || st.C || shipZone() !== 'up'],
        ['闸室水面上升到与上游水面相平后，打开上游闸门 C', () => st.C || shipZone() !== 'up'],
        ['船从上游驶入闸室', () => shipZone() === 'mid' || shipZone() === 'down'],
        ['关闭闸门 C 和阀门 A，打开下游阀门 B：闸室和下游构成连通器', () => (!st.C && !st.A && st.B) || st.D || shipZone() === 'down'],
        ['闸室水面下降到与下游水面相平后，打开下游闸门 D', () => st.D || shipZone() === 'down'],
        ['船驶出闸室，进入下游', () => shipZone() === 'down'],
      ],
      up: [
        ['关闭阀门 A、闸门 C，打开下游阀门 B：闸室和下游构成连通器', () => st.B || st.D || shipZone() !== 'down'],
        ['闸室水面下降到与下游水面相平后，打开下游闸门 D', () => st.D || shipZone() !== 'down'],
        ['船从下游驶入闸室', () => shipZone() === 'mid' || shipZone() === 'up'],
        ['关闭闸门 D 和阀门 B，打开上游阀门 A：闸室和上游构成连通器', () => (!st.D && !st.B && st.A) || st.C || shipZone() === 'up'],
        ['闸室水面上升到与上游水面相平后，打开上游闸门 C', () => st.C || shipZone() === 'up'],
        ['船驶出闸室，进入上游', () => shipZone() === 'up'],
      ],
    };
    function steps() {
      ol.innerHTML = '';
      let cur = -1;
      STEPS[st.dir].forEach((s, i) => { const ok = s[1](); if (!ok && cur < 0) cur = i; ol.append(h('li', { class: ok ? 'done' : cur === i ? 'on' : '' }, (ok ? '✔ ' : '') + s[0])); });
      return cur;
    }
    function say(t, c) { msg.className = 'fc-msg ' + (c || 'info'); msg.innerHTML = t; }
    function labels() {
      bA.innerHTML = (st.A ? '关闭' : '打开') + '阀门 A（上游）'; bB.innerHTML = (st.B ? '关闭' : '打开') + '阀门 B（下游）';
      bC.innerHTML = (st.C ? '关闭' : '打开') + '闸门 C（上游）'; bD.innerHTML = (st.D ? '关闭' : '打开') + '闸门 D（下游）';
      [[bA, st.A], [bB, st.B], [bC, st.C], [bD, st.D]].forEach(([b, on]) => b.classList.toggle('btn-green', on));
    }
    function act(k) {
      const z = shipZone();
      if (z === 'moving') return;
      if (k === 'A' || k === 'B') {
        st[k] = !st[k]; PS.sound.tick();
        if (st.A && st.B) say('上下游阀门<b>同时打开</b>，上游的水会经闸室一直流向下游，闸室水位无法与任何一边相平。应该只打开一个阀门。', 'bad');
        else if (st[k]) say('打开阀门 ' + k + '：闸室和' + (k === 'A' ? '上游' : '下游') + '的水道下端连通、上端开口，构成<b>连通器</b>，水从水位高的一侧流向低的一侧，直到两边水面<b>相平</b>。');
        else say('关闭阀门 ' + k + '。');
      } else if (k === 'C' || k === 'D') {
        if (!st[k]) {
          const other = k === 'C' ? LU : LD;
          if (!eq(st.Lc, other)) { say('闸门 ' + k + ' 两侧水位<b>不相平</b>，水对闸门的压力很大，打不开！先打开阀门 ' + (k === 'C' ? 'A' : 'B') + '，让两侧水面相平。', 'bad'); PS.sound.bad(); return; }
          if ((k === 'C' && st.D) || (k === 'D' && st.C)) { say('两道闸门不能同时打开。', 'bad'); PS.sound.bad(); return; }
        }
        if (st[k] && Math.abs(st.ship - (k === 'C' ? -XC : XC)) < 1.1) { say('船正在闸门处，不能关闭闸门。', 'bad'); return; }
        st[k] = !st[k]; PS.sound.clack();
        say(st[k] ? '闸室水面与' + (k === 'C' ? '上游' : '下游') + '水面相平，闸门 ' + k + ' 打开了。' : '关闭闸门 ' + k + '。');
      } else if (k === 'go') {
        const fwd = st.dir === 'down' ? 1 : -1;
        const nextZ = z === 'up' ? (fwd > 0 ? 'mid' : null) : z === 'down' ? (fwd < 0 ? 'mid' : null) : fwd > 0 ? 'down' : 'up';
        if (!nextZ) { say('船已经到达目的地了。点“重来”或换一个航向。'); return; }
        const gate = (z === 'up' || nextZ === 'up') ? 'C' : 'D';
        if (!st[gate] || st['g' + gate] < 0.95) { say('闸门 ' + gate + ' 还没有打开，船过不去。', 'bad'); PS.sound.bad(); return; }
        st.shipT = ZONE[nextZ]; PS.sound.tick();
        say('船驶向' + { mid: '闸室', up: '上游', down: '下游' }[nextZ] + '……');
      }
      labels(); steps();
    }
    function reset() {
      Object.assign(st, { Lc: st.dir === 'down' ? LD : LU, A: false, B: false, C: false, D: false, auto: false });
      st.ship = st.shipT = st.dir === 'down' ? ZONE.up : ZONE.down;
      say(st.dir === 'down' ? '船要从<b>上游</b>（水位高）驶往<b>下游</b>（水位低）。现在闸室水位与下游相平，两道闸门、两个阀门都关着。按正确的顺序操作。' : '船要从<b>下游</b>（水位低）驶往<b>上游</b>（水位高）。现在闸室水位与上游相平。按正确的顺序操作。');
      labels(); steps();
    }
    // 自动演示：每次执行当前步骤需要的操作
    function autoStep() {
      const cur = steps(), z = shipZone();
      if (cur < 0) { st.auto = false; say('船顺利通过了船闸！船闸是利用<b>连通器</b>原理工作的。', 'ok'); PS.sound.good(); return; }
      const d = st.dir;
      const seq = d === 'down'
        ? [() => act('A'), () => (eq(st.Lc, LU) ? act('C') : null), () => act('go'), () => { if (st.C) act('C'); else if (st.A) act('A'); else act('B'); }, () => (eq(st.Lc, LD) ? act('D') : null), () => act('go')]
        : [() => act('B'), () => (eq(st.Lc, LD) ? act('D') : null), () => act('go'), () => { if (st.D) act('D'); else if (st.B) act('B'); else act('A'); }, () => (eq(st.Lc, LU) ? act('C') : null), () => act('go')];
      if (z !== 'moving') seq[cur]();
    }

    const loop = PS.loop((dt) => {
      st.t += dt;
      // 闸室水位：经阀门与上 / 下游连通（流量与水位差的平方根成正比）
      const flow = (L) => Math.sign(L - st.Lc) * Math.sqrt(Math.abs(L - st.Lc));
      let dL = 0;
      if (st.A || st.C) dL += flow(LU) * (st.C ? 3 : 0.55);
      if (st.B || st.D) dL += flow(LD) * (st.D ? 3 : 0.55);
      const before = st.Lc;
      st.Lc = PS.clamp(st.Lc + dL * dt, LD, LU);
      if ((st.A || st.B) && !st.C && !st.D && Math.abs(before - st.Lc) > 1e-5 && (eq(st.Lc, LU) || eq(st.Lc, LD)) && !(eq(before, LU) || eq(before, LD))) { say('闸室水面与' + (eq(st.Lc, LU) ? '上游' : '下游') + '水面<b>相平</b>了，水不再流动。', 'ok'); steps(); }
      setW(wC, st.Lc);
      // 闸门、阀门动画
      st.gC += ((st.C ? 1 : 0) - st.gC) * Math.min(1, dt * 2.5); st.gD += ((st.D ? 1 : 0) - st.gD) * Math.min(1, dt * 2.5);
      st.vA += ((st.A ? 1 : 0) - st.vA) * Math.min(1, dt * 4); st.vB += ((st.B ? 1 : 0) - st.vB) * Math.min(1, dt * 4);
      [[GC, st.gC, -1], [GD, st.gD, 1]].forEach(([G, g, sx]) => G.leaves.forEach((p) => { p.rotation.y = p.userData.s * sx * g * (Math.PI / 2) * 0.95; }));
      GC.plate.position.y = 0.16 + st.vA * 0.36; GD.plate.position.y = 0.16 + st.vB * 0.36;
      // 经阀门的水流
      const fl = [];
      if (st.vA > 0.5 && !eq(st.Lc, LU)) fl.push([-XC, LU > st.Lc ? 1 : -1]);
      if (st.vB > 0.5 && !eq(st.Lc, LD)) fl.push([XC, st.Lc > LD ? 1 : -1]);
      drops.forEach((d, i) => {
        const f = fl[i % 2] || fl[0];
        if (!f) { d.visible = false; return; }
        const ph = ((st.t * 1.2 + i / drops.length) % 1);
        d.visible = true; d.position.set(f[0] + f[1] * (ph * 1.4 - 0.5), 0.12 + Math.sin(ph * Math.PI) * 0.12, ((i * 0.37) % 0.5) - 0.25);
      });
      // 船
      if (Math.abs(st.shipT - st.ship) > 1e-3) { const v = 1.3 * dt; st.ship += PS.clamp(st.shipT - st.ship, -v, v); if (Math.abs(st.shipT - st.ship) <= 1e-3) { st.ship = st.shipT; steps(); say('船到达' + { up: '上游', mid: '闸室', down: '下游' }[shipZone()] + '。', 'ok'); } }
      const sy = st.ship < -XC ? LU : st.ship > XC ? LD : st.Lc; // 船只在闸门打开（两边水面相平）时通过闸门
      ship.position.set(st.ship, sy - 0.05, 0); ship.rotation.y = st.dir === 'up' ? Math.PI : 0;
      // 自动演示
      if (st.auto) { st.autoT -= dt; if (st.autoT <= 0) { st.autoT = 1.6; autoStep(); } }
      controls.update();
      renderer.render(scene, camera);
      Lb.up.innerHTML = '上游 · 水位 ' + PS.fmt(LU * 10, 0) + ' m'; place(Lb.up, new THREE.Vector3(-4.6, LU + 0.15, 0));
      Lb.mid.innerHTML = '闸室 · 水位 ' + PS.fmt(st.Lc * 10, 1) + ' m'; place(Lb.mid, new THREE.Vector3(0.9, st.Lc + 0.15, 0));
      Lb.down.innerHTML = '下游 · 水位 ' + PS.fmt(LD * 10, 0) + ' m'; place(Lb.down, new THREE.Vector3(4.6, LD + 0.15, 0));
      place(Lb.A, new THREE.Vector3(-XC, -0.05, ZW), true); place(Lb.B, new THREE.Vector3(XC, -0.05, ZW), true);
      place(Lb.C, new THREE.Vector3(-XC, WH + 0.35, 0)); place(Lb.D, new THREE.Vector3(XC, WH + 0.35, 0));
      Lb.A.classList.toggle('moving', st.A); Lb.B.classList.toggle('moving', st.B); Lb.C.classList.toggle('still', st.C); Lb.D.classList.toggle('still', st.D);
    }, view);
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    dSeg.set(st.dir, true);
    reset();
    loop.start();
  });
})();
