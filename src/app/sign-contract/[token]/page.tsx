import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import SignContractView from '@/components/contracts/SignContractView';

export const metadata = {
  title: 'Sign Contract - Carolina Balloons',
};

export const dynamic = 'force-dynamic';

export default async function SignContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServerSupabaseClient();

  // Fetch signature record by token
  const { data: signature, error } = await supabase
    .from('contract_signatures')
    .select(`
      *,
      rental_projects (
        *,
        rental_clients (*),
        rental_project_items (*)
      )
    `)
    .eq('token', token)
    .maybeSingle();

  if (error || !signature) {
    notFound();
  }

  // Check if expired or already signed
  if (signature.status === 'revoked') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Revoked</h1>
          <p className="text-gray-600">This contract signing link has been revoked. Please contact the business for a new link.</p>
        </div>
      </div>
    );
  }

  if (signature.expires_at && new Date(signature.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600">This contract signing link has expired. Please contact the business for a new link.</p>
        </div>
      </div>
    );
  }

  return <SignContractView signature={signature} />;
}
