import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/Layout";
import { ProductImage } from "@/components/ProductImage";
import { normalizeProductImage } from "@/lib/admin-api";
import { ReviewSection } from "@/components/site/ReviewSection";
import { RelatedProducts } from "@/components/site/RelatedProducts";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
import { useLiveStock, stockStatus } from "@/lib/useLiveStock";
import { Star, Truck, ShieldCheck, RotateCcw, Heart, Minus, Plus, Loader2, ChevronRight, Store, Tag, Play } from "lucide-react";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Product` },
      { name: "description", content: `View product ${params.slug}` },
    ],
  }),
  component: PublicProductPage,
  errorComponent: ({ error }) => (
    <SiteLayout><div className="p-8 text-center text-red-600">{error.message}</div></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="p-8 text-center">Product not found or inactive.</div></SiteLayout>
  ),
});

function formatBDT(n: number) {
  return `৳${Number(n || 0).toLocaleString("en-BD")}`;
}

function cleanOptionText(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(cleanOptionText);
  if (typeof value === "number") return [String(value)];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "object") {
    const option = value as Record<string, unknown>;
    return cleanOptionText(option.size ?? option.name ?? option.label ?? option.value ?? option.title);
  }
  return [];
}

function productSizes(product: any): string[] {
  const directSizes = cleanOptionText(product.sizes);
  const variantSizes = Array.isArray(product.variants)
    ? product.variants.flatMap((variant: any) => {
        const explicitSize = cleanOptionText(variant?.size);
        if (explicitSize.length) return explicitSize;
        const nameParts = cleanOptionText(variant?.name).flatMap((name) => name.split(/[\/|]/).map((part) => part.trim()).filter(Boolean));
        return nameParts.slice(-1);
      })
    : [];

  return Array.from(new Set([...directSizes, ...variantSizes]));
}

function PublicProductPage() {
  const { slug } = Route.useParams();
  const [p, setP] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "specs">("desc");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [vendor, setVendor] = useState<{ slug: string; store_name: string; logo_url: string | null } | null>(null);
  const sizeSectionRef = useRef<HTMLDivElement>(null);
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const requireAuthForCart = () => {
    if (user) return true;
    import("sonner").then(({ toast }) => toast.error("কার্টে যোগ করতে সাইন ইন করুন"));
    try { sessionStorage.setItem("post_login_redirect", window.location.pathname); } catch {}
    navigate({ to: "/auth" });
    return false;
  };


  const { has, toggle } = useWishlist();
  const [pId, setPId] = useState<string | null>(null);
  const liveStocks = useLiveStock(pId ? [pId] : []);


  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setVendor(null);
    supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancel) return;
        if (error) setErr(error.message);
        else if (!data) setErr("Product not found or inactive.");
        else {
          setP({
            ...data,
            image: normalizeProductImage(data.image),
            gallery: Array.isArray(data.gallery) ? data.gallery.map((value) => normalizeProductImage(typeof value === "string" ? value : "")).filter(Boolean) : [],
          });
          setPId(data.id as string);
          if (data.vendor_id) {
            const { getVendorById } = await import("@/lib/vendor");
            const v = await getVendorById(data.vendor_id);
            if (!cancel && v) setVendor({ slug: v.slug, store_name: v.store_name, logo_url: v.logo_url });
          }
        }
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [slug]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </SiteLayout>
    );
  }
  if (err || !p) {
    return (
      <SiteLayout>
        <div className="p-16 text-center text-sm text-muted-foreground">{err || "Not found"}</div>
      </SiteLayout>
    );
  }

  const images: string[] = [p.image, ...((p.gallery as string[]) || [])].filter(Boolean);
  const videoUrl: string = typeof p.video_url === "string" ? p.video_url.trim() : "";
  const media: Array<{ type: "image" | "video"; src: string }> = [
    ...images.map((src) => ({ type: "image" as const, src })),
    ...(videoUrl ? [{ type: "video" as const, src: videoUrl }] : []),
  ];
  const activeMedia = media[active] ?? media[0];
  const price = Number(p.price || 0);
  const mrp = Number(p.original_price || 0);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const wished = has(p.id);
  const liveStock = liveStocks[p.id] ?? Number(p.stock ?? 0);
  const stockInfo = stockStatus(liveStock);
  const specs: { key: string; value: string }[] = Array.isArray(p.specifications) ? p.specifications : [];
  const sizes = productSizes(p);
  const hasSizes = sizes.length > 0;
  const activeImage = activeMedia?.type === "image" ? activeMedia.src : (images[0] || p.image);
  const orderedGallery = [activeImage, ...images.filter((s) => s !== activeImage)];
  const cartProduct: any = {
    id: hasSizes && selectedSize ? `${p.id}::size:${selectedSize}` : p.id,
    title: { en: hasSizes && selectedSize ? `${p.name} (Size: ${selectedSize})` : p.name, bn: hasSizes && selectedSize ? `${p.name} (সাইজ: ${selectedSize})` : p.name },
    image: activeImage,
    gallery: orderedGallery,
    price, mrp: mrp || price, brand: p.brand || "", category: p.category_slug || "",
    rating: Number(p.rating || 0), sold: Number(p.sold_count || 0),
    selectedSize: hasSizes ? selectedSize : undefined,
  };

  const requireSize = () => {
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      sizeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      import("sonner").then(({ toast }) => toast.error("অনুগ্রহ করে একটি সাইজ সিলেক্ট করুন"));
      return false;
    }
    setSizeError(false);
    return true;
  };



  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-3 py-4 md:px-4">
        <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {p.category_slug && <><span className="capitalize">{p.category_slug}</span><ChevronRight className="h-3 w-3" /></>}
          <span className="truncate font-medium text-foreground">{p.name}</span>
        </nav>

        <div className="grid gap-5 md:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          {/* Gallery */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-50 to-pink-50">
              {activeMedia?.type === "video" ? (
                <ProductVideo url={activeMedia.src} fill />
              ) : (
                activeMedia?.src && <ProductImage src={activeMedia.src} alt={p.name} className="size-full object-cover" />
              )}
              <button
                onClick={() => toggle(p.id)}
                className={`absolute right-3 top-3 grid size-10 place-items-center rounded-full shadow ${wished ? "bg-primary text-white" : "bg-white/90 text-foreground"}`}
              >
                <Heart className={`size-5 ${wished ? "fill-current" : ""}`} />
              </button>
              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">-{discount}%</span>
              )}
            </div>
            {media.length > 1 && (
              <div className="mt-3 grid grid-cols-6 gap-2">
                {media.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 ${i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    {m.type === "image" ? (
                      <ProductImage src={m.src} alt="" className="size-full object-cover" />
                    ) : (
                      <>
                        <VideoThumb url={m.src} />
                        <span className="absolute inset-0 grid place-items-center bg-black/30">
                          <span className="grid size-7 place-items-center rounded-full bg-white/90 text-primary shadow">
                            <Play className="size-3.5 fill-current" />
                          </span>
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {p.badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">{p.badge}</span>}
              {p.brand && <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">{p.brand}</span>}
              <span className="flex items-center gap-0.5 text-amber-600">
                <Star className="size-3.5 fill-amber-500 stroke-amber-500" />
                <span className="font-bold">{Number(p.rating || 0).toFixed(1)}</span>
              </span>
              {p.sold_count > 0 && <span className="text-muted-foreground">{p.sold_count} sold</span>}
            </div>

            <h1 className="text-xl font-bold leading-snug md:text-2xl">{p.name}</h1>

            {p.short_description && (
              <p className="text-sm text-muted-foreground">{p.short_description}</p>
            )}

            <div className="py-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-yellow-500">{formatBDT(price)}</span>
                {mrp > price && <span className="text-sm text-muted-foreground line-through">{formatBDT(mrp)}</span>}
              </div>
              {discount > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">You save {formatBDT(mrp - price)} ({discount}% off)</p>
              )}
            </div>


            <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${stockInfo.className} ${stockInfo.outOfStock ? "border-red-200 bg-red-50" : stockInfo.permanent ? "border-emerald-200 bg-emerald-50" : liveStock <= 5 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <span className={`size-1.5 rounded-full ${stockInfo.outOfStock ? "bg-red-500" : liveStock <= 5 && !stockInfo.permanent ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`} />
              {stockInfo.label}
            </div>

            <div className="grid grid-cols-2 gap-1 rounded-md border bg-card p-1.5 text-[10px] sm:grid-cols-3">
              <Kv k="Stock" v={stockInfo.permanent ? "In Stock" : String(liveStock)} />
              <Kv k="SKU" v={p.sku || "—"} />
              {p.weight && <Kv k="Weight" v={`${p.weight} kg`} />}
              {p.warranty && <Kv k="Warranty" v={p.warranty} />}
            </div>



            {(p.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(p.tags as string[]).map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                    <Tag className="size-3" /> {t}
                  </span>
                ))}
              </div>
            )}

            {hasSizes && (
              <div
                ref={sizeSectionRef}
                className={`rounded-md p-1 transition ${sizeError && !selectedSize ? "bg-red-50 ring-1 ring-red-400 animate-pulse" : ""}`}
              >
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                  <span className="text-muted-foreground">Size:</span>
                  {selectedSize && (
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">{selectedSize}</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSelectedSize(s); setSizeError(false); }}
                      className={`min-w-8 rounded-md border px-2 py-0.5 text-xs font-semibold transition ${
                        selectedSize === s
                          ? "border-primary bg-primary text-primary-foreground shadow"
                          : sizeError
                            ? "border-red-400 bg-card hover:border-primary hover:text-primary"
                            : "border-border bg-card hover:border-primary hover:text-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}



            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground">Qty</span>
              <div className="inline-flex items-center overflow-hidden rounded-full border">
                <button disabled={stockInfo.outOfStock} onClick={() => setQty(Math.max(1, qty - 1))} className="grid size-6 place-items-center hover:bg-muted disabled:opacity-40"><Minus className="size-3" /></button>
                <span className="min-w-7 text-center text-xs font-bold">{qty}</span>
                <button disabled={stockInfo.outOfStock || (!stockInfo.permanent && qty >= liveStock)} onClick={() => setQty(qty + 1)} className="grid size-6 place-items-center hover:bg-muted disabled:opacity-40"><Plus className="size-3" /></button>
              </div>
            </div>


            {vendor && (
              <div className="mt-2 flex">
                <Link
                  to="/store/$slug"
                  params={{ slug: vendor.slug }}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card py-1 pl-1 pr-1.5 transition hover:border-primary hover:shadow-sm"
                >
                  <div className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full border bg-muted">
                    {vendor.logo_url ? (
                      <ProductImage src={vendor.logo_url} alt={vendor.store_name} className="size-full object-cover" />
                    ) : (
                      <Store className="size-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="truncate text-xs font-semibold">{vendor.store_name}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Visit Store</span>
                </Link>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {([
                { label: "🛒 Add to Cart", cls: "from-orange-600 via-red-600 to-rose-700", onClick: () => { if (!requireSize()) return; if (!requireAuthForCart()) return; add(cartProduct, qty); } },
                { label: "⚡ Order Now",   cls: "from-fuchsia-700 via-purple-700 to-indigo-800", onClick: () => { if (!requireSize()) return; try { sessionStorage.setItem("buy_now", JSON.stringify({ items: [{ product: cartProduct, qty }] })); } catch {} window.location.href = "/checkout"; } },
              ] as const).map((b) => (
                <button
                  key={b.label}
                  onClick={b.onClick}
                  disabled={stockInfo.outOfStock}
                  className={`flex-1 rounded-full bg-gradient-to-r ${b.cls} py-3 text-base md:text-lg font-bold text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-500 disabled:opacity-70`}
                >
                  {stockInfo.outOfStock ? "❌ Out of Stock" : b.label}
                </button>
              ))}
            </div>


          </div>

        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border bg-card">
          <div className="flex gap-2 border-b px-3">
            {(["desc", "specs"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)}
                className={`relative py-3 px-4 text-sm font-semibold ${tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {k === "desc" ? "Description" : "Specifications"}
                {tab === k && <span className="absolute inset-x-2 bottom-0 h-1 rounded-t-full bg-gradient-to-r from-sky-500 to-pink-500" />}
              </button>
            ))}
          </div>
          <div className="p-4 text-sm">
            {tab === "desc" ? (
              p.description
                ? <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{p.description}</p>
                : <p className="text-muted-foreground">No description provided.</p>
            ) : specs.length ? (
              <table className="w-full text-left">
                <tbody>
                  {specs.map((s, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="w-48 py-2 text-muted-foreground">{s.key}</td>
                      <td className="py-2 font-medium">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-muted-foreground">No specifications listed.</p>}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border bg-card p-4">
          <h2 className="mb-3 text-base font-bold">Customer Reviews & Comments</h2>
          <ReviewSection productId={p.id} />
        </section>

        <RelatedProducts currentId={p.id} categorySlug={p.category_slug} vendorId={p.vendor_id} />
      </div>
    </SiteLayout>
  );
}


function Info({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
      <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-sky-500 to-pink-500 text-white">
        <Icon className="size-3.5" />
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div><span className="text-muted-foreground">{k}:</span> <span className="font-semibold">{v}</span></div>
  );
}

function parseVideo(src: string): { kind: "youtube" | "vimeo" | "file"; id: string } | null {
  const s = String(src || "").trim();
  if (!s) return null;
  const yt = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "youtube", id: yt[1] };
  const vm = s.match(/vimeo\.com\/(\d+)/);
  if (vm) return { kind: "vimeo", id: vm[1] };
  return { kind: "file", id: s };
}

function ProductVideo({ url, fill }: { url: string; fill?: boolean }) {
  const info = parseVideo(url);
  if (!info) return null;
  const wrap = fill ? "absolute inset-0" : "mt-3 aspect-video";
  if (info.kind === "youtube") {
    return (
      <div className={`${wrap} overflow-hidden ${fill ? "" : "rounded-xl border"} bg-black`}>
        <iframe
          src={`https://www.youtube.com/embed/${info.id}?autoplay=1`}
          title="Product video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }
  if (info.kind === "vimeo") {
    return (
      <div className={`${wrap} overflow-hidden ${fill ? "" : "rounded-xl border"} bg-black`}>
        <iframe src={`https://player.vimeo.com/video/${info.id}?autoplay=1`} allow="autoplay; fullscreen" allowFullScreen className="h-full w-full" />
      </div>
    );
  }
  return (
    <div className={`${wrap} overflow-hidden ${fill ? "" : "rounded-xl border"} bg-black`}>
      <video src={info.id} controls autoPlay playsInline className="h-full w-full object-contain" />
    </div>
  );
}

function VideoThumb({ url }: { url: string }) {
  const info = parseVideo(url);
  if (!info) return <div className="size-full bg-black" />;
  if (info.kind === "youtube") {
    return <img src={`https://img.youtube.com/vi/${info.id}/mqdefault.jpg`} alt="" className="size-full object-cover" />;
  }
  if (info.kind === "file") {
    return <video src={info.id} muted playsInline preload="metadata" className="size-full object-cover" />;
  }
  return <div className="size-full bg-gradient-to-br from-slate-800 to-slate-600" />;
}
