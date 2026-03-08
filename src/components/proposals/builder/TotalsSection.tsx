'use client';

import { useEffect, useState, useMemo } from 'react';
import type { LineItem } from './LineItemsTable';

interface PricingRule {
  id: string;
  name: string;
  rule_type: string;
  conditions: Record<string, unknown>;
  value: number;
  is_active: boolean;
}

interface Surcharge {
  label: string;
  amount: number;
  ruleId: string;
}

interface TotalsSectionProps {
  items: LineItem[];
  venueCity: string;
  onSave: () => void;
  onPreviewPdf: () => void;
  saving: boolean;
  isDirty: boolean;
  surcharges: Surcharge[];
  onSurchargesChange: (surcharges: Surcharge[]) => void;
}

export default function TotalsSection({
  items,
  venueCity,
  onSave,
  onPreviewPdf,
  saving,
  isDirty,
  surcharges,
  onSurchargesChange,
}: TotalsSectionProps) {
  const [rules, setRules] = useState<PricingRule[]>([]);

  useEffect(() => {
    fetch('/api/pricing-rules')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setRules(res.data.filter((r: PricingRule) => r.is_active));
      })
      .catch(() => {});
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  // Apply pricing rules whenever subtotal or venueCity changes
  useEffect(() => {
    const newSurcharges: Surcharge[] = [];
    const cityLower = venueCity.toLowerCase().trim();

    for (const rule of rules) {
      if (rule.rule_type === 'minimum_charge') {
        if (subtotal > 0 && subtotal < rule.value) {
          newSurcharges.push({
            label: `Minimum charge (${rule.name})`,
            amount: rule.value - subtotal,
            ruleId: rule.id,
          });
        }
      } else if (rule.rule_type === 'mileage_surcharge' && cityLower) {
        const cities = (rule.conditions.cities as string[]) || [];
        if (cities.some((c) => c.toLowerCase() === cityLower)) {
          newSurcharges.push({
            label: rule.name,
            amount: rule.value,
            ruleId: rule.id,
          });
        }
      }
    }

    // Only update if surcharges actually changed
    const prevIds = surcharges.map((s) => s.ruleId).sort().join(',');
    const newIds = newSurcharges.map((s) => s.ruleId).sort().join(',');
    if (prevIds !== newIds) {
      onSurchargesChange(newSurcharges);
    }
  }, [subtotal, venueCity, rules]);

  const surchargeTotal = surcharges.reduce((sum, s) => sum + s.amount, 0);
  const grandTotal = subtotal + surchargeTotal;

  return (
    <div className="border border-cream-dark dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        {/* Totals breakdown */}
        <div className="space-y-1.5 min-w-[220px]">
          <div className="flex justify-between text-sm text-navy dark:text-slate-200">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {surcharges.map((surcharge) => (
            <div key={surcharge.ruleId} className="flex justify-between text-xs text-navy/60 dark:text-slate-400">
              <span>{surcharge.label}</span>
              <span>+${surcharge.amount.toFixed(2)}</span>
            </div>
          ))}

          <div className="border-t border-cream-dark dark:border-slate-600 pt-1.5 flex justify-between text-sm font-bold text-navy dark:text-white">
            <span>Total</span>
            <span className="text-cb-pink">${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving || !isDirty}
            className="px-4 py-2 text-xs font-medium rounded-md border border-cream-dark dark:border-slate-600 text-navy dark:text-white hover:bg-cream dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={onPreviewPdf}
            disabled={items.length === 0}
            className="px-4 py-2 text-xs font-medium rounded-md bg-cb-pink text-white hover:bg-cb-pink/90 disabled:opacity-40 transition-colors"
          >
            Preview PDF
          </button>
        </div>
      </div>
    </div>
  );
}
