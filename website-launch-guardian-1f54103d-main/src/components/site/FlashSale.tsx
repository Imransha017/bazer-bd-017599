import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { flashSale } from "@/lib/data";
import { ProductCard } from "./ProductCard";
import { useI18n } from "@/lib/i18n";

function useCountdown() {
  const [s, setS] = useState(() => 3 * 3600 + 42 * 60 + 17);
  useEffect(() => {
    const t = setInterval(() => setS((v) => (v > 0 ? v - 1 : 3 * 3600 + 42 * 60 + 17)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { h, m, s: sec };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function FlashSale() {
  const { t } = useI18n();
  const { h, m, s } = useCountdown();
  return (
    <section className="mx-auto max-w-none pb-4">
      <div className="overflow-hidden rounded-md bg-card shadow-card">
        <div className="flex items-center justify-between bg-gradient-flash px-3 py-2 text-white md:px-4 md:py-3">
          <div className="flex items-center gap-2">
            <Zap className="size-5 fill-white" />
            <h2 className="text-base font-extrabold uppercase tracking-wide md:text-lg">{t("flash_sale")}</h2>
            <span className="hidden text-xs opacity-90 md:inline">| {t("ends_in")}</span>
            <div className="flex items-center gap-1 text-xs font-bold">
              <span className="rounded bg-black/40 px-1.5 py-0.5">{pad(h)}</span>:
              <span className="rounded bg-black/40 px-1.5 py-0.5">{pad(m)}</span>:
              <span className="rounded bg-black/40 px-1.5 py-0.5">{pad(s)}</span>
            </div>
          </div>
          <Link to="/category/$slug" params={{ slug: "electronics" }} className="text-xs font-medium hover:underline">
            {t("shop_more")} →
          </Link>
        </div>
        {/* Mobile: horizontal scroll strip */}
        <div className="flex gap-2 overflow-x-auto p-2 no-scrollbar md:hidden">
          {flashSale.map((p) => (
            <div key={p.id} className="w-[42vw] max-w-[180px] shrink-0">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
        <div className="hidden gap-2 p-2 md:grid md:grid-cols-4 lg:grid-cols-6">
          {flashSale.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
