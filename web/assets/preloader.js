(function(){
  const d=document, w=window;
  const c=d.getElementById('preloader-canvas'); if(!c) return;
  const ctx=c.getContext('2d');
  const DPR = Math.max(1, w.devicePixelRatio||1);
  const CSS_W = c.width, CSS_H = c.height;
  c.width = CSS_W*DPR; c.height = CSS_H*DPR; ctx.scale(DPR, DPR);
  const W=CSS_W, H=CSS_H;

  function drawTail(t){
    ctx.clearRect(0,0,W,H);
    ctx.save();
    // Head silhouette
    ctx.translate(W/2, H/2+8);
    ctx.fillStyle = '#1f242c';
    ctx.beginPath(); ctx.arc(0,0,26,0,Math.PI*2); ctx.fill();
    // Ears
    ctx.save();
    ctx.rotate(-0.3); ctx.beginPath(); ctx.moveTo(-18,-18); ctx.lineTo(-4,-28); ctx.lineTo(2,-10); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.rotate(0.3); ctx.beginPath(); ctx.moveTo(18,-18); ctx.lineTo(4,-28); ctx.lineTo(-2,-10); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Tail
    const phase = t*0.012; const angle = Math.sin(phase)*0.7;
    const baseX=-10, baseY=12; ctx.translate(baseX, baseY); ctx.rotate(angle);
    const segs=10; let x=0,y=0, th=0;
    for(let i=0;i<segs;i++){
      const p=i/(segs-1);
      const sway = Math.sin(phase + p*2.2)*0.16*(1-p);
      th += sway; x += Math.cos(th)*9; y += Math.sin(th)*6.5;
      const r = 13*(1-p*0.85);
      ctx.fillStyle = i<segs-2 ? '#ff7a00' : '#ffd7a3';
      ctx.beginPath(); ctx.ellipse(x, y, r, r*0.68, th, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  let raf=0; const t0=performance.now();
  function loop(now){ drawTail(now - t0); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);
})();

