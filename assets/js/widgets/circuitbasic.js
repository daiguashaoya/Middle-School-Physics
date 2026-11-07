/* 第15章第2节：电流和电路——电流的形成与方向 current-flow、电路的组成 circuit-parts、元件符号 symbol-match、
 * 实物图与电路图 real-diagram（看实物图选电路图 / 按电路图连接实物）、通路断路短路 circuit-states、状态判断 state-judge。
 * 同时提供 PS.el.realLayout(desc)（按 EL.layout 的描述摆放实物并连线）、PS.el.realDraw、PS.el.bypass。依赖 circuit.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el, EN = PS.en, REAL = EL.real;
  const TAU = Math.PI * 2;
  const WC = ['#e03131', '#f59f00', '#1c7ed6', '#2b8a3e', '#212529', '#ae3ec9', '#0c8599'];

  /* ---------- 实物摆放 ---------- */
  const typeOf = (k) => EL.TYPE_OF[k[0]];
  /** 按描述摆放实物：返回 { comps: [{ id, t, x, y, s, label }], wires: [[端点, 端点]] }；端点写成 'L1.1'、'E.+' */
  EL.realLayout = function (desc) {
    const comps = [{ id: 'E', t: 'bat', x: 500, y: 478, s: 200 }], wires = [];
    const add = (k, x, y) => { const c = { id: k, t: typeOf(k), x, y, s: 120, label: k }; comps.push(c); return c; };
    const ids = (arr) => arr.map((it) => (typeof it === 'string' ? it : it.k));
    if (desc.s) {
      const its = ids(desc.s), n = its.length;
      const P = { 1: [[500, 190]], 2: [[690, 200], [310, 200]], 3: [[790, 290], [500, 170], [210, 290]], 4: [[820, 310], [620, 170], [380, 170], [180, 310]] }[n];
      its.forEach((k, i) => add(k, P[i][0], P[i][1]));
      let prev = 'E.+';
      its.forEach((k) => { wires.push([prev, k + '.2']); prev = k + '.1'; });
      wires.push([prev, 'E.-']);
    } else {
      const tr = (desc.t || []).map((it) => (typeof it === 'string' ? { k: it } : it));
      const R = tr.filter((e) => e.side === 'R').map((e) => e.k), L = tr.filter((e) => e.side !== 'R').map((e) => e.k);
      const br = desc.b.map(ids);
      R.forEach((k, i) => add(k, 820, 400 - i * 120));
      L.forEach((k, i) => add(k, 180, 400 - i * 120));
      const rows = br.length === 1 ? [190] : br.length === 2 ? [150, 305] : [120, 230, 340];
      br.forEach((b, j) => { const xs = b.length === 1 ? [500] : b.length === 2 ? [620, 380] : [680, 500, 320]; b.forEach((k, i) => add(k, xs[i], rows[j])); });
      let JR = 'E.+';
      R.forEach((k) => { wires.push([JR, k + '.1']); JR = k + '.2'; });
      let JL = 'E.-';
      L.forEach((k) => { wires.push([k + '.1', JL]); JL = k + '.2'; });
      br.forEach((b) => { let p = JR; b.forEach((k) => { wires.push([p, k + '.2']); p = k + '.1'; }); wires.push([p, JL]); });
    }
    return { comps, wires };
  };
  /** 端点的位置 */
  EL.tpos = function (c, k) {
    if (c.t === 'bat') { const hh = c.s * 0.4; return k === '+' ? [c.x + c.s / 2 + hh * 0.08, c.y] : [c.x - c.s / 2 - hh * 0.08, c.y]; }
    return k === '1' ? [c.x - c.s * 0.36, c.y] : [c.x + c.s * 0.36, c.y];
  };
  /** 画实物：o.st = { 元件 id: { on, lit, spin, open, hot } }，o.F；返回 { 端点: [x, y] } */
  EL.realDraw = function (ctx, lay, o) {
    o = o || {};
    const st = o.st || {}, T = {};
    lay.comps.forEach((c) => {
      const s = st[c.id] || {}, fs = o.fs || 13;
      if (c.t === 'bat') { const r = REAL.battery(ctx, c.x, c.y, c.s, { n: 2, hot: s.hot }); T[c.id + '.+'] = r.pos; T[c.id + '.-'] = r.neg; return; }
      let r;
      if (c.t === 'bulb') r = REAL.bulb(ctx, c.x, c.y, c.s, s.lit || 0, { label: c.label, fs, removed: s.open });
      else if (c.t === 'sw') r = REAL.sw(ctx, c.x, c.y, c.s, s.on, { label: c.label, fs });
      else if (c.t === 'motor') r = REAL.motor(ctx, c.x, c.y, c.s, s.spin || 0, { label: c.label, fs });
      else if (c.t === 'bell') r = REAL.buzzer(ctx, c.x, c.y, c.s, s.lit > 0.5, o.t || 0, { label: c.label, fs });
      else r = { t1: EL.tpos(c, '1'), t2: EL.tpos(c, '2') };
      T[c.id + '.1'] = r.t1; T[c.id + '.2'] = r.t2;
    });
    return T;
  };
  /** 实物电路的网表：每根导线是一个元件，端点就是节点；st 同上（on 开关闭合、open 拧下） */
  EL.realNet = function (lay, wires, st) {
    const els = [];
    lay.comps.forEach((c) => {
      const s = st[c.id] || {};
      if (c.t === 'bat') els.push({ id: c.id, t: 'bat', a: c.id + '.+', b: c.id + '.-' });
      else els.push({ id: c.id, t: c.t, a: c.id + '.2', b: c.id + '.1', on: s.on, open: s.open });
    });
    wires.forEach((w, i) => els.push({ id: 'w' + i, t: 'wire', a: w[0], b: w[1], open: w[3] }));
    return { els };
  };
  /** 给电路图中的元件 id 加一根“跨接”的导线（或开关 o.t = 'sw'）：o.off 偏移距离（正负决定在哪一侧） */
  EL.bypass = function (spec, id, o) {
    o = o || {};
    const e = spec.els.find((x) => x.id === id), pa = spec.pos[e.a], pb = spec.pos[e.b];
    const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1, nx = ((pb[1] - pa[1]) / L) * (o.off || -40), ny = (-(pb[0] - pa[0]) / L) * (o.off || -40);
    const ext = o.ext || 0, ux = ((pb[0] - pa[0]) / L) * ext, uy = ((pb[1] - pa[1]) / L) * ext;
    const via = [[pa[0] - ux + nx, pa[1] - uy + ny], [pb[0] + ux + nx, pb[1] + uy + ny]];
    if (o.t === 'sw') {
      const m1 = '_b' + id + '1', m2 = '_b' + id + '2', mx = (via[0][0] + via[1][0]) / 2, my = (via[0][1] + via[1][1]) / 2, dx = (via[1][0] - via[0][0]) / 2, dy = (via[1][1] - via[0][1]) / 2, k = Math.min(1, 30 / Math.hypot(dx, dy));
      spec.pos[m1] = [mx - dx * k, my - dy * k]; spec.pos[m2] = [mx + dx * k, my + dy * k];
      spec.els.push({ id: '_bw' + id + 'a', t: 'wire', a: e.a, b: m1, via: [via[0]] }, Object.assign({ id: o.id || 'K', t: 'sw', a: m1, b: m2, label: o.label || '' }, o.sw || {}), { id: '_bw' + id + 'b', t: 'wire', a: m2, b: e.b, via: [via[1]] });
    } else spec.els.push({ id: o.id || '_bw' + id, t: 'wire', a: e.a, b: e.b, via });
    return spec;
  };

  /* ================= 电流的形成与方向 ================= */
  PS.register('current-flow', function (el) {
    const st = { mode: 'wire', on: false, t: 0, flip: false, show: 'both', es: [] };
    for (let i = 0; i < 34; i++) st.es.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2 });
    const modeSeg = PS.ui.seg([{ value: 'wire', label: '导线中的电荷' }, { value: 'led', label: '用发光二极管判断电流方向' }], 'wire', (v) => { st.mode = v; ui(); });
    const swBtn = PS.ui.button('闭合开关', () => { st.on = !st.on; PS.sound.clack(); ui(); }, 'btn btn-primary btn-sm');
    const flipBtn = PS.ui.button('⇄ 把发光二极管反过来接', () => { st.flip = !st.flip; PS.sound.tick(); ui(); }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, modeSeg.el), view, h('div', { class: 'controls', style: { marginTop: '6px' } }, swBtn, flipBtn), msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 840 : 540), draw });
    const C = EL.circuit(EL.layout({ s: [{ k: 'S', label: 'S' }, { k: 'L', label: 'L' }] }, { x: 330, y: 50, w: 340, h: 170, Lc: 64 }));
    function ui() {
      swBtn.style.display = st.mode === 'wire' ? '' : 'none'; flipBtn.style.display = st.mode === 'led' ? '' : 'none';
      swBtn.innerHTML = st.on ? '断开开关' : '闭合开关';
      C.spec.els.find((e) => e.id === 'S').on = st.on; C.solve();
      if (st.mode === 'wire') {
        msg.className = 'el-msg ' + (st.on ? 'ok' : 'info');
        msg.innerHTML = st.on ? '闭合开关后，导线中的<b>自由电子</b>在杂乱运动的同时，整体向一个方向移动——<b>电荷的定向移动形成电流</b>。物理学规定：<b>正电荷定向移动的方向为电流的方向</b>，所以电流方向与电子（负电荷）定向移动的方向<b>相反</b>。在电源外部，电流从电源<b>正极</b>经过用电器流向<b>负极</b>。'
          : '开关断开时，金属导线中的自由电子也在不停地运动，但运动是杂乱无章的，<b>没有定向移动，不形成电流</b>。闭合开关看看。';
      } else {
        msg.className = 'el-msg ' + (st.flip ? 'ok' : 'bad');
        msg.innerHTML = st.flip ? '发光二极管（LED）<b>较长的引脚接电源正极</b>一端，电流从长脚流入、从短脚流出，LED 发光。' : '长脚接到了负极一端，LED <b>不发光</b>：发光二极管具有<b>单向导电性</b>，电流只能从它的正极（长脚）流向负极（短脚）。所以可以用它来判断电路中电流的方向。';
      }
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.t += dt; C.step(dt);
      st.es.forEach((e) => {
        e.vx += (Math.random() - 0.5) * dt * 30; e.vy += (Math.random() - 0.5) * dt * 30;
        const sp = Math.hypot(e.vx, e.vy); if (sp > 2.2) { e.vx *= 2.2 / sp; e.vy *= 2.2 / sp; }
        e.x += (e.vx * 0.06 + (st.on ? 0.07 : 0)) * dt; e.y += e.vy * 0.12 * dt;
        if (e.y < 0) { e.y = -e.y; e.vy = Math.abs(e.vy); } if (e.y > 1) { e.y = 2 - e.y; e.vy = -Math.abs(e.vy); }
        e.x = ((e.x % 1) + 1) % 1;
      });
      S.render();
    }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      if (st.mode === 'wire') {
        const ck = nar ? 1.5 : 1, oy = nar ? 50 : 0;
        ctx.save(); ctx.translate(500, oy); ctx.scale(ck, ck); ctx.translate(-500, 0);
        C.draw(ctx, { F: (p) => F(p) / ck, dots: st.on, lw: 3, size: 30 });
        ctx.restore();
        const zx = 500, zy = oy + 50 * ck;
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(zx, zy, 16 * ck, 0, TAU); ctx.stroke();
        const ty = nar ? 440 : 300, th = nar ? 220 : 170, tx0 = 60, tx1 = 940;
        ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(zx - 14, zy + 8); ctx.lineTo(tx0, ty); ctx.moveTo(zx + 14, zy + 8); ctx.lineTo(tx1, ty); ctx.stroke(); ctx.setLineDash([]);
        const g = ctx.createLinearGradient(0, ty, 0, ty + th); g.addColorStop(0, '#ffe8cc'); g.addColorStop(0.5, '#ffd8a8'); g.addColorStop(1, '#f4b67a');
        ctx.fillStyle = g; D.roundRect(ctx, tx0, ty, tx1 - tx0, th, 24); ctx.fill(); ctx.strokeStyle = '#c8742c'; ctx.lineWidth = 2; ctx.stroke();
        for (let i = 0; i < 15; i++) for (let j = 0; j < 3; j++) {
          const x = tx0 + 40 + i * 58 + (j % 2) * 29 + Math.sin(st.t * 9 + i + j) * 1.5, y = ty + th * (0.22 + j * 0.28);
          ctx.fillStyle = 'rgba(224,49,49,.85)'; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
          D.text(ctx, '+', x, y + 1, { size: 14, weight: 900, align: 'center', baseline: 'middle', color: '#fff' });
        }
        st.es.forEach((e) => PS.el.chg(ctx, tx0 + 20 + e.x * (tx1 - tx0 - 40), ty + 18 + e.y * (th - 36), -1, 8));
        D.text(ctx, '导线（放大，示意）：+ 为金属原子核（不移动），− 为自由电子', 500, ty + th + F(14) * 1.4, { size: F(13), weight: 700, align: 'center', color: '#495057' });
        if (st.on) {
          const ay = ty - 14;
          D.arrow(ctx, 380, ay, 620, ay, { color: PS.ELC.neg, width: 3.5, head: 13 });
          D.text(ctx, '电子定向移动的方向', 640, ay + 1, { size: F(13), weight: 800, color: PS.ELC.neg, baseline: 'middle' });
          D.arrow(ctx, 620, ty + th + F(14) * 2.8, 380, ty + th + F(14) * 2.8, { color: PS.ELC.I, width: 3.5, head: 13 });
          D.text(ctx, '电流的方向', 640, ty + th + F(14) * 2.8 + 1, { size: F(13), weight: 800, color: PS.ELC.I, baseline: 'middle' });
        }
        if (!nar) D.text(ctx, '电流方向：正极 → 用电器 → 负极', 40, F(14) + 10, { size: F(13), weight: 700, color: PS.ELC.I });
      } else {
        const bt = REAL.battery(ctx, 500, nar ? 560 : 440, 230, { n: 2 });
        const ly = nar ? 200 : 150;
        const lit = st.flip ? 1 : 0;
        const led = REAL.led(ctx, 500, ly, 150, lit, st.flip);
        const right = st.flip ? led.a : led.k, left = st.flip ? led.k : led.a;
        const w1 = REAL.wire(ctx, bt.pos, right, { color: '#e03131', c1: [bt.pos[0] + 140, bt.pos[1]], c2: [right[0] + 120, right[1] + 40] });
        const w2 = REAL.wire(ctx, left, bt.neg, { color: '#212529', c1: [left[0] - 120, left[1] + 40], c2: [bt.neg[0] - 140, bt.neg[1]] });
        if (lit) { EL.dots(ctx, w1, st.t * 120, { gap: 30, r: 4.5 }); EL.dots(ctx, w2, st.t * 120, { gap: 30, r: 4.5 }); }
        const fs = F(13);
        D.text(ctx, '长脚（正极）', led.a[0] + (st.flip ? 30 : -30), led.a[1] + fs * 1.6, { size: fs, weight: 800, align: st.flip ? 'left' : 'right', color: '#c92a2a' });
        D.text(ctx, '短脚（负极）', led.k[0] + (st.flip ? -30 : 30), led.k[1] + fs * 0.6, { size: fs, weight: 800, align: st.flip ? 'right' : 'left', color: '#495057' });
        D.text(ctx, lit ? '发光' : '不发光', 500, ly - 70, { size: F(16), weight: 800, align: 'center', color: lit ? '#e8590c' : '#868e96' });
      }
    }
    ui();
    loop.start();
  });

  /* ================= 电路的组成 ================= */
  const PART_INFO = {
    bat: ['电源', '<b>提供电能</b>的装置。干电池工作时把<b>化学能转化为电能</b>（发电机把机械能转化为电能）。'],
    sw: ['开关', '<b>控制电路的通断</b>：开关闭合，电路接通；开关断开，电路断开。'],
    wire: ['导线', '<b>输送电能</b>，把电源、开关和用电器连接起来。导线由金属芯（导体）和外面的塑料皮（绝缘体）组成。'],
    bulb: ['用电器：小灯泡', '<b>消耗电能</b>的装置：小灯泡把<b>电能转化为光能和内能</b>。'],
    motor: ['用电器：小电动机', '<b>消耗电能</b>的装置：电动机把<b>电能转化为机械能</b>。'],
    bell: ['用电器：蜂鸣器', '<b>消耗电能</b>的装置：蜂鸣器把<b>电能转化为声能</b>。'],
  };
  PS.register('circuit-parts', function (el) {
    const st = { load: 'bulb', on: false, rm: {}, t: 0, spin: 0, info: null };
    const loadSeg = PS.ui.seg([{ value: 'bulb', label: '💡 小灯泡' }, { value: 'motor', label: '⚙️ 小电动机' }, { value: 'bell', label: '🔔 蜂鸣器' }], 'bulb', (v) => { st.load = v; st.info = v; tell(); });
    const swBtn = PS.ui.button('闭合开关', () => { st.on = !st.on; PS.sound.clack(); tell(); }, 'btn btn-primary btn-sm');
    const rmBox = h('div', { class: 'el-chips' });
    const RM = [['bat', '拿走电池'], ['load', '拿走用电器'], ['sw', '拿走开关'], ['wire', '拿走一根导线']];
    RM.forEach(([k, t]) => { const b = PS.ui.button(t, () => { st.rm[k] = !st.rm[k]; b.classList.toggle('on', !!st.rm[k]); tell(); }, 'btn btn-sm'); rmBox.append(b); });
    const info = h('div', { class: 'el-msg info' });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(h('div', { class: 'controls' }, h('span', { class: 'small' }, '用电器：'), loadSeg.el, swBtn), view,
      h('div', { class: 'el-pair', style: { marginTop: '6px' } }, h('div', null, h('div', { class: 'small muted' }, '点画面中的器材，看看它在电路中的作用：'), info), h('div', null, h('div', { class: 'small muted' }, '少了一样会怎样？'), rmBox, msg)));
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 640 : 500), draw });
    let hits = [];
    PS.drag(S, { VW: 1000, get VH() { return S.VH; }, hit: (p) => { const k = hits.find((c) => Math.hypot(p.x - c[1], p.y - c[2]) < c[3]); return k ? k[0] : null; }, start: (k) => { if (k === 'sw') { st.on = !st.on; PS.sound.clack(); } st.info = k; tell(); }, move() {} });
    function cur() {
      if (st.rm.bat || st.rm.load || st.rm.sw || st.rm.wire || !st.on) return 0;
      return { bulb: 0.27, motor: 0.4, bell: 0.08 }[st.load];
    }
    function tell() {
      swBtn.innerHTML = st.on ? '断开开关' : '闭合开关';
      const I = cur();
      const miss = st.rm.bat ? '没有<b>电源</b>，电路中没有电能的来源' : st.rm.load ? '没有<b>用电器</b>，电路没有用处；如果直接用导线把电源两极连起来，还会<b>短路</b>' : st.rm.sw ? '拿走开关后，电路在那里<b>断开</b>了' : st.rm.wire ? '少了一根导线，电路<b>断开</b>了' : '';
      msg.className = 'el-msg ' + (I ? 'ok' : miss ? 'bad' : 'info');
      msg.innerHTML = miss ? miss + '，用电器不能工作。一个完整的电路由<b>电源、用电器、开关和导线</b>组成。' : I ? '电路闭合，电路中有电流，' + { bulb: '小灯泡发光', motor: '电动机转动', bell: '蜂鸣器发声' }[st.load] + '。要得到持续的电流，电路中必须有<b>电源</b>，而且电路必须是<b>闭合</b>的。' : '开关断开，电路中没有电流。闭合开关试试。';
      const k = st.info === 'load' ? st.load : st.info;
      const P = PART_INFO[k];
      info.className = 'el-msg ' + (P ? 'ok' : 'info');
      info.innerHTML = P ? '<b>' + P[0] + '</b>：' + P[1] : '电路由电源、用电器、开关和导线组成。';
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; if (cur() && st.load === 'motor') st.spin += dt * 25; S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 560, k = nar ? 1.25 : 1;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, 1000, VH);
      ctx.save(); ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500, 0);
      ctx.fillStyle = '#e9dcc6'; ctx.fillRect(-200, 380, 1400, 300);
      const fs = F(14) / k;
      const I = cur(), lit = I && st.load === 'bulb' ? 1 : 0;
      let bt = { pos: [345, 430], neg: [113, 430] };
      if (!st.rm.bat) bt = REAL.battery(ctx, 230, 430, 210, { n: 2 }); else { ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeRect(125, 388, 210, 84); ctx.setLineDash([]); D.text(ctx, '（没有电池）', 230, 436, { size: fs, align: 'center', color: '#868e96' }); }
      let sw = { t1: [700, 430], t2: [820, 430] };
      if (!st.rm.sw) sw = REAL.sw(ctx, 760, 430, 170, st.on, { label: '开关', fs }); else D.text(ctx, '（没有开关）', 760, 436, { size: fs, align: 'center', color: '#868e96' });
      let ld = { t1: [450, 200], t2: [550, 200] };
      if (!st.rm.load) {
        if (st.load === 'bulb') ld = REAL.bulb(ctx, 500, 200, 150, lit, { label: '小灯泡', fs });
        else if (st.load === 'motor') ld = REAL.motor(ctx, 500, 200, 150, st.spin, { label: '小电动机', fs });
        else ld = REAL.buzzer(ctx, 500, 200, 150, !!I, st.t, { label: '蜂鸣器', fs });
      } else D.text(ctx, '（没有用电器）', 500, 200, { size: fs, align: 'center', color: '#868e96' });
      const ws = [REAL.wire(ctx, bt.pos, sw.t1, { color: '#e03131', sag: 40 }), REAL.wire(ctx, sw.t2, ld.t2, { color: '#f59f00', c1: [sw.t2[0] + 90, sw.t2[1] - 60], c2: [ld.t2[0] + 160, ld.t2[1] + 10] })];
      if (!st.rm.wire) ws.push(REAL.wire(ctx, ld.t1, bt.neg, { color: '#212529', c1: [ld.t1[0] - 160, ld.t1[1] + 10], c2: [bt.neg[0] - 90, bt.neg[1] - 60] }));
      else { REAL.wire(ctx, ld.t1, [ld.t1[0] - 140, ld.t1[1] + 90], { color: '#212529', sag: 10 }); }
      if (I) ws.forEach((p) => EL.dots(ctx, p, st.t * EL.speed(I), { gap: 30, r: 4.5 }));
      ctx.restore();
      const tx = (x, y) => [500 + (x - 500) * k, y * k];
      hits = [['bat', ...tx(230, 430), 110 * k], ['sw', ...tx(760, 420), 80 * k], ['load', ...tx(500, 170), 90 * k], ['wire', ...tx(260, 260), 70 * k], ['wire', ...tx(760, 260), 70 * k]];
      D.text(ctx, '点一点：电池、开关、用电器、导线', 20, F(13) + 10, { size: F(13), weight: 700, color: '#868e96' });
    }
    tell();
    loop.start();
  });

  /* ================= 元件符号 ================= */
  const SYMS = [
    ['cell', '电池', { n: 1 }], ['bat', '电池组', { n: 2 }], ['bulb', '灯泡'], ['sw', '开关'], ['motor', '电动机'], ['bell', '电铃'],
    ['amm', '电流表'], ['led', '发光二极管'], ['cross', '交叉相连的导线'], ['nocross', '交叉不相连的导线'],
  ];
  function drawSym(ctx, k, F, o) {
    const S = SYMS.find((s) => s[0] === k), y = 75;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 150);
    if (k === 'cross' || k === 'nocross') {
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(230, y); ctx.moveTo(150, 15); ctx.lineTo(150, 135); ctx.stroke();
      if (k === 'cross') EL.dot(ctx, 150, y, 7);
      return;
    }
    EL.sym(ctx, k === 'cell' ? 'bat' : k, 40, y, 260, y, Object.assign({ F, size: 46, lw: 3 }, S[2] || {}, o || {}));
    if (k === 'cell' || k === 'bat' || k === 'led' || k === 'amm') { D.text(ctx, '+', 62, y - 18, { size: 18, weight: 900, color: '#e03131' }); D.text(ctx, '−', 236, y - 18, { size: 18, weight: 900, color: '#1b2333' }); }
  }
  PS.register('symbol-match', function (el) {
    const modeSeg = PS.ui.seg([{ value: 'see', label: '认一认' }, { value: 'quiz', label: '考一考' }], 'see', (v) => { grid.style.display = v === 'see' ? '' : 'none'; quiz.style.display = v === 'quiz' ? '' : 'none'; if (v === 'quiz' && !Q) next(); });
    const grid = h('div', { class: 'sym-grid' });
    SYMS.forEach((s) => {
      const box = h('div', { class: 'sym-card' }); const cv = h('div'); box.append(cv, h('div', { class: 'sym-name' }, s[1])); grid.append(box);
      PS.stage(cv, { ratio: '2 / 1', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 300, 150); drawSym(ctx, s[0], F); } });
    });
    const quiz = h('div', { style: { display: 'none' } });
    const qv = h('div', { class: 'sym-q' });
    const opts = h('div', { class: 'el-chips' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    quiz.append(h('p', { class: 'small', style: { margin: '0 0 6px' } }, '这是什么元件的符号？'), qv, opts, fb, score, PS.ui.button('下一个', () => next(), 'btn btn-ghost btn-sm'));
    el.append(h('div', { class: 'controls' }, modeSeg.el), grid, quiz);
    const QS = PS.stage(qv, { ratio: '2 / 1', draw: (ctx, w, hh) => { if (!Q) return; const F = PS.virtual(ctx, w, hh, 300, 150); drawSym(ctx, Q.k, F); } });
    let Q = null, n = 0, ok = 0, last = null;
    function next() {
      let s; do { s = PS.pick(SYMS); } while (s[0] === last);
      last = s[0];
      const others = SYMS.filter((x) => x !== s).sort(() => Math.random() - 0.5).slice(0, 3);
      const choice = [s].concat(others).sort(() => Math.random() - 0.5);
      Q = { k: s[0], ans: s[1], done: false };
      opts.innerHTML = '';
      choice.forEach((c) => opts.append(PS.ui.button(c[1], () => {
        if (Q.done) return; Q.done = true; n++;
        const good = c[1] === Q.ans; if (good) ok++;
        fb.className = 'el-msg ' + (good ? 'ok' : 'bad'); fb.innerHTML = good ? '✔ 对了，这是<b>' + Q.ans + '</b>的符号。' : '✘ 这是<b>' + Q.ans + '</b>的符号。';
        score.innerHTML = '已做 ' + n + ' 个，答对 ' + ok + ' 个。'; good ? PS.sound.good() : PS.sound.bad();
      }, 'btn btn-sm')));
      fb.className = 'el-msg info'; fb.innerHTML = '画电路图时，元件要用统一规定的符号。';
      QS.render();
    }
    if (!document.getElementById('sym-style')) document.head.append(h('style', { id: 'sym-style' }, '.sym-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.sym-card{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff}.sym-card .stage{border:0;border-radius:0}.sym-name{text-align:center;font-weight:700;padding:4px 0 8px;font-size:.92rem}.sym-q{max-width:360px}'));
  });

  /* ================= 实物图与电路图 ================= */
  const RD_QS = [
    { d: { s: ['S', 'L'] }, alt: [{ s: ['L', 'S'] }, { b: [['S'], ['L']] }], why: '电流从正极出发，先经过开关 S，再经过灯泡 L，回到负极。' },
    { d: { s: ['S', 'L1', 'L2'] }, alt: [{ s: ['L1', 'S', 'L2'] }, { t: ['S'], b: [['L1'], ['L2']] }], why: '只有一条电流路径，依次经过 S、L1、L2：串联电路。' },
    { d: { t: ['S'], b: [['L1'], ['L2']] }, alt: [{ s: ['S', 'L1', 'L2'] }, { b: [['S', 'L1'], ['L2']] }], why: '电流在灯泡之前分成两路，分别经过 L1、L2 后汇合，再经过开关 S 回到负极：开关在干路上。' },
    { d: { t: ['S'], b: [['S1', 'L1'], ['S2', 'L2']] }, alt: [{ t: ['S'], b: [['S1', 'L2'], ['S2', 'L1']] }, { t: ['S1'], b: [['S', 'L1'], ['S2', 'L2']] }], why: 'S 在干路上，S1 与 L1 在同一条支路、S2 与 L2 在另一条支路。' },
    { d: { t: ['S'], b: [['L'], ['M']] }, alt: [{ b: [['S', 'L'], ['M']] }, { s: ['S', 'L', 'M'] }], why: '灯泡和电动机并联，开关 S 在干路上，同时控制它们。' },
    { d: { t: ['S1'], b: [['L'], ['S2', 'M']] }, alt: [{ t: ['S2'], b: [['L'], ['S1', 'M']] }, { b: [['S1', 'L'], ['S2', 'M']] }], why: 'S1 在干路上控制整个电路，S2 只控制电动机所在的支路。' },
  ];
  const LAYO = { x: 60, y: 38, w: 280, h: 160, Lc: 54 };
  function schemDraw(ctx, d, F, extra) { const C = EL.circuit(EL.layout(d, LAYO)); C.solve(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 240); C.draw(ctx, Object.assign({ F, size: 22, lw: 2.4, jr: 4.5 }, extra || {})); }
  /** 端点分组（只看导线）后按固定顺序编号；swap 中的元件两端对调 */
  function canon(comps, groups, swap) {
    const idx = {}, out = [];
    comps.forEach((c) => {
      let ks = c.t === 'bat' ? [c.id + '.+', c.id + '.-'] : [c.id + '.1', c.id + '.2'];
      if (swap && swap.has(c.id)) ks = [ks[1], ks[0]];
      ks.forEach((k) => { const g = groups(k); if (!(g in idx)) idx[g] = Object.keys(idx).length; out.push(idx[g]); });
    });
    return out.join(',');
  }
  function wireGroups(wires) {
    const par = {};
    const find = (k) => { if (par[k] == null) par[k] = k; while (par[k] !== k) k = par[k]; return k; };
    wires.forEach((w) => { const a = find(w[0]), b = find(w[1]); if (a !== b) par[a] = b; });
    return find;
  }
  /** 两种连法是否等效（灯泡、开关、电动机两端可以对调） */
  EL.sameWiring = function (comps, w1, w2) {
    const g1 = wireGroups(w1), g2 = wireGroups(w2), c1 = canon(comps, g1);
    const sym = comps.filter((c) => c.t !== 'bat' && c.t !== 'amm' && c.t !== 'led');
    for (let m = 0; m < 1 << sym.length; m++) {
      const sw = new Set(sym.filter((c, i) => m & (1 << i)).map((c) => c.id));
      if (canon(comps, g2, sw) === c1) return true;
    }
    return false;
  };

  PS.register('real-diagram', function (el, opts) {
    const st = { mode: opts.mode || 'pick', qi: 0, order: [], on: {}, wires: [], sel: null, t: 0, spin: 0, done: false, lay: null };
    const modeSeg = PS.ui.seg([{ value: 'pick', label: '看实物图，选电路图' }, { value: 'wire', label: '按电路图，连接实物' }], st.mode, (v) => { st.mode = v; load(st.qi); });
    const view = h('div');
    const optBox = h('div', { class: 'rd-opts' });
    const schemBox = h('div', { class: 'rd-schem' });
    const tools = h('div', { class: 'controls' });
    const msg = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(h('div', { class: 'controls' }, modeSeg.el, PS.ui.button('下一题 ▶', () => load(st.qi + 1), 'btn btn-ghost btn-sm')),
      h('div', { class: 'rd-wrap' }, h('div', { class: 'rd-left' }, schemBox, view), h('div', { class: 'rd-right' }, optBox)), tools, msg, score);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 700 : 560), draw });
    const SS = PS.stage(schemBox, { ratio: '400 / 240', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 400, 240); schemDraw(ctx, RD_QS[st.qi].d, F); D.text(ctx, '电路图', 12, F(13) + 6, { size: F(13), weight: 800, color: '#3b5bdb' }); } });
    let n = 0, ok = 0;
    const order = RD_QS.map((_, i) => i);
    function load(i) {
      st.qi = ((i % RD_QS.length) + RD_QS.length) % RD_QS.length;
      const Q = RD_QS[st.qi];
      st.lay = EL.realLayout(Q.d); st.on = {}; st.sel = null; st.done = false;
      st.lay.comps.forEach((c) => { if (c.t === 'sw') st.on[c.id] = { on: false }; });
      st.wires = st.mode === 'pick' ? st.lay.wires.map((w, k) => [w[0], w[1], WC[k % WC.length]]) : [];
      optBox.innerHTML = ''; tools.innerHTML = '';
      schemBox.style.display = st.mode === 'wire' ? '' : 'none';
      optBox.style.display = st.mode === 'pick' ? '' : 'none';
      if (st.mode === 'pick') {
        const ds = [Q.d].concat(Q.alt).map((d, k) => ({ d, k })).sort(() => Math.random() - 0.5);
        ds.forEach((o, j) => {
          const card = h('button', { type: 'button', class: 'rd-opt' }); const cv = h('div');
          card.append(h('b', null, '图' + '甲乙丙丁'[j]), cv);
          PS.stage(cv, { ratio: '400 / 240', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 400, 240); schemDraw(ctx, o.d, F); } });
          card.addEventListener('click', () => {
            if (st.done) return; st.done = true; n++;
            const good = o.k === 0; if (good) ok++;
            optBox.querySelectorAll('.rd-opt').forEach((b, m) => b.classList.add(ds[m].k === 0 ? 'right' : m === j ? 'wrong' : 'dim'));
            msg.className = 'el-msg ' + (good ? 'ok' : 'bad'); msg.innerHTML = (good ? '✔ 正确！' : '✘ 不对，正确的是图' + '甲乙丙丁'[ds.findIndex((x) => x.k === 0)] + '。') + Q.why + '画电路图时，要<b>按电流的路径</b>，依次画出各元件的符号，使电路图与实物图<b>一一对应</b>。';
            score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
          });
          optBox.append(card);
        });
        msg.className = 'el-msg info'; msg.innerHTML = '看左边的实物图（可以点开关试一试），从电源正极出发，顺着导线“走”一遍，再选出与它对应的电路图。';
      } else {
        tools.append(PS.ui.button('✔ 检查连接', check, 'btn btn-primary btn-sm'), PS.ui.button('↶ 撤销', () => { st.wires.pop(); solve(); }, 'btn btn-sm'), PS.ui.button('清除导线', () => { st.wires = []; solve(); }, 'btn btn-ghost btn-sm'));
        msg.className = 'el-msg info'; msg.innerHTML = '按上面的电路图连接实物：先点一个接线柱，再点另一个接线柱，就连上一根导线（点导线可以拆掉）。一个接线柱上可以接两根导线。连好后点“检查连接”，也可以点开关试一试。连接时开关应<b>断开</b>。';
      }
      solve(); SS.render();
    }
    function check() {
      const good = EL.sameWiring(st.lay.comps, st.lay.wires, st.wires);
      n++; if (good) ok++;
      msg.className = 'el-msg ' + (good ? 'ok' : 'bad');
      msg.innerHTML = good ? '✔ 连接正确！实物电路与电路图一致。闭合开关试一试。' : st.wires.length < st.lay.wires.length - 1 ? '✘ 还没有连完。从电源正极出发，按电流的路径一个一个元件地连接。' : '✘ 连接与电路图不一致。从电源正极出发，沿着电路图的电流路径，对照实物逐个检查：哪个元件在干路上？哪几个在同一条支路上？';
      score.innerHTML = '已检查 ' + n + ' 次，正确 ' + ok + ' 次。'; good ? PS.sound.good() : PS.sound.bad();
    }
    let sol = null;
    function solve() {
      const net = EL.realNet(st.lay, st.wires, st.on);
      sol = EL.solve(net);
      st.lay.comps.forEach((c) => { const s = st.on[c.id] || (st.on[c.id] = {}); if (c.t === 'bulb' || c.t === 'bell') s.lit = Math.max(0, (sol.P[c.id] || 0) / 0.75) * (c.t === 'bell' ? 20 : 1); s.hot = c.t === 'bat' && sol.short.length > 0; });
      if (sol.short.length && st.mode === 'wire') { msg.className = 'el-msg bad'; msg.innerHTML = '⚠️ 电源短路了！导线直接把电源的两极连了起来。快断开开关，检查导线。'; }
      S.render();
    }
    let T = {}, paths = [];
    const hitT = (p) => { let best = null, bd = S.VH > 600 ? 36 : 26; Object.keys(T).forEach((k) => { const d = Math.hypot(p.x - T[k][0], p.y - T[k][1]); if (d < bd) { bd = d; best = k; } }); return best; };
    PS.drag(S, {
      VW: 1000, get VH() { return S.VH; },
      hit: (p) => {
        if (st.mode === 'wire') { const t = hitT(p); if (t) return { t }; }
        const sw = st.lay.comps.find((c) => c.t === 'sw' && Math.hypot(p.x - c.x, p.y - (c.y - 25)) < 50);
        if (sw) return { sw };
        if (st.mode === 'wire') { const k = paths.findIndex((pt) => pt.some((q) => Math.hypot(q[0] - p.x, q[1] - p.y) < 12)); if (k >= 0) return { w: k }; }
        return null;
      },
      start: (o) => {
        if (o.sw) { st.on[o.sw.id].on = !st.on[o.sw.id].on; PS.sound.clack(); solve(); return; }
        if (o.w != null) { st.wires.splice(o.w, 1); st.sel = null; solve(); return; }
        if (!st.sel) { st.sel = o.t; S.render(); return; }
        if (st.sel !== o.t) { st.wires.push([st.sel, o.t, WC[st.wires.length % WC.length]]); PS.sound.tick(); }
        st.sel = null; solve();
      },
      move() {},
    });
    const loop = PS.loop((dt) => { st.t += dt; st.lay.comps.forEach((c) => { if (c.t === 'motor' && sol && Math.abs(sol.I[c.id] || 0) > 0.02) st.on[c.id].spin = (st.on[c.id].spin || 0) + dt * 25; }); S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 600, k = nar ? 1.25 : 1;
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      ctx.save(); ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500, 0);
      T = EL.realDraw(ctx, st.lay, { st: st.on, fs: F(14) / k, t: st.t });
      paths = st.wires.map((wr, i) => {
        const a = T[wr[0]], b = T[wr[1]];
        const pts = REAL.wire(ctx, a, b, { color: wr[2], w: 5 });
        const I = sol ? sol.I['w' + i] || 0 : 0;
        if (Math.abs(I) > 0.003) EL.dots(ctx, pts, st.t * EL.speed(I), { gap: 30, r: 4 });
        return pts;
      });
      if (st.mode === 'wire') Object.keys(T).forEach((key) => { const p = T[key], on = key === st.sel; ctx.strokeStyle = on ? '#3b5bdb' : 'rgba(59,91,219,.35)'; ctx.lineWidth = on ? 4 : 2; ctx.beginPath(); ctx.arc(p[0], p[1], on ? 15 : 12, 0, TAU); ctx.stroke(); });
      ctx.restore();
      paths = paths.map((pt) => pt.map((q) => [500 + (q[0] - 500) * k, q[1] * k]));
      Object.keys(T).forEach((key) => { T[key] = [500 + (T[key][0] - 500) * k, T[key][1] * k]; });
      D.text(ctx, st.mode === 'pick' ? '实物图' : '实物（点接线柱连线）', 16, F(14) + 8, { size: F(14), weight: 800, color: '#7a6a50' });
    }
    if (!document.getElementById('rd-style')) document.head.append(h('style', { id: 'rd-style' }, '.rd-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,240px);gap:12px;align-items:start}.rd-opts{display:grid;gap:8px}.rd-opt{display:block;width:100%;text-align:left;border:2px solid var(--line);border-radius:12px;background:#fff;padding:4px 6px;cursor:pointer;font:inherit}.rd-opt:hover{border-color:var(--primary)}.rd-opt.right{border-color:#2b8a3e;background:#ebfbee}.rd-opt.wrong{border-color:#e03131;background:#fff5f5}.rd-opt.dim{opacity:.55}.rd-opt .stage{border:0}.rd-schem{max-width:420px;margin:0 auto 8px;border:1px solid var(--line);border-radius:10px;overflow:hidden}@media (max-width:680px){.rd-wrap{grid-template-columns:minmax(0,1fr)}}'));
    load(0);
    el._st = st; el._check = check;
    el._solve = () => { st.wires = st.lay.wires.map((w, i) => [w[0], w[1], WC[i % WC.length]]); solve(); };
  });

  /* ================= 通路、断路、短路 ================= */
  PS.register('circuit-states', function (el) {
    const st = { on: false, un1: false, brk: false, s1: false, sp: false, t: 0 };
    const btns = {};
    const tg = (k, t) => { const b = PS.ui.button(t, () => { st[k] = !st[k]; PS.sound.tick(); solve(); }, 'btn btn-sm'); btns[k] = b; return b; };
    const big = h('div', { class: 'cs-big' });
    const msg = h('div', { class: 'el-msg info' });
    const view = h('div');
    el.append(view, h('div', { class: 'el-chips' }, tg('on', '闭合开关'), tg('un1', '拧下灯泡 L1'), tg('brk', '导线接头松了'), tg('s1', '用导线连接 L1 的两端'), tg('sp', '用导线直接连接电源两极'), PS.ui.button('复原', () => { Object.assign(st, { on: false, un1: false, brk: false, s1: false, sp: false }); solve(); }, 'btn btn-ghost btn-sm')), big, msg);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 640 : 520), draw });
    let sol = null;
    const P = { bat: [500, 440], S: [830, 330], L1: [330, 180], L2: [670, 180] };
    function net() {
      return { els: [
        { id: 'E', t: 'bat', a: 'p', b: 'n' }, { id: 'S', t: 'sw', a: 'p2', b: 's2', on: st.on }, { id: 'L2', t: 'bulb', a: 'l2b', b: 'l2a' }, { id: 'L1', t: 'bulb', a: 'l1b', b: 'l1a', open: st.un1 },
        { id: 'w1', t: 'wire', a: 'p', b: 'p2' }, { id: 'w2', t: 'wire', a: 's2', b: 'l2b' }, { id: 'w3', t: 'wire', a: 'l2a', b: 'l1b', open: st.brk }, { id: 'w4', t: 'wire', a: 'l1a', b: 'n' },
      ].concat(st.s1 ? [{ id: 'x1', t: 'wire', a: 'l1b', b: 'l1a' }] : [], st.sp ? [{ id: 'x2', t: 'wire', a: 'p', b: 'n' }] : []) };
    }
    function solve() {
      sol = EL.solve(net());
      btns.on.innerHTML = st.on ? '断开开关' : '闭合开关';
      ['un1', 'brk', 's1', 'sp'].forEach((k) => btns[k].classList.toggle('on', st[k]));
      const I = sol.out.E, lit1 = (sol.P.L1 || 0) / 0.75, lit2 = (sol.P.L2 || 0) / 0.75;
      let name, s, c;
      if (sol.short.length) { name = '短路（电源短路）'; c = 'bad'; s = '导线<b>不经过用电器</b>直接把电源的两极连了起来，电路中的电流<b>很大</b>（约 ' + PS.fmt(I, 1) + ' A），会烧坏电源，甚至引起火灾——这是<b>绝对不允许</b>的！' + (st.s1 && !st.sp ? '（L2 已被拧下或断开时，连接 L1 两端的导线也会造成电源短路。）' : ''); }
      else if (I < 0.005) { name = '断路（开路）'; c = 'info'; s = '电路中某处<b>断开</b>了' + (!st.on ? '（开关断开）' : st.un1 ? '（L1 被拧下）' : st.brk ? '（导线接头松了）' : '') + '，电路中<b>没有电流</b>，两个灯泡都不亮。'; }
      else if (st.s1 && !st.un1) { name = '通路（L1 被短路）'; c = 'ok'; s = '导线接在 L1 的两端，电流几乎全部从这根导线流过，<b>L1 被短路</b>，不亮（但不会损坏）；L2 仍然发光，而且<b>更亮</b>了。这叫<b>局部短路</b>，不会造成电源短路。'; }
      else { name = '通路'; c = 'ok'; s = '电路处处接通，电路中有电流（约 ' + PS.fmt(I, 2) + ' A），用电器能够工作。'; }
      big.textContent = name; big.className = 'cs-big ' + c;
      msg.className = 'el-msg ' + c; msg.innerHTML = s;
      st.lit = [lit1, lit2];
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), nar = VH > 560, k = nar ? 1.2 : 1;
      ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, 1000, VH);
      ctx.save(); ctx.translate(500, 0); ctx.scale(k, k); ctx.translate(-500, 0);
      const fs = F(14) / k, short = sol && sol.short.length;
      const bt = REAL.battery(ctx, P.bat[0], P.bat[1], 210, { n: 2, hot: short });
      const sw = REAL.sw(ctx, P.S[0], P.S[1], 160, st.on, { label: '开关 S', fs });
      const l1 = REAL.bulb(ctx, P.L1[0], P.L1[1], 140, st.lit ? st.lit[0] : 0, { label: 'L1', fs, removed: st.un1 });
      const l2 = REAL.bulb(ctx, P.L2[0], P.L2[1], 140, st.lit ? st.lit[1] : 0, { label: 'L2', fs });
      const I = (id) => (sol ? sol.I[id] || 0 : 0);
      const wire = (id, a, b, o) => {
        const hot = short && Math.abs(I(id)) > 1;
        const pts = REAL.wire(ctx, a, b, Object.assign({ hot }, o));
        if (Math.abs(I(id)) > 0.003) EL.dots(ctx, pts, st.t * EL.speed(I(id)), { gap: 30, r: 4.5 });
        return pts;
      };
      wire('w1', bt.pos, sw.t1, { color: '#e03131', c1: [bt.pos[0] + 80, bt.pos[1] + 30], c2: [sw.t1[0] - 20, sw.t1[1] + 70] });
      wire('w2', sw.t2, l2.t2, { color: '#f59f00', c1: [sw.t2[0] + 60, sw.t2[1] - 90], c2: [l2.t2[0] + 120, l2.t2[1] + 30] });
      if (!st.brk) wire('w3', l2.t1, l1.t2, { color: '#1c7ed6', sag: 50 });
      else { REAL.wire(ctx, l2.t1, [500, 250], { color: '#1c7ed6', sag: 10 }); REAL.wire(ctx, [478, 262], l1.t2, { color: '#1c7ed6', sag: 10 }); D.text(ctx, '接头松了', 490, 300, { size: fs, weight: 800, align: 'center', color: '#e03131' }); }
      wire('w4', l1.t1, bt.neg, { color: '#212529', c1: [l1.t1[0] - 140, l1.t1[1] + 40], c2: [bt.neg[0] - 120, bt.neg[1] - 20] });
      if (st.s1) wire('x1', l1.t1, l1.t2, { color: '#2b8a3e', c1: [l1.t1[0] - 10, l1.t1[1] + 70], c2: [l1.t2[0] + 10, l1.t2[1] + 70] });
      if (st.sp) wire('x2', bt.pos, bt.neg, { color: '#ae3ec9', c1: [bt.pos[0] + 40, bt.pos[1] + 80], c2: [bt.neg[0] - 40, bt.neg[1] + 80] });
      if (short) {
        for (let i = 0; i < 5; i++) { const ph = (st.t * 0.6 + i / 5) % 1; ctx.fillStyle = 'rgba(134,142,150,' + (0.45 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(P.bat[0] - 40 + i * 20 + Math.sin(st.t * 3 + i) * 8, P.bat[1] - 50 - ph * 120, 12 + ph * 18, 0, TAU); ctx.fill(); }
        D.text(ctx, '⚠ 电池发烫！', P.bat[0], P.bat[1] - 70, { size: F(16) / k, weight: 900, align: 'center', color: '#e03131', bg: 'rgba(255,255,255,.85)' });
      }
      ctx.restore();
    }
    solve();
    loop.start();
    if (!document.getElementById('cst-style')) document.head.append(h('style', { id: 'cst-style' }, '.cs-big{margin-top:8px;font-size:1.3rem;font-weight:800;text-align:center;padding:6px;border-radius:10px;background:var(--surface-2)}.cs-big.ok{color:#2b8a3e;background:var(--green-soft)}.cs-big.bad{color:#e03131;background:var(--red-soft)}.cs-big.info{color:#495057}'));
  });

  /* ================= 判断电路的状态 ================= */
  const SJ = [
    { n: '开关闭合', d: { s: [{ k: 'S', on: true }, 'L'] }, a: 0, why: '电路处处接通，灯泡发光。' },
    { n: '开关断开', d: { s: ['S', 'L'] }, a: 1, why: '开关断开，电路中没有电流。' },
    { n: '灯丝断了', d: { s: [{ k: 'S', on: true }, { k: 'L', open: true }] }, a: 1, why: '灯丝断了，电路在灯泡处断开。' },
    { n: '导线断了', d: { s: [{ k: 'S', on: true }, 'L'] }, brk: true, a: 1, why: '导线断开，电路中没有电流。' },
    { n: '导线接在灯泡两端', d: { s: [{ k: 'S', on: true }, 'L'] }, by: 'L', a: 2, why: '导线不经过用电器把电源两极连起来了（灯泡被短路，电源也被短路），电流很大。' },
    { n: '导线接在电源两端', d: { s: [{ k: 'S', on: true }, 'L'] }, by: 'E', off: 36, a: 2, why: '导线直接连接电源的正、负极，电源短路。' },
    { n: '开关与灯泡并联', d: { s: ['L'] }, bySw: 'L', a: 2, why: '开关闭合后，电流不经过灯泡，直接通过开关回到负极：电源短路。' },
    { n: '两灯串联，导线接在 L1 两端', d: { s: [{ k: 'S', on: true }, 'L1', 'L2'] }, by: 'L1', a: 3, why: 'L1 被短路，不亮；电流经过 L2 回到负极，L2 发光。这是局部短路。' },
    { n: '两灯并联', d: { t: [{ k: 'S', on: true }], b: [['L1'], ['L2']] }, a: 0, why: '两条支路都接通，两灯都发光。' },
    { n: '两灯串联，开关断开', d: { s: ['S', 'L1', 'L2'] }, by: 'L1', a: 1, why: '开关断开，整个电路中都没有电流（导线接在 L1 两端也不起作用）。' },
    { n: '两灯并联，导线接在 L2 两端', d: { t: [{ k: 'S', on: true }], b: [['L1'], ['L2']] }, by: 'L2', a: 2, why: '并联电路中，一个灯泡被导线短路，电源也被短路了，两灯都不亮，电流很大。' },
  ];
  const SJ_OPT = ['通路', '断路', '电源短路', '局部短路'];
  PS.register('state-judge', function (el) {
    const view = h('div');
    const opts = h('div', { class: 'el-chips' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(view, h('p', { class: 'small', style: { margin: '6px 0 0' } }, '这个电路处于什么状态？'), opts, h('div', { class: 'controls', style: { marginTop: '6px' } }, PS.ui.button('下一个 ▶', next, 'btn btn-ghost btn-sm')), fb, score);
    const S = EN.stage(view, { VW: 1000, vh: (w) => (EN.narrow(w) ? 640 : 420), draw });
    let Q = null, C = null, n = 0, ok = 0, bag = [];
    function next() {
      if (!bag.length) bag = SJ.map((_, i) => i).sort(() => Math.random() - 0.5);
      Q = SJ[bag.pop()];
      const spec = EL.layout(Q.d, { x: 330, y: 70, w: 340, h: 250, Lc: 70 });
      if (Q.brk) { const w = spec.els.find((e) => e.t === 'wire' && e.via && e.via.length); if (w) w.open = true; }
      if (Q.by) EL.bypass(spec, Q.by, { off: Q.off || -48 });
      if (Q.bySw) EL.bypass(spec, Q.bySw, { off: -60, t: 'sw', sw: { on: true }, label: 'S' });
      C = EL.circuit(spec); C.solve(); Q.done = false; Q.show = false;
      opts.innerHTML = '';
      SJ_OPT.forEach((t, k) => opts.append(PS.ui.button(t, () => {
        if (Q.done) return; Q.done = true; Q.show = true; n++;
        const good = k === Q.a; if (good) ok++;
        opts.querySelectorAll('.btn').forEach((b, m) => b.classList.toggle('on', m === Q.a));
        fb.className = 'el-msg ' + (good ? 'ok' : 'bad'); fb.innerHTML = (good ? '✔ 正确！' : '✘ 应该是<b>' + SJ_OPT[Q.a] + '</b>。') + Q.why + '（画面中显示了电流）';
        score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
      }, 'btn btn-sm')));
      fb.className = 'el-msg info'; fb.innerHTML = '通路：用电器正常工作；断路：电路某处断开，没有电流；电源短路：导线不经过用电器直接连接电源两极；局部短路：导线接在某个用电器两端，它不工作，其他用电器照常工作。';
      S.render();
    }
    const loop = PS.loop((dt) => { if (C) C.step(dt); S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), k = VH > 500 ? 1.75 : 1;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, VH);
      if (!C) return;
      ctx.save(); ctx.translate(500, VH / 2 + (k > 1 ? 20 : 0)); ctx.scale(k, k); ctx.translate(-500, -200);
      C.draw(ctx, { F: (p) => F(p) / k, dots: Q.show, lw: 3, size: 32, jr: 6 });
      ctx.restore();
      D.text(ctx, '情形：' + Q.n, 24, F(14) + 12, { size: F(14), weight: 800, color: '#495057' });
    }
    next();
    loop.start();
  });
})();
