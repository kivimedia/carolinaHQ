'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Loader2, DollarSign, Plus, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { Input } from "@/components/ui-shadcn/input";
import { Textarea } from "@/components/ui-shadcn/textarea";
import { Label } from "@/components/ui-shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-shadcn/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui-shadcn/table';
import { useOption, useSaveOption } from "@/hooks/fun/use-options";
import { useProducts, type DbProduct } from "@/hooks/fun/use-products";
import { useUserSettings } from "@/hooks/fun/use-user-settings";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ClassicOptionEditorProps {
  optionId?: string;
}

interface EditableItem {
  product_id: string | null;
  product_name: string;
  selected_size: string;
  selected_color: string;
  quantity: number;
  unit_price: number;
}

export default function ClassicOptionEditor({ optionId }: ClassicOptionEditorProps) {
  const router = useRouter();
  const supabase = createClient();
  const { data: option, isLoading } = useOption(optionId);
  const { data: products = [] } = useProducts();
  const { data: settings } = useUserSettings();
  const saveOption = useSaveOption();

  const itemLabel = settings?.item_label || "designs";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayPrice, setDisplayPrice] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (option && !initialized) {
      setName(option.name);
      setDescription(option.description);
      setDisplayPrice(option.display_price);
      setImageUrl(option.image_url || "");
      setItems(option.items.map((i) => ({
        product_id: i.product_id, product_name: i.product_name,
        selected_size: i.selected_size, selected_color: i.selected_color,
        quantity: i.quantity, unit_price: i.unit_price,
      })));
      setInitialized(true);
    }
  }, [option, initialized]);

  const innerTotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const addProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const defaultSize = product.sizes[1] || product.sizes[0];
    if (!defaultSize) return;
    setItems((prev) => [...prev, {
      product_id: product.id, product_name: product.name,
      selected_size: defaultSize.name, selected_color: product.color_presets[0] || "Custom",
      quantity: 1, unit_price: defaultSize.price,
    }]);
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, updates: Partial<EditableItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const file = files[0];
      const ext = file.name.split(".").pop();
      const path = `option-images/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      setImageUrl(urlData.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally { setUploadingImage(false); }
  };

  const handleSave = async () => {
    await saveOption.mutateAsync({ id: optionId, name, description, display_price: displayPrice, image_url: imageUrl, items });
    router.push("/proposals/options");
  };

  if (isLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/proposals/options")}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
        <h2 className="text-xl font-bold">Edit Option</h2>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saveOption.isPending} size="sm" className="gap-2">
            <Save className="h-4 w-4" /> {saveOption.isPending ? "Saving..." : "Save Option"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Details */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold">Details</h3>
            <div className="space-y-2"><Label>Option Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gold Package" /></div>
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative group">
                    <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border bg-background">
                      <img src={imageUrl} alt="Option cover" className="max-h-full max-w-full object-cover" />
                    </div>
                    <button onClick={() => setImageUrl("")} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-20 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary">
                    {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImagePlus className="mb-1 h-5 w-5" /><span className="text-xs">Upload image</span></>}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What's included..." /></div>
            <div className="space-y-2">
              <Label>Display Price (what the client sees)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="number" min={0} value={displayPrice} onChange={(e) => setDisplayPrice(parseFloat(e.target.value) || 0)} className="pl-8 font-mono" />
              </div>
              <p className="text-xs text-muted-foreground">
                Inner total from {itemLabel}: <span className="font-mono font-medium">${innerTotal.toLocaleString()}</span>
                {displayPrice > 0 && displayPrice !== innerTotal && (
                  <span className="ml-2 text-primary">({displayPrice < innerTotal ? "discount" : "markup"} of ${Math.abs(displayPrice - innerTotal).toLocaleString()})</span>
                )}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border p-6">
            <h3 className="text-sm font-semibold">Summary</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span className="capitalize">{itemLabel} total</span>
                <span className="font-mono">${innerTotal.toLocaleString()}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Client sees</span>
                <span className="font-mono text-primary">${(displayPrice || innerTotal).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Items table */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-sm font-semibold capitalize">{itemLabel} in Option</h3>

            {items.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
                <p>No {itemLabel} yet. Add products below.</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => {
                      const product = products.find((p) => p.id === item.product_id);
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                          <TableCell>
                            {product && product.sizes.length > 1 ? (
                              <Select value={item.selected_size} onValueChange={(val) => {
                                const size = product.sizes.find((s) => s.name === val);
                                updateItem(i, { selected_size: val, unit_price: size?.price || item.unit_price });
                              }}>
                                <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{product.sizes.map((s) => <SelectItem key={s.name} value={s.name}>{s.name} - ${s.price}</SelectItem>)}</SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">{item.selected_size}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value) || 1 })} className="h-8 w-16 text-center text-xs" />
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">${item.unit_price}</TableCell>
                          <TableCell className="text-right font-mono text-sm">${(item.unit_price * item.quantity).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add product dropdown */}
            <Select onValueChange={addProduct}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Add a product..." /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} - from ${p.base_price}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
