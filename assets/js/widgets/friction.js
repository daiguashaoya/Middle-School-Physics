/* 第8章第3节：摩擦力——产生条件、方向、探究影响滑动摩擦力大小的因素、静摩擦力（推箱子 / 手握瓶子）、摩擦力大小随机练习、增大和减小摩擦的方法、分类、假如没有摩擦。依赖 force.js、dynamics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, DY = PS.dyn;
  const TAU = Math.PI * 2;

  /* ================= 摩擦力是怎样产生的 ================= */
  PS.register('friction-micro', function (el) {
    const VW = 1000, VH = 400;
    const st = { touch: true, press: true, rough: true, act: 'slide', x: 0, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const T1 = PS.ui.toggle('两个物体相互接触', true, (v) => { st.touch = v; tell(); });
    const T2 = PS.ui.toggle('相互挤压（有压力）', true, (v) => { st.press = v; tell(); });
    const T3 = PS.ui.toggle('接触面粗糙', true, (v) => { st.rough = v; tell(); });
    const aSeg = PS.ui.seg([{ value: 'none', label: '不推它' }, { value: 'try', label: '用力推，但没推动' }, { value: 'slide', label: '推着它滑动' }], st.act, (v) => { st.act = v; tell(); });
    const chk = h('div', { class: 'dy-check' });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(T1.el, T2.el, T3.el), PS.ui.row(aSeg.el), chk, msg);
    const has = () => st.touch && st.press && st.rough && st.act !== 'none';
    function tell() {
      const it = (ok, t) => '<span class="' + (ok ? 'y' : 'n') + '">' + (ok ? '✔' : '✘') + ' ' + t + '</span>';
      chk.innerHTML = it(st.touch, '接触') + it(st.press, '挤压') + it(st.rough, '粗糙') + it(st.act !== 'none', '有相对运动或相对运动的趋势');
      if (has()) { msg.className = 'fc-msg ok'; msg.innerHTML = st.act === 'slide' ? '木块在桌面上<b>滑动</b>，接触面上产生阻碍它<b>相对运动</b>的力——<b>滑动摩擦力</b>，方向与木块相对桌面的运动方向相反。' : '用力推但没推动，木块有向右运动的<b>趋势</b>，接触面上产生阻碍这个趋势的力——<b>静摩擦力</b>。'; }
      else { msg.className = 'fc-msg bad'; msg.innerHTML = !st.touch ? '两个物体<b>不接触</b>，不会有摩擦力。' : !st.press ? '只是轻轻挨着，<b>没有相互挤压</b>，没有摩擦力。' : !st.rough ? '假如接触面<b>绝对光滑</b>，就不会有摩擦力（实际上并不存在）。' : '木块静止，也<b>没有运动的趋势</b>，不受摩擦力。'; }
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; if (st.act === 'slide' && st.touch) st.x += dt * 50; S.render(); }, el);
    function profile(seed, x0, rough, amp) { // 返回一条起伏的表面
      const pts = [];
      for (let x = 0; x <= 520; x += 8) { const u = x + x0; const y = rough ? amp * (0.55 * Math.sin(u * 0.09 + seed) + 0.3 * Math.sin(u * 0.23 + seed * 2) + 0.15 * Math.sin(u * 0.51 + seed * 3)) : 0; pts.push([x, y]); }
      return pts;
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 左：宏观
      const gy = 250, gap = st.touch ? 0 : 26;
      ctx.fillStyle = '#c98d3e'; ctx.fillRect(30, gy, 360, 26); ctx.fillStyle = '#a87b3c'; ctx.fillRect(50, gy + 26, 18, 100); ctx.fillRect(352, gy + 26, 18, 100);
      const bx = 130 + (st.act === 'slide' && st.touch ? (st.x % 120) : 0);
      DY.block(ctx, bx, gy - gap, 120, 60, { label: '木块' });
      if (!st.press && st.touch) { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, bx + 30, gy - 100, 60, 34, 12); ctx.fill(); ctx.stroke(); D.text(ctx, '用手托着，刚好挨着', bx + 60, gy - 108, { size: F(12), color: '#868e96', align: 'center' }); }
      if (!st.touch) { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, bx + 30, gy - gap - 94, 60, 34, 12); ctx.fill(); ctx.stroke(); }
      if (st.act !== 'none') { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, bx - 46, gy - gap - 44, 44, 30, 10); ctx.fill(); ctx.stroke(); FO.arrow(ctx, bx, gy - gap - 30, 0, 60, { color: FC.F, label: 'F推', F, labelSide: -1 }); }
      if (has()) FO.arrow(ctx, bx + 60, gy - 2, Math.PI, st.act === 'slide' ? 60 : 60, { color: FC.f, label: st.act === 'slide' ? 'f 滑动摩擦力' : 'f 静摩擦力', F, labelSide: 1 });
      // 放大镜圈
      ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(bx + 60, gy, 22, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(bx + 82, gy - 8); ctx.lineTo(450, 90); ctx.moveTo(bx + 80, gy + 12); ctx.lineTo(450, 330); ctx.stroke(); ctx.setLineDash([]);
      // 右：微观放大
      const X0 = 450, Y0 = 60, W = 520, H = 290;
      ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2; D.roundRect(ctx, X0, Y0, W, H, 14); ctx.fill(); ctx.stroke();
      ctx.beginPath(); D.roundRect(ctx, X0 + 1, Y0 + 1, W - 2, H - 2, 13); ctx.clip();
      const amp = 26, cy = Y0 + H / 2 + 10;
      const sep = !st.touch ? 50 : !st.press ? 2 * amp * 0.85 : amp * 0.9; // 两条表面中线的距离
      const low = profile(1.3, 0, st.rough, amp), up = profile(4.1, st.x * 1.6, st.rough, amp);
      ctx.fillStyle = '#e9c48f';
      ctx.beginPath(); ctx.moveTo(X0, Y0 + H); low.forEach(([x, y]) => ctx.lineTo(X0 + x, cy + y)); ctx.lineTo(X0 + W, Y0 + H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2; ctx.beginPath(); low.forEach(([x, y], i) => (i ? ctx.lineTo(X0 + x, cy + y) : ctx.moveTo(X0 + x, cy + y))); ctx.stroke();
      ctx.fillStyle = 'rgba(77,171,247,.55)';
      ctx.beginPath(); ctx.moveTo(X0, Y0); up.forEach(([x, y]) => ctx.lineTo(X0 + x, cy - sep + y)); ctx.lineTo(X0 + W, Y0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1c7ed6'; ctx.beginPath(); up.forEach(([x, y], i) => (i ? ctx.lineTo(X0 + x, cy - sep + y) : ctx.moveTo(X0 + x, cy - sep + y))); ctx.stroke();
      ctx.restore();
      D.text(ctx, '木块的下表面（放大）', X0 + 14, Y0 + 26, { size: F(13), weight: 700, color: '#1c7ed6' });
      D.text(ctx, '桌面（放大）', X0 + 14, Y0 + H - 14, { size: F(13), weight: 700, color: '#8a5a1c' });
      if (has()) D.text(ctx, '凹凸不平的地方互相“咬”住，阻碍相对运动', X0 + W / 2, Y0 - 12, { size: F(14), weight: 700, color: '#c2255c', align: 'center' });
      else D.text(ctx, '没有互相“咬”住，没有摩擦力', X0 + W / 2, Y0 - 12, { size: F(14), weight: 700, color: '#868e96', align: 'center' });
    }
    aSeg.set(st.act, true);
    tell();
    loop.start();
  });

  /* ================= 摩擦力的方向 ================= */
  // dir：L 左、R 右、U 上、D 下、N 不受摩擦力
  const FD = [
    { k: 'slide', q: '木块在水平桌面上向右滑动，它受到的摩擦力方向是', dir: 'L', type: '滑动摩擦力', why: '木块相对桌面向右运动，滑动摩擦力与相对运动方向相反，向左。' },
    { k: 'push', q: '用力向右推静止的箱子，没有推动。箱子受到的摩擦力方向是', dir: 'L', type: '静摩擦力', why: '箱子有向右运动的趋势，静摩擦力向左，大小等于推力。' },
    { k: 'belt1', q: '把箱子轻轻放到向右运动的传送带上，箱子还没跟上皮带时，它受到的摩擦力方向是', dir: 'R', type: '滑动摩擦力', why: '箱子相对皮带向左滑动，摩擦力向右——与箱子的运动方向<b>相同</b>，是使箱子加速的动力。' },
    { k: 'belt2', q: '箱子随水平传送带一起向右做匀速直线运动，箱子受到的摩擦力方向是', dir: 'N', type: '', why: '箱子与皮带之间没有相对运动，也没有相对运动的趋势，箱子<b>不受摩擦力</b>（如果受摩擦力，就不能做匀速直线运动了）。' },
    { k: 'walk', q: '人向右走路，后脚蹬地时，地面对脚的摩擦力方向是', dir: 'R', type: '静摩擦力', why: '脚向后蹬地，有相对地面向左（向后）滑的趋势，摩擦力向右（向前）——人就是靠这个力前进的。' },
    { k: 'bottle', q: '手握住瓶子，瓶子静止在空中。瓶子受到的摩擦力方向是', dir: 'U', type: '静摩擦力', why: '瓶子有向下滑的趋势，静摩擦力竖直向上，与重力是一对平衡力。' },
    { k: 'climb', q: '人双手握住竖直的杆匀速向上爬，杆对人的摩擦力方向是', dir: 'U', type: '静摩擦力', why: '人匀速上爬，受重力和摩擦力平衡，摩擦力竖直向上。' },
    { k: 'down', q: '消防员握住竖直的杆匀速滑下，杆对人的摩擦力方向是', dir: 'U', type: '滑动摩擦力', why: '人相对杆向下滑动，滑动摩擦力向上；匀速滑下时摩擦力等于重力。' },
    { k: 'rear', q: '骑自行车向右前进时，地面对后轮（主动轮）的摩擦力方向是', dir: 'R', type: '静摩擦力', why: '后轮被链条带动转动，轮子与地面接触处有向后滑的趋势，摩擦力向前，推动自行车前进。' },
    { k: 'front', q: '骑自行车向右前进时，地面对前轮（从动轮）的摩擦力方向是', dir: 'L', type: '静摩擦力', why: '前轮是被车架推着向前滚的，地面对它的摩擦力向后（向左）。' },
  ];
  PS.register('friction-dir', function (el) {
    const VW = 1000, VH = 360;
    const st = { i: 0, ans: null, t: 0, n: 0, ok: 0, order: FD.map((_, i) => i).sort(() => Math.random() - 0.5), p: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const q = h('div', { class: 'fc-q', style: { marginTop: '8px' } });
    const btns = h('div', { class: 'fc-chips' });
    const msg = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '4px' } });
    el.append(q, btns, msg, score);
    [['L', '← 向左'], ['R', '→ 向右'], ['U', '↑ 向上'], ['D', '↓ 向下'], ['N', '不受摩擦力']].forEach(([d, t]) => btns.append(PS.ui.button(t, () => answer(d), 'btn btn-sm')));
    btns.append(PS.ui.button('下一题 →', next, 'btn btn-ghost btn-sm'));
    function next() { st.p = (st.p + 1) % st.order.length; st.i = st.order[st.p]; st.ans = null; show(); }
    function show() {
      const E = FD[st.i];
      q.innerHTML = '<b>判断：</b>' + E.q + '……';
      msg.className = 'fc-msg'; msg.innerHTML = '想一想：这个物体相对于和它接触的物体，向哪边运动（或有向哪边运动的趋势）？';
      score.innerHTML = '已做 ' + st.n + ' 题 · 答对 ' + st.ok + ' 题';
      S.render();
    }
    function answer(d) {
      if (st.ans) return;
      const E = FD[st.i], good = d === E.dir;
      st.ans = d; st.n++; if (good) st.ok++;
      good ? PS.sound.good() : PS.sound.bad();
      msg.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      msg.innerHTML = (good ? '✔ 正确！' : '✘ 正确答案：' + { L: '向左', R: '向右', U: '向上', D: '向下', N: '不受摩擦力' }[E.dir] + '。') + (E.type ? '（' + E.type + '）' : '') + E.why;
      score.innerHTML = '已做 ' + st.n + ' 题 · 答对 ' + st.ok + ' 题';
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const E = FD[st.i], t = st.t, k = E.k;
      let fp = null; // 摩擦力的作用点
      const gy = 290;
      if (k === 'slide' || k === 'push') {
        FO.ground(ctx, 0, VW, gy, { depth: 40 });
        const x = k === 'slide' ? 300 + ((t * 80) % 300) : 420;
        if (k === 'slide') { DY.block(ctx, x, gy, 140, 70, { label: '木块' }); D.arrow(ctx, x + 60, gy - 100, x + 140, gy - 100, { color: '#2b8a3e', width: 2.5, head: 10, dash: [6, 4] }); D.text(ctx, '运动方向', x + 100, gy - 110, { size: F(12), color: '#2b8a3e', align: 'center' }); fp = [x + 70, gy]; }
        else { FO.box(ctx, x, gy, 150, 110, { label: '箱子' }); FO.person(ctx, x - 70, gy, { h: 150, hand: { x: x - 2, y: gy - 60 }, lean: 0.25 }); FO.arrow(ctx, x, gy - 60, 0, 70, { color: FC.F, label: 'F推', F, labelSide: -1 }); fp = [x + 75, gy]; }
      }
      if (k === 'belt1' || k === 'belt2') {
        const L = 180, R = 820, y = 250;
        ctx.fillStyle = '#495057'; D.roundRect(ctx, L - 30, y, R - L + 60, 34, 17); ctx.fill();
        ctx.fillStyle = '#343a40'; [L, R].forEach((x) => { ctx.beginPath(); ctx.arc(x, y + 17, 15, 0, TAU); ctx.fill(); });
        ctx.fillStyle = '#868e96'; for (let i = 0; i < 12; i++) { const x = L - 20 + ((i * 60 + t * 90) % (R - L + 40)); ctx.fillRect(x, y + 1, 18, 4); }
        D.arrow(ctx, 420, y + 60, 580, y + 60, { color: '#495057', width: 2.5, head: 10 }); D.text(ctx, '皮带向右运动', 500, y + 82, { size: F(13), color: '#495057', align: 'center' });
        const bx = k === 'belt2' ? 380 + ((t * 90) % 260) : 300 + Math.min(1, (t % 3) / 2) * 120 + ((t % 3) * 40);
        FO.box(ctx, bx, y, 100, 80, { label: '箱子' }); fp = [bx + 50, y];
        if (k === 'belt1') D.text(ctx, '箱子比皮带慢', bx + 50, y - 96, { size: F(13), weight: 700, color: '#e8590c', align: 'center' });
        else D.text(ctx, '箱子和皮带一起匀速运动', bx + 50, y - 96, { size: F(13), weight: 700, color: '#2b8a3e', align: 'center' });
      }
      if (k === 'walk') {
        FO.ground(ctx, 0, VW, gy, { depth: 40 });
        const x = 460;
        FO.person(ctx, x, gy, { h: 200, stride: 0.45, hand: { x: x + 30, y: gy - 130 } });
        ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(x - 40, gy - 8, 22, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '后脚', x - 40, gy - 38, { size: F(13), weight: 700, color: '#e8590c', align: 'center' });
        D.text(ctx, '向右走 →', 600, 60, { size: F(15), weight: 800, color: '#2b8a3e' });
        fp = [x - 40, gy];
      }
      if (k === 'bottle' || k === 'climb' || k === 'down') {
        if (k === 'bottle') {
          ctx.fillStyle = 'rgba(165,216,255,.6)'; ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2; D.roundRect(ctx, 470, 90, 60, 200, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#4dabf7'; ctx.fillRect(485, 66, 30, 26);
          ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; D.roundRect(ctx, 446, 150, 108, 60, 20); ctx.fill(); ctx.stroke();
          FO.arrow(ctx, 500, 230, Math.PI / 2, 70, { color: FC.G, label: 'G', F });
          fp = [556, 180];
        } else {
          ctx.fillStyle = '#adb5bd'; ctx.fillRect(490, 0, 20, VH);
          const y = k === 'climb' ? 220 - ((t * 30) % 100) : 120 + ((t * 30) % 100);
          FO.person(ctx, 470, y + 150, { h: 150, hand: { x: 492, y: y }, hand2: { x: 492, y: y + 30 }, stride: 0.1 });
          D.text(ctx, k === 'climb' ? '匀速向上爬 ↑' : '匀速滑下 ↓', 560, 60, { size: F(15), weight: 800, color: '#2b8a3e' });
          fp = [512, y + 20];
        }
      }
      if (k === 'rear' || k === 'front') {
        FO.ground(ctx, 0, VW, gy, { depth: 40 });
        const cx = 500, r = 70, sp = t * 4;
        [cx - 150, cx + 150].forEach((x, i) => {
          ctx.strokeStyle = (k === 'rear' && i === 0) || (k === 'front' && i === 1) ? '#e8590c' : '#343a40'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, gy - r, r, 0, TAU); ctx.stroke();
          ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5; for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(x, gy - r); ctx.lineTo(x + Math.cos(sp + a) * r, gy - r + Math.sin(sp + a) * r); ctx.stroke(); }
        });
        ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 150, gy - r); ctx.lineTo(cx - 20, gy - r); ctx.lineTo(cx + 40, gy - 190); ctx.lineTo(cx - 70, gy - 190); ctx.lineTo(cx - 150, gy - r); ctx.moveTo(cx + 40, gy - 190); ctx.lineTo(cx + 150, gy - r); ctx.moveTo(cx - 20, gy - r); ctx.lineTo(cx - 70, gy - 190); ctx.stroke();
        D.text(ctx, k === 'rear' ? '后轮（主动轮）' : '前轮（从动轮）', k === 'rear' ? cx - 150 : cx + 150, gy - 160 + (k === 'front' ? -20 : 0), { size: F(13), weight: 700, color: '#e8590c', align: 'center' });
        D.text(ctx, '向右前进 →', 760, 60, { size: F(15), weight: 800, color: '#2b8a3e' });
        fp = [k === 'rear' ? cx - 150 : cx + 150, gy];
      }
      if (st.ans && fp) {
        const d = E.dir, ang = { L: Math.PI, R: 0, U: -Math.PI / 2, D: Math.PI / 2 }[d];
        if (d !== 'N') FO.arrow(ctx, fp[0], fp[1], ang, 80, { color: FC.f, label: 'f', F, width: 4, labelSide: d === 'U' ? -1 : 1 });
        else D.text(ctx, '不受摩擦力', fp[0], fp[1] - 100, { size: F(16), weight: 800, color: FC.f, align: 'center', bg: 'rgba(255,255,255,.85)' });
      }
    }
    st.i = st.order[0];
    show();
    loop.start();
  });

  /* ================= 探究影响滑动摩擦力大小的因素 ================= */
  PS.register('friction-lab', function (el, opts) {
    const VW = 1000, VH = 500, MAX = 5, LS = 250, KPX = MAX / LS, K = 2600, CS = 6 / K, GY = 250;
    const PLACE = { flat: { name: '平放', w: 150, h: 40 }, side: { name: '侧放', w: 150, h: 76 }, up: { name: '竖放', w: 76, h: 150 } };
    const st = { plan: 'block', surf: 'wood', nw: 0, place: 'flat', speed: 'slow', mode: 'idle', xb: 120, vb: 0, ring: 0, vr: 0, board: 0, vboard: 0, stick: true, t: 0, pts: [], uni: 0, rows: [], dragging: false, lastRing: 0 };
    const pSeg = PS.ui.seg([{ value: 'block', label: '方案一：拉动木块' }, { value: 'board', label: '方案二：拉动木板（改进）' }], st.plan, (v) => { st.plan = v; reset(); });
    pSeg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(pSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sSeg = PS.ui.seg(['wood', 'cotton', 'towel'].map((k) => ({ value: k, label: PS.SURF[k].name })), st.surf, (v) => { st.surf = v; reset(); });
    const wSeg = PS.ui.seg([{ value: 0, label: '木块（2 N）' }, { value: 1, label: '+1 个砝码（3 N）' }, { value: 2, label: '+2 个砝码（4 N）' }], st.nw, (v) => { st.nw = v; reset(); });
    wSeg.el.style.flexWrap = 'wrap';
    const plSeg = PS.ui.seg(Object.keys(PLACE).map((k) => ({ value: k, label: PLACE[k].name })), st.place, (v) => { st.place = v; reset(); });
    const vSeg = PS.ui.seg([{ value: 'slow', label: '慢' }, { value: 'fast', label: '快' }], st.speed, (v) => { st.speed = v; });
    const goB = PS.ui.button('▶ 匀速拉动', () => { if (st.mode === 'auto') { st.mode = 'idle'; goB.innerHTML = '▶ 匀速拉动'; return; } if (st.plan === 'block' && st.xb > 520) reset(); st.mode = 'auto'; goB.innerHTML = '⏸ 停止'; }, 'btn btn-primary btn-sm');
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    el.append(
      h('div', { class: 'grid-2', style: { gap: '6px 14px', marginTop: '6px' } },
        h('div', null, h('div', { class: 'small muted' }, '接触面'), sSeg.el), h('div', null, h('div', { class: 'small muted' }, '压力'), wSeg.el),
        h('div', null, h('div', { class: 'small muted' }, '木块的放法（接触面积）'), plSeg.el), h('div', null, h('div', { class: 'small muted' }, '拉动的速度'), vSeg.el)),
      PS.ui.row(goB, recB, PS.ui.button('↺ 复位', reset, 'btn btn-ghost btn-sm')), msg,
      h('div', { class: 'grid-2', style: { marginTop: '10px', alignItems: 'start' } },
        h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次'), h('th', null, '接触面'), h('th', null, '压力/N'), h('th', null, '放法'), h('th', null, '速度'), h('th', null, 'f/N'))), tbody)),
        h('div', { class: 'panel' }, h('h4', null, opts.lab ? '分析论证' : '你发现了什么？'), ana)));
    const N = () => 2 + st.nw;
    const fk = () => PS.round(PS.SURF[st.surf].mu * N(), 2);
    const fs = () => fk() * 1.2;
    const P = () => PLACE[st.place];
    const C0 = 343; // 不受力时拉环到木块右侧面的距离（hscale 的挂钩在拉环左边 333 px 处，再留 10 px 的线）
    const speedV = () => (st.speed === 'slow' ? 35 : 95);
    function reset() {
      st.mode = 'idle'; goB.innerHTML = '▶ 匀速拉动';
      st.vb = 0; st.vr = 0; st.stick = true; st.pts = []; st.t = 0; st.uni = 0; st.board = 0; st.vboard = 0;
      if (st.plan === 'block') { st.xb = 110; st.ring = st.xb + P().w + C0; }
      else { st.ring = 930; st.xb = st.ring - C0 - P().w; }
      msg.className = 'fc-msg';
      msg.innerHTML = st.plan === 'block' ? '用弹簧测力计<b>沿水平方向</b>拉木块，使它做<b>匀速直线运动</b>，这时拉力等于滑动摩擦力（二力平衡）。点“匀速拉动”，也可以直接<b>拖动拉环（手）</b>试试——很难拉得匀速！' : '改进：弹簧测力计一端固定在墙上，<b>拉动木块下面的长木板</b>。木块相对桌面静止，测力计示数稳定，而且木板<b>不必匀速</b>拉动。';
      S.render();
    }
    function spring() { return Math.max(0, (st.ring - (st.xb + P().w) - C0) * KPX); }
    function record() {
      const ok = st.uni > 0.5;
      if (!ok) { msg.className = 'fc-msg bad'; msg.innerHTML = st.plan === 'block' ? '木块还没有做<b>匀速直线运动</b>（或没有运动），示数不等于摩擦力，不能记录。先“匀速拉动”，等示数稳定。' : '先拉动木板，等测力计示数稳定后再记录。'; PS.sound.bad(); return; }
      const f = PS.round(spring(), 1);
      st.rows.push({ surf: st.surf, N: N(), place: st.place, speed: st.speed, f, plan: st.plan });
      if (st.rows.length > 12) st.rows.shift();
      PS.sound.good(); table();
      msg.className = 'fc-msg ok'; msg.innerHTML = '记录：滑动摩擦力 f = <b>' + PS.fmt(f, 1) + ' N</b>（等于测力计的示数）。';
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, String(i + 1)), h('td', null, PS.SURF[r.surf].name), h('td', null, String(r.N)), h('td', null, PLACE[r.place].name), h('td', null, r.speed === 'slow' ? '慢' : '快'), h('td', null, h('b', null, PS.fmt(r.f, 1))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 6, class: 'muted' }, '还没有数据')));
      const R = st.rows, found = {};
      for (let i = 0; i < R.length; i++) for (let j = 0; j < R.length; j++) {
        if (i === j) continue;
        const a = R[i], b = R[j];
        const sS = a.surf === b.surf, sN = a.N === b.N, sP = a.place === b.place, sV = a.speed === b.speed;
        if (!sN && sS && sP && a.N > b.N && !found.N) found.N = [a, b];
        if (!sS && sN && sP && a.f > b.f && !found.S) found.S = [a, b];
        if (!sP && sS && sN && !found.P) found.P = [a, b];
        if (!sV && sS && sN && sP && !found.V) found.V = [a, b];
      }
      const line = (ok, t, ex) => '<div>' + (ok ? '✔ ' : '○ ') + t + (ok ? '：' + ex : '<span class="muted">（还没有对比数据）</span>') + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">用<b>控制变量法</b>：每次只改变一个因素，比较滑动摩擦力的大小。</div>';
      s += line(found.N, '只改变<b>压力</b>', found.N ? '压力 ' + found.N[0].N + ' N 时 f = ' + PS.fmt(found.N[0].f, 1) + ' N，' + found.N[1].N + ' N 时 f = ' + PS.fmt(found.N[1].f, 1) + ' N——压力越大，滑动摩擦力越大' : '');
      s += line(found.S, '只改变<b>接触面的粗糙程度</b>', found.S ? PS.SURF[found.S[0].surf].name + ' ' + PS.fmt(found.S[0].f, 1) + ' N，' + PS.SURF[found.S[1].surf].name + ' ' + PS.fmt(found.S[1].f, 1) + ' N——接触面越粗糙，滑动摩擦力越大' : '');
      s += line(found.P, '只改变<b>接触面积</b>（放法）', found.P ? PLACE[found.P[0].place].name + '和' + PLACE[found.P[1].place].name + '时 f 相同——与接触面积大小<b>无关</b>' : '');
      s += line(found.V, '只改变<b>速度</b>', found.V ? '拉得快和拉得慢时 f 相同——与运动速度<b>无关</b>' : '');
      if (found.N && found.S) s += '<div class="tip tip-good" style="margin:8px 0 0">结论：滑动摩擦力的大小跟<b>接触面所受的压力</b>和<b>接触面的粗糙程度</b>有关。压力越大、接触面越粗糙，滑动摩擦力越大。' + (found.P && found.V ? '与接触面积、运动速度无关。' : '') + '</div>';
      ana.innerHTML = s;
    }
    // 拖动拉环（方案一）
    PS.drag(S, { VW, VH,
      hit: (p) => (st.plan === 'block' && Math.hypot(p.x - st.ring, p.y - (GY - Math.min(P().h, 40) / 2)) < 40 ? 'ring' : null),
      start: () => { st.dragging = true; st.mode = 'drag'; goB.innerHTML = '▶ 匀速拉动'; },
      move: (o, p) => { st.dragTo = PS.clamp(p.x, st.xb + P().w + C0 - 30, 975); },
      end: () => { st.dragging = false; st.mode = 'idle'; st.vr = 0; } });
    const loop = PS.loop((dt) => {
      const n = 10, d = dt / n;
      for (let i = 0; i < n; i++) {
        // 拉环 / 木板的运动
        if (st.plan === 'block') {
          if (st.mode === 'auto') { st.vr = speedV(); st.ring += st.vr * d; if (st.ring > 975) { st.mode = 'idle'; goB.innerHTML = '▶ 匀速拉动'; msg.className = 'fc-msg'; msg.innerHTML = '木板不够长了，点“复位”再做一次。'; } }
          else if (st.mode === 'drag' && st.dragTo != null) { const nr = st.ring + (st.dragTo - st.ring) * Math.min(1, d * 12); st.vr = (nr - st.ring) / d; st.ring = nr; }
          else st.vr = 0;
          st.vboard = 0;
        } else {
          if (st.mode === 'auto') st.vboard = -(st.speed === 'slow' ? 40 : 120) * (1 + 0.35 * Math.sin(st.t * 3)); else st.vboard = 0;
          st.board += st.vboard * d; st.vr = 0;
        }
        // 木块：受弹簧拉力（含阻尼）和摩擦力
        const Fs = spring() + (spring() > 0 ? CS * (st.vr - st.vb) : 0);
        const vrel = st.vb - st.vboard;
        if (st.stick) {
          if (Math.abs(Fs) > fs()) st.stick = false;
          else st.vb = st.vboard;
        }
        if (!st.stick) {
          const f = fk() * Math.sign(vrel || Fs);
          const nv = st.vb + K * (Fs - f) * d;
          if (Math.sign(nv - st.vboard) !== Math.sign(vrel || Fs) && Math.abs(Fs) <= fs()) { st.vb = st.vboard; st.stick = true; }
          else st.vb = nv;
        }
        st.xb += st.vb * d;
        if (st.plan === 'block' && st.xb > 760) { st.xb = 760; st.vb = 0; st.mode = 'idle'; goB.innerHTML = '▶ 匀速拉动'; }
        st.t += d;
      }
      // 是否“匀速”：方案一木块在动且速度与拉环一致；方案二木板在动而木块静止
      const steady = st.plan === 'block' ? st.vb > 5 && Math.abs(st.vb - st.vr) < 5 && st.mode !== 'idle' : Math.abs(st.vboard) > 5 && Math.abs(st.vb) < 4;
      st.uni = steady ? st.uni + dt : 0;
      if (!st.pts.length || st.t - st.pts[st.pts.length - 1][0] > 0.05) st.pts.push([st.t, spring()]);
      while (st.pts.length && st.pts[0][0] < st.t - 12) st.pts.shift();
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const Pl = P(), fsp = spring();
      // 桌面和木板
      ctx.fillStyle = '#dee2e6'; ctx.fillRect(0, GY + 22, VW, 14);
      if (st.plan === 'block') DY.surface(ctx, 40, 990, GY, st.surf, { depth: 20 });
      else {
        ctx.save(); ctx.beginPath(); ctx.rect(0, GY - 14, VW, 40); ctx.clip();
        ctx.translate(((st.board % 600) + 600) % 600 - 600, 0);
        DY.surface(ctx, 0, VW + 1300, GY, st.surf, { depth: 20 });
        ctx.restore();
        // 木板左端的手（木板向左拉）
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, 6, GY - 6, 34, 34, 10); ctx.fill(); ctx.stroke();
        D.arrow(ctx, 70, GY + 60, 10, GY + 60, { color: '#495057', width: 2.5, head: 10 }); D.text(ctx, '拉动木板', 80, GY + 65, { size: F(13), color: '#495057' });
        // 墙
        ctx.fillStyle = '#adb5bd'; ctx.fillRect(966, GY - 170, 34, 190); ctx.strokeStyle = '#868e96'; for (let y = GY - 170; y < GY + 20; y += 16) { ctx.beginPath(); ctx.moveTo(966, y); ctx.lineTo(1000, y + 10); ctx.stroke(); }
      }
      // 木块与砝码
      DY.block(ctx, st.xb, GY, Pl.w, Pl.h, { weights: st.nw, label: '木块' });
      // 弹簧测力计
      const sy = GY - Math.min(Pl.h, 40) / 2;
      const r = DY.hscale(ctx, { x: st.ring, y: sy, F: fsp, max: MAX, div: 0.1, L: LS, F2: F, fs: F(10) });
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(st.xb + Pl.w, sy); ctx.lineTo(r.hook.x + 4, r.hook.y - 2); ctx.stroke();
      if (st.plan === 'block') { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, st.ring - 6, sy - 22, 42, 44, 14); ctx.fill(); ctx.stroke(); if (st.mode === 'idle' && st.xb < 200) D.text(ctx, '← 拖动手', st.ring + 44, sy + 5, { size: F(12), color: '#e8590c' }); }
      else { ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(st.ring + 11, sy); ctx.lineTo(966, sy); ctx.stroke(); }
      // 力的示意
      if (fsp > 0.02) {
        FO.arrow(ctx, st.xb + Pl.w, GY - Pl.h - (st.nw ? 50 : 0) - 26, 0, 30 + fsp * 34, { color: FC.T, label: 'F拉 = ' + PS.fmt(fsp, 1) + ' N', F, labelSide: -1, dot: false });
        if (!st.stick || Math.abs(fsp) > 0.02) FO.arrow(ctx, st.xb + Pl.w / 2, GY + 2, Math.PI, 30 + Math.min(fsp, fs()) * 34, { color: FC.f, label: 'f', F, labelSide: 1 });
      }
      // 放大读数
      DY.hzoom(ctx, fsp, { x: 40, y: 40, w: 230, h: 90, max: MAX, div: 0.1, F2: F });
      D.text(ctx, st.stick ? (st.plan === 'board' && st.vboard ? '木板在动，木块静止' : '木块静止') : (st.plan === 'block' ? '木块在滑动' : '木块相对木板滑动'), 300, 70, { size: F(14), weight: 800, color: st.stick ? '#868e96' : '#2b8a3e' });
      if (st.uni > 0.5) D.text(ctx, st.plan === 'block' ? '✔ 匀速直线运动，示数稳定' : '✔ 木块静止，示数稳定', 300, 70 + F(14) * 1.35, { size: F(13), weight: 700, color: '#2b8a3e' });
      else if (!st.stick) D.text(ctx, '示数在变化……', 300, 70 + F(14) * 1.35, { size: F(13), weight: 700, color: '#e8590c' });
      // F–t 图像（像力传感器一样）
      const t0 = Math.max(0, st.t - 12);
      DY.chart(ctx, { F, x: 70, y: 340, w: 860, h: 120, xmax: 12, ymax: 3, xstep: 1, xlab: 2, ystep: 1, xl: 't/s', yl: '示数 F/N', series: [{ pts: st.pts.map((p) => [p[0] - t0, p[1]]), color: '#1c7ed6', width: 2.2 }] });
    }
    pSeg.set(st.plan, true); sSeg.set(st.surf, true); wSeg.set(st.nw, true); plSeg.set(st.place, true); vSeg.set(st.speed, true);
    reset(); table();
    loop.start();
  });

  /* ================= 静摩擦力：推箱子 / 手握瓶子 ================= */
  PS.register('static-friction', function (el) {
    const VW = 1000, VH = 400;
    const st = { tab: 'push', F: 0, x: 0, v: 0, moving: false, grip: 30, G: 4, by: 0, bv: 0, slip: false };
    const FS = 45, FK = 40, M = 20;
    const tab = PS.ui.seg([{ value: 'push', label: '推箱子' }, { value: 'bottle', label: '手握瓶子' }], st.tab, (v) => { st.tab = v; ui(); });
    el.append(PS.ui.row(tab.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const msg = h('div', { class: 'fc-msg' });
    el.append(ctl, msg);
    const fS = PS.ui.slider({ label: '推力 F', min: 0, max: 60, step: 5, value: 0, unit: 'N', onInput: (v) => { st.F = v; tell(); } });
    const gS = PS.ui.slider({ label: '握力', min: 0, max: 40, step: 2, value: st.grip, unit: 'N', onInput: (v) => { st.grip = v; tell(); } });
    const wS = PS.ui.slider({ label: '瓶和水重 G', min: 2, max: 10, step: 1, value: st.G, unit: 'N', onInput: (v) => { st.G = v; tell(); } });
    fS.el.classList.add('wide');
    function ui() {
      ctl.innerHTML = '';
      if (st.tab === 'push') { ctl.append(fS.el, PS.ui.button('箱子放回原处', () => { st.x = 0; st.v = 0; st.moving = false; tell(); }, 'btn btn-ghost btn-sm')); }
      else ctl.append(gS.el, wS.el, PS.ui.button('重新握住', () => { st.by = 0; st.bv = 0; st.slip = false; tell(); }, 'btn btn-ghost btn-sm'));
      tell();
    }
    const fNow = () => (st.tab === 'push' ? (st.moving ? FK : Math.min(st.F, FS)) : (st.slip ? 0.8 * st.grip : st.G));
    function tell() {
      if (st.tab === 'push') {
        if (st.moving) { msg.className = 'fc-msg info'; msg.innerHTML = '箱子在滑动，受<b>滑动摩擦力 f = 40 N</b>，它的大小与推力无关。' + (st.F > FK ? '推力 ' + st.F + ' N &gt; 40 N，箱子越来越快。' : st.F === FK ? '推力 = 40 N，箱子做<b>匀速直线运动</b>。' : '推力 ' + st.F + ' N &lt; 40 N，箱子越来越慢。'); }
        else if (st.F === 0) { msg.className = 'fc-msg'; msg.innerHTML = '不推时，箱子没有运动的趋势，<b>不受摩擦力</b>。拖动滑块逐渐增大推力。'; }
        else { msg.className = 'fc-msg ok'; msg.innerHTML = '推力 ' + st.F + ' N，箱子<b>没有被推动</b>：箱子受到<b>静摩擦力</b>，与推力是一对平衡力，<b>f = F = ' + st.F + ' N</b>（不是推力小于摩擦力！）。推力增大，静摩擦力也随之增大，最大约 45 N。'; }
      } else {
        if (st.slip) { msg.className = 'fc-msg bad'; msg.innerHTML = '握力太小，瓶子<b>滑下去了</b>！握力越大，手和瓶子之间能产生的最大静摩擦力越大。'; }
        else { msg.className = 'fc-msg ok'; msg.innerHTML = '瓶子静止，竖直方向受<b>重力</b>和<b>静摩擦力</b>，二力平衡：<b>f = G = ' + st.G + ' N</b>，方向竖直向上。握力增大到 ' + st.grip + ' N，摩擦力<b>仍等于 ' + st.G + ' N</b>，不随握力变化；往瓶里加水（G 变大），摩擦力才变大。'; }
      }
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.tab === 'push') {
        if (!st.moving && st.F > FS) { st.moving = true; tell(); }
        if (st.moving) { st.v += ((st.F - FK) / M) * dt * 30; if (st.v <= 0) { st.v = 0; st.moving = false; tell(); } st.x += st.v * dt * 30; }
      } else {
        if (!st.slip && st.grip < st.G) { st.slip = true; tell(); }
        if (st.slip) { st.bv += (9.8 - (0.8 * st.grip * 9.8) / st.G) * dt * 60; st.by = Math.min(260, st.by + st.bv * dt); }
        else if (st.grip >= st.G && st.by > 0 && st.by < 260) { st.bv = 0; }
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.tab === 'push') {
        const gy = 230;
        ctx.fillStyle = '#f1f3f5'; ctx.fillRect(0, gy, 560, 30);
        for (let m = -2; m < 40; m++) { const x = 60 + m * 80 - (st.x % 80); if (x < 0 || x > 560) continue; ctx.fillStyle = '#ced4da'; ctx.fillRect(x, gy + 4, 2, 12); }
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(560, gy); ctx.stroke();
        const bx = 260;
        FO.box(ctx, bx, gy, 140, 120, { label: '箱子' });
        if (st.F) FO.person(ctx, bx - 80, gy, { h: 160, hand: { x: bx - 2, y: gy - 70 }, lean: 0.3 });
        else FO.person(ctx, bx - 110, gy, { h: 160 });
        const f = fNow();
        if (st.F) FO.arrow(ctx, bx, gy - 70, 0, st.F * 2.4, { color: FC.F, label: 'F = ' + st.F + ' N', F, labelSide: -1 });
        if (f > 0) FO.arrow(ctx, bx + 70, gy, Math.PI, f * 2.4, { color: FC.f, label: 'f = ' + f + ' N', F, labelSide: 1 });
        D.text(ctx, st.moving ? '滑动（滑动摩擦力）' : st.F ? '静止（静摩擦力）' : '静止（不受摩擦力）', 20, 30, { size: F(15), weight: 800, color: st.moving ? '#e8590c' : '#2b8a3e' });
        // f–F 图像
        const c = DY.chart(ctx, { F, x: 640, y: 60, w: 300, h: 260, xmax: 60, ymax: 60, xstep: 10, xlab: 20, ystep: 10, ylab: 20, xl: 'F/N', yl: 'f/N', series: [{ pts: [[0, 0], [45, 45]], color: '#2b8a3e' }, { pts: [[45, 40], [60, 40]], color: '#e8590c' }, { pts: [[45, 45], [45, 40]], color: '#adb5bd', dash: [4, 4], width: 1.5 }] });
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(c.X(st.F), c.Y(f), 7, 0, TAU); ctx.fill();
        D.text(ctx, '静摩擦力 f = F', c.X(16), c.Y(30), { size: F(12), weight: 700, color: '#2b8a3e' });
        D.text(ctx, '滑动摩擦力 40 N', c.X(42), c.Y(34), { size: F(12), weight: 700, color: '#e8590c' });
      } else {
        const cx = 360, top = 70 + st.by;
        // 瓶子
        const bh = 220, wl = top + bh - 30 - st.G * 16;
        ctx.save(); ctx.beginPath(); D.roundRect(ctx, cx - 40, top, 80, bh, 16); ctx.clip(); ctx.fillStyle = 'rgba(231,245,255,.9)'; ctx.fillRect(cx - 40, top, 80, bh); ctx.fillStyle = 'rgba(77,171,247,.55)'; ctx.fillRect(cx - 40, wl, 80, top + bh - wl); ctx.restore();
        ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2.5; D.roundRect(ctx, cx - 40, top, 80, bh, 16); ctx.stroke(); ctx.fillStyle = '#1c7ed6'; ctx.fillRect(cx - 16, top - 22, 32, 24);
        // 手（握力越大，手指压得越紧）
        const sq = st.grip / 40 * 6;
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
        D.roundRect(ctx, cx - 58 + sq, 150, 30, 80, 12); ctx.fill(); ctx.stroke();
        D.roundRect(ctx, cx + 28 - sq, 140, 34, 100, 14); ctx.fill(); ctx.stroke();
        ctx.fillRect(cx + 50, 160, 140, 60); D.text(ctx, '手', cx + 120, 196, { size: F(14), weight: 800, color: '#8a5a1c', align: 'center' });
        FO.arrow(ctx, cx - 70, 190, 0, 14 + st.grip * 0.7, { color: '#495057', label: '握力', F, labelSide: -1, dot: false });
        FO.arrow(ctx, cx, top + bh / 2 + 20, Math.PI / 2, st.G * 14, { color: FC.G, label: 'G = ' + st.G + ' N', F });
        const f = fNow();
        FO.arrow(ctx, cx, top + bh / 2 - 10, -Math.PI / 2, f * 14, { color: FC.f, label: 'f = ' + PS.fmt(f, 1) + ' N', F, labelSide: -1 });
        if (st.slip) D.text(ctx, '滑下去了！', cx + 140, 300, { size: F(18), weight: 800, color: '#e03131' });
        // 读数
        const rx = 660;
        [['握力', st.grip + ' N', '#495057'], ['重力 G', st.G + ' N', FC.G], ['摩擦力 f', PS.fmt(f, 1) + ' N', FC.f]].forEach(([a, b, c], i) => { D.text(ctx, a, rx, 110 + i * 60, { size: F(15), color: '#495057' }); D.text(ctx, b, rx + 180, 110 + i * 60, { size: F(22), weight: 800, color: c }); });
        D.text(ctx, st.slip ? '握力 < 能“托住”瓶子所需的力' : 'f = G，与握力无关', rx, 300, { size: F(14), weight: 700, color: st.slip ? '#e03131' : '#2b8a3e' });
      }
    }
    tab.set(st.tab, true);
    ui();
    loop.start();
  });

  /* ================= 摩擦力大小随机练习 ================= */
  PS.register('fric-quiz', function (el) {
    const box = h('div', { class: 'fc-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'N');
    const fb = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'fc-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const R = PS.randInt, pick = PS.pick;
    const GEN = [
      () => { const a = pick([1.2, 1.6, 2, 2.4, 3, 3.6, 5]); return { q: '用弹簧测力计沿水平方向拉着木块在水平桌面上做匀速直线运动，测力计的示数为 ' + a + ' N，木块受到的滑动摩擦力为多少？', a, sol: '木块做匀速直线运动，拉力和滑动摩擦力是一对平衡力，f = F = ' + a + ' N。' }; },
      () => { const a = pick([2, 3, 4, 5]), b = a + pick([1, 2, 3]); return { q: '用 ' + a + ' N 的水平拉力拉着木块在水平桌面上做匀速直线运动。若把拉力增大到 ' + b + ' N，木块受到的滑动摩擦力为多少？', a, sol: '滑动摩擦力只与压力和接触面的粗糙程度有关，与拉力大小、速度无关，仍为 ' + a + ' N（此时木块做加速运动）。' }; },
      () => { const a = pick([20, 30, 50, 80, 100]); return { q: '小明用 ' + a + ' N 的水平推力推静止在水平地面上的箱子，没有推动。箱子受到的摩擦力为多少？', a, sol: '没推动，箱子静止，推力和静摩擦力是一对平衡力，f = F = ' + a + ' N。（不要误以为推力小于摩擦力。）' }; },
      () => { const G = pick([3, 4, 5, 6, 8]), g1 = pick([10, 15, 20]), g2 = g1 + pick([5, 10, 20]); return { q: '手握重为 ' + G + ' N 的水杯静止在空中，握力为 ' + g1 + ' N。若握力增大到 ' + g2 + ' N，水杯受到的摩擦力为多少？', a: G, sol: '水杯静止，竖直方向的静摩擦力与重力平衡，f = G = ' + G + ' N，与握力无关。' }; },
      () => { const a = pick([0.6, 0.8, 1.2, 1.5, 2]); return { q: '木块在水平木板上匀速滑动时，滑动摩擦力为 ' + a + ' N。在木块上放一个与木块重力相等的砝码，再拉着它在同一木板上匀速滑动，此时的滑动摩擦力为多少？', a: PS.round(a * 2, 2), sol: '接触面粗糙程度不变，压力变为原来的 2 倍，滑动摩擦力也变为原来的 2 倍：' + a + ' N × 2 = ' + PS.round(a * 2, 2) + ' N。' }; },
      () => { const b = pick([2, 3, 4]), a = b + pick([1, 2, 3]); const ground = R(0, 1); return ground ? { q: '如图所示的装置：用 F = ' + a + ' N 的水平拉力向右匀速拉动木板 A，木块 B 静止不动，与 B 相连的弹簧测力计（另一端固定）示数为 ' + b + ' N。地面对木板 A 的摩擦力为多少？', a: a - b, sol: 'A 受到向右的拉力 ' + a + ' N，还受到 B 对它向左的摩擦力 ' + b + ' N 和地面对它向左的摩擦力 f地。A 匀速运动：' + a + ' N = ' + b + ' N + f地，f地 = ' + (a - b) + ' N。' } : { q: '用 F = ' + a + ' N 的水平拉力向右匀速拉动木板 A，木块 B 静止不动，与 B 相连的弹簧测力计（另一端固定）示数为 ' + b + ' N。木块 B 受到的摩擦力为多少？', a: b, sol: 'B 静止，测力计的拉力与 A 对 B 的滑动摩擦力平衡，f = ' + b + ' N，方向向右（与 B 相对 A 的运动方向相反）。注意不是 ' + a + ' N。' }; },
      () => { const G = pick([400, 450, 500, 600]); return { q: '体重为 ' + G + ' N 的同学双手握住竖直的杆匀速向上爬，他受到的摩擦力为多少？', a: G, sol: '匀速向上爬，竖直方向的摩擦力与重力平衡，f = G = ' + G + ' N，方向竖直向上。' }; },
    ];
    function next() {
      Q = pick(GEN)();
      box.innerHTML = '<b>计算：</b>' + Q.q;
      inp.value = ''; inp.disabled = false;
      fb.className = 'fc-msg'; fb.innerHTML = '先判断是静摩擦力还是滑动摩擦力，再用二力平衡分析。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = parseFloat(inp.value.replace(/[，,\s]/g, ''));
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.max(0.011, Math.abs(Q.a) * 0.005);
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + PS.round(Q.a, 2) + ' N。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });

  /* ================= 增大和减小摩擦的方法 ================= */
  const MT = [
    { k: 'press+', g: 0, name: '增大压力', a: 4.0, b: 6.0, ex: '刹车时用力捏闸；擦黑板时用力压板擦；拔河时握紧绳子', A: '木箱', B: '木箱上加重物' },
    { k: 'rough+', g: 0, name: '增大接触面的粗糙程度', a: 4.0, b: 6.4, ex: '鞋底、轮胎上有花纹；体操运动员手上涂防滑粉；雪后路面撒沙子', A: '木板上', B: '粗糙的砂纸上' },
    { k: 'roll2slide', g: 0, name: '变滚动为滑动', a: 0.4, b: 4.0, ex: '急刹车时车轮被抱死，在地面上滑行', A: '轮子滚动', B: '轮子卡住不转（滑动）' },
    { k: 'press-', g: 1, name: '减小压力', a: 6.0, b: 4.0, ex: '卸下部分货物再推车', A: '木箱上有重物', B: '拿掉重物' },
    { k: 'rough-', g: 1, name: '减小接触面的粗糙程度', a: 4.0, b: 2.0, ex: '把接触面打磨光滑；滑冰场的冰面很光滑', A: '木板上', B: '光滑的玻璃上' },
    { k: 'slide2roll', g: 1, name: '用滚动代替滑动', a: 4.0, b: 0.4, ex: '行李箱装轮子；机器上装滚动轴承；搬运重物时下面垫圆木', A: '直接拖动', B: '下面垫上圆木' },
    { k: 'apart', g: 1, name: '使接触面彼此分离', a: 4.0, b: 0.8, ex: '给机器加润滑油；气垫船；磁悬浮列车', A: '直接拖动', B: '接触面加润滑油' },
  ];
  PS.register('friction-methods', function (el) {
    const VW = 1000, VH = 340;
    const st = { k: 'press+', after: false, x: 0 };
    const seg = PS.ui.seg(MT.map((m) => ({ value: m.k, label: (m.g ? '减小：' : '增大：') + m.name })), st.k, (v) => { st.k = v; st.after = false; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ab = PS.ui.seg([{ value: false, label: '改变前' }, { value: true, label: '改变后' }], false, (v) => { st.after = v; tell(); });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(ab.el), msg);
    const M = () => MT.find((m) => m.k === st.k);
    function tell() {
      const m = M();
      ab.set(st.after, true);
      msg.className = 'fc-msg ' + (m.g ? 'info' : 'ok');
      msg.innerHTML = '<b>' + (m.g ? '减小' : '增大') + '摩擦的方法：' + m.name + '</b>。用弹簧测力计匀速拉动：' + m.A + ' f = ' + PS.fmt(m.a, 1) + ' N，' + m.B + ' f = ' + PS.fmt(m.b, 1) + ' N。<br>生活中的例子：' + m.ex + '。';
      S.render();
    }
    const loop = PS.loop((dt) => { st.x = (st.x + dt * 50) % 130; S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const m = M(), aft = st.after, f = aft ? m.b : m.a, gy = 240;
      const surf = (m.k === 'rough+' && aft) ? 'towel' : (m.k === 'rough-' && aft) ? 'glass' : 'wood';
      DY.surface(ctx, 20, 760, gy, surf, { depth: 20 });
      if (m.k === 'rough+' && aft) D.text(ctx, '砂纸（很粗糙）', 30, gy + 44, { size: F(12), color: '#868e96' });
      if (m.k === 'apart' && aft) { ctx.fillStyle = 'rgba(250,176,5,.35)'; ctx.fillRect(20, gy - 4, 740, 5); D.text(ctx, '润滑油', 30, gy + 44, { size: F(12), color: '#e67700' }); }
      const bx = 50 + st.x, bw = 150, bh = 90;
      const heavy = (m.k === 'press+' && aft) || (m.k === 'press-' && !aft);
      let lift = 0;
      if ((m.k === 'roll2slide') || (m.k === 'slide2roll' && aft)) lift = 22;
      FO.box(ctx, bx, gy - lift, bw, bh, { label: '木箱' });
      if (heavy) { for (let i = 0; i < 2; i++) DY.weight(ctx, bx + 45 + i * 60, gy - lift - bh, { w: 48, label: '重物', fs: 10 }); }
      if (m.k === 'roll2slide') { [bx + 30, bx + bw - 30].forEach((x) => { ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(x, gy - 11, 11, 0, TAU); ctx.fill(); ctx.strokeStyle = aft ? '#e03131' : '#adb5bd'; ctx.lineWidth = 2; ctx.beginPath(); const a = aft ? 0.5 : st.x / 11; ctx.moveTo(x, gy - 11); ctx.lineTo(x + Math.cos(a) * 9, gy - 11 + Math.sin(a) * 9); ctx.stroke(); }); if (aft) D.text(ctx, '轮子卡死', bx + bw / 2, gy + 44, { size: F(12), weight: 700, color: '#e03131', align: 'center' }); }
      if (m.k === 'slide2roll' && aft) { for (let i = 0; i < 4; i++) { const x = bx - 10 + i * 56 + ((-st.x / 2) % 56 + 56) % 56 * 0; ctx.fillStyle = '#c98d3e'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 10, gy - 11, 11, 0, TAU); ctx.fill(); ctx.stroke(); } D.text(ctx, '圆木', bx + bw / 2, gy + 44, { size: F(12), weight: 700, color: '#8a5a1c', align: 'center' }); }
      // 测力计：刻度长 180 px（每牛 18 px），不受力时挂钩在拉环左边 263 px 处
      const ringX = bx + bw + 273 + f * 18, sy = gy - lift - 45;
      const r = DY.hscale(ctx, { x: ringX, y: sy, F: f, max: 10, div: 0.2, L: 180, F2: F, fs: F(10) });
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + bw, sy); ctx.lineTo(r.hook.x + 4, r.hook.y - 2); ctx.stroke();
      ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, ringX - 6, sy - 22, 42, 44, 14); ctx.fill(); ctx.stroke();
      // 对比柱状图
      const cx = 820, base = 300, kk = 26;
      [[m.a, '改变前', !aft], [m.b, '改变后', aft]].forEach(([v, t, on], i) => {
        const x = cx + i * 80;
        ctx.fillStyle = on ? (m.g ? '#1c7ed6' : '#e8590c') : '#ced4da'; ctx.fillRect(x, base - v * kk, 50, v * kk);
        D.text(ctx, PS.fmt(v, 1) + ' N', x + 25, base - v * kk - 8, { size: F(13), weight: 800, color: '#1b2333', align: 'center' });
        D.text(ctx, t, x + 25, base + 20, { size: F(12), color: '#495057', align: 'center' });
      });
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 10, base); ctx.lineTo(cx + 150, base); ctx.stroke();
      D.text(ctx, '滑动摩擦力 f', cx + 70, 30, { size: F(13), weight: 700, color: '#495057', align: 'center' });
      D.text(ctx, (m.g ? '减小摩擦：' : '增大摩擦：') + m.name, 20, 30, { size: F(16), weight: 800, color: m.g ? '#1c7ed6' : '#e8590c' });
    }
    seg.set(st.k, true);
    tell();
    loop.start();
  });

  /* ================= 增大摩擦还是减小摩擦 ================= */
  PS.register('friction-sort', function (el) {
    PS.sortCards(el, [
      ['鞋底、轮胎上有凹凸不平的花纹', 0, '增大接触面的粗糙程度。'],
      ['体操运动员上器械前在手上涂防滑粉', 0, '增大接触面的粗糙程度。'],
      ['自行车刹车时用力捏闸', 0, '增大压力。'],
      ['擦黑板时用力压板擦', 0, '增大压力。'],
      ['下雪后在路面上撒沙子', 0, '增大接触面的粗糙程度。'],
      ['矿泉水瓶盖的侧面刻有竖条纹', 0, '增大接触面的粗糙程度。'],
      ['给自行车链条加润滑油', 1, '使接触面彼此分离。'],
      ['机器的转动部分装滚动轴承', 1, '用滚动代替滑动。'],
      ['行李箱下面装有轮子', 1, '用滚动代替滑动。'],
      ['磁悬浮列车悬浮在轨道上方行驶', 1, '使接触面彼此分离。'],
      ['冰壶运动员在冰壶前方用力刷冰', 1, '冰面熔化出一层水膜，使接触面分离、更光滑。'],
      ['气垫船向下喷气，使船体离开水面', 1, '使接触面彼此分离。'],
      ['搬运重物时在下面垫几根圆木', 1, '用滚动代替滑动。'],
      ['推车前先卸下部分货物', 1, '减小压力。'],
    ], ['增大摩擦', '减小摩擦']);
  });

  /* ================= 假如没有摩擦 ================= */
  const NW = {
    walk: { name: '走路', yes: '脚向后蹬地，地面对脚有向前的摩擦力，人向前走。', no: '没有摩擦，脚一蹬就打滑，人只能在原地“走”，寸步难行。' },
    car: { name: '汽车启动', yes: '车轮转动时地面对车轮有向前的摩擦力，汽车开动。', no: '车轮在原地空转，汽车开不动。' },
    hold: { name: '手握瓶子', yes: '静摩擦力与重力平衡，瓶子握得住。', no: '瓶子从手中滑落，什么东西都拿不住。' },
    slide: { name: '滑行的木块', yes: '木块受到摩擦阻力，滑行一段距离后停下。', no: '没有阻力，木块将一直匀速运动下去——又一次看到了牛顿第一定律。' },
    nail: { name: '墙上的钉子', yes: '钉子与墙之间的摩擦力使钉子牢牢地钉在墙上，挂得住画。', no: '钉子从墙里滑出来，画掉了下来。' },
  };
  PS.register('friction-world', function (el) {
    const VW = 1000, VH = 340;
    const st = { k: 'walk', on: true, t: 0 };
    const seg = PS.ui.seg(Object.keys(NW).map((k) => ({ value: k, label: NW[k].name })), st.k, (v) => { st.k = v; st.t = 0; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const oSeg = PS.ui.seg([{ value: true, label: '有摩擦' }, { value: false, label: '假如没有摩擦' }], true, (v) => { st.on = v; st.t = 0; tell(); });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(oSeg.el, PS.ui.button('↺ 重新播放', () => { st.t = 0; }, 'btn btn-ghost btn-sm')), msg);
    function tell() { msg.className = 'fc-msg ' + (st.on ? 'ok' : 'bad'); msg.innerHTML = st.on ? NW[st.k].yes : NW[st.k].no; S.render(); }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = st.on ? '#f8fafd' : '#f3f0ff'; ctx.fillRect(0, 0, VW, VH);
      const t = st.t, k = st.k, gy = 290;
      if (k !== 'hold' && k !== 'nail') FO.ground(ctx, 0, VW, gy, { depth: 40, fill: st.on ? '#f1f3f5' : '#e5dbff' });
      if (k === 'walk') {
        const x = st.on ? 200 + (t * 70) % 600 : 420, ph = t * 7;
        FO.person(ctx, x, gy, { h: 170, stride: 0.35 * Math.sin(ph), hand: { x: x + 20 * Math.sin(ph), y: gy - 100 } });
        if (!st.on) { D.text(ctx, '打滑！', x, gy - 200, { size: F(18), weight: 800, color: '#7048e8', align: 'center' }); ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 50 - i * 12, gy - 6); ctx.lineTo(x - 70 - i * 12, gy - 6); ctx.stroke(); } }
      }
      if (k === 'car') {
        const x = st.on ? 120 + Math.min(600, 30 * t * t) : 360;
        FO.cart(ctx, x, gy, { w: 220, h: 60, r: 24, color: '#ff922b', label: '汽车', spin: t * (st.on ? 8 : 20) });
        if (!st.on) D.text(ctx, '车轮空转', x + 110, gy - 110, { size: F(18), weight: 800, color: '#7048e8', align: 'center' });
      }
      if (k === 'hold') {
        const fall = st.on ? 0 : Math.min(200, 0.5 * 900 * t * t);
        ctx.fillStyle = 'rgba(165,216,255,.7)'; ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2; D.roundRect(ctx, 470, 60 + fall, 60, 160, 14); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1c7ed6'; ctx.fillRect(485, 40 + fall, 30, 22);
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; D.roundRect(ctx, 446, 110, 108, 56, 20); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ced4da'; ctx.fillRect(300, 320, 400, 12);
      }
      if (k === 'slide') {
        const v0 = 260, a = st.on ? 180 : 0, tt = st.on ? Math.min(t, v0 / a) : t;
        let x = 80 + v0 * tt - 0.5 * a * tt * tt; if (!st.on) x = 80 + ((v0 * t) % 900);
        DY.block(ctx, x, gy, 110, 60, { label: '木块' });
        D.text(ctx, st.on ? (t > v0 / a ? '停下了' : '越来越慢') : '一直匀速运动下去', x + 55, gy - 80, { size: F(15), weight: 800, color: st.on ? '#e8590c' : '#7048e8', align: 'center' });
      }
      if (k === 'nail') {
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(560, 0, 60, VH); ctx.strokeStyle = '#adb5bd'; for (let y = 0; y < VH; y += 30) { ctx.beginPath(); ctx.moveTo(560, y); ctx.lineTo(620, y); ctx.stroke(); }
        const out = st.on ? 0 : Math.min(160, t * 60), drop = st.on ? 0 : Math.max(0, Math.min(150, 0.5 * 900 * Math.pow(Math.max(0, t - 0.8), 2)));
        ctx.fillStyle = '#868e96'; ctx.fillRect(500 - out, 98, 70, 6); ctx.fillRect(496 - out, 92, 6, 18);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(500 - out, 101 + drop); ctx.lineTo(420 - out, 150 + drop); ctx.moveTo(500 - out, 101 + drop); ctx.lineTo(580 - out, 150 + drop); ctx.stroke();
        ctx.fillStyle = '#fff3bf'; ctx.strokeStyle = '#e67700'; ctx.lineWidth = 6; ctx.fillRect(400 - out, 150 + drop, 200, 130); ctx.strokeRect(400 - out, 150 + drop, 200, 130);
        ctx.fillStyle = '#74c0fc'; ctx.beginPath(); ctx.moveTo(420 - out, 260 + drop); ctx.lineTo(480 - out, 200 + drop); ctx.lineTo(530 - out, 245 + drop); ctx.lineTo(580 - out, 210 + drop); ctx.lineTo(580 - out, 260 + drop); ctx.fill();
      }
      D.text(ctx, st.on ? '有摩擦' : '假如没有摩擦', 18, 30, { size: F(16), weight: 800, color: st.on ? '#2b8a3e' : '#7048e8' });
    }
    seg.set(st.k, true); oSeg.set(true, true);
    tell();
    loop.start();
  });
})();
