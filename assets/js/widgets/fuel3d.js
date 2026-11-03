/* 第14章第2节：3D 比较不同燃料的热值——两套相同的装置，质量相等的两种燃料（酒精、碎纸片、煤油）完全燃烧，给质量相等的水加热，比较水升高的温度；
 * 自动记录数据，可以用实验数据估算热值。依赖 three.js、OrbitControls、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const TH = PS.th;
  const SPEED = 12, MW = 0.3, T0 = 20, CW = 4200 * MW + 84, HL = 0.8;
  const FUELS = {
    alcohol: { n: '酒精', q: 3.0e7, rate: 10 / 240, eff: 0.2, liq: 0xe7f5ff, flame: 0x91a7ff, smoke: 0 },
    paper: { n: '碎纸片', q: 1.2e7, rate: 10 / 60, eff: 0.13, flame: 0xff922b, smoke: 0.35 },
    kerosene: { n: '煤油', q: 4.6e7, rate: 10 / 300, eff: 0.17, liq: 0xffe066, flame: 0xff922b, smoke: 0.8 },
  };

  PS.register('fuel-3d', function (el, opts) {
    if (!window.THREE || !THREE.OrbitControls) { el.append(h('div', { class: 'tip tip-warn' }, '3D 组件需要 three.js，加载失败。')); return; }
    const st = { fuel: ['alcohol', 'paper'], m: [10, 10], on: false, done: false, rows: [], t: 0 };
    const S2 = [0, 1].map(() => ({ left: 10, T: T0, Tmax: T0, out: false, smoke: 0, eff: 1 }));
    const view = h('div', { class: 'stage-3d', style: { background: '#eef2f7', aspectRatio: '16 / 11' } });
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, h('div', null, view, h('p', { class: 'small muted', style: { margin: '6px 2px 0' } }, '拖动画面可以换角度观察。两个烧杯中各装有 300 g、20 ℃ 的水；时间加快了 12 倍。')), side));
    const FK = Object.keys(FUELS).map((k) => ({ value: k, label: FUELS[k].n }));
    const segs = [0, 1].map((i) => PS.ui.seg(FK, st.fuel[i], (v) => { st.fuel[i] = v; reset(); }));
    const mSegs = [0, 1].map((i) => PS.ui.seg([{ value: 5, label: '5 g' }, { value: 10, label: '10 g' }], st.m[i], (v) => { st.m[i] = v; reset(); }));
    const goB = PS.ui.button('🔥 同时点燃', light, 'btn btn-primary btn-sm');
    const rd = [0, 1].map((i) => ({ T: PS.ui.readout((i ? 'B' : 'A') + ' 的水温', '20.0 ℃'), m: PS.ui.readout((i ? 'B' : 'A') + ' 剩余燃料', '10 g') }));
    const msg = h('div', { class: 'th-msg info' });
    const tbody = h('tbody'), ana = h('div', { class: 'th-msg info' });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择燃料（燃烧皿 A、B）'),
        h('div', { class: 'small muted' }, '燃料 A'), segs[0].el, mSegs[0].el,
        h('div', { class: 'small muted', style: { marginTop: '6px' } }, '燃料 B'), segs[1].el, mSegs[1].el),
      h('div', { class: 'panel' }, h('h4', null, '② 点燃，等燃料完全燃尽'), h('div', { class: 'row' }, goB, PS.ui.button('换上新燃料和冷水', reset, 'btn btn-ghost btn-sm')),
        h('div', { class: 'th-read' }, rd[0].T.el, rd[1].T.el, rd[0].m.el, rd[1].m.el), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 数据记录'), h('div', { class: 'table-wrap', style: { margin: 0 } }, h('table', { class: 't f3-t' }, h('thead', null, h('tr', null, ['燃料', '质量', '水的初温', '水的末温', '水升高的温度'].map((t) => h('th', null, t)))), tbody)), PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')),
      h('div', { class: 'panel' }, h('h4', null, '④ 分析论证'), ana));

    // ---------- 场景 ----------
    const E = TH.three(view, { cam: [0.05, 0.42, 0.8], target: [0, 0.21, 0], min: 0.2, max: 1.6 });
    const { scene, Std } = E;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.45), Std(0xe9dcc6)); desk.position.y = -0.01; scene.add(desk);
    const dark = Std(0x495057, { metalness: 0.6, roughness: 0.4 });
    const glass = Std(0xd0e4f7, { transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    const dotTex = E.tex(32, 32, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const fTex = (c0, c1, c2) => E.tex(64, 128, (g, w, hh) => { const gr = g.createRadialGradient(w / 2, hh * 0.78, 2, w / 2, hh * 0.62, hh * 0.46); gr.addColorStop(0, c0); gr.addColorStop(0.4, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, hh * 0.08); g.bezierCurveTo(w * 0.95, hh * 0.55, w * 0.9, hh * 0.98, w / 2, hh * 0.98); g.bezierCurveTo(w * 0.1, hh * 0.98, w * 0.05, hh * 0.55, w / 2, hh * 0.08); g.fill(); });
    const TEX = { orange: fTex('rgba(255,244,200,1)', 'rgba(255,169,77,.95)', 'rgba(232,89,12,0)'), blue: fTex('rgba(230,240,255,.95)', 'rgba(116,143,252,.8)', 'rgba(59,91,219,0)') };
    const gauzeTex = E.tex(128, 128, (g, w) => { g.fillStyle = '#868e96'; g.fillRect(0, 0, w, w); g.strokeStyle = '#495057'; g.lineWidth = 1; for (let i = 0; i < w; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, w); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } g.fillStyle = '#e9ecef'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.3, 0, Math.PI * 2); g.fill(); });
    const HW = (MW * 1000) / (Math.PI * 4.6 * 4.6) / 100; // 水柱高度 m（300 cm³ ÷ 底面积 cm² → cm → m）
    const sets = [-0.17, 0.17].map((x, i) => {
      const g = new THREE.Group(); g.position.x = x; scene.add(g);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.18), Std(0x8a5a1c, { roughness: 0.85 })); base.position.y = 0.006; g.add(base);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.46, 12), dark); rod.position.set(-0.09, 0.23, -0.05); g.add(rod);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.003, 8, 40), dark); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; g.add(ring);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.005, 0.005), dark); arm.position.set(-0.07, 0.2, -0.04); arm.rotation.y = -0.6; g.add(arm);
      const gauze = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.003, 0.13), [dark, dark, Std(0xffffff, { map: gauzeTex }), dark, dark, dark]); gauze.position.y = 0.2035; g.add(gauze);
      const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.046, 0.1, 40, 1, true), glass); bk.position.y = 0.255; bk.renderOrder = 6; g.add(bk);
      const bkB = new THREE.Mesh(new THREE.CircleGeometry(0.046, 32), glass); bkB.rotation.x = -Math.PI / 2; bkB.position.y = 0.2055; g.add(bkB);
      const wM = Std(0x74c0fc, { transparent: true, opacity: 0.55, depthWrite: false });
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.0455, 0.0455, HW, 32), wM); water.position.y = 0.206 + HW / 2; water.renderOrder = 5; g.add(water);
      // 温度计
      const tx = 0.018, tz = 0.012;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.2, 12), Std(0xf1f3f5, { transparent: true, opacity: 0.6, depthWrite: false })); tube.position.set(tx, 0.32, tz); tube.renderOrder = 7; g.add(tube);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 10), Std(0xe03131)); bulb.position.set(tx, 0.218, tz); g.add(bulb);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 1, 8), Std(0xe03131)); col.position.set(tx, 0.22, tz); g.add(col);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.005, 0.005), dark); clamp.position.set(-0.035, 0.4, -0.02); clamp.rotation.y = -0.3; g.add(clamp);
      // 燃烧皿
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.06, 16), dark); stand.position.y = 0.042; g.add(stand);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.014, 32, 1, true), Std(0xadb5bd, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })); dish.position.y = 0.079; g.add(dish);
      const dishB = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), Std(0xadb5bd, { metalness: 0.7, roughness: 0.3 })); dishB.rotation.x = -Math.PI / 2; dishB.position.y = 0.0725; g.add(dishB);
      const liqM = Std(0xe7f5ff, { transparent: true, opacity: 0.85 });
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 1, 24), liqM); liq.position.y = 0.073; g.add(liq);
      const paper = new THREE.Group(); paper.position.y = 0.074; g.add(paper);
      const pM = Std(0xf8f9fa, { roughness: 0.9 });
      for (let k = 0; k < 14; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.001, 0.007), pM); const a = k * 2.4, r = 0.004 + (k % 4) * 0.004; p.position.set(Math.cos(a) * r, (k % 5) * 0.0018, Math.sin(a) * r); p.rotation.set(Math.random(), a, Math.random() * 0.6); paper.add(p); }
      const fl = [0, 1, 2].map((k) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.orange, transparent: true, depthWrite: false, opacity: 0 })); s.position.y = 0.11; s.renderOrder = 9; g.add(s); return s; });
      const NSm = 50, smG = new THREE.BufferGeometry(), smP = new Float32Array(NSm * 3);
      smG.setAttribute('position', new THREE.BufferAttribute(smP, 3));
      const smM = new THREE.PointsMaterial({ size: 0.018, map: dotTex, color: 0x343a40, transparent: true, depthWrite: false, opacity: 0 });
      const smoke = new THREE.Points(smG, smM); smoke.renderOrder = 8; g.add(smoke);
      const SM = Array.from({ length: NSm }, (_, k) => ({ u: k / NSm, a: Math.random() * Math.PI * 2 }));
      return { g, water, wM, col, liq, liqM, paper, pM, fl, smP, smG, smM, SM, lab: E.label(''), tl: E.label('', 'ref') };
    });
    const LBw = E.label('水 300 g'), LBt = E.label('温度计'), LBd = E.label('燃烧皿');

    function reset() {
      st.on = false; st.done = false; st.t = 0;
      S2.forEach((s, i) => Object.assign(s, { left: st.m[i], T: T0, Tmax: T0, out: false, smoke: 0, eff: PS.rand(0.96, 1.04) }));
      goB.disabled = false;
      tell(); vis();
    }
    function light() {
      if (st.on) return;
      if (st.done || S2.some((s) => s.left <= 0)) reset();
      st.on = true; goB.disabled = true; PS.sound.tick(); tell();
    }
    function vis() {
      sets.forEach((S, i) => {
        const f = FUELS[st.fuel[i]], s = S2[i], frac = s.left / 10;
        S.liq.visible = !!f.liq && s.left > 0.01; S.paper.visible = !f.liq;
        if (f.liq) { S.liqM.color.setHex(f.liq); const hh = 0.0105 * frac + 0.0005; S.liq.scale.y = hh; S.liq.position.y = 0.0728 + hh / 2; }
        else { S.paper.scale.setScalar(Math.max(0.15, Math.sqrt(frac + 0.02))); S.pM.color.setHex(s.out ? 0x343a40 : st.on ? 0xced4da : 0xf8f9fa); }
        S.lab.innerHTML = '燃料 ' + (i ? 'B' : 'A') + '：' + f.n + ' ' + st.m[i] + ' g';
      });
    }
    const fmtT = (T) => PS.fmt(T, 1) + ' ℃';
    function tell() {
      S2.forEach((s, i) => { rd[i].T.set(fmtT(s.T)); rd[i].m.set(PS.fmt(Math.max(0, s.left), 1) + ' g'); });
      let t, cls = 'info';
      if (st.done) { t = '两种燃料都完全燃尽了，数据已记录。可以换一组燃料再做，也可以改变燃料的质量看看。'; cls = 'ok'; }
      else if (st.on) t = '燃烧中……要等燃料<b>完全燃尽</b>后，再读出水的末温（取最高温度）。';
      else t = '选好两种燃料（质量相等），点“同时点燃”。';
      msg.className = 'th-msg ' + cls; msg.innerHTML = t;
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.n), h('td', null, r.m + ' g'), h('td', null, T0 + ' ℃'), h('td', null, PS.fmt(r.T, 1) + ' ℃'), h('td', null, h('b', null, PS.fmt(r.T - T0, 1) + ' ℃')))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '燃料燃尽后自动记录')));
      analyse();
    }
    function analyse() {
      const R = st.rows;
      if (!R.length) { ana.className = 'th-msg info'; ana.innerHTML = '实验中要控制：两种燃料的<b>质量相等</b>，两杯水的<b>质量和初温相等</b>，装置相同。用水<b>升高的温度</b>反映燃料放出热量的多少（转换法）。'; return; }
      const a = R[R.length - 2], b = R[R.length - 1];
      let s, cls = 'ok';
      if (a.m !== b.m) { s = '这一次两种燃料的<b>质量不相等</b>，不能比较它们的热值——要控制燃料的质量相同（控制变量法）。'; cls = 'bad'; }
      else if (a.k === b.k) s = '两边是同一种燃料，水升高的温度几乎相同（略有差别是实验误差）。换成两种不同的燃料试试。';
      else {
        const [hi, lo] = a.T >= b.T ? [a, b] : [b, a];
        s = '质量相等的' + hi.n + '和' + lo.n + '完全燃烧，' + hi.n + '使水升高的温度多（' + PS.fmt(hi.T - T0, 1) + ' ℃ > ' + PS.fmt(lo.T - T0, 1) + ' ℃），说明' + hi.n + '放出的热量多：<b>' + hi.n + '的热值比' + lo.n + '大</b>。<br>结论：<b>质量相等的不同燃料，完全燃烧放出的热量一般不同</b>。';
      }
      const est = R.slice(-2).map((r) => { const Q = 4200 * MW * (r.T - T0); return r.n + '：q ≈ <span class="frac"><span>c水m水Δt</span><span>m燃料</span></span> = <span class="frac"><span>4.2×10³ × 0.3 × ' + PS.fmt(r.T - T0, 1) + '</span><span>' + r.m / 1000 + '</span></span> J/kg ≈ ' + PS.pretty(Q / (r.m / 1000), 2) + ' J/kg' + (r.k !== 'paper' ? '（表中 ' + PS.pretty(FUELS[r.k].q, 2) + ' J/kg）' : ''); }).join('<br>');
      ana.className = 'th-msg ' + cls;
      ana.innerHTML = s + ('<details class="reveal" style="margin-top:6px"><summary>用实验数据估算热值</summary><p style="margin:4px 0">' + est + '</p><p style="margin:4px 0">估算值比热值表中的数值<b>小得多</b>：燃料不可能完全燃烧，放出的热量有很多散失到空气中、被烧杯和石棉网吸收，水吸收的热量只是其中的一部分。所以这个实验只能<b>比较</b>热值的大小。</p></details>');
    }
    let tellT = 0;
    const v3 = new THREE.Vector3();
    const loop = PS.loop((dt, time) => {
      if (st.on) {
        const sdt = dt * SPEED;
        let all = true;
        S2.forEach((s, i) => {
          const f = FUELS[st.fuel[i]];
          let P = 0;
          if (s.left > 0) { const dm = Math.min(s.left, f.rate * sdt); s.left -= dm; P = (dm / 1000) * f.q * f.eff * s.eff / sdt; if (s.left <= 1e-6) { s.left = 0; s.out = true; } all = false; }
          s.T += ((P - HL * (s.T - T0)) * sdt) / CW;
          s.Tmax = Math.max(s.Tmax, s.T);
          s.smoke = s.left > 0 ? f.smoke : Math.max(0, s.smoke - dt * 0.4);
        });
        if (all) {
          st.t += dt;
          if (st.t > 1.2) {
            st.on = false; st.done = true; PS.sound.ping();
            S2.forEach((s, i) => { s.T = s.Tmax; st.rows.push({ k: st.fuel[i], n: FUELS[st.fuel[i]].n, m: st.m[i], T: PS.round(s.Tmax, 1) }); });
            table(); tell();
          }
        }
        vis();
        tellT += dt; if (tellT > 0.2) { tellT = 0; tell(); }
      } else S2.forEach((s) => (s.smoke = Math.max(0, s.smoke - dt * 0.4)));
      sets.forEach((S, i) => {
        const s = S2[i], f = FUELS[st.fuel[i]], burning = st.on && s.left > 0;
        const hgt = 0.004 + ((s.T + 10) / 110) * 0.17;
        S.col.scale.y = hgt; S.col.position.y = 0.22 + hgt / 2;
        S.wM.color.setStyle(PS.waterColor(s.T));
        const big = !f.liq ? 1.5 : 1;
        S.fl.forEach((sp, k) => {
          const fl = 1 + 0.12 * Math.sin(time * (13 + k * 4) + k * 2);
          sp.material.opacity = burning ? 0.9 - k * 0.2 : 0;
          const tx = st.fuel[i] === 'alcohol' && k !== 1 ? TEX.blue : TEX.orange; if (sp.material.map !== tx) { sp.material.map = tx; sp.material.needsUpdate = true; }
          sp.scale.set(0.05 * big * (1 - k * 0.2), 0.11 * big * fl * (1 - k * 0.15), 1);
          sp.position.set(Math.sin(time * 7 + k) * 0.003, 0.084 + 0.055 * big * fl * (1 - k * 0.15), 0);
        });
        S.smM.opacity = s.smoke * 0.5;
        if (s.smoke > 0.01) {
          S.SM.forEach((m, k) => {
            m.u = (m.u + dt * 0.35) % 1;
            const y = 0.1 + m.u * 0.38, r = y < 0.2 ? 0.01 + (y - 0.1) * 0.4 : 0.055 + (y - 0.2) * 0.08;
            S.smP[k * 3] = Math.cos(m.a) * r; S.smP[k * 3 + 1] = y; S.smP[k * 3 + 2] = Math.sin(m.a) * r;
          });
          S.smG.attributes.position.needsUpdate = true;
        }
      });
      E.render(dt);
      sets.forEach((S, i) => {
        E.place(S.lab, v3.set(S.g.position.x, 0.02, 0.1));
        E.place(S.tl, v3.set(S.g.position.x + 0.018, 0.445, 0.012));
        S.tl.innerHTML = PS.fmt(S2[i].T, 1) + ' ℃';
      });
      E.place(LBw, v3.set(-0.17 - 0.085, 0.23, 0.04));
      E.place(LBt, v3.set(0.17 + 0.07, 0.36, 0.012));
      E.place(LBd, v3.set(0.17 + 0.075, 0.08, 0.02));
    }, view);
    el._st = st; el._S2 = S2;
    reset(); table();
    loop.start();
  });

  if (!document.getElementById('f3-style')) document.head.append(h('style', { id: 'f3-style' }, `
    .f3-t{font-size:.8rem}
    .f3-t th,.f3-t td{padding:3px 3px;text-align:center;line-height:1.3}
    .f3-t td:first-child{white-space:nowrap}
  `));
})();
