import { useEffect, useState } from "react";
import { FileText, Printer, Eye, Trash2 } from "lucide-react";
import { getInvoiceHistory, clearInvoiceHistory, type InvoiceEvent } from "@/lib/invoice-history";

export function InvoiceHistory({ orderId }: { orderId: string }) {
  const [events, setEvents] = useState<InvoiceEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(getInvoiceHistory(orderId));
    refresh();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.orderId === orderId) refresh();
    };
    window.addEventListener("invoice-history:updated", handler);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("invoice-history:updated", handler);
      window.removeEventListener("storage", refresh);
    };
  }, [orderId]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-purple-800/70">
          <FileText className="h-3.5 w-3.5" /> Invoice history
        </div>
        {events.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear invoice history for this order?")) clearInvoiceHistory(orderId);
            }}
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      {events.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          No invoice previews yet. Click <b>Invoice</b> above to preview / print.
        </p>
      ) : (
        <ul className="mt-2 max-h-56 space-y-1.5 overflow-auto text-xs">
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-2 rounded-md bg-slate-50 px-2 py-1.5">
              {e.action === "print" ? (
                <Printer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-600" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-700">
                  {e.action === "print" ? "Printed / Saved" : "Previewed"}
                  {e.panel && <span className="ml-1 text-[10px] font-normal text-slate-400">({e.panel})</span>}
                </div>
                <div className="text-[11px] text-slate-500">{new Date(e.at).toLocaleString()}</div>
                {e.actor && <div className="truncate text-[10px] text-slate-400">{e.actor}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-slate-400">Recorded locally on this device.</p>
    </div>
  );
}
