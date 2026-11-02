/* 第7章第3节：重力——假如没有重力、探究重力与质量的关系、不同星球上的重力、G = mg 计算练习、重力的方向、重心、重力的由来。依赖 force.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC;
  const TAU = Math.PI * 2;

  /* 星空：伪随机分布的星星（避免排成直线） */
  function stars(ctx, W, H, n) {
    for (let i = 0; i < n; i++) {
      const fx = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1, fy = Math.abs(Math.sin(i * 78.233) * 12543.917) % 1;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * ((i * 7) % 5) / 5) + ')'; ctx.fillRect(fx * W, fy * H, 2, 2);
    }
  }

  /* 不同地点的 g（N/kg） */
  PS.G_PLACES = [
    { k: 'eq', n: '地球·赤道', g: 9.78, c: '#4dabf7' },
    { k: 'bj', n: '地球·北京', g: 9.80, c: '#4dabf7' },
    { k: 'np', n: '地球·北极', g: 9.83, c: '#4dabf7' },
    { k: 'moon', n: '月球', g: 1.62, c: '#adb5bd' },
    { k: 'mars', n: '火星', g: 3.71, c: '#e8590c' },
    { k: 'jup', n: '木星', g: 24.8, c: '#d9a066' },
  ];

  /* ================= 假如没有重力 ================= */
  PS.register('no-gravity', function (el) {
    const VW = 1000, VH = 380, GY = 320, G = 320;
    const st = { on: true, ps: [], t: 0, next: { apple: 0.5, ball: 1.2, water: 0, rain: 0 }, person: { y: 0, v: 0 } };
    const seg = PS.ui.seg([{ value: true, label: '🌍 有重力' }, { value: false, label: '🎈 假如没有重力' }], true, (v) => { st.on = v; tell(); if (v) st.person.v = 0; });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(PS.ui.button('🏃 让小明跳一下', () => { if (st.person.y === 0) st.person.v = -260; }, 'btn btn-sm'), PS.ui.button('↺ 重来', () => { st.ps = []; st.person = { y: 0, v: 0 }; }, 'btn btn-ghost btn-sm')), msg);
    function tell() {
      msg.className = 'fc-msg ' + (st.on ? 'info' : 'bad');
      msg.innerHTML = st.on ? '苹果熟了落向地面，水从高处往低处流，抛出的球最终落回地面，雨点纷纷下落，人跳起后又落回地面——它们都受到<b>重力</b>的作用，施力物体是<b>地球</b>。' : '假如没有重力：苹果不会落下，水不会往低处流，抛出的球一去不回，雨点飘在空中，人轻轻一跳就飞走了……地球附近的<b>所有物体都受到重力</b>，我们的生活离不开它。';
    }
    function spawn(type) {
      if (type === 'apple') st.ps.push({ type, x: 160 + Math.random() * 120, y: 150 + Math.random() * 40, vx: 0, vy: 0, stuck: true, life: 0 });
      if (type === 'ball') st.ps.push({ type, x: 640, y: GY - 120, vx: 170, vy: -240, life: 0 });
      if (type === 'water') st.ps.push({ type, x: 432 + Math.random() * 6, y: 140, vx: 40 + Math.random() * 20, vy: 0, life: 0 });
      if (type === 'rain') st.ps.push({ type, x: 720 + Math.random() * 240, y: 50, vx: 0, vy: 160, life: 0 });
    }
    const loop = PS.loop((dt, t) => {
      st.t = t;
      const g = st.on ? G : 0;
      ['apple', 'ball', 'water', 'rain'].forEach((k) => { st.next[k] -= dt; if (st.next[k] <= 0) { spawn(k); st.next[k] = { apple: 1.6, ball: 2.6, water: 0.05, rain: 0.08 }[k]; } });
      st.ps.forEach((p) => {
        p.life += dt;
        if (p.type === 'apple' && p.stuck) { if (p.life > 0.6) p.stuck = false; else return; }
        if (!st.on && p.type === 'apple' && p.vy === 0 && p.vx === 0) { p.vx = (Math.random() - 0.5) * 12; p.vy = -6 - Math.random() * 10; }
        if (!st.on && p.type === 'rain' && p.vy > 30) { p.vy = 10 + Math.random() * 10; p.vx = (Math.random() - 0.5) * 20; }
        p.vy += g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.type === 'water' && st.on && p.y > 250 && p.x < 520) { p.y = 250; p.vy = 0; p.vx = 120; }
        if (p.y >= GY - 6 && st.on) { p.y = GY - 6; if (p.type === 'ball') { p.vy *= -0.4; p.vx *= 0.7; if (Math.abs(p.vy) < 30) { p.vy = 0; } } else { p.vy = 0; p.vx *= 0.9; } }
      });
      st.ps = st.ps.filter((p) => p.life < (p.type === 'water' ? 6 : p.type === 'rain' ? 4 : 9) && p.x > -40 && p.x < VW + 40 && p.y > -60);
      if (st.ps.length > 400) st.ps.splice(0, st.ps.length - 400);
      // 小明跳起
      const P = st.person;
      if (P.v !== 0 || P.y < 0) { P.v += g * dt; P.y += P.v * dt; if (P.y >= 0 && st.on) { P.y = 0; P.v = 0; } }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const sky = ctx.createLinearGradient(0, 0, 0, GY);
      sky.addColorStop(0, st.on ? '#d0ebff' : '#e5dbff'); sky.addColorStop(1, '#f8f9fa');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
      // 地面与山崖
      ctx.fillStyle = '#8ce99a'; ctx.fillRect(0, GY, VW, VH - GY);
      ctx.fillStyle = '#b08968'; ctx.beginPath(); ctx.moveTo(380, GY); ctx.lineTo(380, 140); ctx.lineTo(440, 140); ctx.lineTo(440, 250); ctx.lineTo(530, 250); ctx.lineTo(530, GY); ctx.fill();
      ctx.fillStyle = '#74c0fc'; ctx.fillRect(530, GY - 10, 90, 10);
      // 树
      ctx.fillStyle = '#a0522d'; ctx.fillRect(208, 170, 24, GY - 170);
      ctx.fillStyle = '#51cf66'; [[220, 140, 70], [170, 165, 45], [270, 165, 45]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
      // 云
      ctx.fillStyle = '#adb5bd'; [[780, 40, 34], [830, 30, 40], [890, 42, 32], [930, 38, 26]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); });
      // 粒子
      st.ps.forEach((p) => {
        if (p.type === 'apple') { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.fill(); }
        else if (p.type === 'ball') { ctx.fillStyle = '#f08c00'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, TAU); ctx.fill(); }
        else if (p.type === 'water') { ctx.fillStyle = 'rgba(28,126,214,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - Math.max(6, p.vy * 0.04)); ctx.stroke(); }
      });
      // 抛球的人 + 跳的小明
      FO.person(ctx, 600, GY, { h: 110, hand: { x: 640, y: GY - 100 }, color: '#f08c00' });
      FO.person(ctx, 880, GY + st.person.y, { h: 110, color: '#3b5bdb', dir: -1 });
      D.text(ctx, '小明', 880, GY + st.person.y - 122, { size: F(12), weight: 700, color: '#3b5bdb', align: 'center' });
      if (!st.on) D.text(ctx, '没有重力的世界（想象）', VW / 2, 30, { size: F(18), weight: 800, color: '#7048e8', align: 'center' });
    }
    tell();
    loop.start();
  });

  /* ================= 探究重力的大小跟质量的关系 ================= */
  PS.register('gm-lab', function (el, opts) {
    const lab = !!opts.lab;
    const VW = 1000, VH = 520, G = 9.8, MAXN = 6;
    const st = { n: 0, Fv: 0, rows: [], meter: 'spring' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const mSeg = PS.ui.seg([{ value: 'spring', label: '弹簧测力计（分度值 0.1 N）' }, { value: 'digital', label: '数显测力计（精确到 0.01 N）' }], st.meter, (v) => { st.meter = v; st.rows = []; table(); upd(); });
    const msg = h('div', { class: 'fc-msg' });
    el.insertBefore(PS.ui.row(mSeg.el), el.firstChild);
    el.append(PS.ui.row(PS.ui.button('＋ 挂一个钩码', () => { if (st.n < MAXN) { st.n++; PS.sound.tick(); upd(); } }, 'btn btn-primary btn-sm'), PS.ui.button('－ 取下一个', () => { if (st.n > 0) { st.n--; PS.sound.tick(); upd(); } }, 'btn btn-sm'), PS.ui.button('📝 记录', record, 'btn btn-green btn-sm'), PS.ui.button('清空记录', () => { st.rows = []; table(); S.render(); }, 'btn btn-ghost btn-sm')), msg);
    const thead = h('tr'), tbody = h('tbody'), ana = h('div', { class: 'small' });
    el.append(h('div', { class: 'grid-2', style: { marginTop: '10px', alignItems: 'start' } },
      h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, thead), tbody)),
      h('div', { class: 'panel' }, h('h4', null, lab ? '分析论证' : '你发现了什么？'), ana)));
    thead.append(h('th', null, '次数'), h('th', null, '质量 m/kg'), h('th', null, '重力 G/N'), h('th', { html: '<span class="frac"><span>G</span><span>m</span></span>/(N·kg⁻¹)' }));
    const reading = () => { const g = st.n * 0.05 * G; return st.meter === 'spring' ? PS.round(g, 1) : PS.round(g, 2); };
    function upd() {
      const m = st.n * 0.05;
      msg.className = 'fc-msg';
      msg.innerHTML = st.n ? '挂了 <b>' + st.n + '</b> 个钩码，质量 m = ' + st.n + ' × 50 g = <b>' + PS.fmt(m, 2) + ' kg</b>。钩码静止时，测力计的示数等于钩码所受的重力：G = <b>' + PS.fmt(reading(), st.meter === 'spring' ? 1 : 2) + ' N</b>。' : '每个钩码的质量是 50 g。把钩码挂在测力计上，<b>钩码静止时</b>，测力计的示数等于钩码所受重力的大小。';
      S.render();
    }
    function record() {
      if (!st.n) { msg.className = 'fc-msg bad'; msg.innerHTML = '先挂上钩码。'; return; }
      if (st.rows.some((r) => r.n === st.n)) { msg.className = 'fc-msg'; msg.innerHTML = st.n + ' 个钩码的数据已经记录过了。'; return; }
      st.rows.push({ n: st.n, m: PS.round(st.n * 0.05, 2), G: reading() });
      st.rows.sort((a, b) => a.n - b.n);
      PS.sound.good(); table(); S.render();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, String(i + 1)), h('td', null, PS.fmt(r.m, 2)), h('td', null, PS.fmt(r.G, st.meter === 'spring' ? 1 : 2)), h('td', null, h('b', null, PS.fmt(r.G / r.m, 1))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      let s;
      if (st.rows.length < 3) s = '逐次增挂钩码，记下质量 m 和重力 G，算出 G 与 m 的比值。至少测 3 组，再看右边的 G–m 图像。';
      else {
        const avg = st.rows.reduce((a, r) => a + r.G / r.m, 0) / st.rows.length;
        s = 'G–m 图像是一条<b>过原点的直线</b>；G/m 的值' + (st.meter === 'spring' ? '平均约 ' + PS.fmt(avg, 1) + ' N/kg。弹簧测力计只能读到 0.1 N，算出的比值有误差；换用<b>数显测力计</b>再测一次，看看比值是多少' : '都是 <b>9.8 N/kg</b>') + '。';
        s += '<div class="tip tip-good" style="margin:8px 0 0">结论：物体所受的重力跟它的质量<b>成正比</b>，比值约为 <b>9.8 N/kg</b>，用 g 表示：<b>G = mg</b>。g = 9.8 N/kg 表示：质量为 1 kg 的物体受到的重力是 9.8 N。</div>';
      }
      ana.innerHTML = s;
    }
    const loop = PS.loop((dt) => { st.Fv += (st.n * 0.05 * G - st.Fv) * Math.min(1, dt * 6); S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#495057'; ctx.fillRect(40, 16, 12, VH - 34); ctx.fillRect(20, VH - 26, 120, 14); ctx.fillRect(40, 16, 240, 10);
      const cx = 200;
      if (st.meter === 'spring') {
        const g = FO.scale(ctx, { x: cx, y: 44, F: st.Fv, max: 5, div: 0.1, L: 210, F2: F, fs: F(13), w: 66 });
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 26); ctx.lineTo(cx, 31); ctx.stroke();
        FO.hookMass(ctx, g.hook.x + 7, g.hook.y - 2, st.n, { w: 26, h: 18, fs: 8 });
        FO.scaleZoom(ctx, st.Fv, { x: 290, y: 60, w: 180, h: 220, max: 5, div: 0.1, F2: F, span: 0.45 });
      } else {
        // 数显测力计
        ctx.fillStyle = '#343a40'; D.roundRect(ctx, cx - 60, 40, 120, 170, 14); ctx.fill();
        ctx.fillStyle = '#c3fae8'; D.roundRect(ctx, cx - 46, 62, 92, 50, 6); ctx.fill();
        ctx.fillStyle = '#0b3d2e'; ctx.font = PS.font(F(26), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PS.fmt(st.Fv, 2), cx - 6, 88);
        ctx.font = PS.font(F(13), 700); ctx.fillText('N', cx + 36, 96);
        D.text(ctx, '数显测力计', cx, 150, { size: F(13), weight: 700, color: '#ced4da', align: 'center' });
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, 26); ctx.lineTo(cx, 40); ctx.moveTo(cx, 210); ctx.lineTo(cx, 236); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 7, 236, 7, 0, Math.PI * 0.95); ctx.stroke();
        FO.hookMass(ctx, cx, 238, st.n, { w: 26, h: 18, fs: 8 });
      }
      // G–m 图像
      const gx0 = 560, gx1 = 960, gy0 = 470, gy1 = 50, MM = 0.35, GM = 3.5;
      const X = (m) => gx0 + (m / MM) * (gx1 - gx0), Y = (g) => gy0 - (g / GM) * (gy0 - gy1);
      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
      for (let m = 0.05; m <= MM + 1e-9; m += 0.05) { ctx.beginPath(); ctx.moveTo(X(m), gy0); ctx.lineTo(X(m), gy1); ctx.stroke(); }
      for (let g = 0.5; g <= GM + 1e-9; g += 0.5) { ctx.beginPath(); ctx.moveTo(gx0, Y(g)); ctx.lineTo(gx1, Y(g)); ctx.stroke(); }
      D.arrow(ctx, gx0, gy0, gx1 + 16, gy0, { color: '#495057', width: 1.6, head: 8 }); D.arrow(ctx, gx0, gy0, gx0, gy1 - 16, { color: '#495057', width: 1.6, head: 8 });
      D.text(ctx, 'm/kg', gx1 + 4, gy0 + 22, { size: F(13), weight: 700 }); D.text(ctx, 'G/N', gx0 + 8, gy1 - 18, { size: F(13), weight: 700 });
      for (let m = 0.1; m <= MM + 1e-9; m += 0.1) D.text(ctx, PS.fmt(m, 1), X(m), gy0 + 18, { size: F(12), align: 'center', color: '#495057' });
      for (let g = 1; g <= GM; g += 1) D.text(ctx, String(g), gx0 - 8, Y(g) + 4, { size: F(12), align: 'right', color: '#495057' });
      D.text(ctx, '0', gx0 - 8, gy0 + 16, { size: F(12), align: 'right', color: '#495057' });
      if (st.rows.length >= 2) { ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0.33), Y(0.33 * G)); ctx.stroke(); }
      st.rows.forEach((r) => { ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.arc(X(r.m), Y(r.G), 6, 0, TAU); ctx.fill(); });
      D.text(ctx, 'G–m 图像', (gx0 + gx1) / 2, 30, { size: F(15), weight: 800, color: '#7048e8', align: 'center' });
    }
    table(); upd();
    loop.start();
  });

  /* ================= 不同星球上的质量和重力 ================= */
  PS.register('planet-weight', function (el) {
    const VW = 1000, VH = 420;
    const st = { p: 1, m: 1, jump: 0, jv: 0, jt: 0 };
    const pSeg = PS.ui.seg(PS.G_PLACES.map((p, i) => ({ value: i, label: p.n })), st.p, (v) => { st.p = v; upd(); });
    pSeg.el.style.flexWrap = 'wrap';
    const mSeg = PS.ui.seg([{ value: 1, label: '1 kg 铁块' }, { value: 2, label: '2 kg 西瓜' }, { value: 5, label: '5 kg 大米' }], st.m, (v) => { st.m = v; upd(); });
    el.append(PS.ui.row(pSeg.el), PS.ui.row(mSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ro = [PS.ui.readout('g', '', 'primary'), PS.ui.readout('质量 m（天平）', '', 'green'), PS.ui.readout('重力 G = mg（测力计）', '', 'accent')];
    const msg = h('div', { class: 'fc-msg' });
    el.append(h('div', { class: 'readouts' }, ro.map((r) => r.el)), PS.ui.row(PS.ui.button('🧑‍🚀 跳一下（起跳速度相同）', () => { if (st.jump <= 0) { st.jv = 3.0; st.jump = 0.0001; } }, 'btn btn-sm')), msg);
    function upd() {
      const P = PS.G_PLACES[st.p], G = st.m * P.g;
      ro[0].set(P.g + ' N/kg'); ro[1].set(st.m + ' kg'); ro[2].set(PS.fmt(G, 1) + ' N');
      msg.className = 'fc-msg info';
      msg.innerHTML = '在<b>' + P.n + '</b>上：天平仍然平衡，物体的<b>质量还是 ' + st.m + ' kg</b>——质量是物体的属性，不随位置改变；测力计的示数变成 <b>' + PS.fmt(G, 1) + ' N</b>——<b>重力随 g 改变</b>。' + (P.k === 'moon' ? '月球上 g 约为地球上的 1/6，所以物体在月球上受到的重力约为地球上的 1/6。' : P.k === 'np' || P.k === 'eq' ? '地球上纬度越高，g 越大：赤道最小，两极最大（差别很小）。' : '');
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.jump > 0) { const g = PS.G_PLACES[st.p].g; st.jt += dt; st.jump += st.jv * dt; st.jv -= g * dt * 0.9; if (st.jump <= 0) { st.jump = 0; st.jv = 0; st.jt = 0; } }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const P = PS.G_PLACES[st.p];
      const space = P.k === 'moon' || P.k === 'mars' || P.k === 'jup';
      ctx.fillStyle = space ? '#0b1220' : '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
      if (space) stars(ctx, VW, 300, 60);
      const GY = 340;
      ctx.fillStyle = { moon: '#ced4da', mars: '#d9480f', jup: '#e0b47c' }[P.k] || '#8ce99a'; ctx.fillRect(0, GY, VW, VH - GY);
      const txt = space ? '#fff' : '#1b2333';
      D.text(ctx, P.n + '：g = ' + P.g + ' N/kg', 20, 34, { size: F(18), weight: 800, color: txt });
      // 天平（等臂）
      const bx = 180, by = 220;
      ctx.fillStyle = '#868e96'; ctx.fillRect(bx - 8, by, 16, GY - by); ctx.fillRect(bx - 60, GY - 12, 120, 12);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx - 130, by); ctx.lineTo(bx + 130, by); ctx.stroke();
      [[-1, '#5f6773'], [1, '#c9a227']].forEach(([s]) => { ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + s * 120, by); ctx.lineTo(bx + s * 120, by + 50); ctx.stroke(); ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.ellipse(bx + s * 120, by + 52, 48, 8, 0, 0, TAU); ctx.fill(); });
      ctx.fillStyle = '#5f6773'; ctx.fillRect(bx - 150, by + 20, 60, 30);
      D.text(ctx, st.m + ' kg', bx - 120, by + 40, { size: F(12), weight: 800, color: '#fff', align: 'center' });
      ctx.fillStyle = '#c9a227'; ctx.fillRect(bx + 100, by + 18, 40, 32);
      D.text(ctx, '砝码 ' + st.m + ' kg', bx + 120, by + 12, { size: F(12), weight: 700, color: txt, align: 'center' });
      D.text(ctx, '天平：仍然平衡', bx, by - 26, { size: F(15), weight: 800, color: '#2b8a3e', align: 'center', bg: 'rgba(255,255,255,.85)' });
      // 测力计（数字表盘）
      const sx = 470, G = st.m * P.g;
      ctx.fillStyle = '#495057'; ctx.fillRect(sx - 80, 70, 160, 10);
      ctx.fillStyle = '#343a40'; D.roundRect(ctx, sx - 45, 90, 90, 120, 12); ctx.fill();
      ctx.fillStyle = '#c3fae8'; D.roundRect(ctx, sx - 36, 106, 72, 40, 6); ctx.fill();
      ctx.fillStyle = '#0b3d2e'; ctx.font = PS.font(F(20), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PS.fmt(G, 1), sx, 127);
      D.text(ctx, '测力计 / N', sx, 180, { size: F(12), color: '#ced4da', align: 'center' });
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, 210); ctx.lineTo(sx, 240); ctx.stroke();
      ctx.fillStyle = '#5f6773'; ctx.fillRect(sx - 30, 240, 60, 34);
      D.text(ctx, st.m + ' kg', sx, 262, { size: F(12), weight: 800, color: '#fff', align: 'center' });
      FO.arrow(ctx, sx, 274, Math.PI / 2, 10 + G * 2.4, { color: FC.G, label: 'G = ' + PS.fmt(G, 1) + ' N', F, labelSide: -1 });
      // 跳高
      const jx = 800, H = 200;
      const scaleY = 70; // 每米像素
      const y = GY - st.jump * scaleY;
      FO.person(ctx, jx, Math.min(GY, y), { h: 120, color: '#7048e8', hand: { x: jx + 30, y: Math.min(GY, y) - 120 }, hand2: { x: jx - 30, y: Math.min(GY, y) - 120 } });
      const maxH = (3.0 * 3.0) / (2 * P.g * 0.9);
      ctx.strokeStyle = 'rgba(240,140,0,.8)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(jx - 70, GY - Math.min(maxH * scaleY, 300)); ctx.lineTo(jx + 70, GY - Math.min(maxH * scaleY, 300)); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '能跳起约 ' + PS.fmt(maxH, 2) + ' m' + (maxH * scaleY > 300 ? '（画不下了）' : ''), jx, Math.max(20, GY - Math.min(maxH * scaleY, 300) - 10), { size: F(13), weight: 700, color: '#f08c00', align: 'center', bg: 'rgba(255,255,255,.85)' });
      void H;
    }
    pSeg.set(st.p, true); mSeg.set(st.m, true);
    upd();
    loop.start();
  });

  /* ================= G = mg 计算随机练习 ================= */
  PS.register('g-quiz', function (el) {
    const box = h('div', { class: 'fc-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span');
    const fb = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'fc-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const R = PS.randInt, pick = PS.pick;
    const GEN = [
      () => { const m = pick([0.2, 0.5, 1.5, 2, 2.5, 4, 12, 50]), g = pick([10, 9.8]); return { q: '一个物体的质量是 ' + m + ' kg，它受到的重力是多少？（g 取 ' + g + ' N/kg）', a: m * g, u: 'N', sol: 'G = mg = ' + m + ' kg × ' + g + ' N/kg = ' + PS.round(m * g, 2) + ' N' }; },
      () => { const mg = pick([50, 200, 250, 300, 600, 800]); return { q: '一个苹果（或一袋食品）的质量是 ' + mg + ' g，它受到的重力是多少？（g 取 10 N/kg）', a: (mg / 1000) * 10, u: 'N', sol: '先换单位：m = ' + mg + ' g = ' + mg / 1000 + ' kg；G = mg = ' + mg / 1000 + ' kg × 10 N/kg = ' + PS.round((mg / 1000) * 10, 2) + ' N' }; },
      () => { const G = pick([450, 500, 600, 19.6, 49, 4.9]), g = G % 9.8 === 0 || [19.6, 49, 4.9].includes(G) ? 9.8 : 10; return { q: '一个物体受到的重力是 ' + G + ' N，它的质量是多少？（g 取 ' + g + ' N/kg）', a: G / g, u: 'kg', sol: 'm = G/g = ' + G + ' N ÷ ' + g + ' N/kg = ' + PS.round(G / g, 2) + ' kg' }; },
      () => { const m = pick([6, 12, 30, 60, 90]); const which = R(0, 1); return which ? { q: '月球对物体的引力约为地球的 1/6。质量为 ' + m + ' kg 的物体，在月球上受到的重力约是多少？（g 取 10 N/kg）', a: (m * 10) / 6, u: 'N', sol: '地球上 G = mg = ' + m * 10 + ' N；月球上 G月 = G/6 = ' + PS.round((m * 10) / 6, 2) + ' N' } : { q: '质量为 ' + m + ' kg 的物体被带到月球上，它的质量是多少？', a: m, u: 'kg', sol: '质量不随位置改变，仍是 ' + m + ' kg（重力才会变为地球上的 1/6）' }; },
      () => { const max = pick([5, 10]), m = pick([0.3, 0.45, 0.6, 0.8, 1.2]); const G = m * 10; return { q: '用量程为 0~' + max + ' N 的弹簧测力计，最多能测质量为多少 kg 的物体的重力？（g 取 10 N/kg）', a: max / 10, u: 'kg', sol: 'm = G/g = ' + max + ' N ÷ 10 N/kg = ' + max / 10 + ' kg', _: G }; },
      () => { const lim = pick([10, 15, 20, 30]), self = pick([5, 6, 8]), cargo = PS.round(lim - self + pick([-3, -1, 2, 4]), 0); const tot = self + cargo; return { q: '桥头限重标志 ' + lim + ' t。一辆自重 ' + self * 1e4 + ' N 的卡车装了 ' + cargo + ' t 货物，车和货的总质量是多少吨？（g 取 10 N/kg）', a: tot, u: 't', sol: '车的质量 m车 = G/g = ' + self * 1e4 + ' N ÷ 10 N/kg = ' + self * 1000 + ' kg = ' + self + ' t；总质量 ' + self + ' t + ' + cargo + ' t = ' + tot + ' t，' + (tot > lim ? '超过限重，不能通过。' : '没有超过限重，可以通过。') }; },
      () => { const V = pick([1, 2, 5]), mat = pick([['铁', 7.9], ['铝', 2.7], ['水', 1.0]]); return { q: '体积为 ' + V + ' dm³ 的' + mat[0] + '（ρ = ' + mat[1] + '×10³ kg/m³）受到的重力是多少？（g 取 10 N/kg）', a: mat[1] * V * 10, u: 'N', sol: 'm = ρV = ' + mat[1] + '×10³ kg/m³ × ' + V + '×10⁻³ m³ = ' + PS.round(mat[1] * V, 2) + ' kg；G = mg = ' + PS.round(mat[1] * V * 10, 2) + ' N' }; },
    ];
    function next() {
      Q = pick(GEN)();
      box.innerHTML = '<b>计算：</b>' + Q.q;
      unit.textContent = Q.u; inp.value = ''; inp.disabled = false;
      fb.className = 'fc-msg'; fb.innerHTML = '把答案填在框里（数字），单位已给出。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = parseFloat(inp.value.replace(/[，,\s]/g, ''));
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.max(0.011, Math.abs(Q.a) * 0.005);
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + PS.round(Q.a, 2) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });

  /* ================= 重力的方向 ================= */
  PS.register('gravity-direction', function (el) {
    const VW = 1000, VH = 400;
    const st = { mode: 'slope', ang: 20, cut: false, by: 0, bv: 0, wall: 0, level: 0 };
    const seg = PS.ui.seg([{ value: 'slope', label: '① 斜面上的水槽和铅垂线' }, { value: 'vs', label: '② 竖直 ≠ 垂直' }, { value: 'wall', label: '③ 用铅垂线检查墙壁' }, { value: 'level', label: '④ 水平仪' }], st.mode, (v) => { st.mode = v; ui(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(ctl, msg);
    const angS = PS.ui.slider({ label: '斜面倾角', min: 0, max: 40, step: 1, value: st.ang, unit: '°', onInput: (v) => { st.ang = v; tell(); } });
    const cutB = PS.ui.button('✂ 剪断细线', () => { st.cut = !st.cut; st.by = 0; st.bv = 0; cutB.innerHTML = st.cut ? '↺ 重新挂好' : '✂ 剪断细线'; }, 'btn btn-sm');
    const wallS = PS.ui.slider({ label: '墙的倾斜', min: -8, max: 8, step: 1, value: 0, unit: '°', onInput: (v) => { st.wall = v; tell(); } });
    const lvS = PS.ui.slider({ label: '桌面倾斜', min: -10, max: 10, step: 1, value: 0, unit: '°', onInput: (v) => { st.level = v; tell(); } });
    function ui() { ctl.innerHTML = ''; if (st.mode === 'slope') ctl.append(angS.el, cutB); if (st.mode === 'vs') ctl.append(angS.el); if (st.mode === 'wall') ctl.append(wallS.el); if (st.mode === 'level') ctl.append(lvS.el); tell(); }
    function tell() {
      const m = st.mode;
      if (m === 'slope') msg.innerHTML = '改变斜面的倾角：水槽中的<b>水面始终是水平的</b>，悬挂小球的<b>细线（铅垂线）始终竖直下垂</b>，并且与水面垂直。剪断细线，小球沿<b>竖直向下</b>的方向下落。<br>结论：<b>重力的方向总是竖直向下的</b>。';
      else if (m === 'vs') msg.innerHTML = '“竖直向下”是指与<b>水平面</b>垂直向下；“垂直向下”只是与某个面垂直。物体在斜面上时，重力的方向仍然<b>竖直向下</b>，不是垂直于斜面向下。斜面倾角为 ' + st.ang + '° 时，两个方向相差 ' + st.ang + '°。';
      else if (m === 'wall') msg.innerHTML = st.wall === 0 ? '墙的边缘与铅垂线<b>平行</b>——墙是竖直的。✔' : '墙的边缘与铅垂线<b>不平行</b>：墙向' + (st.wall > 0 ? '右' : '左') + '倾斜了 ' + Math.abs(st.wall) + '°，要重新砌！<br>建筑工人利用<b>重力的方向竖直向下</b>，用铅垂线检查墙壁是否竖直。';
      else msg.innerHTML = st.level === 0 ? '铅垂线与水平仪上的刻线<b>重合</b>——桌面是水平的。✔' : '铅垂线偏向刻线的' + (st.level > 0 ? '左' : '右') + '侧，说明桌面' + (st.level > 0 ? '<b>右边高、左边低</b>' : '<b>左边高、右边低</b>') + '。<br>水平仪的底边与刻线垂直，铅垂线始终竖直向下，利用它可以检查桌面是否水平。';
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.cut) { st.bv += 600 * dt; st.by += st.bv * dt; }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const a = (st.ang * Math.PI) / 180;
      if (st.mode === 'slope' || st.mode === 'vs') {
        // 斜面
        const x0 = 120, y0 = 360, L = 760;
        const x1 = x0 + L, y1 = y0 - L * Math.tan(a);
        ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (st.ang > 0) D.text(ctx, st.ang + '°', x0 + 70, y0 - 10, { size: F(14), color: '#495057' });
        ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(40, y0); ctx.lineTo(960, y0); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '水平面', 950, y0 + 22, { size: F(12), color: '#868e96', align: 'right' });
        const onS = (s) => [x0 + s * Math.cos(a), y0 - s * Math.sin(a)]; // 沿斜面距离 s 处的点
        if (st.mode === 'slope') {
          // 水槽（随斜面倾斜），水面水平
          const [cx, cy] = onS(260);
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a);
          ctx.beginPath(); ctx.rect(-90, -110, 180, 110); ctx.save(); ctx.clip();
          ctx.rotate(a); // 回到世界方向：水面水平
          const lev = -50; // 水面相对槽底中心的高度（世界方向）
          ctx.fillStyle = 'rgba(116,192,252,.6)'; ctx.fillRect(-200, lev, 400, 300);
          ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-200, lev); ctx.lineTo(200, lev); ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-90, -110); ctx.lineTo(-90, 0); ctx.lineTo(90, 0); ctx.lineTo(90, -110); ctx.stroke();
          ctx.restore();
          D.text(ctx, '水面总是水平的', cx, cy - 140, { size: F(14), weight: 700, color: '#1c7ed6', align: 'center' });
          // 铁架台（垂直于斜面立着）与铅垂线
          const [px, py] = onS(560);
          const nx = -Math.sin(a), ny = -Math.cos(a); // 垂直斜面向上
          const tx = px + nx * 190, ty = py + ny * 190;
          ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
          const hx = tx + Math.cos(a) * 90, hy = ty - Math.sin(a) * 90; // 横杆
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
          const bob = hy + 150;
          ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.8;
          if (!st.cut) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, bob); ctx.stroke(); }
          else { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 40); ctx.stroke(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#7048e8'; ctx.beginPath(); ctx.moveTo(hx, bob); ctx.lineTo(hx, Math.min(VH, bob + st.by)); ctx.stroke(); ctx.setLineDash([]); }
          const yb = Math.min(bob + st.by, y0 - (hx - x0) * Math.tan(a) - 14);
          FO.ball(ctx, hx, yb, 14, '#d0bfff', '#5f3dc4');
          if (!st.cut) FO.arrow(ctx, hx, bob, Math.PI / 2, 60, { color: FC.G, label: 'G（竖直向下）', F, labelSide: -1 });
          D.text(ctx, '铅垂线', hx + 14, hy + 60, { size: F(13), weight: 700, color: '#495057' });
        } else {
          const [cx, cy] = onS(420);
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(-a); FO.box(ctx, -60, 0, 120, 80, {}); ctx.restore();
          const ccx = cx - Math.sin(a) * 40, ccy = cy - Math.cos(a) * 40;
          FO.arrow(ctx, ccx, ccy, Math.PI / 2, 150, { color: FC.G, label: '重力：竖直向下 ✔', F, labelSide: 1 });
          if (st.ang > 0) FO.arrow(ctx, ccx, ccy, Math.PI / 2 - a, 150, { color: '#e03131', label: '垂直斜面向下 ✘', F, labelSide: -1, dash: [8, 6], dot: false });
        }
      } else if (st.mode === 'wall') {
        const b = (st.wall * Math.PI) / 180;
        ctx.fillStyle = '#8ce99a'; ctx.fillRect(0, 360, VW, 40);
        ctx.save(); ctx.translate(420, 360); ctx.rotate(b);
        ctx.beginPath(); ctx.rect(-120, -312, 240, 312); ctx.clip();
        ctx.fillStyle = '#f1e3d3'; ctx.fillRect(-120, -312, 240, 312);
        for (let r = 0; r < 12; r++) for (let c = -1; c < 5; c++) { ctx.fillStyle = (r + c) % 2 ? '#e8590c' : '#d9480f'; ctx.fillRect(-120 + c * 60 + (r % 2 ? 30 : 0) + 1, -(r + 1) * 26 + 1, 58, 24); }
        ctx.restore();
        // 铅垂线贴着墙的右上角
        const topX = 420 + Math.cos(b) * 120 + Math.sin(b) * 312, topY = 360 - Math.cos(b) * 312 + Math.sin(b) * 120;
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(topX + 14, topY - 10); ctx.lineTo(topX + 14, 330); ctx.stroke();
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(topX + 4, 330); ctx.lineTo(topX + 24, 330); ctx.lineTo(topX + 14, 352); ctx.closePath(); ctx.fill();
        FO.person(ctx, topX + 120, 360, { h: 150, dir: -1, hand: { x: topX + 18, y: topY - 10 } });
        D.text(ctx, '重垂线', topX + 30, 200, { size: F(14), weight: 700, color: '#495057' });
        D.text(ctx, st.wall === 0 ? '✔ 墙是竖直的' : '✘ 墙歪了', 760, 80, { size: F(22), weight: 900, color: st.wall === 0 ? '#2b8a3e' : '#e03131', align: 'center' });
      } else {
        const b = (st.level * Math.PI) / 180;
        const cx = 500, cy = 330;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-b);
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(-380, 0, 760, 26);
        // 三角形水平仪
        ctx.fillStyle = 'rgba(255,236,170,.95)'; ctx.strokeStyle = '#8a6d1c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-160, 0); ctx.lineTo(160, 0); ctx.lineTo(0, -230); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#f8fafd'; ctx.beginPath(); ctx.moveTo(-90, -24); ctx.lineTo(90, -24); ctx.lineTo(0, -160); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -60); ctx.stroke();
        D.text(ctx, '刻线', 10, -40, { size: F(12), color: '#e03131' });
        ctx.restore();
        // 铅垂线（世界坐标中竖直）
        const px = cx - Math.sin(b) * 200, py = cy - Math.cos(b) * 200; // 三角板上挂铅垂线的点（局部坐标 (0, −200)）
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 150); ctx.stroke();
        FO.ball(ctx, px, py + 156, 8, '#d0bfff', '#5f3dc4');
        D.text(ctx, st.level === 0 ? '✔ 水平' : st.level > 0 ? '右高左低' : '左高右低', 820, 80, { size: F(22), weight: 900, color: st.level === 0 ? '#2b8a3e' : '#e03131', align: 'center' });
      }
    }
    seg.set(st.mode, true);
    ui();
    loop.start();
  });

  /* ================= 重心 ================= */
  // 不规则薄板（多边形，单位 px，板的局部坐标）
  const PLATE = [[-150, -60], [-60, -120], [40, -110], [150, -70], [170, 10], [110, 80], [20, 70], [-40, 120], [-120, 90], [-170, 20]];
  const HOLES = [[-150, -50], [140, -60], [-30, 105]];
  function centroid(P) {
    let A = 0, cx = 0, cy = 0;
    for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length]; const c = x1 * y2 - x2 * y1; A += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c; }
    A /= 2; return [cx / (6 * A), cy / (6 * A)];
  }
  PS.register('center-gravity', function (el) {
    const VW = 1000, VH = 420, PIV = [500, 70];
    const CG = centroid(PLATE);
    const st = { mode: 'hang', hole: null, ang: 0, w: 0, lines: [], finger: null, rx: 300, rang: 0, rw: 0, t: 0 };
    const seg = PS.ui.seg([{ value: 'regular', label: '① 形状规则的物体' }, { value: 'hang', label: '② 悬挂法找重心' }, { value: 'prop', label: '③ 支撑法：顶住尺子' }], st.mode, (v) => { st.mode = v; ui(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(ctl, msg);
    const holeBtns = HOLES.map((_, i) => PS.ui.button('挂在 ' + 'ABC'[i] + ' 孔', () => hang(i), 'btn btn-sm'));
    const lineB = PS.ui.button('✏ 沿铅垂线画线', drawLine, 'btn btn-primary btn-sm');
    const fingerB = PS.ui.button('☝ 用手指在交点处顶住', () => { st.hole = null; st.finger = true; st.ang = 0; st.w = 0; tell(); }, 'btn btn-green btn-sm');
    function ui() {
      ctl.innerHTML = '';
      if (st.mode === 'hang') ctl.append(...holeBtns, lineB, fingerB, PS.ui.button('擦掉重来', () => { st.lines = []; st.finger = null; st.hole = null; st.ang = 0; tell(); }, 'btn btn-ghost btn-sm'));
      if (st.mode === 'prop') ctl.append(PS.ui.button('放上尺子', () => { st.rang = 0; st.rw = 0; st.placed = true; }, 'btn btn-primary btn-sm'));
      tell();
    }
    function hang(i) { st.hole = i; st.finger = null; st.ang = st.ang + (Math.random() - 0.5) * 0.8; st.w = 0; PS.sound.tick(); tell(); }
    function drawLine() {
      if (st.hole == null) { msg.className = 'fc-msg bad'; msg.innerHTML = '先把薄板挂起来（选一个孔）。'; return; }
      if (Math.abs(st.w) > 0.08 || Math.abs(st.wx || 0) > 3) { msg.className = 'fc-msg bad'; msg.innerHTML = '等薄板<b>静止</b>后再画线。'; return; }
      if (st.lines.some((l) => l.hole === st.hole)) { msg.className = 'fc-msg'; msg.innerHTML = '这个孔已经画过线了，换一个孔挂起来。'; return; }
      // 铅垂线在板上的方向：世界的竖直方向转到板的局部坐标
      const c = Math.cos(-st.ang), s = Math.sin(-st.ang);
      st.lines.push({ hole: st.hole, p: HOLES[st.hole], d: [-s * 1, c * 1] });
      PS.sound.good(); tell();
    }
    function inter() {
      if (st.lines.length < 2) return null;
      const [a, b] = st.lines;
      const [x1, y1] = a.p, [dx1, dy1] = a.d, [x2, y2] = b.p, [dx2, dy2] = b.d;
      const den = dx1 * dy2 - dy1 * dx2;
      if (Math.abs(den) < 1e-6) return null;
      const t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den;
      return [x1 + dx1 * t, y1 + dy1 * t];
    }
    function tell() {
      msg.className = 'fc-msg info';
      if (st.mode === 'regular') msg.innerHTML = '<b>形状规则、质量分布均匀</b>的物体，重心在它的<b>几何中心</b>上：均匀直棒的重心在中点，均匀球的重心在球心，方形薄板的重心在对角线的交点。<br><b>重心不一定在物体上</b>：圆环的重心在圆心，不在环上。';
      else if (st.mode === 'hang') {
        const n = st.lines.length;
        if (st.finger) msg.innerHTML = '用手指在两条线的交点 O 处顶住薄板——薄板<b>平衡</b>了！O 点就是薄板的<b>重心</b>（重力在物体上的作用点）。';
        else if (n === 0) msg.innerHTML = '形状不规则的薄板，怎样找重心？把它从一个孔挂起来，<b>静止时，重心一定在悬挂点的正下方</b>（铅垂线上）。先挂在 A 孔，等它静止后沿铅垂线画线。';
        else if (n === 1) msg.innerHTML = '再换一个孔挂起来，静止后再画一条线。';
        else msg.innerHTML = '两条线的交点 O 就是薄板的<b>重心</b>。再挂第三个孔试试：铅垂线也会通过 O 点。最后可以“用手指在交点处顶住”验证。';
      } else msg.innerHTML = '拖动下面的<b>手指</b>，把尺子放在手指上：只有手指正好在尺子的<b>重心</b>（均匀直尺的中点）下面时，尺子才能平衡；否则就会向重的一侧倾倒。';
      S.render();
    }
    PS.drag(S, { VW, VH, hit: (p) => (st.mode === 'prop' && p.y > 280 ? 'f' : null), move: (o, p) => { st.rx = PS.clamp(p.x, 160, 840); if (st.placed) { st.rang = 0; st.rw = 0; } }, hover: () => st.mode === 'prop' });
    const loop = PS.loop((dt, t) => {
      st.t = t;
      if (st.mode === 'hang' && st.hole != null) {
        const n = 6;
        for (let k = 0; k < n; k++) {
          const d = dt / n;
          const [hx, hy] = HOLES[st.hole];
          const rx = CG[0] - hx, ry = CG[1] - hy;
          const wx = rx * Math.cos(st.ang) - ry * Math.sin(st.ang); // 重心相对悬挂点的水平偏移
          st.w += (wx * 0.25 - st.w * 7) * d; // 重心在悬挂点右侧时顺时针转（画布中角度增大）
          st.wx = wx;
          st.ang += st.w * d;
        }
      }
      if (st.mode === 'prop' && st.placed) {
        const off = 500 - st.rx; // 尺子中点（重心）相对手指的偏移
        if (Math.abs(off) > 6) { st.rw += (off > 0 ? 1 : -1) * 3.5 * dt; st.rang += st.rw * dt; if (Math.abs(st.rang) > 0.9) { st.rang = Math.sign(st.rang) * 0.9; st.rw = 0; } }
        else { st.rang *= 1 - Math.min(1, dt * 5); st.rw = 0; }
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'regular') {
        const items = [['均匀直棒', 140], ['均匀球', 340], ['方形薄板', 540], ['圆环', 760]];
        // 棒
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(40, 196, 200, 18);
        // 球
        FO.ball(ctx, 340, 205, 60, '#a5d8ff', '#1c7ed6');
        // 方板
        ctx.fillStyle = '#ffe8cc'; ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2; ctx.fillRect(470, 135, 140, 140); ctx.strokeRect(470, 135, 140, 140);
        ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(470, 135); ctx.lineTo(610, 275); ctx.moveTo(610, 135); ctx.lineTo(470, 275); ctx.stroke(); ctx.setLineDash([]);
        // 圆环
        ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 18; ctx.beginPath(); ctx.arc(760, 205, 70, 0, TAU); ctx.stroke();
        items.forEach(([n, x]) => {
          ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x, 205, 6, 0, TAU); ctx.fill();
          FO.arrow(ctx, x, 205, Math.PI / 2, 80, { color: FC.G, dot: false, width: 2.6 });
          D.text(ctx, n, x, 340, { size: F(15), weight: 800, align: 'center' });
        });
        D.text(ctx, '重心不在环上！', 760, 120, { size: F(13), weight: 700, color: '#e03131', align: 'center' });
        D.text(ctx, '红点：重心', 40, 40, { size: F(13), weight: 700, color: '#e03131' });
      } else if (st.mode === 'hang') {
        // 支架
        ctx.fillStyle = '#495057'; ctx.fillRect(300, 50, 400, 10);
        ctx.save();
        let ox, oy;
        if (st.finger) { ox = 500 - CG[0]; oy = 240 - CG[1]; ctx.translate(ox, oy); }
        else if (st.hole != null) { ctx.translate(PIV[0], PIV[1]); ctx.rotate(st.ang); ctx.translate(-HOLES[st.hole][0], -HOLES[st.hole][1]); }
        else { ctx.translate(500, 240); }
        ctx.fillStyle = '#ffe8cc'; ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 2.5;
        ctx.beginPath(); PLATE.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.closePath(); ctx.fill(); ctx.stroke();
        HOLES.forEach(([x, y], i) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.stroke(); D.text(ctx, 'ABC'[i], x + 10, y - 8, { size: F(14), weight: 800, color: '#495057' }); });
        // 已画的线（板的坐标中）
        st.lines.forEach((l) => { ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2; ctx.setLineDash([8, 5]); ctx.beginPath(); ctx.moveTo(l.p[0] - l.d[0] * 60, l.p[1] - l.d[1] * 60); ctx.lineTo(l.p[0] + l.d[0] * 330, l.p[1] + l.d[1] * 330); ctx.stroke(); ctx.setLineDash([]); });
        const O = inter();
        if (O) { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(O[0], O[1], 7, 0, TAU); ctx.fill(); D.text(ctx, 'O', O[0] + 10, O[1] + 18, { size: F(16), weight: 900, color: '#e03131' }); }
        ctx.restore();
        if (st.hole != null && !st.finger) {
          ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(PIV[0], PIV[1], 5, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(PIV[0], 60); ctx.lineTo(PIV[0], PIV[1]); ctx.stroke();
          // 铅垂线（从悬挂点竖直向下）
          ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(PIV[0], PIV[1]); ctx.lineTo(PIV[0], 380); ctx.stroke();
          FO.ball(ctx, PIV[0], 388, 7, '#d0bfff', '#5f3dc4');
          D.text(ctx, '铅垂线', PIV[0] + 12, 370, { size: F(13), color: '#7048e8', weight: 700 });
        }
        if (st.finger) {
          ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(488, 420); ctx.lineTo(488, 252); ctx.arc(500, 252, 12, Math.PI, 0); ctx.lineTo(512, 420); ctx.fill(); ctx.stroke();
        }
        if (!st.finger && st.hole == null) D.text(ctx, '选一个孔把薄板挂起来', 500, 30, { size: F(15), color: '#868e96', align: 'center' });
      } else {
        // 支撑法：尺子放在手指上
        const fy = 300;
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(st.rx - 14, 420); ctx.lineTo(st.rx - 14, fy + 12); ctx.arc(st.rx, fy + 12, 14, Math.PI, 0); ctx.lineTo(st.rx + 14, 420); ctx.fill(); ctx.stroke();
        D.text(ctx, '↔ 拖动手指', st.rx, 410, { size: F(12), color: '#868e96', align: 'center' });
        if (st.placed) {
          ctx.save(); ctx.translate(st.rx, fy - 2); ctx.rotate(st.rang);
          D.ruler(ctx, { x: 160 - st.rx + 0, y: -24, len: 20, ppc: 34, div: 'mm', h: 24, side: 'top', padL: 0, padR: 0, unitLabel: false });
          ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(500 - st.rx, -12, 5, 0, TAU); ctx.fill();
          ctx.restore();
          const bal = Math.abs(500 - st.rx) <= 6;
          D.text(ctx, bal ? '✔ 平衡了：手指在重心正下方' : '✘ 向' + (500 > st.rx ? '右' : '左') + '倾倒：重心不在手指上方', 500, 60, { size: F(18), weight: 800, color: bal ? '#2b8a3e' : '#e03131', align: 'center' });
        } else D.text(ctx, '点“放上尺子”', 500, 60, { size: F(16), color: '#868e96', align: 'center' });
        D.text(ctx, '红点：尺子的重心（10 cm 处）', 20, 30, { size: F(13), color: '#e03131', weight: 700 });
      }
    }
    seg.set(st.mode, true);
    ui();
    loop.start();
  });

  /* ================= 重力的由来：万有引力 ================= */
  PS.register('gravity-origin', function (el) {
    const VW = 1000, VH = 440;
    const st = { mode: 'sling', a: 0, cut: false, fx: 0, fy: 0, fvx: 0, fvy: 0, v: 6.5, shots: [], cur: null };
    const seg = PS.ui.seg([{ value: 'sling', label: '① 甩橡皮' }, { value: 'cannon', label: '② 牛顿的“大炮”' }], st.mode, (v) => { st.mode = v; ui(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(ctl, msg);
    const cutB = PS.ui.button('✂ 松开细线', () => { if (st.cut) { st.cut = false; } else { st.cut = true; const R = 130, w = 3.2; st.fx = 300 + Math.cos(st.a) * R; st.fy = 220 + Math.sin(st.a) * R; st.fvx = -Math.sin(st.a) * R * w; st.fvy = Math.cos(st.a) * R * w; } cutB.innerHTML = st.cut ? '↺ 重新甩起来' : '✂ 松开细线'; tell(); }, 'btn btn-primary btn-sm');
    const vS = PS.ui.slider({ label: '发射速度', min: 2, max: 11.5, step: 0.1, value: st.v, unit: 'km/s', onInput: (v) => { st.v = v; } });
    vS.el.classList.add('wide');
    const fireB = PS.ui.button('🚀 发射', fire, 'btn btn-primary btn-sm');
    function ui() { ctl.innerHTML = ''; if (st.mode === 'sling') ctl.append(cutB); else ctl.append(vS.el, fireB, PS.ui.button('清除轨迹', () => { st.shots = []; st.cur = null; }, 'btn btn-ghost btn-sm')); tell(); }
    function tell() {
      if (st.mode === 'sling') msg.innerHTML = st.cut ? '松开细线，橡皮就沿着圆周的<b>切线方向</b>飞出去了——原来是细线的拉力拉住它，它才能做圆周运动。<br>月球绕地球转，也需要一个力“拉住”它——这就是地球对月球的<b>引力</b>。' : '用细线拴住橡皮，让它绕手做圆周运动。手会感觉到：<b>要用线拉住橡皮，它才不会跑掉</b>。';
      else msg.innerHTML = '牛顿设想：在高山上水平发射炮弹，速度越大，落地点越远；速度足够大（约 <b>7.9 km/s</b>）时，炮弹就绕着地球转，永远落不下来——像月球一样。<br>使苹果下落的力和使月球绕地球转的力是<b>同一种力</b>。宇宙间任何两个物体，大到天体，小到尘埃，都存在互相吸引的力，这就是<b>万有引力</b>。<b>重力正是源自地球对它附近物体的万有引力</b>。';
    }
    // 牛顿大炮：地球半径 R = 150 px，山顶高 18 px；7.9 km/s 对应近地圆轨道
    const EX = 500, EY = 250, ER = 150, R0 = ER + 18, K = 18; // K：每 km/s 对应的 px/s
    const GM = Math.pow(7.9 * K, 2) * R0;
    function fire() {
      const c = ['#e8590c', '#7048e8', '#2b8a3e', '#1c7ed6', '#c2255c'][st.shots.length % 5];
      st.cur = { x: EX, y: EY - R0, vx: st.v * K, vy: 0, path: [[EX, EY - R0]], c, v: st.v, t: 0, end: null };
      st.shots.push(st.cur); if (st.shots.length > 6) st.shots.shift();
      PS.sound.clack();
    }
    const loop = PS.loop((dt) => {
      if (st.mode === 'sling') { if (!st.cut) st.a += 3.2 * dt; else { st.fx += st.fvx * dt; st.fy += st.fvy * dt; } }
      st.shots.forEach((s) => {
        if (s.end) return;
        const n = 20;
        for (let i = 0; i < n; i++) {
          const d = (dt * 2) / n; // 加快 2 倍
          const rx = s.x - EX, ry = s.y - EY, r = Math.hypot(rx, ry);
          const a = GM / (r * r);
          s.vx -= (a * rx) / r * d; s.vy -= (a * ry) / r * d;
          s.x += s.vx * d; s.y += s.vy * d; s.t += d;
          if (r < ER) { s.end = 'land'; break; }
          if (r > 1400) { s.end = 'away'; break; }
        }
        s.path.push([s.x, s.y]);
        if (s.path.length > 1500) s.path.shift();
      });
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      if (st.mode === 'sling') {
        ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
        const cx = 300, cy = 220, R = 130;
        ctx.strokeStyle = '#dee2e6'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, TAU); ctx.fill(); ctx.stroke();
        const ex = st.cut ? st.fx : cx + Math.cos(st.a) * R, ey = st.cut ? st.fy : cy + Math.sin(st.a) * R;
        if (!st.cut) { ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke(); FO.arrow(ctx, ex, ey, Math.atan2(cy - ey, cx - ex), 60, { color: FC.T, label: '线的拉力', F }); }
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(st.cut ? 0 : st.a); ctx.fillStyle = '#ff8787'; ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 1.5; ctx.fillRect(-16, -10, 32, 20); ctx.strokeRect(-16, -10, 32, 20); ctx.restore();
        // 右侧：地球与月球
        const mx = 760, my = 220;
        const g = ctx.createRadialGradient(mx - 20, my - 20, 10, mx, my, 60); g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#1864ab');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, 50, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ced4da'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(mx, my, 150, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const ma = st.a * 0.3, mox = mx + Math.cos(ma) * 150, moy = my + Math.sin(ma) * 150;
        ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(mox, moy, 16, 0, TAU); ctx.fill();
        FO.arrow(ctx, mox, moy, Math.atan2(my - moy, mx - mox), 55, { color: FC.G, label: '地球的引力', F, size: F(13) });
        D.text(ctx, '地球', mx, my + 5, { size: F(14), weight: 800, color: '#fff', align: 'center' });
        D.text(ctx, '月球绕地球转：地球的引力“拉住”月球', mx, 410, { size: F(13), color: '#495057', align: 'center' });
      } else {
        ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, VW, VH);
        stars(ctx, VW, VH, 80);
        const g = ctx.createRadialGradient(EX - 40, EY - 40, 20, EX, EY, ER); g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#1864ab');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(EX, EY, ER, 0, TAU); ctx.fill();
        ctx.fillStyle = '#51cf66'; ctx.beginPath(); ctx.moveTo(EX - 30, EY - ER + 6); ctx.lineTo(EX, EY - R0); ctx.lineTo(EX + 30, EY - ER + 6); ctx.fill();
        ctx.fillStyle = '#495057'; ctx.fillRect(EX - 6, EY - R0 - 8, 22, 8);
        st.shots.forEach((s) => {
          ctx.strokeStyle = s.c; ctx.lineWidth = 2.2; ctx.beginPath(); s.path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
          if (!s.end || s.end === 'orbit') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, TAU); ctx.fill(); }
        });
        st.shots.forEach((s, i) => D.text(ctx, PS.fmt(s.v, 1) + ' km/s：' + (s.end === 'land' ? '落回地面' : s.end === 'away' ? '飞离地球' : s.v >= 7.85 && s.v < 11.2 ? '绕地球转' : '飞行中'), 20, 30 + i * 24, { size: F(13), weight: 700, color: s.c }));
        D.text(ctx, '示意图（地球、山的大小不按比例）', VW - 20, VH - 14, { size: F(12), color: '#adb5bd', align: 'right' });
      }
    }
    seg.set(st.mode, true);
    ui();
    loop.start();
  });
})();
