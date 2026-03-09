'use client';

import { useSkinContext } from '@/lib/skin-context';

interface SkinSwitchProps {
  classic: React.ReactNode;
  fun: React.ReactNode;
}

/**
 * Renders different content based on the active skin (classic vs fun).
 * Used in proposal pages to swap between the classic queue-based UI
 * and the fun Lovable-style UI.
 */
export default function SkinSwitch({ classic, fun }: SkinSwitchProps) {
  const { skin } = useSkinContext();
  return <>{skin === 'fun' ? fun : classic}</>;
}
