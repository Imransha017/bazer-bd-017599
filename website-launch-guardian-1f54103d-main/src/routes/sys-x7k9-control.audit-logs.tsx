import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2, Search, RefreshCw, X, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/sys-x7k9-control/audit-logs")({
  component: AuditLogsPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Row = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const ENTITY_OPTIONS = [
  { v: "", label: "All entities" },
  { v: "order", label: "Order" },
  { v: "dropshipper_earning", label: "Dropshipper Earning" },
  { v: "dropshipper_payout", label: "Dropshipper Payout" },
  { v: "dropshipper", label: "Dropshipper" },
];

const TONE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-blue-100 text-blue-700",
  suspended: "bg-slate-200 text-slate-700",
  processing: "bg-indigo-100 text-indigo-700",
  requested: "bg-amber-100 text-amber-700",
  Pending: "bg-amber-100 text-amber-700",
  Packed: "bg-blue-100 text-blue-700",
  Shipped: "bg-indigo-100 text-indigo-700",
  Delivered: "bg-emerald-100 text-emerald-700",
  Cancelled: "bg-red-100 text-red-700",
};

function Chip({ v }: { v: string | null }) {
  if (!v) return <span className="text-[10px] text-muted-foreground">—</span>;
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${TONE[v] ?? "bg-slate-100 text-slate-700"}`}>{v}</span>;
}

function EntityLink({ t, id }: { t: string; id: string }) {
  const cls = "inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold text-purple-700 hover:bg-purple-50";
  if (t === "order") return <Link to="/sys-x7k9-control/orders_/$id" params={{ id }} className={cls}>Open <ExternalLink className="h-3 w-3" /></Link>;
  if (t === "dropshipper_earning") return <Link to="/sys-x7k9-control/dropshipping-earnings" search={{ highlight: id }} className={cls}>Open <ExternalLink className="h-3 w-3" /></Link>;
  if (t === "dropshipper_payout") return <Link to="/sys-x7k9-control/dropshipping-payouts" search={{ highlight: id }} className={cls}>Open <ExternalLink className="h-3 w-3" /></Link>;
  if (t === "dropshipper") return <Link to="/sys-x7k9-control/dropshippers" className={cls}>Open <ExternalLink className="h-3 w-3" /></Link>;
  return <span className="text-slate-400 text-[10px]">—</span>;
}

function AuditLogsPage() {
  const [email, setEmail] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(100);

  async function load() {
    setLoading(true);
    try {
      let q = db.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (email.trim()) q = q.ilike("actor_email", `%${email.trim()}%`);
      if (entityType) q = q.eq("entity_type", entityType);
      if (entityId.trim()) q = q.eq("entity_id", entityId.trim());
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) {
        const d = new Date(to); d.setHours(23, 59, 59, 999);
        q = q.lte("created_at", d.toISOString());
      }
      const { data } = await q;
      setRows((data ?? []) as Row[]);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  const reset = () => { setEmail(""); setEntityType(""); setEntityId(""); setFrom(""); setTo(""); setLimit(100); setTimeout(load, 0); };

  const summary = useMemo(() => {
    if (!rows) return null;
    const byEntity: Record<string, number> = {};
    for (const r of rows) byEntity[r.entity_type] = (byEntity[r.entity_type] ?? 0) + 1;
    return byEntity;
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-purple-700" />
        <h1 className="text-xl font-bold text-purple-900">Audit Logs</h1>
        <span className="ml-auto text-xs text-muted-foreground">{rows?.length ?? 0} records</span>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-2xl border bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-[11px] font-bold text-slate-600 lg:col-span-2">
            Actor email
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com"
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm font-normal" />
          </label>
          <label className="text-[11px] font-bold text-slate-600">
            Entity type
            <select value={entityType} onChange={e => setEntityType(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm font-normal">
              {ENTITY_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </label>
          <label className="text-[11px] font-bold text-slate-600">
            Entity ID
            <input value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="uuid"
              className="mt-1 w-full rounded border px-2 py-1.5 text-xs font-mono" />
          </label>
          <label className="text-[11px] font-bold text-slate-600">
            From
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm font-normal" />
          </label>
          <label className="text-[11px] font-bold text-slate-600">
            To
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1.5 text-sm font-normal" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-60">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Search
          </button>
          <button onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-slate-50">
            <X className="h-3.5 w-3.5" /> Reset
          </button>
          <label className="ml-auto text-[11px] font-bold text-slate-600">
            Limit
            <select value={limit} onChange={e => { setLimit(Number(e.target.value)); }} onBlur={load}
              className="ml-2 rounded border px-2 py-1 text-xs">
              {[50, 100, 250, 500, 1000].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button onClick={load} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-bold hover:bg-slate-50" disabled={loading}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        {summary && Object.keys(summary).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
            {Object.entries(summary).map(([k, v]) => (
              <span key={k} className="rounded-full bg-purple-100 px-2 py-0.5 font-bold text-purple-800">{k}: {v}</span>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-purple-50 text-[10px] uppercase tracking-wider text-purple-800">
              <tr>
                <th className="p-2 pl-3">When</th>
                <th className="p-2">Actor</th>
                <th className="p-2">Entity</th>
                <th className="p-2">Change</th>
                <th className="p-2">Note</th>
                <th className="p-2 pr-3">Ref</th>
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No audit records match your filters.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t border-slate-100 align-top hover:bg-purple-50/30">
                  <td className="p-2 pl-3 whitespace-nowrap text-[11px] text-slate-600">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">
                    <div className="text-[11px] font-semibold text-slate-800">{r.actor_email || <span className="text-slate-400">system</span>}</div>
                    {r.actor_id && <div className="font-mono text-[10px] text-slate-400">{r.actor_id.slice(0, 8)}…</div>}
                  </td>
                  <td className="p-2">
                    <div className="text-[11px] font-bold uppercase text-purple-800">{r.entity_type}</div>
                    <div className="font-mono text-[10px] text-slate-500">{r.entity_id.slice(0, 8)}…</div>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap items-center gap-1"><Chip v={r.from_value} /><span className="text-slate-400">→</span><Chip v={r.to_value} /></div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{r.action}</div>
                  </td>
                  <td className="p-2 text-[11px] text-slate-700">{r.note || <span className="text-slate-400">—</span>}</td>
                  <td className="p-2 pr-3"><EntityLink t={r.entity_type} id={r.entity_id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
