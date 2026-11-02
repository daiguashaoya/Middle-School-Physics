/* 第4章第5节：光的色散——三棱镜分解白光（红外线、紫外线）、色光的三原色、物体的颜色（拓展）、看不见的光、红外线还是紫外线。依赖 optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  /* ================= 三棱镜分解白光 ================= */
  // 折射率随波长变化（柯西公式；色散程度作了夸大，便于观察）
  const nGlass = (wl) => 1.56 + 0.02 / Math.pow(wl / 1000, 2);
  // 一般的多边形光线追踪：polys = [{ pts: [...], n(wl) }]
  function tracePolys(p, d, wl, polys, maxLen) {
    const path = [p];
    let inside = null;
    for (let k = 0; k < 10; k++) {
      let best = null;
      polys.forEach((pl, pi) => {
        const P = pl.pts;
        for (let i = 0; i < P.length; i++) {
          const a = P[i], b = P[(i + 1) % P.length];
          const hit = O.raySeg(p, d, a, b);
          if (hit && hit.t > 0.01 && (!best || hit.t < best.t)) best = { t: hit.t, p: hit.p, a, b, pi };
        }
      });
      if (!best) { path.push(O.along(p, d, maxLen)); return { path, d, ok: true }; }
      const e = V.norm(V.sub(best.b, best.a)), nrm = V.perp(e);
      const n1 = inside == null ? 1 : polys[inside].n(wl);
      const leaving = inside === best.pi;
      const n2 = leaving ? 1 : polys[best.pi].n(wl);
      const t = O.refract(d, nrm, n1, n2);
      path.push(best.p);
      if (!t) { d = O.reflect(d, nrm); }
      else { d = t; inside = leaving ? null : best.pi; }
      p = best.p;
    }
    return { path, d, ok: false };
  }
  function tri(cx, cy, s, rot, flip) {
    const r = s / Math.sqrt(3);
    return [0, 1, 2].map((k) => { const a = (flip ? Math.PI / 2 : -Math.PI / 2) + rot + (k * TAU) / 3; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; });
  }
  PS.register('prism', function (el) {
    const VW = 1000, VH = 460, SX = 830;
    const st = { mode: 'white', rot: 0, therm: false, fluo: false, T: [20, 20, 20, 20, 20], t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const mSeg = PS.ui.seg([{ value: 'white', label: '白光通过三棱镜' }, { value: 'merge', label: '再加一块倒置的三棱镜' }, { value: 'mono', label: '只让红光通过第二块三棱镜' }], st.mode, (v) => { st.mode = v; upd(); });
    const rS = PS.ui.slider({ label: '转动三棱镜', min: -12, max: 12, step: 1, value: 0, unit: '°', onInput: (v) => { st.rot = v; upd(); } });
    const tT = PS.ui.toggle('在光屏上放温度计', false, (v) => { st.therm = v; st.T = [20, 20, 20, 20, 20]; upd(); });
    const fT = PS.ui.toggle('在紫光外侧放荧光物质', false, (v) => { st.fluo = v; upd(); });
    const rd = ['红外线区', '红光', '绿光', '紫光', '紫外线区'].map((n) => PS.ui.readout(n, '20.0 ℃'));
    const rdBox = h('div', { class: 'readouts' }, rd.map((r) => r.el));
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(mSeg.el), PS.ui.row(rS.el, tT.el, fT.el), rdBox, msg);
    const WL = []; for (let w = 400; w <= 700; w += 5) WL.push(w); // 含七种色光的代表波长
    const IR = [760, 820, 900], UV = [340, 360, 380];
    function scene() {
      const p1 = { pts: tri(330, 130, 190, st.rot * DEG, false), n: nGlass };
      const polys = [p1];
      if (st.mode === 'merge') polys.push({ pts: tri(470, 165, 190, st.rot * DEG, true).map((q) => ({ x: q.x - 2, y: q.y })), n: nGlass });
      if (st.mode === 'mono') polys.push({ pts: tri(690, 250, 150, 0, false), n: nGlass });
      return polys;
    }
    const SRC = { x: 40, y: 235 }, DIR = V.dir(-23 * DEG);
    function traceAll() {
      const polys = scene();
      const res = {};
      [...WL, ...IR, ...UV].forEach((wl) => {
        const r = tracePolys(SRC, DIR, wl, polys, 1400);
        // 截到光屏 x = SX
        const pts = r.path.slice();
        let hitY = null;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          if ((a.x - SX) * (b.x - SX) <= 0 && Math.abs(b.x - a.x) > 1e-6) { const y = a.y + ((SX - a.x) / (b.x - a.x)) * (b.y - a.y); pts.length = i; pts.push({ x: SX, y }); hitY = y; break; }
        }
        // 只让红光通过：x = 600 处的挡板上开一条缝
        if (st.mode === 'mono') {
          for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            if ((a.x - 600) * (b.x - 600) <= 0 && b.x !== a.x) {
              const y = a.y + ((600 - a.x) / (b.x - a.x)) * (b.y - a.y);
              res.slitY = res.slitY == null ? null : res.slitY;
              if (!(wl >= 640 && wl <= 700)) { pts.length = i; pts.push({ x: 600, y }); hitY = null; }
              break;
            }
          }
        }
        res[wl] = { pts, y: hitY };
      });
      return res;
    }
    let cache = null;
    function upd() {
      cache = traceAll();
      rdBox.style.display = st.therm ? '' : 'none';
      let t;
      if (st.mode === 'white') t = '太阳光（白光）通过三棱镜后，在光屏上形成一条彩色光带，从上到下依次是<b>红、橙、黄、绿、蓝、靛、紫</b>——这种现象叫做<b>光的色散</b>。说明白光是由各种色光混合而成的。不同色光通过三棱镜时偏折程度不同，<b>紫光偏折得最多，红光最少</b>。';
      else if (st.mode === 'merge') t = '再放一块<b>倒置</b>的三棱镜，各种色光又被合在一起，光屏上重新出现了<b>白色</b>光斑——各种色光混合起来就是白光。';
      else t = '用挡板只让<b>红光</b>通过，再射到第二块三棱镜上：红光只是被偏折，<b>不再分解</b>——红光是单色光，不能再分解。';
      if (st.therm) t += '<br>🌡️ 放在红光<b>外侧</b>的温度计示数上升得最快：那里有看不见的光——<b>红外线</b>，它的<b>热效应</b>强。';
      if (st.fluo) t += '<br>✨ 紫光外侧看不到光，但荧光物质却<b>发光</b>了：那里有看不见的光——<b>紫外线</b>，它能使荧光物质发光。';
      msg.innerHTML = t;
      S.render();
    }
    const RATE = [0.55, 0.35, 0.22, 0.12, 0.08]; // 各处温度计每秒升温（示意）
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.therm) {
        let ch = false;
        st.T = st.T.map((T, k) => { const inBand = st.mode === 'white'; const nt = Math.min(20 + 12 * RATE[k] / 0.55, T + (inBand ? RATE[k] : -0.2) * dt); if (Math.abs(nt - T) > 1e-4) ch = true; return Math.max(20, nt); });
        if (ch) rd.forEach((r, k) => r.set(st.T[k].toFixed(1) + ' ℃'));
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      PS.darkRoom(ctx, VW, VH);
      const res = cache || traceAll();
      // 光屏
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(SX, 60, 16, 380);
      D.text(ctx, '光屏', SX + 8, 52, { size: F(13), weight: 700, color: '#ced4da', align: 'center' });
      // 狭缝
      ctx.fillStyle = '#495057'; ctx.fillRect(SRC.x - 10, SRC.y - 60, 8, 50); ctx.fillRect(SRC.x - 10, SRC.y + 10, 8, 50);
      D.text(ctx, '太阳光（白光）', SRC.x - 6, SRC.y + 82, { size: F(13), weight: 700, color: '#ffe066' });
      // 白光入射段
      const first = res[550].pts;
      PS.beam(ctx, [first[0], first[1]], { color: '#fff', width: 4, glow: 'rgba(255,255,255,.25)' });
      // 各色光
      ctx.globalCompositeOperation = 'lighter';
      WL.forEach((wl, k) => {
        const pts = res[wl].pts.slice(1);
        PS.beam(ctx, pts, { color: PS.wlColor(wl, 0.35), width: 2.2 });
        // 扇形填充，使光带连续
        const nx = WL[k + 1];
        if (nx) {
          const a = res[wl].pts, b = res[nx].pts;
          if (a.length === b.length && a.length > 2) {
            const i0 = a.length - 2;
            ctx.fillStyle = PS.wlColor(wl, 0.28);
            ctx.beginPath(); ctx.moveTo(a[i0].x, a[i0].y); ctx.lineTo(a[i0 + 1].x, a[i0 + 1].y); ctx.lineTo(b[i0 + 1].x, b[i0 + 1].y); ctx.lineTo(b[i0].x, b[i0].y); ctx.closePath(); ctx.fill();
          }
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      // 光屏上的光斑
      WL.forEach((wl) => { const y = res[wl].y; if (y != null && y > 60 && y < 440) { ctx.fillStyle = PS.wlColor(wl); ctx.fillRect(SX, y - 4, 16, 8); } });
      // 三棱镜
      scene().forEach((pl) => {
        ctx.fillStyle = 'rgba(165,216,255,.16)'; ctx.strokeStyle = 'rgba(165,216,255,.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); pl.pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      D.text(ctx, '三棱镜', 330, 250, { size: F(13), weight: 700, color: '#a5d8ff', align: 'center' });
      if (st.mode === 'mono') {
        ctx.fillStyle = '#868e96'; const ry = res[680].pts.find((q) => Math.abs(q.x - 600) < 0.01);
        const gy = ry ? ry.y : 300;
        ctx.fillRect(596, 60, 8, gy - 16 - 60); ctx.fillRect(596, gy + 6, 8, 440 - gy - 6);
        D.text(ctx, '开缝的挡板', 600, 52, { size: F(12), weight: 700, color: '#ced4da', align: 'center' });
      }
      // 颜色标注
      if (st.mode === 'white') {
        PS.SPECTRUM7.forEach(([n, wl]) => { const r = res[wl]; if (r && r.y != null) D.text(ctx, n, SX + 28, r.y, { size: F(13), weight: 800, color: PS.wlColor(wl), baseline: 'middle' }); });
        const yIR = res[820].y, yUV = res[360].y;
        if ((st.therm || st.fluo) && yIR != null) {
          ctx.strokeStyle = 'rgba(255,135,135,.7)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
          IR.forEach((wl) => { const p = res[wl].pts; PS.beam(ctx, p.slice(1), { color: 'rgba(255,107,107,.35)', width: 1.4, dash: [5, 5] }); });
          ctx.setLineDash([]);
          D.text(ctx, '红外线（看不见）', SX - 10, yIR - 6, { size: F(12), weight: 800, color: '#ff8787', align: 'right' });
        }
        if ((st.therm || st.fluo) && yUV != null) {
          UV.forEach((wl) => { const p = res[wl].pts; PS.beam(ctx, p.slice(1), { color: 'rgba(177,151,252,.35)', width: 1.4, dash: [5, 5] }); });
          D.text(ctx, '紫外线（看不见）', SX - 10, yUV + 16, { size: F(12), weight: 800, color: '#b197fc', align: 'right' });
        }
        if (st.fluo && yUV != null) {
          const g = ctx.createRadialGradient(SX + 8, yUV, 2, SX + 8, yUV, 26);
          g.addColorStop(0, 'rgba(216,245,162,1)'); g.addColorStop(1, 'rgba(216,245,162,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(SX + 8, yUV, 26, 0, TAU); ctx.fill();
          D.text(ctx, '荧光物质发光', SX + 30, yUV + 20, { size: F(12), weight: 800, color: '#d8f5a2', baseline: 'middle' });
        }
        if (st.therm) {
          const ys = [res[820].y, res[680].y, res[530].y, res[410].y, res[360].y];
          ys.forEach((y, k) => { if (y == null) return; const x = SX + 70 + (k % 2) * 34; ctx.fillStyle = '#e03131'; ctx.fillRect(x - 2, y - 26, 4, 22 + (st.T[k] - 20) * 1.5); ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1; ctx.strokeRect(x - 3, y - 30, 6, 30); ctx.beginPath(); ctx.arc(x, y + 2, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.moveTo(SX + 16, y); ctx.lineTo(x - 6, y); ctx.stroke(); });
        }
      } else if (st.mode === 'merge') {
        const y = res[550].y; if (y != null) { ctx.fillStyle = '#fff'; ctx.fillRect(SX, y - 6, 16, 12); D.text(ctx, '白光', SX - 10, y - 14, { size: F(13), weight: 800, color: '#fff', align: 'right' }); }
      } else {
        const y = res[670].y; if (y != null) D.text(ctx, '只有红光', SX - 10, y - 14, { size: F(13), weight: 800, color: '#ff6b6b', align: 'right' });
      }
      D.text(ctx, '示意图：色散程度作了夸大', 20, 24, { size: F(12), weight: 600, color: '#868e96' });
      ctx.restore();
    }
    upd(); loop.start();
  });

  /* ================= 色光的三原色 ================= */
  PS.register('color-mix', function (el) {
    const VW = 1000, VH = 440;
    const st = { mode: 'lights', L: [{ x: 430, y: 180, k: 1 }, { x: 570, y: 180, k: 1 }, { x: 500, y: 300, k: 1 }], mag: { x: 520, y: 230 } };
    const COL = [[255, 0, 0], [0, 255, 0], [0, 0, 255]], NAME = ['红', '绿', '蓝'];
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'lights', label: '三束色光混合' }, { value: 'screen', label: '用放大镜看彩色屏幕' }], st.mode, (v) => { st.mode = v; upd(); });
    const sl = [0, 1, 2].map((i) => PS.ui.slider({ label: NAME[i] + '光强度', min: 0, max: 100, step: 1, value: 100, unit: '%', onInput: (v) => { st.L[i].k = v / 100; upd(); } }));
    const rowS = PS.ui.row(...sl.map((s) => s.el));
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), rowS, msg);
    // 一张低分辨率的“图片”（程序画出），用来演示屏幕像素
    const IW = 48, IH = 28, img = document.createElement('canvas'); img.width = IW; img.height = IH;
    (function () {
      const g = img.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, IH); sky.addColorStop(0, '#4dabf7'); sky.addColorStop(1, '#d0ebff');
      g.fillStyle = sky; g.fillRect(0, 0, IW, IH);
      g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(38, 7, 5, 0, TAU); g.fill();
      g.fillStyle = '#40c057'; g.fillRect(0, 19, IW, 9);
      g.fillStyle = '#e03131'; g.beginPath(); g.arc(12, 17, 4, 0, TAU); g.fill();
      g.fillStyle = '#ae3ec9'; g.beginPath(); g.arc(22, 20, 3, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.fillRect(28, 15, 8, 6); g.fillStyle = '#c92a2a'; g.fillRect(27, 12, 10, 3);
    })();
    const px = img.getContext('2d').getImageData(0, 0, IW, IH).data;
    const IX = 150, IY = 40, CS = 12; // 图片在画布上的位置、每个像素的大小
    PS.drag(S, {
      VW, VH,
      hit: (p) => {
        if (st.mode === 'screen') return 'mag';
        for (let i = 2; i >= 0; i--) if (V.dist(p, st.L[i]) < 60) return i;
        return null;
      },
      move: (k, p) => { if (k === 'mag') st.mag = { x: PS.clamp(p.x, IX, IX + IW * CS), y: PS.clamp(p.y, IY, IY + IH * CS) }; else st.L[k] = Object.assign(st.L[k], { x: PS.clamp(p.x, 100, 900), y: PS.clamp(p.y, 80, 360) }); S.render(); },
    });
    function upd() {
      rowS.style.display = st.mode === 'lights' ? '' : 'none';
      msg.innerHTML = st.mode === 'lights'
        ? '<b>红、绿、蓝</b>三种色光按不同比例混合，能产生各种颜色的光，所以把它们叫做<b>色光的三原色</b>。红 + 绿 = 黄，绿 + 蓝 = 青，红 + 蓝 = 品红，红 + 绿 + 蓝 = <b>白</b>。拖动光斑，或调节每种色光的强度试试。'
        : '彩色电视机、手机屏幕上丰富的色彩，都是由<b>红、绿、蓝</b>三种色光混合而成的。拖动放大镜，看看每个小点（像素）是由什么组成的。';
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'lights') {
        ctx.globalCompositeOperation = 'lighter';
        st.L.forEach((L, i) => {
          const c = COL[i].map((v) => Math.round(v * L.k));
          const g = ctx.createRadialGradient(L.x, L.y, 90, L.x, L.y, 130);
          g.addColorStop(0, 'rgb(' + c + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L.x, L.y, 130, 0, TAU); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
        st.L.forEach((L, i) => D.text(ctx, NAME[i] + '光', L.x + (L.x - 500) * 0.55, L.y + (L.y - 220) * 0.6, { size: F(15), weight: 800, color: '#fff', align: 'center', baseline: 'middle', bg: 'rgba(0,0,0,.45)' }));
        D.text(ctx, '拖动光斑', 20, 28, { size: F(13), weight: 600, color: '#868e96' });
      } else {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, IX, IY, IW * CS, IH * CS);
        // 放大镜：每个像素画成红、绿、蓝三条
        const R = 100, M = st.mag, Z = 5;
        ctx.save();
        ctx.beginPath(); ctx.arc(M.x, M.y, R, 0, TAU); ctx.clip();
        ctx.fillStyle = '#000'; ctx.fillRect(M.x - R, M.y - R, 2 * R, 2 * R);
        const cx = (M.x - IX) / CS, cy = (M.y - IY) / CS, cell = CS * Z;
        for (let j = Math.floor(cy - R / cell) - 1; j <= cy + R / cell + 1; j++) for (let i = Math.floor(cx - R / cell) - 1; i <= cx + R / cell + 1; i++) {
          if (i < 0 || j < 0 || i >= IW || j >= IH) continue;
          const o = (j * IW + i) * 4, X = M.x + (i - cx) * cell, Y = M.y + (j - cy) * cell;
          [0, 1, 2].forEach((c) => { const v = px[o + c]; ctx.fillStyle = 'rgb(' + (c === 0 ? v : 0) + ',' + (c === 1 ? v : 0) + ',' + (c === 2 ? v : 0) + ')'; ctx.fillRect(X + c * (cell / 3) + 1, Y + 2, cell / 3 - 2, cell - 4); });
        }
        ctx.restore();
        ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(M.x, M.y, R, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(M.x + R * 0.72, M.y + R * 0.72); ctx.lineTo(M.x + R * 1.25, M.y + R * 1.25); ctx.stroke();
        D.text(ctx, '彩色屏幕（拖动放大镜）', IX, IY + IH * CS + 26, { size: F(13), weight: 700, color: '#ced4da' });
      }
      ctx.restore();
    }
    upd();
  });

  /* ================= 物体的颜色（拓展） ================= */
  const LIGHTS = { white: { name: '白光', c: [1, 1, 1] }, red: { name: '红光', c: [1, 0, 0] }, green: { name: '绿光', c: [0, 1, 0] }, blue: { name: '蓝光', c: [0, 0, 1] } };
  const OBJS = [
    { name: '白纸', c: [1, 1, 1] }, { name: '红苹果', c: [0.9, 0.06, 0.06] }, { name: '绿叶', c: [0.08, 0.75, 0.1] }, { name: '蓝布', c: [0.06, 0.1, 0.9] }, { name: '黑布', c: [0.04, 0.04, 0.04] },
  ];
  const FILT = { none: { name: '不放', c: [1, 1, 1] }, red: { name: '红色玻璃', c: [1, 0, 0] }, green: { name: '绿色玻璃', c: [0, 1, 0] }, blue: { name: '蓝色玻璃', c: [0, 0, 1] } };
  PS.register('object-color', function (el) {
    const VW = 1000, VH = 380;
    const st = { mode: 'opaque', light: 'white', f1: 'red', f2: 'none' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const mSeg = PS.ui.seg([{ value: 'opaque', label: '不透明物体' }, { value: 'trans', label: '透明物体（彩色玻璃）' }], st.mode, (v) => { st.mode = v; upd(); });
    const lSeg = PS.ui.seg(Object.keys(LIGHTS).map((k) => ({ value: k, label: '用' + LIGHTS[k].name + '照射' })), st.light, (v) => { st.light = v; upd(); });
    const f1 = PS.ui.seg(Object.keys(FILT).filter((k) => k !== 'none').map((k) => ({ value: k, label: FILT[k].name })), st.f1, (v) => { st.f1 = v; upd(); });
    const f2 = PS.ui.seg(Object.keys(FILT).map((k) => ({ value: k, label: '再放' + FILT[k].name.replace('不放', '：不放') })), st.f2, (v) => { st.f2 = v; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    const r1 = PS.ui.row(lSeg.el), r2 = PS.ui.row(h('span', null, '第一块：'), f1.el), r3 = PS.ui.row(h('span', null, '第二块：'), f2.el);
    el.append(PS.ui.row(mSeg.el), r1, r2, r3, msg);
    const mul = (a, b) => a.map((v, i) => v * b[i]);
    const css = (c) => 'rgb(' + c.map((v) => Math.round(255 * Math.pow(PS.clamp(v, 0, 1), 0.85))).join(',') + ')';
    function upd() {
      r1.style.display = st.mode === 'opaque' ? '' : 'none';
      r2.style.display = r3.style.display = st.mode === 'trans' ? '' : 'none';
      if (st.mode === 'opaque') {
        const L = LIGHTS[st.light];
        msg.innerHTML = '<b>不透明物体的颜色是由它反射的色光决定的</b>：红苹果主要反射红光，吸收其他色光；白纸反射所有色光；黑布几乎吸收所有色光。' + (st.light === 'white' ? '' : '<br>用' + L.name + '照射时，只有能反射' + L.name + '的物体才显出' + L.name.replace('光', '') + '色，其他物体看起来是<b>黑</b>色的（没有光反射进入眼睛）。');
      } else {
        const out = mul(FILT[st.f1].c, FILT[st.f2].c), dark = out.every((v) => v < 0.01);
        msg.innerHTML = '<b>透明物体的颜色是由它透过的色光决定的</b>：红色玻璃只让红光通过，其他色光被吸收。' + (dark ? '<br>两块不同颜色的玻璃叠在一起，第一块透过的色光被第二块吸收了，光屏上一片<b>黑</b>。' : '');
      }
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'opaque') {
        const L = LIGHTS[st.light].c;
        const g = ctx.createRadialGradient(500, 0, 50, 500, 0, 520); g.addColorStop(0, 'rgba(' + L.map((v) => v * 255) + ',.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        OBJS.forEach((o, i) => {
          const x = 120 + i * 190, y = 220, c = css(mul(L, o.c));
          ctx.fillStyle = c;
          if (o.name === '红苹果') { ctx.beginPath(); ctx.arc(x, y, 52, 0, TAU); ctx.fill(); ctx.fillStyle = css(mul(L, [0.1, 0.6, 0.1])); ctx.beginPath(); ctx.ellipse(x + 14, y - 58, 16, 7, -0.5, 0, TAU); ctx.fill(); }
          else if (o.name === '绿叶') { ctx.beginPath(); ctx.ellipse(x, y, 34, 62, 0.5, 0, TAU); ctx.fill(); }
          else { ctx.fillRect(x - 60, y - 55, 120, 110); if (o.name === '白纸') { ctx.fillStyle = css(mul(L, [0.9, 0.05, 0.05])); ctx.font = PS.font(F(30), 900); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('红字', x, y); } }
          D.text(ctx, o.name, x, 330, { size: F(14), weight: 700, color: '#adb5bd', align: 'center' });
        });
        D.text(ctx, '暗室中，用' + LIGHTS[st.light].name + '照射', 20, 30, { size: F(14), weight: 700, color: '#dee2e6' });
      } else {
        const c1 = FILT[st.f1].c, c2 = mul(c1, FILT[st.f2].c);
        PS.beam(ctx, [{ x: 60, y: 190 }, { x: 330, y: 190 }], { color: '#fff', width: 10, glow: 'rgba(255,255,255,.2)' });
        const draw = (x, c, nm) => { ctx.fillStyle = 'rgba(' + c.map((v) => v * 255) + ',.55)'; ctx.fillRect(x - 10, 110, 20, 160); ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; ctx.strokeRect(x - 10, 110, 20, 160); D.text(ctx, nm, x, 296, { size: F(13), weight: 700, color: '#ced4da', align: 'center' }); };
        draw(340, FILT[st.f1].c, FILT[st.f1].name);
        if (c1.some((v) => v > 0)) PS.beam(ctx, [{ x: 350, y: 190 }, { x: 590, y: 190 }], { color: css(c1), width: 10, glow: true });
        if (st.f2 !== 'none') draw(600, FILT[st.f2].c, FILT[st.f2].name);
        if (c2.some((v) => v > 0)) PS.beam(ctx, [{ x: st.f2 !== 'none' ? 610 : 590, y: 190 }, { x: 880, y: 190 }], { color: css(c2), width: 10, glow: true });
        ctx.fillStyle = '#f1f3f5'; ctx.fillRect(880, 80, 30, 220);
        ctx.fillStyle = c2.some((v) => v > 0) ? css(c2) : '#212529'; ctx.beginPath(); ctx.ellipse(895, 190, 12, 30, 0, 0, TAU); ctx.fill();
        D.text(ctx, '白光', 60, 160, { size: F(14), weight: 800, color: '#fff' });
        D.text(ctx, '光屏', 895, 70, { size: F(13), weight: 700, color: '#ced4da', align: 'center' });
      }
      ctx.restore();
    }
    upd();
  });

  /* ================= 看不见的光：红外线和紫外线的应用 ================= */
  const INV = {
    thermo: { g: 'ir', name: '热谱图', btn: '切换成红外热谱图' },
    night: { g: 'ir', name: '夜视仪', btn: '打开红外线夜视仪' },
    remote: { g: 'ir', name: '遥控器', btn: '用手机摄像头看遥控器' },
    ticket: { g: 'uv', name: '验钞 / 防伪', btn: '打开紫外线灯' },
    germ: { g: 'uv', name: '紫外线消毒', btn: '打开紫外线消毒灯' },
    sun: { g: 'uv', name: '晒太阳', btn: '涂防晒霜、打遮阳伞' },
  };
  const INV_TEXT = {
    thermo: '物体的<b>温度越高</b>，辐射的红外线<b>越强</b>。用对红外线敏感的相机给人拍照得到<b>热谱图</b>，体温异常的部位（如发炎处）颜色不同，可以帮助诊断疾病。',
    night: '夜间人和动物的体温比周围的草木、岩石高，辐射的红外线强。<b>红外线夜视仪</b>接收这些红外线，在漆黑的夜里也能“看见”人和动物。',
    remote: '电视机遥控器发出的是<b>红外线</b>，人眼看不见，但手机摄像头能“看见”：按下按钮时，遥控器前端在手机屏幕上一闪一闪地发光。红外线还用于<b>红外线烤箱、取暖器</b>（热效应强）。',
    ticket: '紫外线能使<b>荧光物质发光</b>。钞票、证件和一些商品上用荧光物质印有标记，在紫外线照射下会发出可见光——这是一种有效的<b>防伪</b>措施，验钞机就是利用这个原理。',
    germ: '紫外线能<b>杀死微生物</b>。医院、食品店常用紫外线灯消毒；衣服、被子经常在阳光下晾晒，也能杀菌。注意：紫外线灯工作时人要离开，不能直视。',
    sun: '适当的紫外线照射有助于人体合成<b>维生素 D</b>，促进身体对钙的吸收。但<b>过量</b>的紫外线照射对人体十分有害，轻则使皮肤粗糙，重则引起皮肤癌。外出时可以涂防晒霜、打遮阳伞。地球周围的<b>臭氧层</b>能吸收大部分来自太阳的紫外线。',
  };
  PS.register('invisible-light', function (el) {
    const VW = 1000, VH = 400;
    const st = { k: 'thermo', on: false, sick: true, t: 0, press: 0, germs: [] };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg(Object.keys(INV).map((k) => ({ value: k, label: (INV[k].g === 'ir' ? '红外线 · ' : '紫外线 · ') + INV[k].name })), st.k, (v) => { st.k = v; st.on = false; reset(); });
    const onB = PS.ui.button('', () => { st.on = !st.on; upd(); }, 'btn btn-primary btn-sm');
    const pB = PS.ui.button('按遥控器按钮', () => { st.press = 1.2; }, 'btn btn-sm');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), PS.ui.row(onB, pB), msg);
    function reset() { st.germs = []; for (let i = 0; i < 40; i++) st.germs.push({ x: PS.rand(560, 940), y: PS.rand(250, 370), a: 1, p: Math.random() * TAU }); upd(); }
    function upd() {
      const m = INV[st.k];
      onB.innerHTML = st.on ? '↩ 还原' : m.btn;
      pB.style.display = st.k === 'remote' ? '' : 'none';
      msg.innerHTML = INV_TEXT[st.k];
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.t += dt; st.press = Math.max(0, st.press - dt);
      if (st.k === 'germ' && st.on) st.germs.forEach((g) => { g.a = Math.max(0, g.a - dt * PS.rand(0.1, 0.5)); });
      S.render();
    }, S.stage);
    // 热谱图配色：温度 0~1 → 颜色
    const heat = (v) => { const stops = [[0, [20, 10, 60]], [0.3, [110, 20, 140]], [0.55, [220, 40, 40]], [0.75, [250, 150, 20]], [0.9, [255, 230, 80]], [1, [255, 255, 240]]]; for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const t = (v - a) / (b - a); return 'rgb(' + ca.map((x, j) => Math.round(x + (cb[j] - x) * t)) + ')'; } return 'rgb(255,255,240)'; };
    function person(ctx, x, y, s, fill) {
      ctx.fillStyle = fill('body'); D.roundRect(ctx, x - 40 * s, y - 120 * s, 80 * s, 130 * s, 22 * s); ctx.fill();
      ctx.fillStyle = fill('arm'); D.roundRect(ctx, x - 62 * s, y - 110 * s, 20 * s, 100 * s, 10 * s); ctx.fill(); D.roundRect(ctx, x + 42 * s, y - 110 * s, 20 * s, 100 * s, 10 * s); ctx.fill();
      ctx.fillStyle = fill('leg'); ctx.fillRect(x - 32 * s, y + 8 * s, 26 * s, 110 * s); ctx.fillRect(x + 6 * s, y + 8 * s, 26 * s, 110 * s);
      ctx.fillStyle = fill('head'); ctx.beginPath(); ctx.arc(x, y - 155 * s, 34 * s, 0, TAU); ctx.fill();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const k = st.k;
      if (k === 'thermo') {
        if (!st.on) {
          ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 0, VW, VH);
          person(ctx, 500, 240, 1, (p) => ({ body: '#4263eb', arm: '#ffd8a8', leg: '#343a40', head: '#ffd8a8' }[p]));
          D.text(ctx, '普通照片（可见光）', 20, 30, { size: F(14), weight: 700, color: '#495057' });
        } else {
          ctx.fillStyle = heat(0.12); ctx.fillRect(0, 0, VW, VH);
          person(ctx, 500, 240, 1, (p) => heat({ body: 0.62, arm: 0.72, leg: 0.55, head: 0.82 }[p]));
          // 发炎的膝盖（体温异常处）
          const g = ctx.createRadialGradient(474, 300, 2, 474, 300, 30); g.addColorStop(0, heat(1)); g.addColorStop(1, 'rgba(255,255,240,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(474, 300, 30, 0, TAU); ctx.fill();
          D.text(ctx, '温度异常（发炎）', 430, 300, { size: F(13), weight: 800, color: '#fff', align: 'right', baseline: 'middle' });
          for (let i = 0; i <= 20; i++) { ctx.fillStyle = heat(i / 20); ctx.fillRect(900, 340 - i * 12, 30, 12); }
          D.text(ctx, '高温', 940, 100, { size: F(12), weight: 700, color: '#fff' }); D.text(ctx, '低温', 940, 340, { size: F(12), weight: 700, color: '#fff' });
          D.text(ctx, '红外热谱图', 20, 30, { size: F(14), weight: 700, color: '#fff' });
        }
      } else if (k === 'night') {
        if (!st.on) {
          ctx.fillStyle = '#05070b'; ctx.fillRect(0, 0, VW, VH);
          for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect((i * 173) % VW, (i * 37) % 160, 1.5, 1.5); }
          D.text(ctx, '漆黑的夜晚，什么也看不见', 500, 200, { size: F(18), weight: 800, color: '#343a40', align: 'center' });
        } else {
          ctx.fillStyle = heat(0.1); ctx.fillRect(0, 0, VW, VH);
          ctx.fillStyle = heat(0.22); ctx.fillRect(0, 320, VW, 80);
          [[150, 1.1], [820, 0.9]].forEach(([x, s]) => { ctx.fillStyle = heat(0.25); ctx.fillRect(x - 10, 320 - 160 * s, 20, 160 * s); ctx.beginPath(); ctx.arc(x, 320 - 180 * s, 70 * s, 0, TAU); ctx.fill(); });
          ctx.fillStyle = heat(0.18); ctx.beginPath(); ctx.ellipse(650, 330, 70, 30, 0, Math.PI, 0); ctx.fill();
          person(ctx, 420, 300, 0.75, (p) => heat({ body: 0.75, arm: 0.8, leg: 0.68, head: 0.9 }[p]));
          // 小鹿
          ctx.fillStyle = heat(0.8); ctx.beginPath(); ctx.ellipse(590, 270, 50, 22, 0, 0, TAU); ctx.fill(); ctx.fillRect(556, 280, 8, 42); ctx.fillRect(572, 282, 8, 40); ctx.fillRect(606, 282, 8, 40); ctx.fillRect(620, 280, 8, 42);
          ctx.beginPath(); ctx.moveTo(622, 262); ctx.lineTo(642, 222); ctx.lineTo(654, 228); ctx.lineTo(640, 270); ctx.fill(); ctx.beginPath(); ctx.ellipse(652, 220, 15, 9, 0.4, 0, TAU); ctx.fill();
          ctx.strokeStyle = heat(0.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(646, 210); ctx.lineTo(636, 186); ctx.lineTo(626, 178); ctx.moveTo(636, 186); ctx.lineTo(644, 176); ctx.stroke(); // 小鹿
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(500, 220, 160, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(340, 220); ctx.lineTo(660, 220); ctx.moveTo(500, 60); ctx.lineTo(500, 380); ctx.stroke();
          D.text(ctx, '红外线夜视仪中看到的景象', 20, 30, { size: F(14), weight: 700, color: '#fff' });
        }
      } else if (k === 'remote') {
        ctx.fillStyle = '#f1f3f5'; ctx.fillRect(0, 0, VW, VH);
        // 遥控器
        ctx.fillStyle = '#343a40'; D.roundRect(ctx, 200, 140, 300, 110, 30); ctx.fill();
        for (let i = 0; i < 6; i++) { ctx.fillStyle = i === 0 ? '#e03131' : '#868e96'; ctx.beginPath(); ctx.arc(260 + (i % 3) * 60, 175 + Math.floor(i / 3) * 45, 14, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(505, 195, 12, 0, TAU); ctx.fill();
        const flash = st.press > 0 && Math.sin(st.t * 40) > 0;
        if (st.on) {
          // 手机屏幕
          ctx.fillStyle = '#212529'; D.roundRect(ctx, 600, 60, 300, 280, 26); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.rect(616, 80, 268, 240); ctx.clip();
          ctx.fillStyle = '#ced4da'; ctx.fillRect(616, 80, 268, 240);
          ctx.fillStyle = '#343a40'; D.roundRect(ctx, 560, 150, 230, 90, 24); ctx.fill();
          if (flash) { const g = ctx.createRadialGradient(790, 195, 2, 790, 195, 40); g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#d0bfff'); g.addColorStop(1, 'rgba(208,191,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(790, 195, 40, 0, TAU); ctx.fill(); }
          ctx.restore();
          D.text(ctx, '手机摄像头拍到的画面', 750, 360, { size: F(13), weight: 700, color: '#495057', align: 'center' });
        }
        D.text(ctx, flash && !st.on ? '（眼睛看不到任何光）' : '', 350, 290, { size: F(14), weight: 700, color: '#868e96', align: 'center' });
        if (st.press > 0) { ctx.strokeStyle = 'rgba(224,49,49,.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; for (let r = 30; r < 120; r += 30) { ctx.beginPath(); ctx.arc(505, 195, r + ((st.t * 120) % 30), -0.6, 0.6); ctx.stroke(); } ctx.setLineDash([]); D.text(ctx, '红外线（看不见，示意）', 540, 120, { size: F(12), weight: 700, color: '#e03131' }); }
      } else if (k === 'ticket') {
        ctx.fillStyle = st.on ? '#140b2e' : '#e9ecef'; ctx.fillRect(0, 0, VW, VH);
        // 一张示意的门票
        ctx.fillStyle = st.on ? '#2b2050' : '#fff3bf'; D.roundRect(ctx, 220, 90, 560, 230, 18); ctx.fill();
        ctx.strokeStyle = st.on ? '#5f3dc4' : '#f08c00'; ctx.lineWidth = 3; ctx.stroke();
        D.text(ctx, '科技馆参观券', 260, 140, { size: F(26), weight: 900, color: st.on ? '#6741d9' : '#e8590c' });
        D.text(ctx, 'No. 2026 0815', 260, 180, { size: F(16), weight: 700, color: st.on ? '#5f3dc4' : '#868e96' });
        if (st.on) {
          ctx.save(); ctx.shadowColor = '#d8f5a2'; ctx.shadowBlur = 16;
          ctx.strokeStyle = '#d8f5a2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(660, 210, 60, 0, TAU); ctx.stroke();
          D.text(ctx, '真', 660, 212, { size: F(52), weight: 900, color: '#e9fac8', align: 'center', baseline: 'middle' });
          for (let i = 0; i < 12; i++) { ctx.fillStyle = 'rgba(216,245,162,.8)'; ctx.fillRect(260 + i * 30, 270, 16, 6); }
          ctx.restore();
          const g = ctx.createLinearGradient(0, 0, 0, 60); g.addColorStop(0, 'rgba(132,94,247,.8)'); g.addColorStop(1, 'rgba(132,94,247,0)');
          ctx.fillStyle = '#7048e8'; ctx.fillRect(380, 10, 240, 18); ctx.fillStyle = g; ctx.fillRect(300, 28, 400, 60);
          D.text(ctx, '紫外线灯', 500, 46, { size: F(13), weight: 700, color: '#e5dbff', align: 'center' });
        } else D.text(ctx, '（荧光标记在可见光下看不出来）', 500, 360, { size: F(14), weight: 700, color: '#868e96', align: 'center' });
      } else if (k === 'germ') {
        ctx.fillStyle = st.on ? '#1d1240' : '#f1f3f5'; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = st.on ? '#9775fa' : '#adb5bd'; ctx.fillRect(320, 40, 360, 22);
        if (st.on) { const g = ctx.createLinearGradient(0, 60, 0, 380); g.addColorStop(0, 'rgba(151,117,250,.55)'); g.addColorStop(1, 'rgba(151,117,250,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(320, 62); ctx.lineTo(680, 62); ctx.lineTo(960, 380); ctx.lineTo(40, 380); ctx.closePath(); ctx.fill(); }
        D.text(ctx, '紫外线消毒灯', 500, 30, { size: F(13), weight: 700, color: st.on ? '#e5dbff' : '#495057', align: 'center' });
        ctx.fillStyle = st.on ? '#3b2f66' : '#ced4da'; ctx.fillRect(520, 370, 440, 10);
        st.germs.forEach((g) => { if (g.a <= 0) return; ctx.globalAlpha = g.a; ctx.fillStyle = '#2f9e44'; ctx.beginPath(); ctx.arc(g.x + Math.sin(st.t * 2 + g.p) * 3, g.y, 7, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; });
        const alive = st.germs.filter((g) => g.a > 0.05).length;
        D.text(ctx, '桌面上的细菌：' + alive + ' 个（示意）', 740, 230, { size: F(15), weight: 800, color: st.on ? '#fff' : '#2b8a3e', align: 'center' });
        D.text(ctx, '⚠️ 紫外线灯工作时，人要离开房间', 200, 330, { size: F(14), weight: 800, color: st.on ? '#ffe066' : '#868e96', align: 'center' });
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#e7f5ff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(110, 80, 50, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffe8cc'; ctx.fillRect(0, 340, VW, 60);
        person(ctx, 600, 230, 0.8, (p) => ({ body: '#f76707', arm: '#ffc078', leg: '#1971c2', head: '#ffc078' }[p]));
        // 紫外线
        for (let i = 0; i < 6; i++) {
          const a = { x: 160 + i * 20, y: 100 + i * 8 }, b = { x: 560 + i * 18, y: 120 + i * 30 };
          const blocked = st.on;
          const end = blocked ? V.lerp(a, b, 0.82) : b;
          PS.beam(ctx, [a, end], { color: '#7048e8', width: 2, dash: [8, 6], arrow: 'end' });
        }
        if (st.on) { ctx.fillStyle = '#e64980'; ctx.beginPath(); ctx.ellipse(600, 70, 110, 34, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#495057'; ctx.fillRect(598, 70, 4, 90); }
        D.text(ctx, '紫外线（看不见，示意）', 300, 70, { size: F(13), weight: 800, color: '#5f3dc4' });
        D.text(ctx, st.on ? '涂防晒霜、打遮阳伞，减少紫外线照射' : '适当晒太阳：合成维生素 D；过量：晒伤皮肤', 600, 380, { size: F(15), weight: 800, color: '#1b2333', align: 'center' });
      }
      ctx.restore();
    }
    reset(); loop.start();
  });

  /* ================= 红外线还是紫外线 ================= */
  const IRUV = [
    ['电视机遥控器', 0, '遥控器发出红外线。'], ['红外线夜视仪', 0, '体温高的物体辐射的红外线强。'], ['医院用热谱图诊断疾病', 0, '体温异常的部位辐射的红外线不同。'], ['烤箱、取暖器加热食物和人体', 0, '红外线的热效应强。'], ['额温枪（测温枪）测体温', 0, '接收人体辐射的红外线来测温。'], ['商场的自动门、感应水龙头', 0, '利用人体辐射的红外线（红外感应）。'],
    ['验钞机辨别钞票真伪', 1, '紫外线能使荧光物质发光。'], ['医院、食品店用灯消毒', 1, '紫外线能杀死微生物。'], ['把被子拿到阳光下晾晒杀菌', 1, '阳光中的紫外线能杀菌。'], ['适当晒太阳有助于合成维生素 D', 1, '紫外线能促进维生素 D 的合成。'], ['过量照射会使皮肤晒伤', 1, '过量的紫外线对人体有害。'], ['臭氧层保护地球上的生物', 1, '臭氧层吸收了大部分来自太阳的紫外线。'],
  ];
  PS.register('ir-uv-sort', function (el) { PS.sortCards(el, IRUV, ['红外线', '紫外线']); });
})();
