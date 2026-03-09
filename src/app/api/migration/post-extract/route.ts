import { NextRequest } from 'next/server';
import { getAuthContext, successResponse, errorResponse } from '@/lib/api-helpers';
import { runPostMigrationExtraction } from '@/lib/trello-post-migration';

/**
 * POST /api/migration/post-extract
 * Run post-migration extraction on all boards.
 * Extracts client_email, client_phone, estimated_value, event_date
 * from card titles and descriptions.
 */
export async function POST(_request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth.ok) return auth.response;

  const { supabase } = auth.ctx;

  // Get all boards
  const { data: boards } = await supabase
    .from('boards')
    .select('id, name')
    .order('created_at');

  if (!boards || boards.length === 0) {
    return errorResponse('No boards found', 404);
  }

  const results: { board: string; cardsProcessed: number; cardsUpdated: number; errors: string[] }[] = [];

  for (const board of boards) {
    const result = await runPostMigrationExtraction(supabase, board.id);
    results.push({
      board: board.name,
      ...result,
    });
  }

  const totalProcessed = results.reduce((s, r) => s + r.cardsProcessed, 0);
  const totalUpdated = results.reduce((s, r) => s + r.cardsUpdated, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

  return successResponse({
    totalProcessed,
    totalUpdated,
    totalErrors,
    boards: results,
  });
}
