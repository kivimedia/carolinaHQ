'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export interface DbProductSize {
  name: string;
  price: number;
}

export interface DbProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  nobg_url: string | null;
}

export interface DbProduct {
  id: string;
  name: string;
  category: string;
  description: string | null;
  proposal_description: string | null;
  sizes: DbProductSize[];
  base_price: number;
  price_modifiers: Array<{ name: string; amount: number }>;
  color_presets: string[];
  setup_time_minutes: number;
  historical_frequency: number;
  historical_conversion_rate: number;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  images: DbProductImage[];
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<DbProduct[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images!left(id, image_url, is_primary, display_order, nobg_url)')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      return (data || []).map((p: any) => {
        const allImages: DbProductImage[] = (p.product_images || [])
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((img: any) => ({
            id: img.id,
            image_url: img.image_url,
            is_primary: img.is_primary || false,
            display_order: img.display_order || 0,
            nobg_url: img.nobg_url || null,
          }));

        const primaryImage = allImages.find((img) => img.is_primary);

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          proposal_description: p.proposal_description,
          sizes: (p.sizes as unknown as DbProductSize[] | null) || [],
          base_price: p.base_price || 0,
          price_modifiers: (p.price_modifiers as Array<{ name: string; amount: number }> | null) || [],
          color_presets: (p.color_presets as string[] | null) || [],
          setup_time_minutes: p.setup_time_minutes || 30,
          historical_frequency: p.historical_frequency || 0,
          historical_conversion_rate: p.historical_conversion_rate || 0,
          is_active: p.is_active ?? true,
          display_order: p.display_order || 0,
          image_url: primaryImage?.image_url || allImages[0]?.image_url || null,
          images: allImages,
        };
      });
    },
  });
}

export function useProductCategories(products: DbProduct[]) {
  return Array.from(new Set(products.map((p) => p.category)));
}
