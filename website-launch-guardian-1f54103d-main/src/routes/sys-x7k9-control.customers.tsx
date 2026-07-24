import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Mail } from "lucide-react";
import { PageHeader, Surface, TextInput } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/customers")({
  component: Customers,
});

type Profile = { id: string; full_name: string | null; phone: string | null; email?: string | null; created_at: string };

function Customers() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, phone, created_at").order("created_at", { ascending: false }).limit(500);
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.full_name ?? "").toLowerCase().includes(s) || (r.phone ?? "").includes(s);
  });

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Customers" subtitle={`${rows.length} registered customers`} />

      <Surface className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or phone…"
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No customers found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-400">
                <tr className="border-b border-slate-100">
                  <th className="py-2 text-left font-semibold">Name</th>
                  <th className="text-left font-semibold">Phone</th>
                  <th className="text-left font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-purple-50/30">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-purple-900 text-xs font-bold text-amber-300">
                          {(r.full_name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{r.full_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="text-slate-600">
                      {r.phone ? (
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" /> {r.phone}</span>
                      ) : "—"}
                    </td>
                    <td className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

