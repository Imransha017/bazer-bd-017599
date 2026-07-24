import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, User, Globe, Heart, LogOut, LayoutDashboard, Package, MapPin, Store, Handshake, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { getMyVendor, type Vendor } from "@/lib/vendor";
import { getMyDropshipper, type Dropshipper } from "@/lib/dropshipper";
import { CategoriesMenu } from "./CategoriesMenu";
import { useSiteSettings } from "@/lib/site-settings";
import logoAsset from "@/assets/bazar-bd-logo.png.asset.json";



export function Header() {
  const { lang, setLang, t } = useI18n();
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const settings = useSiteSettings();
  const brandName = settings.brand.name || "Bazar";
  const brandLogo = settings.brand.logo_url || logoAsset.url;
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined);
  const [ds, setDs] = useState<Dropshipper | null | undefined>(undefined);
  const navigate = useNavigate();


  useEffect(() => {
    if (!user) { setVendor(null); setDs(null); return; }
    setVendor(undefined); setDs(undefined);
    getMyVendor().then((v) => setVendor(v)).catch(() => setVendor(null));
    getMyDropshipper().then((d) => setDs(d)).catch(() => setDs(null));
  }, [user]);




  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/search", search: { q } });
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-brand text-brand-foreground shadow-md">
      {/* top utility bar (desktop only) */}
      {settings.header.top_bar_enabled && (
        <div className="hidden border-b border-white/10 text-xs md:block">
          <div className="mx-auto flex h-8 max-w-none items-center justify-between px-4">
            <span className="opacity-90">{settings.header.top_bar_text || "Save more on app"}</span>
            <div className="flex items-center gap-4 opacity-90">
              {settings.header.nav_links.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)).map((l) => (
                <a key={l.href + l.label} href={l.href} className="hover:underline">{l.label}</a>
              ))}
              {settings.header.nav_links.length > 0 && <span>|</span>}
              <Link to="/orders" className="hover:underline">Track Order</Link>
              <span>|</span>
              <Link to="/become-vendor" className="hover:underline">Sell on Bazar</Link>
              <span>|</span>
              <button onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="flex items-center gap-1 hover:underline">
                <Globe className="size-3" /> {lang === "bn" ? "English" : "বাংলা"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden">
        <div className="flex items-center gap-2 px-2 py-1">
          <Link to="/" className="flex shrink-0 items-center gap-1.5">
            <img src={brandLogo} alt={`${brandName} logo`} className="h-10 w-10 shrink-0 rounded object-contain" />
            <div className="flex flex-col leading-none">
              <span className="max-w-[110px] truncate text-sm font-bold text-white">{brandName}</span>
            </div>
          </Link>

          <form onSubmit={submit} className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search_placeholder")}
              className="h-9 w-full rounded-full bg-white py-1.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </form>

          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setLang(lang === "bn" ? "en" : "bn")}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white hover:bg-white/20"
              aria-label="Toggle language"
            >
              {lang === "bn" ? "EN" : "বাং"}
            </button>
            {isAdmin && (
              <Link to="/sys-x7k9-control" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Admin Panel">
                <LayoutDashboard className="size-5" />
              </Link>
            )}
            {user ? (
              <Link to="/account" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="My Account">
                <User className="size-5" />
              </Link>
            ) : (
              <Link to="/auth" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white hover:bg-white/20" aria-label="Login">
                Login
              </Link>
            )}
            <Link to="/cart" className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label={t("cart")}>
              <ShoppingCart className="size-5" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-white px-1 text-[9px] font-bold text-primary">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* DESKTOP header */}
      <div className="mx-auto hidden max-w-none items-center gap-3 px-4 py-3 md:flex">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={brandLogo} alt={`${brandName} logo`} className="h-10 w-10 shrink-0 rounded object-contain" />
          <span className="text-3xl font-black tracking-tight">{brandName}</span>

          <span className="text-xs opacity-80">.bd</span>
        </Link>

        <CategoriesMenu variant="compact" />

        <form onSubmit={submit} className="relative min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_placeholder")}
            className="w-full rounded-sm bg-white py-2 pl-3 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="absolute right-0 top-0 grid h-full w-11 place-items-center rounded-r-sm bg-brand-dark text-white"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>
        </form>

        <button
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="rounded px-2 py-1 text-xs font-medium hover:bg-white/10"
        >
          {lang === "bn" ? "EN" : "বাং"}
        </button>

        {user ? (
          <div className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-1 text-sm hover:opacity-80">
              <User className="size-5" />
              <span className="max-w-[120px] truncate">{user.email?.split("@")[0]}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md border bg-card text-foreground shadow-lg">
                <Link to="/account" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><User className="size-4" /> My Profile</Link>
                <Link to="/orders" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Package className="size-4" /> My Orders</Link>
                <Link to="/wishlist" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><Heart className="size-4" /> Wishlist</Link>
                <Link to="/account/addresses" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"><MapPin className="size-4" /> Addresses</Link>
                <Link to="/affiliate" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted"><Handshake className="size-4" /> Affiliate Program</Link>
                {vendor ? (vendor.status === "approved" ? (
                  <Link to="/vendor" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted"><Store className="size-4" /> Vendor Dashboard</Link>
                ) : (
                  <Link to="/become-vendor" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted">
                    <Store className="size-4" />
                    <span className="flex-1">Vendor: <span className="capitalize">{vendor.status}</span></span>
                  </Link>
                )) : (
                  <Link to="/become-vendor" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted"><Store className="size-4" /> Create Vendor Account</Link>
                )}
                {ds ? (ds.status === "approved" ? (
                  <Link to="/dropshipping" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted"><Rocket className="size-4" /> Dropshipping Dashboard</Link>
                ) : (
                  <Link to="/dropshipping/apply" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted">
                    <Rocket className="size-4" />
                    <span className="flex-1">Dropshipper: <span className="capitalize">{ds.status}</span></span>
                  </Link>
                )) : (
                  <Link to="/dropshipping/apply" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted"><Rocket className="size-4" /> Start Dropshipping</Link>
                )}
                {isAdmin && (
                  <Link to="/sys-x7k9-control" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 border-t px-3 py-2 text-sm hover:bg-muted">
                    <LayoutDashboard className="size-4" /> Admin Panel
                  </Link>
                )}
                <button onClick={async () => { setMenuOpen(false); await signOut(); navigate({ to: "/" }); }} className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm hover:bg-muted">
                  <LogOut className="size-4" /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/auth" className="flex items-center gap-1 text-sm hover:opacity-80">
            <User className="size-5" />
            <span>{t("login")}</span>
          </Link>
        )}


        <Link to="/cart" className="relative inline-flex shrink-0 items-center" aria-label={t("cart")}>
          <ShoppingCart className="size-6" />
          {count > 0 && (
            <span className="absolute -right-2 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-primary">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
