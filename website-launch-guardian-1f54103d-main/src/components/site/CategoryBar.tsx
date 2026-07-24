import { CategoriesMenu } from "./CategoriesMenu";
import { Link } from "@tanstack/react-router";
import { useI18n, pick } from "@/lib/i18n";
import { useLiveCatalog } from "@/lib/live-catalog";

export function CategoryBar() {
  const { t, lang } = useI18n();
  const { categories, loading } = useLiveCatalog();
  return (
    <nav className="hidden border-b border-border bg-card md:block">
      <div className="mx-auto flex max-w-none items-center gap-4 px-4 py-2 text-sm">
        <CategoriesMenu variant="bar" />
        <div className="flex items-center gap-5 overflow-x-auto text-foreground no-scrollbar">
          <Link to="/" className="whitespace-nowrap hover:text-primary">{t("home")}</Link>
          <Link to="/search" search={{ q: "flash" }} className="whitespace-nowrap font-semibold text-primary">{t("flash_sale")}</Link>
          {loading && categories.length === 0 ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className="h-4 w-20 shrink-0 animate-pulse rounded bg-muted"
                  aria-hidden
                />
              ))}
              <span className="sr-only">Loading categories…</span>
            </>
          ) : (
            categories.slice(0, 8).map((c) => (
              <Link
                key={c.slug}
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="whitespace-nowrap hover:text-primary"
              >
                {pick(c.name, lang)}
              </Link>
            ))
          )}
        </div>
      </div>
    </nav>
  );
}

