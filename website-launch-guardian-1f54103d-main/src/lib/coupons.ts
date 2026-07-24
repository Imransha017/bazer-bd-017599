import { supabase } from "@/integrations/supabase/client";

export type AppliedCoupon = {
  code: string;
  discount: number;
};

export type CartItemLite = { id: string; price: number; qty: number };

export async function validateCoupon(
  code: string,
  subtotal: number,
  items?: CartItemLite[],
): Promise<{ ok: true; applied: AppliedCoupon } | { ok: false; error: string }> {
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, error: "Enter a coupon code" };

  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{
      data: { ok: boolean; code?: string; discount?: number; error?: string } | null;
      error: { message: string } | null;
    }>;
  }).rpc("validate_coupon", {
    _code: c,
    _subtotal: subtotal,
    _items: items ?? null,
  });
  if (error) return { ok: false, error: error.message };
  if (!data || !data.ok) return { ok: false, error: data?.error ?? "Invalid coupon code" };
  return { ok: true, applied: { code: data.code!, discount: Number(data.discount ?? 0) } };
}
