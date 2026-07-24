import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getMyDropshipper, listMyEarnings, listMyPayouts, type Dropshipper, type DropshipperEarning, type DropshipperPayout } from "@/lib/dropshipper";
import { DollarSign, Download, Wallet } from "lucide-react";

export const Route = createFileRoute("/dropshipping/earnings")({
  head: () => ({ meta: [{ title: "Earnings — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: EarningsPage,
});

function EarningsPage() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [items, setItems] = useState<DropshipperEarning[]>([]);
  const [payouts, setPayouts] = useState<DropshipperPayout[]>([]);
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected" | "paid">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    getMyDropshipper().then(async d => {
      setDs(d);
      if (d) { setItems(await listMyEarnings(d.id)); setPayouts(await listMyPayouts(d.id)); }
    });
  }, []);

  const filtered = useMemo(() => items.filter(i => {
    if (status !== "all" && i.status !== status) return false;
    const d = new Date(i.created_at);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    if (q && !(i.product_id || "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, status, from, to, q]);

  const totals = useMemo(() => {
    const sum = (s: string) => items.filter(i => i.status === s).reduce((a, b) => a + Number(b.profit), 0);
    const paidOut = payouts.filter(p => p.status === "paid").reduce((a, b) => a + Number(b.amount), 0);
    const requested = payouts.filter(p => p.status === "requested" || p.status === "processing").reduce((a, b) => a + Number(b.amount), 0);
    const approved = sum("approved");
    return {
      pending: sum("pending"),
      approved,
      rejected: sum("rejected"),
      paid: paidOut,
      requested,
      available: Math.max(0, approved - paidOut - requested),
      filteredTotal: filtered.reduce((a, b) => a + Number(b.profit), 0),
    };
  }, [items, payouts, filtered]);

  const exportCsv = () => {
    const rows = [
      ["Date", "Order ID", "Product", "Qty", "Base", "Retail", "Profit", "Status"],
      ...filtered.map(r => [new Date(r.created_at).toISOString(), r.order_id, r.product_id ?? "", String(r.qty), String(r.base_price), String(r.retail_price), String(r.profit), r.status]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `earnings-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Pending" value={`৳${totals.pending.toFixed(0)}`} tone="amber" />
        <Stat label="Approved" value={`৳${totals.approved.toFixed(0)}`} tone="green" />
        <Stat label="Requested" value={`৳${totals.requested.toFixed(0)}`} tone="blue" />
        <Stat label="Paid out" value={`৳${totals.paid.toFixed(0)}`} tone="slate" />
        <Stat label="Available" value={`৳${totals.available.toFixed(0)}`} tone="primary" icon={Wallet} />
      </div>

      <div className="rounded-xl border bg-blue-50/50 p-3 text-xs text-slate-700">
        <strong>How earnings work:</strong> Profit = (Retail − Base) × Qty. A row starts as <em>pending</em> when the order is placed, becomes <em>approved</em> when the order is marked <strong>delivered</strong>, and <em>rejected</em> if cancelled or refunded. Approved profit becomes available to withdraw once admin processes it.
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className="rounded border px-2 py-1.5 text-xs">
            <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="paid">Paid</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded border px-2 py-1.5 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-muted-foreground">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded border px-2 py-1.5 text-xs" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-bold text-muted-foreground">Search product id</label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Product id contains…" className="w-full rounded border px-2 py-1.5 text-xs" />
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Download className="h-3.5 w-3.5" />Export CSV</button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-2">Date</th><th className="p-2">Order</th><th className="p-2">Product</th>
              <th className="p-2 text-right">Qty</th><th className="p-2 text-right">Base</th><th className="p-2 text-right">Retail</th>
              <th className="p-2 text-right">Profit</th><th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No earnings match this filter.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="p-2 font-mono text-[10px]">{r.order_id.slice(0, 8)}…</td>
                <td className="p-2 font-mono text-[10px]">{(r.product_id || "").slice(0, 12)}…</td>
                <td className="p-2 text-right">{r.qty}</td>
                <td className="p-2 text-right">৳{Number(r.base_price).toFixed(0)}</td>
                <td className="p-2 text-right">৳{Number(r.retail_price).toFixed(0)}</td>
                <td className="p-2 text-right font-bold text-green-700">৳{Number(r.profit).toFixed(0)}</td>
                <td className="p-2"><span className={badge(r.status)}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-bold">
                <td colSpan={6} className="p-2 text-right">Filtered total</td>
                <td className="p-2 text-right text-green-700">৳{totals.filteredTotal.toFixed(0)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function badge(s: string) {
  return `rounded px-2 py-0.5 text-[10px] font-bold ${
    s === "approved" ? "bg-green-100 text-green-700" :
    s === "pending" ? "bg-amber-100 text-amber-700" :
    s === "paid" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
  }`;
}

function Stat({ label, value, tone, icon: Icon }: { label: string; value: string; tone: string; icon?: typeof DollarSign }) {
  const bg = tone === "green" ? "bg-green-50 text-green-700"
    : tone === "amber" ? "bg-amber-50 text-amber-700"
    : tone === "blue" ? "bg-blue-50 text-blue-700"
    : tone === "slate" ? "bg-slate-100 text-slate-700"
    : "bg-primary/10 text-primary";
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className={`h-3.5 w-3.5 ${bg.split(" ")[1]}`} />}
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className={`mt-1 text-lg font-extrabold`}>{value}</p>
      <div className={`mt-1 h-1 rounded ${bg.split(" ")[0]}`} />
    </div>
  );
}
