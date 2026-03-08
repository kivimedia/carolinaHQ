import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ProposalBuilderShell from '@/components/proposals/builder/ProposalBuilderShell';

export default async function ProposalBuilderPage() {
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
        <Header title="Proposal Builder" backHref="/proposals" />
        <div className="flex-1 overflow-hidden">
          <ProposalBuilderShell />
        </div>
      </main>
    </div>
  );
}
