'use client';

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

export type ImageDisplayMode = "regular" | "medium" | "xl" | "gallery";
export type GalleryLayout = "grid" | "stacked" | "masonry";

interface GalleryImage {
  url: string;
  label?: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  layout: GalleryLayout;
  onImageClick: (url: string) => void;
}

export function ImageGallery({ images, layout, onImageClick }: ImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="p-6">
      <h4 className="mb-4 font-display text-sm font-semibold text-primary uppercase">Gallery</h4>
      {layout === "grid" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img, i) => (
            <div
              key={i}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/40"
              onClick={() => onImageClick(img.url)}
            >
              <img src={img.url} alt={img.label || ""} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              {img.label && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] font-medium text-white truncate">{img.label}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {layout === "stacked" && (
        <div className="space-y-4">
          {images.map((img, i) => (
            <div
              key={i}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/40"
              onClick={() => onImageClick(img.url)}
            >
              <img src={img.url} alt={img.label || ""} className="w-full object-cover transition-transform group-hover:scale-[1.02]" />
              {img.label && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-xs font-medium text-white">{img.label}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {layout === "masonry" && (
        <div className="columns-2 gap-3 sm:columns-3">
          {images.map((img, i) => (
            <div
              key={i}
              className="group relative mb-3 break-inside-avoid cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/40"
              onClick={() => onImageClick(img.url)}
            >
              <img src={img.url} alt={img.label || ""} className="w-full object-cover transition-transform group-hover:scale-105" />
              {img.label && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[10px] font-medium text-white truncate">{img.label}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders a line item image based on display mode */
export function LineItemImage({
  imageUrl,
  productName,
  mode,
  onImageClick,
}: {
  imageUrl: string | null | undefined;
  productName: string;
  mode: ImageDisplayMode;
  onImageClick: (url: string) => void;
}) {
  if (!imageUrl || mode === "gallery") return null;

  if (mode === "regular") {
    return (
      <div
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
        onClick={() => onImageClick(imageUrl)}
      >
        <img src={imageUrl} alt={productName} className="h-full w-full object-cover" />
      </div>
    );
  }

  if (mode === "medium") {
    return (
      <div
        className="mb-2 w-[45%] cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm hover:ring-2 hover:ring-primary/40 transition-all"
        onClick={() => onImageClick(imageUrl)}
      >
        <img src={imageUrl} alt={productName} className="w-full object-cover" />
      </div>
    );
  }

  // xl
  return (
    <div
      className="mb-3 w-full cursor-pointer overflow-hidden rounded-xl border border-border shadow-sm hover:ring-2 hover:ring-primary/40 transition-all"
      onClick={() => onImageClick(imageUrl)}
    >
      <img src={imageUrl} alt={productName} className="w-full object-cover" />
    </div>
  );
}

/** Lightbox overlay component */
export function Lightbox({ image, onClose }: { image: string | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-h-[85vh] max-w-[85vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={image}
              alt=""
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={onClose}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground shadow-lg transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
