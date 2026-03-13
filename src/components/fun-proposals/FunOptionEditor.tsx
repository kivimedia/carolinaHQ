'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2, Loader2, DollarSign, GripVertical, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { Input } from "@/components/ui-shadcn/input";
import { Textarea } from "@/components/ui-shadcn/textarea";
import { Label } from "@/components/ui-shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-shadcn/select";
import { useOption, useSaveOption, type OptionItem } from "@/hooks/fun/use-options";
import { useProducts, type DbProduct } from "@/hooks/fun/use-products";
import { useUserSettings } from "@/hooks/fun/use-user-settings";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import ProductSidebar from "@/components/fun-proposals/proposal/ProductSidebar";

interface FunOptionEditorProps {
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

export default function FunOptionEditor({ optionId }: FunOptionEditorProps) {
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
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (option && !initialized) {
      setName(option.name);
      setDescription(option.description);
      setDisplayPrice(option.display_price);
      setImageUrl(option.image_url || "");
      setItems(
        option.items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          selected_size: i.selected_size,
          selected_color: i.selected_color,
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      );
      setInitialized(true);
    }
  }, [option, initialized]);

  const innerTotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const addProduct = (product: DbProduct) => {
    const defaultSize = product.sizes[1] || product.sizes[0];
    if (!defaultSize) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        selected_size: defaultSize.name,
        selected_color: product.color_presets[0] || "Custom",
        quantity: 1,
        unit_price: defaultSize.price,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<EditableItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const productId = e.dataTransfer.getData("application/product-id");
    if (productId) {
      const product = products.find((p) => p.id === productId);
      if (product) addProduct(product);
    }
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
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    await saveOption.mutateAsync({
      id: optionId,
      name,
      description,
      display_price: displayPrice,
      image_url: imageUrl,
      items,
    });
    router.push("/options");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const addedProductIds = items.map((i) => i.product_id).filter(Boolean) as string[];

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-card px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="gap-1 px-2 text-xs" onClick={() => router.push("/options")}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="font-display text-sm font-semibold text-foreground sm:text-lg">
            Edit Option
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saveOption.isPending} size="sm" className="gap-1.5 text-xs sm:gap-2 sm:text-sm">
          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {saveOption.isPending ? "Saving..." : "Save Option"}
        </Button>
      </div>

      {/* Main content: Sidebar + Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Product Sidebar - hidden on mobile */}
        <div className="hidden w-72 flex-shrink-0 lg:block">
          <ProductSidebar
            onAddProduct={addProduct}
            addedProductIds={addedProductIds}
          />
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl grid gap-6 lg:grid-cols-2">
            {/* Left: Details */}
            <div className="space-y-6">
              <div className="glass-card space-y-4 p-5">
                <h2 className="font-display text-lg font-semibold text-foreground">Details</h2>
                <div className="space-y-2">
                  <Label>Option Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gold Package" />
                </div>
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <div className="flex items-center gap-3">
                    {imageUrl ? (
                      <div className="relative group">
                        <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border bg-background">
                          <img src={imageUrl} alt="Option cover" className="max-h-full max-w-full object-cover" />
                        </div>
                        <button
                          onClick={() => setImageUrl("")}
                          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex h-20 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                        {uploadingImage ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <ImagePlus className="mb-1 h-5 w-5" />
                            <span className="text-xs">Upload image</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files)}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="What's included in this option..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Price (what the client sees)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      value={displayPrice}
                      onChange={(e) => setDisplayPrice(parseFloat(e.target.value) || 0)}
                      className="pl-8 font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Inner total from {itemLabel}: <span className="font-mono font-medium">${innerTotal.toLocaleString()}</span>
                    {displayPrice > 0 && displayPrice !== innerTotal && (
                      <span className="ml-2 text-primary">
                        ({displayPrice < innerTotal ? "discount" : "markup"} of ${Math.abs(displayPrice - innerTotal).toLocaleString()})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {displayPrice !== innerTotal && items.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setDisplayPrice(innerTotal)}
                >
                  Set price to inner total (${innerTotal.toLocaleString()})
                </Button>
              )}

              {/* Summary card */}
              <div className="glass-card p-5">
                <h2 className="font-display text-lg font-semibold text-foreground">Summary</h2>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="capitalize">{itemLabel} total</span>
                    <span className="font-mono">${innerTotal.toLocaleString()}</span>
                  </div>
                  <div className="gold-divider my-2" />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="font-display text-foreground">Client sees</span>
                    <span className="font-mono text-primary">
                      ${(displayPrice || innerTotal).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Designs list with drop zone */}
            <div className="space-y-6">
              <div
                className={`glass-card space-y-4 p-5 transition-all ${
                  dragOver ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <h2 className="font-display text-lg font-semibold text-foreground capitalize">{itemLabel} in Option</h2>

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    <GripVertical className="mb-2 h-6 w-6" />
                    <p>Drag {itemLabel} here from the sidebar</p>
                    <p className="mt-1 text-xs">or click a product to add it</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, i) => {
                      const product = products.find((p) => p.id === item.product_id);
                      return (
                        <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                          {product?.image_url ? (
                            <img
                              src={product.image_url}
                              alt={item.product_name}
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blush">
                              <span className="text-lg">🎈</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.selected_size} · ${item.unit_price}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value) || 1 })}
                              className="w-16 text-center text-sm"
                            />
                            {product && product.sizes.length > 1 && (
                              <Select
                                value={item.selected_size}
                                onValueChange={(val) => {
                                  const size = product.sizes.find((s) => s.name === val);
                                  updateItem(i, {
                                    selected_size: val,
                                    unit_price: size?.price || item.unit_price,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-32 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {product.sizes.map((s) => (
                                    <SelectItem key={s.name} value={s.name}>
                                      {s.name} - ${s.price}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(i)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Drop hint when items exist */}
                {items.length > 0 && (
                  <div className="rounded-lg border-2 border-dashed border-border/50 py-3 text-center text-xs text-muted-foreground">
                    Drag more {itemLabel} here
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
