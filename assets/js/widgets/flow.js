/* 第9章第4节：流体压强与流速的关系——吹气的小实验、粗细不同的水管、机翼的升力（儒科夫斯基翼型势流）、生活中的现象、分类。依赖 force.js、pressure.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, PR = PS.pr;
  const TAU = Math.PI * 2;
  const HI = '#1c7ed6', LO = '#e8590c'; // 压强大（外侧）/ 流速大、压强小（内侧）的箭头颜色

  /** 一组流动的小线段：pos(u, i) 返回 [x, y, 方向角]，u ∈ [0,1) 随时间增加 */
  function streaks(ctx, n, t, speed, pos, c) {
    ctx.save(); ctx.strokeStyle = c || 'rgba(28,126,214,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u = (t * speed + i / n + ((i * 0.618) % 1) * 0.3) % 1, p = pos(u, i);
      if (!p) continue;
      ctx.beginPath(); ctx.moveTo(p[0] - Math.cos(p[2]) * 12, p[1] - Math.sin(p[2]) * 12); ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
    ctx.restore();
  }
  const arw = (ctx, x0, y0, x1, y1, c, w) => D.arrow(ctx, x0, y0, x1, y1, { color: c, width: w || 2.4, head: 8 });

  /* ================= 吹气的小实验 ================= */
  const FD = {
    strip: '向纸条上方吹气', papers: '向两张纸中间吹气', balls: '向两个乒乓球中间吹气', boats: '向两只小船中间喷水', coin: '口吹硬币跳过木块', spray: '自制喷雾器',
  };
  PS.register('flow-demos', function (el) {
    const VW = 1000, VH = 400;
    const st = { k: 'papers', blow: false, s: 0, t: 0, coin: 0 };
    const seg = PS.ui.seg(Object.keys(FD).map((k) => ({ value: k, label: FD[k] })), st.k, (v) => { st.k = v; st.blow = false; st.s = 0; st.coin = 0; ui(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const blowB = PS.ui.button('', () => { if (st.k === 'coin') { st.coin = 0.001; st.blow = true; } else st.blow = !st.blow; ui(); tell(); PS.sound.tick(); }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(blowB), msg);
    function ui() { blowB.innerHTML = st.k === 'coin' ? '💨 用力吹一口气' : st.blow ? '⏸ 停止吹气' : (st.k === 'boats' ? '💦 用注射器喷水' : '💨 吹气'); }
    function tell() {
      const T = {
        strip: '在纸条<b>上方</b>吹气，纸条上方空气流速大、压强<b>小</b>，下方空气流速小、压强<b>大</b>，纸条在压强差的作用下向<b>上</b>飘起来。',
        papers: '向两张纸中间吹气，两张纸不是被吹开，而是向<b>中间靠拢</b>：中间空气流速大、压强小，外侧压强大。',
        balls: '向两个乒乓球中间吹气，两球之间空气流速大、压强小，外侧的大气压把两球<b>推向中间</b>。',
        boats: '用注射器向两只小船中间喷水，两船之间水的流速大、压强小，外侧的水把两船<b>推向中间</b>。液体也是这样。',
        coin: '在硬币上方用力吹气，硬币上方空气流速大、压强小，硬币下方的压强大，硬币就“跳”起来了。',
        spray: '向水平吸管吹气，竖直吸管上端的空气流速大、压强<b>小</b>，杯中水面上的大气压把水压上去，水被气流吹散成水雾喷出。',
      };
      msg.className = 'fc-msg ' + (st.blow || st.coin ? 'ok' : 'info');
      msg.innerHTML = st.blow || st.coin ? T[st.k] + '<br><b>流体在流速大的地方压强小，流速小的地方压强大。</b>' : '先猜一猜：' + FD[st.k] + '，会发生什么？';
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      st.s += ((st.blow ? 1 : 0) - st.s) * Math.min(1, dt * 3);
      if (st.coin > 0 && st.coin < 1.6) { st.coin += dt; if (st.coin >= 1.6) { st.blow = false; ui(); } }
      S.render();
    }, el);
    function mouth(ctx, x, y, dir) { ctx.save(); ctx.translate(x, y); ctx.scale(dir || 1, 1); ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.ellipse(-40, 0, 46, 34, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.ellipse(6, 0, 8, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const s = st.s, k = st.k, t = st.t;
      if (k === 'strip') {
        const mx = 260, my = 180;
        mouth(ctx, mx, my);
        const ang = PS.lerp(1.25, 0.12, s) + Math.sin(t * 12) * 0.04 * s;
        ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(mx + 14, my + 10);
        for (let i = 1; i <= 20; i++) { const u = i / 20, a = ang * u; ctx.lineTo(mx + 14 + Math.cos(a) * 300 * u * (1 - 0.15 * u), my + 10 + Math.sin(a) * 300 * u * (1 - 0.15 * u)); }
        ctx.stroke();
        if (s > 0.1) { streaks(ctx, 26, t, 1.6 * s, (u, i) => [mx + 20 + u * 420, my - 6 - (i % 4) * 10 + u * 24 * (1 - s), 0.05]); arw(ctx, 470, 330, 470, 260, HI); arw(ctx, 470, 110, 470, 150, LO, 1.6); D.text(ctx, '压强小', 486, 110, { size: F(13), weight: 700, color: LO }); D.text(ctx, '压强大', 486, 330, { size: F(13), weight: 700, color: HI }); }
      } else if (k === 'papers') {
        const b = 26 * s;
        ['#fff', '#fff'].forEach((c, j) => {
          const sx = j ? 560 : 440, dir = j ? -1 : 1;
          ctx.fillStyle = '#fff'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(sx, 60); ctx.quadraticCurveTo(sx + dir * b * 2, 220, sx + dir * b * 0.8, 360); ctx.lineTo(sx + dir * b * 0.8 - dir * 8, 360); ctx.quadraticCurveTo(sx + dir * b * 2 - dir * 8, 220, sx - dir * 8, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
        });
        ctx.fillStyle = '#868e96'; ctx.fillRect(380, 52, 240, 8);
        mouth(ctx, 500, 30); // 从上方吹（嘴画在上方，示意）
        if (s > 0.1) { streaks(ctx, 24, t, 1.5 * s, (u, i) => [492 + (i % 3) * 8, 70 + u * 290, Math.PI / 2]); [130, 220, 300].forEach((y) => { arw(ctx, 380, y, 420 + b, y, HI); arw(ctx, 620, y, 580 - b, y, HI); }); D.text(ctx, '流速大，压强小', 500, 385, { size: F(13), weight: 700, color: LO, align: 'center' }); }
      } else if (k === 'balls' || k === 'boats') {
        if (k === 'boats') { ctx.fillStyle = '#d0ebff'; ctx.fillRect(150, 40, 700, 340); ctx.strokeStyle = '#74c0fc'; ctx.strokeRect(150, 40, 700, 340); }
        else { ctx.fillStyle = '#e9d8bd'; ctx.fillRect(150, 40, 700, 340); ctx.fillStyle = '#868e96'; ctx.fillRect(300, 60, 8, 300); ctx.fillRect(692, 60, 8, 300); }
        const gap = PS.lerp(190, 70, s), y = 200 + Math.sin(t * 3) * 3 * s;
        [-1, 1].forEach((d) => {
          const x = 500 + d * gap;
          if (k === 'balls') { const g = ctx.createRadialGradient(x - 10, y - 10, 4, x, y, 34); g.addColorStop(0, '#fff'); g.addColorStop(1, '#ffd43b'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 34, 0, TAU); ctx.fill(); ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 1.5; ctx.stroke(); }
          else { ctx.fillStyle = '#ff8787'; ctx.beginPath(); ctx.moveTo(x - 30, y + 70); ctx.lineTo(x + 30, y + 70); ctx.lineTo(x + 30, y - 40); ctx.quadraticCurveTo(x, y - 90, x - 30, y - 40); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 2; ctx.stroke(); }
        });
        // 吸管 / 注射器从下方向上吹（俯视图）
        ctx.fillStyle = k === 'boats' ? '#ced4da' : '#ff922b'; ctx.fillRect(492, 370, 16, 30);
        if (s > 0.1) { streaks(ctx, 22, t, 1.5 * s, (u, i) => [492 + (i % 3) * 8, 370 - u * 320, -Math.PI / 2], k === 'boats' ? 'rgba(25,113,194,.7)' : null); [-1, 1].forEach((d) => { arw(ctx, 500 + d * (gap + 120), 200, 500 + d * (gap + 40), 200, HI); }); }
        D.text(ctx, k === 'balls' ? '俯视图：乒乓球放在两根平行的木条上' : '俯视图：水槽中的两只小船', VW - 20, 26, { size: F(13), color: '#495057', align: 'right' });
      } else if (k === 'coin') {
        const ty = 300;
        ctx.fillStyle = '#e9d8bd'; ctx.fillRect(0, ty, VW, VH - ty);
        ctx.fillStyle = '#d9a866'; ctx.fillRect(600, ty - 40, 70, 40); ctx.strokeStyle = '#a5753a'; ctx.strokeRect(600, ty - 40, 70, 40);
        mouth(ctx, 330, ty - 18);
        let cx = 420, cy = ty - 4, rot = 0;
        if (st.coin > 0) { const u = Math.min(1, st.coin / 1.1); cx = 420 + u * 340; cy = ty - 4 - Math.sin(u * Math.PI) * 120 * (u < 1 ? 1 : 0); rot = u * 9; if (u >= 1) cy = ty - 4; }
        ctx.save(); ctx.translate(cx, cy); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(rot))); ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#e67700'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
        if (st.coin > 0 && st.coin < 0.9) { streaks(ctx, 20, t, 2, (u, i) => [350 + u * 300, ty - 14 - (i % 3) * 8, 0]); if (st.coin < 0.3) { arw(ctx, 420, ty + 60, 420, ty + 10, HI); D.text(ctx, '下方压强大', 436, ty + 50, { size: F(13), weight: 700, color: HI }); } }
      } else {
        // 喷雾器：竖直吸管插在水中，水平吸管从左吹向竖直吸管的上端
        const bx0 = 520, bx1 = 700, by0 = 220, by1 = 390, lv = 260;
        ctx.fillStyle = PS.LIQ.water.c; ctx.fillRect(bx0, lv, bx1 - bx0, by1 - lv);
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(bx0, by0); c.lineTo(bx0, by1); c.lineTo(bx1, by1); c.lineTo(bx1, by0); }, { width: 4 });
        const vx = 610, vTop = 130;
        const wl = lv - s * (lv - vTop);
        ctx.fillStyle = PS.LIQ.water.c2; ctx.globalAlpha = 0.6; ctx.fillRect(vx - 6, wl, 12, 360 - wl); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.strokeRect(vx - 7, vTop, 14, 360 - vTop);
        ctx.strokeRect(330, vTop - 16, 270, 14);
        mouth(ctx, 330, vTop - 9);
        if (s > 0.1) {
          streaks(ctx, 20, t, 1.6 * s, (u, i) => [350 + u * 360, vTop - 12 + (i % 2) * 5, 0]);
          if (s > 0.85) { ctx.fillStyle = 'rgba(77,171,247,.75)'; for (let i = 0; i < 40; i++) { const u = (t * 1.3 + i / 40) % 1; ctx.beginPath(); ctx.arc(615 + u * 300, vTop - 10 + Math.sin(i * 7.1) * u * 50, 2.5, 0, TAU); ctx.fill(); } }
          arw(ctx, 560, lv - 60, 560, lv - 4, HI); arw(ctx, 680, lv - 60, 680, lv - 4, HI); D.text(ctx, '大气压', 690, lv - 50, { size: F(13), weight: 700, color: HI });
          D.text(ctx, '流速大，压强小', 470, vTop - 40, { size: F(13), weight: 700, color: LO, align: 'center' });
        }
      }
      D.text(ctx, FD[k], 20, 30, { size: F(16), weight: 800, color: '#1b2333' });
    }
    ui(); tell(); loop.start();
  });

  /* ================= 粗细不同的水管 ================= */
  PS.register('venturi', function (el) {
    const VW = 1000, VH = 470, CY = 300, K = 5;
    const st = { q: 0.8, t: 0, parts: [] };
    for (let i = 0; i < 90; i++) st.parts.push({ x: 80 + Math.random() * 840, f: Math.random() * 2 - 1 });
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sQ = PS.ui.slider({ label: '打开水龙头', min: 0, max: 100, step: 5, value: 80, unit: '%', onInput: (v) => { st.q = v / 100; tell(); } });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sQ.el), msg);
    const half = (x) => (x < 380 ? 50 : x < 440 ? PS.lerp(50, 20, (x - 380) / 60) : x < 580 ? 20 : x < 640 ? PS.lerp(20, 50, (x - 580) / 60) : 50);
    const heads = () => { const q = st.q; const h1 = 40 - 4 * q * q; return [h1, h1 - 26.25 * q * q, h1 - 1.5 * q * q]; };
    function tell() {
      const [a, b, c] = heads();
      msg.className = 'fc-msg ' + (st.q ? 'ok' : 'info');
      msg.innerHTML = st.q ? '水流过管子，<b>细</b>的地方流速<b>大</b>（v₂ = ' + PS.fmt(2.5 * st.q, 1) + ' m/s），竖直细管中的水柱<b>低</b>（' + PS.fmt(b, 1) + ' cm），说明压强<b>小</b>；粗的地方流速小（v₁ = ' + PS.fmt(st.q, 1) + ' m/s），水柱高（' + PS.fmt(a, 1) + ' cm），压强大。' : '关上水龙头，水不流动，三根竖直细管与水管构成连通器，水面<b>相平</b>。';
      void c;
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      st.parts.forEach((p) => { p.x += (st.q * 90 * 50) / half(p.x) * dt; if (p.x > 925) { p.x = 80; p.f = Math.random() * 2 - 1; } });
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const top = (x) => CY - half(x), bot = (x) => CY + half(x);
      ctx.fillStyle = PS.LIQ.water.c; ctx.beginPath(); ctx.moveTo(80, top(80));
      for (let x = 80; x <= 920; x += 10) ctx.lineTo(x, top(x));
      for (let x = 920; x >= 80; x -= 10) ctx.lineTo(x, bot(x));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3;
      [top, bot].forEach((f) => { ctx.beginPath(); ctx.moveTo(80, f(80)); for (let x = 80; x <= 920; x += 10) ctx.lineTo(x, f(x)); ctx.stroke(); });
      // 水流
      ctx.fillStyle = 'rgba(25,113,194,.75)';
      st.parts.forEach((p) => { const y = CY + p.f * (half(p.x) - 5); ctx.fillRect(p.x - 6 * (50 / half(p.x)) * st.q - 1, y - 1, 2 + 12 * (50 / half(p.x)) * st.q * 0.5, 2.5); });
      // 竖直细管
      const H = heads();
      [230, 510, 780].forEach((x, i) => {
        const yt = CY - H[i] * K, pt = top(x);
        ctx.fillStyle = PS.LIQ.water.c; ctx.fillRect(x - 7, yt, 14, pt - yt);
        ctx.strokeStyle = PS.LIQ.water.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, yt); ctx.lineTo(x + 7, yt); ctx.stroke();
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(x - 8, 50); c.lineTo(x - 8, pt); c.moveTo(x + 8, 50); c.lineTo(x + 8, pt); }, { width: 2 });
        D.text(ctx, PS.fmt(H[i], 1) + ' cm', x + 14, yt, { size: F(12), weight: 700, color: '#1864ab' });
      });
      ctx.strokeStyle = 'rgba(73,80,87,.4)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(60, CY - 40 * K); ctx.lineTo(940, CY - 40 * K); ctx.stroke(); ctx.setLineDash([]);
      if (F(11) < 16) D.text(ctx, '水不流动时的水面', 944, CY - 40 * K, { size: F(11), color: '#868e96', align: 'right' });
      if (st.q > 0) {
        [[230, '粗：流速小', '压强大', HI], [510, '细：流速大', '压强小', LO], [780, '粗：流速小', '压强大', HI]].forEach(([x, a, b, c]) => {
          D.text(ctx, a, x, CY + 52 + F(14) * 1.0, { size: F(14), weight: 800, color: c, align: 'center' });
          D.text(ctx, b, x, CY + 52 + F(14) * 2.25, { size: F(14), weight: 800, color: c, align: 'center' });
        });
      }
      D.arrow(ctx, 20, CY, 70, CY, { color: '#1c7ed6', width: 3, head: 10 });
    }
    tell(); loop.start();
  });

  /* ================= 机翼的升力（儒科夫斯基翼型的势流） ================= */
  // 复数运算
  const C = (re, im) => ({ re, im });
  const add = (a, b) => C(a.re + b.re, a.im + b.im), sub = (a, b) => C(a.re - b.re, a.im - b.im);
  const mul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
  const div = (a, b) => { const d = b.re * b.re + b.im * b.im; return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
  const csqrt = (a) => { const r = Math.hypot(a.re, a.im), re = Math.sqrt((r + a.re) / 2), im = Math.sign(a.im || 1) * Math.sqrt(Math.max(0, (r - a.re) / 2)); return C(re, im); };
  const cexp = (t) => C(Math.cos(t), Math.sin(t));
  const ab = (a) => Math.hypot(a.re, a.im);
  const SHAPES = { wing: { name: '机翼（上凸下平）', eps: 0.09, del: 0.14 }, sym: { name: '对称的翼（上下一样）', eps: 0.1, del: 0 }, inv: { name: '倒装的翼（赛车尾翼）', eps: 0.09, del: -0.14 } };
  PS.register('wing-lift', function (el) {
    const VW = 1000, VH = 420, SC = 112, OX = 470, OY = 205;
    const st = { k: 'wing', a: 4, U: 40, t: 0, parts: [], cache: null, ckey: '' };
    const kSeg = PS.ui.seg(Object.keys(SHAPES).map((k) => ({ value: k, label: SHAPES[k].name })), st.k, (v) => { st.k = v; setup(); });
    kSeg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(kSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sA = PS.ui.slider({ label: '迎角', min: -6, max: 12, step: 1, value: st.a, unit: '°', onInput: (v) => { st.a = v; setup(); } });
    const sU = PS.ui.slider({ label: '风速', min: 0, max: 60, step: 5, value: st.U, unit: 'm/s', onInput: (v) => { st.U = v; tell(); } });
    const pT = PS.ui.toggle('显示压强分布（蓝色压强小，红色压强大）', true, () => S.render());
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sA.el, sU.el), PS.ui.row(pT.el), msg);
    let mu, R, al, beta, G;
    function setup() {
      const s = SHAPES[st.k];
      mu = C(-s.eps, s.del); R = ab(sub(C(1, 0), mu)); al = (st.a * Math.PI) / 180; beta = Math.atan2(s.del, 1 + s.eps);
      G = 4 * Math.PI * R * Math.sin(al + beta); // 单位风速时的环量（库塔条件）
      tell(); S.render();
    }
    // ζ 平面的复速度（单位风速）
    const dWz = (z) => { const zm = sub(z, mu), zm2 = mul(zm, zm); return add(sub(cexp(-al), div(mul(C(R * R, 0), cexp(al)), zm2)), div(C(0, G / TAU), zm)); };
    const toZeta = (z) => { const s = csqrt(sub(mul(z, z), C(4, 0))); const a = mul(add(z, s), C(0.5, 0)), b = mul(sub(z, s), C(0.5, 0)); const ra = ab(sub(a, mu)), rb = ab(sub(b, mu)); if (ra < R * 0.999 && rb < R * 0.999) return null; return ra >= rb ? a : b; };
    /** z 平面的速度（u, v），单位风速 */
    function vel(z) { const zt = toZeta(z); if (!zt) return null; const dz = sub(C(1, 0), div(C(1, 0), mul(zt, zt))); if (ab(dz) < 1e-3) return C(0, 0); const w = div(dWz(zt), dz); return C(w.re, -w.im); }
    const lift = () => st.U * st.U * Math.sin(al + beta) * R; // 与 ρU²·sin(α+β) 成正比（示意）
    function tell() {
      const L = lift();
      let s;
      if (!st.U) s = '没有风（飞机静止）时，机翼上下的压强相等，没有升力。';
      else if (st.k === 'wing') s = '机翼上方是弧形、下方近似平面。气流经过时，上方的流速<b>大</b>、压强<b>小</b>；下方的流速小、压强大。上下表面的压强差产生向上的<b>升力</b>。' + (st.a > 8 ? '（迎角太大时真实的机翼会“失速”，这里的理想流动模型没有考虑。）' : '');
      else if (st.k === 'sym') s = st.a ? '上下对称的翼也可以靠<b>迎角</b>产生升力：' + (st.a > 0 ? '上方流速更大，升力向上。' : '迎角为负，下方流速更大，“升力”向下。') : '上下对称的翼，迎角为 0 时上下流速相同，压强相同，<b>没有升力</b>。';
      else s = '赛车尾翼像倒装的机翼：<b>下方</b>流速大、压强小，产生<b>向下</b>的压力，使车轮更紧地压在地面上，高速转弯时不易打滑。';
      if (st.U) s += '<br>升力的大小（相对值）：<b>' + PS.fmt(L / 100, 1).replace('-', '−') + '</b>' + (L < 0 ? '（负号表示向下）' : '') + '——风速越大、迎角越大，升力越大。';
      msg.className = 'fc-msg ' + (L > 0.5 ? 'ok' : 'info'); msg.innerHTML = s;
    }
    function field() {
      const key = st.k + st.a;
      if (st.ckey === key) return st.cache;
      const cw = 125, ch = 52, c = document.createElement('canvas'); c.width = cw; c.height = ch; const g = c.getContext('2d'), img = g.createImageData(cw, ch);
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
        const z = C(((i + 0.5) * (VW / cw) - OX) / SC, (OY - (j + 0.5) * (VH / ch)) / SC), v = vel(z), o = (j * cw + i) * 4;
        if (!v) { img.data[o + 3] = 0; continue; }
        const cp = PS.clamp(1 - (v.re * v.re + v.im * v.im), -2.2, 1);
        const t = cp < 0 ? -cp / 2.2 : cp; // 0~1
        const col = cp < 0 ? [28, 126, 214] : [224, 49, 49];
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = Math.round(200 * Math.pow(t, 0.7));
      }
      g.putImageData(img, 0, 0);
      st.cache = c; st.ckey = key; return c;
    }
    function spawn(p, anyX) { p.x = anyX ? -4.2 + Math.random() * 8.4 : -4.3; p.y = (Math.random() * 2 - 1) * 1.8; p.px = p.x; p.py = p.y; }
    for (let i = 0; i < 160; i++) { const p = {}; spawn(p, true); st.parts.push(p); }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const sp = (st.U / 40) * 1.3 * dt;
      if (sp > 0) st.parts.forEach((p) => {
        const v1 = vel(C(p.x, p.y));
        if (!v1) { spawn(p); return; }
        const mx = p.x + v1.re * sp * 0.5, my = p.y + v1.im * sp * 0.5, v2 = vel(C(mx, my));
        if (!v2) { spawn(p); return; }
        p.px = p.x; p.py = p.y; p.x += v2.re * sp; p.y += v2.im * sp; p.s = Math.hypot(v2.re, v2.im);
        if (p.x > 4.4 || Math.abs(p.y) > 2) spawn(p);
      });
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (pT.value && st.U) { ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.55; ctx.drawImage(field(), 0, 0, VW, VH); ctx.restore(); }
      const X = (x) => OX + x * SC, Y = (y) => OY - y * SC;
      // 流线上的小线段（颜色表示速度）
      ctx.lineWidth = 2; ctx.lineCap = 'round';
      if (st.U) st.parts.forEach((p) => { const s = p.s || 1; ctx.strokeStyle = s > 1.15 ? 'rgba(232,89,12,.85)' : s < 0.85 ? 'rgba(73,80,87,.55)' : 'rgba(25,113,194,.65)'; const dx = p.x - p.px, dy = p.y - p.py, L = Math.hypot(dx, dy) || 1; ctx.beginPath(); ctx.moveTo(X(p.x - (dx / L) * 0.08 * s), Y(p.y - (dy / L) * 0.08 * s)); ctx.lineTo(X(p.x), Y(p.y)); ctx.stroke(); });
      // 翼型
      ctx.fillStyle = '#495057'; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const zt = add(mu, mul(C(R, 0), cexp((i / 120) * TAU))), z = add(zt, div(C(1, 0), zt)); i ? ctx.lineTo(X(z.re), Y(z.im)) : ctx.moveTo(X(z.re), Y(z.im)); }
      ctx.closePath(); ctx.fill();
      // 升力
      const L = lift();
      if (st.U && Math.abs(L) > 0.5) FO.arrow(ctx, X(0), Y(0.05), L > 0 ? -Math.PI / 2 : Math.PI / 2, Math.min(170, Math.abs(L) * 0.6), { color: L > 0 ? '#2b8a3e' : '#c92a2a', width: 5, head: 16, label: L > 0 ? '升力' : '向下的压力', F, labelSide: -1 });
      // 压强计：接在上下表面中部
      const onWing = (th) => { const zt = add(mu, mul(C(R * 1.04, 0), cexp(th))); return add(zt, div(C(1, 0), zt)); };
      const zu = onWing(Math.PI / 2), zd = onWing(-Math.PI / 2), up = vel(zu), dn = vel(zd);
      [zu, zd].forEach((z) => { ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.arc(X(z.re), Y(z.im), 4, 0, TAU); ctx.fill(); });
      const dp = up && dn ? 0.5 * 1.29 * st.U * st.U * ((up.re ** 2 + up.im ** 2) - (dn.re ** 2 + dn.im ** 2)) : 0; // Pa：下方压强 − 上方压强
      PR.utube(ctx, { x: 880, gap: 40, y: 262, L: 110, dh: PS.clamp(-dp / 12, -90, 90), k: 5, F, tw: 10, showDh: false });
      D.text(ctx, '接上表面', 868, 236, { size: F(11), color: '#495057', align: 'center' }); D.text(ctx, '接下表面', 932, 236, { size: F(11), color: '#495057', align: 'center' });
      D.text(ctx, '上下表面的压强差 ≈ ' + PS.fmt(Math.abs(dp), 0) + ' Pa', 900, 214, { size: F(12), weight: 700, color: '#c92a2a', align: 'center' });
      D.arrow(ctx, 20, 30, 80, 30, { color: '#1c7ed6', width: 3, head: 10 }); D.text(ctx, '风 ' + st.U + ' m/s', 88, 30, { size: F(13), weight: 700, color: '#1c7ed6' });
      D.text(ctx, '橙色：流速大　灰色：流速小', 20, VH - 16, { size: F(11), color: '#868e96' });
    }
    setup(); loop.start();
  });

  /* ================= 生活中的现象 ================= */
  const LIFE = { platform: '🚄 站台上的安全线', curtain: '🌬️ 窗帘飘向窗外', ships: '🚢 两船不能近距离并行', roof: '🏠 大风掀翻屋顶' };
  PS.register('flow-life', function (el) {
    const VW = 1000, VH = 400;
    const st = { k: 'platform', run: 0, near: true, t: 0 };
    const seg = PS.ui.seg(Object.keys(LIFE).map((k) => ({ value: k, label: LIFE[k] })), st.k, (v) => { st.k = v; st.run = 0; ctl(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const nearSeg = PS.ui.seg([{ value: true, label: '站在安全线以内（靠近列车）' }, { value: false, label: '站在安全线以外' }], st.near, (v) => { st.near = v; st.run = 0; tell(); });
    nearSeg.el.style.flexWrap = 'wrap';
    const nr = PS.ui.row(nearSeg.el);
    const msg = h('div', { class: 'fc-msg' });
    el.append(nr, PS.ui.row(PS.ui.button('▶ 演示', () => { st.run = 0.001; tell(); }, 'btn btn-primary btn-sm')), msg);
    function ctl() { nr.style.display = st.k === 'platform' ? '' : 'none'; }
    function tell() {
      const T = {
        platform: st.near ? '列车高速驶过时，靠近列车的空气流速<b>大</b>、压强<b>小</b>，人身后的空气压强大，压强差会把人<b>推向列车</b>——非常危险！' : '站在安全线以外，离列车较远，那里的空气流速小，压强差小，比较安全。所以候车时一定要站在<b>安全线以外</b>。',
        curtain: '风沿着窗外的墙面吹过，窗外空气流速<b>大</b>、压强<b>小</b>，室内空气流速小、压强大，窗帘被压向<b>窗外</b>。',
        ships: '两船并行时，两船之间的水流速<b>大</b>、压强<b>小</b>，外侧的水压强大，把两船推向一起，容易相撞。所以航行时两船不能靠得太近。',
        roof: '大风吹过屋顶，屋顶上方空气流速<b>大</b>、压强<b>小</b>，屋内空气压强大，屋顶受到向上的压力差，可能被<b>掀翻</b>。',
      };
      msg.className = 'fc-msg ' + (st.run ? (st.k === 'platform' && !st.near ? 'ok' : 'bad') : 'info');
      msg.innerHTML = st.run ? T[st.k] : '点“演示”，想一想为什么会这样。';
    }
    const loop = PS.loop((dt) => { st.t += dt; if (st.run > 0 && st.run < 4) st.run += dt; S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const r = st.run, on = r > 0 && r < 4, t = st.t, k = st.k;
      if (k === 'platform') {
        // 俯视图：上方是轨道，下方是站台
        ctx.fillStyle = '#ced4da'; ctx.fillRect(0, 40, VW, 120); ctx.fillStyle = '#868e96'; ctx.fillRect(0, 70, VW, 6); ctx.fillRect(0, 124, VW, 6);
        ctx.fillStyle = '#dee2e6'; ctx.fillRect(0, 160, VW, 240);
        ctx.fillStyle = '#fab005'; ctx.fillRect(0, 214, VW, 10); D.text(ctx, '安全线', 20, 236, { size: F(12), weight: 700, color: '#e67700' });
        const tx = on ? -900 + (r / 2.6) * 2300 : -2000;
        ctx.fillStyle = '#f1f3f5'; ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 3; D.roundRect(ctx, tx, 60, 900, 80, 30); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1c7ed6'; ctx.fillRect(tx + 20, 94, 860, 10);
        const passing = tx + 900 > 300 && tx < 700;
        if (passing) streaks(ctx, 30, t, 2.5, (u, i) => [u * VW, 150 + (i % 4) * 12, 0], 'rgba(232,89,12,.7)');
        const py = st.near ? 196 : 270, lean = passing ? (st.near ? 22 : 5) * Math.min(1, (r % 4)) : 0;
        ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(500, py - lean, 22, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(500, py - lean, 11, 0, TAU); ctx.fill();
        if (passing) { arw(ctx, 500, py + 90, 500, py + 30, HI); D.text(ctx, '压强大', 516, py + 80, { size: F(13), weight: 700, color: HI }); D.text(ctx, '流速大，压强小', 640, 190, { size: F(13), weight: 700, color: LO }); }
        D.text(ctx, '俯视图', VW - 20, 24, { size: F(12), color: '#868e96', align: 'right' });
      } else if (k === 'curtain') {
        ctx.fillStyle = '#fff4e6'; ctx.fillRect(0, 0, 600, VH); ctx.fillStyle = '#d0ebff'; ctx.fillRect(640, 0, 360, VH);
        ctx.fillStyle = '#adb5bd'; ctx.fillRect(600, 0, 40, 120); ctx.fillRect(600, 300, 40, 100);
        const out = on ? Math.min(1, r) : 0;
        ctx.fillStyle = 'rgba(240,101,149,.75)';
        ctx.beginPath(); ctx.moveTo(580, 110);
        for (let y = 110; y <= 300; y += 10) { const u = (y - 110) / 190; ctx.lineTo(580 + out * (60 + 120 * u) + Math.sin(y * 0.08 + t * 8) * 6 * out, y); }
        for (let y = 300; y >= 110; y -= 10) { const u = (y - 110) / 190; ctx.lineTo(560 + out * (60 + 120 * u) + Math.sin(y * 0.08 + t * 8) * 6 * out, y); }
        ctx.closePath(); ctx.fill();
        if (on) { streaks(ctx, 30, t, 1.8, (u, i) => [650 + (i % 5) * 60, VH - u * VH, -Math.PI / 2], 'rgba(232,89,12,.7)'); arw(ctx, 400, 210, 520, 210, HI); D.text(ctx, '室内：压强大', 300, 180, { size: F(13), weight: 700, color: HI }); D.text(ctx, '窗外：风大，压强小', 820, 40, { size: F(13), weight: 700, color: LO, align: 'center' }); }
      } else if (k === 'ships') {
        ctx.fillStyle = '#a5d8ff'; ctx.fillRect(0, 0, VW, VH);
        const g = on ? Math.max(20, 120 - r * 35) : 120, x = on ? 100 + r * 110 : 100;
        [-1, 1].forEach((d) => { const y = 200 + d * g; ctx.fillStyle = '#f1f3f5'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x + 300, y - 30); ctx.quadraticCurveTo(x + 380, y, x + 300, y + 30); ctx.lineTo(x, y + 30); ctx.closePath(); ctx.fill(); ctx.stroke(); });
        if (on) { streaks(ctx, 24, t, 1.6, (u, i) => [x + 400 - u * 520, 200 + ((i % 3) - 1) * 8, Math.PI], 'rgba(232,89,12,.8)'); arw(ctx, x + 150, 200 - g - 100, x + 150, 200 - g - 36, HI); arw(ctx, x + 150, 200 + g + 100, x + 150, 200 + g + 36, HI); }
        D.text(ctx, '俯视图', VW - 20, 24, { size: F(12), color: '#495057', align: 'right' });
      } else {
        ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH); ctx.fillStyle = '#b2f2bb'; ctx.fillRect(0, 360, VW, 40);
        ctx.fillStyle = '#fff4e6'; ctx.fillRect(330, 220, 340, 140); ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.strokeRect(330, 220, 340, 140);
        const lift = on ? Math.min(70, Math.max(0, r - 1.2) * 45) : 0, rot = on ? Math.min(0.25, Math.max(0, r - 1.2) * 0.12) : 0;
        ctx.save(); ctx.translate(500, 220 - lift); ctx.rotate(-rot); ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.moveTo(-200, 0); ctx.lineTo(0, -110); ctx.lineTo(200, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        if (on) { streaks(ctx, 34, t, 1.6, (u, i) => { const x = u * VW; const y = x < 300 ? 200 - (i % 4) * 14 : x < 700 ? 200 - 120 * (1 - Math.abs(x - 500) / 200) - (i % 4) * 10 - lift : 200 - (i % 4) * 14; return [x, y - 20, 0]; }, 'rgba(232,89,12,.75)'); arw(ctx, 500, 330, 500, 250, HI); D.text(ctx, '屋内压强大', 516, 320, { size: F(13), weight: 700, color: HI }); D.text(ctx, '屋顶上方流速大，压强小', 500, 40, { size: F(13), weight: 700, color: LO, align: 'center' }); }
      }
      D.text(ctx, LIFE[k].replace(/^\S+ /, ''), 20, 24, { size: F(15), weight: 800, color: '#1b2333' });
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 是哪种压强？ ================= */
  PS.register('flow-sort', function (el) {
    PS.sortCards(el, [
      ['🥤 用吸管喝饮料', 0, '嘴把吸管内的空气吸走，大气压把饮料压上来'],
      ['吸盘挂钩贴在墙上', 0, '吸盘内气压小于大气压'],
      ['覆杯实验中纸片不掉', 0, '大气压托住纸片'],
      ['拦河坝修成上窄下宽', 1, '液体压强随深度增加而增大'],
      ['深海潜水要穿抗压潜水服', 1, '液体压强随深度增加而增大'],
      ['帕斯卡用几杯水压裂木桶', 1, '液体压强与深度有关，与液体多少无关'],
      ['✈️ 飞机的机翼产生升力', 2, '机翼上方流速大、压强小'],
      ['🚄 站台上要站在安全线以外', 2, '列车附近空气流速大、压强小'],
      ['两艘船不能近距离并行', 2, '两船之间水流速大、压强小'],
      ['窗外刮风，窗帘飘向窗外', 2, '窗外流速大、压强小'],
      ['⚽ 足球运动员踢出“香蕉球”', 2, '旋转的球两侧空气流速不同，压强不同'],
      ['🌪️ 龙卷风把屋顶掀翻', 2, '屋顶上方流速大、压强小'],
    ], ['大气压', '液体压强', '流体压强与流速']);
  });
})();
