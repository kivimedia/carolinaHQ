'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui-shadcn/dialog';
import { Input } from '@/components/ui-shadcn/input';
import { Label } from '@/components/ui-shadcn/label';
import { Badge } from '@/components/ui-shadcn/badge';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';

const SUGGESTED_TAGS = ['VIP', 'Corporate', 'Wedding', 'Nonprofit', 'Recurring', 'Referral', 'Priority'];

interface AddTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTag: (tag: string) => void;
  existingTags: string[];
  clientCount?: number;
}

export function AddTagDialog({ open, onOpenChange, onAddTag, existingTags, clientCount }: AddTagDialogProps) {
  const [newTag, setNewTag] = useState('');

  const availableSuggestions = SUGGESTED_TAGS.filter(
    (t) => !existingTags.some((et) => et.toLowerCase() === t.toLowerCase()),
  );

  const handleAdd = () => {
    if (!newTag.trim()) return;
    onAddTag(newTag.trim());
    setNewTag('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl border-cb-pink-100">
        <DialogHeader>
          <DialogTitle className="text-navy font-bold">
            {clientCount ? `Add Tag to ${clientCount} Clients` : 'Add Tag'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tag Name</Label>
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Enter a tag name..."
              className="border-cb-pink-100 focus:ring-cb-pink"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              autoFocus
            />
          </div>

          {availableSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Suggestions</Label>
              <div className="flex flex-wrap gap-1.5">
                {availableSuggestions.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-cb-pink-50 border-cb-pink-100"
                    onClick={() => { onAddTag(tag); onOpenChange(false); }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-cb-pink-100 pt-4">
          <InventoryButton inventoryVariant="ghost" onClick={() => onOpenChange(false)}>Cancel</InventoryButton>
          <InventoryButton inventoryVariant="primary" onClick={handleAdd} disabled={!newTag.trim()}>Add Tag</InventoryButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
