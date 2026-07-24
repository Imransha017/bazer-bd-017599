import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/lib/admin-ui";
import { Rocket, Check, X, Ban, Eye, ChevronDown, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  adminListDropshippers, adminUpdateDropshipper,
  adminListPayouts, adminUpdatePayout,
  type Dropshipper, type DropshipperPayout,
} from "@/lib/dropshipper";

type PayoutRow = DropshipperPayout & { dropshippers: { store_name: string; code: string } | null };

export const Route = createFileRoute("/sys-x7k9-control/dropshippers")({
  head: () => ({ meta: [{ title: "Dropshippers — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDropshippers,
});

function AdminDropshippers() {
  const [tab, setTab] = useState<"stores" | "payouts">("stores");
  return (
    <div className="space-y-4">
      <PageHeader icon={Rocket} title="Dropshipping Program" subtitle="Approve stores and process payouts" />
      <div className="flex gap-1 border-b">
        {(["stores", "payouts"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`border-b-2 px-4 py-2 text-xs font-bold capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {tab === "stores" && <StoresPanel />}
      {tab === "payouts" && <PayoutsPanel />}
    </div>
  );
}

function StoresPanel() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Dropshipper[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Dropshipper | null>(null);
  const [rejectFor, setRejectFor] = useState<Dropshipper | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const reload = () => adminListDropshippers(filter === "all" ? undefined : filter).then(setRows);
  useEffect(() => { if (!loading && user) reload(); /* eslint-disable-next-line */ }, [filter, loading, user]);

  const STATUS_TOAST: Record<DsStatus, string> = {
    approved: "✅ ড্রপশিপার অ্যাপ্রুভ করা হয়েছে",
    pending: "⏳ স্ট্যাটাস Pending-এ ফেরত আনা হয়েছে",
    suspended: "⛔ ড্রপশিপার সাসপেন্ড করা হয়েছে",
    rejected: "❌ ড্রপশিপার রিজেক্ট করা হয়েছে",
  };

  const applyStatus = async (id: string, status: DsStatus, reason?: string) => {
    const prev = rows;
    setUpdatingId(id);
    // Optimistic update
    setRows(rs => rs.map(r => r.id === id ? { ...r, status, rejection_reason: status === "rejected" ? (reason ?? null) : null } : r));
    const toastId = toast.loading("আপডেট হচ্ছে…");
    try {
      await adminUpdateDropshipper(id, { status, rejection_reason: status === "rejected" ? (reason ?? null) : null });
      toast.success(STATUS_TOAST[status], { id: toastId });
      // Refresh to reflect filter changes
      reload();
    } catch (e) {
      setRows(prev); // rollback
      toast.error(`আপডেট ব্যর্থ: ${(e as Error).message}`, { id: toastId });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = (r: Dropshipper, status: DsStatus) => {
    if (status === r.status) return;
    if (status === "rejected") {
      setRejectFor(r);
      setRejectReason(r.rejection_reason ?? "");
      return;
    }
    applyStatus(r.id, status);
  };

  const confirmReject = async () => {
    if (!rejectFor) return;
    if (!rejectReason.trim()) return toast.error("রিজেকশনের কারণ লিখতে হবে");
    const target = rejectFor;
    const reason = rejectReason.trim();
    setRejectFor(null);
    setRejectReason("");
    await applyStatus(target.id, "rejected", reason);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {["all", "pending", "approved", "rejected", "suspended"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded px-3 py-1 text-xs font-bold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No stores in this filter.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left">
              <tr><th className="p-2">Store</th><th className="p-2">Phone</th><th className="p-2">Payout</th><th className="p-2 text-right">Orders</th><th className="p-2 text-right">Earned</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={`border-t align-top transition ${updatingId === r.id ? "opacity-60" : ""}`}>
                  <td className="p-2">
                    <p className="font-semibold">{r.store_name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">/{r.store_slug} · code {r.code}</p>
                    {r.bio && <p className="mt-1 text-[10px] text-muted-foreground">{r.bio}</p>}
                  </td>
                  <td className="p-2">{r.phone}{r.whatsapp && <div className="text-[10px] text-muted-foreground">wa: {r.whatsapp}</div>}</td>
                  <td className="p-2">{r.payout_method}<div className="text-[10px] text-muted-foreground">{r.payout_number}</div></td>
                  <td className="p-2 text-right">{r.total_orders}</td>
                  <td className="p-2 text-right">৳{Number(r.total_earned).toFixed(0)}</td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{r.status}</span></td>
                  <td className="p-2">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetail(r)} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm hover:bg-slate-50" title="View details"><Eye className="h-3 w-3" />View</button>
                      <StatusMenu current={r.status} disabled={updatingId === r.id} onChange={(s) => handleStatusChange(r, s)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detail && <DropshipperDetailModal ds={detail} onClose={() => setDetail(null)} />}
      {rejectFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setRejectFor(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-extrabold">Reject {rejectFor.store_name}?</h3>
            <p className="mt-1 text-xs text-muted-foreground">ড্রপশিপার এই কারণটি তাদের অ্যাপ্লিকেশন পেজে দেখতে পাবে।</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} placeholder="যেমন: প্রোফাইল অসম্পূর্ণ, ভুল তথ্য, ইত্যাদি…" className="mt-3 w-full rounded border px-3 py-2 text-sm" autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectFor(null)} className="rounded border px-4 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button onClick={confirmReject} className="rounded bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type DsStatus = Dropshipper["status"];
const STATUS_META: Record<DsStatus, { label: string; icon: typeof Check; cls: string; dot: string }> = {
  approved: { label: "Approved", icon: Check, cls: "bg-green-600 hover:bg-green-700 text-white", dot: "bg-green-400" },
  pending: { label: "Pending", icon: Clock, cls: "bg-amber-500 hover:bg-amber-600 text-white", dot: "bg-amber-300" },
  rejected: { label: "Rejected", icon: X, cls: "bg-red-600 hover:bg-red-700 text-white", dot: "bg-red-400" },
  suspended: { label: "Suspended", icon: Ban, cls: "bg-slate-700 hover:bg-slate-800 text-white", dot: "bg-slate-400" },
};

function StatusMenu({ current, onChange, disabled }: { current: DsStatus; onChange: (status: DsStatus, reason?: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const meta = STATUS_META[current];
  const Icon = meta.icon;
  const options: { key: DsStatus; needsReason?: boolean }[] = [
    { key: "approved" }, { key: "pending" }, { key: "suspended" }, { key: "rejected", needsReason: true },
  ];

  const pick = (s: DsStatus, needsReason?: boolean) => {
    setOpen(false);
    if (s === current) return;
    if (needsReason) {
      const reason = prompt("Rejection reason?") ?? undefined;
      onChange(s, reason);
    } else {
      onChange(s);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${meta.cls}`}
      >
        <Icon className="h-3 w-3" />
        {meta.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-xl border bg-white shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center gap-1.5 border-b bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <Shield className="h-3 w-3" /> Change status
          </div>
          {options.map(({ key, needsReason }) => {
            const m = STATUS_META[key];
            const MIcon = m.icon;
            const active = key === current;
            return (
              <button
                key={key}
                onClick={() => pick(key, needsReason)}
                disabled={active}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition ${active ? "cursor-default bg-slate-50 text-slate-400" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <span className={`inline-block h-2 w-2 rounded-full ${m.dot}`} />
                <MIcon className="h-3.5 w-3.5" />
                <span className="flex-1">{m.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-green-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";
import { Store as StoreIcon, User as UserIcon, Phone, MessageCircle, Mail, Wallet, CreditCard, FileText, Calendar, Hash, Link2, TrendingUp, ShoppingBag, DollarSign, CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";

function DropshipperDetailModal({ ds, onClose }: { ds: Dropshipper; onClose: () => void }) {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    supabase.rpc("admin_get_user_email", { _user_id: ds.user_id }).then(({ data }) => { if (!cancel) setEmail((data as string) ?? null); });
    return () => { cancel = true; };
  }, [ds.user_id]);

  const pending = Math.max(0, Number(ds.total_earned) - Number(ds.total_paid));
  const statusMeta = STATUS_META[ds.status];
  const StatusIcon = statusMeta.icon;

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied"); };

  const Field = ({ icon: Icon, label, value, mono, copyable }: { icon: typeof Phone; label: string; value: React.ReactNode; mono?: boolean; copyable?: string }) => (
    <div className="group flex items-start gap-2.5 rounded-lg border bg-white p-3 transition hover:border-primary/30 hover:shadow-sm">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-0.5 break-all text-sm font-semibold text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value || <span className="text-muted-foreground font-normal">—</span>}</p>
      </div>
      {copyable && (
        <button onClick={() => copy(copyable)} className="opacity-0 transition group-hover:opacity-100" title="Copy">
          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
        </button>
      )}
    </div>
  );

  const Stat = ({ icon: Icon, label, value, tone }: { icon: typeof Phone; label: string; value: string; tone: string }) => (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1.5 text-lg font-extrabold">{value}</p>
    </div>
  );

  const SectionTitle = ({ icon: Icon, title }: { icon: typeof Phone; title: string }) => (
    <div className="mb-2 flex items-center gap-2 border-b pb-1.5">
      <Icon className="h-4 w-4 text-primary" />
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="my-6 w-full max-w-3xl overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Banner header */}
        <div className="relative">
          <div className="h-28 w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
            {ds.banner_url && <img src={ds.banner_url} alt="banner" className="h-full w-full object-cover opacity-70" />}
          </div>
          <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"><X className="h-4 w-4" /></button>
          <div className="flex items-end gap-4 px-5 pb-4">
            <div className="-mt-10 grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
              {ds.logo_url ? <img src={ds.logo_url} alt="" className="h-full w-full object-cover" /> : <StoreIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900">{ds.store_name}</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusMeta.cls}`}>
                  <StatusIcon className="h-3 w-3" /> {statusMeta.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono">/{ds.store_slug}</span> · Code <span className="font-mono font-semibold">{ds.code}</span>
              </p>
            </div>
            <a href={`/ds/${ds.store_slug}`} target="_blank" rel="noreferrer" className="hidden shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:opacity-90 sm:inline-flex">
              <ExternalLink className="h-3 w-3" /> Public store
            </a>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat icon={ShoppingBag} label="Orders" value={String(ds.total_orders)} tone="border-blue-200 bg-blue-50 text-blue-700" />
            <Stat icon={TrendingUp} label="Earned" value={`৳${Number(ds.total_earned).toFixed(0)}`} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
            <Stat icon={CheckCircle2} label="Paid" value={`৳${Number(ds.total_paid).toFixed(0)}`} tone="border-violet-200 bg-violet-50 text-violet-700" />
            <Stat icon={DollarSign} label="Available" value={`৳${pending.toFixed(0)}`} tone="border-amber-200 bg-amber-50 text-amber-700" />
          </div>

          {/* Contact */}
          <div>
            <SectionTitle icon={UserIcon} title="Contact information" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field icon={Mail} label="Email" value={email} mono copyable={email ?? undefined} />
              <Field icon={Phone} label="Phone" value={ds.phone} copyable={ds.phone} />
              <Field icon={MessageCircle} label="WhatsApp" value={ds.whatsapp} copyable={ds.whatsapp ?? undefined} />
              <Field icon={Hash} label="User ID" value={ds.user_id} mono copyable={ds.user_id} />
            </div>
          </div>

          {/* Store */}
          <div>
            <SectionTitle icon={StoreIcon} title="Store details" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field icon={StoreIcon} label="Store name" value={ds.store_name} />
              <Field icon={Link2} label="Store slug" value={`/${ds.store_slug}`} mono />
              <Field icon={Hash} label="Referral code" value={ds.code} mono copyable={ds.code} />
              <Field icon={AlertCircle} label="Current status" value={<span className="capitalize">{ds.status}</span>} />
            </div>
            {ds.bio && (
              <div className="mt-2 rounded-lg border bg-white p-3">
                <div className="mb-1 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bio / About store</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{ds.bio}</p>
              </div>
            )}
          </div>

          {/* Payout */}
          <div>
            <SectionTitle icon={Wallet} title="Payout information" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field icon={Wallet} label="Payout method" value={<span className="capitalize">{ds.payout_method}</span>} />
              <Field icon={CreditCard} label="Payout number" value={ds.payout_number} mono copyable={ds.payout_number} />
            </div>
          </div>

          {/* Media */}
          {(ds.logo_url || ds.banner_url) && (
            <div>
              <SectionTitle icon={FileText} title="Brand assets" />
              <div className="grid gap-2 sm:grid-cols-2">
                {ds.logo_url && (
                  <div className="rounded-lg border bg-white p-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Logo</p>
                    <img src={ds.logo_url} alt="logo" className="h-32 w-full rounded object-contain" />
                  </div>
                )}
                {ds.banner_url && (
                  <div className="rounded-lg border bg-white p-2">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Banner</p>
                    <img src={ds.banner_url} alt="banner" className="h-32 w-full rounded object-cover" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meta */}
          <div>
            <SectionTitle icon={Calendar} title="Timeline" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Field icon={Calendar} label="Applied on" value={new Date(ds.created_at).toLocaleString()} />
              <Field icon={Calendar} label="Last updated" value={new Date(ds.updated_at).toLocaleString()} />
            </div>
            {ds.rejection_reason && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="mb-1 flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <p className="text-[10px] font-bold uppercase tracking-wide">Rejection reason</p>
                </div>
                <p className="text-sm font-medium text-red-900">{ds.rejection_reason}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-3 sm:hidden">
            <a href={`/ds/${ds.store_slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow hover:opacity-90">
              <ExternalLink className="h-3 w-3" /> Open public store
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PayoutsPanel() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [filter, setFilter] = useState("all");
  const reload = () => adminListPayouts(filter === "all" ? undefined : filter).then(setRows);
  useEffect(() => { if (!loading && user) reload(); /* eslint-disable-next-line */ }, [filter, loading, user]);

  const setStatus = async (id: string, status: string) => {
    try { await adminUpdatePayout(id, { status: status as DropshipperPayout["status"] }); toast.success("Updated"); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {["all", "requested", "processing", "paid", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded px-3 py-1 text-xs font-bold capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{f}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No payouts.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left"><tr><th className="p-2">Date</th><th className="p-2">Store</th><th className="p-2">Method</th><th className="p-2">Account</th><th className="p-2 text-right">Amount</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-2">{r.dropshippers?.store_name || r.dropshipper_id.slice(0, 8)}</td>
                  <td className="p-2">{r.method}</td>
                  <td className="p-2 font-mono text-[10px]">{r.account}</td>
                  <td className="p-2 text-right font-bold">৳{Number(r.amount).toFixed(0)}</td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${r.status === "paid" ? "bg-green-100 text-green-700" : r.status === "requested" ? "bg-amber-100 text-amber-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{r.status}</span></td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {r.status === "requested" && <button onClick={() => setStatus(r.id, "processing")} className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">Processing</button>}
                      {r.status !== "paid" && <button onClick={() => setStatus(r.id, "paid")} className="rounded bg-green-600 px-2 py-1 text-[10px] font-bold text-white">Mark paid</button>}
                      {r.status !== "rejected" && r.status !== "paid" && <button onClick={() => setStatus(r.id, "rejected")} className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">Reject</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
