import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './preview.css';

import type { Invoice, InvoiceData, InvoiceStatus, Contact, Company, Currency } from './types';
import { F } from './types';
import { fmt, formatCHF, field } from './utils';
import { InvoiceTable } from './components/InvoiceTable';
import { InvoiceDetailPanel } from './components/InvoiceDetailPanel';
import { InvoiceEditor } from './components/InvoiceEditor';
import { TemplateEditor } from './components/TemplateEditor';

// ── Mock Data ────────────────────────────────────────────────────────────────

const mockPositions = [
  { id: 1, desc: 'Webdesign & Entwicklung', price: 1500, qty: 1 },
  { id: 2, desc: 'Hosting (12 Monate)', price: 29.90, qty: 12 },
  { id: 3, desc: 'SSL-Zertifikat', price: 0, qty: 1 },
];

const mockMeta = [
  { show: true, label: 'Datum', value: '29.03.2026' },
  { show: false, label: 'Zeitraum', value: '' },
  { show: true, label: 'Zahlbar bis', value: '28.04.2026' },
  { show: false, label: 'Referenz', value: '' },
  { show: false, label: 'Feld 5', value: '' },
];

const baseFields: Record<string, string> = {
  'f-company': 'G Investments & Real Estates AG',
  'f-email': 'info@ginvestments.ch',
  'f-heading': '',
  'f-emp-name': 'Muster GmbH',
  'f-emp-strasse': 'Bahnhofstrasse',
  'f-emp-hausnummer': '42',
  'f-emp-plz': '8001',
  'f-emp-ort': 'Zürich',
  'f-stell-name': 'G Investments & Real Estates AG',
  'f-stell-adresse': 'Seestrasse',
  'f-stell-hausnummer': '15',
  'f-stell-plz': '6300',
  'f-stell-ort': 'Zug',
  'f-stell-email': 'info@ginvestments.ch',
  'f-titel': 'Rechnung für Webservices',
  'f-currency': 'CHF',
  'f-bank-name': 'UBS Switzerland AG',
  'f-bank-adresse': 'Bahnhofstrasse',
  'f-bank-hausnummer': '45',
  'f-bank-plz': '8001',
  'f-bank-ort': 'Zürich',
  'f-iban': 'CH93 0076 2011 6238 5295 7',
  'f-col-pos': 'Bezeichnung',
  'f-col-preis': 'Preis',
  'f-col-menge': 'Menge',
  'f-col-total': 'Total',
};

const mockInvoiceData: InvoiceData = {
  fields: baseFields,
  positions: mockPositions,
  meta: mockMeta,
  visibility: {
    header: true, heading: false, empfaenger: true, steller: true,
    meta: true, titel: true, textblock: true, positionen: true,
    textblock2: false, bank: true, qrBill: false,
    col1: true, col2: true, col3: true, col4: true,
    col5: false, col6: false, col7: false, col8: false,
  },
  colAlign: { 1: 'l', 2: 'r', 3: 'r', 4: 'r' },
  textblock: '<p>Vielen Dank für Ihren Auftrag. Wir erlauben uns, folgende Leistungen in Rechnung zu stellen:</p>',
  textblock2: '',
};

function makeInvoice(
  id: string,
  nummer: number | null,
  empfaenger: string,
  absender: string,
  betrag: number,
  status: InvoiceStatus,
  daysAgo: number
): Invoice {
  const created = new Date();
  created.setDate(created.getDate() - daysAgo);
  return {
    id,
    nummer,
    absender_name: absender,
    empfaenger_name: empfaenger,
    betrag,
    waehrung: 'CHF',
    status,
    created_at: created.toISOString(),
    daten: { ...mockInvoiceData },
  };
}

const mockInvoices: Invoice[] = [
  makeInvoice('a1', 1, 'Muster GmbH', 'G Investments & Real Estates AG', 1858.80, 'bezahlt', 30),
  makeInvoice('a2', 2, 'Beispiel AG', 'G Investments & Real Estates AG', 4500.00, 'versendet', 14),
  makeInvoice('a3', 3, 'Tech Solutions', 'G Investments & Real Estates AG', 750.00, 'offen', 7),
  makeInvoice('a4', null, 'Neukunde SA', 'G Investments & Real Estates AG', 2200.00, 'entwurf', 2),
  makeInvoice('a5', 4, 'Alt & Partner', 'G Investments & Real Estates AG', 980.00, 'storniert', 45),
  makeInvoice('a6', 5, 'Weber Consulting', 'G Investments & Real Estates AG', 3200.00, 'offen', 3),
];

const mockContacts: Contact[] = [
  { id: 'c1', name: 'Muster GmbH', strasse: 'Bahnhofstrasse', hausnummer: '42', plz: '8001', ort: 'Zürich' },
  { id: 'c2', name: 'Beispiel AG', strasse: 'Industrieweg', hausnummer: '7', plz: '5000', ort: 'Aarau' },
  { id: 'c3', name: 'Tech Solutions', strasse: 'Techpark', hausnummer: '1', plz: '6340', ort: 'Baar' },
];

const mockCompanies: Company[] = [
  {
    id: 's1', name: 'G Investments & Real Estates AG',
    header_name: 'G Investments & Real Estates AG', header_email: 'info@ginvestments.ch',
    strasse: 'Seestrasse', hausnummer: '15', plz: '6300', ort: 'Zug',
    bank_name: 'UBS Switzerland AG', iban: 'CH93 0076 2011 6238 5295 7',
  },
];

// ── Invoice Preview Component ────────────────────────────────────────────────

function InvoicePreview({ data }: { data: InvoiceData }) {
  const f = (key: string) => field(data, key);
  const currency = (f(F.CURRENCY) || 'CHF') as Currency;
  const vis = data.visibility || {};
  const positions = data.positions || [];
  const meta = (data.meta || []).filter((m) => m.show && m.value);

  const total = positions.reduce((sum, p) => sum + p.price * p.qty, 0);

  const empStrasse = [f(F.EMP_STRASSE), f(F.EMP_HAUSNUMMER)].filter(Boolean).join(' ');
  const empOrt = [f(F.EMP_PLZ), f(F.EMP_ORT)].filter(Boolean).join(' ');

  return (
    <div className="flex-1 flex items-start justify-center pt-2">
      <div
        className="bg-white border border-gray-200 rounded shadow-lg p-7 origin-top"
        style={{
          width: 595,
          minHeight: 842,
          aspectRatio: '210 / 297',
          fontSize: 10,
          lineHeight: 1.4,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Header */}
        {vis.header !== false && (
          <div className="text-right mb-4">
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {f(F.COMPANY)}
            </div>
            {f(F.EMAIL) && (
              <div style={{ fontSize: 9, color: '#6b7280' }}>{f(F.EMAIL)}</div>
            )}
          </div>
        )}

        {/* Separator */}
        <div style={{ borderBottom: '2px solid #111', marginBottom: 16 }} />

        {/* Recipient + Meta info row */}
        <div className="flex justify-between mb-5" style={{ gap: 24 }}>
          {/* Left: Recipient */}
          {vis.empfaenger !== false && (
            <div style={{ fontSize: 10 }}>
              {f(F.EMP_NAME) && <div style={{ fontWeight: 600 }}>{f(F.EMP_NAME)}</div>}
              {empStrasse && <div>{empStrasse}</div>}
              {empOrt && <div>{empOrt}</div>}
            </div>
          )}

          {/* Right: Date info box */}
          {vis.meta !== false && meta.length > 0 && (
            <div
              style={{
                fontSize: 9,
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                padding: '6px 10px',
                minWidth: 140,
              }}
            >
              {meta.map((m, i) => (
                <div key={i} className="flex justify-between" style={{ gap: 12 }}>
                  <span style={{ color: '#6b7280' }}>{m.label}</span>
                  <span style={{ fontWeight: 600 }}>{m.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        {vis.titel !== false && f(F.TITEL) && (
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              marginBottom: 10,
            }}
          >
            {f(F.TITEL)}
          </div>
        )}

        {/* Textblock 1 */}
        {vis.textblock !== false && data.textblock && (
          <div
            style={{ fontSize: 10, marginBottom: 12, color: '#374151' }}
            dangerouslySetInnerHTML={{ __html: data.textblock }}
          />
        )}

        {/* Positions table */}
        {vis.positionen !== false && positions.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 9 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#6b7280' }}>
                  {f(F.COL_POS) || 'Bezeichnung'}
                </th>
                {vis.col3 !== false && (
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#6b7280', width: 50 }}>
                    {f(F.COL_MENGE) || 'Menge'}
                  </th>
                )}
                {vis.col2 !== false && (
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#6b7280', width: 70 }}>
                    {f(F.COL_PREIS) || 'Preis'}
                  </th>
                )}
                {vis.col4 !== false && (
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#6b7280', width: 80 }}>
                    {f(F.COL_TOTAL) || 'Total'}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '4px 6px' }}>{pos.desc}</td>
                  {vis.col3 !== false && (
                    <td style={{ textAlign: 'right', padding: '4px 6px' }}>{pos.qty}</td>
                  )}
                  {vis.col2 !== false && (
                    <td style={{ textAlign: 'right', padding: '4px 6px' }}>{fmt(pos.price)}</td>
                  )}
                  {vis.col4 !== false && (
                    <td style={{ textAlign: 'right', padding: '4px 6px' }}>{fmt(pos.price * pos.qty)}</td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #111' }}>
                <td
                  style={{ padding: '6px 6px', fontWeight: 700, textAlign: 'right' }}
                  colSpan={
                    1
                    + (vis.col3 !== false ? 1 : 0)
                    + (vis.col2 !== false ? 1 : 0)
                  }
                >
                  Total
                </td>
                {vis.col4 !== false && (
                  <td style={{ padding: '6px 6px', fontWeight: 700, textAlign: 'right' }}>
                    {formatCHF(total, currency)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        )}

        {/* Textblock 2 */}
        {vis.textblock2 !== false && data.textblock2 && (
          <div
            style={{ fontSize: 10, marginBottom: 12, color: '#374151' }}
            dangerouslySetInnerHTML={{ __html: data.textblock2 }}
          />
        )}

        {/* Footer: Bank */}
        {vis.bank !== false && (f(F.BANK_NAME) || f(F.IBAN)) && (
          <div
            style={{
              marginTop: 'auto',
              paddingTop: 16,
              borderTop: '1px solid #e5e7eb',
              fontSize: 9,
              color: '#6b7280',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {f(F.BANK_NAME) && <span>{f(F.BANK_NAME)}</span>}
            </div>
            <div>
              {f(F.IBAN) && <span>IBAN: {f(F.IBAN)}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview App ──────────────────────────────────────────────────────────────

type Tab = 'table' | 'detail' | 'editor' | 'template';

function PreviewApp() {
  const [tab, setTab] = useState<Tab>('table');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editorData, setEditorData] = useState<InvoiceData>(mockInvoiceData);
  const [templateData, setTemplateData] = useState<InvoiceData>(mockInvoiceData);
  const [showJson, setShowJson] = useState(false);

  const selectedInvoice = mockInvoices.find((i) => i.id === selectedId) || null;

  const log = (action: string, ...args: unknown[]) => {
    console.log(`[Preview] ${action}`, ...args);
  };

  return (
    <div className="min-h-screen bg-gray-100 font-[Inter,system-ui,sans-serif]">
      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 sticky top-0 z-50">
        <span className="text-sm font-bold text-gray-900 mr-4">React Preview</span>
        {(['table', 'detail', 'editor', 'template'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === 'detail') {
                setSelectedId('a3');
                setDetailOpen(true);
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === t
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {{ table: 'Rechnungstabelle', detail: 'Detailansicht', editor: 'Editor', template: 'Vorlage-Editor' }[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'table' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <InvoiceTable
              invoices={mockInvoices}
              selectedId={selectedId || undefined}
              onRowClick={(id) => { setSelectedId(id); log('rowClick', id); }}
              onEdit={(id) => log('edit', id)}
              onDownload={(id) => log('download', id)}
              onPrint={(id) => log('print', id)}
              onDelete={(id) => log('delete', id)}
            />
          </div>
        )}

        {tab === 'detail' && (
          <div className="relative h-[calc(100vh-120px)]">
            <div className="text-sm text-gray-500 p-4">
              Klicke auf eine Rechnung in der Tabelle oder wähle "Detailansicht" Tab.
            </div>
            <InvoiceDetailPanel
              invoice={selectedInvoice}
              open={detailOpen}
              onClose={() => setDetailOpen(false)}
              onEdit={() => log('edit')}
              onDownload={() => log('download')}
              onPrint={() => log('print')}
              onDelete={() => log('delete')}
              onStatusChange={(s) => log('statusChange', s)}
            />
          </div>
        )}

        {tab === 'editor' && (
          <div className="flex gap-6 items-start">
            <div className="flex-1 max-w-[50%]">
              <InvoiceEditor
                data={editorData}
                onChange={setEditorData}
                contacts={mockContacts}
                companies={mockCompanies}
              />
            </div>
            <InvoicePreview data={editorData} />
          </div>
        )}

        {tab === 'template' && (
          <div className="flex gap-6 items-start">
            <div className="flex-1 max-w-[50%]">
              <TemplateEditor
                data={templateData}
                onChange={setTemplateData}
                templateName="Standard Vorlage"
                onRename={(name) => log('rename', name)}
                onSave={() => log('save')}
                onDelete={() => log('delete')}
              />
            </div>
            <div className="flex-1 flex flex-col gap-4">
              <InvoicePreview data={templateData} />
              <div className="px-2">
                <button
                  onClick={() => setShowJson(!showJson)}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                >
                  {showJson ? 'JSON ausblenden' : 'JSON anzeigen'}
                </button>
                {showJson && (
                  <div className="mt-2 bg-white border border-gray-200 rounded-xl p-4">
                    <pre className="text-[10px] text-gray-600 overflow-auto max-h-[40vh] leading-relaxed">
                      {JSON.stringify(templateData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mount ────────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(<PreviewApp />);
