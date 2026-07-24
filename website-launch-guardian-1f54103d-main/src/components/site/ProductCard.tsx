import { Link } from "@tanstack/react-router";
import { ShoppingCart, Star, Heart } from "lucide-react";
import { formatBDT, type Product } from "@/lib/data";
import { useI18n, pick } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";

export function ProductCard({ p }: { p: Product }) {
  const { lang, t } = useI18n();
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const discount = Math.round(((p.mrp - p.price) / p.mrp) * 100);
  const wished = has(p.id);

  const linkProps = p.slug
    ? ({ to: "/p/$slug", params: { slug: p.slug } } as const)
    : ({ to: "/product/$id", params: { id: p.id } } as const);

  return (
    <Link
      {...linkProps}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-card transition hover:border-primary hover:shadow-card-hover"
    >

      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <ProductImage
          src={p.image}
          alt={pick(p.title, lang)}
          loading="lazy"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {p.badge && (
          <span
            className={cn(
              "absolute left-0 top-2 rounded-r px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
              p.badge === "FLASH" && "bg-destructive",
              p.badge === "MALL" && "bg-accent",
              p.badge === "NEW" && "bg-success",
              p.badge === "TOP" && "bg-primary",
            )}
          >
            {p.badge === "MALL" ? "BazarMall" : p.badge}
          </span>
        )}
        {discount > 0 && (
          <span className="absolute right-2 top-2 rounded bg-destructive/95 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
            -{discount}%
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id); }}
          aria-label="Wishlist"
          className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-white/90 shadow hover:bg-white"
        >
          <Heart className={cn("size-3.5", wished ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-1.5 leading-none">
        <p
          title={pick(p.title, lang)}
          className="truncate text-[11px] leading-tight text-foreground group-hover:text-primary"
        >
          {pick(p.title, lang)}
        </p>
        <div className="mt-0.5 flex items-baseline gap-1 leading-none">
          <span className="text-[12px] font-bold leading-none text-yellow-500">{formatBDT(p.price)}</span>
          <span className="text-[9px] leading-none text-muted-foreground line-through">{formatBDT(p.mrp)}</span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1 text-[9px] leading-none text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="size-2.5 fill-amber-400 text-amber-400" />
            {(p.reviewCount ?? 0) > 0 ? p.rating.toFixed(1) : "0"}
            <span className="text-muted-foreground/80">({p.reviewCount ?? 0})</span>
          </span>
          <span className="truncate">
            {p.sold.toLocaleString()} {t("sold")}
          </span>
          <button
            type="button"
            aria-label="Add to cart"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              add(p, 1);
            }}
            className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <ShoppingCart className="size-3" />
          </button>
        </div>
      </div>
    </Link>
  );
}

