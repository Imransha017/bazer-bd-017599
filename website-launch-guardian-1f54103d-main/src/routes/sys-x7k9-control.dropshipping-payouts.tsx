import { createFileRoute } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { adminListPayouts, adminUpdatePayout, adminMarkPayoutPaid, type DropshipperPayout } from "@/lib/dropshipper";
import { PageHeader, Surface } from "@/lib/admin-ui";
import { Wallet, Check, X, RefreshCcw, History } from "lucide-react";
import { toast } from "sonner";
import { AuditLog } from "@/components/AuditLog";

type Row = DropshipperPayout & { dropshippers: { store_name: string; code: string } | null };

const searchSchema = z.object({ highlight: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/sys-x7k9-control/dropshipping-payouts")({
  head: () => ({ meta: [{ title: "Dropshipper Payouts — Admin" }, { name: "robots", content: "noindex" }] }),
  validateSearch: zodValidator(searchSchema),
  component: AdminDsPayouts,
});

function AdminDsPayouts() {
  const { highlight } = Route.useSearch();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("requested");
  const [openLog, setOpenLog] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const reload = () => adminListPayouts(filter === "all" ? undefined : filter).then(setRows);
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [filter]);

  useEffect(() => {
    if (highlight && !rows.some(r => r.id === highlight)) { setFilter("all"); return; }
    if (highlight && rows.some(r => r.id === highlight)) {
      setOpenLog(highlight);
      setTimeout(() => rowRefs.current[highlight]?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
  }, [highlight, rows]);

  const totals = useMemo(() => {
    const bySt = (s: string) => rows.filter(r => r.status === s).reduce((a, b) => a + Number(b.amount), 0);
    return { requested: bySt("requested"), processing: bySt("processing"), paid: bySt("paid"), rejected: bySt("rejected") };
  }, [rows]);

  const setStatus = async (id: string, status: DropshipperPayout["status"]) => {
    try { await adminUpdatePayout(id, { status }); toast.success("Updated"); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const markPaid = async (id: string) => {
    const ref = prompt("Transaction reference (bKash TrxID, bank ref, etc.):"); if (ref === null) return;
    try { await adminMarkPayoutPaid(id, ref); toast.success("Marked paid"); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const addNote = async (r: Row) => {
    const note = prompt("Admin note:", r.admin_note ?? "");
    if (note === null) return;
    try { await adminUpdatePayout(r.id, { admin_note: note || null }); reload(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Wallet} title="Dropshipper Payouts" subtitle="Review payout requests and mark them paid" actions={
        <button onClick={reload} className="inline-flex items-center gap-1 rounded bg-purple-700 px-3 py-1.5 text-xs font-bold text-white"><RefreshCcw className="h-3.5 w-3.5" />Refresh</button>
      } />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Requested" value={totals.requested} tone="amber" />
        <Stat label="Processing" value={totals.processing} tone="blue" />
        <Stat label="Paid" value={totals.paid} tone="green" />
        <Stat label="Rejected" value={totals.rejected} tone="red" />
      </div>

      <div className="flex gap-1">
        {["requested", "processing", "paid", "rejected", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded px-3 py-1 text-xs font-bold capitalize ${filter === f ? "bg-purple-700 text-white" : "bg-white border"}`}>{f}</button>
        ))}
      </div>

      <Surface className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No payouts in this filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-purple-50/50 text-[10px] uppercase tracking-widest text-purple-800/70">
              <tr><th className="p-3 text-left">Date</th><th className="text-left">Store</th><th className="text-left">Method</th><th className="text-left">Account</th><th className="text-right">Amount</th><th className="text-left">Ref / Note</th><th className="text-center">Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <Fragment key={r.id}>
                <tr ref={el => { rowRefs.current[r.id] = el; }} className={`border-t border-slate-100 hover:bg-purple-50/30 ${highlight === r.id ? "bg-amber-50 ring-2 ring-amber-400" : ""}`}>
                  <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td>{r.dropshippers?.store_name ?? "—"}<div className="text-[10px] font-mono text-slate-400">{r.dropshippers?.code}</div></td>
                  <td className="uppercase text-xs">{r.method}</td>
                  <td className="font-mono text-[11px]">{r.account}</td>
                  <td className="text-right font-bold text-purple-900">৳{Number(r.amount).toFixed(0)}</td>
                  <td className="text-[10px]">
                    {r.txn_reference && <div className="font-mono text-green-700">{r.txn_reference}</div>}
                    {r.admin_note && <div className="text-slate-500">{r.admin_note}</div>}
                  </td>
                  <td className="text-center"><span className={badge(r.status)}>{r.status}</span></td>
                  <td className="pr-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {r.status === "requested" && <button onClick={() => setStatus(r.id, "processing")} className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">Processing</button>}
                      {r.status !== "paid" && <button onClick={() => markPaid(r.id)} className="inline-flex items-center gap-0.5 rounded bg-green-600 px-2 py-1 text-[10px] font-bold text-white"><Check className="h-3 w-3" />Paid</button>}
                      {r.status !== "rejected" && r.status !== "paid" && <button onClick={() => setStatus(r.id, "rejected")} className="inline-flex items-center gap-0.5 rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white"><X className="h-3 w-3" />Reject</button>}
                      <button onClick={() => addNote(r)} className="rounded border px-2 py-1 text-[10px]">Note</button>
                      <button onClick={() => setOpenLog(openLog === r.id ? null : r.id)} className="inline-flex items-center gap-0.5 rounded border px-2 py-1 text-[10px] font-bold hover:bg-slate-50"><History className="h-3 w-3" />Log</button>
                    </div>
                  </td>
                </tr>
                {openLog === r.id && (
                  <tr className="bg-slate-50/70">
                    <td colSpan={8} className="p-2"><AuditLog entityType="dropshipper_payout" entityId={r.id} compact /></td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Surface>
    </div>
  );
}

function badge(s: string) {
  return `rounded px-2 py-0.5 text-[10px] font-bold ${
    s === "paid" ? "bg-green-100 text-green-700" :
    s === "requested" ? "bg-amber-100 text-amber-700" :
    s === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
  }`;
}
function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  const bg = tone === "green" ? "bg-green-50 text-green-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700";
  return <div className={`rounded-xl border p-3 ${bg}`}><p className="text-[11px] font-bold uppercase opacity-70">{label}</p><p className="mt-1 text-lg font-extrabold">৳{value.toFixed(0)}</p></div>;
}
