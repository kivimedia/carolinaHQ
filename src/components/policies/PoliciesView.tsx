'use client';

import { useState } from 'react';
import { Plus, Shield, FileText, Pencil, Trash2, Star, StarOff, AlertCircle } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { usePolicies, useCreatePolicy, useUpdatePolicy, useDeletePolicy } from '@/hooks/inventory/usePolicies';
import type { PolicyType, RentalPolicy } from '@/lib/inventory/types';

export default function PoliciesView() {
  const { data: policies, isLoading } = usePolicies();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();

  const [editingPolicy, setEditingPolicy] = useState<RentalPolicy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PolicyType>('payment');
  const [formContent, setFormContent] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [activeTab, setActiveTab] = useState<PolicyType | 'all'>('all');

  const startCreate = () => {
    setEditingPolicy(null);
    setIsCreating(true);
    setFormName('');
    setFormType('payment');
    setFormContent('');
    setFormDescription('');
    setFormIsDefault(false);
  };

  const startEdit = (policy: RentalPolicy) => {
    setEditingPolicy(policy);
    setIsCreating(true);
    setFormName(policy.name);
    setFormType(policy.type);
    setFormContent(policy.content);
    setFormDescription(policy.description || '');
    setFormIsDefault(policy.is_default || false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) return;

    if (editingPolicy) {
      await updatePolicy.mutateAsync({
        id: editingPolicy.id,
        name: formName,
        type: formType,
        content: formContent,
        description: formDescription || null,
        is_default: formIsDefault,
      });
    } else {
      await createPolicy.mutateAsync({
        name: formName,
        type: formType,
        content: formContent,
        description: formDescription || null,
        is_default: formIsDefault,
      });
    }
    setIsCreating(false);
    setEditingPolicy(null);
  };

  const policyTypes: { value: PolicyType; label: string; icon: React.ReactNode }[] = [
    { value: 'payment', label: 'Payment', icon: <Shield className="h-4 w-4 text-blue-500" /> },
    { value: 'cancellation', label: 'Cancellation', icon: <AlertCircle className="h-4 w-4 text-red-500" /> },
    { value: 'terms', label: 'Terms', icon: <FileText className="h-4 w-4 text-purple-500" /> },
  ];

  const filteredPolicies = policies?.filter(p => activeTab === 'all' || p.type === activeTab) || [];

  if (isLoading) {
    return (
      <InventoryPageLayout title="Policies">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Policies"
      description="Manage payment, cancellation, and terms policies"
      actions={
        <InventoryButton onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Policy
        </InventoryButton>
      }
    >
      {/* Editor form */}
      {isCreating && (
        <div className="bg-white rounded-2xl border border-cb-pink-100 p-5 mb-6">
          <h3 className="text-base font-semibold text-navy mb-4">
            {editingPolicy ? 'Edit Policy' : 'New Policy'}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as PolicyType)}
                  className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
                >
                  {policyTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30 resize-none font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formIsDefault}
                onChange={(e) => setFormIsDefault(e.target.checked)}
                className="rounded border-gray-300"
                id="policy-default"
              />
              <label htmlFor="policy-default" className="text-sm text-gray-700">Set as default for this type</label>
            </div>
            <div className="flex justify-end gap-2">
              <InventoryButton inventoryVariant="ghost" onClick={() => { setIsCreating(false); setEditingPolicy(null); }}>
                Cancel
              </InventoryButton>
              <InventoryButton onClick={handleSave} disabled={!formName.trim() || !formContent.trim()}>
                {editingPolicy ? 'Save Changes' : 'Create Policy'}
              </InventoryButton>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[{ value: 'all' as const, label: 'All' }, ...policyTypes.map(t => ({ value: t.value, label: t.label }))].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? 'bg-cb-pink text-white'
                : 'bg-white border border-cb-pink-100 text-gray-600 hover:bg-cb-pink-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Policy list */}
      {filteredPolicies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cb-pink-100 p-12 text-center">
          <Shield className="mx-auto h-10 w-10 text-cb-pink/40" />
          <p className="mt-2 text-sm text-muted-foreground">No policies yet. Create your first policy.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPolicies.map((policy) => {
            const typeConfig = policyTypes.find(t => t.value === policy.type);
            return (
              <div key={policy.id} className="bg-white rounded-2xl border border-cb-pink-100 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {typeConfig?.icon}
                    <h4 className="font-semibold text-navy">{policy.name}</h4>
                    {policy.is_default && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <Star className="h-3 w-3 mr-0.5" /> Default
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{policy.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(policy)} className="rounded-lg p-1.5 hover:bg-cb-pink-50 text-gray-400">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this policy?')) deletePolicy.mutate(policy.id);
                      }}
                      className="rounded-lg p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {policy.description && <p className="text-sm text-muted-foreground mb-2">{policy.description}</p>}
                <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{policy.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </InventoryPageLayout>
  );
}
