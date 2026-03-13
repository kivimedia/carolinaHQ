'use client';

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Loader2, CheckCircle2, X, Package } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageGallery, LineItemImage, Lightbox } from "@/components/fun-proposals/proposal/ImageGallery";
import type { ImageDisplayMode, GalleryLayout } from "@/components/fun-proposals/proposal/ImageGallery";

interface FunPublicProposalProps {
  proposalId: string;
}

interface LineItem {
  id: string;
  product_name: string;
  product_image: string | null;
  selected_size: string | null;
  selected_color: string | null;
  quantity: number | null;
  unit_price: number;
  notes: string | null;
}

interface OptionItem {
  id: string;
  product_name: string;
  product_image?: string | null;
  selected_size?: string | null;
  selected_color?: string | null;
  quantity: number;
  unit_price: number;
}

interface ProposalOption {
  id: string;
  name: string;
  description: string | null;
  display_price: number;
  items: OptionItem[];
}

interface Proposal {
  id: string;
  proposal_number: string | null;
  client_name: string | null;
  client_logo_url: string | null;
  event_type: string | null;
  event_date: string | null;
  venue: string | null;
  start_time: string | null;
  guests: string | null;
  color_theme: string | null;
  personal_note: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  total: number | null;
  surcharges: unknown;
  valid_days: number | null;
  selected_option_ids: string[] | null;
  user_id: string | null;
  image_display_mode: string | null;
  gallery_layout: string | null;
}

interface OwnerSettings {
  business_name: string | null;
  logo_url: string | null;
  email: string | null;
  allow_item_removal: boolean;
  item_label: string | null;
}

function AcceptButton({ proposalId, validDays, disabled, label, onAccepted }: { proposalId: string; validDays: number; disabled?: boolean; label?: string; onAccepted?: () => void }) {
  const supabase = createClient();
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    await supabase.from("proposals").update({
      status: "accepted" as any,
      accepted_at: new Date().toISOString(),
    }).eq("id", proposalId);

    // Notify owner via edge function (fire and forget)
    supabase.functions.invoke("notify-proposal-accepted", {
      body: { proposal_id: proposalId },
    }).catch(() => {});

    setAccepting(false);
    onAccepted?.();
  };

  return (
    <>
      <button
        onClick={handleAccept}
        disabled={accepting || disabled}
        className="mt-8 w-full rounded-lg bg-primary px-6 py-4 text-center text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
      >
        {accepting ? "ACCEPTING..." : (label || "ACCEPT THIS PROPOSAL")}
      </button>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        This proposal is valid for {validDays} days.
      </p>
    </>
  );
}

export default function FunPublicProposal({ proposalId }: FunPublicProposalProps) {
  const supabase = createClient();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [options, setOptions] = useState<ProposalOption[]>([]);
  const [removedItemIds, setRemovedItemIds] = useState<Set<string>>(new Set());
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [ownerSettings, setOwnerSettings] = useState<OwnerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);

  useEffect(() => {
    async function load() {
      if (!proposalId) return;

      const { data: p, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .single();

      if (error || !p) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check if already accepted
      if ((p as any).status === "accepted") {
        setAlreadyAccepted(true);
      }

      const { data: items } = await supabase
        .from("proposal_line_items")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("display_order");

      // Load options
      const selectedOptionIds = (p as any).selected_option_ids || [];
      let loadedOptions: ProposalOption[] = [];
      if (selectedOptionIds.length > 0) {
        const { data: opts } = await supabase
          .from("proposal_options")
          .select("*")
          .in("id", selectedOptionIds);

        if (opts) {
          // Collect all product_ids from option items to load images
          const allProductIds: string[] = [];
          const optItemsByOpt: Record<string, any[]> = {};

          for (const opt of opts) {
            const { data: optItems } = await supabase
              .from("proposal_option_items")
              .select("*")
              .eq("option_id", opt.id)
              .order("display_order");
            optItemsByOpt[opt.id] = optItems || [];
            for (const i of (optItems || [])) {
              if (i.product_id) allProductIds.push(i.product_id);
            }
          }

          // Load primary images for these products
          let productImageMap: Record<string, string> = {};
          if (allProductIds.length > 0) {
            const { data: pImages } = await supabase
              .from("product_images")
              .select("product_id, image_url, is_primary")
              .in("product_id", Array.from(new Set(allProductIds)))
              .eq("is_primary", true);
            if (pImages) {
              for (const img of pImages) {
                productImageMap[img.product_id] = img.image_url;
              }
            }
          }

          for (const opt of opts) {
            loadedOptions.push({
              id: opt.id,
              name: opt.name,
              description: opt.description,
              display_price: opt.display_price || 0,
              items: (optItemsByOpt[opt.id] || []).map((i: any) => ({
                id: i.id,
                product_name: i.product_name,
                product_image: productImageMap[i.product_id] || null,
                selected_size: i.selected_size,
                selected_color: i.selected_color,
                quantity: i.quantity || 1,
                unit_price: i.unit_price || 0,
              })),
            });
          }
        }
      }

      // Load owner settings
      if (p.user_id) {
        const { data: settings } = await supabase
          .from("user_settings")
          .select("business_name, logo_url, email, allow_item_removal, item_label")
          .eq("user_id", p.user_id)
          .maybeSingle();
        if (settings) setOwnerSettings(settings as any);
      }

      setProposal(p as any);
      setLineItems((items || []) as LineItem[]);
      setOptions(loadedOptions);

      // Mark as viewed
      if (!(p as any).viewed_at) {
        await supabase.from("proposals").update({ viewed_at: new Date().toISOString() }).eq("id", proposalId);
      }

      setLoading(false);
    }
    load();
  }, [proposalId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !proposal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Proposal Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This proposal may have expired or been removed.</p>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="mx-auto w-full max-w-md rounded-xl bg-card shadow-2xl ring-1 ring-border p-10 text-center"
        >
          {ownerSettings?.logo_url ? (
            <div className="mx-auto mb-6 flex h-14 w-auto items-center justify-center">
              <img src={ownerSettings.logo_url} alt="Business logo" className="max-h-full max-w-[200px] object-contain" />
            </div>
          ) : (
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
              <span className="font-display text-xl font-bold text-primary-foreground">CB</span>
            </div>
          )}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 15 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </motion.div>
          <h1 className="font-display text-2xl font-bold text-foreground">Thank You!</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Your proposal has been accepted. We&apos;re excited to start working on your {proposal.event_type || "event"}!
          </p>
          <div className="gold-divider my-6" />
          <div className="rounded-lg bg-blush p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium text-foreground">{proposal.client_name || "Client"}</span>
            </div>
            {proposal.event_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{format(new Date(proposal.event_date + "T00:00:00"), "MMMM d, yyyy")}</span>
              </div>
            )}
          </div>
          <div className="gold-divider my-6" />
          <p className="text-sm text-muted-foreground">
            We&apos;ll be in touch shortly to confirm the details.
          </p>
          <div className="mt-6 space-y-0.5 text-xs text-muted-foreground">
            <p>{ownerSettings?.business_name || "Carolina Balloons"}</p>
            <p>{ownerSettings?.email || ""}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const formattedDate = proposal.event_date
    ? format(new Date(proposal.event_date + "T00:00:00"), "MMMM d, yyyy")
    : "TBD";

  const surcharges = (proposal.surcharges as Array<{ name: string; amount: number }>) || [];
  const allowRemoval = ownerSettings?.allow_item_removal !== false;
  const hasOptions = options.length > 0;
  const itemLabel = ownerSettings?.item_label || "designs";
  const imgMode = (proposal.image_display_mode || "regular") as ImageDisplayMode;
  const galleryLayout = (proposal.gallery_layout || "grid") as GalleryLayout;

  const activeLineItems = lineItems.filter((item) => !removedItemIds.has(item.id));
  const activeSubtotal = activeLineItems.reduce((sum, item) => sum + item.unit_price * (item.quantity || 1), 0);
  const surchargesTotal = surcharges.reduce((sum, s) => sum + (s.amount || 0), 0);
  const activeTotal = activeSubtotal + surchargesTotal;

  const handleRemoveItem = (itemId: string) => {
    setRemovedItemIds((prev) => { const next = new Set(prev); next.add(itemId); return next; });
  };

  const handleUndoRemove = (itemId: string) => {
    setRemovedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 py-4 sm:py-8 px-3 sm:px-4">
      <div className="mx-auto w-full max-w-lg rounded-xl bg-card shadow-2xl ring-1 ring-border overflow-hidden">
        {/* Accepted Banner */}
        {alreadyAccepted && (
          <div className="flex items-center justify-center gap-2 rounded-t-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              This proposal has been accepted
            </span>
          </div>
        )}
        {/* Cover */}
        <div className="p-6 sm:p-10 text-center">
          {ownerSettings?.logo_url ? (
            <div className="mx-auto mb-4 flex h-16 w-auto items-center justify-center">
              <img src={ownerSettings.logo_url} alt="Business logo" className="max-h-full max-w-[220px] object-contain" />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
              <span className="font-display text-xl font-bold text-primary-foreground">CB</span>
            </div>
          )}
          <div className="gold-divider mb-6" />
          <h1 className="font-display text-3xl font-bold tracking-wide text-primary">PROPOSAL</h1>
          {proposal.proposal_number && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{proposal.proposal_number}</p>
          )}
          <p className="mt-6 text-sm text-muted-foreground">Prepared for</p>
          <p className="font-display text-2xl font-semibold text-foreground">
            {proposal.client_name || "Client"}
          </p>
          {proposal.client_logo_url && (
            <div className="mt-3 flex justify-center">
              <img src={proposal.client_logo_url} alt="Client logo" className="max-h-12 max-w-[160px] object-contain" />
            </div>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            {proposal.event_type || "Event"} · {formattedDate}
          </p>
          <div className="gold-divider my-8" />
          <p className="font-display text-sm italic text-gold">
            &quot;Turning your vision into reality&quot;
          </p>
        </div>

        <div className="gold-divider" />

        {/* Event Details */}
        <div className="p-5 sm:p-8">
          <h2 className="mb-4 font-display text-base font-semibold text-primary">YOUR EVENT</h2>
          <div className="space-y-3 rounded-lg bg-blush p-5 text-sm">
            {[
              proposal.event_type && ["Event Type", proposal.event_type],
              proposal.event_date && ["Date", formattedDate],
              proposal.venue && ["Location", proposal.venue],
              proposal.start_time && ["Start Time", proposal.start_time],
              proposal.guests && ["Est. Guests", proposal.guests],
              proposal.color_theme && ["Color Theme", proposal.color_theme],
            ].filter(Boolean).map((entry) => {
              const [label, value] = entry as [string, string];
              return (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              );
            })}
          </div>

          {proposal.personal_note && (
            <>
              <h2 className="mb-3 mt-8 font-display text-base font-semibold text-primary">
                A NOTE FOR YOU
              </h2>
              <div className="rounded-lg bg-blush p-5">
                <p className="text-sm italic leading-relaxed text-foreground">
                  &quot;{proposal.personal_note}&quot;
                </p>
              </div>
            </>
          )}
        </div>

        <div className="gold-divider" />

        {/* Products */}
        {lineItems.length > 0 && (
          <div className="p-5 sm:p-8">
            <h2 className="mb-5 font-display text-base font-semibold text-primary uppercase">Your {itemLabel}</h2>
            <div className="space-y-4">
              {lineItems.map((item, i) => {
                const isRemoved = removedItemIds.has(item.id);
                return (
                  <div key={item.id}>
                    {/* XL or Medium: image above */}
                    {(imgMode === "xl" || imgMode === "medium") && !isRemoved && (
                      <LineItemImage
                        imageUrl={item.product_image}
                        productName={item.product_name}
                        mode={imgMode}
                        onImageClick={setLightboxImage}
                      />
                    )}
                    <div
                      className={`relative flex gap-4 rounded-lg p-4 transition-all ${
                        isRemoved ? "opacity-40 bg-muted" : i % 2 === 0 ? "bg-blush" : ""
                      }`}
                    >
                      {/* Regular: inline thumbnail */}
                      {imgMode === "regular" && (
                        <div
                          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                          onClick={() => item.product_image && setLightboxImage(item.product_image)}
                        >
                          {item.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-2xl">🎈</span>
                          )}
                        </div>
                      )}
                      {/* Gallery mode: no image */}
                      {imgMode === "gallery" && !item.product_image && (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-2xl">🎈</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-semibold text-foreground ${isRemoved ? "line-through" : ""}`}>
                          {item.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.selected_size} · {item.selected_color}
                        </p>
                        {item.notes && (
                          <p className="mt-1 text-xs italic text-foreground/80">{item.notes}</p>
                        )}
                      </div>
                      {(item.unit_price * (item.quantity || 1)) > 0 && (
                        <div className="text-right">
                          <p className={`font-mono text-sm font-bold text-foreground ${isRemoved ? "line-through" : ""}`}>
                            ${(item.unit_price * (item.quantity || 1)).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.quantity || 1}x</p>
                        </div>
                      )}
                      {/* Remove / Undo button */}
                      {allowRemoval && !hasOptions && (
                        <button
                          onClick={() => isRemoved ? handleUndoRemove(item.id) : handleRemoveItem(item.id)}
                          className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shadow-md transition-colors ${
                            isRemoved
                              ? "bg-primary text-primary-foreground"
                              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          }`}
                          title={isRemoved ? "Undo" : "Remove"}
                        >
                          {isRemoved ? "↩" : <X className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gallery Section */}
        {imgMode === "gallery" && lineItems.length > 0 && (() => {
          const galleryImages = lineItems
            .filter((item) => !removedItemIds.has(item.id) && item.product_image)
            .map((item) => ({ url: item.product_image!, label: item.product_name }));
          return galleryImages.length > 0 ? (
            <>
              <div className="gold-divider" />
              <ImageGallery
                images={galleryImages}
                layout={galleryLayout}
                onImageClick={setLightboxImage}
              />
            </>
          ) : null;
        })()}

        {/* Options */}
        {hasOptions && (
          <>
            <div className="gold-divider" />
            <div className="p-5 sm:p-8">
              <h2 className="mb-5 font-display text-base font-semibold text-primary uppercase">
                Choose Your Preferred Option
              </h2>
              <div className="space-y-4">
                {options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOptionId(isSelected ? null : option.id)}
                      className={`w-full text-left rounded-xl border-2 overflow-hidden transition-all ${
                        isSelected
                          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg ring-2 ring-primary/30"
                          : "border-border hover:border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-primary/15"
                        }`}>
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Package className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{option.name}</p>
                          {option.description && (
                            <p className="text-xs text-muted-foreground">{option.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-base font-bold text-primary">
                            ${option.display_price.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{option.items.length} {itemLabel}</p>
                        </div>
                      </div>
                      <div className="border-t border-primary/10 bg-card/50 px-4 py-3 space-y-2">
                        {option.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 text-xs">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-md bg-blush overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                              onClick={(e) => { e.stopPropagation(); item.product_image && setLightboxImage(item.product_image); }}
                            >
                              {item.product_image ? (
                                <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-sm">🎈</span>
                              )}
                            </div>
                            <span className="flex-1 text-foreground">{item.product_name}</span>
                            {item.selected_size && (
                              <span className="text-[10px] text-muted-foreground">{item.selected_size}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="gold-divider" />

        {/* Accept Section */}
        <div className="p-5 sm:p-8">
          {!hasOptions && activeLineItems.length > 0 && (
            <>
              <h2 className="mb-4 font-display text-base font-semibold text-primary">INVESTMENT SUMMARY</h2>
              <div className="space-y-2 text-sm">
                {activeLineItems.filter(item => (item.unit_price * (item.quantity || 1)) > 0).map((item) => (
                  <div key={item.id} className="flex justify-between gap-2">
                    <span className="text-muted-foreground truncate">{item.product_name} ({item.selected_size})</span>
                    <span className="font-mono font-medium text-foreground">
                      ${(item.unit_price * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="gold-divider my-3" />
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">${activeSubtotal.toLocaleString()}</span>
                </div>
                {surcharges.map((s, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{s.name}</span>
                    <span className="font-mono">+${(s.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
                <div className="gold-divider my-3" />
                <div className="flex justify-between text-lg font-bold">
                  <span className="font-display text-foreground">Total</span>
                  <span className="font-mono text-primary">${activeTotal.toLocaleString()}</span>
                </div>
                {removedItemIds.size > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    {removedItemIds.size} item{removedItemIds.size > 1 ? "s" : ""} removed from your selection
                  </p>
                )}
              </div>
              <AcceptButton proposalId={proposal.id} validDays={proposal.valid_days || 14} onAccepted={() => setAccepted(true)} />
            </>
          )}

          {hasOptions && (
            <>
              {selectedOptionId && (
                <div className="mb-4 rounded-lg bg-blush p-4 text-center">
                  <p className="text-xs text-muted-foreground">Selected option</p>
                  <p className="font-display text-sm font-semibold text-foreground">
                    {options.find((o) => o.id === selectedOptionId)?.name}
                  </p>
                  <p className="font-mono text-lg font-bold text-primary">
                    ${options.find((o) => o.id === selectedOptionId)?.display_price.toLocaleString()}
                  </p>
                </div>
              )}
              <AcceptButton
                proposalId={proposal.id}
                validDays={proposal.valid_days || 14}
                disabled={!selectedOptionId}
                label={selectedOptionId ? "ACCEPT THIS OPTION" : "SELECT AN OPTION ABOVE"}
                onAccepted={() => setAccepted(true)}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="rounded-b-xl bg-secondary p-5 sm:p-8 text-center">
          <p className="font-display text-sm italic text-gold">
            &quot;Let&apos;s create something amazing&quot;
          </p>
          <div className="mt-4 space-y-0.5 text-xs text-secondary-foreground/70">
            <p>{ownerSettings?.business_name || "Carolina Balloons"}</p>
            <p>Charlotte, NC</p>
            <p>{ownerSettings?.email || "carolinaballoons.com"}</p>
          </div>
        </div>
      </div>

      <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
