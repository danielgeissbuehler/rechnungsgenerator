/**
 * dashboard/filters.js — Filter handlers for the invoice table.
 */

import { filterState } from './state.js';
import { renderInvoiceTable } from './table.js';

/**
 * Read current filter input values and re-render the invoice table.
 */
export function dashFilterChanged() {
  const absEl = document.getElementById('filter-absender');
  const empEl = document.getElementById('filter-empfaenger');
  const srcEl = document.getElementById('dash-search');
  const vonEl = document.getElementById('filter-betrag-von');
  const bisEl = document.getElementById('filter-betrag-bis');

  filterState.absender   = (absEl && absEl.value)  || '';
  filterState.empfaenger = (empEl && empEl.value)  || '';
  filterState.suche      = (srcEl && srcEl.value)  || '';

  const von = vonEl ? vonEl.value : '';
  const bis = bisEl ? bisEl.value : '';
  filterState.betragVon = (von !== '' && von != null) ? parseFloat(von) : null;
  filterState.betragBis = (bis !== '' && bis != null) ? parseFloat(bis) : null;

  renderInvoiceTable();
}

/**
 * Activate a status filter tab.
 * @param {HTMLElement} el - clicked .ftab element
 */
export function dashSetStatusTab(el) {
  document.querySelectorAll('#dash-status-tabs .ftab').forEach(function(t) {
    t.classList.remove('active');
  });
  el.classList.add('active');
  filterState.status = el.dataset.status || 'alle';
  renderInvoiceTable();
}
