'use client';

import { useState, useEffect } from 'react';
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
import { useUpdateClient } from '@/hooks/inventory/useClients';
import type { RentalClient } from '@/lib/inventory/types';

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: RentalClient | null;
}

export function EditClientDialog({ open, onOpenChange, client }: EditClientDialogProps) {
  const updateClient = useUpdateClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (client && open) {
      setName(client.name);
      setEmail(client.email || '');
      setPhone(client.phone || '');
      setCompany(client.company || '');
      setAddress(client.address || '');
      setNotes(client.notes || '');
    }
  }, [client, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !name.trim()) return;

    try {
      await updateClient.mutateAsync({
        id: client.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      onOpenChange(false);
    } catch { /* handled by hook */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl border-cb-pink-100">
        <DialogHeader>
          <DialogTitle className="text-navy font-bold">Edit Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="border-cb-pink-100 focus:ring-cb-pink" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="border-cb-pink-100 focus:ring-cb-pink" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="border-cb-pink-100 focus:ring-cb-pink" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} className="border-cb-pink-100 focus:ring-cb-pink" />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="border-cb-pink-100 focus:ring-cb-pink" />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="border-cb-pink-100 focus:ring-cb-pink resize-none" />
          </div>

          <DialogFooter className="border-t border-cb-pink-100 pt-4 mt-4">
            <InventoryButton type="button" inventoryVariant="ghost" onClick={() => onOpenChange(false)}>Cancel</InventoryButton>
            <InventoryButton type="submit" inventoryVariant="primary" disabled={!name.trim() || updateClient.isPending}>
              {updateClient.isPending ? 'Saving...' : 'Save Changes'}
            </InventoryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
