import type { ReactNode } from "react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
  emptyDescription?: string;
}

export function AdminTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage,
  emptyDescription,
}: AdminTableProps<T>) {
  if (!rows.length) {
    return (
      <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-8 text-center shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <h3 className="font-serif text-3xl text-[#111111]">{emptyMessage ?? "No records yet"}</h3>
        {emptyDescription ? <p className="mt-3 text-sm text-[#666666]">{emptyDescription}</p> : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E5E5E5] bg-white shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-[#F7F7F8]">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666] ${column.className ?? ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-[#E5E5E5] align-top">
                {columns.map((column) => {
                  const value = row[String(column.key)];
                  const rendered = column.render
                    ? column.render(row)
                    : value === undefined || value === null || value === ""
                      ? "—"
                      : typeof value === "string" || typeof value === "number" || typeof value === "boolean"
                        ? value
                        : JSON.stringify(value);

                  return (
                    <td key={`${rowIndex}-${String(column.key)}`} className="border-t border-[#E5E5E5] px-4 py-4 align-middle text-sm text-[#111111]">
                      {rendered}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
