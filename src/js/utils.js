export function val(id)  { return document.getElementById(id)?.value || ''; }
export function ph(id)   { const el = document.getElementById(id); return el ? (el.value || el.placeholder || '') : ''; }
export function chk(id)  { return document.getElementById(id)?.checked || false; }
export function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
export function fmt(n)   { return Number(n).toLocaleString('de-CH', { minimumFractionDigits:2, maximumFractionDigits:2 }); }
export function fmtFull(n) { return Number(n).toLocaleString('de-CH', { minimumFractionDigits:2, maximumFractionDigits:10 }); }
export function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
