/* 第14章第3节：能量的转化和守恒——四个小实验（搓手、晒黑塑料袋里的水、太阳能电池带动小电扇、摩擦过的笔杆吸纸屑）、能量转化的网络（看一看 / 考考你）、
 * 能量的总量保持不变（弹跳的小球、滑梯、荡秋千的堆叠图像）、能量的转化还是转移。依赖 heat.js、energy.js、thermal.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw, TH = PS.th, EN = PS.en;
  const TAU = Math.PI * 2;
  const FORMS = { mech: { n: '机械能', c: '#3b5bdb' }, elec: { n: '电能', c: '#f08c00' }, light: { n: '光能', c: '#e6a700' }, chem: { n: '化学能', c: '#2b8a3e' }, nuc: { n: '核能', c: '#7048e8' }, heat: { n: '内能', c: '#e03131' } };
  const chainHTML = (nodes, arrows) => '<div class="cv-chain">' + nodes.map((k, i) => (i ? '<span class="cv-arr">' + (arrows[i - 1] || '') + ' →</span>' : '') + '<span class="cv-box" style="--c:' + FORMS[k].c + '">' + FORMS[k].n + '</span>').join('') + '</div>';

  /* ================= 四个小实验 ================= */
  PS.register('energy-demos', function (el) {
    const VW = 1000;
    const SC = {
      rub: { n: '来回迅速摩擦双手', chain: [['mech', 'heat'], ['摩擦做功']], btn: '🙌 按住搓手', ask: '手掌变热了。克服摩擦<b>做功</b>，<b>机械能转化为内能</b>。' },
      bag: { n: '黑塑料袋里的水放在阳光下', chain: [['light', 'heat'], ['']], btn: '☀️ 放到阳光下 / 移到阴凉处', ask: '温度计的示数升高了。黑塑料袋吸收太阳光，<b>光能转化为内能</b>。' },
      solar: { n: '太阳能电池带动小电扇', chain: [['light', 'elec', 'mech'], ['太阳能电池', '电动机']], btn: '✋ 用手遮住电池 / 拿开手', ask: '小电扇转起来了。太阳能电池把<b>光能转化为电能</b>，小电扇的电动机再把<b>电能转化为机械能</b>。' },
      pen: { n: '摩擦过的笔杆吸引纸屑', chain: [['mech', 'elec'], ['摩擦起电']], btn: '✏️ 按住在头发上摩擦', ask: '纸屑被吸到笔杆上。摩擦使笔杆带了电，<b>机械能转化为电能</b>（同时也有一部分转化为内能）。' },
    };
    const st = { k: 'rub', hold: false, holdT: 0, T: 33, Tb: 20, sun: true, cover: false, fan: 0, fanA: 0, q: 0, near: false, bits: [], t: 0, rubX: 0 };
    const seg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k].n })), st.k, (v) => { st.k = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 640 : 400), draw });
    const act = h('button', { type: 'button', class: 'btn btn-primary btn-sm' });
    const act2 = PS.ui.button('🧻 把笔杆靠近纸屑', () => { st.near = !st.near; act2.innerHTML = st.near ? '把笔杆拿开' : '🧻 把笔杆靠近纸屑'; }, 'btn btn-sm');
    const chainBox = h('div'), msg = h('div', { class: 'th-msg info' });
    el.append(PS.ui.row(act, act2, PS.ui.button('重来', reset, 'btn btn-ghost btn-sm')), chainBox, msg);
    const press = (on) => { st.hold = on; };
    act.addEventListener('pointerdown', (e) => { if (st.k === 'rub' || st.k === 'pen') { press(true); e.preventDefault(); } });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => act.addEventListener(ev, () => press(false)));
    act.addEventListener('click', () => {
      if (st.k === 'rub' || st.k === 'pen') st.holdT = 0.9;
      else if (st.k === 'bag') st.sun = !st.sun;
      else st.cover = !st.cover;
      PS.sound.tick();
    });
    function reset() {
      Object.assign(st, { hold: false, holdT: 0, T: 33, Tb: 20, sun: false, cover: false, fan: 0, q: 0, near: false, t: 0 });
      st.bits = Array.from({ length: 14 }, (_, i) => ({ x: 600 + (i % 7) * 34 + PS.rand(-8, 8), y: 0, vy: 0, stuck: false, a: PS.rand(0, 3) }));
      const c = SC[st.k];
      act.innerHTML = c.btn; act2.style.display = st.k === 'pen' ? '' : 'none'; act2.innerHTML = '🧻 把笔杆靠近纸屑';
      chainBox.innerHTML = chainHTML(c.chain[0], c.chain[1]);
      msg.className = 'th-msg info'; msg.innerHTML = { rub: '按住按钮来回搓手（也可以连续点击），看手掌的温度。', bag: '点按钮把装水的黑塑料袋放到阳光下，看温度计的示数。', solar: '太阳光照在太阳能电池上。用手遮住电池，看小电扇会怎样。', pen: '先按住按钮让笔杆在头发上摩擦，再把笔杆靠近桌上的纸屑。' }[st.k];
    }
    let said = '';
    PS.loop((dt, time) => {
      st.t += dt;
      const rubbing = st.hold || st.holdT > 0;
      st.holdT = Math.max(0, st.holdT - dt);
      if (st.k === 'rub') { if (rubbing) { st.T = Math.min(41, st.T + dt * 1.6); st.rubX += dt * 14; } else st.T += (33 - st.T) * dt * 0.08; }
      if (st.k === 'bag') st.Tb += st.sun ? Math.max(0, 46 - st.Tb) * dt * 0.08 : (20 - st.Tb) * dt * 0.05;
      if (st.k === 'solar') { st.fan += ((st.cover ? 0 : 1) - st.fan) * dt * 1.5; st.fanA += st.fan * dt * 25; }
      if (st.k === 'pen') {
        if (rubbing && !st.near) { st.q = Math.min(1, st.q + dt * 0.5); st.rubX += dt * 14; }
        st.q = Math.max(0, st.q - dt * 0.01);
        st.bits.forEach((b) => {
          if (st.near && st.q > 0.25 && !b.stuck) { const pull = st.q * 2600 * (1 - b.y / 140); b.vy += (pull - 900) * dt; b.y = Math.max(0, b.y + b.vy * dt); if (b.y >= 120) { b.y = 120; b.stuck = true; PS.sound.tick(); } if (b.y <= 0) { b.y = 0; b.vy = 0; } }
          if (!st.near && b.stuck) { b.stuck = false; b.vy = 0; }
          if (!st.near && !b.stuck && b.y > 0) { b.vy -= 900 * dt; b.y = Math.max(0, b.y + b.vy * dt); if (b.y === 0) b.vy = 0; }
        });
      }
      const done = st.k === 'rub' ? st.T > 36 : st.k === 'bag' ? st.Tb > 28 : st.k === 'solar' ? st.fan > 0.6 && !st.cover : st.bits.some((b) => b.stuck);
      const key = st.k + done;
      if (key !== said) { said = key; if (done) { msg.className = 'th-msg ok'; msg.innerHTML = SC[st.k].ask; } }
      S.render();
    }, el).start();
    function sun(ctx, x, y, r, t) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.2);
      ctx.strokeStyle = '#fab005'; ctx.lineWidth = 6;
      for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25); ctx.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); ctx.stroke(); }
      ctx.restore();
      const g = ctx.createRadialGradient(x, y, 4, x, y, r); g.addColorStop(0, '#fff3bf'); g.addColorStop(1, '#fcc419');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    function rays(ctx, x0, y0, x1, y1, n, t, on) {
      if (!on) return;
      ctx.save(); ctx.strokeStyle = 'rgba(250,176,5,.55)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 40;
      for (let i = 0; i < n; i++) { const f = (i - (n - 1) / 2) * 26; ctx.beginPath(); ctx.moveTo(x0 + f * 0.3, y0 + f * 0.3); ctx.lineTo(x1 + f, y1); ctx.stroke(); }
      ctx.restore();
    }
    /** 侧面看的手（手掌朝向另一只手）：手指并拢的“手套”形状 + 拇指 + 袖口 */
    function hand(ctx, x, y, sd, col) {
      ctx.save(); ctx.translate(x, y); ctx.scale(sd, 1);
      ctx.fillStyle = col; ctx.strokeStyle = '#c47a52'; ctx.lineWidth = 3;
      D.roundRect(ctx, 0, -130, 40, 210, 20); ctx.fill(); ctx.stroke();
      D.roundRect(ctx, 30, -20, 26, 64, 13); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(196,122,82,.6)'; ctx.lineWidth = 2;
      [-95, -70].forEach((yy) => { ctx.beginPath(); ctx.moveTo(6, yy); ctx.lineTo(34, yy); ctx.stroke(); });
      ctx.fillStyle = '#4dabf7'; ctx.fillRect(-4, 80, 48, 60);
      ctx.restore();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), n = EN.narrow(w), t = performance.now() / 1000;
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const oy = n ? 110 : 0;
      ctx.save(); ctx.translate(0, oy);
      if (st.k === 'rub') {
        const off = (st.hold || st.holdT > 0) ? Math.sin(st.rubX) * 40 : 0, col = PS.mixColor('#ffd8a8', '#ff8787', (st.T - 33) / 8);
        hand(ctx, 420, 170 + off, -1, col); hand(ctx, 440, 170 - off, 1, col);
        if (st.T > 35) TH.wave(ctx, 430, 60, 60, t, { n: 3, gap: 30, color: 'rgba(240,62,62,' + PS.clamp((st.T - 35) / 5, 0, 0.7) + ')' });
        if (st.hold || st.holdT > 0) { D.arrow(ctx, 300, 120, 300, 230, { color: '#3b5bdb', width: 4 }); D.arrow(ctx, 560, 230, 560, 120, { color: '#3b5bdb', width: 4 }); }
        TH.dthermo(ctx, n ? 820 : 760, 150, st.T, { F, fs: 20, d: 1, label: '手掌的温度' });
      } else if (st.k === 'bag') {
        sun(ctx, 120, 80, 46, t);
        rays(ctx, 150, 110, 430, 260, 4, t, st.sun);
        if (!st.sun) { ctx.fillStyle = 'rgba(73,80,87,.18)'; ctx.fillRect(300, 120, 300, 230); D.text(ctx, '阴凉处', 450, 140, { size: F(13), weight: 700, align: 'center', color: '#495057' }); }
        ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.moveTo(380, 210); ctx.quadraticCurveTo(360, 330, 450, 336); ctx.quadraticCurveTo(540, 330, 520, 210); ctx.quadraticCurveTo(450, 190, 380, 210); ctx.fill();
        ctx.fillStyle = '#495057'; ctx.fillRect(440, 186, 22, 26);
        ctx.fillStyle = '#e9ecef'; ctx.fillRect(446, 90, 10, 200); ctx.fillStyle = '#e03131'; const ch = 30 + (st.Tb - 10) * 3; ctx.fillRect(448, 290 - ch, 6, ch);
        ctx.fillStyle = '#e9dcc6'; ctx.fillRect(300, 336, 340, 16);
        TH.dthermo(ctx, n ? 820 : 760, 150, st.Tb, { F, fs: 20, d: 1, label: '水的温度' });
      } else if (st.k === 'solar') {
        sun(ctx, 120, 80, 46, t);
        rays(ctx, 150, 110, 360, 230, 4, t, !st.cover);
        ctx.save(); ctx.translate(380, 270); ctx.transform(1, 0, -0.5, 0.5, 0, 0);
        ctx.fillStyle = '#1c3d7a'; ctx.fillRect(-90, -60, 180, 120); ctx.strokeStyle = '#a5d8ff'; ctx.lineWidth = 2;
        for (let i = -60; i <= 60; i += 30) { ctx.beginPath(); ctx.moveTo(-90, i); ctx.lineTo(90, i); ctx.stroke(); } for (let i = -90; i <= 90; i += 36) { ctx.beginPath(); ctx.moveTo(i, -60); ctx.lineTo(i, 60); ctx.stroke(); }
        ctx.restore();
        if (st.cover) { ctx.fillStyle = '#ffc9a8'; D.roundRect(ctx, 300, 180, 150, 70, 30); ctx.fill(); D.text(ctx, '✋', 375, 230, { size: 44, align: 'center' }); }
        ctx.strokeStyle = '#e03131'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(460, 280); ctx.quadraticCurveTo(560, 330, 640, 290); ctx.stroke();
        ctx.strokeStyle = '#212529'; ctx.beginPath(); ctx.moveTo(455, 292); ctx.quadraticCurveTo(560, 350, 640, 300); ctx.stroke();
        ctx.fillStyle = '#868e96'; D.roundRect(ctx, 630, 260, 70, 50, 10); ctx.fill();
        ctx.fillStyle = '#495057'; ctx.fillRect(660, 300, 10, 50); ctx.fillRect(630, 345, 70, 10);
        ctx.save(); ctx.translate(712, 285); ctx.rotate(st.fanA);
        ctx.fillStyle = 'rgba(77,171,247,.85)'; for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 3); ctx.beginPath(); ctx.ellipse(0, -36, 14, 34, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); ctx.restore();
        D.text(ctx, '太阳能电池', 380, 360, { size: F(13), weight: 700, align: 'center', color: '#495057' });
        D.text(ctx, '小电扇', 690, 380, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      } else {
        // 头发、笔杆、纸屑
        ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.ellipse(200, 150, 120, 80, 0, Math.PI, TAU); ctx.fill();
        for (let i = 0; i < 18; i++) { ctx.strokeStyle = '#212529'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(90 + i * 13, 150); ctx.quadraticCurveTo(96 + i * 13, 180, 88 + i * 13, 200); ctx.stroke(); }
        const rubbing = (st.hold || st.holdT > 0) && !st.near;
        const px = st.near ? 700 : 200 + (rubbing ? Math.sin(st.rubX) * 70 : 0), py = st.near ? 170 : 92;
        ctx.save(); ctx.translate(px, py); ctx.rotate(st.near ? 0 : -0.1);
        ctx.fillStyle = '#4263eb'; D.roundRect(ctx, -110, -12, 220, 24, 12); ctx.fill();
        ctx.fillStyle = '#dee2e6'; ctx.beginPath(); ctx.moveTo(110, -10); ctx.lineTo(140, 0); ctx.lineTo(110, 10); ctx.fill();
        const nq = Math.round(st.q * 8);
        for (let i = 0; i < nq; i++) D.text(ctx, '−', -90 + i * 24, 2, { size: 22, weight: 800, align: 'center', baseline: 'middle', color: '#fff' });
        ctx.restore();
        ctx.fillStyle = '#e9dcc6'; ctx.fillRect(540, 320, 360, 16);
        st.bits.forEach((b) => { ctx.save(); ctx.translate(b.x, 318 - b.y); ctx.rotate(b.a); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1.5; ctx.fillRect(-9, -5, 18, 10); ctx.strokeRect(-9, -5, 18, 10); ctx.restore(); });
        D.text(ctx, '笔杆带电：' + (st.q > 0.05 ? '有（−）' : '没有'), n ? 760 : 820, 60, { size: F(14), weight: 800, align: 'center', color: st.q > 0.05 ? '#3b5bdb' : '#868e96' });
        D.text(ctx, '纸屑', 720, 368, { size: F(13), weight: 700, align: 'center', color: '#495057' });
      }
      ctx.restore();
    }
    reset();
  });

  /* ================= 能量转化的网络 ================= */
  const EX = [
    ['摩擦生热（搓手）', 'mech', ['heat']], ['水电站、风力发电', 'mech', ['elec']], ['燃料燃烧', 'chem', ['heat']], ['电动机带动水泵', 'elec', ['mech']],
    ['电灯发光', 'elec', ['light', 'heat']], ['电热水壶烧水', 'elec', ['heat']], ['太阳能电池', 'light', ['elec']], ['太阳能热水器', 'light', ['heat']],
    ['植物的光合作用', 'light', ['chem']], ['给手机电池充电', 'elec', ['chem']], ['干电池供电', 'chem', ['elec']], ['汽油机的做功冲程', 'heat', ['mech']],
    ['汽油机的压缩冲程', 'mech', ['heat']], ['人跑步（消耗食物）', 'chem', ['mech', 'heat']], ['核电站的反应堆', 'nuc', ['heat']], ['萤火虫发光', 'chem', ['light']],
    ['摩擦起电', 'mech', ['elec']], ['流星划过大气层', 'mech', ['heat', 'light']],
  ];
  PS.register('energy-web', function (el) {
    const VW = 1000, K = ['mech', 'elec', 'light', 'chem', 'nuc', 'heat'];
    const st = { mode: 'see', ex: 0, from: null, to: null, q: null, done: false, n: 0, ok: 0 };
    const seg = PS.ui.seg([{ value: 'see', label: '看一看：点一个实例' }, { value: 'quiz', label: '考考你：依次点两种能量' }], st.mode, (v) => { st.mode = v; v === 'quiz' ? ask() : see(st.ex); });
    seg.el.style.flexWrap = 'wrap';
    el.append(PS.ui.row(seg.el));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 900 : 500), draw });
    const chips = h('div', { class: 'th-chips' }), msg = h('div', { class: 'th-msg info' }), score = h('div', { class: 'small muted' });
    const nextB = PS.ui.button('下一题', ask, 'btn btn-ghost btn-sm');
    el.append(msg, chips, h('div', { class: 'row' }, nextB, score));
    EX.forEach((e, i) => chips.append(PS.ui.button(e[0], () => { if (st.mode !== 'see') { seg.set('see'); st.mode = 'see'; } see(i); }, 'btn btn-sm')));
    const pos = (k, w) => { const n = EN.narrow(w), i = K.indexOf(k), a = -Math.PI / 2 + (i * TAU) / 6, R = n ? 330 : 190, cy = n ? 450 : 250; return [500 + Math.cos(a) * R * (n ? 1.1 : 1.6), cy + Math.sin(a) * R]; };
    const nodeR = (w) => (EN.narrow(w) ? 92 : 52);
    PS.drag(S, { VW, get VH() { return S.VH; }, hit: (p) => { if (st.mode !== 'quiz' || st.done) return null; const w = S.w || 1000; return K.find((k) => { const [x, y] = pos(k, w); return Math.hypot(p.x - x, p.y - y) < nodeR(w) + 6; }) || null; }, start: (k) => pick(k), move() {} });
    function see(i) {
      st.ex = i; const e = EX[i];
      chips.querySelectorAll('.btn').forEach((b, j) => b.classList.toggle('on', j === i));
      msg.className = 'th-msg info'; msg.innerHTML = '<b>' + e[0] + '</b>：' + FORMS[e[1]].n + '转化为' + e[2].map((k) => FORMS[k].n).join('和') + '。';
      nextB.style.display = 'none'; score.style.display = 'none'; S.render();
    }
    function ask() {
      const pool = EX.map((e, i) => i).filter((i) => EX[i][2].length === 1 || EX[i][0] === '电灯发光');
      st.q = PS.pick(pool); st.from = null; st.to = null; st.done = false;
      chips.querySelectorAll('.btn').forEach((b) => b.classList.remove('on'));
      msg.className = 'th-msg info'; msg.innerHTML = '<b>' + EX[st.q][0] + '</b>：主要是什么能转化为什么能？先点<b>转化前</b>的能量，再点<b>转化后</b>的能量。';
      nextB.style.display = ''; score.style.display = ''; S.render();
    }
    function pick(k) {
      PS.sound.tick();
      if (!st.from) { st.from = k; S.render(); return; }
      st.to = k; st.done = true;
      const e = EX[st.q], good = st.from === e[1] && st.to === e[2][0];
      st.n++; if (good) st.ok++;
      msg.className = 'th-msg ' + (good ? 'ok' : 'bad');
      msg.innerHTML = (good ? '✔ 正确！' : '✘ 不对。') + '<b>' + e[0] + '</b>：' + FORMS[e[1]].n + '转化为' + e[2].map((x) => FORMS[x].n).join('和') + '。';
      score.innerHTML = '已做 ' + st.n + ' 题，答对 ' + st.ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
      S.render();
    }
    PS.loop(() => S.render(), el).start();
    function arrowPath(ctx, a, b, w, on, col, t, F) {
      const [x1, y1] = pos(a, w), [x2, y2] = pos(b, w), r = nodeR(w);
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux, bend = 0.12 * L;
      const sx = x1 + ux * r + nx * 10, sy = y1 + uy * r + ny * 10, ex = x2 - ux * (r + 6) + nx * 10, ey = y2 - uy * (r + 6) + ny * 10;
      const cx = (sx + ex) / 2 + nx * bend, cy = (sy + ey) / 2 + ny * bend;
      ctx.save();
      ctx.strokeStyle = on ? col : 'rgba(173,181,189,.45)'; ctx.lineWidth = on ? 7 : 2.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      const ang = Math.atan2(ey - cy, ex - cx), hd = on ? 22 : 12;
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * 4, ey + Math.sin(ang) * 4); ctx.lineTo(ex - hd * Math.cos(ang - 0.45), ey - hd * Math.sin(ang - 0.45)); ctx.lineTo(ex - hd * Math.cos(ang + 0.45), ey - hd * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill();
      if (on) for (let i = 0; i < 3; i++) { const u = (t * 0.6 + i / 3) % 1, qx = (1 - u) * (1 - u) * sx + 2 * u * (1 - u) * cx + u * u * ex, qy = (1 - u) * (1 - u) * sy + 2 * u * (1 - u) * cy + u * u * ey; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(qx, qy, 6, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), t = performance.now() / 1000, r = nodeR(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const pairs = new Set(); EX.forEach((e) => e[2].forEach((b) => pairs.add(e[1] + '>' + b)));
      let hl = [];
      if (st.mode === 'see') { const e = EX[st.ex]; hl = e[2].map((b) => e[1] + '>' + b); }
      else if (st.done) { const e = EX[st.q]; hl = [e[1] + '>' + e[2][0]]; }
      pairs.forEach((p) => { if (!hl.includes(p)) { const [a, b] = p.split('>'); arrowPath(ctx, a, b, w, false, '', t, F); } });
      if (st.mode === 'quiz' && st.done && st.from && st.to && st.from !== st.to && !hl.includes(st.from + '>' + st.to)) arrowPath(ctx, st.from, st.to, w, true, 'rgba(224,49,49,.55)', t, F);
      hl.forEach((p) => { const [a, b] = p.split('>'); arrowPath(ctx, a, b, w, true, FORMS[a].c, t, F); });
      K.forEach((k) => {
        const [x, y] = pos(k, w), f = FORMS[k], sel = st.mode === 'quiz' && (st.from === k || st.to === k);
        ctx.fillStyle = '#fff'; ctx.strokeStyle = f.c; ctx.lineWidth = sel ? 8 : 4;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = f.c; ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.arc(x, y, r - 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        D.text(ctx, f.n, x, y + 1, { size: F(15), weight: 800, align: 'center', baseline: 'middle', color: f.c });
        if (sel) D.text(ctx, st.from === k ? '转化前' : '转化后', x, y + r + F(13) * 1.2, { size: F(12), weight: 700, align: 'center', color: '#e8590c' });
      });
    }
    see(0);
  });

  /* ================= 能量的总量保持不变 ================= */
  PS.register('energy-stack', function (el) {
    const VW = 1000, g = 10;
    const SC = {
      ball: { n: '弹跳的小球', T: 7, note: '小球每次撞击地面，都有一部分机械能转化为内能，所以越跳越低；减少的机械能并没有消失。' },
      slide: { n: '小孩滑滑梯', T: 3.4, note: '滑梯和地面的摩擦使机械能不断转化为内能（裤子和滑梯都会变热），最后小孩停下来。' },
      swing: { n: '荡秋千（不推）', T: 18, note: '空气阻力和绳与横杆间的摩擦使秋千的机械能逐渐转化为内能，摆动幅度越来越小。' },
    };
    const st = { k: 'ball', run: false, t: 0, data: [] };
    const seg = PS.ui.seg(Object.keys(SC).map((k) => ({ value: k, label: SC[k].n })), st.k, (v) => { st.k = v; reset(); });
    seg.el.style.flexWrap = 'wrap';
    const goB = PS.ui.button('▶ 开始', () => { if (st.t >= SC[st.k].T - 1e-6) reset(); st.run = true; }, 'btn btn-primary btn-sm');
    el.append(PS.ui.row(seg.el, goB));
    const S = EN.stage(el, { VW, vh: (w) => (EN.narrow(w) ? 960 : 430), draw });
    const msg = h('div', { class: 'th-msg info' });
    el.append(msg);
    let M = {};
    function reset() {
      st.run = false; st.t = 0; st.data = [];
      if (st.k === 'ball') M = { m: 0.5, y: 2, v: 0, E0: 0.5 * g * 2 };
      else if (st.k === 'slide') M = { m: 30, s: 0, v: 0, L: 3.5, ang: 0.6, mu1: 0.3, mu2: 0.6, x2: 0, E0: 30 * g * 3.5 * Math.sin(0.6) };
      else M = { m: 25, L: 2.5, th: 0.7, w: 0, k: 0.12, E0: 25 * g * 2.5 * (1 - Math.cos(0.7)) };
      M.Q = 0; sample(); tell();
    }
    function parts() {
      if (st.k === 'ball') return { pe: M.m * g * M.y, ke: 0.5 * M.m * M.v * M.v };
      if (st.k === 'slide') { const hgt = Math.max(0, (M.L - M.s) * Math.sin(M.ang)); return { pe: M.m * g * hgt, ke: 0.5 * M.m * M.v * M.v }; }
      return { pe: M.m * g * M.L * (1 - Math.cos(M.th)), ke: 0.5 * M.m * (M.L * M.w) ** 2 };
    }
    function sample() { const p = parts(); st.data.push([st.t, p.pe, p.ke, Math.max(0, M.E0 - p.pe - p.ke)]); }
    function step(dt) {
      if (st.k === 'ball') {
        if (M.rest) return;
        M.v -= g * dt; M.y += M.v * dt;
        if (M.y <= 0) { M.y = 0; if (Math.abs(M.v) < 0.6) { M.v = 0; M.rest = true; } else { M.v = -M.v * 0.8; PS.sound.clack(); } }
      } else if (st.k === 'slide') {
        if (M.s < M.L) { const a = g * (Math.sin(M.ang) - M.mu1 * Math.cos(M.ang)); M.v += a * dt; M.s += M.v * dt; if (M.s >= M.L) { M.x2 = M.s - M.L; M.s = M.L; } }
        else if (M.v > 0) { M.v = Math.max(0, M.v - M.mu2 * g * dt); M.x2 += M.v * dt; }
      } else { const a = -(g / M.L) * Math.sin(M.th) - M.k * M.w; M.w += a * dt; M.th += M.w * dt; }
    }
    function tell() {
      const p = parts(), Q = Math.max(0, M.E0 - p.pe - p.ke), U = st.k === 'ball' ? 'J' : 'J';
      const done = st.t >= SC[st.k].T - 1e-6;
      msg.className = 'th-msg ' + (done ? 'ok' : 'info');
      msg.innerHTML = '势能 ' + PS.fmt(p.pe, 0) + ' ' + U + ' + 动能 ' + PS.fmt(p.ke, 0) + ' ' + U + ' + 增加的内能 ' + PS.fmt(Q, 0) + ' ' + U + ' = <b>' + PS.fmt(M.E0, 0) + ' ' + U + '</b>（总量不变）<br>' + (done ? SC[st.k].note + '<b>机械能减少多少，内能就增加多少，能量的总量保持不变。</b>' : SC[st.k].note);
    }
    let acc = 0, tt = 0;
    PS.loop((dt) => {
      if (st.run) {
        const T = SC[st.k].T, sp = st.k === 'swing' ? 2 : 1;
        for (let i = 0; i < 8; i++) { if (st.t >= T) break; step((dt * sp) / 8); st.t = Math.min(T, st.t + (dt * sp) / 8); }
        acc += dt; if (acc > 0.04) { acc = 0; sample(); }
        tt += dt; if (tt > 0.2) { tt = 0; tell(); }
        if (st.t >= T - 1e-6) { st.run = false; sample(); tell(); }
      }
      S.render();
    }, el).start();
    function scene(ctx, F, x0, y0, w0, h0) {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w0, h0); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(x0, y0, w0, h0);
      if (st.k === 'ball') {
        const gy = y0 + h0 - 30, k = (h0 - 70) / 2.1;
        ctx.fillStyle = '#e9dcc6'; ctx.fillRect(x0, gy, w0, 30);
        ctx.strokeStyle = '#ced4da'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(x0 + 40, gy - 2 * k); ctx.lineTo(x0 + w0 - 20, gy - 2 * k); ctx.stroke(); ctx.setLineDash([]);
        D.text(ctx, '开始的高度', x0 + w0 - 24, gy - 2 * k - 8, { size: F(12), color: '#868e96', align: 'right' });
        const r = 24; EN.ball(ctx, x0 + w0 / 2, gy - M.y * k - r, r, '#ff8787', '#c92a2a');
      } else if (st.k === 'slide') {
        const gy = y0 + h0 - 30, k = Math.min((w0 - 60) / 6.3, (h0 - 80) / 2.1), sx = x0 + 30, H = M.L * Math.sin(M.ang), Lx = M.L * Math.cos(M.ang);
        ctx.fillStyle = '#e9dcc6'; ctx.fillRect(x0, gy, w0, 30);
        ctx.strokeStyle = '#f08c00'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, gy - H * k); ctx.lineTo(sx + Lx * k, gy); ctx.stroke();
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, gy - H * k); ctx.lineTo(sx, gy); ctx.stroke();
        let px, py;
        if (M.s < M.L) { px = sx + M.s * Math.cos(M.ang) * k; py = gy - (M.L - M.s) * Math.sin(M.ang) * k; } else { px = sx + Lx * k + M.x2 * k; py = gy; }
        ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(px, py - 34, 14, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1c7ed6'; D.roundRect(ctx, px - 14, py - 22, 28, 22, 6); ctx.fill();
      } else {
        const px = x0 + w0 / 2, py = y0 + 24, k = (h0 - 70) / M.L;
        ctx.fillStyle = '#495057'; ctx.fillRect(px - 120, py - 10, 240, 10);
        const bx = px + Math.sin(M.th) * M.L * k, by = py + Math.cos(M.th) * M.L * k;
        ctx.strokeStyle = '#868e96'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 18, py); ctx.lineTo(bx - 18, by); ctx.moveTo(px + 18, py); ctx.lineTo(bx + 18, by); ctx.stroke();
        ctx.fillStyle = '#8a5a1c'; ctx.fillRect(bx - 30, by - 4, 60, 10);
        ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(bx, by - 40, 14, 0, TAU); ctx.fill();
        ctx.fillStyle = '#7048e8'; D.roundRect(ctx, bx - 13, by - 28, 26, 26, 6); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = '#dee2e6'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, w0, h0);
    }
    function draw(ctx, w, hh, VH) {
      const F = PS.virtual(ctx, w, hh, VW, VH), n = EN.narrow(w);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      const sc = n ? [20, 20, 960, 400] : [20, 20, 400, VH - 40];
      scene(ctx, F, ...sc);
      // 堆叠图像
      const T = SC[st.k].T, bx = n ? 110 : 520, by = n ? 500 : 50, bw = n ? 850 : 440, bh = n ? 330 : VH - 140;
      const X = (t) => bx + (t / T) * bw, Y = (E) => by + bh - (E / (M.E0 * 1.15)) * bh;
      ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh);
      const layer = (fn, col) => {
        if (st.data.length < 2) return;
        ctx.fillStyle = col; ctx.beginPath();
        st.data.forEach((d, i) => { const [lo, hi] = fn(d); i ? ctx.lineTo(X(d[0]), Y(hi)) : ctx.moveTo(X(d[0]), Y(hi)); });
        for (let i = st.data.length - 1; i >= 0; i--) { const d = st.data[i]; ctx.lineTo(X(d[0]), Y(fn(d)[0])); }
        ctx.closePath(); ctx.fill();
      };
      layer((d) => [0, d[3]], 'rgba(224,49,49,.75)');
      layer((d) => [d[3], d[3] + d[2]], 'rgba(240,140,0,.75)');
      layer((d) => [d[3] + d[2], d[3] + d[2] + d[1]], 'rgba(59,91,219,.75)');
      ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(bx, Y(M.E0)); ctx.lineTo(bx + bw, Y(M.E0)); ctx.stroke(); ctx.setLineDash([]);
      D.text(ctx, '能量的总量 ' + PS.fmt(M.E0, 0) + ' J', bx + bw - 6, Y(M.E0) - 8, { size: F(12), weight: 800, align: 'right', color: '#1b2333', bg: 'rgba(255,255,255,.85)' });
      D.arrow(ctx, bx, by + bh, bx + bw + 14, by + bh, { width: 1.5, head: 8 });
      D.arrow(ctx, bx, by + bh, bx, by - 12, { width: 1.5, head: 8 });
      D.text(ctx, '能量/J', bx + 6, by - 2, { size: F(12), weight: 700 });
      D.text(ctx, '时间', bx + bw + 14, by + bh + F(12) * 1.4, { size: F(12), weight: 700, align: 'right' });
      [['势能', 'rgba(59,91,219,.85)'], ['动能', 'rgba(240,140,0,.85)'], ['增加的内能', 'rgba(224,49,49,.85)']].forEach(([t, c], i) => {
        const lx = bx + i * (n ? 260 : 140), ly = by + bh + F(13) * (n ? 2.4 : 2.2);
        ctx.fillStyle = c; ctx.fillRect(lx, ly - F(12), F(12), F(12)); D.text(ctx, t, lx + F(12) + 6, ly, { size: F(12), color: '#343a40' });
      });
    }
    reset();
  });

  /* ================= 分一分：能量的转化还是转移 ================= */
  PS.register('transfer-sort', function (el) {
    PS.sortCards(el, [
      ['搓手时手掌变热', 0, '机械能转化为内能。'],
      ['用热水袋暖手', 1, '内能从热水袋转移到手上，能量的形式没有变。'],
      ['运动的台球撞击静止的台球，后者运动起来', 1, '动能从一个球转移到另一个球。'],
      ['电动机带动水泵抽水', 0, '电能转化为机械能。'],
      ['冷水和热水混合后温度相同', 1, '内能从热水转移到冷水。'],
      ['燃料燃烧放出热量', 0, '化学能转化为内能。'],
      ['太阳能热水器把水晒热', 0, '光能转化为内能。'],
      ['风吹动帆船前进', 1, '空气的机械能转移到帆船上。'],
      ['把烧红的铁块放入冷水中，水温升高', 1, '内能从铁块转移到水中（热传递）。'],
      ['给手机电池充电', 0, '电能转化为化学能。'],
      ['用锤子反复敲打铁块，铁块变热', 0, '机械能转化为内能。'],
      ['发电机发电', 0, '机械能转化为电能。'],
    ], ['能量的转化', '能量的转移']);
  });

  if (!document.getElementById('cv-style')) document.head.append(h('style', { id: 'cv-style' }, `
    .cv-chain{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
    .cv-box{border:2px solid var(--c);color:var(--c);background:#fff;border-radius:10px;padding:4px 12px;font-weight:800;font-size:.95rem}
    .cv-arr{color:#e8590c;font-size:.85rem;font-weight:700}
  `));
})();
