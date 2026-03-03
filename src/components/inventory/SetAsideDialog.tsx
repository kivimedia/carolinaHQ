'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Wrench, Droplets, Hand, MapPin, Settings, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-shadcn/dialog';
import { Input } from '@/components/ui-shadcn/input';
import { Textarea } from '@/components/ui-shadcn/textarea';
import { Label } from '@/components/ui-shadcn/label';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { cn } from '@/lib/utils';
import { useCreateSetAside } from '@/hooks/inventory/useSetAsides';
import { toast } from 'sonner';
import type { InventoryItem } from '@/lib/inventory/types';

const SET_ASIDE_REASONS = [
  { value: 'Damaged', icon: Wrench, label: 'Damaged' },
  { value: 'Dirty', icon: Droplets, label: 'Dirty' },
  { value: 'Held', icon: Hand, label: 'Held' },
  { value: 'Lost', icon: MapPin, label: 'Lost' },
  { value: 'Maintenance', icon: Settings, label: 'Maintenance' },
  { value: 'Stolen', icon: AlertTriangle, label: 'Stolen' },
] as const;

interface SetAsideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

export function SetAsideDialog({ open, onOpenChange, item }: SetAsideDialogProps) {
  const createSetAside = useCreateSetAside();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');

  const maxAvailable = item?.available_quantity ?? item?.quantity ?? 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (quantity < 1) { toast.error('Quantity must be at least 1'); return; }
    if (!startDate || !endDate) { toast.error('Dates are required'); return; }

    const reasonParts: string[] = [];
    if (selectedReason) reasonParts.push(selectedReason);
    if (note) reasonParts.push(note);
    const combinedReason = reasonParts.join(': ');

    try {
      await createSetAside.mutateAsync({
        inventory_item_id: item.id,
        quantity,
        start_date: startDate,
        end_date: endDate,
        reason: combinedReason || undefined,
      });

      toast.success(`${quantity} unit(s) of ${item.name} set aside`);
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error('Failed to create set aside');
    }
  };

  const resetForm = () => {
    setQuantity(1);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setNote('');
    setSelectedReason(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border-cb-pink-100">
        <DialogHeader>
          <DialogTitle className="text-navy font-bold">Create Set Aside</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="flex items-center gap-4 p-3 bg-cb-pink-50/50 rounded-xl">
            <div className="h-16 w-16 rounded-xl overflow-hidden bg-white border border-cb-pink-100 flex-shrink-0 flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-navy truncate">{item.name}</h3>
              {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>How many should be set aside?</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input
                type="number"
                min={1}
                max={maxAvailable}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-24 border-cb-pink-100 focus:ring-cb-pink"
              />
              <span className="text-sm text-cb-pink">Maximum available: {maxAvailable} Items</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-cb-pink-100 focus:ring-cb-pink"
                required
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-cb-pink-100 focus:ring-cb-pink"
                required
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Reason for set aside</Label>
            <div className="grid grid-cols-3 gap-2">
              {SET_ASIDE_REASONS.map((reason) => {
                const Icon = reason.icon;
                const isSelected = selectedReason === reason.value;
                return (
                  <button
                    key={reason.value}
                    type="button"
                    className={cn(
                      'h-10 flex items-center justify-start gap-2 px-3 rounded-xl border text-sm transition-colors',
                      isSelected
                        ? 'border-cb-pink bg-cb-pink/10 text-cb-pink-dark'
                        : 'border-cb-pink-100 text-navy hover:bg-cb-pink-50'
                    )}
                    onClick={() => setSelectedReason(isSelected ? null : reason.value)}
                  >
                    <Icon className="h-4 w-4" />
                    {reason.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Set Aside Note</Label>
            <Textarea
              placeholder="Add a note describing the issue..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[80px] resize-none border-cb-pink-100 focus:ring-cb-pink"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-cb-pink-100 pt-4">
            <InventoryButton type="submit" inventoryVariant="primary" disabled={createSetAside.isPending}>
              {createSetAside.isPending ? 'Creating...' : 'Create Set Aside'}
            </InventoryButton>
            <InventoryButton type="button" inventoryVariant="ghost" onClick={handleClose}>
              Cancel
            </InventoryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
