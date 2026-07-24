import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useLiveCatalog } from "@/lib/live-catalog";

import { useI18n, pick } from "@/lib/i18n";

export function CategoriesGrid() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const [active, setActive] = useState<string | null>(null);
  const live = useLiveCatalog();
  const categories = live.categories;

  const activeCat = categories.find((c) => c.slug === active) ?? null;

  const goToCat = (slug: string) => {
    navigate({ to: "/category/$slug", params: { slug } });
  };

  const toggle = (slug: string) => {
    setActive((prev) => (prev === slug ? null : slug));
  };

  const onSubClick = (catSlug: string, sub: { slug: string }) => {
    navigate({ to: "/category/$slug", params: { slug: catSlug }, search: { sub: sub.slug } });
  };


  return (
    <section className="mx-auto max-w-none py-3 md:py-4">
      <div className="rounded-md border border-border bg-card p-2 md:p-4">
        <h2 className="mb-2 px-1 text-sm font-bold text-foreground md:mb-3 md:text-lg">{t("top_categories")}</h2>

        {/* Mobile: single-row horizontal scroll */}
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 no-scrollbar md:hidden">
          {categories.map((c) => {
            const isActive = active === c.slug;
            return (
              <div key={c.slug} className="flex w-[calc((100%-3.75rem)/6)] shrink-0 flex-col items-center gap-1 text-center">
                <button
                  type="button"
                  onClick={() => toggle(c.slug)}
                  onDoubleClick={() => goToCat(c.slug)}
                  onContextMenu={(e) => { e.preventDefault(); goToCat(c.slug); }}
                  className="group w-full"
                  aria-label={pick(c.name, lang)}
                >
                  <div className={`aspect-square w-full overflow-hidden rounded-full bg-muted/40 p-1 ring-1 ${isActive ? "ring-2 ring-primary" : "ring-border"}`}>
                    <img src={c.image} alt={pick(c.name, lang)} loading="lazy" className="size-full object-contain" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => toggle(c.slug)}
                  className={`line-clamp-2 text-[9px] leading-tight ${isActive ? "text-primary" : "text-foreground"}`}
                >
                  {pick(c.name, lang)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Tablet/desktop */}
        <div className="hidden md:flex md:snap-x md:snap-mandatory md:gap-4 md:overflow-x-auto md:scroll-smooth md:px-1 md:pb-1 no-scrollbar">
          {categories.map((c) => {
            const isActive = active === c.slug;
            return (
              <div key={c.slug} className="flex w-[88px] shrink-0 snap-start flex-col items-center gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => toggle(c.slug)}
                  onDoubleClick={() => goToCat(c.slug)}
                  onContextMenu={(e) => { e.preventDefault(); goToCat(c.slug); }}
                  className="group w-full"
                  aria-label={pick(c.name, lang)}
                >
                  <div className={`aspect-square w-full overflow-hidden rounded-full bg-muted/40 p-2 ring-1 transition group-hover:ring-2 group-hover:ring-primary ${isActive ? "ring-2 ring-primary" : "ring-border"}`}>
                    <img src={c.image} alt={pick(c.name, lang)} loading="lazy" className="size-full object-contain transition-transform group-hover:scale-110" />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => toggle(c.slug)}
                  className={`line-clamp-2 text-[11px] leading-tight hover:text-primary ${isActive ? "text-primary" : "text-foreground"}`}
                >
                  {pick(c.name, lang)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Subcategory chips for the active category */}
        {activeCat && (
          <div className="mt-2 rounded-md border border-border bg-muted/30 p-1.5 md:mt-3 md:p-2">
            <div className="mb-1.5 flex items-center justify-between px-1 md:mb-2">
              <span className="text-[11px] font-semibold text-foreground md:text-xs">{pick(activeCat.name, lang)}</span>
              <Link
                to="/category/$slug"
                params={{ slug: activeCat.slug }}
                className="text-[10px] font-medium text-primary hover:underline md:text-[11px]"
              >
                {t("view_all") ?? "View all"} →
              </Link>
            </div>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              {activeCat.subcategories.map((s) => {
                return (
                  <button
                    key={s.slug}
                    type="button"
                    onClick={() => onSubClick(activeCat.slug, s)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground md:px-3 md:py-1 md:text-[11px]"
                  >
                    {pick(s.name, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

