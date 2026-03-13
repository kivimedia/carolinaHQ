'use client';

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Save, Eye, Send, ArrowLeft, Package, X, History, BookTemplate } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { toast } from "@/hooks/fun/use-toast";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui-shadcn/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import ProductSidebar from "@/components/fun-proposals/proposal/ProductSidebar";
import ProposalCanvas from "@/components/fun-proposals/proposal/ProposalCanvas";
import ProposalPreview from "@/components/fun-proposals/proposal/ProposalPreview";
import { DbProduct, useProducts } from "@/hooks/fun/use-products";
import { useSaveProposal, useProposal } from "@/hooks/fun/use-proposals";
import { usePricingRules, calculateDeliveryFee } from "@/hooks/fun/use-pricing-rules";
import { useTemplate, useSaveTemplate } from "@/hooks/fun/use-templates";
import { useSaveRevision, useRevisions } from "@/hooks/fun/use-revisions";
import { useOptions } from "@/hooks/fun/use-options";
import { useUserSettings } from "@/hooks/fun/use-user-settings";
import { useTags, useProposalTags, useSetProposalTags } from "@/hooks/fun/use-tags";
import { EVENT_TYPES } from "@/data/products";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui-shadcn/drawer";

export interface BuilderLineItem {
  id: string;
  product: DbProduct;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
  notes: string;
  images: string[];
}

export interface BuilderOptionItemEntry {
  id: string;
  product_id?: string | null;
  product_name: string;
  product_image?: string | null;
  selected_size?: string;
  selected_color?: string;
  quantity: number;
  unit_price: number;
}

export interface BuilderOptionItem {
  id: string;
  name: string;
  description: string;
  display_price: number;
  priceOverride?: boolean;
  items: BuilderOptionItemEntry[];
}

export interface BuilderProposalData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientLogoUrl: string;
  eventType: string;
  eventDate: string;
  venue: string;
  startTime: string;
  guests: string;
  colorTheme: string;
  notes: string;
  lineItems: BuilderLineItem[];
  options: BuilderOptionItem[];
  personalNote: string;
  leadSource: string;
  imageDisplayMode: "regular" | "medium" | "xl" | "gallery";
  galleryLayout: "grid" | "stacked" | "masonry";
}

const INITIAL_PROPOSAL: BuilderProposalData = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientLogoUrl: "",
  eventType: "",
  eventDate: "",
  venue: "",
  startTime: "",
  guests: "",
  colorTheme: "",
  notes: "",
  lineItems: [],
  options: [],
  personalNote: "",
  leadSource: "",
  imageDisplayMode: "regular",
  galleryLayout: "grid",
};

export default function FunProposalBuilder({ proposalId: propId }: { proposalId?: string } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template") || undefined;
  const editId = propId || searchParams.get("edit") || undefined;

  const [proposal, setProposal] = useState<BuilderProposalData>(INITIAL_PROPOSAL);
  const [showPreview, setShowPreview] = useState(false);
  const [proposalId, setProposalId] = useState<string | undefined>(editId);
  const [initialized, setInitialized] = useState(false);
  const [productsDrawerOpen, setProductsDrawerOpen] = useState(false);
  const [revisionsDrawerOpen, setRevisionsDrawerOpen] = useState(false);
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState(false);

  // Dynamic surcharges state
  interface ProposalSurcharge {
    label: string;
    amount: number;
    enabled: boolean;
  }
  const [proposalSurcharges, setProposalSurcharges] = useState<ProposalSurcharge[]>([]);
  const [surchargesInitialized, setSurchargesInitialized] = useState(false);

  const previewPanelRef = useRef<ImperativePanelHandle>(null);
  const saveProposal = useSaveProposal();
  const saveTemplate = useSaveTemplate();
  const saveRevision = useSaveRevision();
  const { data: pricingRules = [] } = usePricingRules();
  const { data: products = [] } = useProducts();
  const { data: allOptions = [] } = useOptions();
  const { data: settings } = useUserSettings();
  const { data: templateData } = useTemplate(templateId);
  const { data: existingProposal } = useProposal(editId);
  const { data: revisions = [] } = useRevisions(proposalId);
  const { data: allTags = [] } = useTags();
  const { data: existingTagIds = [] } = useProposalTags(proposalId);
  const setProposalTags = useSetProposalTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const itemLabel = settings?.item_label || "designs";

  // Sync tags when loaded
  useEffect(() => {
    if (existingTagIds.length > 0) setSelectedTagIds(existingTagIds);
  }, [existingTagIds]);

  // Initialize surcharges from user settings (once)
  useEffect(() => {
    if (surchargesInitialized || !settings) return;
    const settingSurcharges = settings.surcharges || [];
    const initial: ProposalSurcharge[] = [
      { label: "Delivery & Setup", amount: calculateDeliveryFee(pricingRules), enabled: true },
      ...settingSurcharges
        .filter((s) => s.enabled)
        .map((s) => ({
          label: s.label,
          amount: parseFloat(s.value.replace(/[^0-9.]/g, "")) || 0,
          enabled: false,
        })),
    ];
    setProposalSurcharges(initial);
    setSurchargesInitialized(true);
  }, [settings, pricingRules, surchargesInitialized]);

  // Load from template
  useEffect(() => {
    if (initialized || products.length === 0) return;
    if (templateId && templateData) {
      const lineItems: BuilderLineItem[] = templateData.default_line_items
        .map((li) => {
          const product = products.find((p) => p.id === li.product_id);
          if (!product) return null;
          return {
            id: crypto.randomUUID(),
            product,
            selectedSize: li.selected_size,
            selectedColor: li.selected_color,
            quantity: li.quantity,
            unitPrice: li.unit_price,
            notes: "",
            images: [],
          };
        })
        .filter(Boolean) as BuilderLineItem[];

      setProposal({
        ...INITIAL_PROPOSAL,
        lineItems,
        personalNote: templateData.default_personal_note,
        notes: templateData.default_notes,
      });
      setInitialized(true);
    }
  }, [templateId, templateData, products, initialized]);

  // Load existing proposal for editing
  useEffect(() => {
    if (initialized || products.length === 0) return;
    if (editId && existingProposal) {
      const { proposal: p, lineItems: items } = existingProposal;
      const lineItems: BuilderLineItem[] = items
        .map((item) => {
          const product = products.find((pr) => pr.id === item.product_id);
          if (!product) return null;
          return {
            id: item.id,
            product,
            selectedSize: item.selected_size || "",
            selectedColor: item.selected_color || "Custom",
            quantity: item.quantity || 1,
            unitPrice: item.unit_price,
            notes: item.notes || "",
            images: [],
          };
        })
        .filter(Boolean) as BuilderLineItem[];

      // Restore options from selected_option_ids
      const selectedOptionIds = (p as any).selected_option_ids || [];
      const restoredOptions: BuilderOptionItem[] = selectedOptionIds
        .map((optId: string) => {
          const opt = allOptions.find((o) => o.id === optId);
          if (!opt) return null;
          return {
            id: opt.id,
            name: opt.name,
            description: opt.description || "",
            display_price: opt.display_price || 0,
          items: (opt.items || []).map((i: any) => {
              const product = products.find((p) => p.id === i.product_id);
              return {
                id: crypto.randomUUID(),
                product_id: i.product_id,
                product_name: i.product_name,
                product_image: product?.image_url || null,
                selected_size: i.selected_size,
                selected_color: i.selected_color,
                quantity: i.quantity || 1,
                unit_price: i.unit_price || 0,
              };
            }),
          };
        })
        .filter(Boolean) as BuilderOptionItem[];

      setProposal({
        clientName: p.client_name || "",
        clientEmail: p.client_email || "",
        clientPhone: p.client_phone || "",
        clientLogoUrl: (p as any).client_logo_url || "",
        eventType: p.event_type || "",
        eventDate: p.event_date || "",
        venue: p.venue || "",
        startTime: (p as any).start_time || "",
        guests: p.guests || "",
        colorTheme: p.color_theme || "",
        notes: p.notes || "",
        lineItems,
        options: restoredOptions,
        personalNote: p.personal_note || "",
        leadSource: p.lead_source || "",
        imageDisplayMode: (p as any).image_display_mode || "regular",
        galleryLayout: (p as any).gallery_layout || "grid",
      });
      setProposalId(editId);
      setInitialized(true);
    }
  }, [editId, existingProposal, products, initialized, allOptions]);

  // Mark initialized if no template/edit
  useEffect(() => {
    if (!templateId && !editId && !initialized) {
      setInitialized(true);
    }
  }, [templateId, editId, initialized]);

  const handleUpdate = useCallback((updates: Partial<BuilderProposalData>) => {
    setProposal((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAddProduct = useCallback((product: DbProduct) => {
    const defaultSize = product.sizes[1] || product.sizes[0];
    if (!defaultSize) return;
    const newItem: BuilderLineItem = {
      id: crypto.randomUUID(),
      product,
      selectedSize: defaultSize.name,
      selectedColor: product.color_presets[0] || "Custom",
      quantity: 1,
      unitPrice: defaultSize.price,
      notes: "",
      images: [],
    };
    setProposal((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
    toast({ title: `${product.name} added`, description: `${defaultSize.name} - $${defaultSize.price}` });
  }, []);

  const handleAddOption = useCallback((option: any) => {
    // If from drop, look up full option data
    if (option._fromDrop) {
      const fullOption = allOptions.find((o) => o.id === option.id);
      if (!fullOption) return;
      option = fullOption;
    }

    // Look up product images for each item
    const enrichedItems: BuilderOptionItemEntry[] = (option.items || []).map((i: any) => {
      const product = products.find((p) => p.id === i.product_id);
      return {
        id: crypto.randomUUID(),
        product_id: i.product_id,
        product_name: i.product_name,
        product_image: product?.image_url || null,
        selected_size: i.selected_size,
        selected_color: i.selected_color,
        quantity: i.quantity || 1,
        unit_price: i.unit_price || 0,
      };
    });

    setProposal((prev) => {
      // Don't add duplicate
      if (prev.options.some((o) => o.id === option.id)) {
        toast({ title: "Already added", description: `${option.name} is already in this proposal.` });
        return prev;
      }
      return {
        ...prev,
        options: [...prev.options, {
          id: option.id,
          name: option.name,
          description: option.description || "",
          display_price: option.display_price || 0,
          items: enrichedItems,
        }],
      };
    });
    toast({ title: `${option.name} added`, description: `Option with ${option.items?.length || 0} ${itemLabel}` });
  }, [allOptions, itemLabel, products]);

  const handleRemoveOption = useCallback((optionId: string) => {
    setProposal((prev) => ({
      ...prev,
      options: prev.options.filter((o) => o.id !== optionId),
    }));
  }, []);

  const handleUpdateOption = useCallback((optionId: string, updates: Partial<BuilderOptionItem>) => {
    setProposal((prev) => ({
      ...prev,
      options: prev.options.map((o) => o.id === optionId ? { ...o, ...updates } : o),
    }));
  }, []);

  const handleUpdateOptionItem = useCallback((optionId: string, itemId: string, updates: Partial<BuilderOptionItemEntry>) => {
    setProposal((prev) => ({
      ...prev,
      options: prev.options.map((o) => {
        if (o.id !== optionId) return o;
        const newItems = o.items.map((i) => i.id === itemId ? { ...i, ...updates } : i);
        // Only auto-recalculate if price hasn't been manually overridden
        if (!o.priceOverride) {
          const newPrice = newItems.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
          return { ...o, items: newItems, display_price: newPrice };
        }
        return { ...o, items: newItems };
      }),
    }));
  }, []);

  const handleRemoveOptionItem = useCallback((optionId: string, itemId: string) => {
    setProposal((prev) => ({
      ...prev,
      options: prev.options.map((o) => {
        if (o.id !== optionId) return o;
        const newItems = o.items.filter((i) => i.id !== itemId);
        if (!o.priceOverride) {
          const newPrice = newItems.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
          return { ...o, items: newItems, display_price: newPrice };
        }
        return { ...o, items: newItems };
      }),
    }));
  }, []);

  const handleReorderItems = useCallback((fromIndex: number, toIndex: number) => {
    setProposal((prev) => {
      const items = [...prev.lineItems];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...prev, lineItems: items };
    });
  }, []);

  const handleUpdateLineItem = useCallback((id: string, updates: Partial<BuilderLineItem>) => {
    setProposal((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  }, []);

  const handleRemoveLineItem = useCallback((id: string) => {
    setProposal((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((item) => item.id !== id),
    }));
  }, []);

  const lineItemSubtotal = proposal.lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const optionsSubtotal = proposal.options.reduce((sum, opt) => sum + opt.display_price, 0);
  const subtotal = lineItemSubtotal + optionsSubtotal;

  const surchargesTotal = proposalSurcharges
    .filter((s) => s.enabled)
    .reduce((sum, s) => sum + s.amount, 0);

  const total = subtotal + surchargesTotal;

  const addedProductIds = proposal.lineItems.map((item) => item.product.id);
  const addedOptionIds = proposal.options.map((opt) => opt.id);

  const handleSave = async (): Promise<string | undefined> => {
    const surcharges = proposalSurcharges
      .filter((s) => s.enabled)
      .map((s) => ({ name: s.label, amount: s.amount }));

    const id = await saveProposal.mutateAsync({
      id: proposalId,
      client_name: proposal.clientName,
      client_email: proposal.clientEmail,
      client_phone: proposal.clientPhone,
      event_type: proposal.eventType,
      event_date: proposal.eventDate,
      venue: proposal.venue,
      start_time: proposal.startTime,
      guests: proposal.guests,
      color_theme: proposal.colorTheme,
      notes: proposal.notes,
      personal_note: proposal.personalNote,
      lead_source: proposal.leadSource,
      subtotal,
      delivery_fee: proposalSurcharges.find(s => s.label === "Delivery & Setup" && s.enabled)?.amount || 0,
      total,
      surcharges,
      discounts: [],
      selected_option_ids: proposal.options.map((o) => o.id),
      image_display_mode: proposal.imageDisplayMode,
      gallery_layout: proposal.galleryLayout,
      lineItems: proposal.lineItems.map((item, i) => ({
        id: item.id,
        product_id: item.product.id,
        product_name: item.product.name,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        notes: item.notes,
        display_order: i,
      })),
    });
    if (id) {
      setProposalId(id);
      saveRevision.mutate({
        proposalId: id,
        snapshot: {
          proposal,
          subtotal,
          surcharges: proposalSurcharges.filter(s => s.enabled),
          total,
        },
      });
      // Save tag assignments
      setProposalTags.mutate({ proposalId: id, tagIds: selectedTagIds });
    }
    return id;
  };

  const handleSaveAsTemplate = async () => {
    const templateName = proposal.clientName
      ? `Template from ${proposal.clientName}`
      : `Template ${new Date().toLocaleDateString()}`;
    await saveTemplate.mutateAsync({
      name: templateName,
      description: proposal.eventType || "",
      default_personal_note: proposal.personalNote,
      default_notes: proposal.notes,
      default_line_items: proposal.lineItems.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        selected_size: item.selectedSize,
        selected_color: item.selectedColor,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });
    toast({ title: "Template saved!", description: `"${templateName}" is now available as a template.` });
  };

  const canvasProps = {
    proposal,
    onUpdate: handleUpdate,
    onUpdateLineItem: handleUpdateLineItem,
    onRemoveLineItem: handleRemoveLineItem,
    onAddProduct: handleAddProduct,
    onAddOption: handleAddOption,
    onRemoveOption: handleRemoveOption,
    onUpdateOption: handleUpdateOption,
    onUpdateOptionItem: handleUpdateOptionItem,
    onRemoveOptionItem: handleRemoveOptionItem,
    onReorderItems: handleReorderItems,
    products,
    subtotal,
    total,
    surcharges: proposalSurcharges,
    onUpdateSurcharges: setProposalSurcharges,
    allTags,
    selectedTagIds,
    onToggleTag: (tagId: string) => {
      setSelectedTagIds((prev) =>
        prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
      );
    },
  };

  const activeSurcharges = proposalSurcharges.filter(s => s.enabled);

  const previewProps = {
    proposal,
    subtotal,
    total,
    surcharges: activeSurcharges,
    proposalId,
    onSave: handleSave,
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-card px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" className="gap-1 px-2 text-xs" onClick={() => router.push("/")}>
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <h1 className="font-display text-sm font-semibold text-foreground sm:text-lg">
            {proposalId ? "Edit" : "New"}
            <span className="hidden sm:inline"> Proposal</span>
            {templateData && !editId && (
              <span className="ml-2 hidden text-sm font-normal text-muted-foreground sm:inline">
                from &quot;{templateData.name}&quot;
              </span>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {revisions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 px-2 text-xs"
              onClick={() => setRevisionsDrawerOpen(true)}
            >
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">v{revisions.length}</span>
            </Button>
          )}
          {proposalId && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 px-2 text-xs"
              onClick={handleSaveAsTemplate}
              disabled={saveTemplate.isPending}
            >
              <BookTemplate className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{saveTemplate.isPending ? "Saving..." : "Save as Template"}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1 px-2 text-xs sm:gap-1.5 sm:px-3"
            onClick={handleSave}
            disabled={saveProposal.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{saveProposal.isPending ? "Saving..." : "Save Draft"}</span>
          </Button>
          <Button size="sm" className="gap-1 px-2 text-xs shadow-md sm:gap-1.5 sm:px-3" disabled={proposal.lineItems.length === 0 && proposal.options.length === 0}>
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Approve & Send</span>
          </Button>
        </div>
      </div>

      {/* Mobile: Editor always visible + drawer overlays */}
      <div className="flex-1 overflow-hidden pb-16 lg:hidden lg:pb-0">
        <ProposalCanvas {...canvasProps} />
      </div>

      {/* Mobile: Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t bg-card px-3 py-2.5 lg:hidden">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setProductsDrawerOpen(true)}
        >
          <Package className="h-3.5 w-3.5" />
          + <span className="capitalize">{itemLabel}</span>
        </Button>
        {(proposal.lineItems.length > 0 || proposal.options.length > 0) && (
          <span className="font-mono text-sm font-bold text-foreground">
            ${total.toLocaleString()}
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={() => setPreviewDrawerOpen(true)}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
      </div>

      {/* Mobile: Products Drawer */}
      <Drawer open={productsDrawerOpen} onOpenChange={setProductsDrawerOpen}>
        <DrawerContent className="h-[80vh] lg:hidden">
          <DrawerHeader className="flex flex-row items-center justify-between pb-0">
            <DrawerTitle className="capitalize">{itemLabel}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <ProductSidebar onAddProduct={handleAddProduct} onAddOption={handleAddOption} addedProductIds={addedProductIds} addedOptionIds={addedOptionIds} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mobile: Preview Drawer */}
      <Drawer open={previewDrawerOpen} onOpenChange={setPreviewDrawerOpen}>
        <DrawerContent className="h-[90vh] lg:hidden">
          <DrawerHeader className="flex flex-row items-center justify-between pb-0">
            <DrawerTitle>Preview</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <ProposalPreview {...previewProps} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Revisions Drawer */}
      <Drawer open={revisionsDrawerOpen} onOpenChange={setRevisionsDrawerOpen}>
        <DrawerContent className="h-[70vh]">
          <DrawerHeader className="flex flex-row items-center justify-between pb-0">
            <DrawerTitle>Revision History</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="flex-1 overflow-auto p-4">
            {revisions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No revisions yet. Save the proposal to create one.</p>
            ) : (
              <div className="space-y-2">
                {revisions.map((rev) => {
                  const snap = rev.snapshot as any;
                  return (
                    <button
                      key={rev.id}
                      onClick={() => {
                        if (snap.proposal) {
                          setProposal(snap.proposal);
                          setRevisionsDrawerOpen(false);
                          toast({ title: `Restored revision #${rev.revision_number}` });
                        }
                      }}
                      className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-semibold text-foreground">
                          Revision #{rev.revision_number}
                        </span>
                        <span className="font-mono text-xs text-primary">
                          ${(snap.total || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(rev.created_at).toLocaleString()}
                      </p>
                      {snap.proposal?.clientName && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Client: {snap.proposal.clientName}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Desktop */}
      <div className="hidden flex-1 overflow-hidden lg:flex">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={15} minSize={12} maxSize={20} className="flex-shrink-0">
            <ProductSidebar onAddProduct={handleAddProduct} onAddOption={handleAddOption} addedProductIds={addedProductIds} addedOptionIds={addedOptionIds} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <ProposalCanvas {...canvasProps} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel ref={previewPanelRef} defaultSize={35} minSize={20} maxSize={60}>
            <ProposalPreview
              {...previewProps}
              onResizePreview={(size) => {
                previewPanelRef.current?.resize(size);
              }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
