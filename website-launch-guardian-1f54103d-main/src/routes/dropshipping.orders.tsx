import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyDropshipper, listMyEarnings, type Dropshipper, type DropshipperEarning } from "@/lib/dropshipper";

export const Route = createFileRoute("/dropshipping/orders")({
  head: () => ({ meta: [{ title: "Orders — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [items, setItems] = useState<DropshipperEarning[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "paid">("all");

  useEffect(() => {
    getMyDropshipper().then(async d => { setDs(d); if (d) setItems(await listMyEarnings(d.id)); });
  }, []);

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const rows = filter === "all" ? items : items.filter(i => i.status === filter);
  const totals = {
    all: items.length,
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
    paid: items.filter(i => i.status === "paid").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 border-b">
        {(["all", "pending", "approved", "rejected", "paid"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`border-b-2 px-3 py-2 text-xs font-bold capitalize ${filter === f ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{f} ({totals[f]})</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No earnings in this filter yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left">
              <tr><th className="p-2">Date</th><th className="p-2">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Base</th><th className="p-2 text-right">Retail</th><th className="p-2 text-right">Profit</th><th className="p-2">Status</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-2 font-mono text-[10px]">{(r.product_id || "").slice(0, 8)}…</td>
                  <td className="p-2 text-right">{r.qty}</td>
                  <td className="p-2 text-right">৳{Number(r.base_price).toFixed(0)}</td>
                  <td className="p-2 text-right">৳{Number(r.retail_price).toFixed(0)}</td>
                  <td className="p-2 text-right font-bold text-green-700">৳{Number(r.profit).toFixed(0)}</td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "pending" ? "bg-amber-100 text-amber-700" : r.status === "paid" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
