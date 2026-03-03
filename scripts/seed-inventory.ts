/**
 * Seed inventory from Excel file: "marquee letter inventory.xlsx"
 *
 * Usage: npx tsx scripts/seed-inventory.ts
 *
 * Creates 2 top-level categories (Regular Marquee Letters, LED Letters)
 * with subcategories (Letters, Numbers, Symbols, Minis, Extras, Frames)
 * and imports 97 items with quantities and auto-generated SKUs.
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Parse .env.local manually (no dotenv dependency)
const envPath = require('path').resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach((line: string) => {
  const match = line.match(/^([A-Z_]+)=["']?(.+?)["']?$/);
  if (match) envVars[match[1]] = match[2];
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EXCEL_PATH = 'C:/Users/raviv/Downloads/marquee letter inventory.xlsx';

interface ExcelRow {
  Type: string;
  Character: string | number;
  'Quantity Owned': number;
}

function generateSku(isLed: boolean, subcategory: string, character: string): string {
  const prefix = isLed ? 'LED' : 'RML';
  const charClean = String(character).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sub = subcategory === 'Letters' ? '' :
    subcategory === 'Numbers' ? 'N' :
    subcategory === 'Symbols' ? 'SYM' :
    subcategory === 'Minis' ? 'MINI' :
    subcategory === 'Extras' ? 'EXT' :
    subcategory === 'Frames' ? 'FRM' : '';

  return `${prefix}-${sub ? sub + '-' : ''}${charClean || 'X'}`;
}

// Helper: find or create a category by name (+ optional parent_id)
async function findOrCreateCategory(name: string, parentId?: string): Promise<string> {
  // Try to find existing
  let query = supabase.from('inventory_categories').select('id').eq('name', name);
  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }
  const { data: existing } = await query.maybeSingle();
  if (existing) return existing.id;

  // Create new
  const insert: Record<string, any> = { name };
  if (parentId) insert.parent_id = parentId;
  const { data: created, error } = await supabase
    .from('inventory_categories')
    .insert(insert)
    .select('id')
    .single();
  if (error) throw new Error(`Failed creating category "${name}": ${error.message}`);
  return created.id;
}

async function main() {
  console.log('Reading Excel file...');
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<ExcelRow>(ws, { defval: '' });
  console.log(`Found ${rawData.length} rows`);

  // Create top-level categories
  console.log('Creating categories...');
  const regularCatId = await findOrCreateCategory('Regular Marquee Letters');
  const ledCatId = await findOrCreateCategory('LED Letters');

  // Create subcategories under Regular
  const subcategoryNames = ['Letters', 'Numbers', 'Symbols', 'Minis', 'Extras', 'Frames'];
  const subcategories: Record<string, Record<string, string>> = { regular: {}, led: {} };

  for (let i = 0; i < subcategoryNames.length; i++) {
    const name = subcategoryNames[i];
    subcategories.regular[name] = await findOrCreateCategory(name, regularCatId);
  }

  // LED subcategories (only Letters and Numbers)
  const ledSubcats = ['LED Letters Sub', 'LED Numbers'];
  const ledSubNames = ['Letters', 'Numbers'];
  for (let i = 0; i < ledSubNames.length; i++) {
    subcategories.led[ledSubNames[i]] = await findOrCreateCategory(ledSubcats[i], ledCatId);
  }

  console.log('Categories created');

  // Parse items - handle the "Type" column that carries forward
  let currentType = '';
  let isLedSection = false;
  const items: { name: string; sku: string; qty: number; categoryId: string; subCategoryId?: string; isLed: boolean; subcategory: string }[] = [];
  const skuSet = new Set<string>();

  for (const row of rawData) {
    const type = String(row.Type).trim();
    const character = String(row.Character).trim();
    const qty = Number(row['Quantity Owned']) || 0;

    if (type === 'LED Letters') {
      isLedSection = true;
      currentType = '';
      continue; // This is just a section header
    }

    if (type) currentType = type;
    if (!character) continue;

    const subcategory = currentType || 'Letters';
    let categoryId: string;
    let subCategoryId: string | undefined;

    if (isLedSection) {
      categoryId = ledCatId;
      const isNumber = /^\d+$/.test(character);
      subCategoryId = subcategories.led[isNumber ? 'Numbers' : 'Letters'];
    } else {
      categoryId = regularCatId;
      subCategoryId = subcategories.regular[subcategory];
    }

    const displayName = isLedSection ? `LED ${character}` : character;
    const sku = generateSku(isLedSection, isLedSection ? (/^\d+$/.test(character) ? 'Numbers' : 'Letters') : subcategory, character);

    // Ensure unique SKU
    let suffix = 1;
    let finalSku = sku;
    while (skuSet.has(finalSku)) {
      finalSku = `${sku}-${suffix++}`;
    }
    skuSet.add(finalSku);

    items.push({
      name: displayName,
      sku: finalSku,
      qty,
      categoryId,
      subCategoryId,
      isLed: isLedSection,
      subcategory,
    });
  }

  console.log(`Parsed ${items.length} items to import`);

  // Insert items using actual DB schema columns:
  // name, sku, quantity, category_id, sub_category_id, item_type, rate, status
  let imported = 0;
  let errors = 0;

  for (const item of items) {
    const row: Record<string, any> = {
      name: item.name,
      sku: item.sku,
      quantity: item.qty,
      available_quantity: item.qty,
      category_id: item.categoryId,
      item_type: 'product',
      rate: 0, // Owner sets pricing later
      status: 'active',
    };
    if (item.subCategoryId) row.sub_category_id = item.subCategoryId;

    const { error } = await supabase.from('inventory_items').insert(row);

    if (error) {
      console.error(`  Error importing "${item.name}" (${item.sku}):`, error.message);
      errors++;
    } else {
      imported++;
    }
  }

  console.log('\n--- Import Complete ---');
  console.log(`Imported: ${imported} items`);
  console.log(`Errors: ${errors}`);
  console.log(`Categories: ${Object.keys(subcategories.regular).length + Object.keys(subcategories.led).length + 2} (2 top-level + subcategories)`);
}

main().catch(console.error);
