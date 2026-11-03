/* 第11章第2节：功率——比较做功的快慢（爬楼）、P = W/t 与 P = Fv 计算器、常见的功率、估测上楼的功率、汽车上坡（功率一定时 F 与 v 成反比）。依赖 force.js、dynamics.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, EN = PS.en, EC = PS.EC;
  const TAU = Math.PI * 2;

  /** 楼梯间：底层地面 y0，每层高 fh 像素，n 层（之字形楼梯），左右边界 x0、x1；返回路径点 */
  function stairs(ctx, x0, x1, y0, fh, n, o) {
    o = o || {};
    const pts = [];
    ctx.save();
    ctx.fillStyle = o.bg || '#f1f3f5'; ctx.fillRect(x0 - 10, y0 - fh * n - 30, x1 - x0 + 20, fh * n + 30);
    ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 2;
    for (let i = 0; i <= n; i++) { const y = y0 - fh * i; ctx.beginPath(); ctx.moveTo(x0 - 10, y); ctx.lineTo(x1 + 10, y); ctx.stroke(); }
    ctx.fillStyle = '#868e96';
    for (let i = 0; i < n; i++) {
      const ya = y0 - fh * i, yb = ya - fh, L = i % 2 === 0, xa = L ? x0 + 30 : x1 - 30, xb = L ? x1 - 30 : x0 + 30, ns = 10;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(xa, ya);
      for (let k = 0; k < ns; k++) { const x = xa + ((xb - xa) * k) / ns, y = ya - ((ya - yb) * (k + 1)) / ns; ctx.lineTo(x, y); ctx.lineTo(xa + ((xb - xa) * (k + 1)) / ns, y); }
      ctx.stroke();
      pts.push([xa, ya], [xb, yb]);
      if (o.labels !== false) D.text(ctx, (i + 1) + ' 楼', x0 - 4, ya - 8, { size: o.fs || 12, weight: 700, color: '#868e96' });
    }
    if (o.labels !== false) D.text(ctx, (n + 1) + ' 楼', x0 - 4, y0 - fh * n - 8, { size: o.fs || 12, weight: 700, color: '#868e96' });
    ctx.restore();
    return pts;
  }
  /** 沿楼梯路径走到进度 p（0~1）时的位置和朝向 */
  function along(pts, p) {
    const n = pts.length / 2, k = Math.min(n - 1, Math.floor(p * n)), q = p * n - k;
    const a = pts[2 * k], b = pts[2 * k + 1];
    return { x: PS.lerp(a[0], b[0], q), y: PS.lerp(a[1], b[1], q), dir: b[0] > a[0] ? 1 : -1 };
  }

  /* ================= 比较做功的快慢：爬楼梯 ================= */
  PS.register('climb-race', function (el) {
    const VW = 1000, VH = 420, Y0 = 380, FH = 140, HM = 6, SPEED = 4;
    const MODES = {
      work: { n: '做功相同，比时间', A: { name: '小明', m: 50, t: 30, c: '#3b5bdb' }, B: { name: '小红', m: 50, t: 40, c: '#e64980' } },
      time: { n: '时间相同，比做功', A: { name: '爷爷', m: 65, t: 40, c: '#495057' }, B: { name: '小孙子', m: 30, t: 40, c: '#f08c00' } },
      both: { n: '做功和时间都不同', A: { name: '爷爷', m: 65, t: 40, c: '#495057' }, B: { name: '小明', m: 50, t: 25, c: '#3b5bdb' } },
    };
    const st = { mode: 'work', T: 0, run: false };
    const seg = PS.ui.seg(Object.keys(MODES).map((k) => ({ value: k, label: MODES[k].n })), st.mode, (v) => { st.mode = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const goB = PS.ui.button('▶ 一起出发', () => { if (done()) reset(); st.run = true; }, 'btn btn-primary btn-sm');
    const tb = h('tbody'), msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(goB, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm'), h('span', { class: 'small muted' }, '从 1 楼爬到 3 楼，升高 6 m（动画加快了 4 倍）')),
      h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['', '质量 m', '升高 h', '做的功 W = mgh', '所用时间 t', '1 s 内做的功'].map((t) => h('th', null, t)))), tb)), msg);
    const M = () => MODES[st.mode];
    const done = () => st.T >= Math.max(M().A.t, M().B.t);
    function reset() { st.T = 0; st.run = false; tell(); }
    function tell() {
      tb.innerHTML = '';
      ['A', 'B'].forEach((k) => {
        const p = M()[k], fin = st.T >= p.t, W = p.m * 10 * HM;
        tb.append(h('tr', null, h('td', null, h('b', { style: { color: p.c } }, p.name)), h('td', null, p.m + ' kg'), h('td', null, HM + ' m'), h('td', null, W + ' J'),
          h('td', null, fin ? p.t + ' s' : st.T > 0 ? PS.fmt(st.T, 0) + ' s…' : '—'), h('td', null, fin && done() ? h('b', null, PS.fmt(W / p.t, 1) + ' J') : '—')));
      });
      const { A, B } = M(), WA = A.m * 60, WB = B.m * 60;
      let t;
      if (!done()) t = st.run ? '比赛进行中……' : '点“一起出发”。猜一猜：谁做功<b>多</b>？谁做功<b>快</b>？';
      else if (st.mode === 'work') t = '两人质量相同，爬的高度相同，<b>做的功相同</b>（' + WA + ' J）；' + A.name + '用的时间短，做功<b>快</b>。——做相同的功，用时少的做功快（就像通过相同的路程，用时少的跑得快）。';
      else if (st.mode === 'time') t = '两人用的时间相同；' + A.name + '质量大，做的功多（' + WA + ' J > ' + WB + ' J），做功<b>快</b>。——相同时间内，做功多的做功快。';
      else t = A.name + '做的功多，但用的时间也长；' + B.name + '做的功少，用的时间短。只比功或只比时间都不行，要比<b>单位时间内做的功</b>：' + A.name + ' ' + PS.fmt(WA / A.t, 1) + ' J/s，' + B.name + ' ' + PS.fmt(WB / B.t, 0) + ' J/s，<b>' + (WA / A.t > WB / B.t ? A.name : B.name) + '做功快</b>。这就是<b>功率</b>。';
      msg.className = 'fc-msg ' + (done() ? 'ok' : 'info'); msg.innerHTML = t;
    }
    PS.loop((dt) => {
      if (!st.run) return;
      st.T = Math.min(Math.max(M().A.t, M().B.t), st.T + dt * SPEED);
      if (done()) { st.run = false; PS.sound.good(); }
      tell(); S.render();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      [['A', 70, 400], ['B', 560, 890]].forEach(([k, x0, x1]) => {
        const p = M()[k], pts = stairs(ctx, x0, x1, Y0, FH, 2, { fs: F(12) });
        const pos = along(pts, Math.min(1, st.T / p.t)), fin = st.T >= p.t;
        FO.person(ctx, pos.x, pos.y, { h: 62 + p.m * 0.5, color: p.c, dir: pos.dir, stride: fin || !st.run ? 0.2 : 0.2 + 0.25 * Math.sin(st.T * 6), lean: fin ? 0 : 0.15 });
        D.text(ctx, p.name + '（' + p.m + ' kg）', (x0 + x1) / 2, F(16) + 6, { size: F(16), weight: 800, align: 'center', color: p.c });
        EN.stopwatch(ctx, x1 + 52, 120, Math.min(st.T, p.t), { F, r: 40, fs: 15 });
        const W = p.m * 10 * HM * Math.min(1, st.T / p.t);
        D.text(ctx, 'W = ' + PS.fmt(W, 0) + ' J', x1 + 52, 200, { size: F(14), weight: 800, align: 'center', color: EC.W });
      });
    }
    tell();
  });

  /* ================= 功率计算器：P = W/t、P = Fv ================= */
  PS.register('power-calc', function (el) {
    const box = h('div');
    const seg = PS.ui.seg([{ value: 'wt', label: 'W = Pt（P = W/t）' }, { value: 'fv', label: 'P = Fv（拓展）' }], 'wt', (v) => build(v));
    el.append(PS.ui.row(seg.el), box);
    function build(m) {
      box.innerHTML = '';
      if (m === 'wt') EN.calc(box, {
        top: { k: 'W', short: '功 W', name: '功 <i>W</i>', unit: 'J', units: { J: 1, kJ: 1e3 }, v: '6×10^4' },
        a: { k: 'P', short: '功率 P', name: '功率 <i>P</i>', unit: 'W', units: { W: 1, kW: 1e3 }, v: '4000' },
        b: { k: 't', short: '时间 t', name: '时间 <i>t</i>', unit: 's', units: { s: 1, min: 60, h: 3600 }, v: '15' },
        mode: 'a',
        hint: '功率 P = W/t。单位要统一：功用 J、时间用 s，算出的功率单位是 W（1 W = 1 J/s）。',
        presets: [
          { t: '起重机 15 s 把 6 t 的石头匀速提升 1 m', mode: 'a', top: '6×10^4', b: 15, u: { top: 'J', b: 's' }, note: 'F = G = mg = 6×10⁴ N，W = Gh = 6×10⁴ J。' },
          { t: '抽水机每分钟把 6 m³ 水抽到 20 m 高处', mode: 'a', top: '1.2×10^6', b: 1, u: { top: 'J', b: 'min' }, note: 'G = ρVg = 6×10⁴ N，W = Gh = 1.2×10⁶ J，t = 1 min = 60 s。' },
          { t: '功率 1.5 kW 的电动机工作 10 min 做的功', mode: 'top', a: 1.5, b: 10, u: { a: 'kW', b: 'min' } },
          { t: '做 3 000 J 的功，功率 150 W，要多长时间', mode: 'b', top: 3000, a: 150, u: { top: 'J', a: 'W' } },
        ],
      });
      else EN.calc(box, {
        top: { k: 'P', short: '功率 P', name: '功率 <i>P</i>', unit: 'W', units: { W: 1, kW: 1e3 }, v: '60' },
        a: { k: 'F', short: '牵引力 F', name: '牵引力 <i>F</i>', unit: 'N', units: { N: 1, kN: 1e3 }, v: '3000' },
        b: { k: 'v', short: '速度 v', name: '速度 <i>v</i>', unit: 'm/s', units: { 'm/s': 1, 'km/h': 1 / 3.6 }, v: '20' },
        mode: 'a',
        hint: '物体在力 F 的作用下沿力的方向做匀速直线运动时，P = W/t = Fs/t = <b>Fv</b>。速度要用 m/s（1 m/s = 3.6 km/h）。',
        extra: (k) => (k === 'a' ? '<br><span class="small muted">功率一定时，速度越小，牵引力越大——汽车上坡时要换低速挡。</span>' : ''),
        presets: [
          { t: '汽车功率 60 kW，以 20 m/s 匀速行驶，求牵引力', mode: 'a', top: 60, b: 20, u: { top: 'kW', b: 'm/s' } },
          { t: '同一辆车上坡时速度降到 10 m/s', mode: 'a', top: 60, b: 10, u: { top: 'kW', b: 'm/s' } },
          { t: '牵引力 2 000 N，车速 72 km/h，求功率', mode: 'top', a: 2000, b: 72, u: { a: 'N', b: 'km/h' } },
        ],
      });
    }
    build('wt');
  });

  /* ================= 常见的功率 ================= */
  const PL = [
    ['人骑自行车', 70, '🚲', '人平时骑自行车的功率约 70 W，长时间运动中人的功率一般为数十瓦'],
    ['中学生快速跑上楼', 400, '🏃', '体重 500 N，8 s 跑上 2 层楼（6 m）：P = 3 000 J ÷ 8 s ≈ 400 W；优秀运动员短时间内可达 1 kW'],
    ['马长时间拉车', 450, '🐴', '马长时间拉车的功率约为几百瓦'],
    ['起重机提升石头（例题）', 4e3, '🏗️', 'P = W/t = 6×10⁴ J ÷ 15 s = 4×10³ W'],
    ['小轿车', 6.6e4, '🚗', '小轿车发动机的功率可达几十千瓦（如 66 kW）'],
    ['蓝鲸游动', 3.5e5, '🐳', '蓝鲸游动时的功率可达约 350 kW'],
    ['电力机车', 4.8e6, '🚄', '电力机车的功率约为几千千瓦（如 4 800 kW）'],
    ['万吨级远洋货轮', 1.5e7, '🚢', '万吨级远洋货轮发动机的功率可达一万多千瓦'],
  ];
  PS.register('power-ladder', function (el) {
    const lab = (e) => (e < 3 ? String(Math.pow(10, e)) + ' W' : e < 6 ? Math.pow(10, e - 3) + ' kW' : Math.pow(10, e - 6) + ' MW');
    EN.ladder(el, { items: PL, lmin: 1, lmax: 8, tick: lab, caption: '功率（对数刻度；1 kW = 10³ W，1 MW = 10⁶ W）', hint: '点击图标，看看它们的功率大约是多少', fmt: (it) => it[0] + ' 约 ' + (it[1] >= 1e3 ? EN.txt(it[1] / 1e3, 3) + ' kW' : it[1] + ' W') });
    const q = h('div', { class: 'fc-q' });
    el.append(q);
    EN.estimate(q, [
      ['一名中学生正常步行上楼，他上楼的功率大约是（　）', ['1.5 W', '15 W', '150 W', '1 500 W'], 2, '体重约 500 N，约 10 s 走上一层楼（3 m）：P = 1 500 J ÷ 10 s = 150 W。'],
      ['一名中学生从一楼跑到三楼用了 12 s，他上楼的功率约为（　）', ['25 W', '250 W', '2 500 W', '25 000 W'], 1, 'W = 500 N × 6 m = 3 000 J，P = 3 000 J ÷ 12 s = 250 W。'],
      ['小明用 2 s 把一本物理课本从地上捡起放到课桌上，他对课本做功的功率约为（　）', ['0.01 W', '0.1 W', '1 W', '10 W'], 2, '对课本做的功约 2 J，P = 2 J ÷ 2 s = 1 W。'],
      ['中学生跳绳，1 min 跳 120 次，跳绳的平均功率约为（　）', ['6 W', '60 W', '600 W', '6 000 W'], 1, '每次约做功 30 J，1 min 做功 3 600 J，P = 3 600 J ÷ 60 s = 60 W。'],
    ]);
  });

  /* ================= 估测上楼的功率 ================= */
  PS.register('stair-power', function (el, opts) {
    const VW = 1000, VH = 460, Y0 = 430, H1 = 0.15, NSTEP = 20, FLOOR = H1 * NSTEP;
    const PEOPLE = { ming: { name: '小明', m: 50.0, c: '#3b5bdb' }, hong: { name: '小红', m: 45.0, c: '#e64980' }, dad: { name: '爸爸', m: 72.0, c: '#495057' } };
    const st = { who: 'ming', fl: 2, run: false, mode: 'walk', p: 0, T: 0, t: 0, rows: [], ans: { h: false, P: false } };
    const wSeg = PS.ui.seg(Object.keys(PEOPLE).map((k) => ({ value: k, label: PEOPLE[k].name })), st.who, (v) => { st.who = v; reset(); });
    const fSeg = PS.ui.seg([1, 2, 3].map((n) => ({ value: n, label: '1 楼 → ' + (n + 1) + ' 楼' })), st.fl, (v) => { st.fl = v; reset(); });
    const mSeg = PS.ui.seg([{ value: 'walk', label: '🚶 走上楼' }, { value: 'run', label: '🏃 跑上楼' }], st.mode, (v) => { st.mode = v; reset(); });
    el.append(PS.ui.row(wSeg.el, fSeg.el, mSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const goB = PS.ui.button('▶ 开始上楼，同时按下秒表', go, 'btn btn-primary btn-sm');
    const iH = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: 'h' });
    const iP = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: 'P' });
    const msg = h('div', { class: 'fc-msg' });
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    el.append(PS.ui.row(goB, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm'), h('span', { class: 'small muted' }, '动画加快了 3 倍，秒表显示的是真实的时间')),
      h('div', { class: 'fc-ans' }, h('span', null, '① 上升的高度 h ='), iH, h('span', null, 'm'), h('span', null, '② 上楼的功率 P ='), iP, h('span', null, 'W'), PS.ui.button('检查', check, 'btn btn-primary btn-sm'), recB), msg);
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    if (opts.lab !== false) el.append(h('div', { class: 'grid-2', style: { marginTop: '8px', alignItems: 'start' } },
      h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['同学', '方式', '质量 m/kg', '高度 h/m', '时间 t/s', '功率 P/W'].map((t) => h('th', null, t)))), tbody)),
      h('div', { class: 'panel' }, h('h4', null, '分析论证'), ana)));
    const P0 = () => PEOPLE[st.who];
    const HM = () => FLOOR * st.fl;
    const power = () => PS.round((P0().m * 10 * HM()) / st.t, 0);
    function reset() { st.run = false; st.p = 0; st.T = 0; st.t = 0; st.ans = { h: false, P: false }; iH.value = ''; iP.value = ''; tell(); }
    function go() {
      if (st.run) return;
      reset();
      const vy = (st.mode === 'walk' ? 0.32 : 0.95) * (1 + PS.rand(-0.08, 0.08)) * (st.who === 'dad' ? 0.95 : 1);
      st.t = PS.round(HM() / vy, 1); st.run = true; tell();
    }
    function check() {
      if (!st.t || st.run) { msg.className = 'fc-msg bad'; msg.innerHTML = '先上楼，测出时间。'; return; }
      const hv = EN.parse(iH.value), pv = EN.parse(iP.value);
      st.ans.h = Math.abs(hv - HM()) < 0.011;
      st.ans.P = Math.abs(pv - power()) <= Math.max(2, power() * 0.02);
      let t = '';
      if (!st.ans.h) t = '✘ 高度：一级台阶高 h₁ = 15 cm = 0.15 m，从 1 楼到 ' + (st.fl + 1) + ' 楼共 ' + NSTEP * st.fl + ' 级台阶，h = nh₁。';
      else if (!st.ans.P) t = '✔ h = ' + HM() + ' m。✘ 功率：P = W/t = mgh/t，g 取 10 N/kg，结果取整数。';
      else t = '✔ 正确！P = <span class="frac"><span>mgh</span><span>t</span></span> = <span class="frac"><span>' + P0().m + ' kg × 10 N/kg × ' + HM() + ' m</span><span>' + st.t + ' s</span></span> ≈ <b>' + power() + ' W</b>。点“记录”保存这组数据。';
      msg.className = 'fc-msg ' + (st.ans.h && st.ans.P ? 'ok' : 'bad'); msg.innerHTML = t;
      st.ans.h && st.ans.P ? PS.sound.good() : PS.sound.bad();
    }
    function record() {
      if (!(st.ans.h && st.ans.P)) { msg.className = 'fc-msg bad'; msg.innerHTML = '先算出高度和功率，检查正确后再记录。'; return; }
      st.rows.push({ who: st.who, mode: st.mode, m: P0().m, hh: HM(), t: st.t, P: power() });
      if (st.rows.length > 8) st.rows.shift();
      st.ans = { h: false, P: false }; PS.sound.good(); table();
      msg.className = 'fc-msg ok'; msg.innerHTML = '已记录。换一位同学、换走 / 跑再测几次，比较一下。';
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, PEOPLE[r.who].name), h('td', null, r.mode === 'walk' ? '走' : '跑'), h('td', null, PS.fmt(r.m, 1)), h('td', null, PS.fmt(r.hh, 1)), h('td', null, PS.fmt(r.t, 1)), h('td', null, h('b', null, String(r.P))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 6, class: 'muted' }, '还没有数据')));
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      const same = st.rows.some((a) => st.rows.some((b) => a.who === b.who && a.mode === 'walk' && b.mode === 'run'));
      const diff = new Set(st.rows.map((r) => r.who)).size > 1;
      ana.innerHTML = '<div>原理：<b>P = W/t = mgh/t</b>；器材：体重计（磅秤）、卷尺（刻度尺）、秒表。</div>'
        + line(same, '同一个人<b>跑</b>上楼比<b>走</b>上楼用时短，做的功相同，功率<b>大</b>。')
        + line(diff, '不同的人上楼，功率与质量、高度、时间都有关，要用 mgh/t 计算后再比较。')
        + '<div class="muted" style="margin-top:4px">楼梯的长度（斜长）不需要测量：上楼时克服重力做功，只与竖直高度有关。</div>';
    }
    PS.loop((dt) => {
      if (!st.run) return;
      st.T = Math.min(st.t, st.T + dt * 3);
      if (st.T >= st.t) { st.run = false; PS.sound.ping(); tell(); }
      S.render();
    }, el).start();
    function tell() {
      if (st.run) { msg.className = 'fc-msg info'; msg.innerHTML = '正在上楼……到达 ' + (st.fl + 1) + ' 楼时按停秒表。'; }
      else if (!st.t) { msg.className = 'fc-msg info'; msg.innerHTML = '右边已经测出了质量 m 和一级台阶的高度 h₁。选好同学、楼层和走 / 跑，点“开始上楼”测出时间 t，再算出高度 h 和功率 P。'; }
      else { msg.className = 'fc-msg info'; msg.innerHTML = '到了！秒表读数 t = <b>' + st.t + ' s</b>。数一数台阶数，算出上升的高度 h，再算功率 P = mgh/t（g 取 10 N/kg）。'; }
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const n = st.fl, fh = Math.min(170, 370 / n), pts = stairs(ctx, 70, 520, Y0, fh, n, { fs: F(12) });
      const pos = along(pts, st.t ? Math.min(1, st.T / st.t) : 0), moving = st.run;
      FO.person(ctx, pos.x, pos.y, { h: Math.min(80, fh * 0.55) + P0().m * 0.2, color: P0().c, dir: pos.dir, stride: moving ? 0.2 + 0.3 * Math.sin(st.T * (st.mode === 'run' ? 14 : 7)) : 0.2, lean: moving ? (st.mode === 'run' ? 0.3 : 0.15) : 0 });
      D.text(ctx, '每层 ' + NSTEP + ' 级台阶', 295, Y0 - fh * n - 40, { size: F(13), weight: 700, align: 'center', color: '#868e96' });
      // 右侧：体重计、台阶放大图、秒表
      const RX = 610;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, RX, 30, 370, 410, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, '① 体重计测质量', RX + 16, 30 + F(15) + 6, { size: F(15), weight: 800, color: '#343a40' });
      ctx.fillStyle = '#495057'; D.roundRect(ctx, RX + 40, 92, 150, 34, 6); ctx.fill();
      ctx.fillStyle = '#d3f9d8'; D.roundRect(ctx, RX + 52, 97, 126, 24, 4); ctx.fill();
      D.text(ctx, PS.fmt(P0().m, 1) + ' kg', RX + 115, 110, { size: F(16), weight: 800, align: 'center', baseline: 'middle' });
      D.text(ctx, P0().name, RX + 205, 112, { size: F(14), weight: 700, color: P0().c, baseline: 'middle' });
      D.text(ctx, '② 卷尺测一级台阶的高度', RX + 16, 160 + F(15), { size: F(15), weight: 800, color: '#343a40' });
      const sx = RX + 60, sy = 300;
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 90, sy); ctx.lineTo(sx + 90, sy - 75); ctx.lineTo(sx + 200, sy - 75); ctx.lineTo(sx + 200, sy); ctx.lineTo(sx + 240, sy); ctx.lineTo(sx + 240, sy + 20); ctx.lineTo(sx, sy + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffe066'; ctx.fillRect(sx + 92, sy - 75, 14, 75); ctx.strokeStyle = '#495057'; ctx.lineWidth = 1;
      for (let k = 0; k <= 15; k++) { const y = sy - k * 5; ctx.beginPath(); ctx.moveTo(sx + 92, y); ctx.lineTo(sx + 92 + (k % 5 ? 5 : 9), y); ctx.stroke(); }
      D.text(ctx, 'h₁ = 15.0 cm', sx + 120, sy - 30, { size: F(15), weight: 800, color: '#1b2333' });
      D.text(ctx, '③ 秒表测时间', RX + 16, 340 + F(15), { size: F(15), weight: 800, color: '#343a40' });
      EN.stopwatch(ctx, RX + 310, 392, st.t ? (st.run ? st.T : st.t) : 0, { F, r: 36, fs: 14 });
    }
    reset(); table();
  });

  /* ================= 汽车上坡：功率一定时，F 与 v 成反比 ================= */
  PS.register('car-gear', function (el) {
    const VW = 1000, M = 1500, F0 = 2000, FMAX = 9000, SIN = 0.1, L1 = 200, L2 = 720, LEND = 1000;
    const st = { P: 60e3, x: 0, v: 20, t: 0, run: false, hist: [] };
    const pSeg = PS.ui.seg([40, 60, 80].map((p) => ({ value: p * 1e3, label: '发动机功率 ' + p + ' kW' })), st.P, (v) => { st.P = v; reset(); });
    el.append(PS.ui.row(pSeg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 790 : 440), draw });
    const goB = PS.ui.button('▶ 出发', () => { if (st.x >= LEND) reset(); st.run = !st.run; goB.innerHTML = st.run ? '⏸ 暂停' : '▶ 继续'; }, 'btn btn-primary btn-sm');
    const rd = { v: PS.ui.readout('速度 v', '—'), F: PS.ui.readout('牵引力 F = P/v', '—'), R: PS.ui.readout('需要克服的阻力', '—') };
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(goB, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), h('div', { class: 'en-read' }, Object.values(rd).map((r) => r.el)), msg);
    const onSlope = (x) => x >= L1 && x < L2;
    const need = (x) => F0 + (onSlope(x) ? M * 10 * SIN : 0);
    const trac = (v) => Math.min(FMAX, st.P / Math.max(0.5, v));
    function reset() { st.x = 0; st.v = st.P / F0 * 0.999; st.t = 0; st.run = false; st.hist = []; goB.innerHTML = '▶ 出发'; tell(); }
    function tell() {
      const F = trac(st.v), R = need(st.x);
      rd.v.set(PS.fmt(st.v, 1) + ' m/s<br><span class="small muted">' + PS.fmt(st.v * 3.6, 0) + ' km/h</span>');
      rd.F.set('<span style="color:#e8590c">' + PS.fmt(F, 0) + ' N</span>'); rd.R.set(PS.fmt(R, 0) + ' N');
      let t;
      if (st.x === 0 && !st.run) t = '汽车发动机的<b>功率一定</b>（' + st.P / 1e3 + ' kW）。在平路上匀速行驶时牵引力等于阻力。前面有一段上坡，猜一猜：上坡时速度会怎样变化？';
      else if (onSlope(st.x)) t = F < R - 30 ? '上坡了！要克服的阻力变大（还要克服重力沿斜坡向下的作用），牵引力不够，汽车<b>减速</b>；由 <b>F = P/v</b>，速度越小，牵引力越<b>大</b>。' : '速度减小到 ' + PS.fmt(st.v * 3.6, 0) + ' km/h 时，牵引力 F = P/v 增大到等于阻力，汽车匀速爬坡。司机<b>换低速挡</b>，就是为了用较小的速度获得较大的牵引力。';
      else if (st.x >= L2) t = F > R + 30 ? '回到平路，需要的牵引力变小，汽车<b>加速</b>，速度越大牵引力越小，最后又匀速行驶。' : '功率一定时，牵引力和速度成反比：<b>P = Fv</b>。';
      else t = '在平路上匀速行驶：F = P/v = ' + PS.fmt(F, 0) + ' N，等于阻力。';
      msg.className = 'fc-msg ' + (onSlope(st.x) ? 'info' : 'ok'); msg.innerHTML = t;
    }
    PS.loop((dt) => {
      if (!st.run) return;
      const n = 10, h1 = (dt * 4) / n;
      for (let i = 0; i < n; i++) { const a = (trac(st.v) - need(st.x)) / M; st.v = Math.max(0.5, st.v + a * h1); st.x += st.v * h1; st.t += h1; }
      if (!st.hist.length || st.t - st.hist[st.hist.length - 1][0] > 0.4) st.hist.push([st.t, st.v, trac(st.v)]);
      if (st.x >= LEND) { st.x = LEND; st.run = false; goB.innerHTML = '▶ 再来一次'; }
      tell(); S.render();
    }, el).start();
    const ROADY = 260, SX = 0.9, EX = 3; // 横向 0.9 px/m，坡的高度放大 3 倍
    const elev = (x) => (x < L1 ? 0 : x < L2 ? (x - L1) * SIN : (L2 - L1) * SIN);
    const sx = (x) => 40 + x * SX, sy = (x) => ROADY - elev(x) * EX;
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), nar = EN.narrow(w);
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
      // 路面
      ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); [L1, L2, LEND].forEach((x) => ctx.lineTo(sx(x), sy(x))); ctx.lineTo(sx(LEND), 440); ctx.lineTo(sx(0), 440); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); [L1, L2, LEND].forEach((x) => ctx.lineTo(sx(x), sy(x))); ctx.stroke();
      D.text(ctx, '上坡（坡度示意，高度放大了）', sx((L1 + L2) / 2) + 40, ROADY + 50, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      // 汽车
      const ang = onSlope(st.x) ? -Math.atan(SIN * EX / SX) : 0, cx = sx(st.x), cy = sy(st.x);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.fillStyle = '#e03131'; D.roundRect(ctx, -40, -30, 80, 20, 6); ctx.fill(); D.roundRect(ctx, -22, -46, 44, 20, 8); ctx.fill();
      ctx.fillStyle = '#d0ebff'; ctx.fillRect(-16, -42, 14, 12); ctx.fillRect(2, -42, 14, 12);
      ctx.fillStyle = '#212529'; [-24, 24].forEach((x) => { ctx.beginPath(); ctx.arc(x, -9, 9, 0, TAU); ctx.fill(); });
      const Ft = trac(st.v), R = need(st.x), k = 0.012;
      FO.arrow(ctx, 40, -22, 0, Ft * k, { color: '#e8590c', width: 3, head: 10, dot: false });
      FO.arrow(ctx, -40, -22, Math.PI, R * k, { color: '#868e96', width: 3, head: 10, dot: false });
      ctx.restore();
      D.text(ctx, 'F', cx + 46 + Ft * k / 2, cy - 30 - (onSlope(st.x) ? 20 : 0), { size: F(15), weight: 800, color: '#e8590c', align: 'center' });
      // v–t、F–t 图像
      const tmax = Math.max(60, Math.ceil((st.t + 1) / 20) * 20), vmax = Math.ceil(st.P / F0 / 10) * 10 + 10;
      const fmax = Math.max(FMAX * 0.6, 6000);
      const box = (x, y, ww, hh2) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, x, y, ww, hh2, 10); ctx.fill(); ctx.stroke(); };
      const VC = nar ? { x: 120, y: 670, w: 780, h: 90 } : { x: 650, y: 318, w: 290, h: 80 }, FCH = nar ? { x: 120, y: 500, w: 780, h: 100 } : { x: 80, y: 60, w: 300, h: 100 };
      if (nar) { box(20, 455, 960, 170); box(20, 630, 960, 155); } else box(600, 300, 380, 128);
      PS.dyn.chart(ctx, { x: VC.x, y: VC.y, w: VC.w, h: VC.h, xmax: tmax, ymax: vmax, xstep: tmax / 4, ystep: vmax / 2, xl: 't/s', yl: 'v/(m·s⁻¹)', F, bg: false,
        series: [{ pts: st.hist.map((p) => [p[0], p[1]]), color: '#3b5bdb', width: 2.4 }] });
      PS.dyn.chart(ctx, { x: FCH.x, y: FCH.y, w: FCH.w, h: FCH.h, xmax: tmax, ymax: fmax, xstep: tmax / 4, ystep: 2000, xl: 't/s', yl: 'F/N', F, bg: false,
        series: [{ pts: st.hist.map((p) => [p[0], p[2]]), color: '#e8590c', width: 2.4 }] });
    }
    reset();
  });
})();
