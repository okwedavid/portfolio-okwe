import { test, expect } from '@playwright/test';

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
