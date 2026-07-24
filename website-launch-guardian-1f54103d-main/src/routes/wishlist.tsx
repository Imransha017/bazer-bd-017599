import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { SiteLayout } from "@/components/site/Layout";
import { useWishlist } from "@/lib/wishlist";
import { useCart } from "@/lib/cart";
import { getProduct, formatBDT } from "@/lib/data";
import { useI18n, pick } from "@/lib/i18n";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "My Wishlist — Bazar" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { ids, remove } = useWishlist();
  const { add } = useCart();
  const { lang } = useI18n();
  const items = Array.from(ids).map((id) => getProduct(id)).filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-3 py-4 md:px-4 md:py-6">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Heart className="size-5 fill-primary text-primary" /> My Wishlist ({items.length})
        </h1>
        {items.length === 0 ? (
          <div className="rounded-md bg-card p-12 text-center shadow-card">
            <Heart className="mx-auto size-16 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Your wishlist is empty</p>
            <Link to="/" className="mt-4 inline-block rounded bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">
              Discover Products
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <div key={p.id} className="flex gap-3 rounded-md bg-card p-3 shadow-card">
                <Link to="/product/$id" params={{ id: p.id }} className="size-24 shrink-0 overflow-hidden rounded bg-muted">
                  <img src={p.image} alt="" className="size-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <Link to="/product/$id" params={{ id: p.id }} className="line-clamp-2 text-sm font-medium hover:text-primary">
                    {pick(p.title, lang)}
                  </Link>
                  <div>
                    <p className="font-bold text-yellow-500">{formatBDT(p.price)}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => add(p, 1)}
                        className="flex flex-1 items-center justify-center gap-1 rounded bg-primary py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        <ShoppingCart className="size-3.5" /> Add to Cart
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="rounded border border-border p-1.5 text-muted-foreground hover:text-destructive"
                        aria-label="Remove"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
