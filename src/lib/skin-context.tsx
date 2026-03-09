'use client';

import { createContext, useContext } from 'react';
import { useSkin, type Skin } from '@/hooks/useSkin';

export type { Skin };

interface SkinContextValue {
  skin: Skin;
  setSkin: (skin: Skin) => void;
}

const SkinContext = createContext<SkinContextValue>({
  skin: 'fun',
  setSkin: () => {},
});

export function SkinProvider({ children }: { children: React.ReactNode }) {
  const skinHook = useSkin();

  return (
    <SkinContext.Provider value={skinHook}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkinContext() {
  return useContext(SkinContext);
}
