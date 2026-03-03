'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui-shadcn/input';
import { Label } from '@/components/ui-shadcn/label';
import { ScrollArea } from '@/components/ui-shadcn/scroll-area';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useInventoryItems } from '@/hooks/inventory/useInventory';
import { Search, Package, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PackageEditServicesTabProps {
  packageId: string;
  packageName: string;
  deliveryRequired: boolean;
  setDeliveryRequired: (v: boolean) => void;
}

export function PackageEditServicesTab({
  packageId,
  packageName,
  deliveryRequired,
  setDeliveryRequired,
}: PackageEditServicesTabProps) {
  const { data: inventoryItems } = useInventoryItems({});
  const [searchQuery, setSearchQuery] = useState('');

  const serviceItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.filter(i => i.item_type === 'service' && !i.archived_at);
  }, [inventoryItems]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return serviceItems
      .filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 10);
  }, [serviceItems, searchQuery]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-navy">Associated Services</h3>
        <p className="text-sm text-muted-foreground">
          Adding Services speeds up contract building. Required services auto-add to contracts; optional ones are suggested.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Label>Is delivery required?</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-1 text-sm cursor-pointer">
            <input
              type="radio"
              checked={deliveryRequired}
              onChange={() => setDeliveryRequired(true)}
              className="accent-cb-pink"
            />
            Yes
          </label>
          <label className="flex items-center gap-1 text-sm cursor-pointer">
            <input
              type="radio"
              checked={!deliveryRequired}
              onChange={() => setDeliveryRequired(false)}
              className="accent-cb-pink"
            />
            No
          </label>
        </div>
      </div>

      <p className="text-sm">
        Are there any required or optional services for '{packageName}'?
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for Services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-cb-pink-100 focus:ring-cb-pink"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="border border-cb-pink-100 rounded-xl bg-white shadow-md max-h-48 overflow-auto">
          {searchResults.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-cb-pink-50 cursor-pointer"
              onClick={() => toast.info('Service association coming soon')}>
              <div className="h-8 w-8 rounded-lg bg-cb-pink-50 flex items-center justify-center">
                <Package className="h-4 w-4 text-cb-pink" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-cb-pink-50/30 rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">No Services have been added to this package yet.</p>
      </div>
    </div>
  );
}
