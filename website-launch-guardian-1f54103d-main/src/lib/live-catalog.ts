import { useQuery, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type Product, type Category, type Subcategory } from "@/lib/data";
import { normalizeProductImage } from "@/lib/admin-api";

export type LiveCatalog = {
  loading: boolean;
  products: Product[];
  categories: Category[];
};

const humanize = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const decodeHtml = (value: string) => {
  if (!value) return value;
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
};

// Fluent Emoji 3D icon set (same source as the static catalog uses)
const icon3d = (name: string) =>
  `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/${encodeURIComponent(
    name,
  )}/3D/${name.toLowerCase().replace(/ /g, "_")}_3d.png`;

// Map common category keywords → a Fluent 3D emoji name for cartoon-style round icons
const ICON_KEYWORDS: Array<[RegExp, string]> = [
  [/mobile|phone|smart(?!\s*watch)/i, "Mobile phone"],
  [/tablet|ipad/i, "Mobile phone"],
  [/laptop|computer|pc|desktop|notebook/i, "Laptop"],
  [/tv|television|home\s*appliance/i, "Television"],
  [/fridge|refriger/i, "Kitchen"],
  [/wash(er|ing)|laundry/i, "Bubbles"],
  [/ac|air\s*condition|cooler|fan/i, "Snowflake"],
  [/camera|photo/i, "Camera"],
  [/head|earbud|earphone|audio|speaker|sound/i, "Headphone"],
  [/watch|smartwatch|clock/i, "Watch"],
  [/game|gaming|console|toy/i, "Video game"],
  [/women|woman|female|lady|girl/i, "Dress"],
  [/\bmen\b|\bman\b|male|gent/i, "T-shirt"],
  [/fashion|cloth|apparel|shirt|dress|wear/i, "T-shirt"],
  [/shoe|sneaker|footwear|sandal/i, "Running shoe"],
  [/bag|handbag|backpack|luggage/i, "Handbag"],
  [/beauty|cosmetic|makeup|lipstick/i, "Lipstick"],
  [/perfume|fragrance/i, "Nail polish"],
  [/health|medic|pharma|pill|vitamin/i, "Pill"],
  [/kitchen|cook|cutlery|utensil/i, "Fork and knife"],
  [/home|furniture|decor|lamp|sofa|bed/i, "House"],
  [/grocery|food|snack|drink|beverage/i, "Shopping cart"],
  [/baby|infant|diaper|kid|child|mother/i, "Baby bottle"],
  [/pet|dog|cat|animal/i, "Dog face"],
  [/sport|fitness|gym|outdoor/i, "Soccer ball"],
  [/book|stationery|office|pen/i, "Books"],
  [/car|auto|vehicle|tire/i, "Automobile"],
  [/bike|moto|scooter|cycle/i, "Motor scooter"],
  [/jewel|ring|gold|silver|neck/i, "Ring"],
  [/gift|voucher/i, "Wrapped gift"],
  [/electron|gadget|accessor/i, "Electric plug"],
  [/tool|hardware|diy/i, "Hammer"],
  [/garden|plant|flower/i, "Potted plant"],
];

function iconForText(text: string): string {
  const s = text.replace(/-/g, " ");
  for (const [rx, name] of ICON_KEYWORDS) if (rx.test(s)) return icon3d(name);
  return icon3d("Shopping bags");
}

export function toLiveProduct(row: any): Product {
  const image = normalizeProductImage(row.image);
  const gallery = Array.isArray(row.gallery) ? row.gallery.map(normalizeProductImage).filter(Boolean) : [];
  return {
    id: row.id,
    slug: row.slug || undefined,
    title: { bn: row.name, en: row.name },
    price: Number(row.price ?? 0),
    mrp: Number(row.original_price ?? row.price ?? 0),
    dropshipper_price: row.dropshipper_price != null ? Number(row.dropshipper_price) : null,
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    sold: Number(row.sold_count ?? 0),
    category: row.category_slug || "uncategorized",
    categoryName: decodeHtml(row.category_name || "") || undefined,
    subcategory: row.subcategory_slug || undefined,
    subcategoryName: decodeHtml(row.subcategory_name || "") || undefined,
    brand: row.brand || "",
    sku: row.sku || "",
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    image,
    gallery: gallery.length ? gallery : (image ? [image] : []),
    description: { bn: row.description || "", en: row.description || "" },
  } as Product;
}

export function deriveLiveCategories(rows: any[]): Category[] {
  const map = new Map<string, { name: string; subs: Map<string, string> }>();
  for (const r of rows) {
    const slug = r.category_slug || "uncategorized";
    const name = decodeHtml(r.category_name || humanize(slug));
    if (!map.has(slug)) map.set(slug, { name, subs: new Map() });
    if (r.subcategory_slug) {
      map.get(slug)!.subs.set(r.subcategory_slug, decodeHtml(r.subcategory_name || humanize(r.subcategory_slug)));
    }
  }
  const cats: Category[] = [];
  for (const [slug, v] of map) {
    const label = { bn: v.name, en: v.name };
    const image = iconForText(v.name + " " + slug);
    const subs: Subcategory[] = Array.from(v.subs.entries()).map(([subSlug, subName]) => ({
      slug: subSlug,
      name: { bn: subName, en: subName },
      keyword: subSlug,
    }));
    cats.push({
      slug,
      name: label,
      icon: "🛍️",
      image,
      color: "from-primary/60 to-primary",
      subcategories: subs,
    });
  }
  return cats;
}


type DBCatRow = { id: string; name: string; slug: string; icon: string | null; parent_id: string | null };

function buildCategoriesFromDb(dbCats: DBCatRow[], productRows: any[]): Category[] {
  const derived = deriveLiveCategories(productRows);
  const derivedBySlug = new Map(derived.map((c) => [c.slug, c]));
  const parents = dbCats.filter((c) => !c.parent_id);
  const childrenByParent = new Map<string, DBCatRow[]>();
  for (const c of dbCats) {
    if (!c.parent_id) continue;
    if (!childrenByParent.has(c.parent_id)) childrenByParent.set(c.parent_id, []);
    childrenByParent.get(c.parent_id)!.push(c);
  }
  const cats: Category[] = parents.map((p) => {
    const name = decodeHtml(p.name || humanize(p.slug));
    const label = { bn: name, en: name };
    const image = iconForText(name + " " + p.slug);
    const dbSubs: Subcategory[] = (childrenByParent.get(p.id) ?? []).map((s) => {
      const sn = decodeHtml(s.name || humanize(s.slug));
      const grandKids: Subcategory[] = (childrenByParent.get(s.id) ?? []).map((g) => {
        const gn = decodeHtml(g.name || humanize(g.slug));
        return { slug: g.slug, name: { bn: gn, en: gn }, keyword: g.slug };
      });
      return { slug: s.slug, name: { bn: sn, en: sn }, keyword: s.slug, children: grandKids.length ? grandKids : undefined };
    });
    const seen = new Set(dbSubs.map((s) => s.slug));
    const extra = (derivedBySlug.get(p.slug)?.subcategories ?? []).filter((s) => !seen.has(s.slug));
    return {
      slug: p.slug,
      name: label,
      icon: p.icon && !p.icon.startsWith("http") ? p.icon : "🛍️",
      image: p.icon && p.icon.startsWith("http") ? p.icon : image,
      color: "from-primary/60 to-primary",
      subcategories: [...dbSubs, ...extra],
    };
  });
  // Do NOT append parents derived from product rows. The curated `categories`
  // table is the source of truth; adding phantom parents from stray product
  // slugs (typos from external syncs, "uncategorized", etc.) creates
  // duplicates in the sidebar and menus.
  return cats;

}

async function fetchLiveCatalog(): Promise<{ products: Product[]; categories: Category[] }> {
  const [prodRes, catRes, revRes] = await Promise.all([
    supabase
      .from("products")
      .select("id,slug,name,sku,tags,price,original_price,dropshipper_price,rating,sold_count,category_slug,category_name,subcategory_slug,subcategory_name,brand,image,gallery,description")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("categories")
      .select("id,name,slug,icon,parent_id,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("reviews")
      .select("product_id,rating,is_approved")
      .eq("is_approved", true),
  ]);
  const rows = prodRes.data || [];
  const dbCats = (catRes.data || []) as DBCatRow[];
  const agg = new Map<string, { sum: number; count: number }>();
  for (const r of (revRes.data || []) as Array<{ product_id: string; rating: number }>) {
    const cur = agg.get(r.product_id) || { sum: 0, count: 0 };
    cur.sum += Number(r.rating || 0);
    cur.count += 1;
    agg.set(r.product_id, cur);
  }
  const products = rows.map((row: any) => {
    const a = agg.get(row.id);
    if (a && a.count > 0) {
      return { ...row, rating: a.sum / a.count, review_count: a.count };
    }
    return { ...row, review_count: 0 };
  }).map(toLiveProduct);
  return {
    products,
    categories: dbCats.length > 0 ? buildCategoriesFromDb(dbCats, rows) : deriveLiveCategories(rows),
  };
}

export const liveCatalogQueryOptions = () =>
  queryOptions({
    queryKey: ["live-catalog"],
    queryFn: fetchLiveCatalog,
    // Short stale time + refetch-on-focus so mobile visitors see fresh data
    // as soon as they bring the tab to the foreground after a sync on PC.
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

export function useLiveCatalog(): LiveCatalog {
  const { data, isLoading } = useQuery(liveCatalogQueryOptions());
  return {
    loading: isLoading,
    products: data?.products ?? [],
    categories: data?.categories ?? [],
  };
}



