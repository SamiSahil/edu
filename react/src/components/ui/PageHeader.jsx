import { Breadcrumbs } from './Breadcrumbs.jsx';

export function PageHeader({ title, description, breadcrumbs, actions, eyebrow }) {
  return (
    <div className="space-y-4">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      {eyebrow ? <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">{eyebrow}</p> : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="font-brand text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          {description ? <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}