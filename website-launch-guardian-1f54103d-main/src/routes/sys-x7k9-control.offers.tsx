import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag, Search, Pencil, Save } from "lucide-react";
import { PageHeader } from "@/lib/admin-ui";
import { ProductImage } from "@/components/ProductImage";
import { ProductEditModal, ALWAYS_IN_STOCK } from "@/components/ProductEditModal";
import type { DBProduct } from "@/lib/admin-api";

export const Route = createFileRoute("/sys-x7k9-control/offers")({
  component: OffersAdmin,
});

type StockKey = "all" | "permanent" | "numeric" | "out";
type OfferKey = "all" | "active" | "scheduled" | "expired" | "none";

const stockLabel = (n: number) =>
  n >= ALWAYS_IN_STOCK ? "In stock" : n <= 0 ? "Out of stock" : String(n);

function OffersAdmin() {
  const [items, setItems] = useState<DBProduct[]>([]);
  const [q, setQ] = useState("");
  const [stockFilter, setStockFilter] = useState<StockKey>("all");
  const [offerFilter, setOfferFilter] = useState<OfferKey>("active");
  const [editing, setEditing] = useState<Partial<DBProduct> | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as unknown as DBProduct[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const now = Date.now();
  const offerState = (p: DBProduct): OfferKey => {
    const disc = Number((p as any).discount_percent) || 0;
    const hasDisc = disc > 0 || (p.original_price && Number(p.original_price) > Number(p.price));
    if (!hasDisc) return "none";
    const starts = (p as any).offer_starts_at ? new Date((p as any).offer_starts_at).getTime() : null;
    const ends = (p as any).offer_ends_at ? new Date((p as any).offer_ends_at).getTime() : null;
    if (ends && ends < now) return "expired";
    if (starts && starts > now) return "scheduled";
    return "active";
  };

  const counts = useMemo(() => {
    const c = { all: items.length, active: 0, scheduled: 0, expired: 0, none: 0 };
    for (const p of items) c[offerState(p)]++;
    return c;
  }, [items]);

  const stockCounts = useMemo(() => ({
    all: items.length,
    permanent: items.filter((p) => Number(p.stock) >= ALWAYS_IN_STOCK).length,
    numeric: items.filter((p) => Number(p.stock) > 0 && Number(p.stock) < ALWAYS_IN_STOCK).length,
    out: items.filter((p) => Number(p.stock) <= 0).length,
  }), [items]);

  const filtered = items
    .filter((p) => (offerFilter === "all" ? true : offerState(p) === offerFilter))
    .filter((p) => {
      const s = Number(p.stock);
      if (stockFilter === "all") return true;
      if (stockFilter === "permanent") return s >= ALWAYS_IN_STOCK;
      if (stockFilter === "numeric") return s > 0 && s < ALWAYS_IN_STOCK;
      return s <= 0;
    })
    .filter((p) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      const st = Number(p.stock);
      const stockLbl = st >= ALWAYS_IN_STOCK ? "in stock permanent" : st <= 0 ? "out of stock" : `stock number ${st}`;
      const offLbl = offerState(p);
      return (
        p.name.toLowerCase().includes(s) ||
        (p.category_slug || "").toLowerCase().includes(s) ||
        (p.brand || "").toLowerCase().includes(s) ||
        (p.sku || "").toLowerCase().includes(s) ||
        stockLbl.includes(s) ||
        offLbl.includes(s)
      );
    });

  async function saveProduct(next?: Partial<DBProduct>) {
    if (!next?.id) return;
    const payload: any = {
      discount_percent: (next as any).discount_percent ? Number((next as any).discount_percent) : null,
      original_price: (next as any).original_price ? Number((next as any).original_price) : null,
      price: Number((next as any).price) || 0,
      offer_starts_at: (next as any).offer_starts_at || null,
      offer_ends_at: (next as any).offer_ends_at || null,
      stock: Number((next as any).stock) || 0,
    };
    const { error } = await supabase.from("products").update(payload).eq("id", next.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setEditing(null);
    load();
  }


  const stockPill = (n: number) => {
    if (n >= ALWAYS_IN_STOCK) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (n <= 0) return "bg-red-100 text-red-800 border-red-300";
    return "bg-amber-100 text-amber-800 border-amber-300";
  };
  const offerPill = (s: OfferKey) => ({
    active: "bg-rose-500 text-white",
    scheduled: "bg-blue-500 text-white",
    expired: "bg-slate-400 text-white",
    none: "bg-slate-200 text-slate-700",
    all: "",
  })[s];

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Tag}
        title="Discount & Offer Window"
        subtitle={`${counts.all} products — ${counts.active} active · ${counts.scheduled} scheduled · ${counts.expired} expired`}
      />

      {/* Offer state tabs */}
      <div className="flex flex-wrap gap-2 border-b">
        {([
          ["active",    `🔥 Active (${counts.active})`,        "text-rose-600 border-rose-500"],
          ["scheduled", `📅 Scheduled (${counts.scheduled})`,  "text-blue-600 border-blue-500"],
          ["expired",   `⌛ Expired (${counts.expired})`,      "text-slate-600 border-slate-500"],
          ["none",      `— No offer (${counts.none})`,         "text-muted-foreground border-muted-foreground"],
          ["all",       `📦 All (${counts.all})`,              "text-primary border-primary"],
        ] as const).map(([k, label, cls]) => (
          <button
            key={k}
            onClick={() => setOfferFilter(k as OfferKey)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${offerFilter === k ? cls : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >{label}</button>
        ))}
      </div>

      {/* Search + stock filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU, brand, category or stock status…"
            className="w-full rounded border bg-card py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="inline-flex overflow-hidden rounded border bg-card">
          {([
            ["all", `All (${stockCounts.all})`],
            ["permanent", `♾️ In Stock (${stockCounts.permanent})`],
            ["numeric", `🔢 Stock # (${stockCounts.numeric})`],
            ["out", `❌ Out (${stockCounts.out})`],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setStockFilter(k as StockKey)}
              className={`px-3 py-2 text-xs font-semibold ${stockFilter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded border bg-card py-10 text-center text-sm text-muted-foreground">No matching products</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-right">Price</th>
                <th className="p-2 text-right">Discount</th>
                <th className="p-2 text-center">Window</th>
                <th className="p-2 text-center">Stock</th>
                <th className="p-2 text-center">Offer</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const st = Number(p.stock);
                const os = offerState(p);
                const disc = Number((p as any).discount_percent) || 0;
                const orig = Number(p.original_price) || 0;
                const effOff = disc > 0 ? `${disc}%` : orig > Number(p.price) ? `${Math.round((1 - Number(p.price) / orig) * 100)}%` : "—";
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 overflow-hidden rounded border bg-muted">
                          <ProductImage src={p.image} alt={p.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold">{p.name}</div>
                          <div className="truncate text-[10px] text-muted-foreground">{p.sku || p.category_slug || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="text-xs font-bold">৳{Number(p.price).toFixed(0)}</div>
                      {orig > Number(p.price) && <div className="text-[10px] text-muted-foreground line-through">৳{orig.toFixed(0)}</div>}
                    </td>
                    <td className="p-2 text-right text-xs font-bold text-rose-600">{effOff}</td>
                    <td className="p-2 text-center text-[10px] text-muted-foreground">
                      {(p as any).offer_starts_at ? new Date((p as any).offer_starts_at).toLocaleDateString() : "—"}
                      {" → "}
                      {(p as any).offer_ends_at ? new Date((p as any).offer_ends_at).toLocaleDateString() : "∞"}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${stockPill(st)}`}>{stockLabel(st)}</span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${offerPill(os)}`}>{os}</span>
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => setEditing(p)}
                        className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90"
                      ><Pencil className="h-3 w-3" /> Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductEditModal
          item={editing}
          setItem={setEditing}
          onClose={() => setEditing(null)}
          onSave={saveProduct}
        />
      )}

    </div>
  );
}
