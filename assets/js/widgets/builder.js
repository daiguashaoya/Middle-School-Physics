/* 第15章：电路搭建台 circuit-builder——在网格上放电池、灯泡、开关、电流表等元件，拖动画导线，闭合开关就能看到电流。
 * 元件占两格（中间的格点不连接），导线沿格点走，同一格点上的导线和元件端点连在一起（三条以上相连处画黑点）。
 * opts.preset 示例电路（simple / series / parallel / ammeter / parallelA / short / empty），opts.tools 可用的元件，opts.dial 显示电流表表盘，opts.lab 实验台模式。依赖 circuit.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, EL = PS.el;
  const COLS = 12, ROWS = 8, VW = 1000, C = VW / (COLS + 1), VH = Math.round(C * (ROWS + 1));
  const X = (i) => C * (i + 0.5), Y = (j) => C * (j + 0.5);
  const K = (p) => p[0] + ',' + p[1];
  const EK = (p, q) => { const a = K(p), b = K(q); return a < b ? a + '|' + b : b + '|' + a; };
  const TYPES = {
    bat: { n: '电池', ico: '🔋', pre: '' }, bulb: { n: '灯泡', ico: '💡', pre: 'L' }, sw: { n: '开关', ico: '🔘', pre: 'S' },
    amm: { n: '电流表', ico: 'Ⓐ', pre: 'A' }, motor: { n: '电动机', ico: '⚙️', pre: 'M' }, led: { n: '发光二极管', ico: '🔴', pre: 'D' }, bell: { n: '电铃', ico: '🔔', pre: '' },
  };
  const BULB_PN = 0.75;

  /* 示例电路：元件 [类型, 端点1, 端点2, 参数]，导线 ['w', 格点...]（电池、电流表的端点1为正极） */
  const PRESETS = {
    empty: { n: '空白', els: [] },
    simple: { n: '简单电路', els: [['bat', [7, 7], [5, 7]], ['sw', [3, 1], [5, 1], { label: 'S' }], ['bulb', [10, 3], [10, 5], { label: 'L' }], ['w', [7, 7], [10, 7], [10, 5]], ['w', [10, 3], [10, 1], [5, 1]], ['w', [3, 1], [2, 1], [2, 7], [5, 7]]] },
    series: { n: '串联电路', els: [['bat', [7, 7], [5, 7]], ['sw', [2, 5], [2, 3], { label: 'S' }], ['bulb', [3, 1], [5, 1], { label: 'L1' }], ['bulb', [7, 1], [9, 1], { label: 'L2' }], ['w', [7, 7], [10, 7], [10, 1], [9, 1]], ['w', [7, 1], [5, 1]], ['w', [3, 1], [2, 1], [2, 3]], ['w', [2, 5], [2, 7], [5, 7]]] },
    parallel: { n: '并联电路', els: [['bat', [7, 7], [5, 7]], ['sw', [5, 7], [3, 7], { label: 'S' }], ['bulb', [8, 1], [6, 1], { label: 'L1' }], ['sw', [5, 1], [3, 1], { label: 'S1' }], ['bulb', [8, 4], [6, 4], { label: 'L2' }], ['sw', [5, 4], [3, 4], { label: 'S2' }], ['w', [7, 7], [10, 7], [10, 1], [8, 1]], ['w', [8, 4], [10, 4]], ['w', [5, 1], [6, 1]], ['w', [5, 4], [6, 4]], ['w', [3, 7], [2, 7], [2, 1], [3, 1]], ['w', [3, 4], [2, 4]]] },
    ammeter: { n: '用电流表测电流', els: [['bat', [7, 7], [5, 7]], ['sw', [2, 5], [2, 3], { label: 'S' }], ['bulb', [8, 1], [6, 1], { label: 'L' }], ['amm', [10, 5], [10, 3], { label: 'A', range: 0.6 }], ['w', [7, 7], [10, 7], [10, 5]], ['w', [10, 3], [10, 1], [8, 1]], ['w', [6, 1], [2, 1], [2, 3]], ['w', [2, 5], [2, 7], [5, 7]]] },
    parallelA: { n: '并联电路中的电流', els: [['bat', [7, 7], [5, 7]], ['sw', [5, 7], [3, 7], { label: 'S' }], ['bulb', [8, 1], [6, 1], { label: 'L1' }], ['amm', [5, 1], [3, 1], { label: 'A1', range: 0.6 }], ['bulb', [8, 4], [6, 4], { label: 'L2', R: 12.7, Pn: 1.14 }], ['amm', [5, 4], [3, 4], { label: 'A2', range: 0.6 }], ['amm', [10, 7], [10, 5], { label: 'A', range: 0.6 }], ['w', [7, 7], [10, 7]], ['w', [10, 5], [10, 1], [8, 1]], ['w', [8, 4], [10, 4]], ['w', [5, 1], [6, 1]], ['w', [5, 4], [6, 4]], ['w', [3, 7], [2, 7], [2, 1], [3, 1]], ['w', [3, 4], [2, 4]]] },
    short: { n: '灯泡 L2 被短路', els: [['bat', [7, 7], [5, 7]], ['sw', [2, 5], [2, 3], { label: 'S' }], ['bulb', [3, 1], [5, 1], { label: 'L1' }], ['bulb', [7, 1], [9, 1], { label: 'L2' }], ['w', [7, 7], [10, 7], [10, 1], [9, 1]], ['w', [7, 1], [5, 1]], ['w', [3, 1], [2, 1], [2, 3]], ['w', [2, 5], [2, 7], [5, 7]], ['w', [7, 1], [7, 3], [9, 3], [9, 1]]] },
  };

  PS.register('circuit-builder', function (el, opts) {
    const tools = opts.tools || ['bat', 'bulb', 'sw', 'amm', 'motor', 'led', 'bell'];
    const st = { els: [], sel: null, tool: 'pick', dots: true, electron: false, T: 0, pend: null, wdrag: null, press: null, sol: null, shown: !opts.hideNum };
    let uid = 0;

    // ---------- 界面 ----------
    const toolBtns = {};
    const mkTool = (k, label, title) => { const b = PS.ui.button(label, () => setTool(k), 'btn btn-sm'); b.title = title || ''; toolBtns[k] = b; return b; };
    const bar = h('div', { class: 'el-chips cb-tools' },
      mkTool('pick', '👆 选择 / 操作', '点一下元件选中它；点开关可以闭合、断开；拖动元件可以移动'),
      mkTool('wire', '〰️ 画导线', '从一个格点拖到另一个格点；也可以先点起点、再点终点'),
      tools.map((k) => mkTool(k, TYPES[k].ico + ' ' + TYPES[k].n, '点一下画面放置' + TYPES[k].n)));
    const presetSel = h('select', { class: 'cb-sel' }, Object.keys(PRESETS).map((k) => h('option', { value: k }, PRESETS[k].n)));
    presetSel.value = opts.preset || 'simple';
    presetSel.addEventListener('change', () => load(presetSel.value));
    const dotT = PS.ui.toggle('显示电流', true, (v) => { st.dots = v; S.render(); });
    const eSeg = PS.ui.seg([{ value: false, label: '电流方向' }, { value: true, label: '电子移动' }], false, (v) => { st.electron = v; });
    const numT = PS.ui.toggle('直接显示电流表示数', !opts.hideNum, (v) => { st.shown = v; S.render(); });
    const view = h('div');
    const selBox = h('div', { class: 'cb-selbox' });
    const msg = h('div', { class: 'el-msg info' });
    const dialBox = h('div', { style: { display: 'none' } });
    el.append(bar,
      h('div', { class: 'el-pair cb-pair' },
        h('div', null, view, h('div', { class: 'controls', style: { marginTop: '6px' } }, h('label', { class: 'small' }, '示例：', presetSel), PS.ui.button('清空', () => load('empty'), 'btn btn-ghost btn-sm'), dotT.el, eSeg.el)),
        h('div', null, h('div', { class: 'panel' }, h('h4', null, '选中的元件'), selBox), h('div', { class: 'panel' }, h('h4', null, '电路分析'), msg, h('div', { style: { marginTop: '6px' } }, numT.el)), dialBox)));
    const S = PS.stage(view, { ratio: VW + ' / ' + VH, draw });
    S.canvas.style.touchAction = 'none';
    const DS = { box: dialBox, amm: null };
    let dialS = null;
    if (opts.dial !== false && tools.indexOf('amm') >= 0) {
      dialBox.append(h('div', { class: 'panel' }, h('h4', { class: 'cb-dial-t' }, '电流表的表盘'), h('div', { class: 'cb-dial' }), h('p', { class: 'small muted', style: { margin: '4px 0 0' } }, '读数时先看量程：0~0.6 A 每小格 0.02 A，0~3 A 每小格 0.1 A。')));
      dialS = PS.stage(dialBox.querySelector('.cb-dial'), { ratio: '1 / 0.92', draw: drawDial });
    }

    function setTool(k) {
      st.tool = k; st.pend = null;
      if (k !== 'pick' && st.sel) { st.sel = null; selPanel(); }
      Object.keys(toolBtns).forEach((t) => toolBtns[t].classList.toggle('on', t === k));
      S.canvas.style.cursor = k === 'pick' ? '' : 'crosshair';
      S.render();
    }

    // ---------- 元件与几何 ----------
    const mid = (e) => [(e.p[0][0] + e.p[1][0]) / 2, (e.p[0][1] + e.p[1][1]) / 2];
    function edgesOf(e) {
      if (e.t === 'wire') { const r = []; for (let k = 1; k < e.path.length; k++) r.push(EK(e.path[k - 1], e.path[k])); return r; }
      const m = mid(e); return [EK(e.p[0], m), EK(m, e.p[1])];
    }
    const pointsOf = (e) => (e.t === 'wire' ? e.path.map(K) : [K(e.p[0]), K(e.p[1])]);
    const inside = (p) => p[0] >= 0 && p[0] <= COLS && p[1] >= 0 && p[1] <= ROWS;
    function fits(e, ignore) {
      const pts = e.t === 'wire' ? e.path : [e.p[0], mid(e), e.p[1]];
      if (!pts.every(inside)) return false;
      const E = new Set(edgesOf(e)), P = new Set(pointsOf(e)), M = e.t === 'wire' ? null : K(mid(e));
      for (const o of st.els) {
        if (o === ignore) continue;
        if (edgesOf(o).some((x) => E.has(x))) return false;
        if (o.t !== 'wire') { const om = K(mid(o)); if (P.has(om) || om === M) return false; }
        if (M && pointsOf(o).indexOf(M) >= 0) return false;
      }
      return true;
    }
    function nextLabel(t) {
      const pre = TYPES[t].pre;
      if (!pre) return '';
      const used = new Set(st.els.filter((e) => e.t === t).map((e) => e.label));
      for (let i = 1; ; i++) if (!used.has(pre + i)) return pre + i;
    }
    function make(t, p1, p2, o) {
      const e = Object.assign({ id: 'e' + ++uid, t, p: [p1, p2] }, t === 'bat' ? { n: 2 } : {}, t === 'sw' ? { on: false } : {}, t === 'amm' ? { range: 0.6 } : {}, o || {});
      if (e.label == null) e.label = nextLabel(t);
      return e;
    }
    function load(k) {
      const P = PRESETS[k] || PRESETS.empty;
      st.els = []; st.sel = null; uid = 0;
      P.els.forEach((d) => {
        if (d[0] === 'w') st.els.push({ id: 'e' + ++uid, t: 'wire', path: route(d.slice(1)) });
        else st.els.push(make(d[0], d[1], d[2], Object.assign({}, d[3] || {})));
      });
      presetSel.value = k;
      setTool('pick');
      solve();
    }
    /** 把拐点连成逐格的路径 */
    function route(pts) {
      const r = [pts[0].slice()];
      for (let k = 1; k < pts.length; k++) {
        let [i, j] = r[r.length - 1];
        const [ti, tj] = pts[k];
        while (i !== ti) { i += Math.sign(ti - i); r.push([i, j]); }
        while (j !== tj) { j += Math.sign(tj - j); r.push([i, j]); }
      }
      return r;
    }

    // ---------- 求解 ----------
    function netlist() {
      const els = [];
      st.els.forEach((e) => {
        if (e.t === 'wire') { for (let k = 1; k < e.path.length; k++) els.push({ id: e.id + ':' + k, t: 'wire', a: K(e.path[k - 1]), b: K(e.path[k]) }); return; }
        const n = { id: e.id, t: e.t, a: K(e.p[0]), b: K(e.p[1]) };
        if (e.t === 'bat') { n.E = 1.5 * e.n; n.r = 0.5 * e.n; }
        if (e.t === 'sw') n.on = e.on;
        if (e.t === 'bulb') { n.open = e.open || e.burnt; if (e.R) n.R = e.R; if (e.Pn) n.Pn = e.Pn; }
        els.push(n);
      });
      return { els };
    }
    function solve() {
      for (let k = 0; k < 4; k++) {
        st.sol = EL.solve(netlist());
        let burnt = false;
        st.els.forEach((e) => { if (e.t === 'bulb' && !e.burnt && (st.sol.P[e.id] || 0) > 2.8 * (e.Pn || BULB_PN)) { e.burnt = true; burnt = true; } });
        if (!burnt) break;
        PS.sound.bad(); PS.toast('灯泡两端的电压太高，灯丝烧断了！');
      }
      st.deg = {};
      netlist().els.forEach((n) => { st.deg[n.a] = (st.deg[n.a] || 0) + 1; st.deg[n.b] = (st.deg[n.b] || 0) + 1; });
      analyse();
      selPanel();
      if (dialS) { DS.box.style.display = st.els.some((e) => e.t === 'amm') ? '' : 'none'; dialS.render(); }
      S.render();
    }
    const I = (id) => (st.sol ? st.sol.I[id] || 0 : 0);
    const lit = (e) => {
      if (!st.sol) return 0;
      if (e.t === 'led') return PS.clamp(I(e.id) / 0.03, 0, 1.4);
      if (e.t === 'bell') return Math.abs(I(e.id)) > 0.02 ? 1 : 0;
      return Math.max(0, (st.sol.P[e.id] || 0) / (e.Pn || BULB_PN));
    };

    function analyse() {
      const s = st.sol, bats = st.els.filter((e) => e.t === 'bat');
      const lines = [];
      let cls = 'info';
      if (!st.els.length) { msg.className = 'el-msg info'; msg.innerHTML = '画面是空的。点上面的按钮选一种元件，再点画面把它放上去；用“〰️ 画导线”把元件连起来。也可以从“示例”中选一个电路。'; return; }
      if (!bats.length) { msg.className = 'el-msg info'; msg.innerHTML = '电路中还没有<b>电源</b>，不会有电流。放一个电池吧。'; return; }
      if (s.short.length) { lines.push('⚠️ <b>电源短路！</b>导线直接把电源的两极连了起来，电流很大（约 ' + PS.fmt(s.out[s.short[0]], 1) + ' A），会烧坏电源，甚至引起火灾。快断开开关或拆掉那根导线！'); cls = 'bad'; }
      const Ibat = bats.reduce((m, b) => Math.max(m, Math.abs(s.out[b.id] || 0)), 0);
      const find = EL.groups(netlist());
      st.els.forEach((e) => {
        if (e.t === 'wire') return;
        const nm = e.label || TYPES[e.t].n;
        if (e.t === 'bulb') {
          const b = lit(e);
          if (e.burnt) lines.push('💥 ' + nm + ' 的灯丝烧断了（选中它，点“换一个新灯泡”）。');
          else if (e.open) lines.push('○ ' + nm + ' 被拧下来了。');
          else if (b > 0.04) lines.push('💡 ' + nm + (b > 0.7 ? ' 正常发光' : b > 0.25 ? ' 发光（较暗）' : ' 很暗') + '，电流 ' + PS.fmt(Math.abs(I(e.id)), 2) + ' A。');
          else if (find(K(e.p[0])) === find(K(e.p[1]))) lines.push('○ ' + nm + ' 不亮：两端被导线直接连起来了，<b>被短路</b>。');
          else if (s.short.length) lines.push('○ ' + nm + ' 不亮：没有电流通过它。');
          else lines.push('○ ' + nm + ' 不亮：没有电流通过（<b>断路</b>）。');
        } else if (e.t === 'amm') {
          const v = I(e.id);
          if (v < -0.005) { lines.push('⚠️ 电流表 ' + nm + ' 的<b>正、负接线柱接反了</b>，指针向左偏，可能损坏电流表！'); cls = 'bad'; }
          else if (v > e.range) { lines.push('⚠️ 电流表 ' + nm + ' <b>超过量程</b>（指针打到头），' + (e.range < 1 ? '应换用 0~3 A 量程。' : '电流太大了！')); cls = 'bad'; }
          else if (st.shown) lines.push('Ⓐ 电流表 ' + nm + ' 的示数：' + PS.fmt(EL.reading(v, e.range), 2) + ' A（量程 0~' + e.range + ' A）。');
        } else if (e.t === 'motor') lines.push(Math.abs(I(e.id)) > 0.02 ? '⚙️ 电动机转动' + (I(e.id) < 0 ? '（反转）' : '') + '。' : '⚙️ 电动机不转。');
        else if (e.t === 'led') lines.push(lit(e) > 0.05 ? '🔴 发光二极管发光。' : '○ 发光二极管不发光' + (st.sol.V[K(e.p[1])] - st.sol.V[K(e.p[0])] > 0.5 ? '：<b>接反了</b>，电流不能从负极流向正极。' : '。'));
        else if (e.t === 'bell') lines.push(lit(e) ? '🔔 电铃在响。' : '🔕 电铃不响。');
      });
      const dangling = Object.keys(st.deg || {}).filter((k) => st.deg[k] === 1).length;
      if (dangling) lines.push('<span class="muted">提示：有 ' + dangling + ' 个接线端没有连上（画面上的空心小圆圈）。</span>');
      if (!s.short.length && cls !== 'bad') cls = Ibat > 0.005 ? 'ok' : 'info';
      if (Ibat < 0.005 && !s.short.length) lines.unshift('电路中<b>没有电流</b>：电路没有闭合（开关断开或某处断开）。');
      msg.className = 'el-msg ' + cls; msg.innerHTML = lines.join('<br>');
    }

    // ---------- 选中元件的工具 ----------
    function selPanel() {
      selBox.innerHTML = '';
      const e = st.sel;
      if (!e) { selBox.append(h('p', { class: 'small muted', style: { margin: 0 } }, st.tool === 'pick' ? '点一下画面中的元件选中它；点开关可以直接闭合、断开。' : st.tool === 'wire' ? '画导线：从一个格点按住拖到另一个格点（或先点起点、再点终点）。导线要连到元件两端的小圆圈上。' : '点一下画面，把' + TYPES[st.tool].n + '放在那里。')); return; }
      const nm = (e.label ? e.label + ' · ' : '') + (e.t === 'wire' ? '导线' : TYPES[e.t].n);
      const row = h('div', { class: 'el-chips' });
      selBox.append(h('div', { style: { fontWeight: 800 } }, nm), row);
      const act = (t, f, c) => row.append(PS.ui.button(t, () => { f(); solve(); }, c || 'btn btn-sm'));
      if (e.t === 'sw') act(e.on ? '断开开关' : '闭合开关', () => { e.on = !e.on; PS.sound.clack(); }, 'btn btn-primary btn-sm');
      if (e.t === 'bulb') { if (e.burnt) act('换一个新灯泡', () => { e.burnt = false; }); else act(e.open ? '拧上灯泡' : '拧下灯泡', () => { e.open = !e.open; }); }
      if (e.t !== 'wire') act('⟳ 旋转', () => rotate(e));
      if (e.t === 'bat' || e.t === 'amm' || e.t === 'led' || e.t === 'motor') act('⇄ 调换两端', () => { e.p = [e.p[1], e.p[0]]; });
      if (e.t === 'bat') row.append(PS.ui.seg([1, 2, 3].map((v) => ({ value: v, label: v + ' 节' })), e.n, (v) => { e.n = v; solve(); }).el);
      if (e.t === 'amm') row.append(PS.ui.seg([{ value: 0.6, label: '0~0.6 A' }, { value: 3, label: '0~3 A' }], e.range, (v) => { e.range = v; solve(); }).el);
      act('🗑 删除', () => { st.els = st.els.filter((x) => x !== e); st.sel = null; }, 'btn btn-ghost btn-sm');
    }
    function rotate(e) {
      const m = mid(e), d = [e.p[1][0] - m[0], e.p[1][1] - m[1]];
      const n = Object.assign({}, e, { p: [[m[0] + d[1], m[1] - d[0]], [m[0] - d[1], m[1] + d[0]]] });
      if (fits(n, e)) e.p = n.p; else PS.toast('旋转后会和别的元件或导线重叠。');
    }

    // ---------- 指针操作 ----------
    const vp = (ev) => { const p = S.pos(ev); return [(p.x * VW) / S.w, (p.y * VH) / S.h]; };
    const near = (q) => [PS.clamp(Math.round(q[0] / C - 0.5), 0, COLS), PS.clamp(Math.round(q[1] / C - 0.5), 0, ROWS)];
    function segDist(q, a, b) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
      const t = PS.clamp(((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2, 0, 1);
      return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy);
    }
    function hit(q) {
      let best = null, bd = 1e9;
      st.els.forEach((e) => {
        if (e.t === 'wire') return;
        const d = segDist(q, [X(e.p[0][0]), Y(e.p[0][1])], [X(e.p[1][0]), Y(e.p[1][1])]);
        if (d < C * 0.42 && d < bd) { bd = d; best = e; }
      });
      if (best) return best;
      st.els.forEach((e) => {
        if (e.t !== 'wire') return;
        for (let k = 1; k < e.path.length; k++) {
          const d = segDist(q, [X(e.path[k - 1][0]), Y(e.path[k - 1][1])], [X(e.path[k][0]), Y(e.path[k][1])]);
          if (d < C * 0.2 && d < bd) { bd = d; best = e; }
        }
      });
      return best;
    }
    function extend(path, p) {
      const last = path[path.length - 1];
      if (p[0] === last[0] && p[1] === last[1]) return;
      for (const s of route([last, p]).slice(1)) {
        const at = path.findIndex((x) => x[0] === s[0] && x[1] === s[1]);
        if (at >= 0) path.length = at + 1; else path.push(s);
      }
    }
    function addWire(path) {
      if (path.length < 2) return false;
      const w = { id: 'e' + ++uid, t: 'wire', path: path.map((p) => p.slice()) };
      if (!fits(w)) { PS.toast('导线不能穿过元件，也不能和已有的导线重叠。'); PS.sound.bad(); return false; }
      st.els.push(w); PS.sound.tick(); return true;
    }
    S.canvas.addEventListener('pointerdown', (ev) => {
      const q = vp(ev);
      ev.preventDefault();
      if (st.tool === 'wire') {
        const p = near(q);
        if (Math.hypot(X(p[0]) - q[0], Y(p[1]) - q[1]) > C * 0.5) return;
        st.wdrag = { path: [p], start: p };
        S.canvas.setPointerCapture(ev.pointerId);
      } else if (st.tool === 'pick') {
        const e = hit(q);
        st.press = e ? { e, q0: q, moved: false, p0: e.p ? e.p.map((x) => x.slice()) : null } : null;
        if (e) S.canvas.setPointerCapture(ev.pointerId);
        else { st.sel = null; selPanel(); S.render(); }
      }
      S.render();
    });
    S.canvas.addEventListener('pointermove', (ev) => {
      const q = vp(ev);
      if (st.wdrag) { extend(st.wdrag.path, near(q)); S.render(); return; }
      const pr = st.press;
      if (pr && pr.e.t !== 'wire') {
        if (!pr.moved && Math.hypot(q[0] - pr.q0[0], q[1] - pr.q0[1]) > C * 0.35) pr.moved = true;
        if (pr.moved) {
          const di = Math.round((q[0] - pr.q0[0]) / C), dj = Math.round((q[1] - pr.q0[1]) / C);
          const n = { t: pr.e.t, p: pr.p0.map((x) => [x[0] + di, x[1] + dj]) };
          if (fits(n, pr.e)) { pr.e.p = n.p; S.render(); }
        }
      }
    });
    const up = (ev) => {
      if (st.wdrag) {
        const w = st.wdrag; st.wdrag = null;
        if (w.path.length >= 2) { addWire(w.path); st.pend = null; solve(); }
        else if (st.pend) { const pth = route([st.pend, w.start]); st.pend = null; if (pth.length >= 2) addWire(pth); solve(); }
        else { st.pend = w.start; S.render(); }
        return;
      }
      if (st.press) {
        const pr = st.press; st.press = null;
        if (pr.moved) { solve(); return; }
        st.sel = pr.e;
        if (pr.e.t === 'sw') { pr.e.on = !pr.e.on; PS.sound.clack(); }
        solve();
        return;
      }
      if (ev && ev.type === 'pointerup' && st.tool !== 'pick' && st.tool !== 'wire') {
        const m = near(vp(ev)), t = st.tool;
        let e = make(t, [m[0] - 1, m[1]], [m[0] + 1, m[1]]);
        if (!fits(e)) e = make(t, [m[0], m[1] - 1], [m[0], m[1] + 1]);
        if (!fits(e)) { PS.toast('这里放不下，换个空一点的地方。'); PS.sound.bad(); return; }
        st.els.push(e); st.sel = e; PS.sound.tick();
        setTool('pick');
        solve();
      }
    };
    S.canvas.addEventListener('pointerup', up);
    S.canvas.addEventListener('pointercancel', () => { st.wdrag = null; st.press = null; S.render(); });

    // ---------- 绘制 ----------
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fbfcfe'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#ced4da';
      for (let i = 0; i <= COLS; i++) for (let j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.arc(X(i), Y(j), 2.4, 0, Math.PI * 2); ctx.fill(); }
      const sol = st.sol, short = sol && sol.short.length;
      const lw = 3.2;
      // 导线
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      st.els.forEach((e) => {
        if (e.t !== 'wire') return;
        for (let k = 1; k < e.path.length; k++) {
          const hot = short && Math.abs(I(e.id + ':' + k)) > 1;
          ctx.strokeStyle = e === st.sel ? '#3b5bdb' : hot ? '#e03131' : '#1b2333'; ctx.lineWidth = e === st.sel ? lw + 2 : hot ? lw + 1.5 : lw;
          ctx.beginPath(); ctx.moveTo(X(e.path[k - 1][0]), Y(e.path[k - 1][1])); ctx.lineTo(X(e.path[k][0]), Y(e.path[k][1])); ctx.stroke();
        }
      });
      // 电流
      if (st.dots && sol) {
        const dot = (id, a, b) => { const v = I(id); if (Math.abs(v) < 2e-4) return; EL.dots(ctx, [[X(a[0]), Y(a[1])], [X(b[0]), Y(b[1])]], st.T * EL.speed(v), { gap: C / 2, r: 5, electron: st.electron, sign: true }); };
        st.els.forEach((e) => {
          if (e.t === 'wire') for (let k = 1; k < e.path.length; k++) dot(e.id + ':' + k, e.path[k - 1], e.path[k]);
          else dot(e.id, e.p[0], e.p[1]);
        });
      }
      // 元件
      st.els.forEach((e) => {
        if (e.t === 'wire') return;
        const x1 = X(e.p[0][0]), y1 = Y(e.p[0][1]), x2 = X(e.p[1][0]), y2 = Y(e.p[1][1]);
        const hl = e === st.sel ? '#3b5bdb' : null;
        const vert = Math.abs(x1 - x2) < 1;
        EL.sym(ctx, e.t === 'bat' ? 'bat' : e.t, x1, y1, x2, y2, { F, size: C * 0.62, n: e.n, on: e.on, open: e.open || e.burnt, lit: lit(e), label: e.label, ls: e.ls || (vert ? -1 : 1), hl, lw: 3 });
        const ux = (x2 - x1) / (2 * C), uy = (y2 - y1) / (2 * C), nx = vert ? 1 : 0, ny = vert ? 0 : 1;
        if (e.t === 'bat' || e.t === 'amm' || e.t === 'led') {
          const off = C * 0.42, side = C * 0.3;
          D.text(ctx, '+', x1 + ux * off + nx * side, y1 + uy * off + ny * side, { size: F(14), weight: 900, align: 'center', baseline: 'middle', color: '#e03131' });
          D.text(ctx, '−', x2 - ux * off + nx * side, y2 - uy * off + ny * side, { size: F(14), weight: 900, align: 'center', baseline: 'middle', color: '#1b2333' });
        }
        if (e.t === 'bat' && short) { ctx.save(); ctx.globalAlpha = 0.3 + 0.2 * Math.sin(st.T * 12); ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.arc((x1 + x2) / 2, (y1 + y2) / 2, C * 0.62, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        if (e.t === 'motor' && Math.abs(I(e.id)) > 0.02) {
          const a = st.T * 9 * Math.sign(I(e.id)), cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, r = C * 0.5;
          ctx.save(); ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, r, a, a + 1.4); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r, a + Math.PI, a + Math.PI + 1.4); ctx.stroke(); ctx.restore();
        }
        if (e.t === 'amm') {
          const v = I(e.id), cx = (x1 + x2) / 2 + (vert ? C * 0.95 : 0), cy = (y1 + y2) / 2 + (vert ? 0 : C * 0.68);
          const bad = v < -0.005 || v > e.range;
          const tx = bad ? (v < 0 ? '接反了！' : '超量程！') : st.shown ? PS.fmt(EL.reading(v, e.range), 2) + ' A' : '?';
          D.text(ctx, tx, cx, cy, { size: F(13), weight: 800, align: 'center', baseline: 'middle', color: bad ? '#e03131' : '#3b5bdb', bg: 'rgba(255,255,255,.9)' });
        }
      });
      // 连接点与空着的接线端
      Object.keys(st.deg || {}).forEach((k) => {
        const [i, j] = k.split(',').map(Number);
        if (st.deg[k] >= 3) EL.dot(ctx, X(i), Y(j), 6);
        else if (st.deg[k] === 1) { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X(i), Y(j), 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      });
      // 正在画的导线
      const wp = st.wdrag ? st.wdrag.path : null;
      if (wp && wp.length) {
        ctx.save(); ctx.strokeStyle = 'rgba(59,91,219,.8)'; ctx.lineWidth = lw + 1; ctx.setLineDash([10, 7]);
        ctx.beginPath(); wp.forEach((p, k) => (k ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke(); ctx.restore();
        EL.dot(ctx, X(wp[0][0]), Y(wp[0][1]), 7, '#3b5bdb');
      }
      if (st.pend) { ctx.save(); ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(st.pend[0]), Y(st.pend[1]), 11, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); D.text(ctx, '起点', X(st.pend[0]), Y(st.pend[1]) - F(13) * 1.3, { size: F(12), weight: 800, align: 'center', color: '#3b5bdb' }); }
      if (!st.els.length) D.text(ctx, '空白的电路板：选一种元件，点一下这里把它放上去', VW / 2, VH / 2, { size: F(16), weight: 700, align: 'center', baseline: 'middle', color: '#868e96' });
    }

    function drawDial(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, 400, 368);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 400, 368);
      const a = st.sel && st.sel.t === 'amm' ? st.sel : st.els.find((e) => e.t === 'amm');
      if (!a) return;
      const t = DS.box.querySelector('.cb-dial-t'); if (t) t.textContent = '电流表 ' + (a.label || '') + ' 的表盘（量程 0~' + a.range + ' A）';
      EL.dial(ctx, 200, 150, 330, { v: I(a.id), range: a.range, terms: true, sel: ['-', String(a.range)], F });
    }

    const loop = PS.loop((dt) => { st.T += dt; if (st.dots || (st.sol && st.sol.short.length) || st.els.some((e) => e.t === 'motor')) S.render(); }, view);
    loop.start();
    el._st = st; el._load = load; el._solve = solve; el._add = (t, p1, p2, o) => { const e = make(t, p1, p2, o); if (!fits(e)) return null; st.els.push(e); solve(); return e; };
    el._wire = (pts) => { const ok = addWire(route(pts)); solve(); return ok; };
    load(opts.preset || 'simple');
  });

  if (!document.getElementById('cb-style')) document.head.append(h('style', { id: 'cb-style' }, `
    .cb-tools{margin:0 0 8px}
    .cb-pair{grid-template-columns:minmax(0,1fr) minmax(0,290px)}
    .cb-selbox .el-chips .seg{margin:0}
    @media (max-width:680px){.cb-pair{grid-template-columns:minmax(0,1fr)}}
  `));
})();
