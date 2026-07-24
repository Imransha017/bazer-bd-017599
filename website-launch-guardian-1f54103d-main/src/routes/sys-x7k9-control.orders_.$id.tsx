import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, Store, User, Phone, MapPin, CreditCard, Package, Truck, Handshake, StickyNote, Mail, Clock, Printer } from "lucide-react";
import type { DBOrder } from "@/lib/admin-api";
import { PageHeader, Surface, PrimaryButton, GhostButton, SelectInput, Badge } from "@/lib/admin-ui";
import { AuditLog } from "@/components/AuditLog";
import { openPrintableInvoice } from "@/lib/print-invoice";
import { InvoiceHistory } from "@/components/InvoiceHistory";
import { logInvoiceEvent } from "@/lib/invoice-history";

export const Route = createFileRoute("/sys-x7k9-control/orders_/$id")({
  component: OrderDetails,
});

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const STATUS_TONE: Record<string, "pink" | "sky" | "indigo" | "rose"> = {
  pending: "pink", processing: "sky", shipped: "indigo", delivered: "sky", cancelled: "rose",
};

type OrderRow = DBOrder & {
  vendor_id?: string | null;
  courier_name?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  discount?: number | null;
  coupon_code?: string | null;
  dropshipper_id?: string | null;
  dropshipper_code?: string | null;
  affiliate_id?: string | null;
  affiliate_code?: string | null;
};

type Partner = { kind: "dropshipper" | "affiliate"; code: string | null; name: string | null; phone: string | null; email: string | null; store?: string | null; store_slug?: string | null };

function OrderDetails() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [vendor, setVendor] = useState<{ id: string; store_name: string; slug: string } | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courier, setCourier] = useState("");
  const [trackNum, setTrackNum] = useState("");
  const [trackUrl, setTrackUrl] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    if (error) { toast.error(error.message); setLoading(false); return; }
    const o = data as unknown as OrderRow | null;
    setOrder(o);
    if (o) {
      setCourier(o.courier_name ?? "");
      setTrackNum(o.tracking_number ?? "");
      setTrackUrl(o.tracking_url ?? "");
      if (o.vendor_id) {
        const { data: v } = await supabase.from("vendors").select("id,store_name,slug").eq("id", o.vendor_id).maybeSingle();
        setVendor(v ?? null);
      } else setVendor(null);

      // Dropshipper / Affiliate attribution
      if (o.dropshipper_id) {
        const { data: ds } = await supabase.from("dropshippers").select("id,code,user_id,store_name,store_slug,phone").eq("id", o.dropshipper_id).maybeSingle();
        if (ds) {
          const { data: prof } = await supabase.from("profiles").select("full_name,phone").eq("id", ds.user_id).maybeSingle();
          const { data: em } = await supabase.rpc("admin_get_user_email", { _user_id: ds.user_id });
          setPartner({ kind: "dropshipper", code: ds.code, name: prof?.full_name ?? null, phone: ds.phone ?? prof?.phone ?? null, email: (em as string | null) ?? null, store: ds.store_name, store_slug: ds.store_slug });
        } else setPartner(null);
      } else if (o.affiliate_id) {
        const { data: af } = await supabase.from("affiliates").select("id,code,user_id").eq("id", o.affiliate_id).maybeSingle();
        if (af) {
          const { data: prof } = await supabase.from("profiles").select("full_name,phone").eq("id", af.user_id).maybeSingle();
          const { data: em } = await supabase.rpc("admin_get_user_email", { _user_id: af.user_id });
          setPartner({ kind: "affiliate", code: af.code, name: prof?.full_name ?? null, phone: prof?.phone ?? null, email: (em as string | null) ?? null });
        } else setPartner(null);
      } else setPartner(null);
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function updateStatus(status: string) {
    if (!order) return;
    const { error } = await supabase.from("orders").update({ status }).eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    setOrder({ ...order, status });
  }

  async function saveTracking() {
    if (!order) return;
    setSaving(true);
    const patch = {
      courier_name: courier || null,
      tracking_number: trackNum || null,
      tracking_url: trackUrl || null,
    };
    const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tracking saved");
    setOrder({ ...order, ...patch });
  }

  if (loading) return <div className="py-16 text-center text-sm text-slate-500">Loading…</div>;
  if (!order) return (
    <div className="py-16 text-center">
      <p className="text-sm text-slate-500">Order not found</p>
      <Link to="/sys-x7k9-control/orders" className="mt-3 inline-block text-xs font-bold text-purple-700 hover:underline">← Back to orders</Link>
    </div>
  );

  const itemsTotal = order.items.reduce((s, it) => s + it.price * it.qty, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShoppingBag}
        title={`Order ${order.order_number}`}
        subtitle={new Date(order.created_at).toLocaleString()}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[order.status] ?? "slate"}>{order.status}</Badge>
            <SelectInput value={order.status} onChange={(e) => updateStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectInput>
            <GhostButton onClick={async () => {
              const { data } = await supabase.auth.getUser();
              logInvoiceEvent(order.id, { action: "preview", panel: "admin", actor: data.user?.email ?? null });
              openPrintableInvoice({ ...order, vendor_name: vendor?.store_name ?? null } as any);
            }}>
              <Printer className="h-3 w-3" /> Invoice
            </GhostButton>
            <GhostButton onClick={() => router.history.back()}><ArrowLeft className="h-3 w-3" /> Back</GhostButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Surface>
            <SectionTitle icon={Package}>Line items ({order.items.length})</SectionTitle>
            <div className="mt-3 divide-y divide-slate-100">
              {order.items.map((it: any, i: number) => (
                <div key={i} className="flex items-start gap-3 py-2.5">
                  {it.image && <img src={it.image} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{it.name}</div>
                    <div className="text-xs text-slate-500">৳{Number(it.price).toFixed(0)} × {it.qty}</div>
                    {(it.variant || it.size || it.color || it.sku) && (
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        {it.variant && <span className="rounded bg-purple-100 px-1.5 py-0.5 font-semibold text-purple-800">{it.variant}</span>}
                        {it.size && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">Size: <b>{it.size}</b></span>}
                        {it.color && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">Color: <b>{it.color}</b></span>}
                        {it.sku && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700">SKU: {it.sku}</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-bold text-purple-900">৳{(Number(it.price) * it.qty).toFixed(0)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
              <Row k="Items subtotal" v={`৳${itemsTotal.toFixed(0)}`} />
              <Row k="Subtotal" v={`৳${Number(order.subtotal).toFixed(0)}`} />
              {Number(order.discount ?? 0) > 0 && <Row k={`Discount${order.coupon_code ? " (" + order.coupon_code + ")" : ""}`} v={`− ৳${Number(order.discount).toFixed(0)}`} />}
              <Row k="Delivery" v={`৳${Number(order.delivery_fee).toFixed(0)}`} />
              <div className="mt-1 flex justify-between border-t border-slate-100 pt-2 text-lg font-black text-purple-900">
                <span>Total</span><span>৳{Number(order.total).toFixed(0)}</span>
              </div>
            </div>
          </Surface>

          <Surface>
            <SectionTitle icon={Truck}>Courier tracking</SectionTitle>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier (Steadfast, Pathao…)" className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
              <input value={trackNum} onChange={(e) => setTrackNum(e.target.value)} placeholder="Tracking #" className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
              <input value={trackUrl} onChange={(e) => setTrackUrl(e.target.value)} placeholder="https://tracking-url" className="rounded border border-slate-200 px-2 py-1.5 text-sm sm:col-span-3" />
            </div>
            <PrimaryButton onClick={saveTracking} disabled={saving} className="mt-3">
              {saving ? "Saving…" : "Save tracking"}
            </PrimaryButton>
          </Surface>
        </div>

        <div className="space-y-5">
          {partner && (
            <Surface>
              <SectionTitle icon={Handshake}>
                {partner.kind === "dropshipper" ? "Dropshipper" : "Affiliate"}
              </SectionTitle>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="font-bold text-slate-800">{partner.name || "—"}</div>
                {partner.store && <div className="text-xs text-slate-500">{partner.store}</div>}
                {partner.code && <div className="text-[11px] font-mono uppercase text-purple-700">Code: {partner.code}</div>}
                {partner.phone && <div className="flex items-center gap-1.5 text-slate-600"><Phone className="h-3.5 w-3.5" /> {partner.phone}</div>}
                {partner.email && <div className="text-xs text-slate-500">{partner.email}</div>}
                <div className="pt-1 text-[11px] text-slate-500">
                  This order was placed by a {partner.kind}. The customer details below are the buyer receiving delivery.
                </div>
              </div>
            </Surface>
          )}
          <Surface>
            <SectionTitle icon={Store}>Vendor</SectionTitle>
            <div className="mt-2 text-sm">
              {vendor ? (
                <>
                  <div className="font-bold text-slate-800">{vendor.store_name}</div>
                  <Link to="/store/$slug" params={{ slug: vendor.slug }} className="text-xs text-purple-700 hover:underline">View store →</Link>
                </>
              ) : <div className="text-slate-500">Platform (no vendor)</div>}
              <div className="mt-2 text-xs text-slate-500">This order contains items from {vendor ? "this vendor only" : "the platform"}. Multi-vendor carts are split into one order per vendor at checkout.</div>
            </div>
          </Surface>

          <Surface>
            <SectionTitle icon={User}>Customer</SectionTitle>
            <div className="mt-2 space-y-1.5 text-sm">
              <div className="font-bold text-slate-800">{order.customer_name}</div>
              <div className="flex items-center gap-1.5 text-slate-600"><Phone className="h-3.5 w-3.5" /> {order.customer_phone}</div>
              {order.customer_email && <div className="text-xs text-slate-500">{order.customer_email}</div>}
              <div className="flex items-start gap-1.5 pt-1 text-slate-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{order.address}{order.thana ? ", " + order.thana : ""}{order.district ? ", " + order.district : ""}</span>
              </div>
            </div>
          </Surface>

          <Surface>
            <SectionTitle icon={CreditCard}>Payment</SectionTitle>
            <div className="mt-2 space-y-1.5 text-sm">
              <Row k="Method" v={`${order.payment_method.toUpperCase()}${order.payment_type ? " — " + order.payment_type : ""}`} />
              {order.txn_id && <Row k="Transaction ID" v={order.txn_id} />}
              {order.sender_phone && <Row k="Sender phone" v={order.sender_phone} />}
              {Number(order.paid_amount ?? 0) > 0 && <Row k="Paid" v={`৳${Number(order.paid_amount).toFixed(0)}`} />}
            </div>
          </Surface>

          {order.notes && (
            <Surface>
              <SectionTitle icon={StickyNote}>Customer note</SectionTitle>
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-amber-50 p-2.5 text-sm text-slate-700">{order.notes}</p>
            </Surface>
          )}

          <Surface>
            <SectionTitle icon={Clock}>Timeline</SectionTitle>
            <div className="mt-2 space-y-1 text-sm">
              <Row k="Placed at" v={new Date(order.created_at).toLocaleString()} />
              {order.updated_at && <Row k="Last updated" v={new Date(order.updated_at).toLocaleString()} />}
              <Row k="Order ID" v={order.id.slice(0, 8) + "…"} />
            </div>
          </Surface>

          <InvoiceHistory orderId={order.id} />

          <AuditLog entityType="order" entityId={order.id} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-purple-800/70">
      <Icon className="h-3.5 w-3.5" /> {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-semibold text-slate-800">{v}</span>
    </div>
  );
}
