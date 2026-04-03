/**
 * dashboard/stats.js — Dashboard statistics and sidebar user display.
 */

import { setText, formatCHF } from '../utils.js';
import { allRechnungen } from './state.js';

/**
 * Compute and render stat card values from the full invoice list.
 * Also triggers sidebar user update (async, non-blocking).
 * @param {Array<Object>} [list]
 */
export function renderDashboardStats(list) {
  if (list == null) list = allRechnungen;

  const now       = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();

  const total = list.length;
  const thisMonthCount = list.filter(function(r) {
    const d = new Date(r.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const offenList  = list.filter(function(r) { return r.status === 'offen'; });
  const offenCount = offenList.length;
  const offenSum   = offenList.reduce(function(s, r) { return s + (parseFloat(r.betrag) || 0); }, 0);

  const bezahltList = list.filter(function(r) {
    return r.status === 'bezahlt' && new Date(r.created_at).getFullYear() === thisYear;
  });
  const bezahltCount = bezahltList.length;
  const bezahltSum   = bezahltList.reduce(function(s, r) { return s + (parseFloat(r.betrag) || 0); }, 0);

  const ausstehendSum   = offenSum;
  const offenBadgeCount = offenCount;

  setText('stat-total',       String(total));
  setText('stat-total-sub',   '+' + thisMonthCount + ' diesen Monat');
  setText('stat-offen',       String(offenCount));
  setText('stat-offen-sub',   formatCHF(offenSum) + ' ausstehend');
  setText('stat-bezahlt',     String(bezahltCount));
  setText('stat-bezahlt-sub', formatCHF(bezahltSum) + ' bezahlt');
  setText('stat-ausstehend',  formatCHF(ausstehendSum));

  const badge = document.getElementById('nav-badge-offen');
  if (badge) {
    badge.textContent   = String(offenBadgeCount);
    badge.style.display = offenBadgeCount > 0 ? 'inline-block' : 'none';
  }

  updateSidebarUser();
}

/**
 * Fetch current auth session and update sidebar user elements via textContent.
 * Failures are silently ignored — this info is cosmetic.
 */
async function updateSidebarUser() {
  try {
    const { getSession } = await import('../supabase.js');
    const session = await getSession();
    const user    = session && session.user;
    if (user) {
      const email    = user.email || '';
      const meta     = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || email.split('@')[0] || '\u2014';
      const initials = fullName
        .split(' ')
        .map(function(p) { return p[0] || ''; })
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?';
      setText('sidebar-user-name',  fullName);
      setText('sidebar-user-email', email);
      setText('sidebar-avatar',     initials);
    }
  } catch (_) {
    // Silently ignore
  }
}
