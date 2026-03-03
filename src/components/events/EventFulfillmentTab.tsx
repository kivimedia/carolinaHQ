'use client';

import { useMemo } from 'react';
import { CheckSquare, Square, Package } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useRentalProjectItems } from '@/hooks/inventory/useRentalProjectItems';
import {
  useRentalProjectFulfillment,
  useUpdateFulfillmentState,
  useBulkUpdateFulfillment,
} from '@/hooks/inventory/useRentalProjectFulfillment';

interface EventFulfillmentTabProps {
  projectId: string;
}

export function EventFulfillmentTab({ projectId }: EventFulfillmentTabProps) {
  const { data: items, isLoading: itemsLoading } = useRentalProjectItems(projectId);
  const { data: fulfillment, isLoading: fulfillmentLoading } = useRentalProjectFulfillment(projectId);
  const updateState = useUpdateFulfillmentState();
  const bulkUpdate = useBulkUpdateFulfillment();

  const fulfillmentMap = useMemo(() => {
    const map = new Map<string, { is_pulled: boolean; is_prepped: boolean; is_loaded: boolean }>();
    (fulfillment || []).forEach((f) => {
      map.set(f.project_item_id, {
        is_pulled: f.is_pulled,
        is_prepped: f.is_prepped,
        is_loaded: f.is_loaded,
      });
    });
    return map;
  }, [fulfillment]);

  const isLoading = itemsLoading || fulfillmentLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
        <Package className="mx-auto h-10 w-10 text-cb-pink/40" />
        <p className="mt-2 text-sm text-muted-foreground">Add items to this event first to track fulfillment.</p>
      </div>
    );
  }

  const itemIds = items.map((i) => i.id);
  const stats = {
    pulled: itemIds.filter((id) => fulfillmentMap.get(id)?.is_pulled).length,
    prepped: itemIds.filter((id) => fulfillmentMap.get(id)?.is_prepped).length,
    loaded: itemIds.filter((id) => fulfillmentMap.get(id)?.is_loaded).length,
    total: itemIds.length,
  };

  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;

  const handleToggle = (projectItemId: string, field: 'is_pulled' | 'is_prepped' | 'is_loaded') => {
    const current = fulfillmentMap.get(projectItemId);
    updateState.mutate({
      projectItemId,
      field,
      value: !current?.[field],
      projectId,
    });
  };

  const handleBulkMark = (field: 'is_pulled' | 'is_prepped' | 'is_loaded', value: boolean) => {
    bulkUpdate.mutate({
      projectItemIds: itemIds,
      field,
      value,
      projectId,
    });
  };

  const FulfillmentCheckbox = ({ itemId, field }: { itemId: string; field: 'is_pulled' | 'is_prepped' | 'is_loaded' }) => {
    const checked = fulfillmentMap.get(itemId)?.[field] || false;
    return (
      <button
        onClick={() => handleToggle(itemId, field)}
        className={`rounded p-0.5 transition-colors ${checked ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}
      >
        {checked ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
      </button>
    );
  };

  return (
    <div>
      {/* Progress summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pulled', count: stats.pulled, color: 'blue' },
          { label: 'Prepped', count: stats.prepped, color: 'amber' },
          { label: 'Loaded', count: stats.loaded, color: 'green' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-2xl bg-${color}-50 border border-${color}-100 p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium text-${color}-600`}>{label}</span>
              <span className={`text-xs text-${color}-600`}>{count}/{stats.total}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full bg-${color}-400 transition-all`}
                style={{ width: `${pct(count)}%` }}
              />
            </div>
            <p className={`text-right text-xs mt-1 text-${color}-600`}>{pct(count)}%</p>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2 mb-4">
        <InventoryButton
          inventoryVariant="ghost"
          className="text-xs"
          onClick={() => handleBulkMark('is_pulled', true)}
          disabled={bulkUpdate.isPending}
        >
          Mark All Pulled
        </InventoryButton>
        <InventoryButton
          inventoryVariant="ghost"
          className="text-xs"
          onClick={() => handleBulkMark('is_prepped', true)}
          disabled={bulkUpdate.isPending}
        >
          Mark All Prepped
        </InventoryButton>
        <InventoryButton
          inventoryVariant="ghost"
          className="text-xs"
          onClick={() => handleBulkMark('is_loaded', true)}
          disabled={bulkUpdate.isPending}
        >
          Mark All Loaded
        </InventoryButton>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cb-pink-100 bg-cb-pink-50/30">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Item</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">Qty</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">Pulled</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">Prepped</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">Loaded</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0 border-cb-pink-50 hover:bg-cb-pink-50/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-cb-pink/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-cb-pink" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                    </div>
                  </div>
                </td>
                <td className="text-center px-4 py-3">{item.quantity}</td>
                <td className="text-center px-4 py-3">
                  <FulfillmentCheckbox itemId={item.id} field="is_pulled" />
                </td>
                <td className="text-center px-4 py-3">
                  <FulfillmentCheckbox itemId={item.id} field="is_prepped" />
                </td>
                <td className="text-center px-4 py-3">
                  <FulfillmentCheckbox itemId={item.id} field="is_loaded" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
