import { cn } from '../../lib/utils.js';

export function Toast({ title, message, tone = 'success' }) {
  const classes = {
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    danger: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
    warning: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    info: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
  };
  return (
    <div className={cn('rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur', classes[tone] || classes.info)}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-zinc-200/90">{message}</p>
    </div>
  );
}