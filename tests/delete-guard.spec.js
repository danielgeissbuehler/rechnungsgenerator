import { test, expect } from '@playwright/test';

/**
 * Tests for the delete guard:
 * - Invoices with status !== 'entwurf' must NOT be deletable
 * - Only drafts (status === 'entwurf') can be deleted
 * - Non-drafts show an error toast instead
 *
 * Covers:
 * 1. loescheAusArchiv() — archive table trash button (exposed on window)
 * 2. _dpDelete() — detail panel trash button (set by openDetailPanel)
 * 3. Detail panel delete button visibility
 */

function mockInvoice(status) {
  return {
    id: 'test-uuid-123',
    nummer: status === 'entwurf' ? null : 42,
    absender_name: 'Test AG',
    empfaenger_name: 'Kunde GmbH',
    betrag: 100,
    waehrung: 'CHF',
    status,
    created_at: '2026-01-01T00:00:00Z',
    daten: { fields: {}, positions: [], meta: [] },
  };
}

// ── Helper: install fetch mock that returns given invoice ─────────────────────
// Returns { deletes, toasts } after action runs.

// ── loescheAusArchiv (archive table) ─────────────────────────────────────────

test.describe('Delete guard: loescheAusArchiv (archive table)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const modal = document.getElementById('login-modal');
      if (modal) modal.style.display = 'none';
    });
  });

  for (const status of ['offen', 'bezahlt', 'storniert']) {
    test(`blocks delete for status "${status}"`, async ({ page }) => {
      const inv = mockInvoice(status);
      const result = await page.evaluate(async (inv) => {
        const captured = { deletes: [], toasts: [] };
        const origFetch = window.fetch;
        window.fetch = async function(url, opts) {
          const u = typeof url === 'string' ? url : url.toString();
          const m = (opts && opts.method) || 'GET';
          if (u.includes('/rest/v1/rechnungen')) {
            if (m === 'GET' && u.includes('id=eq.'))
              return new Response(JSON.stringify(inv), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (m === 'DELETE') {
              captured.deletes.push({ url: u });
              return new Response('', { status: 204 });
            }
            return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return origFetch.apply(this, arguments);
        };
        const origToast = window.showToast;
        window.showToast = (msg, type) => { captured.toasts.push({ msg, type }); };
        const origConfirm = window.showConfirm;
        window.showConfirm = async () => true;

        try { await window.loescheAusArchiv('test-uuid-123'); } catch (e) {}

        window.fetch = origFetch;
        window.showToast = origToast;
        window.showConfirm = origConfirm;
        return captured;
      }, inv);

      expect(result.deletes).toHaveLength(0);
      expect(result.toasts.length).toBeGreaterThanOrEqual(1);
      expect(result.toasts[0].type).toBe('error');
      expect(result.toasts[0].msg).toContain('storniert');
    });
  }

  test('allows delete for status "entwurf"', async ({ page }) => {
    const inv = mockInvoice('entwurf');
    const result = await page.evaluate(async (inv) => {
      const captured = { deletes: [], toasts: [] };
      const origFetch = window.fetch;
      window.fetch = async function(url, opts) {
        const u = typeof url === 'string' ? url : url.toString();
        const m = (opts && opts.method) || 'GET';
        if (u.includes('/rest/v1/rechnungen')) {
          if (m === 'GET' && u.includes('id=eq.'))
            return new Response(JSON.stringify(inv), { status: 200, headers: { 'Content-Type': 'application/json' } });
          if (m === 'DELETE') {
            captured.deletes.push({ url: u });
            return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return origFetch.apply(this, arguments);
      };
      const origToast = window.showToast;
      window.showToast = (msg, type) => { captured.toasts.push({ msg, type }); };
      const origConfirm = window.showConfirm;
      window.showConfirm = async () => true;

      try { await window.loescheAusArchiv('test-uuid-123'); } catch (e) {}

      window.fetch = origFetch;
      window.showToast = origToast;
      window.showConfirm = origConfirm;
      return captured;
    }, inv);

    expect(result.deletes).toHaveLength(1);
    expect(result.deletes[0].url).toContain('id=eq.test-uuid-123');
    const errorToasts = result.toasts.filter(t => t.type === 'error');
    expect(errorToasts).toHaveLength(0);
  });
});

// ── _dpDelete via detail panel ───────────────────────────────────────────────

test.describe('Delete guard: _dpDelete (detail panel)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const modal = document.getElementById('login-modal');
      if (modal) modal.style.display = 'none';
    });
  });

  for (const status of ['offen', 'bezahlt', 'storniert']) {
    test(`blocks delete for status "${status}"`, async ({ page }) => {
      const inv = mockInvoice(status);
      const result = await page.evaluate(async (inv) => {
        const captured = { deletes: [], toasts: [] };
        const origFetch = window.fetch;
        window.fetch = async function(url, opts) {
          const u = typeof url === 'string' ? url : url.toString();
          const m = (opts && opts.method) || 'GET';
          if (u.includes('/rest/v1/rechnungen')) {
            if (m === 'GET' && u.includes('id=eq.'))
              return new Response(JSON.stringify(inv), { status: 200, headers: { 'Content-Type': 'application/json' } });
            if (m === 'DELETE') {
              captured.deletes.push({ url: u });
              return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return origFetch.apply(this, arguments);
        };
        const origToast = window.showToast;
        window.showToast = (msg, type) => { captured.toasts.push({ msg, type }); };
        const origConfirm = window.showConfirm;
        window.showConfirm = async () => true;

        // Open detail panel to set up _dpDelete, then call it
        try { await window.openDetailPanel('test-uuid-123'); } catch (e) {}

        // Reset captured (openDetailPanel may have triggered toasts)
        captured.deletes.length = 0;
        captured.toasts.length = 0;

        try { await window._dpDelete('test-uuid-123'); } catch (e) {}

        window.fetch = origFetch;
        window.showToast = origToast;
        window.showConfirm = origConfirm;
        return captured;
      }, inv);

      expect(result.deletes).toHaveLength(0);
      expect(result.toasts.length).toBeGreaterThanOrEqual(1);
      expect(result.toasts[0].type).toBe('error');
      expect(result.toasts[0].msg).toContain('storniert');
    });
  }

  test('allows delete for status "entwurf"', async ({ page }) => {
    const inv = mockInvoice('entwurf');
    const result = await page.evaluate(async (inv) => {
      const captured = { deletes: [], toasts: [] };
      const origFetch = window.fetch;
      window.fetch = async function(url, opts) {
        const u = typeof url === 'string' ? url : url.toString();
        const m = (opts && opts.method) || 'GET';
        if (u.includes('/rest/v1/rechnungen')) {
          if (m === 'GET' && u.includes('id=eq.'))
            return new Response(JSON.stringify(inv), { status: 200, headers: { 'Content-Type': 'application/json' } });
          if (m === 'DELETE') {
            captured.deletes.push({ url: u });
            return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return origFetch.apply(this, arguments);
      };
      const origToast = window.showToast;
      window.showToast = (msg, type) => { captured.toasts.push({ msg, type }); };
      const origConfirm = window.showConfirm;
      window.showConfirm = async () => true;

      // Open detail panel to set up _dpDelete
      try { await window.openDetailPanel('test-uuid-123'); } catch (e) {}

      captured.deletes.length = 0;
      captured.toasts.length = 0;

      try { await window._dpDelete('test-uuid-123'); } catch (e) {}

      window.fetch = origFetch;
      window.showToast = origToast;
      window.showConfirm = origConfirm;
      return captured;
    }, inv);

    expect(result.deletes).toHaveLength(1);
    expect(result.deletes[0].url).toContain('id=eq.test-uuid-123');
    const errorToasts = result.toasts.filter(t => t.type === 'error');
    expect(errorToasts).toHaveLength(0);
  });
});

// ── Detail panel: delete button visibility ───────────────────────────────────

test.describe('Delete guard: detail panel button visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const modal = document.getElementById('login-modal');
      if (modal) modal.style.display = 'none';
    });
  });

  test('delete button is enabled (trash icon) for entwurf', async ({ page }) => {
    const inv = mockInvoice('entwurf');
    const result = await page.evaluate(async (inv) => {
      const origFetch = window.fetch;
      window.fetch = async function(url, opts) {
        const u = typeof url === 'string' ? url : url.toString();
        const m = (opts && opts.method) || 'GET';
        if (u.includes('/rest/v1/rechnungen') && m === 'GET' && u.includes('id=eq.'))
          return new Response(JSON.stringify(inv), { status: 200, headers: { 'Content-Type': 'application/json' } });
        if (u.includes('/rest/v1/rechnungen') && m === 'GET')
          return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        return origFetch.apply(this, arguments);
      };
      try { await window.openDetailPanel('test-uuid-123'); } catch (e) {}
      window.fetch = origFetch;
      const panel = document.getElementById('detail-panel');
      if (!panel) return { hasDelete: false, isDisabled: false };
      return {
        hasDelete: panel.innerHTML.includes('_dpDelete'),
        isDisabled: !!panel.querySelector('.icon-btn[disabled]'),
      };
    }, inv);

    expect(result.hasDelete).toBe(true);
    expect(result.isDisabled).toBe(false);
  });

  for (const status of ['offen', 'bezahlt', 'storniert']) {
    test(`delete button is disabled (ban icon) for status "${status}"`, async ({ page }) => {
      const inv = mockInvoice(status);
      const result = await page.evaluate(async (inv) => {
        const origFetch = window.fetch;
        window.fetch = async function(url, opts) {
          const u = typeof url === 'string' ? url : url.toString();
          const m = (opts && opts.method) || 'GET';
          if (u.includes('/rest/v1/rechnungen') && m === 'GET' && u.includes('id=eq.'))
            return new Response(JSON.stringify(inv), { status: 200, headers: { 'Content-Type': 'application/json' } });
          if (u.includes('/rest/v1/rechnungen') && m === 'GET')
            return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
          return origFetch.apply(this, arguments);
        };
        try { await window.openDetailPanel('test-uuid-123'); } catch (e) {}
        window.fetch = origFetch;
        const panel = document.getElementById('detail-panel');
        if (!panel) return { hasDelete: false, isDisabled: false };
        return {
          hasDelete: panel.innerHTML.includes('_dpDelete'),
          isDisabled: !!panel.querySelector('.icon-btn[disabled]'),
        };
      }, inv);

      expect(result.hasDelete).toBe(false);
      expect(result.isDisabled).toBe(true);
    });
  }
});
