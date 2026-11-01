/* 第4节：超声波测速 / 测距 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const VS = 340;

  PS.register('ultrasound', function (el) {
    const st = { v: 30, x0: 136, dt: 1.0, t: 0, slow: 0.2, playing: false, done: false };
    // 计算两次脉冲的往返时刻
    function plan() {
      const ta = st.x0 / (VS + st.v);                      // P1 到达汽车
      const xb = st.x0 - st.v * st.dt;                       // P2 发出时汽车位置
      const tc = st.dt + xb / (VS + st.v);                   // P2 到达汽车
      return { ta, tb: 2 * ta, tc, td: st.dt + 2 * (tc - st.dt), end: st.dt + 2 * (tc - st.dt) + 0.15 };
    }
    const carX = (t) => st.x0 - st.v * t;
    const S = PS.stage(el, { ratio: '1000 / 470', draw: paint });
    const res = h('div', { class: 'us-res' });
    const loop = PS.loop((dt) => {
      const p = plan();
      st.t = Math.min(p.end, st.t + dt * st.slow);
      if (st.t >= p.end) { loop.stop(); st.playing = false; st.done = true; showRes(); }
      S.render();
    }, S.stage);

    function pulse(ctx, emitT, hitT, X, yRoad, color) {
      // 发出 → 到达汽车 → 反射回来
      const t = st.t;
      if (t < emitT) return;
      if (t <= hitT) {
        const x = VS * (t - emitT);
        wave(ctx, X(x), yRoad, 1, color);
      } else if (t <= 2 * hitT - emitT) {
        const xh = VS * (hitT - emitT);
        const x = xh - VS * (t - hitT);
        wave(ctx, X(x), yRoad, -1, color);
      }
    }
    function wave(ctx, x, y, dir, color) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 1 - i * 0.3;
        ctx.beginPath();
        ctx.arc(x - dir * i * 7, y, 14 + i * 3, dir > 0 ? -0.7 : Math.PI - 0.7, dir > 0 ? 0.7 : Math.PI + 0.7);
        ctx.stroke();
      }
      ctx.restore();
    }

    function paint(ctx, w, hh) {
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, w, hh);
      const p = plan();
      const x0p = 90, x1p = w - 40;
      const X = (m) => x0p + (m / 150) * (x1p - x0p);
      const yRoad = hh * 0.3;
      // 公路
      ctx.fillStyle = '#495057'; ctx.fillRect(0, yRoad + 8, w, 34);
      ctx.strokeStyle = '#fff'; ctx.setLineDash([16, 14]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, yRoad + 25); ctx.lineTo(w, yRoad + 25); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = PS.font(10, 500); ctx.fillStyle = '#6b7487'; ctx.textAlign = 'center';
      for (let m = 0; m <= 150; m += 10) ctx.fillText(m + 'm', X(m), yRoad + 58);
      // 测速仪
      ctx.fillStyle = '#343a40'; ctx.fillRect(X(0) - 30, yRoad - 70, 6, 120);
      ctx.fillStyle = '#4263eb'; D.roundRect(ctx, X(0) - 30, yRoad - 18, 34, 22, 5); ctx.fill();
      ctx.fillStyle = '#4263eb'; ctx.font = PS.font(12, 700); ctx.fillText('测速仪', X(0) - 13, yRoad - 30);
      // 汽车（车头朝左，驶向测速仪）
      ctx.save(); ctx.translate(X(carX(st.t)) + 22, yRoad + 22); ctx.scale(-1, 1);
      PS.drawCar(ctx, 0, 0, 1.25, '#e03131');
      ctx.restore();
      // 声波
      pulse(ctx, 0, p.ta, X, yRoad - 6, '#7048e8');
      pulse(ctx, st.dt, p.tc, X, yRoad - 6, '#0c8599');
      D.text(ctx, '超声波速度 340 m/s（慢放 ' + Math.round(1 / st.slow) + ' 倍）', 14, 22, { size: 12.5, weight: 700, color: '#3a4458' });
      D.text(ctx, '汽车 ' + st.v + ' m/s', X(carX(st.t)) + 22, yRoad - 36, { align: 'center', size: 12, weight: 700, color: '#e03131' });
      // ---- 示波器时间轴 ----
      const top = hh * 0.6, bh = hh * 0.28;
      const tmax = Math.max(1.6, p.end);
      const T = (t) => 60 + (t / tmax) * (w - 100);
      ctx.fillStyle = '#0d1626'; D.roundRect(ctx, 40, top - 8, w - 70, bh + 34, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      for (let t = 0; t <= tmax + 1e-9; t += 0.1) { ctx.beginPath(); ctx.moveTo(T(t), top); ctx.lineTo(T(t), top + bh); ctx.stroke(); }
      ctx.fillStyle = '#8ea0bd'; ctx.font = PS.font(10, 500); ctx.textAlign = 'center';
      for (let t = 0; t <= tmax + 1e-9; t += 0.2) ctx.fillText(t.toFixed(1) + 's', T(t), top + bh + 16);
      ctx.strokeStyle = '#69db7c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(T(0), top + bh * 0.75); ctx.lineTo(T(Math.min(st.t, tmax)), top + bh * 0.75); ctx.stroke();
      const spike = (t, big, color, label) => {
        if (st.t < t) return;
        ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(T(t), top + bh * 0.75); ctx.lineTo(T(t), top + bh * (big ? 0.12 : 0.4)); ctx.stroke();
        ctx.fillStyle = color; ctx.font = PS.font(12, 800);
        ctx.fillText(label, T(t), top + bh * (big ? 0.08 : 0.36) - 2);
      };
      spike(0, true, '#b197fc', 'P₁');
      spike(p.tb, false, '#b197fc', 'n₁');
      spike(st.dt, true, '#66d9e8', 'P₂');
      spike(p.td, false, '#66d9e8', 'n₂');
      ctx.fillStyle = '#3a4458'; ctx.font = PS.font(12, 700); ctx.textAlign = 'left';
      ctx.fillText('测速仪屏幕：P 为发出的信号，n 为接收到的反射信号', 44, top - 16);
    }

    function showRes() {
      const p = plan();
      const t1 = p.tb, t2 = p.td - st.dt;
      const s1 = (VS * t1) / 2, s2 = (VS * t2) / 2;
      const ds = s1 - s2;
      const dT = st.dt - t1 / 2 + t2 / 2;
      res.innerHTML =
        '<ol class="small" style="margin:0">' +
        '<li>第一次：P₁ 到 n₁ 用时 t₁ = ' + t1.toFixed(3) + ' s，汽车距测速仪 s₁ = <span class="frac"><span>v<sub>声</sub>t₁</span><span>2</span></span> = ' + s1.toFixed(1) + ' m</li>' +
        '<li>第二次：P₂ 到 n₂ 用时 t₂ = ' + t2.toFixed(3) + ' s，汽车距测速仪 s₂ = <span class="frac"><span>v<sub>声</sub>t₂</span><span>2</span></span> = ' + s2.toFixed(1) + ' m</li>' +
        '<li>汽车在两次遇到超声波之间行驶的路程 Δs = s₁ − s₂ = ' + ds.toFixed(1) + ' m</li>' +
        '<li>所用时间 Δt′ = Δt − <span class="frac"><span>t₁</span><span>2</span></span> + <span class="frac"><span>t₂</span><span>2</span></span> = ' + dT.toFixed(3) + ' s</li>' +
        '<li>车速 v = <span class="frac"><span>Δs</span><span>Δt′</span></span> = <b class="hl">' + (ds / dT).toFixed(1) + ' m/s</b>（' + ((ds / dT) * 3.6).toFixed(0) + ' km/h）' +
        (st.v * 3.6 > 120 ? ' <b class="hl-r">已超速！（限速 120 km/h）</b>' : '') + '</li></ol>';
    }

    const vS = PS.ui.slider({ label: '车速', min: 10, max: 45, step: 1, value: st.v, fmt: (v) => v + ' m/s ≈ ' + Math.round(v * 3.6) + ' km/h', onInput: (v) => { st.v = v; resetRun(); } });
    vS.el.querySelector('.slider-val').style.minWidth = '150px';
    const dtS = PS.ui.slider({ label: '两次发射间隔 Δt', min: 0.5, max: 1.5, step: 0.1, value: st.dt, unit: 's', fmt: (v) => v.toFixed(1), onInput: (v) => { st.dt = v; resetRun(); } });
    function resetRun() { loop.stop(); st.t = 0; st.done = false; res.innerHTML = '<span class="muted small">点击“发射超声波”开始测速。</span>'; S.render(); }
    el.append(PS.ui.row(PS.ui.button('📡 发射超声波', () => { st.t = 0; res.innerHTML = ''; loop.start(); st.playing = true; }, 'btn btn-primary'), vS.el, dtS.el), res);
    document.head.append(h('style', null, '.us-res{margin-top:12px;background:var(--surface-2);border-radius:10px;padding:10px 14px;border:1px dashed var(--line-2)}.us-res li{margin:4px 0}'));
    resetRun();
  });
})();
