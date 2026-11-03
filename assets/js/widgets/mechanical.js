/* 第11章第4节：机械能及其转化——蹦床 / 斜抛的铅球 / 人造地球卫星 / 弹跳的皮球中的能量转化、转化方向分类、水能和风能的利用。依赖 force.js、dynamics.js、energy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, EN = PS.en, EC = PS.EC;
  const TAU = Math.PI * 2;

  /* ================= 动能和势能的相互转化（四个场景） ================= */
  PS.register('energy-scenes', function (el) {
    const VW = 1000, VH = 440, BX = 720, BW = 260;
    const SC = {
      tramp: { n: '蹦床' }, shot: { n: '斜抛的铅球' }, sat: { n: '人造地球卫星' }, ball: { n: '弹跳的皮球' },
    };
    const st = { s: 'tramp', run: true, slow: false, T: 0 };
    const seg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k].n })), st.s, (v) => { st.s = v; init(); });
    el.append(PS.ui.row(seg.el));
    const SC2 = 1000 / 700; // 手机上：场景放大到整个宽度，能量柱放到下面
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? VH * SC2 + 330 : VH), draw });
    const pB = PS.ui.button('⏸ 暂停', () => { st.run = !st.run; pB.innerHTML = st.run ? '⏸ 暂停' : '▶ 继续'; }, 'btn btn-sm');
    const slowT = PS.ui.toggle('慢动作', st.slow, (v) => { st.slow = v; });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(PS.ui.row(pB, PS.ui.button('↺ 重新开始', () => init(), 'btn btn-ghost btn-sm'), slowT.el), msg);
    let M = {}; // 当前场景的状态
    const g = 10;

    function init() {
      st.T = 0; st.lastMsg = '';
      if (st.s === 'tramp') M = { m: 50, k: 25000, y: 2, v: 0, H0: 2 }; // y：脚离蹦床面的高度（m），蹦床面向下为负
      else if (st.s === 'shot') M = { x: 0, y: 1.8, vx: 7, vy: 7, m: 4, trail: [], done: 0 };
      else if (st.s === 'sat') { const rp = 1.2, ra = 2.6, a = (rp + ra) / 2, GM = 1; M = { GM, x: rp, y: 0, vx: 0, vy: Math.sqrt(GM * (2 / rp - 1 / a)), rp, ra, trail: [] }; }
      else M = { y: 2, v: 0, e: 0.8, q: 0, E0: 2 * g, rest: 0 };
      S.render();
    }
    // 各场景的能量（单位任意，柱状图按初始机械能归一）
    function energies() {
      if (st.s === 'tramp') {
        const ymin = minY(), Ek = 0.5 * M.m * M.v * M.v, Eg = M.m * g * (M.y - ymin), Ee = M.y < 0 ? 0.5 * M.k * M.y * M.y : 0;
        return { list: [{ n: '动能', v: Ek, c: EC.k }, { n: '重力\n势能', v: Eg, c: EC.g }, { n: '弹性\n势能', v: Ee, c: EC.e }], E: Ek + Eg + Ee };
      }
      if (st.s === 'shot') { const Ek = 0.5 * M.m * (M.vx * M.vx + M.vy * M.vy), Eg = M.m * g * M.y; return { list: [{ n: '动能', v: Ek, c: EC.k }, { n: '重力\n势能', v: Eg, c: EC.g }], E: Ek + Eg }; }
      if (st.s === 'sat') { const r = Math.hypot(M.x, M.y), Ek = 0.5 * (M.vx * M.vx + M.vy * M.vy), Eg = M.GM * (1 / M.rp - 1 / r); return { list: [{ n: '动能', v: Ek, c: EC.k }, { n: '势能', v: Eg, c: EC.g }], E: Ek + Eg }; }
      const Ek = 0.5 * M.v * M.v, Eg = g * M.y; return { list: [{ n: '动能', v: Ek, c: EC.k }, { n: '重力\n势能', v: Eg, c: EC.g }, { n: '内能\n(增加)', v: M.q, c: EC.q }], E: Ek + Eg };
    }
    function minY() { // 蹦床：最低点（能量守恒）
      const m = M.m, k = M.k, H = M.H0; // mg(H − y) = ½ky²，y < 0
      return (m * g - Math.sqrt(m * g * m * g + 2 * k * m * g * H)) / k;
    }
    function step(dt) {
      const n = 20, h1 = dt / n;
      for (let i = 0; i < n; i++) {
        if (st.s === 'tramp') { const a = -g + (M.y < 0 ? (-M.k * M.y) / M.m : 0); M.v += a * h1; M.y += M.v * h1; }
        else if (st.s === 'shot') { if (M.done) break; M.vy -= g * h1; M.x += M.vx * h1; M.y += M.vy * h1; if (M.y <= 0) { M.y = 0; M.done = 1; M.vx = 0; M.vy = 0; } }
        else if (st.s === 'sat') { const r = Math.hypot(M.x, M.y), a = -M.GM / (r * r * r); M.vx += a * M.x * h1; M.vy += a * M.y * h1; M.x += M.vx * h1; M.y += M.vy * h1; }
        else {
          if (M.rest) break;
          M.v -= g * h1; M.y += M.v * h1;
          if (M.y <= 0 && M.v < 0) { const E1 = 0.5 * M.v * M.v; M.v = -M.v * M.e; M.q += E1 - 0.5 * M.v * M.v; M.y = 0; if (M.v < 0.4) { M.q += 0.5 * M.v * M.v; M.v = 0; M.rest = 1; } PS.sound.tick(); }
        }
      }
      if (st.s === 'shot') { if (!M.trail.length || Math.hypot(M.x - M.trail[M.trail.length - 1][0], M.y - M.trail[M.trail.length - 1][1]) > 0.35) M.trail.push([M.x, M.y]); if (M.done && (M.done += dt) > 2.5) init(); }
      if (st.s === 'sat') { M.trail.push([M.x, M.y]); if (M.trail.length > 400) M.trail.shift(); }
      if (st.s === 'ball' && M.rest && (M.rest += dt) > 3) init();
    }
    function describe() {
      if (st.s === 'tramp') {
        if (M.y > 0.02) return M.v < 0 ? '<b>下落</b>：高度减小、速度增大，<span class="en-g">重力势能</span>转化为<span class="en-k">动能</span>。' : '<b>上升</b>：速度减小、高度增大，<span class="en-k">动能</span>转化为<span class="en-g">重力势能</span>；到最高点时动能为零。';
        return M.v < 0 ? '<b>压下蹦床</b>：蹦床发生弹性形变，运动员的<span class="en-k">动能</span>（和重力势能）转化为蹦床的<span class="en-e">弹性势能</span>；最低点时速度为零，弹性势能最大。' : '<b>被弹起</b>：蹦床恢复原状，<span class="en-e">弹性势能</span>转化为运动员的<span class="en-k">动能</span>和<span class="en-g">重力势能</span>。';
      }
      if (st.s === 'shot') return M.done ? '铅球落地。' : M.vy > 0 ? '<b>上升</b>：<span class="en-k">动能</span>转化为<span class="en-g">重力势能</span>。到达<b>最高点</b>时铅球仍在水平方向运动，<b>动能不为零</b>！' : '<b>下落</b>：<span class="en-g">重力势能</span>转化为<span class="en-k">动能</span>，速度越来越大。';
      if (st.s === 'sat') { const r = Math.hypot(M.x, M.y), out = M.x * M.vx + M.y * M.vy > 0; return (out ? '从<b>近地点</b>向<b>远地点</b>运动：离地球越来越远，速度越来越小，<span class="en-k">动能</span>转化为<span class="en-g">势能</span>。' : '从<b>远地点</b>向<b>近地点</b>运动：<span class="en-g">势能</span>转化为<span class="en-k">动能</span>，速度越来越大。') + '卫星在大气层外运行，不受空气阻力，<b>机械能守恒</b>。' + (r < M.rp * 1.03 ? '（近地点：动能最大，势能最小）' : r > M.ra * 0.98 ? '（远地点：势能最大，动能最小）' : ''); }
      return M.rest ? '皮球最后停在地上，机械能全部转化成了<span class="en-q">内能</span>。' : '皮球每次落地都会损失一些机械能（转化为<span class="en-q">内能</span>），所以弹起的高度越来越低——<b>机械能减小</b>。如果只有动能和势能相互转化，机械能的总量保持不变。';
    }
    PS.loop((dt) => {
      if (!st.run) return;
      const k = st.slow ? 0.25 : st.s === 'sat' ? 1.2 : 0.6;
      st.T += dt; step(dt * k);
      const t = describe(); if (t !== st.lastMsg) { st.lastMsg = t; msg.innerHTML = t; }
      S.render();
    }, el).start();

    function draw(ctx, w, hh, VHc) {
      const F0 = PS.virtual(ctx, w, hh, VW, VHc), nar = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VHc);
      let F = F0;
      if (nar) { ctx.save(); ctx.scale(SC2, SC2); F = (p, m) => F0(p, m) / SC2; }
      if (st.s === 'tramp') {
        const PX = 80, GY = 350, ty = GY + Math.min(0, M.y) * -PX; // 蹦床面
        ctx.fillStyle = '#495057'; ctx.fillRect(170, GY - 4, 12, 90); ctx.fillRect(518, GY - 4, 12, 90);
        ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(176, GY); ctx.quadraticCurveTo(350, ty + (ty - GY), 524, GY); ctx.stroke();
        const fy = GY - M.y * PX; // 脚
        const tuck = M.y < 0 ? 0.25 : 0;
        FO.person(ctx, 350, fy, { h: 150, color: '#e64980', stride: 0.12 + tuck, hand: { x: 350 - 40, y: fy - 150 - (M.v > 0 ? 20 : -10) }, hand2: { x: 390, y: fy - 150 - (M.v > 0 ? 20 : -10) } });
        for (let m = 0; m <= 2; m++) { const y = GY - m * PX; ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(90, y); ctx.stroke(); D.text(ctx, m + ' m', 54, y + 4, { size: F(12), align: 'right', color: '#868e96' }); }
      } else if (st.s === 'shot') {
        const PX = 52, GY = 370, X0 = 60;
        FO.ground(ctx, 0, BX - 20, GY, { depth: 60 });
        ctx.fillStyle = '#adb5bd'; M.trail.forEach((p) => { ctx.beginPath(); ctx.arc(X0 + p[0] * PX, GY - p[1] * PX, 3, 0, TAU); ctx.fill(); });
        const x = X0 + M.x * PX, y = GY - M.y * PX;
        EN.ball(ctx, x, y - 9, 11, '#adb5bd', '#343a40');
        if (!M.done) {
          D.arrow(ctx, x, y - 9, x + M.vx * 9, y - 9 - M.vy * 9, { color: EC.k, width: 2.5, head: 9 });
          D.text(ctx, 'v', x + M.vx * 9 + 8, y - 9 - M.vy * 9, { size: F(15), weight: 800, color: EC.k });
        }
        FO.person(ctx, X0 - 10, GY, { h: 120, color: '#3b5bdb', hand: { x: X0 + 2, y: GY - 96 } });
      } else if (st.s === 'sat') {
        const cx = 330, cy = 220, PX = 70;
        const ge = ctx.createRadialGradient(cx - 14, cy - 14, 6, cx, cy, 50);
        ge.addColorStop(0, '#a5d8ff'); ge.addColorStop(0.6, '#1c7ed6'); ge.addColorStop(1, '#1864ab');
        ctx.fillStyle = ge; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(64,192,87,.8)'; ctx.beginPath(); ctx.ellipse(cx - 10, cy - 8, 18, 12, 0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + 18, cy + 16, 12, 8, -0.4, 0, TAU); ctx.fill();
        // 轨道
        const a = (M.rp + M.ra) / 2, c = a - M.rp, b = Math.sqrt(a * a - c * c);
        ctx.strokeStyle = '#ced4da'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx - c * PX, cy, a * PX, b * PX, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '近地点', cx + M.rp * PX + 8, cy + 5, { size: F(14), weight: 800, color: EC.k });
        D.text(ctx, '远地点', cx - M.ra * PX - 8, cy + 5, { size: F(14), weight: 800, color: EC.g, align: 'right' });
        const sx = cx + M.x * PX, sy = cy - M.y * PX;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(-M.vy, M.vx));
        ctx.fillStyle = '#fab005'; ctx.fillRect(-7, -7, 14, 14); ctx.fillStyle = '#3b5bdb'; ctx.fillRect(-7, -22, 14, 12); ctx.fillRect(-7, 10, 14, 12);
        ctx.restore();
        D.arrow(ctx, sx, sy, sx + M.vx * 45, sy - M.vy * 45, { color: EC.k, width: 2.5, head: 9 });
        D.text(ctx, '（示意图，不按比例）', 20, VH - 16, { size: F(12), color: '#868e96' });
      } else {
        const PX = 130, GY = 360;
        FO.ground(ctx, 0, BX - 20, GY, { depth: 60 });
        for (let m = 0; m <= 2; m += 0.5) { const y = GY - m * PX; ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(80, y); ctx.lineTo(BX - 40, y); ctx.stroke(); ctx.setLineDash([]); D.text(ctx, m + ' m', 74, y + 4, { size: F(12), align: 'right', color: '#868e96' }); }
        const squash = M.y < 0.03 && !M.rest ? 0.75 : 1;
        ctx.save(); ctx.translate(360, GY - 24 * squash - M.y * PX); ctx.scale(1 / squash, squash);
        EN.ball(ctx, 0, 0, 24, '#ffa8a8', '#c92a2a'); ctx.restore();
      }
      if (nar) ctx.restore();
      const E = energies();
      const E0 = st.s === 'tramp' ? M.m * g * (M.H0 - minY()) : st.s === 'ball' ? M.E0 : st.s === 'shot' ? 0.5 * 4 * 98 + 4 * g * 1.8 : E.E + 0;
      if (st.s === 'sat' && !M.E0) M.E0 = E.E;
      EN.bars(ctx, nar ? 30 : BX, nar ? VH * SC2 + 10 : 40, nar ? 940 : BW, nar ? 300 : 360, E.list.concat([{ n: '机械\n能', v: E.E, c: EC.m }]), { F: F0, max: (st.s === 'sat' ? M.E0 : E0) * 1.05, values: false, title: '能量（示意）', lines: 2 });
    }
    init();
  });

  /* ================= 分一分：能量怎样转化 ================= */
  PS.register('convert-sort', function (el) {
    PS.sortCards(el, [
      ['雪橇从山坡上加速滑下', 0, '高度减小、速度增大。'],
      ['苹果从树上落下', 0, '重力势能转化为动能。'],
      ['瀑布的水从高处落下', 0, '重力势能转化为动能。'],
      ['滚摆下降', 0, '高度减小，转得越来越快。'],
      ['竖直向上抛出的篮球正在上升', 1, '速度减小、高度增大。'],
      ['自行车不蹬车冲上斜坡', 1, '速度减小、高度增大。'],
      ['荡秋千从最低点荡向最高点', 1, '动能转化为重力势能。'],
      ['卫星从近地点向远地点运行', 1, '速度减小、离地球越来越远。'],
      ['拉弯的弓把箭射出去', 2, '弓的弹性势能转化为箭的动能。'],
      ['被压缩的弹簧把小球弹出', 2, '弹性势能转化为动能。'],
      ['上紧发条的玩具车跑起来', 2, '发条的弹性势能转化为车的动能。'],
      ['撑竿跳运动员起跳时把竿压弯', 3, '人的动能转化为竿的弹性势能。'],
      ['运动员落到蹦床上把蹦床压下去', 3, '动能转化为蹦床的弹性势能。'],
      ['网球撞到球拍上，网面凹陷', 3, '动能转化为网面的弹性势能。'],
    ], ['重力势能→动能', '动能→重力势能', '弹性势能→动能', '动能→弹性势能']);
  });

  /* ================= 水能和风能的利用 ================= */
  PS.register('hydro-wind', function (el) {
    const VW = 1000, VH = 440;
    const st = { mode: 'hydro', H: 80, Q: 60, wind: 8, T: 0, ang: 0 };
    const mSeg = PS.ui.seg([{ value: 'hydro', label: '💧 水力发电' }, { value: 'wind', label: '🌬️ 风力发电' }], st.mode, (v) => { st.mode = v; build(); });
    el.append(PS.ui.row(mSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div'), msg = h('div', { class: 'fc-msg info' });
    el.append(ctl, msg);
    const Phydro = () => 1000 * 10 * st.Q * st.H * 0.9; // W
    const Pwind = () => Math.min(3e6, 0.5 * 1.29 * Math.PI * 50 * 50 * Math.pow(st.wind, 3) * 0.4); // 叶轮直径 100 m，风能利用系数 0.4，额定 3 MW
    function build() {
      ctl.innerHTML = '';
      if (st.mode === 'hydro') {
        const s1 = PS.ui.slider({ label: '上下游水位差 h', min: 20, max: 120, step: 10, value: st.H, unit: 'm', onInput: (v) => { st.H = v; tell(); } });
        const s2 = PS.ui.slider({ label: '每秒流过水轮机的水', min: 20, max: 200, step: 20, value: st.Q, unit: 'm³', onInput: (v) => { st.Q = v; tell(); } });
        s1.el.classList.add('wide'); s2.el.classList.add('wide');
        ctl.append(PS.ui.row(s1.el), PS.ui.row(s2.el));
      } else {
        const s1 = PS.ui.slider({ label: '风速 v', min: 0, max: 15, step: 1, value: st.wind, unit: 'm/s', onInput: (v) => { st.wind = v; tell(); } });
        s1.el.classList.add('wide');
        ctl.append(PS.ui.row(s1.el));
      }
      tell();
    }
    function tell() {
      if (st.mode === 'hydro') msg.innerHTML = '修筑拦河坝<b>提高上游水位</b>，水的<span class="en-g">重力势能</span>增大；水从高处流下，重力势能转化为<span class="en-k">动能</span>，冲击坝底的<b>水轮机</b>，水轮机带动<b>发电机</b>发电。水位差越大、流过的水越多，发电功率越大：现在约 <b>' + PS.fmt(Phydro() / 1e6, 0) + ' MW</b>（即 ' + PS.fmt(Phydro() / 1e7, 1) + ' 万千瓦，按 90% 的效率估算）。';
      else msg.innerHTML = '风吹动风车的叶片，空气的<span class="en-k">动能</span>转化为叶轮转动的动能，带动<b>发电机</b>发电。风速越大，发电功率越大（风速增大到 2 倍，功率增大到约 8 倍），现在约 <b>' + PS.fmt(Pwind() / 1e6, 2) + ' MW</b>（叶轮直径 100 m 的风力发电机，最大 3 MW）。单台的功率不大，在风力资源丰富的地区装上几十到几百台，组成“<b>风车田</b>”。';
      S.render();
    }
    PS.loop((dt) => {
      st.T += dt;
      st.ang += dt * (st.mode === 'wind' ? Math.min(1.6, st.wind * 0.14) : 2);
      S.render();
    }, el).start();
    function bulbs(ctx, x, y, n, F) {
      for (let i = 0; i < 6; i++) {
        const on = i < n, bx = x + (i % 3) * 46, by = y + Math.floor(i / 3) * 56;
        if (on) { const g = ctx.createRadialGradient(bx, by, 2, bx, by, 26); g.addColorStop(0, 'rgba(255,224,102,.95)'); g.addColorStop(1, 'rgba(255,224,102,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, 26, 0, TAU); ctx.fill(); }
        ctx.fillStyle = on ? '#ffe066' : '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bx, by, 12, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#868e96'; ctx.fillRect(bx - 5, by + 11, 10, 7);
      }
      D.text(ctx, '用户', x + 46, y - 22, { size: F(13), weight: 700, align: 'center', color: '#495057' });
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'hydro') {
        const GY = 400, PX = 2.4, top = GY - 60 - st.H * PX; // 下游水面 GY − 60
        ctx.fillStyle = '#c2a36b'; ctx.fillRect(0, GY, VW, VH - GY);
        // 上游水库
        ctx.fillStyle = 'rgba(28,126,214,.55)'; ctx.fillRect(0, top, 330, GY - top);
        ctx.strokeStyle = '#1864ab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(330, top); ctx.stroke();
        // 坝
        ctx.fillStyle = '#adb5bd'; ctx.strokeStyle = '#495057'; ctx.beginPath(); ctx.moveTo(330, 60); ctx.lineTo(380, 60); ctx.lineTo(470, GY); ctx.lineTo(330, GY); ctx.closePath(); ctx.fill(); ctx.stroke();
        // 下游
        ctx.fillStyle = 'rgba(28,126,214,.45)'; ctx.fillRect(470, GY - 60, VW - 470, 60);
        // 引水管道与水轮机
        ctx.strokeStyle = 'rgba(28,126,214,.85)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(330, GY - 70); ctx.lineTo(420, GY - 40); ctx.stroke();
        const sp = st.Q / 60;
        ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { const t = ((st.T * sp * 0.8 + i / 4) % 1); ctx.beginPath(); ctx.arc(330 + 90 * t, GY - 70 + 30 * t, 3, 0, TAU); ctx.fill(); }
        ctx.save(); ctx.translate(430, GY - 36); ctx.rotate(st.ang * sp);
        ctx.fillStyle = '#495057'; for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.fillRect(0, -3, 22, 6); }
        ctx.restore();
        // 发电机
        ctx.fillStyle = '#495057'; ctx.fillRect(415, 30, 30, GY - 100); ctx.fillStyle = '#f08c00'; D.roundRect(ctx, 395, 20, 70, 44, 8); ctx.fill();
        D.text(ctx, '发电机', 430, 48, { size: F(13), weight: 800, align: 'center', color: '#fff' });
        D.text(ctx, '水轮机', 470, GY - 16, { size: F(13), weight: 800, color: '#1b2333' });
        // 水位差
        D.arrow(ctx, 300, (top + GY - 60) / 2, 300, top, { color: EC.g, width: 2, head: 8 }); D.arrow(ctx, 300, (top + GY - 60) / 2, 300, GY - 60, { color: EC.g, width: 2, head: 8 });
        ctx.strokeStyle = EC.g; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(300, GY - 60); ctx.lineTo(470, GY - 60); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, 'h = ' + st.H + ' m', 290, (top + GY - 60) / 2 + 5, { size: F(15), weight: 800, align: 'right', color: EC.g, bg: 'rgba(255,255,255,.8)' });
        D.text(ctx, '拦河坝', 355, 52, { size: F(13), weight: 800, align: 'center', color: '#495057' });
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(465, 42); ctx.lineTo(760, 42); ctx.lineTo(760, 120); ctx.stroke();
        bulbs(ctx, 740, 140, Math.min(6, Math.ceil(Phydro() / 3e7)), F);
        D.text(ctx, 'P ≈ ' + PS.fmt(Phydro() / 1e6, 0) + ' MW', 800, 290, { size: F(18), weight: 800, align: 'center', color: '#e8590c' });
        D.text(ctx, '重力势能 → 动能 → 电能', 800, 290 + F(18) * 1.5, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      } else {
        const GY = 380;
        ctx.fillStyle = '#b2f2bb'; ctx.fillRect(0, GY, VW, VH - GY);
        // 风
        ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
        for (let i = 0; i < Math.round(st.wind * 0.8); i++) { const x = ((st.T * st.wind * 30 + i * 137) % 700) - 60, y = 70 + (i * 53) % 260; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30, y - 8, x + 60, y); ctx.stroke(); }
        // 风车田：远处几台小的，近处一台大的
        const mill = (x, y, s, ang) => {
          ctx.fillStyle = '#f8f9fa'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x - 6 * s, GY); ctx.lineTo(x - 3 * s, y); ctx.lineTo(x + 3 * s, y); ctx.lineTo(x + 6 * s, GY); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
          for (let k = 0; k < 3; k++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.moveTo(0, -3 * s); ctx.quadraticCurveTo(40 * s, -7 * s, 80 * s, 0); ctx.quadraticCurveTo(40 * s, 4 * s, 0, 3 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); }
          ctx.restore();
          ctx.fillStyle = '#dee2e6'; ctx.beginPath(); ctx.arc(x, y, 6 * s, 0, TAU); ctx.fill(); ctx.stroke();
        };
        [[560, 250, 0.45], [640, 270, 0.4], [710, 255, 0.42], [790, 275, 0.38], [860, 260, 0.4]].forEach(([x, y, s], i) => mill(x, y, s, st.ang + i));
        mill(300, 150, 1.6, st.ang);
        bulbs(ctx, 820, 70, Math.min(6, Math.round(Pwind() / 5e5)), F);
        D.text(ctx, 'P ≈ ' + PS.fmt(Pwind() / 1e6, 2) + ' MW', 866, 210, { size: F(18), weight: 800, align: 'center', color: '#e8590c' });
        D.text(ctx, '风车田', 710, 300, { size: F(14), weight: 800, align: 'center', color: '#2b8a3e' });
      }
    }
    build();
  });
})();
