import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, Image as ImageIcon } from "lucide-react";
import { uploadProductImage } from "@/lib/admin-api";
import { PageHeader, Surface, PrimaryButton, DangerButton, TextInput, SelectInput } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/banners")({
  component: BannersAdmin,
});

type Banner = {
  id: string;
  placement: "hero_slider" | "hero_side" | "category" | "home_video" | "home_promo_card";
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_label: string;
  button_link: string;
  gradient_from: string;
  gradient_to: string;
  sort_order: number;
  active: boolean;
};

const empty: Omit<Banner, "id"> = {
  placement: "hero_slider",
  title: "", subtitle: "", image_url: "", link_url: "",
  button_label: "", button_link: "",
  gradient_from: "from-violet-500", gradient_to: "to-fuchsia-600",
  sort_order: 0, active: true,
};

function BannersAdmin() {
  const [items, setItems] = useState<Banner[]>([]);
  const [draft, setDraft] = useState<Omit<Banner, "id">>(empty);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase.from("banners").select("*").order("placement").order("sort_order");
    setItems((data as Banner[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const { error } = await supabase.from("banners").insert(draft);
    if (error) return toast.error(error.message);
    setDraft(empty);
    toast.success("Banner added");
    load();
  }

  async function save(b: Banner) {
    const { id, ...rest } = b;
    const { error } = await supabase.from("banners").update(rest).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  async function del(id: string) {
    if (!confirm("Delete this banner?")) return;
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function onUpload(file: File, apply: (url: string) => void) {
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      apply(url);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const grouped = {
    hero_slider: items.filter((b) => b.placement === "hero_slider"),
    hero_side: items.filter((b) => b.placement === "hero_side"),
    home_video: items.filter((b) => b.placement === "home_video"),
    home_promo_card: items.filter((b) => b.placement === "home_promo_card"),
    category: items.filter((b) => b.placement === "category"),
  };

  return (
    <div className="space-y-5">
      <PageHeader icon={ImageIcon} title="Banners, Offers & Video Ads" subtitle={`${items.length} items across ${Object.keys(grouped).length} placements`} />

      {/* Add new */}
      <Surface>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-700/70">Add new banner / offer / video</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SelectInput value={draft.placement} onChange={(e) => setDraft({ ...draft, placement: e.target.value as Banner["placement"] })}>
            <option value="hero_slider">Hero Slider (big image)</option>
            <option value="hero_side">Hero Side (gradient)</option>
            <option value="home_promo_card">Homepage Offer Card (gradient)</option>
            <option value="home_video">Homepage Ad Video (.mp4/.webm/YouTube)</option>
            <option value="category">Category strip</option>
          </SelectInput>
          <TextInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <TextInput value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} placeholder="Subtitle / tagline" />
          <TextInput value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} placeholder="Link e.g. /category/electronics" />
          <TextInput value={draft.button_label} onChange={(e) => setDraft({ ...draft, button_label: e.target.value })} placeholder="Button label (optional)" />
          <TextInput value={draft.button_link} onChange={(e) => setDraft({ ...draft, button_link: e.target.value })} placeholder="Button link (optional)" />
          <div className="flex gap-2 sm:col-span-2">
            <TextInput value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="Image URL / Video URL (.mp4, .webm, YouTube)" className="flex-1" />
            <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-purple-800/30 hover:bg-purple-50">
              <ImageIcon className="h-4 w-4" /> Upload
              <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], (u) => setDraft({ ...draft, image_url: u }))} />
            </label>
          </div>
          <TextInput value={draft.gradient_from} onChange={(e) => setDraft({ ...draft, gradient_from: e.target.value })} placeholder="from-violet-500" />
          <TextInput value={draft.gradient_to} onChange={(e) => setDraft({ ...draft, gradient_to: e.target.value })} placeholder="to-fuchsia-600" />
          <TextInput type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} placeholder="Sort order" />
          <PrimaryButton disabled={uploading} onClick={add}>
            <Plus className="h-4 w-4" /> Add banner
          </PrimaryButton>
        </div>
      </Surface>

      {/* Lists */}
      {(["hero_slider", "hero_side", "home_promo_card", "home_video", "category"] as const).map((p) => (
        <Surface key={p}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-700/70">{p.replace("_", " ")} <span className="ml-1 rounded-full bg-purple-900/5 px-2 py-0.5 text-purple-800">{grouped[p].length}</span></h2>
          {grouped[p].length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">None</p>
          ) : (
            <div className="space-y-2">
              {grouped[p].map((b) => (
                <BannerRow key={b.id} banner={b} onChange={(nb) => {
                  const next = [...items]; const i = next.findIndex(x => x.id === b.id); next[i] = nb; setItems(next);
                }} onSave={() => save(items.find(x => x.id === b.id)!)} onDelete={() => del(b.id)} onUpload={onUpload} uploading={uploading} />
              ))}
            </div>
          )}
        </Surface>
      ))}
    </div>
  );
}

function BannerRow({ banner, onChange, onSave, onDelete, onUpload, uploading }: {
  banner: Banner;
  onChange: (b: Banner) => void;
  onSave: () => void;
  onDelete: () => void;
  onUpload: (f: File, apply: (url: string) => void) => void;
  uploading: boolean;
}) {
  const b = banner;
  return (
    <div className="grid items-center gap-2 rounded border p-2 md:grid-cols-[80px_1fr_1fr_1fr_auto]">
      <div className="grid h-14 w-20 place-items-center overflow-hidden rounded bg-muted">
        {b.image_url ? <img src={b.image_url} className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="space-y-1">
        <input value={b.title} onChange={(e) => onChange({ ...b, title: e.target.value })} placeholder="Title" className="w-full rounded border px-2 py-1 text-xs" />
        <input value={b.subtitle} onChange={(e) => onChange({ ...b, subtitle: e.target.value })} placeholder="Subtitle" className="w-full rounded border px-2 py-1 text-xs" />
      </div>
      <div className="space-y-1">
        <input value={b.link_url} onChange={(e) => onChange({ ...b, link_url: e.target.value })} placeholder="Banner link" className="w-full rounded border px-2 py-1 text-xs" />
        <div className="flex gap-1">
          <input value={b.button_label} onChange={(e) => onChange({ ...b, button_label: e.target.value })} placeholder="Button label" className="w-1/2 rounded border px-2 py-1 text-xs" />
          <input value={b.button_link} onChange={(e) => onChange({ ...b, button_link: e.target.value })} placeholder="Button link" className="w-1/2 rounded border px-2 py-1 text-xs" />
        </div>
        <div className="flex gap-1">
          <input value={b.image_url} onChange={(e) => onChange({ ...b, image_url: e.target.value })} placeholder="Image URL" className="flex-1 rounded border px-2 py-1 text-xs" />
          <label className="cursor-pointer rounded border px-2 py-1 text-[10px]">📁
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0], (u) => onChange({ ...b, image_url: u }))} />
          </label>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex gap-1">
          <input value={b.gradient_from} onChange={(e) => onChange({ ...b, gradient_from: e.target.value })} placeholder="from-" className="w-full rounded border px-2 py-1 text-xs" />
          <input value={b.gradient_to} onChange={(e) => onChange({ ...b, gradient_to: e.target.value })} placeholder="to-" className="w-full rounded border px-2 py-1 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <input type="number" value={b.sort_order} onChange={(e) => onChange({ ...b, sort_order: Number(e.target.value) })} className="w-16 rounded border px-2 py-1 text-xs" />
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={b.active} onChange={(e) => onChange({ ...b, active: e.target.checked })} /> Active
          </label>
        </div>
      </div>
      <div className="flex gap-1">
        <button disabled={uploading} onClick={onSave} className="rounded bg-primary px-2 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"><Save className="h-3.5 w-3.5" /></button>
        <button onClick={onDelete} className="rounded bg-red-500 px-2 py-1.5 text-xs text-white"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
