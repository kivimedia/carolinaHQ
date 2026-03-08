/**
 * Seed product catalog and pricing rules from proposal-patterns.md analysis.
 * Idempotent - safe to re-run (upserts by name).
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lrxzmpyhekthnaucjsbv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ProductSeed {
  name: string;
  category: string;
  base_price: number;
  notes: string;
  size_variants: { size: string; price: number }[];
  frequency_count: number;
}

const PRODUCTS: ProductSeed[] = [
  {
    name: 'Standard Balloon Arch (10ft)',
    category: 'arch',
    base_price: 350,
    notes: 'Most popular product. Organic or classic style. ~80 balloons.',
    size_variants: [
      { size: 'Small (4-5ft)', price: 200 },
      { size: 'Standard (8ft)', price: 300 },
      { size: 'Large (10ft)', price: 350 },
      { size: 'Extra Large (12ft+)', price: 450 },
    ],
    frequency_count: 47,
  },
  {
    name: 'Half Balloon Arch',
    category: 'arch',
    base_price: 200,
    notes: 'Smaller footprint, great for doorways and entrances.',
    size_variants: [],
    frequency_count: 2,
  },
  {
    name: 'Heart-Shaped Balloon Arch',
    category: 'arch',
    base_price: 400,
    notes: 'Custom shape. Popular for weddings and anniversaries.',
    size_variants: [],
    frequency_count: 1,
  },
  {
    name: 'Balloon Wall',
    category: 'wall',
    base_price: 500,
    notes: 'Photo backdrop. Common for birthdays and sweet 16.',
    size_variants: [
      { size: '5x3 ft', price: 350 },
      { size: '7x4 ft', price: 500 },
      { size: '8x8 ft', price: 700 },
    ],
    frequency_count: 8,
  },
  {
    name: 'Balloon Backdrop',
    category: 'wall',
    base_price: 400,
    notes: 'Generic backdrop option. Photography-focused.',
    size_variants: [],
    frequency_count: 7,
  },
  {
    name: 'Balloon Garland',
    category: 'garland',
    base_price: 250,
    notes: 'Price varies by length. Multi-item arrangement.',
    size_variants: [
      { size: '6ft', price: 150 },
      { size: '10ft', price: 250 },
      { size: '15ft', price: 375 },
      { size: '20ft', price: 500 },
    ],
    frequency_count: 7,
  },
  {
    name: 'Marquee Letters (4-letter set)',
    category: 'marquee_letter',
    base_price: 300,
    notes: 'Second most popular. Often numbers (16, 40, 70). LED illuminated.',
    size_variants: [
      { size: '3ft letters', price: 250 },
      { size: '4ft letters', price: 300 },
    ],
    frequency_count: 48,
  },
  {
    name: 'Marquee Numbers (per digit)',
    category: 'marquee_letter',
    base_price: 75,
    notes: 'Individual number digits. Common for milestone birthdays.',
    size_variants: [],
    frequency_count: 20,
  },
  {
    name: 'Table Centerpieces',
    category: 'centerpiece',
    base_price: 35,
    notes: 'Per table. Balloon-based centerpiece arrangements.',
    size_variants: [],
    frequency_count: 8,
  },
  {
    name: 'Balloon Columns (pair)',
    category: 'column',
    base_price: 150,
    notes: 'Vertical architectural elements. Sold as pair.',
    size_variants: [
      { size: '3ft columns', price: 120 },
      { size: '4ft columns', price: 150 },
      { size: '5ft columns', price: 180 },
    ],
    frequency_count: 11,
  },
  {
    name: 'Balloon Bouquet (5pc)',
    category: 'bouquet',
    base_price: 40,
    notes: '5 latex balloons per bouquet. Can include foil stars.',
    size_variants: [],
    frequency_count: 8,
  },
  {
    name: 'Banner',
    category: 'banner',
    base_price: 100,
    notes: 'Text-based decor element. Custom messaging.',
    size_variants: [],
    frequency_count: 4,
  },
  {
    name: 'Balloon Drop',
    category: 'other',
    base_price: 200,
    notes: 'Surprise/reveal element. Net or bag release.',
    size_variants: [],
    frequency_count: 3,
  },
  {
    name: 'Balloon Towers',
    category: 'column',
    base_price: 120,
    notes: 'Variant column form, freestanding.',
    size_variants: [],
    frequency_count: 2,
  },
  {
    name: 'Photo Op Setup',
    category: 'other',
    base_price: 250,
    notes: 'Photography setup with balloon elements. Content creator focused.',
    size_variants: [],
    frequency_count: 1,
  },
  {
    name: 'Custom Balloon Decor Package',
    category: 'other',
    base_price: 500,
    notes: 'Custom package for complex or unusual requests. Price varies.',
    size_variants: [],
    frequency_count: 10,
  },
];

interface PricingRuleSeed {
  name: string;
  rule_type: string;
  conditions: Record<string, unknown>;
  value: number;
  priority: number;
  notes: string;
}

const PRICING_RULES: PricingRuleSeed[] = [
  {
    name: 'Minimum Order - Standard',
    rule_type: 'minimum_charge',
    conditions: {},
    value: 300,
    priority: 10,
    notes: 'Minimum $300 for all event types. Based on proposal-patterns.md data.',
  },
  {
    name: 'Mileage Surcharge - Regional (Durham/Raleigh)',
    rule_type: 'mileage_surcharge',
    conditions: { cities: ['Durham', 'Raleigh', 'Greenville', 'Ridgeland'] },
    value: 75,
    priority: 5,
    notes: 'Regional delivery 30-50 miles. $75 surcharge.',
  },
  {
    name: 'Local Delivery Fee - Charlotte',
    rule_type: 'mileage_surcharge',
    conditions: { cities: ['Charlotte', 'Concord', 'Huntersville', 'Matthews'] },
    value: 25,
    priority: 1,
    notes: 'Local delivery within Charlotte metro. $25.',
  },
];

async function main() {
  console.log('=== Seeding CarolinaHQ Product Catalog ===\n');

  // Seed products
  let inserted = 0;
  let skipped = 0;

  for (const product of PRODUCTS) {
    const { data: existing } = await supabase
      .from('product_catalog')
      .select('id')
      .eq('name', product.name)
      .maybeSingle();

    if (existing) {
      console.log(`  Skip (exists): ${product.name}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from('product_catalog').insert({
      name: product.name,
      category: product.category,
      base_price: product.base_price,
      notes: product.notes,
      size_variants: product.size_variants,
      frequency_count: product.frequency_count,
      is_active: true,
    });

    if (error) {
      console.error(`  ERROR inserting ${product.name}: ${error.message}`);
    } else {
      console.log(`  Inserted: ${product.name} ($${product.base_price})`);
      inserted++;
    }
  }

  console.log(`\nProducts: ${inserted} inserted, ${skipped} skipped\n`);

  // Seed pricing rules
  let rulesInserted = 0;
  let rulesSkipped = 0;

  for (const rule of PRICING_RULES) {
    const { data: existing } = await supabase
      .from('pricing_rules')
      .select('id')
      .eq('name', rule.name)
      .maybeSingle();

    if (existing) {
      console.log(`  Skip rule (exists): ${rule.name}`);
      rulesSkipped++;
      continue;
    }

    const { error } = await supabase.from('pricing_rules').insert({
      name: rule.name,
      rule_type: rule.rule_type,
      conditions: rule.conditions,
      value: rule.value,
      priority: rule.priority,
      notes: rule.notes,
      is_active: true,
    });

    if (error) {
      console.error(`  ERROR inserting rule ${rule.name}: ${error.message}`);
    } else {
      console.log(`  Inserted rule: ${rule.name} ($${rule.value})`);
      rulesInserted++;
    }
  }

  console.log(`\nPricing rules: ${rulesInserted} inserted, ${rulesSkipped} skipped`);
  console.log('\nDone!');
}

main().catch(console.error);
