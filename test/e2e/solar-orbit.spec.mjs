import { test, expect } from '@playwright/test';
import {
  DAY_SECONDS,
  EARTH_RADIUS,
  solarState,
  POSTER_UTC,
  cameraAt,
} from '../../src/solar-motion.js';

// Exercise the actual material even on a CI machine without a hardware GPU.
test.use({
  reducedMotion: 'no-preference',
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});
async function openAtSunrise(page) {
  await page.clock.install({ time: new Date(POSTER_UTC - 60_000) });
  await page.clock.pauseAt(new Date(POSTER_UTC));
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
  const [sx, sy] = solarState(t, cameraAt(POSTER_UTC)).sun;
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

test('UTC lights the real framebuffer while the same geographic point carries the portrait pin around a fixed-size globe', async ({
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
  await sampleLight(page, POSTER_UTC);
  const pin = page.locator('.base-portrait');
  await expect(pin).toBeVisible();
  const aligned = await page.evaluate(() => {
    const p = document.querySelector('.base-portrait'),
      origin = document.querySelector('#base-marker').transform.baseVal.getItem(0).matrix;
    return Math.hypot(
      10 * parseFloat(p.style.left) - origin.e,
      10 * parseFloat(p.style.top) - origin.f,
    );
  });
  expect(aligned).toBeLessThan(0.09);
  await page.clock.fastForward(56_000); // the old implementation would already have spun completely
  const near = await geometry(page);
  expect(near.visible).toBe('visible');
  expect(near.base).not.toBe(start.base);
  expect(Math.abs(near.x - start.x)).toBeLessThan(0.02);
  await page.clock.fastForward(Math.round(DAY_SECONDS * 500) - 56_000);
  await expect(pin).toBeHidden();
  await page.clock.fastForward(Math.round(DAY_SECONDS * 500));
  await expect(pin).toBeVisible();
  expect((await geometry(page)).base).toBe(start.base);
  const halfYear = 182 * 86400000;
  await page.clock.fastForward(halfYear - 2 * Math.round(DAY_SECONDS * 500));
  const half = await geometry(page);
  expect(half.width).toBeCloseTo(start.width, 3);
  expect(half.height).toBeCloseTo(start.height, 3);
  expect(half.transmission).toBe(0);
  await sampleLight(page, POSTER_UTC + halfYear);
});

const stars = (page) =>
  page.locator('#starfield').evaluate((c) => {
    const bytes = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let h = 5381;
    for (let i = 3; i < bytes.length; i += 4) h = (Math.imul(33, h) + bytes[i]) | 0;
    return h;
  });
test('stars scintillate independently; pausing holds the sky and returning from a hidden tab resyncs to UTC', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await openAtSunrise(page);
  const clockLabel = await page.locator('.scene-caption').boundingBox();
  const baseLabel = await page.locator('#base-marker rect').boundingBox();
  expect(clockLabel.x + clockLabel.width).toBeLessThan(baseLabel.x);
  const initial = await stars(page);
  await page.clock.fastForward(3800);
  expect(await stars(page)).not.toBe(initial);
  await page.getByRole('button', { name: 'Pause orbital motion' }).dispatchEvent('click');
  const frozen = await geometry(page),
    sky = await stars(page);
  await page.clock.fastForward(6 * 3600000);
  expect(await geometry(page)).toEqual(frozen);
  expect(await stars(page)).toBe(sky);
  await expect(page.locator('.orbit-mode')).toHaveText('Earth / hold');
  await page.getByRole('button', { name: 'Resume orbital motion' }).dispatchEvent('click');
  expect((await geometry(page)).base).not.toBe(frozen.base);
  await expect(page.locator('.orbit-stamp')).toContainText('01:10 UTC');
  const visibility = async (hidden) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
  await visibility(true);
  const hidden = await geometry(page);
  await page.clock.fastForward(9 * 3600000);
  expect(await geometry(page)).toEqual(hidden);
  await visibility(false);
  expect((await geometry(page)).base).not.toBe(hidden.base);
  await expect(page.locator('.orbit-stamp')).toContainText('10:10 UTC');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
