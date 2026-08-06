"use client";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  actions,
  emptyMessage = "Nessun elemento",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-3 px-4 text-gray-400 font-medium"
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete || actions) && (
              <th className="text-right py-3 px-4 text-gray-400 font-medium">
                Azioni
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-800/50 hover:bg-gray-800/30"
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 text-gray-300">
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
              {(onEdit || onDelete || actions) && (
                <td className="py-3 px-4 text-right space-x-2">
                  {actions?.(item)}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-cyan-400 hover:text-cyan-300 text-xs"
                    >
                      Modifica
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Elimina
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
