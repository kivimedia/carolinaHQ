'use client';

import { useState } from "react";
import { format } from "date-fns";
import { Smartphone, Tablet, Monitor, Link2, Check, ExternalLink, Package, X } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { toast } from "@/hooks/fun/use-toast";
import { BuilderProposalData } from "@/components/fun-proposals/FunProposalBuilder";
import { useUserSettings } from "@/hooks/fun/use-user-settings";
import { AnimatePresence, motion } from "framer-motion";
import { ImageGallery, LineItemImage, Lightbox } from "@/components/fun-proposals/proposal/ImageGallery";
import type { ImageDisplayMode, GalleryLayout } from "@/components/fun-proposals/proposal/ImageGallery";

const PREVIEW_SIZES = [
  { id: "mobile", label: "Mobile", icon: Smartphone, panelSize: 25 },
  { id: "tablet", label: "Tablet", icon: Tablet, panelSize: 40 },
  { id: "desktop", label: "Desktop", icon: Monitor, panelSize: 55 },
] as const;

interface SurchargeEntry {
  label: string;
  amount: number;
  enabled: boolean;
}

interface Props {
  proposal: BuilderProposalData;
  subtotal: number;
  total: number;
  surcharges: SurchargeEntry[];
  proposalId?: string;
  onResizePreview?: (panelSize: number) => void;
  onSave?: () => Promise<string | undefined>;
}

export default function ProposalPreview({ proposal, subtotal, total, surcharges, proposalId, onResizePreview, onSave }: Props) {
  const [previewSize, setPreviewSize] = useState<string>("mobile");
  const [copied, setCopied] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { data: settings } = useUserSettings();
  const itemLabel = settings?.item_label || "designs";

  const formattedDate = proposal.eventDate
    ? format(new Date(proposal.eventDate + "T00:00:00"), "MMMM d, yyyy")
    : "TBD";

  const proposalUrl = proposalId
    ? `${window.location.origin}/p/${proposalId}`
    : null;

  const handleCopyLink = async () => {
    let url = proposalUrl;
    if (!url && onSave) {
      const newId = await onSave();
      if (newId) {
        url = `${window.location.origin}/p/${newId}`;
      }
    }
    if (!url) {
      toast({ title: "Save first", description: "Save the proposal as a draft to get a shareable link.", variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copied!", description: "Proposal link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    if (proposalUrl) window.open(proposalUrl, "_blank");
  };

  const hasLineItems = proposal.lineItems.length > 0;
  const hasOptions = (proposal.options || []).length > 0;
  const hasContent = hasLineItems || hasOptions;

  return (
    <div className="flex h-full flex-col bg-muted/50">
      {/* Header with size controls + link */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2.5">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</h2>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border bg-muted p-0.5">
            {PREVIEW_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => {
                  setPreviewSize(size.id);
                  onResizePreview?.(size.panelSize);
                }}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
                  previewSize === size.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={size.label}
              >
                <size.icon className="h-3 w-3" />
                <span className="hidden xl:inline">{size.label}</span>
              </button>
            ))}
          </div>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={handleCopyLink}>
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Link2 className="h-3 w-3" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          {proposalId && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleOpenLink} title="Open in new tab">
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto w-full rounded-xl bg-card shadow-xl ring-1 ring-border transition-all duration-300">
          {/* Cover Page */}
          <div className="p-8 text-center">
            {settings?.logo_url ? (
              <div className="mx-auto mb-4 flex h-14 w-auto items-center justify-center">
                <img src={settings.logo_url} alt="Business logo" className="max-h-full max-w-[200px] object-contain" />
              </div>
            ) : (
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <span className="font-display text-lg font-bold text-primary-foreground">CB</span>
              </div>
            )}
            <div className="gold-divider mb-6" />
            <h3 className="font-display text-2xl font-bold tracking-wide text-primary">PROPOSAL</h3>
            <p className="mt-4 text-sm text-muted-foreground">Prepared for</p>
            <p className="font-display text-xl font-semibold text-foreground">
              {proposal.clientName || "Client Name"}
            </p>
            {proposal.clientLogoUrl && (
              <div className="mt-3 flex justify-center">
                <img src={proposal.clientLogoUrl} alt="Client logo" className="max-h-10 max-w-[150px] object-contain" />
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {proposal.eventType || "Event"} · {formattedDate}
            </p>
            <div className="gold-divider my-6" />
            <p className="font-display text-xs italic text-gold">&quot;Turning your vision into reality - Carolina HQ&quot;</p>
          </div>

          <div className="gold-divider" />

          {/* Event Details */}
          <div className="p-6">
            <h4 className="mb-3 font-display text-sm font-semibold text-primary">YOUR EVENT</h4>
            <div className="space-y-2 rounded-lg bg-blush p-4 text-xs">
              {proposal.eventType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event Type</span>
                  <span className="font-medium text-foreground">{proposal.eventType}</span>
                </div>
              )}
              {proposal.eventDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">{formattedDate}</span>
                </div>
              )}
              {proposal.venue && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium text-foreground">{proposal.venue}</span>
                </div>
              )}
              {proposal.startTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Time</span>
                  <span className="font-medium text-foreground">{proposal.startTime}</span>
                </div>
              )}
              {proposal.guests && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. Guests</span>
                  <span className="font-medium text-foreground">{proposal.guests}</span>
                </div>
              )}
              {proposal.colorTheme && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color Theme</span>
                  <span className="font-medium text-foreground">{proposal.colorTheme}</span>
                </div>
              )}
            </div>

            {proposal.personalNote && (
              <>
                <h4 className="mb-2 mt-6 font-display text-sm font-semibold text-primary">A NOTE FOR YOU</h4>
                <div className="rounded-lg bg-blush p-4">
                  <p className="text-xs italic leading-relaxed text-foreground">&quot;{proposal.personalNote}&quot;</p>
                </div>
              </>
            )}
          </div>

          <div className="gold-divider" />

          {/* Individual Line Items */}
          {hasLineItems && (
            <div className="p-6">
              <h4 className="mb-4 font-display text-sm font-semibold text-primary uppercase">Your {itemLabel}</h4>
              <div className="space-y-4">
                {proposal.lineItems.map((item, i) => {
                  const displayImage = (item.images && item.images.length > 0) ? item.images[0] : item.product.image_url;
                  const imgMode = proposal.imageDisplayMode || "regular";
                  return (
                    <div key={item.id}>
                      {/* XL or Medium: image above */}
                      {(imgMode === "xl" || imgMode === "medium") && (
                        <LineItemImage
                          imageUrl={displayImage}
                          productName={item.product.name}
                          mode={imgMode}
                          onImageClick={setLightboxImage}
                        />
                      )}
                      <div className={`flex gap-3 rounded-lg p-3 ${i % 2 === 0 ? "bg-blush" : ""}`}>
                        {/* Regular: inline thumbnail */}
                        {imgMode === "regular" && (
                          <div
                            className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                            onClick={() => displayImage && setLightboxImage(displayImage)}
                          >
                            {displayImage ? (
                              <img src={displayImage} alt={item.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xl">🎈</span>
                            )}
                          </div>
                        )}
                        {/* Gallery mode: no image, show emoji placeholder */}
                        {imgMode === "gallery" && !displayImage && (
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <span className="text-xl">🎈</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-foreground">{item.product.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.selectedSize} · {item.selectedColor}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {item.product.description}
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-xs italic leading-relaxed text-foreground/80">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        {(item.unitPrice * item.quantity) > 0 && (
                          <div className="text-right">
                            <p className="font-mono text-xs font-bold text-foreground">
                              ${(item.unitPrice * item.quantity).toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{item.quantity}x</p>
                          </div>
                        )}
                      </div>
                      {/* Additional images (non-gallery mode) */}
                      {imgMode !== "gallery" && item.images && item.images.length > 1 && (
                        <div className="mt-2 flex gap-2 px-3">
                          {item.images.slice(1).map((img, idx) => (
                            <div
                              key={idx}
                              className="h-10 w-10 rounded-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                              onClick={() => setLightboxImage(img)}
                            >
                              <img src={img} alt="" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gallery Section (when imageDisplayMode === "gallery") */}
          {proposal.imageDisplayMode === "gallery" && hasContent && (() => {
            const lineItemImages = proposal.lineItems
              .flatMap((item) => {
                const imgs = (item.images && item.images.length > 0)
                  ? item.images
                  : item.product.image_url ? [item.product.image_url] : [];
                return imgs.map((url) => ({ url, label: item.product.name }));
              });
            const optionImages = (proposal.options || [])
              .flatMap((option) =>
                option.items
                  .filter((item) => item.product_image)
                  .map((item) => ({ url: item.product_image!, label: item.product_name }))
              );
            const galleryImages = [...lineItemImages, ...optionImages].filter((img) => img.url);
            return galleryImages.length > 0 ? (
              <>
                <div className="gold-divider" />
                <ImageGallery
                  images={galleryImages}
                  layout={proposal.galleryLayout || "grid"}
                  onImageClick={setLightboxImage}
                />
              </>
            ) : null;
          })()}

          {/* Options / Packages */}
          {hasOptions && (() => {
            const imgMode = proposal.imageDisplayMode || "regular";
            return (
              <>
                <div className="gold-divider" />
                <div className="p-6">
                  <h4 className="mb-4 font-display text-sm font-semibold text-primary uppercase">
                    Choose Your Preferred Option
                  </h4>
                  <div className="space-y-4">
                    {proposal.options.map((option) => (
                      <div key={option.id} className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                        {/* Option header */}
                        <div className="flex items-center gap-3 p-4">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground">{option.name}</p>
                            {option.description && (
                              <p className="text-[10px] text-muted-foreground">{option.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-bold text-primary">
                              ${option.display_price.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{option.items.length} {itemLabel}</p>
                          </div>
                        </div>
                        {/* Option items */}
                        <div className="border-t border-primary/10 bg-card/50 px-4 py-3 space-y-3">
                          {option.items.map((item) => (
                            <div key={item.id}>
                              {/* XL or Medium: image above option item */}
                              {(imgMode === "xl" || imgMode === "medium") && item.product_image && (
                                <LineItemImage
                                  imageUrl={item.product_image}
                                  productName={item.product_name}
                                  mode={imgMode}
                                  onImageClick={setLightboxImage}
                                />
                              )}
                              <div className="flex items-center gap-3 text-xs">
                                {/* Regular: small inline thumbnail */}
                                {imgMode === "regular" && (
                                  <div
                                    className="flex h-8 w-8 items-center justify-center rounded-md bg-blush overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
                                    onClick={() => item.product_image && setLightboxImage(item.product_image)}
                                  >
                                    {item.product_image ? (
                                      <img src={item.product_image} alt={item.product_name} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-sm">🎈</span>
                                    )}
                                  </div>
                                )}
                                {/* Gallery mode: no image inline, just emoji if no image */}
                                {imgMode === "gallery" && !item.product_image && (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blush flex-shrink-0">
                                    <span className="text-sm">🎈</span>
                                  </div>
                                )}
                                <span className="flex-1 text-foreground">{item.product_name}</span>
                                {item.selected_size && (
                                  <span className="text-[10px] text-muted-foreground">{item.selected_size}</span>
                                )}
                                {(item.unit_price * item.quantity) > 0 && (
                                  <span className="font-mono text-muted-foreground">
                                    {item.quantity > 1 && `${item.quantity}x `}${item.unit_price.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          <div className="gold-divider" />

          {/* Pricing Summary & Accept */}
          {hasContent && !hasOptions && (
            <div className="p-6">
              <h4 className="mb-3 font-display text-sm font-semibold text-primary">INVESTMENT SUMMARY</h4>
              <div className="space-y-2 text-xs">
                {proposal.lineItems.filter(item => (item.unitPrice * item.quantity) > 0).map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{item.product.name} ({item.selectedSize})</span>
                    <span className="font-mono font-medium text-foreground">
                      ${(item.unitPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="gold-divider my-2" />
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">${subtotal.toLocaleString()}</span>
                </div>
                {surcharges.map((s, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{s.label}</span>
                    <span className="font-mono">+${s.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="gold-divider my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span className="font-display text-foreground">Total</span>
                  <span className="font-mono text-primary">${total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 rounded-lg bg-primary px-4 py-3 text-center">
                <p className="text-xs font-semibold text-primary-foreground">ACCEPT THIS PROPOSAL</p>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                This proposal is valid for 14 days.
              </p>
            </div>
          )}

          {/* Options mode: select an option to accept */}
          {hasOptions && (
            <div className="p-6">
              <p className="text-center text-xs text-muted-foreground mb-4">
                Select your preferred option above, then tap accept.
              </p>
              <div className="rounded-lg bg-primary px-4 py-3 text-center">
                <p className="text-xs font-semibold text-primary-foreground">CHOOSE & ACCEPT</p>
              </div>
              <p className="mt-3 text-center text-[10px] text-muted-foreground">
                This proposal is valid for 14 days.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="rounded-b-xl bg-secondary p-6 text-center">
            <p className="font-display text-xs italic text-gold">&quot;Let&apos;s create something amazing&quot;</p>
            <div className="mt-3 space-y-0.5 text-[10px] text-secondary-foreground/70">
              <p>{settings?.business_name || "Carolina Balloons"}</p>
              <p>Charlotte, NC</p>
              <p>{settings?.email || "carolinaballoons.com"}</p>
            </div>
          </div>
        </div>
      </div>

      <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
