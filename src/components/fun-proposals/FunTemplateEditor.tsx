'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Palette, Layers } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { Input } from "@/components/ui-shadcn/input";
import { Textarea } from "@/components/ui-shadcn/textarea";
import { Label } from "@/components/ui-shadcn/label";
import { Badge } from "@/components/ui-shadcn/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui-shadcn/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui-shadcn/popover";
import { useTemplate, useSaveTemplate, type TemplateLineItem, type TemplateOption } from "@/hooks/fun/use-templates";
import { useProducts, type DbProduct } from "@/hooks/fun/use-products";
import { useOptions } from "@/hooks/fun/use-options";
import { EVENT_TYPES } from "@/data/products";

interface FunTemplateEditorProps {
  templateId: string;
}

export default function FunTemplateEditor({ templateId }: FunTemplateEditorProps) {
  const id = templateId;
  const router = useRouter();
  const { data: template, isLoading } = useTemplate(id);
  const { data: products = [] } = useProducts();
  const { data: allOptions = [] } = useOptions();
  const saveTemplate = useSaveTemplate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<TemplateLineItem[]>([]);
  const [personalNote, setPersonalNote] = useState("");
  const [notes, setNotes] = useState("");
  const [newColor, setNewColor] = useState("#ec4899");
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setEventTypes(template.event_types);
      setColors(template.colors);
      setLineItems(template.default_line_items);
      setPersonalNote(template.default_personal_note);
      setNotes(template.default_notes);
      setTemplateOptions(template.options || []);
    }
  }, [template]);

  const toggleEventType = (et: string) => {
    setEventTypes((prev) =>
      prev.includes(et) ? prev.filter((e) => e !== et) : [...prev, et]
    );
  };

  const addProduct = (product: DbProduct) => {
    const defaultSize = product.sizes[1] || product.sizes[0];
    if (!defaultSize) return;
    setLineItems((prev) => [
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

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, updates: Partial<TemplateLineItem>) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const handleSave = async () => {
    await saveTemplate.mutateAsync({
      id,
      name,
      description,
      event_types: eventTypes,
      colors,
      default_line_items: lineItems,
      default_personal_note: personalNote,
      default_notes: notes,
      options: templateOptions,
    });
    router.push("/templates");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template && id) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <p className="text-muted-foreground">Template not found.</p>
        <Button variant="outline" onClick={() => router.push("/templates")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Templates
        </Button>
      </div>
    );
  }

  const addedProductIds = lineItems.map((li) => li.product_id);
  const availableProducts = products.filter((p) => !addedProductIds.includes(p.id));

  return (
    <div className="flex-1 overflow-auto p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/templates")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">Edit Template</h1>
        <div className="ml-auto">
          <Button
            onClick={handleSave}
            disabled={saveTemplate.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saveTemplate.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Basic info */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Details</h2>
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
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
              <Label>Default Personal Note</Label>
              <Textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                rows={2}
                placeholder="Pre-fill personal note for proposals using this template..."
              />
            </div>
            <div className="space-y-2">
              <Label>Default Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Internal notes..."
              />
            </div>
          </div>

          {/* Event types */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Event Types</h2>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et}
                  onClick={() => toggleEventType(et)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    eventTypes.includes(et)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">Color Palette</h2>
            <div className="flex flex-wrap gap-3 items-center">
              {colors.map((color, i) => (
                <div key={i} className="relative group">
                  <div
                    className="h-10 w-10 rounded-full ring-2 ring-border cursor-pointer"
                    style={{ backgroundColor: color }}
                  />
                  <button
                    onClick={() => setColors((prev) => prev.filter((_, ci) => ci !== i))}
                    className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px]"
                  >
                    x
                  </button>
                </div>
              ))}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-dashed ring-border text-muted-foreground hover:bg-muted transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 space-y-3" align="start">
                  <p className="text-sm font-medium text-foreground">Pick a color</p>
                  <div className="grid grid-cols-8 gap-1.5">
                    {[
                      "#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e","#14b8a6","#06b6d4",
                      "#3b82f6","#6366f1","#8b5cf6","#a855f7","#d946ef","#ec4899","#f43f5e","#78716c",
                      "#fca5a5","#fdba74","#fcd34d","#fde047","#bef264","#86efac","#5eead4","#67e8f9",
                      "#93c5fd","#a5b4fc","#c4b5fd","#d8b4fe","#f0abfc","#f9a8d4","#fda4af","#d6d3d1",
                      "#ffffff","#fafafa","#e5e5e5","#a3a3a3","#737373","#525252","#262626","#000000",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          if (!colors.includes(c)) setColors((prev) => [...prev, c]);
                        }}
                        className="h-6 w-6 rounded-full ring-1 ring-border hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Palette className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        placeholder="#hex"
                        className="pl-7 text-xs font-mono h-8"
                        maxLength={7}
                      />
                    </div>
                    <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md ring-1 ring-border overflow-hidden shrink-0" style={{ backgroundColor: newColor }}>
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        if (/^#[0-9a-fA-F]{3,6}$/.test(newColor) && !colors.includes(newColor)) {
                          setColors((prev) => [...prev, newColor]);
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Right: Default products */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Default Products
            </h2>
            <p className="text-sm text-muted-foreground">
              Products that will be pre-loaded when starting a proposal from this template.
            </p>

            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-4 text-center">
                No default products yet
              </p>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item, i) => {
                  const product = products.find((p) => p.id === item.product_id);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border bg-card p-3"
                    >
                      {product?.image_url && (
                        <img
                          src={product.image_url}
                          alt={item.product_name}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.product_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.selected_size} · ${item.unit_price}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateLineItem(i, { quantity: parseInt(e.target.value) || 1 })
                          }
                          className="w-16 text-center text-sm"
                        />
                        {product && product.sizes.length > 1 && (
                          <Select
                            value={item.selected_size}
                            onValueChange={(val) => {
                              const size = product.sizes.find((s) => s.name === val);
                              updateLineItem(i, {
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
                          onClick={() => removeLineItem(i)}
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

            {availableProducts.length > 0 && (
              <div className="pt-2">
                <Select onValueChange={(id) => {
                  const p = products.find((pr) => pr.id === id);
                  if (p) addProduct(p);
                }}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Add a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - from ${p.base_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Options (Packages) */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Options (Packages)</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Attach options that the client can choose from. Each shows a bundled price.
            </p>

            {templateOptions.length > 0 && (
              <div className="space-y-2">
                {templateOptions.map((to, i) => {
                  const opt = allOptions.find((o) => o.id === to.option_id);
                  if (!opt) return null;
                  return (
                    <div key={to.option_id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{opt.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {opt.items.length} product{opt.items.length !== 1 ? "s" : ""} ·
                          Display: ${(to.price_override ?? opt.display_price).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-muted-foreground">Price override</label>
                          <Input
                            type="number"
                            min={0}
                            placeholder={String(opt.display_price)}
                            value={to.price_override ?? ""}
                            onChange={(e) => {
                              const val = e.target.value ? parseFloat(e.target.value) : null;
                              setTemplateOptions((prev) =>
                                prev.map((o) =>
                                  o.option_id === to.option_id ? { ...o, price_override: val } : o
                                )
                              );
                            }}
                            className="w-24 text-sm font-mono"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTemplateOptions((prev) =>
                              prev.filter((o) => o.option_id !== to.option_id)
                            )
                          }
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

            {allOptions.filter((o) => !templateOptions.some((to) => to.option_id === o.id)).length > 0 && (
              <Select
                onValueChange={(optId) => {
                  setTemplateOptions((prev) => [
                    ...prev,
                    { option_id: optId, display_order: prev.length, price_override: null },
                  ]);
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Attach an option..." />
                </SelectTrigger>
                <SelectContent>
                  {allOptions
                    .filter((o) => !templateOptions.some((to) => to.option_id === o.id))
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name} - ${o.display_price.toLocaleString()}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Preview */}
          <div className="glass-card p-6 space-y-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Preview</h2>
            <div className="flex h-3 rounded-t-lg overflow-hidden">
              {colors.map((c, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <h3 className="font-display font-semibold text-foreground">{name || "Untitled"}</h3>
            <p className="text-sm text-muted-foreground">{description || "No description"}</p>
            <div className="flex flex-wrap gap-1.5">
              {eventTypes.map((et) => (
                <Badge key={et} variant="outline" className="text-xs">
                  {et}
                </Badge>
              ))}
            </div>
            {lineItems.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {lineItems.length} default product{lineItems.length !== 1 ? "s" : ""} ·
                ${lineItems.reduce((s, li) => s + li.unit_price * li.quantity, 0).toLocaleString()}
              </p>
            )}
            {templateOptions.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {templateOptions.length} option{templateOptions.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
