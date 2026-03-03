'use client';

import { useState, useEffect } from 'react';
import { Building, Upload } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useCompanySettings, useUpdateCompanySettings, useUploadCompanyLogo } from '@/hooks/inventory/useCompanySettings';

export default function CompanySettingsView() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const uploadLogo = useUploadCompanyLogo();

  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    timezone: 'America/New_York',
    website: '',
    tax_id: '',
    primary_color: '#ec4899',
  });

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name || '',
        phone: settings.phone || '',
        email: settings.email || '',
        address: settings.address || '',
        city: settings.city || '',
        state: settings.state || '',
        zip: settings.zip || '',
        country: settings.country || 'US',
        timezone: settings.timezone || 'America/New_York',
        website: settings.website || '',
        tax_id: settings.tax_id || '',
        primary_color: settings.primary_color || '#ec4899',
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(form);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo.mutate(file);
  };

  if (isLoading) {
    return (
      <InventoryPageLayout title="Company Settings">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
      />
    </div>
  );

  return (
    <InventoryPageLayout title="Company Settings" description="Manage your business information">
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-6 space-y-6">
        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
          <div className="flex items-center gap-4">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-contain border" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-cb-pink-50 flex items-center justify-center">
                <Building className="h-8 w-8 text-cb-pink/40" />
              </div>
            )}
            <label className="cursor-pointer">
              <InventoryButton inventoryVariant="outline" asChild>
                <span><Upload className="h-4 w-4 mr-1" /> Upload Logo</span>
              </InventoryButton>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Company Name', 'company_name')}
          {field('Phone', 'phone', 'tel')}
          {field('Email', 'email', 'email')}
          {field('Website', 'website', 'url')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Address', 'address')}
          {field('City', 'city')}
          {field('State', 'state')}
          {field('ZIP', 'zip')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('Country', 'country')}
          {field('Timezone', 'timezone')}
          {field('Tax ID', 'tax_id')}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
          <input
            type="color"
            value={form.primary_color}
            onChange={(e) => setForm(prev => ({ ...prev, primary_color: e.target.value }))}
            className="h-10 w-20 rounded-lg border border-cb-pink-100 cursor-pointer"
          />
        </div>

        <div className="flex justify-end">
          <InventoryButton onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </InventoryButton>
        </div>
      </div>
    </InventoryPageLayout>
  );
}
