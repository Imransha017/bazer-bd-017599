import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Loader2, RefreshCw, User2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type AuditEntity = "order" | "dropshipper_earning" | "dropshipper_payout" | "dropshipper";

export type AuditLogRow = {
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

const badgeColor: Record<string, string> = {
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

function Badge({ v }: { v: string | null }) {
  if (!v) return <span className="text-[10px] text-muted-foreground">—</span>;
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeColor[v] ?? "bg-slate-100 text-slate-700"}`}>{v}</span>;
}

export function AuditLog({ entityType, entityId, limit = 50, compact = false }: {
  entityType: AuditEntity;
  entityId: string;
  limit?: number;
  compact?: boolean;
}) {
  const [rows, setRows] = useState<AuditLogRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await db.from("admin_audit_logs")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit);
      setRows((data ?? []) as AuditLogRow[]);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entityType, entityId]);

  return (
    <div className={`rounded-xl border bg-white ${compact ? "p-2" : "p-3"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
          <History className="h-3.5 w-3.5" /> Audit log
          {rows && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">{rows.length}</span>}
        </div>
        <button onClick={load} className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold hover:bg-slate-50" disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Refresh
        </button>
      </div>
      {rows === null ? (
        <div className="py-3 text-center text-[11px] text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-3 text-center text-[11px] text-muted-foreground">No status changes recorded yet.</div>
      ) : (
        <ol className="space-y-1.5">
          {rows.map(r => (
            <li key={r.id} className="rounded-lg border-l-2 border-purple-400 bg-slate-50/60 px-2 py-1.5 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge v={r.from_value} />
                <span className="text-slate-400">→</span>
                <Badge v={r.to_value} />
                <span className="ml-auto text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-600">
                <User2 className="h-3 w-3" />
                <span className="truncate">{r.actor_email || (r.actor_id ? r.actor_id.slice(0, 8) + "…" : "system")}</span>
              </div>
              {r.note && <div className="mt-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800"><b>Note:</b> {r.note}</div>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
