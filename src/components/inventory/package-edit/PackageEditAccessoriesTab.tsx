'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui-shadcn/input';
import { ScrollArea } from '@/components/ui-shadcn/scroll-area';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useInventoryItems } from '@/hooks/inventory/useInventory';
import { usePackageAccessories, useAddAccessoryRelation } from '@/hooks/inventory/useItemAccessoryRelations';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Package, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PackageEditAccessoriesTabProps {
  packageId: string;
  packageName: string;
}

export function PackageEditAccessoriesTab({ packageId, packageName }: PackageEditAccessoriesTabProps) {
  const { data: inventoryItems } = useInventoryItems({});
  const { data: itemAccessories = [] } = usePackageAccessories(packageId);
  const addAccessory = useAddAccessoryRelation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const existingIds = itemAccessories?.map((a: any) => a.accessory_item?.id || a.inventory_item_id).filter(Boolean) || [];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !inventoryItems) return [];
    return inventoryItems
      .filter(item => !item.archived_at && !existingIds.includes(item.id) &&
        (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         item.sku?.toLowerCase().includes(searchQuery.toLowerCase())))
      .slice(0, 10);
  }, [inventoryItems, searchQuery, existingIds]);

  const handleAdd = async (itemId: string) => {
    try {
      await addAccessory.mutateAsync({ inventoryItemId: itemId, accessoryOfPackageId: packageId, quantity: 1 });
      setSearchQuery('');
      toast.success('Accessory added');
    } catch {
      toast.error('Failed to add accessory');
    }
  };

  const handleRemove = async (relationId: string) => {
    setRemovingId(relationId);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('inventory_item_accessories').delete().eq('id', relationId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['package_accessories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_packages', packageId] });
      toast.success('Accessory removed');
    } catch {
      toast.error('Failed to remove');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-navy">Accessories</h3>
        <p className="text-sm text-muted-foreground">
          Adding Accessory items speeds up contract building. Required accessories are auto-added; optional ones are suggested.
        </p>
      </div>

      <p className="text-sm">
        What are required or optional Accessories to '{packageName}'?
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for Accessories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-cb-pink-100 focus:ring-cb-pink"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="border border-cb-pink-100 rounded-xl bg-white shadow-md max-h-48 overflow-auto">
          {searchResults.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-cb-pink-50 cursor-pointer" onClick={() => handleAdd(item.id)}>
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

      <ScrollArea className="max-h-[350px]">
        {(itemAccessories?.length || 0) === 0 ? (
          <div className="bg-cb-pink-50/30 rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">No Accessories have been added to this item yet.</p>
          </div>
        ) : (
          <div className="border border-cb-pink-100 rounded-xl overflow-hidden divide-y divide-cb-pink-100">
            {itemAccessories?.map((acc: any) => {
              const item = acc.accessory_item;
              if (!item) return null;
              return (
                <div key={acc.id} className="flex items-center gap-3 p-2">
                  <div className="h-8 w-8 rounded-lg bg-cb-pink-50 flex items-center justify-center">
                    <Package className="h-3 w-3 text-cb-pink" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">Qty: {acc.quantity}</span>
                  <InventoryButton
                    inventoryVariant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleRemove(acc.id)}
                    disabled={removingId === acc.id}
                  >
                    {removingId === acc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
