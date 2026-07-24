import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getDropshippingSettings, adminUpdateSettings, type DropshippingSettings } from "@/lib/dropshipper";
import { PageHeader, Surface } from "@/lib/admin-ui";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sys-x7k9-control/dropshipping-settings")({
  head: () => ({ meta: [{ title: "Dropshipping Settings — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDsSettings,
});

const ALL_METHODS = ["bkash", "nagad", "rocket", "bank"] as const;

function AdminDsSettings() {
  const [s, setS] = useState<DropshippingSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getDropshippingSettings().then(setS); }, []);

  if (!s) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  const upd = <K extends keyof DropshippingSettings>(k: K, v: DropshippingSettings[K]) => setS({ ...s, [k]: v });

  const save = async () => {
    setBusy(true);
    try {
      await adminUpdateSettings({
        is_enabled: s.is_enabled,
        default_commission_pct: Number(s.default_commission_pct) || 0,
        min_payout: Number(s.min_payout) || 0,
        cookie_days: Number(s.cookie_days) || 30,
        auto_approve_apps: s.auto_approve_apps,
        auto_approve_earnings: s.auto_approve_earnings,
        allowed_payout_methods: s.allowed_payout_methods,
        terms_md: s.terms_md,
        hero_title: s.hero_title,
        hero_subtitle: s.hero_subtitle,
      });
      toast.success("Settings saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Settings} title="Dropshipping Settings" subtitle="Control the entire dropshipper program" actions={
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded bg-purple-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-3.5 w-3.5" />{busy ? "Saving…" : "Save"}</button>
      } />

      <Surface>
        <h3 className="mb-3 text-sm font-bold">Program</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle checked={s.is_enabled} onChange={v => upd("is_enabled", v)} label="Program enabled" desc="Turn the entire dropshipping program on or off site-wide." />
          <Toggle checked={s.auto_approve_apps} onChange={v => upd("auto_approve_apps", v)} label="Auto-approve applications" desc="New sign-ups become active dropshippers instantly." />
          <Toggle checked={s.auto_approve_earnings} onChange={v => upd("auto_approve_earnings", v)} label="Auto-approve earnings on delivery" desc="Profit is unlocked automatically when the order is marked delivered." />
        </div>
      </Surface>

      <Surface>
        <h3 className="mb-3 text-sm font-bold">Financial</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Default commission %" hint="Fallback commission used if a dropshipper has none set">
            <input type="number" step="0.1" value={s.default_commission_pct} onChange={e => upd("default_commission_pct", Number(e.target.value))} className="w-full rounded border px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Minimum payout (৳)">
            <input type="number" value={s.min_payout} onChange={e => upd("min_payout", Number(e.target.value))} className="w-full rounded border px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Attribution cookie (days)">
            <input type="number" value={s.cookie_days} onChange={e => upd("cookie_days", Number(e.target.value))} className="w-full rounded border px-2 py-1.5 text-sm" />
          </Field>
        </div>
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold">Allowed payout methods</p>
          <div className="flex flex-wrap gap-3">
            {ALL_METHODS.map(m => (
              <label key={m} className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={s.allowed_payout_methods.includes(m)} onChange={e => {
                  const set = new Set(s.allowed_payout_methods);
                  if (e.target.checked) set.add(m); else set.delete(m);
                  upd("allowed_payout_methods", Array.from(set));
                }} />
                <span className="uppercase">{m}</span>
              </label>
            ))}
          </div>
        </div>
      </Surface>

      <Surface>
        <h3 className="mb-3 text-sm font-bold">Landing / apply page copy</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Hero title">
            <input value={s.hero_title ?? ""} onChange={e => upd("hero_title", e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm" />
          </Field>
          <Field label="Hero subtitle">
            <input value={s.hero_subtitle ?? ""} onChange={e => upd("hero_subtitle", e.target.value)} className="w-full rounded border px-2 py-1.5 text-sm" />
          </Field>
        </div>
        <Field label="Terms shown on apply form" className="mt-3">
          <textarea value={s.terms_md ?? ""} onChange={e => upd("terms_md", e.target.value)} rows={6} className="w-full rounded border px-2 py-1.5 text-sm" />
        </Field>
      </Surface>

      <div className="text-right">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded bg-purple-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"><Save className="h-3.5 w-3.5" />{busy ? "Saving…" : "Save all changes"}</button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded border bg-white p-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5" />
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {desc && <p className="text-[11px] text-slate-500">{desc}</p>}
      </div>
    </label>
  );
}

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {hint && <span className="ml-1 text-[10px] text-slate-400">— {hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
