import { NextRequest } from 'next/server';
import { getAuthContext, successResponse, errorResponse } from '@/lib/api-helpers';
import { draftFriendorEmail } from '@/lib/ai/email-drafter';

interface Params {
  params: { id: string };
}

/**
 * POST /api/venues/[id]/friendor-draft
 * Generate an AI-powered friendor outreach email for a venue.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;
  const venueId = params.id;

  // Fetch venue
  const { data: venue, error } = await supabase
    .from('venues')
    .select('name, contact_name, contact_email, city')
    .eq('id', venueId)
    .single();

  if (error || !venue) {
    return errorResponse('Venue not found', 404);
  }

  if (!venue.contact_email) {
    return errorResponse('Venue has no contact email', 400);
  }

  try {
    const draft = await draftFriendorEmail(
      supabase,
      userId,
      venue.name,
      venue.contact_name || undefined,
      venue.city || undefined,
    );

    if (!draft) {
      return errorResponse('Failed to generate email draft', 500);
    }

    return successResponse({
      to: venue.contact_email,
      subject: draft.subject,
      body: draft.body,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Draft generation failed',
      500,
    );
  }
}
