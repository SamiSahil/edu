import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils.js';

export function DropdownMenu({ trigger, items = [], align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const handleEsc = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const menuClasses = useMemo(
    () =>
      cn(
        'absolute top-full z-30 mt-2 min-w-48 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40',
        align === 'right' ? 'right-0' : 'left-0',
        className
      ),
    [align, className]
  );

  return (
    <div className="relative inline-flex" ref={ref}>
      <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800">
        {trigger}
      </button>
      {open ? (
        <div className={menuClasses}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              className={cn('flex w-full items-center justify-start rounded-xl px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50', item.danger && 'text-rose-300 hover:bg-rose-500/10')}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}