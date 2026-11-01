/* 第3章第4节：升华和凝华——碘的升华和凝华、人工降雨、三态变化图、物态变化判断、自然界的水循环。依赖 heat.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const ROOM = 20;

  /* ================= 物态变化的名称与吸放热 ================= */
  const ST = { s: '固态', l: '液态', g: '气态' };
  const CHANGES = {
    sl: { name: '熔化', heat: 1, def: '物质从固态变成液态', ex: ['冰雪消融', '铁块在炼钢炉中化成铁水', '蜡烛燃烧时流下“蜡泪”', '冰棍在嘴里化了'] },
    ls: { name: '凝固', heat: 0, def: '物质从液态变成固态', ex: ['河水结冰', '铁水浇铸成工件', '“蜡泪”变硬', '冬天水管冻裂'] },
    lg: { name: '汽化', heat: 1, def: '物质从液态变成气态（蒸发和沸腾）', ex: ['湿衣服晾干', '地上的水干了', '水烧开了', '酒精擦在皮肤上很快不见了'] },
    gl: { name: '液化', heat: 0, def: '物质从气态变成液态（降低温度、压缩体积）', ex: ['露', '雾', '“白气”', '冷饮瓶外壁“出汗”', '眼镜片起雾'] },
    sg: { name: '升华', heat: 1, def: '物质从固态直接变成气态', ex: ['樟脑丸变小', '冬天冰冻的衣服变干', '白炽灯的灯丝变细', '干冰变成二氧化碳气体'] },
    gs: { name: '凝华', heat: 0, def: '物质从气态直接变成固态', ex: ['霜', '雪', '雾凇（树挂）', '窗玻璃内侧的冰花', '白炽灯泡用久了变黑'] },
  };
  PS.CHANGES = CHANGES;

  /* ================= 碘的升华和凝华 ================= */
  PS.register('iodine', function (el) {
    const VW = 1000, VH = 460;
    const MP = 113.5; // 碘的熔点
    const st = { mode: 'bath', heat: false, T: ROOM, S: 1, top: 0, G: 0, Lq: 0, t: 0, Tw: ROOM };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'bath', label: '热水浴加热（水温不超过 100 ℃）' }, { value: 'direct', label: '酒精灯直接加热（约 400 ℃）' }], st.mode, (v) => { st.mode = v; reset(); });
    const go = PS.ui.button('🔥 开始加热', () => { st.heat = !st.heat; go.innerHTML = st.heat ? '停止加热，让它冷却' : '🔥 继续加热'; loop.start(); }, 'btn btn-primary');
    const rT = PS.ui.readout('碘的温度', '—', 'accent'), rS = PS.ui.readout('碘锤中有', '—', 'primary');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), PS.ui.row(go, PS.ui.button('↺ 重来', () => reset(), 'btn btn-ghost')), h('div', { class: 'readouts' }, rT.el, rS.el, PS.ui.readout('碘的熔点', '113.5 ℃').el), msg);
    function reset() {
      Object.assign(st, { heat: false, T: ROOM, S: 1, top: 0, G: 0, Lq: 0, Tw: ROOM });
      go.innerHTML = '🔥 开始加热';
      msg.className = 'feedback show info';
      msg.innerHTML = st.mode === 'bath' ? '碘锤（密封的玻璃泡）里装有少量固态碘颗粒。把它放进热水中加热，观察碘锤中的变化。' : '换成用酒精灯直接加热碘锤，会有什么不同？';
      loop.start();
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const d = dt * 2;
      const src = st.heat ? (st.mode === 'bath' ? (st.Tw = Math.min(95, st.Tw + 25 * d), st.Tw) : 400) : ROOM;
      if (!st.heat) st.Tw += (ROOM - st.Tw) * Math.min(1, d * 0.15);
      st.T += (src - st.T) * Math.min(1, d * (st.mode === 'direct' && st.heat ? 0.06 : 0.25));
      if (st.mode === 'bath' && st.heat) st.T = Math.min(st.T, st.Tw);
      // 升华（固 → 气）：温度越高越快；超过熔点则先熔化
      const sub = st.T > 35 ? 0.03 * Math.exp((st.T - 80) / 25) : 0;
      const sMove = Math.min(st.S, sub * d);
      st.S -= sMove; st.G += sMove;
      if (st.T > MP) { const m = Math.min(st.S, 0.4 * d); st.S -= m; st.Lq += m; const e = Math.min(st.Lq, 0.08 * d); st.Lq -= e; st.G += e; }
      else if (st.Lq > 0) { const f = Math.min(st.Lq, 0.5 * d); st.Lq -= f; st.S += f; } // 冷却后液态碘凝固
      // 凝华（气 → 固）：在温度较低的上部玻璃上结成碘晶体，停止加热后更快
      const dep = st.G * (st.heat ? 0.04 : 0.6) * PS.clamp((140 - st.T) / 120, 0.05, 1) * d;
      st.G -= dep; st.top += dep;
      rT.set(PS.fmtT(st.T, 0));
      const has = [];
      if (st.S + st.top > 0.02) has.push('固态');
      if (st.Lq > 0.01) has.push('<b class="hl-r">液态</b>');
      if (st.G > 0.03) has.push('气态（紫色）');
      rS.set(has.join(' + '));
      if (st.heat && st.mode === 'bath' && st.G > 0.15) { msg.className = 'feedback show ok'; msg.innerHTML = '碘锤中出现了<b>紫红色的碘蒸气</b>，而且始终<b>没有出现液态碘</b>：水温最高约 100 ℃，低于碘的熔点 113.5 ℃，碘不会熔化，是从固态<b>直接变成气态</b>——<b>升华</b>（吸热）。'; }
      if (st.heat && st.mode === 'direct' && st.Lq > 0.02) { msg.className = 'feedback show bad'; msg.innerHTML = '⚠️ 酒精灯火焰的温度远高于碘的熔点 113.5 ℃，碘<b>熔化</b>成了液态！这样就不能说明碘是从固态直接变成气态的。所以实验要用<b>水浴法</b>加热。'; }
      if (!st.heat && st.top > 0.3 && st.G < 0.15) { msg.className = 'feedback show ok'; msg.innerHTML = '停止加热后，紫色的碘蒸气渐渐消失，碘锤内壁（特别是上部较冷的地方）出现了<b>固态碘颗粒</b>：碘蒸气直接变成固态——<b>凝华</b>（放热）。'; }
      S.render();
      if (!st.heat && Math.abs(st.T - ROOM) < 0.5 && st.G < 0.005) loop.stop();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 440, VW, 20);
      const x = 380;
      if (st.mode === 'bath') {
        PS.lamp(ctx, x, 440, 0.9, { on: st.heat, t: st.t, cap: !st.heat });
        ctx.fillStyle = '#adb5bd'; ctx.fillRect(x - 130, 318, 260, 6);
        PS.beaker(ctx, x, 316, 240, 170, { level: 0.8, water: PS.waterColor(st.Tw) });
        D.text(ctx, '热水约 ' + Math.round(st.Tw) + ' ℃', x + 130, 300, { size: F(13), weight: 700, color: '#1c7ed6' });
      } else PS.lamp(ctx, x, 440, 0.9, { on: st.heat, t: st.t, cap: !st.heat });
      // 碘锤：上下两个玻璃泡，中间细颈
      const by = st.mode === 'bath' ? 250 : 270, ty = 80;
      ctx.save();
      const path = () => { ctx.beginPath(); ctx.ellipse(x, by, 58, 44, 0, 0, TAU); ctx.moveTo(x + 22, by - 40); ctx.rect(x - 22, ty + 30, 44, by - ty - 60); ctx.moveTo(x + 44, ty); ctx.ellipse(x, ty, 44, 34, 0, 0, TAU); };
      // 碘蒸气
      ctx.fillStyle = 'rgba(156,54,181,' + PS.clamp(st.G * 0.9, 0, 0.75) + ')';
      ctx.beginPath(); ctx.ellipse(x, by, 56, 42, 0, 0, TAU); ctx.fill();
      ctx.fillRect(x - 20, ty + 30, 40, by - ty - 60);
      ctx.beginPath(); ctx.ellipse(x, ty, 42, 32, 0, 0, TAU); ctx.fill();
      // 底部的碘颗粒、液态碘
      const n = Math.round(st.S * 22);
      for (let i = 0; i < n; i++) { const gx = x - 36 + (i % 8) * 10, gy = by + 30 - Math.floor(i / 8) * 8; ctx.fillStyle = '#4a3b52'; ctx.beginPath(); ctx.moveTo(gx, gy - 5); ctx.lineTo(gx + 5, gy); ctx.lineTo(gx, gy + 4); ctx.lineTo(gx - 5, gy); ctx.closePath(); ctx.fill(); }
      if (st.Lq > 0.01) { ctx.fillStyle = 'rgba(70,20,60,.85)'; ctx.beginPath(); ctx.ellipse(x, by + 34, 40 * Math.sqrt(st.Lq) + 8, 6 + 6 * st.Lq, 0, 0, TAU); ctx.fill(); D.text(ctx, '液态碘！', x + 70, by + 40, { size: F(14), weight: 800, color: '#e03131' }); }
      // 上部凝华的碘晶体
      const m = Math.round(st.top * 30);
      for (let i = 0; i < m; i++) { const a = (i / 30) * TAU * 1.7, gx = x + Math.cos(a) * 36, gy = ty - 4 + Math.sin(a) * 24; ctx.fillStyle = '#5f3dc4'; ctx.beginPath(); ctx.moveTo(gx, gy - 3); ctx.lineTo(gx + 3, gy); ctx.lineTo(gx, gy + 3); ctx.lineTo(gx - 3, gy); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2.5; path(); ctx.stroke();
      ctx.restore();
      D.text(ctx, '碘锤', x - 80, ty - 30, { size: F(14), weight: 800, color: '#3a4458', align: 'right' });
      // 右侧：状态说明
      const tx = 620;
      D.text(ctx, '观察要点', tx, 70, { size: F(16), weight: 800, color: '#3a4458' });
      [['固态碘', '#4a3b52', '紫黑色的颗粒'], ['气态碘', '#9c36b5', '紫红色的蒸气'], ['液态碘', '#46143c', '有没有出现？']].forEach(([a, c, b], i) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(tx + 10, 108 + i * 36, 9, 0, TAU); ctx.fill();
        D.text(ctx, a + '：' + b, tx + 28, 108 + i * 36, { size: F(14), weight: 700, color: '#3a4458', baseline: 'middle' });
      });
      D.text(ctx, st.heat ? '🔥 吸热：升华（固 → 气）' : st.top > 0.05 ? '❄️ 放热：凝华（气 → 固）' : '', tx, 240, { size: F(15), weight: 800, color: st.heat ? PS.HEAT_C.absorb : PS.HEAT_C.release });
      ctx.restore();
    }
    reset();
  });

  /* ================= 人工降雨 ================= */
  const RAIN_STEPS = [
    ['飞机在云层中撒播<b>干冰</b>（固态二氧化碳）。', null],
    ['干冰迅速<b>升华</b>，从周围<b>吸收大量的热</b>，使云层中的温度急剧下降。', 'sg'],
    ['云层中的水蒸气遇冷，<b>凝华</b>成小冰晶（有的<b>液化</b>成小水滴）。', 'gs'],
    ['小冰晶逐渐变大，云托不住时就开始下落。', null],
    ['下落途中遇到温暖的气流，小冰晶<b>熔化</b>成雨滴，落到地面——下雨了！', 'sl'],
  ];
  PS.register('cloud-seeding', function (el) {
    const VW = 1000, VH = 440, ZERO = 250;
    const st = { step: -1, t: 0, T: 0, ice: [], drops: [], dry: [], play: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const play = PS.ui.button('▶ 播放', () => { st.step = 0; st.T = 0; st.ice = []; st.drops = []; st.dry = []; st.play = true; loop.start(); }, 'btn btn-primary');
    const steps = h('ol', { class: 'step-list cs-steps' }, RAIN_STEPS.map((s) => h('li', { html: s[0] + (s[1] ? ' <span class="badge ' + (CHANGES[s[1]].heat ? 'o' : '') + '">' + CHANGES[s[1]].name + (CHANGES[s[1]].heat ? ' · 吸热' : ' · 放热') + '</span>' : '') })));
    el.append(PS.ui.row(play), steps);
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.play) {
        st.T += dt;
        const k = Math.min(4, Math.floor(st.T / 3.2));
        if (k !== st.step) st.step = k;
        if (st.T > 18) st.play = false;
      }
      Array.from(steps.children).forEach((li, i) => { li.className = i < st.step ? 'done' : i === st.step ? 'cur' : ''; });
      const px = 80 + ((st.T * 150) % 1100);
      if (st.step === 0 && Math.random() < dt * 30) st.dry.push({ x: px - 40, y: 110, r: 5 });
      st.dry.forEach((d) => { d.y += dt * 30; if (st.step >= 1) d.r -= dt * 2.2; });
      st.dry = st.dry.filter((d) => d.r > 0.3);
      if (st.step === 2 && Math.random() < dt * 40) st.ice.push({ x: PS.rand(150, 850), y: PS.rand(90, 170), s: 2, v: 0 });
      st.ice.forEach((c) => { if (st.step >= 2) c.s = Math.min(9, c.s + dt * 2.5); if (st.step >= 3) { c.v += dt * 30; c.y += c.v * dt; } });
      st.ice.forEach((c) => { if (c.y > ZERO) { st.drops.push({ x: c.x, y: c.y, v: c.v + 40 }); c.dead = true; } });
      st.ice = st.ice.filter((c) => !c.dead);
      st.drops.forEach((d) => { d.v += dt * 200; d.y += d.v * dt; });
      st.drops = st.drops.filter((d) => d.y < 410);
      if (st.step >= 4 && st.T < 17 && Math.random() < dt * 40) st.drops.push({ x: PS.rand(150, 850), y: ZERO, v: 120 });
      S.render();
    }, S.stage);
    function cloud(ctx, x, y, s, c) { ctx.fillStyle = c; [[0, 0, 50], [45, 10, 40], [-45, 12, 38], [20, -25, 38], [-20, -20, 34]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); }); }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const g = ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#a5b4c8'); g.addColorStop(0.6, '#d0ebff'); g.addColorStop(1, '#e7f5ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#8ce99a'; ctx.fillRect(0, 410, VW, 30);
      const cold = st.step >= 1 && st.step <= 3;
      for (let i = 0; i < 6; i++) cloud(ctx, 120 + i * 155, 130 + (i % 2) * 20, 1.3, cold ? 'rgba(220,228,240,.95)' : 'rgba(173,181,189,.92)');
      ctx.strokeStyle = '#e8590c'; ctx.setLineDash([8, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, ZERO); ctx.lineTo(VW, ZERO); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '0 ℃ 高度：上方低于 0 ℃，下方高于 0 ℃', 990, ZERO - 8, { size: F(12), weight: 700, color: '#e8590c', align: 'right' });
      // 飞机
      if (st.step === 0 || st.step === 1) {
        const px = 80 + ((st.T * 150) % 1100);
        ctx.save(); ctx.translate(px, 70);
        ctx.fillStyle = '#495057'; D.roundRect(ctx, -50, -8, 100, 16, 8); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-30, 30); ctx.lineTo(10, 0); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-52, -18); ctx.lineTo(-30, 0); ctx.fill();
        ctx.restore();
      }
      st.dry.forEach((d) => { ctx.fillStyle = '#f8f9fa'; ctx.strokeStyle = '#868e96'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); ctx.stroke(); });
      if (st.step === 1) D.text(ctx, '干冰升华，吸热 → 云层温度骤降', 500, 215, { size: F(15), weight: 800, color: PS.HEAT_C.absorb, align: 'center', bg: 'rgba(255,255,255,.9)' });
      if (st.step === 2) D.text(ctx, '水蒸气凝华成小冰晶，放热', 500, 215, { size: F(15), weight: 800, color: PS.HEAT_C.release, align: 'center', bg: 'rgba(255,255,255,.9)' });
      if (st.step >= 4) D.text(ctx, '小冰晶熔化成雨滴，吸热', 500, 300, { size: F(15), weight: 800, color: PS.HEAT_C.absorb, align: 'center', bg: 'rgba(255,255,255,.9)' });
      // 冰晶（六角形的小雪花）
      st.ice.forEach((c) => {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8;
        ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; ctx.moveTo(c.x - Math.cos(a) * c.s, c.y - Math.sin(a) * c.s); ctx.lineTo(c.x + Math.cos(a) * c.s, c.y + Math.sin(a) * c.s); } ctx.stroke();
      });
      st.drops.forEach((d) => { ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 2, d.y - 12); ctx.stroke(); });
      ctx.restore();
    }
    if (!document.getElementById('cs2-style')) document.head.append(h('style', { id: 'cs2-style' }, '.cs-steps{margin-top:10px}.cs-steps li{padding:2px 0}.cs-steps .badge{margin-left:6px}'));
    loop.start();
  });

  /* ================= 三态变化图 ================= */
  PS.register('state-wheel', function (el) {
    const VW = 1000, VH = 520;
    const NODE = { s: [500, 95], l: [210, 420], g: [790, 420] };
    const st = { sel: 'sl', filter: 'all', t: 0, hover: null };
    const mols = { s: PS.Mols(18, { w: 96, h: 70, r: 6 }), l: PS.Mols(18, { w: 96, h: 70, r: 6 }), g: PS.Mols(10, { w: 96, h: 70, r: 6 }) };
    mols.s.setState('solid'); mols.l.setState('liquid'); mols.g.setState('gas');
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'pointer';
    const seg = PS.ui.seg([{ value: 'all', label: '全部六种' }, { value: 'abs', label: '吸热的三种' }, { value: 'rel', label: '放热的三种' }], st.filter, (v) => { st.filter = v; S.render(); });
    const info = h('div', { class: 'sw-info' });
    el.append(PS.ui.row(seg.el, h('span', { class: 'kbd-hint' }, '点击箭头查看详细说明')), info);
    // 箭头：两个状态之间画一对弧线，外侧与内侧
    function arrowPts(k) {
      const a = NODE[k[0]], b = NODE[k[1]];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny);
      // 指向三角形中心的一侧为“内侧”
      const cx = 500, cy = 312;
      let ox = nx / L, oy = ny / L;
      const out = (mx + ox - cx) * ox + (my + oy - cy) * oy > 0;
      const absorb = CHANGES[k].heat === 1;
      const sign = (out ? 1 : -1) * (absorb ? 1 : -1); // 吸热的画在外侧
      const off = 34 * sign;
      const ux = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), uy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
      const p0 = [a[0] + ux * 82 + ox * off * 0.6, a[1] + uy * 82 + oy * off * 0.6], p1 = [b[0] - ux * 82 + ox * off * 0.6, b[1] - uy * 82 + oy * off * 0.6];
      const c = [mx + ox * off * 1.6, my + oy * off * 1.6];
      return { p0, p1, c, mid: [(p0[0] + 2 * c[0] + p1[0]) / 4, (p0[1] + 2 * c[1] + p1[1]) / 4] };
    }
    const visible = (k) => st.filter === 'all' || (st.filter === 'abs') === (CHANGES[k].heat === 1);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      Object.keys(CHANGES).forEach((k) => {
        if (!visible(k)) return;
        const p = arrowPts(k), c = CHANGES[k], on = st.sel === k, col = c.heat ? PS.HEAT_C.absorb : PS.HEAT_C.release;
        ctx.strokeStyle = col; ctx.lineWidth = on ? 6 : st.hover === k ? 4.5 : 3; ctx.globalAlpha = on || st.hover === k ? 1 : 0.75;
        ctx.beginPath(); ctx.moveTo(p.p0[0], p.p0[1]); ctx.quadraticCurveTo(p.c[0], p.c[1], p.p1[0], p.p1[1]); ctx.stroke();
        const ang = Math.atan2(p.p1[1] - p.c[1], p.p1[0] - p.c[0]);
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p.p1[0], p.p1[1]); ctx.lineTo(p.p1[0] - 16 * Math.cos(ang - 0.4), p.p1[1] - 16 * Math.sin(ang - 0.4)); ctx.lineTo(p.p1[0] - 16 * Math.cos(ang + 0.4), p.p1[1] - 16 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        D.text(ctx, c.name + (c.heat ? '（吸热）' : '（放热）'), p.mid[0], p.mid[1], { size: F(on ? 16 : 14), weight: 800, color: col, align: 'center', baseline: 'middle', bg: on ? (c.heat ? '#ffe3e3' : '#d0ebff') : 'rgba(255,255,255,.95)' });
        // 沿箭头移动的小球
        if (on) {
          const u = (st.t * 0.6) % 1, x = (1 - u) * (1 - u) * p.p0[0] + 2 * u * (1 - u) * p.c[0] + u * u * p.p1[0], y = (1 - u) * (1 - u) * p.p0[1] + 2 * u * (1 - u) * p.c[1] + u * u * p.p1[1];
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
        }
      });
      Object.keys(NODE).forEach((k) => {
        const [x, y] = NODE[k], c = PS.STATE[{ s: 'solid', l: 'liquid', g: 'gas' }[k]];
        ctx.fillStyle = c.bg; ctx.strokeStyle = c.c; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 76, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, 72, 0, TAU); ctx.clip();
        mols[k].draw(ctx, x - 48, y - 30, { bonds: k === 's' });
        ctx.restore();
        D.text(ctx, ST[k], x, y - 46, { size: F(18), weight: 800, color: c.c, align: 'center', baseline: 'middle', bg: 'rgba(255,255,255,.85)' });
      });
      ctx.restore();
    }
    function show() {
      const c = CHANGES[st.sel], from = ST[st.sel[0]], to = ST[st.sel[1]];
      info.innerHTML = '<h4 style="margin:0 0 4px;color:' + (c.heat ? PS.HEAT_C.absorb : PS.HEAT_C.release) + '">' + c.name + '：' + from + ' → ' + to + '　<span class="badge ' + (c.heat ? 'o' : '') + '">' + (c.heat ? '吸热' : '放热') + '</span></h4><p style="margin:0 0 4px">' + c.def + '。</p><p class="small muted" style="margin:0">生活实例：' + c.ex.join('；') + '。</p>';
    }
    function hit(e) {
      const p = S.pos(e), x = (p.x / S.w) * VW, y = (p.y / S.h) * VH;
      let best = null, bd = 50;
      Object.keys(CHANGES).forEach((k) => { if (!visible(k)) return; const m = arrowPts(k).mid; const d = Math.hypot(m[0] - x, m[1] - y); if (d < bd) { bd = d; best = k; } });
      return best;
    }
    S.canvas.addEventListener('pointermove', (e) => { const k = hit(e); if (k !== st.hover) { st.hover = k; S.render(); } });
    S.canvas.addEventListener('click', (e) => { const k = hit(e); if (k) { st.sel = k; show(); } });
    const loop = PS.loop((dt) => { st.t += dt; Object.values(mols).forEach((m) => m.step(dt, 0.5)); S.render(); }, S.stage);
    if (!document.getElementById('sw-style')) document.head.append(h('style', { id: 'sw-style' }, '.sw-info{margin-top:10px;background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px 14px}'));
    show(); loop.start();
  });

  /* ================= 物态变化判断三步法（随机出题） ================= */
  const PHENO = [
    ['春天，冰雪消融', 's', 'l'], ['寒冬，河面结冰', 'l', 's'], ['用铁水浇铸工件', 'l', 's'], ['夏天，洒在地上的水很快干了', 'l', 'g'], ['湿衣服晾干了', 'l', 'g'], ['水烧开后，水越来越少', 'l', 'g'],
    ['清晨，草叶上的露珠', 'g', 'l'], ['山间的雾', 'g', 'l'], ['夏天，冰棍周围冒“白气”', 'g', 'l'], ['冬天，人呼出“白气”', 'g', 'l'], ['从冰箱拿出的饮料瓶外壁“出汗”', 'g', 'l'], ['冬天戴眼镜的人从室外走进温暖的房间，镜片起雾', 'g', 'l'], ['飞机在高空飞行时“拉烟”', 'g', 'l'],
    ['衣柜里的樟脑丸变小了', 's', 'g'], ['冬天，室外冰冻的衣服变干了', 's', 'g'], ['白炽灯用久了，灯丝变细', 's', 'g'], ['舞台上的干冰“消失”了', 's', 'g'],
    ['深秋，地面上的霜', 'g', 's'], ['冬天，树枝上的雾凇（树挂）', 'g', 's'], ['冬天，窗玻璃内侧的冰花', 'g', 's'], ['白炽灯泡用久了，内壁变黑', 'g', 's'], ['冬天，天空中飘落的雪花', 'g', 's'],
    ['蜡烛燃烧时，流下“蜡泪”', 's', 'l'], ['冬天，水管冻裂', 'l', 's'], ['冰棍放进嘴里，化了', 's', 'l'], ['把酒精擦在手背上，很快就不见了', 'l', 'g'], ['冬天，冰冻的湖面上的冰慢慢变薄（气温一直低于 0 ℃）', 's', 'g'], ['寒冷的冬天，室外的雪人没有熔化却变小了', 's', 'g'],
  ];
  PS.register('phase-judge', function (el) {
    const st = { q: null, step: 0, ok: 0, n: 0, first: true };
    const qEl = h('div', { class: 'pj-q' });
    const body = h('div', { class: 'pj-body' });
    const score = h('span', { class: 'quiz-score' });
    el.append(h('div', { class: 'quiz-head' }, score, PS.ui.button('换一题 →', next, 'btn btn-sm')), qEl, body);
    function next() {
      let q; do { q = PS.pick(PHENO); } while (st.q && q === st.q);
      st.q = q; st.step = 0; st.first = true; render();
    }
    function render() {
      const [t, a, b] = st.q;
      qEl.innerHTML = '🔎 现象：<b>' + t + '</b>';
      body.innerHTML = '';
      const row = (label, opts, ans, onOk) => {
        const r = h('div', { class: 'pj-row' }, h('span', { class: 'pj-l' }, label));
        const fb = h('span', { class: 'pj-fb' });
        opts.forEach(([v, txt]) => r.append(PS.ui.button(txt, (e) => {
          if (r.dataset.done) return;
          if (v === ans) { r.dataset.done = 1; e.target.classList.add('btn-green'); fb.innerHTML = '✔'; PS.sound.good(); onOk(); }
          else { e.target.classList.add('btn-red'); st.first = false; fb.innerHTML = '✘ 再想想'; PS.sound.bad(); }
        }, 'btn btn-sm')));
        r.append(fb); body.append(r);
      };
      const stOpts = [['s', '固态'], ['l', '液态'], ['g', '气态']];
      row('① 原来是什么状态？', stOpts, a, () => {
        row('② 后来变成什么状态？', stOpts, b, () => {
          const c = CHANGES[a + b];
          body.append(h('div', { class: 'pj-row' }, h('span', { class: 'pj-l' }, '③ 物态变化：'), h('b', { style: { color: c.heat ? PS.HEAT_C.absorb : PS.HEAT_C.release, fontSize: '1.1rem' } }, ST[a] + ' → ' + ST[b] + '，' + c.name)));
          row('④ 吸热还是放热？', [[1, '吸热'], [0, '放热']], c.heat, () => {
            st.n++; if (st.first) st.ok++;
            score.innerHTML = '已完成 <b>' + st.n + '</b> 题 · 一次答对 <b class="ok">' + st.ok + '</b>';
            const tip = { 'gl': '提示：“白气”、露、雾都是<b>小水滴</b>（液态），由水蒸气液化而来。', 'gs': '提示：霜、雪、雾凇、冰花都是<b>小冰晶</b>，由水蒸气直接凝华而成，不经过液态。', 'sg': '提示：升华是固态<b>直接</b>变成气态，中间不经过液态。' }[a + b];
            body.append(h('div', { class: 'feedback show ok small' }, h('span', { html: '✔ ' + st.q[0] + '：' + ST[a] + ' → ' + ST[b] + '，属于<b>' + c.name + '</b>，' + (c.heat ? '吸热' : '放热') + '。' + (tip ? '<br>' + tip : '') })));
          });
        });
      });
    }
    if (!document.getElementById('pj-style')) document.head.append(h('style', { id: 'pj-style' }, `
      .pj-q{font-size:1.08rem;background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:6px 0 10px}
      .pj-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}
      .pj-l{font-weight:700;min-width:150px}
      .pj-fb{font-weight:700;font-size:.9rem}
    `));
    score.innerHTML = '三步法：看初态 → 看末态 → 定名称';
    next();
  });

  /* ================= 自然界的水循环 ================= */
  const CYCLE = [
    { k: 'evap', x: 230, y: 300, name: '蒸发（汽化）', heat: 1, d: '太阳照射下，海洋、江河湖泊和陆地上的水<b>蒸发</b>，变成水蒸气升入高空——<b>汽化</b>，吸热。' },
    { k: 'cloud', x: 330, y: 95, name: '成云（液化、凝华）', heat: 0, d: '水蒸气在高空遇冷，有的<b>液化</b>成小水滴，有的<b>凝华</b>成小冰晶，聚在一起就是<b>云</b>——放热。' },
    { k: 'rain', x: 560, y: 190, name: '降雨、降雪', heat: 0, d: '小水滴、小冰晶逐渐变大，空气托不住时就落下来，形成雨、雪、冰雹等。小冰晶在下落中遇暖<b>熔化</b>成雨滴。' },
    { k: 'melt', x: 800, y: 175, name: '冰雪消融（熔化）', heat: 1, d: '高山上的积雪和冰川在春夏季节<b>熔化</b>成水，汇入江河——吸热。' },
    { k: 'flow', x: 610, y: 400, name: '地表径流', heat: null, d: '江河的水最终流回海洋。地球上的水在固态、液态、气态之间<b>不断地相互转化</b>，循环往复。' },
  ];
  PS.register('water-cycle', function (el) {
    const VW = 1000, VH = 460;
    const st = { sel: 'evap', t: 0, vap: [], rain: [] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'pointer';
    const out = h('div', { class: 'feedback show info' });
    el.append(out);
    function show() { const c = CYCLE.find((q) => q.k === st.sel); out.innerHTML = '<b>' + c.name + '</b>　' + c.d; S.render(); }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (Math.random() < dt * 14) st.vap.push({ x: PS.rand(40, 470), y: 330, a: 0 });
      st.vap.forEach((v) => { v.y -= dt * 60; v.x += dt * 10; v.a += dt; });
      st.vap = st.vap.filter((v) => v.y > 140);
      if (Math.random() < dt * 30) st.rain.push({ x: PS.rand(470, 680), y: 150 });
      st.rain.forEach((r) => { r.y += dt * 260; });
      st.rain = st.rain.filter((r) => r.y < 330);
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#d0ebff'); g.addColorStop(1, '#f1f8ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(70, 60, 34, 0, TAU); ctx.fill();
      // 海洋、陆地、山
      ctx.fillStyle = '#4dabf7'; ctx.fillRect(0, 330, 480, 130);
      ctx.fillStyle = '#94d82d'; ctx.beginPath(); ctx.moveTo(480, 460); ctx.lineTo(480, 340); ctx.lineTo(620, 320); ctx.lineTo(740, 160); ctx.lineTo(830, 120); ctx.lineTo(1000, 250); ctx.lineTo(1000, 460); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(740, 160); ctx.lineTo(830, 120); ctx.lineTo(905, 178); ctx.lineTo(860, 190); ctx.lineTo(820, 170); ctx.lineTo(780, 192); ctx.closePath(); ctx.fill();
      // 河流
      ctx.strokeStyle = '#339af0'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(840, 200); ctx.bezierCurveTo(780, 280, 700, 330, 620, 380); ctx.lineTo(470, 400); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.setLineDash([10, 16]); ctx.lineDashOffset = -st.t * 40;
      ctx.beginPath(); ctx.moveTo(840, 200); ctx.bezierCurveTo(780, 280, 700, 330, 620, 380); ctx.lineTo(470, 400); ctx.stroke(); ctx.setLineDash([]);
      // 云
      [[300, 95, 1.2], [560, 120, 1.4], [440, 80, 0.9]].forEach(([x, y, s]) => { ctx.fillStyle = 'rgba(255,255,255,.95)'; [[0, 0, 40], [38, 8, 32], [-38, 10, 30], [16, -20, 30]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU); ctx.fill(); }); });
      // 水蒸气
      st.vap.forEach((v) => { ctx.fillStyle = 'rgba(253,126,20,' + Math.max(0, 0.7 - v.a * 0.2) + ')'; ctx.beginPath(); ctx.arc(v.x, v.y, 3.5, 0, TAU); ctx.fill(); });
      st.rain.forEach((r) => { ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 3, r.y - 12); ctx.stroke(); });
      // 雪花
      for (let i = 0; i < 10; i++) { const x = 760 + ((i * 47 + st.t * 15) % 160), y = 60 + ((i * 31 + st.t * 30) % 90); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
      CYCLE.forEach((c) => {
        const on = st.sel === c.k, col = c.heat == null ? '#495057' : c.heat ? PS.HEAT_C.absorb : PS.HEAT_C.release;
        D.text(ctx, c.name, c.x, c.y, { size: F(on ? 15 : 13), weight: 800, color: on ? '#fff' : col, align: 'center', baseline: 'middle', bg: on ? col : 'rgba(255,255,255,.92)' });
      });
      ctx.restore();
    }
    S.canvas.addEventListener('click', (e) => {
      const p = S.pos(e), x = (p.x / S.w) * VW, y = (p.y / S.h) * VH;
      const c = CYCLE.reduce((a, q) => (Math.hypot(q.x - x, q.y - y) < Math.hypot(a.x - x, a.y - y) ? q : a));
      if (Math.hypot(c.x - x, c.y - y) < 90) { st.sel = c.k; show(); }
    });
    show(); loop.start();
  });
})();
