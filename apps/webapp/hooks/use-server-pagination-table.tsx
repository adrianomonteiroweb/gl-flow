"use client";

import { useState } from "react";

import {
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  type RowSelectionState,
} from "@tanstack/react-table";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  columns: any[];
  data: any[];
  count: number;
  /** Opt-in row selection (checkbox column). Off by default. */
  enableRowSelection?: boolean;
  /** Field used as the stable row id when selection is enabled. */
  getRowId?: (row: any) => string;
};

export function useServerPaginationTable({ columns, data, count, enableRowSelection = false, getRowId }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pageIndex = (parseInt(searchParams.get("page") as string) || 1) - 1;
  const pageSize = parseInt(searchParams.get("pageSize") as string) || 50;

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),

    manualPagination: true,
    pageCount: Math.ceil(count / pageSize),

    rowCount: count,

    ...(enableRowSelection
      ? {
          enableRowSelection: true,
          state: { rowSelection },
          onRowSelectionChange: setRowSelection,
          getRowId: getRowId ?? ((row: any) => String(row.id)),
        }
      : {}),

    initialState: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  });

  const handlePageChange = (pageIndex: number) => {
    const params: any = {
      ...Object.fromEntries(searchParams.entries()),
      page: (pageIndex + 1).toString(),
      pageSize,
    };

    router.replace("?" + new URLSearchParams(params).toString());
  };

  const handlePageSizeChange = (pageSize: number) => {
    const params: any = {
      ...Object.fromEntries(searchParams.entries()),
      pageSize: pageSize.toString(),
    };

    router.replace("?" + new URLSearchParams(params).toString());
  };

  const selectedRowIds = Object.keys(rowSelection).filter(id => rowSelection[id]);

  const clearSelection = () => setRowSelection({});

  return {
    table,
    handlePageChange,
    handlePageSizeChange,
    selectedRowIds,
    clearSelection,
  };
}

export default useServerPaginationTable;
