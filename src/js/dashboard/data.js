/**
 * dashboard/data.js — Invoice data loading and filter dropdown population.
 */

import { fetchRechnungen, isConfigured } from '../supabase.js';
import { escHtml } from '../utils.js';
import { allRechnungen, setAllRechnungen, filterState } from './state.js';
import { renderDashboardStats } from './stats.js';
import { renderInvoiceTable } from './table.js';

/**
 * Fetch all invoices from Supabase, populate filter dropdowns, render stats + table.
 */
export async function loadRechnungen() {
  if (!isConfigured()) {
    setAllRechnungen([]);
    renderDashboardStats([]);
    renderInvoiceTable();
    return;
  }

  try {
    setAllRechnungen(await fetchRechnungen());
  } catch (err) {
    console.error('loadRechnungen:', err);
    setAllRechnungen([]);
  }

  // allRechnungen is a live ES module binding — reads the updated value directly

  // Absender filter dropdown
  const absEl = document.getElementById('filter-absender');
  if (absEl) {
    const unique = Array.from(
      new Set(allRechnungen.map(function(r) { return r.absender_name; }).filter(Boolean))
    ).sort();
    absEl.innerHTML = '<option value="">Alle</option>'
      + unique.map(function(n) {
          return '<option value="' + escHtml(n) + '">' + escHtml(n) + '</option>';
        }).join('');
    absEl.value = filterState.absender;
  }

  // Empfanger filter dropdown
  const empEl = document.getElementById('filter-empfaenger');
  if (empEl) {
    const unique = Array.from(
      new Set(allRechnungen.map(function(r) { return r.empfaenger_name; }).filter(Boolean))
    ).sort();
    empEl.innerHTML = '<option value="">Alle</option>'
      + unique.map(function(n) {
          return '<option value="' + escHtml(n) + '">' + escHtml(n) + '</option>';
        }).join('');
    empEl.value = filterState.empfaenger;
  }

  // Kopie select in new-invoice modal
  const kopieEl = document.getElementById('modal-kopie-select');
  if (kopieEl) {
    const opts = allRechnungen
      .filter(function(r) { return r.status !== 'entwurf'; })
      .map(function(r) {
        const numPart = r.nummer ? 'Nr.\u00A0' + r.nummer : 'Entwurf';
        const label   = numPart + ' \u2013 ' + (r.empfaenger_name || '\u2014');
        return '<option value="' + escHtml(r.id) + '">' + escHtml(label) + '</option>';
      })
      .join('');
    kopieEl.innerHTML = '<option value="">\u2014 Rechnung w\u00E4hlen \u2014</option>' + opts;
  }

  renderDashboardStats(allRechnungen);
  renderInvoiceTable();
}
