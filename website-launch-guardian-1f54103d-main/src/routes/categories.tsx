import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useLiveCatalog } from "@/lib/live-catalog";
import { useI18n, pick } from "@/lib/i18n";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "All Categories" },
      { name: "description", content: "Browse all categories and subcategories." },
    ],
  }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { lang, t } = useI18n();
  const { categories, loading } = useLiveCatalog();
  const [active, setActive] = useState<string | undefined>(undefined);
  const activeCat = categories.find((c) => c.slug === active) ?? categories[0];

  return (
    <div className="mx-auto max-w-none">
      <div className="sticky top-0 z-10 border-b bg-card px-3 py-2 text-sm font-semibold md:hidden">
        {t("categories")}
      </div>
      <div className="grid grid-cols-[110px_1fr] md:grid-cols-[220px_1fr]" style={{ minHeight: "calc(100vh - 120px)" }}>
        <ul className="overflow-y-auto border-r bg-muted/30 text-[12px] md:text-sm">
          {categories.map((c) => (
            <li key={c.slug}>
              <button
                onClick={() => setActive(c.slug)}
                className={`flex w-full flex-col items-center gap-1 px-2 py-3 text-center transition md:flex-row md:justify-between md:text-left ${
                  active === c.slug
                    ? "bg-card font-semibold text-primary"
                    : "text-foreground hover:bg-card"
                }`}
              >
                <span className="flex flex-col items-center gap-1 md:flex-row">
                  <span className="text-xl leading-none md:text-base">{c.icon}</span>
                  <span className="line-clamp-2 md:line-clamp-1">{pick(c.name, lang)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {activeCat ? (
          <div className="overflow-y-auto p-3">
            <Link
              to="/category/$slug"
              params={{ slug: activeCat.slug }}
              className="mb-3 flex items-center gap-3 rounded-md bg-muted/50 p-2 hover:bg-muted"
            >
              <img src={activeCat.image} alt="" className="size-12 rounded object-cover" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{pick(activeCat.name, lang)}</div>
                <div className="text-xs text-muted-foreground">{t("view_all")} →</div>
              </div>
              <ChevronRight className="ml-auto size-4 opacity-60" />
            </Link>
            <MobileSubcategoryList activeCat={activeCat} lang={lang} />

          </div>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            {loading ? "Loading…" : "No categories yet. Sync from WordPress first."}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileSubcategoryList({
  activeCat,
  lang,
}: {
  activeCat: { slug: string; subcategories: Array<{ slug: string; name: any; children?: Array<{ slug: string; name: any }> }> };
  lang: any;
}) {
  const [openSub, setOpenSub] = useState<string | null>(null);

  return (
    <ul className="flex flex-col items-start gap-1.5 pb-2">
      {activeCat.subcategories.map((s) => {
        const isOn = openSub === s.slug;
        const kids = s.children ?? [];
        const hasKids = kids.length > 0;
        return (
          <li key={s.slug} className="flex w-full min-w-0 flex-col items-start gap-1.5">
            <div className="flex w-full min-w-0 items-stretch overflow-hidden rounded-2xl border border-primary/30 bg-primary/5">
              <Link
                to="/category/$slug"
                params={{ slug: activeCat.slug }}
                search={{ sub: s.slug }}
                className={`min-w-0 flex-1 break-words px-3 py-1.5 text-[12px] font-semibold leading-snug ${isOn ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary hover:text-primary-foreground"}`}
              >
                {pick(s.name, lang)}
              </Link>
              {hasKids && (
                <button
                  type="button"
                  aria-label="Expand"
                  onClick={() => setOpenSub((prev) => (prev === s.slug ? null : s.slug))}
                  className={`shrink-0 border-l border-primary/30 px-2 text-[10px] ${isOn ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/10"}`}
                >
                  {isOn ? "▴" : "▾"}
                </button>
              )}
            </div>
            {isOn && hasKids && (
              <ul className="ml-2 flex w-full min-w-0 flex-col items-start gap-1 border-l border-primary/20 pl-2 pb-1">
                {kids.map((g) => (
                  <li key={`${s.slug}-${g.slug}`} className="w-full min-w-0">
                    <Link
                      to="/category/$slug"
                      params={{ slug: activeCat.slug }}
                      search={{ sub: g.slug }}
                      className="block w-full break-words rounded-xl border bg-card px-3 py-1 text-[12px] leading-snug text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
                    >
                      {pick(g.name, lang)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

          </li>
        );
      })}
    </ul>
  );
}



