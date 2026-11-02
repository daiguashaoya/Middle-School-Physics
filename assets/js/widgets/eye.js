/* 第5章第4节：眼睛和眼镜——眼睛的调节（睫状体、晶状体）、近视眼和远视眼的成因与矫正（眼镜度数）、水透镜模拟眼睛实验、近视还是远视分类。依赖 optics.js、lens.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const L5 = PS.lens;
  const TAU = Math.PI * 2;

  /* ---------- 简化眼模型（屈光度 D 计算） ---------- */
  // 晶状体到视网膜 17 mm；放松时恰好看清无穷远；正常眼调节幅度 10 D（近点约 10 cm）
  const DR = 17, P0 = 1000 / DR;
  const EYES = {
    normal: { name: '正常眼', dr: DR, pmin: P0, pmax: P0 + 10 },
    'myo-thick': { name: '近视眼（晶状体太厚）', dr: DR, pmin: P0 + 3, pmax: P0 + 13, myo: true },
    'myo-long': { name: '近视眼（眼球太长）', dr: 1000 / (P0 - 3), pmin: P0, pmax: P0 + 10, myo: true },
    'hyp-thin': { name: '远视眼（晶状体太薄）', dr: DR, pmin: P0, pmax: P0 + 1, hyp: true },
    'hyp-short': { name: '远视眼（眼球太短）', dr: 1000 / (P0 + 2.9), pmin: P0, pmax: P0 + 4, hyp: true },
  };
  /** 眼睛看距离 u（mm）的物体，戴 g 屈光度的眼镜：返回 { P 晶状体屈光度, v 像距 mm（Infinity 表示平行）, err 离焦程度 } */
  function eyeSolve(E, u, g, auto) {
    const vo = u >= 1e6 ? 0 : -1000 / u;
    const need = 1000 / E.dr - vo - g;
    const P = auto === false ? E.pmin : PS.clamp(need, E.pmin, E.pmax);
    const Vi = vo + P + g;
    const v = Vi > 1e-6 ? 1000 / Vi : Infinity;
    return { P, v, err: Math.abs(1 - E.dr * Vi / 1000), Vi, need };
  }
  PS.eyeModel = { EYES, eyeSolve, DR };

  /* ---------- 画眼球剖面 ---------- */
  // 坐标：眼球中心 (cx, cy)，半径 R；晶状体在 xL；视网膜（后壁中心）在 cx + R·k
  function drawEye(ctx, o) {
    const { cx, cy, R, xL, F } = o, sx = o.stretch || 1;
    ctx.save();
    // 巩膜
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(cx, cy, R * sx, R, 0, 0, TAU); ctx.fill(); ctx.stroke();
    // 脉络膜、视网膜
    ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, R * sx - 6, R - 6, 0, -Math.PI * 0.72, Math.PI * 0.72); ctx.stroke();
    ctx.strokeStyle = '#f783ac'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, cy, R * sx - 10, R - 10, 0, -Math.PI * 0.7, Math.PI * 0.7); ctx.stroke();
    // 玻璃体
    ctx.fillStyle = 'rgba(208,235,255,.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, R * sx - 12, R - 12, 0, 0, TAU); ctx.fill();
    // 视神经
    ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx + R * sx - 4, cy - 14); ctx.lineTo(cx + R * sx + 60, cy - 18); ctx.lineTo(cx + R * sx + 60, cy + 18); ctx.lineTo(cx + R * sx - 4, cy + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 角膜
    const xc = cx - R * sx;
    ctx.fillStyle = 'rgba(165,216,255,.45)'; ctx.strokeStyle = '#339af0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xc + 18, cy - R * 0.62); ctx.quadraticCurveTo(xc - 40, cy, xc + 18, cy + R * 0.62); ctx.quadraticCurveTo(xc - 8, cy, xc + 18, cy - R * 0.62); ctx.fill(); ctx.stroke();
    // 虹膜（中间的孔是瞳孔）
    const pr = o.pupil || 22, xi = xL - 16;
    ctx.fillStyle = '#7950f2';
    ctx.fillRect(xi - 4, cy - R * 0.6, 8, R * 0.6 - pr); ctx.fillRect(xi - 4, cy + pr, 8, R * 0.6 - pr);
    // 睫状体与晶状体
    const lw = o.lensW || 18, lh = R * 0.42;
    const cil = o.cil || 0; // 0 放松 ~ 1 收缩
    ctx.fillStyle = '#e599f7';
    [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(xL + 4, cy + s * (lh + 26 - cil * 6), 12 + cil * 5, 14 + cil * 4, 0, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = 'rgba(174,62,201,.6)'; ctx.lineWidth = 1;
    [-1, 1].forEach((s) => { for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(xL + k * 3, cy + s * (lh - 2)); ctx.lineTo(xL + 4 + k * 5, cy + s * (lh + 14 - cil * 6)); ctx.stroke(); } });
    ctx.fillStyle = 'rgba(255,236,153,.85)'; ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(xL, cy, lw, lh, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (o.labels) {
      const T = (t, x, y, al) => D.text(ctx, t, x, y, { size: F(12), weight: 700, color: '#495057', align: al || 'center', bg: 'rgba(255,255,255,.8)' });
      T('角膜', xc - 6, cy - R * 0.68, 'right');
      T('瞳孔', xi - 2, cy - pr - 8, 'right');
      T('晶状体', xL, cy + lh + 58);
      T('睫状体', xL + 30, cy - lh - 44, 'left');
      T('视网膜', cx + R * sx * 0.62, cy - R * 0.85, 'left');
      T('视神经', cx + R * sx + 30, cy + 36);
      T('玻璃体', cx + R * 0.15, cy + R * 0.55);
    }
    ctx.restore();
  }
  // 眼睛看到的画面：far 远处的树和房子 / near 书上的字；blur 模糊半径（像素）
  function drawSeen(ctx, S0, kind, blur) {
    ctx.fillStyle = kind === 'far' ? '#d0ebff' : '#fffdf6'; ctx.fillRect(0, 0, S0, S0);
    const fn = (c) => {
      if (kind === 'far') {
        c.fillStyle = '#d0ebff'; c.fillRect(-20, -20, S0 + 40, S0 * 0.68 + 20);
        c.fillStyle = '#69db7c'; c.fillRect(-20, S0 * 0.68, S0 + 40, S0 * 0.4);
        c.fillStyle = '#ffa8a8'; c.fillRect(S0 * 0.55, S0 * 0.45, S0 * 0.28, S0 * 0.23);
        c.fillStyle = '#c92a2a'; c.beginPath(); c.moveTo(S0 * 0.52, S0 * 0.46); c.lineTo(S0 * 0.69, S0 * 0.32); c.lineTo(S0 * 0.86, S0 * 0.46); c.fill();
        c.fillStyle = '#8d6e4c'; c.fillRect(S0 * 0.24, S0 * 0.42, S0 * 0.05, S0 * 0.27);
        c.fillStyle = '#2f9e44'; c.beginPath(); c.arc(S0 * 0.265, S0 * 0.36, S0 * 0.13, 0, TAU); c.fill();
        c.fillStyle = '#343a40'; c.font = PS.font(S0 * 0.07, 800); c.textAlign = 'center'; c.fillText('E  Ш  E', S0 * 0.5, S0 * 0.15);
      } else {
        c.fillStyle = '#fffdf6'; c.fillRect(-20, -20, S0 + 40, S0 + 40);
        c.fillStyle = '#343a40'; c.font = PS.font(S0 * 0.075, 700); c.textAlign = 'left';
        ['人之初，性本善。', '性相近，习相远。', '苟不教，性乃迁。', '教之道，贵以专。'].forEach((l, i) => c.fillText(l, S0 * 0.1, S0 * (0.25 + i * 0.17)));
      }
    };
    if (blur < 0.6) fn(ctx); else L5.blur(ctx, blur, fn, { op: 'source-over', max: 22 });
  }

  /* ================= 眼睛怎样看清远近不同的物体 ================= */
  PS.register('eye-focus', function (el) {
    const VW = 1000, VH = 440, CY = 220, ECX = 700, R = 150, XL = ECX - 92, K = (ECX + R - 10 - XL) / DR;
    const st = { lu: 3.2, auto: true, bright: false, labels: true }; // lu：log10(物距 mm)
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view' });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 眼睛看到的'), view), rgt));
    const S2 = PS.stage(view, { ratio: '1 / 1', draw: paintSeen });
    const uS = PS.ui.slider({ label: '物体到眼睛', min: 2, max: 4.7, step: 0.01, value: st.lu, fmt: (v) => fmtD(Math.pow(10, v)), onInput: (v) => { st.lu = v; upd(); } });
    uS.el.classList.add('wide');
    const aT = PS.ui.toggle('睫状体自动调节', true, (v) => { st.auto = v; upd(); });
    const bT = PS.ui.toggle('强光（瞳孔变小）', false, (v) => { st.bright = v; upd(); });
    const lT = PS.ui.toggle('结构名称', true, (v) => { st.labels = v; S.render(); });
    const rP = PS.ui.readout('晶状体', '—', 'accent'), rI = PS.ui.readout('像成在', '—', 'primary');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(uS.el), PS.ui.row(PS.ui.button('看远处（5 m）', () => setU(5000), 'btn btn-ghost btn-sm'), PS.ui.button('明视距离（25 cm）', () => setU(250), 'btn btn-ghost btn-sm'), PS.ui.button('很近（8 cm）', () => setU(80), 'btn btn-ghost btn-sm')), PS.ui.row(aT.el, bT.el, lT.el), h('div', { class: 'readouts' }, rP.el, rI.el), msg);
    function fmtD(mm) { return mm >= 1000 ? (mm / 1000).toFixed(mm >= 10000 ? 0 : 1) + ' m' : Math.round(mm / 10) + ' cm'; }
    function setU(mm) { st.lu = Math.log10(mm); uS.set(st.lu, true); upd(); }
    const E = EYES.normal;
    function upd() {
      const u = Math.pow(10, st.lu), s = eyeSolve(E, u, 0, st.auto);
      const c = (s.P - E.pmin) / (E.pmax - E.pmin);
      rP.set(c < 0.08 ? '最薄（睫状体放松）' : c > 0.97 ? '最厚（调节到极限）' : '变厚（睫状体收缩）');
      rI.set(s.err < 0.004 ? '<span class="hl-g">视网膜上</span>' : s.v < E.dr ? '视网膜前' : '视网膜后');
      let t;
      if (!st.auto) t = '如果晶状体不能调节（始终最薄），只能看清远处；物体越近，像越成在视网膜<b>后</b>，越看不清。';
      else if (s.err < 0.004) t = c < 0.08 ? '看<b>远处</b>：睫状体<b>放松</b>，晶状体<b>变薄</b>，折光能力变<b>弱</b>，远处物体的光恰好会聚在视网膜上。' : '看<b>近处</b>：睫状体<b>收缩</b>，晶状体<b>变厚</b>，折光能力变<b>强</b>，近处物体的光也能会聚在视网膜上。';
      else t = '物体太近了！晶状体已经调到最厚，像仍然成在视网膜<b>后面</b>，看不清。正常眼看近处物体最清楚又不容易疲劳的距离约为 <b>25 cm</b>——明视距离。';
      t += '<br><span class="small">眼睛好像一架照相机：晶状体和角膜共同作用相当于<b>凸透镜</b>，视网膜相当于光屏（胶片），成<b>倒立、缩小的实像</b>。' + (st.bright ? '强光下瞳孔变小（相当于照相机的光圈），减少进入眼睛的光。' : '') + '</span>';
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const u = Math.pow(10, st.lu), s = eyeSolve(E, u, 0, st.auto);
      const c = (s.P - E.pmin) / (E.pmax - E.pmin);
      const pupil = st.bright ? 12 : 24;
      // 物体（按比例压缩：距离和高度同比缩小）
      const uPx = u * K, cmp = Math.min(1, (XL - 70) / uPx);
      const ox = XL - uPx * cmp, oh = Math.max(16, Math.min(150, (u > 1000 ? 1500 : u * 0.35) * K * cmp));
      const isFar = u > 1000;
      if (isFar) { ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.arc(ox, CY - oh * 0.6, oh * 0.35, 0, TAU); ctx.fill(); ctx.fillStyle = '#8d6e4c'; ctx.fillRect(ox - 4, CY - oh * 0.3, 8, oh * 0.3); }
      else { ctx.fillStyle = '#fff'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.fillRect(ox - 4, CY - oh, 8, oh); ctx.strokeRect(ox - 4, CY - oh, 8, oh); }
      D.text(ctx, (isFar ? '远处的树' : '书') + '（' + fmtD(u) + '）', Math.max(10, ox - 30), CY - oh - 12, { size: F(13), weight: 800, color: '#2b8a3e' });
      // 光线：从物体顶端经瞳孔到晶状体，再会聚
      const P = { x: ox, y: CY - oh * (isFar ? 0.6 : 0.5) };
      drawEye(ctx, { cx: ECX, cy: CY, R, xL: XL, F, lensW: 12 + c * 12, cil: c, pupil, labels: st.labels });
      const xR = ECX + R - 10;
      [-0.85, -0.4, 0, 0.4, 0.85].forEach((k) => {
        const q = { x: XL, y: CY + k * pupil };
        // 像点：主光线（过光心）上，距晶状体 v
        const vpx = isFinite(s.v) ? s.v * K : 1e5;
        const I = { x: XL + vpx, y: CY + (CY - P.y) * (vpx / (XL - P.x)) }; // 像点在过光心的光线上
        const d = V.norm(V.sub(I, q));
        const end = V.add(q, V.mul(d, (xR - q.x) / d.x));
        const start = { x: XL - 120, y: P.y + (q.y - P.y) * ((XL - 120 - P.x) / (XL - P.x)) };
        PS.beam(ctx, [P, start], { color: '#f76707', width: 1.2, alpha: 0.5 });
        PS.beam(ctx, [start, q, end], { color: '#f76707', width: 1.8 });
      });
      // 像点
      const vpx = isFinite(s.v) ? s.v * K : 1e5;
      const Ix = XL + vpx;
      if (Ix < VW - 10) { ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.arc(Ix, CY + (CY - P.y) * (vpx / (XL - P.x)), 4.5, 0, TAU); ctx.fill(); }
      D.text(ctx, s.err < 0.004 ? '像成在视网膜上 ✔' : s.v < E.dr ? '像成在视网膜前' : '像成在视网膜后', ECX + R - 10, CY + R + 34, { size: F(14), weight: 800, color: s.err < 0.004 ? '#2b8a3e' : '#e03131', align: 'center' });
      ctx.restore();
    }
    function paintSeen(ctx, w, hh) {
      ctx.save();
      PS.virtual(ctx, w, hh, 300, 300);
      const u = Math.pow(10, st.lu), s = eyeSolve(E, u, 0, st.auto);
      drawSeen(ctx, 300, u > 1000 ? 'far' : 'near', Math.min(24, s.err * 900 * (st.bright ? 0.5 : 1)));
      ctx.restore();
    }
    upd();
  });

  /* ================= 近视眼和远视眼的成因与矫正 ================= */
  PS.register('myopia', function (el) {
    const VW = 1000, VH = 420, CY = 210, ECX = 690, R = 140, XL = ECX - 86;
    const st = { eye: 'myo-thick', obj: 'far', g: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view' });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 看到的'), view), rgt));
    const S2 = PS.stage(view, { ratio: '1 / 1', draw: paintSeen });
    const eSeg = PS.ui.seg([{ value: 'normal', label: '正常眼' }, { value: 'myo-thick', label: '近视：晶状体太厚' }, { value: 'myo-long', label: '近视：眼球太长' }, { value: 'hyp-thin', label: '远视：晶状体太薄' }, { value: 'hyp-short', label: '远视：眼球太短' }], st.eye, (v) => { st.eye = v; upd(); });
    const oSeg = PS.ui.seg([{ value: 'far', label: '看远处（5 m）' }, { value: 'near', label: '看书（25 cm）' }], st.obj, (v) => { st.obj = v; upd(); });
    const gS = PS.ui.slider({ label: '眼镜度数', min: -600, max: 600, step: 50, value: 0, fmt: (v) => (v > 0 ? '+' : '') + v + ' 度', onInput: (v) => { st.g = v / 100; upd(); } });
    gS.el.classList.add('wide');
    const rI = PS.ui.readout('像成在', '—', 'primary'), rG = PS.ui.readout('眼镜', '—', 'accent');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(eSeg.el), PS.ui.row(oSeg.el), PS.ui.row(gS.el), h('div', { class: 'readouts' }, rI.el, rG.el), msg);
    const uOf = () => (st.obj === 'far' ? 5000 : 250);
    function upd() {
      const E = EYES[st.eye], s = eyeSolve(E, uOf(), st.g, true);
      const ok = s.err < 0.004;
      rI.set(ok ? '<span class="hl-g">视网膜上（清晰）</span>' : s.v < E.dr ? '视网膜<b>前</b>（模糊）' : '视网膜<b>后</b>（模糊）');
      rG.set(st.g === 0 ? '不戴' : (st.g < 0 ? '凹透镜' : '凸透镜') + '，f = ' + (100 / Math.abs(st.g * 100) * 100).toFixed(0) + ' cm');
      let t;
      if (st.g === 0) {
        if (E.myo) t = st.obj === 'far' ? '近视眼看<b>远处</b>：' + (st.eye === 'myo-thick' ? '晶状体太厚，折光能力太<b>强</b>' : '眼球在前后方向上太<b>长</b>') + '，远处物体的光会聚在视网膜<b>前</b>，看不清。' : '近视眼能看清<b>近处</b>的物体。拖动“眼镜度数”，给它配一副合适的眼镜，让它也能看清远处。';
        else if (E.hyp) t = st.obj === 'near' ? '远视眼看<b>近处</b>：' + (st.eye === 'hyp-thin' ? '晶状体太薄，折光能力太<b>弱</b>' : '眼球在前后方向上太<b>短</b>') + '，近处物体的光会聚在视网膜<b>后</b>，看不清。' : '远视眼能看清<b>远处</b>的物体。切换到“看书”试试。';
        else t = '正常眼通过晶状体的调节，远处、近处的物体都能看清。';
      } else if (ok) {
        t = '✅ 看清了！' + (st.g < 0 ? '<b>凹透镜</b>对光有<b>发散</b>作用，使像<b>后移</b>到视网膜上——近视眼配戴<b>凹透镜</b>。' : '<b>凸透镜</b>对光有<b>会聚</b>作用，使像<b>前移</b>到视网膜上——远视眼配戴<b>凸透镜</b>。');
        t += ' 眼镜的度数 = 焦度 × 100 = 100 / f(m)，凹透镜的度数为负数，凸透镜为正数。';
      } else t = (s.v < E.dr ? '像还在视网膜<b>前</b>，' : '像还在视网膜<b>后</b>，') + (E.myo && st.g > 0 ? '凸透镜让光更会聚，近视更严重了！' : E.hyp && st.g < 0 ? '凹透镜让光更发散，像更靠后了！' : '继续调节眼镜的度数。');
      msg.className = 'feedback show ' + (ok && st.g !== 0 ? 'ok' : 'info');
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const E = EYES[st.eye], s = eyeSolve(E, uOf(), st.g, true);
      const K = (ECX + R - 10 - XL) / DR;
      const stretch = 1 + ((E.dr - DR) * K) / (2 * R);
      const c = (s.P - E.pmin) / Math.max(1e-6, E.pmax - E.pmin);
      const thick = st.eye === 'myo-thick' ? 1.35 : st.eye === 'hyp-thin' ? 0.7 : 1;
      const cx = ECX + (stretch - 1) * R;
      drawEye(ctx, { cx, cy: CY, R, xL: XL, F, lensW: (12 + c * 10) * thick, cil: c, pupil: 24, stretch, labels: false });
      const xR = cx + R * stretch - 10;
      // 物体在左侧：远处为平行光，近处为发散光（画面中的距离示意）
      const far = st.obj === 'far';
      const P = far ? null : { x: 120, y: CY };
      const GX = XL - 150;
      if (!far) { ctx.fillStyle = '#495057'; ctx.fillRect(108, CY - 50, 10, 100); D.text(ctx, '书（25 cm）', 112, CY - 62, { size: F(13), weight: 800, color: '#2b8a3e', align: 'center' }); }
      else D.text(ctx, '远处物体的光（近似平行）', 40, CY - 76, { size: F(13), weight: 800, color: '#2b8a3e' });
      if (st.g !== 0) {
        L5.draw(ctx, GX, CY, 70, { type: st.g < 0 ? 'concave' : 'convex', w: 20, center: false, stroke: '#7048e8', fill: 'rgba(208,191,255,.55)' });
        D.text(ctx, (st.g < 0 ? '凹透镜 ' : '凸透镜 ') + (st.g > 0 ? '+' : '') + Math.round(st.g * 100) + ' 度', GX, CY - 84, { size: F(13), weight: 800, color: '#7048e8', align: 'center' });
      }
      // 光线：画面比例与实际不同，按“进入眼睛时的会聚 / 发散程度”画
      const vpx = isFinite(s.v) ? s.v * K : 1e5;
      const I = { x: XL + vpx, y: CY };
      // 进入眼睛的光的会聚程度（屈光度，正数会聚）：远处物体 0，25 cm 处 −4，再加上眼镜
      const vin = (far ? 0 : -4) + st.g;
      [-0.85, -0.42, 0.42, 0.85].forEach((k) => {
        const yq = k * 22, q = { x: XL, y: CY + yq };
        const pts = [];
        if (st.g !== 0) {
          const g = { x: GX, y: CY + yq * (1 + vin * 0.0006 * (XL - GX)) }; // 眼镜处的高度（示意比例）
          pts.push(far ? { x: 30, y: g.y } : P, g, q);
        } else pts.push(far ? { x: 30, y: q.y } : P, q);
        const d = V.norm(V.sub(I, q));
        pts.push(V.add(q, V.mul(d, (xR - q.x) / d.x)));
        PS.beam(ctx, pts, { color: '#f76707', width: 1.7 });
      });
      if (I.x < VW - 10) { ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.arc(I.x, CY, 5, 0, TAU); ctx.fill(); D.text(ctx, '会聚点', I.x, CY - 12, { size: F(12), weight: 800, color: '#7048e8', align: 'center' }); }
      D.text(ctx, '视网膜', xR + 6, CY + R * 0.7, { size: F(12), weight: 700, color: '#c2255c' });
      D.text(ctx, E.name, cx, CY + R + 32, { size: F(15), weight: 800, color: '#1b2333', align: 'center' });
      ctx.restore();
    }
    function paintSeen(ctx, w, hh) {
      ctx.save();
      PS.virtual(ctx, w, hh, 300, 300);
      const E = EYES[st.eye], s = eyeSolve(E, uOf(), st.g, true);
      drawSeen(ctx, 300, st.obj, Math.min(24, s.err * 900));
      ctx.restore();
    }
    upd();
  });

  /* ================= 实验：用水透镜模拟眼睛（近视眼、远视眼及其矫正） ================= */
  PS.register('water-lens-eye', function (el) {
    const VW = 1000, VH = 380, CY = 190, LX = 560, K = 9, U = 30, SCR = 15; // 蜡烛距水透镜 30 cm，光屏（视网膜）在 15 cm
    const GD = 4; // 眼镜在水透镜左侧 4 cm
    // 注水 / 抽水后的焦距：恰好能被 f = ∓30 cm 的眼镜矫正
    const fFix = (g) => { const i1 = L5.image(U - GD, g); const u2 = GD - i1.v; return 1 / (1 / SCR + 1 / u2); };
    const FL = [fFix(-30), 10, fFix(30)];
    const st = { fi: 1, glass: 0 };
    Object.defineProperty(st, 'f', { get: () => FL[st.fi] });
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view', style: { background: '#212529' } });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 光屏（视网膜）上'), view), rgt));
    const S2 = PS.stage(view, { ratio: '4 / 3', draw: paintScreen });
    const gSeg = PS.ui.seg([{ value: 0, label: '不戴眼镜' }, { value: -30, label: '近视眼镜（凹，f = −30 cm）' }, { value: 30, label: '远视眼镜（凸，f = 30 cm）' }], 0, (v) => { st.glass = v; upd(); });
    const rF = PS.ui.readout('水透镜焦距', '—', 'accent'), rV = PS.ui.readout('像成在', '—', 'primary');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(PS.ui.button('💉 向水透镜注水（变凸）', () => { if (st.fi === 0) { PS.toast('水透镜已经很凸了'); return; } st.fi--; upd(); }, 'btn btn-sm'), PS.ui.button('💉 从水透镜抽水（变扁）', () => { if (st.fi === 2) { PS.toast('水透镜已经很扁了'); return; } st.fi++; upd(); }, 'btn btn-sm')), PS.ui.row(gSeg.el), h('div', { class: 'readouts' }, rF.el, rV.el), msg);
    function sys() {
      let u = U, m = 1, xo = -U;
      if (st.glass) { const i1 = L5.image(U - GD, st.glass); m *= i1.m; xo = -GD + i1.v; u = -xo; }
      const i2 = L5.image(u, st.f);
      return { v: i2.v, m: m * i2.m };
    }
    function upd() {
      const s = sys(), ok = Math.abs(s.v - SCR) < 0.35;
      rF.set(st.f.toFixed(1) + ' cm');
      rV.set(ok ? '<span class="hl-g">光屏上</span>' : s.v < SCR ? '光屏前' : '光屏后');
      let t;
      if (st.fi === 1 && !st.glass) t = '凸透镜（水透镜）相当于晶状体，光屏相当于视网膜。现在光屏上的像清晰——正常的眼睛。';
      else if (st.fi === 0 && !st.glass) t = '注水后水透镜变<b>凸</b>，焦距变<b>小</b>，折光能力变强，像成在光屏<b>前</b>——这就是<b>近视眼</b>（晶状体太厚）。选一副眼镜让像回到光屏上。';
      else if (st.fi === 2 && !st.glass) t = '抽水后水透镜变<b>扁</b>，焦距变<b>大</b>，折光能力变弱，像成在光屏<b>后</b>——这就是<b>远视眼</b>（晶状体太薄）。选一副眼镜让像回到光屏上。';
      else if (ok) t = '✅ 光屏上又出现了清晰的像。' + (st.glass < 0 ? '<b>凹透镜</b>能矫正近视眼。' : '<b>凸透镜</b>能矫正远视眼。');
      else t = '像还是模糊的（成在光屏' + (s.v < SCR ? '前' : '后') + '）。' + (st.glass < 0 && st.fi >= 1 ? '凹透镜让光发散，像更靠后了。' : st.glass > 0 && st.fi <= 1 ? '凸透镜让光会聚，像更靠前了。' : '水透镜的焦距和眼镜不匹配，再注水或抽水试试。');
      msg.className = 'feedback show ' + (ok && (st.glass || st.fi === 1) ? 'ok' : 'info');
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      ctx.fillStyle = '#ced4da'; ctx.fillRect(20, CY + 110, VW - 40, 12);
      const cx = LX - U * K, sx = LX + SCR * K;
      PS.drawCandle(ctx, cx, CY + 110, 96, { lit: true, w: 20, fh: 24, t: performance.now() / 1000 });
      const P = { x: cx, y: CY - 10 };
      const s = sys();
      const L = { x: LX, y: CY, f: st.f * K, H: 70 };
      const G = st.glass ? { x: LX - GD * K, y: CY, f: st.glass * K, H: 70 } : null;
      [-0.8, -0.4, 0, 0.4, 0.8].forEach((k) => {
        let p = P, d = V.norm(V.sub({ x: LX, y: CY + k * 60 }, P));
        const pts = [p];
        if (G) { const r = L5.through(p, d, G); if (!r) return; pts.push(r.q); p = r.q; d = r.d; }
        const r2 = L5.through(p, d, L); if (!r2) return;
        pts.push(r2.q, V.add(r2.q, V.mul(r2.d, (sx - r2.q.x) / r2.d.x)));
        PS.beam(ctx, pts, { color: '#f76707', width: 1.6, alpha: 0.9 });
      });
      // 水透镜（越凸越厚）
      const wv = 10 + (10 / st.f - 0.75) * 40;
      L5.draw(ctx, LX, CY, 80, { type: 'convex', w: wv, center: false, fill: 'rgba(116,192,252,.55)' });
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(LX, CY - 80); ctx.lineTo(LX, CY - 120); ctx.lineTo(LX + 60, CY - 120); ctx.stroke();
      ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.fillRect(LX + 60, CY - 132, 80, 24); ctx.strokeRect(LX + 60, CY - 132, 80, 24);
      D.text(ctx, '注射器', LX + 100, CY - 140, { size: F(12), weight: 700, color: '#495057', align: 'center' });
      D.text(ctx, '水透镜（晶状体）', LX, CY + 100, { size: F(12), weight: 800, color: '#1c7ed6', align: 'center' });
      if (G) L5.draw(ctx, G.x, CY, 70, { type: st.glass < 0 ? 'concave' : 'convex', w: 16, center: false, stroke: '#7048e8', fill: 'rgba(208,191,255,.55)' });
      ctx.fillStyle = '#868e96'; ctx.fillRect(LX - 3, CY + 80, 6, 30);
      L5.screen(ctx, sx, CY, 70, { stand: 40, label: '光屏（视网膜）', fs: F(12) });
      if (s.v > 0 && LX + s.v * K < VW - 10) { ctx.fillStyle = '#7048e8'; ctx.beginPath(); ctx.arc(LX + s.v * K, CY + 10 * s.m, 4, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    function paintScreen(ctx, w, hh) {
      ctx.save();
      PS.virtual(ctx, w, hh, 400, 300);
      ctx.fillStyle = '#212529'; ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(40, 20, 320, 260);
      const s = sys();
      const blur = Math.min(60, 3 * Math.abs(1 - SCR / s.v) * 30);
      const k = s.m * (SCR / s.v) * 2.2;
      ctx.save(); ctx.beginPath(); ctx.rect(40, 20, 320, 260); ctx.clip();
      L5.blur(ctx, blur, (c) => {
        c.save(); c.translate(200, 150); c.scale(k, k);
        const g = c.createRadialGradient(0, -6, 1, 0, -10, 24);
        g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.5, 'rgba(255,212,59,1)'); g.addColorStop(1, 'rgba(255,146,43,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, -36); c.bezierCurveTo(16, -16, 14, 8, 0, 10); c.bezierCurveTo(-14, 8, -16, -16, 0, -36); c.fill();
        c.fillStyle = 'rgba(160,160,150,.6)'; c.fillRect(-10, 10, 20, 70);
        c.restore();
      }, { op: 'source-over', max: 26 });
      ctx.restore();
      ctx.restore();
    }
    upd();
  });

  /* ================= 近视眼还是远视眼 ================= */
  PS.register('eye-sort', function (el) {
    PS.sortCards(el, [
      ['看不清黑板上的字，看书没问题', 0, '只能看清近处'],
      ['看书时要把书拿得远一些', 1, '看不清近处'],
      ['远处物体的像成在视网膜前', 0, ''],
      ['近处物体的像成在视网膜后', 1, ''],
      ['晶状体太厚，折光能力太强', 0, ''],
      ['晶状体太薄，折光能力太弱', 1, ''],
      ['眼球在前后方向上太长', 0, ''],
      ['眼球在前后方向上太短', 1, ''],
      ['应配戴凹透镜（度数为负）', 0, '凹透镜发散光，使像后移'],
      ['应配戴凸透镜（度数为正）', 1, '凸透镜会聚光，使像前移'],
      ['长时间近距离看书、玩手机容易造成', 0, '要注意用眼卫生'],
      ['老年人看报纸要戴“老花镜”', 1, '老花镜是凸透镜'],
    ], ['近视眼', '远视眼']);
  });
})();
