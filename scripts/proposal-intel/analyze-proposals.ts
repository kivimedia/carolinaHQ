/**
 * Analyze extracted card data using Claude AI to build proposal patterns.
 * Reads card-data.json, sends batches to Haiku for structured extraction,
 * then uses Sonnet to synthesize the final proposal-patterns.md.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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

interface ExtractedCard {
  id: string;
  title: string;
  board_name: string;
  list_name: string;
  event_type: string;
  products: string[];
  price_mentions: string[];
  client_name: string;
  lead_source: string;
  outcome: 'booked' | 'lost' | 'in_progress' | 'unknown';
  has_proposal_content: boolean;
  venue_or_location: string;
  event_date_mentioned: string;
  summary: string;
}

// Determine outcome based on list name
function classifyOutcome(listName: string): 'booked' | 'lost' | 'in_progress' | 'unknown' {
  const lower = listName.toLowerCase();
  if (lower.includes('paid') || lower.includes('invoice sent') || lower.includes('thank you sent') || lower.includes('invoiced')) return 'booked';
  if (lower.includes("didn't book") || lower.includes('didnt book') || lower.includes('not interested')) return 'lost';
  if (lower.includes('new') || lower.includes('inquiry') || lower.includes('needs') || lower.includes('follow up') || lower.includes('proposal') || lower.includes('pricing') || lower.includes('responded') || lower.includes('sent pricing')) return 'in_progress';
  return 'unknown';
}

// Extract structured data from a batch of cards using Haiku
async function extractBatch(cards: CardData[], batchNum: number, totalBatches: number): Promise<ExtractedCard[]> {
  const cardSummaries = cards.map((c, i) => {
    const commentText = c.comments.map(cm => cm.content).join('\n').slice(0, 300);
    return `CARD ${i + 1}:
Title: ${c.title}
Board: ${c.board_name}
List: ${c.list_name}
Labels: ${c.labels.join(', ') || 'none'}
Description: ${(c.description || '').slice(0, 600)}
Comments (first 300 chars): ${commentText || 'none'}`;
  }).join('\n---\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are analyzing Trello cards from a balloon decor business (Carolina Balloons). Extract structured data from each card.

For each card, output a JSON object with these fields:
- event_type: one of [birthday, wedding, corporate, prom, graduation, baby_shower, anniversary, holiday, memorial, church, school, fundraiser, grand_opening, photo_shoot, gender_reveal, other, unknown]
- products: array of product strings mentioned (e.g. "10ft arch", "bouquets", "balloon wall", "garland", "marquee letters", "centerpieces", "columns", "organic balloon", "banner")
- price_mentions: array of any dollar amounts or pricing info found (e.g. "$350", "$1500 total", "budget $500")
- client_name: extracted client name or "unknown"
- lead_source: one of [google_ads, boutique_ads, marquee_ads, organic, referral, repeat_client, facebook, instagram, lead_gate, unknown]
- venue_or_location: venue name or city/area mentioned, or "unknown"
- event_date_mentioned: date mentioned in title/description (YYYY-MM-DD format) or "unknown"
- has_proposal_content: true if the card contains enough info to build a proposal (event type + some product/service request)
- summary: 1-sentence summary of what this lead wanted

Return a JSON array of objects, one per card, in the same order. ONLY output the JSON array, no other text.

${cardSummaries}`
    }]
  });

  const text = (response.content[0] as { type: string; text: string }).text;

  try {
    // Try to parse the JSON - handle cases where Haiku wraps in markdown
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as any[];

    return cards.map((card, i) => {
      const extracted = parsed[i] || {};
      return {
        id: card.id,
        title: card.title,
        board_name: card.board_name,
        list_name: card.list_name,
        event_type: extracted.event_type || 'unknown',
        products: extracted.products || [],
        price_mentions: extracted.price_mentions || [],
        client_name: extracted.client_name || 'unknown',
        lead_source: extracted.lead_source || 'unknown',
        outcome: classifyOutcome(card.list_name),
        has_proposal_content: extracted.has_proposal_content || false,
        venue_or_location: extracted.venue_or_location || 'unknown',
        event_date_mentioned: extracted.event_date_mentioned || 'unknown',
        summary: extracted.summary || '',
      };
    });
  } catch (e) {
    console.error(`  Batch ${batchNum} JSON parse error, using fallback extraction`);
    return cards.map(card => ({
      id: card.id,
      title: card.title,
      board_name: card.board_name,
      list_name: card.list_name,
      event_type: 'unknown',
      products: [],
      price_mentions: [],
      client_name: 'unknown',
      lead_source: 'unknown',
      outcome: classifyOutcome(card.list_name),
      has_proposal_content: false,
      venue_or_location: 'unknown',
      event_date_mentioned: 'unknown',
      summary: '',
    }));
  }
}

// Generate the final MD report using Sonnet
async function generateReport(extracted: ExtractedCard[], rawCards: CardData[]): Promise<string> {
  // Build aggregated stats
  const totalCards = extracted.length;
  const withProposalContent = extracted.filter(c => c.has_proposal_content).length;

  // Event type breakdown
  const eventTypes = new Map<string, { total: number; booked: number; lost: number }>();
  for (const c of extracted) {
    if (!eventTypes.has(c.event_type)) eventTypes.set(c.event_type, { total: 0, booked: 0, lost: 0 });
    const et = eventTypes.get(c.event_type)!;
    et.total++;
    if (c.outcome === 'booked') et.booked++;
    if (c.outcome === 'lost') et.lost++;
  }

  // Product frequency
  const productFreq = new Map<string, number>();
  for (const c of extracted) {
    for (const p of c.products) {
      const normalized = p.toLowerCase().trim();
      productFreq.set(normalized, (productFreq.get(normalized) || 0) + 1);
    }
  }

  // Price mentions
  const allPrices: string[] = [];
  for (const c of extracted) {
    allPrices.push(...c.price_mentions);
  }

  // Lead source breakdown
  const leadSources = new Map<string, { total: number; booked: number }>();
  for (const c of extracted) {
    if (!leadSources.has(c.lead_source)) leadSources.set(c.lead_source, { total: 0, booked: 0 });
    const ls = leadSources.get(c.lead_source)!;
    ls.total++;
    if (c.outcome === 'booked') ls.booked++;
  }

  // Board breakdown
  const boardStats = new Map<string, { total: number; booked: number; lost: number }>();
  for (const c of extracted) {
    if (!boardStats.has(c.board_name)) boardStats.set(c.board_name, { total: 0, booked: 0, lost: 0 });
    const bs = boardStats.get(c.board_name)!;
    bs.total++;
    if (c.outcome === 'booked') bs.booked++;
    if (c.outcome === 'lost') bs.lost++;
  }

  // Outcome breakdown
  const outcomes = { booked: 0, lost: 0, in_progress: 0, unknown: 0 };
  for (const c of extracted) outcomes[c.outcome]++;

  // Sample proposal-ready cards with descriptions
  const proposalCards = extracted
    .filter(c => c.has_proposal_content && c.products.length > 0)
    .slice(0, 30);

  const proposalCardDetails = proposalCards.map(c => {
    const raw = rawCards.find(r => r.id === c.id);
    return `- **${c.title}** (${c.board_name} > ${c.list_name})
  Event: ${c.event_type} | Products: ${c.products.join(', ')} | Prices: ${c.price_mentions.join(', ') || 'none mentioned'}
  ${c.summary}
  Outcome: ${c.outcome}`;
  }).join('\n');

  // Build the stats blob for Sonnet
  const statsBlob = `
TOTAL CARDS: ${totalCards}
WITH PROPOSAL CONTENT: ${withProposalContent}
OUTCOMES: Booked=${outcomes.booked}, Lost=${outcomes.lost}, In Progress=${outcomes.in_progress}, Unknown=${outcomes.unknown}
CONVERSION RATE: ${outcomes.booked > 0 ? Math.round(outcomes.booked / (outcomes.booked + outcomes.lost) * 100) : 0}% (booked / (booked + lost))

EVENT TYPES:
${Array.from(eventTypes.entries()).sort((a, b) => b[1].total - a[1].total).map(([type, s]) => `  ${type}: ${s.total} total, ${s.booked} booked, ${s.lost} lost (${s.total > 0 ? Math.round(s.booked / Math.max(1, s.booked + s.lost) * 100) : 0}% conv)`).join('\n')}

PRODUCTS (by frequency):
${Array.from(productFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([p, count]) => `  ${p}: ${count}`).join('\n')}

PRICE MENTIONS FOUND:
${allPrices.slice(0, 50).join(', ') || 'No explicit prices found in card text'}

LEAD SOURCES:
${Array.from(leadSources.entries()).sort((a, b) => b[1].total - a[1].total).map(([src, s]) => `  ${src}: ${s.total} total, ${s.booked} booked`).join('\n')}

BOARD STATS:
${Array.from(boardStats.entries()).map(([b, s]) => `  ${b}: ${s.total} total, ${s.booked} booked, ${s.lost} lost`).join('\n')}

SAMPLE PROPOSAL-READY CARDS:
${proposalCardDetails}
`;

  console.log('\nGenerating final report with Sonnet...');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are creating a Proposal Intelligence Report for Carolina Balloons HQ, a balloon decor business run by Halley Foye.

Based on the analysis of ${totalCards} historical Trello cards migrated from her business, create a comprehensive markdown document.

Here are the aggregated statistics and sample data:

${statsBlob}

Create a markdown document with these sections:

1. **Executive Summary** - key numbers, conversion rates, top findings
2. **Product Catalog** - table of all products found with frequency and any price info observed. Categorize into: Arches, Bouquets, Walls, Garlands, Marquee Letters, Centerpieces, Columns, Other. Include size variants where mentioned.
3. **Proposal Patterns** - group similar event types and product combos into named patterns (e.g. "Standard Birthday Arch Package", "Wedding Decor Suite", "Corporate Event Package"). For each pattern: typical products, estimated price range if any pricing data exists, conversion rate, confidence tier (no_brainer / suggested / needs_human).
4. **Pricing Rules** - any pricing patterns observed from the data (ranges, surcharges, minimums). If no explicit pricing found, note that and suggest what to ask Halley.
5. **Conversion Analysis** - breakdown by board, event type, lead source. Identify the highest and lowest converting segments. Note the very high "Didn't Book" rate on Private Clients (65%) and possible reasons.
6. **Pipeline Analysis** - common list/stage progressions. Which stages have the most cards stuck? Where do leads drop off?
7. **Recommendations for AI Proposal System** - based on the data, which proposal patterns could be automated as "no-brainers", which need human review, and what data gaps need to be filled (e.g. explicit pricing, PDF proposal templates, email templates).

Important:
- Use real numbers from the stats, don't make up data
- If pricing data is sparse, say so honestly and note "needs Halley's input"
- Keep it actionable - this document will be used to configure the AI proposal system
- Use tables for data-heavy sections
- Do NOT use emdashes or double dashes anywhere - use single dash only

Output the complete markdown document.`
    }]
  });

  return (response.content[0] as { type: string; text: string }).text;
}

async function main() {
  console.log('=== CarolinaHQ Proposal Intelligence Analysis ===\n');

  // Load card data
  const dataPath = resolve(__dirname, 'card-data.json');
  const rawCards: CardData[] = JSON.parse(readFileSync(dataPath, 'utf-8'));
  console.log(`Loaded ${rawCards.length} cards from card-data.json`);

  // Filter to cards with meaningful content (description or comments)
  const meaningfulCards = rawCards.filter(c =>
    (c.description && c.description.trim().length > 20) ||
    c.comments.length > 0
  );
  console.log(`${meaningfulCards.length} cards have descriptions or comments`);

  // Process in batches of 15 cards
  const BATCH_SIZE = 15;
  const allExtracted: ExtractedCard[] = [];
  const totalBatches = Math.ceil(meaningfulCards.length / BATCH_SIZE);

  for (let i = 0; i < meaningfulCards.length; i += BATCH_SIZE) {
    const batch = meaningfulCards.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Analyzing batch ${batchNum}/${totalBatches} (${batch.length} cards)...`);

    try {
      const extracted = await extractBatch(batch, batchNum, totalBatches);
      allExtracted.push(...extracted);
      console.log(` done`);
    } catch (e: any) {
      console.log(` ERROR: ${e.message}`);
      // Add fallback entries for failed batch
      for (const card of batch) {
        allExtracted.push({
          id: card.id,
          title: card.title,
          board_name: card.board_name,
          list_name: card.list_name,
          event_type: 'unknown',
          products: [],
          price_mentions: [],
          client_name: 'unknown',
          lead_source: 'unknown',
          outcome: classifyOutcome(card.list_name),
          has_proposal_content: false,
          venue_or_location: 'unknown',
          event_date_mentioned: 'unknown',
          summary: '',
        });
      }
    }

    // Rate limit: small delay between batches
    if (i + BATCH_SIZE < meaningfulCards.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Also add cards without descriptions (just classify outcome from list name)
  const emptyCards = rawCards.filter(c =>
    !(c.description && c.description.trim().length > 20) && c.comments.length === 0
  );
  for (const card of emptyCards) {
    allExtracted.push({
      id: card.id,
      title: card.title,
      board_name: card.board_name,
      list_name: card.list_name,
      event_type: 'unknown',
      products: [],
      price_mentions: [],
      client_name: 'unknown',
      lead_source: 'unknown',
      outcome: classifyOutcome(card.list_name),
      has_proposal_content: false,
      venue_or_location: 'unknown',
      event_date_mentioned: 'unknown',
      summary: '',
    });
  }

  console.log(`\nTotal extracted: ${allExtracted.length} cards`);

  // Save intermediate results
  const extractedPath = resolve(__dirname, 'extracted-data.json');
  writeFileSync(extractedPath, JSON.stringify(allExtracted, null, 2));
  console.log(`Saved extracted data to: ${extractedPath}`);

  // Generate final report
  const report = await generateReport(allExtracted, rawCards);

  // Write final MD
  const reportPath = resolve(__dirname, '..', '..', 'proposal-patterns.md');
  writeFileSync(reportPath, report);
  console.log(`\nFinal report written to: ${reportPath}`);
}

main().catch(console.error);
