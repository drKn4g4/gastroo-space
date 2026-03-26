import { expect, test, type Page } from '@playwright/test';

type ViewportCase = {
  name: string;
  width: number;
  height: number;
};

const viewportMatrix: ViewportCase[] = [
  { name: 'mobile-small-portrait', width: 360, height: 640 },
  { name: 'mobile-small-landscape', width: 640, height: 360 },
  { name: 'mobile-large-portrait', width: 430, height: 932 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop-default', width: 1280, height: 800 },
];

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  expect(overflow).toBeFalsy();
}

async function assertInteractiveTargetsVisible(page: Page) {
  const interactive = page
    .locator('a, button, input, select, textarea, [role="button"]')
    .filter({ hasNotText: /^\s*$/ })
    .filter({ has: page.locator(':visible') });

  const count = await interactive.count();
  expect(count).toBeGreaterThan(0);

  const sample = Math.min(count, 5);
  for (let i = 0; i < sample; i += 1) {
    const box = await interactive.nth(i).boundingBox();
    if (!box) continue;
    expect(box.width).toBeGreaterThanOrEqual(32);
    expect(box.height).toBeGreaterThanOrEqual(32);
  }
}

test.describe('PWA responsive matrix', () => {
  for (const vp of viewportMatrix) {
    test(`layout is stable on ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/pl', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();

      await assertNoHorizontalOverflow(page);
      await assertInteractiveTargetsVisible(page);
    });
  }

  test('manifest is exposed and contains required keys', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();

    const manifest = (await response.json()) as {
      name?: string;
      short_name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ src?: string; sizes?: string }>;
    };

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect((manifest.icons ?? []).length).toBeGreaterThan(0);
  });

  test('offline route is reachable', async ({ page }) => {
    await page.goto('/offline', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });
});
