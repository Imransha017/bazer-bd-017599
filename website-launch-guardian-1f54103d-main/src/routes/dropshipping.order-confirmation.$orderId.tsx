import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getOrderById, getMyDropshipper, type Dropshipper } from "@/lib/dropshipper";
import { CheckCircle2, Printer, Copy, Package, MapPin, Phone, Mail, CreditCard, ArrowLeft, Store, ClipboardCopy, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dropshipping/order-confirmation/$orderId")({
  head: () => ({ meta: [{ title: "Order Confirmation — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: ConfirmPage,
});

type Order = {
  id: string; order_number: string; created_at: string; status: string;
  customer_name: string; customer_phone: string; customer_email: string | null;
  address: string; district: string | null; thana: string | null;
  items: Array<{ id: string; name: string; price: number; qty: number; image?: string; sku?: string; size?: string; color?: string; variant?: string }>;
  subtotal: number; delivery_fee: number; total: number;
  payment_method: string; payment_type: string | null; txn_id: string | null;
  sender_phone: string | null; paid_amount: number | null; notes: string | null;
  dropshipper_code: string | null;
};

function ConfirmPage() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [ds, setDs] = useState<Dropshipper | null>(null);

  useEffect(() => {
    (async () => {
      const [o, d] = await Promise.all([getOrderById(orderId), getMyDropshipper()]);
      setOrder(o as Order | null);
      setDs(d);
    })();
  }, [orderId]);

  if (order === undefined) return <div className="p-10 text-center text-sm text-muted-foreground">Loading order…</div>;
  if (!order) return <div className="p-10 text-center"><p className="text-lg font-bold">Order not found</p><Link to="/dropshipping/products" className="mt-3 inline-block text-sm text-primary">← Back to products</Link></div>;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };
  const download = () => window.print();

  const itemsJson = () => JSON.stringify({ order_id: order.id, order_number: order.order_number, items: order.items }, null, 2);
  const copyItemsJson = async () => {
    try { await navigator.clipboard.writeText(itemsJson()); toast.success(`Items JSON copied (${order.items.length} items)`); }
    catch { toast.error("Copy failed"); }
  };
  const downloadItemsJson = () => {
    const blob = new Blob([itemsJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `order-${order.order_number || order.id}-items.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Items JSON downloaded");
  };
  const copyFullJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(order, null, 2)); toast.success("Full order JSON copied"); }
    catch { toast.error("Copy failed"); }
  };
  const downloadFullJson = () => {
    const blob = new Blob([JSON.stringify(order, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `order-${order.order_number || order.id}-full.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Full order JSON downloaded");
  };


  const dateStr = new Date(order.created_at).toLocaleString();
  const payLabel: Record<string, string> = { cod: "Cash on Delivery", bkash: "bKash", nagad: "Nagad", rocket: "Rocket" };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-background py-6 dark:from-emerald-950/20">
        <div className="mx-auto max-w-3xl px-3">
          <div className="no-print mb-3 flex items-center justify-between">
            <Link to="/dropshipping/products" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-3 w-3" />Back to products</Link>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyItemsJson} className="inline-flex items-center gap-1 rounded-md border border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"><ClipboardCopy className="h-3 w-3" />Copy items JSON</button>
              <button onClick={copyFullJson} className="inline-flex items-center gap-1 rounded-md border border-purple-500 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100"><ClipboardCopy className="h-3 w-3" />Copy full order JSON</button>
              <button onClick={downloadItemsJson} className="inline-flex items-center gap-1 rounded-md border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"><Download className="h-3 w-3" />Download JSON</button>
              <button onClick={downloadFullJson} className="inline-flex items-center gap-1 rounded-md border border-fuchsia-500 bg-fuchsia-50 px-3 py-1.5 text-xs font-bold text-fuchsia-700 hover:bg-fuchsia-100"><Download className="h-3 w-3" />Download full order JSON</button>
              <button onClick={copyLink} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-bold hover:bg-muted"><Copy className="h-3 w-3" />Copy link</button>
              <button onClick={download} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"><Printer className="h-3 w-3" />Download / Print</button>
            </div>
          </div>

          <div className="print-page overflow-hidden rounded-2xl border bg-card shadow-lg">
            {/* Success banner */}
            <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-6 text-center text-white">
              <CheckCircle2 className="mx-auto h-14 w-14" />
              <h1 className="mt-2 text-2xl font-extrabold">অর্ডার সফলভাবে জমা হয়েছে!</h1>
              <p className="mt-1 text-sm opacity-90">Your customer's order has been submitted successfully.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur">
                Order # <span className="font-extrabold tracking-wide">{order.order_number}</span>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div><p className="text-muted-foreground">Order date</p><p className="font-bold">{dateStr}</p></div>
                <div><p className="text-muted-foreground">Status</p><p className="font-bold capitalize">{order.status || "pending"}</p></div>
                <div><p className="text-muted-foreground">Payment</p><p className="font-bold">{payLabel[order.payment_method] || order.payment_method}</p></div>
                <div><p className="text-muted-foreground">Attributed to</p><p className="font-bold text-primary">Dropshipper</p></div>
              </div>

              {/* Dropshipper store */}
              {ds && (
                <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                      {ds.logo_url ? <img src={ds.logo_url} alt="" className="h-full w-full rounded-full object-cover" /> : <Store className="h-6 w-6 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sold via dropshipper</p>
                      <p className="truncate text-sm font-extrabold">{ds.store_name}</p>
                      <p className="text-[11px] text-muted-foreground">Store code: <span className="font-mono">{ds.code}</span> · {ds.phone}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Customer & shipping */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer</p>
                  <p className="text-sm font-bold">{order.customer_name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{order.customer_phone}</p>
                  {order.customer_email && <p className="mt-0.5 flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{order.customer_email}</p>}
                </div>
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Delivery address</p>
                  <p className="flex items-start gap-1 text-xs"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span>{order.address}{order.thana ? `, ${order.thana}` : ""}{order.district ? `, ${order.district}` : ""}</span></p>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Items ({order.items.length})</p>
                <div className="overflow-hidden rounded-xl border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left">
                      <tr><th className="p-2">Product</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Total</th></tr>
                    </thead>
                    <tbody>
                      {order.items.map((it, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {it.image ? <img src={it.image} alt="" className="h-10 w-10 rounded object-cover" /> : <Package className="h-8 w-8 text-muted-foreground" />}
                              <div className="min-w-0">
                                <p className="line-clamp-2 font-medium">{it.name}</p>
                                {(it.variant || it.size || it.color || it.sku) && (
                                  <div className="mt-0.5 flex flex-wrap gap-1 text-[10px]">
                                    {it.variant && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{it.variant}</span>}
                                    {it.size && <span className="rounded bg-muted px-1.5 py-0.5">Size: <b>{it.size}</b></span>}
                                    {it.color && <span className="rounded bg-muted px-1.5 py-0.5">Color: <b>{it.color}</b></span>}
                                    {it.sku && <span className="rounded bg-muted px-1.5 py-0.5 font-mono">SKU: {it.sku}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-right">৳{Number(it.price).toFixed(0)}</td>
                          <td className="p-2 text-right">{it.qty}</td>
                          <td className="p-2 text-right font-bold">৳{(Number(it.price) * it.qty).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment details */}
              {order.payment_method !== "cod" && (
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" />Payment details</p>
                  <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <div><p className="text-muted-foreground">Type</p><p className="font-bold capitalize">{order.payment_type || "-"}</p></div>
                    <div><p className="text-muted-foreground">Txn ID</p><p className="font-mono font-bold">{order.txn_id || "-"}</p></div>
                    <div><p className="text-muted-foreground">Sender</p><p className="font-bold">{order.sender_phone || "-"}</p></div>
                    <div><p className="text-muted-foreground">Paid</p><p className="font-bold">৳{Number(order.paid_amount || 0).toFixed(0)}</p></div>
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>৳{Number(order.subtotal).toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Delivery</span><span>৳{Number(order.delivery_fee).toFixed(0)}</span></div>
                <div className="flex justify-between border-t pt-1 text-base font-extrabold text-primary"><span>Total</span><span>৳{Number(order.total).toFixed(0)}</span></div>
              </div>

              {order.notes && (
                <div className="rounded-xl border bg-amber-50/50 p-3 text-xs">
                  <p className="font-bold">Notes</p>
                  <p className="mt-0.5 whitespace-pre-line">{order.notes}</p>
                </div>
              )}

              <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-3 text-center text-xs">
                <p className="font-bold text-emerald-700">Thank you for your order 🎉</p>
                <p className="mt-1 text-muted-foreground">We will confirm and dispatch your parcel soon. Please keep this page/PDF as your receipt.</p>
              </div>
            </div>
          </div>

          <div className="no-print mt-4 flex justify-center gap-3">
            <Link to="/dropshipping/products" className="rounded-md border px-4 py-2 text-xs font-bold hover:bg-muted">Place another order</Link>
            <Link to="/dropshipping/orders" className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">View my orders</Link>
          </div>
        </div>
      </div>
    </>
  );
}
