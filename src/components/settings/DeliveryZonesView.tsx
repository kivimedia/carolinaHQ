'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useDeliveryZones, useCreateDeliveryZone, useUpdateDeliveryZone, useDeleteDeliveryZone } from '@/hooks/inventory/useDeliveryZones';

export default function DeliveryZonesView() {
  const { data: zones, isLoading } = useDeliveryZones();
  const createZone = useCreateDeliveryZone();
  const updateZone = useUpdateDeliveryZone();
  const deleteZone = useDeleteDeliveryZone();

  const [editing, setEditing] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formZips, setFormZips] = useState('');
  const [formBaseRate, setFormBaseRate] = useState('0');
  const [formPerMile, setFormPerMile] = useState('0');
  const [formMinFee, setFormMinFee] = useState('0');
  const [formActive, setFormActive] = useState(true);

  const startCreate = () => {
    setEditing(null);
    setIsCreating(true);
    setFormName('');
    setFormZips('');
    setFormBaseRate('0');
    setFormPerMile('0');
    setFormMinFee('0');
    setFormActive(true);
  };

  const startEdit = (zone: any) => {
    setEditing(zone);
    setIsCreating(true);
    setFormName(zone.name);
    setFormZips((zone.zip_codes || []).join(', '));
    setFormBaseRate(String(zone.base_rate || 0));
    setFormPerMile(String(zone.per_mile_rate || 0));
    setFormMinFee(String(zone.minimum_fee || 0));
    setFormActive(zone.is_active !== false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const payload = {
      name: formName.trim(),
      zip_codes: formZips.split(',').map(z => z.trim()).filter(Boolean),
      base_rate: parseFloat(formBaseRate) || 0,
      per_mile_rate: parseFloat(formPerMile) || 0,
      minimum_fee: parseFloat(formMinFee) || 0,
      is_active: formActive,
    };

    if (editing) {
      await updateZone.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createZone.mutateAsync(payload);
    }
    setIsCreating(false);
    setEditing(null);
  };

  const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

  if (isLoading) {
    return (
      <InventoryPageLayout title="Delivery Zones">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Delivery Zones"
      description="Manage delivery areas and pricing"
      actions={<InventoryButton onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New Zone</InventoryButton>}
    >
      {/* Form */}
      {isCreating && (
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5 mb-6">
          <h3 className="text-base font-semibold text-navy mb-4">{editing ? 'Edit Zone' : 'New Zone'}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Codes (comma-separated)</label>
                <input value={formZips} onChange={(e) => setFormZips(e.target.value)} placeholder="28202, 282*"
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate ($)</label>
                <input type="number" step="0.01" value={formBaseRate} onChange={(e) => setFormBaseRate(e.target.value)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Per Mile Rate ($)</label>
                <input type="number" step="0.01" value={formPerMile} onChange={(e) => setFormPerMile(e.target.value)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Fee ($)</label>
                <input type="number" step="0.01" value={formMinFee} onChange={(e) => setFormMinFee(e.target.value)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-gray-300" id="zone-active" />
              <label htmlFor="zone-active" className="text-sm text-gray-700">Active</label>
            </div>
            <div className="flex justify-end gap-2">
              <InventoryButton inventoryVariant="ghost" onClick={() => { setIsCreating(false); setEditing(null); }}>Cancel</InventoryButton>
              <InventoryButton onClick={handleSave} disabled={!formName.trim()}>{editing ? 'Save Changes' : 'Create Zone'}</InventoryButton>
            </div>
          </div>
        </div>
      )}

      {/* Zones list */}
      {(!zones || zones.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-cb-pink/40" />
          <p className="mt-2 text-sm text-muted-foreground">No delivery zones yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {zones.map((zone: any) => (
            <div key={zone.id} className="bg-white rounded-2xl border border-cb-pink-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-navy">{zone.name}</h4>
                    {!zone.is_active && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ZIPs: {(zone.zip_codes || []).join(', ') || 'None'}
                  </p>
                  <div className="flex gap-4 mt-1 text-sm">
                    <span>Base: {fmt(zone.base_rate)}</span>
                    <span>Per Mile: {fmt(zone.per_mile_rate)}</span>
                    <span>Min: {fmt(zone.minimum_fee)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(zone)} className="rounded-lg p-1.5 hover:bg-cb-pink-50 text-gray-400">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this zone?')) deleteZone.mutate(zone.id); }}
                    className="rounded-lg p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </InventoryPageLayout>
  );
}
