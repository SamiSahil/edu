import { Badge } from './Badge.jsx';
import { formatDateTime } from '../../lib/utils.js';

export function Timeline({ items = [] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id || `${item.title}-${item.createdAt}`} className="flex gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="mt-1 h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/40" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-medium text-white">{item.title || item.message || item.action}</h4>
              {item.badge ? <Badge variant={item.badge.variant}>{item.badge.label}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-zinc-400">{item.description || item.message || ''}</p>
            <p className="mt-2 text-xs text-zinc-500">{formatDateTime(item.createdAt || item.date || item.time)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}