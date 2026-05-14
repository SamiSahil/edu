import { cn } from '../../lib/utils.js';

const variants = {
  primary: 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
  ghost: 'bg-transparent text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-zinc-700',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 shadow-lg shadow-rose-500/20',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export function Button({ className, variant = 'primary', size = 'md', loading = false, disabled, children, type = 'button', ...props }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border transition duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      <span>{children}</span>
    </button>
  );
}