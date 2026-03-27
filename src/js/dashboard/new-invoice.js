/**
 * dashboard/new-invoice.js — New invoice modal and copy invoice handler.
 */

import { escHtml } from '../utils.js';
import { showEditor } from './views.js';
import { getModalVorlagen, loadTemplateByKey } from '../templates.js';
import { allRechnungen } from './state.js';

/**
 * Open the new-invoice modal and populate the Vorlage dropdown.
 */
export function handleNeueRechnung() {
  // Populate Vorlage dropdown from cloud + local templates
  const vorlagenSelect = document.getElementById('modal-vorlage-select');
  if (vorlagenSelect) {
    const vorlagen = getModalVorlagen();
    vorlagenSelect.innerHTML =
      '<option value="">\u2014 Vorlage w\u00E4hlen \u2014</option>'
      + vorlagen.map(function(v) {
          return '<option value="' + escHtml(v.key) + '">' + escHtml(v.label) + '</option>';
        }).join('');
  }

  // Refresh Kopie dropdown from current invoice list
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

  const overlay = document.getElementById('new-invoice-overlay');
  if (overlay) overlay.style.display = 'flex';

  const leerRadio = document.querySelector('[name=neue-rechnung-typ][value=leer]');
  if (leerRadio) leerRadio.checked = true;
}

/**
 * Close the new-invoice modal.
 */
export function closeNeueRechnungModal() {
  const overlay = document.getElementById('new-invoice-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Confirm the modal selection and navigate to the editor.
 */
export async function confirmNeueRechnung() {
  const selected = document.querySelector('[name=neue-rechnung-typ]:checked');
  if (!selected) return;
  const typ = selected.value;

  if (typ === 'leer') {
    if (typeof window.neueRechnung === 'function') window.neueRechnung();
    showEditor('new', 'Neue Rechnung');
    closeNeueRechnungModal();
    window.speichereEntwurf?.();
    return;
  }

  if (typ === 'vorlage') {
    const vorlageSelect = document.getElementById('modal-vorlage-select');
    const vorlageKey    = (vorlageSelect && vorlageSelect.value) || '';
    if (!vorlageKey) {
      window.showToast?.('Bitte eine Vorlage auswählen.', 'warning');
      return;
    }
    // vorlageKey is already prefixed (e.g. 'cloud:Name' or 'local:Name')
    loadTemplateByKey(vorlageKey);
    showEditor('new', 'Aus Vorlage');
    closeNeueRechnungModal();
    window.speichereEntwurf?.();
    return;
  }

  if (typ === 'kopie') {
    const kopieSelect = document.getElementById('modal-kopie-select');
    const kopieId     = (kopieSelect && kopieSelect.value) || '';
    if (!kopieId) {
      window.showToast?.('Bitte eine Rechnung für die Kopie auswählen.', 'warning');
      return;
    }
    if (typeof window.kopieRechnung === 'function') await window.kopieRechnung(kopieId);
    showEditor('copy', 'Kopie');
    closeNeueRechnungModal();
    window.speichereEntwurf?.();
    return;
  }
}

/**
 * Copy an invoice directly (bypassing the modal) and open the editor.
 * @param {string} id
 */
export async function handleKopieRechnung(id) {
  if (typeof window.kopieRechnung === 'function') await window.kopieRechnung(id);
  showEditor('copy', 'Kopie von Rechnung');
}
