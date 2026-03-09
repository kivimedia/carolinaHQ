/**
 * upload-product-images.ts
 *
 * Uploads Halley's real balloon decor photos from email exports
 * to Supabase storage and links them to products in the DB.
 *
 * Usage: npx tsx scripts/upload-product-images.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const EXPORT_DIR = path.resolve(__dirname, '../proposals-export');

// ============================================================================
// IMAGE MAP: Product name -> best real photo paths from Halley's emails
// Each product gets 1-2 images. First image = primary.
// ============================================================================

const IMAGE_MAP: Record<string, { file: string; label: string }[]> = {
  'Balloon Arch': [
    { file: 'afingerhut_varonis_com/msg2_image004.png', label: 'Winter themed full arch with snowflakes' },
    { file: 'acorey27_yahoo_com/msg1_image.png', label: 'Graduation arch with backdrop' },
  ],
  'Balloon Garland': [
    { file: 'ashley.russell_cblproperties_com/msg4_image.png', label: 'GAYLOR marquee with garland' },
    { file: 'afingerhut_varonis_com/msg2_image007.png', label: 'Football themed garland on backdrop' },
  ],
  'Balloon Column': [
    { file: 'afingerhut_varonis_com/msg2_image002.png', label: 'Blue white branded columns' },
    { file: 'jmclean_oldtownclub_org/msg39_image001.png', label: 'Colorful rainbow columns outdoor' },
  ],
  'Balloon Wall': [
    { file: 'jmclean_oldtownclub_org/msg65_image004.png', label: 'Rainbow themed full room with balloon wall' },
  ],
  'Organic Balloon Cluster': [
    { file: 'charles.d.lee_duke_edu/msg4_image.png', label: 'GO DEACS graduation with organic clusters' },
    { file: 'amandawilson526_gmail_com/msg1_image.png', label: 'VARONIS corporate with organic clusters' },
  ],
  'Centerpiece': [
    { file: 'akonkel_chapelhill-cc_com/msg5_image.png', label: 'Gold black silver gala centerpieces' },
    { file: 'divannyarvizu1230_gmail_com/msg1_image.png', label: 'Black white gala with balloon centerpieces' },
  ],
  'Marquee Numbers/Letters': [
    { file: 'afingerhut_varonis_com/msg2_image005.png', label: 'WORLD FINALS marquee with organic clusters' },
    { file: 'anjie_majortaylorccnc_org/msg1_image.png', label: 'WFU GRAD marquee graduation' },
  ],
  'Balloon Bouquet': [
    { file: 'afingerhut_varonis_com/msg5_image.png', label: 'Blue white balloon columns corporate event' },
  ],
  'Confetti Balloons': [
    { file: 'jgarci29_ncsu_edu/msg14_image.png', label: 'Blue jumbo balloons ceiling with confetti style' },
  ],
  'Backdrop Frame': [
    { file: 'mreed9189_gmail_com/msg8_image002.png', label: 'Baseball themed backdrop with balloon arch' },
    { file: 'mreed9189_gmail_com/msg8_image001.png', label: 'Birthday backdrop with garland and marquee 7' },
  ],
  'Number/Letter Balloon': [
    { file: 'amyhiott_gmail_com/msg2_image.png', label: 'Pink neon marquee 50 with balloon clusters' },
  ],
  'Balloon Ceiling Installation': [
    { file: 'jmclean_oldtownclub_org/msg81_IMG_9264.jpg', label: 'Pink gold ceiling garlands in church' },
    { file: 'jmclean_oldtownclub_org/msg84_image.png', label: 'Christmas ornament ceiling installation' },
  ],
  'Balloon Drop (Net)': [
    { file: 'jmclean_oldtownclub_org/msg65_image006.png', label: 'Convention center with balloon arches and clusters' },
  ],
  'Tassel Garland': [
    { file: 'jmclean_oldtownclub_org/msg39_image.png', label: 'Unicorn columns with tassel garlands' },
  ],
  'Photo Frame Balloon': [
    { file: 'jmclean_oldtownclub_org/msg65_image005.png', label: 'Pink green flower arch tunnel walkway' },
  ],
};

// ============================================================================
// TEMPLATE IMAGE MAP: Template name -> best image path
// ============================================================================

const TEMPLATE_IMAGE_MAP: Record<string, string> = {
  'Birthday Party Standard': 'mreed9189_gmail_com/msg8_image001.png',
  'Birthday Party Premium': 'jmclean_oldtownclub_org/msg65_image004.png',
  'Wedding Celebration': 'jgarci29_ncsu_edu/msg14_image.png',
  'Baby Shower': 'jmclean_oldtownclub_org/msg39_image.png',
  'Graduation Party': 'anjie_majortaylorccnc_org/msg1_image.png',
  'Corporate Event': 'afingerhut_varonis_com/msg5_image.png',
  'Sweet 16 / Quinceanera': 'ashley.russell_cblproperties_com/msg4_image.png',
};

// ============================================================================
// OPTION IMAGE MAP: Option name -> best image path
// ============================================================================

const OPTION_IMAGE_MAP: Record<string, string> = {
  'Birthday Essentials': 'acorey27_yahoo_com/msg1_image.png',
  'Statement Entrance': 'afingerhut_varonis_com/msg2_image002.png',
  'Photo Zone Package': 'mreed9189_gmail_com/msg8_image002.png',
  'Table Decor Bundle': 'akonkel_chapelhill-cc_com/msg5_image.png',
  'Marquee Spelling Package': 'afingerhut_varonis_com/msg2_image005.png',
  'Full Room Transform': 'jmclean_oldtownclub_org/msg81_IMG_9264.jpg',
};

// ============================================================================
// UPLOAD LOGIC
// ============================================================================

async function uploadImage(localPath: string, storagePath: string): Promise<string | null> {
  const fileBuffer = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

  const { error } = await supabase.storage
    .from('product-images')
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error(`  Upload error for ${storagePath}: ${error.message}`);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

async function main() {
  console.log('=== Product Image Uploader ===\n');

  // Step 1: Get all products from DB
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name');

  if (prodErr || !products) {
    console.error('Failed to fetch products:', prodErr?.message);
    return;
  }

  const productMap = new Map(products.map((p) => [p.name, p.id]));
  console.log(`Found ${products.length} products in DB.\n`);

  // Step 2: Upload product images
  console.log('--- Uploading Product Images ---');
  let uploaded = 0;

  for (const [productName, images] of Object.entries(IMAGE_MAP)) {
    const productId = productMap.get(productName);
    if (!productId) {
      console.log(`  [skip] Product not found: ${productName}`);
      continue;
    }

    // Check if product already has images
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('id')
      .eq('product_id', productId)
      .limit(1);

    if (existingImages && existingImages.length > 0) {
      console.log(`  [exists] ${productName} already has images`);
      continue;
    }

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const localPath = path.join(EXPORT_DIR, img.file);

      if (!fs.existsSync(localPath)) {
        console.log(`  [missing] ${img.file}`);
        continue;
      }

      const ext = path.extname(img.file);
      const storagePath = `products/${productId}/${i === 0 ? 'primary' : `alt-${i}`}${ext}`;

      const publicUrl = await uploadImage(localPath, storagePath);
      if (!publicUrl) continue;

      const { error: insertErr } = await supabase.from('product_images').insert({
        product_id: productId,
        image_url: publicUrl,
        is_primary: i === 0,
        display_order: i,
      });

      if (insertErr) {
        console.error(`  [db error] ${productName} img ${i}: ${insertErr.message}`);
      } else {
        uploaded++;
        console.log(`  [uploaded] ${productName} - ${img.label}`);
      }
    }
  }

  console.log(`\nUploaded ${uploaded} product images.`);

  // Step 3: Upload template images
  console.log('\n--- Uploading Template Images ---');
  const { data: templates } = await supabase
    .from('proposal_templates')
    .select('id, name');

  if (templates) {
    for (const template of templates) {
      const imgFile = TEMPLATE_IMAGE_MAP[template.name];
      if (!imgFile) continue;

      // Check if template already has image
      const { data: existing } = await supabase
        .from('proposal_templates')
        .select('image_url')
        .eq('id', template.id)
        .single();

      if (existing?.image_url) {
        console.log(`  [exists] ${template.name}`);
        continue;
      }

      const localPath = path.join(EXPORT_DIR, imgFile);
      if (!fs.existsSync(localPath)) {
        console.log(`  [missing] ${imgFile}`);
        continue;
      }

      const ext = path.extname(imgFile);
      const storagePath = `templates/${template.id}/cover${ext}`;
      const publicUrl = await uploadImage(localPath, storagePath);

      if (publicUrl) {
        // Update template with image_url if column exists, otherwise just log
        const { error: updateErr } = await supabase
          .from('proposal_templates')
          .update({ image_url: publicUrl })
          .eq('id', template.id);

        if (updateErr) {
          // Column might not exist - that's okay, the image is still in storage
          console.log(`  [uploaded to storage] ${template.name} (template table has no image_url column)`);
        } else {
          console.log(`  [uploaded] ${template.name}`);
        }
      }
    }
  }

  // Step 4: Upload option package images
  console.log('\n--- Uploading Option Package Images ---');
  const { data: options } = await supabase
    .from('proposal_options')
    .select('id, name');

  if (options) {
    for (const option of options) {
      const imgFile = OPTION_IMAGE_MAP[option.name];
      if (!imgFile) continue;

      const { data: existing } = await supabase
        .from('proposal_options')
        .select('image_url')
        .eq('id', option.id)
        .single();

      if (existing?.image_url) {
        console.log(`  [exists] ${option.name}`);
        continue;
      }

      const localPath = path.join(EXPORT_DIR, imgFile);
      if (!fs.existsSync(localPath)) {
        console.log(`  [missing] ${imgFile}`);
        continue;
      }

      const ext = path.extname(imgFile);
      const storagePath = `options/${option.id}/cover${ext}`;
      const publicUrl = await uploadImage(localPath, storagePath);

      if (publicUrl) {
        const { error: updateErr } = await supabase
          .from('proposal_options')
          .update({ image_url: publicUrl })
          .eq('id', option.id);

        if (updateErr) {
          console.log(`  [uploaded to storage] ${option.name} (options table has no image_url column)`);
        } else {
          console.log(`  [uploaded] ${option.name}`);
        }
      }
    }
  }

  console.log('\n=== Image upload complete! ===');
}

main().catch(console.error);
