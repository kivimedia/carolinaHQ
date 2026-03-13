'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Wand2, CheckCircle2, Image as ImageIcon, Download, Square } from "lucide-react";
import { Button } from "@/components/ui-shadcn/button";
import { Badge } from "@/components/ui-shadcn/badge";
import { toast } from "sonner";
import { useBgRemoval } from "@/contexts/BackgroundRemovalContext";
import type { DbProduct, DbProductImage } from "@/hooks/fun/use-products";

interface MediaImage extends DbProductImage {
  nobg_url: string | null;
  product_name: string;
  product_id: string;
}

function getAllMedia(products: DbProduct[]): MediaImage[] {
  const media: MediaImage[] = [];
  for (const p of products) {
    for (const img of p.images) {
      media.push({
        ...img,
        nobg_url: (img as any).nobg_url || null,
        product_name: p.name,
        product_id: p.id,
      });
    }
  }
  return media;
}

export default function MediaLibrary({ products }: { products: DbProduct[] }) {
  const allMedia = getAllMedia(products);
  const bgRemoval = useBgRemoval();

  // Track which images are showing the no-bg version (keyed by image id)
  const [showNoBg, setShowNoBg] = useState<Record<string, boolean>>({});

  const withoutBg = allMedia.filter((m) => !m.nobg_url);
  const withBg = allMedia.filter((m) => m.nobg_url);

  const handleRemoveAllBackgrounds = () => {
    const toProcess = allMedia.filter((m) => !m.nobg_url);
    bgRemoval.startProcessing(
      toProcess.map((m) => ({ id: m.id, image_url: m.image_url, product_name: m.product_name }))
    );
  };

  const toggleView = (imageId: string) => {
    setShowNoBg((prev) => ({ ...prev, [imageId]: !prev[imageId] }));
  };

  const downloadAll = async (type: "original" | "nobg") => {
    const images = type === "nobg"
      ? allMedia.filter((m) => m.nobg_url).map((m) => ({ url: m.nobg_url!, name: `${m.product_name}-nobg` }))
      : allMedia.map((m) => ({ url: m.image_url, name: m.product_name }));

    if (images.length === 0) {
      toast.error("No images to download");
      return;
    }

    toast(`Downloading ${images.length} images...`);

    for (let i = 0; i < images.length; i++) {
      try {
        const response = await fetch(images[i].url);
        const blob = await response.blob();
        const ext = type === "nobg" ? "png" : images[i].url.split(".").pop()?.split("?")[0] || "jpg";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${images[i].name}-${i + 1}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        if (i < images.length - 1) await new Promise((r) => setTimeout(r, 300));
      } catch {
        console.error(`Failed to download ${images[i].name}`);
      }
    }
  };

  if (allMedia.length === 0) {
    return (
      <div className="py-16 text-center">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/30" />
        <p className="mt-4 text-sm text-muted-foreground">
          No media yet. Upload images to your products first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {allMedia.length} images - {withBg.length} with background removed - {withoutBg.length} pending
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => downloadAll("original")}
            disabled={allMedia.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Download Originals ({allMedia.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => downloadAll("nobg")}
            disabled={withBg.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Download No-BG ({withBg.length})
          </Button>
          {bgRemoval.isProcessing ? (
            <Button
              onClick={bgRemoval.stopProcessing}
              size="sm"
              variant="destructive"
              className="gap-1.5 text-xs"
            >
              <Square className="h-3.5 w-3.5" />
              Stop Processing ({bgRemoval.processedCount}/{bgRemoval.totalCount})
            </Button>
          ) : withoutBg.length === 0 ? (
            <Button disabled size="sm" className="gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All Backgrounds Removed
            </Button>
          ) : (
            <Button
              onClick={handleRemoveAllBackgrounds}
              size="sm"
              className="gap-1.5 text-xs"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {withBg.length > 0
                ? `Remove Remaining ${withoutBg.length} Background${withoutBg.length !== 1 ? "s" : ""}`
                : `Remove All Backgrounds (${withoutBg.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Prompt banner when some are already processed but more remain */}
      {withBg.length > 0 && withoutBg.length > 0 && !bgRemoval.isProcessing && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Wand2 className="h-5 w-5 text-primary shrink-0" />
          <p className="flex-1 text-sm text-foreground">
            <span className="font-medium">{withBg.length} image{withBg.length !== 1 ? "s" : ""}</span> already processed.{" "}
            You have <span className="font-medium">{withoutBg.length} more</span> to go. Want to remove those?
          </p>
          <Button size="sm" className="gap-1.5 text-xs shrink-0" onClick={handleRemoveAllBackgrounds}>
            <Wand2 className="h-3.5 w-3.5" />
            Remove {withoutBg.length} Background{withoutBg.length !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      {/* Media Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {allMedia.map((img, i) => {
            const isShowingNoBg = showNoBg[img.id] && img.nobg_url;
            const isBeingProcessed = bgRemoval.isProcessing && bgRemoval.currentImageName === img.product_name;
            const displayUrl = isShowingNoBg ? img.nobg_url! : img.image_url;

            return (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card group overflow-hidden"
              >
                {/* Image with checkerboard bg when showing no-bg */}
                <div
                  className={`relative aspect-square overflow-hidden ${
                    isShowingNoBg ? "bg-checkerboard" : "bg-muted"
                  }`}
                >
                  <img
                    src={displayUrl}
                    alt={img.product_name}
                    className="h-full w-full object-contain"
                  />

                  {/* Processing overlay */}
                  {isBeingProcessed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
                        <span className="text-xs font-medium text-primary-foreground">Removing background...</span>
                      </div>
                    </div>
                  )}

                  {/* Toggle arrows for images with nobg */}
                  {img.nobg_url && !isBeingProcessed && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-foreground/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => toggleView(img.id)}
                        className="flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-card"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        {isShowingNoBg ? "Original" : "No Background"}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {img.nobg_url ? (
                      <Badge className="gap-1 bg-primary/90 text-primary-foreground text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Processed
                      </Badge>
                    ) : !isBeingProcessed ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Original
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-foreground">{img.product_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isShowingNoBg ? "No background" : "Original"} - {img.is_primary ? "Primary" : `#${img.display_order + 1}`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
