/*
 * 看得见的物理 · 第12章公共库（简单机械）
 * PS.MC                       配色：支点 O（深灰）、动力 F₁（橙红）、阻力 F₂（蓝）、杠杆（红）、绳子
 * PS.mc.g                     计算题取 10 N/kg
 * PS.mc.fulcrum(ctx, x, y, s, o)   三角形支架（顶点 (x, y) 为支点），o.label 写“O”
 * PS.mc.pin(ctx, x, y, r, o)  转轴（圆点），o.label
 * PS.mc.bar(ctx, x1, y1, x2, y2, o)  杠杆（粗棒）：o.w 粗细、o.c1 / o.c2 颜色、o.holes 孔的位置（距起点的像素）
 * PS.mc.armLen(O, P, ang)     支点 O 到“过 P 点、方向为 ang 的力的作用线”的距离
 * PS.mc.arm(ctx, O, P, ang, o)  力臂作图：虚线画出力的作用线（需要时延长）、从支点作垂线、直角记号、标注 o.label；返回 { foot, l, t }
 * PS.mc.pulley(ctx, x, y, r, o)  滑轮（轮槽、轮辐、轴），o.rot 转角、o.c 颜色
 * PS.mc.strap(ctx, x, y, r, len, dir)  滑轮的挂架（dir = −1 向上、1 向下），返回挂钩处的 y
 * PS.mc.belt(nodes)           绳子绕过滑轮的路径：nodes = [{ x, y, r, s }]（r = 0 为一个点；s = ±1 为绕向：画布中 +1 顺时针绕，three.js 中 +1 逆时针绕）；
 *                             返回 { segs: [[x1, y1, x2, y2]], arcs: [{ x, y, r, a0, d }], len }
 * PS.mc.rope(ctx, path, o)    按 belt 的结果画绳子，o.hl = { 直线段下标: 颜色 }
 * PS.mc.ceiling(ctx, x0, x1, y)  天花板 / 横梁（上方斜线）
 * PS.mc.load(ctx, x, y, w, hh, o)  挂在钩上的重物（挂环顶端在 (x, y)），o.label，返回底部 y
 * PS.mc.hand(ctx, x, y, o)    握住绳子的手（拳头）
 * 3D（调用时才需要 three.js）：PS.mc.mat(c, o)、stand3d(o)、pulley3d(r, o)、rope3d(group)、hooks3d(n, o)、scale3d(o)
 * machine-quiz                杠杆、滑轮、机械效率的计算随机练习（opts.set = 'lever' | 'pulley' | 'eta'）
 * 依赖 core.js、force.js（.fc-* 样式）、energy.js（PS.en.parse）
 */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;
  const TAU = Math.PI * 2;

  PS.MC = { O: '#1b2333', F1: '#e8590c', F2: '#1c7ed6', lever: '#e03131', rope: '#c9a36b', rope2: '#6b5232', G: '#7048e8', ok: '#2b8a3e' };

  const MC = (PS.mc = {});
  MC.g = 10;

  /** 三角形支架：顶点 (x, y) */
  MC.fulcrum = function (ctx, x, y, s, o) {
    s = s || 26; o = o || {};
    ctx.save();
    const g = ctx.createLinearGradient(x - s, 0, x + s, 0);
    g.addColorStop(0, '#868e96'); g.addColorStop(0.5, '#dee2e6'); g.addColorStop(1, '#6c757d');
    ctx.fillStyle = g; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.72, y + s * 1.25); ctx.lineTo(x - s * 0.72, y + s * 1.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PS.MC.O; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill();
    if (o.label) D.text(ctx, o.label, x + (o.lx || -s * 0.95), y + (o.ly || s * 0.55), { size: o.size || 16, weight: 800, color: PS.MC.O, align: 'center', baseline: 'middle' });
    ctx.restore();
  };

  /** 转轴（圆点） */
  MC.pin = function (ctx, x, y, r, o) {
    r = r || 7; o = o || {};
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = PS.MC.O; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PS.MC.O; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, TAU); ctx.fill();
    if (o.label) D.text(ctx, o.label, x + (o.lx != null ? o.lx : -r - 12), y + (o.ly != null ? o.ly : r + 10), { size: o.size || 16, weight: 800, color: PS.MC.O, align: 'center', baseline: 'middle' });
    ctx.restore();
  };

  /** 杠杆（粗棒）：从 (x1, y1) 到 (x2, y2) */
  MC.bar = function (ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const w = o.w || 14, L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.translate(x1, y1); ctx.rotate(a);
    const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
    g.addColorStop(0, o.c1 || '#f0c987'); g.addColorStop(1, o.c2 || '#b9853f');
    ctx.fillStyle = g; ctx.strokeStyle = o.stroke || '#7a5523'; ctx.lineWidth = 1.4;
    D.roundRect(ctx, -(o.pad != null ? o.pad : w * 0.3), -w / 2, L + 2 * (o.pad != null ? o.pad : w * 0.3), w, Math.min(w * 0.4, 6)); ctx.fill(); ctx.stroke();
    if (o.holes) {
      ctx.fillStyle = 'rgba(40,30,20,.55)';
      o.holes.forEach((t) => { ctx.beginPath(); ctx.arc(t, 0, Math.max(1.6, w * 0.16), 0, TAU); ctx.fill(); });
    }
    ctx.restore();
  };

  MC.armLen = (O, P, ang) => Math.abs((O.x - P.x) * Math.sin(ang) - (O.y - P.y) * Math.cos(ang));

  /** 力臂作图 */
  MC.arm = function (ctx, O, P, ang, o) {
    o = o || {};
    const c = o.color || PS.MC.F1, F = o.F || ((v) => v);
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const t = (O.x - P.x) * ux + (O.y - P.y) * uy;
    const foot = { x: P.x + ux * t, y: P.y + uy * t };
    const l = Math.hypot(O.x - foot.x, O.y - foot.y);
    ctx.save();
    if (o.line !== false) {
      const len = o.len || 0, ext = o.ext != null ? o.ext : 34;
      const t0 = Math.min(0, t) - ext, t1 = Math.max(len, t) + ext;
      ctx.setLineDash([8, 6]); ctx.strokeStyle = c; ctx.globalAlpha = 0.75; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(P.x + ux * t0, P.y + uy * t0); ctx.lineTo(P.x + ux * t1, P.y + uy * t1); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    if (l > 3 && o.armLine !== false) {
      const mx = (O.x + foot.x) / 2, my = (O.y + foot.y) / 2;
      D.arrow(ctx, mx, my, O.x, O.y, { color: c, width: 2.2, head: 10 });
      D.arrow(ctx, mx, my, foot.x, foot.y, { color: c, width: 2.2, head: 10 });
      // 直角记号（画在力的作用线靠近箭头的一侧）
      const vx = (O.x - foot.x) / l, vy = (O.y - foot.y) / l, q = Math.min(13, l * 0.35), su = t > 0 ? -1 : 1;
      ctx.strokeStyle = c; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(foot.x + ux * su * q, foot.y + uy * su * q); ctx.lineTo(foot.x + ux * su * q + vx * q, foot.y + uy * su * q + vy * q); ctx.lineTo(foot.x + vx * q, foot.y + vy * q); ctx.stroke();
      if (o.label) {
        const side = o.labelSide || 1, off = o.labelOff || F(16);
        D.text(ctx, o.label, mx - ux * su * off * side, my - uy * su * off * side, { size: o.size || F(16), weight: 800, color: c, align: 'center', baseline: 'middle', bg: 'rgba(255,255,255,.88)' });
      }
    }
    ctx.restore();
    return { foot, l, t };
  };

  /** 滑轮 */
  MC.pulley = function (ctx, x, y, r, o) {
    o = o || {};
    ctx.save();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#f8f9fa'); g.addColorStop(1, o.c || '#a5b1be');
    ctx.fillStyle = g; ctx.strokeStyle = o.hl ? o.hl : '#495057'; ctx.lineWidth = o.hl ? 3.5 : 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(73,80,87,.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r * 0.86, 0, TAU); ctx.stroke();
    const rot = o.rot || 0;
    ctx.strokeStyle = '#6c757d'; ctx.lineWidth = Math.max(1.6, r * 0.09); ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.24, y + Math.sin(a) * r * 0.24); ctx.lineTo(x + Math.cos(a) * r * 0.76, y + Math.sin(a) * r * 0.76); ctx.stroke();
    }
    ctx.fillStyle = '#e8590c'; ctx.beginPath(); ctx.arc(x + Math.cos(rot) * r * 0.62, y + Math.sin(rot) * r * 0.62, Math.max(2.5, r * 0.08), 0, TAU); ctx.fill();
    ctx.fillStyle = '#495057'; ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#dee2e6'; ctx.beginPath(); ctx.arc(x, y, r * 0.08, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /** 滑轮的挂架：从轴 (x, y) 沿 dir（−1 向上，1 向下）伸出 r + len，末端画挂钩；返回末端 y */
  MC.strap = function (ctx, x, y, r, len, dir) {
    const e = y + dir * (r + len), w = Math.max(8, r * 0.42);
    ctx.save();
    ctx.fillStyle = '#868e96'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * 0.32, e); ctx.lineTo(x + w * 0.32, e); ctx.lineTo(x + w / 2, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, e + dir * 6, 6, 0, TAU); ctx.stroke();
    ctx.restore();
    return e + dir * 12;
  };

  /** 绳子绕过一串滑轮（或点）的路径 */
  MC.belt = function (nodes) {
    const segs = [], arcs = [], T = nodes.map(() => [null, null]);
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1];
      const ra = a.r || 0, rb = b.r || 0, sa = a.s || 1, sb = b.s || 1;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), k = sb * rb - sa * ra;
      if (L < 1e-9 || Math.abs(k) > L) return null;
      const ph = Math.atan2(dy, dx) + Math.acos(k / L), nx = Math.cos(ph), ny = Math.sin(ph);
      const p1 = { x: a.x - sa * ra * nx, y: a.y - sa * ra * ny }, p2 = { x: b.x - sb * rb * nx, y: b.y - sb * rb * ny };
      segs.push([p1.x, p1.y, p2.x, p2.y]);
      T[i][1] = p1; T[i + 1][0] = p2;
    }
    let len = segs.reduce((s, q) => s + Math.hypot(q[2] - q[0], q[3] - q[1]), 0);
    for (let i = 1; i < nodes.length - 1; i++) {
      const n = nodes[i];
      if (!n.r) continue;
      const a0 = Math.atan2(T[i][0].y - n.y, T[i][0].x - n.x), a1 = Math.atan2(T[i][1].y - n.y, T[i][1].x - n.x);
      let d = a1 - a0;
      if ((n.s || 1) > 0) { while (d < 0) d += TAU; while (d >= TAU) d -= TAU; } else { while (d > 0) d -= TAU; while (d <= -TAU) d += TAU; }
      arcs.push({ x: n.x, y: n.y, r: n.r, a0, d, i });
      len += Math.abs(d) * n.r;
    }
    return { segs, arcs, len };
  };

  /** 画绳子（双层线条） */
  MC.rope = function (ctx, path, o) {
    if (!path) return;
    o = o || {};
    const w = o.w || 3.4, hl = o.hl || {};
    ctx.save();
    ctx.lineCap = 'round';
    const pass = (outer) => {
      path.arcs.forEach((a) => { ctx.strokeStyle = outer ? PS.MC.rope2 : (o.c || PS.MC.rope); ctx.lineWidth = outer ? w + 2 : w; ctx.beginPath(); ctx.arc(a.x, a.y, a.r, a.a0, a.a0 + a.d, a.d < 0); ctx.stroke(); });
      path.segs.forEach((s, i) => {
        ctx.strokeStyle = outer ? (hl[i] ? hl[i] : PS.MC.rope2) : (hl[i] ? PS.en ? PS.en.light(hl[i], 0.35) : hl[i] : (o.c || PS.MC.rope));
        ctx.lineWidth = outer ? w + (hl[i] ? 4 : 2) : w;
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
      });
    };
    pass(true); pass(false);
    ctx.restore();
  };

  /** 天花板 / 横梁 */
  MC.ceiling = function (ctx, x0, x1, y, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = o.fill || '#e9ecef'; ctx.fillRect(x0, y - 16, x1 - x0, 16);
    ctx.strokeStyle = '#868e96'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.beginPath();
    for (let x = x0 + 4; x < x1; x += 13) { ctx.moveTo(x, y); ctx.lineTo(x + 9, y - 11); }
    ctx.stroke();
    ctx.restore();
  };

  /** 挂在钩上的重物：挂环顶端在 (x, y) */
  MC.load = function (ctx, x, y, w, hh, o) {
    o = o || {};
    ctx.save();
    ctx.strokeStyle = '#495057'; ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(x, y + 6, 6, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, y + 18); ctx.stroke();
    const top = y + 18;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, o.c2 || '#7c8590'); g.addColorStop(0.4, o.c1 || '#e9ecef'); g.addColorStop(1, o.c2 || '#7c8590');
    ctx.fillStyle = g; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1.4;
    D.roundRect(ctx, x - w / 2, top, w, hh, 5); ctx.fill(); ctx.stroke();
    if (o.label) D.text(ctx, o.label, x, top + hh / 2, { size: o.fs || 14, weight: 800, color: '#343a40', align: 'center', baseline: 'middle' });
    ctx.restore();
    return top + hh;
  };

  /** 握住绳子的手（拳头），(x, y) 为绳子穿过的位置 */
  MC.hand = function (ctx, x, y, o) {
    o = o || {};
    const s = o.s || 1;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s); if (o.ang) ctx.rotate(o.ang);
    ctx.fillStyle = '#ffd8a8'; ctx.strokeStyle = '#d9a066'; ctx.lineWidth = 1.5;
    D.roundRect(ctx, -11, -13, 22, 26, 8); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,120,60,.6)'; ctx.lineWidth = 1;
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-9, k * 6); ctx.lineTo(9, k * 6); ctx.stroke(); }
    ctx.restore();
  };

  /* ---------------- 3D 器材（调用时需要 three.js） ---------------- */
  MC.mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c }, o || {}));

  /** 铁架台：底座在 (o.x, 0, o.z)，立杆高 o.H，横杆在 y = o.armY 处沿 +x 伸出 o.arm；返回 { group, end }（横杆末端） */
  MC.stand3d = function (o) {
    o = o || {};
    const g = new THREE.Group(), x = o.x || 0, z = o.z || 0, H = o.H || 0.8, ay = o.armY || H - 0.06, arm = o.arm || 0.3;
    const iron = MC.mat(0x495057, { metalness: 0.5, roughness: 0.45 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.018, 0.16), MC.mat(0x343a40, { metalness: 0.3, roughness: 0.6 }));
    base.position.set(x + 0.06, 0.009, z); g.add(base);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, H, 12), iron); rod.position.set(x, H / 2, z); g.add(rod);
    const boss = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), iron); boss.position.set(x, ay, z); g.add(boss);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, arm, 10), iron); bar.rotation.z = Math.PI / 2; bar.position.set(x + arm / 2, ay, z); g.add(bar);
    return { group: g, end: new THREE.Vector3(x + arm, ay, z), y: ay };
  };

  /** 滑轮（轴沿 z 方向）：rg 为轮槽半径；返回 { group, wheel }（wheel.rotation.z 为转角） */
  MC.pulley3d = function (rg, o) {
    o = o || {};
    const g = new THREE.Group(), R = rg * 1.22, t = Math.max(0.008, rg * 0.42);
    const prof = [[rg * 0.25, -t / 2], [R, -t / 2], [R, -t * 0.32], [rg, 0], [R, t * 0.32], [R, t / 2], [rg * 0.25, t / 2]].map((p) => new THREE.Vector2(p[0], p[1]));
    const wheel = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), MC.mat(o.color || 0xced4da, { metalness: 0.35, roughness: 0.4, side: THREE.DoubleSide }));
    disc.rotation.x = Math.PI / 2; wheel.add(disc);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(R * 0.5, R * 0.12, t * 1.08), MC.mat(0xe8590c)); mark.position.x = R * 0.55; wheel.add(mark);
    g.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(rg * 0.22, rg * 0.22, t * 1.9, 12), MC.mat(0x495057, { metalness: 0.6 })); hub.rotation.x = Math.PI / 2; g.add(hub);
    // 挂架：两侧的夹板（dir = 1 向上伸，−1 向下伸）
    if (o.strap) {
      const dir = o.strap, L = R + (o.len || rg * 1.2), sm = MC.mat(0x868e96, { metalness: 0.5, roughness: 0.4 });
      [-1, 1].forEach((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(rg * 0.5, L, 0.003), sm); p.position.set(0, (dir * L) / 2, s * (t / 2 + 0.003)); g.add(p); });
      const cap = new THREE.Mesh(new THREE.BoxGeometry(rg * 0.5, 0.005, t + 0.009), sm); cap.position.y = dir * L; g.add(cap);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0022, 8, 20), MC.mat(0x495057, { metalness: 0.6 })); hook.position.y = dir * (L + 0.008); g.add(hook);
      g.userData.hookY = dir * (L + 0.016);
    }
    return { group: g, wheel, R };
  };

  /** 绳子：用圆柱表示直线段、圆环的一段表示绕在滑轮上的部分；update(path, z) 按 belt 的结果更新 */
  MC.rope3d = function (parent, o) {
    o = o || {};
    const rad = o.r || 0.0016, m = MC.mat(o.color || 0xc9a36b, { roughness: 0.8 });
    const cyl = [], tor = [], unit = new THREE.CylinderGeometry(rad, rad, 1, 6);
    const up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
    return {
      update(path, z) {
        z = z || 0;
        if (!path) return;
        path.segs.forEach((s, i) => {
          let c = cyl[i];
          if (!c) { c = cyl[i] = new THREE.Mesh(unit, m); parent.add(c); }
          c.visible = true;
          const L = Math.hypot(s[2] - s[0], s[3] - s[1]) || 1e-6;
          c.position.set((s[0] + s[2]) / 2, (s[1] + s[3]) / 2, z);
          v.set((s[2] - s[0]) / L, (s[3] - s[1]) / L, 0);
          c.quaternion.setFromUnitVectors(up, v);
          c.scale.set(1, L, 1);
        });
        for (let i = path.segs.length; i < cyl.length; i++) cyl[i].visible = false;
        path.arcs.forEach((a, i) => {
          let t = tor[i];
          const ad = Math.abs(a.d);
          if (!t || Math.abs(t.userData.ad - ad) > 0.004 || Math.abs(t.userData.r - a.r) > 1e-6) {
            if (t) { parent.remove(t); t.geometry.dispose(); }
            t = tor[i] = new THREE.Mesh(new THREE.TorusGeometry(a.r, rad, 6, Math.max(6, Math.round(ad * 12)), Math.max(1e-3, ad)), m);
            t.userData = { ad, r: a.r }; parent.add(t);
          }
          t.visible = true;
          t.position.set(a.x, a.y, z);
          t.rotation.set(0, 0, a.d > 0 ? a.a0 : a.a0 + a.d);
        });
        for (let i = path.arcs.length; i < tor.length; i++) tor[i].visible = false;
      },
    };
  };

  /** 一串钩码（挂钩顶端在原点，向下排列）：每个高 o.h；返回 { group, height } */
  MC.hooks3d = function (n, o) {
    o = o || {};
    const g = new THREE.Group(), r = o.r || 0.011, hh = o.h || 0.02, gap = 0.008;
    const brass = MC.mat(0xc9a227, { metalness: 0.75, roughness: 0.3 }), wire = MC.mat(0x8a6d1a, { metalness: 0.6, roughness: 0.4 });
    let y = 0;
    for (let i = 0; i < n; i++) {
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.0045, 0.0013, 6, 14, Math.PI * 1.5), wire); hook.position.set(0.002, y - 0.004, 0); hook.rotation.z = Math.PI * 0.75; g.add(hook);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, gap, 6), wire); stem.position.set(0, y - gap / 2 - 0.004, 0); g.add(stem);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 20), brass); body.position.set(0, y - gap - 0.004 - hh / 2, 0); g.add(body);
      y -= gap + 0.004 + hh;
    }
    return { group: g, height: -y };
  };

  /** 弹簧测力计（拉环在原点，挂钩向 −y）：set(F) 返回挂钩末端的 y */
  MC.scale3d = function (o) {
    o = o || {};
    const max = o.max || 5, div = o.div || 0.1, L = o.L || 0.16, W = 0.044, T = 0.013;
    const y0 = -0.06, bodyTop = -0.03, bodyBot = y0 - L - 0.025, BH = bodyTop - bodyBot;
    const g = new THREE.Group();
    const c = document.createElement('canvas'); c.width = 160; c.height = Math.round((160 * BH) / W);
    const x2 = c.getContext('2d'), k = c.height / BH, Y = (yy) => (bodyTop - yy) * k;
    x2.fillStyle = '#f8f9fa'; x2.fillRect(0, 0, c.width, c.height);
    x2.fillStyle = '#e7ecf3'; x2.fillRect(c.width / 2 - 14, 6, 28, c.height - 12);
    x2.strokeStyle = '#1b2333'; x2.fillStyle = '#1b2333'; x2.font = 'bold 30px sans-serif'; x2.textAlign = 'right'; x2.textBaseline = 'middle';
    const nDiv = Math.round(max / div), per = Math.round(1 / div);
    for (let i = 0; i <= nDiv; i++) {
      const yy = Y(y0 - ((i * div) / max) * L), big = i % per === 0, half = per % 2 === 0 && i % (per / 2) === 0;
      const tl = big ? 30 : half ? 22 : 14;
      x2.lineWidth = big ? 3 : 1.6;
      x2.beginPath(); x2.moveTo(c.width / 2 - 16, yy); x2.lineTo(c.width / 2 - 16 - tl, yy); x2.moveTo(c.width / 2 + 16, yy); x2.lineTo(c.width / 2 + 16 + tl, yy); x2.stroke();
      if (big) x2.fillText(String(i / per), c.width / 2 - 50, yy);
    }
    x2.textAlign = 'left'; x2.fillText('N', c.width / 2 + 40, Y(y0) - 22);
    const tex = new THREE.CanvasTexture(c);
    const side = MC.mat(0xdfe5ee, { roughness: 0.6 }), front = MC.mat(0xffffff, { map: tex, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, BH, T), [side, side, side, side, front, side]);
    body.position.y = (bodyTop + bodyBot) / 2; g.add(body);
    const metal = MC.mat(0x868e96, { metalness: 0.6, roughness: 0.35 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0022, 8, 24), metal); ring.position.y = -0.011; g.add(ring);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.01, 8), metal); neck.position.y = -0.026; g.add(neck);
    const ptr = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.0035, 0.004), MC.mat(0xe03131)); ptr.position.z = T / 2 + 0.002; g.add(ptr);
    const rodLen = L + 0.025 + 0.018;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, rodLen, 8), metal); g.add(rod);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0022, 8, 20, Math.PI * 1.6), metal); hook.rotation.z = Math.PI * 0.9; g.add(hook);
    const api = {
      group: g, body,
      set(F) {
        const py = y0 - (PS.clamp(F, -0.02 * max, max * 1.02) / max) * L;
        ptr.position.y = py; rod.position.y = py - rodLen / 2; hook.position.y = py - rodLen - 0.006;
        return py - rodLen - 0.012;
      },
    };
    api.set(0);
    return api;
  };

  /** 简单的“手”（3D）：肤色的圆角块 */
  MC.hand3d = function () {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), MC.mat(0xffc999, { roughness: 0.7 }));
    m.scale.set(1, 1.25, 0.8);
    return m;
  };

  /* ---------------- 计算随机练习 ---------------- */
  PS.register('machine-quiz', function (el, opts) {
    const box = h('div', { class: 'fc-q', style: { marginTop: 0 } });
    const inp = h('input', { type: 'text', class: 'q-input', inputmode: 'decimal', autocomplete: 'off', placeholder: '答案' });
    const unit = h('span', null, 'N');
    const fb = h('div', { class: 'fc-msg' });
    const score = h('div', { class: 'small muted', style: { marginTop: '6px' } });
    el.append(box, h('div', { class: 'fc-ans' }, inp, unit, PS.ui.button('提交', check, 'btn btn-primary btn-sm'), PS.ui.button('换一题', next, 'btn btn-ghost btn-sm')), h('div', { class: 'small muted' }, 'g 取 10 N/kg；机械效率填百分数中的数字（如 75）；可以写成 1.2×10^3 或 1200。'), fb, score);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    let Q = null, n = 0, ok = 0;
    const pick = PS.pick, P = (x) => PS.pretty(PS.round(x, 4), 4), R = (x, d) => PS.round(x, d == null ? 2 : d);
    const GEN = {
      f2: () => { const F1 = pick([2, 3, 4, 5, 6, 10]), l1 = pick([0.3, 0.4, 0.5, 0.6]), l2 = pick([0.1, 0.2, 0.25]); const a = R((F1 * l1) / l2); return { q: '杠杆平衡时，动力 F₁ = ' + F1 + ' N，动力臂 l₁ = ' + l1 + ' m，阻力臂 l₂ = ' + l2 + ' m。阻力 F₂ 是多少？', a, u: 'N', sol: '由 F₁l₁ = F₂l₂ 得 F₂ = F₁l₁/l₂ = ' + F1 + ' N × ' + l1 + ' m ÷ ' + l2 + ' m = ' + a + ' N。' }; },
      ratio: () => { const k = pick([2, 3, 4, 5, 6, 10]), F2 = pick([120, 300, 600, 1200, 1800]); return { q: '用撬棒撬石头，动力臂是阻力臂的 ' + k + ' 倍，石头对撬棒的阻力为 ' + F2 + ' N（不计撬棒重）。至少要用多大的动力？', a: R(F2 / k), u: 'N', sol: '动力臂是阻力臂的 ' + k + ' 倍，动力就是阻力的 1/' + k + '：F₁ = F₂l₂/l₁ = ' + F2 + ' N ÷ ' + k + ' = ' + R(F2 / k) + ' N。' }; },
      l1: () => { const F1 = pick([20, 25, 40, 50]), F2 = pick([100, 200, 400]), l2 = pick([0.1, 0.2, 0.25, 0.4]); const a = R((F2 * l2) / F1); return { q: '用 ' + F1 + ' N 的动力撬起 ' + F2 + ' N 的阻力，阻力臂 l₂ = ' + l2 + ' m。动力臂至少是多长？', a, u: 'm', sol: 'l₁ = F₂l₂/F₁ = ' + F2 + ' N × ' + l2 + ' m ÷ ' + F1 + ' N = ' + a + ' m。' }; },
      seesaw: () => { const m1 = pick([25, 30, 35, 40]), l1 = pick([1.2, 1.5, 1.8, 2]), m2 = pick([50, 60, 75]); const a = R((m1 * l1) / m2); return { q: '质量为 ' + m1 + ' kg 的小明坐在跷跷板左侧离支点 ' + l1 + ' m 处，质量为 ' + m2 + ' kg 的爸爸要坐在右侧离支点多远处，跷跷板才能在水平位置平衡？（不计跷跷板的重）', a, u: 'm', sol: 'm₁g·l₁ = m₂g·l₂，l₂ = m₁l₁/m₂ = ' + m1 + ' kg × ' + l1 + ' m ÷ ' + m2 + ' kg = ' + a + ' m。' }; },
      yard: () => { const m0 = pick([0.25, 0.5, 1]), a0 = pick([4, 5, 6]), M = pick([1, 1.5, 2, 3, 4]); const a = R((M * a0) / m0, 1); return { q: '杆秤的秤钩到提纽的距离为 ' + a0 + ' cm，秤砣的质量为 ' + m0 + ' kg。称质量为 ' + M + ' kg 的物体时，秤砣要挂在离提纽多远处杆秤才能水平平衡？（不计秤杆和秤钩的重）', a, u: 'cm', sol: 'Mg·a = m₀g·x，x = Ma/m₀ = ' + M + ' kg × ' + a0 + ' cm ÷ ' + m0 + ' kg = ' + a + ' cm。' }; },
      fixed: () => { const G = pick([20, 50, 100, 200]); return { q: '用定滑轮匀速提升重 ' + G + ' N 的物体，不计绳重和摩擦，拉力是多少？', a: G, u: 'N', sol: '定滑轮的实质是等臂杠杆，不省力：F = G = ' + G + ' N（沿任何方向拉都一样）。' }; },
      moving: () => { const G = pick([20, 50, 80, 100, 180]), Gd = pick([0, 10, 20]); const a = R((G + Gd) / 2); return { q: '用动滑轮竖直向上匀速提升重 ' + G + ' N 的物体，动滑轮重 ' + Gd + ' N，不计绳重和摩擦，拉力是多少？', a, u: 'N', sol: 'F = (G + G动)/2 = (' + G + ' N + ' + Gd + ' N) ÷ 2 = ' + a + ' N。' }; },
      block: () => { const n = pick([2, 3, 4, 5]), Gd = pick([0, 10, 20, 30]); let G = pick([60, 90, 120, 150, 180, 240, 300]); const a = R((G + Gd) / n); return { q: '用滑轮组竖直匀速提升重 ' + G + ' N 的物体，动滑轮由 ' + n + ' 段绳子吊着，动滑轮重 ' + Gd + ' N，不计绳重和摩擦。绳子自由端的拉力是多少？', a, u: 'N', sol: 'F = (G + G动)/n = (' + G + ' N + ' + Gd + ' N) ÷ ' + n + ' = ' + a + ' N。' }; },
      dist: () => { const n = pick([2, 3, 4, 5]), hh = pick([0.5, 1, 2, 3]); return { q: '用动滑轮上有 ' + n + ' 段绳子的滑轮组把重物匀速提升 ' + hh + ' m，绳子自由端移动的距离是多少？', a: R(n * hh), u: 'm', sol: 's = nh = ' + n + ' × ' + hh + ' m = ' + R(n * hh) + ' m。' }; },
      flat: () => { const n = pick([2, 3]), f = pick([60, 90, 120, 240, 300]); return { q: '用滑轮组水平拉动物体，动滑轮上有 ' + n + ' 段绳子拉着物体。物体在水平地面上做匀速直线运动，受到的摩擦力为 ' + f + ' N，不计绳重、滑轮重和绳与轮之间的摩擦。拉力是多少？', a: R(f / n), u: 'N', sol: '水平拉动时克服的是摩擦力（不是重力）：F = f/n = ' + f + ' N ÷ ' + n + ' = ' + R(f / n) + ' N。' }; },
      speed: () => { const n = pick([2, 3, 4]), v = pick([0.1, 0.2, 0.3, 0.5]); return { q: '用动滑轮上有 ' + n + ' 段绳子的滑轮组提升重物，重物以 ' + v + ' m/s 的速度匀速上升，绳子自由端移动的速度是多少？', a: R(n * v), u: 'm/s', sol: '相同时间内 s = nh，所以 v绳 = nv物 = ' + n + ' × ' + v + ' m/s = ' + R(n * v) + ' m/s。' }; },
      axle: () => { const Rr = pick([20, 30, 40, 50]), r = pick([5, 8, 10]), G = pick([100, 200, 300, 400]); const a = R((G * r) / Rr); return { q: '用辘轳（轮轴）从井中匀速提水，摇把转动的半径为 ' + Rr + ' cm，轴的半径为 ' + r + ' cm，水和桶共重 ' + G + ' N，不计摩擦。作用在摇把上的力至少多大？', a, u: 'N', sol: '轮轴是可以连续转动的杠杆：F₁R = F₂r，F₁ = F₂r/R = ' + G + ' N × ' + r + ' cm ÷ ' + Rr + ' cm = ' + a + ' N。' }; },
      crane: () => { let G, hh, e, Wu, We; do { G = pick([1000, 2000, 3000, 3600, 5000]); hh = pick([2, 3, 4, 5]); e = pick([0.5, 0.6, 0.75, 0.8]); Wu = G * hh; We = (Wu * (1 - e)) / e; } while (Math.abs(We - Math.round(We)) > 1e-9); return { q: '起重机把重 ' + G + ' N 的货物匀速提高 ' + hh + ' m，额外功是 ' + P(We) + ' J。起重机的机械效率是多少？', a: e * 100, u: '%', sol: 'W有 = Gh = ' + G + ' N × ' + hh + ' m = ' + P(Wu) + ' J，W总 = W有 + W额 = ' + P(Wu + We) + ' J，η = W有/W总 = ' + e * 100 + '%。' }; },
      eblock: () => { let n, G, e, F; do { n = pick([2, 3, 4]); G = pick([120, 180, 240, 300, 360, 400, 480, 600]); e = pick([0.6, 0.75, 0.8]); F = G / (n * e); } while (Math.abs(F - Math.round(F)) > 1e-9); return { q: '用动滑轮上有 ' + n + ' 段绳子的滑轮组匀速提升重 ' + G + ' N 的物体，绳子自由端的拉力为 ' + F + ' N。滑轮组的机械效率是多少？', a: e * 100, u: '%', sol: 'η = W有/W总 = Gh/(Fs) = Gh/(F·nh) = G/(nF) = ' + G + ' N ÷ (' + n + ' × ' + F + ' N) = ' + e * 100 + '%。' }; },
      light: () => { const G = pick([80, 90, 120, 160, 180, 240, 300, 400]), Gd = pick([20, 30, 40, 60, 80]); const a = R((G / (G + Gd)) * 100, 1); return { q: '用滑轮组匀速提升重 ' + G + ' N 的物体，动滑轮重 ' + Gd + ' N，不计绳重和摩擦。滑轮组的机械效率是多少？（保留一位小数）', a, u: '%', sol: '不计绳重和摩擦时，额外功只是克服动滑轮重做的功：η = G/(G + G动) = ' + G + ' N ÷ ' + (G + Gd) + ' N ≈ ' + a + '%。' }; },
      incline: () => { const G = pick([100, 200, 400, 500]), hh = pick([0.5, 1, 1.5]), L = pick([3, 4, 5]), e = pick([0.6, 0.7, 0.75, 0.8]); const F = Math.round((G * hh) / (e * L)); const a = R(((G * hh) / (F * L)) * 100, 1); return { q: '沿长 ' + L + ' m、高 ' + hh + ' m 的斜面，用 ' + F + ' N 的力把重 ' + G + ' N 的物体从底端匀速拉到顶端。斜面的机械效率是多少？（保留一位小数）', a, u: '%', sol: 'W有 = Gh = ' + P(G * hh) + ' J，W总 = Fs = ' + F + ' N × ' + L + ' m = ' + P(F * L) + ' J，η = W有/W总 ≈ ' + a + '%。' }; },
      total: () => { const Wu = pick([600, 1200, 2400, 4800, 9000]), e = pick([0.6, 0.75, 0.8]); return { q: '某机械的机械效率为 ' + e * 100 + '%，用它做了 ' + Wu + ' J 的有用功，总功是多少？', a: R(Wu / e), u: 'J', sol: 'W总 = W有/η = ' + Wu + ' J ÷ ' + e + ' = ' + R(Wu / e) + ' J。' }; },
      eflat: () => { let n, f, F, e; do { n = pick([2, 3]); f = pick([120, 180, 240, 300, 360]); e = pick([0.6, 0.75, 0.8]); F = f / (n * e); } while (Math.abs(F - Math.round(F)) > 1e-9); return { q: '用动滑轮上有 ' + n + ' 段绳子的滑轮组水平匀速拉动物体，物体受到的摩擦力为 ' + f + ' N，绳子自由端的拉力为 ' + F + ' N。滑轮组的机械效率是多少？', a: e * 100, u: '%', sol: '水平拉动时，有用功是克服摩擦力做的功：η = fs物/(Fs绳) = f/(nF) = ' + f + ' N ÷ (' + n + ' × ' + F + ' N) = ' + e * 100 + '%。' }; },
    };
    const SETS = { lever: ['f2', 'ratio', 'l1', 'seesaw', 'yard'], pulley: ['fixed', 'moving', 'block', 'dist', 'flat', 'speed', 'axle'], eta: ['crane', 'eblock', 'light', 'incline', 'total', 'eflat'] };
    const keys = SETS[opts.set] || Object.keys(GEN);
    const HINT = { lever: '杠杆的平衡条件：F₁l₁ = F₂l₂。', pulley: '滑轮组：F = (G + G动)/n，s = nh；轮轴：F₁R = F₂r。', eta: '机械效率 η = W有/W总，W总 = W有 + W额。' };
    function next() {
      Q = GEN[pick(keys)]();
      box.innerHTML = '<b>计算：</b>' + Q.q; unit.textContent = Q.u;
      inp.value = ''; inp.disabled = false;
      fb.className = 'fc-msg'; fb.innerHTML = HINT[opts.set] || '杠杆 F₁l₁ = F₂l₂；滑轮组 F = (G + G动)/n、s = nh；机械效率 η = W有/W总。';
    }
    function check() {
      if (!Q || inp.disabled) return;
      const v = PS.en.parse(inp.value.replace('%', ''));
      if (isNaN(v)) { inp.focus(); return; }
      const good = Math.abs(v - Q.a) <= Math.abs(Q.a) * 0.006 + 1e-9;
      n++; if (good) ok++;
      inp.disabled = true;
      fb.className = 'fc-msg ' + (good ? 'ok' : 'bad');
      fb.innerHTML = (good ? '✔ 正确！' : '✘ 答案是 ' + P(Q.a) + ' ' + Q.u + '。') + '<br>' + Q.sol;
      score.innerHTML = '已做 ' + n + ' 题，答对 ' + ok + ' 题。';
      good ? PS.sound.good() : PS.sound.bad();
    }
    next();
  });

  /* 第12章组件共用的样式（.fc-* 来自 force.js，.en-* 来自 energy.js） */
  if (!document.getElementById('mc-style')) document.head.append(h('style', { id: 'mc-style' }, `
    .mc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
    .mc-chips .btn.on{background:var(--primary);color:#fff;border-color:var(--primary)}
    .mc-chips .btn.f1.on{background:#e8590c;border-color:#e8590c}
    .mc-chips .btn.f2.on{background:#1c7ed6;border-color:#1c7ed6}
    .mc-chips .btn.o.on{background:#1b2333;border-color:#1b2333}
    .mc-read{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px;margin-top:6px}
    .mc-read .readout{margin:0}
    .mc-f1{color:#e8590c;font-weight:700}.mc-f2{color:#1c7ed6;font-weight:700}
    .mc-zoom{display:block;width:100%;max-width:220px;margin:6px auto 0}
  `));
})();
