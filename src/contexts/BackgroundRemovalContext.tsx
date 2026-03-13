'use client';

import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BgRemovalState {
  isProcessing: boolean;
  totalCount: number;
  processedCount: number;
  currentImageName: string | null;
}

interface BgRemovalContextType extends BgRemovalState {
  startProcessing: (images: Array<{ id: string; image_url: string; product_name: string }>) => void;
  stopProcessing: () => void;
}

const BgRemovalContext = createContext<BgRemovalContextType | null>(null);

export function useBgRemoval() {
  const ctx = useContext(BgRemovalContext);
  if (!ctx) throw new Error("useBgRemoval must be used within BgRemovalProvider");
  return ctx;
}

export function BgRemovalProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<BgRemovalState>({
    isProcessing: false,
    totalCount: 0,
    processedCount: 0,
    currentImageName: null,
  });
  const abortRef = useRef(false);

  const startProcessing = useCallback(
    (images: Array<{ id: string; image_url: string; product_name: string }>) => {
      if (state.isProcessing) return;
      if (images.length === 0) {
        toast("All done! All images already have background removed.");
        return;
      }

      abortRef.current = false;
      setState({
        isProcessing: true,
        totalCount: images.length,
        processedCount: 0,
        currentImageName: images[0].product_name,
      });

      // Run async processing
      (async () => {
        const supabase = createBrowserSupabaseClient();
        let processed = 0;
        for (const img of images) {
          if (abortRef.current) break;

          setState((s) => ({ ...s, currentImageName: img.product_name }));

          try {
            const { data, error } = await supabase.functions.invoke("remove-background", {
              body: { imageId: img.id, imageUrl: img.image_url },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
            processed++;
            setState((s) => ({ ...s, processedCount: processed }));
          } catch (err: any) {
            console.error(`Failed to process ${img.id}:`, err);
            toast.error(`Failed: ${img.product_name} - ${err.message || "Background removal failed"}`);
          }

          // Rate limit delay
          if (!abortRef.current) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        setState({
          isProcessing: false,
          totalCount: 0,
          processedCount: 0,
          currentImageName: null,
        });

        queryClient.invalidateQueries({ queryKey: ["products"] });

        if (abortRef.current) {
          toast(`Background removal stopped. Processed ${processed} of ${images.length} images.`);
        } else {
          toast.success(`Background removal complete! All ${images.length} images processed.`);
        }
      })();
    },
    [state.isProcessing, queryClient]
  );

  const stopProcessing = useCallback(() => {
    abortRef.current = true;
  }, []);

  return (
    <BgRemovalContext.Provider value={{ ...state, startProcessing, stopProcessing }}>
      {children}
    </BgRemovalContext.Provider>
  );
}
