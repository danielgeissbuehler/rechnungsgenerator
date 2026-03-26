/**
 * dashboard/new-invoice.js — New invoice modal and copy invoice handler.
 */

import { escHtml } from '../utils.js';
import { showEditor } from './views.js';

/**
 * Open the new-invoice modal and populate the Vorlage dropdown.
 */
export function handleNeueRechnung() {
  const vorlagenSelect = document.getElementById('modal-vorlage-select');
  if (vorlagenSelect) {
    const data = window._vorlagenData || {};
    const keys = Object.keys(data).sort();
    vorlagenSelect.innerHTML =
      '<option value="">\u2014 Vorlage w\u00E4hlen \u2014</option>'
      + keys.map(function(k) {
          return '<option value="' + escHtml(k) + '">' + escHtml(k) + '</option>';
        }).join('');
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
    const vorlage       = (vorlageSelect && vorlageSelect.value) || '';
    if (!vorlage) {
      alert('Bitte eine Vorlage ausw\u00E4hlen.');
      return;
    }
    if (typeof window.loadTemplateByName === 'function') window.loadTemplateByName(vorlage);
    showEditor('new', 'Aus Vorlage');
    closeNeueRechnungModal();
    window.speichereEntwurf?.();
    return;
  }

  if (typ === 'kopie') {
    const kopieSelect = document.getElementById('modal-kopie-select');
    const kopieId     = (kopieSelect && kopieSelect.value) || '';
    if (!kopieId) {
      alert('Bitte eine Rechnung f\u00FCr die Kopie ausw\u00E4hlen.');
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
  if (typeof window.kopieRechnung === 'function') window.kopieRechnung(id);
  showEditor('copy', 'Kopie von Rechnung');
}
