import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ProposalsPageContent from '@/components/proposals/ProposalsPageContent';
import SkinSwitch from '@/components/SkinSwitch';
import FunDashboard from '@/components/fun-proposals/FunDashboard';

export default async function ProposalsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar initialBoards={boards || []} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <SkinSwitch
          classic={
            <>
              <Header title="Proposals" />
              <ProposalsPageContent />
            </>
          }
          fun={<FunDashboard />}
        />
      </main>
    </div>
  );
}
