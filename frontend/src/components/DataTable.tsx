import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: 'right';
};

export default function DataTable<T extends { id?: number | string }>(
  {
    columns,
    rows,
    loading,
    page = 1,
    pageSize = 20,
    total = 0,
    onPage,
    empty = 'Nothing here yet',
  }: {
    columns: Column<T>[];
    rows: T[];
    loading?: boolean;
    page?: number;
    pageSize?: number;
    total?: number;
    onPage?: (p: number) => void;
    empty?: string;
  }
) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {columns.map(c => (
                <th
                  key={c.key}
                  className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-slate-100" />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                  {empty}
                </td>
              </tr>
            )}

            {!loading && rows.map((r, i) => (
              <tr key={r.id ?? i} className="hover:bg-slate-50">
                {columns.map(c => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.render ? c.render(r) : String(r[c.key as keyof T] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onPage && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm text-slate-500">
          <span>{total} records</span>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              Prev
            </button>

            <span>{page} / {pages}</span>

            <button
              disabled={page >= pages}
              onClick={() => onPage(page + 1)}
              className="rounded border px-2 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}