/* 第3章第3节：液化——压缩体积使气体液化、“白气”是什么、车窗上的水珠、电冰箱（拓展）。依赖 heat.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  /* ================= 压缩体积使气体液化（注射器里的乙醚） ================= */
  PS.register('liquefy', function (el) {
    const VW = 1000, VH = 360;
    const X0 = 130, Y0 = 135, Y1 = 245, ALL = 560; // 活塞拉到 ALL 处时乙醚全部汽化
    const st = { xp: 330, liq: 0.6, t: 0 };
    const N = 70;
    const ms = Array.from({ length: N }, (_, i) => ({ x: PS.rand(X0 + 10, 320), y: PS.rand(Y0 + 8, Y1 - 8), a: Math.random() * TAU, i }));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'ew-resize';
    const sl = PS.ui.slider({ label: '活塞', min: 260, max: 760, step: 1, value: st.xp, fmt: (v) => (v > 560 ? '拉出' : v < 330 ? '推进' : '中间'), onInput: (v) => { st.xp = v; } });
    sl.el.classList.add('wide');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(sl.el, PS.ui.button('向外拉 →', () => anim(720), 'btn btn-sm'), PS.ui.button('← 向里推', () => anim(280), 'btn btn-sm')), msg);
    let target = null;
    function anim(x) { target = x; }
    const eq = () => PS.clamp(1 - (st.xp - X0) / (ALL - X0), 0, 1); // 平衡时液态乙醚的比例
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (target != null) { st.xp += PS.clamp(target - st.xp, -300 * dt, 300 * dt); sl.set(Math.round(st.xp), true); if (Math.abs(target - st.xp) < 1) target = null; }
      st.liq += (eq() - st.liq) * Math.min(1, dt * 2);
      const nGas = Math.round((1 - st.liq) * N);
      ms.forEach((m) => {
        m.gas = m.i < nGas;
        if (!m.gas) return;
        m.a += PS.gauss() * 0.4;
        m.x += Math.cos(m.a) * 160 * dt; m.y += Math.sin(m.a) * 160 * dt;
        if (m.x < X0 + 6) { m.x = X0 + 6; m.a = Math.PI - m.a; }
        if (m.x > st.xp - 6) { m.x = st.xp - 6; m.a = Math.PI - m.a; }
        if (m.y < Y0 + 6) { m.y = Y0 + 6; m.a = -m.a; }
        if (m.y > Y1 - 6) { m.y = Y1 - 6; m.a = -m.a; }
      });
      msg.className = 'feedback show ' + (st.liq < 0.03 ? 'ok' : 'info');
      msg.innerHTML = st.liq < 0.03 ? '向外拉活塞，注射器内的体积变大，液态乙醚<b>全部消失</b>了——乙醚<b>汽化</b>成了看不见的乙醚蒸气。再向里推活塞试试。'
        : st.xp < 400 ? '向里推活塞，<b>压缩体积</b>，乙醚蒸气又变成了<b>液态乙醚</b>——<b>液化</b>。说明<b>压缩体积</b>可以使气体液化。'
          : '注射器里有少量液态乙醚，针头处用橡皮帽堵住。慢慢<b>向外拉活塞</b>，液态乙醚会怎样？';
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 针筒
      ctx.fillStyle = 'rgba(232,244,255,.9)'; ctx.fillRect(X0, Y0, 700, Y1 - Y0);
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 3; ctx.strokeRect(X0, Y0, 700, Y1 - Y0);
      ctx.fillStyle = '#7d8ca3'; ctx.fillRect(X0 - 40, 178, 40, 24);
      ctx.fillStyle = '#e03131'; D.roundRect(ctx, X0 - 62, 172, 26, 36, 6); ctx.fill();
      D.text(ctx, '橡皮帽', X0 - 50, 160, { size: F(12), weight: 700, color: '#e03131', align: 'center' });
      for (let i = 1; i < 14; i++) { ctx.fillStyle = '#868e96'; ctx.fillRect(X0 + i * 50, Y0, 1.5, i % 2 ? 10 : 16); }
      // 乙醚蒸气分子
      ms.forEach((m) => { if (!m.gas) return; ctx.fillStyle = '#fd7e14'; ctx.beginPath(); ctx.arc(m.x, m.y, 4.5, 0, TAU); ctx.fill(); });
      // 液态乙醚（筒底的液体）
      if (st.liq > 0.01) {
        const len = 30 + 150 * st.liq, th = 6 + 22 * st.liq;
        ctx.fillStyle = 'rgba(77,171,247,.75)';
        D.roundRect(ctx, X0 + 4, Y1 - th - 2, Math.min(len, st.xp - X0 - 8), th, 6); ctx.fill();
        D.text(ctx, '液态乙醚', X0 + 14 + Math.min(len, st.xp - X0 - 8) / 2, Y1 + 24, { size: F(13), weight: 800, color: '#1c7ed6', align: 'center' });
      }
      // 活塞
      ctx.fillStyle = '#495057'; ctx.fillRect(st.xp, Y0 + 3, 16, Y1 - Y0 - 6);
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(st.xp + 16, 182, 880 - st.xp, 16);
      ctx.fillStyle = '#495057'; D.roundRect(ctx, 896 - 0, 140, 22, 100, 5); ctx.fill();
      D.text(ctx, '拉出 → 体积变大；← 推进：压缩体积', 500, 300, { size: F(13), weight: 700, color: '#6b7487', align: 'center' });
      D.text(ctx, st.liq < 0.03 ? '全部是乙醚蒸气（看不见）' : '液态乙醚 + 乙醚蒸气', 480, 110, { size: F(15), weight: 800, color: st.liq < 0.03 ? '#e8590c' : '#1c7ed6', align: 'center' });
      ctx.restore();
    }
    function drag(e) { const p = S.pos(e), x = (p.x / S.w) * VW; target = null; st.xp = PS.clamp(x, 260, 760); sl.set(Math.round(st.xp), true); }
    S.canvas.addEventListener('pointerdown', (e) => { drag(e); S.canvas.setPointerCapture(e.pointerId); S.canvas.onpointermove = drag; });
    S.canvas.addEventListener('pointerup', () => { S.canvas.onpointermove = null; });
    st.liq = eq();
    loop.start();
  });

  /* ================= “白气”是什么？ ================= */
  // field(x, y) → { vapor 水蒸气浓度, drops 小水滴浓度 }，放大镜里据此画出分子
  const MIST = {
    kettle: {
      name: '烧开水的壶嘴', bg: '#e9ecef',
      text: '壶嘴里喷出的是<b>高温的水蒸气</b>（看不见）。刚出壶嘴时温度高，还不能液化，所以紧挨壶嘴的地方<b>看不到白气</b>；稍远处水蒸气遇到冷的空气<b>液化成小水滴</b>，这就是“白气”；再往远处，小水滴又<b>汽化</b>成水蒸气，白气消失了。',
      src: [380, 190], dir: [1, -0.25],
    },
    ice: {
      name: '夏天冰棍冒“白气”', bg: '#fff4e6',
      text: '冰棍周围的“白气”不是冰棍冒出来的，而是<b>空气中的水蒸气</b>遇到冷的冰棍<b>液化</b>成的小水滴。小水滴比空气重，所以冰棍的“白气”是<b>向下飘</b>的。',
      src: [500, 170], dir: [0, 1],
    },
    breath: {
      name: '冬天呼出的“白气”', bg: '#dbe4ff',
      text: '人呼出的气中含有较多<b>温度较高的水蒸气</b>，遇到冬天<b>冷的空气</b>液化成小水滴，就是“白气”。夏天气温高，呼出的水蒸气不容易液化，就看不到白气。',
      src: [330, 200], dir: [1, -0.1],
    },
    bottle: {
      name: '冷饮瓶外壁“出汗”', bg: '#fff9db',
      text: '从冰箱里拿出的饮料瓶，外壁会出现小水珠。它们是<b>空气中的水蒸气</b>遇到冷的瓶壁<b>液化</b>成的，不是从瓶子里渗出来的。',
      src: [500, 230], dir: [0, 0],
    },
  };
  PS.register('white-mist', function (el) {
    const VW = 1000, VH = 420;
    const st = { k: 'kettle', ps: [], t: 0, mag: null, ask: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'zoom-in';
    const seg = PS.ui.seg(Object.keys(MIST).map((k) => ({ value: k, label: MIST[k].name })), st.k, (v) => { st.k = v; st.ps = []; st.mag = null; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    const q = h('div', { class: 'row', style: { gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' } }, h('b', null, '“白气”是什么状态？'), PS.ui.button('气态（水蒸气）', () => ans(0), 'btn btn-sm'), PS.ui.button('液态（小水滴）', () => ans(1), 'btn btn-sm'));
    const qa = h('span', { class: 'small' });
    q.append(qa);
    el.append(PS.ui.row(seg.el), q, msg);
    function ans(i) { qa.innerHTML = i ? '<b class="hl-g">✔ 对！</b>水蒸气是看不见的，看得见的“白气”是<b>液化形成的小水滴</b>。' : '<b class="hl-r">✘ 不对。</b>水蒸气是无色透明的气体，看不见。看得见的“白气”是<b>小水滴</b>（液态）。'; i ? PS.sound.good() : PS.sound.bad(); }
    function upd() { msg.innerHTML = MIST[st.k].text + '<br><span class="muted">🔍 点击画面上任意位置，用“分子放大镜”看看那里是什么。</span>'; }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const sc = MIST[st.k];
      const rate = st.k === 'bottle' ? 0 : st.k === 'ice' ? 22 : 40;
      for (let i = 0; i < rate * dt * 3; i++) {
        if (st.k === 'ice') st.ps.push({ x: 500 + PS.rand(-40, 40), y: PS.rand(120, 250), vx: PS.rand(-12, 12), vy: PS.rand(25, 45), age: PS.rand(0.2, 0.6), life: PS.rand(2.4, 3.4), r: PS.rand(10, 18) });
        else st.ps.push({ x: sc.src[0], y: sc.src[1], vx: sc.dir[0] * PS.rand(160, 220) + PS.rand(-15, 15), vy: sc.dir[1] * 180 + PS.rand(-25, 15), age: 0, life: PS.rand(1.8, 2.4), r: PS.rand(5, 9) });
      }
      st.ps.forEach((p) => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 0.9; p.vy *= 1 - dt * 0.6; p.r += dt * 18; if (st.k !== 'ice') p.vy -= dt * 8; });
      st.ps = st.ps.filter((p) => p.age < p.life);
      S.render();
    }, S.stage);
    // 某位置“白气”的浓度：离源头太近（还是水蒸气）或太远（又汽化了）都看不见
    const vis = (p) => { const k = p.age / p.life; if (st.k === 'ice') return Math.min(1, k * 4) * (1 - k); return k < 0.1 ? 0 : k < 0.3 ? (k - 0.1) / 0.2 : 1 - (k - 0.3) / 0.7; };
    function field(x, y) {
      const sc = MIST[st.k];
      if (st.k === 'bottle') { const onWall = Math.abs(Math.abs(x - 500) - 62) < 16 && y > 150 && y < 360; return { vapor: 0.35, drops: onWall ? 1 : 0, wall: onWall }; }
      let drops = 0, vapor = 0.25;
      st.ps.forEach((p) => { const d = Math.hypot(p.x - x, p.y - y); if (d < p.r + 12) { drops = Math.max(drops, vis(p)); if (st.k !== 'ice') vapor = Math.max(vapor, 1 - p.age / p.life); } });
      if (st.k !== 'ice' && Math.hypot(x - sc.src[0], y - sc.src[1]) < 60) { vapor = 1; drops = Math.min(drops, 0.1); }
      return { vapor, drops };
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const sc = MIST[st.k];
      ctx.fillStyle = st.k === 'breath' ? '#364fc7' : '#5c677d'; ctx.fillRect(0, 0, VW, VH); // 深色背景，白气更明显
      ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 360, VW, 60);
      if (st.k === 'kettle') {
        ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(150, 330); ctx.quadraticCurveTo(140, 200, 250, 190); ctx.quadraticCurveTo(360, 200, 350, 330); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(330, 250); ctx.lineTo(385, 192); ctx.stroke();
        ctx.fillStyle = '#495057'; ctx.fillRect(120, 330, 260, 30);
        ctx.fillStyle = '#4dabf7'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(160 + i * 36, 362, 10, 6 + Math.sin(st.t * 14 + i) * 2, 0, 0, TAU); ctx.fill(); }
        D.text(ctx, '看不见（水蒸气）', 395, 150, { size: F(13), weight: 800, color: '#ffe066' });
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(420, 160); ctx.lineTo(400, 185); ctx.stroke();
      } else if (st.k === 'ice') {
        ctx.fillStyle = '#c5a880'; ctx.fillRect(492, 250, 16, 110);
        ctx.fillStyle = '#e7f5ff'; D.roundRect(ctx, 460, 110, 80, 150, 22); ctx.fill();
        ctx.fillStyle = '#ffc9c9'; D.roundRect(ctx, 460, 110, 80, 60, 22); ctx.fill();
        D.text(ctx, '冰棍', 560, 120, { size: F(14), weight: 800, color: '#fff' });
      } else if (st.k === 'breath') {
        ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(250, 200, 80, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(225, 175, 8, 0, TAU); ctx.arc(285, 175, 8, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(310, 215, 14, 10, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#e03131'; ctx.fillRect(170, 120, 160, 26);
        D.text(ctx, '冬天：室外 −5 ℃', 40, 40, { size: F(15), weight: 800, color: '#fff' });
      } else {
        ctx.fillStyle = 'rgba(165,216,255,.7)'; D.roundRect(ctx, 438, 150, 124, 210, 18); ctx.fill();
        ctx.fillStyle = '#2b8a3e'; ctx.fillRect(470, 110, 60, 44);
        ctx.fillStyle = '#e03131'; ctx.fillRect(438, 210, 124, 70);
        D.text(ctx, '冰镇饮料', 500, 250, { size: F(14), weight: 800, color: '#fff', align: 'center', baseline: 'middle' });
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        for (let i = 0; i < 26; i++) { const sx = i % 2 ? 438 : 562, yy = 160 + ((i * 37) % 190); ctx.beginPath(); ctx.ellipse(sx + (i % 2 ? -1 : 1) * 2, yy + Math.min(8, st.t * 0.6 + (i % 5)), 4, 5.5, 0, 0, TAU); ctx.fill(); }
        D.text(ctx, '夏天：室温 32 ℃', 40, 40, { size: F(15), weight: 800, color: '#fff' });
      }
      // 白气（小水滴）
      st.ps.forEach((p) => {
        const a = vis(p) * 0.22;
        if (a <= 0.01) return;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      });
      D.text(ctx, sc.name, 960, 34, { size: F(16), weight: 800, color: '#fff', align: 'right' });
      // 分子放大镜
      if (st.mag) {
        const { x, y } = st.mag, f = field(x, y);
        const R = 74, cx = PS.clamp(x + (x > 700 ? -130 : 130), R + 6, VW - R - 6), cy = PS.clamp(y - 40, R + 6, VH - R - 6);
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
        const seed = (n) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
        // 空气分子（灰色）
        for (let i = 0; i < 18; i++) { ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.arc(cx - R + seed(i) * 2 * R + Math.sin(st.t * 3 + i) * 4, cy - R + seed(i + 50) * 2 * R + Math.cos(st.t * 3 + i) * 4, 4, 0, TAU); ctx.fill(); }
        // 水蒸气分子（橙色，分散）
        const nv = Math.round(4 + f.vapor * 16);
        for (let i = 0; i < nv; i++) { ctx.fillStyle = '#fd7e14'; ctx.beginPath(); ctx.arc(cx - R + seed(i + 100) * 2 * R + Math.sin(st.t * 5 + i) * 7, cy - R + seed(i + 150) * 2 * R + Math.cos(st.t * 4 + i) * 7, 4, 0, TAU); ctx.fill(); }
        // 小水滴（许多水分子聚在一起）
        const nd = Math.round(f.drops * 4);
        for (let k = 0; k < nd; k++) {
          const dx = cx - 40 + seed(k + 200) * 80, dy = cy - 40 + seed(k + 250) * 80;
          ctx.fillStyle = 'rgba(165,216,255,.6)'; ctx.beginPath(); ctx.arc(dx, dy, 20, 0, TAU); ctx.fill();
          for (let j = 0; j < 7; j++) { const a = (j / 7) * TAU; ctx.fillStyle = '#1c7ed6'; ctx.beginPath(); ctx.arc(dx + Math.cos(a) * 10 * (j % 2 ? 1 : 0.4), dy + Math.sin(a) * 10 * (j % 2 ? 1 : 0.4), 4, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        const what = f.drops > 0.35 ? '小水滴（液态）：看得见' : f.vapor > 0.6 ? '水蒸气（气态）：看不见' : '空气 + 少量水蒸气';
        D.text(ctx, what, cx, cy + R + 18, { size: F(13), weight: 800, color: f.drops > 0.35 ? '#1c7ed6' : '#e8590c', align: 'center', baseline: 'middle', bg: '#fff' });
      }
      ctx.restore();
    }
    S.canvas.addEventListener('click', (e) => { const p = S.pos(e); st.mag = { x: (p.x / S.w) * VW, y: (p.y / S.h) * VH }; });
    upd(); loop.start();
  });

  /* ================= 车窗上的水珠在哪一侧？ ================= */
  const CAR = {
    summer: { name: '夏天，车内开冷气', out: 35, inn: 20, side: 'out', why: '夏天车外的空气温度高、含有大量水蒸气，遇到被冷气吹凉的车窗玻璃，在<b>车窗外侧</b>液化成小水珠。所以要开雨刮器。' },
    winter: { name: '冬天，车内开暖气', out: -5, inn: 25, side: 'in', why: '冬天车内的空气温暖，人呼出的水蒸气又多，遇到被室外冷空气冻凉的车窗玻璃，在<b>车窗内侧</b>液化成小水珠。所以要擦车窗内侧或开除雾。' },
  };
  PS.register('car-window', function (el) {
    const VW = 1000, VH = 360;
    const st = { k: 'summer', ans: null, grow: 0, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg(Object.keys(CAR).map((k) => ({ value: k, label: CAR[k].name })), st.k, (v) => { st.k = v; st.ans = null; st.grow = 0; msg.className = 'feedback show info'; msg.innerHTML = '先猜一猜，再看答案。'; });
    const msg = h('div', { class: 'feedback show info' }, '先猜一猜，再看答案。');
    el.append(PS.ui.row(seg.el), PS.ui.row(h('b', null, '小水珠出现在：'), PS.ui.button('车窗外侧', () => guess('out'), 'btn'), PS.ui.button('车窗内侧', () => guess('in'), 'btn')), msg);
    function guess(s) {
      const c = CAR[st.k]; st.ans = s;
      const ok = s === c.side;
      ok ? PS.sound.good() : PS.sound.bad();
      msg.className = 'feedback show ' + (ok ? 'ok' : 'bad');
      msg.innerHTML = (ok ? '✔ 正确！' : '✘ 不对。') + c.why + '<br><b>规律：水珠出现在温度较高、水蒸气较多的一侧。</b>';
    }
    const loop = PS.loop((dt) => { st.t += dt; if (st.ans) st.grow = Math.min(1, st.grow + dt * 0.6); S.render(); }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const c = CAR[st.k], sum = st.k === 'summer';
      ctx.fillStyle = sum ? '#fff3bf' : '#e7f5ff'; ctx.fillRect(0, 0, 480, VH);
      ctx.fillStyle = sum ? '#d0ebff' : '#ffe8cc'; ctx.fillRect(520, 0, 480, VH);
      ctx.fillStyle = 'rgba(165,216,255,.8)'; ctx.fillRect(480, 30, 40, 300);
      ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 2; ctx.strokeRect(480, 30, 40, 300);
      D.text(ctx, '车窗玻璃', 500, 22, { size: F(13), weight: 800, color: '#1c7ed6', align: 'center' });
      D.text(ctx, '车外 ' + PS.fmtT(c.out), 240, 40, { size: F(18), weight: 800, color: sum ? '#e8590c' : '#1c7ed6', align: 'center' });
      D.text(ctx, '车内 ' + PS.fmtT(c.inn), 760, 40, { size: F(18), weight: 800, color: sum ? '#1c7ed6' : '#e8590c', align: 'center' });
      ctx.font = F(34, 22) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(sum ? '☀️' : '❄️', 120, 120); ctx.fillText('🧑', 820, 200);
      if (!sum) ctx.fillText('🔥', 900, 300); else ctx.fillText('❄️', 900, 300);
      D.text(ctx, sum ? '空调冷风' : '暖气', 900, 336, { size: F(12), weight: 700, color: '#495057', align: 'center' });
      // 温暖一侧的水蒸气分子向玻璃运动
      const warmLeft = c.side === 'out';
      for (let i = 0; i < 16; i++) {
        const ph = (st.t * 0.4 + i / 16) % 1;
        const x = warmLeft ? 60 + ph * 410 : 940 - ph * 410, y = 70 + ((i * 53) % 260);
        ctx.fillStyle = 'rgba(253,126,20,' + (0.3 + 0.5 * (1 - ph)) + ')';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
      }
      D.text(ctx, '水蒸气较多', warmLeft ? 240 : 760, 80, { size: F(13), weight: 700, color: '#e8590c', align: 'center' });
      if (st.ans) {
        const sx = c.side === 'out' ? 476 : 524;
        ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) { const r = (3 + (i % 3) * 2) * st.grow; if (r < 0.5) continue; ctx.beginPath(); ctx.ellipse(sx + (c.side === 'out' ? -r : r), 50 + i * 20, r, r * 1.2, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
        D.text(ctx, '小水珠（液化）', c.side === 'out' ? 400 : 600, 190, { size: F(14), weight: 800, color: '#1c7ed6', align: 'center', bg: '#fff' });
      }
      ctx.restore();
    }
    loop.start();
  });

  /* ================= 电冰箱的工作原理（拓展） ================= */
  PS.register('fridge', function (el) {
    const VW = 1000, VH = 460;
    const st = { on: true, t: 0, hover: null };
    // 制冷剂循环的路径（压缩机 → 冷凝器 → 毛细管 → 蒸发器 → 压缩机）
    const P = [[700, 400], [760, 400], [760, 360], [880, 360], [880, 330], [760, 330], [760, 300], [880, 300], [880, 270], [760, 270], [760, 240], [880, 240], [880, 210], [760, 210], [760, 180], [880, 180], [880, 120], [600, 120], [540, 120], [540, 90], [300, 90], [300, 120], [520, 120], [520, 150], [300, 150], [300, 180], [600, 180], [600, 400], [700, 400]];
    const seg = []; let total = 0;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push({ a: P[i - 1], b: P[i], s0: total, l }); total += l; }
    const at = (s) => { s = ((s % total) + total) % total; const g = seg.find((q) => s <= q.s0 + q.l) || seg[seg.length - 1]; const k = (s - g.s0) / g.l; return [g.a[0] + (g.b[0] - g.a[0]) * k, g.a[1] + (g.b[1] - g.a[1]) * k]; };
    // 各段的状态：冷凝器中由气态逐渐液化，蒸发器中由液态逐渐汽化
    const sCond = [seg[1].s0, seg[15].s0 + seg[15].l], sEvap = [seg[18].s0, seg[25].s0 + seg[25].l];
    const gasFrac = (s) => { s = ((s % total) + total) % total; if (s >= sCond[0] && s <= sCond[1]) return 1 - (s - sCond[0]) / (sCond[1] - sCond[0]); if (s > sCond[1] && s < sEvap[0]) return 0; if (s >= sEvap[0] && s <= sEvap[1]) return (s - sEvap[0]) / (sEvap[1] - sEvap[0]); return 1; };
    const N = 70;
    const ps = Array.from({ length: N }, (_, i) => ({ s: (i / N) * total }));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const tg = PS.ui.toggle('压缩机工作', true, (v) => { st.on = v; });
    const msg = h('div', { class: 'feedback show info', html: '电冰箱利用一种既容易<b>汽化</b>又容易<b>液化</b>的物质（制冷剂）做热的“搬运工”：在冰箱内<b>汽化吸热</b>，在冰箱外<b>液化放热</b>，把冰箱里的“热”搬到外面。' });
    el.append(PS.ui.row(tg.el), msg);
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.on) ps.forEach((p) => { const g = gasFrac(p.s); p.s += dt * (60 + 120 * g); }); // 气态时流得快，液态时流得慢（更密集）
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 冰箱外壳
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 4;
      D.roundRect(ctx, 250, 40, 400, 400, 16); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(270, 60, 300, 140);
      D.text(ctx, '冷冻室 约 −18 ℃', 420, 225, { size: F(14), weight: 800, color: '#1c7ed6', align: 'center' });
      ctx.font = F(26, 18) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍗', 340, 300); ctx.fillText('🥦', 420, 300); ctx.fillText('🍦', 380, 360);
      // 管道
      ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 10; ctx.lineJoin = 'round';
      ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(600, 180); ctx.lineTo(600, 400); ctx.stroke();
      // 压缩机
      ctx.fillStyle = '#495057'; D.roundRect(ctx, 660, 370, 90, 60, 12); ctx.fill();
      if (st.on) { ctx.save(); ctx.translate(705, 400); ctx.rotate(st.t * 8); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke(); ctx.restore(); }
      D.text(ctx, '压缩机', 705, 448, { size: F(13), weight: 800, color: '#495057', align: 'center' });
      // 制冷剂
      ps.forEach((p) => {
        const [x, y] = at(p.s), g = gasFrac(p.s);
        ctx.fillStyle = PS.mixColor('#1c7ed6', '#fd7e14', g);
        ctx.beginPath(); ctx.arc(x, y, 4 + 1.5 * (1 - g), 0, TAU); ctx.fill();
      });
      // 吸热、放热的箭头
      if (st.on) {
        const ph = (st.t % 1.2) / 1.2;
        ctx.globalAlpha = 1 - ph;
        for (let i = 0; i < 3; i++) D.arrow(ctx, 340 + i * 70, 290 - ph * 60, 340 + i * 70, 260 - ph * 60 - 40, { color: '#1c7ed6', width: 3, head: 10 });
        for (let i = 0; i < 4; i++) D.arrow(ctx, 900 + ph * 30, 190 + i * 50, 940 + ph * 30, 190 + i * 50, { color: '#e03131', width: 3, head: 10 });
        ctx.globalAlpha = 1;
      }
      D.text(ctx, '蒸发器（冰箱内）：', 40, 110, { size: F(14), weight: 800, color: '#1c7ed6' });
      D.text(ctx, '液态制冷剂汽化', 40, 136, { size: F(13), weight: 700, color: '#1c7ed6' });
      D.text(ctx, '从冷冻室吸热 ↓温度', 40, 160, { size: F(13), weight: 700, color: '#1c7ed6' });
      D.text(ctx, '冷凝器（冰箱背后）：', 770, 70, { size: F(14), weight: 800, color: '#e03131' });
      D.text(ctx, '气态制冷剂液化、放热', 770, 96, { size: F(13), weight: 700, color: '#e03131' });
      D.text(ctx, '● 气态', 40, 380, { size: F(13), weight: 800, color: '#fd7e14' });
      D.text(ctx, '● 液态', 40, 406, { size: F(13), weight: 800, color: '#1c7ed6' });
      ctx.restore();
    }
    loop.start();
  });
})();
