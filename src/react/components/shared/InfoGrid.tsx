import type { ReactNode } from 'react';

interface InfoItemData {
  label: string;
  value: ReactNode;
  sub?: string;
}

interface InfoGridProps {
  items: InfoItemData[];
  className?: string;
}

export function InfoGrid({ items, className = '' }: InfoGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 mb-[18px] ${className}`}>
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5"
        >
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            {item.label}
          </label>
          <span className="text-[13px] font-semibold text-gray-900">{item.value}</span>
          {item.sub && (
            <div className="text-[11px] text-gray-500 mt-0.5">{item.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
