import { Link } from 'react-router-dom';

export function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
      {items.map((item, index) => (
        <span key={item.label} className="flex items-center gap-2">
          {index > 0 ? <span>/</span> : null}
          {item.href ? <Link to={item.href} className="transition hover:text-zinc-300">{item.label}</Link> : <span className={index === items.length - 1 ? 'text-zinc-300' : ''}>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}