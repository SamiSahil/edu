import { cn } from '../../lib/utils.js';

export function Checkbox({ label, helperText, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <label htmlFor={inputId} className={cn('flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-400 focus:ring-emerald-400/30"
        {...props}
      />
      <span>
        {label ? <span className="block font-medium text-zinc-200">{label}</span> : null}
        {helperText ? <span className="block text-xs text-zinc-500">{helperText}</span> : null}
      </span>
    </label>
  );
}