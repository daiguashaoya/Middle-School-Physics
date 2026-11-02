/* 第6章第4节：密度与社会生活——气体的热胀冷缩与风的形成、水的反常膨胀（ρ–t 图像、冬天的湖、水管冻裂）、用密度鉴别物质、空心问题、盐水选种、密度的应用分类。依赖 mass.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, M = PS.mass;
  const TAU = Math.PI * 2;

  /* ================= 气体的密度与温度 ================= */
  PS.register('air-density', function (el) {
    const VW = 1000, VH = 400;
    const st = { mode: 'balloon', env: 1, T: 20, fire: false, ang: 0, t: 0 };
    const ENV = [['冰箱冷藏室', 4], ['室温', 20], ['炉火旁', 60]];
    const mSeg = PS.ui.seg([{ value: 'balloon', label: '吹鼓的气球' }, { value: 'wheel', label: '纸风车' }], st.mode, (v) => { st.mode = v; ctrl(); });
    const eSeg = PS.ui.seg(ENV.map((e, i) => ({ value: i, label: '放到' + e[0] })), 1, (v) => { st.env = v; });
    const fT = PS.ui.toggle('点燃酒精灯', false, (v) => { st.fire = v; });
    el.append(PS.ui.row(mSeg.el, eSeg.el, fT.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'ms-msg' });
    el.append(msg);
    function ctrl() { eSeg.el.style.display = st.mode === 'balloon' ? '' : 'none'; fT.el.style.display = st.mode === 'wheel' ? '' : 'none'; }
    // 气球里的“分子”
    const mols = Array.from({ length: 46 }, () => ({ a: Math.random() * TAU, r: Math.sqrt(Math.random()), va: (Math.random() - 0.5) * 2, vr: (Math.random() - 0.5) }));
    // 风车周围的空气
    const air = Array.from({ length: 110 }, () => ({ x: Math.random() * VW, y: Math.random() * VH, hot: 0 }));
    const M_AIR = 3.0; // 气球里空气的质量（g，示意）
    const loop = PS.loop((dt, t) => {
      st.t = t;
      const goal = ENV[st.env][1];
      st.T += (goal - st.T) * Math.min(1, dt * 0.8);
      const sp = Math.sqrt((st.T + 273) / 293);
      mols.forEach((m) => { m.a += m.va * dt * 1.6 * sp; m.r += m.vr * dt * 0.8 * sp; if (m.r > 0.95 || m.r < 0.05) { m.vr *= -1; m.r = PS.clamp(m.r, 0.05, 0.95); } });
      // 风车：热空气上升，冷空气从两边流过来
      const lx = 500, ly = 330;
      air.forEach((p) => {
        const dx = p.x - lx, near = Math.abs(dx) < 70 && p.y < ly;
        if (st.fire && near && p.y > 60) p.hot = Math.min(1, p.hot + dt * 2);
        else p.hot = Math.max(0, p.hot - dt * 0.4);
        let vx = 0, vy = 0;
        if (st.fire) {
          if (p.hot > 0.3) { vy = -90 * p.hot; vx = dx * 0.4 * (p.y < 140 ? 1.5 : 0.1); }
          else if (p.y > 150) { vx = -Math.sign(dx) * 40; vy = 10; }
          else { vx = Math.sign(dx) * 20; vy = 25; }
        }
        p.x += (vx + Math.sin(t * 2 + p.y) * 8) * dt; p.y += (vy + Math.cos(t * 1.7 + p.x) * 6) * dt;
        if (p.y < 0) { p.y = VH - 40; p.x = Math.random() < 0.5 ? Math.random() * 300 : 700 + Math.random() * 300; p.hot = 0; }
        if (p.y > VH - 30) p.y = VH - 30;
        if (p.x < 0) p.x += VW; if (p.x > VW) p.x -= VW;
      });
      const flow = st.fire ? 1 : 0;
      st.w = (st.w || 0) + (flow * 7 - (st.w || 0)) * Math.min(1, dt * 0.8);
      st.ang += st.w * dt;
      S.render();
      upd();
    }, el);
    let last = '';
    function upd() {
      let s;
      if (st.mode === 'balloon') {
        const V = 2.5 * (st.T + 273) / 293; // L
        s = '气球里空气的质量 m = ' + M_AIR + ' g（不变）；温度 ' + Math.round(st.T) + ' ℃ 时体积 V ≈ ' + PS.fmt(V, 2) + ' L，密度 ρ = m/V ≈ <b>' + PS.fmt(M_AIR / V, 2) + ' g/L</b>。<br>温度升高，气体<b>膨胀</b>、体积变大，<b>密度变小</b>；温度降低，体积变小，密度变大。气体的密度受温度影响最大。';
      } else s = st.fire ? '酒精灯上方的空气受热膨胀，<b>密度变小而上升</b>；周围温度低、密度大的冷空气从四面八方流过来补充，形成<b>风</b>，推动风车转动。自然界的风也是这样形成的。' : '点燃酒精灯，看看风车会怎样。';
      if (s !== last) { msg.innerHTML = s; last = s; }
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'balloon') {
        // 环境
        const env = st.env;
        if (env === 0) { ctx.fillStyle = '#e7f5ff'; D.roundRect(ctx, 120, 30, 380, 340, 16); ctx.fill(); ctx.strokeStyle = '#a5d8ff'; ctx.lineWidth = 3; ctx.stroke(); for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(130, 30 + i * 113); ctx.lineTo(490, 30 + i * 113); ctx.stroke(); } D.text(ctx, '冰箱冷藏室', 310, 60, { size: F(15), weight: 700, color: '#1c7ed6', align: 'center' }); }
        if (env === 2) { for (let i = 0; i < 3; i++) { const fx = 160 + i * 30, fy = 330; ctx.fillStyle = 'rgba(255,' + (120 + i * 30) + ',40,.85)'; ctx.beginPath(); ctx.moveTo(fx - 14, fy); ctx.quadraticCurveTo(fx - 18, fy - 40 - 10 * Math.sin(st.t * 6 + i), fx, fy - 70 - 10 * Math.sin(st.t * 5 + i)); ctx.quadraticCurveTo(fx + 18, fy - 40, fx + 14, fy); ctx.fill(); } ctx.fillStyle = '#5c3d2e'; ctx.fillRect(130, 330, 120, 30); D.text(ctx, '炉火', 190, 386, { size: F(14), weight: 700, color: '#e8590c', align: 'center' }); }
        // 气球
        const k = (st.T + 273) / 293, r = 110 * (1 + 1.6 * (k - 1)); // 体积变化放大示意
        const cx = 340, cy = 200;
        const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
        g.addColorStop(0, 'rgba(255,170,190,.85)'); g.addColorStop(1, 'rgba(230,73,128,.75)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.92, r, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c2255c'; ctx.beginPath(); ctx.moveTo(cx - 8, cy + r - 2); ctx.lineTo(cx + 8, cy + r - 2); ctx.lineTo(cx, cy + r + 12); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy + r + 12); ctx.quadraticCurveTo(cx + 20, cy + r + 60, cx - 5, VH - 10); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        mols.forEach((m) => { ctx.beginPath(); ctx.arc(cx + Math.cos(m.a) * m.r * r * 0.82, cy + Math.sin(m.a) * m.r * r * 0.88, 4, 0, TAU); ctx.fill(); });
        // 读数
        const X = 640;
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; D.roundRect(ctx, X, 40, 320, 300, 14); ctx.fill(); ctx.stroke();
        D.text(ctx, '温度 ' + Math.round(st.T) + ' ℃', X + 22, 84, { size: F(22), weight: 800, color: st.T > 30 ? '#e8590c' : st.T < 10 ? '#1c7ed6' : '#495057' });
        const V = 2.5 * k;
        D.text(ctx, '质量 m = ' + M_AIR + ' g　不变', X + 22, 140, { size: F(16), weight: 700, color: '#2b8a3e' });
        D.text(ctx, '体积 V ≈ ' + PS.fmt(V, 2) + ' L', X + 22, 186, { size: F(16), weight: 700 });
        D.text(ctx, '密度 ρ ≈ ' + PS.fmt(M_AIR / V, 2) + ' g/L', X + 22, 232, { size: F(16), weight: 800, color: '#7048e8' });
        D.text(ctx, '（气球大小的变化已放大示意）', X + 22, 300, { size: F(12), color: '#868e96' });
      } else {
        // 纸风车 + 酒精灯
        const lx = 500, ly = 330;
        air.forEach((p) => { ctx.fillStyle = p.hot > 0.3 ? 'rgba(240,101,40,' + (0.35 + 0.5 * p.hot) + ')' : 'rgba(77,171,247,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TAU); ctx.fill(); });
        // 灯
        ctx.fillStyle = 'rgba(200,225,250,.8)'; ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(lx - 50, VH - 20); ctx.quadraticCurveTo(lx - 56, ly + 10, lx - 14, ly); ctx.lineTo(lx + 14, ly); ctx.quadraticCurveTo(lx + 56, ly + 10, lx + 50, VH - 20); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ced4da'; ctx.fillRect(lx - 10, ly - 12, 20, 12);
        if (st.fire) { const f = 1 + 0.1 * Math.sin(st.t * 18); ctx.fillStyle = 'rgba(255,170,40,.9)'; ctx.beginPath(); ctx.moveTo(lx - 9, ly - 12); ctx.quadraticCurveTo(lx - 12, ly - 34 * f, lx, ly - 56 * f); ctx.quadraticCurveTo(lx + 12, ly - 34 * f, lx + 9, ly - 12); ctx.fill(); ctx.fillStyle = 'rgba(80,120,255,.6)'; ctx.beginPath(); ctx.ellipse(lx, ly - 18, 5, 8, 0, 0, TAU); ctx.fill(); }
        D.text(ctx, '酒精灯', lx + 66, VH - 26, { size: F(12), color: '#868e96' });
        // 风车（侧面看是一个水平转动的叶轮，这里画成正对的四叶风车示意）
        const wx = lx, wy = 120;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy - 70); ctx.lineTo(wx + 200, wy - 70); ctx.lineTo(wx + 200, VH - 20); ctx.stroke();
        const cols = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7'];
        for (let i = 0; i < 4; i++) {
          const a = st.ang + (i * Math.PI) / 2;
          ctx.save(); ctx.translate(wx, wy); ctx.scale(1, 0.38); ctx.rotate(a);
          ctx.fillStyle = cols[i]; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(110, -10); ctx.lineTo(110, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(wx, wy, 5, 0, TAU); ctx.fill();
        D.text(ctx, '纸风车', wx - 150, wy - 30, { size: F(13), weight: 700, color: '#495057' });
        D.text(ctx, '● 热空气（密度小）', 30, 40, { size: F(13), weight: 700, color: '#e8590c' });
        D.text(ctx, '● 冷空气（密度大）', 30, 66, { size: F(13), weight: 700, color: '#1c7ed6' });
        if (st.fire) { PS.draw.arrow(ctx, 200, 300, 380, 300, { color: '#1c7ed6', width: 3 }); PS.draw.arrow(ctx, 800, 300, 620, 300, { color: '#1c7ed6', width: 3 }); PS.draw.arrow(ctx, 470, 230, 470, 160, { color: '#e8590c', width: 3 }); }
      }
    }
    ctrl();
    loop.start();
  });

  /* ================= 水的反常膨胀 ================= */
  // 0~12 ℃ 纯水的密度（g/cm³）
  const RHO_W = [0.99984, 0.99990, 0.99994, 0.99996, 0.99997, 0.99996, 0.99994, 0.99990, 0.99985, 0.99978, 0.99970, 0.99961, 0.99950];
  const rhoW = (t) => { t = PS.clamp(t, 0, 12); const i = Math.min(11, Math.floor(t)), f = t - i; return RHO_W[i] + (RHO_W[i + 1] - RHO_W[i]) * f; };
  PS.register('water-anomaly', function (el) {
    const VW = 1000, VH = 420;
    const st = { mode: 'graph', t: 8, ice: false, run: false, Ta: -8, layers: [], iceTh: 0, time: 0, fish: 0.4, crack: 0, freeze: 0 };
    const mSeg = PS.ui.seg([{ value: 'graph', label: '密度—温度图像' }, { value: 'lake', label: '冬天的湖' }, { value: 'pipe', label: '水管冻裂' }], st.mode, (v) => { st.mode = v; ctrl(); upd(); });
    const tS = PS.ui.slider({ label: '水温', min: 0, max: 12, step: 0.1, value: st.t, unit: '℃', fmt: (v) => v.toFixed(1), onInput: (v) => { st.t = v; st.ice = false; upd(); } });
    const iceB = PS.ui.button('❄️ 0 ℃ 的水结成冰', () => { st.t = 0; tS.set(0, true); st.ice = true; upd(); }, 'btn btn-sm');
    const runB = PS.ui.button('▶ 入冬（气温 −8 ℃）', () => { if (st.run) return; resetLake(); st.run = true; }, 'btn btn-primary btn-sm');
    const pipeB = PS.ui.button('❄️ 降温到 −10 ℃', () => { st.freeze = 0.0001; }, 'btn btn-primary btn-sm');
    const ctrlRow = PS.ui.row(tS.el, iceB, runB, pipeB);
    el.append(PS.ui.row(mSeg.el), ctrlRow);
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'ms-msg' });
    el.append(msg);
    function ctrl() {
      tS.el.style.display = iceB.style.display = st.mode === 'graph' ? '' : 'none';
      runB.style.display = st.mode === 'lake' ? '' : 'none';
      pipeB.style.display = st.mode === 'pipe' ? '' : 'none';
      if (st.mode === 'lake') resetLake();
      if (st.mode === 'pipe') { st.freeze = 0; st.crack = 0; }
    }
    function resetLake() { st.layers = Array.from({ length: 16 }, () => 9); st.iceTh = 0; st.time = 0; st.run = false; }
    function upd() {
      if (st.mode === 'graph') {
        if (st.ice) msg.innerHTML = '0 ℃ 的水结成冰，质量不变，密度从 1.0 g/cm³ 变成 <b>0.9 g/cm³</b>，体积变为原来的 <b>10/9 倍</b>（1 m³ 的水结冰后约 1.1 m³）。水结冰体积变大，这是自来水管冬天会冻裂的原因。';
        else msg.innerHTML = '水温 ' + PS.fmt(st.t, 1) + ' ℃：ρ = ' + PS.fmt(rhoW(st.t), 5) + ' g/cm³。<b>4 ℃ 时水的密度最大</b>。4 ℃ 以上，水热胀冷缩；0~4 ℃ 之间，水反而<b>热缩冷胀</b>——这叫水的<b>反常膨胀</b>。';
      } else if (st.mode === 'lake') {
        msg.innerHTML = '冬天气温下降，表层的水先变冷。4 ℃ 以上时，变冷的水密度变大、<b>下沉</b>；全湖都到 4 ℃ 后，表层的水再变冷，密度反而变小，<b>浮在上面</b>，直到 0 ℃ 结冰。冰的密度小，<b>浮在水面</b>，像一层“棉被”。所以较深的湖底水温保持约 <b>4 ℃</b>，鱼儿能安全过冬。';
      } else msg.innerHTML = '水管里的水结成冰，质量不变，密度变小（1.0 → 0.9 g/cm³），<b>体积变大</b>约 1/9，就会把水管撑裂。冬天要给室外的水管包上保温材料。';
    }
    const loop = PS.loop((dt, t) => {
      st.fish = 0.5 + 0.35 * Math.sin(t * 0.4);
      if (st.mode === 'lake' && st.run) {
        const steps = Math.ceil(dt / 0.01);
        for (let k = 0; k < steps; k++) {
          const h2 = dt / steps;
          st.time += h2;
          const L = st.layers;
          if (st.iceTh <= 0) { L[0] += (st.Ta - L[0]) * h2 * 1.3; }
          else L[0] += (0 - L[0]) * h2 * 2;
          if (L[0] <= 0) { L[0] = 0; st.iceTh = Math.min(3.2, st.iceTh + h2 * 0.35); }
          // 扩散
          for (let i = 0; i < L.length - 1; i++) { const d = (L[i] - L[i + 1]) * h2 * 0.5; L[i] -= d; L[i + 1] += d; }
          // 对流：上层比下层重就下沉（混合）
          for (let pass = 0; pass < L.length; pass++) {
            let ch = false;
            for (let i = 0; i < L.length - 1; i++) if (rhoW(L[i]) > rhoW(L[i + 1]) + 1e-8) { const m = (L[i] + L[i + 1]) / 2; L[i] = m; L[i + 1] = m; ch = true; }
            if (!ch) break;
          }
        }
        if (st.iceTh >= 3.2) st.run = false;
      }
      if (st.mode === 'pipe' && st.freeze > 0 && st.freeze < 1) { st.freeze = Math.min(1, st.freeze + dt / 3); if (st.freeze > 0.85) st.crack = Math.min(1, st.crack + dt * 2); }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'graph') drawGraph(ctx, F);
      else if (st.mode === 'lake') drawLake(ctx, F);
      else drawPipe(ctx, F);
    }
    function drawGraph(ctx, F) {
      const X0 = 90, X1 = 560, Y0 = 360, Y1 = 50, R0 = 0.9994, R1 = 1.0000;
      const gx = (t) => X0 + (t / 12) * (X1 - X0), gy = (r) => Y0 - ((r - R0) / (R1 - R0)) * (Y0 - Y1);
      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
      for (let t = 1; t <= 12; t++) { ctx.beginPath(); ctx.moveTo(gx(t), Y0); ctx.lineTo(gx(t), Y1); ctx.stroke(); }
      for (let r = R0 + 0.0001; r <= R1 + 1e-9; r += 0.0001) { ctx.beginPath(); ctx.moveTo(X0, gy(r)); ctx.lineTo(X1, gy(r)); ctx.stroke(); }
      PS.draw.arrow(ctx, X0, Y0, X1 + 20, Y0, { color: '#1b2333', width: 1.6, head: 8 });
      PS.draw.arrow(ctx, X0, Y0, X0, Y1 - 20, { color: '#1b2333', width: 1.6, head: 8 });
      ctx.fillStyle = '#495057'; ctx.font = PS.font(F(12), 600); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let t = 0; t <= 12; t += 2) ctx.fillText(String(t), gx(t), Y0 + 5);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let r = R0; r <= R1 + 1e-9; r += 0.0002) ctx.fillText(r.toFixed(4), X0 - 6, gy(r));
      D.text(ctx, 't/℃', X1 + 22, Y0 + 22, { size: F(13), weight: 700, align: 'right' });
      D.text(ctx, 'ρ/(g·cm⁻³)', X0 + 6, Y1 - 26, { size: F(13), weight: 700 });
      ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 3; ctx.beginPath();
      for (let t = 0; t <= 12.001; t += 0.1) { const x = gx(t), y = gy(rhoW(t)); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#e03131'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(gx(4), Y0); ctx.lineTo(gx(4), gy(rhoW(4))); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '4 ℃ 密度最大', gx(4) + 8, gy(rhoW(4)) - 12, { size: F(13), weight: 800, color: '#e03131' });
      D.text(ctx, '（纵轴已放大）', X1 - 4, Y1 + 4, { size: F(11), color: '#868e96', align: 'right' });
      if (!st.ice) { const x = gx(st.t), y = gy(rhoW(st.t)); ctx.fillStyle = '#f08c00'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      // 1 kg 水的体积
      const X = 640, base = 360;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; D.roundRect(ctx, X, 30, 330, 360, 14); ctx.fill(); ctx.stroke();
      D.text(ctx, st.ice ? '1 kg 的冰（0 ℃）' : '1 kg 的水', X + 20, 62, { size: F(16), weight: 800 });
      const V = st.ice ? 1000 / 0.9 : 1000 / rhoW(st.t);
      D.text(ctx, 'V = ' + (st.ice ? '1111' : PS.fmt(V, 2)) + ' cm³', X + 20, 92, { size: F(15), weight: 700, color: '#1c7ed6' });
      // 容器：高度按体积（水的变化放大 2000 倍，冰按实际比例）
      const H0 = 180, hgt = st.ice ? H0 * 1.111 : H0 + (V - 1000) * 2.2;
      const bx = X + 110, bw = 110;
      ctx.fillStyle = st.ice ? 'rgba(208,235,255,.95)' : 'rgba(116,192,252,.6)';
      ctx.fillRect(bx, base - hgt, bw, hgt);
      ctx.strokeStyle = st.ice ? '#74c0fc' : '#1c7ed6'; ctx.lineWidth = 2; ctx.strokeRect(bx, base - hgt, bw, hgt);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(bx - 20, base - H0); ctx.lineTo(bx + bw + 20, base - H0); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '1000 cm³', bx + bw + 24, base - H0 + 4, { size: F(11), color: '#868e96' });
      D.text(ctx, st.ice ? '体积变大约 1/9（按实际比例画）' : '高度变化放大了约 2000 倍', X + 20, base + 22, { size: F(11), color: '#868e96' });
    }
    function drawLake(ctx, F) {
      const L = st.layers, top = 120, bot = 380, x0 = 40, x1 = 760, lh = (bot - top) / L.length;
      // 天空、岸
      const g = ctx.createLinearGradient(0, 0, 0, top);
      g.addColorStop(0, '#dbe4ff'); g.addColorStop(1, '#f1f3f5'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, top);
      D.text(ctx, '气温 ' + (st.run || st.time > 0 ? st.Ta : 9) + ' ℃', 60, 50, { size: F(16), weight: 800, color: st.run || st.time > 0 ? '#1c7ed6' : '#495057' });
      ctx.fillStyle = '#8c7a5b'; ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(x0, top); ctx.lineTo(x0 + 40, bot); ctx.lineTo(x1 - 40, bot); ctx.lineTo(x1, top); ctx.lineTo(VW, top); ctx.lineTo(VW, VH); ctx.lineTo(0, VH); ctx.closePath(); ctx.fill();
      // 水层
      L.forEach((T, i) => {
        const y = top + i * lh, k = PS.clamp(T / 9, 0, 1);
        const c = T <= 4 ? 'rgb(' + Math.round(140 - T * 22) + ',' + Math.round(210 - T * 25) + ',' + Math.round(250 - T * 8) + ')' : 'rgb(' + Math.round(52 + (T - 4) * 18) + ',' + Math.round(110 + (T - 4) * 12) + ',' + Math.round(218 - (T - 4) * 6) + ')';
        void k;
        const sl = (y - top) / (bot - top) * 40;
        ctx.fillStyle = c; ctx.fillRect(x0 + sl, y, x1 - x0 - 2 * sl, lh + 0.6);
      });
      if (st.iceTh > 0) { const th = st.iceTh * 6; ctx.fillStyle = 'rgba(240,248,255,.95)'; ctx.fillRect(x0, top - 2, x1 - x0, th); ctx.strokeStyle = '#a5d8ff'; ctx.strokeRect(x0, top - 2, x1 - x0, th); D.text(ctx, '冰层（0 ℃）', x0 + 20, top + th / 2 + 1, { size: F(12), weight: 700, color: '#1c7ed6', baseline: 'middle' }); }
      // 鱼
      const fx = x0 + 120 + st.fish * 400, fy = bot - 24;
      D.text(ctx, '🐟', fx, fy, { size: 30, align: 'center', baseline: 'middle' });
      // 温度刻度
      const X = 790;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; D.roundRect(ctx, X, 120, 190, 260, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, '各处水温', X + 16, 146, { size: F(14), weight: 800 });
      [['表层', 0], ['中层', Math.floor(L.length / 2)], ['湖底', L.length - 1]].forEach(([n, i], k) => {
        D.text(ctx, n + '：' + PS.fmt(L[i], 1) + ' ℃', X + 16, 186 + k * 40, { size: F(15), weight: 700, color: Math.abs(L[i] - 4) < 0.3 ? '#1864ab' : '#495057' });
      });
      D.text(ctx, st.iceTh > 0 ? '湖面结冰了' : st.run ? '降温中……' : '点“入冬”开始', X + 16, 330, { size: F(13), weight: 700, color: '#e8590c' });
      D.text(ctx, '颜色越深：越接近 4 ℃', X + 16, 362, { size: F(11), color: '#868e96' });
    }
    function drawPipe(ctx, F) {
      const y = 200, x0 = 120, x1 = 860, r = 50 + st.freeze * 4;
      D.text(ctx, st.freeze > 0 ? '气温 −10 ℃' : '气温 5 ℃', 120, 60, { size: F(16), weight: 800, color: st.freeze > 0 ? '#1c7ed6' : '#495057' });
      // 管壁
      ctx.fillStyle = '#868e96'; ctx.fillRect(x0, y - 62, x1 - x0, 10); ctx.fillRect(x0, y + 52, x1 - x0, 10);
      // 水 / 冰
      const f = st.freeze, ix = x0 + (x1 - x0) * f;
      ctx.fillStyle = 'rgba(116,192,252,.6)'; ctx.fillRect(ix, y - 52, x1 - ix, 104);
      if (f > 0) { ctx.fillStyle = 'rgba(225,240,255,.95)'; ctx.fillRect(x0, y - r, ix - x0, 2 * r); ctx.strokeStyle = '#a5d8ff'; for (let i = 0; i < 8; i++) { const xx = x0 + (i + 0.5) * (ix - x0) / 8; ctx.beginPath(); ctx.moveTo(xx - 10, y - 20); ctx.lineTo(xx + 10, y + 20); ctx.stroke(); } }
      if (st.crack > 0) {
        ctx.strokeStyle = '#212529'; ctx.lineWidth = 2.5;
        [[380, -1], [600, 1]].forEach(([cx, sd]) => { ctx.beginPath(); ctx.moveTo(cx, y + sd * 57); ctx.lineTo(cx + 12, y + sd * (57 + 14 * st.crack)); ctx.lineTo(cx - 6, y + sd * (57 + 28 * st.crack)); ctx.lineTo(cx + 10, y + sd * (57 + 42 * st.crack)); ctx.stroke(); });
        D.text(ctx, '水管被撑裂了！', 490, y + 120, { size: F(18), weight: 800, color: '#e03131', align: 'center' });
      }
      D.text(ctx, '水：ρ = 1.0 g/cm³', x1 - 10, y - 80, { size: F(13), weight: 700, color: '#1c7ed6', align: 'right' });
      if (f > 0) D.text(ctx, '冰：ρ = 0.9 g/cm³', x0 + 10, y - 80, { size: F(13), weight: 700, color: '#74c0fc' });
      D.text(ctx, 'm 不变，ρ 变小 → V = m/ρ 变大：1 m³ 水 → 约 1.1 m³ 冰', 490, VH - 40, { size: F(14), weight: 700, color: '#495057', align: 'center' });
    }
    ctrl(); upd();
    loop.start();
  });

  /* ================= 用密度鉴别物质（鉴宝） ================= */
  const TREAS = [
    { n: '一枚“金币”', m: 38.6, V: 2.0, c: '#f2c230', shape: 'coin', opts: ['纯金', '不是纯金'], ans: 0, why: 'ρ = 19.3 g/cm³，与金的密度相同，可能是纯金。' },
    { n: '一个“金”吊坠', m: 15.8, V: 1.2, c: '#f2c230', shape: 'pend', opts: ['纯金', '不是纯金'], ans: 1, why: 'ρ ≈ 13.2 g/cm³，比金的密度 19.3 g/cm³ 小得多，不是纯金（可能掺了铜等密度小的金属）。' },
    { n: '一只“银”手镯', m: 31.5, V: 3.0, c: '#adb5bd', shape: 'ring', opts: ['金', '银', '铜', '铝'], ans: 1, why: 'ρ = 10.5 g/cm³，与银的密度相同，可能是银。' },
    { n: '一把钥匙', m: 17.8, V: 2.0, c: '#e0a060', shape: 'key', opts: ['金', '银', '铜', '铁'], ans: 2, why: 'ρ = 8.9 g/cm³，与铜的密度相同，可能是铜。' },
    { n: '一把小勺', m: 16.2, V: 6.0, c: '#ced4da', shape: 'spoon', opts: ['铁', '铝', '铜', '银'], ans: 1, why: 'ρ = 2.7 g/cm³，与铝的密度相同，可能是铝。' },
    { n: '一把铁钉', m: 31.6, V: 4.0, c: '#9aa3ae', shape: 'nails', opts: ['铁', '铝', '铜', '铅'], ans: 0, why: 'ρ = 7.9 g/cm³，与铁的密度相同。' },
    { n: '一瓶无色透明的液体', m: 40, V: 50, c: '#e7f5ff', shape: 'liquid', opts: ['酒精', '煤油', '只靠密度无法判断'], ans: 2, why: 'ρ = 0.8 g/cm³，酒精和煤油的密度都是 0.8 g/cm³，只靠密度分不出来——还要闻气味。<b>鉴别物质常常需要多种方法并用</b>。' },
  ];
  PS.register('identify', function (el) {
    const VW = 1000, VH = 380;
    const st = { k: 0, step: 0, drop: 0, score: 0, n: 0, order: [] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const box = h('div', { class: 'ms-q' });
    const b1 = PS.ui.button('⚖️ 称质量', () => { if (st.step < 1) { st.step = 1; PS.sound.tick(); render(); } }, 'btn btn-sm');
    const b2 = PS.ui.button('💧 测体积', () => { if (st.step === 1) { st.step = 2; st.drop = 0; loop.start(); render(); } }, 'btn btn-sm');
    const score = h('span', { class: 'small muted' });
    el.append(PS.ui.row(b1, b2, PS.ui.button('换一件 →', next, 'btn btn-ghost btn-sm'), score), box);
    const T = () => TREAS[st.k];
    function next() {
      if (!st.order.length) st.order = TREAS.map((t, i) => i).sort(() => Math.random() - 0.5);
      st.k = st.order.pop(); st.step = 0; st.drop = 0; render();
    }
    const liquid = () => T().shape === 'liquid';
    const V1 = () => (liquid() ? 0 : 5);
    function render() {
      const t = T();
      box.innerHTML = '';
      if (st.step < 2) box.append(h('div', { html: '鉴定：<b>' + t.n + '</b>。先' + (st.step === 0 ? '称它的质量' : '测它的体积') + '。' }));
      else {
        const inp = h('input', { type: 'text', class: 'num', inputmode: 'decimal' });
        const fb = h('div', { class: 'feedback' });
        const ob = h('div', { class: 'q-options cols-' + Math.min(4, t.opts.length) });
        let rhoOk = false;
        const chk = () => {
          const x = parseFloat(inp.value);
          if (isNaN(x)) return;
          const r = t.m / t.V;
          rhoOk = Math.abs(x - r) <= 0.06;
          fb.className = 'feedback show ' + (rhoOk ? 'ok' : 'bad');
          fb.innerHTML = rhoOk ? '✔ ρ = m/V = ' + t.m + ' g ÷ ' + t.V + ' cm³ ≈ ' + PS.fmt(r, 2) + ' g/cm³。查密度表，它可能是什么？' : '✘ ρ = m/V = ' + t.m + ' g ÷ ' + t.V + ' cm³ ≈ ' + PS.fmt(r, 2) + ' g/cm³。查密度表，它可能是什么？';
          ob.style.display = '';
          rhoOk ? PS.sound.good() : PS.sound.bad();
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') chk(); });
        t.opts.forEach((o, i) => {
          const b = h('button', { type: 'button', class: 'q-opt', html: o });
          b.addEventListener('click', () => {
            if (ob.dataset.done) return; ob.dataset.done = 1;
            ob.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === t.ans) x.classList.add('right'); });
            if (i !== t.ans) b.classList.add('wrong');
            st.n++; if (i === t.ans) st.score++;
            score.innerHTML = '已鉴定 ' + st.n + ' 件 · 答对 ' + st.score;
            fb.className = 'feedback show ' + (i === t.ans ? 'ok' : 'bad'); fb.innerHTML = (i === t.ans ? '✔ ' : '✘ ') + t.why;
            i === t.ans ? PS.sound.good() : PS.sound.bad();
          });
          ob.append(b);
        });
        ob.style.display = 'none';
        box.append(h('div', { html: '<b>' + t.n + '</b>：m = ' + t.m + ' g，V = ' + (liquid() ? t.V + ' mL' : (V1() + t.V) + ' mL − ' + V1() + ' mL = ' + t.V + ' cm³') + '。' }),
          h('div', { class: 'ms-ans' }, h('span', null, '它的密度 ρ ='), inp, h('span', null, 'g/cm³'), PS.ui.button('计算', chk, 'btn btn-primary btn-sm')), ob, fb);
      }
      S.render();
    }
    const loop = PS.loop((dt) => { st.drop = Math.min(1, st.drop + dt / 1.2); S.render(); if (st.drop >= 1) loop.stop(); }, el);
    function item(ctx, x, y, s) {
      const t = T();
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.fillStyle = t.c; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2;
      if (t.shape === 'coin') { ctx.beginPath(); ctx.ellipse(0, -6, 22, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillRect(-22, -6, 44, 6); ctx.beginPath(); ctx.ellipse(0, -12, 22, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      else if (t.shape === 'pend') { ctx.beginPath(); ctx.moveTo(0, -36); ctx.bezierCurveTo(18, -30, 14, -6, 0, 0); ctx.bezierCurveTo(-14, -6, -18, -30, 0, -36); ctx.fill(); ctx.stroke(); }
      else if (t.shape === 'ring') { ctx.lineWidth = 7; ctx.strokeStyle = t.c; ctx.beginPath(); ctx.ellipse(0, -14, 24, 12, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, -14, 28, 15.5, 0, 0, TAU); ctx.stroke(); }
      else if (t.shape === 'key') { ctx.beginPath(); ctx.arc(-18, -10, 10, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillRect(-8, -13, 34, 6); ctx.fillRect(16, -7, 4, 6); ctx.fillRect(22, -7, 4, 4); }
      else if (t.shape === 'spoon') { ctx.beginPath(); ctx.ellipse(-16, -8, 12, 7, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillRect(-4, -10, 36, 4); }
      else if (t.shape === 'nails') { for (let i = 0; i < 4; i++) { ctx.fillRect(-24 + i * 3, -6 - i * 5, 44, 3); ctx.fillRect(-27 + i * 3, -8 - i * 5, 4, 7); } }
      ctx.restore();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, VH - 18, VW, 18);
      const t = T();
      D.text(ctx, '🔎 ' + t.n, 30, 40, { size: F(18), weight: 800 });
      // 电子天平
      const pan = M.scale(ctx, F, 230, VH - 18, 280, { text: st.step >= 1 ? M.fmt(t.m) : '0.0' });
      if (liquid()) { if (st.step >= 1 && st.step < 2) { M.beaker(ctx, 230, pan, 80, 100, { level: 0.6, liquid: 'rgba(231,245,255,.9)' }); D.text(ctx, '已去皮，只称液体', 230, pan - 110, { size: F(11), color: '#868e96', align: 'center' }); } }
      else if (st.step === 1) item(ctx, 230, pan, 1.6);
      if (st.step === 0) { if (liquid()) M.beaker(ctx, 470, VH - 18, 80, 100, { level: 0.6, liquid: 'rgba(231,245,255,.9)' }); else item(ctx, 470, VH - 18, 1.6); }
      // 量筒
      const cx = 640, V = liquid() ? (st.step >= 2 ? t.V * st.drop : 0) : (st.step >= 2 ? V1() + t.V * Math.min(1, st.drop * 1.4) : V1());
      const cyl = liquid() ? { cap: 100, div: 1, every: 10 } : { cap: 10, div: 0.2, every: 1 };
      M.cylinder(ctx, F, cx, VH - 18, 60, 280, { cap: cyl.cap, div: cyl.div, every: cyl.every, V, liquid: liquid() ? 'rgba(220,235,250,.75)' : undefined,
        inside: (c2, inf) => { if (!liquid() && st.step >= 2) { const yy = 40 + (inf.y0 - 6 - 40) * Math.min(1, st.drop); item(c2, cx, yy, 0.8); } } });
      D.text(ctx, liquid() ? '100 mL 量筒' : '10 mL 量筒（分度值 0.2 mL）', cx, 26, { size: F(12), color: '#868e96', align: 'center' });
      // 读数
      const X = 760;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; D.roundRect(ctx, X, 60, 220, 200, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, 'm = ' + (st.step >= 1 ? t.m + ' g' : '?'), X + 16, 100, { size: F(16), weight: 700 });
      if (!liquid()) D.text(ctx, 'V₁ = ' + V1() + ' mL', X + 16, 140, { size: F(15), weight: 600 });
      D.text(ctx, (liquid() ? 'V = ' : 'V₂ = ') + (st.step >= 2 && st.drop >= 1 ? (liquid() ? t.V : V1() + t.V) + ' mL' : '?'), X + 16, 176, { size: F(15), weight: 600 });
      D.text(ctx, 'ρ = m/V = ?', X + 16, 222, { size: F(16), weight: 800, color: '#7048e8' });
    }
    next();
  });

  /* ================= 空心问题 ================= */
  const HOLLOW = [['铝', 2.7, 50, 54], ['铁', 7.9, 30, 158], ['铜', 8.9, 20, 89], ['铁', 7.9, 20, 158], ['铝', 2.7, 40, 81], ['铜', 8.9, 30, 178]];
  PS.register('hollow-ball', function (el) {
    const VW = 1000, VH = 340;
    const st = { k: 0, method: 'rho', cut: false };
    const mSeg = PS.ui.seg([{ value: 'rho', label: '比较密度' }, { value: 'm', label: '比较质量' }, { value: 'V', label: '比较体积' }], 'rho', (v) => { st.method = v; work(); });
    const cutB = PS.ui.button('🔪 切开看看', () => { st.cut = !st.cut; cutB.innerHTML = st.cut ? '合上' : '🔪 切开看看'; S.render(); }, 'btn btn-sm');
    el.append(PS.ui.row(mSeg.el, cutB, PS.ui.button('换一题 →', () => { st.k = (st.k + 1) % HOLLOW.length; st.cut = false; cutB.innerHTML = '🔪 切开看看'; work(); quiz(); }, 'btn btn-ghost btn-sm')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sol = h('div', { class: 'ms-msg' });
    const qbox = h('div', { class: 'ms-q' });
    el.append(sol, qbox);
    const P = () => { const [n, r, V, m] = HOLLOW[st.k]; const Vm = PS.round(m / r, 2); return { n, r, V, m, Vm, Vh: PS.round(V - Vm, 2), solid: Math.abs(V - Vm) < 1e-6 }; };
    function work() {
      const p = P();
      let s = '<b>题目</b>：一个' + p.n + '球的体积是 ' + p.V + ' cm³，质量是 ' + p.m + ' g（ρ<sub>' + p.n + '</sub> = ' + p.r + ' g/cm³）。它是空心的还是实心的？<br>';
      if (st.method === 'rho') { const rb = PS.round(p.m / p.V, 3); s += '<b>比较密度</b>：ρ<sub>球</sub> = m/V = ' + p.m + ' g ÷ ' + p.V + ' cm³ = ' + rb + ' g/cm³ ' + (p.solid ? '= ' : '&lt; ') + 'ρ<sub>' + p.n + '</sub>，'; }
      else if (st.method === 'm') { const ms = PS.round(p.r * p.V, 2); s += '<b>比较质量</b>：假如是实心的，质量应为 m<sub>实</sub> = ρV = ' + p.r + ' g/cm³ × ' + p.V + ' cm³ = ' + ms + ' g ' + (p.solid ? '= ' : '&gt; ') + p.m + ' g，'; }
      else s += '<b>比较体积</b>：' + p.n + '的体积 V<sub>' + p.n + '</sub> = m/ρ = ' + p.m + ' g ÷ ' + p.r + ' g/cm³ = ' + p.Vm + ' cm³ ' + (p.solid ? '= ' : '&lt; ') + p.V + ' cm³，';
      s += p.solid ? '所以是<b>实心</b>的。' : '所以是<b>空心</b>的。' + (st.method === 'V' ? '空心部分的体积 V<sub>空</sub> = V − V<sub>' + p.n + '</sub> = ' + p.V + ' cm³ − ' + p.Vm + ' cm³ = <b>' + p.Vh + ' cm³</b>。' : '<span class="muted">（求空心部分的体积，要用“比较体积”的方法：V<sub>空</sub> = V − V<sub>材</sub>。）</span>');
      sol.innerHTML = s;
      S.render();
    }
    function quiz() {
      const p = P();
      qbox.innerHTML = '';
      const i1 = h('input', { type: 'text', class: 'num', inputmode: 'decimal' }), i2 = h('input', { type: 'text', class: 'num', inputmode: 'decimal' });
      const fb = h('div', { class: 'feedback' });
      const go = () => {
        const a = parseFloat(i1.value), b = parseFloat(i2.value);
        if (isNaN(a) || isNaN(b)) return;
        const tot = PS.round(p.m + p.Vh * 1, 2);
        const ok = Math.abs(a - p.Vh) < 0.01 && Math.abs(b - tot) < 0.01;
        fb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
        fb.innerHTML = (ok ? '✔ 全对！' : '✘ 再想想。') + '空心部分 V<sub>空</sub> = ' + p.Vh + ' cm³；注满水后，水的质量 m<sub>水</sub> = ρ<sub>水</sub>V<sub>空</sub> = 1 g/cm³ × ' + p.Vh + ' cm³ = ' + p.Vh + ' g，总质量 = ' + p.m + ' g + ' + p.Vh + ' g = <b>' + tot + ' g</b>。';
        ok ? PS.sound.good() : PS.sound.bad();
      };
      qbox.append(h('div', { html: '<b>练一练</b>：空心部分的体积是多少？如果在空心部分注满水，球的总质量是多少？' + (p.solid ? '（实心的，空心部分体积填 0）' : '') }),
        h('div', { class: 'ms-ans' }, h('span', { html: 'V<sub>空</sub> =' }), i1, h('span', null, 'cm³；总质量 ='), i2, h('span', null, 'g'), PS.ui.button('提交', go, 'btn btn-primary btn-sm')), fb);
    }
    const MCOL = { 铝: '#d5dbe2', 铁: '#9aa3ae', 铜: '#d9895a' };
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const p = P(), cx = 260, cy = 170, R = 120, c = MCOL[p.n];
      const g = ctx.createRadialGradient(cx - 40, cy - 50, 10, cx, cy, R);
      g.addColorStop(0, '#fff'); g.addColorStop(0.3, c); g.addColorStop(1, M.mix(c, '#000000', 0.35));
      if (!st.cut) { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill(); D.text(ctx, '?', cx, cy + 4, { size: F(56), weight: 800, color: 'rgba(0,0,0,.25)', align: 'center', baseline: 'middle' }); }
      else {
        // 切开：两个半球，中间空腔按体积比例
        const rh = R * Math.cbrt(p.Vh / p.V);
        [-1, 1].forEach((sd) => {
          const ox = cx + sd * 70;
          ctx.save(); ctx.translate(ox, cy);
          ctx.fillStyle = M.mix(c, '#ffffff', 0.15); ctx.beginPath(); ctx.ellipse(0, 0, R * 0.35, R, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = M.mix(c, '#000000', 0.3); ctx.lineWidth = 1.5; ctx.stroke();
          if (rh > 1) { ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.ellipse(0, 0, rh * 0.35, rh, 0, 0, TAU); ctx.fill(); }
          ctx.restore();
        });
        D.text(ctx, p.solid ? '实心' : '空心部分 ' + p.Vh + ' cm³', cx, cy + R + 30, { size: F(15), weight: 800, color: p.solid ? '#2b8a3e' : '#e03131', align: 'center' });
      }
      const X = 520;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; D.roundRect(ctx, X, 30, 450, 280, 14); ctx.fill(); ctx.stroke();
      D.text(ctx, p.n + '球', X + 20, 68, { size: F(20), weight: 800 });
      D.text(ctx, '体积 V = ' + p.V + ' cm³', X + 20, 110, { size: F(16), weight: 700 });
      D.text(ctx, '质量 m = ' + p.m + ' g', X + 20, 146, { size: F(16), weight: 700 });
      D.text(ctx, 'ρ' + p.n + ' = ' + p.r + ' g/cm³', X + 20, 182, { size: F(16), weight: 700, color: '#495057' });
      D.text(ctx, '三种方法任选一种判断空心还是实心；', X + 20, 236, { size: F(13), color: '#495057' });
      D.text(ctx, '求空心部分体积：V空 = V − V材', X + 20, 264, { size: F(13), weight: 700, color: '#e8590c' });
    }
    work(); quiz();
  });

  /* ================= 盐水选种 ================= */
  PS.register('salt-seed', function (el) {
    const VW = 1000, VH = 380, TOP = 90, BOT = 350, X0 = 120, X1 = 640;
    const st = { rho: 1.0 };
    const seeds = [];
    for (let i = 0; i < 24; i++) seeds.push({ good: true, rho: 1.12 + Math.random() * 0.1 });
    for (let i = 0; i < 16; i++) seeds.push({ good: false, rho: 0.86 + Math.random() * 0.2 });
    seeds.forEach((s) => { s.x = X0 + 30 + Math.random() * (X1 - X0 - 60); s.y = TOP + 20 + Math.random() * (BOT - TOP - 40); s.a = Math.random() * TAU; });
    const rS = PS.ui.slider({ label: '加盐：盐水密度', min: 1.0, max: 1.25, step: 0.01, value: 1.0, unit: 'g/cm³', fmt: (v) => v.toFixed(2), onInput: (v) => { st.rho = v; stir(); } });
    rS.el.classList.add('wide');
    el.append(PS.ui.row(rS.el, PS.ui.button('🥄 搅拌', stir, 'btn btn-sm')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'ms-msg' });
    el.append(msg);
    function stir() { seeds.forEach((s) => { s.y = TOP + 30 + Math.random() * (BOT - TOP - 60); s.vy = 0; }); loop.start(); }
    function target(s) { // 简化：密度比盐水大就下沉，小就上浮
      const d = s.rho - st.rho;
      if (Math.abs(d) < 0.01) return null; // 悬浮
      return d > 0 ? BOT - 8 - (s.x * 7) % 14 : TOP + 6;
    }
    const loop = PS.loop((dt) => {
      let moving = false;
      seeds.forEach((s) => {
        const t = target(s);
        if (t == null) return;
        const d = s.rho - st.rho, v = Math.sign(d) * PS.clamp(Math.abs(d) * 900, 45, 160);
        if ((v > 0 && s.y < t) || (v < 0 && s.y > t)) { s.y += v * dt; moving = true; if ((v > 0 && s.y > t) || (v < 0 && s.y < t)) s.y = t; }
        s.a += dt * (v > 0 ? 1 : -1);
      });
      S.render(); upd();
      if (!moving) loop.stop();
    }, el);
    function upd() {
      const sinkG = seeds.filter((s) => s.good && s.rho > st.rho).length, sinkB = seeds.filter((s) => !s.good && s.rho > st.rho).length;
      const nG = seeds.filter((s) => s.good).length, nB = seeds.length - nG;
      let tip;
      if (sinkB > 0) tip = '盐水的密度还不够大，有些<b>不饱满</b>的种子也沉下去了。再加点盐。';
      else if (sinkG < nG) tip = '盐水的密度太大了，有些<b>饱满</b>的种子也浮了起来。加点水调稀一些。';
      else tip = '✔ 正好！<b>饱满</b>的种子密度大，沉在底部；<b>不饱满</b>的种子密度小，浮在水面上，把它们捞出去就选好了种子。';
      msg.className = 'ms-msg' + (tip[0] === '✔' ? ' ok' : '');
      msg.innerHTML = '沉底：饱满种子 ' + sinkG + ' / ' + nG + '，不饱满种子 ' + sinkB + ' / ' + nB + '。' + tip;
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const k = (st.rho - 1) / 0.25;
      ctx.fillStyle = 'rgba(' + Math.round(150 - k * 40) + ',' + Math.round(205 - k * 30) + ',245,.55)';
      ctx.fillRect(X0, TOP, X1 - X0, BOT - TOP);
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X0, TOP - 30); ctx.lineTo(X0, BOT); ctx.lineTo(X1, BOT); ctx.lineTo(X1, TOP - 30); ctx.stroke();
      seeds.forEach((s) => {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
        ctx.fillStyle = s.good ? '#c99a3c' : '#e9dcb5'; ctx.strokeStyle = s.good ? '#8a6420' : '#b9a878'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(0, 0, s.good ? 9 : 8, s.good ? 5 : 2.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
      });
      const X = 680;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; D.roundRect(ctx, X, 40, 300, 300, 14); ctx.fill(); ctx.stroke();
      D.text(ctx, '盐水 ρ = ' + st.rho.toFixed(2) + ' g/cm³', X + 18, 80, { size: F(17), weight: 800, color: '#1c7ed6' });
      ctx.fillStyle = '#c99a3c'; ctx.beginPath(); ctx.ellipse(X + 30, 124, 10, 5.5, 0, 0, TAU); ctx.fill();
      D.text(ctx, '饱满的种子 ρ ≈ 1.12~1.22', X + 48, 129, { size: F(13), weight: 600 });
      ctx.fillStyle = '#e9dcb5'; ctx.beginPath(); ctx.ellipse(X + 30, 160, 9, 3, 0, 0, TAU); ctx.fill();
      D.text(ctx, '不饱满的种子 ρ ≈ 0.86~1.06', X + 48, 165, { size: F(13), weight: 600 });
      D.text(ctx, '密度比盐水大 → 下沉', X + 18, 214, { size: F(14), weight: 700, color: '#495057' });
      D.text(ctx, '密度比盐水小 → 上浮', X + 18, 244, { size: F(14), weight: 700, color: '#495057' });
      D.text(ctx, '（种子密度为示意值）', X + 18, 314, { size: F(11), color: '#868e96' });
    }
    stir(); upd();
  });

  /* ================= 密度的应用分类 ================= */
  PS.register('density-sort', function (el) {
    PS.sortCards(el, [
      ['✈️ 飞机的机身用铝合金、碳纤维等材料', 0, '密度小，体积相同时质量小，飞机更轻'],
      ['📦 包装易碎物品时用泡沫塑料填充', 0, '泡沫塑料密度小，质量小，还能缓冲'],
      ['🎬 拍电影时，砸到演员身上的“石头”用泡沫做', 0, '密度小，质量小，不会伤人'],
      ['🎈 节日里放飞的氦气球', 0, '氦气的密度比空气小'],
      ['🚲 赛车的车架用碳纤维材料', 0, '密度小、强度高'],
      ['📏 建筑工人用的铅垂线，重锤用铅或铁做', 1, '密度大，体积小而质量大，线能拉直'],
      ['⚙️ 机床的底座用密度大的铸铁做', 1, '质量大，放得稳'],
      ['🏊 潜水员身上挂铅块', 1, '铅的密度大，体积不大就有足够的质量'],
      ['🥇 测密度鉴别奖牌是不是纯金的', 2, '不同物质的密度一般不同'],
      ['🌾 用盐水选种', 2, '饱满的种子密度大，沉底；不饱满的浮起'],
      ['🥛 检测牛奶里有没有掺水', 2, '掺水后牛奶的密度变小'],
      ['⛏️ 勘探队员测岩石的密度来寻找矿藏', 2, '不同矿石的密度不同'],
    ], ['选密度小的材料', '选密度大的材料', '鉴别物质、分选']);
  });
})();
