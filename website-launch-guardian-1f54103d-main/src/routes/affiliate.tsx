import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  getSettings, getMyAffiliate, joinAffiliate, updateMyPayout,
  listMyCommissions, listMyPayouts, requestPayout, buildAffiliateLink,
  type Affiliate, type AffiliateSettings, type AffiliateCommission, type AffiliatePayout,
} from "@/lib/affiliate";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, MousePointerClick, ShoppingBag, Wallet, Copy, Link as LinkIcon, Search, TrendingUp, Clock, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/affiliate")({
  head: () => ({ meta: [{ title: "Affiliate Program — Bazar BD" }] }),
  component: AffiliatePage,
});

function AffiliatePage() {
  const { user, loading } = useAuth();
  const [settings, setSettings] = useState<AffiliateSettings | null>(null);
  const [aff, setAff] = useState<Affiliate | null | undefined>(undefined);
  const [code, setCode] = useState("");
  const [method, setMethod] = useState("bKash");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { getSettings().then(setSettings).catch(() => {}); }, []);
  useEffect(() => {
    if (loading) return;
    if (!user) { setAff(null); return; }
    getMyAffiliate().then(setAff).catch(() => setAff(null));
  }, [user, loading]);

  if (loading || aff === undefined) {
    return <SiteLayout><div className="p-16 text-center text-sm text-muted-foreground">Loading…</div></SiteLayout>;
  }
  if (!settings?.is_enabled) {
    return <SiteLayout><div className="p-16 text-center"><h1 className="text-xl font-bold">Affiliate program is currently disabled</h1></div></SiteLayout>;
  }
  if (!user) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">Join our Affiliate Program</h1>
          <p className="mt-2 text-sm text-muted-foreground">Earn {settings.commission_pct}% commission on every referred order.</p>
          <a href="/auth" className="mt-4 inline-block rounded bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">Sign in to apply</a>
        </div>
      </SiteLayout>
    );
  }

  if (!aff) return <ApplyForm settings={settings} code={code} setCode={setCode} method={method} setMethod={setMethod} details={details} setDetails={setDetails} busy={busy} onSubmit={async () => {
    if (!code.trim()) return toast.error("Choose a referral code");
    setBusy(true);
    try {
      const a = await joinAffiliate(code, method, details);
      setAff(a);
      toast.success("Application submitted!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }} />;

  if (aff.status !== "approved") {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-lg p-8 text-center rounded-lg border bg-card mt-8">
          <h1 className="text-xl font-bold capitalize">Application {aff.status}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {aff.status === "pending" && "Your application is under review. You'll be notified once approved."}
            {aff.status === "rejected" && "Unfortunately your application was rejected."}
            {aff.status === "suspended" && "Your affiliate account has been suspended."}
          </p>
          <p className="mt-3 text-xs">Your code: <span className="font-mono font-bold">{aff.code}</span></p>
        </div>
      </SiteLayout>
    );
  }

  return <Dashboard aff={aff} settings={settings} refresh={() => getMyAffiliate().then(setAff)} />;
}

function ApplyForm({ settings, code, setCode, method, setMethod, details, setDetails, busy, onSubmit }: {
  settings: AffiliateSettings; code: string; setCode: (v: string) => void;
  method: string; setMethod: (v: string) => void;
  details: string; setDetails: (v: string) => void;
  busy: boolean; onSubmit: () => void;
}) {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-bold">Become an Affiliate</h1>
        <p className="mt-1 text-sm text-muted-foreground">Earn {settings.commission_pct}% commission per referred order. Min payout ৳{settings.min_payout}. Cookie {settings.cookie_days} days.</p>
        {settings.terms && <p className="mt-3 rounded bg-muted p-3 text-xs whitespace-pre-wrap">{settings.terms}</p>}
        <div className="mt-6 space-y-3 rounded-lg border bg-card p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold">Your Referral Code *</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))} maxLength={24} placeholder="e.g. rahim2026" className="w-full rounded border px-3 py-2 text-sm" />
            <p className="mt-1 text-[11px] text-muted-foreground">Letters and digits only. Used in your referral link.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Payout Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded border px-3 py-2 text-sm">
              <option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Payout Details</label>
            <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Account/mobile number" className="w-full rounded border px-3 py-2 text-sm" />
          </div>
          <button disabled={busy} onClick={onSubmit} className="w-full rounded bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy ? "Submitting…" : "Apply Now"}
          </button>
        </div>
      </div>
    </SiteLayout>
  );
}

function Dashboard({ aff, settings, refresh }: { aff: Affiliate; settings: AffiliateSettings; refresh: () => void }) {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [method, setMethod] = useState(aff.payout_method || "bKash");
  const [details, setDetails] = useState(aff.payout_details || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listMyCommissions(aff.id).then(setCommissions);
    listMyPayouts(aff.id).then(setPayouts);
  }, [aff.id]);

  const available = Math.max(0, aff.total_earned - aff.total_paid - payouts.filter(p => p.status !== "paid" && p.status !== "rejected").reduce((s, p) => s + Number(p.amount), 0));
  const pct = aff.commission_pct ?? settings.commission_pct;

  const submitPayout = async () => {
    const amt = Number(payoutAmount);
    if (!amt || amt <= 0) return toast.error("Enter valid amount");
    if (amt < settings.min_payout) return toast.error(`Minimum payout ৳${settings.min_payout}`);
    if (amt > available) return toast.error("Amount exceeds available balance");
    if (!details.trim()) return toast.error("Enter payout details");
    setBusy(true);
    try {
      await updateMyPayout(method, details);
      await requestPayout(aff.id, amt, method, details);
      setPayoutAmount("");
      toast.success("Payout request submitted");
      listMyPayouts(aff.id).then(setPayouts);
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };

  const pending = commissions.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0);
  const convRate = aff.total_clicks > 0 ? ((aff.total_orders / aff.total_clicks) * 100).toFixed(1) : "0.0";
  const stats = [
    { label: "Total Clicks", value: aff.total_clicks, icon: MousePointerClick, color: "bg-blue-500" },
    { label: "Orders", value: aff.total_orders, icon: ShoppingBag, color: "bg-primary" },
    { label: "Conversion", value: `${convRate}%`, icon: TrendingUp, color: "bg-indigo-500" },
    { label: "Approved Earnings", value: `৳${aff.total_earned.toFixed(0)}`, icon: DollarSign, color: "bg-green-500" },
    { label: "Pending Earnings", value: `৳${pending.toFixed(0)}`, icon: Clock, color: "bg-orange-500" },
    { label: "Total Paid", value: `৳${aff.total_paid.toFixed(0)}`, icon: BadgeCheck, color: "bg-emerald-600" },
    { label: "Available Balance", value: `৳${available.toFixed(0)}`, icon: Wallet, color: "bg-amber-500" },
    { label: "Commission Rate", value: `${pct}%`, icon: DollarSign, color: "bg-purple-500" },
  ];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl space-y-5 p-4">
        <div className="rounded-xl bg-gradient-to-br from-primary to-purple-700 p-5 text-primary-foreground">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
              <p className="text-xs opacity-90">Welcome back — Code: <span className="font-mono font-bold">{aff.code}</span></p>
            </div>
            <div className="flex gap-4 text-xs">
              <div><div className="opacity-80">Cookie</div><div className="font-bold">{settings.cookie_days} days</div></div>
              <div><div className="opacity-80">Min Payout</div><div className="font-bold">৳{settings.min_payout}</div></div>
              <div><div className="opacity-80">Status</div><div className="font-bold capitalize">{aff.status}</div></div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(s => (
            <div key={s.label} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-xl font-bold">{s.value}</div>
                </div>
                <div className={`grid h-9 w-9 place-items-center rounded-lg text-white ${s.color}`}><s.icon className="h-4 w-4" /></div>
              </div>
            </div>
          ))}
        </div>

        <ProductLinkGenerator code={aff.code} />

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Request Payout</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            <input value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={`Amount (min ৳${settings.min_payout})`} className="rounded border px-3 py-2 text-sm" />
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded border px-3 py-2 text-sm">
              <option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option>
            </select>
            <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Account/mobile" className="rounded border px-3 py-2 text-sm sm:col-span-1" />
            <button disabled={busy} onClick={submitPayout} className="rounded bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Request</button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Commissions</h2>
          {commissions.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No commissions yet</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground"><tr className="border-b">
                  <th className="py-2 text-left">Date</th><th className="text-right">Order Total</th><th className="text-right">Rate</th><th className="text-right">Commission</th><th className="text-left pl-3">Status</th>
                </tr></thead>
                <tbody>{commissions.map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="text-right">৳{Number(c.order_total).toFixed(0)}</td>
                    <td className="text-right">{c.commission_pct}%</td>
                    <td className="text-right font-bold">৳{Number(c.amount).toFixed(0)}</td>
                    <td className="pl-3"><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize">{c.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">Payout History</h2>
          {payouts.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No payouts yet</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground"><tr className="border-b">
                  <th className="py-2 text-left">Date</th><th className="text-right">Amount</th><th className="text-left pl-3">Method</th><th className="text-left">Details</th><th className="text-left">Status</th><th className="text-left">Txn</th>
                </tr></thead>
                <tbody>{payouts.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="text-right font-bold">৳{Number(p.amount).toFixed(0)}</td>
                    <td className="pl-3">{p.method}</td>
                    <td>{p.details}</td>
                    <td><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize">{p.status}</span></td>
                    <td className="font-mono text-xs">{p.txn_ref ?? "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

type ProdRow = { id: string; slug: string; name: string; image: string | null; price: number };

function ProductLinkGenerator({ code }: { code: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<ProdRow[]>([]);
  const [sel, setSel] = useState<ProdRow | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setRows([]); return; }
      setLoading(true);
      const { data } = await supabase.from("products")
        .select("id,slug,name,image,price")
        .eq("is_active", true)
        .ilike("name", `%${q.trim()}%`)
        .limit(8);
      setRows((data ?? []) as ProdRow[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const link = sel ? buildAffiliateLink(code, { productPath: `/p/${sel.slug}`, productId: sel.id, days }) : "";
  const copy = () => { if (!link) return; navigator.clipboard.writeText(link); toast.success("Product link copied!"); };
  const expDate = sel ? new Date(Date.now() + days * 86400_000).toLocaleDateString() : "";

  return (
    <div className="rounded-lg border bg-card p-4">
      <h2 className="mb-1 text-sm font-bold flex items-center gap-1"><LinkIcon className="size-3.5" /> Per-Product Affiliate Links</h2>
      <p className="mb-3 text-[11px] text-muted-foreground">Generate a dedicated link for any product. Each link is valid for the days you choose (default 30). Commission is paid only after the referred order is delivered.</p>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product by name…" className="w-full rounded border pl-7 pr-3 py-2 text-sm" />
      </div>
      {loading && <p className="mt-2 text-[11px] text-muted-foreground">Searching…</p>}
      {rows.length > 0 && (
        <ul className="mt-2 max-h-56 overflow-y-auto divide-y rounded border">
          {rows.map(r => (
            <li key={r.id}>
              <button onClick={() => { setSel(r); setRows([]); setQ(r.name); }}
                className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-muted">
                {r.image && <img src={r.image} alt="" className="h-8 w-8 rounded object-cover" />}
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-xs font-bold">৳{r.price}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {sel && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold">Valid for:</label>
            <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 30))} className="w-20 rounded border px-2 py-1" />
            <span>days · expires {expDate}</span>
          </div>
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 rounded border bg-muted px-3 py-2 font-mono text-xs" />
            <button onClick={copy} className="flex items-center gap-1 rounded bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Copy className="size-3.5" /> Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}
