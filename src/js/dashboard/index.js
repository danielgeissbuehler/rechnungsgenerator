/**
 * dashboard/index.js — Barrel re-exports, window assignments, click-to-close listener,
 * and table row quick-action handlers.
 */

import { fetchRechnungById } from '../supabase.js';
import { buildPagesFromData } from '../render.js';
import { downloadPDF, printPDF } from '../pdf.js';
import { currentDetailId } from './state.js';

// ── Re-exports ────────────────────────────────────────────────────────────────
export { showDashboard, showEditor, showStammdatenView } from './views.js';
export { loadRechnungen } from './data.js';
export { renderDashboardStats } from './stats.js';
export { dashFilterChanged, dashSetStatusTab, toggleMultiselect, msCheckChanged } from './filters.js';
export { renderInvoiceTable, dashSortBy } from './table.js';
export { openDetailPanel, closeDetailPanel, handleStatusChange } from './detail-panel.js';
export { handleNeueRechnung, closeNeueRechnungModal, confirmNeueRechnung, handleKopieRechnung } from './new-invoice.js';
export { openAbsenderModal, openEmpfaengerModal, openVorlageEditor } from './stammdaten.js';

// ── Imports for window assignments ────────────────────────────────────────────
import { showDashboard, showEditor, showStammdatenView } from './views.js';
import { loadRechnungen } from './data.js';
import { renderDashboardStats } from './stats.js';
import { dashFilterChanged, dashSetStatusTab, toggleMultiselect, msCheckChanged } from './filters.js';
import { renderInvoiceTable, dashSortBy } from './table.js';
import { openDetailPanel, closeDetailPanel, handleStatusChange } from './detail-panel.js';
import { handleNeueRechnung, closeNeueRechnungModal, confirmNeueRechnung, handleKopieRechnung } from './new-invoice.js';
import { openAbsenderModal, openEmpfaengerModal, openVorlageEditor } from './stammdaten.js';

// ── Dashboard click-to-close ──────────────────────────────────────────────────
// Close the detail panel when clicking anywhere in the dashboard that isn't
// the panel itself or an invoice row (which will switch to that invoice).
document.addEventListener('click', function(e) {
  if (!currentDetailId) return;
  if (e.target.closest('#detail-panel')) return;
  if (e.target.closest('#dash-table-container tbody tr')) return;
  closeDetailPanel();
});

// ── Window exports ────────────────────────────────────────────────────────────
// All functions invoked from HTML onclick attributes must be on window.

window.showDashboard          = showDashboard;
window.showEditor             = showEditor;
window.showStammdatenView     = showStammdatenView;
window.dashFilterChanged      = dashFilterChanged;
window.dashSetStatusTab       = dashSetStatusTab;
window.toggleMultiselect      = toggleMultiselect;
window.msCheckChanged         = msCheckChanged;
window.openDetailPanel        = openDetailPanel;
window.closeDetailPanel       = closeDetailPanel;
window.handleStatusChange     = handleStatusChange;
window.handleNeueRechnung     = handleNeueRechnung;
window.closeNeueRechnungModal = closeNeueRechnungModal;
window.confirmNeueRechnung    = confirmNeueRechnung;
window.handleKopieRechnung    = handleKopieRechnung;
window.loadRechnungen         = loadRechnungen;
window.renderDashboardStats   = renderDashboardStats;
window.renderInvoiceTable     = renderInvoiceTable;
window.openAbsenderModal      = openAbsenderModal;
window.openEmpfaengerModal    = openEmpfaengerModal;
window.openVorlageEditor      = openVorlageEditor;

// ── Table row quick-action handlers ──────────────────────────────────────────

/**
 * Render invoice A4 pages into a hidden off-screen container for PDF generation.
 * @param {Object} daten - invoice.daten JSONB
 * @returns {HTMLElement}
 */
async function renderOffscreen(daten) {
  const wrap = document.createElement('div');
  // Must stay on-screen and visible for html2canvas to capture content.
  // Use z-index:-1 to hide behind the UI, clip to zero visual height.
  wrap.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;overflow:hidden;height:0';
  const pages = await buildPagesFromData(daten);
  pages.forEach(function(pageHtml) { wrap.insertAdjacentHTML('beforeend', pageHtml); });
  document.body.appendChild(wrap);
  return wrap;
}

window._rowEdit = async function(id) {
  const r = await fetchRechnungById(id);
  if (!r) return;
  if (r.status === 'entwurf') {
    if (typeof window.ladeEntwurf === 'function') await window.ladeEntwurf(r.id);
  } else {
    if (typeof window.ladeAusArchiv === 'function') await window.ladeAusArchiv(r.id);
  }
  const numStr    = r.nummer ? '#' + String(r.nummer).padStart(3, '0') : 'Entwurf';
  const titleText = r.status === 'entwurf' ? 'Entwurf bearbeiten' : 'Rechnung ' + numStr;
  showEditor('edit', titleText);
};

window._rowDownload = async function(id) {
  const r = await fetchRechnungById(id);
  if (!r) return;
  const wrap     = await renderOffscreen(r.daten);
  const rawName  = (r.empfaenger_name) || 'Rechnung';
  const filename = rawName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  await downloadPDF(wrap, filename);
  wrap.remove();
};

window._rowPrint = async function(id) {
  const r = await fetchRechnungById(id);
  if (!r) return;
  const wrap = await renderOffscreen(r.daten);
  await printPDF(wrap);
  wrap.remove();
};

window._rowDelete = async function(id) {
  if (typeof window._dpDelete === 'function') await window._dpDelete(id);
};
