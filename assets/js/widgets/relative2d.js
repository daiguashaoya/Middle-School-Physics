/* 第2节：相对静止（空中加油、联合收割机、同步卫星） */
(function () {
  'use strict';
  const { h } = PS;
  const D = PS.draw;

  function plane(ctx, x, y, s, color, kind) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1 / s;
    if (kind === 'tanker') {
      // 机身
      ctx.beginPath();
      ctx.moveTo(60, 0); ctx.quadraticCurveTo(70, -2, 64, -8); ctx.lineTo(-50, -10); ctx.lineTo(-62, -30); ctx.lineTo(-70, -30); ctx.lineTo(-66, -6); ctx.lineTo(-60, 4); ctx.lineTo(50, 6); ctx.quadraticCurveTo(66, 5, 60, 0);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath(); ctx.moveTo(10, -2); ctx.lineTo(-22, 16); ctx.lineTo(-34, 16); ctx.lineTo(-14, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1d3557';
      for (let i = 0; i < 9; i++) ctx.fillRect(40 - i * 9, -6, 4, 3);
      ctx.fillStyle = '#495057'; ctx.fillRect(-8, 6, 12, 5);
    } else if (kind === 'fighter') {
      ctx.beginPath();
      ctx.moveTo(40, 0); ctx.lineTo(10, -6); ctx.lineTo(-24, -6); ctx.lineTo(-34, -20); ctx.lineTo(-40, -20); ctx.lineTo(-38, 2); ctx.lineTo(10, 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-18, 12); ctx.lineTo(-26, 12); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#74c0fc';
      ctx.beginPath(); ctx.ellipse(16, -6, 9, 3.5, -0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  function harvester(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#2f9e44'; D.roundRect(ctx, -40, -34, 62, 26, 4); ctx.fill();
    ctx.fillStyle = '#37b24d'; ctx.fillRect(-4, -54, 22, 20);
    ctx.fillStyle = '#a5d8ff'; ctx.fillRect(0, -50, 14, 11);
    ctx.fillStyle = '#fab005'; ctx.fillRect(22, -18, 26, 12);
    ctx.strokeStyle = '#e67700'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(24 + i * 5, -6); ctx.lineTo(24 + i * 5, -18); ctx.stroke(); }
    ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-36, -30); ctx.lineTo(-58, -46); ctx.lineTo(-62, -40); ctx.stroke();
    ctx.fillStyle = '#212529';
    [[-28, -6, 9], [10, -6, 7]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }
  function truck(ctx, x, y, s, grain) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#c92a2a'; D.roundRect(ctx, 16, -30, 22, 24, 4); ctx.fill();
    ctx.fillStyle = '#a5d8ff'; ctx.fillRect(26, -26, 10, 9);
    ctx.fillStyle = '#868e96'; ctx.fillRect(-38, -26, 52, 20);
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath(); ctx.moveTo(-36, -26); ctx.quadraticCurveTo(-12, -26 - 14 * grain, 12, -26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#212529';
    [[-26, -5, 7], [4, -5, 7], [28, -5, 7]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(a, b, r, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  PS.register('relative-2d', function (el) {
    const st = { scene: 'refuel', ref: 'ground', t: 0, x: 0, grain: 0 };
    const V = 160; // px/s
    const info = h('div', { class: 'ref3d-explain' });
    const S = PS.stage(el, { ratio: '1000 / 440', draw: paint });
    const loop = PS.loop((dt) => { st.t += dt; st.x += V * dt; st.grain = Math.min(1, st.grain + dt * 0.05); S.render(); }, S.stage);

    function paint(ctx, w, hh) {
      if (st.scene === 'sat') return paintSat(ctx, w, hh);
      const groundRef = st.ref === 'ground';
      const camX = groundRef ? 0 : st.x; // 以运动物体为参照物时，镜头跟随
      const objX = groundRef ? ((st.x % (w + 400)) - 200) : w * 0.5;
      if (st.scene === 'refuel') {
        const g = ctx.createLinearGradient(0, 0, 0, hh);
        g.addColorStop(0, '#74c0fc'); g.addColorStop(1, '#d0ebff');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
        // 云（远景，视差稍小）
        for (let i = 0; i < 7; i++) {
          const cx = (((i * 260 - camX * 0.9) % (w + 300)) + w + 300) % (w + 300) - 150;
          cloud(ctx, cx, 50 + (i % 3) * 70, 1 + (i % 2) * 0.4);
        }
        // 地面
        const gy = hh * 0.86;
        ctx.fillStyle = '#8ce99a'; ctx.fillRect(0, gy, w, hh - gy);
        for (let i = 0; i < 16; i++) {
          const tx = (((i * 140 - camX) % (w + 200)) + w + 200) % (w + 200) - 100;
          ctx.fillStyle = '#2f9e44';
          ctx.beginPath(); ctx.moveTo(tx, gy); ctx.lineTo(tx + 14, gy - 34); ctx.lineTo(tx + 28, gy); ctx.fill();
          ctx.fillStyle = '#69db7c';
          ctx.beginPath(); ctx.ellipse(tx + 70, gy + 20, 50, 10, 0, 0, Math.PI * 2); ctx.fill();
        }
        // 加油机与受油机
        const s = Math.min(w / 700, 1.8);
        const ty = hh * 0.3, fy = hh * 0.52;
        plane(ctx, objX + 30 * s, ty, s * 1.4, '#dee2e6', 'tanker');
        ctx.strokeStyle = '#495057'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(objX + 30 * s - 2 * s, ty + 14 * s); ctx.quadraticCurveTo(objX - 20 * s, (ty + fy) / 2 + 20, objX - 6 * s, fy - 4 * s); ctx.stroke();
        plane(ctx, objX - 48 * s, fy, s * 1.3, '#868e96', 'fighter');
        label(ctx, '加油机', objX + 30 * s, ty - 50 * s, st.ref === 'tanker' ? 'ref' : groundRef ? 'move' : 'still');
        label(ctx, '受油机', objX - 48 * s, fy + 38 * s, groundRef ? 'move' : 'still');
        label(ctx, '地面', w - 70, gy + 30, groundRef ? 'ref' : 'move');
      } else {
        // 联合收割机与卡车
        const g = ctx.createLinearGradient(0, 0, 0, hh);
        g.addColorStop(0, '#a5d8ff'); g.addColorStop(0.5, '#e7f5ff'); g.addColorStop(0.5, '#ffe066'); g.addColorStop(1, '#fab005');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, hh);
        for (let i = 0; i < 4; i++) {
          const cx = (((i * 330 - camX * 0.3) % (w + 300)) + w + 300) % (w + 300) - 150;
          cloud(ctx, cx, 40 + (i % 2) * 40, 0.9);
        }
        ctx.strokeStyle = 'rgba(180,120,0,.5)'; ctx.lineWidth = 2;
        for (let i = 0; i < 40; i++) {
          const x = (((i * 40 - camX) % (w + 40)) + w + 40) % (w + 40) - 20;
          ctx.beginPath(); ctx.moveTo(x, hh * 0.5); ctx.lineTo(x - 30, hh); ctx.stroke();
        }
        const s = Math.min(w / 650, 2);
        harvester(ctx, objX + 10 * s, hh * 0.62, s * 1.6);
        truck(ctx, objX + 10 * s, hh * 0.9, s * 1.6, st.grain);
        label(ctx, '联合收割机', objX + 10 * s, hh * 0.62 - 100 * s, st.ref === 'harv' ? 'ref' : groundRef ? 'move' : 'still');
        label(ctx, '卡车', objX + 90 * s, hh * 0.9 - 50 * s, groundRef ? 'move' : 'still');
        label(ctx, '地面', 70, hh * 0.55, groundRef ? 'ref' : 'move');
      }
    }
    function cloud(ctx, x, y, s) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.arc(x, y, 18 * s, 0, Math.PI * 2); ctx.arc(x + 22 * s, y - 8 * s, 22 * s, 0, Math.PI * 2); ctx.arc(x + 46 * s, y, 18 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    function label(ctx, name, x, y, state) {
      const map = { ref: ['#3b5bdb', '#fff', '参照物'], still: ['#fff', '#2b8a3e', '静止'], move: ['#fff', '#e8590c', '运动'] };
      const [bg, fg, txt] = map[state];
      const str = name + ' · ' + txt;
      ctx.font = PS.font(13, 700);
      const tw = ctx.measureText(str).width;
      ctx.fillStyle = bg; ctx.strokeStyle = fg; ctx.lineWidth = 1.5;
      D.roundRect(ctx, x - tw / 2 - 9, y - 12, tw + 18, 24, 12); ctx.fill(); if (state !== 'ref') ctx.stroke();
      ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(str, x, y + 1);
    }

    function paintSat(ctx, w, hh) {
      ctx.fillStyle = '#0b1324'; ctx.fillRect(0, 0, w, hh);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + ((i * 37) % 7) / 10) + ')';
        ctx.fillRect((i * 97) % w, (i * 53) % hh, 1.5, 1.5);
      }
      const cx = w * 0.5, cy = hh * 0.5;
      const R = Math.min(hh * 0.22, 110), R2 = R * 1.9;
      const omega = 0.5;
      const ang = st.t * omega;
      const rot = st.ref === 'earth' ? 0 : ang; // 以地面为参照物：整体不转
      // 太阳方向
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath(); ctx.arc(w - 50, 50, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe066'; ctx.font = PS.font(12, 700); ctx.textAlign = 'center'; ctx.fillText('太阳方向', w - 50, 90);
      // 轨道
      ctx.strokeStyle = 'rgba(165,216,255,.35)'; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(cx, cy, R2, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      // 地球
      const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
      g.addColorStop(0, '#4dabf7'); g.addColorStop(1, '#1864ab');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#51cf66';
      [[-0.3, -0.4, 0.35, 0.22], [0.35, 0.1, 0.3, 0.4], [-0.2, 0.45, 0.25, 0.15], [0.1, -0.7, 0.2, 0.12]].forEach(([a, b, c, d]) => {
        ctx.beginPath(); ctx.ellipse(a * R, b * R, c * R, d * R, a * 2, 0, Math.PI * 2); ctx.fill();
      });
      // 地面上的城市
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath(); ctx.arc(R * 0.93, 0, 6, 0, Math.PI * 2); ctx.fill();
      // 卫星（与地球同步转动）
      ctx.translate(R2, 0);
      ctx.fillStyle = '#ced4da'; ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#4263eb'; ctx.fillRect(-7, -26, 14, 16); ctx.fillRect(-7, 10, 14, 16);
      ctx.restore();
      ctx.save(); ctx.translate(cx, cy);
      const sx = Math.cos(rot) * R2, sy = Math.sin(rot) * R2;
      ctx.restore();
      const ref = st.ref === 'earth';
      label(ctx, '同步卫星', cx + sx, cy + sy - 40, ref ? 'still' : 'move');
      label(ctx, '地面上的城市', cx + Math.cos(rot) * R * 0.93, cy + Math.sin(rot) * R * 0.93 + 26, ref ? 'ref' : 'move');
      ctx.fillStyle = '#adb5bd'; ctx.font = PS.font(12, 500); ctx.textAlign = 'left';
      ctx.fillText('俯视图（从北极上空看）', 14, hh - 14);
    }

    const TEXT = {
      refuel: { ground: '以<b>地面</b>为参照物：加油机和受油机的位置都在变化，它们都是运动的。', move: '以<b>加油机</b>为参照物：受油机的位置不变，是<b>静止</b>的；地面、云朵在向后运动。两架飞机快慢相同、方向相同，所以能保持“相对静止”，空中加油才能顺利进行。' },
      harvest: { ground: '以<b>地面</b>为参照物：联合收割机和卡车都在向前运动。', move: '以<b>联合收割机</b>为参照物：卡车是<b>静止</b>的。收割机和卡车以同样的快慢、向同一方向前进，谷粒才能准确地落进车厢。' },
      sat: { ground: '以<b>太阳（地心）</b>为参照物：地球在自转，同步卫星绕地球转动，它们都在运动。', move: '以<b>地面</b>为参照物：同步卫星转动的快慢与地球自转同步，始终在地面上同一位置的上空，是<b>静止</b>的。所以叫“同步”卫星。' },
    };
    const refBox = h('span');
    let refSeg;
    function buildRef() {
      refBox.innerHTML = '';
      const opts = {
        refuel: [{ value: 'ground', label: '地面' }, { value: 'tanker', label: '加油机' }],
        harvest: [{ value: 'ground', label: '地面' }, { value: 'harv', label: '联合收割机' }],
        sat: [{ value: 'sun', label: '太阳（地心）' }, { value: 'earth', label: '地面' }],
      }[st.scene];
      st.ref = opts[0].value;
      refSeg = PS.ui.seg(opts, st.ref, (v) => { st.ref = v; text(); S.render(); });
      refBox.append(refSeg.el);
      text();
    }
    function text() {
      const isFirst = st.ref === 'ground' || st.ref === 'sun';
      info.innerHTML = TEXT[st.scene][isFirst ? 'ground' : 'move'];
    }
    const sceneSeg = PS.ui.seg([{ value: 'refuel', label: '✈️ 空中加油' }, { value: 'harvest', label: '🌾 收割机与卡车' }, { value: 'sat', label: '🛰️ 同步卫星' }], 'refuel', (v) => { st.scene = v; st.grain = 0; buildRef(); S.render(); });
    el.prepend(PS.ui.row(sceneSeg.el));
    el.querySelector('.controls').classList.add('top');
    el.append(PS.ui.row(h('b', null, '参照物：'), refBox), info);
    buildRef();
    loop.start();
  });
})();
