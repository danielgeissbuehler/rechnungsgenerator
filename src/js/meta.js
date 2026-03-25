import { META_COUNT } from './state.js';
import { val } from './utils.js';

export function toggleMetaField(i) {
  const row = document.getElementById(`mfr-${i}`);
  const chkEl = document.getElementById(`mf-show-${i}`);
  if (!row || !chkEl) return;
  row.classList.toggle('mf-hidden', !chkEl.checked);
}

export function getMetaData() {
  const rows = [];
  for (let i = 0; i < META_COUNT; i++) {
    const chkEl = document.getElementById(`mf-show-${i}`);
    const label = document.getElementById(`mf-label-${i}`)?.value.trim() || '';
    const value = document.getElementById(`mf-value-${i}`)?.value.trim() || '';
    if (chkEl?.checked && label) rows.push({ label, value });
  }
  return rows;
}
