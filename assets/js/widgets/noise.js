/* 第4节：噪声的危害和控制——声音的强弱等级、控制噪声的三条途径、比较材料的隔声性能。依赖 sound.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  // 声级分区：教材中“为了保证休息和睡眠 / 工作和学习 / 保护听力”的上限
  const BANDS = [
    { to: 50, c: '#2b8a3e', bg: '#e5f6e9', t: '≤ 50 dB：保证休息和睡眠' },
    { to: 70, c: '#5c940d', bg: '#f4fce3', t: '50~70 dB：可以正常工作和学习' },
    { to: 90, c: '#e8590c', bg: '#fff4e6', t: '70~90 dB：干扰工作学习' },
    { to: 151, c: '#e03131', bg: '#ffeded', t: '> 90 dB：会损害听力' },
  ];
  const bandOf = (db) => BANDS.find((b) => db <= b.to) || BANDS[3];

  /* ================= 声音的强弱等级 ================= */
  const LEVELS = [
    { db: 0, icon: '👂', name: '刚能听到的最微弱的声音' },
    { db: 10, icon: '🍃', name: '树叶的沙沙声' },
    { db: 20, icon: '🤫', name: '轻声耳语' },
    { db: 35, icon: '📚', name: '安静的图书馆（理想的安静环境 30~40 dB）' },
    { db: 60, icon: '🗣️', name: '正常交谈' },
    { db: 75, icon: '🚗', name: '繁忙的街道' },
    { db: 90, icon: '🏍️', name: '摩托车' },
    { db: 100, icon: '🔨', name: '电锯、工厂车间' },
    { db: 120, icon: '⚡', name: '近处的雷声（耳朵感到疼痛）' },
    { db: 140, icon: '✈️', name: '喷气式飞机起飞' },
    { db: 150, icon: '💥', name: '突然暴露在 150 dB 噪声中：鼓膜破裂出血，双耳完全失去听力' },
  ];
  PS.register('db-scale', function (el) {
    const VW = 1000, VH = 300;
    const st = { db: 60, hover: -1 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    S.stage.style.cursor = 'pointer';
    const dS = PS.ui.slider({ label: '声级', min: 0, max: 150, step: 1, value: st.db, unit: 'dB', onInput: (v) => { st.db = v; upd(); } });
    dS.el.classList.add('wide');
    const out = h('div', { class: 'feedback show' });
    el.append(PS.ui.row(dS.el), out);
    const X = (db) => 50 + (db / 150) * 900;
    const Y0 = 170;
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VW, VH);
      let x0 = X(0);
      BANDS.forEach((b) => { const x1 = X(Math.min(150, b.to)); ctx.fillStyle = b.c; D.roundRect(ctx, x0, Y0 - 9, x1 - x0, 18, 0); ctx.fill(); x0 = x1; });
      ctx.fillStyle = '#6b7487'; ctx.font = PS.font(F(11.5), 600); ctx.textAlign = 'center';
      for (let d = 0; d <= 150; d += 10) { ctx.fillRect(X(d), Y0 + 9, 1, 6); ctx.fillText(d, X(d), Y0 + 28); }
      ctx.fillText('声音的强弱等级 / 分贝（dB）', 500, Y0 + 50);
      [50, 70, 90].forEach((d) => D.text(ctx, d + ' dB', X(d), Y0 - 16, { size: F(11.5), weight: 800, color: bandOf(d - 1).c, align: 'center' }));
      // 各种声音（上下交替排列）
      ctx.textBaseline = 'middle';
      LEVELS.forEach((L, i) => {
        const up = i % 2 === 0, x = X(L.db), y = up ? 62 : 252, hov = st.hover === i;
        ctx.strokeStyle = hov ? '#1b2333' : '#ced4da'; ctx.lineWidth = hov ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(x, up ? y + 24 : y - 24); ctx.lineTo(x, up ? Y0 - 10 : Y0 + 10); ctx.stroke();
        ctx.fillStyle = hov ? '#fff3bf' : '#f8f9fa';
        ctx.beginPath(); ctx.arc(x, y, 23, 0, TAU); ctx.fill();
        ctx.strokeStyle = bandOf(L.db).c; ctx.lineWidth = 2; ctx.stroke();
        ctx.font = F(22, 15) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.fillText(L.icon, x, y + 1);
      });
      ctx.textBaseline = 'alphabetic';
      // 当前声级指针
      const xs = X(st.db);
      ctx.fillStyle = '#1b2333';
      ctx.beginPath(); ctx.moveTo(xs, Y0 - 11); ctx.lineTo(xs - 8, Y0 - 24); ctx.lineTo(xs + 8, Y0 - 24); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    function upd() {
      const b = bandOf(st.db);
      const near = LEVELS.reduce((a, L) => (Math.abs(L.db - st.db) < Math.abs(a.db - st.db) ? L : a));
      out.style.background = b.bg; out.style.color = b.c;
      out.innerHTML = '<b>' + st.db + ' dB</b>　' + b.t + '。' + (Math.abs(near.db - st.db) <= 6 ? '相当于：' + near.icon + ' ' + near.name + '。' : '');
      S.render();
    }
    function hitTest(e) {
      const p = S.pos(e), x = (p.x / S.w) * VW, y = (p.y / S.h) * VH;
      return LEVELS.findIndex((L, i) => Math.hypot(x - X(L.db), y - (i % 2 === 0 ? 62 : 252)) < 28);
    }
    S.canvas.addEventListener('pointermove', (e) => { const i = hitTest(e); if (i !== st.hover) { st.hover = i; S.render(); } });
    S.canvas.addEventListener('click', (e) => { const i = hitTest(e); if (i >= 0) { st.db = LEVELS[i].db; dS.set(st.db, true); upd(); } });
    upd();
  });

  /* ================= 控制噪声的三条途径 ================= */
  const MEASURES = [
    { k: 'muffler', where: 0, name: '摩托车安装消声器', cut: 15 },
    { k: 'nohorn', where: 0, name: '禁止鸣喇叭', cut: 6 },
    { k: 'wall', where: 1, name: '路边修建隔音墙', cut: 12 },
    { k: 'trees', where: 1, name: '道路两旁植树', cut: 5 },
    { k: 'glass', where: 1, name: '安装双层玻璃窗', cut: 10 },
    { k: 'muff', where: 2, name: '戴上耳罩', cut: 20 },
  ];
  const WHERE = ['在声源处减弱', '在传播过程中减弱', '在人耳处减弱'];
  const WHERE_C = ['#e8590c', '#1c7ed6', '#2b8a3e'];
  function drawBike(ctx, x, y, muffler) {
    ctx.save();
    ctx.translate(x, y);
    [[-48, 0], [48, 0]].forEach(([dx]) => {
      ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(dx, 0, 20, 0, TAU); ctx.fill();
      ctx.fillStyle = '#adb5bd'; ctx.beginPath(); ctx.arc(dx, 0, 8, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#e03131';
    ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(-20, -34); ctx.lineTo(26, -34); ctx.lineTo(48, 0); ctx.lineTo(10, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#343a40'; PS.draw.roundRect(ctx, -30, -46, 40, 12, 6); ctx.fill();
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(26, -34); ctx.lineTo(38, -56); ctx.lineTo(50, -56); ctx.stroke();
    // 排气管（装上消声器后变粗）
    ctx.strokeStyle = muffler ? '#e8590c' : '#868e96'; ctx.lineWidth = muffler ? 11 : 5;
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(-62, -12); ctx.stroke();
    ctx.restore();
  }
  PS.register('noise-control', function (el) {
    const VW = 1000, VH = 380, BASE = 92;
    const st = { on: {}, t: 0, play: false, snd: null, flash: -1, flashT: 0 };
    const S = PS.stage(el, { ratio: VW + ' / ' + VH, draw: paint });
    const btns = h('div', { class: 'nc-btns' });
    MEASURES.forEach((m) => {
      const b = h('button', { type: 'button', class: 'nc-btn' }, m.name);
      b.style.setProperty('--c', WHERE_C[m.where]);
      b.addEventListener('click', () => {
        st.on[m.k] = !st.on[m.k]; b.classList.toggle('on', !!st.on[m.k]);
        st.flash = m.where; st.flashT = 1.6; loop.start();
        say(st.on[m.k] ? '“' + m.name + '”属于<b style="color:' + WHERE_C[m.where] + '">' + WHERE[m.where] + '</b>，人耳处的声级降低了约 ' + m.cut + ' dB。' : '撤销了“' + m.name + '”。');
        upd();
      });
      btns.append(b);
    });
    const playBtn = PS.ui.button('🔊 听一听', () => {
      st.play = !st.play; playBtn.innerHTML = st.play ? '⏸ 停止' : '🔊 听一听';
      if (st.play) { st.snd = PS.audio.noise({ gain: 0.0001, filter: { type: 'lowpass', freq: 1400 } }); upd(); } else if (st.snd) { st.snd.stop(); st.snd = null; }
    }, 'btn');
    const meter = PS.levelMeter('人耳处的声级');
    const msg = h('div', { class: 'feedback show info small' }, '一辆摩托车在楼下轰鸣，窗边的人觉得很吵。试着采取各种措施减弱噪声。');
    el.append(btns, PS.ui.row(playBtn), meter.el, msg);
    PS.audio.whenHidden(S.stage, () => { if (st.play) playBtn.click(); });
    function say(t) { msg.innerHTML = t; }
    function level() { return MEASURES.reduce((L, m) => L - (st.on[m.k] ? m.cut : 0), BASE); }
    function upd() {
      const L = level(), b = bandOf(L);
      meter.set((L - 20) / 80, '<span style="color:' + b.c + '">' + L + ' dB</span>');
      if (st.snd) st.snd.setGain(0.35 * Math.pow(10, (L - BASE) / 30));
      S.render();
    }
    const loop = PS.loop((dt) => { st.t += dt; st.flashT = Math.max(0, st.flashT - dt); S.render(); }, S.stage);
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#e7f5ff'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#495057'; ctx.fillRect(0, 300, 380, 80);
      ctx.strokeStyle = '#fff'; ctx.setLineDash([18, 14]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 340); ctx.lineTo(380, 340); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#b2f2bb'; ctx.fillRect(380, 300, 620, 80);
      // 三个区域
      [[0, 380], [380, 700], [700, 1000]].forEach(([a, b], i) => {
        const f = st.flash === i && st.flashT > 0;
        ctx.fillStyle = f ? WHERE_C[i] + '22' : 'transparent'; ctx.fillRect(a, 0, b - a, 300);
        D.text(ctx, ['① 声源', '② 传播过程', '③ 人耳'][i], (a + b) / 2, 30, { size: F(15), weight: 800, color: WHERE_C[i], align: 'center' });
      });
      // 声源：摩托车（矢量绘制）
      const jig = Math.sin(st.t * 40) * (st.on.muffler ? 0.5 : 1.5);
      drawBike(ctx, 180, 322 + jig, !!st.on.muffler);
      ctx.textAlign = 'center';
      if (st.on.muffler) D.text(ctx, '消声器', 92, 290, { size: F(12), weight: 700, color: WHERE_C[0], bg: 'rgba(255,255,255,.9)' });
      if (st.on.nohorn) { ctx.font = F(36, 20) + 'px ' + PS.FONT; ctx.fillText('🚫', 300, 120); D.text(ctx, '禁止鸣笛', 300, 152, { size: F(12), weight: 700, color: WHERE_C[0], align: 'center' }); }
      // 传播：树、隔音墙
      if (st.on.trees) { ctx.font = F(46, 26) + 'px ' + PS.FONT; ['🌳', '🌳', '🌲'].forEach((t, i) => ctx.fillText(t, 420 + i * 46, 300)); }
      if (st.on.wall) { ctx.fillStyle = '#868e96'; ctx.fillRect(590, 150, 24, 150); D.text(ctx, '隔音墙', 602, 140, { size: F(12), weight: 700, color: WHERE_C[1], align: 'center' }); }
      // 楼房与人
      ctx.fillStyle = '#fff4e6'; ctx.fillRect(730, 70, 240, 230); ctx.strokeStyle = '#d9a37a'; ctx.lineWidth = 3; ctx.strokeRect(730, 70, 240, 230);
      ctx.fillStyle = st.on.glass ? '#a5d8ff' : '#d0ebff'; ctx.fillRect(745, 130, 80, 90);
      ctx.strokeStyle = '#495057'; ctx.lineWidth = st.on.glass ? 5 : 2; ctx.strokeRect(745, 130, 80, 90);
      if (st.on.glass) { ctx.lineWidth = 2; ctx.strokeRect(751, 136, 68, 78); }
      ctx.font = F(52, 28) + 'px ' + PS.FONT; ctx.fillText('🧑', 880, 220);
      if (st.on.muff) { ctx.fillStyle = WHERE_C[2]; ctx.beginPath(); ctx.arc(862, 188, 10, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(898, 188, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = WHERE_C[2]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(880, 188, 18, Math.PI, TAU); ctx.stroke(); }
      // 声波：强度随着经过的措施逐段减弱
      const L0 = BASE - (st.on.muffler ? 15 : 0) - (st.on.nohorn ? 6 : 0);
      const seg = [[230, 420, L0], [420, 590, L0 - (st.on.trees ? 5 : 0)], [614, 745, L0 - (st.on.trees ? 5 : 0) - (st.on.wall ? 12 : 0)]];
      ctx.lineWidth = 3;
      seg.forEach(([a, b, L]) => {
        const k = PS.clamp((L - 40) / 55, 0.05, 1);
        for (let x = a + ((st.t * 120) % 34); x < b; x += 34) { ctx.strokeStyle = 'rgba(112,72,232,' + k + ')'; ctx.beginPath(); ctx.arc(x - 30, 250 - (x - 230) * 0.12, 30, -0.5, 0.5); ctx.stroke(); }
      });
      const L = level(), b = bandOf(L);
      D.text(ctx, '人耳处约 ' + L + ' dB', 850, 100, { size: F(15), weight: 800, color: b.c, align: 'center', bg: 'rgba(255,255,255,.92)' });
      ctx.restore();
    }
    upd();
    loop.start();
    document.head.append(h('style', null, `
      .nc-btns{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
      .nc-btn{font:inherit;font-size:.9rem;font-weight:700;padding:6px 12px;border-radius:999px;border:1.5px solid var(--c);background:#fff;color:var(--c);cursor:pointer}
      .nc-btn.on{background:var(--c);color:#fff}
      .nc-btn.on::before{content:"✓ "}
    `));
  });

  /* ================= 减弱噪声的措施分类 ================= */
  const NOISE_ITEMS = [
    ['摩托车上安装消声器', 0], ['学校附近禁止鸣喇叭', 0], ['城区禁止燃放烟花爆竹', 0], ['上课时不大声喧哗', 0], ['在机器下面垫上橡胶垫', 0],
    ['街道两旁植树', 1], ['高速公路两侧安装隔音板', 1], ['上课时关闭教室的门窗', 1], ['剧院的墙壁使用吸音材料', 1], ['住宅安装双层真空玻璃窗', 1],
    ['机场工作人员戴防噪声耳罩', 2], ['睡觉时用耳塞堵住耳朵', 2],
  ];
  PS.register('noise-sort', function (el) {
    const score = h('div', { class: 'quiz-score' });
    const grid = h('div', { class: 'us-grid' });
    let ok = 0, done = 0;
    function build() {
      ok = 0; done = 0; grid.innerHTML = '';
      NOISE_ITEMS.slice().sort(() => Math.random() - 0.5).forEach(([t, k]) => {
        const card = h('div', { class: 'us-card' }, h('p', null, t));
        const res = h('small');
        const pick = (g) => {
          if (card.classList.contains('done')) return;
          card.classList.add('done', g === k ? 'ok' : 'bad');
          done++; if (g === k) ok++;
          res.innerHTML = (g === k ? '✔ ' : '✘ ') + '<b>' + WHERE[k] + '</b>';
          g === k ? PS.sound.good() : PS.sound.bad();
          upd();
        };
        card.append(h('div', { class: 'us-btns' }, ['声源处', '传播中', '人耳处'].map((x, i) => PS.ui.button(x, () => pick(i), 'btn btn-sm'))), res);
        grid.append(card);
      });
      upd();
    }
    function upd() { score.innerHTML = '已判断 <b>' + done + '</b> / ' + NOISE_ITEMS.length + ' · 答对 <b class="ok">' + ok + '</b>' + (done === NOISE_ITEMS.length ? (ok === NOISE_ITEMS.length ? ' · 🎉 全对！' : ' · 再试一次？') : ''); }
    el.append(h('div', { class: 'quiz-head' }, score, PS.ui.button('重新开始', build, 'btn btn-ghost btn-sm')), grid);
    build();
  });

  /* ================= 比较材料的隔声性能（实验台） ================= */
  // 闹钟在 1 m 处约 55 dB；教室里的背景声约 38 dB，低于它就听不到了
  const MATS = [
    { k: 'none', name: '不包裹', cut: 0, c: null },
    { k: 'foil', name: '锡箔纸', cut: 4, c: '#ced4da' },
    { k: 'paper', name: '报纸', cut: 8, c: '#e9ecef' },
    { k: 'cloth', name: '棉布', cut: 12, c: '#ffc9c9' },
    { k: 'sponge', name: '海绵', cut: 17, c: '#ffe066' },
    { k: 'foam', name: '泡沫塑料', cut: 20, c: '#f8f9fa' },
  ];
  const L1 = 55, BG = 38;
  PS.register('noise-lab', function (el) {
    const VW = 1000, VH = 360;
    const st = { mat: 'none', r: 1, ring: false, snd: null, t: 0, rows: [], jit: {} };
    const wrap = h('div', { class: 'bench' });
    const left = h('div'), side = h('div', { class: 'bench-side' });
    wrap.append(left, side); el.append(wrap);
    const S = PS.stage(left, { ratio: VW + ' / ' + VH, draw: paint });
    const mat = () => MATS.find((m) => m.k === st.mat);
    // 每种材料的实际效果略有起伏，使每次测得的距离不完全相同
    const cut = () => mat().cut + (st.jit[st.mat] || 0);
    const levelAt = (r) => L1 - cut() - 20 * Math.log10(Math.max(0.2, r));
    const audible = () => levelAt(st.r) > BG;

    const matSeg = PS.ui.seg(MATS.map((m) => ({ value: m.k, label: m.name })), st.mat, (v) => { st.mat = v; if (st.jit[v] == null) st.jit[v] = PS.rand(-1.2, 1.2); st.r = 0.5; rS.set(0.5, true); upd(); });
    const ringBtn = PS.ui.button('⏰ 让闹钟响起来', () => {
      st.ring = !st.ring; ringBtn.innerHTML = st.ring ? '⏹ 关闭闹钟' : '⏰ 让闹钟响起来';
      if (st.ring) { st.snd = PS.audio.alarm(0.0001); loop.start(); } else if (st.snd) { st.snd.stop(); st.snd = null; }
      upd();
    }, 'btn btn-primary');
    const rS = PS.ui.slider({ label: '人离盒子的距离', min: 0.5, max: 10, step: 0.1, value: st.r, unit: 'm', fmt: (v) => v.toFixed(1), onInput: (v) => { st.r = v; upd(); } });
    const hearR = PS.ui.readout('这个位置', '—');
    const dbR = PS.ui.readout('声级计（距盒子 1 m）', '—', 'accent');
    const recBtn = PS.ui.button('📝 听不到了，记录距离', record, 'btn btn-green btn-sm');
    const msg = h('div', { class: 'feedback show info small' }, '方法一：让闹钟响起来，人慢慢远离盒子，直到刚好听不到声音，记下这时的距离。');
    const tbody = h('tbody');
    const analysis = h('div', { class: 'small' });
    function record() {
      if (!st.ring) { msg.innerHTML = '先让闹钟响起来。'; return; }
      if (audible()) { msg.className = 'feedback show bad small'; msg.innerHTML = '在 ' + st.r.toFixed(1) + ' m 处还能听到闹钟声，再走远一些。'; return; }
      const rEdge = Math.pow(10, (L1 - cut() - BG) / 20);
      if (st.r > rEdge + 1.2) { msg.className = 'feedback show bad small'; msg.innerHTML = '走得太远了，应该记录<b>刚好</b>听不到声音的位置。往回走一些，找到那个位置。'; return; }
      st.rows = st.rows.filter((r) => r.k !== st.mat);
      st.rows.push({ k: st.mat, name: mat().name, r: st.r, db: Math.round(levelAt(1)) });
      msg.className = 'feedback show ok small'; msg.innerHTML = '已记录：' + mat().name + '，刚好听不到声音的距离约 ' + st.r.toFixed(1) + ' m。换一种材料再测。';
      PS.sound.tick();
      renderTable();
    }
    function renderTable() {
      tbody.innerHTML = '';
      const rows = st.rows.slice().sort((a, b) => a.r - b.r);
      rows.forEach((r) => tbody.append(h('tr', null, h('td', null, r.name), h('td', null, r.r.toFixed(1)), h('td', null, r.db))));
      if (!rows.length) tbody.append(h('tr', null, h('td', { colspan: 3, class: 'muted' }, '还没有数据')));
      if (rows.length >= 4) {
        analysis.innerHTML = '<p style="margin:0 0 6px">按隔声效果从好到差排列：<b>' + rows.map((r) => r.name).join(' > ') + '</b>。</p>' +
          '<p style="margin:0 0 6px">听不到声音的距离越<b>短</b>，说明材料的隔声性能越<b>好</b>（转换法）。</p>' +
          '<p style="margin:0">结论：<span class="hl">泡沫塑料、海绵等松软多孔的材料隔声性能好</span>，锡箔纸等光滑坚硬的材料隔声性能差。用材料包住声源，是在<b>传播过程中</b>减弱噪声。</p>';
      } else analysis.innerHTML = '<span class="muted">至少测量 4 种情况（包括“不包裹”），这里会给出结论。</span>';
    }
    const loop = PS.loop((dt) => { st.t += dt; S.render(); if (!st.ring) loop.stop(); }, S.stage);
    function upd() {
      const L = levelAt(st.r), can = L > BG;
      hearR.set(st.ring ? (can ? '<span class="hl-o">还能听到</span>' : '<span class="hl-g">听不到了</span>') : '闹钟没响');
      dbR.set(st.ring ? Math.round(levelAt(1)) + ' dB' : '—');
      if (st.snd) st.snd.setGain(can ? 0.02 + 0.3 * Math.min(1, (L - BG) / (L1 - BG)) : 0.0001);
      S.render();
    }
    function paint(ctx, w, hh) {
      ctx.save();
      const F = PS.virtual(ctx, w, hh, VW, VH);
      ctx.fillStyle = '#f8fafd'; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#e9ecef'; ctx.fillRect(0, 270, VW, 90);
      // 盒子与闹钟
      const m = mat();
      ctx.fillStyle = '#d9a066'; ctx.fillRect(40, 150, 150, 120);
      ctx.strokeStyle = '#a47148'; ctx.lineWidth = 3; ctx.strokeRect(40, 150, 150, 120);
      if (m.c) { ctx.fillStyle = m.c; D.roundRect(ctx, 70, 180, 90, 80, 14); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.font = F(40, 22) + 'px ' + PS.FONT; ctx.textAlign = 'center';
      ctx.globalAlpha = m.c ? 0.35 : 1;
      ctx.fillText('⏰', 115 + (st.ring ? Math.sin(st.t * 60) * 2 : 0), 238);
      ctx.globalAlpha = 1;
      D.text(ctx, '鞋盒 + ' + m.name, 115, 140, { size: F(13), weight: 700, color: '#3a4458', align: 'center' });
      // 距离标尺
      const X = (r) => 200 + r * 76;
      ctx.fillStyle = '#868e96'; ctx.font = PS.font(F(11), 500);
      for (let r = 0; r <= 10; r++) { ctx.fillRect(X(r), 270, 1, 8); ctx.fillText(r + ' m', X(r), 294); }
      // 声波（强度随距离减弱）
      if (st.ring) {
        for (let i = 0; i < 6; i++) {
          const ph = (st.t * 0.8 + i / 6) % 1, r = ph * 10, L = levelAt(Math.max(0.3, r));
          if (L <= BG) continue;
          ctx.strokeStyle = 'rgba(112,72,232,' + PS.clamp((L - BG) / 20, 0.08, 0.9) + ')'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(X(0) - 20, 210, X(r) - X(0) + 20, -0.45, 0.45); ctx.stroke();
        }
      }
      // 人
      ctx.font = F(48, 26) + 'px ' + PS.FONT; ctx.textAlign = 'center'; ctx.fillText('🧑', X(st.r), 264);
      if (st.ring) D.text(ctx, audible() ? '还能听到' : '听不到了', X(st.r), 186, { size: F(13), weight: 800, color: audible() ? '#e8590c' : '#2b8a3e', align: 'center', bg: 'rgba(255,255,255,.92)' });
      ctx.restore();
    }
    left.append(PS.ui.row(ringBtn), PS.ui.row(rS.el), h('div', { class: 'readouts' }, hearR.el, dbR.el));
    rS.el.classList.add('wide');
    side.append(
      h('div', { class: 'panel' }, h('h4', null, '① 选择包裹闹钟的材料'), matSeg.el),
      h('div', { class: 'panel' }, h('h4', null, '② 测量'), msg, h('div', { class: 'row' }, recBtn), h('div', { class: 'kbd-hint' }, '方法二：也可以比较声级计在相同距离（1 m）处的示数。')),
      h('div', { class: 'panel' }, h('h4', null, '③ 实验数据'), h('div', { class: 'table-wrap' }, h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, '材料'), h('th', null, '听不到的距离/m'), h('th', null, '1 m 处声级/dB'))), tbody))),
      h('div', { class: 'panel' }, h('h4', null, '④ 分析论证'), analysis));
    PS.audio.whenHidden(S.stage, () => { if (st.ring) ringBtn.click(); });
    st.jit.none = 0;
    renderTable(); upd();
  });
})();
