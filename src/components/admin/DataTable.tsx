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
      <div className="text-center py-12 text-muted-foreground">{emptyMessage}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left py-3 px-4 text-muted-foreground font-medium"
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete || actions) && (
              <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                Azioni
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/50 hover:bg-muted/30"
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 px-4 text-foreground/80">
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
                      className="text-primary hover:text-primary/80 text-xs"
                    >
                      Modifica
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="text-destructive hover:text-destructive/80 text-xs"
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
