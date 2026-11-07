/* 第15章第3节：串联和并联——串联和并联的特点 series-parallel、判断串联还是并联 sp-judge、设计生活中的电路 life-circuits、
 * 生活中的串联和并联 life-sort。依赖 circuit.js（EL.layout、EL.circuit） */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el;

  /** 在固定电路上点开关 / 灯泡：返回命中的元件 */
  function hitEl(C, p, types) {
    let best = null, bd = 42;
    C.spec.els.forEach((e) => {
      if (types.indexOf(e.t) < 0) return;
      const a = C.spec.pos[e.a], b = C.spec.pos[e.b], d = Math.hypot(p.x - (a[0] + b[0]) / 2, p.y - (a[1] + b[1]) / 2);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }
  /** 统计有电流的“支路”条数（并联电路的电流路径） */
  const lit = (C, id) => C.lit(id) > 0.04;

  /* ================= 串联和并联的特点 ================= */
  PS.register('series-parallel', function (el) {
    const st = { pos: 0, sw: { S: false }, psw: { S: false, S1: true, S2: true }, open: {}, popen: {}, log: [] };
    const ORD = [['S', 'L1', 'L2'], ['L1', 'S', 'L2'], ['L1', 'L2', 'S']];
    let C1, C2;
    const v1 = h('div'), v2 = h('div');
    const r1 = h('div', { class: 'el-chips' }), r2 = h('div', { class: 'el-chips' });
    const m1 = h('div', { class: 'el-msg info' }), m2 = h('div', { class: 'el-msg info' });
    const logBox = h('div', { class: 'el-msg info' });
    el.append(h('div', { class: 'sp-two' },
      h('div', { class: 'panel' }, h('h4', null, '串联电路'), v1, r1, m1),
      h('div', { class: 'panel' }, h('h4', null, '并联电路'), v2, r2, m2)), h('div', { class: 'small muted', style: { marginTop: '4px' } }, '点画面中的开关可以闭合、断开，点灯泡可以拧下、拧上。'), logBox);
    const S1 = PS.stage(v1, { ratio: '500 / 330', draw: (ctx, w, hh) => drawC(ctx, w, hh, C1) });
    const S2 = PS.stage(v2, { ratio: '500 / 330', draw: (ctx, w, hh) => drawC(ctx, w, hh, C2) });
    const BOX = { x: 70, y: 40, w: 360, h: 230, Lc: 58 };
    function build() {
      C1 = EL.circuit(EL.layout({ s: ORD[st.pos].map((k) => ({ k, on: st.sw[k], open: st.open[k] })) }, BOX));
      C2 = EL.circuit(EL.layout({ t: [{ k: 'S', on: st.psw.S }], b: [[{ k: 'S1', on: st.psw.S1 }, { k: 'L1', open: st.popen.L1 }], [{ k: 'S2', on: st.psw.S2 }, { k: 'L2', open: st.popen.L2 }]] }, BOX));
      C1.solve(); C2.solve();
      tell();
    }
    function note(s) { if (st.acted && st.log[st.log.length - 1] !== s) { st.log.push(s); if (st.log.length > 6) st.log.shift(); } }
    function tell() {
      r1.innerHTML = ''; r2.innerHTML = '';
      const b = (row, t, f, on) => { const x = PS.ui.button(t, () => { f(); st.acted = true; PS.sound.tick(); build(); }, 'btn btn-sm' + (on ? ' on' : '')); row.append(x); };
      b(r1, st.sw.S ? '断开 S' : '闭合 S', () => { st.sw.S = !st.sw.S; });
      ['L1', 'L2'].forEach((k) => b(r1, st.open[k] ? '拧上 ' + k : '拧下 ' + k, () => { st.open[k] = !st.open[k]; }, st.open[k]));
      b(r1, '改变开关的位置', () => { st.pos = (st.pos + 1) % 3; });
      ['S', 'S1', 'S2'].forEach((k) => b(r2, st.psw[k] ? '断开 ' + k : '闭合 ' + k, () => { st.psw[k] = !st.psw[k]; }));
      ['L1', 'L2'].forEach((k) => b(r2, st.popen[k] ? '拧上 ' + k : '拧下 ' + k, () => { st.popen[k] = !st.popen[k]; }, st.popen[k]));
      const s1 = ['L1', 'L2'].map((k) => (lit(C1, k) ? k + ' 亮' : k + ' 不亮')).join('，'), s2 = ['L1', 'L2'].map((k) => (lit(C2, k) ? k + ' 亮' : k + ' 不亮')).join('，');
      const n1 = lit(C1, 'L1') || lit(C1, 'L2') ? 1 : 0, n2 = (lit(C2, 'L1') ? 1 : 0) + (lit(C2, 'L2') ? 1 : 0);
      m1.className = 'el-msg ' + (n1 ? 'ok' : 'info'); m1.innerHTML = s1 + '。' + (n1 ? '电流只有<b>一条路径</b>。' : '') + (st.sw.S && (st.open.L1 || st.open.L2) ? '<br>拧下一个灯泡，另一个也不亮：<b>各用电器相互影响</b>。' : '') + (st.pos ? '<br>开关换了位置，仍然同时控制两个灯泡：串联电路中<b>开关的位置不影响</b>它的控制作用。' : '');
      m2.className = 'el-msg ' + (n2 ? 'ok' : 'info'); m2.innerHTML = s2 + '。' + (n2 ? '电流有 <b>' + n2 + ' 条</b>路径。' : '') + (st.psw.S && (st.popen.L1 || st.popen.L2) && n2 ? '<br>拧下一个灯泡，另一个照样发光：<b>各用电器互不影响</b>。' : '') + (!st.psw.S ? '<br>干路开关 S 断开，两灯都不亮：<b>干路开关控制整个电路</b>。' : st.psw.S1 !== st.psw.S2 ? '<br>支路开关只控制<b>它所在支路</b>的用电器。' : '');
      if (st.sw.S && st.open.L1 !== st.open.L2) note('串联：拧下一个灯泡，另一个也熄灭——一处不通，都受牵连。');
      if (st.pos && st.sw.S) note('串联：开关的位置改变了，它对两灯的控制作用不变。');
      if (st.psw.S && st.psw.S1 && st.psw.S2 && st.popen.L1 !== st.popen.L2) note('并联：拧下一个灯泡，另一个照样发光——互不影响。');
      if (st.psw.S && st.psw.S1 !== st.psw.S2) note('并联：支路开关只控制所在支路的灯泡。');
      if (!st.psw.S) note('并联：断开干路开关 S，两灯都熄灭——干路开关控制整个电路。');
      logBox.className = 'el-msg ' + (st.log.length ? 'ok' : 'info');
      logBox.innerHTML = st.log.length ? '<b>你的发现：</b><br>' + st.log.map((s) => '· ' + s).join('<br>') : '分别闭合两个电路的开关，再试试拧下一个灯泡、断开支路开关、改变串联电路中开关的位置……';
      S1.render(); S2.render();
    }
    function drawC(ctx, w, hh, C) {
      const F = PS.virtual(ctx, w, hh, 500, 330);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 500, 330);
      if (C) C.draw(ctx, { F, dots: true, lw: 2.6, size: 26, gap: 26, r: 3.6 });
    }
    function clickOn(C, isSeries) {
      return (p) => {
        const e = hitEl(C(), p, ['sw', 'bulb']);
        if (!e) return;
        st.acted = true;
        if (e.t === 'sw') { if (isSeries) st.sw[e.id] = !st.sw[e.id]; else st.psw[e.id] = !st.psw[e.id]; PS.sound.clack(); }
        else { const o = isSeries ? st.open : st.popen; o[e.id] = !o[e.id]; PS.sound.tick(); }
        build();
      };
    }
    PS.drag(S1, { VW: 500, VH: 330, hit: () => null, click: clickOn(() => C1, true), move() {} });
    PS.drag(S2, { VW: 500, VH: 330, hit: () => null, click: clickOn(() => C2, false), move() {} });
    const loop = PS.loop((dt) => { C1.step(dt); C2.step(dt); S1.render(); S2.render(); }, el);
    build();
    loop.start();
    if (!document.getElementById('sp-style')) document.head.append(h('style', { id: 'sp-style' }, '.sp-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.sp-two .panel{margin:0}@media (max-width:680px){.sp-two{grid-template-columns:minmax(0,1fr)}}'));
    el._st = st;
  });

  /* ================= 判断串联还是并联 ================= */
  const W = (id, a, b, via) => ({ id, t: 'wire', a, b, via });
  const SPJ = [
    { a: 0, spec: () => EL.layout({ s: [{ k: 'S', on: true }, 'L1', 'L2'] }, { x: 330, y: 60, w: 340, h: 260, Lc: 64 }), why: '电流从正极出发，依次经过 S、L1、L2 回到负极，只有一条路径。' },
    { a: 1, spec: () => EL.layout({ t: [{ k: 'S', on: true }], b: [['L1'], ['L2']] }, { x: 330, y: 60, w: 340, h: 260, Lc: 64 }), why: '电流在分支点分成两路，分别经过 L1、L2，再在汇合点汇合。' },
    { a: 0, spec: () => ({ pos: { bp: [220, 160], bn: [220, 290], a1: [470, 70], a2: [470, 190], b1: [700, 230], b2: [700, 350] }, els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'a1', [[220, 70]]), { id: 'L1', t: 'bulb', a: 'a1', b: 'a2', label: 'L1', ls: -1 }, W('w2', 'a2', 'b1', [[470, 230]]), { id: 'L2', t: 'bulb', a: 'b1', b: 'b2', label: 'L2', ls: -1 }, W('w3', 'b2', 'bn', [[700, 385], [220, 385]])] }), why: '虽然两灯画得错开，但电流从正极出发，先经过 L1，再经过 L2，回到负极，中间没有分支：串联。' },
    { a: 1, spec: () => ({ pos: { bp: [220, 150], bn: [220, 270], T1: [460, 80], T2: [720, 80], D1: [460, 340], D2: [720, 340] }, els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'T1', [[220, 80]]), W('w2', 'T1', 'T2'), W('w3', 'bn', 'D1', [[220, 340]]), W('w4', 'D1', 'D2'), { id: 'L1', t: 'bulb', a: 'T1', b: 'D1', label: 'L1', ls: -1, size: 32 }, { id: 'L2', t: 'bulb', a: 'T2', b: 'D2', label: 'L2', ls: -1, size: 32 }] }), why: '两灯竖着排成“梯子”，上端都连在电源正极，下端都连在电源负极：并联。' },
    { a: 1, spec: () => ({ pos: { bp: [560, 340], bn: [440, 340], A: [300, 130], B: [500, 130], C: [700, 130] }, els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'B', [[560, 230], [500, 230]]), { id: 'L1', t: 'bulb', a: 'B', b: 'A', label: 'L1' }, { id: 'L2', t: 'bulb', a: 'B', b: 'C', label: 'L2' }, W('w2', 'C', 'A', [[700, 50], [300, 50]]), W('w3', 'A', 'bn', [[300, 340]])] }), why: '两灯画在同一条线上，看起来像串联，其实 L1、L2 的一端都连在 B 点（接正极），另一端 A、C 用导线连在一起（接负极）：并联。用“电流流向法”试一试。' },
    { a: 0, spec: () => ({ pos: { bp: [160, 160], bn: [160, 280], a1: [420, 60], a2: [600, 60], b1: [600, 380], b2: [420, 380] }, els: [{ id: 'E', t: 'bat', a: 'bp', b: 'bn', n: 2 }, W('w1', 'bp', 'a1', [[160, 60]]), { id: 'L1', t: 'bulb', a: 'a1', b: 'a2', label: 'L1' }, W('w2', 'a2', 'b1', [[860, 60], [860, 380]]), { id: 'L2', t: 'bulb', a: 'b1', b: 'b2', label: 'L2', ls: -1 }, W('w3', 'b2', 'bn', [[160, 380]])] }), why: '两灯一上一下，但电流从正极出发先后经过 L1、L2，只有一条路径：串联。' },
    { a: 1, spec: () => EL.layout({ b: [[{ k: 'S1', on: true }, 'L1'], [{ k: 'S2', on: true }, 'L2']] }, { x: 330, y: 60, w: 340, h: 260, Lc: 60 }), why: '每条支路上各有一个开关和一个灯泡，两条支路并列连接在电源两端。' },
    { a: 0, spec: () => EL.layout({ s: [{ k: 'S1', on: true }, 'L1', { k: 'S2', on: true }, 'L2'] }, { x: 330, y: 60, w: 340, h: 260, Lc: 60 }), why: '两个开关、两个灯泡依次首尾相连，只有一条路径：串联（任何一个开关断开，两灯都熄灭）。' },
  ];
  PS.register('sp-judge', function (el) {
    const view = h('div');
    const opts = h('div', { class: 'el-chips' });
    const tools = h('div', { class: 'el-chips' });
    const fb = h('div', { class: 'el-msg info' });
    const score = h('div', { class: 'small muted' });
    el.append(view, h('p', { class: 'small', style: { margin: '6px 0 0' } }, '灯 L1 和 L2 是串联还是并联？'), opts, tools, fb, score);
    const S = PS.en.stage(view, { VW: 1000, vh: (w) => (PS.en.narrow(w) ? 600 : 430), draw });
    let Q = null, C = null, n = 0, ok = 0, bag = [];
    function next() {
      if (!bag.length) bag = SPJ.map((_, i) => i).sort(() => Math.random() - 0.5);
      Q = Object.assign({}, SPJ[bag.pop()]); Q.done = false; Q.show = false;
      C = EL.circuit(Q.spec()); C.solve();
      opts.innerHTML = ''; tools.innerHTML = '';
      ['串联', '并联'].forEach((t, k) => opts.append(PS.ui.button(t, () => {
        if (Q.done) return; Q.done = true; Q.show = true; n++;
        const good = k === Q.a; if (good) ok++;
        opts.querySelectorAll('.btn').forEach((b, m) => b.classList.toggle('on', m === Q.a));
        fb.className = 'el-msg ' + (good ? 'ok' : 'bad'); fb.innerHTML = (good ? '✔ 正确！' : '✘ 是<b>' + ['串联', '并联'][Q.a] + '</b>。') + Q.why;
        score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。'; good ? PS.sound.good() : PS.sound.bad();
      }, 'btn btn-sm')));
      tools.append(PS.ui.button('〰 电流流向法：显示电流', () => { Q.show = true; }, 'btn btn-ghost btn-sm'), PS.ui.button('🔧 电路通断法：拧下 L1', () => { const e = C.el('L1'); e.open = !e.open; C.solve(); Q.show = true; fb.className = 'el-msg info'; fb.innerHTML = e.open ? (C.lit('L2') > 0.04 ? 'L1 拧下后，L2 <b>仍然发光</b>：两灯互不影响，是<b>并联</b>。' : 'L1 拧下后，L2 也<b>熄灭</b>了：两灯相互影响，是<b>串联</b>。') : '已拧上 L1。'; }, 'btn btn-ghost btn-sm'), PS.ui.button('下一题 ▶', next, 'btn btn-ghost btn-sm'));
      fb.className = 'el-msg info'; fb.innerHTML = '方法：① 电流流向法——从电源正极出发，看电流有没有分支；② 电路通断法——去掉一个用电器，看另一个还能不能工作。';
      S.render();
    }
    const loop = PS.loop((dt) => { if (C) C.step(dt); S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), k = VH > 500 ? 1.3 : 1;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, VH);
      if (!C) return;
      ctx.save(); ctx.translate(500, VH / 2); ctx.scale(k, k); ctx.translate(-500, -215);
      C.draw(ctx, { F: (p) => F(p) / k, dots: Q.show, lw: 3, size: 30, jr: 6 });
      ctx.restore();
    }
    next();
    loop.start();
  });

  /* ================= 设计生活中的电路 ================= */
  const LIFE = [
    { n: '滚筒洗衣机', q: '筒门关闭时开关 S1 闭合，打开时 S1 断开；S1 和控制开关 S2 <b>都闭合</b>时，洗衣机的电动机 M 才能工作。', names: { S1: '筒门开关', S2: '控制开关', M: '电动机' },
      opts: [{ s: ['S1', 'S2', 'M'] }, { t: ['M'], b: [['S1'], ['S2']] }, { t: ['S1'], b: [['S2'], ['M']] }, { t: ['S2'], b: [['S1'], ['M']] }], why: '两个开关同时闭合用电器才工作，说明两个开关<b>串联</b>后再控制电动机。' },
    { n: '楼道里的灯', q: '天黑时光控开关 S1 闭合，有声音时声控开关 S2 闭合，只有<b>天黑且有声音</b>时灯 L 才亮。', names: { S1: '光控开关', S2: '声控开关', L: '灯' },
      opts: [{ s: ['S1', 'S2', 'L'] }, { t: ['L'], b: [['S1'], ['S2']] }, { t: ['S1'], b: [['S2'], ['L']] }, { b: [['S1', 'L'], ['S2']] }], why: '两个条件同时满足灯才亮，光控开关和声控开关应<b>串联</b>。' },
    { n: '公交车下车铃', q: '前门、后门各有一个按钮开关 S1、S2，乘客按下<b>任意一个</b>按钮，驾驶台上的电铃都会响。', names: { S1: '前门按钮', S2: '后门按钮', B: '电铃' },
      opts: [{ t: ['B'], b: [['S1'], ['S2']] }, { s: ['S1', 'S2', 'B'] }, { b: [['S1', 'B'], ['S2']] }, { t: ['S1'], b: [['S2'], ['B']] }], why: '任意一个开关闭合电铃都响，两个开关应<b>并联</b>，电铃在干路上。' },
    { n: '电吹风', q: '只闭合 S1 时吹冷风（电动机 M 工作）；S1、S2 都闭合时吹热风（电动机和电热丝 R 都工作）；<b>只闭合 S2 时电热丝不能工作</b>（防止过热）。', names: { S1: '总开关', S2: '加热开关', M: '电动机', R: '电热丝' },
      opts: [{ t: ['S1'], b: [['M'], ['S2', 'R']] }, { t: ['S2'], b: [['M'], ['S1', 'R']] }, { b: [['S1', 'M'], ['S2', 'R']] }, { s: ['S1', 'S2', 'M', 'R'] }], why: '电动机和电热丝<b>并联</b>（可以单独工作）；S1 在干路上控制整个电路，S2 只控制电热丝所在的支路。' },
    { n: '电冰箱', q: '打开冰箱门时，门控开关 S1 闭合，照明灯 L 亮；压缩机 M 由温控开关 S2 控制。照明灯和压缩机<b>互不影响</b>。', names: { S1: '门控开关', S2: '温控开关', L: '照明灯', M: '压缩机' },
      opts: [{ b: [['S1', 'L'], ['S2', 'M']] }, { t: ['S1'], b: [['L'], ['S2', 'M']] }, { s: ['S1', 'L', 'S2', 'M'] }, { b: [['S2', 'L'], ['S1', 'M']] }], why: '照明灯和压缩机<b>并联</b>，各自所在的支路上有一个开关分别控制它们。' },
    { n: '病房呼叫电路', q: '每张病床有一个开关，1 号床闭合 S1，护士站的灯 L1 亮；2 号床闭合 S2，灯 L2 亮；<b>无论哪张床呼叫</b>，电铃 B 都响。', names: { S1: '1 号床开关', S2: '2 号床开关', L1: '1 号灯', L2: '2 号灯', B: '电铃' },
      opts: [{ t: ['B'], b: [['S1', 'L1'], ['S2', 'L2']] }, { b: [['S1', 'L1'], ['S2', 'L2']] }, { t: ['B'], b: [['S1', 'L2'], ['S2', 'L1']] }, { t: ['S1'], b: [['B'], ['S2', 'L1', 'L2']] }], why: '两盏灯分别由各自的开关控制，应<b>并联</b>；电铃要在任何一个开关闭合时都响，应接在<b>干路</b>上。' },
  ];
  const LAY = { x: 300, y: 50, w: 400, h: 250, Lc: 60 };
  PS.register('life-circuits', function (el) {
    const st = { qi: 0, pick: null, on: {}, done: false };
    const head = h('div', { class: 'el-q' });
    const optBox = h('div', { class: 'lc-opts' });
    const view = h('div');
    const swRow = h('div', { class: 'el-chips' });
    const res = h('div', { class: 'el-msg info' });
    const fb = h('div', { class: 'el-msg info' });
    const nav = h('div', { class: 'el-chips' }, LIFE.map((L, i) => PS.ui.button(L.n, () => load(i), 'btn btn-sm')));
    el.append(nav, head, optBox, h('div', { class: 'small muted', style: { margin: '6px 0 2px' } }, '选一个方案，下面会画出它，拨动开关检验它能不能满足要求：'), view, swRow, res, h('div', { class: 'controls', style: { marginTop: '6px' } }, PS.ui.button('✔ 就选这个方案', check, 'btn btn-primary btn-sm')), fb);
    const S = PS.en.stage(view, { VW: 1000, vh: (w) => (PS.en.narrow(w) ? 600 : 360), draw });
    let C = null, order = [];
    const thumbs = [];
    function load(i) {
      st.qi = i; st.pick = null; st.done = false;
      const Q = LIFE[i];
      nav.querySelectorAll('.btn').forEach((b, k) => b.classList.toggle('on', k === i));
      head.innerHTML = '<b>' + Q.n + '：</b>' + Q.q;
      order = Q.opts.map((_, k) => k).sort(() => Math.random() - 0.5);
      optBox.innerHTML = ''; thumbs.length = 0;
      order.forEach((k, j) => {
        const card = h('button', { type: 'button', class: 'rd-opt' }); const cv = h('div');
        card.append(h('b', null, '方案 ' + 'ABCD'[j]), cv);
        thumbs.push(PS.stage(cv, { ratio: '400 / 240', draw: (ctx, w, hh) => { const F = PS.virtual(ctx, w, hh, 400, 240); const c = EL.circuit(EL.layout(Q.opts[k], { x: 70, y: 36, w: 260, h: 160, Lc: 46 })); c.solve(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 240); c.draw(ctx, { F, size: 18, lw: 2.2, jr: 4 }); } }));
        card.addEventListener('click', () => choose(j));
        optBox.append(card);
      });
      fb.className = 'el-msg info'; fb.innerHTML = '提示：几个开关<b>同时闭合</b>才工作 → 开关串联；<b>任意一个</b>闭合就工作 → 开关并联；用电器能<b>单独工作</b>、互不影响 → 用电器并联。';
      choose(0);
    }
    function choose(j) {
      st.pick = j; st.on = {};
      optBox.querySelectorAll('.rd-opt').forEach((b, m) => b.classList.toggle('sel', m === j));
      build();
    }
    function build() {
      const Q = LIFE[st.qi], d = JSON.parse(JSON.stringify(Q.opts[order[st.pick]]));
      const mark = (arr) => arr.map((k) => (k[0] === 'S' ? { k, on: !!st.on[k] } : k));
      if (d.s) d.s = mark(d.s); else { if (d.t) d.t = mark(d.t); d.b = d.b.map(mark); }
      C = EL.circuit(EL.layout(d, LAY)); C.solve();
      swRow.innerHTML = '';
      C.spec.els.filter((e) => e.t === 'sw').forEach((e) => swRow.append(PS.ui.button((st.on[e.id] ? '断开 ' : '闭合 ') + e.id + '（' + Q.names[e.id] + '）', () => { st.on[e.id] = !st.on[e.id]; PS.sound.clack(); build(); }, 'btn btn-sm' + (st.on[e.id] ? ' on' : ''))));
      const parts = [];
      if (C.sol.short.length) parts.push('⚠️ <b>电源短路！</b>');
      C.spec.els.forEach((e) => {
        if (['bulb', 'motor', 'bell', 'res'].indexOf(e.t) < 0) return;
        const on = Math.abs(C.I(e.id)) > 0.02 && !C.sol.short.length;
        parts.push(Q.names[e.id] + ' ' + e.id + '：' + (on ? { bulb: '亮', motor: '工作', bell: '响', res: '发热' }[e.t] : '不工作'));
      });
      res.className = 'el-msg ' + (C.sol.short.length ? 'bad' : 'info'); res.innerHTML = parts.join('；');
      S.render();
    }
    function check() {
      if (st.done) return;
      st.done = true;
      const Q = LIFE[st.qi], good = order[st.pick] === 0;
      optBox.querySelectorAll('.rd-opt').forEach((b, m) => b.classList.add(order[m] === 0 ? 'right' : m === st.pick ? 'wrong' : 'dim'));
      fb.className = 'el-msg ' + (good ? 'ok' : 'bad'); fb.innerHTML = (good ? '✔ 正确！' : '✘ 这个方案不满足要求，正确的是方案 ' + 'ABCD'[order.indexOf(0)] + '。') + Q.why;
      good ? PS.sound.good() : PS.sound.bad();
    }
    const loop = PS.loop((dt) => { if (C) C.step(dt); S.render(); }, view);
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, 1000, VH), k = VH > 400 ? 1.9 : 1;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1000, VH);
      if (!C) return;
      ctx.save(); ctx.translate(500, VH / 2); ctx.scale(k, k); ctx.translate(-500, -175);
      C.draw(ctx, { F: (p) => F(p) / k, dots: true, lw: 3, size: 28, jr: 6 });
      C.spec.els.forEach((e) => { if (e.t === 'motor' && Math.abs(C.I(e.id)) > 0.02 && !C.sol.short.length) { const a = C.spec.pos[e.a], b = C.spec.pos[e.b], t = performance.now() / 120; ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 24, t, t + 1.4); ctx.stroke(); } });
      ctx.restore();
    }
    if (!document.getElementById('lc-style')) document.head.append(h('style', { id: 'lc-style' }, '.lc-opts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:8px}.rd-opt.sel{border-color:var(--primary);box-shadow:0 0 0 3px var(--primary-soft)}@media (max-width:680px){.lc-opts{grid-template-columns:minmax(0,1fr)}}.rd-opt{display:block;width:100%;text-align:left;border:2px solid var(--line);border-radius:12px;background:#fff;padding:4px 6px;cursor:pointer;font:inherit}.rd-opt.right{border-color:#2b8a3e;background:#ebfbee}.rd-opt.wrong{border-color:#e03131;background:#fff5f5}.rd-opt.dim{opacity:.55}.rd-opt .stage{border:0}'));
    load(0);
    loop.start();
    el._pickRight = () => { choose(order.indexOf(0)); check(); };
  });

  /* ================= 生活中的串联和并联：分类 ================= */
  PS.register('life-sort', function (el) {
    PS.sortCards(el, [
      ['教室里的几盏日光灯', 1, '一盏坏了，其他的照常发光，可以单独控制'], ['马路上的路灯', 1, '一盏坏了，其他的照常发光'], ['家里的电灯和电视机', 1, '可以单独工作，互不影响'],
      ['房间里的电灯和控制它的开关', 0, '开关要控制电灯，必须与它串联'], ['一个灯泡坏了全都不亮的节日小彩灯', 0, '一处不通，都受牵连'], ['冰箱里的照明灯和压缩机', 1, '能各自单独工作'],
      ['汽车的两盏前大灯（一盏坏了另一盏还亮）', 1, '互不影响'], ['楼道灯的光控开关和声控开关', 0, '两个开关都闭合灯才亮'], ['公交车前门、后门的下车按钮', 1, '按任意一个电铃都响'],
      ['洗衣机的筒门开关和控制开关', 0, '两个开关都闭合才工作'], ['电吹风的电动机和电热丝', 1, '电动机可以单独工作（吹冷风）'], ['手电筒里的两节干电池', 0, '首尾相连，正极接负极'],
    ], ['串联', '并联']);
  });
})();
