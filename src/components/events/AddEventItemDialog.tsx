'use client';

import { useState, useMemo } from 'react';
import { X, Search, Package } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useCreateRentalProjectItem } from '@/hooks/inventory/useRentalProjectItems';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface AddEventItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AddEventItemDialog({ open, onOpenChange, projectId }: AddEventItemDialogProps) {
  const createItem = useCreateRentalProjectItem();
  const [search, setSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [rate, setRate] = useState(0);
  const [customName, setCustomName] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  // Fetch inventory items
  const { data: inventoryItems } = useQuery({
    queryKey: ['inventory_items_for_picker'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, sku, rate, image_url, quantity, available_quantity, category_id, inventory_categories(name)')
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const filtered = useMemo(() => {
    if (!inventoryItems) return [];
    if (!search.trim()) return inventoryItems;
    const q = search.toLowerCase();
    return inventoryItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q))
    );
  }, [inventoryItems, search]);

  const selectedItem = inventoryItems?.find((i) => i.id === selectedItemId);

  const handleSelectItem = (item: typeof filtered[0]) => {
    setSelectedItemId(item.id);
    setRate(item.rate || 0);
    setQuantity(1);
    setIsCustom(false);
  };

  const handleAdd = async () => {
    const itemName = isCustom ? customName.trim() : selectedItem?.name || '';
    if (!itemName) return;

    await createItem.mutateAsync({
      project_id: projectId,
      name: itemName,
      inventory_item_id: isCustom ? null : selectedItemId,
      quantity,
      rate,
      amount: quantity * rate,
      category: isCustom ? 'Custom' : (selectedItem as any)?.inventory_categories?.name || null,
    });

    setSearch('');
    setSelectedItemId(null);
    setQuantity(1);
    setRate(0);
    setCustomName('');
    setIsCustom(false);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-cb-pink-100">
          <h2 className="text-lg font-semibold text-navy">Add Item to Event</h2>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-auto">
          <div className="flex gap-2 mb-4">
            <InventoryButton
              inventoryVariant={!isCustom ? 'primary' : 'ghost'}
              className="text-sm"
              onClick={() => setIsCustom(false)}
            >
              <Package className="h-4 w-4 mr-1" /> From Inventory
            </InventoryButton>
            <InventoryButton
              inventoryVariant={isCustom ? 'primary' : 'ghost'}
              className="text-sm"
              onClick={() => { setIsCustom(true); setSelectedItemId(null); }}
            >
              Custom Item
            </InventoryButton>
          </div>

          {!isCustom ? (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search inventory..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cb-pink-100 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto border border-cb-pink-100 rounded-xl">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No items found</p>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`w-full flex items-center gap-3 p-3 text-left border-b last:border-b-0 border-cb-pink-50 hover:bg-cb-pink-50/50 transition-colors ${
                        selectedItemId === item.id ? 'bg-cb-pink/5 ring-1 ring-cb-pink/30' : ''
                      }`}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-cb-pink/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-cb-pink" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku && `${item.sku} - `}
                          ${(item.rate || 0).toFixed(2)} - {item.available_quantity}/{item.quantity} available
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Custom balloon arrangement"
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                autoFocus
              />
            </div>
          )}

          {(selectedItemId || isCustom) && (
            <div className="mt-4 grid grid-cols-3 gap-3 p-4 bg-cb-pink-50/30 rounded-xl border border-cb-pink-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-cb-pink-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-cb-pink-100 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                <div className="px-3 py-2 text-sm font-semibold text-navy">
                  ${(quantity * rate).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-cb-pink-100">
          <InventoryButton inventoryVariant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </InventoryButton>
          <InventoryButton
            onClick={handleAdd}
            disabled={(!selectedItemId && !isCustom) || (isCustom && !customName.trim()) || createItem.isPending}
          >
            {createItem.isPending ? 'Adding...' : 'Add Item'}
          </InventoryButton>
        </div>
      </div>
    </div>
  );
}
