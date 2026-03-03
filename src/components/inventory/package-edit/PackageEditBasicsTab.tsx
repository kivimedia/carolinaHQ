'use client';

import { useState } from 'react';
import { Input } from '@/components/ui-shadcn/input';
import { Label } from '@/components/ui-shadcn/label';
import { Checkbox } from '@/components/ui-shadcn/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui-shadcn/select';
import { useCategoryTree } from '@/hooks/inventory/useInventoryCategories';

interface PackageEditBasicsTabProps {
  name: string;
  setName: (v: string) => void;
  categoryId: string | null;
  setCategoryId: (v: string | null) => void;
  price: number;
  setPrice: (v: number) => void;
  discountType: string;
  setDiscountType: (v: string) => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
}

export function PackageEditBasicsTab({
  name, setName,
  categoryId, setCategoryId,
  price, setPrice,
  discountType, setDiscountType,
  discountValue, setDiscountValue,
}: PackageEditBasicsTabProps) {
  const { categories } = useCategoryTree();
  const [pricingFlat, setPricingFlat] = useState(price > 0);

  const parentCategories = (categories || [])
    .filter(c => !c.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div>
          <Label htmlFor="pkg-name">Name *</Label>
          <Input
            id="pkg-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Package name"
            className="border-cb-pink-100 focus:ring-cb-pink"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-navy">Pricing Structure</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Select pricing structures for this package.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pricing-flat"
                checked={pricingFlat}
                onCheckedChange={(checked) => {
                  setPricingFlat(!!checked);
                  if (!checked) setPrice(0);
                }}
              />
              <Label htmlFor="pricing-flat">Flat Fee Pricing</Label>
            </div>

            {pricingFlat && (
              <div className="ml-6">
                <Label htmlFor="flat-price">Price *</Label>
                <Input
                  id="flat-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-40 border-cb-pink-100 focus:ring-cb-pink"
                  placeholder="$0.00"
                />
              </div>
            )}
          </div>

          {pricingFlat && (
            <div className="mt-4 space-y-2">
              <Label>Discount</Label>
              <div className="flex gap-2">
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="w-36 border-cb-pink-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-28 border-cb-pink-100 focus:ring-cb-pink"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor="pkg-category">Category</Label>
          <Select
            value={categoryId || 'none'}
            onValueChange={(v) => setCategoryId(v === 'none' ? null : v)}
          >
            <SelectTrigger id="pkg-category" className="border-cb-pink-100">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Category</SelectItem>
              {parentCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
