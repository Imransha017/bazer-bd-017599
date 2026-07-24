import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Upload, Search, Tag, Info, Image as ImageIcon, DollarSign, Palette, ListChecks, Truck, Globe, Sparkles, Package, Video, Star, LayoutGrid, List, Lock, Unlock } from "lucide-react";
import { slugify, uploadProductImage, type DBProduct, type ProductColor, type ProductVariant, type ProductSpec } from "@/lib/admin-api";
import { PageHeader } from "@/lib/admin-ui";
import { ProductImage } from "@/components/ProductImage";
import { StockField, ALWAYS_IN_STOCK } from "@/components/ProductEditModal";

const stockLabel = (n: number) => (n >= ALWAYS_IN_STOCK ? "In stock" : n <= 0 ? "Out of stock" : String(n));

export const Route = createFileRoute("/sys-x7k9-control/products")({
  component: ProductsAdmin,
});

const empty: Partial<DBProduct> = {
  name: "", description: "", short_description: "", price: 0, original_price: null,
  discount_percent: null, image: "", gallery: [], video_url: "",
  category_slug: "", subcategory_slug: "", brand: "", sku: "", badge: "",
  stock: 0, weight: null, warranty: "", return_days: 7,
  free_shipping: false, cod_available: true,
  tags: [], colors: [], sizes: [], variants: [], specifications: [],
  meta_title: "", meta_description: "",
  is_active: true, is_featured: false,
};

const FILTERS_KEY = "admin_products_filters_v1";
type SavedFilters = {
  q: string;
  statusFilter: "all" | "pending" | "active";
  stockFilter: "all" | "permanent" | "numeric" | "out";
  offerFilter: boolean;
};
function loadSavedFilters(): SavedFilters {
  const fallback: SavedFilters = { q: "", statusFilter: "pending", stockFilter: "all", offerFilter: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch { return fallback; }
}

function ProductsAdmin() {
  const [items, setItems] = useState<DBProduct[]>([]);
  const initial = loadSavedFilters();
  const [q, setQ] = useState(initial.q);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "active">(initial.statusFilter);
  const [stockFilter, setStockFilter] = useState<"all" | "permanent" | "numeric" | "out">(initial.stockFilter);
  const [offerFilter, setOfferFilter] = useState(initial.offerFilter);
  const [qDebounced, setQDebounced] = useState(initial.q);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(FILTERS_KEY, JSON.stringify({ q, statusFilter, stockFilter, offerFilter })); } catch {}
  }, [q, statusFilter, stockFilter, offerFilter]);


  const [editing, setEditing] = useState<Partial<DBProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<DBProduct | null>(null);
  const [view, setView] = useState<"grid" | "list">(() => (typeof window !== "undefined" ? (localStorage.getItem("admin_products_view") as any) || "grid" : "grid"));
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("admin_products_view", view); }, [view]);


  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as unknown as DBProduct[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(p: DBProduct) {
    const { error } = await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(!p.is_active ? "Activated — visible on the website" : "Deactivated");
    setItems((L) => L.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
  }

  async function bulkActivate() {
    const ids = filtered.filter((p) => !p.is_active).map((p) => p.id);
    if (!ids.length) return toast.info("No pending products");
    if (!confirm(`Activate ${ids.length} products?`)) return;
    const { error } = await supabase.from("products").update({ is_active: true }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} products activated`);
    load();
  }


  async function save(nextItem?: Partial<DBProduct>) {
    const current = nextItem ?? editing;
    if (!current) return;
    const name = current.name?.trim();
    if (!name || !current.image) { toast.error("Name and main image are required"); return; }
    const payload: any = {
      name,
      slug: current.slug || slugify(name),
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
      is_featured: current.is_featured ?? false,
    };
    const { error } = current.id
      ? await supabase.from("products").update(payload).eq("id", current.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  const counts = {
    all: items.length,
    pending: items.filter((p) => !p.is_active).length,
    active: items.filter((p) => p.is_active).length,
  };
  const now = Date.now();
  const isOnOffer = (p: DBProduct) => {
    const hasDisc = (Number((p as any).discount_percent) || 0) > 0 || (p.original_price && Number(p.original_price) > Number(p.price));
    const starts = (p as any).offer_starts_at ? new Date((p as any).offer_starts_at).getTime() : null;
    const ends = (p as any).offer_ends_at ? new Date((p as any).offer_ends_at).getTime() : null;
    const inWindow = (!starts || starts <= now) && (!ends || ends >= now);
    return !!hasDisc && inWindow;
  };
  const filtered = items
    .filter((p) => (statusFilter === "all" ? true : statusFilter === "active" ? p.is_active : !p.is_active))
    .filter((p) => {
      const s = Number(p.stock);
      if (stockFilter === "all") return true;
      if (stockFilter === "permanent") return s >= ALWAYS_IN_STOCK;
      if (stockFilter === "numeric") return s > 0 && s < ALWAYS_IN_STOCK;
      return s <= 0;
    })
    .filter((p) => (offerFilter ? isOnOffer(p) : true))
    .filter((p) => {
      const s = qDebounced.trim().toLowerCase();
      if (!s) return true;
      const stockNum = Number(p.stock);
      const stockLbl = stockNum >= ALWAYS_IN_STOCK ? "in stock permanent" : stockNum <= 0 ? "out of stock" : `stock number ${stockNum}`;
      return (
        p.name.toLowerCase().includes(s) ||
        (p.category_slug || "").toLowerCase().includes(s) ||
        (p.brand || "").toLowerCase().includes(s) ||
        (p.sku || "").toLowerCase().includes(s) ||
        stockLbl.includes(s)
      );
    });
  const stockCounts = {
    all: items.length,
    permanent: items.filter((p) => Number(p.stock) >= ALWAYS_IN_STOCK).length,
    numeric: items.filter((p) => Number(p.stock) > 0 && Number(p.stock) < ALWAYS_IN_STOCK).length,
    out: items.filter((p) => Number(p.stock) <= 0).length,
  };
  const offerCount = items.filter(isOnOffer).length;




  return (
    <div className="space-y-5">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle={`${counts.all} total — ${counts.pending} pending review · ${counts.active} live`}
        actions={
          <>
            {statusFilter === "pending" && counts.pending > 0 && (
              <button onClick={bulkActivate} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-purple-950 shadow-sm hover:bg-amber-400">
                Activate all ({counts.pending})
              </button>
            )}
            <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-900 to-purple-700 px-3.5 py-2 text-xs font-bold text-amber-100 shadow-sm hover:from-purple-800 hover:to-purple-600">
              <Plus className="h-3.5 w-3.5" /> Add product
            </button>
          </>
        }
      />


      <div className="flex gap-2 border-b">
        {([
          ["pending", "🕒 Pending Review", counts.pending, "text-amber-600 border-amber-500"],
          ["active", "✅ Live on Site", counts.active, "text-purple-600 border-purple-500"],
          ["all", "📦 All", counts.all, "text-primary border-primary"],
        ] as const).map(([k, label, n, cls]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${statusFilter === k ? cls : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {label} <span className="ml-1 rounded bg-muted px-1.5 text-xs">{n}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, category, brand, SKU or stock status…" className="w-full rounded border bg-card py-2 pl-9 pr-3 text-sm" />
        </div>
        <div className="inline-flex overflow-hidden rounded border bg-card">
          {([
            ["all", `All (${stockCounts.all})`],
            ["permanent", `♾️ In Stock (${stockCounts.permanent})`],
            ["numeric", `🔢 Stock # (${stockCounts.numeric})`],
            ["out", `❌ Out (${stockCounts.out})`],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setStockFilter(k); if (k !== "all") setStatusFilter("all"); }}
              className={`px-3 py-2 text-xs font-semibold ${stockFilter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOfferFilter((v) => !v)}
          title="Show only products with an active discount/offer window"
          className={`whitespace-nowrap rounded border px-3 py-2 text-xs font-semibold ${offerFilter ? "border-rose-400 bg-rose-500 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
        >
          🔥 On Offer ({offerCount})
        </button>

        <div className="inline-flex overflow-hidden rounded border bg-card">

          <button
            onClick={() => setView("grid")}
            title="Grid view"
            className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <LayoutGrid className="h-4 w-4" /> Grid
          </button>
          <button
            onClick={() => setView("list")}
            title="List view"
            className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <List className="h-4 w-4" /> List
          </button>
        </div>
      </div>

      <div className={view === "list" ? "rounded-lg bg-card shadow-sm" : ""}>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {statusFilter === "pending" ? "No pending products." : "No products."}
          </p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((p) => {
              const hasDiscount = p.original_price && Number(p.original_price) > Number(p.price);
              const off = hasDiscount ? Math.round((1 - Number(p.price) / Number(p.original_price)) * 100) : 0;
              return (
                <div key={p.id} className="group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition hover:shadow-md">
                  <button onClick={() => setPreview(p)} className="relative block aspect-square overflow-hidden bg-muted">
                    <ProductImage src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                    {hasDiscount && (
                      <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{off}%</span>
                    )}
                    <span className={`absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${p.is_active ? "bg-purple-600 text-white" : "bg-amber-500 text-white"}`}>
                      {p.is_active ? "Live" : "Pending"}
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col p-2.5">
                    <button onClick={() => setPreview(p)} className="line-clamp-2 text-left text-xs font-semibold leading-snug hover:text-primary">
                      {p.name}
                    </button>
                    <div className="mt-1 truncate text-[10px] text-muted-foreground">{p.category_slug || "—"} · Stock: <span className={Number(p.stock) <= 0 ? "font-bold text-red-600" : Number(p.stock) >= ALWAYS_IN_STOCK ? "font-bold text-emerald-600" : ""}>{stockLabel(Number(p.stock))}</span></div>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-primary">৳{Number(p.price).toFixed(0)}</span>
                      {hasDiscount && <span className="text-[10px] text-muted-foreground line-through">৳{Number(p.original_price).toFixed(0)}</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`flex-1 rounded px-2 py-1 text-[11px] font-bold ${p.is_active ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-amber-500 text-white hover:bg-amber-600"}`}
                      >
                        {p.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => setEditing(p)} className="rounded border p-1.5 hover:bg-muted" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(p.id)} className="rounded border p-1.5 text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="p-3 text-left">Image</th>
                  <th className="text-left">Name</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Stock</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2">
                      <button onClick={() => setPreview(p)} className="block">
                        <ProductImage src={p.image} alt={p.name} className="h-14 w-14 rounded object-cover ring-1 ring-border" />
                      </button>
                    </td>
                    <td>
                      <button onClick={() => setPreview(p)} className="text-left font-medium hover:text-primary">{p.name}</button>
                      <div className="text-xs text-muted-foreground">{p.category_slug || "—"} · SKU: {p.sku || "—"}</div>
                    </td>
                    <td className="text-right">৳{Number(p.price).toFixed(0)}</td>
                    <td className={`text-right ${Number(p.stock) <= 0 ? "font-bold text-red-600" : Number(p.stock) >= ALWAYS_IN_STOCK ? "font-bold text-emerald-600" : ""}`}>{stockLabel(Number(p.stock))}</td>
                    <td className="text-center">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          p.is_active
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        {p.is_active ? "Live" : "Activate"}
                      </button>
                    </td>
                    <td className="text-right">
                      <button onClick={() => setPreview(p)} className="rounded p-1.5 hover:bg-muted" title="Preview"><Search className="h-4 w-4" /></button>
                      <button onClick={() => setEditing(p)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => del(p.id)} className="rounded p-1.5 text-red-600 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {preview && <PreviewModal item={preview} onClose={() => setPreview(null)} onToggle={() => { toggleActive(preview); setPreview(null); }} />}
      {editing && <EditModal item={editing} setItem={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>

  );
}

async function uploadFile(file: File, prefix = ""): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("products").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

type TabKey = "basic" | "media" | "pricing" | "variants" | "specs" | "shipping" | "seo";

const TAB_META: Record<TabKey, { label: string; icon: any; from: string; to: string; ring: string; tint: string; desc: string }> = {
  basic:    { label: "Basic",    icon: Info,       from: "from-purple-500",    to: "to-indigo-500",   ring: "ring-purple-300",    tint: "bg-purple-50 border-purple-200",       desc: "Product name, brand, category & tags" },
  media:    { label: "Media",    icon: ImageIcon,  from: "from-fuchsia-500",to: "to-amber-500",     ring: "ring-fuchsia-300",tint: "bg-fuchsia-50 border-fuchsia-200",desc: "Main image, gallery photos & video" },
  pricing:  { label: "Pricing",  icon: DollarSign, from: "from-purple-500",to: "to-teal-500",     ring: "ring-purple-300",tint: "bg-purple-50 border-purple-200",desc: "Price, discount, stock & offer window" },
  variants: { label: "Variants", icon: Palette,    from: "from-purple-500", to: "to-rose-500",     ring: "ring-purple-300", tint: "bg-purple-50 border-purple-200", desc: "Colors, sizes & per-variant pricing" },
  specs:    { label: "Specs",    icon: ListChecks, from: "from-violet-500", to: "to-purple-500",   ring: "ring-violet-300", tint: "bg-violet-50 border-violet-200", desc: "Key/value specifications table" },
  shipping: { label: "Shipping", icon: Truck,      from: "from-amber-500",  to: "to-yellow-500",   ring: "ring-amber-300",  tint: "bg-amber-50 border-amber-200",   desc: "Weight, warranty, returns & COD" },
  seo:      { label: "SEO",      icon: Globe,      from: "from-cyan-500",   to: "to-blue-500",     ring: "ring-cyan-300",   tint: "bg-cyan-50 border-cyan-200",     desc: "Meta title, description & URL slug" },
};

function EditModal({ item, setItem, onSave, onClose }: { item: Partial<DBProduct>; setItem: (p: Partial<DBProduct>) => void; onSave: (nextItem?: Partial<DBProduct>) => void; onClose: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<TabKey>("basic");
  const [tagInput, setTagInput] = useState("");
  const [sizeInput, setSizeInput] = useState("");
  const [dropPriceUnlocked, setDropPriceUnlocked] = useState(false);

  useEffect(() => {
    setDropPriceUnlocked(false);
  }, [item?.id]);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>, target: "image" | "gallery") {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(uploadProductImage));
      if (target === "image") setItem({ ...item, image: urls[0] });
      else setItem({ ...item, gallery: [...(item.gallery ?? []), ...urls] });
      toast.success("Uploaded");
    } catch (err: any) { toast.error(err.message ?? "Upload failed"); }
    setUploading(false);
    e.target.value = "";
  }

  async function handleVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadFile(f, "videos/");
      setItem({ ...item, video_url: url });
      toast.success("Video uploaded");
    } catch (err: any) { toast.error(err.message ?? "Upload failed"); }
    setUploading(false);
    e.target.value = "";
  }

  const tags = item.tags ?? [];
  const colors = item.colors ?? [];
  const sizes = item.sizes ?? [];
  const variants = item.variants ?? [];
  const specs = item.specifications ?? [];

  const tabKeys: TabKey[] = ["basic", "media", "pricing", "variants", "specs", "shipping", "seo"];
  const active = TAB_META[tab];

  const addSize = () => {
    const value = sizeInput.trim();
    if (!value) return;
    if (sizes.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSizeInput("");
      return;
    }
    setItem({ ...item, sizes: [...sizes, value] });
    setSizeInput("");
  };

  const handleSave = () => {
    // Sync: same stock validation as ProductEditModal
    const stockRaw = item.stock;
    const isAlways = typeof stockRaw === "number" && stockRaw >= ALWAYS_IN_STOCK;
    if (!isAlways) {
      if (stockRaw === null || stockRaw === undefined || stockRaw === ("" as any) || Number.isNaN(Number(stockRaw))) {
        toast.error("Stock number দিন অথবা 'In stock' মোড সিলেক্ট করুন");
        return;
      }
      if (Number(stockRaw) < 0) {
        toast.error("Stock number ০ বা তার বেশি হতে হবে");
        return;
      }
    }
    // Validate each variant's stock too
    const vars = Array.isArray((item as any).variants) ? (item as any).variants : [];
    for (let i = 0; i < vars.length; i++) {
      const v = vars[i];
      const vs = v?.stock;
      const vAlways = typeof vs === "number" && vs >= ALWAYS_IN_STOCK;
      if (!vAlways) {
        if (vs === null || vs === undefined || vs === "" || Number.isNaN(Number(vs))) {
          toast.error(`Variant #${i + 1}: Stock number দিন অথবা 'In stock' সিলেক্ট করুন`);
          return;
        }
        if (Number(vs) < 0) {
          toast.error(`Variant #${i + 1}: Stock ০ বা তার বেশি হতে হবে`);
          return;
        }
      }
    }
    const value = sizeInput.trim();
    const nextItem = value && !sizes.some((s) => s.toLowerCase() === value.toLowerCase())
      ? { ...item, sizes: [...sizes, value] }
      : item;
    if (nextItem !== item) {
      setItem(nextItem);
      setSizeInput("");
    }
    onSave(nextItem);
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Colorful gradient header */}
        <div className="relative flex items-center justify-between bg-gradient-to-r from-purple-500 via-amber-500 to-purple-600 p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/20 backdrop-blur">
              {item.id ? <Pencil className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{item.id ? "Edit Product" : "Add New Product"}</h2>
              <p className="text-xs text-white/85">{item.id ? "Update product details across all sections" : "Fill in product info — switch tabs to add media, pricing & variants"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>

        {/* Colorful tab pills */}
        <div className="flex gap-2 overflow-x-auto border-b bg-gradient-to-b from-slate-50 to-white px-3 py-3">
          {tabKeys.map((k) => {
            const m = TAB_META[k];
            const Icon = m.icon;
            const isActive = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${m.from} ${m.to} text-white shadow-md ring-2 ring-offset-1 ${m.ring}`
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}>
                <Icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            );
          })}
        </div>

        {/* Section heading strip */}
        <div className={`flex items-center gap-3 border-b px-5 py-3 ${active.tint}`}>
          <div className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${active.from} ${active.to} text-white shadow`}>
            <active.icon className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-800">{active.label}</div>
            <div className="text-[11px] text-slate-600">{active.desc}</div>
          </div>
        </div>


        <div className="flex-1 overflow-y-auto p-4">
          {tab === "basic" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name *"><input value={item.name ?? ""} onChange={(e) => setItem({ ...item, name: e.target.value })} className="input" /></Field>
              <Field label="Brand"><input value={item.brand ?? ""} onChange={(e) => setItem({ ...item, brand: e.target.value })} className="input" /></Field>
              <Field label="SKU"><input value={item.sku ?? ""} onChange={(e) => setItem({ ...item, sku: e.target.value })} className="input" /></Field>
              <Field label="Badge (e.g. NEW, HOT)"><input value={item.badge ?? ""} onChange={(e) => setItem({ ...item, badge: e.target.value })} className="input" /></Field>
              <div className="sm:col-span-2"><CategoryPicker item={item} setItem={setItem} /></div>
              <div className="sm:col-span-2"><Field label="Short description (1 line)"><input value={item.short_description ?? ""} onChange={(e) => setItem({ ...item, short_description: e.target.value })} className="input" /></Field></div>
              <div className="sm:col-span-2"><Field label="Description"><textarea value={item.description ?? ""} onChange={(e) => setItem({ ...item, description: e.target.value })} rows={4} className="input" /></Field></div>

              <div className="sm:col-span-2 rounded-xl border border-purple-200 bg-purple-50/60 p-3">
                <label className="flex items-center gap-1.5 text-xs font-bold text-purple-800"><Tag className="h-3.5 w-3.5" /> Tags</label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((t, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                      {t}
                      <button onClick={() => setItem({ ...item, tags: tags.filter((_, j) => j !== i) })} className="ml-0.5 opacity-80 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-1">
                  <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (tagInput.trim()) { setItem({ ...item, tags: [...tags, tagInput.trim()] }); setTagInput(""); } } }} placeholder="Type a tag and press Enter" className="input flex-1" />
                </div>
              </div>

              <Field label="🟢 Active"><select value={item.is_active ? "1" : "0"} onChange={(e) => setItem({ ...item, is_active: e.target.value === "1" })} className="input"><option value="1">Yes — visible to customers</option><option value="0">No — hidden</option></select></Field>
              <Field label="⭐ Featured"><select value={item.is_featured ? "1" : "0"} onChange={(e) => setItem({ ...item, is_featured: e.target.value === "1" })} className="input"><option value="0">No</option><option value="1">Yes — show on homepage</option></select></Field>
            </div>
          )}

          {tab === "media" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/60 p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-fuchsia-800"><ImageIcon className="h-3.5 w-3.5" /> Main Image *</label>
                <p className="mt-0.5 text-[11px] text-fuchsia-700/80">Shown as the primary product photo in listings.</p>
                {item.image && <ProductImage src={item.image} alt="" className="mt-2 h-32 w-32 rounded-lg object-cover ring-2 ring-fuchsia-200" />}
                <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-amber-500 px-3 py-2 text-xs font-semibold text-white shadow hover:opacity-90">
                  <Upload className="h-4 w-4" /> Upload image
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImage(e, "image")} />
                </label>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-800"><Package className="h-3.5 w-3.5" /> Gallery</label>
                <p className="mt-0.5 text-[11px] text-amber-700/80">Extra photos shown in the product details slider.</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {(item.gallery ?? []).map((g, i) => (
                    <div key={i} className="relative">
                      <ProductImage src={g} alt="" className="h-20 w-20 rounded-lg object-cover ring-2 ring-amber-200" />
                      <button onClick={() => setItem({ ...item, gallery: item.gallery!.filter((_, j) => j !== i) })} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs text-white shadow">×</button>
                    </div>
                  ))}
                </div>
                <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-2 text-xs font-semibold text-white shadow hover:opacity-90">
                  <Upload className="h-4 w-4" /> Add gallery images
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => handleImage(e, "gallery")} />
                </label>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-purple-800"><Video className="h-3.5 w-3.5" /> Product Video</label>
                <p className="mt-0.5 text-[11px] text-purple-700/80">Paste a YouTube link or upload an MP4 file.</p>
                <input value={item.video_url ?? ""} onChange={(e) => setItem({ ...item, video_url: e.target.value })} placeholder="https://… or YouTube URL" className="input mt-2" />
                <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 px-3 py-2 text-xs font-semibold text-white shadow hover:opacity-90">
                  <Upload className="h-4 w-4" /> Upload video
                  <input type="file" accept="video/*" hidden onChange={handleVideo} />
                </label>
                {item.video_url && <video src={item.video_url} controls className="mt-2 max-h-48 rounded-lg" />}
              </div>
            </div>
          )}

          {tab === "pricing" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-teal-50 p-4">
                <div className="text-xs font-bold text-purple-800">💰 Selling Price</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Field label="Price (৳) *"><input type="number" value={item.price ?? 0} onChange={(e) => setItem({ ...item, price: +e.target.value })} className="input" /></Field>
                  <Field label="Original / Compare price"><input type="number" value={item.original_price ?? ""} onChange={(e) => setItem({ ...item, original_price: e.target.value ? +e.target.value : null })} className="input" /></Field>
                </div>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-sky-800">🚚 Dropshipper Price <span className="font-normal text-sky-700/80">— shown only to dropshippers as their base cost. Never displayed on the public store.</span></div>
                  <button
                    type="button"
                    onClick={() => setDropPriceUnlocked((value) => !value)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold shadow-sm transition ${dropPriceUnlocked ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-white text-sky-700 ring-1 ring-sky-300 hover:bg-sky-100"}`}
                    title={dropPriceUnlocked ? "Lock field" : "Unlock to edit"}
                  >
                    {dropPriceUnlocked ? <><Unlock className="h-3 w-3" /> Unlocked</> : <><Lock className="h-3 w-3" /> Unlock to edit</>}
                  </button>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Field label="Dropshipper price (৳)">
                    <input
                      type="number"
                      value={(item as any).dropshipper_price ?? ""}
                      onChange={(e) => setItem({ ...item, dropshipper_price: e.target.value ? +e.target.value : null } as any)}
                      placeholder={dropPriceUnlocked ? "Leave empty to use selling price" : "🔒 Click 'Unlock to edit' above"}
                      disabled={!dropPriceUnlocked}
                      readOnly={!dropPriceUnlocked}
                      className={`input ${!dropPriceUnlocked ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
                    />
                  </Field>
                </div>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-purple-50 p-4">
                <div className="text-xs font-bold text-rose-800">🔥 Discount & Offer Window</div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Field label="Discount %"><input type="number" value={item.discount_percent ?? ""} onChange={(e) => setItem({ ...item, discount_percent: e.target.value ? +e.target.value : null })} className="input" /></Field>
                  <StockField value={item.stock as number | null | undefined} onChange={(v) => setItem({ ...item, stock: (v as any) })} />
                  <Field label="Offer starts"><input type="datetime-local" value={item.offer_starts_at?.slice(0, 16) ?? ""} onChange={(e) => setItem({ ...item, offer_starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="input" /></Field>
                  <Field label="Offer ends"><input type="datetime-local" value={item.offer_ends_at?.slice(0, 16) ?? ""} onChange={(e) => setItem({ ...item, offer_ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} className="input" /></Field>
                </div>
              </div>
            </div>
          )}

          {tab === "variants" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-purple-800"><Palette className="h-3.5 w-3.5" /> Colors</label>
                <p className="mt-0.5 text-[11px] text-purple-700/80">Pick a name + hex for each color option.</p>
                <div className="mt-2 space-y-1.5">
                  {colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-white p-1.5 ring-1 ring-purple-100">
                      <input value={c.name} onChange={(e) => { const next = [...colors]; next[i] = { ...c, name: e.target.value }; setItem({ ...item, colors: next }); }} placeholder="Color name (Red)" className="input flex-1" />
                      <input type="color" value={c.hex ?? "#000000"} onChange={(e) => { const next = [...colors]; next[i] = { ...c, hex: e.target.value }; setItem({ ...item, colors: next }); }} className="h-9 w-12 cursor-pointer rounded border" />
                      <button onClick={() => setItem({ ...item, colors: colors.filter((_, j) => j !== i) })} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setItem({ ...item, colors: [...colors, { name: "", hex: "#000000" } as ProductColor] })} className="mt-2 rounded-md bg-gradient-to-r from-purple-500 to-rose-500 px-3 py-1 text-xs font-semibold text-white shadow">+ Add color</button>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-rose-800">📏 Sizes</label>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sizes.map((s, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                      {s}<button onClick={() => setItem({ ...item, sizes: sizes.filter((_, j) => j !== i) })} className="ml-0.5">×</button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-1">
                  <input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }} placeholder="Type size (S, M, L…) and press Enter" className="input flex-1" />
                  <button type="button" onClick={addSize} className="rounded-md bg-gradient-to-r from-rose-500 to-amber-500 px-3 text-xs font-semibold text-white shadow">Add</button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-800">🧩 Variants <span className="font-normal text-amber-700/80">— each with own price & stock</span></label>
                <div className="mt-2 space-y-2">
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-1 rounded-lg bg-white p-2 ring-1 ring-amber-100">
                      <input value={v.name} onChange={(e) => { const n = [...variants]; n[i] = { ...v, name: e.target.value }; setItem({ ...item, variants: n }); }} placeholder="Name (Red/XL)" className="input col-span-4" />
                      <input value={v.color ?? ""} onChange={(e) => { const n = [...variants]; n[i] = { ...v, color: e.target.value }; setItem({ ...item, variants: n }); }} placeholder="Color" className="input col-span-2" />
                      <input value={v.size ?? ""} onChange={(e) => { const n = [...variants]; n[i] = { ...v, size: e.target.value }; setItem({ ...item, variants: n }); }} placeholder="Size" className="input col-span-2" />
                      <input type="number" value={v.price ?? ""} onChange={(e) => { const n = [...variants]; n[i] = { ...v, price: e.target.value ? +e.target.value : undefined }; setItem({ ...item, variants: n }); }} placeholder="Price" className="input col-span-2" />
                      <input type="number" value={v.stock ?? ""} onChange={(e) => { const n = [...variants]; n[i] = { ...v, stock: e.target.value ? +e.target.value : undefined }; setItem({ ...item, variants: n }); }} placeholder="Qty" className="input col-span-1" />
                      <button onClick={() => setItem({ ...item, variants: variants.filter((_, j) => j !== i) })} className="col-span-1 grid place-items-center rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setItem({ ...item, variants: [...variants, { name: "" } as ProductVariant] })} className="mt-2 rounded-md bg-gradient-to-r from-amber-500 to-purple-500 px-3 py-1 text-xs font-semibold text-white shadow">+ Add variant</button>
              </div>
            </div>
          )}

          {tab === "specs" && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-violet-800"><ListChecks className="h-3.5 w-3.5" /> Specifications</label>
              <p className="mt-0.5 text-[11px] text-violet-700/80">e.g. RAM → 8GB, Display → 6.5" AMOLED</p>
              <div className="mt-2 space-y-1.5">
                {specs.map((s, i) => (
                  <div key={i} className="flex gap-1 rounded-lg bg-white p-1.5 ring-1 ring-violet-100">
                    <input value={s.key} onChange={(e) => { const n = [...specs]; n[i] = { ...s, key: e.target.value }; setItem({ ...item, specifications: n }); }} placeholder="Key (RAM)" className="input flex-1" />
                    <input value={s.value} onChange={(e) => { const n = [...specs]; n[i] = { ...s, value: e.target.value }; setItem({ ...item, specifications: n }); }} placeholder="Value (8GB)" className="input flex-1" />
                    <button onClick={() => setItem({ ...item, specifications: specs.filter((_, j) => j !== i) })} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setItem({ ...item, specifications: [...specs, { key: "", value: "" } as ProductSpec] })} className="mt-2 rounded-md bg-gradient-to-r from-violet-500 to-purple-500 px-3 py-1 text-xs font-semibold text-white shadow">+ Add row</button>
            </div>
          )}

          {tab === "shipping" && (
            <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:grid-cols-2">
              <Field label="⚖️ Weight (kg)"><input type="number" step="0.01" value={item.weight ?? ""} onChange={(e) => setItem({ ...item, weight: e.target.value ? +e.target.value : null })} className="input" /></Field>
              <Field label="🛡️ Warranty"><input value={item.warranty ?? ""} onChange={(e) => setItem({ ...item, warranty: e.target.value })} placeholder="1 year" className="input" /></Field>
              <Field label="↩️ Return days"><input type="number" value={item.return_days ?? 7} onChange={(e) => setItem({ ...item, return_days: +e.target.value })} className="input" /></Field>
              <Field label="🚚 Free shipping"><select value={item.free_shipping ? "1" : "0"} onChange={(e) => setItem({ ...item, free_shipping: e.target.value === "1" })} className="input"><option value="0">No</option><option value="1">Yes</option></select></Field>
              <Field label="💵 Cash on Delivery"><select value={item.cod_available ?? true ? "1" : "0"} onChange={(e) => setItem({ ...item, cod_available: e.target.value === "1" })} className="input"><option value="1">Yes</option><option value="0">No</option></select></Field>
            </div>
          )}

          {tab === "seo" && (
            <div className="space-y-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
              <Field label="🏷️ Meta title"><input value={item.meta_title ?? ""} onChange={(e) => setItem({ ...item, meta_title: e.target.value })} className="input" /></Field>
              <Field label="📝 Meta description"><textarea value={item.meta_description ?? ""} onChange={(e) => setItem({ ...item, meta_description: e.target.value })} rows={3} className="input" /></Field>
              <Field label="🔗 URL slug"><input value={item.slug ?? ""} onChange={(e) => setItem({ ...item, slug: e.target.value })} placeholder="auto-generated from name" className="input" /></Field>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-gradient-to-r from-slate-50 to-white p-3">
          <div className="hidden text-xs text-slate-500 sm:block">⚡ Changes save instantly to all stores.</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button disabled={uploading} onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500 via-amber-500 to-purple-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/30 transition hover:opacity-95 disabled:opacity-50">
              <Star className="h-4 w-4" /> {uploading ? "Uploading…" : "Save Product"}
            </button>
          </div>
        </div>
      </div>
      <style>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;font-size:13px;background:#fff;transition:all .15s;outline:none}.input:focus{border-color:#ec4899;box-shadow:0 0 0 3px rgba(236,72,153,.15)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-bold text-slate-700">{label}</span><div className="mt-1">{children}</div></label>;
}


function PreviewModal({ item, onClose, onToggle }: { item: DBProduct; onClose: () => void; onToggle: () => void }) {
  const gallery = [item.image, ...(item.gallery ?? [])].filter(Boolean);
  const [main, setMain] = useState(item.image);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4" onClick={onClose}>
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
          <div>
            <h2 className="text-lg font-bold">{item.name}</h2>
            <p className="text-xs text-white/85">Product Preview · {item.is_active ? "Live" : "Pending Review"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/20"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-5 md:grid-cols-2">
          <div>
            <ProductImage src={main} alt={item.name} className="w-full rounded-lg border object-cover" style={{ aspectRatio: "1/1" }} />
            {gallery.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {gallery.map((g, i) => (
                  <button key={i} onClick={() => setMain(g)} className={`shrink-0 rounded border-2 ${main === g ? "border-primary" : "border-transparent"}`}>
                    <ProductImage src={g} className="h-16 w-16 rounded object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">৳{Number(item.price).toFixed(0)}</span>
              {item.original_price && Number(item.original_price) > Number(item.price) && (
                <span className="text-sm text-muted-foreground line-through">৳{Number(item.original_price).toFixed(0)}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 rounded border bg-muted/30 p-3 text-xs">
              <div><b>Stock:</b> {stockLabel(Number(item.stock ?? 0))}</div>
              <div><b>SKU:</b> {item.sku || "—"}</div>
              <div><b>Category:</b> {item.category_slug || "—"}</div>
              <div><b>Brand:</b> {item.brand || "—"}</div>
              <div><b>Rating:</b> {Number(item.rating || 0).toFixed(1)} ⭐</div>
              <div><b>Sold:</b> {item.sold_count || 0}</div>
            </div>
            {item.short_description && (
              <div>
                <div className="text-xs font-bold text-slate-700">Short Description</div>
                <p className="mt-1 text-sm text-slate-600">{item.short_description}</p>
              </div>
            )}
            {item.description && (
              <div>
                <div className="text-xs font-bold text-slate-700">Detailed Description</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.description}</p>
              </div>
            )}
            {(item.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(item.tags ?? []).map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t bg-slate-50 p-3">
          <button onClick={onClose} className="rounded border px-4 py-2 text-sm">Close</button>
          <button
            onClick={onToggle}
            className={`rounded px-4 py-2 text-sm font-bold text-white ${item.is_active ? "bg-amber-600 hover:bg-amber-700" : "bg-purple-600 hover:bg-purple-700"}`}
          >
            {item.is_active ? "Deactivate" : "✓ Activate & show on website"}
          </button>
        </div>
      </div>
    </div>
  );
}

type DBCatRow = { id: string; name: string; slug: string; parent_id: string | null };

const splitSlugs = (v?: string | null) =>
  (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const joinSlugs = (arr: string[]) => Array.from(new Set(arr)).join(",");

function CategoryPicker({ item, setItem }: { item: Partial<DBProduct>; setItem: (p: Partial<DBProduct>) => void }) {
  const [cats, setCats] = useState<DBCatRow[]>([]);
  const [mode, setMode] = useState<"single" | "multi">(() =>
    splitSlugs(item.category_slug).length > 1 ||
    splitSlugs(item.subcategory_slug).length > 1 ||
    splitSlugs((item as any).option_slug).length > 1 ? "multi" : "single"
  );
  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name,slug,parent_id")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .then(({ data }) => setCats((data as DBCatRow[]) ?? []));
  }, []);

  const parents = cats.filter((c) => !c.parent_id);
  const selectedCatSlugs = splitSlugs(item.category_slug);
  const selectedSubSlugs = splitSlugs(item.subcategory_slug);
  const selectedOptSlugs = splitSlugs((item as any).option_slug);
  const selectedParents = parents.filter((p) => selectedCatSlugs.includes(p.slug));
  const availableSubs = cats.filter((c) => c.parent_id && selectedParents.some((p) => p.id === c.parent_id));
  const selectedSubs = availableSubs.filter((s) => selectedSubSlugs.includes(s.slug));
  const availableOpts = cats.filter((c) => c.parent_id && selectedSubs.some((s) => s.id === c.parent_id));

  const setCategories = (slugs: string[]) => {
    const names = parents.filter((p) => slugs.includes(p.slug)).map((p) => p.name);
    const validSubs = availableSubs
      .filter((s) => slugs.includes(parents.find((p) => p.id === s.parent_id)?.slug ?? ""))
      .filter((s) => selectedSubSlugs.includes(s.slug));
    const validSubIds = new Set(validSubs.map((s) => s.id));
    const validOpts = availableOpts.filter((o) => validSubIds.has(o.parent_id!) && selectedOptSlugs.includes(o.slug));
    setItem({
      ...item,
      category_slug: joinSlugs(slugs),
      category_name: names.join(", "),
      subcategory_slug: joinSlugs(validSubs.map((s) => s.slug)),
      subcategory_name: validSubs.map((s) => s.name).join(", "),
      option_slug: joinSlugs(validOpts.map((o) => o.slug)),
      option_name: validOpts.map((o) => o.name).join(", "),
    } as any);
  };
  const setSubcategories = (slugs: string[]) => {
    const names = availableSubs.filter((s) => slugs.includes(s.slug)).map((s) => s.name);
    const validSubIds = new Set(availableSubs.filter((s) => slugs.includes(s.slug)).map((s) => s.id));
    const validOpts = availableOpts.filter((o) => validSubIds.has(o.parent_id!) && selectedOptSlugs.includes(o.slug));
    setItem({
      ...item,
      subcategory_slug: joinSlugs(slugs),
      subcategory_name: names.join(", "),
      option_slug: joinSlugs(validOpts.map((o) => o.slug)),
      option_name: validOpts.map((o) => o.name).join(", "),
    } as any);
  };
  const setOptions = (slugs: string[]) => {
    const names = availableOpts.filter((o) => slugs.includes(o.slug)).map((o) => o.name);
    setItem({ ...item, option_slug: joinSlugs(slugs), option_name: names.join(", ") } as any);
  };

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/70 to-indigo-50/50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-bold text-purple-800">🗂️ Category, Subcategory & Option</div>
        <div className="inline-flex rounded-lg bg-white p-0.5 ring-1 ring-purple-200 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setMode("single");
              setCategories(selectedCatSlugs.slice(0, 1));
              setSubcategories(selectedSubSlugs.slice(0, 1));
              setOptions(selectedOptSlugs.slice(0, 1));
            }}
            className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${mode === "single" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Single
          </button>
          <button
            type="button"
            onClick={() => setMode("multi")}
            className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${mode === "multi" ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Multiple
          </button>
        </div>
      </div>

      {mode === "single" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Category *">
            <select
              value={selectedCatSlugs[0] ?? ""}
              onChange={(e) => setCategories(e.target.value ? [e.target.value] : [])}
              className="input"
            >
              <option value="">— Select category —</option>
              {parents.map((p) => <option key={p.id} value={p.slug}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Subcategory">
            <select
              value={selectedSubSlugs[0] ?? ""}
              onChange={(e) => setSubcategories(e.target.value ? [e.target.value] : [])}
              disabled={selectedParents.length === 0}
              className="input disabled:opacity-50"
            >
              <option value="">— {selectedParents.length ? "Select subcategory" : "Choose a category first"} —</option>
              {availableSubs.map((s) => <option key={s.id} value={s.slug}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Option">
            <select
              value={selectedOptSlugs[0] ?? ""}
              onChange={(e) => setOptions(e.target.value ? [e.target.value] : [])}
              disabled={selectedSubs.length === 0 || availableOpts.length === 0}
              className="input disabled:opacity-50"
            >
              <option value="">— {selectedSubs.length === 0 ? "Choose a subcategory first" : availableOpts.length === 0 ? "No options available" : "Select option"} —</option>
              {availableOpts.map((o) => <option key={o.id} value={o.slug}>{o.name}</option>)}
            </select>
          </Field>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-purple-800">Categories * <span className="font-normal text-slate-500">(select one or more)</span></div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-purple-200 bg-white p-2">
              {parents.length === 0 && <div className="p-2 text-xs text-slate-400">No categories</div>}
              {parents.map((p) => {
                const checked = selectedCatSlugs.includes(p.slug);
                return (
                  <label key={p.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs ${checked ? "bg-purple-100 font-semibold text-purple-900" : "hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={checked} onChange={() => setCategories(toggle(selectedCatSlugs, p.slug))} className="h-3.5 w-3.5 accent-purple-600" />
                    <span className="flex-1 truncate">{p.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-purple-800">Subcategories <span className="font-normal text-slate-500">(select any)</span></div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-purple-200 bg-white p-2">
              {selectedParents.length === 0 && <div className="p-2 text-xs text-slate-400">Choose a category first</div>}
              {selectedParents.map((p) => {
                const list = availableSubs.filter((s) => s.parent_id === p.id);
                if (list.length === 0) return null;
                return (
                  <div key={p.id} className="mb-1">
                    <div className="px-1 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{p.name}</div>
                    {list.map((s) => {
                      const checked = selectedSubSlugs.includes(s.slug);
                      return (
                        <label key={s.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs ${checked ? "bg-indigo-100 font-semibold text-indigo-900" : "hover:bg-slate-50"}`}>
                          <input type="checkbox" checked={checked} onChange={() => setSubcategories(toggle(selectedSubSlugs, s.slug))} className="h-3.5 w-3.5 accent-indigo-600" />
                          <span className="flex-1 truncate">{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-purple-800">Options <span className="font-normal text-slate-500">(select any)</span></div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-purple-200 bg-white p-2">
              {selectedSubs.length === 0 && <div className="p-2 text-xs text-slate-400">Choose a subcategory first</div>}
              {selectedSubs.map((s) => {
                const list = availableOpts.filter((o) => o.parent_id === s.id);
                if (list.length === 0) return null;
                return (
                  <div key={s.id} className="mb-1">
                    <div className="px-1 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{s.name}</div>
                    {list.map((o) => {
                      const checked = selectedOptSlugs.includes(o.slug);
                      return (
                        <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs ${checked ? "bg-fuchsia-100 font-semibold text-fuchsia-900" : "hover:bg-slate-50"}`}>
                          <input type="checkbox" checked={checked} onChange={() => setOptions(toggle(selectedOptSlugs, o.slug))} className="h-3.5 w-3.5 accent-fuchsia-600" />
                          <span className="flex-1 truncate">{o.name}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
              {selectedSubs.length > 0 && availableOpts.length === 0 && (
                <div className="p-2 text-xs text-slate-400">No options under selected subcategories</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

