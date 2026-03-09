import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { getAuthContext, errorResponse } from '@/lib/api-helpers';
import { resolveModelWithFallback } from '@/lib/ai/model-resolver';
import { createAnthropicClient, touchApiKey, getProviderKey } from '@/lib/ai/providers';
import { logUsage } from '@/lib/ai/cost-tracker';
import { canMakeAICall } from '@/lib/ai/budget-checker';
import { getSystemPrompt } from '@/lib/ai/prompt-templates';

// ============================================================================
// TOOL DEFINITIONS (Anthropic format)
// ============================================================================

const PROPOSAL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: 'Search the product catalog by name or category. Returns matching products with sizes and prices.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'search_options',
    description: 'Search existing option packages by name.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'search_templates',
    description: 'Search proposal templates by name or event type.',
    input_schema: {
      type: 'object' as const,
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'create_proposal',
    description: 'Create a complete proposal in the database with line items and options. Returns the proposal ID and number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_name: { type: 'string' },
        client_email: { type: 'string' },
        client_phone: { type: 'string' },
        event_type: { type: 'string' },
        event_date: { type: 'string', description: 'YYYY-MM-DD format' },
        venue: { type: 'string' },
        guests: { type: 'string' },
        color_theme: { type: 'string' },
        notes: { type: 'string' },
        personal_note: { type: 'string' },
        delivery_fee: { type: 'number' },
        line_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              product_name: { type: 'string' },
              selected_size: { type: 'string' },
              selected_color: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              product_image: { type: 'string' },
            },
            required: ['product_name', 'quantity', 'unit_price'],
          },
        },
        option_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of existing options to attach to the proposal',
        },
      },
      required: ['client_name', 'line_items'],
    },
  },
  {
    name: 'create_product',
    description: 'Add a new product to the catalog.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        base_price: { type: 'number' },
        sizes: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, price: { type: 'number' } },
            required: ['name', 'price'],
          },
        },
      },
      required: ['name', 'category', 'base_price'],
    },
  },
  {
    name: 'update_product',
    description: "Update an existing product's details.",
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: { type: 'string' },
        name: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        base_price: { type: 'number' },
        sizes: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, price: { type: 'number' } },
            required: ['name', 'price'],
          },
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'create_option',
    description: 'Create a new option/package with items from the product catalog.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              product_name: { type: 'string' },
              selected_size: { type: 'string' },
              selected_color: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
            },
            required: ['product_name', 'quantity', 'unit_price'],
          },
        },
      },
      required: ['name', 'items'],
    },
  },
  {
    name: 'update_option',
    description: "Update an existing option's name, description or items.",
    input_schema: {
      type: 'object' as const,
      properties: {
        option_id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              product_name: { type: 'string' },
              selected_size: { type: 'string' },
              selected_color: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
            },
            required: ['product_name', 'quantity', 'unit_price'],
          },
        },
      },
      required: ['option_id'],
    },
  },
  {
    name: 'create_template',
    description: 'Save a new proposal template with default settings.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        event_types: { type: 'array', items: { type: 'string' } },
        default_delivery_fee: { type: 'number' },
        default_notes: { type: 'string' },
        default_personal_note: { type: 'string' },
        default_line_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              product_name: { type: 'string' },
              selected_size: { type: 'string' },
              selected_color: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
            },
          },
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'generate_image',
    description: 'Generate a product or proposal image from a text description. Returns the public URL of the uploaded image.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prompt: { type: 'string', description: 'Detailed description of the image to generate' },
        context: { type: 'string', description: "Either 'product' or 'proposal'" },
        product_id: { type: 'string', description: 'If for a product, the product ID to associate' },
      },
      required: ['prompt', 'context'],
    },
  },
  {
    name: 'edit_image',
    description: 'Edit an existing image with a text instruction. Returns the new image URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        image_url: { type: 'string', description: 'URL of the existing image' },
        instruction: { type: 'string', description: 'What to change' },
        product_id: { type: 'string' },
      },
      required: ['image_url', 'instruction'],
    },
  },
];

// ============================================================================
// TOOL EXECUTION
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(
  name: string,
  args: Record<string, any>,
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  try {
    switch (name) {
      case 'search_products': {
        const { data } = await supabase
          .from('products')
          .select('id, name, category, base_price, sizes, description')
          .eq('is_active', true)
          .ilike('name', `%${args.query}%`)
          .limit(20);
        if (!data || data.length === 0) {
          const { data: catData } = await supabase
            .from('products')
            .select('id, name, category, base_price, sizes, description')
            .eq('is_active', true)
            .ilike('category', `%${args.query}%`)
            .limit(20);
          return JSON.stringify(catData || []);
        }
        return JSON.stringify(data);
      }

      case 'search_options': {
        const { data } = await supabase
          .from('proposal_options')
          .select('id, name, description, display_price')
          .ilike('name', `%${args.query}%`)
          .limit(20);
        if (data && data.length > 0) {
          const ids = data.map((o: { id: string }) => o.id);
          const { data: items } = await supabase
            .from('proposal_option_items')
            .select('*')
            .in('option_id', ids);
          const result = data.map((o: { id: string }) => ({
            ...o,
            items: (items || []).filter((i: { option_id: string }) => i.option_id === o.id),
          }));
          return JSON.stringify(result);
        }
        return JSON.stringify([]);
      }

      case 'search_templates': {
        const { data } = await supabase
          .from('proposal_templates')
          .select('id, name, description, event_types, default_delivery_fee')
          .or(`name.ilike.%${args.query}%,event_types.cs.{${args.query}}`)
          .limit(10);
        return JSON.stringify(data || []);
      }

      case 'create_proposal': {
        const lineItems = args.line_items || [];
        const subtotal = lineItems.reduce(
          (s: number, i: { unit_price?: number; quantity?: number }) =>
            s + (i.unit_price || 0) * (i.quantity || 1),
          0
        );
        const deliveryFee = args.delivery_fee || 0;
        const total = subtotal + deliveryFee;

        const { data: proposal, error } = await supabase
          .from('proposals')
          .insert({
            user_id: userId,
            client_name: args.client_name || '',
            client_email: args.client_email || '',
            client_phone: args.client_phone || '',
            event_type: args.event_type || '',
            event_date: args.event_date || null,
            venue: args.venue || '',
            guests: args.guests || '',
            color_theme: args.color_theme || '',
            notes: args.notes || '',
            personal_note: args.personal_note || '',
            delivery_fee: deliveryFee,
            subtotal,
            total,
            status: 'draft',
            selected_option_ids: args.option_ids || [],
          })
          .select('id, proposal_number')
          .single();

        if (error) return JSON.stringify({ error: error.message });

        if (lineItems.length > 0) {
          await supabase.from('proposal_line_items').insert(
            lineItems.map((item: Record<string, unknown>, i: number) => ({
              proposal_id: proposal.id,
              product_id: item.product_id || null,
              product_name: item.product_name,
              selected_size: item.selected_size || '',
              selected_color: item.selected_color || 'Custom',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              product_image: item.product_image || null,
              display_order: i,
            }))
          );
        }

        return JSON.stringify({
          success: true,
          proposal_id: proposal.id,
          proposal_number: proposal.proposal_number,
          total,
        });
      }

      case 'create_product': {
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: args.name,
            category: args.category,
            description: args.description || '',
            base_price: args.base_price || 0,
            sizes: args.sizes || [],
          })
          .select('id, name')
          .single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, ...data });
      }

      case 'update_product': {
        const { product_id, ...updates } = args;
        const { error } = await supabase.from('products').update(updates).eq('id', product_id);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, product_id });
      }

      case 'create_option': {
        const items = args.items || [];
        const displayPrice = items.reduce(
          (s: number, i: { unit_price?: number; quantity?: number }) =>
            s + (i.unit_price || 0) * (i.quantity || 1),
          0
        );
        const { data: opt, error } = await supabase
          .from('proposal_options')
          .insert({
            name: args.name,
            description: args.description || '',
            display_price: displayPrice,
            user_id: userId,
          })
          .select('id')
          .single();
        if (error) return JSON.stringify({ error: error.message });

        if (items.length > 0) {
          await supabase.from('proposal_option_items').insert(
            items.map((item: Record<string, unknown>, i: number) => ({
              option_id: opt.id,
              product_id: item.product_id || null,
              product_name: item.product_name,
              selected_size: item.selected_size || '',
              selected_color: item.selected_color || 'Custom',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              display_order: i,
            }))
          );
        }

        return JSON.stringify({ success: true, option_id: opt.id, name: args.name, display_price: displayPrice });
      }

      case 'update_option': {
        const { option_id, items, ...updates } = args;
        if (Object.keys(updates).length > 0) {
          await supabase.from('proposal_options').update(updates).eq('id', option_id);
        }
        if (items) {
          await supabase.from('proposal_option_items').delete().eq('option_id', option_id);
          const displayPrice = items.reduce(
            (s: number, i: { unit_price?: number; quantity?: number }) =>
              s + (i.unit_price || 0) * (i.quantity || 1),
            0
          );
          await supabase.from('proposal_options').update({ display_price: displayPrice }).eq('id', option_id);
          if (items.length > 0) {
            await supabase.from('proposal_option_items').insert(
              items.map((item: Record<string, unknown>, i: number) => ({
                option_id,
                product_id: item.product_id || null,
                product_name: item.product_name,
                selected_size: item.selected_size || '',
                selected_color: item.selected_color || 'Custom',
                quantity: item.quantity || 1,
                unit_price: item.unit_price || 0,
                display_order: i,
              }))
            );
          }
        }
        return JSON.stringify({ success: true, option_id });
      }

      case 'create_template': {
        const { data, error } = await supabase
          .from('proposal_templates')
          .insert({
            name: args.name,
            description: args.description || '',
            event_types: args.event_types || [],
            default_delivery_fee: args.default_delivery_fee || 0,
            default_notes: args.default_notes || '',
            default_personal_note: args.default_personal_note || '',
            default_line_items: args.default_line_items || [],
          })
          .select('id, name')
          .single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, ...data });
      }

      case 'generate_image': {
        // Use Google Gemini for image generation via direct API call
        const googleKey = await getProviderKey(supabase, 'google');
        if (!googleKey) {
          return JSON.stringify({ error: 'Google AI API key not configured. Add one in Settings > AI Configuration to enable image generation.' });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: args.prompt }] }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        });

        if (!response.ok) {
          return JSON.stringify({ error: `Image generation failed: ${response.status}` });
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

        if (!imagePart?.inlineData?.data) {
          return JSON.stringify({ error: 'No image generated' });
        }

        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const folder = args.context === 'product' ? `products/${args.product_id || 'general'}` : 'proposals';
        const fileName = `${folder}/ai-${crypto.randomUUID()}.png`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true });

        if (uploadError) return JSON.stringify({ error: uploadError.message });

        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);

        if (args.context === 'product' && args.product_id) {
          const { data: existing } = await supabase
            .from('product_images')
            .select('id')
            .eq('product_id', args.product_id)
            .eq('is_primary', true);

          if (existing && existing.length > 0) {
            await supabase
              .from('product_images')
              .update({ image_url: urlData.publicUrl })
              .eq('id', existing[0].id);
          } else {
            await supabase.from('product_images').insert({
              product_id: args.product_id,
              image_url: urlData.publicUrl,
              is_primary: true,
            });
          }
        }

        return JSON.stringify({ success: true, image_url: urlData.publicUrl });
      }

      case 'edit_image': {
        const googleKey = await getProviderKey(supabase, 'google');
        if (!googleKey) {
          return JSON.stringify({ error: 'Google AI API key not configured for image editing.' });
        }

        // Fetch the source image
        const imgResponse = await fetch(args.image_url);
        if (!imgResponse.ok) {
          return JSON.stringify({ error: 'Could not fetch source image' });
        }
        const imgArrayBuffer = await imgResponse.arrayBuffer();
        const imgBase64 = Buffer.from(imgArrayBuffer).toString('base64');
        const imgMime = imgResponse.headers.get('content-type') || 'image/png';

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: args.instruction },
                { inlineData: { mimeType: imgMime, data: imgBase64 } },
              ],
            }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        });

        if (!response.ok) {
          return JSON.stringify({ error: `Image edit failed: ${response.status}` });
        }

        const data = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

        if (!imagePart?.inlineData?.data) {
          return JSON.stringify({ error: 'No image generated' });
        }

        const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
        const fileName = `edited/ai-${crypto.randomUUID()}.png`;

        await supabase.storage
          .from('product-images')
          .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true });

        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);

        if (args.product_id) {
          const { data: existing } = await supabase
            .from('product_images')
            .select('id')
            .eq('product_id', args.product_id)
            .eq('is_primary', true);

          if (existing && existing.length > 0) {
            await supabase
              .from('product_images')
              .update({ image_url: urlData.publicUrl })
              .eq('id', existing[0].id);
          } else {
            await supabase.from('product_images').insert({
              product_id: args.product_id,
              image_url: urlData.publicUrl,
              is_primary: true,
            });
          }
        }

        return JSON.stringify({ success: true, image_url: urlData.publicUrl });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    console.error(`[proposal-chat] Tool ${name} error:`, err);
    return JSON.stringify({ error: err instanceof Error ? err.message : 'Tool execution failed' });
  }
}

// ============================================================================
// BUILD CATALOG CONTEXT
// ============================================================================

async function buildCatalogContext(
  supabase: SupabaseClient,
  userId: string,
  conversationId?: string
): Promise<string> {
  const [productsRes, optionsRes, templatesRes, recentConvsRes, settingsRes] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, category, base_price, sizes, description')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('proposal_options')
      .select('id, name, description, display_price')
      .eq('user_id', userId),
    supabase
      .from('proposal_templates')
      .select('id, name, description, event_types')
      .limit(50),
    supabase
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .neq('id', conversationId || '00000000-0000-0000-0000-000000000000')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('user_settings')
      .select('ai_master_prompt')
      .eq('user_id', userId)
      .single(),
  ]);

  // Build memory from recent conversations
  let memoryContext = '';
  const recentConvs = recentConvsRes.data || [];
  if (recentConvs.length > 0) {
    const convIds = recentConvs.map((c: { id: string }) => c.id);
    const { data: recentMsgs } = await supabase
      .from('chat_messages')
      .select('conversation_id, role, content, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })
      .limit(100);

    if (recentMsgs && recentMsgs.length > 0) {
      const grouped: Record<string, { role: string; content: string }[]> = {};
      for (const msg of recentMsgs as { conversation_id: string; role: string; content: string }[]) {
        if (!grouped[msg.conversation_id]) grouped[msg.conversation_id] = [];
        grouped[msg.conversation_id].push(msg);
      }

      const convSummaries = recentConvs
        .map((conv: { id: string; title: string; created_at: string }) => {
          const msgs = grouped[conv.id] || [];
          const lastMsgs = msgs.slice(-4);
          const preview = lastMsgs
            .map((m) => `  ${m.role}: ${m.content.slice(0, 150)}`)
            .join('\n');
          return `### "${conv.title}" (${conv.created_at?.split('T')[0] || 'unknown date'})\n${preview}`;
        })
        .join('\n\n');

      memoryContext = `\n## Recent Conversation History (for context)\n${convSummaries}\n`;
    }
  }

  const products = productsRes.data || [];
  const options = optionsRes.data || [];
  const templates = templatesRes.data || [];

  const catalogSummary = `
## Your Product Catalog
${products.map((p: { id: string; name: string; category: string; base_price: number; sizes?: { name: string; price: number }[] }) =>
  `- **${p.name}** (${p.category}): $${p.base_price} base${p.sizes?.length ? `, sizes: ${p.sizes.map((s) => `${s.name}=$${s.price}`).join(', ')}` : ''} [ID: ${p.id}]`
).join('\n')}

## Your Options/Packages
${options.map((o: { id: string; name: string; display_price: number; description?: string }) =>
  `- **${o.name}**: $${o.display_price} - ${o.description || 'No description'} [ID: ${o.id}]`
).join('\n') || 'None yet'}

## Your Templates
${templates.map((t: { id: string; name: string; event_types?: string[] }) =>
  `- **${t.name}**: ${t.event_types?.join(', ') || 'General'} [ID: ${t.id}]`
).join('\n') || 'None yet'}
`;

  // Include custom AI master prompt from user settings if available
  const masterPrompt = settingsRes.data?.ai_master_prompt;
  const masterSection = masterPrompt
    ? `\n## Business Owner Instructions\n${masterPrompt}\n`
    : '';

  return `${catalogSummary}${memoryContext}${masterSection}`;
}

// ============================================================================
// POST /api/proposals/chat
// ============================================================================

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { messages, conversation_id, images } = body as {
      messages: { role: string; content: string }[];
      conversation_id?: string;
      images?: string[];
    };

    if (!messages || messages.length === 0) {
      return errorResponse('Messages array is required', 400);
    }

    // 1. Resolve model config
    const modelConfig = await resolveModelWithFallback(supabase, 'proposal_chat');

    // 2. Budget check
    const budgetCheck = await canMakeAICall(supabase, {
      provider: modelConfig.provider,
      activity: 'proposal_chat',
      userId,
    });

    if (!budgetCheck.allowed) {
      return errorResponse(`Budget exceeded: ${budgetCheck.reason}`, 429);
    }

    // 3. Create Anthropic client
    const client = await createAnthropicClient(supabase);
    if (!client) {
      return errorResponse(
        'Anthropic API key not configured. Add one in Settings > AI Configuration.',
        503
      );
    }

    // 4. Build system prompt with catalog context
    const basePrompt = getSystemPrompt('proposal_chat');
    const catalogContext = await buildCatalogContext(supabase, userId, conversation_id);
    const fullSystemPrompt = `${basePrompt}\n\n${catalogContext}\n## Guidelines
- When the user asks to create a proposal, gather: client name, event type, event date, and which products/options to include.
- Match product names fuzzily - if they say "garland" find "Balloon Garland" etc.
- When products have multiple sizes, ask which size they want.
- Always confirm totals before creating a proposal.
- For images, generate professional balloon decor photography-style images.
- Be concise but friendly. Use markdown formatting.
- When you create something, include a link like: [Open in Builder](/proposals/new?edit=PROPOSAL_ID)
- When returning image results, include the image URL in markdown: ![Generated Image](URL)
- If a tool returns an error, explain it to the user and suggest a fix.
- You remember context from previous conversations. Reference past interactions when relevant.`;

    // 5. Build Anthropic messages array
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'user') {
        // If last message and has images, make multimodal
        if (i === messages.length - 1 && images && images.length > 0) {
          const content: Anthropic.ContentBlockParam[] = [];
          if (msg.content) {
            content.push({ type: 'text', text: msg.content });
          }
          for (const imgUrl of images) {
            if (imgUrl.startsWith('data:')) {
              // Base64 image
              const match = imgUrl.match(/^data:(image\/\w+);base64,(.+)$/);
              if (match) {
                content.push({
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: match[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: match[2],
                  },
                });
              }
            } else {
              // URL image
              content.push({
                type: 'image',
                source: { type: 'url', url: imgUrl },
              });
            }
          }
          anthropicMessages.push({ role: 'user', content });
        } else {
          anthropicMessages.push({ role: 'user', content: msg.content });
        }
      } else if (msg.role === 'assistant') {
        anthropicMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    // 6. Agentic tool loop
    const MAX_ITERATIONS = 10;
    let iteration = 0;
    let finalResponse = '';
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    let currentMessages = [...anthropicMessages];

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await client.messages.create({
        model: modelConfig.model_id,
        max_tokens: modelConfig.max_tokens,
        temperature: modelConfig.temperature,
        system: fullSystemPrompt,
        tools: PROPOSAL_TOOLS,
        messages: currentMessages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Check if there are tool uses
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      );

      if (toolUseBlocks.length > 0) {
        // Add assistant response to messages
        currentMessages.push({ role: 'assistant', content: response.content });

        // Execute all tool calls and add results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const toolBlock of toolUseBlocks) {
          console.log(`[proposal-chat] Executing tool: ${toolBlock.name}`, toolBlock.input);
          const result = await executeTool(
            toolBlock.name,
            toolBlock.input as Record<string, unknown>,
            supabase,
            userId
          );
          console.log(`[proposal-chat] Tool result: ${result.substring(0, 200)}`);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: result,
          });
        }

        currentMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      // No tool calls - extract final text
      finalResponse = textBlocks.map((block) => block.text).join('\n');
      break;
    }

    const latencyMs = Date.now() - startTime;

    // 7. Log usage
    await Promise.all([
      logUsage(supabase, {
        userId,
        activity: 'proposal_chat',
        provider: modelConfig.provider,
        modelId: modelConfig.model_id,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        latencyMs,
        status: 'success',
      }),
      touchApiKey(supabase, modelConfig.provider),
    ]);

    // 8. Save messages to DB if conversation_id provided
    if (conversation_id) {
      const userMsg = messages[messages.length - 1];
      await supabase.from('chat_messages').insert([
        { conversation_id, role: 'user', content: userMsg.content },
        { conversation_id, role: 'assistant', content: finalResponse },
      ]);
    }

    return NextResponse.json({
      content: finalResponse,
      usage: {
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        iterations: iteration,
      },
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error('[proposal-chat] Error:', err);

    // Log the error
    try {
      const modelConfig = await resolveModelWithFallback(supabase, 'proposal_chat');
      await logUsage(supabase, {
        userId,
        activity: 'proposal_chat',
        provider: modelConfig.provider,
        modelId: modelConfig.model_id,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // Don't fail on logging errors
    }

    return errorResponse(
      err instanceof Error ? err.message : 'Chat request failed',
      500
    );
  }
}
