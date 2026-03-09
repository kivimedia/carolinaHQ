import { redirect } from 'next/navigation';

/**
 * Catch-all redirect: /boards/[id] -> /board/[id]
 * Prevents 404s from old links, bookmarks, or external references.
 */
export default function BoardsRedirect({ params }: { params: { id: string } }) {
  redirect(`/board/${params.id}`);
}
