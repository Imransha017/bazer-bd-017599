import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, Trash2, MessageSquare, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Surface, GhostButton, DangerButton, Badge } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/reviews")({
  component: ReviewsAdmin,
});

type Row = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
};

function ReviewsAdmin() {
  const [list, setList] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");

  const load = async () => {
    const { data } = await supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(200);
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (r: Row) => {
    const { error } = await supabase.from("reviews").update({ is_approved: !r.is_approved }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(r.is_approved ? "Hidden" : "Approved");
    load();
  };
  const del = async (id: string) => {
    if (!confirm("Delete review?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    load();
  };

  const filtered = list.filter((r) =>
    filter === "all" ? true : filter === "approved" ? r.is_approved : !r.is_approved,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        icon={MessageSquare}
        title="Reviews"
        subtitle={`${list.length} total — ${list.filter((r) => !r.is_approved).length} pending moderation`}
        actions={
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {(["all", "approved", "pending"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${filter === f ? "bg-white text-purple-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-3">
        {filtered.map((r) => (
          <Surface key={r.id} className="p-4">
            <div className="flex gap-3">
              <div className="flex shrink-0 items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Product {r.product_id.slice(0, 8)} · User {r.user_id.slice(0, 6)} · {new Date(r.created_at).toLocaleString()}
                </p>
                <p className="mt-1.5 text-sm text-slate-800">{r.comment ?? <span className="italic text-slate-400">No comment</span>}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge tone={r.is_approved ? "sky" : "pink"}>{r.is_approved ? "Approved" : "Pending"}</Badge>
                <div className="flex gap-1">
                  <GhostButton onClick={() => toggle(r)}>
                    {r.is_approved ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Approve</>}
                  </GhostButton>
                  <DangerButton onClick={() => del(r.id)}><Trash2 className="h-3 w-3" /></DangerButton>
                </div>
              </div>
            </div>
          </Surface>
        ))}
        {filtered.length === 0 && (
          <Surface className="py-12 text-center text-sm text-slate-400">No reviews to show</Surface>
        )}
      </div>
    </div>
  );
}
