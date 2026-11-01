/* 第3章第3节：汽化——神奇的塑料袋、沸点与气压、锅里碗中的水、蒸发吸热、影响蒸发快慢的因素、加快还是减慢蒸发。依赖 heat.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const ROOM = 20;

  /** 水的沸点与液面气压的关系（安托万公式，p 单位 kPa） */
  PS.waterBp = function (p) {
    const mm = Math.log10(p * 7.50062);
    return p <= 101.4 ? 1730.63 / (8.07131 - mm) - 233.426 : 1810.94 / (8.14019 - mm) - 244.485;
  };

  /* ================= 神奇的塑料袋（酒精的汽化与液化） ================= */
  PS.register('alcohol-bag', function (el) {
    const VW = 1000, VH = 420;
    const POS = { air: { x: 500, y: 150, T: ROOM }, hot: { x: 210, y: 270, T: 80 }, cold: { x: 790, y: 270, T: 8 } };
    const st = { at: 'air', x: 500, y: 150, gas: 0.12, t: 0 };
    const mols = PS.Mols(40, { w: 200, h: 120, r: 5 });
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'hot', label: '放进热水（80 ℃）' }, { value: 'air', label: '拿出来' }, { value: 'cold', label: '放进冷水（8 ℃）' }], 'air', (v) => { st.at = v; loop.start(); });
    const msg = h('div', { class: 'feedback show info' }, '在透明塑料袋中滴入几滴酒精，把袋挤瘪、排尽空气后扎紧袋口。把它放进热水里会怎样？');
    el.append(PS.ui.row(seg.el), msg);
    const loop = PS.loop((dt) => {
      st.t += dt;
      const p = POS[st.at];
      if (Math.abs(st.x - p.x) > 2) { st.y += (130 - st.y) * Math.min(1, dt * 6); if (st.y < 145) st.x += (p.x - st.x) * Math.min(1, dt * 4); }
      else { st.x = p.x; st.y += (p.y - st.y) * Math.min(1, dt * 5); }
      const inW = st.at !== 'air' && Math.abs(st.y - p.y) < 6;
      const tgt = !inW ? (st.at === 'air' ? 0.12 : st.gas) : st.at === 'hot' ? 1 : 0.02;
      st.gas += (tgt - st.gas) * Math.min(1, dt * (st.at === 'hot' ? 0.7 : 0.9));
      mols.set(0, st.gas);
      mols.step(dt, st.at === 'hot' ? 1 : st.at === 'cold' ? 0.2 : 0.5);
      if (inW && Math.abs(st.gas - tgt) < 0.05) {
        msg.className = 'feedback show ok';
        msg.innerHTML = st.at === 'hot' ? '塑料袋<b>鼓起来</b>了！袋中的酒精从液态变成了气态——<b>汽化</b>（吸热）。' : '塑料袋又<b>瘪了</b>，袋里又出现了液态酒精：酒精蒸气从气态变回了液态——<b>液化</b>（放热）。';
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 395, VW, 25);
      [['hot', '热水 80 ℃', 80], ['cold', '冷水 8 ℃', 8]].forEach(([k, n, T]) => {
        const x = POS[k].x;
        ctx.fillStyle = PS.waterColor(T, 0.75); ctx.fillRect(x - 170, 230, 340, 163);
        ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 172, 200); ctx.lineTo(x - 172, 395); ctx.lineTo(x + 172, 395); ctx.lineTo(x + 172, 200); ctx.stroke();
        D.text(ctx, n, x, 412, { size: F(14), weight: 800, color: T > 50 ? '#e8590c' : '#1c7ed6', align: 'center', baseline: 'middle' });
        if (T > 50) { ctx.strokeStyle = 'rgba(160,170,190,.6)'; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { const ox = x + i * 90 + Math.sin(st.t * 2 + i) * 6; ctx.beginPath(); ctx.moveTo(ox, 215); ctx.bezierCurveTo(ox - 12, 195, ox + 12, 185, ox, 165); ctx.stroke(); } }
      });
      // 塑料袋：气体越多，袋子鼓得越大
      const bw = 230, bh = 26 + st.gas * 130;
      const x = st.x, y = st.y;
      ctx.save();
      ctx.fillStyle = 'rgba(235,245,255,.55)'; ctx.strokeStyle = '#91a7c4'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(x, y, bw / 2, bh / 2, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(x + bw / 2 - 6, y - 6); ctx.lineTo(x + bw / 2 + 22, y - 14); ctx.lineTo(x + bw / 2 + 22, y + 14); ctx.lineTo(x + bw / 2 - 6, y + 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y, bw / 2 - 3, bh / 2 - 3, 0, 0, TAU); ctx.clip();
      // 液态酒精（袋底的液滴）
      const liq = 1 - st.gas;
      ctx.fillStyle = 'rgba(77,171,247,.7)';
      ctx.beginPath(); ctx.ellipse(x, y + bh / 2 - 6, 70 * Math.sqrt(liq) + 4, 8 * liq + 2, 0, 0, TAU); ctx.fill();
      // 酒精蒸气分子
      mols.ps.forEach((q) => {
        if (q.s !== 2) return;
        const px = x - bw / 2 + 20 + (q.x / 200) * (bw - 40), py = y - bh / 2 + 6 + (q.y / 120) * Math.max(10, bh - 18);
        ctx.fillStyle = '#fd7e14'; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, TAU); ctx.fill();
      });
      ctx.restore();
      D.text(ctx, '袋内：' + (st.gas > 0.6 ? '酒精蒸气（气态）' : st.gas < 0.1 ? '液态酒精' : '液态酒精 + 少量酒精蒸气'), x, y - bh / 2 - 16, { size: F(13), weight: 800, color: '#3a4458', align: 'center', bg: 'rgba(255,255,255,.9)' });
      ctx.restore();
    }
    loop.start();
  });

  /* ================= 沸点与气压 ================= */
  PS.register('boil-pressure', function (el) {
    const VW = 1000, VH = 460;
    const st = { x: 0, T: 96, t: 0, bub: [], mark: null };
    const p = () => 101.3 / (1 + st.x); // 拉出活塞，烧瓶内气压减小
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const sl = PS.ui.slider({ label: '注射器活塞', min: -0.3, max: 1.2, step: 0.01, value: 0, fmt: (v) => (v > 0.01 ? '向外拉' : v < -0.01 ? '向里推' : '原位'), onInput: (v) => { st.x = v; st.mark = null; } });
    sl.el.classList.add('wide');
    const rP = PS.ui.readout('瓶内气压', '—', 'primary'), rB = PS.ui.readout('此气压下的沸点', '—'), rT = PS.ui.readout('水温', '—', 'accent');
    const msg = h('div', { class: 'feedback show info' });
    const marks = [['标准大气压', 101.3, '1 个标准大气压（约 101 kPa）下，水的沸点是 100 ℃。'], ['高压锅', 200, '高压锅内的气压可达约 200 kPa，水的沸点升高到约 120 ℃，食物熟得快。'], ['青藏高原', 60, '海拔 4 000 m 左右的高原上气压约 60 kPa，水的沸点只有约 86 ℃，用普通锅煮饭不容易煮熟。']];
    el.append(PS.ui.row(sl.el, PS.ui.button('↺ 重新加热到 96 ℃', () => { st.T = 96; st.x = 0; sl.set(0, true); st.mark = null; }, 'btn btn-ghost btn-sm')), h('div', { class: 'readouts' }, rP.el, rB.el, rT.el),
      PS.ui.row(h('b', null, '曲线上看一看：'), marks.map((m) => PS.ui.button(m[0], () => { st.mark = m; msg.className = 'feedback show info'; msg.innerHTML = m[2]; }, 'btn btn-sm'))), msg);
    const loop = PS.loop((dt) => {
      st.t += dt;
      const bp = PS.waterBp(p());
      const boil = st.T >= bp - 0.05;
      if (boil) st.T += (bp - st.T) * Math.min(1, dt * 1.2) - 0.05 * dt; // 沸腾吸热，水温降到沸点
      else st.T -= 0.12 * dt * (st.T - ROOM) / 76;                        // 慢慢冷却
      if (boil && st.bub.length < 60) for (let i = 0; i < 3; i++) st.bub.push({ x: PS.rand(-60, 60), y: 0, r: PS.rand(2, 4) });
      st.bub.forEach((b) => { b.y += 90 * dt; b.r += 6 * dt; });
      st.bub = st.bub.filter((b) => b.y < 95);
      rP.set(PS.fmt(p(), 0) + ' kPa'); rB.set(PS.fmtT(bp, 1)); rT.set(PS.fmtT(st.T, 1));
      if (!st.mark) {
        msg.className = 'feedback show ' + (boil ? 'ok' : 'info');
        msg.innerHTML = boil ? '向外拉活塞，烧瓶内气压<b>减小</b>，水的沸点<b>降低</b>到 ' + PS.fmtT(bp, 1) + '，低于水温，水<b>重新沸腾</b>了！' : st.x < -0.01 ? '向里推活塞，瓶内气压<b>增大</b>，沸点<b>升高</b>，水停止沸腾。' : '烧瓶中的水沸腾后撤去酒精灯，水停止沸腾。待水温稍降低一些后，用注射器<b>向外拉活塞</b>，会看到什么？';
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 烧瓶
      const cx = 200, cy = 300, R = 110;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
      ctx.fillStyle = PS.waterColor(st.T, 0.85); ctx.fillRect(cx - R, cy - 20, 2 * R, R + 20);
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2;
      st.bub.forEach((b) => { ctx.beginPath(); ctx.arc(cx + b.x, cy + 100 - b.y, b.r, 0, TAU); ctx.stroke(); });
      ctx.restore();
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 + 0.2, -Math.PI / 2 - 0.2 + TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 22, cy - R + 2); ctx.lineTo(cx - 22, 120); ctx.moveTo(cx + 22, cy - R + 2); ctx.lineTo(cx + 22, 120); ctx.stroke();
      ctx.fillStyle = '#495057'; D.roundRect(ctx, cx - 28, 100, 56, 30, 5); ctx.fill();
      // 导管与注射器
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(cx, 100); ctx.lineTo(cx, 70); ctx.lineTo(400, 70); ctx.stroke();
      const sx = 400, len = 230, px = sx + 60 + (st.x + 0.3) * 110;
      ctx.fillStyle = 'rgba(235,245,255,.9)'; ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2.5;
      ctx.fillRect(sx, 48, len, 44); ctx.strokeRect(sx, 48, len, 44);
      ctx.fillStyle = '#ced4da'; ctx.fillRect(px, 50, 14, 40); ctx.fillRect(px + 14, 64, 140, 12); ctx.fillRect(px + 150, 46, 14, 48);
      for (let i = 1; i < 8; i++) { ctx.fillStyle = '#868e96'; ctx.fillRect(sx + i * 28, 48, 1.5, 10); }
      D.text(ctx, '注射器', sx + 60, 36, { size: F(13), weight: 700, color: '#495057' });
      D.text(ctx, st.T >= PS.waterBp(p()) - 0.05 ? '沸腾！' : '不沸腾', cx, cy + R + 30, { size: F(16), weight: 800, color: st.T >= PS.waterBp(p()) - 0.05 ? '#e03131' : '#495057', align: 'center' });
      // 右侧：沸点—气压曲线
      const box = { x: 520, y: 150, w: 420, h: 250 };
      const X = (q) => box.x + ((q - 30) / 190) * box.w, Y = (T) => box.y + box.h - ((T - 60) / 70) * box.h;
      ctx.fillStyle = '#fff'; ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = '#edf0f5'; ctx.lineWidth = 1; ctx.fillStyle = '#6b7487'; ctx.font = PS.font(F(11), 600); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let q = 40; q <= 220; q += 20) { ctx.beginPath(); ctx.moveTo(X(q), box.y); ctx.lineTo(X(q), box.y + box.h); ctx.stroke(); ctx.fillText(q, X(q), box.y + box.h + 4); }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let T = 60; T <= 130; T += 10) { ctx.beginPath(); ctx.moveTo(box.x, Y(T)); ctx.lineTo(box.x + box.w, Y(T)); ctx.stroke(); ctx.fillText(T, box.x - 5, Y(T)); }
      D.arrow(ctx, box.x, box.y + box.h, box.x + box.w + 12, box.y + box.h, { width: 1.5, head: 7 });
      D.arrow(ctx, box.x, box.y + box.h, box.x, box.y - 12, { width: 1.5, head: 7 });
      D.text(ctx, '气压/kPa', box.x + box.w + 12, box.y + box.h + 34, { size: F(12), weight: 700, align: 'right' });
      D.text(ctx, '沸点/℃', box.x + 6, box.y - 8, { size: F(12), weight: 700 });
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath();
      for (let q = 32; q <= 220; q += 2) { const yy = Y(PS.waterBp(q)); q === 32 ? ctx.moveTo(X(q), yy) : ctx.lineTo(X(q), yy); }
      ctx.stroke();
      D.text(ctx, '水的沸点随气压的变化', box.x + box.w, box.y - 30, { size: F(13), weight: 800, color: '#e03131', align: 'right' });
      D.text(ctx, '气压越低，沸点越低', box.x + 12, box.y + 18, { size: F(12), weight: 700, color: '#6b7487' });
      // 当前状态点
      const q = p(), T = st.T;
      ctx.fillStyle = T >= PS.waterBp(q) - 0.05 ? '#e03131' : '#1c7ed6';
      ctx.beginPath(); ctx.arc(X(q), Y(T), 7, 0, TAU); ctx.fill();
      D.text(ctx, '瓶内', X(q) + 10, Y(T) - 10, { size: F(12), weight: 800, color: '#1b2333' });
      if (st.mark) {
        const mq = st.mark[1], mT = PS.waterBp(mq);
        ctx.strokeStyle = '#7048e8'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(mq), box.y + box.h); ctx.lineTo(X(mq), Y(mT)); ctx.lineTo(box.x, Y(mT)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.arc(X(mq), Y(mT), 7, 0, TAU); ctx.fill();
        D.text(ctx, st.mark[0] + '：约 ' + Math.round(mT) + ' ℃', X(mq) + 10, Y(mT) + 18, { size: F(13), weight: 800, color: '#7048e8', bg: 'rgba(255,255,255,.9)' });
      }
      ctx.restore();
    }
    loop.start();
  });

  /* ================= 锅里的水沸腾了，碗中的水为什么不沸腾 ================= */
  PS.register('pot-bowl', function (el) {
    const VW = 1000, VH = 420;
    const st = { liq: 'water', fire: false, Tp: 25, Tb: 25, t: 0, bp: [], bb: [] };
    const BP = { water: 100, alcohol: 78 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'water', label: '碗里装水' }, { value: 'alcohol', label: '碗里装酒精（沸点 78 ℃）' }], st.liq, (v) => { st.liq = v; st.Tb = Math.min(st.Tb, 25); });
    const fire = PS.ui.button('🔥 开火加热', () => { st.fire = !st.fire; fire.innerHTML = st.fire ? '关火' : '🔥 开火加热'; }, 'btn btn-primary');
    const rP = PS.ui.readout('锅中水温', '—', 'accent'), rB = PS.ui.readout('碗中液体温度', '—', 'primary'), rQ = PS.ui.readout('碗中液体能否继续吸热', '—');
    const msg = h('div', { class: 'feedback show info' }, '把盛水的碗放在锅里的水中隔水加热。锅里的水沸腾后，碗里的水会沸腾吗？');
    el.append(PS.ui.row(seg.el, fire, PS.ui.button('↺ 重来', () => { st.Tp = st.Tb = 25; st.fire = false; fire.innerHTML = '🔥 开火加热'; }, 'btn btn-ghost')), h('div', { class: 'readouts' }, rP.el, rB.el, rQ.el), msg);
    const loop = PS.loop((dt) => {
      st.t += dt;
      const sp = dt * 6;
      if (st.fire) st.Tp = Math.min(100, st.Tp + 2.2 * sp); else st.Tp -= 0.15 * sp * (st.Tp - ROOM) / 80;
      const bpB = BP[st.liq];
      const q = 0.08 * (st.Tp - st.Tb);
      if (st.Tb >= bpB - 0.01 && q > 0) st.Tb = bpB; else st.Tb = Math.min(bpB, st.Tb + q * sp);
      const potBoil = st.fire && st.Tp >= 99.99, bowlBoil = st.Tb >= bpB - 0.01 && st.Tp - st.Tb > 0.5;
      if (potBoil && Math.random() < dt * 30) st.bp.push({ x: PS.rand(-260, 260), y: 0, r: 3 });
      if (bowlBoil && Math.random() < dt * 25) st.bb.push({ x: PS.rand(-100, 100), y: 0, r: 2 });
      [st.bp, st.bb].forEach((arr) => arr.forEach((b) => { b.y += 70 * dt; b.r += 4 * dt; }));
      st.bp = st.bp.filter((b) => b.y < 115); st.bb = st.bb.filter((b) => b.y < 52);
      rP.set(PS.fmtT(st.Tp, 1)); rB.set(PS.fmtT(st.Tb, 1));
      rQ.set(st.Tp - st.Tb > 0.5 ? '<span class="hl-g">能（锅中水温更高）</span>' : '<span class="hl-r">不能（温度相同）</span>');
      if (potBoil) {
        msg.className = 'feedback show ' + (bowlBoil ? 'ok' : 'bad');
        msg.innerHTML = bowlBoil ? '酒精的沸点 78 ℃ 低于锅中水温 100 ℃，酒精达到沸点后还能从锅中的水<b>继续吸热</b>，所以碗里的酒精<b>沸腾</b>了。'
          : st.Tb > 99.5 ? '锅里的水沸腾了，碗里的水也达到了 <b>100 ℃</b>，但是<b>不沸腾</b>！因为碗里的水和锅里的水温度相同，<b>不能继续吸热</b>。<br>沸腾的两个条件：①温度达到沸点；②继续吸热。缺一不可。'
            : '锅里的水沸腾了，温度保持 100 ℃。碗里的水还在升温……';
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 炉子与火焰
      ctx.fillStyle = '#343a40'; ctx.fillRect(160, 380, 680, 40);
      if (st.fire) for (let i = 0; i < 9; i++) { const fx = 230 + i * 68, fh = 26 + Math.sin(st.t * 15 + i) * 6; ctx.fillStyle = 'rgba(77,141,255,.85)'; ctx.beginPath(); ctx.moveTo(fx - 10, 380); ctx.quadraticCurveTo(fx, 380 - fh * 2, fx + 10, 380); ctx.fill(); }
      // 锅
      ctx.fillStyle = PS.waterColor(st.Tp, 0.8); ctx.fillRect(205, 225, 590, 125);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(200, 180); ctx.lineTo(200, 350); ctx.quadraticCurveTo(200, 360, 215, 360); ctx.lineTo(785, 360); ctx.quadraticCurveTo(800, 360, 800, 350); ctx.lineTo(800, 180); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2;
      st.bp.forEach((b) => { ctx.beginPath(); ctx.arc(500 + b.x, 350 - b.y, b.r, 0, TAU); ctx.stroke(); });
      // 碗（浮在 / 架在锅中的水里）
      ctx.fillStyle = st.liq === 'water' ? PS.waterColor(st.Tb, 0.9) : 'rgba(255,236,153,.85)';
      ctx.beginPath(); ctx.moveTo(390, 200); ctx.quadraticCurveTo(500, 330, 610, 200); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(380, 190); ctx.quadraticCurveTo(500, 345, 620, 190); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2;
      st.bb.forEach((b) => { ctx.beginPath(); ctx.arc(500 + b.x * (1 - b.y / 80), 262 - b.y, b.r, 0, TAU); ctx.stroke(); });
      if (st.Tp > 95) { ctx.strokeStyle = 'rgba(160,170,190,.5)'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { const ox = 260 + i * 160 + Math.sin(st.t * 2 + i) * 8; ctx.beginPath(); ctx.moveTo(ox, 170); ctx.bezierCurveTo(ox - 14, 140, ox + 14, 120, ox, 90); ctx.stroke(); } }
      D.text(ctx, '锅：' + PS.fmtT(st.Tp, 0), 230, 210, { size: F(15), weight: 800, color: '#1c7ed6', bg: 'rgba(255,255,255,.88)' });
      D.text(ctx, (st.liq === 'water' ? '碗中水：' : '碗中酒精：') + PS.fmtT(st.Tb, 0), 500, 165, { size: F(15), weight: 800, color: '#e8590c', align: 'center', bg: 'rgba(255,255,255,.88)' });
      ctx.restore();
    }
    loop.start();
  });

  /* ================= 蒸发吸热 ================= */
  const LIQ = { alcohol: { name: '酒精', k: 0.03, L: 42 }, water: { name: '水', k: 0.0085, L: 85 } };
  PS.register('evap-cool', function (el) {
    const VW = 1000, VH = 440, TMAX = 120;
    const st = { liq: 'alcohol', fan: false, run: false, t: 0, T: ROOM, m: 1, trace: [[0, ROOM]] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'alcohol', label: '蘸酒精的棉花' }, { value: 'water', label: '蘸水的棉花' }], st.liq, (v) => { st.liq = v; reset(); });
    const fan = PS.ui.toggle('对着它扇风', false, (v) => { st.fan = v; });
    const go = PS.ui.button('▶ 把棉花包在玻璃泡上', () => { reset(); st.run = true; loop.start(); }, 'btn btn-primary');
    const msg = h('div', { class: 'feedback show info' }, '把蘸有酒精的棉花包在温度计的玻璃泡上，观察温度计示数的变化。');
    el.append(PS.ui.row(seg.el, fan.el, go), msg);
    function reset() { Object.assign(st, { run: false, t: 0, T: ROOM, m: 1, trace: [[0, ROOM]] }); msg.className = 'feedback show info'; msg.innerHTML = '把蘸有' + LIQ[st.liq].name + '的棉花包在温度计的玻璃泡上，观察温度计示数的变化。'; S.render(); }
    const loop = PS.loop((dt) => {
      if (!st.run) return;
      const L = LIQ[st.liq], n = 10, d = (dt * 6) / n; // 1 s 现实时间 = 6 s
      for (let i = 0; i < n; i++) {
        const e = st.m > 0 ? L.k * (st.fan ? 2.4 : 1) * Math.exp((st.T - ROOM) / 25) : 0;
        st.m = Math.max(0, st.m - e * d);
        st.T += (0.16 * (ROOM - st.T) - L.L * e) * d;
        st.t += d;
      }
      st.trace.push([st.t, st.T]);
      if (st.m <= 0 && Math.abs(st.T - ROOM) < 0.3 || st.t >= TMAX) {
        st.run = false;
        const min = Math.min(...st.trace.map((p) => p[1]));
        msg.className = 'feedback show ok';
        msg.innerHTML = '温度计的示数<b>先下降、后上升</b>（最低约 ' + PS.fmtT(min, 1) + '）。' + LIQ[st.liq].name + '<b>蒸发时从玻璃泡吸热</b>，使温度降低；蒸发完后，示数又回升到室温。' + (st.liq === 'alcohol' ? '换成水试试：水蒸发得慢，降温不明显。' : '酒精比水蒸发得快，所以给发烧的病人擦酒精降温效果更好。') + (st.fan ? '扇风加快了蒸发，降温更明显。' : '');
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      const th = PS.thermo(ctx, { x: 120, top: 30, bulbY: 380, min: -10, max: 40, div: 1, label: 10, value: st.T, w: 26, bulbR: 20, F, fs: F(13) });
      if (st.m > 0 && (st.run || st.t > 0)) {
        ctx.fillStyle = 'rgba(248,249,250,.95)'; ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; ctx.beginPath(); ctx.arc(120 + Math.cos(a) * 18, 380 + Math.sin(a) * 18, 15, 0, TAU); ctx.fill(); ctx.stroke(); }
        ctx.fillStyle = 'rgba(116,192,252,' + 0.35 * st.m + ')'; ctx.beginPath(); ctx.arc(120, 380, 34, 0, TAU); ctx.fill();
        // 蒸发出的分子
        for (let i = 0; i < 10; i++) { const ph = (performance.now() / 1000 * (st.fan ? 1.6 : 0.8) + i / 10) % 1; ctx.fillStyle = 'rgba(253,126,20,' + (1 - ph) * st.m + ')'; ctx.beginPath(); ctx.arc(120 + Math.sin(i * 2.3) * 40 + (st.fan ? ph * 90 : 0), 360 - ph * 80, 4, 0, TAU); ctx.fill(); }
        D.text(ctx, '蒸发吸热', 170, 345, { size: F(13), weight: 800, color: PS.HEAT_C.absorb });
      }
      if (st.fan) D.text(ctx, '💨 扇风', 30, 420, { size: F(15), weight: 800, color: '#1c7ed6' });
      D.text(ctx, PS.fmtT(st.T, 1), 170, 60, { size: F(18), weight: 800, color: '#e8590c', baseline: 'middle', bg: '#fff' });
      const c = PS.tchart(ctx, { x: 330, y: 50, w: 610, h: 320 }, { t0: 0, t1: TMAX, T0: 8, T1: 24, tStep: 10, TStep: 2, F, fs: F(12), xl: '时间/s' });
      c.hline(ROOM, '#adb5bd', '室温 ' + ROOM + ' ℃');
      c.line(st.trace, '#e8590c', 3);
      ctx.restore();
    }
    reset();
  });

  /* ================= 影响蒸发快慢的因素（控制变量） ================= */
  const FACTORS = [{ k: 'area', name: '液体的表面积', on: '涂开' }, { k: 'heat', name: '液体的温度', on: '加热' }, { k: 'wind', name: '液面上方空气流动的速度', on: '扇风' }];
  PS.register('evap-factors', function (el) {
    const VW = 1000, VH = 440;
    const st = { A: {}, B: {}, run: false, t: 0, vA: 1, vB: 1, tA: null, tB: null, rows: [], done: {} };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const S = PS.stage(left, { ratio: VW + ' / ' + VH, draw: paint });
    const tog = {};
    const mk = (P) => h('div', { class: 'row', style: { flexDirection: 'column', alignItems: 'flex-start', gap: '4px' } }, h('b', null, '玻璃片 ' + P), FACTORS.map((f) => { const t = PS.ui.toggle(f.on, false, (v) => { st[P][f.k] = v; stop(); }); tog[P + f.k] = t; return t.el; }));
    const go = PS.ui.button('▶ 滴上等量的酒精，开始计时', start, 'btn btn-primary');
    const rA = PS.ui.readout('A 蒸发完用时', '—'), rB = PS.ui.readout('B 蒸发完用时', '—');
    const msg = h('div', { class: 'feedback show info small' }, '探究一个因素时，A、B 两块玻璃片只能有<b>一个条件不同</b>，其他条件相同（控制变量法）。');
    const tbody = h('tbody');
    const concl = h('div', { class: 'small' });
    left.append(h('div', { class: 'readouts' }, rA.el, rB.el));
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 设置两块玻璃片的条件'), h('div', { class: 'grid-2', style: { gap: '8px' } }, mk('A'), mk('B'))),
      h('div', { class: 'panel' }, h('h4', null, '② 进行实验'), h('div', { class: 'row' }, go), msg),
      h('div', { class: 'panel' }, h('h4', null, '③ 记录'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '改变的因素'), h('th', null, 'A/s'), h('th', null, 'B/s'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '④ 结论'), concl));
    const rate = (c) => (1 / 36) * (c.area ? 3 : 1) * (c.heat ? 2.5 : 1) * (c.wind ? 2.2 : 1);
    const diffs = () => FACTORS.filter((f) => !!st.A[f.k] !== !!st.B[f.k]);
    function stop() { st.run = false; st.vA = st.vB = 1; st.tA = st.tB = null; rA.set('—'); rB.set('—'); S.render(); }
    function start() {
      stop();
      const d = diffs();
      if (d.length > 1) { msg.className = 'feedback show bad small'; msg.innerHTML = '⚠️ A、B 同时有 <b>' + d.length + ' 个条件不同</b>（' + d.map((f) => f.name).join('、') + '），即使一块先干，也无法判断是哪个因素造成的。请只改变一个条件！'; PS.sound.bad(); return; }
      msg.className = 'feedback show info small';
      msg.innerHTML = d.length ? '只有“<b>' + d[0].name + '</b>”不同，观察哪块玻璃片上的酒精先消失。' : 'A、B 条件完全相同，作为对照，应该同时变干。';
      st.run = true; st.t = 0; loop.start();
    }
    function finish() {
      const d = diffs();
      rA.set(PS.fmt(st.tA, 1) + ' s'); rB.set(PS.fmt(st.tB, 1) + ' s');
      if (!d.length) { msg.innerHTML = 'A、B 条件相同，蒸发一样快。现在只改变<b>一个</b>条件试试。'; return; }
      const f = d[0], fast = st.A[f.k] ? 'A' : 'B';
      msg.className = 'feedback show ok small';
      msg.innerHTML = '玻璃片 ' + fast + ' 上的酒精先消失：<b>' + f.name + '越' + (f.k === 'area' ? '大' : f.k === 'heat' ? '高' : '快') + '，蒸发越快</b>。';
      st.done[f.k] = true;
      st.rows = st.rows.filter((r) => r.k !== f.k).concat([{ k: f.k, name: f.name, a: st.tA, b: st.tB }]);
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', { class: 'l', style: { fontSize: '.82rem' } }, r.name), h('td', null, PS.fmt(r.a, 1)), h('td', null, PS.fmt(r.b, 1)))));
      renderConcl(); PS.sound.good();
    }
    function renderConcl() {
      concl.innerHTML = '<ul style="margin:0;padding-left:1.2em">' + FACTORS.map((f) => '<li>' + (st.done[f.k] ? '✅ ' : '○ ') + f.name + '越' + (f.k === 'area' ? '大' : f.k === 'heat' ? '高' : '快') + '，蒸发越快</li>').join('') + '</ul>' +
        (Object.keys(st.done).length === 3 ? '<p style="margin:6px 0 0" class="hl-g">三个因素都探究完了！</p>' : '<p class="muted" style="margin:6px 0 0">逐一探究三个因素。</p>');
    }
    const loop = PS.loop((dt) => {
      if (st.run) {
        const d = dt * 4; // 1 s 现实时间 = 4 s
        st.t += d;
        if (st.vA > 0) { st.vA = Math.max(0, st.vA - rate(st.A) * d); if (!st.vA) st.tA = st.t; }
        if (st.vB > 0) { st.vB = Math.max(0, st.vB - rate(st.B) * d); if (!st.vB) st.tB = st.t; }
        rA.set(st.tA != null ? PS.fmt(st.tA, 1) + ' s' : PS.fmt(st.t, 1) + ' s…'); rB.set(st.tB != null ? PS.fmt(st.tB, 1) + ' s' : PS.fmt(st.t, 1) + ' s…');
        if (!st.vA && !st.vB) { st.run = false; finish(); }
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 360, VW, 80);
      [['A', 260, st.A, st.vA], ['B', 740, st.B, st.vB]].forEach(([P, x, c, v]) => {
        if (c.heat) PS.lamp(ctx, x, 440, 0.8, { on: true, t: performance.now() / 1000 + (P === 'B' ? 1 : 0) });
        const y = c.heat ? 290 : 330;
        if (c.heat) { ctx.fillStyle = '#868e96'; ctx.fillRect(x - 200, y + 38, 12, 440 - y); ctx.fillRect(x + 188, y + 38, 12, 440 - y); }
        // 玻璃片（俯视的透视效果：远边短、近边长，带一点厚度）
        ctx.fillStyle = 'rgba(200,220,240,.95)';
        ctx.beginPath(); ctx.moveTo(x - 205, y + 38); ctx.lineTo(x + 205, y + 38); ctx.lineTo(x + 205, y + 46); ctx.lineTo(x - 205, y + 46); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(230,242,252,.95)'; ctx.strokeStyle = '#91a7c4'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 160, y - 42); ctx.lineTo(x + 160, y - 42); ctx.lineTo(x + 205, y + 38); ctx.lineTo(x - 205, y + 38); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (v > 0) {
          const rx = c.area ? 120 : 42, ry = c.area ? 30 : 15;
          ctx.fillStyle = 'rgba(77,171,247,' + (0.25 + 0.55 * Math.sqrt(v)) + ')';
          ctx.beginPath(); ctx.ellipse(x, y - 2, rx * (c.area ? 1 : 0.5 + 0.5 * Math.sqrt(v)), ry * (c.area ? 1 : 0.5 + 0.5 * Math.sqrt(v)), 0, 0, TAU); ctx.fill();
          if (st.run) for (let i = 0; i < 6; i++) { const ph = (performance.now() / 1000 * rate(c) * 30 + i / 6) % 1; ctx.fillStyle = 'rgba(253,126,20,' + (1 - ph) * 0.8 + ')'; ctx.beginPath(); ctx.arc(x - 50 + i * 20 + (c.wind ? ph * 80 : 0), y - 20 - ph * 90, 4, 0, TAU); ctx.fill(); }
        } else D.text(ctx, '已经干了', x, y - 6, { size: F(14), weight: 800, color: '#2b8a3e', align: 'center', baseline: 'middle' });
        if (c.wind) {
          ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) { const ph = (performance.now() / 600 + i / 3) % 1; ctx.beginPath(); ctx.moveTo(x - 220 + ph * 60, y - 70 + i * 22); ctx.quadraticCurveTo(x - 170 + ph * 60, y - 80 + i * 22, x - 120 + ph * 60, y - 70 + i * 22); ctx.stroke(); }
          D.text(ctx, '扇风', x - 225, y - 100, { size: F(13), weight: 800, color: '#1c7ed6' });
        }
        D.text(ctx, '玻璃片 ' + P, x, 40, { size: F(17), weight: 800, color: '#3a4458', align: 'center' });
        const tags = FACTORS.filter((f) => c[f.k]).map((f) => f.on.replace(/（.*）/, ''));
        D.text(ctx, tags.length ? tags.join(' + ') : '一滴酒精', x, 72, { size: F(13), weight: 700, color: '#6b7487', align: 'center' });
      });
      const d = diffs();
      ctx.strokeStyle = '#dee2e6'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(500, 20); ctx.lineTo(500, 300); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, d.length === 1 ? '只有 1 个条件不同 ✔' : d.length ? d.length + ' 个条件不同 ✘' : '条件相同', 500, 160, { size: F(13), weight: 800, color: d.length === 1 ? '#2b8a3e' : d.length ? '#e03131' : '#6b7487', align: 'center', baseline: 'middle', bg: '#fff' });
      ctx.restore();
    }
    renderConcl();
    tbody.append(h('tr', null, h('td', { colspan: 3, class: 'muted' }, '还没有数据')));
    loop.start();
  });

  /* ================= 加快还是减慢蒸发 ================= */
  const EVAP_ITEMS = [
    ['晒粮食时，把粮食摊开', 1, '增大了液体的表面积'], ['用电吹风的热风吹湿头发', 1, '提高了液体的温度，加快了空气流动'], ['把湿衣服晾在向阳、通风的地方', 1, '提高了温度，加快了空气流动'], ['用扫帚把地面上的积水扫开', 1, '增大了液体的表面积'], ['夏天用电风扇对着湿毛巾吹', 1, '加快了液面上方空气的流动'],
    ['用保鲜袋装好蔬菜放进冰箱', 0, '降低了温度，减慢了空气流动'], ['果农用滴灌的方法给果树浇水', 0, '减小了水在地面的表面积'], ['酒精灯不用时盖上灯帽', 0, '减慢了液面上方空气的流动'], ['移栽树苗时剪去部分枝叶', 0, '减小了水分蒸发的表面积'], ['农田里覆盖地膜', 0, '减慢了液面上方空气的流动'],
  ];
  PS.register('evap-sort', function (el) {
    const score = h('div', { class: 'quiz-score' });
    const grid = h('div', { class: 'us-grid' });
    let ok = 0, done = 0;
    function build() {
      ok = 0; done = 0; grid.innerHTML = '';
      EVAP_ITEMS.slice().sort(() => Math.random() - 0.5).forEach(([t, k, why]) => {
        const card = h('div', { class: 'us-card' }, h('p', null, t));
        const res = h('small');
        const pick = (g) => {
          if (card.classList.contains('done')) return;
          card.classList.add('done', g === k ? 'ok' : 'bad');
          done++; if (g === k) ok++;
          res.innerHTML = (g === k ? '✔ ' : '✘ ') + '<b>' + (k ? '加快' : '减慢') + '蒸发</b>：' + why;
          g === k ? PS.sound.good() : PS.sound.bad();
          upd();
        };
        card.append(h('div', { class: 'us-btns' }, PS.ui.button('加快蒸发', () => pick(1), 'btn btn-sm'), PS.ui.button('减慢蒸发', () => pick(0), 'btn btn-sm')), res);
        grid.append(card);
      });
      upd();
    }
    function upd() { score.innerHTML = '已判断 <b>' + done + '</b> / ' + EVAP_ITEMS.length + ' · 答对 <b class="ok">' + ok + '</b>' + (done === EVAP_ITEMS.length ? (ok === EVAP_ITEMS.length ? ' · 🎉 全对！' : ' · 再试一次？') : ''); }
    el.append(h('div', { class: 'quiz-head' }, score, PS.ui.button('重新开始', build, 'btn btn-ghost btn-sm')), grid);
    build();
  });
})();
