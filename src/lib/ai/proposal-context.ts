import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Build proposal knowledge context string for injection into ANY chatbot.
 * This gives all bots awareness of the product catalog, templates, pricing,
 * and recent proposal history.
 */
export async function buildProposalContext(supabase: SupabaseClient): Promise<string> {
  const parts: string[] = [];

  // 1. Top products by frequency
  const { data: products } = await supabase
    .from('products')
    .select('name, category, base_price, sizes')
    .eq('is_active', true)
    .order('display_order')
    .limit(20);

  if (products && products.length > 0) {
    parts.push('## Product Catalog');
    for (const p of products as { name: string; category: string; base_price: number; sizes?: { name: string; price: number }[] }[]) {
      const sizesStr = p.sizes?.length
        ? ` | Sizes: ${p.sizes.map((s) => `${s.name}=$${s.price}`).join(', ')}`
        : '';
      parts.push(`- ${p.name} (${p.category}): $${p.base_price}${sizesStr}`);
    }
  }

  // 2. Active templates
  const { data: templates } = await supabase
    .from('proposal_templates')
    .select('name, event_types, default_delivery_fee')
    .limit(10);

  if (templates && templates.length > 0) {
    parts.push('\n## Proposal Templates');
    for (const t of templates as { name: string; event_types?: string[]; default_delivery_fee?: number }[]) {
      parts.push(`- ${t.name}: ${t.event_types?.join(', ') || 'General'}${t.default_delivery_fee ? ` (delivery: $${t.default_delivery_fee})` : ''}`);
    }
  }

  // 3. Option packages
  const { data: options } = await supabase
    .from('proposal_options')
    .select('name, description, display_price')
    .limit(10);

  if (options && options.length > 0) {
    parts.push('\n## Option Packages');
    for (const o of options as { name: string; description?: string; display_price: number }[]) {
      parts.push(`- ${o.name}: $${o.display_price} - ${o.description || ''}`);
    }
  }

  // 4. Pricing rules
  const { data: rules } = await supabase
    .from('pricing_rules')
    .select('name, description, value, value_type')
    .limit(10);

  if (rules && rules.length > 0) {
    parts.push('\n## Pricing Rules');
    for (const r of rules as { name: string; description?: string; value: number; value_type?: string }[]) {
      const valStr = r.value_type === 'percentage' ? `${r.value}%` : `$${r.value}`;
      parts.push(`- ${r.name}: ${valStr}${r.description ? ` - ${r.description}` : ''}`);
    }
  }

  // 5. Recent proposal stats
  const { count: totalProposals } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true });

  const { count: acceptedCount } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'accepted');

  const { count: rejectedCount } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'rejected');

  if (totalProposals && totalProposals > 0) {
    const convRate = acceptedCount
      ? Math.round((acceptedCount / (acceptedCount + (rejectedCount || 0))) * 100)
      : 0;
    parts.push(`\n## Proposal Stats`);
    parts.push(`- Total proposals: ${totalProposals}`);
    parts.push(`- Accepted: ${acceptedCount || 0}`);
    parts.push(`- Rejected: ${rejectedCount || 0}`);
    if (convRate > 0) parts.push(`- Conversion rate: ${convRate}%`);
  }

  if (parts.length === 0) {
    return ''; // No proposal data yet
  }

  return `\n## Proposal System Knowledge\nThis business uses a proposal system for balloon decor services. Here is the current catalog and pricing:\n\n${parts.join('\n')}`;
}

/**
 * Subset of proposal tools that non-proposal chatbots can use.
 * Board and global chatbots can search products and suggest templates.
 */
export const SHARED_PROPOSAL_TOOLS = [
  {
    name: 'search_proposal_products',
    description: 'Search the balloon decor product catalog by name or category. Use this when a client or user asks about available products or pricing.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Product name or category to search for' } },
      required: ['query'],
    },
  },
  {
    name: 'search_proposal_templates',
    description: 'Search proposal templates by event type. Use this when someone mentions an event type and you want to suggest a template.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string', description: 'Event type or template name to search' } },
      required: ['query'],
    },
  },
];

/**
 * Execute a shared proposal tool. Used by non-proposal chatbots.
 */
export async function executeSharedProposalTool(
  name: string,
  args: Record<string, string>,
  supabase: SupabaseClient
): Promise<string> {
  switch (name) {
    case 'search_proposal_products': {
      const { data } = await supabase
        .from('products')
        .select('name, category, base_price, sizes, description')
        .eq('is_active', true)
        .ilike('name', `%${args.query}%`)
        .limit(10);

      if (!data || data.length === 0) {
        const { data: catData } = await supabase
          .from('products')
          .select('name, category, base_price, sizes, description')
          .eq('is_active', true)
          .ilike('category', `%${args.query}%`)
          .limit(10);
        return JSON.stringify(catData || []);
      }
      return JSON.stringify(data);
    }

    case 'search_proposal_templates': {
      const { data } = await supabase
        .from('proposal_templates')
        .select('name, description, event_types, default_delivery_fee, default_line_items')
        .or(`name.ilike.%${args.query}%,event_types.cs.{${args.query}}`)
        .limit(5);
      return JSON.stringify(data || []);
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}
