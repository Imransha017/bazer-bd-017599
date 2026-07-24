import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { getMyImportWithProduct, buildDsLink, getMyDropshipper, getMyRelatedImportsByTags, type ImportWithProduct, type RelatedImport } from "@/lib/dropshipper";
import { Star, Truck, ShieldCheck, RotateCcw, ArrowLeft, Share2, Heart, ChevronRight, Minus, Plus, Tag, ShoppingCart } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { addToDsCart } from "@/lib/ds-cart";
import { toast } from "sonner";
import { logEvent } from "@/lib/analytics";

export const Route = createFileRoute("/dropshipping/view/$importId")({
  head: () => ({ meta: [{ title: "Product — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: ViewPage,
});

const formatBDT = (n: number) => `৳${Number(n || 0).toLocaleString("en-BD")}`;

const DS_SEL_KEY = "ds_order_selection";

function ViewPage() {
  const { importId } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ImportWithProduct | null | undefined>(undefined);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"desc" | "specs">("desc");
  const [qty, setQty] = useState(1);
  const [selSize, setSelSize] = useState<string>("");
  const [selColor, setSelColor] = useState<string>("");
  const [selVariant, setSelVariant] = useState<string>("");
  const [errFlash, setErrFlash] = useState(false);
  const optRef = useRef<HTMLDivElement>(null);
  const [related, setRelated] = useState<RelatedImport[]>([]);

  useEffect(() => { getMyImportWithProduct(importId).then(setData); }, [importId]);
  const tagsKey = useMemo(() => {
    const t = (data?.product?.tags ?? []) as string[];
    return [...new Set(t.map(x => String(x).toLowerCase()))].sort().join(",");
  }, [data]);
  useEffect(() => {
    if (!data || !tagsKey) { setRelated([]); return; }
    let cancelled = false;
    const tags = tagsKey.split(",");
    getMyRelatedImportsByTags(data.imp.dropshipper_id, data.imp.id, tags, 12)
      .then(r => { if (!cancelled) setRelated(r); })
      .catch(() => { if (!cancelled) setRelated([]); });
    return () => { cancelled = true; };
  }, [data, tagsKey]);

  // Reset gallery to primary when variant/color image changes
  useEffect(() => { setActive(0); }, [selColor, selVariant]);

  const shareLink = useMemo(() => {
    if (!data) return "";
    return buildDsLink(data.imp.dropshipper_id ? "" : ""); // placeholder, resolved below via store link
  }, [data]);

  if (data === undefined) return <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!data) return <div className="p-10 text-center"><p className="text-lg font-bold">Product not found</p><Link to="/dropshipping/products" className="mt-3 inline-block text-sm text-primary">← Back to products</Link></div>;

  const { imp, product: p } = data;
  const retail = Number(imp.retail_price);
  const base = Number(p.price || 0);
  const profit = Math.max(0, retail - base);
  const mrp = Number(p.mrp || 0);
  const discount = mrp > retail ? Math.round(((mrp - retail) / mrp) * 100) : 0;
  const title = imp.custom_title || p.name;

  const hasSizes = (p.sizes?.length || 0) > 0;
  const hasColors = (p.colors?.length || 0) > 0;
  const hasVariants = (p.variants?.length || 0) > 0;
  const selColorObj = selColor ? p.colors?.find(c => c.name === selColor) : undefined;
  const selVariantObj = selVariant ? p.variants?.find(v => v.name === selVariant) : undefined;
  const variantExtra = Number(selVariantObj?.price || 0);
  const effSku = selVariantObj?.sku || selColorObj?.sku || p.sku || "";
  const effStockRaw = selVariantObj?.stock ?? selColorObj?.stock ?? p.stock ?? 0;
  const effStock = Number(effStockRaw);
  const isAlwaysInStock = effStock >= 999999;
  const effPrice = retail + variantExtra;
  const variantImage = selVariantObj?.image || selColorObj?.image || "";
  const baseImages = (p.gallery && p.gallery.length ? p.gallery : (p.image ? [p.image] : [])).slice(0, 8);
  const images = variantImage
    ? [variantImage, ...baseImages.filter(i => i !== variantImage)].slice(0, 8)
    : baseImages;

  const validate = () => {
    if ((hasSizes && !selSize) || (hasColors && !selColor) || (hasVariants && !selVariant)) {
      setErrFlash(true);
      optRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      toast.error("অনুগ্রহ করে সাইজ / কালার / ভ্যারিয়েন্ট সিলেক্ট করুন");
      return false;
    }
    setErrFlash(false);
    return true;
  };

  const goOrder = () => {
    if (!validate()) return;
    try {
      sessionStorage.setItem(DS_SEL_KEY, JSON.stringify({
        importId, qty, selSize, selColor, selVariant, ts: Date.now(),
      }));
    } catch { /* ignore */ }
    navigate({ to: "/dropshipping/order/$importId", params: { importId } });
  };

  const addCart = () => {
    if (!validate()) return;
    if (!isAlwaysInStock && effStock <= 0) { toast.error("Out of stock"); return; }
    const suffix = [selVariant, selSize && `Size: ${selSize}`, selColor && `Color: ${selColor}`].filter(Boolean).join(" · ");
    const displayName = suffix ? `${title} — ${suffix}` : title;
    addToDsCart({
      import_id: importId,
      product_id: p.id,
      name: displayName,
      image: variantImage || p.image,
      base_price: base,
      retail_price: retail,
      sell_price: effPrice,
      qty,
      size: selSize || undefined,
      color: selColor || undefined,
      variant: selVariant || undefined,
      sku: effSku || undefined,
      stock: isAlwaysInStock ? undefined : effStock,
    });
    toast.success(`Added ${qty} × to cart`);
  };

  const share = async () => {
    try {
      const ds = await getMyDropshipper();
      const url = ds ? buildDsLink(ds.store_slug) : window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success("Store link copied");
    } catch { toast.error("Copy failed"); }
  };

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 md:px-4">
      <nav className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
        <Link to="/dropshipping/products" className="inline-flex items-center gap-1 hover:text-primary"><ArrowLeft className="h-3 w-3" />My Products</Link>
        <ChevronRight className="h-3 w-3" />
        {p.category_name && <><span className="capitalize">{p.category_name}</span><ChevronRight className="h-3 w-3" /></>}
        <span className="truncate font-medium text-foreground">{title}</span>
      </nav>

      <div className="grid gap-5 md:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-50 to-pink-50">
            {images[active] ? <ProductImage src={images[active]} alt={title} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-muted-foreground">No image</div>}
            <button onClick={share} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 shadow hover:bg-white"><Share2 className="h-4 w-4" /></button>
            <button className="absolute right-3 top-16 grid size-10 place-items-center rounded-full bg-white/90 shadow hover:bg-white"><Heart className="h-5 w-5" /></button>
            {discount > 0 && (
              <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">-{discount}%</span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {images.map((src, i) => (
                <button key={i} onClick={() => setActive(i)} className={`aspect-square overflow-hidden rounded-lg border-2 ${i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
                  <ProductImage src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {p.category_name && <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">{p.category_name}</span>}
            {p.rating ? (
              <span className="flex items-center gap-0.5 text-amber-600">
                <Star className="size-3.5 fill-amber-500 stroke-amber-500" />
                <span className="font-bold">{Number(p.rating).toFixed(1)}</span>
              </span>
            ) : null}
            {p.sold ? <span className="text-muted-foreground">{p.sold} sold</span> : null}
          </div>

          <h1 className="text-xl font-bold leading-snug md:text-2xl">{title}</h1>

          {p.short_description && (
            <p className="text-sm text-muted-foreground">{p.short_description}</p>
          )}

          <div className="py-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-yellow-500 transition-all">{formatBDT(effPrice)}</span>
              {mrp > retail && <span className="text-sm text-muted-foreground line-through">{formatBDT(mrp)}</span>}
            </div>
            {discount > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Customer saves {formatBDT(mrp - retail)} ({discount}% off)</p>
            )}
          </div>

          {/* Product info strip: SKU / Stock / Weight / Warranty — reflects current selection */}
          <div className="grid grid-cols-2 gap-1 rounded-md border bg-card p-1.5 text-[10px] sm:grid-cols-3">
            <div className="flex items-center justify-between rounded bg-muted/40 px-1.5 py-1"><span className="text-muted-foreground">SKU</span><span className="font-semibold truncate ml-1">{effSku || "—"}</span></div>
            <div className={`flex items-center justify-between rounded px-1.5 py-1 ${effStock <= 0 ? "bg-red-100 text-red-700" : "bg-muted/40"}`}>
              <span className="text-muted-foreground">Stock</span>
              <span className="font-semibold">{isAlwaysInStock ? "In stock" : effStock > 0 ? effStock : "Out of stock"}</span>
            </div>
            {p.weight ? <div className="flex items-center justify-between rounded bg-muted/40 px-1.5 py-1"><span className="text-muted-foreground">Weight</span><span className="font-semibold">{p.weight} kg</span></div> : null}
            {p.warranty ? <div className="flex items-center justify-between rounded bg-muted/40 px-1.5 py-1"><span className="text-muted-foreground">Warranty</span><span className="font-semibold truncate ml-1">{p.warranty}</span></div> : null}
          </div>

          {(p.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(p.tags as string[]).map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                  <Tag className="size-3" /> {t}
                </span>
              ))}
            </div>
          )}

          {/* Dropshipper economics strip */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/60 p-3 text-[11px]">
            <div><p className="text-muted-foreground">Base cost</p><p className="text-sm font-bold">{formatBDT(base)}</p></div>
            <div><p className="text-muted-foreground">Your retail</p><p className="text-sm font-bold text-primary">{formatBDT(retail)}</p></div>
            <div><p className="text-muted-foreground">Profit / unit</p><p className="text-sm font-extrabold text-emerald-700">{formatBDT(profit)}</p></div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-4">
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-2"><Truck className="h-3.5 w-3.5 text-primary" />Fast delivery</div>
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" />Genuine</div>
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-2"><RotateCcw className="h-3.5 w-3.5 text-primary" />7-day return</div>
            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-2"><Tag className="h-3.5 w-3.5 text-primary" />COD available</div>
          </div>

          {/* Product options — size / color / variant */}
          {(hasSizes || hasColors || hasVariants) && (
            <div ref={optRef} className={`space-y-2 rounded-md p-2 transition ${errFlash ? "bg-red-50 ring-1 ring-red-400" : ""}`}>
              {hasSizes && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                    <span className="text-muted-foreground">Size:</span>
                    {selSize && <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">{selSize}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.sizes!.map(s => (
                      <button key={s} onClick={() => setSelSize(s)}
                        className={`min-w-8 rounded-md border px-2 py-0.5 text-xs font-semibold transition ${selSize === s ? "border-primary bg-primary text-primary-foreground shadow" : "border-border bg-card hover:border-primary hover:text-primary"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {hasColors && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                    <span className="text-muted-foreground">Color:</span>
                    {selColor && <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">{selColor}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.colors!.map(c => (
                      <button key={c.name} onClick={() => setSelColor(c.name)}
                        className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${selColor === c.name ? "border-primary ring-2 ring-primary" : "border-border hover:bg-muted"}`}>
                        {c.hex && <span className="inline-block h-3 w-3 rounded-full border" style={{ background: c.hex }} />}
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {hasVariants && (
                <div>
                  <div className="mb-1 text-[11px] font-semibold text-muted-foreground">Variant:</div>
                  <select value={selVariant} onChange={e => setSelVariant(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="">Select variant…</option>
                    {p.variants!.map(v => <option key={v.name} value={v.name}>{v.name}{v.price ? ` (+৳${v.price})` : ""}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Qty */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Qty</span>
            <div className="inline-flex items-center overflow-hidden rounded-full border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="grid size-6 place-items-center hover:bg-muted"><Minus className="size-3" /></button>
              <span className="min-w-7 text-center text-xs font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="grid size-6 place-items-center hover:bg-muted"><Plus className="size-3" /></button>
            </div>
          </div>

          {/* CTA */}
          {(() => {
            const outOfStock = !isAlwaysInStock && effStock <= 0;
            return (
              <div className="pt-2">
                {outOfStock && (
                  <div className="mb-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-600">
                    ❌ Out of stock — নির্বাচিত ভ্যারিয়েন্টটি এখন স্টকে নেই
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={addCart}
                    disabled={outOfStock}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary bg-white py-3 text-base md:text-lg font-bold text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:hover:bg-gray-100"
                  >
                    <ShoppingCart className="size-5" /> {outOfStock ? "Out of stock" : "Add to Cart"}
                  </button>
                  <button
                    onClick={goOrder}
                    disabled={outOfStock}
                    className="flex-1 rounded-full bg-gradient-to-r from-sky-500 via-pink-500 to-purple-600 py-3 text-base md:text-lg font-bold text-white shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-gray-300 disabled:via-gray-300 disabled:to-gray-300 disabled:hover:brightness-100"
                  >
                    {outOfStock ? "Unavailable" : "🚚 Order Now"}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Description / specs tabs */}
      <section className="mt-6 overflow-hidden rounded-2xl border bg-card">
        <div className="flex gap-2 border-b px-3">
          {(["desc", "specs"] as const).map(k => (
            <button key={k} onClick={() => setTab(k)}
              className={`relative py-3 px-4 text-sm font-semibold ${tab === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {k === "desc" ? "Description" : "Specifications"}
              {tab === k && <span className="absolute inset-x-2 bottom-0 h-1 rounded-t-full bg-gradient-to-r from-sky-500 to-pink-500" />}
            </button>
          ))}
        </div>
        <div className="p-4 text-sm">
          {tab === "desc" ? (
            (imp.custom_description || p.description)
              ? <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{imp.custom_description || p.description}</p>
              : <p className="text-muted-foreground">No description provided.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {p.sizes?.length ? <p><b>Sizes:</b> {p.sizes.join(", ")}</p> : null}
              {p.colors?.length ? <p><b>Colors:</b> {p.colors.map(c => c.name).join(", ")}</p> : null}
              {p.variants?.length ? <p><b>Variants:</b> {p.variants.map(v => v.name).join(", ")}</p> : null}
              {(!p.sizes?.length && !p.colors?.length && !p.variants?.length) && <p className="text-muted-foreground">No specifications listed.</p>}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-lg font-extrabold">Related products</h2>
              <p className="text-xs text-muted-foreground">Matched by tags from your imported catalog</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {related.map(({ imp: ri, product: rp, overlap, discount, profit }) => {
              const rRetail = Number(ri.retail_price);
              const rMrp = Number(rp.mrp || 0);
              const rDisc = Math.round((discount || 0) * 100);
              return (
                <Link key={ri.id} to="/dropshipping/view/$importId" params={{ importId: ri.id }}
                  title={`Tag overlap: ${overlap}\nDiscount: ${rDisc}%\nProfit: ৳${profit}`}
                  onClick={() => logEvent("related_product_click", {
                    source_import_id: importId,
                    target_import_id: ri.id,
                    target_product_id: rp.id,
                    matched_tags: (rp.tags ?? []).filter((t: string) => (data?.product?.tags ?? []).map((x: string) => String(x).toLowerCase()).includes(String(t).toLowerCase())),
                    overlap,
                    discount_pct: rDisc,
                    profit,
                  })}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    <ProductImage src={rp.image} alt={ri.custom_title || rp.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    {rDisc > 0 && <span className="absolute left-1.5 top-1.5 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">-{rDisc}%</span>}
                    <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">×{overlap}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-2">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug">{ri.custom_title || rp.name}</p>
                    <div className="mt-auto flex items-baseline gap-1">
                      <span className="text-sm font-extrabold text-primary">{formatBDT(rRetail)}</span>
                      {rMrp > rRetail && <span className="text-[10px] text-muted-foreground line-through">{formatBDT(rMrp)}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">tags ×{overlap}</span>
                      <span className="rounded bg-red-50 px-1 py-0.5 text-red-700">-{rDisc}%</span>
                      <span className="rounded bg-emerald-50 px-1 py-0.5 text-emerald-700">+{formatBDT(profit)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Sorted by: tag overlap (more matches first) → discount % → profit
          </p>
        </section>
      )}
    </div>
  );
}
