/* 第6章第1节：质量——物体与物质、质量的尺度与估测、质量是物体的属性、天平读数练习、天平使用中的问题。依赖 mass.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, M = PS.mass;
  const TAU = Math.PI * 2;

  /* ================= 物体还是物质 ================= */
  PS.register('matter-sort', function (el) {
    PS.sortCards(el, [
      ['🔩 铁钉', 0, '有一定形状、占据一定空间的实物，由铁组成'],
      ['铁', 1, '构成铁钉、铁锤、铁锅的材料'],
      ['🔨 铁锤', 0, '由铁（锤头）和木材（锤柄）组成的物体'],
      ['玻璃', 1, '构成玻璃杯、窗玻璃的材料'],
      ['🥛 玻璃杯', 0, '由玻璃这种物质组成的物体'],
      ['木材', 1, '构成课桌、椅子、铅笔杆的材料'],
      ['课桌', 0, '由木材、铁等物质组成的物体'],
      ['水', 1, '一种物质（没有说多少、什么形状）'],
      ['💧 一滴水', 0, '有一定的量、占据一定空间，是物体'],
      ['❄️ 一块冰', 0, '由水这种物质组成的物体'],
      ['铝', 1, '构成易拉罐、铝锅的材料'],
      ['易拉罐', 0, '由铝组成的物体'],
    ], ['物体', '物质']);
  });

  /* ================= 质量的尺度与估测 ================= */
  const ITEMS = [
    // [名称, 质量 kg, 图标, 估测题 [数值, 单位]]
    ['一粒大米', 2.5e-5, '🍚', [25, 'mg']],
    ['一张邮票', 5e-5, '✉️', [50, 'mg']],
    ['一枚大头针', 8e-5, '📌', [80, 'mg']],
    ['一个乒乓球', 2.7e-3, '🏓', [2.7, 'g']],
    ['一枚 1 元硬币', 6e-3, 'coin', [6, 'g']],
    ['一个鸡蛋', 0.05, '🥚', [50, 'g']],
    ['一个苹果', 0.15, '🍎', [150, 'g']],
    ['一本物理课本', 0.2, '📘', [200, 'g']],
    ['一瓶 550 mL 的矿泉水', 0.55, '💧', [550, 'g']],
    ['一只鸡', 2, '🐔', [2, 'kg']],
    ['一个中学生', 50, '👦', [50, 'kg']],
    ['一辆小汽车', 1500, '🚗', [1.5, 't']],
    ['一头大象', 6000, '🐘', [6, 't']],
    ['一头蓝鲸', 1.5e5, '🐋', [150, 't']],
  ];
  const UNIT = { t: 1000, kg: 1, g: 1e-3, mg: 1e-6 };
  const UNAME = { t: '吨', kg: '千克', g: '克', mg: '毫克' };
  const num = (x) => PS.pretty(x, 4);

  PS.register('mass-ladder', function (el) {
    const VW = 1000, VH = 300, X0 = 60, X1 = 960, LMIN = -5, LMAX = 6, AY = 214;
    const xOf = (kg) => X0 + ((Math.log10(kg) - LMIN) / (LMAX - LMIN)) * (X1 - X0);
    let sel = 5;
    // 分行，避免图标重叠
    const rowLast = [-1e9, -1e9, -1e9];
    const pos = ITEMS.map((it) => {
      const x = xOf(it[1]);
      let r = rowLast.findIndex((lx) => x - lx > 62);
      if (r < 0) r = 0;
      rowLast[r] = x;
      return { x, y: AY - 42 - r * 56 };
    });
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const info = h('div', { class: 'ms-msg info' });
    el.append(info);
    PS.drag(S, { VW, VH, hit: (p) => { const i = pos.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < 28); return i >= 0 ? i : null; }, start: (i) => { sel = i; PS.sound.tick(); upd(); }, move() {} });

    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.clearRect(0, 0, VW, VH);
      // 单位区段
      [['mg', -5, -3, '#e7f5ff', '#1c7ed6'], ['g', -3, 0, '#ebfbee', '#2b8a3e'], ['kg', 0, 3, '#fff4e6', '#e8590c'], ['t', 3, 6, '#f3f0ff', '#7048e8']].forEach(([u, a, b, bg, c]) => {
        const xa = xOf(Math.pow(10, a)), xb = xOf(Math.pow(10, b));
        ctx.fillStyle = bg; ctx.fillRect(xa, AY + 30, xb - xa, 34);
        D.text(ctx, '常用' + UNAME[u] + '（' + u + '）', (xa + xb) / 2, AY + 52, { size: F(13), weight: 700, color: c, align: 'center' });
      });
      // 轴
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X0 - 10, AY); ctx.lineTo(X1 + 14, AY); ctx.stroke();
      PS.draw.arrow(ctx, X1, AY, X1 + 22, AY, { color: '#1b2333', width: 2 });
      const LAB = ['10 mg', '100 mg', '1 g', '10 g', '100 g', '1 kg', '10 kg', '100 kg', '1 t', '10 t', '100 t', '1000 t'];
      for (let k = LMIN; k <= LMAX; k++) {
        const x = xOf(Math.pow(10, k));
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, AY - 6); ctx.lineTo(x, AY + 6); ctx.stroke();
        D.text(ctx, LAB[k - LMIN], x, AY + 22, { size: F(12), weight: 600, color: '#495057', align: 'center' });
      }
      D.text(ctx, '数轴上每隔一格，质量变为 10 倍', X0 - 10, 22, { size: F(12), color: '#868e96' });
      // 物体
      ITEMS.forEach((it, i) => {
        const p = pos[i], on = i === sel, x = xOf(it[1]);
        ctx.strokeStyle = on ? '#f08c00' : 'rgba(80,90,110,.35)'; ctx.lineWidth = on ? 2 : 1;
        ctx.setLineDash(on ? [] : [3, 3]); ctx.beginPath(); ctx.moveTo(x, p.y + 18); ctx.lineTo(x, AY); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = on ? '#fff4e6' : '#fff'; ctx.strokeStyle = on ? '#f08c00' : '#dee2e6'; ctx.lineWidth = on ? 2.5 : 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, TAU); ctx.fill(); ctx.stroke();
        if (it[2] === 'coin') {
          ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, TAU); ctx.fill(); ctx.stroke();
          D.text(ctx, '1', p.x, p.y + 1, { size: 15, weight: 800, color: '#495057', align: 'center', baseline: 'middle' });
        } else D.text(ctx, it[2], p.x, p.y + 1, { size: 26, align: 'center', baseline: 'middle' });
        ctx.fillStyle = on ? '#f08c00' : '#1b2333'; ctx.beginPath(); ctx.arc(x, AY, on ? 5 : 3.5, 0, TAU); ctx.fill();
      });
      const it = ITEMS[sel], p = pos[sel];
      D.text(ctx, it[0], p.x, p.y - 32, { size: F(14), weight: 700, color: '#a35a00', align: 'center', bg: 'rgba(255,255,255,.95)' });
    }
    function upd() {
      const it = ITEMS[sel], kg = it[1];
      info.innerHTML = '<b>' + it[0] + '</b>：约 <b>' + it[3][0] + ' ' + it[3][1] + '</b>　=　' +
        ['t', 'kg', 'g', 'mg'].filter((u) => u !== it[3][1]).map((u) => num(kg / UNIT[u]) + ' ' + u).join('　=　') +
        '<br><span class="muted small">换算：1 t = 10³ kg，1 kg = 10³ g，1 g = 10³ mg（相邻单位之间是 1000 倍）</span>';
      S.render();
    }

    /* 估测与换算练习 */
    const box = h('div', { class: 'ms-q' });
    el.append(box);
    let q = null;
    function newQ() {
      box.innerHTML = '';
      const it = PS.pick(ITEMS);
      if (Math.random() < 0.5) {
        q = { t: 'unit', it };
        const fb = h('div', { class: 'feedback' });
        const opts = h('div', { class: 'q-options cols-4' }, ['mg', 'g', 'kg', 't'].map((u) => {
          const b = h('button', { type: 'button', class: 'q-opt', html: u });
          b.addEventListener('click', () => {
            if (q.done) return; q.done = true;
            const ok = u === it[3][1];
            opts.querySelectorAll('.q-opt').forEach((x) => { x.disabled = true; if (x.textContent === it[3][1]) x.classList.add('right'); });
            if (!ok) b.classList.add('wrong');
            fb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
            fb.innerHTML = (ok ? '✔ 对！' : '✘ 应该是 ' + it[3][1] + '。') + it[0] + '约 ' + it[3][0] + ' ' + it[3][1] + '，约合 ' + num(it[1]) + ' kg。';
            ok ? PS.sound.good() : PS.sound.bad();
            sel = ITEMS.indexOf(it); upd();
          });
          return b;
        }));
        box.append(h('div', { class: 'opt-qhead', style: { display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, h('b', { html: '估一估：' + it[0] + '的质量约为 ' + it[3][0] + ' ____' }), PS.ui.button('换一题', newQ, 'btn btn-ghost btn-sm')), opts, fb);
      } else {
        // 单位换算：结果在 0.001 ~ 10⁶ 之间
        const us = ['t', 'kg', 'g', 'mg'];
        let a, b, v, r, tries = 0;
        do {
          a = it[3][1]; b = PS.pick(us.filter((u) => u !== a));
          v = it[3][0]; r = (v * UNIT[a]) / UNIT[b]; tries++;
        } while ((r < 1e-3 || r > 1e6) && tries < 20);
        q = { t: 'conv', r };
        const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '填数字', autocomplete: 'off' });
        const fb = h('div', { class: 'feedback' });
        const go = () => {
          if (q.done) return;
          const x = parseFloat(inp.value.replace(/[，,\s]/g, ''));
          if (isNaN(x)) { inp.focus(); return; }
          q.done = true;
          const ok = Math.abs(x - r) <= Math.abs(r) * 1e-6;
          const big = UNIT[a] > UNIT[b];
          fb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
          fb.innerHTML = (ok ? '✔ 正确！' : '✘ 正确答案：' + num(r) + ' ' + b + '。') + '<br>' + v + ' ' + a + ' = ' + v + ' × ' + (big ? '' : '') + PS.pretty(UNIT[a] / UNIT[b], 3) + ' ' + b + ' = ' + num(r) + ' ' + b + (big ? '（大单位化小单位，乘进率）' : '（小单位化大单位，除以进率）');
          ok ? PS.sound.good() : PS.sound.bad();
        };
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        box.append(h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, h('b', null, '换一换：' + it[0] + ' 约 ' + v + ' ' + a + '，合多少 ' + b + '？'), PS.ui.button('换一题', newQ, 'btn btn-ghost btn-sm')),
          h('div', { class: 'q-fill', style: { marginTop: '8px' } }, h('span', null, v + ' ' + a + ' ='), inp, h('span', { class: 'q-unit' }, b), PS.ui.button('提交', go, 'btn btn-primary btn-sm')), fb);
      }
    }
    newQ();
    upd();
  });

  /* ================= 质量是物体的属性 ================= */
  // 在形状里按六边形网格排列 N 个粒子（从下往上填）
  function layout(inside, box, N, d) {
    const pts = [];
    for (let k = 0; k < 12 && pts.length < N; k++) {
      pts.length = 0;
      const s = 1 + k * 0.06;
      for (let y = box.y1, row = 0; y >= box.y0 - 200; y -= d * 0.866, row++) {
        for (let x = box.x0 - 200 + (row % 2 ? d / 2 : 0); x <= box.x1 + 200; x += d) {
          if (inside((x - box.cx) / s + box.cx, (y - box.y1) / s + box.y1)) pts.push({ x, y });
        }
      }
    }
    pts.sort((a, b) => b.y - a.y || a.x - b.x);
    return pts.slice(0, N);
  }
  const MP = {
    shape: { name: '形状', obj: '橡皮泥', N: 140, m: 120, color: '#ff922b', d: 12, states: ['球形', '长条', '小兔', '扁饼'], btn: '✋ 捏成别的形状', q: '把橡皮泥捏成其他形状，质量变不变？' },
    state: { name: '状态', obj: '冰块', N: 112, m: 50, color: '#a5d8ff', d: 12, states: ['固态的冰', '液态的水'], btn: '🔥 熔化 / ❄️ 凝固', q: '冰熔化成水，质量变不变？' },
    temp: { name: '温度', obj: '铁块', N: 120, m: 79, color: '#868e96', d: 12, states: ['20 ℃', '100 ℃'], btn: '🔥 放进沸水煮 / 取出', q: '把铁块放进沸水中煮一段时间，取出擦干再称，质量变不变？' },
    place: { name: '位置', obj: '铁块', N: 120, m: 79, color: '#868e96', d: 12, states: ['在地球上', '带到太空'], btn: '🚀 带到太空 / 带回地球', q: '把铁块从地球带到太空，质量变不变？' },
    cut: { name: '对比：剪去一角', obj: '铁片', N: 160, m: 80, color: '#adb5bd', d: 12, states: ['完整', '剪去一角'], btn: '✂️ 剪去一角 / 复原', q: '把铁片剪去一角，质量变不变？' },
  };
  PS.register('mass-property', function (el) {
    const VW = 1000, VH = 420, CX = 330, PANY = 274;
    const st = { mode: 'shape', k: 0, parts: [], t: 0, rot: 0, space: 0 };
    const seg = PS.ui.seg(Object.keys(MP).map((k) => ({ value: k, label: MP[k].name })), st.mode, (v) => { st.mode = v; st.k = 0; build(true); });
    const act = PS.ui.button('', () => { const P = MP[st.mode]; st.k = (st.k + 1) % P.states.length; PS.sound.tick(); build(false); }, 'btn btn-primary btn-sm');
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'ms-msg' });
    el.append(PS.ui.row(act), msg);

    function shapeFn(mode, k) {
      const B = { x0: CX - 170, x1: CX + 170, y0: PANY - 240, y1: PANY, cx: CX };
      if (mode === 'shape') {
        if (k === 0) return [(x, y) => Math.hypot(x - CX, y - (PANY - 76)) < 77, B];
        if (k === 1) return [(x, y) => Math.abs(x - CX) < 150 && y > PANY - 60, B];
        if (k === 2) return [(x, y) => Math.hypot((x - CX) / 1.15, y - (PANY - 48)) < 50 || Math.hypot(x - CX - 62, y - (PANY - 108)) < 32 || (Math.abs(x - CX - 52) < 9 && y > PANY - 190 && y < PANY - 130) || (Math.abs(x - CX - 76) < 9 && y > PANY - 185 && y < PANY - 130) || Math.hypot(x - CX + 60, y - (PANY - 30)) < 16, B];
        return [(x, y) => y > PANY - 60 && Math.hypot((x - CX) / 190, (y - PANY) / 60) < 1, B];
      }
      if (mode === 'state') {
        if (k === 0) return [(x, y) => Math.abs(x - CX) < 56 && y > PANY - 118, B];
        return [(x, y) => Math.abs(x - CX) < 92 && y > PANY - 100, B];
      }
      if (mode === 'cut') {
        if (k === 0) return [(x, y) => Math.abs(x - CX) < 150 && y > PANY - 64, B];
        return [(x, y) => Math.abs(x - CX) < 150 && y > PANY - 64 && !(x - CX > 40 && (y - (PANY - 64)) < (x - CX - 40) * 1.1), B];
      }
      return [(x, y) => Math.abs(x - CX) < 72 && y > PANY - 100, B];
    }
    function build(reset) {
      const P = MP[st.mode];
      const [fn, B] = shapeFn(st.mode, st.mode === 'cut' ? 0 : st.k);
      let tg = layout(fn, B, P.N, P.d);
      if (st.mode === 'cut' && st.k === 1) { const [fn2] = shapeFn('cut', 1); tg = tg.map((p) => (fn2(p.x, p.y) ? p : null)); }
      if (st.mode === 'state' && st.k === 1) tg = layout(fn, B, P.N, P.d * 0.95);
      if (reset || st.parts.length !== tg.length) st.parts = tg.map((p) => (p ? { x: p.x, y: p.y, tx: p.x, ty: p.y, gone: false, ph: Math.random() * TAU } : { x: 0, y: 0, tx: 0, ty: 0, gone: true, ph: 0 }));
      else {
        // 按位置排序后一一对应，过渡更自然
        const order = st.parts.map((p, i) => i).sort((a, b) => st.parts[b].ty - st.parts[a].ty || st.parts[a].tx - st.parts[b].tx);
        const tgs = tg.map((p, i) => ({ p, i })).filter((o) => o.p).sort((a, b) => b.p.y - a.p.y || a.p.x - b.p.x);
        if (st.mode === 'cut') tg.forEach((p, i) => { const q = st.parts[i]; if (!p) { q.gone = true; q.gx = q.tx + 200; q.gy = q.ty + (VH - 16 - PANY); } else { q.gone = false; } });
        else order.forEach((pi, j) => { const t = tgs[j].p; st.parts[pi].tx = t.x; st.parts[pi].ty = t.y; });
      }
      act.innerHTML = P.btn;
      upd();
    }
    function count() { return st.parts.filter((p) => !p.gone).length; }
    function mass() { const P = MP[st.mode]; return (P.m * count()) / P.N; }
    function upd() {
      const P = MP[st.mode];
      const changed = st.mode === 'cut' && st.k === 1;
      msg.className = 'ms-msg ' + (changed ? 'bad' : 'ok');
      msg.innerHTML = '<b>' + P.q + '</b><br>' + (st.mode === 'cut'
        ? (changed ? '剪去一角后，铁片所含的铁<b>变少</b>了，质量从 80.0 g 变成 ' + M.fmt(mass()) + ' g——<b>所含物质的多少改变，质量就改变</b>。' : '点“剪去一角”，看看所含物质的多少和质量怎样变化。')
        : '形状、状态、温度、位置变了，但组成它的粒子<b>一个也没有多、一个也没有少</b>——所含物质的多少不变，<b>质量不变</b>。' + (st.mode === 'place' && st.k === 1 ? '（太空中物体处于“失重”状态，不能用天平或秤称量，但质量并没有改变。）' : '') + (st.mode === 'state' ? '（冰化成水后体积变小了，第4节会学到原因。）' : ''));
    }

    const loop = PS.loop((dt, t) => {
      st.t = t;
      const P = MP[st.mode];
      const hot = st.mode === 'temp' && st.k === 1, liquid = st.mode === 'state' && st.k === 1;
      st.space += ((st.mode === 'place' && st.k === 1 ? 1 : 0) - st.space) * Math.min(1, dt * 2.5);
      st.parts.forEach((p) => {
        if (p.gone) { const k = Math.min(1, dt * 3); p.x += (p.gx - p.x) * k; p.y += (p.gy - p.y) * k; return; }
        const k = Math.min(1, dt * (liquid ? 2.2 : 3.2));
        const ex = hot ? 1.04 : 1; // 受热膨胀（夸大示意）
        const tx = CX + (p.tx - CX) * ex, ty = PANY + (p.ty - PANY) * ex;
        p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
      });
      void P;
      S.render();
    }, el);

    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const P = MP[st.mode], sp = st.space;
      // 背景：地球 → 太空
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (sp > 0.01) {
        ctx.globalAlpha = sp; ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, 660, VH);
        for (let i = 0; i < 60; i++) { const x = (i * 137.5) % 660, y = (i * 71.3) % VH; ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * Math.abs(Math.sin(i + st.t))) + ')'; ctx.fillRect(x, y, 2, 2); }
        const g = ctx.createRadialGradient(560, 380, 20, 560, 420, 160); g.addColorStop(0, '#4dabf7'); g.addColorStop(0.7, '#1864ab'); g.addColorStop(1, 'rgba(24,100,171,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(560, 440, 150, 0, TAU); ctx.fill();
        D.text(ctx, '太空', 40, 46, { size: F(18), weight: 800, color: '#fff' });
        ctx.globalAlpha = 1;
      }
      const lift = sp * 120;
      // 秤
      if (sp < 0.98) {
        ctx.globalAlpha = 1 - sp;
        const cnt = count();
        M.scale(ctx, F, CX, VH - 14, 380, { text: M.fmt((P.m * cnt) / P.N) });
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, VH - 14, 660, 14);
        if (st.mode === 'state') D.text(ctx, '已“去皮”：秤只显示杯中冰（水）的质量', CX, VH - 4, { size: F(11), color: '#868e96', align: 'center' });
        ctx.globalAlpha = 1;
      }
      // 杯子（状态）
      if (st.mode === 'state') {
        M.beaker(ctx, CX, PANY + 4, 210, 170, {});
        ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CX - 112, PANY + 4 - 172); ctx.lineTo(CX + 112, PANY + 4 - 172); ctx.stroke();
        D.text(ctx, '密封', CX, PANY - 176, { size: F(11), color: '#7d8ca3', align: 'center' });
      }
      // 粒子
      const hot = st.mode === 'temp' && st.k === 1, liquid = st.mode === 'state' && st.k === 1;
      const r = P.d * 0.46;
      ctx.save();
      if (sp > 0.01) { ctx.translate(CX, PANY - 60 - lift); ctx.rotate(Math.sin(st.t * 0.6) * 0.25 * sp); ctx.translate(-CX, -(PANY - 60)); }
      st.parts.forEach((p) => {
        let x = p.x, y = p.y;
        const amp = hot ? 2.2 : liquid ? 2.6 : 0.5;
        x += Math.sin(st.t * (hot ? 26 : 9) + p.ph) * amp; y += Math.cos(st.t * (hot ? 23 : 8) + p.ph * 1.7) * amp;
        let c = P.color;
        if (hot) c = '#ff8787';
        if (liquid) c = '#4dabf7';
        if (p.gone) c = '#ced4da';
        ctx.fillStyle = c; ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y - r, r, 0, TAU); ctx.fill(); ctx.stroke();
      });
      ctx.restore();
      if (st.mode === 'cut' && st.k === 1) D.text(ctx, '剪下的一角', 600, VH - 70, { size: F(13), weight: 700, color: '#868e96', align: 'center' });
      if (hot) { // 热水的蒸汽示意
        for (let i = 0; i < 3; i++) { const yy = PANY - 150 - ((st.t * 40 + i * 40) % 120); ctx.strokeStyle = 'rgba(160,170,190,' + (0.5 - ((st.t * 40 + i * 40) % 120) / 260) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(CX - 40 + i * 40, yy + 30); ctx.bezierCurveTo(CX - 55 + i * 40, yy + 15, CX - 25 + i * 40, yy + 5, CX - 40 + i * 40, yy - 10); ctx.stroke(); }
      }
      // 右侧信息
      const X = 690;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; D.roundRect(ctx, X, 24, 290, VH - 48, 14); ctx.fill(); ctx.stroke();
      D.text(ctx, P.obj, X + 20, 58, { size: F(20), weight: 800 });
      D.text(ctx, '现在：' + P.states[st.k], X + 20, 90, { size: F(15), weight: 600, color: '#3b5bdb' });
      D.text(ctx, '组成它的粒子数（示意）', X + 20, 134, { size: F(13), color: '#868e96' });
      D.text(ctx, String(count()), X + 20, 176, { size: F(34), weight: 800, color: st.mode === 'cut' && st.k === 1 ? '#e03131' : '#2b8a3e' });
      D.text(ctx, '质量', X + 20, 222, { size: F(13), color: '#868e96' });
      D.text(ctx, M.fmt(mass()) + ' g', X + 20, 266, { size: F(34), weight: 800, color: st.mode === 'cut' && st.k === 1 ? '#e03131' : '#2b8a3e' });
      const same = !(st.mode === 'cut' && st.k === 1);
      D.text(ctx, same ? '✔ 质量不变' : '✘ 质量变小了', X + 20, 312, { size: F(17), weight: 800, color: same ? '#2b8a3e' : '#e03131' });
      D.text(ctx, '质量是物体本身的一种属性', X + 20, 350, { size: F(13), color: '#495057' });
    }
    seg.set(st.mode, true);
    build(true);
    loop.start();
  });

  /* ================= 天平读数练习 ================= */
  PS.register('balance-read', function (el) {
    const VW = 1000, VH = 430;
    const st = { mode: 'normal', div: 0.2, w: [], r: 0, m: 0, done: false, obj: 0 };
    const mSeg = PS.ui.seg([{ value: 'normal', label: '左物右码' }, { value: 'rev', label: '物体和砝码放反了' }], st.mode, (v) => { st.mode = v; newQ(); });
    const dSeg = PS.ui.seg([{ value: 0.2, label: '标尺分度值 0.2 g' }, { value: 0.1, label: '标尺分度值 0.1 g' }], st.div, (v) => { st.div = v; newQ(); });
    el.append(PS.ui.row(mSeg.el, dSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '质量', autocomplete: 'off' });
    const msg = h('div', { class: 'ms-msg' });
    const go = () => check();
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    el.append(h('div', { class: 'ms-ans' }, h('b', { html: '天平平衡了，物体的质量 <span class="var">m</span> =' }), inp, h('span', null, 'g'), PS.ui.button('提交', go, 'btn btn-primary btn-sm'), PS.ui.button('下一题 →', newQ, 'btn btn-ghost btn-sm')), msg);

    function newQ() {
      st.done = false; inp.value = ''; inp.disabled = false;
      const n = Math.round(5 / st.div);
      if (st.mode === 'normal') {
        const m = PS.randInt(12, 190) + PS.randInt(1, n - 1) * st.div;
        const d = M.decompose(m);
        st.w = d.w; st.r = PS.round(d.r, 2);
        // 游码不能是 0（练读游码），也要小于 5
        if (st.r < st.div / 2) { st.r = PS.randInt(1, n - 1) * st.div; }
        st.m = PS.round(st.w.reduce((a, b) => a + b, 0) + st.r, 2);
      } else {
        const opts = [[20], [20, 5], [50], [20, 10], [50, 20], [50, 10, 5], [100], [100, 20], [20, 20, 5]];
        st.w = PS.pick(opts).slice();
        st.r = PS.round(PS.randInt(1, n - 1) * st.div, 2);
        st.m = PS.round(st.w.reduce((a, b) => a + b, 0) - st.r, 2);
      }
      st.obj = PS.randInt(0, 2);
      msg.className = 'ms-msg';
      msg.innerHTML = st.mode === 'normal' ? '读数方法：<b>物体的质量 = 右盘中砝码的总质量 + 游码在标尺上所对的刻度值</b>（看游码的<b>左边缘</b>）。' : '这次<b>物体放在了右盘</b>，砝码放在左盘。想一想：这时物体的质量怎样计算？';
      S.render();
    }
    function check() {
      if (st.done) return;
      const x = parseFloat(inp.value.replace(/[，,\s]/g, ''));
      if (isNaN(x)) { inp.focus(); return; }
      st.done = true; inp.disabled = true;
      const W = st.w.reduce((a, b) => a + b, 0);
      const ok = Math.abs(x - st.m) < 1e-6;
      let why = '';
      const rw = 2 * st.div; // 游码宽两格
      if (!ok) {
        if (st.mode === 'rev' && Math.abs(x - (W + st.r)) < 1e-6) why = '物体放在右盘时：m<sub>砝</sub> = m<sub>物</sub> + m<sub>游</sub>，所以 <b>m<sub>物</sub> = m<sub>砝</sub> − m<sub>游</sub></b>。';
        else if (Math.abs(x - W) < 1e-6) why = '别忘了加上游码所对的刻度值。';
        else if (Math.abs(Math.abs(x - st.m) - rw) < 1e-6) why = '要读游码<b>左边缘</b>对准的刻度，不能读右边缘。';
        else if (Math.abs(Math.abs(x - st.m) - st.div) < 1e-6) why = '游码读数差了一格，数清楚格数（分度值 ' + st.div + ' g）。';
      }
      const w = st.w.slice().sort((a, b) => b - a).map((g) => g + ' g').join(' + ');
      msg.className = 'ms-msg ' + (ok ? 'ok' : 'bad');
      msg.innerHTML = (ok ? '✔ 正确！' : '✘ 正确答案是 <b>' + M.fmt(st.m) + ' g</b>。' + why) + '<br>' +
        (st.mode === 'normal' ? 'm = ' + w + ' + ' + M.fmt(st.r) + ' g = <b>' + M.fmt(st.m) + ' g</b>' : 'm<sub>物</sub> = m<sub>砝</sub> − m<sub>游</sub> = (' + w + ') − ' + M.fmt(st.r) + ' g = <b>' + M.fmt(st.m) + ' g</b>');
      ok ? PS.sound.good() : PS.sound.bad();
    }
    function objDraw(ctx, x, y) {
      if (st.obj === 0) M.block(ctx, x - 26, y, 44, 30, PS.MAT.copper);
      else if (st.obj === 1) M.stone(ctx, x, y, 24, { seed: 5 });
      else { ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc(x, y - 26, 26, 0, TAU); ctx.fill(); ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.ellipse(x + 6, y - 56, 8, 4, -0.5, 0, TAU); ctx.fill(); }
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 整体（左）
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, 398, 450, 32);
      const rev = st.mode === 'rev';
      M.balance(ctx, F, { x: 225, y: 400, s: 1.12, tilt: 0, rider: st.r, left: rev ? { w: st.w } : { draw: objDraw }, right: rev ? { draw: objDraw } : { w: st.w } });
      D.text(ctx, rev ? '左盘：砝码' : '左盘：物体', 82, 70, { size: F(14), weight: 700, color: '#495057', align: 'center' });
      D.text(ctx, rev ? '右盘：物体' : '右盘：砝码', 368, 70, { size: F(14), weight: 700, color: '#495057', align: 'center' });
      D.text(ctx, '指针指在分度盘中央：天平平衡', 225, 30, { size: F(13), weight: 600, color: '#2b8a3e', align: 'center', bg: '#ebfbee' });
      // 砝码放大
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; D.roundRect(ctx, 470, 16, 512, 200, 14); ctx.fill(); ctx.stroke();
      D.text(ctx, (rev ? '左' : '右') + '盘中的砝码（放大）', 490, 44, { size: F(14), weight: 700, color: '#495057' });
      const ws = st.w.slice().sort((a, b) => b - a), k = 2.3;
      let tot = ws.reduce((s, g) => s + M.weightSize(g)[0] * k + 14, -14), x = 726 - tot / 2;
      ctx.save();
      ws.forEach((g) => { const ww = M.weightSize(g)[0] * k; ctx.save(); ctx.translate(x + ww / 2, 196); ctx.scale(k, k); M.weight(ctx, 0, 0, g); ctx.restore(); x += ww + 14; });
      ctx.restore();
      // 标尺放大
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; D.roundRect(ctx, 470, 230, 512, 186, 14); ctx.fill(); ctx.stroke();
      D.text(ctx, '标尺和游码（放大）', 490, 258, { size: F(14), weight: 700, color: '#495057' });
      M.rider(ctx, F, 520, 360, 410, { max: 5, div: st.div, rider: st.r });
      D.text(ctx, '读游码左边缘对应的刻度', 726, 404, { size: F(12), color: '#a35a00', align: 'center' });
    }
    newQ();
  });

  /* ================= 天平使用中的问题（误差分析） ================= */
  const TRUE_M = 36.4;
  const CASES = [
    { key: 'zero', label: '游码没归零', s1: { rider: 0.4, note: '游码在 0.4 g 处，就调节平衡螺母使横梁平衡', mark: 'rider' }, s2: { w: [20, 10, 5], rider: 1.8 },
      q: '测得的质量比真实质量', opts: ['偏大', '偏小', '相等'], ans: 0,
      why: '调平衡时游码已经在 0.4 g 处，相当于右盘<b>先放了 0.4 g</b>。测量时读数 = 20 g + 10 g + 5 g + 1.8 g = <b>36.8 g</b>，比真实质量 36.4 g 大 0.4 g。所以调平衡前一定要先把游码<b>移到零刻度线</b>。' },
    { key: 'worn', label: '砝码磨损', s1: { rider: 0, note: '天平已正确调平；但 20 g 的砝码磨损了，实际只有 19.6 g' }, s2: { w: [20, 10, 5], rider: 1.8, worn: 20 },
      q: '测得的质量比真实质量', opts: ['偏大', '偏小', '相等'], ans: 0,
      why: '磨损的砝码实际质量比标的小，要多加一些砝码（或多移游码）才能平衡。读数 36.8 g（按标示值计算），真实质量只有 19.6 + 10 + 5 + 1.8 = 36.4 g，所以<b>偏大</b>。' },
    { key: 'rust', label: '砝码生锈、沾油污', s1: { rider: 0, note: '天平已正确调平；但 20 g 的砝码生锈了，实际有 20.4 g' }, s2: { w: [20, 10, 5], rider: 1.0, rust: 20 },
      q: '测得的质量比真实质量', opts: ['偏大', '偏小', '相等'], ans: 1,
      why: '生锈、沾油污的砝码实际质量比标的大，少加一些就平衡了。读数 = 35 g + 1.0 g = 36.0 g，真实质量 20.4 + 10 + 5 + 1.0 = 36.4 g，所以<b>偏小</b>。要用镊子夹取砝码，保持砝码干净、干燥。' },
    { key: 'left', label: '指针偏左就开始测', s1: { rider: 0, tilt: 0.4, note: '调平衡时指针偏左（左盘偏重 0.4 g），没调好就开始测量', mark: 'pointer' }, s2: { w: [20, 10, 5], rider: 1.8 },
      q: '测得的质量比真实质量', opts: ['偏大', '偏小', '相等'], ans: 0,
      why: '指针偏左说明空天平左盘就重一些，测量时右盘要<b>多加</b>砝码才能平衡。读数 36.8 g 比真实质量 36.4 g 偏大。（反过来，指针偏右就测量，结果偏小。）' },
    { key: 'rev', label: '物体和砝码放反', s1: { rider: 0, note: '天平已正确调平；测量时把物体放在了右盘，砝码放在左盘' }, s2: { w: [20, 20], rider: 3.6, rev: true },
      q: '如果仍按“砝码 + 游码”读数，结果比真实质量', opts: ['偏大', '偏小', '相等'], ans: 0,
      why: '游码相当于加在<b>右盘</b>的小砝码。物体在右盘时：m<sub>砝</sub> = m<sub>物</sub> + m<sub>游</sub>，所以 m<sub>物</sub> = 40 g − 3.6 g = <b>36.4 g</b>；按“砝码 + 游码”读成 43.6 g，偏大。没有用游码时，放反了也能测对。' },
    { key: 'nut', label: '测量时调平衡螺母', s1: { rider: 0, note: '天平已正确调平' }, s2: { w: [20, 10, 5], rider: 0, nut: 0.8, mark: 'nut' },
      q: '测量时发现指针偏左，于是把平衡螺母向右拧，直到横梁平衡，读出 35 g。这个结果', opts: ['偏大', '偏小', '准确'], ans: 1,
      why: '平衡螺母<b>只在测量前调节横梁平衡时使用</b>。测量时拧螺母，相当于往右盘加了“看不见的砝码”，读数 35 g 比真实质量 36.4 g 偏小。测量中指针偏左，应<b>加砝码或向右移动游码</b>。' },
  ];
  PS.register('balance-errors', function (el) {
    const VW = 1000, VH = 370;
    let cur = 0, answered = false;
    const seg = PS.ui.seg(CASES.map((c, i) => ({ value: i, label: c.label })), 0, (v) => { cur = v; show(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const box = h('div', { class: 'ms-q' });
    el.append(box);
    let reveal = 0, beam1 = M.beam(), beam2 = M.beam();
    function show() {
      answered = false; reveal = 0;
      const c = CASES[cur];
      box.innerHTML = '';
      const fb = h('div', { class: 'feedback' });
      const opts = h('div', { class: 'q-options cols-3' }, c.opts.map((o, i) => {
        const b = h('button', { type: 'button', class: 'q-opt', html: o });
        b.addEventListener('click', () => {
          if (answered) return; answered = true; reveal = 1;
          opts.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === c.ans) x.classList.add('right'); });
          if (i !== c.ans) b.classList.add('wrong');
          fb.className = 'feedback show ' + (i === c.ans ? 'ok' : 'bad');
          fb.innerHTML = (i === c.ans ? '✔ ' : '✘ 应选“' + c.opts[c.ans] + '”。') + c.why;
          i === c.ans ? PS.sound.good() : PS.sound.bad();
          S.render();
        });
        return b;
      }));
      box.append(h('div', { html: '<b>物体的真实质量是 ' + TRUE_M + ' g。</b>' + c.q + '（　）' }), opts, fb);
      S.render();
    }
    function weights(ctx, x, y, ws, c) {
      const list = ws.slice().sort((a, b) => b - a);
      let tot = list.reduce((s, g) => s + M.weightSize(g)[0] + 2, -2), xx = x - tot / 2;
      list.forEach((g, i) => {
        const ww = M.weightSize(g)[0], cx = xx + ww / 2;
        M.weight(ctx, cx, y, g);
        if (i === 0 && c.s2.worn === g) { ctx.fillStyle = '#f8fafd'; ctx.beginPath(); ctx.arc(cx + ww / 2, y - 10, 6, 0, TAU); ctx.fill(); }
        if (i === 0 && c.s2.rust === g) { ctx.fillStyle = 'rgba(160,70,20,.85)'; [[-5, -8], [4, -14], [-2, -20], [6, -5]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(cx + dx, y + dy, 2.6, 0, TAU); ctx.fill(); }); }
        xx += ww + 2;
      });
    }
    const obj = (ctx, x, y) => M.block(ctx, x - 22, y, 38, 26, PS.MAT.al);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const c = CASES[cur];
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, 336, VW, 34);
      ctx.strokeStyle = '#dee2e6'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(500, 20); ctx.lineTo(500, 330); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '① 测量前：调节横梁平衡', 250, 30, { size: F(16), weight: 800, color: '#3b5bdb', align: 'center' });
      D.text(ctx, '② 测量：天平平衡后读数', 750, 30, { size: F(16), weight: 800, color: '#e8590c', align: 'center' });
      M.balance(ctx, F, { x: 250, y: 338, s: 0.95, tilt: beam1.a, rider: c.s1.rider, hl: c.s1.mark });
      const s2 = c.s2;
      M.balance(ctx, F, { x: 750, y: 338, s: 0.95, tilt: beam2.a, rider: s2.rider, nut: s2.nut || 0, hl: s2.mark,
        left: s2.rev ? { draw: (ctx2, x, y) => weights(ctx2, x, y, s2.w, c) } : { draw: obj },
        right: s2.rev ? { draw: obj } : { draw: (ctx2, x, y) => weights(ctx2, x, y, s2.w, c) } });
      D.text(ctx, c.s1.note, 250, 62, { size: F(13), color: '#1b2333', align: 'center', bg: '#fff' });
      const sum = s2.w.reduce((a, b) => a + b, 0);
      D.text(ctx, '砝码 ' + s2.w.slice().sort((a, b) => b - a).join(' g + ') + ' g' + (s2.rider ? '，游码 ' + M.fmt(s2.rider) + ' g' : '，游码 0 g'), 750, 62, { size: F(13), color: '#1b2333', align: 'center', bg: '#fff' });
      if (s2.worn) D.text(ctx, '20 g 砝码磨损 → 实际 19.6 g', 750, 92, { size: F(12), weight: 700, color: '#e03131', align: 'center' });
      if (s2.rust) D.text(ctx, '20 g 砝码生锈 → 实际 20.4 g', 750, 92, { size: F(12), weight: 700, color: '#e03131', align: 'center' });
      if (s2.nut) D.text(ctx, '平衡螺母被拧向右边了', 750, 92, { size: F(12), weight: 700, color: '#e03131', align: 'center' });
      if (c.s1.mark === 'pointer') D.text(ctx, '指针偏左', 250, 296, { size: F(12), weight: 700, color: '#e03131', align: 'center', bg: '#fff' });
      if (c.s1.mark === 'rider') D.text(ctx, '游码不在零刻度线！', 220, 120, { size: F(12), weight: 700, color: '#e03131', align: 'center', bg: '#fff' });
      if (reveal) {
        const read = s2.rev ? sum + s2.rider : sum + s2.rider;
        D.text(ctx, '读数 ' + M.fmt(read) + ' g，真实 ' + TRUE_M + ' g', 750, 120, { size: F(14), weight: 800, color: Math.abs(read - TRUE_M) < 1e-6 ? '#2b8a3e' : '#e03131', align: 'center', bg: '#fff4e6' });
      }
    }
    const loop = PS.loop((dt) => {
      const c = CASES[cur];
      beam1.step(dt, c.s1.tilt || 0);
      beam2.step(dt, 0);
      S.render();
    }, el);
    show();
    loop.start();
  });
})();
