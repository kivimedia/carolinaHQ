/**
 * load-marquee-inventory.ts
 *
 * Loads Halley's real marquee letter inventory from her Excel spreadsheet
 * into CarolinaHQ's marquee system. Replaces seed data with actual quantities
 * and creates bookings for active reservations.
 *
 * Usage: npx tsx scripts/load-marquee-inventory.ts
 */

import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================================
// REAL INVENTORY DATA from Halley's "Working Booked marquee letter inventory.xlsx"
// ============================================================================

// Marquee Letters (4ft) - main set
const MARQUEE_LETTERS: Record<string, number> = {
  A: 3, B: 2, C: 2, D: 2, E: 4, F: 3, G: 2, H: 3, I: 3,
  J: 1, K: 1, L: 3, M: 2, N: 2, O: 3, P: 2, Q: 1, R: 3,
  S: 3, T: 2, U: 3, V: 2, W: 2, X: 1, Y: 1, Z: 1,
  '0': 2, '1': 1, '2': 2, '3': 1, '4': 1, '5': 1, '6': 1, '7': 1, '8': 1, '9': 1,
  '&': 1, '#': 1,
};

// LED Letters (3ft)
const LED_LETTERS: Record<string, number> = {
  A: 4, B: 3, C: 2, D: 2, E: 3, F: 1, G: 2, H: 2, I: 3,
  J: 2, K: 2, L: 3, M: 3, N: 2, O: 3, P: 2, Q: 1, R: 3,
  S: 3, T: 2, U: 1, V: 1, W: 1, X: 1, Y: 1, Z: 1,
  '0': 2, '1': 2, '2': 4, '3': 1, '4': 1, '5': 2, '6': 1, '7': 1, '8': 1, '9': 1,
};

// Minis (small letters/phrases that go with marquee sets)
const MINIS: Record<string, number> = {
  M: 2, R: 2, S: 1, '&': 1, THE: 1, 'CLASS OF': 1,
};

// Extras & Props (special items that enhance marquee displays)
const EXTRAS: Record<string, number> = {
  "'": 2,       // apostrophe
  '#1': 1,
  '#5': 1,
  '#6': 1,
  '!': 1,
  'HEART': 1,
  'RING': 1,
  'WF HAT': 1,  // Wake Forest Hat
  'FLOWER': 1,
  'UNC': 1,     // UNC Symbol
  'GRAD CAP': 1,
  'FRAME': 2,   // Stacking Frame
};

// LED specials
const LED_SPECIALS: Record<string, number> = {
  'GRAD CAP': 1,
  'BASKETBALL': 1,
  'THE MINI': 1,
  'MR MRS': 1,
};

// ============================================================================
// BOOKINGS from the spreadsheet date columns
// ============================================================================

interface BookingData {
  setName: string;
  text: string;
  eventDate: string;
  endDate?: string;
  clientName?: string;
  eventName?: string;
}

const BOOKINGS: BookingData[] = [
  // Marquee bookings
  {
    setName: 'Marquee 4ft',
    text: 'RAMADAN',
    eventDate: '2026-03-18',
    eventName: 'Ramadan Event',
  },
  {
    setName: 'Marquee 4ft',
    text: 'LIGHT THE WAY UNCG',
    eventDate: '2026-03-26',
    eventName: 'Light the Way UNCG',
  },
  // LED bookings
  {
    setName: 'LED 3ft',
    text: '100',
    eventDate: '2026-03-20',
    eventName: '100 Display',
  },
  {
    setName: 'LED 3ft',
    text: 'UNCG',
    eventDate: '2026-03-26',
    eventName: 'UNCG Event',
  },
];

// ============================================================================
// Helper: parse text into letter counts
// ============================================================================

function parseLetters(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const char of text.toUpperCase()) {
    if (/[A-Z0-9&#!/']/.test(char)) {
      counts[char] = (counts[char] || 0) + 1;
    }
  }
  return counts;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== Loading Marquee Inventory from Halley\'s Spreadsheet ===\n');

  // Step 1: Get existing sets
  const { data: existingSets } = await supabase
    .from('marquee_sets')
    .select('id, name');

  const setMap = new Map((existingSets || []).map(s => [s.name, s.id]));
  console.log(`Found ${setMap.size} existing sets: ${Array.from(setMap.keys()).join(', ')}`);

  // Step 2: Clear existing letter data (we're replacing with real quantities)
  console.log('\nClearing existing letter data...');
  for (const setId of Array.from(setMap.values())) {
    await supabase.from('marquee_letters').delete().eq('set_id', setId);
  }

  // Step 3: Clear existing bookings
  await supabase
    .from('marquee_bookings')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared existing bookings.');

  // Step 4: Create/update sets
  const setsToCreate = [
    { name: 'Marquee 4ft', description: 'Classic light-up marquee letters, 4 feet tall', display_order: 0 },
    { name: 'LED 3ft', description: 'LED light-up letters, 3 feet tall', display_order: 1 },
    { name: 'Minis', description: 'Small marquee letters and word pieces (MR, MRS, THE, CLASS OF, etc.)', display_order: 2 },
    { name: 'Extras & Props', description: 'Special shapes, symbols, and prop items (hearts, grad caps, frames, etc.)', display_order: 3 },
  ];

  for (const setDef of setsToCreate) {
    if (!setMap.has(setDef.name)) {
      const { data, error } = await supabase
        .from('marquee_sets')
        .insert(setDef)
        .select('id')
        .single();
      if (error) {
        console.error(`Error creating set ${setDef.name}:`, error.message);
        continue;
      }
      setMap.set(setDef.name, data.id);
      console.log(`Created set: ${setDef.name}`);
    } else {
      // Update description/order
      await supabase
        .from('marquee_sets')
        .update({ description: setDef.description, display_order: setDef.display_order })
        .eq('id', setMap.get(setDef.name)!);
      console.log(`Updated set: ${setDef.name}`);
    }
  }

  // Step 5: Insert letters for each set
  console.log('\n--- Inserting Letters ---');

  const insertLetters = async (setName: string, letters: Record<string, number>) => {
    const setId = setMap.get(setName);
    if (!setId) { console.error(`Set not found: ${setName}`); return; }

    const rows = Object.entries(letters).map(([char, qty]) => ({
      set_id: setId,
      character: char,
      quantity: qty,
      is_active: true,
    }));

    const { error } = await supabase.from('marquee_letters').insert(rows);
    if (error) {
      console.error(`Error inserting letters for ${setName}:`, error.message);
    } else {
      console.log(`  ${setName}: ${rows.length} characters (${rows.reduce((s, r) => s + r.quantity, 0)} total pieces)`);
    }
  };

  await insertLetters('Marquee 4ft', MARQUEE_LETTERS);
  await insertLetters('LED 3ft', { ...LED_LETTERS, ...LED_SPECIALS });
  await insertLetters('Minis', MINIS);
  await insertLetters('Extras & Props', EXTRAS);

  // Step 6: Create bookings
  console.log('\n--- Creating Bookings ---');

  for (const booking of BOOKINGS) {
    const setId = setMap.get(booking.setName);
    if (!setId) { console.error(`Set not found: ${booking.setName}`); continue; }

    const lettersNeeded = parseLetters(booking.text);

    const { error } = await supabase.from('marquee_bookings').insert({
      set_id: setId,
      text: booking.text,
      letters_needed: lettersNeeded,
      event_date: booking.eventDate,
      end_date: booking.endDate || null,
      client_name: booking.clientName || null,
      event_name: booking.eventName || null,
      status: 'reserved',
    });

    if (error) {
      console.error(`Error creating booking "${booking.text}":`, error.message);
    } else {
      const letterSummary = Object.entries(lettersNeeded).map(([k, v]) => `${k}${v > 1 ? 'x' + v : ''}`).join(' ');
      console.log(`  ${booking.eventDate}: "${booking.text}" [${booking.setName}] - ${letterSummary}`);
    }
  }

  // Step 7: Summary
  console.log('\n=== Summary ===');
  const { count: totalLetters } = await supabase
    .from('marquee_letters')
    .select('id', { count: 'exact', head: true });
  const { count: totalBookings } = await supabase
    .from('marquee_bookings')
    .select('id', { count: 'exact', head: true });
  const { count: totalSets } = await supabase
    .from('marquee_sets')
    .select('id', { count: 'exact', head: true });

  console.log(`Sets: ${totalSets}`);
  console.log(`Characters: ${totalLetters}`);
  console.log(`Bookings: ${totalBookings}`);
  console.log('\nDone!');
}

main().catch(console.error);
