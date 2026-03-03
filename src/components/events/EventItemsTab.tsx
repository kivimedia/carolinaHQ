'use client';

import { useState } from 'react';
import { Plus, Trash2, Package, Pencil, GripVertical } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useRentalProjectItems, useDeleteRentalProjectItem, useUpdateRentalProjectItem } from '@/hooks/inventory/useRentalProjectItems';
import { AddEventItemDialog } from './AddEventItemDialog';

interface EventItemsTabProps {
  projectId: string;
}

export function EventItemsTab({ projectId }: EventItemsTabProps) {
  const { data: items, isLoading } = useRentalProjectItems(projectId);
  const deleteItem = useDeleteRentalProjectItem();
  const updateItem = useUpdateRentalProjectItem();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editRate, setEditRate] = useState(0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const subtotal = items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

  const startEdit = (item: typeof items extends (infer T)[] | undefined ? T : never) => {
    if (!item) return;
    setEditingId(item.id);
    setEditQty(item.quantity);
    setEditRate(item.rate);
  };

  const saveEdit = async (itemId: string) => {
    await updateItem.mutateAsync({
      id: itemId,
      project_id: projectId,
      quantity: editQty,
      rate: editRate,
      amount: editQty * editRate,
    });
    setEditingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-navy">
          Line Items {items && items.length > 0 && `(${items.length})`}
        </h3>
        <InventoryButton onClick={() => setAddDialogOpen(true)} className="text-sm">
          <Plus className="h-4 w-4 mr-1" /> Add Item
        </InventoryButton>
      </div>

      {!items || items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
          <Package className="mx-auto h-10 w-10 text-cb-pink/40" />
          <p className="mt-2 text-sm text-muted-foreground">No items yet. Add inventory items to this event.</p>
          <InventoryButton onClick={() => setAddDialogOpen(true)} className="mt-3 text-sm">
            <Plus className="h-4 w-4 mr-1" /> Add First Item
          </InventoryButton>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-cb-pink-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cb-pink-100 bg-cb-pink-50/30">
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-8"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">Qty</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Rate</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0 border-cb-pink-50 hover:bg-cb-pink-50/20 transition-colors">
                  <td className="px-2 py-3">
                    <GripVertical className="h-4 w-4 text-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.inventory_items?.image_url ? (
                        <img src={item.inventory_items.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-cb-pink/10 flex items-center justify-center">
                          <Package className="h-4 w-4 text-cb-pink" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        min={1}
                        value={editQty}
                        onChange={(e) => setEditQty(parseInt(e.target.value) || 1)}
                        className="w-16 text-center rounded border border-cb-pink-100 py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="text-right px-4 py-3">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={editRate}
                        onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                        className="w-20 text-right rounded border border-cb-pink-100 py-1 text-sm"
                      />
                    ) : (
                      `$${item.rate.toFixed(2)}`
                    )}
                  </td>
                  <td className="text-right px-4 py-3 font-medium">
                    {editingId === item.id
                      ? `$${(editQty * editRate).toFixed(2)}`
                      : `$${item.amount.toFixed(2)}`
                    }
                  </td>
                  <td className="text-right px-4 py-3">
                    {editingId === item.id ? (
                      <div className="flex gap-1 justify-end">
                        <InventoryButton inventoryVariant="ghost" className="h-7 px-2 text-xs" onClick={() => saveEdit(item.id)}>
                          Save
                        </InventoryButton>
                        <InventoryButton inventoryVariant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                          Cancel
                        </InventoryButton>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 hover:opacity-100">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-lg p-1.5 hover:bg-cb-pink-50 text-gray-400 hover:text-gray-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItem.mutate({ id: item.id, project_id: projectId })}
                          className="rounded-lg p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-cb-pink-50/30">
                <td colSpan={4} className="px-4 py-3 text-right font-semibold text-navy">
                  Subtotal
                </td>
                <td className="px-4 py-3 text-right font-bold text-navy">
                  ${subtotal.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <AddEventItemDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} projectId={projectId} />
    </div>
  );
}
