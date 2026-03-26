export function val(id)  { return document.getElementById(id)?.value || ''; }
export function ph(id)   { const el = document.getElementById(id); return el ? (el.value || el.placeholder || '') : ''; }
export function chk(id)  { return document.getElementById(id)?.checked || false; }
export function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
export function fmt(n)   { return Number(n).toLocaleString('de-CH', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
export function fmtFull(n) { return Number(n).toLocaleString('de-CH', { minimumFractionDigits:2, maximumFractionDigits:10 }); }
export function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

/** Escape for innerHTML — includes single quotes (&#39;) unlike esc(). */
export function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format amount with currency prefix: "CHF 4'200.00". */
export function formatCHF(betrag, waehrung) {
  if (waehrung == null) waehrung = 'CHF';
  const num = parseFloat(betrag) || 0;
  const formatted = num.toLocaleString('de-CH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return escHtml(waehrung) + '\u00A0' + formatted;
}

/** Format ISO date string for de-CH locale. */
export function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  return new Date(dateStr).toLocaleDateString('de-CH');
}

/** Safely set textContent of element by ID. */
export function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
