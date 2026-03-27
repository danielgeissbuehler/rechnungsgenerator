/**
 * dashboard/filters.js — Filter handlers for the invoice table.
 */

import { filterState } from './state.js';
import { renderInvoiceTable } from './table.js';

/**
 * Read current filter input values and re-render the invoice table.
 */
export function dashFilterChanged() {
  const srcEl = document.getElementById('dash-search');
  const vonEl = document.getElementById('filter-betrag-von');
  const bisEl = document.getElementById('filter-betrag-bis');

  // Multiselect: read checked values
  filterState.absender   = _readMultiselect('ms-absender-list');
  filterState.empfaenger = _readMultiselect('ms-empfaenger-list');
  filterState.suche      = (srcEl && srcEl.value) || '';

  const von = vonEl ? vonEl.value : '';
  const bis = bisEl ? bisEl.value : '';
  filterState.betragVon = (von !== '' && von != null) ? parseFloat(von) : null;
  filterState.betragBis = (bis !== '' && bis != null) ? parseFloat(bis) : null;

  renderInvoiceTable();
}

/** Read checked checkbox values from a multiselect list container. */
function _readMultiselect(listId) {
  const list = document.getElementById(listId);
  if (!list) return [];
  return Array.from(list.querySelectorAll('input[type=checkbox]:checked'))
    .map(function(cb) { return cb.value; });
}

/** Toggle open/close of a multiselect dropdown. */
export function toggleMultiselect(msId) {
  const ms = document.getElementById(msId);
  if (!ms) return;
  const wasOpen = ms.classList.contains('open');
  // Close all open multiselects first
  document.querySelectorAll('.multiselect.open').forEach(function(el) {
    el.classList.remove('open');
  });
  if (!wasOpen) ms.classList.add('open');
}

/** Update the toggle button label based on selected values. */
function _updateToggleLabel(msId) {
  const ms = document.getElementById(msId);
  if (!ms) return;
  const label = ms.querySelector('.ms-label');
  if (!label) return;
  const checked = Array.from(ms.querySelectorAll('input[type=checkbox]:checked'));
  if (checked.length === 0) {
    label.textContent = 'Alle';
  } else if (checked.length === 1) {
    label.textContent = checked[0].value;
  } else {
    label.textContent = checked.length + ' ausgewählt';
  }
}

/** Handle checkbox change inside a multiselect. */
export function msCheckChanged(msId) {
  _updateToggleLabel(msId);
  dashFilterChanged();
}

// Close multiselects on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.multiselect')) {
    document.querySelectorAll('.multiselect.open').forEach(function(el) {
      el.classList.remove('open');
    });
  }
});

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
