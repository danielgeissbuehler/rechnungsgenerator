export const state = {
  positions: [],
  posId: 0,
  expandedPositions: new Set(),
  isReadonly: false,
  currentDraftId: null,
  currentRechnungId: null,
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

export const COL_DEFS = [
  { n:1, label:'Spalte 1',       inputId:'f-col-pos',    ph:'POSITION',     extra:false },
  { n:5, label:'Spalte 2 opt.',  inputId:'f-col-extra5', ph:'z.B. Einheit', extra:true  },
  { n:6, label:'Spalte 3 opt.',  inputId:'f-col-extra6', ph:'z.B. Rabatt',  extra:true  },
  { n:2, label:'Spalte 4',       inputId:'f-col-preis',  ph:'PREIS',        extra:false },
  { n:7, label:'Spalte 5 opt.',  inputId:'f-col-extra7', ph:'z.B. Stunden', extra:true  },
  { n:3, label:'Spalte 6',       inputId:'f-col-menge',  ph:'MENGE',        extra:false },
  { n:8, label:'Spalte 7 opt.',  inputId:'f-col-extra8', ph:'z.B. MwSt.',   extra:true  },
  { n:4, label:'Spalte 8 (CHF)', inputId:'f-col-total',  ph:'TOTAL',        extra:false },
];

export const COL_DEFAULTS = {
  'f-col-pos': 'POSITION', 'f-col-preis': 'PREIS', 'f-col-menge': 'MENGE', 'f-col-total': 'TOTAL',
  'f-col-extra5': '', 'f-col-extra6': '', 'f-col-extra7': '', 'f-col-extra8': '',
};
