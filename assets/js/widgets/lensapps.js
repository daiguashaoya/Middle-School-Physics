/* 第5章第2节：生活中的透镜——模型照相机、投影仪、放大镜、实像和虚像、照相机 / 投影仪 / 放大镜分类。依赖 optics.js、lens.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const L5 = PS.lens;
  const TAU = Math.PI * 2;

  /* 景物：画在边长 1 的方块里（中心为主光轴），供“像”使用 */
  function sceneCanvas(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 400;
    const g = c.getContext('2d');
    if (kind === 'flower') {
      g.fillStyle = '#fff4e6'; g.fillRect(0, 0, 400, 400);
      g.fillStyle = '#e9ecef'; g.fillRect(0, 0, 400, 120);
      g.fillStyle = '#b08968'; g.fillRect(0, 300, 400, 100);
      // 花瓶
      g.fillStyle = '#4dabf7'; g.beginPath(); g.moveTo(170, 300); g.quadraticCurveTo(150, 240, 180, 210); g.lineTo(220, 210); g.quadraticCurveTo(250, 240, 230, 300); g.closePath(); g.fill();
      g.strokeStyle = '#2b8a3e'; g.lineWidth = 6;
      [[200, 210, 200, 120], [200, 200, 150, 140], [200, 200, 255, 135]].forEach(([a, b, x, y]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + x) / 2 + 8, (b + y) / 2, x, y); g.stroke(); });
      [[200, 112, '#e64980'], [146, 132, '#f76707'], [258, 127, '#fab005']].forEach(([x, y, col]) => {
        g.fillStyle = col;
        for (let k = 0; k < 6; k++) { const a = (k * TAU) / 6; g.beginPath(); g.ellipse(x + Math.cos(a) * 15, y + Math.sin(a) * 15, 13, 8, a, 0, TAU); g.fill(); }
        g.fillStyle = '#ffe066'; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
      });
      return c;
    }
    // 窗外的树
    const sky = g.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, '#74c0fc'); sky.addColorStop(1, '#d0ebff');
    g.fillStyle = sky; g.fillRect(0, 0, 400, 330);
    g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(330, 60, 26, 0, TAU); g.fill();
    g.fillStyle = '#fff'; [[80, 70, 30], [110, 62, 24], [130, 74, 22]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); });
    g.fillStyle = '#69db7c'; g.fillRect(0, 330, 400, 70);
    // 房子
    g.fillStyle = '#ffa8a8'; g.fillRect(270, 250, 90, 80);
    g.fillStyle = '#c92a2a'; g.beginPath(); g.moveTo(260, 252); g.lineTo(315, 205); g.lineTo(370, 252); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.fillRect(290, 270, 22, 22); g.fillStyle = '#8d6e4c'; g.fillRect(325, 285, 20, 45);
    // 树
    g.fillStyle = '#8d6e4c'; g.fillRect(183, 220, 34, 112);
    g.fillStyle = '#2f9e44'; g.beginPath(); g.arc(200, 150, 72, 0, TAU); g.fill();
    g.fillStyle = '#40c057'; g.beginPath(); g.arc(178, 128, 40, 0, TAU); g.arc(228, 140, 38, 0, TAU); g.fill();
    return c;
  }
  function drawScene(ctx, img, cx, cy, size, rot) {
    ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(Math.PI);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
  function tree(ctx, x, yb, H) {
    ctx.save();
    ctx.fillStyle = '#8d6e4c'; ctx.fillRect(x - H * 0.06, yb - H * 0.45, H * 0.12, H * 0.45);
    ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.ellipse(x, yb - H * 0.68, H * 0.26, H * 0.33, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function flower(ctx, x, yb, H) {
    ctx.save();
    ctx.fillStyle = '#4dabf7'; ctx.beginPath(); ctx.moveTo(x - H * 0.15, yb); ctx.quadraticCurveTo(x - H * 0.25, yb - H * 0.3, x - H * 0.1, yb - H * 0.4); ctx.lineTo(x + H * 0.1, yb - H * 0.4); ctx.quadraticCurveTo(x + H * 0.25, yb - H * 0.3, x + H * 0.15, yb); ctx.fill();
    ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = Math.max(1.5, H * 0.03); ctx.beginPath(); ctx.moveTo(x, yb - H * 0.4); ctx.lineTo(x, yb - H * 0.85); ctx.stroke();
    ctx.fillStyle = '#e64980'; ctx.beginPath(); ctx.arc(x, yb - H * 0.88, H * 0.12, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ================= 制作模型照相机 ================= */
  PS.register('camera-model', function (el) {
    const VW = 1000, VH = 400, CY = 190, LX = 470, K = 22, FCM = 10, A = 4; // 焦距 10 cm，镜头直径 4 cm
    const SC = {
      far: { name: '窗外远处的树', u: 1000, H: 300, img: 'tree' },
      mid: { name: '院子里的树', u: 500, H: 200, img: 'tree' },
      near: { name: '桌上的花', u: 40, H: 16, img: 'flower' },
    };
    const st = { sc: 'mid', s: 12, rays: true };
    const imgs = { tree: sceneCanvas('tree'), flower: sceneCanvas('flower') };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view', style: { background: '#111' } });
    const lft = h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 从后面看半透明纸'), view, h('p', { class: 'ln-view-cap' }, '像的大小、倒正、清晰程度与实际一致'));
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, lft, rgt));
    const S2 = PS.stage(view, { ratio: '1 / 1', draw: paintView });
    const sSeg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k].name })), st.sc, (v) => { st.sc = v; upd(); });
    const vS = PS.ui.slider({ label: '半透明纸到透镜', min: 9, max: 17, step: 0.05, value: st.s, unit: 'cm', fmt: (v) => v.toFixed(2), onInput: (v) => { st.s = v; upd(); } });
    vS.el.classList.add('wide');
    const rT = PS.ui.toggle('显示光路', true, (v) => { st.rays = v; S.render(); });
    const rU = PS.ui.readout('物距 u', '—', 'accent'), rV = PS.ui.readout('像清晰时的像距 v', '?', 'primary'), rQ = PS.ui.readout('像', '—');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(sSeg.el), PS.ui.row(vS.el, rT.el), h('div', { class: 'readouts' }, rU.el, rV.el, rQ.el), msg);
    const vOf = () => L5.image(SC[st.sc].u, FCM).v;
    function sharp() { return Math.abs(st.s - vOf()) < 0.06; }
    function upd() {
      const sc = SC[st.sc], v = vOf();
      if (Math.abs(st.s - v) < 0.06) { st.s = v; vS.set(PS.round(v, 2), true); }
      rU.set(sc.u >= 100 ? (sc.u / 100) + ' m' : sc.u + ' cm');
      rV.set(sharp() ? v.toFixed(2) + ' cm' : '？');
      const b = A * Math.abs(1 - st.s / v);
      rQ.set(sharp() ? '<span class="hl-g">清晰</span>' : b < 0.25 ? '有点模糊' : '模糊');
      let t;
      if (sharp()) t = '✅ 半透明纸上出现了<b>清晰</b>的像：<b>倒立、缩小的实像</b>。像距 ' + v.toFixed(2) + ' cm，在 1 倍焦距和 2 倍焦距之间（f = 10 cm）。照相机的镜头相当于<b>凸透镜</b>，胶片（图像传感器）相当于光屏。';
      else t = '像' + (b < 0.25 ? '有点' : '很') + '模糊。' + (st.s > v ? '把内筒向<b>里推</b>（半透明纸靠近凸透镜）。' : '把内筒向<b>外拉</b>（半透明纸远离凸透镜）。') + '观察景物时，要让<b>凸透镜朝向景物</b>。';
      if (sharp() && st.sc === 'near') t += '<br>拍近处的物体，像距<b>变大</b>、像也<b>变大</b>——照相机要把镜头往前伸（调焦）。';
      if (sharp() && st.sc === 'far') t += '<br>拍很远的景物时，像几乎成在焦点附近（v 略大于 f），像很小。';
      msg.className = 'feedback show ' + (sharp() ? 'ok' : 'info');
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const sc = SC[st.sc], v = vOf(), s = st.s;
      // 物体：远处的物体按相同比例缩小距离和高度（光线方向不变）
      const uPx = sc.u * K, c = Math.min(1, 380 / uPx);
      const ox = LX - uPx * c, Hh = sc.H * K * c;
      ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, CY); ctx.lineTo(VW - 20, CY); ctx.stroke();
      if (sc.img === 'tree') tree(ctx, ox, CY + Hh / 2, Hh); else flower(ctx, ox, CY + Hh / 2, Hh);
      D.text(ctx, sc.name, Math.max(12, ox - 40), CY - Hh / 2 - 12, { size: F(13), weight: 800, color: '#2b8a3e' });
      D.dim(ctx, ox, LX, CY + 150, 'u = ' + (sc.u >= 100 ? sc.u / 100 + ' m' : sc.u + ' cm') + (c < 1 ? '（按比例缩小画）' : ''), { size: F(13), color: '#e8590c' });
      // 外筒和内筒
      const oL = LX - 8, oR = LX + 16 * K, oH = 3.4 * K;
      const pX = LX + s * K, iH = 3.0 * K;
      ctx.fillStyle = '#343a40'; ctx.fillRect(oL, CY - oH - 6, oR - oL, 6); ctx.fillRect(oL, CY + oH, oR - oL, 6);
      ctx.fillStyle = '#868e96'; ctx.fillRect(pX - 4, CY - iH - 4, oR + 2.5 * K - pX, 4); ctx.fillRect(pX - 4, CY + iH, oR + 2.5 * K - pX, 4);
      ctx.fillStyle = 'rgba(255,249,219,.95)'; ctx.fillRect(pX - 3, CY - iH, 5, iH * 2);
      D.text(ctx, '外筒', oL + 10, CY + oH + 26, { size: F(12), weight: 700, color: '#343a40' });
      D.text(ctx, '内筒', oR + 2.5 * K, CY + oH + 26, { size: F(12), weight: 700, color: '#495057', align: 'right' });
      D.text(ctx, '半透明纸', pX, CY - oH - 16, { size: F(12), weight: 800, color: '#e8590c', align: 'center' });
      // 光线：物体顶端、底端各三条
      const L = { x: LX, y: CY, f: FCM * K, H: (A / 2) * K };
      if (st.rays) {
        [[1, '#f76707'], [-1, '#1c7ed6']].forEach(([sg, col]) => {
          const P = { x: ox, y: CY - sg * Hh / 2 };
          const I = { x: LX + v * K, y: CY + sg * (sc.H / 2) * (v / sc.u) * K };
          [-0.9, 0, 0.9].forEach((k) => {
            const q = { x: LX, y: CY + k * L.H };
            const d = V.norm(V.sub(I, q)), end = V.add(q, V.mul(d, (pX - LX) / d.x));
            PS.beam(ctx, [P, q, end], { color: col, width: 1.5, alpha: 0.85 });
          });
        });
      }
      L5.draw(ctx, LX, CY, L.H + 6, { type: 'convex', w: 16, center: false });
      // 焦点
      L5.axis(ctx, { x0: LX - 2, x1: LX + 2, y: CY, cx: LX, f: FCM * K, F, labels: true, color: 'rgba(0,0,0,0)' });
      // 像（清晰时）
      if (sharp()) {
        const ih = sc.H * (v / sc.u) * K;
        L5.arrowObj(ctx, LX + v * K + 10, CY - ih / 2, -ih, { color: '#7048e8', width: 2.5, head: 8, label: '倒立、缩小的实像', fs: F(12), lx: 8 });
      }
      ctx.restore();
    }
    function paintView(ctx, w, hh) {
      ctx.save();
      const VS = 400;
      PS.virtual(ctx, w, hh, VS, VS);
      ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, VS, VS);
      const sc = SC[st.sc], v = vOf(), s = st.s;
      const PX = VS / 8; // 半透明纸宽 8 cm
      const size = 1.6 * sc.H * (s / sc.u) * PX; // 景物方块（边长约 1.6H，树高约占 H）在纸上的大小
      const b = (A / 2) * Math.abs(1 - s / v) * PX;
      ctx.save();
      ctx.beginPath(); ctx.arc(VS / 2, VS / 2, VS * 0.47, 0, TAU); ctx.clip();
      L5.blur(ctx, b, (c) => drawScene(c, imgs[sc.img], VS / 2, VS / 2, size, true), { max: 30 });
      // 半透明纸的质感
      ctx.fillStyle = 'rgba(255,248,230,.12)'; ctx.fillRect(0, 0, VS, VS);
      ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(VS / 2, VS / 2, VS * 0.47 + 5, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    upd();
  });

  /* ================= 投影仪 ================= */
  PS.register('projector', function (el) {
    const VW = 1000, VH = 470, FCM = 20, OBJ = 8; // 镜头焦距 20 cm，投影片上的字高 8 cm
    const st = { u: 24, D: 160, mirror: true, flip: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view' });
    const cap = h('div', { class: 'ln-inset-t' });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, cap, view), rgt));
    const S2 = PS.stage(view, { ratio: '4 / 3', draw: paintScreen });
    const uS = PS.ui.slider({ label: '镜头到投影片', min: 20.5, max: 40, step: 0.1, value: st.u, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.u = v; upd(); } });
    const dS = PS.ui.slider({ label: '镜头到屏幕', min: 60, max: 450, step: 1, value: st.D, unit: 'cm', onInput: (v) => { st.D = v; upd(); } });
    const mT = PS.ui.toggle('装上平面镜（反光镜）', true, (v) => { st.mirror = v; upd(); });
    const fT = PS.ui.toggle('投影片倒着放', false, (v) => { st.flip = v; upd(); });
    const fit = PS.ui.button('🔍 自动调焦（只调屏幕距离）', () => { const v = L5.image(st.u, FCM).v; if (v > 450) { PS.toast('像距太大，超出了范围，把镜头调高一些'); return; } st.D = Math.round(v); dS.set(st.D, true); upd(); }, 'btn btn-ghost btn-sm');
    uS.el.classList.add('wide'); dS.el.classList.add('wide');
    const rV = PS.ui.readout('像距 v', '—', 'primary'), rM = PS.ui.readout('像高', '—', 'accent'), rQ = PS.ui.readout('清晰程度', '—');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(uS.el), PS.ui.row(dS.el), PS.ui.row(mT.el, fT.el, fit), h('div', { class: 'readouts' }, rV.el, rM.el, rQ.el), msg);
    function sharp() { return Math.abs(st.D - L5.image(st.u, FCM).v) <= Math.max(2, 0.012 * st.D); }
    function upd() {
      const im = L5.image(st.u, FCM);
      cap.innerHTML = st.mirror ? '👀 屏幕上的像（观众看到的）' : '👀 天花板上的像（从下往上看）';
      rV.set(im.v > 999 ? '很远' : Math.round(im.v) + ' cm');
      const ih = OBJ * (st.D / st.u);
      rM.set(Math.round(ih) + ' cm');
      rQ.set(sharp() ? '<span class="hl-g">清晰</span>' : '模糊');
      let t;
      if (sharp()) t = '✅ ' + (st.mirror ? '屏幕' : '天花板') + '上成<b>倒立、放大的实像</b>。物距 ' + st.u.toFixed(1) + ' cm 在 1 倍焦距和 2 倍焦距之间（f = 20 cm），像距 ' + Math.round(im.v) + ' cm 大于 2 倍焦距。';
      else t = '像模糊。调节屏幕到镜头的距离，或上下调节镜头，使像变清晰（可以点“自动调焦”）。' + (im.v > 450 ? '<br>⚠️ 镜头离投影片太近（接近焦点），像距太大，屏幕放不了那么远。' : '');
      if (sharp()) t += '<br>要使像<b>变大</b>：镜头向下调（<b>靠近</b>投影片），同时投影仪<b>远离</b>屏幕。';
      if (st.mirror) t += '<br><span class="small">平面镜的作用：<b>改变光的传播方向</b>，使像成在竖直的屏幕上。</span>';
      if (sharp()) t += st.flip ? '<br>投影片<b>倒着放</b>，屏幕上的字就是正的了。' : '<br>屏幕上的字相对于投影片<b>上下颠倒、左右也颠倒</b>——要看到正立的字，投影片要<b>倒着放</b>。';
      msg.className = 'feedback show ' + (sharp() ? 'ok' : 'info');
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    function letterF(ctx, x, y, s, color) {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = color || '#1b2333';
      ctx.fillRect(-s * 0.3, -s * 0.5, s * 0.16, s);
      ctx.fillRect(-s * 0.3, -s * 0.5, s * 0.58, s * 0.16);
      ctx.fillRect(-s * 0.3, -s * 0.1, s * 0.42, s * 0.15);
      ctx.restore();
    }
    function paintSlide(ctx, F) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5;
      D.roundRect(ctx, 20, 20, 190, 150, 10); ctx.fill(); ctx.stroke();
      D.text(ctx, '投影片（俯视）· ' + (st.flip ? '倒放' : '正放'), 32, 44, { size: F(12), weight: 800, color: '#495057' });
      ctx.fillStyle = '#fff9db'; ctx.fillRect(75, 56, 80, 100); ctx.strokeRect(75, 56, 80, 100);
      ctx.save(); ctx.translate(115, 106); if (st.flip) ctx.rotate(Math.PI); letterF(ctx, 0, 0, 72, '#e8590c'); ctx.restore();
    }
    function paintScreen(ctx, w, hh) {
      ctx.save();
      PS.virtual(ctx, w, hh, 400, 300);
      ctx.fillStyle = st.mirror ? '#e9ecef' : '#dee2e6'; ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = st.mirror ? '#fff' : '#f1f3f5'; ctx.fillRect(20, 15, 360, 270);
      const im = L5.image(st.u, FCM);
      const PX = 360 / 300; // 屏幕宽 3 m
      const ih = OBJ * (st.D / st.u) * PX;
      const b = Math.min(40, 40 * Math.abs(1 - st.D / im.v)); // 离焦模糊（示意，作了放大）
      ctx.save();
      ctx.beginPath(); ctx.rect(20, 15, 360, 270); ctx.clip();
      // 光斑（灯光照亮的方形区域）
      const sq = 22 * (st.D / st.u) * PX;
      const br = PS.clamp(1.6 * (24 / st.u) * (160 / st.D) ** 2 * 0.4 + 0.15, 0.15, 0.95);
      ctx.fillStyle = 'rgba(255,250,220,' + br + ')'; ctx.fillRect(200 - sq / 2, 150 - sq / 2, sq, sq);
      L5.blur(ctx, b, (c) => { c.save(); c.translate(200, 150); c.rotate(st.flip ? 0 : Math.PI); letterF(c, 0, 0, ih, 'rgba(232,89,12,' + PS.clamp(br + 0.2, 0.3, 1) + ')'); c.restore(); }, { op: 'source-over', max: 24 });
      ctx.restore();
      if (ih > 300) { ctx.font = PS.font(13, 700); ctx.fillStyle = '#e03131'; ctx.fillText('像太大，超出了屏幕', 28, 34); }
      ctx.restore();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH, { grid: false, bg: '#f8f9fa' });
      paintSlide(ctx, F);
      const K = 5, baseY = 420, slideY = 360, bx = 340;
      const lensY = slideY - st.u * K, mirY = lensY - 46;
      // 底座（灯、聚光镜）
      ctx.fillStyle = '#495057'; D.roundRect(ctx, bx - 110, slideY, 220, baseY - slideY + 20, 8); ctx.fill();
      ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(bx, slideY + 45, 14, 0, TAU); ctx.fill();
      D.text(ctx, '灯泡（光源）', bx, slideY + 82, { size: F(12), weight: 700, color: '#fff', align: 'center' });
      ctx.fillStyle = 'rgba(165,216,255,.8)'; ctx.fillRect(bx - 100, slideY - 6, 200, 6);
      ctx.fillStyle = '#e8590c'; ctx.fillRect(bx - 34, slideY - 9, 68, 3);
      D.text(ctx, '投影片', bx - 108, slideY - 12, { size: F(12), weight: 800, color: '#e8590c', align: 'right' });
      // 立柱
      ctx.fillStyle = '#868e96'; ctx.fillRect(bx + 96, mirY - 20, 10, slideY - mirY + 20);
      ctx.fillRect(bx + 20, lensY - 4, 86, 8);
      // 光锥：投影片 → 镜头
      ctx.fillStyle = 'rgba(255,236,153,.4)';
      ctx.beginPath(); ctx.moveTo(bx - 34, slideY - 9); ctx.lineTo(bx - 20, lensY); ctx.lineTo(bx + 20, lensY); ctx.lineTo(bx + 34, slideY - 9); ctx.closePath(); ctx.fill();
      // 镜头
      ctx.save(); ctx.translate(bx, lensY); ctx.rotate(Math.PI / 2); L5.draw(ctx, 0, 0, 26, { type: 'convex', w: 12, center: false }); ctx.restore();
      D.text(ctx, '凸透镜', bx - 34, lensY + 4, { size: F(12), weight: 800, color: '#1c7ed6', align: 'right' });
      const im = L5.image(st.u, FCM);
      const k2 = 1.5; // 水平方向：每厘米 1.5 单位（缩小画）
      const ih = Math.min(330, OBJ * (st.D / st.u) * k2 * 0.9);
      if (st.mirror) {
        PS.drawMirror(ctx, { x: bx - 32, y: mirY + 30 }, { x: bx + 32, y: mirY - 30 }, { side: -1, thick: 5 });
        D.text(ctx, '平面镜', bx - 40, mirY - 26, { size: F(12), weight: 800, color: '#1864ab', align: 'right' });
        const sx = Math.min(VW - 40, bx + 46 + (st.D - 46 / K) * k2);
        const top = mirY - ih / 2, bot = mirY + ih / 2;
        ctx.fillStyle = 'rgba(255,236,153,.38)';
        ctx.beginPath(); ctx.moveTo(bx, lensY); ctx.lineTo(bx - 18, mirY + 18); ctx.lineTo(sx, top); ctx.lineTo(sx, bot); ctx.lineTo(bx + 18, mirY - 18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 2;
        ctx.fillRect(sx, Math.min(30, top - 10), 10, Math.max(380, ih + 20)); ctx.strokeRect(sx, Math.min(30, top - 10), 10, Math.max(380, ih + 20));
        D.text(ctx, '屏幕', sx + 5, Math.min(30, top - 10) - 8, { size: F(13), weight: 800, color: '#495057', align: 'center' });
        if (sharp()) L5.arrowObj(ctx, sx - 12, mirY - ih * 0.4, -ih * 0.8, { color: '#7048e8', width: 3, head: 12 });
        D.dim(ctx, bx, sx, baseY + 50, '镜头到屏幕 ' + st.D + ' cm（水平方向缩小画）', { size: F(12), color: '#495057' });
      } else {
        const cy = 14;
        ctx.fillStyle = 'rgba(255,236,153,.38)';
        ctx.beginPath(); ctx.moveTo(bx - 20, lensY); ctx.lineTo(bx - ih / 2, cy); ctx.lineTo(bx + ih / 2, cy); ctx.lineTo(bx + 20, lensY); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ced4da'; ctx.fillRect(0, 0, VW, 10);
        D.text(ctx, '天花板（竖直方向缩小画）', bx + ih / 2 + 16, 30, { size: F(12), weight: 700, color: '#495057' });
      }
      D.text(ctx, '镜头 f = 20 cm', bx + 112, lensY + 4, { size: F(12), weight: 700, color: '#1c7ed6' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 放大镜 ================= */
  PS.register('magnifier', function (el) {
    const VW = 1000, VH = 420, CY = 240, LX = 520, FCM = 8, K = 17, EYE = 26; // 焦距 8 cm，眼睛离放大镜 26 cm
    const st = { u: 5, rays: true };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view' });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 眼睛透过放大镜看到的'), view), rgt));
    const S2 = PS.stage(view, { ratio: '1 / 1', draw: paintView });
    const uS = PS.ui.slider({ label: '放大镜到书', min: 1, max: 22, step: 0.1, value: st.u, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.u = v; upd(); } });
    uS.el.classList.add('wide');
    const rT = PS.ui.toggle('显示光路', true, (v) => { st.rays = v; S.render(); });
    const rI = PS.ui.readout('看到的像', '—', 'primary');
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(uS.el, rT.el), h('div', { class: 'readouts' }, rI.el), msg);
    // 看到的效果：返回 { kind, mag（相对于不用放大镜直接看的角放大率，负数为倒立）, blur }
    function seen() {
      const u = st.u, im = L5.image(u, FCM);
      if (Math.abs(u - FCM) < 0.15) return { kind: 'inf', mag: (u + EYE) / FCM, blur: 0.15 };
      if (u < FCM) { const v = -im.v; return { kind: 'virt', mag: (im.m * (u + EYE)) / (v + EYE), blur: 0, m: im.m }; }
      const v = im.v, dd = EYE - v; // 像到眼睛的距离
      if (dd < 4) return { kind: 'blur', mag: 1.5, blur: 1, v };
      return { kind: 'real', mag: (im.m * (u + EYE)) / dd, blur: dd < 10 ? 0.5 : 0, v };
    }
    function upd() {
      const s = seen();
      let t;
      if (s.kind === 'virt') {
        rI.set('正立、放大的虚像');
        t = '物体在<b>焦点以内</b>（u &lt; f = 8 cm）：透过放大镜看到<b>正立、放大的虚像</b>，像和物在透镜的<b>同侧</b>。' + (st.u > 6 ? '放大镜离字<b>越远</b>（仍在焦点以内），看到的字<b>越大</b>。' : '把放大镜离字稍远一些，字会变得更大。');
      } else if (s.kind === 'inf') { rI.set('很大、看不清边缘'); t = '字正好在<b>焦点</b>上：折射后的光是平行光，不能成像（看到的字很大，但不是严格意义上的像）。'; }
      else if (s.kind === 'blur') { rI.set('模糊一片'); t = '字在焦点以外：凸透镜在眼睛附近成实像，眼睛看到的是<b>模糊</b>的一片。'; }
      else { rI.set('倒立的实像'); t = '字在<b>焦点以外</b>：看到的字<b>倒过来</b>了——这时凸透镜成的是<b>倒立的实像</b>，已经不是放大镜的用法了。'; }
      t += '<br><span class="small">放大镜就是一个凸透镜，要把物体放在它的<b>一倍焦距以内</b>，眼睛在另一侧观察。</span>';
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      L5.axis(ctx, { x0: 20, x1: VW - 20, y: CY, cx: LX, f: FCM * K, F, two: true });
      const ox = LX - st.u * K, Hh = 2.4 * K;
      // 书
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(ox - 8, CY - 130, 8, 260);
      D.text(ctx, '书上的字', ox - 12, CY - 136, { size: F(12), weight: 700, color: '#495057', align: 'right' });
      L5.arrowObj(ctx, ox, CY, Hh, { color: '#2b8a3e', width: 4, head: 12 });
      const L = { x: LX, y: CY, f: FCM * K, H: 120 };
      const ex = LX + EYE * K;
      const im = L5.image(st.u, FCM);
      const P = { x: ox, y: CY - Hh };
      if (st.rays) {
        const r1 = L5.through(P, { x: 1, y: 0 }, L), r2 = L5.through(P, V.norm(V.sub({ x: LX, y: CY }, P)), L);
        [r1, r2].forEach((r) => { if (!r) return; PS.beam(ctx, L5.clipEnd([P, r.q, O.along(r.q, r.d, 900)], 10, 10, VW - 10, VH - 10), { color: '#f76707', width: 2, arrow: true, head: 11 }); });
        if (im.v < 0 && r1 && r2) {
          const I = { x: LX + im.v * K, y: CY - Hh * im.m };
          [r1, r2].forEach((r) => PS.beam(ctx, L5.clipEnd([r.q, I], 0, 0, VW, VH), { color: '#f59f00', width: 1.3, dash: [6, 5] }));
          if (I.x > 10 && I.y > 10) L5.arrowObj(ctx, I.x, CY, Math.min(CY - 12, Hh * im.m), { color: '#7048e8', width: 3, dash: true, head: 12, label: '正立、放大的虚像', fs: F(12) });
        }
        if (im.v > 0 && LX + im.v * K < VW) L5.arrowObj(ctx, LX + im.v * K, CY, -Hh * Math.abs(im.m), { color: '#7048e8', width: 3, head: 12, label: '倒立的实像', fs: F(12) });
      }
      L5.draw(ctx, LX, CY, 120, { type: 'convex', w: 30 });
      ctx.fillStyle = '#868e96'; ctx.fillRect(LX - 6, CY + 120, 12, 70);
      D.text(ctx, '放大镜', LX + 14, CY + 150, { size: F(13), weight: 800, color: '#1c7ed6' });
      PS.drawEye(ctx, ex, CY, Math.PI, 22);
      D.text(ctx, '眼睛', ex + 10, CY + 40, { size: F(12), weight: 700, color: '#495057', align: 'center' });
      D.dim(ctx, ox, LX, CY + 70, 'u = ' + st.u.toFixed(1) + ' cm', { size: F(13), color: '#e8590c' });
      ctx.restore();
    }
    const TXT = '物理就在我们身边。透镜能会聚光，也能发散光；放大镜让我们看清细小的文字。';
    function page(ctx, S0, fs) {
      ctx.fillStyle = '#fffdf6'; ctx.fillRect(-S0, -S0, S0 * 2, S0 * 2);
      ctx.fillStyle = '#343a40'; ctx.font = PS.font(fs, 600); ctx.textBaseline = 'middle';
      const lh = fs * 1.7, cw = fs * 1.02;
      let k = 0;
      for (let y = -S0 + lh / 2, r = 0; y < S0; y += lh, r++) {
        for (let x = -S0 + (r % 2) * cw * 0.3; x < S0; x += cw) { ctx.fillText(TXT.charAt(k % TXT.length), x, y); k++; }
      }
    }
    function paintView(ctx, w, hh) {
      ctx.save();
      const VS = 400;
      PS.virtual(ctx, w, hh, VS, VS);
      ctx.translate(VS / 2, VS / 2);
      page(ctx, VS, 15);
      const s = seen(), R = 140;
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
      ctx.fillStyle = '#fffdf6'; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      const m = PS.clamp(s.mag, -9, 9);
      const draw = (c) => { c.save(); c.scale(m, m); page(c, VS / Math.abs(m) + 20, 15); c.restore(); };
      if (s.kind === 'blur') { ctx.fillStyle = '#e9e4d5'; ctx.fillRect(-R, -R, 2 * R, 2 * R); L5.blur(ctx, 26, (c) => { c.save(); c.scale(-2, -2); page(c, VS, 15); c.restore(); }, { op: 'source-over', max: 18, alpha: 0.5 }); }
      else L5.blur(ctx, s.blur * 8, draw, { op: 'source-over', max: 14 });
      // 镜片反光
      const g = ctx.createRadialGradient(-R * 0.4, -R * 0.4, 5, 0, 0, R);
      g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(165,216,255,.12)');
      ctx.fillStyle = g; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#495057'; ctx.save(); ctx.rotate(Math.PI / 4); D.roundRect(ctx, R + 6, -11, 120, 22, 8); ctx.fill(); ctx.restore();
      ctx.restore();
    }
    upd();
  });

  /* ================= 实像和虚像：光屏能承接吗 ================= */
  PS.register('real-virtual', function (el) {
    const VW = 1000, VH = 420, CY = 220, DX = 470;
    const MODES = {
      pin: { name: '小孔成像', real: true, u: 220 },
      big: { name: '凸透镜（物在焦点外）', real: true, f: 140, u: 220 },
      mag: { name: '凸透镜（物在焦点内）', real: false, f: 220, u: 130 },
      mir: { name: '平面镜', real: false, u: 220 },
    };
    const ox = () => DX - MODES[st.mode].u;
    const st = { mode: 'big', sx: 860 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const view = h('div', { class: 'ln-view', style: { background: '#212529' } });
    const rgt = h('div');
    el.append(h('div', { class: 'ln-pair' }, h('div', { class: 'ln-inset' }, h('div', { class: 'ln-inset-t' }, '👀 光屏上'), view), rgt));
    const S2 = PS.stage(view, { ratio: '3 / 4', draw: paintScreen });
    const mSeg = PS.ui.seg(Object.keys(MODES).map((k) => ({ value: k, label: MODES[k].name })), st.mode, (v) => { st.mode = v; st.sx = v === 'mir' ? 640 : 860; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    rgt.append(PS.ui.row(mSeg.el), msg);
    function imageX() {
      const M = MODES[st.mode];
      if (st.mode === 'pin') return null;
      if (st.mode === 'mir') return DX + M.u;
      const im = L5.image(M.u, M.f);
      return DX + im.v;
    }
    function state() {
      const M = MODES[st.mode], ix = imageX();
      if (st.mode === 'pin') return st.sx > DX + 20 ? 'sharp' : 'none';
      if (st.mode === 'mir') return 'none';
      if (st.sx < DX + 10) return 'none';
      if (!M.real) return 'patch';
      return Math.abs(st.sx - ix) < 10 ? 'sharp' : 'patch';
    }
    function upd() {
      const M = MODES[st.mode], s = state();
      let t;
      if (st.mode === 'pin') t = '小孔成像：光屏放在小孔后面任何位置都能承接到<b>倒立的实像</b>（光屏越远像越大）。实像是<b>实际光线</b>会聚成的。';
      else if (st.mode === 'mir') t = '平面镜成<b>虚像</b>：镜子后面根本没有光，把光屏放在像的位置（镜后）<b>承接不到</b>像。虚像是反射光线的<b>反向延长线</b>相交形成的，只能用眼睛看到。';
      else if (M.real) t = s === 'sharp' ? '✅ 光屏在像的位置：承接到<b>清晰、倒立的实像</b>。实像由<b>实际光线</b>会聚而成，能用光屏承接，像与物在透镜<b>两侧</b>。' : '拖动光屏，找到清晰的像。光屏不在像的位置时，只能得到模糊的光斑。';
      else t = '物体在焦点以内，凸透镜成<b>正立、放大的虚像</b>，像在物体<b>同侧</b>（透镜左边）。光屏放在透镜右边，只能得到一片<b>模糊的光斑</b>；放到虚像的位置（左边）更承接不到——虚像是折射光线<b>反向延长线</b>的交点。';
      t += '<br><span class="small">实像、虚像都能用眼睛看到；能不能用光屏承接，是区分实像和虚像的方法。</span>';
      msg.className = 'feedback show ' + (s === 'sharp' ? 'ok' : 'info');
      msg.innerHTML = t;
      S.render(); S2.render();
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => (Math.abs(p.x - st.sx) < 26 ? 'S' : null),
      move: (k, p) => {
        let x = PS.clamp(p.x, st.mode === 'mir' ? DX + 40 : DX + 30, VW - 30);
        const ix = imageX();
        if (ix && Math.abs(x - ix) < 12) x = ix;
        st.sx = x; upd();
      },
    });
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      L5.paper(ctx, VW, VH);
      const M = MODES[st.mode];
      ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, CY); ctx.lineTo(VW - 20, CY); ctx.stroke();
      // 物体（蜡烛）
      const OX = ox();
      PS.drawCandle(ctx, OX, CY + 40, 90, { lit: true, w: 22, fh: 26 });
      const P = { x: OX, y: CY - 70 }; // 火焰位置
      const ix = imageX();
      const col = '#f76707';
      if (st.mode === 'pin') {
        ctx.fillStyle = '#495057'; ctx.fillRect(DX - 4, 30, 8, CY - 34); ctx.fillRect(DX - 4, CY + 4, 8, VH - CY - 34);
        D.text(ctx, '小孔', DX + 10, CY - 8, { size: F(12), weight: 700, color: '#495057' });
        const end = O.along(P, V.norm(V.sub({ x: DX, y: CY }, P)), 1000);
        PS.beam(ctx, L5.clipEnd([P, { x: DX, y: CY }, end], 0, 0, st.sx, VH), { color: col, width: 2, arrow: true });
        const B = { x: OX, y: CY + 40 };
        PS.beam(ctx, L5.clipEnd([B, { x: DX, y: CY }, O.along(B, V.norm(V.sub({ x: DX, y: CY }, B)), 1000)], 0, 0, st.sx, VH), { color: '#1c7ed6', width: 2, arrow: true });
      } else if (st.mode === 'mir') {
        PS.drawMirror(ctx, { x: DX, y: 40 }, { x: DX, y: VH - 40 }, { side: -1 });
        const I = { x: ix, y: P.y };
        [-60, 30, 110].forEach((dy) => {
          const q = { x: DX, y: CY + dy };
          const d = V.norm(V.sub(q, P)), r = { x: -d.x, y: d.y };
          PS.beam(ctx, [P, q, O.along(q, r, 300)], { color: col, width: 2, arrow: true, head: 11 });
          PS.beam(ctx, [q, I], { color: '#f59f00', width: 1.2, dash: [6, 5] });
        });
        PS.drawCandle(ctx, ix, CY + 40, 90, { lit: true, w: 22, fh: 26, alpha: 0.35 });
        D.text(ctx, '虚像', ix, CY + 64, { size: F(13), weight: 800, color: '#7048e8', align: 'center' });
        D.text(ctx, '镜后没有光', DX + 70, 60, { size: F(12), weight: 700, color: '#868e96' });
      } else {
        const L = { x: DX, y: CY, f: M.f, H: 110 };
        const im = L5.image(M.u, M.f);
        [-0.9, -0.35, 0.3, 0.85].forEach((k) => {
          const q0 = { x: DX, y: CY + k * L.H }, d = V.norm(V.sub(q0, P));
          const r = L5.through(P, d, L);
          if (!r) return;
          PS.beam(ctx, L5.clipEnd([P, r.q, O.along(r.q, r.d, 1200)], 0, 0, st.sx, VH), { color: col, width: 1.8, arrow: true, head: 10 });
          if (!M.real) PS.beam(ctx, L5.clipEnd([r.q, O.along(r.q, V.mul(r.d, -1), 1200)], 10, 10, VW, VH - 10), { color: '#f59f00', width: 1.1, dash: [6, 5], alpha: 0.8 });
        });
        L5.draw(ctx, DX, CY, L.H, { type: 'convex', w: 30 });
        L5.axis(ctx, { x0: DX - 1, x1: DX + 1, y: CY, cx: DX, f: M.f, F, color: 'rgba(0,0,0,0)', labels: true });
        const m = im.m;
        if (M.real) {
          D.text(ctx, '像的位置', ix, VH - 14, { size: F(12), weight: 700, color: '#7048e8', align: 'center' });
          ctx.strokeStyle = 'rgba(112,72,232,.5)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(ix, VH - 30); ctx.lineTo(ix, CY + 120); ctx.stroke(); ctx.setLineDash([]);
        } else {
          const I = { x: ix, y: CY - 70 * m };
          ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(ix, CY); ctx.scale(m, m); PS.drawCandle(ctx, 0, 40, 90, { lit: true, w: 22, fh: 26 }); ctx.restore();
          D.text(ctx, '虚像', I.x, 30, { size: F(13), weight: 800, color: '#7048e8', align: 'center' });
        }
      }
      // 光屏
      L5.screen(ctx, st.sx, CY, 120, { stand: 50, label: '光屏（拖动）', fs: F(12) });
      ctx.restore();
    }
    function paintScreen(ctx, w, hh) {
      ctx.save();
      PS.virtual(ctx, w, hh, 300, 400);
      ctx.fillStyle = '#212529'; ctx.fillRect(0, 0, 300, 400);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(30, 30, 240, 340);
      const s = state(), M = MODES[st.mode];
      // 蜡烛的像：局部坐标以主光轴为原点（向上为负），按放大率 k 缩放（k < 0 为倒立）
      const flame = (c, k) => {
        c.save(); c.beginPath(); c.rect(30, 30, 240, 340); c.clip();
        c.translate(150, 200); c.scale(k, k);
        c.fillStyle = 'rgba(173,181,189,.9)'; c.fillRect(-11, -60, 22, 100);
        const g = c.createRadialGradient(0, -68, 1, 0, -74, 20);
        g.addColorStop(0, '#fff9db'); g.addColorStop(0.45, '#ffd43b'); g.addColorStop(1, 'rgba(255,146,43,.25)');
        c.fillStyle = g; c.beginPath(); c.moveTo(0, -100); c.bezierCurveTo(15, -82, 13, -62, 0, -60); c.bezierCurveTo(-13, -62, -15, -82, 0, -100); c.fill();
        c.restore();
      };
      if (s === 'sharp') {
        const k = st.mode === 'pin' ? -(st.sx - DX) / M.u : L5.image(M.u, M.f).m;
        flame(ctx, k * 0.9);
      } else if (s === 'patch') {
        const g = ctx.createRadialGradient(150, 200, 10, 150, 200, 150);
        g.addColorStop(0, 'rgba(255,224,102,.55)'); g.addColorStop(1, 'rgba(255,224,102,0)');
        ctx.fillStyle = g; ctx.fillRect(30, 30, 240, 340);
      }
      ctx.font = PS.font(16, 800); ctx.textAlign = 'center';
      ctx.fillStyle = s === 'sharp' ? '#2b8a3e' : '#495057';
      ctx.fillText(s === 'sharp' ? '清晰的实像' : s === 'patch' ? '模糊的光斑（没有像）' : '没有像', 150, 392);
      ctx.restore();
    }
    upd();
  });

  /* ================= 照相机、投影仪还是放大镜 ================= */
  PS.register('apps-sort', function (el) {
    PS.sortCards(el, [
      ['📱 用手机拍照', 0, '倒立、缩小的实像'],
      ['📹 校园里的监控摄像头', 0, '镜头相当于凸透镜，成倒立、缩小的实像'],
      ['💳 扫码支付 / 刷脸支付', 0, '摄像头成倒立、缩小的实像'],
      ['👁️ 人眼看物体', 0, '晶状体和角膜相当于凸透镜，在视网膜上成倒立、缩小的实像'],
      ['🎬 电影放映机', 1, '胶片上的画面在银幕上成倒立、放大的实像'],
      ['🔬 显微镜的物镜', 1, '物镜相当于投影仪，成倒立、放大的实像'],
      ['🔭 望远镜的物镜', 0, '物镜相当于照相机，成倒立、缩小的实像'],
      ['🔍 显微镜、望远镜的目镜', 2, '目镜相当于放大镜，成正立、放大的虚像'],
      ['👴 爷爷用放大镜看报纸', 2, '报纸在一倍焦距以内，成正立、放大的虚像'],
      ['🐟 从侧面看圆形鱼缸里的金鱼', 2, '鱼缸和水相当于凸透镜，金鱼在焦点以内，看到正立、放大的虚像'],
      ['💧 透过叶子上的水珠看叶脉', 2, '水珠相当于凸透镜，叶脉在焦点以内'],
      ['📊 教室里的投影仪', 1, '倒立、放大的实像'],
    ], ['照相机', '投影仪', '放大镜']);
  });
})();
