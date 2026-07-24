import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Heart, ShoppingCart, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";

export function MobileNav() {
  const { t } = useI18n();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();

  const itemCls =
    "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] text-muted-foreground transition-colors";
  const activeCls = { className: "text-primary" };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t bg-card shadow-[0_-2px_8px_rgba(0,0,0,0.08)] md:hidden">
      <Link to="/" className={itemCls} activeOptions={{ exact: true }} activeProps={activeCls}>
        <Home className="size-5" />
        <span>{t("home")}</span>
      </Link>
      <Link to="/categories" className={itemCls} activeProps={activeCls}>
        <LayoutGrid className="size-5" />
        <span>{t("categories")}</span>
      </Link>
      <Link to="/wishlist" className={itemCls} activeProps={activeCls}>
        <div className="relative">
          <Heart className="size-5" />
          {wishCount > 0 && (
            <span className="absolute -right-2 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {wishCount}
            </span>
          )}
        </div>
        <span>Wishlist</span>
      </Link>
      <Link to="/cart" className={itemCls} activeProps={activeCls}>
        <div className="relative">
          <ShoppingCart className="size-5" />
          {count > 0 && (
            <span className="absolute -right-2 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </div>
        <span>{t("cart")}</span>
      </Link>
      <Link to="/account" className={itemCls} activeProps={activeCls}>
        <User className="size-5" />
        <span>{t("account")}</span>
      </Link>
    </nav>
  );
}
