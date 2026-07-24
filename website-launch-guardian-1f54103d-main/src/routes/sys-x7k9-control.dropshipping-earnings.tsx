import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { adminListEarnings, adminAdjustEarning, type DropshipperEarning } from "@/lib/dropshipper";
import { PageHeader, Surface } from "@/lib/admin-ui";
import { DollarSign, Check, X, Download, History } from "lucide-react";
import { toast } from "sonner";
import { AuditLog } from "@/components/AuditLog";

type Row = DropshipperEarning & { dropshippers: { store_name: string; code: string } | null };

const searchSchema = z.object({ highlight: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/sys-x7k9-control/dropshipping-earnings")({
  head: () => ({ meta: [{ title: "Dropshipper Earnings — Admin" }, { name: "robots", content: "noindex" }] }),
  validateSearch: zodValidator(searchSchema),
  component: AdminDsEarnings,
});

function AdminDsEarnings() {
  const { highlight } = Route.useSearch();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("all");
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const reload = () => adminListEarnings(status === "all" ? undefined : status).then(setRows);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [status]);

  useEffect(() => {
    if (highlight && rows.some(r => r.id === highlight)) {
      setStatus("all");
      setOpenLog(highlight);
      setTimeout(() => rowRefs.current[highlight]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [highlight, rows]);


  const filtered = useMemo(() => rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.dropshippers?.store_name || "").toLowerCase().includes(s)
      || (r.dropshippers?.code || "").toLowerCase().includes(s)
      || (r.product_id || "").toLowerCase().includes(s)
      || (r.order_id || "").toLowerCase().includes(s);
  }), [rows, q]);

  const total = filtered.reduce((a, b) => a + Number(b.profit), 0);

  const setSt = async (id: string, st: DropshipperEarning["status"]) => {
    try { await adminAdjustEarning(id, st); toast.success("Updated"); reload(); } catch (e) { toast.error((e as Error).message); }
  };

  const exportCsv = () => {
    const csv = [
      ["Date", "Store", "Code", "Order", "Product", "Qty", "Base", "Retail", "Profit", "Status"],
      ...filtered.map(r => [new Date(r.created_at).toISOString(), r.dropshippers?.store_name ?? "", r.dropshippers?.code ?? "", r.order_id, r.product_id ?? "", String(r.qty), String(r.base_price), String(r.retail_price), String(r.profit), r.status]),
    ].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `ds-earnings-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={DollarSign} title="Dropshipper Earnings" subtitle="Ledger of every profit line across all stores" actions={
        <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded bg-purple-700 px-3 py-1.5 text-xs font-bold text-white"><Download className="h-3.5 w-3.5" />Export</button>
      } />

      <div className="flex flex-wrap items-center gap-2">
        {["all", "pending", "approved", "rejected", "paid"].map(f => (
          <button key={f} onClick={() => setStatus(f)} className={`rounded px-3 py-1 text-xs font-bold capitalize ${status === f ? "bg-purple-700 text-white" : "bg-white border"}`}>{f}</button>
        ))}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search store / code / order / product…" className="ml-auto min-w-[240px] flex-1 rounded border px-2 py-1.5 text-xs" />
      </div>

      <Surface className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No earnings match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-purple-50/50 text-[10px] uppercase tracking-widest text-purple-800/70">
              <tr><th className="p-3 text-left">Date</th><th className="text-left">Store</th><th className="text-left">Order</th><th className="text-left">Product</th><th className="text-right">Qty</th><th className="text-right">Base</th><th className="text-right">Retail</th><th className="text-right">Profit</th><th className="text-center">Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <Fragment key={r.id}>
                <tr ref={el => { rowRefs.current[r.id] = el; }} className={`border-t border-slate-100 hover:bg-purple-50/30 ${highlight === r.id ? "bg-amber-50 ring-2 ring-amber-400" : ""}`}>
                  <td className="p-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>{r.dropshippers?.store_name ?? "—"}<div className="text-[10px] font-mono text-slate-400">{r.dropshippers?.code}</div></td>
                  <td className="font-mono text-[10px]">{r.order_id.slice(0, 8)}…</td>
                  <td className="font-mono text-[10px]">{(r.product_id || "").slice(0, 12)}…</td>
                  <td className="text-right">{r.qty}</td>
                  <td className="text-right">৳{Number(r.base_price).toFixed(0)}</td>
                  <td className="text-right">৳{Number(r.retail_price).toFixed(0)}</td>
                  <td className="text-right font-bold text-green-700">৳{Number(r.profit).toFixed(0)}</td>
                  <td className="text-center"><span className={badge(r.status)}>{r.status}</span></td>
                  <td className="pr-3 text-right">
                    <div className="flex justify-end gap-1">
                      {r.status !== "approved" && <button onClick={() => setSt(r.id, "approved")} className="inline-flex items-center gap-0.5 rounded bg-green-600 px-2 py-1 text-[10px] font-bold text-white"><Check className="h-3 w-3" />Approve</button>}
                      {r.status !== "rejected" && <button onClick={() => setSt(r.id, "rejected")} className="inline-flex items-center gap-0.5 rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white"><X className="h-3 w-3" />Reject</button>}
                      <button onClick={() => setOpenLog(openLog === r.id ? null : r.id)} className="inline-flex items-center gap-0.5 rounded border px-2 py-1 text-[10px] font-bold hover:bg-slate-50"><History className="h-3 w-3" />Log</button>
                    </div>
                  </td>
                </tr>
                {openLog === r.id && (
                  <tr key={r.id + "-log"} className="bg-slate-50/70">
                    <td colSpan={10} className="p-2"><AuditLog entityType="dropshipper_earning" entityId={r.id} compact /></td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-purple-50/50 font-bold">
                <td colSpan={7} className="p-3 text-right">Total profit</td>
                <td className="text-right text-green-700">৳{total.toFixed(0)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </Surface>
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
