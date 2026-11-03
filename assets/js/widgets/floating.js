/* 第10章第3节：物体的浮沉条件及应用——小瓶浮沉、鸡蛋与盐水、浮沉与密度、冰熔化后的液面、轮船、热气球、密度计、是不是利用浮力。依赖 force.js、dynamics.js、pressure.js、buoyancy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, FL = PS.fl, PR = PS.pr;
  const TAU = Math.PI * 2;

  /** 根据运动状态给出浮沉状态：held 被手拿着；b = { y, v }；full 浸没时 y 的下限；floor 容器底 */
  function stateOf(b, full, floor, held) {
    if (held) return 'held';
    if (b.v < -0.004) return 'up';
    if (b.v > 0.004) return 'down';
    if (b.y >= floor - 1e-5) return 'bottom';
    if (b.y < full - 1e-5) return 'float';
    return 'suspend';
  }
  const SN = { held: '手拿着', up: '上浮', down: '下沉', bottom: '沉底', float: '漂浮', suspend: '悬浮' };

  /* ================= 小瓶的浮沉 ================= */
  PS.register('float-sink', function (el, opts) {
    const VW = 1000, VH = 460, TX = 70, TW = 480, TT = 60, TB = 444, LV = 112, PX = 1400, CX = 310;
    const VB = 50e-6, HB = 0.08, AB = VB / HB, M0 = 0.018, CAP = 40; // 瓶子体积 50 cm³、高 8 cm、空瓶 18 g、容积 40 cm³
    const FLOOR = (TB - 3 - LV) / PX;
    const st = { f: 0, liq: 'water', held: true, b: { y: 0.15, v: 0 }, r: null, rows: [], rt: 0 };
    const lSeg = PS.ui.seg(['water', 'salt', 'alcohol'].map((k) => ({ value: k, label: PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; hold(); });
    el.append(PS.ui.row(lSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sF = PS.ui.slider({ label: '小瓶中装水', min: 0, max: 100, step: 5, value: 0, unit: '%', onInput: (v) => { st.f = v / 100; hold(); } });
    sF.el.classList.add('wide');
    const relB = PS.ui.button('浸没后松手', () => { st.held = false; st.b.v = 0; st.rt = 0; tell(); }, 'btn btn-primary btn-sm');
    const holdB = PS.ui.button('重新浸没', hold, 'btn btn-ghost btn-sm');
    const rd = { m: PS.ui.readout('瓶和水的质量', '—'), G: PS.ui.readout('重力 G', '—'), B: PS.ui.readout('浸没时的浮力', '—'), r: PS.ui.readout('平均密度 ρ物', '—') };
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sF.el), PS.ui.row(relB, holdB), h('div', { class: 'fl-read' }, Object.values(rd).map((r) => r.el)), msg);
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    let recB = null;
    if (opts.lab) {
      recB = PS.ui.button('📝 记录这次实验', record, 'btn btn-green btn-sm');
      el.append(PS.ui.row(recB, PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')),
        h('div', { class: 'grid-2', style: { marginTop: '8px', alignItems: 'start' } },
          h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, ['液体', '瓶中水', '现象', 'F浮 与 G', 'ρ物 与 ρ液'].map((t) => h('th', null, t)))), tbody)),
          h('div', { class: 'panel' }, h('h4', null, '分析论证'), ana)));
    }
    const mass = () => M0 + CAP * st.f * 1e-3;
    const rho = () => PS.LIQ[st.liq].rho;
    const sub = (y) => AB * PS.clamp(y, 0, HB);
    function hold() { st.held = true; st.b.y = 0.15; st.b.v = 0; st.rt = 0; tell(); }
    const cmp = (a, b) => (Math.abs(a - b) < 1e-9 ? '=' : a > b ? '>' : '<');
    /** 刚松手时速度还很小，按合力判断上浮还是下沉 */
    function cur() {
      if (st.held) return 'held';
      const s = stateOf(st.b, HB, FLOOR, false);
      if (st.rt < 0.6 && s === 'suspend') { const d = mass() * 10 - rho() * 10 * sub(st.b.y); return Math.abs(d) < 1e-9 ? 'suspend' : d > 0 ? 'down' : 'up'; }
      return s;
    }
    function tell() {
      const m = mass(), G = m * 10, Fb = rho() * 10 * VB, ro = m / VB / 1000, rl = rho() / 1000;
      rd.m.set(PS.fmt(m * 1000, 0) + ' g'); rd.G.set(PS.fmt(G, 2) + ' N'); rd.B.set('<span style="color:' + FC.B + '">' + PS.fmt(Fb, 2) + ' N</span>'); rd.r.set(PS.fmt(ro, 2) + ' g/cm³');
      const s = cur();
      const c = cmp(Fb, G);
      let t;
      if (st.held) t = '小瓶浸没在' + PS.LIQ[st.liq].name + '中，浸没时 F浮 ' + c + ' G（ρ物 ' + cmp(ro, rl) + ' ρ液 = ' + PS.fmt(rl, 1) + ' g/cm³）。猜一猜松手后小瓶会怎样，再点“浸没后松手”。';
      else if (s === 'up') t = 'F浮 > G，合力向上，小瓶<b>上浮</b>。';
      else if (s === 'down') t = 'F浮 < G，合力向下，小瓶<b>下沉</b>。';
      else if (s === 'float') t = '小瓶最终<b>漂浮</b>在液面上：露出液面后 V排 变小，浮力减小到与重力相等，F浮 = G = ' + PS.fmt(G, 2) + ' N。此时 ρ物 < ρ液。';
      else if (s === 'suspend') t = '小瓶<b>悬浮</b>在液体中，可以停在任何深度：F浮 = G，ρ物 = ρ液。';
      else t = '小瓶<b>沉底</b>：F浮 < G，容器底对它有支持力，F浮 + F支 = G。此时 ρ物 > ρ液。';
      msg.className = 'fc-msg ' + (st.held ? 'info' : s === 'up' || s === 'down' ? 'info' : 'ok'); msg.innerHTML = t;
      if (recB) recB.disabled = st.held || s === 'up' || s === 'down';
      st.lastS = s; S.render();
    }
    function record() {
      const s = cur();
      if (st.held || s === 'up' || s === 'down') return;
      const m = mass(), G = m * 10, Fb = rho() * 10 * VB;
      const r = { liq: st.liq, f: st.f, s: s === 'float' ? '上浮，最后漂浮' : s === 'suspend' ? '悬浮' : '下沉，最后沉底', c: cmp(Fb, G), d: cmp(m / VB, rho()) };
      if (st.rows.some((x) => x.liq === r.liq && x.f === r.f)) { msg.className = 'fc-msg bad'; msg.innerHTML = '这组已经记录过了，改变瓶中的水量或换一种液体。'; PS.sound.bad(); return; }
      st.rows.push(r); if (st.rows.length > 10) st.rows.shift(); PS.sound.good(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, PS.LIQ[r.liq].name), h('td', null, Math.round(r.f * 100) + '%'), h('td', null, r.s), h('td', null, h('b', null, 'F浮 ' + r.c + ' G')), h('td', null, 'ρ物 ' + r.d + ' ρ液'))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '还没有数据')));
      const has = (c) => st.rows.some((r) => r.c === c);
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + '</div>';
      let s = line(has('>'), '浸没时 F浮 > G：物体<b>上浮</b>，最后漂浮（ρ物 < ρ液）') + line(has('<'), '浸没时 F浮 < G：物体<b>下沉</b>，最后沉底（ρ物 > ρ液）') + line(has('='), 'F浮 = G：物体<b>悬浮</b>（ρ物 = ρ液）');
      if (has('>') && has('<') && has('=')) s += '<div class="tip tip-good" style="margin:8px 0 0">物体的浮沉取决于它受到的<b>浮力和重力</b>的大小关系；改变重力（瓶中的水量）或浮力（换液体），就能改变物体的浮沉。</div>';
      ana.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      if (st.held) return;
      st.rt += dt;
      st.r = FL.step(st.b, dt * 0.35, { m: mass(), sub, rho: rho(), floor: FLOOR, c: 4 });
      const s = cur();
      if (s !== st.lastS) tell(); else S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'back' });
      const bot = LV + st.b.y * PX, top = bot - HB * PX, bw = 40;
      // 小瓶：玻璃瓶身、瓶中的水、瓶盖
      ctx.fillStyle = 'rgba(255,255,255,.5)'; D.roundRect(ctx, CX - bw / 2, top + 10, bw, bot - top - 10, 6); ctx.fill();
      if (st.f > 0) { const ih = (bot - top - 16) * st.f; ctx.fillStyle = 'rgba(28,126,214,.55)'; ctx.fillRect(CX - bw / 2 + 3, bot - 3 - ih, bw - 6, ih); }
      ctx.strokeStyle = '#5c7cfa'; ctx.lineWidth = 2; D.roundRect(ctx, CX - bw / 2, top + 10, bw, bot - top - 10, 6); ctx.stroke();
      ctx.fillStyle = '#364fc7'; ctx.fillRect(CX - bw / 2 + 2, top, bw - 4, 12);
      FL.water(ctx, TX, TT, TW, TB - TT, LV, st.liq);
      FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'front' });
      // 受力
      const m = mass(), G = m * 10, Fb = rho() * 10 * sub(st.b.y), k = 190, list = [{ n: 'G', v: G, c: FC.G, side: 1 }, { n: 'F浮', v: Fb, c: FC.B, up: true }];
      if (st.held) { const Fh = G - Fb; if (Math.abs(Fh) > 1e-4) list.push(Fh > 0 ? { n: 'F手', v: Fh, c: FC.F, up: true } : { n: 'F手', v: -Fh, c: FC.F, dx: 26, side: -1 }); FL.hand(ctx, CX + 2, top - 2, Math.PI / 2, { s: 1 }); }
      else if (st.b.y >= FLOOR - 1e-5 && G > Fb) list.push({ n: 'F支', v: G - Fb, c: FC.N, up: true });
      FL.forces(ctx, CX, (top + bot) / 2, list, { k, F, d: 2, gap: 40 });
      // 右侧状态
      const s = cur();
      D.text(ctx, SN[s], 790, 120, { size: F(30), weight: 800, align: 'center', color: s === 'up' ? FC.B : s === 'down' ? FC.G : '#1b2333' });
      const ro = m / VB / 1000, rl = rho() / 1000;
      D.text(ctx, 'ρ物 = ' + PS.fmt(ro, 2) + ' g/cm³', 790, 200, { size: F(17), weight: 700, align: 'center', color: '#495057' });
      D.text(ctx, 'ρ液 = ' + PS.fmt(rl, 2) + ' g/cm³', 790, 200 + F(17) * 1.5, { size: F(17), weight: 700, align: 'center', color: PS.LIQ[st.liq].c2 });
      D.text(ctx, '浸没时：F浮 ' + cmp(rho() * 10 * VB, G) + ' G', 790, 200 + F(17) * 3.2, { size: F(18), weight: 800, align: 'center', color: '#1b2333' });
    }
    tell(); table(); loop.start();
  });

  /* ================= 鸡蛋与盐水 ================= */
  PS.register('egg-salt', function (el) {
    const VW = 1000, VH = 440, BX = 330, BW = 300, BT = 70, BB = 420, PX = 1000, VE = 55e-6, RE = 0.034, RHOE = 1.06e3;
    const st = { rho: 1.0, V: 1000, b: { y: 0, v: 0 }, grains: [], stir: 0, lastS: '' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const saltB = PS.ui.button('🥄 加一勺盐，搅拌', () => { if (st.rho >= 1.2 - 1e-6) { PS.toast('盐水已经很浓了，盐溶解不了了'); return; } st.rho = PS.round(Math.min(1.2, st.rho + 0.02 * (1000 / st.V)), 4); for (let i = 0; i < 26; i++) st.grains.push({ x: 470 + PS.rand(-30, 30), y: 40 + PS.rand(-10, 10), v: PS.rand(80, 160) }); st.stir = 1.2; PS.sound.tick(); tell(); }, 'btn btn-sm');
    const waterB = PS.ui.button('💧 加 100 mL 清水', () => { if (st.V >= 1600) { PS.toast('烧杯快满了'); return; } st.rho = PS.round((st.rho * st.V + 100) / (st.V + 100), 4); st.V += 100; st.stir = 1.2; tell(); }, 'btn btn-sm');
    const resetB = PS.ui.button('重来', () => { st.rho = 1.0; st.V = 1000; st.b.y = floor(); st.b.v = 0; tell(); }, 'btn btn-ghost btn-sm');
    const rd = { r: PS.ui.readout('液体的密度', '—'), e: PS.ui.readout('鸡蛋的平均密度', '1.06 g/cm³'), s: PS.ui.readout('鸡蛋的状态', '—') };
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(saltB, waterB, resetB), h('div', { class: 'fl-read' }, Object.values(rd).map((r) => r.el)), msg);
    const level = () => BB - 2 - st.V / 5;
    const floor = () => (BB - 4 - level()) / PX;
    const sub = (y) => VE * FL.capFrac(y, RE);
    st.b.y = floor();
    function tell() {
      const s = stateOf(st.b, 2 * RE, floor(), false);
      rd.r.set(PS.fmt(st.rho, 2) + ' g/cm³'); rd.s.set(SN[s]);
      const r = st.rho * 1000;
      let t = Math.abs(r - RHOE) < 0.5 ? '盐水的密度<b>等于</b>鸡蛋的平均密度，鸡蛋可以<b>悬浮</b>在盐水中：F浮 = G。' : r < RHOE ? '液体的密度<b>小于</b>鸡蛋的密度，鸡蛋浸没时 F浮 < G，' + (s === 'down' ? '正在下沉。' : '沉在杯底。') + '往水里加盐试试。' : '盐水的密度<b>大于</b>鸡蛋的密度，鸡蛋浸没时 F浮 > G，' + (s === 'up' ? '正在上浮。' : '最后漂浮，盐水越浓，露出得越多。') + '再加清水会怎样？';
      msg.className = 'fc-msg ' + (s === 'suspend' || s === 'float' ? 'ok' : 'info'); msg.innerHTML = t;
      st.lastS = s; S.render();
    }
    const loop = PS.loop((dt) => {
      const fl = floor();
      if (st.b.y > fl) st.b.y = fl;
      FL.step(st.b, dt * 0.6, { m: VE * RHOE, sub, rho: st.rho * 1000, floor: fl, c: 2 });
      st.grains.forEach((g) => { g.y += g.v * dt; g.v += 300 * dt; });
      st.grains = st.grains.filter((g) => g.y < level() + 40);
      st.stir = Math.max(0, st.stir - dt);
      const s = stateOf(st.b, 2 * RE, fl, false);
      if (s !== st.lastS) tell(); else S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const lv = level(), cx = BX + BW / 2, ey = lv + st.b.y * PX - RE * PX;
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(200, BB, 560, 14);
      FL.vessel(ctx, BX, BT, BW, BB - BT, { part: 'back' });
      const g = ctx.createRadialGradient(cx - 8, ey - 12, 4, cx, ey, 36); g.addColorStop(0, '#fff8f0'); g.addColorStop(1, '#e8c9a0');
      ctx.fillStyle = g; ctx.strokeStyle = '#c9a77a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, ey, 26, 34, 0, 0, TAU); ctx.fill(); ctx.stroke();
      // 盐水颜色随浓度变化
      const k = (st.rho - 1) / 0.2;
      ctx.save(); ctx.globalAlpha = 1;
      const col = 'rgba(' + Math.round(77 - 45 * k) + ',' + Math.round(171 + 30 * k) + ',' + Math.round(247 - 96 * k) + ',.4)';
      ctx.beginPath(); ctx.rect(BX + 1.5, lv, BW - 3, BB - lv - 1.5); ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(BX + 1.5, lv); ctx.lineTo(BX + BW - 1.5, lv); ctx.stroke();
      ctx.restore();
      st.grains.forEach((gr) => { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 0.6; ctx.fillRect(gr.x, gr.y, 4, 4); ctx.strokeRect(gr.x, gr.y, 4, 4); });
      if (st.stir > 0) { const a = st.stir * 8; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 100 + Math.sin(a) * 30, BT - 40); ctx.lineTo(cx + 60 + Math.sin(a) * 50, BB - 30); ctx.stroke(); }
      FL.vessel(ctx, BX, BT, BW, BB - BT, { part: 'front', ticks: [[BB - 2 - 200, '1000 mL'], [BB - 2 - 300, '1500 mL']] });
      const m = VE * RHOE, G = m * 10, Fb = st.rho * 1e4 * sub(st.b.y), list = [{ n: 'G', v: G, c: FC.G, side: 1 }, { n: 'F浮', v: Fb, c: FC.B, up: true }];
      if (st.b.y >= floor() - 1e-5 && G > Fb + 1e-6) list.push({ n: 'F支', v: G - Fb, c: FC.N, up: true });
      FL.forces(ctx, cx, ey, list, { k: 120, F, values: false, gap: 30 });
      const s = stateOf(st.b, 2 * RE, floor(), false);
      D.text(ctx, SN[s], 830, 140, { size: F(30), weight: 800, align: 'center' });
      D.text(ctx, 'ρ液 = ' + PS.fmt(st.rho, 2) + ' g/cm³', 830, 200, { size: F(17), weight: 700, align: 'center', color: '#1864ab' });
      D.text(ctx, 'ρ蛋 ≈ 1.06 g/cm³', 830, 200 + F(17) * 1.5, { size: F(17), weight: 700, align: 'center', color: '#a06000' });
    }
    tell(); loop.start();
  });

  /* ================= 浮沉与密度（体积相同的实心球） ================= */
  const BALLS = [['木', 0.6, '#f1cf98', '#c98d3e'], ['冰', 0.9, '#e7f5ff', '#74c0fc'], ['塑料', 1.1, '#d0bfff', '#845ef7'], ['铝', 2.7, '#f1f3f5', '#adb5bd'], ['铁', 7.9, '#ced4da', '#495057'], ['金', 19.3, '#ffe066', '#e8a400']];
  PS.register('density-float', function (el) {
    const VW = 1000, VH = 500, TX = 40, TW = 920, TT = 180, TB = 484, LV = 230, PX = 1000, R = 0.03, V = (4 / 3) * Math.PI * R * R * R;
    const FLOOR = (TB - 3 - LV) / PX;
    const st = { liq: 'water', bs: BALLS.map(() => ({ y: 0.14, v: 0 })), keys: [] };
    const lSeg = PS.ui.seg(['alcohol', 'water', 'salt', 'mercury'].map((k) => ({ value: k, label: PS.LIQ[k].name + '（' + PS.LIQ[k].rho / 1000 + '）' })), st.liq, (v) => { st.liq = v; again(); });
    lSeg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(lSeg.el, PS.ui.button('重新浸没后松手', again, 'btn btn-ghost btn-sm')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg' });
    el.append(msg, h('div', { class: 'small muted', style: { marginTop: '4px' } }, '六个实心球的体积相同；密度 ρ 的单位是 g/cm³。'));
    function again() { st.bs.forEach((b) => { b.y = 0.14; b.v = 0; }); tell(); }
    const rho = () => PS.LIQ[st.liq].rho;
    function tell() {
      let s = '浸没时六个球的浮力<b>相同</b>（V排 相同），但重力不同：ρ物 < ρ液 的上浮，最后漂浮；ρ物 > ρ液 的下沉到底。<br>漂浮时：F浮 = G，即 ρ液gV排 = ρ物gV，所以 <b>V排/V = ρ物/ρ液</b>——物体的密度是液体的几分之几，就有几分之几浸在液体中。';
      if (st.liq === 'mercury') s += '<br>🎉 水银的密度是 13.6 g/cm³，<b>铁球、铝球都能漂浮在水银面上</b>！只有金球沉底。';
      if (st.liq === 'alcohol') s += '<br>冰的密度 0.9 g/cm³ 大于酒精的 0.8 g/cm³，冰块在酒精中<b>下沉</b>。';
      msg.className = 'fc-msg info'; msg.innerHTML = s; S.render();
    }
    const loop = PS.loop((dt) => {
      st.bs.forEach((b, i) => FL.step(b, dt * 0.5, { m: V * BALLS[i][1] * 1000, sub: (y) => V * FL.capFrac(y, R), rho: rho(), floor: FLOOR, c: 14 }));
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'back' });
      const dx = TW / BALLS.length;
      BALLS.forEach(([n, r, c1, c2], i) => {
        const x = TX + dx * (i + 0.5), b = st.bs[i], y = LV + b.y * PX - R * PX;
        FO.ball(ctx, x, y, R * PX, c1, c2);
        const y1 = 12 + F(15), y2 = y1 + F(12) * 1.35, y3 = y2 + F(13) * 1.35, y4 = y3 + F(12) * 1.3;
        D.text(ctx, n, x, y1, { size: F(15), weight: 800, align: 'center', color: '#1b2333' });
        D.text(ctx, 'ρ = ' + r, x, y2, { size: F(12), align: 'center', color: '#495057' });
        const s = stateOf(b, 2 * R, FLOOR, false), frac = FL.capFrac(b.y, R), col = s === 'float' ? '#2b8a3e' : s === 'bottom' ? '#c92a2a' : '#495057';
        D.text(ctx, SN[s], x, y3, { size: F(13), weight: 800, align: 'center', color: col });
        if (s === 'float') D.text(ctx, '浸入 ' + Math.round(frac * 100) + '%', x, y4, { size: F(12), weight: 700, align: 'center', color: col });
      });
      FL.water(ctx, TX, TT, TW, TB - TT, LV, st.liq);
      if (st.liq === 'mercury') BALLS.forEach(([n, r, c1, c2], i) => { // 水银不透明：沉底的球画成半透明的虚影
        const b = st.bs[i]; if (b.y < 2 * R) return;
        const x = TX + dx * (i + 0.5), y = LV + b.y * PX - R * PX;
        ctx.save(); ctx.globalAlpha = 0.45; FO.ball(ctx, x, y, R * PX, c1, c2); ctx.restore();
        ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#495057'; ctx.beginPath(); ctx.arc(x, y, R * PX, 0, TAU); ctx.stroke(); ctx.restore();
      });
      FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'front' });
    }
    tell(); loop.start();
  });

  /* ================= 冰熔化后液面怎样变化 ================= */
  const ICE = {
    water: { name: '纯冰浮在水中', liq: 1.0, inc: null },
    salt: { name: '纯冰浮在盐水中', liq: 1.2, inc: null },
    stone: { name: '冰中有小石块', liq: 1.0, inc: { m: 6, rho: 2.5, c: '#495057' } },
    wood: { name: '冰中有小木块', liq: 1.0, inc: { m: 6, rho: 0.5, c: '#c98d3e' } },
  };
  PS.register('ice-melt', function (el) {
    const VW = 1000, VH = 440, BX = 150, BW = 300, BT = 120, BB = 420, A = 50, PXC = 10, VS = 600, MI = 90, ZOOM = 30;
    const st = { k: 'water', t: 0, run: false };
    const seg = PS.ui.seg(Object.keys(ICE).map((k) => ({ value: k, label: ICE[k].name })), st.k, (v) => { st.k = v; st.t = 0; st.run = false; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const goB = PS.ui.button('▶ 开始熔化', () => { if (st.t >= 1) st.t = 0; st.run = true; tell(); }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(goB, PS.ui.button('重来', () => { st.t = 0; st.run = false; tell(); }, 'btn btn-ghost btn-sm')), msg);
    /** t 时刻：返回 { Vtot（液体 + 被排开的体积，cm³）, mi 剩余冰, sunk, rhoL, d 浸入深度 cm, s 冰块边长 cm } */
    function state(t) {
      const C = ICE[st.k], inc = C.inc, mi = MI * (1 - t), melt = MI * t;
      const rhoL = (C.liq * VS + melt) / (VS + melt);
      const Vliq = VS + melt;
      const mInc = inc ? inc.m : 0, vInc = inc ? inc.m / inc.rho : 0;
      let Vd, sunk = false, d = 0, sd = Math.cbrt(mi / 0.9 + vInc);
      if (mi > 0.05) {
        const M = mi + mInc, Vt = mi / 0.9 + vInc;
        if (M < rhoL * Vt) Vd = M / rhoL; else { Vd = Vt; sunk = true; }
        d = Vd / (sd * sd);
      } else if (inc) {
        if (inc.rho < rhoL) Vd = mInc / rhoL; else { Vd = vInc; sunk = true; }
        sd = Math.cbrt(vInc); d = Math.min(sd, Vd / (sd * sd));
      } else Vd = 0;
      return { Vtot: Vliq + Vd, mi, sunk, rhoL, d, s: sd };
    }
    const lvOf = (V) => BB - 2 - (V / A) * PXC;
    function tell() {
      const a = state(0), b = state(1), dv = b.Vtot - a.Vtot;
      let s;
      if (st.t < 1) s = '冰块（' + MI + ' g）' + (ICE[st.k].inc ? '里冻着一个 ' + ICE[st.k].inc.m + ' g 的小' + (st.k === 'stone' ? '石块' : '木块') + '，' : '') + '漂浮在' + (st.k === 'salt' ? '盐水' : '水') + '中。冰全部熔化后，液面会上升、下降还是不变？先猜一猜，再点“开始熔化”。右边的放大图把液面的变化放大了 ' + ZOOM + ' 倍。';
      else {
        const T = {
          water: '<b>液面不变。</b>冰漂浮：F浮 = G冰，ρ水gV排 = m冰g，V排 = m冰/ρ水；冰熔化成水，质量不变，V化 = m冰/ρ水 = V排，正好“填满”原来排开的体积。',
          salt: '<b>液面上升。</b>冰漂浮在盐水中：V排 = m冰/ρ盐水；熔化成的水 V化 = m冰/ρ水 > V排，所以液面上升。',
          stone: '<b>液面下降。</b>石块随冰漂浮时，为它排开的水的体积是 m石/ρ水；冰熔化后石块沉底，只排开 V石 = m石/ρ石 < m石/ρ水，所以液面下降。',
          wood: '<b>液面不变。</b>冰熔化后木块仍然漂浮，为它排开的水的体积 m木/ρ水 不变；冰熔化成的水正好填满冰原来排开的体积。',
        }[st.k];
        s = T + '（液面变化 ' + (Math.abs(dv) < 0.01 ? '0' : PS.fmt((dv / A) * 10, 1) + ' mm') + '）';
      }
      msg.className = 'fc-msg ' + (st.t >= 1 ? 'ok' : 'info'); msg.innerHTML = s;
      goB.disabled = st.run;
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (!st.run) return;
      st.t = Math.min(1, st.t + dt / 6);
      if (st.t >= 1) { st.run = false; tell(); } else S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const C = ICE[st.k], a = state(st.t), a0 = state(0), lv = lvOf(a.Vtot), lv0 = lvOf(a0.Vtot), cx = BX + BW / 2;
      const kind = st.k === 'salt' ? 'salt' : 'water';
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(60, BB, 880, 14);
      FL.vessel(ctx, BX, BT, BW, BB - BT, { part: 'back' });
      const sp = a.s * PXC * 1.6; // 冰块画大一些（示意）
      const top = a.sunk ? BB - 3 - sp : lv + a.d * PXC * 1.6 - sp;
      if (a.mi > 0.05) {
        ctx.fillStyle = 'rgba(231,245,255,.95)'; ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 2;
        D.roundRect(ctx, cx - sp / 2, top, sp, sp, 6); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - sp / 2 + 8, top + 10); ctx.lineTo(cx - sp / 2 + 8, top + sp * 0.5); ctx.stroke();
        if (C.inc) { ctx.fillStyle = C.inc.c; ctx.beginPath(); ctx.ellipse(cx, top + sp * 0.62, 10, 7, 0.3, 0, TAU); ctx.fill(); }
      } else if (C.inc) {
        const s2 = a.s * PXC * 1.6, t2 = a.sunk ? BB - 3 - s2 : lv + a.d * PXC * 1.6 - s2;
        ctx.fillStyle = C.inc.c; D.roundRect(ctx, cx - s2 / 2, t2, s2, s2, 4); ctx.fill();
      }
      FL.water(ctx, BX, BT, BW, BB - BT, lv, kind);
      FL.vessel(ctx, BX, BT, BW, BB - BT, { part: 'front' });
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(BX - 20, lv0); ctx.lineTo(BX + BW + 20, lv0); ctx.stroke(); ctx.restore();
      D.text(ctx, '原来的液面', BX + BW + 24, lv0 + 4, { size: F(12), color: '#e8590c' });
      // 放大图
      const gx = 620, gy = 90, gw = 260, gh = 260, mid = gy + gh / 2;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2; D.roundRect(ctx, gx, gy, gw, gh, 12); ctx.fill(); ctx.stroke();
      const dz = ((a.Vtot - a0.Vtot) / A) * PXC * ZOOM;
      ctx.save(); D.roundRect(ctx, gx + 1, gy + 1, gw - 2, gh - 2, 11); ctx.clip();
      const L = PS.LIQ[kind]; ctx.fillStyle = L.c; ctx.fillRect(gx, mid - dz, gw, gh); ctx.strokeStyle = L.c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, mid - dz); ctx.lineTo(gx + gw, mid - dz); ctx.stroke();
      ctx.setLineDash([6, 4]); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, mid); ctx.lineTo(gx + gw, mid); ctx.stroke(); ctx.setLineDash([]);
      for (let i = -5; i <= 5; i++) { const yy = mid - i * 20; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx + 8, yy); ctx.lineTo(gx + (i % 5 ? 18 : 30), yy); ctx.stroke(); }
      ctx.restore();
      D.text(ctx, '🔍 液面附近（放大 ' + ZOOM + ' 倍）', gx + gw / 2, gy - 12, { size: F(13), weight: 700, color: '#3b5bdb', align: 'center' });
      const tx = Math.abs(dz) < 0.5 ? '不变' : dz > 0 ? '上升' : '下降';
      D.text(ctx, st.t > 0 ? '液面' + tx : '', gx + gw / 2, gy + gh + 30, { size: F(18), weight: 800, color: Math.abs(dz) < 0.5 ? '#2b8a3e' : '#e8590c', align: 'center' });
      D.text(ctx, '剩余的冰：' + Math.round(a.mi) + ' g', cx, BT - 20, { size: F(13), weight: 700, color: '#1864ab', align: 'center' });
    }
    tell(); loop.start();
  });

  /* ================= 轮船 ================= */
  PS.register('ship', function (el) {
    const VW = 1000, VH = 420;
    const st = { k: 'clay', boat: false, coins: 0, d: 0, by: 0, bv: 0, sea: false, cargo: 2000, dd: 0 };
    const seg = PS.ui.seg([{ value: 'clay', label: '橡皮泥小船' }, { value: 'sea', label: '轮船从河里驶入海里' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const shapeB = PS.ui.button('把橡皮泥捏成小船', () => { st.boat = !st.boat; st.coins = 0; st.by = 0; st.bv = 0; shapeB.innerHTML = st.boat ? '把小船捏回实心球' : '把橡皮泥捏成小船'; tell(); }, 'btn btn-sm');
    const coinB = PS.ui.button('放 1 枚硬币', () => add(1), 'btn btn-sm'), coin5 = PS.ui.button('放 5 枚', () => add(5), 'btn btn-sm');
    const clearB = PS.ui.button('取下硬币', () => { st.coins = 0; st.by = 0; st.bv = 0; tell(); }, 'btn btn-ghost btn-sm');
    const wSeg = PS.ui.seg([{ value: false, label: '在河里（ρ = 1.0×10³ kg/m³）' }, { value: true, label: '在海里（ρ = 1.03×10³ kg/m³）' }], st.sea, (v) => { st.sea = v; tell(); });
    wSeg.el.style.flexWrap = 'wrap';
    const sC = PS.ui.slider({ label: '货物', min: 0, max: 5000, step: 500, value: st.cargo, unit: 't', onInput: (v) => { st.cargo = v; tell(); } });
    const c1 = PS.ui.row(shapeB, coinB, coin5, clearB), c2 = h('div', null, PS.ui.row(wSeg.el), PS.ui.row(sC.el));
    const rd = { a: PS.ui.readout('', '—'), b: PS.ui.readout('', '—'), c: PS.ui.readout('', '—') };
    const msg = h('div', { class: 'fc-msg' });
    el.append(c1, c2, h('div', { class: 'fl-read' }, Object.values(rd).map((r) => r.el)), msg);
    const MC = 60, VC = 40, VH_ = 260, CM = 10; // 橡皮泥 60 g（40 cm³）；小船最多排开 260 cm³；每枚硬币 10 g
    function add(n) { if (!st.boat) { PS.toast('先把橡皮泥捏成小船'); return; } st.coins += n; tell(); }
    function ctl() { c1.style.display = st.k === 'clay' ? '' : 'none'; c2.style.display = st.k === 'sea' ? '' : 'none'; }
    const label = (r, t, v) => { r.el.querySelector('span').innerHTML = t; r.set(v); };
    function tell() {
      let s, c = 'info';
      if (st.k === 'clay') {
        const m = MC + st.coins * CM;
        if (!st.boat) { s = '实心的橡皮泥球：ρ橡皮泥 = 1.5 g/cm³ > ρ水，浸没时 F浮 = ' + PS.fmt(VC / 100, 2) + ' N < G = ' + PS.fmt(MC / 100, 2) + ' N，<b>下沉</b>。'; }
        else if (m <= VH_) { s = '捏成<b>空心</b>的小船，能排开更多的水，浮力变大，小船<b>漂浮</b>：F浮 = G总 = ' + PS.fmt(m / 100, 2) + ' N，V排 = ' + m + ' cm³。放的硬币越多，船吃水越深。'; c = 'ok'; }
        else { s = '超载了！小船最多能排开 ' + VH_ + ' cm³ 的水，最大浮力 ' + PS.fmt(VH_ / 100, 2) + ' N，小于船和硬币的总重 ' + PS.fmt(m / 100, 2) + ' N，水漫进船里，小船<b>沉没</b>。'; c = 'bad'; }
        label(rd.a, '橡皮泥 + 硬币', m + ' g'); label(rd.b, '重力 G', PS.fmt(m / 100, 2) + ' N'); label(rd.c, '浮力 F浮', PS.fmt(st.boat && m <= VH_ ? m / 100 : VC / 100, 2) + ' N');
        coinB.disabled = coin5.disabled = !st.boat || m > VH_;
      } else {
        const m = 5000 + st.cargo, rho = st.sea ? 1.03 : 1.0;
        label(rd.a, '船和货物的总质量', PS.fmt(m, 0) + ' t'); label(rd.b, 'F浮 = G', PS.pretty(m * 1e4) + ' N'); label(rd.c, 'V排 = m/ρ', PS.fmt(m / rho, 0) + ' m³');
        s = '轮船<b>漂浮</b>，F浮 = G。从河里驶入海里，重力不变，浮力也<b>不变</b>；海水的密度大，由 F浮 = ρ液gV排，V排 变<b>小</b>，船身会<b>上浮</b>一些。轮船的大小用<b>排水量</b>（满载时排开水的质量）表示：这艘船的排水量是 1×10⁴ t，满载时 F浮 = 1×10⁸ N。';
        c = 'ok';
      }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s; S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.k === 'clay') {
        const m = MC + st.coins * CM, sink = !st.boat || m > VH_;
        const tgt = sink ? 1 : m / VH_; // 0~1：吃水比例；>1 表示沉下去
        if (sink) { st.bv += dt * 0.6; st.by = Math.min(1, st.by + st.bv * dt); } else { st.by = 0; st.bv = 0; }
        st.d += (tgt - st.d) * Math.min(1, dt * 4);
      } else {
        const m = 5000 + st.cargo, rhoD = st.sea ? 1.15 : 1.0;
        st.dd += (m / rhoD / 1250 - st.dd) * Math.min(1, dt * 3);
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.k === 'clay') {
        const TX = 200, TW = 600, TT = 110, TB = 410, LV = 180, cx = 500;
        FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'back' });
        const clay = (c) => { c.fillStyle = '#e64980'; c.strokeStyle = '#a61e4d'; c.lineWidth = 2; };
        if (!st.boat) {
          const y = LV + 30 + st.by * (TB - LV - 60);
          clay(ctx); ctx.beginPath(); ctx.arc(cx, y, 26, 0, TAU); ctx.fill(); ctx.stroke();
        } else {
          const H = 56, d = Math.min(st.d, 1) * H, sinkY = st.by * (TB - LV - H - 10), base = LV + d + sinkY;
          clay(ctx); ctx.beginPath(); ctx.moveTo(cx - 130, base - H); ctx.lineTo(cx - 100, base); ctx.lineTo(cx + 100, base); ctx.lineTo(cx + 130, base - H); ctx.lineTo(cx + 118, base - H); ctx.lineTo(cx + 92, base - 10); ctx.lineTo(cx - 92, base - 10); ctx.lineTo(cx - 118, base - H); ctx.closePath(); ctx.fill(); ctx.stroke();
          for (let i = 0; i < st.coins; i++) { const col = i % 12, row = Math.floor(i / 12); ctx.fillStyle = '#fcc419'; ctx.strokeStyle = '#c27c00'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx - 78 + col * 14, base - 14 - row * 6, 7, 3, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
          if (st.by > 0) { ctx.fillStyle = 'rgba(77,171,247,.5)'; ctx.fillRect(cx - 92, base - H + 6, 184, H - 16); }
        }
        FL.water(ctx, TX, TT, TW, TB - TT, LV, 'water');
        FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'front' });
      } else {
        const LV = 230, cx = 470, K = 9, len = 560, Hm = 11;
        const sky = ctx.createLinearGradient(0, 0, 0, LV); sky.addColorStop(0, '#d0ebff'); sky.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, LV);
        const base = LV + st.dd * K, top = base - Hm * K;
        // 船体
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(cx - len / 2, top); ctx.lineTo(cx + len / 2 + 30, top); ctx.lineTo(cx + len / 2, base); ctx.lineTo(cx - len / 2 + 20, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.moveTo(cx - len / 2 + 6, top + 6.5 * K); ctx.lineTo(cx + len / 2 + 30 - 4.5 * K * 0.3, top + 6.5 * K); ctx.lineTo(cx + len / 2, base); ctx.lineTo(cx - len / 2 + 20, base); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f8f9fa'; ctx.fillRect(cx - len / 2 + 30, top - 60, 120, 60); ctx.fillRect(cx - len / 2 + 50, top - 90, 70, 30);
        ctx.fillStyle = '#1c7ed6'; for (let i = 0; i < 4; i++) ctx.fillRect(cx - len / 2 + 40 + i * 26, top - 46, 16, 12);
        [['#f08c00', 0], ['#2f9e44', 1], ['#1c7ed6', 2], ['#e03131', 3]].forEach(([c, i]) => { const n = Math.round((st.cargo / 5000) * 4); if (i < n) { ctx.fillStyle = c; ctx.fillRect(cx - 60 + i * 70, top - 34, 64, 34); } });
        // 载重线（淡水线、海水线）
        const yF = top + (Hm - 10000 / 1.0 / 1250) * K, yS = top + (Hm - 10000 / 1.15 / 1250) * K;
        const mx = cx + 150;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(mx - 40, (yF + yS) / 2, 14, 0, TAU); ctx.moveTo(mx - 60, (yF + yS) / 2); ctx.lineTo(mx - 20, (yF + yS) / 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx, yF); ctx.lineTo(mx + 46, yF); ctx.moveTo(mx, yS); ctx.lineTo(mx + 46, yS); ctx.moveTo(mx, yF); ctx.lineTo(mx, yS); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = PS.font(F(11), 700); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = PS.font(F(10), 700); ctx.fillText('淡水', mx + 50, yF - 8); ctx.fillText('海水', mx + 50, yS + 8);
        const L = st.sea ? PS.LIQ.sea : PS.LIQ.water;
        ctx.fillStyle = L.c; ctx.fillRect(0, LV, VW, VH - LV);
        ctx.strokeStyle = L.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, LV); ctx.lineTo(VW, LV); ctx.stroke();
        D.text(ctx, '吃水深度 ' + PS.fmt((5000 + st.cargo) / (st.sea ? 1.03 : 1.0) / 1250, 2) + ' m', cx + len / 2 + 40, base, { size: F(14), weight: 700, color: '#1b2333' });
        FO.arrow(ctx, cx - 120, base - 20, -Math.PI / 2, 70, { color: FC.B, label: 'F浮', F, labelSide: 1 });
        FO.arrow(ctx, cx - 160, top + 20, Math.PI / 2, 70, { color: FC.G, label: 'G', F, labelSide: -1 });
        D.text(ctx, '示意图：海水与河水中吃水深度的差别放大了 5 倍', 20, VH - 14, { size: F(12), color: '#495057' });
      }
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 热气球 ================= */
  PS.register('balloon', function (el) {
    const VW = 1000, VH = 460, VB = 2500, MB = 600, CD = 67; // 球囊体积 2500 m³，球皮、吊篮和人共 600 kg
    const st = { alt: 0, v: 0, T: 20, burn: false, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const burnB = PS.ui.button('🔥 点火加热', () => { st.burn = !st.burn; burnB.innerHTML = st.burn ? '⏹ 停止加热' : '🔥 点火加热'; burnB.className = st.burn ? 'btn btn-sm btn-green' : 'btn btn-sm'; }, 'btn btn-sm');
    const rd = { a: PS.ui.readout('高度', '—'), T: PS.ui.readout('球内空气温度', '—'), F: PS.ui.readout('浮力 F浮', '—'), G: PS.ui.readout('总重力（含球内热空气）', '—') };
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(burnB, PS.ui.button('回到地面', () => { st.alt = 0; st.v = 0; st.T = 20; st.burn = false; burnB.innerHTML = '🔥 点火加热'; burnB.className = 'btn btn-sm'; }, 'btn btn-ghost btn-sm')), h('div', { class: 'fl-read' }, Object.values(rd).map((r) => r.el)), msg);
    function phys() {
      const Ta = 20 - 0.0065 * st.alt, p = PR.atm(st.alt);
      const ro = p / (287 * (Ta + 273.15)), ri = p / (287 * (st.T + 273.15));
      const Fb = ro * 9.8 * VB, G = (MB + ri * VB) * 9.8;
      return { Ta, ro, ri, Fb, G };
    }
    let lastS = '';
    const loop = PS.loop((dt) => {
      st.t += dt;
      const P0 = phys();
      st.T += st.burn ? Math.min(10 * dt, 100 - st.T) : -(st.T - P0.Ta) * 0.035 * dt;
      const sub = 8, h1 = (dt * 10) / sub; // 时间放快 10 倍
      for (let i = 0; i < sub; i++) {
        const P = phys(), mEff = MB + P.ri * VB + 0.5 * P.ro * VB;
        let a = (P.Fb - P.G - CD * st.v * Math.abs(st.v)) / mEff;
        if (st.alt <= 0 && a < 0 && st.v <= 0) { a = 0; st.v = 0; }
        st.v += a * h1; st.alt = Math.max(0, st.alt + st.v * h1);
      }
      const P = phys();
      rd.a.set(PS.fmt(st.alt, 0) + ' m'); rd.T.set(PS.fmt(st.T, 0) + ' ℃'); rd.F.set('<span style="color:' + FC.B + '">' + PS.fmt(P.Fb, 0) + ' N</span>'); rd.G.set(PS.fmt(P.G, 0) + ' N');
      const s = st.alt <= 0.01 && P.Fb <= P.G ? 'ground' : st.v > 0.15 ? 'up' : st.v < -0.15 ? 'down' : 'hover';
      if (s !== lastS) {
        lastS = s;
        msg.className = 'fc-msg ' + (s === 'up' ? 'ok' : 'info');
        msg.innerHTML = {
          ground: '热气球停在地面上：球内空气和外面一样冷，F浮 < G。点火加热，球内空气受热膨胀，一部分从下面的开口跑出去，球内空气的<b>密度变小</b>、重力变小。',
          up: '球内热空气的密度<b>小于</b>外面的空气，F浮 > G总，热气球<b>上升</b>。（F浮 = ρ空气gV球）',
          down: '停止加热后，球内空气变冷，密度变大，外面的冷空气进入球内，总重力<b>增大</b>，F浮 < G总，热气球<b>下降</b>。',
          hover: '浮力和总重力相等，热气球<b>悬停</b>在空中。越往高处空气越稀薄，ρ空气 变小，浮力也变小。',
        }[s];
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const alt = st.alt, by = 200 + Math.max(0, 60 - alt * 2);
      const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, alt > 1500 ? '#74c0fc' : '#a5d8ff'); sky.addColorStop(1, '#e7f5ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
      // 云（远处的视差小）
      [[300, 120], [800, 740], [1500, 300], [2300, 640]].forEach(([ca, x]) => { const y = by - (ca - alt) * 0.25; if (y > -60 && y < VH + 60) { ctx.fillStyle = 'rgba(255,255,255,.9)'; [0, 40, 80].forEach((dx, i) => { ctx.beginPath(); ctx.arc(x + dx, y - (i === 1 ? 14 : 0), 32, 0, TAU); ctx.fill(); }); } });
      // 地面
      const gy = by + 170 + alt * 2;
      if (gy < VH) { ctx.fillStyle = '#b2f2bb'; ctx.fillRect(0, gy, VW, VH - gy); ctx.fillStyle = '#69db7c'; for (let x = 20; x < VW; x += 90) { ctx.beginPath(); ctx.arc(x, gy, 18, Math.PI, 0); ctx.fill(); } }
      // 热气球
      const cx = 420, r = 100, k = PS.clamp((st.T - 20) / 80, 0, 1);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx - 34, by + 92); ctx.bezierCurveTo(cx - r * 1.25, by + 20, cx - r * 1.05, by - r * 1.35, cx, by - r * 1.2); ctx.bezierCurveTo(cx + r * 1.05, by - r * 1.35, cx + r * 1.25, by + 20, cx + 34, by + 92); ctx.closePath();
      const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0); g.addColorStop(0, '#e8590c'); g.addColorStop(0.5, '#ffd43b'); g.addColorStop(1, '#e8590c');
      ctx.fillStyle = g; ctx.fill(); ctx.clip();
      ctx.fillStyle = 'rgba(201,42,42,' + (0.15 + k * 0.3) + ')'; [-60, 0, 60].forEach((dx) => ctx.fillRect(cx + dx - 12, by - 140, 24, 240));
      ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(cx - 34, by + 92); ctx.lineTo(cx - 22, by + 132); ctx.moveTo(cx + 34, by + 92); ctx.lineTo(cx + 22, by + 132); ctx.stroke();
      if (st.burn) { const f = 14 + Math.sin(st.t * 30) * 4; ctx.fillStyle = '#ff922b'; ctx.beginPath(); ctx.moveTo(cx - 8, by + 108); ctx.quadraticCurveTo(cx, by + 108 - f * 2, cx + 8, by + 108); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#a0522d'; ctx.fillRect(cx - 24, by + 132, 48, 34);
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(cx - 8, by + 126, 7, 0, TAU); ctx.arc(cx + 10, by + 126, 7, 0, TAU); ctx.fill();
      const P = phys(), kk = 1 / 900;
      FO.arrow(ctx, cx - 30, by - 20, -Math.PI / 2, P.Fb * kk * 3, { color: FC.B, label: 'F浮', F, labelSide: 1 });
      FO.arrow(ctx, cx + 30, by - 20, Math.PI / 2, P.G * kk * 3, { color: FC.G, label: 'G总', F, labelSide: -1 });
      // 高度计
      const ax = 860, ay0 = 420, ay1 = 60;
      ctx.fillStyle = '#fff'; D.roundRect(ctx, ax - 30, ay1 - 30, 100, ay0 - ay1 + 50, 10); ctx.fill();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax, ay0); ctx.lineTo(ax, ay1); ctx.stroke();
      for (let a = 0; a <= 3000; a += 500) { const y = ay0 - (a / 3000) * (ay0 - ay1); ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(ax + 10, y); ctx.stroke(); D.text(ctx, String(a), ax + 14, y + 4, { size: F(11), color: '#495057' }); }
      const ya = ay0 - (Math.min(alt, 3000) / 3000) * (ay0 - ay1);
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.moveTo(ax - 4, ya); ctx.lineTo(ax - 18, ya - 7); ctx.lineTo(ax - 18, ya + 7); ctx.closePath(); ctx.fill();
      D.text(ctx, '高度/m', ax + 20, ay1 - 12, { size: F(12), weight: 700, align: 'center' });
      D.text(ctx, 'ρ球外 = ' + PS.fmt(P.ro, 3) + ' kg/m³', 30, 36, { size: F(14), weight: 700, color: '#1864ab' });
      D.text(ctx, 'ρ球内 = ' + PS.fmt(P.ri, 3) + ' kg/m³', 30, 36 + F(14) * 1.5, { size: F(14), weight: 700, color: '#e8590c' });
    }
    loop.start();
  });

  /* ================= 密度计 ================= */
  const HYD = [['alcohol', 0.8], ['water', 1.0], ['milk', 1.03], ['salt', 1.2], ['x', 0]];
  PS.register('hydrometer', function (el, opts) {
    const VW = 1000, VH = 460, CX0 = 300, CW = 150, CT = 20, CB = 446, LV = 190, PXC = 8, M = 40, VBULB = 32, AS = 1;
    const st = { k: 'meter', liq: 'water', xr: 1.06, y: 0, dl: 'salt', xr2: 1.1 };
    const seg = PS.ui.seg([{ value: 'meter', label: '用密度计测液体的密度' }, { value: 'diy', label: '自制密度计（吸管 + 铜丝）' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const lSeg = PS.ui.seg(HYD.map(([k]) => ({ value: k, label: k === 'x' ? '未知液体' : PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; if (v === 'x') st.xr = PS.randInt(82, 118) / 100; tell(); });
    const dSeg = PS.ui.seg([{ value: 'salt', label: '盐水' }, { value: 'alcohol', label: '酒精' }, { value: 'x', label: '未知液体' }], st.dl, (v) => { st.dl = v; if (v === 'x') st.xr2 = PS.pick([0.9, 1.1, 1.25, 1.15, 0.85]); tell(); });
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '读数' });
    const fb = h('span', { class: 'q-fb' });
    const ask = h('div', { class: 'fc-ans' }, '液体的密度 ρ =', inp, 'g/cm³', PS.ui.button('核对', check, 'btn btn-primary btn-sm'), fb);
    const msg = h('div', { class: 'fc-msg' });
    const c1 = h('div', null, PS.ui.row(lSeg.el)), c2 = h('div', null, PS.ui.row(dSeg.el));
    el.append(c1, c2, ask, msg);
    function ctl() { c1.style.display = st.k === 'meter' ? '' : 'none'; c2.style.display = st.k === 'diy' ? '' : 'none'; }
    const rhoNow = () => (st.k === 'meter' ? (st.liq === 'x' ? st.xr : PS.LIQ[st.liq].rho / 1000) : st.dl === 'x' ? st.xr2 : PS.LIQ[st.dl].rho / 1000);
    const xOf = (r) => (M / r - VBULB) / AS; // 浸入液体的那段细管长度（cm）
    function tell() {
      inp.value = ''; inp.disabled = false; fb.innerHTML = '';
      let s;
      if (st.k === 'meter') s = '密度计<b>漂浮</b>在液体中，F浮 = G，在任何液体中浮力都<b>相等</b>。由 F浮 = ρ液gV排，液体的密度越大，V排 越小，密度计<b>露出</b>液面的部分越多。所以刻度值<b>上小下大</b>；刻度线<b>上疏下密</b>（不均匀）。读数：看液面所对的刻度（右边是放大图）。';
      else s = '在吸管下端塞入铜丝，使它能竖直漂浮。在水中浸入的深度为 H水，在待测液体中为 H液。漂浮时 F浮 = G 相等：ρ水gSH水 = ρ液gSH液，所以 <b>ρ液 = ρ水 · H水/H液</b>。';
      msg.className = 'fc-msg info'; msg.innerHTML = s; S.render();
    }
    function check() {
      const v = parseFloat(String(inp.value).replace(/[，,\s]/g, ''));
      if (isNaN(v)) return;
      const r = rhoNow(), ok = Math.abs(v - r) <= (st.k === 'meter' ? 0.011 : 0.02);
      fb.className = 'q-fb ' + (ok ? 'ok' : 'bad'); fb.innerHTML = ok ? '✔ 正确！' : '✘ 应该是 ' + PS.fmt(r, 2) + ' g/cm³';
      ok ? PS.sound.good() : PS.sound.bad();
    }
    const loop = PS.loop((dt) => {
      const tg = st.k === 'meter' ? xOf(rhoNow()) : 10 / rhoNow();
      if (Math.abs(st.y - tg) > 0.001) { st.y += (tg - st.y) * Math.min(1, dt * 4); S.render(); }
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const kind = (st.k === 'meter' ? st.liq : st.dl) === 'x' ? 'kerosene' : st.k === 'meter' ? st.liq : st.dl;
      if (st.k === 'meter') {
        const cx = CX0;
        FL.vessel(ctx, cx - CW / 2, CT, CW, CB - CT, { part: 'back' });
        // 密度计：细管长 20 cm，下面是玻璃泡（6 cm）和铅粒（2 cm）
        const stemBot = LV + st.y * PXC, stemTop = stemBot - 20 * PXC;
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = '#5c7cfa'; ctx.lineWidth = 1.6;
        ctx.fillRect(cx - 7, stemTop, 14, 20 * PXC); ctx.strokeRect(cx - 7, stemTop, 14, 20 * PXC);
        ctx.beginPath(); ctx.ellipse(cx, stemBot + 24, 18, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.ellipse(cx, stemBot + 50, 11, 11, 0, 0, TAU); ctx.fill();
        // 刻度（ρ 越大刻度越靠下）
        ctx.strokeStyle = '#c92a2a'; ctx.fillStyle = '#c92a2a'; ctx.lineWidth = 1; ctx.font = PS.font(F(9), 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        for (let r = 0.8; r <= 1.2501; r += 0.01) { const y = stemBot - xOf(r) * PXC, big = Math.round(r * 100) % 10 === 0; ctx.beginPath(); ctx.moveTo(cx - 6, y); ctx.lineTo(cx - (big ? 0 : 3), y); ctx.stroke(); }
        FL.water(ctx, cx - CW / 2, CT, CW, CB - CT, LV, kind);
        FL.vessel(ctx, cx - CW / 2, CT, CW, CB - CT, { part: 'front' });
        D.text(ctx, '铅粒', cx + 16, stemBot + 54, { size: F(12), color: '#495057' });
        // 放大图
        const zx = 560, zy = 70, zw = 220, zh = 300, mid = zy + zh / 2, K = 5.6;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2; D.roundRect(ctx, zx, zy, zw, zh, 12); ctx.fill(); ctx.stroke();
        ctx.save(); D.roundRect(ctx, zx + 1, zy + 1, zw - 2, zh - 2, 11); ctx.clip();
        const L = PS.LIQ[kind]; ctx.fillStyle = L.c; ctx.fillRect(zx, mid, zw, zh);
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(zx + zw / 2 - 30, zy, 60, zh);
        ctx.strokeStyle = '#5c7cfa'; ctx.lineWidth = 2; ctx.strokeRect(zx + zw / 2 - 30, zy - 2, 60, zh + 4);
        ctx.strokeStyle = '#c92a2a'; ctx.fillStyle = '#c92a2a'; ctx.font = PS.font(F(14), 700); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let r = 0.8; r <= 1.2501; r += 0.01) {
          const y = mid + (st.y - xOf(r)) * PXC * K; if (y < zy - 10 || y > zy + zh + 10) continue;
          const rr = Math.round(r * 100), big = rr % 10 === 0, half = rr % 5 === 0;
          ctx.lineWidth = big ? 2.2 : 1.2; ctx.beginPath(); ctx.moveTo(zx + zw / 2 - 30, y); ctx.lineTo(zx + zw / 2 - 30 + (big ? 30 : half ? 20 : 12), y); ctx.stroke();
          if (big || (half && K > 3)) ctx.fillText(PS.fmt(r, 2), zx + zw / 2 - 36, y);
        }
        ctx.strokeStyle = L.c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(zx, mid); ctx.lineTo(zx + zw, mid); ctx.stroke();
        ctx.restore();
        D.text(ctx, '🔍 液面处的刻度', zx + zw / 2, zy - 12, { size: F(13), weight: 700, color: '#3b5bdb', align: 'center' });
        D.text(ctx, '单位：g/cm³', zx + zw / 2, zy + zh + 24, { size: F(12), color: '#495057', align: 'center' });
        D.text(ctx, 'F浮 = G（不变）', 880, 140, { size: F(16), weight: 800, color: FC.B, align: 'center' });
        D.text(ctx, '上小下大', 880, 200, { size: F(15), weight: 700, align: 'center' });
        D.text(ctx, '上疏下密', 880, 200 + F(15) * 1.5, { size: F(15), weight: 700, align: 'center' });
      } else {
        const Lsc = 14; // 吸管 px/cm
        [[200, 'water', '水', 10], [520, kind, st.dl === 'x' ? '待测液体' : PS.LIQ[st.dl].name, st.y]].forEach(([cx, kd, nm, Hd]) => {
          const lv = 150;
          FL.vessel(ctx, cx - 70, 80, 140, 360, { part: 'back' });
          const bot = lv + Hd * Lsc, top = bot - 16 * Lsc;
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = '#e64980'; ctx.lineWidth = 1.6; ctx.fillRect(cx - 7, top, 14, 16 * Lsc); ctx.strokeRect(cx - 7, top, 14, 16 * Lsc);
          ctx.strokeStyle = '#c0702a'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(cx - 6, bot - 4 - i * 4); ctx.lineTo(cx + 6, bot - 6 - i * 4); } ctx.stroke();
          ctx.strokeStyle = '#495057'; ctx.lineWidth = 1; for (let i = 0; i <= 16; i++) { const y = bot - i * Lsc; ctx.beginPath(); ctx.moveTo(cx + 7, y); ctx.lineTo(cx + (i % 5 ? 11 : 15), y); ctx.stroke(); }
          FL.water(ctx, cx - 70, 80, 140, 360, lv, kd);
          FL.vessel(ctx, cx - 70, 80, 140, 360, { part: 'front' });
          D.arrow(ctx, cx - 30, lv, cx - 30, bot, { color: '#1864ab', width: 1.4, head: 7, both: true });
          D.text(ctx, (kd === 'water' && cx === 200 ? 'H水' : 'H液') + ' = ' + PS.fmt(Hd, 1) + ' cm', cx - 36, (lv + bot) / 2, { size: F(13), weight: 800, color: '#1864ab', align: 'right', bg: 'rgba(255,255,255,.85)' });
          D.text(ctx, nm, cx, 62, { size: F(15), weight: 800, align: 'center' });
        });
        D.text(ctx, 'ρ液 = ρ水 · H水/H液', 830, 200, { size: F(18), weight: 800, align: 'center', color: FC.B });
        D.text(ctx, '吸管上每格 1 cm', 830, 200 + F(18) * 1.8, { size: F(13), color: '#495057', align: 'center' });
      }
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 是不是利用浮力 ================= */
  PS.register('buoy-use-sort', function (el) {
    PS.sortCards(el, [
      ['热气球升空', 0, '球内热空气密度小，F浮 > G。'],
      ['轮船浮在水面上', 0, '空心，排开更多的水，漂浮。'],
      ['潜水艇上浮和下潜', 0, '改变自身的重力。'],
      ['用盐水选种', 0, '饱满的种子密度大，下沉。'],
      ['用密度计测液体的密度', 0, '漂浮，F浮 = G。'],
      ['穿救生衣在水中不会下沉', 0, '增大 V排，增大浮力。'],
      ['孔明灯升空', 0, '与热气球的道理相同。'],
      ['用浮筒打捞沉船', 0, '浮筒排出水后浮力大于重力。'],
      ['飞机升空', 1, '机翼上下表面的压强差（流体压强与流速的关系）。'],
      ['火箭升空', 1, '向下喷气，气体对火箭的反作用力（力的作用是相互的）。'],
      ['用吸管喝饮料', 1, '利用大气压。'],
      ['直升机悬停在空中', 1, '旋翼向下推空气，空气对旋翼的反作用力。'],
      ['风筝飞上天空', 1, '风吹风筝，流体压强与流速的关系。'],
      ['船闸让船只通过', 1, '利用连通器的原理。'],
    ], ['利用了浮力', '没有利用浮力']);
  });
})();
