"use client";

import {
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { flexRender } from "@tanstack/react-table";

interface DataTableProps<TData, TValue> {
  table: any;
}

export function Header<TData, TValue>({
  table,
}: DataTableProps<TData, TValue>) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup: any) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header: any) => {
            return (
              <TableHead
                key={header.id}
                style={{
                  width: header.column.getSize(),
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
              </TableHead>
            );
          })}
        </TableRow>
      ))}
    </TableHeader>
  );
}
