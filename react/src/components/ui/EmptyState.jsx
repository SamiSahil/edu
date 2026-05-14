import { Button } from './Button.jsx';

export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/70 p-10 text-center">
      <div className="mx-auto mb-4 h-14 w-14 rounded-full border border-zinc-700 bg-zinc-900" />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
      {actionLabel ? <Button className="mt-6" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  );
}