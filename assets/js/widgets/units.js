/* 第1节：尺度之旅、单位换算阶梯 */
(function () {
  'use strict';
  const { h } = PS;

  /* ================= 尺度之旅 ================= */
  const ITEMS = [
    { name: 'DNA 双螺旋的直径', icon: '🧬', m: 2e-9, note: '遗传物质 DNA 是一条极细的“双螺旋”。' },
    { name: '病毒', icon: '🦠', m: 1e-7, note: '多数病毒只有几十到几百纳米，要用电子显微镜才能看见。' },
    { name: '细菌（大肠杆菌）', icon: '🔬', m: 2e-6, note: '细菌长约几微米，用光学显微镜可以看到。' },
    { name: '红细胞的直径', icon: '🔴', m: 7e-6, note: '血液里的红细胞像一个个小圆饼。' },
    { name: '头发丝的直径', icon: '〰️', m: 7e-5, note: '一根头发丝大约 0.07 mm 粗。' },
    { name: '一张纸的厚度', icon: '📄', m: 1e-4, note: '一张普通纸约 0.1 mm 厚，用“累积法”才能测出来。' },
    { name: '蚂蚁的体长', icon: '🐜', m: 5e-3, note: '常见的小蚂蚁体长约 5 mm。' },
    { name: '一元硬币的直径', icon: '<span class="coin-ico">1</span>', m: 0.025, note: '一元硬币的直径是 2.5 cm。' },
    { name: '物理课本的长度', icon: '📘', m: 0.26, note: '八年级物理课本长约 26 cm。' },
    { name: '中学生的身高', icon: '🚶', m: 1.6, note: '中学生身高约 1.6 m（160 cm）。' },
    { name: '教学楼的高度', icon: '🏫', m: 20, note: '一层楼约 3 m，六层教学楼约 20 m。' },
    { name: '标准跑道一圈', icon: '🏃', m: 400, note: '学校标准田径跑道一圈 400 m。' },
    { name: '珠穆朗玛峰的高度', icon: '🏔️', m: 8848.86, note: '世界最高峰，2020 年测得海拔 8848.86 m。' },
    { name: '地球的直径', icon: '🌍', m: 1.27e7, note: '地球直径约 12 700 km。' },
  ];
  const UNITS = [
    { u: 'km', e: 3 }, { u: 'm', e: 0 }, { u: 'dm', e: -1 }, { u: 'cm', e: -2 },
    { u: 'mm', e: -3 }, { u: 'μm', e: -6 }, { u: 'nm', e: -9 },
  ];
  const MIN_E = -9, MAX_E = 8;

  function bestUnit(m) {
    for (const U of UNITS) {
      const v = m / Math.pow(10, U.e);
      if (v >= 1 && v < 1000) return U;
    }
    return m >= 1000 ? UNITS[0] : UNITS[UNITS.length - 1];
  }

  PS.register('scale-journey', function (el) {
    let idx = 7;
    const axis = h('div', { class: 'sj-axis' });
    const track = h('div', { class: 'sj-track' });
    axis.append(track);
    // 刻度
    const decadeLabel = (e) => {
      const map = { '-9': '1 nm', '-8': '10 nm', '-7': '100 nm', '-6': '1 μm', '-5': '10 μm', '-4': '100 μm', '-3': '1 mm', '-2': '1 cm', '-1': '1 dm', '0': '1 m', '1': '10 m', '2': '100 m', '3': '1 km', '4': '10 km', '5': '100 km', '6': '1000 km', '7': '10⁴ km', '8': '10⁵ km' };
      return map[e];
    };
    const pct = (m) => ((Math.log10(m) - MIN_E) / (MAX_E - MIN_E)) * 100;
    for (let e = MIN_E; e <= MAX_E; e++) {
      const t = h('div', { class: 'sj-tick' + ([-9, -6, -3, 0, 3].includes(e) ? ' major' : ''), style: { left: pct(Math.pow(10, e)) + '%' } },
        h('span', null, decadeLabel(e)));
      track.append(t);
    }
    // 物体标记（自动分行避免重叠）
    const rowsLast = [-99, -99, -99];
    const markers = ITEMS.map((it, i) => {
      const p = pct(it.m);
      let row = rowsLast.findIndex((last) => p - last > 7.5);
      if (row < 0) row = 0;
      rowsLast[row] = p;
      const mk = h('button', { type: 'button', class: 'sj-mark row' + row, style: { left: p + '%' }, title: it.name, html: '<i>' + it.icon + '</i>' });
      mk.addEventListener('click', () => select(i));
      track.append(mk);
      return mk;
    });
    const cursor = h('div', { class: 'sj-cursor' });
    track.append(cursor);

    const card = h('div', { class: 'sj-card' });
    const prev = PS.ui.button('◀ 更小', () => select(Math.max(0, idx - 1)), 'btn btn-sm');
    const next = PS.ui.button('更大 ▶', () => select(Math.min(ITEMS.length - 1, idx + 1)), 'btn btn-sm');
    let tourTimer = null;
    const tour = PS.ui.button('▶ 自动漫游', () => {
      if (tourTimer) { stopTour(); return; }
      tour.innerHTML = '⏸ 停止漫游';
      select(0);
      tourTimer = setInterval(() => {
        if (idx >= ITEMS.length - 1) { stopTour(); return; }
        select(idx + 1);
      }, 2200);
    }, 'btn btn-sm btn-primary');
    function stopTour() { clearInterval(tourTimer); tourTimer = null; tour.innerHTML = '▶ 自动漫游'; }

    function select(i) {
      idx = i;
      const it = ITEMS[i];
      markers.forEach((m, k) => m.classList.toggle('on', k === i));
      cursor.style.left = pct(it.m) + '%';
      const bu = bestUnit(it.m);
      const conv = UNITS.map((U) => {
        const v = it.m / Math.pow(10, U.e);
        return h('div', { class: 'sj-u' + (U === bu ? ' best' : '') }, h('b', { html: PS.pretty(v, 4) }), h('span', null, U.u));
      });
      const prevIt = ITEMS[i - 1];
      const ratio = prevIt ? it.m / prevIt.m : 0;
      card.innerHTML = '';
      card.append(
        h('div', { class: 'sj-big', html: it.icon }),
        h('div', { class: 'sj-info' },
          h('div', { class: 'sj-name' }, it.name),
          h('div', { class: 'sj-val', html: '约 ' + PS.pretty(it.m / Math.pow(10, bu.e), 4) + ' ' + bu.u + ' <small>= ' + PS.sci(it.m, 3) + ' m</small>' }),
          h('div', { class: 'sj-note', html: it.note + (prevIt ? ' 它约是“' + prevIt.name + '”的 <b>' + PS.pretty(ratio, 2) + '</b> 倍。' : '') }),
          h('div', { class: 'sj-conv' }, conv)
        )
      );
    }

    el.append(h('div', { class: 'sj' }, axis, card, PS.ui.row(prev, next, tour, h('span', { class: 'kbd-hint' }, '点击数轴上的图标，或用按钮在不同尺度之间穿梭；绿色框是最合适的单位。'))));
    select(idx);
  });

  /* ================= 单位换算阶梯 ================= */
  const LADDERS = {
    length: {
      name: '长度',
      units: [
        { u: 'km', f: 1e3 }, { u: 'm', f: 1 }, { u: 'dm', f: 0.1 }, { u: 'cm', f: 0.01 },
        { u: 'mm', f: 1e-3 }, { u: 'μm', f: 1e-6 }, { u: 'nm', f: 1e-9 },
      ],
      steps: ['×10³', '×10', '×10', '×10', '×10³', '×10³'],
      def: { v: 2.5, from: 'm', to: 'cm' },
    },
    time: {
      name: '时间',
      units: [{ u: 'h', f: 3600 }, { u: 'min', f: 60 }, { u: 's', f: 1 }],
      steps: ['×60', '×60'],
      def: { v: 1.5, from: 'h', to: 's' },
    },
  };

  function factorHTML(f) {
    // f = 换算倍数（目标单位个数 / 原单位）
    const e = Math.log10(f);
    if (Math.abs(e - Math.round(e)) < 1e-9) {
      const n = Math.round(e);
      if (n >= 0 && n <= 3) return String(Math.pow(10, n));
      if (n < 0 && n >= -3) return '<span class="frac"><span>1</span><span>' + Math.pow(10, -n) + '</span></span>';
      return '10<sup>' + (n < 0 ? '−' : '') + Math.abs(n) + '</sup>';
    }
    if (f >= 1) return String(PS.round(f, 6));
    const inv = 1 / f;
    if (Math.abs(inv - Math.round(inv)) < 1e-9) return '<span class="frac"><span>1</span><span>' + Math.round(inv) + '</span></span>';
    return PS.pretty(f, 6);
  }

  PS.register('unit-ladder', function (el, opts) {
    const kind = opts.kind || 'length';
    const L = LADDERS[kind];
    const ladder = h('div', { class: 'ul-ladder' });
    const boxes = [];
    const arrows = [];
    L.units.forEach((U, i) => {
      const b = h('div', { class: 'ul-unit' }, U.u);
      boxes.push(b);
      ladder.append(b);
      if (i < L.steps.length) {
        const a = h('div', { class: 'ul-arrow', html: '<span>' + L.steps[i] + '</span><i>→</i>' });
        arrows.push(a);
        ladder.append(a);
      }
    });
    const opt = (sel) => L.units.map((U) => h('option', { value: U.u, selected: U.u === sel ? true : null }, U.u));
    const vIn = h('input', { type: 'text', class: 'num', value: L.def.v, inputmode: 'decimal' });
    const fromSel = h('select', null, opt(L.def.from));
    const toSel = h('select', null, opt(L.def.to));
    const swap = PS.ui.button('⇄', () => { const t = fromSel.value; fromSel.value = toSel.value; toSel.value = t; update(); }, 'btn btn-sm');
    const result = h('div', { class: 'ul-result' });
    const hint = h('div', { class: 'ul-hint' });

    function update() {
      const v = parseFloat(String(vIn.value).replace('−', '-'));
      const fi = L.units.findIndex((U) => U.u === fromSel.value);
      const ti = L.units.findIndex((U) => U.u === toSel.value);
      boxes.forEach((b, i) => {
        b.classList.toggle('from', i === fi);
        b.classList.toggle('to', i === ti);
        b.classList.toggle('path', i > Math.min(fi, ti) && i < Math.max(fi, ti));
      });
      arrows.forEach((a, i) => {
        const on = i >= Math.min(fi, ti) && i < Math.max(fi, ti);
        a.classList.toggle('on', on);
        a.classList.toggle('rev', on && ti < fi);
      });
      if (isNaN(v)) { result.innerHTML = '请输入一个数'; return; }
      const f = L.units[fi].f / L.units[ti].f;
      const r = v * f;
      const vStr = String(v);
      if (fi === ti) {
        result.innerHTML = vStr + ' ' + L.units[fi].u + ' = ' + vStr + ' ' + L.units[ti].u;
        hint.innerHTML = '';
        return;
      }
      result.innerHTML = '<span class="ul-eq">' + vStr + ' ' + L.units[fi].u + '</span> = <span class="ul-eq">' + vStr +
        ' × ' + factorHTML(f) + ' ' + L.units[ti].u + '</span> = <span class="ul-eq ans">' + PS.pretty(r, 6) + ' ' + L.units[ti].u + '</span>';
      hint.innerHTML = fi < ti
        ? '大单位 → 小单位：数值<b>变大</b>，乘以进率。'
        : '小单位 → 大单位：数值<b>变小</b>，乘以进率的倒数（或除以进率）。';
    }
    [vIn, fromSel, toSel].forEach((x) => x.addEventListener('input', update));

    // 换算挑战
    const chQ = h('span', { class: 'ul-q' });
    const chIn = h('input', { type: 'text', class: 'num', placeholder: '答案', inputmode: 'decimal' });
    const chFb = h('span', { class: 'q-fb' });
    let cur = null;
    function newQ() {
      let fi, ti;
      do { fi = PS.randInt(0, L.units.length - 1); ti = PS.randInt(0, L.units.length - 1); } while (fi === ti || Math.abs(fi - ti) > (kind === 'length' ? 3 : 2));
      const vals = kind === 'length' ? [1.5, 2, 2.5, 3.6, 4, 5, 7.2, 12, 25, 36, 60, 80, 150, 300, 450] : [0.5, 1.5, 2, 3, 90, 120, 180, 30, 45, 7200, 1800, 5400];
      const v = PS.pick(vals);
      cur = { v, fi, ti, ans: v * L.units[fi].f / L.units[ti].f };
      chQ.innerHTML = v + ' ' + L.units[fi].u + ' = ? ' + L.units[ti].u;
      chIn.value = ''; chIn.className = 'num'; chFb.textContent = ''; chFb.className = 'q-fb';
    }
    function check() {
      if (!cur) return;
      const raw = chIn.value.trim().replace(/[，,\s]/g, '').replace(/[×x]10\^?/i, 'e');
      const v = parseFloat(raw);
      const ok = !isNaN(v) && Math.abs(v - cur.ans) <= Math.abs(cur.ans) * 1e-6;
      chIn.className = 'num ' + (ok ? 'ok' : 'bad');
      chFb.className = 'q-fb ' + (ok ? 'ok' : 'bad');
      chFb.innerHTML = ok ? '✔ 正确！' : '✘ 应为 ' + PS.pretty(cur.ans, 6) + ' ' + L.units[cur.ti].u;
      ok ? PS.sound.good() : PS.sound.bad();
    }
    chIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });

    el.append(
      ladder,
      h('div', { class: 'ul-form' }, vIn, fromSel, swap, h('span', null, '换算成'), toSel),
      result, hint,
      h('div', { class: 'ul-challenge' },
        h('b', null, '🎯 换算挑战：'), chQ, chIn,
        PS.ui.button('检查', check, 'btn btn-sm btn-primary'),
        PS.ui.button('换一题', newQ, 'btn btn-sm'), chFb,
        h('div', { class: 'kbd-hint' }, '很大或很小的数可以写成 2.5e5（表示 2.5×10⁵）')
      )
    );
    update();
    newQ();
  });

  /* ---------- 组件样式（就近注入，方便维护） ---------- */
  const css = `
  .sj-axis{position:relative;padding:86px 10px 34px;background:linear-gradient(180deg,#f8fbff,#fff);border:1px solid var(--line);border-radius:12px;overflow:hidden}
  .sj-track{position:relative;height:4px;background:linear-gradient(90deg,#a5d8ff,#4dabf7 30%,#3b5bdb 60%,#1864ab);border-radius:4px}
  .sj-tick{position:absolute;top:-3px;width:1px;height:10px;background:#7d8aa5}
  .sj-tick span{position:absolute;top:13px;left:50%;transform:translateX(-50%);font-size:10.5px;color:var(--muted);white-space:nowrap}
  .sj-tick.major{height:14px;top:-5px;background:#1b2333}
  .sj-tick.major span{font-weight:700;color:var(--ink);font-size:11.5px}
  .sj-tick:nth-child(even):not(.major) span{display:none}
  .sj-mark{position:absolute;bottom:10px;transform:translateX(-50%);border:0;background:none;cursor:pointer;padding:0;font-size:22px;line-height:1;transition:transform .2s}
  .sj-mark::after{content:"";position:absolute;left:50%;top:100%;width:1px;background:#b5bfd3}
  .sj-mark.row0{bottom:12px}.sj-mark.row0::after{height:0}
  .sj-mark.row1{bottom:40px}.sj-mark.row1::after{height:28px}
  .sj-mark.row2{bottom:66px}.sj-mark.row2::after{height:54px}
  .sj-mark i{font-style:normal;display:block;filter:saturate(1.1)}
  .sj-mark:hover,.sj-mark.on{transform:translateX(-50%) scale(1.35)}
  .sj-mark.on i{filter:drop-shadow(0 0 6px rgba(240,140,0,.8))}
  .sj-cursor{position:absolute;top:-9px;width:16px;height:22px;transform:translateX(-50%);border-radius:5px;border:3px solid var(--accent);background:rgba(240,140,0,.15);transition:left .5s cubic-bezier(.4,1.4,.6,1)}
  .sj-card{display:flex;gap:18px;align-items:center;margin-top:14px;background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:16px 18px;min-height:150px}
  .sj-big{font-size:64px;line-height:1;width:90px;text-align:center;flex:none;animation:sjpop .4s}
  @keyframes sjpop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
  .sj-name{font-weight:800;font-size:1.15rem}
  .sj-val{font-size:1.5rem;font-weight:800;color:var(--primary)}
  .sj-val small{font-size:.9rem;color:var(--muted);font-weight:600}
  .sj-note{color:var(--ink-2);font-size:.93rem;margin:2px 0 8px}
  .sj-conv{display:flex;flex-wrap:wrap;gap:6px}
  .sj-u{background:#fff;border:1px solid var(--line);border-radius:8px;padding:2px 9px;font-size:.84rem;display:flex;gap:4px;align-items:baseline}
  .sj-u b{font-variant-numeric:tabular-nums}
  .sj-u span{color:var(--muted)}
  .sj-u.best{border-color:var(--green);background:var(--green-soft)}
  .sj-u.best span{color:var(--green);font-weight:700}
  .coin-ico{display:inline-grid;place-items:center;width:1em;height:1em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff7d1,#e9c46a 55%,#b88a1e);color:#7a5a07;font-weight:900;font-size:.62em;box-shadow:inset 0 0 0 .07em #c9a227;font-family:Georgia,serif;vertical-align:middle}
  .sj-big .coin-ico{width:1em;height:1em;font-size:1em}
  .sj-big .coin-ico{font-size:64px}
  .ul-ladder{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:14px}
  .ul-unit{min-width:52px;text-align:center;padding:8px 10px;border-radius:10px;background:var(--surface-2);border:2px solid var(--line);font-weight:800;font-size:1.05rem;transition:all .2s}
  .ul-unit.path{border-color:#91a7ff;background:var(--primary-soft)}
  .ul-unit.from{border-color:var(--accent);background:var(--accent-soft);color:#a35a00}
  .ul-unit.to{border-color:var(--green);background:var(--green-soft);color:var(--green)}
  .ul-arrow{display:flex;flex-direction:column;align-items:center;font-size:.78rem;color:var(--muted);line-height:1.1;min-width:40px}
  .ul-arrow i{font-style:normal;font-size:1.1rem}
  .ul-arrow.on{color:var(--primary);font-weight:800}
  .ul-arrow.on.rev i{transform:scaleX(-1)}
  .ul-form{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .ul-result{margin-top:12px;font-size:1.25rem;font-weight:700;background:var(--surface-2);border-radius:10px;padding:10px 14px;border:1px dashed var(--line-2)}
  .ul-eq.ans{color:var(--green)}
  .ul-hint{font-size:.9rem;color:var(--muted);margin-top:6px}
  .ul-challenge{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px dashed var(--line)}
  .ul-q{font-weight:800;font-size:1.05rem;color:var(--primary)}
  .ul-challenge .kbd-hint{width:100%}
  @media (max-width:720px){.sj-card{flex-direction:column;text-align:center}.sj-conv{justify-content:center}.sj-tick span{font-size:9px}.sj-tick:not(.major) span{display:none}}
  `;
  document.head.append(h('style', null, css));
})();
