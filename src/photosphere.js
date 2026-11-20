// Miniature illustrative photosphere, not observed sunspot data. Rotate only the
// surface with the mean Carrington phase. Optical diffraction stays camera-fixed.
export function photosphere(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const n = 64;
  canvas.width = canvas.height = n;
  const img = ctx.createImageData(n, n);
  let last = -Infinity;
  return (phase) => {
    if (Math.abs(phase - last) < 0.0008) return;
    last = phase;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const u = (x + 0.5) / 32 - 1,
          v = 1 - (y + 0.5) / 32,
          r = u * u + v * v,
          i = 4 * (y * n + x);
        if (r >= 1) {
          img.data[i + 3] = 0;
          continue;
        }
        const z = Math.sqrt(1 - r),
          lon = Math.atan2(u, z) + phase,
          lat = Math.asin(v);
        const grains =
          0.5 +
          0.5 *
            Math.sin(36 * lon + 3 * Math.sin(18 * lat)) *
            Math.sin(41 * lat - 2 * Math.cos(30 * lon));
        const spot =
          Math.exp(-170 * (1 - Math.cos(lon - 1.3)) - 125 * (lat - 0.22) ** 2) +
          0.7 * Math.exp(-210 * (1 - Math.cos(lon + 1.9)) - 180 * (lat + 0.18) ** 2);
        const light = 0.89 + 0.1 * Math.sqrt(z) + 0.016 * grains - 0.22 * spot;
        img.data[i] = 255 * light;
        img.data[i + 1] = (235 + 16 * z) * light;
        img.data[i + 2] = (182 + 45 * z) * light;
        img.data[i + 3] = 255 * Math.min(1, (1 - r) * 26);
      }
    ctx.putImageData(img, 0, 0);
  };
}
