import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export const metadata = {
  title: 'Performance - Carolina Balloons HQ',
};

export default async function PerformancePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar initialBoards={boards || []} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Performance" />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-muted-foreground">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <h2 className="text-lg font-semibold text-foreground">Performance Dashboard</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Track team productivity, task completion rates, and workflow efficiency. Coming soon.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
