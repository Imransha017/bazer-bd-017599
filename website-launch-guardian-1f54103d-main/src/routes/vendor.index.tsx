import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyVendor, type Vendor } from "@/lib/vendor";
import { DollarSign, ShoppingBag, Package, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/vendor/")({
  component: VendorDashboard,
});

function VendorDashboard() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stats, setStats] = useState({ orders: 0, revenue: 0, pending: 0, products: 0 });
  const [recent, setRecent] = useState<Array<{ id: string; order_number: string; customer_name: string; total: number; status: string; created_at: string }>>([]);

  useEffect(() => {
    (async () => {
      const v = await getMyVendor();
      if (!v) return;
      setVendor(v);
      const [{ data: orders }, { count: prodCount }] = await Promise.all([
        supabase.from("orders").select("id,order_number,customer_name,total,status,created_at").eq("vendor_id", v.id).order("created_at", { ascending: false }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", v.id),
      ]);
      const list = orders ?? [];
      const revenue = list.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
      const pending = list.filter(o => o.status === "pending").length;
      setStats({ orders: list.length, revenue, pending, products: prodCount ?? 0 });
      setRecent(list.slice(0, 10));
    })();
  }, []);

  const commission = vendor ? (stats.revenue * vendor.commission_pct / 100) : 0;
  const payout = stats.revenue - commission;

  const cards = [
    { label: "Total Orders", value: stats.orders, icon: ShoppingBag, color: "bg-blue-500" },
    { label: "Revenue", value: `৳${stats.revenue.toFixed(0)}`, icon: DollarSign, color: "bg-primary" },
    { label: "Pending Orders", value: stats.pending, icon: TrendingUp, color: "bg-amber-500" },
    { label: "Products", value: stats.products, icon: Package, color: "bg-green-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
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

      {vendor && (
        <div className="rounded-lg bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">Earnings Summary</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Gross Revenue</div><div className="font-bold">৳{stats.revenue.toFixed(0)}</div></div>
            <div><div className="text-xs text-muted-foreground">Platform Commission ({vendor.commission_pct}%)</div><div className="font-bold text-destructive">-৳{commission.toFixed(0)}</div></div>
            <div><div className="text-xs text-muted-foreground">Your Payout</div><div className="font-bold text-green-600">৳{payout.toFixed(0)}</div></div>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-bold">Recent Orders</h2>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left">Order #</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(o => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 font-mono">{o.order_number}</td>
                    <td>{o.customer_name}</td>
                    <td><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize">{o.status}</span></td>
                    <td className="text-right font-bold">৳{Number(o.total).toFixed(0)}</td>
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
