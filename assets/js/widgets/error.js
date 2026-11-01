/* 第1节第2课时：误差 —— 多次测量求平均值 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;

  PS.register('error-measure', function (el) {
    const st = { T: 0, C: 0, data: [], careless: false, reveal: false, removed: false };
    const SIG = 0.011;
    const S = PS.stage(el, { ratio: '1000 / 420', draw: paint });
    const chips = h('div', { class: 'em-chips' });
    const calc = h('div', { class: 'em-calc' });

    function reading() {
      const good = PS.round(st.T + PS.gauss() * SIG, 2);
      if (st.careless && Math.random() < 0.22) {
        const s = good.toFixed(2);
        const kind = PS.randInt(0, 2);
        if (kind === 0) return { v: PS.round(good + PS.pick([-1, 1]), 2), err: '把厘米数读错' };
        if (kind === 1) return { v: parseFloat(s.slice(0, -2) + s.slice(-1) + s.slice(-2, -1)), err: '记录时把数字写颠倒' };
        return { v: PS.round(good + PS.pick([-0.1, 0.1]), 2), err: '把毫米数读错' };
      }
      return { v: good, err: null };
    }
    function measure(k) {
      for (let i = 0; i < k; i++) st.data.push(reading());
      st.removed = false;
      update();
      PS.sound.tick();
    }
    function median(arr) { const a = arr.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
    function isOutlier(x, med) { return Math.abs(x - med) > 0.05; }
    function used() {
      if (!st.removed) return st.data.map((d) => d.v);
      const med = median(st.data.map((d) => d.v));
      return st.data.filter((d) => !isOutlier(d.v, med)).map((d) => d.v);
    }

    function update() {
      const med = st.data.length ? median(st.data.map((d) => d.v)) : 0;
      chips.innerHTML = '';
      st.data.forEach((d, i) => {
        const out = st.removed && isOutlier(d.v, med);
        chips.append(h('span', { class: 'chip' + (out ? ' em-out' : ''), title: d.err ? '错误原因：' + d.err : '' }, '第' + (i + 1) + '次 ' + d.v.toFixed(2) + ' cm'));
      });
      const u = used();
      if (u.length) {
        const avg = u.reduce((a, b) => a + b, 0) / u.length;
        let html = '平均值 = (' + (u.length <= 6 ? u.map((x) => x.toFixed(2)).join(' + ') : u.slice(0, 3).map((x) => x.toFixed(2)).join(' + ') + ' + …') + ') ÷ ' + u.length +
          ' ≈ <b class="hl">' + avg.toFixed(2) + ' cm</b>';
        if (st.removed) {
          const n = st.data.length - u.length;
          html += n ? '<br><span class="hl-r">已剔除 ' + n + ' 个错误数据（与其他数据相差太大）。</span>' : '<br><span class="hl-g">没有发现错误数据。</span>';
        } else if (st.data.some((d) => isOutlier(d.v, med))) {
          html += '<br><span class="hl-o">发现与其他数据相差很大的值，它们是“错误”而不是“误差”，应先剔除！</span>';
        }
        if (st.reveal) html += '<br>真实值 <b class="hl-g">' + st.T.toFixed(3) + ' cm</b>，平均值与真实值相差 <b>' + Math.abs(avg - st.T).toFixed(3) + ' cm</b>';
        calc.innerHTML = html;
      } else calc.innerHTML = '<span class="muted">点击“测量一次”开始。每次测量的结果都会略有不同。</span>';
      S.render();
    }

    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      const T = st.T;
      const lo = st.C - 0.06, hi = st.C + 0.06; // 坐标中心与真实值错开，避免“泄露”答案
      const X = (v) => 50 + ((v - lo) / (hi - lo)) * (w - 100);
      // ---- 上：数轴点图 ----
      const axisY = hh * 0.36;
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(40, axisY); ctx.lineTo(w - 40, axisY); ctx.stroke();
      ctx.font = PS.font(11, 500); ctx.fillStyle = '#6b7487'; ctx.textAlign = 'center';
      for (let v = Math.ceil(lo * 100) / 100; v <= hi + 1e-9; v += 0.01) {
        const x = X(v);
        ctx.beginPath(); ctx.moveTo(x, axisY - 4); ctx.lineTo(x, axisY + 4); ctx.stroke();
        ctx.fillText(v.toFixed(2), x, axisY + 18);
      }
      D.text(ctx, '测量值分布（cm）', 44, 20, { size: 13, weight: 700, color: '#3a4458' });
      const med = st.data.length ? median(st.data.map((d) => d.v)) : 0;
      const stack = {};
      st.data.forEach((d) => {
        const key = d.v.toFixed(2);
        stack[key] = (stack[key] || 0) + 1;
        const inRange = d.v >= lo && d.v <= hi;
        const x = inRange ? X(d.v) : d.v < lo ? 46 : w - 46;
        const y = axisY - 10 - (stack[key] - 1) * 11;
        const out = isOutlier(d.v, med);
        ctx.fillStyle = out ? (st.removed ? 'rgba(224,49,49,.25)' : '#e03131') : '#4c6ef5';
        ctx.beginPath(); ctx.arc(x, Math.max(30, y), 5, 0, Math.PI * 2); ctx.fill();
        if (!inRange) D.text(ctx, d.v.toFixed(2), x, Math.max(30, y) - 10, { align: 'center', size: 10, color: '#e03131' });
      });
      const u = used();
      if (u.length) {
        const avg = u.reduce((a, b) => a + b, 0) / u.length;
        ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X(avg), 34); ctx.lineTo(X(avg), axisY + 4); ctx.stroke();
        D.text(ctx, '平均值', X(avg), 30, { align: 'center', size: 11, color: '#3b5bdb', weight: 700 });
      }
      if (st.reveal) {
        ctx.strokeStyle = '#2b8a3e'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X(T), 34); ctx.lineTo(X(T), axisY + 4); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '真实值', X(T), axisY + 34, { align: 'center', size: 11, color: '#2b8a3e', weight: 700 });
      }
      // ---- 下：平均值随测量次数的变化 ----
      const top = hh * 0.55, bot = hh - 30, left = 60, right = w - 30;
      D.text(ctx, '平均值随测量次数的变化', 44, top - 8, { size: 13, weight: 700, color: '#3a4458' });
      ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1;
      ctx.strokeRect(left, top, right - left, bot - top);
      const Y = (v) => PS.clamp(top + (1 - (v - (st.C - 0.03)) / 0.06) * (bot - top), top, bot);
      ctx.fillStyle = '#6b7487'; ctx.font = PS.font(10, 500); ctx.textAlign = 'right';
      [st.C - 0.02, st.C, st.C + 0.02].forEach((v) => ctx.fillText(v.toFixed(2), left - 6, Y(v) + 3));
      ctx.textAlign = 'center';
      const N = Math.max(10, u.length);
      ctx.fillText('测量次数 →', (left + right) / 2, bot + 18);
      if (st.reveal) {
        ctx.strokeStyle = '#2b8a3e'; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(left, Y(T)); ctx.lineTo(right, Y(T)); ctx.stroke(); ctx.setLineDash([]);
      }
      if (u.length) {
        ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2;
        ctx.beginPath();
        let s = 0;
        u.forEach((v, i) => {
          s += v;
          const x = left + ((i + 0.5) / N) * (right - left);
          const y = Y(s / (i + 1));
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.stroke();
        s = 0;
        ctx.fillStyle = '#3b5bdb';
        u.forEach((v, i) => { s += v; ctx.beginPath(); ctx.arc(left + ((i + 0.5) / N) * (right - left), Y(s / (i + 1)), 2.5, 0, Math.PI * 2); ctx.fill(); });
      }
    }

    function reset() {
      st.T = PS.round(PS.rand(17.5, 18.3), 3);
      st.C = PS.round(st.T + PS.rand(-0.025, 0.025), 2);
      st.data = []; st.reveal = false; st.removed = false;
      update();
    }
    el.append(
      PS.ui.row(
        PS.ui.button('📏 测量一次', () => measure(1), 'btn btn-primary'),
        PS.ui.button('自动测量 10 次', () => measure(10), 'btn'),
        PS.ui.button('剔除错误数据', () => { st.removed = true; update(); }, 'btn btn-accent'),
        PS.ui.button('揭晓真实值', () => { st.reveal = true; update(); }, 'btn btn-green'),
        PS.ui.button('重新开始', reset, 'btn btn-ghost'),
        PS.ui.toggle('粗心模式（会产生错误数据）', false, (v) => { st.careless = v; }).el
      ),
      chips, calc
    );
    const css = `.em-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px;max-height:110px;overflow:auto}.em-chips .chip{font-variant-numeric:tabular-nums}.em-out{text-decoration:line-through;color:var(--red);background:var(--red-soft)!important;border-color:#ffc9c9!important}.em-calc{margin-top:10px;background:var(--surface-2);border:1px dashed var(--line-2);border-radius:10px;padding:10px 14px;font-size:.95rem}`;
    document.head.append(h('style', null, css));
    reset();
  });
})();
