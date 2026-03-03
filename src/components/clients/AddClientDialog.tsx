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
import { Textarea } from '@/components/ui-shadcn/textarea';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useCreateClient } from '@/hooks/inventory/useClients';

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const createClient = useCreateClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setName(''); setEmail(''); setPhone('');
    setCompany(''); setAddress(''); setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createClient.mutateAsync({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      resetForm();
      onOpenChange(false);
    } catch { /* handled by hook */ }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border-cb-pink-100">
        <DialogHeader>
          <DialogTitle className="text-navy font-bold">Add New Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Halley Foye"
              className="border-cb-pink-100 focus:ring-cb-pink"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="halley@email.com"
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name (optional)"
              className="border-cb-pink-100 focus:ring-cb-pink"
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State 12345"
              className="border-cb-pink-100 focus:ring-cb-pink"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this client..."
              rows={2}
              className="border-cb-pink-100 focus:ring-cb-pink resize-none"
            />
          </div>

          <DialogFooter className="border-t border-cb-pink-100 pt-4 mt-4">
            <InventoryButton type="button" inventoryVariant="ghost" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </InventoryButton>
            <InventoryButton
              type="submit"
              inventoryVariant="primary"
              disabled={!name.trim() || createClient.isPending}
            >
              {createClient.isPending ? 'Adding...' : 'Add Client'}
            </InventoryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
