'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Input } from '@/components/ui-shadcn/input';
import { ScrollArea } from '@/components/ui-shadcn/scroll-area';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useInventoryItems } from '@/hooks/inventory/useInventory';
import { useAddPackageContentItem } from '@/hooks/inventory/usePackageContentRelations';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Package, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InventoryPackageItem } from '@/lib/inventory/types';

interface PackageEditContentsTabProps {
  packageId: string;
  packageName: string;
  items: InventoryPackageItem[];
}

export function PackageEditContentsTab({ packageId, packageName, items }: PackageEditContentsTabProps) {
  const { data: inventoryItems } = useInventoryItems({});
  const addItem = useAddPackageContentItem();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [localQuantities, setLocalQuantities] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const existingItemIds = items.map(i => i.inventory_item_id);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !inventoryItems) return [];
    return inventoryItems
      .filter(item => !item.archived_at && !existingItemIds.includes(item.id) &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.sku?.toLowerCase().includes(searchQuery.toLowerCase())))
      .slice(0, 10);
  }, [inventoryItems, searchQuery, existingItemIds]);

  const handleAddItem = async (itemId: string) => {
    try {
      await addItem.mutateAsync({ packageId, inventoryItemId: itemId, quantity: 1 });
      setSearchQuery('');
      toast.success('Item added');
    } catch {
      toast.error('Failed to add item');
    }
  };

  const handleRemoveItem = async (relationId: string) => {
    setRemovingId(relationId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('inventory_package_items').delete().eq('id', relationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['inventory_packages'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_packages', packageId] });
      queryClient.refetchQueries({ queryKey: ['inventory_packages', packageId] });
      toast.success('Item removed');
    } catch {
      toast.error('Failed to remove item');
    } finally {
      setRemovingId(null);
    }
  };

  const getDisplayQuantity = (item: InventoryPackageItem): string => {
    return localQuantities[item.id] !== undefined ? localQuantities[item.id] : String(item.quantity);
  };

  const handleQuantityChange = useCallback((relationId: string, rawValue: string) => {
    setLocalQuantities(prev => ({ ...prev, [relationId]: rawValue }));
    const parsed = parseInt(rawValue, 10);
    if (isNaN(parsed) || parsed < 1) return;

    if (debounceTimers.current[relationId]) clearTimeout(debounceTimers.current[relationId]);

    debounceTimers.current[relationId] = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('inventory_package_items')
        .update({ quantity: parsed })
        .eq('id', relationId);
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['inventory_packages', packageId] });
        queryClient.refetchQueries({ queryKey: ['inventory_packages', packageId] });
      }
      setLocalQuantities(prev => { const next = { ...prev }; delete next[relationId]; return next; });
      delete debounceTimers.current[relationId];
    }, 500);
  }, [packageId, queryClient]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-navy">Package Contents</h3>
        <p className="text-sm text-muted-foreground">
          Add the Items and Services required for this Package.
        </p>
      </div>

      <p className="text-sm">
        What are the contents of this '{packageName}' package?
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for contents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-cb-pink-100 focus:ring-cb-pink"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="border border-cb-pink-100 rounded-xl bg-white shadow-md max-h-48 overflow-auto">
          {searchResults.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 hover:bg-cb-pink-50 cursor-pointer"
              onClick={() => handleAddItem(item.id)}
            >
              <div className="h-8 w-8 rounded-lg bg-cb-pink-50 flex items-center justify-center">
                <Package className="h-4 w-4 text-cb-pink" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.sku || ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ScrollArea className="max-h-[400px]">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-cb-pink-100 rounded-2xl">
            No contents added yet. Use the search above to add items.
          </div>
        ) : (
          <div className="border border-cb-pink-100 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_80px_80px_60px] gap-2 p-2 bg-cb-pink-50 text-xs font-medium text-navy">
              <span></span>
              <span>Item</span>
              <span className="text-center">In Stock</span>
              <span className="text-center">Qty Needed</span>
              <span></span>
            </div>
            {items.map((item) => {
              const inv = item.inventory_item as any;
              return (
                <div key={item.id} className="grid grid-cols-[auto_1fr_80px_80px_60px] gap-2 p-2 border-t border-cb-pink-100 items-center">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-cb-pink-50 flex items-center justify-center shrink-0">
                      <Package className="h-3 w-3 text-cb-pink" />
                    </div>
                    <p className="text-sm font-medium truncate">{inv?.name || 'Unknown'}</p>
                  </div>
                  <p className="text-sm text-center">{inv?.quantity ?? '-'}</p>
                  <Input
                    type="number"
                    min={1}
                    value={getDisplayQuantity(item)}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    onBlur={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      if (isNaN(parsed) || parsed < 1) handleQuantityChange(item.id, String(item.quantity));
                    }}
                    className="h-8 text-center border-cb-pink-100"
                  />
                  <InventoryButton
                    inventoryVariant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={removingId === item.id}
                  >
                    {removingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </InventoryButton>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
