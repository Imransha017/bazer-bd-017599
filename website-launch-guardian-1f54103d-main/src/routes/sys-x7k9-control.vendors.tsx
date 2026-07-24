import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listVendors, adminUpdateVendor, type Vendor } from "@/lib/vendor";
import { Store, ExternalLink, Check, X, Pause, RotateCcw, Eye, Package, DollarSign, ShoppingBag, TrendingUp, Phone, MapPin, Calendar, CreditCard, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/lib/admin-ui";
import { useProductImageUrl } from "@/components/ProductImage";


type VendorOrder = { id: string; order_number: string; customer_name: string; customer_phone: string | null; total: number; status: string; created_at: string; payment_method: string | null; payment_type: string | null };
type VendorProduct = { id: string; name: string; slug: string; price: number; stock: number; is_active: boolean; image: string | null; created_at: string };

type VendorStats = {
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  netProfit: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  productCount: number;
  orders: VendorOrder[];
  products: VendorProduct[];
};

export const Route = createFileRoute("/sys-x7k9-control/vendors")({
  component: AdminVendors,
});

const STATUSES = ["pending", "approved", "rejected", "suspended"] as const;

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-zinc-200 text-zinc-700",
};

function AdminVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [rejectFor, setRejectFor] = useState<Vendor | null>(null);
  const [reason, setReason] = useState("");
  const [detailFor, setDetailFor] = useState<Vendor | null>(null);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [openActionFor, setOpenActionFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "products">("overview");

  const openDetails = async (v: Vendor) => {
    setDetailFor(v);
    setStats(null);
    setActiveTab("overview");
    setStatsLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("id,order_number,customer_name,customer_phone,total,status,created_at,payment_method,payment_type").eq("vendor_id", v.id).order("created_at", { ascending: false }),
        supabase.from("products").select("id,name,slug,price,stock,is_active,image,created_at").eq("vendor_id", v.id).order("created_at", { ascending: false }),
      ]);
      const orders = (ordersRes.data ?? []) as unknown as VendorOrder[];
      const products = (productsRes.data ?? []) as unknown as VendorProduct[];
      const completed = orders.filter(o => o.status === "delivered" || o.status === "completed");
      const totalRevenue = completed.reduce((s, o) => s + Number(o.total || 0), 0);
      const totalCommission = totalRevenue * (Number(v.commission_pct) / 100);
      setStats({
        totalOrders: orders.length,
        totalRevenue,
        totalCommission,
        netProfit: totalRevenue - totalCommission,
        pendingOrders: orders.filter(o => o.status === "pending" || o.status === "processing").length,
        completedOrders: completed.length,
        cancelledOrders: orders.filter(o => o.status === "cancelled").length,
        productCount: products.length,
        orders,
        products,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const reload = async () => { setVendors(await listVendors()); setLoading(false); };
  useEffect(() => { reload(); }, []);

  const update = async (id: string, patch: Partial<Pick<Vendor, "status" | "commission_pct" | "rejection_reason">>) => {
    try {
      await adminUpdateVendor(id, patch);
      setVendors(vs => vs.map(v => v.id === id ? { ...v, ...patch } as Vendor : v));
      toast.success("Updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const approve = (v: Vendor) => update(v.id, { status: "approved", rejection_reason: null });
  const suspend = (v: Vendor) => update(v.id, { status: "suspended" });
  const reinstate = (v: Vendor) => update(v.id, { status: "approved", rejection_reason: null });
  const openReject = (v: Vendor) => { setRejectFor(v); setReason(v.rejection_reason ?? ""); };
  const confirmReject = async () => {
    if (!rejectFor) return;
    if (!reason.trim()) return toast.error("Rejection reason required");
    await update(rejectFor.id, { status: "rejected", rejection_reason: reason.trim() });
    setRejectFor(null); setReason("");
  };

  const q = search.trim().toLowerCase();
  const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTs = dateTo ? new Date(dateTo).getTime() + 86400000 : null;
  const filtered = vendors
    .filter(v => filter === "all" || v.status === filter)
    .filter(v => !q || v.store_name.toLowerCase().includes(q) || v.slug.toLowerCase().includes(q) || (v.phone ?? "").toLowerCase().includes(q) || (v.address ?? "").toLowerCase().includes(q))
    .filter(v => {
      const t = new Date(v.created_at).getTime();
      if (fromTs && t < fromTs) return false;
      if (toTs && t > toTs) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.store_name.localeCompare(b.store_name);
      const da = new Date(a.created_at).getTime(), db = new Date(b.created_at).getTime();
      return sortBy === "newest" ? db - da : da - db;
    });
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: vendors.filter(v => v.status === s).length }), {} as Record<string, number>);

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  const resetFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); setFilter("all"); setSortBy("newest"); };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Store}
        title="Vendors"
        subtitle={`${vendors.length} vendors — ${counts.pending ?? 0} pending approval`}
        actions={
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            <button onClick={() => setFilter("all")} className={`rounded-md px-3 py-1 text-xs font-semibold ${filter === "all" ? "bg-white text-purple-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>All ({vendors.length})</button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilter(s)} className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${filter === s ? "bg-white text-purple-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{s} ({counts[s] ?? 0})</button>
            ))}
          </div>
        }
      />


      <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, slug, phone, address…" className="w-full rounded border pl-8 pr-3 py-1.5 text-sm" />
        </div>
        <label className="text-xs">
          <span className="block text-muted-foreground">From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        </label>
        <label className="text-xs">
          <span className="block text-muted-foreground">To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded border px-2 py-1 text-sm" />
        </label>
        <label className="text-xs">
          <span className="block text-muted-foreground">Sort</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="rounded border px-2 py-1 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </label>
        <button onClick={resetFilters} className="rounded border px-3 py-1.5 text-xs hover:bg-muted">Reset</button>
        <div className="ml-auto text-xs text-muted-foreground">Showing {filtered.length} of {vendors.length}</div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-card shadow-sm">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No vendors</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="p-3 text-left">Store</th>
                <th className="text-left">Slug</th>
                <th className="text-left">Contact</th>
                <th className="text-right">Commission %</th>
                <th>Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b align-top last:border-0">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center overflow-hidden rounded bg-muted">
                        {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div>
                        <div className="font-semibold">{v.store_name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{v.slug}</td>
                  <td className="text-xs">{v.phone ?? "—"}<br />{v.address ?? ""}</td>
                  <td className="text-right">
                    <input type="number" defaultValue={v.commission_pct} min={0} max={100} step={0.5}
                      onBlur={e => { const n = Number(e.target.value); if (n !== v.commission_pct) update(v.id, { commission_pct: n }); }}
                      className="w-16 rounded border px-2 py-1 text-right text-sm" />
                  </td>
                  <td className="text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[v.status]}`}>{v.status}</span>
                    {v.status === "rejected" && v.rejection_reason && (
                      <div className="mt-1 max-w-[180px] text-[10px] text-muted-foreground" title={v.rejection_reason}>“{v.rejection_reason}”</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <button onClick={() => openDetails(v)} title="View full details" className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                        <Eye className="h-3 w-3" /> Details
                      </button>
                      {v.status === "pending" && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenActionFor(openActionFor === v.id ? null : v.id)}
                            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                          >
                            Action <ChevronDown className="h-3 w-3" />
                          </button>
                          {openActionFor === v.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenActionFor(null)} />
                              <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-md border bg-card shadow-lg">
                                <button
                                  onClick={() => { setOpenActionFor(null); approve(v); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-green-700 hover:bg-green-50"
                                >
                                  <Check className="h-3.5 w-3.5" /> Approve
                                </button>
                                <button
                                  onClick={() => { setOpenActionFor(null); openReject(v); }}
                                  className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-3.5 w-3.5" /> Reject
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {v.status === "approved" && (
                        <>
                          <button onClick={() => suspend(v)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted">
                            <Pause className="h-3 w-3" /> Suspend
                          </button>
                          <Link to="/store/$slug" params={{ slug: v.slug }} target="_blank" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted">
                            <ExternalLink className="h-3 w-3" /> View
                          </Link>
                        </>
                      )}
                      {(v.status === "rejected" || v.status === "suspended") && (
                        <button onClick={() => reinstate(v)} className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90">
                          <RotateCcw className="h-3 w-3" /> Reinstate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rejectFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setRejectFor(null)}>
          <div className="w-full max-w-md rounded-lg bg-card p-5 shadow-lg" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Reject {rejectFor.store_name}?</h2>
            <p className="mt-1 text-xs text-muted-foreground">The vendor will see this reason on their application page.</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="e.g. Incomplete store information, suspected duplicate, missing trade license…"
              className="mt-3 w-full rounded border px-3 py-2 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectFor(null)} className="rounded border px-4 py-1.5 text-sm hover:bg-muted">Cancel</button>
              <button onClick={confirmReject} className="rounded bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {detailFor && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" onClick={() => setDetailFor(null)}>
          <div className="my-8 w-full max-w-4xl rounded-xl bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 p-5 text-white">
              {detailFor.banner_url && <img src={detailFor.banner_url} className="absolute inset-0 h-full w-full object-cover opacity-30" alt="" />}
              <div className="relative flex items-start gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/20 ring-2 ring-white/40">
                  {detailFor.logo_url ? <img src={detailFor.logo_url} className="h-full w-full object-cover" alt="" /> : <Store className="h-7 w-7" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{detailFor.store_name}</h2>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_BADGE[detailFor.status]}`}>{detailFor.status}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs opacity-90">/{detailFor.slug}</div>
                  {detailFor.description && <p className="mt-2 text-sm opacity-95 line-clamp-2">{detailFor.description}</p>}
                </div>
                <button onClick={() => setDetailFor(null)} className="rounded p-1 hover:bg-white/20"><X className="h-5 w-5" /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b bg-slate-50 px-3 pt-3">
              {(["overview", "orders", "products"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`rounded-t-md px-4 py-2 text-xs font-semibold capitalize transition ${activeTab === t ? "bg-card text-purple-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {t === "orders" && stats ? `Orders (${stats.orders.length})` : t === "products" && stats ? `Products (${stats.products.length})` : t}
                </button>
              ))}
            </div>

            <div className="space-y-5 p-5">
              {statsLoading || !stats ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Loading vendor data…</div>
              ) : activeTab === "overview" ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Total Orders" value={stats.totalOrders} color="from-blue-500 to-cyan-500" />
                    <StatCard icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={`৳${stats.totalRevenue.toLocaleString()}`} color="from-purple-500 to-green-500" />
                    <StatCard icon={<TrendingUp className="h-4 w-4" />} label={`Commission (${detailFor.commission_pct}%)`} value={`৳${stats.totalCommission.toLocaleString()}`} color="from-amber-500 to-purple-500" />
                    <StatCard icon={<DollarSign className="h-4 w-4" />} label="Net Profit" value={`৳${stats.netProfit.toLocaleString()}`} color="from-amber-500 to-rose-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <MiniStat label="Products" value={stats.productCount} cls="bg-indigo-50 text-indigo-700" />
                    <MiniStat label="Pending" value={stats.pendingOrders} cls="bg-amber-50 text-amber-700" />
                    <MiniStat label="Completed" value={stats.completedOrders} cls="bg-green-50 text-green-700" />
                    <MiniStat label="Cancelled" value={stats.cancelledOrders} cls="bg-red-50 text-red-700" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoCard title="Owner" icon={<Phone className="h-4 w-4" />} color="bg-blue-50">
                      <Row label="Full Name" value={detailFor.full_name ?? "—"} />
                      <Row label="Email" value={detailFor.email ?? "—"} />
                      <Row label="Phone" value={detailFor.phone ?? "—"} />
                      <Row label="Alt Phone" value={detailFor.alt_phone ?? "—"} />
                      <Row label="WhatsApp" value={detailFor.whatsapp ?? "—"} />
                      <Row label="DOB" value={detailFor.date_of_birth ?? "—"} icon={<Calendar className="h-3 w-3" />} />
                      <Row label="NID" value={detailFor.nid_number ?? "—"} />
                    </InfoCard>

                    <InfoCard title="Store" icon={<Store className="h-4 w-4" />} color="bg-indigo-50">
                      <Row label="Store Name" value={detailFor.store_name} />
                      <Row label="Slug" value={`/${detailFor.slug}`} />
                      <Row label="Main Category" value={detailFor.main_category ?? "—"} />
                      <Row label="Expected Products" value={detailFor.expected_products ? String(detailFor.expected_products) : "—"} />
                      {detailFor.description && <div className="pt-1 text-xs text-muted-foreground">{detailFor.description}</div>}
                    </InfoCard>

                    <InfoCard title="Address" icon={<MapPin className="h-4 w-4" />} color="bg-purple-50">
                      <Row label="Pickup" value={detailFor.address ?? "—"} />
                      <Row label="City" value={detailFor.city ?? "—"} />
                      <Row label="District" value={detailFor.district ?? "—"} />
                      <Row label="Thana" value={detailFor.thana ?? "—"} />
                      <Row label="Postal Code" value={detailFor.postal_code ?? "—"} />
                      <Row label="Country" value={detailFor.country ?? "—"} />
                    </InfoCard>

                    <InfoCard title="Business" icon={<Package className="h-4 w-4" />} color="bg-emerald-50">
                      <Row label="Type" value={detailFor.business_type ?? "—"} />
                      <Row label="Trade License" value={detailFor.trade_license ?? "—"} />
                      <Row label="TIN" value={detailFor.tin_number ?? "—"} />
                      <Row label="VAT" value={detailFor.vat_number ?? "—"} />
                      <Row label="Agreed Terms" value={detailFor.agreed_terms ? "Yes" : "No"} />
                    </InfoCard>

                    <InfoCard title="Payout — Bank" icon={<CreditCard className="h-4 w-4" />} color="bg-amber-50">
                      <Row label="Bank Name" value={detailFor.bank_name ?? "—"} />
                      <Row label="Account Name" value={detailFor.bank_account_name ?? "—"} />
                      <Row label="Account No." value={detailFor.bank_account_number ?? "—"} />
                      <Row label="Branch" value={detailFor.bank_branch ?? "—"} />
                      <Row label="Routing" value={detailFor.bank_routing ?? "—"} />
                    </InfoCard>

                    <InfoCard title="Payout — Mobile Banking" icon={<CreditCard className="h-4 w-4" />} color="bg-rose-50">
                      <Row label="Provider" value={detailFor.mobile_banking_type ?? "—"} />
                      <Row label="Number" value={detailFor.mobile_banking_number ?? "—"} />
                    </InfoCard>

                    <InfoCard title="Online Presence" icon={<ExternalLink className="h-4 w-4" />} color="bg-cyan-50">
                      <Row label="Website" value={detailFor.website ?? "—"} />
                      <Row label="Facebook" value={detailFor.facebook ?? "—"} />
                      <Row label="Instagram" value={detailFor.instagram ?? "—"} />
                    </InfoCard>

                    <InfoCard title="Commission & Lifetime" icon={<TrendingUp className="h-4 w-4" />} color="bg-slate-50">
                      <Row label="Rate" value={`${detailFor.commission_pct}%`} />
                      <Row label="Total Sales" value={`৳${Number(detailFor.total_sales).toLocaleString()}`} />
                      <Row label="Total Orders" value={String(detailFor.total_orders)} />
                      <Row label="Joined" value={new Date(detailFor.created_at).toLocaleDateString()} />
                      <Row label="Updated" value={new Date(detailFor.updated_at).toLocaleDateString()} />
                      {detailFor.rejection_reason && <Row label="Rejection" value={detailFor.rejection_reason} />}
                    </InfoCard>
                  </div>

                  {(detailFor.nid_front_url || detailFor.nid_back_url || detailFor.logo_url || detailFor.banner_url) && (
                    <div className="rounded-lg border bg-slate-50 p-3">
                      <div className="mb-2 text-xs font-semibold text-muted-foreground">Documents & Media</div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <DocThumb label="NID Front" url={detailFor.nid_front_url} />
                        <DocThumb label="NID Back" url={detailFor.nid_back_url} />
                        <DocThumb label="Logo" url={detailFor.logo_url} />
                        <DocThumb label="Banner" url={detailFor.banner_url} />
                      </div>
                    </div>
                  )}

                </>
              ) : activeTab === "orders" ? (
                stats.orders.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="max-h-[60vh] overflow-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-muted-foreground">
                        <tr className="border-b">
                          <th className="p-2 text-left">Order #</th>
                          <th className="text-left">Customer</th>
                          <th className="text-left">Phone</th>
                          <th className="text-right">Total</th>
                          <th className="text-left">Payment</th>
                          <th>Status</th>
                          <th className="p-2 text-right">Date</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.orders.map(o => (
                          <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-2 font-mono">{o.order_number}</td>
                            <td>{o.customer_name}</td>
                            <td>{o.customer_phone ?? "—"}</td>
                            <td className="text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
                            <td className="capitalize">{o.payment_method ?? "—"}{o.payment_type ? ` · ${o.payment_type}` : ""}</td>
                            <td className="text-center"><span className="rounded bg-muted px-2 py-0.5 capitalize">{o.status}</span></td>
                            <td className="p-2 text-right text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td className="p-2 text-right"><Link to="/order/$id" params={{ id: o.id }} target="_blank" className="text-purple-700 hover:underline">View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                stats.products.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">No products yet</p>
                ) : (
                  <div className="max-h-[60vh] overflow-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-muted-foreground">
                        <tr className="border-b">
                          <th className="p-2 text-left">Product</th>
                          <th className="text-right">Price</th>
                          <th className="text-right">Stock</th>
                          <th>Status</th>
                          <th className="p-2 text-right">Added</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.products.map(p => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div className="grid h-8 w-8 place-items-center overflow-hidden rounded bg-muted">
                                  {p.image ? <img src={p.image} className="h-full w-full object-cover" alt="" /> : <Package className="h-3 w-3 text-muted-foreground" />}
                                </div>
                                <span className="font-medium">{p.name}</span>
                              </div>
                            </td>
                            <td className="text-right font-semibold">৳{Number(p.price).toLocaleString()}</td>
                            <td className={`text-right ${p.stock <= 0 ? "text-red-600 font-semibold" : ""}`}>{p.stock}</td>
                            <td className="text-center"><span className={`rounded px-2 py-0.5 ${p.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{p.is_active ? "Active" : "Hidden"}</span></td>
                            <td className="p-2 text-right text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                            <td className="p-2 text-right"><Link to="/p/$slug" params={{ slug: p.slug }} target="_blank" className="text-purple-700 hover:underline">View</Link></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <Link to="/store/$slug" params={{ slug: detailFor.slug }} target="_blank" className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm hover:bg-muted">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Storefront
                </Link>
                <button onClick={() => setDetailFor(null)} className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-lg bg-gradient-to-br ${color} p-3 text-white shadow-sm`}>
      <div className="flex items-center gap-1 text-xs opacity-90">{icon}{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}
function MiniStat({ label, value, cls }: { label: string; value: React.ReactNode; cls: string }) {
  return <div className={`rounded-lg px-3 py-2 ${cls}`}><div className="text-[10px] font-medium uppercase opacity-75">{label}</div><div className="text-lg font-bold">{value}</div></div>;
}
function InfoCard({ title, icon, color, children }: { title: string; icon: React.ReactNode; color: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border ${color} p-3`}>
      <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">{icon}{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="flex justify-between gap-2 text-sm"><span className="text-muted-foreground">{label}</span><span className="flex items-center gap-1 text-right font-medium break-all">{icon}{value}</span></div>;
}
function DocThumb({ label, url }: { label: string; url: string | null | undefined }) {
  const signed = useProductImageUrl(url);
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">{label}</div>
      {url ? (
        signed ? (
          <a href={signed} target="_blank" rel="noreferrer" className="block overflow-hidden rounded border bg-white hover:opacity-90">
            <img src={signed} alt={label} className="h-24 w-full object-cover" />
          </a>
        ) : (
          <div className="grid h-24 place-items-center rounded border bg-white text-xs text-muted-foreground">Loading…</div>
        )
      ) : (
        <div className="grid h-24 place-items-center rounded border bg-white text-xs text-muted-foreground">Not provided</div>
      )}
    </div>
  );
}

