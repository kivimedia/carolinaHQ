/**
 * Generate the proposal-patterns.md from already-extracted data.
 * Reads extracted-data.json and card-data.json, calls Claude to synthesize the report.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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

interface CardData {
  id: string;
  title: string;
  description: string | null;
  board_name: string;
  list_name: string;
  labels: string[];
  comments: { content: string; created_at: string }[];
}

async function main() {
  const extracted: ExtractedCard[] = JSON.parse(readFileSync(resolve(__dirname, 'extracted-data.json'), 'utf-8'));
  const rawCards: CardData[] = JSON.parse(readFileSync(resolve(__dirname, 'card-data.json'), 'utf-8'));

  console.log(`Loaded ${extracted.length} extracted cards, ${rawCards.length} raw cards`);

  // Build aggregated stats
  const totalCards = extracted.length;
  const withProposalContent = extracted.filter(c => c.has_proposal_content).length;

  const eventTypes = new Map<string, { total: number; booked: number; lost: number }>();
  for (const c of extracted) {
    if (!eventTypes.has(c.event_type)) eventTypes.set(c.event_type, { total: 0, booked: 0, lost: 0 });
    const et = eventTypes.get(c.event_type)!;
    et.total++;
    if (c.outcome === 'booked') et.booked++;
    if (c.outcome === 'lost') et.lost++;
  }

  const productFreq = new Map<string, number>();
  for (const c of extracted) {
    for (const p of c.products) {
      const normalized = p.toLowerCase().trim();
      productFreq.set(normalized, (productFreq.get(normalized) || 0) + 1);
    }
  }

  const allPrices: string[] = [];
  for (const c of extracted) allPrices.push(...c.price_mentions);

  const leadSources = new Map<string, { total: number; booked: number }>();
  for (const c of extracted) {
    if (!leadSources.has(c.lead_source)) leadSources.set(c.lead_source, { total: 0, booked: 0 });
    const ls = leadSources.get(c.lead_source)!;
    ls.total++;
    if (c.outcome === 'booked') ls.booked++;
  }

  const boardStats = new Map<string, { total: number; booked: number; lost: number }>();
  for (const c of extracted) {
    if (!boardStats.has(c.board_name)) boardStats.set(c.board_name, { total: 0, booked: 0, lost: 0 });
    const bs = boardStats.get(c.board_name)!;
    bs.total++;
    if (c.outcome === 'booked') bs.booked++;
    if (c.outcome === 'lost') bs.lost++;
  }

  const outcomes = { booked: 0, lost: 0, in_progress: 0, unknown: 0 };
  for (const c of extracted) outcomes[c.outcome]++;

  // Venue/location analysis
  const venues = new Map<string, number>();
  for (const c of extracted) {
    if (c.venue_or_location && c.venue_or_location !== 'unknown') {
      venues.set(c.venue_or_location, (venues.get(c.venue_or_location) || 0) + 1);
    }
  }

  // Sample proposal-ready cards with descriptions
  const proposalCards = extracted
    .filter(c => c.has_proposal_content && c.products.length > 0)
    .slice(0, 40);

  const proposalCardDetails = proposalCards.map(c => {
    const raw = rawCards.find(r => r.id === c.id);
    return `- **${c.title}** (${c.board_name} > ${c.list_name})
  Event: ${c.event_type} | Products: ${c.products.join(', ')} | Prices: ${c.price_mentions.join(', ') || 'none'}
  Location: ${c.venue_or_location} | Source: ${c.lead_source}
  ${c.summary}
  Outcome: ${c.outcome}`;
  }).join('\n');

  const statsBlob = `
TOTAL CARDS: ${totalCards}
WITH PROPOSAL CONTENT: ${withProposalContent}
OUTCOMES: Booked=${outcomes.booked}, Lost=${outcomes.lost}, In Progress=${outcomes.in_progress}, Unknown=${outcomes.unknown}
CONVERSION RATE: ${outcomes.booked > 0 ? Math.round(outcomes.booked / (outcomes.booked + outcomes.lost) * 100) : 0}% (booked / (booked + lost))

EVENT TYPES:
${Array.from(eventTypes.entries()).sort((a, b) => b[1].total - a[1].total).map(([type, s]) => `  ${type}: ${s.total} total, ${s.booked} booked, ${s.lost} lost (${s.booked + s.lost > 0 ? Math.round(s.booked / (s.booked + s.lost) * 100) : 0}% conv)`).join('\n')}

PRODUCTS (by frequency, top 40):
${Array.from(productFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([p, count]) => `  ${p}: ${count}`).join('\n')}

ALL PRICE MENTIONS (${allPrices.length} total):
${allPrices.join(', ') || 'No explicit prices found'}

LEAD SOURCES:
${Array.from(leadSources.entries()).sort((a, b) => b[1].total - a[1].total).map(([src, s]) => `  ${src}: ${s.total} total, ${s.booked} booked`).join('\n')}

BOARD STATS:
${Array.from(boardStats.entries()).map(([b, s]) => `  ${b}: ${s.total} total, ${s.booked} booked, ${s.lost} lost`).join('\n')}

TOP VENUES/LOCATIONS:
${Array.from(venues.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([v, c]) => `  ${v}: ${c}`).join('\n')}

SAMPLE PROPOSAL-READY CARDS (${proposalCards.length} cards with products identified):
${proposalCardDetails}
`;

  console.log('\n--- STATS SUMMARY ---');
  console.log(statsBlob.slice(0, 2000));
  console.log('...\n');

  console.log('Generating final report with Claude...');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: `You are creating a Proposal Intelligence Report for Carolina Balloons HQ, a balloon decor business run by Halley Foye in Charlotte, NC area.

Based on analysis of ${totalCards} historical Trello cards migrated from her business, create a comprehensive markdown document.

Here are the aggregated statistics and sample data:

${statsBlob}

Create a markdown document with these sections:

1. **Executive Summary** - key numbers, conversion rates, top findings in 5-8 bullet points
2. **Product Catalog** - table of all products found with frequency and any price info observed. Categorize into: Arches, Bouquets/Arrangements, Walls/Backdrops, Garlands, Marquee Letters, Centerpieces, Columns/Stands, Banners, Other. Include size variants where mentioned.
3. **Proposal Patterns** - group similar event types and product combos into 8-12 named patterns (e.g. "Standard Birthday Arch Package", "Wedding Decor Suite", "Marquee Letter Rental", "Corporate Event Package"). For each pattern: typical products, estimated price range if pricing data exists, conversion rate, and a confidence tier (no_brainer / suggested / needs_human) based on how standardized it is.
4. **Pricing Intelligence** - any pricing patterns observed. List all dollar amounts found and what they relate to. If pricing data is sparse, clearly state "DATA GAP - needs Halley's pricing input" and suggest specific questions to ask her.
5. **Conversion Analysis** - breakdown by board, event type, lead source. Tables showing conversion rates. Identify the highest and lowest converting segments. Analyze the high "Didn't Book" rate on Private Clients.
6. **Pipeline Analysis** - common list/stage progressions by board. Where do leads stack up? Where do they drop off?
7. **Data Gaps and Next Steps** - what's missing for full AI proposal automation. Specifically: pricing data needed, email/PDF templates to collect from Halley, product catalog validation needed, etc. Include a concrete checklist of items to collect from Halley.

Important:
- Use real numbers from the stats provided. Do NOT make up data.
- If pricing data is sparse, say so honestly
- Keep it actionable - this document configures the AI proposal system
- Use markdown tables for data sections
- Do NOT use emdashes (--) or double dashes anywhere. Use single dash - only.
- Title: "# Carolina Balloons HQ - Proposal Intelligence Report"
- Add "Generated: 2026-03-08" under the title

Output the complete markdown document.`
    }]
  });

  const report = (response.content[0] as { type: string; text: string }).text;

  const reportPath = resolve(__dirname, '..', '..', 'proposal-patterns.md');
  writeFileSync(reportPath, report);
  console.log(`\nReport written to: ${reportPath}`);
  console.log(`Report length: ${report.length} characters`);
}

main().catch(console.error);
