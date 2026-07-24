import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type Promotion = {
  id: string;
  placement: "top_bar" | "homepage_strip";
  title: string;
  message: string;
  link_url: string | null;
  button_label: string | null;
  bg_color: string;
  text_color: string;
  sort_order: number;
  active: boolean;
};

function useActivePromotions(placement: Promotion["placement"]) {
  const [items, setItems] = useState<Promotion[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("promotions")
        .select("*")
        .eq("placement", placement)
        .eq("active", true)
        .order("sort_order");
      setItems((data as Promotion[]) ?? []);
    })();
  }, [placement]);
  return items;
}

export function PromotionsTopBar() {
  const promos = useActivePromotions("top_bar");
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const visible = promos.filter((p) => !dismissed[p.id]);
  if (visible.length === 0) return null;
  return (
    <div className="w-full">
      {visible.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-center gap-3 px-3 py-1.5 text-[12px] font-medium"
          style={{ background: p.bg_color, color: p.text_color }}
        >
          {p.title ? <span className="font-bold">{p.title}</span> : null}
          <span className="truncate">{p.message}</span>
          {p.link_url ? (
            <a
              href={p.link_url}
              className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold hover:bg-white/30"
            >
              {p.button_label || "Learn more"}
            </a>
          ) : null}
          <button
            aria-label="Dismiss"
            onClick={() => setDismissed((d) => ({ ...d, [p.id]: true }))}
            className="ml-auto rounded-full p-0.5 hover:bg-white/20"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function PromotionsStrip() {
  const promos = useActivePromotions("homepage_strip");
  if (promos.length === 0) return null;
  return (
    <section className="mx-auto max-w-none pt-3">
      <div className="grid gap-2 md:grid-cols-2">
        {promos.map((p) => (
          <a
            key={p.id}
            href={p.link_url || "#"}
            className="flex items-center justify-between rounded-md p-3 shadow-card transition hover:scale-[1.01] md:p-4"
            style={{ background: p.bg_color, color: p.text_color }}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold md:text-base">{p.title}</p>
              <p className="mt-0.5 truncate text-[11px] opacity-90 md:text-xs">{p.message}</p>
            </div>
            {p.button_label ? (
              <span className="ml-3 shrink-0 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-900">
                {p.button_label}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
