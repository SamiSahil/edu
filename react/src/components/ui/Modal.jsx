import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils.js';
import { Button } from './Button.jsx';

export function Modal({ open, onClose, title, description, children, actions, className, width = 'max-w-3xl' }) {
  useEffect(() => {
    const onEsc = (event) => event.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className={cn('max-h-[95vh] w-full overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 sm:rounded-3xl', width, className)}>
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-6">
          <div>
            {title ? <h2 className="text-lg font-semibold text-white">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="max-h-[calc(95vh-9rem)] overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {actions ? <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-800 px-4 py-4 sm:px-6">{actions}</div> : null}
      </div>
    </div>,
    document.body
  );
}