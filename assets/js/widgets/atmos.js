/* 第9章第3节：大气压强——覆杯 / 吸盘 / 吸饮料 / 压瘪的瓶子、马德堡半球、注射器估测大气压、大气压与高度、高压锅、活塞式抽水机、分类。依赖 force.js、dynamics.js、pressure.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, PR = PS.pr, DY = PS.dyn;
  const TAU = Math.PI * 2;
  const P0C = '#1c7ed6'; // 大气压箭头的颜色

  /** 一排指向表面的大气压箭头：从 (x, y) 沿 (nx, ny) 指向表面 */
  function airArrows(ctx, pts, len, c) { pts.forEach(([x, y, nx, ny]) => D.arrow(ctx, x - nx * len, y - ny * len, x - nx * 3, y - ny * 3, { color: c || P0C, width: 2, head: 7 })); }

  /* ================= 感受大气压的存在 ================= */
  PS.register('air-exist', function (el) {
    const VW = 1000, VH = 420;
    const st = { k: 'cup', ang: 0, angT: 0, hole: false, fall: 0, cardX: 0, cardY: 0, cardV: 0, sk: 0, skT: 0, hang: false, peel: false, cupY: 0, suck: false, sealed: false, hs: 0, drunk: 0, bottle: 0, run: 0, t: 0 };
    const seg = PS.ui.seg([{ value: 'cup', label: '覆杯实验' }, { value: 'sucker', label: '塑料吸盘' }, { value: 'straw', label: '用吸管喝饮料' }, { value: 'bottle', label: '变瘪的塑料瓶' }], st.k, (v) => { st.k = v; ctl(); reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const B = (t, f, c) => PS.ui.button(t, f, c || 'btn btn-sm');
    const cs = {
      cup: PS.ui.row(B('杯口朝下', () => { st.angT = Math.PI; }), B('杯口朝左', () => { st.angT = -Math.PI / 2; }), B('正放', () => { st.angT = 0; }), PS.ui.toggle('杯底扎一个小孔', false, (v) => { st.hole = v; tell(); }).el, B('↺ 重来', reset, 'btn btn-ghost btn-sm')),
      sucker: PS.ui.row(B('① 把吸盘按在墙上', () => { st.skT = 1; st.peel = false; tell(); }), B('② 挂上一袋水果', () => { if (st.sk > 0.9) { st.hang = true; tell(); } }), B('③ 撬开吸盘的边缘', () => { if (st.sk > 0.9) { st.peel = true; tell(); } }), B('↺ 重来', reset, 'btn btn-ghost btn-sm')),
      straw: PS.ui.row(B('😮 吸一口 / 停', () => { st.suck = !st.suck; tell(); }, 'btn btn-primary btn-sm'), PS.ui.toggle('用橡皮塞把瓶口塞紧', false, (v) => { st.sealed = v; reset(); }).el, B('↺ 重来', reset, 'btn btn-ghost btn-sm')),
      bottle: PS.ui.row(B('▶ 倒入热水，摇一摇再倒掉，迅速拧紧瓶盖', () => { st.run = 0.001; tell(); }, 'btn btn-primary btn-sm'), B('↺ 重来', reset, 'btn btn-ghost btn-sm')),
    };
    const msg = h('div', { class: 'fc-msg' });
    Object.values(cs).forEach((c) => el.append(c));
    el.append(msg);
    function ctl() { Object.keys(cs).forEach((k) => (cs[k].style.display = k === st.k ? '' : 'none')); }
    function reset() {
      Object.assign(st, { ang: 0, angT: 0, fall: 0, cardX: 0, cardY: 0, cardV: 0, sk: 0, skT: 0, hang: false, peel: false, cupY: 0, suck: false, hs: 0, drunk: 0, bottle: 0, run: 0 });
      tell();
    }
    const pb = () => (st.sealed ? 1e5 - st.drunk * 9000 : 1e5); // 瓶内气压（塞紧时，喝掉的饮料越多，瓶内气压越小）
    const ps = () => (st.suck ? 1e5 - 2600 : 1e5);              // 吸管上端（嘴里）的气压
    function tell() {
      let s, c = 'info';
      if (st.k === 'cup') {
        if (st.fall) { s = '杯底有了小孔，空气从小孔进入杯中，杯内水的上方也有了大气压，纸片上下受到的压强差消失，纸片和水在重力作用下落下。'; c = 'bad'; }
        else s = '杯中装满水，用硬纸片盖住杯口，把杯子倒过来，纸片和水都不会掉下来——是<b>大气压</b>把纸片托住了。杯口朝向<b>各个方向</b>都一样：大气向各个方向都有压强。';
      } else if (st.k === 'sucker') {
        if (st.peel) { s = '撬开边缘后空气进入吸盘，内外气压相等，吸盘掉下来了。'; c = 'bad'; }
        else if (st.sk > 0.9) { s = '按压吸盘，排出里面的空气，吸盘内的气压<b>小于</b>外面的大气压，<b>大气压</b>把吸盘紧紧压在墙上' + (st.hang ? '；挂上东西也不掉——吸盘受到的<b>摩擦力</b>与物体的重力平衡。' : '。'); c = 'ok'; }
        else s = '把塑料吸盘按在光滑的墙面上。';
      } else if (st.k === 'straw') {
        if (!st.suck) s = st.sealed ? '瓶口用橡皮塞塞紧了，只有吸管和外界相通。吸一口试试。' : '用吸管喝饮料：点“吸一口”。';
        else if (st.sealed && pb() - ps() < 1e3 * 10 * 0.14) { s = '饮料喝不上来了！瓶口塞紧后，喝掉一些饮料，瓶内气压就<b>变小</b>，不足以把饮料压进嘴里。说明饮料是被<b>大气压</b>压上来的，不是被“吸”上来的。'; c = 'bad'; }
        else s = '吸气时，吸管内的气压<b>减小</b>，小于瓶中液面上的大气压，<b>大气压</b>把饮料压进吸管，进入嘴里。';
      } else {
        s = st.run >= 1 ? '瓶子被压瘪了！瓶内的水蒸气遇冷<b>液化</b>，瓶内气压<b>减小</b>，外面的大气压把瓶子压瘪。' : st.run > 0 ? '瓶子慢慢冷却……' : '在塑料瓶中倒入少量热水，摇晃后倒掉，迅速拧紧瓶盖，观察瓶子的变化。';
        c = st.run >= 1 ? 'ok' : 'info';
      }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.k === 'cup') {
        st.ang += PS.clamp(st.angT - st.ang, -dt * 2.2, dt * 2.2);
        if (st.hole && !st.fall && Math.abs(st.ang) > 1.2) { st.fall = 0.001; tell(); }
        if (st.fall) { st.fall += dt; st.cardV += 900 * dt; st.cardY += st.cardV * dt; }
      } else if (st.k === 'sucker') {
        st.sk += (st.skT - st.sk) * Math.min(1, dt * 4);
        if (st.peel) { st.cupY += 600 * dt * Math.min(1, st.cupY / 30 + 0.1); }
      } else if (st.k === 'straw') {
        const L = 0.14; // 吸管露出液面的长度
        const tgt = PS.clamp((pb() - ps()) / (1e3 * 10), 0, L + 0.01);
        st.hs += (tgt - st.hs) * Math.min(1, dt * 3);
        if (st.hs >= L && st.suck) { st.drunk = Math.min(st.sealed ? 1 : 3, st.drunk + dt * 0.12); if (st.sealed) tell(); }
      } else if (st.run > 0 && st.run < 1) { st.run = Math.min(1, st.run + dt * 0.25); if (st.run >= 1) tell(); }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      PR.air(ctx, 0, 0, VW, VH, { n: 70, t: st.t, color: 'rgba(76,110,245,.18)', r: 3 });
      if (st.k === 'cup') {
        const cx = 500, cy = 200;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.ang);
        // 杯子：杯口在本地 y = −80
        if (!st.fall || st.fall < 0.6) { ctx.fillStyle = PS.LIQ.water.c; ctx.beginPath(); ctx.moveTo(-60, -80); ctx.lineTo(-48, 80); ctx.lineTo(48, 80); ctx.lineTo(60, -80); ctx.closePath(); ctx.globalAlpha = st.fall ? 1 - st.fall / 0.6 : 1; ctx.fill(); ctx.globalAlpha = 1; }
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(-60, -80); c.lineTo(-48, 80); c.lineTo(48, 80); c.lineTo(60, -80); }, { width: 4 });
        if (st.hole) { ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(0, 80, 4, 0, TAU); ctx.fill(); }
        ctx.restore();
        // 纸片（掉落时在世界坐标中下落）
        const a = st.ang, mx = cx + Math.sin(a) * 83, my = cy - Math.cos(a) * 83;
        ctx.save(); ctx.translate(mx, my + st.cardY); ctx.rotate(a + st.cardY * 0.004);
        ctx.fillStyle = '#fff4e6'; ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2; ctx.fillRect(-80, -3, 160, 6); ctx.strokeRect(-80, -3, 160, 6);
        ctx.restore();
        if (st.fall) { ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.lineWidth = 16; ctx.lineCap = 'round'; if (st.fall < 1) { ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, Math.min(VH, my + st.fall * 300)); ctx.stroke(); } }
        else if (Math.abs(a) > 0.3) { // 大气压托住纸片
          const nx = Math.sin(a), ny = -Math.cos(a); // 纸片外法线（指向杯外）
          const tx = Math.cos(a), ty = Math.sin(a), pts = [-50, 0, 50].map((u) => [mx + tx * u + nx * 5, my + ty * u + ny * 5, -nx, -ny]);
          airArrows(ctx, pts, 46);
          D.text(ctx, '大气压', mx + nx * 70, my + ny * 70, { size: F(14), weight: 800, color: P0C, align: 'center', bg: 'rgba(255,255,255,.85)' });
        }
      } else if (st.k === 'sucker') {
        const wx = 640, cy = 170 + st.cupY, k = st.sk;
        ctx.fillStyle = '#dee2e6'; ctx.fillRect(wx, 0, VW - wx, VH); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, VH); ctx.stroke();
        const off = st.peel ? Math.min(80, st.cupY) : (1 - k) * 80;
        const depth = 46 - k * 38; // 吸盘的鼓起程度
        ctx.save(); ctx.translate(wx - off, cy);
        ctx.fillStyle = 'rgba(77,171,247,.55)'; ctx.strokeStyle = '#1971c2'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(-depth * 2, 0, 0, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1971c2'; ctx.fillRect(-depth - 26, -8, 26, 16);
        // 吸盘内的空气
        PR.air(ctx, -depth * 0.9, -40, depth * 0.85, 80, { n: k > 0.9 && !st.peel ? 2 : 10, t: st.t, color: 'rgba(76,110,245,.7)' });
        ctx.restore();
        if (st.hang && !st.peel) { const hx = wx - off - depth - 26; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, cy); ctx.lineTo(hx, cy + 90); ctx.stroke(); ctx.font = '40px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🍎🍊', hx, cy + 130); }
        if (k > 0.9 && !st.peel) { airArrows(ctx, [[wx - 30, cy - 40, 1, 0], [wx - 46, cy, 1, 0], [wx - 30, cy + 40, 1, 0]], 60); D.text(ctx, '大气压', wx - 150, cy - 60, { size: F(14), weight: 800, color: P0C }); }
        D.text(ctx, '吸盘内的气压：' + (k > 0.9 && !st.peel ? '很小' : '等于大气压'), 30, 34, { size: F(15), weight: 800, color: '#1b2333' });
      } else if (st.k === 'straw') {
        const bx0 = 380, bx1 = 560, by0 = 160, by1 = 400, lv = 250 + st.drunk * 40;
        ctx.fillStyle = 'rgba(232,89,12,.45)'; ctx.fillRect(bx0, lv, bx1 - bx0, by1 - lv);
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(bx0, by0); c.lineTo(bx0, by1); c.lineTo(bx1, by1); c.lineTo(bx1, by0); }, { width: 4 });
        if (st.sealed) { ctx.fillStyle = '#868e96'; ctx.fillRect(bx0 - 4, by0 - 26, bx1 - bx0 + 8, 30); }
        const sx = 470, top = 60;
        const wTop = lv - Math.min(st.hs / 0.14, 1) * (lv - top);
        ctx.fillStyle = 'rgba(232,89,12,.75)'; ctx.fillRect(sx - 6, wTop, 12, by1 - 20 - wTop);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.strokeRect(sx - 7, top, 14, by1 - 20 - top);
        // 嘴
        ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.ellipse(sx, top - 26, 60, 30, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.ellipse(sx, top - 6, 18, st.suck ? 6 : 10, 0, 0, TAU); ctx.fill();
        if (!st.sealed) { airArrows(ctx, [[420, lv, 0, 1], [520, lv, 0, 1]], 50); D.text(ctx, '大气压', 590, lv - 40, { size: F(14), weight: 800, color: P0C }); }
        D.text(ctx, '吸管内（嘴里）：' + PR.fmtPa(ps()), 30, 34, { size: F(14), weight: 700, color: '#e8590c' });
        D.text(ctx, '饮料液面上方：' + PR.fmtPa(pb()), 30, 34 + F(14) * 1.5, { size: F(14), weight: 700, color: P0C });
        if (st.hs >= 0.14 && st.suck) D.text(ctx, '咕嘟……', sx + 70, top - 30, { size: F(15), weight: 800, color: '#2b8a3e' });
      } else {
        const cx = 500, top = 70, bot = 380, k = Math.max(0, (st.run - 0.15) / 0.85);
        const pinch = (y) => 1 - k * 0.55 * Math.sin(Math.PI * ((y - 120) / (bot - 120))) ** 2;
        ctx.fillStyle = 'rgba(206,238,255,.6)'; ctx.strokeStyle = '#1971c2'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 22, top);
        ctx.lineTo(cx - 22, top + 30); ctx.quadraticCurveTo(cx - 70, top + 45, cx - 70, 120);
        for (let y = 120; y <= bot; y += 6) ctx.lineTo(cx - 70 * pinch(y) - (k * 6 * Math.sin(y * 0.09)), y);
        ctx.lineTo(cx + 70, bot);
        for (let y = bot; y >= 120; y -= 6) ctx.lineTo(cx + 70 * pinch(y) + (k * 6 * Math.sin(y * 0.08)), y);
        ctx.quadraticCurveTo(cx + 70, top + 45, cx + 22, top + 30); ctx.lineTo(cx + 22, top); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = st.run > 0 ? '#e03131' : '#adb5bd'; ctx.fillRect(cx - 26, top - 20, 52, 22);
        if (st.run > 0 && st.run < 0.3) { ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(cx - 40 + ((i * 23) % 80), 300 - ((st.t * 50 + i * 30) % 160), 8, 0, TAU); ctx.fill(); } }
        PR.air(ctx, cx - 60, 130, 120, 240, { n: st.run > 0 ? 18 * (1 - k * 0.8) : 18, t: st.t, color: 'rgba(76,110,245,.7)' });
        if (k > 0.2) { airArrows(ctx, [[cx - 70 * pinch(200), 200, 1, 0], [cx - 70 * pinch(280), 280, 1, 0], [cx + 70 * pinch(200), 200, -1, 0], [cx + 70 * pinch(280), 280, -1, 0]], 50); D.text(ctx, '大气压', cx + 140, 240, { size: F(14), weight: 800, color: P0C }); }
        D.text(ctx, '瓶内气压：' + (k > 0.1 ? '变小' : '与外界相同'), 30, 34, { size: F(15), weight: 800, color: '#1b2333' });
      }
    }
    ctl(); reset(); loop.start();
  });

  /* ================= 马德堡半球实验 ================= */
  PS.register('magdeburg', function (el) {
    const VW = 1000, VH = 400, P0 = 1.0e5, A = Math.PI * 0.15 * 0.15, FH = 900; // 直径 30 cm；每匹马的拉力约 900 N
    const st = { pin: P0, n: 4, pull: 0, sep: 0, ok: false, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sN = PS.ui.slider({ label: '每边的马', min: 1, max: 8, step: 1, value: st.n, unit: '匹', onInput: (v) => { st.n = v; st.pull = 0; st.sep = 0; tell(); } });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(PS.ui.button('🔧 抽气', () => { if (st.sep) return; st.pin = Math.max(0.05 * P0, st.pin * 0.5); PS.sound.tick(); tell(); }, 'btn btn-primary btn-sm'), PS.ui.button('打开阀门放气', () => { st.pin = P0; st.sep = 0; st.pull = 0; tell(); }, 'btn btn-sm'), sN.el, PS.ui.button('🐎 拉！', () => { st.pull = 0.001; st.sep = 0; }, 'btn btn-accent btn-sm')), msg);
    const need = () => (P0 - st.pin) * A;
    function tell(after) {
      const Fn = need(), Fp = st.n * FH;
      let s = '球内气压 ' + PR.fmtPa(st.pin) + '。大气压把两个半球压在一起的力 F = (p₀ − p内)S = <b>' + PR.fmtPa(Fn, 'N') + '</b>（半球直径 30 cm）。每边 ' + st.n + ' 匹马，拉力约 ' + Fp + ' N。';
      let c = 'info';
      if (after) { if (st.ok) { s += '<br>“砰”的一声，两个半球被拉开了！'; c = 'ok'; } else { s += '<br>拉不开！大气压的作用力比马的拉力还大。'; c = 'bad'; } }
      else if (st.pin >= P0) s += '<br>球内没有抽气，内外气压相等，轻轻一拉就开。';
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.pull > 0 && st.pull < 2) {
        st.pull += dt;
        if (st.pull >= 0.8 && !st.sep) { st.ok = st.n * FH > need(); if (st.ok) { st.sep = 0.001; PS.sound.clack(); } tell(true); st.pull = st.ok ? 2.5 : 2; }
      }
      if (st.sep > 0) st.sep = Math.min(1, st.sep + dt * 1.5);
      S.render();
    }, el);
    function horse(ctx, x, y, dir, lean) {
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(lean * 0.12);
      ctx.strokeStyle = '#7a4f1d'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      [-14, -8, 10, 16].forEach((lx, i) => { ctx.beginPath(); ctx.moveTo(lx, -22); ctx.lineTo(lx + (i % 2 ? 4 : -4) * lean, 0); ctx.stroke(); });
      ctx.fillStyle = '#8d5524'; ctx.beginPath(); ctx.ellipse(0, -28, 24, 11, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 8; ctx.strokeStyle = '#8d5524'; ctx.beginPath(); ctx.moveTo(18, -32); ctx.lineTo(28, -48); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(33, -50, 9, 5, 0.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#b2f2bb'; ctx.fillRect(0, 300, VW, 100);
      const cx = 500, cy = 220, r = 70, gap = st.sep * 160;
      const lean = st.pull > 0 && st.pull < 2 ? Math.sin(st.t * 18) * 0.5 + 0.5 : 0;
      // 绳和马
      const pull = st.pull > 0 && (st.pull < 2 || st.ok) ? 1 : 0;
      [-1, 1].forEach((s) => {
        const ex = cx + s * (r + 30 + gap);
        for (let i = 0; i < st.n; i++) {
          const hx = ex + s * (40 + i * 44) + s * pull * (st.ok ? st.sep * 40 : 4 * lean);
          horse(ctx, hx, 300, s, pull);
          ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(hx - s * 18, 272); ctx.lineTo(ex, cy); ctx.stroke();
        }
      });
      // 两个半球
      [-1, 1].forEach((s) => {
        const x = cx + s * gap;
        ctx.fillStyle = '#e8a33b'; ctx.strokeStyle = '#9c6b1d'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, cy, r, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#9c6b1d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + s * (r + 14), cy, 12, 0, TAU); ctx.stroke();
      });
      // 球内空气与大气压箭头
      if (!st.sep) {
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, TAU); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        PR.air(ctx, cx - r, cy - r, 2 * r, 2 * r, { n: 40 * st.pin / P0, t: st.t, color: 'rgba(76,110,245,.8)' });
        ctx.restore();
        const L = 14 + 30 * (1 - st.pin / P0);
        for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + 0.31; airArrows(ctx, [[cx + Math.cos(a) * r, cy + Math.sin(a) * r, -Math.cos(a), -Math.sin(a)]], L); }
      }
      PR.gauge(ctx, 110, 90, 62, { F, v: st.pin / 1000, min: 0, max: 100, ticks: 5, unit: 'kPa', label: '球内气压' });
      D.text(ctx, '需要的拉力 F = ' + PR.fmtPa(need(), 'N'), VW - 24, 34, { size: F(15), weight: 800, color: '#e03131', align: 'right' });
      D.text(ctx, '马的拉力 ' + st.n + ' × 900 N = ' + st.n * FH + ' N', VW - 24, 34 + F(15) * 1.5, { size: F(14), weight: 700, color: '#8d5524', align: 'right' });
    }
    tell(); loop.start();
  });

  /* ================= 用注射器估测大气压的值 ================= */
  PS.register('syringe-atm', function (el, opts) {
    const VW = 1000, VH = 360, P0 = 1.0e5, V = 2, LC = 4.0, SA = (V / LC) * 1e-4; // 2 mL，全部刻度长 4.00 cm，S = 0.5 cm²
    const PX = 60; // 每厘米多少 px
    const st = { air: true, cap: true, fric: false, mode: 'idle', x: 0, slide: 0, F: 0, Fr: null, rows: [] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const tA = PS.ui.toggle('先把活塞推到底，排尽筒内空气', true, (v) => { st.air = v; reset(); });
    const tC = PS.ui.toggle('用橡皮帽堵住注射器的小孔', true, (v) => { st.cap = v; reset(); });
    const tF = PS.ui.toggle('活塞与筒壁之间有摩擦', false, (v) => { st.fric = v; reset(); });
    const goB = PS.ui.button('▶ 水平向左慢慢拉动注射器筒', () => { reset(); st.mode = 'pull'; }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: 'p / Pa' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    el.append(h('div', { class: 'fc-chips' }, tA.el, tC.el, tF.el), PS.ui.row(goB, PS.ui.button('↺ 复位', reset, 'btn btn-ghost btn-sm'), PS.ui.button('📝 记录示数', record, 'btn btn-green btn-sm')), msg,
      h('div', { class: 'grid-2', style: { marginTop: '10px', alignItems: 'start' } },
        h('div', null, h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '条件'), h('th', null, 'F/N'), h('th', null, 'V/mL'), h('th', null, 'L/cm'), h('th', null, 'p/Pa'))), tbody)),
          h('div', { class: 'fc-ans' }, h('span', { class: 'small' }, '用最后一次的数据算一算：p ='), inp, PS.ui.button('核对', check, 'btn btn-primary btn-sm'))),
        h('div', { class: 'panel' }, h('h4', null, opts.lab ? '分析论证' : '想一想'), ana)));
    const fr = () => (st.fric ? 0.6 : 0);
    const Fslide = () => (st.cap ? (P0 - (st.air ? 0 : 0.2 * P0)) * SA : 0) + fr();
    function reset() { st.mode = 'idle'; st.x = 0; st.slide = 0; st.F = 0; st.Fr = null; goB.disabled = false; msg.className = 'fc-msg'; msg.innerHTML = '原理：活塞刚开始滑动时，弹簧测力计的拉力 F 与大气对活塞的压力平衡，p = <span class="frac"><span>F</span><span>S</span></span>，S = <span class="frac"><span>V</span><span>L</span></span>，所以 p = <span class="frac"><span>FL</span><span>V</span></span>。'; S.render(); }
    function record() {
      if (st.Fr == null) { msg.className = 'fc-msg bad'; msg.innerHTML = '先拉动注射器筒，读出活塞<b>刚开始滑动</b>时测力计的示数。'; PS.sound.bad(); return; }
      const cond = (st.cap ? '' : '不堵小孔·') + (st.air ? '' : '有空气·') + (st.fric ? '有摩擦' : '') || '规范操作';
      st.rows.push({ cond: cond.replace(/·$/, '') || '规范操作', F: st.Fr, p: (st.Fr * LC * 1e-2) / (V * 1e-6), cap: st.cap, air: st.air, fric: st.fric });
      if (st.rows.length > 8) st.rows.shift();
      PS.sound.good(); table();
    }
    function check() {
      const r = st.rows[st.rows.length - 1]; if (!r) return;
      const v = parseFloat(inp.value.replace(/\s/g, '').replace(/[×xX*]10\^?([−-]?\d+)/, 'e$1').replace('−', '-'));
      const good = Math.abs(v - r.p) <= r.p * 0.02;
      msg.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      msg.innerHTML = (good ? '✔ 正确！' : '✘ 再算一算。') + ' p = <span class="frac"><span>FL</span><span>V</span></span> = <span class="frac"><span>' + PS.fmt(r.F, 1) + ' N × 4.00×10⁻² m</span><span>2×10⁻⁶ m³</span></span> = ' + PS.pretty(r.p) + ' Pa';
      good ? PS.sound.good() : PS.sound.bad();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.cond), h('td', null, PS.fmt(r.F, 1)), h('td', null, '2'), h('td', null, '4.00'), h('td', { html: '<b>' + PS.pretty(r.p) + '</b>' }))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '还没有数据')));
      const R = st.rows;
      let s = '<div>注射器容积 V = 2 mL，全部刻度的长度 L = 4.00 cm，活塞面积 S = V/L = 0.5 cm²。</div>';
      if (R.some((r) => r.cap && r.air && !r.fric)) s += '<div>✔ 规范操作测得 p ≈ 1.0×10⁵ Pa，与标准大气压接近。</div>';
      if (R.some((r) => r.cap && !r.air)) s += '<div class="tip tip-warn" style="margin:6px 0 0">筒内空气<b>没有排尽</b>：筒内仍有气压，测得的 F 偏小，大气压的测量值<b>偏小</b>。</div>';
      if (R.some((r) => r.cap && r.fric)) s += '<div class="tip tip-warn" style="margin:6px 0 0">活塞与筒壁有<b>摩擦</b>：F 包含了摩擦力，测量值<b>偏大</b>。改进：<b>先不堵小孔</b>拉动活塞，测出摩擦力 f，计算时用 F − f。</div>';
      if (R.some((r) => !r.cap)) s += '<div>不堵小孔时活塞两边都有大气压，测力计的示数只是<b>摩擦力</b>（可以用来修正）。</div>';
      ana.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      if (st.mode === 'pull') {
        const k = 1.6; // 拉动时测力计示数增大的速度（N/s）
        if (!st.slide) {
          st.F = Math.min(st.F + k * dt, Fslide());
          if (st.F >= Fslide() - 1e-6) { st.slide = 0.001; st.Fr = PS.round(Fslide(), 1); PS.sound.tick(); msg.className = 'fc-msg ok'; msg.innerHTML = '活塞<b>刚开始滑动</b>！此时测力计的示数 F = <b>' + PS.fmt(st.Fr, 1) + ' N</b>，点“记录示数”。'; }
        } else {
          st.slide = Math.min(LC, st.slide + dt * 0.9);
          st.F = (st.cap ? (st.air ? P0 : P0 - (0.2 * P0 * 0.3) / (0.3 + st.slide)) * SA : 0) + fr();
          if (st.slide >= LC) { st.mode = 'idle'; }
        }
      }
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const y = 170, ringX = 930, KP = 26; // 测力计（0~10 N）每牛 26 px
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(950, 60, 40, 220); ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ringX + 11, y); ctx.lineTo(950, y); ctx.stroke();
      const sc = DY.hscale(ctx, { x: ringX, y, max: 10, div: 0.2, L: KP * 10, F: st.F, F2: F });
      // 活塞杆连在挂钩上；活塞位置 = 挂钩 − 绳 − 杆长
      const rodL = 3 * PX, pistonX = sc.hook.x - 20 - rodL;
      // 注射器筒：活塞在筒底时筒底（左端，有小孔）在活塞左边；拉动时筒向左移动
      const barrelL = (LC + 0.6) * PX, bot = pistonX - st.slide * PX - 8; // 筒底内壁
      const bx0 = bot - 6, bx1 = bot + barrelL;
      ctx.fillStyle = 'rgba(231,245,255,.8)'; ctx.fillRect(bx0, y - 26, bx1 - bx0, 52); ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 2.5; ctx.strokeRect(bx0, y - 26, bx1 - bx0, 52);
      // 刻度：0 在筒底，2 mL 在 4 cm 处
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 1;
      for (let i = 0; i <= 20; i++) { const xx = bot + (i / 20) * LC * PX; ctx.beginPath(); ctx.moveTo(xx, y - 26); ctx.lineTo(xx, y - 26 + (i % 5 ? 7 : 12)); ctx.stroke(); }
      [0, 1, 2].forEach((m) => D.text(ctx, m + '', bot + (m / 2) * LC * PX, y - 34, { size: F(11), color: '#1b2333', align: 'center' }));
      D.text(ctx, 'mL', bot + LC * PX + 18, y - 34, { size: F(11), color: '#1b2333' });
      // 筒内空气（未排尽）
      if (!st.air && st.cap) PR.air(ctx, bot, y - 22, Math.max(18, st.slide * PX + 12), 44, { n: 6, t: st.slide * 3, color: 'rgba(76,110,245,.8)' });
      // 嘴和橡皮帽
      ctx.fillStyle = '#ced4da'; ctx.fillRect(bx0 - 22, y - 5, 22, 10);
      if (st.cap) { ctx.fillStyle = '#e03131'; D.roundRect(ctx, bx0 - 38, y - 10, 20, 20, 5); ctx.fill(); }
      // 活塞与活塞杆
      ctx.fillStyle = '#495057'; ctx.fillRect(pistonX - 10, y - 24, 12, 48);
      ctx.fillStyle = '#adb5bd'; ctx.fillRect(pistonX, y - 4, rodL, 8); ctx.fillRect(pistonX + rodL - 6, y - 16, 6, 32);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pistonX + rodL, y); ctx.lineTo(sc.hook.x + 6, sc.hook.y - 6); ctx.stroke();
      // 手（拉筒）
      if (st.mode === 'pull' || st.slide) { ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.ellipse(bx0 + 30, y + 40, 26, 18, 0, 0, TAU); ctx.fill(); FO.arrow(ctx, bx0 - 50, y + 70, Math.PI, 50, { color: FC.T, label: '拉', F, labelSide: 1 }); }
      // 刻度尺（量全部刻度的长度）
      const ry = y + 92;
      PS.draw.ruler(ctx, { x: bot, y: ry, len: 5, ppc: PX, side: 'top', h: 30 });
      DY.hzoom(ctx, st.F, { x: 640, y: 236, w: 230, h: 90, max: 10, div: 0.2, F2: F });
      D.text(ctx, '测力计示数 F = ' + PS.fmt(st.F, 1) + ' N', 755, 218, { size: F(15), weight: 800, color: FC.F, align: 'center' });
      D.text(ctx, '注射器：2 mL；全部刻度长 L = 4.00 cm', 30, 30, { size: F(13), color: '#495057' });
    }
    reset(); table(); loop.start();
  });

  /* ================= 大气压与高度；自制气压计 ================= */
  const PLACES = [['上海', 4], ['北京', 44], ['昆明', 1891], ['拉萨', 3650], ['珠穆朗玛峰', 8849]];
  PS.register('altitude-pressure', function (el) {
    const VW = 1000, VH = 420;
    const st = { k: 'mount', hm: 0, floor: 1 };
    const seg = PS.ui.seg([{ value: 'mount', label: '⛰️ 登山' }, { value: 'lift', label: '🏢 带着自制气压计坐电梯' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sH = PS.ui.slider({ label: '海拔', min: 0, max: 8849, step: 1, value: 0, unit: 'm', onInput: (v) => { st.hm = v; tell(); } });
    sH.el.classList.add('wide');
    const sF = PS.ui.slider({ label: '楼层（每层 3 m）', min: 1, max: 31, step: 1, value: 1, unit: '层', onInput: (v) => { st.floor = v; tell(); } });
    const c1 = h('div', null, PS.ui.row(sH.el), h('div', { class: 'fc-chips' }, PLACES.map(([n, m]) => PS.ui.button(n + ' ' + m + ' m', () => { sH.set(m); }, 'btn btn-sm')))), c2 = PS.ui.row(sF.el);
    const msg = h('div', { class: 'fc-msg' });
    el.append(c1, c2, msg);
    function ctl() { c1.style.display = st.k === 'mount' ? '' : 'none'; c2.style.display = st.k === 'lift' ? '' : 'none'; }
    function tell() {
      if (st.k === 'mount') {
        const p = PR.atm(st.hm);
        msg.className = 'fc-msg info';
        msg.innerHTML = '海拔 ' + st.hm + ' m：大气压约 <b>' + PR.fmtPa(p) + '</b>（' + PS.fmt(p / 101325 * 760, 0) + ' mm 水银柱），水的沸点约 <b>' + PS.fmt(PR.bp(p), 0) + ' ℃</b>。<br>大气压随高度的增加而<b>减小</b>，而且减小得越来越慢；海拔 3000 m 以内，大约每升高 10 m，大气压减小 100 Pa。气压越低，水的沸点越<b>低</b>——在高山上用普通的锅很难把饭煮熟。';
      } else {
        const dp = 101325 - PR.atm((st.floor - 1) * 3);
        msg.className = 'fc-msg info';
        msg.innerHTML = '瓶内气压不变，外界大气压随高度减小，细管中的水柱就会<b>上升</b>。从 1 层到 ' + st.floor + ' 层（升高 ' + (st.floor - 1) * 3 + ' m），大气压减小约 ' + PS.fmt(dp, 0) + ' Pa，水柱升高约 ' + PS.fmt(dp / 1e4 * 100, 1) + ' cm。';
      }
      S.render();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.k === 'mount') {
        // 山
        const sky = ctx.createLinearGradient(0, 0, 0, 400); sky.addColorStop(0, '#a5d8ff'); sky.addColorStop(1, '#e7f5ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 450, VH);
        const Y = (m) => 390 - m * 0.038;
        ctx.fillStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(0, 400); ctx.lineTo(60, Y(200)); ctx.lineTo(200, Y(4000)); ctx.lineTo(300, Y(8849)); ctx.lineTo(420, Y(2500)); ctx.lineTo(450, 400); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(300, Y(8849)); ctx.lineTo(262, Y(6500)); ctx.lineTo(285, Y(6800)); ctx.lineTo(310, Y(6400)); ctx.lineTo(345, Y(6500)); ctx.closePath(); ctx.fill();
        const t = st.hm / 8849, x = 60 + (300 - 60) * Math.pow(t, 0.9), y = Y(st.hm);
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x, y - 14, 9, 0, TAU); ctx.fill(); ctx.fillRect(x - 6, y - 6, 12, 8);
        PR.air(ctx, 0, 0, 450, 390, { n: 60, t: 0, color: 'rgba(76,110,245,.25)' });
        [0, 2000, 4000, 6000, 8000].forEach((m) => D.text(ctx, m + ' m', 446, Y(m), { size: F(10), color: '#495057', align: 'right' }));
        const C = DY.chart(ctx, { F, x: 540, y: 60, w: 400, h: 280, xmax: 9, ymax: 110, xstep: 1, ystep: 20, xl: '海拔/km', yl: 'p/kPa', padL: 48,
          series: [{ pts: Array.from({ length: 46 }, (_, i) => [i * 0.2, PR.atm(i * 200) / 1000]), color: '#1c7ed6', width: 2.6 }] });
        const px = C.X(st.hm / 1000), py = C.Y(PR.atm(st.hm) / 1000);
        ctx.strokeStyle = '#e03131'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, C.Y(0)); ctx.moveTo(px, py); ctx.lineTo(C.X(0), py); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill();
        D.text(ctx, PR.fmtPa(PR.atm(st.hm)) + '，沸点 ' + PS.fmt(PR.bp(PR.atm(st.hm)), 0) + ' ℃', px + 10, py - 12, { size: F(13), weight: 800, color: '#e03131', bg: 'rgba(255,255,255,.85)' });
      } else {
        // 楼房 + 自制气压计
        const fl = st.floor;
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(60, 30, 200, 380); ctx.strokeStyle = '#adb5bd'; ctx.strokeRect(60, 30, 200, 380);
        for (let i = 0; i < 31; i++) { ctx.strokeStyle = '#ced4da'; ctx.beginPath(); ctx.moveTo(60, 410 - i * 12.2); ctx.lineTo(260, 410 - i * 12.2); ctx.stroke(); }
        ctx.fillStyle = '#ffd43b'; ctx.fillRect(140, 410 - fl * 12.2, 40, 12.2);
        D.text(ctx, fl + ' 层', 270, 404 - fl * 12.2, { size: F(13), weight: 800, color: '#e8590c' });
        const bx = 560, by = 380, dp = 101325 - PR.atm((fl - 1) * 3), col = 60 + (dp / 1e4) * 100 * 10; // 细管中水柱高出瓶内液面：原来 6 cm
        ctx.fillStyle = 'rgba(232,89,12,.45)'; ctx.fillRect(bx - 80, 300, 160, by - 300);
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(bx - 80, 240); c.lineTo(bx - 80, by); c.lineTo(bx + 80, by); c.lineTo(bx + 80, 240); c.closePath(); }, { width: 4 });
        ctx.fillStyle = '#868e96'; ctx.fillRect(bx - 84, 228, 168, 14);
        ctx.fillStyle = 'rgba(232,89,12,.75)'; ctx.fillRect(bx - 4, 300 - col, 8, col + 60);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 5, 40, 10, 320);
        // 刻度
        for (let i = 0; i <= 25; i++) { const yy = 300 - i * 10; ctx.beginPath(); ctx.moveTo(bx + 8, yy); ctx.lineTo(bx + (i % 5 ? 14 : 20), yy); ctx.stroke(); if (i % 5 === 0) D.text(ctx, i + '', bx + 24, yy, { size: F(10), color: '#495057' }); }
        D.text(ctx, 'cm', bx + 24, 38, { size: F(10), color: '#495057' });
        D.text(ctx, '水柱高出瓶内水面 ' + PS.fmt(col / 10, 1) + ' cm', bx + 60, 300 - col, { size: F(13), weight: 800, color: '#e8590c', bg: 'rgba(255,255,255,.85)' });
        D.text(ctx, '瓶内气压 > 外界大气压', bx, by + 26, { size: F(12), color: '#495057', align: 'center' });
        D.text(ctx, '自制气压计', bx, 24, { size: F(14), weight: 800, color: '#1b2333', align: 'center' });
      }
    }
    ctl(); tell();
  });

  /* ================= 高压锅 ================= */
  PS.register('pressure-cooker', function (el) {
    const VW = 1000, VH = 420, SV = 10e-6; // 出气孔横截面积 10 mm²
    const st = { pot: 'cooker', m: 80, p0: 1.0e5, T: 20, heat: false, t: 0, puff: 0 };
    const potSeg = PS.ui.seg([{ value: 'open', label: '普通锅' }, { value: 'cooker', label: '高压锅' }], st.pot, (v) => { st.pot = v; st.T = 20; tell(); });
    const mSeg = PS.ui.seg([60, 80, 100].map((m) => ({ value: m, label: '限压阀 ' + m + ' g' })), st.m, (v) => { st.m = v; tell(); });
    const pSeg = PS.ui.seg([{ value: 1.0e5, label: '平原（p₀ = 1.0×10⁵ Pa）' }, { value: 0.6e5, label: '青藏高原（p₀ ≈ 0.6×10⁵ Pa）' }], st.p0, (v) => { st.p0 = v; st.T = 20; tell(); });
    pSeg.el.style.flexWrap = 'wrap';
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const heatB = PS.ui.button('🔥 加热', () => { st.heat = !st.heat; heatB.innerHTML = st.heat ? '⏸ 停止加热' : '🔥 加热'; }, 'btn btn-accent btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(potSeg.el, mSeg.el), PS.ui.row(pSeg.el), PS.ui.row(heatB, PS.ui.button('↺ 冷水重来', () => { st.T = 20; tell(); }, 'btn btn-ghost btn-sm')), msg);
    const pmax = () => (st.pot === 'open' ? st.p0 : st.p0 + (st.m / 1000) * 10 / SV);
    const pin = () => Math.max(st.p0, Math.min(pmax(), PR.bp(st.p0) < st.T ? satP(st.T) : st.p0));
    function satP(T) { const A = T > 99 ? [8.14019, 1810.94, 244.485] : [8.07131, 1730.63, 233.426]; return Math.pow(10, A[0] - A[1] / (A[2] + T)) * 133.322; }
    const bpNow = () => PR.bp(pmax());
    function tell() {
      mSeg.el.style.display = st.pot === 'open' ? 'none' : '';
      const pm = pmax();
      let s = st.pot === 'open' ? '普通锅：锅内气压等于外界大气压 ' + PR.fmtPa(st.p0) + '，水的沸点约 <b>' + PS.fmt(bpNow(), 0) + ' ℃</b>。' : '高压锅内的最大气压：p = p₀ + <span class="frac"><span>mg</span><span>S</span></span> = ' + PR.fmtPa(st.p0) + ' + <span class="frac"><span>' + st.m / 1000 + ' kg × 10 N/kg</span><span>1×10⁻⁵ m²</span></span> = <b>' + PR.fmtPa(pm) + '</b>，锅内水的沸点约 <b>' + PS.fmt(bpNow(), 0) + ' ℃</b>。';
      s += '<br><span class="muted">液体的沸点随液面上方气压的增大而升高。高压锅密封好，锅内气压高，沸点高，饭菜熟得快；在高原上用高压锅才能把饭煮熟。</span>';
      msg.className = 'fc-msg info'; msg.innerHTML = s;
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const bp = bpNow();
      if (st.heat) st.T = Math.min(bp, st.T + dt * 9);
      else if (st.T > 20) st.T = Math.max(20, st.T - dt * 2);
      st.puff = st.heat && st.T >= bp - 0.05 ? 1 : Math.max(0, st.puff - dt);
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const x0 = 260, x1 = 560, y0 = 150, y1 = 340, boil = st.puff > 0;
      // 火
      if (st.heat) for (let i = 0; i < 6; i++) { const fx = x0 + 30 + i * 48, fh = 26 + 8 * Math.sin(st.t * 9 + i); ctx.fillStyle = '#ff922b'; ctx.beginPath(); ctx.moveTo(fx - 13, y1 + 52); ctx.quadraticCurveTo(fx, y1 + 52 - fh * 2, fx + 13, y1 + 52); ctx.fill(); }
      ctx.fillStyle = '#495057'; ctx.fillRect(x0 - 40, y1 + 52, x1 - x0 + 80, 10);
      // 锅
      ctx.fillStyle = PS.LIQ.water.c; ctx.fillRect(x0, 240, x1 - x0, y1 - 240);
      if (boil || st.T > 80) { ctx.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < (boil ? 14 : 4); i++) { ctx.beginPath(); ctx.arc(x0 + 20 + ((i * 47) % (x1 - x0 - 40)), y1 - ((st.t * 70 + i * 29) % 90), 4 + (i % 3), 0, TAU); ctx.fill(); } }
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.lineTo(x1, y0); ctx.stroke();
      ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x0 - 70, y0 + 40); ctx.lineTo(x0, y0 + 40); ctx.moveTo(x1, y0 + 40); ctx.lineTo(x1 + 70, y0 + 40); ctx.stroke();
      if (st.pot === 'cooker') {
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.moveTo(x0 - 10, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 50, x1 + 10, y0); ctx.closePath(); ctx.fill();
        const vx = (x0 + x1) / 2, lift = boil ? 4 + 3 * Math.sin(st.t * 30) : 0;
        ctx.fillStyle = '#868e96'; ctx.fillRect(vx - 5, y0 - 62, 10, 26);
        ctx.fillStyle = '#e03131'; D.roundRect(ctx, vx - 16, y0 - 82 - lift, 32, 26, 6); ctx.fill();
        D.text(ctx, '限压阀 ' + st.m + ' g', vx + 26, y0 - 72, { size: F(12), weight: 700, color: '#c92a2a' });
        if (boil) { ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) { const ph = (st.t * 1.5 + i / 6) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(vx + Math.sin(i * 2 + st.t * 4) * 20 * ph, y0 - 66 - ph * 90, 8 + ph * 18, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
      } else if (boil) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 8; i++) { const ph = (st.t * 0.8 + i / 8) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.arc(x0 + 30 + i * 36, y0 - ph * 100, 10 + ph * 20, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
      // 温度计与气压表
      PR.gauge(ctx, 720, 130, 70, { F, v: pin() / 1e5, min: 0, max: 2.5, ticks: 5, unit: '×10⁵ Pa', label: '锅内气压', fmt: (v) => PS.round(v, 1) });
      const tx = 870, ty0 = 60, ty1 = 330, T = st.T, Y = (t) => ty1 - (t / 130) * (ty1 - ty0);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2; D.roundRect(ctx, tx - 10, ty0 - 10, 20, ty1 - ty0 + 30, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e03131'; ctx.fillRect(tx - 4, Y(T), 8, ty1 - Y(T) + 10); ctx.beginPath(); ctx.arc(tx, ty1 + 14, 11, 0, TAU); ctx.fill();
      for (let t = 0; t <= 130; t += 10) { ctx.strokeStyle = '#495057'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx + 10, Y(t)); ctx.lineTo(tx + (t % 50 ? 15 : 20), Y(t)); ctx.stroke(); if (t % 20 === 0) D.text(ctx, t + '', tx + 24, Y(t), { size: F(10), color: '#495057' }); }
      D.text(ctx, PS.fmt(T, 0) + ' ℃', tx, ty0 - 24, { size: F(16), weight: 800, color: '#e03131', align: 'center' });
      D.text(ctx, boil ? '沸腾了！温度保持在沸点 ' + PS.fmt(bpNow(), 0) + ' ℃' : '加热中……', 30, 34, { size: F(15), weight: 800, color: boil ? '#e8590c' : '#495057' });
    }
    tell(); loop.start();
  });

  /* ================= 活塞式抽水机 ================= */
  PS.register('piston-pump', function (el) {
    const VW = 1000, VH = 440;
    // 状态：水在管中上升的高度（0~1，1 为到达圆筒底部）、活塞下方的水 wb、活塞上方的水 wa（0~1，占冲程的比例）
    const st = { pos: 0, dir: 0, pipe: 0, wb: 0, wa: 0, out: 0, n: 0, auto: false, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const upB = PS.ui.button('⬆ 提起活塞', () => stroke(1), 'btn btn-primary btn-sm');
    const dnB = PS.ui.button('⬇ 压下活塞', () => stroke(-1), 'btn btn-primary btn-sm');
    const autoB = PS.ui.button('▶ 连续抽水', () => { st.auto = !st.auto; autoB.innerHTML = st.auto ? '⏸ 停止' : '▶ 连续抽水'; }, 'btn btn-accent btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(upB, dnB, autoB, PS.ui.button('↺ 重来', () => { Object.assign(st, { pos: 0, dir: 0, pipe: 0, wb: 0, wa: 0, out: 0, n: 0 }); tell(); }, 'btn btn-ghost btn-sm')), msg);
    let from = null;
    function stroke(d) {
      if (st.dir) return;
      if ((d > 0 && st.pos >= 1) || (d < 0 && st.pos <= 0)) { msg.className = 'fc-msg bad'; msg.innerHTML = d > 0 ? '活塞已经在最高处，先压下活塞。' : '活塞已经在最低处，先提起活塞。'; return; }
      st.dir = d; from = { pipe: st.pipe, wb: st.wb, wa: st.wa }; PS.sound.tick(); tell();
    }
    function tell() {
      let s;
      if (st.dir > 0) s = '<b>提起活塞</b>：阀门 A 受到上面的水（或大气）的压力而<b>关闭</b>，活塞下面的空气变稀薄、气压减小，<b>大气压</b>把井里的水压上来，推开阀门 B 进入圆筒。' + (from && from.wa > 0.3 ? '活塞上面的水被提起，从出水管流出。' : '');
      else if (st.dir < 0) s = '<b>压下活塞</b>：阀门 B 被水压下而<b>关闭</b>，活塞下面的水推开阀门 A，进入活塞<b>上面</b>。';
      else if (st.out > 0) s = '水被抽上来了！活塞式抽水机是利用<b>大气压</b>工作的。标准大气压能支持约 <b>10 m</b> 高的水柱，所以它的抽水高度不超过约 10 m。';
      else s = '活塞式抽水机：活塞上有阀门 A，圆筒底部有阀门 B，两个阀门都只能<b>向上</b>打开。反复提起、压下活塞，看水是怎样被抽上来的。';
      msg.className = 'fc-msg ' + (st.out > 0 && !st.dir ? 'ok' : 'info'); msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.auto && !st.dir) stroke(st.pos > 0.5 ? -1 : 1);
      if (st.dir) {
        st.pos = PS.clamp(st.pos + st.dir * dt * 0.8, 0, 1);
        const k = st.dir > 0 ? st.pos : 1 - st.pos; // 本冲程完成的比例
        if (st.dir > 0) {
          if (from.pipe < 1) st.pipe = Math.min(1, from.pipe + k * 0.55); // 先把管中的空气抽走，水逐渐上升
          else st.wb = k; // 水进入活塞下方
          if (from.pipe < 1 && st.pipe >= 1) st.wb = Math.max(st.wb, k - (1 - from.pipe) / 0.55);
          if (from.wa > 0) { st.wa = from.wa; st.out = Math.max(st.out, 0.6); }
        } else { st.wa = Math.max(from.wa > 0 && from.wb > 0 ? 0 : from.wa, from.wb * k); st.wb = from.wb * (1 - k); }
        if ((st.dir > 0 && st.pos >= 1) || (st.dir < 0 && st.pos <= 0)) { if (st.dir < 0) { st.wa = from.wb > 0 ? from.wb : from.wa; st.wb = 0; } st.dir = 0; st.n++; tell(); }
      }
      if (st.out > 0 && !(st.dir > 0 && st.wa > 0)) st.out = Math.max(0, st.out - dt * 0.6);
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const cx = 500, cw = 110, ct = 60, cb = 230, pTop = 90, pBot = 210; // 圆筒、活塞的上下极限
      const py = pBot - st.pos * (pBot - pTop);
      const wellY = 380;
      // 井
      ctx.fillStyle = PS.LIQ.water.c; ctx.fillRect(380, wellY, 240, 60); ctx.strokeStyle = PS.LIQ.water.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(380, wellY); ctx.lineTo(620, wellY); ctx.stroke();
      ctx.fillStyle = '#ced4da'; ctx.fillRect(360, wellY - 6, 20, 66); ctx.fillRect(620, wellY - 6, 20, 66);
      D.arrow(ctx, 420, wellY - 46, 420, wellY - 2, { color: P0C, width: 2.2, head: 8 }); D.arrow(ctx, 580, wellY - 46, 580, wellY - 2, { color: P0C, width: 2.2, head: 8 });
      D.text(ctx, '大气压', 600, wellY - 40, { size: F(13), weight: 800, color: P0C });
      // 进水管中的水
      const pipeTop = wellY - st.pipe * (wellY - cb);
      ctx.fillStyle = PS.LIQ.water.c2; ctx.globalAlpha = 0.55; ctx.fillRect(cx - 12, pipeTop, 24, wellY + 30 - pipeTop); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 14, cb); ctx.lineTo(cx - 14, wellY + 30); ctx.moveTo(cx + 14, cb); ctx.lineTo(cx + 14, wellY + 30); ctx.stroke();
      // 圆筒内的水
      const stroke = pBot - pTop;
      ctx.fillStyle = PS.LIQ.water.c;
      if (st.wb > 0) { const top = cb - st.wb * (cb - py - 8); ctx.fillRect(cx - cw / 2, Math.max(py + 8, top), cw, cb - Math.max(py + 8, top)); }
      if (st.wa > 0) { const hgt = st.wa * stroke * 0.9; ctx.fillRect(cx - cw / 2, Math.max(ct + 10, py - 8 - hgt), cw, Math.min(hgt, py - 8 - ct - 10)); }
      // 出水管
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.strokeRect(cx + cw / 2, ct + 6, 120, 20);
      if (st.out > 0) { ctx.fillStyle = PS.LIQ.water.c2; ctx.fillRect(cx + cw / 2, ct + 8, 120, 16); ctx.strokeStyle = 'rgba(28,126,214,.75)'; ctx.lineWidth = 12 * st.out + 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + cw / 2 + 120, ct + 16); ctx.quadraticCurveTo(cx + cw / 2 + 160, ct + 20, cx + cw / 2 + 170, 300); ctx.stroke(); ctx.fillStyle = '#e7f5ff'; ctx.fillRect(700, 300, 140, 40); ctx.strokeStyle = '#74c0fc'; ctx.lineWidth = 2; ctx.strokeRect(700, 300, 140, 40); }
      // 圆筒
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx - cw / 2, ct); ctx.lineTo(cx - cw / 2, cb); ctx.lineTo(cx - 14, cb); ctx.moveTo(cx + 14, cb); ctx.lineTo(cx + cw / 2, cb); ctx.lineTo(cx + cw / 2, ct); ctx.stroke();
      // 阀门 B（筒底，向上打开）
      const openB = st.dir > 0, openA = st.dir < 0 && from && from.wb > 0;
      ctx.save(); ctx.translate(cx - 14, cb); ctx.rotate(openB ? -0.9 : 0); ctx.fillStyle = '#e8590c'; ctx.fillRect(0, -3, 28, 6); ctx.restore();
      D.text(ctx, 'B', cx + 22, cb + 14, { size: F(14), weight: 800, color: '#e8590c' });
      // 活塞（中间有阀门 A）
      ctx.fillStyle = '#868e96'; ctx.fillRect(cx - cw / 2 + 3, py - 8, cw / 2 - 18, 16); ctx.fillRect(cx + 15, py - 8, cw / 2 - 18, 16);
      ctx.save(); ctx.translate(cx - 15, py - 8); ctx.rotate(openA ? -0.9 : 0); ctx.fillStyle = '#e8590c'; ctx.fillRect(0, -3, 30, 6); ctx.restore();
      D.text(ctx, 'A', cx - cw / 2 - 18, py, { size: F(14), weight: 800, color: '#e8590c', align: 'right' });
      // 活塞杆与手柄
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, py - 8); ctx.lineTo(cx, 20); ctx.stroke();
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx - 200, 20 + (py - 150) * 0.8); ctx.stroke();
      ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(cx - 120, 20 + (py - 150) * 0.48, 7, 0, TAU); ctx.fill();
      D.text(ctx, '第 ' + st.n + ' 次', 30, 34, { size: F(14), weight: 700, color: '#495057' });
      D.text(ctx, '阀门 A：' + (openA ? '打开' : '关闭') + '　　阀门 B：' + (openB ? '打开' : '关闭'), 30, 34 + F(14) * 1.5, { size: F(14), weight: 700, color: '#e8590c' });
    }
    tell(); loop.start();
  });

  /* ================= 是不是利用大气压 ================= */
  PS.register('atm-sort', function (el) {
    PS.sortCards(el, [
      ['🥤 用吸管把饮料吸进嘴里', 0, '吸管内气压减小，大气压把饮料压上来'],
      ['🖋️ 钢笔吸墨水', 0, '按压弹簧片排出空气，松开后大气压把墨水压进橡皮管'],
      ['💉 用注射器吸取药液', 0, '拉动活塞，针筒内气压减小，大气压把药液压进针筒'],
      ['💉 用注射器把药液注入肌肉', 1, '靠手对活塞的推力'],
      ['塑料吸盘挂钩贴在墙上', 0, '吸盘内气压小于大气压'],
      ['活塞式抽水机抽水', 0, '大气压把水压上来'],
      ['拔火罐时罐子紧紧吸在皮肤上', 0, '罐内空气冷却后气压减小'],
      ['茶壶盖上开一个小孔', 0, '使壶内外气压相等，水才容易倒出'],
      ['用图钉把地图钉在墙上', 1, '靠手的压力，减小受力面积增大压强'],
      ['船闸', 1, '利用连通器原理'],
      ['深水潜水员穿特制的抗压潜水服', 1, '液体压强随深度增加而增大'],
      ['用高压锅煮饭', 1, '利用沸点随气压增大而升高（锅内气压高于大气压）'],
    ], ['利用大气压', '不是利用大气压']);
  });
})();
