import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, ChevronRight, X } from "lucide-react";
import { useLiveCatalog } from "@/lib/live-catalog";
import { useI18n, pick } from "@/lib/i18n";

export function CategoriesMenu({ variant = "bar" }: { variant?: "bar" | "compact" }) {
  const { lang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const { categories } = useLiveCatalog();
  const [active, setActive] = useState<string | undefined>(undefined);
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

  const activeCat = categories.find((c) => c.slug === active) ?? categories[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          variant === "bar"
            ? "flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            : "flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25"
        }
        aria-expanded={open}
      >
        <LayoutGrid className="size-4" />
        <span>{t("categories")}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[min(92vw,720px)] overflow-hidden rounded-md border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">{t("top_categories")}</span>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-[200px_1fr] max-h-[70vh]">
            <ul className="overflow-y-auto border-r border-border bg-muted/30 py-1 text-sm">
              {categories.map((c) => (
                <li key={c.slug}>
                  <button
                    onMouseEnter={() => setActive(c.slug)}
                    onFocus={() => setActive(c.slug)}
                    onClick={() => setActive(c.slug)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition ${
                      active === c.slug ? "bg-card font-semibold text-primary" : "text-foreground hover:bg-card"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base leading-none">{c.icon}</span>
                      <span className="line-clamp-1 text-[13px]">{pick(c.name, lang)}</span>
                    </span>
                    <ChevronRight className="size-3.5 opacity-60" />
                  </button>
                </li>
              ))}
            </ul>
            {activeCat && (
              <div className="overflow-y-auto p-3">
                <Link
                  to="/category/$slug"
                  params={{ slug: activeCat.slug }}
                  onClick={() => setOpen(false)}
                  className="mb-3 flex items-center gap-3 rounded-md bg-muted/50 p-2 hover:bg-muted"
                >
                  <img src={activeCat.image} alt="" className="size-12 rounded object-cover" />
                  <div>
                    <div className="text-sm font-semibold">{pick(activeCat.name, lang)}</div>
                    <div className="text-xs text-muted-foreground">{t("view_all")} →</div>
                  </div>
                </Link>
                <SubcategoryList
                  activeCat={activeCat}
                  lang={lang}
                  onNavigate={() => setOpen(false)}
                />

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SubcategoryList({
  activeCat,
  lang,
  onNavigate,
}: {
  activeCat: { slug: string; subcategories: Array<{ slug: string; name: any; children?: Array<{ slug: string; name: any }> }> };
  lang: any;
  onNavigate: () => void;
}) {
  const [openSub, setOpenSub] = useState<string | null>(null);

  return (
    <ul className="flex flex-col items-start gap-1.5 pb-1">
      {activeCat.subcategories.map((s) => {
        const isOn = openSub === s.slug;
        const kids = s.children ?? [];
        const hasKids = kids.length > 0;
        return (
          <li key={s.slug} className="flex w-full flex-col items-start gap-1.5">
            <div className="flex items-center overflow-hidden rounded-full border border-primary/30 bg-primary/5">
              <Link
                to="/category/$slug"
                params={{ slug: activeCat.slug }}
                search={{ sub: s.slug }}
                onClick={onNavigate}
                className={`whitespace-nowrap px-3 py-1.5 text-[12px] font-semibold ${isOn ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary hover:text-primary-foreground"}`}
              >
                {pick(s.name, lang)}
              </Link>
              {hasKids && (
                <button
                  type="button"
                  aria-label="Expand"
                  onClick={() => setOpenSub((prev) => (prev === s.slug ? null : s.slug))}
                  className={`border-l border-primary/30 px-1.5 py-1.5 text-[10px] ${isOn ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/10"}`}
                >
                  {isOn ? "▴" : "▾"}
                </button>
              )}
            </div>
            {isOn && hasKids && (
              <ul className="ml-3 flex w-full flex-col items-start gap-1 border-l border-primary/20 pl-2 pb-1">
                {kids.map((g) => (
                  <li key={`${s.slug}-${g.slug}`}>
                    <Link
                      to="/category/$slug"
                      params={{ slug: activeCat.slug }}
                      search={{ sub: g.slug }}
                      onClick={onNavigate}
                      className="inline-block whitespace-nowrap rounded-full border px-3 py-1 text-[12px] text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary"
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



