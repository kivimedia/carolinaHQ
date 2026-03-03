export interface ColumnMapping {
  csvHeader: string;
  targetField: string;
  confidence: 'exact' | 'alias' | 'suggested' | 'unmapped';
}

interface ColumnAlias {
  target: string;
  aliases: string[];
}

const INVENTORY_COLUMN_ALIASES: ColumnAlias[] = [
  { target: 'name', aliases: ['item name', 'item', 'product', 'product name', 'title', 'description', 'item description'] },
  { target: 'sku', aliases: ['sku', 'item code', 'code', 'product code', 'part number', 'part #'] },
  { target: 'category', aliases: ['category', 'cat', 'type', 'item type', 'group'] },
  { target: 'subcategory', aliases: ['subcategory', 'sub category', 'sub-category', 'subcat'] },
  { target: 'quantity_owned', aliases: ['quantity', 'qty', 'stock', 'on hand', 'quantity owned', 'total quantity', 'count', 'inventory count'] },
  { target: 'rental_rate', aliases: ['rate', 'price', 'rental rate', 'rental price', 'unit price', 'cost', 'amount'] },
  { target: 'replacement_cost', aliases: ['replacement cost', 'replacement', 'replace cost', 'value', 'item value'] },
  { target: 'notes', aliases: ['notes', 'note', 'comments', 'comment', 'remarks', 'memo'] },
  { target: 'dimensions', aliases: ['dimensions', 'size', 'measurements', 'dimension'] },
  { target: 'weight', aliases: ['weight', 'wt'] },
  { target: 'color', aliases: ['color', 'colour'] },
  { target: 'condition', aliases: ['condition', 'status'] },
];

function normalize(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export function autoMapColumns(csvHeaders: string[]): ColumnMapping[] {
  return csvHeaders.map((header) => {
    const norm = normalize(header);

    // Exact match on target name
    const exactMatch = INVENTORY_COLUMN_ALIASES.find((a) => normalize(a.target) === norm);
    if (exactMatch) {
      return { csvHeader: header, targetField: exactMatch.target, confidence: 'exact' as const };
    }

    // Alias match
    const aliasMatch = INVENTORY_COLUMN_ALIASES.find((a) =>
      a.aliases.some((alias) => normalize(alias) === norm)
    );
    if (aliasMatch) {
      return { csvHeader: header, targetField: aliasMatch.target, confidence: 'alias' as const };
    }

    // Fuzzy: check if any alias contains the normalized header or vice versa
    const fuzzyMatch = INVENTORY_COLUMN_ALIASES.find((a) =>
      a.aliases.some((alias) => {
        const normAlias = normalize(alias);
        return normAlias.includes(norm) || norm.includes(normAlias);
      })
    );
    if (fuzzyMatch) {
      return { csvHeader: header, targetField: fuzzyMatch.target, confidence: 'suggested' as const };
    }

    return { csvHeader: header, targetField: '', confidence: 'unmapped' as const };
  });
}

export const TARGET_FIELDS = INVENTORY_COLUMN_ALIASES.map((a) => a.target);

export function getMissingRequired(mappings: ColumnMapping[]): string[] {
  const mapped = new Set(mappings.filter(m => m.targetField).map(m => m.targetField));
  const required = ['name'];
  return required.filter((r) => !mapped.has(r));
}
