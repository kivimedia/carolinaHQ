'use client';

import { Input } from '@/components/ui-shadcn/input';
import { Label } from '@/components/ui-shadcn/label';
import { Textarea } from '@/components/ui-shadcn/textarea';
import { Checkbox } from '@/components/ui-shadcn/checkbox';
import { Switch } from '@/components/ui-shadcn/switch';
import { Lock } from 'lucide-react';

interface PackageEditDetailsTabProps {
  sku: string;
  setSku: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  contractDescription: string;
  setContractDescription: (v: string) => void;
  ecommerceDescription: string;
  setEcommerceDescription: (v: string) => void;
  ecommerceSameAsContract: boolean;
  setEcommerceSameAsContract: (v: boolean) => void;
  contentsLocked: boolean;
  setContentsLocked: (v: boolean) => void;
}

export function PackageEditDetailsTab({
  sku, setSku,
  description, setDescription,
  contractDescription, setContractDescription,
  ecommerceDescription, setEcommerceDescription,
  ecommerceSameAsContract, setEcommerceSameAsContract,
  contentsLocked, setContentsLocked,
}: PackageEditDetailsTabProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between rounded-2xl border border-cb-pink-100 p-4 bg-cb-pink-50/30">
        <div className="flex items-center gap-3">
          <Lock className="h-5 w-5 text-cb-pink" />
          <div>
            <Label htmlFor="contents-locked" className="text-sm font-medium text-navy">Lock Package Contents</Label>
            <p className="text-xs text-muted-foreground">When enabled, imports will not overwrite this package's contents</p>
          </div>
        </div>
        <Switch
          id="contents-locked"
          checked={contentsLocked}
          onCheckedChange={setContentsLocked}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <Label htmlFor="pkg-sku">SKU / Inventory ID</Label>
            <Input
              id="pkg-sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="PKG-001"
              className="border-cb-pink-100 focus:ring-cb-pink"
            />
          </div>

          <div>
            <Label htmlFor="pkg-desc">Description</Label>
            <Textarea
              id="pkg-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Package description..."
              rows={3}
              className="border-cb-pink-100 focus:ring-cb-pink"
            />
          </div>

          <div>
            <Label htmlFor="contract-desc">Contract Description</Label>
            <Textarea
              id="contract-desc"
              value={contractDescription}
              onChange={(e) => setContractDescription(e.target.value)}
              placeholder="Description shown on contracts..."
              rows={4}
              className="border-cb-pink-100 focus:ring-cb-pink"
            />
          </div>

          <div>
            <Label htmlFor="ecommerce-desc">eCommerce Description</Label>
            <Textarea
              id="ecommerce-desc"
              value={ecommerceSameAsContract ? contractDescription : ecommerceDescription}
              onChange={(e) => setEcommerceDescription(e.target.value)}
              placeholder="Description shown online..."
              rows={4}
              disabled={ecommerceSameAsContract}
              className={`border-cb-pink-100 focus:ring-cb-pink ${ecommerceSameAsContract ? 'opacity-60' : ''}`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="ecommerce-same"
              checked={ecommerceSameAsContract}
              onCheckedChange={(checked) => setEcommerceSameAsContract(!!checked)}
            />
            <Label htmlFor="ecommerce-same" className="font-normal">
              eCommerce Description same as Contract Description
            </Label>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-navy">Images</h3>
            <p className="text-sm text-muted-foreground">
              Only JPG, GIF, PNG, HEIC, PDF files up to 8MB allowed.
            </p>
            <div className="mt-3 border-2 border-dashed border-cb-pink-100 rounded-2xl p-8 text-center text-muted-foreground">
              Image management available in the detail view
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
