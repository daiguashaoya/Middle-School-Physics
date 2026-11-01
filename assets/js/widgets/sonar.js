/* 第3节：声的利用——蝙蝠回声定位、声呐测海深、声波传递能量、信息还是能量。依赖 sound.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  /* ================= 蝙蝠的回声定位 ================= */
  PS.register('bat-echo', function (el) {
    const VW = 1000, VH = 460, PPM = 100; // 画面宽 10 m
    const SLOW = 100;                     // 超声波画面放慢 100 倍
    const st = { bat: { x: 120, y: 230 }, moths: [], rocks: [], pings: [], log: [], lit: false, t: 0, eaten: 0, fly: null, drag: false };
    function spawn() {
      st.moths = [0, 1, 2].map(() => ({ x: PS.rand(420, 900), y: PS.rand(70, 400), vx: 0, vy: 0, glow: 0, alive: true }));
    }
    st.rocks = [{ x: 560, y: 0, w: 60, h: 110, kind: 'down' }, { x: 300, y: VH, w: 70, h: 90, kind: 'up' }, { x: 760, y: VH, w: 80, h: 130, kind: 'up' }].map((r) => Object.assign(r, { glow: 0 }));
    spawn();
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'grab';
    const pingBtn = PS.ui.button('📡 发出超声波', ping, 'btn btn-primary');
    const catchBtn = PS.ui.button('🦇 去捕捉最近的飞蛾', hunt, 'btn btn-accent');
    const litT = PS.ui.toggle('开灯（显示所有物体）', false, (v) => { st.lit = v; loop.start(); S.render(); });
    const logBox = h('div', { class: 'bat-log' });
    el.append(PS.ui.row(pingBtn, catchBtn, litT.el), logBox, h('div', { class: 'kbd-hint' }, '可以拖动蝙蝠换个位置。画面中超声波的传播被放慢了约 100 倍；声速取 340 m/s。'));

    // 某个物体离蝙蝠最近的点的距离（像素）
    function distTo(o) {
      if (o.kind) { const cx = PS.clamp(st.bat.x, o.x - o.w / 2, o.x + o.w / 2), cy = o.kind === 'down' ? Math.min(st.bat.y, o.h) : Math.max(st.bat.y, VH - o.h); return Math.hypot(cx - st.bat.x, cy - st.bat.y); }
      return Math.hypot(o.x - st.bat.x, o.y - st.bat.y);
    }
    function ping() {
      if (st.fly) return;
      st.pings.push({ x: st.bat.x, y: st.bat.y, t0: st.t, hits: [] });
      st.log = [];
      PS.audio.note(1500, { timbre: 'fork', dur: 0.08, gain: 0.08 }); // 真正的超声波人耳听不到，这里用“嘀”表示
      loop.start();
    }
    function hunt() {
      const seen = st.log.filter((l) => l.o.alive !== undefined && l.o.alive);
      if (!seen.length) { PS.toast('先发出超声波，找到飞蛾在哪里'); return; }
      seen.sort((a, b) => a.d - b.d);
      st.fly = { o: seen[0].o, x0: st.bat.x, y0: st.bat.y, k: 0 };
      loop.start();
    }
    const loop = PS.loop((dt) => {
      st.t += dt;
      const vpx = (340 * PPM) / SLOW; // 画面中的声速 px/s
      st.moths.forEach((m) => {
        if (!m.alive) return;
        m.vx += PS.rand(-1, 1) * 60 * dt; m.vy += PS.rand(-1, 1) * 60 * dt;
        m.vx *= 0.97; m.vy *= 0.97;
        m.x = PS.clamp(m.x + m.vx * dt, 380, 950); m.y = PS.clamp(m.y + m.vy * dt, 50, 410);
        m.glow = Math.max(0, m.glow - dt * 0.5);
      });
      st.rocks.forEach((r) => { r.glow = Math.max(0, r.glow - dt * 0.5); });
      st.pings.forEach((p) => {
        const R = (st.t - p.t0) * vpx;
        [...st.moths.filter((m) => m.alive), ...st.rocks].forEach((o) => {
          if (p.hits.some((x) => x.o === o)) return;
          const d = o.kind ? distTo(o) : Math.hypot(o.x - p.x, o.y - p.y);
          if (R >= d) { p.hits.push({ o, d, tHit: st.t, back: false }); o.glow = 1; }
        });
        p.hits.forEach((hh) => {
          if (!hh.back && (st.t - hh.tHit) * vpx >= hh.d) {
            hh.back = true;
            const dm = hh.d / PPM, tt = (2 * dm) / 340;
            st.log.push({ o: hh.o, d: dm, t: tt });
            renderLog();
          }
        });
      });
      st.pings = st.pings.filter((p) => (st.t - p.t0) * vpx < 2400);
      if (st.fly) {
        const f = st.fly;
        f.k = Math.min(1, f.k + dt / 1.2);
        const e = f.k * f.k * (3 - 2 * f.k);
        st.bat.x = PS.lerp(f.x0, f.o.x, e); st.bat.y = PS.lerp(f.y0, f.o.y, e);
        if (f.k >= 1) {
          f.o.alive = false; st.eaten++; st.fly = null; st.log = []; renderLog();
          PS.sound.good(); PS.toast('捉到一只飞蛾！已捕获 ' + st.eaten + ' 只');
          if (st.moths.every((m) => !m.alive)) setTimeout(spawn, 800);
        }
      }
      S.render();
      if (!st.pings.length && !st.fly && st.moths.every((m) => m.glow === 0) && !st.lit) loop.stop();
    }, S.stage);

    function renderLog() {
      if (!st.log.length) { logBox.innerHTML = '<span class="muted small">发出超声波后，收到的回声会列在这里。</span>'; return; }
      logBox.innerHTML = '<b>收到 ' + st.log.length + ' 个回声：</b>' + st.log.map((l) =>
        '<div>' + (l.o.kind ? '⛰️ 岩石' : '🦋 飞蛾') + '：回声用时 t = ' + (l.t * 1000).toFixed(1) + ' ms，距离 s = vt / 2 = 340 m/s × ' + l.t.toFixed(4) + ' s ÷ 2 ≈ <b>' + l.d.toFixed(2) + ' m</b></div>').join('');
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = st.lit ? '#2b3a55' : '#0b1324'; ctx.fillRect(0, 0, VW, VH);
      // 岩石
      st.rocks.forEach((r) => {
        const a = st.lit ? 1 : r.glow;
        if (a <= 0) return;
        ctx.fillStyle = 'rgba(173,181,189,' + a + ')';
        ctx.beginPath();
        if (r.kind === 'down') { ctx.moveTo(r.x - r.w / 2, 0); ctx.lineTo(r.x, r.h); ctx.lineTo(r.x + r.w / 2, 0); }
        else { ctx.moveTo(r.x - r.w / 2, VH); ctx.lineTo(r.x, VH - r.h); ctx.lineTo(r.x + r.w / 2, VH); }
        ctx.closePath(); ctx.fill();
      });
      // 飞蛾
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      st.moths.forEach((m) => {
        if (!m.alive) return;
        const a = st.lit ? 1 : m.glow;
        if (a <= 0) return;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(255,212,59,.25)'; ctx.beginPath(); ctx.arc(m.x, m.y, 26, 0, TAU); ctx.fill();
        ctx.font = F(28, 18) + 'px ' + PS.FONT; ctx.fillText('🦋', m.x, m.y);
        ctx.globalAlpha = 1;
      });
      // 超声波与回声
      const vpx = (340 * PPM) / SLOW;
      st.pings.forEach((p) => {
        const R = (st.t - p.t0) * vpx;
        ctx.strokeStyle = 'rgba(116,192,252,' + Math.max(0, 0.9 - R / 1200) + ')'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke();
        p.hits.forEach((hh) => {
          if (hh.back) return;
          const rr = (st.t - hh.tHit) * vpx;
          const ox = hh.o.kind ? PS.clamp(p.x, hh.o.x - hh.o.w / 2, hh.o.x + hh.o.w / 2) : hh.o.x, oy = hh.o.kind ? (hh.o.kind === 'down' ? Math.min(p.y, hh.o.h) : Math.max(p.y, VH - hh.o.h)) : hh.o.y;
          const ang = Math.atan2(p.y - oy, p.x - ox);
          ctx.strokeStyle = 'rgba(255,169,77,.9)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ox, oy, rr, ang - 0.5, ang + 0.5); ctx.stroke();
        });
      });
      // 蝙蝠
      const bg = ctx.createRadialGradient(st.bat.x, st.bat.y, 4, st.bat.x, st.bat.y, 38);
      bg.addColorStop(0, 'rgba(255,255,255,.75)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(st.bat.x, st.bat.y, 38, 0, TAU); ctx.fill();
      ctx.font = F(44, 26) + 'px ' + PS.FONT; ctx.fillText('🦇', st.bat.x, st.bat.y);
      ctx.textBaseline = 'alphabetic';
      D.text(ctx, st.lit ? '开灯后能看到所有物体' : '一片漆黑——蝙蝠靠回声“看见”周围的物体', 20, 30, { size: F(15), weight: 700, color: '#e9ecef' });
      // 比例尺
      ctx.fillStyle = '#868e96'; ctx.fillRect(20, VH - 24, PPM, 3);
      D.text(ctx, '1 m', 20 + PPM / 2, VH - 30, { size: F(12), color: '#adb5bd', align: 'center' });
      ctx.restore();
    }
    S.canvas.addEventListener('pointerdown', (e) => {
      const p = S.pos(e), x = (p.x / S.w) * VW, y = (p.y / S.h) * VH;
      if (Math.hypot(x - st.bat.x, y - st.bat.y) < 40 && !st.fly) { st.drag = true; S.canvas.setPointerCapture(e.pointerId); S.stage.style.cursor = 'grabbing'; }
    });
    S.canvas.addEventListener('pointermove', (e) => {
      if (!st.drag) return;
      const p = S.pos(e);
      st.bat.x = PS.clamp((p.x / S.w) * VW, 30, 960); st.bat.y = PS.clamp((p.y / S.h) * VH, 30, VH - 30);
      S.render();
    });
    S.canvas.addEventListener('pointerup', () => { st.drag = false; S.stage.style.cursor = 'grab'; });
    renderLog();
    document.head.append(h('style', null, '.bat-log{margin-top:10px;background:var(--surface-2);border-radius:10px;padding:8px 14px;font-size:.92rem;border:1px dashed var(--line-2);min-height:44px}.bat-log div{margin:3px 0}'));
  });

  /* ================= 声呐测海深 ================= */
  PS.register('sonar', function (el) {
    const VW = 1000, VH = 470, SEA = 90, DMAX = 6000, VW_S = 1500; // 海水中声速 1 500 m/s
    const Y = (d) => SEA + (d / DMAX) * (VH - SEA - 20);
    const st = { x: 60, scan: false, pulse: null, pts: [], fish: [], showTrue: true, t: 0, lastPing: -9, last: null };
    let bed = [];
    function genBed() {
      const a = [PS.rand(0, TAU), PS.rand(0, TAU), PS.rand(0, TAU)];
      bed = [];
      for (let x = 0; x <= VW; x += 5) bed.push(2600 + 900 * Math.sin(x / 160 + a[0]) + 500 * Math.sin(x / 57 + a[1]) + (x > 520 && x < 640 ? -1700 * Math.sin(((x - 520) / 120) * Math.PI) : 0) + 200 * Math.sin(x / 23 + a[2]));
      st.fish = [{ x: PS.rand(200, 400), d: PS.rand(500, 1200) }, { x: PS.rand(600, 850), d: PS.rand(700, 1500) }];
      st.pts = []; st.x = 60; st.last = null;
    }
    const depthAt = (x) => bed[PS.clamp(Math.round(x / 5), 0, bed.length - 1)];
    genBed();
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const scanBtn = PS.ui.button('▶ 开船扫描', () => { st.scan = !st.scan; scanBtn.innerHTML = st.scan ? '⏸ 暂停' : '▶ 开船扫描'; if (st.scan) loop.start(); }, 'btn btn-primary');
    const oneBtn = PS.ui.button('📍 在这里测一次', () => { if (!st.pulse) { firePing(); loop.start(); } }, 'btn');
    const newBtn = PS.ui.button('换一片海域', () => { genBed(); st.pulse = null; S.render(); upd(); }, 'btn btn-ghost');
    const trueT = PS.ui.toggle('显示真实海底', true, (v) => { st.showTrue = v; S.render(); });
    const rt = PS.ui.readout('回声用时 t', '—', 'accent');
    const rd = PS.ui.readout('海深 s = vt/2', '—', 'primary');
    const note = h('div', { class: 'feedback show info small' }, '声呐向海底发出超声波，接收海底反射回来的回声。海水中的声速约 1 500 m/s，由回声用时就能算出海深。');
    el.append(PS.ui.row(scanBtn, oneBtn, newBtn, trueT.el), h('div', { class: 'readouts' }, rt.el, rd.el), note);

    function firePing() { st.pulse = { x: st.x, t0: st.t, d: depthAt(st.x), fish: st.fish.find((f) => Math.abs(f.x - st.x) < 40) || null, gotFish: false }; PS.audio.note(1200, { timbre: 'fork', dur: 0.12, gain: 0.06 }); }
    const PULSE_T = 0.45; // 画面中一次往返只用 0.45 s（真实时间要几秒）
    const loop = PS.loop((dt) => {
      st.t += dt;
      st.fish.forEach((f) => { f.x += Math.sin(st.t * 0.6 + f.d) * 8 * dt; });
      if (st.scan && !st.pulse) {
        st.x += 150 * dt;
        if (st.x - (st.pts.length ? st.pts[st.pts.length - 1].x : -99) >= 24) firePing();
        if (st.x > VW - 50) { st.scan = false; scanBtn.innerHTML = '▶ 开船扫描'; }
      }
      const p = st.pulse;
      if (p) {
        const k = (st.t - p.t0) / PULSE_T;
        if (p.fish && !p.gotFish && k >= p.fish.d / p.d) { p.gotFish = true; st.pts.push({ x: p.x, d: p.fish.d, fish: true }); }
        if (k >= 1) {
          const tt = (2 * p.d) / VW_S;
          st.pts.push({ x: p.x, d: p.d });
          st.last = { t: tt, d: p.d };
          st.pulse = null;
          upd();
        }
      }
      S.render();
      if (!st.scan && !st.pulse) loop.stop();
    }, S.stage);
    function upd() {
      if (!st.last) { rt.set('—'); rd.set('—'); return; }
      rt.set(st.last.t.toFixed(2) + ' s');
      rd.set(Math.round(st.last.d) + ' m');
      note.innerHTML = 's = <span class="frac"><span>vt</span><span>2</span></span> = <span class="frac"><span>1 500 m/s × ' + st.last.t.toFixed(2) + ' s</span><span>2</span></span> ≈ <b>' + Math.round(st.last.d) + ' m</b>。声呐还能发现鱼群（较早返回的微弱回声）。注意：这种方法<b>不能</b>测地球到月球的距离，因为太空是真空，不能传声。';
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, SEA);
      const g = ctx.createLinearGradient(0, SEA, 0, VH);
      g.addColorStop(0, '#1971c2'); g.addColorStop(1, '#0b2545');
      ctx.fillStyle = g; ctx.fillRect(0, SEA, VW, VH - SEA);
      // 真实海底
      ctx.fillStyle = st.showTrue ? '#5c4a3a' : 'rgba(11,37,69,1)';
      ctx.beginPath(); ctx.moveTo(0, VH);
      bed.forEach((d, i) => ctx.lineTo(i * 5, Y(d)));
      ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
      // 鱼群
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = F(20, 13) + 'px ' + PS.FONT;
      st.fish.forEach((f) => { ctx.globalAlpha = st.showTrue ? 0.9 : 0.15; for (let i = 0; i < 5; i++) ctx.fillText('🐟', f.x + (i % 3) * 18 - 18, Y(f.d) + Math.floor(i / 3) * 16 - 8); ctx.globalAlpha = 1; });
      ctx.textBaseline = 'alphabetic';
      // 测量结果
      ctx.strokeStyle = '#ffa94d'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      st.pts.filter((p) => !p.fish).forEach((p, i) => (i ? ctx.lineTo(p.x, Y(p.d)) : ctx.moveTo(p.x, Y(p.d))));
      ctx.stroke();
      st.pts.forEach((p) => { ctx.fillStyle = p.fish ? '#63e6be' : '#ffd43b'; ctx.beginPath(); ctx.arc(p.x, Y(p.d), p.fish ? 4 : 4.5, 0, TAU); ctx.fill(); });
      // 声波
      const p = st.pulse;
      if (p) {
        const k = (st.t - p.t0) / PULSE_T, yb = Y(p.d), y = k < 0.5 ? PS.lerp(SEA + 10, yb, k * 2) : PS.lerp(yb, SEA + 10, (k - 0.5) * 2);
        ctx.strokeStyle = k < 0.5 ? '#74c0fc' : '#ffa94d'; ctx.lineWidth = 3;
        for (let j = 0; j < 3; j++) { ctx.globalAlpha = 1 - j * 0.3; ctx.beginPath(); ctx.arc(p.x, y + (k < 0.5 ? -j * 8 : j * 8), 18 + j * 2, k < 0.5 ? 0.6 : Math.PI + 0.6, k < 0.5 ? Math.PI - 0.6 : TAU - 0.6); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      // 船
      ctx.font = F(40, 24) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.fillText('🚢', st.x, SEA + 4);
      // 深度刻度
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = PS.font(F(11), 500); ctx.textAlign = 'left';
      for (let d = 1000; d < DMAX; d += 1000) { ctx.fillRect(0, Y(d), 8, 1.5); ctx.fillText(d + ' m', 12, Y(d) + 4); }
      D.text(ctx, '橙色线：用声呐测得的海底形状', VW - 16, SEA - 12, { size: F(13), weight: 700, color: '#e8590c', align: 'right' });
      ctx.restore();
    }
    upd();
  });

  /* ================= 声波可以传递能量 ================= */
  PS.register('sound-energy', function (el) {
    const VW = 1000, VH = 380;
    const st = { tab: 'candle', on: false, t: 0, vol: 0.7, dirt: [], clean: 0, frags: 1, pulse: -1, snd: null };
    const tabSeg = PS.ui.seg([{ value: 'candle', label: '🕯️ 扬声器与烛焰' }, { value: 'clean', label: '👓 超声波清洗' }, { value: 'stone', label: '🩺 超声波碎石' }], st.tab, (v) => { stopSnd(); st.tab = v; st.on = false; reset(); });
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    el.insertBefore(PS.ui.row(tabSeg.el), S.stage);
    const goBtn = PS.ui.button('▶ 开始', go, 'btn btn-primary');
    const volS = PS.ui.slider({ label: '音量', min: 0, max: 1, step: 0.05, value: st.vol, fmt: (v) => Math.round(v * 100) + '%', onInput: (v) => { st.vol = v; if (st.snd) st.snd.setGain(0.3 * v); } });
    const msg = h('div', { class: 'feedback show info' });
    el.append(PS.ui.row(goBtn, volS.el), msg);
    function stopSnd() { if (st.snd) { st.snd.stop(); st.snd = null; } }
    function reset() {
      st.dirt = []; for (let i = 0; i < 70; i++) st.dirt.push({ x: PS.rand(330, 670), y: PS.rand(200, 250), vx: 0, vy: 0, off: false, r: PS.rand(2, 4.5) });
      st.clean = 0; st.frags = 1; st.pulse = -1;
      goBtn.innerHTML = st.tab === 'stone' ? '💥 发射一次冲击波' : '▶ 开始';
      volS.el.style.display = st.tab === 'candle' ? '' : 'none';
      msg.innerHTML = { candle: '把扬声器对准烛焰，播放声音，观察火焰。', clean: '把沾满污渍的眼镜放进清洗槽，开启超声波。', stone: '体外碎石：把超声波（冲击波）聚焦到体内的结石上。' }[st.tab];
      S.render();
    }
    function go() {
      if (st.tab === 'stone') {
        if (st.frags >= 40) { st.frags = 1; }
        st.pulse = 0; loop.start();
        PS.audio.strike(90, [[1, 1, 0.12]], { gain: 0.35, click: 0.4 });
        return;
      }
      st.on = !st.on;
      goBtn.innerHTML = st.on ? '⏸ 停止' : '▶ 开始';
      stopSnd();
      if (st.on) {
        st.snd = st.tab === 'candle' ? PS.audio.voice({ freq: 70, timbre: 'violin', gain: 0.3 * st.vol }) : PS.audio.noise({ gain: 0.03, filter: { type: 'highpass', freq: 9000 } });
        loop.start();
        if (st.tab === 'candle') msg.innerHTML = '扬声器的纸盆振动，推动空气形成声波，声波把<b>能量</b>传给烛焰，烛焰就晃动起来——<b>声波可以传递能量</b>。调小音量，烛焰晃动变弱。';
        if (st.tab === 'clean') msg.innerHTML = '超声波在清洗液中引起强烈的振动，产生大量微小气泡，污垢被一点点“震”下来……';
      }
    }
    PS.audio.whenHidden(S.stage, () => { if (st.on) go(); });
    const loop = PS.loop((dt) => {
      st.t += dt;
      if (st.tab === 'clean' && st.on) {
        st.dirt.forEach((d) => {
          if (!d.off && Math.random() < dt * 0.5) { d.off = true; d.vx = PS.rand(-30, 30); d.vy = -PS.rand(10, 40); }
          if (d.off) { d.x += d.vx * dt; d.y += d.vy * dt; d.vy -= 8 * dt; }
        });
        st.clean = st.dirt.filter((d) => d.off).length / st.dirt.length;
        if (st.clean > 0.97) { msg.className = 'feedback show ok'; msg.innerHTML = '眼镜洗干净了！超声波在液体中<b>振动强烈</b>，把能量传给污垢，使它们脱落——<b>声波可以传递能量</b>。钟表等精细机械也常用超声波清洗。'; }
      }
      if (st.tab === 'stone' && st.pulse >= 0) {
        st.pulse += dt;
        if (st.pulse > 0.6) {
          st.pulse = -1;
          st.frags = Math.min(40, Math.round(st.frags * 2.2) + 1);
          msg.className = 'feedback show ' + (st.frags >= 40 ? 'ok' : 'info');
          msg.innerHTML = st.frags >= 40 ? '结石被击碎成细小的颗粒，可以随尿液排出体外。超声波把<b>能量</b>传给了结石——<b>声波可以传递能量</b>。' : '结石裂成了 ' + st.frags + ' 块，继续发射冲击波。';
        }
      }
      S.render();
      if (!st.on && st.pulse < 0) loop.stop();
    }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      if (st.tab === 'candle') {
        ctx.fillStyle = '#c69c6d'; ctx.fillRect(60, 300, 880, 16);
        const push = st.on ? Math.sin(st.t * TAU * 6) * 6 * st.vol : 0;
        PS.drawSpeaker(ctx, 230, 200, 170, push);
        if (st.on && st.vol > 0) {
          ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2.5;
          for (let i = 0; i < 4; i++) { const ph = (st.t * 1.2 + i / 4) % 1; ctx.globalAlpha = st.vol * (1 - ph); ctx.beginPath(); ctx.arc(260, 200, 60 + ph * 380, -0.35, 0.35); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
        // 蜡烛
        const cx = 740;
        ctx.fillStyle = '#fff3bf'; ctx.fillRect(cx - 22, 190, 44, 110); ctx.strokeStyle = '#e9c46a'; ctx.strokeRect(cx - 22, 190, 44, 110);
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, 190); ctx.lineTo(cx, 178); ctx.stroke();
        const sway = st.on ? st.vol * (Math.sin(st.t * TAU * 6) * 0.5 + Math.sin(st.t * 17) * 0.2) : 0;
        const fg = ctx.createRadialGradient(cx, 160, 2, cx, 160, 40);
        fg.addColorStop(0, '#fff9db'); fg.addColorStop(0.5, '#ffd43b'); fg.addColorStop(1, 'rgba(240,140,0,.0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.moveTo(cx - 12, 180); ctx.quadraticCurveTo(cx - 16, 150, cx + sway * 40, 112 - st.vol * (st.on ? 6 : 0)); ctx.quadraticCurveTo(cx + 16, 150, cx + 12, 180); ctx.closePath(); ctx.fill();
        D.text(ctx, st.on ? (st.vol > 0 ? '烛焰随着声音晃动' : '音量为 0：烛焰不动') : '烛焰静止', 40, 40, { size: F(16), weight: 700, color: st.on && st.vol > 0 ? '#e8590c' : '#3a4458' });
      } else if (st.tab === 'clean') {
        ctx.fillStyle = '#ced4da'; D.roundRect(ctx, 270, 120, 460, 210, 12); ctx.fill();
        ctx.fillStyle = 'rgba(116,192,252,.55)'; ctx.fillRect(285, 150, 430, 165);
        // 眼镜
        ctx.strokeStyle = '#343a40'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(420, 225, 48, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(580, 225, 48, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(468, 220); ctx.quadraticCurveTo(500, 205, 532, 220); ctx.stroke();
        st.dirt.forEach((d) => { if (d.y < 150) return; ctx.fillStyle = d.off ? 'rgba(130,90,40,.5)' : '#7f5539'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); });
        if (st.on) {
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2;
          for (let i = 0; i < 40; i++) { const x = 290 + ((i * 97 + st.t * 300) % 420), y = 310 - ((i * 53 + st.t * 120) % 150); ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, TAU); ctx.stroke(); }
          ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2;
          for (let i = 0; i < 3; i++) { const ph = (st.t * 3 + i / 3) % 1; ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.moveTo(300, 318 - ph * 160); ctx.lineTo(700, 318 - ph * 160); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = '#495057'; ctx.fillRect(300, 330, 400, 14);
        D.text(ctx, '超声波发生器', 500, 365, { size: F(13), weight: 700, color: '#495057', align: 'center' });
        D.text(ctx, '清洁度 ' + Math.round(st.clean * 100) + '%', 40, 40, { size: F(16), weight: 700, color: st.clean > 0.97 ? '#2b8a3e' : '#3a4458' });
      } else {
        // 肾脏与结石
        ctx.fillStyle = '#ffc9c9'; ctx.beginPath(); ctx.ellipse(500, 150, 150, 95, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f8fafd'; ctx.beginPath(); ctx.ellipse(380, 150, 40, 30, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#868e96';
        const n = st.frags;
        for (let i = 0; i < n; i++) {
          const a = i * 2.4, r = n === 1 ? 0 : 6 + Math.sqrt(i) * 7 * Math.min(1, n / 10);
          const s = Math.max(2.5, 26 / Math.sqrt(n));
          ctx.beginPath(); ctx.arc(510 + Math.cos(a) * r, 150 + Math.sin(a) * r * 0.7, s, 0, TAU); ctx.fill();
        }
        // 碎石机探头与聚焦的冲击波
        ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.ellipse(510, 360, 110, 30, 0, Math.PI, TAU); ctx.fill();
        if (st.pulse >= 0) {
          const k = st.pulse / 0.6;
          ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) { const kk = k - i * 0.12; if (kk < 0 || kk > 1) continue; const y = PS.lerp(335, 160, kk), half = PS.lerp(100, 8, kk); ctx.globalAlpha = 1 - i * 0.25; ctx.beginPath(); ctx.moveTo(510 - half, y + 10); ctx.quadraticCurveTo(510, y - 12, 510 + half, y + 10); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
        D.text(ctx, '肾脏中的结石', 660, 90, { size: F(13), weight: 700, color: '#c92a2a' });
        D.text(ctx, '冲击波发生器（体外）', 510, 300, { size: F(13), weight: 700, color: '#495057', align: 'center' });
      }
      ctx.restore();
    }
    reset();
  });

  /* ================= 声音传递信息还是能量 ================= */
  const USES = [
    ['隆隆的雷声预示着一场大雨可能要来了', 'i'],
    ['铁路工人敲击铁轨，从声音判断螺栓是否松动', 'i'],
    ['医生用听诊器了解病人心、肺的情况', 'i'],
    ['利用 B 超检查身体内部器官', 'i'],
    ['汽车上的倒车雷达', 'i'],
    ['渔船用声呐探测鱼群的位置', 'i'],
    ['买西瓜时拍一拍，听声音判断是否成熟', 'i'],
    ['利用次声波监测地震、海啸', 'i'],
    ['用超声波清洗眼镜和精密零件', 'e'],
    ['外科医生用超声波击碎体内的结石', 'e'],
    ['扬声器发声时，旁边的烛焰随之晃动', 'e'],
    ['在雪山上大声喊叫，可能引起雪崩', 'e'],
    ['超声波加湿器把水“打”成细小的雾滴', 'e'],
    ['飞机飞过时，窗户玻璃被震得嗡嗡作响', 'e'],
  ];
  PS.register('use-sort', function (el) {
    const score = h('div', { class: 'quiz-score' });
    const grid = h('div', { class: 'us-grid' });
    let ok = 0, done = 0;
    function build() {
      ok = 0; done = 0; grid.innerHTML = '';
      const list = USES.slice().sort(() => Math.random() - 0.5);
      list.forEach(([t, k]) => {
        const card = h('div', { class: 'us-card' }, h('p', null, t));
        const res = h('small');
        const pick = (g) => {
          if (card.classList.contains('done')) return;
          card.classList.add('done', g === k ? 'ok' : 'bad');
          done++; if (g === k) ok++;
          res.innerHTML = (g === k ? '✔ ' : '✘ ') + (k === 'i' ? '传递<b>信息</b>' : '传递<b>能量</b>');
          g === k ? PS.sound.good() : PS.sound.bad();
          upd();
        };
        card.append(h('div', { class: 'us-btns' }, PS.ui.button('📨 信息', () => pick('i'), 'btn btn-sm'), PS.ui.button('⚡ 能量', () => pick('e'), 'btn btn-sm')), res);
        grid.append(card);
      });
      upd();
    }
    function upd() { score.innerHTML = '已判断 <b>' + done + '</b> / ' + USES.length + ' · 答对 <b class="ok">' + ok + '</b>' + (done === USES.length ? (ok === USES.length ? ' · 🎉 全对！' : ' · 再试一次？') : ''); }
    el.append(h('div', { class: 'quiz-head' }, score, PS.ui.button('重新开始', build, 'btn btn-ghost btn-sm')), grid);
    build();
  });
})();
