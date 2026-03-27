/**
 * dashboard/state.js — Shared mutable state for all dashboard modules.
 */

/** @type {Array<Object>} Full invoice list from DB */
export let allRechnungen = [];

/** @type {string|null} UUID of the currently open detail panel */
export let currentDetailId = null;

export let filterState = {
  absender:   [],
  empfaenger: [],
  status:     'alle',
  betragVon:  null,
  betragBis:  null,
  suche:      '',
};

/** @type {{ col: string, dir: 'asc'|'desc' }} Active sort column and direction */
export let sortState = { col: 'created_at', dir: 'desc' };

// Setter functions for let variables (needed by sibling modules)
export function setAllRechnungen(val) { allRechnungen = val; }
export function setCurrentDetailId(val) { currentDetailId = val; }
