/**
 * Extract all card data from CarolinaHQ Supabase for proposal intelligence analysis.
 * Pulls cards with descriptions, comments, labels, list names, and board names.
 * Output: card-data.json
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lrxzmpyhekthnaucjsbv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface CardData {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  board_name: string;
  board_id: string;
  list_name: string;
  list_id: string;
  labels: string[];
  comments: { content: string; created_at: string }[];
  created_at: string;
}

async function extractCards(): Promise<CardData[]> {
  console.log('Fetching cards...');

  // Get all cards
  const { data: cards, error: cardsErr } = await supabase
    .from('cards')
    .select('id, title, description, due_date, priority, created_at, event_type, event_date, venue_name, venue_city, estimated_value, lead_source, client_email, client_phone')
    .order('created_at', { ascending: false });

  if (cardsErr) throw new Error(`Cards query failed: ${cardsErr.message}`);
  console.log(`  Found ${cards?.length || 0} cards`);

  // Get all boards
  const { data: boards } = await supabase.from('boards').select('id, name');
  const boardMap = new Map(boards?.map(b => [b.id, b.name]) || []);

  // Get card placements (card -> list mapping)
  const { data: placements } = await supabase
    .from('card_placements')
    .select('card_id, list_id');
  const placementMap = new Map(placements?.map(p => [p.card_id, p.list_id]) || []);

  // Get all lists
  const { data: lists } = await supabase.from('lists').select('id, name, board_id');
  const listMap = new Map(lists?.map(l => [l.id, { name: l.name, board_id: l.board_id }]) || []);

  // Get all comments
  console.log('Fetching comments...');
  const { data: comments } = await supabase
    .from('comments')
    .select('card_id, content, created_at')
    .order('created_at', { ascending: true });

  const commentsByCard = new Map<string, { content: string; created_at: string }[]>();
  for (const c of comments || []) {
    if (!c.content?.trim()) continue;
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id)!.push({ content: c.content, created_at: c.created_at });
  }
  console.log(`  Found ${comments?.length || 0} comments across ${commentsByCard.size} cards`);

  // Get all card labels
  console.log('Fetching labels...');
  const { data: cardLabels } = await supabase
    .from('card_labels')
    .select('card_id, label_id');

  const { data: labelDefs } = await supabase.from('labels').select('id, name');
  const labelNameMap = new Map(labelDefs?.map(l => [l.id, l.name]) || []);

  const labelsByCard = new Map<string, string[]>();
  for (const cl of cardLabels || []) {
    const labelName = labelNameMap.get(cl.label_id);
    if (!labelName) continue;
    if (!labelsByCard.has(cl.card_id)) labelsByCard.set(cl.card_id, []);
    labelsByCard.get(cl.card_id)!.push(labelName);
  }
  console.log(`  Found labels on ${labelsByCard.size} cards`);

  // Assemble card data
  const result: CardData[] = [];
  for (const card of cards || []) {
    const listId = placementMap.get(card.id);
    const listInfo = listId ? listMap.get(listId) : null;
    const boardId = listInfo?.board_id || '';
    const boardName = boardMap.get(boardId) || 'Unknown';

    result.push({
      id: card.id,
      title: card.title || '',
      description: card.description || null,
      due_date: card.due_date || null,
      priority: card.priority || null,
      board_name: boardName,
      board_id: boardId,
      list_name: listInfo?.name || 'Unknown',
      list_id: listId || '',
      labels: labelsByCard.get(card.id) || [],
      comments: commentsByCard.get(card.id) || [],
      created_at: card.created_at,
    });
  }

  return result;
}

async function main() {
  console.log('=== CarolinaHQ Proposal Data Extraction ===\n');

  const cards = await extractCards();

  // Stats
  const withDesc = cards.filter(c => c.description?.trim());
  const withComments = cards.filter(c => c.comments.length > 0);
  const withLabels = cards.filter(c => c.labels.length > 0);
  const boards = new Map<string, number>();
  const listCounts = new Map<string, number>();

  for (const c of cards) {
    boards.set(c.board_name, (boards.get(c.board_name) || 0) + 1);
    const key = `${c.board_name} > ${c.list_name}`;
    listCounts.set(key, (listCounts.get(key) || 0) + 1);
  }

  console.log('\n=== STATS ===');
  console.log(`Total cards: ${cards.length}`);
  console.log(`With descriptions: ${withDesc.length}`);
  console.log(`With comments: ${withComments.length}`);
  console.log(`With labels: ${withLabels.length}`);
  console.log('\nBy board:');
  for (const [name, count] of Array.from(boards.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name}: ${count}`);
  }
  console.log('\nBy list (top 20):');
  for (const [name, count] of Array.from(listCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${name}: ${count}`);
  }

  // Write output
  const outPath = resolve(__dirname, 'card-data.json');
  writeFileSync(outPath, JSON.stringify(cards, null, 2));
  console.log(`\nWritten to: ${outPath}`);
}

main().catch(console.error);
