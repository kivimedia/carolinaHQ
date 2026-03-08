/**
 * Update product catalog with image URLs from CarolinaBalloons.com
 * Images sourced from WooCommerce Store API product listings.
 * Idempotent - safe to re-run.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lrxzmpyhekthnaucjsbv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapping: product name in our catalog -> best matching image from carolinaballoons.com
const IMAGE_MAP: Record<string, string> = {
  'Standard Balloon Arch (10ft)':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/organic-arch-transparent.png',
  'Half Balloon Arch':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/organic-demi-arch-sample.png',
  'Heart-Shaped Balloon Arch':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/Organic-arch-with-blocks-1-300x300-1.png',
  'Balloon Wall':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/balloon-wall-v2-min-2.webp',
  'Balloon Backdrop':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/photoframe-v2-300x300-1.webp',
  'Balloon Garland':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/organic-GARLAND.png',
  'Marquee Letters (4-letter set)':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/Year-columns-v2-300x300-1.png',
  'Marquee Numbers (per digit)':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/columns-with-age-2_5_11zon.png',
  'Table Centerpieces':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/centerpiece-1.png',
  'Balloon Columns (pair)':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/Classic-Column-Spiral.png',
  'Balloon Bouquet (5pc)':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/Bouquet-5-balloons.png',
  'Banner':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/yard-art-sample_11zon.png',
  'Balloon Drop':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/topper-combo-v2-300x300-1.png',
  'Balloon Towers':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/twisted-column-with-topper.png',
  'Photo Op Setup':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/Organic-with-streamers-2.webp',
  'Custom Balloon Decor Package':
    'https://carolinaballoons.com/wp-content/uploads/2023/07/linked-arch-v2-300x300-1.png',
};

async function main() {
  console.log('=== Updating Product Images ===\n');

  let updated = 0;
  let errors = 0;

  for (const [name, imageUrl] of Object.entries(IMAGE_MAP)) {
    const { data, error } = await supabase
      .from('product_catalog')
      .update({ image_url: imageUrl })
      .eq('name', name)
      .select('id, name');

    if (error) {
      console.error(`  ERROR updating "${name}": ${error.message}`);
      errors++;
    } else if (data && data.length > 0) {
      console.log(`  Updated: ${name}`);
      updated++;
    } else {
      console.log(`  Not found: ${name} (skipped)`);
    }
  }

  console.log(`\nDone! ${updated} updated, ${errors} errors`);
}

main().catch(console.error);
