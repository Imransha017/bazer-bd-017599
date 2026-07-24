import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2, Package, MapPin, CreditCard, Printer, Receipt, Download,
  Truck, ExternalLink, User, StickyNote, Store, FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { useOrders } from "@/lib/orders";
import { formatBDT } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { ProductImage } from "@/components/ProductImage";
import { openPrintableInvoice, type InvoiceData } from "@/lib/print-invoice";
import { useSiteSettings } from "@/lib/site-settings";

type DBOrderRow = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string;
  thana: string | null;
  district: string | null;
  items: Array<{ name: string; price: number; qty: number; image?: string | null; variant?: string | null; size?: string | null; color?: string | null; sku?: string | null }>;
  subtotal: number;
  delivery_fee: number;
  discount: number | null;
  coupon_code: string | null;
  total: number;
  payment_method: string;
  payment_type: string | null;
  txn_id: string | null;
  sender_phone: string | null;
  paid_amount: number | null;
  notes: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  vendor_id: string | null;
};

export const Route = createFileRoute("/order/$id")({
  head: () => ({ meta: [{ title: "Order Placed — Bazar" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { getOrder, cancelOrder } = useOrders();
  const order = getOrder(id);
  const settings = useSiteSettings();
  const [dbRows, setDbRows] = useState<DBOrderRow[]>([]);
  const [vendors, setVendors] = useState<Record<string, { store_name: string; slug: string; phone?: string | null; address?: string | null }>>({});

  useEffect(() => {
    if (!order?.dbOrderNumbers?.length || !order.address.phone) return;
    (async () => {
      const rows: DBOrderRow[] = [];
      for (const n of order.dbOrderNumbers!) {
        const { data } = await supabase.rpc("lookup_order", { _order_number: n, _phone: order.address.phone });
        const r = (data as unknown as DBOrderRow[] | null)?.[0];
        if (r) rows.push(r);
      }
      setDbRows(rows);
      const vids = Array.from(new Set(rows.map(r => r.vendor_id).filter(Boolean))) as string[];
      if (vids.length) {
        const { data: vs } = await supabase.from("vendors").select("id,store_name,slug,phone,address").in("id", vids);
        const m: Record<string, { store_name: string; slug: string; phone?: string | null; address?: string | null }> = {};
        for (const v of vs ?? []) m[v.id] = { store_name: v.store_name, slug: v.slug, phone: v.phone, address: v.address };
        setVendors(m);
      }
    })();
  }, [order?.id]);

  const buildInvoice = (row: DBOrderRow): InvoiceData => ({
    order_number: row.order_number,
    created_at: row.created_at,
    status: row.status,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email,
    address: row.address,
    thana: row.thana,
    district: row.district,
    items: row.items,
    subtotal: row.subtotal,
    delivery_fee: row.delivery_fee,
    discount: row.discount,
    coupon_code: row.coupon_code,
    total: row.total,
    payment_method: row.payment_method,
    payment_type: row.payment_type,
    txn_id: row.txn_id,
    sender_phone: row.sender_phone,
    paid_amount: row.paid_amount,
    notes: row.notes,
    courier_name: row.courier_name,
    tracking_number: row.tracking_number,
    tracking_url: row.tracking_url,
    vendor_name: row.vendor_id ? vendors[row.vendor_id]?.store_name ?? null : null,
    site_name: settings.brand.name,
    site_phone: settings.footer.contact.phone,
    site_address: settings.footer.contact.address,
  });

  const downloadAll = () => {
    if (dbRows.length === 0) {
      // fallback: use local order
      openPrintableInvoice({

        order_number: order!.id,
        created_at: new Date(order!.createdAt).toISOString(),
        status: order!.status,
        customer_name: order!.address.fullName,
        customer_phone: order!.address.phone,
        address: order!.address.address,
        thana: order!.address.city,
        district: order!.address.region,
        items: order!.items.map(({ product: p, qty }) => ({ name: p.title.en, price: p.price, qty, image: p.image })),
        subtotal: order!.subtotal,
        delivery_fee: order!.shippingFee,
        total: order!.total,
        payment_method: order!.payment,
        payment_type: order!.walletInfo?.type ?? null,
        txn_id: order!.walletInfo?.transactionId ?? null,
        sender_phone: order!.walletInfo?.senderPhone ?? null,
        paid_amount: order!.walletInfo?.amountPaid ?? null,
        site_name: settings.brand.name,
        site_phone: settings.footer.contact.phone,
        site_address: settings.footer.contact.address,
      });
      return;
    }
    dbRows.forEach((r, i) => setTimeout(() => openPrintableInvoice(buildInvoice(r)), i * 300));
  };

  if (!order) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">Order not found</h1>
          <Link to="/orders" className="mt-4 inline-block text-primary underline">View all orders</Link>
        </div>
      </SiteLayout>
    );
  }

  const totalItemsQty = order.items.reduce((n, it) => n + it.qty, 0);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-3 py-6 md:px-4 space-y-4">
        {/* Success header */}
        <div className="rounded-lg border-2 border-success/30 bg-gradient-to-br from-success/10 to-success/5 p-6 text-center shadow-card">
          <CheckCircle2 className="mx-auto size-14 text-success" />
          <h1 className="mt-2 text-2xl font-bold">Order Placed Successfully!</h1>
          <p className="text-sm text-muted-foreground">
            Order ID: <span className="font-mono font-semibold">{order.id}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleString()}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
            <button
              onClick={downloadAll}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow hover:opacity-90"
            >
              <Download className="size-4" /> Download Invoice
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border-2 border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              <Printer className="size-4" /> Print Receipt
            </button>
          </div>
        </div>

        {/* Customer / Shipping details */}
        <section className="rounded-lg border-2 border-blue-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 border-b border-blue-100 pb-2 text-sm font-bold uppercase tracking-wider text-blue-700">
            <User className="size-4" /> Customer &amp; Shipping Details
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Full Name</div>
              <div className="font-semibold">{order.address.fullName}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Phone</div>
              <div className="font-semibold">{order.address.phone}</div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                <MapPin className="size-3" /> Delivery Address
              </div>
              <div className="font-semibold">
                {order.address.address}
                {order.address.city ? `, ${order.address.city}` : ""}
                {order.address.region ? `, ${order.address.region}` : ""}
              </div>
            </div>
          </div>
        </section>

        {/* Payment details */}
        <section className="rounded-lg border-2 border-purple-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 border-b border-purple-100 pb-2 text-sm font-bold uppercase tracking-wider text-purple-700">
            <CreditCard className="size-4" /> Payment Details
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Method</div>
              <div className="font-semibold capitalize">{order.payment === "cod" ? "Cash on Delivery" : order.payment}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
              <div className="font-semibold">{order.status}</div>
            </div>
            {order.walletInfo?.transactionId && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Transaction ID</div>
                <div className="font-mono font-semibold">{order.walletInfo.transactionId}</div>
              </div>
            )}
            {order.walletInfo?.senderPhone && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Sender Phone</div>
                <div className="font-semibold">{order.walletInfo.senderPhone}</div>
              </div>
            )}
            {order.walletInfo?.amountPaid ? (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">Amount Paid</div>
                <div className="font-semibold text-success">{formatBDT(order.walletInfo.amountPaid)}</div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Vendor details */}
        {dbRows.some(r => r.vendor_id) && (
          <section className="rounded-lg border-2 border-emerald-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 border-b border-emerald-100 pb-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
              <Store className="size-4" /> Vendor / Store Details
            </div>
            <div className="space-y-2 text-sm">
              {dbRows.map((r) => {
                const v = r.vendor_id ? vendors[r.vendor_id] : null;
                if (!v) return null;
                return (
                  <div key={r.order_number} className="rounded border border-emerald-100 bg-emerald-50/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-bold">{v.store_name}</div>
                        {v.phone && <div className="text-xs text-muted-foreground">📞 {v.phone}</div>}
                        {v.address && <div className="text-xs text-muted-foreground">📍 {v.address}</div>}
                      </div>
                      <Link to="/store/$slug" params={{ slug: v.slug }} className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                        Visit Store →
                      </Link>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-muted-foreground">Sub-order #{r.order_number}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Product details */}
        <section className="rounded-lg border-2 border-amber-200 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2 border-b border-amber-100 pb-2 text-sm font-bold uppercase tracking-wider text-amber-700">
            <Package className="size-4" /> Product Details ({totalItemsQty} item{totalItemsQty !== 1 ? "s" : ""})
          </div>
          <div className="divide-y divide-amber-100">
            {order.items.map(({ product: p, qty }) => (
              <div key={p.id} className="flex items-start gap-3 py-3">
                <ProductImage src={p.image} alt={p.title.en} className="size-16 rounded-lg border object-cover" />
                <div className="flex-1 min-w-0">
                  <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 text-sm font-semibold hover:text-primary">
                    {p.title.en}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatBDT(p.price)} × {qty}
                  </p>
                  {p.sku && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono">SKU: {p.sku}</span>
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-primary">{formatBDT(p.price * qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t-2 border-dashed border-amber-200 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Charge</span><span>{order.shippingFee === 0 ? "FREE" : formatBDT(order.shippingFee)}</span></div>
            <div className="mt-1 flex justify-between border-t border-amber-200 pt-2 text-lg font-black">
              <span>Total</span><span className="text-primary">{formatBDT(order.total)}</span>
            </div>
          </div>
        </section>

        {/* Customer note */}
        {dbRows.some(r => r.notes) && (
          <section className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-yellow-800">
              <StickyNote className="size-4" /> Customer Note
            </div>
            {dbRows.map(r => r.notes && <p key={r.order_number} className="whitespace-pre-wrap text-sm text-slate-700">{r.notes}</p>)}
          </section>
        )}

        {/* Tracking */}
        {dbRows.some(r => r.courier_name || r.tracking_number) && (
          <section className="rounded-lg border-2 border-indigo-200 bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2 border-b border-indigo-100 pb-2 text-sm font-bold uppercase tracking-wider text-indigo-700">
              <Truck className="size-4" /> Courier Tracking
            </div>
            <div className="space-y-2">
              {dbRows.map((t) => (
                (t.courier_name || t.tracking_number) && (
                  <div key={t.order_number} className="rounded border bg-indigo-50/40 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">#{t.order_number}</p>
                        <p className="font-semibold capitalize">Status: {t.status}</p>
                      </div>
                      {t.courier_name && <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">{t.courier_name}</span>}
                    </div>
                    {t.tracking_number && <p className="mt-1 text-xs text-muted-foreground">Tracking #: <span className="font-mono">{t.tracking_number}</span></p>}
                    {t.tracking_url && (
                      <a href={t.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                        Track Parcel <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                )
              ))}
            </div>
          </section>
        )}

        {/* Receipt preview */}
        <section className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 shadow-card print:border-0 print:shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700">
              <Receipt className="size-4" /> Receipt Preview
            </div>
            <button
              onClick={downloadAll}
              className="flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground print:hidden"
            >
              <FileText className="size-3.5" /> Download Full Invoice
            </button>
          </div>
          <div id="receipt" className="mx-auto max-w-md rounded border border-dashed bg-white p-4 font-mono text-xs" style={{ color: "#000" }}>
            <div className="text-center">
              <p className="text-base font-bold tracking-wider">{settings.brand.name || "BAZAR"}</p>
              <p className="text-[10px]" style={{ color: "#6b7280" }}>Order Receipt</p>
              {settings.footer.contact.phone && <p className="text-[10px]" style={{ color: "#6b7280" }}>📞 {settings.footer.contact.phone}</p>}
            </div>
            <div className="my-2 border-t border-dashed" />
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Order #</span><span className="font-semibold">{order.id}</span></div>
              <div className="flex justify-between"><span>Date</span><span>{new Date(order.createdAt).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span>Customer</span><span>{order.address.fullName}</span></div>
              <div className="flex justify-between"><span>Phone</span><span>{order.address.phone}</span></div>
              <div className="flex justify-between"><span>Address</span><span className="text-right">{order.address.city}, {order.address.region}</span></div>
              <div className="flex justify-between"><span>Payment</span><span className="capitalize">{order.payment === "cod" ? "COD" : order.payment}</span></div>
            </div>
            <div className="my-2 border-t border-dashed" />
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[11px] font-semibold">
              <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
            </div>
            <div className="my-1 border-t border-dashed" />
            <div className="space-y-1">
              {order.items.map(({ product: p, qty }) => (
                <div key={p.id}>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-2">
                    <span className="truncate">{p.title.en}</span>
                    <span className="text-right">x{qty}</span>
                    <span className="text-right">{formatBDT(p.price * qty)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="my-2 border-t border-dashed" />
            <div className="space-y-0.5">
              <div className="flex justify-between"><span>Items</span><span>{totalItemsQty}</span></div>
              <div className="flex justify-between"><span>Subtotal</span><span>{formatBDT(order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{order.shippingFee === 0 ? "FREE" : formatBDT(order.shippingFee)}</span></div>
            </div>
            <div className="my-2 border-t border-dashed" />
            <div className="flex justify-between text-sm font-bold">
              <span>TOTAL</span><span>{formatBDT(order.total)}</span>
            </div>
            <div className="my-2 border-t border-dashed" />
            <p className="text-center text-[10px]" style={{ color: "#6b7280" }}>Thank you for shopping with {settings.brand.name || "us"}!</p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 print:hidden">
          <Link to="/orders" className="flex-1 rounded-lg border-2 py-2.5 text-center text-sm font-bold">View All Orders</Link>
          <Link to="/" className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground">Continue Shopping</Link>
          {order.status !== "Cancelled" && order.status !== "Delivered" && (
            <button onClick={() => cancelOrder(order.id)} className="rounded-lg border-2 border-destructive px-4 text-sm font-bold text-destructive">
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
