import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import SkinSwitch from '@/components/SkinSwitch';
import FunProductEditor from '@/components/fun-proposals/FunProductEditor';
import ClassicProductEditor from '@/components/classic-proposals/ClassicProductEditor';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
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
          classic={<ClassicProductEditor productId={id} />}
          fun={<FunProductEditor productId={id} />}
        />
      </main>
    </div>
  );
}
