'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Receipt, Star } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useTaxRates, useCreateTaxRate, useUpdateTaxRate, useDeleteTaxRate } from '@/hooks/inventory/useTaxRates';

export default function TaxRatesView() {
  const { data: rates, isLoading } = useTaxRates();
  const createRate = useCreateTaxRate();
  const updateRate = useUpdateTaxRate();
  const deleteRate = useDeleteTaxRate();

  const [editing, setEditing] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formJurisdiction, setFormJurisdiction] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formActive, setFormActive] = useState(true);

  const startCreate = () => {
    setEditing(null);
    setIsCreating(true);
    setFormName('');
    setFormRate('');
    setFormJurisdiction('');
    setFormIsDefault(false);
    setFormActive(true);
  };

  const startEdit = (rate: any) => {
    setEditing(rate);
    setIsCreating(true);
    setFormName(rate.name);
    setFormRate(String(rate.rate || ''));
    setFormJurisdiction(rate.jurisdiction || '');
    setFormIsDefault(rate.is_default || false);
    setFormActive(rate.is_active !== false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formRate) return;
    const payload = {
      name: formName.trim(),
      rate: parseFloat(formRate),
      jurisdiction: formJurisdiction.trim() || null,
      is_default: formIsDefault,
      is_active: formActive,
    };

    if (editing) {
      await updateRate.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createRate.mutateAsync(payload);
    }
    setIsCreating(false);
    setEditing(null);
  };

  if (isLoading) {
    return (
      <InventoryPageLayout title="Tax Rates">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Tax Rates"
      description="Manage tax rates by jurisdiction"
      actions={<InventoryButton onClick={startCreate}><Plus className="h-4 w-4 mr-1" /> New Rate</InventoryButton>}
    >
      {isCreating && (
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5 mb-6">
          <h3 className="text-base font-semibold text-navy mb-4">{editing ? 'Edit Tax Rate' : 'New Tax Rate'}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., NC Sales Tax"
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%) *</label>
                <input type="number" step="0.001" value={formRate} onChange={(e) => setFormRate(e.target.value)}
                  placeholder="7.25"
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                <input value={formJurisdiction} onChange={(e) => setFormJurisdiction(e.target.value)}
                  placeholder="e.g., Mecklenburg County"
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formIsDefault} onChange={(e) => setFormIsDefault(e.target.checked)} className="rounded border-gray-300" id="tax-default" />
                <label htmlFor="tax-default" className="text-sm text-gray-700">Default rate</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-gray-300" id="tax-active" />
                <label htmlFor="tax-active" className="text-sm text-gray-700">Active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <InventoryButton inventoryVariant="ghost" onClick={() => { setIsCreating(false); setEditing(null); }}>Cancel</InventoryButton>
              <InventoryButton onClick={handleSave} disabled={!formName.trim() || !formRate}>{editing ? 'Save Changes' : 'Create Rate'}</InventoryButton>
            </div>
          </div>
        </div>
      )}

      {(!rates || rates.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-cb-pink/40" />
          <p className="mt-2 text-sm text-muted-foreground">No tax rates configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rates.map((rate: any) => (
            <div key={rate.id} className="bg-white rounded-2xl border border-cb-pink-100 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-navy">{rate.name}</h4>
                      {rate.is_default && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Star className="h-3 w-3 mr-0.5" /> Default
                        </span>
                      )}
                      {!rate.is_active && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Inactive</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rate.rate}% {rate.jurisdiction ? `- ${rate.jurisdiction}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(rate)} className="rounded-lg p-1.5 hover:bg-cb-pink-50 text-gray-400">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this tax rate?')) deleteRate.mutate(rate.id); }}
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
