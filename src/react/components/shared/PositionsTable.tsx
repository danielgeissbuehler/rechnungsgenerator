import { useCallback } from 'react';
import type { Position, Currency } from '../../types';
import { fmt, formatCHF } from '../../utils';

interface PositionsTableProps {
  positions: Position[];
  currency?: Currency;
  editable?: boolean;
  onChange?: (positions: Position[]) => void;
  onAdd?: () => void;
  /** Extra columns (col5-col8) labels. Only shown if provided. */
  extraColumns?: { key: 'col5' | 'col6' | 'col7' | 'col8'; label: string }[];
}

export function PositionsTable({
  positions,
  currency = 'CHF',
  editable = false,
  onChange,
  onAdd,
  extraColumns = [],
}: PositionsTableProps) {
  const total = positions.reduce((sum, p) => sum + (p.qty || 0) * (p.price || 0), 0);

  const update = useCallback(
    (index: number, field: keyof Position, value: string) => {
      if (!onChange) return;
      const next = positions.map((p, i) => {
        if (i !== index) return p;
        if (field === 'price' || field === 'qty') {
          return { ...p, [field]: parseFloat(value) || 0 };
        }
        return { ...p, [field]: value };
      });
      onChange(next);
    },
    [positions, onChange]
  );

  const remove = useCallback(
    (index: number) => {
      if (!onChange) return;
      onChange(positions.filter((_, i) => i !== index));
    },
    [positions, onChange]
  );

  return (
    <div>
      <table className="w-full border-collapse text-[12.5px] mb-1">
        <thead>
          <tr>
            <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 py-2 border-b border-gray-200">
              Bezeichnung
            </th>
            {extraColumns.map((col) => (
              <th key={col.key} className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 py-2 border-b border-gray-200">
                {col.label}
              </th>
            ))}
            <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 py-2 border-b border-gray-200">
              Menge
            </th>
            <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 py-2 border-b border-gray-200">
              Preis
            </th>
            <th className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400 py-2 border-b border-gray-200">
              Total
            </th>
            {editable && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {positions.length === 0 && (
            <tr>
              <td
                colSpan={4 + extraColumns.length + (editable ? 1 : 0)}
                className="py-2 text-gray-400 italic text-xs"
              >
                Keine Positionen erfasst
              </td>
            </tr>
          )}
          {positions.map((pos, i) => {
            const lineTotal = (pos.qty || 0) * (pos.price || 0);
            return (
              <tr key={pos.id} className="border-b border-gray-200 last:border-0">
                <td className="py-2">
                  {editable ? (
                    <input
                      type="text"
                      value={pos.desc}
                      onChange={(e) => update(i, 'desc', e.target.value)}
                      className="w-full px-2 py-1.5 border border-transparent rounded focus:bg-indigo-50 focus:border-indigo-200 outline-none text-[12.5px]"
                    />
                  ) : (
                    pos.desc || '\u2014'
                  )}
                </td>
                {extraColumns.map((col) => (
                  <td key={col.key} className="text-right font-mono text-xs py-2">
                    {editable ? (
                      <input
                        type="text"
                        value={pos[col.key] || ''}
                        onChange={(e) => update(i, col.key, e.target.value)}
                        className="w-full px-2 py-1.5 border border-transparent rounded text-right focus:bg-indigo-50 focus:border-indigo-200 outline-none text-xs"
                      />
                    ) : (
                      pos[col.key] || ''
                    )}
                  </td>
                ))}
                <td className="text-right font-mono text-xs py-2">
                  {editable ? (
                    <input
                      type="number"
                      value={pos.qty}
                      onChange={(e) => update(i, 'qty', e.target.value)}
                      className="w-20 px-2 py-1.5 border border-transparent rounded text-right focus:bg-indigo-50 focus:border-indigo-200 outline-none text-xs"
                    />
                  ) : (
                    pos.qty.toLocaleString('de-CH')
                  )}
                </td>
                <td className="text-right font-mono text-xs py-2">
                  {editable ? (
                    <input
                      type="number"
                      step="0.01"
                      value={pos.price}
                      onChange={(e) => update(i, 'price', e.target.value)}
                      className="w-24 px-2 py-1.5 border border-transparent rounded text-right focus:bg-indigo-50 focus:border-indigo-200 outline-none text-xs"
                    />
                  ) : (
                    fmt(pos.price)
                  )}
                </td>
                <td className="text-right font-mono text-xs py-2">
                  {fmt(lineTotal)}
                </td>
                {editable && (
                  <td className="text-center">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-red-400 hover:text-red-600 text-xs"
                      title="Entfernen"
                    >
                      &times;
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Total line */}
      <div className="flex justify-between items-center pt-2.5 border-t-2 border-gray-900 mt-0.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider">Total</span>
        <span className="text-base font-extrabold font-mono">{formatCHF(total, currency)}</span>
      </div>

      {editable && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-semibold text-indigo-600 mt-2 flex items-center gap-1 hover:opacity-70 transition-opacity"
        >
          + Position hinzufügen
        </button>
      )}
    </div>
  );
}
