import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, SlidersHorizontal, X, ChevronLeft, Check, Star } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { getCategory, productsByCategory } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { toLiveProduct, deriveLiveCategories } from "@/lib/live-catalog";
import { useI18n, pick } from "@/lib/i18n";

export const Route = createFileRoute("/category/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({
    sub: typeof s.sub === "string" ? s.sub : undefined,
  }),
  loader: async ({ params }) => {
    const staticCat = getCategory(params.slug);
    if (staticCat) return { cat: staticCat, liveProducts: [] as any[], fetchError: null as string | null };
    // Fallback: derive category from live DB products
    const { data, error } = await supabase
      .from("products")
      .select("id,slug,name,price,original_price,rating,sold_count,category_slug,category_name,subcategory_slug,subcategory_name,brand,image,gallery,description")
      .eq("is_active", true)
      .eq("category_slug", params.slug)
      .limit(2000);
    if (error) {
      console.error("[category loader] fetch failed", { slug: params.slug, code: error.code, message: error.message, details: error.details, hint: error.hint });
      return { cat: { slug: params.slug, name: { bn: params.slug, en: params.slug }, icon: "🛍️", image: "", color: "", subcategories: [] } as any, liveProducts: [], fetchError: `${error.code ?? "ERR"}: ${error.message}` };
    }
    const rows = data || [];
    if (!rows.length) throw notFound();
    const cat = deriveLiveCategories(rows).find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat, liveProducts: rows.map(toLiveProduct), fetchError: null };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.cat.name.en ?? "Category"} — Bazar` },
      { name: "description", content: `Shop ${loaderData?.cat.name.en} on Bazar with the best prices.` },
    ],
  }),
  errorComponent: () => <SiteLayout><div className="p-8 text-center text-sm">Something went wrong.</div></SiteLayout>,
  notFoundComponent: () => <SiteLayout><div className="p-8 text-center text-sm">Category not found.</div></SiteLayout>,
  component: CategoryPage,
});

type SortKey = "popular" | "newest" | "price_asc" | "price_desc" | "rating";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: Low → High" },
  { key: "price_desc", label: "Price: High → Low" },
  { key: "rating", label: "Top Rated" },
];



function CategoryPage() {
  const { cat, liveProducts: initialLive, fetchError: loaderError } = Route.useLoaderData();
  const { lang, t } = useI18n();
  const [liveExtra, setLiveExtra] = useState<any[]>(initialLive);
  const [fetchError, setFetchError] = useState<string | null>(loaderError ?? null);
  const [fetching, setFetching] = useState<boolean>(initialLive.length === 0);

  // If this category came from static data, fetch live DB products for the same slug too
  useEffect(() => {
    if (initialLive.length > 0) { setFetching(false); return; }
    let alive = true;
    setFetching(true);
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,slug,name,price,original_price,rating,sold_count,category_slug,category_name,subcategory_slug,subcategory_name,brand,image,gallery,description")
        .eq("is_active", true)
        .eq("category_slug", cat.slug)
        .limit(2000);
      if (!alive) return;
      if (error) {
        console.error("[CategoryPage] client fetch failed", {
          slug: cat.slug,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        setFetchError(`${error.code ?? "ERR"}: ${error.message}`);
      } else {
        setFetchError(null);
        console.debug("[CategoryPage] fetched", { slug: cat.slug, rows: data?.length ?? 0 });
      }
      setLiveExtra((data || []).map(toLiveProduct));
      setFetching(false);
    })();
    return () => { alive = false; };
  }, [cat.slug, initialLive.length]);

  const all = useMemo(() => {
    const staticList = initialLive.length > 0 ? [] : productsByCategory(cat.slug);
    return [...liveExtra, ...staticList];
  }, [cat.slug, liveExtra, initialLive.length]);

  // URL is the single source of truth for the subcategory filter — always in
  // sync across menu clicks, chip clicks, back/forward, and page refresh.
  const search = Route.useSearch();
  const sub = search.sub ?? null;
  const navigate = useNavigate({ from: "/category/$slug" });
  const setSub = (next: string | null) =>
    navigate({
      params: { slug: cat.slug },
      search: (prev: { sub?: string }) => ({ ...prev, sub: next ?? undefined }),
      replace: true,
      resetScroll: false,
    });
  const [sort, setSort] = useState<SortKey>("popular");
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // Filter state
  const priceBounds = useMemo(() => {
    if (!all.length) return { min: 0, max: 0 };
    const prices = all.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [all]);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [brands, setBrands] = useState<string[]>([]);

  const allBrands = useMemo(
    () => Array.from(new Set(all.map((p) => p.brand))).sort(),
    [all],
  );

  // Resolve which level-2 subcategory (if any) contains the current selection.
  // If `sub` is itself a level-3 slug, `parentSub` is its level-2 parent.
  const subInfo = useMemo(() => {
    if (!sub) return { self: null as string | null, parent: null as string | null, children: [] as { slug: string; name: { bn: string; en: string } }[] };
    for (const s of cat.subcategories as any[]) {
      if (s.slug === sub) return { self: s.slug, parent: null, children: (s.children ?? []) };
      const child = (s.children ?? []).find((c: any) => c.slug === sub);
      if (child) return { self: sub, parent: s.slug, children: (s.children ?? []) };
    }
    return { self: sub, parent: null, children: [] };
  }, [cat.subcategories, sub]);

  const list = useMemo(() => {
    // Match products tagged with the exact slug, OR (when a level-3 is
    // selected) products tagged with its level-2 parent — since sync usually
    // stores only the level-2 slug on products.
    let l = sub
      ? all.filter((p) => p.subcategory === sub || (subInfo.parent && p.subcategory === subInfo.parent))
      : all.slice();
    // If a subcategory filter yields nothing but the category has products,
    // fall back to showing all products in the category directly.
    if (sub && l.length === 0 && all.length > 0) {
      l = all.slice();
    }
    const mn = minPrice ? Number(minPrice) : -Infinity;
    const mx = maxPrice ? Number(maxPrice) : Infinity;
    l = l.filter((p) => p.price >= mn && p.price <= mx);
    if (minRating > 0) l = l.filter((p) => p.rating >= minRating);
    if (brands.length) l = l.filter((p) => brands.includes(p.brand));
    switch (sort) {
      case "price_asc": l.sort((a, b) => a.price - b.price); break;
      case "price_desc": l.sort((a, b) => b.price - a.price); break;
      case "rating": l.sort((a, b) => b.rating - a.rating); break;
      case "newest": l.reverse(); break;
      default: l.sort((a, b) => b.sold - a.sold);
    }
    return l;
  }, [all, sub, sort, minPrice, maxPrice, minRating, brands, subInfo.parent]);

  const activeFilterCount =
    (minPrice ? 1 : 0) + (maxPrice ? 1 : 0) + (minRating ? 1 : 0) + brands.length;

  const resetFilters = () => {
    setMinPrice(""); setMaxPrice(""); setMinRating(0); setBrands([]);
  };

  const toggleBrand = (b: string) =>
    setBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  return (
    <SiteLayout>
      {/* Mobile sticky toolbar */}
      <div className="sticky top-[52px] z-20 flex items-center gap-2 border-b border-border bg-card px-3 py-2 md:hidden">
        <Link to="/" className="-ml-1 p-1 text-foreground" aria-label="Back">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{pick(cat.name, lang)}</h1>
        <span className="text-[11px] text-muted-foreground">{list.length}</span>
      </div>

      <div className="mx-auto max-w-none py-3 md:py-4">
        {/* Desktop breadcrumb + banner */}
        <nav className="mb-3 hidden text-xs text-muted-foreground md:block">
          <Link to="/" className="hover:text-primary">{t("home")}</Link>
          {" / "}
          <span className="text-foreground">{pick(cat.name, lang)}</span>
        </nav>

        <div className="mb-3 hidden overflow-hidden rounded-md border border-border bg-card md:block">
          <div className="relative h-32 md:h-44">
            <img src={cat.image} alt="" className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
            <div className="absolute inset-0 flex items-center px-5">
              <div className="text-white">
                <h2 className="text-2xl font-extrabold drop-shadow md:text-3xl">{pick(cat.name, lang)}</h2>
                <p className="text-sm opacity-90">{all.length} {t("products")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subcategory chips */}
        <div className="-mx-3 mb-2 flex gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2 no-scrollbar md:mx-0 md:rounded-md md:border">
          <button
            onClick={() => setSub(null)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
              sub === null ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {t("all")}
          </button>
          {cat.subcategories.map((s: { slug: string; name: { bn: string; en: string } }) => (
            <button
              key={s.slug}
              onClick={() => setSub(s.slug)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                sub === s.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
              }`}
            >
              {pick(s.name, lang)}
            </button>
          ))}
        </div>

        {/* Level-3 chips — shown when a subcategory with children is active */}
        {subInfo.children.length > 0 && (
          <div className="-mx-3 mb-2 flex gap-2 overflow-x-auto border-b border-border bg-muted/30 px-3 py-2 no-scrollbar md:mx-0 md:rounded-md md:border">
            {subInfo.children.map((g: { slug: string; name: { bn: string; en: string } }) => (
              <button
                key={g.slug}
                onClick={() => setSub(g.slug)}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  sub === g.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                }`}
              >
                {pick(g.name, lang)}
              </button>
            ))}
          </div>
        )}



        {/* Sort + Filter bar (sticky on mobile under header toolbar) */}
        <div className="sticky top-[92px] z-10 -mx-3 mb-3 grid grid-cols-2 border-b border-border bg-card md:static md:mx-0 md:flex md:rounded-md md:border md:p-1">
          <button
            onClick={() => setShowSort(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-foreground md:px-3"
          >
            <ArrowDownUp className="size-4" />
            <span>{SORT_OPTIONS.find((s) => s.key === sort)?.label ?? "Sort"}</span>
          </button>
          <button
            onClick={() => setShowFilter(true)}
            className="relative flex items-center justify-center gap-1.5 border-l border-border py-2.5 text-xs font-medium text-foreground md:ml-auto md:border-l-0 md:px-3"
          >
            <SlidersHorizontal className="size-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {list.length === 0 ? (
          <EmptyState
            fetching={fetching}
            fetchError={fetchError}
            totalInCategory={all.length}
            hasSubFilter={!!sub}
            hasOtherFilters={activeFilterCount > 0}
            onClearSub={() => setSub(null)}
            onClearFilters={resetFilters}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>

      {/* Sort sheet (bottom) */}
      {showSort && (
        <Sheet onClose={() => setShowSort(false)} title="Sort by" position="bottom">
          <ul className="divide-y divide-border">
            {SORT_OPTIONS.map((o) => (
              <li key={o.key}>
                <button
                  onClick={() => { setSort(o.key); setShowSort(false); }}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm"
                >
                  <span className={sort === o.key ? "font-semibold text-primary" : ""}>{o.label}</span>
                  {sort === o.key && <Check className="size-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}

      {/* Filter drawer (right) */}
      {showFilter && (
        <Sheet onClose={() => setShowFilter(false)} title="Filter" position="right">
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Price (৳ {priceBounds.min} – ৳ {priceBounds.max})
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rating</h3>
                <div className="flex flex-wrap gap-2">
                  {[4, 3, 2, 1].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(minRating === r ? 0 : r)}
                      className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                        minRating === r ? "border-primary bg-primary/10 text-primary" : "border-border"
                      }`}
                    >
                      <Star className="size-3 fill-yellow-400 text-yellow-400" />
                      {r}+
                    </button>
                  ))}
                </div>
              </section>

              {allBrands.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand</h3>
                  <div className="flex flex-wrap gap-2">
                    {allBrands.map((b) => (
                      <button
                        key={b}
                        onClick={() => toggleBrand(b)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          brands.includes(b) ? "border-primary bg-primary/10 text-primary" : "border-border"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-border bg-card p-3">
              <button onClick={resetFilters} className="rounded border border-border py-2.5 text-sm font-medium">
                Reset
              </button>
              <button
                onClick={() => setShowFilter(false)}
                className="rounded bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Show {list.length} results
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </SiteLayout>
  );
}

function Sheet({
  children,
  onClose,
  title,
  position,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  position: "bottom" | "right";
}) {
  const panel =
    position === "bottom"
      ? "absolute inset-x-0 bottom-0 max-h-[80vh] rounded-t-2xl"
      : "absolute inset-y-0 right-0 w-[88%] max-w-sm";
  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      <div className={`${panel} flex flex-col bg-card shadow-xl`}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({
  fetching,
  fetchError,
  totalInCategory,
  hasSubFilter,
  hasOtherFilters,
  onClearSub,
  onClearFilters,
}: {
  fetching: boolean;
  fetchError: string | null;
  totalInCategory: number;
  hasSubFilter: boolean;
  hasOtherFilters: boolean;
  onClearSub: () => void;
  onClearFilters: () => void;
}) {
  if (fetching) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading products…
      </div>
    );
  }
  if (fetchError) {
    const isPerm = /permission|denied|401|403|rls|policy/i.test(fetchError);
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center text-sm">
        <p className="font-semibold text-destructive">
          {isPerm ? "Access denied while loading products" : "Failed to load products"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isPerm
            ? "Database rules prevented this request. Please contact support if this keeps happening."
            : "Please check your internet connection and try again."}
        </p>
        <p className="mt-2 break-all text-[11px] text-muted-foreground/80">
          <span className="font-mono">{fetchError}</span>
        </p>
        <button
          onClick={() => location.reload()}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }
  // No fetch error → data loaded but filter yields nothing
  if (totalInCategory === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No products in this category yet.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-card p-6 text-center text-sm">
      <p className="font-medium text-foreground">No products match your filters.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasSubFilter && "Try a different subcategory"}
        {hasSubFilter && hasOtherFilters && " or "}
        {hasOtherFilters && "clear the filters"}
        {!hasSubFilter && !hasOtherFilters && "Try broadening your search."}
      </p>
      <div className="mt-3 flex justify-center gap-2">
        {hasOtherFilters && (
          <button
            onClick={onClearFilters}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
