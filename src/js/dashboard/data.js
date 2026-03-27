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

  // Absender multiselect
  _populateMultiselect('ms-absender', 'ms-absender-list',
    allRechnungen.map(function(r) { return r.absender_name; }),
    filterState.absender);

  // Empfänger multiselect
  _populateMultiselect('ms-empfaenger', 'ms-empfaenger-list',
    allRechnungen.map(function(r) { return r.empfaenger_name; }),
    filterState.empfaenger);

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

/** Populate a multiselect dropdown with checkbox options. */
function _populateMultiselect(msId, listId, values, selected) {
  const list = document.getElementById(listId);
  if (!list) return;
  const unique = Array.from(new Set(values.filter(Boolean))).sort();
  list.innerHTML = unique.map(function(n) {
    const checked = selected.indexOf(n) !== -1 ? ' checked' : '';
    return '<label class="ms-option">'
      + '<input type="checkbox" value="' + escHtml(n) + '"' + checked
      + ' onchange="msCheckChanged(\'' + escHtml(msId) + '\')">'
      + escHtml(n) + '</label>';
  }).join('');
  // Update toggle label
  const ms = document.getElementById(msId);
  if (ms) {
    const label = ms.querySelector('.ms-label');
    if (label) {
      label.textContent = selected.length === 0 ? 'Alle'
        : selected.length === 1 ? selected[0]
        : selected.length + ' ausgewählt';
    }
  }
}
