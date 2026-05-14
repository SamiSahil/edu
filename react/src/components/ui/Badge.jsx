import { cn, statusTone } from '../../lib/utils.js';

const toneClasses = {
  success: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/20',
  warning: 'bg-amber-400/15 text-amber-300 border-amber-400/20',
  danger: 'bg-rose-400/15 text-rose-300 border-rose-400/20',
  info: 'bg-sky-400/15 text-sky-300 border-sky-400/20',
  neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
};

export function Badge({ children, variant, className }) {
  const tone = toneClasses[variant] || toneClasses[statusTone(variant)];
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize', tone, className)}>{children}</span>;
}