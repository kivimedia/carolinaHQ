'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, Building2, AlertCircle, RefreshCw, Plus, Mail, Phone, MapPin, Copy, Check,
  Pencil,
} from 'lucide-react';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useClientProjectsByStatus } from '@/hooks/inventory/useClientProjects';
import { useAddClientTag, useRemoveClientTag } from '@/hooks/inventory/useClientTags';
import { ClientTagBadge } from './ClientTagBadge';
import { ClientFinancialSummary } from './ClientFinancialSummary';
import { ClientNotesSection } from './ClientNotesSection';
import { EditClientDialog } from './EditClientDialog';
import { AddTagDialog } from './AddTagDialog';
import { toast } from 'sonner';
import type { RentalClient } from '@/lib/inventory/types';

export default function ClientDetailView({ clientId }: { clientId: string }) {
  const router = useRouter();
  const qc = useQueryClient();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);

  const addTag = useAddClientTag();
  const removeTag = useRemoveClientTag();

  // Fetch client
  const { data: client, isLoading, error, refetch } = useQuery({
    queryKey: ['rental_client_detail', clientId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('rental_clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (error) throw error;
      return data as RentalClient;
    },
    enabled: !!clientId,
  });

  // Client projects by status
  const { data: projectsByStatus, isLoading: projectsLoading } = useClientProjectsByStatus(clientId);

  const financialStats = {
    totalRevenue: projectsByStatus?.all.reduce((s, p) => s + (p.total || 0), 0) || 0,
    totalPaid: projectsByStatus?.all.reduce((s, p) => s + p.total_paid, 0) || 0,
    outstandingBalance: projectsByStatus?.all.reduce((s, p) => s + p.outstanding_balance, 0) || 0,
    projectCount: projectsByStatus?.all.length || 0,
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success(`${field} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleAddTag = async (tag: string) => {
    if (!client) return;
    await addTag.mutateAsync({ clientId: client.id, tag, currentTags: client.tags || [] });
    qc.invalidateQueries({ queryKey: ['rental_client_detail', clientId] });
  };

  const handleRemoveTag = async (tag: string) => {
    if (!client) return;
    await removeTag.mutateAsync({ clientId: client.id, tag, currentTags: client.tags || [] });
    qc.invalidateQueries({ queryKey: ['rental_client_detail', clientId] });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold">Client not found</h3>
          <p className="mt-2 text-muted-foreground">The client doesn't exist or you don't have access.</p>
          <div className="mt-4 flex justify-center gap-2">
            <InventoryButton inventoryVariant="ghost" onClick={() => router.push('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </InventoryButton>
            <InventoryButton inventoryVariant="ghost" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </InventoryButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <InventoryButton inventoryVariant="ghost" className="h-10 w-10 p-0" onClick={() => router.push('/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </InventoryButton>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cb-pink/10 text-xl font-bold text-cb-pink">
            {getInitials(client.name)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy">{client.name}</h1>
            {client.company && (
              <p className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />{client.company}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {(client.tags || []).map((tag) => (
                <ClientTagBadge key={tag} tag={tag} onRemove={() => handleRemoveTag(tag)} />
              ))}
              <InventoryButton inventoryVariant="ghost" className="h-6 px-2 text-xs" onClick={() => setAddTagDialogOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add Tag
              </InventoryButton>
            </div>
          </div>
        </div>

        <InventoryButton inventoryVariant="ghost" onClick={() => setEditDialogOpen(true)}>
          <Pencil className="h-4 w-4" />
        </InventoryButton>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
        <h3 className="text-base font-semibold text-navy mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {client.email && (
            <button
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-cb-pink-50"
              onClick={() => copyToClipboard(client.email!, 'Email')}
            >
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{client.email}</p>
              </div>
              {copiedField === 'Email' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          )}
          {client.phone && (
            <button
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-cb-pink-50"
              onClick={() => copyToClipboard(client.phone!, 'Phone')}
            >
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{client.phone}</p>
              </div>
              {copiedField === 'Phone' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          )}
          {client.address && (
            <button
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-cb-pink-50"
              onClick={() => copyToClipboard(client.address!, 'Address')}
            >
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium truncate">{client.address}</p>
              </div>
              {copiedField === 'Address' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-cb-pink-100">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <ClientFinancialSummary
        totalRevenue={financialStats.totalRevenue}
        totalPaid={financialStats.totalPaid}
        outstandingBalance={financialStats.outstandingBalance}
        projectCount={financialStats.projectCount}
      />

      {/* Events summary */}
      {projectsByStatus && projectsByStatus.all.length > 0 && (
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5">
          <h3 className="text-base font-semibold text-navy mb-4">Events ({projectsByStatus.all.length})</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-600">{projectsByStatus.upcoming.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-2xl font-bold text-green-600">{projectsByStatus.active.length}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-600">{projectsByStatus.past.length}</p>
              <p className="text-xs text-muted-foreground">Past</p>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <ClientNotesSection clientId={clientId} />

      {/* Dialogs */}
      <EditClientDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} client={client} />
      <AddTagDialog open={addTagDialogOpen} onOpenChange={setAddTagDialogOpen} onAddTag={handleAddTag} existingTags={client.tags || []} />
    </div>
  );
}
