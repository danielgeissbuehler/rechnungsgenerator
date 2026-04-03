import { useState, useCallback } from 'react';
import type { InvoiceData, Position, MetaField, ColAlign, Currency } from '../types';
import { PositionsTable } from './shared/PositionsTable';
import { RichTextEditor } from './shared/RichTextEditor';
import { F } from '../types';

// ── Column definitions (mirrors state.js COL_DEFS) ─────────────────────────
const COL_DEFS = [
  { n: 1, label: 'Spalte 1',       fieldId: F.COL_POS,    ph: 'POSITION',     extra: false },
  { n: 5, label: 'Spalte 2 opt.',  fieldId: F.COL_EXTRA5, ph: 'z.B. Einheit', extra: true  },
  { n: 6, label: 'Spalte 3 opt.',  fieldId: F.COL_EXTRA6, ph: 'z.B. Rabatt',  extra: true  },
  { n: 2, label: 'Spalte 4',       fieldId: F.COL_PREIS,  ph: 'PREIS',        extra: false },
  { n: 7, label: 'Spalte 5 opt.',  fieldId: F.COL_EXTRA7, ph: 'z.B. Stunden', extra: true  },
  { n: 3, label: 'Spalte 6',       fieldId: F.COL_MENGE,  ph: 'MENGE',        extra: false },
  { n: 8, label: 'Spalte 7 opt.',  fieldId: F.COL_EXTRA8, ph: 'z.B. MwSt.',   extra: true  },
  { n: 4, label: 'Spalte 8 (CHF)', fieldId: F.COL_TOTAL,  ph: 'TOTAL',        extra: false },
] as const;

const ALIGN_OPTIONS: { value: ColAlign; label: string }[] = [
  { value: 'l', label: 'L' },
  { value: 'c', label: 'C' },
  { value: 'r', label: 'R' },
];

const CURRENCIES: Currency[] = ['CHF', 'EUR', 'USD'];

// ── SVG icons ───────────────────────────────────────────────────────────────
function EyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return <span className="text-[10px] text-gray-400">{open ? '\u25B2' : '\u25BC'}</span>;
}

// ── Props ───────────────────────────────────────────────────────────────────
interface TemplateEditorProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  templateName?: string;
  onRename?: (name: string) => void;
  onSave?: () => void;
  onDelete?: () => void;
}

// ── Main component ──────────────────────────────────────────────────────────
export function TemplateEditor({
  data,
  onChange,
  templateName,
  onRename,
  onSave,
  onDelete,
}: TemplateEditorProps) {
  // Collapsed state per section
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    header: false,
    heading: false,
    empfaenger: false,
    steller: true,
    meta: true,
    titel: false,
    textblock: true,
    positionen: false,
    textblock2: true,
    bank: true,
    qrBill: true,
    colConfig: true,
  });

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const updateField = useCallback(
    (key: string, val: string) => {
      onChange({ ...data, fields: { ...data.fields, [key]: val } });
    },
    [data, onChange]
  );

  const updateVisibility = useCallback(
    (key: string, val: boolean) => {
      onChange({ ...data, visibility: { ...data.visibility, [key]: val } });
    },
    [data, onChange]
  );

  const updateMeta = useCallback(
    (index: number, partial: Partial<MetaField>) => {
      const meta = data.meta.map((m, i) => (i === index ? { ...m, ...partial } : m));
      onChange({ ...data, meta });
    },
    [data, onChange]
  );

  const updateColAlign = useCallback(
    (col: string, align: ColAlign) => {
      onChange({ ...data, colAlign: { ...data.colAlign, [col]: align } });
    },
    [data, onChange]
  );

  const updatePositions = useCallback(
    (positions: Position[]) => {
      onChange({ ...data, positions });
    },
    [data, onChange]
  );

  const addPosition = useCallback(() => {
    const maxId = data.positions.reduce((max, p) => Math.max(max, p.id), 0);
    const pos: Position = { id: maxId + 1, desc: '', price: 0, qty: 1 };
    onChange({ ...data, positions: [...data.positions, pos] });
  }, [data, onChange]);

  const f = (key: string) => data.fields[key] ?? '';
  const vis = (key: string) => data.visibility[key] ?? true;

  // ── Section header renderer ─────────────────────────────────────────────
  function SectionHeader({
    id,
    label,
    visKey,
  }: {
    id: string;
    label: string;
    visKey?: string;
  }) {
    const isOpen = !collapsed[id];
    return (
      <div
        className="flex items-center justify-between px-3 py-2 bg-[#f4f6f9] cursor-pointer select-none hover:bg-gray-100 transition-colors border-b border-gray-200"
        onClick={() => toggle(id)}
      >
        <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-600 tracking-wide uppercase">
          {label}
          {visKey && (
            <button
              type="button"
              className={`inline-flex items-center gap-1 text-[10px] font-normal normal-case tracking-normal px-1.5 py-0.5 rounded ${
                vis(visKey)
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-400 bg-gray-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                updateVisibility(visKey, !vis(visKey));
              }}
            >
              <EyeIcon visible={vis(visKey)} />
              {vis(visKey) ? 'sichtbar' : 'ausgeblendet'}
            </button>
          )}
        </div>
        <ChevronIcon open={isOpen} />
      </div>
    );
  }

  function SectionBody({ id, children }: { id: string; children: React.ReactNode }) {
    if (collapsed[id]) return null;
    return <div className="px-3 py-3 space-y-3 bg-white">{children}</div>;
  }

  // ── Field renderers ─────────────────────────────────────────────────────
  function Field({
    label,
    fieldId,
    placeholder,
    type = 'text',
  }: {
    label: string;
    fieldId: string;
    placeholder?: string;
    type?: string;
  }) {
    return (
      <div>
        <label className="block text-[11px] text-gray-400 mb-1">{label}</label>
        <input
          type={type}
          value={f(fieldId)}
          placeholder={placeholder}
          onChange={(e) => updateField(fieldId, e.target.value)}
          className="w-full px-2.5 py-1.5 text-[13px] bg-white border border-gray-200 rounded text-gray-900 placeholder-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors"
        />
      </div>
    );
  }

  function AddressRow({
    streetId,
    nrId,
    streetLabel = 'Strasse',
    nrLabel = 'Nr.',
  }: {
    streetId: string;
    nrId: string;
    streetLabel?: string;
    nrLabel?: string;
  }) {
    return (
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <Field label={streetLabel} fieldId={streetId} placeholder={streetLabel} />
        <Field label={nrLabel} fieldId={nrId} placeholder={nrLabel} />
      </div>
    );
  }

  function PlzOrtRow({ plzId, ortId }: { plzId: string; ortId: string }) {
    return (
      <div className="grid grid-cols-[100px_1fr] gap-2">
        <Field label="PLZ" fieldId={plzId} placeholder="PLZ" />
        <Field label="Ort" fieldId={ortId} placeholder="Ort" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full overflow-y-auto bg-[#f4f6f9] text-gray-900 border-r border-gray-200 flex flex-col">
      {/* ── Template name bar ── */}
      {templateName !== undefined && (
        <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200">
          <input
            type="text"
            value={templateName}
            onChange={(e) => onRename?.(e.target.value)}
            placeholder="Vorlagenname"
            className="flex-1 px-2.5 py-1.5 text-sm font-semibold bg-transparent border border-transparent rounded text-gray-900 placeholder-gray-300 focus:border-indigo-500 focus:bg-[#f8f9fc] outline-none"
          />
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              className="px-3 py-1.5 text-[12px] font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
            >
              Speichern
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-3 py-1.5 text-[12px] font-semibold bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors"
            >
              Löschen
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* GRUPPE: KOPFZEILE                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-200">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100">
          Kopfzeile
        </div>

        {/* Absender / Header */}
        <SectionHeader id="header" label="Absender / Header" visKey="header" />
        <SectionBody id="header">
          <Field label="Firmenname" fieldId={F.COMPANY} placeholder="G INVESTMENTS & REAL ESTATES AG" />
          <Field label="E-Mail" fieldId={F.EMAIL} placeholder="ADMIN@G-INVESTMENTS-REALESTATES.CH" />
        </SectionBody>

        {/* Titeltext und Trennlinie */}
        <SectionHeader id="heading" label="Titeltext und Trennlinie" visKey="heading" />
        <SectionBody id="heading">
          <Field label="Grosser Text (rechts neben der Linie, Caps)" fieldId={F.HEADING} placeholder="z.B. RECHNUNG" />
        </SectionBody>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* GRUPPE: BRIEFKOPF                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-200">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100">
          Briefkopf
        </div>

        {/* Empfänger */}
        <SectionHeader id="empfaenger" label="Empfänger" visKey="empfaenger" />
        <SectionBody id="empfaenger">
          <Field label="Name" fieldId={F.EMP_NAME} placeholder="Name Empfänger" />
          <AddressRow streetId={F.EMP_STRASSE} nrId={F.EMP_HAUSNUMMER} />
          <PlzOrtRow plzId={F.EMP_PLZ} ortId={F.EMP_ORT} />
        </SectionBody>

        {/* Absender (Rechnungsteller) */}
        <SectionHeader id="steller" label="Absender" visKey="steller" />
        <SectionBody id="steller">
          <Field label="Name" fieldId={F.STELL_NAME} placeholder="Name Absender" />
          <AddressRow streetId={F.STELL_ADRESSE} nrId={F.STELL_HAUSNUMMER} />
          <PlzOrtRow plzId={F.STELL_PLZ} ortId={F.STELL_ORT} />
          {F.STELL_EMAIL && (
            <Field label="E-Mail" fieldId={F.STELL_EMAIL} placeholder="E-Mail" />
          )}
          <Field label="Start-Rechnungsnummer" fieldId={F.STELL_START_NR} placeholder="z.B. 100" type="number" />
        </SectionBody>

        {/* Datum & Zeitraum (Meta) */}
        <SectionHeader id="meta" label="Datum & Zeitraum" visKey="meta" />
        <SectionBody id="meta">
          {(data.meta || []).map((m, i) => (
            <div key={i} className="space-y-1.5 pb-2 border-b border-gray-200 last:border-0 last:pb-0">
              <label className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={m.show}
                  onChange={(e) => updateMeta(i, { show: e.target.checked })}
                  className="rounded border-gray-300 bg-white accent-indigo-600 focus:ring-indigo-500/30"
                />
                Einblenden
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Label</label>
                  <input
                    type="text"
                    value={m.label}
                    onChange={(e) => updateMeta(i, { label: e.target.value })}
                    className="w-full px-2 py-1.5 text-[12px] bg-white border border-gray-200 rounded text-gray-900 placeholder-gray-300 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Wert</label>
                  <input
                    type="text"
                    value={m.value}
                    placeholder={i === 0 || i === 2 ? 'TT.MM.JJJJ' : 'Wert'}
                    onChange={(e) => updateMeta(i, { value: e.target.value })}
                    className="w-full px-2 py-1.5 text-[12px] bg-white border border-gray-200 rounded text-gray-900 placeholder-gray-300 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </SectionBody>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* GRUPPE: INHALT                                                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-200">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100">
          Inhalt
        </div>

        {/* Titel */}
        <SectionHeader id="titel" label="Titel" visKey="titel" />
        <SectionBody id="titel">
          <div>
            <label className="block text-[11px] text-gray-400 mb-1">Titel (Freitext, mehrzeilig möglich)</label>
            <textarea
              value={f(F.TITEL)}
              onChange={(e) => updateField(F.TITEL, e.target.value)}
              rows={2}
              placeholder="Titel"
              className="w-full px-2.5 py-1.5 text-[13px] bg-white border border-gray-200 rounded text-gray-900 placeholder-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none resize-y"
            />
          </div>
        </SectionBody>

        {/* Textblock (vor Tabelle) */}
        <SectionHeader id="textblock" label="Textblock (vor Tabelle)" visKey="textblock" />
        <SectionBody id="textblock">
          <RichTextEditor
            value={data.textblock || ''}
            onChange={(html) => onChange({ ...data, textblock: html })}
            placeholder="Sehr geehrte Damen und Herren..."
          />
        </SectionBody>

        {/* Tabelle */}
        <SectionHeader id="positionen" label="Tabelle" visKey="positionen" />
        <SectionBody id="positionen">
          {/* Sub-block: Spalten-Konfiguration */}
          <div className="rounded border border-gray-200 overflow-hidden">
            <div
              className="flex items-center justify-between px-2.5 py-1.5 bg-[#f4f6f9] cursor-pointer select-none text-[11px] font-semibold text-gray-600"
              onClick={() => toggle('colConfig')}
            >
              <span>Spalten-Konfiguration</span>
              <ChevronIcon open={!collapsed.colConfig} />
            </div>
            {!collapsed.colConfig && (
              <div className="px-2.5 py-2.5 space-y-3 bg-[#f8f9fc]">
                {/* Currency */}
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Währung</label>
                  <select
                    value={f(F.CURRENCY) || 'CHF'}
                    onChange={(e) => updateField(F.CURRENCY, e.target.value)}
                    className="px-2.5 py-1.5 text-[13px] bg-white border border-gray-200 rounded text-gray-900 focus:border-indigo-500 outline-none"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Column config list */}
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1.5">Spalten</label>
                  <div className="space-y-2">
                    {COL_DEFS.map((col) => {
                      const visKey = `col${col.n}`;
                      const isVisible = vis(visKey);
                      return (
                        <div key={col.n} className="flex items-center gap-2">
                          {/* Show/hide checkbox */}
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={(e) => updateVisibility(visKey, e.target.checked)}
                            className="rounded border-gray-300 bg-white accent-indigo-600 focus:ring-indigo-500/30"
                          />
                          {/* Column label input */}
                          <input
                            type="text"
                            value={f(col.fieldId)}
                            placeholder={col.ph}
                            onChange={(e) => updateField(col.fieldId, e.target.value)}
                            className={`flex-1 px-2 py-1 text-[12px] bg-white border border-gray-200 rounded text-gray-900 placeholder-gray-300 focus:border-indigo-500 outline-none ${
                              !isVisible ? 'opacity-40' : ''
                            }`}
                            disabled={!isVisible}
                          />
                          {/* Alignment toggle */}
                          <div className="flex gap-0.5">
                            {ALIGN_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateColAlign(String(col.n), opt.value)}
                                className={`w-6 h-6 text-[10px] font-bold rounded transition-colors ${
                                  (data.colAlign[String(col.n)] || 'l') === opt.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                disabled={!isVisible}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Qty total checkbox */}
                <label className="flex items-center gap-2 text-[11px] text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.qtyTotal ?? false}
                    onChange={(e) => onChange({ ...data, qtyTotal: e.target.checked })}
                    className="rounded border-gray-300 bg-white accent-indigo-600 focus:ring-indigo-500/30"
                  />
                  Summe der Menge im Total anzeigen
                </label>
              </div>
            )}
          </div>

          {/* Zeilen (positions) */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-gray-600">Zeilen</span>
              <span className="text-[10px] text-gray-400">{data.positions.length}</span>
            </div>
            <PositionsTable
              positions={data.positions}
              currency={(f(F.CURRENCY) as Currency) || 'CHF'}
              editable
              onChange={updatePositions}
              onAdd={addPosition}
              extraColumns={COL_DEFS.filter(
                (col) => col.extra && vis(`col${col.n}`)
              ).map((col) => ({
                key: `col${col.n}` as 'col5' | 'col6' | 'col7' | 'col8',
                label: f(col.fieldId) || col.ph,
              }))}
            />
          </div>
        </SectionBody>

        {/* Textblock (nach Tabelle) */}
        <SectionHeader id="textblock2" label="Textblock (nach Tabelle)" visKey="textblock2" />
        <SectionBody id="textblock2">
          <RichTextEditor
            value={data.textblock2 || ''}
            onChange={(html) => onChange({ ...data, textblock2: html })}
            placeholder="Zusätzlicher Text nach der Tabelle..."
          />
        </SectionBody>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* GRUPPE: FUSSZEILE                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-200">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100">
          Fusszeile
        </div>

        {/* Bank / Footer */}
        <SectionHeader id="bank" label="Bank / Footer" visKey="bank" />
        <SectionBody id="bank">
          <Field label="Bank Name" fieldId={F.BANK_NAME} placeholder="Name Bank" />
          <AddressRow streetId={F.BANK_ADRESSE} nrId={F.BANK_HAUSNUMMER} streetLabel="Bank Strasse" />
          <PlzOrtRow plzId={F.BANK_PLZ} ortId={F.BANK_ORT} />
          <Field label="IBAN" fieldId={F.IBAN} placeholder="CH45 3453 4345 3301 24" />
        </SectionBody>

        {/* QR-Einzahlungsschein */}
        <SectionHeader id="qrBill" label="QR-Einzahlungsschein" visKey="qrBill" />
        <SectionBody id="qrBill">
          <p className="text-[12px] text-gray-500 leading-relaxed">
            Fügt einen Swiss QR-Einzahlungsschein als letzte Seite an.
            <br />
            Das Rechnungstotal und die IBAN werden automatisch übernommen.
          </p>
        </SectionBody>
      </div>
    </div>
  );
}
