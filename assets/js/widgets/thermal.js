/*
 * 看得见的物理 · 第13章公共库（内能）
 * PS.TC                      配色：hot 高温、cold 低温、Q 热量、k 分子动能、p 分子势能、u 内能（与第11章 PS.EC.q 相同）、W 做功、m 机械能
 * PS.CAP / PS.CAP_ORDER      教材“一些物质的比热容”表：{ 键: { n 名称, c J/(kg·℃), col 颜色, s 状态 } }，PS.CAP_ORDER 为表中顺序
 * PS.th.fmtQ(x)              热量读数（HTML）：4.2 × 10<sup>5</sup> J
 * PS.th.fmtC(c)              比热容读数（HTML）：4.2 × 10<sup>3</sup> J/(kg·℃)
 * PS.th.txt(x)               画布用的数字（4.2×10⁵）；PS.th.parse(s) 解析输入（支持 4.2×10^3）
 * PS.th.ball(ctx, x, y, r, c)        带高光的分子小球
 * PS.th.heatColor(f)         0（冷，蓝）~ 1（热，红）的颜色
 * PS.th.dthermo(ctx, x, y, T, o)     数字温度计读数框（o.F 字号函数、o.label、o.d 小数位、o.w 宽）
 * PS.th.qArrow(ctx, x1, y1, x2, y2, o)  热量传递的宽箭头（o.label、o.color、o.w 宽、o.alpha）
 * PS.th.wave(ctx, x, y, w, t, o)     热辐射的波纹 / 热气
 * PS.th.c3(c)                比热容的教材写法（0.39×10³）
 * PS.th.three(view, o)       three.js 场景的公共部分（渲染器、摄像机、OrbitControls、灯光、标签 label / place、摄像机缓动 fly、ResizeObserver）
 * 组件 heat-quiz             Q = cmΔt、热平衡的计算随机练习（opts.set = 'basic' 只出前 6 类）
 * 共用样式 .th-msg（.ok / .bad / .info）、.th-pair、.th-chips、.th-read、.th-q、.th-ans
 * 依赖 core.js、heat.js（温度计、烧杯、酒精灯、温度—时间图像）、energy.js（PS.EC、PS.en.bars / stage / parse / txt）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.TC = { hot: '#f03e3e', cold: '#1c7ed6', Q: '#e8590c', k: '#f08c00', p: '#0c8599', u: '#e03131', W: '#7048e8', m: '#1b2333' };

  /* 一些物质的比热容 c / [J/(kg·℃)]（人教版九年级教材表） */
  PS.CAP = {
    water: { n: '水', c: 4.2e3, col: '#4dabf7', s: '液' },
    alcohol: { n: '酒精', c: 2.4e3, col: '#99e9f2', s: '液' },
    kerosene: { n: '煤油', c: 2.1e3, col: '#ffe8a1', s: '液' },
    ice: { n: '冰', c: 2.1e3, col: '#d0ebff', s: '固' },
    oil: { n: '色拉油', c: 1.97e3, col: '#ffd43b', s: '液' },
    castor: { n: '蓖麻油', c: 1.8e3, col: '#f5d76e', s: '液' },
    sand: { n: '砂石', c: 0.92e3, col: '#d9b38c', s: '固', approx: true },
    al: { n: '铝', c: 0.88e3, col: '#ced4da', s: '固' },
    soil: { n: '干泥土', c: 0.84e3, col: '#a9825a', s: '固', approx: true },
    iron: { n: '铁、钢', c: 0.46e3, col: '#868e96', s: '固' },
    cu: { n: '铜', c: 0.39e3, col: '#e8935a', s: '固' },
    hg: { n: '水银', c: 0.14e3, col: '#adb5bd', s: '液' },
  };
  PS.CAP_ORDER = ['water', 'alcohol', 'kerosene', 'ice', 'oil', 'castor', 'sand', 'al', 'soil', 'iron', 'cu', 'hg'];

  const TH = (PS.th = {});
  TH.parse = (s) => PS.en.parse(String(s).replace(/，/g, ''));
  TH.txt = (x, sig) => PS.en.txt(x, sig);
  TH.fmtQ = (x, sig) => PS.pretty(x, sig || 3) + ' J';
  /** 比热容的教材写法：0.39×10³ */
  TH.c3 = (c) => String(PS.round(c / 1000, 3)) + '×10³';
  TH.fmtC = (c) => TH.c3(c) + ' J/(kg·℃)';

  /** 带高光的分子小球 */
  TH.ball = function (ctx, x, y, r, c) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.12, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.38, c); g.addColorStop(1, c);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  };

  /** 0（冷）~ 1（热）的颜色：蓝 → 紫 → 红 */
  TH.heatColor = (f) => (f < 0.5 ? PS.mixColor('#1c7ed6', '#9c36b5', f * 2) : PS.mixColor('#9c36b5', '#f03e3e', (f - 0.5) * 2));

  /** 数字温度计读数框：中心 (x, y) */
  TH.dthermo = function (ctx, x, y, T, o) {
    o = o || {};
    const F = o.F || ((v) => v), fs = F(o.fs || 16), w = o.w || fs * 5.4, hh = fs * 1.75;
    ctx.save();
    ctx.fillStyle = '#212529'; D.roundRect(ctx, x - w / 2, y - hh / 2, w, hh, 7); ctx.fill();
    ctx.fillStyle = '#0b1a12'; D.roundRect(ctx, x - w / 2 + 4, y - hh / 2 + 4, w - 8, hh - 8, 5); ctx.fill();
    const s = T == null ? '— ℃' : PS.fmtT(T, o.d == null ? 1 : o.d);
    D.text(ctx, s, x, y + 1, { size: fs, weight: 800, align: 'center', baseline: 'middle', color: o.color || '#8ce99a' });
    if (o.label) D.text(ctx, o.label, x, y + hh / 2 + F(13) * 1.1, { size: F(13), weight: 700, align: 'center', color: o.lc || '#495057' });
    ctx.restore();
  };

  /** 热量传递的宽箭头 */
  TH.qArrow = function (ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const w = o.w || 26, L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(L * 0.45, w * 1.1);
    if (L < 4) return;
    ctx.save();
    ctx.translate(x1, y1); ctx.rotate(a);
    ctx.globalAlpha = o.alpha == null ? 0.85 : o.alpha;
    const g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, o.from || PS.TC.hot); g.addColorStop(1, o.to || PS.TC.Q);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -w * 0.32); ctx.lineTo(L - hd, -w * 0.32); ctx.lineTo(L - hd, -w * 0.62); ctx.lineTo(L, 0); ctx.lineTo(L - hd, w * 0.62); ctx.lineTo(L - hd, w * 0.32); ctx.lineTo(0, w * 0.32); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (o.label) D.text(ctx, o.label, (x1 + x2) / 2, (y1 + y2) / 2 - w * 0.62 - 4, { size: o.fs || 14, weight: 800, align: 'center', color: o.lc || PS.TC.Q });
  };

  /** 热气 / 热辐射的波纹：从 (x, y) 向上（o.dir 角度）画几条波浪线 */
  TH.wave = function (ctx, x, y, len, t, o) {
    o = o || {};
    const n = o.n || 3, gap = o.gap || 16, a = o.dir == null ? -Math.PI / 2 : o.dir;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
    ctx.strokeStyle = o.color || 'rgba(240,62,62,.55)'; ctx.lineWidth = o.lw || 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const ox = (i - (n - 1) / 2) * gap;
      ctx.beginPath();
      for (let s = 0; s <= len; s += 3) {
        const yy = -s, xx = ox + Math.sin(s * 0.12 - t * 6 + i) * 4;
        s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  /**
   * three.js 场景的公共部分：TH.three(view, { cam: [x, y, z], target: [x, y, z], bg, fov, min, max })
   * 返回 { renderer, scene, camera, controls, Std(颜色, 参数), tex(w, h, fn(g, w, h)), label(文字, 类名), place(标签, Vector3), render(), fly(cam, target) }
   */
  TH.three = function (view, o) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    view.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(o.bg == null ? 0xeef2f7 : o.bg);
    const camera = new THREE.PerspectiveCamera(o.fov || 40, 16 / 10, 0.01, 30);
    camera.position.set(o.cam[0], o.cam[1], o.cam[2]);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(o.target[0], o.target[1], o.target[2]);
    controls.enableDamping = true; controls.minDistance = o.min || 0.15; controls.maxDistance = o.max || 3; controls.maxPolarAngle = Math.PI * 0.56;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9080, 0.85));
    const dl = new THREE.DirectionalLight(0xffffff, 0.65); dl.position.set(0.5, 2, 1.4); scene.add(dl);
    const v3 = new THREE.Vector3();
    const fly = { cam: null, tgt: null };
    const api = {
      renderer, scene, camera, controls,
      Std: (c, e) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, e || {})),
      tex(w, hh, fn) { const c = document.createElement('canvas'); c.width = w; c.height = hh; fn(c.getContext('2d'), w, hh); return new THREE.CanvasTexture(c); },
      label(t, cls) { const e = h('div', { class: 'label3d' + (cls ? ' ' + cls : ''), html: t }); view.append(e); return e; },
      place(e, p) {
        v3.copy(p).project(camera);
        if (v3.z > 1 || e.dataset.hide) { e.style.display = 'none'; return; }
        e.style.display = '';
        e.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * view.clientWidth) + 'px,' + ((-v3.y * 0.5 + 0.5) * view.clientHeight) + 'px) translate(-50%,-50%)';
      },
      /** 摄像机缓动到新的位置（与帧率无关） */
      fly(cam, tgt) { fly.cam = new THREE.Vector3(cam[0], cam[1], cam[2]); fly.tgt = new THREE.Vector3(tgt[0], tgt[1], tgt[2]); },
      render(dt) {
        if (fly.cam) {
          const k = Math.min(1, (dt || 0.016) * 4);
          camera.position.lerp(fly.cam, k); controls.target.lerp(fly.tgt, k);
          if (camera.position.distanceTo(fly.cam) < 0.002) fly.cam = null;
        }
        controls.update(); renderer.render(scene, camera);
      },
    };
    controls.addEventListener('start', () => { fly.cam = null; });
    function resize() {
      const w = view.clientWidth, hh = view.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    new ResizeObserver(resize).observe(view);
    resize();
    return api;
  };

  /* ================= 热量计算随机练习 ================= */
  PS.register('heat-quiz', function (el, opts) {
    const box = h('div', { class: 'th-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'J');
    const fb = h('div', { class: 'th-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'th-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), h('div', { class: 'small muted' }, '水的比热容取 4.2×10³ J/(kg·℃)；大数可以写成 3.36×10^5 或 336000。'), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, P = (x) => PS.pretty(PS.round(x, 6), 4), R = (x, d) => PS.round(x, d == null ? 2 : d);
    const C = PS.CAP;
    const cw = '4.2×10³ J/(kg·℃)';
    const GEN = {
      absorb: () => { const m = pick([0.5, 1, 2, 3, 5]), t0 = pick([10, 15, 20, 25, 30]), t = pick([50, 60, 70, 80, 90, 100]); const q = 4200 * m * (t - t0); return { q: '把质量为 ' + m + ' kg、温度为 ' + t0 + ' ℃ 的水加热到 ' + t + ' ℃，水吸收了多少热量？', a: q, u: 'J', sol: 'Q吸 = cm(t − t₀) = ' + cw + ' × ' + m + ' kg × (' + t + ' ℃ − ' + t0 + ' ℃) = ' + P(q) + ' J。' }; },
      rise: () => { const k = pick(['al', 'iron', 'cu', 'kerosene', 'alcohol', 'sand']), m = pick([0.2, 0.5, 1, 2, 4]), dt = pick([10, 20, 25, 30, 40, 50]); const q = C[k].c * m * dt; return { q: '质量为 ' + m + ' kg 的' + C[k].n.replace('、钢', '') + '，温度<b>升高了</b> ' + dt + ' ℃，吸收了多少热量？［c = ' + TH.c3(C[k].c) + ' J/(kg·℃)］', a: q, u: 'J', sol: '“升高了”就是温度的变化量 Δt = ' + dt + ' ℃：Q吸 = cmΔt = ' + TH.c3(C[k].c) + ' J/(kg·℃) × ' + m + ' kg × ' + dt + ' ℃ = ' + P(q) + ' J。' }; },
      release: () => { const k = pick(['al', 'iron', 'cu']), mg = pick([100, 200, 500, 800]), t0 = pick([80, 90, 100, 120]), t = pick([20, 25, 30, 40]); const q = C[k].c * mg / 1000 * (t0 - t); return { q: '质量为 ' + mg + ' g 的' + C[k].n.replace('、钢', '') + '块，温度从 ' + t0 + ' ℃ <b>降低到</b> ' + t + ' ℃，放出了多少热量？［c = ' + TH.c3(C[k].c) + ' J/(kg·℃)］', a: q, u: 'J', sol: 'm = ' + mg + ' g = ' + mg / 1000 + ' kg，Q放 = cm(t₀ − t) = ' + TH.c3(C[k].c) + ' J/(kg·℃) × ' + mg / 1000 + ' kg × (' + t0 + ' ℃ − ' + t + ' ℃) = ' + P(q) + ' J。' }; },
      cfind: () => { const k = pick(['al', 'iron', 'cu']), mg = pick([100, 200, 500]), t0 = pick([74, 84, 94, 104]), t = pick([24, 34, 44]); const q = C[k].c * mg / 1000 * (t0 - t); return { q: '质量为 ' + mg + ' g、初温为 ' + t0 + ' ℃ 的实心金属球放出 ' + P(q) + ' J 的热量后，温度降低到 ' + t + ' ℃。这种金属的比热容是多少？', a: C[k].c, u: 'J/(kg·℃)', sol: 'c = Q放/[m(t₀ − t)] = ' + P(q) + ' J ÷ [' + mg / 1000 + ' kg × (' + t0 + ' ℃ − ' + t + ' ℃)] = ' + P(C[k].c) + ' J/(kg·℃)，查比热容表，可能是<b>' + C[k].n + '</b>。' }; },
      dt: () => { const m = pick([0.5, 1, 2, 4, 5]), dt = pick([10, 15, 20, 25, 30, 40, 50]); const q = 4200 * m * dt; return { q: '质量为 ' + m + ' kg 的水吸收了 ' + P(q) + ' J 的热量，温度升高了多少？', a: dt, u: '℃', sol: 'Δt = Q吸/(cm) = ' + P(q) + ' J ÷ (' + cw + ' × ' + m + ' kg) = ' + dt + ' ℃。' }; },
      mass: () => { const m = pick([0.5, 1, 1.5, 2, 3, 5]), dt = pick([20, 30, 40, 50, 60]); const q = 4200 * m * dt; return { q: '把一壶水的温度升高 ' + dt + ' ℃，需要吸收 ' + P(q) + ' J 的热量。这壶水的质量是多少？', a: m, u: 'kg', sol: 'm = Q吸/(cΔt) = ' + P(q) + ' J ÷ (' + cw + ' × ' + dt + ' ℃) = ' + m + ' kg。' }; },
      tend: () => { const m = pick([1, 2, 4, 5]), t0 = pick([10, 15, 20, 25]), dt = pick([20, 30, 40, 50]); const q = 4200 * m * dt; return { q: '质量为 ' + m + ' kg、初温为 ' + t0 + ' ℃ 的水吸收了 ' + P(q) + ' J 的热量，水的温度<b>升高到</b>多少摄氏度？', a: t0 + dt, u: '℃', sol: 'Δt = Q吸/(cm) = ' + P(q) + ' J ÷ (' + cw + ' × ' + m + ' kg) = ' + dt + ' ℃，末温 t = t₀ + Δt = ' + t0 + ' ℃ + ' + dt + ' ℃ = ' + (t0 + dt) + ' ℃。' }; },
      boil: () => { const m = pick([1, 2, 5]), t0 = pick([20, 30, 40]), dt = pick([90, 100]); const q = 4200 * m * dt; return { q: '在 1 个标准大气压下，质量为 ' + m + ' kg、初温为 ' + t0 + ' ℃ 的水吸收了 ' + P(q) + ' J 的热量，水的温度升高到多少摄氏度？', a: 100, u: '℃', sol: '按公式 Δt = Q吸/(cm) = ' + dt + ' ℃，t₀ + Δt = ' + (t0 + dt) + ' ℃，但在 1 个标准大气压下水的沸点是 100 ℃，水沸腾时温度不再升高，所以水温只能升高到 <b>100 ℃</b>（多出的热量使水汽化）。' }; },
      mix: () => { let m1, m2, t1, t2, t; do { m1 = pick([1, 2, 3]); m2 = pick([1, 2, 3, 4]); t1 = pick([60, 70, 80, 90]); t2 = pick([10, 15, 20, 30]); t = (m1 * t1 + m2 * t2) / (m1 + m2); } while (Math.abs(t - Math.round(t)) > 1e-9); return { q: '把 ' + m1 + ' kg、' + t1 + ' ℃ 的热水与 ' + m2 + ' kg、' + t2 + ' ℃ 的冷水混合，不计热量损失，混合后水的温度是多少？', a: t, u: '℃', sol: 'Q吸 = Q放：cm₂(t − ' + t2 + ' ℃) = cm₁(' + t1 + ' ℃ − t)，' + m2 + '(t − ' + t2 + ') = ' + m1 + '(' + t1 + ' − t)，t = ' + t + ' ℃。' }; },
      ratio: () => { let a, b, c1, c2, r; do { a = pick([1, 2, 3]); b = pick([1, 2, 3]); c1 = pick([1, 2, 3]); c2 = pick([1, 2, 3, 4]); r = (b * c2) / (a * c1); } while (a === b && c1 === c2 || Math.abs(r * 4 - Math.round(r * 4)) > 1e-9); return { q: '甲、乙两物体的质量之比为 ' + a + ' : ' + b + '，比热容之比为 ' + c1 + ' : ' + c2 + '，它们吸收相同的热量后，甲升高的温度是乙的多少倍？', a: r, u: '倍', sol: 'Δt = Q/(cm)，Q 相同时 Δt甲/Δt乙 = (c乙m乙)/(c甲m甲) = (' + c2 + ' × ' + b + ')/(' + c1 + ' × ' + a + ') = ' + P(r) + '。' }; },
    };
    const SETS = { basic: ['absorb', 'rise', 'release', 'cfind', 'dt', 'mass'] };
    const keys = SETS[opts.set] || Object.keys(GEN);
    function next() {
      Q = GEN[pick(keys)]();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      inp.value = ''; inp.disabled = false;
      fb.className = 'th-msg'; fb.innerHTML = '吸热 Q吸 = cm(t − t₀)，放热 Q放 = cm(t₀ − t)；注意“升高了”和“升高到”的区别，质量的单位要换成 kg。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = TH.parse(inp.value);
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.abs(Q.a) * 0.006 + 1e-9;
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'th-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + P(Q.a) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });

  /* 第13章组件共用的样式 */
  if (!document.getElementById('th-style')) document.head.append(h('style', { id: 'th-style' }, `
    .th-msg{margin-top:8px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:7px 12px;font-size:.92rem;min-height:2.6em}
    .th-msg.ok{background:var(--green-soft);border-color:#b2f2bb}
    .th-msg.bad{background:var(--red-soft);border-color:#ffc9c9}
    .th-msg.info{background:var(--primary-soft);border-color:#bac8ff}
    .th-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,300px);gap:14px;align-items:start}
    .th-pair > div{min-width:0}
    .th-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .th-chips .btn.on{background:var(--primary);color:#fff;border-color:var(--primary)}
    .th-read{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px;margin-top:6px}
    .th-read .readout{margin:0}
    .th-q{background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-top:10px;font-size:.94rem}
    .th-q .q-options{margin-top:8px}
    .th-ans{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
    .th-ans input{width:120px}
    .th-hot{color:#f03e3e;font-weight:700}.th-cold{color:#1c7ed6;font-weight:700}.th-Q{color:#e8590c;font-weight:700}.th-u{color:#e03131;font-weight:700}
    @media (max-width:680px){.th-pair{grid-template-columns:minmax(0,1fr)}}
  `));
})();
