(function(){
  const d=document, w=window;
  const c=d.getElementById('preloader-canvas'); if(!c) return;
  const ctx=c.getContext('2d');
  const DPR = Math.max(1, w.devicePixelRatio||1);
  const CSS_W = c.width, CSS_H = c.height;
  c.width = CSS_W*DPR; c.height = CSS_H*DPR; ctx.scale(DPR, DPR);
  const W=CSS_W, H=CSS_H;
  const BG = '#161b22';
  const SCLERA = '#ffffff';
  const IRIS = '#ff7a00';
  const PUPIL = '#000000';

  function easeInOut(t){ return t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
  // Two blinks in 500ms, then hold open
  function blinkOpen(t){
    if (t >= 500) return 1;
    const ph = t / 500;
    if (ph < 0.20) return 1;
    if (ph < 0.40) return 1 - easeInOut((ph-0.20)/0.20);
    if (ph < 0.60) return easeInOut((ph-0.40)/0.20);
    if (ph < 0.80) return 1 - easeInOut((ph-0.60)/0.20);
    return easeInOut((ph-0.80)/0.20);
  }

  function drawEye(t){
    ctx.clearRect(0,0,W,H);
    ctx.save(); ctx.translate(W/2, H/2);
    const rx = 149, ry = 95; // 1.5x larger again for demo
    const open = blinkOpen(t);
    // Soft halo behind the eye for contrast
    const halo = ctx.createRadialGradient(0,0,8, 0,0, rx+18);
    halo.addColorStop(0, 'rgba(255,122,0,0.18)');
    halo.addColorStop(1, 'rgba(13,17,23,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.ellipse(0,0, rx+22, ry+22, 0, 0, Math.PI*2); ctx.fill();

    // Sclera as horizontal almond (lens)
    ctx.fillStyle = SCLERA;
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx*0.40, -ry,  rx*0.40, -ry,  rx, 0);
    ctx.bezierCurveTo( rx*0.40,  ry, -rx*0.40,  ry, -rx, 0);
    ctx.closePath();
    ctx.fill();
    // Iris + pupil (clipped to almond so it never bleeds outside)
    const irisR = Math.max(ry - 6, 10);
    const drift = Math.sin(t*0.0023)*2.5;
    ctx.save();
    // Define almond clip
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx*0.40, -ry,  rx*0.40, -ry,  rx, 0);
    ctx.bezierCurveTo( rx*0.40,  ry, -rx*0.40,  ry, -rx, 0);
    ctx.closePath();
    ctx.clip();
      // Draw iris + pupil with drift
      ctx.save(); ctx.translate(drift, 0);
      ctx.fillStyle = IRIS; ctx.beginPath(); ctx.arc(0,0, irisR, 0, Math.PI*2); ctx.fill();
      // Almond pupil (pointed tips via cubic Béziers)
      const aw = Math.max(irisR * 0.34, 8);
      const ah = Math.max(irisR * 0.90, 14);
      ctx.fillStyle = PUPIL;
      ctx.beginPath();
      ctx.moveTo(0, -ah/2);
      ctx.bezierCurveTo(+aw*0.70, -ah*0.40, +aw*0.70, +ah*0.40, 0, +ah/2);
      ctx.bezierCurveTo(-aw*0.70, +ah*0.40, -aw*0.70, -ah*0.40, 0, -ah/2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Stationary specular drawn while clipped (stays inside eye, no drift)
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(-Math.min(irisR*0.3, 8), -Math.min(irisR*0.3, 8), Math.max(irisR*0.12,2.2), 0, Math.PI*2);
      ctx.fill();
    ctx.restore();
    // Lids (mask with background color) — meet at center when closed
    const openH = Math.max(0, ry*open); // half-gap in pixels
    const gap = openH * 2;              // visible aperture height
    const coverH = Math.max(0, (H/2) - (gap/2));
    ctx.fillStyle = BG;
    // Top lid: from top edge down to top of aperture
    ctx.fillRect(-W, -H/2, W*2, coverH);
    // Bottom lid: from bottom of aperture to bottom edge
    ctx.fillRect(-W, (gap/2), W*2, coverH);
    // Eyelid outline as almond (fox black rim)
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx*0.40, -ry,  rx*0.40, -ry,  rx, 0);
    ctx.bezierCurveTo( rx*0.40,  ry, -rx*0.40,  ry, -rx, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  let raf=0; const t0=performance.now();
  function loop(now){ drawEye(now - t0); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
})();
