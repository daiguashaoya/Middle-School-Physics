/* 第3章第1节：温度——凭感觉判断冷热、常见的温度、自制温度计、摄氏温度、温度计的使用与读数、体温计。依赖 heat.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const ROOM = 20;

  // 三种温度计（数据依据教案中的比较表）
  const TYPES = {
    lab: { name: '实验室温度计', min: -20, max: 110, div: 1, label: 10, liquid: '#e03131', fluid: '煤油（染红）' },
    clinical: { name: '体温计', min: 35, max: 42, div: 0.1, label: 1, liquid: '#868e96', fluid: '水银' },
    weather: { name: '寒暑表', min: -25, max: 50, div: 1, label: 10, liquid: '#e03131', fluid: '酒精（染红）' },
  };
  PS.THERMO_TYPES = TYPES;

  function drawHand(ctx, x, y, side, tint) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2;
    ctx.fillStyle = side < 0 ? '#4c6ef5' : '#f08c00';
    D.roundRect(ctx, -30, -150, 60, 112, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-30, -50, 60, 10);
    ctx.fillStyle = tint; ctx.strokeStyle = '#c98a5a';
    D.roundRect(ctx, -31, -44, 62, 62, 18); ctx.fill(); ctx.stroke();
    [[-23, 40], [-8, 50], [8, 48], [23, 38]].forEach(([fx, len]) => { D.roundRect(ctx, fx - 7, 4, 14, len, 7); ctx.fill(); ctx.stroke(); });
    ctx.save(); ctx.translate(-side * 28, -18); ctx.rotate(side * 0.55);
    D.roundRect(ctx, -8, 0, 16, 42, 8); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }
  function basin(ctx, x, yTop, T, label, F, showT) {
    const tw = 270, bw = 210, hh = 96;
    ctx.save();
    ctx.fillStyle = PS.waterColor(T, 0.62);
    ctx.beginPath(); ctx.moveTo(x - tw / 2 + 8, yTop + 14); ctx.lineTo(x - bw / 2, yTop + hh); ctx.lineTo(x + bw / 2, yTop + hh); ctx.lineTo(x + tw / 2 - 8, yTop + 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - tw / 2, yTop); ctx.lineTo(x - bw / 2, yTop + hh); ctx.lineTo(x + bw / 2, yTop + hh); ctx.lineTo(x + tw / 2, yTop); ctx.stroke();
    if (T >= 45) {
      ctx.strokeStyle = 'rgba(160,170,190,.6)'; ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 60, yTop - 6); ctx.bezierCurveTo(x + i * 60 - 12, yTop - 26, x + i * 60 + 12, yTop - 36, x + i * 60, yTop - 56); ctx.stroke(); }
    }
    D.text(ctx, label, x, yTop + hh + 26, { size: F(15), weight: 800, color: '#3a4458', align: 'center' });
    if (showT) D.text(ctx, '🌡️ ' + PS.fmtT(T), x, yTop + hh - 22, { size: F(14), weight: 800, color: '#e03131', align: 'center', bg: 'rgba(255,255,255,.9)' });
    ctx.restore();
  }

  /* ================= 凭感觉判断冷热可靠吗 ================= */
  PS.register('hand-feel', function (el) {
    const VW = 1000, VH = 430, WY = 290;
    const B = [{ x: 180, T: 8, name: '冷水' }, { x: 500, T: 28, name: '温水' }, { x: 820, T: 48, name: '热水' }];
    const st = { step: 0, show: false, wait: 0 };
    const hands = [-1, 1].map((side) => ({ side, skin: 32, x: 500 + side * 120, y: 175, tx: 500 + side * 120, ty: 175, at: -1 }));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const b1 = PS.ui.button('① 左手放进冷水，右手放进热水', () => go(1), 'btn btn-primary');
    const b2 = PS.ui.button('② 两只手同时放进温水', () => go(2), 'btn btn-accent');
    const tg = PS.ui.toggle('用温度计测一测', false, (v) => { st.show = v; S.render(); });
    const msg = h('div', { class: 'feedback show info' }, '先把两只手分别放进冷水和热水里，“过一会儿”再同时放进中间的温水里，感受一下。');
    el.append(PS.ui.row(b1, b2, PS.ui.button('↺ 重来', () => go(0), 'btn btn-ghost'), tg.el), msg);
    b2.disabled = true;
    function go(k) {
      st.step = k;
      if (k === 0) { hands.forEach((hd) => { hd.skin = 32; hd.at = -1; hd.tx = 500 + hd.side * 120; hd.ty = 175; }); b2.disabled = true; msg.className = 'feedback show info'; msg.innerHTML = '先把两只手分别放进冷水和热水里，“过一会儿”再同时放进中间的温水里，感受一下。'; }
      if (k === 1) { hands[0].at = 0; hands[1].at = 2; hands.forEach((hd) => { hd.tx = B[hd.at].x; hd.ty = WY + 10; }); st.wait = 3.2; b2.disabled = true; msg.innerHTML = '⏳ 过一会儿……手的温度渐渐接近水的温度。'; }
      if (k === 2) { hands.forEach((hd) => { hd.at = 1; hd.tx = 500 + hd.side * 62; hd.ty = WY + 10; }); st.wait = 0; msg.innerHTML = '两只手放进了<b>同一盆</b>温水，它们的感觉一样吗？'; setTimeout(conclude, 1600); }
      loop.start();
    }
    function conclude() {
      if (st.step !== 2) return;
      msg.className = 'feedback show ok';
      msg.innerHTML = '刚从冷水里拿出来的<b>左手觉得热</b>，从热水里拿出来的<b>右手觉得冷</b>——可它们摸的是同一盆水，温度都是 ' + B[1].T + ' ℃！<br>结论：<b>凭感觉判断物体的冷热是不可靠的</b>。要准确地知道物体的冷热程度，就要用<b>温度计</b>测量<b>温度</b>。';
      if (!st.show) { st.show = true; tg.set(true); }
    }
    function feel(hd) {
      if (hd.at < 0 || Math.abs(hd.y - hd.ty) > 3) return null;
      return B[hd.at].T - hd.skin;
    }
    function feelText(d) {
      if (d > 10) return ['觉得热', '#e03131'];
      if (d > 3) return ['有点热', '#f08c00'];
      if (d < -10) return ['觉得冷', '#1c7ed6'];
      if (d < -3) return ['有点凉', '#4dabf7'];
      return ['不冷不热', '#2b8a3e'];
    }
    const loop = PS.loop((dt) => {
      let moving = false;
      hands.forEach((hd) => {
        if (Math.abs(hd.x - hd.tx) > 2) { hd.y += (175 - hd.y) * Math.min(1, dt * 6); if (hd.y < 190) hd.x += (hd.tx - hd.x) * Math.min(1, dt * 4); }
        else { hd.x = hd.tx; hd.y += (hd.ty - hd.y) * Math.min(1, dt * 5); }
        if (Math.abs(hd.x - hd.tx) + Math.abs(hd.y - hd.ty) > 1) moving = true;
        else if (hd.at >= 0) hd.skin += (B[hd.at].T - hd.skin) * Math.min(1, dt / (st.step === 1 ? 0.9 : 7));
      });
      if (st.step === 1 && !moving) {
        st.wait -= dt;
        if (st.wait <= 0 && b2.disabled) { b2.disabled = false; msg.innerHTML = '手已经适应了水温。现在点击 <b>②</b>，把两只手<b>同时</b>放进温水里。'; }
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, WY + 96, VW, VH);
      hands.forEach((hd) => {
        const tint = hd.skin < 26 ? PS.mixColor('#ffd8a8', '#c5d8f5', (26 - hd.skin) / 16) : PS.mixColor('#ffd8a8', '#ffb3a7', (hd.skin - 32) / 14);
        drawHand(ctx, hd.x, hd.y, hd.side, tint);
      });
      B.forEach((b) => basin(ctx, b.x, WY, b.T, b.name, F, st.show));
      hands.forEach((hd) => {
        const d = feel(hd);
        const bx = st.step === 2 ? hd.x + hd.side * 170 : hd.x - hd.side * 150, by = hd.y - 120;
        D.text(ctx, hd.side < 0 ? '左手' : '右手', hd.x, hd.y - 160, { size: F(13), weight: 800, color: hd.side < 0 ? '#3b5bdb' : '#d9480f', align: 'center' });
        if (d == null) return;
        const [t, c] = feelText(d);
        ctx.save();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = c; ctx.lineWidth = 2.5;
        D.roundRect(ctx, bx - 70, by - 26, 140, 52, 16); ctx.fill(); ctx.stroke();
        const dir = Math.sign(hd.x - bx);
        ctx.beginPath(); ctx.moveTo(bx + dir * 50, by + 24); ctx.lineTo(hd.x - dir * 30, hd.y - 50); ctx.stroke();
        ctx.restore();
        D.text(ctx, '感觉：' + t, bx, by + 1, { size: F(16), weight: 800, color: c, align: 'center', baseline: 'middle' });
      });
      ctx.restore();
    }
    loop.start();
  });

  /* ================= 生活中常见的温度 ================= */
  const TEMPS = [
    { T: -273.15, s: '−273.15 ℃', icon: '🌌', name: '绝对零度', d: '理论上能达到的最低温度，约 −273 ℃（−273.15 ℃），实际上不可能达到。' },
    { T: -196, icon: '⚗️', name: '液态氮', d: '在标准大气压下，液态氮的沸点是 −196 ℃，常用来快速冷冻。' },
    { T: -89.2, s: '−89.2 ℃', icon: '🐧', name: '南极最低气温', d: '人类在南极测到的最低气温约为 −89.2 ℃。' },
    { T: -18, icon: '🍦', name: '冰箱冷冻室', d: '冰箱冷冻室的温度一般约为 −18 ℃。' },
    { T: 0, icon: '❄️', name: '冰水混合物', d: '在标准大气压下，冰水混合物的温度是 0 ℃——这是摄氏温度的规定之一。' },
    { T: 23, icon: '🏠', name: '舒适的室温', d: '让人感觉温暖舒适的房间温度约为 23 ℃。' },
    { T: 37, icon: '🙂', name: '人体正常体温', d: '人体的正常体温约为 37 ℃（腋下约 36~37 ℃）。高于 37.3 ℃ 可能是发烧了。' },
    { T: 40, icon: '🛁', name: '洗澡水', d: '洗澡时适宜的水温约为 40 ℃，略高于体温。' },
    { T: 100, icon: '♨️', name: '沸水', d: '在标准大气压下，沸水的温度是 100 ℃——这是摄氏温度的另一个规定。' },
    { T: 500, icon: '🔥', name: '酒精灯火焰', d: '酒精灯外焰的温度约为 500 ℃。' },
    { T: 1535, icon: '🏭', name: '铁的熔点', d: '铁在 1 535 ℃ 时熔化成铁水，炼钢炉中的温度比这还高。' },
    { T: 2500, icon: '💡', name: '白炽灯丝', d: '白炽灯发光时，钨丝的温度约为 2 500 ℃。' },
    { T: 6000, icon: '☀️', name: '太阳表面', d: '太阳表面的温度约为 6 000 ℃，中心温度高达约 1 500 万 ℃。' },
  ];
  PS.register('temp-ladder', function (el) {
    const VW = 1000, VH = 330, AY = 165;
    const sl = (T) => Math.sign(T) * Math.log10(1 + Math.abs(T) / 20);
    const s0 = sl(-273.15), s1 = sl(6000);
    const X = (T) => 70 + ((sl(T) - s0) / (s1 - s0)) * 860;
    const st = { sel: 6, hover: -1 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'pointer';
    const out = h('div', { class: 'feedback show info' });
    el.append(out);
    // 文字框均匀排列（上下交替），用引线连到真实位置
    const slot = (i) => ({ x: 75 + (i / 2) * (850 / Math.ceil(TEMPS.length / 2 - 1)), y: i % 2 ? 268 : 58 });
    const tstr = (it) => it.s || PS.fmtT(it.T);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      // 横放的温度计（色带由冷到热）
      const g = ctx.createLinearGradient(X(-273), 0, X(6000), 0);
      g.addColorStop(0, '#364fc7'); g.addColorStop((X(0) - X(-273)) / (X(6000) - X(-273)), '#a5d8ff'); g.addColorStop((X(100) - X(-273)) / (X(6000) - X(-273)), '#ffc078'); g.addColorStop(1, '#e03131');
      ctx.fillStyle = g; D.roundRect(ctx, X(-273.15) - 10, AY - 9, X(6000) - X(-273.15) + 20, 18, 9); ctx.fill();
      ctx.fillStyle = '#6b7487'; ctx.font = PS.font(F(11), 600); ctx.textAlign = 'center';
      [-200, -100, -50, 0, 50, 100, 500, 1000, 2000, 5000].forEach((T) => { ctx.fillRect(X(T), AY + 9, 1.2, 6); ctx.fillText((T < 0 ? '−' : '') + Math.abs(T), X(T), AY + 26); });
      ctx.textAlign = 'right'; ctx.fillText('℃（刻度不均匀）', 990, AY + 44);
      TEMPS.forEach((it, i) => {
        const p = slot(i), x = X(it.T), on = st.sel === i, hov = st.hover === i;
        ctx.strokeStyle = on ? '#e8590c' : hov ? '#1b2333' : '#ced4da'; ctx.lineWidth = on ? 2.4 : 1.2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y + (i % 2 ? -22 : 22)); ctx.lineTo(x, AY + (i % 2 ? 10 : -10)); ctx.stroke();
        ctx.fillStyle = on ? '#e8590c' : '#1b2333'; ctx.beginPath(); ctx.arc(x, AY, on ? 6 : 3.5, 0, TAU); ctx.fill();
        ctx.fillStyle = on ? '#fff4e6' : hov ? '#f1f3f5' : '#f8f9fa';
        ctx.strokeStyle = on ? '#e8590c' : '#dee2e6'; ctx.lineWidth = on ? 2 : 1;
        D.roundRect(ctx, p.x - 58, p.y - 22, 116, 44, 10); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = F(17, 13) + 'px ' + PS.FONT; ctx.fillText(it.icon, p.x - 40, p.y);
        ctx.fillStyle = '#1b2333'; ctx.font = PS.font(F(11.5), 700); ctx.fillText(it.name, p.x + 10, p.y - 8);
        ctx.fillStyle = '#e8590c'; ctx.font = PS.font(F(11.5), 800); ctx.fillText(tstr(it), p.x + 10, p.y + 9);
      });
      ctx.restore();
    }
    function hit(e) {
      const p = S.pos(e), x = (p.x / S.w) * VW, y = (p.y / S.h) * VH;
      return TEMPS.findIndex((_, i) => { const s = slot(i); return Math.abs(x - s.x) < 60 && Math.abs(y - s.y) < 24; });
    }
    function upd() {
      const it = TEMPS[st.sel];
      out.innerHTML = it.icon + ' <b>' + it.name + '：' + tstr(it) + '</b>　' + it.d;
      S.render();
    }
    S.canvas.addEventListener('pointermove', (e) => { const i = hit(e); if (i !== st.hover) { st.hover = i; S.render(); } });
    S.canvas.addEventListener('click', (e) => { const i = hit(e); if (i >= 0) { st.sel = i; upd(); } });
    upd();
  });

  /* ================= 自制温度计 ================= */
  // 小瓶装满水，插入细管。水受热膨胀，多出的体积挤进细管：Δh = V·β·ΔT / A
  PS.register('diy-thermo', function (el) {
    const VW = 1000, VH = 470, BOT = 440;
    const BEAK = [{ x: 210, T: 5, name: '冰水' }, { x: 500, T: 40, name: '温水' }, { x: 790, T: 80, name: '热水' }];
    const BETA = 3.2e-4; // 水的平均体膨胀系数（已扣除玻璃的膨胀），1/℃
    const K = 1.6;       // 每毫米多少像素
    const TUBE = 190;    // 细管露出瓶塞的长度（像素）
    const AIR_Y = 200, IN_Y = 330;
    const st = { at: -1, x: 500, y: AIR_Y, T: ROOM, d: 2, V: 10 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const where = PS.ui.seg([{ value: -1, label: '拿在空气中（20 ℃）' }, { value: 0, label: '放进冰水' }, { value: 1, label: '放进温水' }, { value: 2, label: '放进热水' }], -1, (v) => { st.at = v; loop.start(); });
    const tube = PS.ui.seg([{ value: 2, label: '细管（内径 2 mm）' }, { value: 6, label: '粗管（内径 6 mm）' }], 2, (v) => { st.d = v; upd(); S.render(); });
    const vol = PS.ui.seg([{ value: 10, label: '小瓶 10 mL' }, { value: 30, label: '大瓶 30 mL' }], 10, (v) => { st.V = v; upd(); S.render(); });
    const rT = PS.ui.readout('瓶中水温', '—', 'accent');
    const rH = PS.ui.readout('液面比 20 ℃ 时', '—', 'primary');
    const msg = h('div', { class: 'feedback show info small' });
    el.append(PS.ui.row(where.el), PS.ui.row(tube.el, vol.el), h('div', { class: 'readouts' }, rT.el, rH.el), msg);
    const dh = () => (st.V * 1000 * BETA * (st.T - ROOM)) / (Math.PI * (st.d / 2) ** 2); // mm
    const over = () => (15 + dh()) * K > TUBE;
    function upd() {
      const v = dh();
      rT.set(PS.fmtT(st.T, 1));
      rH.set(over() ? '<span class="hl-r">溢出管口了！</span>' : (v >= 0 ? '升高 ' : '降低 ') + Math.abs(v).toFixed(1) + ' mm');
      const tgt = st.at < 0 ? ROOM : BEAK[st.at].T;
      if (Math.abs(st.T - tgt) > 0.3) { msg.innerHTML = st.T < tgt ? '瓶中的水温度升高，细管中的液面<b>正在上升</b>……' : '瓶中的水温度降低，细管中的液面<b>正在下降</b>……'; return; }
      if (over()) msg.innerHTML = '大瓶里的水多，膨胀得也多，细管里的水从管口<b>溢出</b>了。说明玻璃泡（小瓶）越大、管越细，温度计越<b>灵敏</b>，但量程也会变小。';
      else if (st.at === 2) msg.innerHTML = '水<b>受热膨胀</b>，细管中的液面上升。' + (st.d === 6 ? '换成粗管后，同样多的水挤进管里，液面只升高一点点——<b>管越细，液面变化越明显</b>，温度计越灵敏。' : '试试换成粗管，比较液面上升的高度。');
      else if (st.at === 0) msg.innerHTML = '水<b>遇冷收缩</b>，细管中的液面下降。液面的高低反映了温度的高低——这就是液体温度计的原理：<b>液体的热胀冷缩</b>。';
      else if (st.at === 1) msg.innerHTML = '温水的温度比室温高，液面升高了一些。再放进热水试试，液面会升得更高。';
      else msg.innerHTML = '这是 20 ℃ 时的液面位置（标为 0）。把小瓶放进不同温度的水中，观察细管中的液面。';
    }
    const loop = PS.loop((dt) => {
      const tx = st.at < 0 ? 500 : BEAK[st.at].x, ty = st.at < 0 ? AIR_Y : IN_Y;
      if (Math.abs(st.x - tx) > 2) { st.y += (AIR_Y - st.y) * Math.min(1, dt * 6); if (st.y < AIR_Y + 10) st.x += (tx - st.x) * Math.min(1, dt * 4); }
      else { st.x = tx; st.y += (ty - st.y) * Math.min(1, dt * 5); }
      const tgt = st.at >= 0 && Math.abs(st.y - IN_Y) < 8 ? BEAK[st.at].T : ROOM;
      st.T += (tgt - st.T) * Math.min(1, dt / 1.1);
      upd(); S.render();
      if (Math.abs(st.T - tgt) < 0.05 && Math.abs(st.y - ty) < 0.5 && Math.abs(st.x - tx) < 0.5) loop.stop();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, BOT, VW, VH - BOT);
      BEAK.forEach((b) => {
        PS.beaker(ctx, b.x, BOT, 190, 120, { level: 0.8, water: PS.waterColor(b.T) });
        D.text(ctx, b.name + ' ' + b.T + ' ℃', b.x, 462, { size: F(13), weight: 800, color: '#3a4458', align: 'center' });
        if (b.T < 10) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = '#a5d8ff'; ctx.lineWidth = 1.5; [[-75, 352], [48, 360], [-40, 395]].forEach(([dx, y]) => { D.roundRect(ctx, b.x + dx, y, 28, 22, 5); ctx.fill(); ctx.stroke(); }); }
      });
      // 小瓶（像青霉素瓶）+ 瓶塞 + 细管
      const x = st.x, yb = st.y + 100;
      const bw = st.V === 30 ? 76 : 56, bh = st.V === 30 ? 84 : 60;
      const stopper = yb - bh - 12, tubeTop = stopper - TUBE;
      const tubeW = Math.max(3, st.d * 2.2);
      const y0 = stopper - 15 * K, level = Math.max(tubeTop, y0 - dh() * K);
      ctx.fillStyle = 'rgba(240,62,62,.78)'; D.roundRect(ctx, x - bw / 2 + 3, yb - bh + 3, bw - 6, bh - 6, 8); ctx.fill();
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2.4; D.roundRect(ctx, x - bw / 2, yb - bh, bw, bh, 10); ctx.stroke();
      ctx.fillStyle = '#868e96'; D.roundRect(ctx, x - 20, stopper, 40, 14, 4); ctx.fill();
      ctx.fillStyle = 'rgba(240,247,255,.95)'; ctx.fillRect(x - tubeW / 2, tubeTop, tubeW, stopper - tubeTop);
      ctx.fillStyle = 'rgba(240,62,62,.9)'; ctx.fillRect(x - tubeW / 2, level, tubeW, stopper - level);
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 1.5; ctx.strokeRect(x - tubeW / 2, tubeTop, tubeW, stopper - tubeTop);
      if (over()) {
        ctx.fillStyle = 'rgba(240,62,62,.85)';
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + tubeW / 2 + 4 + i * 3, tubeTop + 10 + i * 16, 3.5, 0, TAU); ctx.fill(); }
        D.text(ctx, '溢出！', x - 14, tubeTop + 4, { size: F(13), weight: 800, color: '#e03131', baseline: 'top', align: 'right' });
      }
      // 毫米刻度（以 20 ℃ 时的液面为 0）
      ctx.strokeStyle = '#495057'; ctx.fillStyle = '#495057'; ctx.font = PS.font(F(10.5), 600); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (let mm = -15; mm <= 120; mm += 5) {
        const yy = y0 - mm * K;
        if (yy < tubeTop + 2 || yy > stopper - 2) continue;
        ctx.lineWidth = mm % 10 ? 0.8 : 1.4;
        ctx.beginPath(); ctx.moveTo(x + 12, yy); ctx.lineTo(x + (mm % 10 ? 18 : 24), yy); ctx.stroke();
        if (mm % 20 === 0) ctx.fillText(mm === 0 ? '0（20 ℃ 时）' : (mm > 0 ? '+' : '−') + Math.abs(mm) + ' mm', x + 28, yy);
      }
      ctx.restore();
    }
    upd(); loop.start();
  });

  /* ================= 摄氏温度的规定 ================= */
  PS.register('celsius-def', function (el) {
    const VW = 1000, VH = 470;
    const STEPS = [
      '这是一支还没有刻度的温度计，玻璃泡里装着液体。怎样给它标上刻度呢？',
      '把它放进<b>冰水混合物</b>中，液柱稳定后，在液面处标上 <b>0 ℃</b>。',
      '再把它放进<b>1 个标准大气压下的沸水</b>中，液柱稳定后，在液面处标上 <b>100 ℃</b>。',
      '在 0 ℃ 和 100 ℃ 之间分成 <b>100 个等份</b>，每个等份代表 <b>1 摄氏度</b>（1 ℃）。',
      '按同样的间隔向下、向上延长刻度：0 ℃ 以下的温度用负数表示。例如 −4.7 ℃，读作“<b>负 4.7 摄氏度</b>”或“<b>零下 4.7 摄氏度</b>”。',
    ];
    const LEN = 330, BULB_DY = 70; // 温度计长度；玻璃泡在 st.y 下方 BULB_DY 处
    const st = { step: 0, x: 500, y: 280, val: ROOM, ticks: 0, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const next = PS.ui.button('下一步 →', () => { if (st.step < 4) { st.step++; loop.start(); upd(); } }, 'btn btn-primary');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(next, PS.ui.button('↺ 重新开始', () => { st.step = 0; st.ticks = 0; loop.start(); upd(); }, 'btn btn-ghost')), msg);
    function upd() { msg.innerHTML = '<b>第 ' + (st.step + 1) + ' 步：</b>' + STEPS[st.step]; next.disabled = st.step >= 4; }
    const target = () => (st.step === 1 ? [260, 330, 0] : st.step === 2 ? [740, 330, 100] : [500, 280, ROOM]);
    const loop = PS.loop((dt) => {
      st.t += dt;
      const [tx, ty, T] = target();
      if (Math.abs(st.x - tx) > 2) { st.y += (60 - st.y) * Math.min(1, dt * 6); if (st.y < 80) st.x += (tx - st.x) * Math.min(1, dt * 4); }
      else { st.x = tx; st.y += (ty - st.y) * Math.min(1, dt * 5); }
      st.val += ((Math.abs(st.y - ty) < 4 ? T : ROOM) - st.val) * Math.min(1, dt / 0.8);
      if (st.step >= 3) st.ticks = Math.min(st.step === 3 ? 100 : 130, st.ticks + dt * 60);
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 440, VW, 30);
      // 冰水混合物、沸水
      PS.beaker(ctx, 260, 440, 200, 170, { level: 0.75, water: '#cfe8fc' });
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = '#91c4ee'; ctx.lineWidth = 1.5;
      [[-70, 322, 0.2], [30, 330, -0.3], [-40, 362, 0.1], [55, 372, 0.4], [-75, 395, -0.2]].forEach(([dx, y, a]) => { ctx.save(); ctx.translate(260 + dx, y); ctx.rotate(a); D.roundRect(ctx, -16, -13, 32, 26, 5); ctx.fill(); ctx.stroke(); ctx.restore(); });
      D.text(ctx, '冰水混合物', 260, 462, { size: F(14), weight: 800, color: '#1c7ed6', align: 'center' });
      PS.beaker(ctx, 740, 440, 200, 170, { level: 0.72, water: '#ffe3d3' });
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) { const ph = (st.t * 0.9 + i * 0.37) % 1, bx = 670 + ((i * 53) % 140); ctx.beginPath(); ctx.arc(bx, 436 - ph * 112, 3 + ph * 6, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(160,170,190,.5)'; ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) { const ox = 740 + i * 50 + Math.sin(st.t * 2 + i) * 6; ctx.beginPath(); ctx.moveTo(ox, 262); ctx.bezierCurveTo(ox - 14, 242, ox + 14, 230, ox, 210); ctx.stroke(); }
      D.text(ctx, '沸水（1 个标准大气压）', 740, 462, { size: F(14), weight: 800, color: '#e8590c', align: 'center' });
      // 温度计（刻度逐步画出来）
      const by = st.y + BULB_DY;
      const th = PS.thermo(ctx, { x: st.x, top: by - LEN, bulbY: by, min: -20, max: 110, div: 1, value: st.val, w: 20, F, ticks: false, numbers: false, unit: false });
      const yy = th.y;
      const tick = (T, len, lw) => { ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(st.x - 8, yy(T)); ctx.lineTo(st.x - 8 + len, yy(T)); ctx.stroke(); };
      ctx.strokeStyle = '#1b2333'; ctx.fillStyle = '#1b2333'; ctx.textBaseline = 'middle';
      const n = Math.floor(st.ticks);
      if (st.step >= 3) {
        for (let i = 1; i < Math.min(n, 100); i++) tick(i, i % 10 ? 6 : 12, i % 10 ? 0.8 : 1.4);
        ctx.font = PS.font(F(11), 700); ctx.textAlign = 'right';
        for (let i = 10; i < Math.min(n, 100); i += 10) ctx.fillText(i, st.x - 14, yy(i));
      }
      if (st.step >= 4) {
        for (let i = 1; i <= Math.min(20, n - 100); i++) [-i, 100 + i].forEach((T) => { if (T <= 110) tick(T, i % 10 ? 6 : 12, i % 10 ? 0.8 : 1.4); });
        ctx.font = PS.font(F(11), 700); ctx.textAlign = 'right';
        if (n - 100 >= 10) { ctx.fillText('−10', st.x - 14, yy(-10)); ctx.fillText('110', st.x - 14, yy(110)); }
        if (n - 100 >= 20) ctx.fillText('−20', st.x - 14, yy(-20));
        D.text(ctx, '0 ℃ 以下：负数', st.x + 24, yy(-12), { size: F(13), weight: 800, color: '#1c7ed6', baseline: 'middle', bg: '#e7f5ff' });
      }
      const mark = (T, c) => {
        ctx.strokeStyle = c; tick(T, 22, 2.5);
        D.text(ctx, T + ' ℃', st.x + 20, yy(T), { size: F(15), weight: 800, color: c, baseline: 'middle' });
      };
      if (st.step >= 1) mark(0, '#1c7ed6');
      if (st.step >= 2) mark(100, '#e8590c');
      if (st.step === 3 && n >= 100) {
        D.text(ctx, '100 等份', st.x + 82, (yy(0) + yy(100)) / 2, { size: F(14), weight: 800, color: '#7048e8', baseline: 'middle', bg: '#f0ebff' });
        D.text(ctx, '每份 1 ℃', st.x + 82, (yy(0) + yy(100)) / 2 + 30, { size: F(13), weight: 700, color: '#7048e8', baseline: 'middle' });
      }
      ctx.restore();
    }
    upd(); loop.start();
  });

  /** 刻度不准的温度计（计算挑战），挂在 celsius-def 下方或单独使用 */
  PS.register('bad-thermo', function (el) {
    const SPANS = [[90, 10], [95, 20], [96, 25], [104, 25], [110, 10], [80, 5], [92, 25]];
    const st = {};
    const q = h('div', { class: 'q-stem' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '实际温度' });
    const fb = h('span', { class: 'q-fb' });
    const ex = h('div', { class: 'feedback' });
    const sub = PS.ui.button('提交', check, 'btn btn-primary btn-sm');
    el.append(q, h('div', { class: 'q-fill' }, inp, h('span', { class: 'q-unit' }, '℃'), sub, PS.ui.button('换一题', make, 'btn btn-sm')), fb, ex);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    function make() {
      const [span, m] = PS.pick(SPANS);
      const a = PS.pick([-4, -2, 2, 3, 4, 5, 6]);
      let T; do { T = m * PS.randInt(1, Math.floor(90 / m)); } while (T >= 100 || T <= 0);
      const c = a + (span * T) / 100;
      Object.assign(st, { a, b: a + span, c, T });
      q.innerHTML = '一支温度计刻度均匀，但示数不准确：放在冰水混合物中示数为 <b>' + PS.fmtT(a) + '</b>，放在 1 个标准大气压下的沸水中示数为 <b>' + PS.fmtT(a + span) + '</b>。用它测某液体的温度，示数为 <b>' + PS.fmtT(c) + '</b>，液体的实际温度是多少？';
      inp.value = ''; inp.disabled = false; sub.disabled = false; fb.textContent = ''; ex.className = 'feedback';
    }
    function check() {
      const v = parseFloat(inp.value.replace('−', '-'));
      if (isNaN(v)) { inp.focus(); return; }
      const ok = Math.abs(v - st.T) < 0.05;
      fb.className = 'q-fb ' + (ok ? 'ok' : 'bad'); fb.textContent = ok ? '✔ 正确' : '✘ 正确答案：' + st.T + ' ℃';
      ok ? PS.sound.good() : PS.sound.bad();
      const span = st.b - st.a;
      ex.className = 'feedback show info';
      ex.innerHTML = '这支温度计上 ' + PS.fmtT(st.a) + ' 到 ' + PS.fmtT(st.b) + ' 之间有 ' + span + ' 格，对应实际的 0 ℃ ~ 100 ℃，每格表示 <span class="frac"><span>100</span><span>' + span + '</span></span> ℃。<br>示数 ' + PS.fmtT(st.c) + ' 比 ' + PS.fmtT(st.a) + ' 高出 ' + PS.fmt(st.c - st.a, 0) + ' 格，实际温度 = ' + PS.fmt(st.c - st.a, 0) + ' × <span class="frac"><span>100</span><span>' + span + '</span></span> ℃ = <b>' + st.T + ' ℃</b>。';
      inp.disabled = true; sub.disabled = true;
    }
    make();
  });

  /* ================= 温度计的使用（放置、等待、读数） ================= */
  const SAMPLES = [{ k: 'cold', name: '冷水', lo: 8, hi: 14 }, { k: 'warm', name: '温水', lo: 36, hi: 41 }, { k: 'hot', name: '热水', lo: 66, hi: 82 }];
  const EYES = [{ k: 'up', name: '俯视', err: 1.6 }, { k: 'level', name: '平视', err: 0 }, { k: 'down', name: '仰视', err: -1.6 }];
  PS.register('thermo-use', function (el, opts) {
    const VW = 1000, VH = 560;
    const BX = 300, BYB = 520, BW = 300, BH = 270, SURF = BYB - BH * 0.74; // 烧杯中心、杯底、宽、高、水面
    const L = 280, BR = 13; // 温度计长度、玻璃泡半径
    const st = { type: 'lab', sample: 1, Tw: 38, bx: 250, by: 228, R: ROOM, eye: 'level', still: 0, broken: false, rows: [], drag: false, t: 0 };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const S = PS.stage(left, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'grab';
    const type = () => TYPES[st.type];

    const typeSeg = PS.ui.seg(Object.keys(TYPES).map((k) => ({ value: k, label: TYPES[k].name })), st.type, (v) => { st.type = v; st.broken = false; st.R = v === 'clinical' ? 35.5 : ROOM; say('换成了<b>' + type().name + '</b>：量程 ' + PS.fmtT(type().min) + ' ~ ' + PS.fmtT(type().max) + '，分度值 ' + type().div + ' ℃。'); loop.start(); });
    const sampSeg = PS.ui.seg(SAMPLES.map((s, i) => ({ value: i, label: s.name })), st.sample, (v) => { newSample(v); say('换了一杯' + SAMPLES[v].name + '。先估计一下它的温度，再选择量程合适的温度计。'); });
    const POS = [
      { label: 'A 碰到杯底', x: 330, y: BYB - BR - 1 },
      { label: 'B 碰到杯壁', x: BX + BW / 2 - BR - 1, y: 430 },
      { label: 'C 没有浸没', x: 300, y: SURF + 2 },
      { label: 'D 正确放置', x: 300, y: 420 },
      { label: '拿出来', x: 300, y: 228 },
    ];
    const posBtns = POS.map((p) => PS.ui.button(p.label, () => { st.bx = p.x; st.by = p.y; st.still = 0; loop.start(); }, 'btn btn-sm'));
    const eyeSeg = PS.ui.seg(EYES.map((e) => ({ value: e.k, label: e.name })), st.eye, (v) => { st.eye = v; S.render(); });
    const inp = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '读数' });
    const readBtn = PS.ui.button('提交读数', submit, 'btn btn-primary btn-sm');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    const msg = h('div', { class: 'feedback show info small' });
    const tbody = h('tbody');
    const rR = PS.ui.readout('液柱状态', '—');
    left.append(h('div', { class: 'readouts' }, rR.el), h('p', { class: 'kbd-hint', style: { margin: '6px 0 0' } }, '提示：可以直接用鼠标（或手指）拖动温度计。'));
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 一看一清：估计水温，选择温度计'), h('div', { class: 'row' }, sampSeg.el), h('div', { class: 'row' }, typeSeg.el)),
      h('div', { class: 'panel' }, h('h4', null, '② 放置温度计（四种做法）'), h('div', { class: 'row' }, posBtns)),
      h('div', { class: 'panel' }, h('h4', null, '③ 等示数稳定后读数'), h('div', { class: 'row' }, '视线：', eyeSeg.el), h('div', { class: 'row' }, inp, '℃', readBtn), msg),
      h('div', { class: 'panel' }, h('h4', null, '④ 记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '水样'), h('th', null, '读数'), h('th', null, '评价'))), tbody))));
    function say(t, cls) { msg.className = 'feedback show small ' + (cls || 'info'); msg.innerHTML = t; }
    function newSample(i) { st.sample = i; const s = SAMPLES[i]; st.Tw = PS.randInt(s.lo, s.hi); loop.start(); }
    const surfT = () => st.Tw + (ROOM - st.Tw) * 0.35; // 杯底、杯壁的温度更接近室温
    function situation() {
      const l = BX - BW / 2, r = BX + BW / 2;
      const f = PS.clamp((st.by + BR - SURF) / (2 * BR), 0, 1);
      const bottom = st.by >= BYB - BR - 3, wall = st.bx - BR <= l + 4 || st.bx + BR >= r - 4;
      let T = ROOM * (1 - f) + st.Tw * f;
      if (f > 0.5 && bottom) T = T * 0.4 + surfT() * 0.6;
      if (f > 0.5 && wall) T = T * 0.5 + surfT() * 0.5;
      return { f, bottom: bottom && f > 0.5, wall: wall && f > 0.5, T };
    }
    const apparent = () => st.R + EYES.find((e) => e.k === st.eye).err * type().div; // 俯视偏大、仰视偏小（约 1.6 个分度）
    function submit() {
      const v = parseFloat(inp.value.replace('−', '-').replace(/\s/g, ''));
      if (isNaN(v)) { inp.focus(); return; }
      if (st.broken) { say('温度计已经损坏，先换一支量程合适的温度计。', 'bad'); return; }
      const s = situation(), ty = type(), app = apparent();
      const probs = [];
      if (st.Tw > ty.max || st.Tw < ty.min) probs.push('被测温度超出了' + ty.name + '的量程（' + PS.fmtT(ty.min) + ' ~ ' + PS.fmtT(ty.max) + '），要换一支量程合适的温度计');
      if (s.f < 1) probs.push(s.f === 0 ? '读数时玻璃泡要继续留在被测液体中，不能拿出来读' : '玻璃泡没有全部浸入被测液体中');
      if (s.bottom) probs.push('玻璃泡碰到了容器底');
      if (s.wall) probs.push('玻璃泡碰到了容器壁');
      if (Math.abs(st.R - s.T) > 0.25 && st.type !== 'clinical') probs.push('示数还没有稳定，要稍等一会儿再读');
      if (st.eye !== 'level') probs.push(st.eye === 'up' ? '俯视读数，读数偏大' : '仰视读数，读数偏小');
      const misread = Math.abs(v - app) > ty.div * 0.6;
      let html;
      if (!probs.length && !misread) {
        html = '✔ 操作规范，读数正确：' + PS.fmtT(v, ty.div < 1 ? 1 : 0) + '。'; say(html, 'ok'); PS.sound.good();
      } else {
        html = (misread ? '你看到的示数应该是 <b>' + PS.fmtT(app, ty.div < 1 ? 1 : 0) + '</b>（注意分度值是 ' + ty.div + ' ℃' + (app < 0 ? '，液柱在 0 ℃ 以下' : '') + '）。' : '') +
          (probs.length ? '<br>存在的问题：' + probs.map((p) => '<b>' + p + '</b>').join('；') + '。' : '') +
          (probs.length ? '' : '<br>操作规范。');
        say(html, 'bad'); PS.sound.bad();
      }
      st.rows.push({ s: SAMPLES[st.sample].name, v, ok: !probs.length && !misread, why: probs.length ? probs[0].replace(/，.*/, '') : misread ? '读错刻度' : '规范' });
      if (st.rows.length > 6) st.rows.shift();
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.s), h('td', null, PS.fmtT(r.v, type().div < 1 ? 1 : 0)), h('td', { class: r.ok ? 'hl-g' : 'hl-r', style: { fontSize: '.8rem' } }, r.ok ? '✔ 规范' : r.why))));
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const s = situation(), ty = type();
      if (!st.broken && s.T > ty.max + 4 && (st.type !== 'lab')) {
        st.broken = true; say('⚠️ 水温超过了' + ty.name + '的量程，液柱顶到管顶，温度计<b>胀破</b>了！使用前一定要看清量程。', 'bad'); PS.sound.bad();
      }
      if (st.broken) { S.render(); return; }
      const prev = st.R;
      if (st.type === 'clinical') st.R = Math.max(st.R, st.R + (s.T - st.R) * Math.min(1, dt / 1.0));
      else st.R += (s.T - st.R) * Math.min(1, dt / 1.0);
      st.still = Math.abs(st.R - prev) < 0.004 ? st.still + dt : 0;
      rR.set(Math.abs(s.T - st.R) > 0.25 && st.type !== 'clinical' ? (s.T > st.R ? '<span class="hl-o">正在上升…</span>' : '<span class="hl">正在下降…</span>') : '<span class="hl-g">已稳定</span>');
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, BYB, 640, VH - BYB);
      const s = situation(), ty = type();
      PS.beaker(ctx, BX, BYB, BW, BH, { level: 0.74, water: PS.waterColor(st.Tw) });
      D.text(ctx, SAMPLES[st.sample].name, BX - BW / 2 + 14, BYB - 18, { size: F(14), weight: 800, color: '#3a4458' });
      // 温度计
      const top = st.by - L;
      const th = PS.thermo(ctx, { x: st.bx, top, bulbY: st.by, min: ty.min, max: ty.max, div: ty.div, label: ty.label, value: st.broken ? ty.max + 5 : st.R, w: 16, bulbR: BR, liquid: ty.liquid, F, fs: F(10), unit: false });
      if (st.broken) {
        ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(st.bx - 10, top + 10); ctx.lineTo(st.bx + 4, top + 22); ctx.lineTo(st.bx - 6, top + 34); ctx.lineTo(st.bx + 10, top + 46); ctx.stroke();
        D.text(ctx, '胀破了！', st.bx + 18, top + 30, { size: F(14), weight: 800, color: '#e03131', bg: '#fff' });
      }
      // 在温度计前面再盖一层半透明的水（浸没的部分看起来在水里）
      ctx.fillStyle = PS.waterColor(st.Tw, 0.35);
      ctx.fillRect(BX - BW / 2 + 2, SURF, BW - 4, BYB - SURF - 2);
      // 错误提示标签
      const tags = [];
      if (s.bottom) tags.push('碰到杯底');
      if (s.wall) tags.push('碰到杯壁');
      if (s.f > 0 && s.f < 1) tags.push('没有浸没');
      if (s.f === 0) tags.push('离开了液体');
      tags.forEach((t, i) => D.text(ctx, '✘ ' + t, st.bx + 26, st.by - 8 - i * 28, { size: F(13), weight: 800, color: '#e03131', bg: 'rgba(255,255,255,.92)' }));
      // 眼睛与视线
      const yl = th.y(PS.clamp(st.R, ty.min - 1, ty.max + 1));
      const eye = EYES.find((e) => e.k === st.eye);
      const ey = yl + (eye.k === 'up' ? -90 : eye.k === 'down' ? 90 : 0), ex = st.bx - 190;
      if (yl > 10 && yl < VH - 10) {
        ctx.strokeStyle = eye.k === 'level' ? '#2b8a3e' : '#e03131'; ctx.setLineDash([7, 5]); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(ex + 18, ey); ctx.lineTo(st.bx + 30, yl + (yl - ey) * (48 / 208)); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = F(26, 18) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👁️', ex, ey);
        D.text(ctx, eye.name, ex, ey + 26, { size: F(12), weight: 800, color: eye.k === 'level' ? '#2b8a3e' : '#e03131', align: 'center', baseline: 'top' });
      }
      // 右侧放大镜：看到的示数
      const MX = 820, MY = 250, MR = 150;
      ctx.save();
      ctx.beginPath(); ctx.arc(MX, MY, MR, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
      const app = st.broken ? ty.max : apparent();
      const span = ty.div < 1 ? 1.2 : 12; // 视野中的温度范围（一半）
      PS.thermo(ctx, { x: MX - 20, top: MY - MR - 50, bulbY: MY + MR + 50, bulb: false, min: app - span * 1.6, max: app + span * 1.6, div: ty.div, label: ty.label, value: st.broken ? app + 100 : app, w: 64, liquid: ty.liquid, F, fs: F(20), unit: false, pad: 0 });
      ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(MX, MY, MR, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(MX + MR * 0.72, MY + MR * 0.72); ctx.lineTo(MX + MR * 1.0, MY + MR * 1.0); ctx.stroke();
      D.text(ctx, '放大：你看到的示数', MX, MY - MR - 14, { size: F(13), weight: 800, color: '#3a4458', align: 'center' });
      D.text(ctx, ty.name + '　分度值 ' + ty.div + ' ℃', MX, MY + MR + 34, { size: F(12), weight: 700, color: '#6b7487', align: 'center' });
      ctx.restore();
    }
    // 拖动温度计
    function vpos(e) { const p = S.pos(e); return { x: (p.x / S.w) * VW, y: (p.y / S.h) * VH }; }
    S.canvas.addEventListener('pointerdown', (e) => {
      const p = vpos(e);
      if (Math.abs(p.x - st.bx) < 30 && p.y > st.by - L - 10 && p.y < st.by + 30) { st.drag = { dx: st.bx - p.x, dy: st.by - p.y }; S.canvas.setPointerCapture(e.pointerId); S.stage.style.cursor = 'grabbing'; }
    });
    S.canvas.addEventListener('pointermove', (e) => {
      if (!st.drag) return;
      const p = vpos(e);
      st.bx = PS.clamp(p.x + st.drag.dx, BX - BW / 2 + BR + 1, BX + BW / 2 - BR - 1);
      st.by = PS.clamp(p.y + st.drag.dy, 200, BYB - BR - 1);
      loop.start(); S.render();
    });
    const end = () => { st.drag = false; S.stage.style.cursor = 'grab'; };
    S.canvas.addEventListener('pointerup', end); S.canvas.addEventListener('pointercancel', end);
    newSample(1);
    tbody.append(h('tr', null, h('td', { colspan: 3, class: 'muted' }, '还没有数据')));
    say('先估计水温，选择量程合适的温度计；再把温度计放进水中（试试四种放法），等示数稳定后读数。');
    loop.start();
  });

  /* ================= 温度计读数练习 ================= */
  PS.register('thermo-reading', function (el) {
    const VW = 1000, VH = 380;
    const st = { ty: 'lab', v: 0, done: false, ok: 0, n: 0, hint: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const inp = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '读数' });
    const fb = h('div', { class: 'feedback' });
    const score = h('span', { class: 'quiz-score' });
    const sub = PS.ui.button('提交', check, 'btn btn-primary btn-sm');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    el.append(PS.ui.row(h('b', null, '示数：'), inp, '℃', sub, PS.ui.button('下一题 →', make, 'btn btn-sm'), score), fb);
    function make() {
      const r = Math.random();
      st.ty = r < 0.3 ? 'clinical' : r < 0.5 ? 'weather' : 'lab';
      const t = TYPES[st.ty];
      if (st.ty === 'clinical') st.v = PS.round(PS.rand(35.6, 41.4), 1);
      else {
        const neg = Math.random() < 0.45;
        st.v = neg ? -PS.randInt(1, 18) : PS.randInt(st.ty === 'weather' ? 4 : 4, st.ty === 'weather' ? 46 : 104);
        if (st.v % 10 === 0) st.v += PS.pick([-3, 3, 4, -4]);
        st.v = PS.clamp(st.v, t.min + 2, t.max - 2);
      }
      st.done = false; inp.value = ''; inp.disabled = false; sub.disabled = false; fb.className = 'feedback';
      S.render();
    }
    function check() {
      if (st.done) return;
      const v = parseFloat(inp.value.replace('−', '-').replace(/\s/g, ''));
      if (isNaN(v)) { inp.focus(); return; }
      const t = TYPES[st.ty];
      const ok = Math.abs(v - st.v) < t.div * 0.4;
      st.done = true; st.n++; if (ok) st.ok++;
      inp.disabled = true; sub.disabled = true;
      const sv = PS.fmtT(st.v, t.div < 1 ? 1 : 0);
      let why = t.name + '的分度值是 ' + t.div + ' ℃。';
      if (st.v < 0) why += '液柱的上表面在 0 ℃ <b>下方</b>，越往下数值越大，所以是零下的温度：<b>' + sv + '</b>，读作“零下 ' + Math.abs(st.v) + ' 摄氏度”。';
      else why += '液柱的上表面对准 <b>' + sv + '</b>。';
      if (!ok && st.v < 0 && Math.abs(v + st.v) < 0.01) why = '⚠️ 漏掉了负号！' + why;
      fb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✔ 正确！' : '✘ 正确读数是 ' + sv + '。') + why;
      ok ? PS.sound.good() : PS.sound.bad();
      score.innerHTML = '已做 <b>' + st.n + '</b> 题 · 答对 <b class="ok">' + st.ok + '</b>';
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      const t = TYPES[st.ty];
      const span = t.div < 1 ? 1.4 : 13;
      const lo = PS.clamp(Math.floor((st.v - span) / t.label) * t.label, t.min, t.max - 3 * t.label), hi = lo + 3 * t.label;
      ctx.save();
      PS.thermo(ctx, { x: 440, top: 20, bulbY: VH - 18, bulb: false, min: lo, max: hi, div: t.div, label: t.label, value: st.v, w: 56, liquid: t.liquid, F, fs: F(18), unit: false, pad: 0 });
      ctx.restore();
      D.text(ctx, t.name + '（局部放大）', 40, 40, { size: F(15), weight: 800, color: '#3a4458' });
      D.text(ctx, '量程 ' + PS.fmtT(t.min) + ' ~ ' + PS.fmtT(t.max), 40, 68, { size: F(13), weight: 600, color: '#6b7487' });
      D.text(ctx, '单位：℃', 40, 92, { size: F(13), weight: 600, color: '#6b7487' });
      D.text(ctx, '先看清分度值，再看液柱在 0 ℃ 以上还是以下', 960, VH - 24, { size: F(12.5), weight: 600, color: '#6b7487', align: 'right' });
      ctx.restore();
    }
    score.innerHTML = '随机出题，可以一直练';
    make();
  });

  /* ================= 体温计 ================= */
  const PATIENTS = [{ n: '小明', T: 36.8 }, { n: '小红', T: 38.5 }, { n: '小刚', T: 37.3 }, { n: '奶奶', T: 39.2 }, { n: '爸爸', T: 36.5 }];
  PS.register('clinical-thermo', function (el) {
    const VW = 1000, VH = 420;
    const X0 = 150, X1 = 900, Y = 120; // 35 ℃ 与 42 ℃ 的刻度位置
    const XT = (T) => X0 + ((T - 35) / 7) * (X1 - X0);
    const st = { R: 34.2, Tb: 25, place: 'air', who: null, shake: 0, t: 0, done: false, last: null };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const pSeg = PS.ui.seg(PATIENTS.map((p, i) => ({ value: i, label: p.n })), -1, (v) => { st.who = v; });
    const bMeasure = PS.ui.button('🤒 夹在腋下测量（5 min）', () => {
      if (st.who == null || st.who < 0) { say('先选择给谁测体温。', 'bad'); return; }
      st.place = 'body'; st.last = st.R; say('正在测量' + PATIENTS[st.who].n + '的体温……'); loop.start();
      setTimeout(() => { if (st.place === 'body') say('测量了 5 分钟。点“取出来读数”。'); }, 2600);
    }, 'btn btn-primary');
    const bOut = PS.ui.button('取出来读数', () => {
      if (st.place !== 'body') return;
      st.place = 'air'; loop.start();
      const p = PATIENTS[st.who];
      const wrong = st.last > p.T + 0.05;
      say(wrong ? '⚠️ 示数是 <b>' + PS.fmt(st.R, 1) + ' ℃</b>，可是' + p.n + '的实际体温只有 ' + p.T + ' ℃！上次用过后<b>没有甩</b>，水银柱不会自己退回去——体温计“<b>能上不能下</b>”。' :
        '离开人体后，玻璃泡里的水银遇冷收缩，水银柱在<b>缩口</b>处断开，管里的水银<b>退不回来</b>，所以体温计可以<b>离开人体读数</b>。读一读：', wrong ? 'bad' : 'info');
      if (!wrong) ask();
    }, 'btn');
    const bShake = PS.ui.button('👋 甩一甩', () => { st.shake = 1.2; loop.start(); say('用力向下甩几下，管中的水银就回到玻璃泡里了。下次测量前<b>必须先甩</b>。（实验室温度计不能甩！）'); }, 'btn btn-accent');
    const inp = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '读数' });
    const sub = PS.ui.button('提交', check, 'btn btn-sm');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(h('b', null, '给谁测：'), pSeg.el), PS.ui.row(bMeasure, bOut, bShake, h('span', null, '读数：'), inp, '℃', sub), msg);
    function say(t, c) { msg.className = 'feedback show ' + (c || 'info'); msg.innerHTML = t; }
    function ask() { inp.value = ''; inp.focus({ preventScroll: true }); }
    function check() {
      const v = parseFloat(inp.value);
      if (isNaN(v)) return;
      const ok = Math.abs(v - PS.round(st.R, 1)) < 0.05;
      ok ? PS.sound.good() : PS.sound.bad();
      say(ok ? '✔ 读数正确：' + PS.fmt(st.R, 1) + ' ℃。体温计的分度值是 <b>0.1 ℃</b>，量程是 35 ℃ ~ 42 ℃。' : '✘ 再看看：每一大格是 1 ℃，每一小格是 0.1 ℃。正确读数是 ' + PS.fmt(st.R, 1) + ' ℃。', ok ? 'ok' : 'bad');
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.shake > 0) {
        st.shake -= dt;
        st.R += (Math.min(st.R, 34.2) - st.R) * Math.min(1, dt * 3);
        if (st.shake <= 0) { st.R = Math.min(st.R, 34.2); }
      }
      const tgt = st.place === 'body' ? PATIENTS[st.who].T : 25;
      st.Tb += (tgt - st.Tb) * Math.min(1, dt / (st.place === 'body' ? 0.7 : 0.5));
      if (st.Tb > st.R) st.R = st.Tb; // 水银膨胀，通过缩口进入直管；遇冷时在缩口处断开，退不回来
      S.render();
      if (st.shake <= 0 && Math.abs(st.Tb - tgt) < 0.01) loop.stop();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      const jig = st.shake > 0 ? Math.sin(st.t * 40) * 14 : 0;
      ctx.save(); ctx.translate(0, jig);
      // 外壳（三棱柱的截面看起来像一条亮带）
      const g = ctx.createLinearGradient(0, Y - 34, 0, Y + 34);
      g.addColorStop(0, 'rgba(210,225,240,.95)'); g.addColorStop(0.45, '#ffffff'); g.addColorStop(1, 'rgba(190,205,225,.95)');
      ctx.fillStyle = g; ctx.strokeStyle = '#8e9bb0'; ctx.lineWidth = 2;
      D.roundRect(ctx, 50, Y - 30, 900, 60, 26); ctx.fill(); ctx.stroke();
      // 玻璃泡与缩口
      ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.ellipse(78, Y, 26, 11, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2; ctx.stroke();
      const xc = 118; // 缩口位置
      ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(100, Y); ctx.lineTo(920, Y); ctx.stroke();
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(100, Y); ctx.lineTo(xc, Y); ctx.stroke();
      // 直管中的水银柱（读数）；离开人体后与玻璃泡之间在缩口处断开
      const xr = PS.clamp(XT(st.R), xc + 4, 935);
      const broken = st.place === 'air' && st.R > 35 && st.R - st.Tb > 0.3;
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(broken ? xc + 6 : 100, Y); ctx.lineTo(xr, Y); ctx.stroke();
      if (!broken) { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(100, Y); ctx.lineTo(xc + 6, Y); ctx.stroke(); }
      // 刻度
      ctx.strokeStyle = '#1b2333'; ctx.fillStyle = '#1b2333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let i = 0; i <= 70; i++) {
        const x = XT(35 + i / 10), big = i % 10 === 0, mid = i % 5 === 0;
        ctx.lineWidth = big ? 1.6 : 1; ctx.beginPath(); ctx.moveTo(x, Y - 26); ctx.lineTo(x, Y - 26 + (big ? 16 : mid ? 12 : 8)); ctx.stroke();
        if (big) { ctx.font = PS.font(F(15), 800); ctx.fillText(35 + i / 10, x, Y + 8); }
      }
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(XT(37), Y - 30); ctx.lineTo(XT(37) - 5, Y - 38); ctx.lineTo(XT(37) + 5, Y - 38); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 缩口放大图
      const MX = 230, MY = 300;
      ctx.save();
      ctx.fillStyle = '#f8f9fa'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 3;
      D.roundRect(ctx, MX - 190, MY - 80, 380, 160, 16); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(73,80,87,.4)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xc - 14, Y + 30 + jig); ctx.lineTo(MX - 190, MY - 80); ctx.moveTo(xc + 14, Y + 30 + jig); ctx.lineTo(MX + 190, MY - 80); ctx.stroke(); ctx.setLineDash([]);
      // 放大的玻璃泡 → 缩口 → 直管
      ctx.fillStyle = '#ced4da';
      ctx.beginPath(); ctx.moveTo(MX - 180, MY - 30); ctx.lineTo(MX - 40, MY - 30); ctx.quadraticCurveTo(MX - 10, MY - 30, MX - 2, MY - 4); ctx.lineTo(MX + 2, MY - 4); ctx.quadraticCurveTo(MX + 10, MY - 10, MX + 30, MY - 10); ctx.lineTo(MX + 180, MY - 10); ctx.lineTo(MX + 180, MY + 10); ctx.lineTo(MX + 30, MY + 10); ctx.quadraticCurveTo(MX + 10, MY + 10, MX + 2, MY + 4); ctx.lineTo(MX - 2, MY + 4); ctx.quadraticCurveTo(MX - 10, MY + 30, MX - 40, MY + 30); ctx.lineTo(MX - 180, MY + 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#868e96';
      // 玻璃泡中的水银：温度越低，收缩得越多
      const shrink = broken ? PS.clamp((st.R - st.Tb) / 12, 0, 1) : 0;
      ctx.fillRect(MX - 180, MY - 26, 170 - shrink * 60, 52);
      if (!broken) { ctx.fillRect(MX - 12, MY - 3, 24, 6); ctx.fillRect(MX + 10, MY - 7, 170, 14); }
      else { ctx.fillRect(MX + 16, MY - 7, 164, 14); }
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(MX - 180, MY - 30); ctx.lineTo(MX - 40, MY - 30); ctx.quadraticCurveTo(MX - 10, MY - 30, MX - 2, MY - 4); ctx.lineTo(MX + 2, MY - 4); ctx.quadraticCurveTo(MX + 10, MY - 10, MX + 30, MY - 10); ctx.lineTo(MX + 180, MY - 10); ctx.moveTo(MX + 180, MY + 10); ctx.lineTo(MX + 30, MY + 10); ctx.quadraticCurveTo(MX + 10, MY + 10, MX + 2, MY + 4); ctx.lineTo(MX - 2, MY + 4); ctx.quadraticCurveTo(MX - 10, MY + 30, MX - 40, MY + 30); ctx.lineTo(MX - 180, MY + 30); ctx.stroke();
      D.text(ctx, '缩口（很细）', MX, MY - 52, { size: F(13), weight: 800, color: '#7048e8', align: 'center' });
      if (broken) D.text(ctx, '水银柱在这里断开', MX, MY + 56, { size: F(13), weight: 800, color: '#e03131', align: 'center' });
      else D.text(ctx, st.place === 'body' ? '受热膨胀，水银挤过缩口' : '水银相连', MX, MY + 56, { size: F(13), weight: 700, color: '#495057', align: 'center' });
      ctx.restore();
      // 右侧说明
      D.text(ctx, '玻璃泡温度：' + PS.fmt(st.Tb, 1) + ' ℃', 480, 250, { size: F(15), weight: 700, color: '#495057' });
      D.text(ctx, st.place === 'body' ? '📍 在腋下（' + PATIENTS[st.who].n + '）' : '📍 在空气中（约 25 ℃）', 480, 285, { size: F(15), weight: 700, color: '#495057' });
      D.text(ctx, st.R < 35 ? '示数：低于 35 ℃（已甩下）' : '示数：请你读一读', 480, 330, { size: F(16), weight: 800, color: '#0c8599' });
      D.text(ctx, '量程 35 ℃ ~ 42 ℃　分度值 0.1 ℃', 480, 370, { size: F(13), weight: 600, color: '#6b7487' });
      ctx.restore();
    }
    say('体温计的玻璃泡和直玻璃管之间有一段<b>很细的弯曲缩口</b>。先选择给谁测体温，看看缩口有什么作用。');
    loop.start();
  });
})();
