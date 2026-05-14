import { cn } from '../../lib/utils.js';

export function Tabs({ tabs = [], active, onChange, className }) {
  return (
    <div className={cn('flex flex-wrap gap-2 rounded-full border border-zinc-800 bg-zinc-950 p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange?.(tab.key)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition',
            active === tab.key ? 'bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-400/20' : 'text-zinc-400 hover:text-white'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}