import FunPublicProposal from '@/components/fun-proposals/FunPublicProposal';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Public proposal page - no auth required.
 * Accessible at /p/{proposalId} for client viewing and acceptance.
 */
export default async function PublicProposalPage({ params }: Props) {
  const { id } = await params;

  return <FunPublicProposal proposalId={id} />;
}
