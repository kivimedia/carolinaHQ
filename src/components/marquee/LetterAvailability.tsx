'use client';

import type { LetterAvailability as LetterAvailabilityType } from '@/hooks/use-marquee';

interface Props {
  lettersNeeded: Record<string, number>;
  availability: LetterAvailabilityType[];
  loading?: boolean;
}

export default function LetterAvailability({ lettersNeeded, availability, loading }: Props) {
  if (Object.keys(lettersNeeded).length === 0) return null;

  const availMap = new Map(availability.map((a) => [a.character, a]));

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-navy/50 dark:text-slate-400 uppercase tracking-wider">
        Letters needed
      </p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(lettersNeeded)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([char, needed]) => {
            const info = availMap.get(char);
            const available = info ? info.available : 0;
            const owned = info ? info.owned : 0;
            const ok = available >= needed;
            const unknown = !info && !loading;

            return (
              <div
                key={char}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                  ${loading
                    ? 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400'
                    : ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                      : unknown
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                  }
                `}
              >
                <span className="font-bold text-base">{char}</span>
                {needed > 1 && <span className="text-xs opacity-70">x{needed}</span>}
                {!loading && (
                  <span className="text-xs">
                    {ok ? `(${available} avail)` : unknown ? '(?)' : `(${available}/${owned})`}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
