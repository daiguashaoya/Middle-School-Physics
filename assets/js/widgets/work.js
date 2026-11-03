/* 第11章第1节：功——做功的场景判断、做功分类、搬箱子的不同路径（W = Gh）、W = Fs 计算器、1 J 有多大。依赖 force.js、dynamics.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, EN = PS.en;
  const TAU = Math.PI * 2;
  const SC = '#2b8a3e'; // 移动距离 s 的颜色

  /** 移动距离 s 的箭头（绿色虚线） */
  function sArrow(ctx, x1, y1, x2, y2, F, lab) {
    if (Math.hypot(x2 - x1, y2 - y1) < 6) return;
    D.arrow(ctx, x1, y1, x2, y2, { color: SC, width: 2.6, head: 10, dash: [7, 5] });
    const vert = Math.abs(x2 - x1) < Math.abs(y2 - y1);
    D.text(ctx, lab || 's', (x1 + x2) / 2 + (vert ? 14 : 0), (y1 + y2) / 2 + (vert ? 5 : -10), { size: F(17), weight: 800, color: SC, align: vert ? 'left' : 'center' });
  }
  function forkLift(ctx, x, y, lift, F) {
    // 车身、驾驶室、轮子、门架、货叉；lift 为货叉离地的高度
    ctx.save();
    ctx.fillStyle = '#fab005'; ctx.strokeStyle = '#a07400'; ctx.lineWidth = 2;
    D.roundRect(ctx, x, y - 80, 190, 52, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#343a40'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 40, y - 80); ctx.lineTo(x + 52, y - 150); ctx.lineTo(x + 140, y - 150); ctx.lineTo(x + 150, y - 80); ctx.stroke();
    ctx.fillStyle = '#495057'; ctx.fillRect(x - 20, y - 70, 26, 40);
    [x + 40, x + 150].forEach((wx) => { ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(wx, y - 20, 20, 0, TAU); ctx.fill(); ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(wx, y - 20, 8, 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#868e96'; ctx.fillRect(x + 192, y - 250, 10, 250); ctx.fillRect(x + 206, y - 250, 10, 250);
    ctx.fillStyle = '#495057'; ctx.fillRect(x + 200, y - 18 - lift - 40, 10, 44); ctx.fillRect(x + 210, y - 18 - lift, 120, 8);
    ctx.restore();
    return { fx: x + 270, fy: y - 18 - lift };
  }
  function barbell(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = '#868e96'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 110, y); ctx.lineTo(x + 110, y); ctx.stroke();
    [-1, 1].forEach((s) => { ctx.fillStyle = '#343a40'; D.roundRect(ctx, x + s * 92 - 9, y - 38, 18, 76, 4); ctx.fill(); ctx.fillStyle = '#e03131'; D.roundRect(ctx, x + s * 74 - 8, y - 30, 16, 60, 4); ctx.fill(); });
    ctx.restore();
  }
  function stone(ctx, x, y) {
    ctx.save();
    const g = ctx.createLinearGradient(0, y - 110, 0, y);
    g.addColorStop(0, '#adb5bd'); g.addColorStop(1, '#6c757d');
    ctx.fillStyle = g; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 95, y); ctx.lineTo(x - 105, y - 50); ctx.lineTo(x - 70, y - 100); ctx.lineTo(x - 10, y - 118); ctx.lineTo(x + 60, y - 104); ctx.lineTo(x + 100, y - 60); ctx.lineTo(x + 92, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function football(ctx, x, y, r, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#343a40';
    const pent = (cx, cy, s) => { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); } ctx.closePath(); ctx.fill(); };
    pent(0, 0, r * 0.32);
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * TAU) / 5; ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip(); pent(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.28); ctx.restore(); }
    ctx.restore();
  }
  function skateboard(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#7048e8'; D.roundRect(ctx, x - 12, y - 10, 24, 100, 10); ctx.fill();
    ctx.fillStyle = '#343a40'; [y + 12, y + 70].forEach((wy) => { ctx.beginPath(); ctx.arc(x + 15, wy, 6, 0, TAU); ctx.fill(); });
    ctx.restore();
  }

  /* ================= 力对物体做功了吗？ ================= */
  const ANS = ['做了功', '有力，但没有移动距离', '移动了距离，但没有力', '力与移动方向垂直'];
  PS.register('work-scenes', function (el) {
    const VW = 1000, VH = 420, GY = 370;
    const SCN = [
      { n: '叉车举高货物', a: 0, why: '货物受到货叉向上的力 F，并且在 F 的方向上移动了距离 s，F 对货物<b>做了功</b>。', draw(ctx, F, t) {
        const p = Math.min(1, (t % 4) / 2.6), lift = 20 + p * 170;
        const fk = forkLift(ctx, 250, GY, lift, F);
        FO.box(ctx, fk.fx - 55, fk.fy, 110, 80);
        FO.arrow(ctx, fk.fx, fk.fy - 40, -Math.PI / 2, 100, { color: FC.F, label: 'F', F, labelSide: 1 });
        sArrow(ctx, fk.fx + 90, GY - 38, fk.fx + 90, fk.fy - 18, F);
      } },
      { n: '推着小车前进', a: 0, why: '小车受到人向前的推力 F，并且在 F 的方向上移动了距离 s，推力<b>做了功</b>。', draw(ctx, F, t) {
        const p = Math.min(1, (t % 4.5) / 3.6), x = 260 + p * 380;
        FO.cart(ctx, x, GY, { w: 150, h: 46, r: 13, color: '#4dabf7' });
        FO.person(ctx, x - 70, GY, { h: 170, lean: 0.35, hand: { x: x - 2, y: GY - 75 }, stride: 0.35 + 0.15 * Math.sin(t * 8) });
        FO.arrow(ctx, x, GY - 60, 0, 110, { color: FC.F, label: 'F', F });
        sArrow(ctx, 260 + 75, GY - 135, x + 75, GY - 135, F);
      } },
      { n: '举起杠铃的过程', a: 0, why: '杠铃受到向上的举力 F，并在 F 的方向上移动了距离 s，举力<b>做了功</b>。', draw(ctx, F, t) {
        const p = Math.min(1, (t % 4) / 2.2), by = GY - 120 - p * 110, x = 470;
        FO.person(ctx, x, GY, { h: 190, hand: { x: x - 60, y: by }, hand2: { x: x + 60, y: by }, stride: 0.3 });
        barbell(ctx, x, by);
        FO.arrow(ctx, x, by, -Math.PI / 2, 95, { color: FC.F, label: 'F', F, labelSide: 1 });
        sArrow(ctx, x + 150, GY - 120, x + 150, by, F);
      } },
      { n: '举着杠铃静止不动', a: 1, why: '运动员对杠铃有向上的力，但杠铃<b>没有移动</b>，s = 0，举力<b>不做功</b>（劳而无功）。', draw(ctx, F, t) {
        const by = GY - 232, x = 470;
        FO.person(ctx, x, GY, { h: 190, hand: { x: x - 60, y: by }, hand2: { x: x + 60, y: by }, stride: 0.3 });
        barbell(ctx, x, by + Math.sin(t * 20) * 0.8);
        FO.arrow(ctx, x, by, -Math.PI / 2, 95, { color: FC.F, label: 'F', F, labelSide: 1 });
        D.text(ctx, 's = 0', x + 150, by + 8, { size: F(18), weight: 800, color: SC });
        D.text(ctx, '已经坚持了 ' + PS.fmt(t % 10, 0) + ' s', x + 150, by + 8 + F(18) * 1.5, { size: F(14), weight: 700, color: '#868e96' });
      } },
      { n: '用力搬石头，没有搬动', a: 1, why: '人对石头有向上的力，但石头<b>没有移动</b>，s = 0，人对石头<b>不做功</b>。', draw(ctx, F, t) {
        const x = 560;
        stone(ctx, x, GY);
        const sh = Math.sin(t * 25) * 1.2;
        FO.person(ctx, x - 160, GY, { h: 170, lean: 0.75, hand: { x: x - 95 + sh, y: GY - 50 }, stride: 0.45 });
        FO.arrow(ctx, x - 92, GY - 52, -Math.PI / 2, 95, { color: FC.F, label: 'F', F });
        D.text(ctx, 's = 0', x + 120, GY - 60, { size: F(18), weight: 800, color: SC });
      } },
      { n: '提着滑板在水平路上走', a: 3, why: '手对滑板的力 F <b>竖直向上</b>，滑板沿<b>水平方向</b>移动，没有在力的方向上移动距离，提滑板的力<b>不做功</b>。', draw(ctx, F, t) {
        const p = Math.min(1, (t % 4.5) / 3.6), x = 280 + p * 380;
        const hand = { x: x + 34, y: GY - 112 };
        skateboard(ctx, hand.x, hand.y + 12);
        FO.person(ctx, x, GY, { h: 180, hand, stride: 0.2 + 0.25 * Math.sin(t * 7) });
        FO.arrow(ctx, hand.x, hand.y + 2, -Math.PI / 2, 100, { color: FC.F, label: 'F', F });
        sArrow(ctx, 280 + 34, GY + 28 - 18, x + 34, GY + 28 - 18, F);
        D.text(ctx, 'F ⊥ s', 860, 120, { size: F(22), weight: 800, color: '#e03131', align: 'center' });
      } },
      { n: '踢出去的足球在草地上滚动', a: 2, why: '足球离开脚以后，人对球<b>不再有力的作用</b>，球靠惯性向前滚动，人对球<b>不做功</b>（不劳无功）。', draw(ctx, F, t) {
        const T = t % 5, v0 = 260, a = 60, tt = Math.min(T, v0 / a), x = 300 + v0 * tt - 0.5 * a * tt * tt, r = 26;
        ctx.fillStyle = '#b2f2bb'; ctx.fillRect(0, GY, VW, 12);
        FO.person(ctx, 200, GY, { h: 170, stride: 0.5, hand: { x: 230, y: GY - 80 } });
        football(ctx, x, GY - r, r, (x - 300) / r);
        sArrow(ctx, 300, GY - 80, x, GY - 80, F);
        D.text(ctx, '人对球的力 F = 0', x, GY - 80 - F(18) * 1.6, { size: F(17), weight: 800, color: FC.F, align: 'center' });
      } },
    ];
    const st = { i: 0, t: 0, done: SCN.map(() => null) };
    const chips = h('div', { class: 'dy-scenes' });
    const btns = SCN.map((s, i) => { const b = PS.ui.button((i + 1) + '. ' + s.n, () => go(i), 'btn btn-sm'); chips.append(b); return b; });
    el.append(chips);
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ab = h('div', { class: 'fc-chips' });
    const aBtns = ANS.map((t, k) => { const b = PS.ui.button(t, () => answer(k), 'btn btn-sm'); ab.append(b); return b; });
    const msg = h('div', { class: 'fc-msg' }), score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(h('div', { class: 'small', style: { marginTop: '8px' } }, h('b', null, '画面中的力 F 对物体做功了吗？')), ab, msg, score);
    function go(i) { st.i = i; st.t = 0; upd(); }
    function answer(k) {
      const s = SCN[st.i];
      if (st.done[st.i] != null) return;
      st.done[st.i] = k === s.a;
      k === s.a ? PS.sound.good() : PS.sound.bad();
      upd();
    }
    function upd() {
      const s = SCN[st.i], d = st.done[st.i];
      btns.forEach((b, i) => { b.classList.toggle('on', i === st.i); b.innerHTML = (i + 1) + '. ' + SCN[i].n + (st.done[i] == null ? '' : st.done[i] ? ' ✔' : ' ✘'); });
      aBtns.forEach((b, k) => { b.classList.toggle('on', d != null && k === s.a); b.disabled = d != null; });
      if (d == null) { msg.className = 'fc-msg info'; msg.innerHTML = '观察：物体受到力 F 了吗？物体在 F 的方向上移动了距离吗？选一个答案。'; }
      else {
        msg.className = 'fc-msg ' + (d ? 'ok' : 'bad');
        msg.innerHTML = (d ? '✔ 正确！' : '✘ 答案是“' + ANS[s.a] + '”。') + s.why + (st.i < SCN.length - 1 ? ' <a href="javascript:void 0" class="nx">下一个 →</a>' : '');
        const nx = msg.querySelector('.nx'); if (nx) nx.onclick = () => go(st.i + 1);
      }
      const n = st.done.filter((x) => x != null).length, ok = st.done.filter((x) => x).length;
      score.innerHTML = '已判断 ' + n + ' / ' + SCN.length + '，答对 ' + ok + ' 个' + (n === SCN.length ? (ok === n ? ' · 🎉 全对！做功的两个必要因素：①作用在物体上的力；②物体在这个力的方向上移动了距离。' : ' · 点上面的场景可以再看一遍。') : '');
    }
    PS.loop((dt) => { st.t += dt; S.render(); }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      FO.ground(ctx, 0, VW, GY, { depth: 50 });
      SCN[st.i].draw(ctx, F, st.t);
      D.text(ctx, SCN[st.i].n, 20, F(18) + 8, { size: F(18), weight: 800, color: '#1b2333' });
      D.text(ctx, '橙色：力 F　绿色虚线：移动的距离 s', 20, F(18) + 8 + F(13) * 1.7, { size: F(13), color: '#868e96' });
    }
    upd();
  });

  /* ================= 分一分：做功了吗？ ================= */
  PS.register('work-sort', function (el) {
    PS.sortCards(el, [
      ['小明把一桶水从地面提到桌上，手对水桶的力', 0, '水桶在提力的方向（竖直向上）上移动了距离。'],
      ['工人推着购物车在水平地面上前进，推力', 0, '购物车在推力的方向上移动了距离。'],
      ['苹果从树上落下，重力', 0, '苹果在重力的方向（竖直向下）上移动了距离，重力做了功。'],
      ['起重机吊着货物匀速上升，拉力', 0, '货物在拉力的方向上移动了距离。'],
      ['用力推墙，墙没有动，推力', 1, '墙没有移动，s = 0。'],
      ['举重运动员举着杠铃停留 3 s，举力', 1, '杠铃没有移动。'],
      ['司机用力推汽车，汽车纹丝不动，推力', 1, '汽车没有移动。'],
      ['踢出去的足球在空中飞行，脚对足球', 2, '足球离开脚后，脚对它不再有力的作用。'],
      ['水平抛出的粉笔在空中飞行，手对粉笔', 2, '粉笔离开手后靠惯性运动，手对它没有力。'],
      ['冰壶离手后在冰面上滑行，运动员对冰壶', 2, '离手后运动员对冰壶没有力。'],
      ['提着书包在水平路面上匀速行走，手对书包的力', 3, '提力竖直向上，书包水平移动。'],
      ['背着书包站在匀速水平行驶的公交车上，人对书包的力', 3, '人对书包的力竖直向上，书包水平移动。'],
      ['在水平桌面上滚动的小球，桌面对小球的支持力', 3, '支持力竖直向上，小球水平移动。'],
      ['小明提着水桶从一楼走上二楼，手对水桶的力', 0, '水桶在竖直方向上升高了，提力做了功（W = Gh）。'],
    ], ['做了功', '有力无距离', '有距离无力', '力与距离垂直']);
  });

  /* ================= 把箱子搬到高台上：W = Gh ================= */
  PS.register('lift-path', function (el) {
    const VW = 1000, VH = 440, GY = 390, HM = 1.2, PX = 150, TOPY = GY - HM * PX, BW = 64, BH = 52;
    const TX0 = 720, TX1 = 960, X0 = 150, X1 = 830, SX0 = 320, NS = 4, STW = (TX0 - SX0) / NS, STH = (GY - TOPY) / NS;
    const PATHS = {
      up: { n: '先竖直提起，再水平走过去', pts: [[X0, GY], [X0, TOPY], [X1, TOPY]] },
      side: { n: '先水平走过去，再提起', pts: [[X0, GY], [TX0 - 50, GY], [TX0 - 50, TOPY], [X1, TOPY]] },
      stair: { n: '沿楼梯走上去', pts: (() => { const p = [[X0, GY], [SX0 - BW / 2 - 4, GY]]; for (let i = 0; i < NS; i++) { const x = SX0 + i * STW - BW / 2 - 4; p.push([x, GY - (i + 1) * STH]); p.push([x + STW, GY - (i + 1) * STH]); } p.push([X1, TOPY]); return p; })() },
      flat: { n: '只在水平地面上走', pts: [[X0, GY], [TX0 - 50, GY]] },
    };
    const st = { path: 'up', G: 50, s: 0, run: false, trail: [] };
    const pSeg = PS.ui.seg(Object.keys(PATHS).map((k) => ({ value: k, label: PATHS[k].n })), st.path, (v) => { st.path = v; reset(); });
    pSeg.el.style.flexWrap = 'wrap';
    const gSeg = PS.ui.seg([20, 50, 100].map((g) => ({ value: g, label: '箱重 ' + g + ' N' })), st.G, (v) => { st.G = v; reset(); });
    el.append(PS.ui.row(pSeg.el), PS.ui.row(gSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const goB = PS.ui.button('▶ 开始搬', () => { if (st.s >= total() - 1e-6) reset(); st.run = true; }, 'btn btn-primary btn-sm');
    const rd = { s: PS.ui.readout('箱子通过的路程', '—'), hh: PS.ui.readout('升高的高度', '—'), W: PS.ui.readout('手的力做的功', '—') };
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(goB, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), h('div', { class: 'en-read' }, Object.values(rd).map((r) => r.el)), msg);
    const pts = () => PATHS[st.path].pts;
    const segLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
    const total = () => { const p = pts(); let L = 0; for (let i = 1; i < p.length; i++) L += segLen(p[i - 1], p[i]); return L; };
    function at(s) {
      const p = pts(); let L = 0;
      for (let i = 1; i < p.length; i++) { const l = segLen(p[i - 1], p[i]); if (s <= L + l || i === p.length - 1) { const k = l ? PS.clamp((s - L) / l, 0, 1) : 1; return { x: PS.lerp(p[i - 1][0], p[i][0], k), y: PS.lerp(p[i - 1][1], p[i][1], k), vert: Math.abs(p[i][0] - p[i - 1][0]) < 1 }; } L += l; }
      return { x: p[0][0], y: p[0][1], vert: false };
    }
    function reset() { st.s = 0; st.run = false; st.trail = []; tell(); }
    function tell() {
      const P = at(st.s), hm = (GY - P.y) / PX, sm = st.s / PX, W = st.G * hm;
      rd.s.set(PS.fmt(sm, 2) + ' m'); rd.hh.set(PS.fmt(hm, 2) + ' m'); rd.W.set('<span style="color:' + PS.EC.W + '">' + PS.fmt(W, 1) + ' J</span>');
      const done = st.s >= total() - 1e-6;
      let t;
      if (!st.run && !done) t = '匀速搬运时，手对箱子的力 F 竖直向上，大小等于箱子的重力 G。选一种搬法，点“开始搬”，看看手的力做了多少功。';
      else if (!done) t = P.vert ? '箱子<b>竖直上升</b>：在 F 的方向上移动了距离，F <b>做功</b>。' : '箱子<b>水平移动</b>：F 竖直向上，与移动方向垂直，F <b>不做功</b>，功不增加。';
      else if (st.path === 'flat') t = '箱子没有升高，手的力始终与移动方向垂直，<b>W = 0</b>——走得再远也不做功。';
      else t = '箱子升高了 ' + HM + ' m，手的力做的功 <b>W = Gh = ' + st.G + ' N × ' + HM + ' m = ' + PS.fmt(st.G * HM, 0) + ' J</b>。换一种搬法试试：只要升高的高度相同，做的功就相同，与水平方向走了多远无关。';
      msg.className = 'fc-msg ' + (done ? 'ok' : 'info'); msg.innerHTML = t;
      S.render();
    }
    PS.loop((dt) => {
      if (!st.run) return;
      st.s = Math.min(total(), st.s + dt * 240);
      const P = at(st.s); st.trail.push([P.x, P.y]);
      if (st.s >= total() - 1e-6) { st.run = false; PS.sound.good(); }
      tell();
    }, el).start();
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      FO.ground(ctx, 0, VW, GY, { depth: 50 });
      // 高台
      ctx.fillStyle = '#d0bfff'; ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2; ctx.fillRect(TX0, TOPY, TX1 - TX0, GY - TOPY); ctx.strokeRect(TX0, TOPY, TX1 - TX0, GY - TOPY);
      D.text(ctx, '高台', (TX0 + TX1) / 2, TOPY + 40, { size: F(16), weight: 800, align: 'center', color: '#5f3dc4' });
      // 高度标注
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(TX1 + 14, TOPY); ctx.lineTo(TX1 + 14, GY); ctx.stroke();
      D.arrow(ctx, TX1 + 14, (TOPY + GY) / 2, TX1 + 14, TOPY, { color: '#495057', width: 1.5, head: 7 }); D.arrow(ctx, TX1 + 14, (TOPY + GY) / 2, TX1 + 14, GY, { color: '#495057', width: 1.5, head: 7 });
      D.text(ctx, 'h = ' + HM + ' m', TX1 - 6, (TOPY + GY) / 2 + 5, { size: F(14), weight: 800, align: 'right', color: '#495057', bg: 'rgba(255,255,255,.85)' });
      // 楼梯
      if (st.path === 'stair') {
        ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(SX0, GY);
        for (let i = 0; i < NS; i++) { ctx.lineTo(SX0 + i * STW, GY - (i + 1) * STH); ctx.lineTo(SX0 + (i + 1) * STW, GY - (i + 1) * STH); }
        ctx.lineTo(TX0, GY); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // 路径
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 2;
      ctx.beginPath(); pts().forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - BH / 2) : ctx.moveTo(p[0], p[1] - BH / 2))); ctx.stroke(); ctx.restore();
      if (st.trail.length > 1) { ctx.strokeStyle = SC; ctx.lineWidth = 3; ctx.beginPath(); st.trail.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - BH / 2) : ctx.moveTo(p[0], p[1] - BH / 2))); ctx.stroke(); }
      // 箱子和手的力
      const P = at(st.s);
      FO.box(ctx, P.x - BW / 2, P.y, BW, BH);
      D.text(ctx, st.G + ' N', P.x, P.y - BH / 2 + 5, { size: F(13), weight: 800, align: 'center', color: '#5c3a0e' });
      FO.arrow(ctx, P.x, P.y - BH, -Math.PI / 2, 40 + st.G * 0.6, { color: FC.F, label: 'F = G', F });
      // 功的柱
      const bx = 40, by = 70, bh = 200, Wm = 100 * HM, W = st.G * (GY - P.y) / PX;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.2; D.roundRect(ctx, bx - 14, by - 40, 96, bh + 76, 10); ctx.fill(); ctx.stroke();
      D.text(ctx, '功 W', bx + 34, by - 16, { size: F(14), weight: 800, align: 'center', color: PS.EC.W });
      ctx.fillStyle = '#f1f3f5'; ctx.fillRect(bx + 14, by, 40, bh);
      const fh = (W / Wm) * bh; ctx.fillStyle = PS.EC.W; ctx.fillRect(bx + 14, by + bh - fh, 40, fh);
      D.text(ctx, PS.fmt(W, 0) + ' J', bx + 34, by + bh + F(14) * 1.3, { size: F(14), weight: 800, align: 'center', color: PS.EC.W });
    }
    tell();
  });

  /* ================= W = Fs 计算器 ================= */
  PS.register('work-calc', function (el) {
    EN.calc(el, {
      top: { k: 'W', short: '功 W', name: '功 <i>W</i>', unit: 'J', units: { J: 1, kJ: 1e3 }, v: '500' },
      a: { k: 'F', short: '力 F', name: '力 <i>F</i>', unit: 'N', units: { N: 1, kN: 1e3 }, v: '50' },
      b: { k: 's', short: '距离 s', name: '在力的方向上移动的距离 <i>s</i>', unit: 'm', units: { m: 1, km: 1e3, cm: 1e-2 }, v: '10' },
      hint: '填好已知量，点“计算”。注意：s 是物体<b>在力的方向上</b>移动的距离；单位要统一成 N、m、J。',
      presets: [
        { t: '马拉雪橇（F = 800 N，s = 3 000 m）', mode: 'top', a: 800, b: 3000, u: { a: 'N', b: 'm' }, note: '雪橇匀速运动，马的拉力等于摩擦力 800 N；货物重多少与拉力做功无关。' },
        { t: '水平推箱子（50 N，前进 10 m）', mode: 'top', a: 50, b: 10, u: { a: 'N', b: 'm' }, note: '箱子重 100 N，但重力方向上没有移动距离，重力不做功。' },
        { t: '把 100 N 的箱子匀速举高 1.5 m', mode: 'top', a: 100, b: 1.5, u: { a: 'N', b: 'm' }, note: '匀速举高时 F = G，W = Gh。' },
        { t: '拉力做功 1 000 J，拉力 200 N，求距离', mode: 'b', top: 1000, a: 200, u: { top: 'J', a: 'N' } },
        { t: '推车 50 m 做功 2.5 kJ，求推力', mode: 'a', top: 2.5, b: 50, u: { top: 'kJ', b: 'm' } },
      ],
    });
  });

  /* ================= 1 J 有多大 ================= */
  const JF = [
    ['把两个鸡蛋举高 1 m', 1, '🥚', '两个鸡蛋约重 1 N，举高 1 m：W = 1 N × 1 m = 1 J'],
    ['把物理课本从地面捡到课桌上', 2, '📘', '课本约重 2.5 N，课桌高约 0.8 m：W ≈ 2 J'],
    ['跳绳时每跳一次', 30, '🏃', '中学生约重 500 N，每次跳起约 6 cm：W = 500 N × 0.06 m = 30 J'],
    ['中学生从一楼走到二楼', 1500, '🚶', '体重约 500 N，一层楼高约 3 m：W = 500 N × 3 m = 1 500 J'],
    ['举重运动员举起 150 kg 的杠铃', 3000, '🏋️', '杠铃重 1 500 N，举高约 2 m：W ≈ 3 000 J'],
    ['起重机把 6 t 的大石头提升 1 m', 6e4, '🏗️', 'W = Gh = 6×10⁴ N × 1 m = 6×10⁴ J'],
    ['马拉雪橇走 3 km', 2.4e6, '🐴', '拉力 800 N，s = 3 000 m：W = 2.4×10⁶ J'],
  ];
  PS.register('joule-feel', function (el) {
    EN.ladder(el, { items: JF, lmin: -1, lmax: 7, tick: (e) => (e < 4 ? PS.prettyText(Math.pow(10, e)) : '10' + '⁰¹²³⁴⁵⁶⁷⁸⁹'[e]), caption: '功 / J（对数刻度：每一大格是前一格的 10 倍）', hint: '点击图标，看看做这些事大约要做多少功', fmt: (it) => it[0] + ' ≈ ' + EN.txt(it[1]) + ' J' });
    const q = h('div', { class: 'fc-q' });
    el.append(q);
    const QS = [
      ['把两个鸡蛋举高 1 m，做的功大约是（　）', ['0.1 J', '1 J', '10 J', '100 J'], 1, '两个鸡蛋约重 1 N，W = Gh = 1 N × 1 m = 1 J。'],
      ['小明从地上捡起一本物理课本放到课桌上，他对课本做的功大约是（　）', ['0.02 J', '0.2 J', '2 J', '20 J'], 2, '课本约重 2.5 N，课桌高约 0.8 m，W ≈ 2 J。'],
      ['一名中学生从一楼走到三楼，克服重力做的功大约是（　）', ['30 J', '300 J', '3 000 J', '30 000 J'], 2, '体重约 500 N，一楼到三楼升高约 6 m，W = 500 N × 6 m = 3 000 J。'],
      ['中学生跳绳时，每跳一次克服重力做的功大约是（　）', ['0.3 J', '3 J', '30 J', '300 J'], 2, '体重约 500 N，每次跳起约 6 cm，W = 500 N × 0.06 m = 30 J。'],
      ['把一瓶 500 mL 的矿泉水从地面举到 2 m 高处，对水做的功约为（　）', ['0.1 J', '1 J', '10 J', '100 J'], 2, '水的质量 0.5 kg，重 5 N，W = 5 N × 2 m = 10 J。'],
    ];
    EN.estimate(q, QS);
  });

  /* ================= 功和功率的计算（随机出题） ================= */
  PS.register('work-quiz', function (el, opts) {
    const box = h('div', { class: 'fc-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'J');
    const fb = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'fc-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), h('div', { class: 'small muted' }, 'g 取 10 N/kg，ρ水 = 1.0×10³ kg/m³；可以写成 1.2×10^3 或 1200。'), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, P = (x) => PS.pretty(x, 4);
    const GEN = {
      push: () => { const F = pick([20, 50, 80, 100, 150]), s = pick([2, 5, 10, 20]); return { q: '用 ' + F + ' N 的水平推力推着箱子在水平地面上前进了 ' + s + ' m，推力做的功是多少？', a: F * s, u: 'J', sol: 'W = Fs = ' + F + ' N × ' + s + ' m = ' + F * s + ' J。' }; },
      lift: () => { const m = pick([2, 5, 10, 20, 50]), hh = pick([0.5, 1, 1.5, 2, 3]); return { q: '把质量为 ' + m + ' kg 的物体匀速举高 ' + hh + ' m，举力做的功是多少？', a: m * 10 * hh, u: 'J', sol: '匀速举高时 F = G = mg = ' + m * 10 + ' N，W = Gh = ' + m * 10 + ' N × ' + hh + ' m = ' + PS.round(m * 10 * hh, 2) + ' J。' }; },
      carry: () => { const G = pick([50, 100, 200]), s = pick([5, 10, 20]); return { q: '小明提着重 ' + G + ' N 的水桶在水平路面上匀速走了 ' + s + ' m，他提水桶的力做的功是多少？', a: 0, u: 'J', sol: '提力竖直向上，水桶沿水平方向移动，没有在力的方向上移动距离，W = 0。' }; },
      sled: () => { const m = pick([200, 400, 500]), f = pick([300, 500, 800]), s = pick([100, 500, 1000, 3000]); return { q: '质量为 ' + m + ' kg 的雪橇在马的水平拉力作用下沿平直路面匀速前进了 ' + s + ' m，雪橇受到的摩擦力是 ' + f + ' N。马的拉力做的功是多少？', a: f * s, u: 'J', sol: '雪橇匀速运动，F = f = ' + f + ' N（与质量无关）；W = Fs = ' + f + ' N × ' + s + ' m = ' + P(f * s) + ' J。' }; },
      pw: () => { const W = pick([600, 1200, 3000, 6000]), t = pick([5, 10, 20, 30]); return { q: '某机器在 ' + t + ' s 内做了 ' + W + ' J 的功，它的功率是多少？', a: W / t, u: 'W', sol: 'P = W/t = ' + W + ' J ÷ ' + t + ' s = ' + PS.round(W / t, 2) + ' W。' }; },
      crane: () => { const m = pick([1, 2, 3, 6]), hh = pick([2, 5, 10]), t = pick([10, 20, 25, 50]); const W = m * 1e4 * hh; return { q: '起重机在 ' + t + ' s 内把质量为 ' + m + ' t 的货物匀速提升了 ' + hh + ' m，起重机提升货物的功率是多少？', a: W / t, u: 'W', sol: 'G = mg = ' + P(m * 1e4) + ' N，W = Gh = ' + P(W) + ' J，P = W/t = ' + P(W / t) + ' W。' }; },
      pump: () => { const V = pick([3, 6, 9, 12]), hh = pick([10, 20, 30]); const W = V * 1e4 * hh; return { q: '在 ' + hh + ' m 深的矿井里，每分钟冒出地下水 ' + V + ' m³。抽水机的功率至少是多少，才能不让矿井里积水？', a: W / 60, u: 'W', sol: '每分钟积水的重力 G = ρVg = ' + P(V * 1e4) + ' N，W = Gh = ' + P(W) + ' J，P = W/t = ' + P(W) + ' J ÷ 60 s = ' + P(W / 60) + ' W。' }; },
      stair: () => { const m = pick([40, 50, 60]), fl = pick([2, 3, 4]), t = pick([10, 12, 15, 20]); const W = m * 10 * 3 * (fl - 1); return { q: '质量为 ' + m + ' kg 的同学用 ' + t + ' s 从一楼走到' + '一二三四五'[fl - 1] + '楼，每层楼高 3 m。他上楼的功率是多少？', a: W / t, u: 'W', sol: 'h = 3 m × ' + (fl - 1) + ' = ' + 3 * (fl - 1) + ' m，W = mgh = ' + W + ' J，P = W/t = ' + PS.round(W / t, 1) + ' W。' }; },
      fv: () => { const Pk = pick([30, 60, 90]), v = pick([10, 15, 20, 30]); return { q: '一辆汽车发动机的功率为 ' + Pk + ' kW，以 ' + v + ' m/s 的速度匀速行驶，汽车的牵引力是多少？', a: (Pk * 1e3) / v, u: 'N', sol: 'P = Fv，F = P/v = ' + P(Pk * 1e3) + ' W ÷ ' + v + ' m/s = ' + PS.round((Pk * 1e3) / v, 1) + ' N。' }; },
      wpt: () => { const Pk = pick([1, 1.5, 2, 5]), t = pick([1, 2, 5, 10]); return { q: '一台功率为 ' + Pk + ' kW 的电动机工作 ' + t + ' min，它做的功是多少？', a: Pk * 1e3 * t * 60, u: 'J', sol: 'W = Pt = ' + P(Pk * 1e3) + ' W × ' + t * 60 + ' s = ' + P(Pk * 6e4 * t) + ' J。' }; },
    };
    const keys = opts.set === 'w' ? ['push', 'lift', 'carry', 'sled'] : Object.keys(GEN);
    function next() {
      Q = GEN[pick(keys)]();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      inp.value = ''; inp.disabled = false;
      fb.className = 'fc-msg'; fb.innerHTML = '功 W = Fs（s 是在力的方向上移动的距离），功率 P = W/t，匀速运动时 P = Fv。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = EN.parse(inp.value);
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.abs(Q.a) * 0.006 + 1e-9;
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + P(Q.a) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });
})();
