'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ChevronDown, Star, Loader2, GripVertical, Package } from "lucide-react";
import { useProducts, useProductCategories, DbProduct } from "@/hooks/fun/use-products";
import { useOptions } from "@/hooks/fun/use-options";
import { useUserSettings } from "@/hooks/fun/use-user-settings";

interface Props {
  onAddProduct: (product: DbProduct) => void;
  onAddOption?: (option: { id: string; name: string; description: string; display_price: number; items: any[] }) => void;
  addedProductIds: string[];
  addedOptionIds?: string[];
}

export default function ProductSidebar({ onAddProduct, onAddOption, addedProductIds, addedOptionIds = [] }: Props) {
  const [search, setSearch] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Arches"]));
  const [showOptions, setShowOptions] = useState(true);
  const { data: products = [], isLoading } = useProducts();
  const { data: options = [] } = useOptions();
  const { data: settings } = useUserSettings();
  const categories = useProductCategories(products);

  const itemLabel = settings?.item_label || "designs";

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOptions = options.filter(
    (o) => o.name.toLowerCase().includes(search.toLowerCase())
  );

  const groupedByCategory = categories.map((cat) => ({
    category: cat,
    products: filtered.filter((p) => p.category === cat),
  })).filter((g) => g.products.length > 0);

  const topProducts = [...products].sort((a, b) => b.historical_frequency - a.historical_frequency).slice(0, 3);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, product: DbProduct) => {
    e.dataTransfer.setData("application/product-id", product.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleOptionDragStart = (e: React.DragEvent, option: any) => {
    e.dataTransfer.setData("application/option-id", option.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="border-b p-4">
        <h2 className="font-display text-base font-semibold text-foreground capitalize">{itemLabel}</h2>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Search ${itemLabel}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Favorites */}
      <div className="border-b p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-gold" /> Most Used
        </p>
        <div className="flex gap-1.5">
          {topProducts.map((p) => (
            <button
              key={p.id}
              onClick={() => onAddProduct(p)}
              draggable
              onDragStart={(e) => handleDragStart(e, p)}
              className="flex-1 rounded-md bg-blush px-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground cursor-grab active:cursor-grabbing"
            >
              {p.name.split(" ").pop()}
            </button>
          ))}
        </div>
      </div>

      {/* Categories & Options */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Options section */}
            {onAddOption && filteredOptions.length > 0 && (
              <div className="mb-1">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 uppercase tracking-wider">
                    <Package className="h-4 w-4" />
                    Options
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${showOptions ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {filteredOptions.map((option) => {
                        const isAdded = addedOptionIds.includes(option.id);
                        const itemCount = option.items?.length || 0;
                        return (
                          <button
                            key={option.id}
                            onClick={() => onAddOption(option)}
                            draggable
                            onDragStart={(e) => handleOptionDragStart(e, option)}
                            className={`group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-grab active:cursor-grabbing ${
                              isAdded ? "bg-blush" : "hover:bg-muted"
                            }`}
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border-2 border-dashed border-primary/30">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{option.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {itemCount} {itemLabel} · <span className="font-mono font-semibold">${option.display_price}</span>
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {isAdded ? (
                                <span className="text-xs font-medium text-primary">Added</span>
                              ) : (
                                <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Product categories */}
            {groupedByCategory.map(({ category, products }) => (
              <div key={category} className="mb-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  <span className="uppercase tracking-wider">{category}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${expandedCategories.has(category) ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence>
                  {expandedCategories.has(category) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {products.map((product) => {
                        const isAdded = addedProductIds.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            onClick={() => onAddProduct(product)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, product)}
                            className={`group flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-grab active:cursor-grabbing ${
                              isAdded ? "bg-blush" : "hover:bg-muted"
                            }`}
                          >
                            <GripVertical className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blush overflow-hidden">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xl">🎈</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                From <span className="font-mono font-semibold">${product.base_price}</span>
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {isAdded ? (
                                <span className="text-xs font-medium text-primary">Added</span>
                              ) : (
                                <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
