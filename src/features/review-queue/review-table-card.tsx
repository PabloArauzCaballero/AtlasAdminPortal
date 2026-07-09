"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

export function ReviewTableCard<T>({
  title,
  data,
  columns,
  onPageChange,
}: Readonly<{
  title: string;
  data: T[];
  columns: ColumnDef<T>[];
  onPageChange: (page: number) => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader title={title} className="mb-0" />
      </CardHeader>
      <CardContent>
        <DataTable data={data} columns={columns} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}
