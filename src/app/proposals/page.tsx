import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import SkinSwitch from '@/components/SkinSwitch';
import FunDashboard from '@/components/fun-proposals/FunDashboard';
import ClassicDashboard from '@/components/classic-proposals/ClassicDashboard';

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
          classic={<ClassicDashboard />}
          fun={<FunDashboard />}
        />
      </main>
    </div>
  );
}
