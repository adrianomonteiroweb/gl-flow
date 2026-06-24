"use client";

import * as React from "react";
import { flexRender } from "@tanstack/react-table";

import { cn } from "@workspace/ui/lib/utils";
import { Root } from "@workspace/ui/components/datatable/root";
import { Header } from "@workspace/ui/components/datatable/header";
import { Body } from "@workspace/ui/components/datatable/body";

export type DatatableColumnMeta = {
  cardLabel?: string;
  cardRole?: "title" | "badge" | "actions";
  hideOnCard?: boolean;
};

interface ClassifiedCells {
  titleCell: any;
  badgeCell: any;
  actionsCell: any;
  bodyCells: any[];
}

export interface CardsProps {
  table: any;
  loading?: boolean;
  onRowClick?: (item: any) => void;
  emptyMessage?: React.ReactNode;
  className?: string;
}

export interface ResponsiveProps {
  table: any;
  columns: any;
  loading?: boolean;
  onRowClick?: (item: any) => void;
  emptyMessage?: React.ReactNode;
}

const getColumnMeta = (column: any): DatatableColumnMeta => {
  return (column?.columnDef?.meta ?? {}) as DatatableColumnMeta;
};

const getCardLabel = (column: any): string => {
  const meta = getColumnMeta(column);

  if (meta.cardLabel) {
    return meta.cardLabel;
  }

  const header = column?.columnDef?.header;

  if (typeof header === "string") {
    return header;
  }

  return column?.id ?? "";
};

const renderCellValue = (cell: any): React.ReactNode => {
  return flexRender(cell.column.columnDef.cell, cell.getContext());
};

const classifyCells = (cells: any[]): ClassifiedCells => {
  let titleCell: any = null;
  let badgeCell: any = null;
  let actionsCell: any = null;
  const candidateCells: any[] = [];

  for (const cell of cells) {
    const meta = getColumnMeta(cell.column);

    if (meta.hideOnCard) {
      continue;
    }

    if (meta.cardRole === "title" && !titleCell) {
      titleCell = cell;
      continue;
    }

    if (meta.cardRole === "badge" && !badgeCell) {
      badgeCell = cell;
      continue;
    }

    if (meta.cardRole === "actions" && !actionsCell) {
      actionsCell = cell;
      continue;
    }

    candidateCells.push(cell);
  }

  const bodyCells: any[] = [];

  for (const cell of candidateCells) {
    const id = cell.column.id;

    if (!titleCell && id === "name") {
      titleCell = cell;
      continue;
    }

    if (!badgeCell && id === "status") {
      badgeCell = cell;
      continue;
    }

    if (!actionsCell && id === "actions") {
      actionsCell = cell;
      continue;
    }

    bodyCells.push(cell);
  }

  if (!titleCell && bodyCells.length > 0) {
    titleCell = bodyCells.shift();
  }

  return { titleCell, badgeCell, actionsCell, bodyCells };
};

export const Cards = ({ table, loading, onRowClick, emptyMessage, className }: CardsProps): React.ReactElement => {
  const rows = table.getRowModel().rows;
  const isClickable = typeof onRowClick === "function";

  const renderRowCard = (row: any): React.ReactElement => {
    const { titleCell, badgeCell, actionsCell, bodyCells } = classifyCells(row.getVisibleCells());

    return (
      <div
        key={row.id}
        onClick={() => {
          if (isClickable) {
            onRowClick!(row.original);
          }
        }}
        className={cn(
          "space-y-3 rounded-lg border border-border bg-card p-4 text-card-foreground",
          isClickable ? "cursor-pointer transition-colors hover:bg-muted/50" : ""
        )}>
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-foreground">{titleCell ? renderCellValue(titleCell) : null}</div>
          {badgeCell ? <div className="shrink-0">{renderCellValue(badgeCell)}</div> : null}
        </div>

        {bodyCells.length > 0 ? (
          <div className="space-y-2">
            {bodyCells.map((cell: any) => (
              <div key={cell.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{getCardLabel(cell.column)}</span>
                <span className="text-right text-foreground">{renderCellValue(cell)}</span>
              </div>
            ))}
          </div>
        ) : null}

        {actionsCell ? (
          <div
            className="flex items-center justify-end gap-2 border-t border-border pt-3"
            onClick={(event) => event.stopPropagation()}>
            {renderCellValue(actionsCell)}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-card py-10 text-sm text-muted-foreground",
          className
        )}>
        Carregando...
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-card py-10 text-center text-sm text-muted-foreground",
          className
        )}>
        {emptyMessage}
      </div>
    );
  }

  return <div className={cn("flex flex-col gap-3", className)}>{rows.map((row: any) => renderRowCard(row))}</div>;
};

export const Responsive = ({ table, columns, loading, onRowClick, emptyMessage }: ResponsiveProps): React.ReactElement => {
  return (
    <>
      <div className="hidden lg:block">
        <Root>
          <Header table={table} />
          <Body table={table} columns={columns} loading={loading} onRowClick={onRowClick}>
            {emptyMessage}
          </Body>
        </Root>
      </div>

      <Cards table={table} loading={loading} onRowClick={onRowClick} emptyMessage={emptyMessage} className="lg:hidden" />
    </>
  );
};
