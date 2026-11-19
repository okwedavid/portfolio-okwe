import { test, expect } from '@playwright/test';

test('five project cases have the intended repository, demo and architecture evidence', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Okwe David.');
  for (const [id, title, repo, demo] of [
    ['agentfinance', 'AgentFinance', 'okwedavid/agentfinance', 'https://agentfinance.onrender.com'],
    ['sage', 'SAGE', 'okwedavid/sage', 'https://sage-fx1l.onrender.com'],
    ['visionops', 'VisionOps', 'okwedavid/VisionOPs', 'https://visionops-uypi.onrender.com'],
    ['skywatch', 'Sky Watch', 'Snrboi/sky-watch-dashboard', 'https://skywatch-x6yn.onrender.com'],
    ['vision', 'Vision', 'okwedavid/vision', null],
  ]) {
    const link = page.locator(`#project-${id} .project-open`);
    await link.click();
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('dd')).toHaveCount(3);
    await expect(dialog.getByRole('link', { name: 'Source code' })).toHaveAttribute(
      'href',
      'https://github.com/' + repo,
    );
    if (demo)
      await expect(dialog.getByRole('link', { name: 'Open demo' })).toHaveAttribute('href', demo);
    else await expect(dialog.getByRole('link', { name: 'Open demo' })).toHaveCount(0);
    await expect(dialog.locator('.evidence-link')).toHaveAttribute('href', new RegExp(repo));
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(link).toBeFocused();
  }
});
test('role filters and expertise links work without trapping hidden projects', async ({ page }) => {
  await page.goto('/#projects');
  for (const [name, n] of [
    ['Frontend', 2],
    ['AI systems', 3],
    ['Full-stack', 4],
    ['All work', 5],
  ]) {
    await page.getByRole('button', { name, exact: name !== 'All work' }).click();
    await expect(page.locator('.project-card:visible')).toHaveCount(n);
  }
  await page.getByRole('link', { name: 'Inside SAGE' }).click();
  await expect(page.getByRole('dialog', { name: 'SAGE', exact: true })).toBeVisible();
});
test('preview handoff stays local: example, edit, phone, reset; no POST', async ({ page }) => {
  const posts = [];
  page.on('request', (r) => {
    if (r.method() === 'POST') posts.push(r.url());
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Let’s talk' }).click();
  const desk = page.getByRole('dialog', { name: 'Contact desk.' });
  await expect(desk.getByText('PREVIEW MODE', { exact: true })).toBeVisible();
  await desk.getByRole('button', { name: 'Use an example' }).click();
  await desk.getByRole('button', { name: 'Preview WhatsApp handoff' }).click();
  await expect(page.locator('#handoff-text')).toContainText('alex@example.com');
  await expect(desk.getByText('HANDOFF PREVIEW · NOT SENT')).toBeVisible();
  await desk.getByRole('button', { name: 'Edit brief' }).click();
  await desk.getByRole('button', { name: 'Phone intake' }).click();
  await expect(page.locator('#brief-input')).toHaveValue('');
  await desk.getByLabel('Sample call transcript').fill('Please call me about a role.');
  await desk.getByRole('button', { name: 'Preview WhatsApp handoff' }).click();
  await expect(page.locator('#handoff-text')).toContainText('Phone');
  await desk.getByRole('button', { name: 'Close contact desk' }).click();
  await page.getByRole('link', { name: 'Let’s talk' }).click();
  await expect(page.locator('#brief-input')).toHaveValue('');
  await expect(page.locator('#handoff-text')).toBeEmpty();
  expect(posts).toEqual([]);
});
test('mobile navigation, selected section, image loads, and narrow-screen layout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('#main-nav').getByRole('link', { name: 'Projects' }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.locator('.project-image img').first()).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page
      .locator('.project-image img')
      .first()
      .evaluate((i) => i.complete && i.naturalWidth > 0),
  ).toBe(true);
});
test('reduced motion defaults to the local Earth poster without downloading GPU maps', async ({
  page,
}) => {
  const maps = [];
  page.on('request', (r) => {
    if (/\/(day|night)\..*webp/.test(r.url())) maps.push(r.url());
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Resume orbital motion' })).toBeVisible();
  await expect(page.locator('.earth-poster')).toBeVisible();
  expect(maps).toEqual([]);
});
test('printable brief and source-only cards work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000');
  await expect(page.locator('.project-open')).toHaveCount(5);
  await expect(page.locator('#project-vision a.project-open')).toHaveAttribute(
    'href',
    'https://github.com/okwedavid/vision',
  );
  await page.getByRole('link', { name: 'Engineering brief', exact: true }).first().click();
  await expect(page).toHaveTitle(/Engineering brief/);
  await expect(page.locator('.brief-projects article')).toHaveCount(5);
  await context.close();
});

test('configured public channels reveal only mailto/tel actions, never a web send button', async ({
  page,
}) => {
  await page.route('**/api/contact', (route) =>
    route.fulfill({ json: { voice: '+12025550113', email: 'desk@example.invalid' } }),
  );
  await page.goto('/');
  await page.getByRole('link', { name: 'Let’s talk' }).click();
  await expect(page.getByText('CHANNEL CONNECTED', { exact: true })).toBeVisible();
  await expect(page.locator('#channel-link')).toHaveAttribute(
    'href',
    'mailto:desk@example.invalid',
  );
  await page.getByRole('button', { name: 'Phone intake' }).click();
  await expect(page.locator('#channel-link')).toHaveAttribute('href', 'tel:+12025550113');
  await expect(page.getByRole('button', { name: 'Preview WhatsApp handoff' })).toBeVisible();
});

test('WebGL-unavailable visitor gets Earth, working project links, and persistent pause', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (this.id === 'earth-canvas' && type === 'webgl') return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto('/');
  await expect(page.locator('.earth-poster')).toBeVisible();
  await page.getByRole('button', { name: 'Pause orbital motion' }).click();
  await expect(page.getByRole('button', { name: 'Resume orbital motion' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume orbital motion' })).toBeVisible();
  await page.locator('#project-visionops .project-open').click();
  await expect(page.getByRole('dialog', { name: 'VisionOps', exact: true })).toBeVisible();
});
