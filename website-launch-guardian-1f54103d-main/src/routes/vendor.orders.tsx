import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyVendor } from "@/lib/vendor";
import { toast } from "sonner";
import { User, Phone, Mail, MapPin, CreditCard, Package, Truck, StickyNote, Clock, Hash, X, ShoppingBag, Printer } from "lucide-react";
import { openPrintableInvoice } from "@/lib/print-invoice";

export const Route = createFileRoute("/vendor/orders")({
  component: VendorOrders,
});

type Item = { name?: string; qty: number; price: number; image?: string; sku?: string; size?: string; color?: string; variant?: string };
type Order = {
  id: string; order_number: string;
  customer_name: string; customer_phone: string; customer_email: string | null;
  address: string; district: string | null; thana: string | null;
  items: Item[];
  subtotal: number; delivery_fee: number; total: number;
  discount: number | null; coupon_code: string | null;
  payment_method: string; payment_type: string | null;
  txn_id: string | null; sender_phone: string | null; paid_amount: number | null;
  status: string; notes: string | null;
  courier_name: string | null; tracking_number: string | null; tracking_url: string | null;
  created_at: string; updated_at: string | null;
};

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-sky-100 text-sky-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
};

function VendorOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const v = await getMyVendor();
    if (!v) { setLoading(false); return; }
    const { data } = await supabase.from("orders").select("*").eq("vendor_id", v.id).order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as Order[]);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order status updated");
    setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
    if (open?.id === id) setOpen({ ...open, status });
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded border bg-card px-3 py-1.5 text-sm">
          <option value="all">All ({orders.length})</option>
          {STATUSES.map(s => <option key={s} value={s}>{s} ({orders.filter(o => o.status === s).length})</option>)}
        </select>
      </div>

      <div className="rounded-lg bg-card shadow-sm">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No orders</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="p-3 text-left">Order #</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Items</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{o.order_number}</td>
                  <td>{o.customer_name}<br /><span className="text-xs text-muted-foreground">{o.customer_phone}</span></td>
                  <td>{o.items?.length ?? 0} items</td>
                  <td className="text-right font-bold">৳{Number(o.total).toFixed(0)}</td>
                  <td className="text-center">
                    <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} className={`rounded border px-1.5 py-0.5 text-[10px] capitalize ${STATUS_COLORS[o.status] ?? "bg-background"}`}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setOpen(o)} className="rounded border px-2 py-1 text-xs hover:bg-muted">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && <OrderDetailModal order={open} onClose={() => setOpen(null)} onUpdateStatus={(s) => updateStatus(open.id, s)} />}
    </div>
  );
}

function OrderDetailModal({ order, onClose, onUpdateStatus }: { order: Order; onClose: () => void; onUpdateStatus: (status: string) => void }) {
  const itemsTotal = order.items.reduce((s, it) => s + Number(it.price) * Number(it.qty), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="my-6 w-full max-w-3xl rounded-xl bg-background shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 rounded-t-xl border-b bg-gradient-to-r from-primary/10 to-amber-50 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="truncate text-lg font-extrabold">Order {order.order_number}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] ?? "bg-muted"}`}>{order.status}</span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => openPrintableInvoice(order as any)} className="flex items-center gap-1 rounded border border-primary/40 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/5"><Printer className="h-3 w-3" /> Invoice</button>
            <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-3">
          {/* Left: Items + summary */}
          <div className="md:col-span-2 space-y-4">
            <Section icon={Package} title={`Line items (${order.items.length})`}>
              <div className="divide-y divide-border">
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5">
                    {it.image && <img src={it.image} alt="" className="h-14 w-14 rounded-lg border object-cover" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{it.name || "Item"}</div>
                      <div className="text-xs text-muted-foreground">৳{Number(it.price).toFixed(0)} × {it.qty}</div>
                      {(it.variant || it.size || it.color || it.sku) && (
                        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                          {it.variant && <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{it.variant}</span>}
                          {it.size && <span className="rounded bg-muted px-1.5 py-0.5">Size: <b>{it.size}</b></span>}
                          {it.color && <span className="rounded bg-muted px-1.5 py-0.5">Color: <b>{it.color}</b></span>}
                          {it.sku && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">SKU: {it.sku}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-bold">৳{(Number(it.price) * Number(it.qty)).toFixed(0)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                <Row k="Items subtotal" v={`৳${itemsTotal.toFixed(0)}`} />
                <Row k="Subtotal" v={`৳${Number(order.subtotal).toFixed(0)}`} />
                {Number(order.discount ?? 0) > 0 && <Row k={`Discount${order.coupon_code ? " (" + order.coupon_code + ")" : ""}`} v={`− ৳${Number(order.discount).toFixed(0)}`} />}
                <Row k="Delivery" v={`৳${Number(order.delivery_fee).toFixed(0)}`} />
                <div className="mt-1 flex justify-between border-t pt-2 text-base font-black text-primary">
                  <span>Total</span><span>৳{Number(order.total).toFixed(0)}</span>
                </div>
              </div>
            </Section>

            {order.notes && (
              <Section icon={StickyNote} title="Customer note">
                <p className="whitespace-pre-wrap rounded-md bg-amber-50 p-2.5 text-sm text-slate-700">{order.notes}</p>
              </Section>
            )}

            <Section icon={Truck} title="Courier tracking">
              {order.courier_name || order.tracking_number || order.tracking_url ? (
                <div className="space-y-1 text-sm">
                  {order.courier_name && <Row k="Courier" v={order.courier_name} />}
                  {order.tracking_number && <Row k="Tracking #" v={order.tracking_number} />}
                  {order.tracking_url && <div className="pt-1"><a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Open tracking link →</a></div>}
                </div>
              ) : <p className="text-xs text-muted-foreground">No tracking added yet.</p>}
            </Section>
          </div>

          {/* Right: Customer + payment + status */}
          <div className="space-y-4">
            <Section icon={User} title="Customer">
              <div className="space-y-1.5 text-sm">
                <div className="font-bold">{order.customer_name}</div>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{order.customer_phone}</div>
                {order.customer_email && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" />{order.customer_email}</div>}
                <div className="flex items-start gap-1.5 pt-1 text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{order.address}{order.thana ? ", " + order.thana : ""}{order.district ? ", " + order.district : ""}</span>
                </div>
              </div>
            </Section>

            <Section icon={CreditCard} title="Payment">
              <div className="space-y-1 text-sm">
                <Row k="Method" v={`${order.payment_method.toUpperCase()}${order.payment_type ? " — " + order.payment_type : ""}`} />
                {order.txn_id && <Row k="Transaction ID" v={order.txn_id} />}
                {order.sender_phone && <Row k="Sender phone" v={order.sender_phone} />}
                {Number(order.paid_amount ?? 0) > 0 && <Row k="Paid" v={`৳${Number(order.paid_amount).toFixed(0)}`} />}
              </div>
            </Section>

            <Section icon={Hash} title="Update status">
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(s)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize transition ${order.status === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />{title}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold">{v}</span>
    </div>
  );
}
