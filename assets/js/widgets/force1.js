/* 第7章第1节：力——施力物体和受力物体、1 N 有多大、磁体与小铁球、力的作用效果分类、力的三要素、力的示意图作图、力的作用是相互的。依赖 force.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC;
  const TAU = Math.PI * 2;

  /* ================= 找施力物体和受力物体 ================= */
  const WHO = [
    { k: 'push', name: '推小车', objs: ['人', '小车'], contact: true, force: '人对小车的推力', why: '人用手推小车，人是施力物体，小车是受力物体。' },
    { k: 'magnet', name: '磁体吸铁球', objs: ['磁体', '小铁球'], contact: false, force: '磁体对铁球的吸引力', why: '磁体没有碰到铁球，也能吸引它——<b>不接触的物体之间也可以有力的作用</b>。' },
    { k: 'kick', name: '踢足球', objs: ['脚', '足球'], contact: true, force: '脚对足球的踢力', why: '脚踢球，脚是施力物体，足球是受力物体；球飞出去以后，脚就不再对它施力了。' },
    { k: 'lift', name: '举杠铃', objs: ['运动员', '杠铃'], contact: true, force: '运动员对杠铃的举力', why: '运动员（手）对杠铃施加向上的力，杠铃是受力物体。' },
    { k: 'ant', name: '蚂蚁搬食物', objs: ['蚂蚁', '食物'], contact: true, force: '蚂蚁对食物的力', why: '不只是人，动物、机器……任何物体都可以是施力物体。' },
    { k: 'apple', name: '苹果下落', objs: ['地球', '苹果'], contact: false, force: '地球对苹果的吸引力', why: '地球没有碰到空中的苹果，却吸引它落下——这就是第3节要学的<b>重力</b>，施力物体是地球。' },
    { k: 'clap', name: '手拍桌子', objs: ['手', '桌子'], contact: true, force: '手对桌子的力', why: '手对桌子施力，同时手也觉得疼——桌子也对手施力。施力物体同时也是受力物体（知识点 4）。' },
  ];

  PS.register('force-who', function (el) {
    const VW = 1000, VH = 360;
    const st = { i: 0, pick: {}, done: {}, t: 0, show: false };
    const seg = PS.ui.seg(WHO.map((w, i) => ({ value: i, label: w.name })), 0, (v) => { st.i = v; st.pick = {}; st.show = !!st.done[v]; st.t = 0; build(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const qa = h('div', { class: 'fc-q' });
    const msg = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(qa, msg, score);

    function build() {
      const W = WHO[st.i];
      qa.innerHTML = '';
      const order = st.order && st.order[st.i] ? st.order[st.i] : (st.order = st.order || {}, st.order[st.i] = Math.random() < 0.5 ? [0, 1] : [1, 0]);
      const row = (label, key, opts) => {
        const box = h('div', { class: 'fc-chips' }, h('b', { style: { alignSelf: 'center', minWidth: '7.5em' } }, label));
        opts.forEach(([text, val]) => {
          const b = PS.ui.button(text, () => { if (st.show) return; st.pick[key] = val; PS.sound.tick(); build(); check(); }, 'btn btn-sm' + (st.pick[key] === val ? ' on' : ''));
          box.append(b);
        });
        return box;
      };
      qa.append(row('施力物体是：', 'from', order.map((j) => [W.objs[j], j])));
      qa.append(row('受力物体是：', 'to', order.map((j) => [W.objs[j], j])));
      qa.append(row('两个物体：', 'contact', [['接触', true], ['不接触', false]]));
      if (!st.show) { msg.className = 'fc-msg'; msg.innerHTML = '看动画，选出<b>施力物体</b>和<b>受力物体</b>，再判断它们是否接触。'; }
      else result(true);
      const n = Object.keys(st.done).length, ok = Object.values(st.done).filter(Boolean).length;
      score.innerHTML = '已完成 ' + n + ' / ' + WHO.length + ' 个场景，一次答对 ' + ok + ' 个' + (n === WHO.length ? '。🎉 你会发现：<b>每个力都有施力物体和受力物体，缺一不可</b>；物体之间可以接触，也可以不接触。' : '');
    }
    function check() {
      const p = st.pick;
      if (p.from == null || p.to == null || p.contact == null) return;
      const W = WHO[st.i];
      const ok = p.from === 0 && p.to === 1 && p.contact === W.contact;
      if (p.from === p.to) { msg.className = 'fc-msg bad'; msg.innerHTML = '施力物体和受力物体是<b>两个不同的物体</b>——力是“物体对物体”的作用。再想想。'; st.pick = {}; PS.sound.bad(); setTimeout(build, 1400); return; }
      if (st.done[st.i] == null) st.done[st.i] = ok;
      if (!ok) {
        PS.sound.bad();
        msg.className = 'fc-msg bad';
        msg.innerHTML = (p.from !== 0 ? '施力物体选错了：是<b>' + W.objs[0] + '</b>对<b>' + W.objs[1] + '</b>施力。' : '') + (p.contact !== W.contact ? ' 接触情况再看看：两个物体' + (W.contact ? '是<b>接触</b>的。' : '<b>没有接触</b>。') : '');
        st.pick = {};
        setTimeout(() => { st.show = true; build(); }, 1600);
        return;
      }
      PS.sound.good();
      st.show = true; build();
    }
    function result() {
      const W = WHO[st.i];
      msg.className = 'fc-msg ok';
      msg.innerHTML = '✔ <b>' + W.force + '</b>：施力物体是<b>' + W.objs[0] + '</b>，受力物体是<b>' + W.objs[1] + '</b>，两者' + (W.contact ? '<b>接触</b>' : '<b>不接触</b>') + '。' + W.why;
    }

    const loop = PS.loop((dt, t) => { st.t = t; S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const W = WHO[st.i], t = st.t;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const GY = 300;
      let arrow = null; // [x, y, ang, len]
      const lab = (s, x, y, c) => D.text(ctx, s, x, y, { size: F(15), weight: 800, color: c || '#495057', align: 'center', bg: 'rgba(255,255,255,.85)' });
      if (W.k === 'push') {
        FO.ground(ctx, 0, VW, GY);
        const s = (t % 4) * 40;
        const cx = 470 + s;
        FO.cart(ctx, cx, GY, { w: 170, h: 46, color: '#74c0fc', spin: s / 11 });
        FO.person(ctx, cx - 70, GY, { h: 170, hand: { x: cx, y: GY - 45 }, hand2: { x: cx, y: GY - 58 }, lean: 0.38, stride: 0.45 });
        lab('人', cx - 80, GY - 190); lab('小车', cx + 85, GY - 80);
        arrow = [cx + 2, GY - 52, 0, 90];
      } else if (W.k === 'magnet') {
        ctx.fillStyle = '#e8d3a9'; ctx.fillRect(80, GY - 10, 840, 22);
        ctx.fillStyle = '#c9a66b'; ctx.fillRect(110, GY + 12, 18, 50); ctx.fillRect(872, GY + 12, 18, 50);
        const p = (t % 3.2) / 3.2;
        const bx = 330 + Math.min(1, p * p * 1.6) * 288;
        FO.ball(ctx, bx, GY - 26, 16, '#ced4da', '#495057');
        FO.magnet(ctx, 700, GY - 30, 130, { n: -1, t: 38 });
        lab('磁体', 700, GY - 70); lab('小铁球', bx, GY - 62);
        arrow = [bx + 16, GY - 26, 0, 70];
        D.text(ctx, '←  没有接触也有力  →', 520, GY - 110, { size: F(13), color: '#868e96', align: 'center' });
      } else if (W.k === 'kick') {
        FO.ground(ctx, 0, VW, GY, { fill: '#d3f9d8' });
        const p = (t % 2.6) / 2.6;
        const ang = p < 0.35 ? -0.9 + (p / 0.35) * 1.5 : 0.6 - Math.min(1, (p - 0.35) / 0.5) * 1.5;
        const hip = { x: 330, y: GY - 150 };
        const foot = { x: hip.x + Math.sin(ang) * 140, y: hip.y + Math.cos(ang) * 140 };
        // 另一条腿与身体
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(hip.x - 30, GY); ctx.stroke();
        ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(hip.x - 10, hip.y - 100); ctx.stroke();
        ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(hip.x - 14, hip.y - 128, 18, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
        ctx.fillStyle = '#e03131'; D.roundRect(ctx, foot.x - 6, foot.y - 10, 36, 18, 7); ctx.fill();
        const hit = p >= 0.35;
        const q = hit ? Math.min(1, (p - 0.35) / 0.55) : 0;
        const bx = 500 + q * 420, by = GY - 18 - Math.sin(q * Math.PI) * 140;
        FO.ball(ctx, bx, by, 18, '#ffffff', '#868e96');
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 18, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fill();
        lab('脚', hip.x - 70, GY - 30); lab('足球', 500, GY - 60);
        if (p > 0.28 && p < 0.42) D.text(ctx, '嘭！', 520, GY - 90, { size: F(22), weight: 900, color: '#e8590c', align: 'center' });
        arrow = [482, GY - 18, -0.35, 80];
      } else if (W.k === 'lift') {
        FO.ground(ctx, 0, VW, GY);
        const up = 0.5 - 0.5 * Math.cos(t * 1.6);
        const hy = GY - 150 - up * 60;
        const cx = 500;
        FO.person(ctx, cx, GY, { h: 180, hand: { x: cx + 40, y: hy }, hand2: { x: cx - 40, y: hy }, stride: 0.35 });
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 170, hy); ctx.lineTo(cx + 170, hy); ctx.stroke();
        [-1, 1].forEach((sd) => { ctx.fillStyle = '#343a40'; D.roundRect(ctx, cx + sd * 150 - 9, hy - 40, 18, 80, 4); ctx.fill(); ctx.fillStyle = '#e03131'; D.roundRect(ctx, cx + sd * 128 - 8, hy - 30, 16, 60, 4); ctx.fill(); });
        lab('运动员', cx - 120, GY - 40); lab('杠铃', cx + 210, hy - 50);
        arrow = [cx + 80, hy, -Math.PI / 2, 70];
      } else if (W.k === 'ant') {
        FO.ground(ctx, 0, VW, GY, { fill: '#f3e3c3' });
        const x = 260 + ((t * 45) % 440);
        // 食物（面包屑）
        ctx.fillStyle = '#f5c26b'; ctx.strokeStyle = '#c48b2c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x + 10, GY - 92, 46, 26, 0.15, 0, TAU); ctx.fill(); ctx.stroke();
        // 蚂蚁
        ctx.fillStyle = '#343a40'; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3;
        const leg = Math.sin(t * 14) * 8;
        for (let i = 0; i < 3; i++) { const lx = x - 22 + i * 22; ctx.beginPath(); ctx.moveTo(lx, GY - 40); ctx.lineTo(lx - 14 + (i % 2 ? leg : -leg), GY); ctx.moveTo(lx, GY - 40); ctx.lineTo(lx + 14 + (i % 2 ? -leg : leg), GY - 2); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(x - 34, GY - 42, 22, 15, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, GY - 44, 13, 10, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 28, GY - 50, 13, 11, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 34, GY - 58); ctx.lineTo(x + 48, GY - 74); ctx.moveTo(x + 30, GY - 60); ctx.lineTo(x + 30, GY - 70); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x + 2, GY - 52); ctx.lineTo(x + 6, GY - 68); ctx.stroke();
        lab('蚂蚁', x - 40, GY - 6 + 30); lab('食物', x + 10, GY - 136);
        arrow = [x + 6, GY - 68, -Math.PI / 2, 60];
      } else if (W.k === 'apple') {
        // 地球表面（大圆弧）
        ctx.fillStyle = '#a5d8ff'; ctx.beginPath(); ctx.arc(500, GY + 1400, 1400, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8ce99a'; ctx.beginPath(); ctx.arc(500, GY + 1400, 1400, Math.PI * 1.43, Math.PI * 1.57); ctx.lineTo(500, GY + 1400); ctx.fill();
        // 树
        ctx.fillStyle = '#a0522d'; ctx.fillRect(330, GY - 150, 26, 152);
        ctx.fillStyle = '#51cf66'; [[343, GY - 190, 80], [290, GY - 160, 55], [400, GY - 160, 55]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
        const p = (t % 2.4) / 2.4;
        const ay = GY - 150 + Math.min(1, p * p * 1.8) * 136;
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(420, ay, 13, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(420, ay - 12); ctx.lineTo(424, ay - 20); ctx.stroke();
        lab('苹果', 480, ay - 4); lab('地球', 700, GY + 40, '#1864ab');
        arrow = [420, ay, Math.PI / 2, 60];
      } else if (W.k === 'clap') {
        // 桌子
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(250, GY - 20, 500, 24);
        ctx.fillStyle = '#a87b3c'; ctx.fillRect(280, GY + 4, 20, 56); ctx.fillRect(700, GY + 4, 20, 56);
        const p = (t % 1.6) / 1.6;
        const hy = GY - 30 - Math.abs(Math.sin(p * Math.PI)) * 120;
        // 手掌（从上方拍下）
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
        ctx.fillRect(470, hy - 160, 46, 120);
        D.roundRect(ctx, 446, hy - 50, 96, 48, 18); ctx.fill(); ctx.stroke();
        if (hy > GY - 40) { D.text(ctx, '啪！', 600, GY - 70, { size: F(24), weight: 900, color: '#e8590c', align: 'center' }); D.text(ctx, '好疼……', 380, GY - 90, { size: F(15), weight: 700, color: '#e03131', align: 'center' }); }
        lab('手', 420, hy - 100); lab('桌子', 680, GY - 40);
        arrow = [494, GY - 20, Math.PI / 2, 40];
      }
      if (st.show && arrow) FO.arrow(ctx, arrow[0], arrow[1], arrow[2], arrow[3], { label: 'F', F, color: FC.F });
      D.text(ctx, '场景：' + W.name, 16, 30, { size: F(15), weight: 800, color: '#3b5bdb' });
    }
    build();
    loop.start();
  });

  /* ================= 1 N 有多大 ================= */
  const NF = [
    // [名称, 力 N, 图标, 说明]
    ['一枚 1 元硬币', 0.06, 'coin', '托起一枚 1 元硬币（约 6 g）的力约 0.06 N'],
    ['一个鸡蛋', 0.5, '🥚', '托起一个鸡蛋的力约 0.5 N'],
    ['两个鸡蛋', 1, '🥚🥚', '托起两个鸡蛋的力约 <b>1 N</b>——记住这个“手感”'],
    ['一个苹果', 1.5, '🍎', '托起一个苹果（约 150 g）的力约 1.5 N'],
    ['一本物理课本', 2.5, '📘', '托起一本物理课本的力约 2.5 N'],
    ['一瓶 550 mL 矿泉水', 5.5, '💧', '托起一瓶 550 mL 矿泉水的力约 5.5 N'],
    ['一个书包', 40, '🎒', '提起一个装满书的书包约需 40 N'],
    ['一个中学生', 500, '👦', '一个中学生站在地上，对地面的压力约 500 N'],
  ];
  PS.register('newton-feel', function (el) {
    const VW = 1000, VH = 300, X0 = 70, X1 = 940, LMIN = -2, LMAX = 3;
    const st = { on: 2 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(msg);
    const q = h('div', { class: 'fc-q' });
    el.append(q);
    const lx = (F) => X0 + ((Math.log10(F) - LMIN) / (LMAX - LMIN)) * (X1 - X0);
    PS.drag(S, { VW, VH, hit: (p) => { const i = NF.findIndex((it, k) => Math.abs(p.x - lx(it[1])) < 34 && Math.abs(p.y - (k % 2 ? 118 : 70)) < 34); return i >= 0 ? i : null; }, start: (i) => { st.on = i; PS.sound.tick(); upd(); }, move() {} });
    function upd() {
      const it = NF[st.on];
      msg.innerHTML = '<b>' + it[0] + '</b>：' + it[3] + '。';
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const AY = 190;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.5; D.arrow(ctx, X0 - 20, AY, X1 + 40, AY, { color: '#495057', width: 2.5 });
      for (let e = LMIN; e <= LMAX; e++) {
        const x = lx(Math.pow(10, e));
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, AY - 8); ctx.lineTo(x, AY + 8); ctx.stroke();
        D.text(ctx, PS.prettyText(Math.pow(10, e)) + ' N', x, AY + 30, { size: F(14), weight: 700, align: 'center', color: e === 0 ? '#e8590c' : '#495057' });
      }
      D.text(ctx, '力（对数刻度：每一大格是前一格的 10 倍）', VW / 2, AY + 62, { size: F(12), color: '#868e96', align: 'center' });
      NF.forEach((it, k) => {
        const x = lx(it[1]), y = k % 2 ? 118 : 70, on = k === st.on;
        ctx.strokeStyle = on ? '#e8590c' : '#adb5bd'; ctx.lineWidth = on ? 2.5 : 1.2; ctx.setLineDash(on ? [] : [4, 4]);
        ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x, AY); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = on ? '#fff3df' : '#fff'; ctx.strokeStyle = on ? '#e8590c' : '#dee2e6'; ctx.lineWidth = on ? 2.5 : 1.5;
        ctx.beginPath(); ctx.arc(x, y, 28, 0, TAU); ctx.fill(); ctx.stroke();
        if (it[2] === 'coin') { ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#868e96'; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill(); ctx.stroke(); D.text(ctx, '1', x, y + 1, { size: F(13), weight: 800, align: 'center', baseline: 'middle', color: '#495057' }); }
        else D.text(ctx, it[2], x, y + 1, { size: it[2].length > 2 ? 18 : 26, align: 'center', baseline: 'middle' });
        if (on) D.text(ctx, it[0] + ' ≈ ' + it[1] + ' N', x, AY - 18 + (x > 800 ? 0 : 0), { size: F(14), weight: 800, color: '#e8590c', align: x > 820 ? 'right' : x < 160 ? 'left' : 'center', bg: 'rgba(255,255,255,.92)' });
      });
      D.text(ctx, '点击物品，看看托起它大约要用多大的力', 16, 26, { size: F(13), color: '#868e96' });
    }
    // 随机估测题
    const QS = [
      ['托起两个鸡蛋所用的力大约是（　）', ['0.1 N', '1 N', '10 N', '100 N'], 1],
      ['一个中学生对地面的压力大约是（　）', ['5 N', '50 N', '500 N', '5000 N'], 2],
      ['托起一个苹果的力大约是（　）', ['0.015 N', '0.15 N', '1.5 N', '15 N'], 2],
      ['托起一瓶 550 mL 矿泉水的力大约是（　）', ['0.55 N', '5.5 N', '55 N', '550 N'], 1],
      ['托起一枚 1 元硬币的力大约是（　）', ['0.06 N', '0.6 N', '6 N', '60 N'], 0],
      ['提起一个装满书的书包大约要用（　）', ['0.4 N', '4 N', '40 N', '400 N'], 2],
    ];
    let qi = PS.randInt(0, QS.length - 1);
    function ask() {
      const [stem, opts, ans] = QS[qi];
      q.innerHTML = '';
      const fb = h('div', { class: 'small', style: { marginTop: '6px' } });
      const box = h('div', { class: 'q-options cols-4' });
      opts.forEach((o, k) => {
        const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCD'[k] + '</span>' + o });
        b.addEventListener('click', () => {
          if (box.dataset.done) return; box.dataset.done = 1;
          box.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === ans) x.classList.add('right'); });
          if (k !== ans) b.classList.add('wrong');
          k === ans ? PS.sound.good() : PS.sound.bad();
          fb.innerHTML = (k === ans ? '✔ 正确！' : '✘ 正确答案是 ' + opts[ans] + '。') + ' 以“两个鸡蛋约 1 N”为标准来比较。';
        });
        box.append(b);
      });
      q.append(h('b', null, '估一估：'), stem, box, h('div', { class: 'controls', style: { marginTop: '6px' } }, fb, PS.ui.button('换一题', () => { qi = (qi + 1 + PS.randInt(0, QS.length - 2)) % QS.length; ask(); }, 'btn btn-ghost btn-sm')));
    }
    if (!document.getElementById('nf-style')) document.head.append(h('style', { id: 'nf-style' }, '.q-options.cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}@media (max-width:680px){.q-options.cols-4{grid-template-columns:repeat(2,minmax(0,1fr))}}'));
    ask();
    upd();
  });

  /* ================= 力改变物体的运动状态：磁体与小铁球（俯视） ================= */
  PS.register('magnet-ball', function (el) {
    const VW = 1000, VH = 440, R = 14, K = 1.6e6;
    const PRE = {
      rest: { label: '静止的铁球', ball: [380, 220], v: [0, 0], mag: [640, 220, 0] },
      front: { label: '磁体放在正前方', ball: [150, 220], v: [190, 0], mag: [800, 220, 0] },
      side: { label: '磁体放在侧旁', ball: [150, 190], v: [210, 0], mag: [560, 350, Math.PI / 2] },
      none: { label: '拿走磁体', ball: [150, 220], v: [200, 0], mag: null },
    };
    const st = { pre: 'side', run: false, ball: null, v: null, mag: null, trail: [], tt: 0, stuck: false, out: false, v0: 0, dir0: 0, F: [0, 0] };
    const seg = PS.ui.seg(Object.keys(PRE).map((k) => ({ value: k, label: PRE[k].label })), st.pre, (v) => { st.pre = v; reset(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const go = PS.ui.button('▶ 释放小球', () => { if (st.stuck || st.out) reset(); st.run = true; PS.sound.tick(); }, 'btn btn-primary btn-sm');
    const rOut = [PS.ui.readout('速度大小', '—', 'accent'), PS.ui.readout('运动方向（与开始时比）', '—', 'primary'), PS.ui.readout('运动状态', '—')];
    el.append(PS.ui.row(go, PS.ui.button('↺ 重置', reset, 'btn btn-ghost btn-sm')), h('div', { class: 'readouts' }, rOut.map((r) => r.el)));
    const msg = h('div', { class: 'fc-msg' });
    el.append(msg);

    function reset() {
      const P = PRE[st.pre];
      st.run = false; st.stuck = false; st.out = false; st.tt = 0;
      st.ball = { x: P.ball[0], y: P.ball[1] }; st.v = { x: P.v[0], y: P.v[1] };
      st.mag = P.mag ? { x: P.mag[0], y: P.mag[1], a: P.mag[2] } : null;
      st.trail = []; st.F = [0, 0]; st.vLast = null;
      st.v0 = Math.hypot(st.v.x, st.v.y); st.dir0 = 0;
      msg.className = 'fc-msg';
      msg.innerHTML = {
        rest: '小铁球静止在光滑的桌面上。点“释放小球”（松开挡板），看磁体能不能让它动起来。可以拖动磁体换个位置。',
        front: '小球从斜面滚下后沿直线运动，正前方放着磁体。猜一猜：小球的速度会怎样变化？',
        side: '在小球运动路径的侧旁放一个磁体。猜一猜：小球的运动会发生什么变化？（可以拖动磁体）',
        none: '没有磁体时，小球在光滑桌面上怎样运动？（忽略摩擦）',
      }[st.pre];
      S.render(); readouts();
    }
    PS.drag(S, { VW, VH,
      hit: (p) => (st.mag && Math.hypot(p.x - st.mag.x, p.y - st.mag.y) < 75 && !st.run ? 'mag' : null),
      move: (o, p) => { st.mag.x = PS.clamp(p.x, 120, VW - 80); st.mag.y = PS.clamp(p.y, 70, VH - 50); S.render(); },
      hover: () => false });
    function poles() {
      if (!st.mag) return [];
      const c = Math.cos(st.mag.a), s = Math.sin(st.mag.a);
      return [[st.mag.x - c * 60, st.mag.y - s * 60], [st.mag.x + c * 60, st.mag.y + s * 60]];
    }
    function force(x, y) {
      let fx = 0, fy = 0;
      poles().forEach(([px, py]) => { const dx = px - x, dy = py - y, d = Math.max(28, Math.hypot(dx, dy)); const f = K / (d * d); fx += (f * dx) / d; fy += (f * dy) / d; });
      return [fx, fy];
    }
    function touching() {
      if (!st.mag) return false;
      const c = Math.cos(st.mag.a), s = Math.sin(st.mag.a);
      const dx = st.ball.x - st.mag.x, dy = st.ball.y - st.mag.y;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      return Math.abs(u) < 65 + R && Math.abs(v) < 17 + R;
    }
    const loop = PS.loop((dt) => {
      if (st.run) {
        const n = 8;
        for (let i = 0; i < n; i++) {
          const d = dt / n;
          const f = force(st.ball.x, st.ball.y);
          st.F = f;
          st.v.x += f[0] * d; st.v.y += f[1] * d;
          st.ball.x += st.v.x * d; st.ball.y += st.v.y * d;
          st.tt += d;
          if (touching()) { st.stuck = true; st.run = false; st.vLast = { x: st.v.x, y: st.v.y }; st.v = { x: 0, y: 0 }; PS.sound.clack(); readouts(); finish(); break; }
          if (st.ball.x < 30 || st.ball.x > VW - 30 || st.ball.y < 30 || st.ball.y > VH - 30) { st.out = true; st.run = false; finish(); break; }
        }
        if (Math.floor(st.tt / 0.12) > st.trail.length - 1) st.trail.push({ x: st.ball.x, y: st.ball.y });
        readouts();
      }
      S.render();
    }, el);
    function readouts() {
      const V = st.stuck && st.vLast ? st.vLast : st.v; // 被吸住时显示吸住前一瞬间的速度
      const sp = Math.hypot(V.x, V.y);
      const dir = sp > 1 ? Math.round((Math.atan2(V.y, V.x) * 180) / Math.PI) : null;
      rOut[0].set(PS.fmt(sp / 10, 1) + ' cm/s' + (st.stuck ? '（吸住前）' : ''));
      rOut[1].set(dir == null ? '—' : st.v0 < 1 ? '从静止开始运动' : (dir === 0 ? '不变（向右）' : '偏转 ' + Math.abs(dir) + '°'));
      if (!st.run && st.tt === 0) { rOut[2].set('—'); return; }
      const ch = [];
      if (Math.abs(sp - st.v0) > 3) ch.push(st.v0 < 1 ? '由静止变为运动' : sp > st.v0 ? '变快' : '变慢');
      if (dir != null && st.v0 >= 1 && Math.abs(dir) >= 2) ch.push('方向改变');
      rOut[2].set(ch.length ? '<span style="color:#e03131">改变（' + ch.join('、') + '）</span>' : '<span style="color:#2b8a3e">不变</span>');
    }
    function finish() {
      msg.className = 'fc-msg ok';
      const P = st.pre;
      msg.innerHTML = {
        rest: '小铁球由<b>静止变为运动</b>——磁体对铁球的吸引力改变了它的运动状态。',
        front: '小球沿原方向运动，速度<b>越来越快</b>（看频闪的点，间距越来越大）——<b>力改变了物体运动的快慢</b>。',
        side: '小球的运动<b>方向发生了改变</b>（路径变弯了），速度大小也变了——<b>力可以改变物体运动的方向</b>。',
        none: '没有磁体吸引时，小球沿直线运动，快慢和方向都<b>不变</b>（频闪的点间距相等）。',
      }[P] + (P !== 'none' ? '<br>结论：<b>力可以改变物体的运动状态</b>。运动状态的改变包括<b>速度大小</b>的改变和<b>运动方向</b>的改变。' : '');
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      // 桌面（俯视）
      ctx.fillStyle = '#efe0c2'; ctx.fillRect(0, 0, VW, VH);
      ctx.strokeStyle = 'rgba(160,120,60,.15)'; ctx.lineWidth = 2;
      for (let y = 20; y < VH; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(300, y + 6, 600, y - 6, VW, y + 3); ctx.stroke(); }
      // 斜面（俯视）
      if (st.pre !== 'rest') {
        const P = PRE[st.pre];
        const g = ctx.createLinearGradient(20, 0, 130, 0); g.addColorStop(0, '#adb5bd'); g.addColorStop(1, '#e9ecef');
        ctx.fillStyle = g; ctx.fillRect(20, P.ball[1] - 26, 112, 52);
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.strokeRect(20, P.ball[1] - 26, 112, 52);
        D.text(ctx, '斜面', 76, P.ball[1] - 34, { size: F(12), weight: 700, color: '#495057', align: 'center' });
      } else if (!st.run && st.tt === 0) {
        ctx.fillStyle = '#868e96'; ctx.fillRect(st.ball.x + R + 3, st.ball.y - 22, 6, 44);
        D.text(ctx, '挡板', st.ball.x + R + 6, st.ball.y - 28, { size: F(12), color: '#495057', align: 'center' });
      }
      // 频闪轨迹
      st.trail.forEach((p, i) => { ctx.fillStyle = 'rgba(73,80,87,' + (0.18 + 0.5 * (i / Math.max(1, st.trail.length))) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); });
      // 磁体
      if (st.mag) {
        FO.magnet(ctx, st.mag.x, st.mag.y, 120, { ang: st.mag.a, t: 34, n: 1 });
        if (!st.run) D.text(ctx, '↔ 可拖动', st.mag.x, st.mag.y + (Math.abs(Math.sin(st.mag.a)) > 0.5 ? 82 : 38), { size: F(11), color: '#868e96', align: 'center' });
      }
      // 小球
      FO.ball(ctx, st.ball.x, st.ball.y, R, '#ced4da', '#495057');
      // 速度和力的箭头
      const sp = Math.hypot(st.v.x, st.v.y);
      if (sp > 2) D.arrow(ctx, st.ball.x, st.ball.y, st.ball.x + (st.v.x / sp) * Math.min(120, sp * 0.4 + 20), st.ball.y + (st.v.y / sp) * Math.min(120, sp * 0.4 + 20), { color: '#3b5bdb', width: 3, head: 11 });
      if (st.mag && (st.run || st.tt === 0)) {
        const f = force(st.ball.x, st.ball.y), fm = Math.hypot(f[0], f[1]);
        if (fm > 20) { const L = Math.min(90, 14 + fm * 0.12); FO.arrow(ctx, st.ball.x, st.ball.y, Math.atan2(f[1], f[0]), L, { color: FC.F, width: 2.6, head: 10, dot: false }); }
      }
      // 图例
      ctx.fillStyle = 'rgba(255,255,255,.85)'; D.roundRect(ctx, VW - 250, 12, 236, 64, 10); ctx.fill();
      D.arrow(ctx, VW - 236, 32, VW - 196, 32, { color: '#3b5bdb', width: 3, head: 9 }); D.text(ctx, '速度方向', VW - 188, 37, { size: F(13), color: '#3b5bdb', weight: 700 });
      D.arrow(ctx, VW - 236, 58, VW - 196, 58, { color: FC.F, width: 3, head: 9 }); D.text(ctx, '磁体对铁球的吸引力', VW - 188, 63, { size: F(13), color: FC.F, weight: 700 });
      D.text(ctx, '俯视图 · 桌面光滑（忽略摩擦）· 灰点：每隔 0.12 s 的位置', 14, VH - 12, { size: F(12), color: '#7d6a45' });
    }
    seg.set(st.pre, true);
    reset();
    loop.start();
  });

  /* ================= 力的作用效果分类 ================= */
  PS.register('effect-sort', function (el) {
    PS.sortCards(el, [
      ['🏹 用力拉弓，弓变弯了', 0, '弓的形状改变'],
      ['守门员接住飞来的足球', 1, '足球由运动变为静止'],
      ['🐼 熊猫把竹子压弯了', 0, '竹子的形状改变'],
      ['运动员用力把铅球推出去', 1, '铅球由静止变为运动'],
      ['用力捏橡皮泥，橡皮泥变扁了', 0, '橡皮泥的形状改变'],
      ['🚗 汽车刹车后越来越慢，最后停下', 1, '速度大小改变'],
      ['磁体使滚动的铁球拐弯', 1, '运动方向改变'],
      ['跳水运动员把跳板压弯', 0, '跳板的形状改变'],
      ['⛵ 风把船帆吹得鼓起来', 0, '船帆的形状改变'],
      ['⚽ 踢出去的足球在草地上越滚越慢', 1, '速度大小改变（地面的阻力）'],
      ['🍎 苹果从树上落下，越落越快', 1, '速度大小改变（重力）'],
      ['🛰️ 卫星绕地球匀速转动', 1, '速度大小不变，但运动方向时刻在变，运动状态在改变'],
      ['用力压弹簧，弹簧变短', 0, '弹簧的形状改变'],
      ['撑竿跳高时，撑竿被压弯', 0, '撑竿的形状改变'],
    ], ['使物体发生形变', '改变物体的运动状态']);
  });

  /* ================= 力的三要素 ================= */
  PS.register('three-elements', function (el) {
    const VW = 1000, VH = 380;
    const st = { mode: 'size', F: 60, dir: 'press', grip: 2, turn: 0, turning: 0, t: 0, x: 0 };
    const seg = PS.ui.seg([{ value: 'size', label: '① 力的大小' }, { value: 'dir', label: '② 力的方向' }, { value: 'point', label: '③ 力的作用点' }], st.mode, (v) => { st.mode = v; ui(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(ctl, msg);
    const fS = PS.ui.slider({ label: '拉力 F', min: 0, max: 150, step: 10, value: st.F, unit: 'N', onInput: (v) => { st.F = v; tell(); } });
    fS.el.classList.add('wide');
    const kid = PS.ui.button('🧒 小孩拉（30 N）', () => fS.set(30), 'btn btn-sm');
    const man = PS.ui.button('🧔 大人拉（120 N）', () => fS.set(120), 'btn btn-sm');
    const dSeg = PS.ui.seg([{ value: 'press', label: '向下压' }, { value: 'pull', label: '向上拉' }], st.dir, (v) => { st.dir = v; tell(); });
    const gSeg = PS.ui.seg([{ value: 2, label: '手握在 A（末端）' }, { value: 1, label: '手握在 B（中间）' }, { value: 0, label: '手握在 C（靠近螺母）' }], st.grip, (v) => { st.grip = v; st.turn = 0; tell(); });
    const twist = PS.ui.button('💪 用 50 N 的力拧一下', () => { st.turning = 1; PS.sound.tick(); }, 'btn btn-primary btn-sm');
    function ui() {
      ctl.innerHTML = '';
      if (st.mode === 'size') ctl.append(fS.el, kid, man);
      else if (st.mode === 'dir') ctl.append(dSeg.el);
      else ctl.append(gSeg.el, twist);
      st.turn = 0; tell();
    }
    const R_GRIP = [0.07, 0.15, 0.25]; // 手到螺母中心的距离 m
    function tell() {
      if (st.mode === 'size') msg.innerHTML = '方向、作用点都相同，只改变拉力的大小：拉力 <b>' + st.F + ' N</b>，弹簧伸长 <b>' + PS.fmt(st.F / 20, 1) + ' cm</b>。<b>力越大，弹簧伸长得越多</b>——力的作用效果与力的<b>大小</b>有关。';
      else if (st.mode === 'dir') msg.innerHTML = '用同样大小的力（20 N）作用在弹簧的同一点：' + (st.dir === 'press' ? '<b>向下压</b>，弹簧<b>变短</b>' : '<b>向上拉</b>，弹簧<b>变长</b>') + '。力的方向不同，作用效果不同——力的作用效果与力的<b>方向</b>有关。（开门和关门、拧紧和拧松螺丝也是这样。）';
      else msg.innerHTML = '用同样大小、同样方向的力拧螺母，手握在 ' + 'CBA'[st.grip] + ' 处（离螺母 ' + Math.round(R_GRIP[st.grip] * 100) + ' cm）：' + ['很难拧动', '较容易拧动', '最容易拧动'][st.grip] + '。<b>手握得离螺母越远，越容易拧动</b>——力的作用效果与力的<b>作用点</b>有关。（推门时推离门轴远的地方更容易推开。）';
      S.render();
    }
    const loop = PS.loop((dt, t) => {
      st.t = t;
      const targetX = st.mode === 'size' ? st.F / 20 : st.dir === 'press' ? -4 : 4; // 伸长量 cm（劲度 20 N/cm）
      st.x += (targetX - st.x) * Math.min(1, dt * 6);
      if (st.turning > 0) {
        st.turn += dt * R_GRIP[st.grip] * 6;
        st.turning -= dt / 1.2;
        if (st.turning <= 0) { st.turning = 0; }
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'size') {
        // 墙 + 水平弹簧 + 刻度尺
        ctx.fillStyle = '#ced4da'; ctx.fillRect(60, 60, 40, 240);
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.2; for (let y = 64; y < 300; y += 14) { ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(48, y + 10); ctx.stroke(); }
        const PX = 30; // 每厘米像素
        const L0 = 260, x1 = 100, x2 = x1 + L0 + st.x * PX;
        const y = 170;
        FO.spring(ctx, x1, y, x2, y, { n: 14, r: 18, width: 3 });
        ctx.fillStyle = '#495057'; D.roundRect(ctx, x2, y - 30, 14, 60, 4); ctx.fill();
        // 刻度尺
        D.ruler(ctx, { x: x1 + L0, y: y + 70, len: 9, ppc: PX, div: 'cm', h: 30, padL: 8, padR: 26, unitLabel: false });
        D.text(ctx, '伸长量（cm）', x1 + L0 + 140, y + 128, { size: F(12), color: '#868e96', align: 'center' });
        ctx.strokeStyle = '#e8590c'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x2 + 7, y + 30); ctx.lineTo(x2 + 7, y + 72); ctx.stroke(); ctx.setLineDash([]);
        // 人
        const big = st.F >= 90;
        FO.person(ctx, x2 + 130 + (big ? 20 : 0), 330, { h: big ? 200 : 135, dir: -1, hand: { x: x2 + 10, y }, lean: -0.15, color: big ? '#2b8a3e' : '#f08c00', stride: 0.4 });
        if (st.F > 0) FO.arrow(ctx, x2 + 7, y - 44, 0, 20 + st.F * 0.9, { label: 'F = ' + st.F + ' N', F, labelSide: -1 });
      } else if (st.mode === 'dir') {
        const base = 320, L0 = 170;
        ctx.fillStyle = '#ced4da'; ctx.fillRect(380, base, 240, 18);
        const top = base - L0 - st.x * 10;
        FO.spring(ctx, 500, base, 500, top, { n: 10, r: 26, width: 3.2 });
        ctx.fillStyle = '#495057'; D.roundRect(ctx, 460, top - 12, 80, 14, 4); ctx.fill();
        ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(640, base - L0); ctx.lineTo(700, base - L0); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '原长', 706, base - L0 + 5, { size: F(13), color: '#868e96' });
        // 手
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
        if (st.dir === 'press') { D.roundRect(ctx, 470, top - 62, 60, 48, 16); ctx.fill(); ctx.stroke(); ctx.fillRect(486, top - 140, 28, 80); FO.arrow(ctx, 538, top - 6, Math.PI / 2, 90, { label: 'F = 20 N（向下）', F, labelSide: -1 }); }
        else { D.roundRect(ctx, 470, top - 50, 60, 40, 16); ctx.fill(); ctx.stroke(); ctx.fillRect(486, top - 140, 28, 92); FO.arrow(ctx, 538, top - 6, -Math.PI / 2, 90, { label: 'F = 20 N（向上）', F, labelSide: 1 }); }
        D.text(ctx, st.dir === 'press' ? '弹簧变短' : '弹簧变长', 300, base - 80, { size: F(20), weight: 800, color: st.dir === 'press' ? '#1c7ed6' : '#e8590c', align: 'center' });
      } else {
        // 扳手拧螺母（俯视）
        const cx = 260, cy = 200;
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 0, VW, VH);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-st.turn);
        ctx.fillStyle = '#868e96'; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 34, Math.sin(a) * 34); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
        // 扳手
        ctx.fillStyle = '#adb5bd'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
        D.roundRect(ctx, 30, -16, 620, 32, 14); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 50, 0.6, TAU - 0.6); ctx.arc(0, 0, 36, TAU - 0.6, 0.6, true); ctx.closePath(); ctx.fill(); ctx.stroke();
        ['C', 'B', 'A'].forEach((lb, i) => { const x = R_GRIP[i] * 2400; ctx.fillStyle = i === st.grip ? '#e8590c' : '#495057'; ctx.beginPath(); ctx.arc(x, 0, 7, 0, TAU); ctx.fill(); ctx.save(); ctx.rotate(st.turn); ctx.restore(); });
        ctx.restore();
        ['C', 'B', 'A'].forEach((lb, i) => {
          const r = R_GRIP[i] * 2400, a = -st.turn;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          D.text(ctx, lb, x, y + 40, { size: F(16), weight: 800, color: i === st.grip ? '#e8590c' : '#495057', align: 'center' });
          if (i === st.grip) {
            ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 26, 20, a, 0, TAU); ctx.fill(); ctx.stroke();
            FO.arrow(ctx, x, y, a - Math.PI / 2, 80, { label: 'F = 50 N', F });
          }
        });
        D.text(ctx, '俯视图', 20, 30, { size: F(13), color: '#868e96' });
        D.text(ctx, '螺母转过 ' + Math.round((st.turn * 180) / Math.PI) + '°', 820, 330, { size: F(18), weight: 800, color: '#3b5bdb', align: 'center' });
      }
    }
    seg.set(st.mode, true); dSeg.set(st.dir, true); gSeg.set(st.grip, true);
    ui();
    loop.start();
  });

  /* ================= 力的示意图作图 ================= */
  const FD_TASKS = [
    { q: '用 80 N 的力<b>水平向右</b>推箱子，画出推力的示意图。', F: 80, ang: 0, scene: 'pushBox', unit: 20 },
    { q: '用 50 N 的力拉箱子，拉力的方向与水平方向成 30° <b>斜向右上方</b>，作用点在 A 点。画出拉力的示意图。', F: 50, ang: -Math.PI / 6, scene: 'pullBox', unit: 10 },
    { q: '电灯静止地挂在天花板下，电线对电灯的拉力是 2 N，画出这个拉力的示意图。', F: 2, ang: -Math.PI / 2, scene: 'lamp', unit: 0.5 },
    { q: '手用 15 N 的力<b>竖直向下</b>压桌面上的书，画出手对书的压力的示意图。', F: 15, ang: Math.PI / 2, scene: 'book', unit: 5 },
    { q: '用 6 N 的力<b>沿斜面向上</b>拉木块（斜面倾角 30°），画出拉力的示意图。', F: 6, ang: -Math.PI / 6, scene: 'slope', unit: 2 },
    { q: '小明用 200 N 的力<b>水平向左</b>拉小车，画出拉力的示意图。', F: 200, ang: Math.PI, scene: 'cartL', unit: 50 },
  ];
  PS.register('force-diagram', function (el) {
    const VW = 1000, VH = 420, UNITPX = 50;
    const st = { k: 0, mode: 'sketch', p0: null, p1: null, res: null, ok: 0, tried: 0 };
    const mSeg = PS.ui.seg([{ value: 'sketch', label: '力的示意图' }, { value: 'scale', label: '力的图示（拓展）' }], st.mode, (v) => { st.mode = v; clear(); });
    const qBox = h('div', { class: 'fc-q', style: { marginTop: 0, marginBottom: '8px' } });
    el.append(PS.ui.row(mSeg.el), qBox);
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(PS.ui.button('清除重画', clear, 'btn btn-ghost btn-sm'), PS.ui.button('下一题 →', () => { st.k = (st.k + 1) % FD_TASKS.length; clear(); }, 'btn btn-primary btn-sm'), PS.ui.button('看答案', () => { st.res = { show: true }; tellAns(); S.render(); }, 'btn btn-ghost btn-sm')), msg);

    function geo(T) { // 每道题的受力物体区域、规定的作用点
      switch (T.scene) {
        case 'pushBox': return { rect: [380, 210, 160, 120], pt: null };
        case 'pullBox': return { rect: [380, 210, 160, 120], pt: [540, 236] };
        case 'lamp': return { rect: [460, 190, 80, 70], pt: [500, 190] };
        case 'book': return { rect: [400, 276, 200, 34], pt: null };
        case 'slope': return { poly: true, rect: [460, 200, 110, 70], pt: null };
        case 'cartL': return { rect: [420, 230, 180, 66], pt: [420, 262] };
      }
    }
    function clear() { st.p0 = st.p1 = null; st.res = null; ask(); S.render(); }
    function ask() {
      const T = FD_TASKS[st.k];
      qBox.innerHTML = '<b>第 ' + (st.k + 1) + ' / ' + FD_TASKS.length + ' 题</b>　' + T.q + (st.mode === 'scale' ? '<br><span class="small">力的图示：先选标度（图中“' + T.unit + ' N”的线段），线段的长度要按标度画出力的大小。</span>' : '');
      msg.className = 'fc-msg';
      msg.innerHTML = '从<b>作用点</b>按下，沿<b>力的方向</b>拖动，松开就画出一条带箭头的线段。';
    }
    function inBody(p) {
      const T = FD_TASKS[st.k], G = geo(T);
      if (T.scene === 'slope') { // 斜面上的木块：转到木块坐标
        const a = -Math.PI / 6, cx = 515, cy = 236;
        const dx = p.x - cx, dy = p.y - cy, u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
        return Math.abs(u) <= 62 && Math.abs(v) <= 40;
      }
      const [x, y, w, hh] = G.rect;
      return p.x >= x - 8 && p.x <= x + w + 8 && p.y >= y - 8 && p.y <= y + hh + 8;
    }
    PS.drag(S, { VW, VH, hit: () => 'pen',
      start: (o, p) => { st.p0 = p; st.p1 = p; st.res = null; },
      move: (o, p) => {
        let dx = p.x - st.p0.x, dy = p.y - st.p0.y;
        const a = Math.atan2(dy, dx), L = Math.hypot(dx, dy);
        const sn = Math.round(a / (Math.PI / 36)) * (Math.PI / 36); // 吸附到 5°
        st.p1 = { x: st.p0.x + Math.cos(sn) * L, y: st.p0.y + Math.sin(sn) * L };
        S.render();
      },
      end: () => { judge(); } });
    function judge() {
      const T = FD_TASKS[st.k], G = geo(T);
      const dx = st.p1.x - st.p0.x, dy = st.p1.y - st.p0.y, L = Math.hypot(dx, dy);
      if (L < 25) { st.p0 = st.p1 = null; S.render(); return; }
      const a = Math.atan2(dy, dx);
      let da = Math.abs(a - T.ang); da = Math.min(da, TAU - da);
      const okPt = G.pt ? Math.hypot(st.p0.x - G.pt[0], st.p0.y - G.pt[1]) < 22 : inBody(st.p0);
      const okDir = da < (8 * Math.PI) / 180;
      const need = (T.F / T.unit) * UNITPX;
      const okLen = st.mode === 'sketch' || Math.abs(L - need) / need < 0.12;
      st.res = { okPt, okDir, okLen, L, need };
      st.tried++;
      const all = okPt && okDir && okLen;
      if (all) { st.ok++; PS.sound.good(); } else PS.sound.bad();
      msg.className = 'fc-msg ' + (all ? 'ok' : 'bad');
      const it = [];
      it.push((okPt ? '✔' : '✘') + ' 作用点' + (okPt ? '画在受力物体上' : G.pt ? '应画在 A 点' : '应画在<b>受力物体</b>上'));
      it.push((okDir ? '✔' : '✘') + ' 方向' + (okDir ? '正确' : '不对（' + ['水平向右', '与水平成 30° 斜向右上', '竖直向上', '竖直向下', '沿斜面向上', '水平向左'][st.k] + '）'));
      if (st.mode === 'scale') it.push((okLen ? '✔' : '✘') + ' 长度' + (okLen ? '符合标度' : '：应为 ' + PS.fmt(T.F / T.unit, 0) + ' 个标度长，你画了约 ' + PS.fmt(L / UNITPX, 1) + ' 个'));
      it.push('✔ 已在箭头旁标出 F = ' + T.F + ' N');
      msg.innerHTML = it.join('　') + (all ? '<br>画对了！力的示意图要表示出力的<b>三要素</b>：线段的起点表示作用点，箭头表示方向，旁边标出力的大小。' : '<br>点“清除重画”再试一次，或点“看答案”。');
      S.render();
    }
    function tellAns() { msg.className = 'fc-msg info'; msg.innerHTML = '绿色虚线是参考答案：从作用点出发，沿力的方向画线段，末端画箭头，旁边标出 F = ' + FD_TASKS[st.k].F + ' N。'; }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const T = FD_TASKS[st.k], G = geo(T);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      // 方格纸
      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
      for (let x = 0; x < VW; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
      for (let y = 0; y < VH; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
      const GY = 330;
      if (T.scene === 'pushBox' || T.scene === 'pullBox') {
        FO.ground(ctx, 200, 820, GY);
        FO.box(ctx, 380, GY, 160, 120, {});
        if (T.scene === 'pullBox') { D.text(ctx, 'A', 552, 226, { size: F(16), weight: 800, color: '#1b2333' }); ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(540, 236, 4, 0, TAU); ctx.fill(); }
      } else if (T.scene === 'lamp') {
        ctx.fillStyle = '#ced4da'; ctx.fillRect(300, 20, 400, 16);
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.2; for (let x = 306; x < 700; x += 14) { ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x - 10, 10); ctx.stroke(); }
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(500, 36); ctx.lineTo(500, 190); ctx.stroke();
        ctx.fillStyle = '#495057'; D.roundRect(ctx, 488, 186, 24, 16, 3); ctx.fill();
        ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(500, 228, 30, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (T.scene === 'book') {
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(300, 310, 400, 20); ctx.fillStyle = '#a87b3c'; ctx.fillRect(320, 330, 18, 70); ctx.fillRect(662, 330, 18, 70);
        ctx.fillStyle = '#4dabf7'; ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2; ctx.fillRect(400, 276, 200, 34); ctx.strokeRect(400, 276, 200, 34);
        D.text(ctx, '物理', 500, 298, { size: F(15), weight: 800, color: '#fff', align: 'center' });
        ctx.fillStyle = 'rgba(255,192,120,.75)'; D.roundRect(ctx, 520, 200, 56, 44, 16); ctx.fill(); ctx.fillRect(534, 120, 28, 84);
      } else if (T.scene === 'slope') {
        ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(250, GY); ctx.lineTo(250 + 520, GY); ctx.lineTo(250 + 520, GY - 520 * Math.tan(Math.PI / 6)); ctx.closePath(); ctx.fill(); ctx.stroke();
        D.text(ctx, '30°', 330, GY - 14, { size: F(14), color: '#495057' });
        ctx.save(); ctx.translate(515, 236); ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = '#e9b872'; ctx.strokeStyle = '#8a5a1c'; ctx.fillRect(-55, -66 + 30, 110, 66); ctx.strokeRect(-55, -66 + 30, 110, 66);
        ctx.restore();
      } else if (T.scene === 'cartL') {
        FO.ground(ctx, 150, 850, GY);
        FO.cart(ctx, 420, GY, { w: 180, h: 44, color: '#74c0fc' });
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(420, 262); ctx.lineTo(300, 262); ctx.stroke();
        FO.person(ctx, 250, GY, { h: 160, dir: -1, hand: { x: 300, y: 262 }, lean: -0.3, stride: 0.45 });
      }
      // 标度
      if (st.mode === 'scale') {
        ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(40, 60); ctx.lineTo(40 + UNITPX, 60); ctx.moveTo(40, 54); ctx.lineTo(40, 66); ctx.moveTo(40 + UNITPX, 54); ctx.lineTo(40 + UNITPX, 66); ctx.stroke();
        D.text(ctx, T.unit + ' N', 40 + UNITPX / 2, 46, { size: F(15), weight: 700, align: 'center' });
        D.text(ctx, '标度', 40 + UNITPX / 2, 88, { size: F(12), color: '#868e96', align: 'center' });
      }
      // 参考答案
      if (st.res && (st.res.show || !(st.res.okPt && st.res.okDir && st.res.okLen))) {
        const p = G.pt || (T.scene === 'slope' ? [515, 236] : [G.rect[0] + G.rect[2] / 2, G.rect[1] + G.rect[3] / 2]);
        const L = st.mode === 'scale' ? (T.F / T.unit) * UNITPX : 130;
        if (st.res.show || !st.res.okPt || !st.res.okDir || !st.res.okLen) FO.arrow(ctx, p[0], p[1], T.ang, L, { color: '#2b8a3e', dash: [8, 6], alpha: 0.8, label: st.res.show ? 'F = ' + T.F + ' N' : '', F });
      }
      // 学生画的
      if (st.p0 && st.p1) {
        const L = Math.hypot(st.p1.x - st.p0.x, st.p1.y - st.p0.y);
        if (L > 4) {
          const ang = Math.atan2(st.p1.y - st.p0.y, st.p1.x - st.p0.x);
          const done = st.res && !st.res.show;
          FO.arrow(ctx, st.p0.x, st.p0.y, ang, L, { color: FC.F, label: done ? 'F = ' + T.F + ' N' : '', F });
          if (st.mode === 'scale') { // 每个标度画一个小刻度
            ctx.strokeStyle = FC.F; ctx.lineWidth = 2;
            for (let s = UNITPX; s < L - 6; s += UNITPX) { const x = st.p0.x + Math.cos(ang) * s, y = st.p0.y + Math.sin(ang) * s; ctx.beginPath(); ctx.moveTo(x - Math.sin(ang) * 7, y + Math.cos(ang) * 7); ctx.lineTo(x + Math.sin(ang) * 7, y - Math.cos(ang) * 7); ctx.stroke(); }
          }
          if (!done) D.text(ctx, Math.round((-ang * 180) / Math.PI) + '°', st.p1.x + 12, st.p1.y - 12, { size: F(13), color: '#868e96' });
        }
      }
      D.text(ctx, '已画对 ' + st.ok + ' 次 / 共画 ' + st.tried + ' 次', VW - 16, VH - 14, { size: F(12), color: '#868e96', align: 'right' });
    }
    mSeg.set(st.mode, true);
    clear();
  });

  /* ================= 力的作用是相互的 ================= */
  PS.register('mutual-force', function (el) {
    const VW = 1000, VH = 380;
    const st = { mode: 'carts', t: 0, run: false, x1: 0, x2: 0, v1: 0, v2: 0, m2: 1, attract: false, F: 0, pull: 0, hist: [], ph: 0, egg: 'stone', hit: 0, other: 'wall' };
    const seg = PS.ui.seg([{ value: 'carts', label: '磁体小车' }, { value: 'skate', label: '穿旱冰鞋推墙' }, { value: 'scales', label: '两个测力计对拉' }, { value: 'egg', label: '以卵击石' }], st.mode, (v) => { st.mode = v; ui(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(ctl, msg);
    const m2Seg = PS.ui.seg([{ value: 1, label: '右车与左车一样重' }, { value: 2, label: '右车加砝码（2 倍重）' }], 1, (v) => { st.m2 = v; reset(); });
    const poleSeg = PS.ui.seg([{ value: false, label: '同名磁极相对' }, { value: true, label: '异名磁极相对' }], false, (v) => { st.attract = v; reset(); });
    const otherSeg = PS.ui.seg([{ value: 'wall', label: '推墙' }, { value: 'friend', label: '推同伴（也穿旱冰鞋）' }], 'wall', (v) => { st.other = v; reset(); });
    const goB = PS.ui.button('▶ 松手', () => { if (st.mode === 'egg') { st.hit = 0; st.ph = 0; } st.run = true; st.ph = 0; PS.sound.tick(); }, 'btn btn-primary btn-sm');
    const eggSeg = PS.ui.seg([{ value: 'stone', label: '鸡蛋撞石头' }, { value: 'egg', label: '鸡蛋撞鸡蛋' }], 'stone', (v) => { st.egg = v; reset(); });
    function ui() {
      ctl.innerHTML = '';
      if (st.mode === 'carts') { ctl.append(goB, m2Seg.el, poleSeg.el); goB.innerHTML = '▶ 松手'; }
      else if (st.mode === 'skate') { ctl.append(goB, otherSeg.el); goB.innerHTML = '▶ 用力推'; }
      else if (st.mode === 'egg') { ctl.append(goB, eggSeg.el); goB.innerHTML = '▶ 撞过去'; }
      ctl.append(PS.ui.button('↺ 重置', reset, 'btn btn-ghost btn-sm'));
      reset();
    }
    function reset() {
      st.run = false; st.ph = 0; st.t = 0; st.hit = 0; st.hist = [];
      st.v1 = st.v2 = 0; st.F = 0;
      if (st.mode === 'carts') { st.x1 = 330; st.x2 = st.attract ? 560 : 520; }
      if (st.mode === 'skate') { st.x1 = 640; st.x2 = 760; }
      if (st.mode === 'scales') { st.pull = 0; }
      if (st.mode === 'egg') { st.x1 = 160; }
      tell();
      S.render();
    }
    function tell(done) {
      msg.className = 'fc-msg ' + (done ? 'ok' : 'info');
      if (st.mode === 'carts') msg.innerHTML = done
        ? '两辆小车' + (st.attract ? '相互<b>靠近</b>' : '向<b>相反方向</b>运动') + '：左车对右车有力，右车对左车<b>同时</b>也有力，两个力<b>大小相等、方向相反</b>。' + (st.m2 === 2 ? '右车更重，速度变化得慢一些，但两个力仍然一样大。' : '')
        : '两辆小车上各放一块磁体（' + (st.attract ? '异名磁极相对，相互吸引' : '同名磁极相对，相互排斥') + '）。点“松手”，看看哪辆车会动。';
      else if (st.mode === 'skate') msg.innerHTML = done
        ? (st.other === 'wall' ? '人推墙，墙没动，<b>人却向后退</b>——人对墙施力的同时，<b>墙也对人施加了向后的力</b>。' : '两个人都向后滑开：甲推乙的同时，乙也推甲。') + '力的作用是<b>相互的</b>：施力物体同时也是受力物体。'
        : '穿着旱冰鞋站在' + (st.other === 'wall' ? '墙' : '同伴') + '前，用力推一下。猜猜会发生什么？';
      else if (st.mode === 'scales') msg.innerHTML = '把两个弹簧测力计 A、B 的挂钩钩在一起，A 的拉环固定在墙上，<b>拖动 B 的拉环</b>向右拉。' + (st.F > 0.05 ? '两个测力计的示数<b>始终相等</b>：A 对 B 的拉力与 B 对 A 的拉力<b>大小相等、方向相反、作用在同一条直线上</b>，同时产生、同时变化、同时消失。' : '');
      else msg.innerHTML = done
        ? (st.egg === 'stone' ? '鸡蛋对石头的力与石头对鸡蛋的力<b>一样大</b>！鸡蛋碎了，只是因为鸡蛋壳<b>承受力的能力</b>比石头小得多。' : '两个鸡蛋相互作用的力大小相等，往往只有一个先破——取决于哪个蛋壳更薄、受力的部位更脆弱。') + '<br>一对相互作用的力：大小相等、方向相反、作用在同一条直线上，分别作用在<b>两个</b>物体上。'
        : '俗话说“以卵击石”。鸡蛋撞石头时，石头对鸡蛋的力大，还是鸡蛋对石头的力大？点“撞过去”看看。';
    }
    let dragging = false;
    PS.drag(S, { VW, VH, hit: (p) => (st.mode === 'scales' && Math.abs(p.x - ringX()) < 50 && Math.abs(p.y - 200) < 60 ? 'ring' : null),
      start: () => { dragging = true; }, move: (o, p) => { st.pull = PS.clamp(p.x - RING0, 0, 330); }, end: () => { dragging = false; } });
    const KS = 1 / 62; // 测力计：每拉开 62 px，两个弹簧都伸长 31 px，示数 1 N（L = 155 px 对应 5 N）
    const RING0 = 40 + 2 * (155 + 96);
    const ringX = () => RING0 + st.pull;

    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.mode === 'carts' && st.run) {
        const gap = st.x2 - st.x1 - 120;
        const Fm = 2.4 * Math.pow(40 / (Math.max(0, gap) + 40), 2); // N
        st.F = gap < 2 && st.attract ? 0 : Fm;
        const a = 70; // px/s² per N（甲车质量为 1 份）
        const f1 = st.attract ? st.F : -st.F, f2 = -f1; // 甲受的力：排斥向左，吸引向右；乙受的力与它相反
        st.v1 += f1 * a * dt - st.v1 * 0.25 * dt; // 小的滚动阻力
        st.v2 += ((f2 * a) / st.m2) * dt - st.v2 * 0.25 * dt;
        st.x1 += st.v1 * dt; st.x2 += st.v2 * dt;
        if (st.attract && st.x2 - st.x1 - 120 <= 0) { st.v1 = st.v2 = 0; st.x2 = st.x1 + 120; st.run = false; st.F = 0; PS.sound.clack(); tell(true); }
        if (!st.attract && (st.x1 < 80 || st.x2 > VW - 80 - 120 || (Math.abs(st.v1) < 2 && st.F < 0.02))) { st.run = false; tell(true); }
      }
      if (st.mode === 'skate' && st.run) {
        st.ph += dt;
        const push = st.ph < 0.45;
        const M1 = 50, M2 = st.other === 'wall' ? 1e9 : 40;
        st.F = push ? 120 * Math.sin((st.ph / 0.45) * Math.PI) : 0;
        st.v1 += (-st.F / M1) * 150 * dt; st.v2 += (st.F / M2) * 150 * dt;
        st.v1 *= 1 - 0.3 * dt; st.v2 *= 1 - 0.3 * dt;
        st.x1 += st.v1 * dt; st.x2 += st.v2 * dt;
        if (st.ph > 3.2 || st.x1 < 90) { st.run = false; tell(true); }
      }
      if (st.mode === 'scales') {
        st.F = st.pull * KS;
        st.hist.push(st.F); if (st.hist.length > 300) st.hist.shift();
        if (Math.floor(st.t * 4) !== Math.floor((st.t - dt) * 4)) tell();
      }
      if (st.mode === 'egg' && st.run) {
        st.ph += dt;
        if (!st.hit) { st.x1 += 420 * dt; if (st.x1 >= 560) { st.x1 = 560; st.hit = st.ph; PS.sound.clack(); } }
        else if (st.ph - st.hit > 2.2) { st.run = false; tell(true); }
      }
      S.render();
    }, el);

    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const GY = 300;
      if (st.mode === 'carts') {
        // 轨道
        ctx.fillStyle = '#dee2e6'; ctx.fillRect(40, GY, VW - 80, 10);
        FO.cart(ctx, st.x1, GY, { w: 120, h: 34, color: '#74c0fc', spin: st.x1 / 11, label: '甲' });
        FO.cart(ctx, st.x2, GY, { w: 120, h: 34, color: '#ffa8a8', spin: st.x2 / 11, label: '乙' });
        const ty = GY - 22 - 34 - 18;
        FO.magnet(ctx, st.x1 + 60, ty, 100, { t: 30, n: 1 });
        FO.magnet(ctx, st.x2 + 60, ty, 100, { t: 30, n: st.attract ? 1 : -1 });
        if (st.m2 === 2) FO.hookMass(ctx, st.x2 + 60, ty - 70, 1, { w: 34, h: 30, label: false });
        if (!st.run && st.v1 === 0 && st.v2 === 0 && st.F === 0) {
          ctx.fillStyle = 'rgba(255,192,120,.9)'; D.roundRect(ctx, st.x1 - 30, GY - 70, 36, 30, 10); ctx.fill(); D.roundRect(ctx, st.x2 + 114, GY - 70, 36, 30, 10); ctx.fill();
          D.text(ctx, '用手按住', st.x1 - 12, GY - 80, { size: F(12), color: '#868e96', align: 'center' }); D.text(ctx, '用手按住', st.x2 + 132, GY - 80, { size: F(12), color: '#868e96', align: 'center' });
        }
        if (st.F > 0.01) {
          const L = 30 + st.F * 40, ay = ty - 46;
          const d1 = st.attract ? 0 : Math.PI;
          FO.arrow(ctx, st.x1 + 60, ay, d1, L, { label: 'F乙对甲 = ' + PS.fmt(st.F, 2) + ' N', F, labelSide: d1 ? 1 : -1, color: FC.T });
          FO.arrow(ctx, st.x2 + 60, ay, d1 + Math.PI, L, { label: 'F甲对乙 = ' + PS.fmt(st.F, 2) + ' N', F, labelSide: d1 ? -1 : 1, color: FC.F });
        }
        D.text(ctx, '甲 ' + PS.fmt(Math.abs(st.v1) / 10, 1) + ' cm/s　　乙 ' + PS.fmt(Math.abs(st.v2) / 10, 1) + ' cm/s', VW / 2, GY + 50, { size: F(14), color: '#495057', align: 'center' });
      } else if (st.mode === 'skate') {
        FO.ground(ctx, 0, VW, GY);
        const pushing = st.run && st.ph < 0.45;
        const wallX = 830;
        if (st.other === 'wall') {
          ctx.fillStyle = '#ced4da'; ctx.fillRect(wallX, 40, 60, GY - 40);
          ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1; for (let y = 60; y < GY; y += 30) { ctx.beginPath(); ctx.moveTo(wallX, y); ctx.lineTo(wallX + 60, y); ctx.stroke(); }
        }
        const reach = pushing || (!st.run && st.ph === 0);
        const handX = st.other === 'wall' ? wallX : st.x2 - 20;
        const x1 = st.x1;
        // 推的人
        const hand = reach ? { x: Math.min(handX, x1 + 110), y: GY - 110 } : { x: x1 + 40, y: GY - 80 };
        FO.person(ctx, x1, GY - 14, { h: 170, hand, lean: reach ? 0.2 : 0, stride: 0.2 });
        drawSkate(ctx, x1, GY);
        if (st.other === 'friend') { FO.person(ctx, st.x2 + 40, GY - 14, { h: 160, dir: -1, hand: { x: st.x2 - 20, y: GY - 108 }, color: '#e8590c', stride: 0.2 }); drawSkate(ctx, st.x2 + 40, GY); }
        if (pushing) {
          const L = 40 + st.F * 0.6;
          FO.arrow(ctx, handX, GY - 110, 0, L, { label: st.other === 'wall' ? '人对墙的力' : '甲对乙的力', F, color: FC.F, labelSide: -1 });
          FO.arrow(ctx, Math.min(handX, x1 + 110) - 4, GY - 128, Math.PI, L, { label: st.other === 'wall' ? '墙对人的力' : '乙对甲的力', F, color: FC.T, labelSide: 1 });
        }
        D.text(ctx, st.other === 'wall' ? '墙' : '', wallX + 30, 30, { size: F(14), weight: 700, color: '#495057', align: 'center' });
      } else if (st.mode === 'scales') {
        ctx.fillStyle = '#ced4da'; ctx.fillRect(10, 120, 24, 160);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(34, 200); ctx.lineTo(40, 200); ctx.stroke();
        // A：拉环在左，挂钩朝右
        const ext = st.F; // N
        ctx.save(); ctx.translate(40 + 13, 200); ctx.rotate(-Math.PI / 2);
        const gA = FO.scale(ctx, { x: 0, y: 0, F: ext, max: 5, div: 0.2, L: 155, w: 62, F2: F, fs: F(11) });
        ctx.restore();
        void gA;
        // B：挂钩在左，拉环在右
        ctx.save(); ctx.translate(ringX() - 13, 200); ctx.rotate(Math.PI / 2);
        FO.scale(ctx, { x: 0, y: 0, F: ext, max: 5, div: 0.2, L: 155, w: 62, F2: F, fs: F(11) });
        ctx.restore();
        // 手
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
        D.roundRect(ctx, ringX() + 10, 182, 46, 36, 12); ctx.fill(); ctx.stroke();
        if (!dragging && st.pull < 2) D.text(ctx, '← 拖动拉环 →', ringX() + 30, 250, { size: F(13), weight: 700, color: '#e8590c', align: 'center' });
        D.text(ctx, 'A', 120, 150, { size: F(18), weight: 800, color: FC.T, align: 'center' });
        D.text(ctx, 'B', ringX() - 120, 150, { size: F(18), weight: 800, color: FC.F, align: 'center' });
        // 示数
        D.text(ctx, 'A 的示数：' + FO.fmtN(st.F) + ' N', 200, 330, { size: F(18), weight: 800, color: FC.T, align: 'center' });
        D.text(ctx, 'B 的示数：' + FO.fmtN(st.F) + ' N', 520, 330, { size: F(18), weight: 800, color: FC.F, align: 'center' });
        // 小图像
        const gx = 700, gy = 24, gw = 280, gh = 100;
        ctx.fillStyle = '#0d1626'; D.roundRect(ctx, gx, gy, gw, gh, 8); ctx.fill();
        D.text(ctx, '两个示数随时间变化', gx + 10, gy + 18, { size: F(11), color: '#ced4da' });
        const plot = (c, dash, off) => { ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.setLineDash(dash); ctx.beginPath(); st.hist.forEach((v, i) => { const x = gx + 8 + (i / 300) * (gw - 16), y = gy + gh - 8 - (v / 5.5) * (gh - 30) + off; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); };
        plot('#74c0fc', [], 0); plot('#ffa94d', [6, 5], 0);
      } else if (st.mode === 'egg') {
        ctx.fillStyle = '#f1f3f5'; ctx.fillRect(0, GY, VW, 80);
        const ex = st.x1, hit = st.hit, since = hit ? st.ph - hit : 0;
        // 石头 / 鸡蛋
        if (st.egg === 'stone') {
          ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(620, GY); ctx.lineTo(610, GY - 70); ctx.lineTo(650, GY - 120); ctx.lineTo(730, GY - 110); ctx.lineTo(780, GY - 60); ctx.lineTo(770, GY); ctx.closePath(); ctx.fill(); ctx.stroke();
          D.text(ctx, '石头', 700, GY - 50, { size: F(15), weight: 800, color: '#fff', align: 'center' });
        } else egg(ctx, 652, GY - 46, false, 0);
        const broken = hit && since > 0.12 && st.egg === 'stone';
        egg(ctx, ex, GY - 46, broken, since);
        if (hit && since < 1.6) {
          const a = Math.min(1, since * 5);
          FO.arrow(ctx, 610, GY - 46, Math.PI, 110 * a, { label: '石头对鸡蛋的力', F, color: FC.T, labelSide: -1 });
          FO.arrow(ctx, 610, GY - 70, 0, 110 * a, { label: '鸡蛋对石头的力', F, color: FC.F, labelSide: -1 });
          if (st.egg === 'egg') { void 0; }
          D.text(ctx, '两个力一样大！', 610, 70, { size: F(20), weight: 900, color: '#e8590c', align: 'center' });
        }
      }
    }
    function drawSkate(ctx, x, GY) {
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, x - 40, GY - 18, 70, 8, 3); ctx.fill();
      [x - 30, x - 8, x + 14].forEach((wx) => { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(wx, GY - 6, 6, 0, TAU); ctx.fill(); });
    }
    function egg(ctx, x, y, broken, since) {
      ctx.save();
      if (!broken) {
        ctx.fillStyle = '#fff4e6'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y, 38, 46, Math.PI / 2, 0, TAU); ctx.fill(); ctx.stroke();
      } else {
        const s = Math.min(1, since * 3);
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.ellipse(x - 10, y + 36, 40 + s * 30, 10, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff4e6'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
        [[-40, 10, -0.6], [-10, 30, 0.3], [20, 20, 1.2], [-60, 34, -1]].forEach(([dx, dy, r]) => { ctx.save(); ctx.translate(x + dx * s, y + dy * s); ctx.rotate(r); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-6, -12); ctx.lineTo(4, -4); ctx.lineTo(12, -14); ctx.lineTo(16, 4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
      }
      ctx.restore();
    }
    seg.set(st.mode, true);
    ui();
    loop.start();
  });
})();
