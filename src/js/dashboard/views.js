/**
 * dashboard/views.js — View switching between dashboard and editor.
 */

import { fillSimpleEditor } from '../editor-simple.js';
import { scalePreview } from '../ui.js';
import { loadRechnungen } from './data.js';

/**
 * Show the dashboard view, hide the editor, and reload invoices.
 */
export function showDashboard() {
  const vEditor      = document.getElementById('view-editor');
  const topbarDash   = document.getElementById('topbar-dash');
  const topbarEditor = document.getElementById('topbar-editor');

  if (vEditor)      vEditor.style.display      = 'none';
  if (topbarDash)   topbarDash.style.display   = 'contents';
  if (topbarEditor) topbarEditor.style.display = 'none';

  // Mark first nav-item (Dashboard) active
  document.querySelectorAll('.nav-item').forEach(function(el, i) {
    el.classList.toggle('active', i === 0);
  });

  loadRechnungen();
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

  // Einfacher Editor für normale Rechnungen, voller Editor nur für Vorlagen
  const isSimple = mode !== 'vorlage';
  if (vEditor) vEditor.classList.toggle('simple-mode', isSimple);
  if (isSimple) fillSimpleEditor();

  // Scale preview to fit available width after layout settles
  requestAnimationFrame(() => scalePreview());
}
