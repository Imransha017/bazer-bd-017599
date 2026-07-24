import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteLayout } from "@/components/site/Layout";
import { ProductCard } from "@/components/site/ProductCard";
import { useLiveCatalog } from "@/lib/live-catalog";
import { useI18n } from "@/lib/i18n";

const schema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: schema,
  head: () => ({ meta: [{ title: "Search — Bazar" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { t } = useI18n();
  const { products, loading } = useLiveCatalog();
  const norm = (v: string) => v.toLowerCase().replace(/[\s\-_/]+/g, "");
  const s = q.trim().toLowerCase();
  const sN = norm(s);
  const results = !s
    ? []
    : products.filter((p) => {
        const hay = [
          p.title.en,
          p.title.bn,
          p.brand,
          p.sku || "",
          p.category,
          p.categoryName || "",
          p.subcategory || "",
          p.subcategoryName || "",
          ...(p.tags || []),
          p.description?.en || "",
          p.description?.bn || "",
        ];
        return hay.some((f) => {
          const fl = f.toLowerCase();
          return fl.includes(s) || (sN && norm(fl).includes(sN));
        });
      });
  return (
    <SiteLayout>
      <div className="mx-auto max-w-none px-3 py-4 md:px-4">
        <h1 className="mb-3 text-lg font-bold">
          {t("results_for")}: <span className="text-primary">"{q}"</span> ({results.length})
        </h1>
        {loading ? (
          <div className="rounded-md bg-card p-12 text-center text-muted-foreground shadow-card">Loading…</div>
        ) : results.length === 0 ? (
          <div className="rounded-md bg-card p-12 text-center text-muted-foreground shadow-card">
            {t("no_results")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
