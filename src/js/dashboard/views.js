/**
 * dashboard/views.js — View switching between dashboard, editor, and Stammdaten.
 */

import { fillSimpleEditor } from '../editor-simple.js';
import { scalePreview } from '../ui.js';
import { loadRechnungen } from './data.js';
import { renderAbsenderTable, renderEmpfaengerTable, renderVorlagenTable } from './stammdaten.js';
import { state } from '../state.js';

const STAMM_TITLES = { absender: 'Absender', empfaenger: 'Empf\u00E4nger', vorlagen: 'Vorlagen' };

function setActiveNav(key) {
  document.querySelectorAll('.nav-item[data-nav]').forEach(el => {
    el.classList.toggle('active', el.dataset.nav === key);
  });
}

/** Hide all Stammdaten containers. */
function hideStammViews() {
  document.querySelectorAll('.stamm-container').forEach(function(el) {
    el.classList.remove('active');
  });
}

/** Show/hide the dashboard-specific elements (stats, filters, rechnungen card). */
function setDashboardVisible(visible) {
  const display = visible ? '' : 'none';
  const statsRow = document.getElementById('dash-stats-row');
  const filterBar = document.getElementById('dash-filter-bar');
  const rechnungenCard = document.getElementById('rechnungen-card');
  if (statsRow)       statsRow.style.display       = display;
  if (filterBar)      filterBar.style.display      = display;
  if (rechnungenCard) rechnungenCard.style.display = display;
}

/**
 * Show the dashboard view, hide the editor and Stammdaten, and reload invoices.
 */
export function showDashboard() {
  const vEditor      = document.getElementById('view-editor');
  const topbarDash   = document.getElementById('topbar-dash');
  const topbarEditor = document.getElementById('topbar-editor');

  if (vEditor)      vEditor.style.display      = 'none';
  if (topbarDash)   topbarDash.style.display   = 'contents';
  if (topbarEditor) topbarEditor.style.display = 'none';

  state.currentVorlageName = null;

  // Show dashboard elements, hide Stammdaten
  setDashboardVisible(true);
  hideStammViews();

  // Update topbar title
  const titleEl = document.querySelector('#topbar-dash .topbar-title');
  if (titleEl) titleEl.textContent = 'Rechnungen';

  // Restore "Neue Rechnung" button
  const neueBtn = document.querySelector('#topbar-dash .btn-primary');
  if (neueBtn) neueBtn.style.display = '';

  setActiveNav('dashboard');

  loadRechnungen();
}

/**
 * Show a Stammdaten view (absender, empfaenger, vorlagen).
 * @param {'absender'|'empfaenger'|'vorlagen'} type
 */
export function showStammdatenView(type) {
  const vEditor      = document.getElementById('view-editor');
  const topbarDash   = document.getElementById('topbar-dash');
  const topbarEditor = document.getElementById('topbar-editor');

  if (vEditor)      vEditor.style.display      = 'none';
  if (topbarDash)   topbarDash.style.display   = 'contents';
  if (topbarEditor) topbarEditor.style.display = 'none';

  state.currentVorlageName = null;

  // Hide dashboard-specific elements
  setDashboardVisible(false);
  hideStammViews();

  // Show the selected Stammdaten container
  const container = document.getElementById('stamm-' + type);
  if (container) container.classList.add('active');

  // Update topbar title
  const titleEl = document.querySelector('#topbar-dash .topbar-title');
  if (titleEl) titleEl.textContent = STAMM_TITLES[type] || type;

  // Hide "Neue Rechnung" button in topbar for Stammdaten views
  const neueBtn = document.querySelector('#topbar-dash .btn-primary');
  if (neueBtn) neueBtn.style.display = 'none';

  setActiveNav(type);

  // Render the table
  if (type === 'absender')   renderAbsenderTable();
  if (type === 'empfaenger') renderEmpfaengerTable();
  if (type === 'vorlagen')   renderVorlagenTable();
}

/**
 * Show the editor view over the app shell. Dashboard sidebar stays visible.
 * @param {'new'|'edit'|'copy'} [mode='new']
 * @param {string} [titleText='Neue Rechnung']
 */
export function showEditor(mode, titleText) {
  if (mode      == null) mode      = 'new';
  if (titleText == null) titleText = 'Neue Rechnung';

  const vEditor      = document.getElementById('view-editor');
  const topbarDash   = document.getElementById('topbar-dash');
  const topbarEditor = document.getElementById('topbar-editor');

  if (vEditor)      vEditor.style.display      = 'flex';
  if (topbarDash)   topbarDash.style.display   = 'none';
  if (topbarEditor) topbarEditor.style.display = 'contents';

  const titleEl = document.getElementById('editor-topbar-title');
  if (titleEl) titleEl.textContent = titleText;

  // Back button: Vorlagen → Vorlagenübersicht, sonst → Rechnungsübersicht
  const backBtn = topbarEditor?.querySelector('.btn-ghost');
  if (backBtn) {
    backBtn.setAttribute('onclick', mode === 'vorlage'
      ? "showStammdatenView('vorlagen')"
      : 'showDashboard()');
  }

  // Einfacher Editor für normale Rechnungen, voller Editor nur für Vorlagen
  const isSimple = mode !== 'vorlage';
  if (vEditor) vEditor.classList.toggle('simple-mode', isSimple);
  if (isSimple) fillSimpleEditor();

  // Scale preview to fit available width after layout settles
  requestAnimationFrame(() => scalePreview());
}
