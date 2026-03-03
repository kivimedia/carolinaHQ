'use client';

import React, { useState } from 'react';
import { useInventoryPackages } from '@/hooks/inventory/useInventoryPackages';
import { InventoryPageLayout } from '@/components/inventory-ui/InventoryPageLayout';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { InventoryBadge } from '@/components/inventory-ui/InventoryBadge';
import {
  InventoryTable,
  InventoryTableHeader,
  InventoryTableHead,
  InventoryTableBody,
  InventoryTableRow,
  InventoryTableCell,
} from '@/components/inventory-ui/InventoryTable';
import { Input } from '@/components/ui-shadcn/input';
import { Skeleton } from '@/components/ui-shadcn/skeleton';
import { Plus, Search, Package, Layers } from 'lucide-react';
import { PackageDialog } from './PackageDialog';
import type { InventoryPackage } from '@/lib/inventory/types';

export default function PackagesView() {
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<InventoryPackage | null>(null);

  const { data: packages, isLoading } = useInventoryPackages();

  const filtered = (packages || []).filter(pkg => {
    if (!search) return true;
    const s = search.toLowerCase();
    return pkg.name.toLowerCase().includes(s) || pkg.sku?.toLowerCase().includes(s);
  });

  const totalPackages = filtered.length;

  return (
    <InventoryPageLayout
      title="Packages"
      description={`${totalPackages} packages`}
      actions={
        <InventoryButton inventoryVariant="primary" size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Package
        </InventoryButton>
      }
    >
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search packages by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-cb-pink-100 focus:ring-cb-pink"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : totalPackages === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-cb-pink-100">
          <Layers className="h-12 w-12 mx-auto text-cb-pink-light mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">
            {search ? 'No packages found' : 'No packages yet'}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {search
              ? 'Try adjusting your search.'
              : 'Create your first package to bundle inventory items together.'}
          </p>
          {!search && (
            <InventoryButton inventoryVariant="primary" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Package
            </InventoryButton>
          )}
        </div>
      ) : (
        <InventoryTable>
          <InventoryTableHeader>
            <InventoryTableRow>
              <InventoryTableHead className="w-12">#</InventoryTableHead>
              <InventoryTableHead>Package</InventoryTableHead>
              <InventoryTableHead>SKU</InventoryTableHead>
              <InventoryTableHead>Category</InventoryTableHead>
              <InventoryTableHead className="text-center">Items</InventoryTableHead>
              <InventoryTableHead className="text-right">Price</InventoryTableHead>
              <InventoryTableHead>Status</InventoryTableHead>
            </InventoryTableRow>
          </InventoryTableHeader>
          <InventoryTableBody>
            {filtered.map((pkg, index) => (
              <InventoryTableRow
                key={pkg.id}
                className="cursor-pointer"
                onClick={() => setEditingPackage(pkg)}
              >
                <InventoryTableCell className="text-muted-foreground text-xs">
                  {index + 1}
                </InventoryTableCell>
                <InventoryTableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cb-pink-50 flex items-center justify-center">
                      <Package className="h-5 w-5 text-cb-pink" />
                    </div>
                    <div>
                      <p className="font-medium text-navy">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{pkg.description}</p>
                      )}
                    </div>
                  </div>
                </InventoryTableCell>
                <InventoryTableCell className="text-muted-foreground text-sm font-mono">
                  {pkg.sku || '-'}
                </InventoryTableCell>
                <InventoryTableCell>
                  {pkg.category ? (
                    <span className="text-sm">{pkg.category.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </InventoryTableCell>
                <InventoryTableCell className="text-center font-semibold">
                  {pkg.items?.length || 0}
                </InventoryTableCell>
                <InventoryTableCell className="text-right font-mono text-sm">
                  {pkg.price > 0 ? `$${pkg.price.toFixed(2)}` : '-'}
                </InventoryTableCell>
                <InventoryTableCell>
                  <InventoryBadge variant={pkg.is_active ? 'success' : 'muted'}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </InventoryBadge>
                </InventoryTableCell>
              </InventoryTableRow>
            ))}
          </InventoryTableBody>
        </InventoryTable>
      )}

      <PackageDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <PackageDialog
        open={!!editingPackage}
        onOpenChange={(open) => { if (!open) setEditingPackage(null); }}
        package_={editingPackage}
      />
    </InventoryPageLayout>
  );
}
