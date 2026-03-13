'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui-shadcn/badge";
import { Button } from "@/components/ui-shadcn/button";
import { Input } from "@/components/ui-shadcn/input";
import { Loader2, Pencil, Settings2, Plus, Trash2, Check, X, Image as ImageIcon } from "lucide-react";
import { useProducts, useProductCategories } from "@/hooks/fun/use-products";
import { useProposals } from "@/hooks/fun/use-proposals";
import MediaLibrary from "@/components/fun-proposals/media/MediaLibrary";
import { createClient } from '@/lib/supabase/client';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui-shadcn/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui-shadcn/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

export default function FunProducts() {
  const supabase = createClient();
  const { data: products = [], isLoading } = useProducts();
  const { data: proposals = [] } = useProposals();
  const categories = useProductCategories(products);
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "media">("products");
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const handleDeleteProduct = async (productId: string, productName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingProductId(productId);
    try {
      // Delete product images first
      const { error: imgErr } = await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);
      if (imgErr) throw imgErr;

      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`"${productName}" has been removed.`);
    } catch (err: any) {
      toast.error(`Error deleting product: ${err.message}`);
    } finally {
      setDeletingProductId(null);
    }
  };

  const filteredProducts = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products;

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) {
      setEditingCategory(null);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ category: newName.trim() })
        .eq("category", oldName);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Category renamed: "${oldName}" -> "${newName.trim()}"`);
      setEditingCategory(null);
      if (activeCategory === oldName) setActiveCategory(newName.trim());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    const count = products.filter((p) => p.category === categoryName).length;
    if (count > 0) {
      toast.error(`"${categoryName}" still has ${count} product${count > 1 ? "s" : ""}. Move or delete them first.`);
      return;
    }
    toast.success(`"${categoryName}" has been removed.`);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      toast.error(`"${newCategoryName.trim()}" is already a category.`);
      return;
    }
    toast(`Create a product with category "${newCategoryName.trim()}" to see it appear.`);
    setNewCategoryName("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Product Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {products.length} products - Manage your balloon decor products and pricing
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setManageCategoriesOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Manage Categories
        </Button>
      </div>

      {/* Main Tabs: Products / Media */}
      <div className="mb-6 flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab("products")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "products"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab("media")}
          className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "media"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Media
        </button>
      </div>

      {activeTab === "media" ? (
        <MediaLibrary products={products} />
      ) : (
      <>
      {/* Category Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          }`}
        >
          All ({products.length})
        </button>
        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Product Grid */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product, i) => (
            <Link key={product.id} href={`/proposals/products/${product.id}/edit`} className="block">
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card group overflow-hidden transition-all hover:shadow-lg hover:product-card-glow"
              >
                <div className="relative h-48 overflow-hidden bg-blush flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-6xl">🎈</span>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <Badge className="bg-card/90 text-foreground backdrop-blur-sm">{product.category}</Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/90 text-destructive-foreground shadow-md backdrop-blur-sm hover:bg-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &quot;{product.name}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this product and all its images. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => handleDeleteProduct(product.id, product.name, e)}
                          >
                            {deletingProductId === product.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur-sm">
                      <Pencil className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-foreground">{product.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {product.sizes.map((s) => (
                      <span key={s.name} className="rounded-full bg-blush px-2 py-0.5 text-[10px] font-medium text-foreground">
                        {s.name}: <span className="font-mono">${s.price}</span>
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Used in</p>
                      <p className="font-mono text-sm font-bold text-foreground">{product.historical_frequency} proposals</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Conversion</p>
                      <p className="font-mono text-sm font-bold text-primary">{Math.round(product.historical_conversion_rate)}%</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </AnimatePresence>
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No products in this category.
          </p>
        </div>
      )}

      {/* Manage Categories Dialog */}
      <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {categories.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No categories yet. Products create categories automatically.
              </p>
            ) : (
              categories.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                const isEditing = editingCategory === cat;
                return (
                  <div
                    key={cat}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 p-3"
                  >
                    {isEditing ? (
                      <>
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 flex-1 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCategory(cat, editValue);
                            if (e.key === "Escape") setEditingCategory(null);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRenameCategory(cat, editValue)}
                          disabled={saving}
                        >
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingCategory(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-foreground">{cat}</span>
                        <span className="text-xs text-muted-foreground">{count} product{count !== 1 ? "s" : ""}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditValue(cat);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCategory(cat)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })
            )}

            {/* Add new category */}
            <div className="flex items-center gap-2 pt-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name..."
                className="h-9 flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCategory();
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}
