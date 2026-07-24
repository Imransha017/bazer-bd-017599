import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Crown, User as UserIcon, Info } from "lucide-react";
import { PageHeader } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/staff")({
  component: Staff,
});

type Row = { user_id: string; role: string; created_at?: string; name?: string | null };

function Staff() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role, created_at");
      const ids = [...new Set((roles ?? []).map((r: any) => r.user_id))];
      const profiles = ids.length ? (await supabase.from("profiles").select("id, full_name").in("id", ids)).data ?? [] : [];
      const byId = new Map(profiles.map((p: any) => [p.id, p.full_name]));
      setRows((roles ?? []).map((r: any) => ({ ...r, name: byId.get(r.user_id) ?? null })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader icon={Shield} title="Staff & Roles" subtitle="Admins and moderators with elevated access" />

      <div className="grid gap-4 md:grid-cols-3">
        <RoleCard icon={Crown} title="Admin" desc="Full access to all admin pages, settings, and data." count={rows.filter((r) => r.role === "admin").length} tone="pink" />
        <RoleCard icon={Shield} title="Moderator" desc="Manage products, orders, and reviews." count={rows.filter((r) => r.role === "moderator").length} tone="sky" />
        <RoleCard icon={UserIcon} title="Vendor" desc="Sellers with access to their own store." count={rows.filter((r) => r.role === "vendor").length} tone="slate" />
      </div>

      <div className="rounded-2xl border border-purple-900/5 bg-white p-5 shadow-sm shadow-purple-900/5">
        <h2 className="mb-4 text-sm font-black tracking-tight text-purple-950">Team members</h2>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No staff assigned yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="py-2 text-left font-semibold">Name</th>
                  <th className="text-left font-semibold">Role</th>
                  <th className="text-left font-semibold">User ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.user_id}-${r.role}`} className="border-b border-slate-50 last:border-0 hover:bg-purple-50/30">
                    <td className="py-2.5 font-semibold text-slate-800">{r.name ?? "—"}</td>
                    <td>
                      <span className="rounded-full bg-purple-900/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">{r.role}</span>
                    </td>
                    <td className="font-mono text-[10px] text-slate-500">{r.user_id.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Add/remove roles UI can be enabled on request — the backend `user_roles` table and `has_role()` function are already in place.</p>
      </div>
    </div>
  );
}

function RoleCard({ icon: Icon, title, desc, count, tone }: { icon: any; title: string; desc: string; count: number; tone: "pink" | "sky" | "slate" }) {
  const tones: Record<string, string> = {
    pink: "bg-amber-500/10 text-amber-700",
    sky: "bg-purple-500/10 text-purple-700",
    slate: "bg-slate-500/10 text-slate-700",
  };
  return (
    <div className="rounded-2xl border border-purple-900/5 bg-white p-5 shadow-sm shadow-purple-900/5">
      <div className="mb-3 flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-3xl font-black text-purple-950">{count}</div>
      </div>
      <div className="text-sm font-bold text-purple-950">{title}</div>
      <div className="mt-1 text-[11px] text-slate-500">{desc}</div>
    </div>
  );
}
