/* 第9章第2节：液体的压强——橡皮膜与侧壁喷水、p = ρgh 的推导与深度、容器形状与帕斯卡裂桶、压强计算练习、连通器及其应用。依赖 force.js、dynamics.js、pressure.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, PR = PS.pr, DY = PS.dyn;
  const TAU = Math.PI * 2;
  const LQ = PS.LIQ;

  /* ================= 液体压强的存在：橡皮膜、侧壁小孔 ================= */
  PS.register('liquid-exist', function (el) {
    const VW = 1000, VH = 440, K = 10;
    const st = { k: 'bottom', liq: 'water', dep: 16, H: 0.13, open: false, t: 0 };
    const seg = PS.ui.seg([{ value: 'bottom', label: '底部的橡皮膜' }, { value: 'side', label: '侧壁的橡皮膜' }, { value: 'jets', label: '侧壁的小孔喷水' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sD = PS.ui.slider({ label: '管内液体深度', min: 0, max: 24, step: 1, value: st.dep, unit: 'cm', onInput: (v) => { st.dep = v; tell(); } });
    const lSeg = PS.ui.seg([{ value: 'water', label: '水' }, { value: 'salt', label: '盐水' }], st.liq, (v) => { st.liq = v; tell(); });
    const openB = PS.ui.button('拔掉塞子', () => { st.open = !st.open; openB.innerHTML = st.open ? '塞住小孔' : '拔掉塞子'; tell(); }, 'btn btn-primary btn-sm');
    const fillB = PS.ui.button('加满水', () => { st.H = 0.13; tell(); }, 'btn btn-ghost btn-sm');
    const c1 = PS.ui.row(sD.el, lSeg.el), c2 = PS.ui.row(openB, fillB);
    const msg = h('div', { class: 'fc-msg' });
    el.append(c1, c2, msg);
    function ctl() { c1.style.display = st.k === 'jets' ? 'none' : ''; c2.style.display = st.k === 'jets' ? '' : 'none'; }
    const HOLES = [160, 125, 90], BOT = 180, TOP0 = 50, TABLE = 420, BX0 = 140, BX1 = 260;
    function tell() {
      let s;
      if (st.k === 'bottom') s = st.dep ? '橡皮膜向<b>下</b>凸出：液体受到<b>重力</b>，对容器<b>底部</b>有压强。液体越深，凸出得越多' + (st.liq === 'salt' ? '；换成盐水（密度更大），同样深度凸出得更多。' : '。') : '管中没有液体，橡皮膜是平的。';
      else if (st.k === 'side') s = '侧壁的橡皮膜向<b>外</b>凸出：液体具有<b>流动性</b>，对容器<b>侧壁</b>也有压强。下面的橡皮膜在更深处，凸出得更多。';
      else s = st.open ? '水从侧壁的小孔喷出——液体对侧壁有压强。<b>越深</b>的孔，水喷得越急、越远；随着水面下降，水流越来越弱。' : '塑料瓶侧壁上有三个小孔，先用塞子塞住。点“拔掉塞子”。';
      msg.className = 'fc-msg info'; msg.innerHTML = s;
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.k !== 'jets') return;
      st.t += dt;
      if (st.open && st.H > 0) {
        let q = 0;
        HOLES.forEach((y) => { const d = st.H - (BOT - y) / 1000; if (d > 0) q += Math.sqrt(2 * 9.8 * d); });
        st.H = Math.max(0, st.H - q * 0.0025 * dt);
      }
      S.render();
    }, el);
    function tube(ctx, x0, x1, top, bot, closed) {
      PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(x0, top); c.lineTo(x0, bot); if (closed) c.lineTo(x1, bot); else c.moveTo(x1, bot); c.lineTo(x1, top); });
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const L = LQ[st.liq], kr = L.rho / 1000;
      if (st.k === 'bottom' || st.k === 'side') {
        const x0 = 440, x1 = 560, top = 60, bot = 340, lv = bot - st.dep * K;
        if (st.k === 'bottom') {
          const b = st.dep * 1.25 * kr;
          ctx.fillStyle = L.c; ctx.beginPath(); ctx.moveTo(x0, lv); ctx.lineTo(x0, bot); ctx.quadraticCurveTo(500, bot + 2 * b, x1, bot); ctx.lineTo(x1, lv); ctx.closePath(); if (st.dep) ctx.fill();
          if (st.dep) PR.liquid(ctx, x0, lv, x1 - x0, 0, st.liq);
          ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, bot); ctx.quadraticCurveTo(500, bot + 2 * b, x1, bot); ctx.stroke();
          tube(ctx, x0, x1, top, bot, false);
          if (st.dep) [470, 500, 530].forEach((x) => D.arrow(ctx, x, bot - 30, x, bot - 4 + b * (1 - ((x - 500) / 60) ** 2), { color: '#1c7ed6', width: 2.2, head: 8 }));
          D.text(ctx, '橡皮膜', x1 + 14, bot + b, { size: F(13), weight: 700, color: '#e03131' });
        } else {
          ctx.fillStyle = L.c; if (st.dep) ctx.fillRect(x0, lv, x1 - x0, bot - lv);
          if (st.dep) PR.liquid(ctx, x0, lv, x1 - x0, 0, st.liq);
          tube(ctx, x0, x1, top, bot, true);
          [300, 200].forEach((my) => {
            const d = Math.max(0, my - lv) / K, b = d * 1.4 * kr;
            ctx.fillStyle = d > 0 ? L.c : 'rgba(255,255,255,.6)';
            ctx.beginPath(); ctx.moveTo(x1, my - 22); ctx.quadraticCurveTo(x1 + 2 * b, my, x1, my + 22); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, my - 22); ctx.quadraticCurveTo(x1 + 2 * b, my, x1, my + 22); ctx.stroke();
            if (d > 0) { D.arrow(ctx, x1 - 34, my, x1 - 4 + b, my, { color: '#1c7ed6', width: 2.2, head: 8 }); D.text(ctx, '深 ' + PS.fmt(d, 0) + ' cm', x1 + 2 * b + 14, my, { size: F(12), weight: 700, color: '#1864ab' }); }
          });
        }
        // 刻度尺（从液面量深度）
        if (st.dep) {
          ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(x0 - 70, lv); ctx.lineTo(x0, lv); ctx.stroke(); ctx.setLineDash([]);
          D.arrow(ctx, x0 - 50, lv, x0 - 50, bot, { color: '#495057', width: 1.4, head: 7 });
          D.text(ctx, 'h = ' + st.dep + ' cm', x0 - 56, (lv + bot) / 2, { size: F(13), weight: 700, color: '#1b2333', align: 'right' });
        }
        D.text(ctx, st.k === 'bottom' ? '上端开口、下端扎橡皮膜的玻璃管' : '侧壁开口处蒙有橡皮膜的玻璃管', 24, 32, { size: F(14), weight: 800, color: '#1b2333' });
      } else {
        // 塑料瓶放在高台上，侧壁三个小孔
        const lv = BOT - st.H * 1000;
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(120, BOT, 160, TABLE - BOT); ctx.strokeStyle = '#adb5bd'; ctx.strokeRect(120, BOT, 160, TABLE - BOT);
        ctx.fillStyle = '#dee2e6'; ctx.fillRect(0, TABLE, VW, VH - TABLE);
        ctx.fillStyle = 'rgba(77,171,247,.45)'; ctx.fillRect(BX0, Math.max(lv, TOP0), BX1 - BX0, BOT - Math.max(lv, TOP0));
        if (st.H > 0) PR.liquid(ctx, BX0, lv, BX1 - BX0, 0, 'water');
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(BX0, TOP0 - 10); c.lineTo(BX0, BOT); c.lineTo(BX1, BOT); c.lineTo(BX1, TOP0 - 10); }, { width: 3.5 });
        HOLES.forEach((y, i) => {
          const d = st.H - (BOT - y) / 1000;
          if (st.open && d > 0) {
            const v = Math.sqrt(2 * 9.8 * d), Y = (TABLE - y) / 1000, T = Math.sqrt((2 * Y) / 9.8);
            ctx.strokeStyle = 'rgba(28,126,214,.75)'; ctx.lineWidth = 6 - i; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(BX1, y);
            for (let k = 1; k <= 30; k++) { const t = (T * k) / 30; ctx.lineTo(BX1 + v * t * 1000, y + 4.9 * t * t * 1000); }
            ctx.stroke();
            ctx.fillStyle = 'rgba(28,126,214,.6)';
            for (let k = 0; k < 6; k++) { const t = T * (((st.t * 1.5 + k / 6) % 1)); ctx.beginPath(); ctx.arc(BX1 + v * t * 1000, y + 4.9 * t * t * 1000, 3, 0, TAU); ctx.fill(); }
            D.text(ctx, '深 ' + PS.fmt(d * 100, 1) + ' cm，v ≈ ' + PS.fmt(v, 2) + ' m/s', BX1 + 14, y - 12, { size: F(12), weight: 700, color: '#1864ab', bg: 'rgba(255,255,255,.8)' });
          }
          ctx.fillStyle = st.open ? '#1b2333' : '#e03131'; ctx.beginPath(); ctx.arc(BX1 + (st.open ? 0 : 4), y, st.open ? 3 : 5, 0, TAU); ctx.fill();
        });
        D.text(ctx, '侧壁扎有小孔的塑料瓶（放在高台上）', VW - 24, 32, { size: F(14), weight: 800, color: '#1b2333', align: 'right' });
      }
    }
    ctl(); tell(); loop.start();
  });

  /* ================= p = ρgh 的推导；深度的含义 ================= */
  PS.register('liquid-column', function (el) {
    const VW = 1000, VH = 430, K = 10;
    const st = { k: 'derive', liq: 'water', A: 200, step: 0, tilt: 30 };
    const seg = PS.ui.seg([{ value: 'derive', label: '推导 p = ρgh' }, { value: 'depth', label: '深度 h 指什么？' }], st.k, (v) => { st.k = v; ctl(); S.render(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const lSeg = PS.ui.seg(['water', 'salt', 'alcohol'].map((k) => ({ value: k, label: LQ[k].name })), st.liq, (v) => { st.liq = v; S.render(); });
    const steps = [
      '想象 A 点上方有一个竖直的液柱，底面积为 S、高为 h',
      '液柱的体积 V = Sh',
      '液柱的质量 m = ρV = ρSh',
      '液柱的重力 G = mg = ρgSh',
      '液柱对底面的压力 F = G = ρgSh',
      '底面受到的压强 p = F/S = ρgSh/S = <b>ρgh</b>',
    ];
    const ol = h('ol', { class: 'pr-steps' });
    const stepB = PS.ui.button('下一步 ▶', () => { st.step = (st.step + 1) % steps.length; list(); S.render(); }, 'btn btn-primary btn-sm');
    const sT = PS.ui.slider({ label: '试管倾斜角度', min: 0, max: 70, step: 5, value: st.tilt, unit: '°', onInput: (v) => { st.tilt = v; S.render(); } });
    const c1 = h('div', null, PS.ui.row(lSeg.el, stepB, h('span', { class: 'small muted' }, '拖动 A 点改变深度')), ol), c2 = PS.ui.row(sT.el);
    const msg = h('div', { class: 'fc-msg info', html: '<b>深度 h</b>：从<b>自由液面</b>（与空气接触的液面）到该点的<b>竖直距离</b>，不是到容器底的距离，也不是沿管子量的长度。' });
    el.append(c1, c2, msg);
    function list() { ol.innerHTML = ''; steps.forEach((t, i) => ol.append(h('li', { class: i === st.step ? 'on' : i < st.step ? 'done' : '', html: t }))); stepB.innerHTML = st.step === steps.length - 1 ? '↺ 重来' : '下一步 ▶'; }
    function ctl() { c1.style.display = st.k === 'derive' ? '' : 'none'; c2.style.display = msg.style.display = st.k === 'depth' ? '' : 'none'; }
    const SURF = 70, BOT = 400, AX = 260;
    PS.drag(S, { VW, VH, hit: (p) => (st.k === 'derive' && Math.hypot(p.x - AX, p.y - (SURF + st.A)) < 30 ? 'A' : null), move: (o, p) => { st.A = PS.clamp(Math.round((p.y - SURF) / K) * K, 20, 300); S.render(); } });
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.k === 'derive') {
        const L = LQ[st.liq], x0 = 70, x1 = 450, Ay = SURF + st.A, hm = st.A / K / 100;
        ctx.fillStyle = L.c; ctx.fillRect(x0, SURF, x1 - x0, BOT - SURF);
        PR.liquid(ctx, x0, SURF, x1 - x0, 0, st.liq);
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(x0, SURF - 30); c.lineTo(x0, BOT); c.lineTo(x1, BOT); c.lineTo(x1, SURF - 30); }, { width: 4 });
        // 液柱
        const cw = 70;
        ctx.fillStyle = st.step >= 1 ? 'rgba(232,89,12,.25)' : 'rgba(232,89,12,.12)'; ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.fillRect(AX - cw / 2, SURF, cw, st.A); ctx.strokeRect(AX - cw / 2, SURF, cw, st.A); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(232,89,12,.55)'; ctx.beginPath(); ctx.ellipse(AX, Ay, cw / 2, 8, 0, 0, TAU); ctx.fill();
        D.text(ctx, 'S', AX + cw / 2 + 8, Ay + 4, { size: F(15), weight: 800, color: '#e8590c' });
        if (st.step >= 3) FO.arrow(ctx, AX, SURF + st.A / 2, Math.PI / 2, Math.min(120, st.A / 2 + 10), { color: FC.G, label: 'G', F });
        D.arrow(ctx, x0 + 22, SURF, x0 + 22, Ay, { color: '#1b2333', width: 1.4, head: 7 }); D.arrow(ctx, x0 + 22, Ay, x0 + 22, SURF, { color: '#1b2333', width: 1.4, head: 7 });
        D.text(ctx, 'h', x0 + 30, (SURF + Ay) / 2, { size: F(16), weight: 800, color: '#1b2333' });
        PS.handle(ctx, AX, Ay, 10, '#e03131', '', F);
        D.text(ctx, 'A', AX - 22, Ay - 4, { size: F(16), weight: 800, color: '#e03131', align: 'right' });
        D.text(ctx, L.name + '：ρ = ' + PR.sci(L.rho) + ' kg/m³，h = ' + PS.fmt(hm * 100, 0) + ' cm = ' + PS.fmt(hm, 2) + ' m', 480, 40, { size: F(14), weight: 700, color: '#1b2333' });
        D.text(ctx, 'p = ρgh = ' + PR.sci(L.rho) + ' × 10 × ' + PS.fmt(hm, 2) + ' Pa = ' + PS.fmt(L.rho * 10 * hm, 0) + ' Pa', 480, 40 + F(14) * 1.6, { size: F(15), weight: 800, color: '#e03131' });
        const C = DY.chart(ctx, { F, x: 540, y: 140, w: 400, h: 230, xmax: 30, ymax: 4000, xstep: 5, ystep: 1000, xl: 'h/cm', yl: 'p/Pa', padL: 52,
          series: ['salt', 'water', 'alcohol'].map((k) => ({ pts: [[0, 0], [30, LQ[k].rho * 10 * 0.3]], color: LQ[k].c2, width: k === st.liq ? 3.4 : 1.6, dash: k === st.liq ? [] : [5, 4] })) });
        ['salt', 'water', 'alcohol'].forEach((k) => D.text(ctx, LQ[k].name, C.X(30) - 4, C.Y(LQ[k].rho * 10 * 0.3) - 8, { size: F(12), weight: 700, color: LQ[k].c2, align: 'right' }));
        const px = C.X(hm * 100), py = C.Y(L.rho * 10 * hm);
        ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill();
      } else {
        // 左：形状不规则的容器（L 形），A、B 两点深度相同
        const sy = 120, cy = 250;
        const path = (c) => { c.beginPath(); c.moveTo(80, 60); c.lineTo(80, 400); c.lineTo(440, 400); c.lineTo(440, cy); c.lineTo(190, cy); c.lineTo(190, 60); };
        ctx.save(); ctx.beginPath(); ctx.moveTo(80, sy); ctx.lineTo(80, 400); ctx.lineTo(440, 400); ctx.lineTo(440, cy); ctx.lineTo(190, cy); ctx.lineTo(190, sy); ctx.closePath();
        ctx.fillStyle = LQ.water.c; ctx.fill(); ctx.restore();
        PR.liquid(ctx, 80, sy, 110, 0, 'water');
        PR.glass(ctx, path, { width: 4 });
        const ay = 320, pts = [[135, ay, 'A'], [390, ay, 'B']];
        pts.forEach(([x, y, n]) => { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); D.text(ctx, n, x + 10, y - 10, { size: F(16), weight: 800, color: '#e03131' }); });
        ctx.strokeStyle = '#1c7ed6'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(190, sy); ctx.lineTo(470, sy); ctx.stroke(); ctx.setLineDash([]);
        D.arrow(ctx, 460, sy, 460, ay, { color: '#1c7ed6', width: 1.8, head: 8 });
        D.text(ctx, 'h = 20 cm', 466, (sy + ay) / 2, { size: F(13), weight: 800, color: '#1c7ed6' });
        D.arrow(ctx, 330, cy, 330, ay, { color: '#adb5bd', width: 1.2, head: 6 });
        D.text(ctx, '不是到顶壁的距离', 336, (cy + ay) / 2 + 4, { size: F(11), color: '#868e96' });
        D.text(ctx, 'A、B 在同一深度：p_A = p_B', 90, 40, { size: F(14), weight: 800, color: '#1b2333' });
        // 右：倾斜的试管（液柱长 20 cm）
        const th = (st.tilt * Math.PI) / 180, bx = 760, by = 395, Lp = 200, len = 280;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(th);
        ctx.fillStyle = LQ.water.c; ctx.fillRect(-17, -Lp, 34, Lp); ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI); ctx.fill();
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(-17, -len); c.lineTo(-17, 0); c.arc(0, 0, 17, Math.PI, 0, true); c.lineTo(17, -len); }, { width: 3 });
        ctx.strokeStyle = LQ.water.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-17, -Lp); ctx.lineTo(17, -Lp); ctx.stroke();
        ctx.restore();
        const top = { x: bx + Math.sin(th) * Lp, y: by - Math.cos(th) * Lp }, hv = Lp * Math.cos(th);
        ctx.strokeStyle = '#1c7ed6'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(bx - 70, top.y); ctx.moveTo(bx, by + 17); ctx.lineTo(bx - 70, by + 17); ctx.stroke(); ctx.setLineDash([]);
        D.arrow(ctx, bx - 60, by + 17, bx - 60, top.y, { color: '#1c7ed6', width: 1.8, head: 8 });
        D.text(ctx, 'h = ' + PS.fmt(hv / K, 1) + ' cm', bx - 66, (top.y + by) / 2, { size: F(13), weight: 800, color: '#1c7ed6', align: 'right' });
        D.text(ctx, '液柱长 20 cm', top.x + 20, top.y + 30, { size: F(12), color: '#495057' });
        D.text(ctx, '管底压强 p = ρgh = ' + PS.fmt(1000 * 10 * hv / K / 100, 0) + ' Pa', 980, 40, { size: F(14), weight: 800, color: '#e03131', align: 'right' });
        D.text(ctx, '试管倾斜，液柱长度不变，深度变小，管底压强变小', 980, 40 + F(14) * 1.5, { size: F(12), color: '#495057', align: 'right' });
      }
    }
    list(); ctl();
  });

  /* ================= 不同形状的容器；帕斯卡裂桶 ================= */
  PS.register('vessel-shapes', function (el) {
    const VW = 1000, VH = 500, K = 12, DEP = 5, W0 = 10, HC = 18; // 容器深（垂直纸面）5 cm，底宽 10 cm，高 18 cm
    const SH = [{ name: '柱形', w1: 10 }, { name: '口大底小', w1: 20 }, { name: '口小底大', w1: 4 }];
    const st = { k: 'shape', h: 12, cups: 0, burst: 0, pour: 0, hw: 0.5 };
    const seg = PS.ui.seg([{ value: 'shape', label: '液体对容器底的压力' }, { value: 'barrel', label: '帕斯卡裂桶实验' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sH = PS.ui.slider({ label: '水深 h', min: 2, max: 16, step: 1, value: st.h, unit: 'cm', onInput: (v) => { st.h = v; tell(); } });
    const cupB = PS.ui.button('🥛 向细管里倒一杯水（200 mL）', () => { if (st.burst || st.pour > 0) return; st.pour = 1; PS.sound.tick(); }, 'btn btn-primary btn-sm');
    const c1 = PS.ui.row(sH.el), c2 = PS.ui.row(cupB, PS.ui.button('↺ 重来', () => { st.cups = 0; st.burst = 0; st.pour = 0; st.hw = 0.5; tell(); }, 'btn btn-ghost btn-sm'));
    const msg = h('div', { class: 'fc-msg' });
    el.append(c1, c2, msg);
    function ctl() { c1.style.display = st.k === 'shape' ? '' : 'none'; c2.style.display = st.k === 'barrel' ? '' : 'none'; }
    const calc = (sh) => { const wh = W0 + ((sh.w1 - W0) * st.h) / HC, V = (DEP * st.h * (W0 + wh)) / 2, G = 1e3 * 10 * V * 1e-6, p = 1e3 * 10 * st.h / 100, Fb = p * W0 * DEP * 1e-4; return { G, p, Fb }; };
    function tell() {
      if (st.k === 'shape') {
        const p = 1e3 * 10 * st.h / 100;
        msg.className = 'fc-msg info';
        msg.innerHTML = '三个容器底面积相同（S = 50 cm²），水深相同，水对容器底的<b>压强相同</b>：p = ρgh = ' + PS.fmt(p, 0) + ' Pa，<b>压力也相同</b>：F = pS = ' + PS.fmt(p * 50e-4, 2) + ' N。但水的重力不同：只有<b>柱形</b>容器 F = G液；口大底小 F &lt; G液；口小底大 F &gt; G液。<br><span class="muted">计算液体对容器底的压力，先用 p = ρgh 求压强，再用 F = pS 求压力；容器对桌面的压力才等于液体和容器的总重力。</span>';
      } else {
        const p = 1e3 * 10 * st.hw;
        msg.className = 'fc-msg ' + (st.burst ? 'bad' : 'info');
        msg.innerHTML = st.burst ? '木桶被压裂了！细管很细，几杯水就能使水柱高达几米，桶底的压强 p = ρgh 变得很大。<b>液体的压强只与液体的密度和深度有关</b>，与液体的多少（重力）无关。' : '木桶装满水，上面插一根横截面积只有 1 cm² 的细管。桶底受到水的压强 p = ρgh = ' + PR.fmtPa(p) + '，桶底（0.2 m²）受到的压力 F = pS = ' + PR.fmtPa(p * 0.2, 'N') + '。' + (st.cups ? '已倒入 ' + st.cups + ' 杯水（共 ' + PS.fmt(st.cups * 0.2, 1) + ' kg）。' : '');
      }
      S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.k !== 'barrel') return;
      if (st.pour > 0) {
        st.pour = Math.max(0, st.pour - dt * 0.8);
        st.hw = 0.5 + (st.cups + 1 - st.pour) * 2;
        if (!st.burst && st.hw * 1e4 >= 6e4) { st.burst = 0.001; PS.sound.clack(); tell(); }
        if (st.pour === 0) { st.cups++; tell(); }
      }
      if (st.burst && st.burst < 1) st.burst = Math.min(1, st.burst + dt * 0.6);
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.k === 'shape') {
        const by = 290;
        SH.forEach((sh, i) => {
          const cx = 170 + i * 330, w0 = W0 * K, w1 = sh.w1 * K, H = HC * K, hp = st.h * K, wh = w0 + ((w1 - w0) * hp) / H;
          ctx.fillStyle = LQ.water.c; ctx.beginPath(); ctx.moveTo(cx - w0 / 2, by); ctx.lineTo(cx + w0 / 2, by); ctx.lineTo(cx + wh / 2, by - hp); ctx.lineTo(cx - wh / 2, by - hp); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = LQ.water.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - wh / 2, by - hp); ctx.lineTo(cx + wh / 2, by - hp); ctx.stroke();
          PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(cx - w1 / 2, by - H); c.lineTo(cx - w0 / 2, by); c.lineTo(cx + w0 / 2, by); c.lineTo(cx + w1 / 2, by - H); }, { width: 4 });
          // 侧壁受到的压力（垂直侧壁）及侧壁对水的反作用
          if (sh.w1 !== W0) { // 器壁对水的压力（垂直器壁指向水）：口大底小时斜向上托住一部分水，口小底大时斜向下压水
            const dx = (w1 - w0) / 2, len = Math.hypot(H, dx), nx = H / len, ny = dx / len;
            for (const s of [-1, 1]) for (let k = 1; k <= 2; k++) {
              const yy = by - (hp * k) / 3, xx = cx + s * (w0 / 2 + dx * ((by - yy) / H)), L = 12 + (yy - (by - hp)) * 0.3;
              D.arrow(ctx, xx, yy, xx - s * nx * L, yy - ny * L, { color: '#0c8599', width: 2, head: 6 });
            }
          }
          const r = calc(sh);
          D.text(ctx, sh.name, cx, by + F(14) * 1.2, { size: F(14), weight: 800, color: '#1b2333', align: 'center' });
          // 压力与重力的比较条
          const sc = 10;
          [[r.Fb, 'F底', '#e8590c'], [r.G, 'G水', '#7048e8']].forEach(([v, t, c], j) => {
            const yy = by + F(14) * 2.3 + j * F(12) * 1.6;
            D.text(ctx, t, cx - 100, yy + 8, { size: F(12), weight: 700, color: c, align: 'right' });
            ctx.fillStyle = c; ctx.fillRect(cx - 94, yy, v * sc, 16);
            D.text(ctx, PS.fmt(v, 2) + ' N', cx - 90 + v * sc, yy + 8, { size: F(11), color: '#495057' });
          });
          D.text(ctx, r.Fb > r.G + 0.005 ? 'F底 > G水' : r.Fb < r.G - 0.005 ? 'F底 < G水' : 'F底 = G水', cx, 40, { size: F(15), weight: 800, color: '#1b2333', align: 'center' });
        });
      } else {
        // 木桶 + 细管（主图），右侧小图表示真实高度
        const bx = 330, bw = 220, bt = 350, bb = 470;
        const crack = st.burst;
        ctx.fillStyle = '#e9d8bd'; ctx.fillRect(0, bb, 700, VH - bb);
        ctx.fillStyle = LQ.water.c; ctx.fillRect(bx - bw / 2 + 6, bt + 4, bw - 12, bb - bt - 8);
        for (let i = 0; i < 7; i++) {
          const x = bx - bw / 2 + (i * bw) / 7, off = crack ? (i - 3) * crack * 6 : 0;
          ctx.fillStyle = i % 2 ? '#b07a3e' : '#c48b4a'; ctx.fillRect(x + off, bt, bw / 7, bb - bt);
          ctx.strokeStyle = '#7a4f1d'; ctx.lineWidth = 1; ctx.strokeRect(x + off, bt, bw / 7, bb - bt);
        }
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 5; [bt + 18, bb - 18].forEach((y) => { ctx.beginPath(); ctx.moveTo(bx - bw / 2 - 4, y); ctx.lineTo(bx + bw / 2 + 4, y); ctx.stroke(); });
        if (crack) {
          ctx.strokeStyle = 'rgba(28,126,214,.7)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
          [[-1, 330], [1, 360], [-1, 380], [1, 320]].forEach(([s, y], i) => { const L = 60 + crack * 120 + i * 10; ctx.beginPath(); ctx.moveTo(bx + (s * bw) / 2, y); ctx.quadraticCurveTo(bx + s * (bw / 2 + L * 0.6), y - 10, bx + s * (bw / 2 + L), y + 50); ctx.stroke(); });
        }
        // 细管（主图只画出 2.5 m 以下的部分）
        const tx = bx, pxm = 120 / 0.5; // 主图比例：桶高 0.5 m = 120 px
        const yOf = (m) => bb - m * pxm;
        ctx.fillStyle = LQ.water.c2; const wtop = Math.max(0, yOf(st.hw)); if (st.hw > 0.5) ctx.fillRect(tx - 3, wtop, 6, bt - wtop);
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(tx - 5, 0); c.lineTo(tx - 5, bt); c.moveTo(tx + 5, 0); c.lineTo(tx + 5, bt); }, { width: 2 });
        if (st.hw > 1.7) D.text(ctx, '↑ 水柱高 ' + PS.fmt(st.hw, 1) + ' m，画不下了', tx + 14, 24, { size: F(13), weight: 800, color: '#1864ab', bg: 'rgba(255,255,255,.85)' });
        if (st.pour > 0) { ctx.fillStyle = 'rgba(77,171,247,.8)'; ctx.fillRect(tx - 2, 0, 4, 40); }
        // 读数
        const p = 1e4 * st.hw;
        D.text(ctx, '桶底的压强 p = ' + PR.fmtPa(p), 24, 34, { size: F(15), weight: 800, color: '#e03131' });
        D.text(ctx, '桶底的压力 F = ' + PR.fmtPa(p * 0.2, 'N'), 24, 34 + F(15) * 1.5, { size: F(14), weight: 700, color: '#e8590c' });
        D.text(ctx, '倒入的水：' + PS.fmt(st.cups * 0.2, 1) + ' kg', 24, 34 + F(15) * 3, { size: F(13), color: '#495057' });
        // 右侧：按比例的小图
        const ox = 760, gy = 470, s = 420 / 8;
        ctx.fillStyle = '#fff'; ctx.fillRect(700, 0, 300, VH);
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(ox + 60, gy - 7 * s, 120, 7 * s); ctx.strokeStyle = '#adb5bd'; ctx.strokeRect(ox + 60, gy - 7 * s, 120, 7 * s);
        for (let f = 1; f < 3; f++) { ctx.beginPath(); ctx.moveTo(ox + 60, gy - f * 3 * s); ctx.lineTo(ox + 180, gy - f * 3 * s); ctx.stroke(); }
        ctx.fillStyle = '#c48b4a'; ctx.fillRect(ox - 11, gy - 0.5 * s, 22, 0.5 * s);
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox, gy - 0.5 * s); ctx.lineTo(ox, gy - 7.6 * s); ctx.stroke();
        ctx.strokeStyle = LQ.water.c2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox, gy - 0.5 * s); ctx.lineTo(ox, gy - st.hw * s); ctx.stroke();
        for (let m = 0; m <= 8; m += 2) D.text(ctx, m + ' m', ox - 18, gy - m * s, { size: F(10), color: '#868e96', align: 'right' });
        D.text(ctx, '按比例', 870, 24, { size: F(12), weight: 700, color: '#495057', align: 'center' });
      }
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 压强计算随机练习（固体 + 液体） ================= */
  PS.register('p-quiz', function (el) {
    const box = h('div', { class: 'fc-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'Pa');
    const fb = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'fc-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), h('div', { class: 'small muted' }, 'g 取 10 N/kg；可以写成 1.5×10^4 或 15000。'), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, P = (x) => PS.pretty(x);
    const GEN = [
      () => { const G = pick([200, 500, 800, 1200]), Sa = pick([0.04, 0.05, 0.1, 0.2]); return { q: '重 ' + G + ' N 的箱子放在水平地面上，与地面的接触面积为 ' + Sa + ' m²，箱子对地面的压强是多少？', a: G / Sa, u: 'Pa', sol: 'F = G = ' + G + ' N，p = F/S = ' + G + ' N ÷ ' + Sa + ' m² = ' + P(G / Sa) + ' Pa。' }; },
      () => { const G = pick([450, 500, 600]), s1 = pick([150, 200, 250]), walk = Math.random() < 0.5; const Sa = (walk ? s1 : 2 * s1) * 1e-4; return { q: '质量为 ' + G / 10 + ' kg 的同学，每只鞋底与地面的接触面积为 ' + s1 + ' cm²。他' + (walk ? '在水平地面上行走' : '双脚站立在水平地面上') + '时，对地面的压强是多少？', a: G / Sa, u: 'Pa', sol: 'F = G = mg = ' + G + ' N；' + (walk ? '行走时一只脚着地' : '双脚站立') + '，S = ' + PS.round(Sa * 1e4, 0) + ' cm² = ' + P(Sa) + ' m²；p = F/S = ' + P(G / Sa) + ' Pa。' }; },
      () => { const m = pick([['铝', 2.7e3], ['铁', 7.9e3], ['铜', 8.9e3]]), hh = pick([0.1, 0.2, 0.3]); return { q: '用' + m[0] + '（ρ = ' + P(m[1]) + ' kg/m³）制成的实心圆柱体高 ' + hh + ' m，竖直放在水平桌面上，它对桌面的压强是多少？', a: m[1] * 10 * hh, u: 'Pa', sol: '均匀柱体放在水平面上：p = F/S = ρgV/S = ρgh = ' + P(m[1]) + ' kg/m³ × 10 N/kg × ' + hh + ' m = ' + P(m[1] * 10 * hh) + ' Pa（与底面积无关）。' }; },
      () => { const hh = pick([2, 5, 10, 20, 50, 100]); return { q: '潜水员潜到水下 ' + hh + ' m 深处，他受到水的压强是多少？', a: 1e4 * hh, u: 'Pa', sol: 'p = ρgh = 1.0×10³ kg/m³ × 10 N/kg × ' + hh + ' m = ' + P(1e4 * hh) + ' Pa。' }; },
      () => { const p = pick([5.5e4, 2e5, 3e5, 6e5]); return { q: '某种潜水服最多能承受 ' + P(p) + ' Pa 的压强，穿上它最多能潜入水中多深？（单位：m）', a: p / 1e4, u: 'm', sol: '由 p = ρgh 得 h = p/(ρg) = ' + P(p) + ' Pa ÷ (1.0×10³ kg/m³ × 10 N/kg) = ' + PS.round(p / 1e4, 2) + ' m。' }; },
      () => { const hh = pick([0.1, 0.15, 0.2, 0.3]), Sa = pick([0.01, 0.02, 0.05]); return { q: '容器中装有 ' + hh * 100 + ' cm 深的水，容器底面积为 ' + Sa + ' m²。水对容器底的压力是多少？（单位：N）', a: 1e4 * hh * Sa, u: 'N', sol: '先求压强：p = ρgh = 1.0×10³ × 10 × ' + hh + ' Pa = ' + P(1e4 * hh) + ' Pa；再求压力：F = pS = ' + P(1e4 * hh) + ' Pa × ' + Sa + ' m² = ' + PS.round(1e4 * hh * Sa, 2) + ' N。（不能直接用水的重力，除非容器是柱形的。）' }; },
      () => { const k = pick([['酒精', 0.8e3], ['煤油', 0.8e3], ['盐水', 1.2e3]]), hh = pick([0.1, 0.25, 0.5]); return { q: '容器中' + k[0] + '（ρ = ' + P(k[1]) + ' kg/m³）深 ' + hh * 100 + ' cm，容器底部受到' + k[0] + '的压强是多少？', a: k[1] * 10 * hh, u: 'Pa', sol: 'p = ρgh = ' + P(k[1]) + ' kg/m³ × 10 N/kg × ' + hh + ' m = ' + P(k[1] * 10 * hh) + ' Pa。（注意 cm 要换算成 m。）' }; },
      () => { const hh = pick([60, 100, 130]), dd = pick([10, 20, 30]); return { q: '拦河坝前的水深 ' + hh + ' m，坝底以上 ' + dd + ' m 处的坝体受到水的压强是多少？', a: 1e4 * (hh - dd), u: 'Pa', sol: '深度是从水面向下算的：h = ' + hh + ' m − ' + dd + ' m = ' + (hh - dd) + ' m，p = ρgh = ' + P(1e4 * (hh - dd)) + ' Pa。' }; },
    ];
    const parse = (s) => parseFloat(String(s).replace(/[，,\s]/g, '').replace(/[×xX*]10\^?([−-]?\d+)/, 'e$1').replace('−', '-'));
    function next() {
      Q = pick(GEN)();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      inp.value = ''; inp.disabled = false;
      fb.className = 'fc-msg'; fb.innerHTML = '固体：先求压力再用 p = F/S；液体：先用 p = ρgh 求压强。单位要统一成国际单位。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = parse(inp.value);
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.abs(Q.a) * 0.006;
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + P(Q.a) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });

  /* ================= 连通器 ================= */
  PS.register('connected-vessels', function (el) {
    const VW = 1000, VH = 440, PX = 500, PY = 360;
    // 四个形状不同的管（本地坐标）：path 画出管的内壁；A 为等效横截面积
    const QA = Math.asin(15 / 48), QY = 48 * Math.cos(QA); // 球形管：细管（宽 30）与球（半径 48）的交点
    const ARMS = [
      { name: '直管', A: 40, top: 70, path: (c) => { c.rect(180, 70, 40, 280); }, wall: (c) => { c.moveTo(180, 330); c.lineTo(180, 70); c.moveTo(220, 330); c.lineTo(220, 70); } },
      { name: '粗管', A: 120, top: 130, path: (c) => { c.rect(320, 130, 120, 220); }, wall: (c) => { c.moveTo(320, 330); c.lineTo(320, 130); c.moveTo(440, 330); c.lineTo(440, 130); } },
      { name: '斜管', A: 42, top: 80, path: (c) => { c.moveTo(560, 350); c.lineTo(596, 350); c.lineTo(696, 80); c.lineTo(660, 80); c.closePath(); }, wall: (c) => { c.moveTo(567.4, 330); c.lineTo(660, 80); c.moveTo(603.4, 330); c.lineTo(696, 80); } },
      { name: '球形管', A: 70, top: 90, path: (c) => { c.rect(782, 90, 30, 130); c.moveTo(845, 225); c.arc(797, 225, 48, 0, TAU); c.rect(782, 230, 30, 120); },
        wall: (c) => { c.moveTo(782, 90); c.lineTo(782, 225 - QY); c.arc(797, 225, 48, -Math.PI / 2 - QA, Math.PI / 2 + QA, true); c.lineTo(782, 330); c.moveTo(812, 90); c.lineTo(812, 225 - QY); c.arc(797, 225, 48, -Math.PI / 2 + QA, Math.PI / 2 - QA, false); c.lineTo(812, 330); } },
    ];
    const CHAN = (c) => { c.moveTo(170, 330); c.lineTo(170, 360); c.lineTo(830, 360); c.lineTo(830, 330); [[170, 180], [220, 320], [440, 567.4], [603.4, 782], [812, 830]].forEach(([a, b]) => { c.moveTo(a, 330); c.lineTo(b, 330); }); };
    const ASUM = ARMS.reduce((s, a) => s + a.A, 0);
    const st = { k: 'cv', Hc: 180, Ht: 180, o: [0, 0, 0, 0], v: [0, 0, 0, 0], tilt: 0, slice: true, oil: 0, oilT: 0, HL: 150, HI: 150 };
    const seg = PS.ui.seg([{ value: 'cv', label: '连通器' }, { value: 'oil', label: 'U 形管中装两种液体' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const addBs = h('div', { class: 'fc-chips' }, ARMS.map((a, i) => PS.ui.button('向' + a.name + '加水', () => pour(i), 'btn btn-sm')));
    const sT = PS.ui.slider({ label: '把底座垫斜', min: -12, max: 12, step: 1, value: 0, unit: '°', onInput: (v) => { st.tilt = v; tell(); } });
    const slT = PS.ui.toggle('显示液片 AB 受到的压力', st.slice, (v) => { st.slice = v; S.render(); });
    const c1 = h('div', null, addBs, PS.ui.row(sT.el, PS.ui.button('放掉一些水', () => { st.Ht = Math.max(60, st.Ht - 40); }, 'btn btn-ghost btn-sm'), slT.el));
    const c2 = PS.ui.row(PS.ui.button('向右管倒入煤油', () => { st.oilT = Math.min(200, st.oilT + 50); tell(); }, 'btn btn-accent btn-sm'), PS.ui.button('↺ 只有水', () => { st.oilT = 0; tell(); }, 'btn btn-ghost btn-sm'));
    const msg = h('div', { class: 'fc-msg' });
    el.append(c1, c2, msg);
    function ctl() { c1.style.display = st.k === 'cv' ? '' : 'none'; c2.style.display = st.k === 'oil' ? '' : 'none'; }
    function pour(i) {
      const dV = 40 * 40; // 每次加入的水（面积单位 px²）
      const lim = maxH();
      if (st.Ht + dV / ASUM > lim) { msg.className = 'fc-msg bad'; msg.innerHTML = '再加水就要从最低的管口溢出来了。'; return; }
      st.o[i] += dV / ARMS[i].A - dV / ASUM; for (let j = 0; j < 4; j++) if (j !== i) st.o[j] -= dV / ASUM;
      st.Hc += dV / ASUM; st.Ht += dV / ASUM; PS.sound.tick(); tell();
    }
    // 世界坐标：把本地点绕 (PX, PY) 旋转
    const rot = (x, y) => { const a = (st.tilt * Math.PI) / 180, dx = x - PX, dy = y - PY; return [PX + dx * Math.cos(a) - dy * Math.sin(a), PY + dx * Math.sin(a) + dy * Math.cos(a)]; };
    const topY = (a, i) => { const xs = i === 2 ? [660, 696] : i === 0 ? [180, 220] : i === 1 ? [320, 440] : [782, 812]; return Math.min(rot(xs[0], a.top)[1], rot(xs[1], a.top)[1]); };
    const maxH = () => PY - Math.max(...ARMS.map(topY)) - 8;
    function tell() {
      if (st.k === 'cv') {
        if (st.Ht > maxH()) st.Ht = st.Hc = maxH();
        const still = st.o.every((x) => Math.abs(x) < 1.5);
        msg.className = 'fc-msg ' + (still ? 'ok' : 'info');
        msg.innerHTML = still ? '<b>上端开口、下端连通</b>的容器叫连通器。连通器里装<b>同种液体</b>、液体<b>不流动</b>时，各部分的液面<b>总保持相平</b>——与管的形状、粗细、是否倾斜无关。' + (st.slice ? '<br>液片 AB 左右两侧受到的压强相等（p = ρgh，深度相同），所以液片静止，液体不流动。' : '') : '液面不相平时，液片 AB 两侧的压强不相等，液体从液面高的一侧流向低的一侧……';
      } else {
        msg.className = 'fc-msg info';
        msg.innerHTML = st.oilT ? 'U 形管里装了<b>两种不同的液体</b>：煤油的密度比水小，煤油柱比与它平衡的水柱更高，两边液面<b>不相平</b>。以油水分界面为准：ρ水gh水 = ρ油gh油。' : 'U 形管里只装水时，两管水面相平。向右管里倒入煤油（与水不相溶，密度 0.8×10³ kg/m³）。';
      }
      S.render();
    }
    let calm = 0;
    const loop = PS.loop((dt) => {
      if (st.k === 'cv') {
        const w2 = 22, z = 2 * 0.22 * Math.sqrt(w2);
        for (let i = 0; i < 4; i++) { st.v[i] += (-w2 * st.o[i] - z * st.v[i]) * dt; st.o[i] += st.v[i] * dt; }
        if (Math.abs(st.Ht - st.Hc) > 0.2) st.Hc += (st.Ht - st.Hc) * Math.min(1, dt * 2);
        const mov = st.o.some((x) => Math.abs(x) > 0.3) || Math.abs(st.Ht - st.Hc) > 0.2;
        if (mov) calm = 0; else calm += dt;
        if (calm < 0.5) { if (calm > 0.3) tell(); S.render(); }
      } else {
        const r = LQ.kerosene.rho / 1000;
        st.oil += (st.oilT - st.oil) * Math.min(1, dt * 3);
        st.HL = 150 + (st.oil * r) / 2; st.HI = 150 - (st.oil * r) / 2;
        S.render();
      }
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.k === 'cv') {
        const a = (st.tilt * Math.PI) / 180;
        // 底座和连通的横管
        ctx.save(); ctx.translate(PX, PY); ctx.rotate(a); ctx.translate(-PX, -PY);
        ctx.fillStyle = '#ced4da'; ctx.fillRect(140, 392, 720, 18);
        ctx.restore();
        const chan = (c) => { c.rect(170, 330, 660, 30); };
        // 水：横管全部充满；每个管在自己的路径内画到自己的液面
        const fillWithin = (pathFn, yW) => {
          ctx.save(); ctx.translate(PX, PY); ctx.rotate(a); ctx.translate(-PX, -PY);
          ctx.beginPath(); pathFn(ctx); ctx.restore(); ctx.save(); ctx.clip();
          ctx.fillStyle = LQ.water.c; ctx.fillRect(0, yW, VW, VH);
          ctx.strokeStyle = LQ.water.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, yW); ctx.lineTo(VW, yW); ctx.stroke();
          ctx.restore();
        };
        fillWithin(chan, 0);
        ARMS.forEach((A, i) => fillWithin(A.path, PY - (st.Hc + st.o[i])));
        ctx.save(); ctx.translate(PX, PY); ctx.rotate(a); ctx.translate(-PX, -PY);
        PR.glass(ctx, (c) => { c.beginPath(); CHAN(c); ARMS.forEach((A) => A.wall(c)); }, { width: 3 });
        // 支脚
        ctx.fillStyle = '#868e96'; [[200, 360], [800, 360]].forEach(([x, y]) => ctx.fillRect(x - 6, y, 12, 32));
        // 液片 AB
        if (st.slice) {
          const sx = 275, ys = 345;
          ctx.fillStyle = 'rgba(232,89,12,.55)'; ctx.fillRect(sx - 3, 332, 6, 26);
          D.text(ctx, 'A', sx, 326, { size: F(12), weight: 800, color: '#e8590c', align: 'center' });
          D.text(ctx, 'B', sx, 372, { size: F(12), weight: 800, color: '#e8590c', align: 'center' });
          const [, yw] = rot(sx, ys);
          const pL = (yw - (PY - (st.Hc + st.o[0]))) * 0.25, pR = (yw - (PY - (st.Hc + st.o[1]))) * 0.25;
          D.arrow(ctx, sx - 4 - pL, ys, sx - 4, ys, { color: '#1c7ed6', width: 2.6, head: 8 });
          D.arrow(ctx, sx + 4 + pR, ys, sx + 4, ys, { color: '#e03131', width: 2.6, head: 8 });
        }
        ctx.restore();
        // 共同液面的参考线
        const yL = PY - st.Hc;
        ctx.strokeStyle = 'rgba(28,126,214,.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(40, yL); ctx.lineTo(960, yL); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '水平线', 44, yL - 8, { size: F(11), color: '#1c7ed6' });
        ARMS.forEach((A, i) => { const xs = [200, 380, 680, 797][i]; const [x] = rot(xs, A.top); D.text(ctx, A.name, x, rot(xs, A.top)[1] - 14, { size: F(12), weight: 700, color: '#495057', align: 'center' }); });
      } else {
        const lx = 380, rx = 620, tw = 60, bot = 330, top = 40, r = (rx - lx) / 2;
        const yL = bot - st.HL, yI = bot - st.HI, yO = yI - st.oil;
        ctx.fillStyle = LQ.water.c;
        ctx.fillRect(lx - tw / 2, yL, tw, bot - yL); ctx.fillRect(rx - tw / 2, yI, tw, bot - yI);
        ctx.lineWidth = tw; ctx.strokeStyle = LQ.water.c; ctx.beginPath(); ctx.arc(500, bot, r, 0, Math.PI); ctx.stroke();
        if (st.oil > 0.5) { ctx.fillStyle = LQ.kerosene.c; ctx.fillRect(rx - tw / 2, yO, tw, st.oil); }
        PR.liquid(ctx, lx - tw / 2, yL, tw, 0, 'water');
        PR.liquid(ctx, rx - tw / 2, st.oil > 0.5 ? yO : yI, tw, 0, st.oil > 0.5 ? 'kerosene' : 'water');
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(lx - tw / 2, top); c.lineTo(lx - tw / 2, bot); c.arc(500, bot, r + tw / 2, Math.PI, 0, true); c.lineTo(rx + tw / 2, top); c.moveTo(lx + tw / 2, top); c.lineTo(lx + tw / 2, bot); c.arc(500, bot, r - tw / 2, Math.PI, 0, true); c.lineTo(rx - tw / 2, top); }, { width: 3 });
        if (st.oil > 2) {
          ctx.strokeStyle = '#495057'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(lx - 80, yI); ctx.lineTo(rx + 80, yI); ctx.moveTo(lx - 80, yL); ctx.lineTo(lx + tw / 2, yL); ctx.moveTo(rx - tw / 2, yO); ctx.lineTo(rx + 80, yO); ctx.stroke(); ctx.setLineDash([]);
          D.arrow(ctx, lx - 60, yI, lx - 60, yL, { color: '#1c7ed6', width: 1.6, head: 7 });
          D.text(ctx, 'h水 = ' + PS.fmt((st.HL - st.HI) / 10, 1) + ' cm', lx - 66, (yI + yL) / 2, { size: F(13), weight: 800, color: '#1c7ed6', align: 'right' });
          D.arrow(ctx, rx + 60, yI, rx + 60, yO, { color: '#e8590c', width: 1.6, head: 7 });
          D.text(ctx, 'h油 = ' + PS.fmt(st.oil / 10, 1) + ' cm', rx + 66, (yI + yO) / 2, { size: F(13), weight: 800, color: '#e8590c' });
          D.text(ctx, '油水分界面', rx + 84, yI + 4, { size: F(11), color: '#495057' });
          D.text(ctx, '两边液面相差 ' + PS.fmt((yL - yO) / 10, 1) + ' cm', 500, 24, { size: F(14), weight: 800, color: '#1b2333', align: 'center' });
        }
      }
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 连通器的应用 ================= */
  PS.register('vessel-apps', function (el) {
    const VW = 1000, VH = 420;
    const st = { k: 'pot', fill: 0.5, bad: false, boil: 0.6, flush: 0, trap: true, t: 0, cow: 0, tank: 0.7 };
    const seg = PS.ui.seg([{ value: 'pot', label: '☕ 茶壶' }, { value: 'boiler', label: '锅炉水位计' }, { value: 'trap', label: '下水管的“反水弯”' }, { value: 'cow', label: '🐄 自动喂水器' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sFill = PS.ui.slider({ label: '倒入的水', min: 0, max: 100, step: 5, value: 50, unit: '%', onInput: (v) => { st.fill = v / 100; tell(); } });
    const badT = PS.ui.toggle('壶嘴做得比壶口低', st.bad, (v) => { st.bad = v; tell(); });
    const sB = PS.ui.slider({ label: '锅炉内的水量', min: 10, max: 90, step: 5, value: 60, unit: '%', onInput: (v) => { st.boil = v / 100; tell(); } });
    const flB = PS.ui.button('🚿 放水冲一冲', () => { st.flush = 1; }, 'btn btn-primary btn-sm');
    const trT = PS.ui.toggle('有“反水弯”', st.trap, (v) => { st.trap = v; tell(); });
    const cowB = PS.ui.button('🐄 牛喝水', () => { st.cow = 1; }, 'btn btn-primary btn-sm');
    const cs = { pot: PS.ui.row(sFill.el, badT.el), boiler: PS.ui.row(sB.el), trap: PS.ui.row(flB, trT.el), cow: PS.ui.row(cowB) };
    const msg = h('div', { class: 'fc-msg' });
    Object.values(cs).forEach((c) => el.append(c));
    el.append(msg);
    function ctl() { Object.keys(cs).forEach((k) => (cs[k].style.display = k === st.k ? '' : 'none')); }
    const potLv = () => { const max = st.bad ? 0.62 : 0.95; return Math.min(st.fill, max); };
    function tell() {
      const T = {
        pot: st.bad && st.fill > 0.62 ? ['bad', '壶身和壶嘴构成<b>连通器</b>，水面总是相平。壶嘴太低，水面到达壶嘴口就从壶嘴流出来了——壶里装不满水！所以壶嘴要做得和壶口<b>一样高</b>。'] : ['info', '壶身和壶嘴上端开口、下端连通，构成<b>连通器</b>：壶嘴里的水面和壶身里的水面<b>总是相平</b>的。'],
        boiler: ['info', '锅炉外面的玻璃管（水位计）与锅炉上下连通，构成<b>连通器</b>，玻璃管中的水面与锅炉内的水面<b>相平</b>，从外面就能看到锅炉内的水位。'],
        trap: st.trap ? ['ok', 'U 形的“反水弯”是一个连通器，放水后弯管里<b>总会存一些水</b>，把下水道里的臭气、小虫挡在下面。'] : ['bad', '没有反水弯，下水道里的臭气会直接从管道冒上来。'],
        cow: ['info', '饮水槽和水箱下端连通，构成<b>连通器</b>，两边水面相平。牛喝水后水面下降，水箱中的浮球随之下降，打开进水阀补水；水面升高后浮球上升，关闭进水阀。'],
      }[st.k];
      msg.className = 'fc-msg ' + T[0]; msg.innerHTML = T[1];
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.flush > 0) st.flush = Math.max(0, st.flush - dt * 0.35);
      if (st.k === 'cow') {
        if (st.cow > 0) { st.cow = Math.max(0, st.cow - dt * 0.5); st.tank = Math.max(0.35, st.tank - dt * 0.12); }
        else if (st.tank < 0.7) st.tank = Math.min(0.7, st.tank + dt * 0.08);
      }
      if (st.k === 'trap' || st.k === 'cow' || st.k === 'boiler') S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const W = LQ.water;
      if (st.k === 'pot') {
        const bx0 = 380, bx1 = 620, by0 = 120, by1 = 360, H = by1 - by0;
        const spTop = st.bad ? by0 + H * 0.38 : by0 - 2;
        const lv = by1 - potLv() * H;
        // 壶身
        const body = (c) => { c.beginPath(); c.moveTo(bx0 + 20, by0); c.bezierCurveTo(bx0 - 50, by0 + 60, bx0 - 50, by1, bx0 + 30, by1); c.lineTo(bx1 - 30, by1); c.bezierCurveTo(bx1 + 50, by1, bx1 + 50, by0 + 60, bx1 - 20, by0); c.closePath(); };
        const spout = (c) => { c.beginPath(); c.moveTo(bx1 + 20, by1 - 70); c.lineTo(bx1 + 130, spTop + 8); c.lineTo(bx1 + 150, spTop); c.lineTo(bx1 + 30, by1 - 40); c.closePath(); };
        [body, spout].forEach((p) => { ctx.save(); p(ctx); ctx.clip(); ctx.fillStyle = W.c; ctx.fillRect(0, lv, VW, VH); ctx.strokeStyle = W.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, lv); ctx.lineTo(VW, lv); ctx.stroke(); ctx.restore(); });
        ctx.fillStyle = 'rgba(255,255,255,.0)';
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 4; body(ctx); ctx.stroke(); spout(ctx); ctx.stroke();
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(bx0 - 30, by0 + 110, 60, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
        ctx.fillStyle = '#868e96'; D.roundRect(ctx, 470, by0 - 22, 60, 16, 6); ctx.fill();
        ctx.strokeStyle = 'rgba(28,126,214,.5)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(250, lv); ctx.lineTo(850, lv); ctx.stroke(); ctx.setLineDash([]);
        if (st.bad && st.fill > 0.62) { ctx.strokeStyle = 'rgba(28,126,214,.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx1 + 150, spTop); ctx.quadraticCurveTo(bx1 + 175, spTop, bx1 + 180, 400); ctx.stroke(); D.text(ctx, '溢出', bx1 + 190, 300, { size: F(14), weight: 800, color: '#e03131' }); }
        D.text(ctx, '壶身和壶嘴中的水面相平', 500, 40, { size: F(15), weight: 800, color: '#1b2333', align: 'center' });
      } else if (st.k === 'boiler') {
        const x0 = 260, x1 = 620, y0 = 80, y1 = 330, lv = y1 - st.boil * (y1 - y0);
        ctx.fillStyle = W.c; ctx.fillRect(x0, lv, x1 - x0, y1 - lv);
        ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 12; i++) { const bx = x0 + 20 + ((i * 53) % (x1 - x0 - 40)), by = y1 - (((st.t * 60 + i * 37) % (y1 - lv - 4))); ctx.beginPath(); ctx.arc(bx, by, 4, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        // 火
        for (let i = 0; i < 7; i++) { const fx = x0 + 30 + i * 50, fh = 26 + 10 * Math.sin(st.t * 8 + i); ctx.fillStyle = '#ff922b'; ctx.beginPath(); ctx.moveTo(fx - 14, y1 + 50); ctx.quadraticCurveTo(fx, y1 + 50 - fh * 2, fx + 14, y1 + 50); ctx.fill(); }
        // 水位计
        const gx = 680;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x1, y0 + 30); ctx.lineTo(gx, y0 + 30); ctx.moveTo(x1, y1 - 20); ctx.lineTo(gx, y1 - 20); ctx.stroke();
        ctx.fillStyle = W.c; ctx.fillRect(gx - 10, lv, 20, y1 - 20 - lv); ctx.fillRect(x1, y1 - 24, gx - x1, 8);
        ctx.strokeStyle = W.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx - 10, lv); ctx.lineTo(gx + 10, lv); ctx.stroke();
        PR.glass(ctx, (c) => { c.beginPath(); c.moveTo(gx - 10, y0 + 20); c.lineTo(gx - 10, y1 - 10); c.moveTo(gx + 10, y0 + 20); c.lineTo(gx + 10, y1 - 10); });
        ctx.strokeStyle = 'rgba(28,126,214,.6)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x0, lv); ctx.lineTo(gx + 80, lv); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '水位计', gx + 24, y0 + 60, { size: F(14), weight: 800, color: '#1864ab' });
        D.text(ctx, '锅炉', 300, 60, { size: F(14), weight: 800, color: '#495057' });
      } else if (st.k === 'trap') {
        // 水池 → 竖管 → U 形弯（或直管）→ 下水道
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(300, 60, 280, 60); ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.strokeRect(300, 60, 280, 60);
        const px = 440, tw = 30;
        const pipe = st.trap
          ? (c) => { c.beginPath(); c.moveTo(px, 120); c.lineTo(px, 260); c.arc(px + 60, 260, 60, Math.PI, 0, true); c.lineTo(px + 120, 200); c.arc(px + 180, 200, 60, Math.PI, Math.PI * 1.5, false); c.lineTo(820, 140); }
          : (c) => { c.beginPath(); c.moveTo(px, 120); c.lineTo(px, 400); };
        // 存水（U 形弯底部，水面在出口的高度）
        if (st.trap) {
          const wl = 200 - (st.flush > 0 ? 0 : 0);
          ctx.save(); ctx.beginPath(); ctx.rect(0, wl, VW, VH); ctx.clip();
          ctx.strokeStyle = W.c2; ctx.globalAlpha = 0.55; ctx.lineWidth = tw - 6;
          ctx.beginPath(); ctx.moveTo(px, 200); ctx.lineTo(px, 260); ctx.arc(px + 60, 260, 60, Math.PI, 0, true); ctx.lineTo(px + 120, 200); ctx.stroke();
          ctx.restore();
        }
        if (st.flush > 0) { ctx.strokeStyle = 'rgba(77,171,247,.7)'; ctx.lineWidth = tw - 10; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -st.t * 120; pipe(ctx); ctx.stroke(); ctx.setLineDash([]); }
        ctx.strokeStyle = '#495057'; ctx.lineWidth = tw + 6; ctx.globalAlpha = 0.25; pipe(ctx); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2;
        // 下水道与臭气
        const sx = st.trap ? 820 : px;
        ctx.fillStyle = '#adb5bd'; ctx.fillRect(st.trap ? 800 : 380, st.trap ? 120 : 400, 140, 24);
        D.text(ctx, '下水道', st.trap ? 870 : 450, st.trap ? 170 : 380, { size: F(13), weight: 700, color: '#495057', align: 'center' });
        for (let i = 0; i < 8; i++) {
          const ph = (st.t * 0.25 + i / 8) % 1;
          let x, y, a = 1 - ph;
          if (st.trap) { x = 820 - ph * 160; y = 150 + Math.sin(i + st.t * 3) * 6; if (x < 680) a = 0; }
          else { x = px + Math.sin(i * 2 + st.t * 3) * 10; y = 400 - ph * 380; }
          ctx.fillStyle = 'rgba(102,168,15,' + (0.7 * a) + ')'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
        }
        if (st.trap) D.text(ctx, '存水挡住臭气', px + 60, 345, { size: F(14), weight: 800, color: '#1864ab', align: 'center' });
        else D.text(ctx, '臭气冒上来了！', 600, 90, { size: F(15), weight: 800, color: '#5c940d' });
      } else {
        // 自动喂水器：左边水箱（浮球阀），右边饮水槽
        const tx0 = 160, tx1 = 380, ty0 = 120, ty1 = 360, gx0 = 560, gx1 = 860, gy0 = 260;
        const lv = ty1 - st.tank * (ty1 - ty0) * 0.6 - 30;
        ctx.fillStyle = W.c; ctx.fillRect(tx0, lv, tx1 - tx0, ty1 - lv); ctx.fillRect(gx0, lv, gx1 - gx0, ty1 - lv); ctx.fillRect(tx1, ty1 - 24, gx0 - tx1, 18);
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx0, ty1); ctx.lineTo(tx1, ty1); ctx.lineTo(tx1, ty0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, ty1); ctx.lineTo(gx1, ty1); ctx.lineTo(gx1, gy0); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeRect(tx1, ty1 - 26, gx0 - tx1, 22);
        // 进水管与浮球阀
        const open = lv > ty1 - 0.7 * (ty1 - ty0) * 0.6 - 30 + 3;
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(60, 90); ctx.lineTo(250, 90); ctx.lineTo(250, 130); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(250, 130); ctx.lineTo(320, lv - 14); ctx.stroke();
        ctx.fillStyle = '#ff922b'; ctx.beginPath(); ctx.arc(320, lv - 6, 16, 0, TAU); ctx.fill();
        if (open) { ctx.strokeStyle = 'rgba(28,126,214,.7)'; ctx.lineWidth = 6; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -st.t * 80; ctx.beginPath(); ctx.moveTo(250, 136); ctx.lineTo(250, lv); ctx.stroke(); ctx.setLineDash([]); }
        D.text(ctx, open ? '进水阀打开' : '进水阀关闭', 262, 64, { size: F(13), weight: 700, color: open ? '#1c7ed6' : '#495057' });
        D.text(ctx, '浮球', 344, lv - 22, { size: F(12), weight: 700, color: '#e8590c' });
        D.text(ctx, '水箱', 200, ty1 + 26, { size: F(13), weight: 700, color: '#495057' });
        D.text(ctx, '饮水槽', 710, ty1 + 26, { size: F(13), weight: 700, color: '#495057', align: 'center' });
        ctx.font = '44px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.fillText('🐄', 920, gy0 - (st.cow > 0 ? 10 : 30));
        ctx.strokeStyle = 'rgba(28,126,214,.5)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(tx0, lv); ctx.lineTo(gx1, lv); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 是不是连通器 ================= */
  PS.register('vessel-sort', function (el) {
    PS.sortCards(el, [
      ['茶壶', 0, '壶身和壶嘴上端开口、下端连通'],
      ['船闸', 0, '闸室与上游或下游构成连通器'],
      ['锅炉水位计', 0, '水位计与锅炉上下连通'],
      ['洗手池下水管的 U 形“反水弯”', 0, 'U 形管两端开口、下端连通'],
      ['乳牛自动喂水器', 0, '水箱和饮水槽下端连通'],
      ['过路涵洞', 0, '道路两侧的水通过涵洞连通'],
      ['洒水壶', 0, '壶身和壶嘴构成连通器'],
      ['U 形管压强计（使用时）', 1, '一端连着密封的探头，不是两端都开口'],
      ['注射器', 1, '只有一个开口'],
      ['托里拆利实验的玻璃管和水银槽', 1, '玻璃管上端封闭'],
      ['拦河大坝', 1, '利用液体压强随深度增加而增大（上窄下宽），不是连通器'],
      ['液体温度计', 1, '玻璃泡和细管是封闭的'],
    ], ['是连通器', '不是连通器']);
  });
})();
