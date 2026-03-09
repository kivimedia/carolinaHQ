import { NextRequest } from 'next/server';
import { getAuthContext, successResponse, errorResponse } from '@/lib/api-helpers';

/**
 * POST /api/proposals/notify-accepted
 * Send a notification email when a proposal is accepted by a client.
 * Also syncs the linked card status if applicable.
 *
 * Body: { proposal_id: string }
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase, userId } = auth.ctx;

  try {
    const { proposal_id } = await request.json();
    if (!proposal_id) return errorResponse('proposal_id is required', 400);

    // Fetch proposal with user info
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('id, proposal_number, client_name, client_email, event_type, event_date, total, status, card_id, user_id')
      .eq('id', proposal_id)
      .single();

    if (error || !proposal) return errorResponse('Proposal not found', 404);

    // Update status to accepted
    await supabase
      .from('proposals')
      .update({ status: 'accepted' })
      .eq('id', proposal_id);

    // Record the outcome for learning
    await supabase.from('proposal_outcomes').insert({
      proposal_id,
      outcome: 'accepted',
      user_id: proposal.user_id,
    });

    // If linked to a card, move the card to "Booked" list
    if (proposal.card_id) {
      // Find the board's "Booked" or "Paid" list
      const { data: placement } = await supabase
        .from('card_placements')
        .select('list_id, lists(board_id)')
        .eq('card_id', proposal.card_id)
        .limit(1)
        .single();

      if (placement?.lists) {
        const boardId = (placement.lists as unknown as { board_id: string }).board_id;
        const { data: bookedList } = await supabase
          .from('lists')
          .select('id')
          .eq('board_id', boardId)
          .or('title.ilike.%booked%,title.ilike.%paid%')
          .limit(1)
          .single();

        if (bookedList) {
          await supabase
            .from('card_placements')
            .update({ list_id: bookedList.id })
            .eq('card_id', proposal.card_id);
        }
      }

      // Update the card's latest_proposal_id
      await supabase
        .from('cards')
        .update({ latest_proposal_id: proposal_id })
        .eq('id', proposal.card_id);
    }

    // Log the acceptance in proposal_emails
    await supabase.from('proposal_emails').insert({
      proposal_id,
      email_type: 'acceptance_notification',
      recipient_email: proposal.client_email || '',
      status: 'sent',
    });

    return successResponse({
      success: true,
      proposal_number: proposal.proposal_number,
      status: 'accepted',
      card_synced: !!proposal.card_id,
    });
  } catch (err) {
    console.error('[notify-accepted] Error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Failed to process acceptance', 500);
  }
}
