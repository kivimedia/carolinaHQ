'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui-shadcn/input';
import { ScrollArea } from '@/components/ui-shadcn/scroll-area';
import { InventoryButton } from '@/components/inventory-ui/InventoryButton';
import { useInventoryPackages } from '@/hooks/inventory/useInventoryPackages';
import { Search, Package } from 'lucide-react';
import { toast } from 'sonner';

interface PackageEditParentsTabProps {
  packageId: string;
  packageName: string;
}

export function PackageEditParentsTab({ packageId, packageName }: PackageEditParentsTabProps) {
  const { data: packages } = useInventoryPackages();
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !packages) return [];
    return packages
      .filter(p => p.is_active && p.id !== packageId &&
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.sku?.toLowerCase().includes(searchQuery.toLowerCase())))
      .slice(0, 10);
  }, [packages, searchQuery, packageId]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-navy">Parents</h3>
        <p className="text-sm text-muted-foreground">
          Add "parent" packages that this package is an accessory of.
        </p>
      </div>

      <p className="text-sm">
        What packages does '{packageName}' relate to as a required or optional accessory?
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for Parents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-cb-pink-100 focus:ring-cb-pink"
        />
      </div>

      {searchResults.length > 0 && (
        <div className="border border-cb-pink-100 rounded-xl bg-white shadow-md max-h-48 overflow-auto">
          {searchResults.map(pkg => (
            <div key={pkg.id} className="flex items-center gap-3 p-2 hover:bg-cb-pink-50 cursor-pointer"
              onClick={() => toast.info('Parent linking coming soon')}>
              <Package className="h-4 w-4 text-cb-pink shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{pkg.name}</p>
                <p className="text-xs text-muted-foreground">{pkg.sku || ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-cb-pink-50/30 rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">No Parents have been added to this item yet.</p>
      </div>
    </div>
  );
}
