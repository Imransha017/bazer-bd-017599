import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trash2, Minus, Plus, ShoppingBag, LogIn } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { useCart } from "@/lib/cart";
import { useI18n, pick } from "@/lib/i18n";
import { formatBDT } from "@/lib/data";
import { ProductImage } from "@/components/ProductImage";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Cart — Bazar" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (!loading && !user) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <LogIn className="mx-auto size-16 text-primary" />
          <h1 className="mt-4 text-xl font-bold">সাইন ইন প্রয়োজন</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            কার্টে পণ্য যোগ করে অর্ডার করতে হলে আগে কাস্টমার একাউন্ট তৈরি করুন বা সাইন ইন করুন। একক পণ্য "Order Now" বাটন দিয়ে একাউন্ট ছাড়াই অর্ডার করতে পারবেন।
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/auth" className="rounded bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">সাইন ইন / সাইন আপ</Link>
            <Link to="/" className="rounded border px-6 py-2.5 text-sm font-bold">হোমে যান</Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (items.length === 0) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-none px-4 py-16 text-center">
          <ShoppingBag className="mx-auto size-20 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">{t("empty_cart")}</h1>
          <Link to="/" className="mt-4 inline-block rounded bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
            {t("continue_shopping")}
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-none px-3 py-4 md:px-4">
        <h1 className="mb-3 text-xl font-bold">{t("cart")} ({items.length})</h1>
        <div className="grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="space-y-2">
            {items.map(({ product: p, qty }) => (
              <div key={p.id} className="flex gap-3 rounded-md bg-card p-3 shadow-card">
                <Link to="/product/$id" params={{ id: p.id }} className="size-24 shrink-0 overflow-hidden rounded bg-muted">
                  <ProductImage src={p.image} alt="" className="size-full object-cover" />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 text-sm hover:text-primary">
                      {pick(p.title, lang)}
                    </Link>
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded border">
                      <button onClick={() => setQty(p.id, qty - 1)} className="grid size-7 place-items-center hover:bg-muted">
                        <Minus className="size-3" />
                      </button>
                      <span className="w-8 text-center text-xs">{qty}</span>
                      <button onClick={() => setQty(p.id, qty + 1)} className="grid size-7 place-items-center hover:bg-muted">
                        <Plus className="size-3" />
                      </button>
                    </div>
                    <span className="font-bold text-yellow-500">{formatBDT(p.price * qty)}</span>
                  </div>
                </div>
                <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive" aria-label={t("remove")}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive">
              Clear cart
            </button>
          </div>
          <aside className="self-start rounded-md bg-card p-4 shadow-card">
            <h2 className="mb-3 font-bold">Order Summary</h2>
            <div className="space-y-2 border-b pb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span>{formatBDT(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("free_shipping")}</span>
                <span className="text-success">৳0</span>
              </div>
            </div>
            <div className="flex justify-between py-3 text-base font-bold">
              <span>Total</span>
              <span className="text-yellow-500">{formatBDT(subtotal)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={(e) => {
                // Guarantee navigation even if router preload/state stalls
                e.preventDefault();
                try { navigate({ to: "/checkout" }); } catch { /* fall through */ }
                setTimeout(() => {
                  if (typeof window !== "undefined" && window.location.pathname !== "/checkout") {
                    window.location.assign("/checkout");
                  }
                }, 150);
              }}
              className="block w-full rounded bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground"
            >
              {t("checkout")} ({items.length})
            </Link>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}
