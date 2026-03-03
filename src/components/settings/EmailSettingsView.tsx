'use client';

import { useState, useEffect } from 'react';
import { Mail, Send } from 'lucide-react';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { useEmailSettings, useUpdateEmailSettings, useSendTestEmail } from '@/hooks/inventory/useEmailSettings';

export default function EmailSettingsView() {
  const { data: settings, isLoading } = useEmailSettings();
  const updateSettings = useUpdateEmailSettings();
  const sendTest = useSendTestEmail();

  const [form, setForm] = useState({
    from_name: '',
    from_email: '',
    reply_to: '',
    footer_text: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_secure: true,
  });
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    if (settings) {
      setForm({
        from_name: settings.from_name || '',
        from_email: settings.from_email || '',
        reply_to: settings.reply_to || '',
        footer_text: settings.footer_text || '',
        smtp_host: settings.smtp_host || '',
        smtp_port: String(settings.smtp_port || '587'),
        smtp_user: settings.smtp_user || '',
        smtp_password: settings.smtp_password || '',
        smtp_secure: settings.smtp_secure !== false,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      ...form,
      smtp_port: parseInt(form.smtp_port) || 587,
    });
  };

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30"
      />
    </div>
  );

  if (isLoading) {
    return (
      <InventoryPageLayout title="Email Settings">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout title="Email Settings" description="Configure email delivery and templates">
      {/* Sender info */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-navy mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-cb-pink" /> Email Delivery
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('From Name', 'from_name', 'text', 'Carolina Balloons')}
            {field('From Email', 'from_email', 'email', 'hello@carolinaballoons.com')}
            {field('Reply-To', 'reply_to', 'email', 'info@carolinaballoons.com')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Text</label>
            <textarea
              value={form.footer_text}
              onChange={(e) => setForm(prev => ({ ...prev, footer_text: e.target.value }))}
              rows={3}
              placeholder="Text that appears at the bottom of all emails"
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30 resize-none"
            />
          </div>
        </div>
      </div>

      {/* SMTP */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-navy mb-4">SMTP Configuration</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {field('SMTP Host', 'smtp_host', 'text', 'smtp.gmail.com')}
            {field('SMTP Port', 'smtp_port', 'number', '587')}
            {field('SMTP Username', 'smtp_user')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field('SMTP Password', 'smtp_password', 'password')}
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={form.smtp_secure} onChange={(e) => setForm(prev => ({ ...prev, smtp_secure: e.target.checked }))}
                className="rounded border-gray-300" id="smtp-secure" />
              <label htmlFor="smtp-secure" className="text-sm text-gray-700">Use TLS/SSL</label>
            </div>
          </div>
        </div>
      </div>

      {/* Test & Save */}
      <div className="bg-white rounded-2xl border border-cb-pink-100 p-6">
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Send Test Email</label>
            <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full rounded-xl border border-cb-pink-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cb-pink/30" />
          </div>
          <InventoryButton inventoryVariant="outline" onClick={() => testEmail && sendTest.mutate(testEmail)} disabled={!testEmail || sendTest.isPending}>
            <Send className="h-4 w-4 mr-1" /> {sendTest.isPending ? 'Sending...' : 'Send Test'}
          </InventoryButton>
        </div>
        <div className="flex justify-end">
          <InventoryButton onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save Email Settings'}
          </InventoryButton>
        </div>
      </div>
    </InventoryPageLayout>
  );
}
