import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const root = new URL('../../', import.meta.url);
const preview = new URL('preview-files/Okwe-David-Portfolio.html', root);
test.beforeAll(() => {
  execFileSync(process.execPath, [fileURLToPath(new URL('scripts/export-preview.mjs', root))]);
});

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, offline: true });
test('downloaded phone preview opens from a file without the gateway or any HTTP requests', async ({
  page,
}) => {
  const requests = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  await page.goto(preview.href);
  await expect(page.locator('.project-card')).toHaveCount(5);
  await page.locator('#project-visionops .project-open').click();
  await expect(page.getByRole('dialog', { name: 'VisionOps', exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator('#case-art').evaluate((img) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close case study' }).click();
  await page.getByRole('link', { name: 'Let’s talk' }).click();
  await expect(page.getByText('PREVIEW MODE', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close contact desk' }).click();
  await page.getByRole('link', { name: 'Engineering brief', exact: true }).first().click();
  await expect(page.locator('.brief-projects article:visible')).toHaveCount(5);
  await expect(page.locator('#earth-canvas')).toHaveCount(1);
  const pin = page.locator('img.base-portrait');
  await pin.evaluate((img) => img.decode());
  await expect(pin).toHaveAttribute('src', /^data:image\/webp;base64,/);
  await expect(page.locator('.universe')).toBeInViewport();
  await expect(page.locator('#offline-brief [data-orbit-toggle]')).toBeVisible();
  await page.getByRole('link', { name: /Back to portfolio/ }).click();
  await expect(page.locator('#offline-site')).toBeVisible();
  expect(requests).toEqual([]);
});
