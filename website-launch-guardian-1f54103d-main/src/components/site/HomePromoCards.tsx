import { useEffect, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type PromoCard = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_label: string | null;
  button_link: string | null;
  gradient_from: string;
  gradient_to: string;
};

export function HomePromoCards() {
  const [items, setItems] = useState<PromoCard[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("banners")
        .select("*")
        .eq("active", true)
        .eq("placement", "home_promo_card")
        .order("sort_order");
      setItems((data as PromoCard[]) ?? []);
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-none pt-3">
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar md:gap-3">
        {items.map((b) => (
          <a
            key={b.id}
            href={b.link_url || "#"}
            className={`group relative flex h-20 w-[calc((100%-1rem)/2)] shrink-0 snap-start items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r ${b.gradient_from || "from-rose-500"} ${b.gradient_to || "to-sky-500"} px-3 text-white shadow-md md:h-24 md:w-[calc((100%-1.5rem)/3)] md:px-4`}
          >
            <div className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-white/15 blur-2xl md:size-20" />
            {b.image_url ? (
              <img src={b.image_url} alt="" className="size-12 shrink-0 rounded-md object-cover shadow-lg ring-1 ring-white/30 md:size-14" />
            ) : (
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-white/30 md:size-12">
                <Sparkles className="size-5 md:size-6" />
              </div>
            )}
            <div className="relative z-10 min-w-0 flex-1">
              <p className="truncate text-[12px] font-extrabold leading-tight md:text-sm">{b.title}</p>
              <p className="truncate text-[10px] opacity-95 md:text-[11px]">{b.subtitle}</p>
              {b.button_label ? (
                <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold text-slate-900 md:text-[10px]">
                  {b.button_label} <ChevronRight className="size-2.5" />
                </span>
              ) : null}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
