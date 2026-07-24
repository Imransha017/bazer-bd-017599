import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Palette, Save, Plus, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Surface, PrimaryButton, TextInput } from "@/lib/admin-ui";
import { siteSettingsQuery, saveSiteSettings, DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site-settings";
import { uploadProductImage } from "@/lib/admin-api";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sys-x7k9-control/site-customization")({
  component: SiteCustomization,
});

type Tab = "brand" | "header" | "footer";

function SiteCustomization() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("brand");
  const [s, setS] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("site_settings").select("settings").eq("id", 1).maybeSingle();
      if (data?.settings) {
        setS({
          brand: { ...DEFAULT_SETTINGS.brand, ...(data.settings.brand ?? {}) },
          header: { ...DEFAULT_SETTINGS.header, ...(data.settings.header ?? {}) },
          footer: { ...DEFAULT_SETTINGS.footer, ...(data.settings.footer ?? {}) },
        });
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await saveSiteSettings(s);
      await qc.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Site settings saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function upload(file: File, apply: (url: string) => void) {
    try {
      const url = await uploadProductImage(file);
      apply(url);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5">
      <PageHeader icon={Palette} title="Site Customization" subtitle="Header, footer, brand, links, contact — no code required" />

      <div className="flex gap-2">
        {(["brand", "header", "footer"] as Tab[]).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${tab === k ? "bg-purple-900 text-white" : "bg-white text-purple-800 border border-purple-900/10"}`}>
            {k}
          </button>
        ))}
        <div className="ml-auto">
          <PrimaryButton onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </PrimaryButton>
        </div>
      </div>

      {tab === "brand" && (
        <Surface>
          <div className="grid gap-3 md:grid-cols-2">
            <Labeled label="Brand name">
              <TextInput value={s.brand.name} onChange={(e) => setS({ ...s, brand: { ...s.brand, name: e.target.value } })} />
            </Labeled>
            <Labeled label="Tagline">
              <TextInput value={s.brand.tagline} onChange={(e) => setS({ ...s, brand: { ...s.brand, tagline: e.target.value } })} />
            </Labeled>
            <Labeled label="Logo">
              <div className="flex items-center gap-2">
                {s.brand.logo_url ? (
                  <img src={s.brand.logo_url} className="h-12 w-12 rounded object-contain border" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded border bg-muted"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                )}
                <TextInput value={s.brand.logo_url} onChange={(e) => setS({ ...s, brand: { ...s.brand, logo_url: e.target.value } })} placeholder="Image URL" className="flex-1" />
                <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-purple-50">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], (u) => setS({ ...s, brand: { ...s.brand, logo_url: u } }))} />
                </label>
              </div>
            </Labeled>
            <Labeled label="Favicon URL">
              <TextInput value={s.brand.favicon_url} onChange={(e) => setS({ ...s, brand: { ...s.brand, favicon_url: e.target.value } })} />
            </Labeled>
          </div>
        </Surface>
      )}

      {tab === "header" && (
        <Surface>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={s.header.top_bar_enabled} onChange={(e) => setS({ ...s, header: { ...s.header, top_bar_enabled: e.target.checked } })} />
              <span className="text-sm font-semibold">Show top utility bar</span>
            </div>
            <Labeled label="Top bar text">
              <TextInput value={s.header.top_bar_text} onChange={(e) => setS({ ...s, header: { ...s.header, top_bar_text: e.target.value } })} />
            </Labeled>

            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-700/70">Header quick links</div>
              <div className="space-y-2">
                {s.header.nav_links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <TextInput value={l.label} onChange={(e) => {
                      const links = [...s.header.nav_links]; links[i] = { ...l, label: e.target.value }; setS({ ...s, header: { ...s.header, nav_links: links } });
                    }} placeholder="Label" className="flex-1" />
                    <TextInput value={l.href} onChange={(e) => {
                      const links = [...s.header.nav_links]; links[i] = { ...l, href: e.target.value }; setS({ ...s, header: { ...s.header, nav_links: links } });
                    }} placeholder="/path or https://…" className="flex-1" />
                    <button onClick={() => setS({ ...s, header: { ...s.header, nav_links: s.header.nav_links.filter((_, j) => j !== i) } })}
                      className="rounded bg-red-500 px-2 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setS({ ...s, header: { ...s.header, nav_links: [...s.header.nav_links, { label: "New link", href: "/", sort: s.header.nav_links.length + 1 }] } })}
                  className="flex items-center gap-1 rounded border border-dashed px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-50">
                  <Plus className="h-3.5 w-3.5" /> Add link
                </button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-4">
              {(["show_search", "show_wishlist", "show_cart", "show_account"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2 rounded border p-2 text-sm">
                  <input type="checkbox" checked={s.header[k]} onChange={(e) => setS({ ...s, header: { ...s.header, [k]: e.target.checked } })} />
                  {k.replace("show_", "")}
                </label>
              ))}
            </div>
          </div>
        </Surface>
      )}

      {tab === "footer" && (
        <div className="space-y-4">
          <Surface>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-700/70">Footer columns (up to 4)</div>
            <div className="space-y-4">
              {s.footer.columns.map((col, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="mb-2 flex gap-2">
                    <TextInput value={col.title} onChange={(e) => {
                      const cols = [...s.footer.columns]; cols[i] = { ...col, title: e.target.value }; setS({ ...s, footer: { ...s.footer, columns: cols } });
                    }} placeholder="Column title" className="flex-1" />
                    <button onClick={() => setS({ ...s, footer: { ...s.footer, columns: s.footer.columns.filter((_, j) => j !== i) } })}
                      className="rounded bg-red-500 px-2 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="space-y-2 pl-3">
                    {col.links.map((l, j) => (
                      <div key={j} className="flex gap-2">
                        <TextInput value={l.label} onChange={(e) => {
                          const cols = [...s.footer.columns]; const links = [...col.links]; links[j] = { ...l, label: e.target.value }; cols[i] = { ...col, links }; setS({ ...s, footer: { ...s.footer, columns: cols } });
                        }} placeholder="Label" className="flex-1" />
                        <TextInput value={l.href} onChange={(e) => {
                          const cols = [...s.footer.columns]; const links = [...col.links]; links[j] = { ...l, href: e.target.value }; cols[i] = { ...col, links }; setS({ ...s, footer: { ...s.footer, columns: cols } });
                        }} placeholder="URL" className="flex-1" />
                        <button onClick={() => {
                          const cols = [...s.footer.columns]; cols[i] = { ...col, links: col.links.filter((_, k) => k !== j) }; setS({ ...s, footer: { ...s.footer, columns: cols } });
                        }} className="rounded bg-red-500 px-2 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const cols = [...s.footer.columns]; cols[i] = { ...col, links: [...col.links, { label: "New link", href: "#" }] }; setS({ ...s, footer: { ...s.footer, columns: cols } });
                    }} className="text-xs font-semibold text-purple-800 hover:underline">+ Add link</button>
                  </div>
                </div>
              ))}
              {s.footer.columns.length < 4 && (
                <button onClick={() => setS({ ...s, footer: { ...s.footer, columns: [...s.footer.columns, { title: "New column", links: [] }] } })}
                  className="flex items-center gap-1 rounded border border-dashed px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-50">
                  <Plus className="h-3.5 w-3.5" /> Add column
                </button>
              )}
            </div>
          </Surface>

          <Surface>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-700/70">Payment badges</div>
            <div className="space-y-2">
              {s.footer.payment_badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TextInput value={b.label} onChange={(e) => { const arr = [...s.footer.payment_badges]; arr[i] = { ...b, label: e.target.value }; setS({ ...s, footer: { ...s.footer, payment_badges: arr } }); }} placeholder="Label" className="w-32" />
                  <input type="color" value={b.bg} onChange={(e) => { const arr = [...s.footer.payment_badges]; arr[i] = { ...b, bg: e.target.value }; setS({ ...s, footer: { ...s.footer, payment_badges: arr } }); }} className="h-8 w-10 rounded border" />
                  <input type="color" value={b.fg} onChange={(e) => { const arr = [...s.footer.payment_badges]; arr[i] = { ...b, fg: e.target.value }; setS({ ...s, footer: { ...s.footer, payment_badges: arr } }); }} className="h-8 w-10 rounded border" />
                  <span style={{ background: b.bg, color: b.fg }} className="inline-flex h-7 min-w-[44px] items-center justify-center rounded border px-2 text-[10px] font-extrabold italic tracking-tight">{b.label}</span>
                  <button onClick={() => setS({ ...s, footer: { ...s.footer, payment_badges: s.footer.payment_badges.filter((_, j) => j !== i) } })} className="ml-auto rounded bg-red-500 px-2 py-1 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button onClick={() => setS({ ...s, footer: { ...s.footer, payment_badges: [...s.footer.payment_badges, { label: "New", bg: "#000000", fg: "#ffffff" }] } })}
                className="flex items-center gap-1 rounded border border-dashed px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-50">
                <Plus className="h-3.5 w-3.5" /> Add badge
              </button>
            </div>
          </Surface>

          <Surface>
            <div className="grid gap-3 md:grid-cols-2">
              <Labeled label="Contact email"><TextInput value={s.footer.contact.email} onChange={(e) => setS({ ...s, footer: { ...s.footer, contact: { ...s.footer.contact, email: e.target.value } } })} /></Labeled>
              <Labeled label="Contact phone"><TextInput value={s.footer.contact.phone} onChange={(e) => setS({ ...s, footer: { ...s.footer, contact: { ...s.footer.contact, phone: e.target.value } } })} /></Labeled>
              <Labeled label="Address"><TextInput value={s.footer.contact.address} onChange={(e) => setS({ ...s, footer: { ...s.footer, contact: { ...s.footer.contact, address: e.target.value } } })} /></Labeled>
              <Labeled label="App Store URL"><TextInput value={s.footer.app_links.app_store} onChange={(e) => setS({ ...s, footer: { ...s.footer, app_links: { ...s.footer.app_links, app_store: e.target.value } } })} /></Labeled>
              <Labeled label="Google Play URL"><TextInput value={s.footer.app_links.google_play} onChange={(e) => setS({ ...s, footer: { ...s.footer, app_links: { ...s.footer.app_links, google_play: e.target.value } } })} /></Labeled>
              <Labeled label="Copyright text"><TextInput value={s.footer.copyright_text} onChange={(e) => setS({ ...s, footer: { ...s.footer, copyright_text: e.target.value } })} /></Labeled>
            </div>
          </Surface>

          <Surface>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-purple-700/70">Social links</div>
            <div className="grid gap-3 md:grid-cols-2">
              {(["facebook", "instagram", "youtube", "twitter"] as const).map((k) => (
                <Labeled key={k} label={k[0].toUpperCase() + k.slice(1)}>
                  <TextInput value={s.footer.social[k]} onChange={(e) => setS({ ...s, footer: { ...s.footer, social: { ...s.footer.social, [k]: e.target.value } } })} placeholder={`https://${k}.com/…`} />
                </Labeled>
              ))}
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      {children}
    </div>
  );
}
