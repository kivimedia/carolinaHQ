import { getAuthContext, successResponse, errorResponse } from '@/lib/api-helpers';
import { getUpcomingFollowUps } from '@/lib/follow-up-engine';

export async function GET() {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase } = auth.ctx;

  try {
    // Get follow-ups for the next 30 days + all overdue
    const followUps = await getUpcomingFollowUps(supabase, { daysAhead: 30 });
    return successResponse({ followUps });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  }
}
