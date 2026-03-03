import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import RevenueReportView from '@/components/reports/RevenueReportView';

export const metadata = {
  title: 'Revenue Report - Carolina Balloons HQ',
};

export default async function RevenueReportPage() {
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
        <Header title="Revenue Report" />
        <div className="flex-1 overflow-auto">
          <RevenueReportView />
        </div>
      </main>
    </div>
  );
}
