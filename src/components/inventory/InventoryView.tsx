'use client';

import React, { useState } from 'react';
import { useInventoryItems } from '@/hooks/inventory/useInventory';
import { useCategoryTree } from '@/hooks/inventory/useInventoryCategories';
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
import { Plus, Search, Package, Archive, ChevronRight, Boxes } from 'lucide-react';
import { AddInventoryDialog } from './AddInventoryDialog';
import { CategorySidePanel } from './CategorySidePanel';
import type { InventoryItem, InventoryCategory } from '@/lib/inventory/types';
import Link from 'next/link';

export default function InventoryView() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCategories, setShowCategories] = useState(true);

  const { data: items, isLoading } = useInventoryItems({
    search: search || undefined,
    categoryId: selectedCategory,
    showArchived,
  });

  const { data: categoryTree, categories } = useCategoryTree();

  const totalItems = items?.length || 0;
  const totalQuantity = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <InventoryPageLayout
      title="Inventory"
      description={`${totalItems} items - ${totalQuantity} total units`}
      actions={
        <div className="flex items-center gap-2">
          <InventoryButton
            inventoryVariant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-1" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </InventoryButton>
          <InventoryButton
            inventoryVariant="primary"
            size="sm"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </InventoryButton>
        </div>
      }
    >
      <div className="flex gap-6">
        {/* Category sidebar */}
        {showCategories && (
          <CategorySidePanel
            categories={categoryTree || []}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onClose={() => setShowCategories(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search bar */}
          <div className="mb-4 flex items-center gap-3">
            {!showCategories && (
              <InventoryButton
                inventoryVariant="ghost"
                size="icon"
                onClick={() => setShowCategories(true)}
              >
                <Boxes className="h-4 w-4" />
              </InventoryButton>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-cb-pink-100 focus:ring-cb-pink"
              />
            </div>
          </div>

          {/* Items table */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : totalItems === 0 ? (
            <EmptyState
              hasSearch={!!search || !!selectedCategory}
              onAddItem={() => setShowAddDialog(true)}
            />
          ) : (
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead className="w-12">#</InventoryTableHead>
                  <InventoryTableHead>Item</InventoryTableHead>
                  <InventoryTableHead>SKU</InventoryTableHead>
                  <InventoryTableHead>Category</InventoryTableHead>
                  <InventoryTableHead className="text-center">Qty</InventoryTableHead>
                  <InventoryTableHead className="text-center">Available</InventoryTableHead>
                  <InventoryTableHead className="text-right">Rate</InventoryTableHead>
                  <InventoryTableHead>Status</InventoryTableHead>
                </InventoryTableRow>
              </InventoryTableHeader>
              <InventoryTableBody>
                {items?.map((item, index) => (
                  <ItemRow key={item.id} item={item} index={index + 1} />
                ))}
              </InventoryTableBody>
            </InventoryTable>
          )}
        </div>
      </div>

      <AddInventoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        categories={categories || []}
      />
    </InventoryPageLayout>
  );
}

function ItemRow({ item, index }: { item: InventoryItem; index: number }) {
  const statusVariant = getStatusVariant(item.status);
  const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0];

  return (
    <Link href={`/inventory/${item.id}`} className="contents">
      <InventoryTableRow className="cursor-pointer">
        <InventoryTableCell className="text-muted-foreground text-xs">
          {index}
        </InventoryTableCell>
        <InventoryTableCell>
          <div className="flex items-center gap-3">
            {primaryImage ? (
              <img
                src={primaryImage.image_url}
                alt={item.name}
                className="w-10 h-10 rounded-lg object-cover border border-cb-pink-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-cb-pink-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-cb-pink" />
              </div>
            )}
            <div>
              <p className="font-medium text-navy">{item.name}</p>
              {item.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        </InventoryTableCell>
        <InventoryTableCell className="text-muted-foreground text-sm font-mono">
          {item.sku || '-'}
        </InventoryTableCell>
        <InventoryTableCell>
          {item.category ? (
            <span className="text-sm">{item.category.name}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </InventoryTableCell>
        <InventoryTableCell className="text-center font-semibold">
          {item.quantity}
        </InventoryTableCell>
        <InventoryTableCell className="text-center">
          <span className={item.available_quantity <= 0 ? 'text-red-500 font-semibold' : ''}>
            {item.available_quantity}
          </span>
        </InventoryTableCell>
        <InventoryTableCell className="text-right font-mono text-sm">
          {item.rate > 0 ? `$${item.rate.toFixed(2)}` : '-'}
        </InventoryTableCell>
        <InventoryTableCell>
          <InventoryBadge variant={statusVariant}>
            {item.status}
          </InventoryBadge>
        </InventoryTableCell>
      </InventoryTableRow>
    </Link>
  );
}

function EmptyState({ hasSearch, onAddItem }: { hasSearch: boolean; onAddItem: () => void }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl border border-cb-pink-100">
      <Package className="h-12 w-12 mx-auto text-cb-pink-light mb-4" />
      <h3 className="text-lg font-semibold text-navy mb-2">
        {hasSearch ? 'No items found' : 'No inventory items yet'}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        {hasSearch
          ? 'Try adjusting your search or category filter.'
          : 'Start by adding your first inventory item to track your marquee letters and supplies.'}
      </p>
      {!hasSearch && (
        <InventoryButton inventoryVariant="primary" onClick={onAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Item
        </InventoryButton>
      )}
    </div>
  );
}

function getStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'muted' {
  switch (status) {
    case 'available': return 'success';
    case 'rented': return 'warning';
    case 'maintenance': return 'danger';
    case 'retired': return 'muted';
    default: return 'muted';
  }
}
