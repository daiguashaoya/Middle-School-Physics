/* 第4章第2节：光的反射——看见不发光的物体、反射定律中的角、作反射光路图、镜面反射与漫反射、镜子和白纸、雨后走夜路、分类练习。依赖 optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const C = PS.LIGHT;

  /** 一道填空小题：返回 { el, ask(q, ans, explain) } */
  function miniQuiz(title) {
    const stem = h('div', { class: 'q-stem' });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '答案', autocomplete: 'off' });
    const fb = h('span', { class: 'q-fb' });
    const sub = PS.ui.button('提交', () => check(), 'btn btn-primary btn-sm');
    const next = PS.ui.button('换一题', () => api.next && api.next(), 'btn btn-ghost btn-sm');
    const ex = h('div', { class: 'q-explain' });
    const el = h('div', { class: 'opt-q' }, h('div', { class: 'opt-qhead' }, h('b', null, title), next), stem, h('div', { class: 'q-fill' }, inp, h('span', { class: 'q-unit' }, '°'), sub, fb), ex);
    let cur = null;
    function check() {
      if (!cur || cur.done) return;
      const v = parseFloat(inp.value.replace('−', '-'));
      if (isNaN(v)) { inp.focus(); return; }
      cur.done = true;
      const ok = Math.abs(v - cur.ans) < 0.01;
      fb.className = 'q-fb ' + (ok ? 'ok' : 'bad'); fb.innerHTML = ok ? '✔ 正确' : '✘ 正确答案：' + cur.ans + '°';
      ex.innerHTML = '<b>解析：</b>' + cur.explain; ex.classList.add('show');
      ok ? PS.sound.good() : PS.sound.bad();
    }
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const api = {
      el,
      ask(q, ans, explain) { cur = { ans, explain, done: false }; stem.innerHTML = q; inp.value = ''; fb.innerHTML = ''; ex.classList.remove('show'); },
      next: null,
    };
    return api;
  }
  PS.miniQuiz = miniQuiz;

  /* ================= 我们为什么能看见不发光的物体 ================= */
  PS.register('see-objects', function (el) {
    const VW = 1000, VH = 420;
    const st = { on: true, path: true, obj: 'book', t: 0, ans: null };
    const OBJ = { book: { name: '课本', x: 470, y: 300 }, apple: { name: '苹果', x: 640, y: 296 } };
    const LAMP = { x: 190, y: 120 }, EYE = { x: 890, y: 165 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const onT = PS.ui.toggle('开灯', true, (v) => { st.on = v; upd(); });
    const pT = PS.ui.toggle('显示光的传播路径', true, (v) => { st.path = v; });
    const oSeg = PS.ui.seg([{ value: 'book', label: '看课本' }, { value: 'apple', label: '看苹果' }], st.obj, (v) => { st.obj = v; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    // 小题：光的传播路径
    const opts = ['眼睛 → ' + '物体', '灯 → 物体 → 眼睛', '物体 → 灯 → 眼睛', '眼睛 → 物体 → 灯'];
    const qbox = h('div', { class: 'q-options cols-2' });
    const qfb = h('div', { class: 'q-explain' });
    opts.forEach((o, k) => {
      const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABCD'[k] + '</span>' + o });
      b.addEventListener('click', () => {
        if (st.ans != null) return;
        st.ans = k;
        qbox.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === 1) x.classList.add('right'); });
        if (k !== 1) b.classList.add('wrong');
        k === 1 ? PS.sound.good() : PS.sound.bad();
        qfb.innerHTML = '<b>解析：</b>眼睛本身不发光，不会向外“发射”光。灯发出的光射到物体上，物体把光<b>反射</b>出来，其中一部分进入我们的眼睛，我们就看见了物体。画光路时箭头要<b>指向眼睛</b>。';
        qfb.classList.add('show');
      });
      qbox.append(b);
    });
    el.append(PS.ui.row(onT.el, pT.el, oSeg.el), msg, h('div', { class: 'opt-q' }, h('b', null, '想一想：我们看见课本时，光是怎样传播的？'), qbox, qfb));
    function upd() {
      const o = OBJ[st.obj];
      msg.className = 'feedback show ' + (st.on ? 'ok' : 'bad');
      msg.innerHTML = st.on
        ? '灯（光源）发出的光射到' + o.name + '上，' + o.name + '把光<b>反射</b>出来，射向四面八方，其中有一部分进入了眼睛——我们就看见了' + o.name + '。<b>任何物体的表面都会反射光。</b>'
        : '关灯后，没有光射到' + o.name + '上，也就没有光从' + o.name + '反射进入眼睛，所以什么也看不见。';
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = st.on ? '#f8f3e6' : '#10141c'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = st.on ? '#c9a87c' : '#1e1a15'; ctx.fillRect(80, 320, 700, 18); ctx.fillRect(110, 338, 14, 82); ctx.fillRect(736, 338, 14, 82);
      // 台灯
      ctx.fillStyle = st.on ? '#495057' : '#212529'; ctx.fillRect(130, 300, 90, 20); ctx.fillRect(150, 130, 8, 172);
      ctx.save(); ctx.translate(LAMP.x, LAMP.y); ctx.rotate(0.5);
      ctx.fillStyle = st.on ? '#1c7ed6' : '#1b2a3b'; ctx.beginPath(); ctx.moveTo(-40, -10); ctx.lineTo(40, -10); ctx.lineTo(55, 30); ctx.lineTo(-55, 30); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (st.on) { const g = ctx.createRadialGradient(LAMP.x + 12, LAMP.y + 26, 4, LAMP.x + 12, LAMP.y + 26, 240); g.addColorStop(0, 'rgba(255,236,153,.7)'); g.addColorStop(1, 'rgba(255,236,153,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(LAMP.x + 12, LAMP.y + 26, 240, 0, TAU); ctx.fill(); }
      // 物体
      const dim = st.on ? 1 : 0.12;
      ctx.globalAlpha = dim;
      ctx.fillStyle = '#e03131'; ctx.fillRect(OBJ.book.x - 60, OBJ.book.y, 120, 20);
      ctx.fillStyle = '#fff'; ctx.fillRect(OBJ.book.x - 56, OBJ.book.y + 3, 112, 6);
      D.text(ctx, '物理', OBJ.book.x, OBJ.book.y + 16, { size: F(11), weight: 800, color: '#fff', align: 'center' });
      ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(OBJ.apple.x, OBJ.apple.y, 22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b8a3e'; ctx.beginPath(); ctx.ellipse(OBJ.apple.x + 8, OBJ.apple.y - 26, 9, 4, -0.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      // 人
      ctx.fillStyle = st.on ? '#ffd8a8' : '#2a2520'; ctx.beginPath(); ctx.arc(EYE.x + 22, EYE.y + 5, 42, 0, TAU); ctx.fill();
      ctx.fillStyle = st.on ? '#495057' : '#1b1e22'; ctx.beginPath(); ctx.arc(EYE.x + 26, EYE.y - 8, 42, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
      ctx.fillStyle = st.on ? '#4263eb' : '#1a2140'; D.roundRect(ctx, EYE.x - 20, EYE.y + 48, 90, 140, 20); ctx.fill();
      PS.drawEye(ctx, EYE.x - 8, EYE.y, Math.PI * 0.88, 16, { bg: st.on ? '#fff' : '#555' });
      // 光路
      if (st.on && st.path) {
        const o = OBJ[st.obj], P = { x: o.x, y: o.y - (st.obj === 'book' ? 0 : 20) };
        const src = { x: LAMP.x + 20, y: LAMP.y + 30 };
        const flow = [14, 10];
        ctx.save(); ctx.lineDashOffset = -st.t * 60;
        [-14, 0, 14].forEach((dx) => PS.beam(ctx, [src, { x: P.x + dx, y: P.y }], { color: '#f59f00', width: 2, dash: flow, arrow: false }));
        ctx.restore();
        PS.arrowHead(ctx, (src.x + P.x) / 2, (src.y + P.y) / 2, V.ang(V.sub(P, src)), 14, '#f59f00');
        // 反射光射向各个方向
        for (let k = 0; k < 9; k++) {
          const a = -Math.PI + (k + 0.5) * (Math.PI / 9);
          const e = O.along(P, V.dir(a), 90);
          PS.beam(ctx, [P, e], { color: 'rgba(247,103,7,.45)', width: 1.4, arrow: 'end', head: 9 });
        }
        ctx.save(); ctx.lineDashOffset = -st.t * 60;
        PS.beam(ctx, [P, { x: EYE.x - 10, y: EYE.y }], { color: C.ray, width: 2.6, dash: flow });
        ctx.restore();
        PS.arrowHead(ctx, (P.x + EYE.x) / 2, (P.y + EYE.y) / 2, V.ang(V.sub({ x: EYE.x, y: EYE.y }, P)), 15, C.ray);
        D.text(ctx, '反射光进入眼睛', (P.x + EYE.x) / 2, (P.y + EYE.y) / 2 - 18, { size: F(13), weight: 800, color: C.ray, align: 'center', bg: 'rgba(255,255,255,.85)' });
      }
      D.text(ctx, '光源（台灯）', 175, 60, { size: F(13), weight: 800, color: st.on ? '#495057' : '#495057', align: 'center' });
      if (!st.on) D.text(ctx, '一片漆黑，什么也看不见', 500, 200, { size: F(18), weight: 800, color: '#868e96', align: 'center' });
      ctx.restore();
    }
    upd();
    loop.start();
  });

  /* ================= 反射定律中的角 ================= */
  PS.register('reflect-angles', function (el) {
    const VW = 1000, VH = 430;
    const Op = { x: 500, y: 360 }, R = 290;
    const st = { i: 40, tilt: 0, names: true, mir: true };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const nameT = PS.ui.toggle('显示名称', true, (v) => { st.names = v; S.render(); });
    const mirT = PS.ui.toggle('标出光线与镜面的夹角', true, (v) => { st.mir = v; S.render(); });
    const tS = PS.ui.slider({ label: '转动镜面（拓展）', min: -20, max: 20, step: 1, value: 0, unit: '°', onInput: (v) => { st.tilt = v; upd(); } });
    const rI = PS.ui.readout('入射角 <i class="var">i</i>', '—', 'accent'), rR = PS.ui.readout('反射角 <i class="var">r</i>', '—', 'primary'),
      rM = PS.ui.readout('入射光线与镜面的夹角', '—'), rB = PS.ui.readout('反射光线与入射光线的夹角', '—');
    const msg = h('div', { class: 'feedback show info small' });
    const quiz = miniQuiz('练一练：角的计算');
    el.append(PS.ui.row(nameT.el, mirT.el, tS.el), h('div', { class: 'readouts' }, rI.el, rR.el, rM.el, rB.el), msg, quiz.el);
    // 入射光线方向角（相对镜面的法线），A 点在入射光线上
    const geo = () => {
      const t = st.tilt * DEG;
      const n = { x: Math.sin(t), y: -Math.cos(t) }; // 法线（向上）
      const aA = V.ang(n) - st.i * DEG; // A 在法线左侧
      const A = O.along(Op, V.dir(aA), R);
      const d = V.norm(V.sub(Op, A));
      const r = O.reflect(d, n);
      const B = O.along(Op, r, R);
      return { n, A, B, d, r, t };
    };
    let fixedA = null; // 转动镜面时入射光线保持不动
    PS.drag(S, {
      VW, VH,
      hit: (p) => (V.dist(p, geo().A) < 34 ? 'A' : null),
      move: (k, p) => {
        const g = geo();
        const a = V.ang(V.sub(p, Op)), an = V.ang(g.n);
        let i = (an - a) / DEG;
        while (i > 180) i -= 360; while (i < -180) i += 360;
        st.i = Math.round(PS.clamp(i, 0, 85));
        fixedA = null;
        upd();
      },
    });
    tS.input.addEventListener('pointerdown', () => { fixedA = V.ang(V.sub(geo().A, Op)); });
    function upd() {
      if (fixedA != null) {
        // 入射光线不动，镜面转过 θ：入射角变化 θ
        const an = V.ang({ x: Math.sin(st.tilt * DEG), y: -Math.cos(st.tilt * DEG) });
        st.i = PS.clamp(Math.round((an - fixedA) / DEG), 0, 89);
      }
      rI.set(st.i + '°'); rR.set(st.i + '°'); rM.set((90 - st.i) + '°'); rB.set(2 * st.i + '°');
      msg.innerHTML = st.i === 0 ? '光<b>垂直</b>射到镜面上时，入射角为 0°，反射角也为 0°，反射光线沿原路返回。'
        : '拖动 <b>A 点</b>改变入射角。入射角和反射角都是光线与<b>法线</b>的夹角，不是与镜面的夹角！反射角<b>随</b>入射角的增大而增大，且始终<b>相等</b>。' + (st.tilt ? '<br>入射光线不动时，镜面转过 θ，反射光线转过 <b>2θ</b>。' : '');
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      const g = geo();
      const u = { x: Math.cos(g.t), y: Math.sin(g.t) };
      PS.drawMirror(ctx, O.along(Op, u, -330), O.along(Op, u, 330), { side: 1, thick: 6 });
      PS.normalLine(ctx, Op, g.n, 330, { back: 0 });
      PS.rightAngle(ctx, Op, u, g.n, 14);
      const an = V.ang(g.n), aA = V.ang(V.sub(g.A, Op)), aB = V.ang(V.sub(g.B, Op));
      if (st.i > 0) {
        PS.angleArc(ctx, Op.x, Op.y, 80, an, aA, { color: '#e8590c', label: 'i', fs: F(17), fill: 'rgba(232,89,12,.1)' });
        PS.angleArc(ctx, Op.x, Op.y, 80, an, aB, { color: '#3b5bdb', label: 'r', fs: F(17), fill: 'rgba(59,91,219,.1)' });
        if (st.mir) {
          PS.angleArc(ctx, Op.x, Op.y, 135, aA, V.ang(V.mul(u, -1)), { color: '#868e96', label: (90 - st.i) + '°', fs: F(13), lw: 1.2 });
          PS.angleArc(ctx, Op.x, Op.y, 135, aB, V.ang(u), { color: '#868e96', label: (90 - st.i) + '°', fs: F(13), lw: 1.2 });
        }
      }
      PS.beam(ctx, [g.A, Op], { color: C.ray, width: 3, arrow: true, head: 16 });
      PS.beam(ctx, [Op, g.B], { color: '#f59f00', width: 3, arrow: true, head: 16 });
      PS.handle(ctx, g.A.x, g.A.y, 11, '#e8590c', null, F);
      D.text(ctx, 'A', g.A.x - 20, g.A.y - 10, { size: F(16), weight: 800, color: '#e8590c', align: 'center' });
      D.text(ctx, 'B', g.B.x + 18, g.B.y - 10, { size: F(16), weight: 800, color: '#f59f00', align: 'center' });
      D.text(ctx, 'O', Op.x + 16, Op.y + 24, { size: F(16), weight: 800, color: '#1b2333' });
      D.text(ctx, 'N', Op.x + g.n.x * 330 + 14, Op.y + g.n.y * 330 + 14, { size: F(16), weight: 800, color: C.normal });
      if (st.names) {
        const m1 = V.lerp(g.A, Op, 0.45), m2 = V.lerp(Op, g.B, 0.55);
        D.text(ctx, '入射光线 AO', m1.x - 14, m1.y - 14, { size: F(14), weight: 800, color: '#e8590c', align: 'right', bg: 'rgba(255,255,255,.85)' });
        D.text(ctx, '反射光线 OB', m2.x + 14, m2.y - 14, { size: F(14), weight: 800, color: '#e67700', bg: 'rgba(255,255,255,.85)' });
        D.text(ctx, '法线 ON（虚线，垂直于镜面）', Op.x + g.n.x * 250 + 10, Op.y + g.n.y * 250, { size: F(13), weight: 700, color: C.normal, bg: 'rgba(255,255,255,.85)' });
        D.text(ctx, '入射点', Op.x - 16, Op.y + 26, { size: F(12), weight: 700, color: '#495057', align: 'right' });
        D.text(ctx, '平面镜', Op.x + u.x * 300, Op.y + u.y * 300 + 30, { size: F(13), weight: 700, color: '#1c7ed6', align: 'center' });
      }
      ctx.restore();
    }
    // 随机小题
    function next() {
      const k = PS.randInt(0, 5), x = PS.pick([20, 25, 30, 35, 40, 50, 55, 60, 65]);
      if (k === 0) quiz.ask('一束光射到平面镜上，入射光线与镜面的夹角为 ' + x + '°，则<b>反射角</b>为多少度？', 90 - x, '入射角是入射光线与<b>法线</b>的夹角：90° − ' + x + '° = ' + (90 - x) + '°，反射角等于入射角，也是 ' + (90 - x) + '°。');
      else if (k === 1) quiz.ask('入射角为 ' + x + '°，反射光线与入射光线的夹角为多少度？', 2 * x, '反射角 = 入射角 = ' + x + '°，两者之和就是反射光线与入射光线的夹角：' + 2 * x + '°。');
      else if (k === 2) quiz.ask('反射光线与入射光线的夹角为 ' + 2 * x + '°，入射角为多少度？', x, '入射角 = 反射角 = ' + 2 * x + '° ÷ 2 = ' + x + '°。');
      else if (k === 3) quiz.ask('一束光<b>垂直</b>射到平面镜上，反射角为多少度？', 0, '垂直入射时，入射光线与法线重合，入射角为 0°，反射角也为 0°（不是 90°！）。');
      else if (k === 4) { const d = PS.pick([5, 10, 15]); quiz.ask('入射角增大 ' + d + '°，反射光线与入射光线的夹角增大多少度？', 2 * d, '入射角增大 ' + d + '°，反射角也增大 ' + d + '°，两者的夹角增大 ' + 2 * d + '°。'); }
      else { const d = PS.pick([5, 10, 15, 20]); quiz.ask('（拓展）入射光线方向不变，把平面镜转过 ' + d + '°，反射光线转过多少度？', 2 * d, '镜面转过 ' + d + '°，法线也转过 ' + d + '°，入射角改变 ' + d + '°，反射角也改变 ' + d + '°，所以反射光线转过 ' + 2 * d + '°。'); }
    }
    quiz.next = next;
    next();
    upd();
  });

  /* ================= 作光的反射光路图 ================= */
  PS.register('ray-draw', function (el) {
    const VW = 1000, VH = 460;
    const st = { task: 1, step: 0, show: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 1, label: '① 画反射光线' }, { value: 2, label: '② 两块互相垂直的平面镜' }, { value: 3, label: '③ 确定平面镜的位置' }], st.task, (v) => { st.task = v; newTask(); });
    const nBtn = PS.ui.button('第 1 步：过入射点画法线', () => { st.step = Math.max(st.step, 1); upd(); }, 'btn btn-sm');
    const chk = PS.ui.button('✔ 检查', check, 'btn btn-primary btn-sm');
    const ans = PS.ui.button('看标准作法', () => { st.show = true; upd(); }, 'btn btn-ghost btn-sm');
    const nxt = PS.ui.button('换一题', () => newTask(), 'btn btn-ghost btn-sm');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), PS.ui.row(nBtn, chk, ans, nxt), msg,
      h('div', { class: 'tip tip-exam small', style: { marginTop: '10px' }, html: '<b>作图规范：</b>用直尺作图；光线画<b>实线</b>并标<b>箭头</b>；法线画<b>虚线</b>，且与镜面垂直（可标直角符号）；平面镜的背面画短斜线；入射角、反射角要相等。' }));
    let T = {};
    function newTask() {
      st.step = 0; st.show = false;
      if (st.task === 1) {
        const tilt = PS.randInt(-25, 25) * DEG, i = PS.randInt(25, 60) * DEG;
        const Op = { x: 500, y: 330 }, u = { x: Math.cos(tilt), y: Math.sin(tilt) }, n = { x: Math.sin(tilt), y: -Math.cos(tilt) };
        const side = Math.random() < 0.5 ? -1 : 1;
        const dA = V.dir(V.ang(n) + side * i);
        T = { Op, u, n, A: O.along(Op, dA, 260), side, B: O.along(Op, V.dir(V.ang(n) + side * i * 0.2 + 0.2), 230) };
      } else if (st.task === 2) {
        // 镜 1 水平（下），镜 2 竖直（右），交点 Q
        const Q = { x: 760, y: 380 };
        const a = PS.randInt(30, 60) * DEG; // 入射光线与竖直方向的夹角
        const O1 = { x: 560 + PS.randInt(-40, 40), y: Q.y };
        const A = O.along(O1, { x: -Math.sin(a), y: -Math.cos(a) }, 300);
        T = { Q, O1, A, h1: O.along(O1, V.dir(-0.4), 200), h2: null };
      } else {
        const Op = { x: 500, y: 300 };
        const tilt = PS.randInt(-20, 20) * DEG, i = PS.randInt(25, 55) * DEG;
        const n = { x: Math.sin(tilt), y: -Math.cos(tilt) };
        T = { Op, n, A: O.along(Op, V.dir(V.ang(n) - i), 250), B: O.along(Op, V.dir(V.ang(n) + i), 250), mAng: PS.randInt(-60, 60) * DEG, tilt };
      }
      upd();
    }
    // 题 2：根据手柄计算光路
    function task2Path() {
      const t = T, m2a = { x: t.Q.x, y: t.Q.y }, m2b = { x: t.Q.x, y: 60 };
      const d1 = V.norm(V.sub(t.h1, t.O1));
      const hit = O.raySeg(t.O1, d1, m2a, m2b);
      return { d1, hit };
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => {
        if (st.show) return null;
        if (st.task === 1 && V.dist(p, T.B) < 30) return 'B';
        if (st.task === 2) { if (V.dist(p, T.h1) < 30) return 'h1'; if (T.h2 && V.dist(p, T.h2) < 30) return 'h2'; }
        if (st.task === 3) { const e = O.along(T.Op, V.dir(T.mAng), 220); if (V.dist(p, e) < 34) return 'm'; }
        return null;
      },
      move: (k, p) => {
        if (k === 'B') { const a = V.ang(V.sub(p, T.Op)); T.B = O.along(T.Op, V.dir(a), 240); }
        else if (k === 'h1') {
          const a = V.ang(V.sub(p, T.O1)); T.h1 = O.along(T.O1, V.dir(PS.clamp(a, -Math.PI + 0.05, -0.05)), 170);
          const r = task2Path(); T.h2 = r.hit ? O.along(r.hit.p, V.dir(Math.PI + 0.3), 150) : null;
        } else if (k === 'h2') { const r = task2Path(); if (r.hit) T.h2 = O.along(r.hit.p, V.dir(V.ang(V.sub(p, r.hit.p))), 200); }
        else { T.mAng = V.ang(V.sub(p, T.Op)); }
        S.render();
      },
    });
    function check() {
      let ok = false, t;
      if (st.task === 1) {
        if (st.step < 1) { t = '先过入射点 O 画出<b>法线</b>（第 1 步），再根据“反射角等于入射角”画反射光线。'; }
        else {
          const i = O.angBetween(V.sub(T.A, T.Op), T.n), r = O.angBetween(V.sub(T.B, T.Op), T.n);
          const sideOk = Math.sign(V.cross(T.n, V.sub(T.B, T.Op))) !== Math.sign(V.cross(T.n, V.sub(T.A, T.Op)));
          const above = V.dot(V.sub(T.B, T.Op), T.n) > 0;
          ok = sideOk && above && Math.abs(i - r) <= 2;
          t = ok ? '✅ 正确！入射角 ' + i.toFixed(0) + '°，反射角 ' + r.toFixed(0) + '°。' : !above ? '反射光线应该在镜面的<b>反射面一侧</b>（不能穿过镜子）。' : !sideOk ? '反射光线和入射光线应<b>分居法线两侧</b>。' : '入射角 ' + i.toFixed(0) + '°，你画的反射角 ' + r.toFixed(0) + '°，两角要<b>相等</b>。再调一调。';
        }
      } else if (st.task === 2) {
        const r = task2Path();
        const n1 = { x: 0, y: -1 }, n2 = { x: -1, y: 0 };
        const d0 = V.norm(V.sub(T.O1, T.A));
        const e1 = Math.abs(O.angBetween(r.d1, n1) - O.angBetween(V.mul(d0, -1), n1)) <= 2 && Math.sign(r.d1.x) === Math.sign(d0.x);
        if (!e1) t = '先调整<b>第一次反射</b>的反射光线：在平面镜 1 上，反射角要等于入射角。';
        else if (!r.hit || !T.h2) t = '第一次的反射光线要射到平面镜 2 上。';
        else {
          const d2 = V.norm(V.sub(T.h2, r.hit.p));
          const ok2 = Math.abs(O.angBetween(d2, n2) - O.angBetween(V.mul(r.d1, -1), n2)) <= 2 && d2.y < 0;
          ok = ok2;
          t = ok ? '✅ 正确！经过两次反射后，最后的反射光线与最初的入射光线<b>平行</b>、方向<b>相反</b>。自行车尾灯就是由许多互相垂直的小反射面组成的，能把汽车射来的光反射回去，提醒司机注意。' : '第二次反射：在平面镜 2 上，过入射点作法线（水平虚线），使反射角等于入射角。';
        }
      } else {
        const m = V.dir(T.mAng), nn = V.norm(V.add(V.norm(V.sub(T.A, T.Op)), V.norm(V.sub(T.B, T.Op))));
        const err = Math.abs(90 - O.angBetween(m, nn));
        ok = err <= 2;
        t = ok ? '✅ 正确！法线是∠AOB 的<b>角平分线</b>，平面镜过 O 点且与法线<b>垂直</b>。' : '平面镜与法线（∠AOB 的角平分线）应该垂直，现在差了 ' + err.toFixed(0) + '°。先点“第 1 步”画出角平分线。';
      }
      msg.className = 'feedback show ' + (ok ? 'ok' : 'bad'); msg.innerHTML = t;
      ok ? PS.sound.good() : PS.sound.bad();
    }
    function upd() {
      nBtn.innerHTML = st.task === 2 ? '提示：每次反射都要先画法线' : st.task === 3 ? '第 1 步：作∠AOB 的角平分线（法线）' : '第 1 步：过入射点画法线';
      nBtn.disabled = st.task === 2;
      msg.className = 'feedback show info';
      msg.innerHTML = st.show ? '看标准作法：' + (st.task === 1 ? '① 过入射点 O 作镜面的垂线（法线，画虚线）；② 在法线另一侧画反射光线，使反射角等于入射角，标上箭头。' : st.task === 2 ? '在每个入射点都先作法线，再使反射角等于入射角。两块互相垂直的平面镜能使光线<b>平行反向</b>射回。' : '① 作∠AOB 的角平分线，它就是法线；② 过 O 点作法线的垂线，就是平面镜的位置，在背面画短斜线。')
        : st.task === 1 ? '拖动 <b>B 点</b>画出反射光线。先画法线，再检查。' : st.task === 2 ? '拖动<b>第一次的反射光线</b>，使它射到平面镜 2 上，再拖动<b>第二次的反射光线</b>。' : '已知入射光线 AO 和反射光线 OB，拖动平面镜的端点转动平面镜，确定它的位置。';
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      ctx.strokeStyle = '#f1f3f5'; ctx.lineWidth = 1;
      for (let x = 0; x <= VW; x += 25) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); }
      for (let y = 0; y <= VH; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); }
      const t = T;
      if (st.task === 1) {
        PS.drawMirror(ctx, O.along(t.Op, t.u, -320), O.along(t.Op, t.u, 320), { side: 1 });
        if (st.step >= 1 || st.show) { PS.normalLine(ctx, t.Op, t.n, 260, { back: 0 }); PS.rightAngle(ctx, t.Op, t.u, t.n, 13); }
        PS.beam(ctx, [t.A, t.Op], { color: C.ray, width: 2.6, arrow: true, head: 15 });
        D.text(ctx, 'A', t.A.x, t.A.y - 14, { size: F(15), weight: 800, color: C.ray, align: 'center' });
        D.text(ctx, 'O', t.Op.x + 6, t.Op.y + 24, { size: F(15), weight: 800, color: '#1b2333' });
        if (st.show) {
          const r = O.reflect(V.norm(V.sub(t.Op, t.A)), t.n);
          PS.beam(ctx, [t.Op, O.along(t.Op, r, 260)], { color: '#2b8a3e', width: 2.6, arrow: true, head: 15 });
          const an = V.ang(t.n);
          PS.angleArc(ctx, t.Op.x, t.Op.y, 60, an, V.ang(V.sub(t.A, t.Op)), { color: '#e8590c', label: 'i', fs: F(15) });
          PS.angleArc(ctx, t.Op.x, t.Op.y, 60, an, V.ang(r), { color: '#2b8a3e', label: 'r', fs: F(15) });
        } else {
          PS.beam(ctx, [t.Op, t.B], { color: '#3b5bdb', width: 2.6, arrow: true, head: 15 });
          PS.handle(ctx, t.B.x, t.B.y, 11, '#3b5bdb', '拖动', F);
          if (st.step >= 1) {
            const an = V.ang(t.n);
            PS.angleArc(ctx, t.Op.x, t.Op.y, 60, an, V.ang(V.sub(t.A, t.Op)), { color: '#e8590c', label: O.angBetween(V.sub(t.A, t.Op), t.n).toFixed(0) + '°', fs: F(13) });
            if (V.dot(V.sub(t.B, t.Op), t.n) > 0) PS.angleArc(ctx, t.Op.x, t.Op.y, 75, an, V.ang(V.sub(t.B, t.Op)), { color: '#3b5bdb', label: O.angBetween(V.sub(t.B, t.Op), t.n).toFixed(0) + '°', fs: F(13) });
          }
        }
      } else if (st.task === 2) {
        PS.drawMirror(ctx, { x: 160, y: t.Q.y }, { x: t.Q.x, y: t.Q.y }, { side: 1 });
        PS.drawMirror(ctx, { x: t.Q.x, y: t.Q.y }, { x: t.Q.x, y: 60 }, { side: 1 });
        D.text(ctx, '平面镜 1', 220, t.Q.y + 34, { size: F(13), weight: 700, color: '#1c7ed6' });
        D.text(ctx, '平面镜 2', t.Q.x + 30, 100, { size: F(13), weight: 700, color: '#1c7ed6' });
        PS.beam(ctx, [t.A, t.O1], { color: C.ray, width: 2.6, arrow: true, head: 15 });
        PS.normalLine(ctx, t.O1, { x: 0, y: -1 }, 120, { back: 0 });
        const d0 = V.norm(V.sub(t.O1, t.A));
        if (st.show) {
          const r1 = O.reflect(d0, { x: 0, y: -1 });
          const hit = O.raySeg(t.O1, r1, t.Q, { x: t.Q.x, y: 60 });
          if (hit) {
            const r2 = O.reflect(r1, { x: -1, y: 0 });
            PS.normalLine(ctx, hit.p, { x: -1, y: 0 }, 120, { back: 0 });
            PS.beam(ctx, [t.O1, hit.p, O.along(hit.p, r2, 380)], { color: '#2b8a3e', width: 2.6, arrow: true, head: 15 });
          }
        } else {
          const r = task2Path();
          if (r.hit) {
            PS.beam(ctx, [t.O1, r.hit.p], { color: '#3b5bdb', width: 2.6, arrow: true, head: 15 });
            PS.normalLine(ctx, r.hit.p, { x: -1, y: 0 }, 120, { back: 0 });
            if (t.h2) { PS.beam(ctx, [r.hit.p, t.h2], { color: '#7048e8', width: 2.6, arrow: true, head: 15 }); PS.handle(ctx, t.h2.x, t.h2.y, 11, '#7048e8', '拖动', F); }
          } else PS.beam(ctx, [t.O1, O.along(t.O1, r.d1, 260)], { color: '#3b5bdb', width: 2.6, arrow: true, head: 15 });
          PS.handle(ctx, t.h1.x, t.h1.y, 11, '#3b5bdb', '拖动', F);
        }
      } else {
        PS.beam(ctx, [t.A, t.Op], { color: C.ray, width: 2.6, arrow: true, head: 15 });
        PS.beam(ctx, [t.Op, t.B], { color: C.ray, width: 2.6, arrow: true, head: 15 });
        D.text(ctx, 'A', t.A.x - 6, t.A.y - 14, { size: F(15), weight: 800, color: C.ray, align: 'center' });
        D.text(ctx, 'B', t.B.x + 6, t.B.y - 14, { size: F(15), weight: 800, color: C.ray, align: 'center' });
        D.text(ctx, 'O', t.Op.x + 10, t.Op.y + 26, { size: F(15), weight: 800, color: '#1b2333' });
        const nn = V.norm(V.add(V.norm(V.sub(t.A, t.Op)), V.norm(V.sub(t.B, t.Op))));
        if (st.step >= 1 || st.show) PS.normalLine(ctx, t.Op, nn, 230, { back: 0 });
        const m = st.show ? V.perp(nn) : V.dir(t.mAng);
        const side = V.dot(V.perp(m), nn) > 0 ? -1 : 1;
        PS.drawMirror(ctx, O.along(t.Op, m, -220), O.along(t.Op, m, 220), { side, color: st.show ? '#2b8a3e' : null });
        if (!st.show) { const e = O.along(t.Op, m, 220); PS.handle(ctx, e.x, e.y, 12, '#3b5bdb', '拖动转动', F); }
      }
      ctx.restore();
    }
    newTask();
  });

  /* ================= 镜面反射和漫反射 ================= */
  PS.register('diffuse', function (el) {
    const VW = 1000, VH = 440;
    const SY = 330, X0 = 170, X1 = 830, NR = 11;
    const st = { rough: 0, normals: false, eye: -0.75 }; // eye：眼睛的方向角（相对表面中心）
    const noise = []; for (let i = 0; i < 400; i++) noise.push(PS.gauss());
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 0, label: '光滑的镜面' }, { value: 0.85, label: '粗糙的白纸' }], 0, (v) => { st.rough = v; rS.set(v, true); upd(); });
    const rS = PS.ui.slider({ label: '表面粗糙程度', min: 0, max: 1, step: 0.01, value: 0, fmt: (v) => (v < 0.05 ? '光滑' : v < 0.5 ? '较粗糙' : '粗糙'), onInput: (v) => { st.rough = v; seg.set(v === 0 ? 0 : v === 0.85 ? 0.85 : null, true); upd(); } });
    const nT = PS.ui.toggle('放大表面，显示每条光线的法线', false, (v) => { st.normals = v; S.render(); });
    const rB = PS.ui.readout('眼睛看到的亮度', '—', 'accent');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el, rS.el), PS.ui.row(nT.el, h('span', { class: 'kbd-hint' }, '拖动眼睛换个方向看')), h('div', { class: 'readouts' }, rB.el), msg);
    const inDir = V.norm({ x: Math.sin(40 * DEG), y: Math.cos(40 * DEG) }); // 从左上射向右下
    const EC = { x: 500, y: SY }, ER = 300;
    const eyeP = () => O.along(EC, V.dir(st.eye), ER);
    // 第 k 条光线的落点和该处的法线
    function facet(k, n) {
      const x = X0 + 60 + ((X1 - X0 - 120) * (k + 0.5)) / n;
      const tilt = PS.clamp(noise[k % 400] * 0.5, -1.2, 1.2) * st.rough;
      return { p: { x, y: SY }, n: { x: Math.sin(tilt), y: -Math.cos(tilt) } };
    }
    function brightness() {
      const E = eyeP(); let c = 0; const n = 300;
      for (let k = 0; k < n; k++) { const f = facet(k, n), r = O.reflect(inDir, f.n); if (r.y < 0 && O.angBetween(r, V.sub(E, f.p)) < 3.5) c++; }
      return c / n;
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => (V.dist(p, eyeP()) < 40 ? 'eye' : null),
      move: (k, p) => { st.eye = PS.clamp(V.ang(V.sub(p, EC)), -Math.PI + 0.25, -0.25); upd(); },
    });
    function upd() {
      const b = brightness();
      rB.set(b > 0.25 ? '非常亮（刺眼）' : b > 0.04 ? '较亮' : b > 0.004 ? '较暗' : '看不到反射光');
      msg.innerHTML = st.rough < 0.05
        ? '<b>镜面反射</b>：平行光射到<b>光滑</b>的表面上，反射光仍然<b>平行</b>，只射向一个方向。迎着反射光看非常刺眼，其他方向几乎看不到反射光。'
        : '<b>漫反射</b>：平行光射到<b>凹凸不平</b>的表面上，反射光射向<b>各个方向</b>，所以我们能从各个方向看到这个物体。' + (st.normals ? '放大看：每一条光线在它的入射点<b>都遵循光的反射定律</b>，只是各处的法线方向不同。' : '');
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#1a2234'; ctx.fillRect(0, 0, VW, VH);
      // 表面
      ctx.fillStyle = st.rough < 0.05 ? '#a5d8ff' : '#f1f3f5'; ctx.fillRect(X0, SY, X1 - X0, 16);
      ctx.fillStyle = '#495057'; ctx.fillRect(X0, SY + 16, X1 - X0, 40);
      const fs = []; for (let k = 0; k < NR; k++) fs.push(facet(k, NR));
      // 表面轮廓（放大后的小斜面）
      ctx.strokeStyle = st.rough < 0.05 ? '#e7f5ff' : '#ced4da'; ctx.lineWidth = 3;
      fs.forEach((f) => { const u = V.perp(f.n); ctx.beginPath(); ctx.moveTo(f.p.x - u.x * 22, f.p.y - u.y * 22); ctx.lineTo(f.p.x + u.x * 22, f.p.y + u.y * 22); ctx.stroke(); });
      fs.forEach((f) => {
        const a = O.along(f.p, inDir, -330);
        PS.beam(ctx, [a, f.p], { color: '#ffd43b', width: 1.8, arrow: true, head: 11, glow: 'rgba(255,212,59,.15)' });
        const r = O.reflect(inDir, f.n);
        if (r.y < 0) PS.beam(ctx, [f.p, O.along(f.p, r, 280)], { color: '#ff922b', width: 1.8, arrow: true, head: 11, glow: 'rgba(255,146,43,.15)' });
        if (st.normals) PS.normalLine(ctx, f.p, f.n, 60, { back: 0, color: '#adb5bd' });
      });
      // 眼睛
      const E = eyeP(), b = brightness();
      const g = ctx.createRadialGradient(E.x, E.y, 4, E.x, E.y, 60);
      g.addColorStop(0, 'rgba(255,224,102,' + PS.clamp(b * 3, 0, 0.9) + ')'); g.addColorStop(1, 'rgba(255,224,102,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(E.x, E.y, 60, 0, TAU); ctx.fill();
      PS.drawEye(ctx, E.x, E.y, V.ang(V.sub(EC, E)), 24, { bg: '#f8f9fa' });
      D.text(ctx, st.rough < 0.05 ? '光滑的表面（如镜面、平静的水面）' : '凹凸不平的表面（如白纸、黑板、墙壁）', 500, SY + 76, { size: F(14), weight: 700, color: '#ced4da', align: 'center' });
      D.text(ctx, '平行光', 120, 60, { size: F(14), weight: 800, color: '#ffd43b' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 镜子和白纸 / 雨后走夜路 ================= */
  PS.register('mirror-paper', function (el) {
    const VW = 1000, VH = 420;
    const st = { mode: 'paper', view: 'top', moon: 'front' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'paper', label: '手电筒照镜子和白纸' }, { value: 'night', label: '雨后的夜晚走路' }], st.mode, (v) => { st.mode = v; upd(); });
    const vSeg = PS.ui.seg([{ value: 'top', label: '从正上方看' }, { value: 'side', label: '从侧面看' }], st.view, (v) => { st.view = v; upd(); });
    const mSeg = PS.ui.seg([{ value: 'front', label: '迎着月光走' }, { value: 'back', label: '背着月光走' }], st.moon, (v) => { st.moon = v; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), PS.ui.row(vSeg.el, mSeg.el), msg);
    function upd() {
      vSeg.el.style.display = st.mode === 'paper' ? '' : 'none';
      mSeg.el.style.display = st.mode === 'night' ? '' : 'none';
      if (st.mode === 'paper') msg.innerHTML = st.view === 'top'
        ? '从正上方看：镜面发生<b>镜面反射</b>，反射光竖直向上，正好进入眼睛——<b>镜子很亮</b>；白纸发生漫反射，只有少量光进入眼睛——<b>白纸较暗</b>。'
        : '从侧面看：镜面的反射光竖直向上，没有进入眼睛——<b>镜子是暗的</b>；白纸发生<b>漫反射</b>，有一部分光射到侧面进入眼睛——<b>白纸是亮的</b>。';
      else msg.innerHTML = st.moon === 'front'
        ? '迎着月光走：月光射到水面上发生<b>镜面反射</b>，反射光正好射向前方的人眼，<b>水面亮</b>；地面发生漫反射，进入眼睛的光较少，<b>地面暗</b>。所以迎着月光走，<b>发亮处是水</b>。'
        : '背着月光走：水面的反射光射向前方，不能进入人眼，<b>水面暗</b>；地面发生漫反射，有一部分光进入眼睛，<b>地面亮</b>。所以背着月光走，<b>暗处是水</b>。';
      S.render();
    }
    function scatter(ctx, p, n, len, c) {
      for (let k = 0; k < 7; k++) { const a = -Math.PI + (k + 0.5) * (Math.PI / 7) + (n || 0); PS.beam(ctx, [p, O.along(p, V.dir(a), len)], { color: c || 'rgba(255,212,59,.55)', width: 1.3, arrow: 'end', head: 8 }); }
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#141c2b'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'paper') {
        const Y = 320;
        ctx.fillStyle = '#f8f9fa'; ctx.fillRect(110, Y, 520, 10);
        ctx.fillStyle = '#74c0fc'; ctx.fillRect(300, Y - 6, 140, 6);
        D.text(ctx, '白纸', 160, Y + 30, { size: F(13), weight: 700, color: '#dee2e6' });
        D.text(ctx, '平面镜', 370, Y + 30, { size: F(13), weight: 700, color: '#74c0fc', align: 'center' });
        // 手电筒
        ctx.fillStyle = '#868e96'; ctx.fillRect(345, 40, 50, 70); ctx.fillStyle = '#495057'; ctx.fillRect(335, 105, 70, 16);
        D.text(ctx, '手电筒（竖直向下照）', 420, 70, { size: F(13), weight: 700, color: '#ced4da' });
        for (let x = 250; x <= 490; x += 40) {
          PS.beam(ctx, [{ x, y: 125 }, { x, y: x >= 300 && x <= 440 ? Y - 6 : Y }], { color: '#ffd43b', width: 1.8, arrow: true, head: 10 });
          if (x >= 300 && x <= 440) PS.beam(ctx, [{ x: x + 4, y: Y - 6 }, { x: x + 4, y: 140 }], { color: '#ff922b', width: 1.6, arrow: true, head: 10, alpha: 0.9 });
          else scatter(ctx, { x, y: Y }, 0, 70);
        }
        const eye = st.view === 'top' ? { x: 470, y: 150 } : { x: 760, y: 260 };
        PS.drawEye(ctx, eye.x, eye.y, st.view === 'top' ? Math.PI / 2 + 0.25 : Math.PI + 0.12, 24, { bg: '#f8f9fa' });
        if (st.view === 'top') PS.beam(ctx, [{ x: 420, y: Y - 6 }, eye], { color: 'rgba(255,146,43,.0)', width: 1 });
        // 看到的样子
        const bx = 720, by = 30, bw = 250, bh = 170;
        ctx.fillStyle = '#212529'; ctx.fillRect(bx - 6, by - 6, bw + 12, bh + 40);
        const top = st.view === 'top';
        ctx.fillStyle = top ? '#868e96' : '#e9ecef'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = top ? '#fff' : '#212529'; ctx.fillRect(bx + 70, by + 45, 110, 80);
        if (top) { const g = ctx.createRadialGradient(bx + 125, by + 85, 5, bx + 125, by + 85, 90); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(bx + 70, by + 45, 110, 80); }
        D.text(ctx, '你看到的：' + (top ? '镜子亮，白纸暗' : '镜子暗，白纸亮'), bx + bw / 2, by + bh + 22, { size: F(14), weight: 800, color: '#ffe066', align: 'center' });
      } else {
        const GY = 330, front = st.moon === 'front';
        const moon = front ? { x: 880, y: 70 } : { x: 120, y: 70 };
        ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.arc(moon.x, moon.y, 32, 0, TAU); ctx.fill();
        D.text(ctx, '月亮', moon.x, moon.y + 54, { size: F(13), weight: 700, color: '#fff3bf', align: 'center' });
        ctx.fillStyle = '#5c4d3c'; ctx.fillRect(0, GY, VW, 90);
        const P0 = 480, P1 = 620;
        ctx.fillStyle = '#4dabf7'; ctx.fillRect(P0, GY - 2, P1 - P0, 6);
        D.text(ctx, '水坑', (P0 + P1) / 2, GY + 30, { size: F(13), weight: 700, color: '#a5d8ff', align: 'center' });
        D.text(ctx, '地面', 260, GY + 30, { size: F(13), weight: 700, color: '#ced4da', align: 'center' });
        // 人（朝右走）
        const px = 230;
        ctx.fillStyle = '#868e96'; D.roundRect(ctx, px - 16, GY - 120, 32, 80, 10); ctx.fill(); ctx.fillRect(px - 12, GY - 40, 9, 40); ctx.fillRect(px + 3, GY - 40, 9, 40);
        ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(px, GY - 138, 18, 0, TAU); ctx.fill();
        const eye = { x: px + 10, y: GY - 140 };
        PS.drawEye(ctx, eye.x + 8, eye.y, 0.45, 12, { bg: '#f8f9fa' });
        D.text(ctx, front ? '人向右走，迎着月光' : '人向右走，背着月光', px, GY - 175, { size: F(13), weight: 700, color: '#dee2e6', align: 'center' });
        const wx = 550, gx = 400;
        const dIn = V.norm(V.sub({ x: wx, y: GY }, moon));
        PS.beam(ctx, [moon, { x: wx, y: GY - 2 }], { color: '#fff3bf', width: 1.8, arrow: true, head: 10 });
        const r = O.reflect(dIn, { x: 0, y: -1 });
        PS.beam(ctx, [{ x: wx, y: GY - 2 }, O.along({ x: wx, y: GY - 2 }, r, 330)], { color: '#ffe066', width: 2, arrow: true, head: 11 });
        PS.beam(ctx, [moon, { x: gx, y: GY }], { color: '#fff3bf', width: 1.8, arrow: true, head: 10 });
        scatter(ctx, { x: gx, y: GY }, 0, 60, 'rgba(255,243,191,.5)');
        // 看到的样子
        const bx = 690, by = 150, bw = 280, bh = 110;
        ctx.fillStyle = '#212529'; ctx.fillRect(bx - 6, by - 6, bw + 12, bh + 40);
        ctx.fillStyle = front ? '#3b3226' : '#8a7a63'; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = front ? '#e7f5ff' : '#1b2333'; ctx.beginPath(); ctx.ellipse(bx + bw / 2, by + bh / 2, 80, 26, 0, 0, TAU); ctx.fill();
        D.text(ctx, '你看到的：' + (front ? '水坑亮，地面暗' : '水坑暗，地面亮'), bx + bw / 2, by + bh + 22, { size: F(14), weight: 800, color: '#ffe066', align: 'center' });
      }
      ctx.restore();
    }
    upd();
  });

  /* ================= 镜面反射还是漫反射 ================= */
  const REF_ITEMS = [
    ['黑板“反光”，坐在某些位置的同学看不清字', 0, '光滑的黑板面发生镜面反射，反射光集中射向某一方向，很刺眼。'],
    ['教室里各个位置的同学都能看清黑板上的字', 1, '粉笔字表面粗糙，发生漫反射，光射向各个方向。'],
    ['电影院的银幕用粗糙的白布做成', 1, '粗糙的白布发生漫反射，各个座位的观众都能看到画面。'],
    ['高楼的玻璃幕墙在阳光下明晃晃的，造成“光污染”', 0, '光滑的玻璃发生镜面反射，强烈的反射光射向某个方向。'],
    ['平静的湖面清楚地映出岸上的树木', 0, '平静的水面光滑，发生镜面反射。'],
    ['我们能从不同方向看到桌上的课本', 1, '课本表面粗糙，发生漫反射。'],
    ['雨后的夜晚，迎着月光走，看到地上的水坑发亮', 0, '水面光滑，发生镜面反射，反射光正好进入眼睛。'],
    ['教室的墙壁刷成白色、比较粗糙，屋里的光线柔和', 1, '粗糙的墙壁发生漫反射，光射向各个方向。'],
    ['擦得锃亮的皮鞋能照出人影', 0, '光滑的鞋面发生镜面反射。'],
    ['用手电筒照射白纸，从侧面看白纸是亮的', 1, '白纸表面凹凸不平，发生漫反射。'],
    ['阳光下光滑的大理石地面很晃眼', 0, '磨光的大理石表面光滑，发生镜面反射。'],
    ['房间里的每个人都能看到墙上的挂画', 1, '画的表面粗糙，发生漫反射。'],
  ];
  PS.register('reflect-sort', function (el) {
    PS.sortCards(el, REF_ITEMS, ['镜面反射', '漫反射']);
    el.append(h('p', { class: 'small muted', style: { margin: '8px 0 0' } }, '提示：镜面反射和漫反射<b>都遵循</b>光的反射定律。'));
    el.lastChild.innerHTML = '提示：镜面反射和漫反射<b>都遵循</b>光的反射定律。';
  });
})();
