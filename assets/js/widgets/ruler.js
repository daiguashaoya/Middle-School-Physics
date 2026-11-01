/* 第1节：刻度尺读数练习、视线误差演示、刻度尺测长度实验 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;

  /* ---------- 被测物体的绘制（俯视图） ---------- */
  function drawObject(ctx, type, x0, x1, yb, ppc) {
    const L = x1 - x0;
    ctx.save();
    if (type === 'pencil') {
      const th = Math.max(12, Math.min(26, ppc * 0.6));
      const yc = yb - th / 2;
      const tipLen = Math.min(L * 0.2, ppc * 1.7);
      const eraserLen = Math.min(L * 0.08, ppc * 0.7);
      const ferr = Math.min(L * 0.05, ppc * 0.4);
      ctx.fillStyle = '#f783ac';
      D.roundRect(ctx, x0, yc - th / 2, eraserLen + 3, th, Math.min(4, th / 3));
      ctx.fill();
      ctx.fillStyle = '#ced4da';
      ctx.fillRect(x0 + eraserLen, yc - th / 2, ferr, th);
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 0.8;
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x0 + eraserLen + ferr * i / 3, yc - th / 2); ctx.lineTo(x0 + eraserLen + ferr * i / 3, yc + th / 2); ctx.stroke(); }
      const bx = x0 + eraserLen + ferr, bw = L - eraserLen - ferr - tipLen;
      const g = ctx.createLinearGradient(0, yc - th / 2, 0, yc + th / 2);
      g.addColorStop(0, '#ffe066'); g.addColorStop(0.5, '#fcc419'); g.addColorStop(1, '#e8890c');
      ctx.fillStyle = g;
      ctx.fillRect(bx, yc - th / 2, bw, th);
      ctx.strokeStyle = 'rgba(160,90,0,.35)';
      ctx.beginPath(); ctx.moveTo(bx, yc - th / 6); ctx.lineTo(bx + bw, yc - th / 6); ctx.moveTo(bx, yc + th / 6); ctx.lineTo(bx + bw, yc + th / 6); ctx.stroke();
      ctx.fillStyle = '#f1d3a1';
      ctx.beginPath(); ctx.moveTo(bx + bw, yc - th / 2); ctx.lineTo(x1, yc); ctx.lineTo(bx + bw, yc + th / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#343a40';
      const k = 0.35;
      ctx.beginPath(); ctx.moveTo(x1 - tipLen * k, yc - th / 2 * k); ctx.lineTo(x1, yc); ctx.lineTo(x1 - tipLen * k, yc + th / 2 * k); ctx.closePath(); ctx.fill();
    } else if (type === 'eraser') {
      const th = Math.max(16, Math.min(40, ppc * 0.9));
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#adb5bd';
      D.roundRect(ctx, x0, yb - th, L, th, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#4c6ef5';
      ctx.fillRect(x0 + L * 0.22, yb - th, L * 0.56, th);
      ctx.fillStyle = '#fff';
      ctx.font = PS.font(Math.max(10, th * 0.38), 800);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('橡皮', x0 + L / 2, yb - th / 2);
    } else if (type === 'clip') {
      const th = Math.max(10, Math.min(18, ppc * 0.45));
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = Math.max(1.5, th * 0.14);
      const r = th / 2, y0 = yb - th;
      ctx.beginPath();
      ctx.moveTo(x0 + L * 0.75, y0 + th * 0.25);
      ctx.lineTo(x0 + r, y0 + th * 0.25);
      ctx.arc(x0 + r * 0.75 + 1, y0 + th * 0.5 + 0.5, th * 0.25, -Math.PI / 2, Math.PI / 2, true);
      ctx.lineTo(x1 - r, y0 + th * 0.75);
      ctx.arc(x1 - r * 0.5 - 1, y0 + th * 0.5, th * 0.25 + 0.5, Math.PI / 2, -Math.PI / 2, true);
      ctx.lineTo(x0 + L * 0.2, y0 + th * 0.25 + 0.5);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y0 + th * 0.5); ctx.lineTo(x0, y0 + th * 0.5); ctx.stroke();
    } else {
      // 木块
      const th = Math.max(18, Math.min(46, ppc * 1.0));
      const g = ctx.createLinearGradient(0, yb - th, 0, yb);
      g.addColorStop(0, '#e8b77a'); g.addColorStop(1, '#c98a43');
      ctx.fillStyle = g;
      ctx.fillRect(x0, yb - th, L, th);
      ctx.strokeStyle = 'rgba(110,60,10,.35)'; ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        const yy = yb - th + (th * i) / 5;
        ctx.moveTo(x0, yy);
        ctx.bezierCurveTo(x0 + L * 0.3, yy - 3, x0 + L * 0.6, yy + 3, x1, yy - 1);
        ctx.stroke();
      }
      ctx.strokeStyle = '#8c5a1f'; ctx.lineWidth = 1.2;
      ctx.strokeRect(x0, yb - th, L, th);
    }
    ctx.restore();
  }

  /* ---------- 放大镜 ---------- */
  function magnifier(S, getDraw) {
    const M = { x: 0, y: 0, on: false, enabled: true, touch: false, zoom: 3 };
    S.canvas.addEventListener('pointermove', (e) => { const p = S.pos(e); M.x = p.x; M.y = p.y; M.touch = e.pointerType === 'touch'; M.on = true; S.render(); });
    S.canvas.addEventListener('pointerdown', (e) => { const p = S.pos(e); M.x = p.x; M.y = p.y; M.touch = e.pointerType === 'touch'; M.on = true; S.render(); });
    S.canvas.addEventListener('pointerleave', () => { M.on = false; S.render(); });
    M.paint = function (ctx, w, h) {
      if (!M.on || !M.enabled) return;
      const r = Math.min(90, h * 0.36);
      const cx = M.x, cy = M.touch ? M.y - r - 16 : M.y;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = '#f8fafd'; ctx.fill();
      ctx.clip();
      ctx.translate(cx, cy); ctx.scale(M.zoom, M.zoom); ctx.translate(-M.x, -M.y);
      getDraw()(ctx, w, h, true);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 5; ctx.strokeStyle = '#495057'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + r * 0.7, cy + r * 0.7); ctx.lineTo(cx + r * 1.05, cy + r * 1.05);
      ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.strokeStyle = '#495057'; ctx.stroke();
      ctx.restore();
    };
    return M;
  }

  /* ---------- 判断读数 ---------- */
  function decimals(str) {
    const m = String(str).trim().match(/\.(\d+)$/);
    return m ? m[1].length : 0;
  }
  /** 返回 {ok, msg}；trueVal 为真实位置（cm），div 为 'mm'|'cm' */
  function judgeReading(raw, trueVal, div) {
    const need = div === 'mm' ? 2 : 1;
    const step = div === 'mm' ? 0.01 : 0.1;
    const v = parseFloat(String(raw).replace(/[，,\s]/g, ''));
    if (isNaN(v)) return { ok: false, msg: '请先填写读数。' };
    const ref = PS.round(trueVal, need);
    const d = decimals(raw);
    if (d !== need) {
      return {
        ok: false,
        msg: '读数要<b>估读到分度值的下一位</b>：分度值是 1 ' + div + '，以 cm 为单位时应保留 <b>' + need + ' 位小数</b>' +
          (Math.abs(v - trueVal) <= step * 1.6 ? '（你的数值很接近，注意位数）' : '') + '。',
      };
    }
    if (Math.abs(v - ref) <= step * 1.01 + 1e-9) return { ok: true, ref };
    return { ok: false, msg: '数值偏差较大，用放大镜仔细看看物体末端对准了哪条刻度线。', ref };
  }

  /* ================= 读数练习 ================= */
  PS.register('ruler-reading', function (el) {
    const st = { div: 'mm', worn: false, type: 'block', start: 0, len: 3.47, answered: false };
    const RL = 10; // 量程 cm
    let lay = {};
    const S = PS.stage(el, { ratio: '1000 / 280', draw: (ctx, w, hh) => { scene(ctx, w, hh); mag.paint(ctx, w, hh); } });
    const mag = magnifier(S, () => scene);

    function layout(w, hh) {
      const margin = 34;
      const ppc = (w - margin * 2 - 24) / RL;
      return { ppc, x0: margin + 8, y: hh * 0.56 };
    }
    function scene(ctx, w, hh, inLens) {
      lay = layout(w, hh);
      const { ppc, x0, y } = lay;
      ctx.fillStyle = '#f8fafd';
      ctx.fillRect(-w, -hh, w * 3, hh * 3);
      // 桌面纹理
      ctx.fillStyle = '#eef2f8';
      ctx.fillRect(0, y - ppc * 1.4, w, ppc * 1.4);
      const objX0 = x0 + st.start * ppc, objX1 = x0 + (st.start + st.len) * ppc;
      // 刻度尺（零刻度磨损时裁掉左段）
      ctx.save();
      if (st.worn) {
        const cut = x0 + (st.start - 0.55) * ppc;
        ctx.beginPath();
        ctx.moveTo(cut, y - 2);
        const hR = Math.max(34, ppc * 0.75) + 4;
        for (let i = 0; i <= 6; i++) ctx.lineTo(cut + (i % 2 ? 6 : -3), y + (hR * i) / 6);
        ctx.lineTo(w * 2, y + hR); ctx.lineTo(w * 2, y - 2); ctx.closePath();
        ctx.clip();
      }
      D.ruler(ctx, { x: x0, y, len: RL, ppc, div: st.div, side: 'top' });
      ctx.restore();
      drawObject(ctx, st.type, objX0, objX1, y - 0.5, ppc);
      if (!inLens && st.answered) {
        // 显示答案的标注
        D.dim(ctx, objX0, objX1, y - ppc * 1.25, '长度 ' + PS.fmt(st.len, st.div === 'mm' ? 2 : 1) + ' cm', { color: '#2b8a3e' });
      }
      if (!inLens) {
        ctx.font = PS.font(12, 500); ctx.fillStyle = '#6b7487'; ctx.textAlign = 'left';
        ctx.fillText(mag.enabled ? '把鼠标移到物体末端，用放大镜看清刻度' : '', 10, 18);
      }
    }

    function newProblem() {
      st.type = PS.pick(['block', 'pencil', 'eraser', 'block']);
      st.start = st.worn ? PS.randInt(1, 3) : 0;
      const maxLen = RL - st.start - 0.6;
      let len;
      if (Math.random() < 0.2) len = PS.round(PS.rand(1.5, maxLen), 1); // 末端正好在刻度线上 → 估读 0
      else len = PS.round(PS.rand(1.5, maxLen), 3);
      if (st.type === 'pencil' && len < 4) len += 3;
      st.len = Math.min(len, maxLen);
      st.answered = false;
      input.value = ''; input.className = 'num';
      fb.className = 'feedback'; fb.innerHTML = '';
      S.render();
    }

    const input = h('input', { type: 'text', class: 'num', placeholder: '如 3.47', inputmode: 'decimal' });
    const fb = h('div', { class: 'feedback' });
    function check() {
      const right = st.start + st.len;
      if (st.worn) {
        const r = judgeReading(input.value, st.len, st.div);
        finish(r, right);
      } else finish(judgeReading(input.value, st.len, st.div), right);
    }
    function finish(r, right) {
      const need = st.div === 'mm' ? 2 : 1;
      const ref = PS.fmt(st.len, need);
      if (r.ok) {
        input.className = 'num ok';
        const acc = st.div === 'mm' ? Math.floor(PS.round(st.len, 2) * 10 + 1e-6) / 10 : Math.floor(PS.round(st.len, 1) + 1e-6);
        const est = PS.round(PS.round(st.len, need) - acc, need);
        let msg = '✔ 读数正确！参考读数 <b>' + ref + ' cm</b>：其中 <b>' + PS.fmt(acc, need - 1) + ' cm</b> 是准确值，最后一位 <b>' + PS.fmt(est, need) + ' cm</b> 是估读值。';
        if (st.worn) msg += '<br>零刻度线磨损：长度 = 末端读数 ' + PS.fmt(right, need) + ' cm − 起点读数 ' + PS.fmt(st.start, need) + ' cm。';
        if (Math.abs(PS.round(st.len, need) - PS.round(st.len, need - 1)) < 1e-9) msg += '<br>末端恰好对准刻度线时，估读位要补 <b>0</b>。';
        fb.innerHTML = msg; fb.className = 'feedback show ok';
        PS.sound.good();
      } else {
        input.className = 'num bad';
        fb.innerHTML = '✘ ' + r.msg + (st.worn ? '<br>提示：这把尺零刻度线磨损了，物体左端对准的是 <b>' + st.start + ' cm</b> 刻度线，要用末端读数减去它。' : '') +
          '<br>参考读数：<b>' + ref + ' cm</b>（最后一位为估读，相差 1 也算对）。';
        fb.className = 'feedback show bad';
        PS.sound.bad();
      }
      st.answered = true;
      S.render();
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });

    const divSeg = PS.ui.seg([{ value: 'mm', label: '分度值 1 mm' }, { value: 'cm', label: '分度值 1 cm' }], 'mm', (v) => { st.div = v; input.placeholder = v === 'mm' ? '如 3.47' : '如 3.5'; newProblem(); });
    const worn = PS.ui.toggle('零刻度线磨损', false, (v) => { st.worn = v; newProblem(); });
    const magT = PS.ui.toggle('放大镜', true, (v) => { mag.enabled = v; S.render(); });
    el.append(
      PS.ui.row(divSeg.el, worn.el, magT.el),
      PS.ui.row(h('b', null, '物体长度 ='), input, h('span', null, 'cm'), PS.ui.button('检查', check, 'btn btn-primary'), PS.ui.button('换一个物体', newProblem, 'btn')),
      fb
    );
    newProblem();
  });

  /* ================= 视线误差（斜视）演示 ================= */
  PS.register('ruler-parallax', function (el) {
    const st = { ex: 0.78, ey: 0.12, d: 0.6, touch: false, dragging: false };
    const TRUE = 3.8; // 物体长度 cm
    let geo = null;
    const S = PS.stage(el, { ratio: '1000 / 460', draw: paint });
    const read = PS.ui.readout('看到的读数', '—', 'accent');
    const verdict = PS.ui.readout('判断', '—');

    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      const ppc = Math.min(w / 8.2, 120);
      const x0 = w * 0.5 - TRUE * ppc * 0.62;
      const tableY = hh * 0.86;
      const objH = Math.min(ppc * 0.45, 44);
      const objTop = tableY - objH;
      const d = (st.touch ? 0.02 : st.d) * ppc;
      const rulerTop = objTop - d;
      const xEnd = x0 + TRUE * ppc;
      const ex = st.ex * w, ey = st.ey * hh + 20;
      geo = { ex, ey, w, hh };
      // 桌子
      ctx.fillStyle = '#e7d3b5'; ctx.fillRect(0, tableY, w, hh - tableY);
      ctx.fillStyle = '#c9a77c'; ctx.fillRect(0, tableY, w, 3);
      // 物体
      const g = ctx.createLinearGradient(0, objTop, 0, tableY);
      g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#339af0');
      ctx.fillStyle = g; ctx.fillRect(x0, objTop, TRUE * ppc, objH);
      ctx.strokeStyle = '#1c7ed6'; ctx.strokeRect(x0, objTop, TRUE * ppc, objH);
      ctx.fillStyle = '#fff'; ctx.font = PS.font(13, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('被测物体', x0 + TRUE * ppc / 2, objTop + objH / 2);
      // 刻度尺（侧视，半透明）
      const rx0 = x0 - ppc * 0.4, rx1 = x0 + 6 * ppc;
      ctx.fillStyle = 'rgba(255, 230, 150, .55)';
      ctx.strokeStyle = 'rgba(140, 100, 20, .7)';
      ctx.fillRect(rx0, rulerTop, rx1 - rx0, Math.max(d, 2));
      ctx.strokeRect(rx0, rulerTop, rx1 - rx0, Math.max(d, 2));
      // 尺面刻度（画在尺子上表面）
      ctx.strokeStyle = '#2a2414'; ctx.fillStyle = '#2a2414';
      for (let i = 0; i <= 55; i++) {
        const x = x0 + (i / 10) * ppc;
        const tl = i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6;
        ctx.lineWidth = i % 10 === 0 ? 1.4 : 0.8;
        ctx.beginPath(); ctx.moveTo(x, rulerTop); ctx.lineTo(x, rulerTop - tl); ctx.stroke();
        if (i % 10 === 0) { ctx.font = PS.font(13, 700); ctx.textBaseline = 'bottom'; ctx.fillText(String(i / 10), x, rulerTop - 16); }
      }
      ctx.font = PS.font(11, 500); ctx.textAlign = 'left'; ctx.fillText('cm', x0 + 5.5 * ppc + 8, rulerTop - 16);
      // 视线与读数
      const t = (objTop - rulerTop) / (objTop - ey);
      const xr = xEnd + t * (ex - xEnd);
      const reading = (xr - x0) / ppc;
      ctx.setLineDash([6, 5]); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(xEnd, objTop); ctx.stroke();
      ctx.setLineDash([3, 4]); ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xEnd, objTop); ctx.lineTo(xEnd, rulerTop - 30); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(xr, rulerTop, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.arc(xEnd, objTop, 4, 0, Math.PI * 2); ctx.fill();
      D.text(ctx, '真实末端 ' + TRUE.toFixed(2) + ' cm', xEnd, rulerTop - 40, { align: 'center', size: 12, color: '#2b8a3e', weight: 700, bg: 'rgba(255,255,255,.85)' });
      // 眼睛
      drawEye(ctx, ex, ey, Math.atan2(objTop - ey, xEnd - ex));
      D.text(ctx, '拖动眼睛改变视线', ex, ey - 26, { align: 'center', size: 12, color: '#6b7487' });
      // 读数
      const diff = reading - TRUE;
      read.set(reading.toFixed(2) + ' cm');
      if (Math.abs(diff) < 0.015) verdict.set('<span style="color:#2b8a3e">✔ 读数正确</span>');
      else verdict.set(diff > 0 ? '<span style="color:#e03131">读数偏大</span>' : '<span style="color:#e03131">读数偏小</span>');
    }
    function drawEye(ctx, x, y, ang) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const ix = Math.cos(ang) * 8, iy = Math.sin(ang) * 5;
      ctx.fillStyle = '#5c7cfa'; ctx.beginPath(); ctx.arc(ix, iy, 6.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(ix, iy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    S.canvas.addEventListener('pointerdown', (e) => {
      const p = S.pos(e);
      if (geo && Math.hypot(p.x - geo.ex, p.y - geo.ey) < 40) { st.dragging = true; S.canvas.setPointerCapture(e.pointerId); }
    });
    S.canvas.addEventListener('pointermove', (e) => {
      if (!st.dragging || !geo) return;
      const p = S.pos(e);
      st.ex = PS.clamp(p.x / geo.w, 0.05, 0.95);
      st.ey = PS.clamp((p.y - 20) / geo.hh, 0.02, 0.42);
      S.render();
    });
    S.canvas.addEventListener('pointerup', () => { st.dragging = false; });
    const preset = (ex) => () => { st.ex = ex; st.ey = 0.1; S.render(); };
    const thick = PS.ui.slider({ label: '尺子厚度', min: 0.1, max: 1.2, step: 0.05, value: st.d, unit: 'cm（夸张）', fmt: (v) => v.toFixed(2), onInput: (v) => { st.d = v; S.render(); } });
    const touch = PS.ui.toggle('刻度线紧贴被测物体', false, (v) => { st.touch = v; thick.disable(v); S.render(); });
    // 计算正视时眼睛的水平位置：等于末端位置
    el.append(
      PS.ui.row(
        PS.ui.button('A 偏左斜视', preset(0.18), 'btn btn-sm'),
        PS.ui.button('B 正视', () => {
          const w = geo ? geo.w : 1000;
          const ppc = Math.min(w / 8.2, 120);
          st.ex = (w * 0.5 - TRUE * ppc * 0.62 + TRUE * ppc) / w; st.ey = 0.1; S.render();
        }, 'btn btn-sm btn-primary'),
        PS.ui.button('C 偏右斜视', preset(0.9), 'btn btn-sm'),
        thick.el, touch.el
      ),
      h('div', { class: 'readouts' }, read.el, verdict.el)
    );
  });

  /* ================= 实验：用刻度尺测量物体长度 ================= */
  const OBJS = {
    eraser: { name: '橡皮', min: 4.2, max: 6.4 },
    clip: { name: '回形针', min: 2.8, max: 3.6 },
    block: { name: '木块', min: 6.5, max: 9.5 },
    pencil: { name: '铅笔', min: 10.5, max: 13.2 },
  };
  PS.register('ruler-lab', function (el) {
    const RL = 15;
    const st = { obj: 'eraser', div: 'mm', len: 5, objStartCm: 1.3, rulerX: null, drag: null, rows: [], reveal: false };
    let lay = null;
    const wrap = h('div', { class: 'bench' });
    const left = h('div');
    const side = h('div', { class: 'bench-side' });
    wrap.append(left, side);
    el.append(wrap);

    const S = PS.stage(left, { ratio: '1000 / 380', draw: (ctx, w, hh) => { scene(ctx, w, hh); mag.paint(ctx, w, hh); } });
    const mag = magnifier(S, () => scene);
    mag.zoom = 3.5;

    function layout(w, hh) {
      const ppc = (w - 60) / (RL + 1.2);
      if (st.rulerX == null) st.rulerX = 30 + ppc * 0.6 + ppc * 2.2;
      return { ppc, objX0: 30 + st.objStartCm * ppc, y: hh * 0.55 };
    }
    function scene(ctx, w, hh, inLens) {
      lay = layout(w, hh);
      const { ppc, objX0, y } = lay;
      // 桌面
      ctx.fillStyle = '#efe3cf'; ctx.fillRect(-w, -hh, w * 3, hh * 3);
      ctx.strokeStyle = 'rgba(160,120,70,.12)'; ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(0, i * hh / 13); ctx.bezierCurveTo(w * 0.3, i * hh / 13 + 6, w * 0.6, i * hh / 13 - 6, w, i * hh / 13); ctx.stroke(); }
      drawObject(ctx, st.obj, objX0, objX0 + st.len * ppc, y - 0.5, ppc);
      D.ruler(ctx, { x: st.rulerX, y, len: RL, ppc, div: st.div, side: 'top', h: Math.max(40, ppc * 1.4), color: 'rgba(230, 245, 255, 0.95)' });
      if (!inLens) {
        ctx.font = PS.font(12, 500); ctx.fillStyle = '#7a6a55'; ctx.textAlign = 'left';
        ctx.fillText('左右拖动刻度尺 · 鼠标悬停处出现放大镜', 10, hh - 10);
      }
    }
    function onRuler(p) {
      if (!lay) return false;
      const hR = Math.max(40, lay.ppc * 1.4);
      return p.y > lay.y - 4 && p.y < lay.y + hR + 4 && p.x > st.rulerX - 20 && p.x < st.rulerX + (RL + 0.4) * lay.ppc;
    }
    S.canvas.addEventListener('pointerdown', (e) => {
      const p = S.pos(e);
      if (onRuler(p)) { st.drag = p.x - st.rulerX; S.canvas.setPointerCapture(e.pointerId); S.canvas.style.cursor = 'grabbing'; }
    });
    S.canvas.addEventListener('pointermove', (e) => {
      const p = S.pos(e);
      if (st.drag != null) {
        st.rulerX = PS.clamp(p.x - st.drag, -RL * lay.ppc * 0.5, S.w - 40);
        S.render();
      } else S.canvas.style.cursor = onRuler(p) ? 'grab' : 'crosshair';
    });
    S.canvas.addEventListener('pointerup', () => { st.drag = null; S.canvas.style.cursor = ''; });

    // ---- 侧栏 ----
    const objSel = PS.ui.seg(Object.keys(OBJS).map((k) => ({ value: k, label: OBJS[k].name })), st.obj, (v) => { st.obj = v; newObject(); });
    const divSel = PS.ui.seg([{ value: 'mm', label: '1 mm' }, { value: 'cm', label: '1 cm' }], 'mm', (v) => { st.div = v; st.rows = []; renderTable(); S.render(); hintDigits(); });
    const inL = h('input', { type: 'text', class: 'num', placeholder: '左端', inputmode: 'decimal' });
    const inR = h('input', { type: 'text', class: 'num', placeholder: '右端', inputmode: 'decimal' });
    const lenOut = h('b', { class: 'hl' }, '—');
    const fb = h('div', { class: 'feedback' });
    const digitHint = h('div', { class: 'kbd-hint' });
    function hintDigits() { digitHint.innerHTML = st.div === 'mm' ? '分度值 1 mm：以 cm 为单位记录，保留 2 位小数（最后一位估读）。' : '分度值 1 cm：以 cm 为单位记录，保留 1 位小数（最后一位估读）。'; }
    const updLen = () => {
      const a = parseFloat(inL.value), b = parseFloat(inR.value);
      lenOut.textContent = !isNaN(a) && !isNaN(b) ? PS.fmt(b - a, st.div === 'mm' ? 2 : 1) + ' cm' : '—';
    };
    inL.addEventListener('input', updLen); inR.addEventListener('input', updLen);
    const tbody = h('tbody');
    const avgBox = h('div', { class: 'small' });

    function record() {
      const need = st.div === 'mm' ? 2 : 1;
      const trueL = (lay.objX0 - st.rulerX) / lay.ppc;
      const trueR = trueL + st.len;
      if (trueL < -0.05 || trueR > RL + 0.05) { show('bad', '物体两端都要落在刻度尺的量程内，请先移动刻度尺。'); return; }
      const jL = judgeReading(inL.value, trueL, st.div);
      const jR = judgeReading(inR.value, trueR, st.div);
      if (!jL.ok || !jR.ok) {
        const which = !jL.ok ? '左端' : '右端';
        const r = !jL.ok ? jL : jR;
        show('bad', '✘ ' + which + '读数有问题：' + r.msg + (r.ref != null ? '<br>（参考：' + which + '约为 ' + PS.fmt(r.ref, need) + ' cm）' : ''));
        (!jL.ok ? inL : inR).className = 'num bad';
        PS.sound.bad();
        return;
      }
      inL.className = inR.className = 'num ok';
      const len = PS.round(parseFloat(inR.value) - parseFloat(inL.value), need);
      st.rows.push({ L: inL.value, R: inR.value, len });
      PS.sound.good();
      show('ok', '✔ 第 ' + st.rows.length + ' 次测量已记录。' + (st.rows.length < 3 ? '移动刻度尺换一个起点，再测一次吧！' : '已经可以求平均值了。'));
      inL.value = ''; inR.value = ''; updLen();
      setTimeout(() => { inL.className = inR.className = 'num'; }, 800);
      renderTable();
    }
    function show(type, msg) { fb.className = 'feedback show ' + type; fb.innerHTML = msg; }
    function renderTable() {
      const need = st.div === 'mm' ? 2 : 1;
      tbody.innerHTML = '';
      st.rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, i + 1), h('td', null, r.L), h('td', null, r.R), h('td', null, PS.fmt(r.len, need)))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      if (st.rows.length >= 2) {
        const avg = st.rows.reduce((s, r) => s + r.len, 0) / st.rows.length;
        avgBox.innerHTML = '平均值 = (' + st.rows.map((r) => PS.fmt(r.len, need)).join(' + ') + ') ÷ ' + st.rows.length +
          ' ≈ <b class="hl">' + PS.fmt(avg, need) + ' cm</b><br><span class="muted">平均值保留的小数位数与测量值相同。</span>' +
          (st.reveal ? '<br>真实长度：<b>' + PS.fmt(st.len, 3) + ' cm</b>，误差约 ' + PS.fmt(Math.abs(avg - st.len), 3) + ' cm' : '');
      } else avgBox.innerHTML = '<span class="muted">至少测量 2 次后显示平均值（建议 3 次）。</span>';
    }
    function newObject() {
      const o = OBJS[st.obj];
      st.len = PS.round(PS.rand(o.min, o.max), 3);
      st.objStartCm = PS.round(PS.rand(0.8, RL - o.max - 0.3), 2);
      st.rows = []; st.reveal = false;
      renderTable();
      fb.className = 'feedback';
      S.render();
    }
    const revealBtn = PS.ui.button('揭晓真实长度', () => { st.reveal = true; renderTable(); }, 'btn btn-sm btn-ghost');

    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择被测物体'), objSel.el, h('h4', { style: { marginTop: '10px' } }, '② 选择刻度尺的分度值'), divSel.el),
      h('div', { class: 'panel' }, h('h4', null, '③ 读数（单位：cm）'),
        h('div', { class: 'row' }, h('span', null, '左端对准'), inL, h('span', null, '右端对准'), inR),
        h('div', { class: 'row' }, h('span', null, '物体长度 ='), lenOut),
        digitHint,
        h('div', { class: 'row' }, PS.ui.button('记录本次数据', record, 'btn btn-primary btn-sm'), PS.ui.button('零刻度对齐', () => { st.rulerX = lay.objX0; S.render(); }, 'btn btn-sm')),
        fb),
      h('div', { class: 'panel' }, h('h4', null, '④ 数据记录与处理'),
        h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次数'), h('th', null, '左端/cm'), h('th', null, '右端/cm'), h('th', null, '长度/cm'))), tbody)),
        avgBox, revealBtn)
    );
    hintDigits();
    newObject();
  });

  /* ================= 认识刻度尺（三观察） ================= */
  PS.register('ruler-anatomy', function (el) {
    let hl = 'all';
    const S = PS.stage(el, { ratio: '1000 / 300', draw: (ctx, w, hh) => {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      const RL = 10, ppc = (w - 140) / RL, x0 = 60, y = hh * 0.42;
      D.ruler(ctx, { x: x0, y, len: RL, ppc, div: 'mm', side: 'top', h: Math.max(50, ppc * 0.8) });
      const on = (k) => hl === 'all' || hl === k;
      ctx.globalAlpha = on('zero') ? 1 : 0.18;
      D.arrow(ctx, x0 - 30, y - 70, x0, y - 4, { color: '#e03131', width: 2 });
      D.text(ctx, '零刻度线', x0 - 34, y - 76, { size: 14, weight: 800, color: '#e03131' });
      ctx.globalAlpha = on('range') ? 1 : 0.18;
      ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y - 20); ctx.lineTo(x0, y - 34); ctx.lineTo(x0 + RL * ppc, y - 34); ctx.lineTo(x0 + RL * ppc, y - 20); ctx.stroke();
      D.text(ctx, '量程：0 ~ 10 cm（一次能测的最大长度）', x0 + RL * ppc / 2, y - 42, { align: 'center', size: 14, weight: 800, color: '#3b5bdb' });
      ctx.globalAlpha = on('div') ? 1 : 0.18;
      const zx = x0 + 6.3 * ppc, zy = y + ppc * 0.8 + 50;
      ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0 + 6.0 * ppc - 2, y - 2, ppc * 0.6 + 4, ppc * 0.3);
      D.arrow(ctx, zx, y + ppc * 0.32, zx, zy - 22, { color: '#2b8a3e', width: 1.5 });
      D.text(ctx, '分度值：1 mm（相邻两刻度线之间的长度，决定精确程度）', zx, zy, { align: 'center', size: 14, weight: 800, color: '#2b8a3e' });
      ctx.globalAlpha = on('unit') ? 1 : 0.18;
      D.arrow(ctx, x0 + RL * ppc + 60, y + 50, x0 + RL * ppc + 26, y + 22, { color: '#7048e8', width: 2 });
      D.text(ctx, '单位', x0 + RL * ppc + 44, y + 70, { size: 14, weight: 800, color: '#7048e8' });
      ctx.globalAlpha = 1;
    } });
    el.append(PS.ui.row(PS.ui.seg([{ value: 'all', label: '全部' }, { value: 'zero', label: '零刻度线' }, { value: 'range', label: '量程' }, { value: 'div', label: '分度值' }, { value: 'unit', label: '单位' }], 'all', (v) => { hl = v; S.render(); }).el));
  });

  PS.rulerTools = { drawObject, magnifier, judgeReading };
})();
