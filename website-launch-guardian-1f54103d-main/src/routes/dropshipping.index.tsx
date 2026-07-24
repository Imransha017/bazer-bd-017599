import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getMyDropshipper, listMyEarnings, listMyPayouts, listMyImports,
  buildDsLink, getDropshippingSettings, listAnnouncements,
  type Dropshipper, type DropshipperEarning, type DropshipperPayout, type DropshipperProduct,
  type DropshippingSettings, type DropshippingAnnouncement,
} from "@/lib/dropshipper";
import { supabase } from "@/integrations/supabase/client";
import {
  DollarSign, ShoppingBag, Wallet, Clock, TrendingUp, Copy, Share2,
  Package, MousePointerClick, CheckCircle2, Megaphone, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/dropshipping/")({
  head: () => ({ meta: [{ title: "Overview — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: Overview,
});

type OrderRow = { id: string; status: string; total: number; created_at: string; items: Array<{ id?: string; name?: string; qty?: number; price?: number }> };

function Overview() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [earnings, setEarnings] = useState<DropshipperEarning[]>([]);
  const [payouts, setPayouts] = useState<DropshipperPayout[]>([]);
  const [imports, setImports] = useState<DropshipperProduct[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [clicks, setClicks] = useState<number>(0);
  const [settings, setSettings] = useState<DropshippingSettings | null>(null);
  const [announcements, setAnnouncements] = useState<DropshippingAnnouncement[]>([]);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    getMyDropshipper().then(async d => {
      setDs(d);
      if (!d) return;
      const [e, p, im, s, an] = await Promise.all([
        listMyEarnings(d.id),
        listMyPayouts(d.id),
        listMyImports(d.id),
        getDropshippingSettings(),
        listAnnouncements(),
      ]);
      setEarnings(e); setPayouts(p); setImports(im); setSettings(s); setAnnouncements(an);

      const { data: os } = await supabase.from("orders")
        .select("id,status,total,created_at,items")
        .eq("dropshipper_id", d.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setOrders((os as unknown as OrderRow[]) ?? []);

      const { count } = await supabase.from("dropshipper_clicks")
        .select("id", { count: "exact", head: true })
        .eq("dropshipper_id", d.id);
      setClicks(count ?? 0);
    });
  }, []);

  const totals = useMemo(() => {
    const pending = earnings.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.profit), 0);
    const approved = earnings.filter(e => e.status === "approved").reduce((s, e) => s + Number(e.profit), 0);
    const paid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const requested = payouts.filter(p => p.status === "requested" || p.status === "processing").reduce((s, p) => s + Number(p.amount), 0);
    const available = Math.max(0, approved - paid - requested);
    const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
    return { pending, approved, paid, requested, available, revenue };
  }, [earnings, payouts, orders]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: range }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (range - 1 - i));
      return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), revenue: 0, profit: 0, orders: 0 };
    });
    const map = new Map(days.map(d => [d.key, d]));
    for (const o of orders) {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      const row = map.get(k); if (row) { row.revenue += Number(o.total); row.orders += 1; }
    }
    for (const e of earnings) {
      const k = new Date(e.created_at).toISOString().slice(0, 10);
      const row = map.get(k); if (row) row.profit += Number(e.profit);
    }
    return days;
  }, [orders, earnings, range]);

  const statusData = useMemo(() => {
    const s: Record<string, number> = {};
    for (const o of orders) s[o.status] = (s[o.status] || 0) + 1;
    return Object.entries(s).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const m = new Map<string, { name: string; profit: number; qty: number }>();
    for (const e of earnings) {
      const key = e.product_id || "unknown";
      const cur = m.get(key) || { name: key.slice(0, 8), profit: 0, qty: 0 };
      cur.profit += Number(e.profit); cur.qty += e.qty;
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.profit - a.profit).slice(0, 6);
  }, [earnings]);

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const shareLink = buildDsLink(ds.store_slug);
  const conv = clicks > 0 ? ((orders.length / clicks) * 100) : 0;

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareLink); toast.success("Link copied"); } catch { toast.error("Copy failed"); }
  };
  const shareWa = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my store: ${shareLink}`)}`, "_blank");
  };

  const activeAnnouncements = announcements.filter(a => a.is_active
    && (!a.starts_at || new Date(a.starts_at) <= new Date())
    && (!a.ends_at || new Date(a.ends_at) >= new Date()));

  const check = (ok: boolean, label: string, to?: string) => (
    <li className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${ok ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-white"}`}>
      <CheckCircle2 className={`h-4 w-4 ${ok ? "text-green-600" : "text-slate-300"}`} />
      <span className="flex-1">{label}</span>
      {!ok && to && <Link to={to as never} className="text-[10px] font-bold text-primary hover:underline">Do it</Link>}
    </li>
  );

  return (
    <div className="grid gap-4">
      {settings && !settings.is_enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          The dropshipping program is currently paused by admin. You can still browse your store, but new payouts are disabled.
        </div>
      )}

      {activeAnnouncements.length > 0 && (
        <div className="space-y-2">
          {activeAnnouncements.map(a => (
            <div key={a.id} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
              a.tone === "success" ? "border-green-200 bg-green-50 text-green-900" :
              a.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" :
              a.tone === "danger" ? "border-red-200 bg-red-50 text-red-900" :
              "border-blue-200 bg-blue-50 text-blue-900"
            }`}>
              <Megaphone className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-bold">{a.title}</p>
                {a.body_md && <p className="mt-0.5 whitespace-pre-line text-xs opacity-90">{a.body_md}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={ShoppingBag} label="Orders" value={orders.length} color="blue" />
        <StatCard icon={TrendingUp} label="Revenue" value={`৳${totals.revenue.toFixed(0)}`} color="indigo" />
        <StatCard icon={DollarSign} label="Total profit" value={`৳${Number(ds.total_earned).toFixed(0)}`} color="green" />
        <StatCard icon={Clock} label="Pending" value={`৳${totals.pending.toFixed(0)}`} color="amber" />
        <StatCard icon={Wallet} label="Available" value={`৳${totals.available.toFixed(0)}`} color="primary" />
        <StatCard icon={MousePointerClick} label={`Clicks · ${conv.toFixed(1)}%`} value={clicks} color="pink" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Sales & profit trend</h3>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map(r => (
                <button key={r} onClick={() => setRange(r)} className={`rounded px-2 py-0.5 text-[11px] font-bold ${range === r ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{r}d</button>
              ))}
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} name="Revenue" dot={false} />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-bold">Order status</h3>
          {statusData.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No orders yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={70} label={{ fontSize: 10 }}>
                    {statusData.map((_, i) => <Cell key={i} fill={["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"][i % 5]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 lg:col-span-2">
          <h3 className="mb-2 text-sm font-bold">Top products by profit</h3>
          {topProducts.length === 0 ? (
            <p className="py-10 text-center text-xs text-muted-foreground">No product sales yet</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="profit" fill="#10b981" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4" />Setup checklist</h3>
          <ul className="space-y-1.5">
            {check(!!ds.logo_url, "Upload store logo", "/dropshipping/settings")}
            {check(imports.length > 0, "Import your first product", "/dropshipping/products")}
            {check(orders.length > 0, "Get your first order")}
            {check(clicks > 0, "Share your store link")}
            {check(!!ds.payout_number, "Set payout details", "/dropshipping/settings")}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border bg-gradient-to-r from-primary/10 to-amber-50 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Share2 className="h-4 w-4" />Your share link</h3>
        <div className="flex flex-wrap gap-2">
          <input readOnly value={shareLink} className="min-w-[240px] flex-1 rounded-md border bg-white/70 px-3 py-2 text-xs font-mono" />
          <button onClick={copy} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Copy className="h-3.5 w-3.5" />Copy</button>
          <button onClick={shareWa} className="rounded-md bg-green-600 px-3 py-2 text-xs font-bold text-white">WhatsApp</button>
          <Link to="/dropshipping/marketing" className="inline-flex items-center gap-1 rounded-md border border-primary bg-white px-3 py-2 text-xs font-bold text-primary">Marketing tools <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-1.5"><Package className="h-4 w-4" />Recent orders</h3>
          <Link to="/dropshipping/orders" className="text-[11px] font-bold text-primary hover:underline">View all →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No orders yet. Share your store to start earning!</p>
        ) : (
          <div className="divide-y">
            {orders.slice(0, 6).map(o => (
              <div key={o.id} className="flex items-center justify-between py-2 text-xs">
                <div>
                  <p className="font-mono text-[11px]">{o.id.slice(0, 8)}…</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(o.created_at).toLocaleString()} · {o.items?.length ?? 0} item(s)</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">৳{Number(o.total).toFixed(0)}</p>
                  <span className={`text-[10px] font-bold capitalize ${
                    o.status === "delivered" ? "text-green-600" :
                    o.status === "cancelled" ? "text-red-600" :
                    "text-amber-600"
                  }`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof DollarSign; label: string; value: string | number; color: string }) {
  const bg = color === "green" ? "bg-green-50 text-green-700"
    : color === "amber" ? "bg-amber-50 text-amber-700"
    : color === "blue" ? "bg-blue-50 text-blue-700"
    : color === "indigo" ? "bg-indigo-50 text-indigo-700"
    : color === "pink" ? "bg-pink-50 text-pink-700"
    : "bg-primary/10 text-primary";
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}><Icon className="h-4 w-4" /></div>
      <p className="mt-2 text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
    </div>
  );
}
