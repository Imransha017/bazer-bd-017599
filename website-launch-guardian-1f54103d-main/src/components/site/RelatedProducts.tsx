import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/ProductImage";
import { normalizeProductImage } from "@/lib/admin-api";

type Row = {
  id: string;
  slug: string | null;
  name: string;
  price: number;
  original_price: number | null;
  rating: number | null;
  sold_count: number | null;
  image: string | null;
};

export function RelatedProducts({
  currentId,
  categorySlug,
  vendorId,
}: {
  currentId: string;
  categorySlug?: string | null;
  vendorId?: string | null;
}) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      const cols = "id,slug,name,price,original_price,rating,sold_count,image";
      const run = async (withVendor: boolean) => {
        let q = supabase
          .from("products")
          .select(cols)
          .eq("is_active", true)
          .neq("id", currentId)
          .limit(20);
        if (categorySlug) q = q.eq("category_slug", categorySlug);
        if (withVendor && vendorId) q = q.eq("vendor_id", vendorId);
        const { data } = await q;
        return (data || []) as Row[];
      };
      let rows = await run(true);
      if (rows.length < 4) {
        // Fallback: broaden by category only if vendor scope too narrow
        const extra = await run(false);
        const seen = new Set(rows.map((r) => r.id));
        for (const r of extra) if (!seen.has(r.id)) rows.push(r);
      }
      if (cancel) return;
      setItems(rows.slice(0, 20).map((r) => ({ ...r, image: normalizeProductImage(r.image || "") })));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [currentId, categorySlug, vendorId]);

  // Auto-scroll every few seconds
  useEffect(() => {
    if (!items.length) return;
    const el = scrollerRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      if (!el) return;
      const step = Math.max(160, Math.floor(el.clientWidth * 0.6));
      const atEnd = el.scrollLeft + el.clientWidth + 8 >= el.scrollWidth;
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 3500);
    return () => clearInterval(id);
  }, [items.length]);

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(160, Math.floor(el.clientWidth * 0.6));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (loading) return null;
  if (!items.length) return null;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold">Related Products</h2>
        <div className="flex gap-1">
          <button
            onClick={() => nudge(-1)}
            aria-label="Previous"
            className="grid size-8 place-items-center rounded-full border bg-background hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => nudge(1)}
            aria-label="Next"
            className="grid size-8 place-items-center rounded-full border bg-background hover:border-primary hover:text-primary"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        onTouchStart={() => { pausedRef.current = true; }}
        onTouchEnd={() => { pausedRef.current = false; }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p) => {
          const price = Number(p.price || 0);
          const mrp = Number(p.original_price || 0);
          const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          const linkProps = p.slug
            ? ({ to: "/p/$slug", params: { slug: p.slug } } as const)
            : ({ to: "/product/$id", params: { id: p.id } } as const);
          return (
            <Link
              key={p.id}
              {...linkProps}
              className="group flex w-[150px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary hover:shadow-card-hover sm:w-[170px]"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                <ProductImage src={p.image || ""} alt={p.name} loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {discount > 0 && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">-{discount}%</span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-1.5">
                <p title={p.name} className="line-clamp-2 text-[11px] leading-tight text-foreground group-hover:text-primary">{p.name}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[12px] font-bold text-yellow-500">৳{price.toLocaleString("en-BD")}</span>
                  {mrp > price && <span className="text-[9px] text-muted-foreground line-through">৳{mrp.toLocaleString("en-BD")}</span>}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="size-2.5 fill-amber-400 text-amber-400" />
                    {Number(p.rating || 0).toFixed(1)}
                  </span>
                  {p.sold_count ? <span>{p.sold_count} sold</span> : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
