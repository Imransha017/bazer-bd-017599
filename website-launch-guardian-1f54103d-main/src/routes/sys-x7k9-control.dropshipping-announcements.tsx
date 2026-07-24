import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listAnnouncements, adminCreateAnnouncement, adminUpdateAnnouncement, adminDeleteAnnouncement, type DropshippingAnnouncement } from "@/lib/dropshipper";
import { PageHeader, Surface } from "@/lib/admin-ui";
import { Megaphone, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sys-x7k9-control/dropshipping-announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminAnnouncements,
});

type Draft = Partial<DropshippingAnnouncement>;

function AdminAnnouncements() {
  const [rows, setRows] = useState<DropshippingAnnouncement[]>([]);
  const [edit, setEdit] = useState<Draft | null>(null);

  const reload = () => listAnnouncements().then(setRows);
  useEffect(() => { reload(); }, []);

  const save = async () => {
    if (!edit?.title) return toast.error("Title required");
    try {
      if (edit.id) {
        await adminUpdateAnnouncement(edit.id, { title: edit.title, body_md: edit.body_md ?? null, tone: (edit.tone ?? "info") as DropshippingAnnouncement["tone"], is_active: edit.is_active ?? true, starts_at: edit.starts_at ?? null, ends_at: edit.ends_at ?? null });
      } else {
        await adminCreateAnnouncement({ title: edit.title!, body_md: edit.body_md ?? null, tone: (edit.tone ?? "info") as DropshippingAnnouncement["tone"], is_active: edit.is_active ?? true, starts_at: edit.starts_at ?? null, ends_at: edit.ends_at ?? null });
      }
      toast.success("Saved"); setEdit(null); reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try { await adminDeleteAnnouncement(id); reload(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Megaphone} title="Announcements" subtitle="Messages shown on dropshipper dashboards" actions={
        <button onClick={() => setEdit({ tone: "info", is_active: true })} className="inline-flex items-center gap-1 rounded bg-purple-700 px-3 py-1.5 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />New</button>
      } />

      <Surface className="p-0 overflow-hidden">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No announcements yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-purple-50/50 text-[10px] uppercase tracking-widest text-purple-800/70">
              <tr><th className="p-3 text-left">Title</th><th className="text-left">Tone</th><th className="text-center">Active</th><th className="text-left">Window</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-purple-50/30">
                  <td className="p-3 font-semibold">{r.title}</td>
                  <td><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${toneClass(r.tone)}`}>{r.tone}</span></td>
                  <td className="text-center">{r.is_active ? <span className="text-green-600">●</span> : <span className="text-slate-300">●</span>}</td>
                  <td className="text-[11px] text-slate-500">{r.starts_at ? new Date(r.starts_at).toLocaleDateString() : "—"} → {r.ends_at ? new Date(r.ends_at).toLocaleDateString() : "—"}</td>
                  <td className="pr-3 text-right">
                    <button onClick={() => setEdit(r)} className="rounded border px-2 py-1 text-xs">Edit</button>
                    <button onClick={() => del(r.id)} className="ml-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600"><Trash2 className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Surface>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">{edit.id ? "Edit announcement" : "New announcement"}</h3>
              <button onClick={() => setEdit(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs"><span className="font-semibold">Title</span>
                <input value={edit.title ?? ""} onChange={e => setEdit({ ...edit, title: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
              </label>
              <label className="block text-xs"><span className="font-semibold">Body</span>
                <textarea rows={4} value={edit.body_md ?? ""} onChange={e => setEdit({ ...edit, body_md: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label><span className="font-semibold">Tone</span>
                  <select value={edit.tone ?? "info"} onChange={e => setEdit({ ...edit, tone: e.target.value as DropshippingAnnouncement["tone"] })} className="mt-1 block w-full rounded border px-2 py-1.5">
                    <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="danger">Danger</option>
                  </select>
                </label>
                <label className="flex items-end gap-2 pb-1"><input type="checkbox" checked={edit.is_active ?? true} onChange={e => setEdit({ ...edit, is_active: e.target.checked })} /><span className="font-semibold">Active</span></label>
                <label><span className="font-semibold">Starts (optional)</span>
                  <input type="datetime-local" value={edit.starts_at?.slice(0, 16) ?? ""} onChange={e => setEdit({ ...edit, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 block w-full rounded border px-2 py-1.5" />
                </label>
                <label><span className="font-semibold">Ends (optional)</span>
                  <input type="datetime-local" value={edit.ends_at?.slice(0, 16) ?? ""} onChange={e => setEdit({ ...edit, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 block w-full rounded border px-2 py-1.5" />
                </label>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button onClick={save} className="inline-flex items-center gap-1 rounded bg-purple-700 px-4 py-1.5 text-xs font-bold text-white"><Save className="h-3.5 w-3.5" />Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toneClass(t: string) {
  return t === "success" ? "bg-green-100 text-green-700"
    : t === "warning" ? "bg-amber-100 text-amber-700"
    : t === "danger" ? "bg-red-100 text-red-700"
    : "bg-blue-100 text-blue-700";
}
