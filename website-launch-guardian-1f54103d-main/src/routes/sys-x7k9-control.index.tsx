import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, ShoppingBag, TrendingUp, TrendingDown, Clock, Users, Store,
  ArrowUpRight, Sparkles, Rocket, Handshake, DollarSign, Bell, Activity,
  AlertTriangle, CheckCircle2, XCircle, Wallet, Percent,
} from "lucide-react";

export const Route = createFileRoute("/sys-x7k9-control/")({
  component: Dashboard,
});

type Period = "day" | "month" | "year";
type Recent = { id: string; order_number: string; customer_name: string; total: number; status: string; created_at: string };

function Dashboard() {
  const [period, setPeriod] = useState<Period>("day");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [panels, setPanels] = useState({
    customers: 0,
    vendorsTotal: 0, vendorsActive: 0, vendorsPending: 0,
    dropTotal: 0, dropActive: 0, dropPending: 0, dropEarned: 0,
    affTotal: 0, affActive: 0, affPending: 0, affEarned: 0,
    productsTotal: 0, productsActive: 0, productsInactive: 0,
  });

  useEffect(() => {
    (async () => {
      const [
        ordersRes,
        { count: customers },
        vendorsRes,
        dropRes,
        affRes,
        prodRes,
      ] = await Promise.all([
        supabase.from("orders").select("id,order_number,customer_name,total,status,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("vendors").select("status"),
        supabase.from("dropshippers").select("status,total_earned"),
        supabase.from("affiliates").select("status,total_earned"),
        supabase.from("products").select("is_active"),
      ]);
      const v = vendorsRes.data ?? [];
      const d = dropRes.data ?? [];
      const a = affRes.data ?? [];
      const p = prodRes.data ?? [];
      setOrders(ordersRes.data ?? []);
      setPanels({
        customers: customers ?? 0,
        vendorsTotal: v.length,
        vendorsActive: v.filter((x: any) => x.status === "approved").length,
        vendorsPending: v.filter((x: any) => x.status === "pending").length,
        dropTotal: d.length,
        dropActive: d.filter((x: any) => x.status === "approved").length,
        dropPending: d.filter((x: any) => x.status === "pending").length,
        dropEarned: d.reduce((s: number, x: any) => s + Number(x.total_earned || 0), 0),
        affTotal: a.length,
        affActive: a.filter((x: any) => x.status === "approved").length,
        affPending: a.filter((x: any) => x.status === "pending").length,
        affEarned: a.reduce((s: number, x: any) => s + Number(x.total_earned || 0), 0),
        productsTotal: p.length,
        productsActive: p.filter((x: any) => x.is_active).length,
        productsInactive: p.filter((x: any) => !x.is_active).length,
      });
      setLoading(false);
    })();
  }, []);

  const now = new Date();
  const recent = orders.slice(0, 8) as Recent[];

  // Build series based on period
  const series = useMemo(() => buildSeries(orders, period), [orders, period]);

  // Totals for current window (last N buckets)
  const totals = useMemo(() => {
    const window = period === "day" ? 7 : period === "month" ? 30 : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - window);
    let revenue = 0, count = 0, cancelled = 0, delivered = 0;
    for (const o of orders) {
      if (new Date(o.created_at) < cutoff) continue;
      count++;
      if (o.status === "cancelled") cancelled += Number(o.total);
      else revenue += Number(o.total);
      if (o.status === "delivered") delivered += Number(o.total);
    }
    const commissionEst = revenue * 0.08; // rough platform commission estimate
    return { revenue, count, cancelled, delivered, profit: commissionEst, loss: cancelled };
  }, [orders, period]);

  const notifications = useMemo(() => {
    const pending = orders.filter(o => o.status === "pending").length;
    const processing = orders.filter(o => o.status === "processing").length;
    const twelveHrs = new Date(now.getTime() - 12 * 3600 * 1000);
    const fresh = orders.filter(o => new Date(o.created_at) > twelveHrs).length;
    return { pending, processing, fresh };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-900/5 px-3 py-1 text-[11px] font-semibold text-purple-800">
            <Sparkles className="h-3 w-3 text-amber-500" /> Command Center
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-purple-950">Master Dashboard</h1>
          <p className="text-sm text-slate-500">সব প্যানেলের হিসাব — লাইভ, সংখ্যা ও চার্ট সহ</p>
        </div>
        <div className="flex items-center gap-2">
          <NotifBell count={notifications.fresh} label="নতুন অর্ডার" tone="emerald" />
          <NotifBell count={notifications.pending} label="Pending" tone="amber" />
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="মোট আয় (Revenue)" value={`৳${totals.revenue.toFixed(0)}`} raw={totals.revenue} icon={DollarSign}
          tone="emerald" sub={`${totals.count} orders • ${labelFor(period)}`}
        />
        <KpiCard
          label="আনুমানিক লাভ (Profit)" value={`৳${totals.profit.toFixed(0)}`} raw={totals.profit} icon={TrendingUp}
          tone="purple" sub={`Commission ~8%`}
        />
        <KpiCard
          label="ক্ষতি (Cancelled)" value={`৳${totals.loss.toFixed(0)}`} raw={totals.loss} icon={TrendingDown}
          tone="rose" sub={`${orders.filter(o => o.status === "cancelled").length} cancelled orders`}
        />
        <KpiCard
          label="Delivered" value={`৳${totals.delivered.toFixed(0)}`} raw={totals.delivered} icon={CheckCircle2}
          tone="sky" sub={`${orders.filter(o => o.status === "delivered").length} delivered`}
        />
      </div>


      {/* Line chart */}
      <div className="rounded-2xl border border-purple-900/5 bg-gradient-to-br from-white to-purple-50/50 p-5 shadow-sm shadow-purple-900/5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black tracking-tight text-purple-950">Revenue Trend</h2>
            <p className="text-xs text-slate-500">
              {period === "day" ? "গত ১৪ দিনের হিসাব" : period === "month" ? "গত ১২ মাসের হিসাব" : "গত ৫ বছরের হিসাব"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1 text-purple-700"><span className="h-2 w-2 rounded-full bg-purple-700" /> Revenue</span>
            <span className="flex items-center gap-1 text-amber-700"><span className="h-2 w-2 rounded-full bg-amber-500" /> Orders</span>
          </div>
        </div>
        <LineChart data={series} />
      </div>

      {/* Panels grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PanelCard
          title="Customer Panel" icon={Users} to="/sys-x7k9-control/customers"
          gradient="from-blue-600 to-cyan-500"
          stats={[
            { label: "Total Customers", value: panels.customers },
            { label: "Total Orders", value: orders.length },
            { label: "Fresh (12h)", value: notifications.fresh, highlight: notifications.fresh > 0 ? "emerald" : undefined },
          ]}
        />
        <PanelCard
          title="Vendor Panel" icon={Store} to="/sys-x7k9-control/vendors"
          gradient="from-emerald-600 to-teal-500"
          stats={[
            { label: "Active", value: panels.vendorsActive, highlight: "emerald" },
            { label: "Pending", value: panels.vendorsPending, highlight: panels.vendorsPending > 0 ? "amber" : undefined },
            { label: "Total", value: panels.vendorsTotal },
          ]}
        />
        <PanelCard
          title="Dropshipping" icon={Rocket} to="/sys-x7k9-control/dropshippers"
          gradient="from-fuchsia-600 to-pink-500"
          stats={[
            { label: "Active", value: panels.dropActive, highlight: "emerald" },
            { label: "Pending", value: panels.dropPending, highlight: panels.dropPending > 0 ? "amber" : undefined },
            { label: "Earned", value: `৳${panels.dropEarned.toFixed(0)}` },
          ]}
        />
        <PanelCard
          title="Affiliate Panel" icon={Handshake} to="/sys-x7k9-control/affiliates"
          gradient="from-indigo-600 to-violet-500"
          stats={[
            { label: "Active", value: panels.affActive, highlight: "emerald" },
            { label: "Pending", value: panels.affPending, highlight: panels.affPending > 0 ? "amber" : undefined },
            { label: "Paid Out", value: `৳${panels.affEarned.toFixed(0)}` },
          ]}
        />
      </div>

      {/* Status breakdown + Recent orders */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-purple-900/5 bg-white p-5 shadow-sm shadow-purple-900/5">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-900 text-amber-300">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-purple-950">Order Status</h2>
              <p className="text-xs text-slate-500">All orders breakdown</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { key: "pending", label: "Pending", tone: "amber", pulse: true },
              { key: "processing", label: "Processing", tone: "purple" },
              { key: "shipped", label: "Shipped", tone: "indigo" },
              { key: "delivered", label: "Delivered", tone: "emerald" },
              { key: "cancelled", label: "Cancelled", tone: "rose" },
            ].map((s) => {
              const n = orders.filter(o => o.status === s.key).length;
              return <StatusRow key={s.key} label={s.label} count={n} total={orders.length} tone={s.tone} pulse={s.pulse && n > 0} />;
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniBox label="Products" value={panels.productsTotal} icon={Package} />
            <MiniBox label="Active" value={panels.productsActive} icon={CheckCircle2} tone="emerald" />
            <MiniBox label="Inactive" value={panels.productsInactive} icon={XCircle} tone="rose" />
          </div>
        </div>

        <div className="rounded-2xl border border-purple-900/5 bg-white p-5 shadow-sm shadow-purple-900/5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black tracking-tight text-purple-950">Recent Orders</h2>
              <p className="text-xs text-slate-500">নতুন অর্ডার হাইলাইট হচ্ছে</p>
            </div>
            <Link to="/sys-x7k9-control/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-purple-800 hover:text-purple-950">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">No orders yet</p>
          ) : (
            <div className="space-y-1.5">
              {recent.map((o) => {
                const age = now.getTime() - new Date(o.created_at).getTime();
                const isFresh = age < 12 * 3600 * 1000;
                const isPending = o.status === "pending";
                const rowBg = isFresh
                  ? "bg-emerald-50/70 border-emerald-200 animate-pulse-subtle"
                  : isPending
                  ? "bg-amber-50/60 border-amber-200"
                  : o.status === "cancelled"
                  ? "bg-rose-50/40 border-rose-100"
                  : "bg-white border-slate-100";
                return (
                  <div key={o.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${rowBg}`}>
                    {isFresh && <span className="grid h-2 w-2 place-items-center"><span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" /></span>}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-950">{o.order_number}</span>
                        {isFresh && <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">New</span>}
                      </div>
                      <div className="truncate text-xs text-slate-600">{o.customer_name} • {timeAgo(o.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-purple-900">৳{Number(o.total).toFixed(0)}</div>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusColor(o.status)}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------- Sub-components --------- */

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { k: Period; l: string }[] = [
    { k: "day", l: "দৈনিক" },
    { k: "month", l: "মাসিক" },
    { k: "year", l: "বাৎসরিক" },
  ];
  return (
    <div className="inline-flex rounded-xl border border-purple-900/10 bg-white p-1 shadow-sm">
      {opts.map((o) => (
        <button
          key={o.k}
          onClick={() => onChange(o.k)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            value === o.k
              ? "bg-gradient-to-r from-purple-900 to-purple-700 text-amber-100 shadow"
              : "text-slate-600 hover:text-purple-900"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function NotifBell({ count, label, tone }: { count: number; label: string; tone: "emerald" | "amber" }) {
  const bg = tone === "emerald" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div className="relative inline-flex items-center gap-1.5 rounded-xl border border-purple-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
      <Bell className="h-3.5 w-3.5 text-purple-700" />
      {label}
      {count > 0 && (
        <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-black text-white ${bg}`}>
          {count}
        </span>
      )}
      {count > 0 && (
        <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full ${bg}`} />
      )}
    </div>
  );
}

function KpiCard({ label, value, raw, icon: Icon, tone, sub }: {
  label: string; value: string; raw: number; icon: any; tone: "emerald" | "purple" | "rose" | "sky"; sub?: string;
}) {
  const active = raw > 0;
  const activeStyles: Record<string, string> = {
    emerald: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    purple: "bg-gradient-to-br from-purple-900 to-purple-700 text-amber-100",
    rose: "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
    sky: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
  };
  const iconTint: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50",
    purple: "text-purple-700 bg-purple-50",
    rose: "text-rose-600 bg-rose-50",
    sky: "text-sky-600 bg-sky-50",
  };
  const cardCls = active
    ? `${activeStyles[tone]} shadow-md`
    : "bg-white text-slate-700 border border-slate-200/70 shadow-sm";
  const iconCls = active
    ? "bg-white/20 ring-1 ring-white/30"
    : iconTint[tone];
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 transition ${cardCls}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className={`text-[10px] font-bold uppercase tracking-widest ${active ? "opacity-80" : "text-slate-500"}`}>{label}</div>
          <div className={`mt-2 text-2xl font-black ${active ? "" : "text-slate-400"}`}>{value}</div>
          {sub && <div className={`mt-1 text-[11px] ${active ? "opacity-75" : "text-slate-400"}`}>{sub}</div>}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {active && <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />}
    </div>
  );
}


function PanelCard({ title, icon: Icon, to, gradient, stats }: {
  title: string; icon: any; to: string; gradient: string;
  stats: { label: string; value: number | string; highlight?: "emerald" | "amber" | "rose" }[];
}) {
  const hasData = stats.some(s => {
    const n = typeof s.value === "number" ? s.value : parseFloat(String(s.value).replace(/[^\d.-]/g, ""));
    return n > 0;
  });
  return (
    <Link to={to} className="group block rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2 transition ${
        hasData ? `bg-gradient-to-r text-white ${gradient}` : "bg-slate-50 text-slate-600"
      }`}>
        <Icon className="h-4 w-4" />
        <div className="text-xs font-black uppercase tracking-wider">{title}</div>
        <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => {
          const n = typeof s.value === "number" ? s.value : parseFloat(String(s.value).replace(/[^\d.-]/g, "")) || 0;
          const active = n > 0;
          const tone = !active
            ? "bg-slate-50/60 text-slate-400 ring-slate-200/60"
            : s.highlight === "emerald" ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : s.highlight === "amber" ? "bg-amber-50 text-amber-800 ring-amber-200 animate-pulse-subtle"
            : s.highlight === "rose" ? "bg-rose-50 text-rose-800 ring-rose-200"
            : "bg-purple-50 text-purple-800 ring-purple-200";
          return (
            <div key={s.label} className={`rounded-lg px-2 py-2 text-center ring-1 ${tone}`}>
              <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">{s.label}</div>
              <div className="mt-0.5 text-sm font-black">{s.value}</div>
            </div>
          );
        })}
      </div>
    </Link>
  );
}


function StatusRow({ label, count, total, tone, pulse }: {
  label: string; count: number; total: number; tone: string; pulse?: boolean;
}) {
  const pct = total ? (count / total) * 100 : 0;
  const bg: Record<string, string> = {
    amber: "bg-amber-500", purple: "bg-purple-600", indigo: "bg-indigo-500",
    emerald: "bg-emerald-500", rose: "bg-rose-500",
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-semibold text-slate-700 ${pulse ? "animate-pulse-subtle" : ""}`}>
          {pulse && <span className={`h-1.5 w-1.5 animate-ping rounded-full ${bg[tone]}`} />}
          {label}
        </span>
        <span className="font-black text-purple-950">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${bg[tone]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniBox({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone?: "emerald" | "rose" }) {
  const c = tone === "emerald" ? "text-emerald-700 bg-emerald-50"
    : tone === "rose" ? "text-rose-700 bg-rose-50"
    : "text-purple-800 bg-purple-50";
  return (
    <div className={`rounded-lg p-2 ${c}`}>
      <Icon className="h-3.5 w-3.5" />
      <div className="mt-1 text-lg font-black">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
}

function LineChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  if (!data.length) return <div className="py-16 text-center text-sm text-slate-400">No data</div>;
  const W = 800, H = 200, PAD = 30;
  const maxR = Math.max(...data.map(d => d.revenue), 1);
  const maxO = Math.max(...data.map(d => d.orders), 1);
  const step = data.length > 1 ? (W - PAD * 2) / (data.length - 1) : 0;

  const rPoints = data.map((d, i) => `${PAD + i * step},${H - PAD - (d.revenue / maxR) * (H - PAD * 2)}`).join(" ");
  const oPoints = data.map((d, i) => `${PAD + i * step},${H - PAD - (d.orders / maxO) * (H - PAD * 2)}`).join(" ");
  const rArea = `${PAD},${H - PAD} ${rPoints} ${PAD + (data.length - 1) * step},${H - PAD}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-56 w-full min-w-[500px]">
        <defs>
          <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7e22ce" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7e22ce" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={PAD + (H - PAD * 2) * f} y2={PAD + (H - PAD * 2) * f} stroke="#e2e8f0" strokeDasharray="3 3" />
        ))}
        <polygon points={rArea} fill="url(#revGrad)" />
        <polyline points={rPoints} fill="none" stroke="#7e22ce" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={oPoints} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={PAD + i * step} cy={H - PAD - (d.revenue / maxR) * (H - PAD * 2)} r="3" fill="#7e22ce" />
            <text x={PAD + i * step} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748b">{d.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* --------- Helpers --------- */

function buildSeries(orders: any[], period: Period) {
  const now = new Date();
  const buckets: { key: string; label: string; revenue: number; orders: number }[] = [];

  if (period === "day") {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      buckets.push({ key, label: key.slice(5), revenue: 0, orders: 0 });
    }
    for (const o of orders) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const b = buckets.find(x => x.key === key);
      if (b) { b.orders++; if (o.status !== "cancelled") b.revenue += Number(o.total); }
    }
  } else if (period === "month") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: d.toLocaleString("en", { month: "short" }), revenue: 0, orders: 0 });
    }
    for (const o of orders) {
      const dt = new Date(o.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.find(x => x.key === key);
      if (b) { b.orders++; if (o.status !== "cancelled") b.revenue += Number(o.total); }
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const y = now.getFullYear() - i;
      buckets.push({ key: String(y), label: String(y), revenue: 0, orders: 0 });
    }
    for (const o of orders) {
      const key = String(new Date(o.created_at).getFullYear());
      const b = buckets.find(x => x.key === key);
      if (b) { b.orders++; if (o.status !== "cancelled") b.revenue += Number(o.total); }
    }
  }
  return buckets;
}

function labelFor(p: Period) {
  return p === "day" ? "last 7 days" : p === "month" ? "last 30 days" : "last 12 months";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusColor(s: string) {
  switch (s) {
    case "pending": return "bg-amber-100 text-amber-800";
    case "processing": return "bg-purple-100 text-purple-800";
    case "shipped": return "bg-indigo-100 text-indigo-800";
    case "delivered": return "bg-emerald-100 text-emerald-800";
    case "cancelled": return "bg-rose-100 text-rose-800";
    default: return "bg-slate-100 text-slate-700";
  }
}
