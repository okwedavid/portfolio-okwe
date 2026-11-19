import { test, expect } from '@playwright/test';

test('the sky stays fixed and animates below the hero; only the work cards paint an opaque surface', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#about');
  const sky = page.locator('.universe');
  await expect(sky).toHaveCount(1);
  await expect(sky).toHaveCSS('position', 'fixed');
  await expect(sky).toBeInViewport();
  for (const id of ['overview', 'projects', 'expertise', 'about', 'contact']) {
    await expect(page.locator(`#${id}`)).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator(`#${id}`)).toHaveCSS('background-image', 'none');
  }
  await expect(page.locator('.project-card').first()).toHaveCSS(
    'background-color',
    'rgb(16, 22, 25)',
  );
  await expect(page.locator('#overview')).not.toBeInViewport();
  const tracer = sky.locator('.orbital-tracer');
  await expect(tracer).toHaveAttribute('cx', /\d/);
  const x = await tracer.getAttribute('cx');
  await expect.poll(() => tracer.getAttribute('cx')).not.toBe(x);
  const pause = page.getByRole('button', { name: 'Pause orbital motion' });
  await expect(pause).toBeInViewport();
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume orbital motion' })).toBeVisible();
});

test('mobile About puts a decoded, truly transparent portrait above the biography', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#about');
  const image = page.getByRole('img', { name: 'Portrait of Okwe David' });
  await expect(image).toBeInViewport();
  const pixels = await image.evaluate(async (img) => {
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 60;
    c.height = 71;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 60, 71);
    return [ctx.getImageData(0, 0, 1, 1).data[3], ctx.getImageData(30, 26, 1, 1).data[3]];
  });
  expect(pixels).toEqual([0, 255]);
  const portrait = await page.locator('.profile-portrait').boundingBox();
  const copy = await page.locator('.about-copy').boundingBox();
  expect(portrait.y + portrait.height).toBeLessThanOrEqual(copy.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the separate engineering brief has a screen backdrop but prints without it', async ({
  page,
}) => {
  await page.goto('/engineering-brief.html');
  await expect(page.locator('.universe')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Resume orbital motion' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.universe')).toBeHidden();
  await expect(page.locator('.brief-projects article')).toHaveCount(5);
});
