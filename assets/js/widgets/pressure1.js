/* 第9章第1节：压强——压力与重力、探究压力的作用效果、压强计算、砖块的三种放法、增大和减小压强。依赖 force.js、pressure.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, PR = PS.pr;
  const TAU = Math.PI * 2;

  /** 木块（中心 cx, cy，宽 w 高 hh，转角 ang） */
  function woodBlock(ctx, cx, cy, w, hh, ang, label) {
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(ang || 0);
    const g = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2); g.addColorStop(0, '#f1cf98'); g.addColorStop(1, '#d9a866');
    ctx.fillStyle = g; ctx.strokeStyle = '#a5753a'; ctx.lineWidth = 2;
    D.roundRect(ctx, -w / 2, -hh / 2, w, hh, 4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(140,90,30,.3)'; ctx.lineWidth = 1.2;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -hh / 2 + (i * hh) / 4); ctx.bezierCurveTo(-w / 6, -hh / 2 + (i * hh) / 4 + 4, w / 6, -hh / 2 + (i * hh) / 4 - 4, w / 2 - 6, -hh / 2 + (i * hh) / 4); ctx.stroke(); }
    if (label) { ctx.fillStyle = '#7a4f1d'; ctx.font = PS.font(15, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0); }
    ctx.restore();
  }
  /** 一只手（简笔，掌心朝 ang 方向推） */
  function palm(ctx, x, y, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#e8a87c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(-16, 0, 16, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(-70, -12, 56, 24); ctx.strokeRect(-70, -12, 56, 24);
    ctx.restore();
  }

  /* ================= 压力与重力 ================= */
  const PG = {
    floor: '放在水平桌面上', push: '用手向下按', lift: '用手向上提（没提起）', slope: '放在斜面上', wall: '用手压在竖直墙上', ceil: '用手按在天花板上',
  };
  PS.register('press-vs-gravity', function (el) {
    const VW = 1000, VH = 400, K = 8; // 每牛多少 px
    const st = { k: 'floor', G: 6, F: 4 };
    const seg = PS.ui.seg(Object.keys(PG).map((k) => ({ value: k, label: PG[k] })), st.k, (v) => { st.k = v; upd(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sG = PS.ui.slider({ label: '木块重 G', min: 2, max: 10, step: 1, value: st.G, unit: 'N', onInput: (v) => { st.G = v; upd(); } });
    const sF = PS.ui.slider({ label: '手的力 F', min: 0, max: 10, step: 1, value: st.F, unit: 'N', onInput: (v) => { st.F = v; upd(); } });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sG.el, sF.el), msg);
    function press() {
      const { G, F } = st;
      switch (st.k) {
        case 'floor': return G;
        case 'push': return G + F;
        case 'lift': return Math.max(0, G - F);
        case 'slope': return G * Math.cos(Math.PI / 6);
        case 'wall': return F;
        default: return Math.max(0, F - G);
      }
    }
    function upd() {
      sF.el.style.display = st.k === 'floor' || st.k === 'slope' ? 'none' : '';
      const P = press(), G = st.G, F = st.F;
      const T = {
        floor: ['ok', '物体静止在<b>水平面</b>上、只受重力和支持力时，压力的大小<b>等于</b>重力：F压 = G = ' + G + ' N。但压力和重力<b>不是同一个力</b>：压力作用在桌面上，重力作用在木块上。'],
        push: ['info', '手向下按木块，木块对桌面的压力变大：F压 = G + F = ' + G + ' N + ' + F + ' N = <b>' + P + ' N</b>，<b>大于</b>重力。'],
        lift: F >= G ? ['bad', '拉力不小于重力，木块被提起来了，对桌面<b>没有压力</b>。'] : ['info', '手向上提，木块对桌面的压力变小：F压 = G − F = ' + G + ' N − ' + F + ' N = <b>' + P + ' N</b>，<b>小于</b>重力。'],
        slope: ['info', '放在斜面上时，压力<b>垂直于斜面</b>指向斜面，大小约为 ' + PS.fmt(P, 1) + ' N，<b>小于</b>重力；重力仍然<b>竖直向下</b>。'],
        wall: ['info', '木块对墙的压力是<b>水平</b>的，大小等于手的压力 F压 = F = <b>' + F + ' N</b>，与重力<b>无关</b>（重力由墙对木块向上的摩擦力平衡）。'],
        ceil: F <= G ? ['bad', '手的力不大于木块的重力，按不住——木块会掉下来，对天花板没有压力。'] : ['info', '木块对天花板的压力竖直<b>向上</b>：F压 = F − G = ' + F + ' N − ' + G + ' N = <b>' + P + ' N</b>。'],
      }[st.k];
      msg.className = 'fc-msg ' + T[0]; msg.innerHTML = T[1];
      S.render();
    }
    function draw(ctx, w, hh) {
      const Fv = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const P = press(), G = st.G, F = st.F, k = st.k;
      const bw = 130, bh = 80;
      const surf = (x0, y0, x1, y1, side) => { // 支持面：斜线表示固定的物体
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy * side, ny = ux * side;
        ctx.lineWidth = 1.2;
        for (let s = 8; s < L; s += 16) { const px = x0 + ux * s, py = y0 + uy * s; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + nx * 12 - ux * 8, py + ny * 12 - uy * 8); ctx.stroke(); }
      };
      const lab = (t, x, y, c) => D.text(ctx, t, x, y, { size: Fv(13), weight: 700, color: c, align: 'center', bg: 'rgba(255,255,255,.85)' });
      if (k === 'floor' || k === 'push' || k === 'lift') {
        const gy = 230, cx = 470, cy = gy - bh / 2;
        surf(250, gy, 700, gy, 1);
        woodBlock(ctx, cx, cy, bw, bh);
        if (k === 'push') { palm(ctx, cx + 30, cy - bh / 2 - 16, Math.PI / 2); FO.arrow(ctx, cx + 30, cy - bh / 2, Math.PI / 2, F * K, { color: FC.T, label: 'F = ' + F + ' N', F: Fv, labelSide: -1 }); }
        if (k === 'lift') { const top = cy - bh / 2; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, 60); ctx.stroke(); palm(ctx, cx, 48, -Math.PI / 2); FO.arrow(ctx, cx + 2, top, -Math.PI / 2, F * K, { color: FC.T, label: 'F = ' + F + ' N', F: Fv, labelSide: 1 }); }
        FO.arrow(ctx, cx - 20, cy, Math.PI / 2, G * K, { color: FC.G, label: 'G = ' + G + ' N', F: Fv, labelSide: 1 });
        if (P > 0) FO.arrow(ctx, cx + 40, gy, Math.PI / 2, P * K, { color: FC.F, label: 'F压 = ' + PS.fmt(P, 0) + ' N', F: Fv, labelSide: -1 });
        lab('受力物体：桌面', cx + 190, gy + 40, FC.F);
      } else if (k === 'slope') {
        const a = Math.PI / 6, x0 = 230, y0 = 330, L = 520;
        const x1 = x0 + L * Math.cos(a), y1 = y0 - L * Math.sin(a);
        ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1, y0); ctx.closePath(); ctx.fill();
        surf(x0, y0, x1, y1, -1);
        const s = 280, px = x0 + s * Math.cos(a), py = y0 - s * Math.sin(a);
        const nx = Math.sin(-a), ny = -Math.cos(a); // 斜面外法线（画布坐标）
        const cx = px + nx * bh / 2, cy = py + ny * bh / 2;
        woodBlock(ctx, cx, cy, bw, bh, -a);
        FO.arrow(ctx, cx, cy, Math.PI / 2, G * K, { color: FC.G, label: 'G = ' + G + ' N（竖直向下）', F: Fv, labelSide: 1 });
        FO.arrow(ctx, px + Math.cos(a) * 30, py - Math.sin(a) * 30, Math.atan2(-ny, -nx), P * K, { color: FC.F, label: 'F压（垂直斜面）', F: Fv, labelSide: -1 });
      } else if (k === 'wall') {
        const wx = 640, cy = 200, cx = wx - bw / 2;
        surf(wx, 60, wx, 360, -1);
        woodBlock(ctx, cx, cy, bw, bh);
        palm(ctx, cx - bw / 2 - 16, cy, 0);
        if (F > 0) FO.arrow(ctx, cx - bw / 2, cy + 20, 0, F * K, { color: FC.T, label: 'F = ' + F + ' N', F: Fv, labelSide: 1 });
        FO.arrow(ctx, cx - 10, cy, Math.PI / 2, G * K, { color: FC.G, label: 'G = ' + G + ' N', F: Fv, labelSide: 1 });
        if (P > 0) FO.arrow(ctx, wx, cy - 14, 0, P * K, { color: FC.F, label: 'F压 = ' + P + ' N', F: Fv, labelSide: -1 });
        lab('受力物体：墙', wx + 70, cy + 60, FC.F);
      } else {
        const cy0 = 90, cx = 470, cy = cy0 + bh / 2;
        surf(250, cy0, 700, cy0, -1);
        const ok = F > G, dy = ok ? 0 : 60;
        woodBlock(ctx, cx, cy + dy, bw, bh);
        palm(ctx, cx + 30, cy + dy + bh / 2 + 16, -Math.PI / 2);
        if (F > 0) FO.arrow(ctx, cx + 30, cy + dy + bh / 2, -Math.PI / 2, F * K, { color: FC.T, label: 'F = ' + F + ' N', F: Fv, labelSide: -1 });
        FO.arrow(ctx, cx - 20, cy + dy, Math.PI / 2, G * K, { color: FC.G, label: 'G = ' + G + ' N', F: Fv, labelSide: 1 });
        if (ok) { FO.arrow(ctx, cx - 50, cy0, -Math.PI / 2, P * K, { color: FC.F, label: 'F压 = ' + P + ' N', F: Fv, labelSide: 1 }); }
      }
      D.text(ctx, PG[k], 20, 30, { size: Fv(16), weight: 800, color: '#1b2333' });
      D.text(ctx, 'F压 = ' + PS.fmt(P, k === 'slope' ? 1 : 0) + ' N    G = ' + G + ' N', 20, 30 + Fv(16) * 1.4, { size: Fv(14), weight: 700, color: P > G + 0.01 ? FC.F : P < G - 0.01 ? '#1c7ed6' : FC.ok });
      D.text(ctx, '压力：垂直作用在物体表面上的力', VW - 20, 30, { size: Fv(13), color: '#495057', align: 'right' });
    }
    upd();
  });

  /* ================= 探究影响压力作用效果的因素（小桌 + 海绵 + 砝码） ================= */
  PS.register('sponge-lab', function (el, opts) {
    const VW = 1000, VH = 430, GT = 2, GW = 5, SLEG = 4, STOP = 100; // 小桌重 2 N，砝码 5 N；四条桌腿共 4 cm²，桌面 100 cm²
    const st = { up: true, n: 1, mat: 'sponge', d: 0, rows: [] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const upSeg = PS.ui.seg([{ value: true, label: '小桌正放（桌腿着地）' }, { value: false, label: '小桌倒放（桌面着地）' }], st.up, (v) => { st.up = v; tell(); });
    const nSeg = PS.ui.seg([0, 1, 2].map((n) => ({ value: n, label: n ? n + ' 个砝码' : '不放砝码' })), st.n, (v) => { st.n = v; tell(); });
    const mSeg = PS.ui.seg([{ value: 'sponge', label: '海绵' }, { value: 'wood', label: '木板' }], st.mat, (v) => { st.mat = v; tell(); });
    upSeg.el.style.flexWrap = 'wrap';
    const msg = h('div', { class: 'fc-msg' });
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    el.append(
      h('div', { class: 'grid-2', style: { gap: '6px 14px', marginTop: '6px' } },
        h('div', null, h('div', { class: 'small muted' }, '小桌的放法（改变受力面积）'), upSeg.el),
        h('div', null, h('div', { class: 'small muted' }, '砝码（每个 500 g，改变压力）'), nSeg.el),
        h('div', null, h('div', { class: 'small muted' }, '被压的物体'), mSeg.el)),
      PS.ui.row(PS.ui.button('📝 记录这次实验', record, 'btn btn-green btn-sm'), PS.ui.button('清空记录', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')), msg,
      h('div', { class: 'grid-2', style: { marginTop: '10px', alignItems: 'start' } },
        h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次'), h('th', null, '受力面积'), h('th', null, '压力 F/N'), h('th', null, '被压物体'), h('th', null, '凹陷程度'))), tbody)),
        h('div', { class: 'panel' }, h('h4', null, opts.lab ? '分析论证' : '你发现了什么？'), ana)));
    const Fp = () => GT + GW * st.n;
    const Sa = () => (st.up ? SLEG : STOP);
    const target = () => (st.mat === 'wood' ? 0.4 : 46 * (1 - Math.exp(-(Fp() / (Sa() * 1e-4)) / 16000)));
    const level = (d) => (st.mat === 'wood' ? (d > 0.3 ? '几乎看不出' : '看不出') : d < 4 ? '不明显' : d < 16 ? '较明显' : d < 33 ? '明显' : '很明显');
    function tell() {
      msg.className = 'fc-msg';
      msg.innerHTML = '小桌重 2 N，每个砝码重 5 N，压力 F = <b>' + Fp() + ' N</b>；' + (st.up ? '四条桌腿着地，受力面积<b>小</b>（约 4 cm²）' : '桌面着地，受力面积<b>大</b>（约 100 cm²）') + '。' + (st.mat === 'wood' ? '木板很硬，几乎看不出形变——用什么物体能更明显地显示压力的作用效果？' : '观察海绵的<b>凹陷程度</b>（转换法）。');
    }
    function record() {
      const d = target();
      st.rows.push({ up: st.up, F: Fp(), mat: st.mat, lv: level(d), d });
      if (st.rows.length > 10) st.rows.shift();
      PS.sound.good(); table();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, String(i + 1)), h('td', null, r.up ? '小（桌腿）' : '大（桌面）'), h('td', null, String(r.F)), h('td', null, r.mat === 'wood' ? '木板' : '海绵'), h('td', null, h('b', null, r.lv)))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '还没有数据')));
      const R = st.rows.filter((r) => r.mat === 'sponge');
      let aF = null, aS = null;
      for (const a of R) for (const b of R) {
        if (a.up === b.up && a.F < b.F) aF = aF || [a, b];
        if (a.F === b.F && !a.up && b.up) aS = aS || [a, b];
      }
      const line = (ok, t) => '<div>' + (ok ? '✔ ' : '○ ') + t + (ok ? '' : '<span class="muted">（还缺对比数据）</span>') + '</div>';
      let s = '<div class="muted" style="margin-bottom:4px">每次只改变一个因素（<b>控制变量法</b>）；用海绵的凹陷程度显示压力的作用效果（<b>转换法</b>）。</div>';
      s += line(aF, '受力面积相同时，<b>压力越大</b>，压力的作用效果越明显' + (aF ? '（' + aF[0].F + ' N：' + aF[0].lv + '；' + aF[1].F + ' N：' + aF[1].lv + '）' : ''));
      s += line(aS, '压力相同时，<b>受力面积越小</b>，压力的作用效果越明显' + (aS ? '（' + aS[0].F + ' N，桌面着地：' + aS[0].lv + '；桌腿着地：' + aS[1].lv + '）' : ''));
      if (st.rows.some((r) => r.mat === 'wood')) s += '<div class="tip tip-warn" style="margin:6px 0 0">木板的形变太小，看不出差别，所以要用容易形变的<b>海绵</b>（也可以用沙子、橡皮泥）。</div>';
      if (aF && aS) s += '<div class="tip tip-good" style="margin:8px 0 0">压力的作用效果跟<b>压力的大小</b>和<b>受力面积</b>有关。压力和受力面积都不同时，怎样比较？——比较<b>单位面积</b>上受到的压力，也就是压力与受力面积之比：<b>压强</b>。</div>';
      ana.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      const t = target();
      if (Math.abs(st.d - t) > 0.05) { st.d += (t - st.d) * Math.min(1, dt * 5); S.render(); }
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const ty = 360, sy = 290, x0 = 300, x1 = 700, cx = 500, d = st.d;
      // 桌面
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(120, ty, 760, 22); ctx.strokeStyle = '#b08d57'; ctx.lineWidth = 1.5; ctx.strokeRect(120, ty, 760, 22);
      const legX = [cx - 72, cx + 72], legW = 12, plateW = 180, plateH = 14, legH = 86;
      let dent;
      if (st.up) dent = (x) => { let m = 0; legX.forEach((lx) => { const u = Math.abs(x - lx); m = Math.max(m, u < legW / 2 ? d : d * Math.exp(-((u - legW / 2) ** 2) / 90)); }); return m; };
      else dent = (x) => { const u = Math.abs(x - cx); return u < plateW / 2 ? d : d * Math.exp(-((u - plateW / 2) ** 2) / 220); };
      if (st.mat === 'sponge') PR.sponge(ctx, x0, x1, sy, ty - sy, dent);
      else { ctx.fillStyle = '#d9a866'; ctx.fillRect(x0, ty - 26, x1 - x0, 26); ctx.strokeStyle = '#a5753a'; ctx.strokeRect(x0, ty - 26, x1 - x0, 26); }
      const top = st.mat === 'sponge' ? sy + d : ty - 26 + Math.min(d, 0.4);
      // 小桌
      ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
      let wy;
      if (st.up) {
        legX.forEach((lx) => { ctx.fillRect(lx - legW / 2, top - legH, legW, legH); ctx.strokeRect(lx - legW / 2, top - legH, legW, legH); });
        ctx.fillStyle = '#adb5bd'; ctx.fillRect(cx - plateW / 2, top - legH - plateH, plateW, plateH); ctx.strokeRect(cx - plateW / 2, top - legH - plateH, plateW, plateH);
        wy = top - legH - plateH;
      } else {
        ctx.fillStyle = '#adb5bd'; ctx.fillRect(cx - plateW / 2, top - plateH, plateW, plateH); ctx.strokeRect(cx - plateW / 2, top - plateH, plateW, plateH);
        ctx.fillStyle = '#868e96';
        legX.forEach((lx) => { ctx.fillRect(lx - legW / 2, top - plateH - legH, legW, legH); ctx.strokeRect(lx - legW / 2, top - plateH - legH, legW, legH); });
        wy = top - plateH;
      }
      // 砝码（叠在桌面中央）
      for (let i = 0; i < st.n; i++) {
        const by = wy - i * 46;
        const g = ctx.createLinearGradient(cx - 30, 0, cx + 30, 0); g.addColorStop(0, '#c99a2e'); g.addColorStop(0.5, '#ffe08a'); g.addColorStop(1, '#b8860b');
        ctx.fillStyle = g; ctx.strokeStyle = '#8a6d1d';
        D.roundRect(ctx, cx - 30, by - 40, 60, 40, 5); ctx.fill(); ctx.stroke();
        ctx.fillRect(cx - 8, by - 46, 16, 7); ctx.strokeRect(cx - 8, by - 46, 16, 7);
        D.text(ctx, '500 g', cx, by - 20, { size: F(11), weight: 700, color: '#5c4310', align: 'center' });
      }
      // 读数
      const lv = level(st.d);
      D.text(ctx, '压力 F = ' + Fp() + ' N', 24, 32, { size: F(15), weight: 800, color: FC.F });
      D.text(ctx, '受力面积：' + (st.up ? '小（桌腿）' : '大（桌面）'), 24, 32 + F(15) * 1.4, { size: F(14), weight: 700, color: '#1c7ed6' });
      D.text(ctx, '凹陷程度：' + lv, VW - 24, 32, { size: F(16), weight: 800, color: st.d > 16 ? '#e03131' : st.d > 4 ? '#e8590c' : '#495057', align: 'right' });
      if (st.mat === 'sponge' && st.d > 4) {
        const lx = st.up ? legX[1] : cx + plateW / 2 - 10;
        ctx.strokeStyle = '#e03131'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(lx + 14, sy); ctx.lineTo(lx + 60, sy); ctx.moveTo(lx + 14, sy + st.d); ctx.lineTo(lx + 60, sy + st.d); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '凹陷', lx + 64, sy + st.d / 2, { size: F(12), weight: 700, color: '#e03131' });
      }
    }
    tell(); table(); loop.start();
  });

  /* ================= 压强公式计算器 ================= */
  const SU = { 'm²': 1, 'cm²': 1e-4, 'mm²': 1e-6 }, PU = { Pa: 1, kPa: 1e3, MPa: 1e6 };
  PS.register('p-calc', function (el) {
    const st = { mode: 'p' };
    const parse = (s) => parseFloat(String(s).replace(/\s/g, '').replace(/[×xX*]10\^?([−-]?\d+)/, 'e$1').replace('−', '-'));
    const inp = (v) => h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', value: v });
    const sel = (opts, v) => { const s = h('select'); Object.keys(opts).forEach((k) => s.append(h('option', { value: k, selected: k === v ? true : null }, k))); return s; };
    const iF = inp('600'), iS = inp('400'), uS = sel(SU, 'cm²'), iP = inp('1.5×10^4'), uP = sel(PU, 'Pa');
    const rF = h('div', { class: 'row' }, h('b', null, '压力 F ='), iF, h('span', null, 'N'));
    const rS = h('div', { class: 'row' }, h('b', null, '受力面积 S ='), iS, uS);
    const rP = h('div', { class: 'row' }, h('b', null, '压强 p ='), iP, uP);
    const out = h('div', { class: 'fc-msg info' });
    const seg = PS.ui.seg([{ value: 'p', label: '求压强 p' }, { value: 'F', label: '求压力 F' }, { value: 'S', label: '求受力面积 S' }], st.mode, (v) => { st.mode = v; show(); });
    const tri = h('div', { style: { display: 'grid', placeItems: 'center' } });
    const presets = [
      ['书放在水平桌面上', 'p', 3, 5e-2, 'm²'], ['人双脚站立（600 N，两只鞋底共 400 cm²）', 'p', 600, 400, 'cm²'],
      ['图钉尖（20 N，0.05 mm²）', 'p', 20, 0.05, 'mm²'], ['坦克（4×10⁵ N，履带共 4 m²）', 'p', 4e5, 4, 'm²'],
    ];
    el.append(PS.ui.row(seg.el),
      h('div', { class: 'fc-pair', style: { marginTop: '8px' } },
        h('div', { class: 'pr-calc' }, rF, rS, rP, PS.ui.row(PS.ui.button('计算', calc, 'btn btn-primary btn-sm')), out),
        tri),
      h('div', { class: 'small muted', style: { marginTop: '8px' } }, '例子：'), h('div', { class: 'fc-chips' }, presets.map((p) => PS.ui.button(p[0], () => { seg.set(p[1], true); st.mode = p[1]; iF.value = String(p[2]); iS.value = String(p[3]); uS.value = p[4]; show(); calc(); }, 'btn btn-sm'))));
    function show() {
      [rF, rS, rP].forEach((r) => (r.style.opacity = '1'));
      const hide = { p: rP, F: rF, S: rS }[st.mode]; hide.style.opacity = '.35';
      tri.innerHTML = '<svg viewBox="0 0 200 170" width="190"><path d="M100 10 L190 160 L10 160 Z" fill="#fff" stroke="#3b5bdb" stroke-width="3"/><line x1="45" y1="100" x2="155" y2="100" stroke="#3b5bdb" stroke-width="2"/><line x1="100" y1="100" x2="100" y2="160" stroke="#3b5bdb" stroke-width="2"/>'
        + '<text x="100" y="78" font-size="30" text-anchor="middle" font-style="italic" font-weight="700" fill="' + (st.mode === 'F' ? '#e8590c' : '#1b2333') + '">F</text>'
        + '<text x="66" y="142" font-size="28" text-anchor="middle" font-style="italic" font-weight="700" fill="' + (st.mode === 'p' ? '#e8590c' : '#1b2333') + '">p</text>'
        + '<text x="134" y="142" font-size="28" text-anchor="middle" font-style="italic" font-weight="700" fill="' + (st.mode === 'S' ? '#e8590c' : '#1b2333') + '">S</text></svg>'
        + '<div class="small" style="text-align:center">' + { p: 'p = F / S', F: 'F = pS', S: 'S = F / p' }[st.mode] + '<br><span class="muted">遮住要求的量，剩下的就是算法</span></div>';
      out.className = 'fc-msg info'; out.innerHTML = '填好已知量，点“计算”。注意先把面积换算成 <b>m²</b>：1 cm² = 10⁻⁴ m²，1 mm² = 10⁻⁶ m²。';
    }
    function calc() {
      const F = parse(iF.value), Sv = parse(iS.value), P = parse(iP.value);
      const Sm = Sv * SU[uS.value], Pp = P * PU[uP.value];
      const conv = uS.value === 'm²' ? '' : 'S = ' + PS.prettyText(Sv) + ' ' + uS.value + ' = ' + PS.pretty(Sm) + ' m²<br>';
      let s;
      if (st.mode === 'p') {
        if (!(F > 0 && Sm > 0)) return bad();
        s = conv + 'p = <span class="frac"><span>F</span><span>S</span></span> = <span class="frac"><span>' + PS.pretty(F) + ' N</span><span>' + PS.pretty(Sm) + ' m²</span></span> = <b>' + PS.pretty(F / Sm) + ' Pa</b>';
      } else if (st.mode === 'F') {
        if (!(Pp > 0 && Sm > 0)) return bad();
        s = conv + 'F = pS = ' + PS.pretty(Pp) + ' Pa × ' + PS.pretty(Sm) + ' m² = <b>' + PS.pretty(Pp * Sm) + ' N</b>';
      } else {
        if (!(F > 0 && Pp > 0)) return bad();
        const r = F / Pp;
        s = 'S = <span class="frac"><span>F</span><span>p</span></span> = <span class="frac"><span>' + PS.pretty(F) + ' N</span><span>' + PS.pretty(Pp) + ' Pa</span></span> = <b>' + PS.pretty(r) + ' m²</b>' + (r < 0.01 ? ' = ' + PS.pretty(r * 1e4) + ' cm²' : '');
      }
      out.className = 'fc-msg ok'; out.innerHTML = s;
    }
    function bad() { out.className = 'fc-msg bad'; out.innerHTML = '请输入正数（可以写成 1.5×10^4 或 15000）。'; }
    show();
  });

  /* ================= 砖块的三种放法与切割 ================= */
  PS.register('brick-pressure', function (el) {
    const VW = 1000, VH = 420, K = 10, RHO = 2e3, G = 20; // 20 cm × 10 cm × 5 cm，ρ = 2×10³ kg/m³
    const POSE = { flat: { name: '平放', a: 20, b: 10, c: 5 }, side: { name: '侧放', a: 20, b: 5, c: 10 }, up: { name: '竖放', a: 10, b: 5, c: 20 } };
    const st = { pose: 'flat', cut: 'none', d: 0, gone: 0 };
    const pSeg = PS.ui.seg(Object.keys(POSE).map((k) => ({ value: k, label: POSE[k].name })), st.pose, (v) => { st.pose = v; st.gone = 0; tell(); });
    const cSeg = PS.ui.seg([{ value: 'none', label: '不切' }, { value: 'v', label: '竖直切去一半' }, { value: 'h', label: '水平切去一半' }], st.cut, (v) => { st.cut = v; st.gone = 0; tell(); });
    cSeg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(pSeg.el, cSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg' });
    el.append(msg);
    function dims() {
      const P = POSE[st.pose]; let { a, b, c } = P;
      if (st.cut === 'v') a /= 2; if (st.cut === 'h') c /= 2;
      const F = RHO * 10 * (a * b * c * 1e-6), Sa = a * b; // cm²
      return { a, b, c, F, Sa, p: F / (Sa * 1e-4) };
    }
    function tell() {
      const d = dims();
      let s = POSE[st.pose].name + '：F = G = <b>' + PS.fmt(d.F, 0) + ' N</b>，S = ' + d.a + ' cm × ' + d.b + ' cm = <b>' + d.Sa + ' cm²</b>，p = F/S = <b>' + PS.fmt(d.p, 0) + ' Pa</b>。';
      if (st.cut === 'v') s += '<br>竖直切去一半：压力和受力面积<b>都减半</b>，压强<b>不变</b>。';
      if (st.cut === 'h') s += '<br>水平切去一半：压力减半，受力面积<b>不变</b>，压强<b>减半</b>。';
      s += '<br><span class="muted">柱体（粗细均匀）放在水平面上：p = F/S = ρgV/S = <b>ρgh</b> = 2×10³ kg/m³ × 10 N/kg × ' + PS.fmt(d.c / 100, 2) + ' m = ' + PS.fmt(RHO * 10 * d.c / 100, 0) + ' Pa——只与密度和高度有关。</span>';
      msg.className = 'fc-msg info'; msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      const t = 40 * (1 - Math.exp(-dims().p / 2500));
      let ch = false;
      if (Math.abs(st.d - t) > 0.05) { st.d += (t - st.d) * Math.min(1, dt * 5); ch = true; }
      if (st.cut !== 'none' && st.gone < 1) { st.gone = Math.min(1, st.gone + dt * 0.8); ch = true; }
      if (ch) S.render();
    }, el);
    function box(ctx, x, y, a, b, c, col, alpha) { // 左下前角 (x, y)，斜二测：深度向右上 45°，缩短一半
      const A = a * K, B = b * K * 0.5, C = c * K, ox = B * 0.71, oy = -B * 0.71;
      ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.strokeStyle = '#8f3b1e'; ctx.lineWidth = 1.6;
      ctx.fillStyle = col[0]; ctx.beginPath(); ctx.rect(x, y - C, A, C); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col[1]; ctx.beginPath(); ctx.moveTo(x, y - C); ctx.lineTo(x + ox, y - C + oy); ctx.lineTo(x + A + ox, y - C + oy); ctx.lineTo(x + A, y - C); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col[2]; ctx.beginPath(); ctx.moveTo(x + A, y); ctx.lineTo(x + A + ox, y + oy); ctx.lineTo(x + A + ox, y - C + oy); ctx.lineTo(x + A, y - C); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    const BR = ['#d9744a', '#ec9a6f', '#b85a35'];
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const sy = 300, x0 = 250, x1 = 750;
      const P = POSE[st.pose], d = dims();
      const bx = 500 - (P.a * K) / 2 - (P.b * K * 0.35) / 2;
      const fw = d.a * K;
      PR.sponge(ctx, x0, x1, sy, 80, (x) => { const u = x - bx; return u >= 0 && u <= fw ? st.d : u < 0 ? st.d * Math.exp(-(u * u) / 120) : st.d * Math.exp(-((u - fw) ** 2) / 120); });
      const by = sy + st.d;
      box(ctx, bx, by, d.a, d.b, d.c, BR);
      // 切去的部分（飘走、变淡）
      if (st.cut === 'v') box(ctx, bx + d.a * K + st.gone * 120, by - st.gone * 80, d.a, d.b, d.c, BR, 1 - st.gone * 0.7);
      if (st.cut === 'h') box(ctx, bx + st.gone * 160, by - d.c * K - st.gone * 70, d.a, d.b, d.c, BR, 1 - st.gone * 0.7);
      // 尺寸
      D.text(ctx, d.a + ' cm', bx + (d.a * K) / 2, by + 20, { size: F(12), weight: 700, color: '#8f3b1e', align: 'center', bg: 'rgba(255,255,255,.8)' });
      D.text(ctx, d.c + ' cm', bx - 8, by - (d.c * K) / 2, { size: F(12), weight: 700, color: '#8f3b1e', align: 'right' });
      // 读数
      const rows = [['压力 F', PS.fmt(d.F, 0) + ' N', FC.F], ['受力面积 S', d.Sa + ' cm²', '#1c7ed6'], ['压强 p', PS.fmt(d.p, 0) + ' Pa', '#e03131']];
      rows.forEach((r, i) => { D.text(ctx, r[0], 24, 34 + i * F(15) * 1.6, { size: F(14), color: '#495057' }); D.text(ctx, r[1], 140, 34 + i * F(15) * 1.6, { size: F(15), weight: 800, color: r[2] }); });
      D.text(ctx, '砖块：20 cm × 10 cm × 5 cm，重 20 N', VW - 24, 34, { size: F(13), color: '#495057', align: 'right' });
      // 三种放法的压强对比条
      const keys = ['flat', 'side', 'up'];
      keys.forEach((k, i) => {
        const Q = POSE[k], p = (G / (Q.a * Q.b * 1e-4));
        const y = 62 + i * 26, L = (p / 4000) * 180;
        D.text(ctx, '整块' + Q.name, 700, y + 9, { size: F(12), weight: k === st.pose ? 800 : 400, color: '#495057', align: 'right' });
        ctx.fillStyle = k === st.pose ? '#e03131' : '#ffc9c9'; ctx.fillRect(708, y, L, 16);
        D.text(ctx, PS.fmt(p, 0) + ' Pa', 712 + L, y + 9, { size: F(11), color: '#495057' });
      });
    }
    tell(); loop.start();
  });

  /* ================= 增大和减小压强：雪地、沙漠、图钉 ================= */
  PS.register('press-change', function (el) {
    const VW = 1000, VH = 420;
    const st = { k: 'snow', shoe: 'two', bag: false, d: 0, d2: 0, Ft: 20, flip: false };
    const seg = PS.ui.seg([{ value: 'snow', label: '❄️ 雪地上的人' }, { value: 'sand', label: '🐪 沙漠中的骆驼和马' }, { value: 'tack', label: '📌 按图钉' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const shoeSeg = PS.ui.seg([{ value: 'two', label: '双脚站立' }, { value: 'one', label: '单脚着地（行走时）' }, { value: 'ski', label: '穿上滑雪板' }], st.shoe, (v) => { st.shoe = v; tell(); });
    shoeSeg.el.style.flexWrap = 'wrap';
    const bagT = PS.ui.toggle('背上 200 N 的背包', st.bag, (v) => { st.bag = v; tell(); });
    const sFt = PS.ui.slider({ label: '手指的压力', min: 2, max: 30, step: 1, value: st.Ft, unit: 'N', onInput: (v) => { st.Ft = v; tell(); } });
    const flipT = PS.ui.toggle('把图钉倒过来按（别真这样做！）', st.flip, (v) => { st.flip = v; tell(); });
    const c1 = PS.ui.row(shoeSeg.el, bagT.el), c3 = PS.ui.row(sFt.el, flipT.el);
    const msg = h('div', { class: 'fc-msg' });
    el.append(c1, c3, msg);
    function ctl() { c1.style.display = st.k === 'snow' ? '' : 'none'; c3.style.display = st.k === 'tack' ? '' : 'none'; }
    function snowP() { const G = 600 + (st.bag ? 200 : 0), Sa = { two: 0.04, one: 0.02, ski: 0.32 }[st.shoe]; return { G, Sa, p: G / Sa }; }
    function tackP() { const S1 = 1e-4, S2 = 5e-8; return { p1: st.Ft / (st.flip ? S2 : S1), p2: st.Ft / (st.flip ? S1 : S2) }; }
    function tell() {
      let s, c = 'info';
      if (st.k === 'snow') {
        const { G, Sa, p } = snowP();
        s = '人重 ' + G + ' N，受力面积 ' + PS.fmt(Sa, 2) + ' m²，对雪地的压强 p = ' + PR.sci(p) + ' Pa。';
        if (st.shoe === 'ski') { s += '<br>滑雪板<b>增大了受力面积</b>，压强变得很小，人不会陷进雪里。'; c = 'ok'; }
        else if (st.shoe === 'one') s += '<br>走路时总是一只脚着地，压力不变、受力面积减半，压强<b>变为站立时的 2 倍</b>。';
        else s += '<br>雪很松软，压强较大时人就陷下去了。';
      } else if (st.k === 'sand') {
        s = '马重约 4000 N，四个马蹄共 0.04 m²，压强 <b>1×10⁵ Pa</b>；骆驼重约 6000 N（不到马的 2 倍），脚掌面积却是马蹄的 3 倍（0.12 m²），压强只有 <b>5×10⁴ Pa</b>。宽大的脚掌<b>增大受力面积、减小压强</b>，骆驼在沙漠里不易陷下去——“沙漠之舟”。';
        c = 'ok';
      } else {
        const { p1, p2 } = tackP();
        s = st.flip ? '倒过来按：钉尖对手指的压强达到 <b>' + PR.sci(p1) + ' Pa</b>——手指会被扎破！' : '手指对钉帽的压力和钉尖对木板的压力<b>大小相等</b>（都是 ' + st.Ft + ' N）。钉帽面积约 1 cm²，对手指的压强只有 ' + PR.sci(p1) + ' Pa；钉尖面积约 0.05 mm²，对木板的压强高达 <b>' + PR.sci(p2) + ' Pa</b>。';
        if (!st.flip) s += '<br>钉帽宽大：<b>增大受力面积、减小压强</b>（保护手指）；钉尖很尖：<b>减小受力面积、增大压强</b>（容易按进木板）。';
        c = st.flip ? 'bad' : 'ok';
      }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    const loop = PS.loop((dt) => {
      let t1 = 0, t2 = 0;
      if (st.k === 'snow') t1 = 70 * (1 - Math.exp(-snowP().p / 14000));
      else if (st.k === 'sand') { t1 = 50 * (1 - Math.exp(-1e5 / 6e4)); t2 = 50 * (1 - Math.exp(-5e4 / 6e4)); }
      else { const { p2 } = tackP(); t1 = st.flip ? 0 : Math.min(42, Math.max(0, (p2 - 4e7) / 1e7)); }
      st.d += (t1 - st.d) * Math.min(1, dt * 4); st.d2 += (t2 - st.d2) * Math.min(1, dt * 4);
      S.render();
    }, el);
    function beast(ctx, x, y, o) { // 简笔的马 / 骆驼（侧面，朝左），脚底 (x, y)；o.foot 脚掌宽度
      const k = o.big || 1, c = o.c;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
      ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = 10;
      [-58, -38, 38, 58].forEach((lx) => { ctx.beginPath(); ctx.moveTo(lx, -100); ctx.lineTo(lx, -4); ctx.stroke(); });
      ctx.fillStyle = '#3b2a1a'; [-58, -38, 38, 58].forEach((lx) => { D.roundRect(ctx, lx - o.foot / 2 - 2, -8, o.foot + 4, 8, 3); ctx.fill(); });
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -112, 80, 30, 0, 0, TAU); ctx.fill();
      if (o.hump) { ctx.beginPath(); ctx.ellipse(0, -140, 34, 26, 0, Math.PI, TAU); ctx.fill(); }
      ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-64, -120); ctx.lineTo(-92, o.hump ? -150 : -175); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-104, o.hump ? -152 : -180, 20, 11, -0.3, 0, TAU); ctx.fill();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(78, -112); ctx.quadraticCurveTo(96, -90, 90, -60); ctx.stroke();
      ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(-106, o.hump ? -156 : -184, 2.6, 0, TAU); ctx.fill();
      ctx.restore();
    }
    function person(ctx, x, y, o) { // 侧面站立的人，脚底 (x, y)
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 10;
      if (o.one) { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 2, y - 70); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 2, y - 70); ctx.lineTo(x + 26, y - 34); ctx.lineTo(x + 30, y - 22); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(x - 8, y - 6); ctx.lineTo(x - 2, y - 70); ctx.moveTo(x + 8, y - 6); ctx.lineTo(x + 2, y - 70); ctx.stroke(); }
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(x, y - 74); ctx.lineTo(x, y - 128); ctx.stroke();
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x, y - 120); ctx.lineTo(x + 18, y - 86); ctx.stroke();
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(x, y - 146, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.arc(x, y - 152, 15, Math.PI, TAU); ctx.fill();
      if (o.bag) { ctx.fillStyle = '#5c940d'; D.roundRect(ctx, x - 38, y - 130, 26, 48, 6); ctx.fill(); }
      ctx.fillStyle = '#343a40';
      if (o.one) { ctx.fillRect(x - 12, y - 8, 28, 9); } else { ctx.fillRect(x - 20, y - 8, 26, 9); ctx.fillRect(x - 4, y - 8, 26, 9); }
      ctx.restore();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      if (st.k === 'snow') {
        ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
        const sy = 280, x = 500, y = sy + st.d;
        if (st.shoe === 'ski') { ctx.fillStyle = '#e03131'; D.roundRect(ctx, x - 160, y - 2, 330, 10, 5); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 170, y + 3); ctx.quadraticCurveTo(x + 200, y + 2, x + 196, y - 18); ctx.lineTo(x + 186, y - 4); ctx.fill(); }
        person(ctx, x, y - (st.shoe === 'ski' ? 2 : 0), { one: st.shoe === 'one', bag: st.bag });
        // 雪（画在人前面，遮住陷进去的部分）
        ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.fillRect(0, sy, VW, VH - sy);
        ctx.strokeStyle = '#a5d8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(VW, sy); ctx.stroke();
        ctx.fillStyle = '#d0ebff'; for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc((i * 137) % VW, sy + 20 + ((i * 53) % 110), 3, 0, TAU); ctx.fill(); }
        const { G, p } = snowP();
        D.text(ctx, '压力 F = ' + G + ' N', 24, 34, { size: F(15), weight: 800, color: FC.F });
        D.text(ctx, '压强 p = ' + PR.fmtPa(p), 24, 34 + F(15) * 1.5, { size: F(16), weight: 800, color: '#e03131' });
        D.text(ctx, '陷入 ' + PS.fmt(st.d / 3.5, 0) + ' cm', VW - 24, 34, { size: F(15), weight: 800, color: '#1864ab', align: 'right' });
      } else if (st.k === 'sand') {
        ctx.fillStyle = '#fff4e6'; ctx.fillRect(0, 0, VW, VH);
        const sy = 300;
        beast(ctx, 300, sy + st.d, { c: '#8d5524', foot: 9, hump: 0 });
        beast(ctx, 700, sy + st.d2, { c: '#d9a35b', foot: 22, hump: 1, big: 1.15 });
        ctx.fillStyle = '#ffd8a8'; ctx.fillRect(0, sy, VW, VH - sy);
        ctx.fillStyle = '#f5c286'; for (let i = 0; i < 60; i++) { ctx.beginPath(); ctx.arc((i * 97) % VW, sy + 10 + ((i * 41) % 110), 2, 0, TAU); ctx.fill(); }
        D.text(ctx, '马：G ≈ 4000 N，S ≈ 0.04 m²', 300, 50, { size: F(14), weight: 700, color: '#495057', align: 'center' });
        D.text(ctx, 'p = 1×10⁵ Pa', 300, 50 + F(14) * 1.5, { size: F(16), weight: 800, color: '#e03131', align: 'center' });
        D.text(ctx, '骆驼：G ≈ 6000 N，S ≈ 0.12 m²', 700, 50, { size: F(14), weight: 700, color: '#495057', align: 'center' });
        D.text(ctx, 'p = 5×10⁴ Pa', 700, 50 + F(14) * 1.5, { size: F(16), weight: 800, color: '#2b8a3e', align: 'center' });
        D.text(ctx, '陷得更深', 300, sy + 60, { size: F(13), weight: 700, color: '#c92a2a', align: 'center' });
        D.text(ctx, '陷得浅', 700, sy + 60, { size: F(13), weight: 700, color: '#2b8a3e', align: 'center' });
      } else {
        ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
        const bx = 600; // 木板左表面
        ctx.fillStyle = '#e3bf86'; ctx.fillRect(bx, 40, 120, 340); ctx.strokeStyle = '#a5753a'; ctx.lineWidth = 2; ctx.strokeRect(bx, 40, 120, 340);
        ctx.strokeStyle = 'rgba(140,90,30,.3)'; for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 20, 40); ctx.bezierCurveTo(bx + i * 20 + 6, 150, bx + i * 20 - 6, 260, bx + i * 20, 380); ctx.stroke(); }
        const cy = 210, tipX = bx + st.d, flip = st.flip;
        // 图钉：钉帽 + 钉尖（钉尖朝右）
        const capX = flip ? bx - 70 : tipX - 70;
        ctx.save();
        if (flip) { ctx.translate(capX + 35, cy); ctx.scale(-1, 1); ctx.translate(-(capX + 35), -cy); }
        ctx.fillStyle = '#e03131'; ctx.strokeStyle = '#a61e1e'; ctx.lineWidth = 1.5;
        D.roundRect(ctx, capX, cy - 36, 16, 72, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#868e96';
        ctx.beginPath(); ctx.moveTo(capX + 16, cy - 4); ctx.lineTo(capX + 58, cy - 3); ctx.lineTo(capX + 70, cy); ctx.lineTo(capX + 58, cy + 3); ctx.lineTo(capX + 16, cy + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        // 手指
        const fx = capX;
        ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#e8a87c'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(fx - 30, cy, 30, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillRect(fx - 200, cy - 22, 170, 44);
        if (flip) { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(fx - 4, cy, 6, 0, TAU); ctx.fill(); D.text(ctx, '好痛！', fx - 60, cy - 50, { size: F(18), weight: 800, color: '#e03131', align: 'center' }); }
        FO.arrow(ctx, fx - 150, cy + 40, 0, 60, { color: FC.F, label: 'F = ' + st.Ft + ' N', F, labelSide: 1 });
        const { p1, p2 } = tackP();
        D.text(ctx, (flip ? '钉尖' : '钉帽') + '对手指的压强', 24, 34, { size: F(13), color: '#495057' });
        D.text(ctx, PR.fmtPa(p1), 24, 34 + F(13) * 1.5, { size: F(17), weight: 800, color: flip ? '#e03131' : '#2b8a3e' });
        D.text(ctx, (flip ? '钉帽' : '钉尖') + '对木板的压强', VW - 24, 34, { size: F(13), color: '#495057', align: 'right' });
        D.text(ctx, PR.fmtPa(p2), VW - 24, 34 + F(13) * 1.5, { size: F(17), weight: 800, color: flip ? '#495057' : '#e03131', align: 'right' });
      }
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 增大还是减小压强 ================= */
  PS.register('press-sort', function (el) {
    PS.sortCards(el, [
      ['🔪 菜刀钝了磨一磨，使刀刃锋利', 0, '减小受力面积'],
      ['📌 图钉的钉尖做得很尖', 0, '减小受力面积'],
      ['🚜 压路机的碾子质量很大', 0, '增大压力'],
      ['🐦 啄木鸟的喙又尖又长', 0, '减小受力面积'],
      ['💉 注射器的针头做得很尖', 0, '减小受力面积'],
      ['🔨 安全锤的锤头做成锥形', 0, '减小受力面积，容易敲碎车窗玻璃'],
      ['⚒️ 斧头的刃磨得很薄', 0, '减小受力面积'],
      ['🛤️ 铁轨铺在枕木上', 1, '增大受力面积'],
      ['🎿 滑雪时穿上宽大的滑雪板', 1, '增大受力面积'],
      ['🎒 书包的背带做得很宽', 1, '增大受力面积'],
      ['🚚 载重汽车装有很多车轮', 1, '增大受力面积'],
      ['🚛 严禁货车超载', 1, '减小压力'],
      ['🐪 骆驼有宽大的脚掌', 1, '增大受力面积'],
      ['🏠 房屋建在比墙更宽的地基上', 1, '增大受力面积'],
    ], ['增大压强', '减小压强']);
  });
})();
