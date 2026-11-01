/* 第1节：长度的特殊测量方法 + 累积法实验 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const COPPER = ['#f4a35a', '#c8661c', '#8a3e0b'];

  function drawPencilSide(ctx, x0, x1, yc, th) {
    const g = ctx.createLinearGradient(0, yc - th / 2, 0, yc + th / 2);
    g.addColorStop(0, '#ffe066'); g.addColorStop(0.5, '#fab005'); g.addColorStop(1, '#d9480f');
    ctx.fillStyle = g;
    ctx.fillRect(x0, yc - th / 2, x1 - x0, th);
    ctx.strokeStyle = 'rgba(150,80,0,.3)';
    ctx.beginPath(); ctx.moveTo(x0, yc - th / 6); ctx.lineTo(x1, yc - th / 6); ctx.moveTo(x0, yc + th / 6); ctx.lineTo(x1, yc + th / 6); ctx.stroke();
  }
  function drawTurn(ctx, x, yc, th, dpx) {
    // 一圈铜丝（侧视看到的是一段竖直的“铜条”，带高光）
    const g = ctx.createLinearGradient(x, 0, x + dpx, 0);
    g.addColorStop(0, COPPER[2]); g.addColorStop(0.35, COPPER[0]); g.addColorStop(1, COPPER[1]);
    ctx.fillStyle = g;
    D.roundRect(ctx, x + 0.3, yc - th / 2 - dpx * 0.45, Math.max(1, dpx - 0.6), th + dpx * 0.9, Math.min(dpx / 2, 6));
    ctx.fill();
  }
  function drawCoin(ctx, cx, cy, r, ang, label) {
    ctx.save();
    ctx.translate(cx, cy);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fff3bf'); g.addColorStop(0.6, '#e9c46a'); g.addColorStop(1, '#b08423');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a07a1a'; ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(ang || 0);
    ctx.fillStyle = '#8a6514';
    ctx.font = PS.font(Math.round(r * 0.9), 900);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label || '1', 0, r * 0.04);
    ctx.restore();
  }
  function drawTriangle(ctx, xEdge, yBase, size, dir) {
    // 直角三角板：直角边竖直贴在 xEdge，dir=1 表示三角板在右侧，-1 在左侧
    ctx.save();
    ctx.fillStyle = 'rgba(165, 216, 255, 0.75)';
    ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xEdge, yBase);
    ctx.lineTo(xEdge, yBase - size);
    ctx.lineTo(xEdge + dir * size * 0.75, yBase);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xEdge + dir * size * 0.12, yBase - size * 0.2);
    ctx.lineTo(xEdge + dir * size * 0.12, yBase - size * 0.68);
    ctx.lineTo(xEdge + dir * size * 0.47, yBase - size * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#f8fafd'; ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* ================= 特殊测量方法演示 ================= */
  PS.register('special-methods', function (el) {
    const st = { mode: 'wire', p: 0, playing: false, n: 30, d: 0.5, sheets: 100, paper: 0.1, rolls: 2, coin: 25, label: '1' };
    const COINS = { 19: { name: '1 角', label: '1' }, 20.5: { name: '5 角', label: '5' }, 25: { name: '1 元', label: '1' } };
    const desc = h('div', { class: 'tip small' });
    const res = h('div', { class: 'readouts' });
    const S = PS.stage(el, { ratio: '1000 / 400', draw: paint });
    const loop = PS.loop((dt) => {
      const dur = { wire: Math.max(2.4, st.n * 0.09), paper: 3, roll: st.rolls * 1.8, clamp: 1.6 }[st.mode];
      st.p = Math.min(1, st.p + dt / dur);
      S.render();
      if (st.p >= 1) { loop.stop(); st.playing = false; showResult(); }
    }, S.stage);

    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      ({ wire: paintWire, paper: paintPaper, roll: paintRoll, clamp: paintClamp })[st.mode](ctx, w, hh);
    }

    function paintWire(ctx, w, hh) {
      const maxLenMm = 40 * 0.8;
      const mmPx = Math.min((w - 140) / (maxLenMm + 4), 26);
      const x0 = 70, yc = hh * 0.45, th = Math.min(hh * 0.16, 60);
      drawPencilSide(ctx, 20, w - 20, yc, th);
      const k = Math.floor(st.p * st.n + 1e-6);
      const dpx = st.d * mmPx;
      for (let i = 0; i < k; i++) drawTurn(ctx, x0 + i * dpx, yc, th, dpx);
      // 正在绕的那一圈（动画）
      if (k < st.n && st.playing) {
        const frac = st.p * st.n - k;
        ctx.globalAlpha = 0.5 + 0.5 * frac;
        drawTurn(ctx, x0 + k * dpx, yc, th * frac, dpx);
        ctx.globalAlpha = 1;
      }
      const ry = yc + th / 2 + dpx * 0.45 + 6;
      D.ruler(ctx, { x: x0, y: ry, len: Math.max(1, Math.floor((w - x0 - 40) / (mmPx * 10))), ppc: mmPx * 10, div: 'mm', side: 'top', h: 46 });
      D.text(ctx, '（放大图）', w - 20, 22, { align: 'right', size: 12, color: '#6b7487' });
      if (st.p >= 1) {
        const L = st.n * st.d;
        D.dim(ctx, x0, x0 + st.n * dpx, yc - th / 2 - dpx - 22, '线圈长度 L = ' + (L / 10).toFixed(2) + ' cm', { color: '#e8590c' });
      } else D.text(ctx, '已绕 ' + k + ' 圈', x0, yc - th / 2 - 30, { size: 14, weight: 700, color: '#c8661c' });
    }

    function paintPaper(ctx, w, hh) {
      const maxMm = 200 * 0.12 + 2;
      const mmPx = Math.min((hh - 90) / maxMm, 18);
      const baseY = hh - 34;
      const cx = w * 0.42, sw = Math.min(w * 0.36, 360);
      // 桌面
      ctx.fillStyle = '#e7d3b5'; ctx.fillRect(0, baseY, w, hh - baseY);
      const k = Math.floor(st.p * st.sheets + 1e-6);
      const tPx = st.paper * mmPx;
      for (let i = 0; i < k; i++) {
        const y = baseY - (i + 1) * tPx;
        ctx.fillStyle = i % 2 ? '#ffffff' : '#f1f3f5';
        ctx.fillRect(cx - sw / 2, y, sw, Math.max(tPx, 0.6));
      }
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1;
      if (k) ctx.strokeRect(cx - sw / 2, baseY - k * tPx, sw, k * tPx);
      // 正在落下的纸
      if (st.playing && k < st.sheets) {
        const frac = st.p * st.sheets - k;
        const y = PS.lerp(40, baseY - (k + 1) * tPx, frac);
        ctx.save(); ctx.translate(cx, y); ctx.rotate((1 - frac) * 0.15);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ced4da';
        ctx.fillRect(-sw / 2, -1, sw, 2); ctx.strokeRect(-sw / 2, -1, sw, 2);
        ctx.restore();
      }
      // 竖直刻度尺
      const rx = cx + sw / 2 + 8;
      const lenCm = Math.floor((baseY - 30) / (mmPx * 10) * 10) / 10;
      D.ruler(ctx, { x: rx, y: baseY, len: Math.max(1, Math.floor(lenCm)), ppc: mmPx * 10, div: 'mm', side: 'top', angle: -Math.PI / 2, h: 44, unitLabel: false });
      D.text(ctx, '（放大图）', w - 20, 22, { align: 'right', size: 12, color: '#6b7487' });
      D.text(ctx, '已叠放 ' + k + ' 张', cx, 26, { align: 'center', size: 14, weight: 700, color: '#495057' });
      if (st.p >= 1) {
        const L = st.sheets * st.paper;
        const yTop = baseY - k * tPx;
        ctx.strokeStyle = '#e8590c'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - sw / 2 - 10, yTop); ctx.lineTo(rx + 50, yTop); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '总厚度 L = ' + (L / 10).toFixed(2) + ' cm', cx - sw / 2 - 14, yTop - 4, { align: 'right', size: 14, weight: 700, color: '#e8590c' });
      }
    }

    function paintRoll(ctx, w, hh) {
      const dCm = st.coin / 10;
      const total = st.rolls * Math.PI * dCm;
      const ppc = Math.min((w - 120) / (total + dCm), 70);
      const r = (dCm / 2) * ppc;
      const x0 = 50 + r * 0.2, lineY = hh * 0.62;
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(20, lineY); ctx.lineTo(w - 20, lineY); ctx.stroke();
      const dist = st.p * total * ppc;
      const ang = dist / r;
      const cx = x0 + dist, cy = lineY - r;
      // 轨迹（硬币边缘上记号点的轨迹）
      ctx.strokeStyle = 'rgba(224,49,49,.5)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let s = 0; s <= dist; s += 2) {
        const a = s / r;
        const px = x0 + s - r * Math.sin(a), py = cy + r * Math.cos(a);
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // 起点终点标记
      ctx.fillStyle = '#e03131';
      ctx.fillRect(x0 - 1, lineY - 6, 2, 12);
      drawCoin(ctx, cx, cy, r, ang, st.label);
      // 记号点
      const mx = cx - r * Math.sin(ang), my = cy + r * Math.cos(ang);
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(mx, my, Math.max(3, r * 0.08), 0, Math.PI * 2); ctx.fill();
      D.ruler(ctx, { x: x0, y: lineY + 2, len: Math.ceil(total + 0.5), ppc, div: 'mm', side: 'top', h: 40 });
      const turns = Math.floor(st.p * st.rolls + 1e-6);
      D.text(ctx, '已滚动 ' + turns + ' 圈', 24, 30, { size: 14, weight: 700, color: '#495057' });
      if (st.p >= 1) {
        ctx.fillRect(x0 + total * ppc - 1, lineY - 6, 2, 12);
        D.dim(ctx, x0, x0 + total * ppc, lineY - 2 * r - 26, '滚过的路程 s = ' + total.toFixed(2) + ' cm', { color: '#e8590c' });
      }
    }

    function paintClamp(ctx, w, hh) {
      const dCm = st.coin / 10;
      const ppc = Math.min((w - 100) / 7, hh * 0.22);
      const x0 = Math.max(50, (w - 7 * ppc) / 2);
      const rulerY = hh * 0.74;
      const leftCm = 1.5;
      const r = (dCm / 2) * ppc;
      const cx = x0 + (leftCm + dCm / 2) * ppc;
      // 桌边/直尺
      D.ruler(ctx, { x: x0, y: rulerY, len: 6, ppc, div: 'mm', side: 'top', h: 48 });
      drawCoin(ctx, cx, rulerY - r, r, 0, st.label);
      const size = Math.min(hh * 0.55, 2.2 * r);
      const off = (1 - easeOut(st.p)) * w * 0.35;
      drawTriangle(ctx, cx - r - off, rulerY, size, -1);
      drawTriangle(ctx, cx + r + off, rulerY, size, 1);
      if (st.p >= 1) {
        ctx.strokeStyle = '#e8590c'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - r, rulerY - size); ctx.lineTo(cx - r, rulerY + 20); ctx.moveTo(cx + r, rulerY - size); ctx.lineTo(cx + r, rulerY + 20); ctx.stroke(); ctx.setLineDash([]);
        D.dim(ctx, cx - r, cx + r, rulerY - size - 16, '直径 D = ' + (leftCm + dCm).toFixed(2) + ' cm − ' + leftCm.toFixed(2) + ' cm = ' + dCm.toFixed(2) + ' cm', { color: '#e8590c' });
      }
    }
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    function showResult() {
      res.innerHTML = '';
      const R = (l, v, c) => res.append(PS.ui.readout(l, v, c).el);
      if (st.mode === 'wire') {
        const L = st.n * st.d;
        R('圈数 n', st.n); R('线圈长度 L', (L / 10).toFixed(2) + ' cm', 'accent'); R('铜丝直径 d = L / n', (L / st.n).toFixed(2) + ' mm', 'green');
      } else if (st.mode === 'paper') {
        const L = st.sheets * st.paper;
        R('纸的张数 n', st.sheets + ' 张'); R('总厚度 L', (L / 10).toFixed(2) + ' cm', 'accent'); R('一张纸厚 l = L / n', PS.round(L / st.sheets, 3) + ' mm', 'green');
      } else if (st.mode === 'roll') {
        const s = st.rolls * Math.PI * st.coin / 10;
        R('滚动圈数 n', st.rolls); R('路程 s', s.toFixed(2) + ' cm', 'accent'); R('直径 d = s / (nπ)', (s / (st.rolls * Math.PI)).toFixed(2) + ' cm', 'green');
      } else {
        R(COINS[st.coin].name + '硬币直径 D', (st.coin / 10).toFixed(2) + ' cm', 'green');
      }
    }

    const DESC = {
      wire: '<b>累积法（以多测少）测细铜丝直径：</b>把细铜丝在铅笔上<b>紧密排绕</b> n 圈，用刻度尺量出线圈长度 L，则铜丝直径 <b>d = L / n</b>。绕得不紧密（有间隙）会使测量结果偏大。',
      paper: '<b>累积法测一张纸的厚度：</b>一张纸太薄，刻度尺直接测不出。把 n 张纸<b>压紧</b>，量出总厚度 L，则一张纸的厚度 <b>l = L / n</b>。注意：书的“页数”是“张数”的 2 倍！',
      roll: '<b>化曲为直（滚轮法）：</b>在硬币边缘做一个记号，让它沿直线<b>无滑动</b>地滚动 n 圈，量出滚过的路程 s，则周长 = s / n，直径 <b>d = s / (nπ)</b>。红色虚线是记号点的运动轨迹。',
      clamp: '<b>平移法（卡尺法）：</b>用两块直角三角板把硬币夹在刻度尺上，三角板的直角边与刻度尺垂直，两条直角边之间的距离就是直径：<b>D = 右边读数 − 左边读数</b>。',
    };

    const ctlBox = h('div', { class: 'controls' });
    const play = PS.ui.button('▶ 播放演示', () => { st.p = 0; st.playing = true; res.innerHTML = ''; loop.start(); }, 'btn btn-primary');
    function buildControls() {
      ctlBox.innerHTML = '';
      ctlBox.append(play);
      if (st.mode === 'wire') {
        ctlBox.append(PS.ui.slider({ label: '绕的圈数', min: 10, max: 40, step: 1, value: st.n, unit: '圈', onInput: (v) => { st.n = v; reset(); } }).el);
        ctlBox.append(PS.ui.seg([{ value: 0.4, label: '细' }, { value: 0.5, label: '中' }, { value: 0.8, label: '粗' }], st.d, (v) => { st.d = v; reset(); }).el);
      } else if (st.mode === 'paper') {
        ctlBox.append(PS.ui.slider({ label: '纸的张数', min: 50, max: 200, step: 10, value: st.sheets, unit: '张', onInput: (v) => { st.sheets = v; reset(); } }).el);
        ctlBox.append(PS.ui.seg([{ value: 0.08, label: '薄纸' }, { value: 0.1, label: '普通纸' }, { value: 0.12, label: '厚纸' }], st.paper, (v) => { st.paper = v; reset(); }).el);
      } else if (st.mode === 'roll') {
        ctlBox.append(PS.ui.slider({ label: '滚动圈数', min: 1, max: 4, step: 1, value: st.rolls, unit: '圈', onInput: (v) => { st.rolls = v; reset(); } }).el);
        ctlBox.append(coinSeg().el);
      } else {
        ctlBox.append(coinSeg().el);
      }
    }
    function coinSeg() {
      return PS.ui.seg([{ value: 19, label: '1 角' }, { value: 20.5, label: '5 角' }, { value: 25, label: '1 元' }], st.coin, (v) => { st.coin = v; st.label = COINS[v].label; reset(); });
    }
    function reset() { loop.stop(); st.playing = false; st.p = 1; S.render(); showResult(); }
    const modeSeg = PS.ui.seg([
      { value: 'wire', label: '累积法 · 铜丝直径' },
      { value: 'paper', label: '累积法 · 纸的厚度' },
      { value: 'roll', label: '化曲为直 · 滚轮法' },
      { value: 'clamp', label: '平移法 · 卡尺法' },
    ], st.mode, (v) => { st.mode = v; desc.innerHTML = DESC[v]; buildControls(); reset(); });
    el.prepend(PS.ui.row(modeSeg.el));
    el.querySelector('.controls').classList.add('top');
    el.append(ctlBox, res, desc);
    desc.innerHTML = DESC[st.mode];
    buildControls();
    st.p = 1; showResult(); S.render();
  });

  /* ================= 实验：累积法测细铜丝直径 / 纸的厚度 ================= */
  PS.register('accumulate-lab', function (el) {
    const st = { mode: 'wire', d: PS.round(PS.rand(0.3, 0.75), 2), n: 0, loose: false, pages: 200, paper: PS.round(PS.rand(0.075, 0.11), 3), rows: [] };
    const wrap = h('div', { class: 'bench' });
    const left = h('div');
    const side = h('div', { class: 'bench-side' });
    wrap.append(left, side);
    el.append(wrap);
    const S = PS.stage(left, { ratio: '1000 / 440', draw: paint });
    const mag = PS.rulerTools.magnifier(S, () => paintScene);
    mag.zoom = 2.5;

    function paint(ctx, w, hh) { paintScene(ctx, w, hh); mag.paint(ctx, w, hh); }
    function paintScene(ctx, w, hh, inLens) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(-w, -hh, 3 * w, 3 * hh);
      if (st.mode === 'wire') {
        const mmPx = Math.min((w - 120) / 36, 24);
        const x0 = 60, yc = hh * 0.36, th = Math.min(hh * 0.14, 56);
        drawPencilSide(ctx, 14, w - 14, yc, th);
        const gap = st.loose ? 1.18 : 1;
        const dpx = st.d * mmPx;
        for (let i = 0; i < st.n; i++) drawTurn(ctx, x0 + i * dpx * gap, yc, th, dpx);
        const ry = yc + th / 2 + dpx * 0.45 + 6;
        D.ruler(ctx, { x: x0, y: ry, len: Math.floor((w - x0 - 30) / (mmPx * 10)), ppc: mmPx * 10, div: 'mm', side: 'top', h: 50 });
        if (!inLens) {
          D.text(ctx, '放大图 · 已绕 ' + st.n + ' 圈', 16, 24, { size: 13, weight: 700, color: '#495057' });
          D.text(ctx, '鼠标移到线圈末端可放大读数', w - 14, hh - 12, { align: 'right', size: 12, color: '#6b7487' });
        }
      } else {
        const sheets = st.pages / 2;
        const mmPx = Math.min((hh - 80) / 14, 26);
        const baseY = hh - 28;
        const cx = w * 0.4, sw = Math.min(w * 0.42, 380);
        ctx.fillStyle = '#e7d3b5'; ctx.fillRect(-w, baseY, 3 * w, hh);
        const T = sheets * st.paper * mmPx;
        // 书页侧面
        const g = ctx.createLinearGradient(0, baseY - T, 0, baseY);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e9ecef');
        ctx.fillStyle = g;
        ctx.fillRect(cx - sw / 2, baseY - T, sw, T);
        ctx.strokeStyle = 'rgba(0,0,0,.08)';
        for (let i = 1; i < sheets; i += Math.max(1, Math.round(sheets / 60))) {
          const y = baseY - i * st.paper * mmPx;
          ctx.beginPath(); ctx.moveTo(cx - sw / 2, y); ctx.lineTo(cx + sw / 2, y); ctx.stroke();
        }
        ctx.strokeStyle = '#adb5bd'; ctx.strokeRect(cx - sw / 2, baseY - T, sw, T);
        // 封面（不计入）
        ctx.fillStyle = '#4263eb';
        ctx.fillRect(cx - sw / 2 - 4, baseY - T - 4, sw + 4, 4);
        ctx.fillRect(cx - sw / 2 - 4, baseY, sw + 4, 0.01);
        D.text(ctx, '封面（不计入）', cx - sw / 2, baseY - T - 10, { size: 12, color: '#4263eb', weight: 700 });
        D.ruler(ctx, { x: cx + sw / 2 + 6, y: baseY, len: Math.floor((baseY - 20) / (mmPx * 10)), ppc: mmPx * 10, div: 'mm', side: 'top', angle: -Math.PI / 2, h: 46, unitLabel: false });
        if (!inLens) {
          D.text(ctx, '放大图 · 这本书的正文共 ' + st.pages + ' 页（侧面）', 16, 24, { size: 13, weight: 700, color: '#495057' });
          D.text(ctx, '用放大镜读出纸张的总厚度', w - 14, hh - 8, { align: 'right', size: 12, color: '#6b7487' });
        }
      }
    }

    function wind(k) {
      st.n = PS.clamp(st.n + k, 0, 40);
      PS.sound.tick();
      S.render();
    }

    const panelWire = h('div', { class: 'panel' }, h('h4', null, '① 在铅笔上密绕铜丝'),
      PS.ui.row(PS.ui.button('+1 圈', () => wind(1), 'btn btn-sm btn-primary'), PS.ui.button('+5 圈', () => wind(5), 'btn btn-sm btn-primary'), PS.ui.button('拆掉重绕', () => { st.n = 0; S.render(); }, 'btn btn-sm')),
      PS.ui.row(PS.ui.toggle('绕得不紧密（有间隙）', false, (v) => { st.loose = v; S.render(); }).el),
      PS.ui.row(PS.ui.button('换一根铜丝', () => { st.d = PS.round(PS.rand(0.3, 0.75), 2); st.n = 0; st.rows = []; renderTable(); S.render(); }, 'btn btn-sm btn-ghost')));
    const panelPaper = h('div', { class: 'panel', style: { display: 'none' } }, h('h4', null, '① 观察这本书'),
      h('p', { class: 'small', style: { margin: 0 } }, '正文共 ', h('b', { class: 'pagesTxt' }, st.pages), ' 页。想一想：一共有多少张纸？'),
      PS.ui.row(PS.ui.button('换一本书', () => { st.pages = PS.pick([120, 160, 200, 240]); st.paper = PS.round(PS.rand(0.075, 0.11), 3); panelPaper.querySelector('.pagesTxt').textContent = st.pages; st.rows = []; renderTable(); S.render(); }, 'btn btn-sm btn-ghost')));

    const inN = h('input', { type: 'text', class: 'num', inputmode: 'numeric' });
    const inL = h('input', { type: 'text', class: 'num', inputmode: 'decimal', placeholder: '如 1.25' });
    const fb = h('div', { class: 'feedback' });
    const labN = h('span', null, '圈数 n =');
    const unitN = h('span', null, '圈');
    const labL = h('span', null, '线圈长度 L =');
    const tbody = h('tbody');
    const thead = h('thead');
    const resBox = h('div', { class: 'small' });

    function record() {
      const n = parseInt(inN.value, 10);
      const L = parseFloat(inL.value);
      if (isNaN(n) || isNaN(L)) { show('bad', '请填写完整的数据。'); return; }
      let trueL, trueN;
      if (st.mode === 'wire') {
        trueN = st.n;
        if (st.n < 10) { show('bad', '圈数太少，测量误差大。至少绕 10 圈以上（建议 20~40 圈）。'); return; }
        trueL = ((st.n - 1) * (st.loose ? 1.18 : 1) + 1) * st.d / 10;
      } else {
        trueN = st.pages / 2;
        trueL = trueN * st.paper / 10;
      }
      if (n !== trueN) {
        show('bad', st.mode === 'wire' ? '圈数不对，数一数铅笔上绕了几圈。' : '✘ 注意：<b>1 张纸 = 2 页</b>！' + st.pages + ' 页一共是 <b>' + st.pages / 2 + '</b> 张纸。');
        inN.className = 'num bad'; PS.sound.bad(); return;
      }
      const j = PS.rulerTools.judgeReading(inL.value, trueL, 'mm');
      if (!j.ok) { inL.className = 'num bad'; show('bad', '✘ 长度读数：' + j.msg + (j.ref != null ? '（参考：约 ' + PS.fmt(j.ref, 2) + ' cm）' : '')); PS.sound.bad(); return; }
      inN.className = inL.className = 'num ok';
      const each = (L * 10) / n; // mm
      st.rows.push({ n, L, each, loose: st.loose && st.mode === 'wire' });
      PS.sound.good();
      show('ok', '✔ 已记录。' + (st.mode === 'wire' ? '铜丝直径 d = L / n = ' + PS.fmt(L * 10, 1) + ' mm ÷ ' + n + ' ≈ <b>' + PS.round(each, 3) + ' mm</b>' : '一张纸的厚度 l = L / n = ' + PS.fmt(L * 10, 1) + ' mm ÷ ' + n + ' ≈ <b>' + PS.round(each, 3) + ' mm</b>'));
      renderTable();
    }
    function show(t, m) { fb.className = 'feedback show ' + t; fb.innerHTML = m; }
    function renderTable() {
      const wire = st.mode === 'wire';
      thead.innerHTML = '';
      thead.append(h('tr', null, h('th', null, '次'), h('th', null, wire ? '圈数 n' : '张数 n'), h('th', null, 'L/cm'), h('th', null, wire ? 'd/mm' : 'l/mm')));
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, i + 1), h('td', null, r.n + (r.loose ? '*' : '')), h('td', null, PS.fmt(r.L, 2)), h('td', null, PS.round(r.each, 3)))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      const real = wire ? st.d : st.paper;
      resBox.innerHTML = st.rows.length
        ? '真实值：' + (wire ? '铜丝直径 ' : '一张纸厚 ') + '<b>' + real + ' mm</b>' + (st.rows.some((r) => r.loose) ? '<br><span class="hl-r">* 绕得不紧密时，测得的直径偏大。</span>' : '')
        : '';
    }
    function setMode(m) {
      st.mode = m;
      panelWire.style.display = m === 'wire' ? '' : 'none';
      panelPaper.style.display = m === 'paper' ? '' : 'none';
      labN.textContent = m === 'wire' ? '圈数 n =' : '张数 n =';
      unitN.textContent = m === 'wire' ? '圈' : '张';
      labL.textContent = m === 'wire' ? '线圈长度 L =' : '总厚度 L =';
      st.rows = []; inN.value = ''; inL.value = ''; inN.className = inL.className = 'num'; fb.className = 'feedback';
      renderTable(); S.render();
    }
    const modeSeg = PS.ui.seg([{ value: 'wire', label: '测细铜丝直径' }, { value: 'paper', label: '测一张纸的厚度' }], 'wire', setMode);
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '选择实验'), modeSeg.el),
      panelWire, panelPaper,
      h('div', { class: 'panel' }, h('h4', null, '② 读数并记录'),
        h('div', { class: 'row' }, labN, inN, unitN),
        h('div', { class: 'row' }, labL, inL, h('span', null, 'cm')),
        h('div', { class: 'kbd-hint' }, '刻度尺分度值 1 mm，以 cm 为单位保留 2 位小数。'),
        h('div', { class: 'row' }, PS.ui.button('记录并计算', record, 'btn btn-primary btn-sm')), fb),
      h('div', { class: 'panel' }, h('h4', null, '③ 数据表'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, thead, tbody)), resBox)
    );
    renderTable();
    st.n = 20;
    S.render();
  });
})();
