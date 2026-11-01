/* 第2节：音调与响度——钢尺、水瓶琴、听觉频率范围、音叉与乒乓球、琴弦（控制变量）。依赖 sound.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  /* ================= 钢尺：音调与频率、响度与振幅 ================= */
  // 悬臂钢尺（厚 1 mm）的固有频率 f ≈ 8150 / L²（L 单位 cm），伸出约 20 cm 时降到 20 Hz 以下
  const rulerF = (L) => 8150 / (L * L);
  const FORCE = { 1: { name: '轻拨', a: 0.35 }, 2: { name: '中等', a: 0.65 }, 3: { name: '重拨', a: 1 } };
  PS.register('ruler-pitch', function (el, opts) {
    const VW = 1000, VH = 430;
    const lab = !!opts.lab;
    const st = { L: 10, force: 2, A: 0, t: 0, goal: 'pitch', rows: [], snd: null, drag: false };
    let host = el, side = null;
    if (lab) {
      const wrap = h('div', { class: 'bench' });
      host = h('div'); side = h('div', { class: 'bench-side' });
      wrap.append(host, side); el.append(wrap);
    }
    const S = PS.stage(host, { ratio: VW + ' / ' + VH, draw: paint });
    const lS = PS.ui.slider({ label: '伸出桌面的长度', min: 4, max: 28, step: 1, value: st.L, unit: 'cm', onInput: (v) => { st.L = v; damp(); } });
    const fSeg = PS.ui.seg([1, 2, 3].map((k) => ({ value: k, label: FORCE[k].name })), st.force, (v) => { st.force = v; });
    const pluckBtn = PS.ui.button('👆 拨动钢尺', pluck, 'btn btn-primary');
    const rf = PS.ui.readout('振动频率', '—', 'accent');
    const ra = PS.ui.readout('振幅', '—', 'primary');
    const rp = PS.ui.readout('音调', '—');
    const rh = PS.ui.readout('人耳能否听到', '—');
    const tip = h('div', { class: 'feedback show info small' }, '拨动钢尺，观察它振动的快慢，听声音的高低。可以直接在画面上拖动钢尺改变伸出的长度。');
    const ctrl = [PS.ui.row(pluckBtn, fSeg.el), PS.ui.row(lS.el), h('div', { class: 'readouts' }, rf.el, ra.el, rp.el, rh.el)];
    host.append(...ctrl, tip);

    function damp() { st.A = 0; if (st.snd) { st.snd.stop(); st.snd = null; } loop.start(); }
    function pluck() {
      const f = rulerF(st.L), a = FORCE[st.force].a;
      if (st.snd) st.snd.stop();
      st.A = a; st.t = 0;
      st.snd = f >= 20 ? PS.audio.strike(f, [[1, 1, 0.6], [6.27, 0.45, 0.3], [17.55, 0.12, 0.1]], { gain: 0.1 + 0.3 * a, click: 0.25 * a }) : null;
      loop.start();
      const pitch = f >= 20 ? (f > 200 ? '高' : f > 60 ? '较高' : '低') : '—';
      tip.innerHTML = f < 20
        ? '钢尺在振动，却<b>听不到声音</b>：振动频率只有 ' + f.toFixed(1) + ' Hz，<b>低于 20 Hz</b>，是次声波。'
        : '伸出 ' + st.L + ' cm，每秒振动约 ' + Math.round(f) + ' 次。' + (st.L <= 8 ? '伸出得短，振动<b>快</b>，音调<b>高</b>。' : st.L >= 15 ? '伸出得长，振动<b>慢</b>，音调<b>低</b>。' : '试试改变伸出的长度再拨。');
      if (lab) addRow(f, a, pitch);
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      st.A *= Math.exp(-dt / 3);
      if (st.A < 0.01) st.A = 0;
      upd();
      S.render();
      if (st.A === 0) loop.stop();
    }, S.stage);
    function upd() {
      const f = rulerF(st.L);
      rf.set(PS.fmt(f, f < 100 ? 1 : 0) + ' Hz');
      ra.set(st.A > 0 ? (st.A > 0.7 ? '大' : st.A > 0.35 ? '中' : '小') : '—');
      rp.set(f < 20 ? '—' : f > 200 ? '高' : f > 60 ? '较高' : '低');
      rh.set(f < 20 ? '<span class="hl-r">听不到（次声波）</span>' : '<span class="hl-g">能听到</span>');
    }

    // 画面：桌子、钢尺（振动画面放慢 40 倍）、示波器
    const PPC = 17, EDGE = 400;
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#c69c6d'; ctx.fillRect(20, 210, EDGE - 20, 22);
      ctx.fillStyle = '#a47148'; ctx.fillRect(20, 232, EDGE - 20, 6); ctx.fillRect(40, 238, 26, 70); ctx.fillRect(EDGE - 50, 238, 26, 70);
      const f = rulerF(st.L), tipX = EDGE + st.L * PPC, dmax = 18 + st.L * 2.2;
      const disp = st.A * dmax * Math.sin(TAU * (f / 40) * st.t);
      const shape = (d, col, lw) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'butt';
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) { const x = 120 + ((tipX - 120) * i) / 40, k = Math.max(0, (x - EDGE) / (tipX - EDGE)); const y = 204 + d * k * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      };
      if (st.A > 0) { shape(st.A * dmax, 'rgba(134,142,150,.25)', 8); shape(-st.A * dmax, 'rgba(134,142,150,.25)', 8); }
      shape(disp, '#adb5bd', 8);
      // 刻度（只画在桌面上的部分，表示这是一把尺）
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1;
      for (let x = 130; x < EDGE - 4; x += PPC / 2) { ctx.beginPath(); ctx.moveTo(x, 200); ctx.lineTo(x, 200 + ((x - 130) % PPC < 1 ? 6 : 3)); ctx.stroke(); }
      ctx.font = F(52, 26) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.fillText('🖐️', EDGE - 70, 198);
      D.dim(ctx, EDGE, tipX, 150, st.L + ' cm', { color: '#3b5bdb', size: F(13) });
      // 拖动手柄
      ctx.fillStyle = st.drag ? '#f08c00' : 'rgba(240,140,0,.75)';
      ctx.beginPath(); ctx.arc(tipX, 204 + disp, 9, 0, TAU); ctx.fill();
      D.text(ctx, st.A > 0 ? (f < 20 ? '在振动，但听不到声音' : '振动' + (f > 150 ? '快' : f > 50 ? '较快' : '慢')) : '拖动橙色圆点改变长度', 40, 40, { size: F(15), weight: 700, color: st.A > 0 ? '#e8590c' : '#6b7487' });
      if (st.A > 0) D.text(ctx, '振动画面放慢了 40 倍', 40, 64, { size: F(12), weight: 500, color: '#868e96' });
      // 示波器：50 ms 内的波形
      const b = { x: 40, y: 318, w: 920, h: 100 };
      PS.scope(ctx, b, {
        label: '示波器（横轴 50 ms）', labelSize: F(12),
        note: f < 20 ? '50 ms 内还不到一次振动' : '50 ms 内约 ' + Math.round(f * 0.05) + ' 次振动',
        traces: [{ fn: (x) => st.A * Math.sin(TAU * f * 0.05 * x), color: '#69db7c' }],
      });
      ctx.restore();
    }
    S.canvas.addEventListener('pointerdown', (e) => {
      const p = S.pos(e), x = (p.x / S.w) * VW;
      if (x > EDGE - 10) { st.drag = true; S.canvas.setPointerCapture(e.pointerId); move(e); }
    });
    function move(e) {
      if (!st.drag) return;
      const x = (S.pos(e).x / S.w) * VW;
      const L = PS.clamp(Math.round((x - EDGE) / PPC), 4, 28);
      if (L !== st.L) { st.L = L; lS.set(L, true); damp(); }
    }
    S.canvas.addEventListener('pointermove', move);
    S.canvas.addEventListener('pointerup', () => { st.drag = false; S.render(); });

    /* ----- 实验台：数据记录与控制变量检查 ----- */
    let tbody, analysis, goalSeg;
    function addRow(f, a, pitch) {
      st.rows.push({ L: st.L, force: st.force, f, a, pitch, goal: st.goal });
      renderTable();
    }
    function renderTable() {
      tbody.innerHTML = '';
      const rows = st.rows.filter((r) => r.goal === st.goal);
      rows.forEach((r, i) => tbody.append(h('tr', null, h('td', null, i + 1), h('td', null, r.L), h('td', null, FORCE[r.force].name), h('td', null, PS.fmt(r.f, r.f < 100 ? 1 : 0)), h('td', null, r.f < 20 ? '听不到' : st.goal === 'pitch' ? r.pitch : FORCE[r.force].a > 0.7 ? '响' : FORCE[r.force].a > 0.4 ? '较响' : '轻'))));
      if (!rows.length) tbody.append(h('tr', null, h('td', { colspan: 5, class: 'muted' }, '每拨动一次自动记录')));
      // 控制变量检查
      let warn = '';
      if (rows.length > 1) {
        if (st.goal === 'pitch' && new Set(rows.map((r) => r.force)).size > 1) warn = '⚠ 探究音调时，要用<b>大小相同的力</b>拨动钢尺（控制振幅不变），只改变伸出的长度。';
        if (st.goal === 'loud' && new Set(rows.map((r) => r.L)).size > 1) warn = '⚠ 探究响度时，钢尺伸出的长度要<b>保持不变</b>（控制频率不变），只改变拨动的力度。';
      }
      const varied = st.goal === 'pitch' ? new Set(rows.filter((r) => r.f >= 20).map((r) => r.L)).size : new Set(rows.map((r) => r.force)).size;
      if (warn) analysis.innerHTML = '<span class="hl-r">' + warn + '</span><br><span class="muted">点“清空”重新做。</span>';
      else if (varied >= 3) analysis.innerHTML = st.goal === 'pitch'
        ? '<b>结论：</b>钢尺伸出桌面越短，振动越<b>快</b>（频率越高），发出声音的<b>音调越高</b>。<br><span class="hl">音调由发声体振动的频率决定。</span>' + (rows.some((r) => r.f < 20) ? '<br>伸出很长时振动频率低于 20 Hz，人耳听不到。' : '')
        : '<b>结论：</b>拨动钢尺的力越大，钢尺振动的<b>幅度越大</b>，声音的<b>响度越大</b>；而音调不变。<br><span class="hl">响度与发声体的振幅有关。</span>';
      else analysis.innerHTML = '<span class="muted">' + (st.goal === 'pitch' ? '保持力度不变，至少换 3 个不同的长度各拨一次。' : '保持长度不变，分别用轻、中、重三种力度各拨一次。') + '</span>';
    }
    if (lab) {
      tbody = h('tbody'); analysis = h('div', { class: 'small' });
      goalSeg = PS.ui.seg([{ value: 'pitch', label: '探究音调与什么有关' }, { value: 'loud', label: '探究响度与什么有关' }], st.goal, (v) => { st.goal = v; renderTable(); });
      side.append(
        h('div', { class: 'panel' }, h('h4', null, '① 选择探究问题'), goalSeg.el, h('div', { class: 'kbd-hint' }, '运用控制变量法：每次只改变一个因素。')),
        h('div', { class: 'panel' }, h('h4', null, '② 实验记录（每拨一次自动记录）'),
          h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '次'), h('th', null, '长度/cm'), h('th', null, '力度'), h('th', null, '频率/Hz'), h('th', null, '声音'))), tbody)),
          PS.ui.button('清空', () => { st.rows = st.rows.filter((r) => r.goal !== st.goal); renderTable(); }, 'btn btn-sm btn-ghost')),
        h('div', { class: 'panel' }, h('h4', null, '③ 分析论证'), analysis));
      renderTable();
    }
    upd();
  });

  /* ================= 水瓶琴：敲击与吹气 ================= */
  // 吹气时振动的是瓶内空气柱：f = v / (4·L空)。按 C 大调音阶倒入不同高度的水
  const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
  const SOLFA = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'do˙'];
  const BOTTLE_H = 24;
  const AIR = SCALE.map((f) => 34000 / (4 * f));          // 空气柱长度 cm
  const WATER = AIR.map((a) => BOTTLE_H - a);              // 水的高度 cm
  PS.register('bottle-organ', function (el) {
    const VW = 1000, VH = 400;
    const st = { mode: 'strike', hot: -1, hotT: 0, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const modeSeg = PS.ui.seg([{ value: 'strike', label: '🥢 用筷子敲击' }, { value: 'blow', label: '💨 对着瓶口吹气' }], st.mode, (v) => { st.mode = v; st.hot = -1; info(); S.render(); });
    const songBtn = PS.ui.button('🎵 演奏《小星星》', song, 'btn');
    const out = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(modeSeg.el, songBtn), out);
    el.insertBefore(el.lastChild.previousSibling, S.stage);

    // 第 i 个瓶子（水从少到多）发出的是第几个音
    const noteOf = (i) => (st.mode === 'blow' ? i : 7 - i);
    function play(i) {
      const n = noteOf(i);
      if (st.mode === 'blow') { PS.audio.note(SCALE[n], { timbre: 'flute', dur: 0.55, gain: 0.22 }); }
      else PS.audio.strike(SCALE[n] * 2, [[1, 1, 0.5], [2.76, 0.25, 0.15], [5.4, 0.1, 0.06]], { gain: 0.25, click: 0.3 });
      st.hot = i; st.hotT = 0.6;
      loop.start();
      info(i);
    }
    function info(i) {
      if (i == null || i < 0) {
        out.innerHTML = st.mode === 'strike'
          ? '敲击时，振动的是<b>瓶子和瓶中的水</b>：水越多，振动越慢，音调越<b>低</b>。点一点瓶子试试。'
          : '吹气时，振动的是<b>瓶内的空气柱</b>：水越多，空气柱越短，振动越快，音调越<b>高</b>。点一点瓶子试试。';
        return;
      }
      out.innerHTML = '第 ' + (i + 1) + ' 个瓶子（水高 ' + WATER[i].toFixed(1) + ' cm）发出 <b>' + SOLFA[noteOf(i)] + '</b>。' +
        (st.mode === 'strike' ? '振动的是<b>瓶子和水</b>。' : '振动的是长 ' + AIR[i].toFixed(1) + ' cm 的<b>空气柱</b>，频率约 ' + Math.round(SCALE[i]) + ' Hz。');
    }
    let timer = 0;
    function song() {
      clearTimeout(timer);
      const tune = [0, 0, 4, 4, 5, 5, 4, -1, 3, 3, 2, 2, 1, 1, 0];
      let k = 0;
      const next = () => {
        if (k >= tune.length) return;
        const n = tune[k++];
        if (n >= 0) play(st.mode === 'blow' ? n : 7 - n);
        timer = setTimeout(next, n < 0 ? 300 : 420);
      };
      next();
    }
    const loop = PS.loop((dt) => {
      st.t += dt; st.hotT = Math.max(0, st.hotT - dt);
      S.render();
      if (st.hotT === 0) loop.stop();
    }, S.stage);

    const geo = (i) => ({ x: 95 + i * 115, w: 70, top: 70, bot: 320 });
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#c69c6d'; ctx.fillRect(40, 322, 920, 16);
      const pxcm = (320 - 70) / BOTTLE_H;
      for (let i = 0; i < 8; i++) {
        const g = geo(i), hot = st.hot === i && st.hotT > 0, k = hot ? st.hotT / 0.6 : 0;
        const shake = hot && st.mode === 'strike' ? Math.sin(st.t * 90) * 2.5 * k : 0;
        const x = g.x + shake;
        // 水
        const wy = g.bot - WATER[i] * pxcm;
        ctx.fillStyle = hot && st.mode === 'strike' ? 'rgba(28,126,214,.75)' : 'rgba(77,171,247,.55)';
        ctx.beginPath();
        for (let xx = 0; xx <= g.w; xx += 5) ctx.lineTo(x + xx, wy + (hot && st.mode === 'strike' ? Math.sin(xx / 6 + st.t * 30) * 3 * k : 0));
        ctx.lineTo(x + g.w, g.bot); ctx.lineTo(x, g.bot); ctx.closePath(); ctx.fill();
        // 空气柱
        if (hot && st.mode === 'blow') {
          ctx.fillStyle = 'rgba(240,140,0,' + (0.25 * k + 0.1) + ')'; ctx.fillRect(x + 3, g.top + 18, g.w - 6, wy - g.top - 18);
          ctx.strokeStyle = 'rgba(232,89,12,.8)'; ctx.lineWidth = 2;
          for (let yy = g.top + 26; yy < wy - 6; yy += 14) { ctx.beginPath(); for (let xx = 6; xx <= g.w - 6; xx += 4) ctx.lineTo(x + xx, yy + Math.sin(xx / 5 + st.t * 40) * 2.5 * k); ctx.stroke(); }
        }
        // 瓶身
        ctx.strokeStyle = hot && st.mode === 'strike' ? '#e8590c' : '#5c7cfa'; ctx.lineWidth = hot && st.mode === 'strike' ? 4 : 3;
        ctx.beginPath(); ctx.moveTo(x + 22, g.top); ctx.lineTo(x + 22, g.top + 18); ctx.quadraticCurveTo(x, g.top + 26, x, g.top + 50); ctx.lineTo(x, g.bot); ctx.lineTo(x + g.w, g.bot); ctx.lineTo(x + g.w, g.top + 50); ctx.quadraticCurveTo(x + g.w, g.top + 26, x + g.w - 22, g.top + 18); ctx.lineTo(x + g.w - 22, g.top); ctx.stroke();
        D.text(ctx, SOLFA[noteOf(i)], x + g.w / 2, 360, { size: F(16), weight: 800, color: hot ? '#e8590c' : '#3b5bdb', align: 'center' });
        D.text(ctx, '第' + (i + 1) + '瓶', x + g.w / 2, 384, { size: F(12), weight: 500, color: '#868e96', align: 'center' });
        if (hot) { ctx.font = F(30, 18) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.fillText(st.mode === 'blow' ? '💨' : '🥢', x + g.w / 2 + (st.mode === 'blow' ? 0 : 40), g.top - 14); }
      }
      D.text(ctx, st.mode === 'strike' ? '敲击：水越多，音调越低 →' : '吹气：水越多，空气柱越短，音调越高 →', 40, 34, { size: F(15), weight: 700, color: '#3a4458' });
      ctx.restore();
    }
    S.canvas.addEventListener('pointerdown', (e) => {
      const x = (S.pos(e).x / S.w) * VW;
      for (let i = 0; i < 8; i++) { const g = geo(i); if (x >= g.x - 20 && x <= g.x + g.w + 20) { play(i); break; } }
    });
    S.stage.style.cursor = 'pointer';
    info();
  });

  /* ================= 人和动物的听觉、发声频率范围 ================= */
  // 教材插图数据（Hz）
  const ANIMALS = [
    { name: '人', icon: '🧑', voice: [85, 1100], hear: [20, 20000] },
    { name: '狗', icon: '🐕', voice: [452, 1800], hear: [15, 50000] },
    { name: '猫', icon: '🐈', voice: [760, 1500], hear: [60, 65000] },
    { name: '蝙蝠', icon: '🦇', voice: [10000, 120000], hear: [1000, 120000] },
    { name: '海豚', icon: '🐬', voice: [7000, 120000], hear: [150, 150000] },
  ];
  const EXAMPLES = [
    { name: '地震、海啸（次声波）', f: 5 }, { name: '蝴蝶翅膀', f: 6 }, { name: '大象“交谈”（次声波）', f: 16 },
    { name: '钢琴中央 C', f: 262 }, { name: '蚊子翅膀', f: 550 }, { name: '口哨', f: 2000 }, { name: '“狗哨”', f: 25000 }, { name: '蝙蝠的叫声', f: 50000 },
  ];
  // 数字按教材习惯每三位空一格：20 000
  const nf = (f) => String(Math.round(f)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  PS.register('hearing-range', function (el) {
    const VW = 1000, VH = 420;
    const st = { f: 550, hover: null };
    const FMIN = 1, FMAX = 300000;
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'crosshair';
    const tipBox = h('div', { class: 'hr-tip' });
    S.stage.append(tipBox);
    const toF = (v) => Math.round(Math.pow(10, v)); // 滑块为 log10(f)
    const fS = PS.ui.slider({ label: '频率', min: 0, max: Math.log10(200000), step: 0.01, value: Math.log10(st.f), fmt: (v) => nf(toF(v)) + ' Hz', onInput: (v) => { st.f = toF(v); upd(); } });
    fS.el.querySelector('.slider-val').style.minWidth = '100px';
    fS.el.classList.add('wide');
    const playBtn = PS.ui.button('▶ 播放这个频率', () => {
      if (st.f < 20 || st.f > 20000) { PS.toast('这个频率人耳听不到，电脑也放不出来'); return; }
      PS.audio.note(Math.min(st.f, 18000), { timbre: 'fork', dur: 1, gain: st.f > 8000 ? 0.08 : 0.15 });
    }, 'btn btn-primary');
    const who = h('div', { class: 'feedback show info' });
    const chips = h('div', { class: 'hr-chips' }, EXAMPLES.map((x) => h('button', { type: 'button', class: 'chip', onclick: () => { st.f = x.f; fS.set(Math.log10(x.f), true); upd(); } }, x.name)));
    el.append(PS.ui.row(fS.el, playBtn), chips, who, h('p', { class: 'kbd-hint', style: { margin: '6px 0 0' } }, '提示：先把电脑音量调小再播放。年龄越大，越听不到高频声音，很多成年人已听不到 15 000 Hz 以上的声音。'));

    const b = { x: 120, y: 60, w: 840, h: 290 };
    const X = (f) => b.x + (Math.log10(f) - Math.log10(FMIN)) / (Math.log10(FMAX) - Math.log10(FMIN)) * b.w;
    const rowY = (i) => b.y + 30 + i * 54;
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      // 次声波 / 可听声 / 超声波 区域
      ctx.fillStyle = '#f3f0ff'; ctx.fillRect(b.x, b.y, X(20) - b.x, b.h);
      ctx.fillStyle = '#fff4e6'; ctx.fillRect(X(20000), b.y, b.x + b.w - X(20000), b.h);
      D.text(ctx, '次声波', (b.x + X(20)) / 2, b.y - 8, { size: F(13), weight: 700, color: '#5f3dc4', align: 'center' });
      D.text(ctx, '人耳能听到的声音', (X(20) + X(20000)) / 2, b.y - 8, { size: F(13), weight: 700, color: '#2b8a3e', align: 'center' });
      D.text(ctx, '超声波', (X(20000) + b.x + b.w) / 2, b.y - 8, { size: F(13), weight: 700, color: '#b35c00', align: 'center' });
      // 网格与坐标
      ctx.font = PS.font(F(11.5), 500); ctx.textAlign = 'center';
      [1, 10, 100, 1000, 10000, 100000].forEach((f) => {
        ctx.strokeStyle = '#eef0f4'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(f), b.y); ctx.lineTo(X(f), b.y + b.h); ctx.stroke();
        ctx.fillStyle = '#6b7487'; ctx.fillText(nf(f), X(f), b.y + b.h + 18);
      });
      ctx.fillText('频率 / Hz（对数刻度）', b.x + b.w / 2, b.y + b.h + 40);
      [20, 20000].forEach((f) => { ctx.strokeStyle = '#2b8a3e'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(f), b.y); ctx.lineTo(X(f), b.y + b.h); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#2b8a3e'; ctx.font = PS.font(F(11), 700); ctx.fillText(nf(f) + ' Hz', X(f), b.y + b.h - 6); });
      // 图例
      [['听觉范围', '#3b5bdb'], ['发声范围', '#f08c00']].forEach(([t, c], i) => { const lx = b.x + i * 120; ctx.fillStyle = c; D.roundRect(ctx, lx, 16, 22, 8, 4); ctx.fill(); D.text(ctx, t, lx + 28, 24, { size: F(12.5), weight: 600, color: '#3a4458' }); });
      // 各行
      ANIMALS.forEach((an, i) => {
        const y = rowY(i), hov = st.hover && st.hover.i === i;
        ctx.font = F(24, 16) + 'px ' + PS.FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(an.icon, 30, y + 4);
        D.text(ctx, an.name, 64, y + 4, { size: F(15), weight: 700, color: '#1b2333', baseline: 'middle' });
        ctx.textBaseline = 'alphabetic';
        const bar = (r, yy, c, kind) => {
          ctx.fillStyle = c; ctx.globalAlpha = st.hover && !(hov && st.hover.kind === kind) ? 0.55 : 1;
          D.roundRect(ctx, X(r[0]), yy, Math.max(4, X(r[1]) - X(r[0])), 10, 4); ctx.fill(); ctx.globalAlpha = 1;
        };
        bar(an.hear, y - 10, '#3b5bdb', 'hear');
        bar(an.voice, y + 6, '#f08c00', 'voice');
        if (i === 0 || hov) {
          D.text(ctx, nf(an.hear[0]) + '~' + nf(an.hear[1]), X(an.hear[1]) + 6, y - 1, { size: F(11), weight: 600, color: '#3a4458' });
          D.text(ctx, nf(an.voice[0]) + '~' + nf(an.voice[1]), X(an.voice[1]) + 6, y + 15, { size: F(11), weight: 600, color: '#3a4458' });
        }
      });
      // 频率探针
      const xf = X(st.f);
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xf, b.y); ctx.lineTo(xf, b.y + b.h); ctx.stroke();
      D.text(ctx, nf(st.f) + ' Hz', xf, b.y + 12, { size: F(12), weight: 800, color: '#e03131', align: 'center', bg: 'rgba(255,255,255,.95)' });
      ctx.restore();
    }
    function upd() {
      const can = ANIMALS.filter((a) => st.f >= a.hear[0] && st.f <= a.hear[1]).map((a) => a.name);
      const kind = st.f < 20 ? '<b>次声波</b>（低于 20 Hz）' : st.f > 20000 ? '<b>超声波</b>（高于 20 000 Hz）' : '人耳能听到的声音';
      who.innerHTML = nf(st.f) + ' Hz 属于' + kind + '。能听到它的：' + (can.length ? '<b>' + can.join('、') + '</b>' : '<b>（图中的动物都听不到）</b>') + '。';
      S.render();
    }
    // 悬停提示
    S.canvas.addEventListener('pointermove', (e) => {
      const p = S.pos(e), x = (p.x / S.w) * VW, y = (p.y / S.h) * VH;
      let hit = null;
      ANIMALS.forEach((an, i) => {
        const yy = rowY(i);
        if (y >= yy - 14 && y < yy - 1 && x >= X(an.hear[0]) - 6 && x <= X(an.hear[1]) + 6) hit = { i, kind: 'hear' };
        if (y >= yy + 2 && y < yy + 20 && x >= X(an.voice[0]) - 6 && x <= X(an.voice[1]) + 6) hit = { i, kind: 'voice' };
      });
      st.hover = hit;
      if (hit) {
        const an = ANIMALS[hit.i], r = an[hit.kind];
        tipBox.innerHTML = '<b>' + an.name + '</b> · ' + (hit.kind === 'hear' ? '听觉' : '发声') + '范围<br>' + nf(r[0]) + ' ~ ' + nf(r[1]) + ' Hz';
        tipBox.style.display = 'block';
        tipBox.style.left = Math.min(p.x + 14, S.w - 170) + 'px'; tipBox.style.top = (p.y + 14) + 'px';
      } else tipBox.style.display = 'none';
      S.render();
    });
    S.canvas.addEventListener('pointerleave', () => { st.hover = null; tipBox.style.display = 'none'; S.render(); });
    S.canvas.addEventListener('click', (e) => {
      const x = (S.pos(e).x / S.w) * VW;
      if (x < b.x || x > b.x + b.w) return;
      const f = Math.round(Math.pow(10, Math.log10(FMIN) + ((x - b.x) / b.w) * (Math.log10(FMAX) - Math.log10(FMIN))));
      st.f = PS.clamp(f, 1, 200000); fS.set(Math.log10(st.f), true); upd();
    });
    upd();
    document.head.append(h('style', null, `
      .hr-tip{position:absolute;display:none;pointer-events:none;background:#1b2333;color:#fff;font-size:12.5px;line-height:1.5;padding:6px 10px;border-radius:8px;box-shadow:var(--shadow);white-space:nowrap;z-index:2}
      .hr-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}
      .hr-chips .chip{cursor:pointer;font:inherit;font-size:.84rem}
      .hr-chips .chip:hover{border-color:var(--primary);color:var(--primary)}
    `));
  });

  /* ================= 音叉与乒乓球：响度与振幅、距离 ================= */
  PS.register('fork-loudness', function (el) {
    const VW = 1000, VH = 400;
    const st = { force: 'soft', A: 0, A0: 0, t: 0, phi: 0, om: 0, maxPhi: 0, r: 2, horn: false, snd: null };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const fSeg = PS.ui.seg([{ value: 'soft', label: '轻敲' }, { value: 'hard', label: '重敲' }], st.force, (v) => { st.force = v; });
    const rS = PS.ui.slider({ label: '人到音叉的距离', min: 1, max: 20, step: 1, value: st.r, unit: 'm', onInput: (v) => { st.r = v; updSnd(); S.render(); } });
    const hornT = PS.ui.toggle('用喇叭筒对着人（声音更集中）', false, (v) => { st.horn = v; updSnd(); S.render(); });
    const rAng = PS.ui.readout('乒乓球最大弹开角度', '—', 'accent');
    const rDb = PS.ui.readout('人听到的响度（模拟）', '—', 'primary');
    const note = h('div', { class: 'feedback show info small' }, '分别轻敲、重敲音叉，比较乒乓球被弹开的幅度和声音的大小。');
    el.append(PS.ui.row(PS.ui.button('🔨 敲击音叉', hit, 'btn btn-primary'), fSeg.el), PS.ui.row(rS.el, hornT.el), h('div', { class: 'readouts' }, rAng.el, rDb.el), note);

    const level = () => (st.A <= 0.01 ? 0 : 74 + 20 * Math.log10(st.A) - 20 * Math.log10(st.r) + (st.horn ? 6 : 0));
    function updSnd() { if (st.snd) st.snd.setGain(Math.min(1, (st.horn ? 1.6 : 1) / Math.sqrt(st.r))); }
    function hit() {
      st.A = st.A0 = st.force === 'hard' ? 1 : 0.35;
      st.maxPhi = 0;
      if (st.snd) st.snd.stop();
      st.snd = PS.audio.strike(440, [[1, 1, 2.2], [6.27, 0.05, 0.05]], { gain: 0.38 * st.A, click: 0.1 });
      updSnd();
      loop.start();
      setTimeout(() => {
        note.innerHTML = (st.force === 'hard' ? '<b>重敲</b>：音叉振幅大，乒乓球被弹开得<b>远</b>，声音<b>响</b>。' : '<b>轻敲</b>：音叉振幅小，乒乓球被弹开得<b>近</b>，声音<b>轻</b>。') +
          ' 乒乓球弹开的幅度反映了音叉振幅的大小（转换法）。离音叉越远，听到的声音越小。';
      }, 900);
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      st.A *= Math.exp(-dt / 2.2);
      if (st.A < 0.02) st.A = 0;
      const w0 = TAU / 1.1;
      st.om += (-w0 * w0 * Math.sin(st.phi) - 0.5 * st.om) * dt;
      st.phi += st.om * dt;
      if (st.phi <= 0) { st.phi = 0; st.om = st.A > 0.04 ? Math.max(-st.om * 0.3, st.A * 3.4) : 0; }
      st.maxPhi = Math.max(st.maxPhi, st.phi);
      rAng.set(st.maxPhi > 0.005 ? (st.maxPhi * 180 / Math.PI).toFixed(0) + '°' : '—');
      rDb.set(st.A > 0 ? Math.max(0, level()).toFixed(0) + ' dB' : '—');
      S.render();
      if (st.A === 0 && st.phi === 0 && st.om === 0) loop.stop();
    }, S.stage);

    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#c69c6d'; ctx.fillRect(40, 300, 360, 16);
      ctx.fillStyle = '#5c7cfa'; D.roundRect(ctx, 130, 276, 100, 24, 6); ctx.fill();
      const disp = st.A * 6 * Math.sin(st.t * TAU * 17);
      if (st.A > 0) { ctx.globalAlpha = 0.18; PS.drawFork(ctx, 180, 280, 170, st.A * 6); PS.drawFork(ctx, 180, 280, 170, -st.A * 6); ctx.globalAlpha = 1; }
      PS.drawFork(ctx, 180, 280, 170, disp);
      // 乒乓球
      const r = 20, py = 40, L = 120, px = 180 + 170 * 0.1 + 170 * 0.11 + r;
      ctx.fillStyle = '#495057'; ctx.fillRect(48, py - 8, px - 40, 8); ctx.fillRect(48, py - 8, 8, 308);
      const bx = px + L * Math.sin(st.phi), by = py + L * Math.cos(st.phi);
      if (st.maxPhi > 0.01) {
        ctx.strokeStyle = 'rgba(240,140,0,.45)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(px, py, L, Math.PI / 2 - st.maxPhi, Math.PI / 2); ctx.stroke();
      }
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = '#ffe8cc'; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 1.2; ctx.stroke();
      // 听者
      const x0 = 440, x1 = 900, xl = x0 + ((st.r - 1) / 19) * (x1 - x0);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(x0 - 20, 316, x1 - x0 + 60, 6);
      ctx.font = F(48, 24) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.fillText('🧑', xl, 308);
      D.text(ctx, st.r + ' m', xl, 346, { size: F(13), weight: 700, color: '#3b5bdb', align: 'center' });
      if (st.horn) { ctx.fillStyle = '#f08c00'; ctx.beginPath(); ctx.moveTo(270, 150); ctx.lineTo(340, 120); ctx.lineTo(340, 200); ctx.closePath(); ctx.fill(); }
      // 声波
      const Lv = level();
      if (st.A > 0) {
        ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2.5;
        for (let i = 0; i < 4; i++) {
          const ph = (st.t * 0.9 + i / 4) % 1, x = 260 + ph * (xl - 300);
          ctx.globalAlpha = Math.min(1, st.A * 1.4) * (1 - ph * (st.horn ? 0.4 : 0.8));
          const spread = st.horn ? 0.35 : 0.8;
          ctx.beginPath(); ctx.arc(x - 60, 190, 60 + ph * 30, -spread, spread); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 响度计
      const mx = 930, my = 60, mh = 230;
      ctx.fillStyle = '#e9ecef'; D.roundRect(ctx, mx, my, 26, mh, 13); ctx.fill();
      const fr = PS.clamp((Lv - 20) / 60, 0, 1);
      ctx.fillStyle = fr > 0.75 ? '#e03131' : fr > 0.45 ? '#f08c00' : '#2b8a3e';
      D.roundRect(ctx, mx, my + mh * (1 - fr), 26, mh * fr, 13); ctx.fill();
      D.text(ctx, '响度', mx + 13, my - 12, { size: F(12), weight: 700, color: '#3a4458', align: 'center' });
      D.text(ctx, st.A > 0 ? '振幅' + (st.A0 > 0.7 ? '大' : '小') + ' → 乒乓球弹开得' + (st.A0 > 0.7 ? '远' : '近') : '敲击音叉试试', 40, 34, { size: F(15), weight: 700, color: st.A > 0 ? '#e8590c' : '#6b7487' });
      ctx.restore();
    }
    PS.audio.whenHidden(S.stage, () => { if (st.snd) { st.snd.stop(); st.snd = null; } });
    S.render();
  });

  /* ================= 琴弦的音调与什么因素有关（控制变量） ================= */
  // 教案“跟进训练”中的五根琴弦；松紧程度相同（张力 50 N）
  const STRINGS = [
    { id: 'A', mat: '钢', rho: 7850, L: 30, S: 0.3 },
    { id: 'B', mat: '钢', rho: 7850, L: 30, S: 0.6 },
    { id: 'C', mat: '尼龙丝', rho: 1150, L: 40, S: 0.5 },
    { id: 'D', mat: '铜', rho: 8900, L: 50, S: 0.5 },
    { id: 'E', mat: '尼龙丝', rho: 1150, L: 50, S: 0.5 },
  ];
  STRINGS.forEach((s) => { s.f = (1 / (2 * s.L / 100)) * Math.sqrt(50 / (s.rho * s.S * 1e-6)); });
  const GOALS = { mat: '材料', len: '长度', area: '粗细（横截面积）' };
  PS.register('string-lab', function (el) {
    const VW = 1000, VH = 300;
    const st = { goal: 'mat', pick: [], t: 0, vib: [0, 0] };
    const goalSeg = PS.ui.seg(Object.keys(GOALS).map((k) => ({ value: k, label: '探究与' + GOALS[k].replace('（横截面积）', '') + '的关系' })), st.goal, (v) => { st.goal = v; st.pick = []; renderTable(); judge(); S.render(); });
    const tbody = h('tbody');
    const table = h('div', { class: 'table-wrap' }, h('table', { class: 't sl-table' }, h('thead', null, h('tr', null, h('th', null, '选用'), h('th', null, '编号'), h('th', null, '材料'), h('th', null, '长度/cm'), h('th', null, '横截面积/mm²'))), tbody));
    const S = PS.stage(h('div'), { ratio: VW + ' / ' + VH, draw: paint });
    const pluckBtn = PS.ui.button('👆 依次拨动两根弦', pluck, 'btn btn-primary');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(goalSeg.el), table, S.stage.parentNode, PS.ui.row(pluckBtn), msg);
    el.firstChild.classList.add('top');

    function renderTable() {
      tbody.innerHTML = '';
      STRINGS.forEach((s) => {
        const cb = h('input', { type: 'checkbox' });
        cb.checked = st.pick.includes(s.id);
        cb.addEventListener('change', () => {
          if (cb.checked) { st.pick.push(s.id); if (st.pick.length > 2) st.pick.shift(); } else st.pick = st.pick.filter((x) => x !== s.id);
          renderTable(); judge(); S.render();
        });
        tbody.append(h('tr', { class: st.pick.includes(s.id) ? 'hl-row' : null }, h('td', null, h('label', { class: 'sl-cb' }, cb)), h('td', null, h('b', null, s.id)), h('td', null, s.mat), h('td', null, s.L), h('td', null, s.S)));
      });
    }
    // 判断所选的两根弦是否满足“只有一个因素不同”
    function diffs(a, b) { const d = []; if (a.mat !== b.mat) d.push('mat'); if (a.L !== b.L) d.push('len'); if (a.S !== b.S) d.push('area'); return d; }
    function judge(played) {
      if (st.pick.length < 2) { msg.className = 'feedback show info'; msg.innerHTML = '在表中勾选<b>两根</b>琴弦。要探究音调与“' + GOALS[st.goal] + '”的关系，应该选哪两根？'; pluckBtn.disabled = true; return false; }
      const [a, b] = st.pick.map((id) => STRINGS.find((s) => s.id === id));
      const d = diffs(a, b);
      pluckBtn.disabled = false;
      if (d.length === 1 && d[0] === st.goal) {
        msg.className = 'feedback show ok';
        let c = '✔ 选得对！' + a.id + ' 和 ' + b.id + ' 只有' + GOALS[st.goal] + '不同，其他条件相同。';
        if (played) {
          const hi = a.f > b.f ? a : b, lo = a.f > b.f ? b : a;
          c += '<br>' + hi.id + '（约 ' + Math.round(hi.f) + ' Hz）的音调比 ' + lo.id + '（约 ' + Math.round(lo.f) + ' Hz）<b>高</b>。';
          c += st.goal === 'len' ? '结论：在材料、粗细、松紧相同时，<b>琴弦越短，音调越高</b>。'
            : st.goal === 'area' ? '结论：在材料、长度、松紧相同时，<b>琴弦越细，音调越高</b>。'
            : '结论：在长度、粗细、松紧相同时，<b>琴弦的材料不同，音调不同</b>。';
        } else c += ' 点“拨动”听一听。';
        msg.innerHTML = c;
        return true;
      }
      msg.className = 'feedback show bad';
      msg.innerHTML = d.length === 0 ? '这两根弦完全相同，无法比较。'
        : d.length === 1 ? '这两根弦不同的是“' + GOALS[d[0]] + '”，不是要探究的“' + GOALS[st.goal] + '”。'
        : '这两根弦的' + d.map((k) => GOALS[k]).join('、') + '都不同，即使音调不同，也不知道是哪个因素引起的——要<b>控制变量</b>！';
      return false;
    }
    function pluck() {
      if (st.pick.length < 2) return;
      st.pick.forEach((id, i) => {
        const s = STRINGS.find((x) => x.id === id);
        PS.audio.strike(s.f, [[1, 1, 0.9], [2, 0.5, 0.6], [3, 0.3, 0.4], [4, 0.15, 0.3], [5, 0.08, 0.2]], { gain: 0.3, click: 0.15, when: i * 0.9 });
        setTimeout(() => { st.vib[i] = 1; loop.start(); }, i * 900);
      });
      setTimeout(() => judge(true), 1300);
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      st.vib = st.vib.map((v) => (v * Math.exp(-dt / 0.8) < 0.02 ? 0 : v * Math.exp(-dt / 0.8)));
      S.render();
      if (!st.vib[0] && !st.vib[1]) loop.stop();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff8f0'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#d9a066'; D.roundRect(ctx, 40, 40, 920, 220, 16); ctx.fill();
      ctx.fillStyle = '#7f4f24'; ctx.beginPath(); ctx.arc(500, 150, 38, 0, TAU); ctx.fill();
      const px = (cm) => cm * 15;
      [0, 1].forEach((i) => {
        const id = st.pick[i];
        const y = 105 + i * 90;
        if (!id) { D.text(ctx, '（未选择）', 500, y + 5, { size: F(14), color: '#7f4f24', align: 'center' }); return; }
        const s = STRINGS.find((x) => x.id === id);
        const x0 = 500 - px(s.L) / 2, x1 = 500 + px(s.L) / 2;
        ctx.fillStyle = '#343a40'; ctx.fillRect(x0 - 6, y - 14, 6, 28); ctx.fillRect(x1, y - 14, 6, 28);
        const col = s.mat === '钢' ? '#adb5bd' : s.mat === '铜' ? '#d9822b' : '#f8f9fa';
        const thick = 1.5 + s.S * 6;
        const a = st.vib[i] * 10, fv = s.f / 30;
        if (a > 0) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); for (let k = 0; k <= 30; k++) ctx.lineTo(x0 + (x1 - x0) * k / 30, y + a * Math.sin(Math.PI * k / 30)); for (let k = 30; k >= 0; k--) ctx.lineTo(x0 + (x1 - x0) * k / 30, y - a * Math.sin(Math.PI * k / 30)); ctx.fill(); }
        ctx.strokeStyle = col; ctx.lineWidth = thick;
        ctx.beginPath(); for (let k = 0; k <= 30; k++) ctx.lineTo(x0 + (x1 - x0) * k / 30, y + a * Math.sin(Math.PI * k / 30) * Math.sin(st.t * TAU * fv)); ctx.stroke();
        D.text(ctx, s.id + '：' + s.mat + ' ' + s.L + ' cm ' + s.S + ' mm²', 60, y - 20, { size: F(13), weight: 700, color: '#fff' });
      });
      ctx.restore();
    }
    renderTable(); judge();
    document.head.append(h('style', null, `
      .sl-table td,.sl-table th{padding:5px 8px}
      .sl-cb input{width:18px;height:18px;accent-color:var(--primary);cursor:pointer}
    `));
  });
})();
