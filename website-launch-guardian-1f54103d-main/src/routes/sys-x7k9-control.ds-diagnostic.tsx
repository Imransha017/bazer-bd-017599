import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListDropshippers,
  listMyImports,
  getDsCode,
  setDsCode,
  clearDsCode,
  trackDsClick,
  attributeOrderToDs,
  type Dropshipper,
  type DropshipperProduct,
} from "@/lib/dropshipper";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Cookie, MousePointerClick, ShoppingBag, DollarSign, Rocket, FileDown, FileText, Activity } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/sys-x7k9-control/ds-diagnostic")({
  head: () => ({ meta: [{ title: "Dropshipper E2E Test — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type StepState = "idle" | "running" | "ok" | "fail";
type Panel = { label: string; data: unknown; tone?: "before" | "after" | "response" | "delta" };
type Check = { ok: boolean; label: string; reason?: string; ids?: Record<string, string | number | null | undefined> };
type TimelineCall = { step: number; label: string; startAbs: number; endAbs: number; duration: number; status: "ok" | "fail"; error?: string };
type StepResult = { state: StepState; message?: string; panels?: Panel[]; checks?: Check[]; calls?: TimelineCall[] };

function TimelineChart({ calls, title = "API/RPC timeline" }: { calls: TimelineCall[]; title?: string }) {
  if (!calls.length) return null;
  const minAbs = Math.min(...calls.map(c => c.startAbs));
  const maxAbs = Math.max(...calls.map(c => c.endAbs));
  const span = Math.max(1, maxAbs - minAbs);
  const totalMs = Math.round(maxAbs - minAbs);
  const ticks = 5;
  return (
    <div className="mt-2 rounded-lg border-2 border-indigo-300 bg-indigo-50/60 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase text-indigo-800">
        <Activity className="h-3.5 w-3.5" />
        {title} — {calls.length} call{calls.length > 1 ? "s" : ""} · total {totalMs}ms
      </div>
      <div className="relative rounded bg-white/80 p-2">
        {/* tick grid */}
        <div className="pointer-events-none absolute inset-0 flex">
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-dashed border-slate-200 first:border-l-0" />
          ))}
        </div>
        <div className="relative space-y-1">
          {calls.map((c, i) => {
            const leftPct = ((c.startAbs - minAbs) / span) * 100;
            const widthPct = Math.max(0.5, (c.duration / span) * 100);
            const bar = c.status === "ok" ? "bg-emerald-500" : "bg-red-500";
            return (
              <div key={i} className="grid grid-cols-[110px_1fr_60px] items-center gap-2 text-[10px]">
                <div className="truncate font-mono text-slate-700" title={c.label}>
                  <span className="mr-1 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-bold text-slate-700">S{c.step}</span>
                  {c.label}
                </div>
                <div className="relative h-4 rounded bg-slate-100">
                  <div
                    className={`absolute top-0 h-4 rounded ${bar} shadow-sm`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={`${c.label} — ${c.duration.toFixed(1)}ms · ${c.status}`}
                  />
                </div>
                <div className={`text-right font-mono ${c.status === "ok" ? "text-emerald-800" : "text-red-800"}`}>
                  {c.duration.toFixed(1)}ms
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] font-mono text-slate-500">
          <span>0ms</span>
          <span>{Math.round(totalMs / 2)}ms</span>
          <span>{totalMs}ms</span>
        </div>
      </div>
    </div>
  );
}

const toneClass = (t?: Panel["tone"]) =>
  t === "before" ? "border-slate-300 bg-slate-50"
  : t === "after" ? "border-sky-300 bg-sky-50"
  : t === "response" ? "border-purple-300 bg-purple-50"
  : t === "delta" ? "border-emerald-300 bg-emerald-50"
  : "border-slate-200 bg-white";

const toneLabel = (t?: Panel["tone"]) =>
  t === "before" ? "text-slate-700"
  : t === "after" ? "text-sky-800"
  : t === "response" ? "text-purple-800"
  : t === "delta" ? "text-emerald-800"
  : "text-slate-700";

function StepCard({
  n, title, icon: Icon, result, onRun, disabled, runLabel,
}: {
  n: number; title: string; icon: React.ComponentType<{ className?: string }>;
  result: StepResult; onRun: () => void; disabled?: boolean; runLabel: string;
}) {
  const color = result.state === "ok" ? "border-emerald-400 bg-emerald-50/40"
    : result.state === "fail" ? "border-red-400 bg-red-50/40"
    : result.state === "running" ? "border-amber-400 bg-amber-50/40"
    : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm transition ${color}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-purple-900 text-sm font-black text-amber-300">
          {n}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-purple-700" />
            <h3 className="text-sm font-extrabold">{title}</h3>
            {result.state === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {result.state === "fail" && <XCircle className="h-4 w-4 text-red-600" />}
            {result.state === "running" && <Loader2 className="h-4 w-4 animate-spin text-amber-600" />}
          </div>
          {result.message && (
            <p className={`mt-1 text-xs ${result.state === "fail" ? "text-red-700" : "text-slate-600"}`}>{result.message}</p>
          )}
          {result.checks && result.checks.length > 0 && (() => {
            const failed = result.checks.filter(c => !c.ok);
            const passed = result.checks.length - failed.length;
            const anyFail = failed.length > 0;
            return (
              <div className={`mt-2 rounded-lg border-2 p-2 ${anyFail ? "border-red-400 bg-red-50" : "border-emerald-400 bg-emerald-50"}`}>
                <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase ${anyFail ? "text-red-800" : "text-emerald-800"}`}>
                  {anyFail ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Validation checks — {passed}/{result.checks.length} passed
                  {anyFail && <span className="ml-1 rounded bg-red-600 px-1.5 py-0.5 text-[9px] text-white">{failed.length} FAILED</span>}
                </div>
                <ul className="space-y-1">
                  {result.checks.map((c, i) => (
                    <li key={i} className={`rounded border px-2 py-1 text-[11px] ${c.ok ? "border-emerald-200 bg-white/80" : "border-red-300 bg-red-100/70 ring-1 ring-red-300"}`}>
                      <div className="flex items-start gap-1.5">
                        {c.ok
                          ? <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                          : <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-600" />}
                        <div className="min-w-0 flex-1">
                          <div className={`font-bold ${c.ok ? "text-emerald-900" : "text-red-900"}`}>{c.label}</div>
                          {!c.ok && c.reason && (
                            <div className="mt-0.5 text-red-800">⚠ {c.reason}</div>
                          )}
                          {c.ids && Object.keys(c.ids).length > 0 && (
                            <div className="mt-0.5 flex flex-wrap gap-1">
                              {Object.entries(c.ids).map(([k, v]) => (
                                <span key={k} className={`rounded px-1.5 py-0.5 font-mono text-[9px] ${c.ok ? "bg-slate-100 text-slate-700" : "bg-red-200 text-red-900"}`}>
                                  {k}: {v == null || v === "" ? "—" : String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          {result.calls && result.calls.length > 0 && (
            <TimelineChart calls={result.calls} />
          )}
          {result.panels && result.panels.length > 0 && (
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {result.panels.map((p, i) => (
                <div key={i} className={`rounded-md border p-2 ${toneClass(p.tone)}`}>
                  <div className={`mb-1 text-[10px] font-extrabold uppercase tracking-wide ${toneLabel(p.tone)}`}>
                    {p.tone && <span className="mr-1 rounded bg-white/70 px-1 py-0.5 text-[9px]">{p.tone}</span>}
                    {p.label}
                  </div>
                  <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-2 text-[10px] leading-relaxed text-emerald-200">
{JSON.stringify(p.data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={disabled || result.state === "running"}
          className="shrink-0 rounded-lg bg-purple-900 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-purple-800 disabled:opacity-40"
        >
          {result.state === "running" ? "Running…" : runLabel}
        </button>
      </div>
    </div>
  );
}

function Page() {
  const [dsList, setDsList] = useState<Dropshipper[]>([]);
  const [dsId, setDsId] = useState<string>("");
  const [imports, setImports] = useState<DropshipperProduct[]>([]);
  const [importId, setImportId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [s1, setS1] = useState<StepResult>({ state: "idle" });
  const [s2, setS2] = useState<StepResult>({ state: "idle" });
  const [s3, setS3] = useState<StepResult>({ state: "idle" });
  const [s4, setS4] = useState<StepResult>({ state: "idle" });
  const [orderId, setOrderId] = useState<string | null>(null);
  const [totalsBefore, setTotalsBefore] = useState<{ total_orders: number; total_earned: number } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await adminListDropshippers("approved");
      setDsList(list);
      if (list[0]) setDsId(list[0].id);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setImports([]); setImportId("");
      if (!dsId) return;
      const imps = await listMyImports(dsId);
      const active = imps.filter(i => i.is_active);
      setImports(active);
      if (active[0]) setImportId(active[0].id);
    })();
  }, [dsId]);

  const ds = dsList.find(d => d.id === dsId) ?? null;
  const imp = imports.find(i => i.id === importId) ?? null;

  const [autoRunning, setAutoRunning] = useState(false);
  const [summary, setSummary] = useState<null | {
    started_at: string;
    finished_at: string;
    duration_ms: number;
    results: Array<{ step: number; name: string; state: StepState; message?: string }>;
    ok: boolean;
  }>(null);

  const [timeline, setTimeline] = useState<TimelineCall[]>([]);

  // Wrap an async call to capture timing/status into per-step + global timeline
  const mkTrack = (step: number, bucket: TimelineCall[]) =>
    async <T,>(label: string, fn: () => Promise<T> | T): Promise<T> => {
      const startAbs = performance.now();
      try {
        const r = await fn();
        const endAbs = performance.now();
        const call: TimelineCall = { step, label, startAbs, endAbs, duration: endAbs - startAbs, status: "ok" };
        bucket.push(call);
        setTimeline(t => [...t, call]);
        return r;
      } catch (e) {
        const endAbs = performance.now();
        const call: TimelineCall = { step, label, startAbs, endAbs, duration: endAbs - startAbs, status: "fail", error: (e as Error).message };
        bucket.push(call);
        setTimeline(t => [...t, call]);
        throw e;
      }
    };

  const resetAll = () => {
    clearDsCode();
    setS1({ state: "idle" }); setS2({ state: "idle" }); setS3({ state: "idle" }); setS4({ state: "idle" });
    setOrderId(null); setTotalsBefore(null); setSummary(null); setTimeline([]);
    toast.success("Reset — cookie cleared, steps cleared");
  };

  // Step 1 — set ds_ref cookie: capture before/after localStorage snapshot
  const runStep1 = async () => {
    if (!ds) return;
    setS1({ state: "running" });
    const calls: TimelineCall[] = [];
    const track = mkTrack(1, calls);
    try {
      const before = await track("read localStorage BEFORE", () => ({
        ds_ref: getDsCode(),
        ds_ref_exp: localStorage.getItem("ds_ref_exp"),
      }));
      await track("setDsCode() write", () => { setDsCode(ds.code, 30); });
      const after = await track("read localStorage AFTER", () => ({
        ds_ref: getDsCode(),
        ds_ref_exp_raw: localStorage.getItem("ds_ref_exp"),
        ds_ref_exp_iso: new Date(Number(localStorage.getItem("ds_ref_exp"))).toISOString(),
      }));
      if (after.ds_ref !== ds.code) throw new Error(`Read back mismatch: got ${after.ds_ref}`);
      const delta = {
        ds_ref_changed: before.ds_ref !== after.ds_ref,
        from: before.ds_ref, to: after.ds_ref,
      };
      setS1({
        state: "ok",
        message: `ds_ref set to "${ds.code}" for 30 days`,
        calls,
        panels: [
          { label: "localStorage BEFORE", data: before, tone: "before" },
          { label: "setDsCode() call", data: { code: ds.code, days: 30 }, tone: "response" },
          { label: "localStorage AFTER", data: after, tone: "after" },
          { label: "Delta", data: delta, tone: "delta" },
        ],
      });
    } catch (e) {
      setS1({ state: "fail", message: (e as Error).message, calls });
    }
  };

  // Step 2 — track click + verify row: snapshot count before, RPC response, row after, delta
  const runStep2 = async () => {
    if (!ds) return;
    setS2({ state: "running" });
    const calls: TimelineCall[] = [];
    const track = mkTrack(2, calls);
    try {
      const beforeAt = new Date().toISOString();
      const cBeforeRes = await track("SELECT count(clicks) BEFORE", () =>
        db.from("dropshipper_clicks").select("*", { count: "exact", head: true }).eq("dropshipper_id", ds.id));
      const cBefore = cBeforeRes.count as number | null;

      const rpcResp = await track("RPC track_dropshipper_click", () => trackDsClick(ds.code, imp?.product_id ?? null));

      const newRowsRes = await track("SELECT new click row", () =>
        db.from("dropshipper_clicks").select("*").eq("dropshipper_id", ds.id)
          .gte("created_at", beforeAt).order("created_at", { ascending: false }).limit(1));
      if (newRowsRes.error) throw newRowsRes.error;
      const newRows = newRowsRes.data as Array<Record<string, unknown>> | null;
      if (!newRows?.length) throw new Error("track_dropshipper_click returned no row (RLS or RPC issue)");

      const cAfterRes = await track("SELECT count(clicks) AFTER", () =>
        db.from("dropshipper_clicks").select("*", { count: "exact", head: true }).eq("dropshipper_id", ds.id));
      const cAfter = cAfterRes.count as number | null;

      const newRow = newRows[0] as { id?: string; dropshipper_id?: string; product_id?: string | null };
      const added = (cAfter ?? 0) - (cBefore ?? 0);
      const checks: Check[] = [
        { ok: added >= 1, label: "Click count বেড়েছে (>=1)",
          reason: added < 1 ? `Count আগে ${cBefore ?? 0}, পরে ${cAfter ?? 0} — কোনো নতুন row যোগ হয়নি` : undefined,
          ids: { before: cBefore ?? 0, after: cAfter ?? 0, delta: added } },
        { ok: !!newRow?.id, label: "নতুন dropshipper_clicks row তৈরি হয়েছে",
          reason: !newRow?.id ? "RLS বা RPC কোনো row ফেরত দেয়নি" : undefined,
          ids: { click_id: newRow?.id ?? null, dropshipper_id: newRow?.dropshipper_id ?? null } },
        { ok: newRow?.dropshipper_id === ds.id, label: "Click সঠিক dropshipper-এ attributed",
          reason: newRow?.dropshipper_id !== ds.id ? `expected ${ds.id}, got ${newRow?.dropshipper_id ?? "null"}` : undefined,
          ids: { expected: ds.id, actual: newRow?.dropshipper_id ?? null } },
        ...(imp?.product_id ? [{
          ok: newRow?.product_id === imp.product_id, label: "Product_id সঠিকভাবে সংরক্ষিত",
          reason: newRow?.product_id !== imp.product_id ? `expected ${imp.product_id}, got ${newRow?.product_id ?? "null"}` : undefined,
          ids: { expected: imp.product_id, actual: newRow?.product_id ?? null },
        } as Check] : []),
      ];
      const allOk = checks.every(c => c.ok);
      if (!allOk) toast.warning(`Step 2: ${checks.filter(c => !c.ok).length}টি validation ফেল`);

      setS2({
        state: allOk ? "ok" : "fail",
        message: allOk ? "Click logged in dropshipper_clicks" : "Click logged কিন্তু validation ফেল হয়েছে — নিচে দেখুন",
        checks,
        calls,
        panels: [
          { label: "click count BEFORE", data: { total: cBefore ?? 0, at: beforeAt }, tone: "before" },
          { label: "trackDsClick() RPC response", data: { returned: rpcResp ?? null }, tone: "response" },
          { label: "new click row (AFTER)", data: newRow, tone: "after" },
          { label: "Delta", data: { count_before: cBefore ?? 0, count_after: cAfter ?? 0, added }, tone: "delta" },
        ],
      });
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(`Step 2 ব্যর্থ: ${msg}`);
      setS2({ state: "fail", message: msg, calls, checks: [{ ok: false, label: "Track click execution", reason: msg }] });
    }
  };

  // Step 3 — place test order: snapshot orders count/dropshipper totals before, RPC response, row after
  const runStep3 = async (): Promise<string | null> => {
    if (!ds || !imp) return null;
    setS3({ state: "running" });
    const calls: TimelineCall[] = [];
    const track = mkTrack(3, calls);
    try {
      const dsRowRes = await track("SELECT dropshipper totals BEFORE", () =>
        db.from("dropshippers").select("total_orders,total_earned").eq("id", ds.id).maybeSingle());
      const dsRow = dsRowRes.data as { total_orders: number; total_earned: number } | null;
      setTotalsBefore(dsRow ?? null);
      const ordCountBeforeRes = await track("SELECT count(orders) BEFORE", () =>
        db.from("orders").select("*", { count: "exact", head: true }));
      const ordCountBefore = ordCountBeforeRes.count as number | null;

      const pRes = await track("SELECT product for payload", () =>
        db.from("products").select("id,name,price,image").eq("id", imp.product_id).maybeSingle());
      if (pRes.error) throw pRes.error;
      const p = pRes.data as { id: string; name: string; price: number; image: string } | null;
      if (!p) throw new Error("Product not found");

      const retail = Number(imp.retail_price);
      const payload = {
        customer_name: `E2E Test ${new Date().toISOString().slice(11, 19)}`,
        customer_phone: "01700000000",
        address: "E2E Test Address, Dhaka",
        district: "Dhaka",
        thana: "Dhanmondi",
        items: [{ id: p.id, name: p.name, price: retail, qty: 1, image: p.image }],
        subtotal: retail,
        delivery_fee: 0,
        total: retail,
        payment_method: "cod",
        notes: `E2E diagnostic — dropshipper ${ds.code}`,
      };
      const orderRes = await track("RPC place_order", () => db.rpc("place_order", { _payload: payload }));
      if (orderRes.error) throw orderRes.error;
      const row = Array.isArray(orderRes.data) ? orderRes.data[0] : orderRes.data;
      if (!row?.id) throw new Error("place_order returned no id");
      setOrderId(row.id);

      const orderRowRes = await track("SELECT new order row", () =>
        db.from("orders").select("*").eq("id", row.id).maybeSingle());
      const orderRow = orderRowRes.data;
      const ordCountAfterRes = await track("SELECT count(orders) AFTER", () =>
        db.from("orders").select("*", { count: "exact", head: true }));
      const ordCountAfter = ordCountAfterRes.count as number | null;

      const ordAdded = (ordCountAfter ?? 0) - (ordCountBefore ?? 0);
      const items = (orderRow as { items?: unknown[] } | null)?.items ?? [];
      const orderTotal = Number((orderRow as { total?: number } | null)?.total ?? 0);
      const checks: Check[] = [
        { ok: !!row?.id, label: "place_order একটি valid order id ফেরত দিয়েছে",
          reason: !row?.id ? "RPC null/empty id ফেরত দিয়েছে" : undefined,
          ids: { order_id: row?.id ?? null, order_number: row?.order_number ?? null } },
        { ok: ordAdded === 1, label: "orders টেবিলে ঠিক ১টি নতুন row",
          reason: ordAdded !== 1 ? `expected +1, got +${ordAdded}` : undefined,
          ids: { before: ordCountBefore ?? 0, after: ordCountAfter ?? 0 } },
        { ok: !!orderRow, label: "নতুন order টি পড়া গেছে (RLS ok)",
          reason: !orderRow ? "orders থেকে row লোড হয়নি — RLS policy চেক করুন" : undefined,
          ids: { order_id: row?.id ?? null } },
        { ok: Array.isArray(items) && items.length > 0, label: "Items সঠিকভাবে সংরক্ষিত",
          reason: !(Array.isArray(items) && items.length > 0) ? "items array খালি" : undefined,
          ids: { count: Array.isArray(items) ? items.length : 0 } },
        { ok: Math.abs(orderTotal - retail) < 0.01, label: "Order total = retail",
          reason: Math.abs(orderTotal - retail) >= 0.01 ? `expected ৳${retail}, stored ৳${orderTotal}` : undefined,
          ids: { expected: retail, stored: orderTotal } },
      ];
      const allOk = checks.every(c => c.ok);
      if (!allOk) toast.warning(`Step 3: ${checks.filter(c => !c.ok).length}টি validation ফেল`);

      setS3({
        state: allOk ? "ok" : "fail",
        message: allOk ? `Order created: #${row.order_number}` : `Order তৈরি হয়েছে (#${row.order_number}) কিন্তু validation ফেল`,
        checks,
        calls,
        panels: [
          { label: "dropshipper totals BEFORE", data: dsRow ?? {}, tone: "before" },
          { label: "orders count BEFORE", data: { total: ordCountBefore ?? 0 }, tone: "before" },
          { label: "place_order RPC payload", data: payload, tone: "response" },
          { label: "place_order RPC response", data: row, tone: "response" },
          { label: "orders row AFTER", data: orderRow, tone: "after" },
          { label: "Delta", data: { orders_added: ordAdded, new_order_id: row.id }, tone: "delta" },
        ],
      });
      return row.id as string;
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(`Step 3 ব্যর্থ: ${msg}`);
      setS3({ state: "fail", message: msg, calls, checks: [{ ok: false, label: "place_order execution", reason: msg }] });
      return null;
    }
  };

  // Step 4 — attribute + verify earnings row & totals delta
  const runStep4 = async (overrideOrderId?: string) => {
    const oid = overrideOrderId ?? orderId;
    if (!ds || !imp || !oid) return;
    setS4({ state: "running" });
    const calls: TimelineCall[] = [];
    const track = mkTrack(4, calls);
    try {
      const pRes = await track("SELECT product base price", () =>
        db.from("products").select("price").eq("id", imp.product_id).maybeSingle());
      const base = Number((pRes.data as { price?: number } | null)?.price ?? 0);
      const retail = Number(imp.retail_price);

      // Snapshots BEFORE
      const earnBeforeRes = await track("SELECT earnings BEFORE", () =>
        db.from("dropshipper_earnings").select("*").eq("order_id", oid).eq("dropshipper_id", ds.id));
      const earnBefore = earnBeforeRes.data as Array<Record<string, unknown>> | null;
      const dsBeforeRes = await track("SELECT dropshippers totals BEFORE", () =>
        db.from("dropshippers").select("total_orders,total_earned").eq("id", ds.id).maybeSingle());
      const dsBefore = dsBeforeRes.data as { total_orders: number; total_earned: number } | null;
      const orderBeforeRes = await track("SELECT order attribution BEFORE", () =>
        db.from("orders").select("id,order_number,dropshipper_id,dropshipper_code,dropshipper_profit").eq("id", oid).maybeSingle());
      const orderBefore = orderBeforeRes.data as { id: string; order_number: string; dropshipper_id: string | null; dropshipper_code: string | null; dropshipper_profit: number | null } | null;

      const attrPayload = [{ product_id: imp.product_id, base_price: base, retail_price: retail, qty: 1 }];
      const attrResp = await track("RPC attribute_order_to_dropshipper", () => attributeOrderToDs(oid, ds.code, attrPayload));

      // Snapshots AFTER
      const earnAfterRes = await track("SELECT earnings AFTER", () =>
        db.from("dropshipper_earnings").select("*").eq("order_id", oid).eq("dropshipper_id", ds.id));
      if (earnAfterRes.error) throw earnAfterRes.error;
      const earnAfter = (earnAfterRes.data ?? []) as Array<Record<string, unknown>>;

      const dsAfterRes = await track("SELECT dropshippers totals AFTER", () =>
        db.from("dropshippers").select("total_orders,total_earned").eq("id", ds.id).maybeSingle());
      const dsAfter = dsAfterRes.data as { total_orders: number; total_earned: number } | null;
      const orderAfterRes = await track("SELECT order attribution AFTER", () =>
        db.from("orders").select("id,order_number,dropshipper_id,dropshipper_code,dropshipper_profit").eq("id", oid).maybeSingle());
      const orderAfter = orderAfterRes.data as { id: string; order_number: string; dropshipper_id: string | null; dropshipper_code: string | null; dropshipper_profit: number | null } | null;

      const profitSum = (earnAfter as Array<{ profit: number }>).reduce((s, r) => s + Number(r.profit), 0);
      const rowsAdded = earnAfter.length - (earnBefore?.length ?? 0);
      const ordersDelta = (dsAfter?.total_orders ?? 0) - (dsBefore?.total_orders ?? 0);
      const earnedDelta = Number(dsAfter?.total_earned ?? 0) - Number(dsBefore?.total_earned ?? 0);
      const profitBefore = Number(orderBefore?.dropshipper_profit ?? 0);
      const profitAfter = Number(orderAfter?.dropshipper_profit ?? 0);
      const expectedProfit = (retail - base) * 1;
      const firstEarn = earnAfter[0] as { id?: string; profit?: number } | undefined;

      const delta = {
        earnings_rows: { before: earnBefore?.length ?? 0, after: earnAfter.length, added: rowsAdded },
        dropshipper_totals: { orders_delta: ordersDelta, earned_delta: earnedDelta },
        order_attribution: {
          dropshipper_id_changed: orderBefore?.dropshipper_id !== orderAfter?.dropshipper_id,
          code_before: orderBefore?.dropshipper_code ?? null,
          code_after: orderAfter?.dropshipper_code ?? null,
          profit_before: profitBefore, profit_after: profitAfter,
        },
        profit_recorded: profitSum, expected_profit: expectedProfit,
        totals_before_step3: totalsBefore,
      };

      const checks: Check[] = [
        { ok: rowsAdded >= 1, label: "dropshipper_earnings-এ নতুন row যোগ হয়েছে",
          reason: rowsAdded < 1 ? "কোনো earnings row insert হয়নি — attribute_order_to_dropshipper RPC চেক করুন" : undefined,
          ids: { earnings_before: earnBefore?.length ?? 0, earnings_after: earnAfter.length, earning_id: firstEarn?.id ?? null } },
        { ok: orderAfter?.dropshipper_id === ds.id, label: "orders.dropshipper_id আপডেট হয়েছে",
          reason: orderAfter?.dropshipper_id !== ds.id ? `expected ${ds.id}, got ${orderAfter?.dropshipper_id ?? "null"}` : undefined,
          ids: { order_id: oid, expected: ds.id, actual: orderAfter?.dropshipper_id ?? null } },
        { ok: orderAfter?.dropshipper_code === ds.code, label: "orders.dropshipper_code আপডেট হয়েছে",
          reason: orderAfter?.dropshipper_code !== ds.code ? `expected ${ds.code}, got ${orderAfter?.dropshipper_code ?? "null"}` : undefined,
          ids: { expected: ds.code, actual: orderAfter?.dropshipper_code ?? null } },
        { ok: profitAfter > 0, label: "orders.dropshipper_profit > 0",
          reason: profitAfter <= 0 ? `profit=${profitAfter} — retail/base price ঠিক আছে?` : undefined,
          ids: { profit_before: profitBefore, profit_after: profitAfter } },
        { ok: Math.abs(profitSum - profitAfter) < 0.01, label: "earnings.profit যোগফল = orders.dropshipper_profit",
          reason: Math.abs(profitSum - profitAfter) >= 0.01 ? `sum ৳${profitSum} ≠ order profit ৳${profitAfter}` : undefined,
          ids: { earnings_sum: profitSum, order_profit: profitAfter } },
        { ok: Math.abs(profitSum - expectedProfit) < 0.01, label: `Profit expected = ৳${expectedProfit.toFixed(0)}`,
          reason: Math.abs(profitSum - expectedProfit) >= 0.01 ? `recorded ৳${profitSum}, expected ৳${expectedProfit}` : undefined,
          ids: { retail, base, recorded: profitSum, expected: expectedProfit } },
        { ok: ordersDelta >= 1, label: "dropshippers.total_orders বেড়েছে",
          reason: ordersDelta < 1 ? `delta=${ordersDelta} — dropshippers row update trigger চেক করুন` : undefined,
          ids: { before: dsBefore?.total_orders ?? 0, after: dsAfter?.total_orders ?? 0 } },
        { ok: Math.abs(earnedDelta - profitSum) < 0.01, label: "dropshippers.total_earned delta = profit_recorded",
          reason: Math.abs(earnedDelta - profitSum) >= 0.01 ? `earned delta ৳${earnedDelta} ≠ profit ৳${profitSum}` : undefined,
          ids: { earned_delta: earnedDelta, profit_sum: profitSum, ds_id: ds.id } },
      ];
      const failedCount = checks.filter(c => !c.ok).length;
      const allOk = failedCount === 0;
      if (!allOk) toast.error(`Step 4: ${failedCount}টি ভ্যালিডেশন ফেল হয়েছে — নিচে বিস্তারিত দেখুন`);

      setS4({
        state: allOk ? "ok" : "fail",
        message: allOk
          ? `Attributed. Profit recorded: ৳${profitSum.toFixed(0)}`
          : `Attribution/earnings validation ফেল (${failedCount}/${checks.length}) — order ${oid}`,
        checks,
        calls,
        panels: [
          { label: "dropshipper_earnings BEFORE", data: earnBefore ?? [], tone: "before" },
          { label: "dropshippers totals BEFORE", data: dsBefore ?? {}, tone: "before" },
          { label: "orders attribution BEFORE", data: orderBefore ?? {}, tone: "before" },
          { label: "attributeOrderToDs() payload", data: { oid, code: ds.code, items: attrPayload }, tone: "response" },
          { label: "attributeOrderToDs() response", data: { returned: attrResp ?? null }, tone: "response" },
          { label: "dropshipper_earnings AFTER", data: earnAfter, tone: "after" },
          { label: "dropshippers totals AFTER", data: dsAfter ?? {}, tone: "after" },
          { label: "orders attribution AFTER", data: orderAfter ?? {}, tone: "after" },
          { label: "Delta (validated)", data: delta, tone: "delta" },
        ],
      });
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(`Step 4 ব্যর্থ: ${msg}`);
      setS4({
        state: "fail", message: msg, calls,
        checks: [{ ok: false, label: "attributeOrderToDs() execution", reason: msg, ids: { order_id: oid, code: ds.code } }],
      });
    }
  };

  // Run every step sequentially and collect a summary
  const runAll = async () => {
    if (!ds || !imp) {
      toast.error("Approved dropshipper ও active import সিলেক্ট করুন");
      return;
    }
    setAutoRunning(true);
    setSummary(null);
    // clean slate so before/after snapshots are meaningful
    clearDsCode();
    setS1({ state: "idle" }); setS2({ state: "idle" }); setS3({ state: "idle" }); setS4({ state: "idle" });
    setOrderId(null); setTotalsBefore(null); setTimeline([]);

    const started = performance.now();
    const startedIso = new Date().toISOString();
    const results: Array<{ step: number; name: string; state: StepState; message?: string }> = [];

    const snap = (n: number, name: string, r: StepResult) => {
      results.push({ step: n, name, state: r.state, message: r.message });
    };

    try {
      await runStep1();
      // read-back via setter callback pattern isn't available; peek localStorage
      const s1ok = getDsCode() === ds.code;
      snap(1, "Set ds_ref cookie", { state: s1ok ? "ok" : "fail", message: s1ok ? "cookie set" : "cookie not set" });
      if (!s1ok) throw new Error("Step 1 failed");

      await runStep2();
      // Confirm click row exists for this dropshipper (best-effort)
      const { data: clk } = await db.from("dropshipper_clicks")
        .select("id").eq("dropshipper_id", ds.id).order("created_at", { ascending: false }).limit(1);
      const s2ok = !!clk?.length;
      snap(2, "Track click", { state: s2ok ? "ok" : "fail", message: s2ok ? "click logged" : "no click row" });
      if (!s2ok) throw new Error("Step 2 failed");

      const newOrderId = await runStep3();
      const s3ok = !!newOrderId;
      snap(3, "Place order", { state: s3ok ? "ok" : "fail", message: s3ok ? `order ${newOrderId}` : "no order id" });
      if (!s3ok || !newOrderId) throw new Error("Step 3 failed");

      await runStep4(newOrderId);
      const { data: earn } = await db.from("dropshipper_earnings")
        .select("id,profit").eq("order_id", newOrderId).eq("dropshipper_id", ds.id);
      const s4ok = !!earn?.length;
      const profit = (earn ?? []).reduce((s: number, r: { profit: number }) => s + Number(r.profit), 0);
      snap(4, "Attribute & verify", { state: s4ok ? "ok" : "fail", message: s4ok ? `profit ৳${profit.toFixed(0)}` : "no earnings row" });
      if (!s4ok) throw new Error("Step 4 failed");

      const ended = performance.now();
      setSummary({
        started_at: startedIso,
        finished_at: new Date().toISOString(),
        duration_ms: Number((ended - started).toFixed(0)),
        results,
        ok: true,
      });
      toast.success(`E2E ফ্লো সফল — ৪টি ধাপই পাস (${((ended - started) / 1000).toFixed(1)}s)`);
    } catch (e) {
      const ended = performance.now();
      setSummary({
        started_at: startedIso,
        finished_at: new Date().toISOString(),
        duration_ms: Number((ended - started).toFixed(0)),
        results,
        ok: false,
      });
      toast.error(`E2E ফ্লো ব্যর্থ — ${(e as Error).message}`);
    } finally {
      setAutoRunning(false);
    }
  };

  // ---- Export helpers (CSV + PDF of all step panels) ----
  const steps: Array<{ n: number; title: string; result: StepResult }> = [
    { n: 1, title: "Set ds_ref cookie (localStorage)", result: s1 },
    { n: 2, title: "Track click (track_dropshipper_click RPC)", result: s2 },
    { n: 3, title: "Place test order (place_order RPC)", result: s3 },
    { n: 4, title: "Attribute order + verify dropshipper_earnings", result: s4 },
  ];
  const hasAnyResult = steps.some(s => s.result.state !== "idle");

  const buildFilename = (ext: string) => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const code = ds?.code ?? "ds";
    return `ds-diagnostic_${code}_${ts}.${ext}`;
  };

  const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const exportCsv = () => {
    if (!hasAnyResult) { toast.error("এক্সপোর্টের আগে অন্তত একটি ধাপ চালান"); return; }
    const rows: string[] = [];
    rows.push(["step", "step_title", "state", "message", "panel_tone", "panel_label", "data_json"].map(csvEscape).join(","));
    for (const s of steps) {
      const st = s.result;
      if (st.state === "idle") continue;
      const panels = st.panels && st.panels.length ? st.panels : [{ label: "(no panels)", data: null, tone: undefined as Panel["tone"] }];
      for (const p of panels) {
        rows.push([
          String(s.n),
          s.title,
          st.state,
          st.message ?? "",
          p.tone ?? "",
          p.label,
          JSON.stringify(p.data),
        ].map(csvEscape).join(","));
      }
    }
    if (summary) {
      rows.push("");
      rows.push(["step", "step_title", "state", "message", "panel_tone", "panel_label", "data_json"].map(csvEscape).join(","));
      for (const r of summary.results) {
        rows.push([String(r.step), `SUMMARY: ${r.name}`, r.state, r.message ?? "", "summary", "auto-run", JSON.stringify({ duration_ms: summary.duration_ms, ok: summary.ok })].map(csvEscape).join(","));
      }
    }
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = buildFilename("csv");
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV এক্সপোর্ট সম্পন্ন");
  };

  const exportPdf = () => {
    if (!hasAnyResult) { toast.error("এক্সপোর্টের আগে অন্তত একটি ধাপ চালান"); return; }
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 36;
    let y = margin;

    const ensure = (h: number) => {
      if (y + h > pageH - margin) { doc.addPage(); y = margin; }
    };
    const writeLines = (text: string, size: number, style: "normal" | "bold" = "normal", color: [number, number, number] = [30, 30, 30]) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      for (const ln of lines) {
        ensure(size + 2);
        doc.text(ln, margin, y);
        y += size + 2;
      }
    };

    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(60, 20, 120);
    ensure(20); doc.text("Dropshipper E2E Diagnostic Report", margin, y); y += 20;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    ensure(14); doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 14;
    if (ds) { ensure(14); doc.text(`Dropshipper: ${ds.store_name} · code ${ds.code} · /ds/${ds.store_slug}`, margin, y); y += 14; }
    if (imp) { ensure(14); doc.text(`Import: ${imp.custom_title || imp.product_id.slice(0, 8)} · retail ৳${Number(imp.retail_price).toFixed(0)}`, margin, y); y += 14; }
    y += 8;

    for (const s of steps) {
      const st = s.result;
      if (st.state === "idle") continue;
      ensure(26);
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(40, 40, 90);
      doc.text(`Step ${s.n}. ${s.title}`, margin, y); y += 16;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const stateColor: [number, number, number] = st.state === "ok" ? [16, 122, 74] : st.state === "fail" ? [180, 30, 30] : [120, 100, 20];
      doc.setTextColor(...stateColor);
      ensure(14); doc.text(`Status: ${st.state.toUpperCase()}${st.message ? " — " + st.message : ""}`, margin, y); y += 14;

      for (const p of st.panels ?? []) {
        ensure(18);
        const tone = (p.tone ?? "info").toUpperCase();
        const toneColor: [number, number, number] =
          p.tone === "before" ? [90, 90, 90]
          : p.tone === "response" ? [120, 60, 160]
          : p.tone === "after" ? [30, 100, 160]
          : p.tone === "delta" ? [16, 122, 74]
          : [60, 60, 60];
        doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...toneColor);
        doc.text(`[${tone}] ${p.label}`, margin, y); y += 12;
        writeLines(JSON.stringify(p.data, null, 2), 8, "normal", [30, 30, 30]);
        y += 4;
      }
      y += 6;
    }

    if (summary) {
      ensure(30);
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(40, 40, 90);
      doc.text(`Auto-run Summary — ${summary.ok ? "PASSED" : "FAILED"} (${(summary.duration_ms / 1000).toFixed(2)}s)`, margin, y); y += 16;
      for (const r of summary.results) {
        const c: [number, number, number] = r.state === "ok" ? [16, 122, 74] : r.state === "fail" ? [180, 30, 30] : [80, 80, 80];
        doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...c);
        ensure(14); doc.text(`  ${r.step}. ${r.name} — ${r.state.toUpperCase()}${r.message ? " · " + r.message : ""}`, margin, y); y += 14;
      }
    }

    doc.save(buildFilename("pdf"));
    toast.success("PDF এক্সপোর্ট সম্পন্ন");
  };

  if (loading) return <div className="p-10 text-sm text-muted-foreground">Loading dropshippers…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-purple-900">Dropshipper E2E Diagnostic</h1>
            <p className="text-xs text-muted-foreground">প্রতিটি ধাপে BEFORE / RESPONSE / AFTER / DELTA আলাদা করে যাচাই করা হয়।</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAll}
              disabled={autoRunning || !ds || !imp}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-900 to-purple-700 px-4 py-2 text-xs font-extrabold text-amber-300 shadow hover:opacity-90 disabled:opacity-40"
            >
              {autoRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              {autoRunning ? "Running full flow…" : "Run all steps"}
            </button>
            <button
              onClick={exportCsv}
              disabled={autoRunning || !hasAnyResult}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
              title="Export all step panels as CSV"
            >
              <FileDown className="h-3 w-3" /> CSV
            </button>
            <button
              onClick={exportPdf}
              disabled={autoRunning || !hasAnyResult}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-40"
              title="Export a printable PDF report"
            >
              <FileText className="h-3 w-3" /> PDF
            </button>
            <button onClick={resetAll} disabled={autoRunning} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold hover:bg-slate-50 disabled:opacity-40">
              <RefreshCw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">
            <span className="mb-1 block font-bold text-slate-700">Dropshipper (approved)</span>
            <select value={dsId} onChange={e => setDsId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
              {dsList.length === 0 && <option value="">No approved dropshippers found</option>}
              {dsList.map(d => <option key={d.id} value={d.id}>{d.store_name} · {d.code} · /ds/{d.store_slug}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-bold text-slate-700">Imported product</span>
            <select value={importId} onChange={e => setImportId(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
              {imports.length === 0 && <option value="">No active imports</option>}
              {imports.map(i => <option key={i.id} value={i.id}>{i.custom_title || i.product_id.slice(0, 8)} — retail ৳{Number(i.retail_price).toFixed(0)}</option>)}
            </select>
          </label>
        </div>

        {ds && (
          <div className="mt-3 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
            Store link: <a className="font-mono text-purple-700 underline" href={`/ds/${ds.store_slug}`} target="_blank" rel="noreferrer">/ds/{ds.store_slug}</a>
            {" · "}code <span className="font-mono">{ds.code}</span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase">
          <span className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-700">before</span>
          <span className="rounded border border-purple-300 bg-purple-50 px-2 py-0.5 text-purple-800">response</span>
          <span className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-sky-800">after</span>
          <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-800">delta</span>
        </div>
      </div>

      <StepCard
        n={1} title="Set ds_ref cookie (localStorage)" icon={Cookie}
        result={s1} runLabel="Set cookie"
        disabled={!ds}
        onRun={runStep1}
      />
      <StepCard
        n={2} title="Track click (track_dropshipper_click RPC)" icon={MousePointerClick}
        result={s2} runLabel="Track click"
        disabled={!ds || s1.state !== "ok"}
        onRun={runStep2}
      />
      <StepCard
        n={3} title="Place test order (place_order RPC)" icon={ShoppingBag}
        result={s3} runLabel="Create order"
        disabled={!ds || !imp || s2.state !== "ok"}
        onRun={runStep3}
      />
      <StepCard
        n={4} title="Attribute order + verify dropshipper_earnings" icon={DollarSign}
        result={s4} runLabel="Attribute & verify"
        disabled={!ds || !imp || !orderId || s3.state !== "ok"}
        onRun={() => runStep4()}
      />

      {timeline.length > 0 && (
        <div className="rounded-xl border-2 border-indigo-300 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-700" />
            <h3 className="text-sm font-extrabold text-indigo-900">Combined API/RPC timeline — all steps</h3>
            <span className="ml-auto text-[11px] text-slate-600">{timeline.length} calls</span>
          </div>
          <TimelineChart calls={timeline} title="Full run timeline (relative to first call)" />
        </div>
      )}

      {summary && (
        <div className={`rounded-xl border-2 p-4 shadow-sm ${summary.ok ? "border-emerald-400 bg-emerald-50/60" : "border-red-400 bg-red-50/60"}`}>
          <div className="flex items-center gap-2">
            {summary.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            <h3 className="text-sm font-extrabold">
              Auto-run summary — {summary.ok ? "সফল ✅" : "ব্যর্থ ❌"}
            </h3>
            <span className="ml-auto text-[11px] text-slate-600">
              {(summary.duration_ms / 1000).toFixed(2)}s · {new Date(summary.started_at).toLocaleTimeString()}
            </span>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2">Step</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {summary.results.map(r => (
                  <tr key={r.step} className="border-t">
                    <td className="px-3 py-2 font-mono">{r.step}</td>
                    <td className="px-3 py-2 font-bold">{r.name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        r.state === "ok" ? "bg-emerald-100 text-emerald-800"
                        : r.state === "fail" ? "bg-red-100 text-red-800"
                        : "bg-slate-100 text-slate-700"}`}>
                        {r.state}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      <div className="rounded-lg border border-dashed border-purple-300 bg-purple-50/40 p-3 text-[11px] text-purple-900">
        <p className="font-bold">নোট:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>প্রতিটি ধাপ ক্লিক করলে BEFORE (আগের state), RESPONSE (RPC/ফাংশন কল), AFTER (পরের state) ও DELTA (কী পরিবর্তন হলো) — আলাদা প্যানেলে দেখাবে।</li>
          <li>Step 3-এ একটি আসল অর্ডার তৈরি হবে (payment_method: cod) — টেস্টের পরে <b>Customer Orders</b> থেকে ডিলিট/ক্যান্সেল করতে পারবেন।</li>
          <li>Step 4-এ dropshipper_earnings, dropshippers.totals, ও orders.dropshipper_* কলামের before/after ডেল্টা সবই যাচাই হবে।</li>
        </ul>
      </div>
    </div>
  );
}
