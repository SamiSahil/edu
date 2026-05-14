import { cn } from '../../lib/utils.js';

export function Table({ columns = [], rows = [], rowKey = 'id', empty, mobileRender, className }) {
  return (
    <div className={cn('space-y-4', className)}>
      {rows.length ? (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-zinc-800 md:block">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
              <thead className="bg-zinc-950/70 text-xs uppercase tracking-widest text-zinc-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={cn('px-4 py-3 font-mono', column.className)}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900/70">
                {rows.map((row) => (
                  <tr key={row[rowKey]} className="transition hover:bg-zinc-800/60">
                    {columns.map((column) => (
                      <td key={column.key} className={cn('px-4 py-4 text-zinc-200', column.className)}>
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <div key={row[rowKey]} className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-4">
                {mobileRender ? mobileRender(row) : columns.map((column) => (
                  <div key={column.key} className="flex items-center justify-between gap-4 py-1 text-sm">
                    <span className="text-zinc-500">{column.label}</span>
                    <span className="text-zinc-200">{column.render ? column.render(row) : row[column.key]}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        empty
      )}
    </div>
  );
}