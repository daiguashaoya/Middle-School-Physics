/*
 * 第2章 声现象 · 公共声学工具（其他声学组件都依赖本文件）
 * PS.audio   合成声音：单音 note、持续音 voice、敲击/拨动 strike、噪声 noise、电铃 bell、喊声 shout
 * PS.TIMBRES 音色表（谐波振幅），PS.timbreFn 取得与播放声音一致的波形函数
 * PS.scope   画示波器（深色网格 + 波形）
 * PS.drawFork / PS.drawSpeaker  画音叉、扬声器
 * PS.levelMeter 响度条（HTML）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  /* ---------------- 音色 ---------------- */
  // h：各次谐波的振幅；ph：各次谐波的初相位（让波形形状各不相同）
  PS.TIMBRES = {
    fork: { name: '音叉', icon: '🍴', h: [1], ph: [0] },
    flute: { name: '长笛', icon: '🎶', h: [1, 0.42, 0.16, 0.07, 0.03], ph: [0, 0.4, 1.2, 0.3, 2.2] },
    piano: { name: '钢琴', icon: '🎹', h: [1, 0.66, 0.42, 0.3, 0.2, 0.12, 0.08, 0.05], ph: [0, 1.9, 0.6, 2.8, 1.4, 0.2, 2.5, 1.0], decay: 1.6 },
    violin: { name: '小提琴', icon: '🎻', h: [1, 0.6, 0.45, 0.35, 0.28, 0.22, 0.17, 0.13, 0.1, 0.08], ph: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], vibrato: true },
    clarinet: { name: '单簧管', icon: '🎷', h: [1, 0.03, 0.7, 0.03, 0.45, 0.02, 0.25, 0.01, 0.13], ph: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
  };
  const fnCache = {};
  /** 返回 f(周期数) ∈ [−1, 1]，与 PS.audio 播放的波形一致 */
  PS.timbreFn = function (key) {
    if (fnCache[key]) return fnCache[key];
    const T = PS.TIMBRES[key] || PS.TIMBRES.fork;
    const raw = (c) => {
      let s = 0;
      for (let n = 0; n < T.h.length; n++) s += T.h[n] * Math.sin(TAU * (n + 1) * c + (T.ph[n] || 0));
      return s;
    };
    let peak = 0;
    for (let i = 0; i < 512; i++) peak = Math.max(peak, Math.abs(raw(i / 512)));
    return (fnCache[key] = (c) => raw(c) / peak);
  };

  /* ---------------- 音频 ---------------- */
  const A = (PS.audio = {});
  let master = null, muted = false;
  try { muted = localStorage.getItem('ps-muted') === '1'; } catch (e) { /* 无痕模式等情况 */ }
  /** 总输出（带压限器，防止多个声音叠加时破音） */
  A.out = function () {
    const a = PS.sound.ctx();
    if (!a) return null;
    if (!master || master.context !== a) {
      master = a.createGain();
      master.gain.value = muted ? 0 : 1;
      const comp = a.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 6;
      master.connect(comp).connect(a.destination);
    }
    return master;
  };
  A.ctx = () => (A.out() ? master.context : null);
  Object.defineProperty(A, 'muted', { get: () => muted });
  A.setMuted = function (on) {
    muted = !!on;
    try { localStorage.setItem('ps-muted', muted ? '1' : '0'); } catch (e) { /* 忽略 */ }
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, master.context.currentTime, 0.02);
    PS.sound.setEnabled(!muted);
    PS.$$('.snd-toggle').forEach(upd);
  };
  PS.sound.setEnabled(!muted);

  const waveCache = new WeakMap();
  function periodicWave(a, key) {
    let m = waveCache.get(a);
    if (!m) { m = {}; waveCache.set(a, m); }
    if (m[key]) return m[key];
    const T = PS.TIMBRES[key] || PS.TIMBRES.fork;
    const n = T.h.length + 1;
    const re = new Float32Array(n), im = new Float32Array(n);
    // a·sin(x + φ) = a·sinφ·cos x + a·cosφ·sin x
    for (let k = 0; k < T.h.length; k++) { re[k + 1] = T.h[k] * Math.sin(T.ph[k] || 0); im[k + 1] = T.h[k] * Math.cos(T.ph[k] || 0); }
    return (m[key] = a.createPeriodicWave(re, im));
  }
  function osc(a, freq, timbre) {
    const o = a.createOscillator();
    if (timbre && timbre !== 'fork' && PS.TIMBRES[timbre]) o.setPeriodicWave(periodicWave(a, timbre));
    else if (timbre && /^(sine|square|sawtooth|triangle)$/.test(timbre)) o.type = timbre;
    o.frequency.value = freq;
    return o;
  }
  function addVibrato(a, o, freq, depth) {
    const lfo = a.createOscillator(), lg = a.createGain();
    lfo.frequency.value = 5.5; lg.gain.value = freq * (depth || 0.006);
    lfo.connect(lg).connect(o.frequency);
    lfo.start();
    return lfo;
  }

  /**
   * 单音（乐器音符）。opts：timbre、dur（秒）、gain、attack、when
   * 有 decay 的音色（钢琴）按指数衰减，其他音色保持后渐弱。
   */
  A.note = function (freq, opts) {
    opts = opts || {};
    const out = A.out();
    if (!out) return null;
    const a = out.context;
    const T = PS.TIMBRES[opts.timbre] || {};
    const t0 = a.currentTime + (opts.when || 0), dur = opts.dur || 1.2, g0 = opts.gain == null ? 0.25 : opts.gain;
    const o = osc(a, freq, opts.timbre), g = a.createGain();
    const atk = opts.attack || (opts.timbre === 'violin' ? 0.08 : opts.timbre === 'flute' ? 0.06 : 0.008);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(g0, t0 + atk);
    if (T.decay) g.gain.setTargetAtTime(0.0001, t0 + atk, T.decay / 4);
    else { g.gain.setValueAtTime(g0, t0 + Math.max(atk, dur - 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
    let lfo = null;
    if (T.vibrato) lfo = addVibrato(a, o, freq);
    o.connect(g).connect(out);
    o.start(t0); o.stop(t0 + dur + 0.05);
    if (lfo) lfo.stop(t0 + dur + 0.05);
    // 长笛加一点气声
    if (opts.timbre === 'flute') A.noise({ dur: dur, gain: g0 * 0.05, filter: { type: 'bandpass', freq: freq * 2, Q: 1.5 }, when: opts.when });
    return { stop() { try { g.gain.cancelScheduledValues(a.currentTime); g.gain.setTargetAtTime(0.0001, a.currentTime, 0.01); o.stop(a.currentTime + 0.08); } catch (e) { /* 已停止 */ } } };
  };

  /**
   * 持续音（信号发生器）。返回 { setFreq, setGain, setTimbre, stop }
   */
  A.voice = function (opts) {
    opts = opts || {};
    const out = A.out();
    if (!out) return null;
    const a = out.context;
    let freq = opts.freq || 440, timbre = opts.timbre || 'fork', o = null, lfo = null;
    const g = a.createGain();
    g.gain.value = 0.0001;
    g.connect(out);
    function build() {
      const old = o, oldL = lfo;
      o = osc(a, freq, timbre);
      lfo = PS.TIMBRES[timbre] && PS.TIMBRES[timbre].vibrato ? addVibrato(a, o, freq) : null;
      o.connect(g); o.start();
      if (old) { try { old.stop(a.currentTime + 0.02); } catch (e) { /* 忽略 */ } }
      if (oldL) { try { oldL.stop(a.currentTime + 0.02); } catch (e) { /* 忽略 */ } }
    }
    build();
    g.gain.setTargetAtTime(opts.gain == null ? 0.2 : opts.gain, a.currentTime, 0.03);
    return {
      setFreq(f) { freq = f; o.frequency.setTargetAtTime(f, a.currentTime, 0.02); },
      setGain(v) { g.gain.setTargetAtTime(Math.max(0.0001, v), a.currentTime, 0.03); },
      setTimbre(k) { if (k !== timbre) { timbre = k; build(); } },
      stop() { g.gain.setTargetAtTime(0.0001, a.currentTime, 0.03); const oo = o, ll = lfo; setTimeout(() => { try { oo.stop(); if (ll) ll.stop(); g.disconnect(); } catch (e) { /* 忽略 */ } }, 250); },
    };
  };

  /**
   * 敲击 / 拨动类声音：若干分音各自指数衰减。
   * parts：[[频率倍数, 振幅, 衰减时间常数 s], ...]；opts：gain、click（敲击瞬间的噪声）
   * 返回 { stop() }：用手按住发声体时立即止声
   */
  A.strike = function (freq, parts, opts) {
    opts = opts || {};
    const out = A.out();
    if (!out) return null;
    const a = out.context;
    const t0 = a.currentTime + (opts.when || 0), g0 = opts.gain == null ? 0.3 : opts.gain;
    const bus = a.createGain();
    bus.gain.value = 1;
    bus.connect(out);
    const oscs = [];
    let tmax = 0;
    parts.forEach(([r, amp, tau]) => {
      const f = freq * r;
      if (f > 18000) return;
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, g0 * amp), t0 + 0.004);
      g.gain.setTargetAtTime(0.0001, t0 + 0.004, tau);
      o.connect(g).connect(bus);
      o.start(t0); o.stop(t0 + tau * 6 + 0.1);
      oscs.push(o);
      tmax = Math.max(tmax, tau * 6);
    });
    if (opts.click) A.noise({ dur: 0.04, gain: g0 * opts.click, filter: { type: 'highpass', freq: 1500 }, when: opts.when, dest: bus });
    return {
      duration: tmax,
      stop() {
        try { bus.gain.cancelScheduledValues(a.currentTime); bus.gain.setTargetAtTime(0.0001, a.currentTime, 0.008); oscs.forEach((o) => o.stop(a.currentTime + 0.06)); } catch (e) { /* 已停止 */ }
      },
      setGain(v) { bus.gain.setTargetAtTime(Math.max(0.0001, v), a.currentTime, 0.02); },
    };
  };

  const noiseBufs = new WeakMap();
  function noiseBuffer(a) {
    let b = noiseBufs.get(a);
    if (b) return b;
    const len = a.sampleRate * 2;
    b = a.createBuffer(1, len, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(a, b);
    return b;
  }
  /**
   * 噪声。opts：dur（省略则循环播放）、gain、filter {type, freq, Q}、when、dest
   * 返回 { gain(AudioParam 节点), stop() }
   */
  A.noise = function (opts) {
    opts = opts || {};
    const out = A.out();
    if (!out) return null;
    const a = out.context;
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(a);
    src.loop = true;
    const g = a.createGain();
    const t0 = a.currentTime + (opts.when || 0), g0 = opts.gain == null ? 0.1 : opts.gain;
    let node = src;
    if (opts.filter) {
      const f = a.createBiquadFilter();
      f.type = opts.filter.type || 'bandpass';
      f.frequency.value = opts.filter.freq || 1000;
      if (opts.filter.Q) f.Q.value = opts.filter.Q;
      node.connect(f); node = f;
    }
    node.connect(g).connect(opts.dest || out);
    if (opts.dur) {
      g.gain.setValueAtTime(g0, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
      src.start(t0, Math.random()); src.stop(t0 + opts.dur + 0.05);
    } else {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.setTargetAtTime(g0, t0, 0.05);
      src.start(t0, Math.random());
    }
    return {
      node: g,
      setGain(v) { g.gain.setTargetAtTime(Math.max(0.0001, v), a.currentTime, 0.05); },
      stop() { g.gain.setTargetAtTime(0.0001, a.currentTime, 0.03); setTimeout(() => { try { src.stop(); } catch (e) { /* 忽略 */ } }, 300); },
    };
  };

  /** 循环播放的声音缓冲区（电铃、闹钟等），返回 { setGain, stop } */
  function loopBuffer(buf, g0) {
    const out = A.out();
    if (!out) return null;
    const a = out.context;
    const src = a.createBufferSource();
    src.buffer = buf; src.loop = true;
    const g = a.createGain();
    g.gain.value = 0.0001;
    src.connect(g).connect(out);
    src.start();
    g.gain.setTargetAtTime(g0 == null ? 0.2 : g0, a.currentTime, 0.03);
    return {
      setGain(v) { g.gain.setTargetAtTime(Math.max(0.0001, v), a.currentTime, 0.06); },
      stop() { g.gain.setTargetAtTime(0.0001, a.currentTime, 0.02); setTimeout(() => { try { src.stop(); } catch (e) { /* 忽略 */ } }, 200); },
    };
  }
  /** 生成一段可循环的“敲击”声：rate 次/秒，每次敲击由若干衰减的分音组成 */
  function strikeLoop(a, sec, rate, f0, parts, jitter) {
    const sr = a.sampleRate, len = Math.floor(sr * sec);
    const buf = a.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const n = Math.round(sec * rate);
    for (let k = 0; k < n; k++) {
      const s0 = Math.floor((k * len) / n);
      const amp = 1 - (jitter || 0) * Math.random();
      const tail = Math.floor(sr * 0.25);
      for (let i = 0; i < tail; i++) {
        const t = i / sr;
        let v = 0;
        for (const [r, am, tau] of parts) v += am * Math.exp(-t / tau) * Math.sin(TAU * f0 * r * t);
        d[(s0 + i) % len] += v * amp * 0.35;
      }
    }
    return buf;
  }
  const bellBufs = new WeakMap();
  /** 电铃：小锤每秒敲击铃碗约 16 次 */
  A.bell = function (g0) {
    const a = A.ctx();
    if (!a) return null;
    let b = bellBufs.get(a);
    if (!b) { b = strikeLoop(a, 1, 16, 1180, [[1, 1, 0.09], [2.32, 0.55, 0.05], [4.25, 0.3, 0.03], [6.63, 0.18, 0.02]], 0.15); bellBufs.set(a, b); }
    return loopBuffer(b, g0);
  };
  const clockBufs = new WeakMap();
  /** 闹钟：嘀嘀声 */
  A.alarm = function (g0) {
    const a = A.ctx();
    if (!a) return null;
    let b = clockBufs.get(a);
    if (!b) {
      const sr = a.sampleRate, len = sr;
      b = a.createBuffer(1, len, sr);
      const d = b.getChannelData(0);
      for (let k = 0; k < 4; k++) {
        const s0 = Math.floor(k * sr * 0.12);
        for (let i = 0; i < sr * 0.08; i++) {
          const t = i / sr, env = Math.min(1, i / 80) * Math.min(1, (sr * 0.08 - i) / 200);
          d[s0 + i] += env * 0.4 * (Math.sin(TAU * 2900 * t) + 0.3 * Math.sin(TAU * 5800 * t));
        }
      }
      clockBufs.set(a, b);
    }
    return loopBuffer(b, g0);
  };

  /** 人的喊声“喂——”：锯齿波经过两个共振峰滤波器 */
  A.shout = function (opts) {
    opts = opts || {};
    const out = A.out();
    if (!out) return null;
    const a = out.context;
    const t0 = a.currentTime + (opts.when || 0), dur = opts.dur || 0.45, g0 = opts.gain == null ? 0.35 : opts.gain;
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(opts.f0 || 210, t0);
    o.frequency.linearRampToValueAtTime((opts.f0 || 210) * 0.82, t0 + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(g0, t0 + 0.04);
    g.gain.setValueAtTime(g0, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    [[750, 6, 1], [1150, 8, 0.6], [2600, 10, 0.25]].forEach(([f, q, m]) => {
      const bp = a.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const gg = a.createGain(); gg.gain.value = m * 2.2;
      o.connect(bp).connect(gg).connect(g);
    });
    g.connect(out);
    o.start(t0); o.stop(t0 + dur + 0.05);
  };

  /** 元素离开视口时调用 fn（用于自动停止持续的声音） */
  A.whenHidden = function (el, fn) {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver((es) => { if (!es[es.length - 1].isIntersecting) fn(); }).observe(el);
  };
  document.addEventListener('visibilitychange', () => {
    const a = master && master.context;
    if (!a) return;
    if (document.hidden) a.suspend(); else a.resume();
  });

  /* 页面右下角的声音开关 */
  function upd(b) {
    b.innerHTML = muted ? '🔇 声音已关' : '🔊 声音已开';
    b.classList.toggle('off', muted);
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!PS.$('[data-widget]') && !PS.$('#labSide')) return;
    const b = h('button', { type: 'button', class: 'snd-toggle', title: '打开 / 关闭演示中的声音' });
    b.addEventListener('click', () => A.setMuted(!muted));
    upd(b);
    document.body.append(b);
  });

  /* ---------------- 示波器 ---------------- */
  /**
   * b：{x, y, w, h}；o.traces：[{fn(x∈[0,1]) → y∈[−1,1], color, width, dash, alpha}]
   * o.label：左上角文字；o.nx / o.ny：网格数；o.scale：纵向占用比例
   */
  PS.scope = function (ctx, b, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = o.bg || '#0d1626';
    D.roundRect(ctx, b.x, b.y, b.w, b.h, o.r == null ? 10 : o.r);
    ctx.fill();
    ctx.beginPath(); D.roundRect(ctx, b.x, b.y, b.w, b.h, o.r == null ? 10 : o.r); ctx.clip();
    const nx = o.nx || 10, ny = o.ny || 8, cy = b.y + b.h / 2;
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
    for (let i = 1; i < nx; i++) { const x = b.x + (i * b.w) / nx; ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); }
    for (let i = 1; i < ny; i++) { const y = b.y + (i * b.h) / ny; ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath(); ctx.moveTo(b.x, cy); ctx.lineTo(b.x + b.w, cy); ctx.stroke();
    const amp = (b.h / 2) * (o.scale || 0.86);
    (o.traces || []).forEach((tr) => {
      ctx.strokeStyle = tr.color || '#69db7c';
      ctx.lineWidth = tr.width || 2;
      ctx.globalAlpha = tr.alpha == null ? 1 : tr.alpha;
      ctx.setLineDash(tr.dash || []);
      ctx.shadowColor = tr.color || '#69db7c';
      ctx.shadowBlur = tr.glow == null ? 4 : tr.glow;
      ctx.beginPath();
      const step = tr.step || 1;
      for (let i = 0; i <= b.w; i += step) {
        const y = cy - PS.clamp(tr.fn(i / b.w), -1.15, 1.15) * amp;
        i ? ctx.lineTo(b.x + i, y) : ctx.moveTo(b.x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });
    if (o.label) {
      ctx.font = PS.font(o.labelSize || 12, 700);
      ctx.fillStyle = o.labelColor || '#c5d3ea';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(o.label, b.x + 10, b.y + 8);
    }
    if (o.note) {
      ctx.font = PS.font(11, 500);
      ctx.fillStyle = '#8ea0bd';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(o.note, b.x + b.w - 10, b.y + b.h - 6);
    }
    ctx.restore();
  };

  /* ---------------- 器材绘制 ---------------- */
  /**
   * 音叉（竖直）：(x, y) 为手柄底端，s 为叉臂长度，disp 为叉臂顶端向外的位移（像素）
   * 返回两叉臂顶端外侧的坐标 { lx, rx, top, mid }
   */
  PS.drawFork = function (ctx, x, y, s, disp, o) {
    o = o || {};
    const pw = s * 0.11, gap = s * 0.2, hl = s * 0.42, base = y - hl;
    const top = base - s;
    const g = ctx.createLinearGradient(x - gap, 0, x + gap + pw, 0);
    g.addColorStop(0, '#868e96'); g.addColorStop(0.35, '#e9ecef'); g.addColorStop(0.6, '#adb5bd'); g.addColorStop(1, '#6c757d');
    ctx.save();
    ctx.fillStyle = g; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1;
    // 手柄
    D.roundRect(ctx, x - pw * 0.55, base - 2, pw * 1.1, hl + 2, pw * 0.4); ctx.fill(); ctx.stroke();
    // U 形底
    ctx.beginPath();
    ctx.arc(x, base - pw * 0.2, gap / 2 + pw, 0, Math.PI);
    ctx.arc(x, base - pw * 0.2, gap / 2, Math.PI, 0, true);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 两叉臂（顶端位移按二次曲线分布）
    const prong = (side) => {
      const x0 = x + side * (gap / 2 + pw / 2);
      ctx.beginPath();
      const N = 12;
      for (let i = 0; i <= N; i++) {
        const k = i / N, yy = base - pw * 0.2 - k * (s - pw * 0.2), dx = side * disp * k * k;
        const xx = x0 + dx - pw / 2;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      for (let i = N; i >= 0; i--) {
        const k = i / N, yy = base - pw * 0.2 - k * (s - pw * 0.2), dx = side * disp * k * k;
        ctx.lineTo(x0 + dx + pw / 2, yy);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    };
    prong(-1); prong(1);
    if (o.label !== false && o.freqLabel) {
      ctx.fillStyle = '#343a40'; ctx.font = PS.font(Math.max(10, s * 0.09), 700); ctx.textAlign = 'center';
      ctx.save(); ctx.translate(x, y - hl * 0.45); ctx.rotate(-Math.PI / 2); ctx.fillText(o.freqLabel, 0, 4); ctx.restore();
    }
    ctx.restore();
    return { lx: x - gap / 2 - pw - disp, rx: x + gap / 2 + pw + disp, top, mid: base - s * 0.5 };
  };

  /** 扬声器（侧视，朝右）：(x, y) 为纸盆中心，s 为尺寸，push 为纸盆前后位移（像素） */
  PS.drawSpeaker = function (ctx, x, y, s, push, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = o.box || '#343a40';
    D.roundRect(ctx, x - s * 0.62, y - s * 0.62, s * 0.5, s * 1.24, s * 0.08); ctx.fill();
    ctx.fillStyle = '#212529';
    ctx.fillRect(x - s * 0.14, y - s * 0.5, s * 0.06, s);
    const cx = x - s * 0.08 + (push || 0);
    const g = ctx.createLinearGradient(x - s * 0.1, 0, x + s * 0.2, 0);
    g.addColorStop(0, '#495057'); g.addColorStop(1, '#adb5bd');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, y - s * 0.12);
    ctx.lineTo(cx + s * 0.16, y - s * 0.48);
    ctx.lineTo(cx + s * 0.16, y + s * 0.48);
    ctx.lineTo(x - s * 0.1, y + s * 0.12);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#212529';
    ctx.beginPath(); ctx.ellipse(cx + s * 0.03, y, s * 0.05, s * 0.12, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /** 响度条（HTML）：set(比例 0~1, 文字) */
  PS.levelMeter = function (label) {
    const fill = h('i');
    const val = h('b', null, '—');
    const el = h('div', { class: 'lvl' }, h('span', { class: 'lvl-l', html: label || '响度' }), h('div', { class: 'lvl-bar' }, fill), val);
    return {
      el,
      set(frac, text) {
        frac = PS.clamp(frac || 0, 0, 1);
        fill.style.width = (frac * 100).toFixed(1) + '%';
        fill.style.background = frac > 0.8 ? 'var(--red)' : frac > 0.55 ? 'var(--accent)' : 'var(--green)';
        val.innerHTML = text == null ? '' : text;
      },
    };
  };

  document.head.append(h('style', null, `
    .snd-toggle{position:fixed;right:16px;bottom:16px;z-index:90;font:inherit;font-size:.85rem;font-weight:700;padding:7px 14px;border-radius:999px;border:1px solid var(--line-2);background:rgba(255,255,255,.95);color:var(--ink-2);box-shadow:var(--shadow);cursor:pointer}
    .snd-toggle:hover{border-color:var(--primary);color:var(--primary)}
    .snd-toggle.off{background:var(--red-soft);color:var(--red);border-color:#ffc9c9}
    .lvl{display:flex;align-items:center;gap:10px;font-size:.9rem}
    .lvl-l{font-weight:700;color:var(--ink-2);white-space:nowrap}
    .lvl-bar{flex:1;min-width:80px;height:12px;border-radius:999px;background:var(--line);overflow:hidden}
    .lvl-bar i{display:block;height:100%;width:0;border-radius:999px;transition:width .12s linear,background .3s}
    .lvl b{min-width:70px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
    @media (max-width:720px){.snd-toggle{right:10px;bottom:10px;padding:5px 11px}}
  `));
})();
