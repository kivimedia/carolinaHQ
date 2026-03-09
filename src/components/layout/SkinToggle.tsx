'use client';

import { useSkinContext, type Skin } from '@/lib/skin-context';

const SKIN_OPTIONS: { value: Skin; label: string; icon: string }[] = [
  { value: 'classic', label: 'Classic', icon: '📋' },
  { value: 'fun', label: 'Fun', icon: '🎈' },
];

export default function SkinToggle() {
  const { skin, setSkin } = useSkinContext();

  return (
    <div className="flex items-center gap-0.5 bg-cream-dark dark:bg-white/10 rounded-lg p-0.5">
      {SKIN_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => setSkin(option.value)}
          className={`
            px-2 py-1 rounded-md text-xs font-medium transition-all
            ${skin === option.value
              ? 'bg-white dark:bg-white/20 text-navy dark:text-white shadow-sm'
              : 'text-navy/40 dark:text-white/40 hover:text-navy/60 dark:hover:text-white/60'
            }
          `}
          title={option.label}
        >
          {option.icon} {option.label}
        </button>
      ))}
    </div>
  );
}
