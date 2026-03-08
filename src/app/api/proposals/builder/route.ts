import { getAuthContext, successResponse, errorResponse, parseBody } from '@/lib/api-helpers';

interface CreateBuilderDraftBody {
  card_id?: string;
  client_name?: string;
  client_email_address?: string;
  client_phone?: string;
  event_type?: string;
  event_date?: string;
  venue_name?: string;
  venue_city?: string;
  personal_note?: string;
  line_items?: {
    product: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }[];
  total_amount?: number;
  email_subject?: string;
  email_body?: string;
}

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;
  const url = new URL(request.url);
  const draftId = url.searchParams.get('id');

  // If specific ID requested, return single draft
  if (draftId) {
    const { data, error } = await supabase
      .from('proposal_drafts')
      .select(`
        *,
        card:cards(id, title, event_type, event_date, venue_name, venue_city, client_email, client_phone, estimated_value, description),
        pattern:proposal_patterns(id, name, is_no_brainer)
      `)
      .eq('id', draftId)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse('Draft not found', 404);
    return successResponse(data);
  }

  // List all drafts created by this user
  const { data, error } = await supabase
    .from('proposal_drafts')
    .select(`
      id, status, confidence_tier, total_amount, client_name, event_type, event_date, created_at,
      card:cards(id, title, event_type, venue_name)
    `)
    .or(`created_by.eq.${userId},created_by.is.null`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;
  const parsed = await parseBody<CreateBuilderDraftBody>(request);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body;

  const { data, error } = await supabase
    .from('proposal_drafts')
    .insert({
      card_id: body.card_id || null,
      client_name: body.client_name || null,
      client_email_address: body.client_email_address || null,
      client_phone: body.client_phone || null,
      event_type: body.event_type || null,
      event_date: body.event_date || null,
      venue_name: body.venue_name || null,
      venue_city: body.venue_city || null,
      personal_note: body.personal_note || null,
      line_items: body.line_items || [],
      total_amount: body.total_amount || 0,
      email_subject: body.email_subject || '',
      email_body: body.email_body || '',
      status: 'draft',
      confidence_tier: 'needs_human',
      created_by: userId,
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data, 201);
}
