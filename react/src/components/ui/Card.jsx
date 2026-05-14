import { cn } from '../../lib/utils.js';

export function Card({ className, children, ...props }) {
  return (
    <section className={cn('rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-[0_1px_0_rgba(255,255,255,0.02)] backdrop-blur', className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ className, children, ...props }) {
  return <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...props}>{children}</div>;
}

export function CardTitle({ className, children, ...props }) {
  return <h3 className={cn('text-lg font-semibold text-white', className)} {...props}>{children}</h3>;
}

export function CardDescription({ className, children, ...props }) {
  return <p className={cn('text-sm text-zinc-400', className)} {...props}>{children}</p>;
}

export function CardBody({ className, children, ...props }) {
  return <div className={cn('space-y-4', className)} {...props}>{children}</div>;
}