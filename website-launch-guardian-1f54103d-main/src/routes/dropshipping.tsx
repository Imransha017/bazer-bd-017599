import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/Layout";
import { useAuth } from "@/lib/auth";
import { getMyDropshipper, type Dropshipper } from "@/lib/dropshipper";
import { LayoutDashboard, PackagePlus, ShoppingBag, Wallet, Settings, Rocket, DollarSign, Megaphone, Link2 } from "lucide-react";

export const Route = createFileRoute("/dropshipping")({
  head: () => ({
    meta: [
      { title: "Dropshipping Dashboard — Bazar BD" },
      { name: "description", content: "Manage your dropshipping store: import products, track orders and request payouts." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DropshipperShell,
});

export type DropshipperCtx = { ds: Dropshipper };

function DropshipperShell() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [ds, setDs] = useState<Dropshipper | null | undefined>(undefined);

  const isApplyRoute = loc.pathname === "/dropshipping/apply";

  useEffect(() => {
    if (isApplyRoute) return;
    if (loading) return;
    if (!user) { nav({ to: "/auth", replace: true }); return; }
    getMyDropshipper().then(setDs).catch(() => setDs(null));
  }, [user, loading, nav, isApplyRoute]);

  // The apply route is a child of this layout but must be reachable
  // to users who haven't been approved yet — otherwise the fallback
  // below hides the form and the "Apply now" button loops back here.
  if (isApplyRoute) {
    return <Outlet />;
  }

  if (loading || ds === undefined) {
    return <SiteLayout><div className="p-16 text-center text-sm text-muted-foreground">Loading…</div></SiteLayout>;
  }

  if (!ds || ds.status !== "approved") {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md p-8 text-center">
          <Rocket className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-xl font-bold">
            {!ds ? "You haven't applied yet" : ds.status === "pending" ? "Awaiting approval" : "Account not active"}
          </h1>
          <Link to="/dropshipping/apply" className="mt-4 inline-block rounded bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">
            {!ds ? "Apply now" : "View application"}
          </Link>
        </div>
      </SiteLayout>
    );
  }


  const tabs: Array<{ to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }> = [
    { to: "/dropshipping", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/dropshipping/products", label: "Products", icon: PackagePlus },
    { to: "/dropshipping/orders", label: "Orders", icon: ShoppingBag },
    { to: "/dropshipping/earnings", label: "Earnings", icon: DollarSign },
    { to: "/dropshipping/payouts", label: "Payouts", icon: Wallet },
    { to: "/dropshipping/marketing", label: "Marketing", icon: Megaphone },
    { to: "/dropshipping/links", label: "Link History", icon: Link2 },
    { to: "/dropshipping/settings", label: "Settings", icon: Settings },
  ];


  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl p-3 sm:p-5">
        <div className="mb-4 rounded-xl border bg-gradient-to-r from-primary/10 to-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Dropshipper Store</p>
              <h1 className="text-xl font-extrabold text-foreground">{ds.store_name}</h1>
              <p className="text-[11px] text-muted-foreground">Code: <span className="font-mono">{ds.code}</span> · Slug: <span className="font-mono">{ds.store_slug}</span></p>
            </div>
            <Link to="/ds/$slug" params={{ slug: ds.store_slug }} target="_blank" className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">View public store →</Link>
          </div>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto border-b">
          {tabs.map(t => {
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to as "/dropshipping"} className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-bold transition ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4" />{t.label}
              </Link>
            );
          })}

        </div>

        <Outlet />
      </div>
    </SiteLayout>
  );
}
