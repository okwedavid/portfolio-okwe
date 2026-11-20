// Paint the dim catalogue once per size. Only a few bright stars change exposure;
// each has its own smooth, slow rhythm (no flashing and no random positions per frame).
export function starfield(canvas) {
  const g = canvas.getContext('2d');
  if (!g) return () => {};
  const sky = document.createElement('canvas'),
    back = sky.getContext('2d');
  let bright = [],
    scale = 1,
    w = 0,
    h = 0,
    lastTime = 0;
  function paint(t = lastTime) {
    lastTime = t;
    if (!w || !h) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(sky, 0, 0);
    g.setTransform(scale, 0, 0, scale, 0, 0);
    for (const s of bright) {
      const pulse =
        0.51 +
        0.31 * Math.sin(t * s.rate + s.phase) +
        0.16 * Math.sin(t * s.rate * 0.47 + s.phase * 3);
      const x = s.x + 0.7 * Math.sin(t * 0.055 + s.phase),
        y = s.y + 0.48 * Math.cos(t * 0.049 + s.phase);
      g.fillStyle = s.tint;
      g.globalAlpha = 0.035 + 0.085 * pulse;
      g.beginPath();
      g.arc(x, y, s.r * (2.1 + pulse), 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 0.38 + 0.57 * pulse;
      g.beginPath();
      g.arc(x, y, s.r * (0.63 + 0.4 * pulse), 0, Math.PI * 2);
      g.fill();
      if (s.spike) {
        const ray = s.r * (2 + 2 * pulse);
        g.globalAlpha = 0.1 + 0.2 * pulse;
        g.fillRect(x - ray, y - 0.4, ray * 2, 0.8);
        g.fillRect(x - 0.4, y - ray, 0.8, ray * 2);
      }
    }
    g.globalAlpha = 1;
  }
  function size() {
    ({ width: w, height: h } = canvas.getBoundingClientRect());
    scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = sky.width = Math.round(w * scale);
    canvas.height = sky.height = Math.round(h * scale);
    back.setTransform(scale, 0, 0, scale, 0, 0);
    bright = [];
    let seed = 9363;
    const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < Math.min(640, (w * h) / 2100); i++) {
      const x = rand() * w,
        y = rand() * h,
        r = 0.24 + 0.6 * rand(),
        tint = ['#d4e6f5', '#c3dcf5', '#ffe5c4', '#e1e7e9'][i % 4];
      if (i % 9 === 0)
        bright.push({
          x,
          y,
          r: 0.75 + 0.68 * rand(),
          tint,
          phase: rand() * 2 * Math.PI,
          rate: 0.28 + 0.65 * rand(),
          spike: i % 27 === 0,
        });
      else {
        back.fillStyle = tint;
        back.globalAlpha = 0.16 + 0.49 * rand();
        back.beginPath();
        back.arc(x, y, r, 0, Math.PI * 2);
        back.fill();
      }
    }
    paint();
  }
  new ResizeObserver(size).observe(canvas);
  return paint;
}
