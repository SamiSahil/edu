import { cn } from '../../lib/utils.js';

export function FilterChips({ items = [], active = null, onChange }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'rounded-full border px-3 py-2 text-xs font-medium transition',
            active === item.key ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300' : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}