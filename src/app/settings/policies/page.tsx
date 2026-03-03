import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import PoliciesView from '@/components/policies/PoliciesView';

export const metadata = {
  title: 'Policies - Carolina Balloons HQ',
};

export default async function PoliciesPage() {
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
        <Header title="Policies" />
        <div className="flex-1 overflow-auto">
          <PoliciesView />
        </div>
      </main>
    </div>
  );
}
