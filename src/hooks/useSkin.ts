'use client';

import { useEffect, useState, useCallback } from 'react';

export type Skin = 'classic' | 'fun';

const SKIN_KEY = 'cb-hq-skin';

function getStoredSkin(): Skin {
  if (typeof window === 'undefined') return 'fun';
  return (localStorage.getItem(SKIN_KEY) as Skin) || 'fun';
}

export function useSkin() {
  const [skin, setSkinState] = useState<Skin>('fun');

  useEffect(() => {
    setSkinState(getStoredSkin());
  }, []);

  const setSkin = useCallback((newSkin: Skin) => {
    setSkinState(newSkin);
    localStorage.setItem(SKIN_KEY, newSkin);
  }, []);

  return { skin, setSkin };
}
