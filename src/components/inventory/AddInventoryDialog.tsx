'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui-shadcn/dialog';
import { Input } from '@/components/ui-shadcn/input';
import { Label } from '@/components/ui-shadcn/label';
import { Textarea } from '@/components/ui-shadcn/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui-shadcn/select';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useCreateInventoryItem } from '@/hooks/inventory/useInventory';
import type { InventoryCategory, InventoryItemType } from '@/lib/inventory/types';
import { toast } from 'sonner';

interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: InventoryCategory[];
}

export function AddInventoryDialog({ open, onOpenChange, categories }: AddInventoryDialogProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [rate, setRate] = useState('0');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subCategoryId, setSubCategoryId] = useState<string>('');
  const [itemType, setItemType] = useState<InventoryItemType>('product');

  const createItem = useCreateInventoryItem();

  const topCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createItem.mutateAsync({
        name: name.trim(),
        sku: sku.trim() || undefined,
        description: description.trim() || undefined,
        quantity: parseInt(quantity) || 0,
        available_quantity: parseInt(quantity) || 0,
        rate: parseFloat(rate) || 0,
        category_id: categoryId || undefined,
        sub_category_id: subCategoryId || undefined,
        item_type: itemType,
      });

      toast.success(`"${name}" added to inventory`);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to add item');
    }
  };

  const resetForm = () => {
    setName('');
    setSku('');
    setDescription('');
    setQuantity('0');
    setRate('0');
    setCategoryId('');
    setSubCategoryId('');
    setItemType('product');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-2xl border-cb-pink-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy font-bold">Add Inventory Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Letter A, Balloon Arch Kit"
              className="border-cb-pink-100 focus:ring-cb-pink"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. RML-A"
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as InventoryItemType)}>
                <SelectTrigger className="border-cb-pink-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="delivery_logistics">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setSubCategoryId(''); }}>
                <SelectTrigger className="border-cb-pink-100">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {topCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-category</Label>
              <Select value={subCategoryId} onValueChange={setSubCategoryId} disabled={!categoryId || subCategories.length === 0}>
                <SelectTrigger className="border-cb-pink-100">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {subCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
            <div className="space-y-2">
              <Label>Rate ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="border-cb-pink-100 focus:ring-cb-pink"
            />
          </div>

          <DialogFooter className="border-t border-cb-pink-100 pt-4 mt-4">
            <InventoryButton
              type="button"
              inventoryVariant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </InventoryButton>
            <InventoryButton
              type="submit"
              inventoryVariant="primary"
              disabled={!name.trim() || createItem.isPending}
            >
              {createItem.isPending ? 'Adding...' : 'Add Item'}
            </InventoryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
