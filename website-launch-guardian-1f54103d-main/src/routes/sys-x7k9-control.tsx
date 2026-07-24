import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag, LogOut, Tag,
  MessageSquare, BarChart3, Image as ImageIcon, Store, Menu, X, Globe,
  Users, Truck, Settings, Shield, Handshake, Rocket, Wallet, DollarSign, Megaphone, Palette, Lock,
} from "lucide-react";
import { usePendingResets } from "@/hooks/use-pending-resets";


export const Route = createFileRoute("/sys-x7k9-control")({
  head: () => ({
    meta: [
      { title: "404 — Not Found" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: AdminGate,
});

const ADMIN_EMAIL = "emransha952@gmail.com";

function AdminGate() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const emailOk = (user?.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const allowed = !!user && isAdmin && emailOk;

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth", replace: true });
    else if (!allowed) {
      // Not the allowed admin — sign out and bounce home
      signOut().finally(() => nav({ to: "/", replace: true }));
    }
  }, [loading, user, allowed, nav, signOut]);

  if (loading || !allowed) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }


  const panels: Panel[] = [
    {
      key: "customer",
      label: "Customer",
      icon: Users,
      color: "from-blue-600 to-cyan-500",
      sections: [
        {
          label: "Customer Sales",
          items: [
            { to: "/sys-x7k9-control/orders", label: "Customer Orders", icon: ShoppingBag, search: { source: "customer" } },
            { to: "/sys-x7k9-control/customers", label: "Customers", icon: Users },
            { to: "/sys-x7k9-control/reviews", label: "Reviews", icon: MessageSquare },
            { to: "/sys-x7k9-control/shipping", label: "Shipping", icon: Truck },
          ],
        },
        {
          label: "Storefront",
          items: [
            { to: "/sys-x7k9-control/banners", label: "Banners", icon: ImageIcon },
            { to: "/sys-x7k9-control/promotions", label: "Promotions", icon: Megaphone },
            { to: "/sys-x7k9-control/coupons", label: "Coupons", icon: Tag },
          ],
        },
      ],
    },
    {
      key: "vendor",
      label: "Vendor",
      icon: Store,
      color: "from-emerald-600 to-teal-500",
      sections: [
        {
          label: "Vendor Management",
          items: [
            { to: "/sys-x7k9-control/vendors", label: "Vendors", icon: Store },
            { to: "/sys-x7k9-control/orders", label: "Vendor Orders", icon: ShoppingBag, search: { source: "vendor" } },
          ],
        },
      ],
    },
    {
      key: "dropshipping",
      label: "Dropshipping",
      icon: Rocket,
      color: "from-fuchsia-600 to-pink-500",
      sections: [
        {
          label: "Dropshipping Program",
          items: [
            { to: "/sys-x7k9-control/dropshippers", label: "Dropshippers", icon: Rocket },
            { to: "/sys-x7k9-control/orders", label: "Dropshipper Orders", icon: ShoppingBag, search: { source: "dropshipper" } },
            { to: "/sys-x7k9-control/dropshipping-earnings", label: "Earnings Ledger", icon: DollarSign },
            { to: "/sys-x7k9-control/dropshipping-payouts", label: "Payouts", icon: Wallet },
            { to: "/sys-x7k9-control/dropshipping-announcements", label: "Announcements", icon: Megaphone },
            { to: "/sys-x7k9-control/dropshipping-settings", label: "Program Settings", icon: Settings },
            { to: "/sys-x7k9-control/ds-diagnostic", label: "E2E Diagnostic", icon: Shield },
          ],
        },
      ],
    },
    {
      key: "affiliate",
      label: "Affiliate",
      icon: Handshake,
      color: "from-indigo-600 to-violet-500",
      sections: [
        {
          label: "Affiliate Program",
          items: [
            { to: "/sys-x7k9-control/affiliates", label: "Affiliates", icon: Handshake },
            { to: "/sys-x7k9-control/orders", label: "Affiliate Orders", icon: ShoppingBag, search: { source: "affiliate" } },
          ],
        },
      ],
    },
    {
      key: "website",
      label: "Full Website",
      icon: LayoutDashboard,
      color: "from-amber-500 to-orange-500",
      sections: [
        {
          label: "Overview",
          items: [
            { to: "/sys-x7k9-control", label: "Dashboard", icon: LayoutDashboard, exact: true },
            { to: "/sys-x7k9-control/analytics", label: "Analytics", icon: BarChart3 },
            { to: "/sys-x7k9-control/related-clicks", label: "Related Clicks", icon: BarChart3 },
          ],
        },
        {
          label: "Catalog",
          items: [
            { to: "/sys-x7k9-control/products", label: "Products", icon: Package },
            { to: "/sys-x7k9-control/offers", label: "Discount & Offers", icon: Tag },
            { to: "/sys-x7k9-control/categories", label: "Categories", icon: FolderTree },

          ],
        },
        {
          label: "System",
          items: [
            { to: "/sys-x7k9-control/staff", label: "Staff & Roles", icon: Shield },
            { to: "/sys-x7k9-control/audit-logs", label: "Audit Logs", icon: Shield },
            { to: "/sys-x7k9-control/password-resets", label: "Password Resets", icon: Lock },
            { to: "/sys-x7k9-control/site-customization", label: "Site Customization", icon: Palette },
            { to: "/sys-x7k9-control/settings", label: "Site Settings", icon: Settings },
          ],
        },
      ],
    },
  ];

  return <AdminShell panels={panels} email={user.email ?? ""} signOut={async () => { await signOut(); nav({ to: "/", replace: true }); }} pathname={loc.pathname} />;
}

type NavItem = { to: string; label: string; icon: any; exact?: boolean; search?: Record<string, unknown> };
type Section = { label: string; items: NavItem[] };
type Panel = { key: string; label: string; icon: any; color: string; sections: Section[] };

const PANEL_STORAGE_KEY = "admin_active_panel";

function pickPanelForPath(panels: Panel[], pathname: string): Panel {
  // Prefer the panel that contains the current route
  let best: { panel: Panel; score: number } | null = null;
  for (const p of panels) {
    for (const s of p.sections) {
      for (const i of s.items) {
        const match = i.exact ? pathname === i.to : pathname === i.to || pathname.startsWith(i.to + "/");
        if (match && (!best || i.to.length > best.score)) best = { panel: p, score: i.to.length };
      }
    }
  }
  return best?.panel ?? panels[0];
}

function AdminShell({ panels, email, signOut, pathname }: { panels: Panel[]; email: string; signOut: () => void; pathname: string }) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string>(() => {
    if (typeof window === "undefined") return panels[0].key;
    return localStorage.getItem(PANEL_STORAGE_KEY) ?? panels[0].key;
  });
  const { pendingCount } = usePendingResets({ notify: true });

  // Ask for browser notification permission once
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Sync active panel to current route if user navigates into a different panel
  useEffect(() => {
    const p = pickPanelForPath(panels, pathname);
    setActiveKey(p.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(PANEL_STORAGE_KEY, activeKey);
  }, [activeKey]);

  const active = panels.find(p => p.key === activeKey) ?? panels[0];

  const badgeFor = (to: string): number => {
    if (to === "/sys-x7k9-control/password-resets") return pendingCount;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50/40">
      <header className="sticky top-0 z-30 border-b border-purple-900/10 bg-purple-950/95 text-purple-50 backdrop-blur supports-[backdrop-filter]:bg-purple-950/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className="grid h-9 w-9 place-items-center rounded-lg border border-purple-50/10 hover:bg-purple-50/10 transition"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-purple-950 font-black shadow-lg shadow-amber-500/20">
              B
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight">Bazar Admin</div>
              <div className="text-[10px] text-purple-200/70 truncate">{email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border border-purple-50/10 bg-purple-50/5 px-3 py-1.5 text-xs font-medium hover:bg-purple-50/10 transition"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        {/* Horizontal panel switcher */}
        <div className="border-t border-purple-50/10 bg-purple-950/60">
          <div className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-2 py-2">
            {panels.map((p) => {
              const isActive = p.key === active.key;
              return (
                <button
                  key={p.key}
                  onClick={() => { setActiveKey(p.key); setOpen(true); }}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? `bg-gradient-to-r ${p.color} text-white shadow-md`
                      : "text-purple-100/80 hover:bg-purple-50/10"
                  }`}
                >
                  <p.icon className="h-3.5 w-3.5" />
                  {p.label} Panel
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 top-[110px] z-20 bg-black/50 backdrop-blur-sm" />
      )}

      <aside
        className={`fixed left-0 top-[110px] z-30 h-[calc(100vh-110px)] w-64 overflow-y-auto border-r border-purple-900/10 bg-white p-3 shadow-xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className={`mb-3 rounded-lg bg-gradient-to-r ${active.color} px-3 py-2 text-xs font-bold text-white shadow`}>
          <div className="flex items-center gap-2">
            <active.icon className="h-4 w-4" />
            {active.label} Control Panel
          </div>
        </div>
        <nav className="flex flex-col gap-4">
          {active.sections.map((sec) => (
            <div key={sec.label}>
              <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-purple-700/60">
                {sec.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {sec.items.map((t) => {
                  const isActive = t.exact ? pathname === t.to : pathname === t.to || pathname.startsWith(t.to + "/");
                  const badge = badgeFor(t.to);
                  return (
                    <Link
                      key={`${t.to}:${JSON.stringify(t.search ?? {})}`}
                      to={t.to}
                      search={t.search as never}
                      onClick={() => setOpen(false)}
                      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "bg-gradient-to-r from-purple-900 to-purple-700 text-white shadow-md shadow-purple-900/20"
                          : "text-slate-600 hover:bg-purple-50 hover:text-purple-900"
                      }`}
                    >
                      <t.icon className={`h-4 w-4 ${isActive ? "text-amber-300" : "text-slate-400 group-hover:text-purple-700"}`} />
                      <span className="flex-1">{t.label}</span>
                      {badge > 0 && (
                        <span className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none ${isActive ? "bg-amber-300 text-purple-950" : "bg-red-600 text-white animate-pulse"}`}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <main className="mx-auto max-w-[1600px] p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      className="flex items-center gap-1.5 rounded-lg border border-purple-50/10 bg-purple-50/5 px-2.5 py-1.5 text-xs font-medium hover:bg-purple-50/10 transition"
      aria-label="Toggle language"
      title="Toggle language"
    >
      <Globe className="h-3.5 w-3.5" /> {lang === "bn" ? "EN" : "বাং"}
    </button>
  );
}

