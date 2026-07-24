import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { getMyVendor, type Vendor } from "@/lib/vendor";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, ShoppingBag, Store, LogOut, Clock, Globe } from "lucide-react";

function usePendingOrderCount(vendorId: string | undefined) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    const load = async () => {
      const { count: c } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId)
        .eq("status", "pending");
      if (!cancelled) setCount(c ?? 0);
    };
    load();
    const ch = supabase
      .channel(`vendor-pending-${vendorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [vendorId]);
  return count;
}

export const Route = createFileRoute("/vendor")({
  head: () => ({ meta: [{ title: "Vendor Dashboard — Bazar BD" }, { name: "robots", content: "noindex" }] }),
  component: VendorGate,
});

function VendorGate() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [checking, setChecking] = useState(true);
  const pendingCount = usePendingOrderCount(vendor?.id);


  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/auth" }); return; }
    getMyVendor().then(v => { setVendor(v); setChecking(false); });
  }, [user, loading, nav]);

  if (loading || checking) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  if (!vendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
          <Store className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-3 text-xl font-bold">You're not a vendor yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">Apply to open your store on Bazar BD.</p>
          <Link to="/become-vendor" className="mt-4 inline-block rounded bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">Become a Vendor</Link>
        </div>
      </div>
    );
  }

  const isApproved = vendor.status === "approved";



  const tabs = [
    { to: "/vendor", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/vendor/products", label: "Products", icon: Package },
    { to: "/vendor/orders", label: "Orders", icon: ShoppingBag, badgeKey: "orders" as const },
    { to: "/vendor/store", label: "Store Info", icon: Store },
  ];





  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded bg-primary text-primary-foreground font-bold">
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" className="h-full w-full object-cover" /> : vendor.store_name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-bold">{vendor.store_name}</div>
              <div className="text-[10px] text-muted-foreground">Vendor Panel · /store/{vendor.slug}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/vendor/orders" className="relative rounded border px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-1">
              <ShoppingBag className="h-3.5 w-3.5" /> New Orders
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white animate-pulse">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
            <Link to="/store/$slug" params={{ slug: vendor.slug }} className="rounded border px-3 py-1.5 text-xs hover:bg-muted">View Store</Link>
            <VendorLangToggle />
            <button onClick={async () => { await signOut(); nav({ to: "/", replace: true }); }} className="flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map(t => {
            const active = t.exact ? loc.pathname === t.to : loc.pathname.startsWith(t.to);
            const showBadge = t.badgeKey === "orders" && pendingCount > 0;
            return (
              <Link key={t.to} to={t.to} className={`relative flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
                {showBadge && (
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4">
        {!isApproved && (
          <div className={`mb-4 rounded-lg border-2 p-4 shadow-sm ${
            vendor.status === "pending" ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30" :
            vendor.status === "rejected" ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30" :
            "border-slate-400 bg-slate-50 dark:bg-slate-950/30"
          }`}>
            <div className="flex items-start gap-3">
              <Clock className={`h-6 w-6 flex-shrink-0 ${
                vendor.status === "pending" ? "text-amber-600" :
                vendor.status === "rejected" ? "text-rose-600" : "text-slate-600"
              }`} />
              <div className="flex-1">
                <div className="text-sm font-bold capitalize">
                  {vendor.status === "pending" && "অ্যাকাউন্ট রিভিউ চলছে — Admin Approval Pending"}
                  {vendor.status === "rejected" && "আবেদন প্রত্যাখ্যাত হয়েছে — Application Rejected"}
                  {vendor.status === "suspended" && "স্টোর সাসপেন্ড করা হয়েছে — Store Suspended"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {vendor.status === "pending" && "আপনার ভেন্ডার অ্যাকাউন্টটি এডমিন এর অনুমোদনের অপেক্ষায় আছে। অনুমোদন পাওয়ার পর সকল অপশন চালু হবে এবং আপনি পণ্য যোগ ও অর্ডার ম্যানেজ করতে পারবেন। Your vendor account is awaiting admin approval. All features will be enabled once approved."}
                  {vendor.status === "rejected" && "দুঃখিত, আপনার আবেদন গ্রহণ করা হয়নি। আরও তথ্যের জন্য এডমিন এর সাথে যোগাযোগ করুন।"}
                  {vendor.status === "suspended" && "আপনার স্টোর সাময়িকভাবে বন্ধ রাখা হয়েছে। বিস্তারিত জানতে এডমিন এর সাথে যোগাযোগ করুন।"}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className={!isApproved ? "pointer-events-none select-none opacity-50" : ""} aria-disabled={!isApproved}>
          <Outlet />
        </div>
      </main>

    </div>
  );
}

function VendorLangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      onClick={() => setLang(lang === "bn" ? "en" : "bn")}
      className="flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted"
      aria-label="Toggle language"
    >
      <Globe className="h-3.5 w-3.5" /> {lang === "bn" ? "EN" : "বাং"}
    </button>
  );
}

