import { supabase } from "@/integrations/supabase/client";

export type AffiliateSettings = {
  id: number;
  commission_pct: number;
  cookie_days: number;
  min_payout: number;
  is_enabled: boolean;
  terms: string | null;
  updated_at: string;
};

export type Affiliate = {
  id: string;
  user_id: string;
  code: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  commission_pct: number | null;
  payout_method: string | null;
  payout_details: string | null;
  total_clicks: number;
  total_signups: number;
  total_orders: number;
  total_earned: number;
  total_paid: number;
  created_at: string;
  updated_at: string;
};

export type AffiliateCommission = {
  id: string;
  affiliate_id: string;
  order_id: string | null;
  order_total: number;
  commission_pct: number;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  notes: string | null;
  created_at: string;
};

export type AffiliatePayout = {
  id: string;
  affiliate_id: string;
  amount: number;
  method: string | null;
  details: string | null;
  status: "requested" | "processing" | "paid" | "rejected";
  txn_ref: string | null;
  admin_notes: string | null;
  created_at: string;
};

const REF_KEY = "aff_ref";
const REF_EXP_KEY = "aff_ref_exp";
const REF_PRODUCT_KEY = "aff_ref_product";

export function getRefCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const exp = Number(localStorage.getItem(REF_EXP_KEY) || 0);
    if (exp && exp < Date.now()) {
      localStorage.removeItem(REF_KEY);
      localStorage.removeItem(REF_EXP_KEY);
      localStorage.removeItem(REF_PRODUCT_KEY);
      return null;
    }
    return localStorage.getItem(REF_KEY);
  } catch { return null; }
}

export function getRefProduct(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(REF_PRODUCT_KEY); } catch { return null; }
}

export function setRefCode(code: string, days: number, productId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REF_KEY, code);
    localStorage.setItem(REF_EXP_KEY, String(Date.now() + days * 86400_000));
    if (productId) localStorage.setItem(REF_PRODUCT_KEY, productId);
    else localStorage.removeItem(REF_PRODUCT_KEY);
  } catch {}
}

export function clearRefCode() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REF_KEY);
    localStorage.removeItem(REF_EXP_KEY);
    localStorage.removeItem(REF_PRODUCT_KEY);
  } catch {}
}

/** Build an affiliate link. Includes exp so recipients get a fixed window (default 30 days). */
export function buildAffiliateLink(code: string, opts?: { productPath?: string; productId?: string; days?: number; origin?: string }) {
  const days = opts?.days ?? 30;
  const origin = opts?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const path = opts?.productPath || "/";
  const exp = Date.now() + days * 86400_000;
  const params = new URLSearchParams({ ref: code, exp: String(exp) });
  if (opts?.productId) params.set("p", opts.productId);
  const sep = path.includes("?") ? "&" : "?";
  return `${origin}${path}${sep}${params.toString()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getSettings(): Promise<AffiliateSettings> {
  // Public-safe fields via the security-invoker view (readable by anon)
  const { data: pub, error: pubErr } = await db
    .from("affiliate_settings_public")
    .select("id,is_enabled,commission_pct,cookie_days")
    .eq("id", 1)
    .maybeSingle();
  if (pubErr) throw pubErr;
  const base: AffiliateSettings = {
    id: pub?.id ?? 1,
    is_enabled: pub?.is_enabled ?? false,
    commission_pct: pub?.commission_pct ?? 0,
    cookie_days: pub?.cookie_days ?? 30,
    min_payout: 0,
    terms: null,
    updated_at: "",
  };
  // If signed in, fetch the full row (min_payout, terms) from the base table
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return base;
  const { data: full } = await db
    .from("affiliate_settings")
    .select("min_payout,terms,updated_at")
    .eq("id", 1)
    .maybeSingle();
  return { ...base, min_payout: full?.min_payout ?? 0, terms: full?.terms ?? null, updated_at: full?.updated_at ?? "" };
}

export async function updateSettings(patch: Partial<AffiliateSettings>) {
  const { error } = await db.from("affiliate_settings").update(patch).eq("id", 1);
  if (error) throw error;
}

export async function trackClick(code: string, productId?: string | null) {
  try {
    await db.rpc("track_affiliate_click", {
      _code: code,
      _path: typeof window !== "undefined" ? window.location.pathname : null,
      _ref: typeof document !== "undefined" ? document.referrer || null : null,
      _ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _product_id: productId ?? null,
    });
  } catch {}
}

export async function attributeOrder(orderId: string, code: string, productId?: string | null) {
  try {
    await db.rpc("attribute_order_to_affiliate", { _order_id: orderId, _code: code, _product_id: productId ?? null });
  } catch {}
}

export async function getMyAffiliate(): Promise<Affiliate | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
  return (data ?? null) as Affiliate | null;
}

export const affSlugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]/g, "").slice(0, 24) || `a${Date.now().toString(36)}`;

export async function joinAffiliate(code: string, payout_method?: string, payout_details?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { data, error } = await db.from("affiliates").insert({
    user_id: user.id,
    code: affSlugify(code),
    status: "pending",
    payout_method: payout_method ?? null,
    payout_details: payout_details ?? null,
  }).select().single();
  if (error) throw error;
  return data as Affiliate;
}

export async function updateMyPayout(payout_method: string, payout_details: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { error } = await db.from("affiliates").update({ payout_method, payout_details }).eq("user_id", user.id);
  if (error) throw error;
}

export async function listMyCommissions(affId: string) {
  const { data } = await db.from("affiliate_commissions").select("*").eq("affiliate_id", affId).order("created_at", { ascending: false });
  return (data ?? []) as AffiliateCommission[];
}
export async function listMyPayouts(affId: string) {
  const { data } = await db.from("affiliate_payouts").select("*").eq("affiliate_id", affId).order("created_at", { ascending: false });
  return (data ?? []) as AffiliatePayout[];
}
export async function requestPayout(affId: string, amount: number, method: string, details: string) {
  const { error } = await db.from("affiliate_payouts").insert({ affiliate_id: affId, amount, method, details, status: "requested" });
  if (error) throw error;
}

// Admin
export async function adminListAffiliates(status?: string): Promise<Affiliate[]> {
  let q = db.from("affiliates").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Affiliate[];
}
export async function adminUpdateAffiliate(id: string, patch: Partial<Pick<Affiliate, "status" | "commission_pct">>) {
  const { error } = await db.from("affiliates").update(patch).eq("id", id);
  if (error) throw error;
}
export async function adminListCommissions(status?: string) {
  let q = db.from("affiliate_commissions").select("*, affiliates(code, user_id)").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as (AffiliateCommission & { affiliates: { code: string; user_id: string } | null })[];
}
export async function adminUpdateCommission(id: string, status: AffiliateCommission["status"], notes?: string) {
  const { error } = await db.from("affiliate_commissions").update({ status, notes: notes ?? null }).eq("id", id);
  if (error) throw error;
}
export async function adminListPayouts(status?: string) {
  let q = db.from("affiliate_payouts").select("*, affiliates(code, user_id)").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as (AffiliatePayout & { affiliates: { code: string; user_id: string } | null })[];
}
export async function adminUpdatePayout(id: string, patch: Partial<Pick<AffiliatePayout, "status" | "txn_ref" | "admin_notes">>) {
  const { error } = await db.from("affiliate_payouts").update(patch).eq("id", id);
  if (error) throw error;
}

export type AffiliateClick = {
  id: string; affiliate_id: string; landing_path: string | null;
  referer: string | null; user_agent: string | null; product_id: string | null; created_at: string;
};
export async function adminListClicks(affiliateId?: string, limit = 200): Promise<AffiliateClick[]> {
  let q = db.from("affiliate_clicks").select("*").order("created_at", { ascending: false }).limit(limit);
  if (affiliateId) q = q.eq("affiliate_id", affiliateId);
  const { data } = await q;
  return (data ?? []) as AffiliateClick[];
}
export async function adminDeleteAffiliate(id: string) {
  const { error } = await db.from("affiliates").delete().eq("id", id);
  if (error) throw error;
}
export async function adminAddCommission(affiliate_id: string, amount: number, notes: string) {
  const { error } = await db.from("affiliate_commissions").insert({
    affiliate_id, order_total: 0, commission_pct: 0, amount, status: "approved", notes,
  });
  if (error) throw error;
}
export async function adminListAffiliateCommissions(affiliate_id: string) {
  const { data } = await db.from("affiliate_commissions").select("*").eq("affiliate_id", affiliate_id).order("created_at", { ascending: false });
  return (data ?? []) as AffiliateCommission[];
}
export async function adminListAffiliatePayouts(affiliate_id: string) {
  const { data } = await db.from("affiliate_payouts").select("*").eq("affiliate_id", affiliate_id).order("created_at", { ascending: false });
  return (data ?? []) as AffiliatePayout[];
}

