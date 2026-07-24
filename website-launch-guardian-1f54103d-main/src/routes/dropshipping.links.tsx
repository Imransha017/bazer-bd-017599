import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyDropshipper, buildDsLink, type Dropshipper } from "@/lib/dropshipper";
import { Link2, Copy, MousePointerClick, ShoppingBag, DollarSign, Search, RefreshCw, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dropshipping/links")({
  head: () => ({ meta: [{ title: "Link History — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: LinksPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Click = { id: string; landing_path: string | null; referer: string | null; product_id: string | null; created_at: string };
type Earning = { id: string; product_id: string | null; profit: number; status: string; order_id: string; created_at: string };
type Group = {
  path: string;
  productId: string | null;
  clicks: number;
  lastClick: string;
  firstClick: string;
  orders: number;
  profit: number;
  approvedProfit: number;
  topRef: string | null;
};

function LinksPage() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"clicks" | "orders" | "profit" | "recent">("recent");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (key: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  async function load() {
    setLoading(true);
    try {
      const d = await getMyDropshipper();
      setDs(d);
      if (!d) { setClicks([]); setEarnings([]); return; }
      const [c, e] = await Promise.all([
        db.from("dropshipper_clicks").select("id,landing_path,referer,product_id,created_at").eq("dropshipper_id", d.id).order("created_at", { ascending: false }).limit(2000),
        db.from("dropshipper_earnings").select("id,product_id,profit,status,order_id,created_at").eq("dropshipper_id", d.id).order("created_at", { ascending: false }).limit(2000),
      ]);
      setClicks((c.data ?? []) as Click[]);
      setEarnings((e.data ?? []) as Earning[]);
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const { clicksInRange, earningsInRange } = useMemo(() => {
    const fromMs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : -Infinity;
    const toMs = toDate ? new Date(toDate + "T23:59:59.999").getTime() : Infinity;
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= fromMs && t <= toMs;
    };
    return {
      clicksInRange: clicks.filter(c => inRange(c.created_at)),
      earningsInRange: earnings.filter(e => inRange(e.created_at)),
    };
  }, [clicks, earnings, fromDate, toDate]);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const c of clicksInRange) {
      const path = c.landing_path || "/";
      const key = `${path}::${c.product_id ?? ""}`;
      let g = map.get(key);
      if (!g) {
        g = { path, productId: c.product_id, clicks: 0, lastClick: c.created_at, firstClick: c.created_at, orders: 0, profit: 0, approvedProfit: 0, topRef: c.referer };
        map.set(key, g);
      }
      g.clicks++;
      if (c.created_at > g.lastClick) g.lastClick = c.created_at;
      if (c.created_at < g.firstClick) g.firstClick = c.created_at;
      if (!g.topRef && c.referer) g.topRef = c.referer;
    }
    // attribute earnings by product_id (per-group)
    const earnByPid = new Map<string, Earning[]>();
    for (const e of earningsInRange) {
      const k = e.product_id ?? "";
      if (!earnByPid.has(k)) earnByPid.set(k, []);
      earnByPid.get(k)!.push(e);
    }
    for (const g of map.values()) {
      const pid = g.productId ?? "";
      const es = earnByPid.get(pid) ?? [];
      const orderIds = new Set(es.map(e => e.order_id));
      g.orders = orderIds.size;
      g.profit = es.reduce((s, e) => s + Number(e.profit), 0);
      g.approvedProfit = es.filter(e => e.status === "approved" || e.status === "paid").reduce((s, e) => s + Number(e.profit), 0);
    }
    return [...map.values()];
  }, [clicksInRange, earningsInRange]);

  const filtered = useMemo(() => {
    let list = groups;
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(g => g.path.toLowerCase().includes(s) || (g.productId ?? "").toLowerCase().includes(s));
    }
    const cmp: Record<typeof sortBy, (a: Group, b: Group) => number> = {
      clicks: (a, b) => b.clicks - a.clicks,
      orders: (a, b) => b.orders - a.orders || b.profit - a.profit,
      profit: (a, b) => b.profit - a.profit,
      recent: (a, b) => b.lastClick.localeCompare(a.lastClick),
    };
    return [...list].sort(cmp[sortBy]);
  }, [groups, q, sortBy]);

  const totals = useMemo(() => ({
    clicks: clicksInRange.length,
    orders: new Set(earningsInRange.map(e => e.order_id)).size,
    profit: earningsInRange.reduce((s, e) => s + Number(e.profit), 0),
    convRate: clicksInRange.length > 0 ? (new Set(earningsInRange.map(e => e.order_id)).size / clicksInRange.length) * 100 : 0,
  }), [clicksInRange, earningsInRange]);

  const fullUrl = (path: string) => {
    if (!ds) return path;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    // If path is already the store root, use canonical builder
    if (path === `/ds/${ds.store_slug}`) return buildDsLink(ds.store_slug, { origin });
    return `${origin}${path}`;
  };

  const copy = (path: string) => {
    const url = fullUrl(path);
    navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
  };

  if (loading && !ds) return <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Link History</h2>
        <button onClick={load} disabled={loading} className="ml-auto inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-bold hover:bg-muted">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi icon={<MousePointerClick className="h-4 w-4" />} label="Total clicks" value={totals.clicks} tone="blue" />
        <Kpi icon={<ShoppingBag className="h-4 w-4" />} label="Total orders" value={totals.orders} tone="emerald" />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Total profit" value={`৳${totals.profit.toFixed(0)}`} tone="amber" />
        <Kpi icon={<DollarSign className="h-4 w-4" />} label="Conversion" value={`${totals.convRate.toFixed(1)}%`} tone="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by path or product id"
            className="w-full rounded border px-7 py-1.5 text-xs" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="rounded border px-2 py-1.5 text-xs font-bold">
          <option value="recent">Most recent</option>
          <option value="clicks">Most clicks</option>
          <option value="orders">Most orders</option>
          <option value="profit">Highest profit</option>
        </select>
        <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length} link{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <span className="text-[11px] font-bold uppercase text-muted-foreground">Date range</span>
        <label className="flex items-center gap-1 text-[11px] font-bold">From
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} max={toDate || undefined}
            className="rounded border px-2 py-1 text-xs" />
        </label>
        <label className="flex items-center gap-1 text-[11px] font-bold">To
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} min={fromDate || undefined}
            className="rounded border px-2 py-1 text-xs" />
        </label>
        {[
          { label: "Today", days: 0 },
          { label: "7d", days: 6 },
          { label: "30d", days: 29 },
          { label: "90d", days: 89 },
        ].map(p => (
          <button key={p.label} type="button" onClick={() => {
            const to = new Date();
            const from = new Date(); from.setDate(from.getDate() - p.days);
            const fmt = (d: Date) => d.toISOString().slice(0, 10);
            setFromDate(fmt(from)); setToDate(fmt(to));
          }} className="rounded border px-2 py-1 text-[10px] font-bold hover:bg-muted">{p.label}</button>
        ))}
        {(fromDate || toDate) && (
          <button type="button" onClick={() => { setFromDate(""); setToDate(""); }}
            className="rounded border border-destructive/40 px-2 py-1 text-[10px] font-bold text-destructive hover:bg-destructive/10">Clear</button>
        )}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {clicksInRange.length} click{clicksInRange.length === 1 ? "" : "s"} · {new Set(earningsInRange.map(e => e.order_id)).size} order{new Set(earningsInRange.map(e => e.order_id)).size === 1 ? "" : "s"} in range
        </span>
      </div>


      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2 pl-3">Link / Path</th>
                <th className="p-2 text-right">Clicks</th>
                <th className="p-2 text-right">Orders</th>
                <th className="p-2 text-right">Profit</th>
                <th className="p-2 text-right">Approved</th>
                <th className="p-2 text-right">Conv.</th>
                <th className="p-2">Last click</th>
                <th className="p-2 pr-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                  {clicks.length === 0 ? "No clicks yet. Share your link to start tracking!" : "No links match your search."}
                </td></tr>
              ) : filtered.map(g => {
                const conv = g.clicks > 0 ? (g.orders / g.clicks) * 100 : 0;
                const isStore = ds && g.path === `/ds/${ds.store_slug}`;
                const key = `${g.path}::${g.productId ?? ""}`;
                const isOpen = expanded.has(key);
                // per-click matching to earnings by product_id + chronological order
                const groupClicks = clicksInRange
                  .filter(c => (c.landing_path || "/") === g.path && (c.product_id ?? "") === (g.productId ?? ""))
                  .sort((a, b) => b.created_at.localeCompare(a.created_at));
                const sortedEarnAsc = earningsInRange
                  .filter(e => (e.product_id ?? "") === (g.productId ?? ""))
                  .sort((a, b) => a.created_at.localeCompare(b.created_at));
                const clicksAsc = [...groupClicks].sort((a, b) => a.created_at.localeCompare(b.created_at));
                const used = new Set<string>();
                const clickToEarn = new Map<string, Earning>();
                for (const c of clicksAsc) {
                  const m = sortedEarnAsc.find(e => !used.has(e.id) && e.created_at >= c.created_at);
                  if (m) { used.add(m.id); clickToEarn.set(c.id, m); }
                }
                const unmatchedEarn = sortedEarnAsc.filter(e => !used.has(e.id));
                return (
                  <Fragment key={key}>
                  <tr key={key} className="border-t border-muted/40 align-top hover:bg-muted/30">
                    <td className="p-2 pl-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggleExpand(key)} className="rounded p-0.5 hover:bg-muted" title={isOpen ? "Collapse" : "Expand"}>
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                        {isStore && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">STORE</span>}
                        {g.productId && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">PRODUCT</span>}
                        <span className="font-mono text-[11px]">{g.path}</span>
                      </div>
                      {g.productId && <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">pid: {g.productId.slice(0, 12)}…</div>}
                      {g.topRef && <div className="mt-0.5 truncate max-w-[280px] text-[10px] text-muted-foreground">ref: {g.topRef}</div>}
                    </td>
                    <td className="p-2 text-right font-bold">{g.clicks}</td>
                    <td className="p-2 text-right font-bold text-emerald-700">{g.orders}</td>
                    <td className="p-2 text-right font-bold">৳{g.profit.toFixed(0)}</td>
                    <td className="p-2 text-right text-emerald-700">৳{g.approvedProfit.toFixed(0)}</td>
                    <td className="p-2 text-right">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${conv >= 5 ? "bg-emerald-100 text-emerald-700" : conv > 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                        {conv.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap text-[11px] text-muted-foreground">{new Date(g.lastClick).toLocaleString()}</td>
                    <td className="p-2 pr-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => copy(g.path)} title="Copy link" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold hover:bg-muted">
                          <Copy className="h-3 w-3" />Copy
                        </button>
                        <a href={fullUrl(g.path)} target="_blank" rel="noreferrer" title="Open" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-bold hover:bg-muted">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${key}::detail`} className="border-t border-muted/40 bg-muted/20">
                      <td colSpan={8} className="p-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border bg-card p-2">
                            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-muted-foreground">
                              <MousePointerClick className="h-3 w-3" /> Clicks ({groupClicks.length})
                            </div>
                            <div className="max-h-72 overflow-auto">
                              <table className="min-w-full text-[11px]">
                                <thead className="text-[9px] uppercase text-muted-foreground">
                                  <tr>
                                    <th className="p-1 text-left">Time</th>
                                    <th className="p-1 text-left">Referer</th>
                                    <th className="p-1 text-left">Matched order</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupClicks.length === 0 ? (
                                    <tr><td colSpan={3} className="p-2 text-center text-muted-foreground">No clicks</td></tr>
                                  ) : groupClicks.map(c => {
                                    const m = clickToEarn.get(c.id);
                                    return (
                                      <tr key={c.id} className="border-t border-muted/40 align-top">
                                        <td className="p-1 whitespace-nowrap">{new Date(c.created_at).toLocaleString()}</td>
                                        <td className="p-1 max-w-[220px] truncate text-muted-foreground" title={c.referer ?? ""}>{c.referer || "—"}</td>
                                        <td className="p-1">
                                          {m ? (
                                            <span className="inline-flex items-center gap-1">
                                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">CONVERTED</span>
                                              <span className="font-mono text-[10px]">#{m.order_id.slice(0, 8)}</span>
                                              <span className="text-[10px] text-muted-foreground">৳{Number(m.profit).toFixed(0)}</span>
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-muted-foreground">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="rounded-lg border bg-card p-2">
                            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase text-muted-foreground">
                              <ShoppingBag className="h-3 w-3" /> Orders ({sortedEarnAsc.length})
                            </div>
                            <div className="max-h-72 overflow-auto">
                              <table className="min-w-full text-[11px]">
                                <thead className="text-[9px] uppercase text-muted-foreground">
                                  <tr>
                                    <th className="p-1 text-left">Time</th>
                                    <th className="p-1 text-left">Order</th>
                                    <th className="p-1 text-left">Status</th>
                                    <th className="p-1 text-right">Profit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sortedEarnAsc.length === 0 ? (
                                    <tr><td colSpan={4} className="p-2 text-center text-muted-foreground">No orders</td></tr>
                                  ) : [...sortedEarnAsc].reverse().map(e => {
                                    const isUnmatched = unmatchedEarn.some(u => u.id === e.id);
                                    return (
                                      <tr key={e.id} className="border-t border-muted/40">
                                        <td className="p-1 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                                        <td className="p-1 font-mono text-[10px]">#{e.order_id.slice(0, 8)}</td>
                                        <td className="p-1">
                                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${e.status === "approved" || e.status === "paid" ? "bg-emerald-100 text-emerald-700" : e.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{e.status}</span>
                                          {isUnmatched && <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-[9px] font-bold text-orange-700" title="No preceding click in range">no-click</span>}
                                        </td>
                                        <td className="p-1 text-right font-bold">৳{Number(e.profit).toFixed(0)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      <p className="text-[11px] text-muted-foreground">
        Note: Conversion attribution matches clicks with completed orders by product. The base store link groups all orders that came without a specific product-page click.
      </p>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: "blue" | "emerald" | "amber" | "purple" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${tones}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase opacity-80">{icon}{label}</div>
      <div className="mt-1 text-lg font-extrabold">{value}</div>
    </div>
  );
}
