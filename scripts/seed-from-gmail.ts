/**
 * seed-from-gmail.ts
 *
 * Scans the proposals-export/ folder (306 client folders, 1,135 emails)
 * and seeds the CarolinaHQ proposal system with:
 * - Products (extracted from email mentions)
 * - Templates (grouped by event type)
 * - Option packages (common product combos)
 * - Past proposals (linked to cards)
 * - Pricing rules & user settings
 *
 * Usage: npx tsx scripts/seed-from-gmail.ts
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 * Optional: ANTHROPIC_API_KEY for AI-powered extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const EXPORT_DIR = path.resolve(__dirname, '../proposals-export');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// TYPES
// ============================================================================

interface CardContext {
  card_id: string;
  title: string;
  board: string;
  list: string;
  event_type: string | null;
  event_date: string | null;
  venue: string | null;
  estimated_value: number | null;
  phone: string | null;
  description_snippet: string | null;
}

interface EmailMeta {
  subject: string;
  from: string;
  to: string;
  date: string;
  body_text: string;
  labels: string[];
}

interface ExtractedProposal {
  client_name: string;
  client_email: string;
  client_phone: string;
  event_type: string;
  event_date: string | null;
  venue: string;
  products_mentioned: string[];
  estimated_total: number;
  outcome: 'accepted' | 'rejected' | 'unknown';
  card_id: string;
  description: string;
}

// ============================================================================
// KNOWN PRODUCTS (pattern-matched from Halley's business)
// ============================================================================

const PRODUCT_CATALOG = [
  { name: 'Balloon Arch', category: 'Arches', base_price: 250, sizes: [{ name: 'Half Arch (6ft)', price: 175 }, { name: 'Full Arch (8ft)', price: 250 }, { name: 'Grand Arch (10ft+)', price: 350 }] },
  { name: 'Balloon Garland', category: 'Garlands', base_price: 200, sizes: [{ name: 'Small (4-6ft)', price: 125 }, { name: 'Medium (8-10ft)', price: 200 }, { name: 'Large (12-15ft)', price: 300 }, { name: 'Extra Large (20ft+)', price: 450 }] },
  { name: 'Balloon Column', category: 'Columns', base_price: 75, sizes: [{ name: 'Standard (5ft)', price: 75 }, { name: 'Tall (7ft)', price: 95 }] },
  { name: 'Balloon Wall', category: 'Walls', base_price: 400, sizes: [{ name: 'Half Wall (4x8)', price: 400 }, { name: 'Full Wall (8x8)', price: 600 }] },
  { name: 'Organic Balloon Cluster', category: 'Accents', base_price: 50, sizes: [{ name: 'Small (12 balloons)', price: 50 }, { name: 'Large (25 balloons)', price: 85 }] },
  { name: 'Centerpiece', category: 'Table Decor', base_price: 35, sizes: [{ name: 'Simple', price: 35 }, { name: 'Elaborate', price: 65 }] },
  { name: 'Marquee Numbers/Letters', category: 'Marquee', base_price: 75, sizes: [{ name: 'Single Character (4ft)', price: 75 }, { name: 'Single Character (3ft)', price: 50 }] },
  { name: 'Balloon Bouquet', category: 'Bouquets', base_price: 25, sizes: [{ name: 'Small (5 balloons)', price: 25 }, { name: 'Large (10 balloons)', price: 45 }] },
  { name: 'Confetti Balloons', category: 'Specialty', base_price: 8, sizes: [{ name: 'Each', price: 8 }] },
  { name: 'Backdrop Frame', category: 'Backdrops', base_price: 150, sizes: [{ name: 'Standard (6x6)', price: 150 }, { name: 'Large (8x8)', price: 200 }] },
  { name: 'Number/Letter Balloon', category: 'Foils', base_price: 12, sizes: [{ name: '16 inch', price: 8 }, { name: '34 inch', price: 12 }, { name: '40 inch', price: 18 }] },
  { name: 'Balloon Ceiling Installation', category: 'Installations', base_price: 350, sizes: [{ name: 'Partial Ceiling', price: 350 }, { name: 'Full Ceiling', price: 600 }] },
  { name: 'Balloon Drop (Net)', category: 'Special Effects', base_price: 200, sizes: [{ name: '100 balloons', price: 200 }, { name: '200 balloons', price: 350 }] },
  { name: 'Tassel Garland', category: 'Accents', base_price: 45, sizes: [{ name: 'Standard (6ft)', price: 45 }] },
  { name: 'Photo Frame Balloon', category: 'Photo Props', base_price: 125, sizes: [{ name: 'Standard', price: 125 }] },
];

// Event type mapping from card descriptions/boards
const EVENT_TYPE_PATTERNS: Record<string, RegExp[]> = {
  birthday: [/birthday/i, /bday/i, /\d+(st|nd|rd|th)\s*(bday|birthday)/i, /turning\s+\d+/i],
  wedding: [/wedding/i, /bridal/i, /bride/i, /groom/i, /reception/i, /rehearsal dinner/i],
  baby_shower: [/baby\s*shower/i, /gender\s*reveal/i, /baby/i, /expecting/i, /maternity/i],
  graduation: [/graduation/i, /grad\s*party/i, /graduating/i, /commencement/i],
  corporate: [/corporate/i, /company/i, /office/i, /conference/i, /gala/i, /fundrais/i, /annual\s*meeting/i, /employee/i, /brand/i, /launch/i],
  sweet_16: [/sweet\s*16/i, /quinceanera/i, /quinceañera/i, /sweet\s*sixteen/i],
  anniversary: [/anniversary/i],
  holiday: [/christmas/i, /halloween/i, /thanksgiving/i, /valentines/i, /easter/i, /new\s*years?/i, /4th\s*of\s*july/i],
  engagement: [/engagement/i, /engaged/i, /proposal/i],
  other: [],
};

// ============================================================================
// HELPERS
// ============================================================================

function detectEventType(text: string): string {
  for (const [eventType, patterns] of Object.entries(EVENT_TYPE_PATTERNS)) {
    if (eventType === 'other') continue;
    for (const pattern of patterns) {
      if (pattern.test(text)) return eventType;
    }
  }
  return 'other';
}

function detectProducts(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  const productPatterns: [string, RegExp][] = [
    ['Balloon Arch', /arch/i],
    ['Balloon Garland', /garland/i],
    ['Balloon Column', /column/i],
    ['Balloon Wall', /balloon\s*wall/i],
    ['Organic Balloon Cluster', /cluster|organic/i],
    ['Centerpiece', /centerpiece/i],
    ['Marquee Numbers/Letters', /marquee|marquee\s*(number|letter)/i],
    ['Balloon Bouquet', /bouquet/i],
    ['Confetti Balloons', /confetti/i],
    ['Backdrop Frame', /backdrop/i],
    ['Number/Letter Balloon', /number\s*balloon|letter\s*balloon|foil\s*number/i],
    ['Balloon Ceiling Installation', /ceiling/i],
    ['Balloon Drop (Net)', /balloon\s*drop|drop\s*net/i],
    ['Tassel Garland', /tassel/i],
    ['Photo Frame Balloon', /photo\s*frame/i],
  ];

  for (const [name, pattern] of productPatterns) {
    if (pattern.test(lowerText) && !found.includes(name)) {
      found.push(name);
    }
  }

  return found;
}

function listToOutcome(listName: string): 'accepted' | 'rejected' | 'unknown' {
  const lower = listName.toLowerCase();
  if (lower.includes('paid') || lower.includes('booked') || lower.includes('done') || lower.includes('completed')) return 'accepted';
  if (lower.includes("didn't book") || lower.includes('lost') || lower.includes('no response') || lower.includes('declined')) return 'rejected';
  return 'unknown';
}

function extractClientName(title: string): string {
  // Card titles are usually "ClientName MM/DD/YYYY"
  return title.replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/, '').trim() || 'Unknown Client';
}

function estimateTotal(products: string[]): number {
  let total = 0;
  for (const name of products) {
    const product = PRODUCT_CATALOG.find((p) => p.name === name);
    if (product) total += product.base_price;
  }
  return total || 300; // Minimum $300
}

// ============================================================================
// SCAN ALL CLIENT FOLDERS
// ============================================================================

function scanExportDir(): ExtractedProposal[] {
  const proposals: ExtractedProposal[] = [];
  const dirs = fs.readdirSync(EXPORT_DIR).filter((d) => {
    const full = path.join(EXPORT_DIR, d);
    return fs.statSync(full).isDirectory() && !d.startsWith('_');
  });

  console.log(`Scanning ${dirs.length} client folders...`);

  for (const dir of dirs) {
    const dirPath = path.join(EXPORT_DIR, dir);
    const contextFile = path.join(dirPath, '_card_context.json');

    if (!fs.existsSync(contextFile)) continue;

    try {
      const cards: CardContext[] = JSON.parse(fs.readFileSync(contextFile, 'utf-8'));
      if (!cards || cards.length === 0) continue;

      const card = cards[0]; // Primary card

      // Read email body files for product extraction
      const files = fs.readdirSync(dirPath);
      const bodyFiles = files.filter((f) => f.endsWith('_body.html'));
      const emailFiles = files.filter((f) => f.endsWith('.json') && f !== '_card_context.json');

      let allText = card.description_snippet || '';
      let clientEmail = '';

      // Extract text from email bodies
      for (const bodyFile of bodyFiles) {
        try {
          const html = fs.readFileSync(path.join(dirPath, bodyFile), 'utf-8');
          // Strip HTML tags for text extraction
          const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          allText += ' ' + text;
        } catch {
          // Skip unreadable files
        }
      }

      // Get client email from first email metadata
      if (emailFiles.length > 0) {
        try {
          const emailMeta: EmailMeta = JSON.parse(
            fs.readFileSync(path.join(dirPath, emailFiles[0]), 'utf-8')
          );
          // The "to" field is the client email (Halley sends to them)
          if (emailMeta.from?.includes('halley@carolinaballoons.com') || emailMeta.from?.includes('carolina')) {
            clientEmail = emailMeta.to || '';
          } else {
            clientEmail = emailMeta.from?.match(/<([^>]+)>/)?.[1] || emailMeta.from || '';
          }
        } catch {
          // Use folder name as email hint
          clientEmail = dir.replace(/_/g, '.').replace(/\.com$/, '@com').replace(/_gmail$/, '@gmail') || '';
        }
      }

      // Detect event type
      const eventType = card.event_type || detectEventType(allText);

      // Detect products mentioned
      const products = detectProducts(allText);

      // Determine outcome from list name
      const outcome = listToOutcome(card.list);

      proposals.push({
        client_name: extractClientName(card.title),
        client_email: clientEmail,
        client_phone: card.phone || '',
        event_type: eventType,
        event_date: card.event_date ? card.event_date.split('T')[0] : null,
        venue: card.venue || '',
        products_mentioned: products,
        estimated_total: card.estimated_value || estimateTotal(products),
        outcome,
        card_id: card.card_id,
        description: (card.description_snippet || '').slice(0, 500),
      });
    } catch (err) {
      console.error(`Error processing ${dir}:`, err);
    }
  }

  return proposals;
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedProducts(): Promise<Map<string, string>> {
  console.log('\n--- Seeding Products ---');
  const productIdMap = new Map<string, string>();

  for (const product of PRODUCT_CATALOG) {
    // Check if product already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', product.name)
      .limit(1)
      .single();

    if (existing) {
      productIdMap.set(product.name, existing.id);
      console.log(`  [exists] ${product.name} -> ${existing.id}`);
      continue;
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        category: product.category,
        base_price: product.base_price,
        sizes: product.sizes,
        description: `${product.category} balloon decor piece for events.`,
        is_active: true,
        display_order: PRODUCT_CATALOG.indexOf(product),
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  [error] ${product.name}: ${error.message}`);
    } else {
      productIdMap.set(product.name, data.id);
      console.log(`  [created] ${product.name} -> ${data.id}`);
    }
  }

  console.log(`Seeded ${productIdMap.size} products.`);
  return productIdMap;
}

async function seedTemplates(productIdMap: Map<string, string>): Promise<void> {
  console.log('\n--- Seeding Templates ---');

  const templates = [
    {
      name: 'Birthday Party Standard',
      description: 'Classic birthday party package with arch and centerpieces.',
      event_types: ['birthday'],
      default_delivery_fee: 50,
      default_notes: 'Standard delivery and setup included. Setup begins 2 hours before event.',
      default_personal_note: "I'm so excited to help make your birthday celebration truly special!",
      default_line_items: [
        { product_name: 'Balloon Arch', selected_size: 'Full Arch (8ft)', quantity: 1, unit_price: 250 },
        { product_name: 'Centerpiece', selected_size: 'Simple', quantity: 4, unit_price: 35 },
        { product_name: 'Balloon Bouquet', selected_size: 'Small (5 balloons)', quantity: 2, unit_price: 25 },
      ],
    },
    {
      name: 'Birthday Party Premium',
      description: 'Premium birthday with arch, garland, marquee and more.',
      event_types: ['birthday'],
      default_delivery_fee: 50,
      default_notes: 'Premium package includes setup/teardown and custom color matching.',
      default_personal_note: "Let's make this birthday unforgettable!",
      default_line_items: [
        { product_name: 'Balloon Arch', selected_size: 'Grand Arch (10ft+)', quantity: 1, unit_price: 350 },
        { product_name: 'Balloon Garland', selected_size: 'Medium (8-10ft)', quantity: 1, unit_price: 200 },
        { product_name: 'Marquee Numbers/Letters', selected_size: 'Single Character (4ft)', quantity: 2, unit_price: 75 },
        { product_name: 'Centerpiece', selected_size: 'Elaborate', quantity: 6, unit_price: 65 },
      ],
    },
    {
      name: 'Wedding Celebration',
      description: 'Elegant wedding balloon decor package.',
      event_types: ['wedding', 'engagement'],
      default_delivery_fee: 75,
      default_notes: 'White-glove setup included. Can coordinate with florist and venue decorator.',
      default_personal_note: "Congratulations! I'd love to help make your special day even more magical.",
      default_line_items: [
        { product_name: 'Balloon Arch', selected_size: 'Grand Arch (10ft+)', quantity: 1, unit_price: 350 },
        { product_name: 'Balloon Garland', selected_size: 'Large (12-15ft)', quantity: 2, unit_price: 300 },
        { product_name: 'Balloon Column', selected_size: 'Tall (7ft)', quantity: 4, unit_price: 95 },
        { product_name: 'Organic Balloon Cluster', selected_size: 'Large (25 balloons)', quantity: 3, unit_price: 85 },
      ],
    },
    {
      name: 'Baby Shower',
      description: 'Adorable baby shower balloon setup.',
      event_types: ['baby_shower'],
      default_delivery_fee: 50,
      default_notes: 'Gender reveal option available with confetti balloons. Colors can be customized.',
      default_personal_note: 'How exciting! Baby showers are one of my favorite events to decorate.',
      default_line_items: [
        { product_name: 'Balloon Arch', selected_size: 'Full Arch (8ft)', quantity: 1, unit_price: 250 },
        { product_name: 'Balloon Garland', selected_size: 'Small (4-6ft)', quantity: 1, unit_price: 125 },
        { product_name: 'Centerpiece', selected_size: 'Elaborate', quantity: 4, unit_price: 65 },
        { product_name: 'Confetti Balloons', selected_size: 'Each', quantity: 10, unit_price: 8 },
      ],
    },
    {
      name: 'Graduation Party',
      description: 'Celebration package for graduates.',
      event_types: ['graduation'],
      default_delivery_fee: 50,
      default_notes: 'School colors matching available. Marquee letters can spell name or year.',
      default_personal_note: 'Congratulations on this amazing achievement!',
      default_line_items: [
        { product_name: 'Balloon Arch', selected_size: 'Full Arch (8ft)', quantity: 1, unit_price: 250 },
        { product_name: 'Marquee Numbers/Letters', selected_size: 'Single Character (4ft)', quantity: 4, unit_price: 75 },
        { product_name: 'Balloon Bouquet', selected_size: 'Large (10 balloons)', quantity: 3, unit_price: 45 },
      ],
    },
    {
      name: 'Corporate Event',
      description: 'Professional corporate event balloon decor.',
      event_types: ['corporate'],
      default_delivery_fee: 75,
      default_notes: 'Brand color matching and logo incorporation available. W-9 on file.',
      default_personal_note: "I'd love to help make your corporate event stand out!",
      default_line_items: [
        { product_name: 'Balloon Arch', selected_size: 'Grand Arch (10ft+)', quantity: 1, unit_price: 350 },
        { product_name: 'Balloon Column', selected_size: 'Tall (7ft)', quantity: 6, unit_price: 95 },
        { product_name: 'Backdrop Frame', selected_size: 'Large (8x8)', quantity: 1, unit_price: 200 },
        { product_name: 'Organic Balloon Cluster', selected_size: 'Large (25 balloons)', quantity: 4, unit_price: 85 },
      ],
    },
    {
      name: 'Sweet 16 / Quinceanera',
      description: 'Special milestone birthday celebration.',
      event_types: ['sweet_16'],
      default_delivery_fee: 50,
      default_notes: 'Includes custom color palette. Photo props available as add-on.',
      default_personal_note: 'This is such a special milestone - let me help make it unforgettable!',
      default_line_items: [
        { product_name: 'Balloon Arch', selected_size: 'Grand Arch (10ft+)', quantity: 1, unit_price: 350 },
        { product_name: 'Balloon Wall', selected_size: 'Half Wall (4x8)', quantity: 1, unit_price: 400 },
        { product_name: 'Number/Letter Balloon', selected_size: '40 inch', quantity: 2, unit_price: 18 },
        { product_name: 'Centerpiece', selected_size: 'Elaborate', quantity: 8, unit_price: 65 },
      ],
    },
  ];

  for (const template of templates) {
    const { data: existing } = await supabase
      .from('proposal_templates')
      .select('id')
      .eq('name', template.name)
      .limit(1)
      .single();

    if (existing) {
      console.log(`  [exists] ${template.name}`);
      continue;
    }

    // Enrich line items with product IDs
    const lineItems = template.default_line_items.map((item) => ({
      ...item,
      product_id: productIdMap.get(item.product_name) || null,
    }));

    const { error } = await supabase.from('proposal_templates').insert({
      name: template.name,
      description: template.description,
      event_types: template.event_types,
      default_delivery_fee: template.default_delivery_fee,
      default_notes: template.default_notes,
      default_personal_note: template.default_personal_note,
      default_line_items: lineItems,
    });

    if (error) {
      console.error(`  [error] ${template.name}: ${error.message}`);
    } else {
      console.log(`  [created] ${template.name}`);
    }
  }
}

async function seedOptions(productIdMap: Map<string, string>): Promise<void> {
  console.log('\n--- Seeding Option Packages ---');

  const options = [
    {
      name: 'Birthday Essentials',
      description: 'Arch + centerpieces + bouquets - perfect for any birthday party.',
      items: [
        { product_name: 'Balloon Arch', selected_size: 'Full Arch (8ft)', quantity: 1, unit_price: 250 },
        { product_name: 'Centerpiece', selected_size: 'Simple', quantity: 4, unit_price: 35 },
        { product_name: 'Balloon Bouquet', selected_size: 'Small (5 balloons)', quantity: 2, unit_price: 25 },
      ],
    },
    {
      name: 'Statement Entrance',
      description: 'Grand arch with columns for a dramatic entrance.',
      items: [
        { product_name: 'Balloon Arch', selected_size: 'Grand Arch (10ft+)', quantity: 1, unit_price: 350 },
        { product_name: 'Balloon Column', selected_size: 'Tall (7ft)', quantity: 2, unit_price: 95 },
      ],
    },
    {
      name: 'Photo Zone Package',
      description: 'Backdrop + garland + photo frame for Instagram-worthy photos.',
      items: [
        { product_name: 'Backdrop Frame', selected_size: 'Large (8x8)', quantity: 1, unit_price: 200 },
        { product_name: 'Balloon Garland', selected_size: 'Medium (8-10ft)', quantity: 1, unit_price: 200 },
        { product_name: 'Photo Frame Balloon', selected_size: 'Standard', quantity: 1, unit_price: 125 },
      ],
    },
    {
      name: 'Table Decor Bundle',
      description: '8 elegant centerpieces for a fully decorated reception.',
      items: [
        { product_name: 'Centerpiece', selected_size: 'Elaborate', quantity: 8, unit_price: 65 },
      ],
    },
    {
      name: 'Marquee Spelling Package',
      description: '4 marquee letters/numbers to spell a name or year.',
      items: [
        { product_name: 'Marquee Numbers/Letters', selected_size: 'Single Character (4ft)', quantity: 4, unit_price: 75 },
      ],
    },
    {
      name: 'Full Room Transform',
      description: 'Complete room decoration with ceiling, walls, and accents.',
      items: [
        { product_name: 'Balloon Ceiling Installation', selected_size: 'Partial Ceiling', quantity: 1, unit_price: 350 },
        { product_name: 'Balloon Wall', selected_size: 'Half Wall (4x8)', quantity: 1, unit_price: 400 },
        { product_name: 'Organic Balloon Cluster', selected_size: 'Large (25 balloons)', quantity: 4, unit_price: 85 },
        { product_name: 'Balloon Garland', selected_size: 'Large (12-15ft)', quantity: 2, unit_price: 300 },
      ],
    },
  ];

  // Get Halley's user ID
  const { data: halley } = await supabase
    .from('profiles')
    .select('id')
    .or('email.eq.halley@carolinaballoons.com,display_name.ilike.%halley%')
    .limit(1)
    .single();

  const userId = halley?.id || null;

  for (const option of options) {
    const { data: existing } = await supabase
      .from('proposal_options')
      .select('id')
      .eq('name', option.name)
      .limit(1)
      .single();

    if (existing) {
      console.log(`  [exists] ${option.name}`);
      continue;
    }

    const displayPrice = option.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    const { data: opt, error } = await supabase
      .from('proposal_options')
      .insert({
        name: option.name,
        description: option.description,
        display_price: displayPrice,
        user_id: userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  [error] ${option.name}: ${error.message}`);
      continue;
    }

    // Insert items
    await supabase.from('proposal_option_items').insert(
      option.items.map((item, i) => ({
        option_id: opt.id,
        product_id: productIdMap.get(item.product_name) || null,
        product_name: item.product_name,
        selected_size: item.selected_size,
        selected_color: 'Custom',
        quantity: item.quantity,
        unit_price: item.unit_price,
        display_order: i,
      }))
    );

    console.log(`  [created] ${option.name} ($${displayPrice})`);
  }
}

async function seedProposals(
  proposals: ExtractedProposal[],
  productIdMap: Map<string, string>
): Promise<void> {
  console.log(`\n--- Seeding ${proposals.length} Past Proposals ---`);

  // Get Halley's user ID
  const { data: halley } = await supabase
    .from('profiles')
    .select('id')
    .or('email.eq.halley@carolinaballoons.com,display_name.ilike.%halley%')
    .limit(1)
    .single();

  const userId = halley?.id || null;
  let created = 0;
  let skipped = 0;

  for (const proposal of proposals) {
    // Skip proposals with no product mentions (not enough data)
    if (proposal.products_mentioned.length === 0 && proposal.estimated_total <= 300) {
      skipped++;
      continue;
    }

    // Check if proposal already exists for this card
    const { data: existing } = await supabase
      .from('proposals')
      .select('id')
      .eq('card_id', proposal.card_id)
      .limit(1)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    const lineItems = proposal.products_mentioned.map((productName) => {
      const product = PRODUCT_CATALOG.find((p) => p.name === productName);
      return {
        product_id: productIdMap.get(productName) || null,
        product_name: productName,
        selected_size: product?.sizes?.[0]?.name || '',
        selected_color: 'Custom',
        quantity: 1,
        unit_price: product?.base_price || 100,
        display_order: proposal.products_mentioned.indexOf(productName),
      };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const deliveryFee = 50;
    const total = subtotal + deliveryFee;

    const status = proposal.outcome === 'accepted' ? 'accepted'
      : proposal.outcome === 'rejected' ? 'rejected'
      : 'sent';

    const { data: newProposal, error } = await supabase
      .from('proposals')
      .insert({
        user_id: userId,
        card_id: proposal.card_id,
        client_name: proposal.client_name,
        client_email: proposal.client_email,
        client_phone: proposal.client_phone,
        event_type: proposal.event_type,
        event_date: proposal.event_date,
        venue: proposal.venue,
        notes: proposal.description,
        delivery_fee: deliveryFee,
        subtotal,
        total,
        status,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`  [error] ${proposal.client_name}: ${error.message}`);
      continue;
    }

    // Insert line items
    if (lineItems.length > 0) {
      await supabase.from('proposal_line_items').insert(
        lineItems.map((item) => ({
          ...item,
          proposal_id: newProposal.id,
        }))
      );
    }

    // Record outcome for learning
    if (proposal.outcome !== 'unknown') {
      await supabase.from('proposal_outcomes').insert({
        proposal_id: newProposal.id,
        outcome: proposal.outcome,
        user_id: userId,
      });
    }

    // Update card's latest_proposal_id
    await supabase
      .from('cards')
      .update({ latest_proposal_id: newProposal.id })
      .eq('id', proposal.card_id);

    created++;

    if (created % 50 === 0) {
      console.log(`  ... processed ${created} proposals`);
    }
  }

  console.log(`Created ${created} proposals, skipped ${skipped}.`);
}

async function seedPricingRules(): Promise<void> {
  console.log('\n--- Seeding Pricing Rules ---');

  const rules = [
    { name: 'Delivery Fee', rule_type: 'delivery', notes: 'Standard delivery and setup fee.', conditions: {}, value: 50 },
    { name: 'Minimum Order', rule_type: 'minimum', notes: 'Minimum order amount.', conditions: {}, value: 300 },
    { name: 'Weekend Surcharge', rule_type: 'surcharge', notes: '15% surcharge for Saturday/Sunday events.', conditions: { day_of_week: ['saturday', 'sunday'] }, value: 15, formula: 'percentage' },
    { name: 'Rush Order Surcharge', rule_type: 'surcharge', notes: '20% surcharge for events booked less than 7 days out.', conditions: { days_notice_max: 7 }, value: 20, formula: 'percentage' },
  ];

  for (const rule of rules) {
    const { data: existing } = await supabase
      .from('pricing_rules')
      .select('id')
      .eq('name', rule.name)
      .limit(1)
      .single();

    if (existing) {
      console.log(`  [exists] ${rule.name}`);
      continue;
    }

    const { error } = await supabase.from('pricing_rules').insert(rule);
    if (error) {
      console.error(`  [error] ${rule.name}: ${error.message}`);
    } else {
      console.log(`  [created] ${rule.name}`);
    }
  }
}

async function seedUserSettings(): Promise<void> {
  console.log('\n--- Seeding User Settings ---');

  // Get Halley's user ID
  const { data: halley } = await supabase
    .from('profiles')
    .select('id')
    .or('email.eq.halley@carolinaballoons.com,display_name.ilike.%halley%')
    .limit(1)
    .single();

  if (!halley) {
    console.log('  [skip] Halley user not found - will seed when she logs in.');
    return;
  }

  const { data: existing } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', halley.id)
    .limit(1)
    .single();

  if (existing) {
    console.log('  [exists] Halley settings already exist.');
    return;
  }

  const { error } = await supabase.from('user_settings').insert({
    user_id: halley.id,
    business_name: 'Carolina Balloons and Confetti',
    business_email: 'halley@carolinaballoons.com',
    business_phone: '(336) 566-7612',
    website: 'https://www.carolinaballoons.com',
    default_delivery_fee: 50,
    weekend_surcharge_pct: 15,
    rush_surcharge_pct: 20,
    rush_days_threshold: 7,
    minimum_order: 300,
    ai_master_prompt: `You are Halley's AI assistant for Carolina Balloons and Confetti, a premium balloon decor business based in the Triad area of North Carolina. Halley's style is warm, enthusiastic, and professional. She loves making every event special with creative balloon designs. She often uses exclamation points and emoji sparingly. She signs emails with "Excited to work with you!" or "Can't wait to bring your celebration to life!" Common products include balloon arches, garlands, columns, centerpieces, marquee numbers/letters, walls, and backdrop frames. Standard delivery fee is $50. Weekend events have a 15% surcharge. Rush orders (less than 7 days) have a 20% surcharge. Minimum order is $300.`,
  });

  if (error) {
    console.error(`  [error] ${error.message}`);
  } else {
    console.log('  [created] Halley user settings');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== CarolinaHQ Proposal Data Seeder ===\n');

  // Step 1: Scan export directory
  const proposals = scanExportDir();
  console.log(`Found ${proposals.length} proposals from ${EXPORT_DIR}`);

  // Stats
  const byEvent: Record<string, number> = {};
  const byOutcome: Record<string, number> = {};
  const allProducts: Record<string, number> = {};

  for (const p of proposals) {
    byEvent[p.event_type] = (byEvent[p.event_type] || 0) + 1;
    byOutcome[p.outcome] = (byOutcome[p.outcome] || 0) + 1;
    for (const prod of p.products_mentioned) {
      allProducts[prod] = (allProducts[prod] || 0) + 1;
    }
  }

  console.log('\nEvent types:', byEvent);
  console.log('Outcomes:', byOutcome);
  console.log('Products found:', allProducts);

  // Step 2: Seed products
  const productIdMap = await seedProducts();

  // Step 3: Seed templates
  await seedTemplates(productIdMap);

  // Step 4: Seed option packages
  await seedOptions(productIdMap);

  // Step 5: Seed pricing rules
  await seedPricingRules();

  // Step 6: Seed user settings
  await seedUserSettings();

  // Step 7: Seed past proposals
  await seedProposals(proposals, productIdMap);

  console.log('\n=== Seeding complete! ===');
}

main().catch(console.error);
