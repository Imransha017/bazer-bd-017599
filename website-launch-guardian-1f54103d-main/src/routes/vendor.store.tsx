import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMyVendor, updateMyVendor, type Vendor, type VendorFooter, type VendorFooterLink } from "@/lib/vendor";
import { uploadProductImage } from "@/lib/admin-api";
import { Upload, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/ProductImage";

export const Route = createFileRoute("/vendor/store")({
  component: StoreSettings,
});

function StoreSettings() {
  const [v, setV] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getMyVendor().then(setV); }, []);

  if (!v) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  const footer: VendorFooter = v.footer ?? {};
  const setFooter = (patch: Partial<VendorFooter>) => setV({ ...v, footer: { ...footer, ...patch } });

  const upload = async (file: File, key: "logo_url" | "banner_url") => {
    try { const url = await uploadProductImage(file); setV({ ...v, [key]: url }); toast.success("Uploaded"); }
    catch { toast.error("Upload failed"); }
  };

  const links: VendorFooterLink[] = footer.links ?? [];
  const setLinks = (ls: VendorFooterLink[]) => setFooter({ links: ls });

  const save = async () => {
    setSaving(true);
    try {
      await updateMyVendor({
        store_name: v.store_name, description: v.description,
        phone: v.phone, address: v.address,
        logo_url: v.logo_url, banner_url: v.banner_url,
        footer: v.footer ?? {},
      });
      toast.success("Saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Store Settings</h1>

      <div className="space-y-3 rounded-lg bg-card p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <ImagePick label="Logo" url={v.logo_url} onPick={(f) => upload(f, "logo_url")} rounded />
          <ImagePick label="Banner" url={v.banner_url} onPick={(f) => upload(f, "banner_url")} />
        </div>
        <Field label="Store Name"><input value={v.store_name} onChange={e => setV({ ...v, store_name: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" /></Field>
        <Field label="Slug (read-only)"><input value={v.slug} readOnly className="w-full rounded border bg-muted px-3 py-2 text-sm font-mono" /></Field>
        <Field label="Description"><textarea value={v.description ?? ""} onChange={e => setV({ ...v, description: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input value={v.phone ?? ""} onChange={e => setV({ ...v, phone: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" /></Field>
          <Field label="Pickup Address"><input value={v.address ?? ""} onChange={e => setV({ ...v, address: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" /></Field>
        </div>
        <div className="rounded border bg-muted/30 p-3 text-xs">
          <div>Commission: <b>{v.commission_pct}%</b> · Status: <b className="capitalize">{v.status}</b></div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold">Store Footer</h2>
          <p className="text-xs text-muted-foreground">Customize the footer that appears on your storefront.</p>
        </div>

        <p className="text-xs text-muted-foreground">The store logo above is used in both the header and footer.</p>

        <Field label="About / Description">
          <textarea value={footer.about ?? ""} onChange={e => setFooter({ about: e.target.value })} rows={3} className="w-full rounded border px-3 py-2 text-sm" placeholder="Short description shown in the footer" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Footer Phone"><input value={footer.phone ?? ""} onChange={e => setFooter({ phone: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" /></Field>
          <Field label="Footer Email"><input value={footer.email ?? ""} onChange={e => setFooter({ email: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" /></Field>
        </div>
        <Field label="Footer Address"><input value={footer.address ?? ""} onChange={e => setFooter({ address: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" /></Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Custom Links</span>
            <button onClick={() => setLinks([...links, { label: "", url: "" }])} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/20"><Plus className="size-3" /> Add link</button>
          </div>
          <div className="space-y-2">
            {links.length === 0 && <p className="text-xs text-muted-foreground">No links yet.</p>}
            {links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <input value={l.label} onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Label" className="w-1/3 rounded border px-2 py-1.5 text-sm" />
                <input value={l.url} onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://…" className="flex-1 rounded border px-2 py-1.5 text-sm" />
                <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded border text-destructive hover:bg-destructive/10"><Trash2 className="size-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Social Links</span>
          <div className="grid grid-cols-2 gap-2">
            {(["facebook", "instagram", "youtube", "tiktok", "whatsapp"] as const).map(k => (
              <input
                key={k}
                value={footer.social?.[k] ?? ""}
                onChange={e => setFooter({ social: { ...(footer.social ?? {}), [k]: e.target.value } })}
                placeholder={`${k[0].toUpperCase()}${k.slice(1)} URL`}
                className="rounded border px-2 py-1.5 text-sm"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Background color">
            <input type="text" value={footer.bg_color ?? ""} onChange={e => setFooter({ bg_color: e.target.value })} placeholder="#0f172a or transparent" className="w-full rounded border px-3 py-2 text-sm" />
          </Field>
          <Field label="Text color">
            <input type="text" value={footer.text_color ?? ""} onChange={e => setFooter({ text_color: e.target.value })} placeholder="#ffffff" className="w-full rounded border px-3 py-2 text-sm" />
          </Field>
        </div>

        <Field label="Copyright line">
          <input value={footer.copyright ?? ""} onChange={e => setFooter({ copyright: e.target.value })} placeholder={`© ${new Date().getFullYear()} ${v.store_name}`} className="w-full rounded border px-3 py-2 text-sm" />
        </Field>
      </div>

      <button onClick={save} disabled={saving} className="w-full rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function ImagePick({ label, url, onPick, rounded }: { label: string; url: string | null; onPick: (f: File) => void; rounded?: boolean }) {
  return (
    <label className="block cursor-pointer">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className={`flex h-24 items-center justify-center border border-dashed bg-muted/30 hover:bg-muted ${rounded ? "rounded-full" : "rounded"}`}>
        {url ? <ProductImage src={url} alt="" className={`h-full w-full object-cover ${rounded ? "rounded-full" : "rounded"}`} /> : <Upload className="h-5 w-5 text-muted-foreground" />}
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])} />
    </label>
  );
}
