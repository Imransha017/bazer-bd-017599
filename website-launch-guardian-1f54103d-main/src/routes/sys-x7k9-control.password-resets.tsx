import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { reviewPasswordReset } from "@/lib/password-reset.functions";
import { Check, X, Phone, Mail, RefreshCw, Bell } from "lucide-react";
import { usePendingResets } from "@/hooks/use-pending-resets";

export const Route = createFileRoute("/sys-x7k9-control/password-resets")({
  component: PasswordResetsAdmin,
});

type Row = {
  id: string;
  identifier: string;
  method: "phone" | "email";
  user_id: string | null;
  status: "pending" | "approved" | "rejected" | "used" | "expired";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function PasswordResetsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<Record<string, string>>({});
  const review = useServerFn(reviewPasswordReset);

  const { pendingCount, bumpKey } = usePendingResets({ notify: false });

  async function load() {
    setLoading(true);
    let q = supabase.from("password_reset_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter === "pending") q = q.eq("status", "pending");
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter, bumpKey]);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      await review({ data: { id, action, note: noteFor[id] } });
      toast.success(action === "approve" ? "পাসওয়ার্ড আপডেট হয়েছে ✅" : "রিকোয়েস্ট রিজেক্ট");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "সমস্যা হয়েছে");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-purple-950">
            Password Reset Requests
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
            </span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white animate-pulse">
                <Bell className="size-3" /> {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">ফোন-ভিত্তিক পাসওয়ার্ড রিসেট রিকোয়েস্ট অনুমোদন/প্রত্যাখ্যান করুন। নতুন রিকোয়েস্ট এলে অটো-আপডেট হবে।</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            {(["pending", "all"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded px-3 py-1 text-xs font-semibold ${filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {k === "pending" ? "Pending" : "All"}
              </button>
            ))}
          </div>
          <button onClick={load} className="grid size-8 place-items-center rounded-md border hover:bg-muted"><RefreshCw className="size-4" /></button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 text-left">Identifier</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Requested</th>
              <th className="p-3 text-left">Note / Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">কোনো রিকোয়েস্ট নেই</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-3 font-mono text-xs">{r.identifier}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-semibold">
                    {r.method === "phone" ? <Phone className="size-3" /> : <Mail className="size-3" />} {r.method}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                    r.status === "pending" ? "bg-amber-100 text-amber-800" :
                    r.status === "used" ? "bg-green-100 text-green-800" :
                    r.status === "rejected" ? "bg-red-100 text-red-800" :
                    "bg-slate-100 text-slate-700"
                  }`}>{r.status}</span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">
                  {r.status === "pending" ? (
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        value={noteFor[r.id] ?? ""}
                        onChange={(e) => setNoteFor((s) => ({ ...s, [r.id]: e.target.value }))}
                        placeholder="Optional note"
                        className="flex-1 rounded border px-2 py-1 text-xs"
                      />
                      <button
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "approve")}
                        className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
                      ><Check className="size-3" /> Approve</button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "reject")}
                        className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                      ><X className="size-3" /> Reject</button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {r.admin_note || "—"}
                      {r.reviewed_at && <div className="mt-0.5 text-[10px]">Reviewed {new Date(r.reviewed_at).toLocaleString()}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
