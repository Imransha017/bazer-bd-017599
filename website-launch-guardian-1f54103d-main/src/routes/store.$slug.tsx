import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { ProductImage, useProductImageUrl } from "@/components/ProductImage";
import { ProductCard } from "@/components/site/ProductCard";
import { VendorFooter } from "@/components/site/VendorFooter";
import { supabase } from "@/integrations/supabase/client";
import { getVendorBySlug, type Vendor } from "@/lib/vendor";
import type { Product } from "@/lib/data";
import { useLiveCatalog } from "@/lib/live-catalog";
import { Store, Package, Search, X, LayoutGrid, ChevronRight } from "lucide-react";
import { useRef } from "react";


export const Route = createFileRoute("/store/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Store` }] }),
  component: StorePage,
  notFoundComponent: () => (
    <SiteLayout><div className="p-12 text-center"><h1 className="text-xl font-bold">Store not found</h1><Link to="/" className="mt-3 inline-block text-primary underline">Go home</Link></div></SiteLayout>
  ),
});

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  original_price: number | null;
  rating: number;
  sold_count: number | null;
  category_slug: string | null;
  category_name: string | null;
  subcategory_slug: string | null;
  subcategory_name: string | null;
  option_slug: string | null;
  option_name: string | null;
  sku: string | null;
  tags: string[] | null;
  brand: string | null;
};

function StorePage() {
  const { slug } = Route.useParams();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [opt, setOpt] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "price_asc" | "price_desc" | "rating" | "sold">("new");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const live = useLiveCatalog();

  const applyReviewAggregates = (list: StoreProduct[], rev: Array<{ product_id: string; rating: number }>) => {
    const agg = new Map<string, { sum: number; count: number }>();
    for (const r of rev) {
      const cur = agg.get(r.product_id) || { sum: 0, count: 0 };
      cur.sum += Number(r.rating || 0);
      cur.count += 1;
      agg.set(r.product_id, cur);
    }
    for (const p of list) {
      const a = agg.get(p.id);
      if (a && a.count > 0) {
        p.rating = a.sum / a.count;
        (p as any).review_count = a.count;
      } else {
        p.rating = 0;
        (p as any).review_count = 0;
      }
    }
  };

  const refreshReviews = async (ids: string[]) => {
    if (!ids.length) return;
    const { data: rev } = await supabase
      .from("reviews")
      .select("product_id,rating,is_approved")
      .eq("is_approved", true)
      .in("product_id", ids);
    setProducts((prev) => {
      const next = prev.map((p) => ({ ...p }));
      applyReviewAggregates(next, (rev || []) as Array<{ product_id: string; rating: number }>);
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const v = await getVendorBySlug(slug);
      if (!v) { setLoading(false); return; }
      setVendor(v);
      const { data } = await supabase.from("products")
        .select("id,name,slug,image,price,original_price,rating,sold_count,category_slug,category_name,subcategory_slug,subcategory_name,option_slug,option_name,sku,tags,brand")
        .eq("vendor_id", v.id).eq("is_active", true)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as StoreProduct[];
      const ids = list.map(p => p.id);
      if (ids.length) {
        const { data: rev } = await supabase
          .from("reviews")
          .select("product_id,rating,is_approved")
          .eq("is_approved", true)
          .in("product_id", ids);
        applyReviewAggregates(list, (rev || []) as Array<{ product_id: string; rating: number }>);
      }
      setProducts(list);
      setLoading(false);
    })();
  }, [slug]);

  // Realtime: refresh ratings/review counts when reviews change for this store's products
  const productIdsKey = products.map((p) => p.id).sort().join(",");
  useEffect(() => {
    const ids = productIdsKey ? productIdsKey.split(",") : [];
    if (!ids.length) return;
    const idSet = new Set(ids);
    const channel = supabase
      .channel(`store-reviews-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        (payload) => {
          const row: any = payload.new ?? payload.old;
          if (row?.product_id && idSet.has(row.product_id)) {
            refreshReviews(ids);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdsKey, slug]);


  // Group categories -> subcategories -> options from products
  type SubNode = { slug: string; name: string; count: number; opts: Map<string, { slug: string; name: string; count: number }> };
  type CatNode = { slug: string; name: string; count: number; subs: Map<string, SubNode> };
  const catTree = useMemo(() => {
    const map = new Map<string, CatNode>();
    for (const p of products) {
      const cs = p.category_slug || "uncategorized";
      const cn = p.category_name || p.category_slug || "Uncategorized";
      if (!map.has(cs)) map.set(cs, { slug: cs, name: cn, count: 0, subs: new Map() });
      const entry = map.get(cs)!;
      entry.count += 1;
      if (p.subcategory_slug) {
        const ss = p.subcategory_slug;
        const sn = p.subcategory_name || ss;
        if (!entry.subs.has(ss)) entry.subs.set(ss, { slug: ss, name: sn, count: 0, opts: new Map() });
        const sEntry = entry.subs.get(ss)!;
        sEntry.count += 1;
        if (p.option_slug) {
          const os = p.option_slug;
          const on = p.option_name || os;
          if (!sEntry.opts.has(os)) sEntry.opts.set(os, { slug: os, name: on, count: 0 });
          sEntry.opts.get(os)!.count += 1;
        }
      }
    }
    return Array.from(map.values()).map(c => ({
      ...c,
      subs: Array.from(c.subs.values()).map(s => ({ ...s, opts: Array.from(s.opts.values()) })),
    }));
  }, [products]);

  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    let mn = Infinity, mx = 0;
    for (const p of products) {
      const v = Number(p.price || 0);
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    return { min: Math.floor(mn === Infinity ? 0 : mn), max: Math.ceil(mx) };
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const mn = minPrice === "" ? -Infinity : Number(minPrice);
    const mx = maxPrice === "" ? Infinity : Number(maxPrice);
    let list = products.filter(p => {
      if (cat && p.category_slug !== cat) return false;
      if (sub && p.subcategory_slug !== sub) return false;
      if (opt && p.option_slug !== opt) return false;
      const price = Number(p.price || 0);
      if (price < mn || price > mx) return false;
      if (needle) {
        const hay = [
          p.name, p.sku ?? "", p.brand ?? "",
          p.category_name ?? "", p.category_slug ?? "",
          p.subcategory_name ?? "", p.subcategory_slug ?? "",
          p.option_name ?? "", p.option_slug ?? "",
          ...(Array.isArray(p.tags) ? p.tags : []),
        ].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === "sold") list = [...list].sort((a, b) => (Number(b.sold_count) || 0) - (Number(a.sold_count) || 0));
    return list;
  }, [products, q, cat, sub, opt, sort, minPrice, maxPrice]);

  if (loading) return <SiteLayout><div className="p-12 text-center text-sm text-muted-foreground">Loading…</div></SiteLayout>;
  if (!vendor) throw notFound();

  // Enrich store categories with live catalog images (fallback: first letter avatar).
  const catImg = new Map<string, string>();
  for (const lc of live.categories) catImg.set(lc.slug, lc.image);

  const activeCat = catTree.find(c => c.slug === cat) ?? null;

  const CategoryStrip = (
    <VendorCategoriesMenu
      catTree={catTree}
      catImg={catImg}
      cat={cat}
      sub={sub}
      opt={opt}
      onSelectCat={(c) => { setCat(c); setSub(null); setOpt(null); }}
      onSelectSub={(s) => { setSub(s); setOpt(null); }}
      onSelectOpt={(o) => setOpt(o)}
      onClear={() => { setCat(null); setSub(null); setOpt(null); }}
    />
  );



  return (
    <SiteLayout footer={<VendorFooter footer={vendor.footer} storeName={vendor.store_name} fallbackLogo={vendor.logo_url} fallbackPhone={vendor.phone} fallbackAddress={vendor.address} fallbackAbout={vendor.description} />}>
      <div className="bg-card">
        <StoreBanner url={vendor.banner_url} />
        <div className="mx-auto -mt-10 max-w-7xl px-4">
          <div className="flex items-end gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-card bg-muted shadow-md md:h-28 md:w-28">
              {vendor.logo_url ? <ProductImage src={vendor.logo_url} alt={vendor.store_name} className="h-full w-full object-cover" /> : <Store className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="pb-2">
              <h1 className="text-xl font-bold md:text-2xl">{vendor.store_name}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {products.length} products</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={`Search ${vendor.store_name} — name, SKU, tag, category…`}
              className="w-full rounded-full border bg-background py-2 pl-8 pr-8 text-sm outline-none focus:border-primary"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="rounded-full border bg-background px-3 py-2 text-xs">
            <option value="new">Newest</option>
            <option value="price_asc">Price: Low</option>
            <option value="price_desc">Price: High</option>
            <option value="rating">Top Rated</option>
            <option value="sold">Best Selling</option>
          </select>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-2 text-xs">
          <span className="text-muted-foreground">Price:</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            placeholder={priceBounds.min ? `Min ৳${priceBounds.min}` : "Min ৳"}
            className="w-24 rounded-full border bg-background px-3 py-1.5 outline-none focus:border-primary"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            placeholder={priceBounds.max ? `Max ৳${priceBounds.max}` : "Max ৳"}
            className="w-24 rounded-full border bg-background px-3 py-1.5 outline-none focus:border-primary"
          />
          {(minPrice || maxPrice) && (
            <button
              onClick={() => { setMinPrice(""); setMaxPrice(""); }}
              className="rounded-full border px-3 py-1.5 text-muted-foreground hover:border-primary hover:text-primary"
            >
              Clear price
            </button>
          )}
          {(cat || sub || opt || q || minPrice || maxPrice) && (
            <button
              onClick={() => { setCat(null); setSub(null); setOpt(null); setQ(""); setMinPrice(""); setMaxPrice(""); }}
              className="ml-auto rounded-full border border-destructive/40 px-3 py-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Reset all
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4">{CategoryStrip}</div>

      <div className="mx-auto max-w-7xl p-4 pt-0">


        <div>
          {(cat || sub || opt || q) && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Filters:</span>
              {cat && (
                <Chip onClear={() => { setCat(null); setSub(null); setOpt(null); }}>
                  {catTree.find(c => c.slug === cat)?.name || cat}
                </Chip>
              )}
              {sub && (
                <Chip onClear={() => { setSub(null); setOpt(null); }}>
                  {catTree.find(c => c.slug === cat)?.subs.find(s => s.slug === sub)?.name || sub}
                </Chip>
              )}
              {opt && (
                <Chip onClear={() => setOpt(null)}>
                  {catTree.find(c => c.slug === cat)?.subs.find(s => s.slug === sub)?.opts.find(o => o.slug === opt)?.name || opt}
                </Chip>
              )}
              {q && <Chip onClear={() => setQ("")}>“{q}”</Chip>}
              {(minPrice || maxPrice) && (
                <Chip onClear={() => { setMinPrice(""); setMaxPrice(""); }}>
                  ৳{minPrice || 0} – ৳{maxPrice || "∞"}
                </Chip>
              )}
            </div>
          )}


          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No products match your filters.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map(p => {
                const product: Product = {
                  id: p.id,
                  slug: p.slug,
                  title: { bn: p.name, en: p.name },
                  price: Number(p.price || 0),
                  mrp: Number(p.original_price || p.price || 0),
                  rating: Number(p.rating || 0),
                  reviewCount: Number((p as any).review_count || 0),
                  sold: Number(p.sold_count || 0),
                  category: p.category_slug || "",
                  categoryName: p.category_name || undefined,
                  subcategory: p.subcategory_slug || undefined,
                  subcategoryName: p.subcategory_name || undefined,
                  brand: p.brand || "",
                  sku: p.sku || undefined,
                  tags: p.tags || [],
                  image: p.image || "",
                  gallery: p.image ? [p.image] : [],
                  description: { bn: "", en: "" },
                };
                return <ProductCard key={p.id} p={product} />;
              })}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
      {children}
      <button onClick={onClear} className="hover:text-destructive"><X className="size-3" /></button>
    </span>
  );
}

function StoreBanner({ url }: { url: string | null }) {
  const resolved = useProductImageUrl(url);
  if (url && resolved) return <div className="h-40 w-full bg-cover bg-center md:h-56" style={{ backgroundImage: `url(${resolved})` }} />;
  return <div className="h-32 w-full bg-gradient-brand md:h-44" />;
}

type VcOpt = { slug: string; name: string; count: number };
type VcSub = { slug: string; name: string; count: number; opts: VcOpt[] };
type VcCat = { slug: string; name: string; count: number; subs: VcSub[] };

function VendorCategoriesMenu({
  catTree, catImg, cat, sub, opt,
  onSelectCat, onSelectSub, onSelectOpt, onClear,
}: {
  catTree: VcCat[];
  catImg: Map<string, string>;
  cat: string | null;
  sub: string | null;
  opt: string | null;
  onSelectCat: (slug: string | null) => void;
  onSelectSub: (slug: string | null) => void;
  onSelectOpt: (slug: string | null) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeSlug = hover ?? cat ?? catTree[0]?.slug ?? null;
  const activeCat = catTree.find(c => c.slug === activeSlug) ?? null;
  const activeLabel =
    (opt && catTree.find(c => c.slug === cat)?.subs.find(s => s.slug === sub)?.opts.find(o => o.slug === opt)?.name)
    || (sub && catTree.find(c => c.slug === cat)?.subs.find(s => s.slug === sub)?.name)
    || (cat && catTree.find(c => c.slug === cat)?.name)
    || "All Categories";

  if (catTree.length === 0) return null;

  return (
    <div ref={ref} className="relative py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          aria-expanded={open}
        >
          <LayoutGrid className="size-4" />
          <span>Categories</span>
        </button>
        <span className="truncate text-xs text-muted-foreground md:text-sm">
          <span className="opacity-70">Browsing:</span> <span className="font-medium text-foreground">{activeLabel}</span>
        </span>
        {(cat || sub || opt) && (
          <button onClick={onClear} className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary">
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-40 w-[min(94vw,760px)] overflow-hidden rounded-md border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Store Categories</span>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid max-h-[70vh] grid-cols-[180px_1fr] md:grid-cols-[220px_1fr]">
            <ul className="overflow-y-auto border-r border-border bg-muted/30 py-1 text-sm">
              <li>
                <button
                  onClick={() => { onSelectCat(null); setOpen(false); }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition ${
                    !cat ? "bg-card font-semibold text-primary" : "text-foreground hover:bg-card"
                  }`}
                >
                  <span className="text-[13px]">All Products</span>
                  <span className="text-[11px] opacity-60">({catTree.reduce((n, c) => n + c.count, 0)})</span>
                </button>
              </li>
              {catTree.map((c) => {
                const img = catImg.get(c.slug);
                return (
                  <li key={c.slug}>
                    <button
                      onMouseEnter={() => setHover(c.slug)}
                      onFocus={() => setHover(c.slug)}
                      onClick={() => { onSelectCat(c.slug); setHover(c.slug); }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition ${
                        activeSlug === c.slug ? "bg-card font-semibold text-primary" : "text-foreground hover:bg-card"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {img ? (
                          <img src={img} alt="" className="size-5 shrink-0 rounded object-cover" />
                        ) : (
                          <span className="grid size-5 shrink-0 place-items-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="line-clamp-1 text-[13px]">{c.name}</span>
                      </span>
                      <ChevronRight className="size-3.5 opacity-60" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {activeCat && (
              <div className="overflow-y-auto p-3">
                <button
                  onClick={() => { onSelectCat(activeCat.slug); onSelectSub(null); setOpen(false); }}
                  className="mb-3 flex w-full items-center gap-3 rounded-md bg-muted/50 p-2 text-left hover:bg-muted"
                >
                  {catImg.get(activeCat.slug) ? (
                    <img src={catImg.get(activeCat.slug)!} alt="" className="size-12 rounded object-cover" />
                  ) : (
                    <div className="grid size-12 place-items-center rounded bg-primary/10 text-lg font-bold text-primary">
                      {activeCat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold">{activeCat.name}</div>
                    <div className="text-xs text-muted-foreground">View all ({activeCat.count}) →</div>
                  </div>
                </button>
                {activeCat.subs.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">No subcategories.</p>
                ) : (
                  <VendorSubList
                    activeCat={activeCat}
                    currentSub={cat === activeCat.slug ? sub : null}
                    currentOpt={cat === activeCat.slug ? opt : null}
                    onPickSub={(sSlug) => {
                      onSelectCat(activeCat.slug);
                      onSelectSub(sSlug);
                    }}
                    onPickOpt={(sSlug, oSlug) => {
                      onSelectCat(activeCat.slug);
                      onSelectSub(sSlug);
                      onSelectOpt(oSlug);
                      setOpen(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VendorSubList({
  activeCat, currentSub, currentOpt, onPickSub, onPickOpt,
}: {
  activeCat: VcCat;
  currentSub: string | null;
  currentOpt: string | null;
  onPickSub: (subSlug: string) => void;
  onPickOpt: (subSlug: string, optSlug: string) => void;
}) {
  const [openSub, setOpenSub] = useState<string | null>(currentSub);
  return (
    <ul className="flex flex-col items-start gap-1.5 pb-1">
      {activeCat.subs.map((s) => {
        const isOn = openSub === s.slug;
        const isActive = currentSub === s.slug && !currentOpt;
        const hasOpts = s.opts.length > 0;
        return (
          <li key={s.slug} className="flex w-full flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={() => {
                onPickSub(s.slug);
                if (hasOpts) setOpenSub((prev) => (prev === s.slug ? null : s.slug));
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-full border border-primary/30 px-3 py-1.5 text-[12px] font-semibold transition ${
                isActive || isOn ? "bg-primary text-primary-foreground" : "bg-primary/5 text-primary hover:bg-primary/10"
              }`}
            >
              <span>{s.name} <span className="opacity-70">({s.count})</span></span>
              {hasOpts && <span className="text-[10px] opacity-80">{isOn ? "▴" : "▾"}</span>}
            </button>
            {isOn && hasOpts && (
              <ul className="ml-3 flex w-full flex-col items-start gap-1 border-l border-primary/20 pl-2 pb-1">
                {s.opts.map((g) => {
                  const optActive = currentSub === s.slug && currentOpt === g.slug;
                  return (
                    <li key={`${s.slug}-${g.slug}`}>
                      <button
                        type="button"
                        onClick={() => onPickOpt(s.slug, g.slug)}
                        className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-[12px] ${
                          optActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        {g.name} <span className="opacity-70">({g.count})</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}


