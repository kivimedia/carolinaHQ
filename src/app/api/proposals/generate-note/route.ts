import { NextRequest } from 'next/server';
import { getAuthContext, successResponse, errorResponse } from '@/lib/api-helpers';
import { resolveModelWithFallback } from '@/lib/ai/model-resolver';
import { createAnthropicClient, touchApiKey } from '@/lib/ai/providers';
import { logUsage } from '@/lib/ai/cost-tracker';
import { canMakeAICall } from '@/lib/ai/budget-checker';

/**
 * POST /api/proposals/generate-note
 * Generate a personalized note for a proposal using AI.
 *
 * Body: { client_name, event_type, event_date?, venue?, line_items? }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;
  const startTime = Date.now();

  try {
    const { client_name, event_type, event_date, venue, line_items } = await request.json();

    if (!client_name) return errorResponse('client_name is required', 400);

    const modelConfig = await resolveModelWithFallback(supabase, 'proposal_chat');

    const budgetCheck = await canMakeAICall(supabase, {
      provider: modelConfig.provider,
      activity: 'proposal_chat',
      userId,
    });

    if (!budgetCheck.allowed) {
      return errorResponse(`Budget exceeded: ${budgetCheck.reason}`, 429);
    }

    const client = await createAnthropicClient(supabase);
    if (!client) {
      return errorResponse('Anthropic API key not configured', 503);
    }

    // Load user's voice profile from settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('ai_master_prompt, business_name')
      .eq('user_id', userId)
      .single();

    const voiceContext = settings?.ai_master_prompt
      ? `\nMatch this writing style: ${settings.ai_master_prompt}`
      : '';

    const itemsSummary = line_items?.length
      ? `\nItems in proposal: ${line_items.map((i: { product_name: string }) => i.product_name).join(', ')}`
      : '';

    const prompt = `Write a warm, personal note from ${settings?.business_name || 'Carolina Balloons and Confetti'} to ${client_name} for their ${event_type || 'event'}${event_date ? ` on ${event_date}` : ''}${venue ? ` at ${venue}` : ''}.${itemsSummary}${voiceContext}

Keep it 2-3 sentences, warm and professional. Don't include pricing or business details - just the personal touch. Output only the note text, nothing else.`;

    const response = await client.messages.create({
      model: modelConfig.model_id,
      max_tokens: 256,
      temperature: 0.8,
      messages: [{ role: 'user', content: prompt }],
    });

    const latencyMs = Date.now() - startTime;
    const note = response.content
      .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
      .map((block) => block.text)
      .join('');

    await Promise.all([
      logUsage(supabase, {
        userId,
        activity: 'proposal_chat',
        provider: modelConfig.provider,
        modelId: modelConfig.model_id,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        latencyMs,
        status: 'success',
        metadata: { sub_action: 'generate_note' },
      }),
      touchApiKey(supabase, modelConfig.provider),
    ]);

    return successResponse({ note });
  } catch (err) {
    console.error('[generate-note] Error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to generate note', 500);
  }
}
