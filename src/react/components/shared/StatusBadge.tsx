import type { InvoiceStatus } from '../../types';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; classes: string }> = {
  entwurf:   { label: 'Entwurf',   classes: 'bg-gray-100 text-gray-500 border border-gray-200' },
  offen:     { label: 'Offen',     classes: 'bg-blue-100 text-blue-800' },
  versendet: { label: 'Versendet', classes: 'bg-amber-100 text-amber-800' },
  bezahlt:   { label: 'Bezahlt',   classes: 'bg-green-100 text-green-800' },
  storniert: { label: 'Storniert', classes: 'bg-red-100 text-red-800' },
};

interface StatusBadgeProps {
  status: InvoiceStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.entwurf;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
