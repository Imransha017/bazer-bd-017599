import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { DollarSign, ShoppingBag, Tag, Star, TrendingUp, Users, X, BarChart3 } from "lucide-react";
import { PageHeader } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/analytics")({
  component: Analytics,
});

type Drill =
  | { kind: "day"; date: string; label: string }
  | { kind: "status"; status: string }
  | { kind: "coupon"; code: string }
  | { kind: "rating"; rating: number }
  | { kind: "reviewDay"; date: string; label: string }
  | null;

type Order = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  coupon_code: string | null;
  discount: number | null;
  customer_name: string | null;
};

type Review = { id: string; rating: number; created_at: string };
type Coupon = { code: string; used_count: number; discount_type: string; discount_value: number };

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

function Analytics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [days, setDays] = useState(30);
  const [drill, setDrill] = useState<Drill>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [o, r, c] = await Promise.all([
        supabase.from("orders").select("id,total,status,created_at,coupon_code,discount,customer_name").order("created_at", { ascending: false }),
        supabase.from("reviews").select("id,rating,created_at").order("created_at", { ascending: false }),
        supabase.from("coupons").select("code,used_count,discount_type,discount_value"),
      ]);
      setOrders((o.data ?? []) as Order[]);
      setReviews((r.data ?? []) as Review[]);
      setCoupons((c.data ?? []) as Coupon[]);
      setLoading(false);
    })();
  }, []);

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d;
  }, [days]);

  const recentOrders = useMemo(() => orders.filter(o => new Date(o.created_at) >= cutoff), [orders, cutoff]);
  const recentReviews = useMemo(() => reviews.filter(r => new Date(r.created_at) >= cutoff), [reviews, cutoff]);

  const revenue = recentOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const aov = recentOrders.length ? revenue / recentOrders.length : 0;
  const uniqueCustomers = new Set(recentOrders.map(o => o.customer_name)).size;
  const totalDiscount = recentOrders.reduce((s, o) => s + Number(o.discount ?? 0), 0);

  // Daily sales/orders trend
  const daily = useMemo(() => {
    const map = new Map<string, { date: string; key: string; revenue: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      map.set(k, { date: k.slice(5), key: k, revenue: 0, orders: 0 });
    }
    for (const o of recentOrders) {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      const row = map.get(k);
      if (row) {
        row.orders += 1;
        if (o.status !== "cancelled") row.revenue += Number(o.total);
      }
    }
    return Array.from(map.values());
  }, [recentOrders, days]);

  // Status breakdown
  const statusData = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of recentOrders) m[o.status] = (m[o.status] ?? 0) + 1;
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [recentOrders]);

  // Coupon usage
  const couponData = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of recentOrders) {
      if (o.coupon_code) m.set(o.coupon_code, (m.get(o.coupon_code) ?? 0) + 1);
    }
    const arr = Array.from(m.entries()).map(([code, count]) => ({ code, count }));
    arr.sort((a, b) => b.count - a.count);
    return arr.slice(0, 8);
  }, [recentOrders]);

  // Review trends
  const reviewTrend = useMemo(() => {
    const map = new Map<string, { date: string; key: string; count: number; avg: number; sum: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      map.set(k, { date: k.slice(5), key: k, count: 0, avg: 0, sum: 0 });
    }
    for (const r of recentReviews) {
      const k = new Date(r.created_at).toISOString().slice(0, 10);
      const row = map.get(k);
      if (row) { row.count += 1; row.sum += r.rating; }
    }
    return Array.from(map.values()).map(r => ({ ...r, avg: r.count ? +(r.sum / r.count).toFixed(2) : 0 }));
  }, [recentReviews, days]);

  const ratingDist = useMemo(() => {
    const m = [1, 2, 3, 4, 5].map(n => ({ rating: `${n}★`, count: 0 }));
    for (const r of recentReviews) {
      const i = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      m[i].count += 1;
    }
    return m;
  }, [recentReviews]);

  const avgRating = recentReviews.length
    ? (recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length).toFixed(2)
    : "—";

  const cards = [
    { label: "Revenue", value: `৳${revenue.toFixed(0)}`, icon: DollarSign, color: "bg-primary" },
    { label: "Orders", value: recentOrders.length, icon: ShoppingBag, color: "bg-green-500" },
    { label: "Avg Order Value", value: `৳${aov.toFixed(0)}`, icon: TrendingUp, color: "bg-blue-500" },
    { label: "Customers", value: uniqueCustomers, icon: Users, color: "bg-purple-500" },
    { label: "Coupon Discount", value: `৳${totalDiscount.toFixed(0)}`, icon: Tag, color: "bg-amber-500" },
    { label: "Avg Rating", value: avgRating, icon: Star, color: "bg-yellow-500" },
  ];

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        subtitle={`Overview for the last ${days} days`}
        actions={
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-purple-700"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        }
      />


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="mt-1 text-xl font-bold">{c.value}</div>
              </div>
              <div className={`grid h-9 w-9 place-items-center rounded-lg text-white ${c.color}`}>
                <c.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue & Orders Trend" hint="Click a point to see that day's orders">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={daily}
              onClick={(s: any) => {
                const p = s?.activePayload?.[0]?.payload;
                if (p?.key) setDrill({ kind: "day", date: p.key, label: p.date });
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} name="Revenue (৳)" activeDot={{ r: 6, cursor: "pointer" }} />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" activeDot={{ r: 6, cursor: "pointer" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Order Status Breakdown" hint="Click a slice to filter orders">
          {statusData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                  onClick={(s: any) => s?.name && setDrill({ kind: "status", status: s.name })}
                  cursor="pointer"
                >
                  {statusData.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? "#9ca3af"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Coupon Usage (Top)" hint="Click a bar to see orders with that coupon">
          {couponData.length === 0 ? <Empty msg="No coupons used in this range" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={couponData}
                onClick={(s: any) => {
                  const p = s?.activePayload?.[0]?.payload;
                  if (p?.code) setDrill({ kind: "coupon", code: p.code });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="code" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" name="Times used" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Rating Distribution" hint="Click a bar to see reviews with that rating">
          {recentReviews.length === 0 ? <Empty msg="No reviews in this range" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={ratingDist}
                onClick={(s: any) => {
                  const p = s?.activePayload?.[0]?.payload;
                  if (p?.rating) setDrill({ kind: "rating", rating: parseInt(p.rating, 10) });
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="rating" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#eab308" cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Review Trend (count & avg rating)" hint="Click a point to see that day's reviews" full>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={reviewTrend}
              onClick={(s: any) => {
                const p = s?.activePayload?.[0]?.payload;
                if (p?.key) setDrill({ kind: "reviewDay", date: p.key, label: p.date });
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis yAxisId="left" fontSize={11} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 5]} fontSize={11} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} name="Reviews" activeDot={{ r: 6, cursor: "pointer" }} />
              <Line yAxisId="right" type="monotone" dataKey="avg" stroke="#eab308" strokeWidth={2} name="Avg Rating" activeDot={{ r: 6, cursor: "pointer" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <DrillPanel drill={drill} onClose={() => setDrill(null)} orders={orders} reviews={reviews} />


      <div className="rounded-lg bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">All Coupons</h2>
        {coupons.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No coupons defined</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left">Code</th>
                  <th className="text-left">Discount</th>
                  <th className="text-right">Times Used</th>
                </tr>
              </thead>
              <tbody>
                {coupons.sort((a, b) => b.used_count - a.used_count).map((c) => (
                  <tr key={c.code} className="border-b last:border-0">
                    <td className="py-2 font-mono">{c.code}</td>
                    <td>{c.discount_type === "percent" ? `${c.discount_value}%` : `৳${c.discount_value}`}</td>
                    <td className="text-right font-bold">{c.used_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, children, full, hint }: { title: string; children: React.ReactNode; full?: boolean; hint?: string }) {
  return (
    <div className={`rounded-lg bg-card p-4 shadow-sm ${full ? "lg:col-span-2" : ""}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ msg = "No data" }: { msg?: string }) {
  return <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">{msg}</div>;
}

function DrillPanel({
  drill, onClose, orders, reviews,
}: { drill: Drill; onClose: () => void; orders: Order[]; reviews: Review[] }) {
  if (!drill) return null;

  let title = "";
  let orderRows: Order[] = [];
  let reviewRows: Review[] = [];

  if (drill.kind === "day") {
    title = `Orders on ${drill.label}`;
    orderRows = orders.filter(o => new Date(o.created_at).toISOString().slice(0, 10) === drill.date);
  } else if (drill.kind === "status") {
    title = `Orders — status: ${drill.status}`;
    orderRows = orders.filter(o => o.status === drill.status);
  } else if (drill.kind === "coupon") {
    title = `Orders using coupon: ${drill.code}`;
    orderRows = orders.filter(o => o.coupon_code === drill.code);
  } else if (drill.kind === "rating") {
    title = `Reviews — ${drill.rating}★`;
    reviewRows = reviews.filter(r => Math.round(r.rating) === drill.rating);
  } else if (drill.kind === "reviewDay") {
    title = `Reviews on ${drill.label}`;
    reviewRows = reviews.filter(r => new Date(r.created_at).toISOString().slice(0, 10) === drill.date);
  }

  const totalRevenue = orderRows.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const totalDiscount = orderRows.reduce((s, o) => s + Number(o.discount ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 sm:items-center sm:justify-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-t-xl bg-background shadow-xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-sm font-bold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {orderRows.length > 0 && (
            <>
              <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                <Stat label="Orders" value={orderRows.length} />
                <Stat label="Revenue" value={`৳${totalRevenue.toFixed(0)}`} />
                <Stat label="Discount" value={`৳${totalDiscount.toFixed(0)}`} />
              </div>
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b text-left">
                    <th className="py-2">Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Coupon</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderRows.map(o => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 font-mono">{o.id.slice(0, 8)}</td>
                      <td>{o.customer_name ?? "—"}</td>
                      <td><span className="rounded px-1.5 py-0.5 text-white text-[10px]" style={{ background: STATUS_COLORS[o.status] ?? "#9ca3af" }}>{o.status}</span></td>
                      <td className="font-mono">{o.coupon_code ?? "—"}</td>
                      <td className="text-right font-bold">৳{Number(o.total).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {reviewRows.length > 0 && (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b text-left">
                  <th className="py-2">Review</th>
                  <th>Rating</th>
                  <th className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map(r => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 font-mono">{r.id.slice(0, 8)}</td>
                    <td>{"★".repeat(Math.round(r.rating))}<span className="text-muted-foreground">{"★".repeat(5 - Math.round(r.rating))}</span></td>
                    <td className="text-right">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {orderRows.length === 0 && reviewRows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No matching records.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded bg-muted/50 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
