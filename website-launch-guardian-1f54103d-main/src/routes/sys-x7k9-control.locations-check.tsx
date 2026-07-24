import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { validateBDLocations, formatValidationReport, EXPECTED_MIN_COUNTS } from "@/lib/bd-locations-validate";
import { BD_LOCATIONS } from "@/lib/bd-locations";
import { CheckCircle2, XCircle, AlertTriangle, Search, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sys-x7k9-control/locations-check")({
  head: () => ({ meta: [{ title: "Locations Validator — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const result = useMemo(() => validateBDLocations(), []);
  const report = useMemo(() => formatValidationReport(result), [result]);

  const filtered = result.summary.perDistrict.filter(p =>
    !q.trim() || p.district.toLowerCase().includes(q.toLowerCase())
  );

  const copy = async () => {
    await navigator.clipboard.writeText(report);
    toast.success("Report copied");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl md:text-2xl font-bold">Locations Validator</h1>
        <button onClick={copy} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-muted">
          <Copy className="h-4 w-4" /> Copy report
        </button>
      </div>

      <div className={`rounded-lg border p-4 flex items-start gap-3 ${result.ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        {result.ok ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> : <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />}
        <div className="text-sm">
          <div className="font-semibold">
            {result.ok ? "All districts pass validation" : `${result.issues.length} issue(s) detected`}
          </div>
          <div className="text-muted-foreground mt-0.5">
            Districts: <b>{result.summary.districts}</b> / 64 · Total thanas: <b>{result.summary.totalThanas}</b>
          </div>
        </div>
      </div>

      {result.issues.length > 0 && (
        <div className="rounded-lg border p-4">
          <div className="font-semibold mb-2 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-600" /> Issues</div>
          <ul className="text-sm space-y-1">
            {result.issues.map((i, idx) => (
              <li key={idx} className="text-red-700">
                {i.type === "missing_district" && `Missing district: ${i.district}`}
                {i.type === "extra_district" && `Unexpected district: ${i.district}`}
                {i.type === "empty" && `Empty thana list: ${i.district}`}
                {i.type === "duplicate_thana" && `Duplicate in ${i.district}: ${i.thana}`}
                {i.type === "count_below_min" && `${i.district}: ${i.actual} < expected ${i.expected}`}
                {i.type === "district_count_mismatch" && `District count ${i.actual} ≠ ${i.expected}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border">
        <div className="p-3 border-b flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search district..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2">District</th>
                <th className="p-2 text-right">Actual</th>
                <th className="p-2 text-right">Expected min</th>
                <th className="p-2 text-right">Delta</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const bad = p.actual < p.expected;
                const exact = p.actual === p.expected;
                return (
                  <tr key={p.district} className="border-t">
                    <td className="p-2 font-medium">{p.district}</td>
                    <td className="p-2 text-right">{p.actual}</td>
                    <td className="p-2 text-right">{p.expected}</td>
                    <td className={`p-2 text-right ${bad ? "text-red-600" : exact ? "text-muted-foreground" : "text-green-600"}`}>
                      {p.delta >= 0 ? `+${p.delta}` : p.delta}
                    </td>
                    <td className="p-2">
                      {bad ? (
                        <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-3.5 w-3.5" /> Missing</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">Raw text report</summary>
        <pre className="mt-2 text-xs whitespace-pre-wrap font-mono">{report}</pre>
      </details>

      <div className="text-xs text-muted-foreground">
        Expected minimums are defined in <code>src/lib/bd-locations-validate.ts</code>. Adjust <code>EXPECTED_MIN_COUNTS</code> when official
        administrative changes happen. Total districts tracked: {Object.keys(EXPECTED_MIN_COUNTS).length}; data source keys: {Object.keys(BD_LOCATIONS).length}.
      </div>
    </div>
  );
}
