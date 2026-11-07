/*
 * 看得见的物理 · 公共脚本
 * 提供：DOM 工具、数学工具、画布舞台、动画循环、组件注册、控件、随堂练习、音效、绘图工具
 * 所有页面都以普通 <script> 方式加载（不依赖模块），双击本地 HTML 也能运行。
 */
(function () {
  'use strict';
  const PS = (window.PS = window.PS || {});

  /* ---------------- DOM ---------------- */
  PS.$ = (s, r) => (r || document).querySelector(s);
  PS.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  PS.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  /* ---------------- 数学 ---------------- */
  PS.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  PS.lerp = (a, b, t) => a + (b - a) * t;
  PS.rand = (a, b) => a + Math.random() * (b - a);
  PS.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  PS.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  PS.round = (x, d = 0) => {
    const p = Math.pow(10, d);
    return Math.round((x + Number.EPSILON) * p) / p;
  };
  PS.fmt = (x, d = 2) => {
    const v = PS.round(x, d);
    return (Object.is(v, -0) || Math.abs(v) < 1e-12 ? 0 : v).toFixed(d);
  };
  PS.gauss = () => {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const MINUS = '−';
  /** 科学记数法（HTML） */
  PS.sci = function (x, sig = 3) {
    if (x === 0) return '0';
    let e = Math.floor(Math.log10(Math.abs(x)));
    let m = parseFloat((x / Math.pow(10, e)).toPrecision(sig));
    if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    const es = (e < 0 ? MINUS : '') + Math.abs(e);
    if (m === 1) return '10<sup>' + es + '</sup>';
    if (m === -1) return MINUS + '10<sup>' + es + '</sup>';
    return String(m).replace('-', MINUS) + ' × 10<sup>' + es + '</sup>';
  };
  /** 合适时用普通写法，否则用科学记数法（HTML） */
  PS.pretty = function (x, sig = 4) {
    if (x === 0) return '0';
    const a = Math.abs(x);
    if (a >= 1e-3 && a < 1e6) return String(parseFloat(x.toPrecision(sig))).replace('-', MINUS);
    return PS.sci(x, sig);
  };
  /** 纯文本版本（画布里用） */
  PS.prettyText = function (x, sig = 4) {
    return PS.pretty(x, sig).replace(/<sup>/g, '^').replace(/<\/sup>/g, '');
  };

  /* ---------------- 画布舞台 ---------------- */
  PS.FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC","Hiragino Sans GB",system-ui,sans-serif';
  PS.font = (size, weight) => (weight || 400) + ' ' + size + 'px ' + PS.FONT;

  /**
   * 在 container 里创建一个自适应大小、支持高分屏的画布。
   * opts.ratio：宽高比（如 '16 / 9'）；opts.draw(ctx, w, h)：绘制函数；opts.onResize(S)
   */
  PS.stage = function (container, opts) {
    opts = opts || {};
    const stage = PS.h('div', { class: 'stage' + (opts.cls ? ' ' + opts.cls : '') });
    stage.style.aspectRatio = opts.ratio || '16 / 9';
    if (opts.minHeight) stage.style.minHeight = opts.minHeight + 'px';
    const canvas = PS.h('canvas');
    stage.append(canvas);
    container.append(stage);
    const ctx = canvas.getContext('2d');
    const S = { stage, canvas, ctx, w: 0, h: 0, dpr: 1, draw: opts.draw || null };
    function resize() {
      const r = stage.getBoundingClientRect();
      if (r.width < 40 || r.height < 20) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w === S.w && h === S.h && dpr === S.dpr) return;
      S.w = w; S.h = h; S.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (opts.onResize) opts.onResize(S);
      S.render();
    }
    S.render = function () {
      if (!S.draw || !S.w) return;
      ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      S.draw(ctx, S.w, S.h);
    };
    S.pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
    // 首次绘制放到下一帧，保证组件内部变量都已初始化
    requestAnimationFrame(resize);
    return S;
  };

  /** 动画循环：fn(dt, t)。元素不在视口内时自动暂停计算。 */
  PS.loop = function (fn, el) {
    let raf = 0, last = 0, running = false, visible = true;
    const L = { t: 0 };
    function frame(now) {
      raf = 0;
      if (!running) return;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      if (visible && !document.hidden) { L.t += dt; fn(dt, L.t); }
      raf = requestAnimationFrame(frame);
    }
    L.start = () => { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
    L.stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
    Object.defineProperty(L, 'running', { get: () => running });
    if (el && 'IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; }).observe(el);
    }
    return L;
  };

  /* ---------------- 组件注册 ---------------- */
  PS.widgets = {};
  PS.register = (name, mount) => { PS.widgets[name] = mount; };
  PS.mount = function (name, el, opts) {
    const m = PS.widgets[name];
    if (!m) {
      el.append(PS.h('div', { class: 'tip tip-warn' }, '组件未加载：' + name));
      return null;
    }
    try {
      return m(el, opts || {});
    } catch (err) {
      console.error(err);
      el.append(PS.h('div', { class: 'tip tip-warn' }, '组件运行出错：' + err.message));
      return null;
    }
  };

  /* ---------------- 控件 ---------------- */
  PS.ui = {
    button(label, onClick, cls) {
      return PS.h('button', { class: cls || 'btn', type: 'button', onclick: onClick, html: label });
    },
    /** 滑块：返回 { el, input, value, set(v) } */
    slider(o) {
      const fmt = o.fmt || ((v) => v);
      const out = PS.h('output', { class: 'slider-val' });
      const input = PS.h('input', { type: 'range', min: o.min, max: o.max, step: o.step || 1, value: o.value });
      const el = PS.h('label', { class: 'slider' + (o.cls ? ' ' + o.cls : '') },
        PS.h('span', { class: 'slider-label', html: o.label }), input, out);
      const api = {
        el, input,
        get value() { return parseFloat(input.value); },
        set(v, silent) { input.value = v; out.innerHTML = fmt(parseFloat(input.value)) + (o.unit ? ' ' + o.unit : ''); if (!silent && o.onInput) o.onInput(parseFloat(input.value)); },
        disable(b) { input.disabled = !!b; el.classList.toggle('disabled', !!b); },
      };
      input.addEventListener('input', () => api.set(input.value));
      api.set(o.value, true);
      return api;
    },
    /** 分段选择：options = [{value, label}] */
    seg(options, value, onChange, cls) {
      const el = PS.h('div', { class: 'seg' + (cls ? ' ' + cls : ''), role: 'group' });
      const api = { el, value };
      const btns = options.map((o) => {
        const b = PS.h('button', { type: 'button', html: o.label, title: o.title || null });
        b.addEventListener('click', () => { api.set(o.value); });
        b._v = o.value;
        el.append(b);
        return b;
      });
      api.set = (v, silent) => {
        api.value = v;
        btns.forEach((b) => b.classList.toggle('on', b._v === v));
        if (!silent && onChange) onChange(v);
      };
      api.set(value, true);
      return api;
    },
    toggle(label, checked, onChange) {
      const input = PS.h('input', { type: 'checkbox' });
      input.checked = !!checked;
      input.addEventListener('change', () => onChange && onChange(input.checked));
      const el = PS.h('label', { class: 'toggle' }, input, PS.h('span', { class: 'toggle-ui' }), PS.h('span', { html: label }));
      return { el, input, get value() { return input.checked; }, set(v) { input.checked = !!v; } };
    },
    row(...kids) { return PS.h('div', { class: 'controls' }, ...kids); },
    readout(label, value, cls) {
      const v = PS.h('b', { html: value == null ? '—' : value });
      const el = PS.h('div', { class: 'readout' + (cls ? ' ' + cls : '') }, PS.h('span', { html: label }), v);
      return { el, set(html) { v.innerHTML = html; } };
    },
  };

  PS.toast = function (msg, type) {
    let box = PS.$('.toast-box');
    if (!box) { box = PS.h('div', { class: 'toast-box' }); document.body.append(box); }
    const t = PS.h('div', { class: 'toast' + (type ? ' toast-' + type : ''), html: msg });
    box.append(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  };

  /* ---------------- 音效 ---------------- */
  PS.sound = (function () {
    let ac = null;
    let enabled = true;
    function ctx() {
      if (!enabled) return null;
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ac = new AC();
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(freq, dur, type, vol, when) {
      const a = ctx();
      if (!a) return;
      const t0 = a.currentTime + (when || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(a.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    }
    return {
      setEnabled(b) { enabled = b; },
      get enabled() { return enabled; },
      /** 取得共享的 AudioContext（音效关闭或浏览器不支持时为 null），供声学组件合成声音 */
      ctx,
      /** 金属片被撞击的“咔哒”声 */
      clack() {
        const a = ctx();
        if (!a) return;
        const len = Math.floor(a.sampleRate * 0.08);
        const buf = a.createBuffer(1, len, a.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
        const src = a.createBufferSource();
        src.buffer = buf;
        const f = a.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 1.2;
        const g = a.createGain(); g.gain.value = 0.9;
        src.connect(f).connect(g).connect(a.destination);
        src.start();
        tone(1900, 0.12, 'triangle', 0.08);
      },
      beep(f, d) { tone(f || 880, d || 0.12, 'sine', 0.15); },
      tick() { tone(2400, 0.03, 'square', 0.04); },
      good() { tone(660, 0.1, 'sine', 0.12); tone(990, 0.16, 'sine', 0.12, 0.09); },
      bad() { tone(220, 0.18, 'sawtooth', 0.06); },
      ping() { tone(1400, 0.25, 'sine', 0.1); },
    };
  })();

  /* ---------------- 绘图工具 ---------------- */
  PS.draw = {
    roundRect(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },
    arrow(ctx, x1, y1, x2, y2, o) {
      o = o || {};
      const head = o.head || 9, ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = o.color || '#1b2333';
      ctx.lineWidth = o.width || 2;
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(ang - 0.42), y2 - head * Math.sin(ang - 0.42));
      ctx.lineTo(x2 - head * Math.cos(ang + 0.42), y2 - head * Math.sin(ang + 0.42));
      ctx.closePath();
      ctx.fill();
      if (o.both) {
        const b = ang + Math.PI;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - head * Math.cos(b - 0.42), y1 - head * Math.sin(b - 0.42));
        ctx.lineTo(x1 - head * Math.cos(b + 0.42), y1 - head * Math.sin(b + 0.42));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
    /** 尺寸标注线：两端短竖线 + 双箭头 + 文字 */
    dim(ctx, x1, x2, y, label, o) {
      o = o || {};
      const c = o.color || '#3b5bdb';
      ctx.save();
      ctx.strokeStyle = c; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x1, y - 7); ctx.lineTo(x1, y + 7);
      ctx.moveTo(x2, y - 7); ctx.lineTo(x2, y + 7);
      ctx.stroke();
      if (Math.abs(x2 - x1) > 16) PS.draw.arrow(ctx, (x1 + x2) / 2, y, x1, y, { color: c, width: 1.2, head: 7 }), PS.draw.arrow(ctx, (x1 + x2) / 2, y, x2, y, { color: c, width: 1.2, head: 7 });
      if (label) {
        ctx.font = PS.font(o.size || 13, 600);
        ctx.textAlign = 'center'; ctx.textBaseline = o.below ? 'top' : 'bottom';
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = o.bg || 'rgba(255,255,255,.9)';
        const ty = o.below ? y + 6 : y - 6;
        ctx.fillRect((x1 + x2) / 2 - tw / 2 - 4, o.below ? ty - 1 : ty - (o.size || 13) - 3, tw + 8, (o.size || 13) + 4);
        ctx.fillStyle = c;
        ctx.fillText(label, (x1 + x2) / 2, ty);
      }
      ctx.restore();
    },
    /**
     * 画刻度尺（局部坐标）。x,y 为“0 刻度线”与刻度边的交点。
     * o.len：量程（cm）  o.ppc：每厘米像素  o.div：'mm' | 'cm'  o.h：尺宽像素
     * o.side：'top'（刻度在上边，尺身向下）或 'bottom'（刻度在下边，尺身向上）
     * o.start：0 刻度处显示的数（零刻度磨损时可用）  o.color：尺身颜色  o.angle：旋转
     */
    ruler(ctx, o) {
      const len = o.len || 10, ppc = o.ppc || 40, h = o.h || Math.max(34, ppc * 0.75);
      const side = o.side || 'top', sgn = side === 'top' ? 1 : -1;
      const padL = o.padL != null ? o.padL : Math.max(10, ppc * 0.3), padR = o.padR != null ? o.padR : Math.max(28, ppc * 0.45);
      const start = o.start || 0;
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.angle) ctx.rotate(o.angle);
      // 尺身
      ctx.fillStyle = o.color || 'rgba(255, 236, 170, 0.96)';
      ctx.strokeStyle = 'rgba(120, 90, 20, 0.55)';
      ctx.lineWidth = 1;
      const top = sgn > 0 ? 0 : -h;
      PS.draw.roundRect(ctx, -padL, top, len * ppc + padL + padR, h, 4);
      ctx.fill();
      ctx.stroke();
      // 刻度
      ctx.strokeStyle = '#2a2414';
      ctx.fillStyle = '#2a2414';
      const mm = o.div !== 'cm';
      const n = mm ? len * 10 : len;
      const step = mm ? ppc / 10 : ppc;
      const skipWorn = o.worn || 0; // 磨损的前几毫米不画
      for (let i = 0; i <= n; i++) {
        if (mm && i < skipWorn) continue;
        const x = i * step;
        let tl;
        if (mm) tl = i % 10 === 0 ? h * 0.42 : i % 5 === 0 ? h * 0.3 : h * 0.18;
        else tl = h * 0.42;
        ctx.lineWidth = mm && i % 10 !== 0 ? 0.8 : 1.1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, sgn * tl);
        ctx.stroke();
        if (!mm && o.halfTicks !== false && i < n) {
          // 厘米尺：画半厘米的小刻度
        }
      }
      // 数字
      const fs = Math.max(9, Math.min(15, ppc * 0.32));
      ctx.font = PS.font(fs, 600);
      ctx.textAlign = 'center';
      ctx.textBaseline = sgn > 0 ? 'top' : 'bottom';
      const every = ppc < 22 ? (ppc < 12 ? 5 : 2) : 1;
      for (let c = 0; c <= len; c += every) {
        if (mm && c * 10 < skipWorn) continue;
        ctx.fillText(String(c + start), c * ppc, sgn * (h * 0.46 + 2));
      }
      if (o.unitLabel !== false) {
        ctx.font = PS.font(Math.max(9, fs * 0.8), 500);
        ctx.textAlign = 'left';
        ctx.fillText('cm', len * ppc + fs * 0.75 + 3, sgn * (h * 0.46 + 2));
      }
      ctx.restore();
    },
    /** 在画布上写多行文字 */
    text(ctx, str, x, y, o) {
      o = o || {};
      ctx.save();
      ctx.font = PS.font(o.size || 14, o.weight || 500);
      ctx.fillStyle = o.color || '#1b2333';
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'alphabetic';
      if (o.bg) {
        const w = ctx.measureText(str).width, s = o.size || 14;
        let bx = x;
        if (ctx.textAlign === 'center') bx = x - w / 2;
        else if (ctx.textAlign === 'right') bx = x - w;
        let by = y - s;
        if (ctx.textBaseline === 'middle') by = y - s / 2 - 2;
        else if (ctx.textBaseline === 'top') by = y - 2;
        ctx.fillStyle = o.bg;
        PS.draw.roundRect(ctx, bx - 6, by - 3, w + 12, s + 8, 6);
        ctx.fill();
        ctx.fillStyle = o.color || '#1b2333';
      }
      ctx.fillText(str, x, y);
      ctx.restore();
    },
  };

  /** 让画布按 VW×VH 的虚拟坐标绘制；返回把“屏幕像素字号”换成虚拟字号的函数 F(px, 最小px) */
  PS.virtual = function (ctx, w, hh, VW, VH) {
    const k = w / VW;
    ctx.scale(k, hh / VH);
    return (px, min) => Math.max(min || 11, px * k) / k;
  };

  /* ---------------- 画布拖动、手柄、卡片分类（第4章起使用，原在 optics.js） ---------------- */
  (function () {
    const h = PS.h, D = PS.draw, TAU = Math.PI * 2;
    /**
     * 画布拖动（按虚拟坐标）：o.VW / o.VH 虚拟尺寸；o.hit(p) 返回被拖动的对象或 null；
     * o.move(obj, p) 拖动中；o.end(obj) 松开；o.click(p) 没有命中时点击；o.hover(p) 返回 true 时显示手形光标
     */
    PS.drag = function (S, o) {
      let cur = null;
      const cv = S.canvas;
      cv.style.touchAction = 'none';
      const vp = (e) => { const p = S.pos(e); return { x: (p.x * o.VW) / S.w, y: (p.y * o.VH) / S.h }; };
      cv.addEventListener('pointerdown', (e) => {
        const p = vp(e);
        cur = o.hit(p);
        if (cur != null) { cv.setPointerCapture(e.pointerId); e.preventDefault(); if (o.start) o.start(cur, p); }
        else if (o.click) o.click(p);
      });
      cv.addEventListener('pointermove', (e) => {
        const p = vp(e);
        if (cur != null) { o.move(cur, p); e.preventDefault(); }
        else cv.style.cursor = o.hit(p) != null || (o.hover && o.hover(p)) ? 'grab' : '';
      });
      const up = () => { if (cur != null && o.end) o.end(cur); cur = null; };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      return { get active() { return cur; } };
    };

    /** 画一个可拖动的手柄（圆点） */
    PS.handle = function (ctx, x, y, r, color, label, F) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = color || '#3b5bdb'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, y, r || 9, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = color || '#3b5bdb';
      ctx.beginPath(); ctx.arc(x, y, (r || 9) * 0.4, 0, TAU); ctx.fill();
      if (label) D.text(ctx, label, x, y - (r || 9) - 6, { size: F ? F(12) : 12, weight: 700, color: color || '#3b5bdb', align: 'center' });
      ctx.restore();
    };

    /**
     * 卡片分类练习：items = [[文字, 类别下标, 解析], ...]；cats = ['镜面反射', '漫反射']（或 [{label, cls}]）
     */
    PS.sortCards = function (el, items, cats, o) {
      o = o || {};
      const names = cats.map((c) => (typeof c === 'string' ? c : c.label));
      const score = h('div', { class: 'quiz-score' });
      const grid = h('div', { class: 'us-grid opt-sort' });
      let ok = 0, done = 0;
      function build() {
        ok = 0; done = 0; grid.innerHTML = '';
        items.slice().sort(() => Math.random() - 0.5).forEach(([t, k, why]) => {
          const card = h('div', { class: 'us-card' }, h('p', { html: t }));
          const res = h('small');
          const pick = (g) => {
            if (card.classList.contains('done')) return;
            card.classList.add('done', g === k ? 'ok' : 'bad');
            done++; if (g === k) ok++;
            res.innerHTML = (g === k ? '✔ ' : '✘ ') + '<b>' + names[k] + '</b>' + (why ? '：' + why : '');
            g === k ? PS.sound.good() : PS.sound.bad();
            upd();
          };
          card.append(h('div', { class: 'us-btns' }, names.map((n, i) => PS.ui.button(n, () => pick(i), 'btn btn-sm'))), res);
          grid.append(card);
        });
        upd();
      }
      function upd() { score.innerHTML = '已判断 <b>' + done + '</b> / ' + items.length + ' · 答对 <b class="ok">' + ok + '</b>' + (done === items.length ? (ok === items.length ? ' · 🎉 全对！' : ' · 再试一次？') : ''); }
      el.append(h('div', { class: 'quiz-head' }, score, PS.ui.button('重新开始', build, 'btn btn-ghost btn-sm')), grid);
      if (!document.getElementById('opt-sort-style')) document.head.append(h('style', { id: 'opt-sort-style' }, '.opt-sort{grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}.opt-sort .us-btns{display:flex;flex-wrap:wrap;gap:6px}'));
      build();
    };
  })();

  /* ---------------- 随堂练习 ---------------- */
  /**
   * questions: [{type:'choice'|'judge'|'fill', q, options, answer, tol, unit, explain}]
   */
  PS.quiz = function (el, questions) {
    el.classList.add('quiz');
    const state = questions.map(() => ({ done: false, ok: false }));
    const score = PS.h('div', { class: 'quiz-score' });
    const list = PS.h('ol', { class: 'quiz-list' });
    const reset = PS.ui.button('重新作答', () => { el.innerHTML = ''; PS.quiz(el, questions); }, 'btn btn-ghost btn-sm');
    el.append(PS.h('div', { class: 'quiz-head' }, score, reset), list);

    function update() {
      const done = state.filter((s) => s.done).length;
      const ok = state.filter((s) => s.ok).length;
      score.innerHTML = '已作答 <b>' + done + '</b> / ' + questions.length + ' · 答对 <b class="ok">' + ok + '</b>' +
        (done === questions.length ? (ok === questions.length ? ' · 🎉 全对，太棒了！' : ' · 看看解析，再试一次吧') : '');
    }

    questions.forEach((q, i) => {
      const li = PS.h('li', { class: 'q' });
      li.append(PS.h('div', { class: 'q-stem', html: q.q }));
      const explain = PS.h('div', { class: 'q-explain', html: (q.explain ? '<b>解析：</b>' + q.explain : '') });
      const mark = (ok) => {
        state[i] = { done: true, ok };
        li.classList.add(ok ? 'is-ok' : 'is-bad');
        explain.classList.add('show');
        ok ? PS.sound.good() : PS.sound.bad();
        update();
      };
      if (q.type === 'choice' || q.type === 'judge') {
        const opts = q.type === 'judge' ? ['正确', '错误'] : q.options;
        const ans = q.type === 'judge' ? (q.answer ? 0 : 1) : q.answer;
        const box = PS.h('div', { class: 'q-options' + (q.cols ? ' cols-' + q.cols : '') });
        opts.forEach((o, k) => {
          const b = PS.h('button', { type: 'button', class: 'q-opt', html: (q.type === 'judge' ? '' : '<span class="q-letter">' + 'ABCDEFG'[k] + '</span>') + o });
          b.addEventListener('click', () => {
            if (state[i].done) return;
            box.querySelectorAll('.q-opt').forEach((x, j) => {
              x.disabled = true;
              if (j === ans) x.classList.add('right');
            });
            if (k !== ans) b.classList.add('wrong');
            mark(k === ans);
          });
          box.append(b);
        });
        li.append(box);
      } else if (q.type === 'fill') {
        const input = PS.h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', placeholder: '填写答案', autocomplete: 'off' });
        const btn = PS.ui.button('提交', null, 'btn btn-primary btn-sm');
        const fb = PS.h('span', { class: 'q-fb' });
        const submit = () => {
          if (state[i].done) return;
          const raw = input.value.trim();
          if (!raw) { input.focus(); return; }
          let ok = false;
          const answers = Array.isArray(q.answer) ? q.answer : [q.answer];
          for (const a of answers) {
            if (typeof a === 'number') {
              const v = parseFloat(raw.replace(/[，,\s]/g, '').replace('−', '-'));
              if (!isNaN(v) && Math.abs(v - a) <= (q.tol != null ? q.tol : 1e-9 + Math.abs(a) * 1e-9)) ok = true;
            } else if (raw.replace(/\s/g, '') === String(a).replace(/\s/g, '')) ok = true;
          }
          input.disabled = true; btn.disabled = true;
          fb.innerHTML = ok ? '✔ 正确' : '✘ 正确答案：' + (q.show || answers[0]) + (q.unit ? ' ' + q.unit : '');
          fb.className = 'q-fb ' + (ok ? 'ok' : 'bad');
          mark(ok);
        };
        btn.addEventListener('click', submit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        li.append(PS.h('div', { class: 'q-fill' }, input, q.unit ? PS.h('span', { class: 'q-unit', html: q.unit }) : null, btn, fb));
      }
      li.append(explain);
      list.append(li);
    });
    update();
  };

  /* ---------------- 页面增强 ---------------- */
  function enhanceFullscreen() {
    PS.$$('.demo[data-fs]').forEach((demo) => {
      let head = PS.$('.demo-head', demo);
      if (!head) return;
      let tools = PS.$('.demo-tools', head);
      if (!tools) { tools = PS.h('div', { class: 'demo-tools' }); head.append(tools); }
      const btn = PS.h('button', { type: 'button', class: 'icon-btn', title: '全屏展示（适合投影）', html: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M4 4h6v2H6v4H4V4zm10 0h6v6h-2V6h-4V4zM4 14h2v4h4v2H4v-6zm14 0h2v6h-6v-2h4v-4z"/></svg>' });
      btn.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (demo.requestFullscreen) demo.requestFullscreen().catch(() => demo.classList.toggle('pseudo-fs'));
        else demo.classList.toggle('pseudo-fs');
      });
      tools.append(btn);
    });
  }

  function enhanceTabs() {
    PS.$$('.tabs').forEach((tabs) => {
      const btns = PS.$$(':scope > .tab-btns > button', tabs);
      const panels = PS.$$(':scope > .tab-panel', tabs);
      const show = (id) => {
        btns.forEach((b) => b.classList.toggle('on', b.dataset.tab === id));
        panels.forEach((p) => p.classList.toggle('on', p.dataset.panel === id));
      };
      btns.forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
      if (btns[0]) show(btns[0].dataset.tab);
    });
  }

  function enhanceToc() {
    const links = PS.$$('.toc a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach((a) => {
      const t = document.getElementById(a.getAttribute('href').slice(1));
      if (t) map.set(t, a);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((a) => a.classList.remove('on'));
          map.get(en.target).classList.add('on');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, t) => io.observe(t));
  }

  /* 已上线的章节：顶栏“章节”下拉菜单由此生成。新增一章时在这里登记。 */
  PS.CHAPTERS = [
    { no: 1, name: '机械运动', dir: 'chapter1', icon: '🚄' },
    { no: 2, name: '声现象', dir: 'chapter2', icon: '🔊' },
    { no: 3, name: '物态变化', dir: 'chapter3', icon: '🌡️' },
    { no: 4, name: '光现象', dir: 'chapter4', icon: '💡' },
    { no: 5, name: '透镜及其应用', dir: 'chapter5', icon: '🔍' },
    { no: 6, name: '质量与密度', dir: 'chapter6', icon: '⚖️' },
    { no: 7, name: '力', dir: 'chapter7', icon: '🏋️' },
    { no: 8, name: '运动和力', dir: 'chapter8', icon: '🛹' },
    { no: 9, name: '压强', dir: 'chapter9', icon: '🏊' },
    { no: 10, name: '浮力', dir: 'chapter10', icon: '🚢' },
    { no: 11, name: '功和机械能', dir: 'chapter11', icon: '🎢' },
    { no: 12, name: '简单机械', dir: 'chapter12', icon: '⚙️' },
    { no: 13, name: '内能', dir: 'chapter13', icon: '🔥' },
    { no: 14, name: '内能的利用', dir: 'chapter14', icon: '🚂' },
    { no: 15, name: '电流和电路', dir: 'chapter15', icon: '🔋' },
    { no: 16, name: '电压 电阻', dir: 'chapter16', icon: '⚡' },
  ];

  function enhanceNav() {
    const t = PS.$('.nav-toggle');
    if (t) t.addEventListener('click', () => PS.$('.topbar').classList.toggle('open'));
    // <nav class="nav" data-root="../" data-ch="2">：在“首页”后插入章节下拉菜单
    const nav = PS.$('.nav[data-root]');
    if (!nav) return;
    const root = nav.dataset.root || '';
    const cur = parseInt(nav.dataset.ch || '0', 10);
    const menu = PS.h('div', { class: 'nav-dd-menu' },
      PS.CHAPTERS.map((c) => PS.h('a', { href: root + c.dir + '/index.html', class: c.no === cur ? 'on' : null },
        PS.h('span', { class: 'dd-ico' }, c.icon), '第' + c.no + '章 ' + c.name)),
      PS.h('span', { class: 'dd-soon' }, '后续章节制作中……'));
    const btn = PS.h('button', { type: 'button', class: 'nav-dd-btn', 'aria-haspopup': 'true', html: '全部章节 <span class="caret">▾</span>' });
    const dd = PS.h('div', { class: 'nav-dd' }, btn, menu);
    btn.addEventListener('click', (e) => { e.stopPropagation(); dd.classList.toggle('open'); });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) dd.classList.remove('open'); });
    const first = nav.querySelector('a');
    if (first) first.after(dd); else nav.prepend(dd);
  }

  function autoMount() {
    PS.$$('[data-widget]').forEach((el) => {
      let opts = {};
      if (el.dataset.opts) { try { opts = JSON.parse(el.dataset.opts); } catch (e) { console.warn(e); } }
      PS.mount(el.dataset.widget, el, opts);
    });
    PS.$$('[data-quiz]').forEach((el) => {
      const qs = (window.QUIZ || {})[el.dataset.quiz];
      if (qs) PS.quiz(el, qs);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceNav();
    enhanceTabs();
    autoMount();
    enhanceFullscreen();
    enhanceToc();
  });
})();
