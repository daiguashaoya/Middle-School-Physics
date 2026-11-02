/* 第6章第2节：密度——探究质量与体积的关系、密度表、密度公式计算器、m–V 图像、溢水杯（等体积）、密度计算随机练习。依赖 mass.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, M = PS.mass;
  const TAU = Math.PI * 2;
  const sup3 = 'cm³';

  /* ================= 探究同种物质的质量与体积的关系 ================= */
  const MV_MAT = [
    { key: 'wax', name: '石蜡', rho: 0.9, mat: PS.MAT.wax, pc: '#f08c00' },
    { key: 'wood', name: '干松木', rho: 0.5, mat: PS.MAT.wood, pc: '#8d5a2b', grain: true },
    { key: 'al', name: '铝', rho: 2.7, mat: PS.MAT.al, pc: '#3b5bdb' },
  ];
  const MV_V = [10, 20, 30, 40];
  PS.register('mv-lab', function (el, opts) {
    const lab = !!opts.lab;
    const VW = 1000, VH = 380, GX0 = 650, GX1 = 970, GY0 = 336, GY1 = 34, VMAX = 50, MMAX = 120;
    const st = { mi: 0, on: null, rows: [], line: true, anim: 0 };
    const mSeg = PS.ui.seg(MV_MAT.map((m, i) => ({ value: i, label: m.name + '块' })), 0, (v) => { st.mi = v; st.on = null; upd(); });
    const lineT = PS.ui.toggle('连线（图像）', true, (v) => { st.line = v; S.render(); });
    el.append(PS.ui.row(mSeg.el, lineT.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'ms-msg' });
    const recB = PS.ui.button('📝 记录这组数据', record, 'btn btn-primary btn-sm');
    el.append(h('div', { class: 'controls' }, recB, PS.ui.button('清空记录', () => { st.rows = []; table(); S.render(); }, 'btn btn-ghost btn-sm')), msg);
    const tbody = h('tbody');
    const ana = h('div', { class: 'small' });
    el.append(h('div', { class: 'grid-2', style: { marginTop: '10px', alignItems: 'start' } },
      h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '物质'), h('th', { html: '体积 V/' + sup3 }), h('th', null, '质量 m/g'), h('th', { html: '<span class="frac"><span>m</span><span>V</span></span> /(g·cm⁻³)' }))), tbody)),
      h('div', { class: 'panel' }, h('h4', null, lab ? '分析论证' : '你发现了什么？'), ana)));
    const pos = () => { // 架子上四块的位置
      let x = 40; return MV_V.map((v) => { const w = (v / 10) * 22; const p = { x, w, v }; x += w + 22; return p; });
    };
    const SC = { x: 480, y: VH - 18, w: 230 };
    PS.drag(S, { VW, VH, hit: (p) => { const P = pos(); const i = P.findIndex((q) => p.x >= q.x - 6 && p.x <= q.x + q.w + 10 && p.y > 200 && p.y < 300); if (i >= 0) return i; if (st.on != null && Math.abs(p.x - SC.x) < 90 && p.y > 160 && p.y < 300) return 'back'; return null; },
      start: (i) => { if (i === 'back') st.on = null; else st.on = st.on === i ? null : i; st.anim = 0; PS.sound.tick(); upd(); }, move() {} });

    function record() {
      if (st.on == null) { msg.className = 'ms-msg bad'; msg.innerHTML = '先点击架子上的一块，把它放到电子天平上。'; return; }
      const m = MV_MAT[st.mi], V = MV_V[st.on];
      if (st.rows.some((r) => r.mi === st.mi && r.V === V)) { msg.className = 'ms-msg'; msg.innerHTML = '这组数据已经记录过了，换一块试试。'; return; }
      st.rows.push({ mi: st.mi, V, m: PS.round(m.rho * V, 1) });
      st.rows.sort((a, b) => a.mi - b.mi || a.V - b.V);
      PS.sound.good();
      table(); upd();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, MV_MAT[r.mi].name), h('td', null, String(r.V)), h('td', null, PS.fmt(r.m, 1)), h('td', null, h('b', { style: { color: MV_MAT[r.mi].pc } }, PS.fmt(r.m / r.V, 2))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据')));
      analysis();
    }
    function analysis() {
      const by = MV_MAT.map((m, i) => st.rows.filter((r) => r.mi === i));
      const enough = by.filter((r) => r.length >= 3).length;
      let s = '';
      if (enough === 0) s = '每种物质至少测 <b>3 块</b>体积不同的样品，把数据记入表格，再看看图像。<br>这里用电子天平测质量；规则长方体的体积已用刻度尺测出（V = 长 × 宽 × 高）。';
      else {
        s = by.map((r, i) => r.length >= 2 ? '<b style="color:' + MV_MAT[i].pc + '">' + MV_MAT[i].name + '</b>：m/V 都等于 <b>' + MV_MAT[i].rho + '</b> g/cm³，图像是过原点的直线。' : '').filter(Boolean).join('<br>');
        if (enough >= 2) s += '<div class="tip tip-good" style="margin:8px 0 0">结论：<b>同种物质</b>的质量与体积成正比，质量与体积的<b>比值一定</b>；<b>不同物质</b>，质量与体积的比值一般<b>不同</b>。这个比值反映了物质的一种特性——<b>密度</b>。</div>';
        else s += '<br><span class="muted">再换一种物质测一测，比较它们的比值。</span>';
      }
      ana.innerHTML = s;
    }
    function upd() {
      const m = MV_MAT[st.mi];
      if (st.on == null) { msg.className = 'ms-msg'; msg.innerHTML = '点击架子上的' + m.name + '块，把它放到电子天平上称质量。'; }
      else { msg.className = 'ms-msg info'; msg.innerHTML = '体积 V = ' + MV_V[st.on] + ' ' + sup3 + '，电子天平示数 m = <b>' + PS.fmt(m.rho * MV_V[st.on], 1) + ' g</b>。点“记录这组数据”。'; }
      S.render();
    }
    const gx = (V) => GX0 + (V / VMAX) * (GX1 - GX0), gy = (m) => GY0 - (m / MMAX) * (GY0 - GY1);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const m = MV_MAT[st.mi];
      // 架子
      ctx.fillStyle = '#c8a97e'; ctx.fillRect(24, 290, 360, 10); ctx.fillStyle = '#a8895e'; ctx.fillRect(34, 300, 8, 60); ctx.fillRect(366, 300, 8, 60);
      D.text(ctx, m.name + '块（横截面都是 2 cm × 2.5 cm）', 30, 40, { size: F(14), weight: 700, color: '#495057' });
      pos().forEach((p, i) => {
        if (st.on === i) { ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([4, 4]); ctx.strokeRect(p.x, 290 - 34, p.w, 34); ctx.setLineDash([]); return; }
        M.block(ctx, p.x, 290, p.w, 34, m.mat, { d: 10, grain: m.grain });
        D.text(ctx, MV_V[i] + ' ' + sup3, p.x + p.w / 2 + 5, 318, { size: F(12), weight: 700, color: '#1b2333', align: 'center', bg: 'rgba(255,255,255,.9)' });
      });
      // 电子天平
      const top = M.scale(ctx, F, SC.x, SC.y, SC.w, { text: st.on == null ? '0.0' : PS.fmt(m.rho * MV_V[st.on], 1) });
      if (st.on != null) {
        const p = pos()[st.on];
        M.block(ctx, SC.x - p.w / 2 - 5, top, p.w, 34, m.mat, { d: 10, grain: m.grain });
        D.text(ctx, 'V = ' + MV_V[st.on] + ' ' + sup3, SC.x, top - 60, { size: F(14), weight: 700, color: '#1b2333', align: 'center', bg: '#fff' });
      }
      D.text(ctx, '电子天平', SC.x, VH - 2, { size: F(11), color: '#868e96', align: 'center' });
      // 图像
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1; D.roundRect(ctx, GX0 - 52, 8, GX1 - GX0 + 74, VH - 12, 12); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#eef1f6';
      for (let V = 10; V <= VMAX; V += 10) { ctx.beginPath(); ctx.moveTo(gx(V), GY0); ctx.lineTo(gx(V), GY1); ctx.stroke(); }
      for (let mm = 20; mm <= MMAX; mm += 20) { ctx.beginPath(); ctx.moveTo(GX0, gy(mm)); ctx.lineTo(GX1, gy(mm)); ctx.stroke(); }
      PS.draw.arrow(ctx, GX0, GY0, GX1 + 12, GY0, { color: '#1b2333', width: 1.6, head: 8 });
      PS.draw.arrow(ctx, GX0, GY0, GX0, GY1 - 14, { color: '#1b2333', width: 1.6, head: 8 });
      ctx.fillStyle = '#495057'; ctx.font = PS.font(F(11), 600); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let V = 10; V <= VMAX; V += 10) ctx.fillText(String(V), gx(V), GY0 + 4);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let mm = 20; mm <= MMAX; mm += 20) ctx.fillText(String(mm), GX0 - 5, gy(mm));
      ctx.fillText('O', GX0 - 4, GY0 + 8);
      D.text(ctx, 'V/' + sup3, GX1 + 14, GY0 + 20, { size: F(12), weight: 700, align: 'right' });
      D.text(ctx, 'm/g', GX0 - 6, GY1 - 18, { size: F(12), weight: 700, align: 'center' });
      MV_MAT.forEach((mt, i) => {
        const rs = st.rows.filter((r) => r.mi === i);
        if (st.line && rs.length >= 2) {
          const Vend = Math.min(VMAX, MMAX / mt.rho);
          ctx.strokeStyle = mt.pc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx(0), gy(0)); ctx.lineTo(gx(Vend), gy(mt.rho * Vend)); ctx.stroke();
          D.text(ctx, mt.name, gx(Vend) - 4, gy(mt.rho * Vend) - 8, { size: F(12), weight: 700, color: mt.pc, align: 'right' });
        }
        rs.forEach((r) => { ctx.fillStyle = mt.pc; ctx.beginPath(); ctx.arc(gx(r.V), gy(r.m), 5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); });
      });
    }
    table(); upd();
  });

  /* ================= 密度表 ================= */
  PS.register('density-table', function (el) {
    let unit = 'kg';
    let hl = [];
    const info = h('div', { class: 'ms-msg info' });
    const uSeg = PS.ui.seg([{ value: 'kg', label: '单位：kg/m³' }, { value: 'g', label: '单位：g/cm³' }], unit, (v) => { unit = v; build(); });
    const FINDS = [
      ['一般规律', [], '一般情况下，<b>固体的密度 &gt; 液体的密度 &gt; 气体的密度</b>。气体的密度大约只有固体、液体的千分之一。'],
      ['水银', ['水银'], '水银是<b>液体</b>，密度却比铜、铁、铝等大多数固体都大——“固体密度一定比液体大”是错误的。'],
      ['冰和水', ['冰（0 ℃）', '纯水'], '冰和水是<b>同一种物质</b>，状态不同，密度不同（冰 0.9×10³ kg/m³，水 1.0×10³ kg/m³）。'],
      ['煤油和酒精', ['煤油', '酒精'], '煤油和酒精是<b>不同物质</b>，密度却相同。冰和蜡、植物油的密度也都是 0.9×10³ kg/m³。所以只靠密度不一定能鉴别物质。'],
    ];
    const finds = h('div', { class: 'controls' }, h('span', { class: 'small muted' }, '发现：'), FINDS.map((f) => PS.ui.button(f[0], () => { hl = f[1]; info.innerHTML = '🔎 ' + f[2]; build(); }, 'btn btn-sm')));
    const grid = h('div', { class: 'dt-grid' });
    el.append(PS.ui.row(uSeg.el), finds, grid, info);
    function val(v, gas) {
      if (gas) return unit === 'kg' ? String(v) : PS.pretty(v / 1000, 3).replace(' × ', '×');
      if (typeof v === 'string') return unit === 'kg' ? '(' + v + ')×10³' : v;
      const t = v === 1 ? '1.0' : String(v);
      return unit === 'kg' ? t + '×10³' : t;
    }
    function build() {
      grid.innerHTML = '';
      const col2 = h('div', { class: 'dt-col' });
      [['固体', PS.RHO.solid, false, 22.5], ['液体', PS.RHO.liquid, false, 22.5], ['气体（0 ℃，标准大气压）', PS.RHO.gas, true, 2]].forEach(([t, rows, gas, max]) => {
        const tb = h('tbody');
        rows.forEach(([n, v]) => {
          const num = typeof v === 'string' ? parseFloat(v.split('~')[1]) : v;
          const tr = h('tr', { class: hl.includes(n) ? 'hl-row' : null, style: { cursor: 'pointer' } },
            h('td', { class: 'l' }, n),
            h('td', { class: 'l' }, h('div', { class: 'dt-bar' }, h('i', { style: { width: Math.max(2, (num / max) * 100) + '%', background: gas ? '#94d82d' : t === '固体' ? '#748ffc' : '#4dabf7' } }), h('span', { html: val(v, gas) }))));
          tr.addEventListener('click', () => { hl = [n]; meaning(n, v, gas); build(); });
          tb.append(tr);
        });
        (t === '固体' ? grid : col2).append(h('div', { class: 'table-wrap' }, h('table', { class: 't dt' }, h('thead', null, h('tr', null, h('th', { class: 'l' }, t), h('th', { class: 'l', html: unit === 'kg' ? 'ρ /(kg·m⁻³)' : 'ρ /(g·cm⁻³)' }))), tb)));
      });
      grid.append(col2);
    }
    function meaning(n, v, gas) {
      if (typeof v === 'string') { info.innerHTML = '🔎 ' + n + '的密度在 ' + v + '×10³ kg/m³ 之间——同一类材料，成分不同，密度会有差别。'; return; }
      const name = n.replace('（0 ℃）', '').replace('钢、铁', '铁');
      if (gas) info.innerHTML = '🔎 ' + name + '的密度是 <b>' + v + ' kg/m³</b>，表示 <b>1 m³ 的' + name + '质量是 ' + v + ' kg</b>。' + (name === '空气' ? '一间教室（约 200 m³）里的空气，质量大约有 250 kg！' : '');
      else { const t = v === 1 ? '1.0' : String(v); info.innerHTML = '🔎 ' + name + '的密度是 <b>' + t + '×10³ kg/m³ = ' + t + ' g/cm³</b>，表示 <b>1 m³ 的' + name + '质量是 ' + t + '×10³ kg</b>，也就是 1 cm³ 的' + name + '质量是 ' + t + ' g。'; }
    }
    info.innerHTML = '点击表中的物质，看看密度值的物理意义；点上面的按钮，看看密度表里藏着哪些规律。<b>1 g/cm³ = 10³ kg/m³</b>。';
    build();
    if (!document.getElementById('dt-style')) document.head.append(h('style', { id: 'dt-style' }, '.dt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-top:10px;align-items:start}.dt-col{display:flex;flex-direction:column;gap:10px}.dt td{padding:5px 8px}.dt-bar{display:flex;align-items:center;gap:8px}.dt-bar i{display:block;height:12px;border-radius:6px;flex:0 0 auto;max-width:55%}.dt-bar span{white-space:nowrap;font-variant-numeric:tabular-nums}.dt tr:hover td{background:var(--primary-soft)}'));
    // 柱宽按百分比相对整列，这里把柱子限制在单元格的一半以内
    grid.addEventListener('click', () => {});
  });

  /* ================= 密度公式计算器 ================= */
  const MU = { g: 1e-3, kg: 1, t: 1000 };
  const VU = { [sup3]: 1e-6, mL: 1e-6, L: 1e-3, 'dm³': 1e-3, 'm³': 1 };
  const RU = { 'g/cm³': 1000, 'kg/m³': 1 };
  PS.register('rho-calc', function (el) {
    let unknown = 'rho';
    const tri = h('div', { class: 'rc-tri', html: `
      <svg viewBox="0 0 220 190" width="220" height="190">
        <path d="M110 8 L212 182 L8 182 Z" fill="#e8edff" stroke="#3b5bdb" stroke-width="3" stroke-linejoin="round"/>
        <line x1="52" y1="112" x2="168" y2="112" stroke="#3b5bdb" stroke-width="3"/>
        <line x1="110" y1="112" x2="110" y2="182" stroke="#3b5bdb" stroke-width="3"/>
        <g class="rc-k" data-k="m"><circle cx="110" cy="72" r="26" fill="transparent"/><text x="110" y="84" text-anchor="middle" font-size="36" font-style="italic" font-family="Times New Roman" font-weight="700">m</text></g>
        <g class="rc-k" data-k="rho"><circle cx="66" cy="150" r="26" fill="transparent"/><text x="66" y="162" text-anchor="middle" font-size="36" font-style="italic" font-family="Times New Roman" font-weight="700">ρ</text></g>
        <g class="rc-k" data-k="V"><circle cx="154" cy="150" r="26" fill="transparent"/><text x="154" y="162" text-anchor="middle" font-size="36" font-style="italic" font-family="Times New Roman" font-weight="700">V</text></g>
        <text x="110" y="153" text-anchor="middle" font-size="22" fill="#3b5bdb">×</text>
      </svg>` });
    const FM = {
      rho: '<span class="var">ρ</span> = <span class="frac"><span class="var">m</span><span class="var">V</span></span>',
      m: '<span class="var">m</span> = <span class="var">ρ</span><span class="var">V</span>',
      V: '<span class="var">V</span> = <span class="frac"><span class="var">m</span><span class="var">ρ</span></span>',
    };
    const NAMES = { rho: '密度', m: '质量', V: '体积' };
    const sel = (opts, def) => h('select', null, Object.keys(opts).map((k) => h('option', { value: k, selected: k === def ? true : null }, k)));
    const inM = h('input', { type: 'text', class: 'num', value: '54', inputmode: 'decimal' }), uM = sel(MU, 'g');
    const inV = h('input', { type: 'text', class: 'num', value: '20', inputmode: 'decimal' }), uV = sel(VU, sup3);
    const inR = h('input', { type: 'text', class: 'num', value: '2.7', inputmode: 'decimal' }), uR = sel(RU, 'g/cm³');
    const rows = {
      m: h('div', { class: 'rc-row' }, h('label', null, '质量 m ='), inM, uM),
      V: h('div', { class: 'rc-row' }, h('label', null, '体积 V ='), inV, uV),
      rho: h('div', { class: 'rc-row' }, h('label', null, '密度 ρ ='), inR, uR),
    };
    const formula = h('div', { class: 'rc-formula' });
    const out = h('div', { class: 'rc-out' });
    function setUnknown(k) {
      unknown = k;
      tri.querySelectorAll('.rc-k').forEach((g) => g.classList.toggle('on', g.dataset.k === k));
      formula.innerHTML = '求' + NAMES[k] + '：' + FM[k];
      Object.keys(rows).forEach((r) => { rows[r].classList.toggle('unknown', r === k); rows[r].querySelector('input').disabled = r === k; });
      calc();
    }
    const P = (x) => PS.pretty(x, 4);
    function guess(rho) { // 查密度表
      const all = PS.RHO.solid.concat(PS.RHO.liquid).filter(([, v]) => typeof v === 'number');
      const hit = all.filter(([, v]) => Math.abs(v - rho / 1000) < 0.005 * Math.max(1, v)).map(([n]) => n.replace('（0 ℃）', ''));
      return hit.length ? '<span class="muted">（查密度表：可能是' + hit.join('、') + '）</span>' : '';
    }
    function calc() {
      const m = parseFloat(inM.value) * MU[uM.value], V = parseFloat(inV.value) * VU[uV.value], r = parseFloat(inR.value) * RU[uR.value];
      let s = '';
      if (unknown === 'rho') {
        if (!(m >= 0) || !(V > 0)) { out.innerHTML = '请输入有效的质量和体积'; return; }
        const x = m / V;
        const gcm = uM.value === 'g' && (uV.value === sup3 || uV.value === 'mL');
        s = gcm ? '<span class="var">ρ</span> = <span class="frac"><span class="var">m</span><span class="var">V</span></span> = <span class="frac"><span>' + inM.value + ' g</span><span>' + inV.value + ' ' + uV.value + '</span></span> = <b>' + P(x / 1000) + ' g/cm³</b> <span class="muted">= ' + P(x) + ' kg/m³</span>'
          : '<div class="muted">统一单位：m = ' + P(m) + ' kg，V = ' + P(V) + ' m³</div><span class="var">ρ</span> = <span class="frac"><span class="var">m</span><span class="var">V</span></span> = <span class="frac"><span>' + P(m) + ' kg</span><span>' + P(V) + ' m³</span></span> = <b>' + P(x) + ' kg/m³</b> <span class="muted">= ' + P(x / 1000) + ' g/cm³</span>';
        s += ' ' + guess(x);
        inR.value = PS.round(x / RU[uR.value], 6);
      } else if (unknown === 'm') {
        if (!(r > 0) || !(V >= 0)) { out.innerHTML = '请输入有效的密度和体积'; return; }
        const x = r * V;
        s = '<div class="muted">统一单位：ρ = ' + P(r) + ' kg/m³，V = ' + P(V) + ' m³（或 ρ 用 g/cm³、V 用 cm³，算出的 m 单位是 g）</div><span class="var">m</span> = <span class="var">ρ</span><span class="var">V</span> = <b>' + P(x) + ' kg</b> <span class="muted">= ' + P(x * 1000) + ' g</span>';
        inM.value = PS.round(x / MU[uM.value], 6);
      } else {
        if (!(r > 0) || !(m >= 0)) { out.innerHTML = '请输入有效的密度和质量'; return; }
        const x = m / r;
        s = '<div class="muted">统一单位：m = ' + P(m) + ' kg，ρ = ' + P(r) + ' kg/m³</div><span class="var">V</span> = <span class="frac"><span class="var">m</span><span class="var">ρ</span></span> = <b>' + P(x) + ' m³</b> <span class="muted">= ' + P(x * 1e6) + ' cm³</span>';
        inV.value = PS.round(x / VU[uV.value], 6);
      }
      out.innerHTML = s;
    }
    tri.addEventListener('click', (e) => { const g = e.target.closest('.rc-k'); if (g) setUnknown(g.dataset.k); });
    [inM, inV, inR, uM, uV, uR].forEach((x) => x.addEventListener('input', calc));
    el.append(h('div', { class: 'rc' },
      h('div', null, tri, h('div', { class: 'kbd-hint center', html: '点击三角形中的字母，<br>遮住谁就求谁' })),
      h('div', null, formula, rows.m, rows.V, rows.rho, out,
        h('div', { class: 'tip tip-warn small', html: '计算前先<b>统一单位</b>：m 用 kg、V 用 m³，ρ 的单位是 kg/m³；m 用 g、V 用 cm³，ρ 的单位是 g/cm³。<b>1 g/cm³ = 10³ kg/m³</b>，1 mL = 1 cm³，1 L = 1 dm³ = 10⁻³ m³。' }))));
    setUnknown('rho');
    if (!document.getElementById('rc-style')) document.head.append(h('style', { id: 'rc-style' }, `
      .rc{display:grid;grid-template-columns:240px minmax(0,1fr);gap:20px;align-items:start}
      .rc-tri svg{display:block;margin:0 auto}
      .rc-k{cursor:pointer}
      .rc-k text{fill:#1b2333;transition:fill .2s}
      .rc-k:hover text{fill:#3b5bdb}
      .rc-k.on circle{fill:#f08c00}
      .rc-k.on text{fill:#fff}
      .rc-formula{font-size:1.3rem;font-weight:700;margin-bottom:10px}
      .rc-row{display:flex;align-items:center;gap:8px;margin:6px 0;flex-wrap:wrap}
      .rc-row label{width:76px;font-weight:600}
      .rc-row.unknown input{background:var(--accent-soft);border-color:var(--accent);font-weight:800;color:#a35a00}
      .rc-out{margin-top:10px;font-size:1.05rem;background:var(--surface-2);border:1px dashed var(--line-2);border-radius:10px;padding:10px 14px;min-height:54px}
      .rc-out b{color:var(--green)}
      @media (max-width:720px){.rc{grid-template-columns:minmax(0,1fr)}}
    `));
  });

  /* ================= m–V 图像 ================= */
  PS.register('mv-graph', function (el) {
    const VW = 1000, VH = 400, X0 = 90, X1 = 620, Y0 = 350, Y1 = 40;
    const st = { mode: 'cmp', V: 20, q: null };
    const seg = PS.ui.seg([{ value: 'cmp', label: '比较密度' }, { value: 'cup', label: '量杯和液体' }], st.mode, (v) => { st.mode = v; newQ(); });
    el.append(PS.ui.row(seg.el, PS.ui.button('换一题', () => newQ(), 'btn btn-ghost btn-sm')));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const box = h('div', { class: 'ms-q' });
    el.append(box);
    const LINES = [['甲', '#e03131'], ['乙', '#3b5bdb'], ['丙', '#2b8a3e']];
    function newQ() {
      if (st.mode === 'cmp') {
        // 三种物质：取整齐的点
        const sets = [[[2, 1, 0.5], 40, 80], [[4, 2, 1], 20, 80], [[2.5, 1, 0.5], 40, 100], [[3, 1.5, 0.75], 40, 120], [[2.7, 1, 0.8], 50, 135]];
        const [r, vmax, mmax] = PS.pick(sets);
        st.q = { r, vmax, mmax };
        st.V = vmax / 2;
      } else {
        const rho = PS.pick([0.8, 1, 1.2]), cup = PS.pick([20, 25, 30, 40]), vmax = 80;
        st.q = { rho, cup, vmax, mmax: Math.ceil((cup + rho * vmax) / 20) * 20 + 20 };
        st.V = 40;
      }
      question();
      S.render();
    }
    function question() {
      box.innerHTML = '';
      const q = st.q;
      const fb = h('div', { class: 'feedback' });
      if (st.mode === 'cmp') {
        // 问：甲的密度 / 甲乙密度之比 / 哪一种可能是水
        const kind = PS.randInt(0, 2);
        let stem, opts, ans, why;
        const r = q.r;
        if (kind === 0) {
          stem = '由图像可知，甲物质的密度是（　）';
          const right = r[0] + ' g/cm³';
          opts = [right, PS.round(1 / r[0], 2) + ' g/cm³', r[0] * 2 + ' g/cm³', r[1] + ' g/cm³'];
          ans = 0; why = '在甲的图线上取一点：m 与 V 之比 = ' + r[0] + ' g/cm³（图线越陡，密度越大）。';
        } else if (kind === 1) {
          const k = PS.round(r[0] / r[1], 2);
          stem = '甲、乙两种物质的密度之比 ρ<sub>甲</sub> ∶ ρ<sub>乙</sub> 是（　）';
          opts = [k + ' ∶ 1', '1 ∶ ' + k, '1 ∶ 1', (k + 1) + ' ∶ 1'];
          ans = 0; why = '取相同体积 V，甲的质量是乙的 ' + k + ' 倍，所以 ρ<sub>甲</sub> ∶ ρ<sub>乙</sub> = ' + k + ' ∶ 1。';
        } else {
          stem = '体积相同时，质量最大的是______；质量相同时，体积最大的是______。';
          opts = ['甲；丙', '丙；甲', '甲；甲', '丙；丙'];
          ans = 0; why = '在横轴上取同一体积，甲的质量最大（ρ 最大）；在纵轴上取同一质量，丙的体积最大（ρ 最小）。';
        }
        // 打乱选项
        const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
        const o2 = order.map((i) => opts[i]), a2 = order.indexOf(ans);
        const ob = h('div', { class: 'q-options cols-2' }, o2.map((o, i) => {
          const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCD'[i] + '</span>' + o });
          b.addEventListener('click', () => {
            if (fb.classList.contains('show')) return;
            ob.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === a2) x.classList.add('right'); });
            if (i !== a2) b.classList.add('wrong');
            fb.className = 'feedback show ' + (i === a2 ? 'ok' : 'bad'); fb.innerHTML = (i === a2 ? '✔ ' : '✘ ') + why;
            i === a2 ? PS.sound.good() : PS.sound.bad();
          });
          return b;
        }));
        box.append(h('div', { html: '<b>拖动图中的竖线</b>，读出同一体积下三种物质的质量。' + stem }), ob, fb);
      } else {
        const i1 = h('input', { type: 'text', class: 'num', inputmode: 'decimal' }), i2 = h('input', { type: 'text', class: 'num', inputmode: 'decimal' });
        const go = () => {
          const a = parseFloat(i1.value), b = parseFloat(i2.value);
          if (isNaN(a) || isNaN(b)) return;
          const ok1 = Math.abs(a - q.cup) < 0.01, ok2 = Math.abs(b - q.rho) < 0.01;
          fb.className = 'feedback show ' + (ok1 && ok2 ? 'ok' : 'bad');
          fb.innerHTML = (ok1 && ok2 ? '✔ 全对！' : '✘ 再想想。') + '<br>① V = 0 时，m = ' + q.cup + ' g，这是<b>空量杯的质量</b>。<br>② 液体的密度要用液体的质量：取 V = ' + q.vmax / 2 + ' cm³，总质量 ' + (q.cup + q.rho * q.vmax / 2) + ' g，液体质量 = ' + (q.cup + q.rho * q.vmax / 2) + ' g − ' + q.cup + ' g = ' + q.rho * q.vmax / 2 + ' g，ρ = ' + q.rho * q.vmax / 2 + ' g ÷ ' + q.vmax / 2 + ' cm³ = <b>' + q.rho + ' g/cm³</b>。' + (ok2 ? '' : '（常见错误：直接用总质量除以体积。）');
          ok1 && ok2 ? PS.sound.good() : PS.sound.bad();
        };
        box.append(h('div', { html: '用量杯测某液体，得到“液体和量杯的总质量 m”与“液体体积 V”的关系图像。' }),
          h('div', { class: 'ms-ans' }, h('span', null, '量杯的质量是'), i1, h('span', null, 'g；液体的密度是'), i2, h('span', null, 'g/cm³'), PS.ui.button('提交', go, 'btn btn-primary btn-sm')), fb);
      }
    }
    const gx = (V) => X0 + (V / st.q.vmax) * (X1 - X0), gy = (m) => Y0 - (m / st.q.mmax) * (Y0 - Y1);
    PS.drag(S, { VW, VH, hit: (p) => (p.x > X0 - 10 && p.x < X1 + 10 && p.y > Y1 - 10 && p.y < Y0 + 10 ? 1 : null), start: (k, p) => mv(p), move: (k, p) => mv(p) });
    function mv(p) { st.V = PS.clamp(Math.round(((p.x - X0) / (X1 - X0)) * st.q.vmax / (st.q.vmax / 40)) * (st.q.vmax / 40), 0, st.q.vmax); S.render(); }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      const q = st.q;
      const stepV = q.vmax / (q.vmax % 20 === 0 && q.vmax > 40 ? 4 : q.vmax / 10 > 5 ? 5 : 4), stepM = q.mmax / (q.mmax % 20 === 0 ? (q.mmax / 20 > 8 ? q.mmax / 40 : q.mmax / 20) : 5);
      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
      for (let V = stepV; V <= q.vmax + 1e-6; V += stepV) { ctx.beginPath(); ctx.moveTo(gx(V), Y0); ctx.lineTo(gx(V), Y1); ctx.stroke(); }
      for (let m = stepM; m <= q.mmax + 1e-6; m += stepM) { ctx.beginPath(); ctx.moveTo(X0, gy(m)); ctx.lineTo(X1, gy(m)); ctx.stroke(); }
      PS.draw.arrow(ctx, X0, Y0, X1 + 22, Y0, { color: '#1b2333', width: 1.8, head: 9 });
      PS.draw.arrow(ctx, X0, Y0, X0, Y1 - 22, { color: '#1b2333', width: 1.8, head: 9 });
      ctx.fillStyle = '#495057'; ctx.font = PS.font(F(12), 600); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let V = stepV; V <= q.vmax + 1e-6; V += stepV) ctx.fillText(String(PS.round(V, 1)), gx(V), Y0 + 5);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let m = stepM; m <= q.mmax + 1e-6; m += stepM) ctx.fillText(String(PS.round(m, 1)), X0 - 6, gy(m));
      ctx.fillText('O', X0 - 6, Y0 + 10);
      D.text(ctx, 'V/cm³', X1 + 24, Y0 + 24, { size: F(13), weight: 700, align: 'right' });
      D.text(ctx, 'm/g', X0, Y1 - 28, { size: F(13), weight: 700, align: 'center' });
      const lines = st.mode === 'cmp' ? q.r.map((r, i) => ({ f: (V) => r * V, c: LINES[i][1], n: LINES[i][0] })) : [{ f: (V) => q.cup + q.rho * V, c: '#7048e8', n: '' }];
      lines.forEach((L) => {
        let Vend = q.vmax; if (L.f(Vend) > q.mmax) Vend = st.mode === 'cmp' ? q.mmax / (L.f(1)) : Vend;
        ctx.strokeStyle = L.c; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(gx(0), gy(L.f(0))); ctx.lineTo(gx(Vend), gy(L.f(Vend))); ctx.stroke();
        if (L.n) D.text(ctx, L.n, gx(Vend) + 6, gy(L.f(Vend)) + 4, { size: F(15), weight: 800, color: L.c });
      });
      // 竖线读数
      ctx.strokeStyle = '#f08c00'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx(st.V), Y0); ctx.lineTo(gx(st.V), Y1); ctx.stroke(); ctx.setLineDash([]);
      PS.handle(ctx, gx(st.V), Y0, 8, '#f08c00');
      const rx = 660;
      ctx.fillStyle = '#f8f9fa'; ctx.strokeStyle = '#dee2e6'; D.roundRect(ctx, rx, 40, 320, 310, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, 'V = ' + PS.round(st.V, 2) + ' cm³ 时', rx + 18, 74, { size: F(16), weight: 800, color: '#a35a00' });
      lines.forEach((L, i) => {
        const m = L.f(st.V), y = 112 + i * 64;
        if (m > q.mmax + 1e-6) return;
        ctx.fillStyle = L.c; ctx.beginPath(); ctx.arc(gx(st.V), gy(m), 5.5, 0, TAU); ctx.fill();
        ctx.setLineDash([3, 3]); ctx.strokeStyle = L.c; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx(st.V), gy(m)); ctx.lineTo(X0, gy(m)); ctx.stroke(); ctx.setLineDash([]);
        if (st.mode === 'cmp') {
          D.text(ctx, L.n + '：m = ' + PS.round(m, 2) + ' g', rx + 18, y, { size: F(15), weight: 700, color: L.c });
          D.text(ctx, 'm/V = ' + (st.V > 0 ? PS.round(m / st.V, 3) + ' g/cm³' : '—'), rx + 18, y + 24, { size: F(13), color: '#495057' });
        } else {
          D.text(ctx, '总质量 m = ' + PS.round(m, 2) + ' g', rx + 18, y, { size: F(15), weight: 700, color: L.c });
          D.text(ctx, 'm/V = ' + (st.V > 0 ? PS.round(m / st.V, 3) + ' g/cm³（不是密度！）' : '—'), rx + 18, y + 24, { size: F(13), color: '#495057' });
          D.text(ctx, '图线不过原点：V = 0 时也有质量', rx + 18, y + 70, { size: F(13), weight: 700, color: '#e03131' });
          D.text(ctx, '那是什么的质量？', rx + 18, y + 94, { size: F(13), weight: 700, color: '#e03131' });
        }
      });
      if (st.mode === 'cmp') D.text(ctx, '同一条图线上 m/V 不变；图线越陡，密度越大', rx + 18, 330, { size: F(12), color: '#868e96' });
    }
    newQ();
  });

  /* ================= 溢水杯：排开液体的体积等于物体的体积 ================= */
  const LIQ = [
    { key: 'alc', name: '酒精', rho: 0.8, c: 'rgba(230,240,255,.75)', s: 'rgba(120,150,200,.8)' },
    { key: 'water', name: '水', rho: 1.0, c: 'rgba(116,192,252,.5)', s: 'rgba(28,126,214,.8)' },
    { key: 'salt', name: '盐水', rho: 1.1, c: 'rgba(150,200,240,.55)', s: 'rgba(28,100,180,.8)' },
  ];
  PS.register('overflow', function (el) {
    const VW = 1000, VH = 420;
    const st = { li: 0, V: 10, p: 0, run: false, drops: [] };
    const lSeg = PS.ui.seg(LIQ.map((l, i) => ({ value: i, label: '装满' + l.name })), 0, (v) => { st.li = v; reset(); });
    const vSeg = PS.ui.seg([10, 20, 30].map((v) => ({ value: v, label: '金属块 ' + v + ' cm³' })), 10, (v) => { st.V = v; reset(); });
    const goB = PS.ui.button('⬇ 把金属块慢慢浸没', () => { if (st.p >= 1) reset(); st.run = true; loop.start(); }, 'btn btn-primary btn-sm');
    el.append(PS.ui.row(lSeg.el, vSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'ms-msg' });
    el.append(PS.ui.row(goB, PS.ui.button('↺ 重来', reset, 'btn btn-ghost btn-sm')), msg);
    function reset() { st.p = 0; st.run = false; st.drops = []; upd(); S.render(); }
    function upd() {
      const L = LIQ[st.li], m = PS.round(L.rho * st.V * st.p, 1);
      if (st.p < 1) { msg.className = 'ms-msg'; msg.innerHTML = '溢水杯里装满了' + L.name + '（ρ = ' + L.rho + ' g/cm³），下面的小烧杯放在已“去皮”的电子秤上。金属块浸没时，溢出的' + L.name + '流进小烧杯。'; return; }
      msg.className = 'ms-msg ok';
      msg.innerHTML = '溢出' + L.name + '的质量 m<sub>溢</sub> = <b>' + m + ' g</b>，体积 V<sub>溢</sub> = <span class="frac"><span>m<sub>溢</sub></span><span>ρ</span></span> = ' + m + ' g ÷ ' + L.rho + ' g/cm³ = <b>' + st.V + ' cm³</b> = V<sub>金属</sub>。<br>物体<b>浸没</b>时，溢出液体的体积等于物体的体积（体积相同时，质量与密度成正比）。换一种液体再试试。';
    }
    const loop = PS.loop((dt) => {
      if (st.run) {
        st.p = Math.min(1, st.p + dt * 0.32);
        const L = LIQ[st.li];
        if (st.p > 0.25 && st.p < 1) for (let i = 0; i < 2; i++) st.drops.push({ x: 0, y: 0, vx: 60 + Math.random() * 20, vy: 0, c: L.s });
        if (st.p >= 1) { st.run = false; upd(); PS.sound.ping(); }
      }
      st.drops.forEach((d) => { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; });
      st.drops = st.drops.filter((d) => d.y < 130);
      S.render();
      if (!st.run && !st.drops.length) loop.stop();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, VH - 20, VW, 20);
      const L = LIQ[st.li];
      // 溢水杯
      const cx = 330, by = VH - 20, cw = 180, ch = 230, top = by - ch, spoutY = top + 40;
      ctx.fillStyle = 'rgba(235,244,252,.6)'; ctx.fillRect(cx - cw / 2, top, cw, ch);
      // 金属块（细线吊着）
      const s = 34 + st.V * 1.1, bx = cx - s / 2;
      const y0 = top - s - 30, y1 = by - s - 20;
      const by2 = y0 + (y1 - y0) * Math.min(1, st.p * 1.25);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, by2); ctx.stroke();
      M.block(ctx, bx, by2 + s, s, s, PS.MAT.iron, { d: 8 });
      // 液体（液面始终在溢水口）
      ctx.fillStyle = L.c; ctx.fillRect(cx - cw / 2 + 2, spoutY, cw - 4, by - spoutY - 2);
      ctx.strokeStyle = L.s; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - cw / 2 + 2, spoutY); ctx.lineTo(cx + cw / 2 - 2, spoutY); ctx.stroke();
      ctx.strokeStyle = '#7d8ca3'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(cx - cw / 2, top); ctx.lineTo(cx - cw / 2, by); ctx.lineTo(cx + cw / 2, by); ctx.lineTo(cx + cw / 2, spoutY - 6); ctx.lineTo(cx + cw / 2 + 60, spoutY + 14); ctx.moveTo(cx + cw / 2, spoutY + 6); ctx.lineTo(cx + cw / 2 + 56, spoutY + 24); ctx.moveTo(cx + cw / 2, spoutY - 6); ctx.lineTo(cx + cw / 2, top); ctx.stroke();
      D.text(ctx, '溢水杯', cx, by + 16, { size: F(12), color: '#868e96', align: 'center' });
      // 水流
      const sx = cx + cw / 2 + 58, sy = spoutY + 20;
      ctx.fillStyle = L.s;
      st.drops.forEach((d) => { ctx.beginPath(); ctx.arc(sx + d.x * 0.25, sy + d.y, 2.6, 0, TAU); ctx.fill(); });
      if (st.run && st.p > 0.25) { ctx.strokeStyle = L.s; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 4, sy - 2); ctx.quadraticCurveTo(sx + 10, sy + 10, sx + 12, sy + 60); ctx.stroke(); }
      // 小烧杯 + 电子秤
      const scx = sx + 30;
      const pan = M.scale(ctx, F, scx, VH - 20, 200, { text: PS.fmt(L.rho * st.V * Math.max(0, (st.p - 0.25) / 0.75), 1) });
      const ov = st.V * Math.max(0, (st.p - 0.25) / 0.75);
      M.beaker(ctx, scx, pan, 96, 110, { level: Math.min(0.9, ov / 40), liquid: L.c, surface: L.s, marks: true });
      D.text(ctx, '已去皮', scx + 60, pan - 100, { size: F(11), color: '#868e96' });
      // 右侧
      const rx = 760;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dee2e6'; D.roundRect(ctx, rx, 30, 220, 200, 12); ctx.fill(); ctx.stroke();
      D.text(ctx, '金属块体积 ' + st.V + ' cm³', rx + 14, 62, { size: F(14), weight: 700 });
      D.text(ctx, L.name + '：ρ = ' + L.rho + ' g/cm³', rx + 14, 92, { size: F(14), color: '#495057' });
      D.text(ctx, '溢出 ' + PS.fmt(L.rho * ov, 1) + ' g', rx + 14, 136, { size: F(22), weight: 800, color: '#1c7ed6' });
      D.text(ctx, 'V溢 = ' + PS.fmt(ov, 1) + ' cm³', rx + 14, 172, { size: F(16), weight: 700, color: '#2b8a3e' });
      D.text(ctx, '（浸没时 V溢 = V物）', rx + 14, 202, { size: F(12), color: '#868e96' });
    }
    reset();
  });

  /* ================= 密度计算随机练习 ================= */
  const QT = [
    () => { // 求密度并鉴别
      const pool = [['金', 19.3], ['铜', 8.9], ['铁', 7.9], ['铝', 2.7], ['银', 10.5], ['铅', 11.3]];
      const [n, r] = PS.pick(pool), V = PS.pick([2, 4, 5, 10, 20]);
      return { q: '一个实心金属块的质量是 ' + PS.round(r * V, 2) + ' g，体积是 ' + V + ' cm³。它的密度是多少 g/cm³？可能是什么金属？', ans: r, unit: 'g/cm³', sol: 'ρ = m/V = ' + PS.round(r * V, 2) + ' g ÷ ' + V + ' cm³ = ' + r + ' g/cm³ = ' + r + '×10³ kg/m³，查密度表可能是<b>' + n + '</b>。' };
    },
    () => { // 瓶子装水、装酒精
      const V = PS.pick([250, 500, 550, 600, 1000]);
      return { q: '一个瓶子最多能装 ' + V + ' g 水。用它最多能装多少克酒精？（ρ<sub>酒精</sub> = 0.8×10³ kg/m³）', ans: 0.8 * V, unit: 'g', sol: '瓶子的容积 V = m<sub>水</sub>/ρ<sub>水</sub> = ' + V + ' g ÷ 1 g/cm³ = ' + V + ' cm³；装酒精 m = ρV = 0.8 g/cm³ × ' + V + ' cm³ = ' + 0.8 * V + ' g。（同一个瓶子，体积相同）' };
    },
    () => { // 单位换算
      const r = PS.pick([2.7, 7.9, 8.9, 0.8, 1.03, 13.6]);
      return Math.random() < 0.5
        ? { q: r + ' g/cm³ = ______ kg/m³', ans: r * 1000, unit: 'kg/m³', sol: '1 g/cm³ = 10³ kg/m³，所以 ' + r + ' g/cm³ = ' + PS.round(r * 1000, 2) + ' kg/m³。' }
        : { q: r + '×10³ kg/m³ = ______ g/cm³', ans: r, unit: 'g/cm³', sol: '10³ kg/m³ = 1 g/cm³，所以 ' + r + '×10³ kg/m³ = ' + r + ' g/cm³。' };
    },
    () => { // 冰化成水
      const V = PS.pick([100, 200, 500, 1000]);
      return { q: V + ' cm³ 的冰完全熔化成水，水的体积是多少 cm³？（ρ<sub>冰</sub> = 0.9×10³ kg/m³）', ans: 0.9 * V, unit: 'cm³', sol: '冰化成水，质量不变：m = ρ<sub>冰</sub>V<sub>冰</sub> = 0.9 g/cm³ × ' + V + ' cm³ = ' + 0.9 * V + ' g；V<sub>水</sub> = m/ρ<sub>水</sub> = ' + 0.9 * V + ' cm³。体积变小了。' };
    },
    () => { // 求质量 m = ρV
      const items = [['一块体积为 2 m³ 的花岗岩石碑', 2.7, 2, 't', 5.4, '2.7×10³ kg/m³ × 2 m³ = 5.4×10³ kg = 5.4 t'], ['教室里的空气（教室长 10 m、宽 6 m、高 3.5 m）', 1.29, 210, 'kg', 270.9, '1.29 kg/m³ × 210 m³ = 270.9 kg'], ['一桶 18 L 的纯净水', 1, 18, 'kg', 18, '1.0×10³ kg/m³ × 18×10⁻³ m³ = 18 kg']];
      const it = PS.pick(items);
      return { q: it[0] + '的质量是多少 ' + it[3] + '？', ans: it[4], unit: it[3], sol: 'm = ρV = ' + it[5] + '。' };
    },
  ];
  PS.register('rho-quiz', function (el) {
    const box = h('div', { class: 'ms-q', style: { marginTop: 0 } });
    el.append(box);
    let n = 0, ok = 0;
    function next() {
      const q = PS.pick(QT)();
      box.innerHTML = '';
      const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '答案', autocomplete: 'off' });
      const fb = h('div', { class: 'feedback' });
      let done = false;
      const go = () => {
        if (done) return;
        const x = parseFloat(inp.value.replace(/[，,\s]/g, ''));
        if (isNaN(x)) { inp.focus(); return; }
        done = true; n++;
        const good = Math.abs(x - q.ans) <= Math.abs(q.ans) * 0.01 + 1e-9;
        if (good) ok++;
        fb.className = 'feedback show ' + (good ? 'ok' : 'bad');
        fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案：' + PS.round(q.ans, 3) + ' ' + q.unit + '。') + q.sol;
        score.innerHTML = '已练 <b>' + n + '</b> 题 · 答对 <b class="ok">' + ok + '</b>';
        good ? PS.sound.good() : PS.sound.bad();
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      box.append(h('div', { html: q.q }), h('div', { class: 'q-fill', style: { marginTop: '8px' } }, inp, h('span', { class: 'q-unit', html: q.unit }), PS.ui.button('提交', go, 'btn btn-primary btn-sm'), PS.ui.button('下一题 →', next, 'btn btn-ghost btn-sm')), fb);
    }
    const score = h('div', { class: 'quiz-score' }, '随机出题，可以一直练下去');
    el.prepend(h('div', { class: 'quiz-head' }, score));
    next();
  });
})();
