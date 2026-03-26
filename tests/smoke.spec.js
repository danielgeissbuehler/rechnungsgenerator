import { test, expect } from '@playwright/test';

/**
 * Smoke tests for structural refactoring regression detection.
 * These verify DOM structure, CSS application, and basic interactions
 * WITHOUT requiring Supabase authentication.
 */

test.describe('App loads', () => {
  test('page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter out Supabase connection errors (expected without config)
    const realErrors = errors.filter(e => !e.includes('supabase') && !e.includes('SUPABASE') && !e.includes('fetch'));
    expect(realErrors).toEqual([]);
  });

  test('dashboard view is visible', async ({ page }) => {
    await page.goto('/');
    const dashboard = page.locator('#view-dashboard');
    await expect(dashboard).toBeVisible();
  });
});

test.describe('Dashboard structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('sidebar renders with brand, nav, and user section', async ({ page }) => {
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.sidebar-brand')).toBeVisible();
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    await expect(page.locator('.sidebar-user')).toBeVisible();
  });

  test('sidebar has correct width', async ({ page }) => {
    const sidebar = page.locator('.sidebar');
    const box = await sidebar.boundingBox();
    // --sidebar-w: 232px
    expect(box.width).toBeCloseTo(232, 0);
  });

  test('topbar renders with search and new-invoice button', async ({ page }) => {
    await expect(page.locator('.db-topbar')).toBeVisible();
    await expect(page.locator('#dash-search')).toBeVisible();
    await expect(page.locator('#topbar-dash .btn.btn-primary')).toBeVisible();
  });

  test('stat cards render (4 cards)', async ({ page }) => {
    const cards = page.locator('.stat-card');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toBeVisible();
  });

  test('filter bar renders with dropdowns', async ({ page }) => {
    await expect(page.locator('.filter-bar')).toBeVisible();
    await expect(page.locator('#filter-absender')).toBeVisible();
    await expect(page.locator('#filter-empfaenger')).toBeVisible();
  });

  test('status tabs render (6 tabs)', async ({ page }) => {
    const tabs = page.locator('.ftab');
    await expect(tabs).toHaveCount(6);
    // "Alle" tab is active by default
    await expect(tabs.first()).toHaveClass(/active/);
  });

  test('table card container exists', async ({ page }) => {
    await expect(page.locator('.table-card')).toBeVisible();
  });
});

test.describe('CSS tokens applied', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('CSS custom properties are defined', async ({ page }) => {
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    );
    expect(accent).toBeTruthy();
  });

  test('sidebar has background color applied', async ({ page }) => {
    const bg = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.sidebar')).backgroundColor
    );
    expect(bg).not.toBe('');
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('btn-primary has accent background', async ({ page }) => {
    const btn = page.locator('.btn.btn-primary').first();
    const bg = await btn.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Editor view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('editor view exists but is hidden initially', async ({ page }) => {
    const editor = page.locator('#view-editor');
    await expect(editor).toBeAttached();
    await expect(editor).not.toBeVisible();
  });

  test('editor has resize handle', async ({ page }) => {
    await expect(page.locator('#resize-handle')).toBeAttached();
  });

  test('preview wrap exists', async ({ page }) => {
    await expect(page.locator('#preview-wrap')).toBeAttached();
  });

  test('simple editor exists', async ({ page }) => {
    await expect(page.locator('#editor-simple')).toBeAttached();
  });
});

test.describe('Login modal', () => {
  test('login modal exists in DOM', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-modal')).toBeAttached();
  });

  test('login modal has email and password inputs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#login-email')).toBeAttached();
    await expect(page.locator('#login-password')).toBeAttached();
    await expect(page.locator('#login-btn')).toBeAttached();
  });
});

test.describe('Modals & overlays', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('confirm dialog exists', async ({ page }) => {
    await expect(page.locator('#confirm-modal')).toBeAttached();
  });

  test('new invoice overlay exists', async ({ page }) => {
    await expect(page.locator('#new-invoice-overlay')).toBeAttached();
  });

  test('detail panel exists', async ({ page }) => {
    await expect(page.locator('#detail-panel')).toBeAttached();
  });
});

test.describe('Status tab interaction', () => {
  test('clicking a status tab updates active class', async ({ page }) => {
    await page.goto('/');
    // Hide login modal if it's blocking (Supabase may show it)
    await page.evaluate(() => {
      const modal = document.getElementById('login-modal');
      if (modal) modal.style.display = 'none';
    });
    const offenTab = page.locator('.ftab[data-status="offen"]');
    await offenTab.click();
    await expect(offenTab).toHaveClass(/active/);
    // "Alle" tab should no longer be active
    const alleTab = page.locator('.ftab[data-status="alle"]');
    await expect(alleTab).not.toHaveClass(/active/);
  });
});
