'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui-shadcn/table';
import { cn } from '@/lib/utils';

export function InventoryTable({ className, ...props }: React.ComponentProps<typeof Table>) {
  return (
    <div className="rounded-2xl border border-cb-pink-100 overflow-hidden bg-white">
      <Table className={cn('', className)} {...props} />
    </div>
  );
}

export function InventoryTableHeader({ className, ...props }: React.ComponentProps<typeof TableHeader>) {
  return (
    <TableHeader
      className={cn('bg-cb-pink-50 [&_tr]:border-b-cb-pink-100', className)}
      {...props}
    />
  );
}

export function InventoryTableHead({ className, ...props }: React.ComponentProps<typeof TableHead>) {
  return (
    <TableHead
      className={cn('text-cb-pink-dark font-semibold text-xs uppercase tracking-wider', className)}
      {...props}
    />
  );
}

export function InventoryTableBody({ className, ...props }: React.ComponentProps<typeof TableBody>) {
  return <TableBody className={cn('', className)} {...props} />;
}

export function InventoryTableRow({ className, ...props }: React.ComponentProps<typeof TableRow>) {
  return (
    <TableRow
      className={cn('hover:bg-cb-pink-50/50 border-b-cb-pink-100/50 transition-colors', className)}
      {...props}
    />
  );
}

export function InventoryTableCell({ className, ...props }: React.ComponentProps<typeof TableCell>) {
  return <TableCell className={cn('py-3', className)} {...props} />;
}

export {
  InventoryTable as Table,
  InventoryTableHeader as THeader,
  InventoryTableHead as THead,
  InventoryTableBody as TBody,
  InventoryTableRow as TRow,
  InventoryTableCell as TCell,
};
