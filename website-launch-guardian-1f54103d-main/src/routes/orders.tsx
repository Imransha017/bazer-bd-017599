import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, Truck, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { useOrders } from "@/lib/orders";
import { formatBDT } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — Bazar" }] }),
  component: OrdersPage,
});

type DBRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  items: Array<{ name: string; qty: number; image?: string }>;
  courier_name: string | null;
  tracking_url: string | null;
  tracking_number: string | null;
};

function OrdersPage() {
  const { orders } = useOrders();
  const { user } = useAuth();
  const [dbOrders, setDbOrders] = useState<DBRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id,order_number,status,total,created_at,items,courier_name,tracking_url,tracking_number").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setDbOrders((data as unknown as DBRow[]) ?? []);
    });
  }, [user]);

  const showDb = !!user && dbOrders.length > 0;
  const empty = !showDb && orders.length === 0;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-3 py-6 md:px-4">
        <h1 className="mb-4 text-xl font-bold">My Orders</h1>
        {empty ? (
          <div className="rounded-md bg-card p-10 text-center shadow-card">
            <Package className="mx-auto size-14 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
            <Link to="/" className="mt-4 inline-block rounded bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Start Shopping</Link>
          </div>
        ) : showDb ? (
          <div className="space-y-3">
            {dbOrders.map((o) => (
              <div key={o.id} className="rounded-md bg-card p-4 shadow-card">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Order #</p>
                    <p className="font-mono text-sm font-semibold">{o.order_number}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${o.status === "cancelled" ? "bg-destructive/10 text-destructive" : o.status === "delivered" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                    {o.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 overflow-x-auto">
                  {o.items.slice(0, 5).map((it, i) => (
                    it.image ? <img key={i} src={it.image} alt="" className="size-12 shrink-0 rounded object-cover" /> : null
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {o.items.length} items</span>
                  <span className="font-bold text-primary">{formatBDT(Number(o.total))}</span>
                </div>
                {(o.courier_name || o.tracking_url) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded border border-primary/30 bg-primary/5 p-2 text-xs">
                    <Truck className="size-3.5 text-primary" />
                    {o.courier_name && <span className="font-semibold">{o.courier_name}</span>}
                    {o.tracking_number && <span className="font-mono text-muted-foreground">#{o.tracking_number}</span>}
                    {o.tracking_url && (
                      <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 rounded bg-primary px-2 py-1 font-bold text-primary-foreground">
                        Track <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link
                key={o.id}
                to="/order/$id"
                params={{ id: o.id }}
                className="block rounded-md bg-card p-4 shadow-card transition hover:shadow-md"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Order ID</p>
                    <p className="font-mono text-sm font-semibold">{o.id}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${o.status === "Cancelled" ? "bg-destructive/10 text-destructive" : o.status === "Delivered" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                    {o.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 overflow-x-auto">
                  {o.items.slice(0, 5).map(({ product: p }) => (
                    <img key={p.id} src={p.image} alt="" className="size-12 shrink-0 rounded object-cover" />
                  ))}
                  {o.items.length > 5 && <span className="text-xs text-muted-foreground">+{o.items.length - 5} more</span>}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()} · {o.items.length} items</span>
                  <span className="font-bold text-primary">{formatBDT(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
