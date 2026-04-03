import { useCallback, useMemo } from 'react';
import type { InvoiceData, Position, Contact, Company, Currency, MetaField } from '../types';
import { PositionsTable } from './shared/PositionsTable';
import { RichTextEditor } from './shared/RichTextEditor';
import { formatCHF, isoToSwiss, swissToIso } from '../utils';
import { F } from '../types';

// ── Props ────────────────────────────────────────────────────────────────────

interface InvoiceEditorProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  contacts: Contact[];
  companies: Company[];
  readonly?: boolean;
}

// ── Date meta field indices (Datum, Zahlbar bis) ─────────────────────────────

const DATE_META_INDICES = new Set([0, 2]);

// ── Component ────────────────────────────────────────────────────────────────

export function InvoiceEditor({
  data,
  onChange,
  contacts,
  companies,
  readonly = false,
}: InvoiceEditorProps) {
  // ── Helpers ──────────────────────────────────────────────────────────────

  const updateField = useCallback(
    (key: string, value: string) => {
      onChange({ ...data, fields: { ...data.fields, [key]: value } });
    },
    [data, onChange]
  );

  const updateMeta = useCallback(
    (index: number, value: string) => {
      const next = data.meta.map((m, i) =>
        i === index ? { ...m, value } : m
      );
      onChange({ ...data, meta: next });
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
    const next: Position = { id: maxId + 1, desc: '', price: 0, qty: 1 };
    onChange({ ...data, positions: [...data.positions, next] });
  }, [data, onChange]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const currency = (data.fields[F.CURRENCY] || 'CHF') as Currency;
  const visibleMeta = useMemo(
    () => data.meta.map((m, i) => ({ ...m, index: i })).filter((m) => m.show),
    [data.meta]
  );

  const selectedContact = useMemo(
    () => contacts.find((c) => c.name === data.fields[F.EMP_NAME]),
    [contacts, data.fields]
  );

  const selectedCompany = useMemo(
    () => companies.find((c) => c.name === data.fields[F.STELL_NAME]),
    [companies, data.fields]
  );

  // Build address string from parts
  const buildAddr = (strasse?: string, hausnummer?: string, plz?: string, ort?: string) => {
    const line1 = [strasse, hausnummer].filter(Boolean).join(' ');
    const line2 = [plz, ort].filter(Boolean).join(' ');
    return [line1, line2].filter(Boolean).join(', ');
  };

  const empAddress = selectedContact
    ? buildAddr(selectedContact.strasse, selectedContact.hausnummer, selectedContact.plz, selectedContact.ort)
    : buildAddr(data.fields[F.EMP_STRASSE], data.fields[F.EMP_HAUSNUMMER], data.fields[F.EMP_PLZ], data.fields[F.EMP_ORT]);

  const stellAddress = selectedCompany
    ? buildAddr(selectedCompany.strasse, selectedCompany.hausnummer, selectedCompany.plz, selectedCompany.ort)
    : buildAddr(data.fields[F.STELL_ADRESSE], data.fields[F.STELL_HAUSNUMMER], data.fields[F.STELL_PLZ], data.fields[F.STELL_ORT]);

  // ── Contact/Company select handlers ──────────────────────────────────────

  const handleContactChange = useCallback(
    (contactId: string) => {
      const c = contacts.find((x) => x.id === contactId);
      if (!c) return;
      onChange({
        ...data,
        fields: {
          ...data.fields,
          [F.EMP_NAME]: c.name,
          [F.EMP_STRASSE]: c.strasse || '',
          [F.EMP_HAUSNUMMER]: c.hausnummer || '',
          [F.EMP_PLZ]: c.plz || '',
          [F.EMP_ORT]: c.ort || '',
        },
      });
    },
    [data, onChange, contacts]
  );

  const handleCompanyChange = useCallback(
    (companyId: string) => {
      const c = companies.find((x) => x.id === companyId);
      if (!c) return;
      onChange({
        ...data,
        fields: {
          ...data.fields,
          [F.STELL_NAME]: c.name,
          [F.STELL_ADRESSE]: c.strasse || '',
          [F.STELL_HAUSNUMMER]: c.hausnummer || '',
          [F.STELL_PLZ]: c.plz || '',
          [F.STELL_ORT]: c.ort || '',
          [F.STELL_EMAIL]: c.header_email || '',
          [F.COMPANY]: c.header_name || c.name,
          [F.EMAIL]: c.header_email || '',
          [F.BANK_NAME]: c.bank_name || '',
          [F.IBAN]: c.iban || '',
        },
      });
    },
    [data, onChange, companies]
  );

  // ── Extra columns for PositionsTable ─────────────────────────────────────

  const extraColumns = useMemo(() => {
    const cols: { key: 'col5' | 'col6' | 'col7' | 'col8'; label: string }[] = [];
    if (data.visibility.col5) cols.push({ key: 'col5', label: data.fields[F.COL_EXTRA5] || 'Spalte 2' });
    if (data.visibility.col6) cols.push({ key: 'col6', label: data.fields[F.COL_EXTRA6] || 'Spalte 3' });
    if (data.visibility.col7) cols.push({ key: 'col7', label: data.fields[F.COL_EXTRA7] || 'Spalte 5' });
    if (data.visibility.col8) cols.push({ key: 'col8', label: data.fields[F.COL_EXTRA8] || 'Spalte 7' });
    return cols;
  }, [data.visibility, data.fields]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-w-[320px] bg-[#f4f6f9] flex flex-col overflow-hidden border-r border-gray-200">
      <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">

        {/* 1. Adressierung */}
        <Card header="Adressierung">
          <div className="flex flex-wrap gap-2 justify-center">
            {/* Empfaenger */}
            <InfoItem className="flex-1 basis-[140px] min-w-[120px]" muted>
              <InfoLabel>Empfaenger</InfoLabel>
              <select
                value={selectedContact?.id || ''}
                onChange={(e) => handleContactChange(e.target.value)}
                disabled={readonly}
                className="border-none outline-none p-0 text-[13px] font-semibold text-gray-900 bg-transparent w-full"
              >
                <option value="">-- Waehlen --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                readOnly
                value={data.fields[F.EMP_NAME] || ''}
                className="border-none outline-none p-0 text-xs font-normal text-gray-500 bg-transparent w-full"
              />
              <input
                readOnly
                value={empAddress}
                className="border-none outline-none p-0 text-xs font-normal text-gray-500 bg-transparent w-full"
              />
            </InfoItem>

            {/* Absender */}
            <InfoItem className="flex-1 basis-[140px] min-w-[120px]" muted>
              <InfoLabel>Absender</InfoLabel>
              <select
                value={selectedCompany?.id || ''}
                onChange={(e) => handleCompanyChange(e.target.value)}
                disabled={readonly}
                className="border-none outline-none p-0 text-[13px] font-semibold text-gray-500 bg-transparent w-full cursor-default"
              >
                <option value="">-- Waehlen --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                readOnly
                value={data.fields[F.STELL_NAME] || ''}
                className="border-none outline-none p-0 text-xs font-normal text-gray-500 bg-transparent w-full"
              />
              <input
                readOnly
                value={stellAddress}
                className="border-none outline-none p-0 text-xs font-normal text-gray-500 bg-transparent w-full"
              />
            </InfoItem>
          </div>
        </Card>

        {/* 2. Meta Fields (Datum & Referenz) */}
        {data.visibility.meta && visibleMeta.length > 0 && (
          <Card header="Datum & Referenz">
            <div className="flex flex-wrap gap-2 justify-start">
              {visibleMeta.map((m) => {
                const isDate = DATE_META_INDICES.has(m.index);
                return (
                  <InfoItem key={m.index} className="flex-1 basis-0 min-w-[120px]">
                    <InfoLabel>{m.label}</InfoLabel>
                    <input
                      type={isDate ? 'date' : 'text'}
                      value={isDate ? swissToIso(m.value) : m.value}
                      placeholder="\u2014"
                      readOnly={readonly}
                      onChange={(e) => {
                        const val = isDate ? isoToSwiss(e.target.value) : e.target.value;
                        updateMeta(m.index, val);
                      }}
                      className="border-none outline-none p-0 text-[13px] font-semibold text-gray-900 bg-transparent w-full"
                    />
                  </InfoItem>
                );
              })}
            </div>
          </Card>
        )}

        {/* 3. Titel */}
        {data.visibility.titel && (
          <Card header="Titel">
            <InfoItem>
              <InfoLabel>Rechnungstitel</InfoLabel>
              <input
                type="text"
                value={data.fields[F.TITEL] || ''}
                placeholder="z. B. Rechnung April 2026"
                readOnly={readonly}
                onChange={(e) => updateField(F.TITEL, e.target.value)}
                className="border-none outline-none p-0 text-[13px] font-semibold text-gray-900 bg-transparent w-full"
              />
            </InfoItem>
          </Card>
        )}

        {/* 4. Textblock 1 (vor Tabelle) */}
        {data.visibility.textblock && (
          <Card header="Textblock (vor Tabelle)">
            <RichTextEditor
              value={data.textblock || ''}
              onChange={(html) => onChange({ ...data, textblock: html })}
              placeholder="Freitext vor der Positions-Tabelle..."
              readonly={readonly}
            />
          </Card>
        )}

        {/* 5. Positionen */}
        {data.visibility.positionen && (
          <Card
            header="Positionen"
            headerRight={
              <div className="flex items-center gap-1.5 text-[9px]">
                <span className="font-bold uppercase tracking-wider text-gray-400">Waehrung</span>
                <input
                  type="text"
                  value={currency}
                  readOnly={readonly}
                  onChange={(e) => updateField(F.CURRENCY, e.target.value)}
                  className="w-11 text-xs font-bold bg-[#f8f9fc] border border-gray-200 rounded-[5px] px-1.5 py-0.5 text-center outline-none"
                />
              </div>
            }
          >
            <PositionsTable
              positions={data.positions}
              currency={currency}
              editable={!readonly}
              onChange={updatePositions}
              onAdd={addPosition}
              extraColumns={extraColumns}
            />
          </Card>
        )}

        {/* 6. Textblock 2 (nach Tabelle) */}
        {data.visibility.textblock2 && (
          <Card header="Textblock (nach Tabelle)">
            <RichTextEditor
              value={data.textblock2 || ''}
              onChange={(html) => onChange({ ...data, textblock2: html })}
              placeholder="Freitext nach der Positions-Tabelle..."
              readonly={readonly}
            />
          </Card>
        )}

        {/* 7. Bank / Zahlungsverbindung */}
        {data.visibility.bank && (
          <Card header="Zahlungsverbindung">
            <div className="flex flex-wrap gap-2 justify-center">
              <InfoItem className="flex-1 basis-[140px] min-w-[120px]" muted>
                <InfoLabel>Bank</InfoLabel>
                <input
                  readOnly
                  value={data.fields[F.BANK_NAME] || ''}
                  className="border-none outline-none p-0 text-[13px] font-semibold text-gray-500 bg-transparent w-full cursor-default"
                />
              </InfoItem>
              <InfoItem className="flex-1 basis-[140px] min-w-[120px]" muted>
                <InfoLabel>IBAN</InfoLabel>
                <input
                  readOnly
                  value={data.fields[F.IBAN] || ''}
                  className="border-none outline-none p-0 text-[13px] font-semibold text-gray-500 bg-transparent w-full cursor-default font-mono tracking-wide"
                />
              </InfoItem>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Card({
  header,
  headerRight,
  children,
}: {
  header: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-visible shrink-0">
      <div className="px-3.5 py-2 bg-[#f4f6f9] border-b border-gray-200 rounded-t-xl flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[.1em] text-gray-500">
          {header}
        </span>
        {headerRight}
      </div>
      <div className="p-3.5 flex flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function InfoItem({
  children,
  className = '',
  muted = false,
}: {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`
        bg-[#f8f9fc] border border-gray-200 rounded-lg px-3 py-2.5
        flex flex-col gap-0.5 transition-all
        focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10
        ${muted ? '[&_input]:text-gray-500 [&_select]:text-gray-500 [&_input]:cursor-default' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-[.1em] text-gray-400 pointer-events-none whitespace-nowrap">
      {children}
    </label>
  );
}
