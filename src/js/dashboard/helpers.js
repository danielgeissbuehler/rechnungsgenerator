/**
 * dashboard/helpers.js — Shared helper functions for dashboard modules.
 */

import { escHtml } from '../utils.js';

/**
 * Safely read a field from r.daten.fields.
 * @param {Object} r
 * @param {string} key
 * @returns {string}
 */
export function field(r, key) {
  return (r && r.daten && r.daten.fields && r.daten.fields[key] != null)
    ? r.daten.fields[key]
    : '';
}

/**
 * Returns the HTML for a status badge. Labels are static — no user data.
 * badge-blue / badge-red carry inline-style fallbacks for robustness.
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadge(status) {
  switch (status) {
    case 'entwurf':
      return '<span class="badge badge-gray">Entwurf</span>';
    case 'offen':
      return '<span class="badge badge-amber">Offen</span>';
    case 'versendet':
      return '<span class="badge badge-blue" style="background:#dbeafe;color:#1e40af">Versendet</span>';
    case 'bezahlt':
      return '<span class="badge badge-green">Bezahlt</span>';
    case 'storniert':
      return '<span class="badge badge-red" style="background:#fee2e2;color:#991b1b">Storniert</span>';
    default:
      return '<span class="badge badge-gray">' + escHtml(status || '\u2014') + '</span>';
  }
}
