import { supabase } from "@/integrations/supabase/client";

export type VendorFooterLink = { label: string; url: string };
export type VendorFooter = {
  about?: string;
  logo_url?: string | null;
  phone?: string;
  email?: string;
  address?: string;
  links?: VendorFooterLink[];
  social?: { facebook?: string; instagram?: string; youtube?: string; whatsapp?: string; tiktok?: string };
  copyright?: string;
  bg_color?: string;
  text_color?: string;
};

export type Vendor = {
  id: string;
  user_id: string;
  store_name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  phone: string | null;
  address: string | null;
  nid_number: string | null;
  date_of_birth: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  commission_pct: number;
  total_sales: number;
  total_orders: number;
  rejection_reason: string | null;
  footer: VendorFooter | null;
  created_at: string;
  updated_at: string;
  // Extended profile
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  alt_phone?: string | null;
  city?: string | null;
  district?: string | null;
  thana?: string | null;
  postal_code?: string | null;
  country?: string | null;
  business_type?: string | null;
  trade_license?: string | null;
  tin_number?: string | null;
  vat_number?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
  bank_routing?: string | null;
  mobile_banking_type?: string | null;
  mobile_banking_number?: string | null;
  nid_front_url?: string | null;
  nid_back_url?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  main_category?: string | null;
  expected_products?: number | null;
  agreed_terms?: boolean;
};

export const vendorSlugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || `store-${Date.now()}`;

export async function getMyVendor(): Promise<Vendor | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("vendors").select("*").eq("user_id", user.id).maybeSingle();
  return (data as Vendor | null) ?? null;
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const { data } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown[] | null }> })
    .rpc("get_public_vendor", { _slug: slug });
  const row = Array.isArray(data) ? data[0] : null;
  return (row as Vendor | null) ?? null;
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const { data } = await (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown[] | null }> })
    .rpc("get_public_vendor_by_id", { _id: id });
  const row = Array.isArray(data) ? data[0] : null;
  return (row as Vendor | null) ?? null;
}

export async function listVendors(status?: string): Promise<Vendor[]> {
  let q = supabase.from("vendors").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as Vendor[];
}

export type VendorApplyInput = {
  store_name: string;
  slug: string;
  description?: string;
  phone?: string;
  address?: string;
  nid_number?: string;
  date_of_birth?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  full_name?: string;
  email?: string;
  whatsapp?: string;
  alt_phone?: string;
  city?: string;
  district?: string;
  thana?: string;
  postal_code?: string;
  country?: string;
  business_type?: string;
  trade_license?: string;
  tin_number?: string;
  vat_number?: string;
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  bank_routing?: string;
  mobile_banking_type?: string;
  mobile_banking_number?: string;
  nid_front_url?: string | null;
  nid_back_url?: string | null;
  website?: string;
  facebook?: string;
  instagram?: string;
  main_category?: string;
  expected_products?: number;
  agreed_terms?: boolean;
};

export async function applyAsVendor(input: VendorApplyInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const payload: Record<string, unknown> = {
    user_id: user.id,
    status: "pending",
    store_name: input.store_name,
    slug: input.slug,
  };
  const optionalKeys: (keyof VendorApplyInput)[] = [
    "description","phone","address","nid_number","date_of_birth","logo_url","banner_url",
    "full_name","email","whatsapp","alt_phone","city","district","thana","postal_code","country",
    "business_type","trade_license","tin_number","vat_number",
    "bank_name","bank_account_name","bank_account_number","bank_branch","bank_routing",
    "mobile_banking_type","mobile_banking_number","nid_front_url","nid_back_url",
    "website","facebook","instagram","main_category","expected_products","agreed_terms",
  ];
  for (const k of optionalKeys) {
    const v = input[k];
    if (v !== undefined && v !== "") payload[k as string] = v;
  }
  const { data, error } = await supabase.from("vendors").insert(payload as never).select().single();
  if (error) throw error;
  // Vendor role is granted automatically by a server-side trigger on vendor application.
  return data as Vendor;
}


export async function updateMyVendor(patch: Partial<Pick<Vendor, "store_name" | "description" | "phone" | "address" | "logo_url" | "banner_url" | "footer">>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const { error } = await (supabase as unknown as { from: (t: string) => { update: (p: unknown) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
    .from("vendors").update(patch).eq("user_id", user.id);
  if (error) throw error as Error;
}

export async function adminUpdateVendor(id: string, patch: Partial<Pick<Vendor, "status" | "commission_pct" | "rejection_reason">>) {
  const { error } = await supabase.from("vendors").update(patch).eq("id", id);
  if (error) throw error;
}
