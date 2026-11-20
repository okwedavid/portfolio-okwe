import { test, expect } from '@playwright/test';
// Exercise WebGL even on a headless runner without a hardware GPU.
test.use({
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  },
});

test('the shared mesh turns on horizontal pointer motion and the accessible turntable reaches both profiles and the back', async ({
  page,
}) => {
  const model = [];
  page.on('request', (r) => {
    if (/\.glb($|\?)/.test(r.url())) model.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const mini = page.locator('.base-bust.model-ready canvas');
  await expect(mini).toBeVisible();
  const pixels = (canvas) =>
    canvas.evaluate((c) => {
      const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
      let sum = 5381,
        left = c.width,
        right = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 120) {
          const x = (i / 4) % c.width;
          left = Math.min(left, x);
          right = Math.max(right, x);
          sum = (Math.imul(sum, 33) + data[i] + data[i + 1]) | 0;
        }
      }
      return { hash: sum, width: right - left };
    });
  const before = await pixels(mini);
  await page.mouse.move(1190, 340);
  await expect.poll(async () => (await pixels(mini)).hash).not.toBe(before.hash);
  await page.locator('.portrait-shortcut').click();
  const large = page.locator('.portrait-stage.model-ready canvas');
  await expect(large).toBeInViewport();
  const slider = page.getByRole('slider', { name: /portrait yaw/i });
  await slider.focus();
  const angle = async (n) => {
    await slider.fill(String(n));
    return pixels(large);
  };
  const front = await angle(0),
    side = await angle(90),
    back = await angle(180),
    left = await angle(-90);
  expect(side.width).toBeLessThan(front.width * 0.8);
  expect(new Set([front.hash, side.hash, back.hash, left.hash]).size).toBe(4);
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('-89');
  await page.getByRole('button', { name: 'Face front' }).click();
  await expect.poll(async () => (await pixels(large)).hash).toBe(front.hash);
  expect(model).toHaveLength(1);
});
test('reduced motion keeps the stills until an explicit portrait request, without starting the sky', async ({
  page,
}) => {
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/#about', { waitUntil: 'networkidle' });
  expect(requests.some((u) => u.endsWith('.glb'))).toBe(false);
  await page.getByRole('button', { name: 'View in 3D' }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await expect(page.locator('.orbit-mode')).toHaveText('Earth / still');
  expect(requests.some((u) => /\/(day|night)\..*webp/.test(u))).toBe(false);
});
test('native GitHub actions navigate in the current top-level tab rather than reopening a case or relying on a popup', async ({
  page,
  context,
}) => {
  // Offline fixture for CI; the public profile and repository were also clicked against GitHub during release QA.
  await page.route('https://github.com/**', (r) =>
    r.fulfill({ contentType: 'text/html', body: '<title>External destination</title>' }),
  );
  for (const [where, path] of [
    ['.hero-actions a[href*="github"]', '/okwedavid'],
    ['#project-sage .project-source', '/okwedavid/sage'],
    ['#case-repo', '/okwedavid/vision'],
  ]) {
    await page.goto('/');
    if (where === '#case-repo') await page.locator('#project-vision .project-open').click();
    await page.locator(where).click();
    await expect(page).toHaveURL('https://github.com' + path);
    expect(context.pages()).toHaveLength(1);
  }
});
test('an embed that blocks both navigation and popups exposes the real link for copying', async ({
  page,
}) => {
  await page.route('**/__embed', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<iframe style="width:100%;height:700px" sandbox="allow-scripts allow-same-origin" src="/"></iframe>',
    }),
  );
  await page.goto('/__embed');
  const frame = page.frameLocator('iframe');
  await frame.locator('.hero-actions a[href*="github"]').click({ noWaitAfter: true });
  await expect(frame.getByRole('textbox', { name: 'GitHub address' })).toHaveValue(
    'https://github.com/okwedavid',
  );
  await frame.getByRole('button', { name: 'Dismiss link options' }).click();
  await expect(frame.locator('.link-recovery')).toHaveCount(0);
});
