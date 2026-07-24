import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import {
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Minus,
  Plus,
  Heart,
  Share2,
  MapPin,
  MessageCircle,
  Store,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { ReviewSection } from "@/components/site/ReviewSection";
import { formatBDT, getProduct, productsByCategory, getCategory } from "@/lib/data";
import { useI18n, pick } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";

function ProductGallery({ images, alt, productId, active, setActive }: { images: string[]; alt: string; productId: string; active: number; setActive: (i: number) => void }) {
  const { has, toggle } = useWishlist();
  const wished = has(productId);
  return (
    <div className="md:sticky md:top-4">
      <div className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-50 via-pink-50 to-amber-50 p-1 shadow-lg ring-1 ring-primary/10 dark:from-sky-950/30 dark:via-pink-950/20 dark:to-amber-950/30">
        <img src={images[active]} alt={alt} className="size-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-105" />
        <button
          onClick={() => toggle(productId)}
          className={`absolute right-3 top-3 grid size-10 place-items-center rounded-full shadow-lg backdrop-blur transition ${wished ? "bg-primary text-primary-foreground" : "bg-white/90 text-foreground hover:bg-white"}`}
        >
          <Heart className={`size-5 ${wished ? "fill-current" : ""}`} />
        </button>
        <button className="absolute right-3 top-16 grid size-10 place-items-center rounded-full bg-white/90 text-foreground shadow-lg backdrop-blur transition hover:bg-white">
          <Share2 className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-2">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`aspect-square overflow-hidden rounded-lg border-2 transition ${
              i === active ? "border-primary shadow-md shadow-primary/30 scale-105" : "border-transparent opacity-70 hover:opacity-100 hover:border-primary/50"
            }`}
          >
            <img src={src} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}


export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const p = getProduct(params.id);
    if (!p) throw notFound();
    return { p };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.p.title.en ?? "Product"} — Bazar` },
      { name: "description", content: loaderData?.p.description.en ?? "" },
      { property: "og:title", content: loaderData?.p.title.en ?? "" },
      { property: "og:image", content: loaderData?.p.image ?? "" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { p } = Route.useLoaderData();
  const { lang, t } = useI18n();
  const { add } = useCart();
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);
  const productWithSelectedImage = (base: typeof p) => ({
    ...base,
    image: base.gallery?.[activeImg] ?? base.image,
    gallery: [base.gallery?.[activeImg] ?? base.image, ...(base.gallery ?? []).filter((_: string, i: number) => i !== activeImg)],
  });
  const addToCart = (base: typeof p, q: number) => add(productWithSelectedImage(base), q);
  const buyNow = (base: typeof p, q: number) => {
    try {
      sessionStorage.setItem("buy_now", JSON.stringify({ items: [{ product: productWithSelectedImage(base), qty: q }] }));
    } catch {}
    // Hard navigation guarantees /checkout opens even if router state is stale
    if (typeof window !== "undefined") {
      window.location.href = "/checkout";
    } else {
      navigate({ to: "/checkout" });
    }
  };
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
  const cat = getCategory(p.category);
  const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const related = productsByCategory(p.category).filter((x) => x.id !== p.id).slice(0, 12);
  const ratingCount = Math.max(12, Math.round(p.sold * 0.18));

  return (
    <SiteLayout>
      <div className="bg-gradient-to-b from-sky-50/60 via-background to-background dark:from-sky-950/20">
       <div className="mx-auto max-w-none px-2 py-3 pb-24 md:px-4 md:pb-3">

        <div className="grid gap-3 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)_300px] md:gap-4">
          {/* gallery */}
          <ProductGallery images={p.gallery} alt={pick(p.title, lang)} productId={p.id} active={activeImg} setActive={setActiveImg} />

          {/* info */}
          <div className="space-y-3 rounded-2xl border border-border/50 bg-card p-4 shadow-lg md:p-5">
            {discount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-sky-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                🔥 Hot Deal · Save {discount}%
              </span>
            )}
            <h1 className="text-base font-bold leading-snug text-foreground md:text-lg">
              {pick(p.title, lang)}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-3.5 ${i < Math.round(p.rating) ? "fill-amber-500 stroke-amber-500" : "fill-transparent stroke-muted-foreground"}`}
                  />
                ))}
                <span className="ml-1 font-bold">{p.rating.toFixed(1)}</span>
              </span>
              <a href="#reviews" className="font-medium text-sky-600 hover:underline dark:text-sky-400">{ratingCount} Ratings</a>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{p.sold.toLocaleString()} {t("sold")}</span>
              <span className="text-muted-foreground">{t("brand")}: <a className="font-semibold text-violet-600 hover:underline dark:text-violet-400">{p.brand}</a></span>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-sky-500 via-rose-500 to-pink-600 p-4 text-white shadow-md">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-yellow-300 drop-shadow md:text-4xl">{formatBDT(p.price)}</span>
                <span className="text-sm text-white/70 line-through">{formatBDT(p.mrp)}</span>
              </div>
              {discount > 0 && (
                <p className="mt-1 text-xs font-medium text-white/90">You save {formatBDT(p.mrp - p.price)} ({discount}% off)</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {[
                { icon: Truck, label: "Free Delivery", color: "from-sky-500 to-blue-600" },
                { icon: ShieldCheck, label: "Genuine Product", color: "from-emerald-500 to-green-600" },
                { icon: RotateCcw, label: "7 Day Return", color: "from-amber-500 to-sky-600" },
                { icon: Headphones, label: "24/7 Support", color: "from-violet-500 to-purple-600" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2">
                  <span className={`grid size-7 place-items-center rounded-md bg-gradient-to-br ${b.color} text-white shadow-sm`}>
                    <b.icon className="size-3.5" />
                  </span>
                  <span className="font-medium">{b.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs font-semibold text-muted-foreground">Qty</span>
              <div className="inline-flex items-center overflow-hidden rounded-full border border-border bg-card">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid size-8 place-items-center hover:bg-muted"><Minus className="size-3.5" /></button>
                <span className="min-w-8 text-center text-sm font-bold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="grid size-8 place-items-center hover:bg-muted"><Plus className="size-3.5" /></button>
              </div>
            </div>

            <div className="hidden gap-2 pt-1 md:flex">
              <button
                onClick={() => addToCart(p, qty)}
                className="flex-1 rounded-full bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg hover:brightness-110"
              >
                🛒 {t("add_to_cart")}
              </button>
              <button
                onClick={() => buyNow(p, qty)}
                className="flex-1 rounded-full bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-800 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg hover:brightness-110"
              >
                ⚡ {t("buy_now")}
              </button>
            </div>
          </div>

          {/* delivery / buy box */}
          <div className="space-y-3">
            <div className="hidden space-y-3 rounded-2xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 shadow-md md:block dark:border-sky-900/40 dark:from-sky-950/30 dark:to-cyan-950/30">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Truck className="size-4 text-sky-600" /> Delivery</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 text-rose-500" />
                  <div>
                    <p className="text-muted-foreground">Shipping to</p>
                    <p className="font-semibold">Dhaka, Dhaka North, Banani Road No. 12 - 17</p>
                    <button className="font-medium text-sky-600 hover:underline">Change</button>
                  </div>
                </div>
              </div>
            </div>

            {/* seller */}
            <div className="hidden space-y-3 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 text-xs shadow-md md:block dark:border-violet-900/40 dark:from-violet-950/30 dark:to-fuchsia-950/30">
              <div className="flex items-center gap-2">
                <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow">
                  <Store className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{p.brand} Official Store</p>
                  <p className="text-emerald-600 dark:text-emerald-400">● Online 5 minutes ago</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 border-y border-border/50 py-2 text-center">
                <div>
                  <p className="font-bold text-emerald-600">92%</p>
                  <p className="text-[10px] text-muted-foreground">Positive</p>
                </div>
                <div>
                  <p className="font-bold text-sky-600">95%</p>
                  <p className="text-[10px] text-muted-foreground">On Time</p>
                </div>
                <div>
                  <p className="font-bold text-amber-600">88%</p>
                  <p className="text-[10px] text-muted-foreground">Response</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white py-1.5 text-xs font-semibold text-violet-600 shadow-sm hover:bg-violet-50 dark:bg-card">
                  <MessageCircle className="size-3.5" /> Chat
                </button>
                <button className="flex flex-1 items-center justify-center gap-1 rounded-full bg-white py-1.5 text-xs font-semibold text-fuchsia-600 shadow-sm hover:bg-fuchsia-50 dark:bg-card">
                  <Store className="size-3.5" /> Visit
                </button>
              </div>
            </div>
          </div>
        </div>



        {/* tabs */}
        <section id="reviews" className="mt-4 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg">
          <div className="flex gap-2 border-b border-border bg-gradient-to-r from-sky-50 via-pink-50 to-violet-50 px-3 dark:from-sky-950/30 dark:via-pink-950/20 dark:to-violet-950/30">
            {([
              ["desc", t("description"), "from-sky-500 to-rose-500"],
              ["specs", t("specifications"), "from-sky-500 to-cyan-500"],
              ["reviews", `${t("reviews")} (${ratingCount})`, "from-violet-500 to-fuchsia-500"],
            ] as const).map(([key, label, grad]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative py-3 px-4 text-sm font-semibold transition ${
                  tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {tab === key && <span className={`absolute inset-x-2 bottom-0 h-1 rounded-t-full bg-gradient-to-r ${grad}`} />}
              </button>
            ))}
          </div>

          <div className="p-4 text-sm">
            {tab === "desc" && (
              <div className="space-y-3">
                <p className="leading-relaxed text-muted-foreground">{pick(p.description, lang)}</p>
              </div>

            )}
            {tab === "specs" && (
              <table className="w-full text-left text-sm">
                <tbody>
                  {[
                    ["Brand", p.brand],
                    ["Category", cat ? pick(cat.name, lang) : "-"],
                    ["SKU", p.id.toUpperCase()],
                    ["Warranty", "7 Days Return"],
                    ["Shipping Weight", "0.5 kg"],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-border last:border-0">
                      <td className="w-40 py-2 text-muted-foreground">{k}</td>
                      <td className="py-2 font-medium">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "reviews" && <ReviewSection productId={p.id} />}
          </div>
        </section>

        {/* Mobile seller block (below tabs) */}
        <section className="mt-3 space-y-3 rounded-md bg-card p-4 text-xs shadow-card md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-full bg-muted">
              <Store className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.brand} Official Store</p>
              <p className="text-muted-foreground">Online 5 minutes ago</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-y border-border py-2 text-center">
            <div>
              <p className="font-bold text-primary">92%</p>
              <p className="text-[10px] text-muted-foreground">Positive Seller Ratings</p>
            </div>
            <div>
              <p className="font-bold text-primary">95%</p>
              <p className="text-[10px] text-muted-foreground">Ship on Time</p>
            </div>
            <div>
              <p className="font-bold text-primary">88%</p>
              <p className="text-[10px] text-muted-foreground">Chat Response</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex flex-1 items-center justify-center gap-1 rounded border border-border py-1.5 text-xs hover:border-primary hover:text-primary">
              <MessageCircle className="size-3.5" /> Chat
            </button>
            <button className="flex flex-1 items-center justify-center gap-1 rounded border border-border py-1.5 text-xs hover:border-primary hover:text-primary">
              <Store className="size-3.5" /> Visit
            </button>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-1.5">
            <div className="overflow-hidden rounded-md bg-card shadow-card">
              <div className="border-b px-3 py-2 text-base font-bold md:px-4">{t("for_you")}</div>
              <div className="flex gap-2 overflow-x-auto p-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
                {related.map((r) => (
                  <div key={r.id} className="w-[calc((100%-1.5rem)/4)] flex-shrink-0 snap-start">
                    <ProductCard p={r} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
      </div>

      {/* Mobile sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-12 z-40 flex items-stretch border-t border-border bg-card shadow-2xl md:hidden">
        <button className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-sky-600">
          <MessageCircle className="size-4" /> Chat
        </button>
        <button className="flex flex-1 flex-col items-center justify-center gap-0.5 border-x border-border py-2 text-[10px] text-violet-600">
          <Store className="size-4" /> Store
        </button>
        <button
          onClick={() => addToCart(p, qty)}
          className="flex-[2] bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 text-sm font-bold text-white"
        >
          {t("add_to_cart")}
        </button>
        <button
          onClick={() => buyNow(p, qty)}
          className="flex-[2] bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-800 text-sm font-bold text-white"
        >
          {t("buy_now")}
        </button>
      </div>

    </SiteLayout>

  );
}
