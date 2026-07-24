import { supabase } from "@/integrations/supabase/client";
import { getProductStoragePath } from "@/components/ProductImage";

export type ProductVariant = {
  id?: string;
  name: string; // e.g. "Red / XL"
  color?: string;
  size?: string;
  price?: number;
  stock?: number;
  sku?: string;
  image?: string;
};
export type ProductColor = { name: string; hex?: string; image?: string };
export type ProductSpec = { key: string; value: string };

export type DBProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description?: string | null;
  price: number;
  original_price: number | null;
  dropshipper_price?: number | null;
  discount_percent?: number | null;
  offer_starts_at?: string | null;
  offer_ends_at?: string | null;
  image: string;
  gallery: string[];
  video_url?: string | null;
  category_slug: string | null;
  category_name?: string | null;
  subcategory_slug: string | null;
  subcategory_name?: string | null;
  brand: string | null;
  sku?: string | null;
  badge?: string | null;
  stock: number;
  weight?: number | null;
  warranty?: string | null;
  return_days?: number | null;
  free_shipping?: boolean;
  cod_available?: boolean;
  tags?: string[];
  colors?: ProductColor[];
  sizes?: string[];
  variants?: ProductVariant[];
  specifications?: ProductSpec[];
  meta_title?: string | null;
  meta_description?: string | null;
  rating: number;
  sold_count: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};


export type DBOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string;
  district: string | null;
  thana: string | null;
  items: Array<{ id: string; name: string; price: number; qty: number; image?: string; sku?: string; size?: string; color?: string; variant?: string }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_type: string | null;
  txn_id: string | null;
  sender_phone: string | null;
  paid_amount: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DBCategory = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
};

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || `p-${Date.now()}`;

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const { data: { user } } = await supabase.auth.getUser();
  const prefix = user?.id ? `${user.id}/` : "";
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("products").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function normalizeProductImage(value?: string | null): string {
  return getProductStoragePath(value) || value?.trim() || "";
}

export async function createDBOrder(o: {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  address: string;
  district?: string;
  thana?: string;
  items: DBOrder["items"];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  payment_type?: string;
  txn_id?: string;
  sender_phone?: string;
  paid_amount?: number;
  notes?: string;
  vendor_id?: string | null;
}) {
  // Use SECURITY DEFINER RPC so both guest and logged-in customers can
  // reliably insert an order and receive the id/order_number back
  // (RLS SELECT policies do not cover anon post-insert reads).
  const { data, error } = await supabase.rpc("place_order", {
    _payload: o as never,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { id: string; order_number: string } | null;
}

export async function getProductVendorMap(productIds: string[]): Promise<Record<string, string | null>> {
  if (productIds.length === 0) return {};
  const { data } = await supabase.from("products").select("id,vendor_id").in("id", productIds);
  const m: Record<string, string | null> = {};
  for (const p of data ?? []) m[p.id] = p.vendor_id;
  return m;
}
