import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyVendor, type Vendor } from "@/lib/vendor";
import { slugify, type DBProduct } from "@/lib/admin-api";
import { Plus, Pencil, Trash2, Search, Eye, LayoutGrid, List, X, Star, Package, Tag, Truck, Info } from "lucide-react";
import { toast } from "sonner";
import { ProductEditModal, emptyProduct } from "@/components/ProductEditModal";
import { ProductImage } from "@/components/ProductImage";

export const Route = createFileRoute("/vendor/products")({
  component: VendorProducts,
});

function VendorProducts() {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [cats, setCats] = useState<Array<{ slug: string; name: string }>>([]);
  const [editing, setEditing] = useState<Partial<DBProduct> | null>(null);
  const [viewing, setViewing] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const reload = async (vid: string) => {
    const { data } = await supabase.from("products").select("*").eq("vendor_id", vid).order("created_at", { ascending: false });
    setProducts((data ?? []) as unknown as DBProduct[]);
  };

  useEffect(() => {
    (async () => {
      const v = await getMyVendor();
      if (!v) { setLoading(false); return; }
      setVendor(v);
      const { data: cs } = await supabase.from("categories").select("slug,name").order("sort_order");
      setCats((cs ?? []) as Array<{ slug: string; name: string }>);
      await reload(v.id);
      setLoading(false);
    })();
  }, []);

  const save = async (nextItem?: Partial<DBProduct>) => {
    const current = nextItem ?? editing;
    if (!current || !vendor) return;
    const name = current.name?.trim();
    if (!name) return toast.error("Name required");
    if (!current.image) return toast.error("Main image required");
    const payload = {
      name,
      slug: current.slug?.trim() || slugify(name),
      description: current.description ?? "",
      short_description: current.short_description || null,
      price: Number(current.price) || 0,
      original_price: current.original_price ? Number(current.original_price) : null,
      dropshipper_price: (current as any).dropshipper_price ? Number((current as any).dropshipper_price) : null,
      discount_percent: current.discount_percent ? Number(current.discount_percent) : null,
      offer_starts_at: current.offer_starts_at || null,
      offer_ends_at: current.offer_ends_at || null,
      image: current.image,
      gallery: current.gallery ?? [],
      video_url: current.video_url || null,
      category_slug: current.category_slug || null,
      category_name: (current as any).category_name || null,
      subcategory_slug: current.subcategory_slug || null,
      subcategory_name: (current as any).subcategory_name || null,
      option_slug: (current as any).option_slug || null,
      option_name: (current as any).option_name || null,
      brand: current.brand || null,
      sku: current.sku || null,
      badge: current.badge || null,
      stock: Number(current.stock) || 0,
      weight: current.weight ? Number(current.weight) : null,
      warranty: current.warranty || null,
      return_days: current.return_days ? Number(current.return_days) : 7,
      free_shipping: !!current.free_shipping,
      cod_available: current.cod_available ?? true,
      tags: current.tags ?? [],
      colors: current.colors ?? [],
      sizes: current.sizes ?? [],
      variants: current.variants ?? [],
      specifications: current.specifications ?? [],
      meta_title: current.meta_title || null,
      meta_description: current.meta_description || null,
      is_active: current.is_active ?? true,
      vendor_id: vendor.id,
    };
    const { error } = current.id
      ? await supabase.from("products").update(payload).eq("id", current.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    await reload(vendor.id);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setProducts(p => p.filter(x => x.id !== id));
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!vendor) return <div className="py-12 text-center text-sm text-muted-foreground">No vendor account found.</div>;

  const filtered = products.filter(p => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return p.name.toLowerCase().includes(s) || (p.category_slug || "").toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">My Products</h1>
          <p className="text-xs text-muted-foreground">{products.length} products in your store</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Grid
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          <button onClick={() => setEditing({ ...emptyProduct })} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-sky-500 via-pink-500 to-purple-600 px-4 py-2 text-sm font-bold text-white shadow">
            <Plus className="h-4 w-4" /> Add Product
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, category or SKU…" className="w-full rounded border bg-card py-2 pl-9 pr-3 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg bg-card py-12 text-center text-sm text-muted-foreground shadow-sm">No products yet. Add your first product.</div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map(p => {
            const discount = p.original_price && Number(p.original_price) > Number(p.price)
              ? Math.round(((Number(p.original_price) - Number(p.price)) / Number(p.original_price)) * 100)
              : 0;
            return (
              <div key={p.id} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary hover:shadow-md">
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  <ProductImage src={p.image} alt={p.name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  {discount > 0 && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white shadow">-{discount}%</span>
                  )}
                  <span className={`absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${p.is_active ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>
                    {p.is_active ? "Live" : "Off"}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => setViewing(p)} title="View details" className="grid size-7 place-items-center rounded-full bg-white text-primary shadow hover:scale-110"><Eye className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setEditing(p)} title="Edit" className="grid size-7 place-items-center rounded-full bg-white text-blue-600 shadow hover:scale-110"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => del(p.id)} title="Delete" className="grid size-7 place-items-center rounded-full bg-white text-destructive shadow hover:scale-110"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2">
                  <p title={p.name} className="line-clamp-2 text-xs font-medium leading-tight text-foreground">{p.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-primary">৳{Number(p.price).toFixed(0)}</span>
                    {p.original_price && Number(p.original_price) > Number(p.price) && (
                      <span className="text-[10px] text-muted-foreground line-through">৳{Number(p.original_price).toFixed(0)}</span>
                    )}
                  </div>
                  {Number((p as any).dropshipper_price) > 0 && (
                    <div className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      <Truck className="h-3 w-3" /> DS ৳{Number((p as any).dropshipper_price).toFixed(0)}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Stock: {p.stock}</span>
                    <span className="truncate">{p.category_slug || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3 text-left">Image</th>
                  <th className="text-left">Name</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">DS Price</th>
                  <th className="text-right">Stock</th>
                  <th className="text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3">
                      <ProductImage src={p.image} alt={p.name} className="h-12 w-12 rounded object-cover" />
                    </td>
                    <td>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.category_slug || "—"} · SKU: {p.sku || "—"}</div>
                    </td>
                    <td className="text-right font-bold">৳{Number(p.price).toFixed(0)}</td>
                    <td className="text-right">
                      {Number((p as any).dropshipper_price) > 0 ? (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">৳{Number((p as any).dropshipper_price).toFixed(0)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-right">{p.stock}</td>
                    <td className="text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.is_active ? "Live" : "Off"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => setViewing(p)} title="View" className="mr-1 rounded p-1 text-primary hover:bg-muted"><Eye className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditing(p)} title="Edit" className="mr-1 rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(p.id)} title="Delete" className="rounded p-1 text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <ProductEditModal
          item={editing}
          setItem={setEditing}
          onSave={save}
          onClose={() => setEditing(null)}
          hideFeatured
          categories={cats}
        />
      )}

      {viewing && <ProductViewModal product={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} />}
    </div>
  );
}

function ProductViewModal({ product, onClose, onEdit }: { product: DBProduct; onClose: () => void; onEdit: () => void }) {
  const p = product as any;
  const gallery: string[] = Array.isArray(p.gallery) ? p.gallery : [];
  const allImages = [p.image, ...gallery.filter((g: string) => g && g !== p.image)];
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
  const discount = p.original_price && Number(p.original_price) > Number(p.price)
    ? Math.round(((Number(p.original_price) - Number(p.price)) / Number(p.original_price)) * 100)
    : 0;
  const dsPrice = Number(p.dropshipper_price) > 0 ? Number(p.dropshipper_price) : null;
  const margin = dsPrice ? Number(p.price) - dsPrice : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-2 sm:p-4" onClick={onClose}>
      <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-background shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-2.5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className="truncate hover:text-primary">
              /p/{p.slug}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Hero: Gallery + Summary (single product page style) */}
        <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:p-6">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
              <ProductImage src={allImages[active]} alt={p.name} className="size-full object-contain" />
              {discount > 0 && (
                <span className="absolute left-3 top-3 rounded-md bg-destructive px-2 py-1 text-xs font-bold text-white shadow">-{discount}%</span>
              )}
              {p.badge && (
                <span className="absolute right-3 top-3 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground shadow">{p.badge}</span>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button key={i} onClick={() => setActive(i)} className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${active === i ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"}`}>
                    <ProductImage src={img} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {p.is_active ? "● Live" : "● Off"}
                </span>
                {p.brand && <span className="text-muted-foreground">Brand: <b className="text-foreground">{p.brand}</b></span>}
                {p.sku && <span className="text-muted-foreground">SKU: <b className="text-foreground">{p.sku}</b></span>}
              </div>
              <h1 className="mt-2 text-xl font-bold leading-tight md:text-2xl">{p.name}</h1>
              {p.short_description && <p className="mt-1 text-sm text-muted-foreground">{p.short_description}</p>}
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <Star className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="ml-1">(0 reviews)</span>
              </div>
            </div>

            {/* Price block */}
            <div className="rounded-xl border bg-card p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-primary">৳{Number(p.price).toFixed(0)}</span>
                {p.original_price && Number(p.original_price) > Number(p.price) && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">৳{Number(p.original_price).toFixed(0)}</span>
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-bold text-destructive">Save {discount}%</span>
                  </>
                )}
              </div>
              {dsPrice !== null && (
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-amber-50 p-2 text-xs ring-1 ring-amber-200">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-amber-700">Dropshipper price</div>
                    <div className="text-base font-bold text-amber-800">৳{dsPrice.toFixed(0)}</div>
                  </div>
                  {margin !== null && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-amber-700">Margin</div>
                      <div className="text-base font-bold text-emerald-700">৳{margin.toFixed(0)}</div>
                    </div>
                  )}
                </div>
              )}
              {p.offer_ends_at && (
                <div className="mt-2 text-[11px] text-muted-foreground">Offer ends: <b className="text-foreground">{new Date(p.offer_ends_at).toLocaleString()}</b></div>
              )}
            </div>

            {/* Variants */}
            {Array.isArray(p.colors) && p.colors.length > 0 && (
              <Section title="Colors">
                <div className="flex flex-wrap gap-1.5">
                  {p.colors.map((c: any, i: number) => (
                    <span key={i} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
                      {c.hex && <span className="size-3.5 rounded-full border" style={{ background: c.hex }} />}
                      {c.name || c.hex}
                    </span>
                  ))}
                </div>
              </Section>
            )}
            {Array.isArray(p.sizes) && p.sizes.length > 0 && (
              <Section title="Sizes">
                <div className="flex flex-wrap gap-1.5">
                  {p.sizes.map((s: string, i: number) => (
                    <span key={i} className="rounded-md border px-2.5 py-1 text-xs font-medium">{s}</span>
                  ))}
                </div>
              </Section>
            )}

            {/* Quick facts */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Info2 icon={<Package className="h-3.5 w-3.5" />} label="Stock" value={String(p.stock ?? 0)} />
              <Info2 icon={<Tag className="h-3.5 w-3.5" />} label="Category" value={p.category_name || p.category_slug || "—"} />
              <Info2 icon={<Tag className="h-3.5 w-3.5" />} label="Subcategory" value={p.subcategory_name || p.subcategory_slug || "—"} />
              {p.option_name && <Info2 icon={<Tag className="h-3.5 w-3.5" />} label="Option" value={p.option_name} />}
              <Info2 icon={<Truck className="h-3.5 w-3.5" />} label="Free Shipping" value={p.free_shipping ? "Yes" : "No"} />
              <Info2 icon={<Truck className="h-3.5 w-3.5" />} label="COD" value={p.cod_available ? "Yes" : "No"} />
              <Info2 icon={<Truck className="h-3.5 w-3.5" />} label="Return" value={`${p.return_days ?? 7} days`} />
              {p.weight && <Info2 icon={<Package className="h-3.5 w-3.5" />} label="Weight" value={`${p.weight} kg`} />}
              {p.warranty && <Info2 icon={<Info className="h-3.5 w-3.5" />} label="Warranty" value={p.warranty} />}
            </div>

            {Array.isArray(p.tags) && p.tags.length > 0 && (
              <Section title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t: string, i: number) => (
                    <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs">#{t}</span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Tabs: Description / Specs / Video / SEO */}
        <div className="border-t px-4 py-4 md:px-6">
          <div className="mb-3 flex gap-1 overflow-x-auto border-b">
            <TabBtn active={tab === "desc"} onClick={() => setTab("desc")}>Description</TabBtn>
            <TabBtn active={tab === "specs"} onClick={() => setTab("specs")}>Specifications</TabBtn>
            <TabBtn active={tab === "reviews"} onClick={() => setTab("reviews")}>More info</TabBtn>
          </div>

          {tab === "desc" && (
            <div className="space-y-3">
              {p.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{p.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
              {p.video_url && (
                <div>
                  <h4 className="mb-1 text-sm font-bold">Product Video</h4>
                  <a href={p.video_url} target="_blank" rel="noreferrer" className="break-all text-xs text-primary underline">{p.video_url}</a>
                </div>
              )}
            </div>
          )}

          {tab === "specs" && (
            Array.isArray(p.specifications) && p.specifications.length > 0 ? (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <tbody>
                    {p.specifications.map((s: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="w-1/3 bg-muted/40 p-2.5 font-semibold">{s.key || s.name}</td>
                        <td className="p-2.5 text-muted-foreground">{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No specifications added.</p>
            )
          )}

          {tab === "reviews" && (
            <div className="space-y-2 text-sm">
              {(p.meta_title || p.meta_description) ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <h4 className="mb-1 text-xs font-bold uppercase text-muted-foreground">SEO</h4>
                  {p.meta_title && <p className="text-sm"><b>Title:</b> {p.meta_title}</p>}
                  {p.meta_description && <p className="text-sm"><b>Description:</b> {p.meta_description}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No additional info.</p>
              )}
              <div className="text-xs text-muted-foreground">
                Created: {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                {p.updated_at && <> · Updated: {new Date(p.updated_at).toLocaleString()}</>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`relative px-3 py-2 text-sm font-semibold transition ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
    </button>
  );
}

function Info2({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5 rounded border bg-muted/30 p-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="truncate text-xs font-semibold">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
