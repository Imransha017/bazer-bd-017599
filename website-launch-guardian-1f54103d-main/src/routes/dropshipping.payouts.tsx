import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getMyDropshipper, listMyEarnings, listMyPayouts, requestPayoutRpc, getDropshippingSettings,
  type Dropshipper, type DropshipperPayout, type DropshipperEarning, type DropshippingSettings,
} from "@/lib/dropshipper";
import { toast } from "sonner";
import { Wallet, ArrowDownToLine } from "lucide-react";

export const Route = createFileRoute("/dropshipping/payouts")({
  head: () => ({ meta: [{ title: "Payouts — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [payouts, setPayouts] = useState<DropshipperPayout[]>([]);
  const [earnings, setEarnings] = useState<DropshipperEarning[]>([]);
  const [settings, setSettings] = useState<DropshippingSettings | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bkash");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async (d: Dropshipper) => {
    const [p, e, s] = await Promise.all([listMyPayouts(d.id), listMyEarnings(d.id), getDropshippingSettings()]);
    setPayouts(p); setEarnings(e); setSettings(s);
  };

  useEffect(() => {
    getMyDropshipper().then(async d => {
      setDs(d);
      if (d) { setMethod(d.payout_method); setAccount(d.payout_number); await reload(d); }
    });
  }, []);

  const totals = useMemo(() => {
    const approved = earnings.filter(e => e.status === "approved" || e.status === "paid").reduce((s, e) => s + Number(e.profit), 0);
    const paid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const requested = payouts.filter(p => p.status === "requested" || p.status === "processing").reduce((s, p) => s + Number(p.amount), 0);
    return { approved, paid, requested, available: Math.max(0, approved - paid - requested) };
  }, [earnings, payouts]);

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const min = settings?.min_payout ?? 500;
  const methods = settings?.allowed_payout_methods ?? ["bkash", "nagad", "rocket", "bank"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt) return toast.error("Enter amount");
    setBusy(true);
    try {
      await requestPayoutRpc(amt, method, account.trim());
      toast.success("Payout requested");
      setAmount("");
      await reload(ds);
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-amber-50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-primary"><Wallet className="h-4 w-4" />Wallet</div>
          <p className="mt-2 text-3xl font-extrabold text-primary">৳{totals.available.toFixed(0)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Available to withdraw · minimum ৳{min}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded bg-white/70 p-2"><p className="text-muted-foreground">Approved</p><p className="font-bold">৳{totals.approved.toFixed(0)}</p></div>
            <div className="rounded bg-white/70 p-2"><p className="text-muted-foreground">Pending req.</p><p className="font-bold">৳{totals.requested.toFixed(0)}</p></div>
            <div className="rounded bg-white/70 p-2"><p className="text-muted-foreground">Paid</p><p className="font-bold">৳{totals.paid.toFixed(0)}</p></div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-2 rounded-xl border bg-card p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold"><ArrowDownToLine className="h-4 w-4" />Request payout</h3>
          <label className="block">
            <span className="text-xs font-semibold">Amount (৳)</span>
            <input type="number" min={min} max={totals.available} value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold">Method</span>
            <select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm">
              {methods.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold">Account / Number</span>
            <input value={account} onChange={e => setAccount(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" />
          </label>
          <button disabled={busy || totals.available < min} type="submit" className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {busy ? "Requesting…" : totals.available < min ? `Need ৳${(min - totals.available).toFixed(0)} more` : "Request payout"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold">Payout history</h3>
        {payouts.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No payout requests yet.</p>
        ) : (
          <div className="divide-y">
            {payouts.map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <p className="font-bold">৳{Number(p.amount).toFixed(0)} · {p.method.toUpperCase()}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString()} · {p.account}</p>
                  {p.txn_reference && <p className="text-[10px] text-green-700">Ref: {p.txn_reference}</p>}
                  {p.admin_note && <p className="mt-1 text-[10px] text-muted-foreground">Note: {p.admin_note}</p>}
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-green-100 text-green-700" : p.status === "requested" ? "bg-amber-100 text-amber-700" : p.status === "rejected" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
