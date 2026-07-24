import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, Trash2, X, ShoppingBag } from "lucide-react";
import type { DBOrder } from "@/lib/admin-api";
import { PageHeader, Surface, GhostButton, DangerButton, SelectInput, Modal, Badge } from "@/lib/admin-ui";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

type OrderSource = "all" | "customer" | "dropshipper" | "affiliate" | "vendor";

const searchSchema = z.object({
  source: fallback(z.string(), "all").default("all"),
});

export const Route = createFileRoute("/sys-x7k9-control/orders")({
  validateSearch: zodValidator(searchSchema),
  component: OrdersAdmin,
});

const SOURCE_LABEL: Record<OrderSource, string> = {
  all: "All Orders",
  customer: "Customer Orders",
  dropshipper: "Dropshipper Orders",
  affiliate: "Affiliate Orders",
  vendor: "Vendor Orders",
};


const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_TONE: Record<string, "pink" | "sky" | "indigo" | "sky" | "rose"> = {
  pending: "pink",
  processing: "sky",
  shipped: "indigo",
  delivered: "sky",
  cancelled: "rose",
};

type OrderExt = DBOrder & {
  vendor_id?: string | null;
  dropshipper_id?: string | null;
  affiliate_id?: string | null;
  dropshipper_code?: string | null;
  affiliate_code?: string | null;
};

function OrdersAdmin() {
  const { source } = Route.useSearch() as { source: string };
  const navigate = Route.useNavigate();
  const src = (["all", "customer", "dropshipper", "affiliate", "vendor"].includes(source) ? source : "all") as OrderSource;

  const [items, setItems] = useState<OrderExt[]>([]);
  const [view, setView] = useState<OrderExt | null>(null);
  const [filter, setFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [vendors, setVendors] = useState<Array<{ id: string; store_name: string }>>([]);

  async function load() {
    const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as unknown as OrderExt[]) ?? []);
    const { data: vs } = await supabase.from("vendors").select("id,store_name").order("store_name");
    setVendors(vs ?? []);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
    if (view?.id === id) setView({ ...view, status });
  }
  async function del(id: string) {
    if (!confirm("Delete this order?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const vendorName = (id: string | null | undefined) => id ? (vendors.find(v => v.id === id)?.store_name ?? "—") : "Platform";

  const matchSource = (o: OrderExt, s: OrderSource): boolean => {
    if (s === "all") return true;
    if (s === "dropshipper") return !!o.dropshipper_id || !!o.dropshipper_code;
    if (s === "affiliate") return !!o.affiliate_id || !!o.affiliate_code;
    if (s === "vendor") return !!o.vendor_id;
    // customer = plain customer order (no dropshipper/affiliate/vendor attribution)
    return !o.dropshipper_id && !o.dropshipper_code && !o.affiliate_id && !o.affiliate_code && !o.vendor_id;
  };

  const bySource = useMemo(() => items.filter(o => matchSource(o, src)), [items, src]);
  const filtered = bySource.filter(o =>
    (filter === "all" || o.status === filter) &&
    (vendorFilter === "all" || (vendorFilter === "platform" ? !o.vendor_id : o.vendor_id === vendorFilter))
  );

  const count = (s: OrderSource) => items.filter(o => matchSource(o, s)).length;

  const sourceBadge = (o: OrderExt) => {
    if (o.dropshipper_id || o.dropshipper_code) return <span className="rounded bg-fuchsia-100 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-700">DROPSHIP</span>;
    if (o.affiliate_id || o.affiliate_code) return <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">AFFILIATE</span>;
    if (o.vendor_id) return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">VENDOR</span>;
    return <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">CUSTOMER</span>;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShoppingBag}
        title={SOURCE_LABEL[src]}
        subtitle={`${bySource.length} orders — ${bySource.filter((o) => o.status === "pending").length} pending`}
        actions={
          <div className="flex flex-wrap gap-2">
            {src === "vendor" || src === "all" ? (
              <SelectInput value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                <option value="all">All vendors</option>
                <option value="platform">Platform (no vendor)</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.store_name}</option>)}
              </SelectInput>
            ) : null}
            <SelectInput value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All ({bySource.length})</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s} ({bySource.filter((o) => o.status === s).length})</option>)}
            </SelectInput>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {(["all", "customer", "dropshipper", "affiliate", "vendor"] as OrderSource[]).map((s) => (
          <button
            key={s}
            onClick={() => navigate({ search: { source: s } })}
            className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
              src === s
                ? "bg-purple-800 text-white shadow"
                : "bg-white text-slate-600 hover:bg-purple-50 border border-slate-200"
            }`}
          >
            {s} ({count(s)})
          </button>
        ))}
      </div>



      <Surface className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No orders</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50 text-[10px] uppercase tracking-widest text-purple-800/70">
                <tr>
                  <th className="px-3 py-3 text-left font-bold">Order</th>
                  <th className="text-left font-bold">Source</th>
                  <th className="text-left font-bold">Vendor / Code</th>
                  <th className="text-left font-bold">Customer</th>
                  <th className="text-left font-bold">Phone</th>
                  <th className="text-right font-bold">Total</th>
                  <th className="text-left font-bold">Payment</th>
                  <th className="text-center font-bold">Status</th>
                  <th className="text-right font-bold">Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-purple-50/30">
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{o.order_number}</td>
                    <td>{sourceBadge(o)}</td>
                    <td className="text-xs text-slate-600">
                      {o.dropshipper_code ? <span className="font-mono">DS · {o.dropshipper_code}</span>
                        : o.affiliate_code ? <span className="font-mono">AF · {o.affiliate_code}</span>
                        : vendorName(o.vendor_id)}
                    </td>
                    <td className="font-semibold text-slate-800">{o.customer_name}</td>
                    <td className="text-xs text-slate-600">{o.customer_phone}</td>
                    <td className="text-right font-bold text-purple-900">৳{Number(o.total).toFixed(0)}</td>
                    <td className="text-xs uppercase text-slate-600">{o.payment_method}</td>
                    <td className="text-center">
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className={`rounded-full border-none px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-700 ${toneBg(STATUS_TONE[o.status] ?? "slate")}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="text-right text-xs text-slate-500">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="pr-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link to="/sys-x7k9-control/orders/$id" params={{ id: o.id }} className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-purple-50 hover:text-purple-800"><Eye className="h-3 w-3" /></Link>
                        <DangerButton onClick={() => del(o.id)}><Trash2 className="h-3 w-3" /></DangerButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>

      {view && (
        <Modal onClose={() => setView(null)}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order</div>
              <h2 className="font-mono text-lg font-black text-purple-950">{view.order_number}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={STATUS_TONE[view.status] ?? "slate"}>{view.status}</Badge>
              <button onClick={() => setView(null)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="space-y-2 py-4 text-sm">
            <Row k="Customer" v={view.customer_name} />
            <Row k="Phone" v={view.customer_phone} />
            {view.customer_email && <Row k="Email" v={view.customer_email} />}
            <Row k="Address" v={`${view.address}${view.thana ? ", " + view.thana : ""}${view.district ? ", " + view.district : ""}`} />
            <Row k="Payment" v={`${view.payment_method.toUpperCase()}${view.payment_type ? " — " + view.payment_type : ""}`} />
            {view.txn_id && <Row k="Transaction ID" v={view.txn_id} />}
            {view.sender_phone && <Row k="Sender phone" v={view.sender_phone} />}
            {Number(view.paid_amount) > 0 && <Row k="Paid amount" v={`৳${Number(view.paid_amount).toFixed(0)}`} />}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-purple-800/70">Items</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {view.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="flex-1 truncate text-slate-700">{it.name} <span className="text-slate-400">× {it.qty}</span></span>
                  <span className="font-semibold text-slate-800">৳{(it.price * it.qty).toFixed(0)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>৳{Number(view.subtotal).toFixed(0)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Delivery</span><span>৳{Number(view.delivery_fee).toFixed(0)}</span></div>
              <div className="flex justify-between text-lg font-black text-purple-900"><span>Total</span><span>৳{Number(view.total).toFixed(0)}</span></div>
            </div>
          </div>
          <TrackingEditor order={view} onSaved={(u) => { setView({ ...view, ...u }); load(); }} />
        </Modal>
      )}
    </div>
  );
}

function TrackingEditor({ order, onSaved }: { order: DBOrder & { courier_name?: string | null; tracking_url?: string | null; tracking_number?: string | null }; onSaved: (u: { courier_name: string | null; tracking_url: string | null; tracking_number: string | null }) => void }) {
  const [courier, setCourier] = useState(order.courier_name ?? "");
  const [url, setUrl] = useState(order.tracking_url ?? "");
  const [num, setNum] = useState(order.tracking_number ?? "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    const patch = { courier_name: courier || null, tracking_url: url || null, tracking_number: num || null };
    const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tracking saved");
    onSaved(patch);
  }
  return (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-purple-800/70">Courier Tracking</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Courier (Steadfast, Pathao…)" className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
        <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="Tracking #" className="rounded border border-slate-200 px-2 py-1.5 text-sm" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://tracking-url" className="rounded border border-slate-200 px-2 py-1.5 text-sm sm:col-span-3" />
      </div>
      <button onClick={save} disabled={saving} className="mt-2 rounded bg-purple-700 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60">
        {saving ? "Saving…" : "Save tracking"}
      </button>
    </div>
  );
}

function toneBg(t: string) {
  switch (t) {
    case "pink": return "bg-amber-100 text-amber-800";
    case "sky": return "bg-purple-100 text-purple-800";
    case "indigo": return "bg-indigo-100 text-indigo-800";
    case "sky": return "bg-purple-100 text-purple-800";
    case "rose": return "bg-rose-100 text-rose-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-semibold text-slate-800">{v}</span>
    </div>
  );
}
