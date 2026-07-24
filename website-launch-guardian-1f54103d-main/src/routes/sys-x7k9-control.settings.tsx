import { createFileRoute } from "@tanstack/react-router";
import { Settings, Globe, Mail, Phone, Facebook, Instagram, Search, Info } from "lucide-react";
import { PageHeader } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/settings")({
  component: SiteSettings,
});

function SiteSettings() {
  return (
    <div className="space-y-5">
      <PageHeader icon={Settings} title="Site Settings" subtitle="Store info, SEO, contact, and social links" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Store Information" icon={Globe}>
          <Field label="Store name" value="Bazar BD" />
          <Field label="Tagline" value="Bangladesh's premium online marketplace" />
          <Field label="Currency" value="BDT (৳)" />
          <Field label="Timezone" value="Asia/Dhaka" />
        </Card>

        <Card title="Contact" icon={Mail}>
          <Field label="Email" value="support@bazar-bd.com" icon={Mail} />
          <Field label="Phone" value="+880 1XXX-XXXXXX" icon={Phone} />
          <Field label="Address" value="Dhaka, Bangladesh" />
        </Card>

        <Card title="SEO Defaults" icon={Search}>
          <Field label="Default title" value="Bazar BD — Shop premium products online" />
          <Field label="Meta description" value="Discover thousands of products with fast nationwide delivery." multiline />
          <Field label="Keywords" value="ecommerce, bangladesh, online shopping" />
        </Card>

        <Card title="Social Links" icon={Facebook}>
          <Field label="Facebook" value="facebook.com/bazarbd" icon={Facebook} />
          <Field label="Instagram" value="instagram.com/bazarbd" icon={Instagram} />
        </Card>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Settings preview. Persistence to the database can be enabled on request.</p>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-purple-900/5 bg-white p-5 shadow-sm shadow-purple-900/5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-900/5 text-purple-800">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-black tracking-tight text-purple-950">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, icon: Icon, multiline }: { label: string; value: string; icon?: any; multiline?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</label>
      <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <span className={multiline ? "leading-relaxed" : "truncate"}>{value}</span>
      </div>
    </div>
  );
}
