import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ALWAYS_IN_STOCK = 999999;

/** Extract raw product uuid from cart-line ids like "uuid::size:XL". */
export function rawProductId(id: string): string {
  return String(id || "").split("::")[0];
}

export function stockStatus(stock: number | null | undefined): {
  outOfStock: boolean;
  permanent: boolean;
  label: string;
  className: string;
} {
  const n = Number(stock ?? 0);
  if (n >= ALWAYS_IN_STOCK) return { outOfStock: false, permanent: true, label: "In Stock", className: "text-emerald-600" };
  if (n <= 0) return { outOfStock: true, permanent: false, label: "Out of Stock", className: "text-red-600" };
  if (n <= 5) return { outOfStock: false, permanent: false, label: `Only ${n} left`, className: "text-amber-600" };
  return { outOfStock: false, permanent: false, label: `In Stock (${n})`, className: "text-emerald-600" };
}

/** Subscribe to live stock for a set of product IDs. */
export function useLiveStock(ids: string[]): Record<string, number> {
  const key = ids.filter(Boolean).sort().join(",");
  const [stocks, setStocks] = useState<Record<string, number>>({});

  useEffect(() => {
    const list = key ? key.split(",") : [];
    if (!list.length) { setStocks({}); return; }
    let cancelled = false;

    supabase
      .from("products")
      .select("id,stock")
      .in("id", list)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const map: Record<string, number> = {};
        for (const row of data) map[row.id as string] = Number(row.stock ?? 0);
        setStocks(map);
      });

    const channel = supabase
      .channel(`stock:${list.slice(0, 3).join("-")}-${list.length}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=in.(${list.join(",")})` },
        (payload) => {
          const row = payload.new as { id: string; stock: number };
          setStocks((prev) => ({ ...prev, [row.id]: Number(row.stock ?? 0) }));
        }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [key]);

  return stocks;
}
