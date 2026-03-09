'use client';

import { useState, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, GripVertical, Sparkles, ImagePlus, X, Loader2, DollarSign, Package, ChevronDown, ChevronRight, Edit3, Tag, Image, Maximize, LayoutGrid, Layers, Grid3X3, AlignVerticalSpaceAround } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { LucideProps } from "lucide-react";
import { Input } from "@/components/ui-shadcn/input";
import { Textarea } from "@/components/ui-shadcn/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-shadcn/select";
import { Button } from "@/components/ui-shadcn/button";
import { Switch } from "@/components/ui-shadcn/switch";
import { EVENT_TYPES } from "@/data/fun-products";
import { BuilderLineItem, BuilderOptionItem, BuilderOptionItemEntry, BuilderProposalData } from "@/components/fun-proposals/FunProposalBuilder";
import { DbProduct } from "@/hooks/fun/use-products";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/fun/use-toast";
import { useUserSettings } from "@/hooks/fun/use-user-settings";

import type { ProposalTag } from "@/hooks/fun/use-tags";

function DynIcon({ name, ...props }: { name: string } & Omit<LucideProps, 'ref'>) {
  const iconName = name as keyof typeof dynamicIconImports;
  if (!dynamicIconImports[iconName]) {
    const Fb = lazy(dynamicIconImports["tag"]);
    return <Suspense fallback={<div className="h-3 w-3" />}><Fb {...props} /></Suspense>;
  }
  const LI = lazy(dynamicIconImports[iconName]);
  return <Suspense fallback={<div className="h-3 w-3" />}><LI {...props} /></Suspense>;
}

interface SurchargeEntry {
  label: string;
  amount: number;
  enabled: boolean;
}

interface Props {
  proposal: BuilderProposalData;
  onUpdate: (updates: Partial<BuilderProposalData>) => void;
  onUpdateLineItem: (id: string, updates: Partial<BuilderLineItem>) => void;
  onRemoveLineItem: (id: string) => void;
  onAddProduct: (product: DbProduct) => void;
  onAddOption?: (option: any) => void;
  onRemoveOption?: (optionId: string) => void;
  onUpdateOption?: (optionId: string, updates: Partial<BuilderOptionItem>) => void;
  onUpdateOptionItem?: (optionId: string, itemId: string, updates: Partial<BuilderOptionItemEntry>) => void;
  onRemoveOptionItem?: (optionId: string, itemId: string) => void;
  onReorderItems?: (fromIndex: number, toIndex: number) => void;
  products: DbProduct[];
  subtotal: number;
  total: number;
  surcharges: SurchargeEntry[];
  onUpdateSurcharges: (surcharges: SurchargeEntry[]) => void;
  allTags?: ProposalTag[];
  selectedTagIds?: string[];
  onToggleTag?: (tagId: string) => void;
}

export default function ProposalCanvas({
  proposal,
  onUpdate,
  onUpdateLineItem,
  onRemoveLineItem,
  onAddProduct,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onUpdateOptionItem,
  onRemoveOptionItem,
  onReorderItems,
  products,
  subtotal,
  total,
  surcharges,
  onUpdateSurcharges,
  allTags = [],
  selectedTagIds = [],
  onToggleTag,
}: Props) {
  const supabase = createClient();
  const [dragOver, setDragOver] = useState(false);
  const [generatingNote, setGeneratingNote] = useState(false);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const [dragItemIndex, setDragItemIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { data: settings } = useUserSettings();
  const itemLabel = settings?.item_label || "designs";

  // External drag (from sidebar)
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/product-id") || e.dataTransfer.types.includes("application/option-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const productId = e.dataTransfer.getData("application/product-id");
    const optionId = e.dataTransfer.getData("application/option-id");
    if (productId) {
      const product = products.find((p) => p.id === productId);
      if (product) onAddProduct(product);
    }
    if (optionId && onAddOption) {
      onAddOption({ id: optionId, _fromDrop: true });
    }
  };

  // Internal reorder drag
  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    setDragItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "0.4";
  };

  const handleItemDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "1";
    setDragItemIndex(null);
    setDropTargetIndex(null);
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragItemIndex !== null && index !== dragItemIndex) {
      setDropTargetIndex(index);
    }
  };

  const handleItemDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragItemIndex !== null && dragItemIndex !== toIndex && onReorderItems) {
      onReorderItems(dragItemIndex, toIndex);
    }
    setDragItemIndex(null);
    setDropTargetIndex(null);
  };

  const handleGenerateNote = async () => {
    setGeneratingNote(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-personal-note", {
        body: {
          clientName: proposal.clientName,
          eventType: proposal.eventType,
          eventDate: proposal.eventDate,
          venue: proposal.venue,
          colorTheme: proposal.colorTheme,
          guests: proposal.guests,
          notes: proposal.notes,
          aiMasterPrompt: settings?.ai_master_prompt || "",
          businessName: settings?.business_name || "",
          lineItems: proposal.lineItems.map((li) => ({
            product_name: li.product.name,
            selected_size: li.selectedSize,
            selected_color: li.selectedColor,
            quantity: li.quantity,
            unit_price: li.unitPrice,
          })),
          options: (proposal.options || []).map((opt) => ({
            name: opt.name,
            items: opt.items.map((i) => i.product_name),
            price: opt.display_price,
          })),
          total,
          subtotal,
        },
      });
      if (error) throw error;
      if (data?.note) {
        onUpdate({ personalNote: data.note });
        toast({ title: "Note generated!", description: "AI personal note has been added." });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setGeneratingNote(false);
    }
  };

  const handleImageUpload = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split(".").pop();
    const path = `line-items/${itemId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    const item = proposal.lineItems.find((li) => li.id === itemId);
    if (!item) return;

    const currentImages = item.images || [];
    onUpdateLineItem(itemId, { images: [...currentImages, urlData.publicUrl] });
    toast({ title: "Image added" });
  };

  const handleRemoveImage = (itemId: string, imageUrl: string) => {
    const item = proposal.lineItems.find((li) => li.id === itemId);
    if (!item) return;
    onUpdateLineItem(itemId, {
      images: (item.images || []).filter((img) => img !== imageUrl),
    });
  };

  const handleReplaceImage = (itemId: string, oldUrl: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split(".").pop();
    const path = `line-items/${itemId}/${crypto.randomUUID()}.${ext}`;

    supabase.storage.from("product-images").upload(path, file).then(({ error }) => {
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        return;
      }
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      const item = proposal.lineItems.find((li) => li.id === itemId);
      if (!item) return;
      const newImages = (item.images || []).map((img) => (img === oldUrl ? urlData.publicUrl : img));
      onUpdateLineItem(itemId, { images: newImages });
    });
  };

  const toggleOptionExpanded = (optionId: string) => {
    setExpandedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const hasItems = proposal.lineItems.length > 0 || (proposal.options || []).length > 0;

  return (
    <div className="flex h-full flex-col overflow-auto bg-background">
      {/* AI Suggestion Bar */}
      {proposal.lineItems.length >= 1 && proposal.lineItems.length < 3 && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mx-4 mt-4 flex items-center gap-3 rounded-xl border bg-blush p-4"
        >
          <Sparkles className="h-4 w-4 flex-shrink-0 text-primary" />
          <p className="flex-1 text-xs text-foreground">
            <span className="font-semibold">AI Suggestion:</span> Based on similar{" "}
            {proposal.eventType || "birthday"} events, consider adding Marquee Letters ($200).
          </p>
          <Button size="sm" variant="outline" className="flex-shrink-0 text-xs">
            Add It
          </Button>
          <button className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
        </motion.div>
      )}

      <div className="flex-1 space-y-4 p-4">
        {/* Client Info Card */}
        <div className="glass-card p-5">
          <h2 className="mb-4 font-display text-base font-semibold text-foreground">
            Client & Event Details
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Client Name</label>
              <Input value={proposal.clientName} onChange={(e) => onUpdate({ clientName: e.target.value })} placeholder="Sarah Johnson" className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Event Type</label>
              <Select value={proposal.eventType} onValueChange={(v) => onUpdate({ eventType: v })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select event type" /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Email</label>
              <Input value={proposal.clientEmail} onChange={(e) => onUpdate({ clientEmail: e.target.value })} placeholder="sarah@email.com" className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Event Date</label>
              <Input type="date" value={proposal.eventDate} onChange={(e) => onUpdate({ eventDate: e.target.value })} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Phone</label>
              <Input value={proposal.clientPhone} onChange={(e) => onUpdate({ clientPhone: e.target.value })} placeholder="704-555-1234" className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Location</label>
              <Input value={proposal.venue} onChange={(e) => onUpdate({ venue: e.target.value })} placeholder="Enter location" className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Start Time</label>
              <Input type="time" value={proposal.startTime} onChange={(e) => onUpdate({ startTime: e.target.value })} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Color Theme</label>
              <Input value={proposal.colorTheme} onChange={(e) => onUpdate({ colorTheme: e.target.value })} placeholder="Pastel Pink & Gold" className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Est. Guests</label>
              <Input value={proposal.guests} onChange={(e) => onUpdate({ guests: e.target.value })} placeholder="~50" className="text-sm" />
            </div>
          </div>
          {/* Tags */}
          {allTags.length > 0 && onToggleTag && (
            <div className="mt-3">
              <label className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Tag className="h-3 w-3" /> Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const isActive = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onToggleTag(tag.id)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border ${
                        isActive
                          ? "shadow-sm"
                          : "border-transparent opacity-50 hover:opacity-80"
                      }`}
                      style={{
                        backgroundColor: isActive ? tag.color + "20" : "transparent",
                        borderColor: isActive ? tag.color : "transparent",
                        color: tag.color,
                      }}
                    >
                      <DynIcon name={tag.icon} size={12} />
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Notes</label>
            <Textarea value={proposal.notes} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder="Client wants pastel theme, outdoors..." className="text-sm" rows={2} />
          </div>
          {/* Client Logo (for corporate clients) */}
          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Client Logo (optional, for corporate)</label>
            <div className="flex items-center gap-3">
              {proposal.clientLogoUrl ? (
                <div className="relative group">
                  <div className="flex h-10 w-24 items-center justify-center overflow-hidden rounded border bg-background">
                    <img src={proposal.clientLogoUrl} alt="Client logo" className="max-h-full max-w-full object-contain" />
                  </div>
                  <button
                    onClick={() => onUpdate({ clientLogoUrl: "" })}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Upload client logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      const file = files[0];
                      const ext = file.name.split(".").pop();
                      const path = `client-logos/${crypto.randomUUID()}.${ext}`;
                      const { error } = await supabase.storage.from("product-images").upload(path, file);
                      if (error) {
                        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
                        return;
                      }
                      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
                      onUpdate({ clientLogoUrl: urlData.publicUrl });
                      toast({ title: "Client logo uploaded" });
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Line Items & Options */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <h2 className="mb-3 font-display text-base font-semibold text-foreground capitalize">
            {itemLabel}
          </h2>

          {/* Image Display Mode Selector */}
          <div className="mb-4 rounded-xl border bg-card p-3">
            <label className="mb-2 block text-[11px] font-medium text-muted-foreground">Image Display</label>
            <div className="flex gap-1.5">
              {([
                { value: "regular" as const, icon: Image, label: "Regular" },
                { value: "medium" as const, icon: Maximize, label: "Medium" },
                { value: "xl" as const, icon: LayoutGrid, label: "Extra Large" },
                { value: "gallery" as const, icon: Layers, label: "Gallery" },
              ]).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => onUpdate({ imageDisplayMode: value })}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition-all border ${
                    proposal.imageDisplayMode === value
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {proposal.imageDisplayMode === "gallery" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex gap-1.5 border-t pt-2">
                    {([
                      { value: "grid" as const, icon: Grid3X3, label: "Grid" },
                      { value: "stacked" as const, icon: AlignVerticalSpaceAround, label: "Stacked" },
                      { value: "masonry" as const, icon: LayoutGrid, label: "Masonry" },
                    ]).map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() => onUpdate({ galleryLayout: value })}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all border ${
                          proposal.galleryLayout === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Options */}
          <AnimatePresence>
            {(proposal.options || []).map((option) => {
              const isExpanded = expandedOptions.has(option.id);
              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 shadow-sm"
                >
                  {/* Option Header */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleOptionExpanded(option.id)} className="text-primary hover:text-primary/80 transition-colors">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 border border-primary/25">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={option.name}
                        onChange={(e) => onUpdateOption?.(option.id, { name: e.target.value })}
                        className="h-7 border-none bg-transparent p-0 font-display text-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
                      />
                      <p className="text-xs text-muted-foreground">
                        {option.items.length} {itemLabel} · Option Package
                      </p>
                    </div>
                    <span className={`font-mono text-base font-bold ${option.priceOverride ? "text-accent-foreground" : "text-primary"}`}>
                      ${option.display_price.toLocaleString()}
                    </span>
                    <button
                      onClick={() => onRemoveOption?.(option.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Option Items (expanded) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-2 overflow-hidden border-t border-primary/20 pt-3"
                      >
                        {option.items.map((item) => {
                          const itemProduct = products.find((p) => p.id === item.product_id);
                          const displayImage = item.product_image || itemProduct?.image_url;
                          const productImages = itemProduct?.images || [];
                          return (
                          <div key={item.id} className="flex items-center gap-3 rounded-lg bg-card p-3 shadow-sm border border-border/50">
                            {/* Item image with gallery switcher */}
                            <div className="flex flex-col gap-1">
                              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blush overflow-hidden">
                                {displayImage ? (
                                  <img src={displayImage} alt={item.product_name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-lg">🎈</span>
                                )}
                              </div>
                              {productImages.length > 1 && (
                                <div className="flex gap-0.5 flex-wrap max-w-[46px]">
                                  {productImages.map((pImg) => (
                                    <button
                                      key={pImg.id}
                                      onClick={() => onUpdateOptionItem?.(option.id, item.id, { product_image: pImg.image_url } as any)}
                                      className={`h-4 w-4 rounded overflow-hidden border ${
                                        item.product_image === pImg.image_url || (!item.product_image && pImg.is_primary)
                                          ? "border-primary" : "border-border"
                                      }`}
                                    >
                                      <img src={pImg.image_url} alt="" className="h-full w-full object-cover" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Item details */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                {item.selected_size && <span className="rounded bg-muted px-1.5 py-0.5">{item.selected_size}</span>}
                                {item.selected_color && <span className="rounded bg-muted px-1.5 py-0.5">{item.selected_color}</span>}
                              </div>
                            </div>
                            {/* Editable qty & price */}
                            <div className="flex items-center gap-2">
                              <div className="w-14">
                                <label className="text-[9px] text-muted-foreground">Qty</label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) => onUpdateOptionItem?.(option.id, item.id, { quantity: parseInt(e.target.value) || 1 })}
                                  className="h-7 text-xs"
                                />
                              </div>
                              <div className="w-20">
                                <label className="text-[9px] text-muted-foreground">Price</label>
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={5}
                                    value={item.unit_price}
                                    onChange={(e) => onUpdateOptionItem?.(option.id, item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                                    className="h-7 pl-4 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="text-right min-w-[50px]">
                                <label className="text-[9px] text-muted-foreground">Total</label>
                                <p className="font-mono text-xs font-bold text-foreground">
                                  ${(item.unit_price * item.quantity).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => onRemoveOptionItem?.(option.id, item.id)}
                                className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                title="Remove item"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          );
                        })}
                        {/* Option total price override */}
                        <div className="flex items-center gap-3 rounded-lg bg-card/80 p-3 border border-dashed border-primary/20">
                          <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs text-muted-foreground flex-1">Package price</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min={0}
                                step={5}
                                value={option.display_price}
                                onChange={(e) => onUpdateOption?.(option.id, { display_price: parseFloat(e.target.value) || 0, priceOverride: true })}
                                className="h-7 pl-5 text-xs font-mono font-bold"
                              />
                            </div>
                            {option.priceOverride && (
                              <button
                                onClick={() => {
                                  const autoPrice = option.items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
                                  onUpdateOption?.(option.id, { display_price: autoPrice, priceOverride: false });
                                }}
                                className="text-[9px] text-primary hover:underline whitespace-nowrap"
                              >
                                Auto
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Option description */}
                        <Input
                          value={option.description}
                          onChange={(e) => onUpdateOption?.(option.id, { description: e.target.value })}
                          placeholder="Add option description..."
                          className="h-8 text-xs bg-card"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Line Items */}
          <AnimatePresence>
            {!hasItems ? (
              <div
                className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {dragOver ? `Drop here to add ${itemLabel}` : `Drag ${itemLabel} from the sidebar or click to add them`}
                </p>
              </div>
            ) : (
              <div className={`space-y-1 rounded-xl p-1 transition-colors ${dragOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}>
                {proposal.lineItems.map((item, index) => (
                  <div key={item.id}>
                    {/* Drop indicator line */}
                    {dropTargetIndex === index && dragItemIndex !== null && dragItemIndex > index && (
                      <div className="mx-2 h-0.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                    )}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      draggable
                      onDragStart={(e) => handleItemDragStart(e as any, index)}
                      onDragEnd={(e) => handleItemDragEnd(e as any)}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); handleItemDragOver(e as any, index); }}
                      onDrop={(e) => handleItemDrop(e as any, index)}
                      className={`glass-card p-4 transition-all ${
                        dragItemIndex === index ? "opacity-40 scale-[0.98]" : ""
                      } ${dropTargetIndex === index ? "ring-2 ring-primary/30" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <GripVertical className="mt-2 h-5 w-5 flex-shrink-0 cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing" />

                        {/* Image gallery with switcher */}
                        <div className="flex flex-col gap-1.5">
                          <div className="relative group flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-blush overflow-hidden">
                            {(item.images && item.images.length > 0) ? (
                              <img src={item.images[0]} alt={item.product.name} className="h-full w-full object-cover" />
                            ) : item.product.image_url ? (
                              <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-2xl">🎈</span>
                            )}
                            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <ImagePlus className="h-4 w-4 text-background" />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  handleImageUpload(item.id, e.target.files);
                                }}
                              />
                            </label>
                          </div>
                          {/* Product gallery thumbnails */}
                          {item.product.images && item.product.images.length > 1 && (
                            <div className="flex gap-1 flex-wrap max-w-[68px]">
                              {item.product.images.map((img) => {
                                const isSelected = item.images?.[0] === img.image_url || (!item.images?.length && img.is_primary);
                                return (
                                  <button
                                    key={img.id}
                                    onClick={() => {
                                      const currentImages = item.images || [];
                                      onUpdateLineItem(item.id, { images: [img.image_url, ...currentImages.filter(u => u !== img.image_url)] });
                                    }}
                                    className={`h-5 w-5 rounded overflow-hidden border transition-colors ${
                                      isSelected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-muted-foreground"
                                    }`}
                                  >
                                    <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {/* Custom uploaded images */}
                          {item.images && item.images.length > 1 && (
                            <div className="flex gap-1">
                              {item.images.slice(1).map((img, idx) => (
                                <div key={idx} className="relative group/thumb h-7 w-7 rounded overflow-hidden">
                                  <img src={img} alt="" className="h-full w-full object-cover" />
                                  <button
                                    onClick={() => handleRemoveImage(item.id, img)}
                                    className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 transition-opacity group-hover/thumb:opacity-100"
                                  >
                                    <X className="h-3 w-3 text-background" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="flex h-7 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                            <ImagePlus className="h-3 w-3" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageUpload(item.id, e.target.files)}
                            />
                          </label>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="font-display text-sm font-semibold text-foreground">
                            {item.product.name}
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            <div>
                              <label className="text-[10px] text-muted-foreground">Size</label>
                              <Select
                                value={item.selectedSize}
                                onValueChange={(v) => {
                                  const size = item.product.sizes.find((s) => s.name === v);
                                  onUpdateLineItem(item.id, {
                                    selectedSize: v,
                                    unitPrice: size?.price || item.unitPrice,
                                  });
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {item.product.sizes.map((s) => (
                                    <SelectItem key={s.name} value={s.name}>
                                      {s.name} - ${s.price}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Color</label>
                              <Select
                                value={item.selectedColor}
                                onValueChange={(v) => onUpdateLineItem(item.id, { selectedColor: v })}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {item.product.color_presets.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Qty</label>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => onUpdateLineItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Unit Price</label>
                              <div className="relative">
                                <DollarSign className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min={0}
                                  step={5}
                                  value={item.unitPrice}
                                  onChange={(e) => onUpdateLineItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  className="h-8 pl-6 text-xs"
                                />
                              </div>
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <label className="text-[10px] text-muted-foreground">Total</label>
                                <p className="font-mono text-sm font-bold text-foreground">
                                  ${(item.unitPrice * item.quantity).toLocaleString()}
                                </p>
                              </div>
                              <button
                                onClick={() => onRemoveLineItem(item.id)}
                                className="mb-0.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <Input
                            value={item.notes}
                            onChange={(e) => onUpdateLineItem(item.id, { notes: e.target.value })}
                            placeholder="Add notes (e.g. with gold accents)..."
                            className="h-7 text-[11px]"
                          />
                        </div>
                      </div>
                    </motion.div>
                    {/* Drop indicator line below */}
                    {dropTargetIndex === index && dragItemIndex !== null && dragItemIndex < index && (
                      <div className="mx-2 h-0.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                    )}
                  </div>
                ))}

                {/* Drop indicator when items exist (external drag) */}
                {dragOver && (
                  <div className="rounded-xl border-2 border-dashed border-primary bg-primary/5 p-6 text-center">
                    <p className="text-xs font-medium text-primary">Drop here to add</p>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Totals */}
        {hasItems && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">${subtotal.toLocaleString()}</span>
              </div>

              {/* Surcharges */}
              {surcharges.map((surcharge, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={surcharge.enabled}
                      onCheckedChange={(checked) => {
                        const updated = [...surcharges];
                        updated[i] = { ...updated[i], enabled: checked };
                        onUpdateSurcharges(updated);
                      }}
                      className="scale-75"
                    />
                    <span className={`text-sm ${surcharge.enabled ? "text-muted-foreground" : "text-muted-foreground/40 line-through"}`}>
                      {surcharge.label}
                    </span>
                  </div>
                  {surcharge.enabled && (
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">+$</span>
                      <Input
                        type="number"
                        min={0}
                        step={5}
                        value={surcharge.amount}
                        onChange={(e) => {
                          const updated = [...surcharges];
                          updated[i] = { ...updated[i], amount: parseFloat(e.target.value) || 0 };
                          onUpdateSurcharges(updated);
                        }}
                        className="h-7 pl-7 text-xs font-mono text-right"
                      />
                    </div>
                  )}
                </div>
              ))}

              <div className="gold-divider my-3" />
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span className="font-display">Total</span>
                <span className="font-mono">${total.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Personal Note */}
        <div className="glass-card p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-foreground">
            Personal Note
          </h2>
          <Textarea
            value={proposal.personalNote}
            onChange={(e) => onUpdate({ personalNote: e.target.value })}
            placeholder="Hi Sarah! I'm so excited to help make your celebration extra special..."
            className="text-sm italic"
            rows={4}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2 gap-1.5 text-xs"
            onClick={handleGenerateNote}
            disabled={generatingNote}
          >
            {generatingNote ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {generatingNote ? "Generating..." : "Generate with AI"}
          </Button>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Uses client info, event details, all {itemLabel}, options & pricing to write a personalized note.
          </p>
        </div>
      </div>
    </div>
  );
}
