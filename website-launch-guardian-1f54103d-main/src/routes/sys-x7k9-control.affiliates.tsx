import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Surface, PrimaryButton } from "@/lib/admin-ui";
import { Handshake, Eye, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  getSettings, updateSettings, adminListAffiliates, adminUpdateAffiliate,
  adminListCommissions, adminUpdateCommission, adminListPayouts, adminUpdatePayout,
  adminListClicks, adminDeleteAffiliate, adminAddCommission,
  adminListAffiliateCommissions, adminListAffiliatePayouts,
  type AffiliateSettings, type Affiliate, type AffiliateCommission, type AffiliatePayout,
  type AffiliateClick,
} from "@/lib/affiliate";

type CommissionRow = AffiliateCommission & { affiliates: { code: string; user_id: string } | null };
type PayoutRow = AffiliatePayout & { affiliates: { code: string; user_id: string } | null };

export const Route = createFileRoute("/sys-x7k9-control/affiliates")({
  head: () => ({ meta: [{ title: "Affiliates — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminAffiliates,
});

function AdminAffiliates() {
  const [tab, setTab] = useState<"settings" | "affiliates" | "commissions" | "payouts" | "clicks">("affiliates");
  return (
    <div className="space-y-4">
      <PageHeader icon={Handshake} title="Affiliate Program" subtitle="Manage affiliates, commissions, payouts, clicks and settings" />
      <div className="flex gap-1 border-b border-purple-900/10 overflow-x-auto">
        {(["affiliates", "commissions", "payouts", "clicks", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-bold capitalize border-b-2 -mb-px transition whitespace-nowrap ${tab === t ? "border-purple-700 text-purple-900" : "border-transparent text-slate-500 hover:text-purple-700"}`}>{t}</button>
        ))}
      </div>
      {tab === "settings" && <SettingsPanel />}
      {tab === "affiliates" && <AffiliatesPanel />}
      {tab === "commissions" && <CommissionsPanel />}
      {tab === "payouts" && <PayoutsPanel />}
      {tab === "clicks" && <ClicksPanel />}
    </div>
  );
}

function SettingsPanel() {
  const [s, setS] = useState<AffiliateSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getSettings().then(setS); }, []);
  if (!s) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const save = async () => {
    setBusy(true);
    try {
      await updateSettings({
        commission_pct: Number(s.commission_pct),
        cookie_days: Number(s.cookie_days),
        min_payout: Number(s.min_payout),
        is_enabled: s.is_enabled,
        terms: s.terms,
      });
      toast.success("Settings saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <Surface className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={s.is_enabled} onChange={(e) => setS({ ...s, is_enabled: e.target.checked })} className="size-4" />
        Enable affiliate program
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Default commission %">
          <input type="number" step="0.01" value={s.commission_pct} onChange={(e) => setS({ ...s, commission_pct: Number(e.target.value) })} className="w-full rounded border px-3 py-2 text-sm" />
        </Field>
        <Field label="Referral cookie (days)">
          <input type="number" value={s.cookie_days} onChange={(e) => setS({ ...s, cookie_days: Number(e.target.value) })} className="w-full rounded border px-3 py-2 text-sm" />
        </Field>
        <Field label="Minimum payout (৳)">
          <input type="number" value={s.min_payout} onChange={(e) => setS({ ...s, min_payout: Number(e.target.value) })} className="w-full rounded border px-3 py-2 text-sm" />
        </Field>
      </div>
      <Field label="Terms / Rules (shown to affiliates)">
        <textarea rows={5} value={s.terms ?? ""} onChange={(e) => setS({ ...s, terms: e.target.value })} className="w-full rounded border px-3 py-2 text-sm" />
      </Field>
      <PrimaryButton disabled={busy} onClick={save}>{busy ? "Saving…" : "Save Settings"}</PrimaryButton>
    </Surface>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-bold text-purple-900">{label}</label>{children}</div>;
}

function AffiliatesPanel() {
  const [rows, setRows] = useState<Affiliate[]>([]);
  const [status, setStatus] = useState<string>("all");
  const [detail, setDetail] = useState<Affiliate | null>(null);
  const load = () => adminListAffiliates(status).then(setRows);
  useEffect(() => { load(); }, [status]);
  const update = async (id: string, patch: Partial<Pick<Affiliate, "status" | "commission_pct">>) => {
    try { await adminUpdateAffiliate(id, patch); toast.success("Updated"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  const del = async (a: Affiliate) => {
    if (!confirm(`Delete affiliate "${a.code}"? This removes their clicks, commissions and payouts.`)) return;
    try { await adminDeleteAffiliate(a.id); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <Surface>
      <div className="mb-3 flex gap-2 flex-wrap">
        {["all", "pending", "approved", "rejected", "suspended"].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded px-3 py-1 text-xs font-semibold capitalize ${status === s ? "bg-purple-900 text-white" : "bg-purple-50 text-purple-900"}`}>{s}</button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-purple-900/70"><tr className="border-b">
            <th className="py-2 text-left">Code</th><th className="text-left">User ID</th><th className="text-right">Clicks</th><th className="text-right">Orders</th><th className="text-right">Earned</th><th className="text-right">Paid</th><th className="text-left pl-3">Rate %</th><th className="text-left">Status</th><th className="text-right">Actions</th>
          </tr></thead>
          <tbody>{rows.map(a => (
            <tr key={a.id} className="border-b last:border-0">
              <td className="py-2 font-mono font-bold">{a.code}</td>
              <td className="font-mono text-[10px]">{a.user_id.slice(0, 8)}…</td>
              <td className="text-right">{a.total_clicks}</td>
              <td className="text-right">{a.total_orders}</td>
              <td className="text-right">৳{Number(a.total_earned).toFixed(0)}</td>
              <td className="text-right">৳{Number(a.total_paid).toFixed(0)}</td>
              <td className="pl-3"><input type="number" step="0.01" defaultValue={a.commission_pct ?? ""} placeholder="default" onBlur={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); if (v !== a.commission_pct) update(a.id, { commission_pct: v as unknown as number }); }} className="w-20 rounded border px-2 py-1 text-xs" /></td>
              <td><select value={a.status} onChange={(e) => update(a.id, { status: e.target.value as Affiliate["status"] })} className="rounded border px-2 py-1 text-xs">
                <option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option><option value="suspended">suspended</option>
              </select></td>
              <td className="text-right whitespace-nowrap">
                <button onClick={() => setDetail(a)} title="View details" className="rounded p-1.5 text-purple-700 hover:bg-purple-50"><Eye className="size-4" /></button>
                <button onClick={() => del(a)} title="Delete" className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No affiliates</p>}
      </div>
      {detail && <AffiliateDetail affiliate={detail} onClose={() => setDetail(null)} onChanged={load} />}
    </Surface>
  );
}

function CommissionsPanel() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [status, setStatus] = useState("all");
  const load = () => adminListCommissions(status).then(setRows);
  useEffect(() => { load(); }, [status]);
  const upd = async (id: string, newStatus: AffiliateCommission["status"]) => {
    try { await adminUpdateCommission(id, newStatus); toast.success("Updated"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <Surface>
      <div className="mb-3 flex gap-2">
        {["all", "pending", "approved", "paid", "rejected"].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded px-3 py-1 text-xs font-semibold capitalize ${status === s ? "bg-purple-900 text-white" : "bg-purple-50 text-purple-900"}`}>{s}</button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-purple-900/70"><tr className="border-b">
            <th className="py-2 text-left">Date</th><th className="text-left">Affiliate</th><th className="text-left">Order</th><th className="text-right">Total</th><th className="text-right">Rate</th><th className="text-right">Amount</th><th className="text-left pl-3">Status</th><th></th>
          </tr></thead>
          <tbody>{rows.map(c => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2">{new Date(c.created_at).toLocaleDateString()}</td>
              <td className="font-mono">{c.affiliates?.code}</td>
              <td className="font-mono text-[10px]">{c.order_id?.slice(0, 8)}…</td>
              <td className="text-right">৳{Number(c.order_total).toFixed(0)}</td>
              <td className="text-right">{c.commission_pct}%</td>
              <td className="text-right font-bold">৳{Number(c.amount).toFixed(0)}</td>
              <td className="pl-3"><select value={c.status} onChange={(e) => upd(c.id, e.target.value as AffiliateCommission["status"])} className="rounded border px-2 py-1 text-xs">
                <option value="pending">pending</option><option value="approved">approved</option><option value="paid">paid</option><option value="rejected">rejected</option>
              </select></td>
              <td></td>
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No commissions</p>}
      </div>
    </Surface>
  );
}

function PayoutsPanel() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [status, setStatus] = useState("all");
  const load = () => adminListPayouts(status).then(setRows);
  useEffect(() => { load(); }, [status]);
  const upd = async (id: string, patch: Partial<Pick<AffiliatePayout, "status" | "txn_ref" | "admin_notes">>) => {
    try { await adminUpdatePayout(id, patch); toast.success("Updated"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <Surface>
      <div className="mb-3 flex gap-2">
        {["all", "requested", "processing", "paid", "rejected"].map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded px-3 py-1 text-xs font-semibold capitalize ${status === s ? "bg-purple-900 text-white" : "bg-purple-50 text-purple-900"}`}>{s}</button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-purple-900/70"><tr className="border-b">
            <th className="py-2 text-left">Date</th><th className="text-left">Affiliate</th><th className="text-right">Amount</th><th className="text-left pl-3">Method</th><th className="text-left">Details</th><th className="text-left">Status</th><th className="text-left">Txn Ref</th>
          </tr></thead>
          <tbody>{rows.map(p => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
              <td className="font-mono">{p.affiliates?.code}</td>
              <td className="text-right font-bold">৳{Number(p.amount).toFixed(0)}</td>
              <td className="pl-3">{p.method}</td>
              <td>{p.details}</td>
              <td><select value={p.status} onChange={(e) => upd(p.id, { status: e.target.value as AffiliatePayout["status"] })} className="rounded border px-2 py-1 text-xs">
                <option value="requested">requested</option><option value="processing">processing</option><option value="paid">paid</option><option value="rejected">rejected</option>
              </select></td>
              <td><input defaultValue={p.txn_ref ?? ""} placeholder="txn ref" onBlur={(e) => { if (e.target.value !== (p.txn_ref ?? "")) upd(p.id, { txn_ref: e.target.value || null }); }} className="w-32 rounded border px-2 py-1 text-xs" /></td>
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No payout requests</p>}
      </div>
    </Surface>
  );
}

function ClicksPanel() {
  const [rows, setRows] = useState<AffiliateClick[]>([]);
  useEffect(() => { adminListClicks().then(setRows); }, []);
  return (
    <Surface>
      <div className="mb-2 text-xs text-purple-900/70">Last {rows.length} clicks across all affiliates</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-purple-900/70"><tr className="border-b">
            <th className="py-2 text-left">Date</th><th className="text-left">Affiliate ID</th><th className="text-left">Product</th><th className="text-left">Landing</th><th className="text-left">Referrer</th>
          </tr></thead>
          <tbody>{rows.map(c => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2 whitespace-nowrap">{new Date(c.created_at).toLocaleString()}</td>
              <td className="font-mono text-[10px]">{c.affiliate_id.slice(0,8)}…</td>
              <td className="font-mono text-[10px]">{c.product_id ?? "—"}</td>
              <td className="text-xs truncate max-w-[220px]">{c.landing_path ?? "—"}</td>
              <td className="text-xs truncate max-w-[220px]">{c.referer ?? "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No clicks yet</p>}
      </div>
    </Surface>
  );
}

function AffiliateDetail({ affiliate, onClose, onChanged }: { affiliate: Affiliate; onClose: () => void; onChanged: () => void }) {
  const [clicks, setClicks] = useState<AffiliateClick[]>([]);
  const [coms, setComs] = useState<AffiliateCommission[]>([]);
  const [pays, setPays] = useState<AffiliatePayout[]>([]);
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = () => {
    adminListClicks(affiliate.id, 50).then(setClicks);
    adminListAffiliateCommissions(affiliate.id).then(setComs);
    adminListAffiliatePayouts(affiliate.id).then(setPays);
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [affiliate.id]);
  const addCom = async () => {
    const n = Number(amt);
    if (!n || n <= 0) return toast.error("Enter amount");
    setBusy(true);
    try {
      await adminAddCommission(affiliate.id, n, note || "Manual adjustment");
      toast.success("Commission added");
      setAmt(""); setNote(""); reload(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-bold">Affiliate <span className="font-mono text-purple-800">{affiliate.code}</span></h3>
            <p className="text-xs text-slate-500">User {affiliate.user_id.slice(0,8)}… · Status <span className="capitalize font-bold">{affiliate.status}</span></p>
          </div>
          <button onClick={onClose} className="rounded p-1.5 hover:bg-slate-100"><X className="size-4" /></button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs mb-4">
          <Stat label="Clicks" v={affiliate.total_clicks} />
          <Stat label="Orders" v={affiliate.total_orders} />
          <Stat label="Earned" v={`৳${Number(affiliate.total_earned).toFixed(0)}`} />
          <Stat label="Paid" v={`৳${Number(affiliate.total_paid).toFixed(0)}`} />
        </div>

        <div className="mb-4 rounded border bg-purple-50/50 p-3">
          <h4 className="mb-2 text-xs font-bold text-purple-900 flex items-center gap-1"><Plus className="size-3.5" /> Add Manual Commission</h4>
          <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
            <input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amount ৳" className="rounded border px-2 py-1.5 text-xs" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (reason)" className="rounded border px-2 py-1.5 text-xs" />
            <button disabled={busy} onClick={addCom} className="rounded bg-purple-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Add</button>
          </div>
        </div>

        <Section title={`Commissions (${coms.length})`}>
          <MiniTable head={["Date","Order","Rate","Amount","Status"]} rows={coms.map(c => [
            new Date(c.created_at).toLocaleDateString(),
            c.order_id ? c.order_id.slice(0,8)+"…" : "manual",
            `${c.commission_pct}%`,
            `৳${Number(c.amount).toFixed(0)}`,
            c.status,
          ])} />
        </Section>

        <Section title={`Payouts (${pays.length})`}>
          <MiniTable head={["Date","Amount","Method","Status","Txn"]} rows={pays.map(p => [
            new Date(p.created_at).toLocaleDateString(),
            `৳${Number(p.amount).toFixed(0)}`,
            p.method ?? "—",
            p.status,
            p.txn_ref ?? "—",
          ])} />
        </Section>

        <Section title={`Recent Clicks (${clicks.length})`}>
          <MiniTable head={["Date","Product","Landing","Referrer"]} rows={clicks.map(c => [
            new Date(c.created_at).toLocaleString(),
            c.product_id ?? "—",
            c.landing_path ?? "—",
            c.referer ?? "—",
          ])} />
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string | number }) {
  return <div className="rounded border bg-white p-2"><div className="text-[10px] text-slate-500 uppercase">{label}</div><div className="text-sm font-bold">{v}</div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-4"><h4 className="mb-1 text-xs font-bold text-purple-900">{title}</h4>{children}</div>;
}
function MiniTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="py-3 text-center text-xs text-muted-foreground">None</p>;
  return (
    <div className="overflow-x-auto rounded border">
      <table className="w-full text-xs">
        <thead className="bg-slate-50"><tr>{head.map(h => <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="px-2 py-1.5 truncate max-w-[200px]">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
