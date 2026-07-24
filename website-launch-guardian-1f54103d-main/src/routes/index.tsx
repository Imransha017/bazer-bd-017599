import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { Hero } from "@/components/site/Hero";
import { PromotionsStrip } from "@/components/site/Promotions";
import { HomeVideos } from "@/components/site/HomeVideos";
import { HomePromoCards } from "@/components/site/HomePromoCards";
import { CategoriesGrid } from "@/components/site/CategoriesGrid";
import { FlashSale } from "@/components/site/FlashSale";
import { ProductCard } from "@/components/site/ProductCard";
import { products } from "@/lib/data";
import { useLiveCatalog } from "@/lib/live-catalog";

import { useI18n, pick } from "@/lib/i18n";
import { Ticket, Truck, ShieldCheck, BadgePercent, Crown, Sparkles, Smartphone, Shirt, ArrowRight, MoreHorizontal } from "lucide-react";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bazar Online Shopping App in Bangladesh" },
      { name: "description", content: "Online Shopping Bangladesh - Mobiles, Fashion, Electronics, Home Appliances at lowest prices. Free Delivery & Cash on Delivery." },
      { property: "og:title", content: "Bazar Online Shopping App in Bangladesh" },
      { property: "og:description", content: "Mega flash sales daily — mobiles, fashion, home and more." },
    ],
  }),
  component: HomePage,
});

const vouchers = [
  { code: "BAZAR50", off: "৳50 OFF", min: "Min. ৳499" },
  { code: "FREE100", off: "৳100 OFF", min: "Min. ৳999" },
  { code: "MEGA200", off: "৳200 OFF", min: "Min. ৳1999" },
  { code: "MALL500", off: "৳500 OFF", min: "Min. ৳4999" },
];

const services = [
  { icon: Truck, label: { en: "Free Shipping", bn: "ফ্রি ডেলিভারি" } },
  { icon: ShieldCheck, label: { en: "100% Authentic", bn: "১০০% অরিজিনাল" } },
  { icon: BadgePercent, label: { en: "Lowest Price", bn: "সর্বনিম্ন দাম" } },
  { icon: Crown, label: { en: "Bazar Mall", bn: "বাজার মল" } },
  { icon: Sparkles, label: { en: "Daily Deals", bn: "ডেইলি ডিল" } },
  { icon: Ticket, label: { en: "Vouchers", bn: "ভাউচার" } },
];

const worldBrands = ["Apple", "Samsung", "Xiaomi", "HP", "Sony", "LG", "Logitech", "Asus", "Realme", "Anker", "JBL", "Philips"];

function HomePage() {
  const { lang, t } = useI18n();
  const live = useLiveCatalog();
  const PAGE_SIZE = 100;
  const [visible, setVisible] = useState(PAGE_SIZE);
  const feedSource = live.products.length > 0 ? live.products : products;
  const feed = feedSource.slice(0, visible);
  const hasMore = visible < feedSource.length;



  return (
    <SiteLayout>
      <Hero />
      <PromotionsStrip />
      <HomePromoCards />
      <HomeVideos />


      {/* Services strip */}
      <section className="mx-auto max-w-none pt-3">
        <div className="flex gap-4 overflow-x-auto rounded-md bg-card p-3 shadow-card no-scrollbar sm:grid sm:grid-cols-6 sm:gap-2 sm:overflow-visible">
          {services.map((s) => (
            <div key={s.label.en} className="flex shrink-0 flex-col items-center gap-1 text-center sm:shrink">
              <s.icon className="size-6 text-primary" />
              <span className="whitespace-nowrap text-[11px] font-medium text-foreground sm:whitespace-normal">{pick(s.label, lang)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Voucher strip */}
      <section className="mx-auto max-w-none pt-3">
        <div className="overflow-hidden rounded-md bg-gradient-brand p-2 text-white shadow-card md:p-4">
          <div className="mb-1.5 flex items-center justify-between md:mb-2">
            <h2 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide md:text-base">
              <Ticket className="size-3.5 md:size-5" /> Collect Vouchers
            </h2>
            <span className="text-[9px] opacity-90 md:text-[11px]">Daily refresh</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 md:gap-2">
            {vouchers.map((v) => (
              <div key={v.code} className="relative flex flex-col items-center justify-center rounded-md bg-white/95 px-1 py-1.5 text-center text-foreground md:flex-row md:justify-between md:px-3 md:py-2 md:text-left">
                <div className="leading-tight">
                  <p className="text-xs font-extrabold text-primary md:text-base">{v.off}</p>
                  <p className="hidden text-[10px] text-muted-foreground md:block">{v.min}</p>
                </div>
                <button className="mt-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground hover:opacity-90 md:mt-0 md:px-2 md:py-1 md:text-[11px]">
                  COLLECT
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CategoriesGrid />
      <FlashSale />

      {/* Promo banner strip */}
      <section className="mx-auto max-w-none pt-3">
        <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar md:gap-3">
          {[
            { t: "Mega Sale", s: "Up to 70% OFF", from: "from-rose-500", to: "to-sky-500", slug: "fashion-women", Icon: BadgePercent },
            { t: "Free Delivery", s: "On orders over ৳499", from: "from-emerald-500", to: "to-teal-600", slug: "groceries", Icon: Truck },
            { t: "New Arrivals", s: "Fresh picks daily", from: "from-sky-500", to: "to-indigo-600", slug: "electronics", Icon: Sparkles },
            { t: "Mobile Fest", s: "Latest phones 40% OFF", from: "from-violet-500", to: "to-fuchsia-600", slug: "electronics", Icon: Smartphone },
            { t: "Fashion Week", s: "Buy 1 Get 1 Free", from: "from-pink-500", to: "to-rose-600", slug: "fashion-women", Icon: Shirt },
            { t: "Vouchers", s: "Collect & save more", from: "from-amber-500", to: "to-sky-600", slug: "groceries", Icon: Ticket },
          ].map((b) => (
            <Link
              key={b.t}
              to="/category/$slug"
              params={{ slug: b.slug }}
              className={`group relative flex h-16 w-[calc((100%-1rem)/3)] shrink-0 snap-start items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r ${b.from} ${b.to} px-3 text-white shadow-sm md:h-20 md:w-[calc((100%-1.5rem)/3)] md:px-4`}
            >
              <div className="pointer-events-none absolute -right-3 -top-3 size-12 rounded-full bg-white/15 blur-xl md:size-16" />
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/30 md:size-10">
                <b.Icon className="size-4 md:size-5" />
              </div>
              <div className="relative z-10 min-w-0">
                <p className="truncate text-[12px] font-extrabold leading-tight md:text-sm">{b.t}</p>
                <p className="truncate text-[10px] opacity-95 md:text-[11px]">{b.s}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* Just For You */}
      <section className="mx-auto max-w-none pt-3 pb-6">
        <div className="overflow-hidden rounded-md bg-card shadow-card">
          <div className="border-b bg-gradient-brand px-3 py-2 text-white md:px-4">
            <h2 className="text-base font-extrabold md:text-lg">{t("for_you")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {feed.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center p-4">
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-6 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground transition"
              >
                <MoreHorizontal className="size-4" />
                {t("shop_more")} ({feedSource.length - visible})
              </button>
            </div>
          )}
        </div>
      </section>

    </SiteLayout>
  );
}
