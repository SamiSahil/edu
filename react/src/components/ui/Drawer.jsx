import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils.js';
import { Button } from './Button.jsx';

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  className,
  width = 'w-[290px]',
  placement = 'left', // left | right | bottom
  chrome = true, // show header + padding chrome
}) {
  useEffect(() => {
    const onEsc = (event) => event.key === 'Escape' && onClose?.();
    if (open) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const isBottom = placement === 'bottom';
  const isLeft = placement === 'left';
  const isRight = placement === 'right';

  const panelClasses = cn(
    'fixed z-50 flex flex-col overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60',
    isBottom ? 'inset-x-0 bottom-0 max-h-[95vh] rounded-t-3xl sm:bottom-auto sm:inset-0 sm:m-auto sm:max-h-[90vh] sm:w-full sm:max-w-4xl sm:rounded-3xl' : 'inset-y-0',
    isLeft ? `left-0 ${width}` : '',
    isRight ? `right-0 ${width}` : '',
    className
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div className={panelClasses}>
        {chrome ? (
          <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-6">
            <div>
              {title ? <h2 className="text-lg font-semibold text-white">{title}</h2> : null}
              {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : null}

        <div
          className={cn(
            'flex-1 overflow-y-auto',
            chrome ? 'px-4 py-4 sm:px-6' : ''
          )}
        >
          {children}
        </div>

        {chrome && actions ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-800 px-4 py-4 sm:px-6">
            {actions}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}