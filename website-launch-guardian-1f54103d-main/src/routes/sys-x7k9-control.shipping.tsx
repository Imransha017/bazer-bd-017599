import { createFileRoute } from "@tanstack/react-router";
import { Truck, MapPin, Package2, Info } from "lucide-react";
import { PageHeader } from "@/lib/admin-ui";

export const Route = createFileRoute("/sys-x7k9-control/shipping")({
  component: Shipping,
});

const zones = [
  { name: "Inside Dhaka", area: "Dhaka Metro", rate: 60, eta: "1-2 days" },
  { name: "Dhaka Suburbs", area: "Savar, Keraniganj, Narayanganj", rate: 100, eta: "2-3 days" },
  { name: "Outside Dhaka", area: "All other districts", rate: 130, eta: "3-5 days" },
  { name: "Hill Tracts", area: "Bandarban, Rangamati, Khagrachari", rate: 180, eta: "5-7 days" },
];

function Shipping() {
  return (
    <div className="space-y-5">
      <PageHeader icon={Truck} title="Shipping & Delivery" subtitle="Zones, rates, and couriers" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {zones.map((z) => (
          <div key={z.name} className="rounded-2xl border border-purple-900/5 bg-white p-5 shadow-sm shadow-purple-900/5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-3 flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-900/5 text-purple-800">
                <MapPin className="h-4 w-4" />
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                {z.eta}
              </span>
            </div>
            <div className="text-sm font-bold text-purple-950">{z.name}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{z.area}</div>
            <div className="mt-3 text-2xl font-black text-purple-900">৳{z.rate}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-purple-900/5 bg-white p-5 shadow-sm shadow-purple-900/5">
        <div className="mb-3 flex items-center gap-2">
          <Package2 className="h-4 w-4 text-purple-800" />
          <h2 className="text-sm font-black tracking-tight text-purple-950">Available Couriers</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {["Pathao", "Steadfast", "RedX", "Sundarban"].map((c) => (
            <div key={c} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm font-semibold text-slate-700">{c}</div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Configuration UI is a preview. Editing zones, rates and connecting courier APIs can be enabled on request.</p>
      </div>
    </div>
  );
}
