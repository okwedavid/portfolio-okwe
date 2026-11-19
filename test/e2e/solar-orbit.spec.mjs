import { test, expect } from '@playwright/test';
import { DAY_SECONDS, YEAR_SECONDS, EARTH_RADIUS, solarState } from '../../src/solar-motion.js';

// Exercise the actual material even on a CI machine without a hardware GPU.
test.use({
  reducedMotion: 'no-preference',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});
async function openAtSunrise(page) {
  await page.clock.install({ time: new Date('2024-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2024-01-01T00:01:00Z'));
  await page.goto('/');
  await expect(page.locator('#earth-scene')).toHaveClass(/earth-ready/);
}
const geometry = (page) =>
  page.evaluate(() => {
    const scene = document.querySelector('#earth-scene'),
      box = scene.getBoundingClientRect();
    const base = document.querySelector('#base-marker'),
      sun = document.querySelector('.solar-track');
    return {
      width: box.width,
      height: box.height,
      x: box.x,
      y: box.y,
      base: base.getAttribute('transform'),
      visible: base.getAttribute('visibility'),
      emitter: sun.style.transform,
      transmission: Number(sun.style.opacity),
      year: document.querySelector('.year-marker').getAttribute('cx'),
    };
  });

// Read the real shader output, not just the DOM values used to position the flare.
// Sample two small patches toward opposite limbs; use several texels so a single city isn't decisive.
async function sampleLight(page, t) {
  const [sx, sy] = solarState(t).sun;
  const { luminance, diameterError } = await page.locator('#earth-canvas').evaluate(
    (canvas, { sx, sy, radius }) => {
      const gl = canvas.getContext('webgl'),
        width = gl.drawingBufferWidth;
      const k = (0.91 * radius * width) / Math.hypot(sx, sy);
      const row = new Uint8Array(width * 4);
      gl.readPixels(0, Math.floor(width / 2), width, 1, gl.RGBA, gl.UNSIGNED_BYTE, row);
      const opaque = row.filter((value, i) => i % 4 === 3 && value === 255).length;
      const luminance = [1, -1].map((side) => {
        const pixels = new Uint8Array(9 * 9 * 4);
        gl.readPixels(
          Math.round(width / 2 + side * k * sx) - 4,
          Math.round(width / 2 + side * k * sy) - 4,
          9,
          9,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixels,
        );
        let y = 0;
        for (let i = 0; i < pixels.length; i += 4)
          y += 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
        return y / (9 * 9);
      });
      return { luminance, diameterError: Math.abs(opaque - 2 * radius * width) };
    },
    { sx, sy, radius: EARTH_RADIUS },
  );
  expect(diameterError).toBeLessThan(2); // physical silhouette, not just CSS box size
  expect(luminance[0], `sunlit vs. shadow luminance at ${t}s: ${luminance}`).toBeGreaterThan(
    luminance[1] + 20,
  );
}

test('a rendered orbit reverses the light, occludes the Sun, and never zooms or resets the spin', async ({
  page,
}) => {
  // Only the test needs framebuffer readback after compositing; production can discard it.
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return get.call(
        this,
        type,
        type === 'webgl' ? { ...options, preserveDrawingBuffer: true } : options,
      );
    };
  });
  await openAtSunrise(page);
  const start = await geometry(page);
  expect(start.visible).toBe('visible');
  expect(start.transmission).toBe(1);
  await sampleLight(page, 0);
  await page.clock.fastForward(DAY_SECONDS * 500);
  const far = await geometry(page);
  expect(far.visible).toBe('hidden');
  expect(far.year).not.toBe(start.year);
  await page.clock.fastForward(DAY_SECONDS * 500);
  expect((await geometry(page)).base).toBe(start.base);
  await page.clock.fastForward((YEAR_SECONDS / 2 - DAY_SECONDS) * 1000);
  const half = await geometry(page);
  expect(half.width).toBeCloseTo(start.width, 3);
  expect(half.height).toBeCloseTo(start.height, 3);
  expect(half.x).not.toBe(start.x);
  expect(half.transmission).toBe(0);
  await sampleLight(page, YEAR_SECONDS / 2);
  await page.clock.fastForward(YEAR_SECONDS * 350);
  const eclipse = await page.evaluate(() => {
    const globe = document.querySelector('#earth-canvas').getBoundingClientRect();
    const disc = document.querySelector('.solar-corona').getBoundingClientRect();
    return (
      Math.hypot(
        disc.x + disc.width / 2 - globe.x - globe.width / 2,
        disc.y + disc.height / 2 - globe.y - globe.height / 2,
      ) / globe.width
    );
  });
  expect(eclipse).toBeLessThan(EARTH_RADIUS);
  expect((await geometry(page)).transmission).toBe(0);
  await page.clock.fastForward(YEAR_SECONDS * 150);
  const year = await geometry(page);
  expect(year.emitter).toBe(start.emitter);
  expect(year.year).toBe(start.year);
  expect(year.x).toBeCloseTo(start.x, 3);
  expect(year.y).toBeCloseTo(start.y, 3);
  expect(year.base).not.toBe(start.base);
});

test('on a phone the solar clock freezes and resumes in place on pause and tab visibility changes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await openAtSunrise(page);
  const width = (await geometry(page)).width;
  await page.clock.fastForward(6300);
  await page.getByRole('button', { name: 'Pause orbital motion' }).dispatchEvent('click');
  const paused = await geometry(page);
  await page.clock.fastForward(45_000);
  expect(await geometry(page)).toEqual(paused);
  await page.getByRole('button', { name: 'Resume orbital motion' }).dispatchEvent('click');
  expect(await geometry(page)).toEqual(paused);
  await page.clock.fastForward(5000);
  expect((await geometry(page)).emitter).not.toBe(paused.emitter);
  const visible = async (value) =>
    page.evaluate((value) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: !value });
      document.dispatchEvent(new Event('visibilitychange'));
    }, value);
  await visible(false);
  const hidden = await geometry(page);
  await page.clock.fastForward(86_400_000);
  await visible(true);
  expect(await geometry(page)).toEqual(hidden);
  await page.clock.fastForward(5000);
  const next = await geometry(page);
  expect(next.base).not.toBe(hidden.base);
  expect(next.width).toBeCloseTo(width, 3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
