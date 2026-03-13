import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import SkinSwitch from '@/components/SkinSwitch';
import FunOptions from '@/components/fun-proposals/FunOptions';
import ClassicOptions from '@/components/classic-proposals/ClassicOptions';

export default async function OptionsPage() {
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
          classic={<ClassicOptions />}
          fun={<FunOptions />}
        />
      </main>
    </div>
  );
}
