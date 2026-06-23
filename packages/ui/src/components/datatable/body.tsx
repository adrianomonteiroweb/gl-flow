"use client";

import { TableBody, TableCell, TableRow } from "@workspace/ui/components/table";
import { flexRender } from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
  table: any;
  columns: any;
  loading?: boolean;
  children?: any;
  onRowClick?: (item: any) => void;
}

export function Body<TData, TValue>({
  table,
  columns,
  onRowClick,
  children,
  loading,
}: DataTableProps<TData, TValue>) {
  return (
    <TableBody>
      {table.getRowModel().rows?.length ? (
        table.getRowModel().rows.map((row: any) => (
          <TableRow
            className={!!onRowClick ? "cursor-pointer" : ""}
            key={row.id}
            data-state={row.getIsSelected() && "selected"}
            onClick={() => {
              if (onRowClick) {
                onRowClick(row.original);
              }
            }}
          >
            {row.getVisibleCells().map((cell: any) => (
              <TableCell
                key={cell.id}
                style={{
                  width: cell.column.getSize(),
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            {loading ? "Carregando..." : children}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}
