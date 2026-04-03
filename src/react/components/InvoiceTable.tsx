import React, { useState, useMemo, useCallback } from 'react';
import type { Invoice, InvoiceStatus, SortCol, SortDir } from '../types';
import { StatusBadge } from './shared/StatusBadge';
import {
  IconButton,
  EditIcon,
  DownloadIcon,
  PrintIcon,
  TrashIcon,
  CalendarIcon,
  UserIcon,
} from './shared/IconButton';
import { formatCHF, formatDate, formatNummer } from '../utils';

/* ── Types ── */

interface InvoiceTableProps {
  invoices: Invoice[];
  selectedId?: string;
  onRowClick: (id: string) => void;
  onEdit: (id: string) => void;
  onDownload: (id: string) => void;
  onPrint: (id: string) => void;
  onDelete: (id: string) => void;
  searchQuery?: string;
}

type TableSortCol = 'nummer' | 'empfaenger_name' | 'betrag' | 'status' | 'created_at';

/* ── Helpers ── */

const BuildingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
  </svg>
);

const ArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

function field(r: Invoice, key: string): string {
  return (r?.daten?.fields?.[key] as string) ?? '';
}

function matchesSearch(r: Invoice, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const dateStr = r.created_at ? formatDate(r.created_at) : '';
  const haystack = [
    r.nummer ? String(r.nummer) : '',
    r.absender_name ?? '',
    r.empfaenger_name ?? '',
    String(r.betrag || 0),
    dateStr,
    field(r, 'f-titel'),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function compareRows(a: Invoice, b: Invoice, col: TableSortCol, dir: SortDir): number {
  let va: string | number;
  let vb: string | number;

  switch (col) {
    case 'nummer':
      va = a.nummer ?? 0;
      vb = b.nummer ?? 0;
      break;
    case 'empfaenger_name':
      va = (a.empfaenger_name ?? '').toLowerCase();
      vb = (b.empfaenger_name ?? '').toLowerCase();
      break;
    case 'betrag':
      va = a.betrag || 0;
      vb = b.betrag || 0;
      break;
    case 'status':
      va = a.status ?? '';
      vb = b.status ?? '';
      break;
    default: // created_at
      va = new Date(a.created_at).getTime();
      vb = new Date(b.created_at).getTime();
  }

  if (va < vb) return dir === 'asc' ? -1 : 1;
  if (va > vb) return dir === 'asc' ? 1 : -1;
  return 0;
}

/* ── Grid column definition (matches .ca-sort-bar / .ca-row) ── */

const GRID_COLS = '60px 1fr auto 90px 100px';

/* ── Component ── */

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  selectedId,
  onRowClick,
  onEdit,
  onDownload,
  onPrint,
  onDelete,
  searchQuery,
}) => {
  const [sortCol, setSortCol] = useState<TableSortCol>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback(
    (col: TableSortCol) => {
      if (sortCol === col) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortCol(col);
        setSortDir(col === 'betrag' || col === 'created_at' ? 'desc' : 'asc');
      }
    },
    [sortCol],
  );

  const filtered = useMemo(
    () => invoices.filter((r) => matchesSearch(r, searchQuery ?? '')),
    [invoices, searchQuery],
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareRows(a, b, sortCol, sortDir)),
    [filtered, sortCol, sortDir],
  );

  const totalSum = useMemo(
    () => sorted.reduce((s, r) => s + (r.betrag || 0), 0),
    [sorted],
  );

  const waehrung = sorted[0]?.waehrung ?? 'CHF';

  /* ── Sort button ── */
  const SortBtn: React.FC<{ col: TableSortCol; label: string }> = ({ col, label }) => {
    const active = sortCol === col;
    const arrow = active ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';
    return (
      <span
        onClick={() => handleSort(col)}
        className={`text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap ${
          active ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'
        }`}
      >
        {label}
        {arrow}
      </span>
    );
  };

  /* ── Empty state ── */
  if (sorted.length === 0) {
    return (
      <div className="py-10 text-center text-gray-400 text-[13px]">
        Keine Rechnungen gefunden.
      </div>
    );
  }

  return (
    <div>
      {/* Sort bar */}
      <div
        className="grid items-center gap-x-4 px-5 py-2 bg-gray-50 border-b border-gray-200"
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <SortBtn col="nummer" label="Nr." />
        <span>
          <SortBtn col="empfaenger_name" label="Name" />
        </span>
        <SortBtn col="betrag" label="Betrag" />
        <SortBtn col="status" label="Status" />
        <SortBtn col="created_at" label="Datum" />
      </div>

      {/* Card rows */}
      <div>
        {sorted.map((r) => {
          const isDraft = r.status === 'entwurf';
          const isCancelled = r.status === 'storniert';
          const isSelected = r.id === selectedId;
          const numDisplay = r.nummer ? formatNummer(r.nummer) : '\u2014';
          const titel = field(r, 'f-titel') || r.empfaenger_name || '\u2014';
          const dateDisplay = formatDate(r.created_at);
          const amountDisplay = formatCHF(
            r.betrag || 0,
            r.waehrung ?? 'CHF',
          );

          return (
            <div
              key={r.id}
              onClick={() => onRowClick(r.id)}
              className={`group grid items-center gap-x-4 px-5 py-3 border-b border-gray-200 cursor-pointer transition-colors duration-100 last:border-b-0 ${
                isSelected
                  ? 'bg-indigo-50'
                  : 'hover:bg-gray-50'
              }`}
              style={{ gridTemplateColumns: GRID_COLS }}
            >
              {/* Number */}
              <div
                className={`font-mono text-xs font-semibold ${
                  isDraft || isCancelled ? 'text-gray-300' : 'text-indigo-600'
                }`}
              >
                {numDisplay}
              </div>

              {/* Main: title + meta sub-line */}
              <div className="min-w-0 overflow-hidden">
                <div
                  className={`text-[13.5px] font-semibold truncate ${
                    isDraft
                      ? 'text-gray-400'
                      : isCancelled
                        ? 'text-gray-400 line-through'
                        : 'text-gray-900'
                  }`}
                >
                  {titel}
                </div>
                <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                    <BuildingIcon className="w-[13px] h-[13px] shrink-0" />
                    {r.absender_name || '\u2014'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                    <ArrowIcon className="w-[13px] h-[13px] shrink-0" />
                    {r.empfaenger_name || '\u2014'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                    <CalendarIcon className="w-[13px] h-[13px] shrink-0" />
                    {dateDisplay}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div
                className={`font-mono text-[13px] font-semibold whitespace-nowrap text-right ${
                  isDraft
                    ? 'text-gray-400'
                    : isCancelled
                      ? 'text-gray-400 line-through'
                      : ''
                }`}
              >
                {amountDisplay}
              </div>

              {/* Status */}
              <div className="text-center">
                <StatusBadge status={r.status as InvoiceStatus} />
              </div>

              {/* Actions (visible on hover) */}
              <div className="flex gap-0.5 justify-end whitespace-nowrap">
                <IconButton
                  title="Bearbeiten"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(r.id);
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  title="PDF herunterladen"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(r.id);
                  }}
                >
                  <DownloadIcon />
                </IconButton>
                <IconButton
                  title="Drucken"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrint(r.id);
                  }}
                >
                  <PrintIcon />
                </IconButton>
                <IconButton
                  title="Loeschen"
                  variant="danger"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(r.id);
                  }}
                >
                  <TrashIcon />
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between px-5 py-3 text-[13px] font-bold border-t-2 border-gray-200 bg-gray-50">
        <span>Total ({sorted.length} Rechnungen)</span>
        <span>{formatCHF(totalSum, waehrung)}</span>
      </div>
    </div>
  );
};
