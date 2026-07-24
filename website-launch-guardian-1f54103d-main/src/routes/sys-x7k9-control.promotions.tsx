import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, Megaphone } from "lucide-react";
import { PageHeader, Surface, PrimaryButton, TextInput, SelectInput } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/promotions")({
  component: PromotionsAdmin,
});

type Promotion = {
  id: string;
  placement: "top_bar" | "homepage_strip";
  title: string;
  message: string;
  link_url: string;
  button_label: string;
  bg_color: string;
  text_color: string;
  sort_order: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const empty: Omit<Promotion, "id"> = {
  placement: "top_bar",
  title: "", message: "", link_url: "", button_label: "",
  bg_color: "#7c3aed", text_color: "#ffffff",
  sort_order: 0, active: true, starts_at: null, ends_at: null,
};

function PromotionsAdmin() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [draft, setDraft] = useState<Omit<Promotion, "id">>(empty);

  async function load() {
    const { data, error } = await (supabase as any).from("promotions").select("*").order("placement").order("sort_order");
    if (error) return toast.error(error.message);
    setItems((data as Promotion[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!draft.message.trim()) return toast.error("Message is required");
    const { error } = await (supabase as any).from("promotions").insert(draft);
    if (error) return toast.error(error.message);
    setDraft(empty);
    toast.success("Promotion added");
    load();
  }

  async function save(p: Promotion) {
    const { id, ...rest } = p;
    const { error } = await (supabase as any).from("promotions").update(rest).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  async function del(id: string) {
    if (!confirm("Delete this promotion?")) return;
    const { error } = await (supabase as any).from("promotions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const updateItem = (id: string, patch: Partial<Promotion>) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={Megaphone} title="Promotions & Announcements" subtitle={`${items.length} promotions`} />

      <Surface>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-700/70">Add new promotion</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SelectInput value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value as Promotion["placement"] })}>
            <option value="top_bar">Top bar (site-wide)</option>
            <option value="homepage_strip">Homepage strip</option>
          </SelectInput>
          <TextInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title (optional)" />
          <TextInput value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="Message *" />
          <TextInput value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} placeholder="Link (optional)" />
          <TextInput value={draft.button_label} onChange={(e) => setDraft({ ...draft, button_label: e.target.value })} placeholder="Button label" />
          <label className="flex items-center gap-2 text-xs">
            <span>BG</span>
            <input type="color" value={draft.bg_color} onChange={(e) => setDraft({ ...draft, bg_color: e.target.value })} className="h-9 w-14 rounded border" />
            <span>Text</span>
            <input type="color" value={draft.text_color} onChange={(e) => setDraft({ ...draft, text_color: e.target.value })} className="h-9 w-14 rounded border" />
          </label>
          <TextInput type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} placeholder="Sort" />
          <PrimaryButton onClick={add}><Plus className="h-4 w-4" /> Add</PrimaryButton>
        </div>
      </Surface>

      <Surface>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-700/70">All promotions</h2>
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">None yet</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="grid items-center gap-2 rounded border p-2 md:grid-cols-[130px_1fr_1fr_180px_auto]">
                <select value={p.placement} onChange={(e) => updateItem(p.id, { placement: e.target.value as Promotion["placement"] })} className="rounded border px-2 py-1 text-xs">
                  <option value="top_bar">Top bar</option>
                  <option value="homepage_strip">Homepage strip</option>
                </select>
                <div className="space-y-1">
                  <input value={p.title} onChange={(e) => updateItem(p.id, { title: e.target.value })} placeholder="Title" className="w-full rounded border px-2 py-1 text-xs" />
                  <input value={p.message} onChange={(e) => updateItem(p.id, { message: e.target.value })} placeholder="Message" className="w-full rounded border px-2 py-1 text-xs" />
                </div>
                <div className="space-y-1">
                  <input value={p.link_url} onChange={(e) => updateItem(p.id, { link_url: e.target.value })} placeholder="Link" className="w-full rounded border px-2 py-1 text-xs" />
                  <input value={p.button_label} onChange={(e) => updateItem(p.id, { button_label: e.target.value })} placeholder="Button label" className="w-full rounded border px-2 py-1 text-xs" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <input type="color" value={p.bg_color} onChange={(e) => updateItem(p.id, { bg_color: e.target.value })} className="h-7 w-10 rounded border" />
                    <input type="color" value={p.text_color} onChange={(e) => updateItem(p.id, { text_color: e.target.value })} className="h-7 w-10 rounded border" />
                    <input type="number" value={p.sort_order} onChange={(e) => updateItem(p.id, { sort_order: Number(e.target.value) })} className="w-14 rounded border px-1 py-1" />
                  </div>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={p.active} onChange={(e) => updateItem(p.id, { active: e.target.checked })} /> Active</label>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => save(p)} className="rounded bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground"><Save className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(p.id)} className="rounded bg-red-500 px-2 py-1.5 text-xs text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {/* Live preview */}
                <div className="md:col-span-5">
                  <div className="mt-1 rounded px-3 py-1.5 text-[12px]" style={{ background: p.bg_color, color: p.text_color }}>
                    <span className="font-bold">{p.title}</span> {p.title && p.message ? "— " : ""}{p.message} {p.button_label ? <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">{p.button_label}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
