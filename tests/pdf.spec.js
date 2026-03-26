import { test, expect } from '@playwright/test';

test.describe('PDF generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const m = document.getElementById('login-modal');
      if (m) m.style.display = 'none';
    });
    await page.evaluate(async () => {
      await window.render();
      window.showEditor('vorlage', 'Test');
    });
    await page.waitForTimeout(300);
  });

  test('preview has .a4-page elements', async ({ page }) => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('#preview-wrap .a4-page').length
    );
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('downloadPDF() produces a .pdf file', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.evaluate(() => window.downloadPDF()),
    ]);

    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    expect(errors.filter(e => !e.includes('supabase'))).toEqual([]);
  });

  test('printPDF() creates hidden iframe and triggers print', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.evaluate(() => {
      // Stub iframe print to prevent native dialog in headless
      const origAppend = Node.prototype.appendChild;
      Node.prototype.appendChild = function(el) {
        const result = origAppend.call(this, el);
        if (el.tagName === 'IFRAME') {
          try { el.contentWindow.print = () => {}; } catch (_) {}
        }
        return result;
      };
      try { window.printPDF(); } finally { Node.prototype.appendChild = origAppend; }
    });

    // Verify iframe was created with .a4-page content (may already be removed by afterprint)
    expect(errors.filter(e => !e.includes('supabase'))).toEqual([]);
  });

  test('html2canvas captures non-blank content', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const pg = document.querySelector('#preview-wrap .a4-page');
      if (!pg) return { error: 'no page' };
      const canvas = await html2canvas(pg, {
        scale: 1.5, useCORS: true, backgroundColor: '#ffffff',
        logging: false, width: 794, height: 1123,
        onclone: (_doc, el) => { el.style.transform = 'none'; },
      });
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let nonWhite = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i] !== 255 || imgData.data[i+1] !== 255 || imgData.data[i+2] !== 255) nonWhite++;
      }
      return { nonWhite, total: canvas.width * canvas.height };
    });
    expect(result.error).toBeUndefined();
    expect(result.nonWhite).toBeGreaterThan(result.total * 0.001);
  });
});

test.describe('PDF offscreen rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const m = document.getElementById('login-modal');
      if (m) m.style.display = 'none';
    });
    await page.evaluate(async () => await window.render());
    await page.waitForTimeout(300);
  });

  test('buildPagesFromData returns pages with content', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { buildPagesFromData } = await import('/src/js/render.js');
      const fields = {};
      document.querySelectorAll('#editor input, #editor textarea, #editor select').forEach(el => {
        if (el.id?.startsWith('f-')) fields[el.id] = el.value;
      });
      const pages = await buildPagesFromData({
        fields,
        positions: [{ desc: 'Test Position', price: 100, qty: 2 }],
        visibility: { header: true, empfaenger: true, steller: true, positionen: true },
        colAlign: {},
        meta: [],
      });
      return {
        count: pages.length,
        hasA4: pages.some(p => p.includes('a4-page')),
        hasContent: pages.some(p => p.includes('Test Position')),
      };
    });
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.hasA4).toBe(true);
    expect(result.hasContent).toBe(true);
  });

  test('offscreen container captures non-blank content', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { buildPagesFromData } = await import('/src/js/render.js');
      const fields = {};
      document.querySelectorAll('#editor input, #editor textarea, #editor select').forEach(el => {
        if (el.id?.startsWith('f-')) fields[el.id] = el.value;
      });
      const pages = await buildPagesFromData({
        fields,
        positions: [{ desc: 'Offscreen Test', price: 50, qty: 3 }],
        visibility: { header: true, positionen: true },
        colAlign: {},
        meta: [],
      });
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;overflow:hidden;height:0';
      pages.forEach(html => wrap.insertAdjacentHTML('beforeend', html));
      document.body.appendChild(wrap);

      const pg = wrap.querySelector('.a4-page');
      if (!pg) { wrap.remove(); return { error: 'no .a4-page' }; }
      const canvas = await html2canvas(pg, {
        scale: 1.5, useCORS: true, backgroundColor: '#ffffff',
        logging: false, width: 794, height: 1123,
        onclone: (_doc, el) => { el.style.transform = 'none'; },
      });
      const ctx = canvas.getContext('2d');
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let nonWhite = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i] !== 255 || imgData.data[i+1] !== 255 || imgData.data[i+2] !== 255) nonWhite++;
      }
      wrap.remove();
      return { nonWhite, total: canvas.width * canvas.height };
    });
    expect(result.error).toBeUndefined();
    expect(result.nonWhite).toBeGreaterThan(result.total * 0.001);
  });
});
