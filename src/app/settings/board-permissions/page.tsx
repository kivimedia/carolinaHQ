import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/permissions';
import { UserRole } from '@/lib/types';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BoardPermissionsPicker from '@/components/settings/BoardPermissionsPicker';

export default async function BoardPermissionsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const userRole = (profile?.user_role || profile?.role || 'member') as UserRole;
  if (!isAdmin(userRole)) redirect('/dashboard');

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar initialBoards={boards || []} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header title="Board Permissions" />
        <BoardPermissionsPicker boards={boards || []} userRole={userRole} />
      </main>
    </div>
  );
}
