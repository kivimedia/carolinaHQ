import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import SkinSwitch from '@/components/SkinSwitch';
import FunProducts from '@/components/fun-proposals/FunProducts';

export default async function ProductsPage() {
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
              <Header title="Products" />
              <div className="flex-1 overflow-auto p-6">
                <p className="text-navy/40 dark:text-slate-400">Switch to Fun mode for the full product catalog.</p>
              </div>
            </>
          }
          fun={<FunProducts />}
        />
      </main>
    </div>
  );
}
