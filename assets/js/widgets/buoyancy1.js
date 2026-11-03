/* 第10章第1节：浮力——浮力在哪里、受不受浮力、称重法、浮力产生的原因、把饮料罐按入水中。依赖 force.js、pressure.js、buoyancy.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, FO = PS.force, FC = PS.FC, PR = PS.pr, FL = PS.fl;
  const TAU = Math.PI * 2;

  function woodRect(ctx, x, y, w, hh) {
    const g = ctx.createLinearGradient(0, y, 0, y + hh); g.addColorStop(0, '#f1cf98'); g.addColorStop(1, '#c98d3e');
    ctx.fillStyle = g; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 1.6;
    ctx.fillRect(x, y, w, hh); ctx.strokeRect(x, y, w, hh);
    ctx.strokeStyle = 'rgba(138,90,28,.35)'; ctx.lineWidth = 1.2;
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 5, y + (i * hh) / 3); ctx.bezierCurveTo(x + w / 3, y + (i * hh) / 3 + 4, x + (2 * w) / 3, y + (i * hh) / 3 - 4, x + w - 5, y + (i * hh) / 3); ctx.stroke(); }
  }
  function pingpong(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffd8a8');
    ctx.fillStyle = g; ctx.strokeStyle = '#e8a87c'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
  }

  /* ================= 浮力在哪里（点选场景中的物体） ================= */
  const SC = {
    wood: { name: '漂浮的木块', box: [58, 176, 124, 76] },
    stone: { name: '水底的石块', box: [222, 366, 96, 60] },
    fish: { name: '水中的鱼', box: [0, 0, 0, 0] },
    ball: { name: '按入水中的乒乓球', box: [560, 252, 64, 64] },
    pier: { name: '桥墩', box: [690, 150, 90, 270] },
    balloon: { name: '空中的氢气球', box: [878, 8, 84, 112] },
  };
  const SC_MSG = {
    wood: '木块<b>漂浮</b>在水面上，只有一部分浸在水中，也受到浮力：F浮 = G。浮力的施力物体是<b>水</b>，方向<b>竖直向上</b>。',
    stone: '沉在水底的石块<b>也受浮力</b>！它受到重力、浮力和河床的支持力：G = F浮 + F支。“下沉的物体不受浮力”是错误的说法。',
    fish: '鱼<b>浸没</b>在水中，受到水竖直向上的浮力。一切<b>浸在</b>液体中的物体都受到浮力（“浸在”包括一部分浸入和全部浸入；“浸没”指全部浸入）。',
    ball: '用手把乒乓球按入水中，手能感觉到水向上“托”它：F浮 = G + F手。松手后，乒乓球会上浮。',
    pier: '桥墩的下部埋在河床里，<b>下表面没有水</b>，不受水向上的压力；左右两侧受到的压力相互抵消。所以桥墩<b>不受浮力</b>。',
    balloon: '氢气球浸在<b>空气</b>中，也受到浮力（施力物体是空气）：F浮 = G + F拉。<b>浸在气体中</b>的物体也受到浮力。',
  };
  PS.register('buoy-scenes', function (el) {
    const VW = 1000, VH = 470, WL = 210, BED = 420;
    const st = { k: 'wood', t: 0, fx: 420, fdir: 1 };
    const seg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k].name })), st.k, (v) => { st.k = v; tell(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const msg = h('div', { class: 'fc-msg info' });
    el.append(msg, h('div', { class: 'small muted', style: { marginTop: '4px' } }, '也可以直接点击画面中的物体。箭头只表示力的方向，长短是示意。'));
    function tell() { msg.innerHTML = '<b>' + SC[st.k].name + '：</b>' + SC_MSG[st.k]; S.render(); }
    PS.drag(S, { VW, VH, hit: () => null, click: (p) => {
      for (const k of Object.keys(SC)) { const b = SC[k].box; if (p.x >= b[0] && p.x <= b[0] + b[2] && p.y >= b[1] && p.y <= b[1] + b[3]) { seg.set(k); return; } }
    }, hover: (p) => Object.keys(SC).some((k) => { const b = SC[k].box; return p.x >= b[0] && p.x <= b[0] + b[2] && p.y >= b[1] && p.y <= b[1] + b[3]; }) });
    const loop = PS.loop((dt) => {
      st.t += dt;
      st.fx += st.fdir * dt * 40;
      if (st.fx > 500) st.fdir = -1; if (st.fx < 340) st.fdir = 1;
      SC.fish.box = [st.fx - 46, 284, 92, 52];
      S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH), t = st.t;
      let g = ctx.createLinearGradient(0, 0, 0, WL); g.addColorStop(0, '#d0ebff'); g.addColorStop(1, '#f1f8ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, WL);
      ctx.fillStyle = '#dbeefc'; ctx.fillRect(0, WL, VW, BED - WL + 12);
      // 桥墩（水中部分）
      const pg = ctx.createLinearGradient(700, 0, 770, 0); pg.addColorStop(0, '#adb5bd'); pg.addColorStop(0.5, '#ced4da'); pg.addColorStop(1, '#868e96');
      ctx.fillStyle = pg; ctx.fillRect(700, 150, 70, BED - 150);
      // 石块
      const sp = [[-42, 24], [-38, -6], [-14, -22], [16, -24], [40, -6], [44, 24]];
      ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.6;
      ctx.beginPath(); sp.forEach(([a, b], i) => (i ? ctx.lineTo(270 + a, 398 + b) : ctx.moveTo(270 + a, 398 + b))); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 鱼
      const fy = 310 + Math.sin(t * 2) * 6, fx = st.fx, fd = st.fdir;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(fd, 1);
      ctx.fillStyle = '#ff922b'; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-52, -16 + Math.sin(t * 9) * 3); ctx.lineTo(-52, 16 + Math.sin(t * 9) * 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 36, 17, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(20, -4, 5, 0, TAU); ctx.fill(); ctx.fillStyle = '#1b2333'; ctx.beginPath(); ctx.arc(21.5, -4, 2.4, 0, TAU); ctx.fill();
      ctx.restore();
      // 乒乓球和手
      pingpong(ctx, 592, 292, 22);
      FL.hand(ctx, 592, 268, Math.PI / 2, { s: 1.05 });
      // 木块
      const wy = 186 + Math.sin(t * 1.6) * 2;
      woodRect(ctx, 70, wy, 100, 52);
      // 水（覆盖在水中物体上）
      ctx.fillStyle = 'rgba(77,171,247,.32)'; ctx.fillRect(0, WL, VW, BED - WL + 12);
      ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = 0; x <= VW; x += 10) { const yy = WL + Math.sin(x * 0.04 + t * 2) * 1.5; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
      // 河床
      ctx.fillStyle = '#e9d8a6'; ctx.beginPath(); ctx.moveTo(0, VH); for (let x = 0; x <= VW; x += 20) ctx.lineTo(x, BED + Math.sin(x * 0.05) * 4); ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(160,130,70,.35)';
      for (let i = 0; i < 40; i++) { const px = (i * 97) % VW, py = BED + 14 + ((i * 37) % 36); ctx.beginPath(); ctx.ellipse(px, py, 4, 2.5, 0, 0, TAU); ctx.fill(); }
      // 桥墩埋在河床里的部分
      ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = pg; ctx.fillRect(700, BED - 4, 70, VH - BED + 4); ctx.restore();
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4; ctx.strokeRect(700, BED - 4, 70, VH - BED + 2); ctx.restore();
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(700, 150); ctx.lineTo(700, BED - 4); ctx.moveTo(770, 150); ctx.lineTo(770, BED - 4); ctx.stroke();
      // 桥面和栏杆
      ctx.fillStyle = '#868e96'; ctx.fillRect(640, 130, 360, 22);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(640, 106); ctx.lineTo(VW, 106); for (let x = 650; x < VW; x += 30) { ctx.moveTo(x, 106); ctx.lineTo(x, 130); } ctx.stroke();
      // 氢气球
      const bx = 920 + Math.sin(t * 1.2) * 6, by = 52;
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx, by + 34); ctx.quadraticCurveTo(bx - 10, by + 60, 920, 106); ctx.stroke();
      const bg = ctx.createRadialGradient(bx - 10, by - 10, 4, bx, by, 34); bg.addColorStop(0, '#ffc9c9'); bg.addColorStop(1, '#f03e3e');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(bx, by, 28, 33, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.moveTo(bx - 4, by + 36); ctx.lineTo(bx + 4, by + 36); ctx.lineTo(bx, by + 31); ctx.closePath(); ctx.fill();
      D.text(ctx, '水', 18, WL + 30, { size: F(15), weight: 800, color: '#1864ab' });
      D.text(ctx, '空气', 18, 40, { size: F(15), weight: 800, color: '#1864ab' });
      // 选中的物体：虚线框 + 受力
      const b = SC[st.k].box;
      ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 2.4; D.roundRect(ctx, b[0], b[1], b[2], b[3], 10); ctx.stroke(); ctx.restore();
      const o = { k: 22, F, values: false, width: 3.4, head: 12 };
      const B = FC.B;
      if (st.k === 'wood') FL.forces(ctx, 120, wy + 26, [{ n: 'G', v: 3, c: FC.G }, { n: 'F浮', v: 3, c: B, up: true }], o);
      if (st.k === 'stone') FL.forces(ctx, 270, 398, [{ n: 'G', v: 4, c: FC.G, side: 1 }, { n: 'F浮', v: 1.6, c: B, up: true }, { n: 'F支', v: 2.4, c: FC.N, up: true }], o);
      if (st.k === 'fish') FL.forces(ctx, fx, fy, [{ n: 'G', v: 2.6, c: FC.G }, { n: 'F浮', v: 2.6, c: B, up: true }], o);
      if (st.k === 'ball') FL.forces(ctx, 592, 290, [{ n: 'G', v: 0.6, c: FC.G, dx: -14, side: 1 }, { n: 'F手', v: 2.6, c: FC.F, dx: 14, side: -1 }, { n: 'F浮', v: 3.2, c: B, up: true, side: 1 }], Object.assign({}, o, { min: 10 }));
      if (st.k === 'balloon') FL.forces(ctx, bx, by, [{ n: 'G', v: 1, c: FC.G, dx: -12, side: 1 }, { n: 'F拉', v: 1.6, c: FC.T, dx: 12, side: -1 }, { n: 'F浮', v: 2.6, c: B, up: true }], Object.assign({}, o, { k: 18 }));
      if (st.k === 'pier') {
        for (let y = WL + 30; y < BED - 10; y += 46) {
          const L = 8 + (y - WL) * 0.16;
          D.arrow(ctx, 700 - L - 6, y, 698, y, { color: '#1c7ed6', width: 2, head: 7 });
          D.arrow(ctx, 770 + L + 6, y, 772, y, { color: '#1c7ed6', width: 2, head: 7 });
        }
        D.text(ctx, '左右压力相互抵消', 735, 236, { size: F(13), weight: 700, color: '#1864ab', align: 'center', bg: 'rgba(255,255,255,.85)' });
        D.text(ctx, '✘ 下表面没有水，没有向上的压力', 735, 452, { size: F(13), weight: 700, color: '#e03131', align: 'center', bg: 'rgba(255,255,255,.88)' });
      }
    }
    tell(); loop.start();
  });

  /* ================= 受不受浮力（卡片分类） ================= */
  PS.register('buoy-sort', function (el) {
    PS.sortCards(el, [
      ['漂浮在水面上的木块', 0, '一部分浸在水中，也受浮力。'],
      ['沉在水底的铁球', 0, '下沉的物体也受浮力，只是浮力小于重力。'],
      ['在水中慢慢下沉的石块', 0, '浸在水中就受浮力。'],
      ['在水中游动的鱼', 0, '浸没在水中，受到水的浮力。'],
      ['空中飘着的氢气球', 0, '浸在空气中，受到空气的浮力。'],
      ['正在升空的热气球', 0, '受到空气的浮力。'],
      ['正在下潜的潜水艇', 0, '浸没在海水中，受到海水的浮力。'],
      ['躺在死海水面上看书的人', 0, '漂浮，F浮 = G。'],
      ['河中的桥墩', 1, '底部埋在河床里，下表面没有水向上的压力，不受浮力。'],
      ['在太空中运行的宇宙飞船', 1, '太空中没有空气，没有液体也没有气体对它产生浮力。'],
      ['底部深陷在河底淤泥中、与淤泥紧密接触的木桩', 1, '下表面没有受到水向上的压力，不受浮力。'],
      ['被水冲走、正在漂流的树枝', 0, '漂浮，受浮力。'],
    ], ['受到浮力', '不受浮力']);
  });

  /* ================= 称重法测浮力 ================= */
  PS.register('weigh-method', function (el) {
    const VW = 1000, VH = 540, SX = 240, L = 110, MAX = 5, LEVEL = 410, BX = 150, BW = 180, BTOP = 360, BBOT = 528, HB = 70, WB = 56;
    const st = { mode: 'water', liq: 'water', hcm: -3, Fh: 0, G: 2.7, Fw: 1.0, name: '铝块', mat: 'al', shown: 2.7 };
    const mSeg = PS.ui.seg([{ value: 'water', label: '把物体浸入液体中' }, { value: 'hand', label: '用手向上托物体' }], st.mode, (v) => { st.mode = v; ctl(); tell(); });
    const lSeg = PS.ui.seg(['water', 'salt', 'alcohol'].map((k) => ({ value: k, label: PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; tell(); });
    el.append(PS.ui.row(mSeg.el, lSeg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sH = PS.ui.slider({ label: '浸入深度 h', min: -3, max: 10, step: 0.5, value: st.hcm, unit: 'cm', onInput: (v) => { st.hcm = v; tell(); } });
    const sF = PS.ui.slider({ label: '手向上托的力 F手', min: 0, max: 2.7, step: 0.1, value: 0, unit: 'N', fmt: (v) => PS.fmt(v, 1), onInput: (v) => { st.Fh = v; tell(); } });
    sH.el.classList.add('wide'); sF.el.classList.add('wide');
    const msg = h('div', { class: 'fc-msg' });
    const iG = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: 'G' });
    const iF = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: 'F示' });
    const iB = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: 'F浮' });
    const fb = h('div', { class: 'fc-msg' });
    const quiz = h('div', { class: 'fc-q' }, h('div', { html: '<b>练一练：</b>先读出物体在空气中时测力计的示数 G，再把物体<b>浸没</b>在液体中读出示数 F示，算出浮力。' }),
      h('div', { class: 'fc-ans' }, 'G =', iG, 'N　F示 =', iF, 'N　F浮 =', iB, 'N', PS.ui.button('核对', check, 'btn btn-primary btn-sm'), PS.ui.button('换一个物体', newObj, 'btn btn-ghost btn-sm')), fb);
    el.append(PS.ui.row(sH.el), PS.ui.row(sF.el), msg, quiz);
    const rho = () => PS.LIQ[st.liq].rho / 1000;
    const Fb = () => (st.mode === 'water' ? st.Fw * rho() * PS.clamp(st.hcm / 7, 0, 1) : 0);
    const target = () => PS.round(st.G - (st.mode === 'water' ? Fb() : st.Fh), 3);
    function ctl() { sH.el.style.display = st.mode === 'water' ? '' : 'none'; sF.el.style.display = st.mode === 'hand' ? '' : 'none'; lSeg.el.style.display = st.mode === 'water' ? '' : 'none'; }
    function tell() {
      let s, c = 'info';
      if (st.mode === 'hand') {
        s = '用手向上托' + st.name + '，测力计的示数从 G 减小为 F示 = G − F手。物体浸在液体中时示数也会变小——液体对物体也有一个<b>向上托</b>的力，这就是<b>浮力</b>。';
      } else if (st.hcm <= 0) {
        s = st.name + '在空气中，测力计的示数等于它的重力 G。慢慢增大 h，把它浸入' + PS.LIQ[st.liq].name + '中，观察示数的变化。';
      } else if (st.hcm < 7) {
        s = st.name + '有一部分浸在' + PS.LIQ[st.liq].name + '中，测力计的示数<b>变小</b>了：物体受到竖直向上的浮力。浸入得越多，示数越小。';
      } else {
        s = st.name + '<b>浸没</b>在' + PS.LIQ[st.liq].name + '中。受力平衡：G = F浮 + F示，所以 <b>F浮 = G − F示</b>（<b>称重法</b>）。继续增大深度，示数' + (st.hcm > 7 ? '<b>不再变化</b>。' : '还会变吗？');
        c = 'ok';
      }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s;
    }
    function newObj() {
      const Fw = PS.pick([0.5, 1.0, 1.5]);
      let G;
      do G = PS.randInt(18, 30) / 10; while (G / Fw < 1.6);
      st.G = G; st.Fw = Fw; st.name = PS.pick(['金属块', '石块', '合金块']); st.mat = st.name === '石块' ? 'stone' : PS.pick(['al', 'fe', 'cu']);
      sF.input.max = G; if (st.Fh > G) sF.set(G, true);
      st.Fh = Math.min(st.Fh, G); sF.set(st.Fh, true);
      [iG, iF, iB].forEach((x) => { x.value = ''; x.disabled = false; });
      fb.className = 'fc-msg'; fb.innerHTML = '换了一个' + st.name + '。先读出它在空气中的示数。';
      sH.set(-3); mSeg.set('water');
    }
    function check() {
      const p = (x) => parseFloat(String(x.value).replace(/[，,\s]/g, ''));
      const g = p(iG), f = p(iF), b = p(iB);
      if ([g, f, b].some(isNaN)) { fb.className = 'fc-msg bad'; fb.innerHTML = '三个空都要填。'; return; }
      if (st.mode !== 'water' || st.hcm < 7) { fb.className = 'fc-msg bad'; fb.innerHTML = '先把物体<b>浸没</b>在液体中（h ≥ 7 cm）再读示数 F示。'; return; }
      const T = target(), errs = [];
      if (Math.abs(g - st.G) > 0.051) errs.push('G 读错了（物体在空气中时的示数）');
      if (Math.abs(f - T) > 0.051) errs.push('F示 读错了（看放大图中指针对准的刻度，分度值 0.1 N）');
      if (Math.abs(b - (g - f)) > 0.051) errs.push('F浮 应该等于 G − F示');
      if (errs.length) { fb.className = 'fc-msg bad'; fb.innerHTML = '✘ ' + errs.join('；') + '。'; PS.sound.bad(); return; }
      fb.className = 'fc-msg ok'; fb.innerHTML = '✔ 正确！F浮 = G − F示 = ' + PS.fmt(st.G, 1) + ' N − ' + PS.fmt(T, 1) + ' N = <b>' + PS.fmt(st.G - T, 1) + ' N</b>。';
      PS.sound.good();
    }
    const loop = PS.loop((dt) => {
      const T = target();
      if (Math.abs(st.shown - T) > 1e-4) { st.shown += (T - st.shown) * Math.min(1, dt * 7); if (Math.abs(st.shown - T) < 2e-3) st.shown = T; S.render(); }
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const Fs = st.shown, water = st.mode === 'water';
      const bBot = water ? LEVEL + st.hcm * 10 : LEVEL - 40, bTop = bBot - HB, hookY = bTop - 23;
      const ringY = hookY - 96 - L - (Fs / MAX) * L, cx = SX - 7;
      // 桌面和铁架台
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(40, BBOT, 420, 12);
      ctx.fillStyle = '#495057'; ctx.fillRect(SX + 130, 0, 8, BBOT); ctx.fillRect(SX + 100, BBOT - 8, 70, 8);
      ctx.fillRect(SX - 4, ringY - 22, SX + 134 - (SX - 4), 6);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SX, ringY - 16); ctx.lineTo(SX, ringY - 12); ctx.stroke();
      // 烧杯
      if (water) { FL.vessel(ctx, BX, BTOP, BW, BBOT - BTOP, { part: 'back' }); }
      // 物体
      const hk = FO.scale(ctx, { x: SX, y: ringY, max: MAX, div: 0.1, L, F: Fs, w: 64, F2: F, fs: Math.min(F(12), 20) });
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hk.hook.x, hk.hook.y - 2); ctx.lineTo(cx, bTop - 13); ctx.stroke();
      FL.metal(ctx, cx, bTop, WB, HB, st.mat, { label: st.name, fs: F(12) });
      if (water) {
        FL.water(ctx, BX, BTOP, BW, BBOT - BTOP, LEVEL - Math.max(0, Math.min(st.hcm, 7)) * 0.35, st.liq);
        FL.vessel(ctx, BX, BTOP, BW, BBOT - BTOP, { part: 'front' });
        if (st.hcm > 0) { ctx.save(); ctx.strokeStyle = '#1864ab'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx + WB / 2, bBot); ctx.lineTo(cx + WB / 2 + 34, bBot); ctx.stroke(); ctx.restore(); D.text(ctx, 'h = ' + PS.fmt(st.hcm, 1) + ' cm', cx + WB / 2 + 36, bBot + 5, { size: F(12), weight: 700, color: '#1864ab' }); }
      } else {
        FL.hand(ctx, cx, bBot + 2, -Math.PI / 2, { s: 1.3 });
      }
      // 放大读数
      FO.scaleZoom(ctx, Fs, { x: 470, y: 46, w: 180, h: 200, max: MAX, div: 0.1, F2: F });
      // 受力分析
      const fx = 820, fy = 250;
      D.text(ctx, '物体的受力', fx, 40, { size: F(15), weight: 800, color: '#1b2333', align: 'center' });
      ctx.fillStyle = 'rgba(173,181,189,.5)'; ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; D.roundRect(ctx, fx - 32, fy - 30, 64, 60, 6); ctx.fill(); ctx.stroke();
      const up2 = water ? Fb() : st.Fh;
      FL.forces(ctx, fx, fy, [{ n: 'G', v: st.G, c: FC.G, side: 1 }, { n: 'F示', v: Fs, c: FC.T, up: true }, { n: water ? 'F浮' : 'F手', v: up2, c: water ? FC.B : FC.F, up: true }], { k: 52, F, values: false, gap: 34 });
      D.text(ctx, water ? 'G = F浮 + F示' : 'G = F手 + F示', fx, VH - 70, { size: F(16), weight: 800, color: '#1b2333', align: 'center', bg: 'rgba(255,255,255,.9)' });
      if (water) D.text(ctx, '称重法：F浮 = G − F示', fx, VH - 70 + F(16) * 1.6, { size: F(15), weight: 800, color: FC.B, align: 'center', bg: 'rgba(255,255,255,.9)' });
    }
    ctl(); tell(); loop.start();
    fb.innerHTML = '分度值 0.1 N。读数时看右边的放大图。';
  });

  /* ================= 浮力产生的原因 ================= */
  PS.register('buoy-cause', function (el) {
    const VW = 1000, VH = 460, TX = 90, TW = 520, TT = 50, TB = 446, LV = 100, PXC = 10;
    const st = { k: 'cube', liq: 'water', h1: 8, ori: 'v', dep: 12, ph: 0, lv: 342, nk: 380, by: 320, bv: 0, basin: 0, t: 0 };
    const seg = PS.ui.seg([{ value: 'cube', label: '压力差' }, { value: 'film', label: '两端蒙橡皮膜的圆筒' }, { value: 'ball', label: '不会上浮的乒乓球' }], st.k, (v) => { st.k = v; ctl(); tell(); });
    seg.el.style.flexWrap = 'wrap';
    const lSeg = PS.ui.seg(['water', 'salt', 'alcohol'].map((k) => ({ value: k, label: PS.LIQ[k].name })), st.liq, (v) => { st.liq = v; tell(); });
    el.append(PS.ui.row(seg.el));
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const s1 = PS.ui.slider({ label: '上表面的深度 h₁', min: -6, max: 18, step: 1, value: st.h1, unit: 'cm', onInput: (v) => { st.h1 = v; tell(); } });
    const oSeg = PS.ui.seg([{ value: 'h', label: '水平放置' }, { value: 'v', label: '竖直放置' }], st.ori, (v) => { st.ori = v; tell(); });
    const s2 = PS.ui.slider({ label: '圆筒中心的深度', min: 12, max: 20, step: 1, value: st.dep, unit: 'cm', onInput: (v) => { st.dep = v; tell(); } });
    const pourB = PS.ui.button('① 向瓶中倒水', () => { if (st.ph === 0) { st.ph = 1; tell(); } }, 'btn btn-sm');
    const plugB = PS.ui.button('② 用手堵住瓶口', () => { if (st.ph === 2) { st.ph = 3; tell(); } }, 'btn btn-sm');
    const resetB = PS.ui.button('重来', () => { Object.assign(st, { ph: 0, lv: 342, nk: 380, by: 320, bv: 0, basin: 0 }); tell(); }, 'btn btn-ghost btn-sm');
    const rd = { p1: PS.ui.readout('上表面的压强 p₁', '—'), p2: PS.ui.readout('下表面的压强 p₂', '—'), f1: PS.ui.readout('F向下 = p₁S', '—'), f2: PS.ui.readout('F向上 = p₂S', '—'), fb: PS.ui.readout('F浮 = F向上 − F向下', '—') };
    const rbox = h('div', { class: 'fl-read' }, Object.values(rd).map((r) => r.el));
    const c1 = h('div', null, PS.ui.row(lSeg.el), PS.ui.row(s1.el), rbox);
    const c2 = h('div', null, PS.ui.row(oSeg.el, s2.el));
    const c3 = h('div', null, PS.ui.row(pourB, plugB, resetB));
    const msg = h('div', { class: 'fc-msg' });
    el.append(c1, c2, c3, msg);
    function ctl() { c1.style.display = st.k === 'cube' ? '' : 'none'; c2.style.display = st.k === 'film' ? '' : 'none'; c3.style.display = st.k === 'ball' ? '' : 'none'; }
    const rho = () => PS.LIQ[st.liq].rho;
    function tell() {
      let s, c = 'info';
      if (st.k === 'cube') {
        const r = rho(), h1 = Math.max(0, st.h1) / 100, h2 = (st.h1 + 10) / 100, Sa = 0.01;
        const p1 = r * 10 * h1, p2 = r * 10 * h2, f1 = p1 * Sa, f2 = p2 * Sa;
        rd.p1.set(PS.fmt(p1, 0) + ' Pa'); rd.p2.set(PS.fmt(p2, 0) + ' Pa'); rd.f1.set(PS.fmt(f1, 1) + ' N'); rd.f2.set(PS.fmt(f2, 1) + ' N'); rd.fb.set('<span style="color:' + FC.B + '">' + PS.fmt(f2 - f1, 1) + ' N</span>');
        if (st.h1 < 0) { s = '正方体（棱长 10 cm）有一部分露出液面，上表面<b>不受液体的压力</b>：F浮 = F向上 = ' + PS.fmt(f2, 1) + ' N，比浸没时小。'; }
        else { s = '左右（前后）两个侧面在同一深度受到的压强相等，压力<b>相互抵消</b>；下表面比上表面深，<b>F向上 > F向下</b>，压力差就是浮力：F浮 = F向上 − F向下 = ' + PS.fmt(f2 - f1, 1) + ' N。改变深度，F浮 <b>不变</b>（两个压力同时增大）。'; c = 'ok'; }
      } else if (st.k === 'film') {
        s = st.ori === 'h' ? '水平放置：两端的橡皮膜在<b>同一深度</b>，凹陷程度<b>相同</b>——两端受到的压力大小相等、方向相反，相互抵消。' : '竖直放置：<b>下端</b>的橡皮膜比上端深，凹陷得<b>更厉害</b>——向上的压力大于向下的压力，二者的差就是向上的浮力。';
        c = st.ori === 'v' ? 'ok' : 'info';
      } else {
        s = ['把去底的饮料瓶倒过来，瓶口朝下，在瓶颈处放一个乒乓球。', '往瓶中倒水……', '乒乓球<b>不上浮</b>！有少量水从瓶口流出，乒乓球下面<b>没有水</b>，只受到水向下的压力，没有向上的压力，所以不受浮力。', '用手堵住瓶口，流下的水积在乒乓球下面……', '乒乓球下面有了水，受到水<b>向上的压力</b>，且大于向下的压力——产生了浮力，乒乓球上浮！', '乒乓球浮在水面上。浮力是液体对物体<b>向上和向下的压力差</b>产生的。'][st.ph];
        c = st.ph >= 4 ? 'ok' : st.ph === 2 ? 'bad' : 'info';
        pourB.disabled = st.ph !== 0; plugB.disabled = st.ph !== 2;
      }
      msg.className = 'fc-msg ' + c; msg.innerHTML = s; S.render();
    }
    const loop = PS.loop((dt) => {
      if (st.k !== 'ball') return;
      st.t += dt;
      let ch = false;
      if (st.ph === 1) { st.lv = Math.max(160, st.lv - dt * 80); st.basin = Math.min(1, st.basin + dt * 0.02); if (st.lv <= 160) { st.ph = 2; tell(); } ch = true; }
      else if (st.ph === 2) { st.basin = Math.min(1, st.basin + dt * 0.03); ch = true; }
      else if (st.ph === 3) { st.nk = Math.max(334, st.nk - dt * 30); if (st.nk <= 334) { st.ph = 4; tell(); } ch = true; }
      else if (st.ph === 4) { st.bv -= dt * 260; st.bv *= 1 - dt * 1.6; st.by += st.bv * dt; if (st.by <= st.lv - 14) { st.by = st.lv - 14; st.ph = 5; tell(); } ch = true; }
      else if (st.ph === 5) { st.by = st.lv - 14 + Math.sin(st.t * 3) * 1.2; ch = true; }
      if (ch) S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.k === 'cube') drawCube(ctx, F); else if (st.k === 'film') drawFilm(ctx, F); else drawBall(ctx, F);
    }
    function tank(ctx, F) {
      FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'back' });
    }
    function drawCube(ctx, F) {
      tank(ctx, F);
      const r = rho() / 1000, x0 = 300, top = LV + st.h1 * PXC, bot = top + 100, KP = 12; // 每 kPa 的箭头长度
      const pAt = (y) => Math.max(0, (y - LV) / PXC) * r * 0.1; // kPa
      const cg = ctx.createLinearGradient(x0, 0, x0 + 100, 0); cg.addColorStop(0, '#adb5bd'); cg.addColorStop(0.5, '#e9ecef'); cg.addColorStop(1, '#adb5bd');
      ctx.fillStyle = cg; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.6; ctx.fillRect(x0, top, 100, 100); ctx.strokeRect(x0, top, 100, 100);
      FL.water(ctx, TX, TT, TW, TB - TT, LV, st.liq);
      FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'front' });
      // 侧面
      for (let y = Math.max(top, LV) + 8; y < bot; y += 18) {
        const L = 6 + pAt(y) * KP;
        D.arrow(ctx, x0 - L - 4, y, x0 - 1, y, { color: '#1c7ed6', width: 1.8, head: 7 });
        D.arrow(ctx, x0 + 100 + L + 4, y, x0 + 101, y, { color: '#1c7ed6', width: 1.8, head: 7 });
      }
      if (st.h1 > 0) { const L = 6 + pAt(top) * KP; for (let x = x0 + 12; x < x0 + 100; x += 19) D.arrow(ctx, x, top - L - 4, x, top - 1, { color: '#e8590c', width: 2, head: 8 }); }
      { const L = 6 + pAt(bot) * KP; for (let x = x0 + 12; x < x0 + 100; x += 19) D.arrow(ctx, x, bot + L + 4, x, bot + 1, { color: FC.B, width: 2, head: 8 }); }
      // 深度标注
      ctx.save(); ctx.strokeStyle = '#495057'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + 100, top); ctx.lineTo(TX + TW - 40, top); ctx.moveTo(x0 + 100, bot); ctx.lineTo(TX + TW - 10, bot); ctx.stroke(); ctx.restore();
      if (st.h1 > 0) { D.arrow(ctx, TX + TW - 40, LV, TX + TW - 40, top, { color: '#495057', width: 1.3, head: 7, both: true }); D.text(ctx, 'h₁', TX + TW - 34, (LV + top) / 2 + 5, { size: F(14), weight: 700 }); }
      D.arrow(ctx, TX + TW - 10, LV, TX + TW - 10, bot, { color: '#495057', width: 1.3, head: 7, both: true }); D.text(ctx, 'h₂', TX + TW - 4, (LV + bot) / 2 + 5, { size: F(14), weight: 700 });
      // 右侧：两个压力的比较
      const Sa = 0.01, f1 = st.h1 > 0 ? r * 1e4 * (st.h1 / 100) * Sa : 0, f2 = r * 1e4 * ((st.h1 + 10) / 100) * Sa, k = 7, bx = 690, by = 400;
      D.text(ctx, '上、下表面受到的压力', 820, 46, { size: F(15), weight: 800, align: 'center' });
      const bar = (x, v, c, lab) => { ctx.fillStyle = c; ctx.fillRect(x, by - v * k, 60, v * k); D.text(ctx, lab, x + 30, by + F(14) * 1.3, { size: F(13), weight: 700, color: c, align: 'center' }); D.text(ctx, PS.fmt(v, 1) + ' N', x + 30, by - v * k - 6, { size: F(13), weight: 700, color: c, align: 'center' }); };
      bar(bx, f1, '#e8590c', 'F向下'); bar(bx + 90, f2, FC.B, 'F向上');
      ctx.fillStyle = 'rgba(47,158,68,.18)'; ctx.strokeStyle = FC.B; ctx.setLineDash([4, 3]); ctx.strokeRect(bx + 180, by - (f2 - f1) * k, 60, (f2 - f1) * k); ctx.fillRect(bx + 180, by - (f2 - f1) * k, 60, (f2 - f1) * k); ctx.setLineDash([]);
      D.text(ctx, 'F浮', bx + 210, by + F(14) * 1.3, { size: F(13), weight: 800, color: FC.B, align: 'center' });
      D.text(ctx, PS.fmt(f2 - f1, 1) + ' N', bx + 210, by - (f2 - f1) * k - 6, { size: F(13), weight: 800, color: FC.B, align: 'center' });
      ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx - 10, by); ctx.lineTo(bx + 250, by); ctx.stroke();
    }
    function drawFilm(ctx, F) {
      tank(ctx, F);
      const cx = 350, cy = LV + st.dep * PXC * 1.0, Lh = 90, R = 34, k = 0.5 * PS.LIQ.water.rho / 1000;
      const dent = (y) => Math.min(26, 2 + Math.max(0, (y - LV) / PXC) * k * 0.9);
      ctx.save();
      const tg = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(206,212,218,.7)'); g.addColorStop(0.5, 'rgba(248,249,250,.8)'); g.addColorStop(1, 'rgba(173,181,189,.7)'); return g; };
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2;
      const mem = (x0, y0, x1, y1, d, nx, ny) => { ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2 + nx * d * 2, (y0 + y1) / 2 + ny * d * 2, x1, y1); ctx.stroke(); };
      if (st.ori === 'h') {
        ctx.fillStyle = tg(0, cy - R, 0, cy + R); ctx.fillRect(cx - Lh, cy - R, 2 * Lh, 2 * R);
        ctx.strokeStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(cx - Lh, cy - R); ctx.lineTo(cx + Lh, cy - R); ctx.moveTo(cx - Lh, cy + R); ctx.lineTo(cx + Lh, cy + R); ctx.stroke();
        const d = dent(cy);
        mem(cx - Lh, cy - R, cx - Lh, cy + R, d, 1, 0); mem(cx + Lh, cy - R, cx + Lh, cy + R, d, -1, 0);
        D.arrow(ctx, cx - Lh - 60, cy, cx - Lh - 4, cy, { color: '#1c7ed6', width: 3, head: 10 }); D.arrow(ctx, cx + Lh + 60, cy, cx + Lh + 4, cy, { color: '#1c7ed6', width: 3, head: 10 });
      } else {
        ctx.fillStyle = tg(cx - R, 0, cx + R, 0); ctx.fillRect(cx - R, cy - Lh, 2 * R, 2 * Lh);
        ctx.strokeStyle = '#868e96'; ctx.beginPath(); ctx.moveTo(cx - R, cy - Lh); ctx.lineTo(cx - R, cy + Lh); ctx.moveTo(cx + R, cy - Lh); ctx.lineTo(cx + R, cy + Lh); ctx.stroke();
        const d1 = dent(cy - Lh), d2 = dent(cy + Lh);
        mem(cx - R, cy - Lh, cx + R, cy - Lh, d1, 0, 1); mem(cx - R, cy + Lh, cx + R, cy + Lh, d2, 0, -1);
        const k2 = 1.4;
        D.arrow(ctx, cx, cy - Lh - 14 - d1 * k2, cx, cy - Lh - 4, { color: '#e8590c', width: 3, head: 10 });
        D.arrow(ctx, cx, cy + Lh + 14 + d2 * k2, cx, cy + Lh + 4, { color: FC.B, width: 3, head: 10 });
      }
      ctx.restore();
      FL.water(ctx, TX, TT, TW, TB - TT, LV, 'water');
      FL.vessel(ctx, TX, TT, TW, TB - TT, { part: 'front' });
      D.text(ctx, st.ori === 'h' ? '两端凹陷程度相同' : '下端凹陷得更深', 820, 120, { size: F(17), weight: 800, align: 'center', color: st.ori === 'h' ? '#1864ab' : FC.B });
      D.text(ctx, '橡皮膜凹陷越深，', 820, 180, { size: F(14), align: 'center', color: '#495057' });
      D.text(ctx, '受到液体的压强越大', 820, 180 + F(14) * 1.4, { size: F(14), align: 'center', color: '#495057' });
    }
    function drawBall(ctx, F) {
      const cx = 330;
      const path = (c) => { c.beginPath(); c.moveTo(cx - 110, 90); c.lineTo(cx - 110, 290); c.bezierCurveTo(cx - 110, 320, cx - 22, 318, cx - 22, 340); c.lineTo(cx - 22, 380); c.lineTo(cx + 22, 380); c.lineTo(cx + 22, 340); c.bezierCurveTo(cx + 22, 318, cx + 110, 320, cx + 110, 290); c.lineTo(cx + 110, 90); };
      // 接水的盆
      if (st.ph < 3) {
        FL.vessel(ctx, 220, 404, 220, 46, { part: 'back' });
        if (st.basin > 0) FL.water(ctx, 220, 404, 220, 46, 448 - st.basin * 26, 'water');
        FL.vessel(ctx, 220, 404, 220, 46, { part: 'front' });
      }
      // 瓶中的水
      ctx.save(); path(ctx); ctx.closePath(); ctx.clip();
      const L = PS.LIQ.water;
      if (st.ph >= 1) { ctx.fillStyle = L.c; ctx.fillRect(cx - 120, st.lv, 240, Math.max(0, (st.ph >= 4 ? 382 : 338) - st.lv)); ctx.strokeStyle = L.c2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 120, st.lv); ctx.lineTo(cx + 120, st.lv); ctx.stroke(); }
      if (st.ph === 3) { ctx.fillStyle = L.c; ctx.fillRect(cx - 30, st.nk, 60, 382 - st.nk); }
      ctx.restore();
      if (st.ph === 1) { ctx.strokeStyle = 'rgba(77,171,247,.8)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx + 40, 30); ctx.quadraticCurveTo(cx + 30, 70, cx + 26, st.lv); ctx.stroke(); }
      if ((st.ph === 1 || st.ph === 2) && st.lv < 330) { ctx.strokeStyle = 'rgba(77,171,247,.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + 3, 380); ctx.lineTo(cx + 3, 446 - st.basin * 26); ctx.stroke(); }
      pingpong(ctx, cx, st.by, 30);
      PR.glass(ctx, (c) => { path(c); }, { width: 3 });
      if (st.ph >= 3 && st.ph < 6) FL.hand(ctx, cx, 384, -Math.PI / 2, { s: 1.2 });
      // 受力示意
      if (st.ph === 2) {
        D.arrow(ctx, cx - 50, st.by - 70, cx - 14, st.by - 30, { color: '#e8590c', width: 3, head: 10 });
        D.arrow(ctx, cx + 50, st.by - 70, cx + 14, st.by - 30, { color: '#e8590c', width: 3, head: 10 });
        D.text(ctx, '水对球向下的压力', cx + 130, 250, { size: F(14), weight: 700, color: '#e8590c' });
        D.text(ctx, '✘ 球下面没有水', cx + 130, 360, { size: F(14), weight: 700, color: '#e03131' });
        D.text(ctx, '没有向上的压力', cx + 130, 360 + F(14) * 1.4, { size: F(14), weight: 700, color: '#e03131' });
      }
      if (st.ph === 4 || st.ph === 5) FO.arrow(ctx, cx + 1, st.by, -Math.PI / 2, 70, { color: FC.B, label: 'F浮', F, labelSide: -1 });
      D.text(ctx, '去底的饮料瓶（瓶口朝下）', cx, 76, { size: F(13), weight: 700, color: '#495057', align: 'center' });
    }
    ctl(); tell(); loop.start();
  });

  /* ================= 把空饮料罐按入水中 ================= */
  PS.register('can-press', function (el, opts) {
    const VW = 1000, VH = 440, PXC = 13.6, CW = 90, CH = 163, SC = 34.2e-4, HC = 0.12, GC = 0.15;
    const full = opts.mode === 'full';
    const d0 = (GC / 1e4 / SC) * 100; // 漂浮时浸入的深度 cm
    const st = { d: full ? 0 : d0, dmax: full ? 0 : d0, flow: 0, pts: [], held: true, free: !full, v: 0 };
    const C = full ? { x: 250, w: 260, top: 150, bot: 420 } : { x: 210, w: 330, top: 120, bot: 420 };
    const A = Math.PI * Math.pow(C.w / 2 / PXC / 100, 2);
    const L0 = full ? C.top + 2 : 236;
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw });
    const sD = PS.ui.slider({ label: '饮料罐浸入水中的深度', min: 0, max: 16, step: 0.5, value: 0, unit: 'cm', fmt: (v) => PS.fmt(v, 1), onInput: (v) => { st.held = true; st.free = false; st.d = Math.max(v, full ? 0 : d0); upd(); } });
    sD.el.classList.add('wide');
    const relB = PS.ui.button('松手', () => { st.held = false; st.free = false; st.v = 0; }, 'btn btn-sm');
    const resetB = PS.ui.button('重来', () => { st.d = full ? 0 : d0; st.dmax = st.d; st.pts = []; st.held = true; st.free = !full; sD.set(0, true); upd(); }, 'btn btn-ghost btn-sm');
    const msg = h('div', { class: 'fc-msg' });
    el.append(PS.ui.row(sD.el, relB, resetB), msg, h('div', { class: 'small muted', style: { marginTop: '4px' } }, '也可以上下拖动画面中的饮料罐。'));
    const Vs = (d) => SC * PS.clamp(d / 100, 0, HC);
    const Fb = (d) => 1e4 * Vs(d);
    function level() { return full ? L0 + ((Vs(st.dmax) - Vs(st.d)) / A) * 100 * PXC : L0 - (Vs(st.d) / A) * 100 * PXC; }
    function upd() {
      if (st.d > st.dmax) { st.flow = 0.4; st.dmax = st.d; }
      const fb = Fb(st.d), Fh = fb - GC;
      if (!full) { st.pts.push([st.d, fb]); if (st.pts.length > 400) st.pts.shift(); }
      let s;
      if (st.free) s = '空饮料罐<b>漂浮</b>在水面上：F浮 = G = 0.15 N，只有很小一部分浸在水中。拖动滑块（或饮料罐）把它慢慢按入水中，体会手的感觉。';
      else if (!st.held) s = '松开手，饮料罐受到的浮力大于重力，向上浮起，最后<b>漂浮</b>在水面上（F浮 = G = 0.15 N）。';
      else if (st.d < 12) s = '浸入水中的体积越大，浮力越大，手要用更大的力才能按住：F手 = F浮 − G = <b>' + PS.fmt(Math.max(0, Fh), 2) + ' N</b>。' + (full ? '溢出的水也越来越多。' : '水面也在升高。');
      else s = '饮料罐已经<b>浸没</b>，再往下按，浸入的体积不再变化，浮力也<b>不再变化</b>（' + PS.fmt(fb, 2) + ' N），手的感觉不变。';
      if (full && st.held) s += '<br>溢出的水重 G溢 = <b>' + PS.fmt(1e4 * Vs(st.dmax), 2) + ' N</b>，与浮力 F浮 = ' + PS.fmt(fb, 2) + ' N ' + (Math.abs(st.dmax - st.d) < 1e-6 ? '<b>相等</b>！' : '比较一下（罐被提起了一些，浮力变小）。');
      msg.className = 'fc-msg ' + (st.d >= 12 ? 'ok' : 'info'); msg.innerHTML = s;
      S.render();
    }
    const canX = C.x + C.w / 2;
    PS.drag(S, {
      VW, VH,
      hit: (p) => { const bot = level() + st.d * PXC; return Math.abs(p.x - canX) < CW / 2 + 10 && p.y > bot - CH - 30 && p.y < bot + 10 ? { y0: p.y, d0: st.d } : null; },
      move: (o, p) => { st.held = true; st.free = false; st.d = PS.clamp(o.d0 + (p.y - o.y0) / PXC, full ? 0 : d0, 16); sD.set(Math.round(st.d * 2) / 2, true); upd(); },
    });
    const loop = PS.loop((dt) => {
      let ch = false;
      if (st.flow > 0) { st.flow -= dt; ch = true; }
      if (!st.held) {
        const a = ((GC - Fb(st.d)) / (0.015 + 0.5 * 1e3 * Vs(st.d))) * 100 - 6 * st.v;
        st.v += a * dt * 0.5; st.d = Math.max(0, st.d + st.v * dt * 0.5);
        if (Math.abs(st.d - d0) < 0.02 && Math.abs(st.v) < 0.05) { st.d = d0; st.v = 0; st.held = true; st.free = true; sD.set(Math.round(st.d * 2) / 2, true); }
        upd(); ch = false;
      }
      if (ch) S.render();
    }, el);
    function draw(ctx, w, hh) {
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const lv = level(), bot = lv + st.d * PXC, top = bot - CH;
      ctx.fillStyle = '#e9d8bd'; ctx.fillRect(40, C.bot, 900, 14);
      FL.vessel(ctx, C.x, C.top, C.w, C.bot - C.top, { part: 'back' });
      // 饮料罐
      const g = ctx.createLinearGradient(canX - CW / 2, 0, canX + CW / 2, 0);
      g.addColorStop(0, '#c92a2a'); g.addColorStop(0.4, '#ff8787'); g.addColorStop(1, '#a61e1e');
      ctx.fillStyle = g; D.roundRect(ctx, canX - CW / 2, top, CW, CH, 8); ctx.fill();
      ctx.fillStyle = '#ced4da'; ctx.fillRect(canX - CW / 2 + 4, top, CW - 8, 8); ctx.fillRect(canX - CW / 2 + 4, top + CH - 8, CW - 8, 8);
      ctx.fillStyle = '#fff'; ctx.font = PS.font(F(14), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('空罐', canX, top + CH / 2);
      FL.water(ctx, C.x, C.top, C.w, C.bot - C.top, lv, 'water');
      FL.vessel(ctx, C.x, C.top, C.w, C.bot - C.top, { part: 'front', spout: full ? 4 : null });
      if (st.held && !st.free) FL.hand(ctx, canX, top - 2, Math.PI / 2, { s: 1.4 });
      // 力
      const fb = Fb(st.d);
      if (fb > 0.005) FO.arrow(ctx, canX - 20, top + CH / 2, -Math.PI / 2, 10 + fb * 22, { color: FC.B, label: 'F浮 = ' + PS.fmt(fb, 2) + ' N', F, labelSide: 1 });
      if (st.held && !st.free && fb - GC > 0.01) FO.arrow(ctx, canX + 22, top + 12, Math.PI / 2, 10 + (fb - GC) * 22, { color: FC.F, label: 'F手', F, labelSide: -1 });
      if (!full) {
        D.text(ctx, '水面升高', C.x + C.w + 10, lv + 5, { size: F(12), color: '#1864ab', weight: 700 });
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#1864ab'; ctx.beginPath(); ctx.moveTo(C.x - 10, L0); ctx.lineTo(C.x + C.w + 8, L0); ctx.stroke(); ctx.restore();
        D.text(ctx, '原来的水面', C.x - 14, L0 + 4, { size: F(11), color: '#1864ab', align: 'right' });
        const ch = PS.dyn.chart(ctx, { x: 640, y: 80, w: 300, h: 230, xmax: 16, ymax: 5, xstep: 2, ystep: 1, xlab: 4, xl: '浸入深度/cm', yl: 'F浮/N', F, series: [{ pts: st.pts.slice().sort((a, b) => a[0] - b[0]), color: FC.B }] });
        ctx.fillStyle = FC.B; ctx.beginPath(); ctx.arc(ch.X(st.d), ch.Y(fb), 6, 0, TAU); ctx.fill();
        D.text(ctx, '罐高 12 cm', ch.X(12), 70, { size: F(11), color: '#868e96', align: 'center' });
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = '#adb5bd'; ctx.beginPath(); ctx.moveTo(ch.X(12), 76); ctx.lineTo(ch.X(12), 310); ctx.stroke(); ctx.restore();
      } else {
        // 溢出的水流进小烧杯（放在电子秤上）
        const bx = 640, bw = 120, btop = 250, bbot = 380;
        const vol = Vs(st.dmax) * 1e6; // cm³
        if (st.flow > 0) { ctx.strokeStyle = 'rgba(77,171,247,.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(C.x + C.w + 26, C.top + 22); ctx.quadraticCurveTo(C.x + C.w + 60, C.top + 40, bx + 40, bbot - 6 - vol * 0.25); ctx.stroke(); }
        FL.vessel(ctx, bx, btop, bw, bbot - btop, { part: 'back' });
        if (vol > 0.5) FL.water(ctx, bx, btop, bw, bbot - btop, bbot - 2 - vol * 0.25, 'water');
        FL.vessel(ctx, bx, btop, bw, bbot - btop, { part: 'front' });
        ctx.fillStyle = '#495057'; D.roundRect(ctx, bx - 20, bbot, bw + 40, 34, 6); ctx.fill();
        ctx.fillStyle = '#d3f9d8'; ctx.fillRect(bx + 10, bbot + 7, bw - 20, 20);
        ctx.fillStyle = '#1b2333'; ctx.font = PS.font(F(14), 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(PS.fmt(vol, 0) + ' g', bx + bw / 2, bbot + 17);
        D.text(ctx, '溢出的水', bx + bw / 2, btop - 12, { size: F(13), weight: 700, align: 'center', color: '#1864ab' });
        const k = 34, by = 210, x0 = 830;
        D.text(ctx, '比一比', x0 + 50, 46, { size: F(15), weight: 800, align: 'center' });
        ctx.fillStyle = FC.B; ctx.fillRect(x0, by - fb * k, 40, fb * k);
        ctx.fillStyle = '#4dabf7'; ctx.fillRect(x0 + 60, by - 1e4 * Vs(st.dmax) * k, 40, 1e4 * Vs(st.dmax) * k);
        D.text(ctx, 'F浮', x0 + 20, by + F(13) * 1.3, { size: F(13), weight: 800, color: FC.B, align: 'center' });
        D.text(ctx, 'G溢', x0 + 80, by + F(13) * 1.3, { size: F(13), weight: 800, color: '#1864ab', align: 'center' });
        ctx.strokeStyle = '#adb5bd'; ctx.beginPath(); ctx.moveTo(x0 - 8, by); ctx.lineTo(x0 + 110, by); ctx.stroke();
      }
    }
    upd(); loop.start();
  });
})();
