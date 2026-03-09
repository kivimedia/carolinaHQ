'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export interface PricingRule {
  id: string;
  name: string;
  rule_type: string;
  conditions: Record<string, unknown>;
  value: number;
  value_type: string;
  is_active: boolean;
  priority: number;
}

export function usePricingRules() {
  return useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async (): Promise<PricingRule[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .order('priority');

      if (error) throw error;
      return (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        rule_type: r.rule_type,
        conditions: (r.conditions as Record<string, unknown>) || {},
        value: r.value,
        value_type: r.value_type,
        is_active: r.is_active ?? true,
        priority: r.priority || 0,
      }));
    },
  });
}

export function calculateDeliveryFee(rules: PricingRule[], zoneName?: string): number {
  const deliveryRules = rules.filter((r) => r.rule_type === 'delivery' && r.is_active);
  if (zoneName) {
    const match = deliveryRules.find(
      (r) => (r.conditions as { zone_name?: string }).zone_name === zoneName
    );
    if (match) return match.value;
  }
  return deliveryRules[0]?.value || 25;
}

export function calculateSurcharges(rules: PricingRule[], subtotal: number): Array<{ name: string; amount: number }> {
  const surcharges: Array<{ name: string; amount: number }> = [];
  const activeRules = rules.filter((r) => r.rule_type === 'surcharge' && r.is_active);

  for (const rule of activeRules) {
    const amount = rule.value_type === 'percent' ? subtotal * (rule.value / 100) : rule.value;
    surcharges.push({ name: rule.name, amount });
  }

  return surcharges;
}
