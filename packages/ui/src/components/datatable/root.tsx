"use client";

import React from "react";
import { Table } from "@workspace/ui/components/table";

interface DataTableProps<TData, TValue> {
  children?: React.ReactNode;
}

export function Root<TData, TValue>({
  children,
}: DataTableProps<TData, TValue>) {
  return (
    <div className="rounded-md border">
      <Table>{children}</Table>
    </div>
  );
}
