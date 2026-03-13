'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Loader2, Trash2, Pencil, Settings2, Check, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui-shadcn/button';
import { Input } from '@/components/ui-shadcn/input';
import { Badge } from '@/components/ui-shadcn/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui-shadcn/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui-shadcn/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui-shadcn/dialog';
import { useProducts, useProductCategories } from '@/hooks/fun/use-products';
import MediaLibrary from '@/components/fun-proposals/media/MediaLibrary';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ClassicProducts() {
  const supabase = createClient();
  const { data: products = [], isLoading } = useProducts();
  const categories = useProductCategories(products);
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'media'>('products');
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteProduct = async (productId: string, productName: string) => {
    setDeletingId(productId);
    try {
      await supabase.from('product_images').delete().eq('product_id', productId);
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`"${productName}" deleted.`);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) { setEditingCategory(null); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('products').update({ category: newName.trim() }).eq('category', oldName);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Renamed "${oldName}" to "${newName.trim()}"`);
      setEditingCategory(null);
      if (activeCategory === oldName) setActiveCategory(newName.trim());
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const filtered = activeCategory ? products.filter((p) => p.category === activeCategory) : products;

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Product Catalog</h2>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setManageCategoriesOpen(true)}>
            <Settings2 className="h-3.5 w-3.5" /> Categories
          </Button>
          <Link href="/proposals/products/new/edit">
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Product</Button>
          </Link>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="mb-4 flex gap-1 rounded-md bg-muted p-1 w-fit">
        <button
          onClick={() => setActiveTab('products')}
          className={`rounded px-3 py-1.5 text-xs font-medium ${activeTab === 'products' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium ${activeTab === 'media' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
        >
          <ImageIcon className="h-3 w-3" /> Media
        </button>
      </div>

      {activeTab === 'media' ? (
        <MediaLibrary products={products} />
      ) : (
        <>
          {/* Category filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${!activeCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              All ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
              >
                {cat} ({products.filter((p) => p.category === cat).length})
              </button>
            ))}
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sizes</TableHead>
                  <TableHead className="text-right">Base Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-lg">🎈</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/proposals/products/${product.id}/edit`} className="hover:underline">
                        {product.name}
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{product.category}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.sizes.map((s) => `${s.name}: $${s.price}`).join(', ') || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${product.sizes.length > 0 ? product.sizes[0].price : 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/proposals/products/${product.id}/edit`}>
                          <Button variant="ghost" size="sm" className="h-7"><Pencil className="h-3 w-3" /></Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete &quot;{product.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>This will remove the product and all its images permanently.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => handleDeleteProduct(product.id, product.name)}
                              >
                                {deletingId === product.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No products {activeCategory ? `in "${activeCategory}"` : 'yet'}.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Manage Categories Dialog */}
          <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Manage Categories</DialogTitle></DialogHeader>
              <div className="space-y-2 py-4">
                {categories.map((cat) => {
                  const count = products.filter((p) => p.category === cat).length;
                  const isEditing = editingCategory === cat;
                  return (
                    <div key={cat} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                      {isEditing ? (
                        <>
                          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8 flex-1 text-sm" autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(cat, editValue); if (e.key === 'Escape') setEditingCategory(null); }} />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRenameCategory(cat, editValue)} disabled={saving}><Check className="h-4 w-4 text-primary" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCategory(null)}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm font-medium">{cat}</span>
                          <span className="text-xs text-muted-foreground">{count}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCategory(cat); setEditValue(cat); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 pt-2">
                  <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category..." className="h-9 flex-1 text-sm" />
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { if (newCategoryName.trim()) { toast(`Create a product with category "${newCategoryName.trim()}" to see it.`); setNewCategoryName(''); } }}>
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
              <DialogFooter><DialogClose asChild><Button variant="outline" size="sm">Done</Button></DialogClose></DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
