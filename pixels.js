(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const lockup = document.querySelector('.name-lockup');
  const canvas = lockup?.querySelector('canvas');
  if (!canvas || motion.matches) return;
  const context = canvas.getContext('2d');
  const mask = document.createElement('canvas');
  const source = mask.getContext('2d', {willReadFrequently: true});
  if (!context || !source) return;
  let frame;
  const finish = () => {
    cancelAnimationFrame(frame);
    lockup.classList.remove('assembling');
    canvas.style.removeProperty('opacity');
    for (const el of lockup.querySelectorAll('[data-pixels]')) el.style.removeProperty('opacity');
  };
  window.addEventListener('resize', finish, {once:true});
  motion.addEventListener('change', finish, {once:true});

  async function start() {
    await document.fonts.ready;
    if (motion.matches) return;
    const box = lockup.getBoundingClientRect();
    const width = Math.ceil(box.width), height = Math.ceil(box.height);
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.scale(dpr, dpr);
    mask.width = width;
    mask.height = height;
    const bits = [];
    const nodes = [...lockup.querySelectorAll('[data-pixels]')];
    for (const [index, node] of nodes.entries()) {
      const r = node.getBoundingClientRect(), css = getComputedStyle(node);
      source.clearRect(0, 0, width, height);
      source.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      source.textBaseline = 'alphabetic';
      const bounds = source.measureText(node.textContent);
      const x = r.left - box.left;
      const y = r.top - box.top + (r.height - bounds.actualBoundingBoxAscent - bounds.actualBoundingBoxDescent) / 2 + bounds.actualBoundingBoxAscent;
      source.fillStyle = css.color;
      source.fillText(node.textContent, x, y);
      const pixels = source.getImageData(0, 0, width, height).data;
      const step = width > 400 ? 4 : 3;
      for (let py = 0; py < height; py += step) for (let px = 0; px < width; px += step) {
        const k = (py * width + px) * 4;
        if (pixels[k + 3] < 150) continue;
        const warm = index === 2 || (index === 1 && px > r.right - box.left - parseFloat(css.fontSize) * .18);
        bits.push({x:px,y:py,sx:(Math.random()-.5)*106,sy:(Math.random()-.5)*89,
          wait:index*.13+(px/width)*.21+Math.random()*.24,size:Math.max(1,step-.9),color:warm?'#ff634d':'#fff7f1'});
      }
    }
    if (!bits.length) return;
    lockup.classList.add('assembling');
    const total = 2300, begin = performance.now();
    function draw(now) {
      const t = (now - begin) / total;
      context.clearRect(0, 0, width, height);
      for (const bit of bits) {
        const p = Math.max(0, Math.min(1, (t - bit.wait) / .47));
        const q = 1 - (1-p)**3;
        context.globalAlpha = .24 + q*.76;
        context.fillStyle = bit.color;
        context.fillRect(bit.x+bit.sx*(1-q),bit.y+bit.sy*(1-q),bit.size,bit.size);
      }
      const blend = Math.max(0, Math.min(1, (t - .79) / .21));
      canvas.style.opacity = String(1-blend);
      for (const node of nodes) node.style.opacity = String(blend);
      if (t < 1) frame = requestAnimationFrame(draw);
      else finish();
    }
    frame = requestAnimationFrame(draw);
  }
  start().catch(finish);
})();
