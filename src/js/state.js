export const state = {
  positions: [],
  posId: 0,
  expandedPositions: new Set(),
  isReadonly: false,
  currentDraftId: null,
  currentRechnungId: null,
  currentVorlageName: null,
  col4Manual: false,
  visibility: {
    header: true, heading: true, empfaenger: true, steller: true, meta: true,
    titel: true, textblock: false, positionen: true, textblock2: false, bank: true,
    col1: true, col2: true, col3: true, col4: true,
    col5: false, col6: false, col7: false, col8: false,
    qrBill: false,
  },
  colAlign: { 1:'l', 2:'r', 3:'r', 4:'r', 5:'l', 6:'l', 7:'l', 8:'l' },
};

export const META_COUNT = 5;
export const TPLS_KEY = 'rechnungsgenerator_vorlagen';

import { F } from './field-ids.js';

export const COL_DEFS = [
  { n:1, label:'Spalte 1',       inputId:F.COL_POS,    ph:'POSITION',     extra:false },
  { n:5, label:'Spalte 2 opt.',  inputId:F.COL_EXTRA5, ph:'z.B. Einheit', extra:true  },
  { n:6, label:'Spalte 3 opt.',  inputId:F.COL_EXTRA6, ph:'z.B. Rabatt',  extra:true  },
  { n:2, label:'Spalte 4',       inputId:F.COL_PREIS,  ph:'PREIS',        extra:false },
  { n:7, label:'Spalte 5 opt.',  inputId:F.COL_EXTRA7, ph:'z.B. Stunden', extra:true  },
  { n:3, label:'Spalte 6',       inputId:F.COL_MENGE,  ph:'MENGE',        extra:false },
  { n:8, label:'Spalte 7 opt.',  inputId:F.COL_EXTRA8, ph:'z.B. MwSt.',   extra:true  },
  { n:4, label:'Spalte 8 (CHF)', inputId:F.COL_TOTAL,  ph:'TOTAL',        extra:false },
];

export const COL_DEFAULTS = {
  [F.COL_POS]: 'POSITION', [F.COL_PREIS]: 'PREIS', [F.COL_MENGE]: 'MENGE', [F.COL_TOTAL]: 'TOTAL',
  [F.COL_EXTRA5]: '', [F.COL_EXTRA6]: '', [F.COL_EXTRA7]: '', [F.COL_EXTRA8]: '',
};
