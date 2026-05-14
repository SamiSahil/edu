import { Button } from './Button.jsx';

export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
      <p className="text-sm text-zinc-400">Page {page} of {totalPages}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        {pages.slice(Math.max(0, page - 3), Math.min(totalPages, page + 2)).map((item) => (
          <Button key={item} variant={item === page ? 'primary' : 'ghost'} size="sm" onClick={() => onPageChange(item)}>{item}</Button>
        ))}
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}