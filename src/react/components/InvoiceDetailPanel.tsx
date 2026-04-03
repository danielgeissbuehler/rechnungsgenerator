import { useState } from 'react';
import type { Invoice, InvoiceStatus } from '../types';
import { StatusBadge } from './shared/StatusBadge';
import {
  IconButton,
  EditIcon,
  DownloadIcon,
  PrintIcon,
  TrashIcon,
  CloseIcon,
  ChevronDownIcon,
  FileIcon,
} from './shared/IconButton';
import { InfoGrid } from './shared/InfoGrid';
import { PositionsTable } from './shared/PositionsTable';
import { formatCHF, formatDate, formatNummer, field, findMeta, buildAddress } from '../utils';
import { F } from '../types';

interface InvoiceDetailPanelProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onStatusChange: (newStatus: InvoiceStatus) => void;
  pdfPreview?: React.ReactNode;
}

export function InvoiceDetailPanel({
  invoice,
  open,
  onClose,
  onEdit,
  onDownload,
  onPrint,
  onDelete,
  onStatusChange,
  pdfPreview,
}: InvoiceDetailPanelProps) {
  const [pdfOpen, setPdfOpen] = useState(false);

  if (!invoice) return null;

  const r = invoice;
  const waehrung = r.waehrung || 'CHF';
  const totalBetrag = parseFloat(String(r.betrag)) || 0;
  const numStr = formatNummer(r.nummer);

  // Info values from daten snapshot
  const empName = field(r.daten, F.EMP_NAME) || r.empfaenger_name || '\u2014';
  const empAddr = buildAddress(
    field(r.daten, F.EMP_STRASSE),
    field(r.daten, F.EMP_HAUSNUMMER),
    field(r.daten, F.EMP_PLZ),
    field(r.daten, F.EMP_ORT),
  );

  const absName = field(r.daten, F.STELL_NAME) || r.absender_name || '\u2014';
  const absAddr = buildAddress(
    field(r.daten, F.STELL_ADRESSE),
    field(r.daten, F.STELL_HAUSNUMMER),
    field(r.daten, F.STELL_PLZ),
    field(r.daten, F.STELL_ORT),
  );

  const rechnDatum = findMeta(r.daten, 'datum') || formatDate(r.created_at);
  const faellig = findMeta(r.daten, 'zahlbar') || findMeta(r.daten, 'f\u00e4llig') || '\u2014';
  const bank = field(r.daten, F.BANK_NAME) || '\u2014';
  const iban = field(r.daten, F.IBAN) || '\u2014';

  const positions = r.daten?.positions || [];

  return (
    // Backdrop
    <div
      className={`
        fixed inset-0 z-[900] flex justify-end
        transition-opacity duration-300 ease-[cubic-bezier(.4,0,.2,1)]
        ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div
        className={`
          w-[min(680px,55vw)] h-full bg-white shadow-[-4px_0_24px_rgba(0,0,0,.08)]
          flex flex-col overflow-hidden
          transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)]
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400 mb-0.5">
              Rechnung {numStr}
            </div>
            <div className="text-[17px] font-bold text-gray-900 leading-tight truncate">
              {r.empfaenger_name || '\u2014'}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <StatusBadge status={r.status} />
              <span className="text-[11px] text-gray-400 font-mono">
                {formatCHF(totalBetrag, waehrung)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <IconButton icon={<EditIcon />} label="Im Editor \u00f6ffnen" onClick={onEdit} />
            <IconButton icon={<DownloadIcon />} label="PDF herunterladen" onClick={onDownload} />
            <IconButton icon={<PrintIcon />} label="Drucken" onClick={onPrint} />
            <IconButton icon={<TrashIcon />} label="L\u00f6schen" danger onClick={onDelete} />
            <IconButton icon={<CloseIcon />} label="Schliessen" onClick={onClose} />
          </div>
        </div>

        {/* ── Body (scrollable) ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Info grid: Empf/Abs/Datum/Zahlbar */}
          <InfoGrid
            items={[
              { label: 'Empf\u00e4nger', value: empName, sub: empAddr || undefined },
              { label: 'Absender', value: absName, sub: absAddr || undefined },
              { label: 'Datum', value: rechnDatum },
              { label: 'Zahlbar bis', value: faellig },
            ]}
          />

          {/* Section card: Positionen */}
          <div className="bg-white border border-gray-200 rounded-xl mb-[18px] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Positionen
            </div>
            <div className="px-4 py-3">
              <PositionsTable
                positions={positions}
                currency={waehrung}
                editable={false}
              />
            </div>
          </div>

          {/* Info grid: Bank / IBAN */}
          <InfoGrid
            items={[
              { label: 'Bank', value: bank },
              {
                label: 'IBAN',
                value: (
                  <span className="font-mono text-[11px] break-all">{iban}</span>
                ),
              },
            ]}
          />

          {/* PDF Accordion */}
          <div className="border border-gray-200 rounded-xl mb-[18px] overflow-hidden">
            <button
              type="button"
              onClick={() => setPdfOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold text-gray-700">
                <span className="w-4 h-4 text-gray-400">
                  <FileIcon />
                </span>
                PDF Vorschau
              </div>
              <span
                className={`
                  w-4 h-4 text-gray-400 transition-transform duration-200
                  ${pdfOpen ? 'rotate-180' : ''}
                `}
              >
                <ChevronDownIcon />
              </span>
            </button>
            {pdfOpen && (
              <div className="px-4 py-4 bg-gray-50/50">
                {pdfPreview || (
                  <p className="text-xs text-gray-400 italic">Keine Vorschau verf\u00fcgbar</p>
                )}
              </div>
            )}
          </div>

          {/* Status actions */}
          <StatusActions status={r.status} onStatusChange={onStatusChange} />
        </div>
      </div>
    </div>
  );
}

// ── Status action buttons ──────────────────────────────────────────────────

function StatusActions({
  status,
  onStatusChange,
}: {
  status: InvoiceStatus;
  onStatusChange: (s: InvoiceStatus) => void;
}) {
  const buttons: { label: string; target: InvoiceStatus; color: string }[] = [];

  if (status === 'entwurf') {
    buttons.push({ label: 'Rechnung versenden', target: 'versendet', color: 'amber' });
  } else if (status === 'offen') {
    buttons.push({ label: 'Rechnung versenden', target: 'versendet', color: 'amber' });
    buttons.push({ label: 'Als bezahlt markieren', target: 'bezahlt', color: 'green' });
    buttons.push({ label: 'Stornieren', target: 'storniert', color: 'danger' });
  } else if (status === 'versendet') {
    buttons.push({ label: 'Als bezahlt markieren', target: 'bezahlt', color: 'green' });
    buttons.push({ label: 'Stornieren', target: 'storniert', color: 'danger' });
  }

  if (buttons.length === 0) return null;

  const colorClasses: Record<string, string> = {
    amber: 'text-amber-600 border-amber-400 hover:bg-amber-50',
    green: 'text-green-600 border-green-400 hover:bg-green-50',
    danger: 'text-red-600 border-red-400 hover:bg-red-50',
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 mb-[18px]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2.5">
        Status \u00e4ndern
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((btn) => (
          <button
            key={btn.target}
            type="button"
            onClick={() => onStatusChange(btn.target)}
            className={`
              px-3 py-1.5 text-[12.5px] font-semibold rounded-lg border bg-transparent
              cursor-pointer transition-colors
              ${colorClasses[btn.color] || ''}
            `}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
