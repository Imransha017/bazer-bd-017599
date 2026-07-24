import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, ArrowUpDown, MousePointerClick, Loader2, Pause, Play, Download } from "lucide-react";

export const Route = createFileRoute("/sys-x7k9-control/related-clicks")({
  component: RelatedClicksPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Row = {
  id: string;
  created_at: string;
  user_id: string | null;
  props: {
    source_import_id?: string;
    target_import_id?: string;
    target_product_id?: string;
    matched_tags?: string[];
    overlap?: number;
    discount_pct?: number;
    profit?: number;
  } | null;
};

type SortKey = "created_at" | "overlap" | "discount_pct" | "profit" | "target_product_id" | "target_import_id";
type SortDir = "asc" | "desc";

function RelatedClicksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [autoRefresh, setAutoRefresh] = useState(0); // seconds; 0 = off
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const loadingRef = useRef(false);

  const load = async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setLoading(true);
    const { data } = await db.from("analytics_events")
      .select("id,created_at,user_id,props")
      .eq("event_name", "related_product_click")
      .order("created_at", { ascending: false })
      .limit(1000);
    setRows((data ?? []) as Row[]);
    setLastRefreshed(new Date());
    if (!silent) setLoading(false);
    loadingRef.current = false;
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [q, fromDate, toDate, pageSize]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, autoRefresh * 1000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "created_at" ? "desc" : "desc"); }
  };

  const quickRange = (days: number) => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setFromDate(fmt(from)); setToDate(fmt(to));
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const fromTs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
    const toTs = toDate ? new Date(toDate + "T23:59:59.999").getTime() : null;
    const base = rows.filter(r => {
      if (needle && !JSON.stringify(r.props ?? {}).toLowerCase().includes(needle)) return false;
      const ts = new Date(r.created_at).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      return true;
    });
    const get = (r: Row): string | number => {
      if (sortKey === "created_at") return r.created_at;
      if (sortKey === "target_product_id") return r.props?.target_product_id ?? "";
      if (sortKey === "target_import_id") return r.props?.target_import_id ?? "";
      return Number(r.props?.[sortKey] ?? 0);
    };
    const sorted = [...base].sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, q, sortKey, sortDir, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  const tagStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      for (const t of (r.props?.matched_tags ?? [])) {
        m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [filtered]);

  const productStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      const k = r.props?.target_product_id;
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const short = (s?: string | null) => (s ? `${s.slice(0, 8)}…` : "—");

  const exportCsv = (scope: "page" | "all") => {
    const source = scope === "page" ? pageRows : filtered;
    if (!source.length) return;
    const headers = [
      "created_at", "user_id", "source_import_id", "target_import_id",
      "target_product_id", "matched_tags", "overlap", "discount_pct", "profit",
    ];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    for (const r of source) {
      const p = r.props ?? {};
      lines.push([
        r.created_at, r.user_id ?? "",
        p.source_import_id ?? "", p.target_import_id ?? "",
        p.target_product_id ?? "",
        (p.matched_tags ?? []).join("|"),
        p.overlap ?? "", p.discount_pct ?? "", p.profit ?? "",
      ].map(esc).join(","));
    }
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const parts = [
      "related-clicks",
      scope === "page" ? `page${currentPage}` : "filtered",
      fromDate || "any", toDate || "any",
      q ? `q-${q.replace(/[^a-z0-9]+/gi, "_").slice(0, 24)}` : null,
      `${sortKey}-${sortDir}`,
      stamp,
    ].filter(Boolean);
    a.href = url; a.download = `${parts.join("_")}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MousePointerClick className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-extrabold">Related product clicks</h1>
          <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{filtered.length} / {rows.length}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tag / id"
            className="rounded-md border px-3 py-1.5 text-sm" />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">From</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="rounded-md border px-2 py-1.5" />
            <span className="text-slate-500">To</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="rounded-md border px-2 py-1.5" />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => quickRange(0)} className="rounded border px-2 py-1 text-[11px] hover:bg-slate-50">Today</button>
            <button onClick={() => quickRange(7)} className="rounded border px-2 py-1 text-[11px] hover:bg-slate-50">7d</button>
            <button onClick={() => quickRange(30)} className="rounded border px-2 py-1 text-[11px] hover:bg-slate-50">30d</button>
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(""); setToDate(""); }}
                className="rounded border px-2 py-1 text-[11px] hover:bg-slate-50 text-red-600">Clear</button>
            )}
          </div>
          <select value={autoRefresh} onChange={e => setAutoRefresh(Number(e.target.value))}
            title="Auto-refresh interval"
            className="rounded-md border px-2 py-1.5 text-xs">
            <option value={0}>Auto: Off</option>
            <option value={10}>Every 10s</option>
            <option value={30}>Every 30s</option>
            <option value={60}>Every 1m</option>
            <option value={300}>Every 5m</option>
          </select>
          {autoRefresh > 0 ? (
            <button onClick={() => setAutoRefresh(0)} title="Pause auto-refresh"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs text-amber-700 hover:bg-amber-50">
              <Pause className="h-3.5 w-3.5" /> Live
            </button>
          ) : (
            <button onClick={() => setAutoRefresh(30)} title="Start auto-refresh (30s)"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50">
              <Play className="h-3.5 w-3.5" /> Live
            </button>
          )}
          {lastRefreshed && (
            <span className="text-[10px] text-slate-500">Updated {lastRefreshed.toLocaleTimeString()}</span>
          )}
          <button onClick={() => load(false)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={() => exportCsv("page")}
            disabled={pageRows.length === 0}
            title="Download the currently visible page as CSV"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ><Download className="h-3.5 w-3.5" /> CSV (page · {pageRows.length})</button>
          <button
            onClick={() => exportCsv("all")}
            disabled={filtered.length === 0}
            title="Download all filtered + sorted results as CSV"
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ><Download className="h-3.5 w-3.5" /> CSV (all · {filtered.length})</button>
        </div>
      </div>


      <div className="grid gap-4 md:grid-cols-2">
        <RankWidget
          title="🏆 Top clicked tags"
          subtitle={`Ranking by related_product_click count · ${filtered.length} events`}
          items={tagStats}
          accent="from-amber-400 to-orange-500"
          renderLabel={(k) => <span className="font-semibold text-slate-800">{k}</span>}
        />
        <RankWidget
          title="🥇 Top clicked products"
          subtitle="Target product IDs ordered by clicks"
          items={productStats}
          accent="from-sky-400 to-indigo-500"
          renderLabel={(k) => <code className="truncate text-slate-700 text-[11px]">{k}</code>}
        />
      </div>


      <div className="overflow-auto rounded-xl border bg-card">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left">
            <tr>
              <Th label="When" onClick={() => toggleSort("created_at")} active={sortKey === "created_at"} dir={sortDir} />
              <Th label="Overlap" onClick={() => toggleSort("overlap")} active={sortKey === "overlap"} dir={sortDir} />
              <Th label="Discount %" onClick={() => toggleSort("discount_pct")} active={sortKey === "discount_pct"} dir={sortDir} />
              <Th label="Profit ৳" onClick={() => toggleSort("profit")} active={sortKey === "profit"} dir={sortDir} />
              <Th label="Product ID" onClick={() => toggleSort("target_product_id")} active={sortKey === "target_product_id"} dir={sortDir} />
              <Th label="Target Import" onClick={() => toggleSort("target_import_id")} active={sortKey === "target_import_id"} dir={sortDir} />
              <th className="px-3 py-2 font-semibold">Source Import</th>
              <th className="px-3 py-2 font-semibold">Matched Tags</th>
              <th className="px-3 py-2 font-semibold">User</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-3 py-8 text-center">
                <Loader2 className="inline h-4 w-4 animate-spin" /> Loading…
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No events yet.</td></tr>
            )}
            {!loading && pageRows.map(r => (
              <tr key={r.id} className="border-t hover:bg-slate-50/50">
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 font-bold">{r.props?.overlap ?? 0}</td>
                <td className="px-3 py-2 text-red-700 font-semibold">{r.props?.discount_pct ?? 0}%</td>
                <td className="px-3 py-2 text-emerald-700 font-semibold">৳{r.props?.profit ?? 0}</td>
                <td className="px-3 py-2"><code title={r.props?.target_product_id}>{short(r.props?.target_product_id)}</code></td>
                <td className="px-3 py-2"><code title={r.props?.target_import_id}>{short(r.props?.target_import_id)}</code></td>
                <td className="px-3 py-2"><code title={r.props?.source_import_id}>{short(r.props?.source_import_id)}</code></td>
                <td className="px-3 py-2 max-w-[240px]">
                  <div className="flex flex-wrap gap-1">
                    {(r.props?.matched_tags ?? []).slice(0, 4).map(t => (
                      <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">{t}</span>
                    ))}
                    {(r.props?.matched_tags ?? []).length > 4 && (
                      <span className="text-[10px] text-slate-500">+{(r.props?.matched_tags ?? []).length - 4}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2"><code title={r.user_id ?? ""}>{short(r.user_id)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
        <div className="text-slate-600">
          {filtered.length === 0 ? "0 results" : `Showing ${pageStart + 1}–${Math.min(pageStart + pageSize, filtered.length)} of ${filtered.length}`}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            <span className="text-slate-500">Per page</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
              className="rounded border px-2 py-1">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button disabled={currentPage <= 1} onClick={() => setPage(1)}
            className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-slate-50">« First</button>
          <button disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-slate-50">‹ Prev</button>
          <span className="px-2 font-semibold">Page {currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-slate-50">Next ›</button>
          <button disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}
            className="rounded border px-2 py-1 disabled:opacity-40 hover:bg-slate-50">Last »</button>
        </div>
      </div>
    </div>

  );
}

function Th({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: SortDir }) {
  return (
    <th className="px-3 py-2 font-semibold">
      <button onClick={onClick} className={`inline-flex items-center gap-1 ${active ? "text-primary" : "text-slate-700"}`}>
        {label} <ArrowUpDown className="h-3 w-3" />
        {active && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function RankWidget({ title, subtitle, items, accent, renderLabel }: {
  title: string;
  subtitle: string;
  items: [string, number][];
  accent: string;
  renderLabel: (key: string) => React.ReactNode;
}) {
  const total = items.reduce((s, [, n]) => s + n, 0);
  const max = items[0]?.[1] ?? 0;
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="text-sm font-extrabold text-slate-900">{title}</div>
        <div className="text-[10px] text-muted-foreground">{subtitle}</div>
      </div>
      {items.length === 0 && <div className="text-xs text-muted-foreground py-4 text-center">No data yet</div>}
      <ol className="space-y-1.5">
        {items.map(([k, n], i) => {
          const pct = max > 0 ? Math.round((n / max) * 100) : 0;
          const share = total > 0 ? ((n / total) * 100).toFixed(1) : "0";
          const medal = i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-600";
          return (
            <li key={k} className="flex items-center gap-2 text-xs">
              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${medal}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate">{renderLabel(k)}</div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900">×{n}</span>
                    <span className="text-[10px] text-slate-500">{share}%</span>
                  </div>
                </div>
                <div className="mt-0.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${accent}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

