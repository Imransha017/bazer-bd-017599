import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getMyDropshipper, listMyImports, importProduct, updateImport, removeImport, buildDsLink, attributeOrderToDs, type Dropshipper, type DropshipperProduct } from "@/lib/dropshipper";
import { useLiveCatalog } from "@/lib/live-catalog";
import type { Product } from "@/lib/data";
import { createDBOrder } from "@/lib/admin-api";
import { BD_LOCATIONS, BD_DISTRICTS } from "@/lib/bd-locations";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Minus, Trash2, X, Eye, ShoppingCart, Star, Share2, Edit3, Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/ProductImage";
import { getDsCart, subscribeDsCart, addToDsCart, updateDsCartItem, removeDsCartItem, clearDsCart, type DsCartItem } from "@/lib/ds-cart";

export const Route = createFileRoute("/dropshipping/products")({
  head: () => ({ meta: [{ title: "Products — Dropshipping" }, { name: "robots", content: "noindex" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const [ds, setDs] = useState<Dropshipper | null>(null);
  const [imports, setImports] = useState<DropshipperProduct[]>([]);
  const [tab, setTab] = useState<"mine" | "import" | "cart">("mine");
  const [importing, setImporting] = useState<{ id: string; name: string; price: number; image?: string } | null>(null);
  const [retail, setRetail] = useState("");
  const [q, setQ] = useState("");
  const { products } = useLiveCatalog();
  const [cart, setCart] = useState<DsCartItem[]>(() => getDsCart());
  useEffect(() => subscribeDsCart(setCart), []);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const [bulkOpen, setBulkOpen] = useState(false);



  const reload = async (d: Dropshipper) => setImports(await listMyImports(d.id));

  useEffect(() => {
    getMyDropshipper().then(async d => { setDs(d); if (d) await reload(d); });
  }, []);

  const importedIds = useMemo(() => new Set(imports.map(i => i.product_id)), [imports]);
  const catalog = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .filter(p => p.dropshipper_price != null && Number(p.dropshipper_price) > 0)
      .filter(p => !s || p.title.en.toLowerCase().includes(s) || (p.categoryName || "").toLowerCase().includes(s))
      .slice(0, 120);
  }, [products, q]);

  if (!ds) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const doImport = async () => {
    if (!importing) return;
    const price = Number(retail);
    if (!price || price < importing.price) {
      toast.error(`Retail price must be at least ৳${importing.price}`);
      return;
    }
    try {
      await importProduct(ds.id, importing.id, price);
      toast.success("Product imported");
      setImporting(null); setRetail("");
      await reload(ds);
      setTab("mine");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {(["mine", "import", "cart"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`relative border-b-2 px-4 py-2 text-xs font-bold whitespace-nowrap ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t === "mine" ? `My products (${imports.length})` : t === "import" ? "Import from catalog" : (
              <span className="inline-flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5" />Cart{cartCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{cartCount}</span>}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "mine" && (
        <MyProducts imports={imports} products={products} storeSlug={ds.store_slug} onReload={() => reload(ds)} />
      )}
      {tab === "cart" && (
        <CartTab items={cart} onCheckout={() => setBulkOpen(true)} onContinue={() => setTab("mine")} />
      )}

      {bulkOpen && (
        <DsBulkOrderModal
          items={cart}
          onClose={() => setBulkOpen(false)}
          onPlaced={() => { clearDsCart(); setBulkOpen(false); setTab("mine"); }}
        />
      )}



      {tab === "import" && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products to import" className="w-full rounded-md border pl-9 pr-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {catalog.length === 0 ? (
              <p className="col-span-full py-10 text-center text-xs text-muted-foreground">No dropshipping products available yet. Ask admin to set a dropshipper price on products.</p>
            ) : catalog.map(p => {
              const already = importedIds.has(p.id);
              const base = Number(p.dropshipper_price);
              return (
                <div key={p.id} className="rounded-md border border-border bg-card p-1.5 transition hover:border-primary hover:shadow-card-hover">
                  <div className="aspect-square overflow-hidden rounded bg-muted">
                    <ProductImage src={p.image} alt={p.title.en} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-medium">{p.title.en}</p>
                  <p className="text-[11px] font-semibold text-primary">Dropshipper price: ৳{base}</p>
                  <button disabled={already} onClick={() => { setImporting({ id: p.id, name: p.title.en, price: base, image: p.image }); setRetail(String(Math.ceil(base * 1.3))); }} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground">
                    <Plus className="h-3 w-3" />{already ? "Imported" : "Add to store"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setImporting(null)}>
          <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Set your retail price</h3>
              <button onClick={() => setImporting(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 flex gap-3">
              {importing.image && <ProductImage src={importing.image} alt="" className="h-20 w-20 rounded object-cover" />}
              <div>
                <p className="text-sm font-medium">{importing.name}</p>
                <p className="text-xs text-muted-foreground">Base cost: ৳{importing.price}</p>
              </div>
            </div>
            <label className="mt-4 block">
              <span className="text-xs font-semibold">Your retail price (৳)</span>
              <input type="number" min={importing.price} value={retail} onChange={e => setRetail(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" />
            </label>
            <div className="mt-2 rounded-md bg-green-50 p-2 text-xs">
              <div className="flex items-center justify-between"><span>Your profit per unit:</span><span className="font-bold text-green-700">৳{Math.max(0, Number(retail || 0) - importing.price).toFixed(0)}</span></div>
              <div className="flex items-center justify-between"><span>Markup:</span><span className="font-bold">{importing.price ? Math.round(((Number(retail || 0) - importing.price) / importing.price) * 100) : 0}%</span></div>
            </div>
            <button onClick={doImport} className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-bold text-primary-foreground">Import to my store</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CartTab({ items, onCheckout, onContinue }: { items: DsCartItem[]; onCheckout: () => void; onContinue: () => void }) {
  const [editing, setEditing] = useState<DsCartItem | null>(null);
  const [mismatches, setMismatches] = useState<Record<string, { issues: string[]; suggested?: { size?: string; color?: string; variant?: string; sku?: string } }>>({});
  const [productCache, setProductCache] = useState<Map<string, any>>(new Map());
  const [rev, setRev] = useState(0);

  useEffect(() => {
    if (items.length === 0) { setMismatches({}); return; }
    (async () => {
      const ids = Array.from(new Set(items.map(l => l.product_id)));
      const { data } = await supabase.from("products").select("id,sizes,colors,variants,sku,image,images,price,dropshipper_price,stock").in("id", ids);
      const pmap = new Map((data || []).map((r: any) => [r.id, r]));
      setProductCache(pmap);
      const out: Record<string, { issues: string[]; suggested?: any }> = {};
      items.forEach(l => {
        const p: any = pmap.get(l.product_id);
        const issues: string[] = [];
        let suggested: any = undefined;
        if (!p) { out[l.line_id] = { issues: ["Product no longer exists"] }; return; }
        const sizes: string[] = Array.isArray(p.sizes) ? p.sizes : [];
        const colors: any[] = Array.isArray(p.colors) ? p.colors : [];
        const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
        if (sizes.length > 0 && (!l.size || !sizes.includes(l.size))) {
          issues.push(`Size "${l.size ?? "—"}" invalid`);
          suggested = { ...(suggested || {}), size: sizes[0] };
        }
        if (colors.length > 0) {
          const cnames = colors.map((c: any) => typeof c === "string" ? c : c.name);
          if (!l.color || !cnames.includes(l.color)) {
            issues.push(`Color "${l.color ?? "—"}" invalid`);
            suggested = { ...(suggested || {}), color: cnames[0] };
          }
        }
        if (variants.length > 0) {
          const match = variants.find((v: any) => (v.name || v.label) === l.variant);
          if (!l.variant || !match) {
            issues.push(`Variant "${l.variant ?? "—"}" invalid`);
            const s = variants[0];
            suggested = { ...(suggested || {}), variant: s?.name || s?.label, sku: s?.sku };
          } else if (match.sku && l.sku && match.sku !== l.sku) {
            issues.push(`SKU mismatch (cart: ${l.sku} → current: ${match.sku})`);
            suggested = { ...(suggested || {}), sku: match.sku };
          }
        } else if (p.sku && l.sku && p.sku !== l.sku) {
          issues.push(`SKU mismatch (cart: ${l.sku} → current: ${p.sku})`);
          suggested = { ...(suggested || {}), sku: p.sku };
        }
        if (issues.length > 0) out[l.line_id] = { issues, suggested };
      });
      setMismatches(out);
    })();
  }, [items, rev]);

  const applyAutoFix = (line: DsCartItem): boolean => {
    const p: any = productCache.get(line.product_id);
    const mm = mismatches[line.line_id];
    if (!p || !mm) return false;
    const sizes: string[] = Array.isArray(p.sizes) ? p.sizes : [];
    const colors: any[] = Array.isArray(p.colors) ? p.colors : [];
    const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
    const sug = mm.suggested || {};
    const newSize = sizes.length > 0 ? (sizes.includes(line.size || "") ? line.size : sug.size || sizes[0]) : undefined;
    const cnames = colors.map((c: any) => typeof c === "string" ? c : c.name);
    const newColor = colors.length > 0 ? (cnames.includes(line.color || "") ? line.color : sug.color || cnames[0]) : undefined;
    const colorObj: any = newColor ? colors.find((c: any) => (typeof c === "string" ? c : c.name) === newColor) : undefined;
    let variantObj: any = undefined;
    let newVariant: string | undefined = undefined;
    if (variants.length > 0) {
      variantObj = variants.find((v: any) => (v.name || v.label) === line.variant)
        || variants.find((v: any) => (v.name || v.label) === sug.variant)
        || variants[0];
      newVariant = variantObj?.name || variantObj?.label;
    }
    const newSku = variantObj?.sku || (typeof colorObj === "object" ? colorObj?.sku : undefined) || p.sku || undefined;
    const newImage = variantObj?.image || (typeof colorObj === "object" ? colorObj?.image : undefined) || p.image || (Array.isArray(p.images) && p.images[0]) || line.image;
    const oldVariantExtra = Number((variants.find((v: any) => (v.name || v.label) === line.variant))?.price || 0);
    const newVariantExtra = Number(variantObj?.price || 0);
    const newBase = line.retail_price + newVariantExtra;
    const newSell = Math.max(newBase, line.sell_price + (newVariantExtra - oldVariantExtra));
    const stockRaw = variantObj?.stock ?? (typeof colorObj === "object" ? colorObj?.stock : undefined) ?? p.stock ?? 0;
    const stock = Number(stockRaw);
    const isAlways = stock >= 999999;
    const newLineId = `${line.import_id}|${newSize || ""}|${newColor || ""}|${newVariant || ""}`;
    const patch: Partial<DsCartItem> = {
      size: newSize, color: newColor, variant: newVariant, sku: newSku,
      sell_price: newSell, image: newImage,
      stock: isAlways ? undefined : stock,
    };
    console.log("[DsCart:autoFix]", { from: line.line_id, to: newLineId, patch });
    if (newLineId === line.line_id) {
      updateDsCartItem(line.line_id, patch);
    } else {
      removeDsCartItem(line.line_id);
      addToDsCart({
        import_id: line.import_id, product_id: line.product_id, name: line.name,
        image: newImage, base_price: line.base_price, retail_price: line.retail_price,
        sell_price: newSell, size: newSize, color: newColor, variant: newVariant,
        sku: newSku, stock: isAlways ? undefined : stock, qty: line.qty,
      });
    }
    return true;
  };

  const autoFixOne = (line: DsCartItem) => {
    const ok = applyAutoFix(line);
    if (ok) toast.success("Line fixed & re-validated");
    else toast.error("Could not auto-fix — use Edit variant");
    setTimeout(() => setRev(r => r + 1), 120);
  };

  const autoFixAll = () => {
    const bad = items.filter(l => mismatches[l.line_id]);
    let ok = 0;
    bad.forEach(l => { if (applyAutoFix(l)) ok++; });
    toast.success(`${ok}/${bad.length} lines fixed & re-validated`);
    setTimeout(() => setRev(r => r + 1), 120);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm font-semibold">Your dropshipper cart is empty</p>
        <p className="mt-1 text-xs text-muted-foreground">Go to "My products" and click the Cart icon on any product to add it here.</p>
        <button onClick={onContinue} className="mt-3 rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Browse my products</button>
      </div>
    );
  }
  const subtotal = items.reduce((s, l) => s + l.sell_price * l.qty, 0);
  const profit = items.reduce((s, l) => s + Math.max(0, l.sell_price - l.base_price) * l.qty, 0);
  const totalQty = items.reduce((s, l) => s + l.qty, 0);
  const mismatchCount = Object.keys(mismatches).length;
  const hasMismatch = mismatchCount > 0;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5"><ShoppingCart className="h-4 w-4 text-primary" />Cart ({totalQty} items)</h3>
          <button onClick={() => { clearDsCart(); }} className="text-[11px] text-red-600 hover:underline">Clear all</button>
        </div>
        {hasMismatch && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-red-300 bg-red-50 p-2 text-[11px] text-red-800">
            <div><b>⚠ {mismatchCount} line{mismatchCount > 1 ? "s" : ""} need attention.</b> One-tap auto-fix uses current valid values.</div>
            <button onClick={autoFixAll} className="shrink-0 rounded-md bg-red-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-700">⚡ Fix all</button>
          </div>
        )}
        <div className="space-y-2">
          {items.map((l, idx) => {
            const p = Math.max(0, l.sell_price - l.base_price) * l.qty;
            const oos = l.stock !== undefined && l.stock <= 0;
            const mm = mismatches[l.line_id];
            const hasErr = !!mm;
            return (
              <div key={l.line_id} className={`flex gap-2 rounded-md border p-2 ${hasErr ? "border-red-400 bg-red-50/60" : "bg-muted/30"}`}>
                {l.image && <ProductImage src={l.image} alt="" className="h-16 w-16 flex-shrink-0 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-xs font-semibold">
                      <span className={`mr-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${hasErr ? "bg-red-600 text-white" : "bg-muted-foreground/20"}`}>#{idx + 1}</span>
                      {l.name}
                    </p>
                    <button onClick={() => removeDsCartItem(l.line_id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Base ৳{l.base_price.toFixed(0)} · Sell ৳{l.sell_price.toFixed(0)}</p>
                  {(l.size || l.color || l.variant || l.sku) && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[l.variant, l.size && `Size: ${l.size}`, l.color && `Color: ${l.color}`, l.sku && `SKU: ${l.sku}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {oos && <p className="text-[10px] font-bold text-red-600">Out of stock — edit variant</p>}
                  {hasErr && (
                    <div className="mt-1 rounded border border-red-300 bg-white/70 p-1.5 text-[10px] text-red-800">
                      {mm.issues.map((iss, i) => <div key={i}>• {iss}</div>)}
                      {mm.suggested && (
                        <div className="mt-0.5 text-green-800">
                          Suggested: {[mm.suggested.variant, mm.suggested.size && `Size ${mm.suggested.size}`, mm.suggested.color && `Color ${mm.suggested.color}`, mm.suggested.sku && `SKU ${mm.suggested.sku}`].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="inline-flex items-center rounded border">
                      <button onClick={() => updateDsCartItem(l.line_id, { qty: Math.max(1, l.qty - 1) })} className="p-0.5"><Minus className="h-3 w-3" /></button>
                      <span className="min-w-[28px] text-center text-xs font-bold">{l.qty}</span>
                      <button onClick={() => updateDsCartItem(l.line_id, { qty: l.qty + 1 })} className="p-0.5"><Plus className="h-3 w-3" /></button>
                    </div>
                    {hasErr && <button onClick={() => autoFixOne(l)} className="inline-flex items-center gap-1 rounded border border-green-600 bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-green-700">⚡ Auto-fix</button>}
                    <button onClick={() => setEditing(l)} className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold hover:bg-muted ${hasErr ? "border-red-500 text-red-700" : ""}`}><Edit3 className="h-3 w-3" />{hasErr ? "Manual fix" : "Edit variant"}</button>
                    <span className="ml-auto text-xs font-bold text-green-700">+৳{p.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 rounded-md bg-green-50 p-2 text-xs space-y-0.5">
          <div className="flex justify-between"><span>Subtotal (customer)</span><span className="font-bold">৳{subtotal.toFixed(0)}</span></div>
          <div className="flex justify-between"><span>Your profit</span><span className="font-extrabold text-green-700">৳{profit.toFixed(0)}</span></div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={onContinue} className="flex-1 rounded-md border py-2 text-xs font-bold hover:bg-muted">Continue shopping</button>
          <button
            onClick={() => { if (hasMismatch) { toast.error(`Fix ${mismatchCount} highlighted line${mismatchCount > 1 ? "s" : ""} first`); return; } onCheckout(); }}
            disabled={hasMismatch}
            className={`flex-1 rounded-md py-2 text-xs font-bold ${hasMismatch ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground"}`}
          >
            {hasMismatch ? `Fix ${mismatchCount} issue${mismatchCount > 1 ? "s" : ""}` : `Checkout all (${totalQty})`}
          </button>
        </div>
      </div>
      {editing && <EditCartLineModal line={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}


function EditCartLineModal({ line, onClose }: { line: DsCartItem; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [opts, setOpts] = useState<{
    sizes: string[];
    colors: { name: string; hex?: string; image?: string; sku?: string; stock?: number }[];
    variants: { name: string; price?: number; sku?: string; stock?: number; image?: string; color?: string; size?: string }[];
    sku?: string; image?: string; stock?: number;
  }>({ sizes: [], colors: [], variants: [] });
  const [selSize, setSelSize] = useState(line.size || "");
  const [selColor, setSelColor] = useState(line.color || "");
  const [selVariant, setSelVariant] = useState(line.variant || "");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("sizes,colors,variants,sku,image,stock").eq("id", line.product_id).maybeSingle();
      if (data) setOpts({
        sizes: Array.isArray(data.sizes) ? (data.sizes as string[]) : [],
        colors: Array.isArray(data.colors) ? (data.colors as any[]) : [],
        variants: Array.isArray(data.variants) ? (data.variants as any[]) : [],
        sku: data.sku || undefined,
        image: data.image || undefined,
        stock: data.stock ?? undefined,
      });
      setLoading(false);
    })();
  }, [line.product_id]);

  const selColorObj = selColor ? opts.colors.find(c => c.name === selColor) : undefined;
  const selVariantObj = selVariant ? opts.variants.find(v => v.name === selVariant) : undefined;
  const variantExtra = Number(selVariantObj?.price || 0);
  const effSku = selVariantObj?.sku || selColorObj?.sku || opts.sku || "";
  const effStockRaw = selVariantObj?.stock ?? selColorObj?.stock ?? opts.stock ?? 0;
  const effStock = Number(effStockRaw);
  const isAlwaysInStock = effStock >= 999999;
  const effImage = selVariantObj?.image || selColorObj?.image || opts.image || line.image;
  const basePrice = line.retail_price + variantExtra;
  const effSell = Math.max(basePrice, line.sell_price + (variantExtra - Number(opts.variants.find(v => v.name === line.variant)?.price || 0)));

  const hasSizes = opts.sizes.length > 0;
  const hasColors = opts.colors.length > 0;
  const hasVariants = opts.variants.length > 0;

  const save = () => {
    if (hasSizes && !selSize) return toast.error("Select a size");
    if (hasColors && !selColor) return toast.error("Select a color");
    if (hasVariants && !selVariant) return toast.error("Select a variant");
    if (!isAlwaysInStock && effStock < line.qty) return toast.error(`Only ${effStock} in stock for this variant`);
    const patch: Partial<DsCartItem> = {
      size: selSize || undefined,
      color: selColor || undefined,
      variant: selVariant || undefined,
      sku: effSku || undefined,
      sell_price: effSell,
      image: effImage,
      stock: isAlwaysInStock ? undefined : effStock,
    };
    const newLineId = `${line.import_id}|${selSize || ""}|${selColor || ""}|${selVariant || ""}`;
    console.log("[DsCart:editVariant]", { from: line.line_id, to: newLineId, patch });
    if (newLineId === line.line_id) {
      updateDsCartItem(line.line_id, patch);
    } else {
      removeDsCartItem(line.line_id);
      addToDsCart({
        import_id: line.import_id,
        product_id: line.product_id,
        name: line.name,
        image: effImage,
        base_price: line.base_price,
        retail_price: line.retail_price,
        sell_price: effSell,
        size: selSize || undefined,
        color: selColor || undefined,
        variant: selVariant || undefined,
        sku: effSku || undefined,
        stock: isAlwaysInStock ? undefined : effStock,
        qty: line.qty,
      });
    }
    toast.success("Variant updated");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="text-sm font-bold">Edit variant</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {loading ? <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p> : (
          <div className="mt-3 space-y-3 text-xs">
            <div className="flex gap-2">
              {effImage && <ProductImage src={effImage} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="flex-1">
                <p className="font-semibold line-clamp-2">{line.name}</p>
                <p className="text-muted-foreground">SKU: <span className="font-mono">{effSku || "—"}</span></p>
                <p>Price: <span className="font-bold text-green-700">৳{effSell.toFixed(0)}</span></p>
                <p className={effStock <= 0 && !isAlwaysInStock ? "text-red-600 font-bold" : ""}>
                  Stock: {isAlwaysInStock ? "In stock" : effStock}
                </p>
              </div>
            </div>
            {hasSizes && (
              <div>
                <p className="mb-1 font-semibold">Size</p>
                <div className="flex flex-wrap gap-1">
                  {opts.sizes.map(s => (
                    <button key={s} onClick={() => setSelSize(s)} className={`rounded border px-2 py-1 font-semibold ${selSize === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
            {hasColors && (
              <div>
                <p className="mb-1 font-semibold">Color</p>
                <div className="flex flex-wrap gap-1">
                  {opts.colors.map(c => (
                    <button key={c.name} onClick={() => setSelColor(c.name)} className={`flex items-center gap-1 rounded border px-2 py-1 font-semibold ${selColor === c.name ? "border-primary ring-2 ring-primary" : "hover:bg-muted"}`}>
                      {c.hex && <span className="h-3 w-3 rounded-full border" style={{ background: c.hex }} />}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hasVariants && (
              <div>
                <p className="mb-1 font-semibold">Variant</p>
                <select value={selVariant} onChange={e => setSelVariant(e.target.value)} className="w-full rounded border bg-background px-2 py-1.5">
                  <option value="">Select variant…</option>
                  {opts.variants.map(v => <option key={v.name} value={v.name}>{v.name}{v.price ? ` (+৳${v.price})` : ""}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 rounded border py-1.5 font-bold hover:bg-muted">Cancel</button>
              <button onClick={save} className="flex-1 rounded bg-primary py-1.5 font-bold text-primary-foreground">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



function MyProducts({ imports, products, storeSlug, onReload }: { imports: DropshipperProduct[]; products: Product[]; storeSlug: string; onReload: () => void | Promise<void> }) {
  const pMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "profit" | "price">("new");
  type StatusKey = "all" | "active" | "hidden" | "oos" | "na" | "mine_inactive";
  const [statusFilter, setStatusFilter] = useState<StatusKey>(() => {
    try { return (localStorage.getItem("ds_products_status") as StatusKey) || "all"; } catch { return "all"; }
  });
  useEffect(() => { try { localStorage.setItem("ds_products_status", statusFilter); } catch {} }, [statusFilter]);

  const computeStatus = (i: DropshipperProduct): Exclude<StatusKey, "all"> => {
    const st = stocks.get(i.product_id);
    if (!st) return "na";
    if (!st.is_active) return "hidden";
    if (st.stock != null && st.stock <= 0) return "oos";
    if (!i.is_active) return "mine_inactive";
    return "active";
  };
  const [detail, setDetail] = useState<{ imp: DropshipperProduct; p: Product | undefined } | null>(null);
  const [editing, setEditing] = useState<DropshipperProduct | null>(null);
  const [ordering, setOrdering] = useState<{ imp: DropshipperProduct; p: Product | undefined } | null>(null);
  const [cart, setCart] = useState<DsCartItem[]>(() => getDsCart());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [stocks, setStocks] = useState<Map<string, { is_active: boolean; stock: number | null }>>(new Map());
  useEffect(() => subscribeDsCart(setCart), []);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  useEffect(() => {
    const ids = Array.from(new Set(imports.map(i => i.product_id)));
    if (ids.length === 0) { setStocks(new Map()); return; }
    (async () => {
      const { data } = await supabase.from("products").select("id,is_active,stock").in("id", ids);
      const m = new Map<string, { is_active: boolean; stock: number | null }>();
      for (const r of (data || []) as Array<{ id: string; is_active: boolean; stock: number | null }>) {
        m.set(r.id, { is_active: !!r.is_active, stock: r.stock });
      }
      setStocks(m);
    })();
  }, [imports]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);


  const counts = useMemo(() => {
    const c = { all: imports.length, active: 0, hidden: 0, oos: 0, na: 0, mine_inactive: 0 } as Record<StatusKey, number>;
    imports.forEach(i => { c[computeStatus(i)]++; });
    return c;
  }, [imports, stocks]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = imports.filter(i => {
      if (statusFilter !== "all" && computeStatus(i) !== statusFilter) return false;
      if (!s) return true;
      const p = pMap.get(i.product_id);
      const name = (i.custom_title || p?.title.en || "").toLowerCase();
      const cat = (p?.categoryName || "").toLowerCase();
      return name.includes(s) || cat.includes(s);
    });
    const sorted = [...filtered];
    if (sort === "profit") sorted.sort((a, b) => {
      const pa = Number(a.retail_price) - Number(pMap.get(a.product_id)?.dropshipper_price ?? pMap.get(a.product_id)?.price ?? 0);
      const pb = Number(b.retail_price) - Number(pMap.get(b.product_id)?.dropshipper_price ?? pMap.get(b.product_id)?.price ?? 0);
      return pb - pa;
    });
    if (sort === "price") sorted.sort((a, b) => Number(a.retail_price) - Number(b.retail_price));
    return sorted;
  }, [imports, pMap, q, sort, statusFilter, stocks]);


  if (imports.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <Package className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No products imported yet. Switch to the "Import from catalog" tab to add products.</p>
      </div>
    );
  }

  const shareLink = buildDsLink(storeSlug);
  const share = async (path?: string) => {
    try { await navigator.clipboard.writeText(path ? `${shareLink.split("?")[0]}${path}${shareLink.includes("?") ? shareLink.slice(shareLink.indexOf("?")) : ""}` : shareLink); toast.success("Link copied"); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search my products…" className="w-full rounded-md border pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="rounded-md border px-2 py-2 text-xs">
          <option value="new">Newest</option>
          <option value="profit">Highest profit</option>
          <option value="price">Lowest price</option>
        </select>
        <span className="text-[11px] text-muted-foreground">{rows.length} of {imports.length}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {([
          { k: "all", label: "All", cls: "bg-primary text-primary-foreground border-primary" },
          { k: "active", label: "Active", cls: "bg-green-600 text-white border-green-600" },
          { k: "oos", label: "Out of stock", cls: "bg-amber-500 text-white border-amber-500" },
          { k: "hidden", label: "Hidden", cls: "bg-zinc-800 text-white border-zinc-800" },
          { k: "na", label: "Not available", cls: "bg-red-600 text-white border-red-600" },
          { k: "mine_inactive", label: "My Inactive", cls: "bg-black text-white border-black" },
        ] as Array<{ k: StatusKey; label: string; cls: string }>).map(chip => {
          const on = statusFilter === chip.k;
          return (
            <button
              key={chip.k}
              onClick={() => setStatusFilter(chip.k)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${on ? chip.cls : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground"}`}
            >
              {chip.label}
              <span className={`rounded-full px-1.5 text-[10px] ${on ? "bg-white/20" : "bg-muted"}`}>{counts[chip.k]}</span>
            </button>
          );
        })}
      </div>


      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rows.map(i => {
          const p = pMap.get(i.product_id);
          const base = Number(p?.dropshipper_price ?? p?.price ?? 0);
          const retail = Number(i.retail_price);
          const profit = Math.max(0, retail - base);
          const mrp = Number(p?.mrp || 0);
          return (
            <div key={i.id} className={`group flex flex-col overflow-hidden rounded-md border border-border bg-card transition hover:border-primary hover:shadow-card-hover ${!i.is_active ? "opacity-60" : ""}`}>
              {(() => {
                const st = stocks.get(i.product_id);
                const known = !!st;
                const hidden = known && !st!.is_active;
                const outOfStock = known && st!.is_active && st!.stock != null && st!.stock <= 0;
                const overlay = !known
                  ? { text: "Not available", cls: "bg-red-600/90", tip: "Source product not found on site" }
                  : hidden
                  ? { text: "Hidden", cls: "bg-zinc-800/85", tip: "Hidden by admin — not visible on site" }
                  : outOfStock
                  ? { text: "Out of stock", cls: "bg-amber-600/90", tip: "Inventory is 0 on the source product" }
                  : null;
                return (
                  <button onClick={() => setDetail({ imp: i, p })} className="relative block aspect-square overflow-hidden bg-muted">
                    {p?.image ? <ProductImage src={p.image} alt={p.title.en} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-8 w-8" /></div>}
                    {profit > 0 && <span className="absolute left-1 top-1 rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">+৳{profit.toFixed(0)}</span>}
                    {!i.is_active && <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white" title="You marked this inactive in My Products">My: Inactive</span>}
                    {overlay && (
                      <span title={overlay.tip} className={`absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white shadow ${overlay.cls}`}>
                        {overlay.text}
                      </span>
                    )}
                  </button>
                );
              })()}

              <div className="flex flex-1 flex-col p-1.5 leading-none">
                <p className="truncate text-[11px] leading-tight text-foreground group-hover:text-primary">{i.custom_title || p?.title.en || "Product"}</p>
                <div className="mt-0.5 flex items-baseline gap-1 leading-none">
                  <span className="text-[12px] font-bold leading-none text-yellow-500">৳{retail.toFixed(0)}</span>
                  {mrp > retail && <span className="text-[9px] leading-none text-muted-foreground line-through">৳{mrp.toFixed(0)}</span>}
                </div>
                <p className="mt-0.5 text-[9px] leading-none text-muted-foreground">Base ৳{base.toFixed(0)} · <span className="font-bold text-green-700">+৳{profit.toFixed(0)}</span></p>
                <div className="mt-1 grid grid-cols-4 gap-0.5">
                  <button
                    onClick={() => {
                      addToDsCart({ import_id: i.id, product_id: i.product_id, name: i.custom_title || p?.title.en || "Product", image: p?.image, base_price: base, retail_price: retail, sell_price: retail });
                      toast.success("Added to cart");
                    }}
                    className="inline-flex items-center justify-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-semibold text-primary hover:bg-primary/10"
                    title="Add to dropshipper cart"
                  ><ShoppingCart className="h-2.5 w-2.5" />Cart</button>
                  <button onClick={() => setEditing(i)} className="inline-flex items-center justify-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-semibold hover:bg-muted"><Edit3 className="h-2.5 w-2.5" />Edit</button>
                  <button onClick={() => share()} className="inline-flex items-center justify-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-semibold hover:bg-muted"><Share2 className="h-2.5 w-2.5" />Share</button>
                  {(() => {
                    const st = stocks.get(i.product_id);
                    const known = !!st;
                    const hidden = known && !st!.is_active;
                    const outOfStock = known && st!.is_active && st!.stock != null && st!.stock <= 0;
                    const siteActive = known && st!.is_active && (st!.stock == null || st!.stock > 0);
                    const reason = !known
                      ? "Not available — source product not found"
                      : hidden
                      ? "Hidden by admin — not visible on site"
                      : outOfStock
                      ? "Out of stock — inventory is 0"
                      : "Active — visible & in stock";
                    const label = siteActive ? "Active" : hidden ? "Hidden" : outOfStock ? "Out of stock" : "Not available";
                    const cls = siteActive
                      ? "border-green-200 bg-green-50 text-green-700"
                      : outOfStock
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-red-200 bg-red-50 text-red-600";
                    const isOpen = openMenu === i.id;
                    return (
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenu(isOpen ? null : i.id)}
                          title={reason}
                          className={`inline-flex w-full items-center justify-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-semibold hover:brightness-95 ${cls}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${siteActive ? "bg-green-500" : outOfStock ? "bg-amber-500" : "bg-red-500"}`} />
                          <span className="truncate">{label}</span> ▾
                        </button>

                        {isOpen && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-24 overflow-hidden rounded-md border bg-popover shadow-lg">
                            <div className={`flex items-center gap-1 px-2 py-1 text-[10px] ${siteActive ? "text-green-700" : "text-muted-foreground"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${siteActive ? "bg-green-500" : "bg-muted-foreground/40"}`} />Active
                            </div>
                            <div className={`flex items-center gap-1 px-2 py-1 text-[10px] ${!siteActive ? "text-red-600" : "text-muted-foreground"}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${!siteActive ? "bg-red-500" : "bg-muted-foreground/40"}`} />Inactive
                            </div>
                            <button
                              onClick={async () => {
                                setOpenMenu(null);
                                if (!confirm("Remove this product from My Products?")) return;
                                try { await removeImport(i.id); toast.success("Deleted"); await onReload(); }
                                catch (e) { toast.error((e as Error).message); }
                              }}
                              className="flex w-full items-center gap-1 border-t px-2 py-1 text-left text-[10px] font-semibold text-red-600 hover:bg-red-50"
                            ><Trash2 className="h-2.5 w-2.5" />Delete</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {detail && (
        <ProductDetailModal
          imp={detail.imp}
          p={detail.p}
          storeSlug={storeSlug}
          onClose={() => setDetail(null)}
          onOrder={() => { setOrdering({ imp: detail.imp, p: detail.p }); setDetail(null); }}
        />
      )}


      {editing && (
        <EditImportModal
          imp={editing}
          basePrice={Number(pMap.get(editing.product_id)?.dropshipper_price ?? pMap.get(editing.product_id)?.price ?? 0)}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await onReload(); }}
        />
      )}

      {ordering && (
        <DropshipperOrderModal
          imp={ordering.imp}
          p={ordering.p}
          onClose={() => setOrdering(null)}
          onPlaced={() => setOrdering(null)}
        />
      )}



      {cartCount > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-card px-4 py-2 shadow-2xl flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="font-bold">{cartCount}</span>
            <span className="text-muted-foreground text-xs">items in cart</span>
          </div>
          <button onClick={() => setBulkOpen(true)} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            Order All
          </button>
        </div>
      )}

      {bulkOpen && (
        <DsBulkOrderModal
          items={cart}
          onClose={() => setBulkOpen(false)}
          onPlaced={() => { clearDsCart(); setBulkOpen(false); }}
        />
      )}
    </div>
  );
}

function ProductDetailModal({ imp, p, storeSlug, onClose, onOrder }: { imp: DropshipperProduct; p: Product | undefined; storeSlug: string; onClose: () => void; onOrder: () => void }) {
  const base = Number(p?.dropshipper_price ?? p?.price ?? 0);
  const retail = Number(imp.retail_price);
  const profit = Math.max(0, retail - base);
  const gallery = (p?.gallery && p.gallery.length ? p.gallery : (p?.image ? [p.image] : [])).slice(0, 6);
  const [active, setActive] = useState(0);
  const share = async () => {
    try { await navigator.clipboard.writeText(buildDsLink(storeSlug)); toast.success("Store link copied"); }
    catch { toast.error("Copy failed"); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2.5">
          <h3 className="truncate text-sm font-bold">{imp.custom_title || p?.title.en || "Product"}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
              {gallery[active] ? <ProductImage src={gallery[active]} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}
            </div>
            {gallery.length > 1 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto">
                {gallery.map((g, idx) => (
                  <button key={idx} onClick={() => setActive(idx)} className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded border-2 ${idx === active ? "border-primary" : "border-transparent"}`}>
                    <ProductImage src={g} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {p?.categoryName && <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{p.categoryName}{p.subcategoryName ? ` · ${p.subcategoryName}` : ""}</p>}
            <h2 className="text-lg font-extrabold leading-tight">{imp.custom_title || p?.title.en}</h2>
            {p?.rating ? <p className="inline-flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-amber-500 text-amber-500" />{p.rating.toFixed(1)}</p> : null}
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-primary">৳{retail.toFixed(0)}</span>
                {p?.mrp && p.mrp > retail && <span className="text-sm text-muted-foreground line-through">৳{p.mrp.toFixed(0)}</span>}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                <div><p className="text-muted-foreground">Base</p><p className="font-bold">৳{base.toFixed(0)}</p></div>
                <div><p className="text-muted-foreground">Retail</p><p className="font-bold">৳{retail.toFixed(0)}</p></div>
                <div><p className="text-muted-foreground">Profit</p><p className="font-bold text-green-700">৳{profit.toFixed(0)}</p></div>
              </div>
            </div>
            {(imp.custom_description || p?.description.en) && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Description</p>
                <div className="mt-1 max-h-40 overflow-y-auto rounded border bg-muted/30 p-2 text-xs leading-relaxed whitespace-pre-line">
                  {imp.custom_description || p?.description.en}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={onOrder} className="col-span-2 inline-flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-sky-500 via-pink-500 to-purple-600 px-3 py-2 text-sm font-bold text-white hover:opacity-90">
                <Truck className="h-4 w-4" />Dropshipper Order
              </button>

              <button onClick={share} className="inline-flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted"><Share2 className="h-3.5 w-3.5" />Share store</button>
              <Link to="/ds/$slug" params={{ slug: storeSlug }} target="_blank" className="inline-flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted"><Eye className="h-3.5 w-3.5" />Public store</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditImportModal({ imp, basePrice, onClose, onSaved }: { imp: DropshipperProduct; basePrice: number; onClose: () => void; onSaved: () => void | Promise<void> }) {
  const [retail, setRetail] = useState(String(imp.retail_price));
  const [title, setTitle] = useState(imp.custom_title || "");
  const [desc, setDesc] = useState(imp.custom_description || "");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const price = Number(retail);
    if (!price || price < basePrice) { toast.error(`Retail must be at least ৳${basePrice}`); return; }
    setBusy(true);
    try {
      await updateImport(imp.id, { retail_price: price, custom_title: title || null as unknown as string, custom_description: desc || null as unknown as string });
      toast.success("Saved");
      await onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Remove this product from your store?")) return;
    setBusy(true);
    try { await removeImport(imp.id); toast.success("Removed"); await onSaved(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const profit = Math.max(0, Number(retail || 0) - basePrice);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">Edit product</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <label className="block">
          <span className="text-xs font-semibold">Retail price (৳)</span>
          <input type="number" min={basePrice} value={retail} onChange={e => setRetail(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" />
        </label>
        <div className="mt-2 rounded-md bg-green-50 p-2 text-[11px]">
          <div className="flex justify-between"><span>Base cost:</span><span className="font-bold">৳{basePrice.toFixed(0)}</span></div>
          <div className="flex justify-between"><span>Your profit per unit:</span><span className="font-bold text-green-700">৳{profit.toFixed(0)}</span></div>
        </div>
        <label className="mt-3 block">
          <span className="text-xs font-semibold">Custom title (optional)</span>
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-semibold">Custom description (optional)</span>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm" />
        </label>
        <div className="mt-4 flex gap-2">
          <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-60"><Trash2 className="h-3 w-3" />Remove</button>
          <button onClick={save} disabled={busy} className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

function DropshipperOrderModal({ imp, p, onClose, onPlaced }: { imp: DropshipperProduct; p: Product | undefined; onClose: () => void; onPlaced: () => void }) {
  const base = Number(p?.dropshipper_price ?? p?.price ?? 0);
  const defaultSell = Number(imp.retail_price || base);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [qty, setQty] = useState(1);
  const [sellPrice, setSellPrice] = useState(String(defaultSell));
  const [payment, setPayment] = useState<"cod" | "bkash" | "nagad" | "rocket">("cod");
  const [payOption, setPayOption] = useState<"full" | "delivery">("full");
  const [txnId, setTxnId] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState<{ sizes: string[]; colors: { name: string; hex?: string }[]; variants: { name: string; color?: string; size?: string; price?: number }[] }>({ sizes: [], colors: [], variants: [] });
  const [selSize, setSelSize] = useState("");
  const [selColor, setSelColor] = useState("");
  const [selVariant, setSelVariant] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("sizes,colors,variants").eq("id", imp.product_id).maybeSingle();
      if (data) setOpts({
        sizes: Array.isArray(data.sizes) ? (data.sizes as string[]) : [],
        colors: Array.isArray(data.colors) ? (data.colors as { name: string; hex?: string }[]) : [],
        variants: Array.isArray(data.variants) ? (data.variants as { name: string; color?: string; size?: string; price?: number }[]) : [],
      });
    })();
  }, [imp.product_id]);

  const hasSizes = opts.sizes.length > 0;
  const hasColors = opts.colors.length > 0;
  const hasVariants = opts.variants.length > 0;
  const selVariantObj: any = hasVariants && selVariant ? opts.variants.find(v => v.name === selVariant) : undefined;
  const selColorObj: any = hasColors && selColor ? (opts.colors as any[]).find((c: any) => (typeof c === "string" ? c : c.name) === selColor) : undefined;
  const variantExtra = Number(selVariantObj?.price || 0);
  const effSku = selVariantObj?.sku || (selColorObj && typeof selColorObj === "object" ? selColorObj.sku : "") || (opts as any).sku || "";


  const isWallet = payment !== "cod";
  const MERCHANT = "01759968476";
  const WALLET_META: Record<string, { label: string; brand: string }> = {
    bkash: { label: "bKash", brand: "#e2136e" },
    nagad: { label: "Nagad", brand: "#ec1c24" },
    rocket: { label: "Rocket", brand: "#8a338a" },
  };

  const sell = Number(sellPrice) || 0;
  const shipping = district.trim().toLowerCase() === "dhaka" ? 70 : 120;
  const subtotal = sell * qty;
  const total = subtotal + shipping;
  const profit = Math.max(0, sell - base) * qty;

  const walletAmount = isWallet ? (payOption === "full" ? total : shipping) : 0;

  const submit = async () => {
    if (!customerName.trim() || !/^01[3-9]\d{8}$/.test(phone.trim())) return toast.error("Valid customer name & phone required");
    if (!address.trim() || !district.trim()) return toast.error("Delivery address & district required");
    if (hasSizes && !selSize) return toast.error("Please select a size");
    if (hasColors && !selColor) return toast.error("Please select a color");
    if (hasVariants && !selVariant) return toast.error("Please select a variant");
    if (sell < base) return toast.error(`Sell price must be at least ৳${base} (base cost)`);

    if (isWallet) {
      if (!/^[A-Z0-9]{6,20}$/i.test(txnId.trim())) return toast.error("Enter a valid transaction ID");
      if (!/^01[3-9]\d{8}$/.test(senderPhone.trim())) return toast.error(`Enter the ${WALLET_META[payment].label} number you paid from`);
    }
    setBusy(true);
    try {
      const { data: prow } = await supabase.from("products").select("vendor_id,image,name,sizes,colors,variants,sku").eq("id", imp.product_id).maybeSingle();
      // Validate variant integrity against current product data
      const pAny: any = prow || {};
      const curSizes: string[] = Array.isArray(pAny.sizes) ? pAny.sizes : [];
      const curColors: string[] = Array.isArray(pAny.colors) ? pAny.colors : [];
      const curVariants: any[] = Array.isArray(pAny.variants) ? pAny.variants : [];
      const issues: string[] = [];
      if (curSizes.length > 0 && (!selSize || !curSizes.includes(selSize))) issues.push(`Size "${selSize || "—"}" no longer valid`);
      if (curColors.length > 0 && (!selColor || !curColors.includes(selColor))) issues.push(`Color "${selColor || "—"}" no longer valid`);
      if (curVariants.length > 0) {
        const match = curVariants.find((v: any) => (v.name || v.label) === selVariant);
        if (!selVariant || !match) issues.push(`Variant "${selVariant || "—"}" no longer valid`);
        else if (match.sku && effSku && match.sku !== effSku) issues.push(`SKU mismatch (selected: ${effSku}, current: ${match.sku})`);
      } else if (pAny.sku && effSku && pAny.sku !== effSku) {
        issues.push(`SKU mismatch (selected: ${effSku}, current: ${pAny.sku})`);
      }
      if (issues.length > 0) {
        console.warn("[DsOrder:validation]", issues);
        toast.error(issues.join(" • "), { duration: 6000 });
        setBusy(false);
        return;
      }
      const orderItems = [{
        id: imp.product_id,
        name: `${imp.custom_title || prow?.name || p?.title.en || "Product"}${selVariant ? ` — ${selVariant}` : ""}${selSize ? ` / Size: ${selSize}` : ""}${selColor ? ` / Color: ${selColor}` : ""}`,
        price: sell + variantExtra,
        qty,
        image: prow?.image || p?.image,
        size: selSize || undefined,
        color: selColor || undefined,
        variant: selVariant || undefined,
        sku: effSku || undefined,
      }];
      console.groupCollapsed("[DsOrder:submit] order items payload");
      console.log(orderItems);
      console.table(orderItems.map(({ id, name, price, qty, size, color, variant, sku }: any) => ({ id, name, price, qty, size, color, variant, sku })));
      console.groupEnd();
      const row = await createDBOrder({
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        address: address.trim(),
        district: district.trim(),
        thana: thana.trim(),
        items: orderItems,
        subtotal,
        delivery_fee: shipping,
        total,
        payment_method: payment,
        payment_type: isWallet ? payOption : undefined,
        txn_id: isWallet ? txnId.trim().toUpperCase() : undefined,
        sender_phone: isWallet ? senderPhone.trim() : undefined,
        paid_amount: isWallet ? walletAmount : undefined,
        notes: notes.trim() || undefined,
        vendor_id: prow?.vendor_id ?? null,
      });
      if (row?.id) {
        const ds = await getMyDropshipper();
        if (ds) await attributeOrderToDs(row.id, ds.code, [{ product_id: imp.product_id, base_price: base, retail_price: sell, qty }]);
        toast.success(`Order placed: ${row.order_number}`);
        onPlaced();
      } else {
        toast.error("Order failed");
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2.5">
          <h3 className="text-sm font-bold flex items-center gap-1.5"><Truck className="h-4 w-4" />Dropshipper Order</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border bg-muted/30 p-2">
              {p?.image && <ProductImage src={p.image} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-semibold">{imp.custom_title || p?.title.en}</p>
                <p className="text-[11px] text-muted-foreground">Base ৳{base.toFixed(0)} · Your listed ৳{Number(imp.retail_price).toFixed(0)}</p>
              </div>
            </div>
            <label className="block">
              <span className="text-[11px] font-semibold">Sell price per unit (৳) — you can increase to earn more</span>
              <input type="number" min={base} value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-bold" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold">Quantity</span>
              <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </label>
            {(hasSizes || hasColors || hasVariants) && (
              <div className="rounded-md border bg-amber-50/50 p-2 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">Product options</p>
                {hasSizes && (
                  <div>
                    <span className="text-[11px] font-semibold">Size *</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {opts.sizes.map(s => (
                        <button type="button" key={s} onClick={() => setSelSize(s)} className={`rounded border px-2.5 py-1 text-[11px] font-bold ${selSize === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {hasColors && (
                  <div>
                    <span className="text-[11px] font-semibold">Color *</span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {opts.colors.map(c => (
                        <button type="button" key={c.name} onClick={() => setSelColor(c.name)} title={c.name} className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ${selColor === c.name ? "border-primary ring-2 ring-primary" : "border-border hover:bg-muted"}`}>
                          {c.hex && <span className="inline-block h-3 w-3 rounded-full border" style={{ background: c.hex }} />}
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {hasVariants && (
                  <div>
                    <span className="text-[11px] font-semibold">Variant *</span>
                    <select value={selVariant} onChange={e => setSelVariant(e.target.value)} className="mt-1 w-full rounded-md border px-2 py-1.5 text-xs bg-background">
                      <option value="">Select variant…</option>
                      {opts.variants.map(v => <option key={v.name} value={v.name}>{v.name}{v.price ? ` (+৳${v.price})` : ""}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-md bg-green-50 p-2 text-[11px] space-y-0.5">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">৳{subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span className="font-bold">৳{shipping}</span></div>
              <div className="flex justify-between text-sm"><span className="font-bold">Customer pays</span><span className="font-extrabold text-primary">৳{total.toFixed(0)}</span></div>
              <div className="flex justify-between border-t pt-1"><span>Your profit</span><span className="font-extrabold text-green-700">৳{profit.toFixed(0)}</span></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Customer details</p>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" className="w-full rounded-md border px-3 py-2 text-sm" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (01XXXXXXXXX)" className="w-full rounded-md border px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={district} onChange={e => { setDistrict(e.target.value); setThana(""); }} className="rounded-md border px-3 py-2 text-sm bg-background">
                <option value="">Select district…</option>
                {BD_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={thana} onChange={e => setThana(e.target.value)} disabled={!district} className="rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-60">
                <option value="">{district ? "Select thana…" : "Choose district first"}</option>
                {(BD_LOCATIONS[district] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full delivery address" rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Payment method</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["cod", "bkash", "nagad", "rocket"] as const).map(m => (
                  <button type="button" key={m} onClick={() => setPayment(m)} className={`rounded-md border px-2 py-1.5 text-[11px] font-bold ${payment === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {m === "cod" ? "Cash on Delivery" : WALLET_META[m].label}
                  </button>
                ))}
              </div>
              {isWallet && (
                <div className="mt-2 rounded-md border p-2 space-y-2" style={{ borderColor: WALLET_META[payment].brand }}>
                  <p className="text-[11px] font-bold" style={{ color: WALLET_META[payment].brand }}>
                    {WALLET_META[payment].label} — Send Money to <span className="font-extrabold text-foreground">{MERCHANT}</span>
                  </p>
                  <div className="flex gap-1.5 text-[11px]">
                    {(["full", "delivery"] as const).map(o => (
                      <label key={o} className={`flex flex-1 cursor-pointer items-center gap-1 rounded border px-2 py-1 ${payOption === o ? "border-primary bg-primary/5" : "border-border"}`}>
                        <input type="radio" checked={payOption === o} onChange={() => setPayOption(o)} className="size-3 accent-primary" />
                        <span>{o === "full" ? `Full ৳${total.toFixed(0)}` : `Advance ৳${shipping} (delivery)`}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Send <b>৳{walletAmount.toFixed(0)}</b> to <b>{MERCHANT}</b>, then fill below.</p>
                  <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="Transaction ID" className="w-full rounded border px-2 py-1.5 text-xs uppercase" />
                  <input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder={`${WALLET_META[payment].label} number you paid from`} className="w-full rounded border px-2 py-1.5 text-xs" />
                </div>
              )}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
            <button onClick={submit} disabled={busy} className="mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
              <ShoppingCart className="mr-1 inline h-4 w-4" />{busy ? "Placing…" : "Place order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DsBulkOrderModal({ items, onClose, onPlaced }: { items: DsCartItem[]; onClose: () => void; onPlaced: () => void }) {
  const [lines, setLines] = useState<DsCartItem[]>(items);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<"cod" | "bkash" | "nagad" | "rocket">("cod");
  const [payOption, setPayOption] = useState<"full" | "delivery">("full");
  const [txnId, setTxnId] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const isWallet = payment !== "cod";
  const MERCHANT = "01759968476";
  const WALLET_META: Record<string, { label: string; brand: string }> = {
    bkash: { label: "bKash", brand: "#e2136e" },
    nagad: { label: "Nagad", brand: "#ec1c24" },
    rocket: { label: "Rocket", brand: "#8a338a" },
  };

  const subtotal = lines.reduce((s, l) => s + l.sell_price * l.qty, 0);
  const shipping = district.trim().toLowerCase() === "dhaka" ? 70 : 120;
  const total = subtotal + shipping;
  const profit = lines.reduce((s, l) => s + Math.max(0, l.sell_price - l.base_price) * l.qty, 0);
  const walletAmount = isWallet ? (payOption === "full" ? total : shipping) : 0;

  const patch = (id: string, p: Partial<DsCartItem>) => {
    setLines(lines.map(l => l.line_id === id ? { ...l, ...p } : l));
    updateDsCartItem(id, p);
  };
  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.line_id !== id));
    removeDsCartItem(id);
  };

  const submit = async () => {
    if (lines.length === 0) return toast.error("Cart is empty");
    if (!customerName.trim() || !/^01[3-9]\d{8}$/.test(phone.trim())) return toast.error("Valid customer name & phone required");
    if (!address.trim() || !district.trim()) return toast.error("Delivery address & district required");
    for (const l of lines) {
      if (l.sell_price < l.base_price) return toast.error(`Sell price for "${l.name}" must be ≥ ৳${l.base_price}`);
      if (l.stock !== undefined && l.stock < l.qty) return toast.error(`Only ${l.stock} in stock for "${l.name}"`);
    }
    if (isWallet) {
      if (!/^[A-Z0-9]{6,20}$/i.test(txnId.trim())) return toast.error("Enter a valid transaction ID");
      if (!/^01[3-9]\d{8}$/.test(senderPhone.trim())) return toast.error(`Enter the ${WALLET_META[payment].label} number you paid from`);
    }
    setBusy(true);
    try {
      const ids = lines.map(l => l.product_id);
      const { data: prows } = await supabase.from("products").select("id,vendor_id,image,name,sizes,colors,variants,sku").in("id", ids);
      const pmap = new Map((prows || []).map(r => [r.id, r]));
      const primaryVendor = (prows && prows[0]?.vendor_id) ?? null;

      // Validate each line's variant/SKU against current product data
      const issues: string[] = [];
      lines.forEach((l, idx) => {
        const p: any = pmap.get(l.product_id);
        if (!p) { issues.push(`Line ${idx + 1} "${l.name}": product no longer exists`); return; }
        const sizes: string[] = Array.isArray(p.sizes) ? p.sizes : [];
        const colors: string[] = Array.isArray(p.colors) ? p.colors : [];
        const variants: any[] = Array.isArray(p.variants) ? p.variants : [];
        if (sizes.length > 0 && (!l.size || !sizes.includes(l.size))) issues.push(`Line ${idx + 1} "${l.name}": size "${l.size ?? "—"}" no longer valid`);
        if (colors.length > 0 && (!l.color || !colors.includes(l.color))) issues.push(`Line ${idx + 1} "${l.name}": color "${l.color ?? "—"}" no longer valid`);
        if (variants.length > 0) {
          const match = variants.find((v: any) => (v.name || v.label) === l.variant);
          if (!l.variant || !match) issues.push(`Line ${idx + 1} "${l.name}": variant "${l.variant ?? "—"}" no longer valid`);
          else if (match.sku && l.sku && match.sku !== l.sku) issues.push(`Line ${idx + 1} "${l.name}": SKU mismatch (cart: ${l.sku}, current: ${match.sku})`);
        } else if (p.sku && l.sku && p.sku !== l.sku) {
          issues.push(`Line ${idx + 1} "${l.name}": SKU mismatch (cart: ${l.sku}, current: ${p.sku})`);
        }
      });
      if (issues.length > 0) {
        console.warn("[DsBulkOrder:validation]", issues);
        toast.error(issues[0] + (issues.length > 1 ? ` (+${issues.length - 1} more — check console)` : ""), { duration: 6000 });
        setBusy(false);
        return;
      }

      const orderItems = lines.map(l => ({
        id: l.product_id,
        name: l.name,
        price: l.sell_price,
        qty: l.qty,
        image: pmap.get(l.product_id)?.image || l.image,
        sku: l.sku,
        size: l.size,
        color: l.color,
        variant: l.variant,
      }));
      console.groupCollapsed(`[DsBulkOrder:submit] ${orderItems.length} items payload`);
      console.log(orderItems);
      console.table(orderItems.map(({ id, name, price, qty, sku, size, color, variant }) => ({ id, name, price, qty, sku, size, color, variant })));
      console.groupEnd();
      const row = await createDBOrder({
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        address: address.trim(),
        district: district.trim(),
        thana: thana.trim(),
        items: orderItems,
        subtotal,
        delivery_fee: shipping,
        total,
        payment_method: payment,
        payment_type: isWallet ? payOption : undefined,
        txn_id: isWallet ? txnId.trim().toUpperCase() : undefined,
        sender_phone: isWallet ? senderPhone.trim() : undefined,
        paid_amount: isWallet ? walletAmount : undefined,
        notes: notes.trim() || undefined,
        vendor_id: primaryVendor,
      });
      if (row?.id) {
        const ds = await getMyDropshipper();
        if (ds) await attributeOrderToDs(row.id, ds.code, lines.map(l => ({ product_id: l.product_id, base_price: l.base_price, retail_price: l.sell_price, qty: l.qty })));
        toast.success(`Order placed: ${row.order_number}`);
        onPlaced();
      } else {
        toast.error("Order failed");
      }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2.5">
          <h3 className="text-sm font-bold flex items-center gap-1.5"><ShoppingCart className="h-4 w-4" />Bulk Dropshipper Order ({lines.length})</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Cart items</p>
            {lines.length === 0 && <p className="text-xs text-muted-foreground">Cart is empty.</p>}
            {lines.map(l => {
              const p = Math.max(0, l.sell_price - l.base_price) * l.qty;
              return (
                <div key={l.line_id} className="flex gap-2 rounded-md border bg-muted/30 p-2">
                  {l.image && <ProductImage src={l.image} alt="" className="h-14 w-14 flex-shrink-0 rounded object-cover" />}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="line-clamp-2 text-[11px] font-semibold">{l.name}</p>
                      <button onClick={() => removeLine(l.line_id)} className="text-red-600"><Trash2 className="h-3 w-3" /></button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Base ৳{l.base_price.toFixed(0)}</p>
                    {(l.size || l.color || l.variant || l.sku) && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[l.variant, l.size && `Size: ${l.size}`, l.color && `Color: ${l.color}`, l.sku && `SKU: ${l.sku}`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded border">
                        <button onClick={() => patch(l.line_id, { qty: Math.max(1, l.qty - 1) })} className="p-0.5"><Minus className="h-3 w-3" /></button>
                        <span className="min-w-[24px] text-center text-[11px] font-bold">{l.qty}</span>
                        <button onClick={() => patch(l.line_id, { qty: l.qty + 1 })} className="p-0.5"><Plus className="h-3 w-3" /></button>
                      </div>
                      <label className="flex items-center gap-1 text-[10px]">
                        <span>Sell ৳</span>
                        <input type="number" min={l.base_price} value={l.sell_price} onChange={e => patch(l.line_id, { sell_price: Number(e.target.value) || 0 })} className="w-16 rounded border px-1 py-0.5 text-[11px]" />
                      </label>
                      <span className="ml-auto text-[10px] text-green-700 font-bold">+৳{p.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="rounded-md bg-green-50 p-2 text-[11px] space-y-0.5">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">৳{subtotal.toFixed(0)}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span className="font-bold">৳{shipping}</span></div>
              <div className="flex justify-between text-sm"><span className="font-bold">Customer pays</span><span className="font-extrabold text-primary">৳{total.toFixed(0)}</span></div>
              <div className="flex justify-between border-t pt-1"><span>Your total profit</span><span className="font-extrabold text-green-700">৳{profit.toFixed(0)}</span></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Customer details</p>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name" className="w-full rounded-md border px-3 py-2 text-sm" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (01XXXXXXXXX)" className="w-full rounded-md border px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={district} onChange={e => { setDistrict(e.target.value); setThana(""); }} className="rounded-md border px-3 py-2 text-sm bg-background">
                <option value="">Select district…</option>
                {BD_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={thana} onChange={e => setThana(e.target.value)} disabled={!district} className="rounded-md border px-3 py-2 text-sm bg-background disabled:opacity-60">
                <option value="">{district ? "Select thana…" : "Choose district first"}</option>
                {(BD_LOCATIONS[district] || []).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Full delivery address" rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Payment method</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["cod", "bkash", "nagad", "rocket"] as const).map(m => (
                  <button type="button" key={m} onClick={() => setPayment(m)} className={`rounded-md border px-2 py-1.5 text-[11px] font-bold ${payment === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                    {m === "cod" ? "Cash on Delivery" : WALLET_META[m].label}
                  </button>
                ))}
              </div>
              {isWallet && (
                <div className="mt-2 rounded-md border p-2 space-y-2" style={{ borderColor: WALLET_META[payment].brand }}>
                  <p className="text-[11px] font-bold" style={{ color: WALLET_META[payment].brand }}>
                    {WALLET_META[payment].label} — Send Money to <span className="font-extrabold text-foreground">{MERCHANT}</span>
                  </p>
                  <div className="flex gap-1.5 text-[11px]">
                    {(["full", "delivery"] as const).map(o => (
                      <label key={o} className={`flex flex-1 cursor-pointer items-center gap-1 rounded border px-2 py-1 ${payOption === o ? "border-primary bg-primary/5" : "border-border"}`}>
                        <input type="radio" checked={payOption === o} onChange={() => setPayOption(o)} className="size-3 accent-primary" />
                        <span>{o === "full" ? `Full ৳${total.toFixed(0)}` : `Advance ৳${shipping} (delivery)`}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Send <b>৳{walletAmount.toFixed(0)}</b> to <b>{MERCHANT}</b>, then fill below.</p>
                  <input value={txnId} onChange={e => setTxnId(e.target.value)} placeholder="Transaction ID" className="w-full rounded border px-2 py-1.5 text-xs uppercase" />
                  <input value={senderPhone} onChange={e => setSenderPhone(e.target.value)} placeholder={`${WALLET_META[payment].label} number you paid from`} className="w-full rounded border px-2 py-1.5 text-xs" />
                </div>
              )}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
            <button onClick={submit} disabled={busy || lines.length === 0} className="mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
              <Truck className="mr-1 inline h-4 w-4" />{busy ? "Placing…" : `Place bulk order (${lines.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

