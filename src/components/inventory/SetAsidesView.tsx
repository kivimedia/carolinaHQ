'use client';

import React, { useState } from 'react';
import { useSetAsides, useDeleteSetAside } from '@/hooks/inventory/useSetAsides';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryBadge } from '@/components/inventory-ui/InventoryBadge';
import {
  InventoryTable,
  InventoryTableHeader,
  InventoryTableHead,
  InventoryTableBody,
  InventoryTableRow,
  InventoryTableCell,
} from '@/components/inventory-ui/InventoryTable';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO, isAfter } from 'date-fns';
import { toast } from 'sonner';

export default function SetAsidesView() {
  const { data: setAsides, isLoading } = useSetAsides();
  const deleteSetAside = useDeleteSetAside();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSetAside.mutateAsync(id);
      toast.success('Set aside removed');
    } catch {
      toast.error('Failed to remove');
    } finally {
      setDeletingId(null);
    }
  };

  const now = new Date();
  const active = (setAsides || []).filter(sa => isAfter(parseISO(sa.end_date), now));
  const expired = (setAsides || []).filter(sa => !isAfter(parseISO(sa.end_date), now));

  return (
    <InventoryPageLayout
      title="Set Asides"
      description={`${active.length} active, ${expired.length} expired`}
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (setAsides || []).length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-cb-pink-100">
          <AlertTriangle className="h-12 w-12 mx-auto text-cb-pink-light mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No Set Asides</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Set asides reserve inventory items for maintenance, damage, or other reasons. Create them from the item detail page.
          </p>
        </div>
      ) : (
        <InventoryTable>
          <InventoryTableHeader>
            <InventoryTableRow>
              <InventoryTableHead>Item</InventoryTableHead>
              <InventoryTableHead className="text-center">Qty</InventoryTableHead>
              <InventoryTableHead>Start</InventoryTableHead>
              <InventoryTableHead>End</InventoryTableHead>
              <InventoryTableHead>Reason</InventoryTableHead>
              <InventoryTableHead>Status</InventoryTableHead>
              <InventoryTableHead className="w-12"></InventoryTableHead>
            </InventoryTableRow>
          </InventoryTableHeader>
          <InventoryTableBody>
            {(setAsides || []).map(sa => {
              const isActive = isAfter(parseISO(sa.end_date), now);
              return (
                <InventoryTableRow key={sa.id}>
                  <InventoryTableCell>
                    <p className="font-medium text-navy">
                      {(sa as any).inventory_items?.name || 'Unknown Item'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(sa as any).inventory_items?.sku || ''}
                    </p>
                  </InventoryTableCell>
                  <InventoryTableCell className="text-center font-semibold">{sa.quantity}</InventoryTableCell>
                  <InventoryTableCell className="text-sm">{format(parseISO(sa.start_date), 'MMM d, yyyy')}</InventoryTableCell>
                  <InventoryTableCell className="text-sm">{format(parseISO(sa.end_date), 'MMM d, yyyy')}</InventoryTableCell>
                  <InventoryTableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {sa.reason || '-'}
                  </InventoryTableCell>
                  <InventoryTableCell>
                    <InventoryBadge variant={isActive ? 'warning' : 'muted'}>
                      {isActive ? 'Active' : 'Expired'}
                    </InventoryBadge>
                  </InventoryTableCell>
                  <InventoryTableCell>
                    <InventoryButton
                      inventoryVariant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(sa.id)}
                      disabled={deletingId === sa.id}
                    >
                      {deletingId === sa.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </InventoryButton>
                  </InventoryTableCell>
                </InventoryTableRow>
              );
            })}
          </InventoryTableBody>
        </InventoryTable>
      )}
    </InventoryPageLayout>
  );
}
