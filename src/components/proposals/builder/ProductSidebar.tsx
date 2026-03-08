'use client';

import { useEffect, useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui-shadcn/scroll-area';

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number | null;
  size_variants: { size: string; price: number }[] | null;
  notes: string | null;
}

interface ProductSidebarProps {
  onAddProduct: (product: Product) => void;
  addedProductIds: Set<string>;
}

const CATEGORY_LABELS: Record<string, string> = {
  arch: 'Arches',
  wall: 'Walls & Backdrops',
  garland: 'Garlands',
  marquee_letter: 'Marquee Letters & Numbers',
  centerpiece: 'Centerpieces',
  column: 'Columns & Towers',
  bouquet: 'Bouquets',
  banner: 'Banners',
  other: 'Other',
};

export default function ProductSidebar({ onAddProduct, addedProductIds }: ProductSidebarProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setProducts(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of filtered) {
      const cat = p.category || 'other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return map;
  }, [filtered]);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Open all categories on first load
  useEffect(() => {
    if (products.length > 0 && openCategories.size === 0) {
      setOpenCategories(new Set(products.map((p) => p.category || 'other')));
    }
  }, [products]);

  return (
    <div className="w-[280px] shrink-0 border-r border-cream-dark dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full">
      <div className="p-3 border-b border-cream-dark dark:border-slate-700">
        <h3 className="text-sm font-semibold text-navy dark:text-white mb-2">Products</h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full px-2.5 py-1.5 text-xs rounded-md border border-cream-dark dark:border-slate-600 bg-white dark:bg-slate-700 text-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-cb-pink/40"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading && (
            <div className="text-xs text-navy/40 dark:text-slate-500 text-center py-4">Loading products...</div>
          )}
          {!loading && grouped.size === 0 && (
            <div className="text-xs text-navy/40 dark:text-slate-500 text-center py-4">No products found</div>
          )}
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category} className="mb-1">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-navy/70 dark:text-slate-300 hover:bg-cream dark:hover:bg-slate-700 rounded transition-colors"
              >
                <span>{CATEGORY_LABELS[category] || category}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${openCategories.has(category) ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openCategories.has(category) && (
                <div className="ml-1 space-y-0.5">
                  {items.map((product) => {
                    const isAdded = addedProductIds.has(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => !isAdded && onAddProduct(product)}
                        disabled={isAdded}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between gap-1 ${
                          isAdded
                            ? 'bg-cb-pink/10 text-cb-pink cursor-default'
                            : 'hover:bg-cream dark:hover:bg-slate-700 text-navy dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{product.name}</span>
                        <span className="shrink-0 text-navy/40 dark:text-slate-500">
                          {isAdded ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            `$${product.base_price ?? 0}`
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
