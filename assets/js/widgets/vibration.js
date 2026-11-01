/* 第1节：声音的产生（发声体在振动、转换法）、人耳听声的过程。依赖 sound.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const VW = 1000, VH = 540; // 画布按 1000×540 的虚拟坐标绘制


  /* ================= 发声的物体在振动 ================= */
  const OBJS = {
    fork: { name: '音叉与乒乓球', act: '🔨 敲击音叉', tau: 1.6, note: '把<b>不发声</b>的音叉靠近乒乓球，球不动；<b>敲响</b>音叉后，乒乓球被<b>反复弹开</b>。音叉的振动很微小，乒乓球把它“放大”了——这种方法叫<span class="def">转换法</span>。' },
    drum: { name: '鼓面与纸屑', act: '🥁 敲击鼓面', tau: 0.8, note: '敲鼓时鼓面上的纸屑<b>上下跳动</b>，说明鼓面在振动；不敲了，鼓面停止振动，纸屑也就停止跳动，鼓声消失。（多点几次“敲击”，模拟不停地敲）' },
    ruler: { name: '钢尺', act: '👆 拨动钢尺', tau: 1.2, note: '把钢尺一端压在桌边，拨动伸出桌面的一端，能看到钢尺在<b>上下振动</b>并听到声音；钢尺停止振动，声音也随之停止。' },
    band: { name: '橡皮筋', act: '👆 拨动橡皮筋', tau: 1.0, note: '拨动张紧的橡皮筋，橡皮筋<b>来回振动</b>，看起来“变粗变模糊”了，同时发出声音。' },
    water: { name: '音叉放入水中', act: '🔨 敲响后放入水中', tau: 0.9, note: '把发声的音叉放入水中，会<b>溅起水花</b>；不发声的音叉放入水中则水面平静。水花把音叉的微小振动“放大”了，这也是<span class="def">转换法</span>。' },
  };

  PS.register('sound-sources', function (el) {
    const st = { obj: 'fork', A: 0, t: 0, hand: 0, hit: 0, rec: [], snd: null, phi: 0, om: 0, scraps: [], drops: [], wave: true };
    for (let i = 0; i < 28; i++) st.scraps.push({ u: PS.rand(-0.82, 0.82), v: PS.rand(-0.7, 0.7), z: 0, vz: 0, rot: PS.rand(0, TAU), c: PS.pick(['#e03131', '#3b5bdb', '#f08c00', '#2b8a3e', '#7048e8']) });

    const seg = PS.ui.seg(Object.keys(OBJS).map((k) => ({ value: k, label: OBJS[k].name })), st.obj, (v) => { stopNow(true); st.obj = v; st.rec = []; actBtn.innerHTML = OBJS[v].act; note.innerHTML = OBJS[v].note; st.phi = 0; st.om = 0; S.render(); });
    el.append(PS.ui.row(seg.el));
    el.lastChild.classList.add('top');
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const actBtn = PS.ui.button(OBJS.fork.act, excite, 'btn btn-primary');
    const handBtn = PS.ui.button('✋ 用手按住', () => stopNow(false), 'btn');
    const stateR = PS.ui.readout('物体状态', '静止');
    const soundR = PS.ui.readout('是否发声', '没有声音');
    const note = h('div', { class: 'tip', html: OBJS.fork.note });
    el.append(PS.ui.row(actBtn, handBtn), h('div', { class: 'readouts' }, stateR.el, soundR.el), note);

    function excite() {
      if (st.snd) st.snd.stop();
      st.A = Math.min(1, st.A + (st.obj === 'drum' ? 0.75 : 1));
      st.hit = 0.25;
      st.hand = 0;
      const o = st.obj, g = 0.32;
      if (o === 'fork') st.snd = PS.audio.strike(440, [[1, 1, 1.6], [6.27, 0.06, 0.06]], { gain: g, click: 0.15 });
      else if (o === 'water') st.snd = PS.audio.strike(440, [[1, 1, 0.9], [6.27, 0.06, 0.05]], { gain: g, click: 0.15 });
      else if (o === 'drum') st.snd = PS.audio.strike(105, [[1, 1, 0.35], [1.59, 0.55, 0.25], [2.14, 0.35, 0.18], [2.65, 0.2, 0.12]], { gain: 0.5, click: 0.5 });
      else if (o === 'ruler') st.snd = PS.audio.strike(92, [[1, 0.8, 0.45], [6.27, 0.55, 0.25], [17.55, 0.12, 0.07]], { gain: 0.38, click: 0.35 });
      else st.snd = PS.audio.strike(196, [[1, 1, 0.55], [2, 0.5, 0.4], [3, 0.28, 0.3], [4, 0.14, 0.2]], { gain: 0.3, click: 0.1 });
      loop.start();
    }
    function stopNow(silent) {
      if (st.A > 0.02 && !silent) st.hand = 1.2;
      st.A = 0;
      if (st.snd) { st.snd.stop(); st.snd = null; }
      if (!silent) loop.start();
    }

    const loop = PS.loop((dt) => {
      st.t += dt;
      const tau = OBJS[st.obj].tau;
      st.A *= Math.exp(-dt / tau);
      if (st.A < 0.015) st.A = 0;
      st.hit = Math.max(0, st.hit - dt);
      st.hand = Math.max(0, st.hand - dt);
      st.rec.push(st.A);
      if (st.rec.length > 240) st.rec.shift();
      step(dt);
      stateR.set(st.A > 0 ? '<span class="hl-o">振动中</span>' : '静止');
      soundR.set(st.A > 0 ? '<span class="hl-o">正在发声</span>' : '没有声音');
      S.render();
      if (st.A === 0 && st.hand === 0 && st.hit === 0 && idle()) loop.stop();
    }, S.stage);
    function idle() {
      if (st.obj === 'fork') return Math.abs(st.om) < 0.01 && st.phi < 0.002;
      if (st.obj === 'drum') return st.scraps.every((p) => p.z <= 0 && p.vz === 0);
      if (st.obj === 'water') return st.drops.length === 0;
      return true;
    }

    // 物理：乒乓球单摆、纸屑跳动、水花
    const G = 2600; // 虚拟坐标中的重力加速度（px/s²）
    function step(dt) {
      if (st.obj === 'fork') {
        const w0 = TAU / 1.25;
        st.om += (-w0 * w0 * Math.sin(st.phi) - 0.6 * st.om) * dt;
        st.phi += st.om * dt;
        if (st.phi <= 0) {
          st.phi = 0;
          if (st.A > 0.03) st.om = Math.max(-st.om * 0.3, st.A * PS.rand(0.75, 1.05) * 1.6);
          else st.om = 0;
        }
      } else if (st.obj === 'drum') {
        st.scraps.forEach((p) => {
          if (p.z <= 0 && p.vz <= 0) {
            p.z = 0; p.vz = 0;
            if (st.A > 0.06 && Math.random() < 0.5) p.vz = st.A * PS.rand(260, 520) * (1 - 0.5 * Math.hypot(p.u, p.v));
          } else {
            p.vz -= G * dt; p.z += p.vz * dt; p.rot += dt * 6;
            if (p.z < 0) { p.z = 0; p.vz = 0; }
          }
        });
      } else if (st.obj === 'water') {
        if (st.A > 0.05) {
          const n = Math.round(st.A * 5 * dt * 60);
          for (let i = 0; i < n; i++) st.drops.push({ x: PS.pick([472, 528]) + PS.rand(-10, 10), y: 298, vx: PS.rand(-300, 300) * st.A, vy: -PS.rand(380, 820) * st.A, r: PS.rand(3, 6) });
        }
        st.drops.forEach((d) => { d.vy += G * dt * 0.6; d.x += d.vx * dt; d.y += d.vy * dt; });
        st.drops = st.drops.filter((d) => d.y < 312);
      }
    }

    // 振动的位移（画面中放慢、放大显示）
    const osc = (f) => st.A * Math.sin(TAU * f * st.t);

    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      const bg = ctx.createLinearGradient(0, 0, 0, VH);
      bg.addColorStop(0, '#f8fafd'); bg.addColorStop(1, '#eef2f8');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
      ({ fork: drawFork, drum: drawDrum, ruler: drawRuler, band: drawBand, water: drawWater })[st.obj](ctx, F);
      // 手
      if (st.hand > 0) {
        ctx.globalAlpha = Math.min(1, st.hand * 2);
        ctx.font = F(54, 28) + 'px ' + PS.FONT; ctx.textAlign = 'center';
        const hp = { fork: [455, 180], drum: [500, 210], ruler: [700, 230], band: [520, 220], water: [500, 120] }[st.obj];
        ctx.fillText('✋', hp[0], hp[1]);
        ctx.globalAlpha = 1;
      }
      if (st.wave) drawRecorder(ctx, F);
      ctx.restore();
    }

    function drawRecorder(ctx, F) {
      const b = { x: 40, y: 420, w: 920, h: 100 };
      const rec = st.rec;
      PS.scope(ctx, b, {
        label: '声音传感器记录的波形', labelSize: F(12),
        note: '振动停止，发声也停止',
        traces: [{ fn: (x) => { const i = Math.floor(x * 239) - (240 - rec.length); if (i < 0) return 0; return rec[i] * Math.sin(x * 900); }, color: '#69db7c', width: 1.5, glow: 2 }],
      });
    }

    function table(ctx, x0, x1, y) {
      ctx.fillStyle = '#c69c6d'; ctx.fillRect(x0, y, x1 - x0, 18);
      ctx.fillStyle = '#a47148'; ctx.fillRect(x0, y + 18, x1 - x0, 6);
    }

    function drawFork(ctx, F) {
      table(ctx, 80, 920, 380);
      // 音叉（插在底座上），叉臂从 y≈268 伸到 y≈58
      ctx.fillStyle = '#5c7cfa'; D.roundRect(ctx, 470, 352, 120, 28, 6); ctx.fill();
      if (st.A > 0) { ctx.globalAlpha = 0.18; PS.drawFork(ctx, 530, 356, 210, st.A * 7); PS.drawFork(ctx, 530, 356, 210, -st.A * 7); ctx.globalAlpha = 1; }
      PS.drawFork(ctx, 530, 356, 210, osc(17) * 7, { freqLabel: '440 Hz' });
      // 乒乓球用细线挂在支架上，静止时恰好贴在右叉臂外侧
      const r = 26, py = 26, L = 110;
      const pivotX = 530 + 210 * 0.1 + 210 * 0.11 + r;
      ctx.fillStyle = '#495057'; ctx.fillRect(820, py - 10, 12, 380 - py + 10); ctx.fillRect(pivotX - 10, py - 10, 832 - pivotX + 10, 10);
      const bx = pivotX + L * Math.sin(st.phi), by = py + L * Math.cos(st.phi);
      ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(pivotX, py); ctx.lineTo(bx, by); ctx.stroke();
      const g = ctx.createRadialGradient(bx - 8, by - 8, 3, bx, by, r);
      g.addColorStop(0, '#fff'); g.addColorStop(1, '#ffd8a8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e8590c'; ctx.lineWidth = 1.2; ctx.stroke();
      // 说明
      D.text(ctx, '悬挂的乒乓球', bx + 34, by + 6, { size: F(14), weight: 700, color: '#e8590c' });
      D.text(ctx, st.A > 0 ? '音叉在振动 → 乒乓球被弹开' : (st.phi > 0.01 ? '…' : '音叉不发声 → 乒乓球静止'), 40, 40, { size: F(16), weight: 700, color: st.A > 0 ? '#e8590c' : '#3a4458' });
      soundRings(ctx, 500, 150, 2.4, 3.9);
    }

    // 向外扩散的声波示意（a0~a1 为弧的角度范围）
    function soundRings(ctx, x, y, a0, a1) {
      if (st.A <= 0.03) return;
      ctx.save();
      ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) {
        const ph = (st.t * 1.4 + i / 3) % 1;
        ctx.globalAlpha = st.A * (1 - ph) * 0.8;
        ctx.beginPath(); ctx.arc(x, y, 40 + ph * 120, a0 == null ? -2.6 : a0, a1 == null ? -0.55 : a1); ctx.stroke();
      }
      ctx.restore();
    }

    function drawDrum(ctx, F) {
      const cx = 500, cy = 205, rx = 230, ry = 62, H = 110;
      const m = osc(12) * 14; // 鼓面中心的上下位移
      // 鼓身
      const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      g.addColorStop(0, '#a61e4d'); g.addColorStop(0.45, '#e64980'); g.addColorStop(1, '#a61e4d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(cx - rx, cy); ctx.lineTo(cx - rx, cy + H); ctx.ellipse(cx, cy + H, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, cy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f9e2ae'; ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; ctx.beginPath(); ctx.moveTo(cx + Math.sin(a) * rx, cy + ry * Math.cos(a) * 0.95); ctx.lineTo(cx + Math.sin(a + 0.15) * rx, cy + H + ry * Math.cos(a + 0.15) * 0.95); ctx.stroke(); }
      // 鼓面（中心凹凸）
      const mg = ctx.createRadialGradient(cx, cy - m * 0.5, 10, cx, cy, rx);
      mg.addColorStop(0, m > 0 ? '#fff9db' : '#f1e7c4'); mg.addColorStop(1, '#e9dcb4');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#862e9c'; ctx.lineWidth = 6; ctx.stroke();
      if (st.A > 0.05) {
        ctx.strokeStyle = 'rgba(112,72,232,' + (st.A * 0.5) + ')'; ctx.lineWidth = 1.5;
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(cx, cy - m * (1 - k / 4) * 0.6, rx * k / 4, ry * k / 4, 0, 0, TAU); ctx.stroke(); }
      }
      // 纸屑
      st.scraps.forEach((p) => {
        const sx = cx + p.u * rx * 0.9, base = cy + p.v * ry * 0.85 * Math.sqrt(Math.max(0, 1 - p.u * p.u));
        const surf = base - m * (1 - Math.hypot(p.u, p.v) * 0.8);
        const sy = surf - p.z;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-6, -3, 12, 6);
        ctx.restore();
      });
      // 鼓槌
      const ang = st.hit > 0 ? -0.2 + (0.25 - st.hit) * 2 : -0.7;
      ctx.save(); ctx.translate(820, 120); ctx.rotate(ang);
      ctx.fillStyle = '#8d5524'; ctx.fillRect(-230, -5, 230, 10);
      ctx.fillStyle = '#c92a2a'; ctx.beginPath(); ctx.arc(-232, 0, 16, 0, TAU); ctx.fill();
      ctx.restore();
      D.text(ctx, st.A > 0.05 ? '鼓面在振动 → 纸屑跳起来' : '鼓面静止 → 纸屑不动', 40, 40, { size: F(16), weight: 700, color: st.A > 0.05 ? '#e8590c' : '#3a4458' });
      soundRings(ctx, 500, 90);
    }

    function drawRuler(ctx, F) {
      table(ctx, 60, 470, 260);
      ctx.fillStyle = '#d0a26f'; ctx.fillRect(80, 284, 30, 120); ctx.fillRect(420, 284, 30, 120);
      const x0 = 300, L = 520, d = osc(9) * 70;
      const shape = (dd) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const k = i / 40, x = x0 - 230 + (230 + L) * k; const kk = Math.max(0, (x - 470) / (x0 - 470 + L)); const y = 252 + dd * kk * kk; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.stroke(); };
      if (st.A > 0) { ctx.strokeStyle = 'rgba(134,142,150,.25)'; shape(st.A * 70); shape(-st.A * 70); }
      ctx.strokeStyle = '#adb5bd'; shape(d);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 1;
      // 压住钢尺的手
      ctx.font = F(56, 26) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.fillText('🖐️', 360, 248);
      D.text(ctx, st.A > 0 ? '钢尺在上下振动 → 发出声音' : '钢尺静止 → 没有声音', 40, 40, { size: F(16), weight: 700, color: st.A > 0 ? '#e8590c' : '#3a4458' });
      D.text(ctx, '伸出桌面的部分', 760, 340, { size: F(13), weight: 600, color: '#6b7487', align: 'center' });
      soundRings(ctx, 800, 170);
    }

    function drawBand(ctx, F) {
      // 小盒子 + 两个支架 + 橡皮筋
      ctx.fillStyle = '#ffe8cc'; D.roundRect(ctx, 200, 270, 600, 110, 12); ctx.fill();
      ctx.strokeStyle = '#d9480f'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#495057'; ctx.fillRect(250, 220, 14, 60); ctx.fillRect(736, 220, 14, 60);
      const x0 = 257, x1 = 743, y = 226;
      const shape = (a) => { ctx.beginPath(); for (let i = 0; i <= 50; i++) { const k = i / 50; ctx.lineTo(x0 + (x1 - x0) * k, y + a * Math.sin(Math.PI * k)); } ctx.stroke(); };
      if (st.A > 0) { ctx.fillStyle = 'rgba(224,49,49,.12)'; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const k = i / 50; ctx.lineTo(x0 + (x1 - x0) * k, y + st.A * 26 * Math.sin(Math.PI * k)); } for (let i = 50; i >= 0; i--) { const k = i / 50; ctx.lineTo(x0 + (x1 - x0) * k, y - st.A * 26 * Math.sin(Math.PI * k)); } ctx.fill(); }
      ctx.strokeStyle = '#c92a2a'; ctx.lineWidth = 4; shape(osc(11) * 26);
      D.text(ctx, st.A > 0 ? '橡皮筋在振动（看起来变粗、变模糊）' : '橡皮筋静止', 40, 40, { size: F(16), weight: 700, color: st.A > 0 ? '#e8590c' : '#3a4458' });
      soundRings(ctx, 500, 150);
    }

    function drawWater(ctx, F) {
      // 水槽
      ctx.fillStyle = 'rgba(116,192,252,.5)'; ctx.fillRect(250, 300, 500, 90);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(240, 220); ctx.lineTo(250, 395); ctx.lineTo(750, 395); ctx.lineTo(760, 220); ctx.stroke();
      // 水面波纹
      ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 250; x <= 750; x += 5) { const dd = Math.abs(x - 500); const yy = 300 + (st.A > 0 ? Math.sin(dd / 9 - st.t * 25) * 5 * st.A * Math.exp(-dd / 160) : 0); x === 250 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
      ctx.stroke();
      // 倒拿的音叉，叉臂尖端插入水中
      ctx.save(); ctx.translate(0, 80); ctx.scale(1, -1); // 关于 y = 40 翻转
      PS.drawFork(ctx, 500, 15.6, 180, osc(17) * 6); // 翻转后叉臂尖端在 y≈320，插入水中
      ctx.restore();
      // 水花
      ctx.fillStyle = '#4dabf7';
      st.drops.forEach((d) => { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); });
      D.text(ctx, st.A > 0 ? '发声的音叉 → 溅起水花' : '不发声的音叉 → 水面平静', 40, 40, { size: F(16), weight: 700, color: st.A > 0 ? '#e8590c' : '#3a4458' });
    }

    S.render();
  });

  /* ================= 我们怎样听到声音 ================= */
  const EAR_STEPS = ['外界传来的声音进入外耳道', '引起鼓膜振动', '听小骨及其他组织把振动传给耳蜗', '听觉神经把信号传给大脑', '大脑产生听觉——听到声音！'];
  PS.register('ear-path', function (el) {
    const st = { t: -1, fault: 'none', bone: false, playing: false };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const steps = h('ol', { class: 'ear-steps' }, EAR_STEPS.map((s) => h('li', null, s)));
    const msg = h('div', { class: 'feedback info show' }, '点击“播放”，看看声音是怎样被我们听到的。');
    const faultSeg = PS.ui.seg([{ value: 'none', label: '听觉正常' }, { value: 'drum', label: '鼓膜损坏' }, { value: 'bone', label: '听小骨损坏' }, { value: 'nerve', label: '听觉神经损坏' }], 'none', (v) => { st.fault = v; restart(); });
    const boneT = PS.ui.toggle('骨传导（把发声的音叉抵在头骨上）', false, (v) => { st.bone = v; restart(); });
    el.append(PS.ui.row(PS.ui.button('▶ 播放', restart, 'btn btn-primary'), faultSeg.el, boneT.el), h('div', { class: 'ear-bottom' }, steps, msg));

    // 各环节开始的时刻；stopAt 为损坏而中断的环节
    function chain() {
      // 返回 [到达时刻...]：0 声波进入, 1 鼓膜, 2 听小骨→耳蜗, 3 神经, 4 大脑
      if (st.bone) return { start: [0, null, 1.4, 2.4, 3.4], stopAt: st.fault === 'nerve' ? 3 : 9 };
      const stopAt = st.fault === 'drum' ? 1 : st.fault === 'bone' ? 2 : st.fault === 'nerve' ? 3 : 9;
      return { start: [0, 1.2, 2.0, 2.9, 3.9], stopAt };
    }
    function restart() {
      st.t = 0; st.playing = true;
      loop.start();
      const c = chain();
      if (c.stopAt === 9) {
        // 能听到：播放一段声音（骨传导时声音发闷）
        setTimeout(() => {
          if (!st.playing) return;
          if (st.bone) PS.audio.strike(330, [[1, 1, 0.9], [2, 0.2, 0.4]], { gain: 0.25 });
          else PS.audio.note(523, { timbre: 'piano', dur: 1.2, gain: 0.22 });
        }, (st.bone ? 3.4 : 3.9) * 1000);
      }
    }
    const loop = PS.loop((dt) => {
      if (st.playing) st.t += dt;
      if (st.t > 7) { st.playing = false; loop.stop(); }
      update();
      S.render();
    }, S.stage);

    function stageReached(i) {
      const c = chain();
      if (i >= c.stopAt) return false;
      const s = c.start[i];
      return s != null && st.t >= s;
    }
    function update() {
      const c = chain();
      steps.querySelectorAll('li').forEach((li, i) => {
        let on = stageReached(i);
        if (st.bone && i === 1) { li.className = 'skip'; li.textContent = '（骨传导：不经过鼓膜和外耳道）'; return; }
        li.textContent = st.bone && i === 0 ? '发声的音叉抵在头骨上，振动经头骨、颌骨传播' : st.bone && i === 2 ? '振动直接传到耳蜗' : EAR_STEPS[i];
        li.className = on ? 'on' : (c.stopAt === i && st.t > (c.start[i - 1] || 0) + 0.6 ? 'broken' : '');
      });
      if (st.t < 0) return;
      const done = st.t > 4.6;
      if (!done) { msg.className = 'feedback info show'; msg.innerHTML = '声音传递中……'; return; }
      if (c.stopAt === 9) {
        msg.className = 'feedback ok show';
        msg.innerHTML = st.bone
          ? (st.fault === 'none' ? '通过<b>骨传导</b>，声音经头骨、颌骨也能传到听觉神经，引起听觉。' : '虽然' + (st.fault === 'drum' ? '鼓膜' : '听小骨') + '损坏了，但声音通过<b>骨传导</b>仍能传给听觉神经——这类听力障碍可以用骨传导助听器改善。贝多芬耳聋后，就是用牙咬住木棒的一端、另一端顶在钢琴上来“听”琴声的。')
          : '声音 → 鼓膜振动 → 听小骨等组织 → 听觉神经 → 大脑，我们就听到了声音。';
      } else if (c.stopAt === 3) {
        msg.className = 'feedback bad show';
        msg.innerHTML = '<b>听觉神经损坏</b>，信号无法传到大脑，即使用骨传导也听不到声音（神经性耳聋）。';
      } else {
        msg.className = 'feedback bad show';
        msg.innerHTML = '<b>' + (c.stopAt === 1 ? '鼓膜' : '听小骨') + '损坏</b>，振动传不到耳蜗，听不到声音。但听觉神经是好的——打开“骨传导”试试！';
      }
    }

    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fbfcfe'; ctx.fillRect(0, 0, VW, VH);
      const c = chain();
      const T = st.t;
      // 头部轮廓与颅骨
      ctx.fillStyle = '#fff4e6';
      ctx.beginPath(); ctx.moveTo(200, 540); ctx.bezierCurveTo(180, 300, 280, 40, 620, 30); ctx.bezierCurveTo(900, 25, 990, 220, 990, 540); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#f0c8a0'; ctx.lineWidth = 3; ctx.stroke();
      // 颅骨（骨传导路径）
      const boneOn = st.bone && st.t >= 0;
      ctx.strokeStyle = boneOn ? '#ffd43b' : '#e9ecef'; ctx.lineWidth = 22; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(330, 470); ctx.bezierCurveTo(330, 360, 420, 330, 520, 330); ctx.bezierCurveTo(560, 330, 590, 320, 610, 300); ctx.stroke();
      if (boneOn) {
        ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 6; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -T * 60;
        ctx.beginPath(); ctx.moveTo(330, 470); ctx.bezierCurveTo(330, 360, 420, 330, 520, 330); ctx.bezierCurveTo(560, 330, 590, 320, 610, 300); ctx.stroke(); ctx.setLineDash([]);
        PS.drawFork(ctx, 330, 540, 70, Math.sin(T * 90) * 2.5, {});
      }
      // 耳廓
      ctx.fillStyle = '#ffd8b5'; ctx.strokeStyle = '#d9a37a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(212, 196); ctx.bezierCurveTo(150, 110, 60, 150, 78, 250); ctx.bezierCurveTo(90, 320, 140, 330, 150, 380); ctx.bezierCurveTo(158, 420, 205, 420, 212, 330); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#d9a37a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(196, 205); ctx.bezierCurveTo(150, 150, 100, 185, 108, 250); ctx.bezierCurveTo(114, 300, 160, 300, 170, 340); ctx.stroke();
      // 外耳道
      ctx.fillStyle = '#f4b183';
      ctx.beginPath(); ctx.moveTo(200, 228); ctx.bezierCurveTo(300, 222, 360, 232, 430, 226); ctx.lineTo(430, 282); ctx.bezierCurveTo(360, 276, 300, 286, 200, 278); ctx.closePath(); ctx.fill();
      // 声波
      if (!st.bone && T >= 0) {
        ctx.strokeStyle = '#7048e8'; ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          const x = 40 + ((T * 260 + i * 70) % 390);
          if (T > 1.4 && x < 200) continue;
          ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.arc(x - 40, 254, 40, -0.6, 0.6); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 鼓膜
      const drumV = !st.bone && stageReached(1);
      const bulge = drumV ? Math.sin(T * 40) * 6 : 0;
      ctx.strokeStyle = st.fault === 'drum' ? '#e03131' : '#e64980'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(432, 222); ctx.quadraticCurveTo(432 + bulge * 2, 254, 432, 286); ctx.stroke();
      if (st.fault === 'drum') { ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(420, 240); ctx.lineTo(444, 268); ctx.moveTo(444, 240); ctx.lineTo(420, 268); ctx.stroke(); }
      // 中耳腔
      ctx.fillStyle = 'rgba(255,236,210,.9)'; ctx.beginPath(); ctx.ellipse(495, 254, 62, 48, 0, 0, TAU); ctx.fill();
      // 听小骨
      const ossV = !st.bone && stageReached(2) ? Math.sin(T * 40) * 3 : 0;
      ctx.strokeStyle = st.fault === 'bone' ? '#e03131' : '#c9a227'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(440 + ossV, 250); ctx.lineTo(470 + ossV, 222); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(472 + ossV, 222); ctx.lineTo(505 + ossV, 246); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(506 + ossV, 246); ctx.lineTo(540 + ossV, 254); ctx.moveTo(522 + ossV, 238); ctx.lineTo(540 + ossV, 262); ctx.stroke();
      if (st.fault === 'bone') { ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(480, 205); ctx.lineTo(500, 228); ctx.moveTo(500, 205); ctx.lineTo(480, 228); ctx.stroke(); }
      // 耳蜗（螺旋）
      const coOn = stageReached(2) && (st.bone ? T >= 1.4 : T >= 2.4);
      ctx.strokeStyle = coOn ? '#f08c00' : '#c2255c'; ctx.lineWidth = coOn ? 9 : 7;
      ctx.beginPath();
      for (let a = 0; a < 5.2 * Math.PI; a += 0.1) { const r = 46 - a * 2.6; const x = 610 + r * Math.cos(a), y = 262 + r * Math.sin(a) * 0.9; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // 半规管
      ctx.strokeStyle = '#e599b5'; ctx.lineWidth = 6;
      [[575, 190, 22], [606, 180, 20], [636, 196, 18]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.9, Math.PI * 2.4); ctx.stroke(); });
      // 听觉神经
      const nerveOn = stageReached(3);
      ctx.strokeStyle = st.fault === 'nerve' ? '#e03131' : '#fab005'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(650, 245); ctx.bezierCurveTo(720, 230, 760, 200, 800, 150); ctx.stroke();
      if (st.fault === 'nerve') { ctx.strokeStyle = '#e03131'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(712, 205); ctx.lineTo(738, 235); ctx.moveTo(738, 205); ctx.lineTo(712, 235); ctx.stroke(); }
      if (nerveOn) {
        const s0 = c.start[3];
        for (let i = 0; i < 3; i++) {
          const k = ((T - s0) * 1.2 + i / 3) % 1;
          const x = PS.lerp(650, 800, k), y = PS.lerp(245, 150, k * k);
          ctx.fillStyle = '#ffe066'; ctx.shadowColor = '#fab005'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
        }
      }
      // 大脑
      const brainOn = stageReached(4);
      ctx.fillStyle = brainOn ? '#ffc9c9' : '#fcc2d7';
      ctx.beginPath(); ctx.ellipse(860, 120, 100, 68, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d6336c'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(800 + i * 25, 105 + (i % 2) * 22, 18, 0.2, Math.PI - 0.2); ctx.stroke(); }
      if (brainOn) {
        ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(T * 8); ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(860, 120, 112, 80, 0, 0, TAU); ctx.stroke(); ctx.restore();
        D.text(ctx, '听到了！', 860, 214, { size: F(18), weight: 800, color: '#e8590c', align: 'center', bg: 'rgba(255,255,255,.9)' });
      }
      // 标注
      const lab = (t, x, y, lx, ly) => {
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly); ctx.stroke();
        D.text(ctx, t, lx, ly + (ly > y ? 16 : -6), { size: F(14), weight: 700, color: '#1b2333', align: 'center' });
      };
      lab('耳廓', 100, 280, 70, 440);
      lab('外耳道', 300, 280, 290, 400);
      lab('鼓膜', 432, 285, 420, 420);
      lab('听小骨', 490, 222, 470, 130);
      lab('耳蜗', 610, 300, 610, 420);
      lab('听觉神经', 760, 190, 730, 300);
      lab('大脑', 900, 70, 940, 30);
      if (st.bone) lab('头骨、颌骨', 420, 335, 520, 470);
      ctx.restore();
    }
    st.t = -1;
    update();
    document.head.append(h('style', null, `
      .ear-bottom{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;margin-top:12px;align-items:start}
      .ear-steps{margin:0;padding-left:1.4em;font-size:.93rem}
      .ear-steps li{color:var(--muted);margin:3px 0;transition:color .3s}
      .ear-steps li.on{color:var(--ink);font-weight:700}
      .ear-steps li.on::marker{color:var(--accent)}
      .ear-steps li.broken{color:var(--red);font-weight:700;text-decoration:line-through}
      .ear-steps li.skip{color:var(--muted);font-style:italic}
      .ear-bottom .feedback{margin:0}
      @media (max-width:720px){.ear-bottom{grid-template-columns:1fr}}
    `));
  });
})();
