import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

import { Table } from "@tanstack/react-table";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

interface PaginationProps<TData> {
  table: Table<TData>;
  onPageChange?: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination<TData>({
  table,
  onPageChange,
  onPageSizeChange,
}: PaginationProps<TData>) {
  const handlePageChange = (pageIndex: number) => {
    table.setPageIndex(pageIndex);

    if (typeof onPageChange === "function") {
      onPageChange(pageIndex);
    }
  };

  const handlePageSizeChange = (pageSize: number) => {
    table.setPageSize(pageSize);

    if (typeof onPageSizeChange === "function") {
      onPageSizeChange(pageSize);
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium">Registros por página</p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            handlePageSizeChange(Number(value));
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 40, 50, 100, 200].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="items-center px-2 text-sm flex ">
        {table.getRowCount()} registro(s) encontrado(s)
      </div>

      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="w-[100px] items-center justify-center text-sm font-medium flex">
          Página {table.getState().pagination.pageIndex + 1} de{" "}
          {table.getPageCount() || 1}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Primeira</span>
            <ChevronsLeftIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              table.previousPage();

              if (
                table.getCanPreviousPage() &&
                typeof onPageChange === "function"
              ) {
                onPageChange(table.getState().pagination.pageIndex - 1);
              }
            }}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Anterior</span>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              table.nextPage();

              if (
                table.getCanNextPage() &&
                typeof onPageChange === "function"
              ) {
                onPageChange(table.getState().pagination.pageIndex + 1);
              }
            }}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Próxima</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Última</span>
            <ChevronsRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
