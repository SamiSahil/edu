import { cn, getInitials } from '../../lib/utils.js';

export function Avatar({ name, src, className, size = 'md' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base', xl: 'h-20 w-20 text-xl' };
  return (
    <div className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 text-zinc-200', sizes[size], className)}>
      {src ? <img src={src} alt={name || 'avatar'} className="h-full w-full object-cover" /> : <span className="font-semibold">{getInitials(name)}</span>}
    </div>
  );
}