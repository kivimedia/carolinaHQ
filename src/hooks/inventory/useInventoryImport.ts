'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ColumnMapping } from '@/lib/import/columnMapping';

interface ImportRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function useInventoryImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rows,
      mappings,
      categoryId,
    }: {
      rows: ImportRow[];
      mappings: ColumnMapping[];
      categoryId?: string;
    }): Promise<ImportResult> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const mappingLookup: Record<string, string> = {};
      mappings.forEach((m) => {
        if (m.targetField) mappingLookup[m.csvHeader] = m.targetField;
      });

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const mapped: Record<string, string> = {};
        Object.entries(row).forEach(([key, val]) => {
          const target = mappingLookup[key];
          if (target) mapped[target] = val;
        });

        if (!mapped.name?.trim()) {
          skipped++;
          continue;
        }

        const item: Record<string, any> = {
          name: mapped.name.trim(),
          user_id: user.id,
          type: 'individual',
          is_active: true,
        };

        if (mapped.sku) item.sku = mapped.sku.trim();
        if (mapped.quantity_owned) item.quantity_owned = parseInt(mapped.quantity_owned) || 0;
        if (mapped.rental_rate) item.rental_rate = parseFloat(mapped.rental_rate) || 0;
        if (mapped.replacement_cost) item.replacement_cost = parseFloat(mapped.replacement_cost) || 0;
        if (mapped.notes) item.notes = mapped.notes;
        if (mapped.dimensions) item.dimensions = mapped.dimensions;
        if (mapped.weight) item.weight = mapped.weight;
        if (mapped.color) item.color = mapped.color;
        if (mapped.condition) item.condition = mapped.condition;
        if (categoryId) item.category_id = categoryId;

        const { error } = await supabase.from('inventory_items').insert(item);
        if (error) {
          errors.push(`Row ${i + 1} (${mapped.name}): ${error.message}`);
        } else {
          imported++;
        }
      }

      return { imported, skipped, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_categories'] });
      toast.success(`Imported ${result.imported} items${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}`);
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} errors during import`);
      }
    },
    onError: (err: any) => toast.error(`Import failed: ${err.message}`),
  });
}
