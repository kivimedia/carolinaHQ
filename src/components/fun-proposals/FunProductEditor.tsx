'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, ImagePlus, Sparkles, Trash2, X, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { Input } from "@/components/ui-shadcn/input";
import { Textarea } from "@/components/ui-shadcn/textarea";
import { Label } from "@/components/ui-shadcn/label";
import { Badge } from "@/components/ui-shadcn/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui-shadcn/dialog";
import { createClient } from '@/lib/supabase/client';
import { toast } from "@/hooks/fun/use-toast";
import { useProducts, type DbProduct, type DbProductSize, type DbProductImage } from "@/hooks/fun/use-products";
import { useProposals } from "@/hooks/fun/use-proposals";
import { useQueryClient } from "@tanstack/react-query";

interface FunProductEditorProps {
  productId: string;
}

export default function FunProductEditor({ productId }: FunProductEditorProps) {
  const id = productId;
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: allProducts = [], isLoading: productsLoading } = useProducts();
  const { data: proposals = [] } = useProposals();

  const product = allProducts.find((p) => p.id === id);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [sizes, setSizes] = useState<DbProductSize[]>([]);
  const [colorPresets, setColorPresets] = useState<string[]>([]);
  const [newColorName, setNewColorName] = useState("");
  const [setupTime, setSetupTime] = useState(30);
  const [images, setImages] = useState<DbProductImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // AI image generation
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category);
      setDescription(product.description || "");
      setProposalDescription(product.proposal_description || "");
      setSizes(product.sizes);
      setColorPresets(product.color_presets);
      setSetupTime(product.setup_time_minutes);
      setImages(product.images);
    }
  }, [product]);

  const primaryImage = images.find((img) => img.is_primary) || images[0];

  const proposalsWithProduct = proposals.filter((p) => p.status !== "draft");
  const usedInCount = proposals.length > 0
    ? Math.round(
        proposals.filter(() => true).length * (product?.historical_frequency || 0) / Math.max(proposals.length, 1)
      )
    : product?.historical_frequency || 0;

  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const sentOrBeyond = proposals.filter((p) => ["sent", "viewed", "accepted", "rejected"].includes(p.status));
  const conversionRate = sentOrBeyond.length > 0
    ? Math.round((acceptedProposals.length / sentOrBeyond.length) * 100)
    : 0;

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `products/${id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const isPrimary = images.length === 0;
      const displayOrder = images.length;

      const { data: newImg, error: insertError } = await supabase
        .from("product_images")
        .insert({
          product_id: id,
          image_url: urlData.publicUrl,
          is_primary: isPrimary,
          display_order: displayOrder,
        })
        .select("id, image_url, is_primary, display_order")
        .single();

      if (!insertError && newImg) {
        setImages((prev) => [...prev, newImg as DbProductImage]);
      }
    }

    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: "Image(s) uploaded" });
  };

  const handleRemoveImage = async (imageId: string) => {
    const img = images.find((i) => i.id === imageId);
    if (!img) return;

    await supabase.from("product_images").delete().eq("id", imageId);
    const remaining = images.filter((i) => i.id !== imageId);

    if (img.is_primary && remaining.length > 0) {
      await supabase.from("product_images").update({ is_primary: true }).eq("id", remaining[0].id);
      remaining[0] = { ...remaining[0], is_primary: true };
    }

    setImages(remaining);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: "Image removed" });
  };

  const handleSetPrimary = async (imageId: string) => {
    if (!id) return;
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", id);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);

    setImages((prev) =>
      prev.map((img) => ({ ...img, is_primary: img.id === imageId }))
    );
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title: "Primary image updated" });
  };

  const openAiGenerator = () => {
    const prompt = `Professional product photo of a ${name || "balloon decoration"}, ${category || "balloon decor"} style. ${description || ""} Beautiful lighting, clean background, event decoration photography.`;
    setAiPrompt(prompt);
    setShowAiDialog(true);
  };

  const handleGenerateImage = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { prompt: aiPrompt, productId: id },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        const { data: freshImages } = await supabase
          .from("product_images")
          .select("id, image_url, is_primary, display_order")
          .eq("product_id", id)
          .order("display_order");
        if (freshImages) {
          setImages(freshImages as DbProductImage[]);
        }
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast({ title: "Image generated!", description: "AI image has been saved." });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setGenerating(false);
      setShowAiDialog(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("products").update({
        name,
        category,
        description,
        proposal_description: proposalDescription,
        sizes: sizes as any,
        color_presets: colorPresets as any,
        setup_time_minutes: setupTime,
      }).eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product saved!" });
      router.push("/products");
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addSize = () => {
    setSizes((prev) => [...prev, { name: "", price: 0 }]);
  };

  const updateSize = (index: number, updates: Partial<DbProductSize>) => {
    setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const removeSize = (index: number) => {
    setSizes((prev) => prev.filter((_, i) => i !== index));
  };

  const addColorPreset = () => {
    if (newColorName.trim() && !colorPresets.includes(newColorName.trim())) {
      setColorPresets((prev) => [...prev, newColorName.trim()]);
      setNewColorName("");
    }
  };

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="outline" onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">Edit Product</h1>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Image Gallery */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Product Gallery</h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={openAiGenerator}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Generate
                </Button>
              </div>
            </div>

            <div className="relative group mx-auto w-full max-w-sm aspect-[4/3] rounded-xl overflow-hidden bg-blush flex items-center justify-center">
              {primaryImage ? (
                <img src={primaryImage.image_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-6xl">🎈</span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg">
                  <ImagePlus className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Add Photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`relative group/thumb h-16 w-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      img.is_primary ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-0.5 bg-foreground/50 opacity-0 transition-opacity group-hover/thumb:opacity-100">
                      {!img.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(img.id)}
                          className="rounded p-1 text-background hover:bg-background/20"
                          title="Set as primary"
                        >
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveImage(img.id)}
                        className="rounded p-1 text-background hover:bg-background/20"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {img.is_primary && (
                      <div className="absolute top-0.5 left-0.5 rounded-sm bg-primary px-1 py-0.5">
                        <Star className="h-2 w-2 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <Plus className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    disabled={uploading}
                  />
                </label>
              </div>
            )}

            {images.length === 0 && (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <ImagePlus className="h-4 w-4" />
                Upload product images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          {/* Basic info */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Proposal Description</Label>
              <Textarea
                value={proposalDescription}
                onChange={(e) => setProposalDescription(e.target.value)}
                rows={2}
                placeholder="Shorter description shown on proposals..."
              />
            </div>
            <div className="space-y-2">
              <Label>Setup Time (minutes)</Label>
              <Input
                type="number"
                min={0}
                value={setupTime}
                onChange={(e) => setSetupTime(parseInt(e.target.value) || 0)}
                className="w-32"
              />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Sizes / Pricing */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Sizes & Pricing</h2>
              <Button variant="outline" size="sm" onClick={addSize} className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Add Size
              </Button>
            </div>
            {sizes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">No sizes defined</p>
            ) : (
              <div className="space-y-2">
                {sizes.map((size, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <Input
                      value={size.name}
                      onChange={(e) => updateSize(i, { name: e.target.value })}
                      placeholder="Size name"
                      className="flex-1 text-sm"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min={0}
                        step={5}
                        value={size.price}
                        onChange={(e) => updateSize(i, { price: parseFloat(e.target.value) || 0 })}
                        className="pl-6 text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSize(i)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Color Presets */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Color Presets</h2>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="gap-1.5 pr-1"
                >
                  {color}
                  <button
                    onClick={() => setColorPresets((prev) => prev.filter((_, ci) => ci !== i))}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder="Add color preset name..."
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && addColorPreset()}
              />
              <Button variant="outline" size="sm" onClick={addColorPreset}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Performance</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-blush p-4 text-center">
                <p className="text-[10px] text-muted-foreground">Used in Proposals</p>
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                  {product.historical_frequency}
                </p>
              </div>
              <div className="rounded-lg bg-blush p-4 text-center">
                <p className="text-[10px] text-muted-foreground">Overall Conversion</p>
                <p className="mt-1 font-mono text-2xl font-bold text-primary">
                  {conversionRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Image Generation Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Generate Product Image with AI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Image Prompt</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
                className="text-sm"
                placeholder="Describe the image you want to generate..."
              />
              <p className="text-[10px] text-muted-foreground">
                Edit the prompt above to customize the generated image.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAiDialog(false)}>Cancel</Button>
            <Button
              onClick={handleGenerateImage}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? "Generating..." : "Generate Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
