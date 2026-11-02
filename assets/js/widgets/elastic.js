/* 第7章第2节：弹力——弹性和塑性、弹力的产生、探究弹簧的伸长量与拉力的关系、认识和使用弹簧测力计、读数练习。依赖 force.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC;
  const TAU = Math.PI * 2;

  /* ================= 弹性和塑性 ================= */
  const EP = {
    ruler: { name: '塑料尺', elastic: true, how: '按下尺子的一端', ok: '尺子弹回原来的样子，还上下振动了几下' },
    band: { name: '橡皮筋', elastic: true, how: '拉长橡皮筋', ok: '橡皮筋缩回原来的长度' },
    spring: { name: '弹簧', elastic: true, how: '拉长弹簧', ok: '弹簧恢复原长', limit: true },
    balloon: { name: '气球', elastic: true, how: '用手压气球', ok: '气球恢复原来的形状' },
    clay: { name: '橡皮泥', elastic: false, how: '用手压橡皮泥', bad: '橡皮泥被压扁后保持扁的形状' },
    wire: { name: '细铝丝', elastic: false, how: '把铝丝弯折', bad: '铝丝弯折后保持弯折的形状' },
  };
  PS.register('elastic-plastic', function (el) {
    const VW = 1000, VH = 340;
    const st = { k: 'ruler', d: 0, v: 0, hold: false, set: 0, tried: {}, released: false, broken: false };
    const seg = PS.ui.seg(Object.keys(EP).map((k) => ({ value: k, label: EP[k].name })), st.k, (v) => { st.k = v; reset(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const auto = PS.ui.button('演示：用力 → 松手', () => { st.hold = true; st.released = false; st.autoT = 0; }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    const sum = h('div', { class: 'small', style: { marginTop: '6px' } });
    el.append(PS.ui.row(auto, PS.ui.button('↺ 换一个新的', reset, 'btn btn-ghost btn-sm')), msg, sum);
    function reset() { st.d = 0; st.v = 0; st.set = 0; st.hold = false; st.released = false; st.broken = false; st.autoT = null; tell(); S.render(); }
    function tell() {
      const E = EP[st.k];
      if (!st.released) { msg.className = 'fc-msg'; msg.innerHTML = '在画面上<b>按住并拖动</b>（' + E.how + '），再松手，看它能不能恢复原来的形状。' + (E.limit ? '<br>试试把弹簧拉得特别长……' : ''); return; }
      st.tried[st.k] = true;
      if (st.broken) { msg.className = 'fc-msg bad'; msg.innerHTML = '弹簧被拉得太长，<b>超过了它的弹性限度</b>，松手后不能完全恢复原长——弹簧被损坏了。所以使用弹簧时不能“拼命”拉。'; }
      else if (E.elastic) { msg.className = 'fc-msg ok'; msg.innerHTML = '松手后，' + E.ok + '——<b>能恢复原状</b>。物体受力时发生形变，不受力时又恢复到原来的形状，这种特性叫做<b>弹性</b>。'; }
      else { msg.className = 'fc-msg bad'; msg.innerHTML = '松手后，' + E.bad + '——<b>不能恢复原状</b>。物体形变后不能自动恢复原来的形状，这种特性叫做<b>塑性</b>。'; }
      const el2 = Object.keys(st.tried).filter((k) => EP[k].elastic).map((k) => EP[k].name), pl = Object.keys(st.tried).filter((k) => !EP[k].elastic).map((k) => EP[k].name);
      sum.innerHTML = '有弹性：<b style="color:#2b8a3e">' + (el2.join('、') || '—') + '</b>　　有塑性：<b style="color:#e03131">' + (pl.join('、') || '—') + '</b>';
    }
    let y0 = 0;
    PS.drag(S, { VW, VH, hit: () => 'h', start: (o, p) => { y0 = st.k === 'spring' || st.k === 'band' ? p.x : p.y; st.hold = true; st.released = false; st.autoT = null; st.base = st.d; },
      move: (o, p) => { const dd = ((st.k === 'spring' ? p.x : st.k === 'band' ? p.x : p.y) - y0) / 220; st.d = PS.clamp(st.base + Math.abs(dd), 0, st.k === 'spring' ? 1.6 : 1); },
      end: () => { release(); } });
    function release() {
      if (!st.hold) return;
      st.hold = false; st.released = true;
      const E = EP[st.k];
      if (E.limit && st.d > 1.05) { st.broken = true; st.set = (st.d - 1.05) * 0.8 + 0.12; }
      if (!E.elastic) st.set = st.d * 0.92;
      PS.sound.tick();
      tell();
    }
    const loop = PS.loop((dt) => {
      if (st.autoT != null) {
        st.autoT += dt;
        if (st.autoT < 0.8) st.d = Math.min(EP[st.k].limit ? 0.8 : 0.85, st.autoT * 1.2);
        else if (st.hold) release();
      }
      if (!st.hold) { // 恢复：弹性物体按阻尼振动回到 set
        const E = EP[st.k];
        if (E.elastic) { const a = -90 * (st.d - st.set) - 5 * st.v; st.v += a * dt; st.d += st.v * dt; if (st.k !== 'ruler' && st.d < st.set) { st.d = st.set; st.v = 0; } }
        else { st.d += (st.set - st.d) * Math.min(1, dt * 8); }
      } else st.v = 0;
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const d = st.d, k = st.k;
      if (k === 'ruler') {
        // 桌边 + 被压住的尺子
        ctx.fillStyle = '#c98d3e'; ctx.fillRect(80, 180, 340, 30); ctx.fillStyle = '#a87b3c'; ctx.fillRect(100, 210, 22, 120);
        const L = 520, x0 = 300, y = 172;
        ctx.save();
        ctx.fillStyle = 'rgba(255,236,170,.95)'; ctx.strokeStyle = 'rgba(120,90,20,.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        const N = 40, yy = (s) => y + d * 140 * Math.pow(s, 2) * 1;
        ctx.moveTo(150, y - 8);
        for (let i = 0; i <= N; i++) { const s = i / N, x = x0 + s * L; ctx.lineTo(x, yy(s) - 8); }
        for (let i = N; i >= 0; i--) { const s = i / N, x = x0 + s * L; ctx.lineTo(x, yy(s) + 8); }
        ctx.lineTo(150, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; D.roundRect(ctx, 200, y - 52, 70, 44, 14); ctx.fill(); ctx.stroke();
        D.text(ctx, '手按住', 235, y - 60, { size: F(12), color: '#868e96', align: 'center' });
        if (st.hold) { const fx = x0 + L - 20; ctx.fillStyle = '#ffc078'; D.roundRect(ctx, fx - 22, yy(0.96) - 54, 44, 44, 14); ctx.fill(); FO.arrow(ctx, fx, yy(0.96) - 8, Math.PI / 2, 50, { dot: false }); }
      } else if (k === 'band') {
        const ax = 300, bx = 700, y = 170, dep = d * 130;
        ctx.fillStyle = '#495057'; [ax, bx].forEach((x) => { ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); });
        ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(500, y + dep); ctx.lineTo(bx, y); ctx.stroke();
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax, y - 4); ctx.lineTo(bx, y - 4); ctx.strokeStyle = 'rgba(232,89,12,.0)'; ctx.stroke();
        if (st.hold || d > 0.02) { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, 482, y + dep - 6, 36, 60, 14); ctx.fill(); ctx.stroke(); }
      } else if (k === 'spring') {
        ctx.fillStyle = '#ced4da'; ctx.fillRect(140, 100, 30, 150);
        const x2 = 520 + (d + 0) * 220;
        const n = 16;
        FO.spring(ctx, 170, 175, x2, 175, { n, r: 22, width: st.broken ? 2.6 : 3, color: st.broken ? '#868e96' : '#495057', tilt: st.broken ? 0.2 : 0.45 });
        ctx.fillStyle = '#495057'; D.roundRect(ctx, x2, 150, 14, 50, 4); ctx.fill();
        ctx.strokeStyle = '#adb5bd'; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(527, 120); ctx.lineTo(527, 240); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '原长', 527, 112, { size: F(12), color: '#868e96', align: 'center' });
        if (d > 1.05 && st.hold) D.text(ctx, '⚠ 超过弹性限度！', x2 - 60, 270, { size: F(16), weight: 800, color: '#e03131', align: 'center' });
        if (st.hold) { ctx.fillStyle = '#ffc078'; D.roundRect(ctx, x2 + 14, 155, 44, 40, 12); ctx.fill(); }
      } else if (k === 'balloon') {
        const cx = 500, cy = 190, sq = d * 0.45;
        ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.ellipse(cx, cy + sq * 50, 110 * (1 + sq * 0.6), 120 * (1 - sq), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(cx - 40, cy - 50 + sq * 40, 22, 34 * (1 - sq), -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, cx - 60, cy - 120 * (1 - sq) + sq * 50 - 52, 120, 50, 18); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ced4da'; ctx.fillRect(300, cy + 120 + 6, 400, 14);
      } else if (k === 'clay') {
        const cx = 500, by = 300, sq = d;
        const rx = 80 * (1 + sq * 0.9), ry = 80 * (1 - sq * 0.6);
        ctx.fillStyle = '#ced4da'; ctx.fillRect(300, by, 400, 14);
        ctx.fillStyle = '#69db7c'; ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, by - ry, rx, ry, 0, 0, TAU); ctx.fill(); ctx.stroke();
        if (st.hold) { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; D.roundRect(ctx, cx - 70, by - 2 * ry - 50, 140, 48, 18); ctx.fill(); ctx.stroke(); }
      } else if (k === 'wire') {
        ctx.fillStyle = '#868e96'; ctx.fillRect(250, 150, 80, 50);
        const ang = d * 1.1;
        ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(300, 175); ctx.lineTo(500, 175); ctx.lineTo(500 + Math.cos(ang) * 260, 175 + Math.sin(ang) * 260); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(300, 173); ctx.lineTo(500, 173); ctx.stroke();
        D.text(ctx, '夹子', 290, 140, { size: F(12), color: '#868e96', align: 'center' });
        if (st.hold) { const ex = 500 + Math.cos(ang) * 240, ey = 175 + Math.sin(ang) * 240; ctx.fillStyle = '#ffc078'; ctx.beginPath(); ctx.arc(ex, ey, 22, 0, TAU); ctx.fill(); }
      }
      D.text(ctx, EP[k].name, 20, 32, { size: F(18), weight: 800, color: '#3b5bdb' });
      D.text(ctx, st.hold ? '用力中……' : st.released ? '已松手' : '按住拖动', 20, 58, { size: F(13), color: st.hold ? '#e8590c' : '#868e96' });
    }
    seg.set(st.k, true);
    reset();
    loop.start();
  });

  /* ================= 弹力的产生 ================= */
  PS.register('elastic-force', function (el) {
    const VW = 1000, VH = 380;
    const st = { k: 'book', mag: 1, push: false, t: 0 };
    const seg = PS.ui.seg([{ value: 'book', label: '书放在桌面上' }, { value: 'pull', label: '手拉弹簧' }, { value: 'lamp', label: '绳子吊着灯' }, { value: 'balls', label: '两球靠在一起' }, { value: 'magnet', label: '磁体吸铁钉' }], st.k, (v) => { st.k = v; st.push = false; ui(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ctl = h('div', { class: 'controls' });
    const chk = h('div', { class: 'fc-q' });
    el.append(ctl, chk);
    const magS = PS.ui.slider({ label: '把形变放大', min: 1, max: 100, step: 1, value: 1, fmt: (v) => v + ' 倍', onInput: (v) => { st.mag = v; S.render(); } });
    magS.el.classList.add('wide');
    const pushT = PS.ui.toggle('用手从两边挤压', false, (v) => { st.push = v; ui(); });
    function ui() {
      ctl.innerHTML = '';
      if (st.k === 'book') ctl.append(magS.el);
      if (st.k === 'balls') ctl.append(pushT.el);
      const C = {
        book: [true, true, '书压桌面，桌面发生微小的弹性形变（肉眼看不出，拖动滑块放大看看），桌面要恢复原状，对书产生向上的弹力——<b>支持力</b>；书也发生了形变，对桌面产生向下的弹力——<b>压力</b>。'],
        pull: [true, true, '手拉弹簧，弹簧被拉长，它要恢复原状，就对手产生<b>拉力</b>。'],
        lamp: [true, true, '灯拉绳子，绳子被微微拉长（发生弹性形变），绳子要恢复原状，对灯产生向上的<b>拉力</b>。'],
        balls: [true, st.push, st.push ? '两球被挤压，发生了弹性形变，彼此间产生<b>弹力</b>。' : '两球只是靠在一起，没有相互挤压，<b>没有发生形变</b>——虽然接触，但<b>没有弹力</b>。'],
        magnet: [false, false, '磁体吸引铁钉，两者没有接触，这个力是磁力，<b>不是弹力</b>。'],
      }[st.k];
      const ok = C[0] && C[1];
      const yes = (b) => (b ? '<b style="color:#2b8a3e">✔ 是</b>' : '<b style="color:#e03131">✘ 否</b>');
      chk.innerHTML = '<b>有没有弹力？</b>　① 两物体直接接触：' + yes(C[0]) + '　② 接触处相互挤压或拉伸（发生弹性形变）：' + yes(C[1]) + '　⇒ ' + (ok ? '<b style="color:#2b8a3e">有弹力</b>' : '<b style="color:#e03131">没有弹力</b>') + '<br>' + C[2];
      S.render();
    }
    const loop = PS.loop((dt, t) => { st.t = t; S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const k = st.k;
      if (k === 'book') {
        const m = st.mag, sag = Math.min(60, 0.35 * m), bk = Math.min(18, 0.12 * m);
        const ty = 250;
        // 桌面（中间下凹）
        ctx.fillStyle = '#c98d3e'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(150, ty);
        for (let x = 150; x <= 850; x += 10) { const u = (x - 500) / 260; const yy = ty + (Math.abs(u) < 1 ? sag * Math.cos((u * Math.PI) / 2) : 0); ctx.lineTo(x, yy); }
        ctx.lineTo(850, ty + 34); ctx.lineTo(150, ty + 34); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#a87b3c'; ctx.fillRect(180, ty + 34, 22, 80); ctx.fillRect(798, ty + 34, 22, 80);
        // 书（底面跟着下凹，略被压扁）
        const bw = 280, bh = 60 - bk;
        ctx.fillStyle = '#4dabf7'; ctx.strokeStyle = '#1c7ed6';
        ctx.beginPath(); ctx.moveTo(500 - bw / 2, ty - bh + sag * 0.3);
        ctx.lineTo(500 + bw / 2, ty - bh + sag * 0.3);
        for (let x = 500 + bw / 2; x >= 500 - bw / 2; x -= 10) { const u = (x - 500) / 260; ctx.lineTo(x, ty + sag * Math.cos((u * Math.PI) / 2)); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        D.text(ctx, '书', 500, ty - bh / 2 + sag * 0.5, { size: F(18), weight: 800, color: '#fff', align: 'center', baseline: 'middle' });
        FO.arrow(ctx, 470, ty + sag - 2, -Math.PI / 2, 110, { label: '支持力（桌面对书）', F, color: FC.N, labelSide: 1 });
        FO.arrow(ctx, 540, ty + sag + 2, Math.PI / 2, 90, { label: '压力（书对桌面）', F, color: FC.F, labelSide: -1 });
        if (m > 1) D.text(ctx, '形变放大了 ' + m + ' 倍（示意）', 840, 40, { size: F(14), weight: 700, color: '#e8590c', align: 'right' });
      } else if (k === 'pull') {
        ctx.fillStyle = '#ced4da'; ctx.fillRect(140, 100, 30, 160);
        const ext = 60 + Math.sin(st.t * 1.5) * 25;
        const x2 = 520 + ext;
        FO.spring(ctx, 170, 180, x2, 180, { n: 14, r: 22, width: 3 });
        ctx.fillStyle = '#495057'; D.roundRect(ctx, x2, 155, 12, 50, 4); ctx.fill();
        ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, x2 + 12, 160, 50, 40, 14); ctx.fill(); ctx.stroke();
        FO.arrow(ctx, x2 + 6, 236, Math.PI, 70 + ext * 0.4, { label: '弹簧对手的拉力（弹力）', F, color: FC.N, labelSide: 1 });
        FO.arrow(ctx, x2 + 6, 128, 0, 70 + ext * 0.4, { label: '手对弹簧的拉力', F, color: FC.F, labelSide: -1 });
      } else if (k === 'lamp') {
        ctx.fillStyle = '#ced4da'; ctx.fillRect(300, 20, 400, 16);
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(500, 36); ctx.lineTo(500, 200); ctx.stroke();
        ctx.fillStyle = '#495057'; D.roundRect(ctx, 486, 196, 28, 18, 3); ctx.fill();
        ctx.fillStyle = '#ffe066'; ctx.strokeStyle = '#f59f00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(500, 248, 36, 0, TAU); ctx.fill(); ctx.stroke();
        FO.arrow(ctx, 500, 212, -Math.PI / 2, 100, { label: '绳对灯的拉力（弹力）', F, color: FC.N, labelSide: -1 });
      } else if (k === 'balls') {
        const sq = st.push ? 6 + Math.sin(st.t * 3) * 2 : 0;
        ctx.fillStyle = '#ced4da'; ctx.fillRect(200, 300, 600, 14);
        FO.ball(ctx, 430 + sq * 0.5, 230, 70, '#a5d8ff', '#1c7ed6');
        FO.ball(ctx, 570 - sq * 0.5, 230, 70, '#ffc9c9', '#e03131');
        if (st.push) {
          ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2;
          D.roundRect(ctx, 300 - 50 + sq, 205, 52, 50, 16); ctx.fill(); ctx.stroke(); D.roundRect(ctx, 700 - 2 - sq, 205, 52, 50, 16); ctx.fill(); ctx.stroke();
          FO.arrow(ctx, 500, 200, Math.PI, 80, { label: '弹力', F, color: FC.N, labelSide: 1 });
          FO.arrow(ctx, 500, 260, 0, 80, { label: '弹力', F, color: FC.F, labelSide: -1 });
        } else D.text(ctx, '接触，但没有挤压', 500, 120, { size: F(16), weight: 700, color: '#868e96', align: 'center' });
      } else if (k === 'magnet') {
        FO.magnet(ctx, 330, 200, 200, { t: 60, n: 1 });
        const nx = 620 - Math.abs(Math.sin(st.t * 1.2)) * 60;
        ctx.save(); ctx.translate(nx, 200); ctx.fillStyle = '#868e96'; ctx.fillRect(-10, -6, 90, 12); ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-28, 0); ctx.lineTo(-10, 6); ctx.fill(); ctx.fillRect(78, -14, 8, 28); ctx.restore();
        FO.arrow(ctx, nx - 20, 240, Math.PI, 70, { label: '磁力（不是弹力）', F, color: FC.T, labelSide: 1 });
        D.text(ctx, '不接触', 480, 150, { size: F(16), weight: 700, color: '#868e96', align: 'center' });
      }
    }
    seg.set(st.k, true);
    ui();
    loop.start();
  });

  /* ================= 探究弹簧的伸长量与拉力的关系 ================= */
  PS.register('hooke-lab', function (el, opts) {
    const lab = !!opts.lab;
    const VW = 1000, VH = 470, PPC = 20, TOPY = 50, RX = 250; // 每厘米 20 px；弹簧上端 y = TOPY；刻度尺 x
    const L0 = 6.0, KN = 0.5, LIM = 6; // 原长 6.0 cm；每个钩码 0.5 N；弹性限度内最多挂 6 个
    const st = { n: 0, maxN: 0, L: L0, Lv: L0, rows: [], graph: 'dL', over: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const addB = PS.ui.button('＋ 挂一个钩码', () => { if (st.n >= 8) return; st.n++; PS.sound.tick(); upd(); }, 'btn btn-primary btn-sm');
    const subB = PS.ui.button('－ 取下一个', () => { if (st.n <= 0) return; st.n--; PS.sound.tick(); upd(); }, 'btn btn-sm');
    const recB = PS.ui.button('📝 记录', record, 'btn btn-green btn-sm');
    const gSeg = PS.ui.seg([{ value: 'dL', label: 'ΔL–F 图像' }, { value: 'L', label: 'L–F 图像' }], st.graph, (v) => { st.graph = v; S.render(); });
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(addB, subB, recB, gSeg.el, PS.ui.button('换一根新弹簧', () => { st.n = 0; st.maxN = 0; st.rows = []; table(); upd(); }, 'btn btn-ghost btn-sm')), msg);
    const tbody = h('tbody'), ana = h('div', { class: 'small' });
    el.append(h('div', { class: 'grid-2', style: { marginTop: '10px', alignItems: 'start' } },
      h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '钩码个数'), h('th', null, '拉力 F/N'), h('th', null, '弹簧长度 L/cm'), h('th', null, '伸长量 ΔL/cm'))), tbody)),
      h('div', { class: 'panel' }, h('h4', null, lab ? '分析论证' : '你发现了什么？'), ana)));
    // 伸长量：弹性限度内 ΔL = F/k（k = 0.5 N/cm，每个钩码伸长 1 cm）；超过限度后伸长得更多，并留下永久形变
    function target() {
      const nl = st.n > LIM ? Math.pow(st.n - LIM, 1.6) * 0.75 : 0;
      const set = st.over ? (st.maxN - LIM) * 0.45 : 0;
      return L0 + (st.n * KN) / KN + Math.max(nl, set);
    }
    function upd() {
      st.maxN = Math.max(st.maxN, st.n);
      st.over = st.maxN > LIM;
      st.L = target();
      const F = st.n * KN;
      msg.className = 'fc-msg' + (st.over ? ' bad' : '');
      msg.innerHTML = '挂 <b>' + st.n + '</b> 个钩码（每个 0.5 N），拉力 F = <b>' + PS.fmt(F, 1) + ' N</b>；弹簧长度 L = <b>' + PS.fmt(st.L, 1) + ' cm</b>（看指针对准的刻度）。' + (st.n > LIM ? '<br>⚠ 钩码挂得太多，<b>超过了弹簧的弹性限度</b>，伸长量不再与拉力成正比，取下钩码后弹簧也回不到原长了。' : st.over ? '<br>⚠ 这根弹簧已经被拉坏了（不受力时长度不是 6.0 cm），点“换一根新弹簧”。' : '');
      S.render();
    }
    function record() {
      const F = PS.round(st.n * KN, 1), L = PS.round(st.L, 1);
      if (st.rows.some((r) => r.n === st.n)) { msg.className = 'fc-msg'; msg.innerHTML = '挂 ' + st.n + ' 个钩码的数据已经记录过了，换一个数目吧。'; return; }
      st.rows.push({ n: st.n, F, L, dL: PS.round(L - L0, 1), over: st.n > LIM || st.over });
      st.rows.sort((a, b) => a.n - b.n);
      PS.sound.good(); table(); S.render();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', { class: r.over ? 'hl-row' : null }, h('td', null, String(r.n)), h('td', null, PS.fmt(r.F, 1)), h('td', null, PS.fmt(r.L, 1)), h('td', null, h('b', null, PS.fmt(r.dL, 1))))));
      if (!st.rows.length) tbody.append(h('tr', null, h('td', { colspan: 4, class: 'muted' }, '还没有数据（先记下不挂钩码时的原长）')));
      const good = st.rows.filter((r) => !r.over);
      let s;
      if (good.length < 4) s = '依次挂 0、1、2、3……个钩码，每次记下弹簧的长度 L，算出<b>伸长量 ΔL = L − L₀</b>（L₀ 是不挂钩码时的原长 6.0 cm）。至少记录 4 组，再看图像。';
      else {
        s = '在弹性限度内，每增加 0.5 N 的拉力，弹簧就伸长 1.0 cm：ΔL/F 都等于 <b>2.0 cm/N</b>，ΔL–F 图像是一条<b>过原点的直线</b>。';
        s += '<div class="tip tip-good" style="margin:8px 0 0">结论：<b>在弹性限度内，弹簧的伸长量跟它受到的拉力成正比</b>。弹簧测力计就是根据这个道理制成的。</div>';
        s += '<div class="small muted" style="margin-top:6px">注意：弹簧的<b>长度</b> L 与拉力不成正比（L–F 图像不过原点），成正比的是<b>伸长量</b>。</div>';
      }
      if (st.rows.some((r) => r.over)) s += '<div class="tip tip-warn" style="margin:8px 0 0">黄色的数据超过了弹性限度：伸长量比正比关系的预计值大，图像向上弯曲。</div>';
      ana.innerHTML = s;
    }
    const loop = PS.loop((dt) => { st.Lv += (st.L - st.Lv) * Math.min(1, dt * 6); S.render(); }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 铁架台
      ctx.fillStyle = '#495057'; ctx.fillRect(40, 20, 12, VH - 40); ctx.fillRect(20, VH - 24, 120, 14); ctx.fillRect(40, 26, 200, 10);
      // 刻度尺（竖直，0 刻度与弹簧上端对齐）
      ctx.save(); ctx.translate(RX, TOPY); ctx.rotate(Math.PI / 2);
      D.ruler(ctx, { x: 0, y: 0, len: 19, ppc: PPC, div: 'mm', h: 34, side: 'bottom', padL: 6, padR: 18, unitLabel: false });
      ctx.restore();
      D.text(ctx, 'cm', RX + 8, TOPY + 19 * PPC + 26, { size: F(12), color: '#495057' });
      // 弹簧
      const sx = 175, by = TOPY + st.Lv * PPC;
      ctx.fillStyle = '#868e96'; ctx.fillRect(sx - 20, 36, 40, TOPY - 36);
      FO.spring(ctx, sx, TOPY, sx, by, { n: 14, r: 13, width: 2.4, lead: 4, color: st.over ? '#868e96' : '#343a40' });
      // 指针
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(RX - 2, by); ctx.stroke();
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(RX - 2, by - 5); ctx.lineTo(RX + 6, by); ctx.lineTo(RX - 2, by + 5); ctx.fill();
      // 钩码
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, by); ctx.lineTo(sx, by + 6); ctx.stroke();
      if (st.n) FO.hookMass(ctx, sx, by + 4, st.n, { w: 24, h: 18, fs: 8 });
      // 原长标记
      ctx.strokeStyle = 'rgba(59,91,219,.6)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(RX + 40, TOPY + L0 * PPC); ctx.lineTo(RX + 70, TOPY + L0 * PPC); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '原长 L₀', RX + 40, TOPY + L0 * PPC + 5, { size: F(12), color: '#3b5bdb' });
      if (st.Lv - L0 > 0.3) { ctx.save(); ctx.translate(RX + 100, 0); ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, TOPY + L0 * PPC); ctx.lineTo(0, by); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-6, by); ctx.lineTo(6, by); ctx.moveTo(-6, TOPY + L0 * PPC); ctx.lineTo(6, TOPY + L0 * PPC); ctx.stroke(); ctx.restore(); D.text(ctx, 'ΔL', RX + 108, (TOPY + L0 * PPC + by) / 2 + 5, { size: F(14), weight: 800, color: '#e8590c' }); }
      // 放大读数
      const zx = 360, zy = 40, zw = 150, zh = 150;
      ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2; D.roundRect(ctx, zx, zy, zw, zh, 12); ctx.fill(); ctx.stroke();
      ctx.beginPath(); D.roundRect(ctx, zx + 1, zy + 1, zw - 2, zh - 2, 11); ctx.clip();
      const zk = 3.2; // 放大倍数
      ctx.translate(zx + zw / 2, zy + zh / 2); ctx.scale(zk, zk); ctx.translate(-(RX + 6), -by);
      ctx.fillStyle = 'rgba(255, 236, 170, 0.96)'; ctx.fillRect(RX, by - 40, 40, 80);
      ctx.strokeStyle = '#2a2414'; ctx.fillStyle = '#2a2414';
      for (let i = 0; i <= 190; i++) { const yy = TOPY + i * (PPC / 10); if (Math.abs(yy - by) > 30) continue; const tl = i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6; ctx.lineWidth = i % 10 === 0 ? 0.6 : 0.35; ctx.beginPath(); ctx.moveTo(RX, yy); ctx.lineTo(RX + tl, yy); ctx.stroke(); if (i % 10 === 0) { ctx.font = PS.font(6, 700); ctx.textBaseline = 'middle'; ctx.fillText(String(i / 10), RX + 16, yy); } }
      ctx.strokeStyle = '#e03131'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(RX - 20, by); ctx.lineTo(RX - 1, by); ctx.stroke();
      ctx.fillStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(RX - 2, by - 1.6); ctx.lineTo(RX + 2, by); ctx.lineTo(RX - 2, by + 1.6); ctx.fill();
      ctx.restore();
      D.text(ctx, '🔍 指针处放大', zx + zw / 2, zy + zh + 18, { size: F(12), color: '#3b5bdb', align: 'center' });
      // 图像
      const gx0 = 600, gx1 = 960, gy0 = 410, gy1 = 50;
      const isDL = st.graph === 'dL';
      const FMAX = 4.5, YMAX = isDL ? 12 : 18;
      const X = (f) => gx0 + (f / FMAX) * (gx1 - gx0), Y = (v) => gy0 - (v / YMAX) * (gy0 - gy1);
      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 1;
      for (let f = 0.5; f <= FMAX + 1e-9; f += 0.5) { ctx.beginPath(); ctx.moveTo(X(f), gy0); ctx.lineTo(X(f), gy1); ctx.stroke(); }
      for (let v = 2; v <= YMAX; v += 2) { ctx.beginPath(); ctx.moveTo(gx0, Y(v)); ctx.lineTo(gx1, Y(v)); ctx.stroke(); }
      D.arrow(ctx, gx0, gy0, gx1 + 14, gy0, { color: '#495057', width: 1.6, head: 8 }); D.arrow(ctx, gx0, gy0, gx0, gy1 - 14, { color: '#495057', width: 1.6, head: 8 });
      D.text(ctx, 'F/N', gx1 + 18, gy0 + 4, { size: F(13), weight: 700 }); D.text(ctx, isDL ? 'ΔL/cm' : 'L/cm', gx0 + 8, gy1 - 16, { size: F(13), weight: 700 });
      for (let f = 1; f <= 4; f++) D.text(ctx, String(f), X(f), gy0 + 18, { size: F(12), align: 'center', color: '#495057' });
      for (let v = 2; v <= YMAX; v += isDL ? 2 : 4) D.text(ctx, String(v), gx0 - 8, Y(v) + 4, { size: F(12), align: 'right', color: '#495057' });
      D.text(ctx, '0', gx0 - 8, gy0 + 16, { size: F(12), align: 'right', color: '#495057' });
      const pts = st.rows.map((r) => [X(r.F), Y(isDL ? r.dL : r.L), r.over]);
      const good = pts.filter((p) => !p[2]);
      if (good.length >= 2) { // 连线（弹性限度内）
        ctx.strokeStyle = '#3b5bdb'; ctx.lineWidth = 2.5; ctx.beginPath();
        const f0 = 0, f1 = Math.max(...st.rows.filter((r) => !r.over).map((r) => r.F));
        ctx.moveTo(X(f0), Y(isDL ? 0 : L0)); ctx.lineTo(X(f1), Y(isDL ? f1 / KN : L0 + f1 / KN)); ctx.stroke();
      }
      pts.forEach(([x, y, o]) => { ctx.fillStyle = o ? '#f08c00' : '#3b5bdb'; ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU); ctx.fill(); });
      if (!isDL) D.text(ctx, '不过原点！', X(0.2), Y(L0) - 12, { size: F(12), weight: 700, color: '#e03131' });
    }
    table(); upd();
    loop.start();
  });

  /* ================= 认识和使用弹簧测力计 ================= */
  const SS_PARTS = {
    ring: ['拉环', '用手提着拉环，或把拉环挂在铁架台上。'],
    spring: ['弹簧', '核心部件：在弹性限度内，弹簧的伸长量跟受到的拉力成正比。'],
    pointer: ['指针', '固定在弹簧下端，随弹簧一起伸长，指示力的大小。'],
    board: ['刻度板', '刻有均匀的刻度，单位是 N。这个测力计量程 0~5 N，分度值 0.2 N。'],
    hook: ['挂钩', '被测的力要作用在挂钩上（物体挂在挂钩上），不能倒挂。'],
  };
  const SS_ITEMS = [
    { n: '木块', F: 1.2, c: '#e9b872' }, { n: '苹果', F: 1.6, c: '#e03131' }, { n: '小石块', F: 2.4, c: '#868e96' },
    { n: '铁块', F: 3.8, c: '#5f6773' }, { n: '一瓶矿泉水', F: 5.5, c: '#74c0fc' },
  ];
  PS.register('spring-scale', function (el) {
    const VW = 1000, VH = 660, MAX = 5, DIV = 0.2, SL = 240;
    const st = { hl: null, zeroed: false, zero: 0.2, item: null, mode: 'ok', shake: 0, Fv: 0.2, pull: 0, t: 0 };
    const view = h('div');
    const side = h('div', { class: 'bench-side' });
    el.append(h('div', { class: 'bench' }, view, side));
    const S = PS.stage(view, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg info' });
    view.append(msg);
    // ① 认识构造
    const partBox = h('div', { class: 'fc-chips' });
    Object.keys(SS_PARTS).forEach((k) => partBox.append(PS.ui.button(SS_PARTS[k][0], () => { st.hl = st.hl === k ? null : k; partBox.querySelectorAll('.btn').forEach((b) => b.classList.toggle('on', b.textContent === SS_PARTS[k][0] && st.hl === k)); say(st.hl ? '<b>' + SS_PARTS[k][0] + '</b>：' + SS_PARTS[k][1] : '点击按钮认识各部分。', 'info'); S.render(); }, 'btn btn-sm')));
    // ② 使用前
    const zeroB = PS.ui.button('调零', () => { if (st.item) { say('先取下物体，在<b>不受力</b>时调零。', 'bad'); return; } st.zeroed = true; PS.sound.tick(); say('指针已对准零刻度线。✔', 'ok'); }, 'btn btn-sm');
    const shakeB = PS.ui.button('轻轻来回拉几次', () => { st.shake = 1.4; PS.sound.tick(); say('来回拉动挂钩几次，避免弹簧、指针与外壳卡住或摩擦。✔', 'ok'); }, 'btn btn-sm');
    // ③ 挂物体
    const itemBox = h('div', { class: 'fc-chips' });
    const itemBtns = SS_ITEMS.map((it, i) => { const b = PS.ui.button(it.n, () => hang(i), 'btn btn-sm'); itemBox.append(b); return b; });
    itemBox.append(PS.ui.button('取下', () => hang(null), 'btn btn-ghost btn-sm'));
    const modeSeg = PS.ui.seg([{ value: 'ok', label: '正确使用' }, { value: 'tilt', label: '斜着拉' }, { value: 'inv', label: '倒挂' }], 'ok', (v) => { st.mode = v; fb.innerHTML = ''; inp.value = ''; upd(); });
    modeSeg.el.style.flexWrap = 'wrap';
    // ④ 读数
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '示数', autocomplete: 'off' });
    const fb = h('div', { class: 'small', style: { marginTop: '4px' } });
    const chkB = PS.ui.button('检查', check, 'btn btn-primary btn-sm');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 认识弹簧测力计'), partBox),
      h('div', { class: 'panel' }, h('h4', null, '② 使用前'), h('div', { class: 'small' }, '看量程和分度值；检查指针是否指在零刻度线。'), h('div', { class: 'row' }, zeroB, shakeB)),
      h('div', { class: 'panel' }, h('h4', null, '③ 挂上物体'), itemBox, h('div', { style: { marginTop: '6px' } }, modeSeg.el)),
      h('div', { class: 'panel' }, h('h4', null, '④ 读数'), h('div', { class: 'fc-ans' }, inp, h('span', null, 'N'), chkB), fb));
    function say(t, cls) { msg.className = 'fc-msg ' + (cls || ''); msg.innerHTML = t; }
    function hang(i) {
      st.item = i; fb.innerHTML = ''; inp.value = '';
      itemBtns.forEach((b, k) => b.classList.toggle('on', k === i));
      PS.sound.tick(); upd();
    }
    function reading() { // 指针所指的值
      if (st.item == null) return st.zeroed ? 0 : st.zero;
      const it = SS_ITEMS[st.item];
      let v = it.F + (st.zeroed ? 0 : st.zero);
      if (st.mode === 'tilt') v -= 0.4; // 弹簧与外壳摩擦，示数偏小（示意）
      if (st.mode === 'inv') v += 0.6; // 测力计外壳自身的重力也加在弹簧上（示意）
      return Math.min(v, MAX + 0.15);
    }
    function upd() {
      const it = st.item != null ? SS_ITEMS[st.item] : null;
      if (!it) { say(st.zeroed ? '选一个物体挂在挂钩上，测出它对挂钩的拉力。' : '使用前先观察：指针是不是指在零刻度线？（放大图里看得很清楚）', 'info'); return; }
      if (it.F > MAX) { say('⚠ 一瓶矿泉水约 5.5 N，<b>超过了测力计的量程</b>（0~5 N），指针被拉到了头，弹簧可能被拉坏！要换用量程更大的测力计。', 'bad'); return; }
      if (st.mode === 'tilt') say('⚠ 斜着拉时，<b>拉力方向与弹簧的轴线不一致</b>，弹簧、指针跟外壳摩擦，测量不准（示数偏小）。拉力方向要与弹簧轴线方向一致。', 'bad');
      else if (st.mode === 'inv') say('⚠ 倒挂时，测力计外壳的重力也作用在弹簧上，示数比物体对挂钩的拉力<b>偏大</b>。物体要挂在<b>挂钩</b>上。', 'bad');
      else say((st.zeroed ? '' : '⚠ 注意：使用前没有调零！') + '物体静止后，视线与刻度板垂直，读出指针所指的示数。', st.zeroed ? 'info' : 'bad');
    }
    function check() {
      const v = parseFloat(inp.value.replace(/[，,\s]/g, ''));
      if (isNaN(v)) { inp.focus(); return; }
      if (st.item == null) { fb.innerHTML = '先挂上一个物体。'; return; }
      const r = Math.round(reading() / DIV) * DIV, it = SS_ITEMS[st.item];
      if (it.F > MAX) { fb.innerHTML = '超过量程，无法读出正确的示数。'; PS.sound.bad(); return; }
      const ok = Math.abs(v - r) < DIV * 0.26;
      let s = ok ? '✔ 示数正确：' + PS.fmt(r, 1) + ' N。' : '✘ 指针指在 <b>' + PS.fmt(r, 1) + ' N</b>。';
      if (!ok && Math.abs(v - r) > DIV * 0.26 && Math.abs(v * 10 - r) < 0.05) s += '（别忘了单位是 N，读数要看分度值 0.2 N）';
      else if (!ok && Math.abs(Math.abs(v - r) - DIV) < 0.05) s += '差了一小格——这个测力计每一小格是 <b>0.2 N</b>。';
      if (st.mode === 'ok' && !st.zeroed) s += '<br>不过没有调零，指针原来指在 0.2 N，示数比真实的拉力大 0.2 N，物体对挂钩的拉力实际是 ' + PS.fmt(it.F, 1) + ' N。';
      else if (st.mode !== 'ok') s += '<br>这样操作测出的值不准确，物体对挂钩的拉力实际是 ' + PS.fmt(it.F, 1) + ' N。';
      else if (ok) s += ' 物体对挂钩的拉力是 ' + PS.fmt(it.F, 1) + ' N。';
      fb.innerHTML = s;
      ok ? PS.sound.good() : PS.sound.bad();
    }
    const loop = PS.loop((dt, t) => {
      st.t = t;
      let target = reading();
      if (st.shake > 0) { st.shake -= dt; target += Math.max(0, Math.sin(t * 9)) * 1.6 * Math.min(1, st.shake); }
      st.Fv += (target - st.Fv) * Math.min(1, dt * 7);
      S.render();
    }, view);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      // 铁架台横杆
      ctx.fillStyle = '#495057'; ctx.fillRect(60, 18, 520, 12); ctx.fillRect(60, 18, 12, VH - 36); ctx.fillRect(40, VH - 26, 140, 14);
      const cx = 330, top = 30;
      const it = st.item != null ? SS_ITEMS[st.item] : null;
      const over = it && it.F > MAX;
      ctx.save();
      let g;
      if (st.mode === 'inv' && it) {
        // 倒挂：挂钩挂在横杆上，物体挂在拉环上
        const L = SL, len = 13 + 4 + 30 + L + 26 + 6 + 17;
        ctx.translate(cx, top + len + 6); ctx.rotate(Math.PI);
        g = FO.scale(ctx, { x: 0, y: 0, F: st.Fv, max: MAX, div: DIV, L, F2: F, hl: st.hl, fs: F(14) });
        ctx.restore();
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx, 40); ctx.stroke();
        drawItem(ctx, F, it, cx, top + len + 6 + 14);
      } else {
        const ang = st.mode === 'tilt' && it ? -0.42 : 0;
        ctx.translate(cx, top + 14); ctx.rotate(ang);
        g = FO.scale(ctx, { x: 0, y: 0, F: st.Fv, max: MAX, div: DIV, L: SL, F2: F, hl: st.hl, fs: F(14), over });
        const hx = g.hook.x + 7, hy = g.hook.y - 2;
        const wx = Math.cos(ang) * hx - Math.sin(ang) * hy, wy = Math.sin(ang) * hx + Math.cos(ang) * hy;
        ctx.restore();
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx, top + 2); ctx.stroke();
        if (it) {
          if (st.mode === 'tilt') { ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx + wx, top + 14 + wy); ctx.lineTo(cx + wx, top + 14 + wy + 40); ctx.stroke(); drawItem(ctx, F, it, cx + wx, top + 14 + wy + 40); }
          else drawItem(ctx, F, it, cx + wx, top + 14 + wy);
        }
        if (st.mode === 'tilt' && it) { ctx.fillStyle = '#ffc078'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 2; D.roundRect(ctx, cx - 26, 6, 52, 36, 12); ctx.fill(); ctx.stroke(); }
      }
      // 放大读数
      FO.scaleZoom(ctx, Math.min(st.Fv, MAX + 0.15), { x: 620, y: 70, w: 320, h: 380, max: MAX, div: DIV, F2: F, span: 0.7, title: st.mode === 'inv' && it ? '🔍 放大看指针（倒挂时刻度是倒的）' : '🔍 放大看指针' });
      D.text(ctx, '量程 0~5 N　分度值 0.2 N', 780, 490, { size: F(15), weight: 700, color: '#495057', align: 'center' });
      if (st.hl) D.text(ctx, '← ' + SS_PARTS[st.hl][0], 400, { ring: 50, spring: 82, pointer: 18 + 14 + 17 + 30 + 4 + (st.Fv / MAX) * SL, board: 220, hook: 18 + 14 + 17 + 30 + (st.Fv / MAX) * SL + 290 }[st.hl], { size: F(18), weight: 800, color: '#e8590c' });
      if (over) D.text(ctx, '超过量程！', 780, 530, { size: F(22), weight: 900, color: '#e03131', align: 'center' });
    }
    function drawItem(ctx, F, it, x, y) {
      ctx.save();
      ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke();
      const yy = y + 16;
      if (it.n === '苹果') { ctx.fillStyle = it.c; ctx.beginPath(); ctx.arc(x, yy + 26, 26, 0, TAU); ctx.fill(); }
      else if (it.n === '一瓶矿泉水') { ctx.fillStyle = it.c; D.roundRect(ctx, x - 22, yy, 44, 110, 10); ctx.fill(); ctx.fillStyle = '#1c7ed6'; ctx.fillRect(x - 22, yy + 40, 44, 22); }
      else if (it.n === '小石块') FO.ball(ctx, x, yy + 22, 24, '#adb5bd', '#495057');
      else { ctx.fillStyle = it.c; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x - 32, yy, 64, 44); ctx.strokeRect(x - 32, yy, 64, 44); }
      D.text(ctx, it.n, x + 44, yy + 26, { size: F(14), weight: 700, color: '#495057' });
      ctx.restore();
    }
    upd();
    loop.start();
  });

  /* ================= 弹簧测力计读数练习 ================= */
  const SR_TYPES = [[5, 0.2], [5, 0.1], [10, 0.5], [10, 0.2], [2.5, 0.1]];
  PS.register('scale-read', function (el) {
    const VW = 1000, VH = 520;
    const st = { k: 0, F: 0, n: 0, ok: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const ins = ['量程', '分度值', '示数'].map((t) => { const i = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: t === '量程' ? '0~?' : '' }); i.style.width = '86px'; return [t, i]; });
    const fb = h('div', { class: 'fc-msg' });
    const go = PS.ui.button('检查', check, 'btn btn-primary btn-sm');
    el.append(h('div', { class: 'fc-ans' }, ins.map(([t, i]) => h('label', { style: { display: 'flex', gap: '4px', alignItems: 'center' } }, h('span', null, t), t === '量程' ? h('span', null, '0 ~') : null, i, h('span', null, 'N'))), go, PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), fb);
    ins.forEach(([, i]) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); }));
    function next() {
      st.k = PS.randInt(0, SR_TYPES.length - 1);
      const [max, div] = SR_TYPES[st.k];
      st.F = PS.round(PS.randInt(1, Math.round(max / div) - 1) * div, 2);
      ins.forEach(([, i]) => { i.value = ''; i.disabled = false; });
      fb.className = 'fc-msg'; fb.innerHTML = '读出这个弹簧测力计的<b>量程</b>、<b>分度值</b>和<b>示数</b>（示数读到分度值即可，不需要估读）。';
      S.render();
    }
    function check() {
      const [max, div] = SR_TYPES[st.k];
      const v = ins.map(([, i]) => parseFloat(i.value.replace(/[，,\s~]/g, '').replace(/^0(?=\d)/, '')));
      const a = [Math.abs(v[0] - max) < 1e-6, Math.abs(v[1] - div) < 1e-6, Math.abs(v[2] - st.F) < div * 0.26];
      st.n++; if (a.every(Boolean)) st.ok++;
      const parts = [];
      parts.push((a[0] ? '✔' : '✘') + ' 量程 0~' + max + ' N');
      parts.push((a[1] ? '✔' : '✘') + ' 分度值 ' + div + ' N' + (a[1] ? '' : '（1 N 之间有 ' + Math.round(1 / div) + ' 小格，1 ÷ ' + Math.round(1 / div) + ' = ' + div + '）'));
      let s3 = (a[2] ? '✔' : '✘') + ' 示数 ' + PS.fmt(st.F, div < 0.1 ? 2 : 1) + ' N';
      if (!a[2] && !isNaN(v[2]) && Math.abs(Math.abs(v[2] - st.F) - div) < div * 0.3) s3 += '（差了一小格）';
      parts.push(s3);
      fb.className = 'fc-msg ' + (a.every(Boolean) ? 'ok' : 'bad');
      fb.innerHTML = parts.join('　') + '<br><span class="small">已练 ' + st.n + ' 题，全对 ' + st.ok + ' 题。读数步骤：先找指针附近的整数（N），再数它下面有几小格，示数 = 整数 + 格数 × 分度值。</span>';
      a.every(Boolean) ? PS.sound.good() : PS.sound.bad();
    }
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const [max, div] = SR_TYPES[st.k];
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#495057'; ctx.fillRect(100, 14, 300, 10);
      const g = FO.scale(ctx, { x: 250, y: 40, F: st.F, max, div, L: 220, F2: F, fs: F(14) });
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(250, 24); ctx.lineTo(250, 27); ctx.stroke();
      FO.hookMass(ctx, g.hook.x + 7, g.hook.y - 2, 0);
      ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(g.hook.x + 7, g.hook.y - 2); ctx.lineTo(g.hook.x + 7, g.hook.y + 14); ctx.stroke();
      ctx.fillRect(g.hook.x + 7 - 26, g.hook.y + 14, 52, 30);
      FO.scaleZoom(ctx, st.F, { x: 560, y: 70, w: 300, h: 360, max, div, F2: F, span: div * 5.5 });
    }
    next();
  });
})();
