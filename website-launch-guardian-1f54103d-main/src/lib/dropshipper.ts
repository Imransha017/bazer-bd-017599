import { supabase } from "@/integrations/supabase/client";

export type Dropshipper = {
  id: string;
  user_id: string;
  code: string;
  store_name: string;
  store_slug: string;
  bio: string | null;
  phone: string;
  whatsapp: string | null;
  payout_method: string;
  payout_number: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason: string | null;
  logo_url: string | null;
  banner_url: string | null;
  total_orders: number;
  total_earned: number;
  total_paid: number;
  created_at: string;
  updated_at: string;
};

export type DropshipperProduct = {
  id: string;
  dropshipper_id: string;
  product_id: string;
  retail_price: number;
  custom_title: string | null;
  custom_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DropshipperEarning = {
  id: string;
  dropshipper_id: string;
  order_id: string;
  product_id: string | null;
  base_price: number;
  retail_price: number;
  qty: number;
  profit: number;
  status: "pending" | "approved" | "rejected" | "paid";
  created_at: string;
};

export type DropshipperPayout = {
  id: string;
  dropshipper_id: string;
  amount: number;
  method: string;
  account: string;
  status: "requested" | "processing" | "paid" | "rejected";
  admin_note: string | null;
  txn_reference: string | null;
  created_at: string;
  paid_at: string | null;
};

const DS_KEY = "ds_ref";
const DS_EXP_KEY = "ds_ref_exp";
export const DS_MIN_PAYOUT = 500;

export function getDsCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const exp = Number(localStorage.getItem(DS_EXP_KEY) || 0);
    if (exp && exp < Date.now()) {
      localStorage.removeItem(DS_KEY);
      localStorage.removeItem(DS_EXP_KEY);
      return null;
    }
    return localStorage.getItem(DS_KEY);
  } catch { return null; }
}

export function setDsCode(code: string, days = 30) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DS_KEY, code);
    localStorage.setItem(DS_EXP_KEY, String(Date.now() + days * 86400_000));
  } catch { /* ignore */ }
}

export function clearDsCode() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DS_KEY);
    localStorage.removeItem(DS_EXP_KEY);
  } catch { /* ignore */ }
}

export function buildDsLink(slug: string, opts?: { origin?: string }) {
  const origin = opts?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin}/ds/${slug}`;
}

export const dsSlugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || `s${Date.now().toString(36)}`;

export const dsCodeify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || `d${Date.now().toString(36)}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function getMyDropshipper(): Promise<Dropshipper | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("dropshippers").select("*").eq("user_id", user.id).maybeSingle();
  return (data ?? null) as Dropshipper | null;
}

export async function applyAsDropshipper(input: {
  store_name: string;
  phone: string;
  whatsapp?: string;
  bio?: string;
  payout_method: string;
  payout_number: string;
}): Promise<Dropshipper> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in first");
  const base = dsSlugify(input.store_name);
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const code = dsCodeify(input.store_name) + Math.random().toString(36).slice(2, 5);
  const { data, error } = await db.from("dropshippers").insert({
    user_id: user.id,
    code,
    store_name: input.store_name.trim(),
    store_slug: slug,
    bio: input.bio?.trim() || null,
    phone: input.phone.trim(),
    whatsapp: input.whatsapp?.trim() || null,
    payout_method: input.payout_method,
    payout_number: input.payout_number.trim(),
    status: "pending",
  }).select().single();
  if (error) throw error;
  return data as Dropshipper;
}

export async function updateMyDropshipper(patch: Partial<Pick<Dropshipper, "store_name" | "bio" | "phone" | "whatsapp" | "payout_method" | "payout_number" | "logo_url" | "banner_url">>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { error } = await db.from("dropshippers").update(patch).eq("user_id", user.id);
  if (error) throw error;
}

export async function listMyImports(dsId: string) {
  const { data } = await db.from("dropshipper_products")
    .select("*")
    .eq("dropshipper_id", dsId)
    .order("created_at", { ascending: false });
  return (data ?? []) as DropshipperProduct[];
}

export async function importProduct(dsId: string, product_id: string, retail_price: number, custom_title?: string) {
  const { error } = await db.from("dropshipper_products").insert({
    dropshipper_id: dsId,
    product_id,
    retail_price,
    custom_title: custom_title || null,
    is_active: true,
  });
  if (error) throw error;
}

export async function updateImport(id: string, patch: Partial<Pick<DropshipperProduct, "retail_price" | "custom_title" | "custom_description" | "is_active">>) {
  const { error } = await db.from("dropshipper_products").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeImport(id: string) {
  const { error } = await db.from("dropshipper_products").delete().eq("id", id);
  if (error) throw error;
}

export type ImportWithProduct = {
  imp: DropshipperProduct;
  product: {
    id: string; name: string; price: number; mrp?: number; image?: string;
    gallery?: string[]; description?: string; short_description?: string;
    category_name?: string; rating?: number; sold?: number; vendor_id?: string | null;
    sku?: string; stock?: number; weight?: number; warranty?: string; tags?: string[];
    sizes?: string[]; colors?: { name: string; hex?: string; image?: string; sku?: string; stock?: number }[];
    variants?: { name: string; price?: number; sku?: string; stock?: number; image?: string }[];
  };
};

export async function getMyImportWithProduct(importId: string): Promise<ImportWithProduct | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ds } = await db.from("dropshippers").select("id").eq("user_id", user.id).maybeSingle();
  if (!ds) return null;
  const { data: imp } = await db.from("dropshipper_products").select("*").eq("id", importId).eq("dropshipper_id", ds.id).maybeSingle();
  if (!imp) return null;
  const { data: p } = await db.from("products")
    .select("id,name,price,mrp,image,gallery,description,short_description,category_name,rating,sold,vendor_id,sku,stock,weight,warranty,tags,sizes,colors,variants")
    .eq("id", imp.product_id).maybeSingle();
  if (!p) return null;
  return { imp: imp as DropshipperProduct, product: p };
}

export type RelatedImport = {
  imp: DropshipperProduct;
  product: { id: string; name: string; price: number; mrp?: number; image?: string; rating?: number; tags?: string[] };
  overlap: number;
  discount: number;
  profit: number;
};

// In-memory cache for related products lookups (per session).
// Avoids refetching + re-scoring on repeat visits within TTL.
const RELATED_TTL_MS = 60_000;
type RelatedCacheEntry = { at: number; data: RelatedImport[] };
const relatedCache = new Map<string, RelatedCacheEntry>();
const relatedInflight = new Map<string, Promise<RelatedImport[]>>();

export function clearRelatedImportsCache() {
  relatedCache.clear();
  relatedInflight.clear();
}

export async function getMyRelatedImportsByTags(dsId: string, currentImportId: string, tags: string[], limit = 8): Promise<RelatedImport[]> {
  if (!tags?.length) return [];
  const normTags = [...new Set(tags.map(t => String(t).toLowerCase()))].sort();
  const key = `${dsId}|${currentImportId}|${limit}|${normTags.join(",")}`;

  const cached = relatedCache.get(key);
  if (cached && Date.now() - cached.at < RELATED_TTL_MS) return cached.data;

  const pending = relatedInflight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<RelatedImport[]> => {
    const { data: prods } = await db.from("products")
      .select("id,name,price,mrp,image,rating,tags")
      .overlaps("tags", tags)
      .limit(60);
    const prodIds = (prods ?? []).map((p: any) => p.id);
    if (!prodIds.length) return [];
    const { data: imps } = await db.from("dropshipper_products")
      .select("*")
      .eq("dropshipper_id", dsId)
      .eq("is_active", true)
      .in("product_id", prodIds)
      .neq("id", currentImportId);
    const map = new Map((prods ?? []).map((p: any) => [p.id, p]));
    const tagSet = new Set(normTags);
    type Scored = { imp: DropshipperProduct; product: any; overlap: number; discount: number; profit: number };
    const scored: Scored[] = [];
    for (const i of (imps ?? []) as any[]) {
      const product = map.get(i.product_id) as any;
      if (!product) continue;
      const pTags: string[] = (product.tags ?? []).map((t: string) => String(t).toLowerCase());
      const overlap = pTags.reduce((n, t) => n + (tagSet.has(t) ? 1 : 0), 0);
      const retail = Number(i.retail_price || 0);
      const mrp = Number(product.mrp || 0);
      const base = Number(product.price || 0);
      const discount = mrp > retail && mrp > 0 ? (mrp - retail) / mrp : 0;
      const profit = Math.max(0, retail - base);
      scored.push({ imp: i as DropshipperProduct, product, overlap, discount, profit });
    }
    scored.sort((a, b) => (b.overlap - a.overlap) || (b.discount - a.discount) || (b.profit - a.profit));
    return scored.slice(0, limit).map(({ imp, product, overlap, discount, profit }) => ({ imp, product, overlap, discount, profit }));
  })();

  relatedInflight.set(key, promise);
  try {
    const data = await promise;
    relatedCache.set(key, { at: Date.now(), data });
    return data;
  } finally {
    relatedInflight.delete(key);
  }
}

export async function getOrderById(orderId: string) {
  const { data } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  return data;
}


export async function listMyEarnings(dsId: string) {
  const { data } = await db.from("dropshipper_earnings")
    .select("*")
    .eq("dropshipper_id", dsId)
    .order("created_at", { ascending: false });
  return (data ?? []) as DropshipperEarning[];
}

export async function listMyPayouts(dsId: string) {
  const { data } = await db.from("dropshipper_payouts")
    .select("*")
    .eq("dropshipper_id", dsId)
    .order("created_at", { ascending: false });
  return (data ?? []) as DropshipperPayout[];
}

export async function requestPayout(dsId: string, amount: number, method: string, account: string) {
  const { error } = await db.from("dropshipper_payouts").insert({
    dropshipper_id: dsId, amount, method, account, status: "requested",
  });
  if (error) throw error;
}

export async function trackDsClick(code: string, productId?: string | null) {
  try {
    await db.rpc("track_dropshipper_click", {
      _code: code,
      _path: typeof window !== "undefined" ? window.location.pathname : null,
      _ref: typeof document !== "undefined" ? document.referrer || null : null,
      _ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _product_id: productId ?? null,
    });
  } catch { /* ignore */ }
}

export async function attributeOrderToDs(orderId: string, code: string, lines: Array<{ product_id: string; base_price: number; retail_price: number; qty: number }>) {
  const { error } = await db.rpc("attribute_order_to_dropshipper", { _order_id: orderId, _code: code, _lines: lines });
  if (error) throw new Error(error.message);
}

// Public store fetch — reads only safe storefront fields via the public view
export async function getPublicStore(slug: string) {
  const { data: ds } = await db
    .from("dropshippers_public")
    .select("id,code,store_name,store_slug,logo_url,banner_url,bio,status")
    .eq("store_slug", slug)
    .maybeSingle();
  if (!ds) return null;
  const { data: imports } = await db.from("dropshipper_products").select("*").eq("dropshipper_id", ds.id).eq("is_active", true);
  const ids = (imports ?? []).map((i: DropshipperProduct) => i.product_id);
  if (!ids.length) return { ds: ds as Dropshipper, items: [] };
  const { data: products } = await db.from("products").select("id,slug,name,price,image,gallery,description,category_slug,category_name").in("id", ids).eq("is_active", true);
  const pMap = new Map((products ?? []).map((p: { id: string }) => [p.id, p]));
  const items = (imports as DropshipperProduct[]).map(i => ({ ...i, product: pMap.get(i.product_id) })).filter(x => x.product);
  return { ds: ds as Dropshipper, items };
}

// Admin
export async function adminListDropshippers(status?: string) {
  let q = db.from("dropshippers").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Dropshipper[];
}

export async function adminUpdateDropshipper(id: string, patch: Partial<Pick<Dropshipper, "status" | "rejection_reason">>) {
  const { error } = await db.from("dropshippers").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminListPayouts(status?: string) {
  let q = db.from("dropshipper_payouts").select("*, dropshippers(store_name, code)").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as (DropshipperPayout & { dropshippers: { store_name: string; code: string } | null })[];
}

export async function adminUpdatePayout(id: string, patch: Partial<Pick<DropshipperPayout, "status" | "admin_note" | "txn_reference">>) {
  const body = { ...patch, ...(patch.status === "paid" ? { paid_at: new Date().toISOString() } : {}) };
  const { error } = await db.from("dropshipper_payouts").update(body).eq("id", id);
  if (error) throw error;
}

// ---------- Dropshipping program settings & announcements ----------

export type DropshippingSettings = {
  id: number;
  is_enabled: boolean;
  default_commission_pct: number;
  min_payout: number;
  cookie_days: number;
  auto_approve_apps: boolean;
  auto_approve_earnings: boolean;
  allowed_payout_methods: string[];
  terms_md: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
};

export type DropshippingAnnouncement = {
  id: string;
  title: string;
  body_md: string | null;
  tone: "info" | "success" | "warning" | "danger";
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export async function getDropshippingSettings(): Promise<DropshippingSettings | null> {
  const { data } = await db.from("dropshipping_settings").select("*").eq("id", 1).maybeSingle();
  return (data ?? null) as DropshippingSettings | null;
}

export async function adminUpdateSettings(patch: Partial<Omit<DropshippingSettings, "id">>) {
  const { error } = await db.from("dropshipping_settings").update(patch).eq("id", 1);
  if (error) throw error;
}

export async function listAnnouncements(): Promise<DropshippingAnnouncement[]> {
  const { data } = await db.from("dropshipping_announcements").select("*").order("created_at", { ascending: false });
  return (data ?? []) as DropshippingAnnouncement[];
}

export async function adminCreateAnnouncement(a: Omit<DropshippingAnnouncement, "id" | "created_at">) {
  const { error } = await db.from("dropshipping_announcements").insert(a);
  if (error) throw error;
}

export async function adminUpdateAnnouncement(id: string, patch: Partial<Omit<DropshippingAnnouncement, "id" | "created_at">>) {
  const { error } = await db.from("dropshipping_announcements").update(patch).eq("id", id);
  if (error) throw error;
}

export async function adminDeleteAnnouncement(id: string) {
  const { error } = await db.from("dropshipping_announcements").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Payout RPC ----------
export async function requestPayoutRpc(amount: number, method: string, account: string) {
  const { data, error } = await db.rpc("request_dropshipper_payout", { _amount: amount, _method: method, _account: account });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function adminAdjustEarning(id: string, status: DropshipperEarning["status"]) {
  const { error } = await db.rpc("admin_adjust_dropshipper_earning", { _id: id, _status: status });
  if (error) throw new Error(error.message);
}

export async function adminMarkPayoutPaid(id: string, txnRef: string) {
  const { error } = await db.rpc("mark_dropshipper_payout_paid", { _id: id, _txn_reference: txnRef });
  if (error) throw new Error(error.message);
}

// ---------- Admin earnings listing ----------
export async function adminListEarnings(status?: string) {
  let q = db.from("dropshipper_earnings").select("*, dropshippers(store_name, code)").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as (DropshipperEarning & { dropshippers: { store_name: string; code: string } | null })[];
}

