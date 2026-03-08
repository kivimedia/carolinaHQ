import { getAuthContext, successResponse, errorResponse, parseBody } from '@/lib/api-helpers';

interface UpdateBuilderDraftBody {
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
  status?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase } = auth.ctx;

  const { data, error } = await supabase
    .from('proposal_drafts')
    .select(`
      *,
      card:cards(id, title, event_type, event_date, venue_name, venue_city, client_email, client_phone, estimated_value, description),
      pattern:proposal_patterns(id, name, is_no_brainer)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse('Draft not found', 404);
  return successResponse(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase } = auth.ctx;
  const parsed = await parseBody<UpdateBuilderDraftBody>(request);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body;

  // Build update object with only provided fields
  const update: Record<string, unknown> = {};
  if (body.client_name !== undefined) update.client_name = body.client_name;
  if (body.client_email_address !== undefined) update.client_email_address = body.client_email_address;
  if (body.client_phone !== undefined) update.client_phone = body.client_phone;
  if (body.event_type !== undefined) update.event_type = body.event_type;
  if (body.event_date !== undefined) update.event_date = body.event_date;
  if (body.venue_name !== undefined) update.venue_name = body.venue_name;
  if (body.venue_city !== undefined) update.venue_city = body.venue_city;
  if (body.personal_note !== undefined) update.personal_note = body.personal_note;
  if (body.line_items !== undefined) update.line_items = body.line_items;
  if (body.total_amount !== undefined) update.total_amount = body.total_amount;
  if (body.email_subject !== undefined) update.email_subject = body.email_subject;
  if (body.email_body !== undefined) update.email_body = body.email_body;
  if (body.status !== undefined) update.status = body.status;

  const { data, error } = await supabase
    .from('proposal_drafts')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);
  return successResponse(data);
}
