"use client";
import { useMemo, useState } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  sortable?: boolean;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  rows,
  onRowClick,
  emptyLabel = "Aucun résultat.",
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
  }, [rows, sortKey, sortDir, columns]);

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(col.key);
      setSortDir(1);
    }
  }

  if (rows.length === 0) return <div className="empty">{emptyLabel}</div>;

  return (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} onClick={() => toggleSort(c)}>
              {c.label}
              {sortKey === c.key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={row.id ?? i} className={onRowClick ? "clickable" : ""} onClick={() => onRowClick?.(row)}>
            {columns.map((c) => (
              <td key={c.key}>{c.render ? c.render(row) : String((row as any)[c.key] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
