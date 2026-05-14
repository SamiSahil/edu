import { cn } from '../../lib/utils.js';

export function Input({ label, helperText, error, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <label className="block space-y-2 text-sm text-zinc-200" htmlFor={inputId}>
      {label ? <span className="font-medium text-zinc-200">{label}</span> : null}
      <input
        id={inputId}
        className={cn(
          'h-11 w-full rounded-2xl border bg-zinc-950 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-rose-500/60' : 'border-zinc-800',
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs text-rose-300">{error}</p> : helperText ? <p className="text-xs text-zinc-500">{helperText}</p> : null}
    </label>
  );
}