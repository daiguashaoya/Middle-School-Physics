/* 第4章第1节：光的直线传播——光源分类、激光在不同介质中的传播、影子与日食月食、小孔成像、排队与瞄准、光速、闪电与雷声。依赖 optics.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const O = PS.opt, V = O.V;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  /* ================= 光源分类 ================= */
  const SRC_ITEMS = [
    ['☀️ 太阳', 0, '太阳是恒星，自身能发光。'],
    ['🌟 夜空中的恒星（如北极星）', 0, '恒星自身能发光。'],
    ['正在发光的萤火虫', 0, '生物自身发光，是天然光源。'],
    ['深海里发光的水母', 0, '生物自身发光，是天然光源。'],
    ['⚡ 闪电', 0, '自然界的放电现象，自身发光。'],
    ['🕯️ 点燃的蜡烛', 1, '人类制造的发光物体。'],
    ['💡 亮着的电灯', 1, '人类制造的发光物体。'],
    ['通电的霓虹灯', 1, '人类制造的发光物体。'],
    ['📺 正在播放节目的电视屏幕', 1, '屏幕自身在发光。'],
    ['正在工作的激光笔', 1, '人类制造的发光物体。'],
    ['🌙 月亮', 2, '月亮本身不发光，我们看到的是它<b>反射</b>的太阳光。'],
    ['夜空中明亮的金星', 2, '金星是行星，本身不发光，反射太阳光。'],
    ['💎 闪闪发光的钻石', 2, '钻石本身不发光，是把别处的光反射、折射到我们眼中。'],
    ['阳光下“反光”的镜子', 2, '镜子只是反射太阳光，本身不发光。'],
    ['自行车尾灯（红色反光片）', 2, '反光片本身不发光，是把后面汽车的灯光反射回去。'],
    ['电影院的银幕', 2, '银幕反射放映机发出的光，本身不发光。'],
    ['关着的电灯', 2, '没有通电时不发光，不是光源——正在发光时才是光源。'],
  ];
  PS.register('light-sources', function (el) {
    PS.sortCards(el, SRC_ITEMS, ['天然光源', '人造光源', '不是光源']);
  });

  /* ================= 激光在不同介质中的传播 ================= */
  const MEDIA = {
    air: { name: '空气', tank: false },
    water: { name: '水', tank: 'water' },
    glass: { name: '玻璃砖', tank: 'glass' },
    sugar: { name: '不均匀的糖水', tank: 'sugar' },
    stir: { name: '搅拌后的糖水', tank: 'stir' },
  };
  PS.register('laser-media', function (el) {
    const VW = 1000, VH = 440;
    const TX0 = 310, TX1 = 690, TY0 = 120, TY1 = 380; // 水槽（玻璃砖）范围
    const SCR = 930;
    const st = { m: 'air', smoke: false, milk: true, model: false, y: 205, t: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg(Object.keys(MEDIA).map((k) => ({ value: k, label: MEDIA[k].name })), st.m, (v) => { st.m = v; upd(); });
    const smokeT = PS.ui.toggle('在空气中喷烟雾', false, (v) => { st.smoke = v; upd(); });
    const milkT = PS.ui.toggle('在水中滴几滴牛奶', true, (v) => { st.milk = v; upd(); });
    const modelT = PS.ui.toggle('用“光线”表示', false, (v) => { st.model = v; upd(); });
    const hs = PS.ui.slider({ label: '激光笔高度', min: 140, max: 360, step: 1, value: st.y, fmt: () => '', onInput: (v) => { st.y = v; upd(); } });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el), PS.ui.row(smokeT.el, milkT.el, modelT.el, hs.el), msg);
    // 不均匀糖水：下面浓、上面稀（折射率下大上小，变化集中在中间一层；为便于观察作了夸大）
    const nSugar = (x, y) => 1.33 + 0.55 / (1 + Math.exp(-(y - 255) / 38));
    function path() {
      const m = st.m, p0 = { x: 112, y: st.y };
      const pts = [p0], segs = [];
      const tank = MEDIA[m].tank;
      if (!tank) { pts.push({ x: SCR, y: st.y }); segs.push(['air', 0, 1]); return { pts, segs }; }
      pts.push({ x: TX0, y: st.y }); segs.push(['air', 0, 1]);
      if (tank === 'sugar') {
        const tr = PS.traceGrad({ x: TX0, y: st.y }, { x: 1, y: 0 }, nSugar, { ds: 3, steps: 400, stop: (p) => p.x >= TX1 || p.y >= TY1 - 2 });
        const i0 = pts.length - 1;
        tr.slice(1).forEach((p) => pts.push(p));
        segs.push(['in', i0, pts.length - 1]);
        const end = pts[pts.length - 1];
        if (end.x >= TX1) {
          const d = O.refract(tr.dir, { x: -1, y: 0 }, nSugar(end.x, end.y), 1);
          if (d) { const hit = { x: SCR, y: end.y + (d.y / d.x) * (SCR - end.x) }; pts.push(hit); segs.push(['air', pts.length - 2, pts.length - 1]); }
        } else pts.end = 'bottom';
        return { pts, segs };
      }
      pts.push({ x: TX1, y: st.y }); segs.push(['in', 1, 2]);
      pts.push({ x: SCR, y: st.y }); segs.push(['air', 2, 3]);
      return { pts, segs };
    }
    function upd() {
      smokeT.set(st.smoke); milkT.set(st.milk);
      const m = st.m, k = MEDIA[m].tank;
      let t, c = 'info';
      if (!k) t = st.smoke ? '烟雾中的小颗粒把光反射到我们眼中，显示出光的传播路径——光在空气中沿<b>直线</b>传播。' : '在空气中看不到激光的传播路径，只能看到光屏上的亮点。在空气中<b>喷一些烟雾</b>试试？（转换法）';
      else if (k === 'water' || k === 'glass') t = (k === 'water' && !st.milk ? '水中的光路看不太清楚，滴几滴牛奶试试。' : '') + '光在' + MEDIA[m].name + '中也沿<b>直线</b>传播。';
      else if (k === 'sugar') { t = '😮 在<b>不均匀</b>的糖水中（下面浓、上面稀），光的传播路径<b>弯曲</b>了！'; c = 'bad'; }
      else { t = '搅拌后糖水变得<b>均匀</b>，光又沿直线传播了。结论：光在<b>同种均匀介质</b>中沿直线传播。'; c = 'ok'; }
      if (st.model) t += '<br>📐 用一条带箭头的直线表示光的传播路径和方向，这样的直线叫做<b>光线</b>。光线是为了研究方便而建立的<b>物理模型</b>，实际上并不存在。';
      msg.className = 'feedback show ' + c; msg.innerHTML = t;
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      PS.darkRoom(ctx, VW, VH);
      ctx.fillStyle = '#2b3445'; ctx.fillRect(0, 395, VW, 45);
      const m = st.m, tank = MEDIA[m].tank;
      // 烟雾
      if (st.smoke) {
        for (let i = 0; i < 70; i++) {
          const x = (i * 137.5 + st.t * (8 + (i % 5) * 3)) % VW, y = 60 + ((i * 61.7) % 330) + Math.sin(st.t + i) * 8;
          ctx.fillStyle = 'rgba(200,210,225,.05)'; ctx.beginPath(); ctx.arc(x, y, 30 + (i % 4) * 10, 0, TAU); ctx.fill();
        }
      }
      // 水槽 / 玻璃砖
      if (tank) {
        if (tank === 'glass') {
          ctx.fillStyle = 'rgba(165,216,255,.22)'; ctx.fillRect(TX0, TY0 + 20, TX1 - TX0, TY1 - TY0 - 20);
          ctx.strokeStyle = 'rgba(165,216,255,.8)'; ctx.lineWidth = 2; ctx.strokeRect(TX0, TY0 + 20, TX1 - TX0, TY1 - TY0 - 20);
          D.text(ctx, '厚玻璃砖', (TX0 + TX1) / 2, TY1 + 8, { size: F(13), weight: 700, color: '#a5d8ff', align: 'center', baseline: 'top' });
        } else {
          const wy = TY0 + 20;
          if (tank === 'sugar') {
            const g = ctx.createLinearGradient(0, wy, 0, TY1);
            g.addColorStop(0, st.milk ? 'rgba(200,220,240,.22)' : 'rgba(116,192,252,.18)'); g.addColorStop(0.45, st.milk ? 'rgba(210,225,240,.3)' : 'rgba(116,192,252,.22)'); g.addColorStop(0.7, st.milk ? 'rgba(235,225,200,.42)' : 'rgba(250,220,150,.3)'); g.addColorStop(1, st.milk ? 'rgba(245,230,195,.55)' : 'rgba(250,210,130,.42)');
            ctx.fillStyle = g;
          } else ctx.fillStyle = st.milk || tank === 'stir' ? 'rgba(205,222,240,.3)' : 'rgba(116,192,252,.2)';
          ctx.fillRect(TX0, wy, TX1 - TX0, TY1 - wy);
          if (tank === 'sugar') { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 26; i++) { ctx.fillRect(TX0 + 20 + ((i * 53) % 340), TY1 - 6 - (i % 3) * 4, 6, 4); } }
          ctx.strokeStyle = 'rgba(165,216,255,.85)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(TX0, TY0); ctx.lineTo(TX0, TY1); ctx.lineTo(TX1, TY1); ctx.lineTo(TX1, TY0); ctx.stroke();
          ctx.strokeStyle = 'rgba(165,216,255,.5)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(TX0, wy); ctx.lineTo(TX1, wy); ctx.stroke();
          D.text(ctx, tank === 'sugar' ? '上稀下浓的糖水（不均匀）' : tank === 'stir' ? '搅拌均匀的糖水' : st.milk ? '水（滴了几滴牛奶）' : '水', (TX0 + TX1) / 2, TY1 + 8, { size: F(13), weight: 700, color: '#a5d8ff', align: 'center', baseline: 'top' });
          if (tank === 'sugar') { D.text(ctx, '稀', TX1 + 12, wy + 30, { size: F(13), weight: 800, color: '#ced4da' }); D.text(ctx, '浓', TX1 + 12, TY1 - 10, { size: F(13), weight: 800, color: '#ffd8a8' }); }
        }
      }
      // 光屏
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(SCR, 70, 14, 320);
      D.text(ctx, '光屏', SCR + 7, 62, { size: F(13), weight: 700, color: '#ced4da', align: 'center' });
      // 激光
      const { pts, segs } = path();
      const visIn = tank === 'glass' ? 0.75 : tank && tank !== 'glass' ? (st.milk ? 1 : 0.18) : 0;
      segs.forEach(([kind, a, b]) => {
        const sub = pts.slice(a, b + 1);
        const vis = kind === 'air' ? (st.smoke ? 0.95 : 0.06) : visIn;
        if (vis > 0) PS.beam(ctx, sub, { color: PS.LIGHT.laser, width: 2.4, glow: 'rgba(255,60,60,.25)', alpha: vis });
      });
      const last = pts[pts.length - 1];
      // 光斑
      const g = ctx.createRadialGradient(last.x, last.y, 1, last.x, last.y, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,60,60,.95)'); g.addColorStop(1, 'rgba(255,60,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(last.x, last.y, 16, 0, TAU); ctx.fill();
      if (st.model) {
        PS.beam(ctx, pts, { color: '#ffe066', width: 1.6, arrow: false });
        segs.forEach(([, a, b]) => {
          const sub = pts.slice(a, b + 1);
          if (sub.length === 2) { const m = V.lerp(sub[0], sub[1], 0.55); PS.arrowHead(ctx, m.x, m.y, V.ang(V.sub(sub[1], sub[0])), 14, '#ffe066'); }
          else if (sub.length > 4) { const k = Math.floor(sub.length / 2); PS.arrowHead(ctx, sub[k].x, sub[k].y, V.ang(V.sub(sub[k + 1], sub[k - 1])), 14, '#ffe066'); }
        });
      }
      PS.drawLaser(ctx, 112, st.y, 0, { len: 80, w: 16 });
      D.text(ctx, '激光笔', 70, st.y - 18, { size: F(12), weight: 700, color: '#ced4da', align: 'center' });
      ctx.restore();
    }
    upd();
    loop.start();
  });

  /* ================= 影子、日食和月食 ================= */
  PS.register('shadow', function (el) {
    const VW = 1000, VH = 470;
    const GY = 420, WX = 900; // 地面、墙
    const st = { mode: 'shadow', L: { x: 190, y: 120 }, ox: 450, big: false, moon: 0, t: 0 };
    const OH = 120; // 物体高度
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'shadow', label: '影子的形成' }, { value: 'solar', label: '日食' }, { value: 'lunar', label: '月食' }], st.mode, (v) => { st.mode = v; st.moon = 0; ms.set(0, true); upd(); });
    const bigT = PS.ui.toggle('换成较大的光源（拓展：本影和半影）', false, (v) => { st.big = v; upd(); });
    const ms = PS.ui.slider({ label: '月球位置', min: -100, max: 100, step: 1, value: 0, fmt: () => '', onInput: (v) => { st.moon = v; upd(); } });
    const rL = PS.ui.readout('影子长度', '—', 'accent');
    const msg = h('div', { class: 'feedback show info' });
    const row2 = PS.ui.row(bigT.el), row3 = PS.ui.row(ms.el);
    el.append(PS.ui.row(seg.el), row2, row3, h('div', { class: 'readouts' }, rL.el), msg);
    PS.drag(S, {
      VW, VH,
      hit: (p) => st.mode !== 'shadow' ? null : V.dist(p, st.L) < 34 ? 'L' : Math.abs(p.x - st.ox) < 30 && p.y > GY - OH - 30 && p.y < GY ? 'O' : null,
      move: (k, p) => {
        if (k === 'L') { st.L.x = PS.clamp(p.x, 40, WX - 60); st.L.y = PS.clamp(p.y, 50, GY - 30); }
        else st.ox = PS.clamp(p.x, 120, WX - 40);
        if (Math.abs(st.L.x - st.ox) < 30) st.L.x = st.ox + (st.L.x < st.ox ? -30 : 30);
        upd();
      },
    });
    // 光源上的取样点（点光源只有 1 个点）
    const srcPts = () => {
      if (!st.big) return [st.L];
      const a = []; for (let i = 0; i < 25; i++) a.push({ x: st.L.x, y: st.L.y - 34 + (68 * i) / 24 }); return a;
    };
    // 物体：竖直细杆（画成小朋友），被挡住的条件：线段与物体相交
    const blocked = (P, Sp) => {
      const top = { x: st.ox, y: GY - OH }, bot = { x: st.ox, y: GY };
      const d = V.sub(P, Sp), L = V.len(d);
      const hit = O.raySeg(Sp, V.mul(d, 1 / L), top, bot);
      return hit && hit.t < L - 0.5;
    };
    // 地面、墙上的取样点及照度
    function lightMap() {
      const sp = srcPts();
      const ground = [], wall = [];
      for (let x = 20; x <= WX; x += 4) { const P = { x, y: GY }; let v = 0; sp.forEach((s) => { if (!blocked(P, s)) v++; }); ground.push([x, v / sp.length]); }
      for (let y = GY; y >= 40; y -= 4) { const P = { x: WX, y }; let v = 0; sp.forEach((s) => { if (!blocked(P, s)) v++; }); wall.push([y, v / sp.length]); }
      return { ground, wall };
    }
    function shadowLen(map) {
      let g = 0, wl = 0;
      map.ground.forEach(([x, v]) => { if (v < 0.5 && Math.sign(x - st.ox) === Math.sign(st.ox - st.L.x)) g += 4; });
      map.wall.forEach(([, v]) => { if (v < 0.5) wl += 4; });
      return { g, wl };
    }
    function upd() {
      row2.style.display = st.mode === 'shadow' ? '' : 'none';
      row3.style.display = st.mode === 'shadow' ? 'none' : '';
      rL.el.style.display = st.mode === 'shadow' ? '' : 'none';
      let t;
      if (st.mode === 'shadow') {
        const s = shadowLen(lightMap());
        rL.set((s.g * 1.5 / OH).toFixed(1) + ' m（地面）' + (s.wl > 4 ? ' + ' + (s.wl * 1.5 / OH).toFixed(1) + ' m（墙上）' : ''));
        t = st.big
          ? '光源较大时，影子中间最暗的部分叫<b>本影</b>（光源发出的光全部被挡住）；边缘较淡的部分叫<b>半影</b>（只有一部分光被挡住）。手术室的无影灯就是用很多灯从不同方向照射，使影子变得很淡。'
          : '光在同种均匀介质中沿直线传播，遇到<b>不透明</b>的物体时，在物体后面光照不到的区域形成影子。拖动<b>灯泡</b>或<b>小朋友</b>试试：光源越高，地面上的影子越短；人离墙越远（离光源越近），墙上的影子越大。';
      } else if (st.mode === 'solar') {
        t = '<b>日食</b>：月球运行到太阳和地球之间，三者大致在一条直线上，月球挡住了射向地球的太阳光。地球上处在月球<b>本影</b>里的人看到<b>日全食</b>，处在<b>半影</b>里的人看到<b>日偏食</b>。拖动滑块改变月球的位置。';
      } else {
        t = '<b>月食</b>：地球运行到太阳和月球之间，地球挡住了射向月球的太阳光，月球进入地球的影子。整个月球进入本影时是<b>月全食</b>，部分进入时是<b>月偏食</b>。';
      }
      msg.innerHTML = t + (st.mode !== 'shadow' ? '<br><span class="small muted">示意图：天体的大小和距离没有按比例画。日食、月食都是光沿直线传播形成的。</span>' : '');
      S.render();
    }
    function kid(ctx, x, F) {
      ctx.save();
      ctx.fillStyle = '#4263eb';
      D.roundRect(ctx, x - 14, GY - OH + 30, 28, 52, 8); ctx.fill();
      ctx.fillStyle = '#343a40'; ctx.fillRect(x - 11, GY - 40, 9, 40); ctx.fillRect(x + 2, GY - 40, 9, 40);
      ctx.fillStyle = '#ffd8a8'; ctx.beginPath(); ctx.arc(x, GY - OH + 15, 15, 0, TAU); ctx.fill();
      ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(x, GY - OH + 11, 15, Math.PI, 0); ctx.fill();
      ctx.restore();
      void F;
    }
    function paintShadow(ctx, F) {
      ctx.fillStyle = '#f1f3f5'; ctx.fillRect(0, 0, VW, VH);
      const map = lightMap();
      // 地面与墙（按照度着色）
      map.ground.forEach(([x, v]) => { ctx.fillStyle = PS.mixColor('#495057', '#ffe8a3', v); ctx.fillRect(x - 2, GY, 4.5, 14); });
      map.wall.forEach(([y, v]) => { ctx.fillStyle = PS.mixColor('#495057', '#fff3bf', v); ctx.fillRect(WX, y - 2, 18, 4.5); });
      ctx.fillStyle = '#ced4da'; ctx.fillRect(0, GY + 14, VW, VH - GY - 14);
      ctx.fillStyle = '#dee2e6'; ctx.fillRect(WX + 18, 0, VW - WX - 18, GY + 14);
      // 边缘光线
      const sp = st.big ? [srcPts()[0], srcPts()[24]] : [st.L];
      const top = { x: st.ox, y: GY - OH };
      sp.forEach((s, i) => {
        const d = V.norm(V.sub(top, s));
        let end = null;
        const hg = O.raySeg(s, d, { x: 0, y: GY }, { x: WX, y: GY }), hw = O.raySeg(s, d, { x: WX, y: 0 }, { x: WX, y: GY });
        end = (hg && hw ? (hg.t < hw.t ? hg : hw) : hg || hw);
        const e = end ? end.p : O.along(s, d, 1400);
        PS.beam(ctx, [s, top, e], { color: i ? '#f59f00' : '#f76707', width: 1.6, dash: [6, 5], alpha: 0.9 });
      });
      kid(ctx, st.ox, F);
      if (st.big) {
        ctx.save(); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(st.L.x, st.L.y - 34); ctx.lineTo(st.L.x, st.L.y + 34); ctx.stroke(); ctx.restore();
        PS.drawBulb(ctx, st.L.x, st.L.y, 12, { base: false, halo: 5 });
        // 本影、半影标注
        let um = null, pe = [];
        map.ground.forEach(([x, v]) => { if (v === 0 && um == null) um = x; if (v > 0 && v < 1) pe.push(x); });
        if (um != null) D.text(ctx, '本影', um + 12, GY + 34, { size: F(13), weight: 800, color: '#1b2333' });
        if (pe.length) D.text(ctx, '半影', pe[pe.length - 1] - 8, GY + 34, { size: F(13), weight: 800, color: '#868e96', align: 'right' });
      } else PS.drawBulb(ctx, st.L.x, st.L.y, 16);
      D.text(ctx, '拖动我', st.L.x, st.L.y - 30 - (st.big ? 16 : 0), { size: F(12), weight: 700, color: '#e8590c', align: 'center' });
      D.text(ctx, '墙', WX + 40, 60, { size: F(14), weight: 800, color: '#6b7487', align: 'center' });
    }
    // 某点看到的太阳“可见比例”（2D 剖面：沿太阳竖直直径取样）
    function visFrac(P, sun, blk) {
      let v = 0; const n = 40;
      for (let i = 0; i < n; i++) {
        const s = { x: sun.x, y: sun.y + ((i / (n - 1)) * 2 - 1) * sun.r * 0.98 };
        const d = V.sub(P, s), L = V.len(d), u = V.mul(d, 1 / L);
        const w = V.sub(blk, s), k = PS.clamp(V.dot(w, u), 0, L);
        const q = V.add(s, V.mul(u, k));
        if (V.dist(q, blk) >= blk.r || k <= 0 || k >= L) v++;
      }
      return v / n;
    }
    function body(ctx, b, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); }
    function cones(ctx, sun, blk, len) {
      // 外公切线 → 本影；内公切线 → 半影（剖面示意）
      const ends = (s1, b1) => { const d = V.norm(V.sub(b1, s1)); return [s1, O.along(s1, d, V.dist(s1, b1) + len)]; };
      const sT = { x: sun.x, y: sun.y - sun.r }, sB = { x: sun.x, y: sun.y + sun.r };
      const bT = { x: blk.x, y: blk.y - blk.r }, bB = { x: blk.x, y: blk.y + blk.r };
      ctx.save();
      // 半影区域
      const p1 = ends(sT, bB), p2 = ends(sB, bT);
      ctx.fillStyle = 'rgba(120,130,150,.22)';
      ctx.beginPath(); ctx.moveTo(bT.x, bT.y); ctx.lineTo(p2[1].x, p2[1].y); ctx.lineTo(p1[1].x, p1[1].y); ctx.lineTo(bB.x, bB.y); ctx.closePath(); ctx.fill();
      // 本影区域
      const q1 = ends(sT, bT), q2 = ends(sB, bB);
      const apex = O.lineLine(sT, V.sub(bT, sT), sB, V.sub(bB, sB));
      ctx.fillStyle = 'rgba(15,20,30,.55)';
      ctx.beginPath(); ctx.moveTo(bT.x, bT.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(bB.x, bB.y); ctx.closePath(); ctx.fill();
      [[sT, q1[1]], [sB, q2[1]]].forEach(([a, b]) => PS.beam(ctx, [a, b], { color: 'rgba(255,212,59,.55)', width: 1.2 }));
      [[sT, p1[1]], [sB, p2[1]]].forEach(([a, b]) => PS.beam(ctx, [a, b], { color: 'rgba(255,212,59,.3)', width: 1.2, dash: [5, 4] }));
      ctx.restore();
    }
    function paintSky(ctx, F) {
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + (i % 5) * 0.12) + ')'; ctx.fillRect((i * 173.3) % VW, (i * 97.1) % VH, 1.6, 1.6); }
      const sun = { x: 90, y: 235, r: 100 };
      const sg = ctx.createRadialGradient(sun.x, sun.y, 20, sun.x, sun.y, sun.r * 1.5);
      sg.addColorStop(0, '#fff3bf'); sg.addColorStop(0.6, '#ffd43b'); sg.addColorStop(0.67, 'rgba(255,169,77,.5)'); sg.addColorStop(1, 'rgba(255,169,77,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r * 1.5, 0, TAU); ctx.fill();
      D.text(ctx, '太阳', sun.x + 30, sun.y + sun.r + 30, { size: F(14), weight: 800, color: '#ffd43b', align: 'center' });
      if (st.mode === 'solar') {
        const moon = { x: 600, y: 235 + st.moon, r: 34 }, earth = { x: 890, y: 235, r: 100 };
        cones(ctx, sun, moon, 420);
        // 地球表面的照度
        body(ctx, earth, '#1971c2');
        let tot = null, par = [];
        for (let a = Math.PI * 0.5; a <= Math.PI * 1.5; a += 0.02) {
          const P = { x: earth.x + Math.cos(a) * earth.r, y: earth.y + Math.sin(a) * earth.r };
          const v = visFrac(P, sun, moon);
          ctx.strokeStyle = PS.mixColor('#101820', '#74c0fc', v); ctx.lineWidth = 9;
          ctx.beginPath(); ctx.arc(earth.x, earth.y, earth.r - 4.5, a - 0.011, a + 0.011); ctx.stroke();
          if (v < 0.03) tot = P; else if (v < 0.97) par.push(P);
        }
        body(ctx, moon, '#adb5bd');
        D.text(ctx, '月球', moon.x, moon.y - moon.r - 10, { size: F(14), weight: 800, color: '#dee2e6', align: 'center' });
        D.text(ctx, '地球', earth.x + 20, earth.y + earth.r + 26, { size: F(14), weight: 800, color: '#74c0fc', align: 'center' });
        if (tot) D.text(ctx, '日全食', tot.x - 14, tot.y, { size: F(14), weight: 800, color: '#fff', align: 'right', baseline: 'middle', bg: 'rgba(0,0,0,.6)' });
        if (par.length) { const p = par[0]; D.text(ctx, '日偏食', p.x - 14, p.y, { size: F(13), weight: 700, color: '#ffe066', align: 'right', baseline: 'middle', bg: 'rgba(0,0,0,.5)' }); }
        if (!tot && !par.length) D.text(ctx, '月球不在三者连线上，不发生日食', 500, 440, { size: F(14), weight: 700, color: '#ced4da', align: 'center' });
      } else {
        const earth = { x: 520, y: 235, r: 80 }, moon = { x: 860, y: 235 + st.moon * 1.4, r: 30 };
        cones(ctx, sun, earth, 520);
        const eg = ctx.createLinearGradient(earth.x - earth.r, 0, earth.x + earth.r, 0);
        eg.addColorStop(0, '#4dabf7'); eg.addColorStop(0.5, '#1864ab'); eg.addColorStop(1, '#0b1f3a');
        body(ctx, earth, eg);
        const v = visFrac({ x: moon.x, y: moon.y }, sun, earth), vt = visFrac({ x: moon.x, y: moon.y - moon.r * 0.9 }, sun, earth), vb = visFrac({ x: moon.x, y: moon.y + moon.r * 0.9 }, sun, earth);
        // 月球：分上、中、下三段着色
        for (let i = 0; i < 30; i++) {
          const yy = moon.y - moon.r + (i + 0.5) * (moon.r * 2) / 30;
          const vv = visFrac({ x: moon.x, y: yy }, sun, earth);
          const hw = Math.sqrt(Math.max(0, moon.r * moon.r - (yy - moon.y) ** 2));
          ctx.fillStyle = PS.mixColor('#5c2b20', '#f1f3f5', vv);
          ctx.fillRect(moon.x - hw, yy - moon.r / 30 - 0.3, hw * 2, (moon.r * 2) / 30 + 0.6);
        }
        D.text(ctx, '地球', earth.x, earth.y + earth.r + 26, { size: F(14), weight: 800, color: '#74c0fc', align: 'center' });
        D.text(ctx, '月球', moon.x, moon.y - moon.r - 12, { size: F(14), weight: 800, color: '#dee2e6', align: 'center' });
        const all = Math.max(v, vt, vb) < 0.03, some = Math.min(v, vt, vb) < 0.97;
        D.text(ctx, all ? '月全食' : some ? (Math.min(v, vt, vb) < 0.03 ? '月偏食' : '月球进入半影（变暗一些）') : '月球没有进入地球的影子', moon.x, moon.y + moon.r + 30, { size: F(14), weight: 800, color: all ? '#ff8787' : '#ffe066', align: 'center' });
      }
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      if (st.mode === 'shadow') paintShadow(ctx, F); else paintSky(ctx, F);
      ctx.restore();
    }
    upd();
  });

  /* ================= 小孔成像 ================= */
  const PH_OBJ = {
    candle: { name: '蜡烛', H: 8 },
    F: { name: '“F”形光源', H: 4 },
    sun: { name: '太阳（树荫下的光斑）', H: 0 },
  };
  const HOLE = {
    circle: { name: '圆形', inside: (x, y) => x * x + y * y <= 1, area: Math.PI / 4 },
    tri: { name: '三角形', inside: (x, y) => -y >= -0.5 && -y <= 1 && Math.abs(x) <= (1 + y) / Math.sqrt(3), area: 0.43 }, // 正三角形，顶点朝上
    square: { name: '方形', inside: (x, y) => Math.abs(x) <= 1 && Math.abs(y) <= 1, area: 1 },
    star: { name: '星形', inside: (x, y) => { const a = Math.atan2(y, x) + Math.PI / 2, P = TAU / 5; const k = (((a % P) + P) % P) / P; return Math.hypot(x, y) <= 0.42 + 0.58 * Math.abs(k - 0.5) * 2; }, area: 0.45 },
  };
  PS.register('pinhole', function (el, opts) {
    const lab = !!opts.lab;
    const VW = 1000, VH = 400, AX = 205, HX = 470, PX = 12; // 主轴 y、小孔 x、每厘米像素
    const st = { obj: 'candle', u: 16, v: 12, hole: 'circle', a: 1.5, t: 0, rows: [], sunV: 4, leaf: 'tri' };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const wrap = h('div', { class: 'ph-grid' });
    const left = h('div', { class: 'bench-side' }), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const scr = PS.stage(h('div'), { ratio: '1 / 1', draw: paintScreen });
    const objSeg = PS.ui.seg(Object.keys(PH_OBJ).map((k) => ({ value: k, label: PH_OBJ[k].name })), st.obj, (v) => { st.obj = v; sync(); });
    const holeSeg = PS.ui.seg(Object.keys(HOLE).map((k) => ({ value: k, label: HOLE[k].name })), st.hole, (v) => { st.hole = v; sync(); });
    const uS = PS.ui.slider({ label: '物距 <i class="var">u</i>', min: 5, max: 30, step: 0.5, value: st.u, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.u = v; sync(); } });
    const vS = PS.ui.slider({ label: '像距 <i class="var">v</i>', min: 4, max: 25, step: 0.5, value: st.v, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.v = v; sync(); } });
    const aS = PS.ui.slider({ label: '孔的大小', min: 0.5, max: 12, step: 0.5, value: st.a, unit: 'mm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.a = v; sync(); } });
    const svS = PS.ui.slider({ label: '树叶到地面', min: 1, max: 10, step: 0.5, value: st.sunV, unit: 'm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.sunV = v; sync(); } });
    const gapS = PS.ui.slider({ label: '树叶缝隙大小', min: 0.5, max: 15, step: 0.5, value: 1, unit: 'cm', fmt: (v) => v.toFixed(1), onInput: () => sync() });
    const rU = PS.ui.readout('像高 <i class="var">h</i>′', '—', 'accent'), rK = PS.ui.readout('像的特点', '—', 'primary');
    const msg = h('div', { class: 'feedback show info small' });
    const pObj = h('div', { class: 'panel' }, h('h4', null, '① 选择物体和小孔'), h('div', { class: 'row' }, objSeg.el), h('div', { class: 'row ph-hole' }, holeSeg.el));
    const pMove = h('div', { class: 'panel' }, h('h4', null, '② 改变距离和孔的大小'), h('div', { class: 'row ph-cv' }, uS.el), h('div', { class: 'row ph-cv' }, vS.el), h('div', { class: 'row ph-cv' }, aS.el), h('div', { class: 'row ph-sun' }, svS.el), h('div', { class: 'row ph-sun' }, gapS.el));
    const viewT = h('h4', null, '③ 从后面看半透明膜上的像');
    const pView = h('div', { class: 'panel' }, viewT, scr.stage.parentNode, h('div', { class: 'readouts' }, rU.el, rK.el), msg);
    left.append(pView); side.append(pObj, pMove);
    scr.stage.style.background = '#000';
    let tbody, analysis;
    if (lab) {
      tbody = h('tbody');
      analysis = h('div', { class: 'small' });
      side.append(h('div', { class: 'panel' }, h('h4', null, '④ 记录数据'), h('div', { class: 'row' }, PS.ui.button('📝 记录这一组', record, 'btn btn-primary btn-sm'), PS.ui.button('清空', () => { st.rows = []; table(); }, 'btn btn-ghost btn-sm')),
        h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '物体'), h('th', null, '孔'), h('th', null, 'u/cm'), h('th', null, 'v/cm'), h('th', null, '像高/cm'), h('th', null, '正倒'))), tbody))),
        h('div', { class: 'panel' }, h('h4', null, '⑤ 分析论证'), analysis));
    }
    // 物体的发光图样（离屏画布，表示物体所在平面，边长 OBJW cm）
    const OBJW = 12, objC = document.createElement('canvas'); objC.width = objC.height = 192;
    function paintObj(t) {
      const g = objC.getContext('2d'), N = 192, k = N / OBJW; // 每厘米像素
      g.clearRect(0, 0, N, N);
      g.save(); g.translate(N / 2, N / 2); g.scale(k, k);
      if (st.obj === 'candle') {
        // 烛身（被火焰照亮，较暗）+ 火焰（很亮）；高度 8 cm，以主轴为中心
        g.fillStyle = 'rgba(95,85,65,.38)'; g.fillRect(-0.9, -1, 1.8, 5);
        const sway = Math.sin(t * 9.3) * 0.12;
        const fg = g.createRadialGradient(0, -2.2, 0.1, 0, -2.2, 2.2);
        fg.addColorStop(0, '#fffbe6'); fg.addColorStop(0.4, '#ffd43b'); fg.addColorStop(1, 'rgba(255,120,0,0)');
        g.fillStyle = fg;
        g.beginPath(); g.moveTo(sway, -4); g.bezierCurveTo(1.2, -2.4, 1, -1, 0, -1); g.bezierCurveTo(-1, -1, -1.2, -2.4, sway, -4); g.fill();
      } else if (st.obj === 'F') {
        g.fillStyle = '#ffec99';
        g.fillRect(-1.2, -2, 0.6, 4); g.fillRect(-1.2, -2, 2.4, 0.6); g.fillRect(-1.2, -0.3, 1.8, 0.6);
      }
      g.restore();
    }
    const holeSamples = () => {
      const sh = HOLE[st.hole], pts = [];
      const n = 9;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = (i / (n - 1)) * 2 - 1, y = (j / (n - 1)) * 2 - 1; if (sh.inside(x, y)) pts.push({ x, y }); }
      return pts;
    };
    // 树叶缝隙（不规则形状）
    const leafInside = (x, y) => { const a = Math.atan2(y, x), r = Math.hypot(x, y); return r <= 0.55 + 0.3 * Math.sin(3 * a + 0.6) + 0.15 * Math.cos(5 * a); };
    function sync() {
      const sun = st.obj === 'sun';
      el.querySelectorAll('.ph-cv').forEach((e) => { e.style.display = sun ? 'none' : ''; });
      el.querySelectorAll('.ph-sun').forEach((e) => { e.style.display = sun ? '' : 'none'; });
      pObj.querySelector('.ph-hole').style.display = sun ? 'none' : '';
      viewT.textContent = sun ? '③ 地面上的光斑' : '③ 从后面看半透明膜上的像';
      let t;
      if (sun) {
        const d = st.sunV * 0.93; // 太阳的像的直径（cm）≈ 距离 × 0.0093
        const gap = gapS.value;
        rU.set('光斑直径约 ' + (d + gap * 0.7).toFixed(1) + ' cm');
        rK.set(gap < d * 0.6 ? '圆形——太阳的像' : '形状接近缝隙');
        t = gap < d * 0.6
          ? '树叶的缝隙形状各不相同，但只要缝隙足够小，地面上的光斑都是<b>圆形</b>的——它们是太阳通过小孔所成的<b>倒立的实像</b>（太阳是圆的）。树叶离地面越高，光斑越大。'
          : '缝隙太大时，就不再是小孔成像了：地面上的光斑形状和<b>缝隙的形状</b>差不多。';
      } else {
        const H = PH_OBJ[st.obj].H, hi = (H * st.v) / st.u, r = st.v / st.u;
        const blur = (st.a / 10) * (st.u + st.v) / st.u;
        rU.set(hi.toFixed(1) + ' cm');
        rK.set('倒立、' + (Math.abs(r - 1) < 0.04 ? '等大' : r > 1 ? '放大' : '缩小') + '的实像');
        if (blur > hi * 0.3) t = '孔太大了！物体上每一点发出的光通过小孔后在膜上形成一个大光斑，许多光斑重叠在一起，像变得<b>模糊</b>（但更亮）。把孔调小一些。';
        else t = '膜上出现了物体<b>倒立</b>的像（上下颠倒、左右相反），像的形状和<b>物体</b>相同，与小孔的形状<b>无关</b>。像的大小与物距和像距有关：<i class="var">h</i>′ = <i class="var">h</i> × <i class="var">v</i> / <i class="var">u</i>。';
        if (st.a <= 1) t += '<br>孔很小，像很清晰，但比较<b>暗</b>。';
      }
      msg.innerHTML = t;
      S.render(); scr.render();
    }
    function record() {
      if (st.obj === 'sun') { PS.toast('换成蜡烛或“F”形光源再记录数据'); return; }
      const H = PH_OBJ[st.obj].H;
      st.rows.push({ o: PH_OBJ[st.obj].name.replace(/“|”|形光源/g, ''), hole: HOLE[st.hole].name, u: st.u, v: st.v, hi: (H * st.v) / st.u, H });
      if (st.rows.length > 8) st.rows.shift();
      table(); PS.sound.tick();
    }
    function table() {
      tbody.innerHTML = '';
      st.rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.o), h('td', null, r.hole), h('td', null, r.u.toFixed(1)), h('td', null, r.v.toFixed(1)), h('td', null, r.hi.toFixed(1)), h('td', null, '倒立'))));
      const n = st.rows.length;
      const holes = new Set(st.rows.map((r) => r.hole)).size;
      const sameU = st.rows.some((a, i) => st.rows.some((b, j) => j > i && a.u === b.u && a.v !== b.v));
      const sameV = st.rows.some((a, i) => st.rows.some((b, j) => j > i && a.v === b.v && a.u !== b.u));
      const items = [
        ['小孔成的是<b>倒立的实像</b>（能用膜承接）', n >= 1],
        ['像的形状与物体相同，与孔的形状<b>无关</b>（换过 ' + holes + ' 种孔）', holes >= 2],
        ['物距不变，像距越大，像越<b>大</b>', sameU],
        ['像距不变，物距越大，像越<b>小</b>', sameV],
      ];
      analysis.innerHTML = n ? items.map(([t, ok]) => (ok ? '✅ ' : '⬜ ') + t).join('<br>') + (n >= 2 ? '<br><span class="muted">规律：像高 ∶ 物高 = 像距 ∶ 物距</span>' : '') : '记录几组数据：先只改变孔的形状，再分别只改变物距、只改变像距。';
    }
    PS.drag(S, {
      VW, VH,
      hit: (p) => {
        if (st.obj === 'sun') return null;
        if (Math.abs(p.x - (HX - st.u * PX)) < 30 && p.y > AX - 70 && p.y < AX + 80) return 'u';
        if (Math.abs(p.x - (HX + st.v * PX)) < 26 && p.y > AX - 80 && p.y < AX + 80) return 'v';
        return null;
      },
      move: (k, p) => {
        if (k === 'u') { st.u = PS.clamp(Math.round(((HX - p.x) / PX) * 2) / 2, 5, 30); uS.set(st.u, true); }
        else { st.v = PS.clamp(Math.round(((p.x - HX) / PX) * 2) / 2, 4, 25); vS.set(st.v, true); }
        sync();
      },
    });
    const loop = PS.loop((dt) => { st.t += dt; S.render(); if (st.obj === 'candle') scr.render(); }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 0, VW, VH);
      if (st.obj === 'sun') { paintSun(ctx, F); ctx.restore(); return; }
      ctx.fillStyle = '#ced4da'; ctx.fillRect(0, 330, VW, 70);
      const ox = HX - st.u * PX, fx = HX + st.v * PX, H = PH_OBJ[st.obj].H;
      const top = { x: ox, y: AX - (H / 2) * PX }, bot = { x: ox, y: AX + (H / 2) * PX };
      // 物体
      if (st.obj === 'candle') {
        ctx.fillStyle = '#adb5bd'; ctx.fillRect(ox - 22, AX + 4 * PX, 44, 6); ctx.fillRect(ox - 3, AX + 4 * PX + 6, 6, 330 - AX - 4 * PX - 6);
        PS.drawCandle(ctx, ox, AX + 4 * PX, 5 * PX, { w: 20, lit: true, t: st.t, fh: 2.6 * PX });
      } else {
        ctx.fillStyle = '#343a40'; D.roundRect(ctx, ox - 8, AX - 3 * PX, 16, 6 * PX, 3); ctx.fill();
        ctx.fillRect(ox - 3, AX + 3 * PX, 6, 330 - AX - 3 * PX);
        ctx.fillStyle = '#ffec99';
        ctx.fillRect(ox - 2, top.y, 4, H * PX);
        ctx.fillRect(ox - 2, top.y, 4, 0.6 * PX); // 侧视只看到一条亮线
        D.text(ctx, 'F', ox - 20, AX, { size: F(18), weight: 900, color: '#f08c00', align: 'right', baseline: 'middle' });
      }
      // 光线：物体最高点、最低点通过小孔边缘（显示光束粗细）
      const a = Math.max(0.25, (st.a / 10) / 2) * PX; // 孔半径（像素）
      [[top, '#f76707'], [bot, '#f59f00']].forEach(([p, c]) => {
        const e1 = { x: HX, y: AX - a }, e2 = { x: HX, y: AX + a };
        const s1 = O.lineLine(p, V.sub(e1, p), { x: fx, y: 0 }, { x: 0, y: 1 }), s2 = O.lineLine(p, V.sub(e2, p), { x: fx, y: 0 }, { x: 0, y: 1 });
        ctx.fillStyle = PS.hexA(c, 0.18);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(e1.x, e1.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.lineTo(e2.x, e2.y); ctx.closePath(); ctx.fill();
        const sc = O.lineLine(p, V.sub({ x: HX, y: AX }, p), { x: fx, y: 0 }, { x: 0, y: 1 });
        PS.beam(ctx, [p, { x: HX, y: AX }, sc], { color: c, width: 1.8, arrow: true, head: 9 });
      });
      // 小孔成像仪：外筒（前端封着有小孔的硬纸片）+ 内筒（前端蒙着半透明膜）
      const tubeT = AX - 70, tubeB = AX + 70;
      ctx.fillStyle = 'rgba(134,94,60,.22)'; ctx.fillRect(HX, tubeT, 210, tubeB - tubeT);
      ctx.strokeStyle = '#8d6e4c'; ctx.lineWidth = 3; ctx.strokeRect(HX, tubeT, 210, tubeB - tubeT);
      ctx.fillStyle = 'rgba(80,60,40,.18)'; ctx.fillRect(fx, tubeT + 8, 250, tubeB - tubeT - 16);
      ctx.strokeStyle = '#6b4f35'; ctx.lineWidth = 2; ctx.strokeRect(fx, tubeT + 8, 250, tubeB - tubeT - 16);
      ctx.fillStyle = '#5c4033';
      ctx.fillRect(HX - 4, tubeT - 4, 8, AX - a - tubeT + 4); ctx.fillRect(HX - 4, AX + a, 8, tubeB - AX - a + 4);
      ctx.fillStyle = 'rgba(248,249,250,.85)'; ctx.fillRect(fx - 3, tubeT + 8, 6, tubeB - tubeT - 16);
      // 膜上的像（侧视：一条亮线）
      const hi = (H * st.v) / st.u * PX;
      ctx.fillStyle = 'rgba(255,212,59,.9)'; ctx.fillRect(fx - 2, AX - hi / 2, 4, hi);
      D.text(ctx, '小孔', HX, tubeT - 12, { size: F(13), weight: 700, color: '#5c4033', align: 'center' });
      D.text(ctx, '半透明膜', fx, tubeB + 4, { size: F(13), weight: 700, color: '#495057', align: 'center', baseline: 'top' });
      PS.drawEye(ctx, Math.min(VW - 30, fx + 270), AX, Math.PI, 20);
      D.dim(ctx, ox, HX, 330 + 26, 'u = ' + st.u.toFixed(1) + ' cm', { color: '#3b5bdb', size: F(13) });
      D.dim(ctx, HX, fx, 330 + 26, 'v = ' + st.v.toFixed(1) + ' cm', { color: '#e8590c', size: F(13) });
      D.text(ctx, '← 拖动物体', ox, 40, { size: F(12), weight: 700, color: '#3b5bdb', align: 'center' });
      D.text(ctx, '拖动内筒 →', fx, 40, { size: F(12), weight: 700, color: '#e8590c', align: 'center' });
      ctx.restore();
    }
    function paintSun(ctx, F) {
      const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#d0ebff'); g.addColorStop(1, '#f1f3f5');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(110, 60, 34, 0, TAU); ctx.fill();
      D.text(ctx, '太阳（很远）', 110, 112, { size: F(13), weight: 700, color: '#e67700', align: 'center' });
      const gy = 360, ty = gy - st.sunV * 30;
      ctx.fillStyle = '#b2f2bb'; ctx.fillRect(0, gy, VW, VH - gy);
      ctx.fillStyle = '#8d6e4c'; ctx.fillRect(560, ty, 20, gy - ty);
      ctx.fillStyle = '#2b8a3e';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(420 + i * 40, ty - 10 + (i % 2) * 8, 46, 22, 0, 0, TAU); ctx.fill(); }
      // 缝隙与光线
      const gx = 520, gap = Math.max(3, gapS.value * 1.2);
      ctx.fillStyle = '#d0ebff'; ctx.beginPath(); ctx.ellipse(gx, ty - 6, gap, gap * 0.6, 0, 0, TAU); ctx.fill();
      const dir = V.norm({ x: gx - 110, y: ty - 60 });
      const k = (gy - ty) / dir.y;
      const spot = gx + dir.x * k;
      ctx.fillStyle = 'rgba(255,236,153,.35)';
      ctx.beginPath(); ctx.moveTo(gx - gap * 0.8, ty - 6); ctx.lineTo(spot - (st.sunV * 4 + gap * 0.6), gy); ctx.lineTo(spot + (st.sunV * 4 + gap * 0.6), gy); ctx.lineTo(gx + gap * 0.8, ty - 6); ctx.fill();
      PS.beam(ctx, [{ x: 110, y: 60 }, { x: gx, y: ty - 6 }, { x: spot, y: gy }], { color: '#f59f00', width: 1.6, arrow: true, dash: [6, 4] });
      ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.ellipse(spot, gy + 6, st.sunV * 4 + gap * 0.5, 6, 0, 0, TAU); ctx.fill();
      D.text(ctx, '树叶间的缝隙', gx - 60, ty - 40, { size: F(13), weight: 700, color: '#1b2333', align: 'right' });
      D.text(ctx, '地面上的光斑', spot, gy + 28, { size: F(13), weight: 700, color: '#1b2333', align: 'center' });
      D.dim(ctx, ty, gy, 640, '', { color: '#e8590c' });
      ctx.save(); ctx.translate(640, (ty + gy) / 2); D.text(ctx, st.sunV.toFixed(1) + ' m', 12, 0, { size: F(13), weight: 700, color: '#e8590c', baseline: 'middle' }); ctx.restore();
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(640, ty); ctx.lineTo(640, gy); ctx.stroke();
    }
    // 膜（或地面）上的图样
    function paintScreen(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, 360, 360);
      ctx.fillStyle = st.obj === 'sun' ? '#3d3424' : '#14110d'; ctx.fillRect(0, 0, 360, 360);
      const sun = st.obj === 'sun';
      const Wv = sun ? 24 : 10; // 视野边长（cm）
      const pc = 360 / Wv;
      ctx.globalCompositeOperation = 'lighter';
      if (sun) {
        const d = st.sunV * 0.93, gap = gapS.value;
        const pts = [];
        const n = 13; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = (i / (n - 1)) * 2 - 1, y = (j / (n - 1)) * 2 - 1; if (leafInside(x, y)) pts.push({ x, y }); }
        const B = PS.clamp(0.9 * Math.pow((gap * gap) / (d * d + gap * gap), 0.25) + 0.25, 0.3, 1.4);
        pts.forEach((q) => {
          const cx = 180 + q.x * (gap / 2) * pc, cy = 180 + q.y * (gap / 2) * pc;
          const r = (d / 2) * pc;
          const g = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
          g.addColorStop(0, 'rgba(255,240,180,' + (B / pts.length * 2.2) + ')'); g.addColorStop(1, 'rgba(255,240,180,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
        D.text(ctx, '地面（24 cm × 24 cm）', 8, 352, { size: F(11), weight: 600, color: '#ced4da' });
        ctx.restore(); return;
      }
      paintObj(st.t);
      const m = st.v / st.u, hs = (st.u + st.v) / st.u, aCm = st.a / 10;
      const pts = holeSamples();
      const B = (((aCm * aCm * HOLE[st.hole].area) / (0.15 * 0.15 * Math.PI / 4)) * Math.pow(10 / st.v, 2));
      const tot = PS.clamp(0.22 + 0.78 * Math.pow(B, 0.55), 0.22, 3);
      const each = Math.min(1, tot / pts.length);
      const scale = -m * (OBJW / 192) * pc; // 倒立：缩放取负
      ctx.globalAlpha = each;
      pts.forEach((q) => {
        const dx = q.x * (aCm / 2) * hs * pc, dy = q.y * (aCm / 2) * hs * pc;
        const k0 = w / 360;
        ctx.setTransform(scr.dpr * k0 * scale, 0, 0, scr.dpr * k0 * scale, scr.dpr * k0 * (180 + dx), scr.dpr * k0 * (180 + dy));
        ctx.drawImage(objC, -96, -96);
      });
      ctx.globalAlpha = 1;
      ctx.setTransform(scr.dpr * (w / 360), 0, 0, scr.dpr * (hh / 360), 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      D.text(ctx, '膜（10 cm × 10 cm）', 8, 352, { size: F(11), weight: 600, color: '#868e96' });
      ctx.restore();
    }
    if (!document.getElementById('ph-style')) document.head.append(h('style', { id: 'ph-style' }, '.ph-hole .seg button{padding:5px 10px}.ph-grid{display:grid;grid-template-columns:minmax(0,330px) minmax(0,1fr);gap:12px;margin-top:12px;align-items:start}@media(max-width:720px){.ph-grid{grid-template-columns:minmax(0,1fr)}}'));
    if (lab) table();
    sync();
    loop.start();
  });

  /* ================= 光沿直线传播的应用：排队、瞄准 ================= */
  PS.register('straight-apps', function (el) {
    const VW = 1000, VH = 440;
    const COLORS = ['#e8590c', '#2b8a3e', '#7048e8', '#1c7ed6', '#c2255c'];
    const st = { mode: 'queue', xs: [0, 0, 0, 0, 0], eyeY: 0, gunA: 0, shot: null, t: 0 };
    const shuffle = () => { st.xs = st.xs.map(() => PS.rand(-50, 50)); };
    shuffle();
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'queue', label: '排队看齐' }, { value: 'aim', label: '射击瞄准（三点一线）' }], st.mode, (v) => { st.mode = v; st.shot = null; upd(); });
    const b1 = PS.ui.button('🔀 打乱队伍', () => { shuffle(); upd(); }, 'btn btn-sm');
    const b2 = PS.ui.button('▶ 射击', () => { st.shot = { t: 0 }; loop.start(); }, 'btn btn-primary btn-sm');
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(seg.el, b1, b2), msg);
    // 排队：俯视图中每个同学的位置
    const QX = 280, Q0 = 380, QD = 62; // 队伍中线 x，你的位置 y，前后间距
    const pos = (i) => ({ x: QX + st.xs[i], y: Q0 - (i + 1) * QD });
    // 瞄准：眼睛、照门、准星、靶心
    const AIM = { rear: { x: 300, y: 250 }, target: { x: 920, y: 160 } };
    const front = () => O.along(AIM.rear, V.dir(st.gunA), 240);
    const eye = () => ({ x: 150, y: 250 + st.eyeY });
    PS.drag(S, {
      VW, VH,
      hit: (p) => {
        if (st.mode === 'queue') { for (let i = 0; i < 5; i++) if (V.dist(p, pos(i)) < 26) return i; return null; }
        if (V.dist(p, front()) < 30) return 'gun';
        if (V.dist(p, eye()) < 30) return 'eye';
        return null;
      },
      move: (k, p) => {
        if (st.mode === 'queue') st.xs[k] = PS.clamp(p.x - QX, -120, 120);
        else if (k === 'gun') {
          st.gunA = PS.clamp(Math.atan2(p.y - AIM.rear.y, p.x - AIM.rear.x), -0.5, 0.4);
          const aT = V.ang(V.sub(AIM.target, AIM.rear));
          if (Math.abs(st.gunA - aT) < 0.03) st.gunA = aT; // 接近时自动对准
        } else {
          st.eyeY = PS.clamp(p.y - 250, -90, 90);
          const want = -150 * Math.tan(st.gunA);
          if (Math.abs(st.eyeY - want) < 8) st.eyeY = want;
        }
        st.shot = null; upd();
      },
    });
    function visibleCount() {
      // 从队尾看：每个同学在视野中占据的角度区间，被前面（更近）的同学挡住
      const iv = [];
      let n = 0;
      for (let i = 0; i < 5; i++) {
        const p = pos(i), d = Q0 - p.y, c = (p.x - QX) / d, half = 13 / d;
        const lo = c - half, hi = c + half;
        // 被更近的同学遮住的部分
        let seg = [[lo, hi]];
        iv.forEach(([a, b]) => { seg = seg.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [[x, Math.max(x, a)], [Math.min(y, b), y]].filter(([u, v]) => v - u > 1e-4))); });
        if (seg.reduce((s, [x, y]) => s + y - x, 0) > (hi - lo) * 0.08) n++;
        iv.push([lo, hi]);
      }
      return n;
    }
    function aligned() {
      const e = eye(), f = front();
      const a1 = V.ang(V.sub(AIM.rear, e)), a2 = V.ang(V.sub(f, AIM.rear)), a3 = V.ang(V.sub(AIM.target, f));
      return { sight: Math.abs(a1 - a2) < 0.012, target: Math.abs(a2 - a3) < 0.012, all: Math.abs(a1 - a2) < 0.012 && Math.abs(a2 - a3) < 0.012 };
    }
    function upd() {
      b1.style.display = st.mode === 'queue' ? '' : 'none';
      b2.style.display = st.mode === 'aim' ? '' : 'none';
      if (st.mode === 'queue') {
        const n = visibleCount();
        msg.className = 'feedback show ' + (n === 1 ? 'ok' : 'info');
        msg.innerHTML = n === 1 ? '✅ 你只能看到前面一位同学的后脑勺，后面的同学全被挡住了——队伍<b>排直</b>了！这是利用了<b>光沿直线传播</b>。' : '你是队伍的最后一名。拖动俯视图中的同学（或想象他们左右移动），直到你<b>只能看到前面一位同学</b>。现在你能看到 <b>' + n + '</b> 位同学。';
      } else {
        const a = aligned();
        msg.className = 'feedback show ' + (a.all ? 'ok' : 'info');
        msg.innerHTML = a.all ? '✅ <b>三点一线</b>：眼睛、照门（缺口）、准星和目标在同一条直线上，可以射击了！瞄准利用了光沿直线传播。' : '拖动<b>准星</b>（转动枪）和<b>眼睛</b>，使眼睛、照门、准星、目标在一条直线上。' + (a.sight ? '（照门和准星已对齐，再对准目标）' : '');
      }
      S.render();
    }
    function person(ctx, x, y, s, c) {
      ctx.save();
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y + s * 1.25, s * 1.15, s * 0.75, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(x - s * 1.15, y + s * 1.2, s * 2.3, s * 1.2);
      ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(x, y, s * 0.62, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const loop = PS.loop((dt) => {
      if (st.shot) { st.shot.t += dt; if (st.shot.t > 1.2) { loop.stop(); upd(); } }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8f9fa'; ctx.fillRect(0, 0, VW, VH);
      if (st.mode === 'queue') {
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(40, 20, 480, 400);
        D.text(ctx, '俯视图（拖动同学）', 56, 44, { size: F(14), weight: 800, color: '#495057' });
        // 视线
        for (let i = 0; i < 5; i++) {
          const p = pos(i);
          PS.beam(ctx, [p, { x: QX, y: Q0 }], { color: 'rgba(247,103,7,.35)', width: 1.2, dash: [4, 4] });
        }
        for (let i = 4; i >= 0; i--) { const p = pos(i); ctx.fillStyle = COLORS[i]; ctx.beginPath(); ctx.ellipse(p.x, p.y, 22, 14, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.ellipse(QX, Q0, 22, 14, 0, 0, TAU); ctx.fill();
        D.text(ctx, '你', QX, Q0 + 30, { size: F(14), weight: 800, color: '#1b2333', align: 'center' });
        // 你看到的（透视）
        ctx.fillStyle = '#dbe4ff'; ctx.fillRect(560, 20, 410, 400);
        ctx.fillStyle = '#b2f2bb'; ctx.fillRect(560, 260, 410, 160);
        D.text(ctx, '你看到的（站在队尾向前看）', 576, 44, { size: F(14), weight: 800, color: '#364fc7' });
        for (let i = 4; i >= 0; i--) {
          const p = pos(i), d = Q0 - p.y, f = 70;
          const sx = 765 + (f * (p.x - QX)) / d * 3.1, s = (f * 16) / d * 2.2;
          person(ctx, sx, 235 - s * 0.6, s, COLORS[i]);
        }
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, '#d0ebff'); sky.addColorStop(1, '#f1f3f5');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#d8f5a2'; ctx.fillRect(0, 380, VW, 60);
        const T = AIM.target;
        [40, 30, 20, 10].forEach((r, i) => { ctx.fillStyle = i % 2 ? '#fff' : '#e03131'; ctx.beginPath(); ctx.arc(T.x, T.y, r, 0, TAU); ctx.fill(); });
        ctx.fillStyle = '#8d6e4c'; ctx.fillRect(T.x - 3, T.y + 40, 6, 380 - T.y - 40);
        const e = eye(), f = front(), a = aligned();
        // 枪
        ctx.save(); ctx.translate(AIM.rear.x, AIM.rear.y); ctx.rotate(st.gunA);
        ctx.fillStyle = '#495057'; D.roundRect(ctx, -40, 8, 300, 14, 4); ctx.fill();
        ctx.fillStyle = '#8d6e4c'; ctx.beginPath(); ctx.moveTo(-40, 8); ctx.lineTo(-130, 30); ctx.lineTo(-130, 62); ctx.lineTo(-20, 22); ctx.fill();
        ctx.fillStyle = '#343a40'; ctx.fillRect(-6, -2, 12, 10); ctx.clearRect(-2, -2, 4, 5); ctx.fillRect(236, -4, 6, 12);
        ctx.restore();
        PS.beam(ctx, [e, O.along(e, V.sub(AIM.rear, e), 900)], { color: a.all ? '#2b8a3e' : 'rgba(247,103,7,.7)', width: 1.6, dash: [7, 5] });
        PS.drawEye(ctx, e.x, e.y, V.ang(V.sub(AIM.rear, e)), 24);
        PS.handle(ctx, f.x, f.y - 4, 10, '#e8590c', '准星', F);
        PS.handle(ctx, e.x - 18, e.y - 26, 9, '#3b5bdb', '眼睛', F);
        D.text(ctx, '照门', AIM.rear.x, AIM.rear.y + 44, { size: F(12), weight: 700, color: '#495057', align: 'center' });
        if (st.shot) {
          const k = Math.min(1, st.shot.t / 0.6);
          const muzzle = O.along(AIM.rear, V.dir(st.gunA), 262);
          const dir = V.dir(st.gunA), end = O.along(muzzle, dir, 700 * k);
          PS.beam(ctx, [muzzle, end], { color: '#343a40', width: 2 });
          if (k >= 1) D.text(ctx, a.all ? '🎯 命中！' : '没打中', 820, 70, { size: F(20), weight: 900, color: a.all ? '#2b8a3e' : '#e03131', align: 'center' });
        }
      }
      ctx.restore();
    }
    upd();
  });

  /* ================= 光速 ================= */
  const STARS = [
    { name: '月球', d: '3.84 × 10⁸ m', s: 1.28, t: '约 1.3 s' },
    { name: '太阳', d: '1.5 × 10¹¹ m', s: 500, t: '约 8 min 20 s' },
    { name: '比邻星（离太阳最近的恒星）', d: '约 4.2 光年', s: 4.2 * 3.156e7, t: '约 4.2 年' },
    { name: '织女星', d: '约 25 光年', s: 25 * 3.156e7, t: '约 25 年' },
    { name: '仙女座星系', d: '约 250 万光年', s: 2.5e6 * 3.156e7, t: '约 250 万年' },
  ];
  PS.register('light-speed', function (el) {
    const VW = 1000, VH = 420;
    const st = { mode: 'earth', t: 0, slow: 10, run: true, race: 0, star: 1, pulse: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'earth', label: '1 秒绕地球几圈？' }, { value: 'media', label: '在不同介质中' }, { value: 'stars', label: '来自天体的光' }], st.mode, (v) => { st.mode = v; st.t = 0; st.race = 0; st.pulse = 0; upd(); });
    const slowSeg = PS.ui.seg([{ value: 10, label: '慢放 10 倍' }, { value: 40, label: '慢放 40 倍' }], st.slow, (v) => { st.slow = v; st.t = 0; });
    const raceBtn = PS.ui.button('▶ 开始比赛', () => { st.race = 0.0001; }, 'btn btn-primary btn-sm');
    const starSeg = PS.ui.seg(STARS.map((s, i) => ({ value: i, label: s.name.replace(/（.*）/, '') })), st.star, (v) => { st.star = v; st.pulse = 0; upd(); });
    const msg = h('div', { class: 'feedback show info' });
    const r1 = PS.ui.row(slowSeg.el), r2 = PS.ui.row(raceBtn), r3 = PS.ui.row(starSeg.el);
    el.append(PS.ui.row(seg.el), r1, r2, r3, msg);
    function upd() {
      r1.style.display = st.mode === 'earth' ? '' : 'none';
      r2.style.display = st.mode === 'media' ? '' : 'none';
      r3.style.display = st.mode === 'stars' ? '' : 'none';
      if (st.mode === 'earth') msg.innerHTML = '光在真空中的传播速度 <b><i class="var">c</i> = 3 × 10⁸ m/s</b>（空气中的光速近似等于它）。地球赤道周长约 4 × 10⁷ m，光 1 s 能绕地球约 <b>7.5 圈</b>！而声音 1 s 只能传播约 340 m——光速约是声速的 88 万倍。';
      else if (st.mode === 'media') msg.innerHTML = '光在不同介质中的传播速度不同：在水中约为真空中的 <b>3/4</b>，在玻璃中约为真空中的 <b>2/3</b>。光在真空中传播得最快。<br><span class="small muted">（光能在真空中传播，声音不能。）</span>';
      else { const s = STARS[st.star]; msg.innerHTML = '<b>' + s.name + '</b>到地球的距离 ' + s.d + '，它发出的光要经过 <b>' + s.t + '</b> 才能到达地球。我们现在看到的星光，是它很久以前发出的——<b>我们看到了古老的光</b>。<br><b>光年</b>是<b>长度</b>单位：光在一年内传播的距离，1 光年 ≈ 9.46 × 10¹⁵ m（不是时间单位！）。'; }
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.mode === 'media' && st.race > 0) st.race += dt;
      if (st.mode === 'stars') st.pulse = Math.min(1, st.pulse + dt / 3);
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + (i % 4) * 0.1) + ')'; ctx.fillRect((i * 173.3) % VW, (i * 97.1) % VH, 1.5, 1.5); }
      if (st.mode === 'earth') {
        const cx = 330, cy = 210, R = 140;
        const eg = ctx.createRadialGradient(cx - 40, cy - 40, 20, cx, cy, R);
        eg.addColorStop(0, '#74c0fc'); eg.addColorStop(1, '#1864ab');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        ctx.fillStyle = '#69db7c'; [[-40, -50, 50, 30], [30, 20, 40, 55], [-70, 40, 30, 22]].forEach(([x, y, a, b]) => { ctx.beginPath(); ctx.ellipse(cx + x, cy + y, a, b, 0.4, 0, TAU); ctx.fill(); });
        const tt = st.t / st.slow, laps = tt * 7.5, ang = laps * TAU - Math.PI / 2;
        const RR = R + 22;
        for (let k = 0; k < 40; k++) {
          const a = ang - k * 0.04;
          ctx.fillStyle = 'rgba(255,224,102,' + (1 - k / 40) * 0.9 + ')';
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * RR, cy + Math.sin(a) * RR, 6 - k * 0.12, 0, TAU); ctx.fill();
        }
        D.text(ctx, '实际时间', 640, 120, { size: F(15), weight: 700, color: '#adb5bd' });
        D.text(ctx, (tt % 10).toFixed(2) + ' s', 640, 170, { size: F(40), weight: 900, color: '#fff' });
        D.text(ctx, '光已绕地球', 640, 230, { size: F(15), weight: 700, color: '#adb5bd' });
        D.text(ctx, ((laps) % 75).toFixed(1) + ' 圈', 640, 280, { size: F(40), weight: 900, color: '#ffe066' });
        D.text(ctx, '（慢放 ' + st.slow + ' 倍）', 640, 320, { size: F(13), weight: 600, color: '#868e96' });
      } else if (st.mode === 'media') {
        const lanes = [['真空', 1, '#ffe066'], ['水', 0.75, '#74c0fc'], ['玻璃', 2 / 3, '#b2f2bb']];
        const X0 = 150, X1 = 880, T = 3; // 真空中用 3 s 跑完（慢放）
        D.text(ctx, '比赛：传播 3 × 10⁸ m（30 万千米）', 500, 50, { size: F(16), weight: 800, color: '#fff', align: 'center' });
        lanes.forEach(([n, k, c], i) => {
          const y = 120 + i * 95;
          ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(X0, y - 28, X1 - X0, 56);
          D.text(ctx, n, X0 - 20, y, { size: F(16), weight: 800, color: c, align: 'right', baseline: 'middle' });
          const p = st.race > 0 ? Math.min(1, (st.race * k) / T) : 0;
          const x = X0 + (X1 - X0) * p;
          const g = ctx.createLinearGradient(x - 120, 0, x, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c);
          ctx.fillStyle = g; ctx.fillRect(Math.max(X0, x - 120), y - 4, Math.min(120, x - X0), 8);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
          if (p >= 1) D.text(ctx, '用时 ' + (1 / k).toFixed(2) + ' s', X1 + 10, y, { size: F(14), weight: 800, color: c, baseline: 'middle' });
        });
        ctx.strokeStyle = '#fff'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(X1, 80); ctx.lineTo(X1, 360); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '光速：真空 3 × 10⁸ m/s　水 约 2.25 × 10⁸ m/s　玻璃 约 2 × 10⁸ m/s', 500, 395, { size: F(14), weight: 700, color: '#ced4da', align: 'center' });
      } else {
        const s = STARS[st.star];
        // 对数时间轴
        const L0 = 0, L1 = 14.5, X0 = 80, X1 = 920, ay = 330;
        const X = (sec) => X0 + ((Math.log10(sec) - L0) / (L1 - L0)) * (X1 - X0);
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X0, ay); ctx.lineTo(X1, ay); ctx.stroke();
        [[1, '1 s'], [60, '1 min'], [3600, '1 h'], [86400, '1 天'], [3.156e7, '1 年'], [3.156e9, '100 年'], [3.156e11, '1 万年'], [3.156e13, '100 万年']].forEach(([v, lb]) => {
          const x = X(v); ctx.beginPath(); ctx.moveTo(x, ay - 6); ctx.lineTo(x, ay + 6); ctx.stroke();
          D.text(ctx, lb, x, ay + 22, { size: F(12), weight: 600, color: '#adb5bd', align: 'center' });
        });
        D.text(ctx, '光到达地球需要的时间（对数刻度）', X0, ay - 22, { size: F(13), weight: 700, color: '#adb5bd' });
        STARS.forEach((q, i) => {
          const x = X(q.s);
          ctx.fillStyle = i === st.star ? '#ffe066' : '#495057'; ctx.beginPath(); ctx.arc(x, ay, 7, 0, TAU); ctx.fill();
          if (i === st.star) D.text(ctx, q.t, x, ay + 46, { size: F(14), weight: 800, color: '#ffe066', align: 'center' });
        });
        // 光从天体射向地球
        const sx = 160, ex = 840, y = 150;
        ctx.fillStyle = st.star === 0 ? '#dee2e6' : st.star === 1 ? '#ffd43b' : '#e7f5ff';
        ctx.beginPath(); ctx.arc(sx, y, st.star === 4 ? 30 : 38, 0, TAU); ctx.fill();
        if (st.star === 4) { ctx.fillStyle = 'rgba(208,191,255,.5)'; ctx.beginPath(); ctx.ellipse(sx, y, 70, 22, -0.4, 0, TAU); ctx.fill(); }
        D.text(ctx, s.name, sx, y + 62, { size: F(14), weight: 800, color: '#fff', align: 'center' });
        ctx.fillStyle = '#4dabf7'; ctx.beginPath(); ctx.arc(ex, y, 34, 0, TAU); ctx.fill();
        D.text(ctx, '地球', ex, y + 62, { size: F(14), weight: 800, color: '#74c0fc', align: 'center' });
        const px = sx + 40 + (ex - sx - 80) * st.pulse;
        const g = ctx.createLinearGradient(px - 160, 0, px, 0); g.addColorStop(0, 'rgba(255,224,102,0)'); g.addColorStop(1, 'rgba(255,224,102,.9)');
        ctx.fillStyle = g; ctx.fillRect(Math.max(sx + 40, px - 160), y - 3, Math.min(160, px - sx - 40), 6);
        D.text(ctx, s.d, (sx + ex) / 2, y - 40, { size: F(15), weight: 800, color: '#ced4da', align: 'center' });
        if (st.pulse >= 1) D.text(ctx, '到达！用时 ' + s.t, (sx + ex) / 2, y + 40, { size: F(16), weight: 900, color: '#ffe066', align: 'center' });
      }
      ctx.restore();
    }
    upd();
    loop.start();
  });

  /* ================= 先看到闪电，后听到雷声 / 百米赛跑计时 ================= */
  function rumble(dur) {
    const a = PS.sound.ctx();
    if (!a) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) { v = v * 0.985 + (Math.random() * 2 - 1) * 0.15; const t = i / len; d[i] = v * (t < 0.05 ? t / 0.05 : Math.pow(1 - t, 1.6)) * (1 + 0.5 * Math.sin(i / 2400)); }
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const g = a.createGain(); g.gain.value = 1.4;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  function bang() {
    const a = PS.sound.ctx();
    if (!a) return;
    const len = Math.floor(a.sampleRate * 0.3), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
    const src = a.createBufferSource(); src.buffer = buf;
    const g = a.createGain(); g.gain.value = 0.7;
    src.connect(g).connect(a.destination); src.start();
  }
  PS.register('thunder', function (el) {
    const VW = 1000, VH = 380;
    const st = { mode: 'storm', d: 1360, phase: 'idle', t0: 0, flash: 0, el: 0, heard: false, run: 0, by: 'smoke', res: null, answered: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const seg = PS.ui.seg([{ value: 'storm', label: '闪电和雷声' }, { value: 'race', label: '百米赛跑计时' }], st.mode, (v) => { st.mode = v; st.phase = 'idle'; st.res = null; upd(); });
    const go = PS.ui.button('⚡ 来一道闪电', () => {
      st.d = PS.randInt(3, 12) * 170; st.phase = 'wait'; st.t0 = performance.now(); st.flash = 1; st.heard = false; st.answered = false;
      inp.value = ''; inp.disabled = false; fb.innerHTML = ''; loop.start(); upd();
    }, 'btn btn-primary');
    const bySeg = PS.ui.seg([{ value: 'smoke', label: '看到发令枪冒烟时开始计时' }, { value: 'sound', label: '听到枪声时开始计时' }], st.by, (v) => { st.by = v; });
    const runBtn = PS.ui.button('▶ 开始比赛', () => { st.phase = 'run'; st.run = 0; st.res = null; st.flash = 1; bang(); loop.start(); upd(); }, 'btn btn-primary');
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '距离', autocomplete: 'off' });
    const fb = h('span', { class: 'q-fb' });
    const ask = h('div', { class: 'q-fill' }, h('span', null, '雷电发生处离你约'), inp, h('span', null, 'm'), PS.ui.button('提交', check, 'btn btn-sm btn-primary'), fb);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    const msg = h('div', { class: 'feedback show info' });
    const rS = PS.ui.row(go), rR = PS.ui.row(bySeg.el, runBtn);
    el.append(PS.ui.row(seg.el), rS, rR, ask, msg);
    function check() {
      if (st.phase !== 'done' || st.answered) return;
      const v = parseFloat(inp.value);
      if (isNaN(v)) return;
      st.answered = true;
      const ok = Math.abs(v - st.d) <= st.d * 0.06;
      fb.className = 'q-fb ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✔ 正确！' : '✘ ') + '<i class="var">s</i> = <i class="var">v</i><i class="var">t</i> = 340 m/s × ' + (st.d / 340).toFixed(1) + ' s ≈ ' + st.d + ' m';
      ok ? PS.sound.good() : PS.sound.bad();
    }
    function upd() {
      rS.style.display = st.mode === 'storm' ? '' : 'none';
      ask.style.display = st.mode === 'storm' && st.phase === 'done' ? '' : 'none';
      rR.style.display = st.mode === 'race' ? '' : 'none';
      if (st.mode === 'storm') {
        msg.innerHTML = st.phase === 'idle' ? '闪电和雷声是同时发生的。点按钮来一道闪电，停表会在看到闪电时自动开始计时、听到雷声时停止（打开声音能听到雷声）。'
          : st.phase === 'wait' ? '看到闪电了！等着听雷声……' : '听到雷声了！光传播这段距离只需要约 ' + PS.sci(st.d / 3e8, 2) + ' s，可以忽略不计。根据声速 340 m/s 算一算雷电离你多远？';
      } else {
        msg.innerHTML = st.res ? st.res : '运动员在起点听到枪声起跑，计时员站在 100 m 外的终点。计时员应该<b>看到发令枪冒烟</b>时开始计时，还是<b>听到枪声</b>时开始计时？选一种方法试试。';
      }
      S.render();
    }
    const loop = PS.loop((dt) => {
      st.flash = Math.max(0, st.flash - dt * 2.5);
      if (st.mode === 'storm' && st.phase === 'wait') {
        st.el = (performance.now() - st.t0) / 1000;
        if (st.el >= st.d / 340) { st.el = st.d / 340; st.phase = 'done'; rumble(2.4); upd(); }
      }
      if (st.mode === 'race' && st.phase === 'run') {
        st.run += dt * 2; // 2 倍速
        const T = 12.5, sd = 100 / 340;
        if (st.run >= T) {
          st.run = T; st.phase = 'end';
          const rec = st.by === 'smoke' ? T : T - sd;
          st.res = st.by === 'smoke'
            ? '计时员记录的成绩：<b>' + rec.toFixed(2) + ' s</b>（准确）。光速很大，光传播 100 m 的时间可以忽略，看到冒烟就开始计时是准确的。'
            : '计时员记录的成绩：<b>' + rec.toFixed(2) + ' s</b>，比真实成绩 12.50 s 少了约 <b>0.29 s</b>（声音传播 100 m 需要 <i class="var">t</i> = 100 m ÷ 340 m/s ≈ 0.29 s）——成绩被记得<b>偏好</b>了。所以计时员要<b>看到冒烟</b>就开始计时。';
          upd();
        }
      }
      S.render();
      if (st.flash <= 0 && st.phase !== 'wait' && st.phase !== 'run') loop.stop();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      if (st.mode === 'storm') {
        ctx.fillStyle = PS.mixColor('#1b2333', '#e7f5ff', st.flash * 0.8); ctx.fillRect(0, 0, VW, VH);
        [[180, 40, 1.2], [380, 30, 1.5], [600, 45, 1.25], [800, 25, 1]].forEach(([x, y, k]) => { ctx.fillStyle = PS.mixColor('#3d4552', '#adb5bd', st.flash * 0.6); [[0, 0, 60], [55, 12, 46], [-55, 14, 44], [25, -28, 42], [-25, -24, 38]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * k, y + dy * k, r * k, 0, TAU); ctx.fill(); }); });
        if (st.flash > 0.2) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(420, 90); ctx.lineTo(390, 170); ctx.lineTo(430, 180); ctx.lineTo(380, 300); ctx.stroke(); }
        ctx.fillStyle = '#2b3a2b'; ctx.fillRect(0, 300, VW, 80);
        ctx.fillStyle = '#868e96'; ctx.fillRect(820, 240, 90, 60); ctx.beginPath(); ctx.moveTo(810, 240); ctx.lineTo(865, 200); ctx.lineTo(920, 240); ctx.fill();
        ctx.fillStyle = '#ffd43b'; ctx.fillRect(850, 260, 20, 20);
        D.text(ctx, '你在这里', 865, 330, { size: F(13), weight: 700, color: '#dee2e6', align: 'center' });
        if (st.phase !== 'idle') {
          // 声波的传播
          const tt = st.el, x = 400 + (465 * tt) / (st.d / 340);
          if (st.phase === 'wait') { ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const r = x - 400 - k * 14; if (r > 1) { ctx.beginPath(); ctx.arc(400, 300, r, -0.6, 0); ctx.stroke(); } } }
          D.text(ctx, '停表：' + st.el.toFixed(1) + ' s', 60, 350, { size: F(18), weight: 900, color: '#ffe066' });
          D.text(ctx, st.phase === 'done' ? '🔊 轰隆隆……' : '', 600, 140, { size: F(22), weight: 900, color: '#fff' });
        }
      } else {
        ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
        ctx.fillStyle = '#e8590c'; ctx.fillRect(0, 250, VW, 70);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(0, 270 + i * 20); ctx.lineTo(VW, 270 + i * 20); ctx.stroke(); }
        const X0 = 100, X1 = 880;
        ctx.fillStyle = '#fff'; ctx.fillRect(X0 - 2, 250, 4, 70); ctx.fillRect(X1 - 2, 250, 4, 70);
        D.text(ctx, '起点', X0, 340, { size: F(13), weight: 700, color: '#495057', align: 'center' });
        D.text(ctx, '终点（计时员）', X1, 340, { size: F(13), weight: 700, color: '#495057', align: 'center' });
        D.dim(ctx, X0, X1, 230, '100 m', { color: '#3b5bdb', size: F(13) });
        // 发令员与烟
        ctx.fillStyle = '#495057'; ctx.fillRect(X0 - 50, 170, 14, 80);
        if (st.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + st.flash + ')'; ctx.beginPath(); ctx.arc(X0 - 30, 150, 26 * (1.3 - st.flash), 0, TAU); ctx.fill(); }
        // 运动员
        const T = 12.5, p = st.phase === 'idle' ? 0 : Math.min(1, st.run / T);
        const rx = X0 + (X1 - X0) * p;
        ctx.fillStyle = '#1c7ed6'; ctx.beginPath(); ctx.arc(rx, 200, 10, 0, TAU); ctx.fill(); ctx.fillRect(rx - 6, 210, 12, 26);
        ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 4; const sw = Math.sin(st.run * 12) * 10;
        ctx.beginPath(); ctx.moveTo(rx, 236); ctx.lineTo(rx + sw, 252); ctx.moveTo(rx, 236); ctx.lineTo(rx - sw, 252); ctx.stroke();
        // 两种计时
        const sd = 100 / 340;
        const tSmoke = st.phase === 'idle' ? 0 : st.run, tSound = st.phase === 'idle' ? 0 : Math.max(0, st.run - sd);
        D.text(ctx, '看到冒烟开始计时：' + tSmoke.toFixed(2) + ' s', 520, 60, { size: F(16), weight: 800, color: st.by === 'smoke' ? '#2b8a3e' : '#868e96' });
        D.text(ctx, '听到枪声开始计时：' + tSound.toFixed(2) + ' s', 520, 100, { size: F(16), weight: 800, color: st.by === 'sound' ? '#e03131' : '#868e96' });
        if (st.phase === 'run' && st.run < sd * 3) D.text(ctx, '枪声正在传向终点……', 520, 140, { size: F(13), weight: 700, color: '#e8590c' });
      }
      ctx.restore();
    }
    upd();
  });
})();
