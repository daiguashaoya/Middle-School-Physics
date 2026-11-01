/* 第2、4节：声波的波形——信号发生器与示波器、听音辨乐器、波形图辨析、麦克风示波器、乐音与噪声。依赖 sound.js */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;
  const KEYS = ['fork', 'flute', 'piano', 'violin', 'clarinet'];
  const WIN = 0.012; // 示波器横轴 12 ms

  /* ================= 信号发生器 + 示波器 ================= */
  PS.register('oscilloscope', function (el) {
    const st = { f: 440, a: 0.6, tb: 'fork', on: false, ghost: null, v: null, t: 0 };
    const S = PS.stage(el, { ratio: '1000 / 400', cls: 'dark', draw: paint });
    const fS = PS.ui.slider({ label: '频率', min: Math.log2(110), max: Math.log2(1760), step: 0.01, value: Math.log2(st.f), fmt: (v) => Math.round(Math.pow(2, v)) + ' Hz', onInput: (v) => { st.f = Math.round(Math.pow(2, v)); if (st.v) st.v.setFreq(st.f); upd(); } });
    const aS = PS.ui.slider({ label: '振幅', min: 0.15, max: 1, step: 0.05, value: st.a, fmt: (v) => (v > 0.75 ? '大' : v > 0.4 ? '中' : '小'), onInput: (v) => { st.a = v; if (st.v) st.v.setGain(gain()); upd(); } });
    const tSeg = PS.ui.seg(KEYS.map((k) => ({ value: k, label: PS.TIMBRES[k].name })), st.tb, (v) => { st.tb = v; if (st.v) st.v.setTimbre(v); upd(); });
    const playBtn = PS.ui.button('▶ 播放声音', toggle, 'btn btn-primary');
    const pinBtn = PS.ui.button('📌 保存为对比波形“甲”', () => { st.ghost = { f: st.f, a: st.a, tb: st.tb }; pinBtn.innerHTML = '📌 更新对比波形“甲”'; upd(); }, 'btn');
    const clrBtn = PS.ui.button('清除对比', () => { st.ghost = null; pinBtn.innerHTML = '📌 保存为对比波形“甲”'; upd(); }, 'btn btn-ghost');
    const rp = PS.ui.readout('音调（看疏密）', '—', 'accent');
    const rl = PS.ui.readout('响度（看幅度）', '—', 'primary');
    const rt = PS.ui.readout('音色（看形状）', '—', 'green');
    const cmp = h('div', { class: 'feedback info show small' });
    el.append(PS.ui.row(playBtn, tSeg.el), PS.ui.row(fS.el, aS.el), PS.ui.row(pinBtn, clrBtn), h('div', { class: 'readouts' }, rp.el, rl.el, rt.el), cmp);
    fS.el.classList.add('wide');

    const gain = () => 0.08 + 0.27 * st.a * st.a;
    function toggle() {
      if (st.on) { st.on = false; if (st.v) st.v.stop(); st.v = null; playBtn.innerHTML = '▶ 播放声音'; loop.stop(); S.render(); return; }
      st.v = PS.audio.voice({ freq: st.f, timbre: st.tb, gain: gain() });
      st.on = true; playBtn.innerHTML = '⏸ 停止'; loop.start();
    }
    PS.audio.whenHidden(S.stage, () => { if (st.on) toggle(); });
    const loop = PS.loop((dt) => { st.t += dt; S.render(); }, S.stage);
    const pitchWord = (f) => (f >= 700 ? '高' : f >= 300 ? '中' : '低');
    const loudWord = (a) => (a > 0.75 ? '大' : a > 0.4 ? '中' : '小');
    function upd() {
      rp.set(st.f + ' Hz · ' + pitchWord(st.f));
      rl.set('振幅' + loudWord(st.a));
      rt.set(PS.TIMBRES[st.tb].name);
      if (!st.ghost) { cmp.innerHTML = '调好一个声音后点“保存为对比波形”，再改变频率、振幅或音色，比较两个波形有什么不同。'; S.render(); return; }
      const g = st.ghost, parts = [];
      parts.push(g.f === st.f ? '频率相同 → <b>音调相同</b>' : '乙的频率比甲' + (st.f > g.f ? '高' : '低') + '（相同时间内波的个数' + (st.f > g.f ? '多' : '少') + '）→ 乙的<b>音调' + (st.f > g.f ? '高' : '低') + '</b>');
      parts.push(Math.abs(g.a - st.a) < 0.01 ? '振幅相同 → <b>响度相同</b>' : '乙的振幅比甲' + (st.a > g.a ? '大' : '小') + ' → 乙的<b>响度' + (st.a > g.a ? '大' : '小') + '</b>');
      parts.push(g.tb === st.tb ? '波形形状相同 → <b>音色相同</b>' : '波形形状不同 → <b>音色不同</b>（' + PS.TIMBRES[g.tb].name + ' / ' + PS.TIMBRES[st.tb].name + '）');
      cmp.innerHTML = '<b>甲（虚线）与乙（实线）比较：</b>' + parts.join('；') + '。';
      S.render();
    }
    function paint(ctx, w, hh) {
      const traces = [];
      if (st.ghost) { const g = st.ghost, fn = PS.timbreFn(g.tb); traces.push({ fn: (x) => g.a * fn(g.f * WIN * x), color: '#ffd43b', width: 2, dash: [6, 5], glow: 0 }); }
      const fn = PS.timbreFn(st.tb);
      traces.push({ fn: (x) => st.a * fn(st.f * WIN * x), color: '#69db7c', width: 2.5 });
      PS.scope(ctx, { x: 0, y: 0, w, h: hh }, { r: 0, nx: 12, ny: 8, label: '示波器　横轴：每格 1 ms' + (st.ghost ? '　　— — 甲　—— 乙' : ''), note: st.on ? '正在播放：' + PS.TIMBRES[st.tb].name + ' ' + st.f + ' Hz' : '点“播放声音”可以同时听到', traces });
    }
    upd();
  });

  /* ================= 听音辨乐器 ================= */
  PS.register('timbre-guess', function (el) {
    const st = { cur: null, answered: true, ok: 0, n: 0, show: null };
    const F0 = 392;
    const S = PS.stage(el, { ratio: '1000 / 260', cls: 'dark', draw: paint });
    const playBtn = PS.ui.button('▶ 播放神秘声音', () => {
      if (st.answered) { st.cur = PS.pick(KEYS); st.answered = false; st.show = null; S.render(); fb.className = 'feedback show info'; fb.innerHTML = '它们的<b>音调和响度都相同</b>（392 Hz），只有音色不同。是哪种乐器？'; }
      PS.audio.note(F0, { timbre: st.cur, dur: 1.3, gain: 0.3 });
    }, 'btn btn-primary');
    const guess = h('div', { class: 'tg-btns' }, KEYS.map((k) => h('button', { type: 'button', class: 'btn', onclick: () => answer(k) }, PS.TIMBRES[k].icon + ' ' + PS.TIMBRES[k].name)));
    const learn = h('div', { class: 'tg-learn' }, h('span', { class: 'muted small' }, '先试听：'), KEYS.map((k) => h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { PS.audio.note(F0, { timbre: k, dur: 1.1, gain: 0.3 }); st.show = k; S.render(); } }, PS.TIMBRES[k].name)));
    const score = h('span', { class: 'tg-score' });
    const fb = h('div', { class: 'feedback show info' }, '点“播放神秘声音”，听一听是哪种乐器。');
    el.append(learn, PS.ui.row(playBtn, score), guess, fb);
    el.insertBefore(S.stage, guess);
    function answer(k) {
      if (!st.cur || st.answered) { PS.toast('先点“播放神秘声音”'); return; }
      st.answered = true; st.n++; st.show = st.cur;
      const ok = k === st.cur;
      if (ok) st.ok++;
      ok ? PS.sound.good() : PS.sound.bad();
      fb.className = 'feedback show ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = (ok ? '✔ 答对了！' : '✘ 不对，是 <b>' + PS.TIMBRES[st.cur].name + '</b>。') + ' 不同发声体的材料、结构不同，发出声音的<b>音色</b>不同，波形的<b>形状</b>也不同。';
      score.innerHTML = '得分 <b>' + st.ok + '</b> / ' + st.n;
      S.render();
    }
    function paint(ctx, w, hh) {
      const k = st.show;
      const fn = k ? PS.timbreFn(k) : null;
      PS.scope(ctx, { x: 0, y: 0, w, h: hh }, {
        r: 0, label: k ? PS.TIMBRES[k].name + ' 的波形（392 Hz）' : '波形：答题后显示',
        traces: fn ? [{ fn: (x) => 0.85 * fn(F0 * 0.0102 * x), color: '#69db7c', width: 2.5 }] : [],
      });
    }
    document.head.append(h('style', null, `
      .tg-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      .tg-learn{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-bottom:10px}
      .tg-score{font-weight:700;color:var(--ink-2)}
      .tg-score b{color:var(--green)}
    `));
  });

  /* ================= 波形图辨析 ================= */
  const NAMES = ['甲', '乙', '丙'];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const PAIRS = [[0, 1], [1, 2], [0, 2]];
  const SHAPES = ['fork', 'violin', 'clarinet', 'piano'];
  function makeQ() {
    const type = PS.pick(['pitchMax', 'loudMax', 'pitchSame', 'loudSame', 'timbreDiff']);
    const ns = [2, 3, 4, 5], as = [0.4, 0.65, 0.92];
    const W = [0, 1, 2].map(() => ({ n: PS.pick(ns), a: PS.pick(as), s: PS.pick(SHAPES) }));
    let q, options, ans, why;
    if (type === 'pitchMax') {
      const n3 = shuffle(ns).slice(0, 3); W.forEach((x, i) => { x.n = n3[i]; });
      ans = n3.indexOf(Math.max(...n3)); q = '音调最高的是（　）'; options = NAMES.slice();
      why = '在相同时间内，' + NAMES[ans] + ' 振动的次数最多（' + W[ans].n + ' 个完整的波），频率最高，音调最高。';
    } else if (type === 'loudMax') {
      const a3 = shuffle(as); W.forEach((x, i) => { x.a = a3[i]; });
      ans = a3.indexOf(Math.max(...a3)); q = '响度最大的是（　）'; options = NAMES.slice();
      why = NAMES[ans] + ' 的波偏离中间横线最远，振幅最大，响度最大。';
    } else if (type === 'pitchSame' || type === 'loudSame') {
      const key = type === 'pitchSame' ? 'n' : 'a', pool = key === 'n' ? ns : as;
      const p = PS.pick([0, 1, 2]), [i, j] = PAIRS[p], k = 3 - i - j;
      const [v1, v2] = shuffle(pool);
      W[i][key] = v1; W[j][key] = v1; W[k][key] = v2;
      ans = p; options = PAIRS.map(([x, y]) => NAMES[x] + '和' + NAMES[y]);
      q = (key === 'n' ? '音调相同' : '响度相同') + '的是（　）';
      why = key === 'n' ? NAMES[i] + '和' + NAMES[j] + '在相同时间内波的个数相同（都是 ' + v1 + ' 个），频率相同，音调相同。' : NAMES[i] + '和' + NAMES[j] + '的振幅相同，响度相同。';
    } else {
      const [s1, s2] = shuffle(SHAPES), odd = PS.pick([0, 1, 2]);
      W.forEach((x, i) => { x.s = i === odd ? s2 : s1; });
      ans = odd; options = NAMES.slice(); q = '与另外两个音色不同的是（　）';
      why = NAMES[odd] + ' 的波形形状与另外两个不同，所以音色不同。（音色看形状，与疏密、高低无关）';
    }
    return { W, q, options, ans, why };
  }
  PS.register('wave-judge', function (el) {
    const st = { Q: makeQ(), done: false, ok: 0, n: 0 };
    const S = PS.stage(el, { ratio: '1000 / 330', draw: paint });
    const stem = h('div', { class: 'wj-stem' });
    const opts = h('div', { class: 'q-options cols-3 wj-opts' });
    const fb = h('div', { class: 'q-explain' });
    const score = h('span', { class: 'tg-score' });
    el.append(stem, opts, fb, PS.ui.row(PS.ui.button('换一题 ↻', next, 'btn btn-primary btn-sm'), score));
    function next() { st.Q = makeQ(); st.done = false; render(); }
    function render() {
      const Q = st.Q;
      stem.innerHTML = '如图是三个声音在<b>相同时间内</b>的波形（每个示波器的设置相同）。' + Q.q;
      opts.innerHTML = '';
      fb.className = 'q-explain';
      Q.options.forEach((o, i) => {
        const b = h('button', { type: 'button', class: 'q-opt', html: '<span class="q-letter">' + 'ABC'[i] + '</span>' + o });
        b.addEventListener('click', () => {
          if (st.done) return;
          st.done = true; st.n++;
          const ok = i === Q.ans;
          if (ok) st.ok++;
          opts.querySelectorAll('.q-opt').forEach((x, j) => { x.disabled = true; if (j === Q.ans) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          fb.innerHTML = '<b>' + (ok ? '✔ 正确。' : '✘ 再想想。') + '</b>' + Q.why + '<br><span class="muted">口诀：音调看疏密，响度看高低，音色看形状。</span>';
          fb.className = 'q-explain show';
          ok ? PS.sound.good() : PS.sound.bad();
          score.innerHTML = '答对 <b>' + st.ok + '</b> / ' + st.n;
        });
        opts.append(b);
      });
      S.render();
    }
    function paint(ctx, w, hh) {
      const gap = 12, pw = (w - gap * 2) / 3;
      st.Q.W.forEach((x, i) => {
        const fn = PS.timbreFn(x.s);
        const b = { x: i * (pw + gap), y: 0, w: pw, h: hh - 30 };
        PS.scope(ctx, b, { nx: 6, ny: 6, scale: 0.95, traces: [{ fn: (t) => x.a * fn(x.n * t), color: '#69db7c', width: 2 }] });
        D.text(ctx, NAMES[i], b.x + pw / 2, hh - 6, { size: 16, weight: 800, color: '#1b2333', align: 'center' });
      });
    }
    render();
    document.head.append(h('style', null, `
      .wj-stem{font-weight:600;margin:12px 0 8px}
      .q-options.cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
      @media (max-width:720px){.q-options.cols-3{grid-template-columns:1fr}}
    `));
  });

  /* ================= 麦克风示波器（实验台） ================= */
  const MIC_TASKS = [
    ['低音和高音', '分别用低音、高音唱“啊——”，比较波形的<b>疏密</b>（频率）。'],
    ['小声和大声', '用同样的音调小声、大声地唱，比较波形的<b>高低</b>（振幅）。'],
    ['吹口哨', '口哨声的波形接近最简单的正弦曲线，很有规律。'],
    ['拍手、撕纸', '这些声音的波形杂乱无章，没有规律——从物理学角度看是<b>噪声</b>。'],
  ];
  PS.register('mic-scope', function (el) {
    const st = { mode: 'off', freeze: false, gen: { f: 440, tb: 'violin' }, level: 0, pitch: 0, vg: 4 };
    let ac = null, an = null, src = null, stream = null, genO = null, genG = null, buf = null;
    const S = PS.stage(el, { ratio: '1000 / 380', cls: 'dark', draw: paint });
    const micBtn = PS.ui.button('🎤 打开麦克风', startMic, 'btn btn-primary');
    const genBtn = PS.ui.button('🎛️ 改用信号发生器', startGen, 'btn');
    const frBtn = PS.ui.button('⏸ 定格波形', () => { st.freeze = !st.freeze; frBtn.innerHTML = st.freeze ? '▶ 继续' : '⏸ 定格波形'; }, 'btn');
    const offBtn = PS.ui.button('⏹ 关闭', stopAll, 'btn btn-ghost');
    const rf = PS.ui.readout('估计的频率', '—', 'accent');
    // 纵轴放大倍数固定（不自动调节），这样才能比较大声、小声时波形的高低
    const vgSeg = PS.ui.seg([1, 4, 16].map((v) => ({ value: v, label: '×' + v })), st.vg, (v) => { st.vg = v; S.render(); });
    const meter = PS.levelMeter('响度（相对）');
    const genRow = h('div', { style: { display: 'none' } });
    const gf = PS.ui.slider({ label: '频率', min: 110, max: 1500, step: 1, value: 440, unit: 'Hz', onInput: (v) => { st.gen.f = v; if (genO) genO.frequency.setTargetAtTime(v, ac.currentTime, 0.02); } });
    const gtb = PS.ui.seg(KEYS.map((k) => ({ value: k, label: PS.TIMBRES[k].name })), st.gen.tb, (v) => { st.gen.tb = v; if (st.mode === 'gen') startGen(); });
    genRow.append(PS.ui.row(gf.el, gtb.el));
    const msg = h('div', { class: 'feedback show info small' }, '打开麦克风，对着电脑唱歌、说话、吹口哨，观察声音的波形。浏览器会询问是否允许使用麦克风，请点“允许”。');
    const tasks = h('ol', { class: 'mic-tasks' }, MIC_TASKS.map(([t, d]) => h('li', null, h('b', null, t + '：'), h('span', { html: d }))));
    el.append(PS.ui.row(micBtn, genBtn, frBtn, offBtn), genRow, h('div', { class: 'readouts' }, rf.el, h('div', { class: 'readout' }, h('span', null, '纵轴放大'), vgSeg.el)), meter.el, msg, h('h4', { style: { margin: '12px 0 4px' } }, '试一试'), tasks);

    function ensureCtx() {
      if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ac = new AC(); }
      if (ac.state === 'suspended') ac.resume();
      if (!an) { an = ac.createAnalyser(); an.fftSize = 4096; buf = new Float32Array(an.fftSize); }
      return ac;
    }
    function disconnect() {
      if (src) { try { src.disconnect(); } catch (e) { /* 忽略 */ } src = null; }
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      if (genO) { try { genO.stop(); genO.disconnect(); genG.disconnect(); } catch (e) { /* 忽略 */ } genO = null; }
    }
    function startMic() {
      if (!ensureCtx()) { msg.innerHTML = '这个浏览器不支持音频分析。'; return; }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.className = 'feedback show bad small'; msg.innerHTML = '无法使用麦克风（浏览器不支持，或页面不是通过 https 打开的）。可以点“改用信号发生器”。'; return; }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then((s) => {
        disconnect();
        stream = s; src = ac.createMediaStreamSource(s); src.connect(an);
        st.mode = 'mic'; genRow.style.display = 'none';
        msg.className = 'feedback show ok small'; msg.innerHTML = '麦克风已打开。对着它发出声音吧！（声音不会从扬声器放出来）';
        loop.start();
      }).catch(() => { msg.className = 'feedback show bad small'; msg.innerHTML = '没有拿到麦克风权限（或电脑没有麦克风）。可以点“改用信号发生器”继续实验。'; });
    }
    function startGen() {
      if (!ensureCtx()) return;
      disconnect();
      genO = ac.createOscillator();
      const T = PS.TIMBRES[st.gen.tb];
      if (st.gen.tb !== 'fork') {
        const re = new Float32Array(T.h.length + 1), im = new Float32Array(T.h.length + 1);
        T.h.forEach((a, k) => { re[k + 1] = a * Math.sin(T.ph[k] || 0); im[k + 1] = a * Math.cos(T.ph[k] || 0); });
        genO.setPeriodicWave(ac.createPeriodicWave(re, im));
      }
      genO.frequency.value = st.gen.f;
      genG = ac.createGain(); genG.gain.value = 0.25;
      genO.connect(genG); genG.connect(an);
      if (!PS.audio.muted) genG.connect(ac.destination);
      genO.start();
      st.mode = 'gen'; genRow.style.display = '';
      msg.className = 'feedback show info small'; msg.innerHTML = '信号发生器的声音同时送到示波器和扬声器。改变频率和音色，观察波形。';
      loop.start();
    }
    function stopAll() { disconnect(); st.mode = 'off'; st.level = 0; meter.set(0, ''); rf.set('—'); loop.stop(); S.render(); }
    PS.audio.whenHidden(S.stage, () => { if (st.mode !== 'off') stopAll(); });

    // 自相关法估计基频
    function detectPitch(b, sr) {
      let rms = 0;
      for (let i = 0; i < b.length; i++) rms += b[i] * b[i];
      rms = Math.sqrt(rms / b.length);
      if (rms < 0.01) return 0;
      const n = 2048, minLag = Math.floor(sr / 1500), maxLag = Math.floor(sr / 70);
      let best = 0, bestLag = 0;
      for (let lag = minLag; lag <= maxLag; lag++) {
        let c = 0;
        for (let i = 0; i < n; i++) c += b[i] * b[i + lag];
        if (c > best) { best = c; bestLag = lag; }
      }
      let e = 0;
      for (let i = 0; i < n; i++) e += b[i] * b[i];
      return best / e > 0.5 ? sr / bestLag : 0;
    }
    const loop = PS.loop(() => {
      if (an && !st.freeze) {
        an.getFloatTimeDomainData(buf);
        let rms = 0;
        for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / buf.length);
        st.level = st.level * 0.7 + rms * 0.3;
        st.pitch = detectPitch(buf, ac.sampleRate);
        const db = 20 * Math.log10(st.level + 1e-6);
        meter.set((db + 60) / 60, st.level > 0.003 ? (db + 90).toFixed(0) + '（相对值）' : '安静');
        rf.set(st.pitch ? Math.round(st.pitch) + ' Hz' : '—');
      }
      S.render();
    }, S.stage);
    function paint(ctx, w, hh) {
      let traces = [];
      if (buf && st.mode !== 'off') {
        // 在上升过零点处触发，让周期性的波形稳定显示；横轴显示 20 ms
        let start = 0;
        for (let i = 1; i < 1500; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { start = i; break; }
        const span = Math.round(ac.sampleRate * 0.02);
        traces = [{ fn: (x) => buf[start + Math.floor(x * span)] * st.vg, color: '#69db7c', width: 2 }];
      }
      PS.scope(ctx, { x: 0, y: 0, w, h: hh }, { r: 0, label: st.mode === 'mic' ? '麦克风 · 横轴 20 ms · 纵轴 ×' + st.vg : st.mode === 'gen' ? '信号发生器 · 横轴 20 ms · 纵轴 ×' + st.vg : '示波器（未接入信号）', traces, note: st.freeze ? '已定格' : '' });
    }
    S.render();
    document.head.append(h('style', null, `.mic-tasks{margin:0;padding-left:1.4em;font-size:.93rem}.mic-tasks li{margin:3px 0}`));
  });

  /* ================= 乐音与噪声 ================= */
  const SOUNDS = [
    { k: 'fork', name: '音叉', music: true },
    { k: 'piano', name: '钢琴', music: true },
    { k: 'violin', name: '小提琴', music: true },
    { k: 'scrape', name: '铁钉刮玻璃', music: false },
    { k: 'drill', name: '电钻', music: false },
    { k: 'crowd', name: '集市喧哗', music: false },
  ];
  PS.register('music-noise', function (el) {
    const st = { cur: SOUNDS[0], seed: 1, t: 0 };
    const S = PS.stage(el, { ratio: '1000 / 300', cls: 'dark', draw: paint });
    const btns = h('div', { class: 'tg-btns' }, SOUNDS.map((s) => h('button', { type: 'button', class: 'btn ' + (s.music ? '' : 'mn-noise'), onclick: () => choose(s) }, (s.music ? '🎵 ' : '💥 ') + s.name)));
    const fb = h('div', { class: 'feedback show info' });
    el.insertBefore(btns, S.stage);
    el.append(fb);
    let timer = 0;
    function choose(s) {
      st.cur = s;
      const A = PS.audio;
      if (s.music) A.note(s.k === 'fork' ? 440 : 392, { timbre: s.k, dur: 1.2, gain: 0.28 });
      else if (s.k === 'scrape') { A.noise({ dur: 1.2, gain: 0.25, filter: { type: 'bandpass', freq: 3300, Q: 3 } }); A.note(2850, { timbre: 'sawtooth', dur: 0.9, gain: 0.04 }); }
      else if (s.k === 'drill') { A.noise({ dur: 1.4, gain: 0.3, filter: { type: 'lowpass', freq: 1200 } }); A.note(118, { timbre: 'sawtooth', dur: 1.4, gain: 0.12 }); }
      else { A.noise({ dur: 1.4, gain: 0.3, filter: { type: 'bandpass', freq: 900, Q: 0.6 } }); }
      fb.className = 'feedback show ' + (s.music ? 'ok' : 'bad');
      fb.innerHTML = s.music
        ? s.name + '的波形<b>有规律</b>，周期性地重复——发声体做<b>有规则的振动</b>，发出的是乐音。'
        : s.name + '的波形<b>杂乱无章</b>，没有规律——从物理学角度看，噪声是发声体做<b>无规则振动</b>时发出的声音。';
      clearInterval(timer);
      let n = 0;
      timer = setInterval(() => { st.seed++; S.render(); if (++n > 14) clearInterval(timer); }, 90);
      S.render();
    }
    // 可重复的伪随机数，保证同一帧里噪声波形稳定
    function rnd(i) { const x = Math.sin(i * 127.1 + st.seed * 311.7) * 43758.5453; return x - Math.floor(x); }
    function paint(ctx, w, hh) {
      const s = st.cur;
      let fn;
      if (s.music) { const f = PS.timbreFn(s.k); fn = (x) => 0.8 * f(5 * x); }
      else {
        const N = 260, pts = [];
        for (let i = 0; i <= N; i++) pts.push((rnd(i) * 2 - 1) * (s.k === 'drill' ? 0.6 + 0.3 * Math.sin(i / 9) : s.k === 'crowd' ? 0.5 + 0.4 * rnd(i * 7 + 3) : 0.9));
        fn = (x) => { const p = x * N, i = Math.floor(p), k = p - i; return pts[i] * (1 - k) + (pts[i + 1] || 0) * k; };
      }
      PS.scope(ctx, { x: 0, y: 0, w, h: hh }, { r: 0, label: s.name + ' 的波形', note: s.music ? '乐音：有规律' : '噪声：杂乱无章', traces: [{ fn, color: s.music ? '#69db7c' : '#ff8787', width: 2 }] });
    }
    fb.innerHTML = '点上面的按钮，听一听、看一看乐音和噪声的波形有什么不同。';
    document.head.append(h('style', null, '.mn-noise{border-color:#ffc9c9}.mn-noise:hover{background:var(--red-soft)}'));
  });
})();
