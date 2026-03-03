'use client';

import React, { useEffect, useState } from 'react';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { Input } from '@/components/ui-shadcn/input';
import { Label } from '@/components/ui-shadcn/label';
import { Switch } from '@/components/ui-shadcn/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui-shadcn/select';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import {
  useInventorySettings,
  useUpdateInventorySettings,
  useCategoryBufferSettings,
} from '@/hooks/inventory/useInventorySettings';
import { Loader2 } from 'lucide-react';

export default function InventorySettingsView() {
  const { data: settings, isLoading } = useInventorySettings();
  const updateSettings = useUpdateInventorySettings();
  const { data: bufferSettings } = useCategoryBufferSettings();

  const [defaultBuffer, setDefaultBuffer] = useState(0);
  const [applyBufferToAll, setApplyBufferToAll] = useState(false);
  const [autoReturnEnabled, setAutoReturnEnabled] = useState(false);
  const [autoReturnDays, setAutoReturnDays] = useState(7);
  const [bufferTimeUnit, setBufferTimeUnit] = useState<'hours' | 'days'>('days');
  const [preBufferTime, setPreBufferTime] = useState(0);
  const [postBufferTime, setPostBufferTime] = useState(0);

  useEffect(() => {
    if (settings) {
      setDefaultBuffer(settings.default_project_buffer);
      setApplyBufferToAll(settings.apply_buffer_to_all_items);
      setAutoReturnEnabled(settings.auto_return_enabled);
      setAutoReturnDays(settings.auto_return_days);
      setBufferTimeUnit(settings.buffer_time_unit as 'hours' | 'days');
      setPreBufferTime(settings.pre_buffer_time);
      setPostBufferTime(settings.post_buffer_time);
    }
  }, [settings]);

  const handleSave = () => {
    if (!settings) return;
    updateSettings.mutate({
      id: settings.id,
      default_project_buffer: defaultBuffer,
      apply_buffer_to_all_items: applyBufferToAll,
      auto_return_enabled: autoReturnEnabled,
      auto_return_days: autoReturnDays,
      buffer_time_unit: bufferTimeUnit,
      pre_buffer_time: preBufferTime,
      post_buffer_time: postBufferTime,
    });
  };

  if (isLoading) {
    return (
      <InventoryPageLayout title="Inventory Settings" description="Configure inventory behavior">
        <div className="space-y-4 max-w-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </InventoryPageLayout>
    );
  }

  return (
    <InventoryPageLayout
      title="Inventory Settings"
      description="Configure inventory behavior"
      actions={
        <InventoryButton inventoryVariant="primary" onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Settings
        </InventoryButton>
      }
    >
      <div className="max-w-2xl space-y-8">
        {/* Buffer Settings */}
        <section className="bg-white rounded-2xl border border-cb-pink-100 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-navy">Buffer Settings</h3>
          <p className="text-sm text-muted-foreground">
            Buffers hold back inventory to prevent overbooking.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Default Project Buffer</Label>
              <Input
                type="number"
                min={0}
                value={defaultBuffer}
                onChange={(e) => setDefaultBuffer(parseInt(e.target.value) || 0)}
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
            <div className="flex items-center justify-between pt-6">
              <Label>Apply to all items</Label>
              <Switch checked={applyBufferToAll} onCheckedChange={setApplyBufferToAll} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Buffer Time Unit</Label>
              <Select value={bufferTimeUnit} onValueChange={(v) => setBufferTimeUnit(v as 'hours' | 'days')}>
                <SelectTrigger className="border-cb-pink-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pre-buffer ({bufferTimeUnit})</Label>
              <Input
                type="number"
                min={0}
                value={preBufferTime}
                onChange={(e) => setPreBufferTime(parseInt(e.target.value) || 0)}
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
            <div>
              <Label>Post-buffer ({bufferTimeUnit})</Label>
              <Input
                type="number"
                min={0}
                value={postBufferTime}
                onChange={(e) => setPostBufferTime(parseInt(e.target.value) || 0)}
                className="border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
          </div>
        </section>

        {/* Auto Return */}
        <section className="bg-white rounded-2xl border border-cb-pink-100 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-navy">Auto Return</h3>
          <p className="text-sm text-muted-foreground">
            Automatically return items after an event ends.
          </p>

          <div className="flex items-center justify-between">
            <Label>Enable auto return</Label>
            <Switch checked={autoReturnEnabled} onCheckedChange={setAutoReturnEnabled} />
          </div>

          {autoReturnEnabled && (
            <div>
              <Label>Days after event ends</Label>
              <Input
                type="number"
                min={0}
                value={autoReturnDays}
                onChange={(e) => setAutoReturnDays(parseInt(e.target.value) || 0)}
                className="w-32 border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
          )}
        </section>

        {/* Category Buffers */}
        <section className="bg-white rounded-2xl border border-cb-pink-100 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-navy">Category Buffers</h3>
          <p className="text-sm text-muted-foreground">
            Override buffer settings for specific categories.
          </p>

          {(bufferSettings || []).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No category-specific buffers configured.</p>
          ) : (
            <div className="space-y-2">
              {bufferSettings?.map(bs => (
                <div key={bs.id} className="flex items-center justify-between p-3 rounded-xl bg-cb-pink-50/50">
                  <span className="text-sm font-medium text-navy">{bs.inventory_categories?.name || 'Unknown'}</span>
                  <span className="text-sm text-muted-foreground">
                    {bs.use_percentage ? `${bs.buffer_percentage}%` : `${bs.buffer_quantity} units`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </InventoryPageLayout>
  );
}
